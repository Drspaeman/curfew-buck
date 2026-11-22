'use strict';
// Curfew Buck: online Versus / Co-op.
// Part 9 of 10. All parts share one global scope, so load them in order (see index.html).
//
// How it works: the HOST runs the real game (P1 = Dale). The CLIENT (P2) sends only its keys,
// and draws the host's snapshots, about 20 a second. Both sides build the same map from a shared
// seed, so snapshots only carry the things that move.
//
// Two ways to connect:
//   • Internet: two computers anywhere. A direct WebRTC connection (PeerJS, loaded only when you pick it),
//     found with a 6-digit lobby code through PeerJS's free public matchmaking server.
//   • Local: two windows or tabs of the game in the same browser (for testing, or one PC, two screens).
// ============================================================
const NET = {
  role: null,          // 'host' | 'client' | null
  live: false,         // a match is running with a peer
  backend: null,       // { name, host(kind), join(code), invite(), leave(), send(str) }
  kind: 'coop',        // what the host is offering: 'coop' | 'versus'
  status: '', code: '', peer: '', err: '', codeInput: '',
  p2: { u: 0, d: 0, l: 0, r: 0, sh: 0, a: 0 },  // host: the client's latest keys
  actionSeen: 0, action: 0,                       // P2 action presses (Enter / E / Space / click)
  sendT: 0, inT: 0, lastIn: '', sfxQ: [],
  snaps: 0, bytes: 0, lastSnapAt: 0, worldOk: true, rate: 20,
};
const netLive = () => NET.live;
const netHost = () => NET.live && NET.role === 'host';
const netClient = () => NET.live && NET.role === 'client';

// ---------------------------------------------------------------- backends
// Internet play: WebRTC data channel between two browsers. The host's lobby code is its PeerJS id.
const PEERJS_URL = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
function netLoadPeer() {
  if (window.Peer) return Promise.resolve();
  return new Promise((res, rej) => {
    const sc = document.createElement('script'); sc.src = PEERJS_URL; sc.async = true;
    sc.onload = () => window.Peer ? res() : rej(new Error('the connection library didn\'t load'));
    sc.onerror = () => rej(new Error('couldn\'t reach the internet to load the connection library'));
    setTimeout(() => { if (!window.Peer) rej(new Error('loading the connection library timed out (check your connection)')); }, 15000);
    document.head.appendChild(sc);
  });
}
function netWebBackend() {   /*fix16*/
  let peer = null, conn = null, pending = null, gen = 0, retries = 0;
  const live = g => { if (g !== gen) throw new Error('cancelled'); };
  const idFor = code => 'curfewbuck-v1-' + String(code).replace(/\D/g, '');
  const opened = p => new Promise((res, rej) => {
    const to = setTimeout(() => rej(new Error('the matchmaking server didn\'t answer (check your connection)')), 12000);
    p.on('open', id => { clearTimeout(to); res(id); });
    p.on('error', e => { clearTimeout(to); rej(e); });
  });
  const wire = c => {
    conn = c; pending = null;
    c.on('data', d => { if (conn === c) netOnMessage(d); });
    c.on('close', () => { if (conn === c) { conn = null; netOnEvent({ type: 'peer-left' }); } });
    c.on('error', () => { if (conn === c) { conn = null; netOnEvent({ type: 'peer-left' }); } });
  };
  const drop = () => { gen++; try { if (conn) conn.close(); } catch (e) { /* closed */ } try { if (pending) pending.close(); } catch (e) { /* closed */ } try { if (peer) peer.destroy(); } catch (e) { /* gone */ } conn = null; pending = null; peer = null; };
  return {
    name: 'Internet', available: true, user: 'Player',
    async host() {
      drop(); const g = gen;
      await netLoadPeer(); live(g);
      for (let tries = 0; tries < 4; tries++) {
        const code = String(100000 + Math.floor(Math.random() * 900000));
        const p = peer = new window.Peer(idFor(code));
        try { await opened(p); live(g); } catch (e) { if (g === gen) { try { p.destroy(); } catch (x) { /* gone */ } peer = null; } if (e && e.type === 'unavailable-id' && g === gen) continue; throw e; }
        retries = 0;
        p.on('connection', c => {
          // one guest: the slot is taken the moment an offer arrives, and freed if it never opens
          if (conn || pending) { c.on('open', () => { c.send(JSON.stringify({ t: 'refuse', why: 'That lobby already has two players.' })); setTimeout(() => c.close(), 300); }); return; }
          pending = c;
          const to = setTimeout(() => { if (pending === c) { pending = null; try { c.close(); } catch (e) { /* closed */ } } }, 15000);
          c.on('open', () => { clearTimeout(to); if (pending === c) wire(c); });
          c.on('error', () => { clearTimeout(to); if (pending === c) pending = null; });
          c.on('close', () => { clearTimeout(to); if (pending === c) pending = null; });
        });
        // keep the code alive for a rejoin, a few times; then say the lobby is gone
        p.on('disconnected', () => { if (p !== peer || p.destroyed) return; if (retries++ < 3) { try { p.reconnect(); } catch (e) { /* closed */ } } else if (!conn) NET.err = 'Lost the connection to the matchmaking server. Leave and host again for a new code.'; });
        p.on('error', e => { if (p === peer && e && ['unavailable-id', 'network', 'server-error', 'socket-error', 'socket-closed'].includes(e.type) && !conn) NET.err = 'The lobby went offline (' + e.type + '). Leave and host again for a new code.'; });
        return { code };
      }
      throw new Error('couldn\'t get a free lobby code, try again');
    },
    async join(code) {
      drop(); const g = gen;
      await netLoadPeer(); live(g);
      const p = peer = new window.Peer();
      try { await opened(p); live(g); } catch (e) { if (g === gen) drop(); throw e; }
      const c = p.connect(idFor(code), { reliable: true });
      await new Promise((res, rej) => {
        const to = setTimeout(() => rej(new Error('no lobby with code ' + code + ' answered. Check the code, and that the host is still in the lobby.')), 15000);
        c.on('open', () => { clearTimeout(to); res(); });
        c.on('error', e => { clearTimeout(to); rej(e); });
        p.on('error', e => { clearTimeout(to); rej(e && e.type === 'peer-unavailable' ? new Error('no lobby with code ' + code + '. Check the code with the host.') : e); });
      }).catch(e => { if (g === gen) drop(); throw e; });
      live(g);
      wire(c);
      return { ok: true };
    },
    invite: () => {},
    unpair: () => { try { if (conn) conn.close(); } catch (e) { /* closed */ } conn = null; },
    leave: drop, dispose: drop,
    send: str => { if (conn && conn.open) conn.send(str); },
  };
}
function netLocalBackend() {
  if (typeof BroadcastChannel === 'undefined') return null;
  const bc = new BroadcastChannel('curfew-buck-net');
  const me = Math.random().toString(36).slice(2, 8);
  let room = null, peer = null;
  bc.onmessage = e => {
    const m = e.data;
    if (!m || m.room !== room || m.from === me) return;
    if (!peer) peer = m.from;            // the first window to answer is our partner
    else if (m.from !== peer) return;    // a third window can't join or steal Player 2
    if (m.bye) { peer = null; netOnEvent({ type: 'peer-left' }); } else netOnMessage(m.msg);
  };
  return {
    name: 'Local', available: true, user: 'Player',
    host: () => { room = String(1000 + Math.floor(Math.random() * 9000)); peer = null; return Promise.resolve({ code: room }); },
    join: code => { room = String(code).trim(); peer = null; return Promise.resolve({ ok: true }); },
    invite: () => {},
    leave: () => { if (room) bc.postMessage({ room, from: me, bye: true }); room = null; peer = null; },
    unpair: () => { peer = null; },
    dispose: () => { try { bc.close(); } catch (e) { /* already closed */ } },
    send: str => { if (room) bc.postMessage({ room, from: me, msg: str }); },
  };
}

function netSend(obj) {
  if (!NET.backend) return 0;
  const str = typeof obj === 'string' ? obj : JSON.stringify(obj);
  NET.backend.send(str);
  return str.length;
}

// ---------------------------------------------------------------- lobby flow
function openOnline() {
  NET.err = ''; NET.status = ''; NET.codeInput = '';
  state = 'online';
}
function netUse(which) {
  if (NET.backend && NET.backend.name === which) return NET.backend;
  if (NET.backend) { netLeave(true); if (NET.backend.dispose) NET.backend.dispose(); }
  NET.backend = which === 'Internet' ? netWebBackend() : netLocalBackend();
  return NET.backend;
}
function netResetSession() {
  NET.p2 = { u: 0, d: 0, l: 0, r: 0, sh: 0, a: 0 }; NET.actionSeen = 0; NET.action = 0;
  NET.lastIn = ''; NET.inT = 0; NET.sendT = 0; NET.sfxQ = []; NET.snaps = 0; NET.inAt = performance.now(); NET.hostState = '';
}
async function netHostLobby(kind, which) {
  const b = netUse(which);
  netResetSession();
  if (!b || !b.available) { NET.err = 'This browser can\'t do online play.'; return; }
  NET.role = 'host'; NET.kind = kind; NET.live = false; NET.err = ''; NET.runSeed = 0;
  NET.status = b.name === 'Internet' ? 'Connecting to the matchmaking server…' : 'Creating a lobby…';
  try {
    const r = await b.host(kind);
    if (NET.backend !== b || NET.role !== 'host') return;
    NET.code = String(r.code);
    NET.status = `Lobby open. Waiting for a friend to join (${kind === 'versus' ? 'Versus' : 'Co-op'})…`;
  } catch (e) { if (e && e.message === 'cancelled') return; NET.err = 'Couldn\'t create a lobby: ' + (e && e.message || e); NET.role = null; }
}
async function netJoinLobby(code, which) {
  code = String(code || '').trim();
  netResetSession();
  if (!code) { NET.err = 'Type or paste a lobby code first.'; return; }
  const b = netUse(which);
  if (!b || !b.available) { NET.err = 'This browser can\'t do online play.'; return; }
  NET.role = 'client'; NET.live = false; NET.err = ''; NET.code = code;
  NET.status = 'Joining lobby ' + code + '…';
  try {
    await b.join(code);
    if (NET.backend !== b || NET.role !== 'client') return;
    NET.status = 'Joined. Saying hi to the host…';
    netSend({ t: 'hello', name: b.user || 'Player 2', v: VERSION });
    NET.helloAt = NET.joinAt = performance.now();
  } catch (e) { if (e && e.message === 'cancelled') return; NET.err = 'Couldn\'t join: ' + (e && e.message || e); NET.role = null; }
}
function netLeave(quiet) {
  if (NET.backend) { try { if (NET.live || NET.role) netSend({ t: 'bye' }); NET.backend.leave(); } catch (e) { /* ignore */ } }
  const wasClient = NET.role === 'client' && NET.live;
  NET.role = null; NET.live = false; NET.code = ''; NET.status = ''; NET.peer = '';
  NET.p2 = { u: 0, d: 0, l: 0, r: 0, sh: 0, a: 0 }; NET.actionSeen = 0; NET.action = 0;
  if (!quiet) { if (wasClient) { restoreRandom(); state = 'title'; } else if (state === 'online') state = 'title'; }
}
function netOnEvent(ev) {
  if (!ev) return;
  if (ev.type === 'peer-left') {
    if (NET.role === 'host') {
      NET.live = false; NET.peer = '';
      if (state !== 'online' && G) banner('📴 Player 2 left. P2 is back on this keyboard (arrow keys).', '#ff9f6b');
      NET.status = 'Your friend left. Lobby still open.';
    } else if (NET.role === 'client') {
      NET.live = false; NET.role = null;
      restoreRandom(); state = 'online'; NET.err = 'The host left the game.';
    }
  } else if (ev.type === 'error') NET.err = ev.text || 'Network error';
}
function netOnMessage(str) {
  let m;
  try { m = typeof str === 'string' ? JSON.parse(str) : str; } catch (e) { return; }
  if (!m || !m.t) return;
  NET.bytes += typeof str === 'string' ? str.length : 0;
  if (NET.role === 'host') {
    if (m.t === 'hello') {
      if (NET.live) return;
      NET.peer = m.name || 'Player 2';
      if (m.v && m.v !== VERSION) { netSend({ t: 'refuse', why: `Version mismatch: host has v${VERSION}, you have v${m.v}.` }); if (NET.backend.unpair) NET.backend.unpair(); return; }
      netResetSession(); NET.live = true;
      NET.status = NET.peer + ' joined!';
      if (G && twoP() && NET.runSeed && NET.runNight === night && !['online', 'title'].includes(state)) {
        // back after leaving mid-hunt: join the hunt in progress instead of restarting it (snapshots fill in the rest)
        netSend({ t: 'start', seed: NET.runSeed, night, diff: NET.runDiff, campaign: netCampaign(), hash: worldHash() });
        banner(`🌐 ONLINE: ${NET.peer} is back.`, '#9be564');
        return;
      }
      startTwoPlayer(NET.kind);     // the startNight wrapper below sends 'start'
      banner(`🌐 ONLINE: ${NET.peer} is ${NET.kind === 'versus' ? 'driving the HOA cart' : 'Tyler'}.`, '#9be564');
    } else if (m.t === 'in' && NET.live) {
      NET.p2 = m; NET.inAt = performance.now();
      if (m.a > NET.actionSeen) { NET.actionSeen = m.a; p2Action(); }
    } else if (m.t === 'bye') netOnEvent({ type: 'peer-left' });
  } else if (NET.role === 'client') {
    if (m.t === 'start') netClientStart(m);
    else if (m.t === 'snap' && NET.live) netApply(m);
    else if (m.t === 'refuse') { const why = m.why; netLeave(true); NET.err = why; }
    else if (m.t === 'bye') netOnEvent({ type: 'peer-left' });
  }
}

// ---------------------------------------------------------------- same map on both sides
function worldHash() {
  if (!world) return 0;
  const s = JSON.stringify([
    world.houses.map(h => [h.x, h.y, h.w, h.h]), world.trees.map(t => [Math.round(t.x), Math.round(t.y)]),
    world.bushes.length, world.roads.map(r => [r.x, r.y, r.w, r.h]), world.shed && [world.shed.x, world.shed.y],
  ]);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const _startNightLocal = startNight;
// The host seeds the RNG for each night and tells the client the seed, so both build the same map.
startNight = function () {
  // the host went back to a one-player mode: end the online match first
  if (netHost() && !twoP()) netLeave(true);
  if (!netHost()) return _startNightLocal();
  const seed = 1 + Math.floor(Math.random() * 2147483646);
  Math.random = mulberry32(seed);
  try { _startNightLocal(); } finally { restoreRandom(); }
  NET.runSeed = seed; NET.runNight = night; NET.runDiff = settings.difficulty;
  netSend({ t: 'start', seed, night, diff: settings.difficulty, campaign: netCampaign(), hash: worldHash() });
  NET.sendT = 0;
};
function netCampaign() {
  const c = {};
  for (const k of ['versus', 'coop', 'map', 'mapSeed', 'seen', 'cash', 'score', 'totalDeer', 'freezer', 'gear', 'items', 'hints', 'weapon', 'weapons', 'flags', 'stars']) if (campaign && campaign[k] !== undefined) c[k] = campaign[k];
  c.online = true;
  return c;
}
function netClientStart(m) {
  NET.lastSnapAt = performance.now(); NET.resultAt = 0;
  const keepDiff = settings.difficulty;
  settings.difficulty = m.diff || 'normal';
  campaign = Object.assign(freshCampaign(), m.campaign);
  night = m.night;
  Math.random = mulberry32(m.seed);
  try { _startNightLocal(); } finally { restoreRandom(); settings.difficulty = keepDiff; }
  NET.worldOk = worldHash() === m.hash;
  if (!NET.worldOk) console.warn('[net] map mismatch', worldHash(), m.hash);
  NET.live = true; NET.snaps = 0;
  NET.status = 'In the game';
  tyler = campaign.coop ? (tyler || { x: world.shed.x, y: world.shed.y, carry: null, moveAng: 0, step: 0, seenT: 0, crouch: false, quipCD: 0 }) : null;
  updateCam(1);
}

// ---------------------------------------------------------------- host: snapshots
// Sounds the host plays get forwarded, so the client hears arrows, alerts and sirens too.
for (const k of Object.keys(sfx)) {
  const f = sfx[k];
  if (typeof f !== 'function') continue;
  sfx[k] = function (...a) { if (netHost() && NET.sfxQ.length < 40) NET.sfxQ.push(a.length ? [k, ...a.filter(x => typeof x === 'number')] : k); return f.apply(this, a); };
}
// long lists: send only the newest entries (route is only drawn on the results map)
const NET_G_TRIM = { route: 0, trail: 40, prints: 80 };
function netEncode(obj) {
  const refs = new Map();
  deer.forEach((d, i) => refs.set(d, ['d', i]));
  watchers.forEach((w, i) => refs.set(w, ['w', i]));
  if (player) refs.set(player, ['p', 0]);
  if (tyler) refs.set(tyler, ['t', 0]);
  return JSON.stringify(obj, function (k, v) {
    if (v && typeof v === 'object') {
      const r = refs.get(v);
      // The entity lists hold the real objects; everywhere else a reference becomes {$r, i}.
      if (r && !(this === obj.deer || this === obj.watchers || (this === obj && (k === 'player' || k === 'tyler')))) return { $r: r[0], i: r[1] };
      return v;
    }
    if (typeof v === 'number') return Number.isInteger(v) ? v : Math.round(v * 100) / 100;
    if (typeof v === 'function') return undefined;
    return v;
  });
}
function netSnapshot() {
  const g = {};
  if (G) for (const k in G) g[k] = k in NET_G_TRIM && Array.isArray(G[k]) ? G[k].slice(G[k].length - NET_G_TRIM[k]) : G[k];
  if (G && G.goth) { g.goth = Object.assign({}, G.goth, { hint: null, hintIdx: G.goth.hint ? G.goth.cards.indexOf(G.goth.hint) : -1 }); }
  if (G && ['nightdone', 'over'].includes(state) && G.route) g.route = G.route.slice(-300);   // the results map
  return {
    t: 'snap', st: state, night, G: G ? g : null, player, tyler, deer, watchers, arrows, cones, drops: drops.slice(-200), popups,
    particles: particles.slice(-60), toasts, critters,
    w: world ? { dogs: world.dogs, floods: world.floods, sprinklers: world.sprinklers, lights: world.lights, props: world.props } : null,
    campaign: netCampaign(), sfx: NET.sfxQ.splice(0),
  };
}
function netHostFrame(dt) {
  if (!netHost()) return;
  if (state === 'title' || !twoP()) { netLeave(true); return; }
  const quiet = performance.now() - (NET.inAt || 0);
  if (quiet > 1500) NET.p2 = Object.assign({}, NET.p2, { u: 0, d: 0, l: 0, r: 0, sh: 0 });   // stale keys: let go
  if (quiet > 12000 && NET.backend && NET.backend.name === 'Local') { if (NET.backend.unpair) NET.backend.unpair(); netOnEvent({ type: 'peer-left' }); return; }
  NET.sendT -= dt;
  if (NET.sendT > 0) return;
  NET.sendT = 1 / NET.rate;
  try { NET.bytes += netSend(netEncode(netSnapshot())); NET.snaps++; } catch (e) { console.warn('[net] snapshot failed', e); }
}

// ---------------------------------------------------------------- client: apply snapshots, send keys
function netRevive(node, ents, depth) {
  if (!node || typeof node !== 'object' || depth > 6) return node;
  if (node.$r !== undefined) {
    const e = node.$r === 'd' ? ents.deer[node.i] : node.$r === 'w' ? ents.watchers[node.i] : node.$r === 'p' ? ents.player : ents.tyler;
    return e || null;
  }
  for (const k in node) { const v = node[k]; if (v && typeof v === 'object') node[k] = netRevive(v, ents, depth + 1); }
  return node;
}
function netSmooth(oldE, newE) {
  if (!oldE || !newE) return;
  newE._tx = newE.x; newE._ty = newE.y;
  if (Math.hypot(newE.x - oldE.x, newE.y - oldE.y) < 220) { newE.x = oldE.x; newE.y = oldE.y; }
}
function netApply(s) {
  const ents = { deer: s.deer || [], watchers: s.watchers || [], player: s.player, tyler: s.tyler };
  for (const k of ['G', 'player', 'tyler', 'arrows', 'cones', 'drops', 'popups', 'particles', 'toasts', 'critters', 'w']) s[k] = netRevive(s[k], ents, 0);
  if (s.G && s.G.goth && s.G.goth.hintIdx >= 0) s.G.goth.hint = s.G.goth.cards[s.G.goth.hintIdx] || null;
  ents.deer.forEach(d => netRevive(d, ents, 1));
  ents.watchers.forEach(w => netRevive(w, ents, 1));
  // keep motion smooth between snapshots
  const oldById = new Map(deer.map(d => [d.id, d]));
  ents.deer.forEach((d, i) => netSmooth(d.id !== undefined ? oldById.get(d.id) : deer[i], d));
  ents.watchers.forEach((w, i) => netSmooth(watchers[i], w));
  netSmooth(player, ents.player); netSmooth(tyler, ents.tyler);
  deer = ents.deer; watchers = ents.watchers;
  if (ents.player) player = ents.player;
  tyler = ents.tyler || null;
  if (s.G) { G = s.G; for (const k in NET_G_TRIM) if (!Array.isArray(G[k])) G[k] = []; }
  arrows = s.arrows || []; cones = s.cones || []; drops = s.drops || []; popups = s.popups || [];
  particles = s.particles || []; toasts = s.toasts || []; critters = s.critters || [];
  if (s.w && world) for (const k in s.w) if (s.w[k]) world[k] = s.w[k];
  if (s.campaign) Object.assign(campaign, s.campaign);
  night = s.night;
  // the host's menus (results, pause) show up here too, but only the host can click through them
  NET.hostState = s.st;
  if (['nightdone', 'over'].includes(s.st)) { if (!NET.resultAt) NET.resultAt = performance.now(); if (G) G.resultAt = NET.resultAt; } else NET.resultAt = 0;
  state = ['play', 'pause', 'intro', 'nightdone', 'over'].includes(s.st) ? s.st : 'netwait';
  for (const e of s.sfx || []) { const [k, ...args] = Array.isArray(e) ? e : [e]; if (sfx[k]) try { sfx[k](...args); } catch (x) { /* sounds are best-effort */ } }
  NET.snaps++; NET.lastSnapAt = performance.now();
}
function netMyChar() {
  if (campaign && campaign.coop) return tyler;
  return watchers.find(w => w.p2) || null;
}
function netClientFrame(dt) {
  if (!netClient()) return;
  if (NET.lastSnapAt && performance.now() - NET.lastSnapAt > 10000) { netLeave(true); restoreRandom(); state = 'online'; NET.err = 'Lost the host (no game updates for 10 seconds).'; return; }
  const k = Math.min(1, dt * 14);
  const ease = e => { if (e && e._tx !== undefined) { e.x += (e._tx - e.x) * k; e.y += (e._ty - e.y) * k; } };
  deer.forEach(ease); watchers.forEach(ease); ease(player); ease(tyler);
  if (state === 'play' && G) musicTick(dt);
  // follow my own character
  const me = netMyChar() || player;
  // hear Velvet Casket from where my own character stands (the host plays it in updateGoth, which guests skip)
  if (state === 'play' && G && G.goth && G.goth.concert && me) concertTick(dt, G.goth.concert, NET.concertClock || (NET.concertClock = {}), me);
  if (me) {
    const tx = W > VW ? clamp(me.x - VW / 2, 0, W - VW) : (W - VW) / 2;
    const ty = camTargetY(me.y);
    const c = Math.min(1, dt * 8);
    cam.x = lerp(cam.x, tx, c); cam.y = lerp(cam.y, ty, c);
    cam.shake = Math.max(0, cam.shake - dt * 20);
  }
  // send my keys: whenever they change, and 10 times a second anyway
  const up = !!(keys.KeyW || keys.ArrowUp || pad.my < -0.4 || touch.my < -0.4), down = !!(keys.KeyS || keys.ArrowDown || pad.my > 0.4 || touch.my > 0.4);
  const left = !!(keys.KeyA || keys.ArrowLeft || pad.mx < -0.4 || touch.mx < -0.4), right = !!(keys.KeyD || keys.ArrowRight || pad.mx > 0.4 || touch.mx > 0.4);
  const msg = { t: 'in', u: +up, d: +down, l: +left, r: +right, sh: +!!(keys.ShiftLeft || keys.ShiftRight || pad.crouch || touch.crouch), a: NET.action };
  const str = JSON.stringify(msg);
  NET.inT -= dt;
  if (str !== NET.lastIn || NET.inT <= 0) { netSend(str); NET.lastIn = str; NET.inT = 0.1; }
}
// Client keyboard: everything goes to the host as P2 input. Returns true if the key was handled here.
function netClientKey(e) {
  if (!netClient()) return false;
  if (e.type === 'keydown' && !e.repeat) {
    if (e.code === 'Escape') { netLeave(); return true; }
    if (['Enter', 'NumpadEnter', 'Space', 'KeyE'].includes(e.code)) NET.action++;
  }
  return true;
}
function netP2Keys() {
  if (netHost()) return { up: NET.p2.u, down: NET.p2.d, left: NET.p2.l, right: NET.p2.r, sneak: NET.p2.sh };
  return { up: keys.ArrowUp, down: keys.ArrowDown, left: keys.ArrowLeft, right: keys.ArrowRight, sneak: keys.ShiftRight };
}

// ---------------------------------------------------------------- screens
function netOnlineKey(e) {
  if (state !== 'online' || e.type !== 'keydown') return false;
  if (e.code === 'Escape') { netLeave(); state = 'title'; return true; }
  if (e.code === 'Tab' || (kbFocus && (e.code === 'Enter' || e.code === 'Space'))) return false;   /*coop16*/
  if (e.code === 'Backspace') { NET.codeInput = NET.codeInput.slice(0, -1); return true; }
  if (e.code === 'Enter' && NET.codeInput && !e.repeat && !NET.role) { netJoinLobby(NET.codeInput, NET.pick || 'Internet'); return true; }
  if (/^[0-9]$/.test(e.key) && NET.codeInput.length < 24) { NET.codeInput += e.key; kbFocus = false; return true; }
  if ((e.ctrlKey || e.metaKey) && e.code === 'KeyV') { netPaste(); return true; }
  return true;
}
function netPaste() {
  if (navigator.clipboard && navigator.clipboard.readText) navigator.clipboard.readText().then(t => { NET.codeInput = String(t).replace(/\D/g, '').slice(0, 24); }).catch(() => { NET.err = 'Couldn\'t read the clipboard. Type the code instead.'; });
}
function netCopy() {
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(NET.code).then(() => { NET.copied = performance.now(); }).catch(() => {});
}
function drawOnline(now) {
  const cx = VW / 2, maxW = Math.min(640, VW - 30);
  if (!NET.pick) NET.pick = 'Internet';
  ctx.textAlign = 'center'; ctx.fillStyle = '#ff7a1a'; fitFont('🌐 ONLINE VERSUS / CO-OP', 900, 34, VW - 24); ctx.fillText('🌐 ONLINE VERSUS / CO-OP', cx, Math.max(56, VH * 0.1));
  let y = Math.max(86, VH * 0.1 + 30);
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillStyle = '#9be564';
  const sline = NET.pick === 'Internet' ? 'Internet: play with a friend on another computer. Both of you open the game link, one hosts, the other types the 6-digit code.'
    : 'Local: two windows of the game in this same browser (testing, or one PC with two screens).';
  y = wrapText(sline, cx, y, maxW, 19) + 26;
  y = buttonGrid([
    { label: '🌍 Internet', fn: () => { NET.pick = 'Internet'; }, hi: NET.pick === 'Internet', enabled: !NET.role },
    { label: 'Local (2 windows)', fn: () => { NET.pick = 'Local'; }, hi: NET.pick === 'Local', enabled: !NET.role },
  ], y, 190, 32, 8) + 22;
  if (!NET.role) {
    ctx.fillStyle = '#e8e8e8'; ctx.font = 'bold 15px system-ui, sans-serif'; ctx.fillText('HOST A GAME (you are Dale)', cx, y + 4); y += 16;
    y = buttonGrid([
      { label: '🤝 Host Co-op', fn: () => netHostLobby('coop', NET.pick), hi: true },
      { label: '🆚 Host Versus', fn: () => netHostLobby('versus', NET.pick), hi: true },
    ], y, 200, 40) + 10;
    ctx.fillStyle = '#e8e8e8'; ctx.font = 'bold 15px system-ui, sans-serif'; ctx.fillText('JOIN A FRIEND (you are P2)', cx, y + 4); y += 16;
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; roundRect(ctx, cx - 170, y, 340, 38, 8); ctx.fill();
    ctx.fillStyle = NET.codeInput ? '#ffd166' : '#777'; ctx.font = 'bold 18px ui-monospace, monospace';
    ctx.fillText(NET.codeInput || 'type the lobby code', cx, y + 25 + (Math.floor(now / 500) % 2 && NET.codeInput ? 0 : 0));
    y += 48;
    y = buttonGrid([
      { label: '📋 Paste code', fn: () => netPaste() },
      { label: '▶ Join', fn: () => netJoinLobby(NET.codeInput, NET.pick), hi: !!NET.codeInput, enabled: !!NET.codeInput },
    ], y, 170, 36) + 6;
    ctx.fillStyle = '#999'; ctx.font = '12px system-ui, sans-serif';
    y = wrapText(NET.pick === 'Internet'
      ? 'Host, then text your friend the 6-digit code. They pick Internet, type the code and press Join. You both need the same version of the game (the play link is always the newest).'
      : 'Local test: open the game in a second window or tab of this browser, host in one and join with the code in the other.', cx, y + 8, maxW, 17);
  } else {
    ctx.fillStyle = '#e8e8e8'; ctx.font = '15px system-ui, sans-serif';
    y = wrapText(NET.status, cx, y + 6, maxW, 20) + 16;
    if (NET.role === 'host' && NET.code) {
      ctx.fillStyle = '#aaa'; ctx.font = '13px system-ui, sans-serif'; ctx.fillText('Lobby code', cx, y); y += 26;
      ctx.fillStyle = '#ffd166'; ctx.font = `bold ${NET.code.length > 10 ? 22 : 34}px ui-monospace, monospace`; ctx.fillText(NET.code, cx, y + 6); y += 26;
      y = buttonGrid([
        { label: NET.copied && now - NET.copied < 1500 ? '✓ Copied' : '📋 Copy code', fn: () => netCopy() },
      ], y + 6, 210, 36) + 4;
    }
    if (NET.role === 'client' && !NET.live && NET.joinAt && now - NET.joinAt > 20000) { netLeave(true); state = 'online'; NET.err = 'Nobody answered that code. Check it with the host, and make sure you both picked the same connection (Internet or Local).'; }   /*flow16*/
    if (NET.role === 'client' && NET.helloAt && now - NET.helloAt > 4000 && !NET.live) {
      netSend({ t: 'hello', name: (NET.backend && NET.backend.user) || 'Player 2', v: VERSION }); NET.helloAt = now;
    }
    y = buttonGrid([{ label: '✖ Leave lobby', fn: () => { netLeave(true); state = 'online'; } }], y + 6, 200, 36);
  }
  if (NET.err) { ctx.fillStyle = '#ff6b6b'; ctx.font = 'bold 14px system-ui, sans-serif'; wrapText(NET.err, cx, y + 18, maxW, 19); }
  buttonGrid([{ label: '◀ Back', fn: () => { netLeave(true); state = 'title'; } }], Math.max(VH - 56, y + 40), 160, 36);
}
// Shown on the client while the host is somewhere P2 can't see (cutscene, Steve's van, Earl's shop, court).
function drawNetWait(now) {
  const cx = VW / 2, why = { story: 'Dale is watching a cutscene', steve: 'Dale is selling meat at Steve\'s van', shop: 'Dale is shopping at Earl\'s Bait & Tackle', court: 'Dale is in court', title: 'The host is on the title screen', settings: 'The host is in Settings' }[NET.hostState] || 'The host is busy';
  ctx.textAlign = 'center'; ctx.fillStyle = '#ffd166'; fitFont('⏳ ' + why, 'bold', 24, VW - 24); ctx.fillText('⏳ ' + why, cx, VH * 0.42);
  ctx.fillStyle = '#bbb'; ctx.font = '15px system-ui, sans-serif';
  ctx.fillText('The game picks up again on its own.', cx, VH * 0.42 + 34);
  ctx.fillStyle = '#888'; ctx.font = '13px system-ui, sans-serif'; ctx.fillText('Esc leaves the match', cx, VH * 0.42 + 62);
}
// A small status strip during online matches.
function netDrawOverlay(now) {
  NET.leaveBtn = null;
  if (!NET.live) return;
  if (NET.role === 'client' && touchMode) {
    const b = NET.leaveBtn = { x: VW - 92, y: 10, w: 80, h: 30 };
    ctx.save(); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.fillStyle = 'rgba(120,30,30,0.85)'; roundRect(ctx, b.x, b.y, b.w, b.h, 8); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('✖ Leave', b.x + b.w / 2, b.y + 20);
    ctx.restore();
  }
  ctx.save();
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const late = NET.role === 'client' && now - NET.lastSnapAt > 1500;
  const txt = NET.role === 'host'
    ? `🌐 ${NET.backend ? NET.backend.name : ''} · P2: ${NET.peer}`
    : `🌐 You are ${campaign && campaign.coop ? 'Tyler' : 'Linda\'s cart'} · WASD/arrows move · ${campaign && campaign.coop ? 'Shift sneak · Enter grab/drop, or deliver at the shed' : 'Enter spotlight'} · Esc leave${late ? ' · ⚠ waiting for host…' : ''}${NET.worldOk ? '' : ' · ⚠ map mismatch'}`;
  ctx.font = 'bold 12px system-ui, sans-serif';
  const w = Math.min(VW - 16, ctx.measureText(txt).width + 20);
  ctx.fillStyle = late ? 'rgba(120,30,30,0.85)' : 'rgba(10,14,20,0.75)';
  roundRect(ctx, VW / 2 - w / 2, VH - 30, w, 22, 6); ctx.fill();
  ctx.fillStyle = late ? '#ffd0d0' : '#cfe8ff'; ctx.textAlign = 'center';
  ctx.fillText(fitText(txt, w - 12), VW / 2, VH - 15);
  ctx.restore();
}
// ?net=host-coop / host-versus / join-<code>: open straight into a lobby (handy for testing)
(function netFromUrl() {
  const q = new URLSearchParams(location.search).get('net');
  if (!q) return;
  const which = new URLSearchParams(location.search).get('via') === 'internet' ? 'Internet' : 'Local';
  setTimeout(() => {
    openOnline();
    NET.pick = which;
    if (q.startsWith('host-')) netHostLobby(q.slice(5), which);
    else if (q.startsWith('join-')) netJoinLobby(q.slice(5), which);
  }, 50);
})();
