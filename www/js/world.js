/* Kaido Nights: builds a district from its road data. Roads are rasterised into a 1 m grid,
   a signed distance field drives collisions, marching squares gives smooth road edges and curbs,
   and the blocked space fills with district-styled buildings, props, lamps and neon. */
(function (KN) {
  'use strict';
  const U = KN.U, D = KN.DATA;
  const RES = 1;

  // ---------------------------------------------------------------- mesh builder (winding fixed from the intended normal)
  class MB {
    constructor(withColor) { this.p = []; this.n = []; this.uv = []; this.c = withColor ? [] : null; }
    tri(a, b, c, N, ua, ub, uc, col) {
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
      if (cx * N[0] + cy * N[1] + cz * N[2] < 0) { const t = b; b = c; c = t; const tu = ub; ub = uc; uc = tu; }
      this.p.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
      for (let i = 0; i < 3; i++) this.n.push(N[0], N[1], N[2]);
      this.uv.push(ua[0], ua[1], ub[0], ub[1], uc[0], uc[1]);
      if (this.c) for (let i = 0; i < 3; i++) this.c.push(col[0], col[1], col[2]);
    }
    quad(a, b, c, d, N, uvs, col) {
      uvs = uvs || [[0, 0], [1, 0], [1, 1], [0, 1]];
      this.tri(a, b, c, N, uvs[0], uvs[1], uvs[2], col); this.tri(a, c, d, N, uvs[0], uvs[2], uvs[3], col);
    }
    // axis box rotated about Y; faces get uvs in metres / scale (u along the face, v up)
    box(cx, cy, cz, sx, sy, sz, rot, col, sc, off, noBottom) {
      const c = Math.cos(rot || 0), s = Math.sin(rot || 0), hx = sx / 2, hz = sz / 2;
      const P = (x, y, z) => [cx + x * c + z * s, cy + y, cz - x * s + z * c];
      const R = (nx, nz) => [nx * c + nz * s, 0, -nx * s + nz * c];
      const su = sc ? sc[0] : 1, sv = sc ? sc[1] : 1, ou = off ? off[0] : 0, ov = off ? off[1] : 0;
      const fu = (w, h) => [[ou, ov], [ou + w / su, ov], [ou + w / su, ov + h / sv], [ou, ov + h / sv]];
      // +z, -z, +x, -x sides
      this.quad(P(-hx, 0, hz), P(hx, 0, hz), P(hx, sy, hz), P(-hx, sy, hz), R(0, 1), fu(sx, sy), col);
      this.quad(P(hx, 0, -hz), P(-hx, 0, -hz), P(-hx, sy, -hz), P(hx, sy, -hz), R(0, -1), fu(sx, sy), col);
      this.quad(P(hx, 0, hz), P(hx, 0, -hz), P(hx, sy, -hz), P(hx, sy, hz), R(1, 0), fu(sz, sy), col);
      this.quad(P(-hx, 0, -hz), P(-hx, 0, hz), P(-hx, sy, hz), P(-hx, sy, -hz), R(-1, 0), fu(sz, sy), col);
      this.quad(P(-hx, sy, hz), P(hx, sy, hz), P(hx, sy, -hz), P(-hx, sy, -hz), [0, 1, 0], [[0, 0], [sx / su, 0], [sx / su, sz / su], [0, sz / su]], col);
      if (!noBottom) this.quad(P(-hx, 0, -hz), P(hx, 0, -hz), P(hx, 0, hz), P(-hx, 0, hz), [0, -1, 0], null, col);
    }
    cyl(cx, cy, cz, r, h, seg, col, r2, cap) {
      const rt = r2 === undefined ? r : r2;
      for (let i = 0; i < seg; i++) {
        const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2, am = (a0 + a1) / 2;
        const N = [Math.cos(am), 0, Math.sin(am)];
        this.quad([cx + Math.cos(a0) * r, cy, cz + Math.sin(a0) * r], [cx + Math.cos(a1) * r, cy, cz + Math.sin(a1) * r],
          [cx + Math.cos(a1) * rt, cy + h, cz + Math.sin(a1) * rt], [cx + Math.cos(a0) * rt, cy + h, cz + Math.sin(a0) * rt], N,
          [[i / seg * 4, 0], [(i + 1) / seg * 4, 0], [(i + 1) / seg * 4, h / 4], [i / seg * 4, h / 4]], col);
        if (cap !== false) this.tri([cx, cy + h, cz], [cx + Math.cos(a0) * rt, cy + h, cz + Math.sin(a0) * rt], [cx + Math.cos(a1) * rt, cy + h, cz + Math.sin(a1) * rt], [0, 1, 0], [0, 0], [0, 0], [0, 0], col);
      }
    }
    get empty() { return this.p.length === 0; }
    geometry() {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
      if (this.c) g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
      g.computeBoundingSphere();
      return g;
    }
  }
  KN.MB = MB;
  const hexRGB = h => { const c = new THREE.Color(h); return [c.r, c.g, c.b]; };

  // ---------------------------------------------------------------- canvas textures
  function canvasTex(w, h, draw, repeat) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    draw(cv.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(cv);
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
    t.anisotropy = 4;
    return t;
  }
  function noise(ctx, w, h, n, a, b, alpha) {
    for (let i = 0; i < n; i++) {
      const v = Math.floor(U.rand(a, b));
      ctx.fillStyle = `rgba(${v},${v},${v},${alpha})`;
      ctx.fillRect(Math.random() * w, Math.random() * h, U.rand(1, 3), U.rand(1, 3));
    }
  }
  const TEX = KN.TEX = {};
  KN.textures = function () {
    if (TEX.asphalt) return TEX;
    TEX.asphalt = canvasTex(512, 512, (c, w, h) => {
      c.fillStyle = '#2a2c31'; c.fillRect(0, 0, w, h);
      noise(c, w, h, 26000, 20, 80, 0.5);
      noise(c, w, h, 2500, 90, 140, 0.25);
      c.strokeStyle = 'rgba(10,10,12,0.5)'; c.lineWidth = 1.5;
      for (let i = 0; i < 6; i++) { c.beginPath(); let x = Math.random() * w, y = Math.random() * h; c.moveTo(x, y); for (let k = 0; k < 8; k++) { x += U.rand(-30, 30); y += U.rand(-30, 30); c.lineTo(x, y); } c.stroke(); }
    }, true);
    // wet patches: darker = shinier (used as a roughness map)
    TEX.wet = canvasTex(256, 256, (c, w, h) => {
      c.fillStyle = '#c8c8c8'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 26; i++) {
        const x = Math.random() * w, y = Math.random() * h, r = U.rand(14, 46);
        const g = c.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, 'rgba(40,40,40,0.95)'); g.addColorStop(1, 'rgba(200,200,200,0)');
        c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
        for (const dx of [-w, w]) { c.beginPath(); c.arc(x + dx, y, r, 0, Math.PI * 2); c.fill(); }
      }
    }, true);
    TEX.concrete = canvasTex(256, 256, (c, w, h) => {
      c.fillStyle = '#56585e'; c.fillRect(0, 0, w, h);
      noise(c, w, h, 6000, 60, 120, 0.35);
      c.strokeStyle = 'rgba(25,25,28,0.55)'; c.lineWidth = 2;
      for (let i = 0; i <= 4; i++) { c.beginPath(); c.moveTo(i * w / 4, 0); c.lineTo(i * w / 4, h); c.stroke(); c.beginPath(); c.moveTo(0, i * h / 4); c.lineTo(w, i * h / 4); c.stroke(); }
    }, true);
    TEX.grass = canvasTex(256, 256, (c, w, h) => {
      c.fillStyle = '#16231a'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 9000; i++) { c.fillStyle = `rgba(${U.randInt(20, 50)},${U.randInt(45, 80)},${U.randInt(25, 45)},0.6)`; c.fillRect(Math.random() * w, Math.random() * h, 1, U.rand(1, 3)); }
    }, true);
    TEX.glow = canvasTex(128, 128, (c, w, h) => {
      const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
    });
    TEX.smoke = canvasTex(64, 64, (c, w, h) => {
      const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.6, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
    });
    TEX.corrugated = canvasTex(128, 128, (c, w, h) => {
      c.fillStyle = '#9a9a9a'; c.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 8) { const g = c.createLinearGradient(x, 0, x + 8, 0); g.addColorStop(0, '#6f6f6f'); g.addColorStop(0.5, '#d6d6d6'); g.addColorStop(1, '#6f6f6f'); c.fillStyle = g; c.fillRect(x, 0, 8, h); }
      noise(c, w, h, 900, 40, 90, 0.25);
    }, true);
    // building facades: 8 columns x 8 floors; a separate map holds only the lit windows (emissive)
    const facade = (seed, wall, glassHue) => {
      const rnd = U.rng(seed), lit = [];
      for (let i = 0; i < 64; i++) lit.push(rnd() < 0.34 ? (rnd() < 0.7 ? 0 : 1) : -1);
      const draw = (c, w, h, glowOnly) => {
        c.fillStyle = glowOnly ? '#000' : wall; c.fillRect(0, 0, w, h);
        if (!glowOnly) noise(c, w, h, 1800, 20, 70, 0.18);
        const cw = w / 8, ch = h / 8;
        for (let fy = 0; fy < 8; fy++) for (let fx = 0; fx < 8; fx++) {
          const s = lit[fy * 8 + fx], x = fx * cw + cw * 0.18, y = fy * ch + ch * 0.22, ww = cw * 0.64, hh = ch * 0.52;
          if (s < 0) { if (!glowOnly) { c.fillStyle = glassHue; c.fillRect(x, y, ww, hh); } }
          else { c.fillStyle = s === 0 ? '#ffd9a0' : '#cfe6ff'; c.fillRect(x, y, ww, hh); if (!glowOnly) { c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(x, y + hh * 0.55, ww, 2); } }
        }
      };
      return { map: canvasTex(256, 256, (c, w, h) => draw(c, w, h, false), true), em: canvasTex(256, 256, (c, w, h) => draw(c, w, h, true), true) };
    };
    TEX.facadeA = facade(11, '#3b3f4a', '#1a2233');
    TEX.facadeB = facade(23, '#4a4038', '#221d1a');
    TEX.facadeC = facade(37, '#262a35', '#121826');
    TEX.warehouse = canvasTex(256, 256, (c, w, h) => {
      c.fillStyle = '#5b5e63'; c.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 10) { c.fillStyle = x % 20 ? '#53565b' : '#666a70'; c.fillRect(x, 0, 6, h); }
      c.fillStyle = '#2b2d31'; c.fillRect(0, h * 0.86, w, h * 0.14);
      noise(c, w, h, 2500, 30, 80, 0.25);
    }, true);
    return TEX;
  };

  // ---------------------------------------------------------------- distance transform (Felzenszwalb)
  function edt1d(f, n, d, v, z) {
    let k = 0; v[0] = 0; z[0] = -1e20; z[1] = 1e20;
    for (let q = 1; q < n; q++) {
      let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
      k++; v[k] = q; z[k] = s; z[k + 1] = 1e20;
    }
    k = 0;
    for (let q = 0; q < n; q++) { while (z[k + 1] < q) k++; d[q] = (q - v[k]) * (q - v[k]) + f[v[k]]; }
  }
  function edt(grid, W, H, target) {
    const INF = 1e12, out = new Float32Array(W * H), n = Math.max(W, H);
    const f = new Float64Array(n), d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1);
    for (let i = 0; i < W * H; i++) out[i] = grid[i] === target ? 0 : INF;
    for (let x = 0; x < W; x++) {
      for (let y = 0; y < H; y++) f[y] = out[y * W + x];
      edt1d(f, H, d, v, z);
      for (let y = 0; y < H; y++) out[y * W + x] = d[y];
    }
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) f[x] = out[y * W + x];
      edt1d(f, W, d, v, z);
      for (let x = 0; x < W; x++) out[y * W + x] = d[x];
    }
    return out;
  }

  // exact signed distance near the edges, from the shapes themselves: the raster alone leaves 1 m stair-steps
  // in the curbs and the collision walls. Far from any edge the raster distance is good enough.
  function refineSDF(def, sdfG, W, H, x0, z0) {
    const BAND = 4, Q = BAND + 2.5, B = 16, bw = Math.ceil(W * RES / B), bh = Math.ceil(H * RES / B);
    const buckets = new Array(bw * bh);
    for (let k = 0; k < buckets.length; k++) buckets[k] = [];
    const add = (minX, minZ, maxX, maxZ, prim) => {
      const i0 = U.clamp(Math.floor((minX - Q - x0) / B), 0, bw - 1), i1 = U.clamp(Math.floor((maxX + Q - x0) / B), 0, bw - 1);
      const j0 = U.clamp(Math.floor((minZ - Q - z0) / B), 0, bh - 1), j1 = U.clamp(Math.floor((maxZ + Q - z0) / B), 0, bh - 1);
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) buckets[j * bw + i].push(prim);
    };
    for (const rd of def.roads) {
      const pts = rd.pts, n = pts.length, segs = rd.closed ? n : n - 1, hw = rd.w / 2;
      for (let k = 0; k < segs; k++) {
        const a = pts[k], b = pts[(k + 1) % n];
        add(Math.min(a[0], b[0]) - hw, Math.min(a[1], b[1]) - hw, Math.max(a[0], b[0]) + hw, Math.max(a[1], b[1]) + hw, { t: 0, a, b, hw });
      }
    }
    for (const l of def.lots || []) add(l.x - l.w / 2, l.z - l.h / 2, l.x + l.w / 2, l.z + l.h / 2, { t: 1, x: l.x, z: l.z, hx: l.w / 2, hz: l.h / 2 });
    for (const d of def.discs || []) add(d[0] - d[2], d[1] - d[2], d[0] + d[2], d[1] + d[2], { t: 2, x: d[0], z: d[1], r: d[2] });
    for (const b of def.boxes || []) add(b.x - b.w / 2, b.z - b.h / 2, b.x + b.w / 2, b.z + b.h / 2, { t: 3, x: b.x, z: b.z, hx: b.w / 2, hz: b.h / 2 });
    for (const c of def.islands || []) add(c[0] - c[2], c[1] - c[2], c[0] + c[2], c[1] + c[2], { t: 4, x: c[0], z: c[1], r: c[2] });
    const sdBox = (px, pz, p) => { const qx = Math.abs(px - p.x) - p.hx, qz = Math.abs(pz - p.z) - p.hz; return Math.hypot(Math.max(qx, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qz), 0); };
    const bx0 = x0 + RES, bx1 = x0 + (W - 1) * RES, bz0 = z0 + RES, bz1 = z0 + (H - 1) * RES;   // the outer ring of cells is a wall
    const wz = def.water ? def.water.z : null;
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const idx = j * W + i, old = sdfG[idx];
      if (old > BAND || old < -BAND) continue;
      const px = x0 + (i + 0.5) * RES, pz = z0 + (j + 0.5) * RES;
      const list = buckets[U.clamp(Math.floor((pz - z0) / B), 0, bh - 1) * bw + U.clamp(Math.floor((px - x0) / B), 0, bw - 1)];
      let pos = -1e9, neg = 1e9;
      for (const p of list) {
        if (p.t === 0) {
          const dx = p.b[0] - p.a[0], dz = p.b[1] - p.a[1], L2 = dx * dx + dz * dz || 1;
          const t = U.clamp(((px - p.a[0]) * dx + (pz - p.a[1]) * dz) / L2, 0, 1);
          const v = p.hw - Math.hypot(px - p.a[0] - t * dx, pz - p.a[1] - t * dz);
          if (v > pos) pos = v;
        } else if (p.t === 1) { const v = -sdBox(px, pz, p); if (v > pos) pos = v; }
        else if (p.t === 2) { const v = p.r - Math.hypot(px - p.x, pz - p.z); if (v > pos) pos = v; }
        else if (p.t === 3) { const v = sdBox(px, pz, p); if (v < neg) neg = v; }
        else { const v = Math.hypot(px - p.x, pz - p.z) - p.r; if (v < neg) neg = v; }
      }
      if (pos < -1e8) continue;
      let d = Math.min(pos, neg, px - bx0, bx1 - px, pz - bz0, bz1 - pz);
      if (wz !== null) d = Math.min(d, wz - pz);
      sdfG[idx] = d;
    }
  }

  // ---------------------------------------------------------------- the district
  // cell types
  const VOID = 0, ROAD = 1, BOX = 2, ISLAND = 3, WATER = 4;
  const THEMES = {
    docks: { lamp: '#ffb46b', fog: 0x0d1120, sky: ['#05070f', '#1b1530', '#3a2236'], bh: [7, 16], facade: 'warehouse', tint: ['#6b6f75', '#7d6a58', '#5d6b78'], neon: false },
    industrial: { lamp: '#ff9a4d', fog: 0x120d10, sky: ['#060508', '#1f1418', '#41231c'], bh: [9, 20], facade: 'warehouse', tint: ['#5e6268', '#6e5a4d', '#4f5a5e'], neon: false },
    downtown: { lamp: '#dfe8ff', fog: 0x0b0a1c, sky: ['#04040d', '#18123a', '#4a1f4a'], bh: [18, 85], facade: 'facadeA', tint: ['#ffffff', '#d8dcff', '#ffe2d0'], neon: true },
    highway: { lamp: '#ffc27a', fog: 0x0b0f1a, sky: ['#04060c', '#121a33', '#2c2440'], bh: [10, 30], facade: 'facadeB', tint: ['#ffffff', '#e8e2d6'], neon: false },
    crown: { lamp: '#e9d8ff', fog: 0x0e0718, sky: ['#05030b', '#1d0f33', '#4b1a52'], bh: [24, 110], facade: 'facadeC', tint: ['#ffffff', '#e0d4ff', '#d0e6ff'], neon: true },
  };
  KN.THEMES = THEMES;

  KN.World = {};
  KN.World.build = function (id, quality) {
    const def = D.DISTRICT[id], theme = THEMES[def.theme], T = KN.textures();
    const [x0, z0, x1, z1] = def.bounds;
    const W = Math.ceil((x1 - x0) / RES), H = Math.ceil((z1 - z0) / RES);
    const grid = new Uint8Array(W * H);
    const cx = i => x0 + (i + 0.5) * RES, cz = j => z0 + (j + 0.5) * RES;
    const toI = x => Math.floor((x - x0) / RES), toJ = z => Math.floor((z - z0) / RES);
    const setCircle = (x, z, r, val, only) => {
      for (let j = Math.max(0, toJ(z - r)); j <= Math.min(H - 1, toJ(z + r)); j++)
        for (let i = Math.max(0, toI(x - r)); i <= Math.min(W - 1, toI(x + r)); i++)
          if ((cx(i) - x) ** 2 + (cz(j) - z) ** 2 <= r * r && (only === undefined || grid[j * W + i] === only)) grid[j * W + i] = val;
    };
    const setSeg = (a, b, hw) => {
      const minX = Math.min(a[0], b[0]) - hw, maxX = Math.max(a[0], b[0]) + hw, minZ = Math.min(a[1], b[1]) - hw, maxZ = Math.max(a[1], b[1]) + hw;
      const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz || 1;
      for (let j = Math.max(0, toJ(minZ)); j <= Math.min(H - 1, toJ(maxZ)); j++)
        for (let i = Math.max(0, toI(minX)); i <= Math.min(W - 1, toI(maxX)); i++) {
          const px = cx(i) - a[0], pz = cz(j) - a[1], t = U.clamp((px * dx + pz * dz) / L2, 0, 1);
          const ex = px - t * dx, ez = pz - t * dz;
          if (ex * ex + ez * ez <= hw * hw) grid[j * W + i] = ROAD;
        }
    };
    const setRect = (r, val) => {
      for (let j = Math.max(0, toJ(r.z - r.h / 2)); j <= Math.min(H - 1, toJ(r.z + r.h / 2) - 0); j++)
        for (let i = Math.max(0, toI(r.x - r.w / 2)); i <= Math.min(W - 1, toI(r.x + r.w / 2) - 0); i++) {
          const x = cx(i), z = cz(j);
          if (Math.abs(x - r.x) <= r.w / 2 && Math.abs(z - r.z) <= r.h / 2) grid[j * W + i] = val;
        }
    };
    for (const rd of def.roads) {
      const pts = rd.pts, n = pts.length, segs = rd.closed ? n : n - 1;
      for (let k = 0; k < segs; k++) setSeg(pts[k], pts[(k + 1) % n], rd.w / 2);
    }
    for (const l of def.lots || []) setRect(l, ROAD);
    for (const d of def.discs || []) setCircle(d[0], d[1], d[2], ROAD);
    for (const b of def.boxes || []) setRect(b, BOX);
    for (const s of def.islands || []) setCircle(s[0], s[1], s[2], ISLAND);
    if (def.water) for (let j = 0; j < H; j++) if (cz(j) > def.water.z) for (let i = 0; i < W; i++) grid[j * W + i] = WATER;
    for (let i = 0; i < W; i++) { grid[i] = grid[i] === ROAD ? VOID : grid[i]; grid[(H - 1) * W + i] = grid[(H - 1) * W + i] === ROAD ? VOID : grid[(H - 1) * W + i]; }
    for (let j = 0; j < H; j++) { if (grid[j * W] === ROAD) grid[j * W] = VOID; if (grid[j * W + W - 1] === ROAD) grid[j * W + W - 1] = VOID; }

    // signed distance: + inside the drivable area, - outside
    const drv = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) drv[i] = grid[i] === ROAD ? 1 : 0;
    const dOut = edt(drv, W, H, 0), dIn = edt(drv, W, H, 1), sdfG = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) sdfG[i] = drv[i] ? Math.sqrt(dOut[i]) * RES - 0.5 * RES : -(Math.sqrt(dIn[i]) * RES - 0.5 * RES);
    refineSDF(def, sdfG, W, H, x0, z0);

    const sample = (arr, x, z) => {
      const fx = (x - x0) / RES - 0.5, fz = (z - z0) / RES - 0.5;
      const i = Math.floor(fx), j = Math.floor(fz), tx = fx - i, tz = fz - j;
      const g = (ii, jj) => arr[U.clamp(jj, 0, H - 1) * W + U.clamp(ii, 0, W - 1)];
      return (g(i, j) * (1 - tx) + g(i + 1, j) * tx) * (1 - tz) + (g(i, j + 1) * (1 - tx) + g(i + 1, j + 1) * tx) * tz;
    };
    const world = {
      def, theme, W, H, x0, z0, grid, sdfGrid: sdfG,
      sdf: (x, z) => sample(sdfG, x, z),
      grad(x, z) { const e = 0.5, gx = sample(sdfG, x + e, z) - sample(sdfG, x - e, z), gz = sample(sdfG, x, z + e) - sample(sdfG, x, z - e), l = Math.hypot(gx, gz) || 1; return [gx / l, gz / l]; },
      typeAt(x, z) { const i = toI(x), j = toJ(z); return i < 0 || j < 0 || i >= W || j >= H ? VOID : grid[j * W + i]; },
      group: new THREE.Group(),
    };

    buildRoad(world, T);
    buildCurbs(world, T, def.barriers);
    buildGround(world, T);
    buildBuildings(world, T);
    buildProps(world, T);
    buildLamps(world, T);
    if (theme.neon) buildNeon(world);
    buildSky(world);
    world.course = sampleCourse(def.course);
    world.minimap = drawMinimap(world);
    return world;
  };

  // ---------------------------------------------------------------- road surface (greedy rectangles + marching squares at the edges)
  function buildRoad(w, T) {
    const { W, H, sdfGrid: S } = w, X = i => w.x0 + (i + 0.5) * RES, Z = j => w.z0 + (j + 0.5) * RES;
    const mb = new MB(false), up = [0, 1, 0], y = 0.02, US = 7;
    const uvOf = (x, z) => [x / US, z / US];
    const full = new Uint8Array(W * H);
    for (let j = 0; j < H - 1; j++) for (let i = 0; i < W - 1; i++) {
      const a = S[j * W + i], b = S[j * W + i + 1], c = S[(j + 1) * W + i + 1], d = S[(j + 1) * W + i];
      if (a >= 0 && b >= 0 && c >= 0 && d >= 0) full[j * W + i] = 1;
      else if (a >= 0 || b >= 0 || c >= 0 || d >= 0) {
        const C = [[X(i), Z(j)], [X(i + 1), Z(j)], [X(i + 1), Z(j + 1)], [X(i), Z(j + 1)]], v = [a, b, c, d], poly = [];
        for (let k = 0; k < 4; k++) {
          const p = v[k], q = v[(k + 1) % 4];
          if (p >= 0) poly.push(C[k]);
          if ((p >= 0) !== (q >= 0)) { const t = p / (p - q), A = C[k], B = C[(k + 1) % 4]; poly.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t]); }
        }
        for (let k = 1; k < poly.length - 1; k++) {
          const P0 = poly[0], P1 = poly[k], P2 = poly[k + 1];
          mb.tri([P0[0], y, P0[1]], [P1[0], y, P1[1]], [P2[0], y, P2[1]], up, uvOf(P0[0], P0[1]), uvOf(P1[0], P1[1]), uvOf(P2[0], P2[1]));
        }
      }
    }
    const used = new Uint8Array(W * H);
    for (let j = 0; j < H - 1; j++) for (let i = 0; i < W - 1; i++) {
      if (!full[j * W + i] || used[j * W + i]) continue;
      let ww = 1; while (i + ww < W - 1 && full[j * W + i + ww] && !used[j * W + i + ww]) ww++;
      let hh = 1, ok = true;
      while (ok && j + hh < H - 1) { for (let k = 0; k < ww; k++) if (!full[(j + hh) * W + i + k] || used[(j + hh) * W + i + k]) { ok = false; break; } if (ok) hh++; }
      for (let jj = 0; jj < hh; jj++) for (let k = 0; k < ww; k++) used[(j + jj) * W + i + k] = 1;
      const ax = X(i), az = Z(j), bx = X(i + ww), bz = Z(j + hh);
      mb.quad([ax, y, az], [bx, y, az], [bx, y, bz], [ax, y, bz], up, [uvOf(ax, az), uvOf(bx, az), uvOf(bx, bz), uvOf(ax, bz)]);
    }
    const mat = new THREE.MeshStandardMaterial({ color: 0x9a9ca3, map: T.asphalt, roughness: 0.74, metalness: 0.05, envMapIntensity: 0.9 });
    const mesh = new THREE.Mesh(mb.geometry(), mat);
    mesh.receiveShadow = true;
    w.group.add(mesh);
    // road markings: dashed centre lines along every road polyline that stays inside the road
    const mk = new MB(false);
    for (const rd of w.def.roads) {
      if (rd.w < 11) continue;
      const pts = rd.pts, n = pts.length, segs = rd.closed ? n : n - 1;
      let acc = 0;
      for (let k = 0; k < segs; k++) {
        const a = pts[k], b = pts[(k + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (L < 0.01) continue;
        const dx = (b[0] - a[0]) / L, dz = (b[1] - a[1]) / L, nx = -dz * 0.09, nz = dx * 0.09;
        for (let s = 0; s < L; s += 1) {
          acc += 1;
          if (acc % 9 > 4) continue;
          const px = a[0] + dx * s, pz = a[1] + dz * s, qx = px + dx * 1.2, qz = pz + dz * 1.2;
          if (w.sdf(px, pz) < rd.w * 0.35 || isJunction(w, px, pz, rd)) continue;
          mk.quad([px - nx, 0.035, pz - nz], [px + nx, 0.035, pz + nz], [qx + nx, 0.035, qz + nz], [qx - nx, 0.035, qz - nz], up);
        }
      }
    }
    if (!mk.empty) w.group.add(new THREE.Mesh(mk.geometry(), new THREE.MeshBasicMaterial({ color: 0xbfb68a, transparent: true, opacity: 0.55 })));
    // puddles: glossy patches that pick up the city lights
    const pd = new MB(false), rnd = U.rng(U.hash(w.def.id + 'wet'));
    const [bx0, bz0, bx1, bz1] = w.def.bounds;
    let placed = 0;
    for (let k = 0; k < 2400 && placed < 170; k++) {
      const x = U.lerp(bx0, bx1, rnd()), z = U.lerp(bz0, bz1, rnd());
      if (w.sdf(x, z) < 2.5) continue;
      placed++;
      const rx = 1.5 + rnd() * 5, rz = 1 + rnd() * 3, a = rnd() * Math.PI, ca = Math.cos(a), sa = Math.sin(a), seg = 14;
      for (let i = 0; i < seg; i++) {
        const t0 = (i / seg) * Math.PI * 2, t1 = ((i + 1) / seg) * Math.PI * 2;
        const P = t => [x + (Math.cos(t) * rx) * ca - (Math.sin(t) * rz) * sa, 0.028, z + (Math.cos(t) * rx) * sa + (Math.sin(t) * rz) * ca];
        pd.tri([x, 0.028, z], P(t0), P(t1), [0, 1, 0], [0.5, 0.5], [0.5 + Math.cos(t0) * 0.5, 0.5 + Math.sin(t0) * 0.5], [0.5 + Math.cos(t1) * 0.5, 0.5 + Math.sin(t1) * 0.5]);
      }
    }
    if (!pd.empty) w.group.add(new THREE.Mesh(pd.geometry(), new THREE.MeshStandardMaterial({ color: 0x0c0d11, roughness: 0.08, metalness: 0.4, transparent: true, opacity: 0.8, alphaMap: KN.TEX.glow, depthWrite: false, envMapIntensity: 1.0 })));
  }
  // don't paint lines across junctions or open lots
  function isJunction(w, x, z, rd) { return w.sdf(x, z) > rd.w * 0.75; }

  // ---------------------------------------------------------------- curbs (or highway barriers) along the smooth road edge
  function buildCurbs(w, T, barriers) {
    const { W, H, sdfGrid: S } = w, X = i => w.x0 + (i + 0.5) * RES, Z = j => w.z0 + (j + 0.5) * RES;
    const mb = new MB(false), ht = barriers ? 0.9 : 0.16, depth = barriers ? 0.5 : 0.4;
    for (let j = 0; j < H - 1; j++) for (let i = 0; i < W - 1; i++) {
      const v = [S[j * W + i], S[j * W + i + 1], S[(j + 1) * W + i + 1], S[(j + 1) * W + i]];
      const inside = v.map(a => a >= 0);
      if (inside.every(Boolean) || !inside.some(Boolean)) continue;
      const C = [[X(i), Z(j)], [X(i + 1), Z(j)], [X(i + 1), Z(j + 1)], [X(i), Z(j + 1)]], cr = [];
      for (let k = 0; k < 4; k++) {
        const p = v[k], q = v[(k + 1) % 4];
        if ((p >= 0) !== (q >= 0)) { const t = p / (p - q), A = C[k], B = C[(k + 1) % 4]; cr.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t]); }
      }
      for (let k = 0; k + 1 < cr.length; k += 2) {
        const a = cr[k], b = cr[k + 1], mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
        const g = w.grad(mx, mz), ga = w.grad(a[0], a[1]), gb = w.grad(b[0], b[1]);
        const tp = w.typeAt(mx - g[0] * 1.2, mz - g[1] * 1.2);
        if (tp === BOX || tp === WATER) continue;
        const N = [g[0], 0, g[1]];
        mb.quad([a[0], 0, a[1]], [b[0], 0, b[1]], [b[0], ht, b[1]], [a[0], ht, a[1]], N, [[0, 0], [1, 0], [1, ht], [0, ht]]);
        mb.quad([a[0], ht, a[1]], [b[0], ht, b[1]], [b[0] - gb[0] * depth, ht, b[1] - gb[1] * depth], [a[0] - ga[0] * depth, ht, a[1] - ga[1] * depth], [0, 1, 0]);
      }
    }
    const mat = barriers
      ? new THREE.MeshLambertMaterial({ color: 0x8c8e93, map: T.concrete })
      : new THREE.MeshLambertMaterial({ color: 0x9a9da4 });
    const m = new THREE.Mesh(mb.geometry(), mat);
    m.receiveShadow = true;
    w.group.add(m);
  }

  // ---------------------------------------------------------------- ground beyond the roads
  function buildGround(w, T) {
    const def = w.def, [x0, z0, x1, z1] = def.bounds, pad = 520;
    const tex = def.ground === 'grass' ? T.grass : T.concrete;
    const geo = new THREE.PlaneGeometry(x1 - x0 + pad * 2, z1 - z0 + pad * 2);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (x1 - x0 + pad * 2) / (def.ground === 'grass' ? 10 : 6), uv.getY(i) * (z1 - z0 + pad * 2) / (def.ground === 'grass' ? 10 : 6));
    const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: def.ground === 'grass' ? 0x9aa69c : 0x8d9097, map: tex }));
    m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2);
    m.receiveShadow = true;
    w.group.add(m);
    if (def.water) {
      const water = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0 + pad * 2, 600),
        new THREE.MeshStandardMaterial({ color: 0x0a1626, roughness: 0.12, metalness: 0.75, envMapIntensity: 1.6 }));
      water.rotation.x = -Math.PI / 2; water.position.set((x0 + x1) / 2, -0.6, def.water.z + 300 + 2);
      w.group.add(water);
      // quay edge
      const q = new MB(false);
      q.box((x0 + x1) / 2, -2, def.water.z + 1, x1 - x0 + pad * 2, 2.25, 2, 0, null, [4, 2]);
      w.group.add(new THREE.Mesh(q.geometry(), new THREE.MeshLambertMaterial({ color: 0x6d6f74, map: T.concrete })));
    }
  }

  // ---------------------------------------------------------------- buildings in the blocked space
  function buildBuildings(w, T) {
    const def = w.def, th = w.theme, rnd = U.rng(U.hash(def.id));
    const [x0, z0, x1, z1] = def.bounds, CS = 6, setback = def.id === 'highway' ? 14 : 4.5;
    const cw = Math.floor((x1 - x0) / CS), ch = Math.floor((z1 - z0) / CS);
    const ok = new Uint8Array(cw * ch);
    for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
      let good = true;
      for (let jj = 0; jj <= CS && good; jj += 2) for (let ii = 0; ii <= CS && good; ii += 2) {
        const x = x0 + i * CS + ii, z = z0 + j * CS + jj;
        if (w.sdf(x, z) > -setback || w.typeAt(x, z) !== VOID) good = false;
      }
      ok[j * cw + i] = good && !(def.id === 'highway' && rnd() < 0.75) ? 1 : 0;
    }
    const used = new Uint8Array(cw * ch), rects = [];
    for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
      if (!ok[j * cw + i] || used[j * cw + i]) continue;
      const maxW = 2 + Math.floor(rnd() * 5), maxH = 2 + Math.floor(rnd() * 5);
      let ww = 1; while (ww < maxW && i + ww < cw && ok[j * cw + i + ww] && !used[j * cw + i + ww]) ww++;
      let hh = 1, good = true;
      while (good && hh < maxH && j + hh < ch) { for (let k = 0; k < ww; k++) if (!ok[(j + hh) * cw + i + k] || used[(j + hh) * cw + i + k]) { good = false; break; } if (good) hh++; }
      for (let jj = 0; jj < hh; jj++) for (let k = 0; k < ww; k++) used[(j + jj) * cw + i + k] = 1;
      rects.push([x0 + i * CS, z0 + j * CS, ww * CS, hh * CS]);
    }
    const isWare = th.facade === 'warehouse', tex = isWare ? T.warehouse : T[th.facade];
    const walls = new MB(true), roofs = new MB(false);
    w.buildings = [];
    const [h0, h1] = th.bh;
    for (const [bx, bz, bw, bd] of rects) {
      const gap = 1.2, sx = bw - gap * 2, sz = bd - gap * 2;
      if (sx < 4 || sz < 4) continue;
      const near = -w.sdf(bx + bw / 2, bz + bd / 2);
      let hgt = h0 + Math.pow(rnd(), 1.6) * (h1 - h0);
      if (def.id === 'crown' || def.id === 'downtown') hgt *= U.clamp(1.25 - near / 160, 0.45, 1.25);
      hgt = Math.max(5, Math.round(hgt / 3.3) * 3.3);
      const tint = hexRGB(U.pick(th.tint).replace('#', '#'));
      const k = 0.75 + rnd() * 0.35;
      const col = [tint[0] * k, tint[1] * k, tint[2] * k];
      const off = isWare ? [rnd() * 4, 0] : [Math.floor(rnd() * 8) / 8, Math.floor(rnd() * 8) / 8];
      walls.box(bx + bw / 2, 0, bz + bd / 2, sx, hgt, sz, 0, col, isWare ? [8, hgt] : [28.8, 26.4], off, true);
      roofs.quad([bx + gap, hgt + 0.05, bz + gap], [bx + bw - gap, hgt + 0.05, bz + gap], [bx + bw - gap, hgt + 0.05, bz + bd - gap], [bx + gap, hgt + 0.05, bz + bd - gap], [0, 1, 0]);
      if (!isWare && hgt > 30 && rnd() < 0.5) roofs.box(bx + bw / 2, hgt, bz + bd / 2, sx * 0.4, 3, sz * 0.4, 0, null);
      w.buildings.push({ x: bx + bw / 2, z: bz + bd / 2, sx, sz, h: hgt });
    }
    const mat = isWare
      ? new THREE.MeshLambertMaterial({ map: tex, vertexColors: true })
      : new THREE.MeshLambertMaterial({ map: tex.map, vertexColors: true, emissive: 0xffffff, emissiveMap: tex.em, emissiveIntensity: 0.85 });
    const wm = new THREE.Mesh(walls.geometry(), mat);
    wm.castShadow = false; wm.receiveShadow = true;
    w.group.add(wm);
    w.group.add(new THREE.Mesh(roofs.geometry(), new THREE.MeshLambertMaterial({ color: 0x23252b })));
  }

  // ---------------------------------------------------------------- district props
  const CONTAINER_COLS = ['#8c2f22', '#1f4e7a', '#2f6b3a', '#c56a1b', '#6b6e74', '#d8d3c4', '#7a1f4e', '#1d6b6b'];
  function buildProps(w, T) {
    const def = w.def, rnd = U.rng(U.hash(def.id + 'props'));
    // containers + crates + parked cars from the box list
    const cont = new MB(true), misc = new MB(true);
    for (const b of def.boxes || []) {
      if (b.kind === 'container') {
        const along = b.w >= b.h, L = along ? b.w : b.h, Wd = along ? b.h : b.w;
        const nL = Math.max(1, Math.round(L / 12.2)), nW = Math.max(1, Math.round(Wd / 2.45));
        for (let lvl = 0; lvl < b.ht; lvl++) for (let a = 0; a < nL; a++) for (let c = 0; c < nW; c++) {
          if (lvl > 0 && rnd() < 0.18) continue;
          const u = -L / 2 + (a + 0.5) * (L / nL), v = -Wd / 2 + (c + 0.5) * (Wd / nW);
          const px = b.x + (along ? u : v), pz = b.z + (along ? v : u);
          const col = hexRGB(U.pick(CONTAINER_COLS));
          cont.box(px, lvl * 2.6, pz, along ? L / nL - 0.15 : Wd / nW - 0.12, 2.55, along ? Wd / nW - 0.12 : L / nL - 0.15, 0, col, [2.6, 2.6]);
        }
      } else if (b.kind === 'parked') {
        const col = hexRGB(U.pick(['#b8bcc4', '#1b1d22', '#8a1c1c', '#20406e', '#d9d9d9', '#4b5b2f']));
        const rot = b.w > b.h ? Math.PI / 2 : 0;
        misc.box(b.x, 0.25, b.z, 1.8, 0.75, 4.3, rot, col, null, null, true);
        misc.box(b.x, 1.0, b.z, 1.6, 0.55, 2.2, rot, [col[0] * 0.5, col[1] * 0.5, col[2] * 0.55], null, null, true);
      } else {
        misc.box(b.x, 0, b.z, b.w, b.ht, b.h, 0, hexRGB('#6b5a43'), [2, 2]);
      }
    }
    if (!cont.empty) { const m = new THREE.Mesh(cont.geometry(), new THREE.MeshLambertMaterial({ map: T.corrugated, vertexColors: true })); m.castShadow = true; m.receiveShadow = true; w.group.add(m); }
    // islands
    for (const s of def.islands || []) {
      const [x, z, r] = s;
      if (def.theme === 'industrial') {
        misc.cyl(x, 0, z, r - 1, 9, 20, hexRGB('#c9c6bd')); misc.cyl(x, 9, z, r - 1, 1.2, 20, hexRGB('#8f8c85'), r - 2.5);
      } else if (def.theme === 'downtown') {
        misc.cyl(x, 0, z, r, 0.6, 32, hexRGB('#7c7f86')); misc.cyl(x, 0, z, r * 0.55, 1.4, 24, hexRGB('#5d6068'));
        misc.cyl(x, 1.4, z, 1.6, 8, 10, hexRGB('#b6b9c0'), 0.4);
      } else if (def.theme === 'crown') {
        misc.cyl(x, 0, z, r, 1.0, 32, hexRGB('#3a3448'));
      }
    }
    if (!misc.empty) { const m = new THREE.Mesh(misc.geometry(), new THREE.MeshLambertMaterial({ vertexColors: true })); m.castShadow = true; m.receiveShadow = true; w.group.add(m); }
    // glowing details (unlit)
    const glow = new MB(true);
    if (def.theme === 'downtown') { const [x, z, r] = def.islands[0]; glow.cyl(x, 0.62, z, r * 0.53, 0.05, 32, hexRGB('#3fd0ff'), r * 0.53, true); }
    if (def.theme === 'crown') {
      const [x, z] = def.islands[0];
      const tower = new MB(true);
      tower.box(x, 1, z, 18, 150, 18, Math.PI / 4, hexRGB('#2a2733'), [28.8, 26.4]);
      tower.box(x, 151, z, 12, 18, 12, Math.PI / 4, hexRGB('#1e1b26'), [28.8, 26.4]);
      const tm = new THREE.Mesh(tower.geometry(), new THREE.MeshLambertMaterial({ map: T.facadeC.map, emissive: 0xffffff, emissiveMap: T.facadeC.em, emissiveIntensity: 0.9, vertexColors: true }));
      w.group.add(tm);
      for (const yy of [40, 80, 120, 150]) glow.cyl(x, yy, z, 13.2, 0.8, 4, hexRGB('#c084fc'), 13.2, false);
      glow.cyl(x, 169, z, 8.6, 1.2, 4, hexRGB('#f0abfc'), 8.6, false);
    }
    if (def.theme === 'docks') {
      // gantry cranes along the quay with red lights on top
      const cr = new MB(true);
      for (const x of [-135, -45, 45, 135]) {
        const zq = def.water.z + 4, col = hexRGB(x % 90 ? '#c23b22' : '#d9a21b');
        for (const dx of [-6, 6]) for (const dz of [-5, 5]) cr.box(x + dx, 0, zq + dz, 1, 34, 1, 0, col);
        cr.box(x, 34, zq, 14, 2.2, 12, 0, col);
        cr.box(x, 30, zq + 18, 3, 2, 52, 0, col);
        glow.box(x, 36.4, zq, 0.8, 0.8, 0.8, 0, hexRGB('#ff2a2a'));
      }
      const cm = new THREE.Mesh(cr.geometry(), new THREE.MeshLambertMaterial({ vertexColors: true }));
      w.group.add(cm);
    }
    if (def.theme === 'industrial') {
      const ch = new MB(true);
      for (let k = 0; k < 7; k++) {
        const b = w.buildings[Math.floor(rnd() * w.buildings.length)];
        if (!b) break;
        ch.cyl(b.x, b.h, b.z, 2.2, 26 + rnd() * 18, 12, hexRGB('#8a5a4a'), 1.7);
        glow.box(b.x, b.h + 44.5, b.z, 0.9, 0.9, 0.9, 0, hexRGB('#ff3a2a'));
      }
      w.group.add(new THREE.Mesh(ch.geometry(), new THREE.MeshLambertMaterial({ vertexColors: true })));
    }
    if (def.theme === 'highway') {
      // trees on the grass
      const tr = new MB(true);
      for (let k = 0; k < 360; k++) {
        const x = U.lerp(def.bounds[0], def.bounds[2], rnd()), z = U.lerp(def.bounds[1], def.bounds[3], rnd());
        if (w.sdf(x, z) > -9) continue;
        const s = 0.8 + rnd() * 0.7;
        tr.cyl(x, 0, z, 0.25 * s, 2 * s, 5, hexRGB('#3b2a1e'));
        tr.cyl(x, 1.6 * s, z, 2.4 * s, 5.5 * s, 7, hexRGB(rnd() < 0.5 ? '#1f3a26' : '#24452c'), 0.05);
      }
      w.group.add(new THREE.Mesh(tr.geometry(), new THREE.MeshLambertMaterial({ vertexColors: true })));
      // overhead gantries with green signs
      const course = def.course;
      for (const k of [20, 120, 220]) {
        const p = course[k % course.length], q = course[(k + 1) % course.length];
        const ang = Math.atan2(q[0] - p[0], q[1] - p[1]);
        const g = new MB(true), nx = Math.cos(ang), nz = -Math.sin(ang);
        for (const s of [-12, 12]) g.box(p[0] + nx * s, 0, p[1] + nz * s, 0.6, 7.5, 0.6, 0, hexRGB('#9aa0a8'));
        g.box(p[0], 7.2, p[1], 25, 0.8, 0.8, ang, hexRGB('#9aa0a8'));
        const gm = new THREE.Mesh(g.geometry(), new THREE.MeshLambertMaterial({ vertexColors: true }));
        gm.rotation.y = 0; w.group.add(gm);
        const sign = new THREE.Mesh(new THREE.PlaneGeometry(9, 2.6), new THREE.MeshBasicMaterial({ map: signTexture(['KAIDO', 'EXIT 4', 'CITY', 'PORT'][k % 4], '#0e6b3a', '#ffffff'), side: THREE.DoubleSide }));
        sign.position.set(p[0], 9.2, p[1]); sign.rotation.y = ang + Math.PI;
        w.group.add(sign);
      }
    }
    if (!glow.empty) w.group.add(new THREE.Mesh(glow.geometry(), new THREE.MeshBasicMaterial({ vertexColors: true })));
  }

  // ---------------------------------------------------------------- street lamps with light pools on the road
  function buildLamps(w, T) {
    const def = w.def, th = w.theme, spots = [];
    const tooClose = (x, z) => spots.some(s => (s[0] - x) ** 2 + (s[1] - z) ** 2 < 22 * 22);
    for (const rd of def.roads) {
      const pts = rd.pts, n = pts.length, segs = rd.closed ? n : n - 1;
      let acc = 14, side = 1;
      for (let k = 0; k < segs; k++) {
        const a = pts[k], b = pts[(k + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (L < 0.01) continue;
        const dx = (b[0] - a[0]) / L, dz = (b[1] - a[1]) / L;
        for (let s = 0; s < L; s += 2) {
          acc += 2;
          if (acc < 30) continue;
          const px = a[0] + dx * s, pz = a[1] + dz * s, nx = -dz * side, nz = dx * side;
          const lx = px + nx * (rd.w / 2 + 1.1), lz = pz + nz * (rd.w / 2 + 1.1);
          if (w.sdf(lx, lz) > -0.6 || w.typeAt(lx, lz) !== VOID || tooClose(lx, lz)) continue;
          spots.push([lx, lz, -nx, -nz]);
          acc = 0; side = -side;
        }
      }
    }
    // open lots get a few tall floodlights
    for (const l of def.lots || []) for (const [fx, fz] of [[-0.42, -0.42], [0.42, 0.42], [-0.42, 0.42], [0.42, -0.42]]) {
      const x = l.x + fx * l.w, z = l.z + fz * l.h;
      if (!tooClose(x, z)) spots.push([x, z, 0, 0, true]);
    }
    w.lamps = spots;
    const n = spots.length;
    if (!n) return;
    const poleGeo = new THREE.BoxGeometry(0.22, 1, 0.22); poleGeo.translate(0, 0.5, 0);
    const poles = new THREE.InstancedMesh(poleGeo, new THREE.MeshLambertMaterial({ color: 0x3c3f45 }), n);
    const heads = new THREE.InstancedMesh(new THREE.BoxGeometry(1.4, 0.25, 0.6), new THREE.MeshBasicMaterial({ color: th.lamp }), n);
    const poolGeo = new THREE.PlaneGeometry(1, 1); poolGeo.rotateX(-Math.PI / 2);
    const pools = new THREE.InstancedMesh(poolGeo, new THREE.MeshBasicMaterial({ color: th.lamp, map: KN.TEX.glow, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false }), n);
    const halo = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: th.lamp, map: KN.TEX.glow, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }), n);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), e = new THREE.Euler();
    spots.forEach((sp, i) => {
      const [x, z, nx, nz, flood] = sp, ht = flood ? 13 : 7.5;
      m4.compose(p.set(x, 0, z), q.identity(), s.set(1, ht, 1)); poles.setMatrixAt(i, m4);
      const hx = x + nx * 1.2, hz = z + nz * 1.2;
      e.set(0, Math.atan2(nx, nz), 0); q.setFromEuler(e);
      m4.compose(p.set(hx, ht, hz), q, s.set(flood ? 2 : 1, 1, 1)); heads.setMatrixAt(i, m4);
      const r = flood ? 26 : 15;
      m4.compose(p.set(x + nx * 4.5, 0.045, z + nz * 4.5), q.identity(), s.set(r, 1, r)); pools.setMatrixAt(i, m4);
      m4.compose(p.set(hx, ht - 0.3, hz), q.identity(), s.set(3.2, 3.2, 3.2)); halo.setMatrixAt(i, m4);
    });
    halo.userData.billboard = true;
    w.group.add(poles, heads, pools, halo);
    w.halo = halo;
  }

  // ---------------------------------------------------------------- neon signs on buildings facing the road
  const NEON_WORDS = ['RAMEN', 'KARAOKE', '24H', 'GARAGE', 'ARCADE', 'HOTEL', 'BAR', '夜', '街道', 'TUNE', 'NOODLE', 'CLUB', 'PARTS', 'MOTEL', 'SUSHI', 'DRIFT'];
  const NEON_COLS = ['#ff3ea5', '#3ee7ff', '#ffe14a', '#a86bff', '#ff6a3e', '#58ff8c'];
  function signTexture(text, bg, fg) {
    return canvasTex(256, 72, (c, w, h) => {
      c.fillStyle = bg; c.fillRect(0, 0, w, h);
      c.fillStyle = fg; c.font = '900 44px -apple-system, "Segoe UI", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(text, w / 2, h / 2 + 2);
    });
  }
  KN.signTexture = signTexture;
  let NEON_ATLAS = null;
  function neonAtlas() {
    if (NEON_ATLAS) return NEON_ATLAS;
    // 4x4 grid of signs, each 256x96
    NEON_ATLAS = canvasTex(1024, 384, (c) => {
      c.fillStyle = '#000'; c.fillRect(0, 0, 1024, 384);
      NEON_WORDS.forEach((wd, k) => {
        const x = (k % 4) * 256, y = Math.floor(k / 4) * 96, col = NEON_COLS[k % NEON_COLS.length];
        c.save(); c.translate(x, y);
        c.strokeStyle = col; c.lineWidth = 4; c.shadowColor = col; c.shadowBlur = 14; c.strokeRect(8, 8, 240, 80);
        c.fillStyle = '#fff'; c.font = '900 50px -apple-system, "Segoe UI", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.shadowBlur = 18; c.fillText(wd, 128, 50); c.fillStyle = col; c.shadowBlur = 0; c.globalAlpha = 0.55; c.fillText(wd, 128, 50);
        c.restore();
      });
    });
    return NEON_ATLAS;
  }
  function buildNeon(w) {
    const rnd = U.rng(U.hash(w.def.id + 'neon')), mb = new MB(false);
    let count = 0;
    for (const b of w.buildings) {
      if (count > 48 || rnd() < 0.45) continue;
      // face closest to a road
      const faces = [[b.x, b.z + b.sz / 2 + 0.1, 0, 1], [b.x, b.z - b.sz / 2 - 0.1, 0, -1], [b.x + b.sx / 2 + 0.1, b.z, 1, 0], [b.x - b.sx / 2 - 0.1, b.z, -1, 0]];
      faces.sort((p, q) => w.sdf(q[0] + q[2] * 8, q[1] + q[3] * 8) - w.sdf(p[0] + p[2] * 8, p[1] + p[3] * 8));
      const [fx, fz, nx, nz] = faces[0];
      if (w.sdf(fx + nx * 8, fz + nz * 8) < -2) continue;
      const k = Math.floor(rnd() * NEON_WORDS.length), u0 = (k % 4) / 4, v0 = 1 - (Math.floor(k / 4) + 1) / 4;
      const sw = 7 + rnd() * 4, sh = sw * 0.375, y = 5 + rnd() * Math.min(18, b.h - 9);
      const tx = nz, tz = -nx;   // the viewer's right, looking at the face
      const off = (rnd() - 0.5) * Math.max(0, (nx ? b.sz : b.sx) - sw - 2);
      const cxp = fx + tx * off, czp = fz + tz * off;
      mb.quad([cxp - tx * sw / 2, y, czp - tz * sw / 2], [cxp + tx * sw / 2, y, czp + tz * sw / 2], [cxp + tx * sw / 2, y + sh, czp + tz * sw / 2], [cxp - tx * sw / 2, y + sh, czp - tz * sw / 2], [nx, 0, nz],
        [[u0, v0], [u0 + 0.25, v0], [u0 + 0.25, v0 + 0.25], [u0, v0 + 0.25]]);
      count++;
    }
    if (mb.empty) return;
    w.group.add(new THREE.Mesh(mb.geometry(), new THREE.MeshBasicMaterial({ map: neonAtlas(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
  }

  // ---------------------------------------------------------------- night sky, stars, far skyline
  function buildSky(w) {
    const th = w.theme;
    const sky = new THREE.Mesh(new THREE.SphereGeometry(1400, 32, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color(th.sky[0]) }, mid: { value: new THREE.Color(th.sky[1]) }, low: { value: new THREE.Color(th.sky[2]) } },
      vertexShader: 'varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 low; varying vec3 vp; void main(){ float h = vp.y; vec3 c = h > 0.08 ? mix(mid, top, smoothstep(0.08, 0.6, h)) : mix(low, mid, smoothstep(-0.05, 0.08, h)); gl_FragColor = vec4(c, 1.0); }',
    }));
    sky.renderOrder = -10;
    w.sky = sky;
    w.group.add(sky);
    const rnd = U.rng(77), sp = [];
    for (let i = 0; i < 700; i++) {
      const a = rnd() * Math.PI * 2, e = Math.asin(0.15 + rnd() * 0.85), r = 1300;
      sp.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r);
    }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xcfd6ff, size: 2, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.75 }));
    w.stars = stars; w.group.add(stars);
    const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: KN.TEX.glow, color: 0xdfe6ff, fog: false, depthWrite: false }));
    moon.scale.set(110, 110, 1); moon.position.set(-700, 520, -900); w.moon = moon; w.group.add(moon);
    // distant skyline ring
    const T = KN.textures(), sk = new MB(true), [x0, z0, x1, z1] = w.def.bounds, cxm = (x0 + x1) / 2, czm = (z0 + z1) / 2;
    const R0 = Math.max(x1 - x0, z1 - z0) * 0.5 + 180;
    for (let i = 0; i < 150; i++) {
      const a = (i / 150) * Math.PI * 2 + rnd() * 0.02, r = R0 + rnd() * 260;
      const hgt = 20 + Math.pow(rnd(), 2) * (w.def.theme === 'downtown' || w.def.theme === 'crown' ? 160 : 90);
      const s = 18 + rnd() * 30, col = 0.55 + rnd() * 0.3;
      sk.box(cxm + Math.cos(a) * r, 0, czm + Math.sin(a) * r, s, hgt, s, -a, [col, col, col * 1.05], [28.8, 26.4], [Math.floor(rnd() * 8) / 8, Math.floor(rnd() * 8) / 8], true);
    }
    const skm = new THREE.Mesh(sk.geometry(), new THREE.MeshLambertMaterial({ map: T.facadeC.map, emissive: 0xffffff, emissiveMap: T.facadeC.em, emissiveIntensity: 0.7, vertexColors: true }));
    w.group.add(skm);
  }

  // ---------------------------------------------------------------- course for Takeover: evenly spaced points
  function sampleCourse(pts) {
    const out = [], n = pts.length;
    let carry = 0;
    for (let k = 0; k < n; k++) {
      const a = pts[k], b = pts[(k + 1) % n], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (L < 1e-3) continue;
      let s = carry;
      while (s < L) { out.push([a[0] + (b[0] - a[0]) * s / L, a[1] + (b[1] - a[1]) * s / L]); s += 2; }
      carry = s - L;
    }
    // curvature (for the rival's speed and drift angle)
    const m = out.length, curv = new Float32Array(m), heading = new Float32Array(m);
    for (let i = 0; i < m; i++) {
      const p = out[(i - 3 + m) % m], q = out[i], r = out[(i + 3) % m];
      const a1 = Math.atan2(q[0] - p[0], q[1] - p[1]), a2 = Math.atan2(r[0] - q[0], r[1] - q[1]);
      curv[i] = U.wrap(a2 - a1) / 6;
      heading[i] = Math.atan2(r[0] - p[0], r[1] - p[1]);
    }
    return { pts: out, n: m, len: m * 2, curv, heading };
  }

  // ---------------------------------------------------------------- minimap base image
  function drawMinimap(w) {
    const S = 2, cw = Math.ceil(w.W / S), ch = Math.ceil(w.H / S);
    const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
    const c = cv.getContext('2d'), img = c.createImageData(cw, ch);
    for (let j = 0; j < ch; j++) for (let i = 0; i < cw; i++) {
      const t = w.grid[Math.min(w.H - 1, j * S) * w.W + Math.min(w.W - 1, i * S)], k = (j * cw + i) * 4;
      const col = t === ROAD ? [190, 196, 210, 235] : t === WATER ? [20, 40, 70, 200] : t === BOX || t === ISLAND ? [70, 72, 80, 220] : [16, 18, 26, 200];
      img.data[k] = col[0]; img.data[k + 1] = col[1]; img.data[k + 2] = col[2]; img.data[k + 3] = col[3];
    }
    c.putImageData(img, 0, 0);
    return { canvas: cv, scale: 1 / S };
  }
  KN.World.TYPES = { VOID, ROAD, BOX, ISLAND, WATER };
})(window.KN);
