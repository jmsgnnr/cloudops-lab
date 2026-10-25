# CloudOps Lab / creative and engineering contract

**Codex project start:** read `CODEX_HANDOFF.md` before final review. It records the current local worktree, what is built, what is uncommitted, and why Codex cannot automatically see this ChatGPT conversation. Codex is review-only under our security hold.

Creator: [@jmsgnnr](https://github.com/jmsgnnr). Independent AWS study tool, not an official exam simulator.

## Visual identity

An intentionally engineered, late-1990s operations console. Ink-black, readable bone, electric chartreuse and controlled hot-pink accents; meaningful gridlines, terminal typography and crisp panel geometry. Preserve the clear track selector, domain weights and accessible question screen. Never turn it into generic SaaS cards, stock blue gradients or a fashionable UI kit. Motion is minimal and never blocks reading. Prefer accessible native controls.

Before major visual changes, inspect desktop/mobile screenshots and write a design thesis. Test blank state, timed and untimed questions, multi-select, missed/bookmarked filters and result reviews in real browsers. UI acceptance is separate from passing JavaScript tests.

## Question quality

The bank has 180 original practice questions, 60 per track. Keep exam domains balanced and use correct explanations. Plausible wrong choices are required; reject joke answers, easily gamed positions and ambiguous technical claims. Answer options are shuffled during selection and correct choices remapped without changing historical question IDs. Preserve user progress schema, no externally sourced proprietary exam dumps, no fake AWS endorsement. Node tests and full browser walkthrough must pass before release.

## Team

Cursor for bounded implementation; lead performs deterministic tests and screenshot review. Claude only for specialist escalations; conserve paid credits. No unapproved external packages/network requests. Credit creator as @jmsgnnr, maintain accurate upstream AWS credit. No em dashes or generic promotional filler in public UI writing. Include release evidence in the supervising team's execution ledger and do not claim deployment until GitHub Pages is verified.

## Code Review Rules

### Compatibility and data boundaries
- Treat the original 180 practice question IDs and the existing browser progress/export shape as compatibility contracts. Flag migrations, renames, scoring changes, or resets that silently invalidate previous progress. The three synthetic incident reports are **separate** from the 216 multiple-choice questions.
- Never include private premium answer keys, facilitator grading guidance, user credentials, or employer logs in any public browser bundle, JSON download or static site. The three incident pilots must remain explicitly synthetic, ungraded and local-only until a separately approved server-side entitlement system exists.

### Technical accuracy and release truthfulness
- Challenge AWS assertions where missing context changes the correct remediation. In particular, VPC Flow Logs exclude traffic to the Amazon-provided DNS resolver, Resolver logs do not retroactively recover old lookups, and the IAM/NAT cases require least-privilege and blast-radius reasoning. Require claim-specific official sources for substantive technical fixes.
- Reject copy that describes planned $10/month or $100/year membership as live billing, promises an official AWS certification/pass predictor, or calls document-based scenarios live AWS labs.

### Review handoff
- Codex is final code **reviewer only**, not an implementation engineer. Review completed diffs after deterministic tests and real desktop/mobile browser evidence, then report reproducible findings with severity and file/line references. Do not fix, push, approve or merge from the review role. A Codex review is not @jmsgnnr's required personal PR approval.

## Cursor Cloud specific instructions

Local development is a static site plus Node tests. `package.json` has no start or build script, and opening `index.html` from disk blocks ES module imports.

- Serve the repository root with `python3 -m http.server 3456 --bind 0.0.0.0` and open `http://127.0.0.1:3456`. On the default image, Python 3.12 serves `.mjs` as `text/javascript`.
- Node 22 matches CI. Run `node --check app.mjs`, `node --check engine.mjs`, `node --check data/advanced-challenges.mjs`, and `node --test --test-concurrency=1 tests/*.test.mjs`. Those tests do not import `node_modules`.
- `npm ci` installs Playwright for the optional scripts in `qa/`. Those scripts launch system Chrome (the `chrome` channel) against a preview server that is already running. `package.json` is not on `main` yet, so the Cloud Agent install runs `npm ci` only when `package-lock.json` is present. On a branch that adds the lockfile, run `npm ci` once after checkout.
- No secrets, login, or external services are required. Planned membership copy is not live billing. `.cursor/environment.json` is gitignored; keep Cloud Agent install and start configuration in the environment panel.
