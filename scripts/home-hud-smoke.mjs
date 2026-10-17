import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.NAZERAK_BASE_URL || "http://127.0.0.1:4173";
const browser = await chromium.launch({ headless: true });
const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
  const browserErrors = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));

  const response = await page.goto(new URL("/index.html", baseUrl).toString(), {
    waitUntil: "domcontentloaded"
  });
  check(response?.status() === 200, "homepage should return HTTP 200");
  check((await page.title()).includes("NaZerak"), "homepage title is missing");
  check(await page.locator("body.home-hud").count() === 1, "new homepage HUD scope is missing");
  check(await page.locator("h1").count() === 1, "homepage must contain one primary heading");
  check(await page.locator(".hud-world-grid .hud-world-item").count() === 3, "world section should contain three aligned information columns");
  check(await page.locator(".hud-connect [data-copy=\"nazehard.rustix.cc\"] strong").textContent().then((value) => value?.trim()) === "nazehard.rustix.cc", "server address or copy control is missing");
  check(await page.locator('link[href*="home-hud.css"]').count() === 1, "isolated HUD stylesheet is not loaded");
  check(await page.locator(".hud-hero__art").evaluate((node) => getComputedStyle(node).backgroundImage.includes("upload.wikimedia.org")), "Minecraft landscape background is not configured");

  const legacyDecor = await page.locator(".hero-art, .world-visual, .partner-panel, .hud-orbit, .hud-triangle, .home-v2").count();
  check(legacyDecor === 0, "obsolete geometric/homepage decoration remains in the DOM");

  const blankLinksSafe = await page.locator('a[target="_blank"]').evaluateAll((links) =>
    links.every((link) => /noopener/.test(link.getAttribute("rel") || ""))
  );
  check(blankLinksSafe, "external links should use rel=noopener");

  for (const width of [1440, 1280, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: width < 500 ? 844 : 900 });
    await page.waitForTimeout(50);
    const sizes = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth
    }));
    check(sizes.document <= width + 1, "document overflows viewport at " + width + "px: " + sizes.document);
    check(sizes.body <= width + 1, "body overflows viewport at " + width + "px: " + sizes.body);

    if (width === 1440 || width === 390) {
      const outDir = path.join(process.cwd(), "artifacts", "forum-hud");
      fs.mkdirSync(outDir, { recursive: true });
      await page.screenshot({
        path: path.join(outDir, "homepage-hud-" + width + ".png"),
        fullPage: true
      });
    }
  }

  await page.setViewportSize({ width: 390, height: 844 });
  const toggle = page.locator(".nav-toggle");
  await toggle.click();
  check(await toggle.getAttribute("aria-expanded") === "true", "mobile navigation aria-expanded did not switch to true");
  check(await page.locator("#site-nav.is-open").isVisible(), "mobile navigation did not open");
  await page.keyboard.press("Escape");
  check(await toggle.getAttribute("aria-expanded") === "false", "Escape did not reset mobile navigation aria-expanded");
  check(!(await page.locator("#site-nav").evaluate((node) => node.classList.contains("is-open"))), "Escape did not close mobile navigation");
  check(browserErrors.length === 0, "browser errors: " + browserErrors.join(" | "));

  if (failures.length) {
    console.error(failures.join("\n"));
    process.exitCode = 1;
  } else {
    console.log("Homepage HUD smoke passed: content, landscape config, legacy-decoration cleanup, six viewport widths, mobile navigation and server IP.");
  }
} finally {
  await browser.close();
}
