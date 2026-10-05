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

  const roleBadge = (slug, name, badge) => {
    const safeSlug = String(slug || "player").replace(/[^a-z0-9-]/gi, "");
    return '<span class="forum-role forum-role--' + safeSlug + '" data-role-slug="' + safeSlug + '">' +
      escapeHtml(badge || "•") + " " + escapeHtml(name || "Игрок") + "</span>";
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
      ? roles.slice(0, 3).map((role) => roleBadge(role.slug || role.role_slug || "player", role.name || "Игрок", role.badge || "•")).join("")
      : roleBadge("player", "Игрок", "•");

    const username = escapeHtml(profile.display_name || "Игрок NaZerak");
    const bio = escapeHtml(profile.bio || "Участник форума NaZerak.");
    const minecraft = profile.minecraft_username ? '<span><strong>' + escapeHtml(profile.minecraft_username) + '</strong> Minecraft</span>' : "";

    card.innerHTML =
      '<div class="forum-user-card__top">' +
        '<div class="forum-user-card__avatar">' + (avatar || initial) + '</div>' +
        '<div class="forum-user-card__identity">' +
          '<a href="/user/' + encodeURIComponent(profile.public_id) + '" class="forum-user-card__name forum-role--' + escapeHtml(profile.primary_role_slug || "player") + '">' + username + '</a>' +
          '<div class="forum-user-card__roles">' + roleHtml + '</div>' +
        '</div>' +
      '</div>' +
      '<p class="forum-user-card__bio">' + bio + '</p>' +
      '<div class="forum-user-card__stats"><span><strong>' + Number(profile.topic_count || 0) + '</strong> тем</span><span><strong>' + Number(profile.post_count || 0) + '</strong> сообщений</span>' + minecraft + '</div>' +
      '<a class="forum-user-card__open" href="/user/' + encodeURIComponent(profile.public_id) + '">Открыть профиль <span aria-hidden="true">→</span></a>';

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
        if (publicId) window.location.href = "/user/ + encodeURIComponent(publicId);
      }
    });
  };

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && hoverCard) hoverCard.hidden = true;
  });

  window.addEventListener("scroll", () => {
    if (hoverCard && !hoverCard.hidden) hoverCard.hidden = true;
  }, { passive: true });

  window.NaZerakForumUI = Object.freeze({ bind, roleBadge });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => bind(), { once: true });
  } else {
    bind();
  }
})();
