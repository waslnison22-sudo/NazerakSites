import { chromium } from "playwright";
import fs from "node:fs";

const BASE = (process.env.NAZERAK_BASE_URL || "http://127.0.0.1:4173").replace(/\/$/, "");
const PATH = "/docs/redesign-preview.html";
const VIEWPORTS = [
  { width: 1440, height: 900, name: "desktop" },
  { width: 1024, height: 768, name: "laptop" },
  { width: 768, height: 1024, name: "tablet" },
  { width: 390, height: 844, name: "mobile" },
  { width: 320, height: 740, name: "narrow-mobile" }
];

const fail = (message) => { throw new Error("[redesign-preview] " + message); };
const browser = await chromium.launch({ headless: true });
const output = "artifacts/redesign-preview";
fs.mkdirSync(output, { recursive: true });

try {
  for (const viewport of VIEWPORTS) {
    const page = await browser.newPage({ viewport });
    const consoleErrors = [];
    const pageErrors = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));

    const response = await page.goto(BASE + PATH, { waitUntil: "networkidle", timeout: 20000 });
    if (!response || response.status() !== 200) fail(viewport.name + " returned HTTP " + (response?.status() || "no response"));

    const title = await page.title();
    if (!title.includes("концепт нового форума")) fail("prototype document title is missing");
    const visibleBodyText = await page.locator("body").innerText();
    if (visibleBodyText.trimStart().startsWith("\\n")) fail(viewport.name + " contains a stray escaped newline at the top of the page");
    const missingAnchors = await page.locator('a[href^="#"]').evaluateAll((links) => links.filter((link) => !document.getElementById(link.getAttribute("href").slice(1))).map((link) => link.getAttribute("href")));
    if (missingAnchors.length) fail(viewport.name + " has broken in-page links: " + JSON.stringify(missingAnchors));
    if (!(await page.getByRole("heading", { name: "Форум NaZerak", level: 1 }).count())) fail("main heading is missing");
    if ((await page.locator(".category").count()) !== 6) fail("expected six visible category examples");
    if (!(await page.locator(".prototype-notice").innerText()).includes("DEMO-ДАННЫЕ")) fail("demo-data disclaimer is missing");

    const initialWidth = await page.evaluate(() => ({
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth
    }));
    if (initialWidth.document > initialWidth.viewport + 1 || initialWidth.body > initialWidth.viewport + 1) {
      fail(viewport.name + " has horizontal overflow: " + JSON.stringify(initialWidth));
    }

    const buttons = await page.locator("button:visible").evaluateAll((els) => els.map((el) => ({
      text: (el.innerText || "").trim(),
      label: el.getAttribute("aria-label") || "",
      width: Math.round(el.getBoundingClientRect().width),
      height: Math.round(el.getBoundingClientRect().height)
    })));
    const unlabelled = buttons.filter((button) => !button.text && !button.label);
    if (unlabelled.length) fail(viewport.name + " contains unlabeled buttons: " + JSON.stringify(unlabelled));
    const undersized = buttons.filter((button) => button.width < 44 || button.height < 44);
    if (undersized.length) fail(viewport.name + " contains visible buttons below the 44px target: " + JSON.stringify(undersized));

    fs.mkdirSync(output, { recursive: true });
    await page.screenshot({
      path: output + "/" + viewport.name + "-" + viewport.width + "x" + viewport.height + ".png",
      fullPage: true,
      animations: "disabled"
    });

    // Verify that local search filters real prototype rows rather than being decorative.
    const search = page.locator("#search");
    await search.fill("Правила и документы");
    const matchingRule = page.locator(".category").filter({ hasText: "Правила и документы" });
    if (!(await matchingRule.isVisible())) fail(viewport.name + " search failed to keep the matching category visible");
    const unrelated = page.locator(".category").filter({ hasText: "Гайды и игровой опыт" });
    if (await unrelated.isVisible()) fail(viewport.name + " search failed to hide an unrelated category");
    await search.fill("");

    // Verify filter state and modal open/close behavior.
    const unanswered = page.getByRole("button", { name: "Без ответа" });
    await unanswered.click();
    if (await unanswered.getAttribute("aria-pressed") !== "true") fail(viewport.name + " filter state was not updated");
    await page.getByRole("button", { name: "Все темы" }).click();

    await page.getByRole("button", { name: /Создать тему/ }).click();
    if (!(await page.locator("#topic-dialog").evaluate((el) => el.open))) fail(viewport.name + " create-topic demo dialog did not open");
    if (!(await page.locator("#topic-dialog").innerText()).includes("публикация здесь отключена")) fail("demo dialog does not explain non-persistence");
    await page.getByRole("button", { name: "Закрыть" }).click();
    if (await page.locator("#topic-dialog").evaluate((el) => el.open)) fail(viewport.name + " demo dialog did not close");

    // At tablet/mobile widths, the navigation must be controllable and announce state.
    if (viewport.width <= 820) {
      const toggle = page.getByRole("button", { name: "Открыть меню" });
      await toggle.click();
      if (await page.locator("#nav").isVisible() !== true) fail(viewport.name + " mobile navigation did not open");
      if (await page.locator(".mobile-toggle").getAttribute("aria-expanded") !== "true") fail(viewport.name + " mobile navigation aria state was not set");
      await page.locator("#nav").getByRole("link", { name: "Форум" }).click();
      if (await page.locator("#nav").evaluate((el) => el.classList.contains("open"))) fail(viewport.name + " mobile navigation did not close after navigation");
    }

    const finalWidth = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
    if (finalWidth.document > finalWidth.viewport + 1) fail(viewport.name + " overflowed after interactions: " + JSON.stringify(finalWidth));
    if (consoleErrors.length || pageErrors.length) fail(viewport.name + " browser diagnostics: " + JSON.stringify({ consoleErrors, pageErrors }));

    // Full-site concept: homepage, forum, category, topic, search, member directory, profile, and cabinet.
    const viewsPage = await browser.newPage({ viewport });
    const viewConsoleErrors = [];
    const viewPageErrors = [];
    viewsPage.on("console", (message) => { if (message.type() === "error") viewConsoleErrors.push(message.text()); });
    viewsPage.on("pageerror", (error) => viewPageErrors.push(error.message));
    const viewsResponse = await viewsPage.goto(BASE + "/docs/redesign-site-views.html", { waitUntil: "networkidle", timeout: 20000 });
    if (!viewsResponse || viewsResponse.status() !== 200) fail(viewport.name + " full-site concept returned HTTP " + (viewsResponse?.status() || "no response"));
    if (!(await viewsPage.title()).includes("полная концепция редизайна")) fail("full-site concept title is missing");
    if ((await viewsPage.locator("[data-screen]").count()) !== 8) fail("full-site concept must include eight page states");
    const brokenViewAnchors = await viewsPage.locator('a[href^="#"]:not([data-view-button])').evaluateAll((links) => links.filter((link) => !document.getElementById(link.getAttribute("href").slice(1))).map((link) => link.getAttribute("href")));
    if (brokenViewAnchors.length) fail(viewport.name + " full-site concept has broken anchor links: " + JSON.stringify(brokenViewAnchors));

    const viewNames = ["home", "forum", "category", "topic", "search", "members", "profile", "account"];
    for (const viewName of viewNames) {
      const tab = viewsPage.locator('.screen-switcher [data-view-button="' + viewName + '"]');
      await tab.click();
      const screen = viewsPage.locator('[data-screen="' + viewName + '"]');
      if (!(await screen.isVisible())) fail(viewport.name + " full-site state did not open: " + viewName);
      const pageWidth = await viewsPage.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
      if (pageWidth.document > pageWidth.viewport + 1 || pageWidth.body > pageWidth.viewport + 1) fail(viewport.name + " full-site state overflows: " + viewName + " " + JSON.stringify(pageWidth));

      const shortControls = await viewsPage.locator("button:visible").evaluateAll((els) => els.map((el) => ({
        text: (el.innerText || "").trim(),
        label: el.getAttribute("aria-label") || "",
        width: Math.round(el.getBoundingClientRect().width),
        height: Math.round(el.getBoundingClientRect().height)
      })).filter((el) => el.width < 44 || el.height < 44));
      if (shortControls.length) fail(viewport.name + " full-site state " + viewName + " has undersized controls: " + JSON.stringify(shortControls));

      if (viewport.width === 1440 || (viewport.name === "mobile" && ["home", "category", "topic", "account"].includes(viewName))) {
        await viewsPage.screenshot({
          path: output + "/views-" + viewport.name + "-" + viewName + "-" + viewport.width + "x" + viewport.height + ".png",
          fullPage: true,
          animations: "disabled"
        });
      }
    }

    // Functional assertions for the expanded concept.
    await viewsPage.locator('.screen-switcher [data-view-button="forum"]').click();
    await viewsPage.locator("#forum-search-input").fill("Поддержка");
    if (!(await viewsPage.locator('[data-category-row][data-kind="help"]').first().isVisible())) fail(viewport.name + " full-site category search did not retain matching rows");
    if (await viewsPage.locator('[data-category-row][data-kind="official"]').first().isVisible()) fail(viewport.name + " full-site category search did not hide unrelated rows");
    await viewsPage.locator("#forum-search-input").fill("");
    await viewsPage.locator('[data-category-filter="world"]').click();
    if (await viewsPage.locator('[data-category-row][data-kind="help"]').first().isVisible()) fail(viewport.name + " full-site category filter did not hide other groups");
    await viewsPage.locator('[data-category-filter="all"]').click();

    await viewsPage.locator('.screen-switcher [data-view-button="category"]').click();
    await viewsPage.locator('[data-thread-sort="unanswered"]').click();
    if (!(await viewsPage.locator("#category-thread-list .thread-row").first().innerText()).includes("Какая версия")) fail(viewport.name + " unanswered category sorting did not prioritize unanswered topic");

    await viewsPage.locator('.screen-switcher [data-view-button="search"]').click();
    await viewsPage.locator("#global-search").fill("подключение");
    if (!(await viewsPage.locator("[data-search-result]:visible").count())) fail(viewport.name + " full-site search returned no results for a known demo query");
    await viewsPage.locator("#clear-global-search").click();
    if ((await viewsPage.locator("[data-search-result]:visible").count()) !== 3) fail(viewport.name + " full-site clear search failed");

    await viewsPage.locator('.screen-switcher [data-view-button="members"]').click();
    await viewsPage.locator("#member-search").fill("Команда");
    if ((await viewsPage.locator("[data-member]:visible").count()) !== 1) fail(viewport.name + " member directory search did not filter demo profiles");

    await viewsPage.locator('.screen-switcher [data-view-button="topic"]').click();
    await viewsPage.locator(".topic-post").first().waitFor({ state: "visible" });
    await viewsPage.locator(".topic-post").first().getByRole("button", { name: "Ответить" }).click();
    if (!(await viewsPage.locator("#demo-dialog").evaluate((el) => el.open))) fail(viewport.name + " topic action did not clearly open demo-state dialog");
    await viewsPage.locator("#close-demo").click();

    if (viewport.width <= 820) {
      const toggleViews = viewsPage.getByRole("button", { name: "Открыть меню" });
      await toggleViews.click();
      if (!(await viewsPage.locator("#site-nav").evaluate((el) => el.classList.contains("open")))) fail(viewport.name + " full-site mobile navigation did not open");
      await viewsPage.locator("#site-nav").getByRole("link", { name: "Главная" }).click();
      if (!(await viewsPage.locator('[data-screen="home"]').isVisible())) fail(viewport.name + " main navigation failed to switch to homepage concept");
      if (await viewsPage.locator("#site-nav").evaluate((el) => el.classList.contains("open"))) fail(viewport.name + " full-site mobile navigation did not close after selection");
    }

    if (viewConsoleErrors.length || viewPageErrors.length) fail(viewport.name + " full-site concept browser diagnostics: " + JSON.stringify({ consoleErrors: viewConsoleErrors, pageErrors: viewPageErrors }));
    console.log("PASS: full-site redesign states " + viewport.name + " " + viewNames.join(", "));
    await viewsPage.close();

    console.log("PASS: redesign prototype " + viewport.name + " " + viewport.width + "x" + viewport.height);
    await page.close();
  }
  console.log("PASS: prototype screenshot and interaction suite completed for all viewports");
} finally {
  await browser.close();
}
