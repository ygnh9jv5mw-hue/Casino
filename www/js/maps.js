/* NO ANTICHEAT: the big maps (Tiers 4–9), built from boxes by small seeded generators. */
(function (NA) {
  'use strict';
  const MAPS = NA.DATA.MAPS;

  // Deterministic random so a map looks the same every match.
  function rng(seed) {
    let s = seed >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }
  // box: [x, z, yBottom, w, h, d, material]
  const floor = (w, d, mat) => [0, 0, -1, w, 1, d, mat];
  function perimeter(out, w, d, h, mat) {
    out.push([0, -d / 2 - 0.25, 0, w + 1, h, 0.5, mat], [0, d / 2 + 0.25, 0, w + 1, h, 0.5, mat]);
    out.push([-w / 2 - 0.25, 0, 0, 0.5, h, d, mat], [w / 2 + 0.25, 0, 0, 0.5, h, d, mat]);
  }
  // A wall from a to b along one axis, with door gaps (centre positions) of the given width.
  function wall(out, axis, a, b, at, h, t, mat, gaps, gw) {
    const cuts = (gaps || []).slice().sort((p, q) => p - q);
    let cur = a;
    for (const g of cuts.concat([Infinity])) {
      const end = g === Infinity ? b : g - gw / 2;
      if (end - cur > 0.05) {
        const mid = (cur + end) / 2, len = end - cur;
        out.push(axis === 'x' ? [mid, at, 0, len, h, t, mat] : [at, mid, 0, t, h, len, mat]);
      }
      if (g !== Infinity) cur = g + gw / 2;
    }
  }
  function grid(xs, zs) { const o = []; for (const x of xs) for (const z of zs) o.push([x, z]); return o; }

  // ---------------------------------------------------------------- courtyard (Tier 4, 5v5)
  (function () {
    const b = [floor(60, 60, 'paving')];
    perimeter(b, 60, 60, 6, 'brick');
    b.push([0, 0, 0, 8, 0.9, 8, 'stone'], [0, 0, 0.9, 1.6, 2.4, 1.6, 'stone']);
    for (const s of [-1, 1]) {
      // arcade buildings along north and south walls
      wall(b, 'x', -14, 14, s * 21, 4, 0.6, 'brick', [-7, 0, 7], 3);
      b.push([-14.3, s * 25.5, 0, 0.6, 4, 9, 'brick'], [14.3, s * 25.5, 0, 0.6, 4, 9, 'brick']);
      b.push([0, s * 25.5, 4, 29.2, 0.5, 9.6, 'roof']);
      b.push([-7, s * 26, 0, 2, 1.1, 1.4, 'crate'], [7, s * 26.5, 0, 2.5, 1.1, 1.2, 'crate2']);
      // pillar rows
      for (let z = -15; z <= 15; z += 6) b.push([s * 18, z, 0, 1, 5, 1, 'pillar']);
      // hedges
      b.push([s * 9, -10, 0, 6, 1.1, 1, 'hedge'], [s * 11.5, -12.5, 0, 1, 1.1, 4, 'hedge']);
      b.push([s * 9, 10, 0, 6, 1.1, 1, 'hedge'], [s * 11.5, 12.5, 0, 1, 1.1, 4, 'hedge']);
      b.push([s * 24, -6, 0, 2, 2, 2, 'crate'], [s * 24, 6, 0, 2, 2, 2, 'crate'], [s * 25.5, 0, 0, 1.6, 1.1, 3, 'crate2']);
      b.push([s * 5, s * -14, 0, 3, 1.2, 1.2, 'crate2'], [s * -5, s * 14.5, 0, 1.6, 1.6, 1.6, 'crate']);
    }
    MAPS.courtyard = {
      name: 'courtyard', size: [60, 60], sky: 0xa9cbe8, fog: [45, 140], cell: 1, boxes: b,
      spawns: {
        A: grid([-27, -23], [-18, -10, 0, 10, 18]),
        B: grid([27, 23], [-18, -10, 0, 10, 18]),
      },
    };
  })();

  // ---------------------------------------------------------------- shipyard (Tier 5, 8 FFA)
  (function () {
    const r = rng(5150), b = [floor(84, 84, 'asphalt')];
    perimeter(b, 84, 84, 7, 'wall');
    const cols = ['contR', 'contB', 'contG', 'contY'];
    for (const z of [-30, -18, -6, 6, 18, 30]) {
      for (let x = -32; x <= 32; x += 8) {
        if (r() < 0.36) continue;
        const c = cols[Math.floor(r() * 4)];
        b.push([x, z, 0, 6.1, 2.6, 2.5, c]);
        if (r() < 0.28) b.push([x + (r() < 0.5 ? -0.4 : 0.4), z, 2.6, 6.1, 2.6, 2.5, cols[Math.floor(r() * 4)]]);
      }
    }
    // two gantry cranes
    for (const cx of [-14, 14]) {
      b.push([cx - 9, -38, 0, 1.2, 15, 1.2, 'crane'], [cx + 9, -38, 0, 1.2, 15, 1.2, 'crane']);
      b.push([cx, -38, 15, 19.2, 1.4, 1.4, 'crane']);
    }
    b.push([-38, 38, 0, 3, 3, 3, 'crate'], [38, -38, 0, 3, 3, 3, 'crate'], [0, 38.5, 0, 6, 1.2, 1.5, 'crate2']);
    MAPS.shipyard = {
      name: 'shipyard', size: [84, 84], sky: 0x9fb4c8, fog: [40, 130], cell: 1.5, boxes: b,
      spawns: { all: grid([-38, -19, 0, 19, 38], [-36, -12, 12, 36]) },
    };
  })();

  // ---------------------------------------------------------------- office (Tier 6, 8v8)
  (function () {
    const b = [floor(64, 48, 'carpet')];
    perimeter(b, 64, 48, 4, 'officeWall');
    for (const x of [-16, 0, 16]) wall(b, 'z', -24, 24, x, 4, 0.5, 'officeWall', [-16, 0, 16], 3);
    for (const z of [-8, 8]) wall(b, 'x', -32, 32, z, 4, 0.5, 'officeWall', [-24, -8, 8, 24], 3);
    for (const cx of [-24, -8, 8, 24]) {
      for (const cz of [-16, 0, 16]) {
        b.push([cx - 3, cz + 4, 0, 2.4, 0.8, 1.2, 'desk'], [cx + 3, cz - 4, 0, 2.4, 0.8, 1.2, 'desk']);
        b.push([cx + 6.5, cz + 6.5, 0, 1, 1.8, 0.6, 'cabinet']);
        if ((cx + cz) % 16 === 0) b.push([cx - 5.5, cz - 5.5, 0, 1.2, 1.2, 1.2, 'crate']);
      }
    }
    MAPS.office = {
      name: 'office', size: [64, 48], sky: 0xc9d3dc, fog: [30, 90], cell: 1, boxes: b,
      spawns: {
        A: grid([-30, -18.5], [-20, -13, -3, 3, 13, 20]),
        B: grid([30, 18.5], [-20, -13, -3, 3, 13, 20]),
      },
    };
  })();

  // ---------------------------------------------------------------- metro (Tier 7, 12 FFA)
  (function () {
    const b = [floor(100, 40, 'tile')];
    perimeter(b, 100, 40, 6, 'tileWall');
    b.push([0, 0, -0.98, 100, 1, 4.4, 'track']);
    for (const x of [-38, -19, 0, 19, 38]) b.push([x, 0, 0, 16, 3.4, 3.2, 'train']);
    for (const s of [-1, 1]) {
      for (let x = -40; x <= 40; x += 10) b.push([x, s * 10, 0, 1, 6, 1, 'pillar']);
      for (const x of [-35, -5, 5, 35]) b.push([x, s * 14, 0, 3, 0.5, 0.8, 'bench']);
      b.push([s * 15, s * 16, 0, 3, 2.5, 2, 'kiosk'], [s * -15, s * -16, 0, 3, 2.5, 2, 'kiosk']);
      b.push([s * 30, 16, 0, 6, 4, 6, 'tileWall'], [s * 30, -16, 0, 6, 4, 6, 'tileWall']);
      b.push([s * 46, s * 6, 0, 2, 2, 2, 'crate']);
    }
    MAPS.metro = {
      name: 'metro', size: [100, 40], sky: 0x6f7c8c, fog: [35, 110], cell: 1, boxes: b,
      spawns: { all: grid([-44, -25, -8, 8, 25, 44], [-17, -7, 7, 17]) },
    };
  })();

  // ---------------------------------------------------------------- island (Tiers 8–9, 32 players)
  (function () {
    const r = rng(8008), b = [floor(140, 140, 'sand'), [0, 0, -1, 112, 1.03, 112, 'grass']];
    perimeter(b, 140, 140, 3, 'rock');
    const houses = [[-35, -35], [35, -35], [-35, 35], [35, 35], [0, -46], [0, 46], [-48, 0], [48, 0]];
    for (const [hx, hz] of houses) {
      const w = 10, d = 8, h = 3.2, t = 0.4;
      wall(b, 'x', hx - w / 2, hx + w / 2, hz - d / 2, h, t, 'houseWall', [hx], 2.4);
      wall(b, 'x', hx - w / 2, hx + w / 2, hz + d / 2, h, t, 'houseWall', [hx + 2.5], 2.4);
      wall(b, 'z', hz - d / 2, hz + d / 2, hx - w / 2, h, t, 'houseWall', [hz], 2.2);
      wall(b, 'z', hz - d / 2, hz + d / 2, hx + w / 2, h, t, 'houseWall', [], 0);
      b.push([hx, hz, h, w + 0.8, 0.4, d + 0.8, 'roof'], [hx + 2.5, hz - 1.5, 0, 1.6, 0.8, 1, 'desk']);
    }
    // ruined tower in the middle
    wall(b, 'x', -6, 6, -6, 5, 0.6, 'stone', [0], 3); wall(b, 'x', -6, 6, 6, 5, 0.6, 'stone', [-2.5], 3);
    wall(b, 'z', -6, 6, -6, 5, 0.6, 'stone', [2], 3); wall(b, 'z', -6, 6, 6, 5, 0.6, 'stone', [0], 3);
    b.push([2, 2, 0, 1.6, 1.6, 1.6, 'crate'], [-2.5, -1.5, 0, 2.5, 1.1, 1.2, 'crate2']);
    const A = [], B = [];
    for (let z = -50; z <= 50; z += 10) { A.push([-60, z], [-54, z + 5]); B.push([60, z], [54, z - 5]); }
    const keep = houses.map(h => [h[0], h[1], 9]).concat([[0, 0, 10]], A.concat(B).map(s => [s[0], s[1], 4]));
    const placed = [];
    const free = (x, z, rad) => keep.every(k => Math.hypot(x - k[0], z - k[1]) > k[2] + rad) && placed.every(p => Math.hypot(x - p[0], z - p[1]) > 5);
    for (let i = 0; i < 400 && placed.length < 46; i++) {
      const x = (r() - 0.5) * 104, z = (r() - 0.5) * 104;
      if (!free(x, z, 1.5)) continue;
      placed.push([x, z]);
      if (placed.length % 3 === 0) {
        const w = 2 + r() * 2.5, h = 1 + r() * 1.3;
        b.push([x, z, 0, w, h, 1.5 + r() * 2, 'rock']);
      } else {
        b.push([x, z, 0, 0.6, 3, 0.6, 'trunk'], [x, z, 2.6, 3 + r(), 2.4, 3 + r(), 'leaves']);
      }
    }
    MAPS.island = {
      name: 'island', size: [140, 140], sky: 0x8ec5f0, fog: [60, 190], cell: 2, boxes: b,
      spawns: { A, B },
    };
  })();
})(window.NA);
