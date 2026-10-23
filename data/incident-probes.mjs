// Safe, deterministic investigation actions. All outputs are synthetic and local-only.
// These are observations for a learner to interpret, not graded answers or facilitator keys.
export const INCIDENT_PROBES = Object.freeze({
  "iam-boundary-v1": Object.freeze([
    {
      id: "request",
      label: "01 / Inspect failed request",
      query: "EVENT LOOKUP / s3:GetObject",
      output: "Principal: arn:aws:sts::111122223333:assumed-role/ReportReader/job-42\nTarget: cloudlabs-example-reports/2026/summary.csv\nTransport: TLS (aws:SecureTransport=true)\nResponse: AccessDenied",
      prompt: "Which facts identify the action, resource and request context?"
    },
    {
      id: "identity",
      label: "02 / Inspect identity permissions",
      query: "IAM POLICY VIEW / ReportReader",
      output: "Effect: Allow\nAction: s3:GetObject\nResource: arn:aws:s3:::cloudlabs-example-reports/2026/*\nPolicy source: role identity permissions",
      prompt: "What does this statement permit, and what other policy layers affect the request?"
    },
    {
      id: "boundary",
      label: "03 / Inspect role guardrails",
      query: "PERMISSIONS BOUNDARY / ReportReader",
      output: "Allowed action set in attached boundary:\n  s3:ListBucket on arn:aws:s3:::cloudlabs-example-reports\nNo other Allow entries.\nOrganization: action permitted by supplied guardrails.",
      prompt: "Compare the effective permissions against the requested operation."
    }
  ]),
  "private-nat-v1": Object.freeze([
    {
      id: "application",
      label: "01 / Trace application subnet",
      query: "ROUTE LOOKUP / 10.20.10.0/24",
      output: "Destination: 0.0.0.0/0\nNext hop: nat-0abc\nInstance security group: egress TCP 443 permitted\nObserved external HTTPS: timeout",
      prompt: "What is the intended first hop for traffic leaving the application subnet?"
    },
    {
      id: "gateway",
      label: "02 / Inspect NAT egress route",
      query: "ROUTE LOOKUP / NAT subnet 10.20.1.0/24",
      output: "nat-0abc: AVAILABLE, public NAT gateway, EIP attached\nDestination 0.0.0.0/0 -> tgw-0central\nRoute changed recently\nAttached IGW: igw-0edge",
      prompt: "Where does the NAT subnet send outbound packets next?"
    },
    {
      id: "controls",
      label: "03 / Check adjacent controls",
      query: "CONNECTIVITY DIAGNOSTICS / synthetic",
      output: "DNS lookup: succeeds\nApplication SG: outbound TCP 443 permitted\nNACL: outbound and return traffic permitted\nAlternate instance with authorized IGW egress: HTTPS succeeds",
      prompt: "Which possible explanations can you narrow down without changing production?"
    }
  ]),
  "resolver-blindspot-v1": Object.freeze([
    {
      id: "timeline",
      label: "01 / Inspect telemetry timeline",
      query: "COLLECTION INVENTORY / 12:00-14:00 UTC",
      output: "12:00-12:20  Suspected queries\n13:00        Resolver query logging enabled\n14:00        Investigator requested hostname and process history\nHost DNS/process telemetry: never enabled for this window",
      prompt: "Which sources existed at the time of the suspected activity?"
    },
    {
      id: "flow",
      label: "02 / Query VPC flow evidence",
      query: "FLOW LOG FILTER / DNS to Amazon-provided resolver",
      output: "Target: Amazon-provided VPC DNS resolver\nTime: 12:00-12:20 UTC\nMatching UDP/TCP 53 records: 0\nCollection limitation: traffic to the Amazon-provided DNS resolver is not captured by VPC Flow Logs",
      prompt: "Does the missing flow record establish that no DNS request occurred?"
    },
    {
      id: "process",
      label: "03 / Inspect host attribution",
      query: "HOST TELEMETRY LOOKUP / instance",
      output: "Historical DNS query-to-process records: unavailable\nHistorical packet capture: unavailable\nCloudTrail management events: enabled\nHostname-to-process association for 12:00-12:20: unconfirmed",
      prompt: "Distinguish what can be established now from what needs future collection."
    }
  ])
});

export function getIncidentProbes(incidentId) {
  return INCIDENT_PROBES[incidentId] ?? [];
}
