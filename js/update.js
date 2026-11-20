'use strict';
// Hunter Sub: Main update: player, deer, critters, fishing, objectives, story, watchers, police.
// Part 5 of 10. All parts share one global scope, so load them in order (see index.html).
// ============================================================
// Update
// ============================================================
function update(dt) {
  pollPad();
  if (!settings.shake) cam.shake = 0;
  for (const p of popups) { p.t -= dt; p.y -= 14 * dt; }
  popups = popups.filter(p => p.t > 0);
  for (const p of particles) { p.t -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92; }
  particles = particles.filter(p => p.t > 0);
  for (const t of toasts) t.t -= dt;
  toasts = toasts.filter(t => t.t > 0);
  if (G && (G.weather === 'rain' || G.weather === 'snow') && (state === 'play' || state === 'intro' || state === 'pause')) updateRain(dt);
  if (state !== 'play' || netClient()) return;

  G.time -= dt;
  G.playT += dt;
  if (G.banner) { G.banner.t -= dt; if (G.banner.t <= 0) G.banner = null; }
  if (G.hint) { G.hint.t -= dt; if (G.hint.t <= 0) { G.hint = null; nextHint(); } }
  if (G.ghost) { G.ghost.t -= dt; if (G.ghost.t <= 0) G.ghost = null; }
  G.radioCD -= dt;
  musicTick(dt);
  if (!G.warn60 && G.time < 60 && G.time > 1) { G.warn60 = true; banner(G.delivered >= G.quota ? '☀ Sunrise in 60 seconds! Quota met: you\'re safe either way.' : `☀ Sunrise in 60 seconds! ${G.quota - G.delivered} deer to go.`, '#ffb347'); tone(660, 0.15, 'triangle', 0.08); tone(660, 0.15, 'triangle', 0.08, null, 0.25); }
  if (!G.warn20 && G.time < 20 && G.time > 1) { G.warn20 = true; banner(G.delivered >= G.quota ? '☀ 20 SECONDS TO SUNRISE. Quota met. Nice work.' : `☀ 20 SECONDS TO SUNRISE. ${G.quota - G.delivered} deer short!`, '#ff9f6b'); tone(880, 0.2, 'triangle', 0.09); }
  if (G.time <= 0) { G.time = 0; endNight(G.delivered >= G.quota ? 'win' : 'sunrise'); return; }

  // Tutorial hints (first season only shows each once)
  if (night === 1 && G.playT > 0.5 && !G.tut) hint('start', 'Sneak (hold Shift) toward a deer. HOLD click to draw your bow, RELEASE to fire. Full draw = deadly.');
  if (G.playT > 35 && !G.tut) hint('cone', `${inputKind() === 'touch' ? 'The CONE button' : inputKind() === 'pad' ? 'B' : 'Right-click (or F)'} throws a pinecone. Watchers walk over to check it out. Use it to clear a path.`);
  if (night === 2 && G.playT > 3) hint('flood', 'More porch floodlights tonight. Sneak and give them room: get too close and they click on.');

  // Crickets
  G.chirpT -= dt;
  if (G.chirpT <= 0) { G.chirpT = rnd(1.2, 3.5); if (G.weather !== 'rain' && progress() < 0.8) sfx.chirp(); }

  updatePlayer(dt);
  if (tyler) updateTyler(dt);
  updateArrows(dt);
  updateCones(dt);
  for (const d of deer) updateDeer(d, dt);
  updateDogs(dt);
  updateFloods(dt);
  updateWorldEvents(dt);
  updateCritters(dt);
  updateFishing(dt);
  updateObjective();
  updateGoth(dt);
  updateTutorial();
  if (!G.hostaSeen) { const L = deer.find(d => d.legend && !d.dead && inView(d.x, d.y, -80)); if (L) { G.hostaSeen = true; G.slowmo = 1.4; banner('🦌 OLD HOSTA. Fourteen points. Don\'t. Breathe.', '#ffd166'); tone(98, 1.2, 'triangle', 0.08, 73); tone(147, 1.0, 'triangle', 0.05, null, 0.2); } }
  updateAmbience(dt);
  updateWeatherTerrain(dt);
  G.routeT = (G.routeT || 0) - dt;
  if (G.routeT <= 0) { G.routeT = 1; (G.route = G.route || []).push({ x: player.x, y: player.y }); if (G.route.length > 900) G.route.shift(); }
  // Beer buzz: random loud burps
  if (G.buzz > 0) {
    G.buzz -= dt; G.burpT -= dt;
    if (G.burpT <= 0) {
      G.burpT = rnd(4, 8);
      tone(110, 0.35, 'sawtooth', 0.07, 70);
      popup(player.x, player.y - 30, pick(['*BUUUURP*', '*BRAAAP*', '*hic*', '*BURRRP* ...excuse me']), '#ffd166', 1.2);
      makeNoise(player.x, player.y, 170 * noiseMult(), 'burp', true);
    }
    if (G.buzz <= 0) popup(player.x, player.y - 30, 'Buzz wore off.', '#aaa', 1);
  }
  if (G.stink > 0) {
    G.stink -= dt;
    if (Math.random() < dt * 6) particles.push({ x: player.x + rnd(-14, 14), y: player.y + rnd(-14, 14), vx: rnd(-10, 10), vy: rnd(-30, -10), t: 1, c: '#a8d86b' });
  }
  for (const w of watchers) updateWatcher(w, dt);
  detection(dt);
  if (state !== 'play') return;
  updatePolice(dt);

  G.respawnT -= dt;
  if (G.respawnT <= 0) {
    G.respawnT = 7;
    if (deer.filter(d => !d.dead).length < 8 + night) spawnDeer(true);
  }
  updateCam(dt);
}

// Dynamic music: a quiet plucky bass line that speeds up and gets busier with danger.
let musicBeat = 0, musicT = 0;
const BASS = [55, 55, 65.41, 49, 55, 55, 73.42, 65.41];
const PLUCK = [220, 261.63, 293.66, 329.63, 392, 440];
function musicTick(dt) {
  if (!settings.music || !(settings.musicVol > 0) || muted) return;
  const danger = G.police ? 2 : (G.anySeen || G.sus > 45) ? 1 : 0;
  musicT -= dt;
  if (musicT > 0) return;
  musicT = [0.62, 0.42, 0.28][danger];
  toneChannel = 'music';
  const goth = typeof has === 'function' && has('vccd');   // Velvet Casket CD (js/goth.js)
  const n = (goth ? GOTH_BASS : BASS)[musicBeat % BASS.length];
  tone(n, musicT * 0.9, goth ? 'sawtooth' : 'triangle', (danger ? 0.05 : 0.035) * (goth ? 0.6 : 1));
  if (danger >= 1 && musicBeat % 2 === 1) tone(6000, 0.02, 'square', 0.008);
  if (danger === 2) tone(n * 2, 0.08, 'sawtooth', 0.015);
  if (danger === 0 && musicBeat % 4 === 2 && Math.random() < 0.6) tone(pick(goth ? GOTH_PLUCK : PLUCK), goth ? 0.5 : 0.25, 'triangle', 0.02, null, 0.05);
  musicBeat++;
  toneChannel = 'sfx';
}

function grunt() {
  if (G.gruntCD > 0) { popup(player.x, player.y - 30, `Grunt call ready in ${Math.ceil(G.gruntCD)}s`, '#ffd166', 1); return; }
  G.gruntCD = 12;
  sfx.grunt();
  popup(player.x, player.y - 30, '*GRUNT GRUNT*', '#c9a26b', 1.4);
  let lured = 0;
  for (const d of deer) {
    if (d.dead || !d.buck || d.state === 'flee') continue;
    if (dist(d.x, d.y, player.x, player.y) > 750) continue;
    d.state = 'lured'; d.lure = { x: player.x, y: player.y }; d.t = 12; lured++;
  }
  if (lured) popup(player.x, player.y - 52, lured > 1 ? `${lured} bucks are coming...` : 'A buck is coming... stay low.', '#9be564', 2);
  // People hear it too, from a shorter distance.
  makeNoise(player.x, player.y, 170 * noiseMult(), 'grunt', true);
}

function spawnDawnWatchers() {
  const { vx, hy } = world;
  const loop = [{ x: vx[0] + 20, y: hy[0] + 20 }, { x: vx[1] + 100, y: hy[0] + 20 }, { x: vx[1] + 100, y: hy[1] + 100 }, { x: vx[0] + 20, y: hy[1] + 100 }];
  const j = makeWatcher('jogger', loop, { speed: 125, fov: 1.2, range: 210, pause: 0.2, rate: 18, label: 'Morning Jogger' });
  watchers.push(j);
  const j2 = makeWatcher('jogger', loop.slice().reverse(), { speed: 115, fov: 1.2, range: 210, pause: 0.2, rate: 18, label: 'Power Walker' });
  j2.x = loop[2].x; j2.y = loop[2].y;
  watchers.push(j2);
  banner('The joggers are out. Dawn is coming!', '#ffb347');
}

function trackPrints(dt) {
  for (const p of G.prints) p.t -= dt;
  if (G.prints.length && G.prints[0].t <= 0) G.prints = G.prints.filter(p => p.t > 0);
  G.trackCD -= dt;
  if (G.trackCD > 0 || !G.prints.length) return;
  G.trackCD = 0.4;
  for (const w of watchers) {
    if (w.seeing || w.fixed || ['cop', 'drone', 'k9', 'paper', 'jogger'].includes(w.type) || w.asleep > 0) continue;
    // newest print this watcher can see
    let best = null;
    for (let i = G.prints.length - 1; i >= Math.max(0, G.prints.length - 80); i--) {
      const p = G.prints[i];
      const d = dist(w.x, w.y, p.x, p.y);
      if (d > coneRange(w) * 0.8 || d < 20) continue;
      if (Math.abs(angDiff(w.ang, Math.atan2(p.y - w.y, p.x - w.x))) > w.fov / 2) continue;
      if (!los(w.x, w.y, p.x, p.y)) continue;
      best = p; break;
    }
    if (!best || (w.trackBorn || -1) >= best.born) continue;
    w.trackBorn = best.born;
    G.tracked = true;
    investigate(w, best.x, best.y);
    if (w.quipCD <= 0) { w.quipCD = 6; popup(w.x, w.y - 34, pick(['Footprints...? Fresh ones.', 'Who\'s been tromping through the yards?', 'These tracks are BOOT-sized.', 'Somebody\'s out here.']), '#ffe9a8'); sfx.huh(); }
  }
}

function updateWorldEvents(dt) {
  if (G.prints.length) trackPrints(dt);
  G.windShiftT = (G.windShiftT ?? rnd(50, 90)) - dt;
  if (G.windShiftT <= 0) { G.windShiftT = rnd(50, 90); G.wind += (Math.random() < 0.5 ? 1 : -1) * rnd(1.0, 2.1); banner('🍃 The wind shifted!', '#9ecbff'); hint('windshift', 'The wind changes direction during the night. Check the WIND arrow before you stalk a deer.'); }
  G.gruntCD = Math.max(0, G.gruntCD - dt);
  for (const c of G.corn) c.t -= dt;
  G.corn = G.corn.filter(c => c.t > 0);
  G.snortCD -= dt;
  // Wind slowly shifts.
  G.wind += Math.sin(G.playT * 0.05) * dt * 0.05;

  // Running makes footstep noise (louder on gravel and leaves, quiet when sneaking).
  if (player.moving && !player.crouch && !player.hidden) {
    G.stepT -= dt;
    if (G.stepT <= 0) {
      G.stepT = player.sprinting ? 0.3 : 0.5;
      const onRoad = world.roads.some(r => player.x > r.x && player.x < r.x + r.w && player.y > r.y && player.y < r.y + r.h);
      const r = (world.inWoods(player.x, player.y) ? 135 : onRoad ? 70 : 100) * noiseMult() * (has('boots') ? 0.6 : 1) * (G.soaked > 0 ? 1.6 : 1) * (player.sprinting ? 1.6 : 1);
      makeNoise(player.x, player.y, r, 'step', true);
    }
  }

  // Dawn visitors
  if (!G.paperSpawned && progress() > 0.5) {
    G.paperSpawned = true;
    const { hy } = world;
    watchers.push(makeWatcher('paper', [{ x: M + 40, y: hy[0] + 90 }, { x: W - M - 40, y: hy[0] + 90 }],
      { speed: 165, fov: 1.0, range: 200, pause: 1.5, rate: 14, label: 'Paperboy Kyle', throwT: 2 }));
  }
  if (!G.dawnSpawned && progress() > 0.72) { G.dawnSpawned = true; spawnDawnWatchers(); }
  for (const w of watchers) if (w.type === 'paper' && w.state === 'patrol') {
    w.throwT -= dt;
    if (w.throwT <= 0) { w.throwT = rnd(1.2, 2.5); sfx.paper(); if (inView(w.x, w.y, 0)) popup(w.x, w.y - 26, '*THWAP*', '#ddd', 0.8); }
  }

  // Mom calls (press T to decline before it rings out loud)
  const mom = G.mom;
  if (mom) {
    if (mom.state === 'wait' && G.playT > mom.at) { mom.state = 'buzz'; mom.t = 2.6; sfx.buzz(); banner('📱 MOM IS CALLING — press T to decline!', '#ff9ad5'); hint('mom', 'Your phone is buzzing! Press T (or Y on a gamepad) fast, or it rings out loud.'); }
    else if (mom.state === 'buzz') {
      mom.t -= dt;
      if (mom.t <= 0) {
        mom.state = 'done';
        sfx.ring();
        popup(player.x, player.y - 34, '🎵 RING RING 🎵', '#ff9ad5', 1.6);
        popup(player.x, player.y - 58, pick(MOM_LINES), '#ffc4e6', 3);
        makeNoise(player.x, player.y, 320 * noiseMult(), 'ring');
      }
    }
  }

  // A stray cat adopts you and meows.
  if (!G.cat && night >= 2) {
    G.catT -= dt;
    if (G.catT <= 0) {
      G.catT = rnd(40, 80);
      if (!world.inWoods(player.x, player.y) && Math.random() < 0.6) {
        G.cat = { x: player.x + rnd(-200, 200), y: player.y + rnd(-200, 200), meowT: 3, life: 35, ang: 0 };
        hint('cat', 'A stray cat is following you. Its meowing draws attention. Hide in a bush to lose it.');
      }
    }
  } else if (G.cat) {
    const c = G.cat;
    c.life -= dt;
    const d = dist(c.x, c.y, player.x, player.y);
    if (player.hidden || c.life <= 0) {
      c.ang = Math.atan2(c.y - player.y, c.x - player.x);
      c.x += Math.cos(c.ang) * 110 * dt; c.y += Math.sin(c.ang) * 110 * dt;
      if (d > 600) G.cat = null;
    } else {
      if (d > 45) { c.ang = Math.atan2(player.y - c.y, player.x - c.x); moveCircle(c, Math.cos(c.ang) * Math.min(190, d * 2) * dt, Math.sin(c.ang) * Math.min(190, d * 2) * dt, 6); }
      c.meowT -= dt;
      if (c.meowT <= 0) { c.meowT = rnd(4, 7); sfx.meow(); popup(c.x, c.y - 16, 'Mrrrow?', '#ddd', 1.2); makeNoise(c.x, c.y, 150 * noiseMult(), 'meow', true); }
    }
  }

  // Props: gnomes and trash cans you can knock over
  for (const p of world.props) {
    if (p.down) continue;
    if (dist(p.x, p.y, player.x, player.y) < 15 && player.moving) {
      p.down = 1;
      sfx.clang();
      popup(p.x, p.y - 18, p.kind === 'trash' ? '*CLANG!*' : '*CRACK*', '#ffb36b', 1.2);
      makeNoise(p.x, p.y, (p.kind === 'trash' ? 280 : 200) * (player.crouch ? 0.6 : 1) * noiseMult(), 'prop');
    }
  }

  // HOA violation notices
  for (const n of G.notices) {
    if (n.got || dist(n.x, n.y, player.x, player.y) > 22) continue;
    n.got = true;
    G.noticesGot++;
    G.earned += 30;
    sfx.grab();
    popup(n.x, n.y - 24, n.text + ' (+$30)', '#ffe38a', 3);
    if (G.noticesGot === 3) { G.earned += 50; unlock('paperwork'); banner('All 3 HOA notices collected! +$50 bonus', '#ffe38a'); }
    hint('notice', 'HOA notices pay cash when you pick them up. Grab all 3 tonight for a $50 bonus.');
  }
}

// ============================================================
// Small game & critters: squirrels, turkeys, crows, raccoons, skunks
// ============================================================
let critters = [];
function spawnCritters() {
  critters = [];
  const yardTrees = world.trees.filter(t => !world.inWoods(t.x, t.y));
  const woodsSpot = () => { for (let k = 0; k < 300; k++) { const x = rnd(40, W - 40), y = rnd(40, H - 40); if (world.inWoods(x, y) && !world.blocked(x, y, 20)) return { x, y }; } return { x: 120, y: 120 }; };
  const yardSpot = () => { for (let k = 0; k < 300; k++) { const x = rnd(M + 30, W - M - 30), y = rnd(M + 30, H - M - 30); if (!world.blocked(x, y, 20)) return { x, y }; } return { x: W / 2, y: H / 2 }; };
  for (let i = 0; i < 14; i++) {
    const t = pick(yardTrees.length && Math.random() < 0.6 ? yardTrees : world.trees);
    critters.push({ type: 'squirrel', x: t.x + rnd(-20, 20), y: t.y + rnd(-20, 20), tree: t, state: 'idle', t: rnd(1, 4), ang: rnd(0, TAU), dead: false });
  }
  for (let i = 0; i < 6; i++) { const p = Math.random() < 0.5 ? woodsSpot() : yardSpot(); critters.push({ type: 'rabbit', x: p.x, y: p.y, state: 'idle', t: rnd(1, 3), ang: rnd(0, TAU), dead: false, hop: 0 }); }
  for (let i = 0; i < 5; i++) { const p = woodsSpot(); critters.push({ type: 'turkey', x: p.x, y: p.y, state: 'walk', t: rnd(1, 4), ang: rnd(0, TAU), gobT: rnd(3, 12), dead: false }); }
  for (let i = 0; i < 6; i++) { const p = yardSpot(); critters.push({ type: 'crows', x: p.x, y: p.y, flown: false, t: 0, birds: Array.from({ length: 5 }, () => ({ dx: rnd(-18, 18), dy: rnd(-14, 14), a: rnd(0, TAU) })) }); }
  const cans = world.props.filter(p => p.kind === 'trash');
  for (let i = 0; i < 3; i++) { const c = pick(cans); critters.push({ type: 'raccoon', x: c.x + 30, y: c.y + 20, target: c, state: 'sneak', t: rnd(15, 35), ang: 0, hissCD: 0 }); }
  if (night >= 2) for (let i = 0; i < (night >= 4 ? 2 : 1); i++) { const p = yardSpot(); critters.push({ type: 'skunk', x: p.x, y: p.y, state: 'walk', t: rnd(2, 5), ang: rnd(0, TAU), sprayed: false }); }
}

function updateCritters(dt) {
  const pd = c => dist(c.x, c.y, player.x, player.y);
  for (const c of critters) {
    if (c.dead) {
      if (pd(c) < 22) {
        c.gone = true;
        const packs = c.type === 'turkey' ? 2 : 1;
        player.bag = (player.bag || 0) + packs;
        sfx.grab();
        popup(c.x, c.y - 18, `${({ turkey: 'Turkey', rabbit: 'Rabbit' })[c.type] || 'Squirrel'} in the bag (+${packs} pack${packs > 1 ? 's' : ''})`, '#9be564', 1.6);
        if (c.type === 'squirrel') { G.squirrels = (G.squirrels || 0) + 1; objectiveEvent('squirrel'); unlock('squirrel'); }
        if (c.type === 'turkey') unlock('turkey');
        if (c.type === 'rabbit') { G.rabbits = (G.rabbits || 0) + 1; unlock('rabbit'); }
      }
      continue;
    }
    if (c.type === 'rabbit') {
      const spook = player.hidden ? 40 : player.crouch ? 70 : 130;
      if (c.state !== 'run' && pd(c) < spook) { c.state = 'run'; c.t = 1.6; c.ang = Math.atan2(c.y - player.y, c.x - player.x); }
      c.t -= dt;
      let spd = 0;
      if (c.state === 'run') { spd = 250; if (Math.random() < dt * 4) c.ang += rnd(-1, 1); if (c.t <= 0) { c.state = 'idle'; c.t = rnd(1, 3); } }
      else if (c.t <= 0) { c.t = rnd(1, 3); c.ang = rnd(0, TAU); c.hop = 0.3; }
      if (c.hop > 0) { c.hop -= dt; spd = 70; }
      if (spd) { const ox = c.x, oy = c.y; moveCircle(c, Math.cos(c.ang) * spd * dt, Math.sin(c.ang) * spd * dt, 6); if (dist(ox, oy, c.x, c.y) < spd * dt * 0.3) c.ang += Math.PI; }
    } else if (c.type === 'squirrel') {
      const spook = player.hidden ? 40 : player.crouch ? 65 : 115;
      if (c.state !== 'run' && pd(c) < spook) {
        const options = world.trees.filter(t => t !== c.tree && dist(t.x, t.y, c.x, c.y) < 320);
        c.tree = options.length ? pick(options) : c.tree;
        c.state = 'run';
        if (inView(c.x, c.y, 0)) { tone(2400, 0.05, 'square', 0.025); tone(2800, 0.05, 'square', 0.02, null, 0.06); popup(c.x, c.y - 14, 'chk-chk-chk!', '#d9b38c', 0.9); }
        makeNoise(c.x, c.y, 95 * noiseMult(), 'chitter', true);
      }
      if (c.state === 'run') {
        const d = dist(c.x, c.y, c.tree.x, c.tree.y);
        c.ang = Math.atan2(c.tree.y - c.y, c.tree.x - c.x);
        if (d < 6) { c.state = 'idle'; c.t = rnd(1, 3); } else { c.x += Math.cos(c.ang) * 230 * dt; c.y += Math.sin(c.ang) * 230 * dt; }
      } else {
        c.t -= dt;
        if (c.t <= 0) { c.t = rnd(0.8, 2.5); c.ang = rnd(0, TAU); c.hop = 0.25; }
        if (c.hop > 0) { c.hop -= dt; c.x += Math.cos(c.ang) * 60 * dt; c.y += Math.sin(c.ang) * 60 * dt; }
        if (dist(c.x, c.y, c.tree.x, c.tree.y) > 40) c.ang = Math.atan2(c.tree.y - c.y, c.tree.x - c.x);
      }
    } else if (c.type === 'turkey') {
      c.gobT -= dt;
      if (c.gobT <= 0) { c.gobT = rnd(6, 14); if (pd(c) < 700) { tone(420, 0.06, 'square', 0.03, 600); tone(380, 0.06, 'square', 0.03, 560, 0.08); tone(400, 0.08, 'square', 0.03, 300, 0.16); if (inView(c.x, c.y, 0)) popup(c.x, c.y - 20, 'gobble gobble', '#d9b38c', 1); } }
      if (c.state === 'walk' && !(c.strut > 0) && Math.random() < dt * 0.06) c.strut = 2.5;
      if (c.strut > 0) c.strut -= dt;
      const spook = player.hidden ? 50 : player.crouch ? 95 : 160;
      if (c.state !== 'run' && pd(c) < spook) { c.state = 'run'; c.t = 2; c.ang = Math.atan2(c.y - player.y, c.x - player.x); }
      c.t -= dt;
      const spd = c.state === 'run' ? 170 : 28;
      if (c.t <= 0) { c.state = 'walk'; c.t = rnd(2, 5); c.ang += rnd(-1.5, 1.5); }
      const ox = c.x, oy = c.y;
      moveCircle(c, Math.cos(c.ang) * spd * dt, Math.sin(c.ang) * spd * dt, 10);
      if (dist(ox, oy, c.x, c.y) < spd * dt * 0.3) c.ang += Math.PI * rnd(0.5, 1.5);
    } else if (c.type === 'crows') {
      if (c.flown) { c.t -= dt; if (c.t <= 0) { for (let k = 0; k < 200; k++) { const x = rnd(M + 30, W - M - 30), y = rnd(M + 30, H - M - 30); if (!world.blocked(x, y, 20) && dist(x, y, player.x, player.y) > 600) { c.x = x; c.y = y; break; } } c.flown = false; } continue; }
      for (const b of c.birds) { b.a += dt * rnd(-2, 2); b.dx += Math.cos(b.a) * dt * 6; b.dy += Math.sin(b.a) * dt * 6; b.dx = clamp(b.dx, -22, 22); b.dy = clamp(b.dy, -16, 16); }
      const trig = player.hidden ? 0 : player.crouch ? 55 : 105;
      if (pd(c) < trig) {
        c.flown = true; c.t = 40;
        for (let i = 0; i < 5; i++) tone(rnd(700, 900), 0.12, 'sawtooth', 0.04, rnd(500, 600), i * 0.07);
        popup(c.x, c.y - 20, 'CAW! CAW! CAW!', '#bbb', 1.4);
        for (const b of c.birds) particles.push({ x: c.x + b.dx, y: c.y + b.dy, vx: rnd(-260, 260), vy: rnd(-260, -80), t: 1.2, c: '#111', bird: true });
        makeNoise(c.x, c.y, 270 * noiseMult(), 'crows');
        hint('crows', 'Crows! Walking into a flock sends them up cawing, and everyone nearby hears it. Sneak around them.');
      }
    } else if (c.type === 'raccoon') {
      c.hissCD -= dt;
      if (pd(c) < 60 && c.hissCD <= 0) { c.hissCD = 4; tone(1800, 0.25, 'sawtooth', 0.02, 900); popup(c.x, c.y - 16, 'HSSSSS', '#bbb', 1); }
      const tg = c.target;
      const tx = tg.x + 18, ty = tg.y + 14;
      const d = dist(c.x, c.y, tx, ty);
      if (d > 4) { c.ang = Math.atan2(ty - c.y, tx - c.x); c.x += Math.cos(c.ang) * 50 * dt; c.y += Math.sin(c.ang) * 50 * dt; }
      c.t -= dt;
      if (c.t <= 0 && d < 30) {
        c.t = rnd(25, 45);
        if (!tg.down) {
          tg.down = 1;
          sfx.clang();
          if (inView(tg.x, tg.y, 100)) popup(tg.x, tg.y - 20, '*CRASH* (raccoon)', '#ffb36b', 1.4);
          makeNoise(tg.x, tg.y, 260 * noiseMult(), 'raccoon');
        }
        const standing = world.props.filter(p => p.kind === 'trash' && !p.down);
        if (standing.length) c.target = pick(standing);
      }
    } else if (c.type === 'skunk') {
      c.t -= dt;
      if (c.t <= 0) { c.t = rnd(2, 5); c.ang += rnd(-1.5, 1.5); }
      const ox = c.x, oy = c.y;
      moveCircle(c, Math.cos(c.ang) * 22 * dt, Math.sin(c.ang) * 22 * dt, 8);
      if (dist(ox, oy, c.x, c.y) < 0.2) c.ang += Math.PI;
      if (!c.sprayed && pd(c) < (player.crouch ? 28 : 48)) skunked(c);
    }
  }
  critters = critters.filter(c => !c.gone);
}

function skunked(c) {
  c.sprayed = true;
  G.stink = has('scent') ? 18 : 30;
  for (let i = 0; i < 24; i++) particles.push({ x: c.x, y: c.y, vx: rnd(-120, 120), vy: rnd(-120, 120), t: rnd(0.8, 1.6), c: '#a8d86b' });
  tone(200, 0.4, 'sawtooth', 0.04, 80);
  popup(player.x, player.y - 34, 'YOU GOT SKUNKED. Every deer can smell you now.', '#a8d86b', 2.6);
  unlock('skunked');
}

function drawCritters(now) {
  for (const c of critters) {
    if (!inView(c.x, c.y, 40)) continue;
    if (c.type === 'crows') {
      if (c.flown) continue;
      for (const b of c.birds) {
        ctx.save(); ctx.translate(c.x + b.dx, c.y + b.dy); ctx.rotate(b.a);
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(0, 0, 6, 3.5, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(5, 0, 2.5, 0, TAU); ctx.fill();
        ctx.fillStyle = '#d6a21e'; ctx.fillRect(7, -0.8, 3, 1.6);
        ctx.restore();
      }
      continue;
    }
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(c.ang || 0);
    if (c.dead) ctx.globalAlpha = 0.8;
    if (c.type === 'rabbit') {
      ctx.fillStyle = c.dead ? '#777' : '#b9ab98';
      ctx.beginPath(); ctx.ellipse(0, 0, 6.5, 4.5, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(6, 0, 3, 0, TAU); ctx.fill();
      ctx.fillStyle = '#d8ccbb'; ctx.beginPath(); ctx.ellipse(7, -3.5, 3.5, 1.2, -0.4, 0, TAU); ctx.ellipse(7, 3.5, 3.5, 1.2, 0.4, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-6.5, 0, 2, 0, TAU); ctx.fill();
    } else if (c.type === 'squirrel') {
      ctx.fillStyle = c.dead ? '#6a5a4a' : '#8a6a48';
      ctx.beginPath(); ctx.ellipse(0, 0, 6, 3.5, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(5, 0, 2.6, 0, TAU); ctx.fill();
      ctx.fillStyle = c.dead ? '#7a6a5a' : '#a3835c';
      ctx.beginPath(); ctx.ellipse(-8, 0, 5, 4, 0, 0, TAU); ctx.fill(); // fluffy tail
    } else if (c.type === 'turkey') {
      ctx.fillStyle = '#5a4030'; ctx.beginPath(); ctx.ellipse(0, 0, 11, 8, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#8a6a40';
      const fan = c.strut > 0 ? 1.8 : 1;
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.ellipse(-10 * fan, i * 3.5 * fan, 6 * fan, 2.5 * fan, i * 0.3, 0, TAU); ctx.fill(); } // tail fan
      ctx.fillStyle = '#3a6ea8'; ctx.beginPath(); ctx.arc(10, 0, 3.5, 0, TAU); ctx.fill();
      ctx.fillStyle = '#d33'; ctx.fillRect(12, -1, 3, 4);
    } else if (c.type === 'raccoon') {
      ctx.fillStyle = '#6b6b6b'; ctx.beginPath(); ctx.ellipse(0, 0, 9, 5.5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#222'; ctx.fillRect(4, -3, 5, 6); // mask
      ctx.fillStyle = '#ddd'; ctx.beginPath(); ctx.arc(9, 0, 2.5, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#333'; ctx.lineWidth = 3; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-17, 2); ctx.stroke(); ctx.setLineDash([]);
    } else if (c.type === 'skunk') {
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(0, 0, 8, 5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#eee'; ctx.fillRect(-8, -1.2, 16, 2.4);
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(-10, 0, 6, 5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#eee'; ctx.fillRect(-14, -1, 6, 2);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    if (c.dead && pd2(c) < 70) { ctx.fillStyle = '#9be564'; ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('walk over to grab', c.x, c.y - 14); }
  }
}
function pd2(c) { return dist(c.x, c.y, player.x, player.y); }

// ============================================================
// Fishing: stand at a pond's edge, press E, wait for the "!", press E again.
// ============================================================
function pondNear() {
  for (const p of world.ponds) {
    const cx = clamp(player.x, p.x, p.x + p.w), cy = clamp(player.y, p.y, p.y + p.h);
    if (dist(cx, cy, player.x, player.y) < 34) return p;
  }
  return null;
}
function tryFish() {
  const p = pondNear();
  if (!p) return false;
  const bx = clamp(player.x, p.x + 14, p.x + p.w - 14), by = clamp(player.y, p.y + 14, p.y + p.h - 14);
  player.fishing = { pond: p, t: rnd(2.5, 6), bite: 0, bx: bx + rnd(-10, 10), by: by + rnd(-10, 10) };
  tone(900, 0.08, 'sine', 0.04, 300);
  popup(player.x, player.y - 30, 'Line in the water... wait for the bite (E when you see !)', '#9ecbff', 2);
  hint('fish', 'Fishing: wait for the red "!" over the bobber, then press E fast. Moving cancels. You\'re a sitting duck while you wait.');
  return true;
}
function reelIn() {
  const f = player.fishing;
  player.fishing = null;
  if (f.bite <= 0) { popup(player.x, player.y - 30, 'Too early! It swam off.', '#ff9f6b', 1.4); return; }
  let catchName, packs;
  if (f.pond.koi && !campaign.flags.koi && night === 4) { catchName = 'a TAGGED HOA KOI. Proof!'; packs = 0; campaign.flags.koi = true; objectiveEvent('koi'); }
  else if (f.pond.koi) { catchName = 'a koi (Steve will love this)'; packs = 3; }
  else { const r = Math.random(); if (r < 0.1) { catchName = 'an old boot. Classic.'; packs = 0; } else if (r < 0.3) { catchName = 'a fat catfish'; packs = 2; } else { catchName = 'a largemouth bass'; packs = 1; } }
  player.bag = (player.bag || 0) + packs;
  sfx.deliver();
  popup(player.x, player.y - 30, `You caught ${catchName}${packs ? ` (+${packs} pack${packs > 1 ? 's' : ''})` : ''}`, '#9be564', 2.4);
  unlock('fisher');
  G.fish = (G.fish || 0) + 1;
}
function updateFishing(dt) {
  const f = player.fishing;
  if (!f) return;
  if (player.moving || player.carry || player.cooler) { player.fishing = null; popup(player.x, player.y - 30, 'Reeled in.', '#aaa', 0.8); return; }
  if (f.bite > 0) {
    f.bite -= dt;
    if (f.bite <= 0) { player.fishing = null; popup(player.x, player.y - 30, 'It got away!', '#ff9f6b', 1.4); }
  } else {
    f.t -= dt;
    if (f.t <= 0) { f.bite = 0.9; tone(1200, 0.06, 'square', 0.06); tone(1500, 0.06, 'square', 0.06, null, 0.08); }
  }
}

// ============================================================
// Story objectives (one optional goal per night)
// ============================================================
function setupObjective() {
  if (oneNightMode()) { G.objective = null; return; }
  const o = OBJECTIVES[night];
  G.objective = o ? Object.assign({ count: 0, done: false }, o) : null;
  if (G.objective && o.id === 'longbow' && campaign.weapons.longbow) G.objective = null;
}
function objectiveEvent(kind, arg) {
  const o = G.objective;
  if (!o || o.done) return;
  if ((o.id === 'sell' && kind === 'sell') || (o.id === 'squirrels' && kind === 'squirrel') || (o.id === 'koi' && kind === 'koi') ||
      (o.id === 'longbow' && kind === 'longbow') || (o.id === 'hosta' && kind === 'deliver' && arg && arg.legend)) {
    o.count++;
    if (o.count >= o.need) {
      o.done = true;
      G.earned += o.reward;
      campaign.flags[o.id] = true;
      sfx.win();
      banner(`OBJECTIVE COMPLETE: ${o.text}${o.reward ? ` (+$${o.reward})` : ''}`, '#7cf');
      unlock('story');
    }
  }
}
function objectivePlace() {
  const o = G && G.objective;
  if (!o || o.done) return null;
  if (o.place === 'garage') return world.garage;
  if (o.place === 'koi') { const p = world.ponds.find(q => q.koi); return { x: p.x + p.w / 2, y: p.y + p.h / 2 }; }
  if (o.id === 'sell') return { x: world.van.x + world.van.w / 2, y: world.van.y + world.van.h / 2 };
  return null;
}
function updateObjective() {
  const o = G.objective;
  if (!o || o.done) return;
  if (o.id === 'longbow' && dist(player.x, player.y, world.garage.x, world.garage.y) < 26) {
    campaign.weapons.longbow = true;
    campaign.weapon = 'longbow';
    sfx.deliver();
    popup(player.x, player.y - 34, 'GRANDPA\'S LONGBOW! Equipped. Quiet, true, and one-shots legends.', '#ffd166', 3);
    objectiveEvent('longbow');
    unlock('longbow');
    makeNoise(player.x, player.y, 120, 'garage', true);
  }
}

// ============================================================
// Story cutscenes
// ============================================================
let story = null;
function playScene(lines, done) {
  if (!lines || !lines.length) { done(); return; }
  story = { lines, i: 0, done, t: 0 };
  state = 'story';
}
function sceneFor(id, done) {
  if (campaign.seen[id]) { done(); return; }
  campaign.seen[id] = true;
  playScene(SCENES[id], done);
}
function advanceStory(skipAll) {
  if (!story) return;
  // First click finishes the typewriter line; the next one advances.
  if (!skipAll && story.t * 70 < story.lines[story.i][1].length) { story.t = 999; return; }
  if (skipAll || story.i >= story.lines.length - 1) { const d = story.done; story = null; d(); return; }
  story.i++; story.t = 0;
  sfx.grab();
}
function drawStory(now) {
  if (!story) return;
  const [who, text] = story.lines[story.i];
  const [name, color] = SPEAKERS[who] || SPEAKERS.narrator;
  const cx = VW / 2, bw = Math.min(720, VW - 32);
  ctx.fillStyle = 'rgba(5,8,14,0.9)'; ctx.fillRect(0, 0, VW, VH);
  if (story.jail) { ctx.fillStyle = 'rgba(120,125,135,0.5)'; for (let x = 20; x < VW; x += 46) ctx.fillRect(x, 0, 8, VH); ctx.fillRect(0, 40, VW, 10); ctx.fillRect(0, VH - 50, VW, 10); }
  // typewriter reveal
  story.t += 1 / 60;
  const shown = text.slice(0, Math.floor(story.t * 70));
  ctx.font = '18px system-ui, sans-serif';
  const lines = wrapLines(text, bw - (who === 'narrator' ? 40 : 120));
  const h = Math.max(130, lines.length * 26 + 70);
  const y = VH / 2 - h / 2;
  panel(cx - bw / 2, y, bw, h);
  let tx = cx - bw / 2 + 24;
  if (who !== 'narrator') {
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(cx - bw / 2 + 52, y + 54, 30, 0, TAU); ctx.fill();
    ctx.fillStyle = '#111'; ctx.font = 'bold 22px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(name[0], cx - bw / 2 + 52, y + 62);
    tx = cx - bw / 2 + 100;
    ctx.textAlign = 'left'; ctx.fillStyle = color; ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText(name, tx, y + 30);
  }
  ctx.textAlign = 'left'; ctx.font = who === 'narrator' ? 'italic 18px Georgia, serif' : '18px system-ui, sans-serif';
  ctx.fillStyle = who === 'narrator' ? '#ccc' : '#f2f2f2';
  let shownLeft = shown.length;
  lines.forEach((l, i) => {
    if (shownLeft <= 0) return;
    const part = l.slice(0, shownLeft);
    shownLeft -= l.length + 1;
    ctx.fillText(part, tx, y + (who === 'narrator' ? 40 : 58) + i * 26);
  });
  ctx.textAlign = 'center'; ctx.fillStyle = '#888'; ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(`${story.i + 1} / ${story.lines.length}  ·  ${inputKind() === 'touch' ? 'Tap to continue  ·  SKIP (top right) skips the scene' : inputKind() === 'pad' ? 'A continue  ·  B skip' : 'Click / Enter to continue  ·  Esc to skip'}`, cx, y + h + 26);
  if (touchMode) button(VW - 96, 14, 82, 34, 'SKIP ▶▶', () => advanceStory(true));
}

function progress() { return 1 - G.time / G.NIGHT; }
function dayFactor() { const p = progress(); return 1 + 0.65 * p * p; }

function updatePlayer(dt) {
  let mx = 0, my = 0;
  const useArrows = !twoP();
  if (keys.KeyW || (useArrows && keys.ArrowUp)) my -= 1;
  if (keys.KeyS || (useArrows && keys.ArrowDown)) my += 1;
  if (keys.KeyA || (useArrows && keys.ArrowLeft)) mx -= 1;
  if (keys.KeyD || (useArrows && keys.ArrowRight)) mx += 1;
  if (pad.connected) { mx += pad.mx; my += pad.my; }
  if (touch.stickId !== null) { mx += touch.mx; my += touch.my; }
  player.crouch = !!(keys.ShiftLeft || (!twoP() && keys.ShiftRight) || keys.KeyC || pad.crouch || touch.crouch);
  let spd = player.crouch ? 85 : 175;
  if (player.carry) spd *= has('sled') ? 0.8 : 0.6;
  if (player.cooler) spd *= 0.85;
  if (G.buzz > 0) spd *= 1.25;
  if (onSand()) { spd *= 0.6; hint('sand', 'Sand traps slow you down and show your footprints. Watchers follow fresh tracks.'); }
  // Sprint (hold X / R3): fast, loud, drains stamina
  const wantSprint = (keys.KeyX || pad.sprint) && !player.crouch && !player.carry && !player.cooler && !player.drawing && (mx || my);
  if (player.stamina === undefined) player.stamina = 100;
  if (player.stamina <= 0) player.winded = true; else if (player.stamina > 25) player.winded = false;
  player.sprinting = !!wantSprint && player.stamina > 0 && !player.winded;
  if (player.sprinting) { spd *= 1.45; player.stamina = Math.max(0, player.stamina - 28 * dt); hint('sprint', 'Sprinting is fast but LOUD: bigger footstep noise, and deer spook from farther. Watch your stamina bar.'); }
  else player.stamina = Math.min(100, player.stamina + 14 * dt);
  if (player.drawing) {
    spd *= 0.45;
    const was = player.draw;
    player.draw = Math.min(1, player.draw + dt / weapon().draw);
    if (was < 1 && player.draw >= 1) tone(1400, 0.04, 'square', 0.04);   // full draw
    player.holdT = player.draw >= 1 ? (player.holdT || 0) + dt : 0;
  }
  const len = Math.hypot(mx, my);
  player.moving = len > 0;
  // Ice: momentum carries you, and running can make you slip
  const onIce = world.ice.some(r => player.x > r.x && player.x < r.x + r.w && player.y > r.y && player.y < r.y + r.h);
  const wantX = len > 0 ? mx / len * spd : 0, wantY = len > 0 ? my / len * spd : 0;
  if (onIce) {
    const k = Math.min(1, dt * 1.6);
    player.vx = lerp(player.vx || 0, wantX, k); player.vy = lerp(player.vy || 0, wantY, k);
    if (len > 0 && !player.crouch && Math.hypot(player.vx, player.vy) > 120 && Math.random() < dt * 0.5) slipOnIce();
    if (!len && Math.hypot(player.vx, player.vy) > 5) moveCircle(player, player.vx * dt, player.vy * dt, PLAYER_R);
  } else { player.vx = wantX; player.vy = wantY; }
  if (len > 0) {
    moveCircle(player, player.vx * dt, player.vy * dt, PLAYER_R);
    player.step += dt * spd * 0.05;
    if (G.weather === 'snow' || onSand()) {
      G.printD += spd * dt * (len > 1 ? 1 : len);
      const onRoad = world.roads.some(r => player.x > r.x && player.x < r.x + r.w && player.y > r.y && player.y < r.y + r.h);
      if (G.printD > 22 && !onRoad) {
        G.printD = 0; G.printSide *= -1;
        const a = player.moveAng, side = G.printSide * 5;
        G.prints.push({ x: player.x + Math.cos(a + Math.PI / 2) * side, y: player.y + Math.sin(a + Math.PI / 2) * side, ang: a, t: player.crouch ? 45 : 90, born: G.playT });
        if (G.prints.length > 400) G.prints.shift();
        hint('snow', 'You\'re leaving footprints in the snow. Watchers who spot them will follow the trail. Stick to plowed roads, or sneak (prints fade faster).');
      }
    }
    if (!player.crouch && Math.random() < dt * 10) particles.push({ x: player.x + rnd(-6, 6), y: player.y + rnd(-6, 6), vx: rnd(-15, 15), vy: rnd(-15, 15), t: 0.5, c: world.inWoods(player.x, player.y) ? '#5a4a30' : '#7a7a70' });
    player.moveAng = Math.atan2(my, mx);
  }
  if (pad.connected && (pad.aim !== null || len > 0)) {
    // Right stick aims; otherwise aim where you're walking. Keep the virtual mouse in sync for pinecones.
    player.ang = pad.aim !== null ? pad.aim : Math.atan2(my, mx);
    mouse.x = player.x - cam.x + Math.cos(player.ang) * 260;
    mouse.y = player.y - cam.y + Math.sin(player.ang) * 260;
  } else {
    const wx = mouse.x + cam.x, wy = mouse.y + cam.y;
    player.ang = Math.atan2(wy - player.y, wx - player.x);
  }
  player.cd = Math.max(0, player.cd - dt);

  player.hidden = false;
  player.inGrass = world.grass.some(g => dist(g.x, g.y, player.x, player.y) < g.r - 4);
  const canHide = !player.carry || has('tarp');
  if (canHide) for (const b of world.bushes) if (dist(b.x, b.y, player.x, player.y) < b.r - 3) { player.hidden = true; break; }
  if (canHide && player.inGrass && player.crouch) player.hidden = true;
  if (player.inGrass && !player.crouch) hint('grass', 'Tall grass: hold Shift (sneak) while standing in it and you\'re hidden.');
  player.shadow = world.houses.some(h => player.x > h.x + 14 && player.x < h.x + h.w + 26 && player.y > h.y + h.h && player.y < h.y + h.h + 52);
  player.lit = false;
  for (const l of world.lights) if (dist(l.x, l.y, player.x, player.y) < 150) { player.lit = true; break; }
  for (const f of world.floods) if (f.on > 0 && dist(f.x, f.y, player.x, player.y) < 220) player.lit = true;

  // Pick up arrows lying around
  for (const a of arrows) {
    if (a.flying || a.t !== Infinity) continue;
    if (dist(a.x, a.y, player.x, player.y) < 24) { a.t = 0; player.arrows++; sfx.grab(); }
  }
  if (player.hidden) hint('bush', 'You\'re in cover. Watchers only spot you up close. (Dragging a deer? You can\'t hide without Earl\'s Camo Tarp.)');

  if (player.carry) {
    const d = player.carry;
    const back = player.moving ? player.moveAng + Math.PI : player.ang + Math.PI;
    const tx = player.x + Math.cos(back) * 30, ty = player.y + Math.sin(back) * 30;
    d.x = lerp(d.x, tx, Math.min(1, dt * 10));
    d.y = lerp(d.y, ty, Math.min(1, dt * 10));
    d.ang = back + Math.PI;
    G.dragPathT = (G.dragPathT || 0) - dt;
    if (G.dragPathT <= 0) { G.dragPathT = 0.5; const sh = world.shed; G.dragPath = findPath(player.x, player.y, sh.x + sh.w / 2, sh.y + sh.h + 22); }
    if (player.moving && Math.random() < dt * 14) { marks.push({ x: d.x + rnd(-5, 5), y: d.y + rnd(-5, 5) }); if (marks.length > 500) marks.shift(); }
    if (nearTruck()) deliver();
  }
  // Small game in your bag goes straight into the freezer at home.
  if (player.bag > 0 && nearTruck()) {
    G.freezer += player.bag;
    popup(player.x, player.y - 30, `+${player.bag} small-game pack${player.bag > 1 ? 's' : ''} into the freezer`, '#9be564', 1.6);
    player.bag = 0;
  }
  if (G.police && nearTruck() && !player.carry && !(tyler && tyler.carry)) {
    unlock('getaway');
    if (watchers.some(w => w.type === 'cop' && w.parked && dist(w.x, w.y, player.x, player.y) < 300)) unlock('footchase');
    endNight(G.delivered >= G.quota ? 'win' : 'escaped');
  }
}

function deliver() {
  const d = player.carry;
  player.carry = null;
  deer.splice(deer.indexOf(d), 1);
  G.delivered++;
  if (d.buck) G.bucks++;
  const pts = d.poached ? 0 : (d.legend ? 1000 : d.buck ? 120 + (d.points || 8) * 10 : 100) * (d.albino ? 3 : 1);
  if (d.albino) { unlock('albino'); popup(player.x, player.y - 96, 'An albino deer. Grandpa would\'ve let it walk, Dale.', '#f1ece2', 3); }
  const packs = d.legend ? 8 : d.buck ? 4 : 3;
  G.nightScore += pts;
  G.freezer += packs;
  player.arrows++; // pull the arrow back out
  sfx.deliver();
  popup(player.x, player.y - 30, (d.legend ? 'OLD HOSTA IS IN THE FREEZER!' : pick(QUIPS.deliver)) + ` (+${pts} pts, +${packs} venison packs)`, '#9be564');
  hint('freezer', 'Venison goes in your freezer. To turn it into cash, press E at the shed to pack a cooler, then sell it to Sketchy Steve across town. Earl will also buy leftovers between nights, cheap.');
  objectiveEvent('deliver', d);
  if (d.buck) unlock('trophy');
  if (d.buck && !d.legend && d.points >= 10) { campaign.racks = (campaign.racks || []).concat(d.points); popup(player.x, player.y - 52, `Kept the ${d.points}-point rack. Earl pays for those.`, '#e0b83a', 2.2); }
  // Ghost streak: deliveries in a row without anyone spotting you
  G.streak = (G.streak || 0) + 1;
  if (G.streak >= 2) { const bonus = 50 * (G.streak - 1); G.nightScore += bonus; popup(player.x, player.y - 74, `👻 Ghost streak ×${G.streak} (+${bonus})`, '#b8e0ff', 2); }
  if (G.streak >= 4) unlock('streak');
  if (d.legend) { unlock('legend'); G.legendDone = true; banner('LEGEND BAGGED: OLD HOSTA', '#ffd166'); }
  if (G.delivered === G.quota) { banner(`QUOTA MET! ${ctl('press') === 'tap' ? 'Tap' : 'Press'} ${ctl('leave')} at your ${world.golf ? 'truck' : 'shed'} to call it a night, or keep hunting`, '#9be564'); tone(523, 0.18, 'triangle', 0.08); tone(659, 0.18, 'triangle', 0.08, null, 0.12); tone(784, 0.35, 'triangle', 0.09, null, 0.24); rumble(200, 0.4); }
}

function updateFloods(dt) {
  for (const f of world.floods) {
    f.on -= dt;
    const d = dist(f.x, f.y, player.x, player.y);
    const trigger = player.hidden ? 0 : player.crouch ? 85 : 150;
    if (d < trigger && los(f.x, f.y, player.x, player.y)) {
      if (f.on <= 0) {
        sfx.flood();
        popup(f.x, f.y - 20, '*CLICK*', '#fff3b0', 1.2);
        makeNoise(f.x, f.y, 180, 'flood');
      }
      f.on = 6;
    }
  }
}

let rain = [];
function updateRain(dt) {
  const snow = G.weather === 'snow';
  while (rain.length < 160) rain.push({ x: rnd(0, VW), y: rnd(-VH, 0), v: rnd(700, 1000) });
  for (const r of rain) {
    const v = snow ? r.v * 0.09 : r.v;
    r.y += v * dt; r.x += snow ? Math.sin(r.y / 40 + r.v) * 20 * dt : -r.v * 0.15 * dt;
    if (r.y > VH) { r.y = rnd(-60, 0); r.x = rnd(0, VW + 100); }
  }
}

function updateArrows(dt) {
  const hits0 = G.hits;
  for (const a of arrows) {
    if (!a.flying) { a.t -= dt; continue; }
    a.life -= dt;
    for (const d of deer) if (!d.dead) { const dd = dist(a.x, a.y, d.x, d.y); if (dd < (a.nearest || 1e9)) a.nearest = dd; }
    const dx = a.vx * dt, dy = a.vy * dt, x2 = a.x + dx, y2 = a.y + dy;
    let bestT = 1, hit = null;
    for (const s of world.solids) {
      if (s.noLos) continue;
      const t = segRect(a.x, a.y, x2, y2, s);
      if (t >= 0 && t < bestT) { bestT = t; hit = { k: 'wall' }; }
    }
    for (const tr of world.trees) {
      if (Math.abs(tr.x - a.x) > 80 || Math.abs(tr.y - a.y) > 80) continue;
      const t = segCircle(a.x, a.y, x2, y2, tr.x, tr.y, tr.trunk + 3);
      if (t >= 0 && t < bestT) { bestT = t; hit = { k: 'wall' }; }
    }
    for (const d of deer) {
      if (d.dead) continue;
      const t = segCircle(a.x, a.y, x2, y2, d.x, d.y, DEER_R + 3);
      if (t >= 0 && t < bestT) { bestT = t; hit = { k: 'deer', d }; }
    }
    for (const w of watchers) {
      if (w.type === 'drone' || w.type === 'k9' || w.type === 'window' || w.type === 'cam') continue;
      const t = segCircle(a.x, a.y, x2, y2, w.x, w.y, w.cart || w.type === 'cop' ? 22 : 15);
      if (t >= 0 && t < bestT) { bestT = t; hit = { k: 'person', w }; }
    }
    for (const c of critters) {
      if (c.dead || !(c.type === 'squirrel' || c.type === 'turkey' || c.type === 'skunk' || c.type === 'rabbit')) continue;
      const t = segCircle(a.x, a.y, x2, y2, c.x, c.y, c.type === 'turkey' ? 12 : 8);
      if (t >= 0 && t < bestT) { bestT = t; hit = { k: 'critter', c }; }
    }
    a.x += dx * bestT; a.y += dy * bestT;
    if (hit) {
      a.flying = false;
      if (hit.k === 'critter') {
        const c = hit.c;
        a.t = Infinity;
        if (c.type === 'skunk') { if (dist(c.x, c.y, player.x, player.y) < 260) skunked(c); popup(c.x, c.y - 16, 'Bad idea.', '#a8d86b', 1.4); c.sprayed = true; }
        else if (c.type === 'turkey' && a.power < 0.35) { c.state = 'run'; c.t = 2; popup(c.x, c.y - 16, 'Too weak!', '#ff9f6b', 1); }
        else { c.dead = true; G.hits++; sfx.hit(); popup(c.x, c.y - 16, ({ turkey: 'Turkey down!', rabbit: 'Rabbit!' })[c.type] || 'Squirrel!', '#9be564', 1.2); }
      } else if (hit.k === 'deer') {
        const d = hit.d;
        if (a.power < 0.35) {
          // Weak shot: glances off and the deer bolts.
          a.t = Infinity;
          fleeFrom(d, player.x, player.y);
          sfx.thunk();
          popup(d.x, d.y - 26, 'Too weak! Hold the draw longer.', '#ff9f6b', 1.6);
        } else if (a.power < (a.killAt || 0.7) && !d.legend && !d.wounded) {
          // Wounded: it runs, bleeds, and goes down a few seconds later. Follow the trail.
          d.wounded = rnd(6, 10);
          G.hits++;
          a.t = 0;
          sfx.hit();
          fleeFrom(d, player.x, player.y);
          d.t = 99;
          popup(d.x, d.y - 26, 'Wounded! Follow the blood trail.', '#ff8a8a', 2);
          hint('wound', 'A half-draw wounds the deer. It runs off and leaves a red blood trail. Follow it to find where it went down.');
        } else if (d.hp > (a.legendDmg || 1)) {
          d.hp -= a.legendDmg || 1;
          G.hits++;
          a.t = 0;
          sfx.hit();
          cam.shake = 3;
          fleeFrom(d, player.x, player.y);
          d.t = 4;
          popup(d.x, d.y - 30, 'HE\'S STILL UP! One more!', '#ffd166', 2);
        } else {
          d.dead = true; d.state = 'dead';
          fillTag(d);
          G.hits++;
          sfx.hit();
          rumble(160, 0.7);
          if (noiseMult() < 0.5) unlock(gothNoiseMult() < 1 ? 'openingact' : 'leafblower');
          (G.kills = G.kills || []).push({ x: d.x, y: d.y, buck: d.buck });
          cam.shake = d.legend ? 8 : 4;
          if (d.buck) G.slowmo = d.legend ? 1.2 : 0.7;
          for (let i = 0; i < 12; i++) particles.push({ x: d.x, y: d.y, vx: rnd(-80, 80), vy: rnd(-80, 80), t: rnd(0.3, 0.7), c: i % 3 ? '#c9b28a' : '#9b1c28' });
          for (let i = 0; i < 6; i++) drops.push({ x: d.x + rnd(-10, 10), y: d.y + rnd(-10, 10), r: rnd(2, 4) });
          popup(d.x, d.y - 26, d.legend ? 'YOU GOT OLD HOSTA!!!' : d.buck ? `${d.points}-pointer! ${pick(QUIPS.buck)}` : pick(QUIPS.kill), '#9be564', 1.8);
          a.t = 0;
          makeNoise(d.x, d.y, 150 * noiseMult(), 'thrash');
          hint('drag', 'Deer down! Walk over and press E to drag it back to your shed (yellow arrow points the way).');
        }
      } else if (hit.k === 'person') {
        const w = hit.w;
        a.t = Infinity;
        sfx.alert();
        popup(w.x, w.y - 36, pick(QUIPS.arrow), '#ff6b6b');
        w.stare = 2; w.lastX = player.x; w.lastY = player.y;
        if (w.type === 'cop') G.arrest = Math.min(1, G.arrest + 0.5);
        else if (!G.police) { G.sus = Math.min(100, G.sus + 40); popup(w.x, w.y - 54, '+40 suspicion (stray arrow)', '#ff6b6b', 1.8); }
        investigate(w, player.x, player.y);
      } else sfx.thunk();
    } else if (a.life <= 0) a.flying = false;
    if (!a.flying && a.t === Infinity) {
      // Nudge arrows that stopped inside a wall out to where the player can reach them.
      const o = { x: a.x - Math.cos(a.ang) * 4, y: a.y - Math.sin(a.ang) * 4 };
      moveCircle(o, 0, 0, 6);
      a.x = o.x; a.y = o.y;
    }
  }
  arrows = arrows.filter(a => a.flying || a.t > 0);
  // near miss: the arrow stopped within a deer's length of one, and nothing was hit this frame
  for (const a of arrows) if (!a.flying && a.nearest !== undefined && !a.missSaid) { a.missSaid = true; if (G.hits === hits0 && a.nearest < 38) popup(a.x, a.y - 18, 'Just missed!', '#ffb347', 1.2); }
}

function fleeFrom(d, x, y) {
  d.state = 'flee';
  d.goal = null;
  d.t = rnd(2, 3);
  d.ang = Math.atan2(d.y - y, d.x - x) + rnd(-0.4, 0.4);
  // Herd panic: nearby deer bolt a moment later.
  for (const o of deer) {
    if (o === d || o.dead || o.state === 'flee' || o.scare) continue;
    if (dist(o.x, o.y, d.x, d.y) < 200) o.scare = { x, y, t: rnd(0.2, 0.55) };
  }
}

function updateFawn(d, dt) {
  const f = d.fawn;
  if (d.dead) {
    // mom is down: the fawn bolts for the woods and is gone
    f.gone += dt;
    const a = Math.atan2(f.y - player.y, f.x - player.x);
    f.x += Math.cos(a) * 200 * dt; f.y += Math.sin(a) * 200 * dt;
    if (f.gone > 3) d.fawn = null;
    return;
  }
  const tx = d.x - Math.cos(d.ang) * 26 + Math.cos(d.ang + Math.PI / 2) * 8, ty = d.y - Math.sin(d.ang) * 26 + Math.sin(d.ang + Math.PI / 2) * 8;
  const k = Math.min(1, dt * (d.state === 'flee' ? 8 : 3));
  f.x = lerp(f.x, tx, k); f.y = lerp(f.y, ty, k); f.ang = d.ang;
}

function updateDeer(d, dt) {
  if (d.fawn) updateFawn(d, dt);
  if (d.dead) return;
  d.t -= dt;
  d.bob += dt * (d.state === 'flee' ? 14 : 4);
  if (d.scare) { d.scare.t -= dt; if (d.scare.t <= 0) { fleeFrom(d, d.scare.x, d.scare.y); d.scare = null; } }
  if (d.wounded) {
    d.wounded -= dt;
    d.dropT = (d.dropT || 0) - dt;
    if (d.dropT <= 0) { d.dropT = 0.12; drops.push({ x: d.x + rnd(-5, 5), y: d.y + rnd(-5, 5), r: rnd(2, 4) }); }
    if (d.wounded <= 0) {
      d.dead = true; d.state = 'dead'; d.wounded = 0; d.tracked = true; fillTag(d);
      if (dist(d.x, d.y, player.x, player.y) < 700) { tone(90, 0.25, 'sine', 0.08, 50); popup(d.x, d.y - 24, 'It went down here.', '#ffd166', 2); for (let i = 0; i < 10; i++) particles.push({ x: d.x, y: d.y, vx: rnd(-60, 60), vy: rnd(-60, 20), t: 0.6, c: '#8a6a3a' }); }
      return;
    }
    if (d.state !== 'flee') { d.state = 'flee'; d.t = 99; }
  }
  const pd = dist(d.x, d.y, player.x, player.y);
  let spook = player.hidden ? 70 : player.crouch ? 115 : 215;
  if (player.carry) spook += 40;
  if (player.sprinting) spook += 60;
  if (has('boots')) spook *= 0.8;
  if (G.weather === 'fog') spook *= 0.85;
  if (d.legend) spook *= 1.4;
  // Wind: if your scent blows toward the deer, it smells you from much farther.
  const toDeer = Math.atan2(d.y - player.y, d.x - player.x);
  const downwind = Math.cos(angDiff(G.wind, toDeer)) > 0.75;
  let smellR = downwind ? (has('scent') ? spook * 1.15 : spook * 1.8) : 0;
  if (G.stink > 0) smellR = Math.max(smellR, spook * 1.7); // skunked: they smell you from every direction
  // Alert tier: just outside spooking range the deer freezes and stares. Keep moving and it bolts.
  if (d.state !== 'flee' && !player.hidden && pd >= spook && pd < spook * 1.45) {
    d.alertT = Math.max(0, (d.alertT || 0) + (player.moving ? (player.crouch ? 0.5 : 1.2) : -0.4) * dt);
    if (d.alertT > 1.5) { d.alertT = 0; fleeFrom(d, player.x, player.y); }
  } else if (d.alertT > 0) d.alertT = Math.max(0, d.alertT - dt);
  if (d.state !== 'flee' && (pd < spook || pd < smellR)) {
    if (pd >= spook && G.snortCD <= 0 && inView(d.x, d.y, 0)) { G.snortCD = 6; sfx.snort(); popup(d.x, d.y - 22, '*SNORT* (smelled you)', '#c9b28a', 1.6); hint('wind', 'That deer SMELLED you. Watch the wind arrow (top left). Approach with the wind blowing toward you, not away.'); }
    fleeFrom(d, player.x, player.y);
  }
  let spd = 0;
  if (d.state === 'graze') {
    if (d.t <= 0) {
      d.state = 'walk'; d.t = rnd(1.5, 4); d.ang += rnd(-1.2, 1.2);
      // Corn piles beat everything.
      let corn = null, cd = 900;
      for (const c of G.corn) { const dd = dist(d.x, d.y, c.x, c.y); if (dd < cd) { cd = dd; corn = c; } }
      if (corn && Math.random() < 0.9) {
        if (cd > 25) { d.goal = { x: corn.x, y: corn.y }; d.t = Math.min(14, cd / 30); }
        else { d.state = 'graze'; d.t = rnd(6, 12); }
      }
      // Deer love hostas: often wander toward the nearest garden.
      else if (Math.random() < 0.45) {
        let best = null, bd = 800;
        for (const g of world.gardens) { const gd = dist(d.x, d.y, g.x + g.w / 2, g.y + g.h / 2); if (gd < bd) { bd = gd; best = g; } }
        if (best && bd > 30) { d.goal = { x: best.x + best.w / 2, y: best.y + best.h / 2 }; d.t = Math.min(12, bd / 30); }
      }
    }
  }
  else if (d.state === 'walk') {
    spd = 42;
    if (d.goal) {
      // Steer toward the goal; after bumping into something, side-step briefly then re-aim.
      if (d.detour > 0) d.detour -= dt; else d.ang = Math.atan2(d.goal.y - d.y, d.goal.x - d.x);
      if (dist(d.x, d.y, d.goal.x, d.goal.y) < 20) { d.goal = null; d.t = 0; }
    }
    if (d.t <= 0) { d.goal = null; d.state = 'graze'; d.t = (world.gardens.some(g => d.x > g.x && d.x < g.x + g.w && d.y > g.y && d.y < g.y + g.h) || G.corn.some(c => dist(c.x, c.y, d.x, d.y) < 40)) ? rnd(6, 12) : rnd(2, 6); }
  }
  else if (d.state === 'lured') {
    const ld = dist(d.x, d.y, d.lure.x, d.lure.y);
    d.ang = Math.atan2(d.lure.y - d.y, d.lure.x - d.x);
    spd = ld > 150 ? 70 : 0;
    if (ld <= 150 || d.t <= 0) { d.state = 'graze'; d.t = rnd(4, 8); }
  }
  else if (d.state === 'flee') { spd = d.wounded ? 170 : d.legend ? 290 : 235; d.ang += rnd(-0.12, 0.12); if (d.t <= 0) { d.state = 'graze'; d.t = rnd(1, 3); } }
  if (d.alertT > 0.05 && d.state !== 'flee') { spd = 0; turnTo(d, Math.atan2(player.y - d.y, player.x - d.x), dt * 3); }
  if (spd > 0) {
    const ox = d.x, oy = d.y;
    moveCircle(d, Math.cos(d.ang) * spd * dt, Math.sin(d.ang) * spd * dt, DEER_R);
    if (dist(ox, oy, d.x, d.y) < spd * dt * 0.35) {
      if (d.goal) { d.ang += (Math.random() < 0.5 ? 1 : -1) * Math.PI / 2; d.detour = 0.9; }
      else d.ang += Math.PI * rnd(0.5, 1.5);
    }
  }
}

function updateDogs(dt) {
  for (const g of world.dogs) {
    g.cd -= dt; g.bark -= dt;
    const d = dist(g.ax, g.ay, player.x, player.y);
    const trigger = g.quiet ? 0 : (player.hidden ? 0 : player.crouch ? 95 : 150) * (has('boots') ? 0.6 : 1);
    if (d < trigger) {
      const a = Math.atan2(player.y - g.ay, player.x - g.ax);
      g.ang = a;
      g.x = lerp(g.x, g.ax + Math.cos(a) * 45, dt * 5); g.y = lerp(g.y, g.ay + Math.sin(a) * 45, dt * 5);
      if (g.cd <= 0) {
        g.cd = 2.2; g.bark = 0.5;
        sfx.bark();
        popup(g.x, g.y - 20, pick(['WOOF! WOOF!', 'BARK BARK!', 'ARF ARF ARF!']), '#ffb36b', 1.2);
        makeNoise(g.x, g.y, 420, 'bark');
      }
    } else {
      g.x = lerp(g.x, g.ax + Math.cos(performance.now() / 1500 + g.ax) * 12, dt * 2);
      g.y = lerp(g.y, g.ay, dt * 2);
    }
  }
}

function stepToward(w, x, y, s, trail) {
  const dx = x - w.x, dy = y - w.y, d = Math.hypot(dx, dy);
  if (d <= s) { w.x = x; w.y = y; return true; }
  w.moveAng = Math.atan2(dy, dx);
  w.x += dx / d * s; w.y += dy / d * s;
  if (trail) {
    const last = w.trail.length ? w.trail[w.trail.length - 1] : w.home;
    if (last && dist(last.x, last.y, w.x, w.y) > 30) w.trail.push({ x: w.x, y: w.y });
  }
  return false;
}

function updateDrone(w, dt) {
  w.poly = null;
  if (w.down > 0) {
    w.down -= dt;
    if (w.down <= 0) popup(w.x, w.y - 20, 'Drone back online. (Gary found the reset button)', '#b8e0ff', 2);
    return;
  }
  w.crashT -= dt;
  if (w.crashT <= 0) {
    w.crashT = rnd(35, 55); w.down = rnd(5, 8); w.state = 'patrol';
    sfx.clang();
    popup(w.x, w.y - 20, '*CRASH* ...GARY!', '#ffb36b', 2);
    return;
  }
  let tgt = w.target;
  if (w.state === 'investigate' && w.inv) { tgt = w.inv; w.invT -= dt; if (w.invT <= 0) w.state = 'patrol'; }
  if (w.seeing) tgt = { x: player.x, y: player.y };
  const d = dist(w.x, w.y, tgt.x, tgt.y);
  if (d < 20 && tgt === w.target) {
    // pick a new random spot over the subdivision (Gary flies like he drives).
    // On concert nights he mostly hovers over his daughter's garage show, yelling through the drone speaker.
    const c = G.goth && G.goth.concert;
    if (c && Math.random() < 0.75) {
      w.target = { x: clamp(c.x + rnd(-160, 160), M + 40, W - M - 40), y: clamp(c.y + rnd(-160, 160), M + 40, H - M - 40) };
      if (!c.garyYelled || Math.random() < 0.15) { c.garyYelled = true; popup(w.x, w.y - 22, pick(['Gary (drone speaker): "RAVEN. IT IS FOUR IN THE MORNING."', 'Gary (drone speaker): "Is this a NOISE VIOLATION, young lady?"', 'Gary (drone speaker): "...the bass is actually pretty good."']), '#b8e0ff', 2.6); }
    } else w.target = { x: rnd(M + 100, W - M - 100), y: rnd(M + 100, H - M - 100) };
  } else if (d > 4) {
    const wob = Math.sin(G.playT * 3 + w.x * 0.01) * 0.6;
    const a = Math.atan2(tgt.y - w.y, tgt.x - w.x) + wob;
    const s = (w.seeing ? 0.8 : 1) * w.speed * dt;
    w.x += Math.cos(a) * s; w.y += Math.sin(a) * s;
    w.ang = a;
  }
}

function droneSees(w) {
  if (w.down > 0 || player.hidden) return false;
  if (dist(w.x, w.y, player.x, player.y) > w.range * weatherVis()) return false;
  // Tree canopies block the view from above.
  for (const t of world.trees) if (dist(t.x, t.y, player.x, player.y) < t.canopy) return false;
  return true;
}

function updateK9(w, dt) {
  w.poly = null;
  if (w.eating > 0) { w.eating -= dt; return; }
  // Follow Dale's scent trail exactly, breadcrumb by breadcrumb.
  let tgt = G.trail[w.ti];
  if (!tgt || dist(w.x, w.y, player.x, player.y) < 140 && los(w.x, w.y, player.x, player.y)) tgt = player;
  const d = dist(w.x, w.y, tgt.x, tgt.y);
  const s = w.speed * dt;
  if (d <= s) { w.x = tgt.x; w.y = tgt.y; if (tgt !== player) w.ti++; }
  else { w.ang = Math.atan2(tgt.y - w.y, tgt.x - w.x); w.x += Math.cos(w.ang) * s; w.y += Math.sin(w.ang) * s; }
  w.barkT -= dt;
  if (Math.random() < dt * 8) particles.push({ x: w.x + Math.cos(w.ang) * 16, y: w.y + Math.sin(w.ang) * 16, vx: rnd(-20, 20), vy: rnd(-20, 20), t: 0.4, c: '#ddd' });
  if (w.barkT <= 0) { w.barkT = rnd(2, 3.5); sfx.bark(); popup(w.x, w.y - 22, pick(['ARF! ARF!', 'AWOOOO!', '*sniff sniff* WOOF!']), '#9ecbff', 1); }
  if (dist(w.x, w.y, player.x, player.y) < 22 && los(w.x, w.y, player.x, player.y)) { G.arrest = 2; G.captor = w; } // caught (stays >= 1 after this frame's decay)
}

function spawnK9() {
  let cop = watchers.find(w => w.type === 'cop');
  const start = G.trail[0] || { x: player.x, y: player.y };
  const k = makeWatcher('k9', [start], { speed: 158, fov: 0.01, range: 1, pause: 0, rate: 0, label: 'K-9 Unit "Sarge"' });
  k.x = cop ? cop.x : world.vx[0] + 60; k.y = cop ? cop.y : M + 10; k.ti = 0; k.barkT = 1;
  G.trail.unshift({ x: k.x, y: k.y });
  watchers.push(k);
  banner('K-9 UNIT DEPLOYED: Sarge is following your scent. Bushes won\'t help. Get to your shed!', '#9ecbff');
}

function updateWatcher(w, dt) {
  w.quipCD -= dt;
  if (w.p2) { updateP2Cart(w, dt); return; }
  if (w.type === 'cop') copFoot(w);
  if (w.type === 'cam') { w.ang = w.baseAng + Math.sin(G.playT * 0.5 + w.x) * 0.35; computeCone(w); return; }
  if (w.type === 'drone') { updateDrone(w, dt); return; }
  if (w.type === 'k9') { updateK9(w, dt); return; }
  if (w.type === 'window') {
    if (w.asleep > 0) { w.asleep -= dt; if (w.asleep <= 0) w.awakeT = rnd(10, 15); w.poly = null; return; }
    w.awakeT -= dt;
    if (w.awakeT <= 0 && !w.seeing) { w.asleep = rnd(6, 10); w.poly = null; return; }
  }
  if (w.eating > 0) { w.eating -= dt; w.poly = null; return; }
  if (w.seeing && w.type !== 'cop') { turnTo(w, Math.atan2(player.y - w.y, player.x - w.x), 5 * dt); computeCone(w); return; }
  if (w.stare > 0 && w.type !== 'cop') { w.stare -= dt; turnTo(w, Math.atan2(w.lastY - w.y, w.lastX - w.x), 4 * dt); computeCone(w); return; }
  if (w.look > 0 && w.state === 'patrol') { w.look -= dt; turnTo(w, w.lookAng, 4 * dt); computeCone(w); return; }
  if (w.state === 'investigate') {
    w.invT -= dt;
    w.routeT = (w.routeT || 0) - dt;
    const d = dist(w.x, w.y, w.inv.x, w.inv.y);
    // Chasing a moving target: re-plan every 0.6s
    if (w.routeT <= 0 && d > w.stopDist && w.route && w.route.length && dist(w.route[w.route.length - 1].x, w.route[w.route.length - 1].y, w.inv.x, w.inv.y) > 40) {
      const r = findPath(w.x, w.y, w.inv.x, w.inv.y); if (r) w.route = r; w.routeT = 0.6;
    }
    if (d > w.stopDist && w.route && w.route.length) {
      followRoute(w, w.speed * 0.85, dt);
      turnTo(w, w.seeing ? Math.atan2(w.inv.y - w.y, w.inv.x - w.x) : w.moveAng, 4 * dt);
      if (dist(w.x, w.y, w.inv.x, w.inv.y) <= w.stopDist) w.route = [];
    } else {
      turnTo(w, Math.atan2(w.inv.y - w.y, w.inv.x - w.x), 4 * dt);
      if (d <= w.stopDist || !w.route || !w.route.length) { w.ang += Math.sin(w.invT * 3) * dt * 1.5; if (w.invT > 2.5) w.invT = 2.5; }
    }
    if (w.invT <= 0) { w.state = 'return'; w.route = w.home ? findPath(w.x, w.y, w.home.x, w.home.y) : null; }
  } else if (w.state === 'return') {
    if (w.route && w.route.length) { if (followRoute(w, w.speed, dt)) { w.state = 'patrol'; } }
    else {
      // no route (shouldn't happen): fall back to walking straight home
      const tgt = w.home || w.path[w.pi];
      if (stepToward(w, tgt.x, tgt.y, w.speed * dt)) w.state = 'patrol';
    }
    turnTo(w, w.moveAng, 4 * dt);
  } else if (w.wait > 0) {
    w.wait -= dt; w.scan += dt;
    w.ang = w.baseAng + Math.sin(w.scan * 1.6) * 0.9;
  } else {
    const p = w.path[w.pi];
    if (stepToward(w, p.x, p.y, w.speed * dt)) { w.pi = (w.pi + 1) % w.path.length; w.wait = w.pause; w.baseAng = w.ang; w.scan = 0; }
    turnTo(w, w.moveAng, 3.5 * dt);
  }
  computeCone(w);
}

function coneRange(w) { return w.range * dayFactor() * weatherVis() * (G ? moonFx().range : 1) * (G && G.flash > 0 ? 1.5 : 1) * (w.yawn > 0 ? 0.6 : 1); }

function computeCone(w) {
  const R = coneRange(w);
  const rects = [], circles = [];
  for (const s of gridQuery(w.x - R, w.y - R, w.x + R, w.y + R, 's')) {
    if (s.noLos || s.x > w.x + R || s.x + s.w < w.x - R || s.y > w.y + R || s.y + s.h < w.y - R) continue;
    rects.push(s);
  }
  for (const t of gridQuery(w.x - R - 20, w.y - R - 20, w.x + R + 20, w.y + R + 20, 't')) if (Math.abs(t.x - w.x) < R + 20 && Math.abs(t.y - w.y) < R + 20) circles.push(t);
  const N = 26, pts = [];
  for (let i = 0; i <= N; i++) {
    const a = w.ang - w.fov / 2 + w.fov * i / N;
    const l = castRay(w.x, w.y, a, R, { rects, circles });
    pts.push({ x: w.x + Math.cos(a) * l, y: w.y + Math.sin(a) * l });
  }
  w.poly = pts;
}

function canSee(w) {
  if (w.type === 'drone') return droneSees(w);
  if (w.type === 'k9') return false;
  if (w.asleep > 0 || w.eating > 0) return false;
  const d = dist(w.x, w.y, player.x, player.y);
  let range = coneRange(w);
  if (player.crouch) range *= 0.65;
  if (player.lit) range *= 1.35;
  if (player.carry && !has('tarp')) range *= 1.25;
  if (player.cooler) range *= 1.15;
  if (G.buzz > 0) range *= 1.1;
  if (has('ghillie')) range *= 0.8;
  if (player.shadow && !player.lit) range *= 0.75;
  if (d > range) return false;
  if (player.hidden && d > 55) return false;
  const a = Math.atan2(player.y - w.y, player.x - w.x);
  if (Math.abs(angDiff(w.ang, a)) > w.fov / 2 && d > 38) return false;
  return los(w.x, w.y, player.x, player.y);
}

function detection(dt) {
  let anySeen = false, copSees = false;
  for (const w of watchers) {
    w.seeing = canSee(w);
    if (!w.seeing) { w.wasSeeing = false; continue; }
    anySeen = true;
    const d = dist(w.x, w.y, player.x, player.y);
    w.lastX = player.x; w.lastY = player.y; w.stare = 1.4;
    if (!w.wasSeeing) {
      G.timesSpotted++;
      G.streak = 0;
      rumble(120, 0.4);
      sfx.alert();
      if (w.type === 'ex') G.exSaw = true;
      if (w.type === 'cam') { G.camClips = (G.camClips || 0) + 1; unlock('oncamera'); }
      if (w.type === 'watch') { tone(2600, 0.12, 'sine', 0.06, 3200); tone(2600, 0.25, 'sine', 0.06, 3000, 0.15); }
      if (w.cart) { tone(420, 0.12, 'square', 0.05); tone(420, 0.2, 'square', 0.05, null, 0.16); }
      if (w.quipCD <= 0 || w.type === 'cop') { voice(w.type); popup(w.x, w.y - 36, pick(QUIPS[w.type]), w.type === 'ex' ? '#ff9ad5' : w.type === 'cop' ? '#9ecbff' : '#ffe9a8'); w.quipCD = 4; }
      hint('spotted', 'SPOTTED! Break line of sight: duck behind a house, a fence or into a bush. The meter drains when nobody sees you.');
      // HOA and Neighborhood Watch carry walkie-talkies: everyone nearby looks your way.
      if (w.type !== 'ex' && w.type !== 'cop') {
        for (const o of watchers) {
          if (o === w || o.type === 'cop' || o.seeing || dist(o.x, o.y, player.x, player.y) > 1000) continue;
          o.look = 3; o.lookAng = Math.atan2(player.y - o.y, player.x - o.x);
        }
        if (G.radioCD <= 0) { G.radioCD = 8; sfx.radio(); popup(w.x, w.y - 56, pick(RADIO), '#b8e0ff', 2.2); }
      }
    }
    w.wasSeeing = true;
    if (w.type === 'cop') {
      copSees = true;
      if (!G.police) callPolice(w);
      investigate(w, player.x, player.y);
      G.arrest += dt / 1.4; G.captor = w;
      if (d < 34) G.arrest += dt * 3;   // very close: about a third of a second to react
    } else if (!G.police) {
      const close = 1 + (1 - d / coneRange(w));
      let rate = w.rate;
      // Darlene is used to Dale skulking around his own shed. Empty-handed near home, she mostly just sighs.
      const s = world.shed;
      if (w.type === 'ex' && !player.carry && !player.cooler && !player.drawing && dist(player.x, player.y, s.x + s.w / 2, s.y + s.h / 2) < 170) {
        rate *= 0.12;
        G.exNagCD -= dt;
        if (G.exNagCD <= 0) { G.exNagCD = 8; popup(w.x, w.y - 36, pick(['Dale. It\'s 5 AM. Go to bed.', 'Is that a BOW behind your back?', 'Stay on your side of the yard, Dale.', 'Why are you awake?']), '#ff9ad5', 2); }
      }
      G.sus = Math.min(100, G.sus + rate * close * diff().sus * dt);
      if (G.sus >= 100) callPolice(w);
    } else {
      // Neighbors point the cops your way.
      let nearest = null, nd = 1e9;
      for (const c of watchers) if (c.type === 'cop') { const cd = dist(c.x, c.y, player.x, player.y); if (cd < nd) { nd = cd; nearest = c; } }
      if (nearest && nearest.state !== 'investigate') investigate(nearest, player.x, player.y);
    }
  }
  if (G.anySeen && !anySeen) G.ghost = { x: player.x, y: player.y, t: 3 };
  if (anySeen) G.ghost = null;
  G.anySeen = anySeen;
  if (anySeen) G.unseen = 0; else G.unseen += dt;
  if (!G.police && G.unseen > 1.5) G.sus = Math.max(0, G.sus - 7 * dt);
  if (!copSees) G.arrest = Math.max(0, G.arrest - dt * 0.35);
  if (G.arrest >= 1 && (campaign.items.burrito || 0) > 0) {
    // The breakfast burrito defense.
    campaign.items.burrito--;
    G.arrest = 0;
    // the burrito goes to whoever actually caught you (else the nearest officer)
    let cop = G.captor && watchers.includes(G.captor) ? G.captor : null, cd = 1e9;
    if (!cop) for (const c of watchers) if (c.type === 'cop' || c.type === 'k9') { const dd = dist(c.x, c.y, player.x, player.y); if (dd < cd) { cd = dd; cop = c; } }
    G.captor = null;
    if (cop) {
      cop.eating = 15; cop.seeing = false; if (cop.type === 'cop') cop.state = 'return';
      popup(cop.x, cop.y - 40, cop.type === 'k9' ? 'Sarge ate the burrito. Good boy. ...Sarge? SARGE!' : 'Is that... a breakfast burrito? ...Get outta here, Dale.', '#9ecbff', 3.5);
    }
    sfx.buy();
    banner('🌯 BURRITO BRIBE! You have 15 seconds. Run.', '#ffd166');
    unlock('burrito');
  }
  if (G.arrest >= 1) { G.arrest = 1; endNight('arrested'); }
}

function callPolice(w) {
  if (!campaign.daily) campaign.heat = 1; // tomorrow night starts with a patrol car out
  G.police = true;
  G.policeT = 7;
  G.copTimer = 50;
  G.sus = 100;
  G.caller = w.type;
  sfx.alert();
  popup(w.x, w.y - 50, w.type === 'ex' ? QUIPS.callEx : w.type === 'cop' ? 'Dispatch, I have eyes on the orange vest! Send everybody.' : QUIPS.callHoa, '#ff6b6b', 3.5);
  banner(world.golf ? '911 CALLED! Cops arrive in 7 seconds. Get back to Earl\'s truck!' : G.delivered >= G.quota || oneNightMode() ? '911 CALLED! Cops arrive in 7 seconds. Get back to your shed!' : `911 CALLED! Cops in 7 seconds. Get to your shed (you're ${G.quota - G.delivered} deer short, so escaping ends the night).`, '#ff5a5a');
  hint('police', 'The cops are coming. Get back inside your shed to escape. If a cruiser\'s spotlight holds on you, the ARREST bar fills.');
}

function updatePolice(dt) {
  if (!G.police) return;
  if (G.policeT > 0) { G.policeT -= dt; if (G.policeT <= 0) spawnCop(); return; }
  // Record a scent trail for the K-9
  G.trailT -= dt;
  if (G.trailT <= 0) { G.trailT = 0.3; G.trail.push({ x: player.x, y: player.y }); }
  G.policeTime = (G.policeTime || 0) + dt;
  G.scanT = (G.scanT ?? 3) - dt;
  if (G.scanT <= 0) { G.scanT = rnd(9, 15); popup(player.x, player.y - 60, pick(SCANNER), '#9ecbff', 2.6); tone(1800, 0.03, 'square', 0.02); }
  if (!G.k9Spawned && G.policeTime > 25) { G.k9Spawned = true; spawnK9(); }
  G.copTimer -= dt;
  if (G.copTimer <= 0 && G.cops < 4) { spawnCop(); G.copTimer = 45; }
  G.sirenT -= dt;
  if (G.sirenT <= 0) {
    G.sirenT = 0.55;
    let nd = 1e9;
    for (const c of watchers) if (c.type === 'cop') nd = Math.min(nd, dist(c.x, c.y, player.x, player.y));
    const vol = clamp(1 - nd / 1400, 0, 1) * 0.05;
    if (vol > 0.003) sfx.siren(vol);
    if (nd < 700) G.sirenCap = 1.2;
  }
}

function endNight(reason) {
  if (G.settled) return;
  G.settled = true;
  G.endReason = reason;
  if (!oneNightMode()) campaign.truckDeer = (has('truckbed') && reason !== 'arrested') ? clamp(G.delivered - G.quota, 0, 2) : 0;
  if (reason === 'arrested') rumble(500, 1);
  const timeBonus = reason === 'win' ? Math.floor(G.time) * 2 : 0;
  const stealthBonus = (reason === 'win' && !G.police) ? 150 : 0;
  G.timeBonus = timeBonus; G.stealthBonus = stealthBonus;
  G.nightScore += timeBonus + stealthBonus;
  // Stars: 1 = quota, 2 = no cops, 3 = never spotted
  G.stars = reason === 'win' ? 1 + (G.police ? 0 : 1) + (G.timesSpotted === 0 ? 1 : 0) : 0;
  G.earned += G.stars * 25;
  campaign.cash += G.earned;
  campaign.earnedTotal = (campaign.earnedTotal || 0) + G.earned;
  // What's in the freezer stays in the freezer. A cooler or bag you were carrying comes home too (unless you got arrested).
  if (reason !== 'arrested') G.freezer += (player.cooler || 0) + (player.bag || 0);
  campaign.freezer = G.freezer;
  if (G.exSaw) campaign.exSightings = (campaign.exSightings || 0) + 1;
  player.fishing = null;
  campaign.stars[night - 1] = Math.max(campaign.stars[night - 1] || 0, G.stars);
  campaign.score += G.nightScore;
  const newDeer = G.delivered - (G.fromTruck || 0);   // truck-bed deer were counted last night
  campaign.totalDeer += newDeer;
  if (campaign.score > best) { best = campaign.score; store.set('hs_best', best); }
  if (reason === 'win') {
    if (G.timesSpotted === 0) unlock('ghost');
    if (!G.exSaw) unlock('exproof');
  }
  if (G.shots >= 3 && G.hits === G.shots) unlock('robin');
  const life = store.get('hs_life', {});
  const addL = (k, v) => { life[k] = (life[k] || 0) + v; };
  addL('nights', 1); addL('deer', newDeer); addL('bucks', G.bucks); addL('arrows', G.shots); addL('hits', G.hits);
  addL('sold', G.soldPacks || 0); addL('squirrels', G.squirrels || 0); addL('fish', G.fish || 0); addL('rabbits', G.rabbits || 0);
  addL('cash', G.earned); if (reason === 'arrested') addL('busted', 1); if (G.legendDone) addL('hosta', 1);
  store.set('hs_life', life);
  if (night <= 5 && !oneNightMode()) { const bs = store.get('hs_stars', []); bs[night - 1] = Math.max(bs[night - 1] || 0, G.stars); store.set('hs_stars', bs); }
  if (reason === 'win' && night === 5 && !G.tracked) unlock('snowghost');
  if (reason === 'win' && night >= 7) unlock('nightowl');
  if (reason === 'win' && settings.gothVest && gothBinderDone()) unlock('gothdad');
  G.resultAt = performance.now();
  G.news = buildNews(reason);
  G.voicemail = pick(G.exSaw ? VOICEMAILS.saw : VOICEMAILS.clean);
  player.drawing = false;
  if (!oneNightMode()) store.set('hs_reached', Math.max(store.get('hs_reached', 1), Math.min(5, night + (reason === 'win' ? 1 : 0))));
  if (night > 5) store.set('hs_endless_best', Math.max(store.get('hs_endless_best', 0), reason === 'win' ? night : night - 1));
  if (reason === 'win' && night !== 5 && !oneNightMode()) { state = 'nightdone'; sfx.win(); saveNext(); }
  else {
    if (reason === 'arrested' && night < 5 && !oneNightMode() && !campaign.courtUsed) {
      // First arrest of the season: you get your day in court.
      state = 'over'; sfx.lose();
      playScene(SCENES.busted, () => { G.court = null; state = 'court'; });
      story.jail = true;
      return;
    }
    if (reason === 'win' && !oneNightMode()) unlock('season');
    if (reason === 'win' && night === 5) {
      if ([0, 1, 2, 3, 4].every(i => (campaign.stars[i] || 0) >= 3)) unlock('allstars');
      if (!campaign.spent) unlock('thrifty');
    }
    if (campaign.daily) { const dd = store.get('hs_daily', {}); dd[campaign.daily] = Math.max(dd[campaign.daily] || 0, campaign.score); store.set('hs_daily', dd); unlock('daily'); restoreRandom(); }
    if (campaign.map === 'golf') { store.set('hs_golf_best', Math.max(store.get('hs_golf_best', 0), campaign.score)); if (reason !== 'arrested') unlock('golfer'); }
    if (campaign.map === 'cul' || campaign.map === 'random') store.set('hs_' + campaign.map + '_best', Math.max(store.get('hs_' + campaign.map + '_best', 0), campaign.score));
    if (!oneNightMode()) { recordScore(); clearSave(); }
    state = 'over'; reason === 'win' ? sfx.win() : sfx.lose();
    if (reason === 'win' && night === 5) {
      if (campaign.cash >= CABIN_GOAL) unlock('cabin');
      playScene(buildEnding(campaign), () => { state = 'over'; });
    } else if (reason === 'arrested' && night <= 5) playScene(SCENES.busted, () => { state = 'over'; });
  }
}

function saveGame() { if (oneNightMode()) return; store.set('hs_save', { night, campaign }); }
// Between nights (results and Earl's shop): Continue starts the next night with everything kept.
function saveNext() { if (oneNightMode()) return; store.set('hs_save', { night: night + 1, campaign }); }
function clearSave() { if (previewMode) return; try { localStorage.removeItem('hs_save'); } catch (e) { /* no storage */ } }
function loadGame() {
  restoreRandom();
  const s = store.get('hs_save', null);
  if (!s || !s.campaign) return false;
  night = s.night;
  campaign = Object.assign(freshCampaign(), s.campaign);
  startNight();
  return true;
}
function startAtNight(n) {
  restoreRandom();
  night = n;
  campaign = freshCampaign();
  campaign.cash = (n - 1) * 150; // head start so later nights are fair
  startNight();
}
function startEndless() {
  night = 6;
  startNight();
}

VOICEMAILS.saw.push('Dale. Gary says you\'re on the HOA newsletter. Again. Front page.', 'I could hear you DRAGGING something past my window at 5 AM. Please explain.');
VOICEMAILS.clean.push('Quiet night, huh? Too quiet. Stay out of my hydrangeas.', 'Tyler says you\'re "basically a ninja." Please don\'t encourage him.');
STEVE_LINES.push('Steve: "My cousin\'s brother-in-law says venison\'s up. Or down. One of those."', 'Steve: "If anyone asks, this is a mobile library."', 'Steve: "Cash is king. Venison is... duke? Earl? No, Earl\'s the bait guy."');
function buildNews(reason) {
  let headline;
  if (G.legendDone) headline = 'LEGENDARY BUCK "OLD HOSTA" VANISHES; GARDEN CLUB HOLDS VIGIL';
  else if (reason === 'arrested') headline = 'LOCAL MAN ARRESTED IN HOSTA BED';
  else if (G.police) headline = 'POLICE CHASE "ORANGE MENACE" THROUGH ESTATES. SUSPECT AT LARGE';
  else if (G.timesSpotted === 0) headline = pick(['DEER POPULATION MYSTERIOUSLY DECLINING; RESIDENTS BAFFLED', 'HOSTA LOSSES AT RECORD LOW; GARDEN CLUB SUSPICIOUS', 'NOBODY SAW ANYTHING, AND THAT\'S WHAT WORRIES LINDA']);
  else headline = `HOA REPORTS ${G.timesSpotted} "ORANGE BLUR" SIGHTING${G.timesSpotted > 1 ? 'S' : ''} OVERNIGHT`;
  const fines = G.timesSpotted * 250 + G.shots * 50;
  if (G.camClips) return { headline, lines: [`Doorbell footage (${G.camClips} clip${G.camClips > 1 ? 's' : ''}) shows "an orange blur, possibly a man, possibly a large traffic cone."`, `Treasurer Gary Pfister estimates $${fines.toLocaleString()} in fines "if we ever catch him."`] };
  const lines = [
    `Treasurer Gary Pfister estimates $${fines.toLocaleString()} in fines "if we ever catch him."`,
    pick([
      'Linda Vance reminds residents that Bylaw 14.3 is "not a suggestion."',
      'Todd from Neighborhood Watch says he "almost had him."',
      'The Garden Club reports record-low hosta losses. Coincidence?',
      'Reminder: trash cans must be out of sight by 7 PM. This means you, Block 4.',
    ]),
  ];
  return { headline, lines };
}

function updateCam(dt) {
  // Hold R (or RB on a gamepad) to look ahead toward your aim
  const look = state === 'play' && (keys.KeyR || pad.look) ? 260 : 0;
  const lx = player.x + Math.cos(player.ang) * look, ly = player.y + Math.sin(player.ang) * look;
  const tx = W > VW ? clamp(lx - VW / 2, 0, W - VW) : (W - VW) / 2;
  const ty = H > VH ? clamp(ly - VH / 2, 0, H - VH) : (H - VH) / 2;
  const k = Math.min(1, dt * 8);
  cam.x = lerp(cam.x, tx, k); cam.y = lerp(cam.y, ty, k);
  cam.shake = Math.max(0, cam.shake - dt * 20);
}
