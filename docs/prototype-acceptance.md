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

**Historical October 17 implementation snapshot; Codex review was PENDING at that time.** Added three interactive synthetic incident investigations separate from 216 original MCQs. Work includes `data/incident-pilots.mjs`, `incident-ui.mjs`, dashboard launch cards, one accessible evidence/report view, five individually labeled textareas, confirm-on-exit/reset for unsaved responses, explicit download-only JSON export, `tests/incident-pilots.test.mjs`, and documentation. No facilitator answers in shipped code. New reports contain no automatic score, PII, user credentials, live lab state or server upload.

Fixed the longstanding browser restricted-storage startup risk by guarding `window.localStorage` access during initialization. Browser smoke test discovered a duplicate evidence element ID; fixed with `incident-answer-*` field namespace and reran tests. Visual screenshot check showed the sticky site header interfering with long-form full-page evidence captures; incident view now renders the header statically, retaining normal quiz styling.

**Verified:** Node built-in tests 36/36 PASS; syntax checks for app.mjs, incident-ui.mjs, data/incident-pilots.mjs passed; git diff --check passed. Playwright/Chrome incident harness completed all three cases, verified actual downloaded response JSON, required inputs, unsaved-exit cancel/accept, mobile 390px no overflow, error-free page, zero external requests and restricted-storage boot. Existing original browser QA completed all three 12-question advanced quizzes, including bookmark, timed-mode start/quit and mobile checks. Screenshots in run-local `../screenshots/`; scripts `../incident-browser-qa.mjs` and `../browser-qa.mjs` live outside Git repo. Case technical correctness still needs qualified SME review and ten real learners. At this October 17 snapshot Codex's independent review had not run because local autonomous Codex execution was on hold; GitHub PR review was subsequently activated and completed three reviews on October 18, 2026.

No client-usable paid questions are protected on a server. No Stripe, production API, auth, cloud accounts, deployment, Github push/PR/merge, or billing actions were undertaken.

## 2026-10-18: First Codex review corrections / pending second Codex review

**Actual Codex evidence:** The [bot-authored CloudLabs Draft PR #2](https://github.com/jmsgnnr/cloudops-lab/pull/2) received an independent review of commit `c4adc33` with three findings: P1 implausible distractors across advanced bank; P2 count dropdown offered 20/30/40 despite 12-question previews; P2 unsaved incident report lost when closing/reloading browser. A real Codex review is distinct from mere `@codex review` comment.

**Changes made in local corrective revision:** Replaced contextually unrelated wrong choices on all **36** advanced questions with specific competing technical designs, preserving every question ID, correct-answer index and the original stems; adjusted six explanation sentences to match revised alternatives. Added a test that checks each wrong choice is substantial (length heuristic, not a substitute for subject-matter expert review). Session configuration now disables numeric question counts exceeding the filtered pool, resets an invalid selection to "all", and refreshes on track/domain/focus changes. The incident UI conditionally registers a `beforeunload` guard when learner input is unexported. Browsers may suppress native prompts without user activation; this does not provide persistent drafts. User data still stays only in the tab or explicitly exported file.

**Verified locally:** `node --test tests/*.test.mjs` **37/37 pass**, syntax checks PASS, `git diff --check` PASS. Full practice-track Chrome walkthrough PASS; full three-incident desktop/mobile Chrome export walkthrough PASS; targeted Playwright tests PASS for disabled 20/30/40 on 12-question previews, per-domain pool restriction, dirty draft guard, reset and export behavior. No browser errors, no off-origin requests. User-facing screenshots remain outside the Git tree.

**Remaining:** revised code and narrative require a second independent Codex review; AWS subject-matter expert assessment of new distractors is recommended, and 10 real learners have not been tested. No protected paid corpus, authentication, Stripe, production AWS resources, merge or deployment.

## 2026-10-18: Second Codex review, filtered-pool mutation fix

Codex completed a second independent review of commit `3622f24` on [Draft PR #2](https://github.com/jmsgnnr/cloudops-lab/pull/2). It raised one additional P2 issue: after bookmarking/unbookmarking, completing a missed-question retry, or RESET DATA, the current selected question-count availability could become stale. The correction now refreshes numeric-count constraints on every transition back to the dashboard and immediately after RESET DATA, in addition to existing track/domain/focus changes.

Targeted Chrome regression with ten preseeded bookmarks: choose ten-bookmark session, unbookmark a question, exit to dashboard, verify 10-question option becomes disabled and count falls back to "All available"; then reset local progress and verify remaining numeric options disable and bookmark count becomes zero. **PASS**, no browser exceptions or off-origin requests. Existing Node tests **37/37 PASS**; prior full desktop/mobile flows passed. A third independent Codex review is required for this new revision. No merging, deployment or payment activation.

## 2026-10-18: Third Codex review — claim-specific AWS references

- **Actual review:** Codex reviewed PR #2 commit `e52dbae` and raised P1: all 36 advanced questions inherited only broad track guides instead of evidence for their specific technical claims; P2: inconsistent root handoff, README and review-status record.
- **Correction in fourth candidate:** `ADVANCED_REFERENCES` explicitly maps every new advanced question ID to its own official AWS documentation (or HashiCorp documentation for Terraform). Each question uses its mapped reference instead of the track-level study guide. Practice feedback now displays a safe `https:` source link opening in a new browser tab. Source mapping is tested for 36 IDs, HTTPS and domain allowlist, and no fallback to broad track URLs.
- **Validation:** All 36 new source URLs returned HTTP 200 to a read-only HEAD check from OMEN on October 18; selected AWS docs were read for substantive consistency (cross-account KMS, Direct Connect transit VIF and S3 gateway endpoint). HTTP 200 checks URL availability, **not** expert validation of every claim. Node suite **38/38 passed**; Playwright checked practice source links in each advanced track with zero browser errors and no unexpected external requests. Separate full desktop/mobile and incident regression to be recorded after rerun.
- **Release gate:** Customer/SME validation, independent Codex review of this corrective revision, and @jmsgnnr personal PR approval remain required. No official exam equivalence, paid entitlements, hosted AWS resources or billing were activated.

## 2026-10-18: Final fourth-round local verification
- Final in-scope Node suite `node --test tests/*.test.mjs`: **38 PASS, 0 FAIL**.
- Chrome Playwright on a localhost-only server: three advanced 12-question practice tracks, timed practice flow, bookmarks and 390px mobile layout **PASS**. Separate three-case incident workflow validates all five fields, JSON downloads, privacy-denied localStorage handling and no unexpected network requests **PASS**.
- Source-link Chrome regression: clicked through practice feedback on architecture, DevOps, and security tracks; official HTTPS source links were displayed, opened in a new browser tab when activated, and used `rel="noopener noreferrer"`. Page errors 0; unexpected off-origin requests 0.
- All 36 official AWS / HashiCorp question-specific documentation URLs returned HTTP 200 in a read-only check. Individual technical correctness and pedagogical distractor quality still require expert assessment; an HTTP response code does not prove those claims.
- Codex GitHub PR review remains independent; no production merge, deployment, subscription or live AWS change is authorized.
