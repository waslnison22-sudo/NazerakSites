(() => {
  "use strict";

  const state = { client: null, topics: [], q: "", ready: false };
  const qs = (selector, root = document) => root.querySelector(selector);
  const safeUrl = (value) => {
    try {
      const url = new URL(String(value || ""));
      return /^https?:$/.test(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  };
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));
  const waitForClient = async () => {
    for (let i = 0; i < 100; i += 1) {
      if (window.NaZerakAuth?.client) return window.NaZerakAuth.client;
      await new Promise((resolve) => window.setTimeout(resolve, 100));
    }
    return null;
  };
  const withTimeout = async (promise, ms) => {
    let timer;
    try {
      return await Promise.race([
        promise,
        new Promise((_, reject) => {
          timer = window.setTimeout(() => reject(new Error("Поиск форума превысил 8 секунд.")), ms);
        })
      ]);
    } finally {
      window.clearTimeout(timer);
    }
  };

  const render = () => {
    if (!state.ready) return;
    const root = qs("[data-search-results]");
    const empty = qs("[data-search-empty]");
    const query = state.q.trim().toLowerCase();
    const emptyTitle = qs("[data-search-empty] h3");
    const emptyCopy = qs("[data-search-empty] p");
    const items = !query ? [] : state.topics.filter((topic) =>
      [topic.title, topic.body, topic.category_name, topic.author_name]
        .join(" ").toLowerCase().includes(query)
    );

    qs("[data-search-title]").textContent = query
      ? 'Результаты для «' + state.q.trim() + '»'
      : "Результаты";
    qs("[data-search-count]").textContent =
      items.length + " " + (items.length === 1 ? "тема" : items.length < 5 ? "темы" : "тем");

    if (!items.length) {
      root.hidden = true;
      empty.hidden = false;
      if (emptyTitle) emptyTitle.textContent = query ? "Совпадений не найдено." : "Введите запрос.";
      if (emptyCopy) emptyCopy.textContent = query
        ? "Попробуй изменить формулировку или проверить написание."
        : "Поиск находит темы по названию, содержимому, разделу и автору.";
      return;
    }

    root.hidden = false;
    empty.hidden = true;
    root.innerHTML = items.map((topic) => {
      const avatar = safeUrl(topic.author_avatar_url);
      const media = avatar
        ? '<img src="' + escapeHtml(avatar) + '" alt="">'
        : escapeHtml((topic.author_name || "N").slice(0, 1).toUpperCase());
      return '<article class="forum-topic-row">' +
        '<a class="forum-topic-row__open" href="/forum/topic/' + encodeURIComponent(topic.id) + '">' +
          '<div class="forum-topic-row__mark">' + (topic.is_pinned ? "★" : "›") + '</div>' +
          '<div class="forum-topic-row__copy"><div class="forum-topic-row__tags">' +
            '<span>' + escapeHtml(topic.category_name) + '</span>' +
            (topic.prefix ? '<span class="forum-topic-row__prefix">' + escapeHtml(topic.prefix) + '</span>' : "") +
          '</div><h3>' + escapeHtml(topic.title) + '</h3><p>' +
            escapeHtml(String(topic.body || "").replace(/\s+/g, " ").slice(0, 180)) +
          '</p></div></a><div class="forum-topic-row__footer">' +
          '<a class="forum-user-link forum-role--' + escapeHtml(topic.primary_role_slug || "player") +
          '" data-forum-user="' + escapeHtml(topic.author_public_id || "") +
          '" href="/user/' + encodeURIComponent(topic.author_public_id || "") + '">' +
            '<span class="forum-avatar forum-avatar--small">' + media + '</span>' +
            '<span>' + escapeHtml(topic.author_name || "Игрок NaZerak") + '</span>' +
            '<span class="forum-user-link__role">' + escapeHtml(topic.primary_role_badge || "•") + " " +
              escapeHtml(topic.primary_role_name || "Игрок") + '</span></a>' +
          '<div class="forum-topic-row__activity"><strong>' + Number(topic.reply_count || 0) +
            '</strong><span>ответов</span></div></div></article>';
    }).join("");
  };

  const init = async () => {
    const error = qs("[data-search-message]");
    const form = qs("[data-forum-search-form]");
    const input = qs("#global-forum-search");
    const clear = qs("[data-forum-search-clear]");

    // Attach immediately. A slow auth bootstrap or topic query must not leave
    // the visible search form submitting through the browser's default GET.
    const syncUrl = (value) => {
      const url = new URL(window.location.href);
      if (value.trim()) url.searchParams.set("q", value.trim());
      else url.searchParams.delete("q");
      window.history.replaceState({}, "", url);
    };

    const initialQuery = new URLSearchParams(window.location.search).get("q") || "";
    state.q = initialQuery;
    if (input) input.value = initialQuery;
    if (clear) clear.hidden = !initialQuery;

    input?.addEventListener("input", () => {
      state.q = input.value || "";
      if (clear) clear.hidden = !state.q;
      render();
    });

    form?.addEventListener("submit", (event) => {
      event.preventDefault();
      state.q = input?.value || "";
      if (clear) clear.hidden = !state.q;
      syncUrl(state.q);
      render();
    });

    clear?.addEventListener("click", () => {
      state.q = "";
      if (input) {
        input.value = "";
        input.focus();
      }
      if (clear) clear.hidden = true;
      syncUrl("");
      render();
    });

    if (window.NaZerakAuth?.ready) await window.NaZerakAuth.ready;
    state.client = window.NaZerakAuth?.client || await waitForClient();
    if (!state.client) {
      document.documentElement.dataset.forumSearchReady = "error";
      if (error) {
        error.textContent = "Не удалось подключиться к данным форума. Обнови страницу и попробуй снова.";
        error.hidden = false;
      }
      return;
    }

    try {
      const result = await withTimeout(
        state.client
          .from("forum_topic_list")
          .select("id,title,body,category_name,author_public_id,author_name,author_avatar_url,primary_role_slug,primary_role_name,primary_role_badge,prefix,is_pinned,last_post_at,reply_count")
          .order("last_post_at", { ascending: false })
          .limit(200),
        8000
      );
      if (result.error) throw new Error(result.error.message || "Не удалось загрузить темы.");
      state.topics = result.data || [];
      state.ready = true;
      document.documentElement.dataset.forumSearchReady = "true";
      if (error) error.hidden = true;
      // The user may have typed, submitted or cleared a query while data loaded.
      state.q = input ? input.value : (new URLSearchParams(window.location.search).get("q") || "");
      if (clear) clear.hidden = !state.q;
      render();
    } catch (caughtError) {
      document.documentElement.dataset.forumSearchReady = "error";
      if (error) {
        error.textContent = caughtError instanceof Error
          ? caughtError.message
          : "Не удалось загрузить темы.";
        error.hidden = false;
      }
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => void init(), { once: true });
  } else {
    void init();
  }
})();
