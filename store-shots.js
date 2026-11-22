'use strict';
// Store images for the itch.io page: a 630x500 cover and five 1920x1080 screenshots, rendered live
// from the real game and saved into dist/store/ through the dev server (node serve.js).
// Open http://localhost:8080/store-shots.html
(async function storeShots() {
  previewMode = true; muted = false; settings.sfxVol = 0; settings.music = false; settings.hints = false;   // silent, but the HUD doesn't say (muted)
  frame = function () {};   // drive every frame ourselves
  const keep = {}; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); keep[k] = localStorage.getItem(k); } } catch (e) { /* none */ }
  const STEP = 1 / 60;
  const setSize = (w, h) => { cv.style.width = w + 'px'; cv.style.height = h + 'px'; resize(); };
  const settle = n => { for (let i = 0; i < n; i++) { update(STEP); updateCam(1); } };
  const night3 = () => { restoreRandom(); localStorage.removeItem('hs_save'); newCampaign(); night = 3; startNight(); story = null; state = 'play'; G.planShown = true; G.banner = null; G.time = G.NIGHT * 0.62; campaign.hints = new Proxy({}, { get: () => 1 }); };   // later in the night: lighter sky
  const nearDeer = () => {   // a grazing deer with open ground beside it; Dale crouched downwind
    for (const d of deer.filter(q => !q.dead && !q.legend)) for (const [ox, oy] of [[-130, 30], [130, 30], [0, 140], [0, -140]]) {
      const x = d.x + ox, y = d.y + oy;
      if (world.blocked(x, y, 20) || !los(x, y, d.x, d.y)) continue;
      player.x = x; player.y = y; player.crouch = true; keys.ShiftLeft = true; G.wind = Math.atan2(player.y - d.y, player.x - d.x); d.state = 'graze'; d.t = 99; return d;
    }
  };
  // copy the canvas into an exact-size PNG (the game canvas may be scaled for the screen's pixel ratio)
  async function save(name, w, h, overlay) {
    render(performance.now()); render(performance.now() + 700);
    const out = document.createElement('canvas'); out.width = w; out.height = h;
    const o = out.getContext('2d');
    o.drawImage(cv, 0, 0, w, h);
    if (overlay) overlay(o, w, h);
    await fetch(`/__shot?name=store-${name}`, { method: 'POST', body: out.toDataURL('image/png') });
    return name;
  }
  const shots = [
    ['screenshot-1-stalk', () => { night3(); nearDeer(); settle(40); aimBy = 'mouse'; const d = nearDeer(); if (d) { mouse.x = d.x - cam.x; mouse.y = d.y - cam.y; startDraw(); for (let i = 0; i < 40; i++) { d.state = 'graze'; update(STEP); updateCam(1); } mouse.x = d.x - cam.x; mouse.y = d.y - cam.y; } }],
    ['screenshot-2-cops', () => { night3(); const r = world.roads[0]; player.x = r.x + r.w / 2; player.y = world.hy[1] + 60; settle(10); callPolice(watchers[0]); G.policeT = 0.01; settle(90); const c = watchers.find(w => w.type === 'cop'); if (c) { player.x = c.x + 160; player.y = c.y + 40; } settle(20); }],
    ['screenshot-3-party', () => { restoreRandom(); newCampaign(); night = 5; startNight(); story = null; state = 'play'; G.planShown = true; G.banner = null; G.time = G.NIGHT * 0.62; campaign.hints = new Proxy({}, { get: () => 1 }); if (G.party) { player.x = G.party.x - 260; player.y = G.party.y + 170; } settle(60); }],
    ['screenshot-4-orders', () => { restoreRandom(); newCampaign(); night = 3; startNight(); story = null; state = 'intro'; }],
    ['screenshot-5-steve', () => { night3(); player.cooler = 3; openSteve(); }],
  ];
  const done = [];
  setSize(1920, 1080);
  for (const [name, setup] of shots) {
    try { setup(); done.push(await save(name, 1920, 1080)); } catch (e) { done.push(name + ' ERROR ' + e.message); }
    for (const k in keys) keys[k] = false;
  }
  // the cover: a night scene with the title over it
  setSize(1260, 1000);
  try {
    night3(); nearDeer(); settle(50);
    done.push(await save('cover-630x500', 630, 500, (o, w, h) => {
      const g = o.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(5,8,14,0.85)'); g.addColorStop(0.45, 'rgba(5,8,14,0.15)'); g.addColorStop(1, 'rgba(5,8,14,0.75)');
      o.fillStyle = g; o.fillRect(0, 0, w, h);
      o.textAlign = 'center';
      o.font = 'bold 74px system-ui, sans-serif'; o.lineWidth = 8; o.strokeStyle = '#1a0d04'; o.strokeText('CURFEW BUCK', w / 2, 104);
      o.fillStyle = '#ff7a1a'; o.fillText('CURFEW BUCK', w / 2, 104);
      o.font = 'bold 22px system-ui, sans-serif'; o.fillStyle = '#f4ead2'; o.fillText('The HOA says no hunting.', w / 2, 146); o.fillText('Dale says the deer are eating his hostas.', w / 2, 174);
      o.font = 'bold 20px system-ui, sans-serif'; o.fillStyle = '#9be564'; o.fillText('A comedy stealth game about deer, divorce and HOA bylaws', w / 2, h - 30);
    }));
  } catch (e) { done.push('cover ERROR ' + e.message); }
  restoreRandom(); state = 'title';
  try { localStorage.clear(); for (const k in keep) localStorage.setItem(k, keep[k]); } catch (e) { /* none */ }
  document.getElementById('results').textContent = 'Saved into dist/store/:\n' + done.join('\n');
  document.title = 'STORE DONE';
})();
