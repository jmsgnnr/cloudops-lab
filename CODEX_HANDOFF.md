# Codex handoff / CloudLabs (CloudOps Lab)

**Updated:** 2026-10-19. **Status:** [CloudLabs Draft PR #2](https://github.com/jmsgnnr/cloudops-lab/pull/2) has seven confirmed independent Codex reviews through `006be3242807dfff82744ca4382e620656bf143b`. The seventh review reported three P2 findings: outdated handoff, `dopx-03` OIDC citation coverage, and `secx-01` S3 data-event selector ambiguity. The next correction is being prepared locally; a new exact-head Codex receipt is required after its push. The live PR timeline is authoritative. No merge or deployment.

## This is the correct local project

- GitHub repository: `jmsgnnr/cloudops-lab` (public published baseline).
- Local corrective worktree: `Development/agentic-runs/cloudops-codex-fix` on the authorized workstation. It starts from the published PR branch at `006be32` on a dedicated local repair branch; do not confuse it with the separate `aws-cert-lab` main checkout.
- Draft PR head branch: `feature/engineering-challenges-pricing`; seventh reviewed head: `006be32`. Local repair branch: `fix/local-codex-sec02`. Before accepting the next review, compare the actual submitted Codex receipt's reviewed SHA to the live PR head. Review-only role and owner approval are unchanged.
- Engineering governance source is a **separate private local repository**, `jmsgnnr/agentic-workspace`; refer to its `AGENTS.md` and security boundary only if that repository is in your authorized scope.

## Product decisions

- CloudLabs is a distinctive late-1990s dark ops-console AWS training tool, not a generic SaaS dashboard. Owner is @jmsgnnr.
- Six assessment tracks, **216 original multiple-choice questions**: 180 legacy questions (3x60) + 36 advanced preview questions (3x12). Keep legacy IDs and browser progress compatibility.
- Additional three **synthetic, interactive incident investigations**: IAM permissions boundary, private NAT/IGW routing, DNS Resolver / VPC Flow Logs gap. Learners read synthetic evidence, write five-part reports, and export ungraded JSON; no live AWS resources, account connection, paid entitlement or server scoring.
- Planned membership pricing **$10/month, $100/year**. Neither checkout nor auth is activated. Do not claim income or paying users.
- Facilitator answer key resides outside the public Git tree. **Do not copy answer keys into public JavaScript, repo, prompt, or web PR.**

## Verified engineering state and first Codex review

- Full Node suite **43/43 passed** on the local eighth-review candidate (2026-10-19), including new `dopx-03` OIDC trust/least-privilege source coverage and `secx-01` write-only `PutObject` versus read-enabled `GetObject` regression tests. The prior seventh-reviewed commit `006be32` passed 41/41. Browser QA evidence from earlier work applies to prior runtime revisions; the updated supplemental-reference link label has not yet received an independent browser walkthrough. No deployment is authorized.
- Desktop/mobile Playwright practice and incident walkthroughs rerun successfully on October 18, including JSON export, no off-origin requests, and 390px responsive layout. Additional browser regression verified disabled impossible session sizes and `beforeunload` protection of incomplete incident drafts. Harness scripts and screenshots are in a sibling local QA directory outside the public Git tree.
- **Codex review history:** [CloudLabs PR #2](https://github.com/jmsgnnr/cloudops-lab/pull/2) has seven submitted rounds through `006be32`. Fifth (`568cec5`) flagged artifact-attestation source provenance; sixth (`0aadae3`) flagged `secx-02` Inspector-versus-GuardDuty sourcing; seventh (`006be32`, 2026-10-19) flagged this handoff, `dopx-03` OIDC claim-specific sources, and `secx-01` CloudTrail data-event ambiguity. The current remediation is awaiting its own new-commit independent review. Earlier reviews and `@codex review` request comments do not count for a new head. None is owner approval.
- Relevant documents: `docs/prototype-acceptance.md`, `docs/pilot-scenarios-learner.md`, `docs/membership-architecture.md`, `docs/codex-final-review-handoff.md`.
- For publisher workflow / GitHub review prerequisites, read the separate workspace's `docs/cloudlabs-codex-first-review-staging.md` and `docs/codex-github-activation.md`.

## Your role if opened in Codex desktop

**Read-only final engineering reviewer, NOT implementation lead.** First read this file and root `AGENTS.md`, inspect the current branch/diff and source evidence only. Identify suspected security, AWS-accuracy, accessibility, regression, browser, billing, and data-exposure issues with file:line evidence, severity (BLOCKER/HIGH/MEDIUM/LOW), precise remediation and suggested validation. Separate verified facts from untested assumptions. Do not autonomously modify files, run tests under the owner's Windows identity, use credentials, stage/commit/push, create PRs, merge or deploy. A true completed review should be recorded with its actual output/reference, not assumed.

The local autonomous-agent execution hold remains until a **separate low-privilege Windows identity** has been established and verified. GitHub cloud review is a different path that requires an approved draft PR and confirmed separate Codex app authorization.

**Desktop usage:** Open the exact folder above in the Codex desktop app. Opening `agentic-workspace`, another clone of `cloudops-lab`, or a cloud GitHub checkout will not show the dirty CloudLabs feature worktree automatically.
