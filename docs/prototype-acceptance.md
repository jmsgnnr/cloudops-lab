# CloudOps Lab engineering challenges - local acceptance, 2026-10-17

Branch: `feature/engineering-challenges-pricing`, isolated local engineering worktree (`cloudops-premium-01/workspace`).

## Scope

- Added 12 original advanced cases each for Solutions Architect Professional topical practice, DevOps Engineer Professional topical practice, and an independent Security Engineering field test.
- The original 180-question pool, legacy IDs, localStorage schema, study UI and original track behavior remain preserved; overall total is 216.
- Six-track 3x2 desktop catalog with original ops-console identity, responsive mobile layout and planned membership pricing of $10/month, $100/year. Payment controls intentionally absent.
- Separate original notes for every new track domain and independent AWS/reference links.
- Commercial architecture and release gates documented in `docs/membership-architecture.md`.

## Independent verification evidence

- Baseline before modifications: 25 Node tests passed, 0 failed.
- Updated local tests: **31 passed, 0 failed**, `node --test tests/*.test.mjs`.
- JS static checks: `node --check app.mjs` and `node --check data/advanced-challenges.mjs` passed.
- `git diff --check` passed; line-ending notice for styles on Windows only.
- Real Chrome via pre-existing Playwright, temporary localhost-only Python server and an isolated browser profile. Browser harness is stored outside the Git repository at `../browser-qa.mjs`.
- At 1440x900: captured catalog and question screenshots; selected each new track, completed all 12 practice questions per track, checked feedback/results and bookmark behavior; started a timed exam and validated timer and safe quit.
- At 390x844: captured catalog and question screenshots; checked six visible tracks and no horizontal overflow (`scrollWidth=390`, viewport width 390).
- Browser errors: 0. Unexpected off-origin requests: 0.
- Screenshots are local under `../screenshots/`. These are screenshot references, not committed binaries.

## Limitations and approvals

- This is NOT a paid subscription implementation. No auth, card checkout, billing webhook, entitlement check, private answer bank, cloud infrastructure or hosted SaaS.
- These are diagnostic samples, NOT full-length official AWS exam simulators. Paid launch should wait for at least 60 reviewed professional questions per new assessment, professionally checked distractors/references, a genuinely server-protected corpus and billing/legal readiness.
- No autonomous Cursor/Claude/Codex was dispatched; the coding-agent hold is unchanged.
- No push, PR creation, merge, deployment, new dependency, live payment action, secret retrieval or external credential use.
- Owner must review product direction and branch diff before any publication; provider account setup, paid activation and financial changes require distinct explicit authorization.

## October 17 revenue-review follow-up (local-only)

An owner-provided read-only revenue review was reconciled against this newer local prototype. The review's 180-question/25-test counts and $19/$190 pricing were older baseline/hypothesis, NOT current owner decisions. Current owner price is $10/month or $100/year; no checkout exists. Wrote three independent artifact-driven simulation briefs in docs/pilot-scenarios-learner.md with facilitator key stored outside the Git worktree at ..\pilot-scenarios-reviewer.md (not for publication). These are content/test plans, not UI modules, customer labs, public content or evidence of willingness to pay.

Corrected scs-27 in data/security-extended.mjs: Amazon-provided DNS server traffic is not recorded by VPC Flow Logs. Correct answer choices now distinguish enabled Route 53 Resolver query logs from previously collected host DNS/process telemetry, with cache caveat and claim-specific AWS source; added tests/dns-telemetry.test.mjs regression. Node suite after change: **32 passed, 0 failed**; syntax checks for app.mjs and data/security-extended.mjs and git diff --check passed. Prior Chrome UI QA covers unchanged UI only; these new incident briefs have not been field tested. No cloud/API provisioning, payment activation, owner-reviewed PR, commit, push, merge or deployment. Content key requires expert review before recruiting learners.

## October 17 guided incident UI implementation and QA

**Local working branch only; Codex final review PENDING.** Added three interactive synthetic incident investigations separate from 216 original MCQs. Work includes `data/incident-pilots.mjs`, `incident-ui.mjs`, dashboard launch cards, one accessible evidence/report view, five individually labeled textareas, confirm-on-exit/reset for unsaved responses, explicit download-only JSON export, `tests/incident-pilots.test.mjs`, and documentation. No facilitator answers in shipped code. New reports contain no automatic score, PII, user credentials, live lab state or server upload.

Fixed the longstanding browser restricted-storage startup risk by guarding `window.localStorage` access during initialization. Browser smoke test discovered a duplicate evidence element ID; fixed with `incident-answer-*` field namespace and reran tests. Visual screenshot check showed the sticky site header interfering with long-form full-page evidence captures; incident view now renders the header statically, retaining normal quiz styling.

**Verified:** Node built-in tests 36/36 PASS; syntax checks for app.mjs, incident-ui.mjs, data/incident-pilots.mjs passed; git diff --check passed. Playwright/Chrome incident harness completed all three cases, verified actual downloaded response JSON, required inputs, unsaved-exit cancel/accept, mobile 390px no overflow, error-free page, zero external requests and restricted-storage boot. Existing original browser QA completed all three 12-question advanced quizzes, including bookmark, timed-mode start/quit and mobile checks. Screenshots in run-local `../screenshots/`; scripts `../incident-browser-qa.mjs` and `../browser-qa.mjs` live outside Git repo. Case technical correctness still needs qualified SME review and ten real learners. Codex's final independent review has NOT run, because the owner-identity isolation hold has not been lifted and GitHub Codex review access is not confirmed.

No client-usable paid questions are protected on a server. No Stripe, production API, auth, cloud accounts, deployment, Github push/PR/merge, or billing actions were undertaken.
