import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const baseUrl = process.env.NAZERAK_BASE_URL || "http://127.0.0.1:4173";
const target = new URL("/forum-concept/index.html", baseUrl).toString();
const artifactDir = path.join(process.cwd(), "artifacts", "forum-hud");
fs.mkdirSync(artifactDir, { recursive: true });

const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};
const assertPageHasNoHorizontalOverflow = async (page, width) => {
  const metrics = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    document: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
    rowOverflow: Array.from(document.querySelectorAll(".board-row"))
      .filter((row) => row.scrollWidth > row.clientWidth + 1)
      .map((row) => ({
        title: row.querySelector(".board-main strong")?.textContent?.trim() || "unknown",
        client: row.clientWidth,
        scroll: row.scrollWidth
      }))
  }));
  check(metrics.document <= width + 1, `document overflow at ${width}px: ${metrics.document}px`);
  check(metrics.body <= width + 1, `body overflow at ${width}px: ${metrics.body}px`);
  check(metrics.rowOverflow.length === 0, `forum row overflow at ${width}px: ${JSON.stringify(metrics.rowOverflow)}`);
};

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const consoleErrors = [];
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  const response = await page.goto(target, { waitUntil: "networkidle" });
  check(response?.status() === 200, `concept page HTTP status should be 200, got ${response?.status()}`);
  await page.locator(".board-row").first().waitFor();
  check((await page.title()).includes("Forum Next"), "concept page title is missing");
  check(await page.locator(".page-heading h1").textContent().then((text) => text?.trim().startsWith("Форум")), "forum heading is missing");
  check(await page.locator(".concept-ribbon").isVisible(), "prototype / demo-data notice must be visible");

  await assertPageHasNoHorizontalOverflow(page, 1440);
  const desktopHeading = await page.locator(".section-heading").boundingBox();
  const desktopFirstBoard = await page.locator(".board-table").first().boundingBox();
  check(Boolean(desktopHeading && desktopFirstBoard && Math.abs(desktopHeading.x - desktopFirstBoard.x) < 2), "forum section heading and board rows should share a left alignment");
  await page.screenshot({ path: path.join(artifactDir, "concept-desktop-1440x1000.png"), fullPage: true });

  const search = page.locator("#forum-search");
  await search.fill("Гайды");
  check(await page.locator(".board-row:visible").count() === 1, "search should filter to the matching board row");
  check((await page.locator("#search-status").textContent()).includes("Найдено подразделов: 1"), "search status should report the matching result");
  await page.locator("#clear-search").click();
  check(await page.locator(".board-row:visible").count() === 6, "clear search should restore all board rows");

  await page.locator("[data-open-topic]").click();
  check(await page.locator(".topic-dialog").evaluate((dialog) => dialog.open), "create-topic dialog should open");
  const form = page.locator(".topic-demo-form");
  await form.locator('select[name="category"]').selectOption({ label: "Новости и документы" });
  await form.locator('input[name="title"]').fill("Проверка формы");
  await form.locator('textarea[name="body"]').fill("Тестовый текст: данные не отправляются.");
  await form.locator('button[type="submit"]').click();
  check((await page.locator("[data-topic-notice]").textContent()).includes("Публикация отключена"), "demo form must clearly indicate that publishing is disabled");
  await page.locator("[data-close-topic]").first().click();
  check(!(await page.locator(".topic-dialog").evaluate((dialog) => dialog.open)), "create-topic dialog should close");

  for (const width of [1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: width <= 390 ? 844 : 900 });
    await page.waitForTimeout(100);
    await assertPageHasNoHorizontalOverflow(page, width);
    if (width === 390) {
      await page.screenshot({ path: path.join(artifactDir, "concept-mobile-390x844.png"), fullPage: true });
      const menu = page.locator(".mobile-menu");
      check(await menu.isVisible(), "mobile navigation button should be visible at 390px");
      await menu.click();
      check(await menu.getAttribute("aria-expanded") === "true", "mobile navigation expanded state should update");
      check(await page.locator("#mobile-nav").isVisible(), "mobile navigation links should be visible after opening");
      await page.locator("#mobile-nav a").first().click();
      check(await page.getAttribute("aria-expanded").catch(() => null) !== "true", "navigation link should close menu");
    }
    if (width === 320) {
      await page.screenshot({ path: path.join(artifactDir, "concept-mobile-320x844.png"), fullPage: true });
    }
  }

  check(consoleErrors.length === 0, `browser console/page errors: ${consoleErrors.join(" | ")}`);

  if (failures.length) {
    console.error("Forum concept smoke test FAILED:");
    failures.forEach((failure) => console.error(" - " + failure));
    process.exitCode = 1;
  } else {
    console.log("Forum concept smoke test passed.");
    console.log("PASS: desktop/tablet/mobile widths, alignment, search, create-topic dialog and mobile nav.");
    console.log("Screenshots: artifacts/forum-hud/concept-*.png");
  }
} finally {
  await browser.close();
}
