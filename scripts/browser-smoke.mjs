import { chromium } from "playwright";

const BASE = "https://waslnison22-sudo.github.io/NazerakSites";
const CABINET = BASE + "/cabinet.html";
const timeout = 25000;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runRealBrowserSmoke = async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  const failedRequests = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push("console: " + msg.text());
  });
  page.on("pageerror", (error) => {
    errors.push("pageerror: " + error.message);
  });
  page.on("requestfailed", (request) => {
    failedRequests.push(
      request.url() + " :: " + (request.failure()?.errorText || "unknown")
    );
  });

  try {
    await page.goto(CABINET, { waitUntil: "domcontentloaded", timeout });
    await page.waitForFunction(() => {
      const views = [...document.querySelectorAll("[data-account-view]")];
      return views.some((view) => !view.hidden && view.dataset.accountView !== "loading");
    }, null, 20000);

    const state = await page.evaluate(() => ({
      status: document.querySelector("[data-auth-status]")?.textContent || "",
      views: [...document.querySelectorAll("[data-account-view]")].map((view) => ({
        mode: view.dataset.accountView,
        hidden: view.hidden
      })),
      authObject: Boolean(window.NaZerakAuth)
    }));

    if (!state.authObject) throw new Error("NaZerakAuth object was not initialized");
    console.log("REAL browser state:", JSON.stringify(state));
  } catch (error) {
    const diagnostic = await page.evaluate(() => ({
      readyState: document.readyState,
      status: document.querySelector("[data-auth-status]")?.textContent || "",
      loadingVisible: !document.querySelector('[data-account-view="loading"]')?.hidden,
      guestVisible: !document.querySelector('[data-account-view="guest"]')?.hidden,
      userVisible: !document.querySelector('[data-account-view="user"]')?.hidden,
      configVisible: !document.querySelector('[data-account-view="config"]')?.hidden,
      authObject: Boolean(window.NaZerakAuth),
      supabaseGlobal: Boolean(window.supabase),
      createClient: typeof window.supabase?.createClient,
      supabaseReadyType: typeof window.NAZERAK_SUPABASE_READY,
      supabaseReadyState: window.NAZERAK_SUPABASE_READY?.constructor?.name || "",
      authStage: window.__NAZERAK_AUTH_STAGE || "",
      authDetail: window.__NAZERAK_AUTH_DETAIL || "",
      localStorageKeys: Object.keys(localStorage),
      resourceScripts: performance.getEntriesByType("resource")
        .map((entry) => entry.name)
        .filter((name) => /auth|supabase|cabinet/i.test(name))
    }));
    console.log("REAL browser diagnostic state:", JSON.stringify(diagnostic));
    console.log("REAL browser diagnostic errors:", JSON.stringify(errors));
    console.log("REAL browser failed requests:", JSON.stringify(failedRequests));
    throw error;
  } finally {
    await browser.close();
  }
};

const runSignedInFlowSmoke = async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.addInitScript(() => {
    const fakeSession = {
      access_token: "fake-access-token",
      refresh_token: "fake-refresh-token",
      user: {
        id: "11111111-1111-1111-1111-111111111111",
        created_at: "2026-01-01T00:00:00.000Z",
        last_sign_in_at: "2026-10-01T00:00:00.000Z",
        user_metadata: {
          global_name: "NaZerak Test",
          full_name: "NaZerak Test",
          user_name: "nazerak_test"
        }
      }
    };

    window.supabase = {
      createClient() {
        let callback = null;
        const auth = {
          onAuthStateChange(handler) {
            callback = handler;
            window.setTimeout(() => handler("INITIAL_SESSION", fakeSession), 0);
            return { data: { subscription: { unsubscribe() {} } } };
          },
          getSession: async () => ({ data: { session: fakeSession }, error: null }),
          signInWithOAuth: async () => ({ data: {}, error: null }),
          signOut: async () => ({ error: null })
        };

        const chain = (table) => {
          const api = {
            select() { return api; },
            eq() { return api; },
            order() { return api; },
            limit() { return api; },
            maybeSingle: async () =>
              table === "profiles"
                ? {
                    data: {
                      id: fakeSession.user.id,
                      minecraft_username: null,
                      created_at: "2026-01-01T00:00:00.000Z",
                      updated_at: "2026-01-01T00:00:00.000Z"
                    },
                    error: null
                  }
                : { data: [], error: null },
            single: async () => ({
              data: {
                id: fakeSession.user.id,
                minecraft_username: null,
                created_at: "2026-01-01T00:00:00.000Z",
                updated_at: "2026-01-01T00:00:00.000Z"
              },
              error: null
            }),
            insert() { return api; },
            update() { return api; }
          };
          return api;
        };

        return {
          auth,
          from: (table) => chain(table)
        };
      }
    };
  });

  const page = await context.newPage();
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push("console: " + msg.text());
  });
  page.on("pageerror", (error) => errors.push("pageerror: " + error.message));

  try {
    await page.goto(CABINET, { waitUntil: "domcontentloaded", timeout });
    await page.waitForSelector('[data-account-view="user"]:not([hidden])', { timeout: 10000 });

    const state = await page.evaluate(() => ({
      status: document.querySelector("[data-auth-status]")?.textContent || "",
      userVisible: !document.querySelector('[data-account-view="user"]')?.hidden,
      guestVisible: !document.querySelector('[data-account-view="guest"]')?.hidden,
      loadingVisible: !document.querySelector('[data-account-view="loading"]')?.hidden,
      name: document.querySelector("[data-user-name]")?.textContent || ""
    }));

    console.log("SIGNED-IN browser state:", JSON.stringify(state));
    if (!state.userVisible || state.guestVisible || state.loadingVisible) {
      throw new Error("Signed-in session did not produce a stable user cabinet state");
    }
    if (state.name !== "NaZerak Test") {
      throw new Error("Signed-in user data did not render");
    }
  } catch (error) {
    console.log("SIGNED-IN browser errors:", JSON.stringify(errors));
    throw error;
  } finally {
    await browser.close();
  }
};

await runRealBrowserSmoke();
await runSignedInFlowSmoke();
