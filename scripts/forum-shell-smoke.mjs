import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = (process.env.NAZERAK_BASE_URL || "http://127.0.0.1:4173").replace(/\/$/, "");
const routes = [
  ["/forum", "Форум"],
  ["/forum/new", "Новое"],
  ["/forum/unanswered", "Без ответа"],
  ["/forum/mine", "Мои темы"],
  ["/forum/bookmarks", "Закладки"],
  ["/forum/watched", "Подписки"]
];
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const browser = await chromium.launch({ headless: true });
const artifactDir = path.join(process.cwd(), "artifacts", "forum-hud");
fs.mkdirSync(artifactDir, { recursive: true });

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  const pageErrors = [];
  const localFailures = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  page.on("requestfailed", request => {
    try {
      if (new URL(request.url()).origin === new URL(baseUrl).origin) {
        localFailures.push({ url: request.url(), error: request.failure()?.errorText || "unknown" });
      }
    } catch {}
  });

  for (const [route, heading] of routes) {
    const response = await page.goto(baseUrl + route, { waitUntil: "domcontentloaded" });
    check(response?.status() === 200, route + " should return HTTP 200");
    check(await page.locator("body[data-forum]").count() === 1, route + " should render the real forum shell");
    check(await page.locator(".forum-global-subnav").count() === 1, route + " is missing forum navigation");
    check(await page.locator('link[href*="forum-v2.css?v=2"]').count() === 1, route + " is missing the new stylesheet");
    await page.waitForFunction((expected) => document.querySelector(".forum-index-head h1")?.textContent?.trim() === expected, heading, { timeout: 15000 });
    check(await page.locator(".forum-index-head h1").textContent().then(value => value?.trim()) === heading, route + " selected the wrong forum view");
    const cssResponse = await page.request.get(baseUrl + "/forum-v2.css?v=2");
    check(cssResponse.status() === 200, "forum-v2.css should return HTTP 200");
    check((await cssResponse.text()).includes(".forum-global-subnav"), "new stylesheet should include unified navigation");

    for (const width of [1440, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: width <= 390 ? 844 : 920 });
      const dimensions = await page.evaluate(() => ({
        viewport: window.innerWidth,
        document: document.documentElement.scrollWidth,
        body: document.body.scrollWidth
      }));
      check(dimensions.document <= width + 1, route + " document overflows at " + width + "px: " + JSON.stringify(dimensions));
      check(dimensions.body <= width + 1, route + " body overflows at " + width + "px: " + JSON.stringify(dimensions));
    }

    if (route === "/forum") {
      await page.setViewportSize({ width: 1440, height: 960 });
      await page.screenshot({ path: path.join(artifactDir, "forum-live-shell-1440.png"), fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({ path: path.join(artifactDir, "forum-live-shell-390.png"), fullPage: true });
      const toggle = page.locator(".nav-toggle");
      check(await toggle.count() === 1, "mobile menu toggle must exist exactly once");
      if (await toggle.count() === 1) {
        await toggle.click();
        check(await toggle.getAttribute("aria-expanded") === "true", "mobile menu must open on tap");
        const openMenu = page.locator(".nav.is-open");
        await openMenu.waitFor({ state: "visible", timeout: 1200 });
        check(await openMenu.isVisible(), "mobile menu must become visible on tap");
        await page.keyboard.press("Escape");
        check(await toggle.getAttribute("aria-expanded") === "false", "mobile menu must close with Escape");
        check(!(await page.locator(".nav").evaluate(n => n.classList.contains("is-open"))), "mobile menu must close its panel with Escape");
      }
    }
  }
  check(pageErrors.length === 0, "forum browser errors: " + JSON.stringify(pageErrors));
  check(localFailures.length === 0, "forum local requests failed: " + JSON.stringify(localFailures));
} finally {
  await browser.close();
}
if (failures.length) {
  console.error("Forum shell smoke failed:");
  for (const failure of failures) console.error(" - " + failure);
  process.exit(1);
}
console.log("Forum shell smoke passed: six real routes, five viewport widths, stylesheet delivery and mobile navigation.");
