# CloudOps Lab - subscription architecture and commercial readiness
Date: 2026-10-17. Owner pricing decision: USD $10/month or $100/year.
Status: DESIGN ONLY. Checkout, authentication, subscriptions, webhooks, paid content APIs and deployments have not been activated.

## Current delivery slice

The static local prototype has three original advanced 12-question assessments: SAP-C02 topical practice, DOP-C02 topical practice, and FIELD-SEC, an independent security engineering field assessment. They are short diagnostic samples, not full-length or officially accredited exams. Existing free CLF-C02 / SCS-C03 / ANS-C01 banks still contain 60 questions each and continue to use the same local browser progress schema. This local feature branch is not a live premium tier.

Never push/provision the paid question bank in public static JavaScript or the published Pages site. Before any public commercial launch, split the advanced content into private server storage, including explanations and answer keys. The publicly visible mock pricing is explicitly PLANNED and has no checkout button.

## Offer and tiers

- Free: original 180 certification-oriented questions, local practice/timed mode, basic notes, bookmarks, offline JSON export. Keep this useful indefinitely rather than crippling the original tool.
- Free sample: three 12-question high-difficulty assessments, 36 original scenarios total, during research/preview. Decide how many sample items remain publicly visible before migration.
- Professional: planned $10 recurring monthly or $100 recurring yearly. Yearly saves $20 relative to 12 monthly payments (16.7%). ONE membership entitlement covers every professional assessment; no separate per-track subscription.
- Paid launch content gate: do not charge for just 36 new questions. Target at least 60 independently reviewed advanced scenarios per new assessment (180 total) with differentiated explanations, answer rationale, revision histories and more difficulty variation; add role-oriented performance review and focused retry sessions. Minimum ~144 additional vetted professional items needed if existing 36 count toward total.
- No claimed AWS endorsement, full-exam parity, proprietary exam-dump sourcing, official passing predictor, guaranteed job outcomes or guaranteed certification results. FIELD-SEC is a CloudOps Lab assessment, not an AWS exam.

## Target architecture (AWS-native minimal controlled deployment)

Browser app: accessible static SPA via separately approved commercial hosting, e.g. S3 behind CloudFront (private origin) or managed equivalent. Do NOT run the commercial subscription SaaS from GitHub Pages: GitHub Pages usage limits prohibit business/SaaS hosting. Domain, custom DNS and hosting plan require owner review.

Authentication: Cognito user pool with standard Authorization Code + PKCE flow. Email verification, secure session refresh handling and account deletion/export process. Free anonymous browser progress remains local; never upload it silently. Optional explicit import after account creation must dedupe historical attempts and preserve legacy question IDs.

Paid exam APIs: API Gateway JWT authorization + Lambda with entitlement and question-library lookup. Question bank in a private encrypted store (DynamoDB or S3 with KMS) and separate response/answer tables or projections. Authenticated GET /v1/exams returns only metadata; POST /v1/sessions creates randomized server-side exam record; GET /v1/sessions/{id}/questions returns stems/options without answer keys; POST /v1/sessions/{id}/submit scores server-side and returns explanations as permitted. Never trust track ID, user ID, entitlement status, prices, selected answer keys or completion count from the browser. Bound request rate, cap concurrency, protect against enumerating the entire corpus, give each session an expiry and use unguessable IDs. These controls deter trivial extraction but cannot fully prevent copying visible paid content.

Entitlements: private table keyed by Cognito subject with Stripe customer ID, current subscription ID, plan/price identifier, status, current_period_end, cancellation flags, provider update sequence and event provenance. Access is checked server-side per paid request, not via a client flag or unsigned cookie. Eventual consistency is explicit: callback pages are NOT proof of payment.

Checkout: server creates Stripe Checkout Session for allowlisted MONTHLY/YEARLY Price IDs only, using current signed-in user session and idempotency key. Use Stripe hosted Checkout rather than direct handling of card details. Client never sees a Stripe secret API key. Billing portal for self-service plan changes/cancellation. Plan prices must be configured deliberately in the actual Stripe account and reconciled against deployed environment; none have been created.

Webhooks: Stripe signature verified against raw request body using a secret from Secrets Manager, with replay window, duplicate event-ID rejection, idempotent state transition and minimal logs. Reconcile checkout.session.completed, invoice.paid, invoice.payment_failed, customer.subscription.updated, customer.subscription.deleted, and any required asynchronous payment events, noting potential out-of-order delivery. Periodically reconcile provider state. Payment status 'canceled at period end' is not equivalent to immediate access revocation: honor paid-through time. Grace-period length for past-due payments requires an explicit owner policy before enabling. Handle refunds and chargebacks per published policy.

Operations: scoped IAM per service and environment; separate dev/stage/prod accounts or roles; no access keys in app or repo; audit trail without card data; structured metrics for webhook failures and billing discrepancies; DLQ/redrive; spending alarms; recovery and customer support procedures; privacy notice, consumer auto-renewal/cancellation notices, applicable sales-tax/merchant-of-record assessment, user data erasure and retention schedule. Never store full payment-card numbers.

## Economics illustration, not guaranteed take-home

Assume a US Stripe merchant processing a domestic card, with standard 2.9% + $0.30 processing per successful charge and 0.7% of billed volume for Stripe Billing pay-as-you-go, per provider published pricing checked 2026-10-17. This merchant's actual jurisdiction, negotiated fees, tax handling, refunds, foreign card mix and product requirements are NOT established.

- $10 month: $0.29 + $0.30 card charge; $0.07 Billing = about $0.66 fees -> $9.34 before hosting, taxes, support and refunds.
- $100 year: $2.90 + $0.30 card charge; $0.70 Billing = about $3.90 fees -> $96.10 before hosting, taxes, support and refunds.
- 100 active paying customers at illustrative 70 monthly + 30 annual means monthly invoiced cash varies greatly with annual renewal timing. Approx annual gross normalized ARR = 70*$120 + 30*$100 = $11,400, not $12,000. Annual plans bring cash upfront but carry deferred service obligations.
- Fixed cloud/API/hosting and support costs are unknown; instrument cost per attempt, per subscription and conversion cohort before claiming profitability. Never call these numbers a firm quote.

Provider references:
- https://stripe.com/pricing
- https://stripe.com/billing/pricing
- https://docs.stripe.com/billing/subscriptions/overview
- https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits

## Release gates and backlog

Phase A, this local prototype: original challenge content, learning guides, UI, deterministic tests, manual browser QA, no external changes.

Phase B, owner-reviewed private backend: hosted account system, isolated premium content, server-scored exams, auth/entitlement integration tests, explicit data privacy and retention policies. No live customer accounts without approval.

Phase C, Stripe TEST-mode only after explicit account/config authorization: products and recurring Prices ($10/$100), Checkout, signed webhook handling, customer portal, cancel/refund/failed-payment tests, permission audits, mobile browser acceptance and legal notices. Record no live keys in Git.

Phase D, separately approved production launch: production payment account and secrets, merchant and tax checks, deployment, live transaction smoke test authorized by owner, alerting, real subscription cancellation flow and customer support. Owner personally approves merge, paid activation, spending and publish separately.

Out of scope for this branch: provisioning, live Stripe APIs, account creation, GitHub settings, CI mutations, new dependencies, deployment, push or merge.
