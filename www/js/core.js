/* NO ANTICHEAT: helpers, save data and synthesized audio. */
window.NA = window.NA || {};
window.NA.VERSION = '1.1.1';
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
    let tmin = 0, tmax = maxT, t1, t2, s;
    if (dx > -1e-9 && dx < 1e-9) { if (ox < b.minX || ox > b.maxX) return Infinity; }
    else { t1 = (b.minX - ox) / dx; t2 = (b.maxX - ox) / dx; if (t1 > t2) { s = t1; t1 = t2; t2 = s; } if (t1 > tmin) tmin = t1; if (t2 < tmax) tmax = t2; if (tmin > tmax) return Infinity; }
    if (dy > -1e-9 && dy < 1e-9) { if (oy < b.minY || oy > b.maxY) return Infinity; }
    else { t1 = (b.minY - oy) / dy; t2 = (b.maxY - oy) / dy; if (t1 > t2) { s = t1; t1 = t2; t2 = s; } if (t1 > tmin) tmin = t1; if (t2 < tmax) tmax = t2; if (tmin > tmax) return Infinity; }
    if (dz > -1e-9 && dz < 1e-9) { if (oz < b.minZ || oz > b.maxZ) return Infinity; }
    else { t1 = (b.minZ - oz) / dz; t2 = (b.maxZ - oz) / dz; if (t1 > t2) { s = t1; t1 = t2; t2 = s; } if (t1 > tmin) tmin = t1; if (t2 < tmax) tmax = t2; if (tmin > tmax) return Infinity; }
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
    guns: { p9: true },   // owned Armory guns
    loadout: { primary: null, secondary: 'p9' },
    tourney: { played: 0, won: 0 },
    playMode: 'casual',
    prestige: 0,
    cosmetics: { style: 'cross', color: 'white', owned: [], outfit: 'recruit', gunskin: 'factory', knife: 'combat', killfx: 'default' },
    season: { id: 0, peak: 0, history: [] },
    daily: { day: '', items: [], streak: 0, lastLogin: '' },
    mastery: {},
    reports: { filed: 0, banned: 0, pending: [] },
    clips: [],
    profiles: {},
    configsOwned: [],
    adv: {},
    client: { theme: 'auto', watermark: true, arraylist: true, targetHud: true, boxStyle: 'full', chamsStyle: 'solid', tracer: 'bottom', hitSound: 'classic', v11: true },
    sellers: { owned: {}, active: 'skillissue', subLeft: 0, status: {}, patchIn: 4, patches: 0, minerTotal: 0 },
    comms: { last: 0, msgs: {}, posts: [], rep: 0, notoriety: 0, notorietyAt: 0, unread: 0 },
    ranked: { rr: 0, peakRR: 0, offenses: 0, banUntil: 0, perma: false, ban: null, appeal: null, acVersion: [3, 0, 0], bypassDetected: false, patchReadyAt: 0,
      sinceUpdate: 0, nextUpdate: 4, alts: 0, bans: 0, appealsWon: 0, matches: 0 },
    settings: { sens: 1, volume: 0.8, autoQueue: true, showFps: false, lang: 'en', difficulty: 'normal', gfx: 'high', matchType: 'score' },
  });
  Save.load = () => {
    const def = Save.defaults();
    let d = null;
    try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { d = null; }
    if (!d || typeof d !== 'object') d = def;
    for (const k of Object.keys(def)) if (d[k] === undefined) d[k] = def[k];
    for (const k of ['stats', 'settings', 'ranked', 'cosmetics', 'season', 'daily', 'reports', 'comms', 'client', 'sellers']) {
      for (const kk of Object.keys(def[k])) if (d[k][kk] === undefined) d[k][kk] = def[k][kk];
    }
    // v1.1: menus follow the loaded seller's colours unless you pick a theme
    if (!d.client.v11) { if (d.client.theme === 'purple') d.client.theme = 'auto'; d.client.v11 = true; }
    if (d.highestTier >= 2 && !d.guns.ar7) { d.guns.ar7 = true; if (!d.loadout.primary) d.loadout.primary = 'ar7'; }
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
    const cls = NA.DATA.WEAPONS[kind] ? NA.DATA.WEAPONS[kind].cls : kind;
    if (cls === 'sniper' || cls === 'dmr') { A.noiseBurst('lowpass', 1800, 0.3, 0.75 * att); A.tone(90, 0.25, 'sine', 0.6 * att, 0, 35); return; }
    if (cls === 'shotgun') { A.noiseBurst('lowpass', 1200, 0.25, 0.8 * att); A.tone(80, 0.18, 'sine', 0.6 * att, 0, 40); return; }
    if (cls === 'smg' || cls === 'lmg') { A.noiseBurst('lowpass', 3400, 0.07, 0.45 * att); A.tone(190, 0.06, 'sine', 0.35 * att, 0, 70); return; }
    kind = cls;
    if (kind === 'rifle') { A.noiseBurst('lowpass', 2800, 0.11, 0.55 * att); A.tone(160, 0.09, 'sine', 0.45 * att, 0, 55); }
    else if (kind === 'pistol') { A.noiseBurst('lowpass', 2000, 0.16, 0.6 * att); A.tone(130, 0.12, 'sine', 0.5 * att, 0, 45); }
    else { A.noiseBurst('lowpass', 1300, 0.12, 0.35 * att); A.tone(110, 0.1, 'sine', 0.25 * att, 0, 45); }
  };
  A.hit = head => {
    const st = (NA.Save.data && NA.Save.data.client && NA.Save.data.client.hitSound) || 'classic', k = head ? 1.5 : 1;
    if (st === 'off') return;
    if (st === 'bonk') { A.tone(220 * k, 0.09, 'square', 0.09, 0, 110 * k); return; }
    if (st === 'ding') { A.tone(1568 * k, 0.25, 'triangle', 0.07); A.tone(2093 * k, 0.2, 'sine', 0.04, 0.01); return; }
    if (st === 'pop') { A.noiseBurst('bandpass', 2400 * k, 0.04, 0.2); A.tone(900 * k, 0.04, 'sine', 0.06); return; }
    if (head) A.headshot((NA.Game && NA.Game.player && NA.Game.player.streak) || 0); else A.tone(1700, 0.05, 'square', 0.08);
  };

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
  A.knife = () => { A.noiseBurst('highpass', 2600, 0.12, 0.28); A.tone(700, 0.1, 'sine', 0.06, 0, 300); };
  // the loader's INJECT: a quick run of data chirps
  A.inject = () => { for (let i = 0; i < 9; i++) A.tone(600 + i * 140 + Math.random() * 80, 0.045, 'square', 0.035, i * 0.07); A.noiseBurst('highpass', 3500, 0.5, 0.05, 0.1); };
  A.whoosh = (d) => A.noiseBurst('bandpass', 900 + Math.random() * 400, 0.18, 0.06, d || 0);
  A.equip = () => { A.noiseBurst('highpass', 4000, 0.03, 0.18); A.noiseBurst('highpass', 3000, 0.04, 0.16, 0.08); A.tone(520, 0.05, 'square', 0.04, 0.08); };
  // the logo sting: sub boom, a rising sweep, two glitch ticks and a bright chord
  A.intro = () => {
    if (!A.ctx) return;
    A.tone(55, 1.1, 'sine', 0.55, 0, 38);
    A.noiseBurst('lowpass', 500, 0.5, 0.35);
    A.tone(180, 0.7, 'sawtooth', 0.05, 0.05, 900);
    A.noiseBurst('highpass', 5000, 0.03, 0.2, 0.55); A.noiseBurst('highpass', 5000, 0.03, 0.2, 0.63);
    [523, 659, 784, 1047].forEach((f, i) => A.tone(f, 0.9, 'triangle', 0.07, 0.72 + i * 0.015));
    A.tone(1568, 0.6, 'sine', 0.05, 0.75);
  };
  A.lose = () => [392, 330, 262].forEach((f, i) => A.tone(f, 0.22, 'triangle', 0.12, i * 0.14));
  NA.Audio = A;

  // Graphics quality: High has sun shadows and full resolution, Low is for older phones.
  NA.Graphics = {
    quality: () => (NA.Save.data && NA.Save.data.settings.gfx) || 'high',
    shadows: () => NA.Graphics.quality() === 'high',
    set(q) {
      NA.Save.data.settings.gfx = q; NA.Save.save();
      if (NA.Decor && NA.R) NA.Decor.setShadows(q === 'high');
      window.dispatchEvent(new Event('resize'));
    },
  };

  // Haptics on iOS through the Capacitor bridge when the app runs natively.
  NA.haptic = (style) => {
    try {
      const h = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics;
      if (h) h.impact({ style: style || 'LIGHT' });
    } catch (e) { /* not native */ }
  };
})(window.NA);
