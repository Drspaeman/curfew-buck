'use strict';
// Hunter Sub: Raven's Crypt.
// Part 8 of 10. All parts share one global scope, so load them in order (see index.html).
//
// Raven Pfister (20) is Gary's daughter, home from art school, and the only goth in Whispering Pines.
// She's sure the "Orange Menace" is a local cryptid, and she's drawn a trading-card series about
// the whole neighborhood. She hides the cards in bushes and staples her band's gig posters to
// streetlight poles. Collect them all: they stay collected across seasons, like gossip notes.
// Raven never snitches. Bring her a pinecone and she'll point you at a hidden card.
// ============================================================
// [name, title, icon, frame color, flavor text, spookiness, HOA violations]
const CARDS = [
  ['Dale', 'The Orange Menace', '🧡', '#ff7a1a', 'Seen only at 4 AM. Smells like doe urine and regret. Lives in a shed. Thrives.', 7, 99],
  ['Linda Vance', 'The HOA Banshee', '⛳', '#ffd166', 'Her shriek carries three cul-de-sacs. Wrote Bylaw 14.3 in blood. (Red pen. Same energy.)', 9, 0],
  ['Gary Pfister', 'The Drone Wraith', '🛸', '#6fa8ff', 'Haunts the sky at forty feet. Battery life: eleven minutes. Fear him for eleven minutes. (My dad.)', 4, 0],
  ['Old Hosta', 'The Antlered One', '🦌', '#e8dcc0', 'Fourteen points. Zero fear. Has eaten more hostas than the HOA has fined.', 10, 312],
  ['Sketchy Steve', 'The Van Ghoul', '🚐', '#b5e86a', 'Dwells in a van by the logging road. Accepts cash, venison and souls (store credit only).', 6, 41],
  ['Todd', 'The Watch Goblin', '🔦', '#9be564', 'Patrols with a whistle and a flashlight. Has never caught anything. Not even a cold.', 2, 0],
  ['Mr. Henderson', 'The Sleepless Revenant', '💤', '#ffe7a0', 'Has not slept since 2009. Will doze off in the middle of threatening you.', 5, 3],
  ['Officer Kowalski', 'The Siren Knight', '🚔', '#9ecbff', 'Summoned by dialing 911. Banished by a box of donuts left on the curb.', 6, 0],
  ['Darlene', 'The Bathrobe Wraith', '🥀', '#ff9ad5', 'Drifts past windows in curlers. Keeps a sacred longbow "as leverage."', 8, 2],
  ['Tyler', 'The Teen Familiar', '📱', '#7cf', 'Speaks only in lowercase. Loyal to whoever has snacks. Secretly the smartest one here.', 3, 7],
  ['Earl', 'The Bait Lich', '🪱', '#e0b83a', 'Ancient. Sells nightcrawlers. His chili is a forbidden ritual. Do not ask what is in it.', 7, 12],
  ['The Koi', 'The $1,200 Fish', '🐟', '#ffb347', 'Golden. Glimmering. Bought with your HOA dues. Cursed, probably. Tasty, allegedly.', 8, 0],
];
// Raven's band. They've played one real show.
const POSTERS = [
  ['Live at the HOA Clubhouse', 'CANCELLED: noise complaint (Bylaw 14.1)'],
  ['Unplugged in a Storage Unit', 'Bring your own candles. The power is genuinely off.'],
  ['The "Lawn Gnomes Are Watching" Tour', 'One date. It is the garage.'],
  ['Album Release: Hostas Bloom in Darkness', 'CDs $5. Tears free.'],
  ['Battle of the Bands', 'We were the only band. We still lost.'],
  ['The Farewell Tour', 'We are not breaking up. It just sounds cool.'],
];
const RAVEN_LINES = [
  'Oh. The Orange Menace. You\'re shorter in person.',
  'Relax. I don\'t snitch. Snitching is for people with hope.',
  'Nice vest. Very visible. Bold choice for a man in hiding.',
  'My dad says this is "a phase." It\'s my eighth year in the phase.',
  'I drew you a trading card. Your spookiness is a 7. Don\'t let it go to your head.',
  'The deer aren\'t your enemy, Dale. Linda is.',
  'I\'m not out here at 4 AM for you. I\'m out here for the moon.',
  'If you see my posters, leave them up. Or take them. Merch is merch.',
  'Darlene\'s bathrobe is honestly kind of goth. I respect it.',
  'Every hosta in this neighborhood is a tiny green tombstone. Think about it.',
];
const RAVEN_COLOR = '#b48cff';
ACH.raven = ['Night Shift', 'Meet Raven, the only goth in Whispering Pines'];
ACH.binder = ['Full Binder', 'Collect all 12 of Raven\'s Cryptids of Whispering Pines cards'];
ACH.superfan = ['Superfan', 'Find all 6 Velvet Casket gig posters'];
ACH.offering = ['The Offering', 'Trade Raven a pinecone for a card hint'];
WHOS_WHO.push(['Raven Pfister', 'Gary\'s daughter, 20. Home from art school.', 'Draws trading cards of everyone. Fronts the band Velvet Casket. Does not snitch.', RAVEN_COLOR]);

const gothCards = () => store.get('hs_cards', []);
const gothPosters = () => store.get('hs_posters', []);
const gothBinderDone = () => gothCards().length >= CARDS.length;

// ---------------------------------------------------------------- each night
function setupGoth() {
  G.goth = { cards: [], posters: [], raven: null, hint: null, hintT: 0, traded: false, met: false, talkCD: 0, line: 0 };
  const R = G.goth;
  const gotC = gothCards(), gotP = gothPosters();
  // up to 2 cards, hidden in the middle of bushes (walk into the bush to find one)
  const leftC = CARDS.map((_, i) => i).filter(i => !gotC.includes(i));
  const bushes = (world.bushes || []).filter(b => !b.santa && dist(b.x, b.y, world.shed.x, world.shed.y) > 300);
  for (let k = 0; k < 200 && R.cards.length < Math.min(2, leftC.length) && bushes.length; k++) {
    const b = bushes[Math.floor(Math.random() * bushes.length)];
    if (R.cards.some(c => dist(c.x, c.y, b.x, b.y) < 700)) continue;
    R.cards.push({ x: b.x, y: b.y, idx: leftC[R.cards.length], got: false });
  }
  // one poster, stapled to a streetlight pole
  const leftP = POSTERS.map((_, i) => i).filter(i => !gotP.includes(i));
  const poles = world.lights || [];
  if (leftP.length && poles.length) {
    const p = poles[Math.floor(Math.random() * poles.length)];
    R.posters.push({ x: p.x + 8, y: p.y + 8, idx: leftP[0], got: false });
  }
  // Raven hangs out beside someone's house from Night 2 on (every night in the one-night modes)
  if (night >= 2 || oneNightMode()) {
    const houses = (world.houses || []).filter(h => h !== world.exHouse && !h.label);
    for (let k = 0; k < 60 && houses.length; k++) {
      const h = houses[Math.floor(Math.random() * houses.length)];
      const x = h.x + h.w + 22, y = h.y + h.h / 2;
      if (world.blocked(x, y, 16) || dist(x, y, world.shed.x, world.shed.y) < 400) continue;
      R.raven = { x, y };
      break;
    }
  }
}
function nearRaven() { const r = G && G.goth && G.goth.raven; return !!(r && player && dist(r.x, r.y, player.x, player.y) < 60); }
function ravenSay(text, t = 3.2) {
  const r = G.goth.raven;
  popups = popups.filter(p => !(typeof p.text === 'string' && p.text.startsWith('Raven:')));   // one speech bubble at a time
  popup(r.x, r.y - 34, 'Raven: "' + text + '"', RAVEN_COLOR, t); }
// E next to Raven: chat, or trade a pinecone for a card hint
function gothInteract() {
  if (!nearRaven()) return false;
  const R = G.goth;
  if (!R.met) { R.met = true; unlock('raven'); }
  const hidden = R.cards.find(c => !c.got);
  if (!R.traded && hidden && player.cones > 0) {
    player.cones--; R.traded = true; R.hint = hidden; R.hintT = 45; sfx.grab(); unlock('offering');
    ravenSay('A pinecone. For my altar. ...Fine. Follow the purple arrow. Tell no one.', 4);
  } else if (!R.traded && hidden) {
    ravenSay('Bring me a pinecone. For the altar. Don\'t ask what the altar is for.');
  } else if (R.traded && hidden) {
    ravenSay('One hint per night. I have a brand to maintain.');
  } else {
    ravenSay(RAVEN_LINES[R.line++ % RAVEN_LINES.length]);
  }
  return true;
}
function updateGoth(dt) {
  const R = G && G.goth;
  if (!R || !player) return;
  R.talkCD -= dt;
  if (R.hintT > 0) { R.hintT -= dt; if (R.hintT <= 0 || (R.hint && R.hint.got)) R.hint = null; }
  // Raven calls out when you first walk past
  if (R.raven && !R.met && R.talkCD <= 0 && dist(R.raven.x, R.raven.y, player.x, player.y) < 170) {
    R.talkCD = 9;
    ravenSay(pick(['Psst. Orange Menace. Over here. I\'m not a cop.', 'Is that... the cryptid? Hold still. I\'m sketching.', 'Don\'t mind me. Just being dark on a lawn.']));
    hint('raven', 'That\'s Raven, Gary\'s goth daughter. She never calls the cops. Press E to talk. Give her a pinecone and she\'ll show you where a trading card is hidden.');
  }
  for (const c of R.cards) {
    if (c.got || dist(c.x, c.y, player.x, player.y) > 26) continue;
    c.got = true;
    const got = gothCards(); if (!got.includes(c.idx)) got.push(c.idx); store.set('hs_cards', got);
    const [name, title] = CARDS[c.idx];
    popup(c.x, c.y - 30, `🃏 Trading card! ${name}, ${title} (${got.length}/${CARDS.length})`, RAVEN_COLOR, 4);
    sfx.grab(); particlesAt(c.x, c.y, RAVEN_COLOR);
    hint('cards', 'Raven\'s trading cards hide inside bushes. They stay collected across seasons. Open Raven\'s Crypt on the title screen to see your binder.');
    if (got.length >= CARDS.length) { unlock('binder'); banner('🦇 FULL BINDER! Raven painted your vest black. Turn it on in Settings.', RAVEN_COLOR); }
  }
  for (const p of R.posters) {
    if (p.got || dist(p.x, p.y, player.x, player.y) > 34) continue;
    p.got = true;
    const got = gothPosters(); if (!got.includes(p.idx)) got.push(p.idx); store.set('hs_posters', got);
    popup(p.x, p.y - 30, `🦇 VELVET CASKET: ${POSTERS[p.idx][0]} (${got.length}/${POSTERS.length})`, RAVEN_COLOR, 4);
    sfx.pickup();
    if (got.length >= POSTERS.length) unlock('superfan');
  }
}
function particlesAt(x, y, color) {
  for (let i = 0; i < 14; i++) particles.push({ x, y, vx: rnd(-90, 90), vy: rnd(-110, 30), t: rnd(0.4, 0.9), c: color });
}

// ---------------------------------------------------------------- drawing (world)
function drawGoth(now) {
  const R = G && G.goth;
  if (!R) return;
  for (const c of R.cards) {
    if (c.got || !inView(c.x, c.y, 30)) continue;
    // hidden in the bush: you only see it up close (or with the goggles), plus a rare purple glint
    const d = dist(c.x, c.y, player.x, player.y);
    const glint = Math.sin(now / 260 + c.x) > 0.93;
    if (d > 150 && !G.nvgOn && !glint) continue;
    if (d > 150) { ctx.fillStyle = RAVEN_COLOR; ctx.fillRect(c.x - 1, c.y - 9, 2, 6); ctx.fillRect(c.x - 4, c.y - 7, 8, 2); continue; }
    ctx.save(); ctx.translate(c.x, c.y + Math.sin(now / 300 + c.y) * 1.5); ctx.rotate(-0.25);
    ctx.fillStyle = '#1a1024'; ctx.fillRect(-7, -10, 14, 20);
    ctx.strokeStyle = RAVEN_COLOR; ctx.lineWidth = 1.5; ctx.strokeRect(-7, -10, 14, 20);
    ctx.fillStyle = RAVEN_COLOR; ctx.beginPath(); ctx.arc(0, -2, 3, 0, TAU); ctx.fill();
    ctx.restore();
  }
  for (const p of R.posters) {
    if (p.got || !inView(p.x, p.y, 30)) continue;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(0.08);
    ctx.fillStyle = '#120a18'; ctx.fillRect(-10, -14, 20, 26);
    ctx.fillStyle = RAVEN_COLOR; ctx.font = 'bold 6px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('VELVET', 0, -6); ctx.fillText('CASKET', 0, 1);
    ctx.fillStyle = '#e8e8e8'; ctx.fillText('🦇', 0, 9);
    ctx.restore();
  }
  if (R.raven && inView(R.raven.x, R.raven.y, 60)) drawRaven(R.raven.x, R.raven.y, now);
}
function drawRaven(x, y, now) {
  // a candle and a soft purple glow
  const g = ctx.createRadialGradient(x, y, 2, x, y, 46);
  g.addColorStop(0, 'rgba(180,140,255,0.28)'); g.addColorStop(1, 'rgba(180,140,255,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 46, 0, TAU); ctx.fill();
  ctx.fillStyle = '#eee'; ctx.fillRect(x + 14, y + 2, 3, 7);
  ctx.fillStyle = Math.sin(now / 90) > 0 ? '#ffd166' : '#ffb347'; ctx.beginPath(); ctx.ellipse(x + 15.5, y, 1.8, 3, 0, 0, TAU); ctx.fill();
  // Raven, sitting cross-legged: black dress, pale face, long black hair, purple lips
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(x + 2, y + 6, 12, 7, 0, 0, TAU); ctx.fill();
  inkBlob(x, y + 2, 11, 9, '#1b1320', 3);
  ctx.fillStyle = '#0c0810'; ctx.beginPath(); ctx.arc(x, y - 6, 8.5, Math.PI * 0.95, Math.PI * 2.05); ctx.fill();   // hair
  ctx.fillStyle = '#f1e9f5'; ctx.beginPath(); ctx.arc(x, y - 5, 5.5, 0, TAU); ctx.fill();                          // face
  ctx.fillStyle = '#0c0810'; ctx.fillRect(x - 8, y - 6, 3, 12); ctx.fillRect(x + 5, y - 6, 3, 12);                  // hair down the sides
  ctx.fillStyle = '#7d3cff'; ctx.fillRect(x - 1.5, y - 2.5, 3, 1.2);                                                 // lips
  ctx.fillStyle = '#111'; ctx.fillRect(x - 3, y - 6.5, 1.6, 1.6); ctx.fillRect(x + 1.4, y - 6.5, 1.6, 1.6);          // eyeliner
  ctx.fillStyle = RAVEN_COLOR; ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('RAVEN', x, y - 20);
}
function drawGothPointer() {
  const R = G && G.goth;
  if (R && R.hint && !R.hint.got) drawTruckPointer({ x: R.hint.x, y: R.hint.y, w: 0, h: 0 }, 'CARD', RAVEN_COLOR);
}

// ---------------------------------------------------------------- Raven's Crypt (title screen)
function drawCardFace(x, y, w, h, i, owned) {
  const [name, title, icon, color, flavor, spook, hoa] = CARDS[i];
  ctx.fillStyle = owned ? '#1a1024' : 'rgba(255,255,255,0.05)'; roundRect(ctx, x, y, w, h, 10); ctx.fill();
  ctx.strokeStyle = owned ? color : 'rgba(255,255,255,0.15)'; ctx.lineWidth = owned ? 2.5 : 1; ctx.stroke();
  ctx.textAlign = 'center';
  if (!owned) {
    ctx.fillStyle = 'rgba(180,140,255,0.35)'; ctx.font = `bold ${Math.round(h * 0.28)}px system-ui, sans-serif`; ctx.fillText('?', x + w / 2, y + h * 0.5);
    ctx.fillStyle = '#777'; ctx.font = '11px system-ui, sans-serif'; ctx.fillText(`#${i + 1} · hidden in a bush`, x + w / 2, y + h - 14);
    return;
  }
  ctx.fillStyle = color; ctx.font = '10px system-ui, sans-serif'; { const long = `CRYPTIDS OF WHISPERING PINES #${i + 1}`; ctx.fillText(ctx.measureText(long).width <= w - 12 ? long : `CRYPTID #${i + 1}`, x + w / 2, y + 16); }
  ctx.font = `${Math.round(h * 0.2)}px system-ui, sans-serif`; ctx.fillText(icon, x + w / 2, y + 18 + h * 0.2);
  ctx.fillStyle = '#fff'; fitFont(name, 'bold', 15, w - 14); ctx.fillText(name, x + w / 2, y + h * 0.5);
  ctx.fillStyle = color; ctx.font = 'italic 12px system-ui, sans-serif'; ctx.fillText(fitText(title, w - 14), x + w / 2, y + h * 0.5 + 16);
  ctx.fillStyle = '#bbb'; ctx.font = '11px system-ui, sans-serif';
  wrapText(flavor, x + w / 2, y + h * 0.5 + 34, w - 16, 13);
  ctx.fillStyle = '#9aa'; ctx.font = 'bold 10px system-ui, sans-serif';
  ctx.fillText(fitText(`SPOOKY ${spook}/10 · HOA FINES ${hoa}`, w - 10), x + w / 2, y + h - 10);
}
function drawCrypt() {
  const cx = VW / 2, cards = gothCards(), posters = gothPosters();
  ctx.textAlign = 'center'; ctx.fillStyle = RAVEN_COLOR; fitFont('🦇 RAVEN\'S CRYPT', '900', 36, VW - 24); ctx.fillText('🦇 RAVEN\'S CRYPT', cx, 56);
  ctx.fillStyle = '#ccc'; ctx.font = '14px system-ui, sans-serif';
  let y = wrapText('Raven drew a trading card of everyone in the neighborhood and hid them in bushes. Her band\'s gig posters are stapled to streetlight poles. Give her a pinecone for a hint.', cx, 84, Math.min(640, VW - 30), 19) + 26;
  ctx.fillStyle = '#ffd166'; ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText(`CARDS ${cards.length} / ${CARDS.length}    ·    POSTERS ${posters.length} / ${POSTERS.length}`, cx, y); y += 18;
  // the binder
  const cols = clamp(Math.floor((VW - 20) / 170), 2, 6), gap = 10;
  const w = Math.min(160, (VW - 20 - gap * (cols - 1)) / cols), h = Math.round(w * 1.42);
  const x0 = cx - (cols * w + (cols - 1) * gap) / 2;
  CARDS.forEach((_, i) => drawCardFace(x0 + (i % cols) * (w + gap), y + Math.floor(i / cols) * (h + gap), w, h, i, cards.includes(i)));
  y += Math.ceil(CARDS.length / cols) * (h + gap) + 22;
  // the posters
  ctx.fillStyle = RAVEN_COLOR; ctx.font = 'bold 15px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('VELVET CASKET: GIG POSTERS', cx, y); y += 14;
  const pc = clamp(Math.floor((VW - 20) / 210), 1, 3), pw = Math.min(200, (VW - 20 - gap * (pc - 1)) / pc), ph = 92;
  const px0 = cx - (pc * pw + (pc - 1) * gap) / 2;
  POSTERS.forEach(([show, note], i) => {
    const x = px0 + (i % pc) * (pw + gap), py = y + Math.floor(i / pc) * (ph + gap), own = posters.includes(i);
    ctx.fillStyle = own ? '#120a18' : 'rgba(255,255,255,0.05)'; roundRect(ctx, x, py, pw, ph, 6); ctx.fill();
    ctx.strokeStyle = own ? RAVEN_COLOR : 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.textAlign = 'center';
    if (!own) { ctx.fillStyle = '#777'; ctx.font = '12px system-ui, sans-serif'; ctx.fillText('🦇 ? (on a streetlight pole)', x + pw / 2, py + ph / 2 + 4); return; }
    ctx.fillStyle = RAVEN_COLOR; ctx.font = '900 14px system-ui, sans-serif'; ctx.fillText('VELVET CASKET 🦇', x + pw / 2, py + 20);
    ctx.fillStyle = '#eee'; ctx.font = 'bold 12px system-ui, sans-serif'; const yy = wrapText(show, x + pw / 2, py + 40, pw - 14, 15);
    ctx.fillStyle = '#aaa'; ctx.font = 'italic 11px system-ui, sans-serif'; wrapText(note, x + pw / 2, yy + 16, pw - 14, 13);
  });
  y += Math.ceil(POSTERS.length / pc) * (ph + gap) + 12;
  if (gothBinderDone()) { ctx.fillStyle = RAVEN_COLOR; ctx.font = 'bold 13px system-ui, sans-serif'; ctx.fillText('Full binder! Raven painted your vest black. Turn it on in Settings.', cx, y + 4); y += 22; }
  buttonGrid([{ label: '◀ Back', fn: () => { state = 'title'; }, hi: true }], y + 6, 160, 38);
}
