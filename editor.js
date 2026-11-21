'use strict';
// Curfew Buck map editor. Builds a map spec (JSON) that the game loads with worldFromSpec().
// Same world size and units as game.js.
const W = 3600, H = 2600, M = 260, ROAD = 120, HW = 230, HH = 160, SNAP = 10;
const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
const status = document.getElementById('status');

const TOOLS = [
  ['road', '🛣 Road (drag)'], ['bulb', '⭕ Cul-de-sac (drag radius)'], ['house', '🏠 House (click)'], ['ex', '💗 Darlene\'s house'],
  ['pond', '💧 Pond (drag)'], ['pool', '🏊 Pool (drag)'], ['hedge', '🌿 Hedge (drag)'], ['woods', '🌲 Woods area (drag)'],
  ['bush', '🫐 Bush (click)'], ['tree', '🌳 Tree (click)'], ['shed', '🛖 Dale\'s shed'], ['van', '🚐 Steve\'s van'],
  ['club', '🏛 HOA clubhouse + pool'], ['sign', '🪧 Sign (click)'], ['erase', '🧽 Erase (click)'],
];
let tool = 'road', faceUp = false;
let spec = blankSpec();
const history = [];
let drag = null;

let signText = 'MAPLE ST';
function blankSpec() {
  return { format: 'hunter-sub-map', version: 1, name: 'My Neighborhood', author: '', intro: '', seed: 9001,
    roads: [{ x: M, y: 1200, w: W - 2 * M, h: ROAD, vert: false }], bulbs: [], houses: [], ponds: [], pools: [], hedges: [], woods: [],
    bushes: [], trees: [], signs: [], shed: null, van: null, clubhouse: null };
}
function sampleSpec() {
  // "Hosta Hills": a loop road with houses inside and out
  const s = blankSpec();
  s.name = 'Hosta Hills'; s.author = 'Curfew Buck'; s.intro = 'A loop road around the Hosta Hills common. Darlene\'s sister lives here. So does the HOA secretary.';
  s.roads = [{ x: 700, y: 600, w: 2200, h: ROAD, vert: false }, { x: 700, y: 1880, w: 2200, h: ROAD, vert: false },
    { x: 700, y: 600, w: ROAD, h: 1400, vert: true }, { x: 2780, y: 600, w: ROAD, h: 1400, vert: true }, { x: M, y: 1240, w: 440, h: ROAD, vert: false }];
  for (let i = 0; i < 6; i++) { s.houses.push({ x: 900 + i * 320, y: 400, top: false }); s.houses.push({ x: 900 + i * 320, y: 2040, top: true }); }
  s.houses.push({ x: 1100, y: 760, top: true }, { x: 2300, y: 760, top: true }, { x: 1100, y: 1680, top: false }, { x: 2300, y: 1680, top: false });
  s.houses[2].ex = true;
  s.ponds.push({ x: 1600, y: 1150, w: 360, h: 180, name: 'Hosta Pond' });
  s.woods.push({ x: 1450, y: 1000, w: 700, h: 480 });
  s.clubhouse = { x: 3000, y: 1300 };
  s.signs.push({ x: 560, y: 1220, text: 'HOSTA HILLS' });
  return s;
}

// ---------------------------------------------------------------- view
let scale = 0.2, ox = 0, oy = 0;
function resize() {
  const r = cv.getBoundingClientRect();
  cv.width = r.width * devicePixelRatio; cv.height = r.height * devicePixelRatio;
  scale = Math.min(cv.width / W, cv.height / H) * 0.97;
  ox = (cv.width - W * scale) / 2; oy = (cv.height - H * scale) / 2;
  draw();
}
const toWorld = e => { const r = cv.getBoundingClientRect(); const x = ((e.clientX - r.left) * devicePixelRatio - ox) / scale, y = ((e.clientY - r.top) * devicePixelRatio - oy) / scale; return { x: Math.round(x / SNAP) * SNAP, y: Math.round(y / SNAP) * SNAP }; };
function rect(o, fill, stroke) { ctx.fillStyle = fill; ctx.fillRect(ox + o.x * scale, oy + o.y * scale, o.w * scale, o.h * scale); if (stroke) { ctx.strokeStyle = stroke; ctx.strokeRect(ox + o.x * scale, oy + o.y * scale, o.w * scale, o.h * scale); } }
function dot(o, r, fill) { ctx.fillStyle = fill; ctx.beginPath(); ctx.arc(ox + o.x * scale, oy + o.y * scale, Math.max(2, r * scale), 0, Math.PI * 2); ctx.fill(); }
function label(text, x, y, color) { ctx.fillStyle = color || '#fff'; ctx.font = `bold ${Math.max(10, 12 * devicePixelRatio)}px system-ui`; ctx.textAlign = 'center'; ctx.fillText(text, ox + x * scale, oy + y * scale); }
function draw() {
  ctx.fillStyle = '#0b0f14'; ctx.fillRect(0, 0, cv.width, cv.height);
  rect({ x: 0, y: 0, w: W, h: H }, '#16301a');
  rect({ x: M, y: M, w: W - 2 * M, h: H - 2 * M }, '#2d5a2a');
  for (const z of spec.woods) rect(z, '#16301a', '#3d6b3a');
  for (const r of spec.roads) rect(r, '#3a3d42');
  for (const b of spec.bulbs) dot(b, b.r, '#3a3d42');
  for (const p of spec.ponds) rect(p, '#2f6f8f');
  for (const p of spec.pools) rect(p, '#5ec8e8');
  for (const g of spec.hedges) rect(g, '#1f4a1c');
  for (const h of spec.houses) { const hw = h.w || HW, hh = h.h || HH; rect({ x: h.x, y: h.y, w: hw, h: hh }, h.ex ? '#f2a7cc' : '#b8ad9a', '#000'); const fy = h.top ? h.y + 6 : h.y + hh - 6; rect({ x: h.x + hw / 2 - 20, y: fy - 3, w: 40, h: 6 }, '#ff7a1a'); if (h.ex) label('DARLENE', h.x + hw / 2, h.y + hh / 2 + 5, '#111'); }
  for (const b of spec.bushes) dot(b, b.r || 32, '#3d7a37');
  for (const t of spec.trees) dot(t, 30, '#1c3d1a');
  if (spec.shed) { rect({ x: spec.shed.x, y: spec.shed.y, w: 100, h: 70 }, '#ff5a3a'); label('SHED', spec.shed.x + 50, spec.shed.y - 8, '#ff9a7a'); }
  if (spec.van) { rect({ x: spec.van.x, y: spec.van.y, w: 116, h: 56 }, '#b5e06b'); label('STEVE', spec.van.x + 58, spec.van.y - 8, '#b5e06b'); }
  if (spec.clubhouse) { rect({ x: spec.clubhouse.x, y: spec.clubhouse.y, w: 180, h: 110 }, '#cfc6b8'); rect({ x: spec.clubhouse.x + 200, y: spec.clubhouse.y + 10, w: 150, h: 80 }, '#5ec8e8'); label('CLUBHOUSE', spec.clubhouse.x + 90, spec.clubhouse.y - 8, '#ffd166'); }
  for (const g of spec.signs) label('🪧 ' + g.text, g.x, g.y, '#ffd166');
  if (drag && drag.cur) {
    ctx.strokeStyle = '#ffd166'; ctx.setLineDash([6, 4]);
    if (drag.tool === 'bulb') { ctx.beginPath(); ctx.arc(ox + drag.a.x * scale, oy + drag.a.y * scale, Math.hypot(drag.cur.x - drag.a.x, drag.cur.y - drag.a.y) * scale, 0, Math.PI * 2); ctx.stroke(); }
    else { const r = dragRect(); ctx.strokeRect(ox + r.x * scale, oy + r.y * scale, r.w * scale, r.h * scale); }
    ctx.setLineDash([]);
  }
}
function dragRect() {
  let r = { x: Math.min(drag.a.x, drag.cur.x), y: Math.min(drag.a.y, drag.cur.y), w: Math.abs(drag.cur.x - drag.a.x), h: Math.abs(drag.cur.y - drag.a.y) };
  const t = drag.tool;   // the tool the drag started with, even if another finger taps a different one
  if (t === 'road') { if (r.w >= r.h) { r.h = ROAD; r.y = drag.a.y - ROAD / 2; r.vert = false; } else { r.w = ROAD; r.x = drag.a.x - ROAD / 2; r.vert = true; } }
  if (t === 'hedge') { if (r.w >= r.h) { r.h = 14; } else { r.w = 14; } }
  return r;
}

// ---------------------------------------------------------------- editing
// save() = take an undo snapshot before a change. persist() = keep the current map as the draft.
function save() { history.push(JSON.stringify(spec)); if (history.length > 60) history.shift(); }
function persist() { try { localStorage.setItem('hs_editor_draft', JSON.stringify(spec)); } catch (e) { /* storage blocked */ } }
// Fill in anything missing or broken (imported files, old drafts), so the editor can't get stuck. Uses the
// game's own rules (validateMap in js/modes.js): numbers only, inside the map, sensible sizes. Anything the game
// would drop is dropped here too and counted in normalize.skipped, so "Ready to play" means it all survives.
const num = v => typeof v === 'number' && isFinite(v);
const inMap = o => o && typeof o === 'object' && num(o.x) && num(o.y) && o.x >= 0 && o.y >= 0 && o.x <= W && o.y <= H;
const SIZE_OK = o => (o.w === undefined || (num(o.w) && o.w > 4 && o.w < W)) && (o.h === undefined || (num(o.h) && o.h > 4 && o.h < H));
const RADIUS_OK = { bulbs: b => num(b.r) && b.r > 40 && b.r < 600, bushes: b => b.r === undefined || (num(b.r) && b.r >= 8 && b.r <= 120), trees: t => t.r === undefined || (num(t.r) && t.r >= 8 && t.r <= 160) };
function normalize(s) {
  normalize.skipped = 0;
  const src = s && typeof s === 'object' && !Array.isArray(s) ? s : {};
  const out = Object.assign(blankSpec(), src);
  const base = blankSpec();
  for (const k in base) {
    if (!Array.isArray(base[k])) continue;
    const list = Array.isArray(src[k]) ? src[k] : k in src ? (normalize.skipped++, []) : base[k];
    out[k] = list.filter(o => {
      const ok = inMap(o) && (RADIUS_OK[k] ? RADIUS_OK[k](o) : SIZE_OK(o)) && (k !== 'signs' || typeof o.text === 'string');
      if (!ok) normalize.skipped++;
      return ok;
    }).map(o => k === 'signs' ? { x: o.x, y: o.y, text: o.text.slice(0, 40) } : k === 'houses' ? Object.assign({}, o, { top: !!o.top, ex: !!o.ex }) : Object.assign({}, o));
  }
  for (const k of ['shed', 'van', 'clubhouse']) if (out[k] && !inMap(out[k])) { out[k] = null; normalize.skipped++; }
  for (const k of ['name', 'author', 'intro']) out[k] = typeof out[k] === 'string' ? out[k] : '';
  return out;
}
// Does this look like a map at all? (an object with at least one of the map's lists or places)
const looksLikeMap = s => !!s && typeof s === 'object' && !Array.isArray(s) && ['roads', 'houses', 'bulbs', 'ponds', 'woods', 'shed', 'van'].some(k => k in s);
function hitTest(p) {
  const tol = Math.max(6, 14 / scale);   // about 14 screen pixels, in map units
  const inR = (o, w, h) => p.x >= o.x - tol && p.x <= o.x + (o.w || w) + tol && p.y >= o.y - tol && p.y <= o.y + (o.h || h) + tol;
  const lists = [['signs', o => Math.hypot(o.x - p.x, o.y - p.y) < 60], ['bushes', o => Math.hypot(o.x - p.x, o.y - p.y) < 40], ['trees', o => Math.hypot(o.x - p.x, o.y - p.y) < 40],
    ['houses', o => inR(o, HW, HH)], ['pools', o => inR(o)], ['ponds', o => inR(o)], ['hedges', o => inR(o)], ['bulbs', o => Math.hypot(o.x - p.x, o.y - p.y) < o.r], ['roads', o => inR(o)], ['woods', o => inR(o)]];
  for (let i = spec.signs.length - 1; i >= 0; i--) if (lists[0][1](spec.signs[i])) return () => spec.signs.splice(i, 1);
  for (const [k, w, h] of [['shed', 100, 70], ['van', 116, 56], ['clubhouse', 360, 110]]) if (spec[k] && inR(spec[k], w, h)) return () => { spec[k] = null; };
  for (const [k, f] of lists) { for (let i = spec[k].length - 1; i >= 0; i--) if (f(spec[k][i])) return () => spec[k].splice(i, 1); }
  return null;
}
function click(p) {
  // erasing empty space or an empty sign changes nothing, so it takes no undo step
  const del = tool === 'erase' ? hitTest(p) : null, signT = (signText || 'MAPLE ST').trim();
  if ((tool === 'erase' && !del) || (tool === 'sign' && !signT) || !TOOLS.some(t => t[0] === tool)) return;
  save();
  const cx = (v, w, lim) => Math.max(0, Math.min(lim - w, v));   // keep the whole thing on the map
  if (tool === 'house' || tool === 'ex') {
    if (tool === 'ex') spec.houses.forEach(h => { h.ex = false; });
    spec.houses.push({ x: cx(p.x - HW / 2, HW, W), y: cx(p.y - HH / 2, HH, H), top: faceUp, ex: tool === 'ex' });
  } else if (tool === 'bush') spec.bushes.push({ x: p.x, y: p.y });
  else if (tool === 'tree') spec.trees.push({ x: p.x, y: p.y });
  else if (tool === 'shed') spec.shed = { x: cx(p.x - 50, 100, W), y: cx(p.y - 35, 70, H) };
  else if (tool === 'van') spec.van = { x: cx(p.x - 58, 116, W), y: cx(p.y - 28, 56, H) };
  else if (tool === 'club') spec.clubhouse = { x: cx(p.x - 90, 360, W), y: cx(p.y - 55, 110, H) };
  else if (tool === 'sign') spec.signs.push({ x: p.x, y: p.y, text: signT.slice(0, 40) });
  else if (tool === 'erase') del();
  validate(); draw();
}
function finishDrag() {
  const r = dragRect(), tool = drag.tool;
  if (tool === 'bulb') { const rr = Math.round(Math.hypot(drag.cur.x - drag.a.x, drag.cur.y - drag.a.y)); if (rr > 60) { save(); spec.bulbs.push({ x: drag.a.x, y: drag.a.y, r: Math.min(400, rr) }); } }
  else if (tool === 'road' && (r.vert ? r.h : r.w) < 200) { /* too short to be a road */ }
  else if (Math.max(r.w, r.h) > 20 && Math.min(r.w, r.h) >= 10) {
    save();
    const k = { road: 'roads', pond: 'ponds', pool: 'pools', hedge: 'hedges', woods: 'woods' }[tool];
    if (k) spec[k].push(tool === 'pond' ? Object.assign(r, { name: '' }) : r);
  }
  validate(); draw();
}
cv.addEventListener('pointerdown', e => {
  const p = toWorld(e);
  if (drag || (e.pointerType === 'mouse' && e.button !== 0)) return;
  if (['road', 'bulb', 'pond', 'pool', 'hedge', 'woods'].includes(tool)) { drag = { a: p, cur: p, id: e.pointerId, tool }; cv.setPointerCapture(e.pointerId); }
  else click(p);
});
cv.addEventListener('pointermove', e => { if (drag && e.pointerId === drag.id) { drag.cur = toWorld(e); draw(); } else if (drag) { /* another finger */ } else { const p = toWorld(e); status.dataset.pos = `${p.x}, ${p.y}`; } });
cv.addEventListener('pointerup', e => { if (drag && e.pointerId === drag.id) { drag.cur = toWorld(e); finishDrag(); drag = null; draw(); } });
for (const ev of ['pointercancel', 'lostpointercapture']) cv.addEventListener(ev, e => { if (drag && e.pointerId === drag.id) { drag = null; draw(); } });

function validate() {
  persist();
  const errs = [];
  if (!spec.houses.length) errs.push('Add at least one house.');
  if (!spec.roads.length) errs.push('Add at least one road.');
  const hasEx = spec.houses.some(h => h.ex);
  status.innerHTML = errs.length ? `<span class="bad">${errs.join(' ')}</span>` :
    `<span class="ok">Ready to play.</span> ${spec.houses.length} houses · ${spec.roads.length} roads · ${spec.bulbs.length} cul-de-sacs · ${hasEx ? 'Darlene\'s house placed' : 'the first house will be Darlene\'s'} · ${spec.shed ? 'shed placed' : 'shed goes behind Darlene\'s'}`;
  return !errs.length;
}

// ---------------------------------------------------------------- UI
const toolsEl = document.getElementById('tools');
function buildTools() {
  toolsEl.innerHTML = '';
  const field = (lab, key) => { const l = document.createElement('label'); l.textContent = lab; const i = document.createElement('input'); i.value = spec[key] || ''; let snap = false; i.onfocus = () => { snap = false; }; i.oninput = () => { if (!snap) { save(); snap = true; } spec[key] = i.value; persist(); }; toolsEl.append(l, i); };
  field('Map name', 'name'); field('Author', 'author'); field('Intro text', 'intro');
  { const l = document.createElement('label'); l.textContent = 'Sign text (for the Sign tool)'; const i = document.createElement('input'); i.value = signText; i.maxLength = 40; i.oninput = () => { signText = i.value; }; toolsEl.append(l, i); }
  const l = document.createElement('label'); l.textContent = 'Tools'; toolsEl.append(l);
  for (const [id, name] of TOOLS) { const b = document.createElement('button'); b.textContent = name; b.className = tool === id ? 'on' : ''; b.onclick = () => { tool = id; buildTools(); }; toolsEl.append(b); }
  const f = document.createElement('button'); f.textContent = faceUp ? 'New houses: road ABOVE' : 'New houses: road BELOW'; f.onclick = () => { faceUp = !faceUp; buildTools(); }; toolsEl.append(f);
}
function download(name, text) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }
document.getElementById('new').onclick = () => { drag = null; save(); spec = blankSpec(); buildTools(); validate(); draw(); };
document.getElementById('sample').onclick = () => { drag = null; save(); spec = sampleSpec(); buildTools(); validate(); draw(); };
document.getElementById('undo').onclick = () => { drag = null; const h = history.pop(); if (h) { spec = JSON.parse(h); buildTools(); validate(); draw(); } };
document.getElementById('export').onclick = () => download((spec.name || 'map').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.json', JSON.stringify(spec, null, 2));
document.getElementById('import').onclick = () => {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
  inp.onchange = () => { const f = inp.files[0]; if (!f) return; f.text().then(t => { try { const raw = JSON.parse(t); if (!looksLikeMap(raw)) { alert('That file has no Curfew Buck map in it (no roads, houses or other map parts). Your map is unchanged.'); return; } const s = normalize(raw), n = normalize.skipped; drag = null; save(); spec = s; buildTools(); validate(); draw(); if (n) alert(`Imported. ${n} broken or off-map ${n === 1 ? 'entry was' : 'entries were'} left out (the game would drop ${n === 1 ? 'it' : 'them'} too).`); } catch (e) { alert('That file isn\'t a Curfew Buck map: ' + e.message); } }); };
  inp.click();
};
document.getElementById('play').onclick = () => {
  if (!validate()) return;
  try { localStorage.setItem('hs_custom_map', JSON.stringify(spec)); } catch (e) { alert('This browser blocked saving the map.'); return; }
  location.href = 'index.html?custom=1';
};
window.addEventListener('keydown', e => {
  const t = e.target, typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
  if (!typing && (e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') { e.preventDefault(); document.getElementById('undo').click(); }
});
window.addEventListener('resize', resize);
// devicePixelRatio can change with no resize event (another monitor, browser zoom): watch it and redo the layout
(function watchDpr() {
  if (!window.matchMedia) return;
  const mq = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
  const on = () => { resize(); watchDpr(); };
  if (mq.addEventListener) mq.addEventListener('change', on, { once: true }); else if (mq.addListener) mq.addListener(function h() { mq.removeListener(h); on(); });
})();
try { const d = localStorage.getItem('hs_editor_draft'); if (d) spec = normalize(JSON.parse(d)); } catch (e) { spec = blankSpec(); }
buildTools(); validate(); resize();
