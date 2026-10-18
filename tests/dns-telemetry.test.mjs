import assert from "node:assert/strict";
import { it } from "node:test";
import { QUESTIONS } from "../data/questions.mjs";

it("scs-27 does not incorrectly use VPC Flow Logs for Amazon DNS traffic", () => {
  const q = QUESTIONS.find(item => item.id === "scs-27");
  assert.ok(q);
  assert.match(q.stem, /Amazon-provided VPC DNS resolver/i);
  assert.deepEqual(q.answers, [1, 2]);
  assert.match(q.options[0], /VPC Flow Logs/);
  assert.match(q.options[1], /Resolver query logs/);
  assert.match(q.options[2], /host-level DNS client or process/i);
  assert.match(q.explanation, /VPC Flow Logs exclude traffic to the Amazon-provided DNS server/);
  assert.match(q.explanation, /caching/);
  assert.match(q.reference, /Route53\/latest\/DeveloperGuide\/resolver-query-logs\.html/);
});
