export const TRACKS = {
  practitioner: {
    name: "Cloud Practitioner", code: "CLF-C02", level: "Foundational", minutesPerQuestion: 1.5,
    description: "Cloud concepts, core services, security and cost awareness.",
    guide: "https://docs.aws.amazon.com/aws-certification/latest/cloud-practitioner-02/cloud-practitioner-02.html",
    domains: [
      { id: "Cloud Concepts", weight: 24, note: "Cloud value, resilience, global infrastructure and well-architected basics" },
      { id: "Security and Compliance", weight: 30, note: "Shared responsibility, access, compliance and governance" },
      { id: "Cloud Technology and Services", weight: 34, note: "Compute, storage, networking, databases and operations" },
      { id: "Billing, Pricing and Support", weight: 12, note: "Pricing models, budgets, support and cost tools" }
    ]
  },
  security: {
    name: "Security Specialty", code: "SCS-C03", level: "Specialty", minutesPerQuestion: 2.5,
    description: "Detection, response, IAM, infrastructure protection, data and governance.",
    guide: "https://docs.aws.amazon.com/aws-certification/latest/security-specialty-03/security-specialty-03.html",
    domains: [
      { id: "Detection", weight: 16, note: "Organization-wide events, threats and alerting" },
      { id: "Incident Response", weight: 14, note: "Containment, investigation and recovery" },
      { id: "Infrastructure Security", weight: 18, note: "Network and compute security controls" },
      { id: "Identity and Access Management", weight: 20, note: "Federation, evaluation and authorization" },
      { id: "Data Protection", weight: 18, note: "Encryption, keys, secrets and storage" },
      { id: "Security Foundations and Governance", weight: 14, note: "Policy, organizations, compliance and controls" }
    ]
  },
  networking: {
    name: "Advanced Networking Specialty", code: "ANS-C01", level: "Specialty", minutesPerQuestion: 2.5,
    description: "AWS and hybrid network architecture, routing, operations and security.",
    guide: "https://docs.aws.amazon.com/aws-certification/latest/advanced-networking-specialty-01/advanced-networking-specialty-01.html",
    retirement: "2026-12-31",
    domains: [
      { id: "Network Design", weight: 30, note: "Connectivity patterns, hybrid DNS, edge and resilient design" },
      { id: "Network Implementation", weight: 26, note: "Implement connectivity, routing and traffic services" },
      { id: "Network Management and Operation", weight: 20, note: "Troubleshooting, monitoring, performance and cost" },
      { id: "Network Security, Compliance and Governance", weight: 24, note: "Network isolation, inspection, controls and visibility" }
    ]
  },
  architecture: {
    name: "Solutions Architect Professional", code: "SAP-C02", level: "Professional", minutesPerQuestion: 3,
    description: "Advanced organizations, resilient designs, optimization and enterprise migrations. Original short challenge assessment, not an official exam.",
    guide: "https://docs.aws.amazon.com/aws-certification/latest/solutions-architect-professional-02/solutions-architect-professional-02.html",
    preview: true,
    domains: [
      { id: "Organizational Complexity", weight: 26, note: "Multi-account governance, network segmentation and enterprise controls" },
      { id: "New Solutions", weight: 29, note: "Distributed systems, hybrid access, RPO and architecture tradeoffs" },
      { id: "Continuous Improvement", weight: 25, note: "Optimization, observability, reliability and modernization" },
      { id: "Migration and Modernization", weight: 20, note: "Cutover planning, change capture and hybrid connectivity" }
    ]
  },
  devops: {
    name: "DevOps Engineer Professional", code: "DOP-C02", level: "Professional", minutesPerQuestion: 3,
    description: "Advanced delivery, IaC, resilience, observability and secure operations. Original short challenge assessment, not an official exam.",
    guide: "https://docs.aws.amazon.com/aws-certification/latest/devops-engineer-professional-02/devops-engineer-professional-02.html",
    preview: true,
    domains: [
      { id: "SDLC Automation", weight: 22, note: "Artifacts, change safety, delivery pipelines and deployment controls" },
      { id: "Configuration and IaC", weight: 17, note: "State, drift and infrastructure changes" },
      { id: "Resilient Solutions", weight: 15, note: "At-least-once delivery and recovery" },
      { id: "Monitoring and Logging", weight: 15, note: "Tracing, metrics, service-level impact" },
      { id: "Incident and Event Response", weight: 14, note: "Safe, bounded operational response" },
      { id: "Security and Compliance", weight: 17, note: "Supply-chain integrity and deployment least privilege" }
    ]
  },
  fieldsecurity: {
    name: "Security Engineering Field Exam", code: "FIELD-SEC", level: "Independent", minutesPerQuestion: 3,
    description: "Independent real-world security triage, forensics, IAM and network troubleshooting; not an AWS certification.",
    guide: "https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/welcome.html",
    preview: true, independent: true,
    domains: [
      { id: "Detection and Triage", weight: 25, note: "Distinguish risk from observed evidence" },
      { id: "Containment and Evidence", weight: 25, note: "Respond without destroying forensic artifacts" },
      { id: "Identity and Key Control", weight: 25, note: "Cross-account authorization and guardrails" },
      { id: "Network and Data Defense", weight: 25, note: "Packet routing, inspection and KMS access" }
    ]
  }
};
export const trackEntries = Object.entries(TRACKS);
