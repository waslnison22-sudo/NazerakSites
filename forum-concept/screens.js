(() => {
  "use strict";
  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const toast = (message) => {
    const node = qs("[data-toast]");
    if (!node) return;
    node.textContent = message;
    node.hidden = false;
    window.clearTimeout(toast.timer);
    toast.timer = window.setTimeout(() => { node.hidden = true; }, 2600);
  };
  const setScreen = (name, updateHash = true) => {
    const panels = qsa("[data-screen]");
    const tabs = qsa("[data-screen-tab]");
    const next = panels.find((panel) => panel.dataset.screen === name) ? name : "category";
    panels.forEach((panel) => { panel.hidden = panel.dataset.screen !== next; });
    tabs.forEach((tab) => {
      const active = tab.dataset.screenTab === next;
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    if (updateHash) history.replaceState(null, "", "#" + next);
    if (document.activeElement && document.activeElement.matches("[data-screen-tab]")) {
      qs('[data-screen-tab="' + next + '"]')?.focus();
    }
  };
  qsa("[data-screen-tab]").forEach((tab) => tab.addEventListener("click", () => setScreen(tab.dataset.screenTab)));
  qsa("[data-go-screen]").forEach((link) => link.addEventListener("click", (event) => {
    event.preventDefault();
    setScreen(link.dataset.goScreen);
    window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }));
  window.addEventListener("hashchange", () => setScreen(location.hash.slice(1), false));
  setScreen(location.hash.slice(1) || "category", false);

  const categoryFilter = qs("[data-topic-filter]");
  const categoryRows = qsa(".topic-row");
  const categoryEmpty = qs("[data-category-empty]");
  const categoryCount = qs("[data-category-count]");
  const applyCategory = () => {
    const term = (categoryFilter?.value || "").trim().toLocaleLowerCase("ru");
    let count = 0;
    categoryRows.forEach((row) => {
      const visible = !term || (row.dataset.title || "").toLocaleLowerCase("ru").includes(term);
      row.hidden = !visible;
      if (visible) count += 1;
    });
    if (categoryEmpty) categoryEmpty.hidden = count !== 0;
    if (categoryCount) categoryCount.textContent = count + " демонстрационных " + (count === 1 ? "тема" : "тем");
  };
  categoryFilter?.addEventListener("input", applyCategory);
  qs("[data-reset-category]")?.addEventListener("click", () => { categoryFilter.value = ""; applyCategory(); categoryFilter.focus(); });
  qs("[data-topic-sort]")?.addEventListener("change", (event) => {
    const rows = qsa(".topic-row", qs("[data-category-list]"));
    const mode = event.target.value;
    rows.sort((a, b) => mode === "title" ? a.dataset.title.localeCompare(b.dataset.title, "ru") : mode === "replies" ? Number(b.dataset.replies) - Number(a.dataset.replies) : categoryRows.indexOf(a) - categoryRows.indexOf(b));
    rows.forEach((row) => qs("[data-category-list]").append(row));
  });

  qsa("[data-reaction]").forEach((button) => button.addEventListener("click", () => {
    const pressed = button.getAttribute("aria-pressed") === "true";
    button.setAttribute("aria-pressed", String(!pressed));
    const count = qs("[data-reaction-count]", button);
    if (count) {
      const n = Number(count.textContent || 0);
      count.textContent = String(Math.max(0, n + (pressed ? -1 : 1)));
    }
  }));
  qs("[data-bookmark]")?.addEventListener("click", (event) => {
    const button = event.currentTarget;
    const active = button.getAttribute("aria-pressed") !== "true";
    button.setAttribute("aria-pressed", String(active));
    button.textContent = active ? "★ В закладках · демо" : "☆ В закладки";
    toast(active ? "Добавлено в демонстрационные закладки" : "Убрано из демонстрационных закладок");
  });
  qsa('[data-demo-action="quote"]').forEach((button) => button.addEventListener("click", () => {
    const area = qs("[data-reply-body]");
    if (!area) return;
    area.value = "Цитата из демонстрационного сообщения:\n> В рабочей версии здесь будет исходный текст.\n\n";
    area.focus();
    qs("[data-reply-status]").textContent = "Цитата вставлена только в локальное поле. Отправка недоступна.";
  }));
  qsa('[data-demo-action="reply"], [data-demo-action="report"], [data-demo-action="create-topic"], [data-demo-action="profile-follow"]').forEach((button) => button.addEventListener("click", () => {
    const labels = {
      reply: "Ответ не отправлен: публикация отключена в прототипе.",
      report: "Форма жалобы появится после проверки авторизации и прав.",
      "create-topic": "Создание темы показано только как макет. Для настоящей публикации нужен вход и доступный раздел.",
      "profile-follow": "Подписка не сохранена: демо не подключено к данным."
    };
    toast(labels[button.dataset.demoAction] || "Действие доступно только в демонстрации.");
    if (button.dataset.demoAction === "reply" && qs("[data-reply-status]")) qs("[data-reply-status]").textContent = labels.reply;
  }));
  qsa("[data-topic-anchor]").forEach((link) => link.addEventListener("click", (event) => {
    event.preventDefault();
    const area = link.dataset.topicAnchor === "reply" ? qs("[data-reply-body]") : qs(".post-card");
    area?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (link.dataset.topicAnchor === "reply") area?.focus();
  }));

  const searchForm = qs("[data-search-form]");
  const globalSearch = qs("[data-global-search]");
  const searchItems = qsa("[data-search-item]");
  const applySearch = () => {
    const term = (globalSearch?.value || "").trim().toLocaleLowerCase("ru");
    const category = qs("[data-search-category]")?.value || "";
    const titlesOnly = Boolean(qs("[data-search-title-only]")?.checked);
    const mode = qs("[data-search-sort]")?.value || "relevance";
    let visible = 0;
    searchItems.forEach((item) => {
      const source = titlesOnly ? item.dataset.title : [item.dataset.title, item.dataset.body, item.dataset.author].join(" ");
      const match = (!term || source.toLocaleLowerCase("ru").includes(term)) && (!category || item.dataset.section === category);
      item.hidden = !match;
      if (match) visible += 1;
    });
    const list = qs("[data-search-results]");
    const empty = qs("[data-search-empty]");
    if (list) {
      const matched = searchItems.filter((item) => !item.hidden);
      if (mode === "title") matched.sort((a,b) => a.dataset.title.localeCompare(b.dataset.title, "ru"));
      matched.forEach((item) => list.append(item));
    }
    if (empty) empty.hidden = visible !== 0;
    if (qs("[data-search-total]")) qs("[data-search-total]").textContent = visible + " " + (visible === 1 ? "результат" : "примера");
    if (qs("[data-search-heading]")) qs("[data-search-heading]").textContent = term ? "Результаты для «" + globalSearch.value.trim() + "»" : "Демонстрационные темы";
  };
  searchForm?.addEventListener("submit", (event) => { event.preventDefault(); applySearch(); });
  globalSearch?.addEventListener("input", applySearch);
  qs("[data-search-category]")?.addEventListener("change", applySearch);
  qs("[data-search-sort]")?.addEventListener("change", applySearch);
  qs("[data-search-title-only]")?.addEventListener("change", applySearch);
  qs("[data-reset-search]")?.addEventListener("click", () => {
    globalSearch.value = "";
    qs("[data-search-category]").value = "";
    qs("[data-search-sort]").value = "relevance";
    qs("[data-search-title-only]").checked = false;
    applySearch();
    globalSearch.focus();
  });

  const memberSearch = qs("[data-member-search]");
  const memberRole = qs("[data-member-role]");
  const memberCards = qsa("[data-member]");
  const applyMembers = () => {
    const term = (memberSearch?.value || "").trim().toLocaleLowerCase("ru");
    const role = memberRole?.value || "";
    let count = 0;
    memberCards.forEach((card) => {
      const match = (!term || [card.dataset.name, card.dataset.role, card.dataset.minecraft].join(" ").toLocaleLowerCase("ru").includes(term)) && (!role || card.dataset.role === role);
      card.hidden = !match;
      if (match) count += 1;
    });
    qs("[data-member-count]").textContent = count + " " + (count === 1 ? "пример" : "примеров");
    qs("[data-members-empty]").hidden = count !== 0;
  };
  memberSearch?.addEventListener("input", applyMembers);
  memberRole?.addEventListener("change", applyMembers);
  qs("[data-reset-members]")?.addEventListener("click", () => { memberSearch.value = ""; memberRole.value = ""; applyMembers(); memberSearch.focus(); });

  const setProfileTab = (name) => {
    qsa("[data-profile-tab]").forEach((button) => button.setAttribute("aria-selected", String(button.dataset.profileTab === name)));
    qsa("[data-profile-content]").forEach((section) => { section.hidden = section.dataset.profileContent !== name; });
  };
  qsa("[data-profile-tab]").forEach((button) => button.addEventListener("click", () => setProfileTab(button.dataset.profileTab)));

  const setCabinetTab = (name) => {
    qsa("[data-cabinet-tab]").forEach((link) => link.classList.toggle("is-active", link.dataset.cabinetTab === name));
    qsa("[data-cabinet-panel]").forEach((section) => { section.hidden = section.dataset.cabinetPanel !== name; });
  };
  qsa("[data-cabinet-tab]").forEach((link) => link.addEventListener("click", (event) => {
    event.preventDefault();
    setCabinetTab(link.dataset.cabinetTab);
  }));
  qsa('[data-demo-action="save-profile"], [data-demo-action="save-settings"], [data-demo-action="check-minecraft"], [data-demo-action="auth-preview"]').forEach((button) => button.addEventListener("click", () => {
    const action = button.dataset.demoAction;
    const messages = {
      "save-profile": "Изменения не сохранены: для демо отключена запись данных.",
      "save-settings": "Настройки не сохранены на сервер и не покидают эту страницу.",
      "check-minecraft": "Проверка ника не выполняется без текущего backend.",
      "auth-preview": "Демо-состояние: активная пользовательская сессия отсутствует."
    };
    const selector = { "save-profile":"[data-save-status]", "save-settings":"[data-settings-status]", "auth-preview":"[data-auth-preview]" }[action];
    const target = selector ? qs(selector) : null;
    if (target) target.textContent = messages[action];
    else toast(messages[action]);
  }));

  const accessGate = qs("[data-access-gate]");
  const moderationQueue = qs("[data-moderation-queue]");
  const toggleModerator = () => {
    const showQueue = moderationQueue.hidden;
    moderationQueue.hidden = !showQueue;
    accessGate.hidden = showQueue;
    qsa("[data-toggle-moderator-preview]").forEach((button) => {
      button.setAttribute("aria-pressed", String(showQueue));
      button.textContent = showQueue ? "Вернуться к экрану отказа в доступе" : "Показать авторизованный вид демо";
    });
  };
  qsa("[data-toggle-moderator-preview]").forEach((button) => button.addEventListener("click", toggleModerator));
  const reportFilter = qs("[data-report-filter]");
  const reportRows = qsa("[data-report]");
  const applyReportFilter = () => {
    const filter = reportFilter?.value || "";
    reportRows.forEach((row) => { row.hidden = Boolean(filter) && row.dataset.reportStatus !== filter; });
  };
  reportFilter?.addEventListener("change", applyReportFilter);
  qsa("[data-report-action]").forEach((button) => button.addEventListener("click", () => {
    const row = button.closest("[data-report]");
    const action = button.dataset.reportAction;
    const next = action === "review" ? "На проверке" : action === "resolve" ? "Решена" : "Открыта";
    row.dataset.reportStatus = next;
    const tag = qs(".report-meta .status", row);
    if (tag) {
      tag.textContent = next;
      tag.className = "status " + (next === "Открыта" ? "status--open" : next === "На проверке" ? "status--review" : "status--resolved");
    }
    const priority = qs(".report-priority", row);
    if (priority) {
      priority.textContent = next === "Открыта" ? "!" : next === "На проверке" ? "…" : "✓";
      priority.className = "report-priority " + (next === "Открыта" ? "report-priority--open" : next === "На проверке" ? "report-priority--review" : "report-priority--done");
    }
    if (qs("[data-moderation-status]")) qs("[data-moderation-status]").textContent = "Локальное демо-действие: статус изменён на «" + next + "». Данные не отправлялись.";
    applyReportFilter();
  }));

  applyCategory();
  applySearch();
  applyMembers();
  if (location.hash === "#moderation") qs("[data-toggle-moderator-preview]")?.setAttribute("aria-describedby", "moderation");
})();