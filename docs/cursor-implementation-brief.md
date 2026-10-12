# Cursor task: AWS Cert Lab interactive UI

## Mission
Implement a complete, responsive, accessible, dependency-free study and quiz SPA using EXISTING source files:
- index.html: final UI skeleton with IDs; use it as the source of truth.
- data/blueprints.mjs: exam tracks/domains/weights (verified against AWS exam guides).
- data/lessons.mjs: domain learning notes.
- data/questions.mjs: original question bank, 20 per certification.
- engine.mjs: selection, scoring, localStorage progress and validation.

Write primarily:
- app.mjs: wire all markup with DOM APIs and imported modules
- styles.css: polished, dark, modern developer/infra dashboard, responsive
- favicon.svg (optional)
- tests/*.test.mjs: node:test tests of core engine and bank validation where appropriate
- README.md: usage, limitations, commands, provenance, date checked.

## Acceptance criteria
1. All three tracks (CLF-C02, SCS-C03, ANS-C01) and each domain can be selected; domain guide displays actual weights and notes.
2. Settings: domain, practice/exam, 5/10/20/all, all/missed/bookmarked pool. If pool empty, show an accessible status rather than a broken quiz.
3. Questions show single- or multi-select choices as appropriate, full required selections. Practice mode shows explanation after Check and disables editing. Exam mode keeps answers undisclosed until the end and has a visible countdown tied to track minutesPerQuestion; on timeout ends session and scores. Previous/Next preserve selections and avoid premature answer disclosure. Auto-expire gracefully. Keyboard and reduced-motion accessible.
4. Results: total/percentage, domain breakdown, per-question answers and explanation, bookmarks and missed lists. Persist progress in browser localStorage, handle unavailable storage. Provide local JSON export and explicit reset confirmation. All data local; no login/network.
5. Fix any validation or UX edge cases and test: ensure no broken selectors or missing imports. Deterministic Node built-in unit tests and static check. No added packages/build step.
6. Keep content original. Do not suggest AWS endorsement, exam pass guarantee or actual exact exam simulation. Mark ANS-C01 retirement Dec 31, 2026.
7. No changes outside this folder; do not deploy/push, install dependencies, run untrusted scripts, or use tokens/credentials. Keep work local and report changed files/testing.
8. Keep execution efficient, avoid unnecessary exhaustive browsing. Existing bank is 60 validated original questions.

Work in this folder. Implement rather than merely planning. Return compact summary.
