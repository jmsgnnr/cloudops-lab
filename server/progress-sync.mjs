/**
 * Opt-in guest -> account progress preparation.
 *
 * Compatible with browser STORAGE_KEY "aws-cert-lab-progress-v1".
 * No implicit upload. No new IDs or mutation of quiz bank. Repository must
 * implement atomic update(subject, updater) / conditional write for concurrency.
 */
import { TRACKS } from "../data/blueprints.mjs";
import { emptyProgress } from "../engine.mjs";

export const IMPORT_MAX_BYTES = 64 * 1024;
export class ProgressImportError extends Error {
  constructor(code) {
    super(code);
    this.name = "ProgressImportError";
    this.code = code;
  }
}

function iso(value) {
  if (typeof value !== "string" || value.length > 35) return false;
  const ms = Date.parse(value);
  return Number.isFinite(ms) && new Date(ms).toISOString() === value;
}

function finiteInt(n, min, max) {
  return Number.isInteger(n) && n >= min && n <= max;
}

function ids(values, allowedIds) {
  if (!Array.isArray(values) || values.length > 600) throw new ProgressImportError("invalid_progress");
  return [...new Set(values.filter(id =>
    typeof id === "string" && id.length < 128 && allowedIds.has(id)
  ))].sort();
}

function normalizeAttempt(a) {
  if (!a || typeof a !== "object" || Array.isArray(a)) return null;
  if (typeof a.track !== "string" || !Object.hasOwn(TRACKS, a.track) ||
      !["practice", "exam"].includes(a.mode)) return null;
  if (!finiteInt(a.correct, 0, 216) || !finiteInt(a.total, 1, 216) ||
      a.correct > a.total || !finiteInt(a.percent, 0, 100) ||
      a.percent !== Math.round(100 * a.correct / a.total) || !iso(a.finishedAt)) return null;
  if (!a.byDomain || typeof a.byDomain !== "object" || Array.isArray(a.byDomain)) return null;
  const domains = Object.create(null);
  let total = 0;
  let correct = 0;
  const entries = Object.entries(a.byDomain);
  if (entries.length > 16) return null;
  const known = new Set(TRACKS[a.track].domains.map(d => d.id));
  for (const [domain, result] of entries) {
    if (!known.has(domain) || !result || typeof result !== "object" || Array.isArray(result) ||
        !finiteInt(result.correct, 0, 216) || !finiteInt(result.total, 1, 216) ||
        result.correct > result.total) return null;
    domains[domain] = { correct: result.correct, total: result.total };
    total += result.total;
    correct += result.correct;
  }
  if (total !== a.total || correct !== a.correct) return null;
  return { track: a.track, mode: a.mode, correct: a.correct, total: a.total,
    percent: a.percent, finishedAt: a.finishedAt, byDomain: domains };
}

export function normalizeProgress(raw, allowedQuestionIds) {
  if (!(allowedQuestionIds instanceof Set) ||
      !raw || typeof raw !== "object" || Array.isArray(raw) ||
      raw.version !== 1 || !Array.isArray(raw.attempts) || raw.attempts.length > 30) {
    throw new ProgressImportError("invalid_progress");
  }
  const attempts = raw.attempts.map(normalizeAttempt).filter(Boolean).slice(-30);
  return {
    version: 1,
    attempts,
    missed: ids(raw.missed, allowedQuestionIds),
    bookmarks: ids(raw.bookmarks, allowedQuestionIds)
  };
}

function attemptKey(a) {
  return [a.track, a.mode, a.correct, a.total, a.percent, a.finishedAt,
    ...Object.keys(a.byDomain).sort().map(k => `${k}:${a.byDomain[k].correct}/${a.byDomain[k].total}`)].join("|");
}

/**
 * Safe, deterministic, idempotent import. Union of bookmarks and missed
 * preserves user work; new graded attempts can later clear missed via normal
 * recordAttempt. 30 most recent attempts kept; no silent replacement.
 */
export function mergeProgress(current, imported, allowedQuestionIds, { now = new Date() } = {}) {
  const left = normalizeProgress(current ?? emptyProgress(), allowedQuestionIds);
  const right = normalizeProgress(imported, allowedQuestionIds);
  // Browser device clocks are untrusted. Do not let far-future timestamps
  // crowd existing account attempts out of the 30-record retention window.
  // Reject the import atomically so the learner can correct their clock or
  // edit the local export; never silently replace their saved history.
  const timestamp = now instanceof Date ? now.getTime() : NaN;
  if (!Number.isFinite(timestamp)) throw new Error("invalid_server_clock");
  const futureLimit = timestamp + 5 * 60 * 1000;
  if (right.attempts.some(a => Date.parse(a.finishedAt) > futureLimit)) {
    throw new ProgressImportError("future_attempt_timestamp");
  }
  const attempts = new Map();
  for (const a of [...left.attempts, ...right.attempts]) attempts.set(attemptKey(a), a);
  return {
    version: 1,
    attempts: [...attempts.values()]
      .sort((a, b) => a.finishedAt.localeCompare(b.finishedAt) ||
        attemptKey(a).localeCompare(attemptKey(b)))
      .slice(-30),
    missed: [...new Set([...left.missed, ...right.missed])].sort(),
    bookmarks: [...new Set([...left.bookmarks, ...right.bookmarks])].sort()
  };
}

export function summarizeProgress(progress) {
  return { attempts: progress.attempts.length, bookmarks: progress.bookmarks.length,
    missed: progress.missed.length };
}
