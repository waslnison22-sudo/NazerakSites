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
  "404.html"
];

const bannedTokens = [
  "sb_secret_",
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

const duplicateIds = (html, name) => {
  const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map((match) => match[1]);
  const duplicates = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
  if (duplicates.length) fail.push(`duplicate IDs in ${name}: ${duplicates.join(", ")}`);
};

duplicateIds(index, "index.html");
duplicateIds(cabinet, "cabinet.html");

for (const asset of [
  "auth-config.js?v=2",
  "supabase-loader.js?v=1",
  "auth.js?v=3",
  "script.js"
]) {
  if (!index.includes(asset) || !cabinet.includes(asset)) {
    fail.push(`script include mismatch: ${asset}`);
  }
}

for (const id of [
  "server-status-text",
  "server-status-detail",
  "server-players",
  "server-ping",
  "server-reported-version",
  "server-refresh",
  "server-ip"
]) {
  if (!index.includes(`id="${id}"`)) fail.push(`missing server ID: ${id}`);
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

if (!loader.includes('VERSION = "2.117.2"')) fail.push("Supabase SDK version is not pinned");
if (!loader.includes("unpkg.com")) fail.push("Supabase CDN fallback is missing");
if (!script.includes("8000")) fail.push("server status timeout is missing");
if (!script.includes('addEventListener("online"')) fail.push("online recovery is missing");

for (const token of [
  "enable row level security",
  'create policy "profiles_select_own"',
  'create policy "profiles_insert_own"',
  'create policy "profiles_update_own"',
  'create policy "media_applications_select_own"',
  'create policy "media_applications_insert_own"',
  "revoke all on table public.profiles, public.media_applications from anon"
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
info.push(`Checked HTML IDs, JavaScript syntax, CSS braces, auth guards, server guards and RLS guards.`);

if (fail.length) {
  console.error("NaZerak QA FAILED");
  for (const item of fail) console.error(" - " + item);
  process.exit(1);
}

console.log("NaZerak QA PASSED");
for (const item of info) console.log(" - " + item);
