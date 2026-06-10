import base64
import hashlib
import json
import os
import re
import secrets
import uuid
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from pathlib import PurePosixPath
from urllib.parse import quote

import requests
from dotenv import load_dotenv
from flask import Flask, abort, jsonify, request, send_from_directory
from google.auth.transport.requests import Request as GoogleAuthRequest
from google.oauth2 import service_account
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer


SERVER_DIR = os.path.abspath(os.path.dirname(__file__))
STATIC_DIR = os.path.abspath(os.path.join(SERVER_DIR, ".."))
load_dotenv(os.path.join(SERVER_DIR, ".env"))

MP_PUBLIC_KEY = os.getenv("MP_PUBLIC_KEY", "").strip()
MP_ACCESS_TOKEN = os.getenv("MP_ACCESS_TOKEN", "").strip()
MELHOR_ENVIO_TOKEN = os.getenv("MELHOR_ENVIO_TOKEN", "").strip()
QUOTE_SECRET = os.getenv("CHECKOUT_SIGNING_KEY", "").strip() or MP_ACCESS_TOKEN or secrets.token_urlsafe(32)
GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON_BASE64", "").strip()
GOOGLE_SHEETS_SPREADSHEET_ID = os.getenv("GOOGLE_SHEETS_SPREADSHEET_ID", "").strip()
GOOGLE_SHEETS_RANGE = os.getenv("GOOGLE_SHEETS_RANGE", "Pedidos!A:S").strip()

MONEY = Decimal("0.01")
QUOTE_MAX_AGE_SECONDS = 30 * 60
ORDER_TOKEN_MAX_AGE_SECONDS = 24 * 60 * 60
MAX_QUANTITY = 20
ORDER_STATUS = "pending_payment"
SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets"
ORDER_HEADERS = [
    "created_at",
    "order_id",
    "status",
    "payment_method",
    "customer_name",
    "email",
    "cpf",
    "postal_code",
    "street",
    "number",
    "complement",
    "neighborhood",
    "city",
    "state",
    "items",
    "subtotal",
    "shipping_service",
    "shipping_cost",
    "total",
]
PRODUCTS = {
    "bichinho-001": {
        "name": "Bichinho da Ansiedade",
        "unit_price": Decimal("29.90"),
    },
}

PUBLIC_ROOT_EXTENSIONS = {".html", ".css", ".js", ".ico", ".txt"}
PUBLIC_DIRECTORIES = {"assets", "font"}

quote_serializer = URLSafeTimedSerializer(QUOTE_SECRET, salt="ricardodraw-shipping-v1")
order_serializer = URLSafeTimedSerializer(QUOTE_SECRET, salt="ricardodraw-order-v1")
app = Flask(__name__, static_folder=None)
app.config["MAX_CONTENT_LENGTH"] = 64 * 1024


class CheckoutError(ValueError):
    pass


class UpstreamError(RuntimeError):
    pass


def money(value):
    try:
        return Decimal(str(value)).quantize(MONEY, rounding=ROUND_HALF_UP)
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise CheckoutError("Valor monetário inválido.") from exc


def credential_environment(value):
    if value.startswith("TEST-"):
        return "test"
    if value.startswith("APP_USR-"):
        return "production"
    return None


def validate_mercado_pago_credentials():
    if not MP_PUBLIC_KEY or not MP_ACCESS_TOKEN:
        raise CheckoutError("Mercado Pago não configurado no servidor.")

    public_environment = credential_environment(MP_PUBLIC_KEY)
    token_environment = credential_environment(MP_ACCESS_TOKEN)
    if not public_environment or public_environment != token_environment:
        raise CheckoutError("As credenciais do Mercado Pago pertencem a ambientes diferentes.")


def json_body():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        raise CheckoutError("JSON inválido.")
    return data


def parse_order_items(data):
    raw_items = data.get("items")
    if not isinstance(raw_items, list) or not raw_items:
        raise CheckoutError("O pedido não possui itens.")

    quantities = {}
    for raw_item in raw_items:
        if not isinstance(raw_item, dict):
            raise CheckoutError("Item do pedido inválido.")

        product_id = str(raw_item.get("id") or "").strip()
        if product_id not in PRODUCTS:
            raise CheckoutError("Produto inválido.")

        try:
            quantity = int(raw_item.get("quantity"))
        except (TypeError, ValueError) as exc:
            raise CheckoutError("Quantidade inválida.") from exc

        quantities[product_id] = quantities.get(product_id, 0) + quantity

    if not quantities or any(quantity < 1 or quantity > MAX_QUANTITY for quantity in quantities.values()):
        raise CheckoutError(f"Quantidade deve estar entre 1 e {MAX_QUANTITY}.")

    total_quantity = sum(quantities.values())
    if total_quantity > MAX_QUANTITY:
        raise CheckoutError(f"Quantidade total deve ser no máximo {MAX_QUANTITY}.")

    items = []
    subtotal = Decimal("0.00")
    for product_id, quantity in quantities.items():
        product = PRODUCTS[product_id]
        subtotal += product["unit_price"] * quantity
        items.append({
            "id": product_id,
            "name": product["name"],
            "quantity": quantity,
            "unit_price": product["unit_price"],
        })

    return items, total_quantity, money(subtotal)


def normalize_postal_code(value):
    postal_code = re.sub(r"\D", "", str(value or ""))
    if len(postal_code) != 8:
        raise CheckoutError("CEP inválido.")
    return postal_code


def create_shipping_quote(postal_code, quantity, option):
    price = money(option.get("custom_price") or option.get("price"))
    payload = {
        "postal_code": postal_code,
        "quantity": quantity,
        "service": str(option.get("name") or "Envio pelos Correios"),
        "company": str((option.get("company") or {}).get("name") or "Correios"),
        "price": format(price, ".2f"),
    }
    return quote_serializer.dumps(payload), payload


def verify_shipping_quote(token, postal_code, quantity):
    if not token:
        raise CheckoutError("Cotação de frete ausente.")

    try:
        payload = quote_serializer.loads(token, max_age=QUOTE_MAX_AGE_SECONDS)
    except SignatureExpired as exc:
        raise CheckoutError("A cotação de frete expirou. Calcule o frete novamente.") from exc
    except BadSignature as exc:
        raise CheckoutError("Cotação de frete inválida.") from exc

    if (
        payload.get("postal_code") != postal_code
        or payload.get("quantity") != quantity
    ):
        raise CheckoutError("A cotação de frete não corresponde ao pedido.")

    return {
        "service": str(payload.get("service") or ""),
        "company": str(payload.get("company") or ""),
        "price": money(payload.get("price")),
    }


def build_order(data):
    items, total_quantity, subtotal = parse_order_items(data)
    postal_code = normalize_postal_code(data.get("postal_code"))
    shipping = verify_shipping_quote(data.get("shipping_quote"), postal_code, total_quantity)
    total = money(subtotal + shipping["price"])
    return {
        "items": items,
        "postal_code": postal_code,
        "shipping": shipping,
        "subtotal": subtotal,
        "total": total,
    }


def is_correios_option(option):
    company = str((option.get("company") or {}).get("name") or "").lower()
    service = str(option.get("name") or "").lower()
    return "correios" in company and re.search(r"\b(?:pac|sedex)\b", service) is not None


def get_shipping_options(postal_code, quantity):
    if not MELHOR_ENVIO_TOKEN:
        raise CheckoutError("Frete não configurado no servidor.")

    try:
        response = requests.post(
            "https://melhorenvio.com.br/api/v2/me/shipment/calculate",
            json={
                "from": {"postal_code": "32340380"},
                "to": {"postal_code": postal_code},
                "products": [{
                    "id": "bichinho-001",
                    "width": 1,
                    "height": 20,
                    "length": 20,
                    "weight": 0.1,
                    "insurance_value": 29.90,
                    "quantity": quantity,
                }],
            },
            headers={
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": f"Bearer {MELHOR_ENVIO_TOKEN}",
            },
            timeout=20,
        )
    except requests.RequestException as exc:
        raise UpstreamError("Não foi possível consultar o frete.") from exc

    if not response.ok:
        raise UpstreamError("O serviço de frete recusou a consulta.")

    try:
        options = response.json()
    except ValueError as exc:
        raise UpstreamError("Resposta inválida do serviço de frete.") from exc

    if not isinstance(options, list):
        raise UpstreamError("Resposta inválida do serviço de frete.")

    public_options = []
    for option in options:
        if option.get("error") or not is_correios_option(option):
            continue

        token, quote = create_shipping_quote(postal_code, quantity, option)
        public_options.append({
            "name": quote["service"],
            "company": {"name": quote["company"]},
            "price": quote["price"],
            "delivery_range": option.get("delivery_range"),
            "delivery_time": option.get("delivery_time"),
            "quote_token": token,
        })

    return public_options


def request_id_from(data):
    value = str(data.get("request_id") or "")
    try:
        return str(uuid.UUID(value))
    except (ValueError, AttributeError, TypeError):
        return str(uuid.uuid4())


def validate_payer(payer):
    if not isinstance(payer, dict):
        raise CheckoutError("Dados do pagador inválidos.")

    email = str(payer.get("email") or "").strip()
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        raise CheckoutError("E-mail inválido.")

    identification = payer.get("identification") or {}
    cpf = re.sub(r"\D", "", str(identification.get("number") or ""))
    if len(cpf) != 11:
        raise CheckoutError("CPF inválido.")

    return {
        "email": email,
        "first_name": str(payer.get("first_name") or "").strip(),
        "last_name": str(payer.get("last_name") or "").strip(),
        "identification": {"type": "CPF", "number": cpf},
    }


def validate_address(address, postal_code):
    if not isinstance(address, dict):
        raise CheckoutError("Endereço inválido.")

    fields = {}
    limits = {
        "street": 160,
        "number": 30,
        "complement": 100,
        "neighborhood": 100,
        "city": 100,
        "state": 2,
    }
    for field, limit in limits.items():
        value = str(address.get(field) or "").strip()
        if field != "complement" and not value:
            raise CheckoutError("Preencha todos os campos obrigatórios do endereço.")
        if len(value) > limit:
            raise CheckoutError("Um campo do endereço excedeu o tamanho permitido.")
        fields[field] = value

    address_postal_code = normalize_postal_code(address.get("postal_code"))
    if address_postal_code != postal_code:
        raise CheckoutError("O CEP do endereço não corresponde ao frete.")

    fields["postal_code"] = address_postal_code
    fields["state"] = fields["state"].upper()
    if not re.match(r"^[A-Z]{2}$", fields["state"]):
        raise CheckoutError("Estado inválido.")
    return fields


def order_fingerprint(order, payer, address, payment_method):
    payload = {
        "items": [
            {"id": item["id"], "quantity": item["quantity"]}
            for item in order["items"]
        ],
        "postal_code": order["postal_code"],
        "shipping_service": order["shipping"]["service"],
        "shipping_price": format(order["shipping"]["price"], ".2f"),
        "total": format(order["total"], ".2f"),
        "email": payer["email"].lower(),
        "first_name": payer["first_name"],
        "last_name": payer["last_name"],
        "cpf": payer["identification"]["number"],
        "address": address,
        "payment_method": payment_method,
    }
    serialized = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=True)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def create_order_token(order_id, order, payer, address, payment_method):
    return order_serializer.dumps({
        "order_id": order_id,
        "fingerprint": order_fingerprint(order, payer, address, payment_method),
    })


def verify_order_token(token, order, payer, address, payment_method):
    if not token:
        raise CheckoutError("Pedido não criado. Finalize a compra novamente.")

    try:
        payload = order_serializer.loads(token, max_age=ORDER_TOKEN_MAX_AGE_SECONDS)
    except SignatureExpired as exc:
        raise CheckoutError("O pedido expirou. Finalize a compra novamente.") from exc
    except BadSignature as exc:
        raise CheckoutError("Pedido inválido.") from exc

    expected = order_fingerprint(order, payer, address, payment_method)
    if not secrets.compare_digest(str(payload.get("fingerprint") or ""), expected):
        raise CheckoutError("Os dados do pedido foram alterados. Finalize a compra novamente.")

    order_id = str(payload.get("order_id") or "")
    if not re.match(r"^ORD-\d{8}-[A-F0-9]{12}$", order_id):
        raise CheckoutError("Pedido inválido.")
    return order_id


def google_service_account_info():
    if not GOOGLE_SERVICE_ACCOUNT_JSON_BASE64:
        raise UpstreamError("Google Sheets não configurado no servidor.")
    try:
        raw = base64.b64decode(GOOGLE_SERVICE_ACCOUNT_JSON_BASE64, validate=True)
        info = json.loads(raw.decode("utf-8"))
    except (ValueError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise UpstreamError("Credencial do Google Sheets inválida.") from exc
    if info.get("type") != "service_account":
        raise UpstreamError("Credencial do Google Sheets inválida.")
    return info


def google_access_token():
    try:
        credentials = service_account.Credentials.from_service_account_info(
            google_service_account_info(),
            scopes=[SHEETS_SCOPE],
        )
        credentials.refresh(GoogleAuthRequest())
    except Exception as exc:
        app.logger.exception("Não foi possível autenticar no Google Sheets.")
        raise UpstreamError("Não foi possível autenticar no Google Sheets.") from exc
    return credentials.token


def sheets_request(method, range_name, access_token, values=None, params=None):
    if not GOOGLE_SHEETS_SPREADSHEET_ID:
        raise UpstreamError("Google Sheets não configurado no servidor.")

    encoded_range = quote(range_name, safe="")
    url = (
        "https://sheets.googleapis.com/v4/spreadsheets/"
        f"{GOOGLE_SHEETS_SPREADSHEET_ID}/values/{encoded_range}"
    )
    if method == "POST":
        url += ":append"

    try:
        response = requests.request(
            method,
            url,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            json={"majorDimension": "ROWS", "values": values} if values is not None else None,
            params=params,
            timeout=20,
        )
    except requests.RequestException as exc:
        raise UpstreamError("Não foi possível conectar ao Google Sheets.") from exc

    if not response.ok:
        app.logger.error("Google Sheets response: http=%s", response.status_code)
        if response.status_code in {403, 404}:
            raise UpstreamError(
                "A planilha ou aba Pedidos não está acessível pela conta de serviço."
            )
        raise UpstreamError("O Google Sheets recusou a gravação do pedido.")
    return response


def ensure_orders_header(access_token):
    sheet_name = GOOGLE_SHEETS_RANGE.split("!", 1)[0]
    header_range = f"{sheet_name}!A1:S1"
    response = sheets_request("GET", header_range, access_token)
    try:
        values = response.json().get("values") or []
    except ValueError as exc:
        raise UpstreamError("Resposta inválida do Google Sheets.") from exc
    if values:
        return
    sheets_request(
        "PUT",
        header_range,
        access_token,
        values=[ORDER_HEADERS],
        params={"valueInputOption": "RAW"},
    )


def order_items_text(items):
    return " | ".join(
        f"{item['name']} [{item['id']}] x{item['quantity']} @ {format(item['unit_price'], '.2f')}"
        for item in items
    )


def append_order_to_sheet(order_id, order, payer, address, payment_method, created_at):
    access_token = google_access_token()
    ensure_orders_header(access_token)
    row = [
        created_at,
        order_id,
        ORDER_STATUS,
        payment_method,
        f"{payer['first_name']} {payer['last_name']}".strip(),
        payer["email"],
        payer["identification"]["number"],
        address["postal_code"],
        address["street"],
        address["number"],
        address["complement"],
        address["neighborhood"],
        address["city"],
        address["state"],
        order_items_text(order["items"]),
        format(order["subtotal"], ".2f"),
        order["shipping"]["service"],
        format(order["shipping"]["price"], ".2f"),
        format(order["total"], ".2f"),
    ]
    sheets_request(
        "POST",
        GOOGLE_SHEETS_RANGE,
        access_token,
        values=[row],
        params={
            "valueInputOption": "RAW",
            "insertDataOption": "INSERT_ROWS",
        },
    )


def mercado_pago_post(payload, idempotency_key):
    validate_mercado_pago_credentials()
    try:
        response = requests.post(
            "https://api.mercadopago.com/v1/payments",
            json=payload,
            headers={
                "Authorization": f"Bearer {MP_ACCESS_TOKEN}",
                "X-Idempotency-Key": idempotency_key,
                "Content-Type": "application/json",
            },
            timeout=25,
        )
    except requests.RequestException as exc:
        raise UpstreamError("Não foi possível conectar ao Mercado Pago.") from exc

    try:
        body = response.json()
    except ValueError:
        body = {}

    app.logger.info(
        "Mercado Pago response: http=%s payment_id=%s status=%s",
        response.status_code,
        body.get("id"),
        body.get("status"),
    )
    return response, body


def public_payment_response(body, include_pix=False):
    result = {
        "id": body.get("id"),
        "status": body.get("status"),
        "status_detail": body.get("status_detail"),
    }
    if include_pix:
        transaction = (body.get("point_of_interaction") or {}).get("transaction_data") or {}
        result["point_of_interaction"] = {
            "transaction_data": {
                "qr_code": transaction.get("qr_code"),
                "qr_code_base64": transaction.get("qr_code_base64"),
                "ticket_url": transaction.get("ticket_url"),
            }
        }
    return result


@app.after_request
def set_security_headers(response):
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
    if request.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
    return response


@app.errorhandler(CheckoutError)
def handle_checkout_error(error):
    return jsonify({"error": str(error)}), 400


@app.errorhandler(UpstreamError)
def handle_upstream_error(error):
    return jsonify({"error": str(error)}), 502


@app.route("/")
def index():
    return send_from_directory(STATIC_DIR, "index.html")


@app.route("/api/config", methods=["GET"])
def api_config():
    validate_mercado_pago_credentials()
    return jsonify({"mercado_pago_public_key": MP_PUBLIC_KEY})


@app.route("/api/checkout/summary", methods=["POST"])
def checkout_summary():
    order = build_order(json_body())
    return jsonify({
        "items": [{
            "id": item["id"],
            "name": item["name"],
            "quantity": item["quantity"],
            "unit_price": format(item["unit_price"], ".2f"),
        } for item in order["items"]],
        "subtotal": format(order["subtotal"], ".2f"),
        "shipping": format(order["shipping"]["price"], ".2f"),
        "total": format(order["total"], ".2f"),
    })


@app.route("/api/orders", methods=["POST"])
def create_order():
    data = json_body()
    order = build_order(data)
    payer = validate_payer(data.get("customer"))
    address = validate_address(data.get("address"), order["postal_code"])
    payment_method = str(data.get("payment_method") or "").strip()
    if payment_method not in {"card", "pix"}:
        raise CheckoutError("Forma de pagamento inválida.")

    order_id = f"ORD-{datetime.now(timezone.utc):%Y%m%d}-{uuid.uuid4().hex[:12].upper()}"
    created_at = datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
    append_order_to_sheet(
        order_id,
        order,
        payer,
        address,
        payment_method,
        created_at,
    )
    return jsonify({
        "order_id": order_id,
        "order_token": create_order_token(order_id, order, payer, address, payment_method),
        "status": ORDER_STATUS,
    }), 201


@app.route("/api/pay/card", methods=["POST"])
def pay_card():
    data = json_body()
    order = build_order(data)
    payer = validate_payer(data.get("payer"))
    address = validate_address(data.get("address"), order["postal_code"])
    token = str(data.get("token") or "").strip()
    payment_method_id = str(data.get("payment_method_id") or "").strip()
    if not token or not re.match(r"^[a-z0-9_]{1,40}$", payment_method_id):
        raise CheckoutError("Dados do cartão incompletos.")

    try:
        installments = int(data.get("installments", 1))
    except (TypeError, ValueError) as exc:
        raise CheckoutError("Número de parcelas inválido.") from exc
    if installments < 1 or installments > 24:
        raise CheckoutError("Número de parcelas inválido.")

    order_id = verify_order_token(data.get("order_token"), order, payer, address, "card")
    request_id = request_id_from(data)
    payload = {
        "transaction_amount": float(order["total"]),
        "token": token,
        "installments": installments,
        "payment_method_id": payment_method_id,
        "payer": payer,
        "external_reference": order_id,
        "description": "Compra ricardodraw",
        "additional_info": {
            "items": [{
                "id": item["id"],
                "title": item["name"],
                "quantity": item["quantity"],
                "unit_price": float(item["unit_price"]),
            } for item in order["items"]],
        },
    }

    issuer_id = str(data.get("issuer_id") or "").strip()
    if issuer_id:
        payload["issuer_id"] = issuer_id

    response, body = mercado_pago_post(payload, request_id)
    result = public_payment_response(body)
    if not response.ok and not result["status"]:
        result["error"] = "O Mercado Pago não conseguiu processar o pagamento."
    return jsonify(result), response.status_code


@app.route("/api/pay/pix", methods=["POST"])
def pay_pix():
    data = json_body()
    order = build_order(data)
    payer = validate_payer({
        "email": data.get("email"),
        "first_name": data.get("first_name"),
        "last_name": data.get("last_name"),
        "identification": {"number": data.get("cpf")},
    })
    address = validate_address(data.get("address"), order["postal_code"])
    order_id = verify_order_token(data.get("order_token"), order, payer, address, "pix")
    request_id = request_id_from(data)
    payload = {
        "transaction_amount": float(order["total"]),
        "payment_method_id": "pix",
        "payer": payer,
        "external_reference": order_id,
        "description": "Compra ricardodraw",
        "additional_info": {
            "items": [{
                "id": item["id"],
                "title": item["name"],
                "quantity": item["quantity"],
                "unit_price": float(item["unit_price"]),
            } for item in order["items"]],
        },
    }

    response, body = mercado_pago_post(payload, request_id)
    result = public_payment_response(body, include_pix=True)
    if not response.ok and not result["status"]:
        result["error"] = "O Mercado Pago não conseguiu gerar o Pix."
    return jsonify(result), response.status_code


@app.route("/api/shipping/calculate", methods=["POST"])
def shipping_calculate():
    data = json_body()
    postal_code = normalize_postal_code(data.get("postal_code"))
    try:
        quantity = int(data.get("quantity", 1))
    except (TypeError, ValueError) as exc:
        raise CheckoutError("Quantidade inválida.") from exc
    if quantity < 1 or quantity > MAX_QUANTITY:
        raise CheckoutError(f"Quantidade deve estar entre 1 e {MAX_QUANTITY}.")

    return jsonify(get_shipping_options(postal_code, quantity))


@app.route("/<path:path>")
def static_files(path):
    parts = PurePosixPath(path).parts
    if not parts or any(part.startswith(".") for part in parts):
        abort(404)

    if len(parts) == 1:
        if PurePosixPath(parts[0]).suffix.lower() not in PUBLIC_ROOT_EXTENSIONS:
            abort(404)
    elif parts[0].lower() not in PUBLIC_DIRECTORIES:
        abort(404)

    return send_from_directory(STATIC_DIR, path)


if __name__ == "__main__":
    app.run(debug=os.getenv("FLASK_DEBUG") == "1", port=int(os.getenv("PORT", "5000")))
