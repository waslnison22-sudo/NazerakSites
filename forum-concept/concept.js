(() => {
  "use strict";

  const menuButton = document.querySelector(".mobile-menu");
  const mobileNav = document.querySelector("#mobile-nav");

  if (menuButton && mobileNav) {
    const closeMenu = () => {
      menuButton.setAttribute("aria-expanded", "false");
      mobileNav.hidden = true;
    };

    menuButton.addEventListener("click", () => {
      const isOpen = menuButton.getAttribute("aria-expanded") === "true";
      menuButton.setAttribute("aria-expanded", String(!isOpen));
      mobileNav.hidden = isOpen;
    });

    mobileNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeMenu);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });

    document.addEventListener("click", (event) => {
      if (!mobileNav.hidden && !mobileNav.contains(event.target) && !menuButton.contains(event.target)) {
        closeMenu();
      }
    });
  }

  const search = document.querySelector("#forum-search");
  const clearButton = document.querySelector("#clear-search");
  const status = document.querySelector("#search-status");
  const rows = Array.from(document.querySelectorAll(".board-row"));
  const groups = Array.from(document.querySelectorAll(".forum-group"));
  const emptyState = document.createElement("div");
  emptyState.className = "no-results";
  emptyState.hidden = true;
  emptyState.textContent = "Совпадений нет. Попробуй другое слово или очисти поиск.";
  document.querySelector(".concept-note")?.before(emptyState);

  if (!search || !status || rows.length === 0) return;

  const normalise = (value) => value
    .toLocaleLowerCase("ru")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  const updateSearch = () => {
    const term = normalise(search.value);
    let visibleRows = 0;

    rows.forEach((row) => {
      const haystack = normalise(row.textContent + " " + (row.dataset.search || ""));
      const matches = !term || haystack.includes(term);
      row.hidden = !matches;
      if (matches) visibleRows += 1;
    });

    groups.forEach((group) => {
      group.hidden = !Array.from(group.querySelectorAll(".board-row")).some((row) => !row.hidden);
    });

    clearButton.hidden = search.value.length === 0;
    emptyState.hidden = !(term && visibleRows === 0);

    if (!term) {
      status.textContent = "Начни вводить текст — список разделов отфильтруется.";
    } else if (visibleRows === 0) {
      status.textContent = "Ничего не найдено. Попробуй другое слово.";
    } else {
      status.textContent = "Найдено подразделов: " + visibleRows + ".";
    }
  };

  search.addEventListener("input", updateSearch);

  clearButton.addEventListener("click", () => {
    search.value = "";
    updateSearch();
    search.focus();
  });

  document.querySelector(".search-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
  });

  const topicDialog = document.querySelector(".topic-dialog");
  const openTopic = document.querySelector("[data-open-topic]");
  const closeTopicButtons = Array.from(document.querySelectorAll("[data-close-topic]"));
  const topicForm = document.querySelector(".topic-demo-form");
  const topicNotice = document.querySelector("[data-topic-notice]");

  if (topicDialog && typeof topicDialog.showModal === "function") {
    openTopic?.addEventListener("click", () => topicDialog.showModal());
    closeTopicButtons.forEach((button) => button.addEventListener("click", () => topicDialog.close()));
    topicDialog.addEventListener("click", (event) => {
      if (event.target === topicDialog) topicDialog.close();
    });
    topicForm?.addEventListener("submit", (event) => {
      event.preventDefault();
      if (topicNotice) {
        topicNotice.textContent = "Форма заполнена корректно. Публикация отключена: данные никуда не отправляются.";
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && topicDialog.open) topicDialog.close();
    });
  } else if (openTopic) {
    openTopic.addEventListener("click", () => {
      const note = document.querySelector(".concept-note");
      note?.scrollIntoView({ block: "center" });
    });
  }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.body.classList.add("reduce-motion");
  }

  updateSearch();
})();