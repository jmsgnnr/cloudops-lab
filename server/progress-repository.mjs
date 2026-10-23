/**
 * Revision-based atomic progress importer. No AWS resources/SDK or live writes.
 *
 * The injected adapter's compareAndSwap MUST be a true conditional persistence
 * operation (e.g. DynamoDB conditional update on revision), not a JS check
 * followed by a separate unconditional write. It must distinguish conflicts
 * from operational failure; false means only a lost revision race.
 */
import { emptyProgress } from "../engine.mjs";
import { mergeProgress, normalizeProgress } from "./progress-sync.mjs";
import { validSubject } from "./entitlements.mjs";

export class ProgressWriteConflict extends Error {
  constructor() {
    super("progress_conflict");
    this.code = "progress_conflict";
  }
}

export function createAtomicProgressRepository({
  readRecord, compareAndSwap, allowedQuestionIds, maxRetries = 5
} = {}) {
  if (typeof readRecord !== "function" || typeof compareAndSwap !== "function" ||
      !(allowedQuestionIds instanceof Set) ||
      !Number.isInteger(maxRetries) || maxRetries < 1 || maxRetries > 10) {
    throw new Error("progress_repository_not_configured");
  }

  async function getProgress(subject) {
    if (!validSubject(subject)) throw new Error("invalid_verified_subject");
    const record = await readRecord(subject);
    if (!record) return emptyProgress();
    return normalizeProgress(record.progress, allowedQuestionIds);
  }

  async function mergeProgressAtomic(subject, imported) {
    if (!validSubject(subject)) throw new Error("invalid_verified_subject");
    const trustedImport = normalizeProgress(imported, allowedQuestionIds);
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const previous = await readRecord(subject);
      if (previous && (!Number.isInteger(previous.revision) ||
          previous.revision < 1 || previous.revision > Number.MAX_SAFE_INTEGER - 1)) {
        throw new Error("invalid_progress_revision");
      }
      const revision = previous?.revision ?? 0;
      const merged = mergeProgress(previous?.progress ?? emptyProgress(),
        trustedImport, allowedQuestionIds);
      // Repeated imports are idempotent: skip an unnecessary metered write.
      if (previous && JSON.stringify(merged) === JSON.stringify(
        normalizeProgress(previous.progress, allowedQuestionIds))) return merged;
      // Adapter persists entire merged payload and increments the revision only
      // if the record still has EXACTLY 'revision'; expected=0 means absent.
      const committed = await compareAndSwap(subject, revision, {
        revision: revision + 1, progress: merged
      });
      if (committed === true) return merged;
      if (committed !== false) throw new Error("invalid_compare_and_swap_response");
    }
    throw new ProgressWriteConflict();
  }
  return Object.freeze({ getProgress, mergeProgressAtomic });
}
