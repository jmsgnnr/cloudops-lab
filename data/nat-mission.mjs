/**
 * NAT Egress Incident: deterministic, offline teaching model (v1).
 * This is NOT an AWS VPC simulator. It models one outbound HTTPS probe through
 * two or three route tables, one public NAT gateway, one internet gateway and a
 * transit gateway that has no internet path. Network ACLs, return routing,
 * DNS, VPC endpoints and TGW route tables are outside this narrow scenario
 * (the case evidence states NACLs and DNS are healthy).
 * Resource names and CIDRs come from the existing private-nat-v1 case. The
 * second private subnet that shares the NAT gateway is a workbench addition.
 */
export const NAT_MISSION_VERSION = 1;
export const NAT_TARGETS = Object.freeze(["igw-0edge", "nat-0abc", "tgw-0central"]);
export const NAT_TABLES = Object.freeze({
  app: { label: "App subnet route table", subnet: "10.20.10.0/24" },
  nat: { label: "NAT subnet route table", subnet: "10.20.1.0/24" }
});
export const NAT_VPC_CIDR = "10.20.0.0/16";
export const NAT_PROBE = Object.freeze({
  source: "10.20.10.20", destination: "203.0.113.10", port: 443,
  sharedSubnet: "10.20.12.0/24"
});
export const NAT_INSPECTIONS = Object.freeze([
  { id: "APP_ROUTES", label: "Open the app subnet route table", detail: "Subnet 10.20.10.0/24 holds the failing instances." },
  { id: "NAT_ROUTES", label: "Open the NAT subnet route table", detail: "Subnet 10.20.1.0/24 holds nat-0abc." },
  { id: "NAT_USERS", label: "Who else sends traffic to nat-0abc?", detail: "Check the shared blast radius before changing anything." },
  { id: "APP_SG", label: "Check the app security group", detail: "Look at the outbound rule on the app instance." }
]);
export const NAT_ACTIONS = Object.freeze([
  { id: "NAT_TO_APP_SUBNET", action: { type: "RECREATE_NAT", subnet: "app" }, label: "Recreate the NAT gateway in the app subnet",
    detail: "Looks tidy, but the app subnet is private (unsafe shortcut).", unsafe: true },
  { id: "NAT_TO_NAT_SUBNET", action: { type: "RECREATE_NAT", subnet: "nat" }, label: "Recreate the NAT gateway in the NAT subnet",
    detail: "Return the gateway to subnet 10.20.1.0/24." },
  { id: "SG_ALL", action: { type: "SET_APP_EGRESS", mode: "all" }, label: "Allow all outbound traffic on the app security group",
    detail: "Security change only. It does not add a route (unsafe shortcut).", unsafe: true },
  { id: "SG_HTTPS", action: { type: "SET_APP_EGRESS", mode: "https" }, label: "Restore HTTPS-only outbound on the app security group",
    detail: "Return to the original TCP 443 rule." }
]);
export const NAT_REFERENCES = Object.freeze([
  { label: "NAT gateway use cases", url: "https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-scenarios.html" },
  { label: "Route table concepts and longest-prefix match", url: "https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Route_Tables.html" },
  { label: "Internet gateway requirements", url: "https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Internet_Gateway.html" }
]);

const EDITABLE = ["app", "nat"];
const LOCAL = { destination: NAT_VPC_CIDR, target: "local" };
const ACTION_TYPES = ["ADD_ROUTE", "REPLACE_ROUTE", "REMOVE_ROUTE", "RECREATE_NAT", "SET_APP_EGRESS"];

/* ---------- small pure IPv4 helpers ---------- */
export function parseCidr(text) {
  if (typeof text !== "string") return null;
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/.exec(text.trim());
  if (!match) return null;
  const octets = match.slice(1, 5).map(Number);
  const prefix = Number(match[5]);
  if (octets.some(n => n > 255) || prefix > 32) return null;
  const base = ((octets[0] * 2 ** 24) + (octets[1] << 16) + (octets[2] << 8) + octets[3]) >>> 0;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  if ((base & mask) >>> 0 !== base) return null;
  return { base, mask, prefix, text: octets.join(".") + "/" + prefix };
}
function ipToInt(ip) {
  const o = ip.split(".").map(Number);
  return ((o[0] * 2 ** 24) + (o[1] << 16) + (o[2] << 8) + o[3]) >>> 0;
}
function cidrContains(cidr, ipInt) {
  return ((ipInt & cidr.mask) >>> 0) === cidr.base;
}
/** Longest-prefix match among routes; ties are impossible because destinations are unique. */
export function lookupRoute(routes, ip) {
  const ipInt = ipToInt(ip);
  let best = null;
  for (const route of routes) {
    const cidr = parseCidr(route.destination);
    if (cidr && cidrContains(cidr, ipInt) && (!best || cidr.prefix > best.prefix)) best = { route, prefix: cidr.prefix };
  }
  return best ? best.route : null;
}

/* ---------- state ---------- */
function freshRoutes() {
  return {
    app: [{ ...LOCAL }, { destination: "0.0.0.0/0", target: "nat-0abc" }],
    nat: [{ ...LOCAL }, { destination: "0.0.0.0/0", target: "tgw-0central" }],
    shared: [{ ...LOCAL }, { destination: "0.0.0.0/0", target: "nat-0abc" }]
  };
}
function snapshot(state) {
  return {
    routes: { app: state.routes.app.map(r => ({ ...r })), nat: state.routes.nat.map(r => ({ ...r })), shared: state.routes.shared.map(r => ({ ...r })) },
    natSubnet: state.natSubnet, appEgress: state.appEgress
  };
}
function validRoutes(list) {
  return Array.isArray(list) && list.every(r => r && typeof r.destination === "string" && parseCidr(r.destination) &&
    (r.target === "local" || NAT_TARGETS.includes(r.target))) &&
    new Set(list.map(r => r.destination)).size === list.length;
}
function assertState(state) {
  if (!state || state.version !== NAT_MISSION_VERSION || !state.routes ||
      !validRoutes(state.routes.app) || !validRoutes(state.routes.nat) || !validRoutes(state.routes.shared) ||
      !["app", "nat"].includes(state.natSubnet) || !["https", "all"].includes(state.appEgress) ||
      !Array.isArray(state.history) || !Array.isArray(state.journal) ||
      !Array.isArray(state.inspections) || !Number.isSafeInteger(state.sequence)) {
    throw new Error("invalid_nat_mission_state");
  }
}
/** `op` is the replayable input that produced the event (see data/mission-feedback.mjs). */
function withEvent(state, kind, description, details = {}, op = null) {
  const sequence = state.sequence + 1;
  return { ...state, ...details, sequence, journal: [...state.journal, { sequence, kind, description, op }] };
}
const ACTION_FIELDS = ["type", "table", "destination", "target", "subnet", "mode"];
const recorded = action => Object.fromEntries(ACTION_FIELDS.filter(k => k in action).map(k => [k, action[k]]));
export function newNatMission() {
  return { version: NAT_MISSION_VERSION, routes: freshRoutes(), natSubnet: "nat", appEgress: "https",
    inspections: [], history: [], journal: [], sequence: 0, lastTest: null, finding: null };
}

/* ---------- packet trace ---------- */
function hop(key, label, ok, detail) { return { key, label, ok, detail }; }
function runTrace(config, tableKey) {
  const { source, destination, port } = NAT_PROBE;
  const trace = [];
  const done = () => ({ trace, ok: trace.every(h => h.ok), failure: trace.find(h => !h.ok) || null, egressRoute });
  let egressRoute = null;
  const sg = tableKey === "app" && config.appEgress === "all"
    ? "Security group allows all outbound traffic (broader than the HTTPS need)."
    : "Security group allows outbound TCP 443.";
  trace.push(hop("instance", "Private instance " + (tableKey === "app" ? source : "in " + NAT_PROBE.sharedSubnet), true, sg));

  const own = config.routes[tableKey];
  const ownLabel = tableKey === "app" ? NAT_TABLES.app.label : "Shared-NAT subnet route table";
  const first = lookupRoute(own, destination);
  if (!first) {
    trace.push(hop("route-" + tableKey, ownLabel, false, "No route matches " + destination + ". Traffic with no matching route is dropped."));
    return done();
  }
  trace.push(hop("route-" + tableKey, ownLabel, true, "Best match " + first.destination + " sends the packet to " + first.target + "."));
  if (first.target === "igw-0edge") {
    trace.push(hop("igw", "Internet gateway igw-0edge", false,
      "The instance has no public IPv4 address or Elastic IP, so the internet gateway cannot translate its private source address and the packet is dropped. A subnet routed to an internet gateway is a public subnet; this one holds private instances."));
    return done();
  }
  if (first.target === "tgw-0central") {
    trace.push(hop("tgw", "Transit gateway tgw-0central", false,
      "No transit gateway route leads to the internet in this scenario, so the packet is dropped. A transit gateway is not an internet exit by itself."));
    return done();
  }
  if (first.target !== "nat-0abc") {
    trace.push(hop("route-" + tableKey, ownLabel, false, "The match resolves to " + first.target + ", which is not an egress target here."));
    return done();
  }

  const natTable = config.natSubnet === "nat" ? "nat" : "app";
  const natPlace = config.natSubnet === "nat" ? "NAT subnet 10.20.1.0/24" : "app subnet 10.20.10.0/24 (private)";
  trace.push(hop("nat", "NAT gateway nat-0abc", true,
    "Translates the instance's source address to the NAT gateway's own private IPv4 address; the internet gateway later maps that to the Elastic IP. It currently lives in the " + natPlace + "; its own egress follows that subnet's route table."));
  const egressLabel = config.natSubnet === "nat" ? NAT_TABLES.nat.label : NAT_TABLES.app.label + " (where the NAT gateway now sits)";
  const second = lookupRoute(config.routes[natTable], destination);
  if (!second) {
    trace.push(hop("route-nat", egressLabel, false, "No route matches " + destination + " after translation, so the NAT gateway has nowhere to send it."));
    return done();
  }
  egressRoute = { table: natTable, ...second };
  trace.push(hop("route-nat", egressLabel, second.target === "igw-0edge" || second.target === "tgw-0central",
    second.target === "igw-0edge"
      ? "Best match " + second.destination + " sends the translated packet to igw-0edge."
      : second.target === "tgw-0central"
        ? "Best match " + second.destination + " sends the translated packet to tgw-0central instead of the internet gateway. It still carries the NAT gateway's private source address."
        : "Best match " + second.destination + " points back at nat-0abc itself. A public NAT gateway needs a route to an internet gateway, which makes its subnet public."));
  if (second.target === "tgw-0central") {
    trace.push(hop("tgw", "Transit gateway tgw-0central", false,
      "No transit gateway route leads to the internet in this scenario, so the packet is dropped. A transit gateway is not an internet exit by itself."));
    return done();
  }
  if (second.target !== "igw-0edge") return done();
  trace.push(hop("igw", "Internet gateway igw-0edge", true, "Attached to the VPC; maps the NAT gateway's private source address to its Elastic IP and forwards the packet."));
  trace.push(hop("dest", "HTTPS endpoint " + destination + ":" + port, true, "Synthetic endpoint reached. No real packets were sent."));
  return done();
}

function egressScope(state, route) {
  const table = NAT_TABLES[route.table].label;
  if (parseCidr(route.destination).prefix === 0) {
    return "The " + table + " matches " + route.destination + " -> igw-0edge, so every internet destination without a more specific route uses the internet gateway.";
  }
  const dflt = state.routes[route.table].find(r => r.destination === "0.0.0.0/0");
  return "The " + table + " matches only " + route.destination + " -> igw-0edge. Other internet destinations " +
    (dflt ? "still follow 0.0.0.0/0 -> " + dflt.target + "." : "have no route and are dropped.");
}
export function testNatMission(state) {
  assertState(state);
  const app = runTrace(state, "app");
  const shared = runTrace(state, "shared");
  const risk = state.appEgress === "all";
  const serviceOk = app.ok;
  const healthy = serviceOk && shared.ok && !risk;
  const passedHops = app.trace.filter(h => h.ok).length;
  const where = app.failure ? app.failure.label : "";
  const status = healthy ? "HTTPS REACHABLE · SHARED NAT VERIFIED"
    : serviceOk && risk ? "HTTPS REACHABLE · BROADER THAN NEEDED"
    : serviceOk ? "HTTPS REACHABLE · SHARED SUBNET STILL FAILING"
    : "HTTPS TIMEOUT · DROPPED AT " + where.toUpperCase();
  const explanation = healthy
    ? "The probe now leaves the app subnet through nat-0abc. " + egressScope(state, app.egressRoute) + " The second private subnet that shares the NAT gateway also passes. Other layers (NACL return ports, DNS, TGW route tables) are not simulated."
    : serviceOk && risk
      ? "The path works, but the app security group now allows all outbound traffic. That change was not needed for routing. Undo it and keep the TCP 443 rule."
      : serviceOk
        ? "The app probe passes but the shared subnet's probe fails. Check what else uses nat-0abc before declaring recovery."
        : app.failure.detail + (risk ? " The broader security group rule did not help because the failure is a routing problem." : "");
  const sharedText = shared.ok ? "passes" : "fails at " + shared.failure.label;
  const result = {
    status, healthy, serviceOk, risk, explanation,
    trace: app.trace, firstFailure: app.failure ? { label: app.failure.label, reason: app.failure.detail } : null,
    shared: { subnet: NAT_PROBE.sharedSubnet, ok: shared.ok, failure: shared.failure ? shared.failure.label : null },
    hopsPassed: passedHops,
    evidence: "SYNTHETIC HTTPS probe " + NAT_PROBE.source + " to " + NAT_PROBE.destination + ":443; hops passed: " + passedHops +
      " of " + app.trace.length + "; first drop: " + (app.failure ? app.failure.label : "none") +
      "; shared subnet " + NAT_PROBE.sharedSubnet + " " + sharedText + "; security group: " + (risk ? "all outbound" : "TCP 443 only")
  };
  return { state: withEvent(state, "test", "Packet trace: " + status, { lastTest: result, finding: result.evidence }, { t: "test" }), result };
}

/* ---------- inspection ---------- */
const rows = routes => routes.map(r => r.destination + " -> " + r.target).join("; ");
export function inspectNatMission(state, id) {
  assertState(state);
  if (!NAT_INSPECTIONS.some(item => item.id === id)) throw new Error("invalid_nat_inspection");
  const finding = id === "APP_ROUTES" ? NAT_TABLES.app.label + " (" + NAT_TABLES.app.subnet + "): " + rows(state.routes.app)
    : id === "NAT_ROUTES" ? NAT_TABLES.nat.label + " (" + NAT_TABLES.nat.subnet + "): " + rows(state.routes.nat) +
        ". NAT gateway nat-0abc currently sits in the " + (state.natSubnet === "nat" ? "NAT subnet." : "app subnet.")
    : id === "NAT_USERS" ? "Subnets with 0.0.0.0/0 -> nat-0abc: app subnet " + NAT_TABLES.app.subnet + " and a second private subnet " +
        NAT_PROBE.sharedSubnet + ". Any change to the NAT gateway or to the NAT subnet route table affects both."
    : "App security group: " + (state.appEgress === "https" ? "outbound TCP 443 allowed." : "all outbound traffic allowed.");
  return withEvent(state, "inspect", "Inspected " + id.toLowerCase().replaceAll("_", " "), {
    inspections: [...new Set([...state.inspections, id])], finding
  }, { t: "inspect", id });
}

/* ---------- changes ---------- */
function shape(action) {
  if (!action || typeof action !== "object" || !ACTION_TYPES.includes(action.type)) return false;
  if (action.type === "RECREATE_NAT") return action.subnet === "app" || action.subnet === "nat";
  if (action.type === "SET_APP_EGRESS") return action.mode === "https" || action.mode === "all";
  if (!EDITABLE.includes(action.table) || typeof action.destination !== "string" || action.destination.length > 32) return false;
  return action.type === "REMOVE_ROUTE" || NAT_TARGETS.includes(action.target);
}
/** Pure evaluation of one action: no journal, no mutation. */
function evaluate(state, action) {
  if (!shape(action)) throw new Error("invalid_nat_action");
  const next = snapshot(state);
  const reject = message => ({ outcome: "rejected", message });
  const same = message => ({ outcome: "noop", message });
  if (action.type === "RECREATE_NAT") {
    if (state.natSubnet === action.subnet) return same("The NAT gateway is already in that subnet. Your last test is still valid.");
    next.natSubnet = action.subnet;
    return { outcome: "change", next, label: "Recreated nat-0abc in the " + (action.subnet === "nat" ? "NAT" : "app") + " subnet",
      message: "NAT gateway recreated in the " + (action.subnet === "nat" ? "NAT subnet" : "app subnet") + ". A NAT gateway cannot be moved, so this model replaces it and keeps the Elastic IP. Run the packet trace." };
  }
  if (action.type === "SET_APP_EGRESS") {
    if (state.appEgress === action.mode) return same("That security group rule was already in place. Your last test is still valid.");
    next.appEgress = action.mode;
    return { outcome: "change", next, label: action.mode === "all" ? "Allowed all outbound traffic on the app security group" : "Restored HTTPS-only outbound on the app security group",
      message: "Security group changed. This does not alter any route. Run the packet trace." };
  }
  const tableName = NAT_TABLES[action.table].label;
  const destination = parseCidr(action.destination);
  if (!destination) return reject("Rejected: " + JSON.stringify(action.destination.slice(0, 32)) + " is not a valid IPv4 CIDR with zero host bits (for example 0.0.0.0/0). Nothing changed.");
  const dest = destination.text;
  const list = next.routes[action.table];
  const existing = list.find(r => r.destination === dest);
  if (action.type === "ADD_ROUTE") {
    if (existing) return reject("Rejected: " + dest + " already exists in the " + tableName + " (" + existing.target + "). Use replace instead. Nothing changed.");
    if (cidrContains(parseCidr(NAT_VPC_CIDR), destination.base)) return reject("Rejected: " + dest + " falls inside the VPC range " + NAT_VPC_CIDR + ", which this workbench keeps on the local route. Nothing changed.");
    list.push({ destination: dest, target: action.target });
    return { outcome: "change", next, label: "Added " + dest + " -> " + action.target + " in the " + tableName,
      message: "Route added to the " + tableName + ". Run the packet trace to see the new path." };
  }
  if (!existing) return reject("Rejected: " + dest + " is not in the " + tableName + ". Nothing changed.");
  if (existing.target === "local") return reject("Rejected: the local route cannot be edited or removed. Nothing changed.");
  if (action.type === "REMOVE_ROUTE") {
    next.routes[action.table] = list.filter(r => r !== existing);
    return { outcome: "change", next, label: "Removed " + dest + " (" + existing.target + ") from the " + tableName,
      message: "Route removed from the " + tableName + ". Traffic that matched it now falls back to a shorter match or is dropped. Run the packet trace." };
  }
  if (existing.target === action.target) return same(dest + " already points to " + action.target + " in the " + tableName + ". Your last test is still valid.");
  const before = existing.target;
  existing.target = action.target;
  return { outcome: "change", next, label: "Replaced " + dest + " in the " + tableName + ": " + before + " to " + action.target,
    message: "Route target replaced (" + before + " to " + action.target + "). Run the packet trace." };
}
export function previewNatChange(state, action) {
  assertState(state);
  const r = evaluate(state, action);
  const current = (action.type === "REPLACE_ROUTE" || action.type === "REMOVE_ROUTE") && NAT_TABLES[action.table]
    ? state.routes[action.table].find(x => x.destination === action.destination) : null;
  return { outcome: r.outcome, current: current ? current.target : null,
    candidate: action.type === "REMOVE_ROUTE" ? "(removed)" : action.target || null,
    summary: r.outcome === "change" ? "Would apply: " + r.label : r.message };
}
export function changeNatMission(state, action) {
  assertState(state);
  const r = evaluate(state, action);
  if (r.outcome !== "change") {
    return withEvent(state, r.outcome, r.outcome === "noop" ? "No configuration change" : "Change rejected", { finding: r.message }, { t: "change", action: recorded(action) });
  }
  return withEvent(state, "change", r.label + " (virtual only)", {
    routes: r.next.routes, natSubnet: r.next.natSubnet, appEgress: r.next.appEgress,
    history: [...state.history, { ...snapshot(state), action: r.label }],
    lastTest: null, finding: r.message
  }, { t: "change", action: recorded(action) });
}
export function undoNatMission(state) {
  assertState(state);
  if (!state.history.length) return withEvent(state, "noop", "Nothing to undo", { finding: "No configuration change to undo." }, { t: "undo" });
  const previous = state.history[state.history.length - 1];
  return withEvent(state, "undo", "Undid: " + previous.action + " (virtual only)", {
    routes: previous.routes, natSubnet: previous.natSubnet, appEgress: previous.appEgress,
    history: state.history.slice(0, -1), lastTest: null,
    finding: "Last configuration change reversed. Retrace to verify the current state."
  }, { t: "undo" });
}
