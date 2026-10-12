import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  evaluate,
  scoreQuiz,
  selectQuestions,
  shuffleQuestionChoices,
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

describe("choice order randomization", () => {
  it("remaps the answer index when it changes option order, without touching the bank", () => {
    const original = QUESTIONS.find(q => q.id === "scs-21");
    const before = [...original.options];
    const shuffled = shuffleQuestionChoices(original, () => 0);
    assert.notDeepEqual(shuffled.options, original.options);
    assert.deepEqual(original.options, before);
    assert.deepEqual(
      shuffled.answers.map(i => shuffled.options[i]).sort(),
      original.answers.map(i => original.options[i]).sort()
    );
    assert.ok(evaluate(shuffled, shuffled.answers));
    assert.deepEqual(shuffled.answers.map(i => shuffled.options[i]), original.answers.map(i => original.options[i]));
  });

  it("keeps all correct choices for multi-answer questions", () => {
    const original = QUESTIONS.find(q => q.track === "networking" && q.answers.length > 1);
    const shuffled = shuffleQuestionChoices(original, () => 0);
    assert.equal(shuffled.answers.length, original.answers.length);
    assert.deepEqual(
      shuffled.answers.map(i => shuffled.options[i]).sort(),
      original.answers.map(i => original.options[i]).sort()
    );
    assert.ok(evaluate(shuffled, shuffled.answers));
    assert.equal(evaluate(shuffled, []), false);
  });

  it("returns shuffled option copies through normal session selection", () => {
    const original = QUESTIONS.find(q => q.id === "clf-21");
    const [selected] = selectQuestions(QUESTIONS, { track: "practitioner", count: 1, domain: original.domain, focus: "bookmarks", bookmarks: [original.id] }, () => 0);
    assert.equal(selected.id, original.id);
    assert.notStrictEqual(selected, original);
    assert.notDeepEqual(selected.options, original.options);
    assert.deepEqual(selected.answers.map(i => selected.options[i]), original.answers.map(i => original.options[i]));
  });
});
