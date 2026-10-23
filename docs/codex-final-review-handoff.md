# Codex exact-head review: simplified playable missions

**Date October 23, 2026.** PR #14 replaces unmerged PR #12; PR #13 is a separate offline backend draft. Review the **currently published PR #14 HEAD** after its updated CI, not previously reviewed `f55f1e5`.

## High-value checks

1. `index.html`, `simple-missions.css`: learner lands directly in playable **Fix & test** without mandatory static diagnostics; only one active panel; meaningful default objective; optional clue drawer, original AWS-style text behind nested explicit disclosure. Keyboard focus, hidden panels, 320/390/1440 responsive layouts and quiz track navigation.
2. `incident-ui.mjs`, `data/mission-clues.mjs`: 3 clues per case map correctly to the original public probes. Changing cases resets clues/notes/test eligibility. Only most recent played outcome is attachable; report fields not silently overwritten.
3. Prior P2 on old head: guided preview vs virtual test stale attachment **removed by design** (no competing guided action selector); same-status distinct virtual tests **both retained**, with explicit browser regression in NAT lab.
4. `data/playable-sandboxes.mjs`, `playable-ui.mjs`: IAM Allow/boundary and overbroad bypass, NAT three-path assumptions, DNS impossible historical reconstruction are **scoped synthetic teaching models**, never live AWS API calls or claims of general security correctness.
5. No XSS, secret/credential leakage, premium answer key, production billing, auth or AWS provisioning; `formatVersion:1` / `grade:null` remains exported. Free public practice/history storage and six tracks preserved.

Local **63/63 Node** tests pass; Playwright `qa/mission-browser-qa.mjs` all three cases, 1440/390/320 responsive, no off-origin requests/errors; original `qa/codex-p2-browser-qa.mjs` likewise passes. Hosted CI and current-head Codex receipt must be independently checked before owner-ready status.

Read-only review only. If material findings remain, return exact file+line references for authorized remediation. No automated merge, code-owner approval, protected-settings change, paid provider spend, external AWS changes, or Gift modifications.
