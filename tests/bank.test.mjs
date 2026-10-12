import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateBank } from "../engine.mjs";
import { QUESTIONS, practitionerBank, securityBank, networkingBank } from "../data/questions.mjs";
import { TRACKS } from "../data/blueprints.mjs";
import { LESSONS } from "../data/lessons.mjs";

const DOMAIN_TARGETS = {
  practitioner: {
    "Cloud Concepts": 14,
    "Security and Compliance": 18,
    "Cloud Technology and Services": 20,
    "Billing, Pricing and Support": 8
  },
  security: {
    Detection: 10,
    "Incident Response": 8,
    "Infrastructure Security": 11,
    "Identity and Access Management": 12,
    "Data Protection": 11,
    "Security Foundations and Governance": 8
  },
  networking: {
    "Network Design": 18,
    "Network Implementation": 16,
    "Network Management and Operation": 12,
    "Network Security, Compliance and Governance": 14
  }
};

const LEGACY_IDS = new Set([
  ...Array.from({ length: 20 }, (_, i) => `clf-${String(i + 1).padStart(2, "0")}`),
  ...Array.from({ length: 20 }, (_, i) => `scs-${String(i + 1).padStart(2, "0")}`),
  ...Array.from({ length: 20 }, (_, i) => `ans-${String(i + 1).padStart(2, "0")}`)
]);

function normalizeStem(stem) {
  return stem
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, "")
    .trim();
}

function domainCountsForTrack(bank, trackId) {
  const counts = {};
  for (const q of bank.filter((item) => item.track === trackId)) {
    counts[q.domain] = (counts[q.domain] || 0) + 1;
  }
  return counts;
}

function assertNoInjection(text, id) {
  assert.ok(!/[<>]/.test(text), `HTML-like characters in ${id}`);
  assert.ok(!/<\s*script/i.test(text), `script tag pattern in ${id}`);
}

describe("question bank validation", () => {
  it("has no structural issues", () => {
    const { issues, total } = validateBank(QUESTIONS);
    assert.equal(issues.length, 0, issues.join("\n"));
    assert.equal(total, 180);
  });

  it("has sixty questions per track", () => {
    const { counts } = validateBank(QUESTIONS);
    assert.equal(counts.practitioner, 60);
    assert.equal(counts.security, 60);
    assert.equal(counts.networking, 60);
  });

  it("preserves legacy twenty-question modules unchanged in count", () => {
    assert.equal(practitionerBank.length, 60);
    assert.equal(securityBank.length, 60);
    assert.equal(networkingBank.length, 60);
  });

  it("has unique IDs, normalized stems, and distinct options within each question", () => {
    const ids = new Set();
    const stems = new Set();
    for (const q of QUESTIONS) {
      assert.ok(!ids.has(q.id), `duplicate id ${q.id}`);
      ids.add(q.id);
      const norm = normalizeStem(q.stem);
      assert.ok(norm.length > 10, `stem too short ${q.id}`);
      assert.ok(!stems.has(norm), `duplicate stem ${q.id}`);
      stems.add(norm);
      assert.equal(q.options.length, new Set(q.options).size, `duplicate options in ${q.id}`);
    }
  });

  it("matches exact per-domain targets for each track", () => {
    for (const [trackId, targets] of Object.entries(DOMAIN_TARGETS)) {
      const counts = domainCountsForTrack(QUESTIONS, trackId);
      for (const [domain, expected] of Object.entries(targets)) {
        assert.equal(counts[domain], expected, `${trackId} / ${domain}`);
      }
    }
  });

  it("keeps all original question IDs in the merged bank", () => {
    for (const id of LEGACY_IDS) {
      assert.ok(QUESTIONS.some((q) => q.id === id), `missing legacy id ${id}`);
    }
  });

  it("uses extended ID ranges clf/scs/ans 21 through 60", () => {
    for (const prefix of ["clf", "scs", "ans"]) {
      for (let n = 21; n <= 60; n += 1) {
        const id = `${prefix}-${String(n).padStart(2, "0")}`;
        assert.ok(QUESTIONS.some((q) => q.id === id), `missing extended id ${id}`);
      }
    }
  });

  it("enforces explanation depth and valid multi-select sizes", () => {
    for (const q of QUESTIONS) {
      assert.ok(q.explanation.length >= 50, `short explanation ${q.id}`);
      assert.ok(q.answers.length >= 1 && q.answers.length <= 3, `answer count ${q.id}`);
      if (q.answers.length > 1) {
        assert.match(q.stem, /select (two|three)/i, `multi stem hint ${q.id}`);
      }
      assertNoInjection(q.stem, q.id);
      assertNoInjection(q.explanation, q.id);
      for (const opt of q.options) assertNoInjection(opt, q.id);
    }
  });

  it("maintains roughly seventy-five percent single-select per track", () => {
    for (const trackId of ["practitioner", "security", "networking"]) {
      const trackQs = QUESTIONS.filter((q) => q.track === trackId);
      const multi = trackQs.filter((q) => q.answers.length > 1).length;
      assert.equal(multi, 15, `${trackId} multi-select count`);
      assert.equal(trackQs.length - multi, 45, `${trackId} single-select count`);
    }
  });

  it("includes balanced difficulty labels on every question", () => {
    const allowed = new Set(["foundation", "intermediate", "advanced"]);
    for (const q of QUESTIONS) {
      assert.ok(allowed.has(q.difficulty), `invalid difficulty ${q.id}`);
    }
    for (const trackId of ["practitioner", "security", "networking"]) {
      const trackQs = QUESTIONS.filter((q) => q.track === trackId);
      for (const level of allowed) {
        assert.ok(
          trackQs.some((q) => q.difficulty === level),
          `${trackId} missing difficulty ${level}`
        );
      }
    }
  });

  it("uses ASCII-safe stems and options", () => {
    for (const q of QUESTIONS) {
      for (const text of [q.stem, q.explanation, ...q.options]) {
        assert.ok(!/[^\x09\x0A\x0D\x20-\x7E]/.test(text), `non-ASCII in ${q.id}`);
      }
    }
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
