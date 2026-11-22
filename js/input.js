'use strict';
// Curfew Buck: Keyboard, gamepad and touch input.
// Part 3 of 10. All parts share one global scope, so load them in order (see index.html).
// ============================================================
// Input
// ============================================================
window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
  if (e.code === 'KeyM') { muted = !muted; store.set('hs_muted', muted); }
  if (state !== 'play' && menuMax > 0 && !netClient()) {
    const step = { ArrowDown: 60, ArrowUp: -60, PageDown: VH * 0.8, PageUp: -VH * 0.8, End: 1e6, Home: -1e6 }[e.code];
    if (step) { scrollMenu(step); e.preventDefault(); return; }
  }
  if (netOnlineKey(e) || netClientKey(e)) return;
  if (kbMenuKey(e)) return;   /*kbfocus*/
  if (!twoP() && state === 'play' && e.code.startsWith('Arrow')) aimBy = 'keys';
  if (e.repeat) return;
  if (state === 'story') { if (e.code === 'Escape') advanceStory(true); else if (['Enter', 'Space', 'KeyE'].includes(e.code)) advanceStory(); return; }
  if (state === 'steve') {
    if (e.code === 'Digit1') steveSell(); else if (e.code === 'Digit2') steveBuy('beer');
    else if (e.code === 'Digit3') steveBuy('arrows'); else if (e.code === 'Digit4') steveBuy('cones');
    else if (e.code === 'Digit5') steveHaggle();
    else if (['Escape', 'KeyE', 'Enter', 'Digit6'].includes(e.code)) state = 'play';
    return;
  }
  if (state === 'court' && G.court && ['Enter', 'Space'].includes(e.code) && !e.repeat) { finishCourt(); return; }
  if (state === 'court' && !G.court) { if (e.code === 'Digit1') courtPlea(0); if (e.code === 'Digit2') courtPlea(1); if (e.code === 'Digit3') courtPlea(2); }
  if (state === 'play' && e.code === 'KeyV') drinkBeer();
  if (state === 'play' && e.code === 'Tab') G.mapOpen = !G.mapOpen;
  // photo mode
  if (state === 'photo') {
    if (e.code === 'KeyH' || e.code === 'Escape') state = 'play';
    else if (e.code === 'Enter') savePhoto();
    return;
  }
  if (state === 'play' && e.code === 'KeyH' && !netLive()) { player.drawing = false; state = 'photo'; unlock('photo'); return; }
  if ((['whoswho', 'nights', 'trophies', 'credits', 'settings', 'scores', 'crypt'].includes(state)) && (e.code === 'Escape' || e.code === 'Enter' || e.code === 'Space')) state = ['nights', 'whoswho', 'trophies', 'credits'].includes(state) ? 'extras' : 'title';
  else if (['modes', 'players', 'extras', 'custom'].includes(state) && e.code === 'Escape') state = state === 'custom' ? 'modes' : 'title';
  else if (state === 'title' && ['KeyK', 'KeyO', 'KeyI'].includes(e.code)) {
    titleEgg = (titleEgg + e.code.slice(3)).slice(-3);
    if (titleEgg === 'KOI') { titleEgg = ''; toasts.push({ title: 'HOA AQUATICS AUDIT', desc: 'One koi is listed as a gazebo.', t: 4 }); sfx.grab(); }
  }
  else if (state === 'title' && (e.code === 'Enter' || e.code === 'Space')) { if (!loadGame()) newCampaign(); }
  else if (state === 'intro' && (e.code === 'Enter' || e.code === 'Space')) state = 'play';
  else if (state === 'seasondone' && (e.code === 'Enter' || e.code === 'Space')) startEndless();   /*r2*/
  else if (state === 'play') {
    if (e.code === 'KeyE') interact();
    if ((e.code === 'Enter' || e.code === 'NumpadEnter') && twoP() && !netHost()) p2Action();
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
    if (e.code === 'KeyR') restartNight();
  }
  else if (state === 'nightdone' && (e.code === 'Enter' || e.code === 'Space')) goShop();
  else if (state === 'shop') {
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= SHOP.length) buy(SHOP[n - 1]);
    if (e.code === 'Enter' || e.code === 'Space') { night++; startNight(); }
  }
  else if (state === 'over' && (e.code === 'Enter' || e.code === 'KeyR') && !seasonChoice()) overNext();   /*flow16*/
});
window.addEventListener('keyup', e => {
  keys[e.code] = false;
  if (e.code === 'Space' && state === 'play' && !netClient()) releaseDraw();
});
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play' && !netLive()) { player.drawing = false; state = 'pause'; stopGameplaySounds(); } });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; touch.mx = touch.my = 0; if (netClient()) { NET.lastIn = ''; NET.inT = 0; } if (state === 'play' && !netLive()) { player.drawing = false; state = 'pause'; stopGameplaySounds(); } });
cv.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; aimBy = 'mouse'; kbFocus = false; });
cv.addEventListener('mousedown', e => {
  mouse.x = e.clientX; mouse.y = e.clientY;
  if (state === 'play' && e.button === 2) { throwCone(); return; }
  if (netClient()) { if (e.button === 0 && state === 'play') NET.action++; return; }
  if (e.button !== 0) return;
  for (const b of uiButtons) {
    if (mouse.x >= b.x && mouse.x <= b.x + b.w && mouse.y >= b.y && mouse.y <= b.y + b.h) { b.fn(); return; }
  }
  if (state === 'story') advanceStory();
  else if (state === 'steve') { /* buttons only */ }
  else if (state === 'title') { if (!readSave()) newCampaign(); }
  else if (['whoswho', 'nights', 'trophies', 'credits', 'settings', 'scores'].includes(state)) state = ['nights', 'whoswho', 'trophies', 'credits'].includes(state) ? 'extras' : 'title';
  else if (state === 'intro') state = 'play';
  else if (state === 'play') startDraw();
  else if (state === 'pause') state = 'play';
  else if (state === 'nightdone') goShop();
  else if (state === 'over' && !seasonChoice()) overNext();
});
window.addEventListener('mouseup', e => { if (e.button === 0 && state === 'play' && !netClient()) releaseDraw(); });
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('wheel', e => { if (state !== 'play' && menuMax > 0) { e.preventDefault(); scrollMenu(e.deltaY); } }, { passive: false });

// ============================================================
// Gamepad (standard mapping: Xbox / PlayStation style)
// ============================================================
const pad = { connected: false, prev: [], mx: 0, my: 0, aim: null, crouch: false, draw: false };
let shopSel = 0, titleEgg = '';
// Aiming follows whichever device was used last, so an idle controller can't steal the mouse or touch aim
let aimBy = 'mouse';
// Gamepad menu focus: the D-pad moves between the buttons on any menu screen, A presses the focused one
// After results: one-night modes return to the title (your saved season is untouched); a lost season starts over
function overNext() { if (oneNightMode()) { restoreRandom(); campaign = freshCampaign(); state = 'title'; } else newCampaign(); }
let padFocus = -1, padFocusState = null, kbFocus = false;
// Keyboard menu focus: Tab / Shift+Tab move between a screen's buttons, Enter or Space presses the focused one
function kbMenuKey(e) {
  if (['play', 'story', 'keys', 'photo', 'steve'].includes(state) || netClient()) return false;
  if (state !== padFocusState) { padFocus = -1; padFocusState = state; kbFocus = false; }
  if (e.code === 'Tab' && uiButtons.length) {
    const n = uiButtons.length;
    padFocus = padFocus < 0 || !uiButtons[padFocus] ? (e.shiftKey ? n - 1 : 0) : (padFocus + (e.shiftKey ? n - 1 : 1)) % n;
    kbFocus = true; padScrollTo(uiButtons[padFocus]); return true;
  }
  if (kbFocus && (e.code === 'Enter' || e.code === 'Space') && !e.repeat && uiButtons[padFocus]) { uiButtons[padFocus].fn(); return true; }
  return false;
}
function padNeighbor(i, dx, dy) {
  const c = b => [b.x + b.w / 2, b.y + b.h / 2], [x0, y0] = c(uiButtons[i]);
  let best = i, bs = Infinity;
  uiButtons.forEach((b, j) => {
    if (j === i) return;
    const [x, y] = c(b), along = (x - x0) * dx + (y - y0) * dy, side = Math.abs((x - x0) * dy) + Math.abs((y - y0) * dx);
    if (along <= 4) return;
    if (along + side * 2 < bs) { bs = along + side * 2; best = j; }
  });
  return best;
}
function padScrollTo(b) { if (!b) return; if (b.y < 50) scrollMenu(b.y - 50); else if (b.y + b.h > VH - 50) scrollMenu(b.y + b.h - VH + 50); }
function padMenuNav(edge) {
  if (!uiButtons.length || ['story', 'steve', 'court', 'shop', 'keys', 'play'].includes(state)) return false;
  const dirs = [[12, 0, -1], [13, 0, 1], [14, -1, 0], [15, 1, 0]];
  for (const [i, dx, dy] of dirs) if (edge(i)) {
    padFocus = padFocus < 0 || !uiButtons[padFocus] ? 0 : padNeighbor(padFocus, dx, dy);
    padScrollTo(uiButtons[padFocus]);
    return true;
  }
  if (edge(0)) {
    const btn = padFocus >= 0 && uiButtons[padFocus];
    if (btn) { btn.fn(); return true; }
    // sub-menus (and the season's last results, which offer Endless) wait for a choice instead of backing out
    if (['modes', 'players', 'extras', 'custom', 'settings', 'crypt'].includes(state) || (state === 'over' && night === 5 && G && G.endReason === 'win' && !oneNightMode()) || seasonChoice()) {   /*conseq*/
      padFocus = 0; padScrollTo(uiButtons[0]); return true;
    }
  }
  return false;
}
function pollPad() {
  if (typeof screenTooSmall === 'function' && screenTooSmall()) return;   // the too-small notice is up   /*r7*/
  const gps = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
  const gp = gps[0];
  if (!gp) {
    if (pad.draw && player) player.drawing = false;
    pad.connected = false; pad.mx = pad.my = 0; pad.aim = null; pad.crouch = false; pad.draw = false; pad.look = false; pad.sprint = false; return;
  }
  // a different controller took over (pad one unplugged): forget the old one's buttons and any draw it started
  if (pad.index !== undefined && pad.index !== gp.index) { if (pad.draw && player) player.drawing = false; pad.prev = []; pad.draw = false; }
  pad.index = gp.index;
  pad.connected = true;
  const b = gp.buttons.map(x => x.pressed);
  const edge = i => b[i] && !pad.prev[i];
  // radial deadzone, rescaled so the edge of the deadzone is 0 and full tilt is 1 (a drifting stick stays still)
  const sx = gp.axes[0] || 0, sy = gp.axes[1] || 0, sm = Math.hypot(sx, sy);
  const k = sm < 0.25 ? 0 : Math.min(1, (sm - 0.25) / 0.7) / sm;
  pad.mx = sx * k; pad.my = sy * k;
  const ax = gp.axes[2] || 0, ay = gp.axes[3] || 0;
  pad.aim = Math.hypot(ax, ay) > 0.35 ? Math.atan2(ay, ax) : null;
  pad.crouch = !!(b[4] || b[10] || b[6]);
  pad.look = !!b[5];
  pad.sprint = !!b[11];
  if (b.some(Boolean) || pad.aim !== null || pad.mx || pad.my) aimBy = 'pad';
  if (state !== padFocusState) { padFocus = -1; padFocusState = state; }
  if (netClient()) { if (edge(0) || edge(7)) NET.action++; if (edge(9)) netLeave(); }
  else if (state === 'play') {
    if (b[7] && !pad.draw) { pad.draw = true; startDraw(); }
    if (!b[7] && pad.draw) { pad.draw = false; releaseDraw(); }
    const go = i => edge(i) && state === 'play';
    if (go(0)) interact();
    if (go(1)) throwCone();
    if (go(2)) grunt();
    if (go(3)) { if (G.mom && G.mom.state === 'buzz') declineCall(); else tryLeave(); }
    if (go(9)) { player.drawing = false; state = 'pause'; }
    if (go(12)) drinkBeer();
    if (go(8)) G.mapOpen = !G.mapOpen;
    if (go(13)) toggleNVG();
    if (go(14)) feedDog();
  } else if (state === 'story') {
    if (edge(0)) advanceStory(); else if (edge(1) || edge(9)) advanceStory(true);
  } else if (state === 'steve') {
    if (edge(0)) steveSell(); else if (edge(2)) steveBuy('beer'); else if (edge(3)) steveBuy('arrows'); else if (edge(12)) steveBuy('cones'); else if (edge(13)) steveHaggle(); else if (edge(1) || edge(9)) state = 'play';
  } else if (state === 'court') {
    if (!G.court) {
      if (edge(12)) G.courtSel = ((G.courtSel || 0) + COURT_PLEAS.length - 1) % COURT_PLEAS.length;
      if (edge(13)) G.courtSel = ((G.courtSel || 0) + 1) % COURT_PLEAS.length;
      if (edge(0)) courtPlea(G.courtSel || 0);
    } else if (edge(0) || edge(9)) finishCourt();
  } else if (state === 'pause' && G && G.tut && edge(3)) {
    skipTutorial(); state = 'play';
  } else if (state === 'shop') {
    if (edge(12)) shopSel = (shopSel + SHOP.length - 1) % SHOP.length;
    if (edge(13)) shopSel = (shopSel + 1) % SHOP.length;
    if (edge(0)) buy(SHOP[shopSel]);
    if (edge(2) && uiButtons[0] && (campaign.freezer > 0 || (campaign.racks || []).length)) uiButtons[0].fn();   // X: sell to Earl
    if (edge(9)) { night++; startNight(); }
  } else if (padMenuNav(edge)) {
    /* the D-pad moved the menu focus, or A pressed the focused button */
  } else if (edge(0) || edge(9) || edge(1)) {
    if (['whoswho', 'nights', 'trophies', 'credits'].includes(state)) state = 'extras';
    else if (state === 'custom') state = 'modes';
    else if (['settings', 'scores', 'crypt', 'modes', 'players', 'extras'].includes(state)) state = 'title';
    else if (edge(1)) { /* B only backs out of sub-menus */ }
    else if (state === 'title') { if (!loadGame()) newCampaign(); }
    else if (state === 'intro' || state === 'pause') state = 'play';
    else if (state === 'nightdone') goShop();
    else if (state === 'over' && !seasonChoice()) overNext();
  }
  pad.prev = b;
}

// ============================================================
// Touch controls (phones / tablets): left thumb = move stick, right thumb = aim + draw
// ============================================================
let touchMode = false;
const touch = { menuId: null, menuY: 0, menuX: 0, menuMoved: 0, stickId: null, sx: 0, sy: 0, x: 0, y: 0, mx: 0, my: 0, aimId: null, crouch: false };
// Touch controls: one layout solver for every action button (LEAVE included).   /*r6*/
// Every button's whole tap area (circle + 8 px) stays on screen, out of the left-thumb movement zone (a fresh
// thumb there starts the stick), off the minimap, the suspicion meter, Pause/Map and Dale, and never touches
// another button's. Buttons fill columns from the bottom-right corner; if they don't all fit, they shrink a size.
const TOUCH_HIT = 8;
const touchLayout = { key: null, pos: null };
function touchButtons() {
  if (state !== 'play' || netClient()) return [];
  const list = [
    { id: 'drag', label: player.carry ? 'DROP' : player.fishing ? 'REEL' : nearVan() ? 'STEVE' : 'USE', fn: interact },
    { id: 'cone', label: '🌰', fn: throwCone },
    { id: 'grunt', label: 'CALL', fn: grunt },
  ];
  // LEAVE right after USE: ending the night is the second most important thumb action at the shed
  if (nearTruck()) list.splice(1, 0, { id: 'leave', label: G.leaveAsk !== undefined && G.playT - G.leaveAsk <= 3 && !quotaMet() ? 'CONFIRM?' : 'LEAVE', fn: tryLeave, hot: true });
  if (has('corn')) list.push({ id: 'corn', label: 'CORN', fn: dropCorn });
  if (campaign.items.beer) list.push({ id: 'beer', label: '🍺', fn: drinkBeer });
  if (has('nvg')) list.push({ id: 'nvg', label: 'NVG', fn: toggleNVG, hot: G.nvgOn });
  if (campaign.items.jerky && world.dogs.some(g => !g.quiet && dist(g.ax, g.ay, player.x, player.y) < 140)) list.push({ id: 'jerky', label: 'JERKY', fn: feedDog, hot: true });
  if (G.mom && G.mom.state === 'buzz') list.unshift({ id: 'mom', label: '📵', fn: declineCall, hot: true });
  const mmH = Math.max(70, Math.min(220, VW * 0.25, VW - 300)) * H / W;
  const fixed = [
    { id: 'pause', label: '❚❚', fn: () => { player.drawing = false; state = 'pause'; }, x: VW - 34, y: 16 + mmH + 34, r: 18 },
    { id: 'map', label: 'MAP', fn: () => { G.mapOpen = !G.mapOpen; }, x: VW - 34, y: 16 + mmH + 90, r: 18 },   // 56 px below Pause: their tap areas never touch
  ];
  const compact = compactUI(), hintUp = !!(G.hint && shortLandscape());
  const key = VW + 'x' + VH + ':' + list.map(b => b.id).join(',') + (compact ? 'c' : '') + (G.police ? 'p' : '') + (hintUp ? 'h' : '');
  if (touchLayout.key !== key) { touchLayout.key = key; touchLayout.pos = layoutTouchButtons(list.length, fixed, mmH, compact); }
  const pos = touchLayout.pos;
  const out = [];
  list.forEach((b, k) => { if (pos[k]) out.push(Object.assign({}, b, pos[k])); });
  return out.concat(fixed);
}
function layoutTouchButtons(n, fixed, mmH, compact) {
  const HIT = TOUCH_HIT, moveEdge = VW * 0.45, mm = minimapBox();
  const circles = fixed.map(b => ({ x: b.x, y: b.y, r: b.r + HIT }));
  if (!compact) circles.push({ x: VW / 2, y: VH / 2 + 25, r: 50 });   // Dale (the camera keeps him mid-screen)
  const rects = [{ x: mm.x - 6, y: 0, w: VW, h: mm.y + mm.h + 6 }];
  if (!compact) rects.push({ x: 270, y: 0, w: Math.max(0, mm.x - 270), h: G && G.police ? 96 : 72 });   // the suspicion meter
  else rects.push({ x: 0, y: 0, w: VW, h: 300 + (G && G.police ? 26 : 0) });                          // phone HUD + meter stack
  const bottom = compact ? 30 : 4;   // portrait phones: just above the thumb-help line
  // Greedy packing on a fine 4 px grid (a coarse grid wasted the space around Pause, Map and Dale):
  // each button takes the free spot nearest the bottom-right corner, column by column.   /*r7*/
  const pack = (r, avoidDale) => {
    const R = r + HIT, pos = [];
    const ok = (cx, cy) => !circles.some((o, k) => (avoidDale || k < fixed.length) && dist(cx, cy, o.x, o.y) < R + o.r + 2) &&
      !rects.some(q => cx + R > q.x && cx - R < q.x + q.w && cy + R > q.y && cy - R < q.y + q.h) &&
      pos.every(p => dist(cx, cy, p.x, p.y) >= 2 * R + 4);
    for (let k = 0; k < n; k++) {
      let spot = null;
      for (let cx = VW - R - 2; !spot && cx - R >= moveEdge; cx -= 4)
        for (let cy = VH - bottom - R - 2; cy - R >= 2; cy -= 4) if (ok(cx, cy)) { spot = { x: cx, y: cy, r }; break; }
      if (!spot) { pos.partial = true; return pos; }
      pos.push(spot);
    }
    return pos;
  };
  for (const avoidDale of [true, false]) for (const r of [30, 26, 22, 18]) { const pos = pack(r, avoidDale); if (!pos.partial) return pos; }
  return pack(18, false);   // never reached at a supported size (the tests sweep them); below it, the too-small notice covers play
}
// The smallest screens the controls are laid out for. Smaller than this, play pauses and asks for a bigger window.
function screenTooSmall() { return !((VW >= 560 && VH >= 300) || (VW >= 320 && VH >= 560)); }
function touchToMouse(t) { mouse.x = t.clientX; mouse.y = t.clientY; }
cv.addEventListener('touchstart', e => {
  e.preventDefault();
  touchMode = true; aimBy = 'mouse';
  const lb = NET.leaveBtn, t0 = e.changedTouches[0];
  if (netClient() && lb && t0 && t0.clientX >= lb.x && t0.clientX <= lb.x + lb.w && t0.clientY >= lb.y && t0.clientY <= lb.y + lb.h) { netLeave(); return; }
  for (const t of e.changedTouches) {
    if (state !== 'play') {
      // menus: a tap clicks (on release), a drag scrolls
      touchToMouse(t);
      touch.menuId = t.identifier; touch.menuY = t.clientY; touch.menuX = t.clientX; touch.menuMoved = 0;
      continue;
    }
    if (netClient() && t.clientX >= VW * 0.45) { NET.action++; continue; }
    // the nearest button whose tap area (circle + 8 px) holds the touch, not just the first one listed   /*r5*/
    const hitBtn = touchButtons().filter(b => dist(b.x, b.y, t.clientX, t.clientY) < b.r + 8).sort((p, q) => dist(p.x, p.y, t.clientX, t.clientY) / p.r - dist(q.x, q.y, t.clientX, t.clientY) / q.r)[0];
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
    if (t.identifier === touch.menuId) { const dy = t.clientY - touch.menuY; touch.menuY = t.clientY; touch.menuMoved += Math.abs(dy); scrollMenu(-dy); continue; }
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
    if (t.identifier === touch.menuId) {
      touch.menuId = null;
      if (touch.menuMoved < 10 && e.type === 'touchend') cv.dispatchEvent(new MouseEvent('mousedown', { clientX: touch.menuX, clientY: touch.menuY, button: 0 }));
      continue;
    }
    if (t.identifier === touch.stickId) { touch.stickId = null; touch.mx = touch.my = 0; touch.crouch = false; }
    if (t.identifier === touch.aimId) { touch.aimId = null; if (state === 'play') { if (e.type === 'touchcancel') player.drawing = false; else releaseDraw(); } }
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
  if (netClient()) { ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.font = '12px system-ui, sans-serif'; ctx.textAlign = 'right'; ctx.fillText('Tap the right side: action ▶', VW - 16, VH - 34); ctx.textAlign = 'left'; }
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
  if (item && item.id === campaign.special) { const before = campaign.cash; try { buyItem(item); } finally { if (campaign.cash < before) campaign.specialBoughtFor = night; if (state === 'shop') saveNext(); } return; }   // bought tonight's deal: a reload can't roll a second one
  try { buyItem(item); } finally { if (state === 'shop') saveNext(); }
}
function buyItem(item) {
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
  G.steveLine = packs >= 10 ? `Steve: "${packs} packs?! $${cash}. Next time bring a receipt that says BAKE SALE."` : `Steve: "${packsText(packs)} at $${G.price}... that's $${cash}. Pleasure doin' crimes with you."`;
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
  campaign.boughtSteve = true;   // Thrifty means nothing from Steve either
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
  popup(player.x, player.y - 30, player.hidden ? 'Declined. Mom is outside your shrub\'s service area.' : 'Declined. Sorry, Ma.', '#ff9ad5', 1.6);
  unlock('callme');
}
