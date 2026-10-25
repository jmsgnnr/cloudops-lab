/**
 * Small, deterministic stateful mini-sandboxes. These model teaching-specific
 * conditions and NEVER mutate real AWS resources or calculate a real IAM decision.
 */
export const SANDBOX_SCENARIOS = Object.freeze({
  "iam-boundary-v1": {
    title: "Repair the effective permission",
    task: "The job can't download its file. Try changing permissions, then run the test.",
    nodes: ["Reporting role", "Identity policy", "Permissions boundary", "S3 object"],
    switches: [
      { id:"identity", label:"The role can read the file", initial:true, help:"The role already has an identity-level Allow." },
      { id:"boundary", label:"The boundary permits this file read", initial:false, help:"Permit only the required object read in this synthetic boundary." },
      { id:"broad", label:"Remove permission safeguards (unsafe)", initial:false, help:"A shortcut with unacceptable scope, not a production recommendation." }
    ],
    reference: {label:"IAM permissions boundaries", url:"https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html"}
  },
  "private-nat-v1": {
    title: "Restore outbound HTTPS",
    task: "The app can't connect to the internet. Repair its route, then test HTTPS.",
    nodes: ["Private instance", "NAT gateway", "Internet gateway", "HTTPS endpoint"],
    switches: [
      { id:"appRoute", label:"App traffic goes to NAT", initial:true, help:"The application route is already present." },
      { id:"natRoute", label:"NAT traffic goes to internet gateway", initial:false, help:"This is the missing egress path in the supplied model." },
      { id:"egress", label:"Allow outbound HTTPS", initial:true, help:"Existing rule already allows TCP 443." }
    ],
    reference: {label:"NAT gateway scenarios", url:"https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-scenarios.html"}
  },
  "resolver-blindspot-v1": {
    title: "Build a defensible investigation",
    task: "You can't recover missing DNS history. Set up better future visibility.",
    nodes: ["Workload", "VPC resolver", "Query logs", "Host attribution"],
    switches: [
      { id:"resolverLogs", label:"Record future DNS queries", initial:false, help:"Capture supported future DNS queries, not historical ones." },
      { id:"hostEvidence", label:"Record the process making queries", initial:false, help:"Collect process-level evidence with approved endpoint tooling." },
      { id:"claimHistory", label:"Claim old missing records are recovered (incorrect)", initial:false, help:"This is not possible. Avoid unsupported retrospective conclusions." }
    ],
    reference: {label:"Resolver query logging", url:"https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-query-logs.html"}
  }
});

export function newSandboxState(incidentId) {
  const scenario = SANDBOX_SCENARIOS[incidentId];
  if (!scenario) return null;
  return Object.fromEntries(scenario.switches.map(s=>[s.id,s.initial]));
}

export function simulateSandbox(incidentId, state) {
  const scenario = SANDBOX_SCENARIOS[incidentId];
  if (!scenario || !state || scenario.switches.some(s=>typeof state[s.id]!=="boolean")) {
    throw new Error("invalid_sandbox_state");
  }
  if (incidentId==="iam-boundary-v1") {
    const permitted=state.identity && (state.boundary || state.broad);
    const safe=permitted && state.boundary && !state.broad;
    return {
      status:safe?"RESTORED SAFELY":permitted?"ACCESS WORKS · RISKY":"ACCESS DENIED",
      healthy:safe,
      serviceOk:permitted,
      risk:!!state.broad,
      explanation:state.broad && permitted
        ?"The model permits the read after removing the boundary, but that shortcut creates an overbroad permissions risk. Restore guardrails and scope the Allow."
        :state.broad && !permitted
          ?"Even with the unsafe bypass, access remains denied because the identity policy lacks the required GetObject allowance. Restore the identity permission first, then use the scoped boundary instead."
          :safe
            ?"The two required Allow layers now overlap for this modeled GetObject request. In AWS you would also verify all other applicable policy conditions."
            :"The read is denied in this model because either the identity policy or its permissions boundary lacks the required allowance.",
      evidence:"Simulated S3 GetObject: "+(permitted?"allowed":"AccessDenied")+"; guardrails: "+(state.broad?"weakened":"retained")
    };
  }
  if (incidentId==="private-nat-v1") {
    const healthy=state.appRoute&&state.natRoute&&state.egress;
    return {
      status:healthy?"HTTPS REACHABLE":"HTTPS TIMEOUT",
      healthy,
      serviceOk:healthy,
      risk:!state.appRoute||!state.egress,
      explanation:healthy
        ?"All three modeled prerequisites now exist: workload to NAT, NAT subnet to IGW and HTTPS egress."
        :!state.appRoute
          ?"The private workload no longer routes through NAT. Restore its private-subnet default route."
          :!state.natRoute
            ?"Traffic reaches the NAT gateway but the gateway subnet lacks a default route to the IGW."
            :"The modeled security group no longer permits outbound TCP 443.",
      evidence:"Synthetic HTTPS probe: "+(healthy?"200 / reachable":"timeout")+"; no real packets sent"
    };
  }
  const future=state.resolverLogs&&state.hostEvidence;
  const safe=future&&!state.claimHistory;
  return {
    status:state.claimHistory?"UNSUPPORTED HISTORY CLAIM":safe?"FUTURE COVERAGE READY":"VISIBILITY GAP",
    healthy:safe,
    serviceOk:future,
    risk:!!state.claimHistory,
    explanation:state.claimHistory
      ?"Enabling new logging cannot recreate missing historical DNS or process events. Remove that unsupported claim."
      :future
        ?"Future query logs and host telemetry provide complementary evidence, subject to collection, cache, and attribution limits. The old window remains unknown."
        :"Future DNS visibility still has a gap. Resolver query logs and host telemetry complement each other; VPC Flow Logs exclude Amazon-provided resolver queries.",
    evidence:"Past time window: unknown; future Resolver collection: "+(state.resolverLogs?"on":"off")+"; host visibility: "+(state.hostEvidence?"on":"off")
  };
}
