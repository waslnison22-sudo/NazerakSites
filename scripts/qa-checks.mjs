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
  "sitemap.xml"
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


const cspPages = [index, cabinet, read("404.html")];
for (const [i, page] of cspPages.entries()) {
  if (!page.includes('http-equiv="Content-Security-Policy"')) {
    fail.push(`CSP missing on page #${i + 1}`);
  }
  if (!page.includes("style-src-attr 'unsafe-inline'")) {
    fail.push(`style-src-attr missing on page #${i + 1}`);
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

for (const asset of [
  "auth-config.js?v=3",
  "supabase-loader.js?v=2",
  "auth.js?v=4"
]) {
  if (!cabinet.includes(asset)) {
    fail.push(`cabinet auth include missing: ${asset}`);
  }
}

if (!index.includes("script.js") || !cabinet.includes("script.js")) {
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

if (!auth.includes("const getSessionSafe")) fail.push("bounded session lookup is missing");
if (!auth.includes("renderCabinet(initialSession)")) fail.push("initial session is not reused");
if (!auth.includes("renderCabinet(session || null)")) fail.push("auth event session is not reused");
if (!auth.includes("window.setTimeout(() =>")) fail.push("auth state callback is not deferred");
if (!loader.includes('VERSION = "2.117.2"')) fail.push("Supabase SDK version is not pinned");
if (!loader.includes("unpkg.com")) fail.push("Supabase CDN fallback is missing");
if (/loadServerStatus|SERVER_STATUS_SOURCES|api\\.mcstatus\\.io/.test(script)) fail.push("obsolete server status polling remains");
if (/server-status-text|server-players|data-server-hero/.test(index)) fail.push("obsolete server statistics markup remains");
if (!index.includes("hero-art-placeholder") || !index.includes("world-screenshot-placeholder")) fail.push("artwork or screenshot placeholder missing");

for (const token of [
  "enable row level security",
  'create policy "profiles_select_own"',
  'create policy "profiles_insert_own"',
  'create policy "profiles_update_own"',
  'create policy "media_applications_select_own"',
  'create policy "media_applications_insert_own"',
  "revoke all on table public.profiles, public.media_applications from anon",
  "grant insert (id, minecraft_username)",
  "grant update (minecraft_username, updated_at)",
  "grant insert (user_id, channel_url, message)",
  "revoke insert, update, delete, references, trigger, truncate"
]) {
  if (!schema.includes(token)) fail.push(`schema guard missing: ${token}`);
}

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
