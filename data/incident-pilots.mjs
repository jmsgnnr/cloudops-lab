// Synthetic incident investigations only. This module contains NO facilitator answer keys.
export const INCIDENT_PROMPTS = Object.freeze([
  { key: "diagnosis", label: "01 / Diagnosis", hint: "What failed and what is the most likely root cause?" },
  { key: "evidence", label: "02 / Supporting evidence", hint: "Cite two concrete artifacts and identify any uncertainty." },
  { key: "fix", label: "03 / Safe action", hint: "What is the smallest reversible remediation or next diagnostic step?" },
  { key: "verify", label: "04 / Verification", hint: "What will you measure to show the fix worked?" },
  { key: "rollback", label: "05 / Rollback and preservation", hint: "How would you recover safely or preserve evidence?" }
]);

export const INCIDENTS = Object.freeze([
  {
    id: "iam-boundary-v1", number: "01", title: "Access denied. Policy says allowed.",
    domain: "IAM / AUTHORIZATION", duration: "15 MIN", version: "0.1",
    summary: "A reporting role is denied access to a file in S3.",
    impact: "A read-only reporting job cannot retrieve a CSV from S3. It assumes role ReportReader in account 111122223333. The job calls S3 over TLS. No resource policy grants access directly to the assumed-role session, and no STS session policy was supplied.",
    artifacts: [
      { label: "A / Request result", body: "Principal: arn:aws:sts::111122223333:assumed-role/ReportReader/job-42\nAction: s3:GetObject\nResource: arn:aws:s3:::cloudlabs-example-reports/2026/summary.csv\nOutcome: AccessDenied" },
      { label: "B / Identity permission", body: "Effect: Allow\nAction: s3:GetObject\nResource: arn:aws:s3:::cloudlabs-example-reports/2026/*" },
      { label: "C / Permissions boundary", body: "Effect: Allow\nAction: s3:ListBucket\nResource: arn:aws:s3:::cloudlabs-example-reports\nNo other Allow statements" },
      { label: "D / Context", body: "Bucket policy denies GetObject only when aws:SecureTransport is false.\nRequest: aws:SecureTransport=true.\nNo other applicable explicit deny identified in supplied evidence.\nOrganization guardrails permit the S3 action." }
    ],
    objective: "Diagnose the authorization decision. Propose the minimum change without deleting the boundary or widening bucket access. Explain why another identity-policy Allow alone is insufficient."
  },
  {
    id: "private-nat-v1", number: "02", title: "The subnet that lost HTTPS.",
    domain: "NETWORK / ROUTING", duration: "15 MIN", version: "0.1",
    summary: "A private subnet resolves DNS but outbound HTTPS times out.",
    impact: "Instances in application subnet 10.20.10.0/24 can resolve external hostnames but time out on outbound TCP 443. Intended egress uses a public NAT gateway and an attached internet gateway. The destination is a third-party HTTPS service.",
    artifacts: [
      { label: "A / App subnet routes", body: "10.20.0.0/16  -> local\n0.0.0.0/0     -> nat-0abc" },
      { label: "B / NAT and routes", body: "nat-0abc: public NAT gateway, Elastic IP assigned, state available\nSubnet: 10.20.1.0/24 (internet egress)\n10.20.0.0/16  -> local\n0.0.0.0/0     -> tgw-0central [recent change]\nInternet gateway igw-0edge is attached but not the NAT subnet default route." },
      { label: "C / Other diagnostics", body: "Application security group allows outbound TCP 443.\nRelevant NACLs permit outgoing and return ports.\nDNS resolution succeeds.\nA separate instance with authorized IGW egress reaches the same destination." }
    ],
    objective: "Identify the missing path and smallest reviewable fix. Trace the route you would verify, explain why resizing instances will not help, and assess the blast radius of a NAT subnet route change."
  },
  {
    id: "resolver-blindspot-v1", number: "03", title: "The DNS record that never existed.",
    domain: "SECURITY / TELEMETRY", duration: "15 MIN", version: "0.1",
    summary: "An investigator needs historical DNS evidence that was not collected.",
    impact: "An EC2 instance using the Amazon-provided VPC DNS resolver may have issued tunneling queries from 12:00 to 12:20 UTC. At 14:00 an analyst requests every queried hostname and the issuing process.",
    artifacts: [
      { label: "A / Coverage timeline", body: "VPC Flow Logs: enabled throughout the day on the instance ENI\nRoute 53 Resolver query logging: enabled at 13:00 UTC\nHistorical host DNS/process telemetry: not collected\nHistorical packet capture: not collected\nCloudTrail management events: enabled\nDetection lead: exists, but no complete hostname-to-process history" },
      { label: "B / Analyst observation", body: "Query: VPC Flow Logs for UDP/TCP 53 to the Amazon-provided resolver at 12:00-12:20\nResult: no matching flow records\nAnalyst conclusion: 'There were no DNS requests.'" }
    ],
    objective: "Evaluate the analyst's claim. Identify what cannot be recovered retrospectively, which future telemetry is appropriate, caching limitations, and a bounded triage or containment action that preserves evidence."
  }
]);

const MAX_RESPONSE_LENGTH = 4000;
export function buildIncidentSubmission(incident, responses, finishedAt = new Date().toISOString()) {
  if (!INCIDENTS.some(item => item.id === incident?.id)) throw new Error("Unknown incident");
  const normalized = {};
  for (const prompt of INCIDENT_PROMPTS) {
    const value = responses?.[prompt.key];
    if (typeof value !== "string" || !value.trim() || value.length > MAX_RESPONSE_LENGTH) {
      throw new Error("Complete each response using fewer than 4001 characters");
    }
    normalized[prompt.key] = value.trim();
  }
  return {
    format: "cloudlabs-incident-response",
    formatVersion: 1,
    incidentId: incident.id,
    contentVersion: incident.version,
    finishedAt,
    responses: normalized,
    grade: null,
    reviewMode: "facilitator-only"
  };
}
