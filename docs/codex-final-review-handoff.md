# Codex final review: playable labs replacement PR

Review ONLY current PR head, not old PR #12. PR #12 is superseded; PR #13 is a separate unmerged offline authentication foundation.

Changes against last released `main`:
- Guided four-phase missions and public action data `incident-ui.mjs`, `data/incident-actions.mjs`, `mission-workspace.css`.
- NEW playable stateful mini-sandboxes `data/playable-sandboxes.mjs` + `playable-ui.mjs` + `playable-workspace.css`.
- `index.html` primary Run System Test controls, fallback guided drawer, optional report flow.
- Tests `tests/playable-sandboxes.test.mjs`, `tests/incident-actions.test.mjs`, updated `qa/mission-browser-qa.mjs`; prior `qa/codex-p2-browser-qa.mjs` remains unchanged and passing.
- Future Guest/Free/Pro architecture documented ONLY, no login/payment/auth activation.

Verify IAM model stays bounded; NAT state represents three modeled prerequisites, not real networking; DNS cannot backfill unavailable historical logs; no XSS, leaks, premium data, hidden stale state, dropped learner draft or keyboard traps. Verify export `formatVersion=1`, `grade=null`.

Local: 61/61 tests PASS, two real Playwright suites PASS at desktop/mobile, no overflow/runtime errors/off-origin requests. Hosted exact-head CI must pass independently.

This is a bot-owned candidate; only `@jmsgnnr` can approve and merge. Codex review is not owner approval. Never merge, deploy, spend, change permissions or protected settings, or edit Gift.
