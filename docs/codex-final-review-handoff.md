# CloudLabs: Final Codex review handoff (integration active, PR still draft)

Repository: jmsgnnr/cloudops-lab
Published draft PR branch: feature/engineering-challenges-pricing (local repair worktree: fix/local-codex-sec02).
Review lead: Codex (independent, review-only)
Implementation/supervision: Cursor / ChatGPT under the canonical agentic-workspace policy.
Owner: @jmsgnnr (personal PR approval and separate deployment approval)

## Scope to review after implementation stops

1. Existing 180 free practice questions and progress behavior preserved.
2. Three 12-question advanced previews and $10/month, $100/year conceptual pricing; no billing.
3. Three synthetic IAM, NAT routing and DNS telemetry incident investigations implemented as guided, accessible UI. Node coverage verified in the ninth-reviewed candidate; earlier browser evidence applies to the prior UI revision and does not establish a new production deployment.
4. Corrected security item scs-27 DNS evidence behavior and accompanying regression.
5. Secret isolation, premium-answer leakage, content validity, and user-data handling.

## Review contract

- Read AGENTS.md, docs/pilot-scenarios-learner.md, docs/prototype-acceptance.md, and docs/membership-architecture.md. Facilitator answer key remains outside the Git tree; no repo or public bundle should expose it.
- Review completed code, not speculative features; compare changed files to the base and inspect relevant surrounding code, imports and tests.
- Use high reasoning effort on correctness, auth boundary planning, security, and realistic AWS technical claims. No rewrite, fixes or task implementation by Codex.
- Include reproducible line references for any BLOCKER/HIGH finding; distinguish evidence from hypotheses; enumerate untested behaviors.
- Tests and browser evidence must be measured by independent supervisor. Positive code review is *not* a release approval.

## Command and cloud paths

Local CLI has been inspected; `codex review --help` confirms `--uncommitted`, `--base`, and `--commit`. Launch is **ON HOLD** under the owner's Windows account. Only invoke from a verified dedicated least-privilege reviewer identity inside a review-only isolated workspace after security probes. Do not inspect local auth files to check credentials.

**Active path (October 19, 2026):** GitHub Codex PR Code Review is operational. Bot-authored [Draft PR #2](https://github.com/jmsgnnr/cloudops-lab/pull/2) has received **nine submitted independent reviews**, the ninth exactly on `518f899a05d931b591ad9fec7d67c9c8ebb87076` (submitted October 20, 01:03:45 UTC). Each new pushed commit requires a new exact-head review receipt; an `@codex review` request is not a receipt. Codex remains review-only and separate from owner approval.

Review is a gate, not a GitHub approval. **Ninth independent review:** Codex reported one P2 on `docs/codex-final-review-handoff.md`, which still recorded only five rounds and the obsolete `dopx-12` candidate. Current candidate reconciles this document to the verified ninth review, the `sapx-02` AWS overlap-bridging source correction, and **44/44 Node tests passed** on `518f899`. The historical `dopx-12`, OIDC, GuardDuty and CloudTrail corrections remain in source. Before owner approval, require a fresh Codex receipt on the next pushed commit and reconcile any findings. No merge, deployment, paid content or payment activation is authorized without owner approval.
