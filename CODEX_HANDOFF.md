# Codex handoff / CloudLabs (CloudOps Lab)

**Updated:** 2026-10-18. **Status:** bot-authored [Draft PR #2](https://github.com/jmsgnnr/cloudops-lab/pull/2) is open; Codex completed its initial review and identified three findings. Corrections are being validated for a second complete review. No merge or deployment. This is project context, not synchronized chat memory.

## This is the correct local project

- GitHub repository: `jmsgnnr/cloudops-lab` (public published baseline).
- Local worktree: the isolated `cloudops-premium-01/workspace` checkout on the owner-authorized development machine; open this repository root, not a different clone.
- Current branch: `feature/engineering-challenges-pricing`, committed and published initially as `c4adc33` on Draft PR #2. Subsequent corrections are local until pushed and independently re-reviewed.
- Engineering governance source is a **separate private local repository**, `jmsgnnr/agentic-workspace`; refer to its `AGENTS.md` and security boundary only if that repository is in your authorized scope.

## Product decisions

- CloudLabs is a distinctive late-1990s dark ops-console AWS training tool, not a generic SaaS dashboard. Owner is @jmsgnnr.
- Six assessment tracks, **216 original multiple-choice questions**: 180 legacy questions (3x60) + 36 advanced preview questions (3x12). Keep legacy IDs and browser progress compatibility.
- Additional three **synthetic, interactive incident investigations**: IAM permissions boundary, private NAT/IGW routing, DNS Resolver / VPC Flow Logs gap. Learners read synthetic evidence, write five-part reports, and export ungraded JSON; no live AWS resources, account connection, paid entitlement or server scoring.
- Planned membership pricing **$10/month, $100/year**. Neither checkout nor auth is activated. Do not claim income or paying users.
- Facilitator answer key resides outside the public Git tree. **Do not copy answer keys into public JavaScript, repo, prompt, or web PR.**

## Verified engineering state and first Codex review

- Node suite last run **37/37 passed** (2026-10-18); tests under `tests/`. Added regression coverage for contextually relevant advanced distractors.
- Desktop/mobile Playwright practice and incident walkthroughs rerun successfully on October 18, including JSON export, no off-origin requests, and 390px responsive layout. Additional browser regression verified disabled impossible session sizes and `beforeunload` protection of incomplete incident drafts. Harness scripts and screenshots are in a sibling local QA directory outside the public Git tree.
- **Actual first Codex review:** [review summary and three findings on PR #2](https://github.com/jmsgnnr/cloudops-lab/pull/2). P1: irrelevant advanced distractors; P2: impossible question counts; P2: unsaved draft loss on navigation. All three have candidate corrections locally and must be re-reviewed after publishing revised commit. Do not claim they are accepted or production-ready until second review.
- Relevant documents: `docs/prototype-acceptance.md`, `docs/pilot-scenarios-learner.md`, `docs/membership-architecture.md`, `docs/codex-final-review-handoff.md`.
- For publisher workflow / GitHub review prerequisites, read the separate workspace's `docs/cloudlabs-codex-first-review-staging.md` and `docs/codex-github-activation.md`.

## Your role if opened in Codex desktop

**Read-only final engineering reviewer, NOT implementation lead.** First read this file and root `AGENTS.md`, inspect the current branch/diff and source evidence only. Identify suspected security, AWS-accuracy, accessibility, regression, browser, billing, and data-exposure issues with file:line evidence, severity (BLOCKER/HIGH/MEDIUM/LOW), precise remediation and suggested validation. Separate verified facts from untested assumptions. Do not autonomously modify files, run tests under the owner's Windows identity, use credentials, stage/commit/push, create PRs, merge or deploy. A true completed review should be recorded with its actual output/reference, not assumed.

The local autonomous-agent execution hold remains until a **separate low-privilege Windows identity** has been established and verified. GitHub cloud review is a different path that requires an approved draft PR and confirmed separate Codex app authorization.

**Desktop usage:** Open the exact folder above in the Codex desktop app. Opening `agentic-workspace`, another clone of `cloudops-lab`, or a cloud GitHub checkout will not show the dirty CloudLabs feature worktree automatically.
