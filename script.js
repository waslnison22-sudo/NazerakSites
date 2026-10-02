(() => {
  "use strict";

  document.documentElement.classList.add("js-ready");

  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  const progress = document.querySelector(".scroll-progress span");
  const toggle = document.querySelector(".nav-toggle");
  const nav =
    document.getElementById("site-nav") ||
    document.getElementById("cabinet-nav");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const updateProgress = () => {
    if (!progress) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const percent = max > 0 ? (window.scrollY / max) * 100 : 0;
    progress.style.width = percent.toFixed(2) + "%";
  };

  updateProgress();
  window.addEventListener("scroll", updateProgress, { passive: true });

  if (toggle && nav) {
    const closeNav = () => {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Открыть меню");
    };

    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeNav);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && nav.classList.contains("is-open")) {
        closeNav();
        toggle.focus();
      }
    });
  }

  const sections = [...document.querySelectorAll("main section[id]")];
  const navLinks = [...document.querySelectorAll(".nav a")];

  if ("IntersectionObserver" in window && sections.length && navLinks.length) {
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((link) => {
          const isActive =
            link.getAttribute("href") === "#" + entry.target.id;
          link.classList.toggle("is-active", isActive);
          if (isActive) link.setAttribute("aria-current", "location");
          else link.removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-35% 0px -55% 0px", threshold: 0 });

    sections.forEach((section) => sectionObserver.observe(section));
  }

  const revealItems = document.querySelectorAll(".reveal");

  if (!("IntersectionObserver" in window) || reduceMotion) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  } else {
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        currentObserver.unobserve(entry.target);
      });
    }, { threshold: 0.13 });

    revealItems.forEach((item) => observer.observe(item));
  }

  const optionalMedia = [
    { selector: '[data-image-slot="hero"]', src: "./assets/images/hero.webp" },
    { selector: '[data-image-slot="world"]', src: "./assets/images/world.webp" },
    { selector: '[data-image-slot="partnership"]', src: "./assets/images/partnership.webp" }
  ];

  optionalMedia.forEach(({ selector, src }) => {
    const slot = document.querySelector(selector);
    if (!slot) return;

    fetch(src, { method: "HEAD", cache: "no-store" })
      .then((response) => {
        if (!response.ok) return null;

        const image = new Image();
        image.className = "media-slot__image";
        image.alt = "";
        image.setAttribute("aria-hidden", "true");
        image.decoding = "async";
        image.addEventListener("load", () => {
          slot.appendChild(image);
          slot.classList.add("has-image");
        }, { once: true });
        image.src = src;
        return image;
      })
      .catch(() => null);
  });

  document.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
      const value = button.getAttribute("data-copy");
      if (!value || button.disabled) return;

      const label = button.querySelector("span");
      const originalLabel =
        label?.textContent || "Копировать";

      const showCopied = () => {
        button.classList.add("is-copied");
        if (label) label.textContent = "Скопировано";
        window.setTimeout(() => {
          button.classList.remove("is-copied");
          if (label) label.textContent = originalLabel;
        }, 1800);
      };

      try {
        if (!navigator.clipboard?.writeText) {
          throw new Error("Clipboard API unavailable");
        }
        await navigator.clipboard.writeText(value);
        showCopied();
      } catch {
        const fallback = document.createElement("textarea");
        fallback.className = "clipboard-fallback";
        fallback.value = value;
        fallback.setAttribute("readonly", "");
        document.body.appendChild(fallback);
        fallback.select();

        let copied = false;
        try {
          copied = document.execCommand("copy");
        } catch {
          copied = false;
        }

        fallback.remove();

        if (copied) {
          showCopied();
        }
      }
    });
  });

  document.querySelectorAll("img").forEach((img) => {
    img.addEventListener("error", () => {
      img.classList.add("is-missing");
      img.setAttribute("aria-hidden", "true");
    });
  });

})();
