# CloudOps Lab: login, entitlements and subscription launch design

**Architecture decision proposal, October 22, 2026.** No account service, Stripe product, price, webhook, domain, billing secret, paywall or production backend has been created. Owner approval is required for any cloud spend, credential setup, external account, live payment, merge or deployment.

## Product decision

**Keep the complete current learning experience free:** the original 216 published practice questions (180 core + 36 public challenge previews), the three currently public synthetic guided labs, local attempts, bookmarks and JSON export. Don't retroactively hide or break content learners already use.

| Access state | Authentication | What it gets | Must not get |
| --- | --- | --- | --- |
| **Guest** | None | Current public practice tracks, 3 guided sandbox missions, local browser-only progress/export | Cloud syncing, private premium items, account billing |
| **Free account** | Cognito-managed sign-in | Everything guest gets **plus opt-in** cloud sync, cross-device history, saved unfinished free labs | Premium question bank, instructor rubrics, paid scenarios, unrestricted AI |
| **Professional** | Signed-in + server-side subscription entitlement | Everything free + new, much deeper stateful IAM/VPC/DNS simulated labs, challenge mode, privately served scored assessments, rubric/history/advanced analytics | Unlimited third-party model inference by default |
| **Grace/canceled/expired** | Signed-in; status from backend | Free tools stay usable; paid access only while genuinely paid-through or under separately defined grace policy | No access based only on success redirect, localStorage tier flag or a stale client JWT claim |

**Proposed pricing retained:** USD $10/month or $100/year, one entitlement for all Pro content. No paid offer before meaningful private additions: original plan targets 60 reviewed scenarios per professional assessment (~180 total), deeper decision-based lab state, cloud progress and defensible explanations. The three existing guided labs **cannot** justify a subscription by themselves.

## Selected architecture: AWS-native (matches previous membership architecture)

No parallel Supabase/Clerk accounts during the first AWS implementation. User is technically strong in AWS and existing `docs/membership-architecture.md` already defines Cognito + API Gateway + Lambda + private store. This reduces redesign/integration drift. Evaluate other managed stacks only if measured AWS operations/support effort is materially worse.

```text
             App origin (separately approved non-GitHub-Pages commercial host)
             CloudFront --> private S3 static UI (free public mission catalog)
                    |
                    +-- /auth/* --> OAuth code + PKCE with Cognito user pool
                    |               (managed sign-in; email verification)
                    |
                    +-- /api/* --> API Gateway + Lambda (session/JWT validation)
                                    |    |           |
                                    |    |           +--> Stripe Checkout + customer portal
                                    |    +--> DynamoDB: profile/progress/entitlements
                                    +--> private S3/DynamoDB: premium lab data/scoring

             Stripe signed raw-body webhook --> isolated Lambda -->
             event-id ledger + reconciled subscription entitlement store
```

**Commercial hosting constraint:** the existing Github Pages site may remain an educational noncommercial preview, but GitHub Pages explicitly disallows running a primary commercial SaaS/e-commerce platform. Move the paid app to separately approved static hosting (e.g. private S3 behind CloudFront), with a new owner-approved domain/deployment, before selling access. No new hosting is deployed as part of this plan.

### Sign-in choices

- Cognito user pool in explicitly selected **Lite or Essentials** tier; Essentials supports managed passwordless options, passkeys and hosted UX (Lite is cheaper/basic password auth). Both have a 10k MAU free tier for eligible direct/social sign-ins, but email/SMS and other AWS resources may cost extra. Do not claim free hosting or free transactional email.
- Prefer email verification with managed authentication; Google optional later, not necessary for MVP. No custom password table, no fake login in static JS, no passwords in progress data. Use Authorization Code + PKCE, state/nonce and trusted redirect URIs.
- Stronger optional browser architecture: a backend-for-frontend handles the OAuth code exchange and stores a short-lived session in **Secure + HttpOnly + SameSite** cookie scoped to the commercial app origin. CSRF tokens and Origin checks on state-changing requests; rotate/logout/invalidate sessions. If implementing pure SPA bearer tokens instead, security review is required; never store persistent access tokens in localStorage.
- `/api/v1/me` returns non-sensitive user profile and server-resolved `tier`, but that `tier` display is **not authorization**. Every premium route checks current entitlement server-side.
- Guest progress remains in the existing local browser storage. After signing in, ask whether to import it; dedupe by original question IDs/attempt identifiers. No silent uploads or irreversible migration.
- Support account export, deletion, privacy notice and minimal retention. Store progress separately from identity and billing provider metadata.

## Backend-owned entitlement invariant

1. A paid request authenticates the current account subject `sub`; do not take arbitrary user ID from the browser.
2. Resolve the current entitlement against a server-side private database row, keyed by `sub`, not by an editable `plan=pro` cookie, JWT client claim, or checkout return query param.
3. `active` and eligible `trialing` statuses may grant access; scheduled cancellation retains access until verified paid-through end. Failed payment and grace handling require a published owner-approved policy, not a default guess.
4. Return `403 subscription_required` to logged-in free/expired users and `401 auth_required` to guests for protected endpoints. Rate-limit start/submit APIs per account and track per-day lab actions. Distinguish `429` quota from expired subscription.
5. Premium scenario manifests, final answer rubrics, scoring and explanation unlocks **must live behind private APIs**. Public HTML/JS contains no premium answer keys, instructor decision rules or private resources. Authenticated customers can still copy material they receive; server checks deter broad public scraping but cannot prevent all copying.

### Suggested contracts

```
GET  /api/v1/me                   -> user, resolvedTier, subscriptionSummary
POST /api/v1/progress/import      -> explicit opt-in, idempotent guest migration
GET  /api/v1/labs                 -> public entries plus Pro metadata only
POST /api/v1/labs/{id}/session    -> 401 guest / 403 free / 201 entitled
POST /api/v1/lab-sessions/{id}/act -> authenticated stateful tool/action transition
POST /api/v1/lab-sessions/{id}/finish -> private scoring/rubric and attempts
POST /api/v1/billing/checkout     -> server-allowlisted monthly/yearly Stripe price
POST /api/v1/billing/portal       -> authenticated Stripe customer portal redirect
POST /api/v1/billing/webhook      -> Stripe raw-body signature validation, idempotent
```

Pro sessions use unpredictable IDs, expiry, per-user ownership enforcement and server-stored evidence/decision state. Never send private grading keys in the initial response. Use a seeded deterministic lab engine so reports are reproducible without live AWS infrastructure.

### Payments

- Checkout and portal should be **Stripe-hosted**, not a custom card form. Only allow two server-configured Price IDs and bind Checkout to the authenticated user's private Stripe customer ID; no arbitrary amounts or emailed `user_id`.
- **Signed webhooks are mandatory before subscription launch.** Verify raw request body against webhook secret, dedupe event ID and reconcile out-of-order updates. At minimum handle `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated/deleted` plus asynchronous payment and refund/chargeback events as required. Do not grant access from the redirect URL.
- Keep Stripe secret key and webhook secret in Secrets Manager; deny unauthenticated content reads. Track failed webhook processing and reconcile subscription status with Stripe on schedule. Customer portal must handle cancellation and payment details.
- Before live charges, identify merchant's actual registration/jurisdiction, tax handling, receipts, dispute/refund policy, auto-renewal disclosures and cancellation rights. Stripe fees depend on the merchant and card geography. US list prices as of Oct 2026: domestic standard card **2.9% + $0.30**; optional Billing pay-as-you-go **0.7%** of Billing volume. Treat these as illustrations, not actual net margin in this owner's jurisdiction.

## Cost posture / guardrails

- Prototype and tests in this branch: no backend, no Stripe account, no paid AI, **$0 new cloud resources initiated**.
- Cognito Lite/Essentials eligible direct sign-in free tier: 10k MAU/month, not unlimited and no promise of zero SES/SNS charges. AWS API Gateway, Lambda, DynamoDB, CloudFront/S3, domain, logs and email each have separate usage terms.
- Set owner-approved AWS budget alerts, per-endpoint throttling, Lambda concurrency caps, log retention and Stripe webhook DLQ. **AWS budgets are warnings, not universal hard spending stops**; do not promise zero possible AWS spend after provisioning.
- Stripe test mode first; no live customers, paid plan, production domain, or Stripe secret until explicit authorization. Variable LLM tutor calls remain off: at $10/mo, unlimited premium AI prompts can destroy margins. If added later, enforce a per-tier monthly credit/quota and explicit opt-in; server never forwards personal incident reports to external AI providers without consent.

## Phases and go/no-go checks

| Phase | Deliverable | Test and authorization |
| --- | --- | --- |
| A (current) | Public guided mission prototype on isolated bot-owned review PR | No login/paywall; Node and Playwright QA, Codex review, owner merge |
| B | Private backend schemas, auth UX prototype and offline entitlement adapter | Threat model, JWT/session/CSRF tests, no actual accounts or deployment without approval |
| C | Owner-approved Cognito test/staging, opt-in progress migration | Guest unaffected, login/logout/reset/refresh/account deletion, cross-account isolation, AWS cost cap |
| D | Owner-approved Stripe TEST-mode Checkout, portal, signed webhook pipeline | Replay/duplicate/out-of-order, cancel at term, failed payments, subscription abuse, 401/403 on every premium API |
| E | Genuine server-only premium scenarios, branch-based sandbox with rubrics | No key leaks, seeded replay, scoring/feedback correctness, test purchase to access, limits and recovery |
| F | Separate owner-approved commercial hosting/payment launch | Business/legal/tax/terms and support readiness, cost monitoring, paid acceptance test, personal merge and deploy authorization |

### Definition of done before first paying user

- Free public learning preserved; registration is **optional**.
- Signed-in free user cannot access premium response/answer via direct URL, client flag, altered JavaScript, forged JWT, or expired subscription.
- Paid user can start/pause/resume lab after refresh; the server rechecks entitlement at each protected transition.
- Webhook replay and Stripe outage fail closed without silently losing paid-through entitlement; billing portal and account deletion work.
- Private scenario answers never appear in public Git source or static assets. No storing passwords or payment card numbers.
- Observability catches abuse and backend costs; legal merchant/tax terms and accessible login/privacy UI ready.
- A real user can complete a guided lab end to end on 390px mobile and keyboard-only desktop.
- Codex exact-head review, hosted tests, user **personal PR approval** and separate deployment signoff required. Neither Cursor nor Commander may merge or deploy.

## External sources current as of October 22, 2026

- https://aws.amazon.com/cognito/pricing/
- https://docs.stripe.com/billing/subscriptions/overview
- https://github.com/stripe/ai/blob/main/skills/stripe-best-practices/references/payments.md
- https://stripe.com/pricing
- https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits
- Existing in-repo design: `docs/membership-architecture.md`
