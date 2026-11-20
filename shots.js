'use strict';
// Screenshot gallery: renders key screens at phone and desktop sizes and saves them through the
// dev server's /__shot endpoint (node serve.js). Open http://localhost:8080/shots.html
(async function shots() {
  muted = true; previewMode = true;
  const keep = {}; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); keep[k] = localStorage.getItem(k); } } catch (e) { /* none */ }
  const STEP = 1 / 60;
  const setSize = (w, h) => { cv.style.width = w + 'px'; cv.style.height = h + 'px'; resize(); };
  const inGame = () => { newCampaign(); night = 3; startNight(); story = null; state = 'play'; for (let i = 0; i < 30; i++) update(STEP); };
  const list = [
    ['title', () => { state = 'title'; }],
    ['play', () => { inGame(); }],
    ['halloween', () => { startHalloween(); story = null; state = 'play'; const k = watchers.find(w => w.kids); player.x = k.x - 80; player.y = k.y + 40; for (let i = 0; i < 40; i++) { update(1 / 60); updateCam(1); } }],
    ['intro1', () => { localStorage.removeItem('hs_save'); newCampaign(); night = 1; startNight(); story = null; state = 'intro'; }],
    ['title-fresh', () => { localStorage.removeItem('hs_save'); state = 'title'; }],
    ['pause', () => { inGame(); state = 'pause'; }],
    ['steve', () => { inGame(); player.cooler = 3; openSteve(); }],
    ['results', () => { inGame(); G.delivered = G.quota; G.shots = 5; G.hits = 4; G.earned = 300; endNight('win'); story = null; state = 'nightdone'; }],
    ['shop', () => { inGame(); campaign.cash = 600; G.delivered = G.quota; endNight('win'); story = null; goShop(); }],
    ['trophies', () => { state = 'trophies'; }],
    ['whoswho', () => { state = 'whoswho'; }],
    ['story', () => { inGame(); playScene(SCENES[Object.keys(SCENES)[0]], () => {}); story.t = 99; }],
    ['online', () => { state = 'online'; }],
    ['crypt', () => { localStorage.setItem('hs_cards', '[0,1,3,4,8,11,12]'); localStorage.setItem('hs_posters', '[0,3]'); state = 'crypt'; }],
    ['raven', () => { newCampaign(); night = 2; startNight(); story = null; state = 'play'; const r = G.goth.raven; player.x = r.x - 50; player.y = r.y + 10; G.goth.cards[0].x = r.x + 60; G.goth.cards[0].y = r.y + 40; for (let i = 0; i < 40; i++) { update(1 / 60); updateCam(1); } interact(); update(1 / 60); }],
    ['concert', () => { newCampaign(); night = 3; startNight(); story = null; state = 'play'; const r = G.goth.raven; G.goth.concert = { x: r.x, y: r.y + 60, t: 0, chordT: 0, beat: 0 }; player.x = r.x - 70; player.y = r.y + 30; for (let i = 0; i < 40; i++) { update(1 / 60); updateCam(1); } }],
  ];
  const sizes = (new URLSearchParams(location.search).get('sizes') || '390x844,1280x720').split(',').map(s => s.split('x').map(Number));
  const done = [];
  for (const [w, h] of sizes) {
    setSize(w, h);
    for (const [name, setup] of list) {
      try { setup(); render(performance.now()); render(performance.now() + 700); } catch (e) { done.push(name + ' ERROR ' + e.message); continue; }
      await fetch(`/__shot?name=shot-${name}-${w}x${h}`, { method: 'POST', body: cv.toDataURL() });
      done.push(`${name} ${w}x${h}`);
    }
  }
  restoreRandom(); state = 'title';
  try { localStorage.clear(); for (const k in keep) localStorage.setItem(k, keep[k]); } catch (e) { /* none */ }
  document.getElementById('results').textContent = 'Saved ' + done.length + ' screenshots:\n' + done.join('\n');
  document.title = 'SHOTS DONE';
})();
