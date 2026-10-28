import test from "node:test";
import assert from "node:assert/strict";
import {
  IAM_ACTIONS, IAM_INSPECTIONS, IAM_MISSION_VERSION, newIamMission,
  inspectIamMission, changeIamMission, undoIamMission, testIamMission
} from "../data/iam-mission.mjs";

test("IAM game starts with a failed request and explicit version", () => {
  const start = newIamMission();
  assert.equal(start.version, IAM_MISSION_VERSION);
  assert.equal(start.lastTest, null);
  assert.equal(start.history.length, 0);
  assert.equal(testIamMission(start).result.status, "ACCESS DENIED");
  assert.ok(IAM_ACTIONS.length >= 3);
  assert.ok(IAM_INSPECTIONS.length >= 3);
});

test("investigation reveals evidence only after that inspection", () => {
  const start = newIamMission();
  assert.deepEqual(start.inspections, []);
  assert.equal(start.finding, null);
  const error = inspectIamMission(start, "ERROR");
  assert.match(error.finding, /AccessDenied/);
  assert.doesNotMatch(error.finding, /boundary: no matching Allow/i);
  const boundary = inspectIamMission(error, "BOUNDARY");
  assert.match(boundary.finding, /no matching Allow/);
  assert.deepEqual(start.inspections, []);
});

test("a safe targeted fix restores service and produces a test journal", () => {
  let state = newIamMission();
  state = inspectIamMission(state, "BOUNDARY");
  state = changeIamMission(state, "SCOPED_BOUNDARY");
  const {state: afterTest, result} = testIamMission(state);
  assert.equal(result.healthy, true);
  assert.equal(result.serviceOk, true);
  assert.equal(result.risk, false);
  assert.match(result.explanation, /Other AWS policy layers are not simulated/);
  assert.equal(afterTest.lastTest.status, "MISSION RESTORED SAFELY");
  assert.deepEqual(afterTest.journal.map(x=>x.kind), ["inspect", "change", "test"]);
});

test("unsafe broad grant passes synthetic read but never clears risk", () => {
  const {result} = testIamMission(changeIamMission(newIamMission(), "WILDCARD_BOUNDARY"));
  assert.equal(result.serviceOk, true);
  assert.equal(result.healthy, false);
  assert.equal(result.risk, true);
  assert.match(result.explanation, /unnecessarily broad/);
});

test("wrong identity change denies even if the boundary is fixed; can recover", () => {
  let state = changeIamMission(newIamMission(), "REMOVE_ROLE_ALLOW");
  state = changeIamMission(state, "SCOPED_BOUNDARY");
  assert.equal(testIamMission(state).result.serviceOk, false);
  state = changeIamMission(state, "RESTORE_ROLE_ALLOW");
  assert.equal(testIamMission(state).result.healthy, true);
});

test("undo reverses one configuration change, not the full session", () => {
  let state = changeIamMission(newIamMission(), "WILDCARD_BOUNDARY");
  state = changeIamMission(state, "REMOVE_ROLE_ALLOW");
  state = undoIamMission(state);
  assert.equal(state.identityAllow, true);
  assert.equal(state.boundary, "wildcard");
  state = undoIamMission(state);
  assert.equal(state.boundary, "missing");
  assert.equal(state.history.length, 0);
  assert.equal(testIamMission(state).result.serviceOk, false);
  const extra = undoIamMission(state);
  assert.equal(extra.journal.at(-1).kind, "noop");
});

test("a new change invalidates stale tests; no-op does not", () => {
  const initial = testIamMission(newIamMission()).state;
  const changed = changeIamMission(initial, "SCOPED_BOUNDARY");
  assert.equal(changed.lastTest, null);
  const tested = testIamMission(changed).state;
  const again = changeIamMission(tested, "SCOPED_BOUNDARY");
  assert.equal(again.lastTest.healthy, true);
  assert.equal(again.journal.at(-1).kind, "noop");
});

test("same ordered actions are deterministic and reversibly logged", () => {
  const play = () => {
    let state = newIamMission();
    state = inspectIamMission(state, "ERROR");
    state = changeIamMission(state, "REMOVE_ROLE_ALLOW");
    state = changeIamMission(state, "SCOPED_BOUNDARY");
    state = testIamMission(state).state;
    state = undoIamMission(state);
    return state;
  };
  assert.deepEqual(play(), play());
  assert.deepEqual(newIamMission(), newIamMission());
  assert.notDeepEqual(testIamMission(changeIamMission(newIamMission(), "SCOPED_BOUNDARY")).result,
    testIamMission(changeIamMission(newIamMission(), "REMOVE_ROLE_ALLOW")).result);
});

test("bad action, probe, and stale state fail closed", () => {
  assert.throws(()=>changeIamMission(newIamMission(), "REMOVE_ALL_BOUNDARIES"), /invalid_iam_action/);
  assert.throws(()=>inspectIamMission(newIamMission(), "__proto__"), /invalid_iam_inspection/);
  assert.throws(()=>testIamMission({...newIamMission(), version:999}), /invalid_iam_mission_state/);
});
