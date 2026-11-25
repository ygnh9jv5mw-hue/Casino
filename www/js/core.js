/* NO ANTICHEAT: helpers, save data and synthesized audio. */
(function (NA) {
  'use strict';

  // ---------------------------------------------------------------- utils
  const U = {};
  U.DEG = Math.PI / 180;
  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.rand = (a, b) => a + Math.random() * (b - a);
  U.randInt = (a, b) => Math.floor(U.rand(a, b + 1));
  U.pick = arr => arr[Math.floor(Math.random() * arr.length)];
  U.wrap = a => {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  };
  U.approachAngle = (cur, target, step) => {
    const d = U.wrap(target - cur);
    if (Math.abs(d) <= step) return target;
    return cur + Math.sign(d) * step;
  };
  U.approach = (cur, target, step) => {
    const d = target - cur;
    if (Math.abs(d) <= step) return target;
    return cur + Math.sign(d) * step;
  };
  U.fmt = n => '₡' + Math.floor(n).toLocaleString('en-US');
  U.num = n => Math.floor(n).toLocaleString('en-US');
  U.esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  U.shuffle = arr => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  };
  // A shuffle bag: no repeats until every item has been used.
  const bags = {};
  U.fromBag = (key, items) => {
    let b = bags[key];
    if (!b || !b.left.length || b.src !== items) { b = bags[key] = { src: items, left: U.shuffle(items) }; }
    return b.left.pop();
  };
  // Ray vs axis-aligned box. Returns distance along a normalized direction, or Infinity.
  U.rayBox = (ox, oy, oz, dx, dy, dz, b, maxT) => {
    let tmin = 0, tmax = maxT;
    const axes = [[ox, dx, b.minX, b.maxX], [oy, dy, b.minY, b.maxY], [oz, dz, b.minZ, b.maxZ]];
    for (let i = 0; i < 3; i++) {
      const o = axes[i][0], d = axes[i][1], lo = axes[i][2], hi = axes[i][3];
      if (Math.abs(d) < 1e-9) {
        if (o < lo || o > hi) return Infinity;
      } else {
        let t1 = (lo - o) / d, t2 = (hi - o) / d;
        if (t1 > t2) { const s = t1; t1 = t2; t2 = s; }
        if (t1 > tmin) tmin = t1;
        if (t2 < tmax) tmax = t2;
        if (tmin > tmax) return Infinity;
      }
    }
    return tmin;
  };
  U.raySphere = (ox, oy, oz, dx, dy, dz, cx, cy, cz, r) => {
    const lx = cx - ox, ly = cy - oy, lz = cz - oz;
    const tca = lx * dx + ly * dy + lz * dz;
    const d2 = lx * lx + ly * ly + lz * lz - tca * tca;
    if (d2 > r * r) return Infinity;
    const thc = Math.sqrt(r * r - d2);
    const t0 = tca - thc;
    if (t0 >= 0) return t0;
    const t1 = tca + thc;
    return t1 >= 0 ? t1 : Infinity;
  };
  U.dirFromAngles = (yaw, pitch, out) => {
    const cp = Math.cos(pitch);
    out.set(-Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp);
    return out;
  };
  U.isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  NA.U = U;

  // ---------------------------------------------------------------- save
  const KEY = 'noanticheat_save_v1';
  const Save = { data: null };
  Save.defaults = () => ({
    version: 1,
    createdAt: Date.now(),
    username: '',
    credits: 0,
    lifetimeCredits: 0,
    cheats: {},           // id -> { level, enabled, use }
    highestTier: 1,
    winsByTier: {},
    stats: { matches: 0, wins: 0, kills: 0, deaths: 0, headshots: 0, shotsFired: 0, shotsHit: 0, reports: 0, accHistory: [] },
    flags: {},
    achievements: [],
    sellerDMs: [],        // { text, t, read }
    practiceStartedAt: null,
    settings: { sens: 1, volume: 0.8, autoQueue: true, showFps: false },
  });
  Save.load = () => {
    const def = Save.defaults();
    let d = null;
    try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { d = null; }
    if (!d || typeof d !== 'object') d = def;
    for (const k of Object.keys(def)) if (d[k] === undefined) d[k] = def[k];
    for (const k of ['stats', 'settings']) {
      for (const kk of Object.keys(def[k])) if (d[k][kk] === undefined) d[k][kk] = def[k][kk];
    }
    Save.data = d;
    return d;
  };
  Save.save = () => {
    try { localStorage.setItem(KEY, JSON.stringify(Save.data)); } catch (e) { /* storage full or blocked */ }
  };
  Save.reset = () => { Save.data = Save.defaults(); Save.save(); };
  Save.level = id => (Save.data.cheats[id] ? Save.data.cheats[id].level : 0);
  Save.accountAge = () => Math.floor((Date.now() - Save.data.createdAt) / 86400000);
  Save.anticheatDays = () => NA.DATA.ANTICHEAT_DAYS_BASE + Save.accountAge();
  NA.Save = Save;

  // ---------------------------------------------------------------- audio
  const A = { ctx: null, master: null, noise: null, volume: 0.8 };
  A.unlock = () => {
    try {
      if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      A.ctx = new AC();
      A.master = A.ctx.createGain();
      A.master.gain.value = A.volume;
      A.master.connect(A.ctx.destination);
      const len = Math.floor(A.ctx.sampleRate * 0.4);
      A.noise = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
      const ch = A.noise.getChannelData(0);
      for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
      const s = A.ctx.createBufferSource();
      s.buffer = A.ctx.createBuffer(1, 1, 22050);
      s.connect(A.master);
      s.start(0);
    } catch (e) { A.ctx = null; }
  };
  A.setVolume = v => { A.volume = v; if (A.master) A.master.gain.value = v; };
  const env = (g, t, attack, peak, decay) => {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  };
  A.tone = (freq, dur, type, vol, delay, slideTo) => {
    if (!A.ctx) return;
    const t = A.ctx.currentTime + (delay || 0);
    const o = A.ctx.createOscillator();
    const g = A.ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    env(g, t, 0.004, vol || 0.2, dur);
    o.connect(g); g.connect(A.master);
    o.start(t); o.stop(t + dur + 0.05);
  };
  A.noiseBurst = (filterType, freq, dur, vol, delay) => {
    if (!A.ctx) return;
    const t = A.ctx.currentTime + (delay || 0);
    const s = A.ctx.createBufferSource();
    s.buffer = A.noise;
    const f = A.ctx.createBiquadFilter();
    f.type = filterType; f.frequency.value = freq;
    const g = A.ctx.createGain();
    env(g, t, 0.002, vol, dur);
    s.connect(f); f.connect(g); g.connect(A.master);
    s.start(t); s.stop(t + dur + 0.05);
  };
  A.shot = (kind, distance) => {
    const att = 1 / (1 + (distance || 0) * 0.07);
    if (kind === 'rifle') { A.noiseBurst('lowpass', 2800, 0.11, 0.55 * att); A.tone(160, 0.09, 'sine', 0.45 * att, 0, 55); }
    else if (kind === 'pistol') { A.noiseBurst('lowpass', 2000, 0.16, 0.6 * att); A.tone(130, 0.12, 'sine', 0.5 * att, 0, 45); }
    else { A.noiseBurst('lowpass', 1300, 0.12, 0.35 * att); A.tone(110, 0.1, 'sine', 0.25 * att, 0, 45); }
  };
  A.hit = () => A.tone(1700, 0.05, 'square', 0.08);
  A.headshot = streak => { A.tone(1300 + streak * 70, 0.08, 'sine', 0.25); A.tone(1950 + streak * 100, 0.12, 'sine', 0.18, 0.05); };
  A.kill = () => { A.tone(240, 0.14, 'triangle', 0.3, 0, 120); A.noiseBurst('bandpass', 900, 0.08, 0.15); };
  A.hurt = () => A.tone(180, 0.12, 'sawtooth', 0.12, 0, 90);
  A.chat = () => A.tone(880, 0.035, 'triangle', 0.05);
  A.buy = () => [523, 659, 784, 1047].forEach((f, i) => A.tone(f, 0.09, 'square', 0.07, i * 0.06));
  A.deny = () => A.tone(160, 0.15, 'square', 0.08);
  A.click = () => A.tone(1200, 0.025, 'square', 0.04);
  A.reload = () => { A.noiseBurst('highpass', 3000, 0.04, 0.2); A.noiseBurst('highpass', 2500, 0.05, 0.2, 0.25); };
  A.fumble = () => { A.noiseBurst('lowpass', 600, 0.12, 0.3); A.tone(300, 0.2, 'sine', 0.12, 0.05, 120); };
  A.win = () => [392, 523, 659, 784].forEach((f, i) => A.tone(f, 0.18, 'triangle', 0.12, i * 0.11));
  A.lose = () => [392, 330, 262].forEach((f, i) => A.tone(f, 0.22, 'triangle', 0.12, i * 0.14));
  NA.Audio = A;

  // Haptics on iOS through the Capacitor bridge when the app runs natively.
  NA.haptic = (style) => {
    try {
      const h = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics;
      if (h) h.impact({ style: style || 'LIGHT' });
    } catch (e) { /* not native */ }
  };
})(window.NA);
