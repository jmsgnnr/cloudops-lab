# Playable AWS troubleshooting sandboxes

October 23, 2026 | Development candidate | **Not merged / not live**

## Why we changed direction

The current PR #12 lab flow is clear but still resembles a four-page worksheet: inspect static logs, choose a prewritten answer, fill in a report. This improvement makes the **primary** lab interaction a tiny stateful troubleshooting playground. Learners change virtual controls, run a test, observe system behavior, undo or retry. Guidance and report are optional.

## What is actually implemented

- Three synthetic stateful sandboxes, one for each existing free incident: IAM, NAT gateway networking and DNS forensic visibility.
- IAM: manipulate modeled identity Allow, boundary scope and overbroad guardrail removal; GetObject test can be denied, restored narrowly or work unsafely. This is intentionally **not** a complete IAM policy simulator.
- NAT: change private subnet -> NAT, NAT subnet -> IGW, and HTTPS egress states; a virtual HTTP probe shows reachable/timeout based on every required modeled connection.
- DNS: enable future Resolver logging and process evidence collection, or try to make an unsupported historical-recovery claim. Correct outcome never asserts old missing events are recovered.
- Interactive system diagrams and switches (touch/keyboard), **RUN SYSTEM TEST**, result + interpretation, risk indicator, attempt counter, **RESET**, optional expandable guided response examples, optional debrief/report.
- Every changed setting invalidates the preceding test and blocks the debrief until tested again. All three sandboxes run locally and deterministically with no credentials, API requests, LLM usage, stored premium answers or actual AWS changes.
- Retain PR #12 original questions/track navigation, progress, investigation checks, facilitator export `formatVersion:1` / ungraded, and built-in warnings/owner review gates.

## QA evidence

- `tests/playable-sandboxes.test.mjs`: all 3 case control sets, safe recovery vs bypass, route dependency testing, DNS blindspots, malformed state.
- `qa/mission-browser-qa.mjs` extended to test virtual state changes and stale result invalidation, then original optional guided responses and all report/export flows; 1440px/390px/320px Chrome browser, all cases, no overflow, exceptions or off-origin requests.
- Prior `qa/codex-p2-browser-qa.mjs` still passes six quick start tracks and keyboard focus.
- Screenshots outside repository: `Development/agentic-runs/cloudops-playable-design-qa-20261023/`.

## Release boundaries

This is a **stacked change dependent on PR #12**, not an alternative way to bypass PR #12 code-owner approval. Base the review on PR #12's feature branch, keep it draft, run hosted CI and exact-head Codex. After the owner merges PR #12, rebase/re-target only through a separate verified, bot-authored update so the merge diff remains small. Do not merge this stacked branch into `main` until PR #12 has shipped and the owner separately approves this change.

No Cognito, Stripe, AWS resources, billing, protected repository settings, CI workflow changes or Gift site changes in scope.
