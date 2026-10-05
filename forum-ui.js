(() => {
  "use strict";

  const cache = new Map();
  let hoverCard = null;
  let closeTimer = null;
  let openTimer = null;

  const escapeHtml = (value) => String(value == null ? "" : value).replace(/[&<>\"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[c]));

  const withTimeout = async (promise, ms) => { let timer; try { return await Promise.race([promise, new Promise((_, reject) => { timer = window.setTimeout(() => reject(new Error("timeout")), ms); })]); } finally { window.clearTimeout(timer); } };

  const safeUrl = (value) => {
    try {
      const url = new URL(String(value || ""));
      return /^https?:$/.test(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  };

  const ICON_PATHS = {
    info: '<path d="M12 16.5v-5"/><path d="M12 7.8h.01"/><circle cx="12" cy="12" r="8.3"/>',
    book: '<path d="M4 5.2A1.7 1.7 0 0 1 5.7 3.5H11v17H5.7A1.7 1.7 0 0 0 4 22.2z"/><path d="M20 5.2A1.7 1.7 0 0 0 18.3 3.5H13v17h5.3A1.7 1.7 0 0 1 20 22.2z"/>',
    scroll: '<path d="M7 3.8h9.6a2.2 2.2 0 0 1 2.2 2.2V18a2.7 2.7 0 0 1-2.7 2.7H7.4A2.4 2.4 0 0 1 5 18.3V6.2A2.4 2.4 0 0 1 7 3.8z"/><path d="M9.2 8.2h6.6M9.2 11.7h6.6M9.2 15.2h4"/>',
    landmark: '<path d="M4.5 20.4h15"/><path d="M6.2 17.6h11.6"/><path d="M8 17.6V10.4M12 17.6V10.4M16 17.6V10.4"/><path d="M4.6 10.4h14.8"/><path d="M12 3.6 4.6 8.6h14.8z"/>',
    shield: '<path d="M12 3.4 5.4 6v5.7c0 4.3 2.8 7.3 6.6 9 3.8-1.7 6.6-4.7 6.6-9V6z"/><path d="m9.4 12 1.9 1.9 3.5-3.7"/>',
    sword: '<path d="M14.8 3.4h4.8v4.8L10.6 17.2l-4.8-4.8z"/><path d="m8.8 15.4-4.4 4.4"/><path d="m5.6 16.8 1.6 1.6"/>',
    crown: '<path d="M4 18.6h16"/><path d="M4.6 18.6 3.4 8.2l4.8 3.6L12 5.4l3.8 6.4 4.8-3.6-1.2 10.4z"/>',
    scale: '<path d="M12 4.2v16"/><path d="M8 20.4h8"/><path d="M5 8.4h14"/><path d="M5 8.4 2.8 13.4a2.7 2.7 0 0 0 4.4 0z"/><path d="M19 8.4l-2.2 5a2.7 2.7 0 0 0 4.4 0z"/>',
    megaphone: '<path d="M4 10.4v3.6a1.8 1.8 0 0 0 1.8 1.8H8V8.6H5.8A1.8 1.8 0 0 0 4 10.4z"/><path d="M8 8.6 18.8 4.4v15.2L8 15.8z"/><path d="M11.2 16.6v3.4a1.6 1.6 0 0 0 3.2 0v-2.2"/>',
    chat: '<path d="M20.4 12.6a7.6 7.6 0 0 1-8.2 7.5L5 21.4l1.5-4.6a7.5 7.5 0 1 1 13.9-4.2z"/><path d="M9 11.6h.01M12.6 11.6h.01M16.2 11.6h.01"/>',
    users: '<circle cx="9.2" cy="8.4" r="3.4"/><path d="M3.4 19.8a5.9 5.9 0 0 1 11.6 0"/><circle cx="17.4" cy="9.6" r="2.6"/><path d="M16.2 14.6a5.4 5.4 0 0 1 4.6 5.2"/>',
    wrench: '<path d="M14.9 6.3a4.8 4.8 0 0 0 6.1 6.1l-2.1-2.1 1.4-1.4 1.4 1.4a6.6 6.6 0 0 1-8.9-8.9l2.1 2.1-1.4 1.4z" transform="rotate(45 12 12)"/><path d="M13.8 10.2 4.6 19.4a2 2 0 1 0 2.8 2.8l9.2-9.2"/>',
    sparkles: '<path d="M12 3.6l1.9 5.1 5.1 1.9-5.1 1.9L12 17.6l-1.9-5.1-5.1-1.9 5.1-1.9z"/><path d="M18.8 15.6l.8 2.1 2.1.8-2.1.8-.8 2.1-.8-2.1-2.1-.8 2.1-.8z"/>',
    pin: '<path d="M12 21.4v-5.2"/><path d="M8.4 3.8h7.2l-.9 5.4 2.7 3.2H6.6l2.7-3.2z"/><path d="M6.6 12.4h10.8"/>',
    lock: '<rect x="5.2" y="10.4" width="13.6" height="9.8" rx="2.4"/><path d="M8.4 10.4V7.8a3.6 3.6 0 0 1 7.2 0v2.6"/><path d="M12 14.4v2.2"/>',
    reply: '<path d="M9.4 5.4 3.6 11.2l5.8 5.8"/><path d="M3.6 11.2h9.6a6.8 6.8 0 0 1 6.8 6.8v.8"/>',
    search: '<circle cx="11" cy="11" r="6.8"/><path d="m20.4 20.4-4.2-4.2"/>',
    discord: '<circle cx="9" cy="12.2" r="1.15" fill="currentColor" stroke="none"/><circle cx="15" cy="12.2" r="1.15" fill="currentColor" stroke="none"/><path d="M7.6 5.4 6 5.9C4.4 8.3 3.6 11.2 3.8 14.6l2.3 1.9 1.4-1.7a12 12 0 0 0 9 0l1.4 1.7 2.3-1.9c.2-3.4-.6-6.3-2.2-8.7l-1.6-.5-1 1.5a15.5 15.5 0 0 0-6.4 0z"/>'
  };

  const icon = (name, size) => {
    const paths = ICON_PATHS[name] || ICON_PATHS.chat;
    const s = size || 20;
    return '<svg class="forum-icon" viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" stroke="currentColor" ' +
      'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + paths + "</svg>";
  };

  const categoryIcon = (rawName) => {
    const raw = String(rawName || "").trim();
    const key = raw.toLowerCase().replace(/[_\s]+/g, "-").replace(/[^a-z0-9-]/g, "");
    if (ICON_PATHS[key]) return icon(key);
    const legacy = {
      "§": "scroll", "▤": "scroll", "📜": "scroll", "📖": "book",
      "⚖": "scale", "🏛": "landmark", "🛡": "shield", "⚔": "sword", "👑": "crown",
      "📢": "megaphone", "📣": "megaphone", "💬": "chat", "🗨": "chat", "👥": "users", "🧑": "users",
      "🔧": "wrench", "⚙": "wrench", "✨": "sparkles", "⭐": "sparkles", "🌟": "sparkles",
      "📌": "pin", "🔒": "lock", "ℹ": "info", "❕": "info", "🔍": "search", "🎮": "wrench"
    }[raw];
    return icon(legacy || "chat");
  };

  const chip = (name, label) => {
    return '<span class="forum-thread-row__chip" title="' + escapeHtml(label) + '" aria-label="' + escapeHtml(label) + '">' + icon(name, 14) + "</span>";
  };

  const roleBadge = (slug, name) => {
    const safeSlug = String(slug || "player").replace(/[^a-z0-9-]/gi, "");
    return '<span class="forum-role forum-role--' + safeSlug + '" data-role-slug="' + safeSlug + '">' +
      escapeHtml(name || "Игрок") + "</span>";
  };

  const ensureCard = () => {
    if (hoverCard) return hoverCard;
    hoverCard = document.createElement("div");
    hoverCard.className = "forum-user-card";
    hoverCard.setAttribute("role", "dialog");
    hoverCard.setAttribute("aria-label", "Профиль пользователя");
    hoverCard.hidden = true;
    document.body.appendChild(hoverCard);
    hoverCard.addEventListener("mouseenter", () => window.clearTimeout(closeTimer));
    hoverCard.addEventListener("mouseleave", scheduleClose);
    return hoverCard;
  };

  const scheduleClose = () => {
    window.clearTimeout(closeTimer);
    closeTimer = window.setTimeout(() => {
      if (hoverCard) hoverCard.hidden = true;
    }, 180);
  };

  const fetchProfile = async (publicId) => {
    if (!publicId) return null;
    if (cache.has(publicId)) return cache.get(publicId);

    const client = window.NaZerakAuth && window.NaZerakAuth.client;
    if (!client) return null;

    const request = client
      .from("forum_author_directory")
      .select("*")
      .eq("public_id", publicId)
      .maybeSingle();
    const guarded = withTimeout(request, 5000);

    cache.set(publicId, guarded);
    let result;
    try { result = await guarded; } catch { cache.delete(publicId); return null; }

    if (result.error) {
      cache.delete(publicId);
      return null;
    }

    cache.set(publicId, Promise.resolve(result.data));
    return result.data;
  };

  const positionCard = (trigger) => {
    if (!hoverCard || hoverCard.hidden || !trigger?.getBoundingClientRect) return;
    const rect = trigger.getBoundingClientRect();
    const margin = 12;
    const gap = 10;
    const width = Math.min(350, window.innerWidth - margin * 2);
    hoverCard.style.width = width + "px";
    const cardHeight = Math.min(hoverCard.scrollHeight || 260, window.innerHeight - margin * 2);
    const preferredLeft = rect.right - width;
    const left = Math.max(margin, Math.min(preferredLeft, window.innerWidth - width - margin));
    const below = rect.bottom + gap;
    const above = rect.top - cardHeight - gap;
    const top = below + cardHeight <= window.innerHeight - margin
      ? below
      : Math.max(margin, above);
    hoverCard.style.left = Math.round(left) + "px";
    hoverCard.style.top = Math.round(top) + "px";
    hoverCard.style.right = "auto";
  };

  const renderCard = (profile, trigger) => {
    const card = ensureCard();
    if (!profile) {
      card.innerHTML = '<div class="forum-user-card__loading">Профиль недоступен.</div>';
      card.hidden = false;
      positionCard(trigger);
      return;
    }

    const avatar = profile.avatar_url ? '<img src="' + escapeHtml(safeUrl(profile.avatar_url) || "") + '" alt="">' : "";
    const initial = escapeHtml(String(profile.display_name || "N").slice(0, 1).toUpperCase());
    const roles = Array.isArray(profile.role_slugs) ? profile.role_slugs : [];
    const roleHtml = roles.length
      ? roles.slice(0, 3).map((role) => roleBadge(role.slug || role.role_slug || "player", role.name || "Игрок")).join("")
      : roleBadge("player", "Игрок");

    const username = escapeHtml(profile.display_name || "Игрок NaZerak");
    const bio = escapeHtml(profile.bio || "Участник форума NaZerak.");
    const minecraft = profile.minecraft_username ? '<span><strong>' + escapeHtml(profile.minecraft_username) + '</strong> Minecraft</span>' : "";

    card.innerHTML =
      '<div class="forum-user-card__top">' +
        '<div class="forum-user-card__avatar">' + (avatar || initial) + '</div>' +
        '<div class="forum-user-card__identity">' +
          '<a href="./forum-user.html?id=' + encodeURIComponent(profile.public_id) + '" class="forum-user-card__name forum-role--' + escapeHtml(profile.primary_role_slug || "player") + '">' + username + '</a>' +
          '<div class="forum-user-card__roles">' + roleHtml + '</div>' +
        '</div>' +
      '</div>' +
      '<p class="forum-user-card__bio">' + bio + '</p>' +
      '<div class="forum-user-card__stats"><span><strong>' + Number(profile.topic_count || 0) + '</strong> тем</span><span><strong>' + Number(profile.post_count || 0) + '</strong> сообщений</span>' + minecraft + '</div>' +
      '<a class="forum-user-card__open" href="./forum-user.html?id=' + encodeURIComponent(profile.public_id) + '">Открыть профиль <span aria-hidden="true">→</span></a>';

    card.hidden = false;
    positionCard(trigger);
  };

  const open = async (trigger) => {
    window.clearTimeout(closeTimer);
    const publicId = trigger.getAttribute("data-forum-user");
    if (!publicId) return;

    const card = ensureCard();
    card.innerHTML = '<div class="forum-user-card__loading">Загрузка профиля…</div>';
    card.hidden = false;
    positionCard(trigger);

    const profile = await fetchProfile(publicId);
    renderCard(profile, trigger);
  };

  const getUserTrigger = (event) => {
    const target = event && event.target;
    return target instanceof Element ? target.closest("[data-forum-user]") : null;
  };

  const bind = (root = document) => {
    root.addEventListener("mouseenter", (event) => {
      const trigger = getUserTrigger(event);
      if (!trigger) return;
      window.clearTimeout(openTimer);
      openTimer = window.setTimeout(() => void open(trigger), 280);
    }, true);

    root.addEventListener("mouseleave", (event) => {
      const trigger = getUserTrigger(event);
      if (!trigger) return;
      window.clearTimeout(openTimer);
      scheduleClose();
    }, true);

    root.addEventListener("focusin", (event) => {
      const trigger = getUserTrigger(event);
      if (trigger) void open(trigger);
    });

    root.addEventListener("focusout", (event) => {
      const trigger = getUserTrigger(event);
      if (trigger) scheduleClose();
    });

    root.addEventListener("click", (event) => {
      const trigger = getUserTrigger(event);
      if (!trigger) return;
      if (trigger.tagName !== "A") {
        event.preventDefault();
        const publicId = trigger.getAttribute("data-forum-user");
        if (publicId) window.location.href = "./forum-user.html?id=" + encodeURIComponent(publicId);
      }
    });
  };

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && hoverCard) hoverCard.hidden = true;
  });

  window.addEventListener("scroll", () => {
    if (hoverCard && !hoverCard.hidden) hoverCard.hidden = true;
  }, { passive: true });

  window.NaZerakForumUI = Object.freeze({ bind, roleBadge, icon, categoryIcon, chip });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => bind(), { once: true });
  } else {
    bind();
  }
})();
