import test from "node:test";
import assert from "node:assert/strict";
import {
  MISSION_FEEDBACK_VERSION, FEEDBACK_MISSIONS, FEEDBACK_NOTICE, buildFeedback, replayMission, feedbackToText
} from "../data/mission-feedback.mjs";
import * as iam from "../data/iam-mission.mjs";
import * as nat from "../data/nat-mission.mjs";
import * as dns from "../data/dns-mission.mjs";

const IAM = "iam-boundary-v1", NAT = "private-nat-v1", DNS = "resolver-blindspot-v1";
const ids = { iam: IAM, nat: NAT, dns: DNS };

/* ---------- scripted plays: each returns the final live state ---------- */
const iamPlay = (...steps) => steps.reduce((s, [op, arg]) =>
  op === "inspect" ? iam.inspectIamMission(s, arg) : op === "change" ? iam.changeIamMission(s, arg)
  : op === "undo" ? iam.undoIamMission(s) : iam.testIamMission(s).state, iam.newIamMission());
const natPlay = (...steps) => steps.reduce((s, [op, arg]) =>
  op === "inspect" ? nat.inspectNatMission(s, arg) : op === "change" ? nat.changeNatMission(s, arg)
  : op === "undo" ? nat.undoNatMission(s) : nat.testNatMission(s).state, nat.newNatMission());
const dnsPlay = (...steps) => steps.reduce((s, [op, a, b]) =>
  op === "evidence" ? dns.collectDnsEvidence(s, a) : op === "hypothesis" ? dns.setDnsHypothesis(s, a)
  : op === "claim" ? dns.classifyDnsClaim(s, a, b) : op === "hint" ? dns.hintDnsMission(s)
  : op === "change" ? dns.changeDnsMission(s, a) : op === "undo" ? dns.undoDnsMission(s) : dns.testDnsMission(s).state, dns.newDnsMission());

const fixNat = { type: "REPLACE_ROUTE", table: "nat", destination: "0.0.0.0/0", target: "igw-0edge" };
const narrowNat = { type: "ADD_ROUTE", table: "nat", destination: "203.0.113.0/24", target: "igw-0edge" };
const sgAll = { type: "SET_APP_EGRESS", mode: "all" };
const natToApp = { type: "RECREATE_NAT", subnet: "app" };
const DNS_LABELS = { C_FLOW_EMPTY: "known", C_RESOLVER_START: "known", C_NO_DNS: "unsupported", C_TUNNEL: "unknown", C_PROCESS: "unknown", C_RECOVER: "unsupported", C_CACHE: "unsupported" };
const allEvidence = dns.DNS_EVIDENCE.map(e => ["evidence", e.id]);
const dnsLabels = Object.entries(DNS_LABELS).map(([c, l]) => ["claim", c, l]);
const hostOn = { type: "SET_HOST_TELEMETRY", value: "on" };
const dnsSolved = () => dnsPlay(...allEvidence, ["hypothesis", "H_UNKNOWN"], ...dnsLabels, ["change", hostOn], ["test"]);

const feedback = (id, state) => buildFeedback(id, state.journal);
const text = f => JSON.stringify(f.sections) + JSON.stringify(f.criteria);
const section = (f, id) => f.sections.find(s => s.id === id);
const tags = (f, id) => section(f, id).items.map(i => i.tag);
const criterion = (f, id) => f.criteria.find(c => c.id === id).met;

/* ---------- journal records replayable inputs, without changing existing fields ---------- */
test("every journal entry keeps sequence/kind/description and now records a replayable op", () => {
  for (const state of [iamPlay(["inspect", "BOUNDARY"], ["change", "SCOPED_BOUNDARY"], ["test"], ["undo"]),
    natPlay(["inspect", "APP_SG"], ["change", fixNat], ["test"], ["undo"]), dnsSolved()]) {
    state.journal.forEach((entry, i) => {
      assert.equal(entry.sequence, i + 1);
      assert.equal(typeof entry.kind, "string");
      assert.equal(typeof entry.description, "string");
      assert.equal(typeof entry.op?.t, "string");
    });
  }
});

/* ---------- replay determinism ---------- */
test("replay reproduces the live state exactly and is deterministic for all three missions", () => {
  const lives = {
    iam: iamPlay(["inspect", "ERROR"], ["change", "WILDCARD_BOUNDARY"], ["test"], ["change", "WILDCARD_BOUNDARY"], ["undo"], ["undo"], ["undo"], ["change", "SCOPED_BOUNDARY"], ["test"]),
    nat: natPlay(["inspect", "NAT_ROUTES"], ["change", { type: "ADD_ROUTE", table: "nat", destination: "nope", target: "igw-0edge" }], ["change", sgAll],
      ["test"], ["undo"], ["change", fixNat], ["change", fixNat], ["test"]),
    dns: dnsPlay(["evidence", "FLOW_ZERO"], ["evidence", "FLOW_ZERO"], ["hypothesis", "H_NONE"], ["hypothesis", "H_NONE"], ["claim", "C_NO_DNS", "known"],
      ["hint"], ["change", { type: "BACKFILL_WINDOW" }], ["change", hostOn], ["undo"], ["undo"], ["test"])
  };
  for (const [key, live] of Object.entries(lives)) {
    const first = replayMission(ids[key], live.journal);
    const second = replayMission(ids[key], JSON.parse(JSON.stringify(live.journal)));
    assert.deepEqual(JSON.parse(JSON.stringify(first.final)), JSON.parse(JSON.stringify(live)), key + " final state equals live state");
    assert.deepEqual(first.steps.map(s => s.facts), second.steps.map(s => s.facts), key + " facts are deterministic");
    assert.deepEqual(first.steps.map(s => s.changed), second.steps.map(s => s.changed));
    assert.equal(first.steps.length, live.journal.length + 1);
    assert.deepEqual(first.steps.map(s => s.sequence), live.journal.map((_, i) => i).concat(live.journal.length).map((_, i) => i));
  }
});

test("replay does not mutate the journal it is given and works from a JSON copy", () => {
  const live = natPlay(["inspect", "NAT_ROUTES"], ["change", fixNat], ["test"]);
  const before = JSON.stringify(live.journal);
  replayMission(NAT, live.journal);
  assert.equal(JSON.stringify(live.journal), before);
  assert.equal(replayMission(NAT, JSON.parse(before)).final.lastTest.status, "HTTPS REACHABLE · SHARED NAT VERIFIED");
});

test("replay steps show what changed at each step and start from the fresh state", () => {
  const r = replayMission(IAM, iamPlay(["inspect", "BOUNDARY"], ["change", "SCOPED_BOUNDARY"], ["test"]).journal);
  assert.deepEqual(r.steps.map(s => s.kind), ["start", "inspect", "change", "test"]);
  assert.deepEqual(r.steps[0].changed, []);
  assert.deepEqual(r.steps[1].changed, ["Inspected"]);
  assert.deepEqual(r.steps[2].changed, ["Permissions boundary"]);
  assert.deepEqual(r.steps[3].changed, ["Latest test"]);
  assert.equal(r.steps[0].facts.find(f => f.key === "test").value, "none since the last change");
  assert.equal(r.steps[3].facts.find(f => f.key === "test").value, "MISSION RESTORED SAFELY");
});

test("a change invalidates the shown test and a no-op keeps it, in the replay facts too", () => {
  const r = replayMission(IAM, iamPlay(["change", "SCOPED_BOUNDARY"], ["test"], ["change", "SCOPED_BOUNDARY"], ["change", "WILDCARD_BOUNDARY"]).journal);
  const latest = i => r.steps[i].facts.find(f => f.key === "test").value;
  assert.equal(latest(2), "MISSION RESTORED SAFELY");
  assert.equal(latest(3), "MISSION RESTORED SAFELY", "no-op preserves the verified result");
  assert.equal(latest(4), "none since the last change");
});

test("tampered, partial or mismatched journals are refused instead of guessed at", () => {
  const live = iamPlay(["inspect", "BOUNDARY"], ["change", "SCOPED_BOUNDARY"], ["test"]);
  const copy = () => JSON.parse(JSON.stringify(live.journal));
  let j = copy(); j[1].description = "Applied something else";
  assert.throws(() => replayMission(IAM, j), /replay_diverged/);
  j = copy(); j[1].kind = "noop";
  assert.throws(() => replayMission(IAM, j), /replay_diverged/);
  j = copy(); delete j[0].op;
  assert.throws(() => replayMission(IAM, j), /journal_not_replayable/);
  j = copy(); j[2].sequence = 9;
  assert.throws(() => replayMission(IAM, j), /journal_not_replayable/);
  j = copy(); j[0].op = { t: "inspect", id: "NOT_A_SOURCE" };
  assert.throws(() => replayMission(IAM, j), /replay_invalid_operation/);
  j = copy(); j[0].op = { t: "teleport" };
  assert.throws(() => replayMission(IAM, j), /replay_invalid_operation/);
  assert.throws(() => replayMission(IAM, "nope"), /journal_not_replayable/);
  assert.throws(() => replayMission("__proto__", []), /unknown_mission/);
  assert.throws(() => replayMission("toString", []), /unknown_mission/);
  assert.throws(() => buildFeedback(NAT, live.journal), /replay_/, "an IAM journal is not a NAT journal");
  assert.deepEqual(FEEDBACK_MISSIONS, [IAM, NAT, DNS]);
});

/* ---------- IAM feedback ---------- */
test("IAM: inspecting first then the scoped fix is named as investigated and restored", () => {
  const f = feedback(IAM, iamPlay(["inspect", "BOUNDARY"], ["change", "SCOPED_BOUNDARY"], ["test"]));
  assert.equal(f.version, MISSION_FEEDBACK_VERSION);
  assert.equal(f.outcome.id, "restored-evidence");
  assert.equal(f.outcome.label, "RESTORED SAFELY · INVESTIGATED BEFORE CHANGING");
  assert.equal(f.complete, true);
  assert.ok(f.criteria.every(c => c.met));
  assert.deepEqual(tags(f, "evidence"), ["OPENED", "NOT OPENED"]);
  assert.match(section(f, "evidence").items[1].text, /Read the job's latest error; Inspect the role policy/);
  assert.match(text(f), /Reverting only this setting makes the model test fail/);
  assert.equal(f.stats.changes, 1);
});

test("IAM: brute-forcing the safe setting without evidence is not given the investigated outcome", () => {
  const f = feedback(IAM, iamPlay(["change", "SCOPED_BOUNDARY"], ["test"]));
  assert.equal(f.outcome.id, "restored-unprobed");
  assert.match(f.outcome.label, /CHANGED BEFORE INSPECTING/);
  assert.equal(f.complete, true, "service is restored, so completion is never blocked");
  assert.equal(criterion(f, "inspected"), false);
  assert.equal(criterion(f, "restored"), true);
  assert.equal(section(f, "moves").items[0].tag, "ORDER");
  assert.match(section(f, "moves").items[0].text, /before you opened any source of evidence/);
  assert.match(section(f, "evidence").items.at(-1).text, /Not opened \(3 of 3\)/);
  assert.notEqual(f.outcome.label, feedback(IAM, iamPlay(["inspect", "BOUNDARY"], ["change", "SCOPED_BOUNDARY"], ["test"])).outcome.label);
});

test("IAM: an exploratory change that was undone does not decide the outcome, but is still listed", () => {
  const f = feedback(IAM, iamPlay(["change", "WILDCARD_BOUNDARY"], ["test"], ["undo"], ["inspect", "BOUNDARY"], ["change", "SCOPED_BOUNDARY"], ["test"]));
  assert.equal(f.outcome.id, "restored-evidence");
  assert.equal(section(f, "moves").items[0].tag, "ORDER", "the early change is still reported");
  assert.match(section(f, "moves").items[1].text, /not used "Inspect the permissions boundary" before this change/);
  const kept = feedback(IAM, iamPlay(["change", "WILDCARD_BOUNDARY"], ["inspect", "BOUNDARY"], ["change", "SCOPED_BOUNDARY"], ["test"]));
  assert.equal(kept.outcome.id, "restored-unprobed", "a change that was not undone and was made blind still counts");
});

test("IAM: a wide shortcut is reported with the test that flagged it, and its undo", () => {
  const f = feedback(IAM, iamPlay(["inspect", "BOUNDARY"], ["change", "WILDCARD_BOUNDARY"], ["test"], ["undo"], ["change", "SCOPED_BOUNDARY"], ["test"]));
  const wide = section(f, "moves").items[0];
  assert.equal(wide.tag, "BROADER THAN NEEDED");
  assert.match(wide.text, /ACCESS RESTORED · UNSAFE/);
  assert.match(wide.text, /undid it at step 4/);
  assert.match(wide.text, /unsafe shortcut/);
  assert.match(wide.detail, /unnecessarily broad access/, "the mission's own explanation is quoted verbatim");
  assert.deepEqual(wide.basis, [2, 3, 4]);
  assert.equal(f.outcome.id, "restored-evidence");
});

test("IAM: leaving the wide boundary in place is not a safe outcome", () => {
  const f = feedback(IAM, iamPlay(["inspect", "BOUNDARY"], ["change", "WILDCARD_BOUNDARY"], ["test"]));
  assert.equal(f.outcome.id, "unsafe");
  assert.equal(f.complete, false);
  assert.equal(criterion(f, "safe"), false);
  assert.equal(tags(f, "scope")[0], "BROADER THAN NEEDED");
  assert.match(section(f, "scope").items[0].text, /every S3 object/);
});

test("IAM: a wrong identity change is shown as tested and not restored; an untested change says so", () => {
  const f = feedback(IAM, iamPlay(["inspect", "IDENTITY"], ["change", "REMOVE_ROLE_ALLOW"], ["test"], ["undo"], ["change", "SCOPED_BOUNDARY"], ["undo"]));
  assert.equal(section(f, "moves").items[0].tag, "TESTED, NOT RESTORED");
  assert.match(section(f, "moves").items[0].text, /ACCESS DENIED/);
  const untested = section(f, "moves").items[1];
  assert.equal(untested.tag, "NOT TESTED");
  assert.match(untested.text, /No test followed before you changed course/);
  assert.match(untested.text, /not used "Inspect the permissions boundary"/);
  assert.equal(f.outcome.id, "unverified", "tests ran, but none after the last change");
  assert.match(text(f) + JSON.stringify(section(f, "scope")), /nothing remains changed/);
});

test("IAM: outcome names for never tested, stale test and no-op that keeps the verified result", () => {
  assert.equal(feedback(IAM, iam.newIamMission()).outcome.id, "not-tested");
  assert.equal(feedback(IAM, iamPlay(["inspect", "BOUNDARY"], ["change", "SCOPED_BOUNDARY"])).outcome.id, "not-tested");
  const stale = feedback(IAM, iamPlay(["change", "SCOPED_BOUNDARY"], ["test"], ["change", "WILDCARD_BOUNDARY"]));
  assert.equal(stale.outcome.id, "unverified");
  assert.equal(stale.complete, false);
  assert.match(section(stale, "verification").items[0].text, /no longer matches the configuration, which changed at step 3/);
  const kept = feedback(IAM, iamPlay(["inspect", "BOUNDARY"], ["change", "SCOPED_BOUNDARY"], ["test"], ["change", "SCOPED_BOUNDARY"]));
  assert.equal(kept.outcome.id, "restored-evidence", "repeating a setting must not discard the verified result");
  assert.ok(tags(kept, "moves").includes("NO CHANGE"));
});

/* ---------- NAT feedback ---------- */
test("NAT: route fix after opening the route tables and the shared users is restored with evidence", () => {
  const f = feedback(NAT, natPlay(["inspect", "APP_ROUTES"], ["inspect", "NAT_ROUTES"], ["inspect", "NAT_USERS"], ["change", fixNat], ["test"]));
  assert.equal(f.outcome.id, "restored-evidence");
  assert.match(text(f), /before changing the NAT gateway or its route table/);
  assert.match(JSON.stringify(section(f, "verification")), /10\.20\.12\.0\/24\) passed/);
  assert.match(JSON.stringify(section(f, "scope")), /every internet destination that has no more specific route/);
  assert.match(JSON.stringify(section(f, "rollback")), /set NAT subnet route table, route 0\.0\.0\.0\/0 back to: tgw-0central/);
});

test("NAT: the same fix without opening anything is named differently and warns about blast radius", () => {
  const f = feedback(NAT, natPlay(["change", fixNat], ["test"]));
  assert.equal(f.outcome.id, "restored-unprobed");
  assert.equal(f.complete, true);
  assert.equal(section(f, "moves").items[0].tag, "ORDER");
  const radius = section(f, "verification").items.find(i => i.tag === "BLAST RADIUS");
  assert.match(radius.text, /before opening who else sends traffic to nat-0abc/);
  assert.deepEqual(radius.basis, [1]);
});

test("NAT: a narrow route is described by its own scope, not as a default-route fix", () => {
  const f = feedback(NAT, natPlay(["inspect", "NAT_ROUTES"], ["inspect", "NAT_USERS"], ["change", narrowNat], ["test"]));
  const scope = JSON.stringify(section(f, "scope"));
  assert.match(scope, /203\.0\.113\.0\/24 route matches only that range; other internet destinations keep following the default route/);
  assert.doesNotMatch(scope, /matches every internet destination/);
});

test("NAT: extra settings the test did not need are marked per setting", () => {
  const f = feedback(NAT, natPlay(["inspect", "NAT_ROUTES"], ["inspect", "NAT_USERS"], ["change", narrowNat], ["change", fixNat], ["test"]));
  assert.equal(f.outcome.id, "restored-evidence");
  const notNeeded = section(f, "scope").items.filter(i => i.tag === "NOT REQUIRED");
  assert.ok(notNeeded.length >= 1);
  assert.match(notNeeded[0].text, /still passes the model test, so the test did not need it/);
});

test("NAT: the unsafe shortcuts are reported as broader than needed and as not restoring service", () => {
  const sg = feedback(NAT, natPlay(["inspect", "APP_SG"], ["change", sgAll], ["test"]));
  assert.equal(section(sg, "moves").items[0].tag, "NOT RESTORED, BROADER THAN NEEDED");
  assert.match(section(sg, "moves").items[0].text, /HTTPS TIMEOUT/);
  assert.equal(sg.outcome.id, "open");
  const leftOver = feedback(NAT, natPlay(["inspect", "NAT_ROUTES"], ["inspect", "NAT_USERS"], ["inspect", "APP_SG"], ["change", fixNat], ["change", sgAll], ["test"]));
  assert.equal(leftOver.outcome.id, "unsafe");
  assert.equal(tags(leftOver, "moves")[1], "BROADER THAN NEEDED");
  assert.equal(tags(leftOver, "scope")[1], "BROADER THAN NEEDED");
  assert.equal(leftOver.complete, false);
  const moved = feedback(NAT, natPlay(["inspect", "NAT_ROUTES"], ["change", natToApp], ["test"]));
  assert.match(section(moved, "moves").items[0].text, /unsafe shortcut/);
  assert.match(section(moved, "moves").items[0].text, /DROPPED AT/);
});

test("NAT: rejected input is reported and changes nothing in the outcome", () => {
  const f = feedback(NAT, natPlay(["inspect", "NAT_ROUTES"], ["change", { type: "ADD_ROUTE", table: "nat", destination: "10.20.5.0/24", target: "igw-0edge" }], ["test"]));
  const rejected = section(f, "moves").items.find(i => i.tag === "REJECTED");
  assert.match(rejected.text, /falls inside the VPC range/);
  assert.equal(f.stats.changes, 0);
  assert.equal(f.outcome.id, "open");
});

/* ---------- DNS feedback ---------- */
test("DNS: the justified-uncertainty path with future coverage is verified", () => {
  const f = feedback(DNS, dnsSolved());
  assert.equal(f.outcome.id, "restored");
  assert.equal(f.outcome.label, "FINDING SUPPORTED · FUTURE COVERAGE VERIFIED");
  assert.equal(f.complete, true);
  assert.ok(f.criteria.every(c => c.met));
  assert.equal(section(f, "finding").items.filter(i => i.tag === "JUSTIFIED").length, 7);
  assert.match(JSON.stringify(section(f, "verification")), /stays unknown whatever you configure/);
  assert.match(JSON.stringify(section(f, "evidence")), /You opened every available source \(10 of 10\)/);
});

test("DNS: guessing settings without evidence gets no diagnostic credit", () => {
  const f = feedback(DNS, dnsPlay(["change", hostOn], ["change", { type: "SET_PACKET_CAPTURE", value: "all" }], ["undo"], ["test"]));
  assert.equal(f.outcome.id, "open");
  assert.equal(f.complete, false);
  assert.equal(criterion(f, "supported"), false);
  assert.equal(criterion(f, "coverage"), true, "coverage alone is not a finding");
  assert.match(section(f, "evidence").items[0].text, /Not opened \(10 of 10\)/);
});

test("DNS: a hypothesis stated before any source is flagged, and a revision shows the sources behind it", () => {
  const f = feedback(DNS, dnsPlay(["hypothesis", "H_NONE"], ["evidence", "FLOW_ZERO"], ["evidence", "FLOW_SCOPE"], ["hypothesis", "H_UNKNOWN"]));
  const moves = section(f, "moves").items;
  assert.equal(moves[0].tag, "BEFORE EVIDENCE");
  assert.match(moves[0].text, /No source was on your timeline yet/);
  assert.equal(moves[1].tag, "HYPOTHESIS");
  assert.match(moves[1].text, /2 of 10 sources were on your timeline/);
});

test("DNS: a no-queries hypothesis is reported as unsupported, never as contradicted or disproved", () => {
  const f = feedback(DNS, dnsPlay(["evidence", "FLOW_ZERO"], ["evidence", "FLOW_SCOPE"], ["evidence", "RESOLVER_START"], ["hypothesis", "H_NONE"], ["test"]));
  const finding = section(f, "finding").items[0];
  assert.equal(finding.tag, "NOT SUPPORTED");
  assert.match(finding.text, /do not support this hypothesis\. They do not exclude the activity either/);
  assert.match(finding.text, /"What traffic do VPC Flow Logs not capture\?" and "When did query logging start collecting\?"/);
  assert.doesNotMatch(JSON.stringify(f), /contradict/i, "no mission text that says contradicted is quoted");
});

test("DNS: empty results taken without checking what the source could see are called out", () => {
  const f = feedback(DNS, dnsPlay(["evidence", "FLOW_ZERO"], ["evidence", "RESOLVER_ROWS"]));
  assert.equal(tags(f, "moves").filter(t => t === "UNCHECKED").length, 2);
  assert.match(section(f, "moves").items[0].text, /empty VPC Flow Logs result without opening what that source could see/);
  const checked = feedback(DNS, dnsPlay(["evidence", "FLOW_ZERO"], ["evidence", "FLOW_SCOPE"]));
  assert.ok(!tags(checked, "moves").includes("UNCHECKED"));
});

test("DNS: the backfill attempt is rejected, broad capture is flagged, hints are counted", () => {
  const f = feedback(DNS, dnsPlay(["hint"], ["change", { type: "BACKFILL_WINDOW" }], ["change", { type: "SET_PACKET_CAPTURE", value: "all" }], ["hint"], ["test"]));
  assert.match(section(f, "moves").items.find(i => i.tag === "REJECTED").text, /cannot recreate queries from 12:00-12:20/);
  assert.match(section(f, "moves").items.find(i => i.tag === "HINTS").text, /2 hints \(steps 1, 4\)/);
  assert.equal(f.outcome.id, "unsafe");
  assert.equal(tags(f, "scope")[0], "BROADER THAN NEEDED");
  assert.equal(criterion(f, "narrow"), false);
  assert.equal(f.stats.hints, 2);
});

test("DNS: a supported finding with a coverage gap is not named as verified coverage", () => {
  const f = feedback(DNS, dnsPlay(...allEvidence, ["hypothesis", "H_UNKNOWN"], ...dnsLabels, ["test"]));
  assert.equal(f.outcome.id, "partial");
  assert.equal(f.complete, false);
  assert.equal(criterion(f, "supported"), true);
  assert.equal(criterion(f, "coverage"), false);
});

test("DNS: the cache setting note is carried only when the setting was left changed", () => {
  const off = { type: "SET_HOST_CACHE", value: "off" };
  const left = feedback(DNS, dnsPlay(...allEvidence, ["hypothesis", "H_UNKNOWN"], ...dnsLabels, ["change", hostOn], ["change", off], ["test"]));
  assert.ok(tags(left, "verification").includes("SETTING NOTE"));
  assert.equal(tags(left, "scope").filter(t => t === "NOT REQUIRED").length, 1);
  const undone = feedback(DNS, dnsPlay(...allEvidence, ["hypothesis", "H_UNKNOWN"], ...dnsLabels, ["change", hostOn], ["change", off], ["undo"], ["test"]));
  assert.ok(!tags(undone, "verification").includes("SETTING NOTE"));
});

/* ---------- derivability, wording limits and purity ---------- */
const plays = () => [
  iamPlay(["change", "WILDCARD_BOUNDARY"], ["test"], ["undo"], ["inspect", "BOUNDARY"], ["change", "SCOPED_BOUNDARY"], ["test"]),
  natPlay(["inspect", "NAT_ROUTES"], ["change", sgAll], ["test"], ["undo"], ["change", fixNat], ["change", { type: "REMOVE_ROUTE", table: "app", destination: "9.9.9.0/24" }], ["test"]),
  dnsSolved(), dnsPlay(["hypothesis", "H_NONE"], ["evidence", "FLOW_ZERO"], ["change", { type: "BACKFILL_WINDOW" }], ["test"])
];
test("every statement cites only journal steps that exist, and step numbers in the text are real", () => {
  for (const [i, state] of plays().entries()) {
    const f = buildFeedback(Object.values(ids)[i === 3 ? 2 : i], state.journal);
    const max = state.journal.length;
    for (const s of f.sections) for (const item of s.items) {
      for (const b of item.basis) assert.ok(Number.isInteger(b) && b >= 1 && b <= max, `${f.missionId} basis ${b}`);
      for (const m of item.text.matchAll(/\bsteps? (\d+(?:, \d+)*)/gi)) for (const n of m[1].split(", ")) assert.ok(Number(n) >= 1 && Number(n) <= max, item.text);
    }
  }
});

test("feedback is a pure function of the journal: other state fields cannot change it", () => {
  for (const [i, state] of plays().entries()) {
    const id = Object.values(ids)[i === 3 ? 2 : i];
    const a = buildFeedback(id, state.journal);
    const b = buildFeedback(id, JSON.parse(JSON.stringify(state.journal)));
    assert.deepEqual(a, b);
    assert.deepEqual(JSON.parse(JSON.stringify(a)), a, "JSON-safe");
    assert.deepEqual(a, buildFeedback(id, state.journal), "repeatable");
  }
});

test("no score, grade, percentage or credential language outside the explicit notice", () => {
  for (const [i, state] of plays().entries()) {
    const f = buildFeedback(Object.values(ids)[i === 3 ? 2 : i], state.journal);
    assert.equal(f.notice, FEEDBACK_NOTICE);
    const body = JSON.stringify({ ...f, notice: "" });
    assert.doesNotMatch(body, /\bscore|\bgrade|\bpoints?\b|%|\bcertif|\bpass(?:ed)? the exam|\bperfect|\brank\b|\bbadge\b/i);
    assert.doesNotMatch(feedbackToText(f).replace(FEEDBACK_NOTICE, ""), /\bscore|\bgrade\b|%/i);
    assert.ok(feedbackToText(f).length <= 3200);
  }
});

test("limits carry official AWS documentation links for non-derived claims", () => {
  for (const id of FEEDBACK_MISSIONS) {
    const f = buildFeedback(id, []);
    assert.ok(f.limits.length >= 2);
    for (const limit of f.limits) assert.match(limit.url, /^https:\/\/docs\.aws\.amazon\.com\//);
  }
});

test("an empty journal yields an honest not-started review", () => {
  for (const id of FEEDBACK_MISSIONS) {
    const f = buildFeedback(id, []);
    assert.equal(f.outcome.id, "not-tested");
    assert.equal(f.complete, false);
    assert.equal(f.stats.steps, 0);
    assert.match(JSON.stringify(f.sections), /No configuration change has been made yet/);
  }
});
