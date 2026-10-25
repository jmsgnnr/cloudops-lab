/**
 * Three approachable clues per synthetic case. Each clue maps to an existing
 * public probe ID. No private premium solutions or real AWS requests.
 */
export const MISSION_CLUES = Object.freeze({
  "iam-boundary-v1": Object.freeze({
    headline:"An S3 download is being denied.",
    goal:"Get the reporting job reading its file without removing security guardrails.",
    signal:"ACCESS DENIED",
    references:Object.freeze([
      {label:"S3 access policy evaluation",url:"https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies.html"},
      {label:"IAM policy evaluation",url:"https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html"},
      {label:"IAM permissions boundaries",url:"https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html"}
    ]),
    start:"Open the workbench",
    clues:Object.freeze([
      Object.freeze({probeId:"request", question:"What is failing?", finding:"The job is trying to download an S3 file, but S3 responds with AccessDenied.", meaning:"We know which request is failing. Next, check what the role is allowed to do."}),
      Object.freeze({probeId:"identity", question:"Does the role have permission?", finding:"Yes. The role's identity policy already allows GetObject for this file.", meaning:"Adding another identity-policy Allow won't fix a different permission layer."}),
      Object.freeze({probeId:"boundary", question:"What is actually blocking it?", finding:"The permissions boundary allows listing the bucket, but not reading the file.", meaning:"The role needs a narrowly scoped GetObject allowance in its boundary too. Don't remove the boundary entirely."})
    ])
  }),
  "private-nat-v1": Object.freeze({
    headline:"Your app can't reach an HTTPS service.",
    goal:"Repair the outbound network path without weakening unrelated security controls.",
    signal:"HTTPS TIMEOUT",
    references:Object.freeze([
      {label:"NAT gateway routing",url:"https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-scenarios.html"},
      {label:"Public NAT subnet routing",url:"https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-scenarios.html"},
      {label:"VPC route table troubleshooting",url:"https://docs.aws.amazon.com/vpc/latest/userguide/route-table-options.html"}
    ]),
    start:"Open the workbench",
    clues:Object.freeze([
      Object.freeze({probeId:"application", question:"Where does the app send traffic?", finding:"The private application subnet already sends internet-bound traffic to its NAT gateway.", meaning:"That first hop looks right. Find out where the NAT gateway sends traffic next."}),
      Object.freeze({probeId:"gateway", question:"Where does the NAT gateway send traffic?", finding:"Its subnet routes internet traffic to a transit gateway instead of the intended internet gateway.", meaning:"The missing outbound path is on the NAT subnet's default route."}),
      Object.freeze({probeId:"controls", question:"Could DNS or the security group be blocking it?", finding:"DNS succeeds and the security group already permits outbound HTTPS.", meaning:"Changing those controls won't repair the misrouted NAT gateway."})
    ])
  }),
  "resolver-blindspot-v1": Object.freeze({
    headline:"An investigator needs DNS history you don't have.",
    goal:"Create trustworthy future visibility without claiming missing historical queries can be recovered.",
    signal:"HISTORICAL DATA MISSING",
    references:Object.freeze([
      {label:"Resolver query logging setup",url:"https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-query-logging-configurations-managing.html"},
      {label:"VPC Flow Logs exclusions",url:"https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs-limitations.html"},
      {label:"Resolver query log fields and limits",url:"https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-query-logs.html"}
    ]),
    start:"Open the workbench",
    clues:Object.freeze([
      Object.freeze({probeId:"timeline", question:"When did logging begin?", finding:"The suspected activity happened before Resolver query logging was enabled.", meaning:"New logging can't recreate events from before it was turned on."}),
      Object.freeze({probeId:"flow", question:"Do zero flow records prove no DNS queries?", finding:"No. VPC Flow Logs exclude traffic to the Amazon-provided VPC DNS resolver.", meaning:"A missing Flow Log record cannot establish that no DNS requests occurred."}),
      Object.freeze({probeId:"process", question:"Can we identify the original process?", finding:"No host DNS/process telemetry was collected for that time window.", meaning:"You can improve future visibility, but the historical process-to-hostname link remains unconfirmed."})
    ])
  })
});

export function getMissionClues(id) {
  return MISSION_CLUES[id] ?? null;
}
