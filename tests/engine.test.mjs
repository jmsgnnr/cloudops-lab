import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  evaluate,
  scoreQuiz,
  selectQuestions,
  readProgress,
  storeProgress,
  recordAttempt,
  emptyProgress,
  STORAGE_KEY
} from "../engine.mjs";
import { QUESTIONS } from "../data/questions.mjs";

describe("evaluate", () => {
  it("matches ordered answer sets for single and multi select", () => {
    const single = QUESTIONS.find((q) => q.answers.length === 1);
    const multi = QUESTIONS.find((q) => q.answers.length > 1);
    assert.ok(single && multi);
    assert.equal(evaluate(single, [single.answers[0]]), true);
    assert.equal(evaluate(single, []), false);
    assert.equal(evaluate(multi, multi.answers), true);
    assert.equal(evaluate(multi, [multi.answers[0]]), false);
  });
});

describe("scoreQuiz", () => {
  it("aggregates percent and domain breakdown", () => {
    const qs = QUESTIONS.filter((q) => q.track === "practitioner").slice(0, 4);
    const answers = Object.fromEntries(qs.map((q) => [q.id, [...q.answers]]));
    const result = scoreQuiz(qs, answers);
    assert.equal(result.correct, 4);
    assert.equal(result.percent, 100);
    assert.ok(Object.keys(result.byDomain).length >= 1);
    assert.equal(result.detail.length, 4);
  });
});

describe("selectQuestions", () => {
  const bank = QUESTIONS;

  it("returns only questions for the requested track and domain", () => {
    const picked = selectQuestions(
      bank,
      { track: "security", domain: "Detection", count: 5, focus: "all" },
      () => 0.5
    );
    assert.ok(picked.length <= 5);
    assert.ok(picked.every((q) => q.track === "security" && q.domain === "Detection"));
  });

  it("respects missed and bookmark filters", () => {
    const id = bank.find((q) => q.track === "practitioner")?.id;
    assert.ok(id);
    const missedOnly = selectQuestions(bank, {
      track: "practitioner",
      count: "all",
      focus: "missed",
      missed: [id],
      bookmarks: []
    });
    assert.deepEqual(missedOnly.map((q) => q.id), [id]);
    const emptyMissed = selectQuestions(bank, {
      track: "practitioner",
      count: 5,
      focus: "missed",
      missed: [],
      bookmarks: []
    });
    assert.equal(emptyMissed.length, 0);
  });

  it("is deterministic with a fixed random function", () => {
    let i = 0;
    const random = () => [0.1, 0.9, 0.3, 0.7][i++ % 4];
    const a = selectQuestions(bank, { track: "networking", count: 5, focus: "all" }, random);
    i = 0;
    const b = selectQuestions(bank, { track: "networking", count: 5, focus: "all" }, random);
    assert.deepEqual(a.map((q) => q.id), b.map((q) => q.id));
  });
});

describe("progress storage", () => {
  it("round-trips progress in a memory storage", () => {
    const mem = new Map();
    const storage = {
      getItem: (k) => (mem.has(k) ? mem.get(k) : null),
      setItem: (k, v) => mem.set(k, v)
    };
    assert.deepEqual(readProgress(storage), emptyProgress());
    const progress = emptyProgress();
    progress.bookmarks.push("clf-01");
    assert.equal(storeProgress(storage, progress), true);
    const loaded = readProgress(storage);
    assert.deepEqual(loaded.bookmarks, ["clf-01"]);
    assert.equal(mem.has(STORAGE_KEY), true);
  });

  it("updates missed list after an attempt", () => {
    const q = QUESTIONS[0];
    const wrongIndex = q.options.findIndex((_, i) => !q.answers.includes(i));
    const next = recordAttempt(emptyProgress(), {
      track: q.track,
      mode: "practice",
      result: scoreQuiz([q], { [q.id]: [wrongIndex] })
    });
    assert.ok(next.missed.includes(q.id));
    const right = recordAttempt(next, {
      track: q.track,
      mode: "practice",
      result: scoreQuiz([q], { [q.id]: [...q.answers] })
    });
    assert.ok(!right.missed.includes(q.id));
  });
});
