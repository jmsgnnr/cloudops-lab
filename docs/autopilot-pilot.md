# CloudOps Lab | Autonomous coding pilot

## Verified delivery and remaining gates (October 21, 2026)

The first pilot **did run**. On CloudOps Issue #4, owner `jmsgnnr` commented the exact command `/autoengineer build`; Cursor automation `CloudOps-AutoEngineer` (Regex OFF) launched an isolated Cloud Agent and opened [draft PR #6](https://github.com/jmsgnnr/cloudops-lab/pull/6) as `cursor[bot]`. At the verified checkpoint the PR head was `142b36ebd358a13a8eb1a9f7869f15f8d4cab49b`. It changed only `tests/engine.test.mjs`; an independent local 31/31 Node test run was recorded on October 20. **No GitHub-hosted CI or final Codex receipt exists for that head at this checkpoint.** Re-check live state before deciding anything.

Issue #3 is setup-only and MUST NOT implement. Do not retrigger #4 or open another PR for it. Earlier `##autoengineer build` attempts did not authorize a run. The old issue-label `agent-ready` instructions are superseded: the effective pilot trigger is an **owner-authored GitHub issue comment containing the exact command** `/autoengineer build`, verified against event data. Never treat pull request comments as implementation requests.

The Cursor automation was last observed Active, with **two repositories listed in its UI**. Its actual repository permissions and CloudOps-only event scoping remain **unverified**. Do not authorize additional implementation issues until it is confirmed scoped to `jmsgnnr/cloudops-lab` alone. Bot authorship proves the PR was not authored as the owner, but does not independently prove service-account configuration or billing limits.

## Operating contract

1. Owner authorizes exactly one GitHub issue, the repository, allowed files, and spend. Exclude any issue without owner approval; issue #3 is forever setup-only.
2. Cursor receives a GitHub **issue comment** event only; verify the repository is `jmsgnnr/cloudops-lab`, issue number is eligible, author is `jmsgnnr`, and the command matches exactly. Reject fork/PR-comment/duplicate events and stop if there is an existing agent run or linked implementation PR.
3. Use an isolated Cursor Cloud Agent, a fresh branch from `main`, and no employer, AWS, owner-Windows, GitHub App signing-key, private-profile or personal credentials. `jmsgnnr/gift-reveal-site` and Steph's Gift remain permanently no-touch.
4. Before ANY push, enforce allowed paths, tests, syntax/lint, `git diff --check`, secret/history checks, and browser QA for UI changes. **Pre-push enforcement of Cursor's native PR publisher has NOT yet been independently proven.** A passed prompt-level self-check is not equivalent to a trusted publication gate. Fail closed until a genuinely enforceable route is validated.
5. On success, publish **one bot-authored draft PR** linked to the exact issue. Include changed files, actual local test evidence, limitations, and no false claim of hosted CI. No bot approval, merge or deploy.
6. CI must independently run the precise PR head. The proposal in [ci-templates/cloudops-node-tests.yml](ci-templates/cloudops-node-tests.yml) is intentionally inert. Activation requires a separately reviewed workflow-only change, with no new GitHub App permissions. After installation, trigger existing #6 with a one-time `ci-verify` label; a label event must not invoke the Cursor coding automation.
7. ChatGPT verifies exact diff, acceptance criteria, hosted checks, and (where applicable) browser evidence. Once stable, the owner may authorize **one** independent `@codex review` of the exact PR head. A submitted COMMENTED review receipt is not an owner approval. Re-review only following a materially changed head.
8. Owner personally reviews, approves and **separately authorizes** merge or deployment. Preserve protected-history, branch, identity, publisher and no-spend gates.

## CI proposal and activation boundary

The inert CI template uses Node 22, read-only `contents: read`, pinned action SHAs, no checkout credentials, no dependency installation, no secrets, and a 10-minute job timeout. It rejects different-repository PRs, validates the checked-out source SHA, checks whitespace against the recorded base commit, checks application syntax, and runs `node --test --test-concurrency=1 tests/*.test.mjs`. The PR's hosted check association may be a synthetic merge ref; validate the explicit source-head SHA reported in the job log.

There is **no workflow on `main`** from this proposal. The secure publisher intentionally forbids edits to `.github/workflows`; do not relax that block or upgrade the publisher's permissions. CI installation and subsequent removal require an owner-reviewed, workflow-capable change by a separately authorized path. Public-repository standard runner compute is expected to be free under current GitHub pricing; account settings and quota should still be confirmed. Cursor Cloud usage is a separate spend decision.

Rollback after any activation: disable the workflow first, then have the owner separately approve removal/reversion of the workflow file. No CI state changes or owner approvals are delegated by this document.

## Near-term backlog

- Confirm Cursor CloudOps-only repository scoping and original issue-comment trigger.
- Owner reviews and separately authorizes the CI installation change.
- Run hosted exact-head CI for PR #6, then bounded QA and one final Codex review.
- Bring [CloudOps PR #2](https://github.com/jmsgnnr/cloudops-lab/pull/2) and [Workspace PR #10](https://github.com/jmsgnnr/agentic-workspace/pull/10) through their own exact-head QA and review gates without stale-review reuse.
- Plan a separate Workspace coding lane; never duplicate CloudOps permissions into publisher/security code automatically.

Source of truth for status: GitHub issues, PR commits, hosted checks, and submitted reviews; this file is a dated historical checkpoint, not standing authorization.
