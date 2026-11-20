'use strict';
// Hunter Sub: Startup and the main loop.
// Part 8 of 8. All parts share one global scope, so load them in order (see index.html).
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
