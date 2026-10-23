# CloudOps Lab / current engineering handoff

**Snapshot: October 22, 2026.** This file describes the *new, isolated UX and interactive-lab review candidate*, not an authorization to release it. Verify the live GitHub branch head, reviews, checks and PR state before approval; this document is not live GitHub status.

## Repositories and review boundaries

- Repository: `jmsgnnr/cloudops-lab`. Owner: `@jmsgnnr`.
- Local engineering worktree: `Development/agentic-runs/cloudops-ux-labs-20261022`.
- Proposed review branch: `feature/cloudops-instant-practice-interactive-labs-20261022`.
- Base: the current `main`, including merged PR #6 progress-storage regression coverage, rebased onto after initial development from PR #9's `87d1a1a` candidate. This candidate contains the still-unmerged six-track and incident-lab work of PR #9; **do not imply that PR #9 has merged**.
- Distinct existing PR: [CloudOps Lab v2 PR #9](https://github.com/jmsgnnr/cloudops-lab/pull/9) remains the previous six-track / keyboard-navigation candidate. It is superseded by consolidated [draft PR #10](https://github.com/jmsgnnr/cloudops-lab/pull/10). Do not request repetitive reviews on PR #9, merge both candidates independently, or infer a review result from a request.
- Separate [Autopilot pilot PR #5](https://github.com/jmsgnnr/cloudops-lab/pull/5) is an inert proposal; do not activate it or change automation, CI permissions or costs.
- No Gift repository work.

## Product and compatibility contract

CloudOps Lab is an independent, late-1990s dark engineering-ops-themed training tool. It contains **216 original quiz questions across six tracks** (180 original IDs plus 36 advanced preview questions), and **three separate synthetic, ungraded incident investigations**. The planned $10/month / $100/year pricing is a **design only**, not live billing.

The new UX candidate:
1. Restores the recognizable “Cloud knowledge, under pressure.” hero, but shows **Practice** and **Field Labs** in mutually exclusive tabs rather than scrolling through all features.
2. Starts 10 untimed questions in all domains on a track click; retains optional custom session controls, exam mode and native keyboard interaction.
3. Collapses progress, reference guides and future membership information behind user-invoked disclosures.
4. Presents each synthetic IAM, NAT and DNS incident with **three local diagnostic checks**, expandable case notes and original artifacts.
5. Shows **one of five report fields at a time**, preserving draft answers, safe field navigation, diagnostic attachment and existing ungraded versioned JSON exports.

No real AWS connections, server grader, credentials, facilitator answer keys, or premium secrets belong in public source. Preserve the same localStorage key/schema, existing quiz IDs, scoring, question order remapping and export schema. Case evidence must not assert that missing VPC Flow Logs records prove no traffic to the Amazon-provided DNS resolver.

## Verified QA for this candidate (October 22)

- **53/53 Node tests passed** on the branch rebased to the latest `main`, including the merged storage regressions and three new local-investigation tests.
- Node syntax checks and `git diff --check` passed.
- Independent local Chrome/Playwright verification passed at **1440px, 390px and 320px**. Covered all six instant quiz entries, timed custom session, result/navigation paths, tab and disclosure behavior, all three incident cases and nine diagnostics, five-step report navigation and JSON export compatibility. No page JavaScript errors, horizontal overflow or unexpected external requests observed.
- QA script: `Development/agentic-runs/cloudops-focused-qa-20261022.mjs`; local screenshots: `Development/agentic-runs/cloudops-focused-design-qa-20261022/`. These files are on the authorized workstation, not claimed to be uploaded to GitHub.
- Visual decisions: `docs/design-focused-workspace-20261022.md`.

## Current PR #10 Codex P2 corrections (October 22)

- Codex submitted two exact-head P2 findings on PR #10 commit `c68c567`: a custom session could not independently select a different track, and quitting at question one left focus on a hidden control. See [PR #10 review](https://github.com/jmsgnnr/cloudops-lab/pull/10).
- Scoped, deterministic correction now adds an explicit six-track native select to optional custom settings while preserving one-click untimed track cards. Changing the selected track refreshes the domain list, available counts, study reference and card ARIA state; it does not start a quiz.
- Confirmed quit restores keyboard focus to the visible selected track. Cancelling quit leaves the question active. The user is not forced into an unplanned session.
- Reproducible optional Playwright test: `qa/codex-p2-browser-qa.mjs`, using an installed Playwright module via `CLOUDOPS_PLAYWRIGHT_MODULE` or standard resolution. Actual local browser QA PASS on desktop and 390px mobile, including all six track quick starts, independent advanced-track selection, timed exam, cancel/accept, focus and Tab/Shift+Tab checks, no overflow or off-origin requests. Full previous UX regression also passed.
- **53/53 existing Node tests passed**. No new CI package dependency, billing, credentials, repository settings, or deployment changes. Every final published SHA requires its own green hosted CI and an independent current-head Codex receipt (submitted review with findings, or the verified App-owned clean-review summary and receipt). The earlier c68c567 review cannot clear a later commit.

## Codex and owner gates

Codex is **independent final reviewer only**. Review the stabilized draft PR diff, especially event routing, focus/accessibility, hidden sections, report preservation, download payload, progress schema and secret/answer-key boundaries. Report reproducible findings; do not write code, push, review-approve, merge or deploy from the review role. A review request or running status is not a completed review. Do not run local Codex CLI under the owner's Windows identity.

**Owner approval eligibility:** the repository requires `@jmsgnnr` as code owner, one approval, and approval by someone **other than the latest reviewable pusher**. To prevent a solo-owner approval deadlock, future agent changes must be committed **and** pushed under the dedicated `jmsgnnr-engineering-review[bot]` identity, never authored or committed under the owner's personal Git identity. The bot is responsible for implementation and publication; the owner alone supplies the required human code-owner approval. Preserve these protections; do not substitute a bot approval or bypass the rule. This provenance amendment is intended to establish bot attribution for the last reviewable change, but actual owner eligibility must be verified in GitHub after publication.

The publisher uses the narrowly scoped GitHub App and creates **draft** review PRs only. A new PR is not approved by being created. **OWNER REVIEW REQUIRED**: only `@jmsgnnr` personally approves final PR readiness, merge and any separate deployment. No new Cursor automation/CI workflow activation, subscriptions, permissions or identity changes are authorized by this handoff.
