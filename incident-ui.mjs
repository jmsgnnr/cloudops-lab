import { INCIDENTS, INCIDENT_PROMPTS, buildIncidentSubmission } from "./data/incident-pilots.mjs";

const $ = (id) => document.getElementById(id);
let currentIncident = null;
let exported = false;

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
      makeTextNode("span", "incident-ticket-description", incident.impact),
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
  $("incident-impact").textContent = incident.impact;
  $("incident-objective").textContent = incident.objective;
  $("incident-status").textContent = "";

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
    });
    label.append(textarea);
    fields.append(label);
  }
  onView("incident");
}

function exportIncident(event) {
  event.preventDefault();
  if (!currentIncident) return;
  const responses = Object.fromEntries(INCIDENT_PROMPTS.map(prompt =>
    [prompt.key, $("incident-answer-" + prompt.key).value]
  ));
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
  renderCatalog(onView);
  $("incident-response").addEventListener("submit", exportIncident);
  $("incident-reset").addEventListener("click", () => {
    if (hasUnsavedAnswers() && !window.confirm("Clear your incident report? Unexported answers will be lost.")) return;
    $("incident-response").reset();
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
