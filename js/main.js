import { loadPlayerAtlases } from './player-model.js?v=0.6';
import { FootballAudio } from './audio.js?v=0.6';
import { BALANCE } from './tuning.js?v=0.6';
import { MovementClock } from './movement.js?v=0.6';
import { Game } from './engine.js?v=0.6';
import { render } from './renderer.js?v=0.6';

const game = new Game();
const $ = id => document.getElementById(id);
const canvas = $('field');
const ctx = canvas.getContext('2d');
await loadPlayerAtlases();
let reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const audio = new FootballAudio();
let led = false, sound = true, held = null, activePointer = null;
const movement = new MovementClock(BALANCE.playerStepSeconds);
let last = performance.now(), best = 0, priorPhase = 'ready', lastEvent = 0, pausePhase = 'live';
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

function beep() { audio.unlock(); }

function release() {
  held = null;
  movement.cancel();
  activePointer = null;
  for (const button of document.querySelectorAll('[data-dir]')) button.classList.remove('held');
}
function snap() {
  release();
  game.snap();
  movement.reset();
  beep();
}
function pause() {
  if (game.phase === 'live' || game.phase === 'aftermath') {
    pausePhase = game.phase;
    game.phase = 'paused';
    release();
  } else if (game.phase === 'paused' && $('settings').hidden) {
    game.phase = pausePhase;
  }
}
function setSettings(open) {
  $('settings').hidden = !open;
  $('settings-toggle').setAttribute('aria-expanded', String(open));
  if (open) {
    release();
    if (game.phase === 'live' || game.phase === 'aftermath') pause();
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
$('control-mode').onclick = () => {
  release();
  game.setControlMode(game.controlMode === 'arcade' ? 'classic' : 'arcade');
  movement.reset();
  priorPhase = game.phase;
  lastHud = '';
  beep();
};
$('mode').onclick = () => {
  led = !led;
  $('mode').setAttribute('aria-pressed', String(led));
  $('mode').textContent = led ? 'Sprite mode' : 'LED mode';
};
$('effects-volume').oninput = event => { audio.effects = Number(event.target.value) / 100; };
$('crowd-volume').oninput = event => { audio.crowd = Number(event.target.value) / 100; };
$('motion').onclick = () => {
  reducedMotion = !reducedMotion;
  $('motion').setAttribute('aria-pressed', String(reducedMotion));
  $('motion').textContent = reducedMotion ? 'Reduced motion on' : 'Reduced motion off';
};
$('sound').onclick = () => {
  sound = !sound;
  audio.setEnabled(sound);
  $('sound').setAttribute('aria-pressed', String(sound));
  $('sound').textContent = sound ? 'Sound on' : 'Sound off';
  beep();
};

const keys = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', a: 'left', s: 'down', d: 'right' };
function start(direction) {
  if (game.phase !== 'live' || !$('settings').hidden) return;
  held = direction;
  if (game.controlMode === 'classic' || direction === 'left' || direction === 'right') {
    movement.press(direction);
    movement.advance(0, next => game.move(next));
  }
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
  if ((keys[event.key] || keys[event.key.toLowerCase()]) === held) {
    held = null; movement.release();
    for (const button of document.querySelectorAll('[data-dir]')) button.classList.remove('held');
  }
});
window.addEventListener('blur', () => { release(); if (game.phase === 'live' || game.phase === 'aftermath') pause(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { release(); if (game.phase === 'live' || game.phase === 'aftermath') pause(); }
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
    button.addEventListener(name, event => {
      if (activePointer === event.pointerId) {
        held=null; activePointer=null; movement.release();
        button.classList.remove('held');
      }
    });
  }
  button.addEventListener('contextmenu', event => event.preventDefault());
  // Native keyboard activation of a direction button takes one step.
  button.addEventListener('click', event => {
    if (event.detail === 0 && game.phase === 'live' && $('settings').hidden) {
      if (game.controlMode === 'classic' || button.dataset.dir === 'left' || button.dataset.dir === 'right') {
        movement.press(button.dataset.dir);
        movement.advance(0, direction => game.move(direction));
        movement.release();
      }
    }
  });
}

function updateHud() {
  const seconds = Math.ceil(game.time);
  const signature = [game.phase, game.controlMode, seconds, game.score, game.down, game.target, game.spot, game.message, Math.floor(best)].join('|');
  if (signature === lastHud) return;
  lastHud = signature;
  $('home').textContent = game.score;
  $('clock').textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  $('down').textContent = `${['', '1st', '2nd', '3rd', '4th'][Math.min(4, game.down)]} & ${game.target === 100 ? 'GOAL' : Math.max(0, game.target - game.spot)}`;
  $('spot').textContent = game.spot <= 50 ? `GL ${game.spot}` : `IV ${100 - game.spot}`;
  $('message').textContent = game.phase === 'paused' ? 'Play paused. Press Resume when you are ready.' : game.message;
  $('snap-label').textContent = game.phase === 'over' ? 'NEW DRIVE' : game.phase === 'live' ? 'BALL LIVE' : game.phase === 'paused' ? 'PAUSED' : game.phase === 'aftermath' ? 'PLAY RESULT' : 'SNAP BALL';
  $('snap').disabled = !['ready','over'].includes(game.phase);
  $('pause').textContent = game.phase === 'paused' ? 'Resume' : 'Pause';
  $('pause').disabled = game.phase === 'ready' || game.phase === 'over';
  $('live').textContent = { aftermath: 'WHISTLE', ready: 'PRE-SNAP', live: '● LIVE', paused: 'PAUSED', over: game.score === 20 ? 'TOUCHDOWN' : 'FINAL' }[game.phase];
  $('live').dataset.phase = game.phase;
  $('best').textContent = `${Math.floor(best)} yards`;
  $('control-hint').textContent = game.phase === 'live'
    ? game.controlMode === 'arcade'
      ? 'AUTO-RUN · ◀ ▶ STEER · ▲ SURGE · ▼ BRAKE'
      : 'HOLD A DIRECTION TO RUN'
    : game.phase === 'over' ? 'READY FOR ANOTHER DRIVE?' : 'READ THE DEFENSE · THEN SNAP';
  $('control-mode').textContent = game.controlMode === 'arcade'
    ? 'Switch to Classic steps' : 'Switch to Arcade run';
  document.querySelector('[data-dir="up"]').setAttribute('aria-label',
    game.controlMode === 'arcade' ? 'Hold for a running surge' : 'Run forward');
  document.querySelector('[data-dir="down"]').setAttribute('aria-label',
    game.controlMode === 'arcade' ? 'Hold to brake' : 'Run backward');
}
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000);
  last = now;
  if (game.phase === 'live') movement.advance(dt, direction => game.move(direction));
  game.update(dt, game.controlMode === 'arcade' ? held : null);
  if (game.phase !== priorPhase) {
    if (['ready','over','aftermath'].includes(game.phase)) release();
    priorPhase = game.phase;
  }
  if (game.eventId !== lastEvent) {
    lastEvent = game.eventId;
    if (game.event) {
      audio.event(game.event.type);
      const strip = document.querySelector('.play-strip');
      strip.dataset.result = game.event.type;
    }
  }
  audio.update(game);
  if (game.gained > best) {
    best = game.gained;
    try { localStorage.setItem('old-school-football-best', String(best)); } catch {}
  }
  updateHud();
  render(ctx, game, led, now / 1000, { width, height, dpr, reducedMotion });
  requestAnimationFrame(frame);
}
$('motion').setAttribute('aria-pressed', String(reducedMotion));
$('motion').textContent = reducedMotion ? 'Reduced motion on' : 'Reduced motion off';
// Opt-in local QA surface; absent from normal game sessions.
if (new URLSearchParams(location.search).has('qa')) window.footballQA = { game, audio };
updateHud();
requestAnimationFrame(frame);

