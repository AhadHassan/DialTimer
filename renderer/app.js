'use strict';

const STEP_SEC = 60;
const FAST_STEP_SEC = 300;
const FAST_COUNT = 4;       // more than this many detents...
const FAST_WINDOW_MS = 300; // ...within this window switches to the fast step
const MAX_MS = 9 * 3600 * 1000;
const OPACITY_STEP = 0.05;
const OPACITY_MIN = 0.05;
const HINT_DEFAULT = 'turn ±1 min · click start/pause · hold reset · scroll opacity · esc quit';

const timeEl = document.getElementById('time');
const hintEl = document.getElementById('hint');

// idle: stopped at a set time, running, paused, alarm: finished and waiting for a click.
let state = 'idle';
let remainingMs = 300000;
let lastDurationMs = 300000;
let endAt = 0;
let opacity = 0.45;
let detents = [];

/* ---------- hint line ---------- */

let hintTimer = null;
function showHint(text, holdMs) {
  hintEl.textContent = text;
  hintEl.classList.remove('hidden');
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => hintEl.classList.add('hidden'), holdMs);
}

/* ---------- display ---------- */

function currentMs() {
  return state === 'running' ? Math.max(0, endAt - Date.now()) : remainingMs;
}

function format(ms) {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

let lastText = '';
function render() {
  const text = format(currentMs());
  if (text !== lastText) {
    lastText = text;
    timeEl.innerHTML = [...text]
      .map((ch) => `<span class="${ch === ':' ? 'c' : 'd'}">${ch}</span>`)
      .join('');
    timeEl.classList.toggle('hours', text.length > 5);
  }
  timeEl.classList.toggle('paused', state === 'paused');
  timeEl.classList.toggle('alarm', state === 'alarm');
}

/* ---------- chime ---------- */

let audioCtx = null;
let chimeTimer = null;

function bell(freq, start, peak) {
  for (const [mult, level] of [[1, 1], [2.76, 0.25], [5.4, 0.08]]) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq * mult;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak * level, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.8 / mult ** 0.3);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(start);
    osc.stop(start + 2);
  }
}

function chimeOnce() {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const t = audioCtx.currentTime + 0.05;
  // E5 G5 B5 E6 arpeggio
  [659.25, 783.99, 987.77, 1318.51].forEach((f, i) => bell(f, t + i * 0.2, 0.18));
}

function startAlarm() {
  chimeOnce();
  chimeTimer = setInterval(chimeOnce, 2600);
}

function stopAlarm() {
  clearInterval(chimeTimer);
  chimeTimer = null;
}

/* ---------- timer actions ---------- */

function finish() {
  state = 'alarm';
  remainingMs = 0;
  startAlarm();
}

function turn(direction) {
  if (state === 'alarm') return;

  const now = performance.now();
  detents = detents.filter((t) => now - t <= FAST_WINDOW_MS);
  detents.push(now);
  const stepMs = (detents.length > FAST_COUNT ? FAST_STEP_SEC : STEP_SEC) * 1000;

  const next = Math.min(MAX_MS, Math.max(0, currentMs() + direction * stepMs));
  if (state === 'running') {
    endAt = Date.now() + next;
    if (next === 0) finish();
  } else {
    remainingMs = next;
    if (next === 0) state = 'idle';
  }
}

function click() {
  if (state === 'alarm') {
    stopAlarm();
    state = 'idle';
    remainingMs = lastDurationMs;
  } else if (state === 'running') {
    remainingMs = currentMs();
    state = 'paused';
  } else if (remainingMs > 0) {
    if (state === 'idle') {
      lastDurationMs = remainingMs;
      window.dial.setSettings({ lastDuration: Math.round(lastDurationMs / 1000) });
    }
    endAt = Date.now() + remainingMs;
    state = 'running';
  }
}

function reset() {
  stopAlarm();
  state = 'idle';
  remainingMs = lastDurationMs;
}

/* ---------- opacity ---------- */

let saveOpacityTimer = null;
function setOpacity(value) {
  opacity = Math.min(1, Math.max(OPACITY_MIN, Math.round(value * 100) / 100));
  document.documentElement.style.setProperty('--bg-alpha', opacity);
  clearTimeout(saveOpacityTimer);
  saveOpacityTimer = setTimeout(() => window.dial.setSettings({ opacity }), 300);
}

window.addEventListener('wheel', (e) => {
  setOpacity(opacity + (e.deltaY < 0 ? OPACITY_STEP : -OPACITY_STEP));
  showHint(`background ${Math.round(opacity * 100)}%`, 1500);
}, { passive: true });

/* ---------- input ---------- */

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    window.dial.quit();
    return;
  }
  if (e.repeat) return;
  switch (e.key) {
    case 'F13': turn(+1); break;
    case 'F14': turn(-1); break;
    case 'F15': click(); break;
    case 'F16': reset(); break;
    default: return;
  }
  e.preventDefault();
  render();
});

/* ---------- start ---------- */

(async function init() {
  const s = await window.dial.getSettings();
  setOpacity(s.opacity);
  lastDurationMs = Math.min(MAX_MS, Math.max(0, s.lastDuration * 1000)) || 300000;
  remainingMs = lastDurationMs;
  render();
  showHint(HINT_DEFAULT, 6000);

  setInterval(() => {
    if (state === 'running' && currentMs() === 0) finish();
    render();
  }, 100);
})();
