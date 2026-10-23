import { SANDBOX_SCENARIOS, newSandboxState, simulateSandbox } from "./data/playable-sandboxes.mjs";
const $ = id => document.getElementById(id);
let incidentId = null;
let state = null;
let result = null;
let attempts = 0;
let notifyTest = null;

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
  }
  for (const [i,el] of [...$("playable-topology").children].entries()) {
    el.classList.toggle("is-reachable",Boolean(result?.serviceOk) && i===$("playable-topology").children.length-1);
  }
}

export function setupPlayableLab(onTest) {
  notifyTest = onTest;
  $("playable-test").addEventListener("click", () => {
    if (!incidentId) return;
    result = simulateSandbox(incidentId,state);
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
  result = null;
  attempts = 0;
  const scenario = SANDBOX_SCENARIOS[id];
  $("playable-title").textContent = scenario.title;
  $("playable-task").textContent = scenario.task;
  $("playable-topology").replaceChildren();
  for (const [index,label] of scenario.nodes.entries()) {
    if (index) $("playable-topology").append(node("span","playable-connector","→"));
    $("playable-topology").append(node("span","playable-node",label));
  }
  $("playable-controls").replaceChildren();
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
