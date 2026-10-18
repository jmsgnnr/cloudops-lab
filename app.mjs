import { TRACKS } from "./data/blueprints.mjs";
import { LESSONS } from "./data/lessons.mjs";
import { QUESTIONS } from "./data/questions.mjs";
import { setupIncidentUI } from "./incident-ui.mjs";
import {
  selectQuestions,
  scoreQuiz,
  evaluate,
  readProgress,
  storeProgress,
  recordAttempt,
  emptyProgress,
  validateBank
} from "./engine.mjs";

const $ = (id) => document.getElementById(id);

const dashboard = $("dashboard");
const quizView = $("quiz-view");
const resultsView = $("results-view");
const trackGrid = $("track-grid");
const domainSelect = $("domain-select");
const modeSelect = $("mode-select");
const countSelect = $("count-select");
const focusSelect = $("focus-select");
const sessionForm = $("session-form");
const sessionHint = $("session-hint");
const guideIntro = $("guide-intro");
const domainGrid = $("domain-grid");
const officialGuide = $("official-guide");
const retirementNote = $("retirement-note");
const attemptsStat = $("attempts-stat");
const accuracyStat = $("accuracy-stat");
const missedStat = $("missed-stat");
const bookmarksStat = $("bookmarks-stat");
const exportBtn = $("export-btn");
const resetBtn = $("reset-btn");
const quitBtn = $("quit-btn");
const quizModeLabel = $("quiz-mode-label");
const timerEl = $("timer");
const progressFill = $("progress-fill");
const questionPosition = $("question-position");
const questionDomain = $("question-domain");
const questionType = $("question-type");
const quizTitle = $("quiz-title");
const choiceList = $("choice-list");
const feedback = $("feedback");
const bookmarkBtn = $("bookmark-btn");
const prevBtn = $("prev-btn");
const checkBtn = $("check-btn");
const nextBtn = $("next-btn");
const resultScore = $("result-score");
const resultSummary = $("result-summary");
const domainResults = $("domain-results");
const reviewList = $("review-list");
const againBtn = $("again-btn");

let storage = null;
let progress = emptyProgress();
let currentTrack = "practitioner";

/** @type {{ questions: import('./data/questions.mjs').QUESTIONS[number][], answers: Record<string, number[]>, index: number, mode: 'practice'|'exam', checked: Set<string>, deadline: number|null, timerId: number|null, lastResult: ReturnType<typeof scoreQuiz>|null }} */
let session = null;

function formatPoolHint(focus, track, domain) {
  const trackName = TRACKS[track].name;
  if (focus === "missed") return `No missed questions saved yet for ${trackName}. Complete a session or switch pool to “Entire question bank”.`;
  if (focus === "bookmarks") return `No bookmarked questions for ${trackName}. Save questions during a session or switch pool.`;
  const domainLabel = domain === "all" ? "all domains" : domain;
  return `No questions match ${trackName} (${domainLabel}) with the current filters.`;
}

function averageAccuracy(attempts) {
  const scoped = attempts.filter((a) => a.track === currentTrack);
  const list = scoped.length ? scoped : attempts;
  if (!list.length) return null;
  const sum = list.reduce((n, a) => n + (a.percent ?? 0), 0);
  return Math.round(sum / list.length);
}

function updateHeaderCounts() {
  const validation = validateBank(QUESTIONS);
  $("question-total").textContent = `${validation.total} ORIGINAL QUESTIONS`;
  $("library-total").textContent = `${validation.total} ORIGINAL QUESTIONS`;
  for (const btn of trackGrid.querySelectorAll("[data-count]")) {
    const key = btn.getAttribute("data-count");
    btn.textContent = `${validation.counts[key] ?? 0} QUESTIONS`;
  }
}

function updateStats() {
  attemptsStat.textContent = String(progress.attempts.length);
  const avg = averageAccuracy(progress.attempts);
  accuracyStat.textContent = avg === null ? " | " : `${avg}%`;
  const missedInTrack = progress.missed.filter((id) =>
    QUESTIONS.some((q) => q.id === id && q.track === currentTrack)
  ).length;
  const bookmarksInTrack = progress.bookmarks.filter((id) =>
    QUESTIONS.some((q) => q.id === id && q.track === currentTrack)
  ).length;
  missedStat.textContent = String(missedInTrack);
  bookmarksStat.textContent = String(bookmarksInTrack);
}

function setActiveTrack(trackId) {
  if (!TRACKS[trackId]) return;
  currentTrack = trackId;
  for (const card of trackGrid.querySelectorAll(".track-card")) {
    const active = card.dataset.track === trackId;
    card.classList.toggle("is-active", active);
    card.setAttribute("aria-pressed", active ? "true" : "false");
  }
  renderDomainOptions();
  renderGuide();
  updateStats();
  sessionHint.textContent = `Ready for ${TRACKS[trackId].code}  |  configure a session and start.`;
}

function renderDomainOptions() {
  const track = TRACKS[currentTrack];
  domainSelect.innerHTML = `<option value="all">All domains</option>`;
  for (const d of track.domains) {
    const opt = document.createElement("option");
    opt.value = d.id;
    opt.textContent = d.id;
    domainSelect.appendChild(opt);
  }
}

function renderGuide() {
  const track = TRACKS[currentTrack];
  guideIntro.textContent = track.description;
  officialGuide.href = track.guide;
  officialGuide.textContent = track.independent ? "OFFICIAL AWS TECHNICAL REFERENCE ↗" : "OFFICIAL EXAM GUIDE ↗";
  retirementNote.hidden = currentTrack !== "networking";
  domainGrid.innerHTML = "";
  const lessons = LESSONS[currentTrack] ?? {};
  for (const domain of track.domains) {
    const lesson = lessons[domain.id];
    const card = document.createElement("article");
    card.className = "domain-card";
    card.innerHTML = `
      <header class="domain-card-head">
        <h3>${escapeHtml(domain.id)}</h3>
        <span class="domain-weight">${domain.weight}%</span>
      </header>
      <div class="domain-gauge" role="presentation" aria-hidden="true"><span style="width:${domain.weight}%"></span></div>
      <p class="domain-note">${escapeHtml(domain.note)}</p>
    `;
    if (lesson) {
      const body = document.createElement("div");
      body.className = "domain-lesson";
      body.innerHTML = `
        <p>${escapeHtml(lesson.summary)}</p>
        <ul>${lesson.concepts.map((c) => `<li>${escapeHtml(c)}</li>`).join("")}</ul>
        <p class="domain-example"><strong>Example:</strong> ${escapeHtml(lesson.example)}</p>
      `;
      card.appendChild(body);
    }
    domainGrid.appendChild(card);
  }
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function showView(name) {
  dashboard.hidden = name !== "dashboard";
  quizView.hidden = name !== "quiz";
  resultsView.hidden = name !== "results";
  $("incident-view").hidden = name !== "incident";
  document.body.classList.toggle("incident-active", name === "incident");
  const hero = document.querySelector(".hero");
  if (hero) hero.hidden = name !== "dashboard";
  if (name === "dashboard") stopTimer();

  // View navigation is immediate even when page anchors use smooth scroll.
  const root = document.documentElement;
  const previous = root.style.scrollBehavior;
  root.style.scrollBehavior = "auto";
  window.scrollTo(0, 0);
  root.style.scrollBehavior = previous;
  if (name === "quiz") quizTitle.focus({ preventScroll: true });
  if (name === "results") $("results-title").focus({ preventScroll: true });
  if (name === "incident") $("incident-title").focus({ preventScroll: true });
}

function stopTimer() {
  if (session?.timerId) {
    clearInterval(session.timerId);
    session.timerId = null;
  }
}

function startTimer(deadlineMs) {
  stopTimer();
  if (!session) return;
  session.deadline = deadlineMs;
  const tick = () => {
    const left = Math.max(0, deadlineMs - Date.now());
    timerEl.textContent = formatTime(left);
    if (left <= 0) {
      stopTimer();
      finishSession("time");
    }
  };
  tick();
  session.timerId = window.setInterval(tick, 250);
}

function formatTime(ms) {
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function startSession(event) {
  event.preventDefault();
  const domain = domainSelect.value;
  const mode = modeSelect.value;
  const count = countSelect.value;
  const focus = focusSelect.value;
  const missed = progress.missed;
  const bookmarks = progress.bookmarks;

  let questions;
  try {
    questions = selectQuestions(QUESTIONS, {
      track: currentTrack,
      domain,
      count,
      missed,
      bookmarks,
      focus
    });
  } catch (err) {
    sessionHint.textContent = err.message;
    return;
  }

  if (!questions.length) {
    sessionHint.textContent = formatPoolHint(focus, currentTrack, domain);
    return;
  }

  sessionHint.textContent = "";
  session = {
    questions,
    answers: {},
    index: 0,
    mode,
    checked: new Set(),
    deadline: null,
    timerId: null,
    lastResult: null
  };

  quizModeLabel.textContent = mode === "exam" ? "TIMED EXAM" : "PRACTICE MODE";
  if (mode === "exam") {
    const track = TRACKS[currentTrack];
    const minutes = questions.length * track.minutesPerQuestion;
    timerEl.setAttribute("aria-live", "polite");
    startTimer(Date.now() + minutes * 60 * 1000);
  } else {
    timerEl.textContent = "UNTIMED";
    timerEl.setAttribute("aria-live", "off");
  }

  showView("quiz");
  renderQuestion();
}

function currentQuestion() {
  return session?.questions[session.index] ?? null;
}

function getSelectionFor(q) {
  return session.answers[q.id] ? [...session.answers[q.id]] : [];
}

function setSelectionFor(q, indices) {
  session.answers[q.id] = [...new Set(indices)].sort((a, b) => a - b);
}

function isChecked(q) {
  return session.mode === "practice" && session.checked.has(q.id);
}

function requiredCount(q) {
  return q.answers.length;
}

function questionTypeLabel(q) {
  const n = requiredCount(q);
  if (n > 1) return `SELECT ${n}`;
  return "SELECT ONE";
}

function renderQuestion() {
  const q = currentQuestion();
  if (!q || !session) return;

  const total = session.questions.length;
  const pos = session.index + 1;
  questionPosition.textContent = `QUESTION ${pos} OF ${total}`;
  questionDomain.textContent = q.domain.toUpperCase();
  questionType.textContent = questionTypeLabel(q);
  quizTitle.textContent = q.stem;

  const pct = ((pos - 1) / total) * 100;
  progressFill.style.width = `${pct}%`;

  const selected = getSelectionFor(q);
  const locked = isChecked(q);
  const multi = requiredCount(q) > 1;

  choiceList.innerHTML = "";
  q.options.forEach((label, i) => {
    const id = `choice-${q.id}-${i}`;
    const wrap = document.createElement("label");
    wrap.className = "choice";
    const input = document.createElement("input");
    input.type = multi ? "checkbox" : "radio";
    input.name = multi ? `q-${q.id}` : `q-${q.id}-single`;
    input.id = id;
    input.value = String(i);
    input.checked = selected.includes(i);
    input.disabled = locked;
    input.addEventListener("change", () => onChoiceChange(q, i, multi));
    const span = document.createElement("span");
    span.className = "choice-text";
    span.textContent = label;
    wrap.appendChild(input);
    wrap.appendChild(span);
    choiceList.appendChild(wrap);
  });

  feedback.hidden = true;
  feedback.textContent = "";
  feedback.className = "feedback";

  if (session.mode === "practice" && locked) {
    showPracticeFeedback(q);
  }

  prevBtn.disabled = session.index === 0;
  updateNavButtons(q);
  updateBookmarkButton(q);
}

function onChoiceChange(q, index, multi) {
  if (isChecked(q)) return;
  let next;
  if (multi) {
    next = getSelectionFor(q);
    const pos = next.indexOf(index);
    if (pos >= 0) next.splice(pos, 1);
    else next.push(index);
  } else {
    next = [index];
  }
  setSelectionFor(q, next);
  updateNavButtons(q);
}

function selectionComplete(q) {
  return getSelectionFor(q).length === requiredCount(q);
}

function updateNavButtons(q) {
  const practice = session.mode === "practice";
  const checked = isChecked(q);
  const atEnd = session.index >= session.questions.length - 1;

  checkBtn.hidden = !practice || checked;
  nextBtn.hidden = practice ? !checked : false;

  if (practice) {
    checkBtn.disabled = !selectionComplete(q);
    checkBtn.textContent = "CHECK ANSWER →";
  } else {
    nextBtn.textContent = atEnd ? "FINISH SESSION →" : "NEXT QUESTION →";
  }

  if (practice && checked) {
    nextBtn.textContent = atEnd ? "VIEW RESULTS →" : "NEXT QUESTION →";
  }
}

function showPracticeFeedback(q) {
  const selected = getSelectionFor(q);
  const correct = evaluate(q, selected);
  feedback.hidden = false;
  feedback.classList.add(correct ? "is-correct" : "is-incorrect");
  feedback.innerHTML = `<strong>${correct ? "Correct." : "Not quite."}</strong> ${escapeHtml(q.explanation)}`;
}

function onCheck() {
  const q = currentQuestion();
  if (!q || session.mode !== "practice" || isChecked(q)) return;
  if (!selectionComplete(q)) return;
  session.checked.add(q.id);
  renderQuestion();
}

function onNext() {
  if (!session) return;
  if (session.index >= session.questions.length - 1) {
    finishSession("complete");
    return;
  }
  session.index += 1;
  renderQuestion();
}

function onPrev() {
  if (!session || session.index === 0) return;
  session.index -= 1;
  renderQuestion();
}

function updateBookmarkButton(q) {
  const saved = progress.bookmarks.includes(q.id);
  bookmarkBtn.textContent = saved ? "★ SAVED" : "☆ SAVE QUESTION";
  bookmarkBtn.setAttribute("aria-pressed", saved ? "true" : "false");
}

function toggleBookmark() {
  const q = currentQuestion();
  if (!q) return;
  const set = new Set(progress.bookmarks);
  if (set.has(q.id)) set.delete(q.id);
  else set.add(q.id);
  progress = { ...progress, bookmarks: [...set] };
  if (!storeProgress(storage, progress)) {
    sessionHint.textContent = "Could not save bookmarks  |  browser storage may be unavailable.";
  }
  updateBookmarkButton(q);
  updateStats();
}

function finishSession(reason) {
  if (!session) return;
  stopTimer();
  const questions = session.questions;
  const result = scoreQuiz(questions, session.answers);
  progress = recordAttempt(progress, {
    track: currentTrack,
    mode: session.mode,
    result
  });
  const stored = storeProgress(storage, progress);
  session = null;
  renderResults(result, questions, reason, stored);
  showView("results");
  updateStats();
}

function renderResults(result, questions, reason, stored) {
  resultScore.textContent = `${result.percent}%`;
  const reasonNote =
    reason === "time"
      ? "Time expired  |  your answers were scored automatically."
      : `${result.correct} of ${result.total} correct this session.`;
  resultSummary.textContent = stored
    ? reasonNote
    : `${reasonNote} Progress could not be saved (storage unavailable).`;

  domainResults.innerHTML = "";
  for (const [domain, stats] of Object.entries(result.byDomain)) {
    const row = document.createElement("div");
    row.className = "domain-result-row";
    const pct = stats.total ? Math.round((stats.correct / stats.total) * 100) : 0;
    row.innerHTML = `
      <span class="domain-result-name">${escapeHtml(domain)}</span>
      <span class="domain-result-bar" role="presentation"><span style="width:${pct}%"></span></span>
      <span class="domain-result-score">${stats.correct}/${stats.total} (${pct}%)</span>
    `;
    domainResults.appendChild(row);
  }

  reviewList.innerHTML = "";
  const byId = new Map(questions.map((q) => [q.id, q]));
  for (const item of result.detail) {
    const q = byId.get(item.id);
    if (!q) continue;
    const card = document.createElement("article");
    card.className = `review-item ${item.correct ? "is-correct" : "is-incorrect"}`;
    const selectedLabels = item.selected.map((i) => q.options[i]).join("; ") || " | ";
    const answerLabels = q.answers.map((i) => q.options[i]).join("; ");
    card.innerHTML = `
      <header><span class="review-badge">${item.correct ? "Correct" : "Incorrect"}</span><span>${escapeHtml(q.domain)}</span></header>
      <p class="review-stem">${escapeHtml(q.stem)}</p>
      <p><strong>Your answer:</strong> ${escapeHtml(selectedLabels)}</p>
      <p><strong>Correct:</strong> ${escapeHtml(answerLabels)}</p>
      <p class="review-explanation">${escapeHtml(q.explanation)}</p>
    `;
    reviewList.appendChild(card);
  }
}

function exportProgress() {
  const blob = new Blob([JSON.stringify(progress, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "cloudops-lab-progress.json";
  a.click();
  URL.revokeObjectURL(url);
}

function resetProgress() {
  const ok = window.confirm(
    "Reset all local progress, missed questions, bookmarks, and session history? This cannot be undone."
  );
  if (!ok) return;
  progress = emptyProgress();
  storeProgress(storage, progress);
  updateStats();
  sessionHint.textContent = "Local progress cleared.";
}

function onQuit() {
  if (session && !window.confirm("Exit this session without saving results to history?")) return;
  stopTimer();
  session = null;
  showView("dashboard");
}

function onKeyDown(event) {
  if (!session || quizView.hidden) return;
  const q = currentQuestion();
  if (!q) return;
  if (event.key === "ArrowLeft" && !prevBtn.disabled) {
    event.preventDefault();
    onPrev();
  }
  if (event.key === "ArrowRight") {
    event.preventDefault();
    if (!checkBtn.hidden && !checkBtn.disabled) onCheck();
    else if (!nextBtn.hidden) onNext();
  }
}

function initStorageFallback() {
  try {
    storage = window.localStorage;
    const probe = "__storage_probe__";
    storage.setItem(probe, "1");
    storage.removeItem(probe);
  } catch {
    const mem = new Map();
    storage = {
      getItem: (k) => (mem.has(k) ? mem.get(k) : null),
      setItem: (k, v) => {
        mem.set(k, v);
      },
      removeItem: (k) => {
        mem.delete(k);
      }
    };
  }
  progress = readProgress(storage);
}

function init() {
  initStorageFallback();
  const validation = validateBank(QUESTIONS);
  if (validation.issues.length) {
    console.warn("Question bank validation:", validation.issues);
  }
  updateHeaderCounts();

  trackGrid.addEventListener("click", (e) => {
    const card = e.target.closest(".track-card");
    if (card?.dataset.track) setActiveTrack(card.dataset.track);
  });

  sessionForm.addEventListener("submit", startSession);
  checkBtn.addEventListener("click", onCheck);
  nextBtn.addEventListener("click", onNext);
  prevBtn.addEventListener("click", onPrev);
  bookmarkBtn.addEventListener("click", toggleBookmark);
  quitBtn.addEventListener("click", onQuit);
  againBtn.addEventListener("click", () => showView("dashboard"));
  exportBtn.addEventListener("click", exportProgress);
  resetBtn.addEventListener("click", resetProgress);
  document.addEventListener("keydown", onKeyDown);

  setActiveTrack(currentTrack);
  setupIncidentUI(showView);
}

init();
