# CloudLabs: Final Codex review handoff (integration active, PR still draft)

Repository: jmsgnnr/cloudops-lab
Current isolated local branch: feature/engineering-challenges-pricing
Review lead: Codex (independent, review-only)
Implementation/supervision: Cursor / ChatGPT under the canonical agentic-workspace policy.
Owner: @jmsgnnr (personal PR approval and separate deployment approval)

## Scope to review after implementation stops

1. Existing 180 free practice questions and progress behavior preserved.
2. Three 12-question advanced previews and $10/month, $100/year conceptual pricing; no billing.
3. Three proposed synthetic IAM, NAT routing and DNS telemetry incident investigations converted from learner brief to a real guided, accessible UI *when implemented and locally verified*. Do not mark item (3) done from this document alone.
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

**Active path:** GitHub Codex PR Code Review is confirmed operational. Bot-authored [Draft PR #2](https://github.com/jmsgnnr/cloudops-lab/pull/2) has received three real independent Codex reviews; the next corrected commit requires another `@codex review`. This runs off the owner's Windows principal, and does not replace the mandatory human PR approval.

Review is a gate, not a GitHub approval. **Three independent Codex reviews completed** on [Draft PR #2](https://github.com/jmsgnnr/cloudops-lab/pull/2). First found three issues with distractors, preview sizes and unsaved drafts; second identified stale count limits after saved-progress mutations; third found missing claim-specific references and stale review-status text. Those third-round issues were corrected in `0c2cd83`. Fourth review raised a P2 mismatch in remediation references for `dopx-10` and `secx-06`; this candidate fixes those URLs and adds a regression. A fresh Codex review of the newest revision remains required before owner approval. No merge, deployment, paid content, or payment activation.
