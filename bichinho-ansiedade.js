let productShippingOptions = [];
let selectedProductShippingIndex = -1;
let productShippingCep = "";

document.addEventListener("DOMContentLoaded", () => {
    initPageEntry();
    initHeader();
    initRevealAnimations();
    initSectionNavigation();
    initLightbox();
    initShippingCalculator();
    initDirectCheckout();

    const year = document.getElementById("currentYear");
    if (year) year.textContent = new Date().getFullYear();
});

function initDirectCheckout() {
    const button = document.querySelector(".direct-checkout-btn");
    if (!button) return;

    button.addEventListener("click", () => {
        const selectedShipping = productShippingOptions[selectedProductShippingIndex];
        if (!selectedShipping || productShippingCep.length !== 8) return;

        const item = {
            id: button.dataset.id,
            name: button.dataset.name,
            price: Number(button.dataset.price),
            image: button.dataset.image,
            quantity: 1
        };

        localStorage.setItem("ricardodraw_checkout_items", JSON.stringify([item]));
        localStorage.setItem("ricardodraw_checkout_shipping", JSON.stringify({
            cep: productShippingCep,
            selectedIndex: selectedProductShippingIndex,
            options: productShippingOptions
        }));
        window.location.href = "checkout.html";
    });
}

function initPageEntry() {
    requestAnimationFrame(() => document.body.classList.add("is-loaded"));
}

function initHeader() {
    const header = document.querySelector(".site-header");
    if (!header) return;

    const update = () => header.classList.toggle("scrolled", window.scrollY > 24);
    update();
    window.addEventListener("scroll", update, { passive: true });
}

function initRevealAnimations() {
    const items = document.querySelectorAll(".reveal");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    items.forEach((item) => {
        if (item.dataset.revealDelay) {
            item.style.setProperty("--reveal-delay", `${item.dataset.revealDelay}ms`);
        }
    });

    if (!("IntersectionObserver" in window) || reducedMotion) {
        items.forEach((item) => item.classList.add("is-visible"));
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
        });
    }, {
        rootMargin: "0px 0px -12% 0px",
        threshold: 0.12
    });

    items.forEach((item) => observer.observe(item));
}

function initSectionNavigation() {
    const links = document.querySelectorAll("[data-section-link]");
    const sections = document.querySelectorAll("#inicio, #o-livro, #por-dentro");
    if (!("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver((entries) => {
        const current = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!current) return;

        links.forEach((link) => {
            if (link.dataset.sectionLink === current.target.id) {
                link.setAttribute("aria-current", "true");
            } else {
                link.removeAttribute("aria-current");
            }
        });
    }, {
        rootMargin: "-25% 0px -55% 0px",
        threshold: [0.05, 0.25, 0.5]
    });

    sections.forEach((section) => observer.observe(section));
}

function initLightbox() {
    const triggers = [...document.querySelectorAll(".gallery-trigger")];
    const lightbox = document.getElementById("lightbox");
    const image = document.getElementById("lightboxImage");
    const closeButton = document.getElementById("lightboxClose");
    const previousButton = document.getElementById("lightboxPrev");
    const nextButton = document.getElementById("lightboxNext");

    if (!triggers.length || !lightbox || !image) return;

    const images = triggers.map((trigger) => ({
        src: trigger.dataset.src,
        alt: trigger.dataset.alt
    }));
    let currentIndex = 0;
    let lastTrigger = null;

    const showImage = (index) => {
        currentIndex = (index + images.length) % images.length;
        image.src = images[currentIndex].src;
        image.alt = images[currentIndex].alt;
    };

    const open = (index, trigger) => {
        lastTrigger = trigger;
        showImage(index);
        lightbox.classList.remove("hidden");
        requestAnimationFrame(() => lightbox.classList.add("active"));
        document.body.style.overflow = "hidden";
        closeButton.focus();
    };

    const close = () => {
        lightbox.classList.remove("active");
        document.body.style.overflow = "";
        window.setTimeout(() => lightbox.classList.add("hidden"), 250);
        lastTrigger?.focus();
    };

    triggers.forEach((trigger, index) => {
        trigger.addEventListener("click", () => open(index, trigger));
    });

    closeButton.addEventListener("click", close);
    previousButton.addEventListener("click", () => showImage(currentIndex - 1));
    nextButton.addEventListener("click", () => showImage(currentIndex + 1));

    lightbox.addEventListener("click", (event) => {
        if (event.target === lightbox) close();
    });

    document.addEventListener("keydown", (event) => {
        if (!lightbox.classList.contains("active")) return;
        if (event.key === "Escape") close();
        if (event.key === "ArrowLeft") showImage(currentIndex - 1);
        if (event.key === "ArrowRight") showImage(currentIndex + 1);
    });
}

function initShippingCalculator() {
    const cepInput = document.getElementById("cepInput");
    const calculateButton = document.getElementById("calcShippingBtn");
    const loading = document.getElementById("shippingLoading");
    const error = document.getElementById("shippingError");
    const results = document.getElementById("shippingResults");
    const checkoutButton = document.querySelector(".direct-checkout-btn");
    const checkoutLabel = checkoutButton?.querySelector(".direct-checkout-label");

    if (!cepInput || !calculateButton || !loading || !error || !results) return;

    cepInput.addEventListener("input", (event) => {
        let value = event.target.value.replace(/\D/g, "").slice(0, 8);
        if (value.length > 5) value = `${value.slice(0, 5)}-${value.slice(5)}`;
        event.target.value = value;
        resetSelection();
    });

    cepInput.addEventListener("keydown", (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        calculate();
    });

    calculateButton.addEventListener("click", calculate);

    async function calculate() {
        const postalCode = cepInput.value.replace(/\D/g, "");
        if (postalCode.length !== 8) {
            showError("Insira um CEP válido com 8 dígitos.");
            return;
        }

        resetSelection();
        loading.classList.remove("hidden");
        error.classList.add("hidden");
        results.classList.add("hidden");
        calculateButton.disabled = true;

        try {
            const response = await fetch("/api/shipping/calculate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ postal_code: postalCode })
            });
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Erro ao calcular frete.");
            }

            const options = filterCorreiosShippingOptions(data);
            if (!options.length) {
                showError("Nenhuma opção de PAC ou SEDEX encontrada para este CEP.");
                return;
            }

            productShippingCep = postalCode;
            productShippingOptions = options.map(normalizeShippingOption);
            selectedProductShippingIndex = -1;
            renderResults(options);
        } catch (requestError) {
            showError(requestError.message || "Erro ao calcular frete. Tente novamente.");
        } finally {
            loading.classList.add("hidden");
            calculateButton.disabled = false;
        }
    }

    function showError(message) {
        resetSelection();
        loading.classList.add("hidden");
        results.classList.add("hidden");
        error.textContent = message;
        error.classList.remove("hidden");
        calculateButton.disabled = false;
    }

    function renderResults(options) {
        error.classList.add("hidden");
        results.replaceChildren(...options.map((option, index) => {
            const element = createShippingOption(option, index);
            element.addEventListener("click", () => selectShipping(index));
            return element;
        }));
        results.classList.remove("hidden");
    }

    function selectShipping(index) {
        if (!productShippingOptions[index]) return;

        selectedProductShippingIndex = index;
        results.querySelectorAll(".shipping-option").forEach((option, optionIndex) => {
            const selected = optionIndex === index;
            option.classList.toggle("selected", selected);
            option.setAttribute("aria-pressed", String(selected));
        });

        if (checkoutButton) checkoutButton.disabled = false;
        if (checkoutLabel) checkoutLabel.textContent = "comprar agora";
    }

    function resetSelection() {
        productShippingOptions = [];
        selectedProductShippingIndex = -1;
        productShippingCep = "";
        results.replaceChildren();
        results.classList.add("hidden");
        if (checkoutButton) checkoutButton.disabled = true;
        if (checkoutLabel) checkoutLabel.textContent = "comprar agora";
    }
}

function normalizeShippingOption(option) {
    return {
        name: option.name || "Envio pelos Correios",
        company: option.company || { name: "Correios" },
        price: option.custom_price || option.price,
        delivery_range: option.delivery_range,
        delivery_time: option.delivery_time,
        quote_token: option.quote_token
    };
}

function createShippingOption(option, index) {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "shipping-option";
    row.setAttribute("aria-pressed", "false");
    row.setAttribute("aria-label", `Selecionar ${option.name || "envio pelos Correios"}`);

    const info = document.createElement("div");
    info.className = "shipping-option-info";

    const selector = document.createElement("span");
    selector.className = "shipping-option-selector";
    selector.textContent = String(index + 1).padStart(2, "0");

    const name = document.createElement("span");
    name.className = "shipping-option-name";
    name.textContent = option.name || "Envio pelos Correios";

    const company = document.createElement("span");
    company.className = "shipping-option-company";
    company.textContent = option.company?.name || "Correios";

    const details = document.createElement("div");
    details.className = "shipping-option-details";

    const price = document.createElement("span");
    price.className = "shipping-option-price";
    price.textContent = Number(option.custom_price || option.price).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    }).replace(/^r\$/i, "R$");

    const delivery = document.createElement("span");
    delivery.className = "shipping-option-time";
    delivery.textContent = formatDeliveryTime(option);

    info.append(name, company);
    details.append(price);
    if (delivery.textContent) details.append(delivery);
    row.append(selector, info, details);
    return row;
}

function formatDeliveryTime(option) {
    const minimum = option.delivery_range?.min || option.delivery_time;
    const maximum = option.delivery_range?.max || option.delivery_time;

    if (minimum && maximum && minimum !== maximum) {
        return `${minimum} a ${maximum} dias úteis`;
    }
    return minimum ? `${minimum} dias úteis` : "";
}
