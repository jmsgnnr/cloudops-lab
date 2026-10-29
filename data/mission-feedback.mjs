/**
 * Evidence-based mission feedback, journal replay and optional debrief (v1).
 *
 * Pure and offline. Everything here is derived from a mission's action journal:
 * each journal entry carries the replayable input (`op`) that produced it, so the
 * journal can be re-run from the mission's fresh state. Feedback and replay never
 * read any other part of the live state. There is no score, grade or AWS
 * credential: the outcome is a named description plus a visible checklist, and
 * each statement lists the journal steps ("basis") it comes from.
 *
 * Statements that are not derived from play are limited to the "limits" list,
 * which restates what the mission models do not simulate. Their AWS sources:
 *  - IAM evaluation layers: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html
 *  - Permissions boundaries: https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html
 *  - NAT gateway use cases: https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-scenarios.html
 *  - Route tables and longest-prefix match: https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Route_Tables.html
 *  - Resolver query logging (no backfill, cached answers not logged): https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-query-logs.html
 *  - VPC Flow Logs exclude Amazon-provided DNS server traffic: https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs.html#flow-logs-limitations
 */
import {
  IAM_ACTIONS, IAM_INSPECTIONS, newIamMission, inspectIamMission, changeIamMission, undoIamMission, testIamMission
} from "./iam-mission.mjs";
import {
  NAT_ACTIONS, NAT_INSPECTIONS, NAT_TABLES, NAT_REFERENCES, newNatMission, inspectNatMission, changeNatMission,
  undoNatMission, testNatMission, parseCidr
} from "./nat-mission.mjs";
import {
  DNS_EVIDENCE, DNS_ACTIONS, DNS_HYPOTHESES, DNS_CLAIMS, DNS_CONTROL_LABELS, DNS_LATER_EVENT, DNS_REFERENCES,
  newDnsMission, collectDnsEvidence, readDnsEvidence, setDnsHypothesis, classifyDnsClaim, hintDnsMission,
  changeDnsMission, undoDnsMission, testDnsMission, assessDnsFinding, dnsSettingNotes
} from "./dns-mission.mjs";

export const MISSION_FEEDBACK_VERSION = 1;
export const FEEDBACK_NOTICE = "This describes what your own actions did in a synthetic model. It is not a grade, a score or an AWS credential.";

const clone = value => JSON.parse(JSON.stringify(value));
const seqs = list => list.map(e => e.sequence);
const stepWord = list => (list.length === 1 ? "step " : "steps ") + list.join(", ");
const unique = list => [...new Set(list)];
const sentence = text => (/[.?!"]$/.test(text) ? text : text + ".");

/* ---------- mission adapters ---------- */
const IAM_BOUNDARY_TEXT = {
  missing: "no Allow for s3:GetObject on the report",
  scoped: "Allow s3:GetObject on the report object only",
  wildcard: "broad S3 object read (all objects)"
};
const iamAdapter = {
  id: "iam-boundary-v1", title: "IAM boundary incident", quoteExplanation: true,
  fresh: newIamMission,
  apply(state, op) {
    if (op.t === "inspect") return inspectIamMission(state, op.id);
    if (op.t === "change") return changeIamMission(state, op.id);
    if (op.t === "undo") return undoIamMission(state);
    if (op.t === "test") return testIamMission(state).state;
    throw new Error("invalid_op");
  },
  test: state => testIamMission(state).result,
  inspections: IAM_INSPECTIONS,
  describe: op => "Applied \"" + IAM_ACTIONS.find(a => a.id === op.id).label + "\"",
  /** The inspection that shows the setting an action edits. */
  requires: op => op.t !== "change" ? null
    : op.id === "SCOPED_BOUNDARY" || op.id === "WILDCARD_BOUNDARY" ? "BOUNDARY" : "IDENTITY",
  unsafeOp: op => op.t === "change" && op.id === "WILDCARD_BOUNDARY",
  facts: state => [
    { key: "identity", label: "Role identity policy", value: state.identityAllow ? "Allow s3:GetObject on the report folder" : "no matching Allow" },
    { key: "boundary", label: "Permissions boundary", value: IAM_BOUNDARY_TEXT[state.boundary] },
    { key: "inspected", label: "Inspected", value: state.inspections.length + " of " + IAM_INSPECTIONS.length },
    { key: "test", label: "Latest test", value: state.lastTest ? state.lastTest.status : "none since the last change" }
  ],
  diff(start, end) {
    const items = [];
    if (start.identityAllow !== end.identityAllow) items.push({
      key: "identity", label: "Role identity policy", from: "Allow s3:GetObject on the report folder", to: "no matching Allow",
      revert: s => ({ ...s, identityAllow: start.identityAllow }) });
    if (start.boundary !== end.boundary) items.push({
      key: "boundary", label: "Permissions boundary", from: IAM_BOUNDARY_TEXT[start.boundary], to: IAM_BOUNDARY_TEXT[end.boundary],
      unsafe: end.boundary === "wildcard",
      scope: end.boundary === "scoped" ? "It covers the one object the job reads and nothing else in the model."
        : end.boundary === "wildcard" ? "It covers every S3 object, far more than the job reads." : "",
      revert: s => ({ ...s, boundary: start.boundary }) });
    return items;
  },
  limits: [
    { text: "Only an identity policy and a permissions boundary are modelled. Service control policies, resource-based policies, session policies, explicit denies and condition keys also take part in a real authorization decision.", url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html", label: "AWS: policy evaluation logic" },
    { text: "The boundary and role here are teaching objects. Check the real principal, resource ARN and policy documents in your own account before changing anything.", url: "https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html", label: "AWS: permissions boundaries" }
  ]
};

const natRouteLine = (state, table) => state.routes[table].map(r => r.destination + " -> " + r.target).join("; ");
const natAdapter = {
  id: "private-nat-v1", title: "NAT egress incident", quoteExplanation: true,
  fresh: newNatMission,
  apply(state, op) {
    if (op.t === "inspect") return inspectNatMission(state, op.id);
    if (op.t === "change") return changeNatMission(state, op.action);
    if (op.t === "undo") return undoNatMission(state);
    if (op.t === "test") return testNatMission(state).state;
    throw new Error("invalid_op");
  },
  test: state => testNatMission(state).result,
  inspections: NAT_INSPECTIONS,
  requires(op) {
    if (op.t !== "change") return null;
    const a = op.action;
    if (a.type === "SET_APP_EGRESS") return "APP_SG";
    if (a.type === "RECREATE_NAT") return "NAT_ROUTES";
    return a.table === "app" ? "APP_ROUTES" : "NAT_ROUTES";
  },
  unsafeOp: op => op.t === "change" && NAT_ACTIONS.some(a => a.unsafe && JSON.stringify(a.action) === JSON.stringify(op.action)),
  facts: state => [
    { key: "routes-app", label: NAT_TABLES.app.label, value: natRouteLine(state, "app") },
    { key: "routes-nat", label: NAT_TABLES.nat.label, value: natRouteLine(state, "nat") },
    { key: "nat", label: "NAT gateway nat-0abc", value: state.natSubnet === "nat" ? "in the NAT subnet" : "in the app subnet (private)" },
    { key: "sg", label: "App security group outbound", value: state.appEgress === "https" ? "TCP 443 only" : "all traffic" },
    { key: "inspected", label: "Inspected", value: state.inspections.length + " of " + NAT_INSPECTIONS.length },
    { key: "test", label: "Latest test", value: state.lastTest ? state.lastTest.status : "none since the last change" }
  ],
  diff(start, end) {
    const items = [];
    for (const table of ["app", "nat"]) {
      const destinations = unique([...start.routes[table], ...end.routes[table]].map(r => r.destination));
      for (const destination of destinations) {
        const was = start.routes[table].find(r => r.destination === destination);
        const now = end.routes[table].find(r => r.destination === destination);
        if ((was && was.target) === (now && now.target)) continue;
        const prefix = parseCidr(destination).prefix;
        items.push({
          key: "route-" + table + "-" + destination, label: NAT_TABLES[table].label + ", route " + destination,
          from: was ? was.target : "(no route)", to: now ? now.target : "(route removed)",
          scope: now && now.target === "igw-0edge"
            ? (prefix === 0 ? "A 0.0.0.0/0 route matches every internet destination that has no more specific route."
              : "A " + destination + " route matches only that range; other internet destinations keep following the default route.")
            : "",
          revert: s => {
            const routes = s.routes[table].filter(r => r.destination !== destination);
            if (was) routes.splice(start.routes[table].indexOf(was), 0, { ...was });
            return { ...s, routes: { ...s.routes, [table]: routes } };
          }
        });
      }
    }
    if (start.natSubnet !== end.natSubnet) items.push({
      key: "nat-subnet", label: "NAT gateway nat-0abc",
      from: start.natSubnet === "nat" ? "in the NAT subnet" : "in the app subnet (private)",
      to: end.natSubnet === "nat" ? "in the NAT subnet" : "in the app subnet (private)",
      unsafe: end.natSubnet === "app", scope: "Both private subnets that use nat-0abc are affected by where it sits.",
      revert: s => ({ ...s, natSubnet: start.natSubnet }) });
    if (start.appEgress !== end.appEgress) items.push({
      key: "sg", label: "App security group outbound", from: start.appEgress === "https" ? "TCP 443 only" : "all traffic",
      to: end.appEgress === "https" ? "TCP 443 only" : "all traffic", unsafe: end.appEgress === "all",
      scope: end.appEgress === "all" ? "It opens every outbound port for the app instances." : "",
      revert: s => ({ ...s, appEgress: start.appEgress }) });
    return items;
  },
  limits: [
    { text: "Network ACL return ports, DNS, VPC endpoints and transit gateway route tables are not simulated (the case evidence states NACLs and DNS are healthy). Check them, and the NAT gateway state, in a real VPC.", url: NAT_REFERENCES[0].url, label: "AWS: " + NAT_REFERENCES[0].label },
    { text: "Route selection here uses longest-prefix match on a single destination. A real route table can hold propagated and more specific routes that change the result.", url: NAT_REFERENCES[1].url, label: "AWS: " + NAT_REFERENCES[1].label }
  ]
};

const dnsCoverage = c => c.resolverLogging === "on" && c.hostTelemetry === "on";
const dnsAdapter = {
  id: "resolver-blindspot-v1", title: "DNS evidence timeline",
  fresh: newDnsMission,
  apply(state, op) {
    if (op.t === "evidence") return collectDnsEvidence(state, op.id);
    if (op.t === "hypothesis") return setDnsHypothesis(state, op.id);
    if (op.t === "claim") return classifyDnsClaim(state, op.id, op.label);
    if (op.t === "hint") return hintDnsMission(state);
    if (op.t === "change") return changeDnsMission(state, op.action);
    if (op.t === "undo") return undoDnsMission(state);
    if (op.t === "test") return testDnsMission(state).state;
    throw new Error("invalid_op");
  },
  test: state => testDnsMission(state).result,
  inspections: DNS_EVIDENCE.map(e => ({ id: e.id, label: e.label })),
  requires: () => null,
  unsafeOp: op => op.t === "change" && DNS_ACTIONS.some(a => a.unsafe && a.action.type === op.action.type && a.action.value === op.action.value),
  facts: state => [
    { key: "evidence", label: "Sources on the timeline", value: state.evidence.length + " of " + DNS_EVIDENCE.length },
    { key: "hypothesis", label: "Hypothesis", value: state.hypothesis ? DNS_HYPOTHESES.find(h => h.id === state.hypothesis).label : "none yet" },
    { key: "claims", label: "Statements labeled", value: Object.keys(state.claims).length + " of " + DNS_CLAIMS.length },
    ...Object.keys(DNS_CONTROL_LABELS).map(k => ({ key: "cfg-" + k, label: DNS_CONTROL_LABELS[k], value: state.config[k] })),
    { key: "hints", label: "Hints used", value: String(state.hints) },
    { key: "test", label: "Latest test", value: state.lastTest ? state.lastTest.status : "none since the last change" }
  ],
  diff(start, end) {
    return Object.keys(DNS_CONTROL_LABELS).filter(k => start.config[k] !== end.config[k]).map(k => {
      const entry = DNS_ACTIONS.find(a => a.control === k && a.value === end.config[k]);
      return {
        key: "cfg-" + k, label: DNS_CONTROL_LABELS[k], from: start.config[k], to: end.config[k], unsafe: Boolean(entry && entry.unsafe),
        scope: "It affects later events only; the 12:00-12:20 window is not changed by any setting.",
        revert: s => ({ ...s, config: { ...s.config, [k]: start.config[k] } })
      };
    });
  },
  limits: [
    { text: "Resolver query logging collects from the moment it is enabled and does not backfill earlier queries, and VPC Flow Logs do not capture traffic to the Amazon-provided DNS server. The 12:00-12:20 window stays unknown in the model for that reason.", url: DNS_REFERENCES[0].url, label: "AWS: " + DNS_REFERENCES[0].label },
    { text: "The later-event counts assume a " + DNS_LATER_EVENT.ttl + " second record TTL and the lookup times listed in the test. Those are teaching assumptions, not measurements, and real caches and TTLs differ.", url: DNS_REFERENCES[0].url, label: "AWS: " + DNS_REFERENCES[0].label }
  ]
};
const ADAPTERS = { [iamAdapter.id]: iamAdapter, [natAdapter.id]: natAdapter, [dnsAdapter.id]: dnsAdapter };
export const FEEDBACK_MISSIONS = Object.freeze(Object.keys(ADAPTERS));
function adapter(missionId) {
  const found = Object.hasOwn(ADAPTERS, missionId) ? ADAPTERS[missionId] : null;
  if (!found) throw new Error("unknown_mission");
  return found;
}

/* ---------- replay ---------- */
function plainOp(op) {
  return op && typeof op === "object" && !Array.isArray(op) && typeof op.t === "string";
}
/**
 * Re-run a journal from the mission's fresh state. Deterministic: same journal, same steps.
 * Throws if an entry has no recorded input, if an input is invalid, or if re-running it does not
 * reproduce the recorded kind and description (a tampered or mismatched journal).
 */
export function replayMission(missionId, journal) {
  const m = adapter(missionId);
  if (!Array.isArray(journal)) throw new Error("journal_not_replayable");
  let state = m.fresh();
  let facts = m.facts(state);
  const steps = [{ index: 0, sequence: 0, kind: "start", description: "Starting state", op: null, before: state, after: state, facts, changed: [] }];
  for (const [i, entry] of journal.entries()) {
    if (!entry || entry.sequence !== i + 1 || !plainOp(entry.op)) throw new Error("journal_not_replayable");
    const before = state;
    try { state = m.apply(before, clone(entry.op)); }
    catch { throw new Error("replay_invalid_operation"); }
    const made = state.journal[state.journal.length - 1];
    if (state.journal.length !== i + 1 || made.kind !== entry.kind || made.description !== entry.description) throw new Error("replay_diverged");
    const nextFacts = m.facts(state);
    const changed = nextFacts.filter((f, k) => f.value !== facts[k].value).map(f => f.label);
    steps.push({ index: i + 1, sequence: entry.sequence, kind: entry.kind, description: entry.description, op: clone(entry.op),
      before, after: state, facts: nextFacts, changed });
    facts = nextFacts;
  }
  return { missionId, steps, final: state };
}

/* ---------- feedback ---------- */
/** Undo reverses the latest change that is still in place; record which undo reversed which change. */
function markUndone(events) {
  const open = [];
  for (const e of events) {
    if (e.kind === "undo") {
      const undone = open.pop();
      if (undone) undone.undoneAt = e.sequence;
    }
    if (e.kind === "change") open.push(e);
  }
}
function consequenceItems(m, events) {
  const items = [];
  const changes = events.filter(e => e.kind === "change");
  const windowEnds = new Set(["change", "undo", "evidence", "hypothesis", "claim"]);
  for (const c of changes) {
    const later = events.slice(c.index);
    let test = null;
    for (const e of later) {
      if (e.kind === "test") { test = e; break; }
      if (windowEnds.has(e.kind)) break;
    }
    const required = m.requires(c.op);
    const inspectedFirst = required ? c.before.inspections.includes(required) : null;
    const result = test ? test.after.lastTest : null;
    const basis = [c.sequence, ...(test ? [test.sequence] : []), ...(c.undoneAt ? [c.undoneAt] : [])];
    const parts = [];
    if (inspectedFirst === false) parts.push("You had not used \"" + m.inspections.find(i => i.id === required).label + "\" before this change.");
    if (m.unsafeOp(c.op)) parts.push("The workbench marks this option as an unsafe shortcut.");
    parts.push(result ? "The next test (step " + test.sequence + ") reported " + result.status + "."
      : "No test followed before you changed course, so the journal holds no evidence of its effect.");
    if (c.undoneAt) parts.push("You undid it at step " + c.undoneAt + ".");
    const tag = !result ? "NOT TESTED" : result.risk ? (result.serviceOk ? "BROADER THAN NEEDED" : "NOT RESTORED, BROADER THAN NEEDED")
      : result.healthy ? "TESTED OK" : "TESTED, NOT RESTORED";
    items.push({ tag, text: "Step " + c.sequence + ": " + sentence(m.describe ? m.describe(c.op) : c.description.replace(/ \(virtual only\)$/, "")) + " " + parts.join(" "),
      detail: result && m.quoteExplanation ? result.explanation : "", basis });
  }
  return items;
}
function describeInspections(m, events, final) {
  const items = [];
  const opened = [];
  for (const e of events) {
    if (e.op.t === "inspect" || e.op.t === "evidence") {
      if (e.kind === "reinspect") continue;
      opened.push(e);
    }
  }
  for (const e of opened) {
    const info = m.inspections.find(i => i.id === e.op.id);
    items.push({ tag: "OPENED", text: "Step " + e.sequence + ": " + sentence(info.label), detail: e.after.finding || "", basis: [e.sequence] });
  }
  const skipped = m.inspections.filter(i => !opened.some(e => e.op.id === i.id));
  items.push(skipped.length
    ? { tag: "NOT OPENED", text: "Not opened (" + skipped.length + " of " + m.inspections.length + "): " + skipped.map(i => i.label).join("; ") + ".", basis: [] }
    : { tag: "OPENED", text: "You opened every available source (" + m.inspections.length + " of " + m.inspections.length + ").", basis: [] });
  const repeats = events.filter(e => e.kind === "reinspect");
  if (repeats.length) items.push({ tag: "REOPENED", text: "You reopened a source you already had " + repeats.length + (repeats.length === 1 ? " time" : " times") + " (" + stepWord(seqs(repeats)) + ").", basis: seqs(repeats) });
  return items;
}
function otherEvents(events) {
  const noops = events.filter(e => e.kind === "noop" || e.kind === "rejected");
  const items = [];
  for (const e of noops) {
    const message = e.after.finding || "";
    if (e.kind === "rejected") items.push({ tag: "REJECTED", text: "Step " + e.sequence + ": the workbench rejected a change and nothing was altered. " + message, basis: [e.sequence] });
  }
  const plain = noops.filter(e => e.kind === "noop");
  if (plain.length) items.push({ tag: "NO CHANGE", text: plain.length + (plain.length === 1 ? " action" : " actions") + " changed nothing because the setting was already in that state (" + stepWord(seqs(plain)) + ").", basis: seqs(plain) });
  return items;
}
function scopeItems(m, start, end, finalHealthy) {
  const diffs = m.diff(start, end);
  if (!diffs.length) return { diffs, items: [{ tag: "KEPT", text: "The final configuration matches the starting configuration: nothing remains changed.", basis: [] }] };
  const items = diffs.map(d => {
    let need = "";
    let tag = d.unsafe ? "BROADER THAN NEEDED" : "CHANGED";
    if (finalHealthy) {
      const without = m.test(d.revert(end)).healthy;
      need = without ? " Reverting only this setting still passes the model test, so the test did not need it."
        : " Reverting only this setting makes the model test fail, so the tested recovery needs it.";
      if (without && !d.unsafe) tag = "NOT REQUIRED";
    }
    return { tag, text: d.label + ": changed from " + d.from + " to " + d.to + "." + (d.scope ? " " + d.scope : "") + need, basis: [] };
  });
  return { diffs, items };
}

function outcomeFor(m, final, current, tests, changes, evidenceFirst) {
  const verified = final.lastTest;
  if (!tests) return { id: "not-tested", label: "NOT TESTED YET", verified: false, complete: false };
  if (!verified) return { id: "unverified", label: "NO TEST SINCE YOUR LAST CHANGE", verified: false, complete: false };
  if (m.id === dnsAdapter.id) {
    const f = verified.finding;
    const supported = f.complete;
    return verified.risk ? { id: "unsafe", label: "BROAD CAPTURE STILL IN PLACE", verified: true, complete: false }
      : verified.healthy ? { id: "restored", label: "FINDING SUPPORTED · FUTURE COVERAGE VERIFIED", verified: true, complete: true }
      : supported ? { id: "partial", label: "FINDING SUPPORTED · FUTURE COVERAGE GAP", verified: true, complete: false }
      : { id: "open", label: "FINDING NOT YET SUPPORTED", verified: true, complete: false };
  }
  if (verified.healthy) return {
    id: evidenceFirst ? "restored-evidence" : "restored-unprobed",
    label: evidenceFirst ? "RESTORED SAFELY · INVESTIGATED BEFORE CHANGING" : "RESTORED SAFELY · CHANGED BEFORE INSPECTING",
    verified: true, complete: true
  };
  if (verified.serviceOk && verified.risk) return { id: "unsafe", label: "RESTORED · UNSAFE SETTING STILL IN PLACE", verified: true, complete: false };
  return { id: "open", label: "NOT RESTORED YET", verified: true, complete: false };
}

function dnsFindingItems(final) {
  const items = [];
  const f = assessDnsFinding(final);
  const h = f.hypothesis;
  const checked = ["FLOW_SCOPE", "RESOLVER_START"].filter(id => final.evidence.includes(id))
    .map(id => '"' + DNS_EVIDENCE.find(e => e.id === id).label + '"');
  // The mission text for a "contradicted" verdict says evidence contradicts the hypothesis; zero-row
  // sources can only fail to support or exclude it, so this report says that instead.
  const hypothesisText = h.verdict === "contradicted"
    ? "What you collected about what the empty sources could see (" + checked.join(" and ") + ") shows they could not have recorded these queries, so they do not support this hypothesis. They do not exclude the activity either."
    : h.text;
  items.push({ tag: h.verdict === "supported" ? "SUPPORTED" : "NOT SUPPORTED", text: "Final hypothesis: " + (final.hypothesis ? DNS_HYPOTHESES.find(x => x.id === final.hypothesis).label : "none") + " " + hypothesisText, basis: [] });
  for (const c of f.claims) {
    const tag = c.verdict === "justified" ? "JUSTIFIED" : c.verdict === "unset" ? "NOT LABELED" : c.verdict === "incorrect" ? "REVIEW" : "NO EVIDENCE YET";
    const text = c.verdict === "unset" ? "Not labeled: " + c.claim
      : "Marked " + c.chosen.toUpperCase() + ": " + c.claim + " " + c.text;
    items.push({ tag, text, basis: [] });
  }
  return items;
}

/**
 * Build the debrief for one mission from its journal. The journal is replayed first, so every
 * statement is a function of recorded inputs only. Returns plain, JSON-safe data.
 */
export function buildFeedback(missionId, journal) {
  const m = adapter(missionId);
  const replay = replayMission(missionId, journal);
  const events = replay.steps.slice(1).map((s, i) => ({ ...s, index: i + 1 }));
  const start = replay.steps[0].after;
  const final = replay.final;
  const current = m.test(final);
  const tests = events.filter(e => e.kind === "test");
  const changes = events.filter(e => e.kind === "change");
  const undos = events.filter(e => e.kind === "undo");
  const hints = events.filter(e => e.kind === "hint");

  markUndone(events);
  const firstChange = changes[0];
  const kept = changes.filter(c => !c.undoneAt);
  const evidenceChecks = kept.map(c => {
    const required = m.requires(c.op);
    return required ? c.before.inspections.includes(required) : true;
  });
  const evidenceFirst = kept.length > 0 && evidenceChecks.every(Boolean);
  const outcome = outcomeFor(m, final, current, tests.length, changes.length, evidenceFirst);

  const evidence = describeInspections(m, events, final);
  const moves = consequenceItems(m, events);
  if (m.id !== dnsAdapter.id && firstChange && firstChange.before.inspections.length === 0) {
    moves.unshift({ tag: "ORDER", text: "Your first change (step " + firstChange.sequence + ") came before you opened any source of evidence.", basis: [firstChange.sequence] });
  }
  if (m.id === dnsAdapter.id) {
    const hyps = events.filter(e => e.kind === "hypothesis");
    for (const e of hyps) {
      const n = e.before.evidence.length;
      moves.unshift({ tag: n ? "HYPOTHESIS" : "BEFORE EVIDENCE", text: "Step " + e.sequence + ": " + sentence(e.description) + " " + (n ? n + " of " + DNS_EVIDENCE.length + " sources were on your timeline." : "No source was on your timeline yet."), basis: [e.sequence] });
    }
    moves.sort((a, b) => a.basis[0] - b.basis[0]);
    if (hints.length) moves.push({ tag: "HINTS", text: "You asked for " + hints.length + (hints.length === 1 ? " hint" : " hints") + " (" + stepWord(seqs(hints)) + ").", basis: seqs(hints) });
    // Zero-row results are only informative if the source could have seen the traffic.
    for (const [rowId, scopeId, source] of [["FLOW_ZERO", "FLOW_SCOPE", "VPC Flow Logs"], ["RESOLVER_ROWS", "RESOLVER_START", "Resolver query logs"]]) {
      if (final.evidence.includes(rowId) && !final.evidence.includes(scopeId)) {
        moves.push({ tag: "UNCHECKED", text: "You collected the empty " + source + " result without opening what that source could see (" + DNS_EVIDENCE.find(e => e.id === scopeId).label + ").", basis: [] });
      }
    }
  }
  moves.push(...otherEvents(events));
  if (!moves.length) moves.push({ tag: "NONE YET", text: "No configuration change has been made yet.", basis: [] });

  const finalHealthy = current.healthy;
  const scope = scopeItems(m, start, final, finalHealthy);
  const sections = [
    { id: "evidence", title: m.id === dnsAdapter.id ? "Sources you put on the timeline" : "Evidence you gathered", items: evidence }
  ];
  if (m.id === dnsAdapter.id) sections.push({ id: "finding", title: "Your finding", items: dnsFindingItems(final) });
  sections.push({ id: "moves", title: "What you did and what the tests showed", items: moves });
  sections.push({ id: "scope", title: "Scope of the final configuration", items: scope.items });

  const lastChange = changes[changes.length - 1];
  const lastTest = tests[tests.length - 1];
  const verification = [];
  if (!tests.length) verification.push({ tag: "NOT TESTED", text: "You have not run the test yet.", basis: [] });
  else if (final.lastTest) verification.push({ tag: final.lastTest.healthy ? "VERIFIED" : "TESTED", text: "Latest test (step " + lastTest.sequence + ") on the current configuration: " + final.lastTest.status + ".", detail: m.quoteExplanation ? final.lastTest.explanation : "", basis: [lastTest.sequence] });
  else verification.push({ tag: "STALE", text: "Your last test (step " + lastTest.sequence + ") no longer matches the configuration" + (lastChange && lastChange.sequence > lastTest.sequence ? ", which changed at step " + lastChange.sequence : "") + ". Running it on the current configuration would report: " + current.status + ".", basis: [lastTest.sequence] });
  verification.push({ tag: "COUNT", text: tests.length + (tests.length === 1 ? " test" : " tests") + " run, " + changes.length + (changes.length === 1 ? " change" : " changes") + " made, " + undos.length + (undos.length === 1 ? " undo" : " undos") + ".", basis: [] });
  if (m.id === natAdapter.id && final.lastTest) verification.push({ tag: final.lastTest.shared.ok ? "SHARED OK" : "SHARED FAILING", text: "The second private subnet that shares the NAT gateway (" + final.lastTest.shared.subnet + ") " + (final.lastTest.shared.ok ? "passed" : "failed") + " in that test.", basis: [lastTest.sequence] });
  if (m.id === natAdapter.id && changes.some(c => c.op.action.type === "RECREATE_NAT" || (c.op.action.table === "nat"))) {
    const checked = (c => c.before.inspections.includes("NAT_USERS"));
    const shared = changes.filter(c => c.op.action.type === "RECREATE_NAT" || c.op.action.table === "nat");
    const unchecked = shared.filter(c => !checked(c));
    verification.push(unchecked.length
      ? { tag: "BLAST RADIUS", text: "You changed the NAT gateway or the NAT subnet route table (" + stepWord(seqs(unchecked)) + ") before opening who else sends traffic to nat-0abc.", basis: seqs(unchecked) }
      : { tag: "BLAST RADIUS", text: "You opened who else sends traffic to nat-0abc before changing the NAT gateway or its route table.", basis: seqs(shared) });
  }
  if (m.id === dnsAdapter.id) {
    const notes = dnsSettingNotes(final.config);
    for (const note of notes) verification.push({ tag: "SETTING NOTE", text: note, basis: [] });
    verification.push({ tag: "FIXED", text: "The 12:00-12:20 window stays unknown whatever you configure; settings change only later events.", basis: [] });
  }
  sections.push({ id: "verification", title: "Verification", items: verification });

  const rollback = scope.diffs.length
    ? scope.diffs.map(d => ({ tag: "ROLL BACK", text: "To return to the starting state, set " + d.label + " back to: " + d.from + ".", basis: [] }))
    : [{ tag: "KEPT", text: "Nothing differs from the starting state, so there is nothing to roll back.", basis: [] }];
  rollback.push({ tag: "UNDO", text: "The workbench can still undo " + final.history.length + (final.history.length === 1 ? " change" : " changes") + " in order.", basis: [] });
  sections.push({ id: "rollback", title: "Rollback readiness", items: rollback });

  const criteria = m.id === dnsAdapter.id
    ? [
      { id: "supported", text: "Your hypothesis is one your timeline supports.", met: current.finding.hypothesis.verdict === "supported" },
      { id: "labeled", text: "Every statement is labeled and none is labeled against the evidence you collected.", met: current.finding.unset === 0 && current.finding.incorrect === 0 },
      { id: "coverage", text: "Resolver logging and host telemetry are on for later events.", met: dnsCoverage(final.config) },
      { id: "narrow", text: "No packet capture on every instance.", met: final.config.packetCapture !== "all" },
      { id: "verified", text: "A test ran after your last change.", met: Boolean(final.lastTest) }
    ]
    : [
      { id: "restored", text: "The service works in the model.", met: current.serviceOk },
      { id: "safe", text: "No setting broader than the task needs is left in place.", met: current.serviceOk && !current.risk },
      { id: "inspected", text: "Each change you kept followed opening the setting it edits.", met: evidenceFirst },
      { id: "verified", text: "A test ran after your last change.", met: Boolean(final.lastTest) }
    ];
  const complete = outcome.complete;
  return {
    version: MISSION_FEEDBACK_VERSION, missionId, title: m.title, notice: FEEDBACK_NOTICE,
    outcome, criteria, sections, complete,
    limits: m.limits.map(l => ({ ...l })),
    stats: { steps: events.length, inspections: events.filter(e => e.op.t === "inspect" || e.op.t === "evidence").length,
      changes: changes.length, undos: undos.length, tests: tests.length, hints: hints.length }
  };
}

/** Plain text of the feedback, short enough for the optional notes (4000 character fields). */
export function feedbackToText(feedback) {
  const lines = ["[MISSION REVIEW | SYNTHETIC | v" + feedback.version + "] " + feedback.title, "Outcome: " + feedback.outcome.label,
    ...feedback.criteria.map(c => (c.met ? "[x] " : "[ ] ") + c.text)];
  for (const section of feedback.sections) {
    if (section.id === "evidence" || section.id === "moves" || section.id === "scope") {
      lines.push(section.title.toUpperCase());
      for (const item of section.items) lines.push("- " + item.text);
    }
  }
  lines.push(feedback.notice);
  const text = lines.join("\n");
  return text.length > 3200 ? text.slice(0, 3197) + "..." : text;
}
