import assert from "node:assert/strict";
import { test } from "node:test";
import { QUESTIONS } from "../data/questions.mjs";
import { emptyProgress } from "../engine.mjs";
import { createAtomicProgressRepository, ProgressWriteConflict } from "../server/progress-repository.mjs";

const ids = new Set(QUESTIONS.map(q => q.id));
const picks = QUESTIONS.filter(q=>q.track==="practitioner").slice(0,2);
const guests = [
  {version:1,attempts:[],missed:[],bookmarks:[picks[0].id]},
  {version:1,attempts:[],missed:[picks[1].id],bookmarks:[picks[1].id]}
];

function inMemoryCas({forceConflicts=0}={}) {
  const records = new Map();
  let conflicts = 0;
  return {
    records,
    async readRecord(subject) {
      return records.has(subject) ? structuredClone(records.get(subject)) : null;
    },
    async compareAndSwap(subject, expected, next) {
      if (conflicts < forceConflicts) {
        conflicts++;
        return false;
      }
      const previous = records.get(subject);
      if ((previous?.revision ?? 0) !== expected) return false;
      records.set(subject,structuredClone(next));
      return true;
    }
  };
}

test("new account imports guest bookmark history in a conditional revision",async()=>{
  const store=inMemoryCas();
  const repo=createAtomicProgressRepository({...store,allowedQuestionIds:ids});
  const merged=await repo.mergeProgressAtomic("alice",guests[0]);
  assert.deepEqual(merged.bookmarks,[picks[0].id]);
  assert.equal(store.records.get("alice").revision,1);
  assert.equal((await repo.getProgress("alice")).version,1);
  assert.deepEqual(await repo.getProgress("bob"),emptyProgress());
});
test("a repeated identical import does not incur another conditional database write",async()=>{
  const store=inMemoryCas();
  const repo=createAtomicProgressRepository({...store,allowedQuestionIds:ids});
  await repo.mergeProgressAtomic("alice",guests[0]);
  assert.equal(store.records.get("alice").revision,1);
  await repo.mergeProgressAtomic("alice",guests[0]);
  assert.equal(store.records.get("alice").revision,1);
});
test("two simultaneous device imports retry against the latest revision and preserve both",async()=>{
  const store=inMemoryCas();
  const repo=createAtomicProgressRepository({...store,allowedQuestionIds:ids});
  const results=await Promise.all([
    repo.mergeProgressAtomic("alice",guests[0]),
    repo.mergeProgressAtomic("alice",guests[1])
  ]);
  assert.equal(results.length,2);
  const saved=await repo.getProgress("alice");
  assert.deepEqual(saved.bookmarks,[picks[0].id,picks[1].id].sort());
  assert.deepEqual(saved.missed,[picks[1].id]);
  assert.equal(store.records.get("alice").revision,2);
});
test("compare-and-swap retries a contested write and then succeeds",async()=>{
  const store=inMemoryCas({forceConflicts:2});
  const repo=createAtomicProgressRepository({...store,allowedQuestionIds:ids});
  const result=await repo.mergeProgressAtomic("alice",guests[0]);
  assert.deepEqual(result.bookmarks,[picks[0].id]);
  assert.equal(store.records.get("alice").revision,1);
});
test("repeated conflict exhaustion fails explicitly and never loses existing state",async()=>{
  const store=inMemoryCas({forceConflicts:5});
  const repo=createAtomicProgressRepository({...store,allowedQuestionIds:ids,maxRetries:3});
  await assert.rejects(()=>repo.mergeProgressAtomic("alice",guests[0]),ProgressWriteConflict);
  assert.equal(store.records.has("alice"),false);
});
test("unverified account ID and incorrectly wired datastore cannot be accepted",async()=>{
  const store=inMemoryCas();
  const repo=createAtomicProgressRepository({...store,allowedQuestionIds:ids});
  await assert.rejects(()=>repo.getProgress("../alice"),/invalid_verified_subject/);
  await assert.rejects(()=>repo.mergeProgressAtomic("",guests[0]),/invalid_verified_subject/);
  assert.throws(()=>createAtomicProgressRepository({}),/not_configured/);
});
test("a malformed revision or unexpected storage adapter response fails closed",async()=>{
  const store=inMemoryCas();
  store.records.set("alice",{revision:-100,progress:guests[0]});
  const repo=createAtomicProgressRepository({...store,allowedQuestionIds:ids});
  await assert.rejects(()=>repo.mergeProgressAtomic("alice",guests[1]),/invalid_progress_revision/);
  const bad=createAtomicProgressRepository({allowedQuestionIds:ids,
    readRecord:async()=>null,compareAndSwap:async()=>undefined});
  await assert.rejects(()=>bad.mergeProgressAtomic("alice",guests[0]),/invalid_compare_and_swap_response/);
});
