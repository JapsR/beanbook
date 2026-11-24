/**
 * The brew timer on the preparation form.
 *
 * Start / pause / reset a stopwatch while brewing. Pausing writes the time into the "Brew time" field,
 * and on methods with pouring stages the "Pour" button records when each pour starts: the first press
 * of a run replaces the stages already listed (the template copied from the last cup) with the pours
 * you actually do, one row per press. The screen is kept awake while the timer runs, where the browser allows it.
 * Methods with timer:false (filter machine, cold brew, "Other") show only the brew time field.
 */
import { $, esc } from "../../core/dom.js";
import { fieldType, formatDuration } from "../../ui/field-types.js";
import { icon } from "../../ui/icons.js";
import { hasTimer, methodById } from "../../domain/brew-methods.js";
import { stageRow } from "./brew-advanced-fields.js";

const timer = { startedAt: 0, elapsed: 0, tick: 0, pours: 0, lock: null };

const timerSeconds = () => Math.floor((timer.elapsed + (timer.tick ? performance.now() - timer.startedAt : 0)) / 1000);

export const timerBox = (time, methodId) => `<div class="timer" id="brew-timer" ${hasTimer(methodById(methodId)) ? "" : "data-off"}>
  <div class="timer-top"><output id="bt-clock" class="timer-clock num" role="timer" aria-label="Brew timer">0:00</output>
    <div class="timer-btns"><button class="btn small ghost timer-reset" type="button" data-act="timer-reset" id="bt-reset" aria-label="Reset timer" title="Reset" disabled>${icon("rot", 18)}</button>
    <button class="btn small" type="button" data-act="timer-pour" id="bt-pour" ${methodById(methodId).pour ? "" : "hidden"}>${icon("drop", 18)}Pour</button>
    <button class="btn small primary" type="button" data-act="timer-toggle" id="bt-toggle">Start</button></div></div>
  <div class="f"><label for="b-time">Brew time</label><input id="b-time" name="time" type="text" ${fieldType("duration")} placeholder="2:30" maxlength="12" value="${esc(time)}"></div>
  <p class="hint">Start the timer when the water hits the coffee. Pausing fills in the brew time.</p></div>`;

/* Called whenever the form opens, so a new preparation always starts from 0:00. */
export function resetTimer() {
  clearInterval(timer.tick);
  Object.assign(timer, { startedAt: 0, elapsed: 0, tick: 0, pours: 0 });
  releaseWake();
}

export function toggleTimer() {
  timer.tick ? pauseTimer() : startTimer();
}

function startTimer() {
  timer.startedAt = performance.now();
  timer.tick = setInterval(drawTimer, 200);
  keepAwake();
  drawTimer();
}

export function pauseTimer() {
  if (!timer.tick) {
    return;
  }
  timer.elapsed += performance.now() - timer.startedAt;
  clearInterval(timer.tick);
  timer.tick = 0;
  releaseWake();
  const t = $("#b-time");
  if (t && timerSeconds() > 0) {
    t.value = formatDuration(timerSeconds());
  }
  drawTimer();
}

export function clearTimer() {
  resetTimer();
  drawTimer();
}

/* Marks the start of a pour at the current time; the first press also starts the timer. */
export function markPour() {
  if (!timer.tick) {
    startTimer();
  }
  const tick = $("#adv-toggle"), wrap = $("#adv-wrap"), list = $("#stage-list");
  if (!list) {
    return;
  }
  if (tick && !tick.checked) {
    tick.checked = true;
    wrap.hidden = false;
  }
  if (!timer.pours) {
    list.innerHTML = "";   // the template stages make way for what is actually poured
  }
  list.insertAdjacentHTML("beforeend", stageRow({ t: formatDuration(timerSeconds()) }));
  timer.pours++;
  drawTimer();
}

/* Shows or hides the Pour button when the method changes. */
export function timerMethodChanged(id) {
  const m = methodById(id), box = $("#brew-timer");
  if (!box) {
    return;
  }
  $("#bt-pour").hidden = !m.pour;
  box.toggleAttribute("data-off", !hasTimer(m));
  if (!hasTimer(m)) {   // switched to e.g. cold brew mid-run: stop without touching the brew time
    clearTimer();
  }
}

function drawTimer() {
  const clock = $("#bt-clock");
  if (!clock) {   // the form was closed: stop quietly
    resetTimer();
    return;
  }
  const s = timerSeconds(), running = !!timer.tick;
  clock.textContent = formatDuration(s);
  $("#brew-timer").classList.toggle("on", running);
  $("#bt-toggle").textContent = running ? "Pause" : s ? "Resume" : "Start";
  $("#bt-reset").disabled = running || !s;
}

async function keepAwake() {
  try {
    timer.lock = await navigator.wakeLock?.request("screen") || null;
  } catch {
    timer.lock = null;
  }
}

function releaseWake() {
  timer.lock?.release().catch(() => {});
  timer.lock = null;
}

/* Browsers drop the wake lock when the page is hidden; take it again on return. */
export function timerVisible() {
  if (timer.tick && document.visibilityState === "visible" && $("#bt-clock")) {
    keepAwake();
  }
}
