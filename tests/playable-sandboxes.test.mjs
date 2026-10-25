import {test} from "node:test";
import assert from "node:assert/strict";
import {SANDBOX_SCENARIOS,newSandboxState,simulateSandbox} from "../data/playable-sandboxes.mjs";

test("three case sandboxes expose distinct initial controls",()=>{
 assert.equal(Object.keys(SANDBOX_SCENARIOS).length,3);
 for(const [id,s] of Object.entries(SANDBOX_SCENARIOS)){
   assert.equal(s.nodes.length,4);
   assert.equal(s.switches.length,3);
   assert.equal(Object.keys(newSandboxState(id)).length,3);
   assert.equal(new Set(s.switches.map(x=>x.id)).size,3);
   assert.ok(s.title&&s.task);
 }
});
test("IAM permissions boundary requires narrow effective authorization, never broad bypass",()=>{
 const id="iam-boundary-v1",state=newSandboxState(id);
 assert.equal(simulateSandbox(id,state).healthy,false);
 assert.equal(simulateSandbox(id,{...state,broad:true}).risk,true);
 assert.equal(simulateSandbox(id,{...state,broad:true}).healthy,false);
 const good=simulateSandbox(id,{...state,boundary:true});
 assert.equal(good.healthy,true);
 assert.match(good.explanation,/other applicable policy conditions/);
 assert.equal(simulateSandbox(id,{...state,boundary:true,identity:false}).healthy,false);
});
test("IAM broad bypass without identity permission still denies access with correct explanation",()=>{
 const id="iam-boundary-v1";
 const deniedWithBroadBypass=simulateSandbox(id,{identity:false,boundary:false,broad:true});
 assert.equal(deniedWithBroadBypass.serviceOk,false,"access should be denied");
 assert.equal(deniedWithBroadBypass.healthy,false,"should not be healthy");
 assert.equal(deniedWithBroadBypass.risk,true,"should flag risk from broad bypass");
 assert.match(deniedWithBroadBypass.explanation,/unsafe bypass.*remains denied.*identity policy lacks/i,"explanation should note identity policy is missing");
 assert.match(deniedWithBroadBypass.evidence,/AccessDenied/,"evidence should show access denied");
});
test("NAT needs all modeled route and egress prerequisites",()=>{
 const id="private-nat-v1",state=newSandboxState(id);
 assert.equal(simulateSandbox(id,state).healthy,false);
 const good={...state,natRoute:true};
 assert.equal(simulateSandbox(id,good).healthy,true);
 assert.equal(simulateSandbox(id,{...good,appRoute:false}).healthy,false);
 assert.equal(simulateSandbox(id,{...good,egress:false}).healthy,false);
});
test("DNS cannot recover past missing telemetry even when future logging works",()=>{
 const id="resolver-blindspot-v1",state=newSandboxState(id);
 const future={...state,resolverLogs:true,hostEvidence:true};
 const good=simulateSandbox(id,future);
 assert.equal(good.healthy,true);
 assert.match(good.evidence,/Past time window: unknown/);
 assert.equal(simulateSandbox(id,{...future,claimHistory:true}).healthy,false);
 assert.equal(simulateSandbox(id,{...future,claimHistory:true}).risk,true);
});
test("invalid scenario and state cannot be used to bypass simulation",()=>{
 assert.equal(newSandboxState("other"),null);
 assert.throws(()=>simulateSandbox("other",{}),/invalid_sandbox_state/);
 assert.throws(()=>simulateSandbox("private-nat-v1",{natRoute:"true"}),/invalid_sandbox_state/);
});
