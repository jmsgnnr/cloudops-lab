# CloudOps Lab | Cloud Engineering Practice

Created by **[@jmsgnnr](https://github.com/jmsgnnr)**.

Independent, browser-only AWS practice and cloud engineering scenario tool. These are **original questions**, not AWS exam items, official exam simulations or pass guarantees. The new professional-level tracks are **short 12-question diagnostic previews**, not full-length certification exams.

## Current practice catalog

| Track | Reference code | Questions | Type |
| --- | --- | ---: | --- |
| Cloud Practitioner | CLF-C02 | 60 | AWS certification study |
| Security Specialty | SCS-C03 | 60 | AWS certification study |
| Advanced Networking Specialty | ANS-C01 | 60 | AWS certification study |
| Solutions Architect Professional | SAP-C02 | 12 | Advanced original preview |
| DevOps Engineer Professional | DOP-C02 | 12 | Advanced original preview |
| Security Engineering Field Exam | FIELD-SEC | 12 | **Independent engineering assessment, not a certification** |

216 original questions total. The original 180 question IDs, domain allocation and progress format are preserved.

## Field investigation pilots (local, free)

Three additional **interactive synthetic incident exercises** are separate from the 216 MCQs: IAM permission boundaries, NAT subnet routing and DNS Resolver telemetry gaps. Select a case from the Field Lab panel to inspect evidence and complete a five-part engineering incident report (diagnosis, supporting evidence, safe action, verification and rollback/preservation). Reports export to JSON for an optional human facilitator. **There is no automatic grading or online submission.** Answers stay only in the active tab until explicitly exported; a refresh discards unfinished work. No user AWS account, live infrastructure, hosted lab or real workplace log is required.

The learner scenario specification is `docs/pilot-scenarios-learner.md`. The facilitator grading key is **intentionally outside the repository**, not in the publicly served JavaScript. Review the scenarios with an AWS subject-matter expert and pilot learners before suggesting reliable outcomes. The UI and new static cases must not be mistaken for protected premium content.

CloudLabs' owner-designated final technical reviewer is Codex, **pending independent activation**. `docs/codex-final-review-handoff.md` outlines the review-only scope. No Codex review has run, and passing local tests does not imply independent approval.

**Not affiliated with or endorsed by Amazon Web Services.** Original practice scenarios are based on published AWS technical concepts. Exam guides and domain weights guide study metadata, but the shortened previews do not match actual exam length, scoring or content distribution.

**ANS-C01 retirement:** AWS lists Advanced Networking Specialty (ANS-C01) for retirement on December 31, 2026. Confirm exam plans on [AWS Certification](https://aws.amazon.com/certification/).

## Local usage

ES modules require an HTTP server (opening `index.html` directly from disk may block imports):

```bash
# From this folder, using an already installed Python runtime:
python -m http.server 3456
```

Open `http://localhost:3456` in a browser. Select one of six tracks and configure domain, practice/timed exam, question count and entire/missed/bookmarked pool. Practice mode reveals explanations after Check. Timed exam mode shows results at the end. Questions with multiple correct choices say how many to select.

Results show domain breakdown and a review. Attempts, missed IDs and bookmarks stay in browser localStorage. Progress can be exported as local JSON. The app makes no external authenticated or payment API calls.

## Planned membership, not active

The local feature-branch UI displays **planned pricing** of **$10/month or $100/year** (save $20 versus monthly). **No checkout, subscription, account, billable service or premium access enforcement exists yet.** Advanced samples are currently visible locally and must not be treated as protected paid content in a public static build.

Production paid content needs a separate private server-side question store and server-scored sessions, authentication, billing-provider webhook reconciliation, access controls and commercial hosting. Do not publish the private premium question bank in JavaScript bundles. See [membership architecture and release gates](docs/membership-architecture.md).

## Test and quality workflow

```bash
node --test tests/*.test.mjs
node --check app.mjs
node --check engine.mjs
node --check data/advanced-challenges.mjs
```

The challenge set has assertions for track counts, domain coverage, stable IDs, explanations, multi-select ratio and quiz-engine integration. Automated tests alone do not prove that each answer is technically accurate. Conduct independent technical review and desktop/mobile browser verification before releasing.

## Provenance and limitations

- Existing certification domain metadata: AWS exam guides in the app (original three verified October 12, 2026; SAP-C02 and DOP-C02 topical references verified October 17, 2026).
- New independent security track uses official AWS Well-Architected Security Pillar for general learning context.
- Original 180 questions remain in `data/practitioner*.mjs`, `data/security*.mjs`, `data/networking*.mjs`.
- New 36 scenarios: `data/advanced-challenges.mjs`; new study guides: `data/advanced-lessons.mjs`.
- The selection algorithm balances questions across domains for study variety, not exact official exam weights.
- The time budget is question-count times the track's study timer, not an official certification exam clock.
- Storage failures fall back to the browser tab; local progress is not an authenticated cross-device service.
- The small sample size makes these diagnostics, not reliable pass predictors.
- No proprietary certification dumps, live Stripe traffic, credentials, new dependencies, remote APIs or new deployments are part of this branch.

## Source overview

- `index.html` - accessible UI skeleton and planned pricing
- `app.mjs` - browser session and progress flow
- `styles.css` - late-1990s operations-console theme
- `engine.mjs` - selection, scoring and progress functions
- `data/` - question banks, guides and metadata
- `tests/` - dependency-free Node unit and bank tests
- `docs/membership-architecture.md` - proposed commercial system, not live integration
