/**
 * Field Labs browser QA for the three playable missions (IAM, NAT, DNS).
 * Optional Playwright dependency (CLOUDOPS_PLAYWRIGHT_MODULE or a normal install).
 * Serve the repo statically and set CLOUDOPS_PREVIEW_URL. Local static content only; never AWS.
 * Set CLOUDOPS_CHROME_CHANNEL to use an installed browser channel (default: bundled Chromium).
 */
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const playwright = process.env.CLOUDOPS_PLAYWRIGHT_MODULE
  ? await import(pathToFileURL(process.env.CLOUDOPS_PLAYWRIGHT_MODULE).href)
  : await import("playwright");
const { chromium } = playwright.chromium ? playwright : playwright.default;
const base = process.env.CLOUDOPS_PREVIEW_URL || "http://127.0.0.1:8770";
const shots = process.env.CLOUDOPS_QA_SCREENSHOT_DIR;
const browser = await chromium.launch({ headless: true, ...(process.env.CLOUDOPS_CHROME_CHANNEL ? { channel: process.env.CLOUDOPS_CHROME_CHANNEL } : {}) });
const errors = [];
const external = [];
const collect = page => {
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", req => {
    if (!req.url().startsWith(base) && !req.url().startsWith("data:") && !req.url().startsWith("blob:")) external.push(req.url());
  });
};
const overflow = page => page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
const phase = page => page.locator(".mission-steps [aria-current='step']").getAttribute("data-mission-step");
const focused = page => page.evaluate(() => document.activeElement?.dataset?.focus || document.activeElement?.id || document.activeElement?.tagName);
const verdict = page => page.locator("#playable-verdict").innerText();

async function open(page, i) {
  await page.goto(base, { waitUntil: "networkidle" });
  await page.locator("#tab-labs").click();
  assert.equal(await page.locator("#incident-catalog button").count(), 3);
  await page.locator("#incident-catalog button").nth(i).click();
  assert.equal(await phase(page), "brief");
  assert.equal(await page.locator("#mission-workbench").isVisible(), false);
  await page.locator("#mission-start").click();
  assert.equal(await phase(page), "workbench");
  assert.equal(await page.locator("#playable-controls input[type=checkbox]").count(), 0, "no checkbox sandbox remains");
  assert.equal(await page.locator("#playable-test").isEnabled(), true);
  assert.equal(await page.locator("#incident-evidence").isVisible(), false, "raw artifacts are optional");
}
const shot = (page, name) => shots ? page.screenshot({ path: `${shots}/${name}.png`, fullPage: true }) : null;

/** Each play returns after reaching a verified result; it first exercises a wrong move and undo. */
const plays = [
  async page => { // IAM
    await page.locator('[data-inspection="BOUNDARY"]').click();
    await page.locator('[data-action="WILDCARD_BOUNDARY"]').click();
    await page.locator("#playable-test").click();
    assert.match(await verdict(page), /UNSAFE/);
    await page.locator("[data-undo]").click();
    assert.equal(await page.locator("#playable-result").isVisible(), false, "undo invalidates the result");
    assert.equal(await page.locator("#mission-to-report").isDisabled(), true);
    await page.locator('[data-action="SCOPED_BOUNDARY"]').click();
    await page.locator("#playable-test").click();
    assert.equal(await verdict(page), "MISSION RESTORED SAFELY");
  },
  async page => { // NAT
    await page.locator('[data-inspection="APP_ROUTES"]').click();
    await page.locator('[data-inspection="NAT_ROUTES"]').click();
    await page.locator('[data-action="SG_ALL"]').click();
    await page.locator("#playable-test").click();
    assert.match(await verdict(page), /TIMEOUT/);
    await page.locator("[data-undo]").click();
    assert.equal(await page.locator("#playable-result").isVisible(), false);
    const select = page.locator("#nat-target-nat-0-0-0-0-0");
    await select.selectOption("igw-0edge");
    await page.locator('[data-focus="replace|nat|0.0.0.0/0"]').click();
    assert.equal(await focused(page), "replace|nat|0.0.0.0/0", "focus returns to an enabled control after re-render");
    await page.locator("#playable-test").click();
    assert.equal(await verdict(page), "HTTPS REACHABLE · SHARED NAT VERIFIED");
  },
  async page => { // DNS
    for (const id of ["FLOW_ZERO", "ANALYST", "RESOLVER_ROWS"]) await page.locator(`[data-evidence="${id}"]`).click();
    assert.match(await page.locator('[data-card="FLOW_ZERO"]').innerText(), /UNCORROBORATED/);
    await page.locator('[data-hypothesis="H_NONE"]').click();
    assert.equal(await focused(page), "hyp|H_NONE");
    await page.locator('[data-action="FLOW_DETAILED"]').click();
    await page.locator("#playable-test").click();
    assert.match(await verdict(page), /NOT SUPPORTED/);
    await page.locator("[data-undo]").click();
    assert.equal(await page.locator("#playable-result").isVisible(), false);
    assert.equal(await page.locator("#mission-to-report").isDisabled(), true);
    assert.notEqual(await focused(page), "BODY", "focus is not dropped to the page body");
    for (const id of ["FLOW_SCOPE", "RESOLVER_START", "CLOUDTRAIL", "HOST", "LEAD", "CACHE"]) await page.locator(`[data-evidence="${id}"]`).click();
    assert.match(await page.locator('[data-card="FLOW_ZERO"]').innerText(), /DISCOUNTED/);
    await page.locator('[data-hypothesis="H_UNKNOWN"]').click();
    const labels = { C_FLOW_EMPTY: "known", C_RESOLVER_START: "known", C_NO_DNS: "unsupported", C_TUNNEL: "unknown", C_PROCESS: "unknown", C_RECOVER: "unsupported", C_CACHE: "unsupported" };
    for (const [claim, label] of Object.entries(labels)) await page.locator(`[data-claim="${claim}"][data-label="${label}"]`).click();
    await page.locator('[data-action="BACKFILL"]').click();
    assert.match(await page.locator(".dns-live").innerText(), /cannot recreate/);
    await page.locator('[data-action="HOST_ON"]').click();
    await page.locator("#playable-test").click();
    assert.equal(await verdict(page), "UNCERTAINTY JUSTIFIED · FUTURE COVERAGE VERIFIED");
  }
];

try {
  for (const [width, height] of [[1440, 900], [390, 844], [320, 740]]) {
    for (let i = 0; i < 3; i++) {
      const page = await browser.newPage({ viewport: { width, height }, acceptDownloads: true });
      collect(page);
      await open(page, i);
      assert.equal(await overflow(page), false, `start ${i} @${width}`);
      await plays[i](page);
      assert.equal(await page.locator("#playable-badge").evaluate(n => n.classList.contains("is-healthy")), true);
      assert.equal(await overflow(page), false, `solved ${i} @${width}`);
      await shot(page, `mission${i}-${width}`);
      if (width === 1440) {
        assert.equal(await page.locator("#mission-to-report").isEnabled(), true);
        await page.locator("#mission-to-report").click();
        assert.equal(await phase(page), "report");
        assert.equal(await page.locator("#incident-fields textarea").count(), 5);
        await page.locator("#mission-use-decision").click();
        assert.match(await page.locator("#incident-answer-fix").inputValue(), /VIRTUAL SYSTEM TEST/);
        await page.locator("#mission-back-decide").click();
        await page.locator("#playable-reset").click();
        assert.equal(await page.locator("#playable-result").isVisible(), false);
        assert.equal(await page.locator("#mission-to-report").isDisabled(), true);
      }
      await page.close();
    }
  }
  assert.deepEqual(errors, [], "no page JS exceptions");
  assert.deepEqual(external, [], "no external network requests");
  console.log(JSON.stringify({ status: "PASS", missions: ["iam", "nat", "dns"], flow: "wrong move, undo, correct fix, verified",
    responsive: [1440, 390, 320], errors: errors.length, offOrigin: external.length }, null, 2));
} finally {
  await browser.close();
}
