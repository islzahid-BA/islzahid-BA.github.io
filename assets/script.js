/* Shared site behaviour */

// Reveal-on-scroll
const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && e.target.classList.add("show")), { threshold: .12 });
document.querySelectorAll(".reveal").forEach(x => io.observe(x));

// Photography: typing intro — "Sometimes" … cursor blinks twice … "I stop measuring things."
(() => {
  const intro = document.getElementById('photoIntro'), typing = document.getElementById('typingLine');
  const cursor = document.getElementById('typeCursor'), skip = document.getElementById('photoSkip');
  if (!intro || !typing) return;
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const parts = [
    { text: 'Sometimes', speed: 95 },
    { pause: 1200 },                     // cursor blinks twice here
    { text: ' I stop measuring things.', speed: 70 },
    { pause: 1100 }
  ];
  let done = false;
  const finish = () => { if (done) return; done = true; intro.classList.add('hide'); document.dispatchEvent(new Event('intro:done')); };
  const solid = on => cursor && cursor.classList.toggle('solid', on);
  if (reduce) { typing.textContent = 'Sometimes I stop measuring things.'; setTimeout(finish, 1800); }
  else {
    let p = 0;
    const next = () => {
      if (done) return;
      if (p >= parts.length) return finish();
      const step = parts[p++];
      if (step.pause) { solid(false); return setTimeout(next, step.pause); }
      solid(true);
      let i = 0;
      const tick = () => {
        if (done) return;
        if (i < step.text.length) { typing.textContent += step.text[i++]; setTimeout(tick, step.speed); }
        else next();
      };
      tick();
    };
    setTimeout(next, 350);
  }
  if (skip) skip.addEventListener('click', finish);
})();

// Photos: slideshow, selected frames, gallery wall + lightbox (photo list in assets/photos.js)
(() => {
  const P = window.PHOTOS;
  if (!P) return;
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const full = p => 'assets/images/photos/' + p.file, thumb = p => 'assets/images/photos/thumbs/' + p.file;
  const $ = id => document.getElementById(id);

  /* --- Slideshow: cross-fade + slow zoom ("Ken Burns") --- */
  const box = $('slides');
  if (box) {
    const S = P.filter(p => p.slide), DUR = 6000;
    const moves = ['kb-a', 'kb-b', 'kb-c', 'kb-d'];
    box.innerHTML = S.map((p, i) => `<figure class="slide ${moves[i % 4]}" aria-hidden="true"><img ${i < 2 ? 'src' : 'data-src'}="${full(p)}" alt="${p.caption}" style="object-position:${p.focus || '50% 50%'}"></figure>`).join('');
    const slides = [...box.children], bar = $('slideBar'), count = $('slideCount'), place = $('slidePlace'), playBtn = $('slidePlay');
    let cur = -1, timer = 0, playing = !reduce, t0 = 0, left = DUR;
    const load = i => { const im = slides[i % slides.length].querySelector('img'); if (im.dataset.src) { im.src = im.dataset.src; delete im.dataset.src; } };
    function go(i) {
      i = (i + slides.length) % slides.length;
      if (cur >= 0) { slides[cur].classList.remove('on'); slides[cur].classList.add('off'); const old = slides[cur]; setTimeout(() => old.classList.remove('off'), 1600); }
      cur = i; load(i); load(i + 1);
      const sl = slides[i]; sl.classList.remove('off'); void sl.offsetWidth; sl.classList.add('on');
      slides.forEach((x, k) => x.setAttribute('aria-hidden', k !== i));
      count.textContent = String(i + 1).padStart(2, '0') + ' / ' + String(slides.length).padStart(2, '0');
      place.classList.remove('show'); void place.offsetWidth; place.textContent = S[i].caption; place.classList.add('show');
      restart();
    }
    function restart() {
      clearTimeout(timer); left = DUR;
      bar.style.transition = 'none'; bar.style.width = '0%'; void bar.offsetWidth;
      if (playing) run();
    }
    function run() {
      t0 = performance.now();
      bar.style.transition = `width ${left}ms linear`; bar.style.width = '100%';
      timer = setTimeout(() => go(cur + 1), left);
    }
    function pause() {
      if (!playing) return; playing = false; clearTimeout(timer);
      left = Math.max(0, left - (performance.now() - t0));
      const w = getComputedStyle(bar).width; bar.style.transition = 'none'; bar.style.width = w;
      playBtn.textContent = '▶'; playBtn.setAttribute('aria-label', 'Play slideshow');
    }
    function play() { if (playing) return; playing = true; playBtn.textContent = '❚❚'; playBtn.setAttribute('aria-label', 'Pause slideshow'); run(); }
    $('slideNext').onclick = () => go(cur + 1);
    $('slidePrev').onclick = () => go(cur - 1);
    playBtn.onclick = () => playing ? pause() : play();
    document.addEventListener('keydown', e => { const r = box.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return; if (e.key === 'ArrowRight') go(cur + 1); if (e.key === 'ArrowLeft') go(cur - 1); });
    let sx = null; box.parentElement.addEventListener('touchstart', e => sx = e.touches[0].clientX, { passive: true });
    box.parentElement.addEventListener('touchend', e => { if (sx == null) return; const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 50) go(cur + (dx < 0 ? 1 : -1)); sx = null; });
    document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
    const intro = $('photoIntro');
    const startCopy = () => document.getElementById('slideshow').classList.add('ready');
    if (intro && !intro.classList.contains('hide')) document.addEventListener('intro:done', startCopy, { once: true }); else startCopy();
    go(0);
    if (!playing) { playBtn.textContent = '▶'; playBtn.setAttribute('aria-label', 'Play slideshow'); }
  }

  /* --- Selected frames: reveal on scroll + gentle parallax --- */
  const grid = $('framesGrid');
  if (grid) {
    const F = P.filter(p => !p.slide).slice(0, 6);
    grid.innerHTML = F.map((p, i) => `<a class="frame f${i + 1}" href="gallery#${p.file.replace('.webp', '')}" style="--d:${i * 90}ms"><img src="${thumb(p)}" alt="${p.caption}" loading="lazy" width="${Math.round(p.w * .4)}" height="${Math.round(p.h * .4)}"><span>${p.caption}</span></a>`).join('');
    const tot = $('framesTotal'); if (tot) tot.textContent = P.length;
    const ob = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); ob.unobserve(e.target); } }), { threshold: .15 });
    grid.querySelectorAll('.frame').forEach(f => ob.observe(f));
    if (!reduce) {
      const items = [...grid.querySelectorAll('.frame img')];
      let ticking = false;
      const par = () => { ticking = false; items.forEach((im, i) => { const r = im.parentElement.getBoundingClientRect(); const c = (r.top + r.height / 2 - innerHeight / 2) / innerHeight; im.style.transform = `translateY(${(c * (i % 2 ? -18 : 18)).toFixed(1)}px) scale(1.08)`; }); };
      addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(par); } }, { passive: true }); par();
    }
  }

  const fc = document.querySelector('.frames-close');
  if (fc) new IntersectionObserver((es, o) => es.forEach(e => { if (e.isIntersecting) { fc.classList.add('in'); o.disconnect(); } }), { threshold: .3 }).observe(fc);

  /* --- Gallery wall + lightbox --- */
  const wall = $('photoWall');
  if (wall) {
    const count = $('galleryCount');
    if (count) count.textContent = `${P.length} photographs`;
    wall.innerHTML = P.map((p, i) => `<button class="wall-item" id="${p.file.replace('.webp', '')}" style="--i:${i % 12}" data-i="${i}" aria-label="Open photo: ${p.caption}">
      <img src="${thumb(p)}" alt="${p.caption}" loading="lazy" width="${Math.round(p.w * .4)}" height="${Math.round(p.h * .4)}"><span>${p.caption}</span></button>`).join('');
    const ob = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); ob.unobserve(e.target); } }), { threshold: .1 });
    wall.querySelectorAll('.wall-item').forEach(w => ob.observe(w));
    const lb = $('lightbox'), img = $('lbImg'), cap = $('lbCap');
    let cur = 0;
    const show = i => { cur = (i + P.length) % P.length; img.src = full(P[cur]); img.alt = P[cur].caption; cap.textContent = `${P[cur].caption}  ·  ${cur + 1} / ${P.length}`; };
    const open = i => { show(i); lb.classList.add('show'); lb.setAttribute('aria-hidden', 'false'); };
    const close = () => { lb.classList.remove('show'); lb.setAttribute('aria-hidden', 'true'); };
    wall.querySelectorAll('[data-i]').forEach(b => b.addEventListener('click', () => open(+b.dataset.i)));
    $('lbClose').onclick = close; $('lbPrev').onclick = () => show(cur - 1); $('lbNext').onclick = () => show(cur + 1);
    lb.addEventListener('click', e => { if (e.target === lb) close(); });
    document.addEventListener('keydown', e => { if (!lb.classList.contains('show')) return; if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') show(cur - 1); if (e.key === 'ArrowRight') show(cur + 1); });
    if (location.hash) { const k = P.findIndex(p => '#' + p.file.replace('.webp', '') === location.hash); if (k >= 0) setTimeout(() => open(k), 300); }
  }
})();

// Arcade: Treat Fund placeholder modal
(() => {
  const btn = document.getElementById('donateBtn'), modal = document.getElementById('donateModal'), x = document.getElementById('modalClose');
  if (!btn || !modal) return;
  btn.addEventListener('click', () => modal.classList.add('show'));
  x.addEventListener('click', () => modal.classList.remove('show'));
  modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('show'); });
})();

// V8: "Beyond Work" menu opens on tap (hover works on desktop); steps animate in
(() => {
  document.querySelectorAll('.nav-more').forEach(m => {
    const b = m.querySelector('.nav-more-btn');
    b.addEventListener('click', e => { e.stopPropagation(); const o = m.classList.toggle('open'); b.setAttribute('aria-expanded', o); });
    document.addEventListener('click', e => { if (!m.contains(e.target)) { m.classList.remove('open'); b.setAttribute('aria-expanded', 'false'); } });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { m.classList.remove('open'); b.setAttribute('aria-expanded', 'false'); } });
  });
  const ob = new IntersectionObserver((es, o) => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); o.unobserve(e.target); } }), { threshold: .2 });
  document.querySelectorAll('.steps').forEach(s => ob.observe(s));
})();

// Contact form.
// To receive messages without showing your address: create a free form at https://formspree.io,
// then paste its ID (the part after /f/ in the endpoint URL) below, e.g. FORMSPREE_ID = 'xyzabcd'.
// Until then, "Send" opens the visitor's email app with the message filled in.
(() => {
  const FORMSPREE_ID = 'moeepraj';
  const form = document.getElementById('contactForm');
  if (!form) return;
  const status = document.getElementById('cfStatus');
  const addr = () => ['isl.zahidul', 'gmail.com'].join('@');   // kept out of the page text to deter spam bots
  const say = (msg, ok) => { status.textContent = msg; status.className = 'cf-status ' + (ok ? 'ok' : 'err'); };
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    if (d._gotcha) return;                                       // bot trap
    if (!d.name.trim() || !d.message.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) { say('Please add your name, a valid email, and a message.', false); return; }
    const btn = form.querySelector('.cf-send');
    if (!FORMSPREE_ID) {
      const body = `${d.message}\n\n— ${d.name} (${d.email})`;
      location.href = `mailto:${addr()}?subject=${encodeURIComponent('Hello from your website — ' + d.name)}&body=${encodeURIComponent(body)}`;
      say('Opening your email app…', true);
      return;
    }
    btn.disabled = true; btn.textContent = 'Sending…';
    try {
      const r = await fetch('https://formspree.io/f/' + FORMSPREE_ID, { method: 'POST', headers: { Accept: 'application/json' }, body: new FormData(form) });
      if (!r.ok) throw new Error();
      form.reset(); say('Thanks! Your message is on its way. I will reply soon.', true);
    } catch (err) { say('Something went wrong. Please try LinkedIn instead.', false); }
    btn.disabled = false; btn.textContent = 'Send message →';
  });
})();

// About: reveal each journey stop and fill the line as you scroll
(() => {
  const list = document.getElementById('journey');
  if (!list) return;
  const ob = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); ob.unobserve(e.target); } }), { threshold: .35 });
  list.querySelectorAll('.j-stop').forEach(s => ob.observe(s));
  const fill = () => { const r = list.getBoundingClientRect(); const p = Math.max(0, Math.min(1, (innerHeight * .65 - r.top) / r.height)); list.style.setProperty('--prog', (p * 100).toFixed(1) + '%'); };
  addEventListener('scroll', fill, { passive: true }); fill();
})();

// Footer "Email" link: open the contact form, make it visible right away, and focus the first field
(() => {
  const box = document.getElementById('contact');
  if (!box) return;
  const go = smooth => {
    box.classList.add('show');                       // skip the scroll-reveal fade
    box.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
    box.classList.remove('flash'); void box.offsetWidth; box.classList.add('flash');
    const f = box.querySelector('input[name=name]'); if (f) setTimeout(() => f.focus({ preventScroll: true }), smooth ? 600 : 50);
  };
  if (location.hash === '#contact') addEventListener('load', () => go(false));
  document.querySelectorAll('a[href="./#contact"], a[href="#contact"]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); history.replaceState(null, '', '#contact'); go(true); }));
})();
