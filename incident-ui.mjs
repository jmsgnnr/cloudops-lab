import { INCIDENTS, INCIDENT_PROMPTS, buildIncidentSubmission } from "./data/incident-pilots.mjs";
import { getIncidentProbes } from "./data/incident-probes.mjs";
import { getIncidentActions, describeIncidentAction } from "./data/incident-actions.mjs";

const $ = (id) => document.getElementById(id);
const PHASES = ["brief", "inspect", "decide", "report"];
let currentIncident = null;
let exported = false;
let selectedProbe = null;
let completedChecks = new Set();
let selectedActionId = null;
let simulatedActionId = null;
let activeReportStep = 0;

function makeTextNode(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = text;
  return node;
}

function showMissionPhase(phase, focus = true) {
  if (!PHASES.includes(phase)) return;
  const index = PHASES.indexOf(phase);
  for (const [i, name] of PHASES.entries()) {
    $("mission-" + name).hidden = name !== phase;
    const marker = document.querySelector(`[data-mission-step="${name}"]`);
    marker.classList.toggle("is-complete", i < index);
    if (name === phase) marker.setAttribute("aria-current", "step");
    else marker.removeAttribute("aria-current");
  }
  if (!focus) return;
  const target = ({
    brief: () => $("mission-start"),
    inspect: () => $("incident-probes").querySelector("button") ?? $("mission-to-decide"),
    decide: () => $("mission-options").querySelector("button") ?? $("mission-run"),
    report: () => $("incident-fields").querySelector(".incident-field:not([hidden]) textarea") ?? $("incident-attach")
  })[phase]();
  target?.focus({ preventScroll: true });
  // Do not retain viewport position at the bottom of the preceding stage.
  document.querySelector(".mission-steps")?.scrollIntoView({ behavior: "auto", block: "start" });
}

function refreshEvidenceBoard() {
  const list = $("mission-evidence-items");
  list.replaceChildren();
  const probes = getIncidentProbes(currentIncident?.id);
  const visited = probes.filter(probe => completedChecks.has(probe.id));
  for (const probe of visited) {
    const item = document.createElement("li");
    const link = makeTextNode("button", "mission-evidence-link", probe.label);
    link.type = "button";
    link.addEventListener("click", () => {
      showMissionPhase("inspect", false);
      const button = [...$("incident-probes").querySelectorAll("button")].find(b => b.dataset.probeId === probe.id);
      button?.click();
      button?.focus({ preventScroll: true });
    });
    item.append(link, makeTextNode("span", "mission-evidence-observed", "CAPTURED"));
    list.append(item);
  }
  if (!visited.length) list.append(makeTextNode("li", "mission-empty", "No checks run yet. Start with any diagnostic."));
  $("mission-to-decide").disabled = visited.length < 2;
  $("incident-attach").disabled = visited.length === 0;
  $("incident-probe-count").textContent = `${visited.length} / ${probes.length} CHECKS RUN`;
  $("mission-report-evidence-count").textContent = `${visited.length} OBSERVATION${visited.length === 1 ? "" : "S"} COLLECTED`;
}

function renderDiagnostics(incident) {
  selectedProbe = null;
  completedChecks = new Set();
  $("incident-probe-label").textContent = "AWAITING DIAGNOSTIC";
  $("incident-probe-output").textContent = "Select a check to inspect an observation.";
  $("incident-probe-prompt").textContent = "";
  const actions = $("incident-probes");
  actions.replaceChildren();
  for (const probe of getIncidentProbes(incident.id)) {
    const button = makeTextNode("button", "incident-probe", probe.label);
    button.type = "button";
    button.dataset.probeId = probe.id;
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => {
      selectedProbe = probe;
      completedChecks.add(probe.id);
      for (const other of actions.querySelectorAll("button")) {
        other.setAttribute("aria-pressed", String(other === button));
      }
      button.classList.add("is-run");
      $("incident-probe-label").textContent = probe.query + " / SYNTHETIC RESULT";
      $("incident-probe-output").textContent = probe.output;
      $("incident-probe-prompt").textContent = probe.prompt;
      refreshEvidenceBoard();
      exported = false;
    });
    actions.append(button);
  }
  refreshEvidenceBoard();
}

function renderActions(incident) {
  selectedActionId = null;
  simulatedActionId = null;
  $("mission-run").disabled = true;
  $("mission-to-report").disabled = true;
  $("mission-use-decision").disabled = true;
  $("mission-outcome").hidden = true;
  const list = $("mission-options");
  list.replaceChildren();
  for (const choice of getIncidentActions(incident.id).choices) {
    const button = makeTextNode("button", "mission-option", "");
    button.type = "button";
    button.dataset.actionId = choice.id;
    button.setAttribute("aria-pressed", "false");
    button.append(
      makeTextNode("span", "mission-option-type", choice.type),
      makeTextNode("strong", "", choice.label),
      makeTextNode("small", "", choice.preview)
    );
    button.addEventListener("click", () => {
      selectedActionId = choice.id;
      simulatedActionId = null;
      $("mission-run").disabled = false;
      $("mission-to-report").disabled = true;
      $("mission-use-decision").disabled = true;
      $("mission-outcome").hidden = true;
      exported = false;
      for (const other of list.querySelectorAll("button")) other.setAttribute("aria-pressed", String(other === button));
    });
    list.append(button);
  }
}

function simulateAction() {
  if (!currentIncident || !selectedActionId) return;
  const choice = describeIncidentAction(currentIncident.id, selectedActionId);
  if (!choice) return;
  simulatedActionId = choice.id;
  $("mission-result").textContent = choice.result;
  $("mission-consequence").textContent = choice.consequence;
  $("mission-next").textContent = choice.next;
  $("mission-caution").textContent = choice.caution;
  $("mission-outcome").hidden = false;
  $("mission-to-report").disabled = false;
  $("mission-use-decision").disabled = false;
  exported = false;
  $("mission-outcome").scrollIntoView({ behavior: "auto", block: "nearest" });
}

function attachReportText(key, chunks, message) {
  const field = $("incident-answer-" + key);
  const fresh = chunks.filter(chunk => !field.value.includes(chunk.split("\n")[0]));
  if (!fresh.length) {
    $("incident-status").textContent = "Already added to your report. Edit the notes to add more detail.";
    return;
  }
  const addition = fresh.join("\n\n");
  const next = field.value ? field.value + "\n\n" + addition : addition;
  if (next.length > field.maxLength) {
    $("incident-status").textContent = "Report field is full. Edit your notes before adding more.";
    return;
  }
  field.value = next;
  field.dispatchEvent(new Event("input", { bubbles: true }));
  showReportStep(INCIDENT_PROMPTS.findIndex(p => p.key === key), true);
  $("incident-status").textContent = message;
}

function attachDiagnosticObservation() {
  if (!currentIncident || !completedChecks.size) return;
  const notes = getIncidentProbes(currentIncident.id)
    .filter(p => completedChecks.has(p.id))
    .map(p => `[${p.label} | SYNTHETIC]\n${p.output}`);
  attachReportText("evidence", notes, "Evidence copied. Add your own interpretation, and mark any uncertainty.");
}

function attachSimulatedAction() {
  const choice = describeIncidentAction(currentIncident?.id, simulatedActionId);
  if (!choice) return;
  attachReportText("fix", [
    `[SIMULATED ACTION: ${choice.label}]\nModeled result: ${choice.result}\nTradeoff: ${choice.caution}\nNext: ${choice.next}`
  ], "Simulated action copied. Describe your own change-control reasoning and rollback.");
}

function hasUnsavedAnswers() {
  return Boolean(currentIncident && !exported &&
    (completedChecks.size > 0 || simulatedActionId ||
      [...$("incident-fields").querySelectorAll("textarea")].some(field => field.value.trim())));
}

function updateReportProgress(labels = [...$("incident-fields").querySelectorAll(".incident-field")]) {
  const answered = labels.filter(label => label.querySelector("textarea").value.trim()).length;
  $("incident-report-progress").textContent =
    `STEP ${activeReportStep + 1} OF ${labels.length} / ${answered} DRAFTED`;
}

function showReportStep(index, focusField = false) {
  const labels = [...$("incident-fields").querySelectorAll(".incident-field")];
  if (!labels.length) return;
  activeReportStep = Math.min(labels.length - 1, Math.max(0, index));
  labels.forEach((label, i) => { label.hidden = i !== activeReportStep; });
  $("incident-step-prev").hidden = activeReportStep === 0;
  $("incident-step-next").hidden = activeReportStep === labels.length - 1;
  $("incident-submit").hidden = activeReportStep !== labels.length - 1;
  updateReportProgress(labels);
  if (focusField) {
    showMissionPhase("report", false);
    const field = labels[activeReportStep].querySelector("textarea");
    field.focus({ preventScroll: true });
    field.scrollIntoView({ behavior: "auto", block: "nearest" });
  }
}

function renderCatalog(onView) {
  const catalog = $("incident-catalog");
  catalog.replaceChildren();
  for (const incident of INCIDENTS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "incident-ticket";
    button.append(
      makeTextNode("span", "incident-ticket-index", "CASE / " + incident.number + "   " + incident.domain),
      makeTextNode("strong", "", incident.title),
      makeTextNode("span", "incident-ticket-description", incident.summary),
      makeTextNode("span", "incident-ticket-footer", incident.duration + " / BEGIN MISSION ↗")
    );
    button.addEventListener("click", () => openIncident(incident, onView));
    catalog.append(button);
  }
}

function openIncident(incident, onView) {
  currentIncident = incident;
  exported = false;
  $("incident-code").textContent = "CASE " + incident.number + " / " + incident.domain;
  $("incident-title").textContent = incident.title;
  $("incident-brief").textContent = incident.summary;
  $("incident-impact").textContent = incident.impact;
  $("incident-objective").textContent = incident.objective;
  $("incident-context").open = false;
  $("incident-evidence").closest("details").open = false;
  $("incident-status").textContent = "";
  $("mission-objective").textContent = getIncidentActions(incident.id).objective;
  $("mission-hint-text").textContent = getIncidentActions(incident.id).hint;
  document.querySelector(".mission-hint").open = false;
  renderDiagnostics(incident);
  renderActions(incident);

  const locker = $("incident-evidence");
  locker.replaceChildren();
  for (const artifact of incident.artifacts) {
    const article = document.createElement("article");
    article.className = "incident-artifact";
    article.append(makeTextNode("h4", "", artifact.label), makeTextNode("pre", "", artifact.body));
    locker.append(article);
  }

  const fields = $("incident-fields");
  fields.replaceChildren();
  for (const prompt of INCIDENT_PROMPTS) {
    const label = document.createElement("label");
    label.className = "incident-field";
    label.htmlFor = "incident-answer-" + prompt.key;
    label.append(makeTextNode("span", "incident-field-label", prompt.label));
    label.append(makeTextNode("span", "incident-field-hint", prompt.hint));
    const textarea = document.createElement("textarea");
    textarea.id = label.htmlFor;
    textarea.name = prompt.key;
    textarea.rows = 4;
    textarea.maxLength = 4000;
    textarea.required = true;
    textarea.autocomplete = "off";
    textarea.placeholder = prompt.key === "diagnosis" ? "I observed... I believe... What remains uncertain..." :
      prompt.key === "evidence" ? "This conclusion is supported by... It does not establish..." :
      prompt.key === "fix" ? "I would request approval to... The tradeoff is..." :
      prompt.key === "verify" ? "I would confirm success by measuring..." :
      "If this made things worse, I would... I would preserve...";
    textarea.addEventListener("input", () => {
      exported = false;
      $("incident-status").textContent = "";
      updateReportProgress();
    });
    label.append(textarea);
    fields.append(label);
  }
  showReportStep(0);
  showMissionPhase("brief", false);
  onView("incident");
  $("mission-start").focus({ preventScroll: true });
}

function exportIncident(event) {
  event.preventDefault();
  if (!currentIncident) return;
  const responses = Object.fromEntries(INCIDENT_PROMPTS.map(prompt =>
    [prompt.key, $("incident-answer-" + prompt.key).value]
  ));
  const missingStep = INCIDENT_PROMPTS.findIndex(prompt => !responses[prompt.key].trim());
  if (missingStep !== -1) {
    showMissionPhase("report", false);
    showReportStep(missingStep, true);
    $("incident-report-progress").textContent =
      `STEP ${missingStep + 1} OF ${INCIDENT_PROMPTS.length} / ANSWER REQUIRED`;
    $("incident-status").textContent = "Complete this step and the remaining response fields before export.";
    return;
  }
  let result;
  try {
    result = buildIncidentSubmission(currentIncident, responses);
  } catch (error) {
    $("incident-status").textContent = error.message;
    return;
  }
  const url = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "cloudlabs-" + currentIncident.id + "-response.json";
  link.click();
  URL.revokeObjectURL(url);
  exported = true;
  $("incident-status").textContent =
    "Exported to your device. Nothing was uploaded or graded. Share the report only if you choose.";
}

export function setupIncidentUI(onView) {
  window.addEventListener("beforeunload", event => {
    if (!hasUnsavedAnswers()) return;
    event.preventDefault();
    event.returnValue = "";
  });
  renderCatalog(onView);
  $("mission-start").addEventListener("click", () => showMissionPhase("inspect"));
  $("mission-back-brief").addEventListener("click", () => showMissionPhase("brief"));
  $("mission-back-inspect").addEventListener("click", () => showMissionPhase("inspect"));
  $("mission-to-decide").addEventListener("click", () => {
    if (completedChecks.size < 2) return;
    showMissionPhase("decide");
  });
  $("mission-run").addEventListener("click", simulateAction);
  $("mission-to-report").addEventListener("click", () => {
    if (!simulatedActionId) return;
    showMissionPhase("report");
  });
  $("mission-back-decide").addEventListener("click", () => showMissionPhase("decide"));
  $("incident-attach").addEventListener("click", attachDiagnosticObservation);
  $("mission-use-decision").addEventListener("click", attachSimulatedAction);
  $("incident-step-prev").addEventListener("click", () => showReportStep(activeReportStep - 1, true));
  $("incident-step-next").addEventListener("click", () => showReportStep(activeReportStep + 1, true));
  $("incident-response").addEventListener("submit", exportIncident);
  $("incident-reset").addEventListener("click", () => {
    if (hasUnsavedAnswers() && !window.confirm("Clear your report answers? Unexported notes will be lost.")) return;
    $("incident-response").reset();
    showReportStep(0);
    exported = false;
    $("incident-status").textContent = "Report answers cleared. Collected investigation evidence is still available.";
  });
  $("incident-exit").addEventListener("click", () => {
    if (hasUnsavedAnswers() && !window.confirm("Leave this lab? Unexported investigation work will be lost.")) return;
    currentIncident = null;
    exported = false;
    completedChecks = new Set();
    selectedActionId = null;
    simulatedActionId = null;
    $("incident-fields").replaceChildren();
    onView("dashboard");
    $("incident-launch-title").focus({ preventScroll: true });
  });
}
