'use strict';
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
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
};

// ============================================================
// Audio (tiny synth, no files)
// ============================================================
let AC = null;
let muted = store.get('hs_muted', false);
let toneChannel = 'sfx';
function tone(freq, dur, type = 'sine', vol = 0.15, slideTo = null, delay = 0) {
  if (muted) return;
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
    o.connect(g).connect(AC.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  } catch (e) { /* audio unavailable */ }
}
const sfx = {
  shoot() { tone(520, 0.12, 'triangle', 0.12, 140); },
  hit() { tone(110, 0.2, 'sawtooth', 0.12, 60); },
  thunk() { tone(180, 0.06, 'square', 0.06, 90); },
  alert() { tone(880, 0.08, 'square', 0.08); tone(1175, 0.1, 'square', 0.08, null, 0.09); },
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
  'Opening night. Darlene got the house, the dog, and the hunting lease. You got a bow and a grudge. The deer of Whispering Pines have gotten fat on hostas. Fill the freezer before sunrise.',
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
    'You know the orange vest is the whole POINT of being seen, right Dale?',
    'Officer Kowalski says hi. He says stop it. I also say stop it.',
  ],
  clean: [
    'Hey, it\'s Darlene. Weird thing — the deer are gone from my yard? Anyway. You still have my crockpot.',
    'Did you hear about the hostas? Linda thinks it\'s raccoons. I think it\'s you. I can\'t prove it.',
    'Mom says hi. She also asked if you\'re "still doing the deer thing." I said no. Don\'t make me a liar.',
  ],
};
const SHOP = [
  { id: 'ghillie', name: 'Ghillie Suit', price: 150, desc: 'Lose the orange vest. Everyone spots you 20% later.' },
  { id: 'boots', name: 'Quiet Boots', price: 100, desc: 'Dogs and deer notice you from much closer.' },
  { id: 'sled', name: 'Drag Sled', price: 120, desc: 'Drag deer at 80% speed instead of 60%.' },
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
const settings = Object.assign({ difficulty: 'normal', shake: true, music: true, sfxVol: 1, musicVol: 1, cbCones: false, flashes: true, hints: true }, store.get('hs_settings', {}));
function saveSettings() { store.set('hs_settings', settings); }
const diff = () => DIFFICULTY[settings.difficulty] || DIFFICULTY.normal;
const VOL_STEPS = [1, 0.6, 0.3, 0];
const cycleVol = v => VOL_STEPS[(VOL_STEPS.indexOf(VOL_STEPS.reduce((a, b) => Math.abs(b - v) < Math.abs(a - v) ? b : a)) + 1) % VOL_STEPS.length];
const pct = v => v > 0 ? Math.round(v * 100) + '%' : 'Off';
const VERSION = '0.9.0';
const TIPS = [
  'Pinecones never raise suspicion. Throw one to pull a watcher off your path.',
  'Bucks are worth more points the more antler points they have. Look for the big racks.',
  'Parked cars and hedges block flashlights completely. Hug them.',
  'Steve\'s price changes nightly. ▲ means it went up since last night.',
  'Sneaking leaves fainter footprints in snow, and plowed roads leave none.',
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
  nightowl: ['Night Owl', 'Survive to Endless Night 8'],
  allstars: ['Perfect Season', 'Earn 3 stars on all five nights'],
  fullcooler: ['Full Cooler', 'Sell 10 packs to Steve in one trip'],
  bigspender: ['Big Spender', 'Spend $500 at Earl\'s in one season'],
  thrifty: ['Thrifty', 'Finish the season without buying anything'],
  collector: ['Neighborhood Gossip', 'Collect every gossip note'],
  haggler: ['Art of the Deal', 'Win a haggle with Steve'],
  streak: ['Ghost Streak', 'Deliver 4 deer in a row without being spotted'],
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

// ============================================================
// World
// ============================================================
const W = 3600, H = 2600, M = 260, ROAD = 120;
const PLAYER_R = 13, DEER_R = 16;
const HW = 230, HH = 160;
let world = null;

function buildWorld() {
  const R = mulberry32(1337);
  const vx = [M + 1000, M + 2100];
  const hy = [M + 650, M + 1350];
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
  for (const bi of [0, 2, 5, 6, 7]) {
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
  for (const bi of [0, 2, 3, 5, 6, 8]) {
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

function moveCircle(o, dx, dy, r) {
  o.x = clamp(o.x + dx, r, W - r);
  o.y = clamp(o.y + dy, r, H - r);
  for (const s of world.solids) {
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
  for (const t of world.trees) {
    const ddx = o.x - t.x, ddy = o.y - t.y, rr = r + t.trunk, d2 = ddx * ddx + ddy * ddy;
    if (d2 < rr * rr && d2 > 1e-4) { const d = Math.sqrt(d2); o.x = t.x + ddx / d * rr; o.y = t.y + ddy / d * rr; }
  }
}

// Line of sight blocked by houses, fences, the truck and tree trunks/canopy cores.
function los(x1, y1, x2, y2) {
  const minx = Math.min(x1, x2), maxx = Math.max(x1, x2), miny = Math.min(y1, y2), maxy = Math.max(y1, y2);
  for (const s of world.solids) {
    if (s.noLos || s.x > maxx || s.x + s.w < minx || s.y > maxy || s.y + s.h < miny) continue;
    const t = segRect(x1, y1, x2, y2, s);
    if (t >= 0 && t < 1) return false;
  }
  for (const t of world.trees) {
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
const mouse = { x: 0, y: 0, down: false };
let night = 1;
let campaign = null;
let best = store.get('hs_best', 0);
let achievements = store.get('hs_ach', {});
let toasts = [];
let uiButtons = []; // clickable rects on menu screens, rebuilt every frame

function quotaFor(n) { return 2 + n; }
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
  buildWorld();
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
  };
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
  setupWatchers();
  spawnCritters();
  setupObjective();
  G.priceTrend = campaign.lastPrice ? Math.sign(G.price - campaign.lastPrice) : 0;
  campaign.lastPrice = G.price;
  if (campaign.heat && !campaign.daily && night <= 5) {
    campaign.heat = 0;
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

// ============================================================
// Input
// ============================================================
window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
  if (e.code === 'KeyM') { muted = !muted; store.set('hs_muted', muted); }
  if (e.repeat) return;
  if (state === 'story') { if (e.code === 'Escape') advanceStory(true); else if (['Enter', 'Space', 'KeyE'].includes(e.code)) advanceStory(); return; }
  if (state === 'steve') {
    if (e.code === 'Digit1') steveSell(); else if (e.code === 'Digit2') steveBuy('beer');
    else if (e.code === 'Digit3') steveBuy('arrows'); else if (e.code === 'Digit4') steveBuy('cones');
    else if (e.code === 'Digit6') steveHaggle();
    else if (['Escape', 'KeyE', 'Enter', 'Digit5'].includes(e.code)) state = 'play';
    return;
  }
  if (state === 'court' && !G.court) { if (e.code === 'Digit1') courtPlea(0); if (e.code === 'Digit2') courtPlea(1); if (e.code === 'Digit3') courtPlea(2); }
  if (state === 'play' && e.code === 'KeyV') drinkBeer();
  if (state === 'play' && e.code === 'Tab') G.mapOpen = !G.mapOpen;
  if ((['whoswho', 'nights', 'trophies', 'credits', 'settings'].includes(state)) && (e.code === 'Escape' || e.code === 'Enter' || e.code === 'Space')) state = 'title';
  else if (state === 'title' && (e.code === 'Enter' || e.code === 'Space')) { if (!loadGame()) newCampaign(); }
  else if (state === 'intro' && (e.code === 'Enter' || e.code === 'Space')) state = 'play';
  else if (state === 'play') {
    if (e.code === 'KeyE') interact();
    if (e.code === 'KeyQ') tryLeave();
    if (e.code === 'KeyF') throwCone();
    if (e.code === 'KeyG') grunt();
    if (e.code === 'KeyB') dropCorn();
    if (e.code === 'KeyN') toggleNVG();
    if (e.code === 'KeyJ') feedDog();
    if (e.code === 'KeyT') declineCall();
    if (e.code === 'Space') startDraw();
    if (e.code === 'KeyP' || e.code === 'Escape') { player.drawing = false; state = 'pause'; }
  } else if (state === 'pause') {
    if (e.code === 'KeyP' || e.code === 'Escape' || e.code === 'Enter') state = 'play';
    if (e.code === 'KeyR') startNight();
    if (e.code === 'KeyN') newCampaign();
  }
  else if (state === 'nightdone' && (e.code === 'Enter' || e.code === 'Space')) goShop();
  else if (state === 'shop') {
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= SHOP.length) buy(SHOP[n - 1]);
    if (e.code === 'Enter' || e.code === 'Space') { night++; startNight(); }
  }
  else if (state === 'over' && (e.code === 'Enter' || e.code === 'KeyR')) newCampaign();
});
window.addEventListener('keyup', e => {
  keys[e.code] = false;
  if (e.code === 'Space' && state === 'play') releaseDraw();
});
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play') { player.drawing = false; state = 'pause'; } });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; if (state === 'play') { player.drawing = false; state = 'pause'; } });
cv.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
cv.addEventListener('mousedown', e => {
  mouse.x = e.clientX; mouse.y = e.clientY;
  if (state === 'play' && e.button === 2) { throwCone(); return; }
  if (e.button !== 0) return;
  for (const b of uiButtons) {
    if (mouse.x >= b.x && mouse.x <= b.x + b.w && mouse.y >= b.y && mouse.y <= b.y + b.h) { b.fn(); return; }
  }
  if (state === 'story') advanceStory();
  else if (state === 'steve') { /* buttons only */ }
  else if (state === 'title') { if (!store.get('hs_save', null)) newCampaign(); }
  else if (['whoswho', 'nights', 'trophies', 'credits', 'settings'].includes(state)) state = 'title';
  else if (state === 'intro') state = 'play';
  else if (state === 'play') startDraw();
  else if (state === 'pause') state = 'play';
  else if (state === 'nightdone') goShop();
  else if (state === 'over') newCampaign();
});
window.addEventListener('mouseup', e => { if (e.button === 0 && state === 'play') releaseDraw(); });
cv.addEventListener('contextmenu', e => e.preventDefault());

// ============================================================
// Gamepad (standard mapping: Xbox / PlayStation style)
// ============================================================
const pad = { connected: false, prev: [], mx: 0, my: 0, aim: null, crouch: false, draw: false };
let shopSel = 0;
function pollPad() {
  const gps = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
  const gp = gps[0];
  if (!gp) { pad.connected = false; pad.mx = pad.my = 0; pad.aim = null; pad.crouch = false; return; }
  pad.connected = true;
  const b = gp.buttons.map(x => x.pressed);
  const edge = i => b[i] && !pad.prev[i];
  const dz = v => Math.abs(v) < 0.25 ? 0 : v;
  pad.mx = dz(gp.axes[0] || 0); pad.my = dz(gp.axes[1] || 0);
  const ax = gp.axes[2] || 0, ay = gp.axes[3] || 0;
  pad.aim = Math.hypot(ax, ay) > 0.35 ? Math.atan2(ay, ax) : null;
  pad.crouch = !!(b[4] || b[10] || b[6]);
  pad.look = !!b[5];
  pad.sprint = !!b[11];
  if (state === 'play') {
    if (b[7] && !pad.draw) { pad.draw = true; startDraw(); }
    if (!b[7] && pad.draw) { pad.draw = false; releaseDraw(); }
    if (edge(0)) interact();
    if (edge(1)) throwCone();
    if (edge(2)) grunt();
    if (edge(3)) { if (G.mom && G.mom.state === 'buzz') declineCall(); else tryLeave(); }
    if (edge(9)) { player.drawing = false; state = 'pause'; }
    if (edge(12)) drinkBeer();
    if (edge(8)) G.mapOpen = !G.mapOpen;
    if (edge(13)) toggleNVG();
    if (edge(14)) feedDog();
  } else if (state === 'story') {
    if (edge(0)) advanceStory(); else if (edge(1) || edge(9)) advanceStory(true);
  } else if (state === 'steve') {
    if (edge(0)) steveSell(); else if (edge(2)) steveBuy('beer'); else if (edge(3)) steveBuy('arrows'); else if (edge(1) || edge(9)) state = 'play';
  } else if (state === 'shop') {
    if (edge(12)) shopSel = (shopSel + SHOP.length - 1) % SHOP.length;
    if (edge(13)) shopSel = (shopSel + 1) % SHOP.length;
    if (edge(0)) buy(SHOP[shopSel]);
    if (edge(9)) { night++; startNight(); }
  } else if (edge(0) || edge(9) || edge(1)) {
    if (['whoswho', 'nights', 'trophies', 'credits', 'settings'].includes(state)) state = 'title';
    else if (edge(1)) { /* B only backs out of sub-menus */ }
    else if (state === 'title') { if (!loadGame()) newCampaign(); }
    else if (state === 'intro' || state === 'pause') state = 'play';
    else if (state === 'nightdone') goShop();
    else if (state === 'over') newCampaign();
  }
  pad.prev = b;
}

// ============================================================
// Touch controls (phones / tablets): left thumb = move stick, right thumb = aim + draw
// ============================================================
let touchMode = false;
const touch = { stickId: null, sx: 0, sy: 0, x: 0, y: 0, mx: 0, my: 0, aimId: null, crouch: false };
function touchButtons() {
  if (state !== 'play') return [];
  const r = VW < 500 ? 26 : 30, x = VW - r - 16;
  let y = VH - r - 70;
  const list = [
    { id: 'drag', label: player.carry ? 'DROP' : player.fishing ? 'REEL' : nearVan() ? 'STEVE' : 'USE', fn: interact },
    { id: 'cone', label: '🌰', fn: throwCone },
    { id: 'grunt', label: 'CALL', fn: grunt },
  ];
  if (has('corn')) list.push({ id: 'corn', label: 'CORN', fn: dropCorn });
  if (campaign.items.beer) list.push({ id: 'beer', label: '🍺', fn: drinkBeer });
  if (has('nvg')) list.push({ id: 'nvg', label: 'NVG', fn: toggleNVG, hot: G.nvgOn });
  if (campaign.items.jerky && world.dogs.some(g => !g.quiet && dist(g.ax, g.ay, player.x, player.y) < 140)) list.push({ id: 'jerky', label: 'JERKY', fn: feedDog, hot: true });
  if (G.mom && G.mom.state === 'buzz') list.unshift({ id: 'mom', label: '📵', fn: declineCall, hot: true });
  const out = [];
  for (const b of list) { out.push(Object.assign({ x, y, r }, b)); y -= r * 2 + 12; }
  const mmH = Math.max(70, Math.min(220, VW * 0.25, VW - 300)) * H / W;
  out.push({ id: 'pause', label: '❚❚', fn: () => { player.drawing = false; state = 'pause'; }, x: VW - 34, y: 16 + mmH + 34, r: 18 });
  out.push({ id: 'map', label: 'MAP', fn: () => { G.mapOpen = !G.mapOpen; }, x: VW - 34, y: 16 + mmH + 80, r: 18 });
  if (nearTruck()) out.push({ id: 'leave', label: 'LEAVE', fn: tryLeave, x: VW / 2, y: VH - 120, r: 34, hot: true });
  return out;
}
function touchToMouse(t) { mouse.x = t.clientX; mouse.y = t.clientY; }
cv.addEventListener('touchstart', e => {
  e.preventDefault();
  touchMode = true;
  for (const t of e.changedTouches) {
    if (state !== 'play') {
      touchToMouse(t);
      cv.dispatchEvent(new MouseEvent('mousedown', { clientX: t.clientX, clientY: t.clientY, button: 0 }));
      continue;
    }
    const hitBtn = touchButtons().find(b => dist(b.x, b.y, t.clientX, t.clientY) < b.r + 8);
    if (hitBtn) { hitBtn.fn(); continue; }
    if (t.clientX < VW * 0.45 && touch.stickId === null) {
      touch.stickId = t.identifier; touch.sx = touch.x = t.clientX; touch.sy = touch.y = t.clientY; touch.mx = touch.my = 0;
    } else if (touch.aimId === null) {
      touch.aimId = t.identifier; touchToMouse(t); startDraw();
    }
  }
}, { passive: false });
cv.addEventListener('touchmove', e => {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (t.identifier === touch.stickId) {
      touch.x = t.clientX; touch.y = t.clientY;
      const dx = touch.x - touch.sx, dy = touch.y - touch.sy, d = Math.hypot(dx, dy), R = 60;
      const k = Math.min(1, d / R);
      touch.mx = d > 6 ? dx / d * k : 0; touch.my = d > 6 ? dy / d * k : 0;
      touch.crouch = d > 6 && k < 0.6; // light push = sneak
    } else if (t.identifier === touch.aimId) touchToMouse(t);
  }
}, { passive: false });
function endTouch(e) {
  e.preventDefault();
  for (const t of e.changedTouches) {
    if (t.identifier === touch.stickId) { touch.stickId = null; touch.mx = touch.my = 0; touch.crouch = false; }
    if (t.identifier === touch.aimId) { touch.aimId = null; if (state === 'play') releaseDraw(); }
  }
}
cv.addEventListener('touchend', endTouch, { passive: false });
cv.addEventListener('touchcancel', endTouch, { passive: false });

function drawTouchControls() {
  if (!touchMode || state !== 'play') return;
  // stick
  if (touch.stickId !== null) {
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(touch.sx, touch.sy, 60, 0, TAU); ctx.stroke();
    ctx.fillStyle = touch.crouch ? 'rgba(158,203,255,0.5)' : 'rgba(255,255,255,0.4)';
    ctx.beginPath(); ctx.arc(touch.sx + touch.mx * 60, touch.sy + touch.my * 60, 24, 0, TAU); ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = '12px system-ui, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('◀ Left thumb: move (light push = sneak)', 16, VH - 34);
  }
  for (const b of touchButtons()) {
    ctx.fillStyle = b.hot ? 'rgba(255,209,102,0.85)' : 'rgba(20,24,30,0.7)';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = b.hot ? '#111' : '#fff'; ctx.font = `bold ${b.r > 24 ? 12 : 11}px system-ui, sans-serif`; ctx.textAlign = 'center';
    ctx.fillText(b.label, b.x, b.y + 4);
  }
  if (touch.aimId === null) {
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = '12px system-ui, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText('Right thumb: touch to aim, hold to draw, lift to shoot ▶', 16, VH - 16);
  }
}

function buy(item) {
  if (item.weapon) {
    if (campaign.weapons[item.weapon]) { campaign.weapon = item.weapon; sfx.grab(); return; }
    if (campaign.cash < priceOf(item)) { sfx.thunk(); return; }
    campaign.cash -= priceOf(item); campaign.spent = (campaign.spent || 0) + priceOf(item); if (campaign.spent >= 500) unlock('bigspender');
    campaign.weapons[item.weapon] = true;
    campaign.weapon = item.weapon;
    sfx.buy();
    return;
  }
  if (item.consumable) {
    if ((campaign.items[item.id] || 0) >= item.max || campaign.cash < priceOf(item)) { sfx.thunk(); return; }
    campaign.cash -= priceOf(item); campaign.spent = (campaign.spent || 0) + priceOf(item); if (campaign.spent >= 500) unlock('bigspender');
    campaign.items[item.id] = (campaign.items[item.id] || 0) + 1;
    sfx.buy();
    return;
  }
  if (has(item.id)) return;
  if (campaign.cash < priceOf(item)) { sfx.thunk(); return; }
  campaign.cash -= priceOf(item); campaign.spent = (campaign.spent || 0) + priceOf(item); if (campaign.spent >= 500) unlock('bigspender');
  campaign.gear[item.id] = true;
  sfx.buy();
}

// ---- Sketchy Steve ----
const STEVE_LINES = [
  'Steve: "You didn\'t see me, I didn\'t see you. What\'s in the cooler?"',
  'Steve: "Venison? At this hour? My favorite kind of venison."',
  'Steve: "Prices are what they are, man. The market is volatile."',
  'Steve: "Don\'t look at the back of the van. Just... don\'t."',
  'Steve: "Is that blood or ketchup? Doesn\'t matter. I\'ll take it."',
];
function openSteve() {
  player.drawing = false;
  G.steveLine = G.steveLine || pick(STEVE_LINES);
  state = 'steve';
  hint('steve', 'Steve pays cash for venison and small game. Prices change every night.');
}
function steveSell() {
  const packs = (player.cooler || 0) + (player.bag || 0);
  if (!packs) { G.steveLine = 'Steve: "Nothin\' to sell? Then why are you breathing on my van?"'; sfx.thunk(); return; }
  const cash = packs * G.price;
  G.earned += cash;
  G.soldPacks = (G.soldPacks || 0) + packs;
  if (packs >= 10) unlock('fullcooler');
  player.cooler = 0; player.bag = 0;
  sfx.buy();
  G.steveLine = `Steve: "${packs} packs at $${G.price}... that's $${cash}. Pleasure doin' crimes with you."`;
  objectiveEvent('sell', packs);
  unlock('dealer');
}
function steveBuy(kind) {
  const prices = { beer: 15, arrows: 20, cones: 10 };
  const total = campaign.cash + G.earned;
  if (total < prices[kind]) { G.steveLine = 'Steve: "Cash only, and you ain\'t got it."'; sfx.thunk(); return; }
  if (kind === 'beer' && (campaign.items.beer || 0) >= 6) { G.steveLine = 'Steve: "Six is the limit. I\'m a businessman, not a monster."'; return; }
  // spend tonight's earnings first, then savings
  const fromEarned = Math.min(G.earned, prices[kind]);
  G.earned -= fromEarned; campaign.cash -= prices[kind] - fromEarned;
  if (kind === 'beer') campaign.items.beer = (campaign.items.beer || 0) + 1;
  if (kind === 'arrows') player.arrows += 4;
  if (kind === 'cones') player.cones += 3;
  sfx.buy();
  G.steveLine = kind === 'beer' ? 'Steve: "Lukewarm, just how you like it."' : 'Steve: "Fell off a truck. Several trucks."';
}

// ---- Beer power-up ----
function drinkBeer() {
  if ((campaign.items.beer || 0) <= 0) { popup(player.x, player.y - 30, 'No beer. (Steve and Earl sell it.)', '#aaa', 1.2); return; }
  if (G.buzz > 3) { popup(player.x, player.y - 30, 'Pace yourself, Dale.', '#ffd166', 1.2); return; }
  campaign.items.beer--;
  G.buzz = 25; G.burpT = rnd(3, 6);
  sfx.grab(); tone(300, 0.2, 'sine', 0.06, 120, 0.1);
  popup(player.x, player.y - 30, '*crack* *glug glug* LIQUID COURAGE!', '#ffd166', 1.8);
  hint('beer', 'Buzzed: you run faster and draw quicker for 25s, but your aim wobbles and you burp loudly at random.');
  unlock('beer');
  G.beersDrunk = (G.beersDrunk || 0) + 1;
  player.cans = (player.cans || 0) + 1;
  hint('can', 'Empty beer can! Once you\'re out of pinecones, F throws cans instead, and they\'re louder.');
}

function dropCorn() {
  if (!has('corn')) { popup(player.x, player.y - 30, 'Buy Corn Feeder Bags at Earl\'s', '#aaa', 1.2); return; }
  if (G.cornLeft <= 0) { popup(player.x, player.y - 30, 'Out of corn tonight', '#ff9f6b', 1.2); return; }
  G.cornLeft--;
  G.corn.push({ x: player.x, y: player.y, t: 120 });
  sfx.grab();
  popup(player.x, player.y - 30, 'Corn pile dropped. Back off and wait.', '#ffe38a', 1.6);
}

function declineCall() {
  if (!G.mom || G.mom.state !== 'buzz') return;
  G.mom.state = 'done';
  G.banner = null;
  popup(player.x, player.y - 30, 'Declined. Sorry, Ma.', '#ff9ad5', 1.6);
  unlock('callme');
}

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
    else popup(player.x, player.y - 30, 'Take the cooler to Steve\'s van (east logging road).', '#ffd166', 1.6);
    return;
  }
  if (nearTruck() && G.freezer > 0 && !deer.some(d => d.dead && !d.carried && dist(d.x, d.y, player.x, player.y) < 48)) {
    player.cooler = Math.min(10, G.freezer);
    G.freezer -= player.cooler;
    sfx.pickup();
    popup(player.x, player.y - 30, `Packed a cooler: ${player.cooler} venison packs. Sell them to Steve!`, '#9ecbff', 2);
    hint('cooler', 'Coolers are heavy and look suspicious. Carry it to Sketchy Steve\'s van on the far east logging road (arrow points the way), then press E to sell.');
    return;
  }
  if (tryFish()) return;
  let bestD = 48, bestDeer = null;
  for (const d of deer) if (d.dead && !d.carried) {
    const dd = dist(d.x, d.y, player.x, player.y);
    if (dd < bestD) { bestD = dd; bestDeer = d; }
  }
  if (bestDeer) {
    bestDeer.carried = true; player.carry = bestDeer; sfx.pickup();
    popup(player.x, player.y - 30, 'Dragging deer — get it to your shed!', '#ffd166', 1.6);
    if (bestDeer.tracked) { bestDeer.tracked = false; unlock('tracker'); }
  }
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
  { text: 'Carry the cooler to Sketchy Steve\'s van (green arrow, far east) and press E to sell.', done: () => (G.soldPacks || 0) > 0 },
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
  if (state !== 'play') return;

  G.time -= dt;
  G.playT += dt;
  if (G.banner) { G.banner.t -= dt; if (G.banner.t <= 0) G.banner = null; }
  if (G.hint) { G.hint.t -= dt; if (G.hint.t <= 0) G.hint = null; }
  if (G.ghost) { G.ghost.t -= dt; if (G.ghost.t <= 0) G.ghost = null; }
  G.radioCD -= dt;
  musicTick(dt);
  if (!G.warn60 && G.time < 60 && G.time > 1) { G.warn60 = true; banner('☀ Sunrise in 60 seconds!', '#ffb347'); tone(660, 0.15, 'triangle', 0.08); tone(660, 0.15, 'triangle', 0.08, null, 0.25); }
  if (!G.warn20 && G.time < 20 && G.time > 1) { G.warn20 = true; banner('☀ 20 SECONDS TO SUNRISE. Get home!', '#ff9f6b'); tone(880, 0.2, 'triangle', 0.09); }
  if (G.time <= 0) { G.time = 0; endNight(G.delivered >= G.quota ? 'win' : 'sunrise'); return; }

  // Tutorial hints (first season only shows each once)
  if (night === 1 && G.playT > 0.5 && !G.tut) hint('start', 'Sneak (hold Shift) toward a deer. HOLD click to draw your bow, RELEASE to fire. Full draw = deadly.');
  if (G.playT > 35) hint('cone', 'Right-click (or F) throws a pinecone. Watchers walk over to check it out. Use it to clear a path.');
  if (night === 2 && G.playT > 3) hint('flood', 'New tonight: motion floodlights on back porches. Sneak past them or they click on.');

  // Crickets
  G.chirpT -= dt;
  if (G.chirpT <= 0) { G.chirpT = rnd(1.2, 3.5); if (G.weather !== 'rain' && progress() < 0.8) sfx.chirp(); }

  updatePlayer(dt);
  updateArrows(dt);
  updateCones(dt);
  for (const d of deer) updateDeer(d, dt);
  updateDogs(dt);
  updateFloods(dt);
  updateWorldEvents(dt);
  updateCritters(dt);
  updateFishing(dt);
  updateObjective();
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
  const n = BASS[musicBeat % BASS.length];
  tone(n, musicT * 0.9, 'triangle', danger ? 0.05 : 0.035);
  if (danger >= 1 && musicBeat % 2 === 1) tone(6000, 0.02, 'square', 0.008);
  if (danger === 2) tone(n * 2, 0.08, 'sawtooth', 0.015);
  if (danger === 0 && musicBeat % 4 === 2 && Math.random() < 0.6) tone(pick(PLUCK), 0.25, 'triangle', 0.02, null, 0.05);
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
  if (G.weather === 'snow') trackPrints(dt);
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
    hint('notice', 'HOA violation notices are worth cash at Earl\'s. Grab all 3 each night for a bonus.');
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
  if (campaign.daily) { G.objective = null; return; }
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
  ctx.fillText(`${story.i + 1} / ${story.lines.length}  ·  ${touchMode ? 'Tap' : 'Click / Enter'} to continue  ·  Esc to skip`, cx, y + h + 26);
}

function progress() { return 1 - G.time / G.NIGHT; }
function dayFactor() { const p = progress(); return 1 + 0.65 * p * p; }

function updatePlayer(dt) {
  let mx = 0, my = 0;
  if (keys.KeyW || keys.ArrowUp) my -= 1;
  if (keys.KeyS || keys.ArrowDown) my += 1;
  if (keys.KeyA || keys.ArrowLeft) mx -= 1;
  if (keys.KeyD || keys.ArrowRight) mx += 1;
  if (pad.connected) { mx += pad.mx; my += pad.my; }
  if (touch.stickId !== null) { mx += touch.mx; my += touch.my; }
  player.crouch = !!(keys.ShiftLeft || keys.ShiftRight || keys.KeyC || pad.crouch || touch.crouch);
  let spd = player.crouch ? 85 : 175;
  if (player.carry) spd *= has('sled') ? 0.8 : 0.6;
  if (player.cooler) spd *= 0.85;
  if (G.buzz > 0) spd *= 1.25;
  // Sprint (hold X / R3): fast, loud, drains stamina
  const wantSprint = (keys.KeyX || pad.sprint) && !player.crouch && !player.carry && !player.cooler && !player.drawing && (mx || my);
  if (player.stamina === undefined) player.stamina = 100;
  player.sprinting = !!wantSprint && player.stamina > 0;
  if (player.sprinting) { spd *= 1.45; player.stamina = Math.max(0, player.stamina - 28 * dt); hint('sprint', 'Sprinting is fast but LOUD: bigger footstep noise, and deer spook from farther. Watch your stamina bar.'); }
  else player.stamina = Math.min(100, player.stamina + 14 * dt);
  if (player.drawing) {
    spd *= 0.45;
    player.draw = Math.min(1, player.draw + dt / weapon().draw);
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
    if (G.weather === 'snow') {
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
  if (player.hidden) hint('bush', 'You\'re hidden in a bush. Nobody can see you unless they walk right up. (You can\'t hide while dragging a deer.)');

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
  if (G.police && nearTruck() && !player.carry) {
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
  const pts = (d.legend ? 1000 : d.buck ? 120 + (d.points || 8) * 10 : 100) * (d.albino ? 3 : 1);
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
  if (G.delivered === G.quota) banner('QUOTA MET! Press Q at your shed to call it a night — or keep hunting', '#9be564');
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
  for (const a of arrows) {
    if (!a.flying) { a.t -= dt; continue; }
    a.life -= dt;
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
          G.hits++;
          sfx.hit();
          rumble(160, 0.7);
          if (noiseMult() < 0.5) unlock('leafblower');
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
        else if (!G.police) G.sus = Math.min(100, G.sus + 40);
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
    if (d.wounded <= 0) { d.dead = true; d.state = 'dead'; d.wounded = 0; d.tracked = true; return; }
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
    // pick a new random spot over the subdivision (Gary flies like he drives)
    w.target = { x: rnd(M + 100, W - M - 100), y: rnd(M + 100, H - M - 100) };
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
  if (dist(w.x, w.y, player.x, player.y) < 22) G.arrest = 2; // caught (stays >= 1 after this frame's decay)
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
  for (const s of world.solids) {
    if (s.noLos || s.x > w.x + R || s.x + s.w < w.x - R || s.y > w.y + R || s.y + s.h < w.y - R) continue;
    rects.push(s);
  }
  for (const t of world.trees) if (Math.abs(t.x - w.x) < R + 20 && Math.abs(t.y - w.y) < R + 20) circles.push(t);
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
      G.arrest += dt / 1.4;
      if (d < 34) G.arrest = 1;
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
    let cop = null, cd = 1e9;
    for (const c of watchers) if (c.type === 'cop' || c.type === 'k9') { const dd = dist(c.x, c.y, player.x, player.y); if (dd < cd) { cd = dd; cop = c; } }
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
  banner('911 CALLED! Cops arrive in 7 seconds — get back to your shed!', '#ff5a5a');
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
  }
}

function endNight(reason) {
  G.endReason = reason;
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
  campaign.totalDeer += G.delivered;
  if (campaign.score > best) { best = campaign.score; store.set('hs_best', best); }
  if (reason === 'win') {
    if (G.timesSpotted === 0) unlock('ghost');
    if (!G.exSaw) unlock('exproof');
  }
  if (G.shots >= 3 && G.hits === G.shots) unlock('robin');
  const life = store.get('hs_life', {});
  const addL = (k, v) => { life[k] = (life[k] || 0) + v; };
  addL('nights', 1); addL('deer', G.delivered); addL('bucks', G.bucks); addL('arrows', G.shots); addL('hits', G.hits);
  addL('sold', G.soldPacks || 0); addL('squirrels', G.squirrels || 0); addL('fish', G.fish || 0); addL('rabbits', G.rabbits || 0);
  addL('cash', G.earned); if (reason === 'arrested') addL('busted', 1); if (G.legendDone) addL('hosta', 1);
  store.set('hs_life', life);
  if (night <= 5) { const bs = store.get('hs_stars', []); bs[night - 1] = Math.max(bs[night - 1] || 0, G.stars); store.set('hs_stars', bs); }
  if (reason === 'win' && night === 5 && !G.tracked) unlock('snowghost');
  if (reason === 'win' && night >= 8) unlock('nightowl');
  G.resultAt = performance.now();
  G.news = buildNews(reason);
  G.voicemail = pick(G.exSaw ? VOICEMAILS.saw : VOICEMAILS.clean);
  player.drawing = false;
  store.set('hs_reached', Math.max(store.get('hs_reached', 1), Math.min(5, night + (reason === 'win' ? 1 : 0))));
  if (night > 5) store.set('hs_endless_best', Math.max(store.get('hs_endless_best', 0), reason === 'win' ? night : night - 1));
  if (reason === 'win' && night !== 5 && !campaign.daily) { state = 'nightdone'; sfx.win(); }
  else {
    if (reason === 'arrested' && night < 5 && !campaign.daily && !campaign.courtUsed) {
      // First arrest of the season: you get your day in court.
      state = 'over'; sfx.lose();
      playScene(SCENES.busted, () => { G.court = null; state = 'court'; });
      story.jail = true;
      return;
    }
    if (reason === 'win' && !campaign.daily) unlock('season');
    if (reason === 'win' && night === 5) {
      if ([0, 1, 2, 3, 4].every(i => (campaign.stars[i] || 0) >= 3)) unlock('allstars');
      if (!campaign.spent) unlock('thrifty');
    }
    if (campaign.daily) { const dd = store.get('hs_daily', {}); dd[campaign.daily] = Math.max(dd[campaign.daily] || 0, campaign.score); store.set('hs_daily', dd); unlock('daily'); restoreRandom(); }
    const scores = campaign.daily ? [] : store.get('hs_scores', []);
    scores.push({ score: campaign.score, night, cash: campaign.cash, date: new Date().toLocaleDateString() });
    if (!campaign.daily) { scores.sort((a, b) => b.score - a.score); store.set('hs_scores', scores.slice(0, 5)); }
    clearSave();
    state = 'over'; reason === 'win' ? sfx.win() : sfx.lose();
    if (reason === 'win' && night === 5) {
      if (campaign.cash >= CABIN_GOAL) unlock('cabin');
      playScene(buildEnding(campaign), () => { state = 'over'; });
    } else if (reason === 'arrested' && night <= 5) playScene(SCENES.busted, () => { state = 'over'; });
  }
}

function saveGame() { if (campaign.daily) return; store.set('hs_save', { night, campaign }); }
function clearSave() { try { localStorage.removeItem('hs_save'); } catch (e) { /* no storage */ } }
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

// ============================================================
// Rendering
// ============================================================
function inView(x, y, m) { return x > cam.x - m && x < cam.x + VW + m && y > cam.y - m && y < cam.y + VH + m; }

function render(now) {
  const wob = G && G.buzz > 0 && settings.shake ? Math.min(1, G.buzz / 5) * 5 : 0; // beer wobble
  const sx = (cam.shake ? rnd(-cam.shake, cam.shake) : 0) + Math.sin(now / 420) * wob;
  const sy = (cam.shake ? rnd(-cam.shake, cam.shake) : 0) + Math.cos(now / 530) * wob * 0.6;
  camOff.x = sx; camOff.y = sy;
  ctx.setTransform(DPR, 0, 0, DPR, (-cam.x + sx) * DPR, (-cam.y + sy) * DPR);
  ctx.fillStyle = '#1b2f1d';
  ctx.fillRect(cam.x - 20, cam.y - 20, VW + 40, VH + 40);
  drawGround();
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
  drawBushes();
  drawGrass(now);
  if (player.hidden) drawPlayer(now, true);
  drawTrees();
  drawParticles();
  if (G) drawLighting(now);
  if (G && G.nvgOn) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = 'rgba(60,255,110,0.12)'; ctx.fillRect(0, 0, cv.width, cv.height); }
  if (G && G.flash > 0 && settings.flashes) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = `rgba(230,235,255,${clamp(G.flash * 1.6, 0, 0.55)})`; ctx.fillRect(0, 0, cv.width, cv.height); }
  ctx.setTransform(DPR, 0, 0, DPR, (-cam.x + sx) * DPR, (-cam.y + sy) * DPR);
  if (G) drawAmbient(now);
  if (G) { drawCones(); drawGhost(); drawWatchers(now); }
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
    if (!inView(g.x + 40, g.y + 40, 100)) continue;
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

function drawToasts() {
  let y = 220;
  ctx.textAlign = 'left';
  for (const t of toasts) {
    const w = 280, x = VW - w - 16;
    ctx.globalAlpha = clamp(t.t, 0, 1);
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
  ctx.strokeStyle = 'rgba(214,176,52,0.75)';
  ctx.lineWidth = 4;
  ctx.setLineDash([34, 30]);
  ctx.beginPath();
  for (const r of world.roads) {
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
  ctx.fillStyle = ghillie ? '#4a5a2c' : '#ff7a1a';
  ctx.beginPath(); ctx.ellipse(0, 0, 11, 14, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = ghillie ? '#2f3d1c' : '#4d5a33';
  ctx.beginPath(); ctx.ellipse(-2, 0, 5, 9, 0, 0, TAU); ctx.fill();
  if (ghillie) {
    ctx.fillStyle = '#6b7a3a';
    for (let i = 0; i < 6; i++) ctx.fillRect(Math.cos(i * 1.1) * 9 - 2, Math.sin(i * 1.1) * 11 - 1, 4, 3);
  }
  // head with camo cap
  ctx.fillStyle = '#e0b48c';
  ctx.beginPath(); ctx.arc(3, 0, 7, 0, TAU); ctx.fill();
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
  if (!ghost && state === 'play' && G) drawContextPrompt();
  if (!ghost && state === 'play' && player.stamina < 99) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(player.x - 16, player.y + 20, 32, 4);
    ctx.fillStyle = player.stamina > 30 ? '#9ecbff' : '#ff9f6b'; ctx.fillRect(player.x - 16, player.y + 20, 32 * player.stamina / 100, 4);
  }
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

function drawBushes() {
  for (const b of world.bushes) {
    if (!inView(b.x, b.y, 60)) continue;
    const near = player && player.hidden && dist(b.x, b.y, player.x, player.y) < b.r;
    ctx.globalAlpha = near ? 0.7 : 1;
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
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(w.x, w.y);
    for (const pt of w.poly) ctx.lineTo(pt.x, pt.y);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
}

function drawLegs(phase, moving, color) {
  if (!moving) return;
  const s = Math.sin(phase) * 6;
  ctx.fillStyle = color || '#2a2a2a';
  ctx.beginPath(); ctx.ellipse(s, -5, 5, 3, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-s, 5, 5, 3, 0, 0, TAU); ctx.fill();
}

function drawShadow(rx, ry) { ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.beginPath(); ctx.ellipse(3, 4, rx, ry, 0, 0, TAU); ctx.fill(); }

function drawPerson(body, accent, phase, moving) {
  drawShadow(12, 9);
  drawLegs(phase, moving);
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.ellipse(0, 0, 10, 13, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#e8c09a';
  ctx.beginPath(); ctx.arc(3, 0, 6.5, 0, TAU); ctx.fill();
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
      ctx.fillStyle = w.down > 0 ? '#555' : (Math.floor(now / 200) % 2 ? '#ff3030' : '#30ff60');
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
      ctx.fillStyle = w.seeing ? '#ff3030' : (Math.floor(now / 600) % 2 ? '#3f3' : '#161'); ctx.fillRect(-3, -2, 2, 2);
    } else if (w.type === 'chad') {
      drawPerson('#e05a2a', () => { ctx.fillStyle = '#d23'; ctx.fillRect(8, 2, 16, 5); ctx.fillStyle = '#333'; ctx.fillRect(4, -2, 6, 8); }, ph, moving);
      if (Math.random() < 0.5) particles.push({ x: w.x + Math.cos(w.ang) * 26, y: w.y + Math.sin(w.ang) * 26, vx: Math.cos(w.ang + rnd(-0.4, 0.4)) * 160, vy: Math.sin(w.ang + rnd(-0.4, 0.4)) * 160, t: 0.6, c: pick(['#a0522d', '#c8741a', '#8a6a2a']) });
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
  for (const p of popups) {
    const a = clamp(p.t / 0.5, 0, 1);
    const age = (p.life || 2.6) - p.t, sc = age < 0.12 ? 0.6 + age / 0.12 * 0.4 : 1;
    const w = ctx.measureText(p.text).width + 16;
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
  ctx.fillText(`NIGHT ${night}  ·  ${clockText()}`, 28, 38);
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillStyle = G.delivered >= G.quota ? '#9be564' : '#e8e8e8';
  ctx.fillText(`Deer in freezer: ${G.delivered} / ${G.quota}${G.bucks ? `  (${G.bucks} buck${G.bucks > 1 ? 's' : ''})` : ''}`, 28, 60);
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
  const bw = compact ? VW - 52 : Math.min(380, VW - 320), bx = compact ? 26 : (VW - bw) / 2, by = compact ? 222 : 16;
  // story objective
  const o = G.objective;
  if (o) {
    ctx.font = 'bold 12px system-ui, sans-serif'; ctx.textAlign = 'left';
    const txt = fitText(`${o.done ? '✔' : '★'} ${o.text}${o.need > 1 && !o.done ? ` (${o.count}/${o.need})` : ''}`, compact ? VW - 40 : 360);
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
    ctx.fillText('NEIGHBORHOOD SUSPICION', bcx, by + 12);
    ctx.fillStyle = 'rgba(255,255,255,0.1)'; roundRect(ctx, bx, by + 20, bw, 14, 7); ctx.fill();
    const s = G.sus / 100;
    ctx.fillStyle = s < 0.5 ? '#9be564' : s < 0.8 ? '#ffd166' : '#ff5a5a';
    if (s > 0) { roundRect(ctx, bx, by + 20, Math.max(14, bw * s), 14, 7); ctx.fill(); }
  } else {
    const flash = Math.floor(now / 300) % 2 === 0;
    ctx.fillStyle = flash ? '#ff5a5a' : '#6f9bff'; ctx.font = `bold ${compact ? 12 : 14}px system-ui, sans-serif`;
    ctx.fillText(G.policeT > 0 ? `🚨 911 CALLED — COPS IN ${Math.ceil(G.policeT)}s` : '🚨 POLICE ON SCENE — GET TO YOUR SHED', bcx, by + 14);
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
    const top = VH * (compact ? 0.36 : 0.22) - 24;
    panel(VW / 2 - w / 2, top, w, 14 + lines.length * lh);
    ctx.fillStyle = G.banner.color;
    lines.forEach((l, i) => ctx.fillText(l, VW / 2, top + 24 + i * lh));
    ctx.globalAlpha = 1;
  }
  // pointers: shed when dragging/police/quota met, Steve's van when carrying a cooler, objective spot
  if (player.cooler) drawTruckPointer(world.van, 'STEVE', '#b5e86a');
  else if (player.carry || player.bag > 3 || G.police || G.delivered >= G.quota) drawTruckPointer(world.shed, 'SHED', '#ffd166');
  const op = objectivePlace();
  if (op && !player.carry && !player.cooler && !G.police) drawTruckPointer({ x: op.x, y: op.y, w: 0, h: 0 }, 'GOAL', '#7cf');
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
  if (!touchMode) ctx.fillText(pad.connected
    ? '🎮 L-stick move · R-stick aim · hold RT draw · LB sneak · A drag · B pinecone · X grunt · Y leave/decline call · Start pause'
    : 'WASD move · X sprint · HOLD click draw, release shoot · R look ahead · Right-click/F pinecone · Shift sneak · E use · V beer · G grunt · N goggles · J jerky · Tab map · Q end night · P pause' + (muted ? ' (muted)' : ''), 16, VH - 14);
}

function drawTruckPointer(t = world.shed, label = 'SHED', color = '#ffd166') {
  const tx = t.x + t.w / 2 - cam.x, ty = t.y + t.h / 2 - cam.y;
  if (tx > 0 && tx < VW && ty > 0 && ty < VH) return;
  const a = Math.atan2(ty - VH / 2, tx - VW / 2);
  // ride an ellipse near the screen edge, kept clear of the top HUD
  const px = clamp(VW / 2 + Math.cos(a) * (VW / 2 - 50), 40, VW - 40);
  const py = clamp(VH / 2 + Math.sin(a) * (VH / 2 - 50), 100, VH - 60);
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
    lab('DARLENE\'S', world.exHouse.x + world.exHouse.w / 2, world.exHouse.y, '#ff9ad5');
    if (world.clearing) lab('PHASE 2', world.clearing.x + world.clearing.w / 2, world.clearing.y + 24, '#e0b020');
    ctx.fillStyle = '#ccc'; ctx.fillText(touchMode ? 'MAP (tap MAP to close)' : pad.connected ? 'MAP (Back to close)' : 'MAP (Tab to close)', mw / 2, -12);
  }
  ctx.restore();
}

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

function drawScreens(now) {
  uiButtons = [];
  if (state === 'play') return;
  ctx.fillStyle = ['shop', 'nightdone', 'over', 'settings', 'trophies', 'credits', 'court', 'whoswho', 'nights'].includes(state) ? 'rgba(5,8,14,0.88)' : state === 'title' ? 'rgba(5,8,14,0.82)' : 'rgba(5,8,14,0.72)';
  ctx.fillRect(0, 0, VW, VH);
  ctx.textAlign = 'center';
  const cx = VW / 2;
  const maxW = Math.min(620, VW - 48);
  if (state === 'title') {
    drawTitleArt(now);
    ctx.fillStyle = '#ff7a1a'; ctx.font = `900 ${Math.min(76, VW / 9)}px system-ui, sans-serif`;
    ctx.fillText('HUNTER SUB', cx, VH * 0.28);
    ctx.fillStyle = '#666'; ctx.font = '12px system-ui, sans-serif'; ctx.fillText('v' + VERSION, cx, VH * 0.28 + 18);
    ctx.fillStyle = '#e8e8e8'; ctx.font = '18px system-ui, sans-serif';
    wrapText('Fill the freezer. Sell the meat. Save Grandpa\'s woods. Do NOT let your ex see you.', cx, VH * 0.28 + 44, maxW, 24);
    ctx.font = '15px system-ui, sans-serif'; ctx.fillStyle = '#bbb';
    const lines = [
      'Sneak into Whispering Pines Estates before sunrise and bow-hunt the deer eating everyone\'s hostas.',
      'Drag each deer back to your shed (the one behind your ex-wife\'s house), then sell the meat to Sketchy Steve across town.',
      'If Suspicion fills, someone calls 911. Then it\'s a race back to the shed.',
    ];
    let y = VH * 0.28 + 100;
    for (const l of lines) { y = wrapText(l, cx, y, maxW, 21) + 30; }
    ctx.fillStyle = '#ffd166'; ctx.font = 'bold 20px system-ui, sans-serif';
    const save = store.get('hs_save', null);
    if (save && save.campaign) {
      y = buttonGrid([
        { label: `Continue (Night ${save.night})`, fn: () => loadGame(), hi: true },
        { label: confirmNewAt && performance.now() - confirmNewAt < 3000 ? 'Click again: erase save?' : 'New season', fn: () => { if (confirmNewAt && performance.now() - confirmNewAt < 3000) { confirmNewAt = 0; newCampaign(); } else confirmNewAt = performance.now(); } },
      ], y - 8, 220, 42) - 10;
      ctx.fillStyle = '#e0b83a'; ctx.font = '13px system-ui, sans-serif';
      ctx.fillText(`Cabin fund $${save.campaign.cash || 0} / $${CABIN_GOAL}  ·  Freezer ${save.campaign.freezer || 0} packs  ·  Night ${save.night} of 5`, cx, y + 16); y += 26;
    } else {
      if (Math.floor(now / 600) % 2 === 0) ctx.fillText(touchMode ? 'Tap to start' : 'Click or press Enter to start', cx, y + 20);
      y += 34;
    }
    ctx.fillStyle = '#888'; ctx.font = '13px system-ui, sans-serif';
    const nAch = Object.keys(ACH).filter(k => achievements[k]).length;
    y = wrapText(`Best score: ${best}  ·  Achievements: ${nAch} / ${Object.keys(ACH).length}  ·  ${pad.connected ? '🎮 Gamepad connected (A to start)' : touchMode ? 'Touch controls on' : 'Keyboard + mouse, gamepad, or touch'}`, cx, y + 22, maxW, 18);
    buttonGrid([
      { label: 'Daily Hunt', fn: () => startDaily(), hi: true },
      { label: 'Night select', fn: () => { state = 'nights'; } },
      { label: '⚙ Settings', fn: () => { state = 'settings'; } },
      { label: 'Who\'s Who', fn: () => { state = 'whoswho'; } },
      { label: 'Trophy Room', fn: () => { state = 'trophies'; } },
      { label: 'Credits', fn: () => { state = 'credits'; } },
    ], y + 18, 160, 36);
  } else if (state === 'intro') {
    ctx.fillStyle = '#ff7a1a'; ctx.font = 'bold 40px system-ui, sans-serif';
    ctx.fillText(campaign.daily ? `DAILY HUNT · ${campaign.daily}` : `NIGHT ${night}`, cx, VH * 0.26);
    ctx.fillStyle = '#e8e8e8'; ctx.font = '17px system-ui, sans-serif';
    let y = wrapText(introFor(night), cx, VH * 0.26 + 46, maxW, 24);
    ctx.fillStyle = '#9be564'; ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillText(`Quota: ${G.quota} deer before sunrise`, cx, y + 50);
    ctx.fillStyle = '#9ecbff'; ctx.font = '15px system-ui, sans-serif';
    ctx.fillText(WEATHER_TEXT[G.weather], cx, y + 78);
    ctx.fillStyle = '#c9d6ff'; ctx.font = '14px system-ui, sans-serif'; ctx.fillText(moonFx().label, cx, y + 98); y += 20;
    if (G.objective) {
      ctx.fillStyle = '#7cf'; ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillText(fitText(`★ Story objective: ${G.objective.text}${G.objective.reward ? ` (+$${G.objective.reward})` : ''}`, maxW), cx, y + 102);
      y += 24;
    }
    if (night <= 5) {
      ctx.fillStyle = '#e0b83a'; ctx.font = '14px system-ui, sans-serif';
      ctx.fillText(fitText(`Cabin fund: $${campaign.cash} / $${CABIN_GOAL}  ·  Freezer: ${G.freezer} packs  ·  Steve pays $${G.price}/pack tonight`, maxW), cx, y + 102);
      y += 24;
    }
    ctx.fillStyle = '#bbb'; ctx.font = '14px system-ui, sans-serif';
    y = wrapText(`Watching tonight: ${watchers.map(w => w.label).join(' · ')}`, cx, y + 104, maxW, 20);
    if (deer.some(d => d.legend)) {
      ctx.fillStyle = '#ffd166'; ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillText('Rumor at the bait shop: OLD HOSTA, the legendary 14-pointer, is in the woods tonight.', cx, y + 28);
      y += 28;
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
    if (G.objective) { ctx.fillStyle = G.objective.done ? '#9be564' : '#7cf'; ctx.fillText((G.objective.done ? '✔ ' : '★ ') + G.objective.text, cx, VH * 0.4 - 60); }
    ctx.fillStyle = '#888'; ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(fitText('E: drag / fish / pack cooler / talk to Steve · V: beer · G: grunt · B: corn · F: pinecone · T: decline call · Q: end night at shed', VW - 30), cx, VH * 0.4 + 140);
    buttonGrid([
      { label: 'Resume', fn: () => { state = 'play'; }, hi: true },
      { label: 'Restart night (R)', fn: () => startNight() },
      { label: `Sound: ${pct(settings.sfxVol)}`, fn: () => { settings.sfxVol = cycleVol(settings.sfxVol); saveSettings(); sfx.grab(); } },
      { label: `Music: ${pct(settings.musicVol)}`, fn: () => { settings.musicVol = cycleVol(settings.musicVol); settings.music = settings.musicVol > 0; saveSettings(); } },
      { label: `Hints: ${settings.hints ? 'On' : 'Off'}`, fn: () => { settings.hints = !settings.hints; saveSettings(); } },
      { label: 'Quit to title', fn: () => { state = 'title'; } },
      ...(G.tut ? [{ label: 'Skip tutorial', fn: () => { skipTutorial(); state = 'play'; } }] : []),
    ], VH * 0.4 + 64, 180, 40);
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
    ctx.fillText('Replay any night you\'ve reached. Later nights start with some cash for gear.', cx, VH * 0.22 + 34);
    const bs = store.get('hs_stars', []);
    buttonGrid([1, 2, 3, 4, 5].map(n => ({ label: n <= reached ? `Night ${n} ${'★'.repeat(bs[n - 1] || 0)}` : '🔒', fn: () => startAtNight(n), enabled: n <= reached, hi: n === reached })), VH * 0.22 + 64, 106, 50);
    const eb = store.get('hs_endless_best', 0);
    if (eb) { ctx.fillStyle = '#9ecbff'; ctx.font = '14px system-ui, sans-serif'; ctx.fillText(`Endless mode best: night ${eb}`, cx, VH * 0.22 + 150); }
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
      win: state === 'over' ? 'That\'s the whole season. Your freezer is full, your ex is furious, and Linda is drafting Bylaw 14.4.' : 'You slipped out before the joggers. Linda is drafting a strongly worded email.',
      arrested: G.caller === 'ex' ? 'Darlene is telling everyone at book club. Officer Kowalski says hi.' : 'The HOA fined you $4,000 and the judge fined you more.',
      sunrise: 'The sun is up and the whole subdivision is out jogging. The hunt is over.',
      escaped: 'You dove into the shed and killed the lights. Kowalski knocked for an hour. You missed your quota.',
      home: 'You drove home short of your quota. The freezer hums sadly.',
    };
    let [title, color] = state === 'over' && r === 'win' ? ['SEASON COMPLETE!', '#9be564'] : (titles[r] || titles.home);
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
    const shownStars = Math.min(G.stars, Math.floor((now - (G.resultAt || 0)) / 350));
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
      `Venison sold to Steve: ${G.soldPacks || 0} packs  ·  Freezer: ${campaign.freezer} packs  ·  Squirrels ${G.squirrels || 0} · Fish ${G.fish || 0}`,
      campaign.daily ? `Daily Hunt ${campaign.daily}: best today ${(store.get('hs_daily', {})[campaign.daily] || 0)}` : night < 5 ? `Cabin fund: $${campaign.cash} / $${CABIN_GOAL}` : '',
      `Time bonus: ${G.timeBonus || 0}  ·  Ghost bonus: ${G.stealthBonus || 0}  ·  Cash earned: $${G.earned}`,
      `Night score: ${G.nightScore}  ·  Season total: ${campaign.score}  ·  Best: ${best}`,
    ].filter(Boolean);
    for (const row of rows) { ctx.fillText(fitText(row, VW - 24), cx, y); y += 24; }
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
    if (VW >= 1100 && G.route && G.route.length > 1) drawRouteMap(VW - 250, VH - 210, 230);
    ctx.fillStyle = '#ffd166'; ctx.font = 'bold 19px system-ui, sans-serif';
    if (state === 'over' && r === 'win' && night === 5) {
      buttonGrid([{ label: 'Endless Mode ▶', fn: () => startEndless(), hi: true }, { label: 'New season', fn: () => newCampaign() }], y + 24, 220, 44);
    } else if (state === 'over' && night > 5) {
      ctx.fillText(`Endless run ended on night ${night}. Best: night ${store.get('hs_endless_best', 0)}`, cx, y + 30);
      if (Math.floor(now / 600) % 2 === 0) { ctx.font = 'bold 17px system-ui, sans-serif'; ctx.fillText('Click to start a new season', cx, y + 62); }
    } else if (Math.floor(now / 600) % 2 === 0) ctx.fillText(`${touchMode ? 'Tap' : 'Click'} ${state === 'nightdone' ? 'to visit the bait shop' : 'to start a new season'}`, cx, y + 40);
  }
}

// Lays out buttons in centered rows that wrap to the screen width. Returns the y below the last row.
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
  const hover = mouse.x >= x && mouse.x <= x + w && mouse.y >= y && mouse.y <= y + h;
  ctx.fillStyle = !enabled ? 'rgba(60,60,60,0.6)' : highlight ? (hover ? '#ffdf8a' : '#ffd166') : hover ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)';
  roundRect(ctx, x, y, w, h, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = highlight ? '#111' : enabled ? '#fff' : '#888';
  ctx.font = 'bold 14px system-ui, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(label, x + w / 2, y + h / 2 + 5);
  if (enabled) uiButtons.push({ x, y, w, h, fn });
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
  ['Old Hosta', 'Legendary 14-point buck.', 'Takes two arrows. Smells you from a mile away.', '#c9a26b'],
  ['Earl', 'Earl\'s Bait & Tackle.', 'Sells you gear between nights. Asks no questions.', '#e0b83a'],
];
function drawWhosWho() {
  const cx = VW / 2;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff7a1a'; fitFont('WHO\'S WHO IN WHISPERING PINES', 900, 36, VW - 24);
  ctx.fillText('WHO\'S WHO IN WHISPERING PINES', cx, 64);
  const cols = VW > 820 ? 2 : 1, cw = Math.min(380, (VW - 60) / cols), ch = Math.min(70, (VH - 140) / Math.ceil(WHOS_WHO.length / cols) - 6);
  const x0 = cx - (cols * cw + (cols - 1) * 12) / 2;
  WHOS_WHO.forEach(([name, role, desc, color], i) => {
    const x = x0 + (i % cols) * (cw + 12), y = 92 + Math.floor(i / cols) * (ch + 6);
    panel(x, y, cw, ch);
    ctx.fillStyle = color; ctx.fillRect(x, y + 8, 4, ch - 16);
    ctx.textAlign = 'left';
    ctx.fillStyle = color; ctx.font = 'bold 15px system-ui, sans-serif'; ctx.fillText(name, x + 14, y + 22);
    ctx.fillStyle = '#ddd'; ctx.font = '12px system-ui, sans-serif'; ctx.fillText(role, x + 14, y + 40);
    ctx.fillStyle = '#999'; ctx.font = 'italic 12px system-ui, sans-serif'; ctx.fillText(desc, x + 14, y + 57);
  });
  ctx.textAlign = 'center'; ctx.fillStyle = '#888'; ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('Click or press Esc to go back', cx, VH - 24);
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
  ctx.fillText(`Tonight's price: $${G.price}/pack  ·  You have ${packs} pack${packs === 1 ? '' : 's'} on you  ·  Cash $${campaign.cash + G.earned}`, cx, y);
  y += 24;
  buttonGrid([
    { label: `1. Sell ${packs} packs ($${packs * G.price})`, fn: steveSell, enabled: packs > 0, hi: packs > 0 },
    { label: '2. Beer ($15)', fn: () => steveBuy('beer') },
    { label: '3. Four arrows ($20)', fn: () => steveBuy('arrows') },
    { label: '4. Three pinecones ($10)', fn: () => steveBuy('cones') },
    { label: G.haggled ? 'Already haggled' : '6. Haggle (risky)', fn: steveHaggle, enabled: !G.haggled },
    { label: '5. Leave', fn: () => { state = 'play'; } },
  ], y, 230, 44);
  ctx.fillStyle = '#888'; ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('Time is frozen while you haggle. (Steve is very fast at haggling.)', cx, VH - 30);
}

// ---- Context prompt: one clear hint for what E does right now ----
function contextLabel() {
  if (player.fishing) return player.fishing.bite > 0 ? '[E] REEL IN!' : 'fishing...';
  if (player.carry) return nearTruck() ? '' : '[E] drop deer';
  if (!player.cooler && deer.some(d => d.dead && !d.carried && dist(d.x, d.y, player.x, player.y) < 48)) return '[E] drag deer';
  if (nearVan()) return '[E] talk to Steve';
  if (player.cooler) return nearTruck() ? '[E] put cooler back' : '';
  if (nearTruck() && G.freezer > 0) return '[E] pack a cooler';
  if (pondNear()) return '[E] fish';
  if (nearTruck() && G.delivered >= G.quota) return '[Q] end the night';
  return '';
}
function drawContextPrompt() {
  const t = contextLabel();
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
      if (!(G.soaked > 0)) { popup(player.x, player.y - 30, 'SOAKED! Your boots squelch now.', '#6fb7ff', 1.8); tone(1800, 0.3, 'sawtooth', 0.02, 900); unlock('soaked'); }
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
  y = wrapText(`Nights played ${life.nights || 0} · Deer ${life.deer || 0} (${life.bucks || 0} bucks) · Old Hosta ${life.hosta || 0} · Accuracy ${acc}% · Packs sold ${life.sold || 0} · Squirrels ${life.squirrels || 0} · Rabbits ${life.rabbits || 0} · Fish ${life.fish || 0} · Times busted ${life.busted || 0} · Cash earned $${life.cash || 0} · Gossip notes ${store.get('hs_gossip', []).length}/${GOSSIP.length}`, cx, y, Math.min(700, VW - 30), 18) + 26;
  const scores = store.get('hs_scores', []);
  ctx.fillStyle = '#9be564'; ctx.font = 'bold 14px system-ui, sans-serif'; ctx.fillText('BEST SEASONS', cx, y); y += 20;
  ctx.fillStyle = '#ccc'; ctx.font = '13px system-ui, sans-serif';
  if (!scores.length) { ctx.fillText('None yet. Go fill that freezer.', cx, y); }
  scores.forEach((s, i) => { ctx.fillText(`${i + 1}. ${s.score} pts · reached night ${s.night} · $${s.cash} · ${s.date}`, cx, y); y += 18; });
  ctx.fillStyle = '#888'; ctx.font = '12px system-ui, sans-serif'; ctx.fillText('Click or press Esc to go back', cx, VH - 20);
}
function drawCredits() {
  const cx = VW / 2;
  let y = Math.max(80, VH * 0.2);
  ctx.textAlign = 'center';
  for (const [h, t] of CREDITS) {
    ctx.fillStyle = h === 'HUNTER SUB' ? '#ff7a1a' : '#ffd166';
    ctx.font = h === 'HUNTER SUB' ? '900 40px system-ui, sans-serif' : 'bold 15px system-ui, sans-serif';
    ctx.fillText(h, cx, y); y += h === 'HUNTER SUB' ? 30 : 22;
    ctx.fillStyle = '#ccc'; ctx.font = '15px system-ui, sans-serif';
    y = wrapText(t, cx, y, Math.min(600, VW - 30), 20) + 34;
  }
  ctx.fillStyle = '#888'; ctx.font = '12px system-ui, sans-serif'; ctx.fillText('v' + VERSION + '  ·  Click or press Esc to go back', cx, VH - 20);
}

// ---- v0.7 helpers ----
let confirmNewAt = 0;
const realRandom = Math.random;
function restoreRandom() { Math.random = realRandom; }
function dailyKey() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function startDaily() {
  // Same starting layout (deer, critters, notes, weather) for everyone on the same day.
  const key = dailyKey();
  let h = 7; for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) | 0;
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
  if (Math.random() < 0.55) { G.price = Math.round(G.price * 1.25); G.steveLine = 'Steve: "Fine. FINE. $' + G.price + ' a pack. Hard bargain for a guy who lives in a shed."'; sfx.buy(); unlock('haggler'); }
  else { G.price = Math.max(10, Math.round(G.price * 0.85)); G.steveLine = 'Steve: "Now you\'ve insulted me. $' + G.price + '. Take it or leave it."'; sfx.thunk(); }
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
  if (G.stars >= 3) return 'nobody saw u at all?? ur literally a ninja';
  if (G.police) return 'i heard the sirens lol. u ok?';
  if (G.legendDone) return 'OLD HOSTA??? earl is gonna lose his mind';
  return pick(['nice. mom didnt even notice', 'ur on the hoa group chat again', 'teach me how to do that pls']);
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
  if (G.nvgOn) { G.nvg -= dt; if (G.nvg <= 0) { G.nvg = 0; G.nvgOn = false; popup(player.x, player.y - 30, 'Goggles battery is dead.', '#9be564', 1.6); } }
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
  { label: '3. Hire Earl\'s nephew as your lawyer ($250)', odds: 0.75, fine: 250, cost: true },
];
function courtPlea(i) {
  const p = COURT_PLEAS[i];
  if (G.court) return;
  if (p.cost && campaign.cash < p.fine) { G.courtMsg = 'You can\'t afford Earl\'s nephew. Nobody can, really.'; sfx.thunk(); return; }
  const dismissed = Math.random() < p.odds;
  campaign.courtUsed = true;
  if (dismissed) {
    campaign.cash = Math.max(0, campaign.cash - p.fine);
    unlock('lawyer');
    G.court = { ok: true, text: i === 2 ? 'Earl\'s nephew objects to everything, including the judge\'s tie. Case dismissed.' : i === 1 ? 'The judge has also had raccoon problems. Case dismissed, with sympathy.' : 'The judge is a hunter. "Case dismissed. Fill that freezer, Mr. Pruitt."' };
    if (p.fine) G.court.text += ` (Fine: $${p.fine})`;
    sfx.win();
  } else {
    G.court = { ok: false, text: i === 1 ? '"Raccoons don\'t carry compound bows, Mr. Pruitt." Guilty.' : i === 2 ? 'Earl\'s nephew objects to his own client. Guilty.' : '"The freezer is not a legal defense." Guilty. Your season is over.' };
    sfx.lose();
  }
}
function finishCourt() {
  if (G.court.ok) { pickSpecial(); state = 'shop'; return; }
  const scores = store.get('hs_scores', []);
  scores.push({ score: campaign.score, night, cash: campaign.cash, date: new Date().toLocaleDateString() });
  scores.sort((a, b) => b.score - a.score); store.set('hs_scores', scores.slice(0, 5));
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
    y = buttonGrid(COURT_PLEAS.map((p, i) => ({ label: p.label + (p.odds ? '' : ''), fn: () => courtPlea(i) })), y, Math.min(560, VW - 30), 42);
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
    { label: `Sound: ${pct(settings.sfxVol)}`, fn: () => { settings.sfxVol = cycleVol(settings.sfxVol); saveSettings(); sfx.grab(); } },
    { label: `Music: ${pct(settings.musicVol)}`, fn: () => { settings.musicVol = cycleVol(settings.musicVol); settings.music = settings.musicVol > 0; saveSettings(); } },
    { label: `Cones: ${settings.cbCones ? 'Colorblind' : 'Standard'}`, fn: () => { settings.cbCones = !settings.cbCones; saveSettings(); } },
    { label: `Flashing: ${settings.flashes ? 'On' : 'Reduced'}`, fn: () => { settings.flashes = !settings.flashes; saveSettings(); } },
    { label: `Hints: ${settings.hints ? 'On' : 'Off'}`, fn: () => { settings.hints = !settings.hints; saveSettings(); } },
    { label: `Tutorial: ${store.get('hs_tut_done', false) ? 'Done (reset)' : 'Ready'}`, fn: () => { try { localStorage.removeItem('hs_tut_done'); } catch (e) {} } },
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
  if (!G.nvgOn && G.nvg <= 0) { popup(player.x, player.y - 30, 'Goggles battery is dead for tonight.', '#ff9f6b', 1.4); return; }
  G.nvgOn = !G.nvgOn;
  tone(G.nvgOn ? 1800 : 900, 0.12, 'sine', 0.04, G.nvgOn ? 2600 : 500);
  if (G.nvgOn) { unlock('nightvision'); hint('nvg', 'Night vision lets you see in the dark, but the battery only lasts 90 seconds a night. Press N again to save it.'); }
}
function feedDog() {
  if (!(campaign.items.jerky > 0)) { popup(player.x, player.y - 30, 'No jerky. (Earl sells it.)', '#aaa', 1.2); return; }
  const g = world.dogs.find(d => !d.quiet && dist(d.ax, d.ay, player.x, player.y) < 140);
  if (!g) { popup(player.x, player.y - 30, 'No dog close enough.', '#aaa', 1.2); return; }
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
    ctx.fillText(fitText(`Cabin fund: $${campaign.cash} / $${CABIN_GOAL} (auction after Night 5). Every dollar you spend here comes out of it.`, VW - 30), cx, fy + 26);
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
    y = buttonGrid([{ label: `Sell ${campaign.racks.length} antler rack${campaign.racks.length > 1 ? 's' : ''} to Earl ($${val})`, fn: () => { campaign.cash += val; campaign.racks = []; sfx.buy(); unlock('racks'); } }], y, 340, 34) + 2;
  }
  // Earl buys leftover freezer meat (cheap)
  if (campaign.freezer > 0) {
    y = buttonGrid([{ label: `Sell ${campaign.freezer} freezer packs to Earl ($12 each)`, fn: () => { campaign.cash += campaign.freezer * 12; campaign.freezer = 0; sfx.buy(); } }], y, 340, 34) + 2;
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
    const hover = selected || (mouse.x >= x && mouse.x <= x + bw && mouse.y >= rowY && mouse.y <= rowY + rowH);
    panel(x, rowY, bw, rowH);
    if (hover && !owned && afford) { ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2; roundRect(ctx, x, rowY, bw, rowH, 10); ctx.stroke(); }
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
    if (!owned && afford) uiButtons.push({ x, y: rowY, w: bw, h: rowH, fn: () => buy(item) });
  });
  y += rows * (rowH + 4) + 8;
  button(cx - 130, y, 260, 42, `Start Night ${night + 1}  ▶`, () => { night++; startNight(); }, true, true);
  y -= 6;
  ctx.fillStyle = '#888'; ctx.font = '12px system-ui, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(pad.connected ? 'D-pad to choose · A to buy · Start to continue' : touchMode ? 'Tap an item to buy' : 'Click an item (or press 1–9) to buy · Enter to continue', cx, y + 66);
}

// ============================================================
// Main loop
// ============================================================
buildWorld();
player = { x: world.shed.x - 26, y: world.shed.y + 35, ang: 0, crouch: false, carry: null, cd: 0, hidden: false, lit: false, moving: false, step: 0, arrows: 0, cones: 0 };
updateCam(1);
// Debug/screenshot helpers: open index.html#demo, #demo-police, #demo-rain, #demo-shop or #demo-results.
if (location.hash.startsWith('#demo')) {
  const h = location.hash;
  newCampaign();
  if (h === '#demo-rain' || h === '#demo-fog') { night = h === '#demo-rain' ? 3 : 4; startNight(); }
  state = 'play';
  campaign.hints.start = true;
  const ex = watchers[0];
  player.x = ex.x - 40; player.y = ex.y + 260;
  G.time = G.NIGHT * 0.55;
  if (h === '#demo-police') { callPolice(ex); G.policeT = 0.01; }
  for (let i = 0; i < 90; i++) update(1 / 60);
  if (h !== '#demo-police') { player.drawing = true; player.draw = 0.7; }
  if (h === '#demo-results' || h === '#demo-shop') {
    G.delivered = G.quota; G.bucks = 1; G.shots = 5; G.hits = 4; G.timesSpotted = 2; G.earned = 300; G.exSaw = true;
    endNight('win');
    toasts = [];
    if (h === '#demo-shop') { campaign.cash = 380; campaign.gear.quiver = true; state = 'shop'; }
  }
  updateCam(1);
}
let last = performance.now();
function frame(now) {
  let dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (G && G.slowmo > 0 && state === 'play') { G.slowmo -= dt; dt *= 0.3; }
  update(dt);
  render(now);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
