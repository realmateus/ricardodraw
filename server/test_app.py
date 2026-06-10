import unittest
from unittest.mock import patch

from itsdangerous import URLSafeTimedSerializer

from server import app as app_module


class FakeResponse:
    def __init__(self, status_code, body):
        self.status_code = status_code
        self._body = body
        self.ok = 200 <= status_code < 400

    def json(self):
        return self._body


class CheckoutApiTests(unittest.TestCase):
    def setUp(self):
        app_module.app.config["TESTING"] = True
        app_module.quote_serializer = URLSafeTimedSerializer(
            "test-signing-key",
            salt="ricardodraw-shipping-v1",
        )
        app_module.order_serializer = URLSafeTimedSerializer(
            "test-signing-key",
            salt="ricardodraw-order-v1",
        )
        self.client = app_module.app.test_client()

    def order_payload(self):
        quote_token, _ = app_module.create_shipping_quote(
            "30140071",
            1,
            {
                "name": "PAC",
                "company": {"name": "Correios"},
                "price": "12.34",
            },
        )
        return {
            "items": [{"id": "bichinho-001", "quantity": 1}],
            "postal_code": "30140-071",
            "shipping_quote": quote_token,
        }

    def customer_payload(self):
        return {
            "email": "cliente@example.com",
            "first_name": "Cliente",
            "last_name": "Teste",
            "identification": {
                "type": "CPF",
                "number": "12345678901",
            },
        }

    def address_payload(self):
        return {
            "postal_code": "30140-071",
            "street": "Rua Teste",
            "number": "123",
            "complement": "Apto 10",
            "neighborhood": "Centro",
            "city": "Belo Horizonte",
            "state": "MG",
        }

    def test_sensitive_files_are_not_public(self):
        self.assertEqual(self.client.get("/server/.env").status_code, 404)
        self.assertEqual(
            self.client.get("/documentation/mercado%20pago/chaves.txt").status_code,
            404,
        )
        self.assertEqual(
            self.client.get("/documentation/ricardodraw-eae7cb19372f.json").status_code,
            404,
        )

    def test_summary_uses_catalog_and_signed_shipping(self):
        response = self.client.post("/api/checkout/summary", json=self.order_payload())

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["subtotal"], "29.90")
        self.assertEqual(response.get_json()["shipping"], "12.34")
        self.assertEqual(response.get_json()["total"], "42.24")

    @patch("server.app.append_order_to_sheet")
    def test_create_order_appends_pending_payment_row(self, append_order):
        payload = {
            **self.order_payload(),
            "payment_method": "pix",
            "customer": self.customer_payload(),
            "address": self.address_payload(),
        }

        response = self.client.post("/api/orders", json=payload)

        self.assertEqual(response.status_code, 201)
        result = response.get_json()
        self.assertRegex(result["order_id"], r"^ORD-\d{8}-[A-F0-9]{12}$")
        self.assertEqual(result["status"], "pending_payment")
        self.assertTrue(result["order_token"])
        append_order.assert_called_once()
        self.assertEqual(append_order.call_args.args[0], result["order_id"])
        self.assertEqual(append_order.call_args.args[4], "pix")

    @patch("server.app.requests.post")
    def test_card_payment_ignores_frontend_amount(self, requests_post):
        requests_post.return_value = FakeResponse(
            201,
            {"id": 123, "status": "approved", "status_detail": "accredited"},
        )
        payload = {
            **self.order_payload(),
            "amount": "0.01",
            "address": self.address_payload(),
            "request_id": "e0fc6d9a-5705-4ab2-b928-9c59f709eb73",
            "token": "card-token",
            "payment_method_id": "visa",
            "installments": 1,
            "payer": self.customer_payload(),
        }
        order = app_module.build_order(payload)
        payer = app_module.validate_payer(payload["payer"])
        order_id = "ORD-20260610-ABCDEF123456"
        payload["order_token"] = app_module.create_order_token(
            order_id,
            order,
            payer,
            app_module.validate_address(payload["address"], order["postal_code"]),
            "card",
        )

        response = self.client.post("/api/pay/card", json=payload)

        self.assertEqual(response.status_code, 201)
        mercado_pago_payload = requests_post.call_args.kwargs["json"]
        self.assertEqual(mercado_pago_payload["transaction_amount"], 42.24)
        self.assertNotIn("amount", mercado_pago_payload)
        self.assertEqual(mercado_pago_payload["external_reference"], order_id)

    @patch("server.app.sheets_request")
    @patch("server.app.ensure_orders_header")
    @patch("server.app.google_access_token", return_value="google-token")
    def test_sheet_row_has_pending_status_and_expected_columns(
        self,
        google_access_token,
        ensure_header,
        sheets_request,
    ):
        order = app_module.build_order(self.order_payload())
        payer = app_module.validate_payer(self.customer_payload())
        address = app_module.validate_address(
            self.address_payload(),
            order["postal_code"],
        )

        app_module.append_order_to_sheet(
            "ORD-20260610-ABCDEF123456",
            order,
            payer,
            address,
            "card",
            "2026-06-10T12:00:00Z",
        )

        google_access_token.assert_called_once()
        ensure_header.assert_called_once_with("google-token")
        row = sheets_request.call_args.kwargs["values"][0]
        self.assertEqual(len(row), 19)
        self.assertEqual(row[1], "ORD-20260610-ABCDEF123456")
        self.assertEqual(row[2], "pending_payment")
        self.assertEqual(row[3], "card")
        self.assertEqual(row[18], "42.24")
        self.assertEqual(
            sheets_request.call_args.kwargs["params"]["insertDataOption"],
            "INSERT_ROWS",
        )

    @patch("server.app.requests.post")
    def test_shipping_returns_signed_public_options(self, requests_post):
        requests_post.return_value = FakeResponse(
            200,
            [
                {
                    "name": "PAC",
                    "company": {"name": "Correios"},
                    "price": "15.10",
                    "delivery_time": 5,
                },
                {
                    "name": "Expresso",
                    "company": {"name": "Outra"},
                    "price": "8.00",
                },
            ],
        )

        response = self.client.post(
            "/api/shipping/calculate",
            json={"postal_code": "30140071", "quantity": 1},
        )

        self.assertEqual(response.status_code, 200)
        options = response.get_json()
        self.assertEqual(len(options), 1)
        self.assertEqual(options[0]["name"], "PAC")
        self.assertTrue(options[0]["quote_token"])


if __name__ == "__main__":
    unittest.main()
