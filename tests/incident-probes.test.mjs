import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { INCIDENTS } from "../data/incident-pilots.mjs";
import { INCIDENT_PROBES, getIncidentProbes } from "../data/incident-probes.mjs";

describe("local synthetic investigation console", () => {
  it("provides three unique deterministic checks for every published incident", () => {
    assert.equal(INCIDENTS.length, 3);
    assert.deepEqual(Object.keys(INCIDENT_PROBES).sort(), INCIDENTS.map(x => x.id).sort());
    for (const incident of INCIDENTS) {
      const probes = getIncidentProbes(incident.id);
      assert.equal(probes.length, 3, incident.id);
      assert.equal(new Set(probes.map(x => x.id)).size, probes.length);
      for (const probe of probes) {
        assert.ok(probe.label && probe.query && probe.output && probe.prompt);
        assert.ok(probe.output.length < 1000);
        assert.equal(Object.hasOwn(probe, "grade"), false);
        assert.equal(Object.hasOwn(probe, "answer"), false);
      }
      assert.strictEqual(getIncidentProbes(incident.id), probes);
    }
  });

  it("has concise learner-facing previews for the three cases", () => {
    for (const incident of INCIDENTS) {
      assert.ok(incident.summary.length >= 25 && incident.summary.length <= 95, incident.id);
      assert.ok(incident.impact.length > incident.summary.length, incident.id);
      assert.ok(!incident.summary.includes("correct answer"));
    }
  });

  it("rejects unknown case lookup and keeps telemetry claims consistent", () => {
    assert.deepEqual(getIncidentProbes("missing-case"), []);
    const dns = getIncidentProbes("resolver-blindspot-v1");
    assert.match(dns[0].output, /13:00/);
    assert.match(dns[1].output, /not captured by VPC Flow Logs/);
    const iam = getIncidentProbes("iam-boundary-v1");
    assert.match(iam[2].output, /s3:ListBucket/);
    const nat = getIncidentProbes("private-nat-v1");
    assert.match(nat[1].output, /tgw-0central/);
  });
});
