/* NO ANTICHEAT: themed maps. Server Farm (the anticheat's own datacenter), LAN Café, and the
   FRAGLINE Arena where the Major is played. Same box format as maps.js:
   [x, z, yBottom, w, h, d, material]. 'none' is an invisible wall. */
(function (NA) {
  'use strict';
  const MAPS = NA.DATA.MAPS;
  const floor = (w, d, mat) => [0, 0, -1, w, 1, d, mat];
  function perimeter(out, w, d, h, mat) {
    out.push([0, -d / 2 - 0.25, 0, w + 1, h, 0.5, mat], [0, d / 2 + 0.25, 0, w + 1, h, 0.5, mat]);
    out.push([-w / 2 - 0.25, 0, 0, 0.5, h, d, mat], [w / 2 + 0.25, 0, 0, 0.5, h, d, mat]);
  }
  function grid(xs, zs) { const o = []; for (const x of xs) for (const z of zs) o.push([x, z]); return o; }
  const mirror = list => list.map(p => [-p[0], p[1]]);

  // ---------------------------------------------------------------- Server Farm (Warden AC's datacenter)
  (function () {
    const b = [floor(56, 44, 'raisedFloor')];
    perimeter(b, 56, 44, 5, 'serverWall');
    // rack rows run north-south so nobody gets a spawn-to-spawn sightline; gaps let you weave through
    const segs = NA.DATA.RACK_SEGS = [[-20, -13], [-10, -3], [3, 10], [13, 20]];
    for (const x of [-15, -9, 9, 15]) for (const [z0, z1] of segs) b.push([x, (z0 + z1) / 2, 0, 1.1, 2.3, z1 - z0, 'serverRack']);
    // the Warden core, ringed by L-shaped consoles
    b.push([0, 0, 0, 4, 4.4, 4, 'coreMetal']);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      b.push([sx * 2.9, sz * 3.6, 0, 1.6, 1.1, 0.6, 'console'], [sx * 3.6, sz * 2.9, 0, 0.6, 1.1, 1.6, 'console']);
    }
    for (const s of [-1, 1]) {
      b.push([0, s * 12, 0, 3, 2.4, 1.2, 'coolUnit']);                       // cooling units mid-north/south
      b.push([0, s * 21, 0, 2, 2.3, 2, 'serverRack']);                       // blocks the long wall corridors
      b.push([s * 4.5, s * 8.5, 0, 1.2, 1.2, 1.2, 'cableSpool'], [s * -4.5, s * 16.5, 0, 1.2, 1.2, 1.2, 'cableSpool']);
      b.push([s * 20, 0, 0, 0.8, 1.0, 3.2, 'console']);                      // security desks in front of each spawn
      b.push([s * 27.2, 13, 0, 1, 2, 4, 'upsCabinet'], [s * 27.2, -13, 0, 1, 2, 4, 'upsCabinet']);
      b.push([s * 19.5, 14, 0, 1.1, 2.3, 2, 'serverRack'], [s * 19.5, -14, 0, 1.1, 2.3, 2, 'serverRack']);
    }
    const A = grid([-25, -22.5], [-17, -9, 0, 9, 17]);
    MAPS.servers = {
      name: 'servers', title: 'Server Farm', size: [56, 44], sky: 0x0f1724, fog: [25, 80], cell: 1, boxes: b,
      spawns: { A, B: mirror(A), all: grid([-24, -12, 0, 12, 24], [-17, -6, 6, 17]) },
    };
  })();

  // ---------------------------------------------------------------- LAN Café (NetCafe 24/7)
  (function () {
    const b = [floor(40, 30, 'cafeFloor')];
    perimeter(b, 40, 30, 3.6, 'cafeWall');
    // double-sided PC rows with privacy dividers you can peek over
    for (const z of [-5, 5]) for (const x of [-4, 4]) b.push([x, z, 0, 6, 0.78, 1.6, 'pcDesk'], [x, z, 0.78, 6, 0.7, 0.12, 'divider']);
    // vending machines staggered in the middle lane
    b.push([-2.2, 1.4, 0, 1.2, 2, 0.9, 'vending'], [2.2, -1.4, 0, 1.2, 2, 0.9, 'vending']);
    // arcade cabinets on the north wall
    for (const x of [-8, -5.5, -3, 3, 5.5, 8]) b.push([x, 14.2, 0, 1.0, 1.9, 0.9, 'arcade']);
    // snack bar on the south wall: counter, back counter, fridges (you can get behind the bar)
    b.push([0, -11.8, 0, 8, 1.1, 0.8, 'counter'], [0, -14.3, 0, 8, 1.0, 0.6, 'counter']);
    b.push([-6.6, -14.3, 0, 1.6, 2.1, 0.8, 'fridge'], [6.6, -14.3, 0, 1.6, 2.1, 0.8, 'fridge']);
    for (const s of [-1, 1]) {
      // partitions split each end into a lounge with two corner alcoves
      b.push([s * 11.5, -11, 0, 0.3, 3.6, 8, 'cafeWall'], [s * 11.5, 11, 0, 0.3, 3.6, 8, 'cafeWall']);
      b.push([s * 11.5, 7, 0, 0.8, 3.6, 0.8, 'cafeColumn'], [s * 11.5, -7, 0, 0.8, 3.6, 0.8, 'cafeColumn']);
      b.push([s * 14.5, 5.5, 0, 0.9, 0.9, 2.6, 'couch'], [s * 14.5, -5.5, 0, 0.9, 0.9, 2.6, 'couch']);
      b.push([s * 17.6, 13, 0, 1.6, 0.75, 1.6, 'pcDesk'], [s * 17.6, -13, 0, 1.6, 0.75, 1.6, 'pcDesk']);
      b.push([s * 18.6, 7, 0, 0.9, 0.6, 0.9, 'beanBag'], [s * 18.6, -7, 0, 0.9, 0.6, 0.9, 'beanBag']);
    }
    const A = grid([-18.5, -16], [-10.5, -3.5, 3.5, 10.5]);
    MAPS.lancafe = {
      name: 'lancafe', title: 'LAN Café', size: [40, 30], sky: 0x1a1424, fog: [25, 70], cell: 1, boxes: b,
      spawns: { A, B: mirror(A), all: grid([-17, -8, 0, 8, 17], [-10, 0, 10]) },
    };
  })();

  // ---------------------------------------------------------------- FRAGLINE Arena (the Major)
  (function () {
    const b = [floor(72, 52, 'arenaFloor')];
    // low LED barriers so you can see the crowd, with invisible walls behind them
    perimeter(b, 72, 52, 1.3, 'barrier');
    b.push([0, -27.5, 0, 75, 9, 1, 'none'], [0, 27.5, 0, 75, 9, 1, 'none'], [-37.5, 0, 0, 1, 9, 56, 'none'], [37.5, 0, 0, 1, 9, 56, 'none']);
    // centre stage (jump up), split by the LED wall, with both team booths and the trophy
    b.push([0, 0, 0, 14, 1.0, 9, 'stage']);
    b.push([0, 0, 1.0, 0.6, 3.0, 6, 'ledWall']);
    b.push([-4.5, 0, 1.0, 1.0, 0.8, 5, 'boothDesk'], [4.5, 0, 1.0, 1.0, 0.8, 5, 'boothDesk']);
    b.push([0, -3.8, 1.0, 0.8, 1.0, 0.8, 'pedestal']);
    // steps up to the stage at both ends (hop up them)
    for (const s of [-1, 1]) b.push([s * 7.9, 0, 0, 0.6, 0.45, 3, 'stage'], [s * 7.3, 0, 0, 0.6, 0.75, 3, 'stage']);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) b.push([sx * 8.2, sz * 5.6, 0, 1.8, 3.4, 1.6, 'speaker']);
      // sponsor boards: chest-high cover across the floor
      b.push([sx * 15, 0, 0, 0.35, 1.2, 6, 'sponsor']);
      b.push([sx * 14, 10, 0, 5, 1.2, 0.35, 'sponsor'], [sx * 14, -10, 0, 5, 1.2, 0.35, 'sponsor']);
      b.push([sx * 22, 14, 0, 5, 1.2, 0.35, 'sponsor'], [sx * 22, -14, 0, 5, 1.2, 0.35, 'sponsor']);
      b.push([sx * 8, 16, 0, 0.35, 1.2, 5, 'sponsor'], [sx * 8, -16, 0, 0.35, 1.2, 5, 'sponsor']);
      // flight cases by each spawn (one stack is tall enough to hide behind)
      b.push([sx * 25, 5, 0, 1.4, 1.0, 1.0, 'flightCase'], [sx * 25, -5, 0, 1.4, 1.0, 1.0, 'flightCase']);
      b.push([sx * 26.5, 6.2, 0, 1.4, 1.0, 1.0, 'flightCase'], [sx * 26.5, 6.2, 1.0, 1.4, 0.8, 1.0, 'flightCase']);
      b.push([sx * 26.5, -6.2, 0, 1.4, 1.0, 1.0, 'flightCase'], [sx * 26.5, -6.2, 1.0, 1.4, 0.8, 1.0, 'flightCase']);
      b.push([sx * 10, 22, 0, 1.6, 0.6, 1.6, 'craneBase'], [sx * 10, -22, 0, 1.6, 0.6, 1.6, 'craneBase']);
      b.push([sx * 30, 16, 0, 0.6, 0.5, 4, 'boothDesk'], [sx * 30, -16, 0, 0.6, 0.5, 4, 'boothDesk']);
    }
    b.push([0, 19, 0, 7, 1.2, 0.35, 'sponsor'], [0, -19, 0, 7, 1.2, 0.35, 'sponsor']);
    const A = grid([-33, -30.5], [-20, -10, 0, 10, 20]);
    MAPS.arena = {
      name: 'arena', title: 'FRAGLINE Arena', size: [72, 52], sky: 0x0d0f1a, fog: [35, 110], cell: 1, boxes: b,
      spawns: { A, B: mirror(A), all: grid([-28, -18, -6, 6, 18, 28], [-18, -8, 8, 18]) },
    };
  })();

  // display names for the older maps
  const T = { aim_map: 'Aim Map', warehouse: 'Warehouse', courtyard: 'Courtyard', shipyard: 'Shipyard', office: 'Office', metro: 'Metro', island: 'Island' };
  for (const k in T) if (MAPS[k] && !MAPS[k].title) MAPS[k].title = T[k];
  NA.DATA.mapTitle = id => (MAPS[id] && (MAPS[id].title || MAPS[id].name)) || id;
})(window.NA);
