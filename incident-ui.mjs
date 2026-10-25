import { INCIDENTS, INCIDENT_PROMPTS, buildIncidentSubmission } from "./data/incident-pilots.mjs";
import { getIncidentProbes } from "./data/incident-probes.mjs";
import { getMissionClues } from "./data/mission-clues.mjs";
import { setupPlayableLab, openPlayableLab, lastPlayableResult } from "./playable-ui.mjs";

const $ = id => document.getElementById(id);
const PHASES = ["brief", "workbench", "report"];
let currentIncident = null;
let exported = false;
let openedClues = new Set();
let activeReportStep = 0;

function text(tag, className, content) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = content;
  return element;
}

function showPhase(name, focus = true) {
  if (!PHASES.includes(name)) return;
  const order = PHASES.indexOf(name);
  for (const [i, phase] of PHASES.entries()) {
    $("mission-" + phase).hidden = phase !== name;
    const marker = document.querySelector(`[data-mission-step="${phase}"]`);
    marker.classList.toggle("is-complete", i < order);
    if (phase === name) marker.setAttribute("aria-current", "step");
    else marker.removeAttribute("aria-current");
  }
  if (!focus) return;
  const targets = {
    brief: () => $("mission-start"),
    workbench: () => $("playable-test"),
    report: () => $("incident-fields").querySelector(".incident-field:not([hidden]) textarea")
  };
  targets[name]?.()?.focus({preventScroll:true});
  document.querySelector(".mission-steps")?.scrollIntoView({behavior:"auto",block:"start"});
}

function openClue(incident, clue, button) {
  openedClues.add(clue.probeId);
  for (const candidate of $("clue-buttons").querySelectorAll("button")) {
    candidate.setAttribute("aria-pressed", String(candidate === button));
    candidate.classList.toggle("is-run", candidate === button || openedClues.has(candidate.dataset.probeId));
  }
  const probe = getIncidentProbes(incident.id).find(item => item.id === clue.probeId);
  $("clue-finding").textContent = clue.finding;
  $("clue-meaning").textContent = clue.meaning;
  const source = getMissionClues(incident.id).references.find((_, index) =>
    getMissionClues(incident.id).clues[index].probeId === clue.probeId);
  const link = $("clue-source");
  link.hidden = !source;
  if (source) {
    link.href = source.url;
    link.textContent = `VERIFY WITH AWS: ${source.label} ↗`;
  }
  $("clue-query").textContent = probe.query + " / SYNTHETIC";
  $("clue-text").textContent = probe.output;
  $("clue-raw").open = false;
  $("clue-output").hidden = false;
  $("clue-progress").textContent = openedClues.size + " / 3";
  $("mission-report-evidence-count").textContent =
    openedClues.size + " CLUE" + (openedClues.size === 1 ? "" : "S") + " OPENED";
  $("incident-attach").disabled = openedClues.size === 0;
  exported = false;
}

function renderClues(incident) {
  openedClues = new Set();
  const mission = getMissionClues(incident.id);
  const group = $("clue-buttons");
  group.replaceChildren();
  $("clue-output").hidden = true;
  $("clue-progress").textContent = "0 / 3";
  $("mission-clues").open = false;
  $("incident-attach").disabled = true;
  $("mission-report-evidence-count").textContent = "0 CLUES OPENED";
  mission.clues.forEach((clue, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "simple-clue-button";
    button.dataset.probeId = clue.probeId;
    button.setAttribute("aria-pressed", "false");
    button.append(
      text("span","simple-clue-index",String(index+1).padStart(2,"0")),
      text("span","simple-clue-question",clue.question),
      text("span","simple-clue-action","CHECK →")
    );
    button.addEventListener("click", () => openClue(incident,clue,button));
    group.append(button);
  });
}

function renderArtifacts(incident) {
  const container = $("incident-evidence");
  container.replaceChildren();
  for (const artifact of incident.artifacts) {
    const article = document.createElement("article");
    article.className = "incident-artifact";
    article.append(text("h4","",artifact.label),text("pre","",artifact.body));
    container.append(article);
  }
}

function reportSteps() {
  return [...$("incident-fields").querySelectorAll(".incident-field")];
}

function updateReportProgress() {
  const items = reportSteps();
  const answered = items.filter(item => item.querySelector("textarea").value.trim()).length;
  $("incident-report-progress").textContent =
    `STEP ${activeReportStep+1} OF ${items.length} / ${answered} DRAFTED`;
}

function showReportStep(index, focusField = false) {
  const fields = reportSteps();
  if (!fields.length) return;
  activeReportStep = Math.max(0,Math.min(index,fields.length-1));
  fields.forEach((field,i) => { field.hidden = i !== activeReportStep; });
  $("incident-step-prev").hidden = activeReportStep === 0;
  $("incident-step-next").hidden = activeReportStep === fields.length-1;
  $("incident-submit").hidden = activeReportStep !== fields.length-1;
  updateReportProgress();
  if (focusField) {
    showPhase("report",false);
    const textarea = fields[activeReportStep].querySelector("textarea");
    textarea.focus({preventScroll:true});
    textarea.scrollIntoView({behavior:"auto",block:"nearest"});
  }
}

function attachText(key, chunks, message) {
  const input = $("incident-answer-"+key);
  if (!input) return;
  // Two attempts can share a status while identifying different causes.
  // Deduplicate only exact matching evidence, not just its first/status line.
  const fresh = chunks.filter(chunk => !input.value.includes(chunk));
  if (!fresh.length) {
    $("incident-status").textContent = "Already included in your notes. You can edit them directly.";
    return;
  }
  const combined = input.value ? input.value + "\n\n" + fresh.join("\n\n") : fresh.join("\n\n");
  if (combined.length > input.maxLength) {
    $("incident-status").textContent = "This section is full. Shorten the notes before adding anything else.";
    return;
  }
  input.value = combined;
  input.dispatchEvent(new Event("input",{bubbles:true}));
  showReportStep(INCIDENT_PROMPTS.findIndex(p=>p.key===key),true);
  $("incident-status").textContent = message;
}

function attachClues() {
  if (!currentIncident || !openedClues.size) return;
  const notes = getIncidentProbes(currentIncident.id)
    .filter(probe=>openedClues.has(probe.id))
    .map(probe=>`[${probe.label} | SYNTHETIC]\n${probe.output}`);
  attachText("evidence",notes,"Clues added. Explain what you think they mean.");
}

function attachTest() {
  const result = lastPlayableResult();
  if (!result) return;
  attachText("fix",[`[VIRTUAL SYSTEM TEST: ${result.status}]\n${result.evidence}\n${result.explanation}`],
    "Your most recent virtual test has been added.");
}

function hasUnsavedNotes() {
  return currentIncident && !exported &&
    reportSteps().some(field=>field.querySelector("textarea").value.trim().length>0);
}

function renderCatalog(onView) {
  const catalog = $("incident-catalog");
  catalog.replaceChildren();
  for (const incident of INCIDENTS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "incident-ticket";
    button.append(
      text("span","incident-ticket-index","CASE "+incident.number+" / "+incident.domain),
      text("strong","",incident.title),
      text("span","incident-ticket-description",incident.summary),
      text("span","incident-ticket-footer","PLAY FREE MISSION ↗")
    );
    button.addEventListener("click",()=>openIncident(incident,onView));
    catalog.append(button);
  }
}

function openIncident(incident, onView) {
  currentIncident = incident;
  exported = false;
  const mission = getMissionClues(incident.id);
  $("incident-code").textContent = "CASE "+incident.number+" / "+incident.domain;
  $("incident-title").textContent = incident.title;
  $("incident-brief").textContent = incident.summary;
  $("incident-impact").textContent = incident.impact;
  $("incident-objective").textContent = incident.objective;
  $("incident-context").open = false;
  $("mission-headline").textContent = mission.headline;
  $("mission-objective").textContent = mission.goal;
  $("mission-signal").textContent = mission.signal;
  $("workbench-goal").textContent = mission.goal;
  $("mission-to-report").disabled = true;
  $("mission-use-decision").disabled = true;
  $("incident-status").textContent = "";
  renderClues(incident);
  renderArtifacts(incident);
  openPlayableLab(incident.id);
  $("clue-raw").open = false;
  $("clue-output").hidden = true;
  const fullCase = $("incident-evidence").closest("details");
  fullCase.open = false;
  const fields = $("incident-fields");
  fields.replaceChildren();
  for (const prompt of INCIDENT_PROMPTS) {
    const label = document.createElement("label");
    label.className = "incident-field";
    label.htmlFor = "incident-answer-"+prompt.key;
    label.append(text("span","incident-field-label",prompt.label));
    label.append(text("span","incident-field-hint",prompt.hint));
    const textarea = document.createElement("textarea");
    textarea.id = label.htmlFor;
    textarea.name = prompt.key;
    textarea.rows = 4;
    textarea.maxLength = 4000;
    textarea.required = true;
    textarea.autocomplete = "off";
    textarea.placeholder = ({
      diagnosis:"The failure seems to be caused by...",
      evidence:"I checked... This evidence shows...",
      fix:"The setting I changed was... I avoided...",
      verify:"I retested... The virtual system showed...",
      rollback:"If this were production, I would preserve..."
    })[prompt.key];
    textarea.addEventListener("input",()=>{
      exported=false;
      $("incident-status").textContent="";
      updateReportProgress();
    });
    label.append(textarea);
    fields.append(label);
  }
  showReportStep(0);
  showPhase("brief",false);
  onView("incident");
  $("mission-start").focus({preventScroll:true});
}

function exportIncident(event) {
  event.preventDefault();
  if (!currentIncident) return;
  const responses = Object.fromEntries(INCIDENT_PROMPTS.map(p=>[p.key,$("incident-answer-"+p.key).value]));
  const missing = INCIDENT_PROMPTS.findIndex(p=>!responses[p.key].trim());
  if (missing !== -1) {
    showReportStep(missing,true);
    $("incident-report-progress").textContent = `STEP ${missing+1} OF ${INCIDENT_PROMPTS.length} / ANSWER REQUIRED`;
    $("incident-status").textContent = "Finish this note and the remaining sections to export.";
    return;
  }
  let result;
  try { result = buildIncidentSubmission(currentIncident,responses); }
  catch(error) { $("incident-status").textContent = error.message; return; }
  const url = URL.createObjectURL(new Blob([JSON.stringify(result,null,2)],{type:"application/json"}));
  const link = document.createElement("a");
  link.href = url;
  link.download = "cloudlabs-"+currentIncident.id+"-response.json";
  link.click();
  URL.revokeObjectURL(url);
  exported = true;
  $("incident-status").textContent = "Exported to your device. Nothing was uploaded or graded.";
}

export function setupIncidentUI(onView) {
  window.addEventListener("beforeunload",event=>{
    if (!hasUnsavedNotes()) return;
    event.preventDefault();
    event.returnValue="";
  });
  renderCatalog(onView);
  $("mission-start").addEventListener("click",()=>showPhase("workbench"));
  $("mission-back-brief").addEventListener("click",()=>showPhase("brief"));
  setupPlayableLab(result=>{
    exported = false;
    $("mission-to-report").disabled = !result;
    $("mission-use-decision").disabled = !result;
  });
  $("mission-to-report").addEventListener("click",()=>{
    if (lastPlayableResult()) showPhase("report");
  });
  $("mission-back-decide").addEventListener("click",()=>showPhase("workbench"));
  $("incident-attach").addEventListener("click",attachClues);
  $("mission-use-decision").addEventListener("click",attachTest);
  $("incident-step-prev").addEventListener("click",()=>showReportStep(activeReportStep-1,true));
  $("incident-step-next").addEventListener("click",()=>showReportStep(activeReportStep+1,true));
  $("incident-response").addEventListener("submit",exportIncident);
  $("incident-reset").addEventListener("click",()=>{
    if (hasUnsavedNotes() && !window.confirm("Clear your notes? Unexported writing will be lost.")) return;
    $("incident-response").reset();
    showReportStep(0);
    exported=false;
    $("incident-status").textContent="Notes cleared. Your sandbox is unchanged.";
  });
  $("incident-exit").addEventListener("click",()=>{
    if (hasUnsavedNotes() && !window.confirm("Leave this mission? Unexported notes will be lost.")) return;
    currentIncident = null;
    exported = false;
    openedClues = new Set();
    $("incident-fields").replaceChildren();
    onView("dashboard");
    $("incident-launch-title").focus({preventScroll:true});
  });
}
