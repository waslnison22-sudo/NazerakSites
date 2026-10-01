import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();

const requiredFiles = [
  "index.html",
  "cabinet.html",
  "styles.css",
  "script.js",
  "auth.js",
  "auth-config.js",
  "supabase-loader.js",
  "supabase/schema.sql",
  "404.html",
  "README.md",
  "AUTH_SETUP.md",
  "robots.txt",
  "sitemap.xml",
  "forum.html",
  "favicon.svg",
  "supabase/migrations/20260930205000_harden_frontend_column_privileges.sql",
  "scripts/runtime-smoke.mjs",
  "scripts/browser-smoke.mjs"
];

const bannedTokens = [
  "cursor-light",
  "nazerak-cube",
  "cube-face",
  "world-pixel-scene",
  "scene-block",
  "partner-pixel",
  "hero-character",
  "character-strip",
  "start-panel",
  "Адвокат"
];

const fail = [];
const info = [];

const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) fail.push(`missing file: ${file}`);
}

const index = read("index.html");
const cabinet = read("cabinet.html");
const css = read("styles.css");
const script = read("script.js");
const auth = read("auth.js");
const loader = read("supabase-loader.js");
const config = read("auth-config.js");
const schema = read("supabase/schema.sql");

const allSource = [index, cabinet, css, script, auth, loader, config, schema].join("\n");

for (const token of bannedTokens) {
  if (allSource.includes(token)) fail.push(`banned token: ${token}`);
}

if (/sb_secret_[A-Za-z0-9_-]+/.test(config)) {
  fail.push("secret-style Supabase key found in auth-config.js");
}
if (/service_role\s*[:=]\s*["']/i.test(config)) {
  fail.push("service_role key assignment found in auth-config.js");
}
if (/clientSecret\s*[:=]/i.test(config)) {
  fail.push("client secret assignment found in frontend config");
}


const publishedFiles = new Set(requiredFiles.filter((file) => fs.existsSync(path.join(root, file))));
for (const [name, page] of [
  ["index.html", index],
  ["cabinet.html", cabinet],
  ["404.html", read("404.html")]
]) {
  const refs = [...page.matchAll(/\b(?:href|src)="(\.\/[^"#?]+)"/g)].map((m) => m[1].slice(2));
  const missing = [...new Set(refs.filter((ref) => !publishedFiles.has(ref)))];
  if (missing.length) {
    fail.push(`missing local reference(s) in ${name}: ${missing.join(", ")}`);
  }

  const ids = new Set([...page.matchAll(/\bid=["']([^"']+)["']/g)].map((m) => m[1]));
  const hashRefs = [...page.matchAll(/\bhref="#([^"]+)"/g)].map((m) => m[1]);
  const missingHashes = [...new Set(hashRefs.filter((id) => !ids.has(id)))];
  if (missingHashes.length) {
    fail.push(`missing hash target(s) in ${name}: ${missingHashes.join(", ")}`);
  }
}

for (const file of ["script.js", "auth.js", "supabase-loader.js"]) {
  try {
    new Function(read(file));
  } catch (error) {
    fail.push(`JS syntax: ${file}: ${error.message}`);
  }
}

const cssOpen = (css.match(/{/g) || []).length;
const cssClose = (css.match(/}/g) || []).length;
if (cssOpen !== cssClose) {
  fail.push(`CSS braces mismatch: ${cssOpen} != ${cssClose}`);
}


const cspPages = [index, cabinet, read("404.html"), read("forum.html")];
for (const [i, page] of cspPages.entries()) {
  if (!page.includes('http-equiv="Content-Security-Policy"')) {
    fail.push(`CSP missing on page #${i + 1}`);
  }
  if (page.includes("style-src-attr 'unsafe-inline'")) {
    fail.push(`style-src-attr must not be enabled on page #${i + 1}`);
  }
  if (/<script(?![^>]*\bsrc=)[^>]*>/i.test(page)) {
    fail.push(`inline script tag found on page #${i + 1}`);
  }
  if (/\sstyle=/i.test(page)) {
    fail.push(`inline style attribute found on page #${i + 1}`);
  }

  const blankLinks = [...page.matchAll(/<a\b[^>]*target="_blank"[^>]*>/gi)].map((m) => m[0]);
  if (blankLinks.some((link) => !/rel="[^"]*noopener[^"]*"/i.test(link))) {
    fail.push(`target=_blank without noopener on page #${i + 1}`);
  }
}

const duplicateIds = (html, name) => {
  const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1]);
  const duplicates = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
  if (duplicates.length) fail.push(`duplicate IDs in ${name}: ${duplicates.join(", ")}`);
};

duplicateIds(index, "index.html");
duplicateIds(cabinet, "cabinet.html");

for (const [name, page] of [
  ["index.html", index],
  ["cabinet.html", cabinet],
  ["forum.html", read("forum.html")]
]) {
  for (const asset of ["auth-config.js?v=5", "supabase-loader.js?v=6", "auth.js?v=24", "script.js?v=12", "styles.css?v=12"]) {
    if (!page.includes(asset)) {
      fail.push(`${name} asset include missing: ${asset}`);
    }
  }
}

if (!read("404.html").includes("styles.css?v=12")) fail.push("404.html styles cache version is stale");
const sitemap = read("sitemap.xml");
if (sitemap.includes("cabinet.html") || sitemap.includes("forum.html")) fail.push("sitemap contains a noindex page");
if (!sitemap.includes("https://waslnison22-sudo.github.io/NazerakSites/")) fail.push("sitemap homepage URL is missing");
const robots = read("robots.txt");
if (!robots.includes("Disallow: /cabinet.html") || !robots.includes("Disallow: /forum.html")) fail.push("robots must block noindex account/forum routes");
if (!robots.includes("Sitemap: https://waslnison22-sudo.github.io/NazerakSites/sitemap.xml")) fail.push("robots sitemap URL is missing");


if (!index.includes("script.js") || !cabinet.includes("script.js") || !read("forum.html").includes("script.js")) {
  fail.push("script.js include missing from a published page");
}

for (const token of [
  "signInWithOAuth",
  'flowType: "pkce"',
  "persistSession: true",
  "autoRefreshToken: true",
  "detectSessionInUrl: true",
  "error_description",
  "safeHttpUrl",
  "user.id"
]) {
  if (!auth.includes(token)) fail.push(`auth guard missing: ${token}`);
}

if (!auth.includes("const withTimeout")) fail.push("request timeout guard is missing");
if (!auth.includes("profiles read timed out or failed")) fail.push("profile read timeout guard is missing");
if (!auth.includes("media history timed out or failed")) fail.push("media history timeout guard is missing");
if (!auth.includes("Сохранение профиля превысило 7 секунд.")) fail.push("profile save timeout guard is missing");
if (!auth.includes("Отправка заявки превысила 7 секунд.")) fail.push("media submit timeout guard is missing");
if (!auth.includes('client.auth.onAuthStateChange((event, session) =>')) fail.push("auth listener is missing");
const listenerIndex = auth.indexOf('client.auth.onAuthStateChange((event, session) =>');
const clientCreateIndex = auth.indexOf('client = factory(config.url, config.publishableKey');
if (listenerIndex === -1 || clientCreateIndex === -1 || listenerIndex < clientCreateIndex) fail.push("auth listener wiring is incomplete");
if (auth.indexOf('client.auth.onAuthStateChange((event, session) =>') === -1) fail.push("auth listener registration is missing");
if (!auth.includes("state.user = session?.user || null")) fail.push("global auth link state is not updated from auth events");
if (auth.indexOf('setAccountView("user")') > auth.indexOf("void hydrateCabinetData")) fail.push("cabinet waits for optional data before showing user view");
if (!auth.includes("const setButtonLabel")) fail.push("button label helper is missing");
if (!auth.includes("originalButtonLabel")) fail.push("button markup-preserving busy state is missing");
if (!auth.includes('event === "USER_UPDATED"')) fail.push("USER_UPDATED auth event is not handled");
if (!auth.includes("nazerak_auth_return_hash")) fail.push("OAuth return target storage is missing");
if (auth.includes('redirectTarget.hash = "media-application"')) fail.push("OAuth redirect still carries media fragment");

if (!auth.includes('setAccountView("loading");')) fail.push("cabinet must start in auth loading state");
if (!auth.includes('event === "TOKEN_REFRESHED"')) fail.push("token refresh event handling is missing");
if (!auth.includes(".limit(20)")) fail.push("media history query must be bounded");
if (!auth.includes("NETWORK OFFLINE")) fail.push("offline auth guard is missing");
if (!auth.includes("Повторное сохранение профиля превысило 7 секунд.")) fail.push("profile save duplicate-race recovery is missing");

if (!auth.includes("nextUserId === currentUserId && nextUserId")) fail.push("background auth sync must avoid cabinet flicker");
if (!auth.includes('setAuthStatus("DISCORD READY", "ready")')) fail.push("signed-out cabinet status reset is missing");


if (!auth.includes("detectSessionInUrl: true")) fail.push("automatic browser OAuth URL detection is missing");
if (!auth.includes("await getSessionSafe(9000)")) fail.push("initial session must be resolved through getSession");
if (!auth.includes("const waitForInitialSession")) fail.push("initial session resolver is missing");
if (!auth.includes("Do not let a stale null result override")) fail.push("stale auth-session downgrade guard is missing");
if (auth.includes("skipAutoInitialize: true")) fail.push("browser auth must use Supabase automatic initialization");
if (auth.includes("client.auth.initialize()")) fail.push("manual browser auth initialization must not be used");
if (auth.includes("client.auth.exchangeCodeForSession(code)")) fail.push("manual OAuth code exchange must not race Supabase initialization");
if (!auth.includes("const getSessionSafe")) fail.push("bounded session lookup is missing");
if (!auth.includes("requestCabinetRender(initialResult.session)")) fail.push("initial session is not rendered through cabinet render queue");
if (!auth.includes("requestCabinetRender(session)")) fail.push("auth event session is not rendered through cabinet render queue");
if (!auth.includes("window.setTimeout(() =>")) fail.push("auth state callback is not deferred");
if (!loader.includes("@supabase/supabase-js@2.117.2")) fail.push("Supabase SDK version is not pinned to 2.117.2");
if (!loader.includes("/dist/umd/supabase.js")) fail.push("Supabase loader must use explicit UMD browser bundle");

if (!loader.includes("unpkg.com")) fail.push("Supabase CDN fallback is missing");
if (script.includes("loadServerStatus") || script.includes("SERVER_STATUS_SOURCES") || script.includes("api.mcstatus.io")) fail.push("obsolete server status polling remains");
if (/online-статус.*status API/i.test(cabinet)) fail.push("cabinet still promises live server status");
if (!cabinet.includes("data-auth-retry") || !cabinet.includes("data-login-title")) fail.push("cabinet auth fallback controls are missing");
if (!auth.includes("const syncPageAuthState")) fail.push("background auth synchronization is missing");
if (!auth.includes('window.addEventListener("pageshow"')) fail.push("pageshow auth resync is missing");
if (!auth.includes('document.addEventListener("visibilitychange"')) fail.push("visibility auth resync is missing");
if (!auth.includes('window.addEventListener("storage"')) fail.push("storage auth resync is missing");
if (!auth.includes("const schedulePageAuthStateSync")) fail.push("background auth sync scheduler is missing");
if (!auth.includes('event.key === null || event.key.startsWith("sb-")')) fail.push("auth storage event filter is missing");
if (!auth.includes('label.textContent = state.user ? "Кабинет" : "Войти";')) fail.push("global auth link label state is missing");
if (/https:\/\/minecraftstatus\.com/i.test(read("404.html"))) fail.push("obsolete status host remains in 404 CSP");
if (/\.live-panel|\.section--live|#server-status-text|\.world-map\\b|\.hero-server-mark\\b/.test(css)) fail.push("obsolete live/dashboard CSS remains");
if (!/\.from\(["']profiles["']\)[\s\S]{0,220}\.update\(/.test(auth)) fail.push("profile save must use least-privilege update flow");
if (!/\.from\(["']profiles["']\)[\s\S]{0,220}\.insert\(\{\s*id:\s*user\.id/.test(auth)) fail.push("profile initialization insert is missing");
if (/nazerak\.is-a\.dev\/cabinet\.html/i.test(read("AUTH_SETUP.md"))) fail.push("obsolete custom-domain auth URL remains");
if (/server-status-text|server-players|data-server-hero/.test(index)) fail.push("obsolete server statistics markup remains");
if (!index.includes("hero-art") || !index.includes("world-visual")) fail.push("final homepage visual system missing");
if (!index.includes('data-auth-link-label>Войти')) fail.push("homepage auth link must default to neutral login state");
if (!cabinet.includes('class="nav-account is-active"') || !cabinet.includes('aria-current="page"')) fail.push("cabinet account route must be marked active");
if (!auth.includes('document.body.hasAttribute("data-cabinet")')) fail.push("cabinet page detection must use attribute presence");
if (auth.includes("document.body.dataset.cabinet")) fail.push("cabinet detection must not use empty dataset boolean");
if (!cabinet.includes('<section class="account-view" data-account-view="loading">')) fail.push("cabinet loading view must be visible before JavaScript starts");
if (!cabinet.includes('<section class="account-view" data-account-view="guest" hidden>')) fail.push("cabinet guest view must be hidden before auth resolves");
if (!cabinet.includes('<main class="account-page" id="main-content" tabindex="-1" aria-busy="true">')) fail.push("cabinet main must start in auth-busy state");
for (const [name, page] of [["index.html", index], ["cabinet.html", cabinet], ["forum.html", read("forum.html")], ["404.html", read("404.html")]]) {
  if (!page.includes("img-src 'self' data: https://cdn.discordapp.com https://media.discordapp.net")) fail.push(name + " CSP image sources are not restricted");
  if (page.includes("style-src-attr 'unsafe-inline'")) fail.push(name + " CSP still allows inline style attributes");
}
if (!auth.includes('client.auth.signOut({ scope: "local" })')) fail.push("sign-out must be local to current session");
if (!script.includes("clipboard-fallback")) fail.push("clipboard fallback class missing");
if (!q.includes('style-src-attr')) fail.push("CSP hardening guard missing");

if (!css.includes(".scroll-cue{position:absolute;right:0;bottom:22px;")) fail.push("desktop scroll cue is outside hero");

const authLinkLabel = /data-auth-link-label[^>]*>\s*([^<]+?)\s*</i;
for (const [name, page] of [["index.html", index], ["cabinet.html", cabinet], ["forum.html", read("forum.html")]]) {
  const labels = [...page.matchAll(/data-auth-link-label[^>]*>\s*([^<]+?)\s*</gi)].map((m) => m[1].trim());
  if (labels.some((label) => !["Войти", "Кабинет"].includes(label))) {
    fail.push(`unexpected auth link label in ${name}: ${labels.join(", ")}`);
  }
}
if (!index.includes('href="./forum.html"') || !cabinet.includes('href="./forum.html"')) fail.push("forum navigation link missing");
if (auth.includes(".from(\"profiles\")\n      .upsert(")) fail.push("profile initialization still uses upsert");
if (script.includes(".magnetic") || script.includes("[data-parallax]")) fail.push("unstable motion controls remain");

for (const token of [
  "alter table public.profiles enable row level security;",
  "alter table public.media_applications enable row level security;",
  'create policy "profiles_select_own"',
  'create policy "profiles_insert_own"',
  'create policy "profiles_update_own"',
  'create policy "media_applications_select_own"',
  'create policy "media_applications_insert_own"',
  "revoke all on table public.profiles, public.media_applications from anon",
  "grant insert (id, minecraft_username)",
  "grant update (minecraft_username, updated_at)",
  "grant insert (user_id, channel_url, message)",
  "grant select on public.profiles to authenticated",
  "grant select on public.media_applications to authenticated",
  "revoke insert, update, delete, references, trigger, truncate"
]) {
  if (!schema.includes(token)) fail.push(`schema guard missing: ${token}`);
}

if (!index.includes('<link rel="canonical" href="https://waslnison22-sudo.github.io/NazerakSites/">')) fail.push("homepage canonical URL is missing");
if (!index.includes('<meta property="og:url" content="https://waslnison22-sudo.github.io/NazerakSites/">')) fail.push("homepage og:url is missing");
if (!index.includes('<meta name="twitter:card" content="summary">')) fail.push("homepage twitter card is missing");
if (index.includes('class="button button--primary magnetic"') || index.includes(' class="button button--ghost magnetic"')) fail.push("dead magnetic classes remain on homepage");
if (script.includes("isTouch")) fail.push("unused touch detection remains");
if (auth.includes("authDebug")) fail.push("temporary auth diagnostics remain");
if (auth.includes("document.body.dataset.cabinet")) fail.push("boolean cabinet attribute is read through dataset");
if (!auth.includes('if (main) main.setAttribute("aria-busy", String(mode === "loading"));')) fail.push("cabinet aria-busy state sync is missing");
if (script.includes(".style.position") || script.includes(".style.left") || script.includes(".style.opacity")) fail.push("clipboard fallback must not use inline styles");
if (!script.includes("clipboard-fallback")) fail.push("clipboard fallback class is missing");
if (!auth.includes('client.auth.signOut({ scope: "local" })')) fail.push("sign-out must be local to current session");
if (!auth.includes("state.loading = false;")) fail.push("auth error state does not clear loading flag");
const profileSelectGrantCount = (schema.match(/grant select on public\.profiles to authenticated;/g) || []).length;
const profileInsertGrantCount = (schema.match(/grant insert \(id, minecraft_username\)/g) || []).length;
const mediaInsertGrantCount = (schema.match(/grant insert \(user_id, channel_url, message\)/g) || []).length;
if (profileSelectGrantCount !== 1 || profileInsertGrantCount !== 1 || mediaInsertGrantCount !== 1) fail.push("schema contains duplicate browser grant statements");

if (!index.includes('id="main-content"') || !cabinet.includes('id="main-content"')) {
  fail.push("skip-link target missing");
}

if (!cabinet.includes('<noscript>') || !index.includes('<noscript>')) {
  fail.push("noscript fallback missing");
}

info.push(`Checked ${requiredFiles.length} required files.`);
info.push(`Checked ${bannedTokens.length} banned/secret tokens.`);
info.push(`Checked HTML IDs, JavaScript syntax, CSS braces, auth guards, navigation and security headers and RLS guards.`);

if (fail.length) {
  console.error("NaZerak QA FAILED");
  for (const item of fail) console.error(" - " + item);
  process.exit(1);
}

console.log("NaZerak QA PASSED");
for (const item of info) console.log(" - " + item);
