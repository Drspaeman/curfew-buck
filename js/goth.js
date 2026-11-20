'use strict';
// Hunter Sub: Raven's Crypt.
// Part 8 of 10. All parts share one global scope, so load them in order (see index.html).
//
// Raven Pfister (26) is Gary's daughter. She moved back in with him after art school, and she's the only goth in Whispering Pines.
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
  'My dad says this is "a phase." It\'s my twelfth year in the phase.',
  'I moved back in with my dad "temporarily." Three years ago. Don\'t.',
  'I drew you a trading card. Your spookiness is a 7. Don\'t let it go to your head.',
  'The deer aren\'t your enemy, Dale. Linda is.',
  'I\'m not out here at 4 AM for you. I\'m out here for the moon.',
  'If you see my posters, leave them up. Or take them. Merch is merch.',
  'Darlene\'s bathrobe is honestly kind of goth. I respect it.',
  'Every hosta in this neighborhood is a tiny green tombstone. Think about it.',
];
// Raven's post about tonight, shown on the results screen if you met her
function ravenPost() {
  if (G.goth && G.goth.concert) return pick(['VELVET CASKET LIVE: 3 attendees, 1 cryptid. best show of our career.', 'played a garage show. the orange menace was in the crowd. he did not clap. iconic.']);
  if (G.police) return pick(['saw the cops chase the cryptid tonight. he is faster than he looks. sketching it now.', 'sirens at 5 AM. the neighborhood is finally interesting.']);
  if (G.delivered >= G.quota) return pick(['the cryptid dragged ' + G.delivered + ' deer past my dad\'s house. 10/10 aesthetic.', 'spotted: the orange menace, thriving.']);
  return pick(['quiet night. the cryptid looked sad. gave it a pinecone. (it gave me the pinecone.)', 'my dad\'s drone hit a tree again. no further questions.']);
}
const RAVEN_COLOR = '#b48cff';
SHOP.push({ id: 'vccd', name: 'Velvet Casket CD', price: 5, desc: '"Hostas Bloom in Darkness." Swaps the banjo for a gloomy minor key. Signed by Raven.' });
// the same walking bass, in A minor, for anyone who owns the CD
const GOTH_BASS = [55, 55, 65.41, 49, 55, 51.91, 61.74, 49];
const GOTH_PLUCK = [220, 246.94, 261.63, 311.13, 329.63, 415.3];
ACH.raven = ['Night Shift', 'Meet Raven, the only goth in Whispering Pines'];
ACH.binder = ['Full Binder', 'Collect all 12 of Raven\'s Cryptids of Whispering Pines cards'];
ACH.superfan = ['Superfan', 'Find all 6 Velvet Casket gig posters'];
ACH.offering = ['The Offering', 'Trade Raven a pinecone for a card hint'];
WHOS_WHO.push(['Raven Pfister', 'Gary\'s daughter, 26. Moved back home after art school.', 'Draws trading cards of everyone. Fronts the band Velvet Casket. Does not snitch.', RAVEN_COLOR]);

// ---------------------------------------------------------------- Raven around the neighborhood
// (flavor added to systems that already exist: tips, HOA notices, gossip, voicemails, Tyler's texts)
TIPS.push(
  "Raven never calls the cops. Bring her a pinecone and she'll point you to a hidden trading card.",
  "Raven's trading cards hide INSIDE bushes. You only see them up close, or with the night-vision goggles.",
  "Velvet Casket's garage shows drown out your noise. Hunt near the band.",
  "Edgar the crow caws if you walk up to him. Sneak past.");
NOTICES.push(
  'Violation #2350: Unpermitted garage concert ("Velvet Casket"). Volume: "ghostly."',
  'Violation #2351: Black candles on a porch after 10 PM. Fire code AND vibes.',
  'Violation #2352: Crow perched on HOA property without a permit.');
GOSSIP.push(
  'Raven Pfister has drawn a trading card of every person in Whispering Pines. Linda\'s has horns.',
  'Gary tells everyone Raven is "at art school." She has lived in his basement for three years.');
VOICEMAILS.saw.push('Gary\'s goth daughter says she saw "a cryptid" in my yard. Dale. That was you. In the vest.');
VOICEMAILS.clean.push('Gary\'s daughter gave me a trading card of myself. "The Bathrobe Wraith." ...It\'s actually a good drawing.');
if (typeof tylerLine === 'function') {
  const baseTyler = tylerLine;
  window.tylerLine = function () {
    if (G && G.goth && G.goth.met && Math.random() < 0.35) return pick(['raven made me a card. "the teen familiar." i have never been more honored', 'did u meet raven?? she says ur "spiritually a crow"', 'velvet casket is actually kind of good. dont tell anyone']);
    return baseTyler();
  };
}
WHOS_WHO.push(['Edgar', 'Raven\'s crow.', 'Perches by Raven. Caws at anyone who walks up without sneaking. Judges you silently otherwise.', '#c9c3d1']);
ACH.gothdad = ['Goth Dad', 'Finish a night in Raven\'s black vest'];

const gothCards = () => store.get('hs_cards', []);
const gothPosters = () => store.get('hs_posters', []);
const SECRET_CARD = 12;   // Raven's self-portrait: not in the bushes, she hands it over herself
const gothBinderDone = () => { const c = gothCards(); return CARDS.every((_, i) => c.includes(i)); };
const gothHasSecret = () => gothCards().includes(SECRET_CARD);
ACH.selfportrait = ['Don\'t Make It Weird', 'Get Raven\'s secret 13th card from Raven herself'];
ACH.ossuary = ['Suburban Ossuary', 'Sell an antler rack to Raven for her art'];
ACH.halloween = ['Nice Costume', 'Meet quota on Halloween night'];
ACH.edgar = ['Nevermore', 'Startle Edgar, Raven\'s crow, into a caw'];
ACH.openingact = ['Opening Act', 'Bag a deer while Velvet Casket\'s garage show covers your noise'];
const CONCERT_R = 420;   // how far the band drowns you out
const HALLOWEEN_LINES = ['Happy Halloween. My favorite day. The one day I look normal.', 'Kids keep asking what I\'m dressed as. I\'m dressed as me.', 'This is the Velvet Casket Halloween Spooktacular. Admission: one pinecone.'];
const CONCERT_LINES = [
  'This next one is called "Hostas Bloom in Darkness." It\'s about you, Dale.',
  'We\'re Velvet Casket. We\'ve played one real show. This is the second.',
  'If my dad complains, tell him it\'s a "neighborhood art event." He loves those.',
  'Thank you, Whispering Pines! (The lawn gnomes are our biggest fans.)',
];

// ---------------------------------------------------------------- each night
// ---------------------------------------------------------------- Halloween night
function startHalloween() {
  restoreRandom();
  campaign = freshCampaign(); campaign.halloween = true;
  campaign.seen = Object.fromEntries(Object.keys(SCENES).map(k => [k, true]));
  night = 3;
  startNight();
}
const HALLOWEEN_INTRO = 'Halloween. The whole subdivision is out in costumes, so nobody blinks at a man in a blaze-orange vest dragging a deer. Trick-or-treaters scare the deer, though. And Velvet Casket is playing.';
const KID_LINES = ['Nice costume, mister!', 'Are you a hunter or a traffic cone?', 'TRICK OR TREAT!', 'Is that deer FAKE?? Cool!', 'My mom says you\'re the Orange Menace.'];
function setupHalloween() {
  G.halloween = true;
  // a jack-o'-lantern on most porches
  G.pumpkins = [];
  for (const h of world.houses) if (!h.label && Math.random() < 0.7) G.pumpkins.push({ x: h.x + (h.w || HW) * 0.3, y: h.top ? h.y - 10 : h.y + (h.h || HH) + 10, face: Math.floor(Math.random() * 3) });
  // trick-or-treaters walk the sidewalks (low suspicion, but they spook deer)
  const ys = (world.hy || []).slice(0, 2);
  ys.forEach((y, i) => {
    const sy = y + (i ? ROAD + 26 : -26);
    const kid = makeWatcher('watch', [{ x: M + 120, y: sy }, { x: W - M - 120, y: sy }], { speed: 55, fov: 1.2, range: 150, pause: 3, rate: 8, label: i ? 'Trick-or-treaters' : 'Trick-or-treaters (sugar rush)' });
    kid.kids = true;
    watchers.push(kid);
  });
  fixWalkerRoutes();
  banner('🎃 HALLOWEEN: everyone thinks the vest is a costume (suspicion rises slower). Trick-or-treaters scare the deer.', '#ff9f1a');
}
function updateHalloween(dt) {
  if (!G || !G.halloween) return;
  for (const w of watchers) {
    if (!w.kids) continue;
    w.kidCD = (w.kidCD || 0) - dt;
    // deer bolt from the noisy kids
    for (const d of deer) if (!d.dead && d.state !== 'flee' && dist(d.x, d.y, w.x, w.y) < 170) { d.state = 'flee'; d.t = 2.5; d.ang = Math.atan2(d.y - w.y, d.x - w.x); }
    if (w.seeing && w.kidCD <= 0) { w.kidCD = 6; popup(w.x, w.y - 30, pick(KID_LINES), '#ffb347', 2); }
  }
}
// The trick-or-treaters: a little ghost, a witch and a pumpkin-head, trailing their group's spot
function drawKidCostumes(now) {
  if (!G || !G.halloween) return;
  for (const w of watchers) {
    if (!w.kids || !inView(w.x, w.y, 60)) continue;
    const bob = k => Math.sin(now / 160 + k * 2) * 1.5;
    const back = w.ang + Math.PI, off = (k, side) => ({ x: w.x + Math.cos(back) * (10 + k * 12) + Math.cos(back + Math.PI / 2) * side, y: w.y + Math.sin(back) * (10 + k * 12) + Math.sin(back + Math.PI / 2) * side + bob(k) });
    // ghost
    let p = off(0, -10);
    ctx.fillStyle = '#f2f2f2'; ctx.beginPath(); ctx.arc(p.x, p.y - 2, 6, Math.PI, 0); ctx.lineTo(p.x + 6, p.y + 6); ctx.lineTo(p.x + 2, p.y + 4); ctx.lineTo(p.x - 2, p.y + 6); ctx.lineTo(p.x - 6, p.y + 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#111'; ctx.fillRect(p.x - 3, p.y - 3, 1.6, 2); ctx.fillRect(p.x + 1.4, p.y - 3, 1.6, 2);
    // witch
    p = off(1, 9);
    ctx.fillStyle = '#5b2a8a'; ctx.beginPath(); ctx.arc(p.x, p.y, 5.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.moveTo(p.x - 7, p.y - 3); ctx.lineTo(p.x + 7, p.y - 3); ctx.lineTo(p.x, p.y - 13); ctx.closePath(); ctx.fill();
    // pumpkin-head
    p = off(2, -4);
    ctx.fillStyle = '#e8741a'; ctx.beginPath(); ctx.ellipse(p.x, p.y, 6, 5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffd166'; ctx.fillRect(p.x - 3, p.y - 1, 1.6, 1.6); ctx.fillRect(p.x + 1.4, p.y - 1, 1.6, 1.6);
    // candy buckets
    ctx.fillStyle = '#e8741a'; ctx.fillRect(w.x + 6, w.y + 4, 4, 4);
  }
}
function drawPumpkins(now) {
  if (!G || !G.pumpkins) return;
  for (const p of G.pumpkins) {
    if (!inView(p.x, p.y, 30)) continue;
    ctx.fillStyle = '#e8741a'; ctx.beginPath(); ctx.ellipse(p.x, p.y, 9, 7.5, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#a24d12'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p.x, p.y - 7); ctx.lineTo(p.x, p.y + 7); ctx.stroke();
    ctx.fillStyle = '#3b5a1c'; ctx.fillRect(p.x - 1, p.y - 10, 2, 4);
    const lit = settings.flashes ? 0.75 + 0.25 * Math.sin(now / 120 + p.x) : 0.9;
    ctx.fillStyle = `rgba(255,214,102,${lit})`;
    ctx.beginPath(); ctx.moveTo(p.x - 5, p.y - 2); ctx.lineTo(p.x - 2, p.y - 4); ctx.lineTo(p.x - 2, p.y - 1); ctx.fill();
    ctx.beginPath(); ctx.moveTo(p.x + 5, p.y - 2); ctx.lineTo(p.x + 2, p.y - 4); ctx.lineTo(p.x + 2, p.y - 1); ctx.fill();
    ctx.fillRect(p.x - 4, p.y + 2, 8, 2);
  }
}

function setupGoth() {
  const rand = mulberry32((realRandom() * 2147483647) | 0);
  G.goth = { cards: [], posters: [], raven: null, hint: null, hintT: 0, traded: false, met: false, talkCD: 0, line: 0 };
  const R = G.goth;
  const gotC = gothCards(), gotP = gothPosters();
  // up to 2 cards, hidden in the middle of bushes (walk into the bush to find one)
  const leftC = CARDS.map((_, i) => i).filter(i => !gotC.includes(i));
  const bushes = (world.bushes || []).filter(b => !b.santa && dist(b.x, b.y, world.shed.x, world.shed.y) > 300);
  for (let k = 0; k < 200 && R.cards.length < Math.min(2, leftC.length) && bushes.length; k++) {
    const b = bushes[Math.floor(rand() * bushes.length)];
    if (R.cards.some(c => dist(c.x, c.y, b.x, b.y) < 700)) continue;
    R.cards.push({ x: b.x, y: b.y, idx: leftC[R.cards.length], got: false });
  }
  // one poster, stapled to a streetlight pole
  const leftP = POSTERS.map((_, i) => i).filter(i => !gotP.includes(i));
  const poles = world.lights || [];
  if (leftP.length && poles.length) {
    const p = poles[Math.floor(rand() * poles.length)];
    R.posters.push({ x: p.x + 8, y: p.y + 8, idx: leftP[0], got: false });
  }
  // Raven hangs out beside someone's house from Night 2 on (every night in the one-night modes)
  if (night >= 2 || oneNightMode()) {
    const houses = (world.houses || []).filter(h => h !== world.exHouse && !h.label);
    for (let k = 0; k < 60 && houses.length; k++) {
      const h = houses[Math.floor(rand() * houses.length)];
      const x = h.x + h.w + 22, y = h.y + h.h / 2;
      if (world.blocked(x, y, 16) || dist(x, y, world.shed.x, world.shed.y) < 400) continue;
      R.raven = { x, y };
      for (const [dx, dy] of [[-46, -10], [46, -14], [0, -48], [-40, 30]]) if (!world.blocked(x + dx, y + dy, 8)) { R.edgar = { x: x + dx, y: y + dy, flown: false, t: 0 }; break; }
      if (campaign.halloween || (night >= 3 && rand() < (gothPosters().length >= 3 ? 0.5 : 0.25))) {
        // the stage goes on open ground next to her
        let sx = x, sy = y + 60;
        for (const [dx, dy] of [[0, 60], [0, -60], [60, 0], [-60, 0], [50, 50], [-50, 50]]) if (!world.blocked(x + dx, y + dy, 30)) { sx = x + dx; sy = y + dy; break; }
        R.concert = { x: sx, y: sy, t: 0, chordT: 0, beat: 0 };
        banner('🎸 CONCERT NIGHT: Velvet Casket is playing a garage show. The noise covers yours near the band.', RAVEN_COLOR);
      }
      break;
    }
  }
}
function nearRaven() { const r = G && G.goth && G.goth.raven; return !!(r && player && dist(r.x, r.y, player.x, player.y) < 60); }
function ravenSay(text, t = 3.6) {
  G.goth.say = { text, t: Math.max(t, 1.5 + text.length * 0.045) };
  tone(220, 0.5, 'triangle', 0.035); tone(261.6, 0.5, 'triangle', 0.03, null, 0.04); tone(329.6, 0.6, 'triangle', 0.025, null, 0.08);   // A minor
}
// The garage show drowns out Dale's noise nearby
function gothNoiseMult() { const c = G && G.goth && G.goth.concert; return c && player && dist(c.x, c.y, player.x, player.y) < CONCERT_R ? 0.35 : 1; }
// E next to Raven: chat, or trade a pinecone for a card hint
function gothInteract() {
  if (!nearRaven()) return false;
  const R = G.goth;
  if (!R.met) { R.met = true; unlock('raven'); campaign.flags.raven = true; }
  if (gothBinderDone() && !gothHasSecret()) {
    const got = gothCards(); got.push(SECRET_CARD); store.set('hs_cards', got); unlock('selfportrait');
    ravenSay('You found all twelve? ...Okay. Here. It\'s me. I drew it in a mirror at 3 AM. Don\'t make it weird.', 6);
    particlesAt(R.raven.x, R.raven.y, RAVEN_COLOR); sfx.grab();
    banner('🃏 SECRET CARD #13: Raven Pfister, The Artist. Check your binder in Raven\'s Crypt.', RAVEN_COLOR);
    return true;
  }
  // Raven buys one antler rack a night for her art (a little more than Earl pays)
  if ((campaign.racks || []).length && !R.boughtRack && !oneNightMode()) {
    const pts = campaign.racks.shift(), cash = pts * 10;
    R.boughtRack = true; G.earned += cash; sfx.buy();
    popup(player.x, player.y - 40, `+$${cash}: Raven bought the ${pts}-point rack`, RAVEN_COLOR, 2.4);
    ravenSay(pick([`Antlers! For my installation piece, "Suburban Ossuary." Here's $${cash}.`, `${pts} points? It's perfect. It's going on my headboard. $${cash}, final offer.`, `Don't tell Earl. He'd only give you $${pts * 8}.`]), 4.5);
    unlock('ossuary');
    return true;
  }
  const hidden = R.cards.find(c => !c.got);
  if (!R.traded && hidden && player.cones > 0) {
    player.cones--; R.traded = true; R.hint = hidden; R.hintT = 45; sfx.grab(); unlock('offering');
    ravenSay('A pinecone. For my altar. ...Fine. Follow the purple arrow. Tell no one.', 4);
  } else if (!R.traded && hidden) {
    ravenSay('Bring me a pinecone. For the altar. Don\'t ask what the altar is for.');
  } else if (R.traded && hidden) {
    ravenSay('One hint per night. I have a brand to maintain.');
  } else if (G.halloween) {
    ravenSay(HALLOWEEN_LINES[R.line++ % HALLOWEEN_LINES.length]);
  } else if (R.concert) {
    ravenSay(CONCERT_LINES[R.line++ % CONCERT_LINES.length]);
  } else {
    ravenSay(RAVEN_LINES[R.line++ % RAVEN_LINES.length]);
  }
  return true;
}
function updateGoth(dt) {
  updateHalloween(dt);
  const R = G && G.goth;
  if (!R || !player) return;
  R.talkCD -= dt;
  if (R.say) { R.say.t -= dt; if (R.say.t <= 0) R.say = null; }
  const C = R.concert;
  if (C) {
    C.t += dt; C.chordT -= dt;
    const d = dist(C.x, C.y, player.x, player.y);
    if (C.chordT <= 0 && d < 900) {
      C.chordT = 0.5; C.beat++;
      const ch = toneChannel; toneChannel = 'music';
      const v = 0.05 * clamp(1 - d / 900, 0, 1);
      const root = [110, 110, 87.3, 98][Math.floor(C.beat / 4) % 4];   // Am, Am, F, G
      tone(55, 0.12, 'sine', v * 1.6, 40);                              // kick
      if (C.beat % 2 === 0) { tone(root, 0.45, 'sawtooth', v * 0.6); tone(root * 1.5, 0.45, 'sawtooth', v * 0.4); }
      toneChannel = ch;
    }
  }
  if (R.hintT > 0) { R.hintT -= dt; if (R.hintT <= 0 || (R.hint && R.hint.got)) R.hint = null; }
  // Raven reacts to what you're up to as you pass (after you've met)
  if (R.raven && R.met && R.talkCD <= 0 && !R.say && dist(R.raven.x, R.raven.y, player.x, player.y) < 150) {
    const l = G.police ? pick(['For the record, I didn\'t call them. I would never.', 'Sirens. How romantic. Run.'])
      : player.carry ? pick(['Is that... for an altar? Respect.', 'You\'re dragging a whole deer past my dad\'s house. Iconic.'])
      : player.cooler ? 'Is that a cooler of venison or a portable crypt? Both. It\'s both.'
      : G.buzz > 0 ? 'Are you... drunk? At 4 AM? On a lawn? That\'s my whole aesthetic.'
      : G.soaked > 0 ? 'Your boots squeak in B-flat. Can you do it twice before the chorus?' : null;
    if (l) { ravenSay(l); R.talkCD = 14; }
  }
  // Edgar, Raven's crow, sits on the fence. Get too close without sneaking and he caws (everyone hears it)
  if (R.edgar && !R.edgar.flown) {
    const e = R.edgar, d = dist(e.x, e.y, player.x, player.y);
    if (d < (player.crouch ? 34 : 80)) {
      e.flown = true; e.t = 0;
      makeNoise(e.x, e.y, 230 * noiseMult(), 'crows');
      popup(e.x, e.y - 24, 'Edgar: "CAW." (Nevermore.)', '#ddd', 2.2);
      tone(700, 0.18, 'sawtooth', 0.05, 380); tone(640, 0.16, 'sawtooth', 0.04, 360, 0.2);
      unlock('edgar');
      if (R.met) ravenSay('Edgar! Manners. ...Sorry. He\'s judging you.');
    }
  } else if (R.edgar) { R.edgar.t += dt; if (R.edgar.t > 20) R.edgar.flown = false; }   // he comes back after a while
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
    if (R.hint === c) { const k = 0.5 + 0.5 * Math.sin(now / 180); ctx.strokeStyle = `rgba(180,140,255,${0.5 + 0.5 * k})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(c.x, c.y, 22 + 8 * k, 0, TAU); ctx.stroke(); ctx.fillStyle = RAVEN_COLOR; ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('CARD', c.x, c.y - 34); }
    const glint = settings.flashes && Math.sin(now / 260 + c.x) > 0.93;
    if (d > 150 && !G.nvgOn && !glint && R.hint !== c) continue;
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
  drawPumpkins(now);
  if (R.concert && inView(R.concert.x, R.concert.y, CONCERT_R)) drawConcert(R.concert, now);
  if (R.raven && inView(R.raven.x, R.raven.y, 60)) drawRaven(R.raven.x, R.raven.y, now);
  if (R.edgar && inView(R.edgar.x, R.edgar.y, 120)) drawEdgar(R.edgar, now);
}
function drawConcert(c, now) {
  const pulse = settings.flashes ? 0.5 + 0.5 * Math.sin(now / 120) : 0.5;
  // the noise zone, faintly
  ctx.strokeStyle = `rgba(180,140,255,${0.12 + 0.1 * pulse})`; ctx.lineWidth = 2; ctx.setLineDash([10, 12]);
  ctx.beginPath(); ctx.arc(c.x, c.y, CONCERT_R, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  // stage light
  const g = ctx.createRadialGradient(c.x, c.y, 4, c.x, c.y, 90);
  g.addColorStop(0, `rgba(150,80,255,${0.25 + 0.2 * pulse})`); g.addColorStop(1, 'rgba(150,80,255,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c.x, c.y, 90, 0, TAU); ctx.fill();
  // drum kit and an amp
  ctx.fillStyle = '#2a2a33'; ctx.fillRect(c.x + 14, c.y - 18, 18, 14);                     // amp
  ctx.fillStyle = '#444'; ctx.beginPath(); ctx.arc(c.x + 23, c.y - 11, 4, 0, TAU); ctx.fill();
  ctx.fillStyle = '#7d3cff'; ctx.beginPath(); ctx.arc(c.x - 22, c.y - 6, 9, 0, TAU); ctx.fill();   // kick drum
  ctx.fillStyle = '#c9c3d1'; ctx.beginPath(); ctx.arc(c.x - 34, c.y - 14, 5, 0, TAU); ctx.fill(); // cymbal
  // floating notes
  for (let i = 0; i < 4; i++) {
    const t = (now / 1400 + i / 4) % 1;
    ctx.globalAlpha = 1 - t; ctx.fillStyle = RAVEN_COLOR; ctx.font = 'bold 14px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(i % 2 ? '♪' : '♫', c.x - 20 + i * 14 + Math.sin(now / 300 + i) * 6, c.y - 24 - t * 50);
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = RAVEN_COLOR; ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('VELVET CASKET (LIVE)', c.x, c.y + 26);
}
function drawEdgar(e, now) {
  // flown: he circles overhead; otherwise he perches and bobs
  const x = e.flown ? e.x + Math.cos(now / 400) * 60 : e.x, y = e.flown ? e.y - 30 + Math.sin(now / 400) * 30 : e.y + Math.sin(now / 500) * 0.8;
  const flap = e.flown ? Math.sin(now / 60) * 5 : 0;
  ctx.fillStyle = '#05040a';
  ctx.beginPath(); ctx.ellipse(x, y, 6, 4, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - 2, y); ctx.lineTo(x - 10, y - 3 - flap); ctx.lineTo(x - 4, y + 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x + 2, y); ctx.lineTo(x + 10, y - 3 - flap); ctx.lineTo(x + 4, y + 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 5, y - 3, 3, 0, TAU); ctx.fill();
  ctx.fillStyle = '#ffd166'; ctx.fillRect(x + 6, y - 4, 1.4, 1.4);
  ctx.fillStyle = '#e0b83a'; ctx.beginPath(); ctx.moveTo(x + 8, y - 3); ctx.lineTo(x + 12, y - 2); ctx.lineTo(x + 8, y - 1); ctx.fill();
}
function drawRaven(x, y, now) {
  // a candle and a soft purple glow
  const g = ctx.createRadialGradient(x, y, 2, x, y, 46);
  g.addColorStop(0, 'rgba(180,140,255,0.28)'); g.addColorStop(1, 'rgba(180,140,255,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 46, 0, TAU); ctx.fill();
  ctx.fillStyle = '#eee'; ctx.fillRect(x + 14, y + 2, 3, 7);
  ctx.fillStyle = settings.flashes && Math.sin(now / 90) > 0 ? '#ffd166' : '#ffb347'; ctx.beginPath(); ctx.ellipse(x + 15.5, y, 1.8, 3, 0, 0, TAU); ctx.fill();
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
// Raven's bust: long black hair with blunt bangs, winged liner, purple lips, a moon choker,
// her band shirt, and Edgar (a crow) on her shoulder. Drawn at any size.
function drawRavenPortrait(x, y, s, now = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s / 100, s / 100);
  ctx.fillStyle = '#0c0810';                                   // hair, back layer
  ctx.beginPath(); ctx.ellipse(0, -6, 34, 44, 0, Math.PI, 0); ctx.lineTo(36, 46); ctx.lineTo(-36, 46); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#1b1320';                                   // shoulders: VELVET CASKET tee
  ctx.beginPath(); ctx.moveTo(-46, 50); ctx.quadraticCurveTo(0, 24, 46, 50); ctx.lineTo(46, 54); ctx.lineTo(-46, 54); ctx.closePath(); ctx.fill();
  ctx.fillRect(-46, 46, 92, 8);
  ctx.fillStyle = RAVEN_COLOR; ctx.font = 'bold 7px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('VELVET CASKET', 0, 50);
  ctx.fillStyle = '#efe6f3'; ctx.fillRect(-7, 18, 14, 14);      // neck
  ctx.fillStyle = '#111'; ctx.fillRect(-8, 24, 16, 3);         // choker
  ctx.fillStyle = '#d9d0ff'; ctx.beginPath(); ctx.arc(0, 29, 2.6, 0.6, Math.PI * 1.6); ctx.fill();   // little moon
  ctx.fillStyle = '#f1e9f5'; ctx.beginPath(); ctx.ellipse(0, -2, 22, 26, 0, 0, Math.PI * 2); ctx.fill();   // face
  ctx.fillStyle = '#0c0810';                                   // blunt bangs + side curtains
  ctx.beginPath(); ctx.moveTo(-25, -6); ctx.quadraticCurveTo(-24, -34, 0, -33); ctx.quadraticCurveTo(24, -34, 25, -6); ctx.lineTo(25, -10); ctx.lineTo(-25, -10); ctx.closePath(); ctx.fill();
  ctx.fillRect(-27, -10, 7, 52); ctx.fillRect(20, -10, 7, 52);
  const blink = Math.sin(now / 900) > 0.97;
  ctx.fillStyle = '#111';                                      // winged eyeliner
  for (const sx of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(sx * 4, -1); ctx.lineTo(sx * 15, blink ? -1 : -4); ctx.lineTo(sx * 19, -6); ctx.lineTo(sx * 14, 1); ctx.closePath(); ctx.fill();
    if (!blink) { ctx.fillStyle = '#7d5cc4'; ctx.beginPath(); ctx.arc(sx * 10, -1, 2.2, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#111'; }
  }
  ctx.fillStyle = '#5b2a8a'; ctx.beginPath(); ctx.ellipse(0, 13, 5.5, 2.4, 0, 0, Math.PI * 2); ctx.fill();   // purple lips
  ctx.fillStyle = '#8b6bd6'; ctx.beginPath(); ctx.ellipse(-1.5, 12.2, 2, 0.8, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#c9c3d1'; ctx.beginPath(); ctx.arc(-23, 6, 1.6, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(23, 6, 1.6, 0, Math.PI * 2); ctx.fill();   // earrings
  // Edgar the crow on her shoulder
  ctx.fillStyle = '#05040a';
  ctx.beginPath(); ctx.ellipse(34, 34, 11, 7, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(42, 25, 5.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(46, 24); ctx.lineTo(53, 26); ctx.lineTo(46, 28); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#ffd166'; ctx.fillRect(43, 23, 1.6, 1.6);
  ctx.restore();
}
// HUD speech box: portrait + name + what she said
function drawRavenSpeech(now) {
  const say = G && G.goth && G.goth.say;
  if (!say) return;
  ctx.save();
  ctx.globalAlpha = clamp(say.t * 3, 0, 1);
  // top center under the suspicion bar (below the HUD panel on narrow screens), clear of hints at the bottom
  const w = Math.min(460, VW - 24), h = 86, x = (VW - w) / 2, y = VW < 760 ? VH - h - 210 : 72;   // phones: above the hint box, below the achievement pop-ups
  ctx.fillStyle = 'rgba(12,8,18,0.92)'; roundRect(ctx, x, y, w, h, 10); ctx.fill();
  ctx.strokeStyle = RAVEN_COLOR; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.save(); roundRect(ctx, x + 6, y + 6, 74, 74, 8); ctx.clip();
  ctx.fillStyle = '#2a1a3a'; ctx.fillRect(x + 6, y + 6, 74, 74);
  drawRavenPortrait(x + 43, y + 44, 72, now); ctx.restore();
  ctx.textAlign = 'left'; ctx.fillStyle = RAVEN_COLOR; ctx.font = 'bold 13px system-ui, sans-serif'; ctx.fillText('RAVEN', x + 90, y + 22);
  ctx.fillStyle = '#eee'; ctx.font = '14px system-ui, sans-serif'; wrapText(say.text, x + 90, y + 42, w - 100, 18);
  ctx.restore();
}
function drawGothPointer() {
  const R = G && G.goth;
  if (R && R.hint && !R.hint.got) drawTruckPointer({ x: R.hint.x, y: R.hint.y, w: 0, h: 0 }, `CARD · ${Math.ceil(R.hintT)}s`, RAVEN_COLOR);
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
function drawSecretCard(x, y, w, h) {
  const own = gothHasSecret();
  ctx.fillStyle = own ? '#1a1024' : 'rgba(255,255,255,0.04)'; roundRect(ctx, x, y, w, h, 10); ctx.fill();
  ctx.setLineDash(own ? [] : [5, 4]); ctx.strokeStyle = own ? '#e6d2ff' : 'rgba(180,140,255,0.4)'; ctx.lineWidth = own ? 3 : 1.5; ctx.stroke(); ctx.setLineDash([]);
  ctx.textAlign = 'center';
  if (!own) {
    ctx.fillStyle = 'rgba(180,140,255,0.5)'; ctx.font = `bold ${Math.round(h * 0.22)}px system-ui, sans-serif`; ctx.fillText('#13', x + w / 2, y + h * 0.45);
    ctx.fillStyle = '#888'; ctx.font = '11px system-ui, sans-serif'; wrapText('Secret card. Fill the binder, then go see Raven.', x + w / 2, y + h * 0.62, w - 16, 14);
    return;
  }
  ctx.fillStyle = '#e6d2ff'; ctx.font = '10px system-ui, sans-serif'; ctx.fillText('SECRET CARD #13', x + w / 2, y + 16);
  ctx.save(); roundRect(ctx, x + 10, y + 24, w - 20, h * 0.36, 6); ctx.clip(); ctx.fillStyle = '#2a1a3a'; ctx.fillRect(x + 10, y + 24, w - 20, h * 0.36);
  drawRavenPortrait(x + w / 2, y + 24 + h * 0.2, h * 0.34, performance.now()); ctx.restore();
  ctx.fillStyle = '#fff'; fitFont('Raven Pfister', 'bold', 15, w - 14); ctx.fillText('Raven Pfister', x + w / 2, y + h * 0.5 + 22);
  ctx.fillStyle = RAVEN_COLOR; ctx.font = 'italic 12px system-ui, sans-serif'; ctx.fillText(fitText('The Artist', w - 14), x + w / 2, y + h * 0.5 + 38);
  ctx.fillStyle = '#bbb'; ctx.font = '11px system-ui, sans-serif'; wrapText('Drew this in a mirror at 3 AM. Edgar the crow insisted on being in it.', x + w / 2, y + h * 0.5 + 54, w - 16, 13);
  ctx.fillStyle = '#9aa'; ctx.font = 'bold 10px system-ui, sans-serif'; ctx.fillText(fitText('SPOOKY 11/10 · HOA FINES ∞', w - 10), x + w / 2, y + h - 10);
}
function drawCrypt() {
  const cx = VW / 2, cards = gothCards(), posters = gothPosters();
  ctx.textAlign = 'center'; ctx.fillStyle = RAVEN_COLOR; fitFont('🦇 RAVEN\'S CRYPT', '900', 36, VW - 24); ctx.fillText('🦇 RAVEN\'S CRYPT', cx, 56);
  { const g = ctx.createRadialGradient(cx, 128, 8, cx, 128, 64); g.addColorStop(0, 'rgba(180,140,255,0.45)'); g.addColorStop(1, 'rgba(180,140,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, 128, 64, 0, TAU); ctx.fill(); }
  drawRavenPortrait(cx, 132, 96, performance.now());
  ctx.textAlign = 'center'; ctx.fillStyle = '#ccc'; ctx.font = '14px system-ui, sans-serif';
  let y = wrapText('Raven drew a trading card of everyone in the neighborhood and hid them in bushes. Her band\'s gig posters are stapled to streetlight poles. Give her a pinecone for a hint.', cx, 206, Math.min(640, VW - 30), 19) + 26;
  ctx.fillStyle = '#ffd166'; ctx.font = 'bold 15px system-ui, sans-serif';
  const nCards = CARDS.filter((_, i) => cards.includes(i)).length;
  ctx.fillText(`CARDS ${nCards} / ${CARDS.length}${gothHasSecret() ? ' + #13' : ''}    ·    POSTERS ${posters.length} / ${POSTERS.length}`, cx, y); y += 18;
  // the binder
  const cols = clamp(Math.floor((VW - 20) / 170), 2, 6), gap = 10;
  const w = Math.min(160, (VW - 20 - gap * (cols - 1)) / cols), h = Math.round(w * 1.42);
  const x0 = cx - (cols * w + (cols - 1) * gap) / 2;
  CARDS.forEach((_, i) => drawCardFace(x0 + (i % cols) * (w + gap), y + Math.floor(i / cols) * (h + gap), w, h, i, cards.includes(i)));
  y += Math.ceil(CARDS.length / cols) * (h + gap) + 14;
  drawSecretCard(cx - w / 2, y, w, h); y += h + 22;
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
