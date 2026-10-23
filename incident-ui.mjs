import { INCIDENTS, INCIDENT_PROMPTS, buildIncidentSubmission } from "./data/incident-pilots.mjs";
import { getIncidentProbes } from "./data/incident-probes.mjs";

const $ = (id) => document.getElementById(id);
let currentIncident = null;
let exported = false;
let selectedProbe = null;
let completedChecks = new Set();
let activeReportStep = 0;

function renderDiagnostics(incident) {
  selectedProbe = null;
  completedChecks = new Set();
  $("incident-probe-label").textContent = "AWAITING DIAGNOSTIC";
  $("incident-probe-output").textContent = "Select a check to inspect an observation.";
  $("incident-probe-prompt").textContent = "";
  $("incident-probe-count").textContent = "0 CHECKS RUN";
  $("incident-attach").disabled = true;
  const actions = $("incident-probes");
  actions.replaceChildren();
  for (const probe of getIncidentProbes(incident.id)) {
    const button = makeTextNode("button", "incident-probe", probe.label);
    button.type = "button";
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => {
      selectedProbe = probe;
      completedChecks.add(probe.id);
      for (const other of actions.querySelectorAll("button")) {
        const active = other === button;
        other.setAttribute("aria-pressed", active ? "true" : "false");
      }
      button.classList.add("is-run");
      $("incident-probe-label").textContent = probe.query + " / SYNTHETIC RESULT";
      $("incident-probe-output").textContent = probe.output;
      $("incident-probe-prompt").textContent = probe.prompt;
      $("incident-probe-count").textContent = `${completedChecks.size} / ${getIncidentProbes(incident.id).length} CHECKS RUN`;
      $("incident-attach").disabled = false;
    });
    actions.append(button);
  }
}

function attachDiagnosticObservation() {
  if (!currentIncident || !selectedProbe) return;
  const field = $("incident-answer-evidence");
  const observation = `[${selectedProbe.label} | SYNTHETIC]\n${selectedProbe.output}`;
  // Append, never overwrite the learner's analysis or silently truncate it.
  const separator = field.value ? "\n\n" : "";
  if (field.value.length + separator.length + observation.length > field.maxLength) {
    $("incident-status").textContent = "Evidence field is full. Edit your notes before attaching another observation.";
    return;
  }
  field.value += separator + observation;
  field.dispatchEvent(new Event("input", { bubbles: true }));
  showReportStep(1);
  $("incident-status").textContent = "Observation attached. Add your own interpretation before exporting.";
  field.focus({ preventScroll: true });
  field.scrollIntoView({ behavior: "auto", block: "center" });
}

function hasUnsavedAnswers() {
  return Boolean(currentIncident && !exported &&
    [...$("incident-fields").querySelectorAll("textarea")].some(field => field.value.trim()));
}

function makeTextNode(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  node.textContent = text;
  return node;
}

function updateReportProgress(labels = [...$("incident-fields").querySelectorAll(".incident-field")]) {
  const answered = labels.filter(label => label.querySelector("textarea").value.trim()).length;
  const message = `STEP ${activeReportStep + 1} OF ${labels.length}  /  ${answered} DRAFTED`;
  if ($("incident-report-progress").textContent !== message) {
    $("incident-report-progress").textContent = message;
  }
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
      makeTextNode("span", "incident-ticket-footer", incident.duration + " / OPEN CASE ↗")
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
  renderDiagnostics(incident);

  const locker = $("incident-evidence");
  locker.replaceChildren();
  for (const artifact of incident.artifacts) {
    const article = document.createElement("article");
    article.className = "incident-artifact";
    article.append(
      makeTextNode("h4", "", artifact.label),
      makeTextNode("pre", "", artifact.body)
    );
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
    textarea.addEventListener("input", () => {
      exported = false;
      $("incident-status").textContent = "";
      updateReportProgress();
    });
    label.append(textarea);
    fields.append(label);
  }
  showReportStep(0);
  onView("incident");
}

function exportIncident(event) {
  event.preventDefault();
  if (!currentIncident) return;
  const responses = Object.fromEntries(INCIDENT_PROMPTS.map(prompt =>
    [prompt.key, $("incident-answer-" + prompt.key).value]
  ));
  const missingStep = INCIDENT_PROMPTS.findIndex(prompt => !responses[prompt.key].trim());
  if (missingStep !== -1) {
    showReportStep(missingStep, true);
    $("incident-report-progress").textContent = `STEP ${missingStep + 1} OF ${INCIDENT_PROMPTS.length}  /  ANSWER REQUIRED`;
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
  $("incident-status").textContent = "Exported to your device. Nothing was uploaded or graded. Share the report with a reviewer only if you choose.";
}

export function setupIncidentUI(onView) {
  // Browser navigation is distinct from the in-page exit/reset controls.
  // Browsers show their own confirmation text and may suppress it without user activation.
  window.addEventListener("beforeunload", (event) => {
    if (!hasUnsavedAnswers()) return;
    event.preventDefault();
    event.returnValue = "";
  });
  renderCatalog(onView);
  $("incident-attach").addEventListener("click", attachDiagnosticObservation);
  $("incident-step-prev").addEventListener("click", () => showReportStep(activeReportStep - 1, true));
  $("incident-step-next").addEventListener("click", () => showReportStep(activeReportStep + 1, true));
  $("incident-response").addEventListener("submit", exportIncident);
  $("incident-reset").addEventListener("click", () => {
    if (hasUnsavedAnswers() && !window.confirm("Clear your incident report? Unexported answers will be lost.")) return;
    $("incident-response").reset();
    showReportStep(0);
    exported = false;
    $("incident-status").textContent = "Responses cleared from this tab.";
  });
  $("incident-exit").addEventListener("click", () => {
    if (hasUnsavedAnswers() && !window.confirm("Leave this incident? Unexported answers will be lost.")) return;
    currentIncident = null;
    exported = false;
    $("incident-fields").replaceChildren();
    onView("dashboard");
    $("incident-launch-title").focus?.();
  });
}
