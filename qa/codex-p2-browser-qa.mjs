/**
 * Browser regression for Codex PR #10 P2 fixes.
 * Optional browser tooling: set CLOUDOPS_PLAYWRIGHT_MODULE to an installed
 * Playwright entrypoint, or make package 'playwright' resolvable.
 * Requires the CloudOps static preview to be running; no network beyond localhost.
 * No GitHub or AWS accounts, model calls, or browser progress modification on disk.
 */
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const playwright = process.env.CLOUDOPS_PLAYWRIGHT_MODULE
  ? await import(pathToFileURL(process.env.CLOUDOPS_PLAYWRIGHT_MODULE).href)
  : await import("playwright");
const base = process.env.CLOUDOPS_PREVIEW_URL || "http://127.0.0.1:8766";
const browser = await playwright.chromium.launch({
  channel: process.env.CLOUDOPS_CHROME_CHANNEL || "chrome",
  headless: true
});
const errors = [], offOrigin = [];
const monitored = (page) => {
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (request) => {
    const u = request.url();
    if (!u.startsWith(base) && !u.startsWith("data:")) offOrigin.push(u);
  });
};
const currentFocus = (page) => page.evaluate(() => ({
  id: document.activeElement?.id || null,
  track: document.activeElement?.dataset?.track || null,
  hidden: Boolean(document.activeElement?.closest("[hidden]"))
}));

try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  monitored(desktop);
  await desktop.goto(base, { waitUntil: "networkidle" });

  // Custom setup can choose any track without starting a throwaway session.
  await desktop.locator("#customize-session").click();
  assert.equal((await currentFocus(desktop)).id, "custom-track-select");
  assert.equal(await desktop.locator("#custom-track-select option").count(), 6);
  for (const [id, count] of [["security", 7], ["fieldsecurity", 5], ["practitioner", 5]]) {
    await desktop.locator("#custom-track-select").selectOption(id);
    assert.equal(await desktop.locator("#domain-select option").count(), count);
    assert.equal(await desktop.locator('.track-card[data-track="'+id+'"]').getAttribute("aria-pressed"), "true");
    assert.equal(await desktop.locator("#quiz-view").isVisible(), false, "track selection must not start a quiz");
  }

  await desktop.locator("#custom-track-select").selectOption("security");
  if (process.env.CLOUDOPS_QA_SCREENSHOT) {
    await desktop.screenshot({ path: process.env.CLOUDOPS_QA_SCREENSHOT, fullPage: true });
  }
  await desktop.locator("#mode-select").selectOption("exam");
  await desktop.locator("#count-select").selectOption("5");
  await desktop.locator('#session-form button[type="submit"]').click();
  assert.equal(await desktop.locator("#quiz-mode-label").innerText(), "TIMED EXAM");
  assert.equal(await desktop.locator("#question-position").innerText(), "QUESTION 1 OF 5");

  // Rejected exit must not lose a live quiz or its focused exit control.
  desktop.once("dialog", (dialog) => dialog.dismiss());
  await desktop.locator("#quit-btn").click();
  assert.equal(await desktop.locator("#quiz-view").isVisible(), true);
  assert.equal(await desktop.locator("#dashboard").isVisible(), false);

  // Confirmed exit explicitly restores focus to a visible track card.
  desktop.once("dialog", (dialog) => dialog.accept());
  await desktop.locator("#quit-btn").click();
  assert.equal(await desktop.locator("#dashboard").isVisible(), true);
  assert.deepEqual((await currentFocus(desktop)).track, "security");
  assert.equal((await currentFocus(desktop)).hidden, false);

  await desktop.locator("#close-settings").click();
  for (const track of ["practitioner", "security", "networking", "architecture", "devops", "fieldsecurity"]) {
    await desktop.locator('.track-card[data-track="'+track+'"]').click();
    assert.equal(await desktop.locator("#question-position").innerText(), "QUESTION 1 OF 10");
    assert.equal(await desktop.locator("#timer").innerText(), "UNTIMED");
    desktop.once("dialog", (dialog) => dialog.accept());
    await desktop.locator("#prev-btn").click();
    assert.equal(await desktop.locator("#dashboard").isVisible(), true);
    assert.equal((await currentFocus(desktop)).track, track);
    await desktop.keyboard.press("Shift+Tab");
    assert.equal((await currentFocus(desktop)).hidden, false);
  }

  // Repeat both exits on narrow mobile, including keyboard focus.
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  monitored(mobile);
  await mobile.goto(base, { waitUntil: "networkidle" });
  await mobile.locator("#customize-session").click();
  assert.equal((await currentFocus(mobile)).id, "custom-track-select");
  await mobile.locator("#custom-track-select").selectOption("networking");
  await mobile.locator("#mode-select").selectOption("exam");
  await mobile.locator("#count-select").selectOption("5");
  await mobile.locator('#session-form button[type="submit"]').click();
  mobile.once("dialog", (dialog) => dialog.dismiss());
  await mobile.locator("#prev-btn").click();
  assert.equal(await mobile.locator("#quiz-view").isVisible(), true);
  mobile.once("dialog", (dialog) => dialog.accept());
  await mobile.locator("#prev-btn").click();
  assert.equal((await currentFocus(mobile)).track, "networking");
  assert.equal((await currentFocus(mobile)).hidden, false);
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);

  assert.deepEqual(errors, [], "uncaught browser errors");
  assert.deepEqual(offOrigin, [], "off-origin requests");
  console.log(JSON.stringify({
    status: "PASS", desktop: "6 quick starts, independent custom-track selection, timed exam, exit focus",
    mobile: "custom-track timed exam, cancel and accept focus, no overflow",
    errors: errors.length, offOrigin: offOrigin.length
  }, null, 2));
} finally {
  await browser.close();
}
