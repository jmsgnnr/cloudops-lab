// Public, synthetic learning decisions. These are scenario demonstrations,
// not private premium solutions, real AWS commands, or a graded answer key.
export const INCIDENT_ACTIONS = Object.freeze({
  "iam-boundary-v1": Object.freeze({
    objective: "A reporting job receives AccessDenied even though an identity policy allows the object read.",
    hint: "Compare the allowed actions at each authorization layer. One Allow does not automatically override a restrictive permissions boundary.",
    choices: Object.freeze([
      Object.freeze({
        id: "add-identity",
        label: "Add another identity-policy Allow",
        type: "POLICY CHANGE",
        preview: "Try widening the identity policy that already permits the read.",
        result: "STILL DENIED",
        consequence: "The identity policy already permits s3:GetObject. A new identity Allow does not expand what the permissions boundary permits.",
        next: "Inspect the permissions boundary and request a reviewed, narrowly scoped change.",
        caution: "Additional identity permissions broaden the policy without solving this condition."
      }),
      Object.freeze({
        id: "remove-boundary",
        label: "Remove the permissions boundary",
        type: "HIGH-RISK CHANGE",
        preview: "Test the broadest possible workaround.",
        result: "UNSAFE CHANGE",
        consequence: "Removing the boundary changes the role's effective permissions for more actions and resources than the failing request requires. The exercise does not simulate a successful authorization from this shortcut.",
        next: "Restore the existing guardrail; review a specific GetObject exception instead.",
        caution: "Excessive scope and loss of a control. Never apply this from a synthetic lab."
      }),
      Object.freeze({
        id: "scope-boundary",
        label: "Propose a narrow boundary update",
        type: "CHANGE REQUEST",
        preview: "Model a controlled GetObject allowance in the boundary.",
        result: "PLAUSIBLE FIX",
        consequence: "A carefully reviewed boundary allowance for the required object read would address the missing permission layer, assuming other policy conditions remain as supplied.",
        next: "Verify effective authorization with the actual principal and resource, log approval, and retain rollback.",
        caution: "An approval process and full applicable policy evaluation are still necessary."
      })
    ])
  }),
  "private-nat-v1": Object.freeze({
    objective: "Private application instances resolve external DNS but TCP 443 requests time out.",
    hint: "Trace both default routes. The application's private subnet routes to a public NAT gateway, but that gateway's subnet must also have a working path to an internet gateway.",
    choices: Object.freeze([
      Object.freeze({
        id: "change-app-route",
        label: "Change the application subnet default route",
        type: "ROUTE CHANGE",
        preview: "Try changing the subnet that already points to the NAT gateway.",
        result: "PROBLEM REMAINS",
        consequence: "The private application's route already points at nat-0abc. Changing it doesn't repair the NAT subnet's outbound default route.",
        next: "Inspect the NAT gateway's associated subnet route table before proposing changes.",
        caution: "Changing the wrong subnet risks disrupting other application traffic."
      }),
      Object.freeze({
        id: "open-sg",
        label: "Open outbound HTTPS in the security group",
        type: "SECURITY CHANGE",
        preview: "Test whether relaxing an already-permitted egress rule helps.",
        result: "PROBLEM REMAINS",
        consequence: "The supplied security group already permits outbound TCP 443. This change has no modeled benefit and does not restore the default path.",
        next: "Use route and NAT telemetry to confirm the target egress path.",
        caution: "Unnecessary security changes add risk without fixing routing."
      }),
      Object.freeze({
        id: "restore-nat-egress",
        label: "Restore NAT subnet internet egress",
        type: "CHANGE REQUEST",
        preview: "Propose a reviewed correction to the NAT subnet's default route.",
        result: "PLAUSIBLE FIX",
        consequence: "Routing 0.0.0.0/0 from the public NAT gateway subnet to its attached IGW restores the intended external path in the supplied model.",
        next: "Verify return routing, external HTTPS reachability, NAT metrics, and all workloads sharing this NAT subnet.",
        caution: "Check blast radius, approval and rollback before a real route-table change."
      })
    ])
  }),
  "resolver-blindspot-v1": Object.freeze({
    objective: "An analyst wants historical DNS queries and their process attribution for a time window that predates adequate logging.",
    hint: "VPC Flow Logs exclude traffic to the Amazon-provided VPC DNS resolver. Logging enabled after the time window cannot recreate missing historical queries.",
    choices: Object.freeze([
      Object.freeze({
        id: "declare-no-dns",
        label: "Conclude no DNS requests occurred",
        type: "INVESTIGATION DECISION",
        preview: "Treat zero matching VPC Flow Log records as proof of no DNS.",
        result: "UNSUPPORTED CLAIM",
        consequence: "Zero matching flow records cannot establish absence of requests to the Amazon-provided resolver because this traffic is excluded from VPC Flow Logs.",
        next: "Record the collection limitation and avoid presenting missing data as a negative finding.",
        caution: "False certainty can invalidate the investigation."
      }),
      Object.freeze({
        id: "recreate-logs",
        label: "Backfill the old time window",
        type: "TELEMETRY CHANGE",
        preview: "Test whether enabling DNS logging later recovers past queries.",
        result: "HISTORY UNAVAILABLE",
        consequence: "A logging configuration that starts after the window cannot reconstruct uncaptured DNS events or the originating process history.",
        next: "Define future collection requirements while preserving the sources that still exist.",
        caution: "Do not represent future log coverage as retrospective evidence."
      }),
      Object.freeze({
        id: "preserve-and-instrument",
        label: "Preserve evidence and improve coverage",
        type: "INVESTIGATION PLAN",
        preview: "Identify defensible facts and collect better signals going forward.",
        result: "DEFENSIBLE NEXT STEP",
        consequence: "The provided historical hostname-to-process mapping remains unknown. A reviewable plan preserves available data and proposes future Resolver query logging and host attribution.",
        next: "Document blind spots, scope authorized containment, set retention, and validate future collection and caching limitations.",
        caution: "Future telemetry still does not prove what happened during the missing window."
      })
    ])
  })
});

export function getIncidentActions(incidentId) {
  return INCIDENT_ACTIONS[incidentId] ?? null;
}

export function describeIncidentAction(incidentId, actionId) {
  const mission = getIncidentActions(incidentId);
  return mission?.choices.find(choice => choice.id === actionId) ?? null;
}
