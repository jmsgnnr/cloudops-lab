import { test } from "node:test";
import assert from "node:assert/strict";
import { INCIDENTS } from "../data/incident-pilots.mjs";
import { getIncidentProbes } from "../data/incident-probes.mjs";
import { MISSION_CLUES, getMissionClues } from "../data/mission-clues.mjs";

test("every public mission offers a clear goal and three optional learner-first clues", () => {
  assert.equal(INCIDENTS.length,3);
  assert.deepEqual(Object.keys(MISSION_CLUES).sort(),INCIDENTS.map(i=>i.id).sort());
  for (const incident of INCIDENTS) {
    const guide=getMissionClues(incident.id);
    const original=new Map(getIncidentProbes(incident.id).map(p=>[p.id,p]));
    assert.ok(guide.headline.length>15);
    assert.ok(guide.goal.length>30);
    assert.ok(guide.signal.length>5);
    assert.equal(guide.clues.length,3);
    assert.equal(new Set(guide.clues.map(c=>c.probeId)).size,3);
    for(const clue of guide.clues){
      assert.ok(original.has(clue.probeId),clue.probeId);
      assert.ok(clue.question.endsWith("?"),clue.question);
      assert.ok(clue.finding.length>30);
      assert.ok(clue.meaning.length>25);
      assert.equal(/http:\/\/|https:\/\/|iam:PassRole|AKIA[0-9A-Z]{16}/.test(clue.finding),false);
    }
  }
  assert.equal(getMissionClues("nonexistent"),null);
});
test("IAM, NAT and DNS hints keep the synthetic root causes distinct",()=>{
  const iam=getMissionClues("iam-boundary-v1").clues;
  assert.match(iam[1].finding,/identity policy already allows GetObject/);
  assert.match(iam[2].finding,/permissions boundary/i);
  const nat=getMissionClues("private-nat-v1").clues;
  assert.match(nat[1].finding,/transit gateway instead of the intended internet gateway/);
  const dns=getMissionClues("resolver-blindspot-v1").clues;
  assert.match(dns[1].finding,/Flow Logs exclude/);
  assert.match(dns[2].meaning,/historical.+unconfirmed/);
});
test("every clue has an official AWS documentation reference with valid URL",()=>{
  for(const incident of INCIDENTS){
    const guide=getMissionClues(incident.id);
    for(const clue of guide.clues){
      assert.ok(clue.reference,"clue missing reference: "+clue.probeId);
      assert.ok(clue.reference.label,"clue reference missing label: "+clue.probeId);
      assert.ok(clue.reference.url,"clue reference missing url: "+clue.probeId);
      assert.match(clue.reference.url,/^https:\/\/docs\.aws\.amazon\.com\//,"clue reference must be official AWS docs: "+clue.probeId);
      assert.ok(clue.reference.label.length>10,"clue reference label too short: "+clue.probeId);
    }
  }
});
test("IAM clues reference identity policies, evaluation logic and permissions boundaries",()=>{
  const iam=getMissionClues("iam-boundary-v1").clues;
  assert.match(iam[0].reference.url,/reference_policies_evaluation-logic/,"first clue should reference policy evaluation");
  assert.match(iam[1].reference.url,/access_policies.*id-based/,"second clue should reference identity-based policies");
  assert.match(iam[2].reference.url,/access_policies_boundaries/,"third clue should reference permissions boundaries");
});
test("NAT clues reference NAT scenarios, route tables and security groups",()=>{
  const nat=getMissionClues("private-nat-v1").clues;
  assert.match(nat[0].reference.url,/nat-gateway-scenarios/,"first clue should reference NAT gateway scenarios");
  assert.match(nat[1].reference.url,/WorkWithRouteTables/,"second clue should reference route tables");
  assert.match(nat[2].reference.url,/security-group-rules/,"third clue should reference security group rules");
});
test("DNS clues reference Resolver query logging and VPC Flow Logs exclusions",()=>{
  const dns=getMissionClues("resolver-blindspot-v1").clues;
  assert.match(dns[0].reference.url,/resolver-query-logs\.html/,"first clue should reference Resolver query logs");
  assert.match(dns[1].reference.url,/flow-logs.*limitations/,"second clue should reference Flow Logs exclusions");
  assert.match(dns[2].reference.url,/resolver-query-logs-format/,"third clue should reference query log fields");
});
