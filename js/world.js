'use strict';
// Hunter Sub: World builder for the subdivision, and per-night game state.
// Part 2 of 9. All parts share one global scope, so load them in order (see index.html).
// ============================================================
// World
// ============================================================
const W = 3600, H = 2600, M = 260, ROAD = 120;
const PLAYER_R = 13, DEER_R = 16;
const HW = 230, HH = 160;
let world = null;

function buildWorld() {
  const SEED = campaign && campaign.map === 'random' && campaign.mapSeed ? campaign.mapSeed : 1337;
  const R = mulberry32(SEED);
  const J = a => SEED === 1337 ? 0 : Math.round((R() * 2 - 1) * a);
  const shuffled = n => { const a = [...Array(n).keys()]; if (SEED !== 1337) for (let i = n - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const vx = [M + 1000 + J(150), M + 2100 + J(150)];
  const hy = [M + 650 + J(70), M + 1350 + J(70)];
  const roads = [];
  vx.forEach(x => roads.push({ x, y: M, w: ROAD, h: H - 2 * M, vert: true }));
  roads.push({ x: M, y: hy[0], w: W - 2 * M, h: ROAD, vert: false });
  roads.push({ x: M, y: hy[1], w: W - 2 * M, h: ROAD, vert: false });

  const xs = [[M, vx[0]], [vx[0] + ROAD, vx[1]], [vx[1] + ROAD, W - M]];
  const ys = [[M, hy[0]], [hy[0] + ROAD, hy[1]], [hy[1] + ROAD, H - M]];
  const blocks = [], houses = [], fences = [];
  const roofs = ['#6b4a3a', '#4a5568', '#5a3e36', '#3d4f5c', '#704f3b', '#55606b', '#4f5d45'];
  const walls = ['#d9cfbf', '#c9d3d9', '#e3d6c4', '#cfc6b8', '#d6dccf', '#e0d0c0'];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    const b = { x: xs[i][0], y: ys[j][0], w: xs[i][1] - xs[i][0], h: ys[j][1] - ys[j][0], i, j };
    blocks.push(b);
    for (const c of [0.25, 0.75]) for (const top of [true, false]) {
      houses.push({
        x: Math.round(b.x + b.w * c - HW / 2),
        y: top ? b.y + 34 : b.y + b.h - 34 - HH,
        w: HW, h: HH, top,
        roof: roofs[Math.floor(R() * roofs.length)],
        wall: walls[Math.floor(R() * walls.length)],
        lit: [R() < 0.4, R() < 0.4, R() < 0.4], tv: R() < 0.25,
        ex: false, block: b,
      });
    }
    const fx = Math.round(b.x + b.w / 2 - 5);
    const y0 = b.y + 34 + HH + 20, y1 = b.y + b.h - 34 - HH - 20;
    const gc = (y0 + y1) / 2;
    fences.push({ x: fx, y: y0, w: 10, h: gc - 40 - y0, fence: true });
    fences.push({ x: fx, y: gc + 40, w: 10, h: y1 - (gc + 40), fence: true });
  }
  const exHouse = houses[16];
  exHouse.ex = true; exHouse.roof = '#a24d7a'; exHouse.wall = '#f2d7e4'; exHouse.lit = [true, true, false];
  // Dale's home: the "guest house" (a shed) in Darlene's backyard, per the divorce decree.
  const truck = { x: exHouse.x + exHouse.w / 2 - 50, y: exHouse.y + exHouse.h + 76, w: 100, h: 70, shed: true };
  // Sketchy Steve's van, parked on the east logging road. He buys venison, no questions asked.
  const van = { x: W - 205, y: hy[0] + 30, w: 116, h: 56 };
  // Backyard swimming pools: you can't walk through them, but you can see (and shoot) across.
  const pools = [];
  for (const bi of (SEED === 1337 ? [0, 2, 5, 6, 7] : shuffled(9).slice(0, 3 + Math.floor(R() * 4)))) {
    const b = blocks[bi];
    const yardTop = b.y + 34 + HH, yardBot = b.y + b.h - 34 - HH;
    pools.push({ x: Math.round(b.x + b.w * 0.75 - 60), y: Math.round((yardTop + yardBot) / 2 - 32), w: 120, h: 64, pool: true, noLos: true });
  }
  // Fishing ponds: a quiet one in the west woods, and the HOA clubhouse koi pond in the north woods.
  const ponds = [
    { x: 60, y: hy[0] - 20, w: 170, h: 130, pond: true, noLos: true, name: 'Mud Pond' },
    { x: W / 2 + 30, y: 60, w: 140, h: 90, pond: true, noLos: true, koi: true, name: 'HOA Koi Pond' },
  ];
  // Pruitt Creek winds through the south woods. Two stepping-stone crossings.
  const creekGaps = [];
  for (let i = 0; i < 8; i++) {
    const cy = H - M + 70 + Math.round(Math.sin(i * 1.3) * 35);
    if (i === 3 || i === 6) { creekGaps.push({ x: 110 + i * 150 + 79, y: cy + 22 }); continue; }
    ponds.push({ x: 110 + i * 150, y: cy, w: 158, h: 44, pond: true, noLos: true, creek: true, name: i === 0 ? 'Pruitt Creek' : '' });
  }
  const clubhouse = { x: W / 2 - 190, y: 40, w: 180, h: 110, clubhouse: true };
  // The HOA clubhouse pool (members only, closed for the season, still lit)
  pools.push({ x: W / 2 - 400, y: 52, w: 170, h: 86, pool: true, noLos: true, hoaPool: true });
  const garage = { x: exHouse.x + exHouse.w + 10, y: exHouse.y + exHouse.h / 2 };
  // Cars parked in driveways: solid cover that blocks flashlights. (Not Darlene's: she walks across hers.)
  const carColors = ['#8a2b2b', '#2b4a8a', '#d8d8d0', '#3a3a3a', '#5a7a3a', '#a88a2a', '#6a2a6a'];
  const cars = [];
  houses.forEach((h, i) => {
    if (h.ex || R() < 0.4) return;
    const cx = h.x + h.w - 49;
    cars.push({ x: cx, y: h.top ? h.y - 46 : h.y + h.h + 2, w: 24, h: 44, car: true, color: carColors[Math.floor(R() * carColors.length)], top: h.top });
  });
  // Phase 2: from Night 3 the HOA starts clearing the south woods.
  let clearing = null;
  const phase2 = [];
  if (night >= 3) {
    clearing = { x: W / 2 - 360, y: H - M + 20, w: night >= 4 ? 720 : 420, h: M - 50 };
    phase2.push({ x: clearing.x + 60, y: clearing.y + 60, w: 70, h: 46, dozer: true });
    if (night >= 4) phase2.push({ x: clearing.x + 330, y: clearing.y + 90, w: 60, h: 40, dozer: true, excavator: true });
  }
  // Hedges between the front side yards of some blocks: solid cover that blocks flashlights
  const hedges = [];
  for (const bi of (SEED === 1337 ? [0, 2, 3, 5, 6, 8] : shuffled(9).slice(0, 3 + Math.floor(R() * 5)))) {
    const b = blocks[bi];
    hedges.push({ x: Math.round(b.x + b.w / 2 - 7), y: b.y + 40, w: 14, h: HH - 20, hedge: true });
    hedges.push({ x: Math.round(b.x + b.w / 2 - 7), y: b.y + b.h - 40 - (HH - 20), w: 14, h: HH - 20, hedge: true });
  }
  // Lawn sprinklers (front yards). They cycle on and off and soak anyone who walks through.
  const sprinklers = [1, 6, 13, 19, 24, 31].map(i => houses[i]).filter(h => h && !h.ex)
    .map(h => ({ x: h.x + 40, y: h.top ? h.y - 18 : h.y + h.h + 18, r: 70, phase: R() * 26 }));
  // Weather terrain: icy patches on the plowed roads (snow), puddles on rain nights
  const ice = [], puddles = [];
  const wx = weatherFor(night);
  if (wx === 'snow') for (let k = 0; k < 9; k++) { const rd = roads[k % roads.length]; const t = 0.15 + (k * 0.27) % 0.7; ice.push(rd.vert ? { x: rd.x + 10, y: rd.y + rd.h * t, w: rd.w - 20, h: 150 } : { x: rd.x + rd.w * t, y: rd.y + 10, w: 150, h: rd.h - 20 }); }
  if (wx === 'rain') for (let k = 0; k < 12; k++) { const rd = roads[k % roads.length]; const t = 0.1 + (k * 0.31) % 0.8; puddles.push(rd.vert ? { x: rd.x + 20 + R() * (rd.w - 40), y: rd.y + rd.h * t, r: 18 + R() * 10 } : { x: rd.x + rd.w * t, y: rd.y + 20 + R() * (rd.h - 40), r: 18 + R() * 10 }); }
  const solids = [...houses, ...fences, truck, van, clubhouse, ...pools, ...ponds, ...cars, ...phase2, ...hedges];
  const exZone = { x: exHouse.x - 90, y: exHouse.y - 60, w: exHouse.w + 180, h: exHouse.h + 270 };

  function inRect(x, y, r, m) { return x > r.x - m && x < r.x + r.w + m && y > r.y - m && y < r.y + r.h + m; }
  function blocked(x, y, m) {
    if (x < 30 || y < 30 || x > W - 30 || y > H - 30) return true;
    for (const h of solids) if (inRect(x, y, h, m)) return true;
    for (const rd of roads) if (inRect(x, y, rd, m)) return true;
    if (inRect(x, y, exZone, 0)) return true;
    if (dist(x, y, truck.x + truck.w / 2, truck.y + truck.h / 2) < 150) return true;
    if (dist(x, y, van.x + van.w / 2, van.y + van.h / 2) < 200) return true;
    if (clearing && inRect(x, y, clearing, 0)) return true;
    return false;
  }
  const inWoods = (x, y) => x < M || x > W - M || y < M || y > H - M;

  const trees = [];
  function addTree(x, y) {
    for (const t of trees) if (dist(x, y, t.x, t.y) < 60) return false;
    trees.push({ x, y, trunk: 13, canopy: 26 + R() * 18, block: 17, hue: R() });
    return true;
  }
  for (let k = 0; k < 900 && trees.length < 230; k++) {
    const x = R() * W, y = R() * H;
    if (!inWoods(x, y) || blocked(x, y, 30)) continue;
    addTree(x, y);
  }
  for (const b of blocks) {
    let n = 0;
    for (let k = 0; k < 60 && n < 6; k++) {
      const x = b.x + 20 + R() * (b.w - 40), y = b.y + 20 + R() * (b.h - 40);
      if (blocked(x, y, 40)) continue;
      if (addTree(x, y)) n++;
    }
  }
  const bushes = [];
  function addBush(x, y) {
    for (const t of trees) if (dist(x, y, t.x, t.y) < 55) return false;
    for (const bb of bushes) if (dist(x, y, bb.x, bb.y) < 80) return false;
    bushes.push({ x, y, r: 30 + R() * 8, seed: R() * 100 });
    return true;
  }
  for (const b of blocks) {
    let n = 0;
    for (let k = 0; k < 80 && n < 6; k++) {
      const x = b.x + 30 + R() * (b.w - 60), y = b.y + 30 + R() * (b.h - 60);
      if (blocked(x, y, 36)) continue;
      if (addBush(x, y)) n++;
    }
  }
  for (let k = 0; k < 400 && bushes.length < 95; k++) {
    const x = R() * W, y = R() * H;
    if (!inWoods(x, y) || blocked(x, y, 30)) continue;
    addBush(x, y);
  }
  // Tall grass along the treeline: crouch in it to disappear.
  const grass = [];
  for (let k = 0; k < 600 && grass.length < 26; k++) {
    const x = R() * W, y = R() * H;
    if (!inWoods(x, y) || blocked(x, y, 10)) continue;
    const edge = Math.min(Math.abs(x - M), Math.abs(x - (W - M)), Math.abs(y - M), Math.abs(y - (H - M)));
    if (edge > 140) continue;
    if (grass.some(g => dist(g.x, g.y, x, y) < 160)) continue;
    grass.push({ x, y, r: 50 + R() * 25, seed: R() * 100 });
  }
  const lights = [];
  for (const rd of roads) {
    if (rd.vert) for (let y = rd.y + 150; y < rd.y + rd.h; y += 430) lights.push({ x: rd.x - 6, y });
    else for (let x = Math.max(rd.x, M) + 200; x < rd.x + rd.w; x += 430) lights.push({ x, y: rd.y - 6 });
  }
  // Dogs: chained in backyards. They bark if you get close.
  const dogs = [];
  for (const idx of [2, 7, 11, 22, 27, 33]) {
    const h = houses[idx];
    if (!h || h.ex) continue;
    const ax = h.x + h.w / 2, ay = h.top ? h.y + h.h + 40 : h.y - 40;
    dogs.push({ ax, ay, x: ax, y: ay, ang: 0, bark: 0, cd: 0, name: pick(['Biscuit', 'Duke', 'Pickles', 'Moose', 'Rocco', 'Peanut']) });
  }
  // Garden signs for flavor
  const signs = [
    { x: M + 160, y: hy[0] - 30, text: 'WHISPERING PINES ESTATES' },
    { x: vx[0] - 70, y: hy[0] + ROAD + 26, text: 'HOSTA LN' },
    { x: vx[1] + ROAD + 70, y: hy[1] - 26, text: 'BYLAW BLVD' },
    { x: vx[0] + ROAD + 70, y: hy[1] + ROAD + 26, text: 'CUL-DE-SAC CT' },
    { x: W / 2 - 100, y: 175, text: 'HOA CLUBHOUSE ▸ RESIDENTS ONLY' },
    { x: W - M - 120, y: hy[0] + ROAD + 26, text: 'NO TRESPASSING (ask for Steve)' },
    { x: vx[0] + ROAD + 40, y: hy[0] - 24, text: 'NO HUNTING — HOA 14.3' },
    { x: vx[1] - 220, y: hy[1] + ROAD + 24, text: 'SLOW: CHILDREN & DEER' },
    { x: exHouse.x + exHouse.w + 80, y: exHouse.y + 70, text: 'KEEP OUT, DALE' },
  ];
  // Motion-sensor floodlights: more of them each night.
  const floods = [];
  const floodCount = night >= 4 ? 6 : night >= 2 ? 3 : 1;
  for (const idx of [5, 9, 20, 14, 26, 30].slice(0, floodCount)) {
    const fh = houses[idx];
    floods.push({ x: fh.x + fh.w / 2, y: fh.top ? fh.y + fh.h + 4 : fh.y - 4, on: 0, house: fh });
  }
  // Hosta gardens (deer magnets) on the side yards, garden gnomes, and trash cans by the driveways.
  const gardens = [], props = [];
  houses.forEach((h, i) => {
    if (i % 3 === 0 || h.ex) {
      const g = { x: h.x - 95, y: h.y + 40, w: 80, h: 80, ex: h.ex };
      gardens.push(g);
      props.push({ x: g.x + 8, y: g.y + 8, kind: 'gnome', down: 0 });
    }
    if (i % 2 === 1) props.push({ x: h.x + h.w - 4, y: h.top ? h.y - 22 : h.y + h.h + 22, kind: 'trash', down: 0 });
  });
  world = { roads, blocks, houses, fences, truck, shed: truck, van, ponds, clubhouse, garage, cars, hedges, sprinklers, ice, puddles, creekGaps, clearing, phase2, pools, grass, solids, trees, bushes, lights, dogs, signs, floods, gardens, props, exHouse, vx, hy, inWoods, blocked };
}

// Spatial grid: solids and trees bucketed into 240px cells, so collision, line-of-sight and
// vision-cone checks only look at nearby objects. Rebuilt whenever the solids list changes.
const GRID = 240;
let gridStamp = 1;
function buildGrid() {
  const cols = Math.ceil(W / GRID), rows = Math.ceil(H / GRID);
  const cells = Array.from({ length: cols * rows }, () => ({ s: [], t: [] }));
  const add = (x0, y0, x1, y1, k, o) => {
    const c0 = clamp(Math.floor(x0 / GRID), 0, cols - 1), c1 = clamp(Math.floor(x1 / GRID), 0, cols - 1);
    const r0 = clamp(Math.floor(y0 / GRID), 0, rows - 1), r1 = clamp(Math.floor(y1 / GRID), 0, rows - 1);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) cells[r * cols + c][k].push(o);
  };
  for (const o of world.solids) add(o.x, o.y, o.x + o.w, o.y + o.h, 's', o);
  for (const t of world.trees) { const e = Math.max(t.trunk, t.block || 0); add(t.x - e, t.y - e, t.x + e, t.y + e, 't', t); }
  world._grid = { cells, cols, rows, n: world.solids.length, nt: world.trees.length };
  return world._grid;
}
function gridQuery(x0, y0, x1, y1, k) {
  let g = world._grid;
  if (!g || g.n !== world.solids.length || g.nt !== world.trees.length) g = buildGrid();
  const c0 = clamp(Math.floor(x0 / GRID), 0, g.cols - 1), c1 = clamp(Math.floor(x1 / GRID), 0, g.cols - 1);
  const r0 = clamp(Math.floor(y0 / GRID), 0, g.rows - 1), r1 = clamp(Math.floor(y1 / GRID), 0, g.rows - 1);
  if (c0 === c1 && r0 === r1) return g.cells[r0 * g.cols + c0][k];
  const stamp = ++gridStamp, out = [];
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) for (const o of g.cells[r * g.cols + c][k]) if (o._gq !== stamp) { o._gq = stamp; out.push(o); }
  return out;
}
function moveCircle(o, dx, dy, r) {
  o.x = clamp(o.x + dx, r, W - r);
  o.y = clamp(o.y + dy, r, H - r);
  for (const s of gridQuery(o.x - r - 2, o.y - r - 2, o.x + r + 2, o.y + r + 2, 's')) {
    if (o.x < s.x - r || o.x > s.x + s.w + r || o.y < s.y - r || o.y > s.y + s.h + r) continue;
    const cx = clamp(o.x, s.x, s.x + s.w), cy = clamp(o.y, s.y, s.y + s.h);
    const ddx = o.x - cx, ddy = o.y - cy, d2 = ddx * ddx + ddy * ddy;
    if (d2 >= r * r) continue;
    if (d2 > 1e-4) { const d = Math.sqrt(d2); o.x = cx + ddx / d * r; o.y = cy + ddy / d * r; }
    else {
      const l = o.x - s.x, rr = s.x + s.w - o.x, t = o.y - s.y, b = s.y + s.h - o.y, m = Math.min(l, rr, t, b);
      if (m === l) o.x = s.x - r; else if (m === rr) o.x = s.x + s.w + r; else if (m === t) o.y = s.y - r; else o.y = s.y + s.h + r;
    }
  }
  for (const t of gridQuery(o.x - r - 30, o.y - r - 30, o.x + r + 30, o.y + r + 30, 't')) {
    const ddx = o.x - t.x, ddy = o.y - t.y, rr = r + t.trunk, d2 = ddx * ddx + ddy * ddy;
    if (d2 < rr * rr && d2 > 1e-4) { const d = Math.sqrt(d2); o.x = t.x + ddx / d * rr; o.y = t.y + ddy / d * rr; }
  }
}

// Line of sight blocked by houses, fences, the truck and tree trunks/canopy cores.
function los(x1, y1, x2, y2) {
  const minx = Math.min(x1, x2), maxx = Math.max(x1, x2), miny = Math.min(y1, y2), maxy = Math.max(y1, y2);
  for (const s of gridQuery(minx, miny, maxx, maxy, 's')) {
    if (s.noLos || s.x > maxx || s.x + s.w < minx || s.y > maxy || s.y + s.h < miny) continue;
    const t = segRect(x1, y1, x2, y2, s);
    if (t >= 0 && t < 1) return false;
  }
  for (const t of gridQuery(minx - 40, miny - 40, maxx + 40, maxy + 40, 't')) {
    if (t.x + t.block < minx || t.x - t.block > maxx || t.y + t.block < miny || t.y - t.block > maxy) continue;
    if (segCircle(x1, y1, x2, y2, t.x, t.y, t.block) >= 0) return false;
  }
  return true;
}
function castRay(x, y, ang, len, cand) {
  const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
  let best = 1;
  for (const s of cand.rects) { const t = segRect(x, y, x2, y2, s); if (t >= 0 && t < best) best = t; }
  for (const c of cand.circles) { const t = segCircle(x, y, x2, y2, c.x, c.y, c.block); if (t >= 0 && t < best) best = t; }
  return best * len;
}

// ============================================================
// Game state
// ============================================================
let state = 'title'; // title | intro | play | pause | over | nightdone
let G = null;
let player = null;
let deer = [], arrows = [], watchers = [], popups = [], particles = [], cones = [], drops = [];
let cam = { x: 0, y: 0, shake: 0 };
const camOff = { x: 0, y: 0 };
const keys = {};
// Rebindable keys. Each action has a default key code; binds maps default -> the key the player chose.
// A capture-phase listener translates the physical key back to the default code, so the rest of the
// game only ever sees default codes.
const BINDABLE = [['Move up', 'KeyW'], ['Move down', 'KeyS'], ['Move left', 'KeyA'], ['Move right', 'KeyD'],
  ['Sneak', 'ShiftLeft'], ['Sprint', 'KeyX'], ['Use / drag', 'KeyE'], ['Draw bow', 'Space'], ['Pinecone', 'KeyF'],
  ['Grunt call', 'KeyG'], ['Beer', 'KeyV'], ['Corn', 'KeyB'], ['Goggles', 'KeyN'], ['Jerky', 'KeyJ'],
  ['Map', 'Tab'], ['End night', 'KeyQ'], ['Pause', 'KeyP'], ['Look ahead', 'KeyR']];
let binds = store.get('hs_binds', {});
let keyTrans = {};
let keyWait = null;
function rebuildKeyTrans() { keyTrans = {}; for (const d in binds) if (binds[d] !== d) keyTrans[binds[d]] = d; }
rebuildKeyTrans();
function boundKey(def) { return binds[def] || def; }
function keyLabel(code) { return String(code).replace(/^Key/, '').replace(/^Digit/, '').replace('ShiftLeft', 'L-Shift').replace('ShiftRight', 'R-Shift').replace('ControlLeft', 'L-Ctrl').replace('Arrow', 'Arrow '); }
function bindKey(def, code) {
  const cur = boundKey(def);
  if (code === cur) return;
  // whoever had this key gets our old key (a swap, so nothing is ever unbound)
  const other = BINDABLE.map(b => b[1]).find(d => d !== def && boundKey(d) === code);
  if (other) binds[other] = cur;
  binds[def] = code;
  for (const d in binds) if (binds[d] === d) delete binds[d];
  store.set('hs_binds', binds); rebuildKeyTrans();
}
function resetBinds() { binds = {}; store.set('hs_binds', binds); rebuildKeyTrans(); }
function remapKeyEvent(e) {
  if (e._hs) return;
  if (state === 'keys' && e.type === 'keydown') {
    e.preventDefault(); e.stopImmediatePropagation();
    if (keyWait) { if (e.code !== 'Escape') bindKey(keyWait, e.code); keyWait = null; sfx.grab(); }
    else if (e.code === 'Escape') state = 'settings';
    return;
  }
  const to = keyTrans[e.code];
  if (!to) {
    // a default key that was moved to another action is now "free": don't let it fire its old action
    if (binds[e.code] && binds[e.code] !== e.code && !keyTrans[e.code]) { e.stopImmediatePropagation(); }
    return;
  }
  e.preventDefault(); e.stopImmediatePropagation();
  const ev = new KeyboardEvent(e.type, { code: to, key: e.key, bubbles: true, cancelable: true, repeat: e.repeat });
  ev._hs = true;
  window.dispatchEvent(ev);
}
window.addEventListener('keydown', remapKeyEvent, true);
window.addEventListener('keyup', remapKeyEvent, true);
const mouse = { x: 0, y: 0, down: false };
let night = 1;
let campaign = null;
let best = store.get('hs_best', 0);
let achievements = store.get('hs_ach', {});
let toasts = [];
let uiButtons = []; // clickable rects on menu screens, rebuilt every frame

function quotaFor(n) { return 2 + n; }
// Holiday lights: night 6 of every season, and every night in December.
function isHolidayNight(n) { if (campaign && campaign.map === 'golf') return false; try { if (new Date().getMonth() === 11) return true; } catch (e) {} return n === 6; }
// Each deer you take uses a tag. Bucks: 2 a night. Does: quota + 1. No tag = poaching.
function fillTag(d) {
  if (!G || !G.tags || d.legend) return;
  const k = d.buck ? 'buck' : 'doe';
  if (G.tags[k] > 0) { G.tags[k]--; if (G.tags[k] === 0) popup(d.x, d.y - 48, `Last ${k} tag used.`, '#ffd166', 1.6); return; }
  d.poached = true;
  G.poached++;
  if (!G.police) G.sus = Math.min(99, G.sus + 25);
  popup(d.x, d.y - 48, `No ${k} tag left! That's poaching, Dale.`, '#ff6b6b', 2.2);
  hint('tags', 'You get 2 buck tags and (quota + 1) doe tags a night. A deer with no tag is poached: it scores nothing, and the neighbors get twitchy.');
}
function freshCampaign() {
  return {
    totalDeer: 0, score: 0, cash: 0, gear: {}, items: {}, hints: {}, stars: [],
    weapon: 'compound', weapons: { compound: true }, freezer: 0, flags: {}, seen: {}, exSightings: 0, earnedTotal: 0,
  };
}
campaign = freshCampaign();
const has = id => !!campaign.gear[id];

function newCampaign() {
  restoreRandom();
  night = 1;
  campaign = freshCampaign();
  startNight();
}

function unlock(id) {
  if (achievements[id]) return;
  achievements[id] = true;
  store.set('hs_ach', achievements);
  toasts.push({ title: ACH[id][0], desc: ACH[id][1], t: 4.5 });
  sfx.achieve();
}

function hint(id, text) {
  if (!G || campaign.hints[id] || settings.hints === false) return;
  campaign.hints[id] = true;
  G.hint = { text, t: 6 };
}

function startNight() {
  if (campaign.map === 'golf') buildGolfWorld(); else if (campaign.map === 'cul' || campaign.map === 'custom') buildCulWorld(); else buildWorld();
  buildNav();
  const NIGHT = Math.round((330 + night * 15) * diff().time);
  G = {
    time: NIGHT, NIGHT, sus: 0, police: false, policeT: 0, copTimer: 0, cops: 0, arrest: 0,
    delivered: 0, bucks: 0, quota: Math.max(1, quotaFor(night) + diff().quota), caller: null, banner: null, unseen: 0,
    shots: 0, hits: 0, sirenT: 0, respawnT: 6, endReason: null, nightScore: 0, timesSpotted: 0,
    weather: weatherFor(night), exSaw: false, legendDone: false, chirpT: 2, hint: null,
    ghost: null, anySeen: false, radioCD: 0, earned: 0, stars: 0, playT: 0,
    wind: rnd(0, TAU), stepT: 0, gruntCD: 0, slowmo: 0, snortCD: 0,
    mom: night >= 2 ? { at: rnd(60, 200), t: 0, state: 'wait' } : null,
    cat: null, catT: rnd(30, 70), dawnSpawned: false, paperSpawned: false, notices: [], noticesGot: 0,
    corn: [], cornLeft: has('corn') ? 2 : 0, trail: [], trailT: 0, k9Spawned: false, droneSpawned: false,
    freezer: campaign.freezer || 0, price: Math.floor(rnd(22, 33)), buzz: 0, burpT: 0, stink: 0, steveLine: null,
    objective: null, squirrels: 0, fish: 0, soldPacks: 0, exNagCD: 0,
    tut: night === 1 && !store.get('hs_tut_done', false) ? { step: 0 } : null, tutT: 0,
    prints: [], printD: 0, printSide: 1, trackCD: 0, nvg: 90, nvgOn: false,
    tags: { buck: 2, doe: 0 }, poached: 0, holiday: isHolidayNight(night),
  };
  G.tags.doe = G.quota + 1;
  if (campaign.truckDeer && !oneNightMode()) {
    G.delivered += campaign.truckDeer; G.fromTruck = campaign.truckDeer;
    G.banner = { text: `🛻 ${campaign.truckDeer} deer from the truck bed already count toward tonight`, color: '#9be564', t: 4 };
  }
  if (G.holiday) {
    // Inflatable Santas and snowmen go up in the yards. They count as cover, like a bush.
    let n = 0;
    for (const b of world.bushes) if (n < 14 && (b.seed * 7) % 3 < 1) { b.santa = (n++ % 2) ? 'snowman' : 'santa'; }
    banner('🎄 HOLIDAY LIGHTS: inflatable Santas make great cover', '#ff6b6b');
  }
  // Three HOA violation notices blow around the yards each night.
  for (let k = 0; k < 500 && G.notices.length < 3; k++) {
    const x = rnd(M + 40, W - M - 40), y = rnd(M + 40, H - M - 40);
    if (world.blocked(x, y, 24) || G.notices.some(n => dist(n.x, n.y, x, y) < 700)) continue;
    G.notices.push({ x, y, text: pick(NOTICES), got: false, rot: rnd(-0.5, 0.5) });
  }
  // Gossip notes: collectible neighborhood secrets that stay collected across seasons
  const gotG = store.get('hs_gossip', []);
  const left = GOSSIP.map((_, i) => i).filter(i => !gotG.includes(i));
  G.gossip = [];
  for (let k = 0; k < 400 && G.gossip.length < Math.min(3, left.length); k++) {
    const x = rnd(M + 40, W - M - 40), y = rnd(M + 40, H - M - 40);
    if (world.blocked(x, y, 24) || G.gossip.some(n => dist(n.x, n.y, x, y) < 600) || G.notices.some(n => dist(n.x, n.y, x, y) < 200)) continue;
    G.gossip.push({ x, y, idx: left[G.gossip.length], got: false });
  }
  player = {
    x: world.shed.x - 26, y: world.shed.y + 35, ang: 0, crouch: false, carry: null, cd: 0, hidden: false, lit: false, moving: false, step: 0,
    drawing: false, draw: 0, arrows: 8 + (has('quiver') ? 6 : 0), cones: 2 + (has('pouch') ? 3 : 0),
    cooler: 0, bag: 0, fishing: null,
  };
  deer = []; arrows = []; popups = []; particles = []; cones = []; drops = []; marks = []; flies = []; leaves = [];
  for (let i = 0; i < 9 + night; i++) spawnDeer(false);
  const legendChance = night >= 5 ? 1 : night >= 3 ? 0.5 : 0;
  if (Math.random() < legendChance) spawnDeer(false, true);
  if (campaign.map === 'golf') setupGolfWatchers(); else if (campaign.map === 'cul') setupCulWatchers(); else if (campaign.map === 'custom') setupSpecWatchers(); else setupWatchers();
  spawnCritters();
  setupObjective();
  G.priceTrend = campaign.lastPrice ? Math.sign(G.price - campaign.lastPrice) : 0;
  campaign.lastPrice = G.price;
  if ((campaign.heat || campaign.heatNight === night) && !campaign.daily && night <= 5) {
    campaign.heat = 0; campaign.heatNight = night;
    G.heatPatrol = true;
    spawnCop();
    const pc = watchers[watchers.length - 1]; pc.label = 'Patrol car';
    G.banner = { text: '🚔 Heightened patrols tonight: a cruiser is already out after last night.', color: '#9ecbff', t: 4 };
  }
  if (night > 5) {
    // Endless: extra Neighborhood Watch every couple of nights
    const extra = Math.min(4, Math.floor((night - 4) / 2));
    for (let i = 0; i < extra; i++) {
      const bx = world.blocks[(i * 4 + night) % 9];
      watchers.push(makeWatcher('watch', [{ x: bx.x + 40, y: bx.y + bx.h / 2 + 36 }, { x: bx.x + bx.w - 40, y: bx.y + bx.h / 2 + 36 }],
        { speed: 60, fov: 1.3, range: 230, pause: 2, rate: 24, label: 'Volunteer #' + (i + 1) }));
    }
  }
  setupTwoPlayer();
  cam.shake = 0;
  updateCam(1);
  saveGame();
  state = 'intro';
  if (SCENES['intro' + night]) sceneFor('intro' + night, () => { state = 'intro'; });
}

// After a won night: the "after" cutscene (once), then Earl's shop.
function goShop() {
  pickSpecial();
  if (SCENES['after' + night]) sceneFor('after' + night, () => { state = 'shop'; });
  else state = 'shop';
}

function spawnDeer(woodsOnly, legend) {
  for (let k = 0; k < 300; k++) {
    const x = rnd(40, W - 40), y = rnd(40, H - 40);
    if (world.blocked(x, y, 30)) continue;
    if ((woodsOnly || legend) && !world.inWoods(x, y)) continue;
    if (player && dist(x, y, player.x, player.y) < 600) continue;
    if (dist(x, y, 130, world.hy[0] + 60) < (legend ? 1400 : 500)) continue;
    const buck = legend || Math.random() < 0.22;
    const points = legend ? 14 : buck ? pick([6, 8, 8, 10, 10, 12]) : 0;
    deer.push({ x, y, ang: rnd(0, TAU), state: 'graze', t: rnd(1, 4), dead: false, buck, legend: !!legend, hp: legend ? 2 : 1, carried: false, bob: rnd(0, TAU), points,
      fawn: !buck && Math.random() < 0.3 ? { x: x - 20, y: y + 10, gone: 0 } : null,
      coat: pick(['#9a6a3a', '#8a5e33', '#a67644', '#7f5a37', '#9c7046']), size: rnd(0.9, 1.1), albino: !legend && Math.random() < 0.03 });
    const nd = deer[deer.length - 1]; if (nd.albino) { nd.coat = '#f1ece2'; nd.fawn = null; }
    return;
  }
}

function makeWatcher(type, path, o) {
  const p0 = o.start || path[0];
  return Object.assign({
    type, path, x: p0.x, y: p0.y, ang: 0, pi: o.start ? 0 : 1 % path.length, speed: 60, fov: 1.3, range: 230, pause: 2,
    wait: 0, scan: 0, baseAng: 0, moveAng: 0, state: 'patrol', seeing: false, wasSeeing: false, stare: 0,
    lastX: 0, lastY: 0, look: 0, lookAng: 0, inv: null, invT: 0, home: null, trail: [], stopDist: 50,
    quipCD: 0, rate: 30, poly: null, label: '', look2: 0,
  }, o);
}

function setupWatchers() {
  const { vx, hy, exHouse: h } = world;
  watchers = [];
  // Per the divorce decree, the backyard is "Dale's side." Darlene patrols the front and sides,
  // and stares down the side yards at the back corners.
  const x0 = h.x - 45, x1 = h.x + h.w + 45, y0 = h.y - 14, yb = h.y + h.h - 10;
  const A = { x: x0, y: yb }, B = { x: x0, y: y0 }, C = { x: x1, y: y0 }, D = { x: x1, y: yb };
  watchers.push(makeWatcher('ex', [A, B, C, D, C, B],
    { speed: 50, fov: 1.45, range: 235, pause: 2.6, rate: 32, label: NAMES.ex + ' (ex)' }));
  watchers.push(makeWatcher('hoa', [
    { x: vx[0] + 60, y: hy[0] + 60 }, { x: vx[1] + 60, y: hy[0] + 60 },
    { x: vx[1] + 60, y: hy[1] + 60 }, { x: vx[0] + 60, y: hy[1] + 60 }],
    { speed: 105, fov: 1.15, range: 265, pause: 1.4, rate: 22, label: NAMES.hoa + ', HOA Pres.', cart: true }));
  if (night >= 2) watchers.push(makeWatcher('watch', [{ x: vx[1] + 30, y: M + 50 }, { x: vx[1] + 30, y: H - M - 50 }],
    { speed: 58, fov: 1.3, range: 225, pause: 2.5, rate: 22, label: NAMES.watch + ', Nbhd Watch' }));
  if (night >= 3) watchers.push(makeWatcher('treasurer', [{ x: M + 60, y: hy[1] + 25 }, { x: W - M - 60, y: hy[1] + 25 }],
    { speed: 55, fov: 1.3, range: 225, pause: 3, rate: 22, label: NAMES.treasurer + ', HOA Treas.' }));
  if (night >= 4) watchers.push(makeWatcher('watch', [{ x: vx[0] + 95, y: H - M - 50 }, { x: vx[0] + 95, y: M + 50 }],
    { speed: 62, fov: 1.3, range: 235, pause: 2, rate: 24, label: 'Brenda, Nbhd Watch' }));
  if (night >= 3) {
    // Mr. Henderson can't sleep. He watches from his front window, on and off.
    const hh = world.houses[25];
    const wy = hh.top ? hh.y - 8 : hh.y + hh.h + 8;
    const w = makeWatcher('window', [{ x: hh.x + 115, y: wy }], {
      speed: 0, fov: 1.2, range: 240, pause: 999, rate: 26, label: 'Mr. Henderson (insomniac)', fixed: true,
      asleep: 0, awakeT: rnd(8, 14), house: hh,
    });
    w.ang = w.baseAng = hh.top ? -Math.PI / 2 : Math.PI / 2;
    w.pi = 0;
    watchers.push(w);
  }
  if (night >= 4) {
    const d = makeWatcher('drone', [{ x: W / 2, y: H / 2 }], { speed: 95, fov: TAU, range: 90, pause: 0, rate: 30, label: 'Gary\'s Drone', fixed: false });
    d.x = vx[1] + 60; d.y = hy[0] - 200; d.target = { x: d.x, y: d.y }; d.crashT = rnd(30, 50); d.down = 0;
    watchers.push(d);
  }
  if (night >= 2) {
    // Doorbell cameras: fixed, short-range, always watching the front walk.
    for (const idx of [3, 12, 21, 30]) {
      const hh = world.houses[idx];
      if (!hh || hh.ex) continue;
      const cw = makeWatcher('cam', [{ x: hh.x + 70, y: hh.top ? hh.y - 7 : hh.y + hh.h + 7 }], { speed: 0, fov: 0.9, range: 135, pause: 999, rate: 14, label: 'Doorbell cam', fixed: true });
      cw.ang = cw.baseAng = hh.top ? -Math.PI / 2 : Math.PI / 2; cw.pi = 0;
      watchers.push(cw);
    }
  }
  if (night >= 4) {
    // Chad, Darlene's new boyfriend, leaf-blowing the yard next door at 5 AM. The blower drowns out your noise.
    const b = world.blocks[4];
    watchers.push(makeWatcher('chad', [{ x: b.x + b.w / 2 + 50, y: b.y + b.h / 2 + 30 }, { x: b.x + b.w - 50, y: b.y + b.h / 2 + 30 }],
      { speed: 35, fov: 1.2, range: 210, pause: 3, rate: 26, label: 'Chad (Darlene\'s boyfriend)' }));
  }
  if (night >= 5) watchers.push(makeWatcher('hoa', [
    { x: vx[1] + 60, y: hy[1] + 60 }, { x: vx[0] + 60, y: hy[1] + 60 },
    { x: vx[0] + 60, y: hy[0] + 60 }, { x: vx[1] + 60, y: hy[0] + 60 }],
    { speed: 100, fov: 1.15, range: 260, pause: 1.4, rate: 22, label: 'HOA Vice Pres.', cart: true }));
}

function spawnCop() {
  const { vx, hy } = world;
  const A = { x: vx[0] + 60, y: hy[0] + 60 }, B = { x: vx[1] + 60, y: hy[0] + 60 },
    C = { x: vx[1] + 60, y: hy[1] + 60 }, D = { x: vx[0] + 60, y: hy[1] + 60 };
  const variants = [
    { start: { x: vx[0] + 60, y: M + 10 }, path: [A, B, C, D] },
    { start: { x: vx[1] + 60, y: H - M - 10 }, path: [C, B, A, D] },
    { start: { x: vx[1] + 60, y: M + 10 }, path: [B, C, D, A] },
    { start: { x: vx[0] + 60, y: H - M - 10 }, path: [D, C, B, A] },
  ];
  const v = variants[G.cops % variants.length];
  const cop = makeWatcher('cop', v.path, {
    start: v.start, speed: 175, fov: 1.0, range: 330, pause: 0.6, rate: 0, stopDist: 70,
    label: G.cops === 0 ? NAMES.cop : 'Deputy #' + (G.cops + 1),
  });
  cop.pi = 0;
  watchers.push(cop);
  G.cops++;
  banner(G.cops === 1 ? 'POLICE HAVE ARRIVED' : 'BACKUP ARRIVED', '#ff5a5a');
}

function banner(text, color) { G.banner = { text, color: color || '#ffd166', t: 3 }; }
function popup(x, y, text, color, life) {
  const dup = popups.find(p => p.text === text && Math.abs(p.x - x) < 80 && Math.abs(p.y - y) < 80);
  if (dup) { dup.t = Math.max(dup.t, life || 2.6); return; }
  if (popups.length > 14) popups.shift();
  popups.push({ x, y, text, color: color || '#fff', t: life || 2.6, life: life || 2.6 });
}
