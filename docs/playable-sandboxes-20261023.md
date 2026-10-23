# CloudOps Lab: playable virtual troubleshooting missions

Status October 23, 2026: **review-only replacement for unmerged PR #12**, not merged or deployed.

The guided labs in PR #12 were still too close to a four-step worksheet. This replacement keeps the clear Brief/Inspect/Simulate structure but makes **the main interaction a stateful, virtual AWS troubleshooting playground**.

For each existing free case, a learner changes three virtual controls, runs a test, reads the modeled system outcome, retries, resets or opens optional guided examples. Progress/drafts are local only; no real AWS activity or LLM calls.

- IAM: simulate identity Allow, boundary scope and dangerous broad bypass. Restoration marked safe only when scope is narrow. This is not a full AWS permission evaluator.
- NAT: private application route, NAT subnet Internet Gateway route and outbound HTTPS egress form a dependency graph. Test succeeds only with the modeled prerequisites.
- DNS: set up **future** Resolver and host telemetry; past missing evidence cannot be reconstructed and false retrospective claims are marked unsafe.
- Result from last test is invalidated by changed controls. Optional debrief/report and legacy JSON export remain available, ungraded.
- All 216 questions, six track practice flow, existing storage/version and browser-only progress remain intact. Commercial auth/Pro billing is not implemented by this change.

QA: 61/61 Node tests; `qa/mission-browser-qa.mjs` all three cases 1440/390/320; old quiz `qa/codex-p2-browser-qa.mjs` all six track modes and keyboard focus. Screenshots reviewed outside Git under `Development/agentic-runs/cloudops-playable-design-qa-20261023`.

Release: one clean bot-authored branch based on currently merged `main` replaces PR #12. The older PR #12 must **not** be separately merged. Separate PR #13 (backend access foundation) remains draft. Require hosted CI, exact-head independent Codex review, owner personal code-owner approval and separately authorized merge/deploy. No Gift site modifications or payment/account/resource changes.
