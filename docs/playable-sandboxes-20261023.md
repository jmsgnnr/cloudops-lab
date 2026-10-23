# Field Labs v3 — simplify before gamifying

October 23, 2026. **Review-only PR #14**, not merged, deployed or monetized. Supersedes unmerged guided PR #12.

## The product problem

A screenshot of the previous stage showed three non-obvious "Inspect" buttons, a full AWS-style terminal, a second Evidence Collected panel containing the same information and a huge original case file. Learners had to run two checks before reaching the playable part. That made the lab feel like completing analyst paperwork.

The redesigned default flow is now **The problem → Fix & test → Optional notes**. The learner starts with a plain-English objective, goes straight to the virtual system, changes one of three controls, **RUN TEST**, reads a cause-and-effect result, retries or resets.

- **Optional discovery:** One expandable "Need a clue?" area offers three specific beginner-level questions. Each opens a brief finding + what to try next, one at a time. The original raw AWS-style diagnostic and longer case artifacts are explicitly nested under "View original" / "Advanced". They never appear by default.
- **IAM:** Diagnose S3 read blocked by missing permissions-boundary scope, avoid overbroad boundary bypass.
- **NAT:** Restore private app → NAT → IGW and modeled HTTPS egress.
- **DNS:** Improve future Resolver/host collection without pretending past missing data can be reconstructed.
- **Optional notes:** Keep legacy five guided report fields and ungraded JSON export. Preserve multiple attempts even when their status string is identical; avoid stale guided-vs-virtual actions by removing competing preview flow.

All 216 public questions, six tracks, local browser progress, and original incident evidence remain available. Models are deterministic, educational and limited; never real AWS access. No paid content keys, Cognito, API, Stripe, charges, or production deployment.

## Verification

- **63/63 Node tests**: original question bank, all cases, clue/probe alignment, legacy incident export schema and stateful sandbox safety.
- **Chrome Playwright on 1440px, 390px, 320px**: open any case, start simulator without diagnostic gate, compare failure/success, invalidate stale test, clue/advanced details optional, same-status different-cause append test, optional report/export, no horizontal overflow/errors/off-origin requests.
- Original quiz six-track/custom-timed/keyboard-focus browser regression passes.
- Visual desktop/mobile screenshot review on OMEN under `Development/agentic-runs/cloudops-simple-design-qa-20261023` (outside Git).

## Release gates

Bot-authored PR #14 must pass exact-head hosted CI and fresh Codex review. Old-head P2 threads need evidence-based resolution. User `@jmsgnnr` personally reviews/approves and chooses whether to merge, which triggers existing GitHub Pages deployment. No agent approval, merge/deploy, extra spend, branch protection changes or Gift work. Draft PR #13 on access/entitlements remains independent and unshipped.
