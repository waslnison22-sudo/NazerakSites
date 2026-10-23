(() => {
  "use strict";

  const current = new URL(window.location.href);
  const params = current.searchParams;
  const fragment = new URLSearchParams(current.hash.startsWith("#") ? current.hash.slice(1) : current.hash);

  // The normal web login must keep Supabase's own PKCE callback handling.
  // Only the explicit launcher callback is forwarded to the installed app.
  if (params.get("launcher") !== "1") return;

  const code = params.get("code") || fragment.get("code");
  const oauthError = params.get("error") || params.get("error_code") || fragment.get("error") || fragment.get("error_code");
  const errorDescription = params.get("error_description") || fragment.get("error_description") || "";
  if (!code && !oauthError && !errorDescription) return;

  const target = new URL("nazerak://auth/callback");
  if (code && code.length <= 4096 && !oauthError) {
    // Forward only the short-lived authorization code. Never forward access or
    // refresh tokens through a custom protocol URL.
    target.searchParams.set("code", code);
  } else {
    target.searchParams.set("error", String(oauthError || "oauth_error").slice(0, 120));
    if (errorDescription) target.searchParams.set("error_description", errorDescription.slice(0, 500));
  }

  const main = document.createElement("main");
  main.className = "account-page";
  const container = document.createElement("div");
  container.className = "container";
  const panel = document.createElement("section");
  panel.className = "account-state-card";
  const kicker = document.createElement("span");
  kicker.className = "account-label";
  kicker.textContent = "NAZERAK LAUNCHER";
  const title = document.createElement("h2");
  title.textContent = code && !oauthError ? "Возвращаемся в лаунчер" : "Не удалось завершить вход";
  const message = document.createElement("p");
  message.textContent = code && !oauthError
    ? "Подтверждаем вход через Discord. Если приложение не открылось, нажмите кнопку ниже."
    : "Вернитесь в лаунчер и повторите вход через Discord.";
  const link = document.createElement("a");
  link.className = "button button--primary";
  link.href = target.href;
  link.textContent = "Открыть NaZerak Launcher";
  panel.append(kicker, title, message, link);
  container.append(panel);
  main.append(container);
  document.body.replaceChildren(main);

  // If Windows has registered the protocol, this opens the launcher. The page
  // remains useful as a manual fallback if the browser asks the player to click.
  window.location.replace(target.href);
})();
