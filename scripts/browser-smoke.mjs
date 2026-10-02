import { chromium } from "playwright";

const BASE = (process.env.NAZERAK_BASE_URL || "https://waslnison22-sudo.github.io/NazerakSites").replace(/\/$/, "");
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
    const localFailures = failedRequests.filter((item) =>
      /waslnison22-sudo\.github\.io\/NazerakSites\/(?:[^/]+\.(?:css|js)|[^/]+\/[^/]+\.(?:css|js))/.test(item.url)
    );

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

const testSameOriginLinks = async (page, name) => {
  const routes = await page.evaluate(() =>
    [...document.querySelectorAll("a[href]")]
      .map((a) => a.href)
      .filter((href) => href.startsWith(location.origin + "/NazerakSites") || href.startsWith(location.origin + "/NazerakSites/"))
      .map((href) => new URL(href))
      .map((url) => url.pathname + url.hash)
  );

  for (const route of [...new Set(routes)]) {
    const [pathname, hash] = route.split("#");
    if (!["/NazerakSites/", "/NazerakSites/cabinet.html", "/NazerakSites/forum.html", "/NazerakSites/forum-category.html", "/NazerakSites/forum-members.html", "/NazerakSites/forum-search.html", "/NazerakSites/topic.html", "/NazerakSites/forum-user.html", "/NazerakSites/AUTH_SETUP.md", "/NazerakSites/DOMAIN_MIGRATION.md"].includes(pathname)) {
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
    await page.goto(BASE + "/cabinet.html", { waitUntil: "networkidle", timeout: TIMEOUT });
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
    if (parsed.searchParams.get("redirect_to") !== BASE + "/cabinet.html") {
      throw new Error("OAuth redirect_to is not cabinet.html: " + (parsed.searchParams.get("redirect_to") || ""));
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
    await page.goto(BASE + "/cabinet.html", { waitUntil: "networkidle", timeout: TIMEOUT });
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
      loading: !document.querySelector('[data-account-view="loading"]')?.hidden,
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

    const profile = () => ({
      id: fakeUser.id,
      minecraft_username: "NaZerakTest",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z"
    });
    const smokeMode = new URLSearchParams(window.location.search).get("smoke");
    window.__nazerakFakeMetrics = { profileReads: 0, profileInserts: 0 };

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
            insert() {
              if (table === "profiles") window.__nazerakFakeMetrics.profileInserts += 1;
              return chain;
            },
            update() { return chain; },
            maybeSingle: async () => {
              if (table === "profiles") window.__nazerakFakeMetrics.profileReads += 1;
              if (smokeMode === "profile-timeout" && table === "profiles" && window.__nazerakFakeMetrics.profileReads === 1) {
                return new Promise(() => {});
              }
              if (smokeMode === "profile-error" && table === "profiles") {
                return { data: null, error: { message: "simulated RLS read failure" } };
              }
              return { data: table === "profiles" ? profile() : null, error: null };
            },
            single: async () => ({ data: profile(), error: null }),
            then(resolve, reject) {
              return Promise.resolve({ data: null, error: null }).then(resolve, reject);
            }
          };
          return chain;
        };

        return {
          auth,
          from: (table) => makeChain(table)
        };
      }
    };
  });
};

const testCabinetProfileTimeout = async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await installFakeSupabase(context);
    const page = await context.newPage();
    const finishDiagnostics = attachDiagnostics(page, "cabinet profile timeout");

    await page.goto(BASE + "/cabinet.html?smoke=profile-timeout", { waitUntil: "networkidle", timeout: TIMEOUT });
    await page.waitForSelector('[data-account-view="user"]:not([hidden])', { timeout: 5000 });
    await page.waitForFunction(() =>
      (document.querySelector("[data-auth-message]")?.textContent || "").includes("Игровой профиль пока не удалось загрузить")
    , { timeout: 9000 });

    const state = await page.evaluate(() => ({
      userVisible: !document.querySelector('[data-account-view="user"]').hidden,
      busy: document.querySelector("main")?.getAttribute("aria-busy"),
      metrics: window.__nazerakFakeMetrics
    }));
    if (!state.userVisible || state.busy === "true" || state.metrics.profileInserts !== 0) {
      throw new Error("profile timeout changed auth state or attempted INSERT: " + JSON.stringify(state));
    }

    const profileRetry = page.locator("[data-profile-retry]");
    if (!(await profileRetry.isVisible())) throw new Error("profile retry control is not visible after failure");
    await profileRetry.click();
    await page.waitForFunction(() =>
      document.querySelector("[data-minecraft-input]")?.value === "NaZerakTest"
    , { timeout: 5000 });

    const recoveredProfile = await page.evaluate(() => window.__nazerakFakeMetrics);
    if (recoveredProfile.profileReads < 2 || recoveredProfile.profileInserts !== 0) {
      throw new Error("profile retry did not recover without INSERT: " + JSON.stringify(recoveredProfile));
    }
    finishDiagnostics();
    await context.close();
    console.log("PASS: profile timeout isolation");
  } finally {
    await browser.close();
  }
};

const testCabinetSignedIn = async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await installFakeSupabase(context);
  const page = await context.newPage();
  const finishDiagnostics = attachDiagnostics(page, "cabinet signed-in");

  try {
    await page.goto(BASE + "/cabinet.html", { waitUntil: "networkidle", timeout: TIMEOUT });
    await page.waitForSelector('[data-account-view="user"]:not([hidden])', { timeout: 10000 });

    const state = await page.evaluate(() => ({
      status: document.querySelector("[data-auth-status]")?.textContent || "",
      name: document.querySelector("[data-user-name]")?.textContent || "",
      guest: !document.querySelector('[data-account-view="guest"]')?.hidden,
      loading: !document.querySelector('[data-account-view="loading"]')?.hidden,
      user: !document.querySelector('[data-account-view="user"]')?.hidden,
      busy: document.querySelector("main")?.getAttribute("aria-busy") || ""
    }));

    if (!state.user || state.guest || state.loading || state.name !== "NaZerak Test" || state.busy === "true") {
      throw new Error("signed-in cabinet state invalid: " + JSON.stringify(state));
    }

    const input = page.locator("#minecraft-username");
    await input.fill("NaZerakTest");
    await page.locator('#minecraft-profile-form button[type="submit"]').click();
    await page.waitForFunction(() =>
      (document.querySelector("[data-auth-message]")?.textContent || "").includes("сохранён")
    , { timeout: 5000 });

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
    await page.waitForFunction(() => window.location.pathname.endsWith("/NazerakSites/"), { timeout: 5000 });
  } finally {
    await browser.close();
  }
};

await testStaticPage({
  path: "/",
  name: "homepage desktop",
  viewport: { width: 1440, height: 1000 },
  check: async (page) => {
    if (!(await page.title()).includes("NaZerak")) throw new Error("homepage title missing");
    if (!(await page.locator("#server-ip").textContent()).includes("nazehard.rustix.cc")) {
      throw new Error("server IP missing");
    }
    const links = await page.locator('a[target="_blank"]').evaluateAll((items) =>
      items.every((item) => /noopener/.test(item.getAttribute("rel") || ""))
    );
    if (!links) throw new Error("external blank links missing noopener");
  }
});

await testStaticPage({
  path: "/",
  name: "homepage mobile",
  viewport: { width: 390, height: 844 },
  check: async (page) => {
    const toggle = page.locator(".nav-toggle");
    await toggle.click();
    if (!(await page.locator(".nav").evaluate((node) => node.classList.contains("is-open")))) {
      throw new Error("mobile navigation did not open");
    }
    await page.keyboard.press("Escape");
    if (await page.locator(".nav").evaluate((node) => node.classList.contains("is-open"))) {
      throw new Error("mobile navigation did not close with Escape");
    }
  }
});

await testStaticPage({
  path: "/forum.html",
  name: "forum index",
  viewport: { width: 1280, height: 900 },
  check: async (page) => {
    if (!(await page.locator("h1").textContent()).includes("Форум")) throw new Error("forum heading missing");
    if (await page.locator('[data-forum-board-rows="rp"] .forum-board-row').count() < 1) {
      throw new Error("RP forum board did not load");
    }
    if (await page.locator('[data-forum-board-rows="administration"] .forum-board-row').count() < 1) {
      throw new Error("administration forum board did not load");
    }
    if (await page.locator("[data-forum-state]").textContent() === "") throw new Error("forum state missing");
    if (await page.locator('[data-forum-create]').count() < 1) throw new Error("forum create control missing");
    if (!(await page.locator('a[href="./forum-members.html"]').count() >= 1)) throw new Error("members navigation missing");
    if (!(await page.locator('a[href="./forum-search.html"]').count() >= 1)) throw new Error("search navigation missing");
    const robots = await page.locator('meta[name="robots"]').getAttribute("content");
    if (!/noindex/.test(robots || "")) throw new Error("forum robots policy missing");
  }
});

await testStaticPage({
  path: "/forum.html",
  name: "forum mobile",
  viewport: { width: 390, height: 844 },
  check: async (page) => {
    if (!(await page.locator("h1").textContent()).includes("Форум")) throw new Error("mobile forum heading missing");
    if (await page.locator(".forum-board__columns").count() < 1) throw new Error("mobile forum board missing");
  }
});

await testStaticPage({
  path: "/forum-category.html?slug=minecraft",
  name: "forum category",
  viewport: { width: 1280, height: 900 },
  check: async (page) => {
    if (!(await page.locator("h1").textContent()).includes("Игровой мир")) throw new Error("forum category heading missing");
    if (!(await page.locator(".forum-thread-table").count())) throw new Error("forum thread table missing");
  }
});

await testStaticPage({
  path: "/forum-members.html",
  name: "forum members",
  viewport: { width: 1280, height: 900 },
  check: async (page) => {
    if (!(await page.locator("h1").textContent()).includes("Участники")) throw new Error("members heading missing");
    if (!(await page.locator("[data-members-list]").count())) throw new Error("members list missing");
  }
});

await testStaticPage({
  path: "/forum-search.html",
  name: "forum search",
  viewport: { width: 1280, height: 900 },
  check: async (page) => {
    if (!(await page.locator("h1").textContent()).includes("Поиск")) throw new Error("search heading missing");
    if (!(await page.locator("#global-forum-search").count())) throw new Error("search field missing");
    await page.locator("#global-forum-search").fill("na");
    await page.locator('[data-forum-search-form]').evaluate((form) => form.requestSubmit());
    if (!page.url().includes("/forum-search.html?q=na")) throw new Error("search did not update query URL");
  }
});

await testStaticPage({
  path: "/forum-members.html",
  name: "forum user profile",
  viewport: { width: 1280, height: 900 },
  check: async (page) => {
    const firstMember = page.locator("[data-members-list] a[data-forum-user]").first();
    await firstMember.waitFor({ state: "visible", timeout: 10000 });
    const publicId = await firstMember.getAttribute("data-forum-user");
    if (!publicId) throw new Error("member public id missing");
    await page.goto(BASE + "/forum-user.html?id=" + encodeURIComponent(publicId), { waitUntil: "networkidle", timeout: TIMEOUT });
    if (!(await page.locator("[data-user-profile]").isVisible())) throw new Error("forum profile did not load");
    if (!(await page.locator("[data-user-name]").textContent()).trim()) throw new Error("forum profile name missing");
    if (await page.locator("[data-user-roles] .forum-role").count() < 1) throw new Error("forum profile role missing");
  }
});

await testStaticPage({
  path: "/not-found-final-audit-route",
  name: "404",
  viewport: { width: 1280, height: 900 },
  check: async (page) => {
    if (!(await page.locator("h1").textContent()).includes("404")) throw new Error("404 heading missing");
  }
});

await testOAuthStart();
await testCabinetAnonymous({ width: 1440, height: 1000 }, "cabinet anonymous desktop");
await testCabinetAnonymous({ width: 390, height: 844 }, "cabinet anonymous mobile");
await testCabinetAnonymous({ width: 768, height: 1024 }, "cabinet tablet");
await testCabinetProfileTimeout();
await testCabinetSignedIn();

console.log("NaZerak browser smoke PASSED");