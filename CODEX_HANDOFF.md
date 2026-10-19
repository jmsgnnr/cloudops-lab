# Codex handoff / CloudLabs (CloudOps Lab)

**Updated:** 2026-10-18. **Status:** [CloudLabs Draft PR #2](https://github.com/jmsgnnr/cloudops-lab/pull/2) has five completed Codex reviews. The fifth, at `568cec5`, found one P2 artifact provenance reference mismatch. A revised candidate now links to GitHub's official signed artifact-attestation documentation. The live PR review timeline, not this static file, is authoritative for future status. No merge or deployment; this is repository context, not synchronized chat memory.

## This is the correct local project

- GitHub repository: `jmsgnnr/cloudops-lab` (public published baseline).
- Local worktree: the isolated `cloudops-premium-01/workspace` checkout on the owner-authorized development machine; open this repository root, not a different clone.
- Current branch: `feature/engineering-challenges-pricing`. Fifth reviewed head was `568cec5`. Before relying on a review, compare its reviewed commit with the actual live PR head SHA. Review-only role and owner approval remain unchanged.
- Engineering governance source is a **separate private local repository**, `jmsgnnr/agentic-workspace`; refer to its `AGENTS.md` and security boundary only if that repository is in your authorized scope.

## Product decisions

- CloudLabs is a distinctive late-1990s dark ops-console AWS training tool, not a generic SaaS dashboard. Owner is @jmsgnnr.
- Six assessment tracks, **216 original multiple-choice questions**: 180 legacy questions (3x60) + 36 advanced preview questions (3x12). Keep legacy IDs and browser progress compatibility.
- Additional three **synthetic, interactive incident investigations**: IAM permissions boundary, private NAT/IGW routing, DNS Resolver / VPC Flow Logs gap. Learners read synthetic evidence, write five-part reports, and export ungraded JSON; no live AWS resources, account connection, paid entitlement or server scoring.
- Planned membership pricing **$10/month, $100/year**. Neither checkout nor auth is activated. Do not claim income or paying users.
- Facilitator answer key resides outside the public Git tree. **Do not copy answer keys into public JavaScript, repo, prompt, or web PR.**

## Verified engineering state and first Codex review

- Full Node suite **40/40 passed** (2026-10-18), including distractor, provenance-reference and incident regression tests in `tests/`. Browser QA on prior runtime revision passed; this corrective change only updates one reference and its unit tests.
- Desktop/mobile Playwright practice and incident walkthroughs rerun successfully on October 18, including JSON export, no off-origin requests, and 390px responsive layout. Additional browser regression verified disabled impossible session sizes and `beforeunload` protection of incomplete incident drafts. Harness scripts and screenshots are in a sibling local QA directory outside the public Git tree.
- **Codex review history:** [CloudLabs PR #2](https://github.com/jmsgnnr/cloudops-lab/pull/2) has five completed review rounds. Issues found and corrected include distractor quality, session-count constraints, incomplete-form navigation, post-bookmark pool refresh, and AWS claim-specific references. Fifth round found that `dopx-12` must cite build attestation/source revision verification, not AWS Lambda ZIP code signing alone. Updated official GitHub provenance documentation and a dedicated regression test address it in the next candidate. Actual re-review of the new commit is still required; no Codex review constitutes owner approval.
- Relevant documents: `docs/prototype-acceptance.md`, `docs/pilot-scenarios-learner.md`, `docs/membership-architecture.md`, `docs/codex-final-review-handoff.md`.
- For publisher workflow / GitHub review prerequisites, read the separate workspace's `docs/cloudlabs-codex-first-review-staging.md` and `docs/codex-github-activation.md`.

## Your role if opened in Codex desktop

**Read-only final engineering reviewer, NOT implementation lead.** First read this file and root `AGENTS.md`, inspect the current branch/diff and source evidence only. Identify suspected security, AWS-accuracy, accessibility, regression, browser, billing, and data-exposure issues with file:line evidence, severity (BLOCKER/HIGH/MEDIUM/LOW), precise remediation and suggested validation. Separate verified facts from untested assumptions. Do not autonomously modify files, run tests under the owner's Windows identity, use credentials, stage/commit/push, create PRs, merge or deploy. A true completed review should be recorded with its actual output/reference, not assumed.

The local autonomous-agent execution hold remains until a **separate low-privilege Windows identity** has been established and verified. GitHub cloud review is a different path that requires an approved draft PR and confirmed separate Codex app authorization.

**Desktop usage:** Open the exact folder above in the Codex desktop app. Opening `agentic-workspace`, another clone of `cloudops-lab`, or a cloud GitHub checkout will not show the dirty CloudLabs feature worktree automatically.
