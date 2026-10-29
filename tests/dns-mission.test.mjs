import test from "node:test";
import assert from "node:assert/strict";
import { INCIDENTS } from "../data/incident-pilots.mjs";
import {
  DNS_ACTIONS, DNS_CLAIMS, DNS_EVIDENCE, DNS_HYPOTHESES, DNS_MISSION_VERSION, DNS_REFERENCES, DNS_LANES,
  newDnsMission, collectDnsEvidence, readDnsEvidence, setDnsHypothesis, classifyDnsClaim, assessDnsFinding,
  hintDnsMission, changeDnsMission, undoDnsMission, testDnsMission, dnsLaneView, simulateLaterEvent
} from "../data/dns-mission.mjs";

const act = id => DNS_ACTIONS.find(a => a.id === id).action;
const collect = (s, ...ids) => ids.reduce((x, id) => collectDnsEvidence(x, id), s);
const change = (s, ...ids) => ids.reduce((x, id) => changeDnsMission(x, act(id)), s);
const label = (s, pairs) => Object.entries(pairs).reduce((x, [id, l]) => classifyDnsClaim(x, id, l), s);
const result = s => testDnsMission(s).result;
const ALL_EVIDENCE = ["FLOW_ZERO", "ANALYST", "RESOLVER_ROWS", "RESOLVER_START", "CLOUDTRAIL", "FLOW_SCOPE", "HOST", "PCAP", "LEAD", "CACHE"];
const GOOD_LABELS = {
  C_FLOW_EMPTY: "known", C_RESOLVER_START: "known", C_NO_DNS: "unsupported", C_TUNNEL: "unknown",
  C_PROCESS: "unknown", C_RECOVER: "unsupported", C_CACHE: "unsupported"
};
const finished = (ids = ALL_EVIDENCE) =>
  label(setDnsHypothesis(collect(newDnsMission(), ...ids), "H_UNKNOWN"), GOOD_LABELS);
const COLLECTION_PATH_ONLY = ["RESOLVER_ROWS", "RESOLVER_START", "CLOUDTRAIL", "FLOW_ZERO", "HOST", "LEAD", "CACHE"];

test("initial state: nothing collected, old window untouched, version set", () => {
  const s = newDnsMission();
  assert.equal(s.version, DNS_MISSION_VERSION);
  assert.deepEqual([s.evidence, s.hypothesis, s.claims, s.history, s.journal], [[], null, {}, [], []]);
  assert.equal(s.lastTest, null);
  assert.deepEqual(s.config, { resolverLogging: "on", hostTelemetry: "off", hostCache: "on", flowLogs: "standard", packetCapture: "off" });
});

test("scenario facts agree with the resolver-blindspot-v1 case artifacts", () => {
  const incident = INCIDENTS.find(i => i.id === "resolver-blindspot-v1");
  const text = incident.impact + incident.artifacts.map(a => a.body).join("\n");
  for (const token of ["12:00", "12:20", "13:00", "14:00", "Amazon-provided", "VPC Flow Logs", "CloudTrail", "Route 53 Resolver query logging"]) {
    assert.ok(text.includes(token), token);
  }
  const s = collect(newDnsMission(), "FLOW_ZERO", "RESOLVER_START", "HOST", "PCAP", "CLOUDTRAIL");
  assert.match(readDnsEvidence(s, "FLOW_ZERO").reading, /whole day/);
  assert.match(readDnsEvidence(s, "RESOLVER_START").reading, /13:00 UTC/);
  assert.match(readDnsEvidence(s, "HOST").reading, /Not collected/);
  assert.match(readDnsEvidence(s, "PCAP").reading, /Not collected/);
  assert.ok(DNS_REFERENCES.every(r => /^https:\/\/docs\.aws\.amazon\.com\//.test(r.url)));
  assert.equal(DNS_HYPOTHESES.length, 4);
});

test("public data carries no answer key", () => {
  assert.ok(DNS_CLAIMS.every(c => Object.keys(c).sort().join() === "id,text"));
  const text = JSON.stringify([DNS_CLAIMS, DNS_HYPOTHESES, DNS_ACTIONS, DNS_LANES]);
  assert.doesNotMatch(text, /truth|correct answer|solution/i);
  assert.ok(DNS_HYPOTHESES.every(h => Object.keys(h).sort().join() === "id,label"));
});

test("evidence is hidden until collected and unrelated state does not leak it", () => {
  const s = newDnsMission();
  assert.equal(readDnsEvidence(s, "FLOW_SCOPE"), null);
  assert.deepEqual(dnsLaneView(s).filter(l => l.revealed), []);
  const withFlow = collect(s, "FLOW_ZERO");
  assert.deepEqual(dnsLaneView(withFlow).filter(l => l.revealed).map(l => l.id), ["flow"]);
  assert.equal(dnsLaneView(withFlow)[0].showNote, false, "exclusion note waits for the scope evidence");
  assert.equal(dnsLaneView(collect(withFlow, "FLOW_SCOPE"))[0].showNote, true);
  assert.deepEqual(s.evidence, [], "collecting does not mutate the input");
  assert.throws(() => readDnsEvidence(s, "NOPE"), /invalid_dns_evidence/);
  assert.throws(() => collectDnsEvidence(s, "__proto__"), /invalid_dns_evidence/);
});

test("misleading evidence stays uncorroborated, then is discounted once the scope is on the timeline", () => {
  let s = collect(newDnsMission(), "FLOW_ZERO", "ANALYST", "RESOLVER_ROWS", "RESOLVER_START");
  assert.equal(readDnsEvidence(s, "FLOW_ZERO").status, "uncorroborated");
  assert.equal(readDnsEvidence(s, "ANALYST").status, "discounted", "Resolver start already undermines the analyst");
  assert.equal(readDnsEvidence(s, "RESOLVER_ROWS").status, "discounted");
  assert.equal(readDnsEvidence(s, "RESOLVER_START").status, "uncorroborated");
  assert.match(readDnsEvidence(s, "FLOW_ZERO").note, /Single source/);
  s = collect(s, "FLOW_SCOPE", "CLOUDTRAIL");
  assert.equal(readDnsEvidence(s, "FLOW_ZERO").status, "discounted");
  assert.match(readDnsEvidence(s, "FLOW_ZERO").note, /do not capture traffic to the Amazon-provided DNS server/);
  assert.equal(readDnsEvidence(s, "RESOLVER_START").status, "corroborated");
  const only = collect(newDnsMission(), "ANALYST");
  assert.equal(readDnsEvidence(only, "ANALYST").status, "uncorroborated", "an analyst claim alone is not corroborated");
  assert.equal(readDnsEvidence(collect(newDnsMission(), "HOST"), "HOST").status, "direct");
});

test("plausible wrong inference gets corrective evidence, not a generic failure", () => {
  let s = setDnsHypothesis(collect(newDnsMission(), "FLOW_ZERO", "ANALYST"), "H_NONE");
  let a = assessDnsFinding(s).hypothesis;
  assert.equal(a.verdict, "premature");
  assert.match(a.text, /scope you have not checked/);
  assert.doesNotMatch(a.text, /Amazon-provided|13:00/, "does not reveal evidence the player has not collected");
  s = collect(s, "FLOW_SCOPE");
  a = assessDnsFinding(s).hypothesis;
  assert.equal(a.verdict, "unsupported");
  assert.match(a.text, /neither establishes that queries occurred nor excludes it/);
  assert.match(a.text, /AWS documentation/);
  assert.doesNotMatch(a.text, /Resolver query logging config/);
  const r = result(s);
  assert.equal(r.healthy, false);
  assert.equal(r.status, "FINDING NOT SUPPORTED YET");
  assert.match(r.explanation, /Unsupported\. AWS documentation shows/);
  const cache = setDnsHypothesis(collect(newDnsMission(), "CACHE", "RESOLVER_START"), "H_CACHE");
  assert.match(assessDnsFinding(cache).hypothesis.text, /Unsupported\. Resolver query logging config.*nothing for a cache to hide/);
  const tunnel = setDnsHypothesis(collect(newDnsMission(), "LEAD"), "H_TUNNEL");
  assert.equal(assessDnsFinding(tunnel).hypothesis.verdict, "unsupported");
  assert.match(assessDnsFinding(tunnel).hypothesis.text, /lead is a reason to investigate/);
});

test("two independent evidence paths each justify the uncertain conclusion", () => {
  const a = setDnsHypothesis(collect(newDnsMission(), "FLOW_ZERO", "FLOW_SCOPE"), "H_UNKNOWN");
  assert.deepEqual(assessDnsFinding(a).paths, ["flow-scope"]);
  assert.equal(assessDnsFinding(a).hypothesis.verdict, "supported");
  const b = setDnsHypothesis(collect(newDnsMission(), "RESOLVER_ROWS", "RESOLVER_START", "CLOUDTRAIL"), "H_UNKNOWN");
  assert.deepEqual(assessDnsFinding(b).paths, ["collection-start"]);
  assert.equal(assessDnsFinding(b).hypothesis.verdict, "supported");
  const both = setDnsHypothesis(collect(newDnsMission(), ...ALL_EVIDENCE), "H_UNKNOWN");
  assert.equal(assessDnsFinding(both).paths.length, 2);
  assert.match(assessDnsFinding(both).hypothesis.text, /two independent paths/);
  const guess = setDnsHypothesis(newDnsMission(), "H_UNKNOWN");
  assert.equal(assessDnsFinding(guess).hypothesis.verdict, "premature", "uncertainty must be earned with evidence too");
  const half = setDnsHypothesis(collect(newDnsMission(), "FLOW_ZERO"), "H_UNKNOWN");
  assert.equal(assessDnsFinding(half).hypothesis.verdict, "premature");
});

test("claim labels are judged against collected evidence and explain with it", () => {
  let s = classifyDnsClaim(newDnsMission(), "C_NO_DNS", "known");
  assert.equal(assessDnsFinding(s).claims.find(c => c.id === "C_NO_DNS").verdict, "unsupported-by-timeline");
  assert.doesNotMatch(assessDnsFinding(s).claims.find(c => c.id === "C_NO_DNS").text, /could not have seen/);
  s = collect(s, "FLOW_SCOPE");
  const wrong = assessDnsFinding(s).claims.find(c => c.id === "C_NO_DNS");
  assert.equal(wrong.verdict, "incorrect");
  assert.match(wrong.text, /unsupported rather than false/);
  s = classifyDnsClaim(s, "C_NO_DNS", "unsupported");
  assert.equal(assessDnsFinding(s).claims.find(c => c.id === "C_NO_DNS").verdict, "justified");
  const unk = classifyDnsClaim(collect(newDnsMission(), "LEAD", "FLOW_SCOPE"), "C_TUNNEL", "unsupported");
  assert.equal(assessDnsFinding(unk).claims.find(c => c.id === "C_TUNNEL").verdict, "incorrect");
  assert.equal(assessDnsFinding(classifyDnsClaim(collect(newDnsMission(), "RESOLVER_START"), "C_RESOLVER_START", "known")).claims.find(c => c.id === "C_RESOLVER_START").verdict,
    "unsupported-by-timeline", "known needs the corroborating management event too");
  assert.equal(assessDnsFinding(classifyDnsClaim(s, "C_NO_DNS", null)).claims.find(c => c.id === "C_NO_DNS").verdict, "unset");
  assert.throws(() => classifyDnsClaim(s, "C_NOPE", "known"), /invalid_dns_claim/);
  assert.throws(() => classifyDnsClaim(s, "C_NO_DNS", "maybe"), /invalid_dns_label/);
});

test("old history cannot be recovered: backfill is rejected and the past never changes", () => {
  const tested = testDnsMission(change(newDnsMission(), "HOST_ON")).state;
  const next = changeDnsMission(tested, act("BACKFILL"));
  assert.equal(next.journal.at(-1).kind, "rejected");
  assert.match(next.finding, /cannot recreate queries from 12:00-12:20/);
  assert.equal(next.lastTest, tested.lastTest);
  assert.deepEqual(next.config, tested.config);
  assert.equal(next.history.length, tested.history.length);
  for (const id of ["RESOLVER_OFF", "HOST_ON", "CACHE_OFF", "FLOW_DETAILED", "PCAP_ALL"]) {
    const rows = simulateLaterEvent(change(newDnsMission(), id).config).rows;
    assert.equal(rows.find(r => r.key === "past").value, "Unchanged. Still unknown.");
  }
  assert.equal(result(finished()).evidence.includes("past window 12:00-12:20: unknown"), true);
});

test("later event separates Resolver query coverage, host attribution, cache and Flow Logs exclusion", () => {
  const base = simulateLaterEvent(newDnsMission().config).rows;
  const row = (rows, key) => rows.find(r => r.key === key);
  assert.match(row(base, "resolver").value, /^6 of 8 lookups logged, 4 of 4 names/);
  assert.match(row(base, "resolver").value, /Assumes a 60 s record TTL and lookups at \+0, \+5, \+10, \+15, \+30, \+40, \+90, \+120 s/);
  assert.match(row(base, "resolver").value, /not logged/);
  assert.equal(row(base, "process").ok, false);
  assert.match(row(base, "process").value, /identify the instance, not the process/);
  assert.match(row(base, "flow").value, /^0 DNS records.*not captured/);
  const host = simulateLaterEvent(change(newDnsMission(), "HOST_ON").config).rows;
  assert.equal(row(host, "process").ok, true);
  assert.match(row(host, "process").value, /8 of 8 lookups/);
  const nocache = simulateLaterEvent(change(newDnsMission(), "CACHE_OFF").config).rows;
  assert.match(row(nocache, "resolver").value, /^6 of 8 lookups logged, 4 of 4 names/, "the Resolver cache still absorbs in-TTL repeats");
  assert.match(row(nocache, "resolver").value, /8 lookups reached the resolver and 2 of those were answered from the Resolver cache/);
  assert.match(row(base, "resolver").value, /6 lookups reached the resolver and 0 of those/);
  assert.equal(simulateLaterEvent(change(newDnsMission(), "CACHE_OFF").config).logged, 6);
  assert.ok(simulateLaterEvent(newDnsMission().config).logged < 8, "full coverage is never promised");
  const off = simulateLaterEvent(change(newDnsMission(), "RESOLVER_OFF").config).rows;
  assert.match(row(off, "resolver").value, /^0 records.*new blind spot/);
  const detail = simulateLaterEvent(change(newDnsMission(), "FLOW_DETAILED").config).rows;
  assert.match(row(detail, "flow").value, /even with more fields/);
  assert.equal(row(detail, "flow").ok, false);
});

test("wrong fixes fail with explanations: richer Flow Logs, broad capture, disabling Resolver logs, cache off", () => {
  const good = finished();
  const richer = result(change(good, "HOST_ON", "FLOW_DETAILED"));
  assert.equal(richer.healthy, true, "extra Flow Logs fields are harmless but not a fix");
  assert.match(richer.explanation, /Extra Flow Logs fields do not change what Flow Logs exclude/);
  const flowOnly = result(change(good, "FLOW_DETAILED"));
  assert.equal(flowOnly.healthy, false);
  assert.equal(flowOnly.status, "UNCERTAINTY JUSTIFIED · FUTURE COVERAGE GAP");
  assert.match(flowOnly.explanation, /nothing links them to a process/);
  const broad = result(change(good, "HOST_ON", "PCAP_ALL"));
  assert.equal(broad.risk, true);
  assert.equal(broad.healthy, false);
  assert.equal(broad.status, "BROAD CAPTURE · UNSAFE SCOPE");
  assert.match(broad.explanation, /names no process|still names no process/);
  const off = result(change(good, "HOST_ON", "RESOLVER_OFF"));
  assert.equal(off.healthy, false);
  assert.equal(off.serviceOk, false);
  assert.match(off.explanation, /Resolver logging is off/);
  assert.match(off.explanation, /removed the one source/);
  const cache = result(change(good, "HOST_ON", "CACHE_OFF"));
  assert.equal(cache.healthy, true);
  assert.match(cache.explanation, /not needed to learn the names/);
  assert.match(cache.explanation, /does not make the log complete.*Resolver has its own cache/);
  assert.match(cache.coverage[0].value, /^6 of 8/);
});

test("correct path: corroborate, justify uncertainty, scoped host telemetry, verified", () => {
  const s = change(finished(), "HOST_ON");
  const { state, result: r } = testDnsMission(s);
  assert.equal(r.healthy, true);
  assert.equal(r.status, "UNCERTAINTY JUSTIFIED · FUTURE COVERAGE VERIFIED");
  assert.equal(r.risk, false);
  assert.equal(state.lastTest, r);
  assert.match(r.explanation, /window stays unknown/);
  assert.match(r.evidence, /hypothesis: The window cannot be reconstructed/);
  assert.equal(assessDnsFinding(s).complete, true);
  const alt = change(finished(COLLECTION_PATH_ONLY), "HOST_ON");
  assert.deepEqual(assessDnsFinding(alt).paths, ["collection-start"], "no Flow Logs scope evidence was used");
  assert.equal(result(alt).healthy, true, "second evidence path also reaches the conclusion");
  const flowOnlyPath = change(finished(["FLOW_ZERO", "FLOW_SCOPE", "RESOLVER_START", "CLOUDTRAIL", "HOST", "LEAD", "CACHE"]), "HOST_ON");
  assert.deepEqual(assessDnsFinding(flowOnlyPath).paths, ["flow-scope"]);
  assert.equal(result(flowOnlyPath).healthy, true);
});

test("a perfect configuration alone never completes the mission", () => {
  const configOnly = change(newDnsMission(), "HOST_ON");
  const r = result(configOnly);
  assert.equal(r.serviceOk, true);
  assert.equal(r.healthy, false);
  assert.equal(r.status, "NO HYPOTHESIS YET");
  const guessed = result(label(setDnsHypothesis(configOnly, "H_UNKNOWN"), GOOD_LABELS));
  assert.equal(guessed.healthy, false, "labels and hypothesis without collected evidence do not count");
  assert.equal(guessed.status, "FINDING NOT SUPPORTED YET");
  const partial = result(change(setDnsHypothesis(collect(newDnsMission(), "FLOW_ZERO", "FLOW_SCOPE"), "H_UNKNOWN"), "HOST_ON"));
  assert.equal(partial.status, "FINDING INCOMPLETE");
  assert.match(partial.explanation, /7 statement\(s\) still need a label/);
  const wrongLabel = result(change(classifyDnsClaim(finished(), "C_PROCESS", "known"), "HOST_ON"));
  assert.equal(wrongLabel.healthy, false);
  assert.match(wrongLabel.explanation, /1 label\(s\) need review/);
});

test("order matters: the same steps in a different order give different intermediate verdicts", () => {
  const early = assessDnsFinding(setDnsHypothesis(collect(newDnsMission(), "FLOW_ZERO"), "H_NONE")).hypothesis.verdict;
  const late = assessDnsFinding(collect(setDnsHypothesis(collect(newDnsMission(), "FLOW_ZERO"), "H_NONE"), "FLOW_SCOPE")).hypothesis.verdict;
  assert.equal(early, "premature");
  assert.equal(late, "unsupported");
  const a = result(change(newDnsMission(), "RESOLVER_OFF", "RESOLVER_ON"));
  const b = result(change(newDnsMission(), "RESOLVER_OFF"));
  assert.notEqual(a.coverage[0].value, b.coverage[0].value);
});

test("a real change invalidates the last test; no-ops and rejections preserve it and say so", () => {
  const tested = testDnsMission(finished()).state;
  assert.ok(tested.lastTest);
  for (const next of [
    changeDnsMission(tested, act("RESOLVER_ON")), changeDnsMission(tested, act("PCAP_OFF")), changeDnsMission(tested, act("BACKFILL")),
    setDnsHypothesis(tested, "H_UNKNOWN"), classifyDnsClaim(tested, "C_PROCESS", "unknown"), undoDnsMission(tested),
    collectDnsEvidence(tested, "FLOW_ZERO")
  ]) {
    assert.equal(next.lastTest, tested.lastTest);
    assert.ok(["noop", "rejected", "reinspect"].includes(next.journal.at(-1).kind), next.journal.at(-1).kind);
    assert.match(next.finding, /Nothing changed|still valid|No configuration change/);
  }
  assert.match(changeDnsMission(tested, act("RESOLVER_ON")).finding, /Your last test is still valid/);
  assert.match(changeDnsMission(newDnsMission(), act("RESOLVER_ON")).finding, /No test has run yet/);
  assert.equal(changeDnsMission(tested, act("HOST_ON")).lastTest, null);
  assert.equal(setDnsHypothesis(tested, "H_NONE").lastTest, null);
  assert.equal(classifyDnsClaim(tested, "C_PROCESS", "known").lastTest, null);
  assert.equal(classifyDnsClaim(tested, "C_PROCESS", null).lastTest, null);
  assert.equal(collectDnsEvidence(tested, "CLOUDTRAIL").lastTest, tested.lastTest, "already-collected evidence reopens without invalidating");
  const fresh = collectDnsEvidence(testDnsMission(newDnsMission()).state, "HOST");
  assert.equal(fresh.lastTest, null, "new evidence changes what the verdict rests on");
});

test("undo reverses exactly one configuration change; evidence, hypothesis and labels are kept", () => {
  const start = finished();
  let s = change(start, "HOST_ON", "PCAP_ALL");
  s = testDnsMission(s).state;
  s = undoDnsMission(s);
  assert.equal(s.config.packetCapture, "off");
  assert.equal(s.config.hostTelemetry, "on");
  assert.equal(s.lastTest, null);
  assert.deepEqual(s.evidence, start.evidence);
  assert.equal(s.hypothesis, "H_UNKNOWN");
  assert.deepEqual(s.claims, start.claims);
  s = undoDnsMission(s);
  assert.deepEqual(s.config, start.config);
  assert.equal(s.history.length, 0);
  assert.equal(undoDnsMission(s).journal.at(-1).kind, "noop");
  const kept = testDnsMission(s).state;
  assert.equal(undoDnsMission(kept).lastTest, kept.lastTest, "empty undo keeps the existing test");
});

test("repeated clicks are idempotent: evidence once, same hypothesis and label once, same setting once", () => {
  let s = collect(newDnsMission(), "FLOW_ZERO", "FLOW_ZERO", "FLOW_ZERO");
  assert.deepEqual(s.evidence, ["FLOW_ZERO"]);
  assert.deepEqual(s.journal.map(j => j.kind), ["evidence", "reinspect", "reinspect"]);
  s = setDnsHypothesis(setDnsHypothesis(s, "H_NONE"), "H_NONE");
  assert.deepEqual(s.journal.slice(-2).map(j => j.kind), ["hypothesis", "noop"]);
  s = classifyDnsClaim(classifyDnsClaim(s, "C_PROCESS", "unknown"), "C_PROCESS", "unknown");
  assert.deepEqual(s.journal.slice(-2).map(j => j.kind), ["claim", "noop"]);
  s = change(s, "HOST_ON", "HOST_ON", "HOST_ON");
  assert.equal(s.history.length, 1);
  assert.deepEqual(s.journal.slice(-3).map(j => j.kind), ["change", "noop", "noop"]);
});

test("hypothesis can be revised and the journal records what was believed and when", () => {
  let s = collect(newDnsMission(), "FLOW_ZERO", "ANALYST");
  s = setDnsHypothesis(s, "H_NONE");
  s = testDnsMission(s).state;
  s = collect(s, "FLOW_SCOPE");
  s = setDnsHypothesis(s, "H_UNKNOWN");
  s = setDnsHypothesis(s, null);
  assert.equal(s.hypothesis, null);
  assert.equal(assessDnsFinding(s).hypothesis.verdict, "none");
  assert.deepEqual(s.journal.map(j => j.kind), ["evidence", "evidence", "hypothesis", "test", "evidence", "hypothesis", "hypothesis"]);
  assert.match(s.journal[2].description, /^Hypothesis: No DNS queries were sent/);
  assert.match(s.journal[5].description, /^Revised hypothesis to: The window cannot be reconstructed/);
  assert.deepEqual(s.journal.map(j => j.sequence), [1, 2, 3, 4, 5, 6, 7]);
});

test("hints are contextual, counted, journaled and never invalidate a test", () => {
  const start = newDnsMission();
  assert.match(hintDnsMission(start).finding, /sources that existed/);
  const zero = hintDnsMission(collect(start, "FLOW_ZERO"));
  assert.match(zero.finding, /could have seen the traffic/);
  assert.doesNotMatch(zero.finding, /Amazon-provided|13:00/);
  const done = testDnsMission(change(finished(), "HOST_ON")).state;
  const hinted = hintDnsMission(done);
  assert.equal(hinted.hints, 1);
  assert.equal(hinted.lastTest, done.lastTest);
  assert.equal(hinted.journal.at(-1).kind, "hint");
  assert.match(hinted.finding, /Run the test to confirm/);
  assert.equal(result(hinted).evidence.includes("hints used: 1"), true);
  assert.match(hintDnsMission(collect(change(start, "PCAP_ALL"), "FLOW_ZERO", "FLOW_SCOPE")).finding, /Ask whether your hypothesis|commit to a hypothesis/i);
});

test("identical seed and action sequence is deterministic and pure; state survives a JSON reload", () => {
  const play = () => {
    let s = collect(newDnsMission(), "FLOW_ZERO", "ANALYST", "FLOW_SCOPE");
    s = setDnsHypothesis(s, "H_NONE");
    s = change(s, "FLOW_DETAILED");
    s = testDnsMission(s).state;
    s = undoDnsMission(s);
    return setDnsHypothesis(s, "H_UNKNOWN");
  };
  assert.deepEqual(play(), play());
  const original = newDnsMission();
  change(collect(original, "HOST"), "HOST_ON");
  assert.deepEqual(original, newDnsMission());
  const midway = testDnsMission(change(finished(), "FLOW_DETAILED")).state;
  const reloaded = JSON.parse(JSON.stringify(midway));
  assert.deepEqual(reloaded, midway);
  assert.equal(testDnsMission(change(reloaded, "HOST_ON")).result.healthy, true, "an interrupted session resumes where it stopped");
});

test("invalid inputs and tampered state fail closed", () => {
  const s = newDnsMission();
  for (const bad of [null, { type: "DELETE_ZONE" }, { type: "SET_HOST_TELEMETRY", value: "maybe" }, { type: "SET_FLOW_LOGS" }, { type: "SET_PACKET_CAPTURE", value: "on" }, "HOST_ON"]) {
    assert.throws(() => changeDnsMission(s, bad), /invalid_dns_action/);
  }
  assert.throws(() => setDnsHypothesis(s, "H_MAGIC"), /invalid_dns_hypothesis/);
  for (const tampered of [
    { ...s, version: 9 }, { ...s, evidence: ["NOPE"] }, { ...s, evidence: ["HOST", "HOST"] }, { ...s, hypothesis: "H_X" },
    { ...s, claims: { C_PROCESS: "sure" } }, { ...s, claims: { OTHER: "known" } }, { ...s, config: { ...s.config, resolverLogging: "maybe" } },
    { ...s, hints: 1.5 }, null
  ]) {
    assert.throws(() => testDnsMission(tampered), /invalid_dns_mission_state/);
  }
});

test("every evidence item is public, concise and free of em dashes", () => {
  assert.equal(DNS_EVIDENCE.length, 10);
  const text = JSON.stringify([DNS_EVIDENCE, DNS_CLAIMS, DNS_HYPOTHESES, DNS_ACTIONS]);
  assert.doesNotMatch(text, /—/);
  const s = newDnsMission();
  const r = result(s);
  assert.doesNotMatch(r.explanation + r.evidence, /—/);
  assert.doesNotMatch(r.evidence, /ms\b|latency|real packets lost/i);
});

test("audit: no hypothesis is ever called contradicted by evidence that is merely compatible with it", () => {
  const verdicts = new Set();
  const subsets = [[], ["FLOW_ZERO"], ["RESOLVER_ROWS"], ["FLOW_SCOPE"], ["RESOLVER_START"], ["CLOUDTRAIL"], ["CACHE"], ["LEAD"], ["HOST"], ["PCAP"], ["ANALYST"], ALL_EVIDENCE];
  for (const h of DNS_HYPOTHESES) {
    for (const ids of subsets) {
      const a = assessDnsFinding(setDnsHypothesis(collect(newDnsMission(), ...ids), h.id)).hypothesis;
      verdicts.add(a.verdict);
      assert.notEqual(a.verdict, "contradicted", h.id + " with " + ids.join());
      if (h.id !== "H_UNKNOWN" && a.verdict === "unsupported") assert.doesNotMatch(a.text, /Contradict|disprove|ruled out by/i);
    }
  }
  assert.deepEqual([...verdicts].sort(), ["premature", "supported", "unsupported"]);
  for (const id of ["FLOW_SCOPE", "RESOLVER_START"]) {
    const none = assessDnsFinding(setDnsHypothesis(collect(newDnsMission(), id), "H_NONE")).hypothesis;
    const cache = assessDnsFinding(setDnsHypothesis(collect(newDnsMission(), id), "H_CACHE")).hypothesis;
    assert.equal(none.verdict, "unsupported");
    assert.equal(cache.verdict, "unsupported");
    assert.match(none.text, /neither establishes that queries occurred nor excludes it/);
    assert.match(cache.text, /neither establishes that cached queries occurred nor excludes it/);
  }
  for (const h of ["H_NONE", "H_CACHE", "H_TUNNEL"]) {
    assert.equal(assessDnsFinding(setDnsHypothesis(collect(newDnsMission(), ...ALL_EVIDENCE), h)).complete, false);
  }
});
