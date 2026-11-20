'use strict';
// Hunter Sub bug hunter: plays every mode with random input, draws every screen at phone and
// desktop sizes, and reports crashes, NaN/out-of-bounds positions and text that runs off screen.
// Open http://localhost:8080/bughunt.html (add ?secs=40 for longer fuzz runs).
(function bugHunt() {
  const qs = new URLSearchParams(location.search);
  const SECS = +qs.get('secs') || 20;
  const STEP = 1 / 60;
  const issues = new Map();   // key -> { kind, where, detail, count }
  const note = (kind, where, detail) => {
    const k = kind + '|' + where + '|' + detail;
    const e = issues.get(k); if (e) e.count++; else issues.set(k, { kind, where, detail, count: 1 });
  };
  const saved = {};
  try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); saved[k] = localStorage.getItem(k); } } catch (e) { /* none */ }
  muted = true;
  let where = 'boot';
  let vert = [];   // vertical overflow only counts if the screen can't scroll to it
  const flushVert = () => { if (!(menuMax > 0 && state !== 'play')) vert.forEach(f => f()); vert = []; };

  // ---- text overflow detector: screen-space text must fit inside the canvas
  const realFill = CanvasRenderingContext2D.prototype.fillText;
  let checkText = false;
  CanvasRenderingContext2D.prototype.fillText = function (txt, x, y, maxW) {
    if (checkText && this === ctx && txt && String(txt).trim()) {
      const m = this.getTransform();
      if (Math.abs(m.e) < 0.5 && Math.abs(m.b) < 0.001 && Math.abs(m.a - DPR) < 0.01) {
        const sx = m.a / DPR;
        let w = this.measureText(txt).width * sx; if (maxW) w = Math.min(w, maxW * sx);
        const X = x * sx, Y = y * (m.d / DPR) + m.f / DPR;
        const a = this.textAlign;
        const left = a === 'center' ? X - w / 2 : (a === 'right' || a === 'end') ? X - w : X;
        if (left < -2 || left + w > VW + 2) note('text off screen', where, `"${String(txt).slice(0, 60)}" (${Math.round(left)}..${Math.round(left + w)} of ${VW})`);
        if (Y < 4 || Y > VH + 2) vert.push(() => note('text off screen (vertical)', where, `"${String(txt).slice(0, 60)}" y=${Math.round(Y)} of ${VH}`));
      }
    }
    return realFill.apply(this, arguments);
  };

  function setSize(w, h) { cv.style.width = w + 'px'; cv.style.height = h + 'px'; resize(); }
  function safe(label, fn) { try { fn(); } catch (e) { note('crash', label, (e && e.message || e) + ' @ ' + String(e && e.stack || '').split('\n')[1]); } }
  const bad = v => typeof v !== 'number' || !isFinite(v);
  function checkWorld(label) {
    if (!G || !player) return;
    if (bad(player.x) || bad(player.y)) note('NaN', label, 'player position');
    if (player.x < -50 || player.y < -50 || player.x > W + 50 || player.y > H + 50) note('out of bounds', label, `player at ${Math.round(player.x)},${Math.round(player.y)}`);
    for (const d of deer) if (bad(d.x) || bad(d.y)) { note('NaN', label, 'deer position'); break; }
    for (const d of deer) if (!d.carried && (d.x < -400 || d.y < -400 || d.x > W + 400 || d.y > H + 400)) { note('out of bounds', label, 'deer far off map'); break; }
    for (const w of watchers) if (bad(w.x) || bad(w.y)) { note('NaN', label, 'watcher ' + (w.label || w.type)); break; }
    if (tyler && (bad(tyler.x) || bad(tyler.y))) note('NaN', label, 'Tyler position');
    for (const k of ['sus', 'time', 'delivered', 'earned', 'shots', 'hits']) if (G[k] !== undefined && bad(G[k])) note('NaN', label, 'G.' + k);
    if (G.sus < -0.01 || G.sus > 100.01) note('range', label, 'suspicion ' + G.sus);
    if (campaign && bad(campaign.cash || 0)) note('NaN', label, 'campaign.cash');
    if ((campaign && campaign.cash) < 0) note('range', label, 'negative cash ' + campaign.cash);
    if (player.arrows < 0) note('range', label, 'negative arrows');
    if (particles.length > 4000 || popups.length > 400) note('leak', label, `particles ${particles.length}, popups ${popups.length}`);
    if (G.delivered > 60) note('range', label, 'delivered ' + G.delivered);
  }

  // ---- random input
  const KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'Space', 'KeyE', 'KeyF', 'KeyG', 'KeyV', 'KeyB', 'KeyN', 'KeyJ', 'KeyT', 'KeyX', 'KeyR', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftRight', 'Enter', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'];
  const down = new Set();
  const key = (code, type) => window.dispatchEvent(new KeyboardEvent(type, { code, key: code.replace(/^Key|^Digit/, ''), bubbles: true }));
  const R = mulberry32(777);
  function fuzzStep(label, allowQuit) {
    if (R() < 0.25) {
      const c = KEYS[Math.floor(R() * KEYS.length)];
      if (down.has(c)) { key(c, 'keyup'); down.delete(c); } else { key(c, 'keydown'); down.add(c); }
    }
    if (allowQuit && R() < 0.002) key('KeyQ', 'keydown');
    if (R() < 0.02) {
      const x = R() * VW, y = R() * VH;
      cv.dispatchEvent(new MouseEvent('mousemove', { clientX: x, clientY: y, bubbles: true }));
      if (state === 'play') {
        cv.dispatchEvent(new MouseEvent('mousedown', { clientX: x, clientY: y, button: 0, bubbles: true }));
        window.dispatchEvent(new MouseEvent('mouseup', { clientX: x, clientY: y, button: 0, bubbles: true }));
      }
    }
    // the player always drifts toward deer so the game actually happens
    if (R() < 0.01 && state === 'play') { const d = deer.find(q => !q.dead); if (d && R() < 0.3) { player.x += (d.x - player.x) * 0.3; player.y += (d.y - player.y) * 0.3; if (world.blocked(player.x, player.y, 14)) { player.x -= (d.x - player.x) * 0.3; player.y -= (d.y - player.y) * 0.3; } } }
  }
  function releaseAll() { for (const c of down) key(c, 'keyup'); down.clear(); for (const k in keys) keys[k] = false; }
  // camera exactly at the map corner looks like screen space to the detector: nudge it a pixel
  function frame(label) { safe(label + ' update', () => update(STEP)); if (Math.abs(cam.x) < 1) cam.x = cam.x < 0 ? -1 : 1; if (Math.abs(cam.y) < 1) cam.y = cam.y < 0 ? -1 : 1; safe(label + ' render', () => render(performance.now())); }

  function play(label, setup, secs = SECS) {
    where = label;
    safe(label + ' setup', setup);
    story = null;
    if (state === 'story' || state === 'intro') state = 'play';
    const frames = secs * 60;
    for (let i = 0; i < frames; i++) {
      if (state === 'story') { safe('story', () => advanceStory(true)); }
      if (state === 'intro') state = 'play';
      if (state === 'steve' && R() < 0.05) safe('steve', () => { const r = R(); if (r < 0.3) steveSell(); else if (r < 0.5) steveBuy('beer'); else if (r < 0.6) steveHaggle(); else state = 'play'; });
      if (state === 'pause') state = 'play';
      if (state !== 'play') break;
      fuzzStep(label, i > frames * 0.8);
      frame(label);
      if (i % 30 === 0) checkWorld(label);
    }
    releaseAll();
    // whatever screen the night ended on gets drawn too
    checkText = true; safe(label + ' end screen', () => render(performance.now())); flushVert(); checkText = false;
    if (state === 'nightdone') { safe(label + ' shop', () => { goShop(); render(performance.now()); }); }
  }

  const t0 = performance.now();
  setSize(1280, 720);
  // ---- 1. every mode, fuzzed
  const modes = [
    ['Night 1', () => { newCampaign(); night = 1; startNight(); }],
    ['Night 2', () => { newCampaign(); night = 2; startNight(); }],
    ['Night 3', () => { newCampaign(); night = 3; startNight(); }],
    ['Night 4', () => { newCampaign(); night = 4; startNight(); }],
    ['Night 5', () => { newCampaign(); night = 5; startNight(); }],
    ['Endless 7', () => { newCampaign(); night = 7; startNight(); }],
    ['Endless 10', () => { newCampaign(); night = 10; startNight(); }],
    ['Daily Hunt', () => startDaily()],
    ['Country Club', () => startGolf()],
    ['Cul-de-sac', () => startMapMode('cul')],
    ['Random map', () => startMapMode('random')],
    ['Halloween', () => startHalloween()],
    ['Versus', () => startTwoPlayer('versus')],
    ['Co-op', () => startTwoPlayer('coop')],
    ['Hard night 3', () => { settings.difficulty = 'hard'; newCampaign(); night = 3; startNight(); }],
    ['Easy night 3', () => { settings.difficulty = 'easy'; newCampaign(); night = 3; startNight(); }],
  ];
  for (const [label, setup] of modes) { play(label, setup); settings.difficulty = 'normal'; }
  safe('custom map', () => {
    const xhr = new XMLHttpRequest(); xhr.open('GET', 'maps/hosta-hills.json', false); xhr.send();
    const spec = JSON.parse(xhr.responseText);
    play('Custom map (Hosta Hills)', () => startCustomMap(spec));
  });
  // police chase and arrest flow
  play('Police chase', () => { newCampaign(); night = 3; startNight(); story = null; state = 'play'; callPolice(watchers[0]); }, 15);

  // ---- 2. every screen at every size
  const SIZES = [[360, 640], [390, 844], [768, 1024], [1280, 720], [1920, 1080], [844, 390]];
  function screen(label, setup) {
    for (const [w, h] of SIZES) {
      setSize(w, h);
      where = `${label} @ ${w}x${h}`;
      safe(where + ' setup', setup);
      checkText = true;
      safe(where, () => { render(performance.now()); render(performance.now() + 600); });
      flushVert();
      if (menuMax > 0) { safe(where + ' scrolled', () => { scrollMenu(1e6); render(performance.now()); render(performance.now() + 600); }); vert = []; scrollMenu(-1e6); }
      checkText = false;
    }
  }
  const inGame = () => { newCampaign(); night = 3; startNight(); story = null; state = 'play'; update(STEP); };
  screen('Title (no save)', () => { localStorage.removeItem('hs_save'); state = 'title'; });
  screen('Title (with save)', () => { inGame(); saveGame(); state = 'title'; });
  for (const s of ['settings', 'keys', 'scores', 'online', 'whoswho', 'nights', 'trophies', 'credits', 'crypt', 'modes', 'players', 'extras']) screen('Menu: ' + s, () => { state = s; });
  screen('Intro', () => { inGame(); state = 'intro'; });
  screen('Play HUD night 3', () => { inGame(); });
  screen('Play HUD versus', () => { startTwoPlayer('versus'); story = null; state = 'play'; update(STEP); });
  screen('Play HUD co-op', () => { startTwoPlayer('coop'); story = null; state = 'play'; update(STEP); });
  screen('Play HUD police', () => { inGame(); callPolice(watchers[0]); update(STEP); });
  screen('Play map open', () => { inGame(); G.mapOpen = true; });
  screen('Pause', () => { inGame(); state = 'pause'; });
  screen('Steve', () => { inGame(); player.cooler = 3; openSteve(); });
  screen('Night results (win)', () => { inGame(); G.delivered = G.quota; G.shots = 5; G.hits = 4; G.earned = 300; endNight('win'); story = null; if (state === 'story') state = 'nightdone'; });
  screen('Night results (sunrise)', () => { inGame(); endNight('sunrise'); story = null; if (state === 'story') state = 'nightdone'; });
  screen('Shop', () => { inGame(); campaign.cash = 900; G.delivered = G.quota; endNight('win'); story = null; goShop(); });
  screen('Court', () => { inGame(); G.court = null; state = 'court'; });
  screen('Game over', () => { inGame(); night = 5; endNight('arrested'); story = null; state = 'over'; });
  for (const k of Object.keys(SCENES)) screen('Story: ' + k, () => { inGame(); playScene(SCENES[k], () => {}); story.i = SCENES[k].length - 1; story.t = 99; });

  // ---- report
  setSize(window.innerWidth, window.innerHeight);
  restoreRandom(); settings.difficulty = 'normal';
  try { localStorage.clear(); for (const k in saved) localStorage.setItem(k, saved[k]); } catch (e) { /* none */ }
  state = 'title';
  const list = [...issues.values()].sort((a, b) => (a.kind === 'crash' ? -1 : 0) - (b.kind === 'crash' ? -1 : 0));
  const out = document.getElementById('results');
  out.textContent = `Hunter Sub bug hunt: ${list.length} issues (${list.filter(i => i.kind === 'crash').length} crashes) in ${((performance.now() - t0) / 1000).toFixed(1)}s\n\n` +
    list.map(i => `[${i.kind}] ${i.where}: ${i.detail}${i.count > 1 ? '  (x' + i.count + ')' : ''}`).join('\n');
  document.title = 'BUGHUNT ' + list.length;
})();
