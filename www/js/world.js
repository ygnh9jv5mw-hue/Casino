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
    } else if (opts && opts.ribs) {
      g.fillStyle = line;
      for (let i = 0; i < 16; i++) g.fillRect(i * 8, 0, 3, size);
      g.strokeStyle = bold; g.lineWidth = 6; g.strokeRect(0, 0, size, size);
    } else if (opts && opts.bricks) {
      g.strokeStyle = line; g.lineWidth = 3;
      for (let r = 0; r < 8; r++) {
        g.beginPath(); g.moveTo(0, r * 16); g.lineTo(size, r * 16); g.stroke();
        for (let k = 0; k < 4; k++) { const x = k * 32 + (r % 2) * 16; g.beginPath(); g.moveTo(x, r * 16); g.lineTo(x, r * 16 + 16); g.stroke(); }
      }
    } else if (opts && opts.soft) {
      for (let i = 0; i < 1400; i++) {
        g.fillStyle = Math.random() < 0.5 ? line : bold;
        g.globalAlpha = 0.25;
        g.fillRect(Math.random() * size, Math.random() * size, 3, 3);
      }
      g.globalAlpha = 1;
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
    paving: ['#b9b3a7', '#a49e92', '#8f897d', null, 2],
    brick: ['#9c4f3c', '#c9b8a6', '#7d3f30', { bricks: true }, 2],
    stone: ['#a8a39a', '#938e85', '#7d786f', { noise: true }, 2],
    roof: ['#6b3a2e', '#5a3026', '#4a271f', null, 3],
    hedge: ['#3f7d3a', '#336b2f', '#2a5a27', { soft: true }, 2],
    asphalt: ['#4b4f55', '#3f4348', '#5a5e64', { noise: true }, 6],
    contR: ['#b23a2e', '#8f2e25', '#6d231c', { ribs: true }, 3],
    contB: ['#2e5fa8', '#244c87', '#1b3a68', { ribs: true }, 3],
    contG: ['#3c8a4a', '#2f6e3b', '#24552d', { ribs: true }, 3],
    contY: ['#d9a628', '#b88b1f', '#946f17', { ribs: true }, 3],
    crane: ['#e3b23c', '#2b2b2b', '#c2952c', null, 2],
    carpet: ['#5b6475', '#535c6c', '#4b5363', { soft: true }, 3],
    officeWall: ['#d9dce1', '#c7cad0', '#b3b7be', null, 4],
    desk: ['#8a6b4c', '#7a5d41', '#694f37', null, 2],
    cabinet: ['#7b828c', '#6b727b', '#5c626a', null, 1],
    tile: ['#cfd3d6', '#b8bcc0', '#a2a6aa', null, 1.5],
    tileWall: ['#e6e1d3', '#d3cdbf', '#3b6ea5', null, 2],
    track: ['#3a3532', '#2c2826', '#55504c', { noise: true }, 2],
    train: ['#c8ccd2', '#1f6fb2', '#9aa0a8', { ribs: true }, 4],
    bench: ['#6f4e37', '#5c412e', '#4a3425', null, 1],
    kiosk: ['#c2410c', '#9a3412', '#7c2d12', null, 2],
    grass: ['#5c9a46', '#4f8a3c', '#6aa953', { soft: true }, 6],
    sand: ['#d8c48f', '#c9b47e', '#e3d29f', { soft: true }, 6],
    rock: ['#7f8288', '#6c6f75', '#909399', { noise: true }, 3],
    trunk: ['#6b4a2f', '#5a3e27', '#4a331f', null, 1],
    leaves: ['#3f8a3a', '#347532', '#2b6229', { soft: true }, 2],
    houseWall: ['#e8dcc5', '#d8cbb2', '#c4b79e', null, 3],
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
  function mergeBoxes(geos) {
    let nv = 0, ni = 0;
    for (const g of geos) { nv += g.attributes.position.count; ni += g.index.count; }
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2);
    const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
    let vo = 0, io = 0;
    for (const g of geos) {
      pos.set(g.attributes.position.array, vo * 3);
      nor.set(g.attributes.normal.array, vo * 3);
      uv.set(g.attributes.uv.array, vo * 2);
      const src = g.index.array;
      for (let i = 0; i < src.length; i++) idx[io + i] = src[i] + vo;
      vo += g.attributes.position.count; io += src.length;
    }
    const m = new THREE.BufferGeometry();
    m.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    m.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    m.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    m.setIndex(new THREE.BufferAttribute(idx, 1));
    m.computeBoundingSphere();
    return m;
  }
  W.build = function (scene, mapId) {
    if (W.current && W.current.id === mapId) return W.current;
    if (W.current) {
      scene.remove(W.current.group);
      W.current.group.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    }
    const def = NA.DATA.MAPS[mapId];
    const group = new THREE.Group();
    const colliders = [];
    // One mesh per material instead of one per box: big maps drop from ~170 draw calls to ~20.
    const byMat = new Map();
    for (const b of def.boxes) {
      const x = b[0], z = b[1], y = b[2], w = b[3], h = b[4], d = b[5];
      const mat = material(b[6]);
      const geo = boxGeometry(w, h, d, mat.userData.tile);
      geo.translate(x, y + h / 2, z);
      if (!byMat.has(mat)) byMat.set(mat, []);
      byMat.get(mat).push(geo);
      colliders.push({ minX: x - w / 2, maxX: x + w / 2, minY: y, maxY: y + h, minZ: z - d / 2, maxZ: z + d / 2 });
    }
    for (const [mat, geos] of byMat) {
      const merged = mergeBoxes(geos);
      geos.forEach(g => g.dispose());
      group.add(new THREE.Mesh(merged, mat));
    }
    scene.add(group);
    scene.background = new THREE.Color(def.sky);
    scene.fog = new THREE.Fog(def.sky, def.fog[0], def.fog[1]);
    W.current = { id: mapId, def, group, colliders, nav: buildNav(def, colliders) };
    return W.current;
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
