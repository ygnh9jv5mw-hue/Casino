/* Core: state, XP/ranks, daily goal, sound & haptics, spaced repetition, bootcamp, router, UI helpers. */
(function () {
  const B = window.BJ, CFG = window.APP_CONFIG, COURSE = window.COURSE, CAMP = window.CAMP;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rnd = (n) => (Math.random() * n) | 0;
  const pick = (a) => a[rnd(a.length)];
  const sgn = (n) => (n > 0 ? '+' + n : n < 0 ? '−' + Math.abs(n) : '0');
  const fmt$ = (n) => (n < 0 ? '−$' : '$') + Math.abs(Math.round(n)).toLocaleString();
  const dayKey = (d = new Date()) => { const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000); return z.toISOString().slice(0, 10); };

  // ---------------- state ----------------
  const KEY = 'bjmc.v2';
  const DEF = () => ({
    v: 2,
    prof: { onboarded: false, level: 'new', goal: 250, h17: true, ls: true, sound: true, haptics: true, remind: '', unlockTo: 1 },
    xp: 0, xpDay: { d: '', xp: 0 }, goalDays: [], days: [],
    done: {}, quiz: {}, campDone: {},
    best: { strat: 0, blitz: 0, reflex: 0, pairs: 0, deck: null, ladder: 0, flash: 0, tc: null, decks: 0, ramp: 0, recall: 0, index: 0, shoeClean: 0 },
    cells: {}, idx: {}, hist: {},
    shoe: { hands: 0, dec: 0, decOk: 0, checks: 0, checksOk: 0, bets: 0, betsOk: 0, shoes: 0, backoffs: 0 },
    flags: {}, log: [], wk: { d: '', i: 0 }
  });
  let S;
  function load() {
    const d = DEF();
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { const s = JSON.parse(raw); S = Object.assign(d, s); for (const k of ['prof', 'best', 'shoe', 'xpDay', 'wk']) S[k] = Object.assign(DEF()[k], s[k] || {}); return; }
      const v1 = JSON.parse(localStorage.getItem('bjmc.v1') || 'null');
      S = d;
      if (v1) { // migrate v1 progress
        S.done = v1.done || {}; S.days = v1.days || []; S.log = v1.log || [];
        if (v1.best) { S.best.strat = v1.best.strat || 0; S.best.deck = v1.best.deck ?? null; S.best.tc = v1.best.tc ?? null; }
        if (v1.shoe) Object.assign(S.shoe, v1.shoe);
      }
    } catch (e) { S = d; }
  }
  load();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
  const applyRules = () => B.setRules({ h17: !!S.prof.h17, ls: !!S.prof.ls });
  applyRules();

  // ---------------- XP, ranks, daily goal ----------------
  const RANKS = [[0, 'Rookie'], [300, 'Student'], [1000, 'Grinder'], [2500, 'Counter'], [5000, 'Advantage Player'], [10000, 'Pro'], [20000, 'Big Player']];
  function rank(xp = S.xp) {
    let i = 0; while (i + 1 < RANKS.length && xp >= RANKS[i + 1][0]) i++;
    const next = RANKS[i + 1];
    return { i, name: RANKS[i][1], next: next ? next[1] : null, from: RANKS[i][0], to: next ? next[0] : RANKS[i][0], pct: next ? (xp - RANKS[i][0]) / (next[0] - RANKS[i][0]) : 1 };
  }
  function todayXP() { return S.xpDay.d === dayKey() ? S.xpDay.xp : 0; }
  function hist(n, ok) {
    const d = dayKey(); const h = S.hist[d] || (S.hist[d] = { n: 0, ok: 0, xp: 0 });
    h.n += n; h.ok += ok;
    if (!S.days.includes(d)) S.days.push(d);
  }
  function addXP(n) {
    if (!n) return;
    const before = rank().i, d = dayKey();
    if (S.xpDay.d !== d) S.xpDay = { d, xp: 0 };
    const hadGoal = S.xpDay.xp >= S.prof.goal;
    S.xp += n; S.xpDay.xp += n;
    const h = S.hist[d] || (S.hist[d] = { n: 0, ok: 0, xp: 0 }); h.xp += n;
    if (!S.days.includes(d)) S.days.push(d);
    if (!hadGoal && S.xpDay.xp >= S.prof.goal) {
      if (!S.goalDays.includes(d)) S.goalDays.push(d);
      setTimeout(() => { confetti(); toast(`🔥 Daily goal hit — ${streak()} day streak!`, 'good'); fx.win(); }, 250);
    }
    const after = rank().i;
    if (after > before) setTimeout(() => celebrate(`Rank up!`, `You're now a <b>${RANKS[after][1]}</b>.`), 600);
    save(); xpBadge(n);
  }
  function streak() {
    const set = new Set(S.goalDays); let n = 0; const d = new Date();
    if (!set.has(dayKey(d))) d.setDate(d.getDate() - 1);
    while (set.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  // ---------------- sound & haptics ----------------
  let ac = null;
  function tone(freqs, dur = 0.09, type = 'sine', vol = 0.08) {
    if (!S.prof.sound) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === 'suspended') ac.resume();
      let t = ac.currentTime;
      for (const f of [].concat(freqs)) {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = type; o.frequency.value = f; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + dur + 0.02); t += dur * 0.8;
      }
    } catch (e) {}
  }
  function haptic(kind) {
    if (!S.prof.haptics) return;
    try {
      const cap = window.Capacitor; if (!cap || !cap.nativePromise || !cap.isNativePlatform || !cap.isNativePlatform()) return;
      if (kind === 'ok') cap.nativePromise('Haptics', 'impact', { style: 'LIGHT' }).catch(() => {});
      else if (kind === 'bad') cap.nativePromise('Haptics', 'notification', { type: 'ERROR' }).catch(() => {});
      else if (kind === 'win') cap.nativePromise('Haptics', 'notification', { type: 'SUCCESS' }).catch(() => {});
      else cap.nativePromise('Haptics', 'selectionChanged', {}).catch(() => {});
    } catch (e) {}
  }
  const fx = {
    ok: () => { tone([880, 1320], 0.07); haptic('ok'); },
    bad: () => { tone([180, 140], 0.12, 'square', 0.05); haptic('bad'); },
    tick: () => { tone(1500, 0.02, 'square', 0.02); },
    tap: () => haptic('tap'),
    win: () => { tone([660, 880, 1100, 1320], 0.09); haptic('win'); }
  };

  async function scheduleReminder() {
    const cap = window.Capacitor; if (!cap || !cap.nativePromise || !cap.isNativePlatform || !cap.isNativePlatform()) return false;
    try {
      await cap.nativePromise('LocalNotifications', 'cancel', { notifications: [{ id: 21 }] }).catch(() => {});
      if (!S.prof.remind) return true;
      const p = await cap.nativePromise('LocalNotifications', 'requestPermissions', {});
      if (p && p.display && p.display !== 'granted') return false;
      const [hour, minute] = S.prof.remind.split(':').map(Number);
      await cap.nativePromise('LocalNotifications', 'schedule', { notifications: [{ id: 21, title: 'Time to train 🃏', body: 'Your daily workout is ready. Keep the streak alive.', schedule: { on: { hour, minute }, allowWhileIdle: true } }] });
      return true;
    } catch (e) { return false; }
  }

  // ---------------- spaced repetition ----------------
  const W = [12, 6, 3, 1.2, 0.45, 0.15]; // weight by box; unseen = 5
  const groupCells = (g) => g === 'all' || g === 'weak' ? B.ALL_CELLS : B.ALL_CELLS.filter((k) => k[0] === g[0]);
  const recent = [];
  function pickCell(group) {
    let keys = groupCells(group);
    if (group === 'weak') { const w = keys.filter((k) => S.cells[k] && S.cells[k].b < 3); keys = w.length ? w : keys; }
    let tot = 0; const ws = keys.map((k) => { const c = S.cells[k]; let w = c ? W[c.b] : 5; if (recent.includes(k)) w *= 0.05; tot += w; return w; });
    let r = Math.random() * tot;
    for (let i = 0; i < keys.length; i++) { r -= ws[i]; if (r <= 0) { recent.push(keys[i]); if (recent.length > 6) recent.shift(); return keys[i]; } }
    return keys[keys.length - 1];
  }
  function gradeCell(k, ok) {
    if (!k) return;
    const c = S.cells[k] || (S.cells[k] = { b: 0, n: 0, ok: 0, miss: 0 });
    c.n++; if (ok) { c.ok++; c.b = Math.min(5, c.b + 1); } else { c.b = 0; c.miss++; }
  }
  const mastered = (k) => !!(S.cells[k] && S.cells[k].b >= 3);
  const masteryPct = (g) => { const ks = groupCells(g); return ks.filter(mastered).length / ks.length; };
  function pickDev() {
    const ds = B.activeDevs(); let tot = 0;
    const ws = ds.map((d) => { const c = S.idx[d.id]; let w = c ? W[c.b] : 5; if (recent.includes(d.id)) w *= 0.1; tot += w; return w; });
    let r = Math.random() * tot;
    for (let i = 0; i < ds.length; i++) { r -= ws[i]; if (r <= 0) { recent.push(ds[i].id); if (recent.length > 6) recent.shift(); return ds[i]; } }
    return ds[ds.length - 1];
  }
  function gradeDev(id, ok) { const c = S.idx[id] || (S.idx[id] = { b: 0, n: 0, ok: 0, miss: 0 }); c.n++; if (ok) { c.ok++; c.b = Math.min(5, c.b + 1); } else { c.b = 0; c.miss++; } }
  const idxPct = () => { const ds = B.activeDevs(); return ds.filter((d) => S.idx[d.id] && S.idx[d.id].b >= 3).length / ds.length; };

  // ---------------- records ----------------
  // higher-is-better unless listed in LOWER
  const LOWER = { deck: 1, tc: 1 };
  function record(key, val) {
    const cur = S.best[key];
    const better = cur === null || cur === undefined || (LOWER[key] ? val < cur : val > cur);
    if (better) { S.best[key] = val; save(); }
    return better && !(cur === null || cur === undefined || cur === 0);
  }

  // ---------------- course & bootcamp ----------------
  const lessons = () => [].concat(...COURSE.map((m) => m.lessons.map((l) => Object.assign({ m }, l))));
  const lessonById = (id) => lessons().find((l) => l.id === id);
  const doneCount = () => lessons().filter((l) => S.done[l.id]).length;
  function taskDone(t) {
    const b = S.best;
    switch (t.k) {
      case 'lesson': return !!S.done[t.id];
      case 'quiz': return (S.quiz[t.id] || 0) >= t.pct;
      case 'best': return (b[t.key] || 0) >= t.min;
      case 'fastest': return b[t.key] !== null && b[t.key] !== undefined && b[t.key] <= t.max;
      case 'mastery': return masteryPct(t.group) >= t.pct;
      case 'idx': return idxPct() >= t.pct;
      case 'flag': return !!S.flags[t.key];
      case 'shoe': { const s = S.shoe; return s.hands >= t.hands && s.dec > 0 && s.decOk / s.dec >= t.dec && s.checks >= t.checks && s.checksOk / s.checks >= t.chk; }
    }
    return false;
  }
  function taskLabel(t) {
    if (t.t) return t.t;
    if (t.k === 'lesson') { const l = lessonById(t.id); return 'Lesson: ' + (l ? l.title : t.id); }
    if (t.k === 'quiz') { const m = COURSE.find((x) => x.id === t.id); return `Quiz: ${m ? m.title : t.id} (${t.pct}%+)`; }
    return '';
  }
  function taskGo(t) {
    if (t.k === 'lesson') return ['lesson', { id: t.id }];
    if (t.k === 'quiz') return ['quiz', { id: t.id }];
    return [t.go, {}];
  }
  const stageDone = (st) => st.tasks.every(taskDone);
  const stageOpen = (i) => i === 0 || CAMP[i].id <= (S.prof.unlockTo || 1) || stageDone(CAMP[i - 1]);
  function currentStage() { for (let i = 0; i < CAMP.length; i++) if (!stageDone(CAMP[i]) && stageOpen(i)) return i; return CAMP.length - 1; }
  function checkCamp() { // award newly completed stages
    let any = false;
    CAMP.forEach((st) => { if (!S.campDone[st.id] && stageDone(st)) { S.campDone[st.id] = true; any = st; } });
    if (any) { save(); addXP(150); setTimeout(() => celebrate('Stage complete!', `<b>${esc(any.title)}</b> is done. The next stage is unlocked.`), 300); }
  }

  // ---------------- daily workout ----------------
  function workout() {
    const st = currentStage() + 1, g = S.prof.goal, big = g >= 500, mid = g >= 250;
    const steps = [
      { id: 'reflex', t: 'Warm-up: Reflex', s: '60 seconds of card values', args: {} },
      { id: 'strategy', t: 'Strategy reps', s: `${big ? 50 : mid ? 30 : 20} adaptive hands`, args: { reps: big ? 50 : mid ? 30 : 20 } },
      st >= 7 ? { id: 'tc', t: 'True count', s: '10 conversions', args: {} } : { id: 'pairs', t: 'Pair cancellation', s: '60 seconds', args: {} },
      st >= 9 ? { id: 'index', t: 'Index plays', s: `${big ? 25 : 15} reps`, args: { reps: big ? 25 : 15 } } : { id: 'blitz', t: 'Strategy Blitz', s: '60 seconds, beat your best', args: {} },
      st >= 8 ? { id: 'flash', t: 'Table Flash', s: 'Whole rounds at a glance', args: {} } : { id: 'deck', t: 'Deck countdown', s: 'Full deck, against the clock', args: {} }
    ];
    if (mid) steps.push(st >= 9 ? { id: 'shoe', t: 'Shoe simulator', s: `${big ? 40 : 20} hands`, args: { hands: big ? 40 : 20 } } : { id: 'ladder', t: 'Speed Ladder', s: 'Push your counting speed', args: {} });
    if (big) steps.push({ id: 'recall', t: 'Index recall', s: 'Name the numbers', args: { reps: 15 } });
    return steps;
  }
  const wkIndex = () => (S.wk.d === dayKey() ? S.wk.i : 0);
  function wkNext() { // called by a drill when its workout step is finished
    const d = dayKey(); if (S.wk.d !== d) S.wk = { d, i: 0 };
    S.wk.i++; const n = workout().length;
    if (S.wk.i >= n) { addXP(100); S.flags['wk_' + d] = true; }
    save();
    replace('workout', {});
  }

  // ---------------- router ----------------
  let tab = 'today', stack = [], cleanup = null, dir = 0;
  const SCREENS = {};
  function go(screen, args) { if (!SCREENS[screen]) return; fx.tap(); stack.push({ screen, args: args || {} }); dir = 1; render(); }
  function back() { stack.pop(); dir = -1; render(); }
  function replace(screen, args) { stack.pop(); stack.push({ screen, args: args || {} }); dir = 0; render(); }
  function setTab(t) { tab = t; stack = []; dir = 0; render(); }
  function render() {
    if (cleanup) { try { cleanup(); } catch (e) {} cleanup = null; }
    checkCamp();
    const cur = stack.length ? stack[stack.length - 1] : { screen: tab, args: {} };
    const scr = SCREENS[cur.screen](cur.args || {});
    const top = $('#top');
    top.className = 'top' + (stack.length ? '' : ' big');
    top.innerHTML = (stack.length ? '<button class="back" id="bk" aria-label="Back"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg></button>' : '') +
      `<h1>${esc(scr.title)}</h1>` + (scr.right || '');
    if (stack.length) $('#bk').onclick = back;
    const v = $('#view');
    v.innerHTML = `<div class="page ${dir > 0 ? 'in-r' : dir < 0 ? 'in-l' : 'in-f'}">${scr.html}</div>`; v.scrollTop = 0;
    $$('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    document.body.classList.toggle('sub', !!stack.length);
    if (scr.mount) cleanup = scr.mount(v.firstElementChild, cur.args || {}) || null;
    const rb = $('#rbtn'); if (rb && scr.onRight) rb.onclick = scr.onRight;
  }

  // ---------------- UI helpers ----------------
  const RED = (s) => s === '♥' || s === '♦';
  const FACE = { J: 'J', Q: 'Q', K: 'K' };
  function cardHTML(c, cls = '') {
    if (!c) return `<div class="pc back ${cls}"><i></i></div>`;
    const anim = c.anim ? ' deal' : '';
    const mid = FACE[c.r] ? `<span class="face">${c.r}<em>${c.s}</em></span>` : c.r === 'A' ? `<span class="ace">${c.s}</span>` : `<span class="pip">${c.s}</span>`;
    return `<div class="pc ${RED(c.s) ? 'red' : ''} ${cls}${anim}"><span class="cr">${c.r}<b>${c.s}</b></span>${mid}<span class="cr br">${c.r}<b>${c.s}</b></span></div>`;
  }
  function pad(onSubmit, opts = {}) {
    let val = '', neg = false;
    const html = `<div class="display ${opts.small ? 'sm' : ''}" id="pd">${opts.placeholder || '0'}</div>
      <div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button data-k="${n}">${n}</button>`).join('')}
      <button data-k="±" class="sign">±</button><button data-k="0">0</button><button data-k="⌫">⌫</button></div>
      <button class="btn" style="margin-top:10px" data-k="go">${opts.label || 'Submit'}</button>`;
    const bind = (root) => {
      const show = () => { const d = $('#pd', root); if (d) d.textContent = (neg ? '−' : val && val !== '0' && !opts.unsigned ? '+' : '') + (val || '0'); };
      $$('[data-k]', root).forEach((b) => (b.onclick = () => {
        const k = b.dataset.k; fx.tap();
        if (k === 'go') { const n = (neg ? -1 : 1) * (+val || 0); val = ''; neg = false; show(); return onSubmit(n); }
        if (k === '±') neg = !neg; else if (k === '⌫') val = val.slice(0, -1); else if (val.length < 3) val = (val === '0' ? '' : val) + k;
        show();
      }));
    };
    return { html, bind };
  }
  function toast(msg, kind = '') {
    const t = document.createElement('div'); t.className = 'toast ' + kind; t.innerHTML = msg; document.body.appendChild(t);
    setTimeout(() => t.classList.add('show'), 10); setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2600);
  }
  function xpBadge(n) {
    const t = document.createElement('div'); t.className = 'xpb'; t.textContent = '+' + n + ' XP'; document.body.appendChild(t);
    setTimeout(() => t.remove(), 1100);
  }
  function sheet(html, onMount) {
    const m = $('#modal'); m.innerHTML = `<div class="scrim"><div class="sheet">${html}</div></div>`;
    const close = () => (m.innerHTML = '');
    $('.scrim', m).addEventListener('click', (e) => { if (e.target.classList.contains('scrim') && !m.querySelector('[data-lock]')) close(); });
    if (onMount) onMount(m.firstElementChild, close);
    return close;
  }
  function celebrate(title, body) {
    confetti(); fx.win();
    sheet(`<div class="celebrate"><div class="burst">★</div><h2>${title}</h2><p class="muted">${body}</p><button class="btn" id="cok">Keep going</button></div>`, (r, close) => { $('#cok', r).onclick = close; });
  }
  function confetti() {
    const box = document.createElement('div'); box.className = 'confetti';
    const cols = ['#f2c14e', '#33d17a', '#59a8ff', '#ff5d5d', '#ffffff'];
    for (let i = 0; i < 70; i++) {
      const p = document.createElement('i');
      p.style.left = Math.random() * 100 + 'vw'; p.style.background = pick(cols);
      p.style.animationDelay = Math.random() * 0.4 + 's'; p.style.animationDuration = 1.6 + Math.random() * 1.2 + 's';
      p.style.transform = `rotate(${rnd(360)}deg)`; box.appendChild(p);
    }
    document.body.appendChild(box); setTimeout(() => box.remove(), 3200);
  }
  function ring(pct, size = 64, stroke = 7, label = '', color = 'var(--gold)') {
    const r = (size - stroke) / 2, c = 2 * Math.PI * r, p = Math.max(0, Math.min(1, pct));
    return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="#ffffff14" stroke-width="${stroke}" fill="none"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="${color}" stroke-width="${stroke}" fill="none" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
      ${label ? `<text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" class="ring-t">${label}</text>` : ''}</svg>`;
  }
  // countdown bar: returns controller {stop(), add(ms), left()}
  function timer(el, ms, onEnd, onTick) {
    let end = performance.now() + ms, raf = 0, stopped = false;
    const total = ms;
    const loop = () => {
      if (stopped) return;
      const left = end - performance.now();
      if (el) { el.style.width = Math.max(0, (100 * left) / total) + '%'; el.classList.toggle('low', left < total * 0.2); }
      if (onTick) onTick(left);
      if (left <= 0) { stopped = true; onEnd(); return; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return { stop: () => { stopped = true; cancelAnimationFrame(raf); }, add: (d) => { end += d; }, left: () => end - performance.now() };
  }
  function openUrl(u) { if (!u) return toast('Coming soon — this link hasn\'t been set up yet.'); window.open(u, '_blank'); }
  const ICON = {
    today: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    learn: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/><path d="M9 7h6"/>',
    train: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".5"/>',
    progress: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    coach: '<path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>'
  };
  const icon = (n, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24">${ICON[n]}</svg>`;

  window.APP = {
    $, $$, esc, rnd, pick, sgn, fmt$, dayKey, get S() { return S; }, save, DEF, applyRules,
    RANKS, rank, todayXP, addXP, hist, streak, fx, scheduleReminder,
    pickCell, gradeCell, mastered, masteryPct, groupCells, pickDev, gradeDev, idxPct, record,
    lessons, lessonById, doneCount, taskDone, taskLabel, taskGo, stageDone, stageOpen, currentStage,
    workout, wkIndex, wkNext,
    SCREENS, go, back, replace, setTab, render, get stackDepth() { return stack.length; },
    cardHTML, pad, toast, sheet, celebrate, confetti, ring, timer, openUrl, icon, CFG, COURSE, CAMP, B,
    reset: () => { localStorage.removeItem(KEY); localStorage.removeItem('bjmc.v1'); load(); applyRules(); stack = []; tab = 'today'; render(); }
  };
})();
