/* Play Analyst — KPI Detective, Bottleneck Factory, Calibration Challenge.
   Content lives in lab-data.js. */
(() => {
const D = window.LAB_DATA;
const stage = document.getElementById('labStage');
if (!D || !stage) return;

const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
/* Pick a case the visitor hasn't seen yet; reset once all have been played. */
function pickFresh(key, n) {
  let seen = store.get(key, []).filter(i => i < n);
  let pool = [...Array(n).keys()].filter(i => !seen.includes(i));
  if (!pool.length) { seen = []; pool = [...Array(n).keys()]; }
  const last = store.get(key + '-last', -1);
  if (pool.length > 1) pool = pool.filter(i => i !== last);
  const i = pool[Math.floor(Math.random() * pool.length)];
  seen.push(i); store.set(key, seen); store.set(key + '-last', i);
  return i;
}
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pad2 = n => String(n).padStart(2, '0');
function countUp(el, to, fmt, ms = 650) {
  if (reduce) { el.textContent = fmt(to); return; }
  const t0 = performance.now();
  (function f(t) { const p = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - p, 3); el.textContent = fmt(to * e); if (p < 1) requestAnimationFrame(f); })(t0);
}
function growBars(root) {
  requestAnimationFrame(() => requestAnimationFrame(() => root.querySelectorAll('[data-w]').forEach(b => b.style.width = b.dataset.w + '%')));
}
async function copyText(btn, text) {
  try { await navigator.clipboard.writeText(text); btn.textContent = 'Copied ✓'; } catch (e) { btn.textContent = 'Copy not available'; }
}

/* =====================================================================
   KPI DETECTIVE
   ===================================================================== */
const KPI = (() => {
  const REG = { North: .3, South: .25, East: .25, West: .2 };
  const CH = { Web: .45, App: .35, Store: .2 };
  const DEV = { Web: { Desktop: .55, iOS: .25, Android: .2 }, App: { iOS: .5, Android: .5 }, Store: { 'In-store': 1 } };
  const DIMS = ['Region', 'Channel', 'Device', 'Category'], MAXQ = 8, BASE = 1200000;
  function catMix(r, ch, dv) {
    const m = dv === 'Android' ? { Electronics: .55, Home: .25, Apparel: .2 } : { Electronics: .4, Home: .35, Apparel: .25 };
    if (r === 'West') m.Home *= 1.5;
    if (ch === 'Store') m.Apparel *= 1.6;
    const s = m.Electronics + m.Home + m.Apparel; for (const k in m) m[k] /= s; return m;
  }
  const match = (row, f) => Object.entries(f).every(([k, v]) => Array.isArray(v) ? v.includes(row[k]) : row[k] === v);
  function gen(c, rnd = Math.random) {
    const rows = [];
    for (const r in REG) for (const ch in CH) for (const dv in DEV[ch]) {
      const cm = catMix(r, ch, dv);
      for (const cat in cm) {
        const base = BASE * REG[r] * CH[ch] * DEV[ch][dv] * cm[cat];
        const row = { Region: r, Channel: ch, Device: dv, Category: cat };
        let l = base * (0.975 + rnd() * .05), cu = base * (0.975 + rnd() * .05);
        for (const e of c.effects) if (match(row, e.f)) { if (e.cur != null) cu *= e.cur; if (e.last != null) l *= e.last; }
        row.last = l; row.cur = cu; rows.push(row);
      }
    }
    return rows;
  }
  D._kpi = { gen, match }; // used by tests

  let S, el;
  const fmt = v => (v < 0 ? '−$' : '$') + Math.abs(Math.round(v)).toLocaleString('en-US');
  const pct = v => (v >= 0 ? '+' : '−') + Math.abs(v * 100).toFixed(1) + '%';
  const sum = a => a.reduce((s, r) => ({ l: s.l + r.last, c: s.c + r.cur }), { l: 0, c: 0 });
  const sub = () => S.rows.filter(r => Object.entries(S.filters).every(([k, v]) => r[k] === v));
  const scope = () => Object.keys(S.filters).length ? Object.entries(S.filters).map(([k, v]) => `${k} = ${v}`).join(' · ') : 'All orders';
  const q = id => el.querySelector('#' + id);

  function mount(root) {
    el = root;
    el.innerHTML = `
      <div class="g-head">
        <div><p class="g-kicker">Case file <span id="kNum"></span> / ${pad2(D.kpi.length)}</p><h2 id="kTitle"></h2><p class="g-lede" id="kStory"></p></div>
        <div class="g-head-side"><button class="lab-btn ghost" id="kNew">New case ↻</button><p class="g-rule hand">8 queries. Each breakdown costs one; filtering is free.</p></div>
      </div>
      <div class="k-kpis" id="kKpis"></div>
      <section class="g-panel">
        <div class="g-panel-h"><h3>Investigate</h3><span class="q-dots" id="kDots" aria-label="Queries left"></span></div>
        <div class="k-crumbs" id="kCrumbs"></div>
        <div class="k-dims" id="kDims"></div>
        <div id="kResult" class="k-result"></div>
      </section>
      <div class="g-split">
        <section class="g-panel notes"><h3>Case notes</h3><ol id="kLog"></ol></section>
        <section class="g-panel"><h3>Name the root cause</h3><div class="g-opts" id="kOpts"></div><button class="lab-btn" id="kClose">Close the case</button><p class="g-err" id="kErr"></p></section>
      </div>
      <div id="kVerdict"></div>`;
    q('kNew').onclick = () => newCase(true);
    q('kClose').onclick = closeCase;
    newCase(false);
  }
  function newCase(scroll) {
    const i = pickFresh('lab-kpi', D.kpi.length), c = D.kpi[i];
    S = { c, i, rows: gen(c), filters: {}, left: MAXQ, log: [], result: null, solved: false };
    q('kNum').textContent = pad2(i + 1);
    q('kTitle').textContent = c.title;
    q('kStory').textContent = c.story;
    q('kVerdict').innerHTML = '';
    q('kErr').textContent = '';
    q('kClose').disabled = false;
    q('kOpts').innerHTML = shuffle(c.options).map(o => `<label><input type="radio" name="kCause" value="${o.id}"><span>${o.t}</span></label>`).join('');
    render(true);
    if (scroll) stage.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }
  function render(animateKpis) {
    const a = sum(S.rows), s = sum(sub()), f = Object.keys(S.filters).length;
    const block = (title, x) => `<div class="k-block"><p class="g-kicker">${title}</p><div class="k-stats">
      <div><span>Last Tuesday</span><b data-n="${x.l}">${fmt(x.l)}</b></div>
      <div><span>This Tuesday</span><b data-n="${x.c}">${fmt(x.c)}</b></div>
      <div><span>Change</span><b class="${x.c < x.l ? 'neg' : 'pos'}" data-p="${(x.c - x.l) / x.l}">${pct((x.c - x.l) / x.l)}</b></div></div></div>`;
    q('kKpis').innerHTML = block('Company revenue', a) + (f ? block('Current view · ' + scope(), s) : '');
    if (animateKpis || f) {
      q('kKpis').querySelectorAll('[data-n]').forEach(b => countUp(b, +b.dataset.n, fmt));
      q('kKpis').querySelectorAll('[data-p]').forEach(b => countUp(b, +b.dataset.p, pct));
    }
    q('kDots').innerHTML = Array.from({ length: MAXQ }, (_, i) => `<i class="${i < S.left ? 'on' : ''}"></i>`).join('') + `<small>${S.left} left</small>`;
    const keys = Object.keys(S.filters);
    q('kCrumbs').innerHTML = '<span class="g-label">View</span>' + (keys.length
      ? keys.map(k => `<span class="chip">${k}: ${S.filters[k]}<button aria-label="Remove ${k} filter" data-rm="${k}">×</button></span>`).join('')
      : '<span class="chip">All orders</span>');
    q('kCrumbs').querySelectorAll('[data-rm]').forEach(b => b.onclick = () => { delete S.filters[b.dataset.rm]; S.result = null; render(); });
    q('kDims').innerHTML = '<span class="g-label">Break down by</span>' + DIMS.map(d => `<button class="lab-btn small" data-d="${d}" ${S.filters[d] || !S.left || S.solved || new Set(sub().map(r => r[d])).size < 2 ? 'disabled' : ''}>${d}</button>`).join('');
    q('kDims').querySelectorAll('[data-d]').forEach(b => b.onclick = () => breakdown(b.dataset.d));
    renderResult();
    q('kLog').innerHTML = S.log.length ? S.log.map(l => `<li>${l}</li>`).join('') : '<li class="empty">Nothing yet. Start with a breakdown.</li>';
  }
  function breakdown(dim) {
    if (S.left <= 0 || S.solved) return;
    S.left--;
    const data = sub(), g = {};
    data.forEach(r => { const x = g[r[dim]] || (g[r[dim]] = { l: 0, c: 0 }); x.l += r.last; x.c += r.cur; });
    const t = sum(data), td = t.c - t.l;
    const list = Object.entries(g).map(([k, x]) => ({ k, l: x.l, c: x.c, d: x.c - x.l }))
      .sort((a, b) => td < 0 ? a.d - b.d : b.d - a.d);
    S.result = { dim, list, td, fresh: true };
    const top = list[0];
    S.log.push(`<span>${scope()}</span> → by ${dim}: biggest mover <b>${top.k}</b> (${pct(top.d / top.l)})`);
    render();
  }
  function renderResult() {
    const box = q('kResult');
    if (!S.result) { box.innerHTML = '<p class="g-hint">Pick a dimension to split the current view. Use <b>Drill in</b> to filter into a row for free.</p>'; return; }
    const { dim, list, td, fresh } = S.result, up = td > 0;
    box.innerHTML = `<table class="k-table ${fresh ? 'fresh' : ''}"><thead><tr><th>${dim}</th><th class="num hide-sm">Last Tue</th><th class="num">This Tue</th><th class="num">Change</th><th>Share of ${up ? 'gain' : 'drop'}</th><th></th></tr></thead><tbody>` +
      list.map((x, i) => {
        const sh = td && Math.sign(x.d) === Math.sign(td) ? x.d / td : 0;
        return `<tr style="--i:${i}"><td><b>${x.k}</b></td><td class="num hide-sm">${fmt(x.l)}</td><td class="num">${fmt(x.c)}</td>
          <td class="num ${x.d < 0 ? 'neg' : 'pos'}">${pct(x.d / x.l)}</td>
          <td class="share"><div class="bar ${up ? 'up' : ''}"><i data-w="${Math.min(100, sh * 100).toFixed(0)}"></i></div><small>${sh ? Math.min(100, Math.round(sh * 100)) + '%' : '·'}</small></td>
          <td>${list.length > 1 && !S.solved ? `<button class="drill" data-k="${x.k}">Drill in →</button>` : ''}</td></tr>`;
      }).join('') + '</tbody></table>';
    S.result.fresh = false;
    box.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { S.filters[dim] = b.dataset.k; S.result = null; render(); });
    growBars(box);
  }
  function closeCase() {
    const pick = el.querySelector('input[name=kCause]:checked');
    if (!pick) { q('kErr').textContent = 'Choose a root cause first.'; return; }
    q('kErr').textContent = '';
    S.solved = true; q('kClose').disabled = true;
    el.querySelectorAll('input[name=kCause]').forEach(i => i.disabled = true);
    const c = S.c, used = MAXQ - S.left, ok = pick.value === c.answer;
    const score = ok ? Math.min(100, 70 + S.left * 5) : 0;
    const rank = !ok ? 'Wrong suspect' : score >= 95 ? 'Chief Data Detective' : score >= 85 ? 'Senior Analyst' : score >= 75 ? 'Analyst' : 'Junior Analyst';
    const chosen = c.options.find(o => o.id === pick.value), right = c.options.find(o => o.id === c.answer);
    q('kVerdict').innerHTML = `<section class="verdict ${ok ? 'win' : 'lose'}">
      <div class="stamp">${ok ? 'SOLVED' : 'COLD CASE'}</div>
      <p class="g-kicker">Verdict</p>
      <div class="v-score"><b id="kScore">0</b><span>/ 100 · ${rank}</span></div>
      <p>You used ${used} of ${MAXQ} queries.</p>
      ${ok ? '' : `<p><b>Why not “${chosen.t}”?</b> ${chosen.why || ''}</p><p><b>The answer:</b> ${right.t}.</p>`}
      <p><b>What really happened:</b> ${c.truth}</p>
      <div class="lesson"><b>The lesson.</b> ${c.lesson}</div>
      <div class="g-actions"><button class="lab-btn" id="kNext">Next case →</button><button class="lab-btn ghost" id="kShare">Copy my result</button></div>
    </section>`;
    countUp(q('kScore'), score, v => Math.round(v), 900);
    q('kNext').onclick = () => newCase(true);
    q('kShare').onclick = e => copyText(e.target, `KPI Detective, case “${c.title}”: ${score}/100 (${rank}) in ${used} queries.`);
    render();
    q('kVerdict').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
  }
  return { mount };
})();

/* =====================================================================
   BOTTLENECK FACTORY
   ===================================================================== */
const BOTTLE = (() => {
  const SHIFT = 480;
  let S, el, token = 0;
  const q = id => el.querySelector('#' + id);
  function allocs(n, k) { if (k === 1) return [[n]]; const o = []; for (let a = 1; a <= n - (k - 1); a++) for (const r of allocs(n - a, k - 1)) o.push([a, ...r]); return o; }
  const thr = (r, w) => Math.min(...r.map((x, i) => x * w[i]));
  function solve(f) {
    const r = f.stations.map(s => s.r); let best = -1, alloc = null;
    for (const a of allocs(f.workers, r.length)) { const t = thr(r, a); if (t > best) { best = t; alloc = a; } }
    return { best, alloc };
  }
  D._bottle = { solve, thr }; // used by tests

  function mount(root) {
    el = root;
    el.innerHTML = `
      <div class="g-head">
        <div><p class="g-kicker">Factory <span id="bNum"></span> / ${pad2(D.factories.length)} · <span id="bLvl"></span></p><h2 id="bTitle"></h2><p class="g-lede" id="bBrief"></p></div>
        <div class="g-head-side"><button class="lab-btn ghost" id="bNew">New factory ↻</button><p class="g-rule hand">8-hour shift. Every station needs at least one person.</p></div>
      </div>
      <div id="bUps"></div>
      <div class="b-line" id="bLine"></div>
      <div class="b-panel">
        <div><span class="g-label">Completed</span><div class="b-out"><b id="bOut">0</b> <small id="bUnit"></small></div></div>
        <div class="b-prog"><i id="bBar"></i></div>
        <div class="b-clock" id="bClock">Hour 0.0 / 8</div>
        <button class="lab-btn" id="bRun">▶ Run shift</button>
      </div>
      <div id="bMsg"></div>
      <ol class="b-hist" id="bHist"></ol>`;
    q('bNew').onclick = () => newFactory(true);
    q('bRun').onclick = run;
    newFactory(false);
  }
  function newFactory(scroll) {
    token++;
    const i = pickFresh('lab-bottle', D.factories.length), f = D.factories[i], sol = solve(f);
    S = { f, i, sol, level: 1, workers: f.start.slice(), running: false, live: null, last: null, hist: [], fails: 0, first: null, pick: null };
    q('bNum').textContent = pad2(i + 1);
    q('bTitle').textContent = `${f.name} ${f.e}`;
    q('bUnit').textContent = f.unit;
    q('bMsg').innerHTML = '';
    render();
    if (scroll) stage.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }
  const goal = () => S.sol.best * SHIFT / 60;
  const pool = () => S.f.workers - S.workers.reduce((a, b) => a + b, 0);
  function rates() {
    const r = S.f.stations.map(s => s.r);
    if (S.level === 2 && S.pick != null) { const u = S.f.upgrades[S.pick]; r[u.s] = u.r; }
    return r;
  }
  function render() {
    const f = S.f;
    q('bLvl').textContent = S.level === 1 ? 'Level 1 of 2' : 'Level 2 of 2';
    if (S.level === 1) {
      q('bBrief').innerHTML = `Assign <b>${f.workers} people</b> across the line. Goal: get <b>${goal()} ${f.unit}</b> through the line in one shift. Still to assign: <b class="pool ${pool() ? '' : 'done'}">${pool()}</b>`;
      q('bUps').innerHTML = '';
    } else {
      q('bBrief').innerHTML = `Your line is balanced at <b>${S.workers.join(' / ')}</b> and finishes ${goal()} ${f.unit} a shift. Leadership approves <b>one</b> upgrade. Which one should you buy?`;
      if (!q('bUps').childElementCount) {
        q('bUps').innerHTML = '<div class="b-ups">' + f.upgrades.map((u, k) => `<label style="--i:${k}"><input type="radio" name="bUp" value="${k}"><span><b>${u.t}</b><small>${f.stations[u.s].n}: ${f.stations[u.s].r} → ${u.r} per person/hr</small></span></label>`).join('') + '</div>';
        el.querySelectorAll('input[name=bUp]').forEach(r => r.onchange = () => { S.pick = +r.value; S.last = null; render(); });
      }
    }
    renderLine(); renderPanel();
  }
  function renderLine() {
    const f = S.f, r = rates(), cap = r.map((x, i) => x * S.workers[i]), minCap = Math.min(...cap);
    const buf = S.live ? S.live.buf : (S.last ? S.last.buf : f.stations.slice(1).map(() => 0));
    const scale = Math.max(20, goal() * .5);
    const line = q('bLine');
    line.style.gridTemplateColumns = f.stations.map((_, i) => i < f.stations.length - 1 ? 'minmax(0,1fr) 54px' : 'minmax(0,1fr)').join(' ');
    let h = '';
    f.stations.forEach((s, i) => {
      const bn = S.last && !S.running && cap[i] === minCap;
      h += `<div class="b-st ${bn ? 'bn' : ''} ${S.running ? 'busy' : ''}">${bn ? '<span class="tag">bottleneck</span>' : ''}
        <div class="em">${s.e}</div><div class="nm">${s.n}</div>
        <div class="rt">${r[i]} ${f.unit}/hr per person</div>
        <div class="ppl" aria-label="${S.workers[i]} people">${'<i></i>'.repeat(S.workers[i])}</div>
        ${S.level === 1 ? `<div class="ctl"><button data-i="${i}" data-d="-1" ${S.running || S.workers[i] <= 1 ? 'disabled' : ''} aria-label="Remove person from ${s.n}">−</button><button data-i="${i}" data-d="1" ${S.running || pool() <= 0 ? 'disabled' : ''} aria-label="Add person to ${s.n}">+</button></div>` : ''}
        ${S.last && !S.running ? `<div class="stat">Capacity <b>${cap[i]}/hr</b><br>Busy ${Math.round(S.last.util[i] * 100)}%<div class="ubar"><i data-w="${Math.round(S.last.util[i] * 100)}"></i></div></div>` : ''}
      </div>`;
      if (i < f.stations.length - 1) {
        const n = Math.floor(buf[i] + 1e-6), p = Math.min(100, n / scale * 100);
        h += `<div class="b-buf"><div class="tank" style="--p:${p}%"><i></i></div><b>${n}</b><span>waiting</span></div>`;
      }
    });
    line.innerHTML = h;
    line.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { S.workers[+b.dataset.i] += +b.dataset.d; S.last = null; q('bMsg').innerHTML = ''; render(); });
    if (S.last && !S.running) growBars(line);
  }
  function renderPanel() {
    const m = S.live ? S.live.m : (S.last ? SHIFT : 0);
    const done = S.live ? S.live.done : (S.last ? S.last.units : 0);
    q('bOut').textContent = Math.floor(done + 1e-6);
    q('bBar').style.width = (m / SHIFT * 100) + '%';
    q('bClock').textContent = `Hour ${(m / 60).toFixed(1)} / 8`;
    const needPick = S.level === 2 && S.pick == null;
    q('bRun').disabled = S.running || (S.level === 1 && pool() > 0) || needPick;
    q('bRun').textContent = S.running ? 'Running…' : (S.level === 1 && pool() > 0 ? 'Assign everyone first' : needPick ? 'Pick an upgrade' : '▶ Run shift');
    q('bNew').disabled = S.running;
    q('bHist').innerHTML = S.hist.map(x => `<li>${x}</li>`).join('');
  }
  function run() {
    if (S.running) return;
    S.running = true; q('bMsg').innerHTML = '';
    const my = token, r = rates(), cap = r.map((x, i) => x * S.workers[i] / 60), n = cap.length;
    const buf = Array(n - 1).fill(0), proc = Array(n).fill(0); let done = 0, m = 0;
    const perFrame = reduce ? SHIFT : 4;
    (function step() {
      if (my !== token) return;
      for (let k = 0; k < perFrame && m < SHIFT; k++, m++) {
        proc[0] += cap[0]; buf[0] += cap[0];
        for (let i = 1; i < n; i++) { const p = Math.min(cap[i], buf[i - 1]); buf[i - 1] -= p; proc[i] += p; if (i < n - 1) buf[i] += p; else done += p; }
      }
      S.live = { buf: buf.slice(), done, m };
      renderLine(); renderPanel();
      if (m < SHIFT) requestAnimationFrame(step); else finish(cap, proc, done, buf);
    })();
  }
  function finish(cap, proc, done, buf) {
    const f = S.f;
    S.running = false; S.live = null;
    const units = Math.floor(done + 1e-6);
    S.last = { units, util: proc.map((p, i) => p / (cap[i] * SHIFT)), buf: buf.slice() };
    const c = rates().map((x, i) => x * S.workers[i]), bi = c.indexOf(Math.min(...c)), bn = f.stations[bi];
    let html = '';
    if (S.level === 1) {
      S.hist.push(`Staffing ${S.workers.join(' / ')} → <b>${units}</b> ${f.unit}`);
      if (units >= goal()) {
        html = `<div class="b-msg win"><b>Perfect line: ${units} ${f.unit}.</b> That's the most ${f.workers} people can produce here. Every station can now handle at least ${S.sol.best} ${f.unit} an hour.
        <div class="lesson"><b>The lesson.</b> A process only moves as fast as its slowest step. Extra people anywhere else just grow the pile of half-finished work in front of the bottleneck. Some stations sat idle part of the shift, and that's fine: the goal is flow, not keeping everyone busy.</div>
        <div class="g-actions"><button class="lab-btn" id="bNext">Level 2 →</button></div></div>`;
      } else {
        S.fails++;
        html = `<div class="b-msg"><b>${units} ${f.unit}.</b> The goal is ${goal()}. Look where the work piled up: the station right after the biggest pile is holding the line back (<b>${bn.n}</b>, at ${c[bi]}/hr).` +
          (S.fails >= 3 ? `<br><br><span class="hand">Hint:</span> capacity = people × rate. Aim for every station to reach at least ${S.sol.best}/hr.` : '') + '</div>';
      }
    } else {
      const u = f.upgrades[S.pick], st = f.stations[u.s];
      if (S.first == null) S.first = S.pick;
      S.hist.push(`${u.t} → <b>${units}</b> ${f.unit}`);
      const base = goal();
      if (units > base) {
        const gain = Math.round((units - base) / base * 100), first = f.upgrades[S.first];
        html = `<div class="b-msg win"><b>${units} ${f.unit}, up ${gain}%.</b> ${st.n} was the constraint (${S.workers[u.s]} people × ${st.r}/hr = ${st.r * S.workers[u.s]}/hr). The upgrade lifts it, and the whole line speeds up.
        <div class="lesson"><b>The lesson (Theory of Constraints).</b> An hour gained at the bottleneck is an hour gained for the whole system. An hour gained anywhere else is a mirage. Before approving any improvement, ask: <i>is this step actually the constraint?</i></div>
        <p class="hand">${S.first === S.pick ? 'Got it on the first try. 🎯' : `In real life you'd get one shot. Your first pick was the ${first.t}.`}</p>
        <div class="g-actions"><button class="lab-btn" id="bAnother">Try another factory →</button></div></div>`;
      } else {
        html = `<div class="b-msg"><b>Still ${units} ${f.unit}.</b> The ${u.t.toLowerCase()} made ${st.n} faster, but ${st.n} wasn't the constraint. <b>${bn.n}</b> (${c[bi]}/hr) is still capping the line. Try another upgrade to compare.</div>`;
      }
    }
    q('bMsg').innerHTML = html;
    const nx = q('bNext'); if (nx) nx.onclick = () => { S.level = 2; S.workers = S.sol.alloc.slice(); S.last = null; S.hist = []; q('bMsg').innerHTML = ''; q('bUps').innerHTML = ''; render(); };
    const an = q('bAnother'); if (an) an.onclick = () => newFactory(true);
    render();
  }
  return { mount, stop: () => token++ };
})();

/* =====================================================================
   CALIBRATION CHALLENGE
   ===================================================================== */
const CAL = (() => {
  const N = 10;
  let S, el;
  const nf = (v, y) => y ? String(Math.round(v)) : Number(v).toLocaleString('en-US', { maximumFractionDigits: 3 });
  const parse = s => { const t = String(s).replace(/[,\s]/g, ''); return t === '' || isNaN(+t) ? null : +t; };
  function drawSet() {
    const n = D.questions.length;
    let seen = store.get('lab-cal-seen', []).filter(i => i < n);
    let fresh = shuffle([...Array(n).keys()].filter(i => !seen.includes(i)));
    if (fresh.length < N) { seen = []; fresh = shuffle([...Array(n).keys()]); }
    const set = fresh.slice(0, N);
    store.set('lab-cal-seen', seen.concat(set));
    return set;
  }
  function mount(root) { el = root; intro(); }
  function intro() {
    el.innerHTML = `<div class="c-intro">
      <p class="g-kicker">Decision making · ${D.questions.length}-question bank</p>
      <h2>10 questions. 90% confidence.</h2>
      <p class="g-lede">Don't guess an exact number. For each question, give a <b>range</b> you're <b>90% sure</b> contains the true answer: low enough and high enough that you'd only be surprised one time in ten.</p>
      <div class="c-demo" aria-hidden="true"><span class="lo">low</span><div class="c-demo-track"><i></i><em></em></div><span class="hi">high</span></div>
      <p class="hand">No searching. This tests your judgment, not your memory. Every round draws a new set.</p>
      <div class="g-actions"><button class="lab-btn" id="cGo">Start round</button></div></div>`;
    el.querySelector('#cGo').onclick = () => { S = { set: drawSet(), idx: 0, ans: [] }; question(); };
  }
  function question() {
    const qq = D.questions[S.set[S.idx]];
    el.innerHTML = `<div class="c-q">
      <div class="c-prog"><i style="width:${S.idx / N * 100}%"></i></div>
      <p class="g-kicker">Question ${S.idx + 1} of ${N}</p>
      <h2>${qq.q}</h2>
      <form id="cForm" autocomplete="off">
        <div class="c-inputs">
          <label>Low estimate <small>${qq.u}</small><input id="cLo" inputmode="decimal" aria-label="Low estimate"></label>
          <span class="c-to">to</span>
          <label>High estimate <small>${qq.u}</small><input id="cHi" inputmode="decimal" aria-label="High estimate"></label>
        </div>
        <p class="g-err" id="cErr"></p>
        <div class="g-actions"><button class="lab-btn" type="submit">${S.idx < N - 1 ? 'Next →' : 'See my results'}</button></div>
      </form></div>`;
    const lo = el.querySelector('#cLo');
    if (stage.getBoundingClientRect().top >= 0) lo.focus({ preventScroll: true });
    el.querySelector('#cForm').onsubmit = e => {
      e.preventDefault();
      const a = parse(lo.value), b = parse(el.querySelector('#cHi').value), err = el.querySelector('#cErr');
      if (a === null || b === null) { err.textContent = 'Please enter two numbers.'; return; }
      if (a > b) { err.textContent = 'Your low estimate should be smaller than your high estimate.'; return; }
      S.ans.push({ lo: a, hi: b }); S.idx++;
      S.idx < N ? question() : results();
    };
  }
  function results() {
    const Q = S.set.map(i => D.questions[i]);
    const hits = S.ans.filter((x, i) => x.lo <= Q[i].a && Q[i].a <= x.hi).length;
    const w = Q.map((qq, i) => qq.y ? null : (S.ans[i].hi - S.ans[i].lo) / qq.a).filter(x => x !== null);
    const avgW = w.length ? w.reduce((a, b) => a + b, 0) / w.length : 0;
    let title, body;
    if (hits >= 9 && avgW > 3) { title = 'Safe… maybe too safe'; body = 'You got almost all of them, but your ranges were very wide. A guess like “between 1 and a million” is always right, but it does not help anyone decide anything. Try tighter ranges next time.'; }
    else if (hits >= 9) { title = 'Well calibrated 🎯'; body = 'You said “90% sure,” and the answer landed inside your range about 9 times out of 10. That is exactly the goal, and it is rare.'; }
    else if (hits >= 7) { title = 'Close, a little too sure'; body = `The answer landed inside your range ${hits} times out of 10. The goal is 9, so make your ranges a bit wider.`; }
    else if (hits >= 4) { title = 'Too sure (like most people)'; body = `You aimed to be right 9 times out of 10, but the answer fell inside your range only ${hits} times. Most people land here: we usually feel more certain than we should.`; }
    else { title = 'Much too sure'; body = `The answer fell inside your range only ${hits} time${hits === 1 ? '' : 's'} out of 10. Your ranges were too narrow, so next time make them wider, even if it feels uncomfortable.`; }
    el.innerHTML = `<div class="c-res">
      <div class="c-res-head">
        <div class="c-dial" style="--p:${hits * 10}"><b id="cHits">0</b><span>/ 10</span></div>
        <div><p class="g-kicker">Your result</p><h2>${title}</h2><p>${body}</p></div>
      </div>
      <div class="lesson"><b>Why it matters.</b> At work we estimate all the time: how long a project will take, what it will cost, how many customers will buy. If we are too sure, deadlines slip and budgets run over. Good estimators give honest ranges, then check how often they were right.</div>
      <div class="c-rows">${Q.map((qq, i) => {
        const a = S.ans[i], hit = a.lo <= qq.a && qq.a <= a.hi;
        const lo = Math.min(a.lo, qq.a), hi = Math.max(a.hi, qq.a);
        const padv = (hi - lo) * .12 || Math.abs(qq.a) * .1 || 1, mn = lo - padv, mx = hi + padv;
        const p = v => (v - mn) / (mx - mn) * 100;
        return `<div class="c-row" style="--i:${i}"><div class="c-qt">${i + 1}. ${qq.q}</div>
          <div class="c-track"><div class="base"></div>
            <div class="rng ${hit ? 'hit' : 'miss'}" style="left:${p(a.lo).toFixed(2)}%;width:${Math.max(.8, p(a.hi) - p(a.lo)).toFixed(2)}%"></div>
            <div class="mk" style="left:${p(qq.a).toFixed(2)}%" title="True answer"></div></div>
          <div class="c-meta"><span>Your range: ${nf(a.lo, qq.y)} – ${nf(a.hi, qq.y)}${qq.y ? '' : ' ' + qq.u}</span><span>Answer: <b>${nf(qq.a, qq.y)}${qq.y ? '' : ' ' + qq.u}</b> · <em class="${hit ? 'hit' : 'miss'}">${hit ? 'Captured' : 'Missed'}</em></span></div></div>`;
      }).join('')}</div>
      <div class="g-actions"><button class="lab-btn" id="cAgain">New round ↻</button><button class="lab-btn ghost" id="cShare">Copy my result</button></div></div>`;
    countUp(el.querySelector('#cHits'), hits, v => Math.round(v), 900);
    el.querySelector('#cAgain').onclick = () => { S = { set: drawSet(), idx: 0, ans: [] }; question(); stage.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); };
    el.querySelector('#cShare').onclick = e => copyText(e.target, `I captured ${hits}/10 on the Calibration Challenge: “${title}”. How calibrated are you?`);
    stage.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }
  return { mount };
})();

/* =====================================================================
   GAME PICKER
   ===================================================================== */
const GAMES = { kpi: KPI, bottleneck: BOTTLE, calibration: CAL };
const picks = document.querySelectorAll('.lab-pick');
function open(id, scroll) {
  if (!GAMES[id]) id = 'kpi';
  BOTTLE.stop();
  picks.forEach(b => { const on = b.dataset.game === id; b.classList.toggle('active', on); b.setAttribute('aria-selected', on); });
  stage.className = 'lab-stage theme-' + id;
  void stage.offsetWidth;
  stage.classList.add('enter');
  GAMES[id].mount(stage);
  try { history.replaceState(null, '', '#' + id); } catch (e) {}
  if (scroll) stage.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
}
picks.forEach(b => b.addEventListener('click', () => open(b.dataset.game, true)));
open((location.hash || '').slice(1), false);
})();
