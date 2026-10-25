import assert from "node:assert/strict";
import { test } from "node:test";
import { INCIDENTS, buildIncidentSubmission, INCIDENT_PROMPTS } from "../data/incident-pilots.mjs";
import { getIncidentProbes } from "../data/incident-probes.mjs";
import { INCIDENT_ACTIONS, getIncidentActions, describeIncidentAction } from "../data/incident-actions.mjs";

test("every public synthetic lab has three distinct actionable simulations", () => {
  assert.equal(INCIDENTS.length, 3);
  assert.equal(Object.keys(INCIDENT_ACTIONS).length, 3);
  for (const incident of INCIDENTS) {
    const mission = getIncidentActions(incident.id);
    assert.ok(mission, incident.id);
    assert.ok(mission.objective.length > 40);
    assert.ok(mission.hint.length > 45);
    assert.equal(mission.choices.length, 3);
    assert.equal(new Set(mission.choices.map(c => c.id)).size, 3);
    assert.equal(getIncidentProbes(incident.id).length, 3);
    for (const choice of mission.choices) {
      assert.equal(describeIncidentAction(incident.id, choice.id), choice);
      for (const key of ["id", "label", "type", "preview", "result", "consequence", "next", "caution"]) {
        assert.equal(typeof choice[key], "string", `${incident.id}/${choice.id}/${key}`);
        assert.ok(choice[key].length > 3);
      }
    }
  }
  assert.equal(getIncidentActions("unknown"), null);
  assert.equal(describeIncidentAction("private-nat-v1", "fake"), null);
});

test("real AWS claims remain technically bounded in the synthetic consequences", () => {
  const dns = getIncidentActions("resolver-blindspot-v1");
  const text = dns.choices.map(c => c.consequence).join(" ");
  assert.match(text, /excluded from VPC Flow Logs/i);
  assert.match(text, /cannot reconstruct uncaptured DNS events/i);
  const iam = getIncidentActions("iam-boundary-v1");
  assert.match(iam.choices[0].consequence, /permissions boundary/i);
  const nat = getIncidentActions("private-nat-v1");
  assert.match(nat.choices[2].next, /NAT metrics/i);
});

test("adding new interactive simulation actions does not change incident export format", () => {
  const incident = INCIDENTS[0];
  const responses = Object.fromEntries(INCIDENT_PROMPTS.map((p) => [p.key, `Field note for ${p.key}`]));
  const out = buildIncidentSubmission(incident, responses, "2026-10-22T00:00:00Z");
  assert.equal(out.formatVersion, 1);
  assert.equal(out.reviewMode, "facilitator-only");
  assert.equal(out.grade, null);
  assert.deepEqual(Object.keys(out.responses), INCIDENT_PROMPTS.map(p => p.key));
  assert.equal("simulatedGrade" in out, false);
});
