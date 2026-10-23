import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();

const requiredFiles = [
  ".github/workflows/deploy-production.yml",
  "index.html",
  "cabinet.html",
  "styles.css",
  "home-hud.css",
  "cabinet-hud.css",
  "forum.css",
  "forum-v2.css",
  "scripts/forum-shell-smoke.mjs",
  "supabase/migrations/20261018193000_forum_my_public_id.sql",
  "script.js",
  "auth.js",
  "auth-config.js",
  "supabase-loader.js",
  "launcher-auth-bridge.js",
  "supabase/schema.sql",
  "404.html",
  "README.md",
  "AUTH_SETUP.md",
  "robots.txt",
  "sitemap.xml",
  "forum.html",
  "forum-category.html",
  "forum-members.html",
  "forum-search.html",
  "topic.html",
  "forum.js",
  "forum-category.js",
  "forum-members.js",
  "forum-search.js",
  "forum-ui.js",
  "topic.js",
  "forum-user.html",
  "user.js",
  "docs/stability-roadmap.md",
  "supabase/migrations/20261002234000_forum_node_tree_refactor.sql",
  "supabase/migrations/20261002235000_forum_node_directory_safe_counts.sql",
  "favicon.svg",
  "supabase/migrations/20260930205000_harden_frontend_column_privileges.sql",
  "supabase/migrations/20261002200000_forum_foundation.sql",
  "supabase/migrations/20261002210000_forum_identity_roles_profiles.sql",
  "supabase/migrations/20261002211000_forum_structure_seed.sql",
  "supabase/migrations/20261002212000_forum_public_security.sql",
  "supabase/migrations/20261002223000_forum_two_worlds_and_discord_admin.sql",
  "supabase/migrations/20261002224000_forum_topic_world_view.sql",
  "supabase/migrations/20261002225000_forum_discord_binding_hardening.sql",
  "supabase/migrations/20261002226000_forum_cached_public_counters.sql",
  "supabase/migrations/20261002227000_forum_cached_public_views.sql",
  "supabase/migrations/20261002228000_forum_public_post_select_policy.sql",
  "supabase/migrations/20261002229000_forum_community_stats.sql",
  "supabase/migrations/20261002232000_forum_section_map_v2.sql",
  "supabase/migrations/20261002233000_forum_category_posting_modes.sql",
  "supabase/migrations/20261002231000_forum_locked_topic_insert_guard.sql",
  "supabase/migrations/20261002230000_forum_permission_function_hardening.sql",
  "supabase/migrations/20261003225344_forum_runtime_integrity_20261004.sql",
  "scripts/runtime-smoke.mjs",
  "scripts/browser-smoke.mjs",
  "scripts/home-hud-smoke.mjs",
  "scripts/cabinet-hud-smoke.mjs",
  "scripts/launcher-auth-bridge-smoke.mjs",
  "assets/images/README.md",
  "assets/images/nazerak-autumn-hero.webp",
  ".htaccess",
  "scripts/qa-server.mjs",
  "supabase/migrations/20261005130500_forum_public_members_directory.sql",
  "supabase/migrations/20261007205516_forum_moderation_rpc.sql",
  "supabase/migrations/20261008133000_forum_social_features.sql",
  "supabase/migrations/20261008134000_forum_social_security_hardening.sql",
  "forum-social.js",
  "forum-reports.html",
  "forum-reports.js"
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
const forumCss = read("forum.css");
const script = read("script.js");
const auth = read("auth.js");
const launcherAuthBridge = read("launcher-auth-bridge.js");
const loader = read("supabase-loader.js");
const config = read("auth-config.js");
const schema = read("supabase/schema.sql");
const deployWorkflow = read(".github/workflows/deploy-production.yml");

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
  ["forum.html", read("forum.html")],
  ["forum-category.html", read("forum-category.html")],
  ["forum-members.html", read("forum-members.html")],
  ["forum-search.html", read("forum-search.html")],
  ["topic.html", read("topic.html")],
  ["forum-user.html", read("forum-user.html")],
  ["forum-reports.html", read("forum-reports.html")]
]) {
  const assets = ["auth-config.js?v=8", "supabase-loader.js?v=9", "auth.js?v=40", "script.js?v=24"];
  if (name === "index.html" || name === "cabinet.html") {
    assets.splice(assets.indexOf("script.js?v=24"), 1, "script.js?v=26");
  }
  if (name !== "index.html") assets.push("styles.css?v=44");
  if (name === "index.html") assets.push("home-hud.css?v=7");
  if (name === "cabinet.html") assets.push("cabinet-hud.css?v=1", "launcher-auth-bridge.js?v=1");
  if (name === "forum.html") { assets.push("forum.css?v=21", "forum-v2.css?v=2", "forum-ui.js?v=5", "forum-social.js?v=2", "forum.js?v=10"); }
  if (name === "forum-category.html") { assets.push("forum.css?v=21", "forum-v2.css?v=2", "forum-ui.js?v=5", "forum-social.js?v=2", "forum-category.js?v=6"); }
  if (name === "forum-members.html") { assets.push("forum.css?v=21", "forum-v2.css?v=2", "forum-ui.js?v=5", "forum-social.js?v=2", "forum-members.js?v=2"); }
  if (name === "forum-search.html") { assets.push("forum.css?v=21", "forum-v2.css?v=2", "forum-ui.js?v=5", "forum-social.js?v=2", "forum-search.js?v=5"); }
  if (name === "topic.html") { assets.push("forum.css?v=21", "forum-v2.css?v=2", "forum-ui.js?v=5", "forum-social.js?v=2", "topic.js?v=6"); }
  if (name === "forum-user.html") { assets.push("forum.css?v=21", "forum-v2.css?v=2", "forum-ui.js?v=5", "forum-social.js?v=2", "user.js?v=3"); }
  if (name === "forum-reports.html") { assets.push("forum.css?v=21", "forum-v2.css?v=2", "forum-ui.js?v=5", "forum-social.js?v=2", "forum-reports.js?v=1"); }
  for (const asset of assets) {
    if (!page.includes(asset)) {
      fail.push(`${name} asset include missing: ${asset}`);
    }
  }
}

if (!read("404.html").includes("styles.css?v=44")) fail.push("404.html styles cache version is stale");
const sitemap = read("sitemap.xml");
if (sitemap.includes("cabinet.html") || sitemap.includes("forum.html")) fail.push("sitemap contains a noindex page");
if (!sitemap.includes("https://nazerak.ru/")) fail.push("sitemap homepage URL is missing");
const robots = read("robots.txt");
if (!robots.includes("Disallow: /cabinet.html") || !robots.includes("Disallow: /forum.html") || !robots.includes("Disallow: /topic.html") || !robots.includes("Disallow: /forum-user.html") || !robots.includes("Disallow: /forum-category.html") || !robots.includes("Disallow: /forum-members.html") || !robots.includes("Disallow: /forum-search.html")) fail.push("robots must block all noindex account/forum routes");
if (!robots.includes("Sitemap: https://nazerak.ru/sitemap.xml")) fail.push("robots sitemap URL is missing");


if (!index.includes('class="nav-register" href="https://nazerak.ru/cabinet"')) fail.push("homepage registration must use the canonical NaZerak host");
if (!index.includes('class="nav-login" data-auth-link href="https://nazerak.ru/cabinet"')) fail.push("homepage sign-in must use the canonical NaZerak host");

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

if (!cabinet.includes('class="account-login"')) fail.push("account login layout missing");
if (!cabinet.includes("launcher-auth-bridge.js?v=1")) fail.push("cabinet is missing the desktop auth callback bridge");
if (!launcherAuthBridge.includes('params.get("launcher") !== "1"')) fail.push("launcher bridge must not intercept regular website OAuth");
if (!launcherAuthBridge.includes('new URL("nazerak://auth/callback")')) fail.push("launcher bridge return protocol is missing");
if (!launcherAuthBridge.includes('target.searchParams.set("code", code)')) fail.push("launcher bridge must forward the one-time OAuth code");
if (launcherAuthBridge.includes('target.searchParams.set("access_token"')) fail.push("launcher bridge must never forward an access token");
if (cabinet.includes("data-media-disclosure") || cabinet.includes("account-page--v3")) fail.push("obsolete cabinet architecture markup remains");
if (auth.includes("data-media-retry") || auth.includes("data-media-disclosure") || auth.includes("const submitMediaApplication")) fail.push("obsolete media workflow remains in auth code");
if (css.includes("data-media-disclosure") || /\.login-panel\b|\.account-container\b|\.account-layout\b|\.account-page--clean\b|\.account-clean\b|\.account-card-clean\b/.test(css)) fail.push("legacy cabinet CSS remains");
if (!auth.includes("const withTimeout")) fail.push("request timeout guard is missing");
if (!auth.includes("const syncForumAccount")) fail.push("Discord forum-account sync is missing");
if (/\.from\(["']profiles["']\)/.test(auth)) fail.push("website cabinet must not read or write the old Minecraft nickname profile table");
if (cabinet.includes('id="minecraft-profile-form"') || cabinet.includes("data-minecraft-input")) fail.push("website nickname form must remain removed");
if (!cabinet.includes("НАСТРОЙКА В ЛАУНЧЕРЕ") || !cabinet.includes("Этот сайт больше не запрашивает и не сохраняет Minecraft-ник")) fail.push("cabinet must direct Minecraft profile setup to the launcher");
if (!auth.includes("Загрузка Supabase SDK превысила 9 секунд.")) fail.push("Supabase SDK bootstrap wait is not bounded");

if (!auth.includes('client.auth.onAuthStateChange((event, session) =>')) fail.push("auth listener is missing");
const listenerIndex = auth.indexOf('client.auth.onAuthStateChange((event, session) =>');
const clientCreateIndex = auth.indexOf('client = factory(config.url, config.publishableKey');
if (listenerIndex === -1 || clientCreateIndex === -1 || listenerIndex < clientCreateIndex) fail.push("auth listener wiring is incomplete");
if (auth.indexOf('client.auth.onAuthStateChange((event, session) =>') === -1) fail.push("auth listener registration is missing");
if (!auth.includes("state.user = session?.user || null")) fail.push("global auth link state is not updated from auth events");
if (auth.includes("hydrateCabinetData")) fail.push("cabinet must not wait for removed website profile data");
if (!auth.includes("const setButtonLabel")) fail.push("button label helper is missing");
if (!auth.includes('const text = qs("span", element);')) fail.push("status text helper is missing");

if (!auth.includes("originalButtonLabel")) fail.push("button markup-preserving busy state is missing");
if (!auth.includes('event === "USER_UPDATED"')) fail.push("USER_UPDATED auth event is not handled");
if (auth.includes('redirectTarget.hash = "media-application"')) fail.push("OAuth redirect still carries media fragment");

if (!auth.includes('setAccountView("guest");')) fail.push("cabinet must expose guest login as safe fallback");
if (!auth.includes('event === "TOKEN_REFRESHED"')) fail.push("token refresh event handling is missing");
if (!auth.includes("NETWORK OFFLINE")) fail.push("offline auth guard is missing");


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
if (!auth.includes("window.setTimeout")) fail.push("auth async timeout/defer guard is missing");
if (!loader.includes("@supabase/supabase-js@2.117.2")) fail.push("Supabase SDK version is not pinned to 2.117.2");
if (!loader.includes("/dist/umd/supabase.js")) fail.push("Supabase loader must use explicit UMD browser bundle");

if (!loader.includes("unpkg.com")) fail.push("Supabase CDN fallback is missing");
if (script.includes("loadServerStatus") || script.includes("SERVER_STATUS_SOURCES") || script.includes("api.mcstatus.io")) fail.push("obsolete server status polling remains");
if (/online-статус.*status API/i.test(cabinet)) fail.push("cabinet still promises live server status");
if (!cabinet.includes("data-auth-retry") || !cabinet.includes("data-auth-config-copy")) fail.push("cabinet auth fallback controls are missing");
if (!auth.includes("const syncPageAuthState")) fail.push("background auth synchronization is missing");
if (!auth.includes('window.addEventListener("pageshow"')) fail.push("pageshow auth resync is missing");
if (!auth.includes('document.addEventListener("visibilitychange"')) fail.push("visibility auth resync is missing");
if (!auth.includes('window.addEventListener("storage"')) fail.push("storage auth resync is missing");
if (!auth.includes("const schedulePageAuthStateSync")) fail.push("background auth sync scheduler is missing");
if (!auth.includes('event.key === null || event.key.startsWith("sb-")')) fail.push("auth storage event filter is missing");
if (!auth.includes('label.textContent = state.user ? "Кабинет" : "Войти";')) fail.push("global auth link label state is missing");
if (/https:\/\/minecraftstatus\.com/i.test(read("404.html"))) fail.push("obsolete status host remains in 404 CSP");
if (/\.live-panel|\.section--live|#server-status-text|\.world-map\\b|\.hero-server-mark\\b/.test(css)) fail.push("obsolete live/dashboard CSS remains");


if (/nazerak\.is-a\.dev\/cabinet\.html/i.test(read("AUTH_SETUP.md"))) fail.push("obsolete custom-domain auth URL remains");
if (/server-status-text|server-players|data-server-hero/.test(index)) fail.push("obsolete server statistics markup remains");
if (!index.includes('class="hud-hero"') || !index.includes("hud-world-grid") || !index.includes("hud-connect")) fail.push("homepage visual system missing");
if (!index.includes("home-hud.css?v=7")) fail.push("isolated homepage HUD stylesheet is missing");
if (!cabinet.includes("cabinet-hud.css?v=1")) fail.push("dedicated cabinet HUD stylesheet is missing");
if (!deployWorkflow.includes('test -f "$HOME/www/nazerak.ru/cabinet-hud.css"')) fail.push("production remote-root guard does not verify the cabinet stylesheet");
if (!cabinet.includes("script.js?v=26")) fail.push("cabinet is missing the interactive shared script revision");
if (!cabinet.includes('class="brand__mark" aria-hidden="true">N</span>')) fail.push("cabinet brand mark is missing");
if (!index.includes('class="hud-about-section"') || !index.includes('class="hud-guide-section"') || !index.includes('class="hud-faq-section"')) fail.push("homepage project structure is incomplete");
if (!index.includes('class="hud-hero__image"')) fail.push("homepage must render hero asset as a full-frame image element");
if (!index.includes("Скачай лаунчер") || !index.includes("Зарегистрируйся") || !index.includes("Скачай файлы и играй")) fail.push("launcher onboarding must include all three ordered steps");
if (!index.includes("hud-launcher-download") || !index.includes('aria-disabled="true"')) fail.push("launcher download CTA must stay unavailable until a public installer exists");
if (!index.includes('src="./assets/images/nazerak-autumn-hero.webp"')) fail.push("homepage must use the local Minecraft hero asset");
if (index.includes("images.unsplash.com")) fail.push("homepage must not depend on an external stock-photo host");
if (!index.includes("M19.942 5.659") || !index.includes("viewBox=\"0 0 24 24\" aria-hidden=\"true\" focusable=\"false\"")) fail.push("Discord brand icon must use the clean vector mark");
if (!read("cabinet-hud.css").includes("body[data-cabinet] .account-login")) fail.push("cabinet redesign styles are missing");
if (!read("scripts/cabinet-hud-smoke.mjs").includes("Discord login action missing")) fail.push("cabinet browser regression tests are missing");
if (index.includes("styles.css?v=44")) fail.push("homepage must not inherit the legacy global stylesheet");
if (!read("home-hud.css").includes('url("./assets/images/nazerak-autumn-hero.webp")')) fail.push("homepage CSS fallback must use the local Minecraft hero asset");
if (index.includes("assets/images/home-hero.svg") || index.includes("home-v2") || index.includes("hero-art__grid")) fail.push("obsolete geometric homepage markup remains");
if (!index.includes("Подключиться к серверу") || !index.includes("Узнать больше")) fail.push("homepage hero actions are missing");
if (!index.includes("Discord")) fail.push("homepage community CTA is misleading or stale");
if (!index.includes('data-auth-link-label>Войти')) fail.push("homepage auth link must default to neutral login state");
if (!index.includes('<a href="#community">Сообщество</a>')) fail.push("homepage community navigation must lead to the community section");
if (!index.includes('<a href="/forum/pravila-i-dokumenty">Правила</a>')) fail.push("homepage rules navigation must lead to the rules category");
if (index.includes('<a href="#community" title="Раздел поддержки проекта">Донат</a>')) fail.push("homepage must not advertise a donation route that is not implemented");
if (!deployWorkflow.includes("--exclude='./forum-concept'")) fail.push("production deploy must keep forum-concept drafts out of public web root");
if (!deployWorkflow.includes("test -f .deploy/assets/images/nazerak-autumn-hero.webp")) fail.push("production deploy must validate the local Minecraft hero asset");
if (!deployWorkflow.includes("grep -q 'home-hud.css?v=7' .deploy/index.html")) fail.push("production deploy does not validate the isolated homepage HUD stylesheet");
if (!deployWorkflow.includes('grep -q "styles.css?v=44" "$HOME/www/nazerak.ru/forum.html" &&')) fail.push("production deploy forum stylesheet guard is stale");
if (deployWorkflow.includes("test -f .deploy/assets/images/home-hero.svg") || deployWorkflow.includes('grep -q "styles.css?v=42"')) fail.push("production deploy still contains stale homepage asset or stylesheet checks");
if (!deployWorkflow.includes('grep -q "Добро пожаловать" /tmp/nazerak-home.html')) fail.push("production deploy does not validate the new homepage content");
if (!deployWorkflow.includes('grep -q "assets/images/nazerak-autumn-hero.webp" /tmp/nazerak-home.html')) fail.push("production deploy does not validate homepage Minecraft hero path");
if (!deployWorkflow.includes('curl -k -f -L -sS -D /tmp/nazerak-hero.headers "$SITE_URL/assets/images/nazerak-autumn-hero.webp" -o /tmp/nazerak-hero.webp')) fail.push("production deploy does not verify the local Minecraft hero image");
if (!deployWorkflow.split("\n").some((line) => line.includes("rm -f --") && line.includes("home-hero.svg"))) fail.push("production deploy does not remove the obsolete homepage hero file");
if (!cabinet.includes('class="nav-account is-active"') || !cabinet.includes('aria-current="page"')) fail.push("cabinet account route must be marked active");
if (!auth.includes('document.body.hasAttribute("data-cabinet")')) fail.push("cabinet page detection must use attribute presence");
if (auth.includes("document.body.dataset.cabinet")) fail.push("cabinet detection must not use empty dataset boolean");
if (!cabinet.includes('data-account-view="guest"') && !cabinet.includes('class="account-view account-view--guest"')) fail.push("cabinet guest view must be visible as static fallback");
if (!cabinet.includes('<main class="account-page" id="main-content" tabindex="-1">')) fail.push("cabinet main markup is stale");
for (const [name, page] of [["index.html", index], ["cabinet.html", cabinet], ["forum.html", read("forum.html")], ["404.html", read("404.html")]]) {
  if (!page.includes("img-src 'self' data: https://cdn.discordapp.com https://media.discordapp.net")) fail.push(name + " CSP image sources are not restricted");
  if (page.includes("style-src-attr 'unsafe-inline'")) fail.push(name + " CSP still allows inline style attributes");
}
if (!auth.includes('client.auth.signOut({ scope: "local" })')) fail.push("sign-out must be local to current session");
if (!script.includes("clipboard-fallback")) fail.push("clipboard fallback class missing");
if (![index, cabinet, read("forum.html"), read("404.html")].every((page) => !page.includes("style-src-attr 'unsafe-inline'"))) fail.push("CSP hardening guard missing");



const authLinkLabel = /data-auth-link-label[^>]*>\s*([^<]+?)\s*</i;
for (const [name, page] of [["index.html", index], ["cabinet.html", cabinet], ["forum.html", read("forum.html")]]) {
  const labels = [...page.matchAll(/data-auth-link-label[^>]*>\s*([^<]+?)\s*</gi)].map((m) => m[1].trim());
  if (labels.some((label) => !["Войти", "Кабинет"].includes(label))) {
    fail.push(`unexpected auth link label in ${name}: ${labels.join(", ")}`);
  }
}
if (!index.includes('href="/forum"') || !cabinet.includes('href="/forum"') || !read("topic.html").includes('href="/forum"') || !read("forum-user.html").includes('href="/forum"')) fail.push("forum navigation link missing");
const forumPages = [
  ["forum.html", read("forum.html")],
  ["forum-category.html", read("forum-category.html")],
  ["forum-members.html", read("forum-members.html")],
  ["forum-search.html", read("forum-search.html")],
  ["topic.html", read("topic.html")],
  ["forum-user.html", read("forum-user.html")]
];
for (const [name, page] of forumPages) {
  if (!page.includes('href="/forum"')) fail.push(name + " forum navigation link missing");
  if (!page.includes('href="/members"')) fail.push(name + " members navigation link missing");
  if (!page.includes('href="/search"')) fail.push(name + " search navigation link missing");
}

const forumSurfaceFiles = ["forum.html","forum-category.html","forum-members.html","forum-search.html","topic.html","forum-user.html"];

for (const file of forumSurfaceFiles) {
  const page = read(file);
  if (file === "forum.html" && !page.includes("forum.css?v=21")) fail.push(file + " forum stylesheet is missing");
  if (file !== "forum.html" && !page.includes("forum.css?v=21")) fail.push(file + " forum stylesheet is missing");
}
if (css.includes("NAZERAK FORUM")) fail.push("obsolete forum cascade remains in global stylesheet");for (const file of forumSurfaceFiles) {
  const page = read(file);
  if (!page.includes("styles.css?v=44")) fail.push(file + " styles cache revision is stale");
  if (!page.includes('Content-Security-Policy')) fail.push(file + " CSP is missing");
  if (/\sstyle=/i.test(page) || page.includes("style-src-attr 'unsafe-inline'")) fail.push(file + " contains inline style/CSP allowance");
}
const forumPage = read("forum.html");
if (!forumPage.includes("data-forum-node-tree")) fail.push("forum node tree markup is missing");
if (!read("topic.html").includes("data-topic-edit-modal") || !read("topic.html").includes("data-post-edit-modal")) fail.push("topic editing UI is incomplete");
if (!read("topic.js").includes("forum_topics") || !read("topic.js").includes(".update(")) fail.push("topic update flow is missing");
if (!read("topic.js").includes("forum_posts") || !read("topic.js").includes(".update(")) fail.push("post update flow is missing");
if (!read("topic.js").includes("forum_topics") || !read("topic.js").includes(".delete(")) fail.push("topic delete flow is missing");
if (!read("topic.js").includes("forum_posts") || !read("topic.js").includes(".delete(")) fail.push("post delete flow is missing");
if (!read("forum-category.html").includes("data-category-search-form") || !read("forum-category.html").includes("data-category-pagination")) fail.push("category search/pagination controls are missing");
if (!read("topic.js").includes('rpc("forum_moderate_topic"')) fail.push("secure topic moderation RPC is not wired");
if (!/href="\/forum"(?![a-z])/i.test(forumPage)) fail.push("forum clean route is missing");
if (!read(".htaccess").includes("RewriteRule ^forum/?$ forum.html [L]")) fail.push("clean /forum rewrite is missing");
if (!read(".htaccess").includes("RewriteRule ^forum/reports/?$ forum-reports.html [L]")) fail.push("clean /forum/reports rewrite is missing");
if (!read(".htaccess").includes("RewriteRule ^members/?$ forum-members.html [L]")) fail.push("clean /members rewrite is missing");
if (!read(".htaccess").includes("RewriteRule ^search/?$ forum-search.html [L,QSA]")) fail.push("clean /search rewrite is missing");
for (const file of forumSurfaceFiles) {
  const page = read(file);
  if (/href="\.\/[^"]+\.html(?:[?#"])/i.test(page)) fail.push(file + " contains a legacy .html route link");
}
if (!read("script.js").includes("const mediaSources")) fail.push("media slot loader is missing");
if (!read("script.js").includes('slot.getAttribute("data-image-src")')) fail.push("media slots must use explicit image sources");
if (/ФОРУМ ГОТОВ|Форум готов|forum ready/i.test(forumPage) || /ФОРУМ ГОТОВ|Форум готов|forum ready/i.test(read("forum-category.html")) || /Форум готов/i.test(read("forum.js"))) fail.push("obsolete forum-ready copy remains");
for (const file of ["forum.html","forum-category.html","topic.html"]) {
  const source = read(file);
  if (/Доступен для публикации|доступна публикация|публикаци[яи].*(участник|авториз|команд)|Ответы доступны авторизованным/i.test(source)) fail.push(file + " contains redundant publication-access explanation");
}
if (/setState\(/.test(read("forum.js")) && !/const setState|function setState/.test(read("forum.js"))) fail.push("forum.js references an undefined setState helper");
if (forumPage.includes("data-forum-state") || /ФОРУМ ГОТОВ/i.test(read("forum.js"))) fail.push("obsolete forum-ready status remains");
if (read("forum-category.html").includes("data-category-policy")) fail.push("category publication-policy UI container must not remain");
if (forumPage.includes("Официальные разделы публикует команда проекта")) fail.push("obsolete topic publication access copy remains");
if (forumPage.includes("Мир администрации</h3>") || forumPage.includes("РП-мир</h3>")) fail.push("legacy two-world forum presentation remains");
if (!forumPage.includes("data-forum-search-form") || !forumPage.includes("data-forum-search-clear")) fail.push("forum search controls are incomplete");
if (!forumPage.includes("Разделы") || !forumPage.includes("Последние темы")) fail.push("forum reference action is missing");
if (![".forum-v21-layout{", ".forum-board-row{", ".topic-post{"].every((selector) => forumCss.includes(selector))) fail.push("forum stylesheet component contract is incomplete");
if (!read("forum.js").includes('e.key!=="/"')) fail.push("forum slash-to-search keyboard shortcut is missing");
for (const file of ["forum.js","forum-category.js","topic.js"]) if (!read(file).includes("Загрузка") || !read(file).includes("10000")) fail.push(file + " forum data timeout guard is missing");
if (!forumPage.includes("button--primary") || !forumPage.includes("button--ghost")) fail.push("forum must use common site button classes");
if (!read("forum-user.html").includes("data-user-profile")) fail.push("full forum profile markup missing");
if (!read("forum-ui.js").includes("data-forum-user")) fail.push("forum hover profile interaction missing");
if (read("forum.html").match(/data-forum-state|forum-state|форум готов|Форум готов/i)) fail.push("obsolete forum ready status must not return");
if (read("forum-category.html").match(/доступ.*публикац|публикац.*доступ|кто.*может.*публика/i)) fail.push("forum publication-access helper copy must not return");
if (!read("forum.html").includes('class="forum-page forum-v21"') || !read("forum.html").includes('class="forum-v21-layout"')) fail.push("forum v21 layout markup is missing");
const forumUnifiedSurfaceFiles = ["forum.html","forum-category.html","forum-members.html","forum-search.html","forum-user.html","forum-reports.html","topic.html"];
for (const file of forumUnifiedSurfaceFiles) {
  if (!read(file).includes("forum-v2.css?v=2")) fail.push(file + " is missing the unified forum stylesheet");
}
for (const route of ["new","unanswered","mine","bookmarks","watched"]) {
  if (!read(".htaccess").includes("RewriteRule ^forum/" + route + "/?$ forum.html?view=" + route)) fail.push("forum route rewrite is missing: " + route);
}
if (!read("forum.js").includes("location.pathname.match")) fail.push("forum clean-route view detection is missing");
const personalViewMigration = read("supabase/migrations/20261018193000_forum_my_public_id.sql");
if (!personalViewMigration.includes("create or replace function public.forum_my_public_id()") || !personalViewMigration.includes("set search_path = ''")) fail.push("secure public-ID RPC migration is incomplete");
if (!deployWorkflow.includes("test -f .deploy/forum-v2.css")) fail.push("production deploy does not stage the new forum stylesheet");
if (!deployWorkflow.includes('test -f "$HOME/www/nazerak.ru/forum-v2.css"')) fail.push("production remote-root guard does not verify the new forum stylesheet");


if (!read("user.js").includes('from("forum_author_directory")')) fail.push("forum user directory query missing");
for (const file of ["forum.js","forum-category.js","topic.js"]) {
  const source = read(file);
  if (!source.includes('from("forum_authors").upsert(')) fail.push(file + " forum author sync is missing");
  if (!source.includes('updated_at:new Date().toISOString()')) fail.push(file + " forum author sync must refresh updated_at");
  if (!source.includes('last_seen_at:new Date().toISOString()')) fail.push(file + " forum author sync must refresh last_seen_at");
  if (!/finally\s*\{[\s\S]{0,180}button\.disabled=false/.test(source)) fail.push(file + " submit control must be restored after request failures");
}
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
  "grant select on public.profiles to authenticated",
  "revoke insert, update, delete, references, trigger, truncate"
]) {
  if (!schema.includes(token)) fail.push(`schema guard missing: ${token}`);
}

if (!index.includes('<link rel="canonical" href="https://nazerak.ru/">')) fail.push("homepage canonical URL is missing");
if (!index.includes('<span class="brand__mark" aria-hidden="true">N</span>')) fail.push("homepage previous NaZerak mark is missing");
if (index.includes('<span class="brand__mark" aria-hidden="true"><svg viewBox="0 0 48 48"')) fail.push("temporary bars/slash brand icon returned");
if (!auth.includes('const PRODUCTION_ORIGIN = "https://nazerak.ru";')) fail.push("OAuth production origin must be pinned to nazerak.ru");
if (!auth.includes('callbackQuery.get("launcher") === "1"')) fail.push("launcher OAuth callback must be isolated from web PKCE handling");
if (!auth.includes("if (isDesktopLauncherCallback)") || !auth.includes("readyResolve?.();")) fail.push("desktop OAuth callback must resolve the auth-ready promise without starting web auth");
if (!auth.includes('new URL("/cabinet.html", isLocalDevelopmentHost() ? window.location.origin : PRODUCTION_ORIGIN).href')) fail.push("OAuth callback must use the exact documented cabinet.html URL");
if (!auth.includes('hostname.endsWith(".github.io")')) fail.push("legacy GitHub Pages must canonicalize before OAuth");
if (!auth.includes('target.searchParams.set("auth_redirect", "legacy_pages")')) fail.push("legacy OAuth callbacks must not pass PKCE data to a different origin");
if (!auth.includes('query.has("code")')) fail.push("legacy OAuth callback detection is missing");
if (!auth.includes("OLD CALLBACK URL")) fail.push("legacy OAuth callback must explain that the user needs to retry on the official domain");
const legacyCallbackStart = auth.indexOf("if (isAuthCallback)");
const legacyCallbackElse = auth.indexOf("} else {", legacyCallbackStart);
const legacyCallbackReplace = auth.indexOf("window.location.replace(target.href)", legacyCallbackElse);
const legacyCallbackBranch = auth.slice(legacyCallbackStart, legacyCallbackElse);
const legacyNonAuthBranch = auth.slice(legacyCallbackElse, legacyCallbackReplace);
if (legacyCallbackStart < 0 || legacyCallbackElse < 0 || legacyCallbackReplace < 0 ||
    !legacyCallbackBranch.includes('target.searchParams.set("auth_redirect", "legacy_pages")') ||
    legacyCallbackBranch.includes("target.search = window.location.search") ||
    legacyCallbackBranch.includes("target.hash = window.location.hash") ||
    !legacyNonAuthBranch.includes("target.search = window.location.search") ||
    !legacyNonAuthBranch.includes("target.hash = window.location.hash")) {
  fail.push("legacy callback must discard auth data while preserving query/hash only for ordinary navigation");
}
if (!auth.includes('document.addEventListener("error", restoreAvatarFallback, true);')) fail.push("failed profile images must have a fallback");
for (const pagePath of ["index.html","cabinet.html","forum.html","forum-category.html","forum-members.html","forum-search.html","topic.html","forum-user.html","forum-reports.html"]) {
  const page = read(pagePath);
  if (!page.includes("https://images-ext-1.discordapp.net")) fail.push(pagePath + " CSP does not allow the Discord image proxy");
  if (!page.includes("auth.js?v=40")) fail.push(pagePath + " is missing updated auth.js");
  if (!page.includes("favicon.svg?v=8")) fail.push(pagePath + " is missing restored favicon cache key");
}
if (!read("404.html").includes("favicon.svg?v=8")) fail.push("404 page is missing restored favicon cache key");
if (!index.includes('<meta property="og:url" content="https://nazerak.ru/">')) fail.push("homepage og:url is missing");
if (!index.includes('<meta name="twitter:card"')) fail.push("homepage twitter card is missing");
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
if (profileSelectGrantCount !== 1 || profileInsertGrantCount !== 1 || mediaInsertGrantCount !== 0) fail.push("schema contains unexpected media browser grants");
if (!schema.includes("-- Media applications intentionally have no browser grants yet.")) fail.push("media browser grants must remain disabled until moderation exists");

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

