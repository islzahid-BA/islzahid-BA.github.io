/* Babia's Bird Watch — a small pixel-art game for the Arcade page.
   Eat (catch treats), watch birds (jump to boop them), avoid the vacuum.
   When Babia's FULL meter runs out she falls asleep… and you repeat. */
(() => {
const cv = document.getElementById('babiaCanvas');
if (!cv) return;
const $ = id => document.getElementById(id);
const ctx = cv.getContext('2d');
const W = 480, H = 270, FLOOR = 232, S = 2;           // logical size; sprites drawn at 2× pixels
cv.width = W * 2; cv.height = H * 2; ctx.scale(2, 2); ctx.imageSmoothingEnabled = false;
const FONT = '"Press Start 2P", "Courier New", monospace';
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};

/* ---------- Sprites (Babia: white, cream patches, pink nose, green eyes) ---------- */
const PAL = { D: '#2b2133', W: '#fbf7f0', C: '#e9b77f', G: '#8fd36a', P: '#f39bb3' };
const CAT = [
  "...........D...D..",
  "..........DCD.DCD.",
  ".D........DWWWWWD.",
  "DCD......DWWGWWGWD",
  "DCD......DWWWWPWWD",
  "DCDDDDDDDDWWWWWWD.",
  ".DCCCWWWWWWWWWWD..",
  ".DCCWWWWWWCCWWWD..",
  ".DCWWWWWWCCCWWWD..",
  "..DWWWWWWWCCWWWD..",
  "..DWWDDDDDDDWWWD.."
];
const LEGS_A = ["..DWD.......DWD...", "..DDD.......DDD..."];
const LEGS_B = ["...DWD.....DWD....", "...DDD.....DDD...."];
const LEGS_J = [".DWD.........DWD..", ".DD...........DD.."];
const BIRD_UP = ["B....B.", ".BBBBEO", "..BBB.."];
const BIRD_DN = ["..BBB..", ".BBBBEO", "B....B."];
const TREAT = [".OOOO.O", "OOOOOOO", ".OOOO.O"];
const VAC = [
  "....GGGG......",
  "....G..G......",
  "....G..G......",
  "..RRRRRRRRRR..",
  ".RRRRRRRRRRRR.",
  ".RRWWRRRRRRRR.",
  ".RRRRRRRRRRRR.",
  "KKKKKKKKKKKKKK",
  ".KK........KK."
];
function sprite(rows, x, y, s, pal, flip) {
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      const ch = row[c]; if (ch === '.' || !pal[ch]) continue;
      ctx.fillStyle = pal[ch];
      ctx.fillRect(Math.round(x + (flip ? row.length - 1 - c : c) * s), Math.round(y + r * s), s, s);
    }
  }
}
const CW = 18 * S, CH = 13 * S;

/* ---------- State ---------- */
let state = 'title', G, raf = 0, last = 0, paused = false, best = store.get('babia-best', 0);
const keys = { left: false, right: false };
let jumpQueue = 0;
const BIRD_COLORS = ['#5aa9e6', '#e85d5d', '#a0785a', '#f2c94c', '#7bc47f'];

function reset() {
  G = {
    t: 0, score: 0, energy: 100, level: 1, combo: 0, lastCatch: -999,
    cat: { x: W / 2 - CW / 2, y: FLOOR - CH, vy: 0, face: 1, ground: true, inv: 0, walk: 0 },
    birds: [], treats: [], vacs: [], fx: [], clouds: Array.from({ length: 4 }, (_, i) => ({ x: i * 130 + Math.random() * 60, y: 34 + Math.random() * 60, s: .15 + Math.random() * .2 })),
    nextBird: 40, nextTreat: 200, nextVac: 900, birdsSeen: 0, treatsEaten: 0
  };
  hud();
}
reset();

/* ---------- HUD (HTML, crisp) ---------- */
function hud() {
  $('bwScore').textContent = String(G.score).padStart(5, '0');
  $('bwBest').textContent = String(best).padStart(5, '0');
  $('bwLevel').textContent = G.level;
  const e = Math.max(0, G.energy);
  const bar = $('bwEnergy'); bar.style.width = e + '%'; bar.classList.toggle('low', e < 30);
}

/* ---------- Overlays ---------- */
const ov = $('bwOverlay');
function showOverlay(html) { ov.innerHTML = html; ov.classList.add('show'); const b = ov.querySelector('[data-act]'); if (b) b.onclick = () => act(b.dataset.act); }
function hideOverlay() { ov.classList.remove('show'); }
function act(a) {
  if (a === 'start' || a === 'again') { reset(); state = 'play'; paused = false; hideOverlay(); cv.focus({ preventScroll: true }); }
  if (a === 'resume') { paused = false; hideOverlay(); cv.focus({ preventScroll: true }); }
}
function titleScreen() {
  showOverlay(`<div class="bw-card"><p class="bw-small">INSERT TREAT TO CONTINUE</p><h3>BABIA'S<br>BIRD WATCH</h3>
    <ul class="bw-how"><li><b>EAT</b> catch falling treats 🐟</li><li><b>WATCH</b> jump at birds outside the window</li><li><b>DODGE</b> the vacuum. He hates it.</li></ul>
    <p class="bw-small ctl-hint">← → MOVE · SPACE / ↑ JUMP · P PAUSE</p>
    <button class="pixel-btn bw-go" data-act="start">▶ PRESS START</button></div>`);
}
function gameOver() {
  state = 'over';
  const isBest = G.score > best;
  if (isBest) { best = G.score; store.set('babia-best', best); }
  hud();
  showOverlay(`<div class="bw-card over"><img src="assets/images/babia-nap.webp" alt="Babia asleep"><div>
    <p class="bw-small">GAME OVER</p><h3>Babia fell<br>asleep. Zzz</h3>
    <p class="bw-stats">SCORE ${G.score}${isBest ? ' · <em>NEW BEST!</em>' : ''}<br>BIRDS WATCHED ${G.birdsSeen} · TREATS ${G.treatsEaten}</p>
    <p class="bw-small">EAT. SLEEP. REPEAT.</p>
    <button class="pixel-btn bw-go" data-act="again">↻ REPEAT</button></div></div>`);
}
function pause(on) {
  if (state !== 'play') return;
  paused = on;
  if (on) showOverlay(`<div class="bw-card"><h3>PAUSED</h3><p class="bw-small">Babia is grooming.</p><button class="pixel-btn bw-go" data-act="resume">▶ RESUME</button></div>`);
  else hideOverlay();
}

/* ---------- Input ---------- */
const KEY = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' };
function inGameArea() { const r = cv.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; }
document.addEventListener('keydown', e => {
  if (state !== 'play' || !inGameArea()) return;
  if (KEY[e.key]) { keys[KEY[e.key]] = true; e.preventDefault(); }
  if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { jumpQueue = 8; e.preventDefault(); }
  if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') pause(!paused);
});
document.addEventListener('keyup', e => { if (KEY[e.key]) keys[KEY[e.key]] = false; });
document.querySelectorAll('[data-pad]').forEach(b => {
  const k = b.dataset.pad;
  const on = e => { e.preventDefault(); if (k === 'jump') jumpQueue = 8; else keys[k] = true; b.classList.add('down'); };
  const off = e => { e.preventDefault(); if (k !== 'jump') keys[k] = false; b.classList.remove('down'); };
  b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
});
cv.addEventListener('pointerdown', () => { if (state === 'play' && !paused) jumpQueue = 8; });
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(true); });
new IntersectionObserver(es => es.forEach(e => { if (!e.isIntersecting) pause(true); }), { threshold: .15 }).observe(cv);

/* ---------- Helpers ---------- */
const rand = (a, b) => a + Math.random() * (b - a);
const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
function pop(text, x, y, color) { G.fx.push({ kind: 'text', text, x, y, vy: -.6, life: 60, color }); }
function hearts(x, y) { for (let i = 0; i < 5; i++) G.fx.push({ kind: 'heart', x: x + rand(-8, 8), y: y + rand(-4, 4), vx: rand(-.6, .6), vy: rand(-1.6, -.6), life: 45 }); }

/* ---------- Update ---------- */
function update(dt) {
  const g = G, c = g.cat;
  g.t += dt;
  g.level = 1 + Math.floor(g.t / 1800);                    // new level every ~30 s
  const L = g.level;

  // Babia
  const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  c.x += dir * 2.5 * dt; if (dir) { c.face = dir; c.walk += dt; }
  c.x = Math.max(4, Math.min(W - CW - 4, c.x));
  if (jumpQueue > 0) { jumpQueue -= dt; if (c.ground) { c.vy = -7.3; c.ground = false; jumpQueue = 0; g.energy -= .6; } }
  c.vy += .42 * dt; c.y += c.vy * dt;
  if (c.y >= FLOOR - CH) { c.y = FLOOR - CH; c.vy = 0; c.ground = true; }
  if (c.inv > 0) c.inv -= dt;
  g.energy -= .072 * dt * (1 + (L - 1) * .1);
  const cb = { x: c.x + 4, y: c.y + 2, w: CW - 8, h: CH - 4 };

  // Spawning
  if ((g.nextBird -= dt) <= 0) {
    const fromLeft = Math.random() < .5, sp = rand(1.1, 1.9) + (L - 1) * .22;
    g.birds.push({ x: fromLeft ? 20 : W - 40, y0: rand(132, 182), vx: fromLeft ? sp : -sp, ph: rand(0, 6), col: BIRD_COLORS[Math.floor(rand(0, BIRD_COLORS.length))] });
    g.nextBird = rand(55, 105) / (1 + (L - 1) * .12);
  }
  if ((g.nextTreat -= dt) <= 0) { g.treats.push({ x: rand(40, W - 60), y: -10, vy: rand(1.1, 1.6), rest: 0 }); g.nextTreat = rand(170, 260) + (L - 1) * 12; }
  if (L >= 2 && (g.nextVac -= dt) <= 0) {
    const fromLeft = Math.random() < .5, sp = 1.4 + (L - 2) * .25;
    g.vacs.push({ x: fromLeft ? -30 : W + 2, vx: fromLeft ? sp : -sp });
    g.nextVac = rand(380, 560) / (1 + (L - 2) * .1);
  }

  // Birds (outside the window, between x 24 and 456)
  for (const b of g.birds) {
    b.x += b.vx * dt; b.y = b.y0 + Math.sin(g.t * .08 + b.ph) * 6;
    if (!b.done && hit(cb, { x: b.x, y: b.y, w: 21, h: 9 })) {
      b.done = true;
      g.combo = g.t - g.lastCatch < 150 ? g.combo + 1 : 1; g.lastCatch = g.t;
      const pts = 10 * g.combo; g.score += pts; g.birdsSeen++; g.energy = Math.min(100, g.energy + 3);
      pop(g.combo > 1 ? `x${g.combo} +${pts}` : `+${pts}`, b.x, b.y - 6, '#d7ff61'); hearts(b.x + 10, b.y);
    }
  }
  g.birds = g.birds.filter(b => !b.done && b.x > 0 && b.x < W - 20);

  // Treats
  for (const t of g.treats) {
    if (t.y < FLOOR - 6) t.y += t.vy * dt; else { t.y = FLOOR - 6; t.rest += dt; }
    if (!t.done && hit(cb, { x: t.x, y: t.y, w: 14, h: 6 })) {
      t.done = true; g.energy = Math.min(100, g.energy + 28); g.score += 5; g.treatsEaten++;
      pop('NOM!', t.x, t.y - 8, '#ffd099');
    }
  }
  g.treats = g.treats.filter(t => !t.done && t.rest < 240);

  // Vacuums
  for (const v of g.vacs) {
    v.x += v.vx * dt;
    if (c.inv <= 0 && hit(cb, { x: v.x + 4, y: FLOOR - 18 + 2, w: 20, h: 16 })) {
      c.inv = 70; g.energy -= 22; c.vy = -4.5; c.ground = false; c.x += v.vx > 0 ? 18 : -18;
      pop('HISS!', c.x, c.y - 10, '#ff8f80'); g.combo = 0;
    }
  }
  g.vacs = g.vacs.filter(v => v.x > -40 && v.x < W + 40);

  // Clouds + effects
  for (const cl of g.clouds) { cl.x += cl.s * dt; if (cl.x > W) cl.x = -60; }
  for (const f of g.fx) { f.life -= dt; f.y += f.vy * dt; if (f.vx) f.x += f.vx * dt; }
  g.fx = g.fx.filter(f => f.life > 0);

  if (g.energy <= 0) { g.energy = 0; hud(); gameOver(); }
}

/* ---------- Render ---------- */
const SKIES = [['#8fd0ff', '#dff3ff'], ['#ffc98f', '#ffe7c4'], ['#7b69c9', '#f49ac1'], ['#141633', '#2f2b63']];
function render() {
  const g = G, phase = (g.level - 1) % 4, [top, bot] = SKIES[phase];
  // room
  ctx.fillStyle = '#231e35'; ctx.fillRect(0, 0, W, H);
  for (let x = 0; x < W; x += 16) { ctx.fillStyle = (x / 16) % 2 ? '#262038' : '#231e35'; ctx.fillRect(x, 0, 8, FLOOR); }
  // window + sky
  const wx = 24, wy = 18, ww = W - 48, wh = 178;
  const grd = ctx.createLinearGradient(0, wy, 0, wy + wh); grd.addColorStop(0, top); grd.addColorStop(1, bot);
  ctx.fillStyle = grd; ctx.fillRect(wx, wy, ww, wh);
  if (phase === 3) { ctx.fillStyle = '#fff'; for (let i = 0; i < 40; i++) { const sx = (i * 97) % ww, sy = (i * 53) % (wh - 40); if ((Math.floor(g.t / 20) + i) % 7) ctx.fillRect(wx + sx, wy + sy, 1, 1); } ctx.fillStyle = '#fff6c9'; ctx.fillRect(wx + ww - 70, wy + 20, 14, 14); }
  else { ctx.fillStyle = phase === 2 ? '#ffd7a8' : '#fff4b0'; ctx.fillRect(wx + ww - 70, wy + 22 + phase * 18, 16, 16); }
  ctx.fillStyle = phase === 3 ? '#3a3770' : '#ffffffcc';
  for (const cl of g.clouds) { ctx.fillRect(cl.x, cl.y, 44, 8); ctx.fillRect(cl.x + 8, cl.y - 6, 24, 6); ctx.fillRect(cl.x + 30, cl.y - 3, 10, 3); }
  // distant trees
  ctx.fillStyle = phase === 3 ? '#1d2a2a' : '#5c8f6a';
  for (let x = wx; x < wx + ww; x += 22) { const h = 16 + ((x * 7) % 13); ctx.fillRect(x, wy + wh - h, 18, h); }
  // birds (outside, behind the frame)
  for (const b of g.birds) sprite(Math.floor(g.t / 8) % 2 ? BIRD_UP : BIRD_DN, b.x, b.y, 3, { B: b.col, E: '#2b2133', O: '#f2a541' }, b.vx < 0);
  // frame bars
  ctx.fillStyle = '#e8dcc4';
  ctx.fillRect(wx - 6, wy - 6, ww + 12, 6); ctx.fillRect(wx - 6, wy + wh, ww + 12, 6);
  ctx.fillRect(wx - 6, wy, 6, wh); ctx.fillRect(wx + ww, wy, 6, wh);
  ctx.fillRect(wx + ww / 2 - 2, wy, 4, wh); ctx.fillRect(wx, wy + wh / 2 - 2, ww, 3);
  // curtains
  ctx.fillStyle = '#ff9ec7'; for (let i = 0; i < 4; i++) { ctx.fillRect(4 + i * 4, 10, 3, 186 - i * 6); ctx.fillRect(W - 7 - i * 4, 10, 3, 186 - i * 6); }
  ctx.fillStyle = '#d7ff61'; ctx.fillRect(0, 8, W, 3);
  // floor / sill
  ctx.fillStyle = '#5b3f37'; ctx.fillRect(0, FLOOR, W, H - FLOOR);
  ctx.fillStyle = '#8a5d4a'; ctx.fillRect(0, FLOOR, W, 3);
  ctx.fillStyle = '#4b332d'; for (let x = 0; x < W; x += 40) ctx.fillRect(x, FLOOR + 10, 26, 2);
  // plant
  ctx.fillStyle = '#c96f4a'; ctx.fillRect(W - 46, FLOOR - 16, 18, 16);
  ctx.fillStyle = '#7bc47f'; ctx.fillRect(W - 44, FLOOR - 28, 4, 12); ctx.fillRect(W - 38, FLOOR - 34, 4, 18); ctx.fillRect(W - 32, FLOOR - 26, 4, 10);
  // treats, vacuums
  for (const t of g.treats) if (!(t.rest > 180 && Math.floor(t.rest / 6) % 2)) sprite(TREAT, t.x, t.y, 2, { O: '#f2a541' });
  for (const v of g.vacs) sprite(VAC, v.x, FLOOR - 18, 2, { G: '#9a95b0', R: '#c94f5c', W: '#ffd6dc', K: '#1a1626' }, v.vx < 0);
  // Babia
  const c = g.cat;
  if (!(c.inv > 0 && Math.floor(c.inv / 5) % 2)) {
    const blink = state !== 'over' && Math.floor(g.t / 6) % 50 === 0;
    const asleep = state === 'over';
    const pal = (blink || asleep) ? { ...PAL, G: PAL.D } : PAL;
    const legs = !c.ground ? LEGS_J : (Math.floor(c.walk / 7) % 2 ? LEGS_B : LEGS_A);
    sprite(CAT.concat(legs), c.x, c.y, S, pal, c.face < 0);
    if (asleep) { ctx.fillStyle = '#d7ff61'; ctx.font = `8px ${FONT}`; ctx.fillText('z', c.x + 30, c.y - 4); ctx.fillText('Z', c.x + 38, c.y - 14); }
  }
  // effects
  for (const f of g.fx) {
    ctx.globalAlpha = Math.min(1, f.life / 20);
    if (f.kind === 'text') { ctx.font = `8px ${FONT}`; ctx.fillStyle = '#1a1626'; ctx.fillText(f.text, f.x + 1, f.y + 1); ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y); }
    else { ctx.fillStyle = '#ff6f9f'; ctx.fillRect(f.x, f.y, 2, 2); ctx.fillRect(f.x + 3, f.y, 2, 2); ctx.fillRect(f.x, f.y + 2, 5, 2); ctx.fillRect(f.x + 1, f.y + 4, 3, 1); }
  }
  ctx.globalAlpha = 1;
  // scanlines
  ctx.fillStyle = '#00000014'; for (let y = 0; y < H; y += 2) ctx.fillRect(0, y, W, 1);
}

/* ---------- Loop ---------- */
function loop(ts) {
  const dt = Math.min(3, (ts - (last || ts)) / (1000 / 60)); last = ts;
  if (state === 'play' && !paused) { update(dt); hud(); }
  else if (state === 'title') { G.t += dt; for (const cl of G.clouds) { cl.x += cl.s * dt; if (cl.x > W) cl.x = -60; } }
  render();
  raf = requestAnimationFrame(loop);
}
titleScreen();
document.fonts && document.fonts.ready.then(render);
raf = requestAnimationFrame(loop);
window.__babia = { get state() { return state; }, get G() { return G; }, act };
})();

/* ---------- Babia intro: typed speech bubble ---------- */
(() => {
  const box = document.getElementById('babiaType');
  if (!box) return;
  const lines = ['Hi! This is Babia.', 'I love to watch birds.', 'I eat, sleep and repeat...'];
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let started = false;
  const start = () => {
    if (started) return; started = true;
    const zone = box.closest('.cat-zone'); if (zone) zone.classList.add('in');
    if (reduce) { box.innerHTML = lines.map(l => `<span class="ln">${l}</span>`).join(''); box.classList.add('done'); return; }
    let li = 0, ci = 0, cur = null;
    const tick = () => {
      if (li >= lines.length) { box.classList.add('done'); return; }
      if (!cur) { cur = document.createElement('span'); cur.className = 'ln'; box.appendChild(cur); }
      if (ci < lines[li].length) { cur.textContent += lines[li][ci++]; setTimeout(tick, lines[li][ci - 1] === '.' ? 260 : 55); }
      else { li++; ci = 0; cur = null; setTimeout(tick, 650); }
    };
    tick();
  };
  new IntersectionObserver((es, o) => es.forEach(e => { if (e.isIntersecting) { start(); o.disconnect(); } }), { threshold: .4 }).observe(box);

  // Treat counter on the photo
  const btn = document.getElementById('treatBtn'), out = document.getElementById('treatScore'), frame = document.getElementById('babiaFrame');
  let n = 0;
  if (btn) btn.addEventListener('click', () => {
    n++; out.textContent = n;
    btn.textContent = n % 3 === 0 ? 'PURR +1 😺' : 'GIVE A TREAT 🐟';
    if (frame) { const h = document.createElement('span'); h.className = 'float-heart'; h.textContent = n % 3 === 0 ? '♥' : '🐟'; h.style.left = (30 + Math.random() * 40) + '%'; frame.appendChild(h); setTimeout(() => h.remove(), 1300); }
  });
})();

/* ---------- Arcade page extras: Dota stat count-up, videos only play when visible ---------- */
(() => {
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stats = document.querySelectorAll('[data-count]');
  const ob = new IntersectionObserver((es, o) => es.forEach(e => {
    if (!e.isIntersecting) return; o.unobserve(e.target);
    const el = e.target, to = +el.dataset.count, dec = +(el.dataset.dec || 0), pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
    if (reduce) return;
    const t0 = performance.now(), ms = 1200;
    (function f(t) { const p = Math.min(1, (t - t0) / ms), v = to * (1 - Math.pow(1 - p, 3)); el.textContent = pre + v.toFixed(dec) + suf; if (p < 1) requestAnimationFrame(f); })(t0);
  }), { threshold: .6 });
  stats.forEach(s => ob.observe(s));
  const vids = document.querySelectorAll('video[autoplay]');
  const vo = new IntersectionObserver(es => es.forEach(e => { const v = e.target; if (e.isIntersecting && !reduce) { const p = v.play(); if (p) p.catch(() => {}); } else v.pause(); }), { threshold: .2 });
  vids.forEach(v => { if (reduce) v.removeAttribute('autoplay'); vo.observe(v); });
  // Photo stack: click to shuffle
  const stack = document.getElementById('babiaFrame');
  if (stack) stack.addEventListener('click', e => { const f = e.target.closest('.ps'); if (!f) return; const all = [...stack.querySelectorAll('.ps')]; const top = all[all.length - 1]; if (f === top) stack.insertBefore(top, all[0]); else stack.insertBefore(f, stack.querySelector('.babia-tag')); });
})();

/* Favorite heroes: reveal on scroll; fall back to an older Valve image URL, then to initials */
(() => {
  const box = document.querySelector('.fav-heroes');
  if (!box) return;
  new IntersectionObserver((es, o) => es.forEach(e => { if (e.isIntersecting) { box.classList.add('in'); o.disconnect(); } }), { threshold: .2 }).observe(box);
  box.querySelectorAll('.hero-img img').forEach(img => {
    const fail = () => {
      if (img.dataset.altSrc) { const a = img.dataset.altSrc; delete img.dataset.altSrc; img.src = a; }
      else img.parentElement.classList.add('noimg');
    };
    img.addEventListener('error', fail);
    if (img.complete && img.naturalWidth === 0 && img.src) fail();
  });
})();
