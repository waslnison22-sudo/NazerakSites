import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const source = fs.readFileSync(path.join(process.cwd(), "launcher-auth-bridge.js"), "utf8");

function runBridge(href) {
  const body = {
    children: [],
    replaceChildren(...children) { this.children = children; },
  };
  function createElement(tagName) {
    return {
      tagName,
      className: "",
      href: "",
      textContent: "",
      children: [],
      append(...children) { this.children.push(...children); },
    };
  }
  let redirectedTo = null;
  const window = {
    location: {
      href,
      replace(target) { redirectedTo = target; },
    },
  };
  const document = { body, createElement };
  vm.runInNewContext(source, { window, document, URL, URLSearchParams });
  return { redirectedTo, body };
}

{
  const result = runBridge("https://nazerak.ru/cabinet?code=website-pkce-code");
  assert.equal(result.redirectedTo, null, "normal website OAuth must remain in the website");
  assert.equal(result.body.children.length, 0, "normal website OAuth must not replace cabinet content");
}

{
  const result = runBridge("https://nazerak.ru/cabinet?launcher=1&code=one-time-code&access_token=secret&refresh_token=secret-refresh");
  assert.equal(result.redirectedTo, "nazerak://auth/callback?code=one-time-code", "launcher OAuth must return only the one-time code");
  assert.ok(!result.redirectedTo.includes("access_token"), "access tokens must not be placed in the protocol URL");
  assert.ok(!result.redirectedTo.includes("refresh_token"), "refresh tokens must not be placed in the protocol URL");
  assert.equal(result.body.children.length, 1, "fallback UI should render in case the browser blocks the app link");
}

{
  const result = runBridge("https://nazerak.ru/cabinet?launcher=1&error=access_denied&error_description=user%20cancelled");
  const target = new URL(result.redirectedTo);
  assert.equal(target.protocol, "nazerak:");
  assert.equal(target.hostname, "auth");
  assert.equal(target.pathname, "/callback");
  assert.equal(target.searchParams.get("error"), "access_denied");
  assert.equal(target.searchParams.get("error_description"), "user cancelled");
}

{
  const result = runBridge("https://nazerak.ru/cabinet?launcher=1#error=access_denied&error_description=fragment%20cancel");
  const target = new URL(result.redirectedTo);
  assert.equal(target.protocol, "nazerak:");
  assert.equal(target.hostname, "auth");
  assert.equal(target.searchParams.get("error"), "access_denied");
  assert.equal(target.searchParams.get("error_description"), "fragment cancel");
}

{
  const oversizedCode = "x".repeat(4097);
  const result = runBridge("https://nazerak.ru/cabinet?launcher=1&code=" + oversizedCode);
  assert.ok(result.redirectedTo, "invalid oversized code must return a safe error to the launcher");
  const target = new URL(result.redirectedTo);
  assert.equal(target.searchParams.has("code"), false, "oversized code must never be forwarded");
  assert.equal(target.searchParams.get("error"), "oauth_error");
}

console.log("Launcher auth bridge smoke passed: web OAuth isolation, PKCE code handoff, token exclusion and error flow.");
