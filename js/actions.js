'use strict';
// Hunter Sub: Player actions, weapons, pathfinding and the tutorial.
// Part 4 of 9. All parts share one global scope, so load them in order (see index.html).
// ============================================================
// Player actions
// ============================================================
// Weapons: each has its own draw time, arrow speed, reload, noise, and how strong a draw must be to kill.
const WEAPONS = {
  compound: { name: 'Compound Bow', draw: 0.75, speed: 1000, cd: 0.8, noise: 230, killAt: 0.7, spread: 1 },
  recurve: { name: 'Whisper Recurve', draw: 0.9, speed: 920, cd: 0.9, noise: 110, killAt: 0.7, spread: 1.1 },
  carbon: { name: 'Carbon Compound', draw: 0.5, speed: 1250, cd: 0.55, noise: 230, killAt: 0.7, spread: 0.9 },
  crossbow: { name: 'Crossbow', draw: 0.25, speed: 1400, cd: 1.8, noise: 150, killAt: 0.45, spread: 0.6 },
  longbow: { name: 'Grandpa\'s Longbow', draw: 0.8, speed: 1350, cd: 0.7, noise: 90, killAt: 0.6, spread: 0.7, legendDmg: 2 },
};
function weapon() {
  const w = Object.assign({}, WEAPONS[campaign.weapon] || WEAPONS.compound);
  if (has('broadheads')) w.killAt = Math.max(0.35, w.killAt - 0.15);
  if (G && G.buzz > 0) { w.draw *= 0.6; w.spread *= 1.6; }
  return w;
}

function startDraw() {
  if (player.cd > 0 || player.drawing || player.fishing) return;
  if (player.carry) { popup(player.x, player.y - 30, 'Hands full! (E to drop)', '#ffd166', 1.2); return; }
  if (player.cooler) { popup(player.x, player.y - 30, 'Hands full with the cooler!', '#ffd166', 1.2); return; }
  if (player.arrows <= 0) {
    popup(player.x, player.y - 30, 'Out of arrows! Pick up stuck ones.', '#ff9f6b', 1.4);
    hint('arrows', 'Out of arrows? Walk over arrows stuck in the ground or walls to pick them back up.');
    return;
  }
  player.drawing = true;
  player.draw = 0;
}

function releaseDraw() {
  if (!player.drawing) return;
  player.drawing = false;
  shoot(player.draw);
}

function shoot(power = 1) {
  const wp = weapon();
  const p = 0.25 + 0.75 * power;
  const base = player.moving ? 0.06 : (player.crouch ? 0.006 : 0.015);
  const spread = base * (1.7 - power) * wp.spread;
  const a = player.ang + aimSway() + rnd(-spread, spread) * (1 + holdExcess() * 0.6);
  player.holdT = 0;
  const speed = lerp(420, wp.speed, p);
  arrows.push({ x: player.x + Math.cos(a) * 16, y: player.y + Math.sin(a) * 16, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, ang: a, life: 0.72, flying: true, t: Infinity, power, killAt: wp.killAt, legendDmg: wp.legendDmg || 1 });
  player.arrows--;
  player.cd = wp.cd;
  G.shots++;
  sfx.shoot();
  makeNoise(player.x, player.y, wp.noise * noiseMult(), 'twang');
}

function throwCone() {
  const can = player.cones <= 0 && player.cans > 0;
  if (player.cones <= 0 && !can) { popup(player.x, player.y - 30, 'No pinecones left', '#ff9f6b', 1.2); return; }
  const wx = mouse.x + cam.x, wy = mouse.y + cam.y;
  const d = Math.min(380, dist(player.x, player.y, wx, wy));
  const a = Math.atan2(wy - player.y, wx - player.x);
  if (can) player.cans--; else player.cones--;
  cones.push({ sx: player.x, sy: player.y, tx: player.x + Math.cos(a) * d, ty: player.y + Math.sin(a) * d, t: 0, T: 0.35 + d / 900, can });
  sfx.toss();
}

function updateCones(dt) {
  for (const c of cones) {
    c.t += dt;
    if (c.t >= c.T && !c.landed) {
      c.landed = true;
      sfx.cone();
      // Pinecones make noise but never raise suspicion: watchers come look.
      let lured = false;
      const NR = (c.can ? 400 : 320) * noiseMult();
      if (c.can) sfx.clang();
      for (const w of watchers) if (!w.seeing && dist(w.x, w.y, c.tx, c.ty) < NR) lured = true;
      makeNoise(c.tx, c.ty, NR, 'cone');
      if (lured) unlock('decoy');
      for (let i = 0; i < 6; i++) particles.push({ x: c.tx, y: c.ty, vx: rnd(-60, 60), vy: rnd(-60, 60), t: 0.4, c: '#8a6a3a' });
    }
  }
  cones = cones.filter(c => !c.landed || c.t < c.T + 4);
}

function noiseMult() {
  if (!G) return 1;
  const chad = watchers.find(w => w.type === 'chad');
  const blower = chad && dist(chad.x, chad.y, player.x, player.y) < 240 ? 0.4 : 1; // Chad's leaf blower drowns you out
  return (G.weather === 'rain' ? 0.7 : G.weather === 'snow' ? 0.85 : 1) * blower;
}
function weatherVis() { return !G ? 1 : G.weather === 'fog' ? 0.72 : G.weather === 'rain' ? 0.85 : G.weather === 'snow' ? 0.95 : 1; }

function nearVan() {
  if (G && G.police) return false; // roadblock on the logging road
  const v = world.van;
  return dist(player.x, player.y, v.x + v.w / 2, v.y + v.h / 2) < 120;
}

function interact() {
  if (player.fishing) { reelIn(); return; }
  if (player.carry) {
    player.carry.carried = false;
    player.carry = null;
    sfx.pickup();
    return;
  }
  // Grabbing a downed deer always wins if one is right here.
  if (!player.cooler) {
    let nd = 48, near = null;
    for (const d of deer) if (d.dead && !d.carried) { const dd = dist(d.x, d.y, player.x, player.y); if (dd < nd) { nd = dd; near = d; } }
    if (near) {
      near.carried = true; player.carry = near; sfx.pickup();
      popup(player.x, player.y - 30, 'Dragging deer — get it to your shed!', '#ffd166', 1.6);
      if (near.tracked) { near.tracked = false; unlock('tracker'); }
      return;
    }
  }
  if (G.police && dist(player.x, player.y, world.van.x + world.van.w / 2, world.van.y + world.van.h / 2) < 160) { popup(player.x, player.y - 30, 'Steve: "Cops at the end of the road, man. Come back later!"', '#b5e86a', 2); return; }
  if (nearVan()) { openSteve(); return; }
  if (player.cooler) {
    if (nearTruck()) { G.freezer += player.cooler; popup(player.x, player.y - 30, 'Cooler back in the shed.', '#9ecbff', 1.2); player.cooler = 0; sfx.pickup(); }
    else popup(player.x, player.y - 30, 'Follow the green STEVE arrow to sell that cooler.', '#ffd166', 1.6);
    return;
  }
  if (nearTruck() && G.freezer > 0 && !deer.some(d => d.dead && !d.carried && dist(d.x, d.y, player.x, player.y) < 48)) {
    player.cooler = Math.min(10, G.freezer);
    G.freezer -= player.cooler;
    sfx.pickup();
    popup(player.x, player.y - 30, `Packed a cooler: ${player.cooler} venison packs. Sell them to Steve!`, '#9ecbff', 2);
    hint('cooler', 'Heavy cooler. Very suspicious. Follow the arrow to Steve\'s van, press E to open his menu, then choose Sell.');
    return;
  }
  tryFish();
}

function nearTruck() {
  const t = world.truck;
  return dist(player.x, player.y, t.x + t.w / 2, t.y + t.h / 2) < 105;
}

function tryLeave() {
  if (!nearTruck()) { popup(player.x, player.y - 30, 'Get back to your shed to end the night (Q)', '#ffd166', 1.4); return; }
  if (G.delivered >= G.quota) endNight('win');
  else endNight(G.police ? 'escaped' : 'home');
}

function makeNoise(x, y, r, kind, skipDeer) {
  for (const w of watchers) {
    if (w.seeing || w.asleep > 0 || w.eating > 0) continue;
    const d = dist(w.x, w.y, x, y);
    if (d > r) continue;
    if (d < 400 && los(w.x, w.y, x, y)) investigate(w, x, y);
    else { w.look = 3; w.lookAng = Math.atan2(y - w.y, x - w.x); }
    if (w.quipCD <= 0 && w.type !== 'cop' && w.type !== 'cam') { popup(w.x, w.y - 34, pick(QUIPS.investigate), '#ffe9a8'); w.quipCD = 5; voice(w.type); }
  }
  if (skipDeer && kind !== 'step') return;
  for (const d of deer) {
    if (kind === 'step' && dist(d.x, d.y, x, y) > r) continue;
    if (d.dead || d.state === 'flee' || d.scare) continue;
    // Deer flinch a beat after the noise, so an accurate arrow lands first.
    if (dist(d.x, d.y, x, y) < r * 1.4) d.scare = { x, y, t: rnd(0.25, 0.45) };
  }
}

// ============================================================
// Pathfinding: A* on a 30px grid so watchers walk around houses, fences and pools
// ============================================================
const CELL = 30;
let navGrid = null, navW = 0, navH = 0;
function buildNav() {
  navW = Math.ceil(W / CELL); navH = Math.ceil(H / CELL);
  navGrid = new Uint8Array(navW * navH);
  const pad = 12;
  const mark = (x0, y0, x1, y1) => {
    for (let cy = Math.max(0, Math.floor(y0 / CELL)); cy <= Math.min(navH - 1, Math.floor(y1 / CELL)); cy++)
      for (let cx = Math.max(0, Math.floor(x0 / CELL)); cx <= Math.min(navW - 1, Math.floor(x1 / CELL)); cx++) {
        // only block a cell if its center is actually inside the padded shape
        const px = cx * CELL + CELL / 2, py = cy * CELL + CELL / 2;
        if (px >= x0 && px <= x1 && py >= y0 && py <= y1) navGrid[cy * navW + cx] = 1;
      }
  };
  for (const s of world.solids) mark(s.x - pad, s.y - pad, s.x + s.w + pad, s.y + s.h + pad);
  for (const t of world.trees) mark(t.x - t.trunk - 4, t.y - t.trunk - 4, t.x + t.trunk + 4, t.y + t.trunk + 4);
}
const cellOf = v => Math.floor(v / CELL);
function cellFree(cx, cy) { return cx >= 0 && cy >= 0 && cx < navW && cy < navH && !navGrid[cy * navW + cx]; }
function walkable(x1, y1, x2, y2) {
  const n = Math.max(1, Math.ceil(dist(x1, y1, x2, y2) / 8));
  for (let i = 0; i <= n; i++) {
    const x = lerp(x1, x2, i / n), y = lerp(y1, y2, i / n);
    if (!cellFree(cellOf(x), cellOf(y))) return false;
  }
  return true;
}
function nearestFree(cx, cy) {
  if (cellFree(cx, cy)) return [cx, cy];
  for (let r = 1; r <= 4; r++)
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++)
      if (cellFree(cx + dx, cy + dy)) return [cx + dx, cy + dy];
  return null;
}
function findPath(sx, sy, tx, ty, maxNodes = 5000) {
  if (!navGrid) return null;
  if (walkable(sx, sy, tx, ty)) return [{ x: tx, y: ty }];
  const s = nearestFree(cellOf(sx), cellOf(sy)), g = nearestFree(cellOf(tx), cellOf(ty));
  if (!s || !g) return null;
  const key = (x, y) => y * navW + x;
  const goalK = key(g[0], g[1]);
  const gScore = new Map(), came = new Map();
  const heap = [];
  const push = (f, k) => { heap.push([f, k]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  const h = (x, y) => { const dx = Math.abs(x - g[0]), dy = Math.abs(y - g[1]); return Math.max(dx, dy) + 0.414 * Math.min(dx, dy); };
  const sk = key(s[0], s[1]);
  gScore.set(sk, 0); push(h(s[0], s[1]), sk);
  let found = false, n = 0;
  while (heap.length && n++ < maxNodes) {
    const [, k] = pop();
    if (k === goalK) { found = true; break; }
    const cx = k % navW, cy = (k / navW) | 0, gc = gScore.get(k);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = cx + dx, ny = cy + dy;
      if (!cellFree(nx, ny)) continue;
      if (dx && dy && (!cellFree(cx + dx, cy) || !cellFree(cx, cy + dy))) continue; // no corner cutting
      const nk = key(nx, ny), ng = gc + (dx && dy ? 1.414 : 1);
      if (ng < (gScore.has(nk) ? gScore.get(nk) : Infinity)) { gScore.set(nk, ng); came.set(nk, k); push(ng + h(nx, ny), nk); }
    }
  }
  if (!found) return null;
  const cells = [];
  for (let k = goalK; k !== sk; k = came.get(k)) cells.push({ x: (k % navW) * CELL + CELL / 2, y: ((k / navW) | 0) * CELL + CELL / 2 });
  cells.reverse();
  cells.push({ x: tx, y: ty });
  // string-pull: skip waypoints we can walk past in a straight line
  const out = [];
  let cur = { x: sx, y: sy }, i = 0;
  while (i < cells.length) {
    let j = cells.length - 1;
    while (j > i && !walkable(cur.x, cur.y, cells[j].x, cells[j].y)) j--;
    out.push(cells[j]); cur = cells[j]; i = j + 1;
  }
  return out;
}
// ============================================================
// Guided tutorial (first Night 1 only)
// ============================================================
const TUTORIAL = [
  { text: 'Hold SHIFT and move (WASD) to sneak. Sneaking is silent and harder to spot.', done: () => player.crouch && player.moving && (G.tutT += 1 / 60) > 1.2 },
  { text: 'Find a deer. The green arrow points to the nearest one.', done: () => nearestDeer() && dist(player.x, player.y, nearestDeer().x, nearestDeer().y) < 320 },
  { text: 'HOLD the mouse button to draw your bow. Release when the ring turns GREEN.', done: () => deer.some(d => d.dead) },
  { text: 'Walk to the deer and press E to drag it. Bring it home to your shed (yellow arrow).', done: () => G.delivered > 0 },
  { text: 'At your shed, press E to pack a cooler of venison from the freezer.', done: () => player.cooler > 0 || (G.soldPacks || 0) > 0 },
  { text: 'Follow the green arrow to Steve\'s van. Press E to open his menu, then choose Sell.', done: () => (G.soldPacks || 0) > 0 },
];
function nearestDeer() {
  let best = null, bd = 1e9;
  for (const d of deer) if (!d.dead) { const dd = dist(d.x, d.y, player.x, player.y); if (dd < bd) { bd = dd; best = d; } }
  return best;
}
function updateTutorial() {
  if (!G.tut) return;
  const step = TUTORIAL[G.tut.step];
  if (step && step.done()) {
    G.tut.step++; G.tutT = 0; sfx.grab();
    if (G.tut.step >= TUTORIAL.length) { G.tut = null; store.set('hs_tut_done', true); banner('Tutorial complete! Now fill your quota before sunrise.', '#9be564'); }
  }
}
function skipTutorial() { G.tut = null; store.set('hs_tut_done', true); }
function drawTutorial() {
  if (!G.tut) return;
  const step = TUTORIAL[G.tut.step];
  const compact = VW < 760;
  const w = Math.min(560, VW - 28), x = VW / 2 - w / 2, y = compact ? VH - 150 : 80;
  ctx.font = '15px system-ui, sans-serif';
  const lines = wrapLines(step.text, w - 30);
  const h = 34 + lines.length * 20;
  panel(x, y, w, h);
  ctx.strokeStyle = '#9be564'; ctx.lineWidth = 1.5; roundRect(ctx, x, y, w, h, 10); ctx.stroke();
  ctx.textAlign = 'left'; ctx.fillStyle = '#9be564'; ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.fillText(`TUTORIAL ${G.tut.step + 1}/${TUTORIAL.length}   (skip: pause menu)`, x + 14, y + 16);
  ctx.fillStyle = '#fff'; ctx.font = '15px system-ui, sans-serif';
  lines.forEach((l, i) => ctx.fillText(l, x + 14, y + 36 + i * 20));
  if (G.tut.step === 1) { const d = nearestDeer(); if (d) drawTruckPointer({ x: d.x, y: d.y, w: 0, h: 0 }, 'DEER', '#9be564'); }
}

function routeLength(x, y, route) { let L = 0; for (const p of route) { L += dist(x, y, p.x, p.y); x = p.x; y = p.y; } return L; }
function followRoute(w, speed, dt) {
  // returns true when the route is finished
  if (!w.route || !w.route.length) return true;
  const p = w.route[0];
  if (stepToward(w, p.x, p.y, speed * dt)) w.route.shift();
  return !w.route.length;
}

function investigate(w, x, y) {
  if (w.fixed) { w.look = 3; w.lookAng = Math.atan2(y - w.y, x - w.x); return; }
  if (w.type === 'drone' || w.type === 'k9') { if (w.state === 'patrol') w.home = { x: w.x, y: w.y }; w.state = 'investigate'; w.inv = { x, y }; w.invT = 5; return; }
  // Same spot as before? Just keep looking (and don't re-plan every frame while chasing).
  if (w.state === 'investigate' && w.inv && dist(w.inv.x, w.inv.y, x, y) < 40) { w.invT = Math.max(w.invT, w.type === 'cop' ? 4 : 3); return; }
  w.routeT = w.routeT || 0;
  if (w.state === 'investigate' && w.routeT > 0) { w.inv = { x, y }; w.invT = Math.max(w.invT, 3); return; }
  const route = findPath(w.x, w.y, x, y);
  const maxLen = w.type === 'cop' ? 1600 : 650;
  if (!route || routeLength(w.x, w.y, route) > maxLen) { w.look = 3; w.lookAng = Math.atan2(y - w.y, x - w.x); return; }
  if (w.state === 'patrol') { w.home = { x: w.x, y: w.y }; w.trail = []; }
  w.state = 'investigate';
  w.inv = { x, y };
  w.route = route;
  w.routeT = 0.6;
  // enough time to actually walk there, then look around for a few seconds
  w.invT = Math.max(w.type === 'cop' ? 4 : 5, routeLength(w.x, w.y, route) / (w.speed * 0.85) + 3);
}
