# CloudOps Lab | Autopilot pilot contract

Status: **PROPOSED, NOT ACTIVATED**. Backlog: [pilot setup issue #3](https://github.com/jmsgnnr/cloudops-lab/issues/3) and [first worker task #4](https://github.com/jmsgnnr/cloudops-lab/issues/4). Owner review is mandatory. This document does not authorize purchases, install agents, change GitHub settings, or deploy.

## Purpose

Prove one reliable flow: owner-approved GitHub issue -> one isolated Cursor Cloud Agent -> tested draft PR -> independent final Codex review -> @jmsgnnr's personal approval -> separately authorized merge. ChatGPT plans and audits; it is not the runtime worker.

**Pilot repository:** `jmsgnnr/cloudops-lab` only, base `main`. No other repository is connected. In particular `jmsgnnr/gift-reveal-site` is permanently out of scope.

## Prerequisites (hard gates, verify before activation)

1. **Identity:** Configure Cursor Automations to **Run as: Service account**, so its PRs use the `cursor` bot rather than `jmsgnnr`. This requires the appropriate Cursor team/admin capability. On a personal account, automation PRs are created as the owner's GitHub identity and the existing separate-owner-approval rule cannot be relied on. Do not activate in that configuration.
2. **Spend:** Owner explicitly approves the Cursor cloud-agent usage limit after seeing the account's real model costs and settings. Existing local Cursor usage does not establish free cloud execution.
3. **Source control:** Connect only CloudOps Lab to Cursor; verify write access is limited to that repo and that the Cloud Agent has no owner Windows profile, AWS credentials, GitHub App signing key, employer systems, or private personal files.
4. **CI:** Owner reviews and installs `docs/ci-templates/cloudops-node-tests.yml` as `.github/workflows/cloudops-node-tests.yml` in a separate authorized workflow change. This proposal file is inert; the publisher intentionally blocks workflow writes. Verify a real GitHub check runs and passes before enabling the trigger.
5. **Review policy:** CloudOps `main` must continue requiring the owner's approving review. No PR author may count as its own approver. Cursor and Codex may not approve, merge, deploy, or change branch protection.

## Cursor Automation configuration (enter in cursor.com/automations after the gates pass)

- Name: `CloudOps | Approved issue to draft PR`
- Trigger: **GitHub -> Issue label changed -> agent-ready added** in `jmsgnnr/cloudops-lab` (NOT every issue update, every push, or every comment).
- Repo/environment: **single repository** `jmsgnnr/cloudops-lab`, base `main`; no secrets or AWS permissions.
- Identity: **Service account** only, not `Run as: Me`.
- Concurrency: **one pilot run at a time**; do not enable scheduled triage or automatic retries in the first pilot.
- Outcome: **draft** PR only. No automatic approvals, merging, release, or production deployment. If the automation cannot ensure the PR is a draft, stop and report the constraint rather than opening a ready-for-review PR as the owner.
- Additional tool permissions: minimum needed for issue context and creating a PR; no GitHub reviewer approval tool, shell bridge to the owner's computer, or secrets plugins.

### Automation prompt (copy as one instruction)

> Implement the **single GitHub issue that triggered this automation** in `jmsgnnr/cloudops-lab`. This job is authorized only if the event is **addition of the `agent-ready` label**, the issue remains open, and there is no existing open draft PR associated with that issue. If any of those checks is unavailable or fails, stop and report a blocker on the issue; do not guess.
>
> Read `AGENTS.md` and issue acceptance criteria. Stay in CloudOps Lab only; do not modify `jmsgnnr/gift-reveal-site`, dependencies, GitHub workflows, `.github/CODEOWNERS`, secrets, identity/billing settings, or unrelated functionality. Use a fresh branch for this issue from the current base; do not add to an older long-lived review branch. Make the smallest coherent implementation and tests.
>
> Run `node --test --test-concurrency=1 tests/*.test.mjs`, report the real exit status and counts, and perform browser checks when UI behavior changed. If validation fails, make up to **two bounded corrections** within the same job; never loop indefinitely, create duplicate agents, or conceal failed tests.
>
> On success, create **one draft PR** linking the exact issue (include `Closes #N`), changed files, test results, screenshots if UI changed, and known limitations. Never mark owner-approved. On failure, comment once with the blocker and stop. Do not invoke Codex repeatedly; final independent review happens once, after the candidate has stabilized and CI is green. Do not merge or deploy.

## Separate final review — not a trigger loop

Only when the draft PR's current head passes CI and the implementation acceptance checks: request **one** independent Codex review for that exact SHA. A review-request comment is not a review receipt. If Codex finds an actionable defect, the same worker fixes it and CI reruns; then request another review only for the genuinely changed final head. No scheduled hourly Codex reviews.

## Test pilot and success criteria

1. Owner manually chooses **one small, nonprivileged** CloudOps issue and adds `agent-ready` only after prerequisites.
2. Exactly **one** Cursor Cloud Agent run is created from that label event; no extra runs on status/comments/push.
3. It opens a correctly linked **draft** PR as `cursor`, not as the owner.
4. GitHub CI reports pass/fail for the actual PR head. Owner can see an understandable failure and the worker's bounded repair if needed.
5. A submitted independent Codex review is matched to the stabilized head, then the owner personally reviews and approves. No merge/deployment without separate owner authorization.
6. Log actual run ID, PR URL, head SHA, CI run, usage cost and outcome. Do not represent a configured trigger as a successful pilot until this is verified.

## Next stages only after the successful pilot

Add a second worker for a different issue, optional CI-failure remediation with deduplication, then a short daily completed/blocked/needs-owner digest. Do not create PRs or reviews just to satisfy a daily quota. GitHub Issues/PRs and check runs are the source of truth; historical handoffs are not a status database.

References: https://cursor.com/docs/cloud-agent/automations ; https://cursor.com/docs/cloud-agent ; https://docs.github.com/en/actions
