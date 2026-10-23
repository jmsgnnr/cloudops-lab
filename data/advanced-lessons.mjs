// Independent study notes: these are not official AWS training materials.
export const ADVANCED_LESSONS = {
  architecture: {
    "Organizational Complexity": {
      summary: "Enterprise architecture balances multi-account policy, identity boundaries and network governance.",
      concepts: ["Organization-level limits versus per-role permissions", "Overlapping CIDRs and network translation", "Cross-account governance through AWS RAM and transit gateway"],
      example: "An acquisition introduces conflicting networks; route propagation alone cannot fix overlapping address ranges."
    },
    "New Solutions": {
      summary: "Service selection starts with failure modes, workload consistency and measurable recovery requirements.",
      concepts: ["Hybrid DNS inbound and outbound forwarding", "Durable buffering and idempotency", "Multi-Region RPO and cross-Region asynchronous replication"],
      example: "A global database replica can lag during an unexpected regional disaster."
    },
    "Continuous Improvement": {
      summary: "Optimize a deployed system based on traced bottlenecks, architecture risks and avoidable network cost.",
      concepts: ["Gateway endpoints and NAT data processing", "Tail latency and distributed traces", "Stateless applications and shared session state"],
      example: "A private subnet can use an S3 gateway endpoint instead of sending eligible traffic through NAT."
    },
    "Migration and Modernization": {
      summary: "Migration is a staged consistency and cutover problem, not only a one-time copy operation.",
      concepts: ["Initial load plus change data capture", "Direct Connect gateway and transit VIF", "Replication lag, rollback and cutover rehearsals"],
      example: "Continuous replication narrows the final gap, but acceptance still needs validation and rollback."
    }
  },
  devops: {
    "SDLC Automation": {
      summary: "Safer delivery favors repeatable artifacts, narrow credentials and measurable rollback triggers.",
      concepts: ["Blue/green deployment and alarms", "Immutable image digests", "OIDC federation and scoped deployment roles"],
      example: "Promote the tested image digest instead of rebuilding or pulling a mutable tag in production."
    },
    "Configuration and IaC": {
      summary: "Infrastructure declarations must be reconciled with actual state using controlled workflows.",
      concepts: ["Drift detection and remediation review", "Remote state with locking", "Serialized change windows and approvals"],
      example: "Two simultaneous Terraform applies against the same state can produce conflicting assumptions."
    },
    "Resilient Solutions": {
      summary: "Resilience is created through safe retries, idempotency and tested failure recovery.",
      concepts: ["At-least-once delivery", "Idempotent business operations", "RDS failover and connection retry handling"],
      example: "Message duplication must not result in a duplicate payment, even after a worker restart."
    },
    "Monitoring and Logging": {
      summary: "Use service-level signals tied to customer impact and trace causality across boundaries.",
      concepts: ["Trace correlation", "Latency percentiles and error budgets", "Saturation, errors and rollout alarms"],
      example: "P99 latency can worsen while CPU averages remain normal."
    },
    "Incident and Event Response": {
      summary: "Operational automations need guardrails so remediation cannot become the outage.",
      concepts: ["Event deduplication", "Bounded retries", "Safety preconditions and manual override"],
      example: "Duplicate events must not cause repeated restarts of a healthy fleet."
    },
    "Security and Compliance": {
      summary: "Supply-chain integrity and least-privilege deployment form a continuous security boundary.",
      concepts: ["Narrow STS session scopes", "Signed artifact provenance", "Trusted issuers and revision attestation"],
      example: "A familiar filename does not prove an artifact came from the expected pipeline."
    }
  },
  fieldsecurity: {
    "Detection and Triage": {
      summary: "Separate an observed event from an inferred risk; validate raw AWS telemetry before re-scoring.",
      concepts: ["Management events versus S3 data events", "GuardDuty versus Inspector", "Evidence-backed vulnerability prioritization"],
      example: "A host lacking a public IP is not proof that a critical vulnerability is unreachable."
    },
    "Containment and Evidence": {
      summary: "Contain an incident without accidentally destroying the most important evidence.",
      concepts: ["STS session revocation", "Memory versus EBS forensics", "Disable invocation paths without deleting artifacts"],
      example: "A disk snapshot does not preserve running process memory."
    },
    "Identity and Key Control": {
      summary: "Cross-account authorizations depend on both identity and resource-side trust boundaries.",
      concepts: ["KMS key and identity policies", "External ID and confused-deputy controls", "SCP denies versus IAM allows"],
      example: "Granting kms:Decrypt in an identity policy is insufficient if the key owner does not authorize use."
    },
    "Network and Data Defense": {
      summary: "Observe actual packet paths and access requirements rather than inferring application success.",
      concepts: ["Meaning and limits of Flow Log ACCEPT", "Symmetric stateful inspection through TGW", "SSE-KMS authorization"],
      example: "A VPC Flow Log ACCEPT record cannot establish that the backend sent HTTP 200."
    }
  }
};
