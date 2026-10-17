import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const baseUrl = process.env.NAZERAK_BASE_URL || "http://127.0.0.1:4173";
const target = new URL("/forum-concept/screens.html", baseUrl).toString();
const artifactDir = path.join(process.cwd(), "artifacts", "forum-hud");
fs.mkdirSync(artifactDir, { recursive: true });

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });

  const response = await page.goto(target, { waitUntil: "networkidle" });
  check(response?.status() === 200, "screen gallery should return HTTP 200");
  check((await page.title()).includes("карта экранов"), "screen gallery title is missing");
  check(await page.locator("[data-screen]").count() === 7, "screen gallery must contain all seven requested screens");
  check(await page.locator("[data-screen='category']").isVisible(), "category screen should be visible initially");

  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: width <= 390 ? 844 : 920 });
    await page.waitForTimeout(40);
    const metrics = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth
    }));
    check(metrics.document <= width + 1, "document horizontal overflow at " + width + "px: " + metrics.document);
    check(metrics.body <= width + 1, "body horizontal overflow at " + width + "px: " + metrics.body);
    if (width === 1440) await page.screenshot({ path: path.join(artifactDir, "concept-screens-desktop-1440.png"), fullPage: true });
    if (width === 390) await page.screenshot({ path: path.join(artifactDir, "concept-screens-mobile-390.png"), fullPage: true });
  }

  await page.locator("[data-topic-filter]").fill("постройки");
  check(await page.locator(".topic-row:visible").count() === 1, "category filter should reduce the topics to one match");
  await page.locator("[data-reset-category]").click();
  check(await page.locator(".topic-row:visible").count() === 6, "category reset should restore all demo topics");

  await page.locator("[data-screen-tab='topic']").click();
  const reaction = page.locator("[data-reaction='helpful']").first();
  await reaction.click();
  check(await reaction.getAttribute("aria-pressed") === "true", "topic reaction should toggle in demo");
  await page.locator("[data-bookmark]").click();
  check(await page.locator("[data-bookmark]").getAttribute("aria-pressed") === "true", "topic bookmark should toggle in demo");
  await page.locator("[data-demo-action='quote']").first().click();
  check((await page.locator("[data-reply-body]").inputValue()).includes("Цитата из демонстрационного сообщения"), "quote action should insert sample quote locally");

  await page.locator("[data-screen-tab='search']").click();
  await page.locator("[data-global-search]").fill("постройки");
  check(await page.locator("[data-search-item]:visible").count() === 1, "global search should filter sample results");
  await page.locator("[data-global-search]").fill("phrase-not-in-demo-data");
  check(await page.locator("[data-search-empty]").isVisible(), "search no-results state should be visible");
  await page.locator("[data-reset-search]").click();
  check(await page.locator("[data-search-item]:visible").count() === 4, "search reset should restore sample results");

  await page.locator("[data-screen-tab='members']").click();
  await page.locator("[data-member-role]").selectOption({ label: "Модератор" });
  check(await page.locator("[data-member]:visible").count() === 1, "members role filter should match the moderator example");
  await page.locator("[data-reset-members]").click();
  check(await page.locator("[data-member]:visible").count() === 6, "members reset should restore all examples");

  await page.locator("[data-screen-tab='profile']").click();
  await page.locator("[data-profile-tab='posts']").click();
  check(await page.locator("[data-profile-content='posts']").isVisible(), "profile activity tabs should switch content");

  await page.locator("[data-screen-tab='cabinet']").click();
  await page.locator("[data-cabinet-tab='notifications']").click();
  check(await page.locator("[data-cabinet-panel='notifications']").isVisible(), "cabinet navigation should switch settings panels");
  await page.locator("[data-demo-action='save-settings']").click();
  check((await page.locator("[data-settings-status]").textContent()).includes("не сохранены"), "cabinet must clearly state that changes are not saved");

  await page.locator("[data-screen-tab='moderation']").click();
  check(await page.locator("[data-access-gate]").isVisible(), "moderation must default to access denied");
  await page.locator("[data-toggle-moderator-preview]").first().click();
  check(await page.locator("[data-moderation-queue]").isVisible(), "moderation demo queue should open only after explicit preview toggle");
  await page.locator("[data-report-filter]").selectOption({ label: "Решённые" });
  check(await page.locator("[data-report]:visible").count() === 1, "moderation status filter should show the resolved example");
  await page.locator("[data-report-filter]").selectOption({ label: "Все статусы" });

  check(errors.length === 0, "browser console/page errors: " + errors.join(" | "));
  if (failures.length) {
    console.error("Forum concept screen gallery FAILED:");
    failures.forEach((failure) => console.error(" - " + failure));
    process.exitCode = 1;
  } else {
    console.log("Forum concept screen gallery passed.");
    console.log("PASS: seven screens, five viewport sizes, filtering, quote/reaction/bookmark, cabinet states and guarded moderation preview.");
  }
} finally {
  await browser.close();
}