import { chromium } from "playwright";
import fs from "node:fs";

const BASE = (process.env.NAZERAK_BASE_URL || "http://127.0.0.1:4173").replace(/\/$/, "");
const TIMEOUT = 20000;

const attachDiagnostics = (page, name) => {
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    failedRequests.push({
      url: request.url(),
      error: request.failure()?.errorText || "unknown"
    });
  });

  return () => {
    const localFailures = failedRequests.filter((item) => {
      const localBase = new URL(BASE);
      return item.url.startsWith(localBase.origin + localBase.pathname);
    });

    const unexpectedConsoleErrors = name === "404"
      ? consoleErrors.filter((message) => !message.includes("status of 404"))
      : consoleErrors;

    if (unexpectedConsoleErrors.length || pageErrors.length || localFailures.length) {
      throw new Error(
        name + " diagnostics failed: " +
        JSON.stringify({ consoleErrors: unexpectedConsoleErrors, pageErrors, localFailures })
      );
    }
  };
};

const assertNoHorizontalOverflow = async (page, name) => {
  const result = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    viewport: window.innerWidth
  }));
  if (result.width > result.viewport + 1) {
    throw new Error(name + " has horizontal overflow: " + JSON.stringify(result));
  }
};

const assertAccessibleControls = async (page, name) => {
  const result = await page.evaluate(() => {
    const controls = [...document.querySelectorAll("button, a")].filter((el) => !el.hidden);
    const badControls = controls.filter((el) => {
      const label = (
        el.getAttribute("aria-label") ||
        el.textContent ||
        el.getAttribute("title") ||
        ""
      ).replace(/\s+/g, " ").trim();
      return !label;
    });
    const fields = [...document.querySelectorAll("input, textarea, select")].filter((el) => !el.hidden);
    const badFields = fields.filter((el) =>
      !el.labels?.length &&
      !el.getAttribute("aria-label") &&
      !el.getAttribute("aria-labelledby")
    );
    return {
      badControls: badControls.map((el) => ({ tag: el.tagName, href: el.getAttribute("href") })),
      badFields: badFields.map((el) => ({ id: el.id, name: el.getAttribute("name") }))
    };
  });

  if (result.badControls.length || result.badFields.length) {
    throw new Error(name + " accessibility labels invalid: " + JSON.stringify(result));
  }
};

const assertForumVisualBaseline = async (page, name) => {
  const result = await page.evaluate(() => {
    const root = document.querySelector(".forum-page, .topic-page, .forum-user-page");
    if (!root) return null;
    const visible = (el) => {
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return !el.hidden && style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };
    const controls = [...document.querySelectorAll(
      ".forum-page button, .topic-page button, .forum-user-page button, .topbar .nav-toggle, .topbar .nav > a"
    )].filter(visible);
    const undersized = controls.map((el) => {
      const rect = el.getBoundingClientRect();
      return { label: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 48), width: Math.round(rect.width), height: Math.round(rect.height) };
    }).filter((item) => item.width < 44 || item.height < 44);
    const primaryTextSelectors = [
      "h1", "h2", "h3", ".forum-board-row__forum strong",
      ".forum-thread-row__title", ".forum-topic-row__copy h3",
      ".forum-member-card__body strong", ".topic-post__body",
      ".forum-hero p", ".forum-section-head p"
    ];
    const tinyText = primaryTextSelectors.flatMap((selector) =>
      [...root.querySelectorAll(selector)].filter(visible).map((el) => ({
        selector, text: (el.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 48),
        size: parseFloat(getComputedStyle(el).fontSize)
      }))
    ).filter((item) => item.size < 14);
    const outside = [...root.querySelectorAll("*")].filter(visible).map((el) => {
      const rect = el.getBoundingClientRect();
      return { tag: el.tagName, className: typeof el.className === "string" ? el.className : "", left: Math.round(rect.left), right: Math.round(rect.right) };
    }).filter((item) => item.left < -1 || item.right > innerWidth + 1).slice(0, 8);
    return { undersized, tinyText, outside, viewport: innerWidth, pageWidth: document.documentElement.scrollWidth };
  });
  if (!result) return;
  if (result.undersized.length) throw new Error(name + " forum controls below 44px target: " + JSON.stringify(result.undersized));
  if (result.tinyText.length) throw new Error(name + " primary forum text below 14px: " + JSON.stringify(result.tinyText));
  if (result.outside.length || result.pageWidth > result.viewport + 1) {
    throw new Error(name + " forum content extends beyond viewport: " + JSON.stringify({ outside: result.outside, pageWidth: result.pageWidth, viewport: result.viewport }));
  }
};

const testSameOriginLinks = async (page, name) => {
  const routes = await page.evaluate(() =>
    [...document.querySelectorAll("a[href]")]
      .map((a) => a.href)
      .filter((href) => href.startsWith(location.origin + "/"))
      .map((href) => new URL(href))
      .map((url) => url.pathname + url.hash)
  );

  for (const route of [...new Set(routes)]) {
    const [pathname, hash] = route.split("#");
    const allowed = pathname === "/" || pathname === "/cabinet" || pathname === "/forum" || pathname === "/members" || pathname === "/search" ||
      /^\/forum\/[^/]+$/.test(pathname) || /^\/forum\/topic\/[^/]+$/.test(pathname) || /^\/user\/[^/]+$/.test(pathname);
    if (!allowed) {
      throw new Error(name + " contains an unexpected local route: " + route);
    }
    if (hash && pathname === new URL(page.url()).pathname) {
      const exists = await page.evaluate((targetId) => Boolean(document.getElementById(targetId)), hash);
      if (!exists) throw new Error(name + " local anchor target missing: " + route);
    }
  }
};

const testOAuthStart = async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  let authorizeRequest = null;

  await page.route("https://ujlbyzvdsncvqbrhasuw.supabase.co/auth/v1/authorize**", async (route) => {
    authorizeRequest = route.request().url();
    await route.abort();
  });

  try {
    await page.goto(BASE + "/cabinet", { waitUntil: "networkidle", timeout: TIMEOUT });
    await page.waitForFunction(() => {
      const guest = document.querySelector('[data-account-view="guest"]');
      const loading = document.querySelector('[data-account-view="loading"]');
      return Boolean(guest && !guest.hidden && !loading && document.querySelector("main")?.getAttribute("aria-busy") === "false");
    }, { timeout: 15000 });

    await page.locator("[data-discord-login]").click();
    await page.waitForTimeout(800);

    if (!authorizeRequest) {
      throw new Error("Discord OAuth authorize endpoint was not requested");
    }

    const parsed = new URL(authorizeRequest);
    if (parsed.searchParams.get("provider") !== "discord" && !parsed.pathname.endsWith("/authorize")) {
      throw new Error("OAuth authorize request does not look like a Discord authorization request: " + authorizeRequest);
    }
    if (parsed.searchParams.get("redirect_to") !== BASE + "/cabinet") {
      throw new Error("OAuth redirect_to is not /cabinet: " + (parsed.searchParams.get("redirect_to") || ""));
    }

    console.log("PASS: OAuth start");
  } finally {
    await browser.close();
  }
};

const testStaticPage = async ({ path, name, viewport, check }) => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport });
  const finishDiagnostics = attachDiagnostics(page, name);

  try {
    await page.goto(BASE + path, { waitUntil: "networkidle", timeout: TIMEOUT });
    await check(page);
    await assertForumVisualBaseline(page, name);
    if (await page.locator(".forum-page, .topic-page, .forum-user-page").count()) {
      fs.mkdirSync("artifacts/forum-hud", { recursive: true });
      const slug = name.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
      await page.screenshot({ path: `artifacts/forum-hud/${slug}-${viewport.width}x${viewport.height}.png`, fullPage: false });
    }
    await assertAccessibleControls(page, name);
    await testSameOriginLinks(page, name);
    await assertNoHorizontalOverflow(page, name);
    finishDiagnostics();
    console.log("PASS:", name);
  } finally {
    await browser.close();
  }
};

const testCabinetAnonymous = async (viewport, name) => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const finishDiagnostics = attachDiagnostics(page, name);

  try {
    await page.goto(BASE + "/cabinet", { waitUntil: "networkidle", timeout: TIMEOUT });
    await page.waitForSelector("[data-account-view]", { state: "attached", timeout: TIMEOUT });
    await page.waitForFunction(() => {
      const loading = document.querySelector('[data-account-view="loading"]');
      const guest = document.querySelector('[data-account-view="guest"]');
      return Boolean(guest && !guest.hidden && !loading && document.querySelector("main")?.getAttribute("aria-busy") === "false");
    }, { timeout: 15000 });

    const state = await page.evaluate(() => ({
      status: document.querySelector("[data-auth-status]")?.textContent || "",
      statusRole: document.querySelector("[data-auth-status]")?.getAttribute("role") || "",
      statusLive: document.querySelector("[data-auth-status]")?.getAttribute("aria-live") || "",
      loading: Boolean(document.querySelector('[data-account-view="loading"]') && !document.querySelector('[data-account-view="loading"]')?.hidden),
      guest: !document.querySelector('[data-account-view="guest"]')?.hidden,
      user: !document.querySelector('[data-account-view="user"]')?.hidden,
      busy: document.querySelector("main")?.getAttribute("aria-busy") || ""
    }));

    if (state.loading || !state.guest || state.user || state.busy === "true") {
      throw new Error(name + " reached an invalid anonymous state: " + JSON.stringify(state));
    }
    if (state.statusRole !== "status" || state.statusLive !== "polite") {
      throw new Error(name + " auth status is not accessible: " + JSON.stringify(state));
    }

    await assertAccessibleControls(page, name);
    await testSameOriginLinks(page, name);
    await assertNoHorizontalOverflow(page, name);
    finishDiagnostics();
    console.log("PASS:", name, JSON.stringify(state));
  } finally {
    await browser.close();
  }
};

const installFakeSupabase = async (context) => {
  await context.addInitScript(() => {
    const fakeUser = {
      id: "11111111-1111-1111-1111-111111111111",
      created_at: "2026-01-01T00:00:00.000Z",
      last_sign_in_at: "2026-10-01T00:00:00.000Z",
      user_metadata: {
        global_name: "NaZerak Test",
        full_name: "NaZerak Test",
        user_name: "nazerak_test"
      }
    };
    const fakeSession = {
      access_token: "fake-access-token",
      refresh_token: "fake-refresh-token",
      user: fakeUser
    };
    window.__nazerakFakeMetrics = { profileTableAccess: 0 };
    window.supabase = {
      createClient() {
        const auth = {
          onAuthStateChange(handler) {
            window.setTimeout(() => handler("INITIAL_SESSION", fakeSession), 0);
            return { data: { subscription: { unsubscribe() {} } } };
          },
          getSession: async () => ({ data: { session: fakeSession }, error: null }),
          signInWithOAuth: async () => ({ data: {}, error: null }),
          signOut: async () => ({ error: null })
        };
        const makeChain = (table) => {
          const chain = {
            select() { return chain; },
            eq() { return chain; },
            order() { return chain; },
            limit() { return chain; },
            insert() { return chain; },
            update() { return chain; },
            upsert() { return chain; },
            delete() { return chain; },
            maybeSingle: async () => ({ data: null, error: null }),
            single: async () => ({ data: null, error: null }),
            then(resolve, reject) {
              return Promise.resolve({ data: null, error: null }).then(resolve, reject);
            }
          };
          return chain;
        };
        return {
          auth,
          from: (table) => {
            if (table === "profiles") window.__nazerakFakeMetrics.profileTableAccess += 1;
            return makeChain(table);
          }
        };
      }
    };
  });
};

const testCabinetSignedIn = async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await installFakeSupabase(context);
  const page = await context.newPage();
  const finishDiagnostics = attachDiagnostics(page, "cabinet signed-in");

  try {
    await page.goto(BASE + "/cabinet", { waitUntil: "networkidle", timeout: TIMEOUT });
    await page.waitForSelector('[data-account-view="user"]:not([hidden])', { timeout: 10000 });

    const state = await page.evaluate(() => ({
      status: document.querySelector("[data-auth-status]")?.textContent || "",
      name: document.querySelector("[data-user-name]")?.textContent || "",
      guest: !document.querySelector('[data-account-view="guest"]')?.hidden,
      loading: Boolean(document.querySelector('[data-account-view="loading"]') && !document.querySelector('[data-account-view="loading"]')?.hidden),
      user: !document.querySelector('[data-account-view="user"]')?.hidden,
      busy: document.querySelector("main")?.getAttribute("aria-busy") || "",
      profileTableAccess: window.__nazerakFakeMetrics.profileTableAccess,
      nicknameForm: Boolean(document.querySelector("#minecraft-profile-form,[data-minecraft-input]")),
      launcherNotice: document.querySelector(".account-panel--minecraft .account-state-card h3")?.textContent || ""
    }));

    if (!state.user || state.guest || state.loading || state.name !== "NaZerak Test" || state.busy === "true") {
      throw new Error("signed-in cabinet state invalid: " + JSON.stringify(state));
    }
    if (state.nicknameForm) throw new Error("website cabinet must not expose Minecraft nickname editing");
    if (state.profileTableAccess !== 0) throw new Error("website auth still accesses the old Minecraft nickname profile table");
    if (!state.launcherNotice.toLowerCase().includes("лаунчере")) throw new Error("Minecraft setup must be directed to the NaZerak Launcher");

    const minecraftPanel = page.locator("#minecraft-profile");
    const connectionPanel = page.locator("#connection");
    const securityPanel = page.locator("#security");
    if (await minecraftPanel.count() !== 1 || await connectionPanel.count() !== 1 || await securityPanel.count() !== 1) {
      throw new Error("redesigned cabinet sections are incomplete");
    }

    const serverIp = (await page.locator(".connection-card__ip").textContent() || "").trim();
    if (serverIp !== "nazehard.rustix.cc") {
      throw new Error("cabinet server address missing or stale: " + serverIp);
    }

    const copyButton = page.locator('[data-copy="nazehard.rustix.cc"]');
    if (await copyButton.count() !== 1 || !(await copyButton.isVisible())) {
      throw new Error("cabinet server copy control is missing");
    }

    const logoutButtons = page.locator("[data-sign-out]");
    if (await logoutButtons.count() < 2) {
      throw new Error("cabinet security/logout controls are incomplete");
    }

    const linkLabel = await page.locator("[data-auth-link-label]").textContent();
    if ((linkLabel || "").trim() !== "Кабинет") {
      throw new Error("signed-in navigation link did not switch to Кабинет");
    }

    await page.evaluate(() => window.NaZerakAuth.signOut());
    await page.waitForFunction(() => window.location.pathname === "/" || window.location.pathname.endsWith("/"), { timeout: 5000 });
    finishDiagnostics();
  } finally {
    await browser.close();
  }
};

const test404 = async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const finishDiagnostics = attachDiagnostics(page, "404");
  try {
    const missingResponse = await page.goto(
      BASE + "/__nazerak_missing_route__.html",
      { waitUntil: "networkidle", timeout: TIMEOUT }
    );
    if (!missingResponse || missingResponse.status() !== 404) {
      throw new Error("missing route did not return HTTP 404");
    }

    const customResponse = await page.goto(
      BASE + "/404.html",
      { waitUntil: "networkidle", timeout: TIMEOUT }
    );
    if (!customResponse || customResponse.status() !== 200) {
      throw new Error("custom 404.html page is not directly reachable");
    }
    if (!(await page.locator("h1").textContent()).includes("404")) {
      throw new Error("custom 404 heading missing");
    }

    await assertAccessibleControls(page, "404");
    await testSameOriginLinks(page, "404");
    await assertNoHorizontalOverflow(page, "404");
    finishDiagnostics();
    console.log("PASS: 404");
  } finally {
    await browser.close();
  }
};

await test404();

await testOAuthStart();
await testCabinetAnonymous({ width: 1440, height: 1000 }, "cabinet anonymous desktop");
await testCabinetAnonymous({ width: 390, height: 844 }, "cabinet anonymous mobile");
await testCabinetAnonymous({ width: 768, height: 1024 }, "cabinet tablet");

await testCabinetSignedIn();

console.log("NaZerak browser smoke PASSED");