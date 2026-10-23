# Account and paid-access foundation: offline implementation

Date: October 23, 2026
Status: **CODE WRITTEN, TESTED OFFLINE; NOTHING DEPLOYED.**
Related: CloudLabs PR #12 interactive labs is **separate** and currently pending the owner's mandatory GitHub code-owner approval. This branch is based on merged `main` from PR #11. It adds **server-side modules and tests only**, with no paid sign-in buttons or interruption of anonymous learning.

## Scope and intended business rules

- **Guest:** all existing 216 question items and three public guided investigation labs remain accessible, with original `aws-cert-lab-progress-v1` browser-only progress.
- **Free account, later:** managed Cognito sign-in; request opt-in before any local-progress upload; private per-account progress using existing question IDs and the legacy `version: 1` schema.
- **Professional, later:** only newly created **private** stateful labs/graded assessments. Planned pricing **$10/month or $100/year**, not a live checkout or entitlement.
- **No existing free content removed**, no browser-tier toggle as an access-control mechanism and no client-bundled premium answer keys. A paid feature request must pass verified identity **and** private server subscription status on every protected operation.

## Code delivered in this branch

| Module | Purpose | Deployment state |
| --- | --- | --- |
| `server/entitlements.mjs` | Guest/Free/Pro resolution from private, verified Stripe subscription record; 401/403/404 decisions; current paid-through checks | Pure logic, offline only |
| `server/progress-sync.mjs` | Defensive validation of legacy progress and attempt domain counts; filtering unknown IDs; deterministic opt-in import, idempotent merge and 30-attempt cap | Pure logic, offline only |
| `server/progress-repository.mjs` | Revision-based compare-and-swap retry adapter that preserves concurrent device imports and avoids repeat writes | Backend abstraction only, no database |
| `server/access-api.mjs` | Strict minimal HTTP API handler using trusted Cognito JWT claims *inserted by API Gateway*, never `Authorization` or body-touted Pro status; no wildcard CORS; 401/403/404/405/503 | **Not a deployed Lambda**; requires configured Gateway and private repositories |
| `tests/access-foundation.test.mjs`, `tests/progress-repository.test.mjs` | Auth, tenant isolation, tier status, content hiding, input limits, merging, concurrency and bad adapters | Node built-in test runner |

The `/api/v1/labs/{id}/access` route only says whether a verified, paying account has access to a *known future private lab ID*. It does **not** return premium content, issue a reusable unlock token or establish a paid lab session. Future `act`/`finish` handlers must repeat account, ownership and subscription checks every time.

## Request contracts (planned route mounting)

```http
GET /api/v1/me                        -> guest { authenticated:false,tier:"guest" }
                                       OR verified account tier from provider-owned database
GET /api/v1/progress                  -> 401 guest; account's normalized progress
POST /api/v1/progress/import          -> 401 guest; explicit
                                       { importConsent:true, progress:{version:1,...} }
                                       (max 64KiB, atomic revision merge)
GET /api/v1/labs/{privateLabId}/access -> 401 guest / 403 Free, expired or unverified /
                                        404 unknown ID / 200 verified entitled
```

**Trust boundary:** Lambda does NOT independently check JWT signatures. In real AWS, API Gateway JWT authorizer must verify the Cognito issuer, audience, scopes and token validity before populating `requestContext.authorizer.jwt.claims`. The handler then re-checks issuer, client ID, `token_use:access`, and Cognito subject. Never mount these routes directly on a raw unauthenticated Lambda URL, use arbitrary authorizer mocks in production, or rely on client-supplied `Authorization` headers as verified identity.

`GET /me` is deliberately the only anonymously accessible API route. All other routes require verified identity. Avoid a fake login stub: no account UI can be advertised as functional until actual sign-in, session expiry, cookie/CSRF choices, and backend health are tested.

**Provider trust boundary:** `resolveMembership` only accepts a record with a matching server subject, `provider:stripe`, a verified source (`verified_stripe_webhook` or `stripe_reconciliation`), an active/trialing status and current paid-through period. It rejects stale provider checks (over 30 days), mismatched subjects and expired paid-through periods. Scheduled cancellation does not remove paid access before paid-through date. No grace period, refunds or billing activation are implemented. Future webhook ingestion must verify raw Stripe signature, reconcile event ordering/idempotency and populate this private record. Setting `subscription:{status:"active"}` in the browser does nothing.

**Progress safety:** The `mergeProgressAtomic` repository interface must be backed by a **real conditional transaction** (DynamoDB condition expression comparing revision) to avoid lost writes. The tests supply a deterministic fake CAS adapter only. Untrusted fields, question IDs and account/user IDs are filtered or rejected; no passwords, email, card numbers, tokens or remote incident notes are part of the persisted progress document. Existing browser work is preserved and never silently overwritten. Previously missed items union on explicit import; subsequent actual graded quiz attempts can update missed state.

## Security and product acceptance

1. Guest site remains fully functional and has no auth dependency. Test existing quiz bank, six tracks, original progress schema, all existing free labs.
2. Forged Pro tier, user IDs, malformed JWT claim context, unknown paid IDs, expired subscription, arbitrary JSON and excess payloads cannot confer access or overwrite another user's progress.
3. Two concurrent imports of different devices preserve both changes. Retry or reject conflicts atomically; never silently lose bookmarks or history.
4. Protected future lab content and rubrics stay out of the published static GitHub Pages files and public source. Login is optional, no paywall on old content.
5. No production URL, user pool, gateway, table, webhook, secret, Stripe product or payment is created by these modules. A passing mock does not imply production authentication/security.
6. Before any cloud/auth spend: owner authorizes narrow AWS infrastructure PR, scoped IAM, API Gateway JWT authorizer, Cognito auth UI/redirect policy, account deletion, production-hosting decisions, rate limits, logs and cost budget. AWS budgets alone are **not** hard billing stops.
7. Before selling: Stripe test-mode signed webhooks, out-of-order/replay/duplicate handling, checkout/portal, paid-through and grace/cancellation policy, tax/merchant details, fraud and support readiness. New Pro lab material must justify the subscription.
8. All agent-authored CloudLabs commits MUST have bot author AND committer identity and be published through the GitHub App, leaving `@jmsgnnr` eligible for required human code-owner approval. Never weaken branch protection, self-approve, merge or deploy automatically.

## Deliberate gaps (next independently approved slices)

- **Auth UX + Cognito staging:** OAuth Authorization Code + PKCE, managed login/reset/MFA and safe browser session design, plus Google only if needed. Not a fake static credential form.
- **Actual private store:** DynamoDB conditional revision update, tenancy-isolation tests, optional Progress import consent UI and privacy/deletion flows.
- **Stripe TEST-mode signed webhook adapter:** idempotent event journal, subscription reconciliation and billing portal. Provider console/account secrets need separate owner authorization.
- **Real private premium lab content/session engine:** private data source, user-owned session IDs and paid entitlement checked on every read/write. Browser controls without this would not be a secure paywall.
- **Commercial hosting + deployment:** GitHub Pages continues to serve free learning only; hosting a paid SaaS must use separately approved commercial infrastructure.

Reference plan: `docs/membership-architecture.md`, `docs/auth-and-membership-gating-20261022.md` in the separately awaiting interactive labs PR #12.
