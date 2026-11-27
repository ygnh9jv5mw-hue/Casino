/* NO ANTICHEAT: maps, collision, raycasts and bot navigation. */
(function (NA) {
  'use strict';
  const U = NA.U;
  const W = { current: null };

  // ---------------------------------------------------------------- textures
  // Procedural, tileable canvas textures: value-noise fills plus drawn detail (bricks, planks,
  // corrugation, tiles...). Generated once per material, only for the maps you actually load.
  const texCache = {};
  const hex = c => { const n = typeof c === 'number' ? c : parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const css = (rgb, k) => `rgb(${Math.max(0, Math.min(255, rgb[0] * k)) | 0},${Math.max(0, Math.min(255, rgb[1] * k)) | 0},${Math.max(0, Math.min(255, rgb[2] * k)) | 0})`;
  function seeded(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function hashStr(k) { let h = 2166136261; for (let i = 0; i < k.length; i++) { h ^= k.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  // tileable fbm noise, N x N, values ~0..1
  function fbm(seed, N, octs, base) {
    const out = new Float32Array(N * N), r = seeded(seed);
    let amp = 0.5, tot = 0;
    for (let o = 0; o < octs; o++) {
      const P = (base || 4) << o, v = new Float32Array(P * P);
      for (let i = 0; i < v.length; i++) v[i] = r();
      for (let y = 0; y < N; y++) {
        const fy = y * P / N, yi = fy | 0, yf = fy - yi, sy = yf * yf * (3 - 2 * yf), y0 = yi % P, y1 = (y0 + 1) % P;
        for (let x = 0; x < N; x++) {
          const fx = x * P / N, xi = fx | 0, xf = fx - xi, sx = xf * xf * (3 - 2 * xf), x0 = xi % P, x1 = (x0 + 1) % P;
          const a = v[x0 + y0 * P], b = v[x1 + y0 * P], c = v[x0 + y1 * P], d = v[x1 + y1 * P];
          out[x + y * N] += (a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy) * amp;
        }
      }
      tot += amp; amp *= 0.5;
    }
    for (let i = 0; i < out.length; i++) out[i] /= tot;
    return out;
  }
  // fill a 256 canvas with colour c modulated by noise (contrast k), computed at 128 and scaled up
  function noiseFill(g, seed, c, k, octs, base) {
    const N = 128, n = fbm(seed, N, octs || 4, base), rgb = hex(c);
    const cv = document.createElement('canvas'); cv.width = cv.height = N;
    const cg = cv.getContext('2d'), img = cg.createImageData(N, N);
    for (let i = 0; i < N * N; i++) {
      const m = 1 + (n[i] - 0.5) * 2 * k;
      img.data[i * 4] = Math.min(255, rgb[0] * m); img.data[i * 4 + 1] = Math.min(255, rgb[1] * m); img.data[i * 4 + 2] = Math.min(255, rgb[2] * m); img.data[i * 4 + 3] = 255;
    }
    cg.putImageData(img, 0, 0);
    g.imageSmoothingEnabled = true;
    g.drawImage(cv, 0, 0, 256, 256);
  }
  function speckle(g, r, n, cols, smin, smax, alpha) {
    for (let i = 0; i < n; i++) {
      g.globalAlpha = alpha * (0.5 + r() * 0.5);
      g.fillStyle = cols[(r() * cols.length) | 0];
      const s = smin + r() * (smax - smin);
      g.fillRect(r() * 256, r() * 256, s, s);
    }
    g.globalAlpha = 1;
  }
  const DRAW = {
    dev(g, d, r) {
      noiseFill(g, d.seed, d.c[0], 0.05, 3);
      g.strokeStyle = d.c[1]; g.lineWidth = 2;
      for (let i = 0; i <= 256; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); }
      g.strokeStyle = d.c[2]; g.lineWidth = 6; g.strokeRect(0, 0, 256, 256);
      g.fillStyle = d.c[2]; g.globalAlpha = 0.6; g.font = 'bold 18px monospace'; g.fillText('1m', 10, 26); g.globalAlpha = 1;
    },
    concrete(g, d, r) {
      noiseFill(g, d.seed, d.c[0], 0.12, 5);
      speckle(g, r, 900, [d.c[1], d.c[2]], 1, 3, 0.25);
      g.globalAlpha = 0.18; g.fillStyle = d.c[1];
      for (let i = 0; i < 5; i++) { g.beginPath(); g.ellipse(r() * 256, r() * 256, 20 + r() * 40, 10 + r() * 25, r() * 3, 0, 7); g.fill(); }
      g.globalAlpha = 0.5; g.strokeStyle = d.c[1]; g.lineWidth = 2; g.strokeRect(1, 1, 254, 254); g.globalAlpha = 1;
      // a hairline crack
      g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1; g.beginPath(); let x = r() * 256, y = r() * 256; g.moveTo(x, y);
      for (let i = 0; i < 8; i++) { x += (r() - 0.5) * 40; y += (r() - 0.3) * 30; g.lineTo(x, y); } g.stroke();
    },
    asphalt(g, d, r) {
      noiseFill(g, d.seed, d.c[0], 0.1, 4);
      speckle(g, r, 2600, [d.c[1], d.c[2], '#9a9a9a'], 1, 2.5, 0.35);
    },
    plaster(g, d, r) {
      noiseFill(g, d.seed, d.c[0], 0.022, 4, 16);
      speckle(g, r, 500, [d.c[1], d.c[2]], 1, 2, 0.08);
      g.strokeStyle = d.c[1]; g.globalAlpha = 0.35; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 0.5); g.lineTo(256, 0.5); g.moveTo(0.5, 0); g.lineTo(0.5, 256); g.stroke(); g.globalAlpha = 1;
    },
    brick(g, d, r) {
      noiseFill(g, d.seed, d.c[1], 0.08, 3);
      const bh = 32, bw = 64, base = hex(d.c[0]);
      for (let row = 0; row < 8; row++) {
        for (let k = -1; k < 5; k++) {
          const x = k * bw + (row % 2) * 32 + 3, y = row * bh + 3, m = 0.82 + r() * 0.3;
          g.fillStyle = css(base, m); g.fillRect(x, y, bw - 6, bh - 6);
          g.fillStyle = 'rgba(255,255,255,0.10)'; g.fillRect(x, y, bw - 6, 3);
          g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x, y + bh - 9, bw - 6, 3);
        }
      }
      speckle(g, r, 1400, ['#000', d.c[2]], 1, 3, 0.12);
    },
    planks(g, d, r) {
      const base = hex(d.c[0]);
      for (let i = 0; i < 4; i++) {
        g.fillStyle = css(base, 0.85 + r() * 0.25); g.fillRect(0, i * 64, 256, 64);
        g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 1.5;
        for (let k = 0; k < 6; k++) { g.beginPath(); const y = i * 64 + 6 + k * 9 + r() * 4; g.moveTo(0, y); for (let x = 0; x <= 256; x += 32) g.lineTo(x, y + Math.sin(x / 40 + k + i) * 2.5); g.stroke(); }
        g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, i * 64 + 61, 256, 3);
      }
      g.strokeStyle = d.c[2]; g.lineWidth = 16; g.strokeRect(8, 8, 240, 240);
      g.beginPath(); g.moveTo(12, 244); g.lineTo(244, 12); g.lineWidth = 14; g.stroke();
      g.fillStyle = '#2a2a2a'; for (const [x, y] of [[14, 14], [242, 14], [14, 242], [242, 242]]) { g.beginPath(); g.arc(x, y, 3.5, 0, 7); g.fill(); }
    },
    wood(g, d, r) {
      noiseFill(g, d.seed, d.c[0], 0.08, 3);
      g.strokeStyle = 'rgba(0,0,0,0.13)'; g.lineWidth = 1.5;
      for (let k = 0; k < 26; k++) { g.beginPath(); const y = k * 10 + r() * 5; g.moveTo(0, y); for (let x = 0; x <= 256; x += 16) g.lineTo(x, y + Math.sin(x / 30 + k) * 3); g.stroke(); }
      g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(0, 0, 256, 2);
    },
    ribs(g, d, r) {
      const base = hex(d.c[0]);
      for (let x = 0; x < 256; x += 2) { const ph = (x % 32) / 32, k = 0.78 + 0.32 * Math.abs(Math.sin(ph * Math.PI)); g.fillStyle = css(base, k); g.fillRect(x, 0, 2, 256); }
      const N = 64, n = fbm(d.seed, N, 4), cv = document.createElement('canvas'); cv.width = cv.height = N;
      const cg = cv.getContext('2d'), img = cg.createImageData(N, N);
      for (let i = 0; i < N * N; i++) { const a = Math.max(0, Math.min(1, (n[i] - 0.56) * 6)); img.data[i * 4] = 92; img.data[i * 4 + 1] = 52; img.data[i * 4 + 2] = 24; img.data[i * 4 + 3] = a * 70; }
      cg.putImageData(img, 0, 0); g.imageSmoothingEnabled = true; g.drawImage(cv, 0, 0, 256, 256);
      g.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = 0; i < 18; i++) { const x = r() * 256; g.fillRect(x, 200 + r() * 40, 2, 40 + r() * 40); }
      g.strokeStyle = css(base, 0.55); g.lineWidth = 10; g.strokeRect(0, 0, 256, 256);
    },
    metal(g, d, r) {
      noiseFill(g, d.seed, d.c[0], 0.05, 3);
      g.globalAlpha = 0.035; for (let i = 0; i < 120; i++) { g.fillStyle = r() < 0.5 ? '#fff' : '#000'; g.fillRect(0, r() * 256, 256, 1); } g.globalAlpha = 1;
      g.strokeStyle = d.c[1]; g.lineWidth = 3; g.strokeRect(2, 2, 252, 252);
      g.fillStyle = d.c[2]; for (let i = 12; i < 256; i += 46) { for (const y of [10, 246]) { g.beginPath(); g.arc(i, y, 3, 0, 7); g.fill(); } }
    },
    soft(g, d, r) {
      noiseFill(g, d.seed, d.c[0], d.k || 0.18, 5);
      speckle(g, r, d.n || 1800, [d.c[1], d.c[2]], 2, 5, 0.3);
    },
    grass(g, d, r) {
      noiseFill(g, d.seed, d.c[0], 0.16, 5);
      g.lineWidth = 2;
      for (let i = 0; i < 900; i++) { const x = r() * 256, y = r() * 256; g.strokeStyle = r() < 0.5 ? d.c[1] : d.c[2]; g.globalAlpha = 0.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 4, y - 4 - r() * 5); g.stroke(); }
      g.globalAlpha = 1;
    },
    sand(g, d, r) {
      noiseFill(g, d.seed, d.c[0], 0.08, 5);
      g.strokeStyle = 'rgba(120,90,40,0.12)'; g.lineWidth = 3;
      for (let k = 0; k < 9; k++) { g.beginPath(); const y = k * 29 + r() * 8; g.moveTo(0, y); for (let x = 0; x <= 256; x += 16) g.lineTo(x, y + Math.sin(x / 26 + k) * 5); g.stroke(); }
      speckle(g, r, 1500, [d.c[1], d.c[2]], 1, 2, 0.3);
    },
    tile(g, d, r) {
      const base = hex(d.c[0]);
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = css(base, 0.94 + r() * 0.1); g.fillRect(x * 64, y * 64, 64, 64); }
      g.fillStyle = 'rgba(255,255,255,0.08)'; for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) g.fillRect(x * 64 + 6, y * 64 + 6, 20, 52);
      g.strokeStyle = d.c[2]; g.lineWidth = 3;
      for (let i = 0; i <= 256; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); }
      speckle(g, r, 300, ['#000'], 1, 2, 0.08);
    },
    tileWall(g, d, r) {
      const base = hex(d.c[0]);
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = css(base, 0.95 + r() * 0.08); g.fillRect(x * 32, y * 32, 32, 32); }
      g.fillStyle = d.c[2]; g.fillRect(0, 192, 256, 32);
      g.strokeStyle = 'rgba(0,0,0,0.18)'; g.lineWidth = 2;
      for (let i = 0; i <= 256; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); }
    },
    stone(g, d, r) {
      noiseFill(g, d.seed, d.c[0], 0.16, 5);
      g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 3;
      for (let row = 0; row < 4; row++) {
        g.beginPath(); g.moveTo(0, row * 64); g.lineTo(256, row * 64); g.stroke();
        for (let k = 0; k < 3; k++) { const x = k * 96 + (row % 2) * 48 + r() * 10; g.beginPath(); g.moveTo(x, row * 64); g.lineTo(x, row * 64 + 64); g.stroke(); }
      }
      speckle(g, r, 900, [d.c[1], d.c[2]], 1, 3, 0.2);
    },
    rock(g, d, r) {
      noiseFill(g, d.seed, d.c[0], 0.28, 6, 3);
      g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 2;
      for (let c = 0; c < 6; c++) { g.beginPath(); let x = r() * 256, y = r() * 256; g.moveTo(x, y); for (let i = 0; i < 6; i++) { x += (r() - 0.5) * 60; y += (r() - 0.5) * 60; g.lineTo(x, y); } g.stroke(); }
      speckle(g, r, 700, [d.c[1], d.c[2]], 1, 3, 0.25);
    },
    roof(g, d, r) {
      const base = hex(d.c[0]);
      for (let row = 0; row < 8; row++) for (let k = -1; k < 9; k++) {
        const x = k * 32 + (row % 2) * 16, y = row * 32;
        g.fillStyle = css(base, 0.8 + r() * 0.3); g.fillRect(x + 1, y, 30, 32);
        g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x + 1, y + 26, 30, 6);
      }
    },
    gravel(g, d, r) {
      noiseFill(g, d.seed, d.c[0], 0.14, 4);
      speckle(g, r, 3000, [d.c[1], d.c[2], '#777', '#222'], 2, 5, 0.5);
    },
    paint(g, d, r) {
      noiseFill(g, d.seed, d.c[0], 0.035, 4);
      g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, 0, 4, 256); g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(4, 0, 3, 256);
      g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 1;
      for (let i = 0; i < 14; i++) { const x = r() * 256, y = r() * 256; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 30, y + (r() - 0.5) * 8); g.stroke(); }
    },
    raised(g, d, r) {
      noiseFill(g, d.seed, d.c[0], 0.05, 3);
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
        g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(x * 64 + 3, y * 64 + 3, 58, 3);
        if ((x + y * 3) % 5 === 1) { g.fillStyle = 'rgba(0,0,0,0.45)'; for (let i = 0; i < 6; i++) for (let k = 0; k < 6; k++) g.fillRect(x * 64 + 10 + i * 8, y * 64 + 10 + k * 8, 3, 3); }
      }
      g.strokeStyle = d.c[1]; g.lineWidth = 3;
      for (let i = 0; i <= 256; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); }
    },
    rackfront(g, d, r) {
      g.fillStyle = '#121519'; g.fillRect(0, 0, 256, 256);
      for (let col = 0; col < 4; col++) {
        const x0 = col * 64;
        g.fillStyle = '#1b1f25'; g.fillRect(x0 + 3, 2, 58, 252);
        for (let u = 0; u < 21; u++) {
          const y = 6 + u * 12;
          g.fillStyle = r() < 0.3 ? '#22272e' : '#191d22'; g.fillRect(x0 + 6, y, 52, 10);
          g.fillStyle = 'rgba(0,0,0,0.6)'; for (let v = 0; v < 5; v++) g.fillRect(x0 + 24 + v * 6, y + 3, 3, 5);
          const n = 1 + ((r() * 3) | 0);
          for (let k = 0; k < n; k++) { const c = r(); g.fillStyle = c < 0.6 ? '#4ade80' : c < 0.85 ? '#38bdf8' : '#fbbf24'; g.globalAlpha = r() < 0.3 ? 0.25 : 1; g.fillRect(x0 + 9 + k * 5, y + 4, 3, 3); g.globalAlpha = 1; }
        }
        g.fillStyle = '#0a0c0f'; g.fillRect(x0, 0, 3, 256);
      }
    },
    ledboard(g, d) {
      g.fillStyle = '#05070c'; g.fillRect(0, 0, 256, 256);
      g.fillStyle = d.c[0]; g.font = '900 italic 46px Futura, "Arial Black", sans-serif'; g.textBaseline = 'middle';
      g.shadowColor = d.c[0]; g.shadowBlur = 10;
      g.fillText(d.text || 'FRAGLINE', 8, 64, 240); g.fillStyle = d.c[1]; g.shadowColor = d.c[1]; g.fillText(d.text2 || 'MAJOR', 8, 192, 240);
      g.shadowBlur = 0; g.fillStyle = 'rgba(0,0,0,0.35)'; for (let y = 0; y < 256; y += 4) g.fillRect(0, y, 256, 1);
    },
    grille(g, d) {
      g.fillStyle = '#16181c'; g.fillRect(0, 0, 256, 256);
      g.fillStyle = '#060708'; for (let y = 4; y < 256; y += 8) for (let x = (y / 8) % 2 * 4 + 4; x < 256; x += 8) { g.beginPath(); g.arc(x, y, 2.4, 0, 7); g.fill(); }
      g.strokeStyle = '#2a2d33'; g.lineWidth = 8; g.strokeRect(4, 4, 248, 248);
    },
    flightcase(g, d, r) {
      noiseFill(g, d.seed, '#1f2227', 0.06, 3);
      g.strokeStyle = '#a7adb5'; g.lineWidth = 14; g.strokeRect(7, 7, 242, 242);
      g.fillStyle = '#c8ccd2'; for (const [x, y] of [[0, 0], [216, 0], [0, 216], [216, 216]]) g.fillRect(x, y, 40, 40);
      g.fillStyle = '#7d838b'; g.fillRect(108, 120, 40, 16);
    },
    checker(g, d) {
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x + y) % 2 ? d.c[0] : d.c[1]; g.fillRect(x * 64, y * 64, 64, 64); }
      g.globalAlpha = 0.06; noiseFill(g, d.seed, '#ffffff', 0.5, 3); g.globalAlpha = 1;
    },
    panel(g, d, r) {
      noiseFill(g, d.seed, d.c[0], 0.04, 3);
      for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) {
        g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(x * 128 + 6, y * 128 + 6, 116, 4);
        g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x * 128 + 6, y * 128 + 118, 116, 4);
      }
      g.strokeStyle = d.c[1]; g.lineWidth = 4; for (let i = 0; i <= 256; i += 128) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); }
    },
    solid(g, d, r) {
      noiseFill(g, d.seed, d.c[0], d.k || 0.04, 4);
      if (d.c[1]) speckle(g, r, 300, [d.c[1]], 1, 2, 0.1);
    },
    carpet(g, d, r) {
      noiseFill(g, d.seed, d.c[0], 0.07, 5, 8);
      g.globalAlpha = 0.07; g.fillStyle = '#000';
      for (let y = 0; y < 256; y += 4) for (let x = (y / 4) % 2 * 4; x < 256; x += 8) g.fillRect(x, y, 4, 4);
      g.globalAlpha = 1;
      speckle(g, r, 1200, [d.c[1], d.c[2]], 1, 2, 0.18);
    },
  };
  // pictures that are mapped once over a face (signs, windows, targets...)
  const PICS = {
    sign(g, d) {
      g.fillStyle = d.bg; g.fillRect(0, 0, 512, 128);
      g.strokeStyle = d.fg; g.globalAlpha = 0.35; g.lineWidth = 6; g.strokeRect(6, 6, 500, 116); g.globalAlpha = 1;
      g.fillStyle = d.fg; g.font = '900 italic 64px Futura, "Arial Black", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(d.text, 256, 68, 480);
      if (d.sub) { g.font = '700 18px sans-serif'; g.globalAlpha = 0.8; g.fillText(d.sub, 256, 110); g.globalAlpha = 1; }
    },
    window(g, d) {
      const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#9fc7e8'); gr.addColorStop(0.55, '#4f7fa8'); gr.addColorStop(1, '#2b4a66');
      g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
      g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.moveTo(30, 0); g.lineTo(90, 0); g.lineTo(20, 256); g.lineTo(-40, 256); g.fill();
      g.strokeStyle = d.frame || '#e5e1d8'; g.lineWidth = 22; g.strokeRect(0, 0, 256, 256); g.lineWidth = 12; g.beginPath(); g.moveTo(128, 0); g.lineTo(128, 256); g.moveTo(0, 128); g.lineTo(256, 128); g.stroke();
    },
    windowCity(g) {
      const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#bcdcf5'); gr.addColorStop(1, '#e6f0f7'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
      const r = seeded(99);
      for (let i = 0; i < 9; i++) { const x = i * 30 - 10 + r() * 10, w = 22 + r() * 18, h = 60 + r() * 150; g.fillStyle = ['#7d8fa3', '#93a3b5', '#6b7d92'][i % 3]; g.fillRect(x, 256 - h, w, h); g.fillStyle = 'rgba(255,255,255,0.35)'; for (let y = 256 - h + 6; y < 250; y += 10) for (let xx = x + 3; xx < x + w - 4; xx += 7) g.fillRect(xx, y, 3, 4); }
      g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.moveTo(40, 0); g.lineTo(110, 0); g.lineTo(30, 256); g.lineTo(-40, 256); g.fill();
      g.strokeStyle = '#3b4250'; g.lineWidth = 14; g.strokeRect(0, 0, 256, 256); g.lineWidth = 6; g.beginPath(); g.moveTo(128, 0); g.lineTo(128, 256); g.stroke();
    },
    target(g) {
      g.fillStyle = '#f8fafc'; g.fillRect(0, 0, 256, 256);
      for (let i = 5; i > 0; i--) { g.fillStyle = i % 2 ? '#ef4444' : '#f8fafc'; g.beginPath(); g.arc(128, 128, i * 24, 0, 7); g.fill(); }
      g.strokeStyle = '#111'; g.lineWidth = 3; g.strokeRect(2, 2, 252, 252);
    },
    clock(g) {
      g.fillStyle = '#f5ecd7'; g.beginPath(); g.arc(128, 128, 120, 0, 7); g.fill();
      g.strokeStyle = '#3b2f22'; g.lineWidth = 10; g.stroke();
      g.fillStyle = '#3b2f22'; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.fillRect(128 + Math.sin(a) * 96 - 4, 128 - Math.cos(a) * 96 - 10, 8, 20); }
      g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + 50, 128 - 30); g.moveTo(128, 128); g.lineTo(128 - 10, 128 - 85); g.stroke();
    },
    adPanel(g, d) {
      const r = seeded(hashStr(d.key));
      const ads = [['SKILLISSUE.SHOP', 'undetected since yesterday', '#7c3aed'], ['FRAGLINE', 'now with anticheat (soon)', '#1d4ed8'], ['GAMER FUEL', 'tastes like 240hz', '#16a34a'], ['MOUSE PADS', 'xxl. for your ego', '#dc2626']];
      const a = ads[(r() * ads.length) | 0];
      g.fillStyle = '#0b0f17'; g.fillRect(0, 0, 512, 280); g.fillStyle = a[2]; g.fillRect(16, 16, 480, 248);
      g.fillStyle = '#fff'; g.font = '900 italic 52px Futura, "Arial Black", sans-serif'; g.textAlign = 'center'; g.fillText(a[0], 256, 140, 450);
      g.font = '600 24px sans-serif'; g.fillText(a[1], 256, 190, 450);
    },
    screenWarden(g) {
      g.fillStyle = '#04101f'; g.fillRect(0, 0, 512, 256);
      g.strokeStyle = 'rgba(56,189,248,0.15)'; g.lineWidth = 1; for (let x = 0; x < 512; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 256); g.stroke(); } for (let y = 0; y < 256; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
      g.fillStyle = '#38bdf8'; g.font = '900 italic 40px Futura, "Arial Black", sans-serif'; g.fillText('WARDEN AC', 20, 52);
      g.font = '700 18px ui-monospace, monospace'; g.fillStyle = '#94a3b8'; g.fillText('cheat detection network · node 07', 22, 78);
      g.fillStyle = '#e2e8f0'; g.font = '800 26px ui-monospace, monospace'; g.fillText('DETECTIONS TODAY:', 22, 130); g.fillStyle = '#f43f5e'; g.fillText('0', 330, 130);
      g.fillStyle = '#e2e8f0'; g.fillText('STATUS:', 22, 166); g.fillStyle = '#fbbf24'; g.fillText('COMING SOON™', 150, 166);
      g.strokeStyle = '#4ade80'; g.lineWidth = 3; g.beginPath(); g.moveTo(22, 222); for (let x = 22; x < 490; x += 6) g.lineTo(x, 222 + (Math.random() < 0.04 ? -8 : 0)); g.stroke();
      g.fillStyle = '#4ade80'; g.font = '600 14px ui-monospace, monospace'; g.fillText('flatline is normal. probably.', 300, 246);
    },
    screenGame(g) {
      const gr = g.createLinearGradient(0, 0, 0, 160); gr.addColorStop(0, '#5aa7e6'); gr.addColorStop(1, '#bfe0ff'); g.fillStyle = gr; g.fillRect(0, 0, 256, 160);
      g.fillStyle = '#5c9a46'; g.fillRect(0, 150, 256, 106); g.fillStyle = '#8a8f96'; g.fillRect(30, 96, 60, 60); g.fillRect(170, 110, 50, 46);
      g.fillStyle = '#ef4444'; g.fillRect(120, 118, 16, 34); g.fillStyle = '#f1c9a5'; g.fillRect(121, 104, 14, 14);
      g.strokeStyle = '#ffffff'; g.lineWidth = 3; g.beginPath(); g.moveTo(128, 112); g.lineTo(128, 124); g.moveTo(122, 118); g.lineTo(134, 118); g.stroke();
      g.fillStyle = '#111'; g.fillRect(150, 200, 106, 56); g.fillStyle = '#facc15'; g.font = 'bold 18px monospace'; g.fillText('30/90', 168, 236);
      g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(6, 6, 80, 14); g.fillStyle = '#4ade80'; g.fillRect(6, 6, 60, 14);
    },
    arcadeFront(g) {
      g.fillStyle = '#1e1b4b'; g.fillRect(0, 0, 256, 512);
      const m = g.createLinearGradient(0, 0, 256, 0); m.addColorStop(0, '#f43f5e'); m.addColorStop(1, '#a855f7'); g.fillStyle = m; g.fillRect(10, 10, 236, 70);
      g.fillStyle = '#fff'; g.font = '900 italic 34px Futura, "Arial Black", sans-serif'; g.textAlign = 'center'; g.fillText('HEADSHOT', 128, 58);
      g.fillStyle = '#020617'; g.fillRect(24, 100, 208, 170);
      g.fillStyle = '#22d3ee'; for (let i = 0; i < 6; i++) g.fillRect(40 + i * 30, 130 + (i % 2) * 20, 18, 12);
      g.fillStyle = '#facc15'; g.fillRect(118, 240, 20, 14); g.fillStyle = '#4ade80'; g.font = 'bold 14px monospace'; g.fillText('INSERT COIN', 128, 226);
      g.fillStyle = '#312e81'; g.fillRect(10, 290, 236, 80);
      g.fillStyle = '#111'; g.beginPath(); g.arc(70, 330, 16, 0, 7); g.fill(); g.fillStyle = '#ef4444'; g.beginPath(); g.arc(70, 318, 12, 0, 7); g.fill();
      [['#ef4444', 140], ['#facc15', 175], ['#22c55e', 210]].forEach(([c, x]) => { g.fillStyle = c; g.beginPath(); g.arc(x, 330, 11, 0, 7); g.fill(); });
      g.fillStyle = '#0f172a'; g.fillRect(100, 410, 56, 40); g.fillStyle = '#fbbf24'; g.fillRect(124, 420, 8, 20);
    },
    fridgeFront(g) {
      g.fillStyle = '#0b1220'; g.fillRect(0, 0, 256, 512);
      const gl = g.createLinearGradient(0, 0, 0, 512); gl.addColorStop(0, '#dbeafe'); gl.addColorStop(1, '#93c5fd'); g.fillStyle = gl; g.fillRect(14, 14, 228, 484);
      const cols = ['#22c55e', '#ef4444', '#3b82f6', '#f59e0b', '#a855f7'];
      for (let s = 0; s < 5; s++) { g.fillStyle = '#64748b'; g.fillRect(14, 100 + s * 92, 228, 4); for (let k = 0; k < 7; k++) { g.fillStyle = cols[(s + k) % 5]; g.fillRect(22 + k * 31, 52 + s * 92, 22, 46); g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(25 + k * 31, 56 + s * 92, 4, 38); } }
      g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(30, 20, 18, 470);
      g.fillStyle = '#0b1220'; g.fillRect(0, 0, 256, 40); g.fillStyle = '#4ade80'; g.font = '900 italic 24px Futura, "Arial Black", sans-serif'; g.textAlign = 'center'; g.fillText('GAMER FUEL', 128, 30);
    },
    neon(g, d) {
      g.fillStyle = '#05060a'; g.fillRect(0, 0, 512, 128);
      g.font = '900 italic 66px Futura, "Arial Black", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.shadowColor = d.fg; g.shadowBlur = 24; g.fillStyle = d.fg; g.fillText(d.text, 256, 60, 480); g.shadowBlur = 8; g.fillStyle = '#ffffff'; g.globalAlpha = 0.85; g.fillText(d.text, 256, 60, 480); g.globalAlpha = 1;
      if (d.sub) { g.shadowBlur = 10; g.shadowColor = d.fg; g.font = '700 20px sans-serif'; g.fillStyle = d.fg; g.fillText(d.sub, 256, 108); }
    },
    jumbo(g, d) {
      g.fillStyle = '#060912'; g.fillRect(0, 0, 512, 256);
      const gr = g.createLinearGradient(0, 0, 512, 0); gr.addColorStop(0, '#1d4ed8'); gr.addColorStop(0.5, '#0b1020'); gr.addColorStop(1, '#b91c1c'); g.fillStyle = gr; g.fillRect(0, 150, 512, 106);
      g.fillStyle = '#facc15'; g.font = '900 italic 48px Futura, "Arial Black", sans-serif'; g.textAlign = 'center'; g.fillText(d.text || 'GRAND FINAL', 256, 64);
      g.fillStyle = '#f43f5e'; g.font = '800 20px sans-serif'; g.fillText('● LIVE', 256, 100);
      g.fillStyle = '#fff'; g.font = '900 italic 40px Futura, "Arial Black", sans-serif'; g.fillText('TEAM A', 110, 216); g.fillText('TEAM B', 402, 216); g.fillText('vs', 256, 216);
    },
    poster(g, d) {
      g.fillStyle = d.bg; g.fillRect(0, 0, 256, 384);
      g.fillStyle = d.fg; g.font = '900 italic 40px Futura, "Arial Black", sans-serif'; g.textAlign = 'center';
      (d.lines || []).forEach((l, i) => { g.font = i === 0 ? '900 italic 40px Futura, "Arial Black", sans-serif' : '700 20px sans-serif'; g.fillText(l, 128, 90 + i * (i === 0 ? 50 : 30), 230); });
      g.strokeStyle = d.fg; g.lineWidth = 6; g.strokeRect(10, 10, 236, 364);
    },
    trainWin(g) {
      g.fillStyle = '#c8ccd2'; g.fillRect(0, 0, 512, 64);
      for (let i = 0; i < 8; i++) { const gr = g.createLinearGradient(0, 8, 0, 56); gr.addColorStop(0, '#5e7f9c'); gr.addColorStop(1, '#22313f'); g.fillStyle = gr; g.fillRect(8 + i * 63, 8, 52, 48); g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(12 + i * 63, 10, 10, 44); }
    },
  };
  function genTexture(key, d) {
    if (texCache[key]) return texCache[key];
    const pic = PICS[d.t];
    const c = document.createElement('canvas');
    if (pic) {
      const sz = { sign: [512, 128], adPanel: [512, 280], trainWin: [512, 64], screenWarden: [512, 256], arcadeFront: [256, 512], fridgeFront: [256, 512], neon: [512, 128], jumbo: [512, 256], poster: [256, 384] }[d.t] || [256, 256];
      c.width = sz[0]; c.height = sz[1];
    }
    else c.width = c.height = 256;
    const g = c.getContext('2d');
    d.seed = hashStr(key);
    d.key = key;
    (pic || DRAW[d.t] || DRAW.solid)(g, d, seeded(d.seed));
    const t = new THREE.CanvasTexture(c);
    if (!pic) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    texCache[key] = t;
    return t;
  }
  // t: texture style, c: colours, tile: metres per texture repeat. pic types are mapped once per face.
  const M = (t, c, tile, extra) => Object.assign({ t, c, tile }, extra || {});
  const MAT_DEFS = {
    devFloor: M('dev', ['#8d929b', '#6e737c', '#5d626b'], 4),
    devWall: M('dev', ['#b9bdc5', '#9a9ea6', '#8b8f97'], 4),
    devOrange: M('dev', ['#e8822e', '#c96a1c', '#b85d14'], 2),
    devGrey: M('dev', ['#9ba1ab', '#7f858f', '#6f757f'], 2),
    concrete: M('concrete', ['#8a8b86', '#6a6b66', '#9a9b96'], 4),
    wall: M('plaster', ['#5e6874', '#4a535e', '#6c7682'], 4),
    rack: M('metal', ['#2f6db5', '#1d4a7d', '#c9d6e8'], 2),
    pillar: M('paint', ['#e0aa3e', '#a77a24', '#6b4f14'], 2),
    crate: M('planks', ['#a0703a', '#6d4c24', '#7a5228'], 2),
    crate2: M('planks', ['#8b5e34', '#603f21', '#5e3d1f'], 2),
    paving: M('stone', ['#bdb6a8', '#a49e92', '#d0cabd'], 2),
    brick: M('brick', ['#a5523e', '#cdbfae', '#6e2f22'], 2),
    stone: M('stone', ['#aaa59c', '#938e85', '#c2bdb4'], 2),
    roof: M('roof', ['#7a3e30', '#5a3026', '#4a271f'], 3),
    hedge: M('soft', ['#3f7d3a', '#2a5a27', '#5c9a52'], 2),
    asphalt: M('asphalt', ['#4d5157', '#3a3d42', '#62666c'], 6),
    contR: M('ribs', ['#b23a2e'], 3), contB: M('ribs', ['#2e5fa8'], 3), contG: M('ribs', ['#3c8a4a'], 3), contY: M('ribs', ['#d9a628'], 3),
    crane: M('paint', ['#e8b53a', '#8a6a1f', '#5a4512'], 2),
    carpet: M('carpet', ['#5b6475', '#4b5363', '#6b7485'], 3),
    officeWall: M('plaster', ['#dfe2e6', '#c7cad0', '#eef0f2'], 4),
    desk: M('wood', ['#8a6b4c'], 2),
    cabinet: M('metal', ['#7b828c', '#5c626a', '#9aa1aa'], 1),
    tile: M('tile', ['#d3d7da', '#b8bcc0', '#9aa0a5'], 1.5),
    tileWall: M('tileWall', ['#e8e3d6', '#d3cdbf', '#3b6ea5'], 2),
    track: M('gravel', ['#4a4542', '#2c2826', '#6a645f'], 2),
    train: M('metal', ['#c8ccd2', '#8f959d', '#6b7179'], 4),
    bench: M('wood', ['#6f4e37'], 1),
    kiosk: M('paint', ['#c2410c', '#7c2d12', '#fed7aa'], 2),
    grass: M('grass', ['#5c9a46', '#3f7a32', '#7cb862'], 6),
    sand: M('sand', ['#dcc894', '#c9b47e', '#efe0b4'], 6),
    rock: M('rock', ['#83868c', '#5c5f65', '#a0a3a9'], 3),
    trunk: M('wood', ['#6b4a2f'], 1),
    leaves: M('soft', ['#3f8a3a', '#2b6229', '#62ad55'], 2, { k: 0.25 }),
    houseWall: M('plaster', ['#ece0c8', '#d8cbb2', '#f6ecd8'], 3),
    // decoration
    steel: M('metal', ['#8d949c', '#5f656c', '#c3c9cf'], 2),
    darkMetal: M('metal', ['#3a3f46', '#24282d', '#5a6068'], 1),
    stoneCap: M('stone', ['#d8d2c4', '#b9b3a6', '#ece6d8'], 2),
    gold: M('solid', ['#e0b23a', '#fff1b0'], 1, { k: 0.1 }),
    brickTower: M('brick', ['#8f4636', '#c9b8a6', '#5e2a20'], 2),
    roofTile: M('roof', ['#4a5a6b', '#334150', '#2a3540'], 2),
    paintY: M('solid', ['#f2c230'], 1), paintW: M('solid', ['#e8eaed'], 1),
    water: M('soft', ['#3d8ec9', '#9fd3f5', '#2a6ea3'], 3, { k: 0.12, n: 500 }),
    flowers: M('soft', ['#3f7d3a', '#f472b6', '#facc15'], 1, { k: 0.2, n: 2600 }),
    tower1: M('plaster', ['#9aa6b4', '#7d8a98', '#b4bfcb'], 6), tower2: M('plaster', ['#b8b0a2', '#9d9587', '#cfc8bb'], 6),
    roofTop: M('metal', ['#6b7280', '#4b5563', '#9ca3af'], 2),
    forklift: M('solid', ['#f2b51d', '#111111'], 1), tire: M('solid', ['#1b1b1d'], 1), pallet: M('wood', ['#b08a5a'], 1), barrel: M('ribs', ['#1e64b4'], 1),
    hazard: M('solid', ['#f2c230'], 1), craneCab: M('paint', ['#e8b53a', '#8a6a1f', '#5a4512'], 2), bollard: M('solid', ['#2b2f35'], 1),
    hull: M('metal', ['#26313f', '#151b23', '#3b4757'], 6), hullRed: M('solid', ['#9b2c2c'], 4), shipWhite: M('plaster', ['#eceff2', '#cfd4d9', '#ffffff'], 4),
    ceiling: M('tile', ['#eceef0', '#d5d8dc', '#c3c7cc'], 1.2), ceilingDark: M('metal', ['#3b414b', '#2a2f37', '#4c535e'], 3),
    skirting: M('solid', ['#6b7280'], 1), monitor: M('solid', ['#111827'], 1), chair: M('solid', ['#1f2937'], 1), pot: M('solid', ['#e7e5e4'], 1),
    platformEdge: M('solid', ['#f2c230'], 1), stripe: M('solid', ['#1f6fb2'], 1), door: M('metal', ['#9aa0a8', '#6b7179', '#c8ccd2'], 2), rail: M('metal', ['#9aa0a8', '#6b7179', '#c8ccd2'], 1),
    planksDeck: M('wood', ['#9c7a52'], 2), paintRedWall: M('plaster', ['#c0392b', '#a93226', '#d35445'], 3), paintWhiteWall: M('plaster', ['#f2f2f2', '#dadada', '#ffffff'], 3),
    palm: M('wood', ['#8a6a46'], 1), palmLeaf: M('soft', ['#3f9a3a', '#2b7229', '#6cc55e'], 1),
    // server farm
    raisedFloor: M('raised', ['#3a4049', '#262b32'], 2.4), serverWall: M('panel', ['#2a313b', '#1a1f26'], 3),
    serverRack: M('metal', ['#1d2127', '#121519', '#3a4048'], 2), rackFront: M('rackfront', null, 2.2),
    coreMetal: M('metal', ['#20314a', '#0f1a2b', '#3d5a80'], 2), console: M('metal', ['#3b4250', '#262b34', '#5a6270'], 1),
    coolUnit: M('metal', ['#c9ced6', '#9aa1ab', '#e5e8ec'], 2), upsCabinet: M('metal', ['#2b2f36', '#1b1e23', '#4b515a'], 2),
    cableSpool: M('wood', ['#7a5a3a'], 1), cableTray: M('solid', ['#e3b23c'], 1),
    // lan cafe
    cafeFloor: M('checker', ['#262033', '#1c1726'], 2), cafeWall: M('plaster', ['#2b2438', '#231d2e', '#352d44'], 3),
    pcDesk: M('solid', ['#16141c', '#2a2633'], 1), divider: M('solid', ['#2a2338', '#3a3150'], 1), vending: M('paint', ['#b91c1c', '#7f1d1d', '#fca5a5'], 2),
    arcade: M('solid', ['#1e1b4b', '#312e81'], 1), counter: M('wood', ['#5b3a24'], 2), fridge: M('metal', ['#d6dbe1', '#a5acb5', '#f1f3f5'], 2),
    couch: M('soft', ['#7c2d12', '#5c210d', '#9a3a17'], 1, { k: 0.08, n: 300 }), cafeColumn: M('plaster', ['#3a3150', '#2d2640', '#463c60'], 2), beanBag: M('soft', ['#4338ca', '#3730a3', '#6366f1'], 1, { k: 0.08, n: 300 }),
    // arena
    arenaFloor: M('raised', ['#1e2230', '#141824'], 4), stage: M('metal', ['#14161c', '#0a0b0f', '#2a2e38'], 2), barrier: M('ledboard', ['#38bdf8', '#f472b6'], 4, { text: 'FRAGLINE', text2: 'MAJOR 2026' }),
    ledWall: M('ledboard', ['#facc15', '#38bdf8'], 3, { text: 'GRAND', text2: 'FINAL' }), boothDesk: M('solid', ['#111827', '#1f2937'], 1), pedestal: M('metal', ['#e5e7eb', '#b0b5bc', '#ffffff'], 1),
    speaker: M('grille', null, 1.6), sponsor: M('ledboard', ['#4ade80', '#facc15'], 3, { text: 'GAMER FUEL', text2: 'skillissue' }), flightCase: M('flightcase', null, 1.2),
    craneBase: M('metal', ['#2b2f36', '#1b1e23', '#4b515a'], 1), truss: M('metal', ['#a7adb5', '#6b7179', '#d1d5db'], 1), standSeat: M('solid', ['#1f2937', '#374151'], 2),
    // pictures
    screenWarden: M('screenWarden', null, 1, { pic: true, glow: 1 }), screenGame: M('screenGame', null, 1, { pic: true, glow: 1 }),
    arcadeFront: M('arcadeFront', null, 1, { pic: true, glow: 1 }), fridgeFront: M('fridgeFront', null, 1, { pic: true, glow: 1 }),
    neonCafe: M('neon', null, 1, { pic: true, glow: 1, text: 'NetCafe 24/7', sub: 'no refunds on lag', fg: '#f472b6' }),
    neonShop: M('neon', null, 1, { pic: true, glow: 1, text: 'skillissue.shop', sub: 'official partner · undetected', fg: '#22d3ee' }),
    jumbo: M('jumbo', null, 1, { pic: true, glow: 1 }),
    posterShop: M('poster', null, 1, { pic: true, bg: '#7c3aed', fg: '#ffffff', lines: ['UNDETECTED', 'since yesterday', 'skillissue.shop'] }),
    posterKevin: M('poster', null, 1, { pic: true, bg: '#0f172a', fg: '#facc15', lines: ['WANTED', 'BOT_Kevin', 'for: missing every shot'] }),
    signServer: M('sign', null, 1, { pic: true, text: 'NODE 07', sub: 'cheat detection · do not unplug', bg: '#0b3d91', fg: '#ffffff' }),
    paintBlue: M('solid', ['#1d4ed8'], 1), paintRed: M('solid', ['#b91c1c'], 1),
    teamA: M('neon', null, 1, { pic: true, glow: 1, text: 'TEAM A', fg: '#60a5fa' }), teamB: M('neon', null, 1, { pic: true, glow: 1, text: 'TEAM B', fg: '#f87171' }),
    neonPink: M('glow', null, 1, { glow: 0xf472b6 }), neonCyan: M('glow', null, 1, { glow: 0x22d3ee }), neonPurple: M('glow', null, 1, { glow: 0xa855f7 }), glowBlue: M('glow', null, 1, { glow: 0x38bdf8 }),
    target: M('target', null, 1, { pic: true }), clock: M('clock', null, 1, { pic: true, tr: true }),
    window: M('window', null, 1, { pic: true }), windowCity: M('windowCity', null, 1, { pic: true }),
    adPanel: M('adPanel', null, 1, { pic: true }), trainWin: M('trainWin', null, 1, { pic: true }),
    signAim: M('sign', null, 1, { pic: true, text: 'AIM TRAINING', sub: 'you will need it', bg: '#e8822e', fg: '#ffffff' }),
    signWarehouse: M('sign', null, 1, { pic: true, text: 'FRAGLINE LOGISTICS', sub: 'BAY 04 · NO CAMPING', bg: '#1d4ed8', fg: '#ffffff' }),
    signOffice: M('sign', null, 1, { pic: true, text: 'FRAGLINE HQ', sub: 'anticheat dept: 3rd floor (under construction)', bg: '#111827', fg: '#38bdf8' }),
    signMetro: M('sign', null, 1, { pic: true, text: 'PLATFORM 2', sub: 'mind the gap · and the campers', bg: '#0f3d7a', fg: '#ffffff' }),
    // glowing
    lamp: M('glow', ['#fff6d8'], 1, { glow: 0xfff3cf }), lampPanel: M('glow', ['#f4f8ff'], 1, { glow: 0xf2f7ff }), lampStrip: M('glow', ['#e8f0ff'], 1, { glow: 0xe6eeff }),
    lampBig: M('glow', ['#fff2b0'], 1, { glow: 0xfff0a8 }), headlight: M('glow', ['#fff8e0'], 1, { glow: 0xfff8e0 }),
  };
  W.MAT_DEFS = MAT_DEFS;
  // a second copy of a texture with a different random pattern (blinking server LEDs)
  W.altTexture = (key, v) => genTexture(key + '#' + v, Object.assign({}, MAT_DEFS[key]));
  W.material = k => material(k);
  const matCache = {};
  function material(key) {
    if (matCache[key]) return matCache[key];
    const d = MAT_DEFS[key] || MAT_DEFS.devGrey;
    let m;
    if (d.glow && d.pic) m = new THREE.MeshBasicMaterial({ map: genTexture(key, d) });
    else if (d.glow) m = new THREE.MeshBasicMaterial({ color: d.glow });
    else if (d.pic) m = new THREE.MeshLambertMaterial({ map: genTexture(key, d), transparent: !!d.tr, alphaTest: d.tr ? 0.5 : 0 });
    else m = new THREE.MeshLambertMaterial({ map: genTexture(key, d), vertexColors: true });
    m.userData.tile = d.tile || 2;
    m.userData.pic = !!d.pic;
    m.userData.glow = !!d.glow;
    matCache[key] = m;
    return m;
  }
  // A box with world-space UVs (so textures line up across neighbouring boxes), baked ambient
  // occlusion in the vertex colours (sides darken towards the ground) and a slight per-box tint.
  function boxGeometry(b, mat) {
    const pic = mat.userData.pic || b.uv01;
    const hs = !pic && b.h > 2.2 ? Math.min(4, Math.ceil(b.h / 1.5)) : 1;
    const geo = new THREE.BoxGeometry(b.w, b.h, b.d, 1, hs, 1);
    const pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv, n = pos.count;
    const col = new Float32Array(n * 3), tile = mat.userData.tile, rot = !!(b.ry || b.rx || b.rz);
    const big = Math.max(b.w, b.d) >= 8 || b.h >= 5;
    const tint = big ? 1 : 0.93 + (Math.abs(Math.sin(b.x * 12.9898 + b.z * 78.233 + b.y * 37.719) * 43758.5453) % 1) * 0.13;
    for (let i = 0; i < n; i++) {
      const lx = pos.getX(i), ly = pos.getY(i), lz = pos.getZ(i), nx = nor.getX(i), ny = nor.getY(i), nz = nor.getZ(i);
      if (!pic) {
        const X = lx + (rot ? 0 : b.x), Y = ly + b.y + b.h / 2, Z = lz + (rot ? 0 : b.z);
        if (Math.abs(nx) > 0.5) uv.setXY(i, -Z * Math.sign(nx) / tile, Y / tile);
        else if (Math.abs(ny) > 0.5) uv.setXY(i, X / tile, -Z * Math.sign(ny) / tile);
        else uv.setXY(i, X * Math.sign(nz) / tile, Y / tile);
      }
      let ao = 1;
      if (Math.abs(ny) < 0.5) ao = 1 - 0.4 * Math.exp(-Math.max(0, ly + b.h / 2 + b.y) / 0.85);
      else if (ny < -0.5) ao = 0.72;
      col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = ao * tint;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    if (b.rz) geo.rotateZ(b.rz);
    if (b.rx) geo.rotateX(b.rx);
    if (b.ry) geo.rotateY(b.ry);
    geo.translate(b.x, b.y + b.h / 2, b.z);
    return geo;
  }

  // ---------------------------------------------------------------- build
  function mergeBoxes(geos) {
    let nv = 0, ni = 0;
    for (const g of geos) { nv += g.attributes.position.count; ni += g.index.count; }
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), col = new Float32Array(nv * 3);
    const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
    let vo = 0, io = 0;
    for (const g of geos) {
      pos.set(g.attributes.position.array, vo * 3);
      nor.set(g.attributes.normal.array, vo * 3);
      uv.set(g.attributes.uv.array, vo * 2);
      col.set(g.attributes.color.array, vo * 3);
      const src = g.index.array;
      for (let i = 0; i < src.length; i++) idx[io + i] = src[i] + vo;
      vo += g.attributes.position.count; io += src.length;
    }
    const m = new THREE.BufferGeometry();
    m.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    m.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    m.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    m.setAttribute('color', new THREE.BufferAttribute(col, 3));
    m.setIndex(new THREE.BufferAttribute(idx, 1));
    m.computeBoundingSphere();
    return m;
  }
  // Build a map's meshes (merged per material) plus its decoration. Used for the live map and
  // for the menu's map pictures, which must not disturb the live one.
  function buildMeshes(mapId, def) {
    const group = new THREE.Group();
    const colliders = [];
    const byMat = new Map();
    const push = b => {
      if (b.m === 'none') return;
      const mat = material(b.m);
      if (!byMat.has(mat)) byMat.set(mat, { geos: [], cast: false });
      const e = byMat.get(mat);
      e.geos.push(boxGeometry(b, mat));
      if (!b.noCast) e.cast = true;
    };
    for (const a of def.boxes) {
      const x = a[0], z = a[1], y = a[2], w = a[3], h = a[4], d = a[5];
      push({ x, z, y, w, h, d, m: a[6], noCast: y < -0.5 });
      colliders.push({ minX: x - w / 2, maxX: x + w / 2, minY: y, maxY: y + h, minZ: z - d / 2, maxZ: z + d / 2 });
    }
    const extra = NA.Decor ? NA.Decor.build(mapId, def) : { boxes: [], meshes: [] };
    for (const b of extra.boxes) {
      push(b);
      if (b.solid) colliders.push({ minX: b.x - b.w / 2, maxX: b.x + b.w / 2, minY: b.y, maxY: b.y + b.h, minZ: b.z - b.d / 2, maxZ: b.z + b.d / 2 });
    }
    for (const [mat, e] of byMat) {
      const mesh = new THREE.Mesh(mergeBoxes(e.geos), mat);
      e.geos.forEach(g => g.dispose());
      if (!e.cast || mat.userData.glow) mesh.userData.noCast = true;
      if (mat.userData.glow) mesh.userData.noShadow = true;
      group.add(mesh);
    }
    for (const m of extra.meshes) group.add(m);
    return { group, colliders };
  }
  W.build = function (scene, mapId) {
    if (W.current && W.current.id === mapId) return W.current;
    if (W.current) {
      scene.remove(W.current.group);
      W.current.group.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    }
    const def = NA.DATA.MAPS[mapId];
    const { group, colliders } = buildMeshes(mapId, def);
    scene.add(group);
    W.current = { id: mapId, def, group, colliders, nav: buildNav(def, colliders) };
    if (NA.Decor && NA.R && NA.R.hemi) NA.Decor.apply(scene, mapId, def);
    else { scene.background = new THREE.Color(def.sky); scene.fog = new THREE.Fog(def.sky, def.fog[0], def.fog[1]); }
    return W.current;
  };
  // A throwaway copy of a map for pictures. Keeps the live map's decoration animations intact.
  W.previewGroup = function (mapId) {
    const def = NA.DATA.MAPS[mapId];
    const keep = NA.Decor ? NA.Decor.anim : null;
    const out = buildMeshes(mapId, def);
    if (NA.Decor) NA.Decor.anim = keep;
    return out;
  };

  // ---------------------------------------------------------------- collision
  // Push a vertical cylinder (approximated as a square) out of boxes along one axis.
  // Is a box in the way of an entity standing at pos? (ignores boxes you are standing on or under)
  function blocks(c, pos, r, h) {
    if (pos.y >= c.maxY - 0.02 || pos.y + h <= c.minY) return false;
    return !(pos.x + r <= c.minX || pos.x - r >= c.maxX || pos.z + r <= c.minZ || pos.z - r >= c.maxZ);
  }
  // Move along one axis in small steps and stop flush against whatever you hit, on the side you
  // came from. The old version pushed you to the nearer side of a box's centre, so a long frame
  // could carry you past the middle of a thin wall and pop you out the other side.
  function moveAxis(pos, d, axis, r, h) {
    if (!d) return false;
    const cs = W.current.colliders;
    const steps = Math.max(1, Math.ceil(Math.abs(d) / 0.12));
    const step = d / steps;
    let hit = false;
    for (let s = 0; s < steps; s++) {
      pos[axis] += step;
      for (let i = 0; i < cs.length; i++) {
        const c = cs[i];
        if (!blocks(c, pos, r, h)) continue;
        if (axis === 'x') pos.x = step > 0 ? c.minX - r - 1e-4 : c.maxX + r + 1e-4;
        else pos.z = step > 0 ? c.minZ - r - 1e-4 : c.maxZ + r + 1e-4;
        hit = true;
      }
      if (hit) break;
    }
    return hit;
  }
  W.move = function (pos, dx, dz, r, h) {
    const hx = moveAxis(pos, dx, 'x', r, h);
    const hz = moveAxis(pos, dz, 'z', r, h);
    return hx || hz;
  };
  // Static push-out (spawning, teleports): leave each box by its shallowest side.
  W.collide = function (pos, r, h) {
    const cs = W.current.colliders;
    for (let pass = 0; pass < 3; pass++) {
      let moved = false;
      for (let i = 0; i < cs.length; i++) {
        const c = cs[i];
        if (!blocks(c, pos, r, h)) continue;
        const left = pos.x + r - c.minX, right = c.maxX - (pos.x - r);
        const back = pos.z + r - c.minZ, front = c.maxZ - (pos.z - r);
        const m = Math.min(left, right, back, front);
        if (m === left) pos.x = c.minX - r - 1e-4;
        else if (m === right) pos.x = c.maxX + r + 1e-4;
        else if (m === back) pos.z = c.minZ - r - 1e-4;
        else pos.z = c.maxZ + r + 1e-4;
        moved = true;
      }
      if (!moved) break;
    }
  };
  W.groundAt = function (x, z, r, feetY) {
    let g = -50;
    const cs = W.current.colliders;
    for (let i = 0; i < cs.length; i++) {
      const c = cs[i];
      if (x + r <= c.minX || x - r >= c.maxX || z + r <= c.minZ || z - r >= c.maxZ) continue;
      if (c.maxY <= feetY + 0.06 && c.maxY > g) g = c.maxY;
    }
    return g;
  };

  // ---------------------------------------------------------------- rays
  W.ray = function (ox, oy, oz, dx, dy, dz, maxT) {
    let best = maxT;
    const cs = W.current.colliders;
    for (let i = 0; i < cs.length; i++) {
      const t = U.rayBox(ox, oy, oz, dx, dy, dz, cs[i], best);
      if (t < best) best = t;
    }
    return best;
  };
  // How many boxes a ray enters before maxT (used for wallbangs). Floors don't count.
  W.countWalls = function (ox, oy, oz, dx, dy, dz, maxT) {
    let n = 0;
    const cs = W.current.colliders;
    for (let i = 0; i < cs.length; i++) {
      if (cs[i].maxY <= 0.05) continue;
      if (U.rayBox(ox, oy, oz, dx, dy, dz, cs[i], maxT) < maxT) n++;
    }
    return n;
  };
  W.los = function (ax, ay, az, bx, by, bz) {
    const dx = bx - ax, dy = by - ay, dz = bz - az;
    const dist = Math.hypot(dx, dy, dz);
    if (dist < 0.01) return true;
    const t = W.ray(ax, ay, az, dx / dist, dy / dist, dz / dist, dist);
    return t >= dist - 0.05;
  };

  // ---------------------------------------------------------------- navigation
  function buildNav(def, colliders) {
    const cell = def.cell || 1;
    const nx = Math.round(def.size[0] / cell), nz = Math.round(def.size[1] / cell);
    const ox = -def.size[0] / 2, oz = -def.size[1] / 2;
    const walk = new Uint8Array(nx * nz);
    const r = 0.5;
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < nz; j++) {
        const cx = ox + (i + 0.5) * cell, cz = oz + (j + 0.5) * cell;
        let ok = true;
        for (const c of colliders) {
          if (c.maxY <= 0.4) continue;
          if (cx + r > c.minX && cx - r < c.maxX && cz + r > c.minZ && cz - r < c.maxZ) { ok = false; break; }
        }
        walk[i + j * nx] = ok ? 1 : 0;
      }
    }
    const cells = [];
    for (let k = 0; k < walk.length; k++) if (walk[k]) cells.push(k);
    return { nx, nz, ox, oz, cell, walk, cells };
  }
  function cellOf(n, x, z) {
    return [U.clamp(Math.floor((x - n.ox) / n.cell), 0, n.nx - 1), U.clamp(Math.floor((z - n.oz) / n.cell), 0, n.nz - 1)];
  }
  function walkable(n, i, j) { return i >= 0 && j >= 0 && i < n.nx && j < n.nz && n.walk[i + j * n.nx] === 1; }
  function nearestWalkable(n, i, j) {
    if (walkable(n, i, j)) return [i, j];
    for (let r = 1; r < 6; r++) {
      for (let di = -r; di <= r; di++) for (let dj = -r; dj <= r; dj++) {
        if (walkable(n, i + di, j + dj)) return [i + di, j + dj];
      }
    }
    return null;
  }
  function center(n, i, j) { return { x: n.ox + (i + 0.5) * n.cell, z: n.oz + (j + 0.5) * n.cell }; }
  function clearLine(n, a, b) {
    const dist = Math.hypot(b.x - a.x, b.z - a.z);
    const steps = Math.ceil(dist / 0.3);
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const c = cellOf(n, a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t);
      if (!walkable(n, c[0], c[1])) return false;
    }
    return true;
  }
  // nearest walkable spot (cell centre) to a point, or null if there's none close by
  W.snap = function (x, z) {
    const n = W.current && W.current.nav;
    if (!n) return { x, z };
    const c = nearestWalkable(n, ...cellOf(n, x, z));
    return c ? center(n, c[0], c[1]) : null;
  };
  W.randomPoint = function () {
    const n = W.current.nav;
    const k = n.cells[Math.floor(Math.random() * n.cells.length)];
    return center(n, k % n.nx, Math.floor(k / n.nx));
  };
  W.findPath = function (sx, sz, tx, tz) {
    const n = W.current.nav;
    const s = nearestWalkable(n, ...cellOf(n, sx, sz));
    const t = nearestWalkable(n, ...cellOf(n, tx, tz));
    if (!s || !t) return null;
    const N = n.nx * n.nz;
    const g = new Float32Array(N).fill(Infinity);
    const came = new Int32Array(N).fill(-1);
    const closed = new Uint8Array(N);
    const start = s[0] + s[1] * n.nx, goal = t[0] + t[1] * n.nx;
    const h = (i, j) => { const dx = Math.abs(i - t[0]), dz = Math.abs(j - t[1]); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); };
    const f = new Float32Array(N).fill(Infinity);
    // binary min-heap of cell indices keyed by f
    const heap = [];
    const push = k => {
      heap.push(k);
      let i = heap.length - 1;
      while (i > 0) { const p = (i - 1) >> 1; if (f[heap[p]] <= f[heap[i]]) break; const t = heap[p]; heap[p] = heap[i]; heap[i] = t; i = p; }
    };
    const pop = () => {
      const top = heap[0], last = heap.pop();
      if (heap.length) {
        heap[0] = last;
        let i = 0;
        for (;;) {
          const l = 2 * i + 1, r = l + 1;
          let m = i;
          if (l < heap.length && f[heap[l]] < f[heap[m]]) m = l;
          if (r < heap.length && f[heap[r]] < f[heap[m]]) m = r;
          if (m === i) break;
          const t = heap[m]; heap[m] = heap[i]; heap[i] = t; i = m;
        }
      }
      return top;
    };
    g[start] = 0; f[start] = h(s[0], s[1]);
    push(start);
    const open = { push };
    let found = false, iter = 0;
    while (heap.length && iter++ < N * 3) {
      const cur = pop();
      if (cur === goal) { found = true; break; }
      if (closed[cur]) continue;
      closed[cur] = 1;
      const ci = cur % n.nx, cj = Math.floor(cur / n.nx);
      for (let di = -1; di <= 1; di++) {
        for (let dj = -1; dj <= 1; dj++) {
          if (!di && !dj) continue;
          const ni = ci + di, nj = cj + dj;
          if (!walkable(n, ni, nj)) continue;
          if (di && dj && (!walkable(n, ci + di, cj) || !walkable(n, ci, cj + dj))) continue;
          const nk = ni + nj * n.nx;
          if (closed[nk]) continue;
          const ng = g[cur] + (di && dj ? 1.414 : 1);
          if (ng < g[nk]) { g[nk] = ng; came[nk] = cur; f[nk] = ng + h(ni, nj); open.push(nk); }
        }
      }
    }
    if (!found) return null;
    const raw = [];
    for (let k = goal; k !== -1; k = came[k]) raw.push(center(n, k % n.nx, Math.floor(k / n.nx)));
    raw.reverse();
    // String-pull: skip waypoints that have a clear straight line.
    const out = [];
    let anchor = { x: sx, z: sz }, i = 0;
    while (i < raw.length) {
      let j = raw.length - 1;
      while (j > i && !clearLine(n, anchor, raw[j])) j--;
      out.push(raw[j]);
      anchor = raw[j];
      i = j + 1;
    }
    return out;
  };

  NA.World = W;
})(window.NA);
