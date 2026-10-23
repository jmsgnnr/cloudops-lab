/**
 * Optional browser-level regression for guided synthetic labs.
 * Usage: CLOUDOPS_PLAYWRIGHT_MODULE=<installed playwright/index.mjs> node qa/mission-browser-qa.mjs
 * Preview defaults to http://127.0.0.1:8768 and never touches real AWS or payment APIs.
 */
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const playwright = process.env.CLOUDOPS_PLAYWRIGHT_MODULE
  ? await import(pathToFileURL(process.env.CLOUDOPS_PLAYWRIGHT_MODULE).href)
  : await import("playwright");
const base = process.env.CLOUDOPS_PREVIEW_URL || "http://127.0.0.1:8768";
const browser = await playwright.chromium.launch({
  channel: process.env.CLOUDOPS_CHROME_CHANNEL || "chrome",
  headless: true
});
const errors = [], offOrigin = [];
const monitored = page => {
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", req => {
    if (!req.url().startsWith(base) && !req.url().startsWith("data:")) offOrigin.push(req.url());
  });
};
const status = (page) => page.evaluate(() => ({
  phase: [...document.querySelectorAll("[data-mission-step]")].find(n => n.getAttribute("aria-current") === "step")?.dataset.missionStep,
  focusId: document.activeElement?.id,
  overflow: document.documentElement.scrollWidth > innerWidth + 1
}));

try {
  const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads:true });
  monitored(desktop);
  await desktop.goto(base, { waitUntil:"networkidle" });
  await desktop.locator("#tab-labs").click();
  assert.equal(await desktop.locator("#incident-catalog button").count(), 3);
  for (let i=0; i<3; i++) {
    await desktop.locator("#incident-catalog button").nth(i).click();
    assert.equal((await status(desktop)).phase, "brief");
    assert.equal(await desktop.locator("#mission-inspect").isVisible(), false);
    assert.equal((await status(desktop)).focusId, "mission-start");
    assert.equal(await desktop.locator("#mission-objective").innerText() !== "", true);
    await desktop.locator("#mission-start").click();
    assert.equal((await status(desktop)).phase, "inspect");
    assert.equal(await desktop.locator("#mission-to-decide").isDisabled(), true);
    assert.equal(await desktop.locator("#incident-probes button").count(),3);
    await desktop.locator("#incident-probes button").nth(0).click();
    assert.equal(await desktop.locator("#mission-evidence-items li").count(),1);
    await desktop.locator("#incident-probes button").nth(1).click();
    assert.equal(await desktop.locator("#mission-evidence-items li").count(),2);
    assert.equal(await desktop.locator("#mission-to-decide").isEnabled(),true);
    await desktop.locator("#mission-hint-text").evaluate(n=>n.closest("details").open=true);
    assert.equal(await desktop.locator("#mission-hint-text").innerText() !== "",true);

    if(i===0 && process.env.CLOUDOPS_QA_SCREENSHOT_DIR){
      await desktop.screenshot({path:process.env.CLOUDOPS_QA_SCREENSHOT_DIR+"/desktop-inspect.png",fullPage:true});
    }
    await desktop.locator("#mission-to-decide").click();
    assert.equal((await status(desktop)).phase, "decide");
    assert.equal(await desktop.locator("#mission-options button").count(),3);
    assert.equal(await desktop.locator("#mission-to-report").isDisabled(),true);
    await desktop.locator("#mission-options button").first().click();
    assert.equal(await desktop.locator("#mission-to-report").isDisabled(),true);
    await desktop.locator("#mission-run").click();
    assert.equal(await desktop.locator("#mission-outcome").isVisible(),true);
    const initialOutcome = await desktop.locator("#mission-result").innerText();
    assert.equal(initialOutcome.length>4,true);
    await desktop.locator("#mission-options button").last().click();
    assert.equal(await desktop.locator("#mission-outcome").isVisible(),false);
    await desktop.locator("#mission-run").click();
    assert.equal(await desktop.locator("#mission-outcome").isVisible(),true);
    assert.notEqual(await desktop.locator("#mission-result").innerText(), initialOutcome, "trying another action must change the modeled result");
    assert.equal(await desktop.locator("#mission-to-report").isEnabled(),true);
    if(i===0 && process.env.CLOUDOPS_QA_SCREENSHOT_DIR){
      await desktop.screenshot({path:process.env.CLOUDOPS_QA_SCREENSHOT_DIR+"/desktop-simulate.png",fullPage:true});
    }
    await desktop.locator("#mission-to-report").click();
    assert.equal((await status(desktop)).phase,"report");
    assert.equal(await desktop.locator("#incident-fields textarea").count(),5);
    assert.equal(await desktop.locator("#incident-answer-diagnosis").isVisible(),true);
    assert.equal(await desktop.locator("#incident-attach").isEnabled(),true);
    await desktop.locator("#incident-attach").click();
    assert.equal(await desktop.locator("#incident-answer-evidence").isVisible(),true);
    assert.match(await desktop.locator("#incident-answer-evidence").inputValue(),/SYNTHETIC/);
    await desktop.locator("#incident-attach").click();
    assert.match(await desktop.locator("#incident-status").innerText(),/Already added/);
    await desktop.locator("#mission-use-decision").click();
    assert.equal(await desktop.locator("#incident-answer-fix").isVisible(),true);
    assert.match(await desktop.locator("#incident-answer-fix").inputValue(),/SIMULATED ACTION/);
    await desktop.locator("#mission-back-decide").click();
    assert.equal((await status(desktop)).phase,"decide");
    await desktop.locator("#mission-to-report").click();
    assert.equal((await status(desktop)).phase,"report");
    // Walk backward, then forward through every required report field.
    await desktop.locator("#incident-step-prev").click(); // evidence
    await desktop.locator("#incident-step-prev").click(); // diagnosis
    for(const [index,field] of ["diagnosis","evidence","fix","verify","rollback"].entries()){
      const input=desktop.locator("#incident-answer-"+field);
      assert.equal(await input.isVisible(),true,field);
      await input.fill((await input.inputValue())+" I would verify this with an authorized change record and preserve the case evidence.");
      if(index<4)await desktop.locator("#incident-step-next").click();
    }
    const wait = desktop.waitForEvent("download");
    await desktop.locator("#incident-submit").click();
    const download=await wait;
    assert.match(download.suggestedFilename(),/cloudlabs-.*-response\.json/);
    assert.match(await desktop.locator("#incident-status").innerText(),/Exported to your device/);
    await desktop.locator("#incident-exit").click();
    assert.equal(await desktop.locator("#lab-home").isVisible(),true);
  }

  for(const width of [390,320]){
    const mobile=await browser.newPage({viewport:{width,height:844}});
    monitored(mobile);
    await mobile.goto(base,{waitUntil:"networkidle"});
    await mobile.locator("#tab-labs").click();
    await mobile.locator("#incident-catalog button").first().click();
    assert.equal((await status(mobile)).overflow,false);
    await mobile.locator("#mission-start").click();
    await mobile.locator("#incident-probes button").first().click();
    await mobile.locator("#incident-probes button").last().click();
    assert.equal((await status(mobile)).overflow,false);
    await mobile.locator("#mission-to-decide").click();
    await mobile.locator("#mission-options button").nth(1).click();
    await mobile.locator("#mission-run").click();
    assert.equal((await status(mobile)).overflow,false);
    if(width===390&&process.env.CLOUDOPS_QA_SCREENSHOT_DIR){
      await mobile.screenshot({path:process.env.CLOUDOPS_QA_SCREENSHOT_DIR+"/mobile-simulate.png",fullPage:true});
    }
    await mobile.locator("#mission-to-report").click();
    assert.equal((await status(mobile)).overflow,false);
    assert.equal((await status(mobile)).phase,"report");
    assert.equal((await status(mobile)).focusId,"incident-answer-diagnosis");
    mobile.once("dialog",d=>d.accept());
    await mobile.locator("#incident-exit").click();
    assert.equal(await mobile.locator("#lab-home").isVisible(),true);
    await mobile.close();
  }
  assert.deepEqual(errors,[],"no JavaScript exceptions");
  assert.deepEqual(offOrigin,[],"no off-origin requests");
  console.log(JSON.stringify({status:"PASS",cases:3,diagnostics:6,
    decisions:"two simulations per case",report:"5 fields, export, retry, no duplication",
    responsive:[1440,390,320],errors:errors.length,offOrigin:offOrigin.length},null,2));
} finally {
  await browser.close();
}
