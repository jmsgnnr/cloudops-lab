/**
 * Field Labs navigation regression test for all entry points.
 * Tests the stat link, tab button, and incident cards at multiple viewport widths.
 * 
 * Optional Playwright dependency loaded from CLOUDOPS_PLAYWRIGHT_MODULE.
 * All tests use local static content; never AWS.
 */
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const playwright = process.env.CLOUDOPS_PLAYWRIGHT_MODULE
  ? await import(pathToFileURL(process.env.CLOUDOPS_PLAYWRIGHT_MODULE).href)
  : await import("playwright");
const base = process.env.CLOUDOPS_PREVIEW_URL || "http://127.0.0.1:8770";
const browser = await playwright.chromium.launch({
  channel: process.env.CLOUDOPS_CHROME_CHANNEL || "chrome",
  headless: true
});
const errors = [];
const external = [];
const collect = page => {
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", req => {
    if (!req.url().startsWith(base) && !req.url().startsWith("data:") && !req.url().startsWith("blob:")) {
      external.push(req.url());
    }
  });
};

try {
  // Test 1: Desktop width (1440px) - Field Labs stat link navigation
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  collect(desktop);
  await desktop.goto(base, { waitUntil: "networkidle" });
  
  // Verify dashboard and initial state
  assert.equal(await desktop.locator("#dashboard").isVisible(), true);
  assert.equal(await desktop.locator("#practice-home").isVisible(), true);
  assert.equal(await desktop.locator("#lab-home").isVisible(), false);
  
  // Test stat link exists and is clickable
  assert.equal(await desktop.locator("#field-labs-stat").count(), 1, "field-labs-stat button should exist");
  assert.equal(await desktop.locator("#field-labs-stat").isVisible(), true);
  
  // Click the "03 FIELD LABS" stat link in meta-strip
  await desktop.locator("#field-labs-stat").click();
  assert.equal(await desktop.locator("#lab-home").isVisible(), true, "Field Labs section should be visible after clicking stat link");
  assert.equal(await desktop.locator("#practice-home").isVisible(), false);
  assert.equal(await desktop.locator("#tab-labs").getAttribute("aria-pressed"), "true");
  
  // Verify incident catalog is rendered with 3 cases
  assert.equal(await desktop.locator("#incident-catalog button").count(), 3, "Should have 3 incident cards");
  
  // Test 2: Tab button navigation (go back first)
  await desktop.locator("#tab-practice").click();
  assert.equal(await desktop.locator("#practice-home").isVisible(), true);
  assert.equal(await desktop.locator("#lab-home").isVisible(), false);
  
  await desktop.locator("#tab-labs").click();
  assert.equal(await desktop.locator("#lab-home").isVisible(), true, "Field Labs section should be visible after clicking tab");
  assert.equal(await desktop.locator("#practice-home").isVisible(), false);
  
  // Test 3: Click each incident card and verify navigation
  const incidents = [
    { index: 0, code: "CASE 01 / IAM / AUTHORIZATION" },
    { index: 1, code: "CASE 02 / NETWORK / ROUTING" },
    { index: 2, code: "CASE 03 / SECURITY / TELEMETRY" }
  ];
  
  for (const incident of incidents) {
    await desktop.locator("#incident-catalog button").nth(incident.index).click();
    assert.equal(await desktop.locator("#incident-view").isVisible(), true, `Incident ${incident.index + 1} view should be visible`);
    assert.equal(await desktop.locator("#dashboard").isVisible(), false);
    
    const code = await desktop.locator("#incident-code").innerText();
    assert.equal(code, incident.code, `Incident ${incident.index + 1} code should match`);
    
    // Verify incident controls exist
    assert.equal(await desktop.locator("#incident-exit").isVisible(), true);
    assert.equal(await desktop.locator("#mission-start").isVisible(), true);
    
    // Go back
    await desktop.locator("#incident-exit").click();
    assert.equal(await desktop.locator("#dashboard").isVisible(), true);
    assert.equal(await desktop.locator("#lab-home").isVisible(), true);
    assert.equal(await desktop.locator("#incident-view").isVisible(), false);
  }
  
  // Test 4: Mobile width (390px) - stat link and tab navigation
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  collect(mobile);
  await mobile.goto(base, { waitUntil: "networkidle" });
  
  // Test stat link on mobile
  await mobile.locator("#field-labs-stat").click();
  assert.equal(await mobile.locator("#lab-home").isVisible(), true, "Field Labs should be visible on mobile after stat link click");
  
  // Verify no horizontal overflow
  const mobileOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  assert.equal(mobileOverflow, false, "Mobile (390px) should not overflow horizontally");
  
  // Test incident navigation on mobile
  await mobile.locator("#incident-catalog button").first().click();
  assert.equal(await mobile.locator("#incident-view").isVisible(), true);
  await mobile.locator("#incident-exit").click();
  assert.equal(await mobile.locator("#lab-home").isVisible(), true);
  
  // Test 5: Narrow mobile width (320px) - tab navigation
  const narrow = await browser.newPage({ viewport: { width: 320, height: 568 } });
  collect(narrow);
  await narrow.goto(base, { waitUntil: "networkidle" });
  
  await narrow.locator("#tab-labs").click();
  assert.equal(await narrow.locator("#lab-home").isVisible(), true, "Field Labs should work at 320px");
  
  const narrowOverflow = await narrow.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  assert.equal(narrowOverflow, false, "320px width should not overflow horizontally");
  
  // Verify no JavaScript errors
  assert.deepEqual(errors, [], "No uncaught browser errors");
  assert.deepEqual(external, [], "No off-origin requests");
  
  console.log(JSON.stringify({
    status: "PASS",
    desktop: "Field Labs stat link, tab button, and all 3 incident cards work correctly",
    mobile: "390px stat link and 320px tab navigation work with no overflow",
    incidents_tested: 3,
    viewports_tested: 3,
    errors: errors.length,
    offOrigin: external.length
  }, null, 2));
} finally {
  await browser.close();
}
