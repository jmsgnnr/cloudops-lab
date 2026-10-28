/**
 * IAM Boundary Incident — deterministic, offline teaching model (v1).
 * This is not AWS IAM evaluation. SCPs, resource policies, explicit denies,
 * conditions and other AWS layers are outside this narrow synthetic scenario.
 */
export const IAM_MISSION_VERSION = 1;
export const IAM_ACTIONS = Object.freeze([
  { id: "SCOPED_BOUNDARY", label: "Allow only the report object", detail: "Add s3:GetObject on the required report object to the boundary." },
  { id: "WILDCARD_BOUNDARY", label: "Allow all S3 objects (unsafe)", detail: "A risky shortcut that permits far more than this job needs." },
  { id: "REMOVE_ROLE_ALLOW", label: "Remove the role's GetObject Allow", detail: "Change the identity policy; could make the outage worse." },
  { id: "RESTORE_ROLE_ALLOW", label: "Restore the role's scoped Allow", detail: "Return the identity policy to its original scoped permission." }
]);
export const IAM_INSPECTIONS = Object.freeze([
  { id: "ERROR", label: "Read the job's latest error", detail: "Open the synthetic failed S3 request." },
  { id: "IDENTITY", label: "Inspect the role policy", detail: "See which object read the role explicitly allows." },
  { id: "BOUNDARY", label: "Inspect the permissions boundary", detail: "Find out what maximum permissions the boundary allows." }
]);
const REPORT = "arn:aws:s3:::example-reporting/daily/report.csv";

function assertState(state) {
  if (!state || state.version !== IAM_MISSION_VERSION ||
      typeof state.identityAllow !== "boolean" ||
      !["missing", "scoped", "wildcard"].includes(state.boundary) ||
      !Array.isArray(state.history) || !Array.isArray(state.journal) ||
      !Array.isArray(state.inspections) || !Number.isSafeInteger(state.sequence)) {
    throw new Error("invalid_iam_mission_state");
  }
}
function withEvent(state, kind, description, details = {}) {
  const sequence = state.sequence + 1;
  return { ...state, ...details, sequence,
    journal: [...state.journal, { sequence, kind, description }] };
}
export function newIamMission() {
  return { version: IAM_MISSION_VERSION, identityAllow: true, boundary: "missing",
    inspections: [], history: [], journal: [], sequence: 0, lastTest: null, finding: null };
}
export function inspectIamMission(state, id) {
  assertState(state);
  if (!IAM_INSPECTIONS.some(item => item.id === id)) throw new Error("invalid_iam_inspection");
  const finding = id === "ERROR"
    ? "Reporting task failed: s3:GetObject returned AccessDenied for the daily report. No policy cause is shown in the job log."
    : id === "IDENTITY"
      ? (state.identityAllow
          ? "Identity policy: Allow s3:GetObject for " + REPORT + "."
          : "Identity policy: no matching Allow for s3:GetObject on the report.")
      : state.boundary === "missing"
        ? "Permissions boundary: no matching Allow for s3:GetObject on this report."
        : state.boundary === "scoped"
          ? "Permissions boundary: Allow s3:GetObject only on " + REPORT + "."
          : "Permissions boundary: broad S3 object read permissions (unnecessarily wide).";
  return withEvent(state, "inspect", "Inspected " + id.toLowerCase(), {
    inspections: [...new Set([...state.inspections, id])], finding
  });
}
export function changeIamMission(state, action) {
  assertState(state);
  if (!IAM_ACTIONS.some(item => item.id === action)) throw new Error("invalid_iam_action");
  const next = { identityAllow: state.identityAllow, boundary: state.boundary };
  if (action === "SCOPED_BOUNDARY") next.boundary = "scoped";
  if (action === "WILDCARD_BOUNDARY") next.boundary = "wildcard";
  if (action === "REMOVE_ROLE_ALLOW") next.identityAllow = false;
  if (action === "RESTORE_ROLE_ALLOW") next.identityAllow = true;
  const changed = next.boundary !== state.boundary || next.identityAllow !== state.identityAllow;
  if (!changed) return withEvent(state, "noop", "No configuration change: " + action, {
    finding: "That setting was already in place. Your last test is still valid."
  });
  return withEvent(state, "change", "Applied " + action + " (virtual only)", {
    ...next, history: [...state.history, {
      identityAllow: state.identityAllow, boundary: state.boundary, action
    }], lastTest: null, finding: "Configuration changed. Run the synthetic S3 read test to see the consequence."
  });
}
export function undoIamMission(state) {
  assertState(state);
  if (!state.history.length) return withEvent(state, "noop", "Nothing to undo", {
    finding: "No configuration change to undo."
  });
  const previous = state.history[state.history.length - 1];
  return withEvent(state, "undo", "Undid " + previous.action + " (virtual only)", {
    identityAllow: previous.identityAllow, boundary: previous.boundary,
    history: state.history.slice(0, -1), lastTest: null,
    finding: "Last configuration change reversed. Retest to verify the current state."
  });
}
export function testIamMission(state) {
  assertState(state);
  const serviceOk = state.identityAllow && state.boundary !== "missing";
  const risk = state.boundary === "wildcard";
  const healthy = serviceOk && !risk;
  const result = {
    status: healthy ? "MISSION RESTORED SAFELY" : serviceOk ? "ACCESS RESTORED · UNSAFE" : "ACCESS DENIED",
    healthy, serviceOk, risk,
    explanation: !serviceOk
      ? "The synthetic S3 read is still denied. Inspect the identity policy and the boundary, then change the smallest missing permission."
      : risk
        ? "The read works, but the boundary now grants unnecessarily broad access. Undo the shortcut and use only the required object permission."
        : "The scoped identity Allow and scoped permissions-boundary Allow overlap for this request. The report job is restored without widening the modeled boundary. Other AWS policy layers are not simulated.",
    evidence: "SYNTHETIC s3:GetObject " + (serviceOk ? "200 OK" : "AccessDenied") +
      "; boundary scope: " + state.boundary + "; policy risk: " + (risk ? "HIGH" : "NONE IN MODEL")
  };
  const updated = withEvent(state, "test",
    "S3 read test: " + result.status, { lastTest: result, finding: result.evidence });
  return { state: updated, result };
}
