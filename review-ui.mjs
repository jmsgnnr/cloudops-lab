import { buildFeedback, replayMission, feedbackToText } from "./data/mission-feedback.mjs";

/**
 * Optional mission debrief: completion banner, evidence-based feedback and a step-through replay.
 * Everything shown comes from data/mission-feedback.mjs (a pure function of the action journal).
 * Nothing here blocks the mission, the report or the export, and nothing is stored or sent.
 */
const $ = id => document.getElementById(id);
let host = null;
let deps = null;
let open = false;
let view = "feedback";
let replayIndex = 0;
let current = null;      // { missionId, feedback, replay } or null
let lastLength = 0;

function node(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}
function snapshot() {
  const mission = deps.getMission();
  if (!mission) return null;
  try {
    return { missionId: mission.missionId, feedback: buildFeedback(mission.missionId, mission.journal), replay: replayMission(mission.missionId, mission.journal) };
  } catch {
    return { error: true };
  }
}

/* ---------- completion banner ---------- */
function renderBanner() {
  const banner = $("mission-complete");
  const done = Boolean(current && current.feedback && current.feedback.complete);
  banner.hidden = !done;
  if (!done) return;
  const next = deps.getNext();
  $("mission-complete-outcome").textContent = current.feedback.outcome.label;
  $("mission-next").textContent = next ? "NEXT MISSION: CASE " + next.number + " →" : "BACK TO ALL LABS →";
}

/* ---------- feedback view ---------- */
function list(items, className) {
  const ul = node("ul", className);
  for (const item of items) {
    const li = node("li", "review-item");
    li.append(node("span", "review-tag", item.tag), document.createTextNode(" "), node("span", "review-text", item.text));
    if (item.detail) {
      const d = node("details", "review-detail");
      d.append(node("summary", "", "The mission's own explanation"), node("p", "", item.detail));
      li.append(d);
    }
    if (item.basis && item.basis.length) li.append(node("span", "review-basis", "From journal " + (item.basis.length === 1 ? "step " : "steps ") + item.basis.join(", ")));
    ul.append(li);
  }
  return ul;
}
function renderFeedback(target) {
  const f = current.feedback;
  target.replaceChildren();
  const outcome = node("div", "review-outcome");
  outcome.append(node("span", "review-kicker", "OUTCOME / DESCRIPTION, NOT A GRADE"), node("strong", "", f.outcome.label));
  target.append(outcome);

  const criteria = node("section", "review-section");
  criteria.append(node("h5", "", "How this outcome was named"));
  const crit = node("ul", "review-criteria");
  for (const c of f.criteria) {
    const li = node("li", "review-item");
    li.append(node("span", "review-tag" + (c.met ? " is-met" : " is-unmet"), c.met ? "MET" : "NOT MET"), document.createTextNode(" "), node("span", "review-text", c.text));
    crit.append(li);
  }
  criteria.append(crit);
  target.append(criteria);

  for (const s of f.sections) {
    const section = node("section", "review-section");
    section.append(node("h5", "", s.title), list(s.items, "review-items"));
    target.append(section);
  }
  const limits = node("section", "review-section");
  limits.append(node("h5", "", "Still to check in real AWS (not derived from your play)"));
  const ul = node("ul", "review-items");
  for (const l of f.limits) {
    const li = node("li", "review-item");
    li.append(node("span", "review-text", l.text), document.createTextNode(" "));
    const a = node("a", "", l.label + " ↗");
    a.href = l.url; a.target = "_blank"; a.rel = "noopener noreferrer";
    li.append(a);
    ul.append(li);
  }
  limits.append(ul, node("p", "review-note", "This is a synthetic model. No AWS account, API or network was used."));
  target.append(limits);
}

/* ---------- replay view ---------- */
function renderReplay(target) {
  const steps = current.replay.steps;
  target.replaceChildren();
  replayIndex = Math.max(0, Math.min(replayIndex, steps.length - 1));
  const empty = steps.length === 1;
  target.append(node("p", "review-note", empty
    ? "Nothing to replay yet. Inspect something or change a setting, then come back."
    : "Step through your own actions in order. The replay re-runs the recorded journal from the starting state and shows the same result every time."));

  const progress = node("p", "review-progress", "");
  progress.id = "replay-progress";
  const nav = node("div", "review-nav");
  nav.setAttribute("role", "group");
  nav.setAttribute("aria-label", "Replay controls");
  const prev = node("button", "outline-button", "← PREVIOUS");
  const next = node("button", "outline-button", "NEXT →");
  const restart = node("button", "outline-button", "RESTART");
  for (const b of [prev, next, restart]) b.type = "button";
  prev.id = "replay-prev"; next.id = "replay-next"; restart.id = "replay-restart";
  nav.append(prev, next, restart);

  const card = node("div", "replay-step");
  card.id = "replay-step";
  card.setAttribute("aria-live", "polite");
  card.setAttribute("aria-atomic", "true");

  const jump = node("ol", "replay-list");
  jump.setAttribute("aria-label", "Journal steps, select one to jump to it");
  steps.forEach((step, i) => {
    const li = node("li", "");
    const b = node("button", "replay-jump", String(i).padStart(2, "0") + " · " + (i === 0 ? "Starting state" : step.description));
    b.type = "button";
    b.dataset.index = String(i);
    b.addEventListener("click", () => { replayIndex = i; paint(); });
    li.append(b);
    jump.append(li);
  });

  const paint = () => {
    const step = steps[replayIndex];
    progress.textContent = "STEP " + replayIndex + " OF " + (steps.length - 1) + (replayIndex === 0 ? " / STARTING STATE" : " / " + step.kind.toUpperCase());
    prev.disabled = replayIndex === 0;
    next.disabled = replayIndex === steps.length - 1;
    restart.disabled = replayIndex === 0;
    card.replaceChildren(
      node("h5", "", replayIndex === 0 ? "Starting state, before any action" : "Step " + replayIndex + ": " + step.description),
      node("p", "review-note", replayIndex === 0 ? "Nothing has been inspected or changed." : step.changed.length ? "Changed by this step: " + step.changed.join(", ") + "." : "This step changed no displayed setting."));
    const dl = node("dl", "replay-facts");
    for (const fact of step.facts) {
      const changed = step.changed.includes(fact.label);
      const row = node("div", "replay-fact" + (changed ? " is-changed" : ""));
      row.append(node("dt", "", fact.label + (changed ? " (CHANGED)" : "")), node("dd", "", fact.value));
      dl.append(row);
    }
    card.append(dl);
    for (const b of jump.querySelectorAll("button")) {
      if (Number(b.dataset.index) === replayIndex) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
    }
    // A control that just became disabled cannot keep focus: hand it to an enabled neighbour.
    const held = document.activeElement;
    if (held && held.disabled) [next, prev, $("review-close")].find(b => b && !b.disabled).focus({ preventScroll: true });
  };
  prev.addEventListener("click", () => { replayIndex -= 1; paint(); });
  next.addEventListener("click", () => { replayIndex += 1; paint(); });
  restart.addEventListener("click", () => { replayIndex = 0; paint(); });

  target.append(progress, nav, card, node("h5", "review-list-title", "All steps"), jump);
  paint();
}

/* ---------- panel ---------- */
function renderPanel() {
  const panel = $("review-panel");
  if (!open) { panel.hidden = true; return; }
  panel.hidden = false;
  panel.replaceChildren();
  if (!current || current.error) {
    panel.append(node("p", "review-note", "The debrief could not be built for this session. Your mission and notes are not affected."));
    return;
  }
  const heading = node("h4", "", "Mission debrief: " + current.feedback.title);
  heading.id = "review-heading";
  heading.tabIndex = -1;
  panel.setAttribute("aria-labelledby", "review-heading");
  const sw = node("div", "review-switch");
  sw.setAttribute("role", "group");
  sw.setAttribute("aria-label", "Debrief view");
  for (const [id, label] of [["feedback", "FEEDBACK"], ["replay", "REPLAY"]]) {
    const b = node("button", "review-switch-button", label);
    b.type = "button";
    b.dataset.view = id;
    b.id = "review-view-" + id;
    b.setAttribute("aria-pressed", String(view === id));
    b.addEventListener("click", () => { view = id; renderPanel(); $("review-view-" + id)?.focus({ preventScroll: true }); });
    sw.append(b);
  }
  const body = node("div", "review-body");
  body.id = "review-body";
  if (view === "replay") renderReplay(body); else renderFeedback(body);
  const close = node("button", "outline-button", "CLOSE DEBRIEF");
  close.type = "button"; close.id = "review-close";
  close.addEventListener("click", () => setOpen(false));
  panel.append(heading, node("p", "review-note", current.feedback.notice), sw, body, close);
}
function setOpen(value, focus = true) {
  open = value;
  const toggle = $("review-toggle");
  toggle.setAttribute("aria-expanded", String(open));
  toggle.textContent = open ? "HIDE MISSION DEBRIEF" : "OPEN MISSION DEBRIEF (OPTIONAL)";
  if (open) { view = "feedback"; replayIndex = 0; }
  renderPanel();
  if (!focus) return;
  if (open) {
    const heading = $("review-heading");
    (heading || toggle).focus({ preventScroll: true });
    (heading || toggle).scrollIntoView({ behavior: "auto", block: "start" });
  } else {
    toggle.focus({ preventScroll: true });
  }
}

/** Called after every mission state change. Rebuilds from the journal; never moves focus. */
export function refreshMissionReview() {
  if (!host) return;
  const was = current;
  current = snapshot();
  const length = current && current.replay ? current.replay.steps.length - 1 : 0;
  if (length < lastLength) replayIndex = 0;
  lastLength = length;
  $("review-toggle").disabled = !current;
  renderBanner();
  if (open) {
    if (!current) setOpen(false, false);
    else {
      const keepFocus = document.activeElement;
      renderPanel();
      if (keepFocus && keepFocus.id && !document.contains(keepFocus)) $("review-toggle").focus({ preventScroll: true });
    }
  }
  deps.onChange?.(current && current.feedback ? current.feedback : null, was);
}
/** Close the debrief without moving focus (used when another mission opens). */
export function resetMissionReview() {
  open = false; view = "feedback"; replayIndex = 0; lastLength = 0;
  if (!host) return;
  $("review-toggle").setAttribute("aria-expanded", "false");
  $("review-toggle").textContent = "OPEN MISSION DEBRIEF (OPTIONAL)";
  $("review-panel").hidden = true;
}
export function openMissionReview() { if (current && !current.error) setOpen(true); }
export function currentFeedbackText() { return current && current.feedback ? feedbackToText(current.feedback) : ""; }

export function setupMissionReview(options) {
  host = $("mission-review");
  deps = options;
  $("review-toggle").addEventListener("click", () => setOpen(!open));
  $("mission-review-open").addEventListener("click", () => { if (!open) setOpen(true); else { $("review-heading")?.focus({ preventScroll: true }); } });
  $("mission-next").addEventListener("click", () => deps.onNext());
  $("mission-again").addEventListener("click", () => deps.onRetry());
  refreshMissionReview();
}
