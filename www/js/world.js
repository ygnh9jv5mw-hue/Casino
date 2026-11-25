/* NO ANTICHEAT: maps, collision, raycasts and bot navigation. */
(function (NA) {
  'use strict';
  const U = NA.U;
  const W = { current: null };

  // ---------------------------------------------------------------- textures
  const texCache = {};
  function gridTexture(key, base, line, bold, opts) {
    if (texCache[key]) return texCache[key];
    const size = 128;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    g.fillStyle = base; g.fillRect(0, 0, size, size);
    if (opts && opts.planks) {
      g.strokeStyle = line; g.lineWidth = 3;
      for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(0, i * 32); g.lineTo(size, i * 32); g.stroke(); }
      g.strokeStyle = bold; g.lineWidth = 6; g.strokeRect(3, 3, size - 6, size - 6);
      g.beginPath(); g.moveTo(0, 0); g.lineTo(size, size); g.stroke();
    } else if (opts && opts.noise) {
      for (let i = 0; i < 900; i++) {
        g.fillStyle = Math.random() < 0.5 ? line : bold;
        g.globalAlpha = 0.18;
        g.fillRect(Math.random() * size, Math.random() * size, 2, 2);
      }
      g.globalAlpha = 1;
      g.strokeStyle = line; g.lineWidth = 2; g.strokeRect(0, 0, size, size);
    } else {
      g.strokeStyle = line; g.lineWidth = 2;
      for (let i = 0; i <= 4; i++) {
        g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, size); g.stroke();
        g.beginPath(); g.moveTo(0, i * 32); g.lineTo(size, i * 32); g.stroke();
      }
      g.strokeStyle = bold; g.lineWidth = 4; g.strokeRect(0, 0, size, size);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    texCache[key] = t;
    return t;
  }
  const MAT_DEFS = {
    devFloor: ['#8d929b', '#7b8089', '#5d626b', null, 4],
    devWall: ['#b9bdc5', '#a5a9b1', '#8b8f97', null, 4],
    devOrange: ['#e8822e', '#d27120', '#b85d14', null, 2],
    devGrey: ['#9ba1ab', '#878d97', '#6f757f', null, 2],
    concrete: ['#7e7f7a', '#6a6b66', '#8e8f8a', { noise: true }, 4],
    wall: ['#56606c', '#4a535e', '#3f4752', null, 4],
    rack: ['#2f6db5', '#255a97', '#1d4a7d', null, 2],
    pillar: ['#d9a441', '#c18f30', '#a77a24', null, 2],
    crate: ['#a0703a', '#87602f', '#6d4c24', { planks: true }, 2],
    crate2: ['#8b5e34', '#77502b', '#603f21', { planks: true }, 2],
  };
  const matCache = {};
  function material(key) {
    if (matCache[key]) return matCache[key];
    const d = MAT_DEFS[key] || MAT_DEFS.devGrey;
    const m = new THREE.MeshLambertMaterial({ map: gridTexture(key, d[0], d[1], d[2], d[3]) });
    m.userData.tile = d[4];
    matCache[key] = m;
    return m;
  }
  // A box whose texture tiles by world size instead of stretching.
  function boxGeometry(w, h, d, tile) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const uv = geo.attributes.uv;
    const faces = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) {
      for (let v = 0; v < 4; v++) {
        const i = f * 4 + v;
        uv.setXY(i, uv.getX(i) * faces[f][0] / tile, uv.getY(i) * faces[f][1] / tile);
      }
    }
    uv.needsUpdate = true;
    return geo;
  }

  // ---------------------------------------------------------------- build
  W.build = function (scene, mapId) {
    if (W.current && W.current.id === mapId) return W.current;
    if (W.current) {
      scene.remove(W.current.group);
      W.current.group.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    }
    const def = NA.DATA.MAPS[mapId];
    const group = new THREE.Group();
    const colliders = [];
    for (const b of def.boxes) {
      const x = b[0], z = b[1], y = b[2], w = b[3], h = b[4], d = b[5];
      const mat = material(b[6]);
      const mesh = new THREE.Mesh(boxGeometry(w, h, d, mat.userData.tile), mat);
      mesh.position.set(x, y + h / 2, z);
      group.add(mesh);
      colliders.push({ minX: x - w / 2, maxX: x + w / 2, minY: y, maxY: y + h, minZ: z - d / 2, maxZ: z + d / 2 });
    }
    scene.add(group);
    scene.background = new THREE.Color(def.sky);
    scene.fog = new THREE.Fog(def.sky, def.fog[0], def.fog[1]);
    W.current = { id: mapId, def, group, colliders, nav: buildNav(def, colliders) };
    return W.current;
  };

  // ---------------------------------------------------------------- collision
  // Push a vertical cylinder (approximated as a square) out of boxes along one axis.
  W.collide = function (pos, r, h, axis) {
    const cs = W.current.colliders;
    for (let i = 0; i < cs.length; i++) {
      const c = cs[i];
      if (pos.y >= c.maxY - 0.02 || pos.y + h <= c.minY) continue;
      if (pos.x + r <= c.minX || pos.x - r >= c.maxX || pos.z + r <= c.minZ || pos.z - r >= c.maxZ) continue;
      if (axis === 'x') pos.x = pos.x < (c.minX + c.maxX) / 2 ? c.minX - r : c.maxX + r;
      else pos.z = pos.z < (c.minZ + c.maxZ) / 2 ? c.minZ - r : c.maxZ + r;
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
  W.los = function (ax, ay, az, bx, by, bz) {
    const dx = bx - ax, dy = by - ay, dz = bz - az;
    const dist = Math.hypot(dx, dy, dz);
    if (dist < 0.01) return true;
    const t = W.ray(ax, ay, az, dx / dist, dy / dist, dz / dist, dist);
    return t >= dist - 0.05;
  };

  // ---------------------------------------------------------------- navigation
  function buildNav(def, colliders) {
    const cell = 1;
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
    const open = [start];
    const f = new Float32Array(N).fill(Infinity);
    g[start] = 0; f[start] = h(s[0], s[1]);
    let found = false, iter = 0;
    while (open.length && iter++ < 4000) {
      let bi = 0;
      for (let k = 1; k < open.length; k++) if (f[open[k]] < f[open[bi]]) bi = k;
      const cur = open[bi];
      open[bi] = open[open.length - 1]; open.pop();
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
