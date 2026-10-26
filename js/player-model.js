// Football adaptation of Faces & Heels' broad, bevel-edged block construction.
// Local pseudo-3D geometry is projected onto cached Canvas sprites. No downloads.
const add = (a, b) => a.map((v, i) => v + b[i]);
const sub = (a, b) => a.map((v, i) => v - b[i]);
const mul = (a, s) => a.map(v => v * s);
const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
const cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const unit = a => mul(a, 1 / (Math.hypot(...a) || 1));

export function bevelGeometry(center, size, bevel = .06) {
  const [w, h, d] = size.map(v => v / 2);
  const r = Math.min(bevel, w * .48, h * .48, d * .48), vertices = [];
  for (const [y, shrink] of [[-h, r], [-h + r, 0], [h - r, 0], [h, r]]) {
    const x = w - shrink, z = d - shrink, c = Math.max(.002, r * .6);
    for (const [a, b] of [[-x+c,-z],[x-c,-z],[x,-z+c],[x,z-c],[x-c,z],[-x+c,z],[-x,z-c],[-x,-z+c]]) {
      vertices.push(add(center, [a, y, b]));
    }
  }
  const faces = [Array.from({length:8}, (_, i) => 7-i), Array.from({length:8}, (_, i) => 24+i)];
  for (let j = 0; j < 3; j++) for (let i = 0; i < 8; i++) {
    faces.push([j*8+i, j*8+(i+1)%8, (j+1)*8+(i+1)%8, (j+1)*8+i]);
  }
  return { vertices, faces };
}

const palettes = {
  home: { jersey:'#eabc38', pad:'#ffd76a', pants:'#19354e', stripe:'#f2c84d', helmet:'#f4c84a', trim:'#162f47', skin:'#bd835b', shoe:'#eee9d8', glove:'#eee9d8' },
  away: { jersey:'#972b40', pad:'#bd4054', pants:'#e5e1d7', stripe:'#92253a', helmet:'#eeeade', trim:'#8a263b', skin:'#9b694b', shoe:'#202a35', glove:'#eee9d8' }
};
const digitSegments = ['abcedf','bc','abged','abgcd','fgbc','afgcd','afgecd','abc','abcdefg','abfgcd'];
const segmentRects = {
  a:[0,.15,.14,.035], b:[.077,.077,.035,.14], c:[.077,-.077,.035,.14],
  d:[0,-.15,.14,.035], e:[-.077,-.077,.035,.14], f:[-.077,.077,.035,.14], g:[0,0,.14,.035]
};

export function buildFootballModel({ home = true, number = 22, cycle = 0, running = false, yaw = 0 } = {}) {
  const colors = home ? palettes.home : palettes.away;
  const faces = [];
  const rotation = p => [p[0]*Math.cos(yaw)+p[2]*Math.sin(yaw), p[1], -p[0]*Math.sin(yaw)+p[2]*Math.cos(yaw)];
  const bounce = running ? Math.abs(Math.sin(cycle))* .07 : 0;
  // Chibi proportions: compress the legs most, retain broad torsos and big helmets.
  const proportion = p => [p[0], p[1] <= 1.75 ? p[1] * .64 : 1.12 + (p[1] - 1.75) * .88, p[2]];
  const rotate = p => rotation(add(proportion(p), [0, bounce * .65, 0]));
  function block(center, size, color, bevel = .045, transform = p => p) {
    const mesh = bevelGeometry(center, size, bevel);
    const vertices = mesh.vertices.map(p => rotate(transform(p)));
    const meanCenter = rotate(transform(center));
    for (const indices of mesh.faces) {
      let points = indices.map(i => vertices[i]);
      const mean = mul(points.reduce(add, [0,0,0]), 1 / points.length);
      if (dot(cross(sub(points[1],points[0]),sub(points[2],points[0])),sub(mean,meanCenter)) < 0) points = points.reverse();
      faces.push({ points, color });
    }
  }
  function limb(a, b, width, depth, color) {
    const up = unit(sub(b,a));
    let side = unit(cross(up,[0,0,1]));
    if (Math.hypot(...side) < .1) side = [1,0,0];
    const front = unit(cross(side,up));
    const length = Math.hypot(...sub(b,a));
    block([0,length/2,0],[width,length,depth],color,.045,p => add(a,add(mul(side,p[0]),add(mul(up,p[1]),mul(front,p[2])))));
  }
  // Wide shoulder silhouette and angular jersey panels, as in the wrestler rig.
  block([0,2.10,0],[1.08,1.10,.65],colors.jersey,.08);
  block([0,2.58,0],[1.35,.34,.76],colors.pad,.08);
  for (const side of [-1,1]) {
    block([side*.63,2.48,0],[.46,.46,.70],colors.pad,.075);
    block([side*.66,2.42,.36],[.32,.13,.035],colors.trim,.012);
  }
  block([0,1.55,0],[.98,.40,.67],colors.pants,.05);
  block([0,1.73,0],[1.04,.10,.71],colors.trim,.02);
  block([0,2.72,.02],[.32,.20,.32],colors.skin,.03);
  for (const side of [-1,1]) {
    const swing = running ? Math.sin(cycle+(side<0?0:Math.PI)) : 0;
    const hip = [side*.28,1.5,0];
    const knee = [side*.31,.88+Math.max(0,swing)*.14,swing*.33];
    const ankle = [side*.31,.20+Math.max(0,-swing)*.20,-swing*.30];
    limb(hip,knee,.43,.47,colors.pants);
    limb(knee,ankle,.31,.33,colors.pants);
    block(add(knee,[0,0,.12]),[.40,.24,.24],colors.pants,.04);
    block(add(ankle,[0,-.06,.14]),[.40,.23,.67],colors.shoe,.045);
    block(add(ankle,[0,-.17,.14]),[.42,.06,.69],colors.trim,.012);
    for (const dz of [-.08,.28]) block(add(ankle,[0,-.22,dz]),[.32,.07,.08],colors.trim,.006);
    // Contrasting pants stripes stay as solid beveled panels.
    limb(add(hip,[side*.20,0,0]),add(knee,[side*.20,0,0]),.045,.26,colors.stripe);
    const shoulder = [side*.72,2.43,0];
    const elbow = [side*.82,1.98,-swing*.27];
    let hand = [side*.66,1.64,.16+swing*.20];
    if (home && side===1) hand = [.57,2.02,.48];
    limb(shoulder,elbow,.35,.38,colors.skin);
    limb(elbow,hand,.28,.30,colors.skin);
    block(hand,[.31,.30,.31],colors.glove,.04);
    if (home && side===1) {
      block([.65,2.11,.43],[.33,.59,.34],'#754327',.10);
      for (let i=0;i<4;i++) block([.65,1.96+i*.09,.609],[.13,.025,.025],'#f8e7ca',.005);
    }
  }
  // Large chamfered helmet, center stripe, dark face opening and separate cage bars.
  block([0,3.17,0],[1.08,1.00,.96],colors.helmet,.13);
  block([0,3.68,-.01],[.12,.055,.74],colors.trim,.012);
  block([0,3.20,-.49],[.12,.55,.025],colors.trim,.009);
  block([0,3.10,.49],[.83,.36,.045],'#27323a',.028);
  block([0,3.09,.52],[.62,.21,.02],colors.skin,.015);
  block([0,2.89,.575],[.86,.06,.07],colors.trim,.012);
  block([0,3.03,.575],[.86,.05,.07],colors.trim,.01);
  for (const x of [-.39,0,.39]) block([x,2.97,.575],[.04,.23,.05],colors.trim,.008);
  for (const side of [-1,1]) block([side*.54,3.03,0],[.055,.34,.38],colors.trim,.025);
  // Geometry-based jersey numbers remain upright on the body for either team.
  for (const z of [-.337,.337]) {
    for (const [index, digit] of String(number).split('').entries()) {
      for (const key of digitSegments[Number(digit)]) {
        const [x,y,w,h] = segmentRects[key];
        const sign = z < 0 ? 1 : -1;
        block([sign*((index-.5)*.23+x),2.18+y,z],[w,h,.025],home?colors.trim:'#fff5df',.003);
      }
    }
  }
  return faces;
}

function shade(hex, light) {
  const color = hex.slice(1).match(/../g).map(v => parseInt(v,16));
  return `rgb(${color.map(v => Math.round(Math.min(255,v*light))).join(',')})`;
}
const cache = new Map();
const eye = unit([.18,.72,-1]);
const light = unit([-.6,1,-.8]);
function sprite(home, number, phase, direction, running) {
  const key = [home,number,phase,direction,running].join(':');
  if (cache.has(key)) {
    const value = cache.get(key);
    cache.delete(key);cache.set(key,value);
    return value;
  }
  const canvas = document.createElement('canvas');
  canvas.width = 256;canvas.height = 288;
  const ctx = canvas.getContext('2d');
  ctx.scale(2,2);
  const faces = buildFootballModel({ home,number,cycle:phase/16*Math.PI*2,running,yaw:direction*Math.PI/4 });
  const polygons = [];
  for (const face of faces) {
    const normal = unit(cross(sub(face.points[1],face.points[0]),sub(face.points[2],face.points[0])));
    if (dot(normal,eye) <= .001) continue;
    const center = mul(face.points.reduce(add,[0,0,0]),1/face.points.length);
    polygons.push({
      points:face.points.map(p => [64+p[0]*22+p[2]*4,124-p[1]*22*.86-p[2]*22*.48]),
      depth:dot(center,eye),color:shade(face.color,.66+Math.max(0,dot(normal,light))*.42)
    });
  }
  polygons.sort((a,b) => a.depth-b.depth);
  for (const polygon of polygons) {
    ctx.fillStyle = polygon.color;
    ctx.beginPath();
    polygon.points.forEach((p,i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p));
    ctx.closePath();ctx.fill();
  }
  cache.set(key,canvas);
  if (cache.size > 128) cache.delete(cache.keys().next().value);
  return canvas;
}

export function drawFootballPlayer(ctx, { x,y,home,number,running,time,scale,led,reducedMotion,yaw=0 }) {
  ctx.save();
  ctx.translate(x,y);
  if (led) {
    ctx.fillStyle = home?'#ff8158':'#ff3128';
    ctx.shadowColor = ctx.fillStyle;ctx.shadowBlur = home?20:9;
    ctx.fillRect(-12*scale,-7*scale,24*scale,14*scale);
  } else {
    ctx.fillStyle = '#061a1360';
    ctx.beginPath();ctx.ellipse(3*scale,12*scale,25*scale,10*scale,0,0,Math.PI*2);ctx.fill();
    const phase = running && !reducedMotion ? Math.floor((time*2.1+number*.13)*16)%16 : 0;
    const direction = ((Math.round(yaw/(Math.PI/4))%8)+8)%8;
    const image = sprite(home,number,phase,direction,running&&!reducedMotion);
    scale *= 1.13;
    ctx.drawImage(image,-64*scale,-112*scale,128*scale,144*scale);
  }
  ctx.restore();
}
