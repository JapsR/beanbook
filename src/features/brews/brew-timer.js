/**
 * The brew timer on the preparation form.
 *
 * Start / pause / reset a stopwatch while brewing. Pausing writes the time into the "Brew time" field,
 * and on methods with pouring stages the "Pour" button records when each pour starts: it fills the
 * start times of the stages already listed (a recipe copied from the last cup) in order, then adds
 * new rows. The screen is kept awake while the timer runs, where the browser allows it.
 */
import { $, esc } from "../../core/dom.js";
import { fieldType, formatDuration } from "../../ui/field-types.js";
import { icon } from "../../ui/icons.js";
import { methodById } from "../../domain/brew-methods.js";
import { stageRow } from "./brew-advanced-fields.js";

const timer = { startedAt: 0, elapsed: 0, tick: 0, pours: 0, lock: null };

const timerSeconds = () => Math.floor((timer.elapsed + (timer.tick ? performance.now() - timer.startedAt : 0)) / 1000);

export const timerBox = (time, methodId) => `<div class="timer" id="brew-timer">
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
  const t = formatDuration(timerSeconds()), rows = list.querySelectorAll(".stage");
  if (timer.pours < rows.length) {
    rows[timer.pours].querySelector("[name=st-t]").value = t;
  } else {
    list.insertAdjacentHTML("beforeend", stageRow({ t }));
  }
  timer.pours++;
  drawTimer();
}

/* Shows or hides the Pour button when the method changes. */
export function timerMethodChanged(id) {
  const b = $("#bt-pour");
  if (b) {
    b.hidden = !methodById(id).pour;
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
