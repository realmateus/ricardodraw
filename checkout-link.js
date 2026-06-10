function updateCheckoutLink() {
    let items = [];

    try {
        items = JSON.parse(localStorage.getItem("ricardodraw_checkout_items")) || [];
    } catch {
        items = [];
    }

    const quantity = items.reduce((total, item) => total + Number(item.quantity || 0), 0);
    document.querySelectorAll(".cart-count").forEach((badge) => {
        badge.textContent = quantity;
        badge.classList.toggle("visible", quantity > 0);
    });
}

document.addEventListener("DOMContentLoaded", updateCheckoutLink);
window.addEventListener("storage", (event) => {
    if (event.key === "ricardodraw_checkout_items") updateCheckoutLink();
});
