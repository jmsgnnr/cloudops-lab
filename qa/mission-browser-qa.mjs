/**
 * Field Labs v3 browser QA. Optional Playwright dependency loaded from
 * CLOUDOPS_PLAYWRIGHT_MODULE. All tests use local static content; never AWS.
 */
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const playwright = process.env.CLOUDOPS_PLAYWRIGHT_MODULE
  ? await import(pathToFileURL(process.env.CLOUDOPS_PLAYWRIGHT_MODULE).href)
  : await import("playwright");
const base = process.env.CLOUDOPS_PREVIEW_URL || "http://127.0.0.1:8770";
const browser = await playwright.chromium.launch({
  channel:process.env.CLOUDOPS_CHROME_CHANNEL || "chrome",
  headless:true
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
const overflow = page => page.evaluate(() =>
  document.documentElement.scrollWidth > innerWidth + 1
);
const phase = page => page.locator(".mission-steps [aria-current='step']").getAttribute("data-mission-step");

async function prepare(page, i) {
  await page.goto(base,{waitUntil:"networkidle"});
  await page.locator("#tab-labs").click();
  assert.equal(await page.locator("#incident-catalog button").count(),3);
  await page.locator("#incident-catalog button").nth(i).click();
  assert.equal(await phase(page),"brief");
  assert.equal(await page.locator("#mission-headline").innerText()!=="",true);
  assert.equal(await page.locator("#mission-objective").innerText()!=="",true);
  assert.equal(await page.locator("#mission-workbench").isVisible(),false);
  assert.equal(await page.locator("#mission-start").isVisible(),true);
  await page.locator("#mission-start").click();
  assert.equal(await phase(page),"workbench");
  assert.equal(await page.locator("#playable-controls input").count(),3);
  assert.equal(await page.locator("#playable-test").isEnabled(),true,
    "no diagnostic gate before hands-on simulation");
  assert.equal(await page.locator("#mission-clues").evaluate(el=>el.open),false,
    "clue drawer collapsed");
  assert.equal(await page.locator("#incident-evidence").isVisible(),false,
    "raw artifacts are optional");
}

try {
  const desktop=await browser.newPage({
    viewport:{width:1440,height:900},
    acceptDownloads:true
  });
  collect(desktop);
  for(let i=0;i<3;i++){
    await prepare(desktop,i);
    assert.equal(await overflow(desktop),false);
    if(i===0 && process.env.CLOUDOPS_QA_SCREENSHOT_DIR){
      await desktop.screenshot({
        path:process.env.CLOUDOPS_QA_SCREENSHOT_DIR+"/workbench-before.png",
        fullPage:true
      });
    }
    await desktop.locator("#playable-test").click();
    assert.equal(await desktop.locator("#playable-result").isVisible(),true);
    assert.equal(await desktop.locator("#mission-to-report").isEnabled(),true);
    const baseline = await desktop.locator("#playable-verdict").innerText();
    assert.equal(baseline.length>5,true);
    // Every sandbox result must show an official AWS documentation reference link
    const sandboxLink=await desktop.locator("#playable-source");
    assert.equal(await sandboxLink.isVisible(),true,"sandbox reference link should be visible");
    assert.match(await sandboxLink.getAttribute("href"),/^https:\/\/docs\.aws\.amazon\.com\//,"sandbox reference must be official AWS docs");
    assert.equal(await sandboxLink.getAttribute("target"),"_blank","sandbox reference should open in new tab");
    assert.equal(await sandboxLink.getAttribute("rel"),"noopener noreferrer","sandbox reference needs safe external-link attributes");

    await desktop.locator("#playable-controls input").nth(1).check();
    if(i===2) await desktop.locator("#playable-controls input").nth(0).check();
    assert.equal(await desktop.locator("#playable-result").isVisible(),false,
      "a changed setting invalidates old result");
    assert.equal(await desktop.locator("#mission-to-report").isDisabled(),true,
      "cannot debrief as if stale test were current");
    await desktop.locator("#playable-test").click();
    const healthy = await desktop.locator("#playable-verdict").innerText();
    assert.notEqual(healthy,baseline);
    assert.equal(await desktop.locator("#playable-badge").evaluate(n=>n.classList.contains("is-healthy")),true);

    if(i===0 && process.env.CLOUDOPS_QA_SCREENSHOT_DIR){
      await desktop.screenshot({
        path:process.env.CLOUDOPS_QA_SCREENSHOT_DIR+"/workbench-restored.png",
        fullPage:true
      });
    }

    // Technical details are optional, and one explanation appears at a time.
    await desktop.locator("#mission-clues summary").first().click();
    assert.equal(await desktop.locator("#clue-buttons button").count(),3);
    assert.equal(await desktop.locator("#clue-output").isVisible(),false);
    await desktop.locator("#clue-buttons button").first().click();
    assert.equal(await desktop.locator("#clue-output").isVisible(),true);
    assert.equal(await desktop.locator("#clue-raw").evaluate(n=>n.open),false);
    assert.equal((await desktop.locator("#clue-finding").innerText()).length>20,true);
    // Every clue must have an official AWS documentation reference link
    const clueLink=await desktop.locator("#clue-source");
    assert.equal(await clueLink.isVisible(),true,"clue reference link should be visible");
    assert.match(await clueLink.getAttribute("href"),/^https:\/\/docs\.aws\.amazon\.com\//,"clue reference must be official AWS docs");
    assert.equal(await clueLink.getAttribute("target"),"_blank","clue reference should open in new tab");
    assert.equal(await clueLink.getAttribute("rel"),"noopener noreferrer","clue reference needs safe external-link attributes");
    await desktop.locator("#clue-raw summary").click();
    assert.equal(await desktop.locator("#clue-text").isVisible(),true);
    assert.equal((await desktop.locator("#clue-text").innerText()).length>25,true);
    await desktop.locator("#clue-buttons button").nth(1).click();
    assert.equal(await desktop.locator("#clue-raw").evaluate(n=>n.open),false);
    assert.match(await desktop.locator("#clue-progress").innerText(),/2 \/ 3/);
    assert.equal(await desktop.locator("#incident-evidence").isVisible(),false);
    if(i===0 && process.env.CLOUDOPS_QA_SCREENSHOT_DIR){
      await desktop.screenshot({
        path:process.env.CLOUDOPS_QA_SCREENSHOT_DIR+"/workbench-clues.png",
        fullPage:true
      });
    }
    await desktop.locator("#playable-reset").click();
    assert.equal(await desktop.locator("#mission-to-report").isDisabled(),true);
    assert.equal(await desktop.locator("#playable-result").isVisible(),false);
    await desktop.locator("#playable-test").click();
    await desktop.locator("#mission-to-report").click();
    assert.equal(await phase(desktop),"report");
    assert.equal(await desktop.locator("#incident-fields textarea").count(),5);
    assert.equal(await desktop.locator("#incident-answer-diagnosis").isVisible(),true);
    await desktop.locator("#incident-attach").click();
    assert.equal(await desktop.locator("#incident-answer-evidence").isVisible(),true);
    assert.match(await desktop.locator("#incident-answer-evidence").inputValue(),/SYNTHETIC/);
    await desktop.locator("#incident-attach").click();
    assert.match(await desktop.locator("#incident-status").innerText(),/Already included/);
    await desktop.locator("#mission-use-decision").click();
    assert.equal(await desktop.locator("#incident-answer-fix").isVisible(),true);
    assert.match(await desktop.locator("#incident-answer-fix").inputValue(),/VIRTUAL SYSTEM TEST/);

    await desktop.locator("#mission-back-decide").click();
    assert.equal(await phase(desktop),"workbench");
    await desktop.locator("#mission-to-report").click();
    assert.equal(await phase(desktop),"report");
    await desktop.locator("#incident-step-prev").click();
    await desktop.locator("#incident-step-prev").click();
    for(const [n,key] of ["diagnosis","evidence","fix","verify","rollback"].entries()){
      const field=desktop.locator("#incident-answer-"+key);
      assert.equal(await field.isVisible(),true,key);
      await field.fill((await field.inputValue())+" I will verify the modeled result and document uncertainty.");
      if(n<4) await desktop.locator("#incident-step-next").click();
    }
    const waiting=desktop.waitForEvent("download");
    await desktop.locator("#incident-submit").click();
    const download=await waiting;
    assert.match(download.suggestedFilename(),/cloudlabs-.*-response\.json/);
    assert.match(await desktop.locator("#incident-status").innerText(),/Exported to your device/);
    await desktop.locator("#incident-exit").click();
    assert.equal(await desktop.locator("#lab-home").isVisible(),true);
  }

  for(const width of [390,320]){
    const mobile=await browser.newPage({viewport:{width,height:844}});
    collect(mobile);
    await prepare(mobile,0);
    assert.equal(await overflow(mobile),false,`initial width ${width}`);
    await mobile.locator("#playable-test").click();
    assert.equal(await overflow(mobile),false,`test width ${width}`);
    await mobile.locator("#playable-controls input").nth(1).check();
    await mobile.locator("#playable-test").click();
    assert.equal(await overflow(mobile),false,`success width ${width}`);
    await mobile.locator("#mission-clues summary").first().click();
    await mobile.locator("#clue-buttons button").last().click();
    assert.equal(await overflow(mobile),false,`clue width ${width}`);
    if(width===390 && process.env.CLOUDOPS_QA_SCREENSHOT_DIR){
      await mobile.screenshot({
        path:process.env.CLOUDOPS_QA_SCREENSHOT_DIR+"/mobile-workbench.png",
        fullPage:true
      });
    }
    await mobile.locator("#mission-to-report").click();
    assert.equal(await phase(mobile),"report");
    assert.equal(await mobile.locator("#incident-answer-diagnosis").isVisible(),true);
    assert.equal(await overflow(mobile),false,`report width ${width}`);
    await mobile.locator("#incident-exit").click();
    assert.equal(await mobile.locator("#lab-home").isVisible(),true);
    await mobile.close();
  }
  // Codex P2 regression: two different causes can yield the same failure
  // status; optional notes must preserve both experiments.
  const retry=await browser.newPage({viewport:{width:1440,height:900}});
  collect(retry);
  await prepare(retry,1);
  await retry.locator("#playable-test").click();
  assert.equal(await retry.locator("#playable-verdict").innerText(),"HTTPS TIMEOUT");
  await retry.locator("#mission-to-report").click();
  await retry.locator("#mission-use-decision").click();
  const firstNote=await retry.locator("#incident-answer-fix").inputValue();
  assert.match(firstNote,/Traffic reaches the NAT gateway/);
  await retry.locator("#mission-back-decide").click();
  await retry.locator("#playable-controls input").first().uncheck();
  await retry.locator("#playable-test").click();
  assert.equal(await retry.locator("#playable-verdict").innerText(),"HTTPS TIMEOUT");
  await retry.locator("#mission-to-report").click();
  await retry.locator("#mission-use-decision").click();
  const both=await retry.locator("#incident-answer-fix").inputValue();
  assert.match(both,/Traffic reaches the NAT gateway/);
  assert.match(both,/private workload no longer routes/);
  assert.equal((both.match(/\[VIRTUAL SYSTEM TEST: HTTPS TIMEOUT\]/g)||[]).length,2);
  await retry.close();

  assert.deepEqual(errors,[],"no page JS exceptions");
  assert.deepEqual(external,[],"no external network requests");
  console.log(JSON.stringify({
    status:"PASS",cases:3,simulator:"direct access, no inspection gate",
    clues:"optional one-at-a-time with raw evidence collapsed",
    tests:"change invalidation, retry, reset, optional report export",
    responsive:[1440,390,320],errors:errors.length,offOrigin:external.length
  },null,2));
} finally {
  await browser.close();
}
