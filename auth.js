(() => {
  "use strict";

  const config = window.NAZERAK_SUPABASE_CONFIG || {};
  const configured =
    typeof config.url === "string" &&
    /^https:\/\//.test(config.url) &&
    typeof config.publishableKey === "string" &&
    config.publishableKey.length > 20;

  let client = null;
  let bootstrapError = null;

  const state = {
    user: null,
    profile: null,
    loading: true
  };

  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];
  const accountUrl = () => new URL("./cabinet.html", window.location.href).href;
  const escapeText = (value) => String(value ?? "").trim();

  const safeHttpUrl = (value) => {
    try {
      const url = new URL(String(value || ""));
      return /^https?:$/.test(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  };

  const readOAuthError = () => {
    const sources = [];

    if (window.location.search) {
      sources.push(new URLSearchParams(window.location.search));
    }

    if (window.location.hash.startsWith("#")) {
      sources.push(
        new URLSearchParams(window.location.hash.slice(1))
      );
    }

    for (const params of sources) {
      const error = params.get("error");
      const description = params.get("error_description");
      const code = params.get("error_code");

      if (error || description || code) {
        return { error, description, code };
      }
    }

    return null;
  };

  const showMessage = (message, kind = "info") => {
    qsa("[data-auth-message]").forEach((element) => {
      element.textContent = message;
      element.dataset.kind = kind;
      element.hidden = !message;
    });
  };

  const setAuthStatus = (label, stateName = "") => {
    qsa("[data-auth-status]").forEach((element) => {
      element.textContent = label;
      element.dataset.state = stateName;
    });
  };

  const showOAuthError = () => {
    const result = readOAuthError();
    if (!result) return false;

    const detail = result.description || result.error || "Неизвестная ошибка OAuth.";
    const code = result.code ? " [" + result.code + "]" : "";
    showMessage("Ошибка входа через Discord" + code + ": " + detail, "error");
    setAuthStatus("DISCORD ERROR", "error");
    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search
    );
    return true;
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
    const candidate = safeHttpUrl(
      metadata.avatar_url ||
      metadata.picture ||
      metadata.custom_claims?.avatar_url ||
      ""
    );
    if (!candidate) return "";

    try {
      const host = new URL(candidate).hostname.toLowerCase();
      return host === "cdn.discordapp.com" ||
        host === "media.discordapp.net"
        ? candidate
        : "";
    } catch {
      return "";
    }
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

  const renderAuthLinks = () => {
    qsa("[data-auth-link]").forEach((link) => {
      const label = qs("[data-auth-link-label]", link);
      const avatar = qs("[data-auth-link-avatar]", link);

      link.hidden = false;
      link.href = accountUrl();
      link.setAttribute(
        "aria-label",
        state.user ? "Открыть личный кабинет" : "Войти через Discord"
      );
      link.title = state.user ? "Личный кабинет" : "Войти через Discord";

      if (label) {
        label.textContent = state.user ? userDisplayName(state.user) : "Войти";
      }

      if (avatar) {
        const src = userAvatar(state.user);
        avatar.hidden = !src;
        if (src) {
          avatar.src = src;
          avatar.alt = "";
        } else {
          avatar.removeAttribute("src");
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
    qsa("[data-account-actions]").forEach((actions) => {
      actions.hidden = mode === "user" || mode === "loading";
    });
  };

  const showLoginFallback = (title, copy, note, kind = "error") => {
    const titleEl = qs("[data-login-title]");
    const copyEl = qs("[data-login-copy]");
    const noteEl = qs("[data-login-note]");
    if (titleEl) titleEl.textContent = title;
    if (copyEl) copyEl.textContent = copy;
    if (noteEl) noteEl.textContent = note;
    qsa("[data-discord-login]").forEach((button) => {
      button.disabled = false;
      button.removeAttribute("aria-busy");
      button.textContent = "Повторить вход через Discord ↗";
    });
    setAccountView("guest");
    setAuthStatus(kind === "error" ? "AUTH UNAVAILABLE" : "DISCORD READY", kind);
  };

  const configureSetupView = (runtimeFailure) => {
    const title = qs("[data-auth-config-title]");
    const copy = qs("[data-auth-config-copy]");
    const steps = qs("[data-auth-setup-steps]");
    const action = qs("[data-auth-config-link]");

    if (runtimeFailure) {
      if (title) title.textContent = "Не удалось загрузить авторизацию.";
      if (copy) {
        copy.textContent =
          "Supabase настроен, но библиотека авторизации не загрузилась. Страница автоматически попробовала два CDN-источника. Обнови её через Ctrl+F5 и повтори вход.";
      }
      if (steps) steps.hidden = true;
      if (action) {
        action.href = "./cabinet.html?retry=1";
        action.textContent = "Повторить проверку";
      }
      return;
    }

    if (title) title.textContent = "Авторизация ещё не подключена.";
    if (copy) {
      copy.textContent =
        "Код Discord OAuth уже встроен в сайт. Проверь публичный URL Supabase, publishable key и включённый Discord Provider.";
    }
    if (steps) steps.hidden = false;
    if (action) {
      action.href = "./AUTH_SETUP.md";
      action.textContent = "Открыть инструкцию";
    }
  };

  const renderUser = (user, profile) => {
    const name = userDisplayName(user);
    const discordName = userDiscordName(user);
    const avatar = userAvatar(user);

    qsa("[data-user-name]").forEach((el) => { el.textContent = name; });
    qsa("[data-discord-name]").forEach((el) => {
      el.textContent = discordName ? "@" + discordName : "Discord";
    });
    qsa("[data-user-id]").forEach((el) => {
      el.textContent = user?.id || "—";
    });
    qsa("[data-account-created]").forEach((el) => {
      el.textContent = formatDate(user?.created_at);
    });
    qsa("[data-last-sign-in]").forEach((el) => {
      el.textContent = formatDate(user?.last_sign_in_at);
    });
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
      } else {
        img.removeAttribute("src");
      }
    });

    const initials = name.slice(0, 1).toUpperCase() || "N";
    qsa("[data-user-initial]").forEach((el) => {
      el.textContent = initials;
    });
  };

  const clearElementChildren = (element) => {
    if (!element) return;
    while (element.firstChild) element.removeChild(element.firstChild);
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

    clearElementChildren(list);

    if (error) {
      if (empty) {
        empty.textContent = "Не удалось загрузить историю заявок. Попробуй обновить страницу.";
        empty.hidden = false;
      }
      return;
    }

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
        item.status === "approved"
          ? "Одобрено"
          : item.status === "rejected"
            ? "Отклонено"
            : "На рассмотрении";

      const safeUrl = safeHttpUrl(item.channel_url);
      if (safeUrl) {
        const url = document.createElement("a");
        url.href = safeUrl;
        url.target = "_blank";
        url.rel = "noopener noreferrer";
        url.textContent = safeUrl;
        card.appendChild(url);
      }

      const date = document.createElement("time");
      date.dateTime = item.created_at || "";
      date.textContent = formatDate(item.created_at);

      const message = document.createElement("p");
      message.textContent = item.message || "Без сообщения.";

      card.append(status, message, date);
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
      .upsert({ id: user.id }, { onConflict: "id" })
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
      setBusy(button, false);
      showMessage(
        bootstrapError?.message ||
        "Supabase не инициализирован. Обнови страницу с Ctrl+F5.",
        "error"
      );
      setAuthStatus("AUTH ERROR", "error");
      return;
    }

    setBusy(button, true, "Переходим в Discord…");
    showMessage("");

    const redirectTarget = new URL(accountUrl());
    if (window.location.hash === "#media-application") {
      redirectTarget.hash = "media-application";
    }

    try {
      const result = await Promise.race([
        client.auth.signInWithOAuth({
          provider: "discord",
          options: {
            redirectTo: redirectTarget.href,
            scopes: "identify"
          }
        }),
        new Promise((resolve) => {
          window.setTimeout(
            () => resolve({ error: new Error("Discord OAuth не ответил за 8 секунд.") }),
            8000
          );
        })
      ]);
      const { error } = result;

      if (error) {
        setBusy(button, false);
        showMessage(error.message || "Не удалось открыть Discord.", "error");
        setAuthStatus("DISCORD ERROR", "error");
      }
    } catch (error) {
      setBusy(button, false);
      showMessage(
        error instanceof Error
          ? error.message
          : "Не удалось открыть Discord.",
        "error"
      );
      setAuthStatus("DISCORD ERROR", "error");
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
    renderAuthLinks();
    window.location.replace("./");
  };

  const saveProfile = async (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    const input = qs("#minecraft-username", form);
    const button = qs("button[type='submit']", form);
    const value = escapeText(input?.value);

    if (!client || !state.user || !input) {
      showMessage("Сессия пользователя ещё не готова. Обнови страницу и попробуй снова.", "error");
      return;
    }

    if (!/^[A-Za-z0-9_]{3,16}$/.test(value)) {
      showMessage(
        "Minecraft-ник должен содержать 3–16 символов: латинские буквы, цифры и _.",
        "error"
      );
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
      showMessage(
        "Не удалось сохранить профиль. Проверь подключение к Supabase и права RLS.",
        "error"
      );
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

    if (!client || !state.user || !urlInput || !messageInput) {
      showMessage("Сессия пользователя ещё не готова. Обнови страницу и попробуй снова.", "error");
      return;
    }

    const channelUrl = escapeText(urlInput.value);
    const message = escapeText(messageInput.value);
    const parsedUrl = safeHttpUrl(channelUrl);

    if (!parsedUrl) {
      showMessage(
        "Укажи корректную ссылку на канал или площадку с http:// или https://.",
        "error"
      );
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

    const { error } = await client
      .from("media_applications")
      .insert({
        user_id: state.user.id,
        channel_url: parsedUrl,
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
          : "Не удалось отправить заявку. Проверь подключение к базе данных.",
        "error"
      );
      return;
    }

    form.reset();
    showMessage(
      "Заявка отправлена. Мы рассмотрим её через систему NaZerak.",
      "success"
    );
    await loadMediaApplications(state.user);
  };

  const getSessionSafe = async (timeoutMs = 8000) => {
    if (!client) return { data: { session: null }, error: new Error("Supabase client не инициализирован.") };

    let timer = null;
    try {
      return await Promise.race([
        client.auth.getSession(),
        new Promise((resolve) => {
          timer = window.setTimeout(() => {
            resolve({
              data: { session: null },
              error: new Error("Проверка сессии превысила 8 секунд.")
            });
          }, timeoutMs);
        })
      ]);
    } finally {
      if (timer) window.clearTimeout(timer);
    }
  };

  const renderCabinet = async (session = undefined) => {
    if (!document.body.dataset.cabinet) return;

    if (!configured) {
      setAuthStatus("AUTH SETUP REQUIRED", "config");
      configureSetupView(false);
      setAccountView("config");
      state.loading = false;
      return;
    }

    if (!client) {
      showLoginFallback(
        "Вход временно недоступен.",
        "Сервис авторизации не успел загрузиться. Это не должно оставлять страницу в бесконечной загрузке.",
        "Нажми «Повторить проверку». Если ошибка сохраняется, можно вернуться на главную — аккаунт и данные не потеряются."
      );
      state.loading = false;
      return;
    }

    setAccountView("loading");
    setAuthStatus("CHECKING AUTH", "loading");

    const result = session === undefined
      ? await getSessionSafe()
      : { data: { session }, error: null };

    if (result.error) {
      console.warn("[NaZerak Auth] session lookup failed:", result.error.message);
      state.user = null;
      showMessage(
        "Не удалось получить сессию за отведённое время. Нажми обновить страницу и повтори вход.",
        "error"
      );
      setAuthStatus("AUTH TIMEOUT", "error");
      setAccountView("guest");
      return;
    }

    state.user = result.data?.session?.user || null;

    if (!state.user) {
      setAuthStatus("DISCORD READY", "ready");
      setAccountView("guest");
      return;
    }

    state.profile = await ensureProfile(state.user);
    renderUser(state.user, state.profile);
    await loadMediaApplications(state.user);

    setAuthStatus("SIGNED IN", "signed-in");
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

  const bootstrapClient = async () => {
    if (!configured) return;

    try {
      if (window.NAZERAK_SUPABASE_READY instanceof Promise) {
        await window.NAZERAK_SUPABASE_READY;
      }

      const factory = window.supabase?.createClient;
      if (typeof factory !== "function") {
        throw new Error("Supabase SDK createClient не найден.");
      }

      client = factory(config.url, config.publishableKey, {
        auth: {
          flowType: "pkce",
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
    } catch (error) {
      bootstrapError =
        error instanceof Error
          ? error
          : new Error(String(error || "Неизвестная ошибка Supabase SDK."));
      client = null;
      console.error("[NaZerak Auth] Supabase bootstrap failed:", bootstrapError);
    }
  };

  let initialized = false;

  const init = async () => {
    if (initialized) return;
    initialized = true;

    document.documentElement.classList.add("auth-ready");
    renderAuthLinks();
    showOAuthError();

    qsa("[data-discord-login]").forEach((button) => {
      button.addEventListener("click", () => {
        void signIn(button);
      });
    });

    qsa("[data-auth-retry]").forEach((button) => {
      button.addEventListener("click", () => {
        window.location.reload();
      });
    });

    qsa("[data-sign-out]").forEach((button) => {
      button.addEventListener("click", () => {
        void signOut(button);
      });
    });

    qsa("#minecraft-profile-form").forEach((form) => {
      form.addEventListener("submit", saveProfile);
    });

    qsa("#media-application-form").forEach((form) => {
      form.addEventListener("submit", submitMediaApplication);
    });

    await bootstrapClient();

    if (!configured || !client) {
      if (document.body.dataset.cabinet) {
        await renderCabinet();
      }
      renderAuthLinks();
      return;
    }

    const sessionResult = await getSessionSafe();

    if (sessionResult.error) {
      console.warn("[NaZerak Auth] initial session lookup failed:", sessionResult.error.message);
      showMessage(
        "Не удалось получить сессию вовремя. Можно повторить проверку без перезагрузки.",
        "error"
      );
    }

    const initialSession = sessionResult.data?.session || null;
    state.user = initialSession?.user || null;
    state.loading = false;
    renderAuthLinks();

    if (document.body.dataset.cabinet) {
      await renderCabinet(initialSession);
    }

    client.auth.onAuthStateChange((_event, session) => {
      state.user = session?.user || null;
      state.profile = null;
      renderAuthLinks();

      window.setTimeout(() => {
        if (document.body.dataset.cabinet) {
          void renderCabinet(session || null);
        }
      }, 0);
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
    document.addEventListener("DOMContentLoaded", () => {
      void init();
    }, { once: true });
  } else {
    void init();
  }
})();
