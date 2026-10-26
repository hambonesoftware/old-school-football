import { Game } from './engine.js?v=0.3.1';
import { render } from './renderer.js?v=0.3.1';

const game = new Game();
const $ = id => document.getElementById(id);
const canvas = $('field');
const ctx = canvas.getContext('2d');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
let led = false, sound = false, audio, held = null, activePointer = null;
let nextMove = 0, last = performance.now(), best = 0, priorPhase = 'ready';
let width = 1000, height = 650, dpr = 1, lastHud = '';
try { best = Number(localStorage.getItem('old-school-football-best')) || 0; } catch {}

function resize() {
  const rect = canvas.getBoundingClientRect();
  width = rect.width;
  height = rect.height;
  dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
}
new ResizeObserver(resize).observe(canvas);
resize();

function beep() {
  if (!sound) return;
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    audio.resume();
    const oscillator = audio.createOscillator();
    const volume = audio.createGain();
    oscillator.connect(volume);
    volume.connect(audio.destination);
    oscillator.frequency.value = game.phase === 'over' ? 440 : 180;
    volume.gain.setValueAtTime(.045, audio.currentTime);
    volume.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .15);
    oscillator.start();
    oscillator.stop(audio.currentTime + .16);
  } catch {}
}

function release() {
  held = null;
  activePointer = null;
  for (const button of document.querySelectorAll('[data-dir]')) button.classList.remove('held');
}
function snap() {
  release();
  game.snap();
  beep();
}
function pause() {
  if (game.phase === 'live') {
    game.phase = 'paused';
    release();
  } else if (game.phase === 'paused' && $('settings').hidden) {
    game.phase = 'live';
  }
}
function setSettings(open) {
  $('settings').hidden = !open;
  $('settings-toggle').setAttribute('aria-expanded', String(open));
  if (open) {
    release();
    if (game.phase === 'live') game.phase = 'paused';
    $('settings-close').focus();
  } else {
    $('settings-toggle').focus();
  }
}
$('snap').onclick = snap;
$('pause').onclick = pause;
$('restart').onclick = () => { release(); game.reset(); setSettings(false); };
$('settings-toggle').onclick = () => setSettings($('settings').hidden);
$('settings-close').onclick = () => setSettings(false);
$('mode').onclick = () => {
  led = !led;
  $('mode').setAttribute('aria-pressed', String(led));
  $('mode').textContent = led ? 'Sprite mode' : 'LED mode';
};
$('sound').onclick = () => {
  sound = !sound;
  $('sound').setAttribute('aria-pressed', String(sound));
  $('sound').textContent = sound ? 'Sound on' : 'Sound off';
  beep();
};

const keys = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', a: 'left', s: 'down', d: 'right' };
function start(direction) {
  if (game.phase !== 'live' || !$('settings').hidden) return;
  held = direction;
  game.move(direction);
  nextMove = performance.now() + 170;
  document.querySelector(`[data-dir="${direction}"]`)?.classList.add('held');
}
window.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !$('settings').hidden) { setSettings(false); return; }
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
  if (!$('settings').hidden) return;
  const direction = keys[event.key] || keys[event.key.toLowerCase()];
  if (direction) {
    event.preventDefault();
    if (!event.repeat) { release(); start(direction); }
  }
  if (event.code === 'Space' && !(event.target instanceof HTMLButtonElement)) {
    event.preventDefault();
    if (!event.repeat) snap();
  }
  if (event.key.toLowerCase() === 'p' && !event.repeat) pause();
});
window.addEventListener('keyup', event => {
  if ((keys[event.key] || keys[event.key.toLowerCase()]) === held) release();
});
window.addEventListener('blur', () => { release(); if (game.phase === 'live') pause(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { release(); if (game.phase === 'live') pause(); }
});
for (const button of document.querySelectorAll('[data-dir]')) {
  button.addEventListener('pointerdown', event => {
    event.preventDefault();
    release();
    activePointer = event.pointerId;
    button.setPointerCapture(event.pointerId);
    start(button.dataset.dir);
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    button.addEventListener(name, event => { if (activePointer === event.pointerId) release(); });
  }
  button.addEventListener('contextmenu', event => event.preventDefault());
  // Native keyboard activation of a direction button takes one step.
  button.addEventListener('click', event => { if (event.detail === 0) game.move(button.dataset.dir); });
}

function updateHud() {
  const seconds = Math.ceil(game.time);
  const signature = [game.phase, seconds, game.score, game.down, game.target, game.spot, game.message, best].join('|');
  if (signature === lastHud) return;
  lastHud = signature;
  $('home').textContent = game.score;
  $('clock').textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  $('down').textContent = `${['', '1st', '2nd', '3rd', '4th'][Math.min(4, game.down)]} & ${game.target === 100 ? 'GOAL' : Math.max(0, game.target - game.spot)}`;
  $('spot').textContent = game.spot <= 50 ? `GL ${game.spot}` : `IV ${100 - game.spot}`;
  $('message').textContent = game.phase === 'paused' ? 'Play paused. Press Resume when you are ready.' : game.message;
  $('snap-label').textContent = game.phase === 'over' ? 'NEW DRIVE' : game.phase === 'live' ? 'BALL LIVE' : game.phase === 'paused' ? 'PAUSED' : 'SNAP BALL';
  $('snap').disabled = game.phase === 'live' || game.phase === 'paused';
  $('pause').textContent = game.phase === 'paused' ? 'Resume' : 'Pause';
  $('pause').disabled = game.phase === 'ready' || game.phase === 'over';
  $('live').textContent = { ready: 'PRE-SNAP', live: '● LIVE', paused: 'PAUSED', over: game.score === 20 ? 'TOUCHDOWN' : 'FINAL' }[game.phase];
  $('live').dataset.phase = game.phase;
  $('best').textContent = `${best} yards`;
  $('control-hint').textContent = game.phase === 'live' ? 'HOLD A DIRECTION TO RUN' : game.phase === 'over' ? 'READY FOR ANOTHER DRIVE?' : 'READ THE DEFENSE · THEN SNAP';
}
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000);
  last = now;
  if (held && now >= nextMove) { game.move(held); nextMove = now + 170; }
  game.update(dt);
  if (game.phase !== priorPhase) {
    if (game.phase === 'ready' || game.phase === 'over') { release(); beep(); }
    priorPhase = game.phase;
  }
  if (game.gained > best) {
    best = game.gained;
    try { localStorage.setItem('old-school-football-best', String(best)); } catch {}
  }
  updateHud();
  render(ctx, game, led, now / 1000, { width, height, dpr, reducedMotion });
  requestAnimationFrame(frame);
}
updateHud();
requestAnimationFrame(frame);
