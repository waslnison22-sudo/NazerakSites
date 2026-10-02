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
      const text = qs("span", element);
      if (text) {
        text.textContent = label;
      } else {
        element.textContent = label;
      }
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
      window.location.pathname
    );
    return true;
  };

  const setButtonLabel = (button, label) => {
    if (!button) return;
    const labelNode = button.querySelector("span:not([aria-hidden='true'])");
    if (labelNode) {
      labelNode.textContent = label;
      return;
    }
    button.textContent = label;
  };

  const setBusy = (button, busy, labelWhenBusy = "Загрузка…") => {
    if (!button) return;

    if (busy) {
      if (!button.dataset.originalButtonLabel) {
        const labelNode = button.querySelector("span:not([aria-hidden='true'])");
        button.dataset.originalButtonLabel =
          labelNode?.textContent || button.textContent;
      }
      setButtonLabel(button, labelWhenBusy);
      button.disabled = true;
      button.setAttribute("aria-busy", "true");
    } else {
      if (button.dataset.originalButtonLabel) {
        setButtonLabel(button, button.dataset.originalButtonLabel);
      }
      button.disabled = false;
      button.removeAttribute("aria-busy");
      delete button.dataset.originalButtonLabel;
    }
  };

  const withTimeout = async (promise, timeoutMs, message) => {
    let timer = null;

    try {
      return await Promise.race([
        promise,
        new Promise((_, reject) => {
          timer = window.setTimeout(
            () => reject(new Error(message)),
            timeoutMs
          );
        })
      ]);
    } finally {
      if (timer) window.clearTimeout(timer);
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


  const syncForumAccount = async (user) => {
    if (!client || !user) return;
    try {
      const displayName = userDisplayName(user).slice(0, 64) || "Игрок NaZerak";
      const avatar = userAvatar(user) || null;
      const result = await withTimeout(
        client
          .from("forum_authors")
          .upsert({
            id: user.id,
            display_name: displayName,
            avatar_url: avatar,
            last_seen_at: new Date().toISOString()
          }, { onConflict: "id", ignoreDuplicates: false }),
        5000,
        "Синхронизация форумного профиля превысила 5 секунд."
      );
      if (result.error) {
        console.warn("[NaZerak Auth] forum account sync unavailable:", result.error.message);
      }
    } catch (error) {
      console.warn(
        "[NaZerak Auth] forum account sync failed:",
        error instanceof Error ? error.message : String(error)
      );
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
        label.textContent = state.user ? "Кабинет" : "Войти";
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
    if (document.body.hasAttribute("data-cabinet")) {
      const main = document.getElementById("main-content");
      if (main) main.setAttribute("aria-busy", String(mode === "loading"));
    }

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
      setButtonLabel(button, "Повторить вход через Discord");
    });
    setAccountView("guest");
    setAuthStatus(kind === "error" ? "AUTH UNAVAILABLE" : "DISCORD READY", kind);
  };

  const configureSetupView = (runtimeFailure) => {
    const copy = qs("[data-auth-config-copy]");

    if (copy) {
      copy.textContent = runtimeFailure
        ? "Сервис авторизации не загрузился. Проверь соединение и повтори попытку."
        : "Авторизация через Discord ещё не настроена. Проверь настройки Supabase и Discord Provider.";
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
    qsa("[data-profile-state]").forEach((el) => {
      el.textContent = profile?.minecraft_username ? "ЗАПОЛНЕН" : "НЕ ЗАПОЛНЕН";
      el.dataset.state = profile?.minecraft_username ? "ready" : "empty";
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

  const loadProfile = async (user) => {
    if (!client || !user) return { status: "error", data: null };

    try {
      const { data, error } = await withTimeout(
        client
          .from("profiles")
          .select("id, minecraft_username, created_at, updated_at")
          .eq("id", user.id)
          .maybeSingle(),
        6000,
        "Загрузка игрового профиля превысила 6 секунд."
      );

      if (error) {
        console.warn("[NaZerak Auth] profiles read unavailable:", error.message);
        return { status: "error", data: null };
      }

      return data
        ? { status: "found", data }
        : { status: "missing", data: null };
    } catch (error) {
      console.warn(
        "[NaZerak Auth] profiles read timed out or failed:",
        error instanceof Error ? error.message : String(error)
      );
      return { status: "error", data: null };
    }
  };

  const ensureProfile = async (user) => {
    if (!client || !user) return null;

    const lookup = await loadProfile(user);
    if (lookup.status === "found") return lookup.data;
    // Never interpret a timeout/RLS/API error as an absent row: doing so could
    // trigger an unauthorized or duplicate INSERT and obscure the real failure.
    if (lookup.status !== "missing") return null;

    try {
      const { data, error } = await withTimeout(
        client
          .from("profiles")
          .insert({ id: user.id })
          .select("id, minecraft_username, created_at, updated_at")
          .single(),
        6000,
        "Создание игрового профиля превысило 6 секунд."
      );

      if (!error) return data;

      if (
        error.code === "23505" ||
        /duplicate|unique/i.test(error.message || "")
      ) {
        const retry = await loadProfile(user);
        return retry.status === "found" ? retry.data : null;
      }

      console.warn("[NaZerak Auth] profile initialization unavailable:", error.message);
    } catch (error) {
      console.warn(
        "[NaZerak Auth] profile initialization timed out or failed:",
        error instanceof Error ? error.message : String(error)
      );
    }

    return null;
  };

  const signIn = async (button) => {
    setBusy(button, true, "Подключаем Discord…");
    showMessage("");
    setAuthStatus("CONNECTING AUTH", "loading");

    if (navigator.onLine === false) {
      setBusy(button, false);
      showMessage("Нет подключения к интернету. Проверь сеть и повтори вход.", "error");
      setAuthStatus("NETWORK OFFLINE", "error");
      return;
    }

    // The login button must be self-healing: a slow/failed CDN bootstrap
    // must not turn the visible login control into a dead button.
    if (!client && configured) {
      await bootstrapClient();
    }

    if (!client) {
      setBusy(button, false);
      showMessage(
        bootstrapError?.message ||
        "Не удалось подключить авторизацию. Обнови страницу и повтори вход.",
        "error"
      );
      setAuthStatus("AUTH ERROR", "error");
      return;
    }

    setBusy(button, true, "Переходим в Discord…");

    const redirectTarget = new URL(accountUrl());
    redirectTarget.hash = "";

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

    let error = null;
    try {
      ({ error } = await withTimeout(
        client.auth.signOut({ scope: "local" }),
        7000,
        "Выход из аккаунта превысил 7 секунд."
      ));
    } catch (caughtError) {
      error = caughtError;
    }

    if (error) {
      setBusy(button, false);
      showMessage(
        error.message || "Не удалось завершить сессию. Попробуй ещё раз.",
        "error"
      );
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

    let data = null;
    let error = null;

    try {
      const result = await withTimeout(
        client
          .from("profiles")
          .update({
            minecraft_username: value,
            updated_at: new Date().toISOString()
          })
          .eq("id", state.user.id)
          .select("id, minecraft_username, created_at, updated_at")
          .maybeSingle(),
        7000,
        "Сохранение профиля превысило 7 секунд."
      );

      data = result.data;
      error = result.error;

      if (!error && !data) {
        const insertResult = await withTimeout(
          client
            .from("profiles")
            .insert({
              id: state.user.id,
              minecraft_username: value
            })
            .select("id, minecraft_username, created_at, updated_at")
            .single(),
          7000,
          "Создание профиля превысило 7 секунд."
        );
        data = insertResult.data;
        error = insertResult.error;
      }

      if (
        error &&
        (error.code === "23505" || /duplicate|unique/i.test(error.message || ""))
      ) {
        const retryResult = await withTimeout(
          client
            .from("profiles")
            .update({
              minecraft_username: value,
              updated_at: new Date().toISOString()
            })
            .eq("id", state.user.id)
            .select("id, minecraft_username, created_at, updated_at")
            .maybeSingle(),
          7000,
          "Повторное сохранение профиля превысило 7 секунд."
        );
        data = retryResult.data;
        error = retryResult.error;
      }
    } catch (caughtError) {
      error = caughtError;
    }

    setBusy(button, false);

    if (error || !data) {
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

  const waitForInitialSession = async () => {
    if (!client) {
      return { session: null, error: new Error("Supabase client не инициализирован.") };
    }
    const result = await getSessionSafe(9000);
    if (result.data?.session?.user) {
      return { session: result.data.session, error: null };
    }

    if (result.error) {
      console.warn(
        "[NaZerak Auth] initial session lookup failed:",
        result.error.message
      );
    }

    return {
      session: null,
      error: result.error || null
    };
  };

  const syncPageAuthState = async () => {
    if (!client) return;

    const result = await getSessionSafe(6000);
    if (result.error) {
      console.warn("[NaZerak Auth] background session sync failed:", result.error.message);
      return;
    }

    const session = result.data?.session || null;
    const nextUserId = session?.user?.id || null;
    const currentUserId = state.user?.id || null;

    if (document.body.hasAttribute("data-cabinet")) {
      if (nextUserId === currentUserId && nextUserId) {
        state.user = session.user;
        state.loading = false;
        renderAuthLinks();
        return;
      }

      await requestCabinetRender(session);
      return;
    }

    state.user = session?.user || null;
    state.loading = false;
    renderAuthLinks();
  };

  let backgroundSyncTimer = null;

  const schedulePageAuthStateSync = () => {
    if (!client || backgroundSyncTimer !== null) return;

    backgroundSyncTimer = window.setTimeout(async () => {
      backgroundSyncTimer = null;
      await syncPageAuthState();
    }, 80);
  };

  const getSessionSafe = async (timeoutMs = 8000) => {
    if (!client) {
      return {
        data: { session: null },
        error: new Error("Supabase client не инициализирован.")
      };
    }

    try {
      return await withTimeout(
        client.auth.getSession(),
        timeoutMs,
        "Проверка сессии превысила 8 секунд."
      );
    } catch (error) {
      return {
        data: { session: null },
        error: error instanceof Error ? error : new Error(String(error))
      };
    }
  };

  let renderSequence = 0;

  const hydrateCabinetData = async (user, sequence) => {
    const profile = await ensureProfile(user);

    if (sequence !== renderSequence || state.user?.id !== user.id) return;

    state.profile = profile;
    renderUser(user, profile);

    const retry = qs("[data-profile-retry]");
    if (retry) retry.hidden = profile !== null;

    if (profile === null) {
      showMessage(
        "Игровой профиль пока не удалось загрузить. Сам аккаунт работает; можно повторить загрузку позже.",
        "error"
      );
    } else {
      showMessage("");
    }
  };

  const renderCabinet = async (session = undefined) => {
    if (!document.body.hasAttribute("data-cabinet")) return;
    const sequence = ++renderSequence;

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
        "Сервис авторизации не успел загрузиться.",
        "Проверь соединение и нажми «Повторить проверку»."
      );
      state.loading = false;
      return;
    }

    setAuthStatus("ПРОВЕРЯЕМ DISCORD", "loading");

    const result = session === undefined
      ? await getSessionSafe()
      : { data: { session }, error: null };
    if (sequence !== renderSequence) {
      return;
    }

    if (result.error) {
      console.warn("[NaZerak Auth] session lookup failed:", result.error.message);
      state.user = null;
      state.profile = null;
      state.loading = false;
      showMessage(
        "Не удалось проверить авторизацию вовремя. Попробуй повторить проверку.",
        "error"
      );
      setAuthStatus("AUTH TIMEOUT", "error");
      setAccountView("guest");
      return;
    }

    const resolvedUser = result.data?.session?.user || null;

    // Do not let a stale null result override a session already confirmed by
    // an auth event. Only the explicit SIGNED_OUT handler may clear that state.
    if (!resolvedUser && state.user && !state.loading) {
      renderAuthLinks();
      setAuthStatus("SIGNED IN", "signed-in");
      setAccountView("user");
      return;
    }

    state.user = resolvedUser;
    state.loading = false;
    renderAuthLinks();
    void syncForumAccount(state.user);

    if (!state.user) {
      setAuthStatus("DISCORD READY", "ready");
      setAccountView("guest");
      return;
    }
    const user = state.user;

    // The account shell is rendered immediately. Profile/history are optional
    // data and must never be allowed to hide or block the logged-in cabinet.
    renderUser(user, null);
    setAuthStatus("SIGNED IN", "signed-in");
    setAccountView("user");

    void hydrateCabinetData(user, sequence);

  };

  let cabinetRenderQueue = Promise.resolve();
  let queuedCabinetRenderKey = null;
  let lastCabinetRenderKey = null;

  const requestCabinetRender = (session = undefined) => {
    const key = session?.user?.id || (session === null ? "signed-out" : "session-lookup");
    if (queuedCabinetRenderKey === key || lastCabinetRenderKey === key) {
      return cabinetRenderQueue;
    }

    queuedCabinetRenderKey = key;
    lastCabinetRenderKey = key;
    cabinetRenderQueue = cabinetRenderQueue
      .then(
        () => renderCabinet(session),
        () => renderCabinet(session)
      )
      .finally(() => {
        if (queuedCabinetRenderKey === key) queuedCabinetRenderKey = null;
      });

    return cabinetRenderQueue;
  };

  const bootstrapClient = async () => {
    if (!configured) {
      return;
    }
    try {
      if (window.NAZERAK_SUPABASE_READY instanceof Promise) {
        await withTimeout(
          window.NAZERAK_SUPABASE_READY,
          9000,
          "Загрузка Supabase SDK превысила 9 секунд."
        );
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

    // The guest login view is the safe static fallback. Authentication upgrades
    // it to the signed-in view when a session is confirmed.
    if (document.body.hasAttribute("data-cabinet")) {
      setAccountView("guest");
      setAuthStatus("ПОДКЛЮЧЕНИЕ", "loading");
    }

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

    qsa("[data-profile-retry]").forEach((button) => {
      button.addEventListener("click", () => {
        if (state.user) void hydrateCabinetData(state.user, renderSequence);
      });
    });

    await bootstrapClient();

    if (!configured || !client) {
      renderAuthLinks();

      if (document.body.hasAttribute("data-cabinet")) {
        showLoginFallback(
          "Войти в NaZerak.",
          "Авторизация сейчас недоступна.",
          "Проверь соединение и нажми «Повторить вход через Discord»."
        );
      }
      return;
    }

    // Subscribe immediately after client creation so future OAuth/session events
    // are captured. The initial page state is resolved from getSession().
    client.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        renderSequence += 1;
        state.user = null;
        state.profile = null;
        state.loading = false;
        renderAuthLinks();
        if (document.body.hasAttribute("data-cabinet")) {
          setAuthStatus("DISCORD READY", "ready");
          setAccountView("guest");
        }
        return;
      }

      if (
        event === "INITIAL_SESSION" ||
        event === "SIGNED_IN" ||
        event === "USER_UPDATED"
      ) {
        state.user = session?.user || null;
        state.loading = false;
        renderAuthLinks();

        if (document.body.hasAttribute("data-cabinet") && session?.user) {
          void requestCabinetRender(session);
        } else if (!document.body.hasAttribute("data-cabinet")) {
          return;
        } else if (event === "USER_UPDATED") {
          void renderCabinet(null);
        }

        return;
      }

      if (session && event === "TOKEN_REFRESHED") {
        state.user = session.user;
        state.loading = false;
        renderAuthLinks();
      }
    });
    window.addEventListener("pageshow", () => {
      schedulePageAuthStateSync();
    });

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) schedulePageAuthStateSync();
    });

    window.addEventListener("storage", (event) => {
      if (event.key === null || event.key.startsWith("sb-")) {
        schedulePageAuthStateSync();
      }
    });

    const initialResult = await waitForInitialSession();

    if (document.body.hasAttribute("data-cabinet")) {
      if (initialResult.error) {
        showMessage(
          "Не удалось проверить авторизацию. Нажми «Повторить проверку» и попробуй снова.",
          "error"
        );
        setAuthStatus("AUTH TIMEOUT", "error");
        setAccountView("guest");
      } else {
        await requestCabinetRender(initialResult.session);
      }
    }
    if (!document.body.hasAttribute("data-cabinet")) {
      state.user = initialResult.session?.user || state.user || null;
      state.loading = false;
      renderAuthLinks();
    }
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
