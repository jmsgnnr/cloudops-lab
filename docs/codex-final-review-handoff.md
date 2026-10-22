# CloudOps Lab: final independent review scope (October 22, 2026)

**This is a current-candidate handoff, not a live GitHub status report.** Always establish exact reviewed PR head, submitted review and hosted check status from GitHub. See root `CODEX_HANDOFF.md` for full provenance and restrictions.

## Review target
Repository `jmsgnnr/cloudops-lab`; branch `feature/cloudops-instant-practice-interactive-labs-20261022`. Built from PR #9's six-track/incident-lab candidate and then rebased on `main` after merged PR #6 progress-storage regression tests. **PR #9 is not represented as merged.** A separate draft PR should be the final review target after the feature stops changing.

## New code to scrutinize
- `index.html`, `focused-workspace.css`, `styles.css`, `app.mjs`: original hero restored with focused Practice and Field Labs tabs; instant 10-question untimed track starts; custom exam/session controls preserved; disclosure panels should not block input or focus.
- `incident-ui.mjs`, `data/incident-probes.mjs`, `data/incident-pilots.mjs`: three deterministic local-only diagnostic actions per synthetic scenario; one visible report field out of five; preserved answers, optional evidence attachments, guarded navigation/reset and existing ungraded JSON export.
- `tests/incident-probes.test.mjs` and existing suites: original question IDs, bank validation, browser progress schema and grade-null contract remain intact.

## Verified engineering evidence
October 22 after latest main rebase: **53/53 Node tests pass**. Node syntax and Git diff check pass. Local Chrome/Playwright walkthrough passed all six tracks, timed custom mode, Practice/Labs switching, disclosures, all three incident cases and nine diagnostics, five-step report navigation, export and 1440px/390px/320px responsiveness, with no JS errors, horizontal overflow or unexpected off-origin requests. QA scripts/screenshots remain local under `Development/agentic-runs/cloudops-focused-*`; do not pretend they are downloadable from GitHub.

## Reviewer instructions and safety
Read `AGENTS.md`, root `CODEX_HANDOFF.md`, `docs/design-focused-workspace-20261022.md`, `docs/pilot-scenarios-learner.md` and `docs/membership-architecture.md`. Verify real AWS technical correctness, XSS, keyboard and screen-reader affordances, disclosure focus, question modes/counts, draft loss, export and data minimization. Examine final diff *and* relevant surrounding code; distinguish confirmed vulnerabilities from guesses, with file/line/severity. The incident exercises remain explicitly synthetic and ungraded, and planned pricing is not active.

Codex is read-only reviewer, not implementation engineer. A separate PR #9 exact-head Codex review was still marked **running** at this handoff; do not issue repetitive @codex requests or mistake earlier historical PR #2 reviews for final clearance. Do not invoke Codex local CLI under the owner's Windows identity. No GitHub owner approval, merge, deployment, entitlement activation, CI/Cursor automation change, secret exposure or spending is allowed. **OWNER REVIEW REQUIRED** before any final release decision.
