import { drawFootballPlayer } from './player-model.js?v=0.3';

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
    view = { play: -1, lastTime: time, actors: [], camera: game.yard + 15.5 };
    views.set(ctx, view);
  }
  const dt = Math.min(.06, Math.max(0, time - view.lastTime));
  const blend = reducedMotion ? 1 : 1 - Math.exp(-18 * dt);
  view.lastTime = time;
  const changedPlay = view.play !== game.playNumber;
  view.play = game.playNumber;
  const snapView = changedPlay || game.phase === 'ready';
  const cameraTarget = Math.max(10, Math.min(88, game.yard + 15.5));
  view.camera = snapView ? cameraTarget : view.camera + (cameraTarget - view.camera) * blend;
  const margin = Math.max(29, width * .075);
  const fieldWidth = width - 2 * margin;
  const yardsToPixels = height / 37;
  const yardY = yard => height * .43 - (yard - view.camera) * yardsToPixels;
  const laneX = lane => margin + fieldWidth * (.13 + lane * .185);
  const scale = Math.max(.65, Math.min(1.12, width / 650, height / 410));
  ctx.fillStyle = led ? '#060c08' : '#243a2a';
  ctx.fillRect(0, 0, width, height);

  // Sideline details remain outside the playable field.
  for (let row = 0; row < height / 13; row++) {
    for (let col = 0; col < 3; col++) {
      ctx.fillStyle = ['#cfba80', '#8c293b', '#233e5b', '#e8e1cb', '#738a77'][(row * 7 + col * 3) % 5];
      ctx.fillRect(4 + col * 7, row * 13 + (col % 2) * 4, 4, 5);
      ctx.fillRect(width - 8 - col * 7, row * 13 + (col % 2) * 4, 4, 5);
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
    for (let i = 0; i < 1100; i++) {
      const tx = margin + ((i * 73.237) % fieldWidth);
      const ty = (i * 47.131) % height;
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
  ctx.restore();

  // Orange sideline first-down marker.
  const markerY = yardY(game.target);
  if (markerY > 0 && markerY < height) {
    rounded(ctx, width - margin + 1, markerY - 10, 8, 20, 2, '#f07b32');
  }
  const actors = [{ lane: game.lane, yard: game.yard }, ...game.defenders];
  actors.forEach((actor, index) => {
    let current = view.actors[index];
    // Respawned defenders are placed directly rather than flying across the pitch.
    if (!current || snapView || Math.abs(current.yard - actor.yard) > 8) {
      current = { lane: actor.lane, yard: actor.yard };
    } else {
      current.lane += (actor.lane - current.lane) * blend;
      current.yard += (actor.yard - current.yard) * blend;
    }
    view.actors[index] = current;
    const x = laneX(current.lane), y = yardY(current.yard);
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
    drawFootballPlayer(ctx, { x, y, home: index === 0, number: index === 0 ? 22 : 40 + index, running: game.phase === 'live', time, scale, led, reducedMotion, yaw: index === 0 ? 0 : Math.PI });
  });
  // Intentionally no modal, result card, or pre-snap box over the field.
}
