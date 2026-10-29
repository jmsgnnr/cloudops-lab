# First-time user acceptance matrix (Field Labs)

Manual acceptance for the three playable missions. Check each row in a real browser at **320**, **390** and **1440** CSS widths. Status values stay **PENDING** until an owner or facilitator marks them after a live pass. Do not invent pass/fail results here.

Where `qa/mission-browser-qa.mjs` already exercises a check, that script is cited. Automated coverage is not a substitute for the Status column.

Mission IDs: IAM `iam-boundary-v1`, NAT `private-nat-v1`, DNS `resolver-blindspot-v1`.

## IAM

| Check | How to verify (320 / 390 / 1440) | QA script | Status |
| --- | --- | --- | --- |
| Clear title and goal | Open Field Labs → IAM case → read brief, then Open the workbench. Confirm `#playable-title` and `#playable-task` state the outage and restore goal without jargon walls. Same three widths. | `open()` reaches workbench; play path assumes title/task present | PENDING |
| Contextual control labels | In `#playable-controls`, every inspect/action control has a readable label tied to the IAM boundary scenario (not generic "Option 1"). Resize and confirm labels wrap without clipping. | Clicks `[data-inspection="BOUNDARY"]`, `[data-action="WILDCARD_BOUNDARY"]`, `[data-action="SCOPED_BOUNDARY"]` | PENDING |
| Stable keyboard focus after each action and after undo | Tab to inspect/action/undo/test. After each activation and after Undo, focus stays on a sensible control (not lost to `body`). Repeat at each width. | Wrong path + undo exercised; NAT/DNS assert focus explicitly; IAM undo path runs in `plays[0]` | PENDING |
| Screen-reader state announcements | With a screen reader (or inspect `aria-live`), run a change and RUN TEST. `#playable-result` (`aria-live="polite"`) and finding live regions announce verdict/explanation. Confirm at each width. | Result visibility asserted after test/undo; live region not asserted by name | PENDING |
| At least one recoverable wrong path | Apply an unsafe or incorrect change (for example wildcard boundary), RUN TEST, read failure, Undo, continue. Confirm undo clears the stale result. All three widths. | `plays[0]`: WILDCARD_BOUNDARY → UNSAFE → undo clears `#playable-result` | PENDING |
| A successful path | Apply the narrow scoped boundary fix, RUN TEST, reach healthy restored verdict. All three widths. | Expects verdict `MISSION RESTORED SAFELY` and healthy badge | PENDING |
| Optional hints | Open "Need a clue?", reveal clues one at a time, confirm original raw artifacts stay nested/optional. No forced clue gate before the workbench. All three widths. | `open()` asserts raw `#incident-evidence` hidden and no diagnostic gate | PENDING |
| Repeat play | After success (desktop path in QA uses report then back), Reset and confirm result clears and the workbench can be solved again. Spot-check Reset at 320 and 390. | At 1440: report round-trip then `#playable-reset` clears result | PENDING |
| No overflow at 320px | At 320, 390 and 1440, confirm no horizontal page overflow on brief and solved workbench. | `overflow()` false at start and solved for `[320, 390, 1440]` | PENDING |
| Reduced motion | Enable OS/browser "reduce motion". Confirm transitions/animations minimize or disable; no smooth-scroll jump that fights the preference. Spot-check hover/progress/quiz fade if those views are opened. | Not covered in `mission-browser-qa.mjs` | PENDING |
| No external requests | DevTools Network: only same-origin (and `data:` / `blob:` if any). Optional AWS doc link exists but must not auto-fetch until clicked. | Collects off-origin requests; asserts `external` empty | PENDING |

## NAT

| Check | How to verify (320 / 390 / 1440) | QA script | Status |
| --- | --- | --- | --- |
| Clear title and goal | Open NAT case workbench. `#playable-title` / `#playable-task` describe restoring outbound HTTPS. Readable at all three widths. | `open()` + `plays[1]` | PENDING |
| Contextual control labels | Route-table and action labels name app/NAT subnets and targets (not anonymous dropdowns). Confirm selects and buttons remain usable at 320. | Uses inspections, `SG_ALL`, and `#nat-target-nat-0-0-0-0-0` | PENDING |
| Stable keyboard focus after each action and after undo | After replace-route / undo / re-render, focus returns to an enabled control (`data-focus`). Verify with keyboard at each width. | Asserts `focused` === `replace\|nat\|0.0.0.0/0` after replace | PENDING |
| Screen-reader state announcements | RUN TEST success/failure updates `#playable-result` live region; live finding text updates on inspect/change. Check with SR or DOM at each width. | Verdict text asserted; live region markup in page | PENDING |
| At least one recoverable wrong path | Try a wrong move (for example allow-all SG), see timeout, Undo, then fix the real route. All three widths. | `SG_ALL` → TIMEOUT → undo clears result | PENDING |
| A successful path | Point NAT default route at the internet gateway, RUN TEST, healthy HTTPS / shared NAT verdict. All three widths. | Expects `HTTPS REACHABLE · SHARED NAT VERIFIED` | PENDING |
| Optional hints | Clue drawer optional; advanced/original evidence not forced. All three widths. | Same `open()` evidence-hidden checks | PENDING |
| Repeat play | Reset after success; result clears; solve again. 1440 covered in QA report/reset path; check 320/390 manually. | 1440 reset after report | PENDING |
| No overflow at 320px | No horizontal overflow on start and solved layouts at 320, 390, 1440. | `overflow()` checks for mission index 1 | PENDING |
| Reduced motion | Reduce-motion preference on; motion minimized; route UI still operable. | Not covered in `mission-browser-qa.mjs` | PENDING |
| No external requests | Network panel: no unexpected off-origin calls during play. | Suite asserts `offOrigin` empty | PENDING |

## DNS

| Check | How to verify (320 / 390 / 1440) | QA script | Status |
| --- | --- | --- | --- |
| Clear title and goal | Open DNS case. Title/task make clear history cannot be recovered and the job is future visibility / a defensible investigation. All three widths. | `open()` + `plays[2]` | PENDING |
| Contextual control labels | Evidence cards, hypotheses, claims and actions use concrete DNS/investigation labels. Usable at 320 without truncated meaning. | Clicks evidence, hypothesis, claim and action controls by `data-*` | PENDING |
| Stable keyboard focus after each action and after undo | After hypothesis select and after undo, focus is not dropped to the page body. Keyboard check at each width. | Asserts focus on `hyp\|H_NONE`; after undo `focused` ≠ `BODY` | PENDING |
| Screen-reader state announcements | Evidence/live `.dns-live` and `#playable-result` announce unsupported vs verified outcomes. Confirm polite live updates. | Asserts `.dns-live` "cannot recreate" and final verdict text | PENDING |
| At least one recoverable wrong path | Wrong hypothesis/action (for example flow-detailed or backfill), see not supported / cannot recreate, Undo, continue. All three widths. | FLOW_DETAILED → NOT SUPPORTED → undo; BACKFILL live message | PENDING |
| A successful path | Justify uncertainty, enable future host coverage, RUN TEST to verified future-coverage verdict. All three widths. | Expects `UNCERTAINTY JUSTIFIED · FUTURE COVERAGE VERIFIED` | PENDING |
| Optional hints | Optional clues; DNS hint control if shown remains optional. Raw artifacts nested. All three widths. | `open()` optional evidence; clues not forced | PENDING |
| Repeat play | Reset clears verified state; mission can be replayed. Confirm at 320/390; 1440 reset in QA. | 1440 `#playable-reset` after report | PENDING |
| No overflow at 320px | Timeline/cards do not force horizontal scroll at 320, 390, 1440. | `overflow()` for mission index 2 | PENDING |
| Reduced motion | Reduce motion on; CSS transitions/animations minimized; timeline still readable. | Not covered in `mission-browser-qa.mjs` | PENDING |
| No external requests | No auto off-origin fetches while collecting evidence or testing. | Suite asserts no external requests | PENDING |

## Notes

- Facilitator: change Status from PENDING to PASS or FAIL with date and width notes after a real browser pass.
- Prefer pairing this matrix with `docs/usability-test-script.md` for five-person sessions; this file is acceptance, not recruitment.
