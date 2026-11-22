'use strict';
// Curfew Buck play bot: a goal-driven bot that plays every mode the way a person would.
// It sneaks up on deer, shoots, drags them home, sells to Steve, shops, goes to court, retries failed
// nights and plays whole seasons. It reports crashes, stuck states, a player stuck on the map, broken
// numbers, saves that resume in the wrong place, and how each night went.
// It plays like a person, not a perfect machine: it takes a moment to react when someone looks its way, its aim
// wobbles (so it misses), it ducks into bushes, throws pinecones to pull a neighbor off a deer, detours for
// notices, stops to look around, and follows Steve's order for the night. Season runs print a play diary.   /*human18*/
// Open http://localhost:8080/bot.html (?quick=1 for a shorter run, ?only=<name> for one scenario).
// the game's own loop would play too: the bot drives every frame itself
frame = function () {};
(function playBot() {
  const qs = new URLSearchParams(location.search);
  const QUICK = qs.get('quick') === '1', ONLY = qs.get('only'); window.BOTDEBUG = qs.get('debug') === '1';
  const DT = 1 / 30;
  const issues = new Map();
  const note = (kind, where, detail) => { const k = kind + '|' + where + '|' + detail; const e = issues.get(k); if (e) e.count++; else issues.set(k, { kind, where, detail, count: 1 }); };
  const runs = [];
  const saved = {};
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); saved[k] = localStorage.getItem(k); } } catch (e) { /* none */ }
  muted = true;
  const R = mulberry32(4242);
  const bad = v => typeof v !== 'number' || !isFinite(v);
  const out = document.getElementById('results');
  const key = (code, type = 'keydown') => window.dispatchEvent(new KeyboardEvent(type, { code, key: code.replace(/^Key|^Digit/, ''), bubbles: true }));
  const press = code => { key(code, 'keydown'); key(code, 'keyup'); };
  function setSize(w, h) { cv.style.width = w + 'px'; cv.style.height = h + 'px'; resize(); }
  function clearMove() { for (const k of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'KeyX', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftRight']) keys[k] = false; }
  function clickButton(re) { render(performance.now()); const b = uiButtons.find(x => re.test(x.label || '')); if (b) { b.fn(); return true; } return false; }

  // ---------------------------------------------------------------- the bot's brain (one night)
  const bot = { path: null, pathT: 0, goal: null, lastPos: null, still: 0, unstick: 0, aimT: 0, plan: 'hunt', threat: null, threatAt: 0, react: 0.4, aimErr: null, releaseAt: 0.9, coneCD: 0, pauseT: 0 };
  function goTo(tx, ty, crouch) {
    bot.pathT -= DT;
    if (!bot.path || bot.pathT <= 0 || !bot.goal || dist(bot.goal.x, bot.goal.y, tx, ty) > 40) {
      bot.path = findPath(player.x, player.y, tx, ty, 20000) || [{ x: tx, y: ty }];
      bot.pathT = 0.8; bot.goal = { x: tx, y: ty };
    }
    // move on to the next waypoint only once the straight line there is clear (cutting a corner wedges you on it)
    while (bot.path.length > 1 && dist(player.x, player.y, bot.path[0].x, bot.path[0].y) < 18 && (dist(player.x, player.y, bot.path[0].x, bot.path[0].y) < 5 || walkable(player.x, player.y, bot.path[1].x, bot.path[1].y))) bot.path.shift();
    const wp = bot.path[0] || bot.goal;
    let dx = wp.x - player.x, dy = wp.y - player.y;
    if (bot.unstick > 0) { bot.unstick -= DT; dx = bot.ux; dy = bot.uy; }
    clearMove();
    // steer along the line to the waypoint: only press the minor axis when the angle needs it (8-way keys at 45° clip corners)
    const ax = Math.abs(dx), ay = Math.abs(dy);
    if (dx > 6 && ax > ay * 0.41) keys.KeyD = true; if (dx < -6 && ax > ay * 0.41) keys.KeyA = true;
    if (dy > 6 && ay > ax * 0.41) keys.KeyS = true; if (dy < -6 && ay > ax * 0.41) keys.KeyW = true;
    keys.ShiftLeft = !!crouch;
    return dist(player.x, player.y, tx, ty);
  }
  function aimAt(x, y) { aimBy = 'mouse'; mouse.x = x - cam.x; mouse.y = y - cam.y; }
  const nearest = (list, x, y) => list.slice().sort((a, b) => dist(a.x, a.y, x, y) - dist(b.x, b.y, x, y))[0];
  function brain(label) {
    if (player.fishing) { interact(); return; }
    const t = G.time, short = G.quota - G.delivered;
    const shed = world.shed, sx = shed.x + shed.w / 2, sy = shed.y + shed.h / 2 + 30;
    // stuck detection: pressing keys but not moving
    const moving = keys.KeyW || keys.KeyA || keys.KeyS || keys.KeyD;
    if (bot.lastPos && moving && dist(bot.lastPos.x, bot.lastPos.y, player.x, player.y) < 0.5) bot.still += DT; else bot.still = 0;
    bot.lastPos = { x: player.x, y: player.y };
    // also stuck: sliding back and forth on the same spot for 5 s
    bot.winT = (bot.winT || 0) + DT;
    if (!bot.win || !moving) { bot.win = { x: player.x, y: player.y }; bot.winT = 0; }
    else if (bot.winT > 5) { if (dist(bot.win.x, bot.win.y, player.x, player.y) < 24) bot.still = 5; bot.win = { x: player.x, y: player.y }; bot.winT = 0; }
    if (bot.still > 4) {
      const cell = Math.round(player.x / 100) + ',' + Math.round(player.y / 100); bot.stuckAt = bot.stuckAt || {}; bot.stuckAt[cell] = (bot.stuckAt[cell] || 0) + 1; bot.wiggles = (bot.wiggles || 0) + 1;
      if (bot.stuckAt[cell] === 3) note('stuck on the map', label, `Dale at ${Math.round(player.x)},${Math.round(player.y)} heading for ${bot.goal ? Math.round(bot.goal.x) + ',' + Math.round(bot.goal.y) : '?'} (${bot.plan})`);
      bot.still = 0; bot.unstick = 0.8; const a = R() * TAU; bot.ux = Math.cos(a) * 50; bot.uy = Math.sin(a) * 50; bot.path = null;
    }
    // 1. carrying a deer: take it home (deliver happens on arrival)
    if (player.carry) {
      if (rushOpen()) { const v = world.van; bot.plan = 'drag to Steve\'s van'; goTo(v.x + v.w / 2, v.y + v.h + 20, false); return; }
      bot.plan = 'drag home'; goTo(sx, sy, false); return;
    }
    // a person stops now and then to look around
    if (bot.pauseT > 0) { bot.pauseT -= DT; clearMove(); keys.ShiftLeft = true; return; }
    if (!G.police && !player.drawing && R() < DT * 0.035) { bot.pauseT = 0.6 + R() * 1.2; bot.plan = 'look around'; return; }
    // 2. a cooler: sell it to Steve
    if (player.cooler) {
      bot.plan = 'sell cooler'; const v = world.van;
      if (G.police) { goTo(sx, sy); if (nearTruck()) interact(); return; }   // no selling with a roadblock out
      if (goTo(v.x + v.w / 2, v.y + v.h + 30) < 100 && nearVan()) interact();
      return;
    }
    // 2b. stealth: a watcher close and facing Dale (or suspicion climbing): crouch and slip away from them
    if (!G.police && !bot.reckless) {
      let threat = null, td = 1e9;
      for (const w of watchers) {
        if (w.asleep > 0 || w.type === 'cop' || w.type === 'k9' || !w.poly) continue;
        if ((['cam', 'window'].includes(w.type) || bot.braveT > 0) && !w.seeing) continue;   // a camera never looks away: a person stops hiding from it
        const dd = dist(w.x, w.y, player.x, player.y), r = (w.range || 240) + 70;
        if (dd > r) continue;
        const facing = Math.abs(angDiff(w.ang, Math.atan2(player.y - w.y, player.x - w.x))) < (w.fov || 1.2) / 2 + 0.35;
        if ((facing || w.seeing) && dd < td) { td = dd; threat = w; }
      }
      // reaction time: a person needs a beat to notice someone has turned their way
      if (threat !== bot.threat) { bot.threat = threat; bot.threatAt = G.playT; bot.react = 0.25 + R() * 0.45; }
      if (threat && G.playT - bot.threatAt < bot.react && G.sus < 55) threat = null;
      bot.braveT = (bot.braveT || 0) - DT;
      if (bot.plan === 'hide in a bush') bot.hideT = (bot.hideT || 0) + DT; else bot.hideT = 0;
      if (bot.hideT > 8) { bot.hideT = 0; bot.braveT = 6; threat = null; }   // hid long enough: move on
      if (threat || (G.sus > 55 && !(bot.braveT > 0))) {
        const w0 = threat || nearest(watchers.filter(q => q.type !== 'cop'), player.x, player.y);
        // a bush nearby that's further from them: duck into it
        const bush = w0 && !player.carry && nearest(world.bushes.filter(b => dist(b.x, b.y, player.x, player.y) < 230 && walkable(player.x, player.y, b.x, b.y) && dist(b.x, b.y, w0.x, w0.y) > dist(player.x, player.y, w0.x, w0.y) - 10), player.x, player.y);
        if (bush) { bot.plan = 'hide in a bush'; bot.evades = (bot.evades || 0) + 1; if (player.drawing) player.drawing = false; if (player.hidden && G.sus > 5) { clearMove(); keys.ShiftLeft = true; } else goTo(bush.x, bush.y, true); return; }
        const w = threat || watchers.filter(q => q.type !== 'cop').sort((a, b) => dist(a.x, a.y, player.x, player.y) - dist(b.x, b.y, player.x, player.y))[0];
        if (w) {
          bot.plan = 'evade ' + (w.label || w.type); bot.evades = (bot.evades || 0) + 1;
          if (player.drawing) player.drawing = false;
          const a = Math.atan2(player.y - w.y, player.x - w.x);
          // step out of the cone sideways and back, toward a spot that's open
          for (const off of [0.9, -0.9, 0.4, -0.4, 1.6, -1.6]) {
            const ex = player.x + Math.cos(a + off) * 120, ey = player.y + Math.sin(a + off) * 120;
            if (ex > 40 && ey > 40 && ex < W - 40 && ey < H - 40 && clearOf(ex, ey, 16)) { goTo(ex, ey, true); return; }
          }
        }
      }
    }
    // 3. quota met, cops coming, or dawn close: go home and end the night
    // with the cops out, keep hunting while the lockdown clock allows; head home with time to spare
    const homeD = dist(player.x, player.y, sx, sy), runHome = homeD / 150 + 12;
    const copsClose = G.police && (G.policeT <= 0 && ((G.lockT ?? 80) < runHome || watchers.some(w => (w.type === 'cop' || w.type === 'k9') && dist(w.x, w.y, player.x, player.y) < 320)));
    const leave = quotaMet() || copsClose || t < 25 || (bot.forceFail && t < G.NIGHT * 0.6);
    if (leave) {
      bot.plan = 'go home';
      if (goTo(sx, sy, false) < 90) { if (bot.forceFail || quotaMet() || copsClose || t < 25) { press('KeyQ'); press('KeyQ'); } }
      return;
    }
    // 3b. a loose HOA notice or gossip note close by: go pick it up
    const loot = nearest([...(G.notices || []), ...(G.gossip || [])].filter(n => !n.got && dist(n.x, n.y, player.x, player.y) < 260), player.x, player.y);
    if (loot && !deer.some(d => d.dead && !d.carried)) { bot.plan = 'pick up a note'; goTo(loot.x, loot.y, true); return; }
    // 4. a downed deer: grab it
    const down = deer.filter(d => d.dead && !d.carried).sort((a, b) => dist(a.x, a.y, player.x, player.y) - dist(b.x, b.y, player.x, player.y))[0];
    if (down) { bot.plan = 'grab deer'; if (goTo(down.x, down.y, false) < 40) interact(); return; }
    // 5. out of arrows: pick one up
    if (player.arrows <= 0) {
      const a = arrows.filter(q => !q.flying && q.t === Infinity).sort((p, q) => dist(p.x, p.y, player.x, player.y) - dist(q.x, q.y, player.x, player.y))[0];
      if (a) { bot.plan = 'fetch arrow'; goTo(a.x, a.y); return; }
      bot.plan = 'no arrows: go home'; goTo(sx, sy); if (nearTruck()) { press('KeyQ'); press('KeyQ'); } return;
    }
    // 6. a freezer worth selling, early in the night: pack a cooler
    if (G.freezer >= 3 && !G.police && t > G.NIGHT * 0.5 && !bot.sold && G.delivered >= Math.min(1, G.quota)) {
      bot.plan = 'pack cooler'; if (goTo(sx, sy) < 80) { interact(); bot.sold = true; } return;
    }
    // 7. hunt the nearest live deer: sneak close, stop, draw, shoot
    const wantBuck = G.goal && G.goal.id === 'trophy' && G.bucks < G.goal.need && G.tags.buck > 0;
    const buck = wantBuck && nearest(deer.filter(d => !d.dead && d.buck && !d.legend), player.x, player.y);
    const live = (buck && dist(buck.x, buck.y, player.x, player.y) < 1800 ? buck : null) || deer.filter(d => !d.dead && d.state !== 'flee').sort((a, b) => dist(a.x, a.y, player.x, player.y) - dist(b.x, b.y, player.x, player.y))[0]
      || deer.filter(d => !d.dead).sort((a, b) => dist(a.x, a.y, player.x, player.y) - dist(b.x, b.y, player.x, player.y))[0];
    if (!live) { bot.plan = 'no deer: wait'; clearMove(); return; }
    const d = dist(live.x, live.y, player.x, player.y);
    bot.plan = 'hunt';
    bot.coneCD -= DT;
    const guard = !G.police && player.cones > 0 && bot.coneCD <= 0 && d < 500 && nearest(watchers.filter(w => !['cop', 'k9', 'drone', 'cam', 'window'].includes(w.type) && !(w.asleep > 0) && dist(w.x, w.y, live.x, live.y) < 260), live.x, live.y);
    if (guard && dist(guard.x, guard.y, player.x, player.y) < 650) {
      // toss a pinecone past them, away from the deer, so they wander off to check it
      const a = Math.atan2(guard.y - live.y, guard.x - live.x), tx = guard.x + Math.cos(a) * 160, ty = guard.y + Math.sin(a) * 160;
      if (dist(tx, ty, player.x, player.y) < 380) { aimAt(tx, ty); press('KeyF'); bot.coneCD = 18; bot.cones = (bot.cones || 0) + 1; bot.plan = 'pinecone'; return; }
    }
    if (d < 210 && los(player.x, player.y, live.x, live.y)) {
      clearMove(); keys.ShiftLeft = true;
      if (!player.drawing) { bot.aimErr = { x: (R() - 0.5) * 34, y: (R() - 0.5) * 34 }; bot.releaseAt = 0.78 + R() * 0.2; startDraw(); }
      // the aim settles as the draw holds, but never perfectly
      const e = bot.aimErr || { x: 0, y: 0 }, k = 1 - Math.min(1, player.draw) * 0.55;
      aimAt(live.x + e.x * k, live.y + e.y * k);
      if (player.drawing && player.draw >= bot.releaseAt) { releaseDraw(); bot.shots = (bot.shots || 0) + 1; }
      return;
    }
    if (player.drawing) player.drawing = false;
    goTo(live.x, live.y, d < 380);
  }

  // ---------------------------------------------------------------- Tyler (co-op P2) and the HOA cart (versus P2)
  function p2Brain() {
    for (const k of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) keys[k] = false;
    if (campaign.coop && tyler) {
      const shed = world.shed, sx = shed.x + shed.w / 2, sy = shed.y + shed.h / 2;
      const target = tyler.carry ? { x: sx, y: sy } : deer.filter(d => d.dead && !d.carried)[0];
      if (!target) return;
      const p = findPath(tyler.x, tyler.y, target.x, target.y, 8000); const wp = p && p[0] || target;
      if (wp.x > tyler.x + 6) keys.ArrowRight = true; if (wp.x < tyler.x - 6) keys.ArrowLeft = true;
      if (wp.y > tyler.y + 6) keys.ArrowDown = true; if (wp.y < tyler.y - 6) keys.ArrowUp = true;
      if (dist(tyler.x, tyler.y, target.x, target.y) < (tyler.carry ? 130 : 40)) p2Action();
    } else if (campaign.versus) {
      const w = watchers.find(q => q.p2); if (!w) return;
      if (player.x > w.x + 10) keys.ArrowRight = true; if (player.x < w.x - 10) keys.ArrowLeft = true;
      if (player.y > w.y + 10) keys.ArrowDown = true; if (player.y < w.y - 10) keys.ArrowUp = true;
      if (dist(w.x, w.y, player.x, player.y) < 250) p2Action();
    }
  }

  // ---------------------------------------------------------------- the play diary: what a playtester would remember about each night
  let snap = null;
  function diaryTick(rec, f) {
    if (!rec.diary) rec.diary = [];
    if (f === 1) {
      const parts = [G.goal ? GOALS[G.goal.id].title + ' (' + goalProgress() + ')' : 'Fill the freezer', G.twist ? G.twist : 'no twist', G.weather, 'map #' + seasonMapSeed()];
      rec.diary.push({ head: `Night ${night}${G.retry ? '' : ''}: ${parts.join(' · ')} · quota ${G.quota}`, ev: [], cells: new Set() });
      snap = { spotted: 0, warns: G.warnsLeft, police: false, shots: 0, hits: 0, del: G.delivered, van: 0, sold: 0, notes: 0, cones: bot.cones || 0, lastSpot: -99 };
    }
    const day = rec.diary[rec.diary.length - 1]; if (!day || !snap) return;
    day.cells.add(Math.floor(player.x / 150) + ',' + Math.floor(player.y / 150));
    const at = clockText(), ev = t => { snap.lastAct = G.playT; if (day.ev.length < 16) day.ev.push(at + ' ' + t); };
    if (snap.lastAct === undefined) snap.lastAct = G.playT;
    if (G.playT - snap.lastAct > 150 && !G.police) { note('idle', rec.name, 'night ' + night + ': nothing happened for 150 s while ' + bot.plan + (window.BOTDEBUG ? ' at ' + Math.round(player.x) + ',' + Math.round(player.y) + ' goal ' + (bot.goal ? Math.round(bot.goal.x) + ',' + Math.round(bot.goal.y) : '-') + ' path ' + (bot.path ? bot.path.length : 0) + ' sus ' + Math.round(G.sus) + ' police ' + G.police : '')); snap.lastAct = G.playT; }
    if (G.timesSpotted > snap.spotted) { if (G.playT - snap.lastSpot > 12) { const w = watchers.find(q => q.seeing); ev('spotted by ' + (w ? w.label || w.type : 'someone')); snap.lastSpot = G.playT; } snap.spotted = G.timesSpotted; }
    if (G.warnsLeft < snap.warns) { ev('got a LAST WARNING'); snap.warns = G.warnsLeft; }
    if (G.police && !snap.police) { ev('911 called (' + (G.caller || '?') + ')'); snap.police = true; }
    if (G.shots > snap.shots) { const hit = G.hits > snap.hits; ev(hit ? 'shot: hit' : 'shot: MISSED'); snap.shots = G.shots; snap.hits = G.hits; }
    if ((G.vanDeer || 0) > snap.van) { ev('dragged a deer to Steve\'s van (rush order)'); snap.van = G.vanDeer; snap.del = G.delivered; snap.sold = G.soldPacks || 0; }
    if (G.delivered > snap.del) { ev('deer home (' + G.delivered + '/' + G.quota + (G.bucks ? ', ' + G.bucks + ' buck' : '') + ')'); snap.del = G.delivered; }
    if ((G.soldPacks || 0) > snap.sold) { ev('sold packs to Steve'); snap.sold = G.soldPacks; }
    if (G.noticesGot > snap.notes) { ev('picked up an HOA notice'); snap.notes = G.noticesGot; }
    if ((bot.cones || 0) > snap.cones) { ev('threw a pinecone to pull a neighbor off a deer'); snap.cones = bot.cones; }
    if (G.endReason && !day.end) day.end = G.endReason + (quotaMet() ? '' : G.delivered >= G.quota ? ' (quota in, order not filled)' : '');
  }
  function diaryText(rec) {
    if (!rec.diary || !rec.diary.length) return '';
    let prev = null;
    return rec.diary.map(d => {
      let overlap = '';
      if (prev) { let same = 0; for (const c of d.cells) if (prev.has(c)) same++; overlap = `  · route overlap with last night ${Math.round(same / Math.max(1, Math.min(d.cells.size, prev.size)) * 100)}%`; }
      prev = d.cells;
      return `  ${d.head}${overlap}\n      ${d.ev.join('\n      ') || '(quiet night)'}\n      → ${d.end || '?'}`;
    }).join('\n');
  }

  // ---------------------------------------------------------------- invariants
  function check(label) {
    if (!G || !player) return;
    if (bad(player.x) || bad(player.y)) note('NaN', label, 'player position');
    if (player.x < 0 || player.y < 0 || player.x > W || player.y > H) note('out of bounds', label, `Dale at ${Math.round(player.x)},${Math.round(player.y)}`);
    if (world.solids.some(r => player.x > r.x + 2 && player.x < r.x + r.w - 2 && player.y > r.y + 2 && player.y < r.y + r.h - 2) && !player.hidden) note('inside a solid', label, `Dale at ${Math.round(player.x)},${Math.round(player.y)}`);
    for (const dd of deer) if (bad(dd.x) || bad(dd.y)) { note('NaN', label, 'deer'); break; }
    for (const w of watchers) if (bad(w.x) || bad(w.y)) { note('NaN', label, 'watcher ' + w.type); break; }
    for (const k of ['sus', 'time', 'delivered', 'earned', 'nightScore']) if (G[k] !== undefined && bad(G[k])) note('NaN', label, 'G.' + k);
    if (bad(campaign.cash || 0) || campaign.cash < 0) note('money', label, 'cash ' + campaign.cash);
    if ((campaign.strikes || 0) > strikesMax() + 1) note('strikes', label, 'strikes ' + campaign.strikes + ' of ' + strikesMax());
    if (G.time > G.NIGHT + 1) note('clock', label, 'time ' + G.time);
    if (player.arrows < 0) note('range', label, 'arrows ' + player.arrows);
    if (particles.length > 4000 || popups.length > 400) note('leak', label, `particles ${particles.length}, popups ${popups.length}`);
  }

  // ---------------------------------------------------------------- one scenario = play until it ends, handling every screen
  function* runScenario(sc) {
    const label = sc.name, rec = { name: label, nights: [], end: '', frames: 0 };
    runs.push(rec);
    try { sc.setup(); } catch (e) { note('crash', label + ' setup', e.message); return; }
    sc.startNight = night;
    let nightFrames = 0, screenFrames = 0, lastState = '', guard = 0, nightStartAt = { night, cash: campaign.cash };
    bot.forceFail = sc.failNights && sc.failNights.includes(night);
    const maxFrames = (sc.maxNights || 1) * 30 * 60 * 12;
    while (guard++ < maxFrames) {
      rec.frames++;
      if (state !== lastState) { screenFrames = 0; lastState = state; } else screenFrames++;
      if (state !== 'play' && screenFrames > 30 * 40) { note('stuck on a screen', label, `${state} for 40 s (night ${night})`); rec.end = 'stuck: ' + state; break; }
      try {
        if (state === 'story') { if (screenFrames % 3 === 0) advanceStory(); }
        else if (state === 'intro') { if (screenFrames > 5) press('Enter'); }
        else if (state === 'pause') press('Escape');
        else if (state === 'photo') press('KeyH');
        else if (state === 'steve') { if (player.cooler) steveSell(); else if (campaign.cash > 40 && R() < 0.3) steveBuy('arrows'); else press('Escape'); }
        else if (state === 'play') {
          if (nightFrames === 0) { bot.path = null; bot.sold = false; bot.still = 0; bot.pauseT = 0; bot.threat = null; bot.coneCD = 0; bot.stuckAt = {}; bot.forceFail = sc.failNights && sc.failNights.includes(night) && !sc.failed?.[night]; nightStartAt = { night, cash: campaign.cash }; }
          nightFrames++;
          brain(label); p2Brain();
          diaryTick(rec, nightFrames);
          if (sc.chase && nightFrames === 30 * 20 && !G.police) callPolice(watchers[0]);
          if (sc.restartInChase && G.police && nightFrames === 30 * 24) { state = 'pause'; restartNight(); }
          update(DT);
          if (nightFrames % 15 === 0) check(label + ' night ' + night);
          if (nightFrames > 30 * (G.NIGHT + 40) && state === 'play') { note('night never ended', label, `night ${night} ran ${Math.round(nightFrames / 30)} s`); state = 'title'; break; }
        } else {
          if (screenFrames === 0 && G && nightFrames) {
            rec.won = (rec.won || 0) + (G.endReason === 'win' ? 1 : 0); rec.played = (rec.played || 0) + 1; rec.nights.push(`N${night} ${G.endReason}${G.retry ? ' (retry)' : ''} ${G.delivered}/${G.quota} $${campaign.cash} k${campaign.strikes || 0}`);
            if (bot.forceFail) { sc.failed = sc.failed || {}; sc.failed[night] = true; }
            { const dd = rec.diary && rec.diary[rec.diary.length - 1]; if (dd && !dd.end) dd.end = (G.endReason === 'win' ? 'WON' : G.endReason) + (G.endReason !== 'win' && G.delivered >= G.quota && !quotaMet() ? ' (quota in, order not filled)' : '') + (bot.forceFail ? ' (bot quit on purpose)' : '') + (G.retry ? ', strike ' + campaign.strikes + ', retry' : ''); }
            // the save must match what the screen offers
            const sv = readSave();
            if (!oneNightMode() && night <= 5) {
              if (G.retry && !(sv && sv.night === night)) note('save', label, `retry screen but Continue goes to ${sv ? 'night ' + sv.night : 'nothing'}`);
              if (state === 'nightdone' && !(sv && sv.night === night + 1)) note('save', label, `night ${night} won but Continue goes to ${sv ? 'night ' + sv.night : 'nothing'}`);
            }
            if (oneNightMode() && sc.guardSave && JSON.stringify(sv) !== sc.guardSave) note('save', label, 'a one-night mode changed the saved season');
            nightFrames = 0;
          }
          nightFrames = 0;
          if (state === 'nightdone') { if (screenFrames > 10) press('Enter'); }
          else if (state === 'shop') {
            if (screenFrames === 5) { for (const it of SHOP) if (!has(it.id) && campaign.cash >= it.price + 60 && R() < 0.6) buy(it); }
            if (screenFrames > 12) press('Enter');
          }
          else if (state === 'court') {
            if (!G.court && screenFrames > 5) press(sc.plea || 'Digit1');
            else if (G.court && screenFrames > 10) press('Enter');
          }
          else if (state === 'over') {
            if (screenFrames < 8) { /* look at the results */ }
            else if (G.retry && !sc.noRetry) { rec.retries = (rec.retries || 0) + 1; if (!clickButton(/Retry/)) note('button', label, 'no Retry button'); }
            else if (seasonChoice() && night === 5 && G.endReason === 'win') { rec.end = 'season complete $' + campaign.cash; if (sc.endless) { clickButton(/Endless/); sc.endless = false; } else break; }
            else if (twoP()) { rec.end = 'two-player result'; if (!sc.again) break; sc.again = false; if (!clickButton(/again/)) note('button', label, 'no Play again button'); }
            else { rec.end = (G.evicted ? 'evicted (3 strikes)' : G.endReason) + ' on night ' + night; if (oneNightMode()) { press('Enter'); if (state !== 'title') note('flow', label, 'one-night results did not go to the title: ' + state); } break; }
          }
          else if (state === 'title' || state === 'netwait' || state === 'online') { rec.end = rec.end || 'title'; break; }
          else if (state !== 'play') { /* any other screen: Escape out */ if (screenFrames > 20) press('Escape'); }
        }
        if (rec.frames % 6 === 0) render(performance.now());
      } catch (e) { note('crash', label + ' ' + state, e.message + ' @ ' + String(e.stack || '').split('\n')[1]); state = 'title'; rec.end = 'crash'; break; }
      if (rec.frames % 300 === 0) yield;
      if (sc.maxNights && night > sc.maxNights + (sc.startNight || 1) - 1 && state === 'play') { rec.end = rec.end || `reached night ${night}`; break; }
    }
    if (guard >= maxFrames) { note('ran out of time', label, `still on ${state}, night ${night}`); rec.end = rec.end || 'ran out of time'; }
    clearMove(); for (const k in keys) keys[k] = false;
  }

  // ---------------------------------------------------------------- scenarios
  const fresh = n => () => { restoreRandom(); clearSave(); newCampaign(); if (n > 1) { night = n; campaign.cash = (n - 1) * 150; startNight(); } };
  const S = [
    { name: 'Season, normal (5 nights)', setup: fresh(1), maxNights: 5 },
    { name: 'Season, fail nights 2 and 4 (strikes, retries)', setup: fresh(1), maxNights: 5, failNights: [2, 4] },
    { name: 'Season, easy', setup: () => { settings.difficulty = 'easy'; fresh(1)(); }, maxNights: 5, after: () => { settings.difficulty = 'normal'; } },
    { name: 'Season, hard', setup: () => { settings.difficulty = 'hard'; fresh(1)(); }, maxNights: 5, after: () => { settings.difficulty = 'normal'; } },
    { name: 'Police chase and lockdown (night 3)', setup: fresh(3), maxNights: 1, chase: true },
    { name: 'Restart Night during a chase', setup: fresh(2), maxNights: 1, chase: true, restartInChase: true },
    { name: 'Arrest -> court, raccoon plea', setup: () => { fresh(2)(); }, maxNights: 1, chase: true, plea: 'Digit2' },
    { name: 'Three strikes', setup: () => { fresh(2)(); campaign.strikes = 2; }, maxNights: 1, failNights: [2] },
    { name: 'Endless from night 5', setup: fresh(5), maxNights: 3, endless: true, startNight: 5 },
    { name: 'Endless night 9', setup: fresh(9), maxNights: 1, startNight: 9 },
    { name: 'Daily Hunt', setup: () => { fresh(1)(); state = 'title'; saveGame(); S[10].guardSave = JSON.stringify(readSave()); startDaily(); } },
    { name: 'Halloween', setup: () => startHalloween() },
    { name: 'Country Club', setup: () => startGolf() },
    { name: 'Cul-de-sac', setup: () => startMapMode('cul') },
    { name: 'Random map A', setup: () => { startMapMode('random'); } },
    { name: 'Random map B', setup: () => { startMapMode('random'); campaign.mapSeed = 99173; startNight(); } },
    { name: 'Custom map (Hosta Hills)', setup: () => { const x = new XMLHttpRequest(); x.open('GET', 'maps/hosta-hills.json', false); x.send(); startCustomMap(JSON.parse(x.responseText)); } },
    { name: 'Co-op (Tyler hauls)', setup: () => startTwoPlayer('coop'), again: true },
    { name: 'Versus (P2 cart hunts Dale)', setup: () => startTwoPlayer('versus') },
    { name: 'Phone size season night 1', setup: () => { setSize(390, 844); fresh(1)(); }, maxNights: 1, after: () => setSize(1280, 720) },
  ];
  const list = S.filter(s => !ONLY || s.name.toLowerCase().includes(ONLY.toLowerCase())).filter((s, i) => !QUICK || i % 2 === 0);

  // ---------------------------------------------------------------- run, a slice at a time so the page stays responsive
  setSize(1280, 720);
  const t0 = performance.now();
  let i = 0, gen = null;
  function tick() {
    const until = performance.now() + 40;
    while (performance.now() < until) {
      if (!gen) {
        if (i >= list.length) { finish(); return; }
        gen = runScenario(list[i]);
        out.textContent = `Bot is playing: ${list[i].name} (${i + 1}/${list.length})…`;
      }
      const r = gen.next();
      if (r.done) { if (list[i].after) list[i].after(); gen = null; i++; break; }
    }
    setTimeout(tick, 0);
  }
  function finish() {
    restoreRandom(); settings.difficulty = 'normal'; setSize(window.innerWidth, window.innerHeight);
    try { localStorage.clear(); for (const k in saved) localStorage.setItem(k, saved[k]); } catch (e) { /* none */ }
    state = 'title';
    const iss = [...issues.values()].sort((a, b) => (b.kind === 'crash') - (a.kind === 'crash') || b.count - a.count);
    out.textContent = `Curfew Buck play bot: ${iss.length} issues (${iss.filter(x => x.kind === 'crash').length} crashes), ${runs.length} scenarios in ${((performance.now() - t0) / 1000).toFixed(0)} s · wedged on a corner and wiggled free ${bot.wiggles || 0} times (a spot only counts as an issue at 3 times in one night)\n\n` +
      'ISSUES\n' + (iss.length ? iss.map(x => `[${x.kind}] ${x.where}: ${x.detail}${x.count > 1 ? '  (x' + x.count + ')' : ''}`).join('\n') : '(none)') +
      '\n\nRUNS\n' + runs.map(r => `${r.name}: ${r.end || '?'} · won ${r.won || 0}/${r.played || 0} nights${r.retries ? ` · ${r.retries} retries` : ''}\n    ${r.nights.join('\n    ')}`).join('\n') +
      '\n\nPLAY DIARY (season runs)\n' + runs.filter(r => /^Season|^Endless from/.test(r.name)).map(r => r.name + '\n' + diaryText(r)).join('\n\n');
    document.title = 'BOT ' + iss.length;
    window.botReport = { issues: iss, runs };
  }
  setTimeout(tick, 50);
})();
