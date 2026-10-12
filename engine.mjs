import { TRACKS } from "./data/blueprints.mjs";

export function evaluate(question, selection = []) {
  const selected = [...new Set(selection)].sort((a, b) => a - b);
  const expected = [...question.answers].sort((a, b) => a - b);
  return selected.length === expected.length && selected.every((n, i) => n === expected[i]);
}

export function scoreQuiz(questions, answers = {}) {
  const byDomain = {};
  const detail = questions.map(q => {
    const selected = Array.isArray(answers[q.id]) ? answers[q.id] : [];
    const correct = evaluate(q, selected);
    byDomain[q.domain] ??= { correct: 0, total: 0 };
    byDomain[q.domain].total++;
    if (correct) byDomain[q.domain].correct++;
    return { id: q.id, domain: q.domain, correct, selected, answers: q.answers };
  });
  const correct = detail.filter(x => x.correct).length;
  return { correct, total: questions.length, percent: questions.length ? Math.round((correct / questions.length) * 100) : 0, byDomain, detail };
}

export function selectQuestions(bank, { track, domain = "all", count = 10, missed = [], bookmarks = [], focus = "all" } = {}, random = Math.random) {
  if (!TRACKS[track]) throw new Error("Unknown certification track");
  let candidate = bank.filter(q => q.track === track && (domain === "all" || q.domain === domain));
  if (focus === "missed") candidate = candidate.filter(q => missed.includes(q.id));
  if (focus === "bookmarks") candidate = candidate.filter(q => bookmarks.includes(q.id));
  const buckets = new Map();
  for (const q of candidate) {
    if (!buckets.has(q.domain)) buckets.set(q.domain, []);
    buckets.get(q.domain).push(q);
  }
  for (const bucket of buckets.values()) {
    for (let i = bucket.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [bucket[i], bucket[j]] = [bucket[j], bucket[i]];
    }
  }
  const shuffledDomains = [...buckets.keys()];
  for (let i = shuffledDomains.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffledDomains[i], shuffledDomains[j]] = [shuffledDomains[j], shuffledDomains[i]];
  }
  const limit = count === "all" ? candidate.length : Math.max(1, Math.floor(Number(count) || 10));
  const selected = [];
  while (selected.length < limit && shuffledDomains.some(d => buckets.get(d).length)) {
    for (const domainId of shuffledDomains) {
      const q = buckets.get(domainId).shift();
      if (q) selected.push(q);
      if (selected.length >= limit) break;
    }
  }
  return selected;
}

export const STORAGE_KEY = "aws-cert-lab-progress-v1";
export function emptyProgress() { return { version: 1, attempts: [], missed: [], bookmarks: [] }; }
export function readProgress(storage) {
  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY));
    if (parsed?.version !== 1) return emptyProgress();
    return {
      version: 1,
      attempts: Array.isArray(parsed.attempts) ? parsed.attempts.slice(-30) : [],
      missed: Array.isArray(parsed.missed) ? parsed.missed.filter(x => typeof x === "string") : [],
      bookmarks: Array.isArray(parsed.bookmarks) ? parsed.bookmarks.filter(x => typeof x === "string") : []
    };
  } catch { return emptyProgress(); }
}
export function storeProgress(storage, progress) {
  try { storage.setItem(STORAGE_KEY, JSON.stringify(progress)); return true; } catch { return false; }
}
export function recordAttempt(progress, { track, mode, result, finishedAt = new Date().toISOString() }) {
  const missed = new Set(progress.missed);
  for (const item of result.detail) item.correct ? missed.delete(item.id) : missed.add(item.id);
  return {
    ...progress,
    missed: [...missed],
    attempts: [...progress.attempts, { track, mode, correct: result.correct, total: result.total, percent: result.percent, finishedAt, byDomain: result.byDomain }].slice(-30)
  };
}
export function validateBank(bank) {
  const ids = new Set();
  const counts = {};
  const issues = [];
  for (const q of bank) {
    if (ids.has(q.id)) issues.push("Duplicate ID: " + q.id);
    ids.add(q.id);
    const track = TRACKS[q.track];
    if (!track) issues.push("Invalid track: " + q.id);
    else if (!track.domains.some(d => d.id === q.domain)) issues.push("Invalid domain: " + q.id);
    if (!Array.isArray(q.options) || q.options.length < 4 || q.options.length > 6) issues.push("Invalid choices: " + q.id);
    if (!Array.isArray(q.answers) || !q.answers.length || new Set(q.answers).size !== q.answers.length ||
        q.answers.some(n => !Number.isInteger(n) || n < 0 || n >= q.options.length)) issues.push("Invalid answer: " + q.id);
    if (!q.stem || !q.explanation || !q.reference) issues.push("Incomplete question: " + q.id);
    if (q.options?.length !== new Set(q.options).size) issues.push("Duplicate options: " + q.id);
    counts[q.track] = (counts[q.track] || 0) + 1;
  }
  return { issues, counts, total: bank.length };
}
