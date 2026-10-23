# CloudOps Lab / simplified playable labs — exact-head review handoff

Date: October 23, 2026. **Review current GitHub SHA, not prior Codex review of f55f1e5.**

This bot-owned PR #14 replaces **unmerged PR #12** and targets merged `main` `f1a4d99`. Do not merge both. Separate PR #13 (offline account/entitlements) is not included, and no auth/billing is activated.

## UX and implementation

User feedback on an actual screenshot: the forced Inspect step, repetitive Evidence Collected sidebar, original AWS policy dump and required two-check gate were confusing and not fun.

This exact replacement now uses three simple panels: **The problem → Fix & test → Optional notes**. The real interaction starts directly in a deterministic synthetic workbench; learners adjust three modeled system settings, RUN TEST, see how the modeled system reacts, retry and reset. No mandatory diagnostic collection.

- `index.html` and `simple-missions.css`: remove the duplicate evidence sidebar, old Inspect gate, forced case-file view, guided-response selector and redundant action preview. A **Need a clue?** disclosure shows three optional questions with one short plain-English finding at a time; original AWS-style diagnostics and artifacts are hidden at a second/third level.
- `incident-ui.mjs` and `data/mission-clues.mjs`: three-phase navigation and optional clue controller, report copy, no auto-upload; sanitized DOM operations via `textContent`; preserve original five-field `formatVersion:1` ungraded JSON export.
- `data/playable-sandboxes.mjs`: clearer setting labels, same limited IAM/NAT/DNS teaching model; changing settings invalidates the most recent simulated result and disables stale debrief eligibility.
- The optional report preserves **different attempts with the same status** (full observation comparison instead of first-line/status-only deduplication).
- `qa/mission-browser-qa.mjs`: all three cases, no forced clue gate, clues one at a time with raw details collapsed, reset/retry, optional report/export and **two NAT failures with same status but different causes** preserved. Keep original `qa/codex-p2-browser-qa.mjs` checks for 6 tracks and keyboard focus.

## Old-head Codex findings addressed

Codex found two P2 issues on `f55f1e5`:
1. Guided-response preview after a previous virtual test could silently attach the older result. The competing preview flow **no longer exists**; only the most recent actual virtual test can be copied.
2. Two distinct failures sharing one status were treated as duplicates. Fixed by comparing full modeled note; browser regression proves both explanations survive.

Those old findings remain attached to an older commit until marked resolved with evidence. A **fresh exact-head Codex review** and green hosted CI are required before calling PR #14 owner-ready.

## QA and boundaries

Local **63/63 Node tests pass**; both Playwright suites pass 1440px/390px/320px, no horizontal overflow, page errors or external requests; desktop/mobile screenshots visually inspected on OMEN. Note that these are small deterministic educational models, not complete IAM simulation or real AWS changes. All 216 existing public questions and original localStorage data stay intact.

Bot author and committer must remain `jmsgnnr-engineering-review[bot]`; only owner `@jmsgnnr` supplies CODEOWNER approval. Do not merge, deploy, spend, provision Cognito/Stripe/AWS, change protection settings, or touch Gift. GitHub Pages deploys after any owner-authorized merge to main.
