'use strict';
// Hunter Sub trailer: a scripted ~60-second sequence played live in the real game engine,
// with title cards. Open trailer.html, press Play (or Record to save a .webm video).
(function trailer() {
  const SHOTS = [];
  const shot = (dur, card, setup, tick) => SHOTS.push({ dur, card, setup, tick });
  const playNight = (n, map) => {
    restoreRandom(); campaign = freshCampaign(); if (map) campaign.map = map;
    campaign.seen = Object.fromEntries(Object.keys(SCENES).map(k => [k, true]));
    night = n; startNight(); story = null; state = 'play'; G.banner = null; G.tut = null;
    campaign.hints = Object.fromEntries(['start', 'cone', 'flood', 'mom', 'cat', 'spotted', 'drag', 'freezer', 'wound', 'snow', 'tags', 'carving'].map(k => [k, 1]));
  };
  const clearKeys = () => { for (const k in keys) keys[k] = false; };
  const nearestDeer = () => deer.filter(d => !d.dead).sort((a, b) => dist(a.x, a.y, player.x, player.y) - dist(b.x, b.y, player.x, player.y))[0];
  const walkTo = (x, y, sneak) => {
    clearKeys(); keys.ShiftLeft = !!sneak;
    const dx = x - player.x, dy = y - player.y;
    if (Math.abs(dx) > 12) keys[dx > 0 ? 'KeyD' : 'KeyA'] = true;
    if (Math.abs(dy) > 12) keys[dy > 0 ? 'KeyS' : 'KeyW'] = true;
  };

  shot(4, ['IN THE SUBURBS,', 'DEER SEASON NEVER ENDS.'], () => { restoreRandom(); campaign = freshCampaign(); state = 'title'; });
  shot(7, ['Meet Dale.', 'Divorced. Living in the shed. Still hunting.'], () => {
    playNight(1); const d = nearestDeer(); d.x = player.x + 260; d.y = player.y + 40; d.state = 'graze'; d.t = 99;
  }, t => { const d = nearestDeer(); if (!d) return; if (dist(d.x, d.y, player.x, player.y) > 170) walkTo(d.x - 150, d.y, true); else { clearKeys(); mouse.x = VW / 2 + (d.x - player.x); mouse.y = VH / 2 + (d.y - player.y); if (t < 5.2) { if (!player.drawing) startDraw(); } else if (player.drawing) releaseDraw(); } });
  shot(6, ['Avoid the HOA.'], () => {
    playNight(3); const w = watchers.find(q => q.type === 'hoa'); player.x = w.x + 160; player.y = w.y - 110;
  }, () => { clearKeys(); });
  shot(6, ['Avoid your ex-wife.'], () => {
    playNight(2); const w = watchers.find(q => q.type === 'ex'); player.x = w.x + 90; player.y = w.y + 20;
  }, t => { if (t < 2) walkTo(player.x - 40, player.y, false); else clearKeys(); });
  shot(6, ['If she calls the cops...'], () => {
    playNight(3); G.sus = 100; callPolice(watchers.find(q => q.type === 'ex'));
  }, t => walkTo(world.shed.x + 50, world.shed.y + 120, false));
  shot(5, ['...hide in an inflatable Santa.'], () => {
    playNight(6); const b = world.bushes.find(q => q.santa); player.x = b.x - 120; player.y = b.y;
  }, () => { const b = world.bushes.find(q => q.santa); walkTo(b.x, b.y, true); });
  shot(5, ['Sell the meat to Sketchy Steve.'], () => {
    playNight(2); player.x = world.van.x - 60; player.y = world.van.y + 30; G.freezer = 6; player.cooler = 6;
  }, () => clearKeys());
  shot(5, ['Cul-de-sacs.'], () => playNight(3, 'cul'), () => walkTo(world.bulbs[0].x, world.bulbs[0].y + 260, false));
  shot(5, ['Country clubs.'], () => playNight(2, 'golf'), () => walkTo(world.vx[1], world.hy[0] - 200, true));
  shot(5, ['Build your own neighborhood.'], () => { playNight(3); G.mapOpen = true; }, () => clearKeys());
  shot(6, ['Bring a friend.', 'Co-op and versus, one keyboard.'], () => { restoreRandom(); startTwoPlayer('versus'); story = null; state = 'play'; G.banner = null; }, t => { clearKeys(); keys.ArrowRight = t < 3; keys.ArrowUp = t >= 3; });
  shot(5, ['HUNTER SUB', 'Free to play in your browser'], () => { clearKeys(); restoreRandom(); campaign = freshCampaign(); state = 'title'; });

  let cur = -1, t = 0, playing = false, onDone = null;
  const total = SHOTS.reduce((a, s) => a + s.dur, 0);
  let savedHints = null;
  function start(done) { savedHints = settings.hints; settings.hints = false; cur = -1; t = 0; playing = true; onDone = done; next(); }
  function next() {
    cur++; t = 0;
    if (G) G.mapOpen = false;
    if (cur >= SHOTS.length) { playing = false; clearKeys(); if (savedHints !== null) settings.hints = savedHints; if (onDone) onDone(); return; }
    try { SHOTS[cur].setup(); } catch (e) { console.warn('trailer shot', cur, e); }
  }
  const origUpdate = update;
  update = function (dt) {
    if (playing) {
      t += dt;
      try { if (SHOTS[cur].tick && state === 'play') SHOTS[cur].tick(t); } catch (e) { /* keep rolling */ }
      if (state !== 'play' && state !== 'title') state = 'play';
      if (t >= SHOTS[cur].dur) next();
    }
    origUpdate(dt);
  };
  const origRender = render;
  render = function (now) {
    origRender(now);
    if (!playing || cur < 0 || cur >= SHOTS.length) return;
    const s = SHOTS[cur], a = Math.min(1, t / 0.4, (s.dur - t) / 0.4);
    if (!s.card) return;
    const big = cur === SHOTS.length - 1 || cur === 0;
    ctx.save(); ctx.globalAlpha = Math.max(0, a);
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, big ? 0 : VH - 130, VW, big ? VH : 130);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff7a1a'; ctx.font = `900 ${big ? Math.min(72, VW / 10) : Math.min(40, VW / 18)}px system-ui, sans-serif`;
    ctx.fillText(s.card[0], VW / 2, big ? VH * 0.45 : VH - 72);
    if (s.card[1]) { ctx.fillStyle = '#f2ead0'; ctx.font = `600 ${big ? 26 : 20}px system-ui, sans-serif`; ctx.fillText(s.card[1], VW / 2, big ? VH * 0.45 + 50 : VH - 36); }
    ctx.restore();
    // progress bar
    const done = SHOTS.slice(0, cur).reduce((x, q) => x + q.dur, 0) + t;
    ctx.fillStyle = 'rgba(255,122,26,0.8)'; ctx.fillRect(0, VH - 3, VW * done / total, 3);
  };

  // Controls
  const bar = document.getElementById('trailer-bar');
  const btn = (label, fn) => { const b = document.createElement('button'); b.textContent = label; b.onclick = fn; bar.appendChild(b); return b; };
  btn('▶ Play trailer', () => { unlockAudio && unlockAudio(); start(); });
  btn('● Record .webm', () => {
    if (!cv.captureStream || typeof MediaRecorder === 'undefined') { alert('This browser can\'t record the canvas. Use a screen recorder instead.'); return; }
    const stream = cv.captureStream(30);
    const rec = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm' });
    const chunks = [];
    rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    rec.onstop = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(chunks, { type: 'video/webm' })); a.download = 'hunter-sub-trailer.webm'; a.click(); };
    rec.start(250);
    start(() => setTimeout(() => rec.stop(), 300));
  });
  const info = document.createElement('span'); info.textContent = ` ${SHOTS.length} shots · ${total}s`; bar.appendChild(info);
  window.hunterTrailer = { start, SHOTS, get playing() { return playing; }, get shot() { return cur; } };
  if (new URLSearchParams(location.search).get('autoplay') === '1') setTimeout(() => start(), 500);
})();
