'use strict';
// Screenshot gallery: renders key screens at phone and desktop sizes and saves them through the
// dev server's /__shot endpoint (node serve.js). Open http://localhost:8080/shots.html
(async function shots() {
  muted = true; previewMode = true;
  const STEP = 1 / 60;
  const setSize = (w, h) => { cv.style.width = w + 'px'; cv.style.height = h + 'px'; resize(); };
  const inGame = () => { newCampaign(); night = 3; startNight(); story = null; state = 'play'; for (let i = 0; i < 30; i++) update(STEP); };
  const list = [
    ['title', () => { state = 'title'; }],
    ['play', () => { inGame(); }],
    ['pause', () => { inGame(); state = 'pause'; }],
    ['steve', () => { inGame(); player.cooler = 3; openSteve(); }],
    ['results', () => { inGame(); G.delivered = G.quota; G.shots = 5; G.hits = 4; G.earned = 300; endNight('win'); story = null; state = 'nightdone'; }],
    ['shop', () => { inGame(); campaign.cash = 600; G.delivered = G.quota; endNight('win'); story = null; goShop(); }],
    ['trophies', () => { state = 'trophies'; }],
    ['whoswho', () => { state = 'whoswho'; }],
    ['story', () => { inGame(); playScene(SCENES[Object.keys(SCENES)[0]], () => {}); story.t = 99; }],
    ['online', () => { state = 'online'; }],
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
  document.getElementById('results').textContent = 'Saved ' + done.length + ' screenshots:\n' + done.join('\n');
  document.title = 'SHOTS DONE';
})();
