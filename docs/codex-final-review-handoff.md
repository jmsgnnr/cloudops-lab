# Exact-head Codex review brief: guided missions v2

**October 22, 2026.** Verify live PR head and CI after publication; these are local pre-push results, not a claim of GitHub clearance.

## Base and intended diff

Base: `main` merge `f1a4d99` (owner-approved CloudOps focused workspace PR #11). Branch `feature/cloudops-interactive-labs-access-plan-20261022` adds no dependencies, no new paid provider integrations, no secrets, no GitHub workflow changes.

Inspect these new/changed items in detail:
- `index.html`, `mission-workspace.css`: visually isolated Brief / Inspect / Simulate / Report with keyboard focus, accessible active phase and native controls, responsive mobile, existing theme.
- `incident-ui.mjs`: interactions and recorded evidence, only 2/3 checks required to proceed, option selection vs explicit simulation, repeated choice invalidation, stage transitions, editable note preservation, unsaved-exit confirmation, no duplicate evidence insertion, bounded 4,000-character report fields, ungraded JSON download.
- `data/incident-actions.mjs`: three choices per public case; technical correctness under the **supplied synthetic assumptions** for IAM effective permissions, NAT public subnet route and DNS resolver logging limitations. Not secret paid answers.
- `tests/incident-actions.test.mjs`, `qa/mission-browser-qa.mjs` and existing `qa/codex-p2-browser-qa.mjs`: test adequacy including alternative consequences, desktop/mobile screen and focus.
- `docs/interactive-missions-v2-20261022.md`, `docs/auth-and-membership-gating-20261022.md`: planned Guest / Free / Pro gating is **not implemented**. Do not mistake a future tier plan for live auth or billing.

## Current QA

56/56 Node tests locally PASS; comprehensive browser QA all three cases and six original quiz tracks PASS, 1440/390/320px no overflow, no page JS errors or off-origin requests. Existing formatVersion=1 / grade=null export and 216 quiz IDs preserved. Old PR #10 P2s are already resolved and merged through PR #11.

## Constraints

- No new public premium content, AWS credentials, private instructor answer keys, live charge or real AWS simulator.
- No membership account, third-party auth, billing integration, webhook creation, paid APIs or production deployment in this PR. The future commercial plan specifically requires *server-side* entitlement checks, private content, Stripe signed webhooks and moving the paid SaaS off GitHub Pages.
- All author/committer attribution for the outgoing new CloudOps PR must use the separate engineering App; sole-owner approval by `@jmsgnnr` is mandatory, with most-recent-pusher protection intact.
- Codex reviews but **does not code, merge, approve for the owner, deploy or modify protected settings**. If findings exist, return them as reproducible action items, then request a new exact-head review after correction.

Docs to read: root `AGENTS.md`, root `CODEX_HANDOFF.md`, existing `docs/pilot-scenarios-learner.md`, the new mission design and paid architecture planning docs.
