import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateBank } from "../engine.mjs";
import { QUESTIONS } from "../data/questions.mjs";
import { TRACKS } from "../data/blueprints.mjs";
import { LESSONS } from "../data/lessons.mjs";

describe("question bank validation", () => {
  it("has no structural issues", () => {
    const { issues, total } = validateBank(QUESTIONS);
    assert.equal(issues.length, 0, issues.join("\n"));
    assert.equal(total, 60);
  });

  it("has twenty questions per track", () => {
    const { counts } = validateBank(QUESTIONS);
    assert.equal(counts.practitioner, 20);
    assert.equal(counts.security, 20);
    assert.equal(counts.networking, 20);
  });
});

describe("blueprint and lesson alignment", () => {
  for (const [trackId, track] of Object.entries(TRACKS)) {
    it(`covers lessons for every ${track.code} domain`, () => {
      const lessons = LESSONS[trackId];
      assert.ok(lessons);
      for (const domain of track.domains) {
        assert.ok(lessons[domain.id], `missing lesson: ${trackId} / ${domain.id}`);
      }
    });
  }

  it("notes ANS-C01 retirement", () => {
    assert.equal(TRACKS.networking.retirement, "2026-12-31");
  });
});
