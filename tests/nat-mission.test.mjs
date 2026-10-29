import test from "node:test";
import assert from "node:assert/strict";
import { INCIDENTS } from "../data/incident-pilots.mjs";
import {
  NAT_ACTIONS, NAT_INSPECTIONS, NAT_MISSION_VERSION, NAT_REFERENCES, newNatMission, parseCidr, lookupRoute,
  inspectNatMission, changeNatMission, previewNatChange, undoNatMission, testNatMission
} from "../data/nat-mission.mjs";

const fixNat = { type: "REPLACE_ROUTE", table: "nat", destination: "0.0.0.0/0", target: "igw-0edge" };
const appToIgw = { type: "REPLACE_ROUTE", table: "app", destination: "0.0.0.0/0", target: "igw-0edge" };
const natAction = id => NAT_ACTIONS.find(a => a.id === id).action;
const run = (state, ...actions) => actions.reduce((s, a) => changeNatMission(s, a), state);
const result = state => testNatMission(state).result;

test("initial state reproduces the case: app reaches NAT, NAT subnet default goes to the TGW", () => {
  const start = newNatMission();
  assert.equal(start.version, NAT_MISSION_VERSION);
  assert.equal(start.lastTest, null);
  assert.equal(start.finding, null);
  assert.deepEqual(start.inspections, []);
  assert.equal(start.history.length, 0);
  const r = result(start);
  assert.equal(r.serviceOk, false);
  assert.equal(r.healthy, false);
  assert.equal(r.status, "HTTPS TIMEOUT · DROPPED AT TRANSIT GATEWAY TGW-0CENTRAL");
  assert.deepEqual(r.trace.map(h => [h.key, h.ok]), [
    ["instance", true], ["route-app", true], ["nat", true], ["route-nat", true], ["tgw", false]
  ]);
  assert.equal(r.hopsPassed, 4);
  assert.equal(r.shared.ok, false);
  assert.match(r.evidence, /no real packets|SYNTHETIC/i);
  assert.doesNotMatch(r.evidence, /ms\b|latency|packets? lost/i);
  assert.ok(NAT_INSPECTIONS.length >= 4 && NAT_ACTIONS.length >= 4);
});

test("workbench resources agree with the underlying private-nat-v1 case artifacts", () => {
  const incident = INCIDENTS.find(i => i.id === "private-nat-v1");
  const text = incident.impact + incident.artifacts.map(a => a.body).join("\n");
  for (const token of ["10.20.10.0/24", "10.20.1.0/24", "10.20.0.0/16", "nat-0abc", "tgw-0central", "igw-0edge"]) {
    assert.ok(text.includes(token), token);
  }
  const app = inspectNatMission(newNatMission(), "APP_ROUTES").finding;
  assert.match(app, /10\.20\.10\.0\/24.*0\.0\.0\.0\/0 -> nat-0abc/);
  const nat = inspectNatMission(newNatMission(), "NAT_ROUTES").finding;
  assert.match(nat, /10\.20\.1\.0\/24.*0\.0\.0\.0\/0 -> tgw-0central/);
  assert.ok(NAT_REFERENCES.every(r => /^https:\/\/docs\.aws\.amazon\.com\//.test(r.url)));
});

test("investigation reveals evidence only after that inspection", () => {
  const start = newNatMission();
  const app = inspectNatMission(start, "APP_ROUTES");
  assert.doesNotMatch(app.finding, /tgw-0central/);
  const users = inspectNatMission(app, "NAT_USERS");
  assert.match(users.finding, /10\.20\.12\.0\/24/);
  assert.deepEqual(start.inspections, []);
  assert.deepEqual(users.inspections, ["APP_ROUTES", "NAT_USERS"]);
  assert.match(inspectNatMission(start, "APP_SG").finding, /TCP 443/);
});

test("correct fix: replacing the NAT subnet default route with the IGW restores HTTPS and the shared subnet", () => {
  const fixed = run(newNatMission(), fixNat);
  const { state, result: r } = testNatMission(fixed);
  assert.equal(r.healthy, true);
  assert.equal(r.status, "HTTPS REACHABLE · SHARED NAT VERIFIED");
  assert.deepEqual(r.trace.map(h => h.key), ["instance", "route-app", "nat", "route-nat", "igw", "dest"]);
  assert.ok(r.trace.every(h => h.ok));
  assert.equal(r.shared.ok, true);
  assert.deepEqual(state.journal.map(x => x.kind), ["change", "test"]);
  assert.match(r.explanation, /not simulated/);
});

test("alternative correct fix: remove the bad route then add the default to the IGW", () => {
  let s = run(newNatMission(), { type: "REMOVE_ROUTE", table: "nat", destination: "0.0.0.0/0" });
  const mid = result(s);
  assert.equal(mid.firstFailure.label, "NAT subnet route table");
  assert.match(mid.firstFailure.reason, /No route matches/);
  s = run(s, { type: "ADD_ROUTE", table: "nat", destination: "0.0.0.0/0", target: "igw-0edge" });
  assert.equal(result(s).healthy, true);
});

test("longest-prefix match: a narrower IGW route for the destination also works; a /0 left behind does not hide it", () => {
  const s = run(newNatMission(), { type: "ADD_ROUTE", table: "nat", destination: "203.0.113.0/24", target: "igw-0edge" });
  assert.equal(result(s).healthy, true);
  assert.equal(lookupRoute(s.routes.nat, "203.0.113.10").target, "igw-0edge");
  assert.equal(lookupRoute(s.routes.nat, "198.51.100.1").target, "tgw-0central");
  const miss = run(newNatMission(), { type: "ADD_ROUTE", table: "nat", destination: "198.51.100.0/24", target: "igw-0edge" });
  assert.equal(result(miss).healthy, false);
});

test("wrong fix: pointing the private app default at the IGW worsens the trace and is explained", () => {
  const before = result(newNatMission());
  const wrong = result(run(newNatMission(), appToIgw));
  assert.equal(wrong.serviceOk, false);
  assert.ok(wrong.hopsPassed < before.hopsPassed);
  assert.deepEqual(wrong.trace.map(h => h.key), ["instance", "route-app", "igw"]);
  assert.match(wrong.firstFailure.reason, /no public IPv4 address/);
  assert.match(wrong.status, /DROPPED AT INTERNET GATEWAY/);
  const withNatFixed = result(run(newNatMission(), appToIgw, fixNat));
  assert.equal(withNatFixed.serviceOk, false, "fixing the NAT table cannot rescue an app route that bypasses NAT");
});

test("wrong fix: a NAT gateway in the private app subnet loops on itself even with a good NAT route table", () => {
  const r = result(run(newNatMission(), fixNat, natAction("NAT_TO_APP_SUBNET")));
  assert.equal(r.serviceOk, false);
  assert.equal(r.firstFailure.label, "App subnet route table (where the NAT gateway now sits)");
  assert.match(r.firstFailure.reason, /points back at nat-0abc itself/);
  assert.equal(r.shared.ok, false, "shared subnet is hurt too");
  assert.equal(result(run(newNatMission(), fixNat, natAction("NAT_TO_APP_SUBNET"), natAction("NAT_TO_NAT_SUBNET"))).healthy, true);
});

test("wrong fix: relaxing the security group changes risk but not the routing failure", () => {
  const broad = result(run(newNatMission(), natAction("SG_ALL")));
  assert.equal(broad.serviceOk, false);
  assert.equal(broad.risk, true);
  assert.match(broad.explanation, /routing problem/);
  const fixedBroad = result(run(newNatMission(), natAction("SG_ALL"), fixNat));
  assert.equal(fixedBroad.serviceOk, true);
  assert.equal(fixedBroad.healthy, false);
  assert.equal(fixedBroad.status, "HTTPS REACHABLE · BROADER THAN NEEDED");
  assert.equal(result(run(newNatMission(), natAction("SG_ALL"), fixNat, natAction("SG_HTTPS"))).healthy, true);
});

test("removing the app default route is a distinct failure at the app route table", () => {
  const r = result(run(newNatMission(), { type: "REMOVE_ROUTE", table: "app", destination: "0.0.0.0/0" }));
  assert.deepEqual(r.trace.map(h => h.key), ["instance", "route-app"]);
  assert.match(r.firstFailure.reason, /No route matches 203\.0\.113\.10/);
});

test("order matters: the same changes in a different order give different intermediate results", () => {
  const a = result(run(newNatMission(), appToIgw));
  const b = result(run(newNatMission(), appToIgw, { ...appToIgw, target: "nat-0abc" }));
  assert.notDeepEqual(a, b);
  const restored = run(newNatMission(), appToIgw, { ...appToIgw, target: "nat-0abc" });
  assert.equal(result(restored).firstFailure.label, "Transit gateway tgw-0central");
});

test("undo reverses exactly one change, restores prior route tables and invalidates tests", () => {
  const start = newNatMission();
  let s = run(start, appToIgw, fixNat);
  s = testNatMission(s).state;
  s = undoNatMission(s);
  assert.equal(s.lastTest, null);
  assert.equal(lookupRoute(s.routes.nat, "203.0.113.10").target, "tgw-0central");
  assert.equal(lookupRoute(s.routes.app, "203.0.113.10").target, "igw-0edge");
  s = undoNatMission(s);
  assert.deepEqual(s.routes, start.routes);
  assert.equal(s.history.length, 0);
  assert.equal(undoNatMission(s).journal.at(-1).kind, "noop");
  assert.equal(undoNatMission(s).lastTest, null);
});

test("undo covers NAT location and security-group changes too", () => {
  let s = run(newNatMission(), natAction("NAT_TO_APP_SUBNET"), natAction("SG_ALL"));
  s = undoNatMission(undoNatMission(s));
  assert.equal(s.natSubnet, "nat");
  assert.equal(s.appEgress, "https");
});

test("a real change invalidates the last test; no-ops and rejections preserve it", () => {
  const tested = testNatMission(run(newNatMission(), fixNat)).state;
  assert.equal(tested.lastTest.healthy, true);
  assert.equal(changeNatMission(tested, appToIgw).lastTest, null);
  const noop = changeNatMission(tested, fixNat);
  assert.equal(noop.journal.at(-1).kind, "noop");
  assert.equal(noop.lastTest, tested.lastTest);
  assert.equal(noop.history.length, tested.history.length);
  assert.match(noop.finding, /still valid/);
  for (const action of [natAction("NAT_TO_NAT_SUBNET"), natAction("SG_HTTPS")]) {
    const again = changeNatMission(tested, action);
    assert.equal(again.journal.at(-1).kind, "noop");
    assert.equal(again.lastTest, tested.lastTest);
  }
  assert.equal(undoNatMission(testNatMission(newNatMission()).state).lastTest !== undefined, true);
  const emptyUndo = undoNatMission(tested);
  assert.equal(emptyUndo.journal.at(-1).kind, "undo");
});

test("empty-history undo is a no-op that keeps an existing test result", () => {
  const tested = testNatMission(newNatMission()).state;
  const again = undoNatMission(tested);
  assert.equal(again.journal.at(-1).kind, "noop");
  assert.equal(again.lastTest, tested.lastTest);
});

test("invalid route edits are rejected with an explanation and preserve state and test", () => {
  const tested = testNatMission(newNatMission()).state;
  const cases = [
    [{ type: "ADD_ROUTE", table: "nat", destination: "999.1.1.1/8", target: "igw-0edge" }, /not a valid IPv4 CIDR/],
    [{ type: "ADD_ROUTE", table: "nat", destination: "10.0.0.1/8", target: "igw-0edge" }, /not a valid IPv4 CIDR/],
    [{ type: "ADD_ROUTE", table: "nat", destination: "0.0.0.0/0", target: "igw-0edge" }, /already exists/],
    [{ type: "ADD_ROUTE", table: "nat", destination: "10.20.5.0/24", target: "igw-0edge" }, /VPC range/],
    [{ type: "REPLACE_ROUTE", table: "nat", destination: "172.16.0.0/12", target: "igw-0edge" }, /is not in/],
    [{ type: "REPLACE_ROUTE", table: "nat", destination: "10.20.0.0/16", target: "igw-0edge" }, /local route/],
    [{ type: "REMOVE_ROUTE", table: "app", destination: "10.20.0.0/16" }, /local route/]
  ];
  for (const [action, pattern] of cases) {
    const next = changeNatMission(tested, action);
    assert.equal(next.journal.at(-1).kind, "rejected");
    assert.match(next.finding, pattern);
    assert.equal(next.lastTest, tested.lastTest);
    assert.deepEqual(next.routes, tested.routes);
    assert.equal(next.history.length, 0);
  }
});

test("preview exposes current versus candidate target without mutating state", () => {
  const start = newNatMission();
  const p = previewNatChange(start, fixNat);
  assert.equal(p.outcome, "change");
  assert.equal(p.current, "tgw-0central");
  assert.equal(p.candidate, "igw-0edge");
  assert.equal(previewNatChange(start, { ...fixNat, target: "tgw-0central" }).outcome, "noop");
  assert.equal(previewNatChange(start, { type: "REMOVE_ROUTE", table: "nat", destination: "0.0.0.0/0" }).candidate, "(removed)");
  assert.deepEqual(start, newNatMission());
});

test("same seed and ordered actions are deterministic", () => {
  const play = () => {
    let s = inspectNatMission(newNatMission(), "NAT_ROUTES");
    s = run(s, appToIgw, fixNat);
    s = testNatMission(s).state;
    return undoNatMission(s);
  };
  assert.deepEqual(play(), play());
  assert.deepEqual(newNatMission(), newNatMission());
  const original = newNatMission();
  run(original, fixNat);
  assert.deepEqual(original, newNatMission(), "pure: input state is never mutated");
});

test("journal lists what was inspected, changed, tested and undone, in order", () => {
  let s = inspectNatMission(newNatMission(), "APP_ROUTES");
  s = run(s, appToIgw);
  s = testNatMission(s).state;
  s = undoNatMission(s);
  s = run(s, fixNat);
  s = testNatMission(s).state;
  assert.deepEqual(s.journal.map(x => x.kind), ["inspect", "change", "test", "undo", "change", "test"]);
  assert.deepEqual(s.journal.map(x => x.sequence), [1, 2, 3, 4, 5, 6]);
  assert.match(s.journal[1].description, /Replaced 0\.0\.0\.0\/0 in the App subnet route table: nat-0abc to igw-0edge/);
});

test("CIDR parsing and bad inputs fail closed", () => {
  assert.equal(parseCidr("0.0.0.0/0").prefix, 0);
  assert.equal(parseCidr(" 10.20.0.0/16 ").text, "10.20.0.0/16");
  assert.equal(parseCidr("1.2.3.4"), null);
  assert.equal(parseCidr("1.2.3.4/33"), null);
  assert.equal(parseCidr(7), null);
  assert.throws(() => changeNatMission(newNatMission(), { type: "DELETE_VPC" }), /invalid_nat_action/);
  assert.throws(() => changeNatMission(newNatMission(), { ...fixNat, table: "shared" }), /invalid_nat_action/);
  assert.throws(() => changeNatMission(newNatMission(), { ...fixNat, target: "local" }), /invalid_nat_action/);
  assert.throws(() => changeNatMission(newNatMission(), null), /invalid_nat_action/);
  assert.throws(() => inspectNatMission(newNatMission(), "__proto__"), /invalid_nat_inspection/);
  assert.throws(() => testNatMission({ ...newNatMission(), version: 999 }), /invalid_nat_mission_state/);
  assert.throws(() => testNatMission({ ...newNatMission(), natSubnet: "elsewhere" }), /invalid_nat_mission_state/);
});
