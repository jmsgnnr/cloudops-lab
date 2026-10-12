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
  }
};
export const trackEntries = Object.entries(TRACKS);
