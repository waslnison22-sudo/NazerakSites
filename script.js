(() => {
  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  const progress = document.querySelector(".scroll-progress span");
  const cursor = document.querySelector(".cursor-light");
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("site-nav");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouch = window.matchMedia("(pointer: coarse)").matches;

  const updateProgress = () => {
    if (!progress) return;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const percent = max > 0 ? (window.scrollY / max) * 100 : 0;
    progress.style.width = percent + "%";
  };

  updateProgress();
  window.addEventListener("scroll", updateProgress, { passive: true });

  if (toggle && nav) {
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        nav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  const sections = [...document.querySelectorAll("main section[id]")];
  const navLinks = [...document.querySelectorAll(".nav a")];

  if ("IntersectionObserver" in window && sections.length && navLinks.length) {
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((link) => {
          link.classList.toggle(
            "is-active",
            link.getAttribute("href") === "#" + entry.target.id
          );
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

  if (!reduceMotion && !isTouch && cursor) {
    let cursorX = window.innerWidth / 2;
    let cursorY = window.innerHeight / 2;
    let lightX = cursorX;
    let lightY = cursorY;

    document.addEventListener("pointermove", (event) => {
      cursorX = event.clientX;
      cursorY = event.clientY;
      cursor.classList.add("is-active");
    }, { passive: true });

    document.addEventListener("pointerleave", () => cursor.classList.remove("is-active"));

    const animateCursor = () => {
      lightX += (cursorX - lightX) * 0.085;
      lightY += (cursorY - lightY) * 0.085;
      cursor.style.left = lightX + "px";
      cursor.style.top = lightY + "px";
      requestAnimationFrame(animateCursor);
    };

    requestAnimationFrame(animateCursor);
  }

  const parallaxItems = [...document.querySelectorAll("[data-parallax]")];

  if (!reduceMotion && !isTouch && parallaxItems.length) {
    let targetY = 0;
    let currentY = 0;

    const updateParallaxTarget = () => {
      targetY = Math.min(window.scrollY * 0.16, 80);
    };

    const renderParallax = () => {
      currentY += (targetY - currentY) * 0.07;
      parallaxItems.forEach((item) => {
        const amount = Number(item.dataset.parallax || 0.1);
        item.style.translate = `0 ${(-currentY * amount).toFixed(2)}px`;
      });
      requestAnimationFrame(renderParallax);
    };

    updateParallaxTarget();
    window.addEventListener("scroll", updateParallaxTarget, { passive: true });
    requestAnimationFrame(renderParallax);
  }

  if (!reduceMotion && !isTouch) {
    document.querySelectorAll(".magnetic").forEach((button) => {
      button.addEventListener("pointermove", (event) => {
        const rect = button.getBoundingClientRect();
        const x = event.clientX - rect.left - rect.width / 2;
        const y = event.clientY - rect.top - rect.height / 2;
        button.style.transform = `translate(${(x * 0.10).toFixed(2)}px, ${(y * 0.10).toFixed(2)}px)`;
      });

      button.addEventListener("pointerleave", () => {
        button.style.transform = "";
      });
    });
  }

  const hero = document.querySelector(".hero");
  if (hero && !reduceMotion && !isTouch) {
    const title = document.querySelector(".hero-title");

    hero.addEventListener("pointermove", (event) => {
      const rect = hero.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;

      if (title) {
        title.style.transform = `translate(${(px * 8).toFixed(2)}px, ${(py * 5).toFixed(2)}px)`;
      }
    });

    hero.addEventListener("pointerleave", () => {
      if (title) title.style.transform = "";
    });
  }
  document.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
      const value = button.getAttribute("data-copy");
      if (!value) return;

      const label = button.querySelector("span");
      const originalLabel = label ? label.textContent : "Копировать";

      try {
        await navigator.clipboard.writeText(value);
        button.classList.add("is-copied");
        if (label) label.textContent = "Скопировано";
      } catch {
        const fallback = document.createElement("textarea");
        fallback.value = value;
        fallback.setAttribute("readonly", "");
        fallback.style.position = "fixed";
        fallback.style.opacity = "0";
        document.body.appendChild(fallback);
        fallback.select();
        try { document.execCommand("copy"); } catch {}
        fallback.remove();
        button.classList.add("is-copied");
        if (label) label.textContent = "Скопировано";
      }

      window.setTimeout(() => {
        button.classList.remove("is-copied");
        if (label) label.textContent = originalLabel;
      }, 1800);
    });
  });

})();
