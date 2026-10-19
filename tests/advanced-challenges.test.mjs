import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TRACKS } from "../data/blueprints.mjs";
import { QUESTIONS } from "../data/questions.mjs";
import { LESSONS } from "../data/lessons.mjs";
import { selectQuestions, shuffleQuestionChoices, evaluate } from "../engine.mjs";
import { ADVANCED_REFERENCES, ADVANCED_REFERENCE_SUPPLEMENTS } from "../data/advanced-challenges.mjs";

const newTracks = {
  architecture: { code: "SAP-C02", counts: [3, 4, 3, 2], multi: 3 },
  devops: { code: "DOP-C02", counts: [3, 2, 2, 2, 1, 2], multi: 3 },
  fieldsecurity: { code: "FIELD-SEC", counts: [3, 3, 3, 3], multi: 3 }
};

describe("engineering challenge pilots", () => {
  it("adds exactly 12 non-duplicated original scenarios per new track", () => {
    assert.equal(QUESTIONS.length, 216);
    const ids = new Set(QUESTIONS.map(q => q.id));
    assert.equal(ids.size, QUESTIONS.length);
    for (const track of Object.keys(newTracks)) {
      const qs = QUESTIONS.filter(q => q.track === track);
      assert.equal(qs.length, 12, track);
      assert.ok(qs.every(q => q.difficulty === "advanced"));
      assert.equal(qs.filter(q => q.answers.length > 1).length, newTracks[track].multi);
      assert.ok(qs.every(q => q.stem.length > 60 && q.explanation.length > 100));
    }
  });
  it("requires detailed, domain-relevant distractors in each advanced pilot", () => {
    for (const track of Object.keys(newTracks)) {
      for (const q of QUESTIONS.filter(q => q.track === track)) {
        const distractors = q.options.filter((_, index) => !q.answers.includes(index));
        assert.ok(distractors.length >= 2, q.id);
        assert.ok(distractors.every(option => option.length >= 55), q.id);
        assert.ok(distractors.every(option =>
          !/console color theme|IAM password policy|disable all audit logs|turn off all security groups/i.test(option)
        ), q.id);
      }
    }
  });
  it("links all 36 advanced claims to domain-specific primary documentation", () => {
    assert.equal(Object.keys(ADVANCED_REFERENCES).length, 36);
    const advanced = QUESTIONS.filter(q => Object.hasOwn(newTracks, q.track));
    assert.equal(advanced.length, 36);
    for (const q of advanced) {
      assert.ok(Object.hasOwn(ADVANCED_REFERENCES, q.id), q.id);
      assert.equal(q.reference, ADVANCED_REFERENCES[q.id], q.id);
      assert.notEqual(q.reference, TRACKS[q.track].guide, q.id);
      const url = new URL(q.reference);
      assert.equal(url.protocol, "https:", q.id);
      const allowed = q.id === "dopx-12"
        ? ["docs.github.com"] // signed build provenance, repo and commit identity
        : ["docs.aws.amazon.com", "developer.hashicorp.com"];
      assert.ok(allowed.includes(url.hostname), q.id);
      assert.ok(url.pathname.split("/").length >= 4, q.id);
    }
  });
  it("documents source revision and signed artifact provenance", () => {
    assert.equal(
      ADVANCED_REFERENCES["dopx-12"],
      "https://docs.github.com/en/actions/concepts/security/artifact-attestations"
    );
  });
  it("supports dopx-03 OIDC trust conditions and separate IAM permission scoping", () => {
    assert.equal(
      ADVANCED_REFERENCES["dopx-03"],
      "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-idp_oidc.html"
    );
    assert.equal(
      ADVANCED_REFERENCE_SUPPLEMENTS["dopx-03"],
      "https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html"
    );
    const q = QUESTIONS.find(item => item.id === "dopx-03");
    assert.ok(q);
    assert.equal(q.reference, ADVANCED_REFERENCES["dopx-03"]);
    assert.equal(q.referenceSupplement, ADVANCED_REFERENCE_SUPPLEMENTS["dopx-03"]);
    assert.match(q.explanation, /audience|repository|branch/i);
    assert.match(q.explanation, /least.privilege/i);
  });
  it("makes secx-01 S3 PutObject write-event evidence and missing GetObject reads unambiguous", () => {
    const q = QUESTIONS.find(item => item.id === "secx-01");
    assert.ok(q);
    assert.match(q.stem, /write-only S3 object data-event selector/i);
    assert.match(q.options[q.answers[0]], /read-level S3 object data events, including GetObject/i);
    assert.match(q.explanation, /PutObject but not GetObject reads/i);
    assert.equal(q.reference, "https://docs.aws.amazon.com/awscloudtrail/latest/userguide/logging-data-events-with-cloudtrail.html");
  });
  it("cites GuardDuty threat detection for secx-02 and retains Inspector findings documentation", () => {
    assert.equal(
      ADVANCED_REFERENCES["secx-02"],
      "https://docs.aws.amazon.com/guardduty/latest/ug/what-is-guardduty.html"
    );
    assert.equal(
      ADVANCED_REFERENCE_SUPPLEMENTS["secx-02"],
      "https://docs.aws.amazon.com/inspector/latest/user/findings-types.html"
    );
    const secx02 = QUESTIONS.find(q => q.id === "secx-02");
    assert.ok(secx02);
    assert.equal(secx02.reference, ADVANCED_REFERENCES["secx-02"]);
    assert.equal(secx02.referenceSupplement, ADVANCED_REFERENCE_SUPPLEMENTS["secx-02"]);
    assert.ok(!secx02.reference.includes("inspector"));
  });
  it("cites the actual remediation for duplicate events and trigger containment", () => {
    assert.equal(
      ADVANCED_REFERENCES["dopx-10"],
      "https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html"
    );
    assert.equal(
      ADVANCED_REFERENCES["secx-06"],
      "https://docs.aws.amazon.com/eventbridge/latest/APIReference/API_DisableRule.html"
    );
    assert.ok(!ADVANCED_REFERENCES["dopx-10"].includes("configuration-concurrency"));
    assert.ok(!ADVANCED_REFERENCES["secx-06"].includes("configuration-concurrency"));
  });
  it("covers all named domains and all supporting lessons", () => {
    for (const [track, expected] of Object.entries(newTracks)) {
      assert.equal(TRACKS[track].code, expected.code);
      assert.equal(TRACKS[track].preview, true);
      assert.deepEqual(
        TRACKS[track].domains.map(d => QUESTIONS.filter(q => q.track === track && q.domain === d.id).length),
        expected.counts
      );
      assert.equal(TRACKS[track].domains.reduce((sum, d) => sum + d.weight, 0), 100);
      for (const domain of TRACKS[track].domains) {
        assert.ok(LESSONS[track][domain.id], domain.id);
      }
    }
    assert.equal(TRACKS.fieldsecurity.independent, true);
  });
  it("keeps practice selection, shuffled answers and IDs safe across every challenge track", () => {
    for (const track of Object.keys(newTracks)) {
      const selected = selectQuestions(QUESTIONS, { track, count: "all" }, () => 0.31);
      assert.equal(selected.length, 12);
      assert.equal(new Set(selected.map(q => q.id)).size, 12);
      assert.ok(selected.every(q => evaluate(q, q.answers)));
      const multi = selected.find(q => q.answers.length > 1);
      assert.ok(multi);
      assert.ok(evaluate(shuffleQuestionChoices(multi, () => 0.25), shuffleQuestionChoices(multi, () => 0.25).answers));
    }
  });
});
