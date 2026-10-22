import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { INCIDENTS, INCIDENT_PROMPTS, buildIncidentSubmission } from "../data/incident-pilots.mjs";
import { QUESTIONS } from "../data/questions.mjs";

describe("synthetic incident pilots", () => {
  it("has three distinct versioned evidence-rich cases but no grading keys", () => {
    assert.equal(INCIDENTS.length, 3);
    assert.equal(new Set(INCIDENTS.map(i => i.id)).size, 3);
    for (const incident of INCIDENTS) {
      assert.ok(incident.version && incident.title && incident.impact && incident.objective);
      assert.ok(incident.artifacts.length >= 2);
      assert.equal("answers" in incident, false);
      assert.equal("rubric" in incident, false);
      assert.ok(incident.artifacts.every(a => a.label && a.body));
    }
    assert.deepEqual(INCIDENTS.map(i => i.id), ["iam-boundary-v1","private-nat-v1","resolver-blindspot-v1"]);
  });
  it("preserves the 216-question pool separately from incident reports", () => {
    assert.equal(QUESTIONS.length, 216);
    assert.ok(!INCIDENTS.some(i => QUESTIONS.some(q => q.id === i.id)));
    assert.deepEqual(INCIDENT_PROMPTS.map(p => p.key), ["diagnosis","evidence","fix","verify","rollback"]);
  });
  it("builds an ungraded versioned export without accepting client scores", () => {
    const responses = Object.fromEntries(INCIDENT_PROMPTS.map(p => [p.key, "Evidence-based response"]));
    const report = buildIncidentSubmission(INCIDENTS[0], {...responses, score: 100}, "2026-10-17T12:00:00.000Z");
    assert.equal(report.incidentId, INCIDENTS[0].id);
    assert.equal(report.contentVersion, "0.1");
    assert.equal(report.grade, null);
    assert.equal("score" in report, false);
    assert.deepEqual(report.responses, responses);
    assert.equal(report.finishedAt, "2026-10-17T12:00:00.000Z");
    assert.equal(report.reviewMode, "facilitator-only");
  });
  it("rejects incomplete, unknown and overlong answers", () => {
    const responses = Object.fromEntries(INCIDENT_PROMPTS.map(p => [p.key, "  valid text  "]));
    assert.throws(() => buildIncidentSubmission({}, responses), /Unknown/);
    assert.throws(() => buildIncidentSubmission(INCIDENTS[0], {...responses, diagnosis: " "}), /Complete/);
    assert.throws(() => buildIncidentSubmission(INCIDENTS[0], {...responses, rollback: "x".repeat(4001)}), /Complete/);
    assert.equal(buildIncidentSubmission(INCIDENTS[0], responses).responses.diagnosis, "valid text");
  });
});
