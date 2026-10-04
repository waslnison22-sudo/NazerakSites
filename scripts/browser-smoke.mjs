import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

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
    if (!["/", "/cabinet.html", "/forum.html", "/forum-category.html", "/forum-members.html", "/forum-search.html", "/topic.html", "/forum-user.html"].includes(pathname)) {
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
    if (/^\/(forum|forum-category|forum-members|forum-search|topic|forum-user)\.html/.test(path)) {
      await mkdir("artifacts/forum-hud", { recursive: true });
      const file = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      await page.screenshot({ path: "artifacts/forum-hud/" + file + ".png", fullPage: true, animations: "disabled" });
    }
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

    const profile = () => ({
      id: fakeUser.id,
      minecraft_username: "NaZerakTest",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z"
    });
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
              const smokeMode = new URLSearchParams(window.location.search).get("smoke");
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
      loading: Boolean(document.querySelector('[data-account-view="loading"]') && !document.querySelector('[data-account-view="loading"]')?.hidden),
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
    await page.waitForFunction(() => window.location.pathname === "/" || window.location.pathname.endsWith("/"), { timeout: 5000 });
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
  name: "forum index desktop",
  viewport: { width: 1440, height: 900 },
  check: async (page) => {
    if (!(await page.locator("h1").textContent()).includes("Форум")) throw new Error("forum heading missing");
    const layout = await page.locator(".forum-index-grid").evaluate((node) => {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return { display: style.display, columns: style.gridTemplateColumns.split(" ").filter(Boolean).length, width: rect.width };
    });
    if (layout.display !== "grid" || layout.columns < 2) throw new Error("desktop forum reference grid missing: " + JSON.stringify(layout));
    if (layout.width < 1000) throw new Error("desktop forum canvas is unexpectedly narrow: " + JSON.stringify(layout));
    const hero = await page.locator(".forum-hero").evaluate((node) => {
      const style = getComputedStyle(node);
      const actions = node.querySelector(".forum-hero__actions");
      return { alignItems: style.alignItems, actionAlign: actions ? getComputedStyle(actions).alignSelf : "" };
    });
    if (hero.alignItems !== "flex-start" || !["auto","flex-start"].includes(hero.actionAlign)) {
      throw new Error("forum hero is not left aligned: " + JSON.stringify(hero));
    }
    if (await page.locator("[data-forum-state]:visible").count() !== 0) throw new Error("decorative forum status should not be visible");
    if (await page.locator(".forum-hero__bg").count() !== 1) {
      throw new Error("forum hero artwork layer is missing");
    }
    if (await page.locator("[data-forum-state]:visible").count() !== 0) throw new Error("obsolete forum status UI is visible");
    if (layout.width > 760) {
      const placement = await page.locator(".forum-hero").evaluate((hero) => {
        const actions = hero.querySelector(".forum-hero__actions");
        const copy = hero.querySelector(".forum-hero__copy");
        const heroRect = hero.getBoundingClientRect();
        const actionsRect = actions.getBoundingClientRect();
        const copyRect = copy.getBoundingClientRect();
        return {
          leftDelta: Math.abs(actionsRect.left - copyRect.left),
          bottomGap: heroRect.bottom - actionsRect.bottom
        };
      });
      if (placement.leftDelta > 3 || placement.bottomGap < 8 || placement.bottomGap > 38) {
        throw new Error("forum hero actions are not aligned with the left content edge / lower edge: " + JSON.stringify(placement));
      }
    }
    if (await page.locator("[data-forum-node-tree] .forum-node-section").count() < 1) {
      throw new Error("forum sections did not load");
    }
    if (await page.locator("[data-forum-node-tree] .forum-board-row").count() < 1) {
      throw new Error("forum boards did not load");
    }
    if (await page.locator(".forum-index-grid > section").count() !== 3) {
      throw new Error("forum index composition is incomplete");
    }
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
    if (await page.locator(".forum-board__columns").count() < 1) throw new Error("forum board markup missing");
    const mobileLayout = await page.locator(".forum").evaluate((node) => ({ width: node.getBoundingClientRect().width, viewport: innerWidth }));
    if (mobileLayout.width > mobileLayout.viewport + 1) throw new Error("mobile forum canvas overflows: " + JSON.stringify(mobileLayout));
  }
});

await testStaticPage({
  path: "/forum.html",
  name: "forum narrow mobile",
  viewport: { width: 320, height: 740 },
  check: async (page) => {
    if (!(await page.locator("h1").textContent()).includes("Форум")) throw new Error("narrow mobile forum heading missing");
    const metrics = await page.evaluate(() => {
      const menu = document.querySelector(".nav-toggle").getBoundingClientRect();
      return {
        searchFont: parseFloat(getComputedStyle(document.querySelector("#forum-search")).fontSize),
        menuWidth: menu.width,
        menuHeight: menu.height,
        pageWidth: document.documentElement.scrollWidth,
        viewport: innerWidth
      };
    });
    if (metrics.searchFont < 16) throw new Error("narrow mobile search text may trigger browser zoom: " + JSON.stringify(metrics));
    if (metrics.menuWidth < 44 || metrics.menuHeight < 44) throw new Error("narrow mobile menu touch target is too small: " + JSON.stringify(metrics));
    if (metrics.pageWidth > metrics.viewport + 1) throw new Error("narrow mobile forum overflows: " + JSON.stringify(metrics));
  }
});

await testStaticPage({
  path: "/forum-category.html?slug=pravila-i-dokumenty",
  name: "official forum category",
  viewport: { width: 1280, height: 900 },
  check: async (page) => {
    if (await page.locator("[data-category-policy]").count()) throw new Error("obsolete category publication policy UI remains");
    if (await page.locator(".forum-list-shell").count() < 1) throw new Error("official category shell missing");
  }
});

await testStaticPage({
  path: "/forum-category.html?slug=igrovye-voprosy",
  name: "forum category",
  viewport: { width: 1280, height: 900 },
  check: async (page) => {
    const categoryTitle = (await page.locator("[data-category-title]").textContent() || "").trim();
    if (!categoryTitle || /загрузка/i.test(categoryTitle)) throw new Error("forum category did not resolve");
    if (!(await page.locator(".forum-thread-table").count())) throw new Error("forum thread table missing");
    if (await page.locator(".forum-thread-row").count() > 0) {
      const row = page.locator(".forum-thread-row").first();
      for (const selector of [".forum-thread-row__main",".forum-thread-row__title",".forum-thread-row__meta",".forum-thread-row__count",".forum-thread-row__last"]) {
        if (await row.locator(selector).count() < 1) throw new Error("category row structure missing: " + selector);
      }
      if (await row.locator("a a").count()) throw new Error("category row contains nested links");
    }
  }
});

await testStaticPage({
  path: "/forum-category.html?slug=pravila-i-dokumenty",
  name: "forum category narrow mobile",
  viewport: { width: 320, height: 740 },
  check: async (page) => {
    const title = (await page.locator("[data-category-title]").textContent() || "").trim();
    if (!title || /загрузка/i.test(title)) throw new Error("narrow mobile category did not resolve");
    const fontSize = await page.locator("input, textarea").first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize)).catch(() => 16);
    if (fontSize < 16) throw new Error("narrow mobile category input font too small: " + fontSize);
    const create = page.locator(".forum-section-head [data-category-create]");
    const createMetrics = await create.evaluate((el) => ({
      height: el.getBoundingClientRect().height,
      fontSize: parseFloat(getComputedStyle(el).fontSize)
    }));
    if (createMetrics.height < 44 || createMetrics.fontSize < 14) {
      throw new Error("narrow mobile category create control is too small: " + JSON.stringify(createMetrics));
    }
  }
});

await testStaticPage({
  path: "/forum-members.html",
  name: "forum members narrow mobile",
  viewport: { width: 320, height: 740 },
  check: async (page) => {
    if (!(await page.locator("h1").textContent()).includes("Участники")) throw new Error("narrow mobile members heading missing");
    const grid = await page.locator("[data-members-list]").evaluate((el) => getComputedStyle(el).gridTemplateColumns);
    if (!grid) throw new Error("narrow mobile member list layout missing");
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
await testCabinetProfileTimeout();
await testCabinetSignedIn();

console.log("NaZerak browser smoke PASSED");