/**
 * DNS Evidence Timeline: deterministic, offline teaching model (v1).
 * This is NOT a DNS or Route 53 simulator and sends no DNS queries. It models
 * one investigation question: what can honestly be said about suspected DNS
 * activity from 12:00 to 12:20 UTC when collection started later? Resource
 * facts (windows, enablement time, sources) come from the existing
 * resolver-blindspot-v1 case. Three workbench additions are labeled synthetic:
 * a CloudTrail management-event note that corroborates the 13:00 start, an
 * OS/application cache note, and the 14:30 later event used to show what
 * future telemetry covers. Old history is never recovered: configuration only
 * ever changes the later event.
 */
export const DNS_MISSION_VERSION = 1;
export const DNS_WINDOW = Object.freeze({ from: "12:00", to: "12:20", enabled: "13:00", requested: "14:00" });
export const DNS_AXIS = Object.freeze({ from: "11:30", to: "14:30" });
export const DNS_LATER_EVENT = Object.freeze({
  label: "14:30-14:40 UTC", lookups: 8, distinctNames: 4, suffix: "tunnel-sink.example", queryType: "TXT",
  /** Assumed record TTL in seconds and each lookup's offset from 14:30:00 (name index 0-3). Teaching assumptions, not measurements. */
  ttl: 60,
  schedule: Object.freeze([[0, 0], [1, 5], [2, 10], [3, 15], [0, 30], [1, 40], [2, 90], [3, 120]].map(([name, at]) => Object.freeze({ name, at })))
});
export const DNS_REFERENCES = Object.freeze([
  { label: "Resolver query logging", url: "https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-query-logs.html" },
  { label: "Resolver query log values", url: "https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-query-logs-format.html" },
  { label: "VPC Flow Logs limitations", url: "https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs.html#flow-logs-limitations" },
  { label: "What CloudTrail records", url: "https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-concepts.html#cloudtrail-concepts-events" }
]);

/* ---------- public case data: no hidden answer keys ---------- */
export const DNS_EVIDENCE = Object.freeze([
  { id: "FLOW_ZERO", source: "VPC Flow Logs", kind: "absence", window: ["12:00", "12:20"],
    label: "Flow Logs: UDP/TCP 53 to the Amazon-provided resolver",
    reading: "0 matching flow records for 12:00-12:20. Flow Logs were enabled on the instance ENI for the whole day.",
    checks: [{ by: ["FLOW_SCOPE"], status: "discounted", note: "Expected, not informative: VPC Flow Logs do not capture traffic to the Amazon-provided DNS server, so zero records says nothing about DNS queries." }] },
  { id: "ANALYST", source: "Analyst conclusion", kind: "claim", window: ["12:00", "12:20"],
    label: "Analyst: \"There were no DNS requests.\"",
    reading: "Basis given: the flow log query above returned no records.",
    checks: [
      { by: ["FLOW_SCOPE"], status: "discounted", note: "The basis is a source that cannot see this traffic, so the conclusion is not supported by it." },
      { by: ["RESOLVER_START"], status: "discounted", note: "Resolver query logging was not collecting during the window, so it cannot back this conclusion either." }
    ] },
  { id: "RESOLVER_ROWS", source: "Resolver query logs", kind: "absence", window: ["12:00", "12:20"],
    label: "Resolver query log search for the suspected window",
    reading: "0 records for 12:00-12:20.",
    checks: [{ by: ["RESOLVER_START"], status: "discounted", note: "Collection began at 13:00 UTC, so an empty result here is a gap in collection, not an absence of queries." }] },
  { id: "RESOLVER_START", source: "Resolver query logging config", kind: "coverage", window: ["13:00", "14:30"],
    label: "When did query logging start collecting?",
    reading: "Query logging for this VPC was enabled at 13:00 UTC. Nothing earlier was collected, and enabling it does not backfill.",
    checks: [{ by: ["CLOUDTRAIL"], status: "corroborated", note: "Synthetic CloudTrail management events show the configuration being created and associated about 13:00 UTC." }] },
  { id: "CLOUDTRAIL", source: "CloudTrail management events", kind: "scope", window: ["13:00", "13:00"],
    label: "CloudTrail management events around 13:00",
    reading: "Management events record API calls, such as associating a query logging configuration with the VPC at about 13:00 UTC. They do not record DNS lookups made by the instance.",
    checks: [] },
  { id: "FLOW_SCOPE", source: "AWS documentation", kind: "scope", window: null,
    label: "What traffic do VPC Flow Logs not capture?",
    reading: "VPC Flow Logs do not capture traffic to or from the Amazon-provided DNS server (the VPC resolver). Traffic to a DNS server you run yourself is captured.",
    checks: [] },
  { id: "HOST", source: "Host telemetry", kind: "absence", window: ["12:00", "12:20"],
    label: "Host DNS and process telemetry for the window",
    reading: "Not collected. No hostname to process link exists for 12:00-12:20.",
    checks: [] },
  { id: "PCAP", source: "Packet capture", kind: "absence", window: ["12:00", "12:20"],
    label: "Historical packet capture for the window",
    reading: "Not collected for 12:00-12:20.",
    checks: [] },
  { id: "LEAD", source: "Detection lead", kind: "lead", window: ["12:00", "12:20"],
    label: "The detection lead that opened the case",
    reading: "A lead suggests DNS tunneling from this instance during 12:00-12:20. A lead is not a query record, and no complete hostname to process history exists.",
    checks: [] },
  { id: "CACHE", source: "Cache behavior", kind: "scope", window: null,
    label: "Could cached answers hide lookups?",
    reading: "Operating system and application caches, and the VPC Resolver cache, answer repeat lookups within the record TTL. Repeated queries answered from the Resolver cache are not logged, so a resolver log undercounts lookups even if host caching is off. A cache cannot create records in a source that was not collecting.",
    checks: [] }
]);
export const DNS_LANES = Object.freeze([
  { id: "flow", label: "VPC Flow Logs", revealedBy: "FLOW_ZERO", spans: [["11:30", "14:30"]], note: "all day; excludes Amazon resolver traffic" },
  { id: "resolver", label: "Resolver query logs", revealedBy: "RESOLVER_START", spans: [["13:00", "14:30"]], note: "from 13:00" },
  { id: "host", label: "Host telemetry", revealedBy: "HOST", spans: [], note: "never collected" },
  { id: "pcap", label: "Packet capture", revealedBy: "PCAP", spans: [], note: "never collected" }
]);
export const DNS_HYPOTHESES = Object.freeze([
  { id: "H_NONE", label: "No DNS queries were sent during 12:00-12:20." },
  { id: "H_CACHE", label: "Queries were sent, but caching kept them out of every log." },
  { id: "H_TUNNEL", label: "The instance tunneled data over DNS during 12:00-12:20." },
  { id: "H_UNKNOWN", label: "The window cannot be reconstructed: activity is neither confirmed nor ruled out." }
]);
export const DNS_LABELS = Object.freeze(["known", "unknown", "unsupported"]);
/** truth is the teaching reference; it is only revealed together with evidence the player collected. */
const CLAIMS = [
  { id: "C_FLOW_EMPTY", text: "VPC Flow Logs hold no port 53 records for 12:00-12:20.", truth: "known", needs: { all: ["FLOW_ZERO"] },
    explain: "You queried it: the result is zero records. That is a fact about the log, not about DNS activity." },
  { id: "C_RESOLVER_START", text: "Resolver query logging collected nothing before 13:00 UTC.", truth: "known", needs: { all: ["RESOLVER_START", "CLOUDTRAIL"] },
    explain: "The configuration states 13:00 and management events corroborate it, so this is established." },
  { id: "C_NO_DNS", text: "The instance sent no DNS requests during 12:00-12:20.", truth: "unsupported", needs: { any: ["FLOW_SCOPE", "RESOLVER_START"] },
    explain: "Both zero-row results come from sources that could not have seen these queries, so the claim is unsupported rather than false." },
  { id: "C_TUNNEL", text: "The instance sent DNS tunneling queries during 12:00-12:20.", truth: "unknown", needs: { all: ["LEAD"], any: ["FLOW_SCOPE", "RESOLVER_START", "HOST"] },
    explain: "The lead raises the possibility, but no source covering the window can confirm or exclude it." },
  { id: "C_PROCESS", text: "A specific process on the host made those queries.", truth: "unknown", needs: { all: ["HOST"] },
    explain: "Host telemetry was never collected for the window, so attribution to a process cannot be established." },
  { id: "C_RECOVER", text: "Turning on more logging now will recover the 12:00-12:20 queries.", truth: "unsupported", needs: { any: ["RESOLVER_START"] },
    explain: "Collection starts when it is enabled; it does not backfill earlier events." },
  { id: "C_CACHE", text: "Cached answers explain why no log shows the queries.", truth: "unsupported", needs: { all: ["CACHE"], any: ["FLOW_SCOPE", "RESOLVER_START"] },
    explain: "Flow Logs would not show these queries cached or not, and Resolver logging was off. A cache cannot hide records from a source that was not collecting." }
];
export const DNS_CLAIMS = Object.freeze(CLAIMS.map(c => Object.freeze({ id: c.id, text: c.text })));
const PATHS = Object.freeze([
  { id: "flow-scope", label: "Flow Logs cannot see Amazon resolver traffic", needs: ["FLOW_ZERO", "FLOW_SCOPE"] },
  { id: "collection-start", label: "Resolver logging only began at 13:00 UTC", needs: ["RESOLVER_ROWS", "RESOLVER_START", "CLOUDTRAIL"] }
]);

const CONTROLS = Object.freeze({
  resolverLogging: ["on", "off"], hostTelemetry: ["off", "on"], hostCache: ["on", "off"],
  flowLogs: ["standard", "detailed"], packetCapture: ["off", "all"]
});
export const DNS_ACTIONS = Object.freeze([
  { id: "RESOLVER_ON", control: "resolverLogging", value: "on", action: { type: "SET_RESOLVER_LOGGING", value: "on" },
    label: "Associate Resolver query logging with the VPC", detail: "Collect future queries that reach the VPC resolver." },
  { id: "RESOLVER_OFF", control: "resolverLogging", value: "off", action: { type: "SET_RESOLVER_LOGGING", value: "off" },
    label: "Disassociate Resolver query logging from the VPC", detail: "Creates a new blind spot for later events.", unsafe: true },
  { id: "HOST_ON", control: "hostTelemetry", value: "on", action: { type: "SET_HOST_TELEMETRY", value: "on" },
    label: "Collect DNS and process telemetry on this instance", detail: "Approved endpoint tooling on the one affected host." },
  { id: "HOST_OFF", control: "hostTelemetry", value: "off", action: { type: "SET_HOST_TELEMETRY", value: "off" },
    label: "Stop host telemetry", detail: "Return to no host-level DNS or process visibility." },
  { id: "CACHE_OFF", control: "hostCache", value: "off", action: { type: "SET_HOST_CACHE", value: "off" },
    label: "Turn off DNS caching on this host", detail: "Every lookup then reaches the VPC resolver." },
  { id: "CACHE_ON", control: "hostCache", value: "on", action: { type: "SET_HOST_CACHE", value: "on" },
    label: "Restore DNS caching on this host", detail: "Return to the normal host cache." },
  { id: "FLOW_DETAILED", control: "flowLogs", value: "detailed", action: { type: "SET_FLOW_LOGS", value: "detailed" },
    label: "Add more fields to VPC Flow Logs", detail: "Richer records for traffic Flow Logs can already see." },
  { id: "FLOW_STANDARD", control: "flowLogs", value: "standard", action: { type: "SET_FLOW_LOGS", value: "standard" },
    label: "Return Flow Logs to the default fields", detail: "Undo the richer format." },
  { id: "PCAP_ALL", control: "packetCapture", value: "all", action: { type: "SET_PACKET_CAPTURE", value: "all" },
    label: "Capture packets on every instance in the VPC", detail: "Broad payload collection (unsafe shortcut).", unsafe: true },
  { id: "PCAP_OFF", control: "packetCapture", value: "off", action: { type: "SET_PACKET_CAPTURE", value: "off" },
    label: "Stop VPC-wide packet capture", detail: "Return to no packet capture." },
  { id: "BACKFILL", control: null, value: null, action: { type: "BACKFILL_WINDOW" },
    label: "Fill 12:00-12:20 from the new logs", detail: "Mark the missing window as recovered (cannot work).", unsafe: true }
]);
export const DNS_CONTROL_LABELS = Object.freeze({
  resolverLogging: "Resolver query logging for the VPC", hostTelemetry: "Host DNS and process telemetry (this instance)",
  hostCache: "DNS caching on this host", flowLogs: "VPC Flow Logs fields", packetCapture: "Packet capture"
});
const ACTION_TYPES = ["SET_RESOLVER_LOGGING", "SET_HOST_TELEMETRY", "SET_HOST_CACHE", "SET_FLOW_LOGS", "SET_PACKET_CAPTURE", "BACKFILL_WINDOW"];
const TYPE_CONTROL = { SET_RESOLVER_LOGGING: "resolverLogging", SET_HOST_TELEMETRY: "hostTelemetry", SET_HOST_CACHE: "hostCache", SET_FLOW_LOGS: "flowLogs", SET_PACKET_CAPTURE: "packetCapture" };
const EVIDENCE_IDS = DNS_EVIDENCE.map(e => e.id);

/* ---------- state ---------- */
export function newDnsMission() {
  return { version: DNS_MISSION_VERSION, evidence: [], hypothesis: null, claims: {},
    config: { resolverLogging: "on", hostTelemetry: "off", hostCache: "on", flowLogs: "standard", packetCapture: "off" },
    history: [], journal: [], sequence: 0, hints: 0, lastTest: null, finding: null };
}
function assertState(state) {
  const c = state?.config;
  if (!state || state.version !== DNS_MISSION_VERSION || !c ||
      Object.keys(CONTROLS).some(k => !CONTROLS[k].includes(c[k])) ||
      !Array.isArray(state.evidence) || state.evidence.some(id => !EVIDENCE_IDS.includes(id)) ||
      new Set(state.evidence).size !== state.evidence.length ||
      !(state.hypothesis === null || DNS_HYPOTHESES.some(h => h.id === state.hypothesis)) ||
      !state.claims || typeof state.claims !== "object" ||
      Object.entries(state.claims).some(([k, v]) => !CLAIMS.some(x => x.id === k) || !DNS_LABELS.includes(v)) ||
      !Array.isArray(state.history) || !Array.isArray(state.journal) ||
      !Number.isSafeInteger(state.sequence) || !Number.isSafeInteger(state.hints)) {
    throw new Error("invalid_dns_mission_state");
  }
}
function withEvent(state, kind, description, details = {}) {
  const sequence = state.sequence + 1;
  return { ...state, ...details, sequence, journal: [...state.journal, { sequence, kind, description }] };
}
const validNote = state => state.lastTest ? "Your last test is still valid." : "No test has run yet.";
const has = (state, id) => state.evidence.includes(id);
const meets = (state, needs) => (needs.all || []).every(id => has(state, id)) && (!needs.any || needs.any.some(id => has(state, id)));

/* ---------- evidence ---------- */
export function readDnsEvidence(state, id) {
  assertState(state);
  const item = DNS_EVIDENCE.find(e => e.id === id);
  if (!item) throw new Error("invalid_dns_evidence");
  if (!has(state, id)) return null;
  const hit = item.checks.find(check => check.by.every(dep => has(state, dep)));
  const status = hit ? hit.status : item.checks.length ? "uncorroborated" : "direct";
  return { id, source: item.source, kind: item.kind, window: item.window, label: item.label, reading: item.reading, status,
    note: hit ? hit.note : item.checks.length ? "Single source so far. Corroborate it before relying on it." : "" };
}
export function collectDnsEvidence(state, id) {
  assertState(state);
  const item = DNS_EVIDENCE.find(e => e.id === id);
  if (!item) throw new Error("invalid_dns_evidence");
  if (has(state, id)) {
    return withEvent(state, "reinspect", "Reopened " + item.label, { finding: item.source + ": " + readDnsEvidence(state, id).reading + " " + validNote(state) });
  }
  const next = { ...state, evidence: [...state.evidence, id] };
  return withEvent(state, "evidence", "Added to timeline: " + item.label, {
    evidence: next.evidence, lastTest: null, finding: item.source + ": " + item.reading
  });
}
export function dnsLaneView(state) {
  assertState(state);
  return DNS_LANES.map(l => ({ ...l, revealed: has(state, l.revealedBy), showNote: l.id === "flow" ? has(state, "FLOW_SCOPE") : true }));
}

/* ---------- hypothesis and claims ---------- */
const cite = (state, ids) => ids.filter(id => has(state, id)).map(id => DNS_EVIDENCE.find(e => e.id === id).source).join(" and ");
function completePaths(state) {
  return PATHS.filter(p => p.needs.every(id => has(state, id)));
}
export function assessDnsHypothesis(state) {
  assertState(state);
  const h = state.hypothesis;
  if (!h) return { id: null, verdict: "none", text: "No hypothesis yet. State what you currently believe, then test it against the timeline." };
  const exculpating = cite(state, ["FLOW_SCOPE", "RESOLVER_START"]);
  if (h === "H_UNKNOWN") {
    const paths = completePaths(state);
    return paths.length
      ? { id: h, verdict: "supported", paths: paths.map(p => p.id),
          text: "Justified by " + (paths.length === 2 ? "two independent paths" : "one path") + ": " + paths.map(p => p.label).join("; ") + ". Neither activity nor its absence is established for the window." }
      : { id: h, verdict: "premature", paths: [],
          text: "Plausible, but your timeline does not yet show why the zero-row results are uninformative. Uncertainty needs the same evidence as certainty." };
  }
  if (h === "H_NONE") {
    return exculpating
      ? { id: h, verdict: "contradicted", text: "Contradicted by " + exculpating + ": the sources showing nothing could not have recorded these queries. An empty result is not proof of no activity." }
      : { id: h, verdict: "premature", text: has(state, "FLOW_ZERO") || has(state, "RESOLVER_ROWS")
          ? "Resting on zero-row results whose scope you have not checked. Ask what each source could have seen before treating silence as absence."
          : "Nothing on your timeline supports this yet." };
  }
  if (h === "H_CACHE") {
    return exculpating
      ? { id: h, verdict: "contradicted", text: "Contradicted by " + exculpating + ": a cache cannot remove records from a source that could not see them or was not collecting." }
      : { id: h, verdict: "premature", text: has(state, "CACHE")
          ? "Caching can reduce what a resolver log counts, but check whether any source covering the window was collecting."
          : "Nothing on your timeline supports this yet." };
  }
  return { id: h, verdict: "unsupported", text: has(state, "LEAD")
    ? "The lead is a reason to investigate, not a query record. Nothing that covered the window can confirm tunneling."
    : "Nothing on your timeline supports this yet." };
}
export function reviewDnsClaim(state, claimId) {
  assertState(state);
  const claim = CLAIMS.find(c => c.id === claimId);
  if (!claim) throw new Error("invalid_dns_claim");
  const chosen = state.claims[claimId] || null;
  const supported = meets(state, claim.needs);
  if (!chosen) return { id: claimId, chosen, verdict: "unset", text: "Not classified yet." };
  if (!supported) return { id: claimId, chosen, verdict: "unsupported-by-timeline",
    text: "Your timeline cannot yet justify any label for this claim. Collect evidence about what the relevant sources could see." };
  return chosen === claim.truth
    ? { id: claimId, chosen, verdict: "justified", text: claim.explain }
    : { id: claimId, chosen, verdict: "incorrect", text: "Evidence you collected points elsewhere. " + claim.explain };
}
export function assessDnsFinding(state) {
  assertState(state);
  const hypothesis = assessDnsHypothesis(state);
  const claims = CLAIMS.map(c => ({ ...reviewDnsClaim(state, c.id), claim: c.text }));
  const incorrect = claims.filter(c => c.verdict === "incorrect" || c.verdict === "unsupported-by-timeline").length;
  const unset = claims.filter(c => c.verdict === "unset").length;
  const complete = hypothesis.verdict === "supported" && incorrect === 0 && unset === 0;
  return { hypothesis, claims, incorrect, unset, complete, paths: hypothesis.paths || [] };
}
export function setDnsHypothesis(state, id) {
  assertState(state);
  if (id !== null && !DNS_HYPOTHESES.some(h => h.id === id)) throw new Error("invalid_dns_hypothesis");
  if (state.hypothesis === id) return withEvent(state, "noop", "Hypothesis unchanged", { finding: "That was already your hypothesis. " + validNote(state) });
  const label = h => h ? DNS_HYPOTHESES.find(x => x.id === h).label : "none";
  const next = { ...state, hypothesis: id };
  return withEvent(state, "hypothesis", (state.hypothesis ? "Revised hypothesis to: " : "Hypothesis: ") + label(id), {
    hypothesis: id, lastTest: null, finding: assessDnsHypothesis(next).text
  });
}
export function classifyDnsClaim(state, claimId, label) {
  assertState(state);
  const claim = CLAIMS.find(c => c.id === claimId);
  if (!claim) throw new Error("invalid_dns_claim");
  if (label !== null && !DNS_LABELS.includes(label)) throw new Error("invalid_dns_label");
  const current = state.claims[claimId] || null;
  if (current === label) return withEvent(state, "noop", "Claim label unchanged", { finding: "That label was already set. " + validNote(state) });
  const claims = { ...state.claims };
  if (label === null) delete claims[claimId]; else claims[claimId] = label;
  const next = { ...state, claims };
  return withEvent(state, "claim", label ? "Marked as " + label.toUpperCase() + ": " + claim.text : "Cleared label: " + claim.text, {
    claims, lastTest: null, finding: reviewDnsClaim(next, claimId).text
  });
}
export function hintDnsMission(state) {
  assertState(state);
  const f = assessDnsFinding(state);
  const coverageOk = state.config.resolverLogging === "on" && state.config.hostTelemetry === "on";
  const text = !state.evidence.length ? "Start with the sources that existed during 12:00-12:20. What did each one actually collect?"
    : (has(state, "FLOW_ZERO") || has(state, "RESOLVER_ROWS")) && !has(state, "FLOW_SCOPE") && !has(state, "RESOLVER_START")
      ? "A zero-row result only means something if the source could have seen the traffic. Check what each source was able to record, and since when."
    : f.hypothesis.verdict === "none" ? "You have evidence. Commit to a hypothesis, knowing you can revise it."
    : f.hypothesis.verdict !== "supported" ? "Ask whether your hypothesis is something your evidence establishes, or only something it fails to rule out."
    : f.unset ? "Sort each statement into known, unknown or unsupported. Known needs a source that actually recorded it."
    : f.incorrect ? "Reopen the evidence behind the statement flagged for review and ask which source could have shown it."
    : !coverageOk || state.config.packetCapture === "all" ? "The old window is fixed. What would let a later event be tied to a hostname, and to a process, with the smallest scope?"
    : "Your finding and coverage look settled. Run the test to confirm against a simulated later event.";
  return withEvent(state, "hint", "Asked for a hint", { hints: state.hints + 1, finding: "Hint: " + text });
}

/* ---------- future telemetry changes ---------- */
function shape(action) {
  if (!action || typeof action !== "object" || !ACTION_TYPES.includes(action.type)) return false;
  if (action.type === "BACKFILL_WINDOW") return true;
  return CONTROLS[TYPE_CONTROL[action.type]].includes(action.value);
}
function evaluate(state, action) {
  if (!shape(action)) throw new Error("invalid_dns_action");
  if (action.type === "BACKFILL_WINDOW") return { outcome: "rejected", message:
    "Rejected: collection applies from the moment it is enabled. New logs cannot recreate queries from 12:00-12:20, and marking the window recovered would be fabricated history. Nothing changed." };
  const control = TYPE_CONTROL[action.type];
  if (state.config[control] === action.value) return { outcome: "noop", message: DNS_CONTROL_LABELS[control] + " is already " + action.value + ". " + validNote(state) };
  const entry = DNS_ACTIONS.find(a => a.action.type === action.type && a.action.value === action.value);
  return { outcome: "change", control, value: action.value, label: entry.label, message: entry.label + " (virtual only). It affects later events only. Run the test." };
}
export function changeDnsMission(state, action) {
  assertState(state);
  const r = evaluate(state, action);
  if (r.outcome !== "change") return withEvent(state, r.outcome, r.outcome === "noop" ? "No configuration change" : "Change rejected", { finding: r.message });
  return withEvent(state, "change", r.label + " (virtual only)", {
    config: { ...state.config, [r.control]: r.value },
    history: [...state.history, { config: { ...state.config }, action: r.label }],
    lastTest: null, finding: r.message
  });
}
export function undoDnsMission(state) {
  assertState(state);
  if (!state.history.length) return withEvent(state, "noop", "Nothing to undo", { finding: "No configuration change to undo. " + validNote(state) });
  const previous = state.history[state.history.length - 1];
  return withEvent(state, "undo", "Undid: " + previous.action + " (virtual only)", {
    config: { ...previous.config }, history: state.history.slice(0, -1), lastTest: null,
    finding: "Last configuration change reversed. Evidence, hypothesis and labels are kept. Run the test again."
  });
}

/* ---------- simulated later event ---------- */
export function simulateLaterEvent(config) {
  const e = DNS_LATER_EVENT;
  const resolverOn = config.resolverLogging === "on";
  const hostFill = {}, resolverFill = {};
  let reachedResolver = 0, logged = 0;
  for (const { name, at } of e.schedule) {
    if (config.hostCache === "on" && name in hostFill && at - hostFill[name] < e.ttl) continue;
    if (config.hostCache === "on") hostFill[name] = at;
    reachedResolver++;
    if (name in resolverFill && at - resolverFill[name] < e.ttl) continue;
    resolverFill[name] = at;
    logged++;
  }
  const assumptions = " Assumes a " + e.ttl + " s record TTL and lookups at +" + e.schedule.map(s => s.at).join(", +") +
    " s: repeats inside the TTL are answered from a cache (the host cache, then the VPC Resolver cache) and are not logged.";
  const hostOn = config.hostTelemetry === "on";
  const rows = [
    { key: "resolver", label: "Resolver query logs", ok: resolverOn,
      value: resolverOn ? logged + " of " + e.lookups + " lookups logged, " + e.distinctNames + " of " + e.distinctNames + " names, with the source instance. " +
        reachedResolver + " lookups reached the resolver and " + (reachedResolver - logged) + " of those were answered from the Resolver cache." + assumptions
        : "0 records. Logging is disassociated, so this event is a new blind spot." },
    { key: "process", label: "Process attribution", ok: hostOn,
      value: hostOn ? "Host telemetry links " + e.lookups + " of " + e.lookups + " lookups to a process. Resolver logs alone cannot name a process."
        : "None. Resolver logs identify the instance, not the process that asked." },
    { key: "flow", label: "VPC Flow Logs", ok: false,
      value: "0 DNS records" + (config.flowLogs === "detailed" ? " even with more fields" : "") + ". Traffic to the Amazon-provided resolver is not captured." },
    { key: "capture", label: "Packet capture", ok: config.packetCapture === "all",
      value: config.packetCapture === "all" ? "Names visible on every instance's wire traffic, with no process link and a large privacy and cost footprint." : "Off." },
    { key: "past", label: "Past window 12:00-12:20", ok: false, value: "Unchanged. Still unknown." }
  ];
  return { rows, resolverOn, hostOn, logged, reachedResolver, risk: config.packetCapture === "all" };
}
const SETTING_NOTES = [
  [c => c.flowLogs === "detailed", "Extra Flow Logs fields do not change what Flow Logs exclude, so DNS to the Amazon-provided resolver is still invisible."],
  [c => c.hostCache === "off", "Turning off the host cache is not needed to learn the names, and it does not make the log complete: the VPC Resolver has its own cache, so repeats inside the TTL are still answered there and not logged. Treat logged counts as a lower bound."],
  [c => c.resolverLogging === "off", "Disassociating Resolver query logging removed the one source that records which names the VPC resolver was asked."]
];
export function testDnsMission(state) {
  assertState(state);
  const sim = simulateLaterEvent(state.config);
  const finding = assessDnsFinding(state);
  const covered = sim.resolverOn && sim.hostOn;
  const risk = sim.risk;
  const healthy = finding.complete && covered && !risk;
  const hyp = state.hypothesis;
  const status = risk ? "BROAD CAPTURE · UNSAFE SCOPE"
    : !hyp ? "NO HYPOTHESIS YET"
    : !finding.complete ? (finding.hypothesis.verdict === "supported" ? "FINDING INCOMPLETE" : "FINDING NOT SUPPORTED YET")
    : !covered ? "UNCERTAINTY JUSTIFIED · FUTURE COVERAGE GAP"
    : "UNCERTAINTY JUSTIFIED · FUTURE COVERAGE VERIFIED";
  const findingText = !hyp ? "Choose a hypothesis from your evidence."
    : finding.hypothesis.text + (finding.hypothesis.verdict === "supported" && (finding.incorrect || finding.unset)
      ? " " + (finding.unset ? finding.unset + " statement(s) still need a label." : "") + (finding.incorrect ? " " + finding.incorrect + " label(s) need review." : "") : "");
  const notes = SETTING_NOTES.filter(([when]) => when(state.config)).map(([, text]) => text);
  const coverageText = risk ? "Capturing packets on every instance adds payload privacy and cost exposure and still names no process. Undo it and collect telemetry on this instance only."
    : covered ? "In the simulated later event, Resolver logs show the names and the source instance, and host telemetry names the process. The 12:00-12:20 window stays unknown."
    : !sim.resolverOn ? "In the simulated later event Resolver logging is off, so the names are not recorded."
    : "In the simulated later event Resolver logs show the names, but nothing links them to a process.";
  const result = {
    status, healthy, serviceOk: covered, risk, finding, coverage: sim.rows, hints: state.hints,
    explanation: [findingText, coverageText, ...notes].join(" "),
    evidence: "SYNTHETIC later event " + DNS_LATER_EVENT.label + "; Resolver log: " + (sim.resolverOn ? "on" : "off") +
      "; host process telemetry: " + (sim.hostOn ? "on" : "off") + "; VPC Flow Logs DNS records: 0; past window 12:00-12:20: unknown" +
      "; evidence collected: " + state.evidence.length + " of " + DNS_EVIDENCE.length +
      "; hypothesis: " + (hyp ? DNS_HYPOTHESES.find(h => h.id === hyp).label : "none") + "; hints used: " + state.hints
  };
  return { state: withEvent(state, "test", "Later-event test: " + status, { lastTest: result, finding: result.explanation }), result };
}
