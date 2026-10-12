# CloudOps Lab  |  AWS Certification Practice

Created by **[@jmsgnnr](https://github.com/jmsgnnr)**.

Independent, browser-only study and quiz tool for three AWS certification tracks:

| Track | Exam code | Questions |
| --- | --- | --- |
| Cloud Practitioner | CLF-C02 | 60 |
| Security Specialty | SCS-C03 | 60 |
| Advanced Networking Specialty | ANS-C01 | 60 |

**Not affiliated with or endorsed by Amazon Web Services.** Questions are original practice scenarios inspired by public exam guides  |  not copies of real exam items and not a pass guarantee or score predictor.

**ANS-C01 retirement:** AWS lists Advanced Networking Specialty (ANS-C01) for retirement on **December 31, 2026**. Confirm any exam plans on [AWS Certification](https://aws.amazon.com/certification/).

## Usage

ES modules require a local HTTP server (opening `index.html` directly from disk may block imports).

```bash
# From this folder
npx --yes serve -l 3456 .
# or
python -m http.server 3456
```

Open `http://localhost:3456` in a modern browser.

1. Pick a certification track.
2. Configure domain, practice vs timed exam mode, question count, and pool (all / missed / bookmarked).
3. Answer questions (single- or multi-select as indicated). Practice mode reveals explanations after **Check**; exam mode hides answers until the debrief and runs a session timer based on each track’s `minutesPerQuestion`.
4. Review results, export JSON progress, or reset local data with confirmation.

Progress (sessions, missed IDs, bookmarks) stays in **localStorage** only  |  no accounts, no network calls.

## Commands

```bash
# Unit tests (Node built-in test runner, no install)
node --test tests/*.test.mjs

# Syntax check entry modules
node --check app.mjs
node --check engine.mjs
```

## Limitations

- Fixed bank of 180 validated original questions (60 per track); selection shuffles across domains but does not simulate official exam item pools or pass rules.
- Timed exam uses `question count × minutesPerQuestion` as a study timer, not official exam clock rules.
- Empty missed/bookmark pools show an inline message instead of starting a session.
- If storage is blocked, the app falls back to in-memory progress for the current tab and warns on export/save failures.

## Provenance

- Domain weights and track metadata: AWS certification exam guide pages linked from the in-app **Official exam guide** control (checked **October 12, 2026**).
- Learning notes: `data/lessons.mjs` (original summaries).
- Questions: `data/practitioner.mjs`, `data/security.mjs`, `data/networking.mjs` (legacy IDs 01–20 per track) plus `data/*-extended.mjs` (IDs 21–60 per track); merged in `data/questions.mjs`.

## Project layout

- `index.html`  |  UI skeleton
- `app.mjs`  |  DOM wiring
- `styles.css`  |  layout and theme
- `engine.mjs`  |  selection, scoring, storage helpers
- `data/`  |  blueprints, lessons, question bank
- `tests/`  |  Node unit tests
