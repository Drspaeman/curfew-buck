'use strict';
// Curfew Buck: Drawing the world, characters, HUD and menus.
// Part 6 of 10. All parts share one global scope, so load them in order (see index.html).
// ============================================================
// Rendering
// ============================================================
function inView(x, y, m) { return x > cam.x - m && x < cam.x + VW + m && y > cam.y - m && y < cam.y + VH + m; }

function render(now) {
  const wob = G && G.buzz > 0 && settings.shake ? Math.min(1, G.buzz / 5) * 5 : 0; // beer wobble
  const shake = settings.shake ? cam.shake : 0;
  const sx = (shake ? rnd(-shake, shake) : 0) + Math.sin(now / 420) * wob;
  const sy = (shake ? rnd(-shake, shake) : 0) + Math.cos(now / 530) * wob * 0.6;
  camOff.x = sx; camOff.y = sy;
  ctx.setTransform(DPR, 0, 0, DPR, (-cam.x + sx) * DPR, (-cam.y + sy) * DPR);
  ctx.fillStyle = '#1b2f1d';
  ctx.fillRect(cam.x - 20, cam.y - 20, VW + 40, VH + 40);
  drawGround();
  if (world.golf) drawGolf(now);
  drawPonds(now);
  drawCreekStones();
  drawPools(now);
  drawGardens();
  drawCorn();
  drawWeatherTerrain();
  drawPrints();
  drawMarks();
  drawDragPath(now);
  drawDrops();
  drawTruck();
  drawFences();
  drawHedges();
  drawSprinklers(now);
  drawHouseShadows();
  drawHouses();
  drawCars();
  drawSigns();
  drawProps();
  drawNotices(now);
  drawGossip(now);
  drawGoth(now);
  drawYotm();
  drawCarvings(now);
  drawCat();
  drawDogs(now);
  drawFloods();
  drawCritters(now);
  drawObjectiveMarker(now);
  drawDeer(now);
  drawArrows();
  drawPinecones();
  drawPlayer(now, false);
  if (tyler) drawTyler(now);
  drawBushes();
  drawGrass(now);
  if (player.hidden) drawPlayer(now, true);
  drawTrees();
  drawParticles();
  if (G) drawLighting(now);
  if (G && G.nvgOn) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = 'rgba(60,255,110,0.12)'; ctx.fillRect(0, 0, cv.width, cv.height); }
  if (G && G.flash > 0 && settings.flashes) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = `rgba(230,235,255,${clamp(G.flash * 1.6, 0, 0.55)})`; ctx.fillRect(0, 0, cv.width, cv.height); }
  if (G && G.sirenCap > 0 && state === 'play') { G.sirenCap -= 1 / 60; ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.fillStyle = 'rgba(60,10,10,0.85)'; roundRect(ctx, 14, VH - 92, 190, 24, 8); ctx.fill(); ctx.fillStyle = '#ffd0d0'; ctx.font = 'bold 12px system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.fillText('🚨 Siren: a cruiser is close', 24, VH - 75); }
  if (G && G.flash > 0 && !settings.flashes && state === 'play') { ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.fillStyle = 'rgba(20,24,40,0.85)'; const ly = G.sirenCap > 0 ? VH - 122 : VH - 92; roundRect(ctx, VW / 2 - 130, ly, 260, 24, 8); ctx.fill(); ctx.fillStyle = '#e6ebff'; ctx.font = 'bold 13px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('⚡ Lightning: you\'re easier to see', VW / 2, ly + 17); }
  ctx.setTransform(DPR, 0, 0, DPR, (-cam.x + sx) * DPR, (-cam.y + sy) * DPR);
  if (G) drawAmbient(now);
  if (G) { drawCones(); drawGhost(); drawWatchers(now); drawKidCostumes(now); }
  drawPlayerOverlay();   // the [E] prompt and stamina bar sit above bushes and the night darkness
  drawPopups();
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (G && (G.weather === 'rain' || G.weather === 'snow')) drawRain();
  if (G && (state === 'play' || state === 'pause')) { drawVignette(); drawHUD(now); drawMinimap(); if (G.mapOpen) { ctx.fillStyle = 'rgba(5,8,14,0.75)'; ctx.fillRect(0, 0, VW, VH); drawMinimap(true); } drawTutorial(); drawTouchControls(); drawCrosshair(); }
  drawScreens(now);
  drawToasts();
  if (state !== lastState) { fadeT = 0.3; lastState = state; }
  if (fadeT > 0) { fadeT -= 1 / 60; ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.fillStyle = `rgba(0,0,0,${clamp(fadeT / 0.3, 0, 1) * 0.6})`; ctx.fillRect(0, 0, VW, VH); }
}
let lastState = null, fadeT = 0;

function drawPonds(now) {
  for (const p of world.ponds) {
    if (!inView(p.x + p.w / 2, p.y + p.h / 2, 200)) continue;
    ctx.fillStyle = '#3d4a2a'; roundRect(ctx, p.x - 10, p.y - 10, p.w + 20, p.h + 20, Math.min(40, (p.h + 20) / 2)); ctx.fill();
    ctx.fillStyle = p.koi ? '#2a6f86' : '#2b5550'; roundRect(ctx, p.x, p.y, p.w, p.h, Math.min(34, p.h / 2)); ctx.fill();
    // lily pads / koi
    for (let i = 0; i < 5; i++) {
      const a = now / (p.koi ? 1500 : 4000) + i * 1.3;
      const x = p.x + p.w / 2 + Math.cos(a) * p.w * 0.3, y = p.y + p.h / 2 + Math.sin(a * 1.3) * p.h * 0.28;
      if (p.koi) { ctx.fillStyle = i % 2 ? '#ff8a3a' : '#f2f2f2'; ctx.beginPath(); ctx.ellipse(x, y, 7, 3, a + Math.PI / 2, 0, TAU); ctx.fill(); }
      else { ctx.fillStyle = '#4f7d3f'; ctx.beginPath(); ctx.arc(x, y, 7, 0.3, TAU - 0.3); ctx.lineTo(x, y); ctx.fill(); }
    }
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(p.name, p.x + p.w / 2, p.y - 16);
  }
  // HOA clubhouse
  const c = world.clubhouse;
  if (inView(c.x + c.w / 2, c.y + c.h / 2, 200)) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(c.x + 8, c.y + 8, c.w, c.h);
    ctx.fillStyle = '#e8e2d2'; ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.fillStyle = '#2f5d4f'; ctx.fillRect(c.x - 6, c.y - 6, c.w + 12, c.h / 2 + 6);
    ctx.fillStyle = '#264c41'; ctx.fillRect(c.x - 6, c.y + c.h / 2, c.w + 12, c.h / 2 + 6);
    ctx.fillStyle = '#ffd166'; ctx.font = 'bold 12px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('HOA CLUBHOUSE: RESIDENTS ONLY', c.x + c.w / 2, c.y + c.h / 2 + 4);
  }
  // Fishing line + bobber
  if (player && player.fishing) {
    const f = player.fishing;
    ctx.strokeStyle = 'rgba(230,230,230,0.6)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(player.x, player.y); ctx.quadraticCurveTo((player.x + f.bx) / 2, (player.y + f.by) / 2 - 30, f.bx, f.by); ctx.stroke();
    const bob = f.bite > 0 ? Math.sin(now / 40) * 3 : Math.sin(now / 400) * 1.2;
    ctx.fillStyle = '#ff3b3b'; ctx.beginPath(); ctx.arc(f.bx, f.by + bob, 4, 0, TAU); ctx.fill();
    if (f.bite > 0) { ctx.fillStyle = '#ff3b3b'; ctx.font = 'bold 26px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('!', f.bx, f.by - 12); }
  }
}

function drawObjectiveMarker(now) {
  const p = objectivePlace();
  if (!p || !inView(p.x, p.y, 60)) return;
  const pulse = 1 + Math.sin(now / 250) * 0.15;
  ctx.strokeStyle = '#7cf'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(p.x, p.y, 18 * pulse, 0, TAU); ctx.stroke();
  ctx.fillStyle = '#7cf'; ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(G.objective.place === 'garage' ? 'GARAGE DOOR' : 'OBJECTIVE', p.x, p.y - 26);
}

function drawPools(now) {
  for (const p of world.pools) {
    if (!inView(p.x + 60, p.y + 32, 120)) continue;
    ctx.fillStyle = '#d8d2c4'; roundRect(ctx, p.x - 6, p.y - 6, p.w + 12, p.h + 12, 14); ctx.fill();
    ctx.fillStyle = '#2f8fb8'; roundRect(ctx, p.x, p.y, p.w, p.h, 10); ctx.fill();
    ctx.strokeStyle = 'rgba(200,240,255,0.35)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      const y = p.y + 16 + i * 16, o = Math.sin(now / 700 + i) * 6;
      ctx.beginPath(); ctx.moveTo(p.x + 14 + o, y); ctx.quadraticCurveTo(p.x + 60, y - 5, p.x + p.w - 14 + o, y); ctx.stroke();
    }
  }
}

function drawGrass(now) {
  for (const g of world.grass) {
    if (!inView(g.x, g.y, 90)) continue;
    const inside = player && dist(g.x, g.y, player.x, player.y) < g.r;
    ctx.globalAlpha = inside ? 0.55 : 0.9;
    ctx.fillStyle = '#5d6b2c';
    ctx.beginPath(); ctx.arc(g.x, g.y, g.r, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#8a9a45'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < 22; i++) {
      const a = g.seed + i * 2.4, rr = (i % 7) / 7 * g.r * 0.85;
      const x = g.x + Math.cos(a) * rr, y = g.y + Math.sin(a) * rr;
      const sway = Math.sin(now / 600 + i) * 2;
      ctx.moveTo(x, y + 6); ctx.lineTo(x + sway, y - 7);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function drawCorn() {
  if (!G) return;
  for (const c of G.corn) {
    if (!inView(c.x, c.y, 30)) continue;
    ctx.fillStyle = '#e0b83a';
    for (let i = 0; i < 12; i++) ctx.fillRect(c.x + Math.cos(i * 2.1) * (i % 4) * 4, c.y + Math.sin(i * 2.1) * (i % 4) * 4, 3, 3);
  }
}

function drawGardens() {
  for (const g of world.gardens) {
    if (g.green || !inView(g.x + 40, g.y + 40, 100)) continue;
    ctx.fillStyle = '#4a3523';
    roundRect(ctx, g.x, g.y, g.w, g.h, 8); ctx.fill();
    for (let i = 0; i < 9; i++) {
      const px = g.x + 14 + (i % 3) * 26, py = g.y + 14 + Math.floor(i / 3) * 26;
      ctx.fillStyle = g.ex ? '#6b8fd6' : '#3f7d3a';
      ctx.beginPath(); ctx.arc(px, py, 9, 0, TAU); ctx.fill();
      ctx.fillStyle = g.ex ? '#a9c1f0' : '#6fae5c';
      ctx.beginPath(); ctx.arc(px - 2, py - 2, 4, 0, TAU); ctx.fill();
    }
  }
}

function drawPrints() {
  if (!G || !G.prints.length) return;
  for (const p of G.prints) {
    if (!inView(p.x, p.y, 10)) continue;
    ctx.globalAlpha = clamp(p.t / 30, 0, 1) * 0.55;
    ctx.fillStyle = '#7d8a99';
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.ang);
    ctx.beginPath(); ctx.ellipse(0, 0, 5, 2.6, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function drawDrops() {
  if (!drops.length) return;
  if (drops.length > 500) drops.splice(0, drops.length - 500);
  ctx.fillStyle = '#b3202a';
  for (const d of drops) if (inView(d.x, d.y, 10)) { ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, TAU); ctx.fill(); }
}

function drawProps() {
  for (const p of world.props) {
    if (!inView(p.x, p.y, 30)) continue;
    if (p.kind === 'trash') {
      if (p.down) {
        ctx.fillStyle = '#4b5056'; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(1.2); ctx.fillRect(-7, -11, 14, 22); ctx.restore();
        ctx.fillStyle = '#8a7a5a'; for (let i = 0; i < 5; i++) ctx.fillRect(p.x + 8 + i * 5, p.y - 6 + (i % 2) * 8, 4, 3);
      } else {
        ctx.fillStyle = '#5f666d'; ctx.beginPath(); ctx.arc(p.x, p.y, 9, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#3a3f44'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, TAU); ctx.stroke();
      }
    } else {
      ctx.save(); ctx.translate(p.x, p.y); if (p.down) ctx.rotate(1.5);
      ctx.fillStyle = '#3d6fb5'; ctx.beginPath(); ctx.arc(0, 2, 5, 0, TAU); ctx.fill();
      ctx.fillStyle = '#d63b3b'; ctx.beginPath(); ctx.moveTo(-5, -1); ctx.lineTo(5, -1); ctx.lineTo(0, -11); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }
}

function drawNotices(now) {
  if (!G) return;
  for (const n of G.notices) {
    if (n.got || !inView(n.x, n.y, 30)) continue;
    ctx.save(); ctx.translate(n.x, n.y + Math.sin(now / 400 + n.x) * 2); ctx.rotate(n.rot);
    ctx.fillStyle = '#ffe38a'; ctx.fillRect(-8, -10, 16, 20);
    ctx.fillStyle = '#b33'; ctx.fillRect(-5, -6, 10, 2); ctx.fillRect(-5, -1, 10, 2); ctx.fillRect(-5, 4, 6, 2);
    ctx.restore();
  }
}

function drawCat() {
  if (!G || !G.cat || !inView(G.cat.x, G.cat.y, 30)) return;
  const c = G.cat;
  ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.ang);
  ctx.fillStyle = '#222';
  ctx.beginPath(); ctx.ellipse(0, 0, 8, 4.5, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.arc(8, 0, 4, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#222'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.quadraticCurveTo(-14, 6, -16, 0); ctx.stroke();
  ctx.fillStyle = '#ffe14d'; ctx.fillRect(9, -2, 1.5, 1.5); ctx.fillRect(9, 1, 1.5, 1.5);
  ctx.restore();
}

function drawFloods() {
  for (const f of world.floods) {
    if (!inView(f.x, f.y, 60)) continue;
    ctx.fillStyle = f.on > 0 ? '#fff6c8' : '#555b60';
    ctx.fillRect(f.x - 8, f.y - 3, 16, 6);
  }
}

function drawPinecones() {
  for (const c of cones) {
    const k = clamp(c.t / c.T, 0, 1);
    const x = lerp(c.sx, c.tx, k), y = lerp(c.sy, c.ty, k) - Math.sin(k * Math.PI) * 40;
    if (!inView(x, y, 30)) continue;
    ctx.fillStyle = c.can ? '#c9ced6' : '#7a5530';
    ctx.beginPath(); ctx.ellipse(x, y, c.can ? 4 : 5, c.can ? 6 : 7, k * 6, 0, TAU); ctx.fill();
    if (c.landed) {
      const r = (c.t - c.T) * 200;
      if (r < 180) { ctx.strokeStyle = `rgba(200,170,110,${0.5 - r / 360})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(c.tx, c.ty, r, 0, TAU); ctx.stroke(); }
    }
  }
}

function drawGhost() {
  if (!G.ghost) return;
  const g = G.ghost;
  ctx.globalAlpha = clamp(g.t / 3, 0, 1) * 0.7;
  ctx.strokeStyle = '#ff9a3a'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
  ctx.beginPath(); ctx.arc(g.x, g.y, 16, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = '#ff9a3a'; ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('LAST SEEN', g.x, g.y - 22);
  ctx.globalAlpha = 1;
}

function drawRain() {
  if (G.weather === 'snow') {
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (const r of rain) { ctx.beginPath(); ctx.arc(r.x, r.y, (r.v % 3) / 2 + 1, 0, TAU); ctx.fill(); }
    return;
  }
  ctx.strokeStyle = 'rgba(170,190,220,0.35)'; ctx.lineWidth = 1;
  ctx.beginPath();
  for (const r of rain) { ctx.moveTo(r.x, r.y); ctx.lineTo(r.x - 4, r.y + 16); }
  ctx.stroke();
  // splashes on the ground
  const t = performance.now() / 1000;
  ctx.strokeStyle = 'rgba(170,190,220,0.25)';
  for (let i = 0; i < 14; i++) {
    const k = t * 1.7 + i * 0.37, ph = k % 1, n = Math.floor(k);
    const x = (i * 197 + n * 331) % VW, y = (i * 131 + n * 211) % VH;
    ctx.beginPath(); ctx.ellipse(x, y, 2 + ph * 10, 1 + ph * 4, 0, 0, TAU); ctx.stroke();
  }
}

function drawVignette() {
  const seen = watchers.some(w => w.seeing);
  const k = G.police ? 0.35 : seen ? 0.25 + G.sus / 300 : G.sus > 60 ? (G.sus - 60) / 200 : 0;
  if (k <= 0) return;
  const g = ctx.createRadialGradient(VW / 2, VH / 2, Math.min(VW, VH) * 0.35, VW / 2, VH / 2, Math.max(VW, VH) * 0.75);
  g.addColorStop(0, 'rgba(255,0,0,0)');
  g.addColorStop(1, `rgba(200,20,20,${k})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
}

// Where achievement toasts go. Phones: only the two newest, below the suspicion bar. If that would cover
// Dale or the popups over his head, they go under his feet instead, as long as they end above the hint box
// (or Raven's speech box); if only one fits there, only the newest shows.
function toastLayout() {
  const narrow = VW < 760;
  let y = narrow ? 300 : 220, show = narrow ? toasts.slice(-2) : toasts;
  // phone menus and results: just the newest, at the very top, above the screen's title
  if (narrow && state !== 'play' && state !== 'photo') return { y: 12, show: toasts.slice(-1) };
  // a phone on its side: menus get one slim line in the top edge; in play, the newest goes under the minimap
  if (shortLandscape() && state !== 'play' && state !== 'photo') return { y: 4, show: toasts.slice(-1), compact: true };
  // a phone on its side: just the newest, tucked under the minimap
  if (shortLandscape() && (state === 'play' || state === 'photo')) { const m = minimapBox(); return { y: m.y + m.h + 8, show: toasts.slice(-1) }; }
  if (narrow && player && (state === 'play' || state === 'photo')) {
    const py = player.y - cam.y;
    const floor = G && G.goth && G.goth.say ? VH - 306 : VH - 150;
    if (py - 110 < y + 60 * show.length && py + 40 > y - 10) {
      if (py + 40 + 60 * show.length < floor) y = py + 40;
      else if (py + 40 + 60 < floor) { y = py + 40; show = show.slice(-1); }
    }
  }
  return { y, show };
}

function drawToasts() {
  let { y, show, compact } = toastLayout();
  ctx.textAlign = 'left';
  for (const t of show) {
    const w = 280, x = VW - w - 16;
    ctx.globalAlpha = clamp(t.t, 0, 1);
    if (compact) {
      panel(x, y, w, 26);
      ctx.fillStyle = '#ffd166'; ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillText(fitText('🏆 ' + t.title, w - 20), x + 10, y + 17);
      continue;
    }
    panel(x, y, w, 52);
    ctx.fillStyle = '#ffd166'; ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText('🏆 ' + t.title, x + 12, y + 21);
    ctx.fillStyle = '#ccc'; ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(t.desc, x + 12, y + 40);
    y += 60;
  }
  ctx.globalAlpha = 1;
}

function drawGround() {
  // lawns with mowing stripes
  for (const b of world.blocks) {
    if (!inView(b.x + b.w / 2, b.y + b.h / 2, Math.max(b.w, b.h))) continue;
    ctx.fillStyle = '#365c2e';
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = '#3b6532';
    for (let x = b.x; x < b.x + b.w; x += 70) ctx.fillRect(x, b.y, 35, b.h);
  }
  // woods floor speckle
  ctx.fillStyle = '#213a22';
  for (let i = 0; i < 160; i++) {
    const x = (i * 977) % W, y = (i * 613) % H;
    if (world.inWoods(x, y) && inView(x, y, 40)) ctx.fillRect(x, y, 26, 14);
  }
  if (G && G.weather === 'snow') { ctx.fillStyle = 'rgba(232,238,244,0.62)'; ctx.fillRect(cam.x - 20, cam.y - 20, VW + 40, VH + 40); }
  // sidewalks then roads
  for (const r of world.roads) { ctx.fillStyle = '#6d706b'; ctx.fillRect(r.x - 14, r.y - 14, r.w + 28, r.h + 28); }
  for (const r of world.roads) { ctx.fillStyle = '#2d2f33'; ctx.fillRect(r.x, r.y, r.w, r.h); }
  drawBulbs();
  ctx.strokeStyle = 'rgba(214,176,52,0.75)';
  ctx.lineWidth = 4;
  ctx.setLineDash([34, 30]);
  ctx.beginPath();
  for (const r of world.roads) {
    if (r.bulb) continue;
    if (r.vert) { ctx.moveTo(r.x + r.w / 2, r.y); ctx.lineTo(r.x + r.w / 2, r.y + r.h); }
    else { ctx.moveTo(r.x, r.y + r.h / 2); ctx.lineTo(r.x + r.w, r.y + r.h / 2); }
  }
  ctx.stroke();
  ctx.setLineDash([]);
  // gravel logging road out to Sketchy Steve's van
  const v = world.van;
  ctx.fillStyle = '#5b4f3f';
  ctx.fillRect(W - M - 10, v.y - 40, M - 10, v.h + 80);
  // dirt path from the shed's door
  const s = world.shed;
  ctx.fillStyle = '#4e5a35';
  ctx.fillRect(s.x + s.w / 2 - 14, s.y + s.h, 28, 30);
  // Phase 2 clearing: bare dirt, tire tracks, survey stakes
  const c = world.clearing;
  if (c && inView(c.x + c.w / 2, c.y + c.h / 2, c.w)) {
    ctx.fillStyle = '#5e4a33'; ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.strokeStyle = 'rgba(40,28,18,0.5)'; ctx.lineWidth = 6; ctx.setLineDash([10, 8]);
    ctx.beginPath(); ctx.moveTo(c.x, c.y + c.h * 0.35); ctx.lineTo(c.x + c.w, c.y + c.h * 0.45); ctx.moveTo(c.x, c.y + c.h * 0.65); ctx.lineTo(c.x + c.w, c.y + c.h * 0.75); ctx.stroke(); ctx.setLineDash([]);
    for (let x = c.x + 20; x < c.x + c.w; x += 60) {
      ctx.fillStyle = '#c9b08a'; ctx.fillRect(x, c.y - 6, 3, 12);
      ctx.fillStyle = '#ff6a1a'; ctx.fillRect(x + 3, c.y - 6, 7, 4);
    }
    ctx.fillStyle = '#efe6d2'; ctx.fillRect(c.x + c.w / 2 - 110, c.y + c.h - 34, 220, 22);
    ctx.fillStyle = '#7a1f1f'; ctx.font = 'bold 12px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('PHASE 2: THE RESERVE — COMING SOON', c.x + c.w / 2, c.y + c.h - 19);
  }
  for (const d of world.phase2) {
    if (!inView(d.x, d.y, 100)) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(d.x + 6, d.y + 6, d.w, d.h);
    ctx.fillStyle = '#e0b020'; ctx.fillRect(d.x, d.y, d.w, d.h);
    ctx.fillStyle = '#333'; ctx.fillRect(d.x, d.y - 4, d.w, 6); ctx.fillRect(d.x, d.y + d.h - 2, d.w, 6); // treads
    ctx.fillStyle = '#9fc3d6'; ctx.fillRect(d.x + d.w * 0.55, d.y + 8, d.w * 0.3, d.h - 16);
    if (d.excavator) { ctx.strokeStyle = '#c99a18'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(d.x + d.w, d.y + d.h / 2); ctx.lineTo(d.x + d.w + 40, d.y - 10); ctx.stroke(); }
    else { ctx.fillStyle = '#8a8a8a'; ctx.fillRect(d.x - 10, d.y - 4, 8, d.h + 8); } // blade
  }
}

function drawCars() {
  for (const c of world.cars) {
    if (!inView(c.x, c.y, 60)) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; roundRect(ctx, c.x + 4, c.y + 4, c.w, c.h, 6); ctx.fill();
    ctx.fillStyle = c.color; roundRect(ctx, c.x, c.y, c.w, c.h, 6); ctx.fill();
    ctx.fillStyle = shade(c.color.length === 7 ? c.color : '#555555', -25);
    roundRect(ctx, c.x + 3, c.y + 12, c.w - 6, c.h - 22, 4); ctx.fill(); // roof
    ctx.fillStyle = '#8fb3c9';
    ctx.fillRect(c.x + 4, c.top ? c.y + c.h - 11 : c.y + 4, c.w - 8, 6); // windshield faces the house
    ctx.fillRect(c.x + 4, c.top ? c.y + 4 : c.y + c.h - 9, c.w - 8, 4);
  }
}

function drawTruck() {
  if (world.golf) { drawPickup(); drawVan(); return; }
  // Dale's shed ("the guest house"): plank roof, a lit window, a chest freezer hum
  const t = world.shed;
  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(7, 7, t.w, t.h);
  ctx.fillStyle = '#6e5137';
  ctx.fillRect(0, 0, t.w, t.h);
  ctx.fillStyle = '#5a4029';
  ctx.fillRect(-4, -4, t.w + 8, t.h / 2 + 4);
  ctx.fillStyle = '#4c3522';
  ctx.fillRect(-4, t.h / 2, t.w + 8, t.h / 2 + 4);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
  for (let x = 8; x < t.w; x += 12) { ctx.beginPath(); ctx.moveTo(x, -4); ctx.lineTo(x, t.h + 4); ctx.stroke(); }
  ctx.fillStyle = '#ffd77a'; ctx.fillRect(t.w - 26, t.h - 2, 16, 5); // window glow
  ctx.fillStyle = '#3a2716'; ctx.fillRect(t.w / 2 - 10, t.h - 2, 20, 6); // door
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('YOUR SHED', t.x + t.w / 2, t.y - 24);
  if (G && G.freezer !== undefined) {
    ctx.fillStyle = '#9ecbff'; ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(`Freezer: ${G.freezer} venison pack${G.freezer === 1 ? '' : 's'}${G.freezer && state === 'play' && nearTruck() && !player.carry && !player.cooler ? '  [E] pack a cooler' : ''}`, t.x + t.w / 2, t.y - 10);
  }
  drawVan();
}

function drawVan() {
  const v = world.van;
  if (G && G.police) {
    // sawhorse roadblock across the logging road
    for (let i = 0; i < 3; i++) { const bx = W - M - 6, by = v.y - 30 + i * 46; ctx.fillStyle = '#eee'; ctx.fillRect(bx, by, 10, 34); ctx.fillStyle = '#e33'; ctx.fillRect(bx, by + 6, 10, 6); ctx.fillRect(bx, by + 20, 10, 6); }
    ctx.fillStyle = '#ff6b6b'; ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('POLICE ROADBLOCK', W - M, v.y - 40);
  }
  if (!inView(v.x + v.w / 2, v.y, 200)) return;
  ctx.save(); ctx.translate(v.x, v.y);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(6, 6, v.w, v.h);
  ctx.fillStyle = '#d8d3c4'; roundRect(ctx, 0, 0, v.w, v.h, 8); ctx.fill();
  ctx.fillStyle = '#b5ae98'; ctx.fillRect(4, 4, 76, v.h - 8);
  ctx.fillStyle = '#7a3a2a'; ctx.fillRect(10, v.h / 2 - 4, 64, 8); // rust stripe
  ctx.fillStyle = '#9fc3d6'; ctx.fillRect(86, 6, 10, v.h - 12);
  ctx.restore();
  ctx.fillStyle = '#ffd166'; ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('STEVE\'S DISCOUNT MEATS & MORE', v.x + v.w / 2, v.y - 10);
}

function drawFences() {
  ctx.fillStyle = '#7b5a3c';
  for (const f of world.fences) if (inView(f.x, f.y + f.h / 2, 200)) {
    ctx.fillRect(f.x, f.y, f.w, f.h);
  }
}

function drawHouses() {
  for (const h of world.houses) {
    if (!inView(h.x + h.w / 2, h.y + h.h / 2, 260)) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(h.x + 8, h.y + 8, h.w, h.h);
    // driveway toward the front road
    ctx.fillStyle = '#5d605c';
    if (h.top) ctx.fillRect(h.x + h.w - 60, h.y - 34, 46, 34);
    else ctx.fillRect(h.x + h.w - 60, h.y + h.h, 46, 34);
    ctx.fillStyle = h.wall;
    ctx.fillRect(h.x, h.y, h.w, h.h);
    // roof
    ctx.fillStyle = h.roof;
    ctx.fillRect(h.x - 6, h.y - 6, h.w + 12, h.h / 2 + 6);
    ctx.fillStyle = shade(h.roof, -18);
    ctx.fillRect(h.x - 6, h.y + h.h / 2, h.w + 12, h.h / 2 + 6);
    ctx.strokeStyle = shade(h.roof, 25);
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(h.x, h.y + h.h / 2); ctx.lineTo(h.x + h.w, h.y + h.h / 2); ctx.stroke();
    // shingle lines
    ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let yy = h.y + 6; yy < h.y + h.h; yy += 12) { ctx.moveTo(h.x - 6, yy); ctx.lineTo(h.x + h.w + 6, yy); }
    ctx.stroke();
    // chimney with a wisp of smoke
    const chx = h.x + (h.lit[0] ? 36 : h.w - 54), chy = h.y + h.h / 2 - (h.top ? 30 : -14);
    ctx.fillStyle = '#6a4a3a'; ctx.fillRect(chx, chy, 18, 16);
    ctx.fillStyle = '#2a2a2a'; ctx.fillRect(chx + 3, chy + 3, 12, 10);
    if (h.lit[1]) { ctx.fillStyle = 'rgba(200,200,210,0.12)'; ctx.beginPath(); ctx.arc(chx + 9 + Math.sin(performance.now() / 900 + h.x) * 4, chy - 8, 9, 0, TAU); ctx.fill(); }
    // mailbox at the curb
    const mbx = h.x + h.w - 74, mby = h.top ? h.y - 30 : h.y + h.h + 24;
    ctx.fillStyle = '#4a3a28'; ctx.fillRect(mbx + 4, mby, 3, 8);
    ctx.fillStyle = h.ex ? '#ff9ad5' : '#2f3540'; ctx.fillRect(mbx, mby - 5, 11, 7);
    ctx.fillStyle = 'rgba(220,220,220,0.7)'; ctx.font = '8px system-ui, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(String(100 + world.houses.indexOf(h) * 4), mbx + 13, mby + 1);
    // windows peeking from front edge
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = h.lit[i] ? (h.tv && i === 1 ? (Math.sin(performance.now() / 90 + h.x) > 0.3 ? '#9ec5ff' : '#6f8fd0') : '#ffd77a') : '#28323d';
      const wx = h.x + 30 + i * 70;
      if (h.top) ctx.fillRect(wx, h.y - 9, 26, 5); else ctx.fillRect(wx, h.y + h.h + 4, 26, 5);
    }
    if (h.ex) {
      ctx.fillStyle = '#ff9ad5';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('♥ DARLENE\'S ♥', h.x + h.w / 2, h.y + h.h / 2 + 5);
    }
    if (h.label) {
      ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.font = 'bold 13px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(h.label, h.x + h.w / 2, h.y + h.h / 2 + 5);
    }
    if (G && G.holiday) drawHolidayLights(h);
  }
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp((n >> 16) + amt, 0, 255), g = clamp(((n >> 8) & 255) + amt, 0, 255), b = clamp((n & 255) + amt, 0, 255);
  return `rgb(${r},${g},${b})`;
}

function drawSigns() {
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (const s of world.signs) {
    if (!inView(s.x, s.y, 200)) continue;
    const w = ctx.measureText(s.text).width + 14;
    ctx.fillStyle = '#4a3a28'; ctx.fillRect(s.x - 2, s.y, 4, 14);
    ctx.fillStyle = '#efe6d2'; ctx.fillRect(s.x - w / 2, s.y - 18, w, 18);
    ctx.fillStyle = '#7a1f1f'; ctx.fillText(s.text, s.x, s.y - 5);
  }
}

function drawDogs(now) {
  for (const g of world.dogs) {
    if (!inView(g.x, g.y, 80)) continue;
    ctx.strokeStyle = 'rgba(200,200,200,0.4)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(g.ax, g.ay); ctx.lineTo(g.x, g.y); ctx.stroke();
    ctx.fillStyle = '#6b4b2e';
    ctx.fillRect(g.ax - 10, g.ay - 8, 20, 16); // doghouse
    ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(g.ang);
    ctx.fillStyle = '#c08a4a';
    ctx.beginPath(); ctx.ellipse(0, 0, 11, 6, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(10, 0, 5, 0, TAU); ctx.fill();
    ctx.restore();
    if (g.bark > 0) {
      ctx.strokeStyle = 'rgba(255,179,107,' + (g.bark * 1.6) + ')'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(g.x, g.y, 30 + (0.5 - g.bark) * 100, 0, TAU); ctx.stroke();
    }
  }
}

function drawDeer(now) {
  for (const d of deer) {
    if (!inView(d.x, d.y, 60)) continue;
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.ang);
    if (d.dead) {
      ctx.fillStyle = '#6e4a2a';
      ctx.beginPath(); ctx.ellipse(0, 0, 18, 10, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#4a3019'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-8, 8); ctx.lineTo(-12, 18); ctx.moveTo(6, 8); ctx.lineTo(10, 18); ctx.stroke();
      ctx.beginPath(); ctx.arc(18, 3, 6, 0, TAU); ctx.fillStyle = '#6e4a2a'; ctx.fill();
    } else {
      const bob = Math.sin(d.bob) * 1.2;
      if (d.legend) ctx.scale(1.4, 1.4); else if (d.size) ctx.scale(d.size, d.size);
      if (d.state === 'flee') { const lp = Math.abs(Math.sin(d.bob)); ctx.translate(0, -lp * 3); ctx.scale(1 + lp * 0.15, 1 - lp * 0.08); }
      drawShadow(18, 9);
      ctx.fillStyle = d.legend ? '#7d5227' : (d.coat || '#9a6a3a');
      ctx.beginPath(); ctx.ellipse(0, bob * 0.3, 18, 9, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#f1e6d6';
      ctx.beginPath(); ctx.arc(-17, 0, 4, 0, TAU); ctx.fill(); // tail
      ctx.fillStyle = '#a8763f';
      const hx = d.state === 'graze' ? 22 + Math.sin(d.bob * 0.7) * 1.5 : 20;
      ctx.beginPath(); ctx.ellipse(hx, 0, 7, 5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#7d5530';
      ctx.beginPath(); ctx.ellipse(hx - 3, -6, 3, 2, -0.5, 0, TAU); ctx.ellipse(hx - 3, 6, 3, 2, 0.5, 0, TAU); ctx.fill();
      if (d.buck) {
        ctx.strokeStyle = d.legend ? '#ffd166' : '#e8dcc0'; ctx.lineWidth = 2;
        ctx.beginPath();
        const tines = Math.max(2, Math.floor((d.points || 8) / 2) - 1);
        for (const sg of [-1, 1]) {
          ctx.moveTo(hx, 3 * sg); ctx.quadraticCurveTo(hx - 8, 16 * sg, hx + 2, 18 * sg); // main beam
          for (let i = 0; i < tines; i++) { const t = 0.3 + i * 0.6 / tines; const bx = lerp(hx - 3, hx, t), by = lerp(8, 17, t) * sg; ctx.moveTo(bx, by); ctx.lineTo(bx + 5, by + 4 * sg); }
        }
        ctx.stroke();
      }
    }
    ctx.restore();
    if (d.fawn && inView(d.fawn.x, d.fawn.y, 30)) {
      const f = d.fawn;
      ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.ang || d.ang);
      ctx.globalAlpha = f.gone ? Math.max(0, 1 - f.gone / 3) : 1;
      drawShadow(11, 6);
      ctx.fillStyle = '#b07a46'; ctx.beginPath(); ctx.ellipse(0, 0, 11, 6, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#f1e6d6'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(-5 + i * 3.5, i % 2 ? 2 : -2, 1.2, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#c08a52'; ctx.beginPath(); ctx.ellipse(12, 0, 4.5, 3.5, 0, 0, TAU); ctx.fill();
      ctx.restore(); ctx.globalAlpha = 1;
    }
    if (d.legend && !d.dead) {
      ctx.fillStyle = '#ffd166'; ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('OLD HOSTA', d.x, d.y - 30);
    }
    if (d.albino && !d.dead) { ctx.fillStyle = '#f1ece2'; ctx.font = 'bold 10px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('ALBINO', d.x, d.y - 30); }
    if (!d.dead && d.alertT > 0.05) { ctx.fillStyle = '#ffe9a8'; ctx.font = 'bold 15px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('?', d.x, d.y - 22); }
  }
}

function drawArrows() {
  ctx.strokeStyle = '#e9e2cf';
  ctx.lineWidth = 2;
  for (const a of arrows) {
    if (!inView(a.x, a.y, 40)) continue;
    const c = Math.cos(a.ang), s = Math.sin(a.ang);
    ctx.globalAlpha = a.flying ? 1 : clamp(a.t / 2, 0, 1);
    ctx.beginPath(); ctx.moveTo(a.x - c * 18, a.y - s * 18); ctx.lineTo(a.x, a.y); ctx.stroke();
    ctx.fillStyle = '#ff7b3a';
    ctx.fillRect(a.x - c * 18 - 2, a.y - s * 18 - 2, 4, 4);
  }
  ctx.globalAlpha = 1;
}

function drawPlayer(now, ghost) {
  if (!player) return;
  ctx.save();
  ctx.translate(player.x, player.y);
  if (ghost) ctx.globalAlpha = 0.45;
  const sc = player.crouch ? 0.85 : 1;
  ctx.scale(sc, sc);
  ctx.rotate(player.ang);
  drawShadow(13, 10);
  drawLegs(player.step, player.moving, '#3b3b2a');
  // body (blaze-orange vest, or ghillie suit once bought)
  const ghillie = has('ghillie');
  drawArms(player.step, player.moving, ghillie ? '#3a4a22' : '#4d5a33');
  inkBlob(0, 0, 11, 14, ghillie ? '#4a5a2c' : settings.gothVest && gothBinderDone() ? '#1b1320' : '#ff7a1a', 4);
  ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.beginPath(); ctx.ellipse(-3, -5, 4, 6, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = ghillie ? '#2f3d1c' : '#4d5a33';
  ctx.beginPath(); ctx.ellipse(-2, 0, 5, 9, 0, 0, TAU); ctx.fill();
  if (ghillie) {
    ctx.fillStyle = '#6b7a3a';
    for (let i = 0; i < 6; i++) ctx.fillRect(Math.cos(i * 1.1) * 9 - 2, Math.sin(i * 1.1) * 11 - 1, 4, 3);
  }
  // head with camo cap
  inkBlob(3, 0, 7, 7, '#e0b48c', 9);
  ctx.fillStyle = '#56603a';
  ctx.beginPath(); ctx.arc(2, 0, 6, Math.PI * 0.5, Math.PI * 1.5); ctx.fill();
  ctx.fillRect(4, -3, 7, 6);
  // weapon (shape depends on what's equipped)
  if (player.cooler) {
    ctx.fillStyle = '#e8eef2'; ctx.fillRect(10, -9, 14, 18);
    ctx.fillStyle = '#3a7bd5'; ctx.fillRect(10, -9, 14, 4);
  } else if (!player.carry) {
    const draw = player.drawing ? 1 + player.draw * 1.6 : 0;
    const wid = campaign.weapon;
    if (wid === 'crossbow') {
      ctx.fillStyle = '#3a2716'; ctx.fillRect(8, -2, 18, 4);
      ctx.strokeStyle = '#555'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(26, 0, 11, Math.PI * 0.55, Math.PI * 1.45); ctx.stroke();
      ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(26 + Math.cos(Math.PI * 0.55) * 11, Math.sin(Math.PI * 0.55) * 11); ctx.lineTo(22 - draw * 3, 0); ctx.lineTo(26 + Math.cos(Math.PI * 1.45) * 11, Math.sin(Math.PI * 1.45) * 11); ctx.stroke();
    } else {
      const r = wid === 'longbow' ? 19 : 14;
      ctx.strokeStyle = wid === 'longbow' ? '#8a5a2b' : wid === 'carbon' ? '#222' : wid === 'recurve' ? '#5a3d22' : '#3a2716';
      ctx.lineWidth = wid === 'longbow' ? 3.5 : 3;
      ctx.beginPath(); ctx.arc(14, 0, r, -1.1, 1.1); ctx.stroke();
      ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(14 + Math.cos(-1.1) * r, Math.sin(-1.1) * r); ctx.lineTo(14 - 6 * draw, 0); ctx.lineTo(14 + Math.cos(1.1) * r, Math.sin(1.1) * r); ctx.stroke();
    }
  }
  ctx.restore();
  if (!ghost && G && G.stink > 0) { ctx.strokeStyle = 'rgba(168,216,107,0.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(player.x, player.y, 22 + Math.sin(now / 200) * 3, 0, TAU); ctx.stroke(); }
  if (!ghost && state === 'play' && !player.carry) {
    // aim line grows with the draw
    const len = player.drawing ? 120 + player.draw * 380 : 160;
    ctx.strokeStyle = player.drawing ? `rgba(255,${player.draw >= 1 ? 220 : 255},${player.draw >= 1 ? 120 : 255},${0.12 + player.draw * 0.25})` : 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(player.x, player.y);
    ctx.lineTo(player.x + Math.cos(player.ang + aimSway()) * len, player.y + Math.sin(player.ang + aimSway()) * len); ctx.stroke();
    if (player.drawing) {
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(player.x, player.y, 24, 0, TAU); ctx.stroke();
      ctx.strokeStyle = player.draw >= weapon().killAt ? '#9be564' : player.draw >= 0.35 ? '#ffd166' : '#ff6b6b';
      ctx.beginPath(); ctx.arc(player.x, player.y, 24, -Math.PI / 2, -Math.PI / 2 + TAU * player.draw); ctx.stroke();
      const ta = -Math.PI / 2 + TAU * weapon().killAt;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      // how far the arrow flies at this draw
      const rr = lerp(420, weapon().speed, 0.25 + 0.75 * player.draw) * 0.72;
      ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 1; ctx.setLineDash([4, 8]);
      ctx.beginPath(); ctx.arc(player.x, player.y, rr, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(player.x + Math.cos(ta) * 19, player.y + Math.sin(ta) * 19); ctx.lineTo(player.x + Math.cos(ta) * 29, player.y + Math.sin(ta) * 29); ctx.stroke();
    }
  }
}

function drawInflatable(b) {
  const wob = Math.sin(performance.now() / 600 + b.seed) * 0.06;
  ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(wob);
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(6, 8, b.r * 0.9, b.r * 0.7, 0, 0, TAU); ctx.fill();
  if (b.santa === 'santa') {
    ctx.fillStyle = '#c8262c'; ctx.beginPath(); ctx.arc(0, 4, b.r * 0.85, 0, TAU); ctx.fill();
    ctx.fillStyle = '#222'; ctx.fillRect(-b.r * 0.85, 2, b.r * 1.7, 5);
    ctx.fillStyle = '#e0b83a'; ctx.fillRect(-4, 1, 8, 7);
    ctx.fillStyle = '#f1d2b0'; ctx.beginPath(); ctx.arc(0, -b.r * 0.55, b.r * 0.4, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -b.r * 0.38, b.r * 0.32, 0, Math.PI); ctx.fill();
    ctx.fillStyle = '#c8262c'; ctx.beginPath(); ctx.moveTo(-b.r * 0.4, -b.r * 0.7); ctx.lineTo(b.r * 0.4, -b.r * 0.7); ctx.lineTo(b.r * 0.15, -b.r * 1.2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.r * 0.15, -b.r * 1.2, 4, 0, TAU); ctx.fill();
  } else {
    ctx.fillStyle = '#eef3f7'; ctx.beginPath(); ctx.arc(0, 6, b.r * 0.8, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -b.r * 0.55, b.r * 0.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#222'; ctx.fillRect(-b.r * 0.4, -b.r * 1.15, b.r * 0.8, 6); ctx.fillRect(-b.r * 0.25, -b.r * 1.45, b.r * 0.5, b.r * 0.32);
    ctx.fillStyle = '#ff7a1a'; ctx.beginPath(); ctx.moveTo(0, -b.r * 0.55); ctx.lineTo(10, -b.r * 0.5); ctx.lineTo(0, -b.r * 0.45); ctx.fill();
  }
  ctx.restore();
}
function drawHolidayLights(h) {
  const cols = ['#ff4040', '#40d060', '#4080ff', '#ffd040'];
  const t = Math.floor(performance.now() / 500);
  let i = 0;
  const dot = (x, y) => { ctx.fillStyle = cols[(i + t) % 4]; ctx.globalAlpha = settings.flashes ? 1 : 0.85; ctx.fillRect(x - 2, y - 2, 4, 4); i++; };
  for (let x = h.x + 6; x < h.x + h.w; x += 16) { dot(x, h.y + 3); dot(x, h.y + h.h - 3); }
  for (let y = h.y + 14; y < h.y + h.h - 8; y += 16) { dot(h.x + 3, y); dot(h.x + h.w - 3, y); }
  ctx.globalAlpha = 1;
}
function drawBushes() {
  for (const b of world.bushes) {
    if (!inView(b.x, b.y, 60)) continue;
    const near = player && player.hidden && dist(b.x, b.y, player.x, player.y) < b.r;
    ctx.globalAlpha = near ? 0.7 : 1;
    if (b.santa) { drawInflatable(b); ctx.globalAlpha = 1; continue; }
    ctx.fillStyle = '#244d24';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2f6230';
    for (let i = 0; i < 5; i++) {
      const a = b.seed + i * 1.3;
      ctx.beginPath(); ctx.arc(b.x + Math.cos(a) * b.r * 0.45, b.y + Math.sin(a) * b.r * 0.45, b.r * 0.45, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

function drawTrees() {
  for (const t of world.trees) {
    if (!inView(t.x, t.y, 60)) continue;
    const nearP = player && dist(t.x, t.y, player.x, player.y) < t.canopy + 6;
    ctx.globalAlpha = nearP ? 0.45 : 0.95;
    ctx.fillStyle = t.hue > 0.5 ? '#17351c' : '#1c3d1a';
    ctx.beginPath(); ctx.arc(t.x, t.y, t.canopy, 0, TAU); ctx.fill();
    ctx.fillStyle = t.hue > 0.5 ? '#21482a' : '#285024';
    ctx.beginPath(); ctx.arc(t.x - t.canopy * 0.25, t.y - t.canopy * 0.25, t.canopy * 0.6, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = clamp(p.t * 2, 0, 1);
    ctx.fillStyle = p.c;
    ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
  }
  ctx.globalAlpha = 1;
}

function glow(c, x, y, r, a) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(0,0,0,${a})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g;
  c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
}

function drawLighting(now) {
  const p = state === 'title' ? 0 : progress();
  const a = clamp(lerp(0.74, 0.12, Math.pow(p, 1.4)) + (G ? moonFx().dark : 0), 0.05, 0.86) * (G && G.nvgOn ? 0.3 : 1);
  const r = Math.round(lerp(6, 70, p)), g = Math.round(lerp(10, 45, p)), b = Math.round(lerp(32, 50, p));
  lctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  lctx.globalCompositeOperation = 'source-over';
  lctx.clearRect(0, 0, VW, VH);
  lctx.fillStyle = `rgba(${r},${g},${b},${a})`;
  lctx.fillRect(0, 0, VW, VH);
  lctx.globalCompositeOperation = 'destination-out';
  lctx.setTransform(DPR, 0, 0, DPR, (-cam.x + camOff.x) * DPR, (-cam.y + camOff.y) * DPR);
  for (const l of world.lights) if (inView(l.x, l.y, 200)) glow(lctx, l.x, l.y, 165, 0.85);
  for (const f of world.floods) if (f.on > 0 && inView(f.x, f.y, 260)) glow(lctx, f.x, f.y + (f.house.top ? 60 : -60), 240, Math.min(1, f.on) * 0.95);
  for (const h of world.houses) {
    if (!inView(h.x + h.w / 2, h.y + h.h / 2, 300)) continue;
    for (let i = 0; i < 3; i++) if (h.lit[i]) glow(lctx, h.x + 43 + i * 70, h.top ? h.y - 10 : h.y + h.h + 10, 55, 0.55);
  }
  if (player) glow(lctx, player.x, player.y, 120, 0.55);
  if (tyler) glow(lctx, tyler.x, tyler.y, netClient() ? 120 : 80, netClient() ? 0.55 : 0.35);   // P2 can see around Tyler too
  if (G && G.goth) { const R = G.goth; if (R.raven) glow(lctx, R.raven.x, R.raven.y, 70, 0.45); if (R.concert) glow(lctx, R.concert.x, R.concert.y, 170, 0.6); }   // Raven's candle, the band's stage light
  if (G && G.pumpkins) for (const p of G.pumpkins) if (inView(p.x, p.y, 60)) glow(lctx, p.x, p.y, 46, 0.4);   // jack-o'-lanterns
  if (G && G.goth && G.goth.shinies) for (const s of G.goth.shinies) if (!s.got && inView(s.x, s.y, 40)) glow(lctx, s.x, s.y, 26, settings.flashes ? 0.5 + 0.25 * Math.sin(performance.now() / 160 + s.x) : 0.6);   // Edgar's shiny glints in the dark
  for (const w of watchers) {
    if (!w.poly || !inView(w.x, w.y, 500)) continue;
    const R = coneRange(w);
    const gr = lctx.createRadialGradient(w.x, w.y, 0, w.x, w.y, R);
    gr.addColorStop(0, 'rgba(0,0,0,0.95)');
    gr.addColorStop(0.75, 'rgba(0,0,0,0.6)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    lctx.fillStyle = gr;
    lctx.beginPath(); lctx.moveTo(w.x, w.y);
    for (const pt of w.poly) lctx.lineTo(pt.x, pt.y);
    lctx.closePath(); lctx.fill();
    if (w.type === 'cop') glow(lctx, w.x, w.y, 90, 0.7);
  }
  for (const w of watchers) if (w.type === 'drone' && !(w.down > 0) && inView(w.x, w.y, 200)) glow(lctx, w.x, w.y, w.range * weatherVis() * 1.2, 0.8);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(lightCv, 0, 0);
  if (G && G.weather === 'fog') {
    ctx.fillStyle = 'rgba(150,160,170,0.16)';
    ctx.fillRect(0, 0, cv.width, cv.height);
    // drifting fog banks
    ctx.setTransform(DPR, 0, 0, DPR, (-cam.x + camOff.x) * DPR, (-cam.y + camOff.y) * DPR);
    const tt = performance.now() / 1000;
    for (let i = 0; i < 9; i++) {
      const fx = ((i * 733 + tt * 18) % (W + 600)) - 300, fy = (i * 571) % H;
      if (!inView(fx, fy, 400)) continue;
      const gr = ctx.createRadialGradient(fx, fy, 0, fx, fy, 320);
      gr.addColorStop(0, 'rgba(190,200,210,0.22)'); gr.addColorStop(1, 'rgba(190,200,210,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(fx, fy, 320, 0, TAU); ctx.fill();
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  // police lights wash
  if (G && G.police && G.cops > 0) {
    for (const w of watchers) if (w.type === 'cop' && inView(w.x, w.y, 200)) {
      ctx.setTransform(DPR, 0, 0, DPR, (-cam.x + camOff.x) * DPR, (-cam.y + camOff.y) * DPR);
      const red = settings.flashes ? Math.floor(now / 250) % 2 === 0 : true;
      const gr = ctx.createRadialGradient(w.x, w.y, 0, w.x, w.y, 160);
      gr.addColorStop(0, red ? 'rgba(255,40,40,0.28)' : 'rgba(60,110,255,0.28)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(w.x, w.y, 160, 0, TAU); ctx.fill();
    }
  }
}

function drawCones() {
  for (const w of watchers) {
    if (!w.poly || !inView(w.x, w.y, 500)) continue;
    const col = settings.cbCones
      ? (w.seeing ? '255,140,0' : w.state === 'investigate' ? '200,120,255' : '110,190,255')
      : (w.seeing ? '255,80,80' : w.state === 'investigate' ? '255,190,80' : '255,235,140');
    ctx.fillStyle = `rgba(${col},${w.seeing ? 0.16 : 0.07})`;
    ctx.strokeStyle = `rgba(${col},${w.seeing ? 0.7 : 0.35})`;
    ctx.lineWidth = settings.cbCones && w.seeing ? 3 : 1.5;
    if (settings.cbCones && w.state === 'investigate' && !w.seeing) ctx.setLineDash([8, 6]);
    ctx.beginPath(); ctx.moveTo(w.x, w.y);
    for (const pt of w.poly) ctx.lineTo(pt.x, pt.y);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawLegs(phase, moving, color) {
  if (!moving) return;
  const s = Math.sin(phase) * 6;
  ctx.fillStyle = color || '#2a2a2a'; ctx.strokeStyle = INK; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.ellipse(s, -5, 5, 3, 0, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(-s, 5, 5, 3, 0, 0, TAU); ctx.fill(); ctx.stroke();
}

function drawShadow(rx, ry) { ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(3, 4, rx, ry, 0, 0, TAU); ctx.fill(); }

// Hand-drawn look: a slightly wobbly blob with a dark ink outline.
const INK = 'rgba(22,16,12,0.85)';
function inkBlob(x, y, rx, ry, fill, seed) {
  const n = 14, k = seed || 1;
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const a = i / n * TAU, wob = 1 + Math.sin(i * 2.7 + k * 1.9) * 0.05;
    const px = x + Math.cos(a) * rx * wob, py = y + Math.sin(a) * ry * wob;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = fill; ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.stroke();
}
function drawArms(phase, moving, color) {
  const sw = moving ? Math.sin(phase) * 3.5 : 0;
  inkBlob(2 + sw, -11, 4, 3, color, 3);
  inkBlob(2 - sw, 11, 4, 3, color, 5);
}
function drawPerson(body, accent, phase, moving) {
  drawShadow(12, 9);
  drawLegs(phase, moving);
  drawArms(phase, moving, shade(body, -22));
  inkBlob(0, 0, 10, 13, body, 2);
  ctx.fillStyle = 'rgba(255,255,255,0.13)'; ctx.beginPath(); ctx.ellipse(-3, -4, 4, 6, 0, 0, TAU); ctx.fill();
  inkBlob(3, 0, 6.5, 6.5, '#e8c09a', 7);
  if (accent) accent();
}

function drawWatchers(now) {
  // cruisers left parked at the curb while their officer chases on foot
  for (const w of watchers) {
    if (w.type !== 'cop' || !w.parked || !inView(w.parked.x, w.parked.y, 80)) continue;
    const p = w.parked;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.ang);
    ctx.fillStyle = '#111'; roundRect(ctx, -24, -13, 48, 26, 5); ctx.fill();
    ctx.fillStyle = '#f4f4f4'; ctx.fillRect(-10, -13, 20, 26);
    const red = settings.flashes ? Math.floor(now / 250) % 2 === 0 : true;
    ctx.fillStyle = red ? '#ff3030' : '#4070ff'; ctx.fillRect(-4, -11, 6, 10);
    ctx.fillStyle = red ? '#4070ff' : '#ff3030'; ctx.fillRect(-4, 1, 6, 10);
    ctx.restore();
  }
  for (const w of watchers) {
    const moving = w.px !== undefined && dist(w.px, w.py, w.x, w.y) > 0.3;
    if (moving) w.phase = (w.phase || 0) + dist(w.px, w.py, w.x, w.y) * 0.25;
    w.px = w.x; w.py = w.y;
    if (!inView(w.x, w.y, 120)) continue;
    const ph = w.phase || 0;
    if (w.type === 'drone') {
      const R = w.range * weatherVis();
      if (!(w.down > 0)) {
        ctx.strokeStyle = w.seeing ? 'rgba(255,80,80,0.8)' : 'rgba(180,220,255,0.45)'; ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.arc(w.x, w.y, R, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = w.seeing ? 'rgba(255,80,80,0.12)' : 'rgba(180,220,255,0.06)'; ctx.beginPath(); ctx.arc(w.x, w.y, R, 0, TAU); ctx.fill();
      }
      ctx.save(); ctx.translate(w.x, w.y - (w.down > 0 ? 0 : 14)); ctx.rotate(w.down > 0 ? 0.6 : 0);
      ctx.strokeStyle = '#ddd'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(-10, -10); ctx.lineTo(10, 10); ctx.moveTo(10, -10); ctx.lineTo(-10, 10); ctx.stroke();
      ctx.fillStyle = '#333'; ctx.fillRect(-5, -5, 10, 10);
      ctx.fillStyle = w.down > 0 ? '#555' : (settings.flashes && Math.floor(now / 200) % 2 ? '#ff3030' : '#30ff60');
      ctx.fillRect(-2, -2, 4, 4);
      const spin = now / 30;
      ctx.strokeStyle = 'rgba(220,220,220,0.6)'; ctx.lineWidth = 1;
      for (const [px, py] of [[-10, -10], [10, -10], [-10, 10], [10, 10]]) {
        ctx.beginPath(); ctx.moveTo(px + Math.cos(spin) * 6, py + Math.sin(spin) * 6); ctx.lineTo(px - Math.cos(spin) * 6, py - Math.sin(spin) * 6); ctx.stroke();
      }
      ctx.restore();
      ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = '11px system-ui, sans-serif';
      ctx.fillText(w.down > 0 ? 'Gary\'s Drone (crashed)' : w.label, w.x, w.y + 22);
      if (w.seeing) { ctx.fillStyle = '#ff4d4d'; ctx.font = 'bold 22px system-ui, sans-serif'; ctx.fillText('!', w.x, w.y - 30); }
      continue;
    }
    if (w.type === 'k9') {
      ctx.save(); ctx.translate(w.x, w.y); ctx.rotate(w.ang);
      drawLegs(ph * 2, moving, '#2b2118');
      ctx.fillStyle = '#3b2a1a'; ctx.beginPath(); ctx.ellipse(0, 0, 14, 7, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#a97a44'; ctx.beginPath(); ctx.ellipse(-2, 0, 8, 5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#3b2a1a'; ctx.beginPath(); ctx.arc(14, 0, 6, 0, TAU); ctx.fill();
      ctx.fillStyle = '#1e3a8a'; ctx.fillRect(-6, -7, 8, 14); // police vest
      ctx.restore();
      ctx.textAlign = 'center'; ctx.fillStyle = '#9ecbff'; ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.fillText(w.eating > 0 ? '🌯 Sarge (eating)' : w.label, w.x, w.y + 24);
      continue;
    }
    if (w.type === 'window') {
      // Lit window with a face peeking out
      const awake = !(w.asleep > 0);
      ctx.fillStyle = awake ? '#ffe7a0' : '#28323d';
      ctx.fillRect(w.x - 16, w.y - 5, 32, 8);
      if (awake) { ctx.fillStyle = '#e8c09a'; ctx.beginPath(); ctx.arc(w.x, w.y, 6, 0, TAU); ctx.fill(); }
      ctx.textAlign = 'center';
      if (!awake) { ctx.fillStyle = '#9ecbff'; ctx.font = 'bold 13px system-ui, sans-serif'; ctx.fillText('Zzz', w.x + 12, w.y - 16 - Math.sin(now / 300) * 3); }
      else if (w.seeing) { ctx.fillStyle = '#ff4d4d'; ctx.font = 'bold 22px system-ui, sans-serif'; ctx.fillText('!', w.x, w.y - 18); }
      else if (w.look > 0) { ctx.fillStyle = '#ffd166'; ctx.font = 'bold 20px system-ui, sans-serif'; ctx.fillText('?', w.x, w.y - 18); }
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = '11px system-ui, sans-serif';
      ctx.fillText(w.label, w.x, w.y + (w.house.top ? -26 : 28));
      continue;
    }
    ctx.save();
    ctx.translate(w.x, w.y);
    ctx.rotate(w.ang);
    if (w.type === 'cam') {
      ctx.fillStyle = '#222'; ctx.fillRect(-5, -4, 10, 8); ctx.fillStyle = '#444'; ctx.beginPath(); ctx.arc(4, 0, 3, 0, TAU); ctx.fill();
      ctx.fillStyle = w.seeing ? '#ff3030' : (settings.flashes && Math.floor(now / 600) % 2 ? '#3f3' : '#161'); ctx.fillRect(-3, -2, 2, 2);
    } else if (w.type === 'chad') {
      drawPerson('#e05a2a', () => { ctx.fillStyle = '#d23'; ctx.fillRect(8, 2, 16, 5); ctx.fillStyle = '#333'; ctx.fillRect(4, -2, 6, 8); }, ph, moving);
      if (state === 'play' && Math.random() < 0.5) particles.push({ x: w.x + Math.cos(w.ang) * 26, y: w.y + Math.sin(w.ang) * 26, vx: Math.cos(w.ang + rnd(-0.4, 0.4)) * 160, vy: Math.sin(w.ang + rnd(-0.4, 0.4)) * 160, t: 0.6, c: pick(['#a0522d', '#c8741a', '#8a6a2a']) });
    } else if (w.type === 'jogger') {
      drawPerson('#ff4fa3', () => { ctx.fillStyle = '#7cf'; ctx.fillRect(1, -8, 3, 16); }, ph, moving);
    } else if (w.type === 'paper') {
      ctx.strokeStyle = '#999'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(-12, 0, 6, 0, TAU); ctx.arc(14, 0, 6, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#c0392b'; ctx.fillRect(-12, -2, 26, 4);
      drawPerson('#3a6fd8', () => { ctx.fillStyle = '#eee'; ctx.fillRect(-12, 8, 10, 6); });
    } else if (w.type === 'cop' && w.parked) {
      // officer on foot with a flashlight
      drawPerson('#1e3a8a', () => { ctx.fillStyle = '#ffeaa0'; ctx.fillRect(10, 4, 6, 3); ctx.fillStyle = '#ffd166'; ctx.fillRect(-2, -9, 4, 3); }, ph, moving);
    } else if (w.type === 'cop') {
      ctx.fillStyle = '#111'; roundRect(ctx, -24, -13, 48, 26, 5); ctx.fill();
      ctx.fillStyle = '#f4f4f4'; ctx.fillRect(-10, -13, 20, 26);
      ctx.fillStyle = '#8fb3c9'; ctx.fillRect(8, -10, 7, 20);
      const red = settings.flashes ? Math.floor(now / 250) % 2 === 0 : true;
      ctx.fillStyle = red ? '#ff3030' : '#4070ff'; ctx.fillRect(-4, -11, 6, 10);
      ctx.fillStyle = red ? '#4070ff' : '#ff3030'; ctx.fillRect(-4, 1, 6, 10);
    } else if (w.cart) {
      ctx.fillStyle = '#f2f2ea'; roundRect(ctx, -18, -12, 36, 24, 4); ctx.fill();
      ctx.fillStyle = '#2f6e4f'; ctx.fillRect(-14, -10, 14, 20);
      ctx.fillStyle = '#e8c09a'; ctx.beginPath(); ctx.arc(4, -4, 5, 0, TAU); ctx.fill();
      ctx.fillStyle = '#c9a227'; ctx.beginPath(); ctx.arc(3, -4, 5.5, Math.PI * 0.5, Math.PI * 1.5); ctx.fill();
    } else if (w.type === 'ex') {
      drawPerson('#8a4fbf', () => {
        ctx.fillStyle = '#ff9ad5';
        for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(0 + (i % 2) * 4, -4 + i * 2.6, 2.2, 0, TAU); ctx.fill(); }
        ctx.fillStyle = '#d9d9d9'; ctx.fillRect(10, 5, 5, 3); // phone
      }, ph, moving);
    } else if (w.type === 'treasurer') {
      drawPerson('#2b6cb0', () => { ctx.fillStyle = '#f3efe2'; ctx.fillRect(8, 6, 8, 10); }, ph, moving);
    } else {
      drawPerson('#3f8a3a', () => { ctx.fillStyle = '#d6ff3a'; ctx.fillRect(-9, -3, 4, 6); }, ph, moving);
    }
    // flashlight
    if (w.type !== 'cop' && w.type !== 'jogger' && w.type !== 'paper') { ctx.fillStyle = '#ffeaa0'; ctx.fillRect(10, 4, 6, 3); }
    ctx.restore();
    // icon
    ctx.textAlign = 'center';
    if (w.eating > 0) { ctx.fillStyle = '#ffd166'; ctx.font = 'bold 16px system-ui, sans-serif'; ctx.fillText('🌯 nom nom', w.x, w.y - 24); }
    else if (w.seeing) { ctx.fillStyle = '#ff4d4d'; ctx.font = 'bold 22px system-ui, sans-serif'; ctx.fillText('!', w.x, w.y - 22); }
    else if (w.state === 'investigate' || w.look > 0) { ctx.fillStyle = '#ffd166'; ctx.font = 'bold 20px system-ui, sans-serif'; ctx.fillText('?', w.x, w.y - 22); }
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.font = '11px system-ui, sans-serif';
    const ld = dist(w.x, w.y, player.x, player.y);
    if (ld < 420 || w.seeing || w.state === 'investigate') { ctx.globalAlpha = w.seeing ? 1 : clamp((420 - ld) / 150, 0.25, 1); ctx.fillText(w.label, w.x, w.y + 30); ctx.globalAlpha = 1; }
  }
}

function drawPopups() {
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  // lay out first: skip off-screen ones, keep long ones on screen, and stack overlapping bubbles upward
  const boxes = [];
  for (const p of popups) {
    if (!inView(p.x, p.y, 300)) { p.dy = 0; continue; }
    const w = Math.min(ctx.measureText(p.text).width + 16, VW - 24);
    const px = clamp(p.x, cam.x + w / 2 + 6, cam.x + VW - w / 2 - 6);
    let y = p.y;
    for (let k = 0; k < 6; k++) {
      const hit = boxes.find(b => Math.abs(b.x - px) < (b.w + w) / 2 && Math.abs(b.y - y) < 30);
      if (!hit) break;
      y = hit.y - 31;
    }
    boxes.push({ x: px, y, w, p });
  }
  for (const b of boxes) {
    const w = b.w, p = Object.assign({}, b.p, { x: b.x, y: b.y, text: w >= VW - 24 ? fitText(b.p.text, VW - 40) : b.p.text });
    const a = clamp(p.t / 0.5, 0, 1);
    const age = (p.life || 2.6) - p.t, sc = age < 0.12 ? 0.6 + age / 0.12 * 0.4 : 1;
    ctx.globalAlpha = a;
    ctx.save(); ctx.translate(p.x, p.y - 6); ctx.scale(sc, sc); ctx.translate(-p.x, -(p.y - 6));
    ctx.fillStyle = 'rgba(15,18,24,0.85)';
    roundRect(ctx, p.x - w / 2, p.y - 18, w, 24, 8); ctx.fill();
    ctx.beginPath(); ctx.moveTo(p.x - 5, p.y + 6); ctx.lineTo(p.x + 5, p.y + 6); ctx.lineTo(p.x, p.y + 12); ctx.closePath(); ctx.fill();
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, p.x, p.y - 1);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function clockText() {
  const mins = 285 + progress() * 90; // 4:45 AM -> 6:15 AM sunrise
  const h = Math.floor(mins / 60), m = Math.floor(mins % 60);
  return `${h}:${String(m).padStart(2, '0')} AM`;
}

function panel(x, y, w, h) {
  ctx.fillStyle = 'rgba(12,15,20,0.92)';
  roundRect(ctx, x, y, w, h, 10); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1; ctx.stroke();
}

function drawHUD(now) {
  ctx.textAlign = 'left';
  panel(14, 14, 250, 196);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText(`${campaign.halloween ? '🎃 HALLOWEEN' : 'NIGHT ' + night}  ·  ${clockText()}`, 28, 38);
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillStyle = G.delivered >= G.quota ? '#9be564' : '#e8e8e8';
  ctx.fillText(`Quota: ${G.delivered} / ${G.quota} deer${G.bucks ? `  (${G.bucks} buck${G.bucks > 1 ? 's' : ''})` : ''}`, 28, 60);
  ctx.fillStyle = '#e8e8e8';
  ctx.fillText(`Score: ${campaign.score + G.nightScore}   ·   Cash: $${campaign.cash + G.earned}`, 28, 80);
  ctx.fillStyle = player.arrows > 2 ? '#e8e8e8' : (Math.floor(performance.now() / 300) % 2 ? '#ff6b6b' : '#ffd166');
  ctx.fillText(`Arrows: ${player.arrows}`, 28, 100);
  ctx.fillStyle = player.cones > 0 ? '#e8e8e8' : '#888';
  ctx.fillText(`Pinecones: ${player.cones}`, 118, 100);
  ctx.fillStyle = '#ccc';
  const extras = [`Notices ${G.noticesGot}/3`, G.gruntCD > 0 ? `Grunt ${Math.ceil(G.gruntCD)}s` : 'Grunt (G)'];
  if (campaign.items.burrito) extras.push(`🌯×${campaign.items.burrito}`);
  if (campaign.items.beer) extras.push(`🍺×${campaign.items.beer} (V)`);
  if (player.cans) extras.push(`🥫×${player.cans}`);
  if (has('corn')) extras.push(`Corn ${G.cornLeft}`);
  if (G.tags) extras.push(`Tags B${G.tags.buck}${G.tags.buck ? '' : ' (NONE!)'} D${G.tags.doe}${G.tags.doe ? '' : ' (NONE!)'}`);
  if (campaign.versus) { const pw = watchers.find(q => q.p2); if (pw) extras.push(pw.spotCD > 0 ? `P2 spot ${Math.ceil(pw.spotCD)}s` : 'P2 spot ready'); }
  if (tyler) extras.push(tyler.carry ? 'Tyler: hauling' : 'Tyler: ready');
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(fitText(extras.join('  ·  '), 226), 28, 120);
  ctx.fillStyle = '#9ecbff';
  const meat = [`Freezer ${G.freezer}`];
  if (player.bag) meat.push(`Bag ${player.bag}`);
  if (player.cooler) meat.push(`Cooler ${player.cooler}`);
  meat.push(`Steve pays $${G.price}${G.priceTrend > 0 ? '▲' : G.priceTrend < 0 ? '▼' : ''}`);
  ctx.fillText(fitText('🥩 ' + meat.join(' · '), 226), 28, 138);
  ctx.fillStyle = '#888';
  ctx.fillText(fitText(`🏹 ${WEAPONS[campaign.weapon].name}`, 226), 28, 156);
  // wind arrow (points where your scent blows)
  ctx.save(); ctx.translate(238, 34); ctx.rotate(G.wind);
  ctx.strokeStyle = '#9ecbff'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(9, 0); ctx.lineTo(4, -4); ctx.moveTo(9, 0); ctx.lineTo(4, 4); ctx.stroke();
  ctx.restore();
  ctx.fillStyle = '#9ecbff'; ctx.font = '9px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('WIND', 238, 54); ctx.textAlign = 'left';
  ctx.font = '13px system-ui, sans-serif';
  ctx.translate(0, 76);
  const tags = [];
  if (G.buzz > 0) tags.push([`BUZZED ${Math.ceil(G.buzz)}s`, '#ffd166']);
  if (G.stink > 0) tags.push(['SKUNKED', '#a8d86b']);
  if (G.soaked > 0) tags.push(['SOAKED', '#6fb7ff']);
  if (G.nvgOn) tags.push([`NVG ${Math.ceil(G.nvg)}s`, '#9be564']);
  if (player.shadow && !player.lit && !player.hidden) tags.push(['IN SHADOW', '#8a8fc9']);
  if (player.cooler) tags.push(['COOLER', '#9ecbff']);
  if (player.carry) tags.push(['DRAGGING', '#ffd166']);
  if (player.hidden) tags.push(['HIDDEN', '#9be564']);
  if (player.crouch) tags.push(['SNEAKING', '#9ecbff']);
  if (player.lit) tags.push(['UNDER LIGHT', '#ff9f6b']);
  let tx = 28;
  ctx.font = 'bold 11px system-ui, sans-serif';
  const urgent = ['UNDER LIGHT', 'HIDDEN', 'DRAGGING'];
  tags.sort((a, b) => (urgent.includes(b[0]) ? 1 : 0) - (urgent.includes(a[0]) ? 1 : 0));
  for (const [t, c] of tags.slice(0, 3)) {
    const w = ctx.measureText(t).width + 12;
    ctx.fillStyle = c; roundRect(ctx, tx, 94, w, 20, 5); ctx.fill();
    ctx.fillStyle = '#111'; ctx.fillText(t, tx + 6, 108);
    tx += w + 6;
  }
  // sunrise bar
  const sp = progress();
  ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fillRect(28, 122, 222, 4);
  ctx.fillStyle = '#ffb347'; ctx.fillRect(28, 122, 222 * sp, 4);
  ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(sp > 0.9 ? '☀' : '🌙', 28 + 222 * sp, 119); ctx.textAlign = 'left';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  // suspicion bar
  const compact = VW < 760;
  let bw = compact ? VW - 52 : Math.min(380, VW - 320), bx = compact ? 26 : (VW - bw) / 2;
  const by = compact ? 222 : 16;
  // centred, unless that would run under the HUD panel (ends at x 264) or the minimap: then it fits between them
  if (!compact && bx < 284) { bx = 284; bw = Math.min(bw, minimapBox().x - 20 - bx); }
  // story objective
  const o = G.objective;
  if (o) {
    ctx.font = 'bold 12px system-ui, sans-serif'; ctx.textAlign = 'left';
    const txt = fitText(`${o.done ? '✔' : '★ Optional:'} ${o.text}${o.need > 1 && !o.done ? ` (${o.count}/${o.need})` : ''}`, compact ? VW - 40 : 360);
    const oy = compact ? by + (G.police ? 82 : 58) : 220;
    const ow = ctx.measureText(txt).width + 20;
    panel(14, oy, ow, 26);
    ctx.fillStyle = o.done ? '#9be564' : '#7cf'; ctx.fillText(txt, 24, oy + 17);
  }
  const bcx = bx + bw / 2;
  panel(bx - 12, by - 4, bw + 24, G.police ? 74 : 50);
  ctx.textAlign = 'center';
  if (!G.police) {
    ctx.fillStyle = '#ddd'; ctx.font = 'bold 12px system-ui, sans-serif';
    const seers = watchers.filter(w => w.seeing);
    const head = seers.length ? `👁 SEEN BY ${String(seers[0].label || NAMES[seers[0].type] || seers[0].type).toUpperCase()}${seers.length > 1 ? ' +' + (seers.length - 1) : ''}`
      : G.sus > 0.5 ? (G.unseen < 1.5 ? 'OUT OF SIGHT…' : 'COOLING OFF ↓') : 'NEIGHBORHOOD SUSPICION';
    if (seers.length) ctx.fillStyle = '#ff9f6b'; else if (G.sus > 0.5) ctx.fillStyle = G.unseen < 1.5 ? '#ffd166' : '#9be564';
    ctx.fillText(fitText(head, bw), bcx, by + 12);
    ctx.fillStyle = 'rgba(255,255,255,0.1)'; roundRect(ctx, bx, by + 20, bw, 14, 7); ctx.fill();
    const s = G.sus / 100;
    ctx.fillStyle = s < 0.5 ? '#9be564' : s < 0.8 ? '#ffd166' : '#ff5a5a';
    if (s > 0) { roundRect(ctx, bx, by + 20, Math.max(14, bw * s), 14, 7); ctx.fill(); }
  } else {
    const flash = settings.flashes ? Math.floor(now / 300) % 2 === 0 : true;
    ctx.fillStyle = flash ? '#ff5a5a' : '#6f9bff'; ctx.font = `bold ${compact ? 12 : 14}px system-ui, sans-serif`;
    ctx.fillText(fitText(G.policeT > 0 ? `🚨 911 CALLED — COPS IN ${Math.ceil(G.policeT)}s` : `🚨 POLICE ON SCENE — GET TO YOUR ${world.golf ? 'TRUCK' : 'SHED'}`, bw + 20), bcx, by + 14);   // fits with Large text too
    ctx.fillStyle = '#ddd'; ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillText('ARREST', bcx, by + 34);
    ctx.fillStyle = 'rgba(255,255,255,0.1)'; roundRect(ctx, bx, by + 42, bw, 12, 6); ctx.fill();
    if (G.arrest > 0) { ctx.fillStyle = '#ff5a5a'; roundRect(ctx, bx, by + 42, clamp(bw * G.arrest, 12, bw), 12, 6); ctx.fill(); }
  }
  // banner (wraps on narrow screens)
  if (G.banner) {
    ctx.globalAlpha = clamp(G.banner.t, 0, 1);
    ctx.font = `bold ${compact ? 15 : 18}px system-ui, sans-serif`;
    const maxW = VW - 60, words = G.banner.text.split(' '), lines = [];
    let line = '';
    for (const wd of words) { const t = line ? line + ' ' + wd : wd; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = wd; } else line = t; }
    lines.push(line);
    const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 30, lh = compact ? 20 : 24;
    const bh = 14 + lines.length * lh;
    const top = Math.max(8, Math.min(compact ? Math.max(VH * 0.36 - 24, 352) : Math.max(VH * 0.22 - 24, 256), VH - bh - 60));   // below the HUD panel, the objective chip and the minimap
    panel(VW / 2 - w / 2, top, w, bh);
    ctx.fillStyle = G.banner.color;
    lines.forEach((l, i) => ctx.fillText(l, VW / 2, top + 24 + i * lh));
    ctx.globalAlpha = 1;
  }
  // pointers: shed when dragging/police/quota met, Steve's van when carrying a cooler, objective spot
  if (player.cooler && !G.police) drawTruckPointer(world.van, 'STEVE', '#b5e86a');
  else if (player.carry || player.bag > 3 || G.police || G.delivered >= G.quota) drawTruckPointer(world.shed, 'SHED', '#ffd166');
  if (player.cooler && G.police) drawTruckPointer(world.shed, 'SHED', '#ffd166');
  if (player.arrows <= 0 && !player.carry) {
    let best = null, bd = 1e9;
    for (const a of arrows) if (!a.flying) { const dd = dist(a.x, a.y, player.x, player.y); if (dd < bd) { bd = dd; best = a; } }
    if (best) drawTruckPointer({ x: best.x, y: best.y, w: 0, h: 0 }, 'ARROW', '#ff9f6b');
  }
  const op = objectivePlace();
  if (op && !player.carry && !player.cooler && !G.police) drawTruckPointer({ x: op.x, y: op.y, w: 0, h: 0 }, 'GOAL', '#7cf');
  drawGothPointer();
  drawRavenSpeech(now);
  // tutorial hint
  if (G.hint) {
    ctx.globalAlpha = clamp(G.hint.t, 0, 1);
    ctx.font = '15px system-ui, sans-serif';
    const maxW = Math.min(620, VW - 60);
    const lines = [];
    let line = '';
    for (const w of G.hint.text.split(' ')) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
    }
    lines.push(line);
    const h = lines.length * 21 + 20, y = VH - 44 - h;
    panel(VW / 2 - maxW / 2 - 16, y, maxW + 32, h);
    ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 1.5; roundRect(ctx, VW / 2 - maxW / 2 - 16, y, maxW + 32, h, 10); ctx.stroke();
    ctx.fillStyle = '#fff2c4'; ctx.textAlign = 'center';
    lines.forEach((l, i) => ctx.fillText(l, VW / 2, y + 26 + i * 21));
    ctx.globalAlpha = 1;
  }
  // controls
  ctx.textAlign = 'left';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  if (!touchMode) {
    // as many controls as fit on one line; the pause screen lists them all
    const parts = pad.connected
      ? ['🎮 L-stick move', 'R-stick aim', 'hold RT to draw', 'LB sneak', 'A drag', 'B pinecone', 'X grunt', 'Y leave / decline call', 'Start pause']
      : ['WASD move', 'Shift sneak', 'hold click to draw, release to shoot', 'E use', 'F pinecone', 'X sprint', 'R look ahead', 'G grunt', 'V beer', 'N goggles', 'J jerky', 'Tab map', 'H photo', 'Q end night', 'P pause'];
    ctx.fillText(fitParts(parts, VW - 32 - (muted ? 60 : 0), ' · ', ' · P pause: all keys') + (muted ? '  (muted)' : ''), 16, VH - 14);
  }
}

function drawTruckPointer(t = world.shed, label = 'SHED', color = '#ffd166') {
  const tx = t.x + t.w / 2 - cam.x, ty = t.y + t.h / 2 - cam.y;
  if (tx > 0 && tx < VW && ty > 0 && ty < VH) return;
  const a = Math.atan2(ty - VH / 2, tx - VW / 2);
  // ride an ellipse near the screen edge, kept clear of the top HUD
  const px = clamp(VW / 2 + Math.cos(a) * (VW / 2 - 50), 40, VW - 40);
  let py = clamp(VH / 2 + Math.sin(a) * (VH / 2 - 50), VW < 760 ? 240 : 100, VH - 60);   // stay below the HUD panel (it's taller on phones)
  // desktop: never on top of the stats panel (top left) or the minimap (top right)
  if (VW >= 760 && ((px < 300 && py < 250) || (px > VW - 250 && py < 200))) py = px < 300 ? 250 : 200;
  // and never under the tutorial panel: drop just below it
  const tb = tutorialBox();
  if (tb && px > tb.x - 30 && px < tb.x + tb.w + 30 && py > tb.y - 20 && py < tb.y + tb.h + 20) py = Math.min(VH - 60, tb.y + tb.h + 28);
  ctx.save(); ctx.translate(px, py); ctx.rotate(a);
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-8, -10); ctx.lineTo(-8, 10); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.fillStyle = color; ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(label, px - Math.cos(a) * 26, py - Math.sin(a) * 26 + 4);
}

function drawMinimap(big) {
  const mw = big ? Math.min(VW - 40, (VH - 90) * W / H) : Math.max(70, Math.min(220, VW * 0.25, VW - 300)), s = mw / W, mh = H * s;
  const x0 = big ? (VW - mw) / 2 : VW - mw - 16, y0 = big ? (VH - mh) / 2 + 10 : 16;
  panel(x0 - 6, y0 - 6, mw + 12, mh + 12);
  ctx.save(); ctx.translate(x0, y0);
  ctx.fillStyle = '#1b2f1d'; ctx.fillRect(0, 0, mw, mh);
  for (const b of world.blocks) { ctx.fillStyle = '#365c2e'; ctx.fillRect(b.x * s, b.y * s, b.w * s, b.h * s); }
  ctx.fillStyle = '#555';
  for (const r of world.roads) ctx.fillRect(r.x * s, r.y * s, r.w * s, r.h * s);
  if (world.bulbs) for (const b of world.bulbs) { ctx.beginPath(); ctx.arc(b.x * s, b.y * s, b.r * s, 0, TAU); ctx.fill(); }
  for (const h of world.houses) { ctx.fillStyle = h.ex ? '#ff9ad5' : '#a89c8a'; ctx.fillRect(h.x * s, h.y * s, h.w * s, h.h * s); }
  const t = world.truck; ctx.fillStyle = '#ff5a3a'; ctx.fillRect(t.x * s - 2, t.y * s - 2, t.w * s + 4, t.h * s + 4);
  const v = world.van; ctx.fillStyle = '#b5e86a'; ctx.fillRect(v.x * s - 2, v.y * s - 2, v.w * s + 4, v.h * s + 4);
  for (const p of world.ponds) { ctx.fillStyle = '#2f6f86'; ctx.fillRect(p.x * s, p.y * s, p.w * s, p.h * s); }
  const op = objectivePlace();
  if (op) { ctx.strokeStyle = '#7cf'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(op.x * s, op.y * s, 5 + Math.sin(performance.now() / 200), 0, TAU); ctx.stroke(); }
  for (const d of deer) {
    if (d.dead && !d.carried) { ctx.fillStyle = '#c9a26b'; ctx.fillRect(d.x * s - 2, d.y * s - 2, 4, 4); }
    else if (!d.dead && has('trailcam')) { ctx.fillStyle = d.legend ? '#ffd166' : '#9be564'; ctx.fillRect(d.x * s - 1.5, d.y * s - 1.5, 3, 3); }
  }
  for (const a of arrows) if (!a.flying && a.t === Infinity) { ctx.fillStyle = '#fff'; ctx.fillRect(a.x * s - 1, a.y * s - 1, 2, 2); }
  for (const n of G.notices) if (!n.got) { ctx.fillStyle = '#ffe38a'; ctx.fillRect(n.x * s - 1.5, n.y * s - 1.5, 3, 3); }
  for (const w of watchers) {
    ctx.fillStyle = w.type === 'cop' ? (Math.floor(performance.now() / 250) % 2 ? '#ff3030' : '#4070ff') : w.type === 'ex' ? '#ff9ad5' : '#ffd166';
    ctx.beginPath(); ctx.arc(w.x * s, w.y * s, 3, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = '#ff7a1a';
  ctx.beginPath(); ctx.arc(player.x * s, player.y * s, 3.5, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.strokeRect(cam.x * s, cam.y * s, VW * s, VH * s);
  if (big) {
    ctx.font = 'bold 12px system-ui, sans-serif'; ctx.textAlign = 'center';
    const lab = (txt, x, y, c) => { const w = ctx.measureText(txt).width + 8; ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(x * s - w / 2, y * s - 22, w, 16); ctx.fillStyle = c; ctx.fillText(txt, x * s, y * s - 10); };
    lab('YOUR SHED', t.x + t.w / 2, t.y, '#ff5a3a');
    lab('STEVE', v.x + v.w / 2, v.y, '#b5e86a');
    for (const p of world.ponds) if (p.name) lab(p.name, p.x + p.w / 2, p.y, '#9ecbff');
    lab('CLUBHOUSE', world.clubhouse.x + world.clubhouse.w / 2, world.clubhouse.y + 10, '#ffd166');
    if (!world.golf) lab('DARLENE\'S', world.exHouse.x + world.exHouse.w / 2, world.exHouse.y, '#ff9ad5');
    if (world.clearing) lab('PHASE 2', world.clearing.x + world.clearing.w / 2, world.clearing.y + 24, '#e0b020');
    ctx.fillStyle = '#ccc'; ctx.fillText(touchMode ? 'MAP (tap MAP to close)' : pad.connected ? 'MAP (Back to close)' : 'MAP (Tab to close)', mw / 2, -12);
  }
  ctx.restore();
}

// The corner minimap's box on screen (see drawMinimap)
function minimapBox() {
  const mw = Math.max(70, Math.min(220, VW * 0.25, VW - 300)), mh = H * mw / W;
  return { x: VW - mw - 16, y: 16, w: mw, h: mh };
}
// Wide but short (a phone on its side): little room above and below Dale
function shortLandscape() { return VW >= 760 && VH < 500; }

function wrapLines(text, maxW) {
  const lines = [];
  let line = '';
  for (const w of text.split(' ')) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

// Pick the biggest font size (up to maxSize) that fits the text in maxW.
function fitFont(text, weight, maxSize, maxW) {
  let s = maxSize;
  do { ctx.font = `${weight} ${s}px system-ui, sans-serif`; s -= 2; } while (s > 12 && ctx.measureText(text).width > maxW);
}

function fitText(text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 3 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
  return t + '…';
}

// Joins as many parts as fit in maxW; if some are left out, ends with `more`.
function fitParts(parts, maxW, sep, more) {
  let out = parts[0];
  for (let i = 1; i < parts.length; i++) {
    const next = out + sep + parts[i];
    const rest = i < parts.length - 1 ? more : '';
    if (ctx.measureText(next + rest).width > maxW) return ctx.measureText(out + more).width <= maxW ? out + more : out;
    out = next;
  }
  return out;
}
function wrapText(text, x, y, maxW, lh) {
  const words = text.split(' ');
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, y); line = w; y += lh; }
    else line = test;
  }
  if (line) ctx.fillText(line, x, y);
  return y;
}

// Menu screens scroll when they are taller than the window (phones, landscape): wheel, drag, arrow keys.
let menuScroll = 0, menuMax = 0, menuBottom = 0, menuState = null, drawScroll = 0;
function scrollMenu(dy) { if (state !== 'play' && menuMax > 0) menuScroll = clamp(menuScroll + dy, 0, menuMax); }
function shareText() {
  const mode = campaign.daily ? 'Daily Hunt ' + campaign.daily : campaign.halloween ? 'Halloween night' : campaign.versus ? 'Versus' : campaign.coop ? 'Co-op'
    : campaign.map === 'golf' ? 'Country Club' : campaign.map === 'cul' ? 'Maple Court' : campaign.map === 'random' ? 'Random #' + campaign.mapSeed : campaign.map === 'custom' ? String(campaign.customSpec && campaign.customSpec.name || 'Custom map') : 'Night ' + night;
  const deerRow = G.delivered ? '🦌'.repeat(Math.min(10, G.delivered)) + (G.delivered > 10 ? '+' : '') : 'no deer';
  const stars = '★'.repeat(G.stars || 0) + '☆'.repeat(3 - (G.stars || 0));
  const how = G.endReason === 'arrested' ? ' 🚔 busted' : G.police ? ' 🚨 escaped the cops' : '';
  return `Curfew Buck · ${mode} · ${deerRow} ${stars} · ${campaign.score} pts${how}`;
}
function savePhoto() {
  const hint = photoHint; photoHint = false; render(performance.now()); photoHint = hint;   // a clean frame without the hint
  try { const a = document.createElement('a'); a.href = cv.toDataURL('image/png'); a.download = 'curfew-buck-photo.png'; a.click(); sfx.grab(); } catch (e) { /* blocked */ }
}
let photoHint = true;
function drawScreens(now) {
  uiButtons = [];
  if (state === 'play') { menuState = null; return; }
  if (state === 'photo') {
    if (photoHint) {
      ctx.fillStyle = 'rgba(10,14,20,0.7)'; roundRect(ctx, VW / 2 - 170, VH - 40, 340, 26, 8); ctx.fill();
      ctx.fillStyle = '#ddd'; ctx.font = 'bold 12px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('📷 PHOTO MODE  ·  Enter: save picture  ·  H or Esc: back', VW / 2, VH - 22);
    }
    return;
  }
  if (state !== menuState) { menuState = state; menuScroll = 0; }
  menuScroll = clamp(menuScroll, 0, menuMax);
  ctx.fillStyle = ['shop', 'nightdone', 'over', 'settings', 'trophies', 'credits', 'court', 'whoswho', 'nights', 'scores', 'keys', 'online', 'crypt', 'modes', 'players', 'extras'].includes(state) ? 'rgba(5,8,14,0.88)' : state === 'title' ? 'rgba(5,8,14,0.82)' : 'rgba(5,8,14,0.72)';
  ctx.fillRect(0, 0, VW, VH);
  menuBottom = 0; drawScroll = menuScroll;
  const realFill = ctx.fillText;
  ctx.fillText = function (t, x, y, m) { if (y > menuBottom) menuBottom = y; return realFill.call(this, t, x, y, m); };
  ctx.save(); ctx.translate(0, -menuScroll);
  try { drawScreenBody(now); } finally { ctx.restore(); delete ctx.fillText; drawScroll = 0; }
  const tNow = performance.now();
  if (menuBottom >= (drawScreens.hold || 0) || tNow - (drawScreens.holdAt || 0) > 1500 || drawScreens.holdState !== state) { drawScreens.hold = menuBottom; drawScreens.holdAt = tNow; drawScreens.holdState = state; }
  menuMax = Math.max(0, Math.ceil(Math.max(menuBottom, drawScreens.hold) + 28 - VH));
  if (menuMax > 0) {
    // scroll bar + hint
    const trackH = VH - 24, barH = Math.max(40, trackH * VH / (VH + menuMax)), barY = 12 + (trackH - barH) * (menuScroll / menuMax);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; roundRect(ctx, VW - 8, 12, 4, trackH, 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,209,102,0.8)'; roundRect(ctx, VW - 8, barY, 4, barH, 2); ctx.fill();
    if (menuScroll < menuMax - 4 && !(state === 'crypt' && cryptZoom !== null)) {   // not over the zoomed card's close hint
      ctx.fillStyle = 'rgba(5,8,14,0.85)'; roundRect(ctx, VW / 2 - 70, VH - 26, 140, 20, 10); ctx.fill();
      ctx.fillStyle = '#ffd166'; ctx.font = 'bold 12px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(touchMode ? '▼ swipe up for more' : '▼ scroll for more', VW / 2, VH - 12);
    }
  }
}
function drawScreenBody(now) {
  ctx.textAlign = 'center';
  const cx = VW / 2;
  const maxW = Math.min(620, VW - 48);
  if (state === 'title') {
    drawTitleArt(now);
    ctx.fillStyle = '#ff7a1a'; ctx.font = `900 ${Math.min(76, VW / 9)}px system-ui, sans-serif`;
    ctx.fillText('CURFEW BUCK', cx, VH * 0.28);
    ctx.fillStyle = '#666'; ctx.font = '12px system-ui, sans-serif'; ctx.fillText('v' + VERSION, cx, VH * 0.28 + 18);
    ctx.fillStyle = '#e8e8e8'; ctx.font = '18px system-ui, sans-serif';
    const tagEnd = wrapText('Fill the freezer. Sell the meat. Save Grandpa\'s woods. Do NOT let your ex see you.', cx, VH * 0.28 + 44, maxW, 24);
    ctx.font = '15px system-ui, sans-serif'; ctx.fillStyle = '#bbb';
    const lines = [
      'Sneak into Whispering Pines Estates before sunrise and bow-hunt the deer eating everyone\'s hostas.',
      'Drag each deer back to your shed (the one behind your ex-wife\'s house), then sell the meat to Sketchy Steve across town.',
      'If Suspicion fills, someone calls 911. Then it\'s a race back to the shed.',
    ];
    let y = Math.max(VH * 0.28 + 100, tagEnd + 40);   // never overlap a tagline that wrapped
    for (const l of lines) { y = wrapText(l, cx, y, maxW, 21) + 30; }
    ctx.fillStyle = '#ffd166'; ctx.font = 'bold 20px system-ui, sans-serif';
    const save = readSave();
    if (save) {
      y = buttonGrid([
        { label: save.court ? `Continue (court date, Night ${save.night})` : `Continue (Night ${save.night})`, fn: () => loadGame(), hi: true },
        { label: confirmNewAt && performance.now() - confirmNewAt < 3000 ? 'Click again: erase save?' : 'New season', fn: () => { if (confirmNewAt && performance.now() - confirmNewAt < 3000) { confirmNewAt = 0; newCampaign(); } else confirmNewAt = performance.now(); } },
      ], y - 8, 220, 42) - 10;
      ctx.fillStyle = '#e0b83a'; ctx.font = '13px system-ui, sans-serif';
      ctx.fillText(`Cabin fund $${save.campaign.cash || 0} / $${CABIN_GOAL}  ·  Freezer ${packsText(save.campaign.freezer || 0)}  ·  ${save.night > 5 ? 'Endless night ' + save.night : 'Night ' + save.night + ' of 5'}`, cx, y + 16); y += 26;
    } else {
      y = buttonGrid([{ label: '▶ Start the season', fn: () => newCampaign(), hi: true }], y - 4, 240, 44) - 10;
    }
    ctx.fillStyle = '#888'; ctx.font = '13px system-ui, sans-serif';
    const nAch = Object.keys(ACH).filter(k => achievements[k]).length;
    y = wrapText(`Best score: ${best}  ·  Achievements: ${nAch} / ${Object.keys(ACH).length}  ·  ${pad.connected ? '🎮 Gamepad connected (A to start)' : touchMode ? 'Touch controls on' : 'Keyboard + mouse, gamepad, or touch'}`, cx, y + 22, maxW, 18);
    buttonGrid([
      { label: '🗺 Play modes ▸', fn: () => { state = 'modes'; }, hi: true },
      { label: '👥 Two players ▸', fn: () => { state = 'players'; }, hi: true },
      { label: '🦇 Raven\'s Crypt', fn: () => { state = 'crypt'; } },
      { label: '🏅 Leaderboard', fn: () => { state = 'scores'; } },
      { label: '⚙ Settings', fn: () => { state = 'settings'; } },
      { label: '📜 Extras ▸', fn: () => { state = 'extras'; } },
    ], y + 18, 170, 38);
  } else if (state === 'intro') {
    ctx.fillStyle = '#ff7a1a';
    fitFont(campaign.map === 'random' ? 'RANDOM NEIGHBORHOOD #000000' : campaign.map === 'custom' ? String(campaign.customSpec.name).toUpperCase() : 'THE COUNTRY CLUB', 'bold', 40, VW - 24);
    ctx.fillText(campaign.map === 'golf' ? 'THE COUNTRY CLUB' : campaign.map === 'cul' ? 'MAPLE COURT' : campaign.map === 'random' ? `RANDOM NEIGHBORHOOD #${campaign.mapSeed}` : campaign.map === 'custom' ? String(campaign.customSpec.name).toUpperCase() : campaign.halloween ? '🎃 HALLOWEEN NIGHT' : campaign.daily ? `DAILY HUNT · ${campaign.daily}` : `NIGHT ${night}`, cx, VH * 0.26);
    ctx.fillStyle = '#e8e8e8'; ctx.font = '17px system-ui, sans-serif';
    let y = wrapText(campaign.map === 'golf' ? GOLF_INTRO : campaign.map === 'cul' ? CUL_INTRO : campaign.map === 'random' ? RANDOM_INTRO : campaign.halloween ? HALLOWEEN_INTRO : campaign.map === 'custom' ? (campaign.customSpec.intro || `A custom neighborhood${campaign.customSpec.author ? ' by ' + campaign.customSpec.author : ''}. Same HOA. Same ex-wife. Good luck.`) : introFor(night), cx, VH * 0.26 + 46, maxW, 24);
    ctx.fillStyle = '#9be564'; ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillText(`Quota: ${G.quota} deer before sunrise`, cx, y + 50);
    ctx.fillStyle = '#9ecbff'; ctx.font = '15px system-ui, sans-serif';
    ctx.fillText(WEATHER_TEXT[G.weather], cx, y + 78);
    ctx.fillStyle = '#c9d6ff'; ctx.font = '14px system-ui, sans-serif'; ctx.fillText(moonFx().label, cx, y + 98); y += 20;
    if (G.objective) {
      ctx.fillStyle = '#7cf'; ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillText(fitText(`★ Optional objective: ${G.objective.text}${G.objective.reward ? ` (+$${G.objective.reward})` : ''}`, maxW), cx, y + 102);
      y += 24;
    }
    if (night <= 5) {
      ctx.fillStyle = '#e0b83a'; ctx.font = '14px system-ui, sans-serif';
      ctx.fillText(fitText(`Cabin fund: $${campaign.cash} / $${CABIN_GOAL}  ·  Freezer: ${packsText(G.freezer)}  ·  Steve pays $${G.price}/pack tonight`, maxW), cx, y + 102);
      y += 24;
    }
    if (night === 1 && !oneNightMode()) {
      ctx.fillStyle = '#ffb3a7'; ctx.font = '14px system-ui, sans-serif';
      y = wrapText('Being seen fills Suspicion. Break line of sight behind houses, hedges and bushes to cool it off. If it fills, someone calls 911: get to your shed.', cx, y + 102, maxW, 19) - 78;
    }
    ctx.fillStyle = '#bbb'; ctx.font = '14px system-ui, sans-serif';
    y = wrapText(`Watching tonight: ${watchers.map(w => w.label).join(' · ')}`, cx, y + 104, maxW, 20);
    if (deer.some(d => d.legend)) {
      ctx.fillStyle = '#ffd166'; ctx.font = 'bold 15px system-ui, sans-serif';
      y = wrapText('Rumor at the bait shop: Old Hosta is in the woods tonight.', cx, y + 28, maxW, 20);   // y = its last line, however many it took
    }
    const gear = SHOP.filter(s => has(s.id)).map(s => s.name);
    if (gear.length) { ctx.fillStyle = '#9be564'; ctx.font = '13px system-ui, sans-serif'; ctx.fillText('Gear: ' + gear.join(' · '), cx, y + 26); y += 26; }
    ctx.fillStyle = '#ffd166'; ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillStyle = '#aaa'; ctx.font = 'italic 14px system-ui, sans-serif';
    y = wrapText('💡 Tip: ' + (G.tip || (G.tip = pick(TIPS))), cx, y + 46, maxW, 19);
    ctx.fillStyle = '#ffd166'; ctx.font = 'bold 18px system-ui, sans-serif';
    if (Math.floor(now / 600) % 2 === 0) ctx.fillText(touchMode ? 'Tap to begin' : 'Click to begin', cx, y + 40);
  } else if (state === 'pause') {
    ctx.fillStyle = '#fff'; ctx.font = 'bold 42px system-ui, sans-serif';
    ctx.fillText('PAUSED', cx, VH * 0.4);
    ctx.font = '16px system-ui, sans-serif'; ctx.fillStyle = '#bbb';
    ctx.fillText('Click or press P to resume', cx, VH * 0.4 + 36);
    // (the story objective is already on the HUD chip, so it isn't repeated here)
    const py = buttonGrid([
      { label: 'Resume', fn: () => { state = 'play'; }, hi: true },
      { label: 'Restart night (R)', fn: () => restartNight() },
      { label: `Sound: ${pct(settings.sfxVol)}`, fn: () => { settings.sfxVol = cycleVol(settings.sfxVol); saveSettings(); sfx.grab(); } },
      { label: `Music: ${pct(settings.musicVol)}`, fn: () => { settings.musicVol = cycleVol(settings.musicVol); settings.music = settings.musicVol > 0; saveSettings(); } },
      { label: `Hints: ${settings.hints ? 'On' : 'Off'}`, fn: () => setHints(!settings.hints) },
      { label: 'Quit to title', fn: () => { state = 'title'; } },
      ...(G.tut ? [{ label: pad.connected ? 'Skip tutorial (Y)' : 'Skip tutorial', fn: () => { skipTutorial(); state = 'play'; } }] : []),
    ], VH * 0.4 + 64, 180, 40);
    // every control, with your own key bindings
    const k = d => keyLabel(boundKey(d));
    const all = touchMode ? 'Left stick: move (push lightly to sneak) · Hold the right side: draw, let go: shoot · Buttons: use, pinecone, grunt, map, leave'
      : `${k('KeyW')}${k('KeyA')}${k('KeyS')}${k('KeyD')}: move · ${k('ShiftLeft')}: sneak · ${k('KeyX')}: sprint · hold click (or ${k('Space')}): draw, let go: shoot · ${k('KeyE')}: drag deer / fish / pack cooler / talk to Steve · ${k('KeyF')} or right-click: pinecone · ${k('KeyG')}: grunt call · ${k('KeyV')}: beer · ${k('KeyB')}: corn · ${k('KeyN')}: goggles · ${k('KeyJ')}: jerky for dogs · T: decline call · ${k('Tab')}: map · ${k('KeyR')}: look ahead · H: photo mode · ${k('KeyQ')}: end night at the shed · ${k('KeyP')}: pause`;
    ctx.fillStyle = '#9aa'; ctx.font = 'bold 12px system-ui, sans-serif'; ctx.fillText('CONTROLS', cx, py + 14);
    ctx.fillStyle = '#888'; ctx.font = '13px system-ui, sans-serif';
    wrapText(all, cx, py + 34, Math.min(640, VW - 30), 18);
  } else if (state === 'shop') {
    drawShop(now);
  } else if (state === 'story') {
    drawStory(now);
  } else if (state === 'steve') {
    drawSteve();
  } else if (state === 'court') {
    drawCourt();
  } else if (state === 'settings') {
    drawSettings();
  } else if (state === 'online') {
    drawOnline(now);
  } else if (state === 'modes' || state === 'players' || state === 'extras') {
    drawSubmenu(state);
  } else if (state === 'crypt') {
    drawCrypt();
  } else if (state === 'netwait') {
    drawNetWait(now);
  } else if (state === 'scores') {
    drawScores();
  } else if (state === 'keys') {
    drawKeys();
  } else if (state === 'trophies') {
    drawTrophies();
  } else if (state === 'credits') {
    drawCredits();
  } else if (state === 'whoswho') {
    drawWhosWho();
  } else if (state === 'nights') {
    ctx.fillStyle = '#ff7a1a'; ctx.font = '900 40px system-ui, sans-serif';
    ctx.fillText('NIGHT SELECT', cx, VH * 0.22);
    const reached = store.get('hs_reached', 1);
    ctx.fillStyle = '#bbb'; ctx.font = '14px system-ui, sans-serif';
    wrapText('Replay any night you\'ve reached. Later nights start with some cash for gear.', cx, VH * 0.22 + 34, maxW, 18);
    const bs = store.get('hs_stars', []);
    const sv = readSave(), ask = nightAsk && performance.now() - nightAsk.at < 3000 ? nightAsk.n : 0;
    buttonGrid([1, 2, 3, 4, 5].map(n => ({ label: n > reached ? '🔒' : ask === n ? 'Again: replace save?' : `Night ${n} ${'★'.repeat(bs[n - 1] || 0)}`, fn: () => { if (sv && ask !== n) { nightAsk = { n, at: performance.now() }; return; } nightAsk = null; startAtNight(n); }, enabled: n <= reached, hi: n === reached })), VH * 0.22 + 64, 106, 50);
    if (sv) { ctx.fillStyle = '#e0b83a'; ctx.font = '12px system-ui, sans-serif'; ctx.fillText(`Starting a night here replaces your saved season (Night ${sv.night}).`, cx, VH * 0.22 + 52); }
    const eb = store.get('hs_endless_best', 0);
    if (eb) { ctx.fillStyle = '#9ecbff'; ctx.font = '14px system-ui, sans-serif'; ctx.fillText(eb > 5 ? `Endless mode: last night cleared ${eb}` : 'Endless mode: no night cleared yet', cx, VH * 0.22 + 150); }
    ctx.fillStyle = '#888'; ctx.font = '13px system-ui, sans-serif';
    ctx.fillText('Click anywhere else or press Esc to go back', cx, VH * 0.22 + 180);
  } else if (state === 'nightdone' || state === 'over') {
    const r = G.endReason;
    const titles = {
      win: ['FREEZER\'S FILLING UP', '#9be564'],
      arrested: ['BUSTED!', '#ff5a5a'],
      sunrise: ['SUNRISE', '#ffb347'],
      escaped: ['YOU GOT AWAY', '#ffd166'],
      home: ['CALLED IT A NIGHT', '#ffd166'],
    };
    const subs = {
      win: state === 'over' ? (oneNightMode() ? 'Quota met. The freezer did its job. The neighborhood group chat will be unbearable.' : 'That\'s the whole season. Your freezer is full, and the whole subdivision is talking about it.') : 'You made quota. Linda is drafting a strongly worded email.',
      arrested: G.caller === 'ex' ? 'Darlene is telling everyone at book club. Officer Kowalski says hi.' : 'The HOA is already counting imaginary fines. Kowalski has actual paperwork.',
      sunrise: 'The sun is up and the whole subdivision is out jogging. The hunt is over.',
      escaped: 'You dove into the shed and killed the lights. Kowalski knocked for an hour. You missed your quota.',
      home: 'You drove home short of your quota. The freezer hums sadly.',
    };
    let [title, color] = state === 'over' && r === 'win' ? [oneNightMode() ? 'QUOTA MET!' : 'SEASON COMPLETE!', '#9be564'] : (titles[r] || titles.home);
    if (night > 5 && r === 'win') title = `ENDLESS NIGHT ${night} CLEARED`;
    if (!subs[r]) subs[r] = subs.home;
    if (!G.news) G.news = buildNews(r);
    if (!G.voicemail) G.voicemail = pick(VOICEMAILS.clean);
    let y = Math.max(70, VH * 0.16);
    ctx.fillStyle = color; fitFont(title, 900, 52, VW - 24);
    ctx.fillText(title, cx, y);
    // stars
    ctx.font = '34px system-ui, sans-serif';
    ctx.fillStyle = '#ffd166';
    const shownStars = clamp(Math.min(G.stars || 0, Math.floor((now - (G.resultAt || 0)) / 350)), 0, 3);
    ctx.fillText('★'.repeat(shownStars) + '☆'.repeat(3 - shownStars), cx, y + 46);
    ctx.fillStyle = '#999'; ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('★ quota met   ★ cops never called   ★ never spotted', cx, y + 66);
    ctx.fillStyle = '#e8e8e8'; ctx.font = '16px system-ui, sans-serif';
    y = wrapText(subs[r], cx, y + 98, maxW, 22) + 34;
    ctx.font = '15px system-ui, sans-serif'; ctx.fillStyle = '#ccc';
    const acc = G.shots ? Math.round(G.hits / G.shots * 100) : 0;
    const rows = [
      `Deer delivered: ${G.delivered} / ${G.quota}${G.bucks ? ` (${G.bucks} buck${G.bucks > 1 ? 's' : ''})` : ''}${G.legendDone ? ' + OLD HOSTA' : ''}`,
      `Arrows fired: ${G.shots}  ·  Accuracy: ${acc}%  ·  Times spotted: ${G.timesSpotted}`,
      `Sold to Steve: ${packsText(G.soldPacks || 0)}  ·  Freezer: ${packsText(campaign.freezer)}  ·  Squirrels ${G.squirrels || 0} · Fish ${G.fish || 0}`,
      campaign.versus ? (G.endReason === 'win' ? '🏆 Dale (Player 1) wins!' : '🏆 The HOA (Player 2) wins!') : campaign.coop ? `Co-op: ${G.delivered} deer, Tyler hauled ${G.tylerHauls || 0}` :
      campaign.map === 'golf' ? `Country Club best: ${store.get('hs_golf_best', 0)}` : campaign.map === 'cul' ? `Cul-de-sac best: ${store.get('hs_cul_best', 0)}` : campaign.map === 'random' ? `Random neighborhood best: ${store.get('hs_random_best', 0)}` : campaign.daily ? `Daily Hunt ${campaign.daily}${settings.difficulty !== 'normal' ? ' (' + settings.difficulty + ')' : ''}: best today ${(store.get('hs_daily', {})[dailyRecordKey()] || 0)}` : night < 5 ? `Cabin fund: $${campaign.cash} / $${CABIN_GOAL}` : '',
      `Time bonus: ${G.timeBonus || 0} pts  ·  No-cops bonus: ${G.stealthBonus || 0} pts  ·  Cash earned: $${G.earned}`,
      `Night score: ${G.nightScore}  ·  Season total: ${campaign.score}  ·  Best: ${best}`,
    ].filter(Boolean);
    // phones: a row that doesn't fit breaks at its ' · ' separators instead of losing the end to '…'
    for (const row of rows) {
      let line = '';
      for (const part of row.split('  ·  ')) {
        const t = line ? line + '  ·  ' + part : part;
        if (line && ctx.measureText(t).width > VW - 24) { ctx.fillText(line, cx, y); y += 20; line = part; } else line = t;
      }
      ctx.fillText(fitText(line, VW - 24), cx, y); y += 24;
    }
    // newsletter + voicemail (box sized to fit the wrapped text)
    y += 14;
    const bw = Math.min(640, VW - 40);
    ctx.font = 'bold 15px Georgia, serif';
    const hl = wrapLines(G.news.headline, bw - 30);
    ctx.font = 'italic 13px Georgia, serif';
    const bl = G.news.lines.map(l => wrapLines(l, bw - 30));
    const boxH = 34 + hl.length * 19 + bl.reduce((s, l) => s + l.length * 17 + 3, 0) + 6;
    panel(cx - bw / 2, y, bw, boxH);
    ctx.fillStyle = '#efe6d2'; ctx.font = 'bold 11px Georgia, serif';
    ctx.fillText('THE WHISPERING PINES WEEKLY', cx, y + 20);
    ctx.font = 'bold 15px Georgia, serif'; ctx.fillStyle = '#fff';
    let ny = y + 40;
    for (const l of hl) { ctx.fillText(l, cx, ny); ny += 19; }
    ctx.font = 'italic 13px Georgia, serif'; ctx.fillStyle = '#bbb';
    for (const ls of bl) { ny += 3; for (const l of ls) { ctx.fillText(l, cx, ny); ny += 17; } }
    y += boxH + 14;
    ctx.fillStyle = '#ff9ad5'; ctx.font = '14px system-ui, sans-serif';
    y = wrapText('📞 Voicemail from Darlene: "' + G.voicemail + '"', cx, y + 6, maxW, 20);
    if (!campaign.daily) { ctx.fillStyle = '#7cf'; y = wrapText('📱 Tyler: "' + (G.tylerLine || (G.tylerLine = tylerLine())) + '"', cx, y + 22, maxW, 20); }
    if (G.goth && G.goth.met) { ctx.fillStyle = RAVEN_COLOR; y = wrapText('🦇 Raven posted: "' + (G.ravenPost || (G.ravenPost = ravenPost())) + '"', cx, y + 22, maxW, 20); }
    // one-night modes: copy a shareable result line (like a daily puzzle)
    if (state === 'over' && oneNightMode() && !netClient()) {
      y = buttonGrid([{ label: G.copiedAt && now - G.copiedAt < 1500 ? '✓ Copied!' : '📋 Copy result', fn: () => { try { navigator.clipboard.writeText(shareText()).then(() => { G.copiedAt = performance.now(); }); } catch (e) { /* no clipboard */ } } }], y + 14, 200, 34) - 6;
    }
    if (VW >= 1100 && G.route && G.route.length > 1) drawRouteMap(VW - 250, VH - 210, 230);
    ctx.fillStyle = '#ffd166'; ctx.font = 'bold 19px system-ui, sans-serif';
    if (state === 'over' && r === 'win' && night === 5) {
      buttonGrid([{ label: 'Endless Mode ▶', fn: () => startEndless(), hi: true }, { label: 'New season', fn: () => newCampaign() }], y + 24, 220, 44);
    } else if (state === 'over' && night > 5) {
      ctx.fillText(`Endless run ended on night ${night}. Best: ${store.get('hs_endless_best', 0) > 5 ? 'cleared night ' + store.get('hs_endless_best', 0) : 'no night cleared yet'}`, cx, y + 30);
      if (Math.floor(now / 600) % 2 === 0) { ctx.font = 'bold 17px system-ui, sans-serif'; ctx.fillText('Click to start a new season', cx, y + 62); }
    } else if (netClient()) ctx.fillText('Waiting for the host to continue…', cx, y + 40);
    else if (Math.floor(now / 600) % 2 === 0) ctx.fillText(`${touchMode ? 'Tap' : 'Click'} ${state === 'nightdone' ? 'to visit the bait shop' : 'to start a new season'}`, cx, y + 40);
  }
}

// Lays out buttons in centered rows that wrap to the screen width. Returns the y below the last row.
// The title screen's submenus
const SUBMENUS = {
  modes: ['🗺 PLAY MODES', 'One-night hunts. They never touch your saved season.', () => [
    { label: '📅 Daily Hunt', fn: () => startDaily(), hi: true, sub: 'Same map for everyone today' },
    { label: '🎃 Halloween night', fn: () => startHalloween(), sub: 'Trick-or-treaters spook deer. Velvet Casket live.' },
    { label: '⛳ Country Club', fn: () => startGolf(), sub: 'Sand traps and a pro shop' },
    { label: '🏘 Cul-de-sac', fn: () => startMapMode('cul'), sub: 'Maple Court: three dead ends' },
    { label: '🎲 Random map', fn: () => startMapMode('random'), sub: 'New streets every time' },
    { label: '🧩 Custom map', fn: () => customMapMenu(), sub: 'Load a .json map' },
    { label: '🛠 Map editor', fn: () => { location.href = 'editor.html'; }, sub: 'Draw your own' },
  ]],
  players: ['👥 TWO PLAYERS', 'Same keyboard, or online (two tabs, or Steam in the desktop app).', () => [
    { label: '🤝 Co-op (one keyboard)', fn: () => startTwoPlayer('coop'), hi: true },
    { label: '🆚 Versus (one keyboard)', fn: () => startTwoPlayer('versus') },
    { label: '🌐 Online play', fn: () => openOnline(), hi: true },
  ]],
  extras: ['📜 EXTRAS', 'The rest of Whispering Pines.', () => [
    { label: 'Night select', fn: () => { state = 'nights'; } },
    { label: 'Who\'s Who', fn: () => { state = 'whoswho'; } },
    { label: 'Trophy Room', fn: () => { state = 'trophies'; } },
    { label: 'Credits', fn: () => { state = 'credits'; } },
  ]],
};
function drawSubmenu(which) {
  const [title, sub, items] = SUBMENUS[which], cx = VW / 2;
  ctx.textAlign = 'center'; ctx.fillStyle = '#ff7a1a'; fitFont(title, '900', 34, VW - 24); ctx.fillText(title, cx, Math.max(64, VH * 0.14));
  ctx.fillStyle = '#bbb'; ctx.font = '14px system-ui, sans-serif';
  let y = wrapText(sub, cx, Math.max(64, VH * 0.14) + 30, Math.min(560, VW - 30), 19) + 24;
  for (const it of items()) {
    y = buttonGrid([it], y, Math.min(320, VW - 40), 42, 6);
    if (it.sub) { ctx.fillStyle = '#888'; ctx.font = '12px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(it.sub, cx, y + 6); y += 18; }
  }
  buttonGrid([{ label: '◀ Back', fn: () => { state = 'title'; } }], y + 14, 160, 38);
}
function buttonGrid(items, y, w, h, gap = 10) {
  const perRow = clamp(Math.floor((VW - 24 + gap) / (w + gap)), 1, Math.min(3, items.length));
  const bw = Math.min(w, (VW - 24 - gap * (perRow - 1)) / perRow);
  for (let i = 0; i < items.length; i += perRow) {
    const row = items.slice(i, i + perRow);
    const total = row.length * bw + (row.length - 1) * gap;
    row.forEach((it, j) => button(VW / 2 - total / 2 + j * (bw + gap), y, bw, h, it.label, it.fn, it.enabled !== false, !!it.hi));
    y += h + gap;
  }
  return y;
}

function button(x, y, w, h, label, fn, enabled = true, highlight = false) {
  const hover = mouse.x >= x && mouse.x <= x + w && mouse.y + drawScroll >= y && mouse.y + drawScroll <= y + h;
  ctx.fillStyle = !enabled ? 'rgba(60,60,60,0.6)' : highlight ? (hover ? '#ffdf8a' : '#ffd166') : hover ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)';
  roundRect(ctx, x, y, w, h, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = highlight ? '#111' : enabled ? '#fff' : '#888';
  ctx.font = 'bold 14px system-ui, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(fitText(label, w - 14), x + w / 2, y + h / 2 + 5);   // long labels shrink to fit the button
  if (enabled) uiButtons.push({ x, y: y - drawScroll, w, h, fn });
  if (y + h > menuBottom) menuBottom = y + h;
}

const WHOS_WHO = [
  ['Dale Pruitt', 'You. 44, HVAC guy, lives in the shed.', 'Needs $1,500 to save Grandpa\'s woods. Won\'t lose the vest.', '#ff7a1a'],
  ['Darlene', 'The ex-wife. Owns the house AND your shed.', 'Patrols the front and sides. The backyard is "your side."', '#ff9ad5'],
  ['Tyler', 'Your son, 16.', 'Texts you tips. Wants to learn to bowhunt. Do not tell his mom.', '#7cf'],
  ['Sketchy Steve', 'Van on the east logging road.', 'Buys venison, squirrel, fish, koi. Asks fewer questions than Earl.', '#b5e86a'],
  ['Linda Vance', 'HOA President, 11 years running.', 'Patrols every road in a golf cart. Wrote Bylaw 14.3.', '#ffd166'],
  ['Gary Pfister', 'HOA Treasurer (Night 3+).', 'Fines everything. Flies a drone badly (Night 4+).', '#6fa8ff'],
  ['Todd & Brenda', 'Neighborhood Watch.', 'Todd is loud. Brenda is competent. Nobody tells Todd.', '#9be564'],
  ['Mr. Henderson', 'The insomniac (Night 3+).', 'Stares out his window, then dozes off. Watch for "Zzz".', '#ffe7a0'],
  ['Kyle & the Joggers', 'Dawn crowd.', 'When they show up, you\'re almost out of night.', '#ff4fa3'],
  ['Officer Kowalski & Sarge', 'Night shift + K-9.', 'Kowalski can be bribed with a burrito. So can Sarge.', '#9ecbff'],
  ['Old Hosta', 'Legendary 14-point buck.', 'Takes two arrows (or one from Grandpa\'s Longbow). Smells you a mile away.', '#c9a26b'],
  ['Earl', 'Earl\'s Bait & Tackle.', 'Sells you gear between nights. Asks no questions.', '#e0b83a'],
];
function drawWhosWho() {
  const cx = VW / 2;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff7a1a'; fitFont('WHO\'S WHO IN WHISPERING PINES', 900, 36, VW - 24);
  ctx.fillText('WHO\'S WHO IN WHISPERING PINES', cx, 64);
  const cols = VW > 820 ? 2 : 1, cw = Math.min(380, (VW - 60) / cols);
  ctx.font = 'italic 12px system-ui, sans-serif';
  const ch = WHOS_WHO.some(r => ctx.measureText(r[2]).width > cw - 24) ? 84 : 70;   // room for 2-line descriptions on phones
  const x0 = cx - (cols * cw + (cols - 1) * 12) / 2;
  WHOS_WHO.forEach(([name, role, desc, color], i) => {
    const x = x0 + (i % cols) * (cw + 12), y = 92 + Math.floor(i / cols) * (ch + 6);
    panel(x, y, cw, ch);
    ctx.fillStyle = color; ctx.fillRect(x, y + 8, 4, ch - 16);
    ctx.textAlign = 'left';
    ctx.fillStyle = color; ctx.font = 'bold 15px system-ui, sans-serif'; ctx.fillText(name, x + 14, y + 22);
    ctx.fillStyle = '#ddd'; ctx.font = '12px system-ui, sans-serif'; ctx.fillText(role, x + 14, y + 40);
    ctx.fillStyle = '#999'; ctx.font = 'italic 12px system-ui, sans-serif'; wrapText(desc, x + 14, y + 57, cw - 24, 15);
  });
  ctx.textAlign = 'center'; ctx.fillStyle = '#888'; ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('Click or press Esc to go back', cx, Math.max(VH - 24, 92 + Math.ceil(WHOS_WHO.length / cols) * (ch + 6) + 22));
}

function drawSteve() {
  const cx = VW / 2;
  let y = Math.max(70, VH * 0.18);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#b5e86a'; fitFont('STEVE\'S DISCOUNT MEATS & MORE', 900, 34, VW - 24);
  ctx.fillText('STEVE\'S DISCOUNT MEATS & MORE', cx, y);
  ctx.fillStyle = '#ddd'; ctx.font = 'italic 15px system-ui, sans-serif';
  y = wrapText(G.steveLine || pick(STEVE_LINES), cx, y + 36, Math.min(600, VW - 40), 20) + 30;
  const packs = (player.cooler || 0) + (player.bag || 0);
  ctx.fillStyle = '#9be564'; ctx.font = 'bold 17px system-ui, sans-serif';
  y = wrapText(`Tonight's price: $${G.price}/pack  ·  You have ${packsText(packs)} on you  ·  Cash $${campaign.cash + G.earned}`, cx, y, Math.min(620, VW - 28), 20);
  y += 24;
  buttonGrid([
    { label: `1. Sell ${packsText(packs)} ($${packs * G.price})`, fn: steveSell, enabled: packs > 0, hi: packs > 0 },
    { label: '2. Beer ($15)', fn: () => steveBuy('beer') },
    { label: '3. Four arrows ($20)', fn: () => steveBuy('arrows') },
    { label: '4. Three pinecones ($10)', fn: () => steveBuy('cones') },
    { label: G.haggled ? 'Already haggled' : '5. Haggle (risky)', fn: steveHaggle, enabled: !G.haggled },
    { label: '6. Leave', fn: () => { state = 'play'; } },
  ], y, 230, 44);
  ctx.fillStyle = '#888'; ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(pad.connected ? '🎮 A sell · X beer · Y arrows · D-pad ↑ pinecones · D-pad ↓ haggle · B leave' : 'Time is frozen while you haggle. (Steve is very fast at haggling.)', cx, VH - 30);
}

// ---- Context prompt: one clear hint for what E does right now ----
function contextLabel() {
  if (player.fishing) return player.fishing.bite > 0 ? '[E] REEL IN!' : 'fishing...';
  if (player.carry) return nearTruck() ? '' : '[E] drop deer';
  if (!player.cooler && deer.some(d => d.dead && !d.carried && dist(d.x, d.y, player.x, player.y) < 48)) return '[E] drag deer';
  if (nearRaven() && G.goth && G.goth.held >= 0) return '[E] give Raven Edgar\'s shiny';
  if (nearRaven() && gothBinderDone() && !gothHasSecret()) return '[E] talk to Raven (she has something for you)';
  if (nearRaven()) return (campaign.racks || []).length && G.goth && !G.goth.boughtRack && !oneNightMode() ? '[E] sell Raven an antler rack' : G.goth && !G.goth.traded && G.goth.cards.some(c => !c.got) && gothPosters().length >= POSTERS.length ? '[E] backstage pass: ask Raven for a hint' : player.cones > 0 && G.goth && !G.goth.traded && G.goth.cards.some(c => !c.got) ? '[E] give Raven a pinecone' : '[E] talk to Raven';
  if (nearVan()) return '[E] talk to Steve';
  if (nearYotm()) return '[E] steal the Yard of the Month sign';
  if (player.cooler) return nearTruck() ? '[E] put cooler back' : '';
  if (nearTruck() && G.freezer > 0) return '[E] pack a cooler';
  if (pondNear()) return '[E] fish';
  if (nearTruck() && G.delivered >= G.quota) return '[Q] end the night';
  return '';
}
function drawPlayerOverlay() {
  if (!G || !player || state !== 'play') return;
  drawContextPrompt();
  if (player.stamina < 99) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(player.x - 16, player.y + 20, 32, 4);
    ctx.fillStyle = player.stamina > 30 ? '#9ecbff' : '#ff9f6b'; ctx.fillRect(player.x - 16, player.y + 20, 32 * player.stamina / 100, 4);
  }
}
function drawContextPrompt() {
  const t = (contextLabel() || '').replace('[E]', `[${ctl('use')}]`).replace('[Q]', `[${ctl('leave')}]`);
  if (!t) return;
  ctx.font = 'bold 12px system-ui, sans-serif'; ctx.textAlign = 'center';
  const w = ctx.measureText(t).width + 12;
  ctx.fillStyle = 'rgba(15,18,24,0.8)'; roundRect(ctx, player.x - w / 2, player.y - 46, w, 18, 6); ctx.fill();
  ctx.fillStyle = t.includes('REEL') ? '#ff6b6b' : '#ffd166';
  ctx.fillText(t, player.x, player.y - 33);
}

// ---- Hedges & sprinklers ----
function drawHedges() {
  for (const h of world.hedges) {
    if (!inView(h.x, h.y + h.h / 2, h.h)) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(h.x + 5, h.y + 5, h.w, h.h);
    ctx.fillStyle = '#1f4a22'; roundRect(ctx, h.x - 3, h.y, h.w + 6, h.h, 7); ctx.fill();
    ctx.fillStyle = '#2b5f2c';
    for (let y = h.y + 8; y < h.y + h.h - 4; y += 12) { ctx.beginPath(); ctx.arc(h.x + h.w / 2 + ((y / 12) % 2 ? 2 : -2), y, 7, 0, TAU); ctx.fill(); }
  }
}
function sprinklerOn(sp) { return G && ((G.playT + sp.phase) % 26) < 8; }
function drawSprinklers(now) {
  for (const sp of world.sprinklers) {
    if (!inView(sp.x, sp.y, 100)) continue;
    ctx.fillStyle = '#556'; ctx.beginPath(); ctx.arc(sp.x, sp.y, 3, 0, TAU); ctx.fill();
    if (!sprinklerOn(sp)) continue;
    const a = now / 300 + sp.phase;
    ctx.strokeStyle = 'rgba(150,200,255,0.5)'; ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) { const aa = a + i * 0.12; ctx.beginPath(); ctx.moveTo(sp.x, sp.y); ctx.lineTo(sp.x + Math.cos(aa) * sp.r, sp.y + Math.sin(aa) * sp.r); ctx.stroke(); }
    ctx.fillStyle = 'rgba(150,200,255,0.08)'; ctx.beginPath(); ctx.arc(sp.x, sp.y, sp.r, 0, TAU); ctx.fill();
  }
}

// ---- Ambience: lightning, owls, fireflies, wind-blown leaves, sprinklers, yawns ----
let marks = [], flies = [], leaves = [];
function updateAmbience(dt) {
  // lightning storms on rain nights
  if (G.weather === 'rain') {
    G.lightT = (G.lightT ?? rnd(15, 30)) - dt;
    if (G.lightT <= 0) {
      G.lightT = rnd(18, 35); G.flash = 0.35;
      tone(70, 1.8, 'sawtooth', 0.07, 35, 1.0);
      hint('lightning', 'Lightning! For a split second the whole street is lit up and everyone can see much farther. Stay in cover during storms.');
    }
  }
  if (G.flash > 0) G.flash -= dt;
  // owls and far-off dogs
  G.owlT = (G.owlT ?? rnd(15, 30)) - dt;
  if (G.owlT <= 0) {
    G.owlT = rnd(25, 45);
    if (G.weather !== 'rain') { tone(380, 0.35, 'sine', 0.025); tone(330, 0.55, 'sine', 0.025, null, 0.45); }
    else tone(240, 0.1, 'sawtooth', 0.015, 180, 0.2);
  }
  // fireflies along the treeline on clear nights
  if (G.weather === 'clear' && flies.length < 40 && progress() < 0.7) {
    for (let k = 0; k < 20 && flies.length < 40; k++) {
      const x = rnd(40, W - 40), y = rnd(40, H - 40);
      const edge = Math.min(Math.abs(x - M), Math.abs(x - (W - M)), Math.abs(y - M), Math.abs(y - (H - M)));
      if (edge < 120) flies.push({ x, y, a: rnd(0, TAU), ph: rnd(0, TAU) });
    }
  }
  for (const f of flies) { f.a += rnd(-2, 2) * dt; f.x += Math.cos(f.a) * 14 * dt; f.y += Math.sin(f.a) * 14 * dt; f.ph += dt * 2; }
  // wind-blown leaves near the camera (show the wind direction)
  if (G.weather !== 'snow' && leaves.length < 28 && Math.random() < dt * 6) {
    const up = G.wind + Math.PI;
    leaves.push({ x: player.x + Math.cos(up) * 600 + rnd(-500, 500), y: player.y + Math.sin(up) * 450 + rnd(-400, 400), r: rnd(0, TAU), t: 9, c: pick(['#a0522d', '#c8741a', '#8a6a2a', '#b84a1a']) });
  }
  for (const l of leaves) { l.t -= dt; l.x += Math.cos(G.wind) * 70 * dt + Math.sin(l.t * 3) * 10 * dt; l.y += Math.sin(G.wind) * 70 * dt; l.r += dt * 3; }
  leaves = leaves.filter(l => l.t > 0);
  // sprinklers
  for (const sp of world.sprinklers) {
    if (sprinklerOn(sp) && dist(sp.x, sp.y, player.x, player.y) < sp.r) {
      if (!(G.soaked > 0)) { popup(player.x, player.y - 30, player.moving ? 'SOAKED! Your boots squelch now.' : 'SOAKED. You just stood there. The sprinkler respects that.', '#6fb7ff', 1.8); tone(1800, 0.3, 'sawtooth', 0.02, 900); unlock('soaked'); }
      G.soaked = 20;
    }
  }
  if (G.soaked > 0) {
    G.soaked -= dt;
    if (Math.random() < dt * 5) particles.push({ x: player.x + rnd(-8, 8), y: player.y + rnd(-8, 8), vx: 0, vy: 25, t: 0.5, c: '#6fb7ff' });
    if (player.moving && player.crouch) { G.squelchT = (G.squelchT || 0) - dt; if (G.squelchT <= 0) { G.squelchT = 0.7; makeNoise(player.x, player.y, 60, 'squelch', true); } }
  }
  // tired watchers yawn late in the night (their flashlights droop)
  for (const w of watchers) if (w.yawn > 0) w.yawn -= dt;
  if (progress() > 0.6) {
    G.yawnT = (G.yawnT ?? rnd(8, 14)) - dt;
    if (G.yawnT <= 0) {
      G.yawnT = rnd(10, 18);
      const pool = watchers.filter(w => !['cop', 'drone', 'k9', 'window'].includes(w.type) && !w.seeing);
      if (pool.length) { const w = pick(pool); w.yawn = 2.2; if (inView(w.x, w.y, 100)) popup(w.x, w.y - 34, '*yaaaawn*', '#ccc', 1.4); }
    }
  }
}
function drawAmbient(now) {
  for (const f of flies) {
    if (!inView(f.x, f.y, 10)) continue;
    const a = Math.max(0, Math.sin(f.ph)) * 0.9;
    if (a < 0.05) continue;
    ctx.fillStyle = `rgba(210,255,120,${a})`; ctx.beginPath(); ctx.arc(f.x, f.y, 2, 0, TAU); ctx.fill();
    ctx.fillStyle = `rgba(210,255,120,${a * 0.25})`; ctx.beginPath(); ctx.arc(f.x, f.y, 7, 0, TAU); ctx.fill();
  }
  for (const l of leaves) {
    if (!inView(l.x, l.y, 10)) continue;
    ctx.globalAlpha = Math.min(1, l.t / 2) * 0.85;
    ctx.fillStyle = l.c; ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(l.r);
    ctx.beginPath(); ctx.ellipse(0, 0, 4, 2, 0, 0, TAU); ctx.fill(); ctx.restore();
  }
  ctx.globalAlpha = 1;
}
function drawMarks() {
  if (!marks.length) return;
  ctx.fillStyle = G && G.weather === 'snow' ? 'rgba(90,100,110,0.35)' : 'rgba(60,45,25,0.3)';
  for (const m of marks) if (inView(m.x, m.y, 6)) ctx.fillRect(m.x - 2, m.y - 2, 4, 4);
}

// ---- Trophy Room & Credits ----
function drawTrophies() {
  const cx = VW / 2;
  ctx.textAlign = 'center'; ctx.fillStyle = '#ff7a1a'; fitFont('TROPHY ROOM', 900, 36, VW - 24); ctx.fillText('TROPHY ROOM', cx, 56);
  const keys = Object.keys(ACH), got = keys.filter(k => achievements[k]).length;
  ctx.fillStyle = '#bbb'; ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(`Achievements: ${got} / ${keys.length}`, cx, 78);
  const cols = VW > 900 ? 2 : 1, cw = Math.min(430, (VW - 40) / cols), rh = 19;
  const x0 = cx - (cols * cw) / 2;
  keys.forEach((k, i) => {
    const x = x0 + (i % cols) * cw + 8, y = 104 + Math.floor(i / cols) * rh;
    const [name, desc] = ACH[k];
    ctx.textAlign = 'left';
    ctx.fillStyle = achievements[k] ? '#ffd166' : '#555'; ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText(fitText((achievements[k] ? '🏆 ' : '🔒 ') + name, 178), x, y);
    ctx.fillStyle = achievements[k] ? '#aaa' : '#555'; ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(fitText(desc, cw - 206), x + 186, y);
  });
  let y = 104 + Math.ceil(keys.length / cols) * rh + 18;
  const life = store.get('hs_life', {});
  ctx.textAlign = 'center'; ctx.fillStyle = '#9ecbff'; ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText('LIFETIME', cx, y); y += 20;
  ctx.fillStyle = '#ccc'; ctx.font = '13px system-ui, sans-serif';
  const acc = life.arrows ? Math.round((life.hits || 0) / life.arrows * 100) : 0;
  y = wrapText(`Nights played ${life.nights || 0} · Deer ${life.deer || 0} (${life.bucks || 0} bucks) · Old Hosta ${life.hosta || 0} · Accuracy ${acc}% · Packs sold ${life.sold || 0} · Squirrels ${life.squirrels || 0} · Rabbits ${life.rabbits || 0} · Fish ${life.fish || 0} · Times busted ${life.busted || 0} · Cash earned $${life.cash || 0} · Gossip notes ${store.get('hs_gossip', []).length}/${GOSSIP.length} · Raven\'s cards ${CARDS.filter((_, i) => gothCards().includes(i)).length}/${CARDS.length}${gothHasSecret() ? ' + #13' : ''} · Posters ${gothPosters().length}/${POSTERS.length}`, cx, y, Math.min(700, VW - 30), 18) + 26;
  const scores = readScores();
  ctx.fillStyle = '#9be564'; ctx.font = 'bold 14px system-ui, sans-serif'; ctx.fillText('BEST SEASONS', cx, y); y += 20;
  ctx.fillStyle = '#ccc'; ctx.font = '13px system-ui, sans-serif';
  if (!scores.length) { ctx.fillText('None yet. Go fill that freezer.', cx, y); }
  scores.slice(0, 5).forEach((s, i) => { ctx.fillText(`${i + 1}. ${s.score} pts · reached night ${s.night} · $${s.cash} · ${s.date}`, cx, y); y += 18; });
  ctx.fillStyle = '#888'; ctx.font = '12px system-ui, sans-serif'; ctx.fillText('Click or press Esc to go back', cx, VH - 20);
}
function drawCredits() {
  const cx = VW / 2;
  let y = Math.max(80, VH * 0.2);
  ctx.textAlign = 'center';
  for (const [h, t] of CREDITS) {
    ctx.fillStyle = h === 'CURFEW BUCK' ? '#ff7a1a' : '#ffd166';
    ctx.font = h === 'CURFEW BUCK' ? '900 40px system-ui, sans-serif' : 'bold 15px system-ui, sans-serif';
    ctx.fillText(h, cx, y); y += h === 'CURFEW BUCK' ? 30 : 22;
    ctx.fillStyle = '#ccc'; ctx.font = '15px system-ui, sans-serif';
    y = wrapText(t, cx, y, Math.min(600, VW - 30), 20) + 34;
  }
  ctx.fillStyle = '#888'; ctx.font = '12px system-ui, sans-serif'; ctx.fillText('v' + VERSION + '  ·  Click or press Esc to go back', cx, VH - 20);
}

// ---- v0.7 helpers ----
let confirmNewAt = 0, nightAsk = null;
const realRandom = Math.random;
function restoreRandom() { Math.random = realRandom; }
function dailyKey() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
