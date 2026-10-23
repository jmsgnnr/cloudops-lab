/**
 * Server-only membership policy for a future authenticated CloudOps API.
 *
 * This file contains NO browser paywall, Stripe SDK, secret, or JWT verifier.
 * Callers MUST obtain subject from a verified gateway auth context and entitlement
 * only from the private provider-verified subscription store.
 */
const SUBJECT = /^[a-zA-Z0-9_-]{1,128}$/;
const ACTIVE_STATES = new Set(["active", "trialing"]);
const VERIFIED_SOURCES = new Set(["verified_stripe_webhook", "stripe_reconciliation"]);

export function validSubject(subject) {
  return typeof subject === "string" && SUBJECT.test(subject);
}

function parseTime(input) {
  if (typeof input !== "string" || input.length > 35) return null;
  const n = Date.parse(input);
  if (!Number.isFinite(n) || new Date(n).toISOString() !== input) return null;
  return n;
}

/**
 * Only authenticated users can be free/pro. A paid-through, server-verified
 * record with matching subject confers Pro. Client plan flags are ignored.
 *
 * Past-due/canceled statuses are denied unless Stripe reconciliation updates
 * a separate, published owner-approved grace policy (not implemented).
 */
export function resolveMembership({ verifiedSubject = null, subscription = null, now = new Date() } = {}) {
  if (!validSubject(verifiedSubject)) return Object.freeze({ tier: "guest", authenticated: false });
  const free = Object.freeze({ tier: "free", authenticated: true });
  if (!subscription || typeof subscription !== "object" || Array.isArray(subscription)) return free;
  if (subscription.subject !== verifiedSubject ||
      subscription.provider !== "stripe" ||
      !VERIFIED_SOURCES.has(subscription.source) ||
      !ACTIVE_STATES.has(subscription.status)) return free;
  const until = parseTime(subscription.currentPeriodEnd);
  const verifiedAt = parseTime(subscription.providerVerifiedAt);
  const clock = now instanceof Date ? now.getTime() : NaN;
  if (!Number.isFinite(clock) || until === null || verifiedAt === null ||
      verifiedAt > clock + 5 * 60 * 1000 || until <= clock) return free;
  // Last provider observation must fall within 30 days of today's request;
  // stale webhook-only entitlements can be refreshed through reconciliation.
  if (clock - verifiedAt > 30 * 24 * 60 * 60 * 1000) return free;
  return Object.freeze({ tier: "pro", authenticated: true, paidThrough: subscription.currentPeriodEnd });
}

export function authorizePrivateLab({ verifiedSubject, subscription, labId, privateLabIds, now = new Date() } = {}) {
  // Unknown lab identifiers must not surface private metadata in public routes.
  if (!Array.isArray(privateLabIds) || typeof labId !== "string" ||
      !privateLabIds.includes(labId)) {
    return Object.freeze({ allowed: false, status: 404, reason: "not_found" });
  }
  if (!validSubject(verifiedSubject)) {
    return Object.freeze({ allowed: false, status: 401, reason: "auth_required" });
  }
  const membership = resolveMembership({ verifiedSubject, subscription, now });
  if (membership.tier !== "pro") {
    return Object.freeze({ allowed: false, status: 403, reason: "subscription_required" });
  }
  return Object.freeze({ allowed: true, status: 200, reason: "entitled" });
}
