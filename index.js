const home = document.body;
const header = document.querySelector(".site-header");
const revealItems = document.querySelectorAll(".reveal");
const sectionLinks = document.querySelectorAll("[data-section-link]");
const observedSections = document.querySelectorAll("#sobre, #projetos");
const logosCarousel = document.querySelector(".logos-carousel");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

requestAnimationFrame(() => {
    home.classList.add("is-loaded");
});

const updateHeader = () => {
    header?.classList.toggle("scrolled", window.scrollY > 24);
};

updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

revealItems.forEach((item) => {
    const delay = item.dataset.revealDelay;
    if (delay) {
        item.style.setProperty("--reveal-delay", `${delay}ms`);
    }
});

if ("IntersectionObserver" in window && !prefersReducedMotion.matches) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
        });
    }, {
        rootMargin: "0px 0px -12% 0px",
        threshold: 0.12
    });

    revealItems.forEach((item) => revealObserver.observe(item));
} else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
}

if (logosCarousel && "IntersectionObserver" in window && !prefersReducedMotion.matches) {
    const logosObserver = new IntersectionObserver((entries, observer) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        logosCarousel.classList.add("is-running");
        observer.disconnect();
    }, {
        threshold: 0.25
    });

    logosObserver.observe(logosCarousel);
} else {
    logosCarousel?.classList.add("is-running");
}

if ("IntersectionObserver" in window) {
    const navigationObserver = new IntersectionObserver((entries) => {
        const visibleSection = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!visibleSection) return;

        sectionLinks.forEach((link) => {
            const isCurrent = link.dataset.sectionLink === visibleSection.target.id;
            if (isCurrent) {
                link.setAttribute("aria-current", "true");
            } else {
                link.removeAttribute("aria-current");
            }
        });
    }, {
        rootMargin: "-25% 0px -55% 0px",
        threshold: [0.05, 0.25, 0.5]
    });

    observedSections.forEach((section) => navigationObserver.observe(section));
}

document.getElementById("currentYear").textContent = new Date().getFullYear();
