(() => {
  "use strict";

  const state = {
    client: null,
    user: null,
    categories: [],
    topics: [],
    search: ""
  };

  const qs = (s, root = document) => root.querySelector(s);
  const qsa = (s, root = document) => Array.from(root.querySelectorAll(s));
  const escapeHtml = (value) => String(value == null ? "" : value).replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
  const safeUrl = (value) => {
    try {
      const url = new URL(String(value || ""));
      return /^https?:$/.test(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  };
  const setState = (label, kind) => {
    const node = qs("[data-forum-state]");
    if (!node) return;
    node.dataset.state = kind || "";
    const text = qs("span", node);
    if (text) text.textContent = label;
  };
  const showMessage = (message, kind = "info") => {
    const node = qs("[data-forum-message]");
    if (!node) return;
    node.textContent = message;
    node.dataset.kind = kind;
    node.hidden = !message;
  };
  const formatDate = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("ru-RU", {day:"2-digit", month:"short", year:"numeric"}).format(date);
  };
  const formatRelative = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    const diff = Math.max(0, Date.now() - date.getTime());
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "только что";
    if (minutes < 60) return minutes + " мин назад";
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + " ч назад";
    const days = Math.floor(hours / 24);
    if (days < 7) return days + " дн назад";
    return formatDate(value);
  };
  const userName = (user) => {
    const meta = user?.user_metadata || {};
    return String(meta.global_name || meta.full_name || meta.name || meta.user_name || meta.preferred_username || "Игрок NaZerak").trim().slice(0, 64) || "Игрок NaZerak";
  };
  const userAvatar = (user) => {
    const meta = user?.user_metadata || {};
    const url = safeUrl(meta.avatar_url || meta.picture);
    if (!url) return null;
    try {
      const host = new URL(url).hostname.toLowerCase();
      return host === "cdn.discordapp.com" || host === "media.discordapp.net" ? url : null;
    } catch {
      return null;
    }
  };
  const waitForClient = async () => {
    for (let i = 0; i < 100; i += 1) {
      const client = window.NaZerakAuth?.client;
      if (client) return client;
      await new Promise((resolve) => window.setTimeout(resolve, 100));
    }
    return null;
  };

  const syncAuthor = async () => {
    if (!state.client || !state.user) return;
    const result = await state.client.from("forum_authors").upsert({
      id: state.user.id,
      display_name: userName(state.user),
      avatar_url: userAvatar(state.user),
      updated_at: new Date().toISOString()
    }, {onConflict:"id"});
    if (result.error) console.warn("[NaZerak Forum] author sync:", result.error.message);
  };

  const topicMatches = (topic) => {
    const query = state.search.trim().toLowerCase();
    if (!query) return true;
    const haystack = [topic.title, topic.body, topic.category_name, topic.author_name].join(" ").toLowerCase();
    return haystack.includes(query);
  };

  const filteredTopics = () => state.topics.filter(topicMatches);

  const categoryCount = (categoryId) => state.topics.filter((topic) => Number(topic.category_id) === Number(categoryId)).length;

  const renderCategoryGroup = (areaSlug) => {
    const root = qs('[data-forum-board-rows="' + areaSlug + '"]');
    if (!root) return;
    const categories = state.categories.filter((category) => category.area_slug === areaSlug);
    root.innerHTML = categories.map((category) => {
      const topics = state.topics.filter((topic) => Number(topic.category_id) === Number(category.id));
      const postCount = topics.reduce((total, topic) => total + 1 + Number(topic.reply_count || 0), 0);
      const latest = [...topics].sort((a,b) => new Date(b.last_post_at).getTime() - new Date(a.last_post_at).getTime())[0];
      const latestHtml = latest
        ? '<a class="forum-board-row__last" href="./topic.html?id=' + encodeURIComponent(latest.id) + '"><strong>' + escapeHtml(latest.title) + '</strong><span>' + escapeHtml(latest.author_name || "Игрок NaZerak") + ' · ' + formatRelative(latest.last_post_at) + '</span></a>'
        : '<span class="forum-board-row__last forum-board-row__last--empty">Нет сообщений</span>';
      return '<article class="forum-board-row">' +
        '<a class="forum-board-row__forum" href="./forum-category.html?slug=' + encodeURIComponent(category.slug) + '">' +
          '<span class="forum-category-card__icon">' + escapeHtml(category.icon || "•") + '</span>' +
          '<span><strong>' + escapeHtml(category.name) + '</strong><small>' + escapeHtml(category.description || "Раздел форума") + '</small></span>' +
        '</a>' +
        '<span class="forum-board-row__stat">' + topics.length + '</span>' +
        '<span class="forum-board-row__stat">' + postCount + '</span>' +
        latestHtml +
      '</article>';
    }).join("");
  };

  const renderCategories = () => {
    renderCategoryGroup("rp");
    renderCategoryGroup("administration");
    const count = qs("[data-forum-board-count]");
    if (count) {
      const n = state.categories.length;
      count.textContent = n + " " + (n === 1 ? "раздел" : n < 5 ? "раздела" : "разделов");
    }
  };

  const renderTopics = () => {
    const root = qs("[data-forum-topic-list]");
    const empty = qs("[data-forum-empty]");
    if (!root || !empty) return;

    const topics = filteredTopics();
    const noun = topics.length === 1 ? "тема" : topics.length < 5 ? "темы" : "тем";
    const count = qs("[data-forum-result-count]");
    if (count) count.textContent = topics.length + " " + noun;

    if (!topics.length) {
      root.hidden = true;
      empty.hidden = false;
      return;
    }

    root.hidden = false;
    empty.hidden = true;
    root.innerHTML = topics.map((topic) => {
      const avatar = safeUrl(topic.author_avatar_url);
      const initial = escapeHtml(String(topic.author_name || "N").slice(0, 1).toUpperCase());
      const avatarHtml = avatar ? '<img src="' + escapeHtml(avatar) + '" alt="">' : initial;
      const publicId = escapeHtml(topic.author_public_id || "");
      const roleSlug = escapeHtml(topic.primary_role_slug || "player");
      const roleName = escapeHtml(topic.primary_role_name || "Игрок");
      const roleBadge = escapeHtml(topic.primary_role_badge || "•");
      const prefix = topic.prefix ? '<span class="forum-topic-row__prefix">' + escapeHtml(topic.prefix) + '</span>' : "";
      const locked = topic.is_locked ? '<span>ЗАКРЫТО</span>' : "";

      return '<article class="forum-topic-row' + (topic.is_pinned ? " is-pinned" : "") + '">' +
        '<a class="forum-topic-row__open" href="./topic.html?id=' + encodeURIComponent(topic.id) + '">' +
          '<div class="forum-topic-row__mark" aria-hidden="true">' + (topic.is_pinned ? "★" : "›") + '</div>' +
          '<div class="forum-topic-row__copy">' +
            '<div class="forum-topic-row__tags"><span>' + escapeHtml(topic.category_name) + '</span>' + prefix + locked + '</div>' +
            '<h3>' + escapeHtml(topic.title) + '</h3>' +
            '<p>' + escapeHtml(String(topic.body || "").replace(/\s+/g, " ").slice(0, 160)) + '</p>' +
          '</div>' +
        '</a>' +
        '<div class="forum-topic-row__footer">' +
          '<a class="forum-user-link forum-role--' + roleSlug + '" data-forum-user="' + publicId + '" href="./forum-user.html?id=' + publicId + '">' +
            '<span class="forum-avatar forum-avatar--small">' + avatarHtml + '</span>' +
            '<span>' + escapeHtml(topic.author_name || "Игрок NaZerak") + '</span>' +
            '<span class="forum-user-link__role">' + roleBadge + " " + roleName + '</span>' +
          '</a>' +
          '<div class="forum-topic-row__activity">' +
            '<strong>' + Number(topic.reply_count || 0) + '</strong><span>ответов</span>' +
            '<time datetime="' + escapeHtml(topic.last_post_at) + '">' + formatRelative(topic.last_post_at) + '</time>' +
          '</div>' +
        '</div>' +
      '</article>';
    }).join("");
  };

  const fillCategorySelect = () => {
    const select = qs("#forum-category");
    if (!select) return;
    const categories = [...state.categories].sort((a, b) => {
      const area = a.area_slug.localeCompare(b.area_slug);
      return area || Number(a.sort_order) - Number(b.sort_order);
    });
    select.innerHTML = categories.map((category) =>
      '<option value="' + category.id + '">' + escapeHtml((category.area_slug === "administration" ? "Администрация · " : "РП-мир · ") + category.name) + '</option>'
    ).join("");
  };

  const clearSearch = () => {
    state.search = "";
    const input = qs("#forum-search");
    if (input) input.value = "";
    qsa("[data-forum-search-clear],[data-forum-search-reset]").forEach((node) => { node.hidden = true; });
    renderTopics();
  };

  const syncSearchControls = () => {
    const hasQuery = !!state.search.trim();
    qsa("[data-forum-search-clear],[data-forum-search-reset]").forEach((node) => { node.hidden = !hasQuery; });
  };

  const loadData = async () => {
    setState("ЗАГРУЗКА", "loading");
    const results = await Promise.all([
      state.client.from("forum_categories").select("id,slug,name,description,sort_order,icon,accent_color,area_slug,posting_mode,posting_mode").order("sort_order", {ascending:true}),
      state.client.from("forum_topic_list").select("id,slug,category_id,category_slug,category_name,area_slug,posting_mode,author_public_id,author_name,author_avatar_url,primary_role_slug,primary_role_name,primary_role_badge,title,body,is_pinned,is_locked,is_archived,prefix,views_count,solution_state,created_at,updated_at,last_post_at,reply_count").order("is_pinned", {ascending:false}).order("last_post_at", {ascending:false}).limit(100),
      state.client.from("forum_community_stats").select("member_count,online_count").maybeSingle()
    ]);
    if (results[0].error) throw new Error(results[0].error.message || "Не удалось загрузить разделы форума.");
    if (results[1].error) throw new Error(results[1].error.message || "Не удалось загрузить темы форума.");
    if (results[2].error) throw new Error(results[2].error.message || "Не удалось загрузить статистику сообщества.");

    state.categories = results[0].data || [];
    state.topics = results[1].data || [];
    const stats = results[2].data || {member_count:0,online_count:0};
    const online = qs("[data-forum-online-count]");
    const members = qs("[data-forum-member-count]");
    if (online) online.textContent = String(Number(stats.online_count || 0));
    if (members) members.textContent = String(Number(stats.member_count || 0));
    renderCategories();
    fillCategorySelect();
    renderTopics();
    setState("ФОРУМ ГОТОВ", "ready");
  };

  const openCreate = () => {
    if (!state.user) {
      showMessage("Чтобы создать тему, войди через Discord в личном кабинете.", "error");
      window.location.href = "./cabinet.html";
      return;
    }
    if (!state.categories.length) {
      showMessage("Сначала добавим хотя бы один раздел форума.", "error");
      return;
    }
    const modal = qs("[data-forum-modal]");
    modal?.showModal();
  };

  const createTopic = async () => {
    const submit = qs("[data-forum-submit]");
    const form = qs("[data-forum-form]");
    if (!state.user || !state.client || !form || !submit || submit.disabled) return;

    const data = new FormData(form);
    const categoryId = Number(data.get("category_id"));
    const title = String(data.get("title") || "").trim();
    const body = String(data.get("body") || "").trim();

    if (!categoryId || title.length < 3 || body.length < 1) {
      showMessage("Заполни раздел, заголовок и сообщение.", "error");
      return;
    }

    submit.disabled = true;
    const original = submit.querySelector("span");
    if (original) original.textContent = "Публикуем…";
    showMessage("");
    await syncAuthor();

    const result = await state.client.from("forum_topics").insert({
      category_id: categoryId,
      author_id: state.user.id,
      title,
      body
    }).select("id").single();

    submit.disabled = false;
    if (original) original.textContent = "Опубликовать";

    if (result.error || !result.data) {
      showMessage(result.error?.message || "Не удалось создать тему.", "error");
      return;
    }

    qs("[data-forum-modal]")?.close();
    form.reset();
    window.location.href = "./topic.html?id=" + encodeURIComponent(result.data.id);
  };

  const init = async () => {
    state.client = await waitForClient();
    if (!state.client) {
      setState("ОШИБКА ДАННЫХ", "error");
      showMessage("Форум не смог подключиться к данным. Обнови страницу и попробуй снова.", "error");
      return;
    }

    const session = await state.client.auth.getSession();
    state.user = session.data?.session?.user || null;
    if (state.user) await syncAuthor();

    qsa("[data-forum-create]").forEach((button) => button.addEventListener("click", openCreate));
    qs("[data-forum-submit]")?.addEventListener("click", createTopic);

    qs("#forum-search")?.addEventListener("input", (event) => {
      state.search = event.target.value || "";
      syncSearchControls();
      renderTopics();
    });

    qs("[data-forum-search-clear]")?.addEventListener("click", clearSearch);
    qs("[data-forum-search-reset]")?.addEventListener("click", clearSearch);
    qs("[data-forum-search-form]")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const query = String(qs("#forum-search")?.value || "").trim();
      if (query) {
        window.location.href = "./forum-search.html?q=" + encodeURIComponent(query);
      } else {
        qs("#forum-search")?.focus();
      }
    });

    await loadData();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => void init(), {once:true});
  } else {
    void init();
  }
})();
