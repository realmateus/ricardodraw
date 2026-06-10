/**
 * Checkout do Bichinho da Ansiedade.
 * O frete é escolhido na página do produto e preservado até o pagamento.
 */

function readStoredJson(key, fallback) {
    try {
        return JSON.parse(localStorage.getItem(key)) || fallback;
    } catch {
        return fallback;
    }
}

const checkoutItems = readStoredJson('ricardodraw_checkout_items', []);
let checkoutShipping = readStoredJson('ricardodraw_checkout_shipping', null);
let shippingOptions = filterCorreiosShippingOptions(checkoutShipping?.options || []);
let selectedShippingIndex = getStoredShippingIndex();
let subtotal = calculateSubtotal();
let shippingCost = Number(shippingOptions[selectedShippingIndex]?.price || 0);
let cardFormInstance = null;
let activePaymentMethod = 'card';
let quantityUpdateInProgress = false;
let pendingOrder = null;

document.addEventListener('DOMContentLoaded', initializeCheckout);

async function initializeCheckout() {
    if (!checkoutItems.length) {
        showEmptyCheckout('Adicione um livro ao seu carrinho');
        return;
    }

    if (!hasValidStoredShipping()) {
        showEmptyCheckout('Selecione o frete antes de continuar');
        return;
    }

    try {
        const [publicKey] = await Promise.all([
            loadPaymentConfig(),
            refreshCheckoutSummary()
        ]);

        renderOrderItems();
        renderShippingSummary();
        initShippingSelect();
        initQuantityControls();
        initPersonalData();
        fillAddressFromCep();
        updateTotals();
        initPaymentTabs();
        initFinalizeButton();
        initCardForm(publicKey);
        initPixForm();
    } catch (error) {
        console.error('Checkout initialization error:', error);
        showEmptyCheckout(error.message || 'Não foi possível carregar o checkout');
    }
}

async function loadPaymentConfig() {
    const response = await fetch('/api/config', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok || !data.mercado_pago_public_key) {
        throw new Error(data.error || 'Pagamento não configurado.');
    }
    return data.mercado_pago_public_key;
}

function getStoredShippingIndex() {
    const storedOption = checkoutShipping?.options?.[checkoutShipping?.selectedIndex];
    if (!storedOption) return -1;

    return shippingOptions.findIndex((option) =>
        option.name === storedOption.name
        && (option.company?.name || 'Correios') === (storedOption.company?.name || 'Correios')
        && String(option.price) === String(storedOption.price)
    );
}

function hasValidStoredShipping() {
    const cep = String(checkoutShipping?.cep || '').replace(/\D/g, '');
    return cep.length === 8
        && selectedShippingIndex >= 0
        && Boolean(shippingOptions[selectedShippingIndex]?.quote_token)
        && Number.isFinite(shippingCost);
}

function calculateSubtotal() {
    return checkoutItems.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
}

function getTotalQuantity() {
    return checkoutItems.reduce((sum, item) => sum + Number(item.quantity), 0);
}

function getTotal() {
    return subtotal + shippingCost;
}

function formatPrice(value) {
    return Number(value).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).replace(/^r\$/i, 'R$');
}

function formatDeliveryText(option) {
    const minimum = option?.delivery_range?.min || option?.delivery_time;
    const maximum = option?.delivery_range?.max || option?.delivery_time;
    if (minimum && maximum && minimum !== maximum) return `${minimum} a ${maximum} dias úteis`;
    return minimum ? `${minimum} dias úteis` : '';
}

function normalizeShippingOption(option) {
    return {
        name: option.name || 'Envio pelos Correios',
        company: option.company || { name: 'Correios' },
        price: option.custom_price || option.price,
        delivery_range: option.delivery_range,
        delivery_time: option.delivery_time,
        quote_token: option.quote_token
    };
}

function getOrderPayload(postalCode = checkoutShipping?.cep) {
    return {
        items: checkoutItems.map((item) => ({
            id: item.id,
            quantity: Number(item.quantity)
        })),
        shipping_quote: shippingOptions[selectedShippingIndex]?.quote_token || '',
        postal_code: String(postalCode || '').replace(/\D/g, '')
    };
}

async function refreshCheckoutSummary() {
    const response = await fetch('/api/checkout/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(getOrderPayload())
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Não foi possível validar o pedido.');

    data.items.forEach((serverItem) => {
        const item = checkoutItems.find((candidate) => candidate.id === serverItem.id);
        if (!item) return;
        item.name = serverItem.name;
        item.price = Number(serverItem.unit_price);
        item.quantity = Number(serverItem.quantity);
    });

    subtotal = Number(data.subtotal);
    shippingCost = Number(data.shipping);
    if (shippingOptions[selectedShippingIndex]) {
        shippingOptions[selectedShippingIndex].price = data.shipping;
    }
}

function renderOrderItems() {
    const container = document.getElementById('orderItems');
    if (!container) return;

    container.innerHTML = checkoutItems.map((item, index) => `
        <article class="order-item">
            <img src="${item.image}" alt="${item.name}" class="order-item-image">
            <div class="order-item-info">
                <div class="order-item-name">${item.name}</div>
                <div class="order-item-price">${formatPrice(item.price)} por unidade</div>
                <div class="quantity-control" aria-label="Quantidade de ${item.name}">
                    <button type="button" data-quantity-action="decrease" data-item-index="${index}"
                        aria-label="Diminuir quantidade">−</button>
                    <span aria-live="polite">${item.quantity}</span>
                    <button type="button" data-quantity-action="increase" data-item-index="${index}"
                        aria-label="Aumentar quantidade">+</button>
                </div>
            </div>
            <strong class="order-item-total">${formatPrice(Number(item.price) * Number(item.quantity))}</strong>
        </article>
    `).join('');
}

function renderShippingSummary() {
    const option = shippingOptions[selectedShippingIndex];
    const name = document.getElementById('selectedShippingName');
    const delivery = document.getElementById('selectedShippingDelivery');
    const options = document.getElementById('shippingOptions');
    if (!option || !name || !delivery || !options) return;

    const deliveryText = formatDeliveryText(option);
    name.textContent = `${option.name} — ${formatPrice(option.price)}`;
    delivery.textContent = deliveryText;
    options.innerHTML = shippingOptions.map((shippingOption, index) => {
        const selected = index === selectedShippingIndex;
        return `
            <button type="button" class="shipping-option-item ${selected ? 'selected' : ''}"
                role="option" aria-selected="${selected}" data-shipping-index="${index}">
                <strong>${shippingOption.name} — ${formatPrice(shippingOption.price)}</strong>
                <span>${formatDeliveryText(shippingOption)}</span>
            </button>
        `;
    }).join('');
}

function initShippingSelect() {
    const dropdown = document.getElementById('shippingDropdown');
    const trigger = document.getElementById('shippingSelect');
    const options = document.getElementById('shippingOptions');
    if (!dropdown || !trigger || !options) return;

    const close = (restoreFocus = false) => {
        options.classList.add('hidden');
        dropdown.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
        if (restoreFocus) trigger.focus();
    };

    const open = () => {
        options.classList.remove('hidden');
        dropdown.classList.add('open');
        trigger.setAttribute('aria-expanded', 'true');
    };

    const choose = (nextIndex) => {
        if (!shippingOptions[nextIndex]) return;

        invalidatePendingOrder();
        selectedShippingIndex = nextIndex;
        shippingCost = Number(shippingOptions[selectedShippingIndex].price);
        checkoutShipping = {
            cep: checkoutShipping.cep,
            selectedIndex: selectedShippingIndex,
            options: shippingOptions
        };

        localStorage.setItem('ricardodraw_checkout_shipping', JSON.stringify(checkoutShipping));
        renderShippingSummary();
        updateTotals();
        setSummaryError('');
        close(true);
    };

    trigger.addEventListener('click', () => {
        if (options.classList.contains('hidden')) open();
        else close();
    });

    options.addEventListener('click', (event) => {
        const item = event.target.closest('[data-shipping-index]');
        if (item) choose(Number(item.dataset.shippingIndex));
    });

    dropdown.addEventListener('keydown', (event) => {
        const items = [...options.querySelectorAll('[data-shipping-index]')];
        if (!items.length) return;

        if (event.key === 'Escape') {
            event.preventDefault();
            close(true);
            return;
        }

        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            if (options.classList.contains('hidden')) open();
            const currentIndex = items.indexOf(document.activeElement);
            const direction = event.key === 'ArrowDown' ? 1 : -1;
            const startIndex = currentIndex === -1
                ? (event.key === 'ArrowDown' ? -1 : 0)
                : currentIndex;
            const nextIndex = (startIndex + direction + items.length) % items.length;
            items[nextIndex].focus();
        }

        if ((event.key === 'Enter' || event.key === ' ') && document.activeElement.dataset.shippingIndex) {
            event.preventDefault();
            choose(Number(document.activeElement.dataset.shippingIndex));
        }
    });

    document.addEventListener('click', (event) => {
        if (!dropdown.contains(event.target)) close();
    });
}

function initQuantityControls() {
    document.getElementById('orderItems')?.addEventListener('click', async (event) => {
        const button = event.target.closest('[data-quantity-action]');
        if (!button || quantityUpdateInProgress) return;

        const item = checkoutItems[Number(button.dataset.itemIndex)];
        if (!item) return;

        const previousQuantity = Number(item.quantity);
        const change = button.dataset.quantityAction === 'increase' ? 1 : -1;
        const nextQuantity = Math.min(20, Math.max(1, previousQuantity + change));
        if (nextQuantity === previousQuantity) return;

        invalidatePendingOrder();
        item.quantity = nextQuantity;
        subtotal = calculateSubtotal();
        renderOrderItems();
        updateTotals();
        setSummaryError('');

        try {
            await recalculateStoredShipping();
            localStorage.setItem('ricardodraw_checkout_items', JSON.stringify(checkoutItems));
        } catch (error) {
            item.quantity = previousQuantity;
            subtotal = calculateSubtotal();
            renderOrderItems();
            updateTotals();
            setSummaryError(error.message || 'Não foi possível atualizar o frete.');
        }
    });
}

async function recalculateStoredShipping() {
    const cep = String(checkoutShipping.cep).replace(/\D/g, '');
    const currentOption = shippingOptions[selectedShippingIndex];
    quantityUpdateInProgress = true;
    setFinalizeState(true, 'atualizando frete');

    try {
        const response = await fetch('/api/shipping/calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                postal_code: cep,
                quantity: getTotalQuantity()
            })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Erro ao atualizar o frete.');

        const nextOptions = filterCorreiosShippingOptions(data).map(normalizeShippingOption);
        if (!nextOptions.length) throw new Error('PAC ou SEDEX não estão disponíveis para esta quantidade.');

        let nextIndex = nextOptions.findIndex((option) =>
            option.name === currentOption?.name
            && (option.company?.name || 'Correios') === (currentOption?.company?.name || 'Correios')
        );
        if (nextIndex < 0) nextIndex = 0;

        shippingOptions = nextOptions;
        selectedShippingIndex = nextIndex;
        shippingCost = Number(shippingOptions[selectedShippingIndex].price);
        checkoutShipping = {
            cep,
            selectedIndex: selectedShippingIndex,
            options: shippingOptions
        };

        await refreshCheckoutSummary();
        localStorage.setItem('ricardodraw_checkout_shipping', JSON.stringify(checkoutShipping));
        renderShippingSummary();
        updateTotals();
    } finally {
        quantityUpdateInProgress = false;
        setFinalizeState(false);
    }
}

function initPersonalData() {
    const cpfInput = document.getElementById('customer-cpf');
    const firstNameInput = document.getElementById('customer-firstname');
    const lastNameInput = document.getElementById('customer-lastname');
    const cardholderInput = document.getElementById('form-checkout__cardholderName');
    const identificationInput = document.getElementById('form-checkout__identificationNumber');

    cpfInput?.addEventListener('input', () => {
        cpfInput.value = formatCpf(cpfInput.value);
        if (identificationInput) identificationInput.value = cpfInput.value.replace(/\D/g, '');
        clearInvalidState(cpfInput);
    });

    const syncCardholderName = () => {
        if (!cardholderInput || cardholderInput.dataset.edited === 'true') return;
        cardholderInput.value = `${firstNameInput?.value || ''} ${lastNameInput?.value || ''}`.trim();
    };

    firstNameInput?.addEventListener('input', syncCardholderName);
    lastNameInput?.addEventListener('input', syncCardholderName);
    cardholderInput?.addEventListener('input', () => {
        if (document.activeElement === cardholderInput) cardholderInput.dataset.edited = 'true';
    });

    document.querySelectorAll('.customer-form input').forEach((input) => {
        input.addEventListener('input', () => {
            clearInvalidState(input);
            invalidatePendingOrder();
        });
    });

    document.querySelectorAll('.address-form input').forEach((input) => {
        input.addEventListener('input', invalidatePendingOrder);
    });
}

function formatCpf(value) {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    return digits
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function isValidCpf(value) {
    const cpf = value.replace(/\D/g, '');
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

    const calculateDigit = (length) => {
        let sum = 0;
        for (let index = 0; index < length; index += 1) {
            sum += Number(cpf[index]) * (length + 1 - index);
        }
        const remainder = (sum * 10) % 11;
        return remainder === 10 ? 0 : remainder;
    };

    return calculateDigit(9) === Number(cpf[9])
        && calculateDigit(10) === Number(cpf[10]);
}

function getCustomerData() {
    return {
        email: document.getElementById('customer-email').value.trim(),
        firstName: document.getElementById('customer-firstname').value.trim(),
        lastName: document.getElementById('customer-lastname').value.trim(),
        cpf: document.getElementById('customer-cpf').value.replace(/\D/g, '')
    };
}

function getAddressData() {
    return {
        postal_code: document.getElementById('addr-cep').value.replace(/\D/g, ''),
        street: document.getElementById('addr-street').value.trim(),
        number: document.getElementById('addr-number').value.trim(),
        complement: document.getElementById('addr-complement').value.trim(),
        neighborhood: document.getElementById('addr-neighborhood').value.trim(),
        city: document.getElementById('addr-city').value.trim(),
        state: document.getElementById('addr-state').value.trim().toUpperCase()
    };
}

function validatePersonalData() {
    const fields = {
        email: document.getElementById('customer-email'),
        firstName: document.getElementById('customer-firstname'),
        lastName: document.getElementById('customer-lastname'),
        cpf: document.getElementById('customer-cpf')
    };
    const invalidFields = [
        !fields.email.validity.valid ? fields.email : null,
        !fields.firstName.value.trim() ? fields.firstName : null,
        !fields.lastName.value.trim() ? fields.lastName : null,
        !isValidCpf(fields.cpf.value) ? fields.cpf : null
    ].filter(Boolean);

    if (!invalidFields.length) {
        document.getElementById('personalError').classList.add('hidden');
        return true;
    }

    invalidFields.forEach((field) => field.classList.add('is-invalid'));
    document.getElementById('personalError').classList.remove('hidden');
    document.querySelector('.personal-section').scrollIntoView({ behavior: 'smooth', block: 'center' });
    invalidFields[0].focus();
    return false;
}

async function fillAddressFromCep() {
    const cep = String(checkoutShipping?.cep || '').replace(/\D/g, '');
    const cepInput = document.getElementById('addr-cep');
    if (!cepInput || cep.length !== 8) return;

    cepInput.value = `${cep.slice(0, 5)}-${cep.slice(5)}`;

    try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        if (data.erro) return;

        document.getElementById('addr-street').value = data.logradouro || '';
        document.getElementById('addr-neighborhood').value = data.bairro || '';
        document.getElementById('addr-city').value = data.localidade || '';
        document.getElementById('addr-state').value = data.uf || '';
    } catch (error) {
        console.warn('ViaCEP error:', error);
    }
}

function validateAddress() {
    const fields = [
        document.getElementById('addr-cep'),
        document.getElementById('addr-street'),
        document.getElementById('addr-number'),
        document.getElementById('addr-neighborhood'),
        document.getElementById('addr-city'),
        document.getElementById('addr-state')
    ];
    const invalidFields = fields.filter((field) => !field.value.trim());
    const addressPostalCode = fields[0].value.replace(/\D/g, '');
    const shippingPostalCode = String(checkoutShipping?.cep || '').replace(/\D/g, '');
    if (addressPostalCode !== shippingPostalCode && !invalidFields.includes(fields[0])) {
        invalidFields.push(fields[0]);
    }

    if (!invalidFields.length) {
        document.getElementById('addressError').classList.add('hidden');
        return true;
    }

    invalidFields.forEach((field) => {
        field.classList.add('is-invalid');
        field.addEventListener('input', () => clearInvalidState(field), { once: true });
    });
    document.getElementById('addressError').classList.remove('hidden');
    document.querySelector('.address-section').scrollIntoView({ behavior: 'smooth', block: 'center' });
    invalidFields[0].focus();
    return false;
}

function validateShipping() {
    if (hasValidStoredShipping() && !quantityUpdateInProgress) return true;
    setSummaryError('Volte ao produto e selecione PAC ou SEDEX antes de continuar.');
    document.querySelector('.checkout-right')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return false;
}

function clearInvalidState(field) {
    field.classList.remove('is-invalid');
}

function updateTotals() {
    document.getElementById('checkoutSubtotal').textContent = formatPrice(subtotal);
    document.getElementById('checkoutShipping').textContent = formatPrice(shippingCost);
    document.getElementById('checkoutTotal').textContent = formatPrice(getTotal());
    cardFormInstance?.update?.({ amount: getTotal().toFixed(2) });
}

function initPaymentTabs() {
    const tabs = document.querySelectorAll('.payment-tab');
    const panels = document.querySelectorAll('.payment-panel');

    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            if (activePaymentMethod !== tab.dataset.method) invalidatePendingOrder();
            activePaymentMethod = tab.dataset.method;
            tabs.forEach((item) => {
                const active = item === tab;
                item.classList.toggle('active', active);
                item.setAttribute('aria-selected', String(active));
            });
            panels.forEach((panel) => panel.classList.remove('active'));
            document.getElementById(activePaymentMethod === 'card' ? 'cardPayment' : 'pixPayment')
                .classList.add('active');
        });
    });
}

function initFinalizeButton() {
    document.getElementById('finalizePurchaseBtn')?.addEventListener('click', async () => {
        setSummaryError('');
        if (!validateShipping() || !validatePersonalData() || !validateAddress()) return;

        setFinalizeState(true, 'criando pedido...');
        try {
            await ensurePendingOrder();
            const form = document.getElementById(activePaymentMethod === 'card' ? 'form-checkout' : 'form-pix');
            if (!form) throw new Error('Formulário de pagamento indisponível.');
            form.requestSubmit();
        } catch (error) {
            console.error('Order creation error:', error);
            setSummaryError(error.message || 'Não foi possível criar o pedido.');
            setFinalizeState(false);
        }
    });
}

function invalidatePendingOrder() {
    pendingOrder = null;
}

async function ensurePendingOrder() {
    const payload = buildPendingOrderPayload();
    const fingerprint = JSON.stringify(payload);
    if (
        pendingOrder?.paymentMethod === activePaymentMethod
        && pendingOrder.fingerprint === fingerprint
    ) {
        return pendingOrder;
    }

    pendingOrder = null;
    const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: fingerprint
    });
    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.error || 'Não foi possível gravar o pedido.');
    }
    if (JSON.stringify(buildPendingOrderPayload()) !== fingerprint) {
        throw new Error('Os dados foram alterados durante a criação do pedido. Finalize novamente.');
    }

    pendingOrder = {
        orderId: result.order_id,
        orderToken: result.order_token,
        paymentMethod: activePaymentMethod,
        fingerprint
    };
    return pendingOrder;
}

function buildPendingOrderPayload() {
    const customer = getCustomerData();
    return {
        ...getOrderPayload(document.getElementById('addr-cep').value),
        payment_method: activePaymentMethod,
        customer: {
            email: customer.email,
            first_name: customer.firstName,
            last_name: customer.lastName,
            identification: {
                type: 'CPF',
                number: customer.cpf
            }
        },
        address: getAddressData()
    };
}

function setFinalizeState(disabled, label = 'finalizar compra') {
    const button = document.getElementById('finalizePurchaseBtn');
    const text = document.getElementById('finalizePurchaseBtnText');
    if (button) button.disabled = disabled;
    if (text) text.textContent = label;
}

function setSummaryError(message) {
    const error = document.getElementById('checkoutSummaryError');
    if (!error) return;
    error.textContent = message;
    error.classList.toggle('hidden', !message);
}

function initCardForm(publicKey) {
    const mp = new MercadoPago(publicKey);

    const cardForm = mp.cardForm({
        amount: getTotal().toFixed(2),
        iframe: true,
        form: {
            id: 'form-checkout',
            cardNumber: {
                id: 'form-checkout__cardNumber',
                placeholder: 'Número do cartão',
                style: { fontSize: '14px', fontFamily: 'Inter, sans-serif' }
            },
            expirationDate: {
                id: 'form-checkout__expirationDate',
                placeholder: 'MM/AA',
                style: { fontSize: '14px', fontFamily: 'Inter, sans-serif' }
            },
            securityCode: {
                id: 'form-checkout__securityCode',
                placeholder: 'CVV',
                style: { fontSize: '14px', fontFamily: 'Inter, sans-serif' }
            },
            cardholderName: {
                id: 'form-checkout__cardholderName',
                placeholder: 'Nome como está no cartão'
            },
            issuer: {
                id: 'form-checkout__issuer',
                placeholder: 'Banco emissor'
            },
            installments: {
                id: 'form-checkout__installments',
                placeholder: 'Parcelas'
            },
            identificationType: {
                id: 'form-checkout__identificationType'
            },
            identificationNumber: {
                id: 'form-checkout__identificationNumber',
                placeholder: 'CPF'
            }
        },
        callbacks: {
            onFormMounted: (error) => {
                if (error) {
                    console.warn('CardForm mount error:', error);
                    return;
                }
                const type = document.getElementById('form-checkout__identificationType');
                if (type) type.value = 'CPF';
            },
            onSubmit: async (event) => {
                event.preventDefault();
                if (!validateShipping() || !validatePersonalData() || !validateAddress()) return;

                setFinalizeState(true, 'processando...');

                try {
                    const order = await ensurePendingOrder();
                    const formData = cardForm.getCardFormData();
                    const customer = getCustomerData();
                    const response = await fetch('/api/pay/card', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            ...getOrderPayload(document.getElementById('addr-cep').value),
                            order_token: order.orderToken,
                            address: getAddressData(),
                            request_id: createRequestId(),
                            token: formData.token,
                            payment_method_id: formData.paymentMethodId,
                            issuer_id: formData.issuerId,
                            installments: Number(formData.installments || 1),
                            payer: {
                                email: customer.email,
                                first_name: customer.firstName,
                                last_name: customer.lastName,
                                identification: {
                                    type: 'CPF',
                                    number: customer.cpf
                                }
                            }
                        })
                    });
                    const result = await response.json();
                    if (!response.ok) {
                        throw new Error(result.error || result.status_detail || 'Erro ao processar o pagamento.');
                    }

                    if (result.status === 'approved') {
                        clearCheckout();
                        showPaymentResult('success', 'Pagamento aprovado!', 'Obrigado pela sua compra. Você receberá um e-mail de confirmação.');
                    } else if (result.status === 'in_process' || result.status === 'pending') {
                        showPaymentResult('pending', 'Pagamento pendente', 'Seu pagamento está sendo processado.');
                    } else {
                        showPaymentResult('error', 'Pagamento recusado', result.status_detail || 'Tente novamente ou use outro método.');
                    }
                } catch (error) {
                    console.error('Payment error:', error);
                    showPaymentResult('error', 'Erro no pagamento', 'Não foi possível processar o pagamento. Tente novamente.');
                } finally {
                    setFinalizeState(false);
                }
            },
            onFetching: () => {
                setFinalizeState(true, 'processando...');
                return () => setFinalizeState(false);
            }
        }
    });

    cardFormInstance = cardForm;
}

function initPixForm() {
    document.getElementById('form-pix')?.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!validateShipping() || !validatePersonalData() || !validateAddress()) return;

        setFinalizeState(true, 'gerando pix...');
        const customer = getCustomerData();

        try {
            const order = await ensurePendingOrder();
            const response = await fetch('/api/pay/pix', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...getOrderPayload(document.getElementById('addr-cep').value),
                    order_token: order.orderToken,
                    address: getAddressData(),
                    request_id: createRequestId(),
                    email: customer.email,
                    first_name: customer.firstName,
                    last_name: customer.lastName,
                    cpf: customer.cpf
                })
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || result.status_detail || 'Erro ao gerar Pix.');
            }
            const transaction = result.point_of_interaction?.transaction_data;

            if (result.status === 'pending' && transaction?.qr_code_base64) {
                document.getElementById('pixQrCode').innerHTML =
                    `<img src="data:image/png;base64,${transaction.qr_code_base64}" alt="QR Code Pix">`;
                document.getElementById('pixCopyPaste').value = transaction.qr_code || '';
                document.getElementById('form-pix').classList.add('hidden');
                document.getElementById('pixResult').classList.remove('hidden');
                document.getElementById('finalizePurchaseBtn').classList.add('hidden');
                initPixCopyButton(transaction.qr_code || '');
                clearCheckout();
            } else if (result.status === 'approved') {
                clearCheckout();
                showPaymentResult('success', 'Pagamento aprovado!', 'Obrigado pela sua compra.');
            } else {
                throw new Error(result.status_detail || result.message || 'Erro ao gerar Pix.');
            }
        } catch (error) {
            console.error('Pix error:', error);
            setSummaryError(error.message || 'Não foi possível gerar o Pix.');
        } finally {
            setFinalizeState(false);
        }
    });
}

function initPixCopyButton(code) {
    document.getElementById('pixCopyBtn')?.addEventListener('click', async (event) => {
        await navigator.clipboard.writeText(code);
        event.currentTarget.textContent = 'copiado';
        window.setTimeout(() => {
            event.currentTarget.textContent = 'copiar';
        }, 2000);
    }, { once: true });
}

function createRequestId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
        const random = Math.floor(Math.random() * 16);
        const value = character === 'x' ? random : (random & 0x3) | 0x8;
        return value.toString(16);
    });
}

function clearCheckout() {
    localStorage.removeItem('ricardodraw_checkout_items');
    localStorage.removeItem('ricardodraw_checkout_shipping');
}

function showPaymentResult(type, title, message) {
    const overlay = document.getElementById('paymentOverlay');
    const icon = document.getElementById('overlayIcon');
    const icons = {
        success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>',
        error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
        pending: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>'
    };

    icon.className = `overlay-icon ${type}`;
    icon.innerHTML = icons[type] || '';
    document.getElementById('overlayTitle').textContent = title;
    document.getElementById('overlayMessage').textContent = message;
    overlay.classList.remove('hidden');
}

function showEmptyCheckout(message) {
    document.querySelector('.checkout-wrapper').innerHTML = `
        <div class="empty-checkout">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="9" cy="21" r="1"></circle>
                <circle cx="20" cy="21" r="1"></circle>
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            <h2>${message}</h2>
            <a href="bichinho-ansiedade.html#comprar">voltar ao produto</a>
        </div>
    `;
}
