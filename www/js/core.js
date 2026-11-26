/* Kaido Nights: shared helpers, save data, sound and haptics. */
window.KN = window.KN || {};
(function (KN) {
  'use strict';
  KN.VERSION = '0.1';

  // ---------------------------------------------------------------- math + misc
  const U = KN.U = {
    clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
    lerp: (a, b, t) => a + (b - a) * t,
    rand: (a, b) => a + Math.random() * (b - a),
    randInt: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
    pick: arr => arr[Math.floor(Math.random() * arr.length)],
    fmt: n => Math.round(n).toLocaleString('en-US'),
    approach: (v, t, d) => (v < t ? Math.min(t, v + d) : Math.max(t, v - d)),
    // wrap an angle to [-PI, PI]
    wrap: a => { a = (a + Math.PI) % (Math.PI * 2); if (a < 0) a += Math.PI * 2; return a - Math.PI; },
    // frame-rate independent smoothing factor
    damp: (rate, dt) => 1 - Math.exp(-rate * dt),
    rng(seed) {
      let a = seed >>> 0;
      return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    },
    hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; },
    esc: s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
    today: () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); },
  };
  KN.$ = id => document.getElementById(id);

  // ---------------------------------------------------------------- save
  const KEY = 'kaidonights_save_v1';
  const carState = (paint, rust) => ({ paint, finish: 'gloss', wheels: '#c9ccd2', rust: !!rust, parts: { engine: 0, tires: 0, susp: 0, angle: 0, handbrake: 0, weight: 0 }, kit: { spoiler: 0 } });
  const DEFAULT = () => ({
    v: 1,
    intro: { step: 0, done: false },
    credits: 0, rep: 0,
    car: 'rookie',
    cars: { rookie: carState('#8a8f96', true) },
    taken: {},          // districtId -> true once you've beaten its crew
    best: {},           // districtId -> best free-roam score
    settings: { controls: 'thumb', volume: 0.8, haptics: true, quality: 'high', tiltSens: 1 },
    stats: { runs: 0, drifts: 0, bestDrift: 0, totalPoints: 0, nearMiss: 0, manji: 0, links: 0, tandem: 0, crashes: 0, battlesWon: 0 },
    meet: { day: '', shown: false },
    challenges: { day: '', list: [] },
  });
  function merge(base, extra) {
    for (const k in extra) {
      if (extra[k] && typeof extra[k] === 'object' && !Array.isArray(extra[k]) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) merge(base[k], extra[k]);
      else base[k] = extra[k];
    }
    return base;
  }
  KN.Save = {
    data: DEFAULT(),
    carState,
    load() {
      try { const raw = localStorage.getItem(KEY); if (raw) this.data = merge(DEFAULT(), JSON.parse(raw)); } catch (e) { this.data = DEFAULT(); }
      // every owned car gets any part slot added later
      for (const id in this.data.cars) this.data.cars[id] = merge(carState('#888', false), this.data.cars[id]);
      return this.data;
    },
    save() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* storage full or blocked */ } },
    reset() { this.data = DEFAULT(); this.save(); },
    car() { return this.data.cars[this.data.car]; },
  };

  // ---------------------------------------------------------------- haptics
  KN.Haptics = {
    tap(style) {
      if (!KN.Save.data.settings.haptics) return;
      const H = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics;
      if (H) { H.impact({ style: style || 'LIGHT' }).catch(() => {}); return; }
      if (navigator.vibrate) navigator.vibrate(style === 'HEAVY' ? 40 : 12);
    },
  };

  // ---------------------------------------------------------------- sound: engine, tyres, UI
  const A = KN.Audio = { ctx: null, ready: false };
  A.init = function () {
    if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = A.ctx = new AC();
    A.master = ctx.createGain(); A.master.gain.value = KN.Save.data.settings.volume; A.master.connect(ctx.destination);
    // engine: two detuned saws through a low-pass, plus a sub square
    A.engGain = ctx.createGain(); A.engGain.gain.value = 0;
    const lp = A.engLP = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 2.5;
    A.osc = [];
    for (const [type, mul, vol] of [['sawtooth', 1, 0.5], ['sawtooth', 1.01, 0.35], ['square', 0.5, 0.25]]) {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = 50;
      const g = ctx.createGain(); g.gain.value = vol;
      o.connect(g); g.connect(lp); o.start();
      A.osc.push({ o, mul });
    }
    lp.connect(A.engGain); A.engGain.connect(A.master);
    // tyre squeal + skid hiss: looped noise through a band-pass
    const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    A.noiseBuf = buf;
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const bp = A.skidBP = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = 3;
    A.skidGain = ctx.createGain(); A.skidGain.gain.value = 0;
    src.connect(bp); bp.connect(A.skidGain); A.skidGain.connect(A.master); src.start();
    A.ready = true;
  };
  A.setVolume = v => { if (A.master) A.master.gain.value = v; };
  // rpm 0..1, load 0..1 (throttle), on: engine audible at all
  A.engine = function (rpm, load, on) {
    if (!A.ready) return;
    const t = A.ctx.currentTime, f = 38 + rpm * 150;
    for (const o of A.osc) o.o.frequency.setTargetAtTime(f * o.mul, t, 0.03);
    A.engLP.frequency.setTargetAtTime(500 + rpm * 1600 + load * 900, t, 0.05);
    A.engGain.gain.setTargetAtTime(on ? 0.06 + load * 0.1 : 0, t, 0.08);
  };
  A.skid = function (k) {
    if (!A.ready) return;
    const t = A.ctx.currentTime;
    A.skidGain.gain.setTargetAtTime(Math.min(0.32, k * 0.32), t, 0.05);
    A.skidBP.frequency.setTargetAtTime(1400 + k * 900, t, 0.08);
  };
  A.tone = function (freq, dur, type, vol, delay, slideTo) {
    if (!A.ready) return;
    const ctx = A.ctx, t = ctx.currentTime + (delay || 0);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol || 0.15, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(A.master); o.start(t); o.stop(t + dur + 0.05);
  };
  A.thud = function (k) {
    if (!A.ready) return;
    const ctx = A.ctx, t = ctx.currentTime, src = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    src.buffer = A.noiseBuf; f.type = 'lowpass'; f.frequency.value = 260 + k * 300;
    g.gain.setValueAtTime(0.25 + 0.35 * k, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    src.connect(f); f.connect(g); g.connect(A.master); src.start(t, Math.random()); src.stop(t + 0.4);
    A.tone(70, 0.3, 'sine', 0.3 * k, 0, 40);
  };
  A.click = () => A.tone(1250, 0.05, 'square', 0.05);
  A.bank = n => { A.tone(660, 0.12, 'triangle', 0.14); A.tone(990, 0.18, 'triangle', 0.12, 0.08); if (n > 1) A.tone(1320, 0.22, 'triangle', 0.1, 0.16); };
  A.bonus = () => A.tone(1500, 0.08, 'sine', 0.1, 0, 2100);
  A.lose = () => { A.tone(300, 0.25, 'sawtooth', 0.1, 0, 120); };
  A.step = () => A.tone(880, 0.06, 'sine', 0.08);
  A.win = () => [523, 659, 784, 1047].forEach((f, i) => A.tone(f, 0.3, 'triangle', 0.12, i * 0.11));
  A.spray = function () {
    if (!A.ready) return;
    const ctx = A.ctx, t = ctx.currentTime, src = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    src.buffer = A.noiseBuf; f.type = 'highpass'; f.frequency.value = 3000;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.18, t + 0.2); g.gain.linearRampToValueAtTime(0.0001, t + 1.6);
    src.connect(f); f.connect(g); g.connect(A.master); src.start(t); src.stop(t + 1.7);
  };
})(window.KN);
