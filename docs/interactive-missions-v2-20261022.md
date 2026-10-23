# CloudOps Lab: interactive mission experience

Status: **local engineering candidate, not merged or deployed**.
Date: October 22, 2026.
Scope: the three existing PUBLIC, deterministic, synthetic investigations only.
Pricing and login changes are in `docs/auth-and-membership-gating-20261022.md`; this branch creates no paid content/checkout/account.

## Product diagnosis

The shipped lab asks learners to choose three fixed probes, optionally attach a result and fill five blank textareas. That resembles an incident form, not practical investigative learning. The start of each lab gives too little direction to an inexperienced learner; showing the terminal and report simultaneously also lengthens the page.

Inspirations: TryHackMe tasks + hints, Hack The Box guided/adventure distinction, and AWS Builder Labs safe, step-by-step experiences. We are **not** claiming these exercises run AWS resources or mimic the full AWS Console.

## New four-phase public mission (implemented locally)

| Phase | User action | App response |
| --- | --- | --- |
| 01 Brief | Read a one-sentence mission, click Start | One clear next action; optional contextual brief |
| 02 Inspect | Run any two of three case-specific synthetic diagnostic checks | Evidence log automatically captures visited checks; revisit and compare them; optional hint; don't paste manually |
| 03 Simulate | Choose an action, explicitly simulate it, observe modeled consequence, revise decision | Three scoped response paths per case, including a plausible correction, a wrong lever, and a high-risk/unsupported option. No real change, no scoring |
| 04 Report | Reuse evidence/decision in five guided notes, return to the simulation, export | Same existing ungraded JSON schema, optional local-only copy actions, missing-field validation and no silent data upload |

### Interaction safety

- Mission and report state are in memory; nothing is uploaded. Browser local quiz progress stays under the existing storage key and schema, unchanged.
- Learner must simulate explicitly to see a consequence. Choosing another action hides the old outcome, requiring another explicit simulation.
- Evidence is attached to the report **only when clicked**, deduplicated by synthetic observation header and bounded by existing 4,000-character field limit. Original learner text remains editable. Simulated action is copied with the original warning, not passed as a guaranteed correct answer.
- Native buttons, phase indicators with `aria-current`, explicit keyboard focus, native hint disclosure. On exit, confirm if unexported investigations exist.
- All three public case scenarios remain free, with existing technical disclaimers and accurate DNS / IAM / NAT limitations. No hidden facilitator answer key or imaginary AWS API activity is introduced.
- No subscription-related gate is represented in the browser. The public client cannot safely contain premium secrets.

### Current technical checks

- `tests/incident-actions.test.mjs`: all three cases have three distinct actions and interpretable consequences; export stays formatVersion=1, `grade:null`.
- `qa/mission-browser-qa.mjs`: Playwright desktop/mobile flow through all three cases, 2 decisions/case, case exit, export, no JS errors, no off-origin requests or narrow-width overflow. Optional Playwright module path provided at runtime; no new `npm` dependency.
- Existing `qa/codex-p2-browser-qa.mjs` and all older quiz/progress tests must still pass.
- Screenshots outside repo in local `Development/agentic-runs/cloudops-mission-design-qa-20261022`; verify real screenshot before owner readiness.

## Next iteration (separate, gated premium architecture)

Don't sell the current three static decision demonstrations as a subscription. The paid product must be deeper:
- **Stateful simulators:** IAM policy evaluator with editable boundary/identity resource scope, VPC route + NAT path map with draggable/default-route changes, and DNS telemetry timeline with available/unavailable sources and process-attribution tradeoffs. Any virtual changes should mutate a sandboxed scenario state object and produce deterministic observable effects.
- **Two skill levels:** Guided (hints and learn-as-you-go) and Challenge (minimal hints and optional facilitator rubric), accessible with keyboard/touch.
- **Meaningful results:** rubric feedback tied to facts, decision sequence, unsafe scope and rollback/verification, calculated server-side for paid content. Show evidence-backed explanations after completion, not answers before.
- **Replayability:** variations of symptoms, entities, policy scopes and route entries. Seeded scenarios so the same initial condition is reproducible for reviewing a failure.
- **Optional AI coach:** only after measuring usage cost, data privacy, rate limiting and opt-in. A membership does not imply unlimited billable LLM calls.

## Acceptance to proceed

1. On 390px, the learner always understands **what to click next**, without a wall of concurrent panels or forced writing before exploring.
2. A user can inspect two probes, change their mind about an action, simulate both outcomes and revisit the report with no state loss.
3. Claims are correctly scoped as synthetic and non-graded, especially DNS blind spots.
4. Existing progress, six practice tracks, keyboard navigation, old export schema and home visual identity remain unchanged.
5. No new protected workflow, AWS resources, Stripe configuration, subscription, credentials, costs, or deployment.
6. Publish only an isolated bot-authored draft PR, obtain hosted CI + exact-head Codex review, then ask the owner for personal approval. **Never auto-merge**.

Reference sources:
- https://help.tryhackme.com/en/articles/6611837-rooms
- https://help.hackthebox.com/en/articles/8117054-guided-mode-on-htb-labs
- https://aws.amazon.com/training/
