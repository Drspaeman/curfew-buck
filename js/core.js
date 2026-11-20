'use strict';
// Hunter Sub: Canvas, utilities, audio synth, names, dialogue and data tables.
// Part 1 of 10. All parts share one global scope, so load them in order (see index.html).
/*
 * HUNTER SUB
 * Sneak through Whispering Pines Estates before sunrise, bag deer with your bow,
 * drag them back to your shed (behind your ex-wife's house) — and don't let anyone call the cops.
 */

// ============================================================
// Canvas setup
// ============================================================
const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
const lightCv = document.createElement('canvas');
const lctx = lightCv.getContext('2d');
let VW = 0, VH = 0, DPR = 1;
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  // Use the canvas's real on-screen size (it can be smaller than the window inside an app frame)
  VW = cv.clientWidth || window.innerWidth; VH = cv.clientHeight || window.innerHeight;
  cv.width = Math.round(VW * DPR); cv.height = Math.round(VH * DPR);
  lightCv.width = cv.width; lightCv.height = cv.height;
}
window.addEventListener('resize', resize);
resize();
// Phones keep audio locked until the first touch: unlock it on any tap or click.
function unlockAudio() {
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
  } catch (e) { /* audio unavailable */ }
}
window.addEventListener('pointerdown', () => unlockAudio());
window.addEventListener('touchstart', () => unlockAudio(), { passive: true });
window.addEventListener('keydown', () => unlockAudio());

// ============================================================
// Utilities
// ============================================================
const TAU = Math.PI * 2;
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
function angDiff(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}
function turnTo(o, target, maxStep) {
  const d = angDiff(o.ang, target);
  o.ang += clamp(d, -maxStep, maxStep);
}
// Segment (x1,y1)->(x2,y2) vs axis-aligned rect: entry t in [0,1] or -1.
function segRect(x1, y1, x2, y2, r) {
  let t0 = 0, t1 = 1;
  const dx = x2 - x1, dy = y2 - y1;
  const p = [-dx, dx, -dy, dy];
  const q = [x1 - r.x, r.x + r.w - x1, y1 - r.y, r.y + r.h - y1];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) { if (q[i] < 0) return -1; }
    else {
      const t = q[i] / p[i];
      if (p[i] < 0) { if (t > t1) return -1; if (t > t0) t0 = t; }
      else { if (t < t0) return -1; if (t < t1) t1 = t; }
    }
  }
  return t0;
}
// Segment vs circle: entry t in [0,1] or -1 (0 if starting inside).
function segCircle(x1, y1, x2, y2, cx, cy, r) {
  const dx = x2 - x1, dy = y2 - y1;
  const fx = x1 - cx, fy = y1 - cy;
  const a = dx * dx + dy * dy;
  const c = fx * fx + fy * fy - r * r;
  if (c < 0) return 0;
  if (a === 0) return -1;
  const b = 2 * (fx * dx + fy * dy);
  let disc = b * b - 4 * a * c;
  if (disc < 0) return -1;
  disc = Math.sqrt(disc);
  const t = (-b - disc) / (2 * a);
  return (t >= 0 && t <= 1) ? t : -1;
}
function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
// previewMode (the trailer and #demo links) plays the game without touching saves, scores or stats.
let previewMode = location.hash.startsWith('#demo');
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { if (previewMode) return; try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
  del(k) { if (previewMode) return; try { localStorage.removeItem(k); } catch (e) { /* storage unavailable */ } },
  del(k) { if (previewMode) return; try { localStorage.removeItem(k); } catch (e) { /* storage unavailable */ } },
};

// ============================================================
// Audio (tiny synth, no files)
// ============================================================
let AC = null;
let muted = store.get('hs_muted', false);
let toneChannel = 'sfx';
let masterBus = null;
const liveTones = new Set();   // scheduled gameplay sounds, so pause/quit can stop them
function audioBus() {
  if (masterBus) return masterBus;
  const comp = AC.createDynamicsCompressor();
  comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 6; comp.attack.value = 0.003; comp.release.value = 0.2;
  comp.connect(AC.destination);
  return (masterBus = comp);
}
function stopGameplaySounds() { for (const o of liveTones) { try { o.stop(); } catch (e) { /* already stopped */ } } liveTones.clear(); }
function tone(freq, dur, type = 'sine', vol = 0.15, slideTo = null, delay = 0) {
  if (muted) return;
  if (toneChannel === 'music' && !settings.music) return;
  vol *= toneChannel === 'music' ? (settings.musicVol ?? 1) : (settings.sfxVol ?? 1);
  if (vol <= 0.00011) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const t0 = AC.currentTime + delay;
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(audioBus());
    o.start(t0); o.stop(t0 + dur + 0.02);
    if (typeof state !== 'undefined' && state === 'play') { liveTones.add(o); o.onended = () => liveTones.delete(o); }
  } catch (e) { /* audio unavailable */ }
}
const sfx = {
  shoot() { tone(520, 0.12, 'triangle', 0.12, 140); },
  hit() { tone(110, 0.2, 'sawtooth', 0.12, 60); },
  thunk() { tone(180, 0.06, 'square', 0.06, 90); },
  alert() { const t = performance.now(); if (t - (sfx.alertAt || 0) < 150) return; sfx.alertAt = t; tone(880, 0.08, 'square', 0.08); tone(1175, 0.1, 'square', 0.08, null, 0.09); },
  huh() { tone(500, 0.12, 'sine', 0.07, 700); },
  deliver() { tone(523, 0.1, 'triangle', 0.12); tone(659, 0.1, 'triangle', 0.12, null, 0.1); tone(784, 0.16, 'triangle', 0.12, null, 0.2); },
  pickup() { tone(300, 0.08, 'triangle', 0.08, 420); },
  bark() { tone(260, 0.07, 'sawtooth', 0.07, 180); tone(260, 0.07, 'sawtooth', 0.07, 180, 0.12); },
  siren(vol) { tone(720, 0.22, 'sine', vol, 960); },
  lose() { tone(392, 0.25, 'triangle', 0.12, 196); tone(262, 0.4, 'triangle', 0.12, 130, 0.25); },
  win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'triangle', 0.12, null, i * 0.12)); },
  chirp() { for (let i = 0; i < 3; i++) tone(4300, 0.03, 'sine', 0.012, null, i * 0.07); },
  toss() { tone(700, 0.08, 'sine', 0.05, 400); },
  cone() { tone(220, 0.05, 'square', 0.05, 120); tone(160, 0.05, 'square', 0.04, 90, 0.07); },
  flood() { tone(90, 0.15, 'square', 0.06); tone(1400, 0.04, 'square', 0.03, null, 0.02); },
  achieve() { [784, 988, 1319].forEach((f, i) => tone(f, 0.12, 'triangle', 0.1, null, i * 0.08)); },
  grab() { tone(900, 0.05, 'triangle', 0.06); },
  buy() { tone(1200, 0.05, 'square', 0.05); tone(1600, 0.08, 'square', 0.05, null, 0.06); },
  radio() { tone(1800, 0.04, 'square', 0.025); tone(1500, 0.04, 'square', 0.025, null, 0.05); },
  snort() { tone(160, 0.12, 'sawtooth', 0.05, 90); },
  grunt() { tone(110, 0.25, 'sawtooth', 0.08, 80); tone(95, 0.2, 'sawtooth', 0.06, 70, 0.3); },
  meow() { tone(700, 0.25, 'sine', 0.05, 500); },
  buzz() { for (let i = 0; i < 3; i++) tone(140, 0.12, 'square', 0.03, null, i * 0.2); },
  ring() { [1319, 1047, 1319, 1047, 1568].forEach((f, i) => tone(f, 0.12, 'square', 0.06, null, i * 0.14)); },
  clang() { tone(320, 0.15, 'square', 0.07, 180); tone(520, 0.1, 'square', 0.05, 240, 0.05); },
  paper() { tone(1100, 0.04, 'triangle', 0.05); },
};

// ============================================================
// Lore & dialogue
// ============================================================
const NAMES = {
  player: 'Dale',
  ex: 'Darlene',
  hoa: 'Linda Vance',
  treasurer: 'Gary Pfister',
  watch: 'Todd',
  cop: 'Officer Kowalski',
};
const QUIPS = {
  ex: [
    'Oh, you have GOT to be kidding me.',
    'Dale? Is that MY good flashlight?',
    'This is exactly why I left you.',
    'You missed child support but not deer season?',
    'I can see your vest, Dale. It\'s ORANGE.',
    'I\'m telling your mother.',
  ],
  hoa: [
    'Bylaw 14.3! No hunting on common grounds!',
    'Is that a BOW? That\'s a violation!',
    'I am writing this DOWN, sir.',
    'Your lawn was 3 inches last week AND this?',
    'Excuse me! Are you a resident?!',
  ],
  treasurer: [
    'That\'s a $250 fine. Per arrow.',
    'Do you have a permit for that?',
    'I\'m adding this to the newsletter.',
    'Hey! Hey you! Stop right there!',
  ],
  watch: [
    'Neighborhood Watch! Freeze!',
    'Suspicious guy in camo, over.',
    'I KNEW I heard something.',
    'Todd here. I see you, buddy.',
  ],
  cop: [
    'Freeze! Put the bow down!',
    'Sir! Step away from the deer!',
    'Dispatch, I\'ve got eyes on him!',
  ],
  jogger: ['Uh... morning?', 'Is that... a BOW?', 'I\'m putting this on the neighborhood app.', 'Not breaking my stride for this.'],
  paper: ['WHOA! Mister?!', 'I\'m telling my mom!', 'Is that legal?!'],
  window: ['Martha! MARTHA! There\'s a man in the yard!', 'I knew I couldn\'t sleep for a reason.', 'I\'m calling Linda.'],
  drone: ['📻 Gary: "I GOT HIM ON CAMERA! ...Is this thing recording?"', '📻 Gary: "Drone has visual! Repeat, visual!"', '📻 Gary: "Smile, Dale!"'],
  k9: ['ARF!'],
  investigate: ['Hello? Who\'s there?', 'Was that a twang?', 'Hmm...', 'Somebody out here?', 'Raccoons again?'],
  arrow: ['THAT ALMOST HIT ME!', 'WAS THAT AN ARROW?!', 'Are you INSANE?!'],
  callEx: 'That\'s it. I\'m calling the cops on you, Dale.',
  callHoa: 'I\'m calling the police AND filing a complaint!',
  kill: ['Got one!', 'Venison!', 'Freezer-bound!', 'Clean shot.'],
  buck: ['A BUCK! Look at that rack!', 'Trophy buck!'],
  deliver: ['Into the freezer', 'Stacked in the shed', 'Venison secured'],
};
QUIPS.ex.push('Are you wearing the vest I bought you? The ORANGE one?', 'Dale, the neighbors can SEE you.', 'I swear to God, Dale.');
QUIPS.hoa.push('Section 14, paragraph 3, Dale!', 'Bows are NOT an approved lawn accessory!', 'This will be in the minutes.');
QUIPS.treasurer.push('Fine schedule says... a lot.', 'Smile, you\'re on the newsletter.', 'Is that venison? Is that TAXABLE?');
QUIPS.watch.push('Code orange! CODE ORANGE!', 'Stop or I\'ll... write you up!', 'Finally, some action.');
QUIPS.jogger.push('On your left! Wait, are you hunting?', 'This is not on my fitness app.');
QUIPS.cop.push('Dale, I can see the vest.', 'Hands where I can see \'em, buddy.');
QUIPS.cam = ['*ding dong* Motion detected.', '📷 *click* Clip saved to the cloud.', 'Ring! Someone is at your front door.'];
QUIPS.chad = ['Bro. BRO. Are you hunting?', 'Babe! Your ex is in the yard again!', 'Can\'t hear you over the blower, dude!', 'Is that a crossbow? Sick. Also: no.'];
const NIGHT_INTROS = [
  'Opening night. Darlene got the house and the dog. Her lawyer got the hunting lease. You got a bow and a grudge. The deer of Whispering Pines have gotten fat on hostas. Fill the freezer before sunrise.',
  'Word got around. Linda put up "NO HUNTING" signs and recruited Todd from Neighborhood Watch. Stay low.',
  'The HOA called an emergency meeting about "the Orange Menace." There are more of them out tonight.',
  'Darlene\'s new boyfriend installed motion lights. Gary bought night-vision binoculars with HOA dues.',
  'Last night of the season. The whole subdivision is on alert. One more haul and the freezer\'s full for the year.',
];
const ENDLESS_INTROS = [
  'Endless season. Linda has declared a "permanent state of emergency." Nobody in Whispering Pines sleeps anymore.',
  'The HOA hired a consultant. His name is also Gary. There are two Garys now.',
  'Rumor says Old Hosta has a son. Rumor also says the HOA has a budget for night-vision goggles now.',
  'Darlene says she\'s "honestly impressed." She still called the cops on you twice this week.',
];
const WEATHER = ['clear', 'clear', 'rain', 'fog', 'snow'];
const weatherFor = n => n <= 5 ? WEATHER[n - 1] : ['clear', 'rain', 'fog', 'snow'][n % 4];
const introFor = n => n <= 5 ? NIGHT_INTROS[n - 1] : ENDLESS_INTROS[n % ENDLESS_INTROS.length];
const WEATHER_TEXT = {
  clear: 'Clear skies. Crickets out.',
  rain: 'Rain tonight: it muffles noise and shortens flashlights.',
  fog: 'Thick fog: everyone sees less, including the deer.',
  snow: 'First snow of the year: it muffles sound, but you leave FOOTPRINTS, and people will follow them.',
};
const RADIO = ['📻 "Orange vest spotted, over!"', '📻 "Eyes up, people. He\'s back."', '📻 "Linda, you copy? We got a hunter."', '📻 "Check your yards!"'];
const VOICEMAILS = {
  saw: [
    'Dale. I SAW you. In my hydrangeas. Call me back. Actually, don\'t.',
    'The whole POINT of that orange vest is to be seen, right, Dale?',
    'Officer Kowalski says hi. He says stop it. I also say stop it.',
  ],
  clean: [
    'Hey, it\'s Darlene. Weird thing — the deer are gone from my yard? Anyway. You still have my crockpot.',
    'Did you hear about the hostas? Linda thinks it\'s raccoons. I think it\'s you. I can\'t prove it.',
    'Mom says hi. She also asked if you\'re "still doing the deer thing." I said no. Don\'t make me a liar.',
  ],
};
const SHOP = [
  { id: 'ghillie', name: 'Ghillie Suit', price: 150, desc: 'Lose the orange vest. Watchers have to get 20% closer to spot you.' },
  { id: 'boots', name: 'Quiet Boots', price: 100, desc: 'Dogs and deer notice you from much closer.' },
  { id: 'sled', name: 'Drag Sled', price: 120, desc: 'Drag deer at 80% speed instead of 60%.' },
  { id: 'truckbed', name: 'Truck Bed Extender', price: 250, desc: 'Deer past your quota ride in the truck (up to 2) and count toward tomorrow.' },
  { id: 'recurve', weapon: 'recurve', name: 'Whisper Recurve (weapon)', price: 220, desc: 'Half as loud as your compound. Slower draw.' },
  { id: 'carbon', weapon: 'carbon', name: 'Carbon Compound (weapon)', price: 200, desc: 'Faster arrows, quicker draw, shorter reload.' },
  { id: 'crossbow', weapon: 'crossbow', name: 'Crossbow (weapon)', price: 380, desc: 'Near-instant full draw, deadly, long reload.' },
  { id: 'broadheads', name: 'Razor Broadheads', price: 120, desc: 'Weaker draws still kill clean (fewer wounded deer).' },
  { id: 'beer', name: 'Lukewarm Beer', price: 12, desc: 'Press V to drink: faster, quicker draw, wobbly aim, loud burps.', consumable: true, max: 6 },
  { id: 'quiver', name: 'Big Quiver', price: 80, desc: '+6 arrows each night.' },
  { id: 'pouch', name: 'Pinecone Pouch', price: 60, desc: '+3 pinecones each night.' },
  { id: 'scent', name: 'Scent Blocker Spray', price: 90, desc: 'Deer downwind can barely smell you.' },
  { id: 'trailcam', name: 'Trail Cam Network', price: 110, desc: 'Live deer show up on your minimap.' },
  { id: 'tarp', name: 'Camo Tarp', price: 70, desc: 'Wrap your deer: dragging doesn\'t draw eyes, and you can hide while dragging.' },
  { id: 'corn', name: 'Corn Feeder Bags', price: 50, desc: '2 corn piles per night (B to drop). Deer flock to them.' },
  { id: 'nvg', name: 'Night-Vision Goggles', price: 180, desc: 'Press N to see in the dark. 90 seconds of battery per night.' },
  { id: 'jerky', name: 'Beef Jerky', price: 8, desc: 'Press J near a dog: it stays quiet the rest of the night.', consumable: true, max: 5 },
  { id: 'burrito', name: 'Breakfast Burrito', price: 40, desc: 'One-time bribe: saves you from one arrest. Officer Kowalski can\'t resist.', consumable: true, max: 3 },
];
const NOTICES = [
  'Violation #2291: Excessive garden gnomes.',
  'Violation #2364: Welcome mat deployed without a guest list.',
  'Violation #2304: Mailbox is "too whimsical."',
  'Violation #2310: Christmas lights still up (it\'s October).',
  'Violation #2318: Grass 1/4 inch over regulation.',
  'Violation #2322: Unapproved shade of beige.',
  'Violation #2330: Trash can visible from the street for 11 minutes.',
  'Violation #2341: Kayak stored "aggressively."',
  'Violation #2357: Doorbell chime too cheerful.',
];
const MOM_LINES = ['DALE? Are you HUNTING? I can hear crickets!', 'Dale honey, did you eat? You sound skinny.', 'Darlene called me. Call me back, mister.'];
const DIFFICULTY = {
  easy: { label: 'Easy', sus: 0.6, quota: -1, time: 1.2 },
  normal: { label: 'Normal', sus: 1, quota: 0, time: 1 },
  hard: { label: 'Hard', sus: 1.4, quota: 1, time: 0.9 },
};
const settings = Object.assign({ difficulty: 'normal', shake: true, music: true, sfxVol: 1, musicVol: 1, cbCones: false, flashes: true, hints: true, bigText: false }, store.get('hs_settings', {}));
// Larger-text option: every font set on the main canvas is scaled up 20%.
(function bigTextHook() {
  try {
    const desc = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'font');
    if (!desc || !desc.set) return;
    Object.defineProperty(ctx, 'font', {
      configurable: true,
      get() { return desc.get.call(ctx); },
      set(v) { desc.set.call(ctx, settings.bigText ? String(v).replace(/(\d+(?:\.\d+)?)px/, (m, n) => Math.round(n * 1.2) + 'px') : v); },
    });
  } catch (e) { /* older browsers: option just does nothing */ }
})();
function saveSettings() { store.set('hs_settings', settings); }
const diff = () => DIFFICULTY[settings.difficulty] || DIFFICULTY.normal;
const VOL_STEPS = [1, 0.6, 0.3, 0];
const cycleVol = v => VOL_STEPS[(VOL_STEPS.indexOf(VOL_STEPS.reduce((a, b) => Math.abs(b - v) < Math.abs(a - v) ? b : a)) + 1) % VOL_STEPS.length];
const pct = v => v > 0 ? Math.round(v * 100) + '%' : 'Off';
const VERSION = '1.6.0';
const TIPS = [
  'Pinecones never raise suspicion. Throw one to pull a watcher off your path.',
  'Bucks are worth more points the more antler points they have. Look for the big racks.',
  'Parked cars and hedges block flashlights completely. Hug them.',
  'Steve\'s price changes nightly. ▲ means it went up since last night.',
  'Sneaking makes your snow tracks fade twice as fast. Plowed roads leave none.',
  'Crows on a lawn are an alarm system. Go around.',
  'Lightning lights up the whole street for a split second. Stay in cover during storms.',
  'Sprinklers soak you, and wet boots squelch loudly for a while.',
  'Press Tab (or tap MAP) for the full map with labels.',
  'Darlene barely cares if you\'re near your own shed empty-handed. Carrying a deer is another story.',
  'The ring around Dale has a white tick: release past it for a clean kill.',
  'Late in the night, tired watchers yawn. Their flashlights droop for a moment.',
];
const CREDITS = [
  ['HUNTER SUB', 'A game about deer, divorce, and HOA bylaws.'],
  ['Engine', 'Plain JavaScript + HTML5 canvas. No libraries.'],
  ['Sound', 'Every beep, bark, burp and banjo-ish bassline is synthesized live.'],
  ['Built with', 'Claude Code.'],
  ['Special thanks', 'Earl, for asking no questions.'],
  ['Disclaimer', 'No HOA presidents were harmed. Gary\'s pride took a hit.'],
];
const ACH = {
  ghost: ['Ghost of Whispering Pines', 'Finish a night without being spotted'],
  exproof: ['Darlene-Proof', 'Meet quota without Darlene seeing you'],
  trophy: ['Trophy Room', 'Deliver a buck'],
  legend: ['Legend Slayer', 'Bag Old Hosta'],
  getaway: ['Getaway Driver', 'Escape with the cops on scene'],
  robin: ['Robin Hood', '100% accuracy in a night (3+ arrows)'],
  decoy: ['Raccoons Again?', 'Lure a watcher with a pinecone'],
  season: ['Freezer Full', 'Complete the whole season'],
  paperwork: ['Paperwork', 'Collect all 3 HOA violation notices in one night'],
  callme: ['Not Now, Ma', 'Decline Mom\'s call in time'],
  burrito: ['Breakfast of Champions', 'Bribe your way out of an arrest'],
  tracker: ['Blood Trail', 'Track down a wounded deer'],
  dealer: ['Pleasure Doin\' Crimes', 'Sell venison to Sketchy Steve'],
  beer: ['Liquid Courage', 'Drink a beer on the job'],
  squirrel: ['Tree Rat', 'Bag a squirrel'],
  turkey: ['Gobble Gobble', 'Bag a wild turkey'],
  fisher: ['Gone Fishin\'', 'Catch anything at all'],
  skunked: ['Eau de Skunk', 'Get sprayed by a skunk'],
  longbow: ['Heirloom', 'Take back Grandpa\'s Longbow'],
  story: ['Side Hustle', 'Complete a story objective'],
  cabin: ['Pruitt Woods', 'Raise the $1,500 cabin deposit by the end of the season'],
  rabbit: ['Wascally', 'Bag a rabbit'],
  soaked: ['Lawn Care', 'Get soaked by a sprinkler'],
  snowghost: ['Snow Ghost', 'Win Night 5 without anyone following your footprints'],
  nightowl: ['Night Owl', 'Survive to Endless Night 8 (win Night 7)'],
  allstars: ['Perfect Season', 'Earn 3 stars on all five nights'],
  fullcooler: ['Full Cooler', 'Sell 10 packs to Steve in one trip'],
  bigspender: ['Big Spender', 'Spend $500 at Earl\'s in one season'],
  thrifty: ['Thrifty', 'Finish the season without buying anything'],
  collector: ['Neighborhood Gossip', 'Collect every gossip note'],
  oldboot: ['Catch and Re-Lace', 'Reel in an old boot'],
  haggler: ['Art of the Deal', 'Win a haggle with Steve'],
  streak: ['Ghost Streak', 'Deliver 4 deer in a row without being spotted'],
  golfer: ['Members Only', 'Finish a night at the Country Club'],
  daily: ['Daily Grind', 'Finish a Daily Hunt'],
  iceskater: ['Ice Capades', 'Slip on the ice'],
  racks: ['Antler Collector', 'Sell an antler rack to Earl'],
  albino: ['Ghost Deer', 'Bag a rare albino deer'],
  oncamera: ['Caught on Camera', 'Get filmed by a doorbell cam'],
  lawyer: ['Objection!', 'Get your case dismissed in court'],
  carvings: ['Dale Was Here', 'Find every carving in the woods'],
  goodboy: ['Good Boy', 'Quiet a dog with jerky'],
  nightvision: ['Owl Eyes', 'Use night-vision goggles'],
  footchase: ['Foot Chase', 'Reach your shed with an officer chasing you on foot'],
  leafblower: ['Leaf Peeper', 'Bag a deer while Chad\'s blower covers your noise'],
};
