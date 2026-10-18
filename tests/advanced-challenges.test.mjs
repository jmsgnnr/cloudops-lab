import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TRACKS } from "../data/blueprints.mjs";
import { QUESTIONS } from "../data/questions.mjs";
import { LESSONS } from "../data/lessons.mjs";
import { selectQuestions, shuffleQuestionChoices, evaluate } from "../engine.mjs";

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
