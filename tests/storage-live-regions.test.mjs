import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
const ids = ["storage-banner", "quiz-storage-note", "results-storage-note", "progress-storage-note"];

test("storage live regions exist in markup, are not hidden, and are role=status", () => {
  for (const id of ids) {
    const tag = html.match(new RegExp(`<[a-z]+[^>]*id="${id}"[^>]*>`))?.[0];
    assert.ok(tag, id + " missing");
    assert.match(tag, /role="status"/);
    assert.match(tag, /aria-live="polite"/);
    assert.doesNotMatch(tag, /\shidden(\s|>|=)/);
  }
});

test("CSS never removes storage live regions from the accessibility tree when empty", () => {
  const rules = [...css.matchAll(/([^{}]*storage-(?:banner|note)[^{}]*)\{([^}]*)\}/g)];
  assert.ok(rules.length >= 3);
  for (const [, , body] of rules) assert.doesNotMatch(body, /display\s*:\s*none|visibility\s*:\s*hidden/);
});
