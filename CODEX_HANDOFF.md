# Codex handoff / CloudLabs (CloudOps Lab)

**Review-history snapshot (2026-10-20):** [CloudLabs Draft PR #2](https://github.com/jmsgnnr/cloudops-lab/pull/2) has ten submitted independent Codex reviews through `ff759bb1d5bb62858df525db927b15e7dd0cb2be`. The tenth review identified one P2: this root handoff still described the eighth round while `docs/codex-final-review-handoff.md` described the ninth. This revision reconciles both as dated snapshots. **This document is not live review status:** always verify the current PR head and a submitted Codex review receipt for that exact SHA from GitHub before owner approval. No merge or deployment.

## This is the correct local project

- GitHub repository: `jmsgnnr/cloudops-lab` (public published baseline).
- Local corrective worktree: `Development/agentic-runs/cloudops-codex-fix` on the authorized workstation, using a dedicated repair branch; do not confuse it with the separate `aws-cert-lab` main checkout. The published PR branch is verified separately on GitHub.
- Draft PR head branch: `feature/engineering-challenges-pricing`; latest review represented by this historical snapshot: tenth round on `ff759bb`. Local repair branch: `fix/local-codex-sec02`. Never infer *current* review status from this file. Require a submitted Codex receipt matching the live PR head. Review-only role and owner approval remain unchanged.
- Engineering governance source is a **separate private local repository**, `jmsgnnr/agentic-workspace`; refer to its `AGENTS.md` and security boundary only if that repository is in your authorized scope.

## Product decisions

- CloudLabs is a distinctive late-1990s dark ops-console AWS training tool, not a generic SaaS dashboard. Owner is @jmsgnnr.
- Six assessment tracks, **216 original multiple-choice questions**: 180 legacy questions (3x60) + 36 advanced preview questions (3x12). Keep legacy IDs and browser progress compatibility.
- Additional three **synthetic, interactive incident investigations**: IAM permissions boundary, private NAT/IGW routing, DNS Resolver / VPC Flow Logs gap. Learners read synthetic evidence, write five-part reports, and export ungraded JSON; no live AWS resources, account connection, paid entitlement or server scoring.
- Planned membership pricing **$10/month, $100/year**. Neither checkout nor auth is activated. Do not claim income or paying users.
- Facilitator answer key resides outside the public Git tree. **Do not copy answer keys into public JavaScript, repo, prompt, or web PR.**

## Historical test evidence and independent review history

- Full Node suite **44/44 passed** on the local ninth-review candidate (2026-10-19), including new `dopx-03` OIDC trust/least-privilege source coverage and `secx-01` write-only `PutObject` versus read-enabled `GetObject` regression tests. The prior eighth-reviewed commit `e1822da` passed 43/43. The ninth-round candidate adds claim-specific AWS NAT/ALB sources for `sapx-02`, with a dedicated regression test. Browser QA evidence from earlier work applies to prior runtime revisions; the updated supplemental-reference link label has not yet received an independent browser walkthrough. No deployment is authorized.
- Desktop/mobile Playwright practice and incident walkthroughs rerun successfully on October 18, including JSON export, no off-origin requests, and 390px responsive layout. Additional browser regression verified disabled impossible session sizes and `beforeunload` protection of incomplete incident drafts. Harness scripts and screenshots are in a sibling local QA directory outside the public Git tree.
- **Codex review history:** [CloudLabs PR #2](https://github.com/jmsgnnr/cloudops-lab/pull/2) records the first eight rounds through `e1822da`, the ninth on `518f899`, and the tenth on `ff759bb`. These are historical review receipts, not a claim about the latest live PR head. Fifth (`568cec5`) flagged artifact-attestation source provenance; sixth (`0aadae3`) flagged `secx-02` Inspector-versus-GuardDuty sourcing; seventh (`006be32`, 2026-10-19) flagged this handoff, `dopx-03` OIDC claim-specific sources, and `secx-01` CloudTrail data-event ambiguity. Eighth (`e1822da`, 2026-10-19) flagged the unsupported `sapx-02` proxy/NAT overlap design references. The ninth-round commit `518f899` added AWS NAT-gateway architecture and the companion private NAT whitepaper plus a regression test. The tenth-round commit `ff759bb` synchronized the linked final-review handoff, and its independent review identified this root handoff as stale. The new corrective commit will require a fresh exact-head Codex review. Earlier reviews and `@codex review` request comments do not count for a new head. None is owner approval.
- Relevant documents: `docs/prototype-acceptance.md`, `docs/pilot-scenarios-learner.md`, `docs/membership-architecture.md`, `docs/codex-final-review-handoff.md`.
- For publisher workflow / GitHub review prerequisites, read the separate workspace's `docs/cloudlabs-codex-first-review-staging.md` and `docs/codex-github-activation.md`.

## Your role if opened in Codex desktop

**Read-only final engineering reviewer, NOT implementation lead.** First read this file and root `AGENTS.md`, inspect the current branch/diff and source evidence only. Identify suspected security, AWS-accuracy, accessibility, regression, browser, billing, and data-exposure issues with file:line evidence, severity (BLOCKER/HIGH/MEDIUM/LOW), precise remediation and suggested validation. Separate verified facts from untested assumptions. Do not autonomously modify files, run tests under the owner's Windows identity, use credentials, stage/commit/push, create PRs, merge or deploy. A true completed review should be recorded with its actual output/reference, not assumed.

The local autonomous-agent execution hold remains until a **separate low-privilege Windows identity** has been established and verified. GitHub cloud review is a different path that requires an approved draft PR and confirmed separate Codex app authorization.

**Desktop usage:** Open the exact folder above in the Codex desktop app. Opening `agentic-workspace`, another clone of `cloudops-lab`, or a cloud GitHub checkout will not show the dirty CloudLabs feature worktree automatically.
