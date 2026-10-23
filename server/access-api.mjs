/**
 * Dependency-injected, offline-testable AWS HTTP API gateway adapter.
 *
 * IMPORTANT: Lambda never validates a JWT's cryptographic signature here.
 * In production ONLY a configured API Gateway JWT authorizer may populate
 * event.requestContext.authorizer.jwt.claims. Configure and verify issuer,
 * audience, token type, CORS and route authorization at gateway deployment.
 * Rejects plain Authorization headers and client-supplied tier/user claims.
 *
 * No live gateway, Cognito user pool, Stripe, database, or API is provisioned.
 */
import { emptyProgress } from "../engine.mjs";
import { authorizePrivateLab, resolveMembership, validSubject } from "./entitlements.mjs";
import { IMPORT_MAX_BYTES, normalizeProgress, ProgressImportError, summarizeProgress } from "./progress-sync.mjs";

const json = (statusCode, data) => ({
  statusCode,
  headers: { "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store", "x-content-type-options": "nosniff" },
  body: JSON.stringify(data)
});
const error = (status, code) => json(status, { error: code });

function trustedSubject(event, issuer, clientId) {
  // HTTP request bodies, Authorization headers and query strings are ignored.
  const claims = event?.requestContext?.authorizer?.jwt?.claims;
  if (!claims || typeof claims !== "object" || Array.isArray(claims)) return null;
  // Machine-to-machine access tokens can also carry sub + client_id but do
  // not have a human Cognito username. They must not become user accounts.
  if (claims.iss !== issuer || claims.token_use !== "access" ||
      claims.client_id !== clientId || !validSubject(claims.sub) ||
      typeof claims.username !== "string" || !claims.username.trim()) return null;
  return claims.sub;
}

function parsePayload(event) {
  if (event?.isBase64Encoded || typeof event?.body !== "string" ||
      Buffer.byteLength(event.body, "utf8") > IMPORT_MAX_BYTES) {
    throw new ProgressImportError("invalid_payload");
  }
  let value;
  try { value = JSON.parse(event.body); }
  catch { throw new ProgressImportError("invalid_payload"); }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ProgressImportError("invalid_payload");
  }
  // A request can never choose the account ID, payment status or entitlement.
  if (["sub","userId","subject","tier","subscription","isPro"].some(key =>
      Object.hasOwn(value, key))) throw new ProgressImportError("forbidden_client_identity");
  if (value.importConsent !== true || !Object.hasOwn(value, "progress")) {
    throw new ProgressImportError("consent_required");
  }
  return value.progress;
}

/**
 * Storage contract:
 *  getProgress(subject) -> existing browser-compatible progress or null
 *  mergeProgressAtomic(subject, validatedImported, mergeFn) -> merged progress,
 *    using conditional revision compare-and-swap / serializable transaction.
 *  getSubscription(subject) -> PRIVATE verified provider record or null.
 */
export function createAccessApi({
  issuer, clientId, allowedQuestionIds, privateLabIds = [],
  getProgress, mergeProgressAtomic, getSubscription,
  now = () => new Date()
} = {}) {
  if (typeof issuer !== "string" || !issuer.startsWith("https://") ||
      typeof clientId !== "string" || clientId.length < 5 ||
      !(allowedQuestionIds instanceof Set) || !Array.isArray(privateLabIds) ||
      typeof getProgress !== "function" || typeof mergeProgressAtomic !== "function" ||
      typeof getSubscription !== "function" || typeof now !== "function") {
    throw new Error("access_api_not_configured");
  }

  return async function accessApi(event) {
    const method = event?.requestContext?.http?.method;
    const path = event?.rawPath;
    if (typeof method !== "string" || typeof path !== "string" || path.length > 256) {
      return error(400, "bad_request");
    }
    const subject = trustedSubject(event, issuer, clientId);
    const isMemberRoute = path === "/api/v1/me";
    if (isMemberRoute && method === "GET" && !subject) {
      return json(200, { authenticated: false, tier: "guest" });
    }
    if (!isMemberRoute &&
        path !== "/api/v1/progress" &&
        path !== "/api/v1/progress/import" &&
        !/^\/api\/v1\/labs\/[a-z0-9-]{3,64}\/access$/.test(path)) {
      return error(404, "not_found");
    }
    if (!subject) return error(401, "auth_required");

    try {
      if (isMemberRoute && method === "GET") {
        const membership = resolveMembership({ verifiedSubject: subject,
          subscription: await getSubscription(subject), now: now() });
        // Don't expose provider customer ID, email, price ID or raw entitlement.
        return json(200, { authenticated: true, tier: membership.tier,
          paidThrough: membership.paidThrough ?? null });
      }
      if (path === "/api/v1/progress" && method === "GET") {
        const progress = normalizeProgress((await getProgress(subject)) ?? emptyProgress(), allowedQuestionIds);
        return json(200, { progress, sync: "server" });
      }
      if (path === "/api/v1/progress/import" && method === "POST") {
        if (!String(event?.headers?.["content-type"] ??
            event?.headers?.["Content-Type"] ?? "").toLowerCase().startsWith("application/json")) {
          return error(415, "json_required");
        }
        const imported = normalizeProgress(parsePayload(event), allowedQuestionIds);
        const merged = await mergeProgressAtomic(subject, imported);
        // Storage adapter must run shared mergeProgress() inside CAS transaction.
        const safe = normalizeProgress(merged, allowedQuestionIds);
        return json(200, { imported: true, summary: summarizeProgress(safe) });
      }
      const match = path.match(/^\/api\/v1\/labs\/([a-z0-9-]{3,64})\/access$/);
      if (match && method === "GET") {
        if (!privateLabIds.includes(match[1])) return error(404, "not_found");
        const subscription = await getSubscription(subject);
        const decision = authorizePrivateLab({
          verifiedSubject: subject, subscription, labId: match[1], privateLabIds, now: now()
        });
        if (!decision.allowed) return error(decision.status, decision.reason);
        // This endpoint is entitlement status only. Never serve premium content
        // or client-side "unlock tokens" from here.
        return json(200, { entitled: true, labId: match[1] });
      }
      return error(405, "method_not_allowed");
    } catch (err) {
      if (err instanceof ProgressImportError) return error(400, err.code);
      // No internal exception / provider metadata may leak via HTTP.
      return error(503, "service_unavailable");
    }
  };
}
