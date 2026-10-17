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

    console.log("PASS: redesign prototype " + viewport.name + " " + viewport.width + "x" + viewport.height);
    await page.close();
  }
  console.log("PASS: prototype screenshot and interaction suite completed for all viewports");
} finally {
  await browser.close();
}
