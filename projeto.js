const projectHeader = document.querySelector(".project-header");
const revealItems = document.querySelectorAll(".reveal");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const updateProjectHeader = () => {
    projectHeader?.classList.toggle("scrolled", window.scrollY > 24);
};

updateProjectHeader();
window.addEventListener("scroll", updateProjectHeader, { passive: true });

revealItems.forEach((item, index) => {
    item.style.setProperty("--reveal-delay", `${Math.min(index % 4, 3) * 80}ms`);
});

if ("IntersectionObserver" in window && !reducedMotion) {
    const observer = new IntersectionObserver((entries, currentObserver) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-visible");
            currentObserver.unobserve(entry.target);
        });
    }, {
        rootMargin: "0px 0px -10% 0px",
        threshold: 0.1
    });

    revealItems.forEach((item) => observer.observe(item));
} else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
}

const lightbox = document.getElementById("projectLightbox");
const lightboxImage = document.getElementById("projectLightboxImage");
const closeButton = document.getElementById("projectLightboxClose");
let lastTrigger = null;

const closeLightbox = () => {
    lightbox?.classList.remove("is-open");
    document.body.style.overflow = "";
    lastTrigger?.focus();
};

document.querySelectorAll(".project-bento-card").forEach((card) => {
    card.addEventListener("click", () => {
        const image = card.querySelector("img");
        if (!lightbox || !lightboxImage || !image) return;

        lastTrigger = card;
        lightboxImage.src = image.src;
        lightboxImage.alt = image.alt;
        lightbox.classList.add("is-open");
        document.body.style.overflow = "hidden";
        closeButton?.focus();
    });
});

closeButton?.addEventListener("click", closeLightbox);
lightbox?.addEventListener("click", (event) => {
    if (event.target === lightbox) closeLightbox();
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && lightbox?.classList.contains("is-open")) {
        closeLightbox();
    }
});

const year = document.getElementById("currentYear");
if (year) year.textContent = new Date().getFullYear();
