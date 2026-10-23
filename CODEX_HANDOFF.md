# CloudOps Lab / playable labs replacement review

Date: October 23, 2026. Verify GitHub current SHA, CI and review receipts independently.

This review branch `feature/cloudops-playable-owner-review-20261023` replaces **unmerged PR #12** with one owner-reviewable bot-authored change against `main` `f1a4d99`. DO NOT suggest merging both PRs. Prior PR #11 merged and is the current deployed baseline; PR #12 is still open / superseded. The auth/progress sync backend belongs to independent draft PR #13 and is **not** in this branch.

## Implementation
- Three free synthetic IAM, NAT and DNS missions: Brief -> Inspect -> **playable virtual settings + Run Test** -> Optional debrief.
- Learner changes a small modeled system and sees meaningful status/explanations and safety tradeoffs; the original guided answer cards are behind an optional drawer.
- All 216 public questions, progress storage, six tracks, quiz focus/navigation, and original ungraded incident export schema remain compatible.
- No AWS cloud calls, external AI, user accounts, premium content activation, provider payments, or proprietary AWS console simulation. This is a **limited deterministic teaching model**, not a complete IAM/VPC engine.

## QA / review
Local 61/61 Node tests PASS. Both Playwright suites pass in Chromium including all 3 missions, state invalidation, simulated settings and optional report, 1440/390/320 widths, all 6 original tracks and keyboard focus, 0 runtime JS errors or off-origin requests. Mobile and desktop screenshot review completed.

The GitHub App must publish author+committer as `jmsgnnr-engineering-review[bot]`. Independent Codex exact-head code review AFTER hosted CI; scope includes toggle state invalidation, stale report eligibility, focus/hidden accessibility, technical IAM/NAT/DNS correctness, no actual cloud effects, and compatibility.

**No code-agent merge, deploy, human approval impersonation, protection changes, AWS or Stripe provisioning, spending, or Gift site changes.** PR remains draft until Codex clean and owner personally reviews. GitHub Pages deploys on merges to main, so the owner must separately authorize a live publish.
