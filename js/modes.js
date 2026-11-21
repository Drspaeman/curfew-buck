'use strict';
// Curfew Buck: Game modes: Daily Hunt, Country Club, Maple Court, random and custom maps, two-player.
// Part 7 of 10. All parts share one global scope, so load them in order (see index.html).
// ---- Yard of the Month ----
// The HOA plants a "Yard of the Month" sign in one front lawn each night. Dale can steal it (E). It rustles
// (a little noise), the newsletter notices, and Linda takes it personally. Stolen signs pile up in the shed.
const YOTM_LINES = [
  'You stole the Yard of the Month sign. The yard is now merely fine.',
  'Yard of the Month: acquired. Your shed has never been this decorated.',
  'You took the sign. Somewhere, Linda sits bolt upright in bed.',
  'Yard of the Month sign stolen. The hostas look relieved.',
];
function setupYotm() {
  G.yotm = null;
  const houses = (world.houses || []).filter(h => h !== world.exHouse && !h.label);
  for (let k = 0; k < 40 && houses.length; k++) {
    const h = houses[Math.floor(Math.random() * houses.length)];
    // in the front lawn: between the house and its street
    const x = h.x + (h.w || HW) * (0.25 + Math.random() * 0.5), y = h.top ? h.y - 18 : h.y + (h.h || HH) + 18;
    if (world.blocked(x, y, 14) || dist(x, y, world.shed.x, world.shed.y) < 300) continue;
    G.yotm = { x, y, got: false };
    return;
  }
}
function nearYotm() { const s = G && G.yotm; return !!(s && !s.got && player && dist(s.x, s.y, player.x, player.y) < 40); }
function yotmInteract() {
  if (!nearYotm()) return false;
  const s = G.yotm;
  s.got = true; G.yotmStolen = true;
  if (!oneNightMode()) campaign.yotm = (campaign.yotm || 0) + 1;
  makeNoise(s.x, s.y, 110 * noiseMult(), 'rustle');   // pulling a sign out of a lawn isn't silent
  sfx.pickup();
  popup(s.x, s.y - 30, pick(YOTM_LINES), '#9be564', 3);
  unlock('yotm');
  if ((campaign.yotm || 0) >= 3) unlock('yotm3');
  return true;
}
function drawYotm() {
  const s = G && G.yotm;
  if (!s || s.got || !inView(s.x, s.y, 40)) return;
  ctx.fillStyle = '#6b4a2a'; ctx.fillRect(s.x - 1.5, s.y - 4, 3, 16);                       // stake
  ctx.fillStyle = '#f4f1e6'; roundRect(ctx, s.x - 22, s.y - 22, 44, 20, 3); ctx.fill();      // sign
  ctx.strokeStyle = '#2e7d32'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#2e7d32'; ctx.font = 'bold 6px system-ui, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('YARD OF THE', s.x, s.y - 14); ctx.fillText('MONTH 🏆', s.x, s.y - 6);
}

// Daily records are kept per difficulty, so an Easy score never sits on the Normal board (Normal keeps the plain date key)
function dailyRecordKey() { return campaign.daily + (settings.difficulty && settings.difficulty !== 'normal' ? ':' + settings.difficulty : ''); }
function dailySeed(key) { let h = 7; for (const ch of String(key)) h = (h * 31 + ch.charCodeAt(0)) | 0; return h; }
function startDaily() {
  // Same starting layout (deer, critters, notes, weather) for everyone on the same day.
  const key = dailyKey();
  const h = dailySeed(key);
  Math.random = mulberry32(h);
  campaign = freshCampaign(); campaign.daily = key;
  campaign.seen = Object.fromEntries(Object.keys(SCENES).map(k => [k, true]));
  night = 2 + (Math.abs(h) % 3);
  startNight();
}
const MOON = {
  new: { dark: 0.07, range: 0.92, label: '🌑 New moon: extra dark. Harder for everyone to see.' },
  crescent: { dark: 0.03, range: 0.96, label: '🌒 Crescent moon: dark night.' },
  half: { dark: 0, range: 1, label: '🌓 Half moon.' },
  gibbous: { dark: -0.04, range: 1.04, label: '🌔 Gibbous moon: a little brighter tonight.' },
  full: { dark: -0.1, range: 1.08, label: '🌕 Full moon: bright, and everyone sees farther.' },
};
function moonFx() { return MOON[['new', 'crescent', 'half', 'gibbous', 'full'][(night - 1) % 5]] || MOON.half; }
function rumble(ms, strength) {
  try {
    const gp = navigator.getGamepads && Array.from(navigator.getGamepads()).find(Boolean);
    if (gp && gp.vibrationActuator) gp.vibrationActuator.playEffect('dual-rumble', { duration: ms, strongMagnitude: strength, weakMagnitude: strength * 0.6 });
    else if (touchMode && navigator.vibrate) navigator.vibrate(ms);
  } catch (e) { /* no haptics */ }
}
function slipOnIce() {
  if (player.stun > 0) return;
  player.stun = 0.7;
  tone(500, 0.2, 'triangle', 0.06, 200);
  popup(player.x, player.y - 30, pick(['WHOA!', 'Whoa whoa WHOA', '*THUD* ow.']), '#cfe8ff', 1.4);
  makeNoise(player.x, player.y, 150 * noiseMult(), 'slip', true);
  hint('ice', 'Icy patches on the plowed roads! Momentum carries you, and running can make you slip (loudly). Sneak across.');
  unlock('iceskater');
}
function steveHaggle() {
  if (G.haggled) return;
  G.haggled = true;
  // the haggle sticks to tonight's quote, in memory, the restart snapshot and the save (no rerolling it)
  const lock = () => {
    if (oneNightMode()) return;
    const q = { night, price: G.price, trend: G.priceTrend || 0, haggled: true };
    campaign.quote = q;
    if (nightStart && nightStart.night === night) nightStart.campaign.quote = Object.assign({}, q);
    const sv = store.get('hs_save', null); if (sv && sv.campaign && sv.night === night) { sv.campaign.quote = Object.assign({}, q); store.set('hs_save', sv); }
  };
  if (Math.random() < 0.55) { G.price = Math.round(G.price * 1.25); G.steveLine = 'Steve: "Fine. FINE. $' + G.price + ' a pack. Hard bargain for a guy who lives in a shed."'; sfx.buy(); unlock('haggler'); }
  else { G.price = Math.max(10, Math.round(G.price * 0.85)); G.steveLine = pick(['Steve: "Now you\'ve insulted me. $' + G.price + '. Take it or leave it."', 'Steve: "I ran the numbers on a napkin. A pessimistic napkin. $' + G.price + ' a pack."']); sfx.thunk(); }
  lock();
}
function priceOf(item) { return campaign.special === item.id ? Math.round(item.price * 0.75) : item.price; }
function pickSpecial() {
  campaign.earlLine = pick(EARL_LINES);
  const pool = SHOP.filter(it => it.weapon ? !campaign.weapons[it.weapon] : it.consumable ? (campaign.items[it.id] || 0) < it.max : !has(it.id));
  campaign.special = pool.length ? pick(pool).id : null;
}
const GOSSIP = [
  'Linda measures everyone\'s grass with a ruler. EVERYONE\'S. Even hers.',
  'Gary has failed his drone license test four times.',
  'Todd\'s mom still packs his Neighborhood Watch lunch.',
  'Mr. Henderson talks to Martha every night. Nobody knows who Martha is.',
  'Darlene kept Dale\'s fishing rod. It\'s in the garage, behind the Peloton.',
  'Brenda applied for Neighborhood Watch Captain. Todd doesn\'t know yet.',
  'The HOA spent $3,000 on "koi wellness consulting." The koi are not well.',
  'Kowalski and Darlene went to prom together. He still has the corsage.',
  'Steve\'s van has been "temporarily parked" on the logging road since 2019.',
  'Earl\'s chili is 40% squirrel and 60% secrets.',
  'Kyle the paperboy has never once delivered to the correct house.',
  'Phase 2 blueprints call the woods "Undeveloped Opportunity Zone." Grandpa would hate that.',
];
const SCANNER = [
  '📻 "All units: suspect is wearing blaze orange. Very easy to spot. Allegedly."',
  '📻 "Dispatch, I\'ve got hydrangea damage on Hosta Lane."',
  '📻 "Is anyone else hungry? ...Disregard."',
  '📻 "K-9 is on the scent. Repeat, Sarge is very excited."',
  '📻 "Ma\'am, please stop calling 911 about the same guy."',
];
function tylerLine() {
  if (G.endReason === 'arrested') return 'dad. DAD. mom is SO mad. also kowalski said hi';
  if ((G.soldPacks || 0) >= 3 && Math.random() < 0.4) return 'dad i made u an invoice. it just says MEAT in 48 point font';
  if (G.legendDone) return 'OLD HOSTA??? earl is gonna lose his mind';
  if (G.stars >= 3) return 'nobody saw u at all?? ur literally a ninja';
  if (G.police) return 'i heard the sirens lol. u ok?';
  return pick([G.exSaw ? 'mom knew it was u before she even got to the window' : 'mom asked why the freezer is louder than usual', 'ur on the hoa group chat again', 'teach me how to do that pls']);
}
function drawGossip(now) {
  if (!G || !G.gossip) return;
  for (const n of G.gossip) {
    if (n.got) {
      continue;
    }
    if (dist(n.x, n.y, player.x, player.y) < 22 && state === 'play') {
      n.got = true;
      const got = store.get('hs_gossip', []); if (!got.includes(n.idx)) got.push(n.idx); store.set('hs_gossip', got);
      popup(n.x, n.y - 26, '📝 ' + GOSSIP[n.idx], '#ffc4e6', 5);
      sfx.grab();
      hint('gossip', 'Gossip notes are collectibles. They stay collected across seasons. Check your total in the Trophy Room.');
      if (got.length >= GOSSIP.length) unlock('collector');
      continue;
    }
    if (!inView(n.x, n.y, 30)) continue;
    const bob = Math.sin(now / 350 + n.x) * 2;
    ctx.fillStyle = '#ffc4e6'; ctx.save(); ctx.translate(n.x, n.y + bob); ctx.rotate(0.2);
    ctx.fillRect(-7, -9, 14, 18); ctx.fillStyle = '#c0508a'; ctx.fillRect(-4, -5, 8, 1.5); ctx.fillRect(-4, -1, 8, 1.5); ctx.fillRect(-4, 3, 5, 1.5);
    ctx.restore();
    if (Math.sin(now / 200 + n.y) > 0.8) { ctx.fillStyle = '#fff'; ctx.fillRect(n.x + 8, n.y - 12, 2, 2); }
  }
}
function drawCrosshair() {
  const want = state === 'play' && !touchMode ? 'none' : 'crosshair';
  if (cv.style.cursor !== want) cv.style.cursor = want;
  if (state !== 'play' || touchMode || (pad.connected && pad.aim !== null)) return;
  const c = player.drawing ? (player.draw >= weapon().killAt ? '#9be564' : '#ffd166') : 'rgba(255,255,255,0.8)';
  const g = player.drawing ? 4 + (1 - player.draw) * 8 : 6;
  ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 3;
  const lines = () => { ctx.beginPath(); ctx.moveTo(mouse.x - g - 6, mouse.y); ctx.lineTo(mouse.x - g, mouse.y); ctx.moveTo(mouse.x + g, mouse.y); ctx.lineTo(mouse.x + g + 6, mouse.y); ctx.moveTo(mouse.x, mouse.y - g - 6); ctx.lineTo(mouse.x, mouse.y - g); ctx.moveTo(mouse.x, mouse.y + g); ctx.lineTo(mouse.x, mouse.y + g + 6); ctx.stroke(); };
  lines(); ctx.strokeStyle = c; ctx.lineWidth = 1.5; lines();
}
function drawWeatherTerrain() {
  for (const r of world.ice) {
    if (!inView(r.x + r.w / 2, r.y + r.h / 2, Math.max(r.w, r.h))) continue;
    ctx.fillStyle = 'rgba(200,230,255,0.35)'; roundRect(ctx, r.x, r.y, r.w, r.h, 16); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(r.x + 10, r.y + r.h * 0.3); ctx.lineTo(r.x + r.w - 20, r.y + r.h * 0.6); ctx.stroke();
  }
  for (const p of world.puddles) {
    if (!inView(p.x, p.y, 40)) continue;
    ctx.fillStyle = 'rgba(60,80,110,0.55)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r, p.r * 0.6, 0, 0, TAU); ctx.fill();
  }
}
function updateWeatherTerrain(dt) {
  if (G.nvgOn) { G.nvg -= dt; if (G.nvg <= 0) { G.nvg = 0; G.nvgOn = false; popup(player.x, player.y - 30, 'Night-vision battery dead.', '#9be564', 1.6); } }
  if (player.stun > 0) player.stun -= dt;
  G.splashCD = (G.splashCD || 0) - dt;
  if (player.moving && G.splashCD <= 0) for (const p of world.puddles) {
    if (dist(p.x, p.y, player.x, player.y) < p.r) {
      G.splashCD = 1;
      tone(900, 0.08, 'sine', 0.04, 300);
      popup(player.x, player.y - 28, '*splash*', '#9ecbff', 0.8);
      makeNoise(player.x, player.y, (player.crouch ? 70 : 150) * noiseMult(), 'splash', true);
      break;
    }
  }
  // Darlene's bedroom light clicks on when she's getting suspicious
  world.exHouse.lit[2] = G.sus > 50 || G.exSaw;
}
function drawRouteMap(x0, y0, mw) {
  const s = mw / W, mh = H * s;
  panel(x0 - 6, y0 - 22, mw + 12, mh + 28);
  ctx.fillStyle = '#ccc'; ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('TONIGHT\'S ROUTE', x0 + mw / 2, y0 - 8);
  ctx.save(); ctx.translate(x0, y0);
  ctx.fillStyle = '#1b2f1d'; ctx.fillRect(0, 0, mw, mh);
  ctx.fillStyle = '#444'; for (const r of world.roads) ctx.fillRect(r.x * s, r.y * s, r.w * s, r.h * s);
  if (world.bulbs) for (const b of world.bulbs) { ctx.beginPath(); ctx.arc(b.x * s, b.y * s, b.r * s, 0, TAU); ctx.fill(); }
  ctx.fillStyle = '#6a6458'; for (const h of world.houses) ctx.fillRect(h.x * s, h.y * s, h.w * s, h.h * s);
  ctx.strokeStyle = '#ff7a1a'; ctx.lineWidth = 1.5; ctx.beginPath();
  G.route.forEach((p, i) => i ? ctx.lineTo(p.x * s, p.y * s) : ctx.moveTo(p.x * s, p.y * s)); ctx.stroke();
  for (const k of (G.kills || [])) { ctx.fillStyle = k.buck ? '#ffd166' : '#9be564'; ctx.font = 'bold 10px system-ui'; ctx.fillText('✕', k.x * s, k.y * s + 3); }
  const t = world.shed; ctx.fillStyle = '#ff5a3a'; ctx.fillRect(t.x * s - 2, t.y * s - 2, 5, 5);
  ctx.restore();
}

// ---- v0.8 helpers ----
const VOICES = { ex: 520, hoa: 610, treasurer: 300, watch: 360, cop: 230, jogger: 640, paper: 760, window: 260, chad: 330, drone: 900 };
function voice(type) {
  // little Animal-Crossing-style babble blips; pitch per character
  const base = VOICES[type] || 450;
  const n = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) tone(base * rnd(0.85, 1.2), 0.05, i % 2 ? 'triangle' : 'square', 0.025, null, i * 0.07);
}
const COURT_PLEAS = [
  { label: '1. "It was for the freezer, Your Honor."', odds: 0.4, fine: 150 },
  { label: '2. "Raccoons. Very large raccoons."', odds: 0.25, fine: 0 },
  { label: '3. Hire Earl\'s nephew as your lawyer', odds: 0.75, fine: 250, cost: true },
];
function courtPlea(i) {
  const p = COURT_PLEAS[i];
  if (G.court) return;
  if (p.cost && campaign.cash < p.fine) { G.courtMsg = 'You can\'t afford Earl\'s nephew. Nobody can, really.'; sfx.thunk(); return; }
  const dismissed = Math.random() < p.odds;
  campaign.courtUsed = true;
  if (dismissed) {
    const paid = Math.min(campaign.cash, p.fine);   // you can't pay more than you have
    campaign.cash -= paid;
    unlock('lawyer');
    G.court = { ok: true, text: i === 2 ? 'Earl\'s nephew objects to everything, including the judge\'s tie. Case dismissed.' : i === 1 ? 'The judge has also had raccoon problems. Case dismissed, with sympathy.' : 'The judge is a hunter. "Case dismissed. Fill that freezer, Mr. Pruitt."' };
    if (p.fine) G.court.text += p.cost ? ` (Earl's nephew bills you $${paid}.)` : paid < p.fine ? ` (Fine: $${p.fine}. You had $${paid}, so that's what you paid.)` : ` (You paid the $${p.fine} fine.)`;
    sfx.win();
  } else {
    G.court = { ok: false, text: i === 1 ? '"Raccoons don\'t carry compound bows, Mr. Pruitt." Guilty.' : i === 2 ? 'Earl\'s nephew objects to his own client. Guilty.' : '"The freezer is not a legal defense." Guilty. Your season is over.' };
    sfx.lose();
    recordScore(); G.court.recorded = true;   // on the board now, even if the tab closes before Continue
  }
  // the verdict is final the moment it is read: a reload can't buy a second plea
  if (G.court.ok) saveNext(); else clearSave();
}
function finishCourt() {
  if (G.court.ok) { pickSpecial(); state = 'shop'; saveNext(); return; }
  if (!G.court.recorded) recordScore();
  clearSave();
  state = 'over';
}
function drawCourt() {
  const cx = VW / 2;
  let y = Math.max(70, VH * 0.16);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#c9b08a'; fitFont('COURT DATE', 900, 44, VW - 24); ctx.fillText('COURT DATE', cx, y);
  ctx.fillStyle = '#bbb'; ctx.font = 'italic 15px system-ui, sans-serif';
  y = wrapText('The People v. Dale Pruitt. Charges: unlicensed hunting in a residential zone, trespassing in Gary\'s hydrangeas, "general orangeness." The Honorable Judge Hoffmeyer presiding.', cx, y + 34, Math.min(620, VW - 40), 20) + 26;
  // judge's bench
  ctx.fillStyle = '#5a3d22'; ctx.fillRect(cx - 160, y, 320, 40); ctx.fillStyle = '#3d2915'; ctx.fillRect(cx - 160, y + 34, 320, 6);
  ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(cx, y - 2, 16, 0, TAU); ctx.fill();
  ctx.fillStyle = '#e8c09a'; ctx.beginPath(); ctx.arc(cx, y - 8, 9, 0, TAU); ctx.fill();
  y += 70;
  if (!G.court) {
    ctx.fillStyle = '#fff'; ctx.font = 'bold 16px system-ui, sans-serif'; ctx.fillText('How do you plead?', cx, y); y += 16;
    y = buttonGrid(COURT_PLEAS.map((p, i) => ({ label: VW < 640 ? `${i + 1}. ${Math.round(p.odds * 100)}%${p.fine ? `, $${p.fine} if you win` : ''}: ${p.label.slice(3)}` : `${p.label}  ·  ${Math.round(p.odds * 100)}% to walk${p.fine ? `, then pay $${p.fine}${p.cost ? ' (only if he wins)' : ''}` : ', free'}`, fn: () => courtPlea(i), enabled: !(p.cost && campaign.cash < p.fine), hi: pad.connected && (G.courtSel || 0) === i })), y, Math.min(620, VW - 30), 42);
    if (pad.connected) { ctx.fillStyle = '#888'; ctx.font = '12px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('D-pad ↑/↓ to choose · A to plead', VW / 2, y + 8); }
    if (G.courtMsg) { ctx.fillStyle = '#ff9f6b'; ctx.font = '14px system-ui, sans-serif'; ctx.fillText(G.courtMsg, cx, y + 14); }
    ctx.fillStyle = '#888'; ctx.font = '12px system-ui, sans-serif'; ctx.fillText('One court date per season. If you lose, the season is over.', cx, VH - 26);
  } else {
    ctx.fillStyle = G.court.ok ? '#9be564' : '#ff6b6b'; fitFont(G.court.ok ? 'CASE DISMISSED' : 'GUILTY', 900, 40, VW - 24);
    ctx.fillText(G.court.ok ? 'CASE DISMISSED' : 'GUILTY', cx, y + 10);
    ctx.fillStyle = '#ddd'; ctx.font = '16px system-ui, sans-serif';
    y = wrapText(G.court.text, cx, y + 44, Math.min(600, VW - 40), 22) + 24;
    buttonGrid([{ label: G.court.ok ? 'Back to the bait shop ▶' : 'Accept your fate', fn: finishCourt, hi: true }], y, 260, 44);
  }
}
function drawSettings() {
  const cx = VW / 2;
  ctx.textAlign = 'center'; ctx.fillStyle = '#ff7a1a'; fitFont('SETTINGS', 900, 40, VW - 24); ctx.fillText('SETTINGS', cx, Math.max(70, VH * 0.18));
  const order = ['easy', 'normal', 'hard'];
  const y = buttonGrid([
    { label: `Difficulty: ${diff().label}`, fn: () => { settings.difficulty = order[(order.indexOf(settings.difficulty) + 1) % 3]; saveSettings(); } },
    { label: `Screen shake: ${settings.shake ? 'On' : 'Off'}`, fn: () => { settings.shake = !settings.shake; saveSettings(); } },
    { label: `Sound: ${muted ? 'Muted (M)' : pct(settings.sfxVol)}`, fn: () => { if (muted) setMuted(false); else settings.sfxVol = cycleVol(settings.sfxVol); saveSettings(); sfx.grab(); } },
    { label: `Music: ${muted ? 'Muted (M)' : pct(settings.musicVol)}`, fn: () => { if (muted) setMuted(false); else { settings.musicVol = cycleVol(settings.musicVol); settings.music = settings.musicVol > 0; } saveSettings(); } },
    { label: `Sight cones: ${settings.cbCones ? 'Colorblind' : 'Standard'}`, fn: () => { settings.cbCones = !settings.cbCones; saveSettings(); } },
    { label: `Flashing: ${settings.flashes ? 'On' : 'Reduced'}`, fn: () => { settings.flashes = !settings.flashes; saveSettings(); } },
    { label: `Hints: ${settings.hints ? 'On' : 'Off'}`, fn: () => setHints(!settings.hints) },
    { label: `Text size: ${settings.bigText ? 'Large' : 'Normal'}`, fn: () => { settings.bigText = !settings.bigText; saveSettings(); } },
    ...(gothBinderDone() ? [{ label: `Vest: ${settings.gothVest ? 'Raven\'s black 🦇' : 'Blaze orange'}`, fn: () => { settings.gothVest = !settings.gothVest; saveSettings(); } }] : []),
    { label: '⌨ Controls…', fn: () => { state = 'keys'; keyWait = null; } },
    { label: `Tutorial: ${store.get('hs_tut_done', false) ? 'Done (reset)' : 'Ready'}`, fn: () => store.del('hs_tut_done') },
    { label: 'Fullscreen', fn: () => { try { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); } catch (e) { /* not allowed */ } } },
  ], Math.max(110, VH * 0.18 + 40), 200, 42);
  buttonGrid([{ label: '◀ Back', fn: () => { state = 'title'; }, hi: true }], y + 20, 200, 42);
}
function drawTitleArt(now) {
  // moon, stars, treeline, and a deer wandering across the bottom of the title screen
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  for (let i = 0; i < 70; i++) { const x = (i * 211) % VW, y = (i * 137) % (VH * 0.55); if (Math.sin(now / 700 + i) > -0.3) ctx.fillRect(x, y, 1.5, 1.5); }
  const mx = VW * 0.82, my = VH * 0.16;
  const g = ctx.createRadialGradient(mx, my, 10, mx, my, 120); g.addColorStop(0, 'rgba(255,245,210,0.25)'); g.addColorStop(1, 'rgba(255,245,210,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(mx, my, 120, 0, TAU); ctx.fill();
  ctx.fillStyle = '#f2ead0'; ctx.beginPath(); ctx.arc(mx, my, 34, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.beginPath(); ctx.arc(mx - 10, my + 6, 7, 0, TAU); ctx.arc(mx + 12, my - 8, 5, 0, TAU); ctx.fill();
  // treeline silhouette
  ctx.fillStyle = '#060a07';
  ctx.beginPath(); ctx.moveTo(0, VH);
  for (let x = 0; x <= VW + 30; x += 30) { const h = 70 + Math.sin(x * 0.05) * 18 + ((x * 7919) % 37); ctx.lineTo(x, VH - h); ctx.lineTo(x + 15, VH - h - 26); }
  ctx.lineTo(VW, VH); ctx.closePath(); ctx.fill();
  // deer silhouette walking along the treeline
  const dx = ((now / 40) % (VW + 200)) - 100, dy = VH - 64;
  ctx.fillStyle = '#0d140e';
  ctx.beginPath(); ctx.ellipse(dx, dy, 22, 10, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(dx + 22, dy - 14, 6, 9, 0.6, 0, TAU); ctx.fill();
  ctx.fillRect(dx - 16, dy + 4, 3, 20 + Math.sin(now / 120) * 2); ctx.fillRect(dx + 12, dy + 4, 3, 20 - Math.sin(now / 120) * 2);
  ctx.strokeStyle = '#0d140e'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(dx + 24, dy - 22); ctx.lineTo(dx + 20, dy - 36); ctx.lineTo(dx + 14, dy - 40); ctx.moveTo(dx + 21, dy - 31); ctx.lineTo(dx + 28, dy - 38); ctx.stroke();
}
const CARVING_TEXT = [
  '"D.P. + D.P. 2009" carved in a heart. You and Darlene, a long time ago.',
  '"GRANDPA WAS HERE 1961." His handwriting, even in bark.',
  '"T.P. AGE 6." Tyler\'s first hunting trip.',
  '"NO HOA EVER." Teenage Dale had opinions.',
  '"OLD HOSTA 8 PTS 2014." Even then, he was huge.',
  '"Pruitt Woods. Est. 1952."',
];
function carvingTrees() {
  if (world._carvings) return world._carvings;
  const woods = world.trees.filter(t => world.inWoods(t.x, t.y));
  const out = [];
  for (const t of woods) { if (out.length >= CARVING_TEXT.length) break; if (out.every(o => dist(o.x, o.y, t.x, t.y) > 700)) out.push(t); }
  return (world._carvings = out);
}
function drawCarvings(now) {
  if (!G || state !== 'play' && state !== 'pause') return;
  const got = store.get('hs_carvings', []);
  carvingTrees().forEach((t, i) => {
    if (got.includes(i)) return;
    const d = dist(t.x, t.y, player.x, player.y);
    if (d < t.trunk + 22 && state === 'play') {
      got.push(i); store.set('hs_carvings', got);
      popup(t.x, t.y - 30, '🪓 ' + CARVING_TEXT[i], '#e0c9a0', 5);
      sfx.grab();
      hint('carving', 'A carving! There are 6 hidden in trees around the woods. They stay found across seasons.');
      if (got.length >= CARVING_TEXT.length) unlock('carvings');
      return;
    }
    if (d < 260 && Math.sin(now / 250 + i) > 0.6) { ctx.fillStyle = 'rgba(255,240,200,0.8)'; ctx.fillRect(t.x + 8, t.y - 4, 2, 2); ctx.fillRect(t.x + 4, t.y + 6, 2, 2); }
  });
}
function drawHouseShadows() {
  ctx.fillStyle = 'rgba(0,0,10,0.22)';
  for (const h of world.houses) {
    if (!inView(h.x + h.w / 2, h.y + h.h, 200)) continue;
    ctx.beginPath(); ctx.moveTo(h.x + 14, h.y + h.h); ctx.lineTo(h.x + h.w, h.y + h.h); ctx.lineTo(h.x + h.w + 26, h.y + h.h + 52); ctx.lineTo(h.x + 40, h.y + h.h + 52); ctx.closePath(); ctx.fill();
  }
}

// ---- v0.9 helpers ----
function isOnRoad(x, y) { return world.roads.some(r => x > r.x - 6 && x < r.x + r.w + 6 && y > r.y - 6 && y < r.y + r.h + 6); }
function copFoot(w) {
  // Cruisers stay on the roads. To chase you into a yard, the officer parks and gets out.
  const road = isOnRoad(w.x, w.y);
  if (road) { w.lastRoad = { x: w.x, y: w.y, ang: w.ang }; if (w.parked && (w.state === 'patrol' || dist(w.x, w.y, w.parked.x, w.parked.y) < 50)) w.parked = null; }
  else if (!w.parked && w.lastRoad) { w.parked = Object.assign({}, w.lastRoad); popup(w.x, w.y - 30, pick(['*door slam* On foot!', 'Stay right there, Dale!', 'Foot pursuit!']), '#9ecbff', 1.6); }
  w.speed = w.parked ? 118 : 175;
  w.fov = w.parked ? 1.15 : 1.0;
}
function holdExcess() { return clamp(((player && player.holdT) || 0) - 1.5, 0, 3) * (player && player.crouch ? 0.5 : 1); }
function aimSway() { const e = holdExcess(); return e > 0 ? Math.sin(performance.now() / 140) * 0.035 * e : 0; }
function drawDragPath(now) {
  if (!G || !player.carry || !G.dragPath || !G.dragPath.length || state !== 'play') return;
  ctx.strokeStyle = 'rgba(255,209,102,0.35)'; ctx.lineWidth = 2; ctx.setLineDash([4, 10]); ctx.lineDashOffset = -now / 40;
  ctx.beginPath(); ctx.moveTo(player.x, player.y);
  for (const p of G.dragPath) ctx.lineTo(p.x, p.y);
  ctx.stroke(); ctx.setLineDash([]); ctx.lineDashOffset = 0;
}
function drawCreekStones() {
  for (const gp of world.creekGaps) {
    if (!inView(gp.x, gp.y, 60)) continue;
    ctx.fillStyle = '#7d7a70';
    for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.ellipse(gp.x + i * 6, gp.y + i * 14, 9, 6, 0.3, 0, TAU); ctx.fill(); }
  }
}
function toggleNVG() {
  if (!has('nvg')) { popup(player.x, player.y - 30, 'Earl sells night-vision goggles.', '#aaa', 1.2); return; }
  if (!G.nvgOn && G.nvg <= 0) { popup(player.x, player.y - 30, 'Night-vision battery dead for tonight.', '#ff9f6b', 1.4); return; }
  G.nvgOn = !G.nvgOn;
  tone(G.nvgOn ? 1800 : 900, 0.12, 'sine', 0.04, G.nvgOn ? 2600 : 500);
  if (G.nvgOn) { unlock('nightvision'); hint('nvg', 'Night vision lets you see in the dark, but the battery only lasts 90 seconds a night. Press N again to save it.'); }
}
function feedDog() {
  if (!(campaign.items.jerky > 0)) { popup(player.x, player.y - 30, 'No jerky. (Earl sells it.)', '#aaa', 1.2); return; }
  const g = world.dogs.find(d => !d.quiet && dist(d.ax, d.ay, player.x, player.y) < 140);
  if (!g) { popup(player.x, player.y - 30, world.dogs.some(d => d.quiet && dist(d.ax, d.ay, player.x, player.y) < 140) ? 'The dog has already signed for its jerky.' : 'No dog close enough.', '#aaa', 1.4); return; }
  campaign.items.jerky--; g.quiet = true; g.bark = 0;
  popup(g.x, g.y - 20, `*nom nom* ${g.name} is your best friend now.`, '#ffb36b', 2);
  sfx.grab(); unlock('goodboy');
}
const FORECAST_NEW = { 2: 'Todd on Neighborhood Watch, doorbell cams, a stray cat', 3: 'Gary, Mr. Henderson, Phase 2 bulldozers', 4: 'Brenda, Chad\'s leaf blower, Gary\'s drone', 5: 'a second golf cart, Old Hosta for sure' };
const EARL_LINES = [
  '"Heard you had a busy night. Don\'t tell me about it. What do you need?"',
  '"You smell like a deer and a crime. Cash only."',
  '"Linda came in here asking about you. I told her I don\'t know any Dales."',
  '"Steve still owes me for a cooler. Tell him Earl says hi. Menacingly."',
  '"That vest is a beacon, son. I sell camo. Just saying."',
  '"Squirrel chili sold out by noon. You\'re basically a supplier now."',
];

let shopScrolledFor = -1;
// ---- Country Club map ----
const GOLF_INTRO = 'Bonus night: the Whispering Pines Country Club, the HOA\'s crown jewel. The deer have been eating the greens, and Linda would rather die than let you hunt here. Earl lent you his truck. Fill the bed before sunrise.';
// The local top-10, checked: anything that isn't a list of score rows reads as empty
function readScores() {
  const raw = store.get('hs_scores', []);
  return Array.isArray(raw) ? raw.filter(r => r && typeof r === 'object' && Number.isFinite(r.score)) : [];
}
const DIFF_ORDER = ['easy', 'normal', 'hard'];
function easierDiff(a, b) { if (!DIFF_ORDER.includes(a)) return b; return DIFF_ORDER.indexOf(a) <= DIFF_ORDER.indexOf(b) ? a : b; }
function recordScore() {
  const scores = readScores();
  const row = { score: campaign.score, night, cash: campaign.cash, date: new Date().toLocaleDateString(), deer: campaign.totalDeer || 0, diff: easierDiff(campaign.diffLow, settings.difficulty), sid: campaign.sid };
  const at = campaign.sid ? scores.findIndex(r => r.sid === campaign.sid) : -1;   // Endless after Night 5: same season, same row
  if (at >= 0) scores[at] = row; else scores.push(row);
  scores.sort((a, b) => b.score - a.score); store.set('hs_scores', scores.slice(0, 10));
}
function drawScores() {
  const cx = VW / 2, maxW = Math.min(640, VW - 30);
  ctx.textAlign = 'center'; ctx.fillStyle = '#ff7a1a'; fitFont('🏅 LEADERBOARD', 900, 38, VW - 24); ctx.fillText('🏅 LEADERBOARD', cx, Math.max(60, VH * 0.11));
  let y = Math.max(96, VH * 0.11 + 40);
  ctx.fillStyle = '#9be564'; ctx.font = 'bold 15px system-ui, sans-serif'; ctx.fillText('TOP 10 SEASONS', cx, y); y += 24;
  const scores = readScores();
  ctx.font = '13px system-ui, sans-serif';
  if (!scores.length) { ctx.fillStyle = '#ccc'; ctx.fillText('No finished seasons yet. Go fill that freezer.', cx, y); y += 20; }
  scores.slice(0, 10).forEach((r, i) => {
    ctx.fillStyle = i === 0 ? '#ffd166' : i < 3 ? '#e8e8e8' : '#bbb';
    ctx.fillText(fitText(`${i + 1}. ${r.score} pts · night ${r.night} · $${r.cash}${r.deer ? ' · ' + r.deer + ' deer' : ''}${r.diff && r.diff !== 'normal' ? ' · ' + r.diff : ''} · ${r.date}`, maxW), cx, y); y += 19;
  });
  y += 14;
  ctx.fillStyle = '#9ecbff'; ctx.font = 'bold 15px system-ui, sans-serif'; ctx.fillText('MODE BESTS', cx, y); y += 24;
  const daily = store.get('hs_daily', {}); const dayBest = Math.max(0, ...Object.values(daily));
  const rows = [['Daily Hunt (best day)', dayBest], [`Daily Hunt (today${settings.difficulty !== 'normal' ? ', ' + settings.difficulty : ''})`, daily[dailyKey() + (settings.difficulty && settings.difficulty !== 'normal' ? ':' + settings.difficulty : '')] || 0], ['⛳ Country Club', store.get('hs_golf_best', 0)],
    ['🏘 Maple Court cul-de-sac', store.get('hs_cul_best', 0)], ['🎲 Random neighborhood', store.get('hs_random_best', 0)], ['🎃 Halloween night', store.get('hs_halloween_best', 0)], ['Endless: last night cleared', store.get('hs_endless_best', 0) > 5 ? store.get('hs_endless_best', 0) : 0]];
  ctx.font = '13px system-ui, sans-serif';
  for (const [k, v] of rows) { ctx.fillStyle = v ? '#e8e8e8' : '#777'; ctx.fillText(`${k}: ${v || '—'}`, cx, y); y += 19; }
  ctx.fillStyle = '#888'; ctx.font = '12px system-ui, sans-serif'; ctx.fillText('Scores are saved on this device. Click or press Esc to go back.', cx, VH - 20);
}
function drawKeys() {
  const cx = VW / 2;
  ctx.textAlign = 'center'; ctx.fillStyle = '#ff7a1a'; fitFont('CONTROLS', 900, 38, VW - 24); ctx.fillText('CONTROLS', cx, Math.max(56, VH * 0.1));
  ctx.fillStyle = keyWait ? '#ffd166' : '#aaa'; ctx.font = '14px system-ui, sans-serif';
  const pending = keyWait && BINDABLE.find(b => b[1] === keyWait);
  wrapText(pending ? `Press a key for "${pending[0]}" (Esc cancels)` : 'Click an action, then press the key you want. Keys swap if taken.', cx, Math.max(82, VH * 0.1 + 26), VW - 28, 17);
  const y = buttonGrid(BINDABLE.map(([name, def]) => ({ label: `${name}: ${keyWait === def ? '…' : keyLabel(boundKey(def))}`, fn: () => { keyWait = def; }, hi: keyWait === def })), Math.max(100, VH * 0.1 + 44), 200, 32, 8);
  buttonGrid([{ label: 'Reset to defaults', fn: () => { resetBinds(); keyWait = null; } }, { label: '◀ Back', fn: () => { state = 'settings'; keyWait = null; }, hi: true }], y + 12, 200, 38);
}
function oneNightMode() { return !!(campaign && (campaign.daily || campaign.versus || campaign.coop || campaign.halloween || ['golf', 'cul', 'random', 'custom'].includes(campaign.map))); }
// ---------------------------------------------------------------- two players, one keyboard
let tyler = null;
function twoP() { return !!(campaign && (campaign.versus || campaign.coop)); }
function startTwoPlayer(kind) {
  restoreRandom();
  campaign = freshCampaign(); campaign[kind] = true;
  campaign.seen = Object.fromEntries(Object.keys(SCENES).map(k => [k, true]));
  night = 3;
  startNight();
}
function setupTwoPlayer() {
  tyler = null;
  if (!campaign) return;
  if (campaign.versus) {
    const w = watchers.find(q => q.type === 'hoa');
    if (w) { w.p2 = true; w.label = 'PLAYER 2: Linda\'s cart'; w.baseRange = w.range; w.spot = 0; w.spotCD = 0; }
    G.banner = { text: 'VERSUS: P1 is Dale (WASD). P2 drives the HOA cart (arrow keys, Enter = spotlight). Fill the freezer, or get him busted!', color: '#ffd166', t: 6 };
  }
  if (campaign.coop) {
    tyler = { x: world.shed.x + world.shed.w / 2 + 40, y: world.shed.y + world.shed.h + 40, carry: null, moveAng: 0, step: 0, seenT: 0, crouch: false, quipCD: 0 };
    G.tylerHauls = 0;
    G.banner = { text: 'CO-OP: Dale uses WASD. Tyler uses the arrow keys, Right Shift to sneak, and Enter to grab or drop a deer. Press Enter at the shed to deliver. Tyler can\'t shoot.', color: '#9be564', t: 6 };
  }
}
function p2Action() {
  if (netClient()) { NET.action++; return; }
  if (state !== 'play') return;
  if (campaign.versus) {
    const w = watchers.find(q => q.p2);
    if (!w || w.spotCD > 0) return;
    w.spot = 3; w.spotCD = 12; sfx.alert(); popup(w.x, w.y - 30, '🔦 SPOTLIGHT!', '#fff3b0', 1.4);
    return;
  }
  if (!tyler) return;
  { const R = G.goth; if (R && R.held >= 0 && R.raven && !tyler.carry && dist(R.raven.x, R.raven.y, tyler.x, tyler.y) < 60) { gothReturnShiny(tyler); return; } }
  const shed = world.shed, sx = shed.x + shed.w / 2, sy = shed.y + shed.h / 2;
  if (tyler.carry) {
    const d = tyler.carry;
    if (dist(tyler.x, tyler.y, sx, sy) < 140) {
      const mine = player.carry; player.carry = d; deliver(); player.carry = mine; tyler.carry = null; G.tylerHauls++;
      popup(tyler.x, tyler.y - 40, 'Tyler: "Dad, this one\'s heavy."', '#9be564', 2);
    } else { d.carried = false; tyler.carry = null; sfx.thunk(); }
    return;
  }
  const near = deer.find(d => d.dead && !d.carried && dist(d.x, d.y, tyler.x, tyler.y) < 46);
  if (near) { near.carried = true; tyler.carry = near; sfx.pickup(); popup(tyler.x, tyler.y - 30, 'Tyler grabs the deer', '#9be564', 1.2); if (near.tracked) { near.tracked = false; unlock('tracker'); } }
}
function p2Move() {
  let mx = 0, my = 0;
  const k = netP2Keys();
  if (k.up) my -= 1; if (k.down) my += 1; if (k.left) mx -= 1; if (k.right) mx += 1;
  const len = Math.hypot(mx, my);
  return len ? { x: mx / len, y: my / len } : null;
}
function updateP2Cart(w, dt) {
  w.spotCD = Math.max(0, w.spotCD - dt);
  w.spot = Math.max(0, w.spot - dt);
  w.range = (w.baseRange || 265) * (w.spot > 0 ? 1.45 : 1);
  const m = p2Move();
  if (m) {
    const spd = 125;
    moveCircle(w, m.x * spd * dt, m.y * spd * dt, 20);
    w.x = clamp(w.x, 40, W - 40); w.y = clamp(w.y, 40, H - 40);
    w.moveAng = Math.atan2(m.y, m.x);
    turnTo(w, w.moveAng, 6 * dt);
  }
  computeCone(w);
}
function updateTyler(dt) {
  const t = tyler;
  t.crouch = !!netP2Keys().sneak;
  t.quipCD -= dt; t.seenT = Math.max(0, t.seenT - dt);
  const m = p2Move();
  if (m) {
    const spd = t.carry ? 85 : t.crouch ? 70 : 150;
    moveCircle(t, m.x * spd * dt, m.y * spd * dt, PLAYER_R);
    t.moveAng = Math.atan2(m.y, m.x); t.step += dt * spd * 0.05;
    if (!t.crouch && Math.random() < dt * 1.5) makeNoise(t.x, t.y, (t.carry ? 140 : 80) * noiseMult(), 'step');
  }
  if (t.carry) { const a = t.moveAng + Math.PI; t.carry.x = t.x + Math.cos(a) * 22; t.carry.y = t.y + Math.sin(a) * 22; }
  // neighbors can spot Tyler too. He raises suspicion more slowly than Dale (he's twelve).
  for (const w of watchers) {
    if (w.type === 'drone' || w.type === 'k9' || w.asleep > 0 || !w.poly) continue;
    const d = dist(w.x, w.y, t.x, t.y);
    if (d > coneRange(w) * (t.crouch ? 0.65 : 1) * (t.carry ? 1.25 : 1)) continue;
    if (Math.abs(angDiff(w.ang, Math.atan2(t.y - w.y, t.x - w.x))) > w.fov / 2 && d > 38) continue;
    if (!los(w.x, w.y, t.x, t.y)) continue;
    if (t.seenT <= 0) G.timesSpotted++;
    t.seenT = 0.5; G.unseen = 0; G.anySeen = true;
    if (!G.police) { G.sus = Math.min(100, G.sus + (w.rate || 22) * 0.5 * diff().sus * dt); if (G.sus >= 100) callPolice(w); }
    if (t.quipCD <= 0) { popup(w.x, w.y - 36, pick(['Is that... Tyler?!', 'Tyler, it\'s a school night!', 'Does your mother know you\'re out?']), '#ffe9a8', 2); t.quipCD = 5; }
  }
}
function drawTyler(now) {
  const t = tyler;
  if (!inView(t.x, t.y, 40)) return;
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(t.x + 3, t.y + 4, 11, 8, 0, 0, TAU); ctx.fill();
  const bob = Math.sin(t.step * 2) * 1.5;
  ctx.fillStyle = '#3f8f5a'; ctx.beginPath(); ctx.arc(t.x, t.y + bob * 0.3, t.crouch ? 9 : 11, 0, TAU); ctx.fill(); // hoodie
  ctx.strokeStyle = 'rgba(190,255,200,0.8)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#e8c39e'; ctx.beginPath(); ctx.arc(t.x + Math.cos(t.moveAng) * 3, t.y + Math.sin(t.moveAng) * 3, 6, 0, TAU); ctx.fill();
  ctx.fillStyle = '#2a2a2a'; ctx.beginPath(); ctx.arc(t.x + Math.cos(t.moveAng) * 1.5, t.y + Math.sin(t.moveAng) * 1.5, 6.5, Math.PI * 0.9 + t.moveAng, Math.PI * 2.1 + t.moveAng); ctx.fill(); // cap
  ctx.fillStyle = t.seenT > 0 ? '#ff6b6b' : '#9be564'; ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(t.seenT > 0 ? 'TYLER (seen!)' : 'TYLER (P2)', t.x, t.y - 20);
}
function startMapMode(map) {
  restoreRandom();
  campaign = freshCampaign(); campaign.map = map;
  if (map === 'random') campaign.mapSeed = 1 + Math.floor(Math.random() * 999999);
  campaign.seen = Object.fromEntries(Object.keys(SCENES).map(k => [k, true]));
  night = 3;
  startNight();
}
function startGolf() {
  restoreRandom();
  campaign = freshCampaign(); campaign.map = 'golf';
  campaign.seen = Object.fromEntries(Object.keys(SCENES).map(k => [k, true]));
  night = 2;
  startNight();
}
function onSand() { return !!(world && world.sand && player && world.sand.some(z => dist(z.x, z.y, player.x, player.y) < z.r)); }
function buildGolfWorld() {
  const R = mulberry32(4242);
  const vx = [M + 1000, M + 2100], hy = [M + 650, M + 1350];
  const roads = [];
  vx.forEach(x => roads.push({ x, y: M, w: ROAD, h: H - 2 * M, vert: true, cart: true }));
  roads.push({ x: M, y: hy[0], w: W - 2 * M, h: ROAD, vert: false, cart: true });
  roads.push({ x: M, y: hy[1], w: W - 2 * M, h: ROAD, vert: false, cart: true });
  const xs = [[M, vx[0]], [vx[0] + ROAD, vx[1]], [vx[1] + ROAD, W - M]];
  const ys = [[M, hy[0]], [hy[0] + ROAD, hy[1]], [hy[1] + ROAD, H - M]];
  const blocks = [];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) blocks.push({ x: xs[i][0], y: ys[j][0], w: xs[i][1] - xs[i][0], h: ys[j][1] - ys[j][0], i, j });
  const mk = (x, y, w, h, roof, label) => ({ x: Math.round(x), y: Math.round(y), w, h, top: true, roof, wall: '#e6dfcf', lit: [true, R() < 0.5, true], tv: false, ex: false, label, block: null });
  const bt = blocks[3], bb = blocks[2];
  const club = mk(bt.x + bt.w / 2 - 190, bt.y + 40, 380, 170, '#2f5d4f', 'COUNTRY CLUB');
  const pro = mk(bt.x + bt.w - 190, bt.y + bt.h - 140, 150, 100, '#5a3e36', 'PRO SHOP');
  const barn = mk(bb.x + 60, bb.y + bb.h - 180, 220, 140, '#6b4a3a', 'MAINTENANCE');
  const houses = [club, pro, barn];
  const exHouse = club;
  // Earl's pickup on the west service road is your base tonight
  const truck = { x: 110, y: hy[1] + 32, w: 120, h: 56, shed: true, pickup: true };
  const van = { x: W - 205, y: hy[0] + 30, w: 116, h: 56 };
  const ponds = [{ x: 60, y: hy[0] - 20, w: 170, h: 130, pond: true, noLos: true, name: 'Mud Pond' },
    { x: W / 2 + 30, y: 60, w: 140, h: 90, pond: true, noLos: true, koi: true, name: 'HOA Koi Pond' }];
  for (const bi of [0, 4, 8]) { const b = blocks[bi]; ponds.push({ x: Math.round(b.x + b.w * 0.5), y: Math.round(b.y + b.h * 0.5), w: 230, h: 110, pond: true, noLos: true, name: 'Water Hazard' }); }
  const clubhouse = { x: W / 2 - 190, y: 40, w: 180, h: 110, clubhouse: true };
  const greens = [], tees = [], sand = [];
  blocks.forEach((b, k) => {
    let gx = b.x + b.w * 0.8, gy = b.y + b.h * 0.27;
    if (k === 3) { gx = b.x + b.w * 0.25; gy = b.y + b.h * 0.72; }
    if (k === 2) { gx = b.x + b.w * 0.72; gy = b.y + b.h * 0.28; }
    greens.push({ x: gx, y: gy, r: 70, hole: k + 1 });
    tees.push({ x: k === 3 ? b.x + b.w * 0.75 : b.x + b.w * 0.14, y: k === 3 ? b.y + b.h * 0.5 : b.y + b.h * 0.78 });
    sand.push({ x: gx - 95, y: gy + 62, r: 38 }, { x: gx + 72, y: gy - 64, r: 30 });
  });
  const gardens = greens.map(g => ({ x: g.x - 50, y: g.y - 50, w: 100, h: 100, green: true }));
  const cars = [];
  for (let i = 0; i < 4; i++) cars.push({ x: club.x + 30 + i * 46, y: club.y + club.h + 12, w: 26, h: 40, car: true, color: '#efeee6', top: false });
  const hedges = [];
  for (const bi of [1, 5, 7]) { const b = blocks[bi]; hedges.push({ x: Math.round(b.x + b.w * 0.36), y: b.y + 60, w: 14, h: 200, hedge: true }); }
  const sprinklers = [];
  blocks.forEach(b => { sprinklers.push({ x: b.x + b.w * 0.33, y: b.y + b.h * 0.33, r: 90, phase: R() * 26 }, { x: b.x + b.w * 0.62, y: b.y + b.h * 0.8, r: 90, phase: R() * 26 }); });
  const ice = [], puddles = [];
  const wx = weatherFor(night);
  if (wx === 'rain') for (let k = 0; k < 12; k++) { const rd = roads[k % roads.length]; const t = 0.1 + (k * 0.31) % 0.8; puddles.push(rd.vert ? { x: rd.x + 20 + R() * (rd.w - 40), y: rd.y + rd.h * t, r: 18 + R() * 10 } : { x: rd.x + rd.w * t, y: rd.y + 20 + R() * (rd.h - 40), r: 18 + R() * 10 }); }
  const solids = [...houses, truck, van, clubhouse, ...ponds, ...cars, ...hedges];
  function inRect(x, y, r, m) { return x > r.x - m && x < r.x + r.w + m && y > r.y - m && y < r.y + r.h + m; }
  function blocked(x, y, m) {
    if (x < 30 || y < 30 || x > W - 30 || y > H - 30) return true;
    for (const h of solids) if (inRect(x, y, h, m)) return true;
    for (const rd of roads) if (inRect(x, y, rd, m)) return true;
    for (const g of greens) if (dist(x, y, g.x, g.y) < g.r + m) return true;
    for (const z of sand) if (dist(x, y, z.x, z.y) < z.r + m) return true;
    if (dist(x, y, truck.x + truck.w / 2, truck.y + truck.h / 2) < 150) return true;
    if (dist(x, y, van.x + van.w / 2, van.y + van.h / 2) < 200) return true;
    return false;
  }
  const inWoods = (x, y) => x < M || x > W - M || y < M || y > H - M;
  const trees = [];
  const addTree = (x, y) => { if (trees.some(t => dist(x, y, t.x, t.y) < 60)) return false; trees.push({ x, y, trunk: 13, canopy: 26 + R() * 18, block: 17, hue: R() }); return true; };
  for (let k = 0; k < 900 && trees.length < 230; k++) { const x = R() * W, y = R() * H; if (inWoods(x, y) && !blocked(x, y, 30)) addTree(x, y); }
  for (const b of blocks) { let n = 0; for (let k = 0; k < 60 && n < 3; k++) { const x = b.x + 30 + R() * (b.w - 60), y = b.y + 30 + R() * (b.h - 60); if (!blocked(x, y, 50) && addTree(x, y)) n++; } }
  const bushes = [];
  const addBush = (x, y) => { if (trees.some(t => dist(x, y, t.x, t.y) < 55) || bushes.some(q => dist(x, y, q.x, q.y) < 80)) return false; bushes.push({ x, y, r: 30 + R() * 8, seed: R() * 100 }); return true; };
  for (const b of blocks) { let n = 0; for (let k = 0; k < 80 && n < 3; k++) { const x = b.x + 30 + R() * (b.w - 60), y = b.y + 30 + R() * (b.h - 60); if (!blocked(x, y, 36) && addBush(x, y)) n++; } }
  for (let k = 0; k < 400 && bushes.length < 80; k++) { const x = R() * W, y = R() * H; if (inWoods(x, y) && !blocked(x, y, 30)) addBush(x, y); }
  const grass = [];
  for (let k = 0; k < 700 && grass.length < 34; k++) {
    const x = R() * W, y = R() * H;
    if (!inWoods(x, y) || blocked(x, y, 10)) continue;
    const edge = Math.min(Math.abs(x - M), Math.abs(x - (W - M)), Math.abs(y - M), Math.abs(y - (H - M)));
    if (edge > 150 || grass.some(g => dist(g.x, g.y, x, y) < 150)) continue;
    grass.push({ x, y, r: 55 + R() * 25, seed: R() * 100 });
  }
  const lights = [];
  for (const rd of roads) {
    if (rd.vert) for (let y = rd.y + 200; y < rd.y + rd.h; y += 620) lights.push({ x: rd.x - 6, y });
    else for (let x = rd.x + 260; x < rd.x + rd.w; x += 620) lights.push({ x, y: rd.y - 6 });
  }
  const dogs = [{ ax: barn.x + barn.w + 40, ay: barn.y + 40, x: barn.x + barn.w + 40, y: barn.y + 40, ang: 0, bark: 0, cd: 0, name: 'Bogey' }];
  const signs = [
    { x: M + 200, y: hy[0] - 30, text: 'WHISPERING PINES COUNTRY CLUB' },
    { x: vx[0] + ROAD + 80, y: hy[0] - 24, text: 'MEMBERS ONLY — HOA 14.3' },
    { x: vx[1] - 120, y: hy[1] + ROAD + 24, text: 'CART PATH ONLY' },
    { x: W - M - 120, y: hy[0] + ROAD + 26, text: 'NO TRESPASSING (ask for Steve)' },
  ];
  const floods = [{ x: club.x + club.w / 2, y: club.y + club.h + 4, on: 0, house: club }, { x: barn.x + barn.w / 2, y: barn.y + barn.h + 4, on: 0, house: barn }];
  const props = tees.slice(0, 6).map(t => ({ x: t.x + 34, y: t.y, kind: 'trash', down: 0 }));
  world = { golf: true, roads, blocks, houses, fences: [], truck, shed: truck, van, ponds, clubhouse, garage: { x: -999, y: -999 }, cars, hedges, sprinklers, ice, puddles, creekGaps: [], clearing: null, phase2: [], pools: [], grass, solids, trees, bushes, lights, dogs, signs, floods, gardens, props, exHouse, vx, hy, inWoods, blocked, greens, tees, sand };
}
const CUL_INTRO = 'Maple Court, Birch Court and Elm Court: three dead-end streets off Pruitt Parkway. Darlene moved her book club here for the night, so Dale\'s camping in the shed behind her sister\'s place. Every street is a dead end. Plan your way out.';
const RANDOM_INTRO = 'Same HOA, different streets. Roads, pools and hedges are shuffled every time. Nobody knows this place, including you.';
// ---------------------------------------------------------------------------
// Maps from JSON. A map spec lists roads, houses, ponds and so on; worldFromSpec fills in
// everything else (trees, bushes, lights, props, dogs). Maple Court is built this way, and so
// are custom maps from the level editor (editor.html) and mod files (maps/*.json).
// ---------------------------------------------------------------------------
function culSpec() {
  const hy0 = M + 1120, vx = [M + 700, M + 2300], BR = 200;
  const spec = { format: 'hunter-sub-map', version: 1, name: 'Maple Court', seed: 777, vx, hy: [hy0, hy0],
    roads: [{ x: M, y: hy0, w: W - 2 * M, h: ROAD }], bulbs: [], houses: [], ponds: [], pools: [], signs: [],
    woods: [{ x: vx[0] + ROAD + 420, y: 0, w: vx[1] - vx[0] - ROAD - 840, h: hy0 - 90 },
      { x: 0, y: hy0 + ROAD + 90, w: W / 2 - 700, h: H - hy0 - ROAD - 90 }, { x: W / 2 + 700, y: hy0 + ROAD + 90, w: W - M - 420 - (W / 2 + 700), h: H - hy0 - ROAD - 90 }] };
  const courts = [{ name: 'MAPLE CT', x: vx[0], cy: M + 420, north: true }, { name: 'BIRCH CT', x: vx[1], cy: M + 420, north: true }, { name: 'ELM CT', x: W / 2 - ROAD / 2, cy: H - M - 330, north: false }];
  for (const c of courts) {
    const cx = c.x + ROAD / 2, cy = c.cy;
    spec.roads.push(c.north ? { x: c.x, y: cy, w: ROAD, h: hy0 - cy, vert: true } : { x: c.x, y: hy0 + ROAD, w: ROAD, h: cy - hy0 - ROAD, vert: true });
    spec.bulbs.push({ x: cx, y: cy, r: BR, name: c.name });
    const farY = c.north ? cy - BR - 30 - HH : cy + BR + 30;
    for (let k = -1; k <= 1; k++) spec.houses.push({ x: cx + k * (HW + 40) - HW / 2, y: farY + (k ? (c.north ? 70 : -70) : 0), top: !c.north });
    for (let k = 0; k < 2; k++) {
      const yy = c.north ? cy + BR + 40 + k * (HH + 60) : cy - BR - 40 - HH - k * (HH + 60);
      // a short court only fits one row: never put a house on Pruitt Parkway itself
      if (c.north ? yy + HH > hy0 - 30 : yy < hy0 + ROAD + 30) continue;
      spec.houses.push({ x: c.x - 50 - HW, y: yy, top: !c.north }, { x: c.x + ROAD + 50, y: yy, top: !c.north });
    }
    spec.signs.push({ x: c.x + ROAD + 70, y: hy0 + (c.north ? -24 : ROAD + 24), text: c.name + ' (DEAD END)' });
  }
  spec.houses[1].ex = true;
  spec.ponds.push({ x: 60, y: hy0 - 160, w: 170, h: 130, name: 'Mud Pond' }, { x: W / 2 - 70, y: M + 160, w: 160, h: 100, name: 'Greenbelt Pond' });
  spec.clubhouse = { x: W - M - 330, y: hy0 + ROAD + 70 };
  const bf = spec.houses[8];
  spec.pools.push({ x: bf.x + 30, y: bf.y - 130, w: 120, h: 64 });
  spec.van = { x: W - 205, y: hy0 + 30 };
  spec.signs.push({ x: M + 220, y: hy0 - 24, text: 'PRUITT PARKWAY' });
  return spec;
}
// Check a map spec and clean it up. Returns { spec, errors }. Bad entries are dropped, not fatal.
function validateMap(raw) {
  const errors = [];
  if (!raw || typeof raw !== 'object') return { spec: null, errors: ['Not a JSON object'] };
  const num = v => typeof v === 'number' && isFinite(v);
  const inMap = o => o && num(o.x) && num(o.y) && o.x >= 0 && o.y >= 0 && o.x <= W && o.y <= H;
  const rects = (k, defW, defH) => (Array.isArray(raw[k]) ? raw[k] : []).filter(o => {
    const ok = inMap(o) && (o.w === undefined || (num(o.w) && o.w > 4 && o.w < W)) && (o.h === undefined || (num(o.h) && o.h > 4 && o.h < H));
    if (!ok) errors.push(`Skipped a bad entry in "${k}"`);
    return ok;
  }).map(o => Object.assign({}, o, { x: Math.round(o.x), y: Math.round(o.y), w: Math.round(o.w || defW), h: Math.round(o.h || defH) }));
  const spec = {
    format: 'hunter-sub-map', version: 1,
    name: String(raw.name || 'Custom Neighborhood').slice(0, 40), author: String(raw.author || '').slice(0, 40), intro: String(raw.intro || '').slice(0, 400),
    seed: num(raw.seed) ? raw.seed | 0 : 9001,
    roads: rects('roads', ROAD, ROAD).map(r => Object.assign(r, { vert: r.vert !== undefined ? !!r.vert : r.h > r.w })),
    houses: rects('houses', HW, HH).map(h => Object.assign(h, { top: !!h.top, ex: !!h.ex })),
    ponds: rects('ponds', 160, 100), pools: rects('pools', 120, 64), hedges: raw.hedges === undefined ? undefined : rects('hedges', 14, 140), woods: rects('woods', 300, 300),
    bulbs: (Array.isArray(raw.bulbs) ? raw.bulbs : []).filter(b => inMap(b) && num(b.r) && b.r > 40 && b.r < 600),
    bushes: (Array.isArray(raw.bushes) ? raw.bushes : []).filter(b => inMap(b) && (b.r === undefined || (num(b.r) && b.r >= 8 && b.r <= 120))),
    trees: (Array.isArray(raw.trees) ? raw.trees : []).filter(t => inMap(t) && (t.r === undefined || (num(t.r) && t.r >= 8 && t.r <= 160))),
    signs: (Array.isArray(raw.signs) ? raw.signs : []).filter(inMap).map(g => ({ x: g.x, y: g.y, text: String(g.text || '').slice(0, 40) })),
    shed: inMap(raw.shed) ? raw.shed : null, van: inMap(raw.van) ? raw.van : null, clubhouse: inMap(raw.clubhouse) ? raw.clubhouse : null,
    vx: Array.isArray(raw.vx) && raw.vx.length === 2 && raw.vx.every(num) ? raw.vx : null,
    hy: Array.isArray(raw.hy) && raw.hy.length === 2 && raw.hy.every(num) ? raw.hy : null,
  };
  if (!spec.houses.length) errors.push('A map needs at least one house (one of them is Darlene\'s).');
  if (!spec.roads.length) errors.push('A map needs at least one road (the HOA cart and the police drive on them).');
  if (spec.houses.length && !spec.houses.some(h => h.ex)) spec.houses[0].ex = true;
  if (spec.houses.filter(h => h.ex).length > 1) { let first = true; for (const h of spec.houses) if (h.ex) { if (!first) h.ex = false; first = false; } }
  return { spec: errors.some(e => e.startsWith('A map needs')) ? null : spec, errors };
}
function worldFromSpec(spec) {
  const R = mulberry32(spec.seed || 777);
  const roofs = ['#6b4a3a', '#4a5568', '#5a3e36', '#3d4f5c', '#704f3b', '#55606b', '#4f5d45'];
  const walls = ['#d9cfbf', '#c9d3d9', '#e3d6c4', '#cfc6b8', '#d6dccf', '#e0d0c0'];
  const roads = spec.roads.map(r => Object.assign({}, r));
  const bulbs = (spec.bulbs || []).map(b => Object.assign({}, b));
  for (const b of bulbs) roads.push({ x: Math.round(b.x - b.r * 0.7), y: Math.round(b.y - b.r * 0.7), w: Math.round(b.r * 1.4), h: Math.round(b.r * 1.4), vert: false, bulb: true });
  const houses = spec.houses.map(h => ({ x: Math.round(h.x), y: Math.round(h.y), w: h.w || HW, h: h.h || HH, top: !!h.top,
    roof: roofs[Math.floor(R() * roofs.length)], wall: walls[Math.floor(R() * walls.length)], lit: [R() < 0.4, R() < 0.4, R() < 0.4], tv: R() < 0.25, ex: !!h.ex, block: null }));
  const exHouse = houses.find(h => h.ex) || houses[0];
  exHouse.ex = true; exHouse.roof = '#a24d7a'; exHouse.wall = '#f2d7e4'; exHouse.lit = [true, true, false];
  // vx / hy: two "main" vertical and horizontal road lines, used by police and patrol routes
  const vRoads = roads.filter(r => r.vert && !r.bulb), hRoads = roads.filter(r => !r.vert && !r.bulb);
  const vx = spec.vx || (vRoads.length ? [vRoads[0].x, (vRoads[1] || vRoads[0]).x] : [hRoads[0].x + 200, hRoads[0].x + hRoads[0].w - 300]);
  const hy = spec.hy || (hRoads.length ? [hRoads[0].y, (hRoads[1] || hRoads[0]).y] : [vRoads[0].y + 200, vRoads[0].y + vRoads[0].h - 300]);
  const blocks = houses.map(h => ({ x: h.x - 200, y: h.y - 150, w: h.w + 400, h: h.h + 300, i: 0, j: 0 }));
  while (blocks.length < 9) blocks.push(blocks[blocks.length % Math.max(1, houses.length)]);
  for (const h of houses) h.block = blocks[houses.indexOf(h)];
  const truck = spec.shed ? { x: Math.round(spec.shed.x), y: Math.round(spec.shed.y), w: 100, h: 70, shed: true }
    : exHouse.top ? { x: exHouse.x + exHouse.w / 2 - 50, y: exHouse.y + exHouse.h + 76, w: 100, h: 70, shed: true }
      : { x: exHouse.x + exHouse.w / 2 - 50, y: exHouse.y - 146, w: 100, h: 70, shed: true };
  truck.x = clamp(truck.x, M + 20, W - M - 120); truck.y = clamp(truck.y, M + 20, H - M - 120);   // never off the map
  const van = spec.van ? { x: Math.round(spec.van.x), y: Math.round(spec.van.y), w: 116, h: 56 } : { x: W - 205, y: hy[0] + 30, w: 116, h: 56 };
  const ponds = (spec.ponds || []).map(p => ({ x: p.x, y: p.y, w: p.w, h: p.h, pond: true, noLos: true, name: p.name || '' }));
  const clubhouse = spec.clubhouse ? { x: Math.round(spec.clubhouse.x), y: Math.round(spec.clubhouse.y), w: 180, h: 110, clubhouse: true } : { x: -999, y: -999, w: 1, h: 1, clubhouse: true };
  const pools = (spec.pools || []).map(p => ({ x: p.x, y: p.y, w: p.w, h: p.h, pool: true, noLos: true }));
  if (spec.clubhouse) pools.push({ x: clubhouse.x + 200, y: clubhouse.y + 10, w: 150, h: 80, pool: true, noLos: true, hoaPool: true });
  const garage = { x: exHouse.x + exHouse.w + 10, y: exHouse.y + exHouse.h / 2 };
  const carColors = ['#8a2b2b', '#2b4a8a', '#d8d8d0', '#3a3a3a', '#5a7a3a', '#a88a2a'];
  const cars = [];
  for (const bl of bulbs) for (let k = 0; k < 2; k++) { const a = R() * TAU; cars.push({ x: Math.round(bl.x + Math.cos(a) * bl.r * 0.48 - 12), y: Math.round(bl.y + Math.sin(a) * bl.r * 0.48 - 22), w: 24, h: 44, car: true, color: carColors[Math.floor(R() * carColors.length)], top: false }); }
  const hedges = (spec.hedges || []).map(g => ({ x: g.x, y: g.y, w: g.w, h: g.h, hedge: true }));
  if (!spec.hedges) houses.forEach((h, i) => { if (i % 4 === 2 && !h.ex) hedges.push({ x: h.x - 26, y: h.y + 10, w: 14, h: h.h - 20, hedge: true }); });
  const sprinklers = houses.filter((h, i) => i % 3 === 1 && !h.ex).map(h => ({ x: h.x + 40, y: h.top ? h.y - 18 : h.y + h.h + 18, r: 70, phase: R() * 26 }));
  const ice = [], puddles = [];
  const wx = weatherFor(night);
  const mainRoads = roads.filter(r => !r.bulb);
  if (wx === 'snow') for (let k = 0; k < 7; k++) { const rd = mainRoads[k % mainRoads.length]; const t = 0.15 + (k * 0.27) % 0.7; ice.push(rd.vert ? { x: rd.x + 10, y: rd.y + rd.h * t, w: rd.w - 20, h: 120 } : { x: rd.x + rd.w * t, y: rd.y + 10, w: 150, h: rd.h - 20 }); }
  if (wx === 'rain') for (let k = 0; k < 10; k++) { const rd = mainRoads[k % mainRoads.length]; const t = 0.1 + (k * 0.31) % 0.8; puddles.push(rd.vert ? { x: rd.x + 20 + R() * (rd.w - 40), y: rd.y + rd.h * t, r: 18 + R() * 10 } : { x: rd.x + rd.w * t, y: rd.y + 20 + R() * (rd.h - 40), r: 18 + R() * 10 }); }
  const solids = [...houses, truck, van, clubhouse, ...pools, ...ponds, ...cars, ...hedges];
  const exZone = exHouse.top ? { x: exHouse.x - 90, y: exHouse.y - 60, w: exHouse.w + 180, h: exHouse.h + 270 } : { x: exHouse.x - 90, y: exHouse.y - 20, w: exHouse.w + 180, h: exHouse.h + 120 };
  function inRect(x, y, r, m) { return x > r.x - m && x < r.x + r.w + m && y > r.y - m && y < r.y + r.h + m; }
  function blocked(x, y, m) {
    if (x < 30 || y < 30 || x > W - 30 || y > H - 30) return true;
    for (const h of solids) if (inRect(x, y, h, m)) return true;
    for (const rd of roads) if (inRect(x, y, rd, m)) return true;
    for (const bl of bulbs) if (dist(x, y, bl.x, bl.y) < bl.r + m) return true;
    if (inRect(x, y, exZone, 0)) return true;
    if (dist(x, y, truck.x + truck.w / 2, truck.y + truck.h / 2) < 150) return true;
    if (dist(x, y, van.x + van.w / 2, van.y + van.h / 2) < 200) return true;
    return false;
  }
  const woods = spec.woods || [];
  const inWoods = (x, y) => x < M || x > W - M || y < M || y > H - M || woods.some(z => inRect(x, y, z, 0));
  const trees = [];
  const addTree = (x, y) => { if (trees.some(t => dist(x, y, t.x, t.y) < 60)) return false; trees.push({ x, y, trunk: 13, canopy: 26 + R() * 18, block: 17, hue: R() }); return true; };
  for (const t of spec.trees || []) if (!blocked(t.x, t.y, 20)) addTree(t.x, t.y);
  for (let k = 0; k < 1400 && trees.length < 300; k++) { const x = R() * W, y = R() * H; if (inWoods(x, y) && !blocked(x, y, 30)) addTree(x, y); }
  const bushes = [];
  const addBush = (x, y, r) => { if (trees.some(t => dist(x, y, t.x, t.y) < 55) || bushes.some(q => dist(x, y, q.x, q.y) < 80)) return false; bushes.push({ x, y, r: r || 30 + R() * 8, seed: R() * 100 }); return true; };
  for (const b of spec.bushes || []) if (!blocked(b.x, b.y, 20)) addBush(b.x, b.y, b.r);
  for (const h of houses) { let n = 0; for (let k = 0; k < 40 && n < 2; k++) { const x = h.x - 60 + R() * (h.w + 120), y = h.y - 80 + R() * (h.h + 160); if (!blocked(x, y, 36) && addBush(x, y)) n++; } }
  for (let k = 0; k < 600 && bushes.length < 100; k++) { const x = R() * W, y = R() * H; if (inWoods(x, y) && !blocked(x, y, 30)) addBush(x, y); }
  const grass = [];
  for (let k = 0; k < 700 && grass.length < 30; k++) {
    const x = R() * W, y = R() * H;
    if (!inWoods(x, y) || blocked(x, y, 10) || grass.some(g => dist(g.x, g.y, x, y) < 150)) continue;
    grass.push({ x, y, r: 50 + R() * 25, seed: R() * 100 });
  }
  const lights = [];
  for (const rd of mainRoads) {
    if (rd.vert) for (let y = rd.y + 150; y < rd.y + rd.h; y += 380) lights.push({ x: rd.x - 6, y });
    else for (let x = rd.x + 200; x < rd.x + rd.w; x += 430) lights.push({ x, y: rd.y - 6 });
  }
  for (const bl of bulbs) lights.push({ x: bl.x, y: bl.y });
  const dogs = [];
  houses.forEach((h, i) => { if (i % 6 !== 4 || h.ex) return; const ax = h.x + h.w / 2, ay = h.top ? h.y + h.h + 40 : h.y - 40; dogs.push({ ax, ay, x: ax, y: ay, ang: 0, bark: 0, cd: 0, name: pick(['Biscuit', 'Duke', 'Pickles', 'Moose']) }); });
  const signs = (spec.signs || []).map(g => Object.assign({}, g));
  if (spec.clubhouse) signs.push({ x: clubhouse.x + 90, y: clubhouse.y - 14, text: 'HOA POOL: CLOSED' });
  const floods = houses.filter((h, i) => i % 6 === 3 && !h.ex).map(h => ({ x: h.x + h.w / 2, y: h.top ? h.y + h.h + 4 : h.y - 4, on: 0, house: h }));
  const gardens = [], props = [];
  houses.forEach((h, i) => {
    if (i % 3 === 0 || h.ex) { const g = { x: h.x - 95, y: h.y + 40, w: 80, h: 80, ex: h.ex }; gardens.push(g); props.push({ x: g.x + 8, y: g.y + 8, kind: 'gnome', down: 0 }); }
    if (i % 2 === 1) props.push({ x: h.x + h.w - 4, y: h.top ? h.y - 22 : h.y + h.h + 22, kind: 'trash', down: 0 });
  });
  world = { cul: true, custom: !!spec.custom, mapName: spec.name, roads, bulbs, blocks, houses, fences: [], truck, shed: truck, van, ponds, clubhouse, garage, cars, hedges, sprinklers, ice, puddles, creekGaps: [], clearing: null, phase2: [], pools, grass, solids, trees, bushes, lights, dogs, signs, floods, gardens, props, exHouse, vx, hy, inWoods, blocked };
}
function buildCulWorld() {
  if (campaign.map === 'custom' && campaign.customSpec) worldFromSpec(Object.assign({ custom: true }, campaign.customSpec));
  else worldFromSpec(culSpec());
}
function setupSpecWatchers() {
  // Generic neighbors for custom maps: Darlene at her house, and the HOA cart driving every road.
  const h = world.exHouse;
  watchers = [];
  const pts = h.top ? [{ x: h.x - 45, y: h.y + h.h - 10 }, { x: h.x - 45, y: h.y - 14 }, { x: h.x + h.w + 45, y: h.y - 14 }, { x: h.x + h.w + 45, y: h.y + h.h - 10 }]
    : [{ x: h.x - 45, y: h.y + 10 }, { x: h.x - 45, y: h.y + h.h + 14 }, { x: h.x + h.w + 45, y: h.y + h.h + 14 }, { x: h.x + h.w + 45, y: h.y + 10 }];
  watchers.push(makeWatcher('ex', [pts[0], pts[1], pts[2], pts[3], pts[2], pts[1]], { speed: 50, fov: 1.45, range: 235, pause: 2.6, rate: 32, label: NAMES.ex + ' (ex)' }));
  const route = [];
  for (const r of world.roads) { if (r.bulb) continue; if (r.vert) route.push({ x: r.x + r.w / 2, y: r.y + 40 }, { x: r.x + r.w / 2, y: r.y + r.h - 40 }); else route.push({ x: r.x + 40, y: r.y + r.h / 2 }, { x: r.x + r.w - 40, y: r.y + r.h / 2 }); }
  if (route.length >= 2) watchers.push(makeWatcher('hoa', route.concat(route.slice(1, -1).reverse()), { speed: 105, fov: 1.15, range: 265, pause: 1.4, rate: 22, label: NAMES.hoa + ', HOA Pres.', cart: true }));
  world.houses.forEach((hh, i) => {
    if (i % 5 !== 2 || hh.ex) return;
    const cw = makeWatcher('cam', [{ x: hh.x + 70, y: hh.top ? hh.y - 7 : hh.y + hh.h + 7 }], { speed: 0, fov: 0.9, range: 135, pause: 999, rate: 14, label: 'Doorbell cam', fixed: true });
    cw.ang = cw.baseAng = hh.top ? -Math.PI / 2 : Math.PI / 2; cw.pi = 0;
    watchers.push(cw);
  });
  fixWalkerRoutes(true);   // custom maps: the HOA cart follows connected roads too
}
// Custom maps: load from the level editor (saved in this browser), a .json file, or ?map=maps/name.json
function startCustomMap(spec) {
  const v = validateMap(spec);
  if (!v.spec) { alert('That map can\'t be played:\n' + v.errors.join('\n')); return false; }
  restoreRandom();
  campaign = freshCampaign(); campaign.map = 'custom'; campaign.customSpec = v.spec;
  campaign.seen = Object.fromEntries(Object.keys(SCENES).map(k => [k, true]));
  night = 3;
  startNight();
  const problems = [];
  if (!deer.length) problems.push('There\'s nowhere for deer to live (water or buildings cover every open spot). Add some open ground or woods.');
  if (!nearTruck()) problems.push('Dale can\'t reach his shed from where he starts. Move the shed into open ground.');
  if (problems.length) { story = null; state = 'title'; alert('That map can\'t be played:\n' + problems.join('\n')); return false; }
  return true;
}
function pickMapFile() {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
  inp.onchange = () => { const f = inp.files && inp.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { try { const spec = JSON.parse(rd.result); if (startCustomMap(spec)) store.set('hs_custom_map', spec); } catch (e) { alert('Not a valid map file: ' + e.message); } }; rd.readAsText(f); };
  inp.click();
}
function customMapMenu() {
  const saved = store.get('hs_custom_map', null);
  if (saved && typeof saved === 'object') state = 'custom'; else pickMapFile();
}
(function loadMapFromUrl() {
  try {
    const q = new URLSearchParams(location.search);
    const m = q.get('map');
    if (q.get('custom') === '1') { const saved = store.get('hs_custom_map', null); if (saved) setTimeout(() => startCustomMap(saved), 0); }
    else if (m && /^maps\/[\w-]+\.json$/.test(m)) fetch(m).then(r => r.json()).then(spec => startCustomMap(spec)).catch(() => {});
  } catch (e) { /* no URL support */ }
})();
function setupCulWatchers() {
  const { vx, hy, exHouse: h, bulbs } = world;
  watchers = [];
  const x0 = h.x - 45, x1 = h.x + h.w + 45, y0 = h.y + h.h + 14, yb = h.y + 10;
  const A = { x: x0, y: yb }, B = { x: x0, y: y0 }, C = { x: x1, y: y0 }, D = { x: x1, y: yb };
  watchers.push(makeWatcher('ex', [A, B, C, D, C, B], { speed: 50, fov: 1.45, range: 235, pause: 2.6, rate: 32, label: NAMES.ex + ' (ex)' }));
  const y = hy[0] + 60, mid = W / 2;
  watchers.push(makeWatcher('hoa', [
    { x: M + 80, y }, { x: vx[0] + 60, y }, { x: vx[0] + 60, y: bulbs[0].y + 60 }, { x: vx[0] + 60, y },
    { x: mid, y }, { x: mid, y: bulbs[2].y - 60 }, { x: mid, y },
    { x: vx[1] + 60, y }, { x: vx[1] + 60, y: bulbs[1].y + 60 }, { x: vx[1] + 60, y }, { x: W - M - 80, y }],
    { speed: 105, fov: 1.15, range: 265, pause: 1.4, rate: 22, label: NAMES.hoa + ', HOA Pres.', cart: true }));
  watchers.push(makeWatcher('watch', [{ x: mid + 90, y: hy[0] + ROAD + 40 }, { x: mid + 90, y: bulbs[2].y - 230 }],
    { speed: 58, fov: 1.3, range: 225, pause: 2.5, rate: 22, label: NAMES.watch + ', Nbhd Watch' }));
  for (const idx of [7, 13]) {
    const hh = world.houses[idx];
    if (!hh || hh.ex) continue;
    const cw = makeWatcher('cam', [{ x: hh.x + 70, y: hh.top ? hh.y - 7 : hh.y + hh.h + 7 }], { speed: 0, fov: 0.9, range: 135, pause: 999, rate: 14, label: 'Doorbell cam', fixed: true });
    cw.ang = cw.baseAng = hh.top ? -Math.PI / 2 : Math.PI / 2; cw.pi = 0;
    watchers.push(cw);
  }
  fixWalkerRoutes();
}
function drawBulbs() {
  if (!world.bulbs) return;
  for (const b of world.bulbs) {
    if (!inView(b.x, b.y, b.r + 40)) continue;
    ctx.fillStyle = '#6d706b'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 14, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2d2f33'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2f5a2c'; ctx.beginPath(); ctx.arc(b.x, b.y, 46, 0, TAU); ctx.fill(); // landscaped island
    ctx.fillStyle = '#3d7a37'; ctx.beginPath(); ctx.arc(b.x - 10, b.y - 8, 22, 0, TAU); ctx.fill();
  }
}
function setupGolfWatchers() {
  const { vx, hy } = world;
  watchers = [];
  watchers.push(makeWatcher('hoa', [
    { x: vx[0] + 60, y: hy[0] + 60 }, { x: vx[1] + 60, y: hy[0] + 60 },
    { x: vx[1] + 60, y: hy[1] + 60 }, { x: vx[0] + 60, y: hy[1] + 60 }],
    { speed: 105, fov: 1.15, range: 265, pause: 1.4, rate: 22, label: 'Linda (club cart)', cart: true }));
  for (const bi of [1, 7]) {
    const b = world.blocks[bi];
    watchers.push(makeWatcher('watch', [{ x: b.x + 60, y: b.y + b.h * 0.5 }, { x: b.x + b.w - 60, y: b.y + b.h * 0.5 }],
      { speed: 55, fov: 1.3, range: 230, pause: 2.5, rate: 24, label: 'Club Security' }));
  }
  watchers.push(makeWatcher('treasurer', [{ x: M + 60, y: hy[1] + 25 }, { x: W - M - 60, y: hy[1] + 25 }],
    { speed: 55, fov: 1.3, range: 225, pause: 3, rate: 22, label: 'Groundskeeper Hank' }));
  const d = makeWatcher('drone', [{ x: W / 2, y: H / 2 }], { speed: 95, fov: TAU, range: 90, pause: 0, rate: 30, label: 'Gary\'s Drone', fixed: false });
  d.x = vx[1] + 60; d.y = hy[0] - 200; d.target = { x: d.x, y: d.y }; d.crashT = rnd(30, 50); d.down = 0;
  watchers.push(d);
}
function drawGolf(now) {
  // fairways
  for (const b of world.blocks) {
    if (!inView(b.x + b.w / 2, b.y + b.h / 2, Math.max(b.w, b.h))) continue;
    ctx.fillStyle = '#4a8a3a'; ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = '#52953f'; for (let x = b.x; x < b.x + b.w; x += 80) ctx.fillRect(x, b.y, 40, b.h);
  }
  if (G && G.weather === 'snow') { ctx.fillStyle = 'rgba(232,238,244,0.62)'; ctx.fillRect(cam.x - 20, cam.y - 20, VW + 40, VH + 40); }
  // cart paths
  for (const r of world.roads) { ctx.fillStyle = '#8f7f5c'; ctx.fillRect(r.x - 10, r.y - 10, r.w + 20, r.h + 20); }
  for (const r of world.roads) { ctx.fillStyle = '#b5a37a'; ctx.fillRect(r.x, r.y, r.w, r.h); }
  // tees, bunkers, greens with pins
  for (const t of world.tees) { if (!inView(t.x, t.y, 60)) continue; ctx.fillStyle = '#62a64e'; ctx.fillRect(t.x - 30, t.y - 18, 60, 36); ctx.fillStyle = '#fff'; ctx.fillRect(t.x - 14, t.y - 2, 4, 4); ctx.fillRect(t.x + 10, t.y - 2, 4, 4); }
  for (const z of world.sand) { if (!inView(z.x, z.y, 60)) continue; ctx.fillStyle = '#e1d1a0'; ctx.beginPath(); ctx.ellipse(z.x, z.y, z.r, z.r * 0.75, 0.3, 0, TAU); ctx.fill(); }
  for (const g of world.greens) {
    if (!inView(g.x, g.y, 100)) continue;
    ctx.fillStyle = '#6fbf5e'; ctx.beginPath(); ctx.arc(g.x, g.y, g.r, 0, TAU); ctx.fill();
    ctx.fillStyle = '#5aa84b'; ctx.beginPath(); ctx.arc(g.x, g.y, g.r * 0.6, 0, TAU); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(g.x, g.y, 3, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ddd'; ctx.fillRect(g.x - 1, g.y - 30, 2, 30);
    const wave = Math.sin(now / 300 + g.hole) * 2;
    ctx.fillStyle = '#e33'; ctx.beginPath(); ctx.moveTo(g.x + 1, g.y - 30); ctx.lineTo(g.x + 16, g.y - 25 + wave); ctx.lineTo(g.x + 1, g.y - 20); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 9px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(String(g.hole), g.x + 7, g.y - 23);
  }
}
function drawPickup() {
  const t = world.shed;
  ctx.save(); ctx.translate(t.x, t.y);
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(6, 6, t.w, t.h);
  ctx.fillStyle = '#2f5a7a'; roundRect(ctx, 0, 0, t.w, t.h, 8); ctx.fill();
  ctx.fillStyle = '#244860'; ctx.fillRect(6, 6, 64, t.h - 12);
  ctx.fillStyle = '#9fc3d6'; ctx.fillRect(78, 8, 10, t.h - 16);
  ctx.fillStyle = '#356a8c'; ctx.fillRect(90, 6, 26, t.h - 12);
  for (let i = 0; i < Math.min(G ? G.delivered : 0, 6); i++) { ctx.fillStyle = '#8a6136'; ctx.beginPath(); ctx.ellipse(18 + (i % 3) * 18, 18 + Math.floor(i / 3) * 20, 9, 6, 0.4, 0, TAU); ctx.fill(); }
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = 'bold 12px system-ui, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('EARL\'S TRUCK', t.x + t.w / 2, t.y - 24);
  if (G) { ctx.fillStyle = '#9ecbff'; ctx.font = '11px system-ui, sans-serif'; ctx.fillText(`In the bed: ${G.freezer} venison pack${G.freezer === 1 ? '' : 's'}`, t.x + t.w / 2, t.y - 10); }
}

function drawShop(now) {
  const cx = VW / 2;
  let y = Math.max(60, VH * 0.1);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff7a1a'; fitFont('EARL\'S BAIT & TACKLE', 900, 40, VW - 24);
  ctx.fillText('EARL\'S BAIT & TACKLE', cx, y);
  ctx.fillStyle = '#bbb'; ctx.font = 'italic 14px system-ui, sans-serif';
  ctx.fillText(fitText((campaign.earlLine || '"Heard you had a busy night. Don\'t tell me about it. What do you need?"') + '  — Earl', VW - 30), cx, y + 28);
  ctx.fillStyle = '#9be564'; ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText(`Cash: $${campaign.cash}`, cx, y + 58);
  // Cabin fund progress toward the Pruitt Woods deposit
  const fw = Math.min(420, VW - 40), fx = cx - fw / 2, fy = y + 70;
  if (night < 5) {
    ctx.fillStyle = 'rgba(255,255,255,0.1)'; roundRect(ctx, fx, fy, fw, 10, 5); ctx.fill();
    ctx.fillStyle = campaign.cash >= CABIN_GOAL ? '#9be564' : '#e0b83a';
    roundRect(ctx, fx, fy, Math.max(10, fw * clamp(campaign.cash / CABIN_GOAL, 0, 1)), 10, 5); ctx.fill();
    ctx.fillStyle = '#bbb'; ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(fitText(`Cabin fund: $${campaign.cash} / $${CABIN_GOAL} (auction after Night 5${settings.difficulty === 'easy' ? '; Earl chips in $300 on Easy' : ''}). Every dollar you spend here comes out of it.`, VW - 30), cx, fy + 26);
  }
  y = fy + 36;
  if (night < 5 && !campaign.daily) {
    const nn = night + 1;
    const wx = weatherFor(nn), mo = MOON[['new', 'crescent', 'half', 'gibbous', 'full'][(nn - 1) % 5]];
    ctx.fillStyle = '#9ecbff'; ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(fitText(`📻 Forecast for Night ${nn}: ${({ clear: 'clear skies', rain: 'rain & lightning', fog: 'thick fog', snow: 'first snow, icy roads' })[wx]} · ${mo.label.split(':')[0]} · New: ${FORECAST_NEW[nn] || 'more of the same'}`, VW - 30), cx, y + 2);
    y += 18;
  }
  if ((campaign.racks || []).length) {
    const val = campaign.racks.reduce((a, p) => a + p * 8, 0);
    y = buttonGrid([{ label: `Sell ${campaign.racks.length} antler rack${campaign.racks.length > 1 ? 's' : ''} to Earl ($${val})`, fn: () => { campaign.cash += val; campaign.racks = []; sfx.buy(); unlock('racks'); saveNext(); } }], y, 340, 34) + 2;
  }
  // Earl buys leftover freezer meat (cheap)
  if (campaign.freezer > 0) {
    y = buttonGrid([{ label: `Sell ${packsText(campaign.freezer)} of venison to Earl ($12 each)`, fn: () => { campaign.cash += campaign.freezer * 12; campaign.freezer = 0; sfx.buy(); saveNext(); toasts.push({ title: 'Earl', desc: 'Goin\' in the freezer marked BAIT. That freezer has range.', t: 3.5 }); } }], y, 340, 34) + 2;
  } else y += 8;
  const cols = VW >= 1100 ? 2 : 1;
  const bw = cols === 2 ? Math.min(520, (VW - 60) / 2) : Math.min(620, VW - 24);
  const rows = Math.ceil(SHOP.length / cols);
  const rowH = clamp((VH - y - 100) / rows - 4, 34, 50);
  const x0 = cx - (cols * bw + (cols - 1) * 12) / 2;
  SHOP.forEach((item, i) => {
    const count = item.consumable ? (campaign.items[item.id] || 0) : 0;
    const isWeapon = !!item.weapon;
    const ownedW = isWeapon && campaign.weapons[item.weapon];
    const equipped = isWeapon && campaign.weapon === item.weapon;
    const owned = isWeapon ? equipped : item.consumable ? count >= item.max : has(item.id);
    const afford = ownedW || campaign.cash >= priceOf(item);
    const selected = pad.connected && shopSel === i;
    const x = x0 + (i % cols) * (bw + 12), rowY = y + Math.floor(i / cols) * (rowH + 4);
    const my = mouse.y + drawScroll;   // menus scroll: compare in content coordinates
    const hover = selected || (mouse.x >= x && mouse.x <= x + bw && my >= rowY && my <= rowY + rowH);
    panel(x, rowY, bw, rowH);
    if ((hover && !owned && afford) || selected) { ctx.strokeStyle = afford && !owned ? '#ffd166' : '#888'; ctx.lineWidth = 2; roundRect(ctx, x, rowY, bw, rowH, 10); ctx.stroke(); }
    if (selected && pad.connected && shopScrolledFor !== shopSel) { shopScrolledFor = shopSel; if (rowY - menuScroll < 70) menuScroll = Math.max(0, rowY - 70); else if (rowY + rowH - menuScroll > VH - 70) menuScroll = rowY + rowH - VH + 70; }
    ctx.textAlign = 'left';
    ctx.fillStyle = owned ? '#9be564' : afford ? '#fff' : '#777';
    ctx.font = `bold ${rowH < 40 ? 13 : 14}px system-ui, sans-serif`;
    ctx.fillText(fitText(`${i + 1}. ${item.name}${item.consumable && count ? `  (have ${count})` : ''}${campaign.special === item.id ? '  🏷 25% OFF' : ''}`, bw - 100), x + 12, rowY + rowH / 2 - (rowH < 40 ? 2 : 3));
    ctx.font = `${rowH < 40 ? 11 : 12}px system-ui, sans-serif`; ctx.fillStyle = owned ? '#9be564' : '#aaa';
    ctx.fillText(fitText(item.desc, bw - 100), x + 12, rowY + rowH / 2 + (rowH < 40 ? 11 : 13));
    ctx.textAlign = 'right'; ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillStyle = owned ? '#9be564' : afford ? '#ffd166' : '#777';
    const tag = isWeapon ? (equipped ? 'EQUIPPED' : ownedW ? 'EQUIP' : `$${priceOf(item)}`) : owned ? (item.consumable ? 'MAXED' : 'OWNED') : `$${priceOf(item)}`;
    ctx.fillText(tag, x + bw - 12, rowY + rowH / 2 + 5);
    if (!owned && afford) uiButtons.push({ x, y: rowY - drawScroll, w: bw, h: rowH, fn: () => buy(item) });
  });
  y += rows * (rowH + 4) + 8;
  button(cx - 130, y, 260, 42, `Start Night ${night + 1}  ▶`, () => { night++; startNight(); }, true, true);
  y -= 6;
  ctx.fillStyle = '#888'; ctx.font = '12px system-ui, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(pad.connected ? 'D-pad ↑/↓ to choose · A to buy or equip · X sell to Earl · Start to continue' : touchMode ? 'Tap an item to buy' : 'Click an item to buy or equip · keys 1–9 for the first nine · Enter to continue', cx, y + 66);
}
