# CloudOps Lab: focused workspace / 2026-10-22

## Design thesis
The initial prototype placed the hero, six large tracks, billing concept, three investigations, session controls, stats, and detailed reference guides into one long page. The important action, starting practice, competed with secondary information. The new local candidate retains the original **"Cloud knowledge, under pressure."** hero and terminal identity, but switches the content below it between **Practice** and **Field Labs**. Secondary controls stay collapsed instead of appearing in a long stacked page.

## References and decisions
- [Linear My Issues](https://linear.app/docs/my-issues): focused tabs and restrained information density, not a copy of Linear's visual language.
- [Exercism](https://exercism.org/tracks): a track is a direct entry point into doing exercises.
- [TryHackMe training content](https://help.tryhackme.com/en/articles/8484133-training-content-overview): separate interactive challenge activity from learning-path discovery.
- [NN/g progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/): show primary actions by default, defer rare configuration and supporting details.

Preserve the project's independent, late-1990s operations-terminal identity, keyboard focus, native inputs, and high contrast for actual actions. Keep the original bold hero, not a generic marketing hero treatment. Avoid dozens of simultaneous panels, copy-heavy tiles, gradients, and decorative badges.

## Implemented local changes
- The original header headline, pink eyebrow line, chartreuse emphasis, and concise metrics have been restored above the workspace tabs without restoring the long stacked homepage.
- Practice and Field Labs are separate workspace views. Practice is the default.
- A track click starts 10 untimed questions in that track, with all domains. Custom settings remain available on demand.
- Study references, progress controls, and the **unactivated** membership design are in collapsed drawers.
- Field Lab cards use short, neutral previews; full case constraints and original evidence are available on request.
- Every field investigation has three deterministic local diagnostic actions and a single visible report step at a time.
- The incident's five-part export schema, all existing question IDs, scoring semantics, and browser storage key are unchanged.
- No real AWS calls, private answer keys, purchase flow, or automatic incident grading.

## QA and release boundaries
Local source branch: `feature/cloudops-instant-practice-interactive-labs-20261022`, initially developed from CloudOps PR #9 head `87d1a1a` and subsequently rebased onto latest `main` (including merged PR #6 tests). The PR #9 branch is not modified or represented as merged.

Validated through a Chrome Playwright walkthrough at 1440px, 390px, and 320px, including all six track entries, custom timed mode, both workspace tabs, disclosure drawers, three investigative cases, nine simulated checks, five-step report navigation, browser export, and overflow/network/error checks. Screenshot evidence and the standalone test harness reside outside the Git tree in `C:/Users/james/Development/agentic-runs/cloudops-focused-design-qa-20261022` and `cloudops-focused-qa-20261022.mjs`.

This is an isolated review candidate. Any eventual draft-PR publication does not grant approval to merge or deploy. Owner personal PR approval and separate deployment permission remain mandatory. Do not access the Gift repository.
