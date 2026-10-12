export const LESSONS = {
  practitioner: {
    "Cloud Concepts": {
      summary: "The cloud replaces fixed capacity planning with on-demand consumption, elasticity and a global footprint.",
      concepts: ["Regions vs Availability Zones vs edge locations", "Elasticity, scalability and the six Well-Architected pillars", "High availability, fault isolation and disaster recovery basics"],
      example: "For a spiky retail website, adding capacity with traffic and scaling it back afterward avoids sizing for the annual peak."
    },
    "Security and Compliance": {
      summary: "AWS manages security OF the cloud; customers manage their data, identity, configuration and supported workloads IN the cloud.",
      concepts: ["Shared responsibility differs for EC2, RDS and Lambda", "IAM least privilege and MFA", "CloudTrail, AWS Artifact and security services"],
      example: "AWS maintains EC2 hypervisors; an EC2 customer patches their own guest operating system."
    },
    "Cloud Technology and Services": {
      summary: "Choose the right service based on the operational responsibility, data model and network requirements.",
      concepts: ["EC2, Lambda and containers", "S3, EBS and EFS; RDS vs DynamoDB", "VPC, Route 53, CloudFront and load balancing"],
      example: "A file archive fits S3 object storage better than a relational database."
    },
    "Billing, Pricing and Support": {
      summary: "Pricing and operational support are part of architecture decisions, not an afterthought.",
      concepts: ["On-Demand vs Reserved Instances vs Savings Plans", "AWS Budgets, Cost Explorer and Pricing Calculator", "Cost allocation tags and AWS Support"],
      example: "A new unpredictable service might start On-Demand before choosing a commitment model."
    }
  },
  security: {
    "Detection": {
      summary: "Collect useful events across accounts and turn meaningful signals into actionable alerts.",
      concepts: ["Organization trails and centralized CloudTrail visibility", "GuardDuty, Security Hub and EventBridge findings", "CloudWatch, AWS Config and detection coverage"],
      example: "Route GuardDuty findings through EventBridge to automated triage and human notifications."
    },
    "Incident Response": {
      summary: "Contain first, preserve evidence, identify impact, then recover with a documented process.",
      concepts: ["IAM credential containment", "Evidence retention with CloudTrail and EBS snapshots", "Isolation, runbooks and post-incident improvements"],
      example: "On suspect EC2 compromise, limit exposure and capture needed artifacts before rebuild."
    },
    "Infrastructure Security": {
      summary: "Use multiple AWS native controls to limit exposure and harden compute and network paths.",
      concepts: ["Security groups, NACLs, AWS WAF and Network Firewall", "VPC endpoints and private workloads", "Instance, container and edge protection"],
      example: "Put a database in private subnets and allow its port only from application security groups."
    },
    "Identity and Access Management": {
      summary: "Authentication establishes identity; authorization determines each permitted AWS operation.",
      concepts: ["IAM policy evaluation and explicit deny", "IAM Identity Center, STS and external ID", "SCPs, permission boundaries and cross-account roles"],
      example: "An allow statement cannot override a matching explicit deny in an applicable policy."
    },
    "Data Protection": {
      summary: "Match encryption and key-management controls to data classification and operational risks.",
      concepts: ["SSE-KMS and KMS key policies", "TLS certificate validation", "Secrets Manager rotation and key access"],
      example: "Protect a sensitive S3 object with SSE-KMS and tightly scoped key permissions."
    },
    "Security Foundations and Governance": {
      summary: "Keep accounts, deployment policies and compliance evidence consistent as environments grow.",
      concepts: ["AWS Organizations policies and preventive guardrails", "AWS Config evaluations and conformance", "AWS Audit Manager and evidence gathering"],
      example: "Apply service restrictions to organizational units, then track compliance centrally."
    }
  },
  networking: {
    "Network Design": {
      summary: "Choose network topologies and DNS models around requirements for scale, resiliency and latency.",
      concepts: ["Transit Gateway vs peering", "Private hybrid DNS with Resolver endpoints", "Direct Connect, Global Accelerator and edge choices"],
      example: "Use Transit Gateway when many VPCs need shared transitive routing."
    },
    "Network Implementation": {
      summary: "Each AWS connectivity pattern has specific route table, attachment and endpoint requirements.",
      concepts: ["Transit Gateway associations and propagation", "BGP VPN and Direct Connect virtual interfaces", "NAT gateways and VPC endpoints"],
      example: "A NAT gateway needs a public subnet path to an internet gateway, while private subnet routes point to NAT."
    },
    "Network Management and Operation": {
      summary: "Troubleshoot by following the flow from DNS and routing through filtering and service reachability.",
      concepts: ["VPC Reachability Analyzer and Network Access Analyzer", "Flow Logs and Resolver query logs", "BGP/session status, health and cost-aware traffic paths"],
      example: "When a flow fails, inspect route tables, security groups, NACLs and endpoint policy before guessing."
    },
    "Network Security, Compliance and Governance": {
      summary: "Separate access boundaries, traffic inspection and centralized governance into clear layers.",
      concepts: ["Stateful security groups vs stateless NACLs", "AWS Network Firewall and AWS Firewall Manager", "Private networking, access analysis and segmented routing"],
      example: "A shared inspection VPC needs intentional route steering both to and from an inspection point."
    }
  }
};
