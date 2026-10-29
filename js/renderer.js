import { drawFootballPlayer } from './player-model.js?v=0.6.1';

// Presentation state only. Interpolation never changes the rules or collision cells.
const views = new WeakMap();

function rounded(ctx, x, y, width, height, radius, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fill();
}

export function render(ctx, game, led, time, options = {}) {
  const width = options.width || 1000;
  const height = options.height || 650;
  const dpr = options.dpr || 1;
  const reducedMotion = options.reducedMotion || false;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  let view = views.get(ctx);
  if (!view) {
    view = { eventId: -1, effect: null, play: -1, lastTime: time, actors: [], camera: game.yard };
    views.set(ctx, view);
  }
  const dt = Math.min(.06, Math.max(0, time - view.lastTime));
  const blend = reducedMotion ? 1 : 1 - Math.exp(-18 * dt);
  view.lastTime = time;
  if (view.eventId !== game.eventId) {
    view.eventId = game.eventId;
    if (game.event && ['tackle', 'touchdown', 'marker', 'firstDown', 'cut'].includes(game.event.type))
      view.effect = { type: game.event.type, time, lane: game.lane, yard: game.aftermath?.yard ?? game.yard };
  }
  const effectAge = view.effect ? time - view.effect.time : 99;
  const changedPlay = view.play !== game.playNumber;
  view.play = game.playNumber;
  const snapView = changedPlay || game.phase === 'ready';
  // Let the runner advance about five yards on screen before the camera follows.
  // Separate camera damping from sprite interpolation to preserve a feeling of travel.
  const runnerAhead = game.yard - view.camera;
  let cameraTarget = view.camera;
  if (runnerAhead > 5) cameraTarget = game.yard - 5;
  if (runnerAhead < -2.5) cameraTarget = game.yard + 2.5;
  cameraTarget = Math.max(0, Math.min(90, cameraTarget));
  const cameraBlend = reducedMotion ? 1 : 1 - Math.exp(-dt / .20);
  view.camera = snapView ? game.yard
    : view.camera + (cameraTarget - view.camera) * cameraBlend;
  const margin = Math.max(29, width * .075);
  const fieldWidth = width - 2 * margin;
  const yardsToPixels = height / 37;
  const impact = !reducedMotion && view.effect?.type === 'tackle' && effectAge < .18
    ? Math.sin(effectAge * 100) * (1 - effectAge / .18) * 2 : 0;
  const yardY = yard => height * .76 - (yard - view.camera) * yardsToPixels + impact;
  const laneX = lane => margin + fieldWidth * (.13 + lane * .185);
  const scale = Math.max(.65, Math.min(1.12, width / 650, height / 410));
  ctx.fillStyle = led ? '#060c08' : '#243a2a';
  ctx.fillRect(0, 0, width, height);

  // Sideline details remain outside the playable field.
  for (let row = 0; row < height / 13; row++) {
    for (let col = 0; col < 3; col++) {
      ctx.fillStyle = ['#cfba80', '#8c293b', '#233e5b', '#e8e1cb', '#738a77'][(row * 7 + col * 3) % 5];
      const energy = game.score === 20 ? 2.5 : game.phase === 'live' ? .6 : .15;
      const lift = reducedMotion ? 0 : Math.sin(time * 5 + row * 1.7 + col) * energy;
      ctx.fillRect(4 + col * 7, row * 13 + (col % 2) * 4 + lift, 4, 5);
      ctx.fillRect(width - 8 - col * 7, row * 13 + (col % 2) * 4 - lift, 4, 5);
    }
  }
  ctx.fillStyle = led ? '#19231b' : '#d2d5c4';
  ctx.fillRect(margin - 8, 0, 5, height);
  ctx.fillRect(width - margin + 3, 0, 5, height);
  ctx.fillStyle = '#ffffff19';
  ctx.fillRect(margin - 17, height * .3, 5, height * .28);
  ctx.fillRect(width - margin + 12, height * .3, 5, height * .28);

  ctx.save();
  ctx.beginPath();
  ctx.rect(margin, 0, fieldWidth, height);
  ctx.clip();
  ctx.fillStyle = led ? '#0b160f' : '#315f32';
  ctx.fillRect(margin, 0, fieldWidth, height);
  for (let yard = 0; yard < 100; yard += 5) {
    ctx.fillStyle = led ? (yard % 10 ? '#101a12' : '#0c150f') : (yard % 10 ? '#346a38' : '#3b743d');
    ctx.fillRect(margin, yardY(yard + 5), fieldWidth, yardsToPixels * 5 + 1);
  }
  // A deterministic fine turf texture; no assets or downloads required.
  if (!led) {
    for (let i = 0; i < 3300; i++) {
      const tx = margin + ((i * 73.237) % fieldWidth);
      // Turf flecks belong to a yard on the FIELD, not a fixed screen pixel.
      const ty = yardY(-10 + ((i * 47.131) % 120));
      if (ty < -4 || ty > height + 4) continue;
      ctx.fillStyle = i % 2 ? '#c0df9212' : '#071f1814';
      ctx.fillRect(tx, ty, 1, 3);
    }
    const shade = ctx.createLinearGradient(margin, 0, width - margin, 0);
    shade.addColorStop(0, '#0624124d');
    shade.addColorStop(.5, '#ffffff00');
    shade.addColorStop(1, '#0624124d');
    ctx.fillStyle = shade;
    ctx.fillRect(margin, 0, fieldWidth, height);
  }
  for (const end of [0, 100]) {
    ctx.fillStyle = led ? '#24100e' : (end === 100 ? '#122c44' : '#722237');
    ctx.fillRect(margin, end === 100 ? yardY(110) : yardY(0), fieldWidth, yardsToPixels * 10);
    ctx.fillStyle = '#f6deb0';
    ctx.textAlign = 'center';
    ctx.font = `900 ${Math.max(17, width * .042)}px Arial`;
    ctx.fillText(end === 100 ? 'GREAT LAKES' : 'IRON VALLEY', width / 2, end === 100 ? yardY(103) : yardY(-4));
  }
  // Painted midfield monogram.
  ctx.save();
  ctx.translate(width / 2, yardY(50));
  ctx.globalAlpha = .23;
  ctx.fillStyle = '#f8d566';
  ctx.textAlign = 'center';
  ctx.font = `italic 950 ${fieldWidth * .22}px Arial`;
  ctx.fillText('GL', 0, fieldWidth * .065);
  ctx.restore();
  ctx.strokeStyle = led ? '#673128' : '#f0f2d9aa';
  for (let yard = 0; yard <= 100; yard++) {
    const py = yardY(yard);
    if (py < -25 || py > height + 25) continue;
    ctx.lineWidth = yard % 10 === 0 ? 2 : 1;
    ctx.beginPath();
    if (yard % 5 === 0) {
      ctx.moveTo(margin, py);
      ctx.lineTo(width - margin, py);
    } else {
      for (const fraction of [.025, .36, .64, .975]) {
        const hx = margin + fieldWidth * fraction;
        ctx.moveTo(hx - 3, py);
        ctx.lineTo(hx + 3, py);
      }
    }
    ctx.stroke();
    if (yard % 10 === 0 && yard > 0 && yard < 100) {
      ctx.fillStyle = led ? '#754035' : '#e8edd3cc';
      ctx.font = `bold ${Math.max(13, Math.min(25, width * .034))}px Arial`;
      ctx.textAlign = 'center';
      ctx.fillText(String(Math.min(yard, 100 - yard)), margin + fieldWidth * .065, py - 6);
      ctx.fillText(String(Math.min(yard, 100 - yard)), margin + fieldWidth * .935, py - 6);
    }
  }
  function fieldLine(yard, color) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(margin, yardY(yard));
    ctx.lineTo(width - margin, yardY(yard));
    ctx.stroke();
  }
  fieldLine(game.spot, '#66bdff');
  fieldLine(game.target, '#f9cf49');
  if (game.firstDownShown && game.phase === 'live') {
    ctx.fillStyle = '#f9cf4926';
    ctx.fillRect(margin, yardY(game.target) - 5, fieldWidth, 10);
  }
  ctx.restore();

  // Orange sideline first-down marker.
  const markerY = yardY(game.target);
  if (markerY > 0 && markerY < height) {
    rounded(ctx, width - margin + 1, markerY - 10, 8, 20, 2, '#f07b32');
  }
  const contact = game.aftermath;
  const actors = [{ lane: game.lane, yard: contact ? contact.yard : game.yard }, ...game.defenders];
  // Sort feet from far to near while preserving stable actor identities.
  actors.map((actor, index) => ({ actor, index })).sort((a,b) => b.actor.yard - a.actor.yard).forEach(({ actor, index }) => {
    let current = view.actors[index];
    // Respawned defenders are placed directly rather than flying across the pitch.
    if (!current || snapView || contact || Math.abs(current.yard - actor.yard) > 8) {
      current = { lane: actor.lane, yard: actor.yard };
    } else {
      current.lane += (actor.lane - current.lane) * (1 - Math.exp(-55 * dt));
      current.yard += (actor.yard - current.yard) * blend;
    }
    view.actors[index] = current;
    const isHit = contact && index === contact.defender + 1 && contact.defender >= 0;
    const settle = contact ? Math.min(1, Math.max(0, (contact.age - .055) / .30)) : 0;
    let x = laneX(current.lane), y = yardY(current.yard);
    if (contact && index === 0) { x += reducedMotion ? 0 : settle * 10 * scale; y += reducedMotion ? 0 : settle * 13 * scale; }
    if (isHit) { x = laneX(contact.lane) - 12 * scale; y = yardY(contact.yard) - 15 * scale; }
    if (y < -40 || y > height + 40) return;
    if (index === 0) {
      ctx.strokeStyle = '#f8d15d';
      ctx.lineWidth = 2;
      ctx.fillStyle = '#0c241e55';
      ctx.beginPath();
      ctx.ellipse(x, y + 13 * scale, 24 * scale, 11 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (game.phase === 'ready') {
        ctx.fillStyle = '#f7d368';
        ctx.beginPath();
        ctx.moveTo(x, y - 69 * scale);
        ctx.lineTo(x - 5 * scale, y - 78 * scale);
        ctx.lineTo(x + 5 * scale, y - 78 * scale);
        ctx.fill();
        ctx.font = `bold ${Math.max(8, 10 * scale)}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('YOU', x, y + 36 * scale);
      }
    }
    const running = game.phase === 'live' && (index > 0 ||
      (game.controlMode === 'arcade' ? game.runSpeed > .25 : game.movingTimer > 0));
    const defender = index > 0 ? actor : null;
    const winner = index === 0 && game.score === 20;
    const pose = winner ? 'celebrate' : isHit ? 'tackle' : contact && index === 0 ? 'brace'
      : index === 0 && game.input === 'down' && game.phase === 'live' ? 'brace' : defender?.state === 'commit' ? 'brace' : ['lunge','recover'].includes(defender?.state) ? 'tackle' : 'run';
    const fall = contact && (index === 0 || isHit) ? settle * (index === 0 ? 1 : -.65)
      : defender?.state === 'recover' ? -.3 * Math.min(1, defender.timer / .2) : 0;
    drawFootballPlayer(ctx, {
      x, y, home: index === 0, number: index === 0 ? 22 : 40 + index,
      running, time, scale, led, reducedMotion,
      strideDistance: index === 0 ? game.distanceTravelled : (actor.stride || 0),
      pose, lean: index === 0 ? game.cut * Math.min(1, game.cutTime / .12) : 0,
      fall, celebration: winner ? game.presentationTime : 0,
      yaw: index === 0 ? 0 : Math.PI
    });
  });
  // Localized turf flecks; the field and controls remain unobstructed.
  if (!led && !reducedMotion && view.effect && effectAge < .5 && ['cut','tackle'].includes(view.effect.type)) {
    const count = view.effect.type === 'tackle' ? 16 : 7;
    const ex = laneX(view.effect.lane), ey = yardY(view.effect.yard);
    ctx.globalAlpha = Math.max(0, 1 - effectAge / .5);
    for (let i = 0; i < count; i++) {
      const a = i * 2.399, speed = 25 + i * 3;
      ctx.fillStyle = i % 2 ? '#b6a76a' : '#78a75a';
      ctx.fillRect(ex + Math.cos(a) * speed * effectAge, ey + Math.sin(a) * speed * effectAge + 40 * effectAge * effectAge, 3, 2);
    }
    ctx.globalAlpha = 1;
  }
  if (!led && !reducedMotion && game.score === 20 && game.presentationTime < 3) {
    for (let i = 0; i < 50; i++) {
      const t = game.presentationTime;
      ctx.fillStyle = ['#f6d35c','#f8f4db','#66a6ba'][i % 3];
      const x = (i * 97.3 % width) + Math.sin(t * 3 + i) * 14;
      const y = -30 - (i * 19 % 120) + t * (65 + i % 45);
      ctx.fillRect(x, y, 3, 6);
    }
  }
  // Intentionally no modal, result card, or pre-snap box over the field.
}

