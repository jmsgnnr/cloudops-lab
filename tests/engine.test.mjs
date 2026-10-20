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

  it("returns empty progress for malformed JSON without throwing", () => {
    for (const raw of ["{not-json", "", "   ", "{\"attempts\":"]) {
      const storage = { getItem: () => raw, setItem: () => {} };
      assert.doesNotThrow(() => readProgress(storage));
      assert.deepEqual(readProgress(storage), emptyProgress());
    }
  });

  it("returns empty progress when the schema version is missing or wrong", () => {
    const payloads = [
      {},
      { version: 0, missed: ["clf-01"], bookmarks: ["scs-01"], attempts: [{ track: "practitioner" }] },
      { version: 2, missed: ["clf-01"] },
      { version: "1", missed: ["clf-01"] },
      { version: null },
      null,
      []
    ];
    for (const payload of payloads) {
      const storage = { getItem: () => JSON.stringify(payload), setItem: () => {} };
      assert.deepEqual(readProgress(storage), emptyProgress());
    }
  });

  it("returns empty progress when getItem throws and false when setItem throws", () => {
    const brokenRead = {
      getItem: () => {
        throw new Error("storage unavailable");
      },
      setItem: () => {}
    };
    assert.doesNotThrow(() => readProgress(brokenRead));
    assert.deepEqual(readProgress(brokenRead), emptyProgress());

    let calledKey = null;
    const brokenWrite = {
      getItem: () => null,
      setItem: (key) => {
        calledKey = key;
        throw new Error("quota");
      }
    };
    assert.doesNotThrow(() => storeProgress(brokenWrite, emptyProgress()));
    assert.equal(storeProgress(brokenWrite, emptyProgress()), false);
    assert.equal(calledKey, STORAGE_KEY);
  });

  it("filters non-string missed and bookmarked ids and keeps the last 30 attempts", () => {
    const attempts = Array.from({ length: 34 }, (_, index) => ({
      track: "practitioner",
      mode: "practice",
      correct: index,
      total: 10,
      percent: index,
      finishedAt: `2026-01-${String(index + 1).padStart(2, "0")}`
    }));
    const storage = {
      getItem: () => JSON.stringify({
        version: 1,
        attempts,
        missed: ["clf-01", 2, null, { id: "clf-02" }, "clf-03"],
        bookmarks: ["scs-01", false, "scs-02", ["nested"]]
      }),
      setItem: () => {}
    };
    const loaded = readProgress(storage);
    assert.equal(loaded.version, 1);
    assert.deepEqual(loaded.missed, ["clf-01", "clf-03"]);
    assert.deepEqual(loaded.bookmarks, ["scs-01", "scs-02"]);
    assert.equal(loaded.attempts.length, 30);
    assert.deepEqual(loaded.attempts, attempts.slice(-30));
  });

  it("replaces non-array attempt, missed, and bookmark fields", () => {
    const storage = {
      getItem: () => JSON.stringify({
        version: 1,
        attempts: { length: 4 },
        missed: "clf-01",
        bookmarks: { 0: "scs-01" }
      }),
      setItem: () => {}
    };
    assert.deepEqual(readProgress(storage), emptyProgress());
  });

  it("keeps a valid stored progress record on the existing key and schema", () => {
    const mem = new Map();
    const storage = {
      getItem: (key) => (mem.has(key) ? mem.get(key) : null),
      setItem: (key, value) => mem.set(key, value)
    };
    const progress = {
      version: 1,
      attempts: [{
        track: "security",
        mode: "timed",
        correct: 7,
        total: 10,
        percent: 70,
        finishedAt: "2026-10-20T00:00:00.000Z",
        byDomain: { Detection: { correct: 7, total: 10 } }
      }],
      missed: ["scs-04"],
      bookmarks: ["clf-12", "ans-03"]
    };
    assert.equal(storeProgress(storage, progress), true);
    assert.deepEqual([...mem.keys()], [STORAGE_KEY]);
    assert.equal(STORAGE_KEY, "aws-cert-lab-progress-v1");
    const stored = JSON.parse(mem.get(STORAGE_KEY));
    assert.equal(stored.version, 1);
    assert.deepEqual(stored.missed, progress.missed);
    assert.deepEqual(stored.bookmarks, progress.bookmarks);
    assert.equal(stored.attempts.length, 1);
    assert.deepEqual(readProgress(storage), progress);
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
