(() => {
  "use strict";

  const config = window.NAZERAK_SUPABASE_CONFIG || {};
  const supabaseFactory = window.supabase?.createClient;

  const configured =
    typeof config.url === "string" &&
    config.url.startsWith("https://") &&
    typeof config.publishableKey === "string" &&
    config.publishableKey.length > 20;

  let client = null;
  if (configured && typeof supabaseFactory === "function") {
    client = supabaseFactory(config.url, config.publishableKey, {
      auth: {
        flowType: "pkce",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  }

  const state = {
    user: null,
    profile: null,
    loading: true
  };

  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];

  const accountUrl = () => new URL("./cabinet.html", window.location.href).href;

  const escapeText = (value) => String(value ?? "").trim();

  const userDisplayName = (user) => {
    const metadata = user?.user_metadata || {};
    return escapeText(
      metadata.global_name ||
      metadata.full_name ||
      metadata.name ||
      metadata.user_name ||
      metadata.preferred_username ||
      metadata.custom_claims?.global_name ||
      metadata.custom_claims?.username ||
      user?.email?.split("@")[0] ||
      "Игрок NaZerak"
    );
  };

  const userDiscordName = (user) => {
    const metadata = user?.user_metadata || {};
    return escapeText(
      metadata.full_name ||
      metadata.user_name ||
      metadata.preferred_username ||
      metadata.custom_claims?.username ||
      metadata.global_name ||
      ""
    );
  };

  const userAvatar = (user) => {
    const metadata = user?.user_metadata || {};
    return metadata.avatar_url || metadata.picture || metadata.custom_claims?.avatar_url || "";
  };

  const formatDate = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    }).format(date);
  };

  const showMessage = (message, kind = "info") => {
    qsa("[data-auth-message]").forEach((element) => {
      element.textContent = message;
      element.dataset.kind = kind;
      element.hidden = !message;
    });
  };

  const setBusy = (button, busy, labelWhenBusy = "Загрузка…") => {
    if (!button) return;
    if (busy) {
      button.dataset.originalLabel ||= button.textContent;
      button.textContent = labelWhenBusy;
      button.disabled = true;
      button.setAttribute("aria-busy", "true");
    } else {
      button.textContent = button.dataset.originalLabel || button.textContent;
      button.disabled = false;
      button.removeAttribute("aria-busy");
    }
  };

  const renderAuthLinks = () => {
    qsa("[data-auth-link]").forEach((link) => {
      const label = qs("[data-auth-link-label]", link);
      const avatar = qs("[data-auth-link-avatar]", link);

      link.hidden = false;
      link.href = accountUrl();
      link.setAttribute("aria-label", state.user ? "Открыть личный кабинет" : "Войти через Discord");
      link.title = state.user ? "Личный кабинет" : "Войти через Discord";

      if (label) label.textContent = state.user ? userDisplayName(state.user) : "Войти";
      if (avatar) {
        const src = userAvatar(state.user);
        avatar.hidden = !src;
        if (src) {
          avatar.src = src;
          avatar.alt = "";
        }
      }

      const fallback = qs("[data-auth-link-fallback]", link);
      if (fallback) fallback.hidden = !!userAvatar(state.user);
    });

    qsa("[data-auth-only]").forEach((element) => {
      element.hidden = !state.user;
    });

    qsa("[data-guest-only]").forEach((element) => {
      element.hidden = !!state.user;
    });
  };

  const setAccountView = (mode) => {
    qsa("[data-account-view]").forEach((view) => {
      view.hidden = view.dataset.accountView !== mode;
    });
  };

  const renderUser = (user, profile) => {
    const name = userDisplayName(user);
    const discordName = userDiscordName(user);
    const avatar = userAvatar(user);

    qsa("[data-user-name]").forEach((el) => { el.textContent = name; });
    qsa("[data-discord-name]").forEach((el) => { el.textContent = discordName ? "@" + discordName : "Discord"; });
    qsa("[data-user-id]").forEach((el) => { el.textContent = user?.id || "—"; });
    qsa("[data-account-created]").forEach((el) => { el.textContent = formatDate(user?.created_at); });
    qsa("[data-last-sign-in]").forEach((el) => { el.textContent = formatDate(user?.last_sign_in_at); });
    qsa("[data-minecraft-name]").forEach((el) => {
      el.textContent = profile?.minecraft_username || "Не привязан";
    });
    qsa("[data-minecraft-input]").forEach((input) => {
      input.value = profile?.minecraft_username || "";
    });

    qsa("[data-user-avatar]").forEach((img) => {
      img.hidden = !avatar;
      if (avatar) {
        img.src = avatar;
        img.alt = "Аватар Discord " + name;
      }
    });

    const initials = name.slice(0, 1).toUpperCase();
    qsa("[data-user-initial]").forEach((el) => { el.textContent = initials; });
  };

  const loadProfile = async (user) => {
    if (!client || !user) return null;

    const { data, error } = await client
      .from("profiles")
      .select("id, minecraft_username, created_at, updated_at")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.warn("[NaZerak Auth] profiles read unavailable:", error.message);
      return null;
    }

    return data;
  };

  const loadMediaApplications = async (user) => {
    const list = qs("[data-media-list]");
    const empty = qs("[data-media-empty]");
    if (!client || !user || !list) return;

    const { data, error } = await client
      .from("media_applications")
      .select("id, channel_url, message, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      if (empty) {
        empty.textContent = "Раздел заявок пока не подключён к базе данных.";
        empty.hidden = false;
      }
      return;
    }

    list.innerHTML = "";
    if (!data?.length) {
      if (empty) {
        empty.textContent = "Пока нет отправленных заявок.";
        empty.hidden = false;
      }
      return;
    }

    if (empty) empty.hidden = true;

    const fragment = document.createDocumentFragment();
    data.forEach((item) => {
      const card = document.createElement("article");
      card.className = "media-application";
      const status = document.createElement("span");
      status.className = "media-application__status";
      status.textContent =
        item.status === "approved" ? "Одобрено" :
        item.status === "rejected" ? "Отклонено" : "На рассмотрении";

      const url = document.createElement("a");
      url.href = item.channel_url;
      url.target = "_blank";
      url.rel = "noopener noreferrer";
      url.textContent = item.channel_url;

      const date = document.createElement("time");
      date.dateTime = item.created_at || "";
      date.textContent = formatDate(item.created_at);

      const message = document.createElement("p");
      message.textContent = item.message || "Без сообщения.";

      card.append(status, url, message, date);
      fragment.appendChild(card);
    });
    list.appendChild(fragment);
  };

  const ensureProfile = async (user) => {
    if (!client || !user) return null;

    const profile = await loadProfile(user);
    if (profile) return profile;

    const { data, error } = await client
      .from("profiles")
      .insert({ id: user.id })
      .select("id, minecraft_username, created_at, updated_at")
      .single();

    if (error) {
      console.warn("[NaZerak Auth] profile initialization unavailable:", error.message);
      return null;
    }

    return data;
  };

  const signIn = async (button) => {
    if (!client) {
      window.location.href = accountUrl() + "#auth-config";
      return;
    }

    setBusy(button, true, "Переходим в Discord…");
    showMessage("");

    const redirectTarget = new URL(accountUrl());
    if (window.location.hash === "#media-application") {
      redirectTarget.hash = "media-application";
    }

    const { error } = await client.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo: redirectTarget.href,
        scopes: "identify"
      }
    });

    if (error) {
      setBusy(button, false);
      showMessage(error.message || "Не удалось открыть Discord.", "error");
    }
  };

  const signOut = async (button) => {
    if (!client) return;

    setBusy(button, true, "Выходим…");
    const { error } = await client.auth.signOut();

    if (error) {
      setBusy(button, false);
      showMessage(error.message || "Не удалось завершить сессию.", "error");
      return;
    }

    state.user = null;
    state.profile = null;
    window.location.replace("./");
  };

  const saveProfile = async (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    const input = qs("#minecraft-username", form);
    const button = qs("button[type='submit']", form);
    const value = escapeText(input?.value);

    if (!client || !state.user || !input) return;

    if (!/^[A-Za-z0-9_]{3,16}$/.test(value)) {
      showMessage("Minecraft-ник должен содержать 3–16 символов: латинские буквы, цифры и _.", "error");
      input.focus();
      return;
    }

    setBusy(button, true, "Сохраняем…");
    showMessage("");

    const { data, error } = await client
      .from("profiles")
      .upsert({
        id: state.user.id,
        minecraft_username: value,
        updated_at: new Date().toISOString()
      })
      .select("id, minecraft_username, created_at, updated_at")
      .single();

    setBusy(button, false);

    if (error) {
      showMessage("Не удалось сохранить профиль. Проверь, что SQL-схема NaZerak уже установлена в Supabase.", "error");
      return;
    }

    state.profile = data;
    renderUser(state.user, state.profile);
    showMessage("Игровой профиль сохранён.", "success");
  };

  const submitMediaApplication = async (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    const urlInput = qs("#media-channel-url", form);
    const messageInput = qs("#media-message", form);
    const button = qs("button[type='submit']", form);

    if (!client || !state.user || !urlInput || !messageInput) return;

    const channelUrl = escapeText(urlInput.value);
    const message = escapeText(messageInput.value);

    let parsedUrl;
    try {
      parsedUrl = new URL(channelUrl);
    } catch {
      showMessage("Укажи корректную ссылку на канал или площадку.", "error");
      urlInput.focus();
      return;
    }

    if (!/^https?:$/.test(parsedUrl.protocol)) {
      showMessage("Ссылка должна начинаться с http:// или https://.", "error");
      urlInput.focus();
      return;
    }

    if (message.length < 10) {
      showMessage("Добавь хотя бы несколько слов о себе и формате контента.", "error");
      messageInput.focus();
      return;
    }

    setBusy(button, true, "Отправляем…");
    showMessage("");

    const { error } = await client.from("media_applications").insert({
      user_id: state.user.id,
      channel_url: channelUrl,
      message
    });

    setBusy(button, false);

    if (error) {
      const duplicate =
        error.code === "23505" ||
        /duplicate|unique/i.test(error.message || "");

      showMessage(
        duplicate
          ? "У тебя уже есть заявка на рассмотрении."
          : "Не удалось отправить заявку. Проверь, что таблица заявок создана в Supabase.",
        "error"
      );
      return;
    }

    form.reset();
    showMessage("Заявка отправлена. Мы рассмотрим её через систему NaZerak.", "success");
    await loadMediaApplications(state.user);
  };

  const renderCabinet = async () => {
    if (!document.body.dataset.cabinet) return;

    if (!configured || !client) {
      setAccountView("config");
      state.loading = false;
      return;
    }

    setAccountView("loading");

    const { data, error } = await client.auth.getUser();
    if (error) {
      console.warn("[NaZerak Auth] user lookup failed:", error.message);
    }

    state.user = data?.user || null;

    if (!state.user) {
      setAccountView("guest");
      return;
    }

    state.profile = await ensureProfile(state.user);
    renderUser(state.user, state.profile);
    await loadMediaApplications(state.user);
    setAccountView("user");

    if (window.location.hash === "#media-application") {
      window.setTimeout(() => {
        document.getElementById("media-application")?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }, 80);
    }
  };

  const init = async () => {
    renderAuthLinks();

    qsa("[data-discord-login]").forEach((button) => {
      button.addEventListener("click", () => signIn(button));
    });

    qsa("[data-sign-out]").forEach((button) => {
      button.addEventListener("click", () => signOut(button));
    });

    qsa("#minecraft-profile-form").forEach((form) => {
      form.addEventListener("submit", saveProfile);
    });

    qsa("#media-application-form").forEach((form) => {
      form.addEventListener("submit", submitMediaApplication);
    });

    if (!configured || !client) {
      qsa("[data-auth-status]").forEach((el) => {
        el.textContent = "AUTH SETUP REQUIRED";
      });
      qsa("[data-auth-config-link]").forEach((link) => {
        link.href = "#auth-config";
      });
      await renderCabinet();
      renderAuthLinks();
      return;
    }

    const { data } = await client.auth.getSession();
    state.user = data.session?.user || null;
    state.loading = false;
    renderAuthLinks();
    await renderCabinet();

    client.auth.onAuthStateChange(async (_event, session) => {
      state.user = session?.user || null;
      state.profile = null;
      renderAuthLinks();

      if (document.body.dataset.cabinet) {
        await renderCabinet();
      }
    });
  };

  window.NaZerakAuth = Object.freeze({
    get client() { return client; },
    get user() { return state.user; },
    get configured() { return configured && !!client; },
    signIn: () => signIn(null),
    signOut: () => signOut(null)
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
