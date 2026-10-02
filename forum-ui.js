(() => {
  "use strict";

  const cache = new Map();
  let hoverCard = null;
  let closeTimer = null;
  let openTimer = null;

  const qs = (s, r = document) => r.querySelector(s);
  const escapeHtml = (value) => String(value == null ? "" : value).replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"
  }[c]));

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
    if (cache.has(publicId)) return cache.get(publicId);
    const client = window.NaZerakAuth && window.NaZerakAuth.client;
    if (!client) return null;
    const request = client.from("forum_author_directory")
      .select("public_id,display_name,avatar_url,bio,minecraft_username,joined_at,last_seen_at,topic_count,post_count,role_slugs,primary_role_slug,primary_role_name,primary_role_color,primary_role_badge")
      .eq("public_id", publicId)
      .maybeSingle();
    cache.set(publicId, request);
    const result = await request;
    if (result.error) {
      cache.delete(publicId);
      return null;
    }
    cache.set(publicId, Promise.resolve(result.data));
    return result.data;
  };

  const positionCard = (trigger) => {
    if (!hoverCard || hoverCard.hidden) return;
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(360, window.innerWidth - 24);
    let left = rect.left;
    if (left + width > window.innerWidth - 12) left = window.innerWidth - width - 12;
    if (left < 12) left = 12;
    let top = rect.bottom + 10;
    const height = hoverCard.offsetHeight || 220;
    if (top + height > window.innerHeight - 12) top = Math.max(12, rect.top - height - 10);
    hoverCard.style.left = left + "px";
    hoverCard.style.top = top + "px";
  };

  const renderCard = (profile, trigger) => {
    const card = ensureCard();
    const avatar = profile && profile.avatar_url ? '<img src="' + escapeHtml(profile.avatar_url) + '" alt="">' : "";
    const initial = escapeHtml(String(profile && profile.display_name || "N").slice(0,1).toUpperCase());
    const roles = Array.isArray(profile && profile.role_slugs) ? profile.role_slugs : [];
    const roleHtml = roles.length
      ? roles.slice(0,3).map((r) => roleBadge(r.slug, r.name, r.badge)).join("")
      : roleBadge("player", "Игрок", "•");

    card.innerHTML =
      '<div class="forum-user-card__top">' +
        '<div class="forum-user-card__avatar">' + (avatar || initial) + '</div>' +
        '<div class="forum-user-card__identity">' +
          '<a href="./forum-user.html?id=' + encodeURIComponent(profile.public_id) + '" class="forum-user-card__name forum-role--' + escapeHtml(profile.primary_role_slug || "player") + '">' + escapeHtml(profile.display_name || "Игрок NaZerak") + '</a>' +
          '<div class="forum-user-card__roles">' + roleHtml + '</div>' +
        '</div>' +
      '</div>' +
      '<p class="forum-user-card__bio">' + escapeHtml(profile.bio || "Участник форума NaZerak.") + '</p>' +
      '<div class="forum-user-card__stats"><span><strong>' + Number(profile.topic_count || 0) + '</strong> тем</span><span><strong>' + Number(profile.post_count || 0) + '</strong> сообщений</span>' +
      (profile.minecraft_username ? '<span><strong>' + escapeHtml(profile.minecraft_username) + '</strong> Minecraft</span>' : "") +
      '</div>' +
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
    if (!profile) {
      card.innerHTML = '<div class="forum-user-card__loading">Профиль недоступен.</div>';
      positionCard(trigger);
      return;
    }
    renderCard(profile, trigger);
  };

  const bind = (root = document) => {
    root.addEventListener("mouseenter", (event) => {
      const trigger = event.target.closest("[data-forum-user]");
      if (!trigger) return;
      window.clearTimeout(openTimer);
      openTimer = window.setTimeout(() => void open(trigger), 280);
    }, true);

    root.addEventListener("mouseleave", (event) => {
      const trigger = event.target.closest("[data-forum-user]");
      if (!trigger) return;
      window.clearTimeout(openTimer);
      scheduleClose();
    }, true);

    root.addEventListener("focusin", (event) => {
      const trigger = event.target.closest("[data-forum-user]");
      if (trigger) void open(trigger);
    });

    root.addEventListener("focusout", (event) => {
      const trigger = event.target.closest("[data-forum-user]");
      if (trigger) scheduleClose();
    });

    root.addEventListener("click", (event) => {
      const trigger = event.target.closest("[data-forum-user]");
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

  window.NaZerakForumUI = Object.freeze({ bind, roleBadge });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => bind(), { once: true });
  } else {
    bind();
  }
})();