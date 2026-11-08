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
    prof: { onboarded: false, level: 'new', goal: 250, h17: true, ls: true, decks: 6, gameAsked: false, sound: true, haptics: true, playOut: true, remind: '', unlockTo: 1 },
    xp: 0, xpDay: { d: '', xp: 0 }, goalDays: [], days: [],
    done: {}, quiz: {}, campDone: {},
    best: { strat: 0, blitz: 0, reflex: 0, pairs: 0, deck: null, ladder: 0, flash: 0, tc: null, decks: 0, ramp: 0, recall: 0, index: 0, shoeClean: 0, speed: 0 },
    cells: {}, idx: {}, hist: {},
    shoe: { hands: 0, dec: 0, decOk: 0, checks: 0, checksOk: 0, bets: 0, betsOk: 0, shoes: 0, backoffs: 0 },
    flags: {}, log: [], wk: { d: '', i: 0, plan: [] }
  });
  let S;
  // Saved data is checked field by field: anything missing, damaged or out of range falls back to its default,
  // so a corrupted save can never stop the app from opening.
  const isObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
  const num = (x, def, lo = -Infinity, hi = Infinity) => (typeof x === 'number' && isFinite(x) ? Math.min(hi, Math.max(lo, x)) : def);
  const bool = (x, def) => (typeof x === 'boolean' ? x : def);
  const str = (x, def, max = 500) => (typeof x === 'string' ? x.slice(0, max) : def);
  const isDay = (x) => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x);
  const mapObj = (x, fn) => { const o = {}; if (isObj(x)) for (const k of Object.keys(x)) { const v = fn(x[k], k); if (v !== undefined) o[k] = v; } return o; };
  const srCell = (c) => (isObj(c) ? { b: num(Math.round(c.b), 0, 0, 5), n: num(c.n, 0, 0), ok: num(c.ok, 0, 0), miss: num(c.miss, 0, 0) } : undefined);
  function sanitize(s) {
    const d = DEF();
    if (!isObj(s)) return d;
    const p = isObj(s.prof) ? s.prof : {};
    d.prof = {
      onboarded: bool(p.onboarded, false), level: ['new', 'basic', 'counter'].includes(p.level) ? p.level : 'new',
      goal: [100, 250, 500].includes(p.goal) ? p.goal : 250, h17: bool(p.h17, true), ls: bool(p.ls, true), decks: p.decks === 2 ? 2 : 6,
      gameAsked: bool(p.gameAsked, false), sound: bool(p.sound, true), haptics: bool(p.haptics, true), playOut: bool(p.playOut, true),
      remind: typeof p.remind === 'string' && /^\d{2}:\d{2}$/.test(p.remind) ? p.remind : '', unlockTo: [1, 5, 9].includes(p.unlockTo) ? p.unlockTo : 1,
      shoe: isObj(p.shoe) ? p.shoe : null, casino: isObj(p.casino) ? p.casino : null // table settings are re-checked by the table itself
    };
    d.xp = num(s.xp, 0, 0, 1e9);
    d.xpDay = isObj(s.xpDay) && isDay(s.xpDay.d) ? { d: s.xpDay.d, xp: num(s.xpDay.xp, 0, 0, 1e9) } : { d: '', xp: 0 };
    d.goalDays = Array.isArray(s.goalDays) ? s.goalDays.filter(isDay).slice(-3000) : [];
    d.days = Array.isArray(s.days) ? s.days.filter(isDay).slice(-3000) : [];
    d.done = mapObj(s.done, (v) => (v === true ? true : undefined));
    d.quiz = mapObj(s.quiz, (v) => (typeof v === 'number' && isFinite(v) ? Math.min(100, Math.max(0, Math.round(v))) : undefined));
    d.campDone = mapObj(s.campDone, (v) => (v === true ? true : undefined));
    d.flags = mapObj(s.flags, (v) => (typeof v === 'boolean' ? v : undefined));
    const b = isObj(s.best) ? s.best : {};
    for (const k of Object.keys(d.best)) d.best[k] = k === 'deck' || k === 'tc' ? (typeof b[k] === 'number' && isFinite(b[k]) && b[k] > 0 ? b[k] : null) : num(b[k], 0, 0, k === 'speed' ? 240 : 1e6);
    d.cells = mapObj(s.cells, srCell);
    d.idx = mapObj(s.idx, srCell);
    d.hist = mapObj(s.hist, (v, k) => (isDay(k) && isObj(v) ? { n: num(v.n, 0, 0), ok: num(v.ok, 0, 0), xp: num(v.xp, 0, 0) } : undefined));
    const sh = isObj(s.shoe) ? s.shoe : {};
    for (const k of Object.keys(d.shoe)) d.shoe[k] = Math.round(num(sh[k], 0, 0, 1e9));
    d.shoe.decOk = Math.min(d.shoe.decOk, d.shoe.dec); d.shoe.checksOk = Math.min(d.shoe.checksOk, d.shoe.checks); d.shoe.betsOk = Math.min(d.shoe.betsOk, d.shoe.bets);
    d.log = Array.isArray(s.log) ? s.log.filter(isObj).map((e, i) => ({ id: num(e.id, Date.now() + i), date: str(e.date, '', 20), where: str(e.where, '', 120), hours: num(e.hours, 0, 0, 1000), result: num(e.result, 0, -1e9, 1e9), notes: str(e.notes, '', 1000) })) : [];
    const WK_IDS = ['reflex', 'strategy', 'tc', 'pairs', 'index', 'blitz', 'flash', 'deck', 'shoe', 'ladder', 'recall', 'speed'];
    const plan = isObj(s.wk) && Array.isArray(s.wk.plan) ? s.wk.plan.filter((x) => isObj(x) && WK_IDS.includes(x.id)).slice(0, 10).map((x) => {
      const a = isObj(x.args) ? x.args : {}, args = {};
      if (typeof a.reps === 'number' && a.reps >= 1 && a.reps <= 100) args.reps = Math.round(a.reps);
      if (typeof a.hands === 'number' && a.hands >= 1 && a.hands <= 200) args.hands = Math.round(a.hands);
      if ([26, 52, 104].includes(a.len)) args.len = a.len;
      return { id: x.id, t: str(x.t, '', 60), s: str(x.s, '', 80), args };
    }) : [];
    d.wk = isObj(s.wk) && isDay(s.wk.d) ? { d: s.wk.d, i: Math.round(num(s.wk.i, 0, 0, 20)), plan } : { d: '', i: 0, plan: [] };
    if (isObj(s.casino)) { const c = s.casino; d.casino = { bank: num(c.bank, 1000, 0, 1e9), hands: num(c.hands, 0, 0), net: num(c.net, 0, -1e12, 1e12), peak: num(c.peak, 1000, 0, 1e9), shoes: num(c.shoes, 0, 0), reloads: num(c.reloads, 0, 0) }; }
    return d;
  }
  function load() {
    let raw = null, v1 = null;
    try { raw = localStorage.getItem(KEY); } catch (e) {}
    if (raw) { let s = null; try { s = JSON.parse(raw); } catch (e) {} S = sanitize(s); return; }
    S = DEF();
    try { v1 = JSON.parse(localStorage.getItem('bjmc.v1') || 'null'); } catch (e) {}
    if (isObj(v1)) { // migrate the very first version's progress
      S = sanitize({ done: v1.done, days: v1.days, log: v1.log, best: isObj(v1.best) ? { strat: v1.best.strat, deck: v1.best.deck, tc: v1.best.tc } : {}, shoe: v1.shoe });
    }
  }
  load();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
  const applyRules = () => B.setRules({ h17: !!S.prof.h17, ls: !!S.prof.ls, decks: S.prof.decks === 2 ? 2 : 6 });
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
      setTimeout(() => { confetti(); toast(`Daily goal hit · ${streak()}-day streak`, 'good'); fx.win(); }, 250);
    }
    const after = rank().i;
    if (after > before) queueCelebrate(`Rank up!`, `You're now a <b>${RANKS[after][1]}</b>.`);
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
    return [t.go, t.args || {}];
  }
  const stageDone = (st) => !!S.campDone[st.id] || st.tasks.every(taskDone);
  const stageOpen = (i) => i === 0 || CAMP[i].id <= (S.prof.unlockTo || 1) || stageDone(CAMP[i - 1]);
  function currentStage() {
    // players who chose a later starting point see that stage first; earlier stages stay open behind it
    const from = S.prof.unlockTo || 1;
    for (let i = 0; i < CAMP.length; i++) if (CAMP[i].id >= from && !stageDone(CAMP[i]) && stageOpen(i)) return i;
    for (let i = 0; i < CAMP.length; i++) if (!stageDone(CAMP[i]) && stageOpen(i)) return i;
    return CAMP.length - 1;
  }
  function checkCamp() { // award newly completed stages
    let any = false;
    CAMP.forEach((st) => { if (!S.campDone[st.id] && stageDone(st)) { S.campDone[st.id] = true; any = st; } });
    if (any) { save(); addXP(150); queueCelebrate('Stage complete!', `<b>${esc(any.title)}</b> is done. The next stage is unlocked.`); }
  }

  // ---------------- daily workout ----------------
  // today's plan is fixed when the workout starts, so it can't change underneath you mid-session
  function workout() {
    if (S.wk.d === dayKey() && Array.isArray(S.wk.plan) && S.wk.plan.length) return S.wk.plan;
    return buildWorkout();
  }
  function startWorkout() { S.wk = { d: dayKey(), i: 0, plan: buildWorkout() }; save(); return S.wk.plan; }
  function buildWorkout() {
    const st = currentStage() + 1, g = S.prof.goal, big = g >= 500, mid = g >= 250;
    const steps = [
      { id: 'reflex', t: 'Warm-up: Reflex', s: '60 seconds of card values', args: {} },
      { id: 'strategy', t: 'Strategy reps', s: `${big ? 50 : mid ? 30 : 20} adaptive hands`, args: { reps: big ? 50 : mid ? 30 : 20 } },
      st >= 7 ? { id: 'tc', t: 'True count', s: '10 conversions', args: {} } : { id: 'pairs', t: 'Pair cancellation', s: '60 seconds', args: {} },
      st >= 9 ? { id: 'index', t: 'Index plays', s: `${big ? 25 : 15} reps`, args: { reps: big ? 25 : 15 } } : { id: 'blitz', t: 'Strategy Blitz', s: '60 seconds, beat your best', args: {} },
      st >= 8 ? { id: 'flash', t: 'Table Flash', s: 'Whole rounds at a glance', args: {} } : { id: 'deck', t: 'Deck countdown', s: 'Full deck, against the clock', args: {} }
    ];
    if (mid) steps.push(st >= 9 ? { id: 'shoe', t: 'Shoe simulator', s: `${big ? 40 : 20} hands`, args: { hands: big ? 40 : 20 } } : { id: 'speed', t: 'Speed count', s: 'A deck at your next speed', args: { len: 52 } });
    if (big) steps.push({ id: 'recall', t: 'Index recall', s: 'Name the numbers', args: { reps: 15 } });
    return steps;
  }
  const wkIndex = () => (S.wk.d === dayKey() ? S.wk.i : 0);
  function wkNext() { // called by a drill when its workout step is finished
    const d = dayKey(); if (S.wk.d !== d) S.wk = { d, i: 0, plan: buildWorkout() };
    const plan = workout(); S.wk.i++;
    if (S.wk.i >= plan.length) { addXP(100); S.flags['wk_' + d] = true; save(); return popTo('workout'); }
    save();
    const s = plan[S.wk.i]; replace(s.id, Object.assign({ wk: true }, s.args)); // straight into the next drill — no stacked screens
  }
  // go back to a screen already in the stack (or open it as the only screen)
  function popTo(screen) {
    while (stack.length && stack[stack.length - 1].screen !== screen) stack.pop();
    if (!stack.length) stack.push({ screen, args: {} });
    dir = -1; render();
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
    if (!stack.length && pending.length) setTimeout(flushCelebrations, 450);
  }

  // ---------------- UI helpers ----------------
  const RED = (s) => s === '♥' || s === '♦';
  const FACE = { J: 'J', Q: 'Q', K: 'K' };
  const CARD_NAME = { A: 'Ace', J: 'Jack', Q: 'Queen', K: 'King' };
  const SUIT_NAME = { '♠': 'spades', '♥': 'hearts', '♦': 'diamonds', '♣': 'clubs' };
  function cardHTML(c, cls = '', delay = 0) { // delay: when a face-down card is dealt in sequence
    if (!c) return `<div class="pc back ${cls}"${delay ? ` style="animation-delay:${delay}ms"` : ''} role="img" aria-label="face-down card"><i></i></div>`;
    const anim = c.flip ? ' flip' : c.anim ? ' deal' : '';
    const st = c.anim && c.delay ? ` style="animation-delay:${c.delay}ms"` : '';
    const mid = FACE[c.r] ? `<span class="face">${c.r}<em>${c.s}</em></span>` : c.r === 'A' ? `<span class="ace">${c.s}</span>` : `<span class="pip">${c.s}</span>`;
    const label = `${CARD_NAME[c.r] || c.r} of ${SUIT_NAME[c.s]}`;
    return `<div class="pc ${RED(c.s) ? 'red' : ''} ${cls}${anim}"${st} role="img" aria-label="${label}"><span class="cr" aria-hidden="true">${c.r}<b>${c.s}</b></span><span aria-hidden="true">${mid}</span><span class="cr br" aria-hidden="true">${c.r}<b>${c.s}</b></span></div>`;
  }
  function pad(onSubmit, opts = {}) {
    let val = '', neg = false, sent = false;
    const html = `<div class="display ${opts.small ? 'sm' : ''}" id="pd">${opts.placeholder || '0'}</div>
      <div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button data-k="${n}">${n}</button>`).join('')}
      <button data-k="±" class="sign">±</button><button data-k="0">0</button><button data-k="⌫">⌫</button></div>
      <button class="btn" style="margin-top:10px" data-k="go">${opts.label || 'Submit'}</button>`;
    const bind = (root) => {
      const show = () => { const d = $('#pd', root); if (d) d.textContent = (neg ? '−' : val && val !== '0' && !opts.unsigned ? '+' : '') + (val || '0'); };
      $$('[data-k]', root).forEach((b) => (b.onclick = () => {
        const k = b.dataset.k; fx.tap();
        if (k === 'go') { if (sent) return; sent = true; const n = (neg ? -1 : 1) * (+val || 0); val = ''; neg = false; show(); return onSubmit(n); } // one answer per keypad
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
    sheet(`<div class="celebrate"><div class="burst">${icon('trophy')}</div><h2>${title}</h2><p class="muted">${body}</p><button class="btn" id="cok">Continue</button></div>`, (r, close) => { $('#cok', r).onclick = () => { close(); setTimeout(flushCelebrations, 250); }; });
  }
  // Rank-ups and finished stages wait until you're back on a main tab, so they never cover a drill or a hand.
  const pending = [];
  function queueCelebrate(title, body) { pending.push([title, body]); if (!stack.length) setTimeout(flushCelebrations, 400); }
  function flushCelebrations() { if (stack.length || !pending.length || $('#modal .scrim')) return; const [t, b] = pending.shift(); celebrate(t, b); }
  function confetti() {
    const box = document.createElement('div'); box.className = 'confetti';
    const cols = ['#d9b46c', '#f1dfb4', '#ffffff', '#b8964f'];
    for (let i = 0; i < 70; i++) {
      const p = document.createElement('i');
      p.style.left = Math.random() * 100 + 'vw'; p.style.background = pick(cols);
      p.style.animationDelay = Math.random() * 0.4 + 's'; p.style.animationDuration = 1.6 + Math.random() * 1.2 + 's';
      p.style.transform = `rotate(${rnd(360)}deg)`; box.appendChild(p);
    }
    document.body.appendChild(box); setTimeout(() => box.remove(), 3200);
  }
  function ring(pct, size = 64, stroke = 7, label = '', color = 'var(--accent)') {
    const r = (size - stroke) / 2, c = 2 * Math.PI * r, p = Math.max(0, Math.min(1, pct || 0));
    return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="rgba(255,255,255,.08)" stroke-width="${stroke}" fill="none"/>
      <circle class="ring-arc" style="--c:${c.toFixed(1)}px" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke="${color}" stroke-width="${stroke}" fill="none" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
      ${label ? `<text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" class="ring-t">${label}</text>` : ''}</svg>`;
  }
  // animate a number up to its value (e.g. a result score); keeps any suffix like % or s
  function countUp(el, text) {
    const m = /^(-?)(\d+(?:\.\d+)?)(.*)$/.exec(String(text)); if (!el || !m || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const to = parseFloat(m[2]), dec = (m[2].split('.')[1] || '').length, sign = m[1], suf = m[3], t0 = performance.now(), dur = 650;
    const step = (t) => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = sign + (to * e).toFixed(dec) + suf; if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
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
    gauge: '<path d="M5.07 17A8 8 0 1 1 18.93 17"/><path d="M12 13l4.2-4.2"/><circle cx="12" cy="13" r="1.2"/>',
    today: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    learn: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/><path d="M9 7h6"/>',
    train: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".5"/>',
    progress: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    coach: '<path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>'
  };
  // one consistent line-icon set (24px grid, 1.75 stroke) used everywhere instead of emoji
  Object.assign(ICON, {
    spade: '<path d="M12 3c3.2 3.6 7 6 7 9.6a3.6 3.6 0 0 1-6.2 2.5c.3 2 1 3.6 2.2 4.9H9c1.2-1.3 1.9-2.9 2.2-4.9A3.6 3.6 0 0 1 5 12.6C5 9 8.8 6.6 12 3z"/>',
    bolt: '<path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12z"/>',
    grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.6"/>',
    pulse: '<path d="M3 12h4l2.5-6 5 12 2.5-6h4"/>',
    swap: '<path d="M7 7.5h13l-3.5-3.5"/><path d="M17 16.5H4l3.5 3.5"/>',
    layers: '<path d="m12 3.5 8.5 4.5-8.5 4.5L3.5 8z"/><path d="m3.5 12.5 8.5 4.5 8.5-4.5"/><path d="m3.5 16.5 8.5 4.5 8.5-4.5"/>',
    trend: '<path d="M3.5 17 9 11.5l4 4L20.5 8"/><path d="M15 8h5.5v5.5"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    divide: '<circle cx="12" cy="6.5" r="1.3"/><circle cx="12" cy="17.5" r="1.3"/><path d="M5 12h14"/>',
    tray: '<path d="M3.5 13.5h4.5l1.5 2.5h5l1.5-2.5h4.5"/><path d="M5.5 5h13l2 8.5V19a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-5.5z"/>',
    coins: '<ellipse cx="12" cy="6.5" rx="7" ry="2.8"/><path d="M5 6.5v5.5c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8V6.5"/><path d="M5 12v5.5c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8V12"/>',
    sparkle: '<path d="M12 3.5 13.9 9l5.6 2-5.6 2L12 18.5 10.1 13l-5.6-2 5.6-2z"/>',
    hash: '<path d="M5 9h14M5 15h14M10 4 8 20M16 4l-2 16"/>',
    cards: '<rect x="3.5" y="6.5" width="11.5" height="14" rx="2"/><path d="M8.5 3.5h9.5a2 2 0 0 1 2 2v12"/>',
    chip: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/><path d="M12 3.5V7M12 17v3.5M3.5 12H7M17 12h3.5"/>',
    table: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 10h17M9.5 4.5v15"/>',
    calc: '<rect x="5" y="2.5" width="14" height="19" rx="2.2"/><path d="M8 6.5h8M8.5 11h.01M12 11h.01M15.5 11h.01M8.5 14.5h.01M12 14.5h.01M15.5 14.5h.01M8.5 18h.01M12 18h.01M15.5 18h.01"/>',
    notebook: '<path d="M6 3.5h12a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H6z"/><path d="M6 3.5v17M10 8.5h5.5M10 12.5h5.5"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    chat: '<path d="M20.5 12a8.5 8.5 0 0 1-12.2 7.6L3.5 20.5l1-4.6A8.5 8.5 0 1 1 20.5 12z"/>',
    lock: '<rect x="5" y="11" width="14" height="9.5" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.6A6.5 6.5 0 0 1 21.5 20"/>',
    heart: '<path d="M12 20s-7.5-4.6-9.2-9.3A4.9 4.9 0 0 1 12 7.6a4.9 4.9 0 0 1 9.2 3.1C19.5 15.4 12 20 12 20z"/>',
    reset: '<path d="M4 4.5v5.5h5.5"/><path d="M4.4 10A8 8 0 1 1 4 14"/>',
    flame: '<path d="M12 21a6 6 0 0 0 6-6c0-3.6-2.6-5.6-3.6-8.9-.4 2.1-1.4 3.4-2.6 4.1C11.6 7.5 10.4 5 8.3 3 8.5 7 6 9.6 6 15a6 6 0 0 0 6 6z"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    play: '<path d="M8 5.5v13l10.5-6.5z"/>',
    chevron: '<path d="m9.5 5.5 6.5 6.5-6.5 6.5"/>',
    lesson: '<path d="M7 3.5h7l5 5v12H7z"/><path d="M14 3.5v5h5M10 13h6M10 17h6"/>',
    quiz: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.6a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1.1.9-1.1 1.6v.5M12 17h.01"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20.5h7M10 17h4"/>',
    bell: '<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    sliders: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    medal: '<circle cx="12" cy="14.5" r="5.5"/><path d="M8.5 10 6 3.5h4l2 4 2-4h4L15.5 10"/>'
  });
  const icon = (n, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICON[n] || ''}</svg>`;

  // ---------------- "what's next" after a drill ----------------
  const TITLES = { strategy: 'Adaptive trainer', blitz: 'Strategy Blitz', reflex: 'Reflex', pairs: 'Pair cancellation', deck: 'Deck countdown', ladder: 'Speed ladder', speed: 'Speed count',
    flash: 'Table flash', tc: 'True count', decks: 'Tray reading', ramp: 'Bet ramp', index: 'Index plays', recall: 'Index recall', shoe: 'Simulator', casino: 'Casino table',
    mastery: 'Mastery map', chart: 'Strategy chart', bankroll: 'Bankroll calculator' };
  const FLOW = ['strategy', 'blitz', 'reflex', 'pairs', 'deck', 'ladder', 'speed', 'flash', 'tc', 'decks', 'ramp', 'index', 'recall', 'shoe'];
  function nextAfter(screen) {
    // 1) the next unfinished task of the current bootcamp stage (that isn't the drill just finished)
    const st = CAMP[currentStage()];
    for (const t of st.tasks) {
      if (taskDone(t)) continue;
      const [s, a] = taskGo(t);
      if (s && s !== screen && SCREENS[s]) return { s, a, label: t.k === 'lesson' ? 'Lesson: ' + ((lessonById(t.id) || {}).title || '') : t.k === 'quiz' ? 'Module quiz' : TITLES[s] || taskLabel(t) };
    }
    // 2) otherwise the next drill in the training sequence
    const i = FLOW.indexOf(screen), s = FLOW[(i + 1) % FLOW.length];
    return { s, a: {}, label: TITLES[s] };
  }

  window.APP = {
    $, $$, esc, rnd, pick, sgn, fmt$, dayKey, get S() { return S; }, save, DEF, applyRules,
    RANKS, rank, todayXP, addXP, hist, streak, fx, scheduleReminder,
    pickCell, gradeCell, mastered, masteryPct, groupCells, pickDev, gradeDev, idxPct, record,
    lessons, lessonById, doneCount, taskDone, taskLabel, taskGo, stageDone, stageOpen, currentStage,
    workout, startWorkout, wkIndex, wkNext, popTo,
    SCREENS, go, back, replace, setTab, render, get stackDepth() { return stack.length; }, get current() { return stack.length ? stack[stack.length - 1].screen : tab; },
    cardHTML, pad, toast, sheet, celebrate, confetti, ring, countUp, timer, openUrl, icon, CFG, COURSE, CAMP, B, nextAfter, TITLES,
    reset: () => { localStorage.removeItem(KEY); localStorage.removeItem('bjmc.v1'); load(); applyRules(); stack = []; tab = 'today'; render(); }
  };
})();
