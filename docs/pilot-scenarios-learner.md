# CloudLabs / three practical incident pilots

Status: LOCAL DRAFT, not published, not a hosted AWS lab, not an official AWS exam.
Prepared October 17, 2026. All evidence below is synthetic. No live credentials or resources are required.

## Instructions to learner

You are the on-call engineer. For each incident, write: (1) the most likely root cause; (2) two concrete pieces of evidence supporting it; (3) the smallest safe fix or next diagnostic action; (4) how you would verify success; (5) a rollback or containment consideration. Do not assume the evidence proves more than it does. You may state uncertainty and request one additional artifact. Suggested time: 15 minutes per incident.

### Incident 01: AccessDenied with a boundary

Impact: A read-only reporting job fails retrieving a CSV from an S3 bucket. The same-account IAM role is ReportReader in account 111122223333. The job accesses S3 over TLS. No resource policy grants access directly to an assumed-role session. No STS session policy was supplied.

Artifact A / request:
- Principal: arn:aws:sts::111122223333:assumed-role/ReportReader/job-42
- Action: s3:GetObject
- Resource: arn:aws:s3:::cloudlabs-example-reports/2026/summary.csv
- Outcome: AccessDenied

Artifact B / identity permission attached to ReportReader:
- Effect Allow; Action s3:GetObject; Resource arn:aws:s3:::cloudlabs-example-reports/2026/*

Artifact C / permissions boundary attached to ReportReader:
- Effect Allow; Action s3:ListBucket; Resource arn:aws:s3:::cloudlabs-example-reports
- No other Allow statements

Artifact D / other context:
- Bucket policy denies GetObject only when aws:SecureTransport is false.
- Request context has aws:SecureTransport=true.
- No other applicable explicit deny was found in the supplied evidence.
- Applicable organization guardrails permit the requested S3 action.

Learner task: Identify the effective-deny mechanism and propose the minimum permission change without removing the boundary or broadening bucket access. Explain why adding another identity-policy Allow alone will not fix the problem.

### Incident 02: A private subnet loses outbound HTTPS

Impact: Hosts in application subnet 10.20.10.0/24 resolve public DNS names but time out on outbound TCP 443. The intended design uses a public NAT gateway and an attached internet gateway. No VPC endpoint is configured for this third-party HTTPS destination.

Artifact A / routes associated with application subnet:
- 10.20.0.0/16 -> local
- 0.0.0.0/0 -> nat-0abc

Artifact B / NAT configuration and associated subnet routes:
- nat-0abc: connectivity type public; allocated Elastic IP; state available.
- NAT resides in 10.20.1.0/24, designated as the internet-egress subnet.
- 10.20.0.0/16 -> local
- 0.0.0.0/0 -> tgw-0central [recent routing change]
- Internet gateway igw-0edge is attached to this VPC but has no default route from the NAT subnet.

Artifact C / packet and policy evidence:
- Application security group allows outbound TCP 443.
- Relevant network ACLs permit the request and return ports.
- DNS resolution succeeds for the target.
- A second instance with a direct authorized internet gateway path reaches the same destination.

Learner task: Identify the missing path and propose a least-disruptive, reviewable fix. Specify the path to verify, why increasing instance capacity will not help, and what workloads might be affected by a NAT-subnet routing change.

### Incident 03: The DNS data that does not exist

Impact: An EC2 workload using the Amazon-provided VPC DNS resolver may have issued tunneling queries between 12:00 and 12:20 UTC. At 14:00 an analyst is asked for every queried hostname and its issuing process.

Artifact A / collection status:
- VPC Flow Logs existed for the instance network interface throughout the day.
- Route 53 Resolver query logging was first enabled for the VPC at 13:00 UTC.
- No historic host DNS client/process telemetry or packet capture exists for 12:00–12:20.
- CloudTrail management events were enabled.
- A detection service raised an investigation lead, but it did not retain a complete hostname-by-process history.

Artifact B / observation:
- Querying VPC Flow Logs for UDP/TCP 53 to the Amazon-provided DNS resolver during 12:00–12:20 returns no matching records.
- The analyst claims, 'No matching Flow Log records proves there were no DNS requests.'

Learner task: Evaluate that claim; explain which evidence cannot be reconstructed retrospectively; name the right telemetry to capture for future events, including the resolver-cache limitation; and propose a bounded containment/triage step that does not erase evidence.

## Test procedure

Recruit ten target learners, ideally support, systems, DevOps or cloud security engineers who troubleshoot AWS in practice. Have each complete one incident unaided, then give a short debrief. Record role, prior familiarity, completion time, correctness by rubric, number of hints, confusion, whether the debrief changed a decision, and voluntary return for a second scenario. Ask which learning tool they recently paid for and whether they would pay for this specific experience. Record the $10/month or $100/year offer accurately; interest is not revenue. Do not collect payment or personal AWS artifacts before separate authorization.

## Primary documentation for review

- IAM evaluation: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic_policy-eval-denyallow.html
- IAM boundaries: https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html
- NAT routing: https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-scenarios.html
- VPC Flow Logs exclusions: https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs-limitations.html
- Resolver query logging and cache caveat: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-query-logs.html

All scenarios require independent technical review before learner use. No claims of official exam parity or real AWS execution.
