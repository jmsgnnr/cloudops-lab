import { SANDBOX_SCENARIOS, newSandboxState, simulateSandbox } from "./data/playable-sandboxes.mjs";
import { IAM_ACTIONS, IAM_INSPECTIONS, newIamMission, inspectIamMission,
  changeIamMission, undoIamMission, testIamMission } from "./data/iam-mission.mjs";
import { NAT_ACTIONS, NAT_INSPECTIONS, NAT_TABLES, NAT_TARGETS, NAT_PROBE, NAT_REFERENCES, newNatMission, inspectNatMission,
  changeNatMission, previewNatChange, undoNatMission, testNatMission } from "./data/nat-mission.mjs";
const $ = id => document.getElementById(id);
let incidentId = null;
let state = null;
let result = null;
let attempts = 0;
let notifyTest = null;
let iamState = null;
let natState = null;
let natDrafts = {};

function node(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  el.textContent = text;
  return el;
}
function status() {
  const badge = $("playable-badge");
  badge.textContent = result ? result.status : "CHANGES NOT TESTED";
  badge.classList.toggle("is-healthy", Boolean(result?.healthy));
  badge.classList.toggle("is-risk", Boolean(result?.risk));
  $("playable-attempts").textContent = `${attempts} TEST${attempts===1?"":"S"}`;
  $("playable-result").hidden = !result;
  if (result) {
    $("playable-verdict").textContent = result.status;
    $("playable-explanation").textContent = result.explanation;
    $("playable-evidence").textContent = result.evidence;
    const scenario = SANDBOX_SCENARIOS[incidentId];
    const link = $("playable-source");
    link.hidden = !scenario.reference;
    if (scenario.reference) {
      link.href = scenario.reference.url;
      link.textContent = `${scenario.reference.label} ↗`;
    }
  }
  for (const [i,el] of [...$("playable-topology").children].entries()) {
    if (natState) {
      if (!el.dataset.hop) continue;
      const entry = result?.trace?.find(item => item.key === el.dataset.hop);
      el.classList.toggle("is-reachable", Boolean(entry?.ok));
      el.classList.toggle("is-dropped", Boolean(entry && !entry.ok));
      continue;
    }
    el.classList.toggle("is-reachable",Boolean(result?.serviceOk) && i===$("playable-topology").children.length-1);
  }
}

function renderIamControls(focusKey = null) {
  const host = $("playable-controls");
  host.replaceChildren();
  host.classList.add("is-iam-mission");

  host.append(node("p", "iam-mission-context",
    "ALERT: The reporting job cannot read its daily file. Inspect the synthetic environment, change one policy setting, then RUN TEST. Undo mistakes as needed."));

  const makeGroup = (title, entries, mode) => {
    const section = document.createElement("section");
    section.className = "iam-mission-group";
    section.append(node("h5", "", title));
    const choices = node("div", "iam-mission-choices", "");
    for (const option of entries) {
      const button = node("button", "iam-mission-action", "");
      button.type = "button";
      button.dataset[mode] = option.id;
      button.append(node("strong", "", option.label), node("small", "", option.detail));
      if (option.id === "WILDCARD_BOUNDARY") button.classList.add("is-unsafe");
      button.addEventListener("click", () => {
        if (mode === "inspection") {
          iamState = inspectIamMission(iamState, option.id);
        } else {
          iamState = changeIamMission(iamState, option.id);
          result = iamState.lastTest;
          status();
          notifyTest?.(result);
        }
        renderIamControls(mode + ":" + option.id);
      });
      choices.append(button);
    }
    section.append(choices);
    host.append(section);
  };

  makeGroup("01 / INSPECT SIGNALS", IAM_INSPECTIONS, "inspection");
  makeGroup("02 / CHANGE VIRTUAL IAM", IAM_ACTIONS, "action");

  const undo = node("button", "outline-button iam-mission-undo", "↶ UNDO LAST CONFIG CHANGE");
  undo.type = "button";
  undo.disabled = iamState.history.length === 0;
  undo.dataset.undo = "last";
  undo.addEventListener("click", () => {
    iamState = undoIamMission(iamState);
    result = null;
    status();
    notifyTest?.(null);
    renderIamControls("undo:last");
  });
  host.append(undo);

  const finding = node("p", "iam-mission-finding", iamState.finding ||
    "Start with any inspection or make a change directly. All operations are simulated.");
  finding.setAttribute("role", "status");
  finding.setAttribute("aria-live", "polite");
  host.append(finding);

  const log = document.createElement("section");
  log.className = "iam-mission-history";
  log.append(node("h5", "", "ACTION HISTORY / LATEST FIRST"));
  const list = document.createElement("ol");
  for (const item of [...iamState.journal].reverse().slice(0, 8)) {
    list.append(node("li", "", String(item.sequence).padStart(2, "0") + " · " + item.description));
  }
  if (!list.children.length) list.append(node("li", "", "No actions yet. Your first test is available now."));
  log.append(list);
  host.append(log);

  if (focusKey) {
    const [kind, id] = focusKey.split(":");
    const focused = kind === "undo" ? (undo.disabled ? $("playable-test") : undo) : [...host.querySelectorAll("button")].find(
      candidate => candidate.dataset[kind] === id);
    focused?.focus({ preventScroll: true });
  }
}


function natKey(...parts) { return parts.join("|"); }
function natRender(focusKey = null) {
  const host = $("playable-controls");
  host.replaceChildren();
  host.classList.remove("is-iam-mission");
  host.classList.add("is-nat-mission");
  host.append(node("p", "iam-mission-context",
    "ALERT: Instances in the app subnet time out on outbound HTTPS. DNS works. Open the route tables, trace the packet, change the smallest thing, then RUN TEST. Undo mistakes as needed."));

  const afterAction = (next, key) => {
    natState = next;
    result = natState.lastTest;
    status();
    notifyTest?.(result);
    natRender(key);
  };

  const inspectGroup = document.createElement("section");
  inspectGroup.className = "iam-mission-group";
  inspectGroup.append(node("h5", "", "01 / INSPECT SIGNALS"));
  const inspectChoices = node("div", "iam-mission-choices", "");
  for (const option of NAT_INSPECTIONS) {
    const button = node("button", "iam-mission-action", "");
    button.type = "button";
    button.dataset.inspection = option.id;
    button.dataset.focus = natKey("inspect", option.id);
    button.setAttribute("aria-pressed", String(natState.inspections.includes(option.id)));
    button.append(node("strong", "", option.label), node("small", "", option.detail));
    button.addEventListener("click", () => {
      natState = inspectNatMission(natState, option.id);
      natRender(natKey("inspect", option.id));
    });
    inspectChoices.append(button);
  }
  inspectGroup.append(inspectChoices);
  const notes = natState.inspections.filter(id => id === "NAT_USERS" || id === "APP_SG");
  if (notes.length) {
    const list = document.createElement("ul");
    list.className = "nat-notes";
    for (const id of notes) list.append(node("li", "", inspectNatMission(natState, id).finding));
    inspectGroup.append(list);
  }
  host.append(inspectGroup);

  const tablesOpen = ["app", "nat"].filter(key => natState.inspections.includes(key === "app" ? "APP_ROUTES" : "NAT_ROUTES"));
  const edit = document.createElement("section");
  edit.className = "iam-mission-group";
  edit.append(node("h5", "", "02 / ROUTE TABLES"));
  if (!tablesOpen.length) edit.append(node("p", "nat-empty", "No route table is open yet. Use an INSPECT button above to open one and edit its routes."));
  for (const table of tablesOpen) {
    const panel = document.createElement("section");
    panel.className = "nat-table";
    const headingId = "nat-heading-" + table;
    panel.setAttribute("aria-labelledby", headingId);
    const heading = node("h6", "", NAT_TABLES[table].label + " · " + NAT_TABLES[table].subnet);
    heading.id = headingId;
    panel.append(heading);
    if (table === "nat") panel.append(node("p", "nat-place", "NAT gateway nat-0abc is in the " + (natState.natSubnet === "nat" ? "NAT subnet." : "app subnet (private).")));
    const preview = node("p", "nat-preview", "Pick a candidate target to compare it with the current one.");
    preview.setAttribute("role", "status");
    preview.setAttribute("aria-live", "polite");
    const list = document.createElement("ul");
    list.className = "nat-routes";
    for (const route of natState.routes[table]) {
      const row = document.createElement("li");
      row.className = "nat-route";
      row.append(node("code", "", route.destination), node("span", "nat-arrow", "→"));
      if (route.target === "local") {
        row.append(node("span", "nat-local", "local (cannot be edited)"));
        list.append(row);
        continue;
      }
      const draftKey = natKey(table, route.destination);
      const select = document.createElement("select");
      select.id = "nat-target-" + table + "-" + route.destination.replace(/[^0-9]/g, "-");
      select.dataset.focus = natKey("select", table, route.destination);
      for (const target of NAT_TARGETS) {
        const option = node("option", "", target);
        option.value = target;
        select.append(option);
      }
      select.value = NAT_TARGETS.includes(natDrafts[draftKey]) ? natDrafts[draftKey] : route.target;
      const label = document.createElement("label");
      label.className = "nat-target";
      label.htmlFor = select.id;
      label.append(node("span", "", "Target for " + route.destination), select);
      const replaceAction = () => ({ type: "REPLACE_ROUTE", table, destination: route.destination, target: select.value });
      select.addEventListener("change", () => {
        natDrafts[draftKey] = select.value;
        const p = previewNatChange(natState, replaceAction());
        preview.textContent = route.destination + ": current " + route.target + ", candidate " + select.value + ". " + p.summary;
      });
      const replace = node("button", "outline-button", "REPLACE");
      replace.type = "button";
      replace.dataset.focus = natKey("replace", table, route.destination);
      replace.setAttribute("aria-label", "Replace target for " + route.destination + " in the " + NAT_TABLES[table].label);
      replace.addEventListener("click", () => {
        delete natDrafts[draftKey];
        afterAction(changeNatMission(natState, replaceAction()), natKey("replace", table, route.destination));
      });
      const remove = node("button", "outline-button is-danger", "REMOVE");
      remove.type = "button";
      remove.dataset.focus = natKey("remove", table, route.destination);
      remove.setAttribute("aria-label", "Remove route " + route.destination + " from the " + NAT_TABLES[table].label);
      remove.addEventListener("click", () => {
        delete natDrafts[draftKey];
        afterAction(changeNatMission(natState, { type: "REMOVE_ROUTE", table, destination: route.destination }), natKey("add-dest", table));
      });
      row.append(label, replace, remove);
      list.append(row);
    }
    panel.append(list, preview);

    const form = document.createElement("form");
    form.className = "nat-add";
    form.noValidate = true;
    const destId = "nat-add-dest-" + table, targetId = "nat-add-target-" + table;
    const destLabel = document.createElement("label");
    destLabel.htmlFor = destId;
    destLabel.append(node("span", "", "New route destination (CIDR)"));
    const dest = document.createElement("input");
    dest.id = destId; dest.type = "text"; dest.placeholder = "e.g. 203.0.113.0/24";
    dest.autocomplete = "off"; dest.spellcheck = false; dest.maxLength = 32;
    dest.dataset.focus = natKey("add-dest", table);
    destLabel.append(dest);
    const targetLabel = document.createElement("label");
    targetLabel.htmlFor = targetId;
    targetLabel.append(node("span", "", "New route target"));
    const target = document.createElement("select");
    target.id = targetId;
    for (const t of NAT_TARGETS) { const o = node("option", "", t); o.value = t; target.append(o); }
    targetLabel.append(target);
    const add = node("button", "outline-button", "ADD ROUTE");
    add.type = "submit";
    add.setAttribute("aria-label", "Add route to the " + NAT_TABLES[table].label);
    form.append(destLabel, targetLabel, add);
    form.addEventListener("submit", event => {
      event.preventDefault();
      const next = changeNatMission(natState, { type: "ADD_ROUTE", table, destination: dest.value, target: target.value });
      const added = next.journal.at(-1).kind === "change";
      afterAction(next, added ? natKey("replace", table, dest.value.trim()) : natKey("add-dest", table));
    });
    panel.append(form);
    edit.append(panel);
  }
  host.append(edit);

  const other = document.createElement("section");
  other.className = "iam-mission-group";
  other.append(node("h5", "", "03 / OTHER VIRTUAL CHANGES"));
  const choices = node("div", "iam-mission-choices", "");
  for (const option of NAT_ACTIONS) {
    const button = node("button", "iam-mission-action", "");
    button.type = "button";
    button.dataset.action = option.id;
    button.dataset.focus = natKey("action", option.id);
    if (option.unsafe) button.classList.add("is-unsafe");
    button.append(node("strong", "", option.label), node("small", "", option.detail));
    button.addEventListener("click", () => afterAction(changeNatMission(natState, option.action), natKey("action", option.id)));
    choices.append(button);
  }
  other.append(choices);
  host.append(other);

  const undo = node("button", "outline-button iam-mission-undo", "↶ UNDO LAST CONFIG CHANGE");
  undo.type = "button";
  undo.disabled = natState.history.length === 0;
  undo.dataset.focus = "undo";
  undo.dataset.undo = "last";
  undo.addEventListener("click", () => {
    natState = undoNatMission(natState);
    result = null;
    status();
    notifyTest?.(null);
    natRender("undo");
  });
  host.append(undo);

  const finding = node("p", "iam-mission-finding", natState.finding ||
    "Start by opening a route table. All operations are simulated.");
  finding.setAttribute("role", "status");
  finding.setAttribute("aria-live", "polite");
  host.append(finding);

  const trace = document.createElement("section");
  trace.className = "nat-trace";
  trace.setAttribute("aria-labelledby", "nat-trace-heading");
  const traceHeading = node("h5", "", "PACKET TRACE / " + NAT_PROBE.source + " → " + NAT_PROBE.destination + ":" + NAT_PROBE.port);
  traceHeading.id = "nat-trace-heading";
  trace.append(traceHeading);
  if (natState.lastTest) {
    const list = document.createElement("ol");
    for (const item of natState.lastTest.trace) {
      const li = document.createElement("li");
      li.className = item.ok ? "is-pass" : "is-drop";
      li.append(node("strong", "", (item.ok ? "PASS" : "DROP") + " · " + item.label), node("span", "", item.detail));
      list.append(li);
    }
    trace.append(list, node("p", "nat-shared", natState.lastTest.shared.ok
      ? "Shared NAT check: " + natState.lastTest.shared.subnet + " also passes."
      : "Shared NAT check: " + natState.lastTest.shared.subnet + " fails at " + natState.lastTest.shared.failure + "."));
    const refs = node("p", "nat-refs", "Verify with AWS: ");
    for (const ref of NAT_REFERENCES) {
      const a = node("a", "", ref.label);
      a.href = ref.url; a.target = "_blank"; a.rel = "noopener noreferrer";
      refs.append(a, document.createTextNode(" "));
    }
    trace.append(refs);
  } else {
    trace.append(node("p", "nat-empty", natState.journal.some(item => item.kind === "test")
      ? "The last trace no longer matches your configuration. Run the test again."
      : "No trace yet. Press RUN TEST to send the synthetic HTTPS probe."));
  }
  host.append(trace);

  const log = document.createElement("section");
  log.className = "iam-mission-history";
  log.append(node("h5", "", "ACTION HISTORY / LATEST FIRST"));
  const history = document.createElement("ol");
  for (const item of [...natState.journal].reverse().slice(0, 10)) {
    history.append(node("li", "", String(item.sequence).padStart(2, "0") + " · " + item.description));
  }
  if (!history.children.length) history.append(node("li", "", "No actions yet. Your first test is available now."));
  log.append(history);
  host.append(log);

  if (focusKey) {
    let target = [...host.querySelectorAll("[data-focus]")].find(el => el.dataset.focus === focusKey);
    if (!target || target.disabled) target = [...host.querySelectorAll("[data-focus]")].find(el => el.dataset.focus === natKey("add-dest", focusKey.split("|")[1] || "")) ;
    if (!target || target.disabled) target = $("playable-test");
    target.focus({ preventScroll: true });
  }
}

export function setupPlayableLab(onTest) {
  notifyTest = onTest;
  $("playable-test").addEventListener("click", () => {
    if (!incidentId) return;
    if (iamState) {
      const tested = testIamMission(iamState);
      iamState = tested.state;
      result = tested.result;
      renderIamControls();
    } else if (natState) {
      const tested = testNatMission(natState);
      natState = tested.state;
      result = tested.result;
      natRender();
    } else {
      result = simulateSandbox(incidentId,state);
    }
    attempts++;
    status();
    onTest?.(result);
    $("playable-result").scrollIntoView({behavior:"auto",block:"nearest"});
  });
  $("playable-reset").addEventListener("click", () => {
    if (!incidentId) return;
    openPlayableLab(incidentId);
    $("playable-test").focus({preventScroll:true});
    onTest?.(null);
  });
}

export function openPlayableLab(id) {
  if (!SANDBOX_SCENARIOS[id]) return;
  incidentId = id;
  state = newSandboxState(id);
  iamState = id === "iam-boundary-v1" ? newIamMission() : null;
  natState = id === "private-nat-v1" ? newNatMission() : null;
  natDrafts = {};
  result = null;
  attempts = 0;
  const scenario = SANDBOX_SCENARIOS[id];
  $("playable-title").textContent = scenario.title;
  $("playable-task").textContent = scenario.task;
  $("playable-topology").replaceChildren();
  if (natState) {
    const hops = [["instance","Private instance"],["route-app","App route table"],["nat","NAT gateway"],
      ["route-nat","NAT subnet route table"],["igw","Internet gateway"],["dest","HTTPS endpoint"],["tgw","Transit gateway (no internet path)"]];
    for (const [key,label] of hops) {
      const el = node("span","playable-node",label);
      el.dataset.hop = key;
      $("playable-topology").append(el);
    }
  } else {
  for (const [index,label] of scenario.nodes.entries()) {
    if (index) $("playable-topology").append(node("span","playable-connector","→"));
    $("playable-topology").append(node("span","playable-node",label));
  }
  }
  $("playable-controls").replaceChildren();
  $("playable-controls").classList.remove("is-nat-mission");
  if (iamState) {
    renderIamControls();
    status();
    return;
  }
  if (natState) {
    natRender();
    status();
    return;
  }
  $("playable-controls").classList.remove("is-iam-mission");
  for (const item of scenario.switches) {
    const label = document.createElement("label");
    label.className = "playable-switch";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = state[item.id];
    checkbox.dataset.control = item.id;
    const content = node("span","playable-switch-copy","");
    content.append(node("strong","",item.label),node("small","",item.help));
    label.append(checkbox,content);
    checkbox.addEventListener("change",()=>{
      state[item.id] = checkbox.checked;
      result = null;
      status();
      notifyTest?.(null);
    });
    $("playable-controls").append(label);
  }
  status();
}

export function lastPlayableResult() {
  return result && { ...result };
}
