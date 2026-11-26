/* Kaido Nights: cars, parts, paint, districts, crews and meet challenges.
   All cars are made up. They borrow the feel of classic drift-car eras, never a real name or badge. */
(function (KN) {
  'use strict';
  const D = KN.DATA = {};

  // ---------------------------------------------------------------- cars
  // power in kW, mass in kg, lengths in metres, steer in degrees
  D.CARS = [
    { id: 'rookie', name: 'Rookie Hatch', era: "'85 hatchback", price: 0, tier: 1, needs: null, body: 'hatch',
      desc: 'Light, slow and honest. Everyone starts somewhere.',
      phys: { mass: 940, power: 96, wheelbase: 2.40, mu: 1.0, steer: 34, drag: 0.40 }, dims: { len: 4.05, wid: 1.66, hgt: 1.34 } },
    { id: 'tsuki', name: 'Tsuki Coupe', era: "'90 pop-up coupe", price: 6000, tier: 2, needs: 'docks', body: 'popup',
      desc: 'Pop-up lights, long hood, perfect balance. The street favourite.',
      phys: { mass: 1170, power: 152, wheelbase: 2.48, mu: 1.03, steer: 37, drag: 0.36 }, dims: { len: 4.50, wid: 1.70, hgt: 1.29 } },
    { id: 'ryu', name: 'Ryu Rotary', era: "'93 rotary coupe", price: 15000, tier: 3, needs: 'industrial', body: 'rotary',
      desc: 'Revs forever, weighs nothing, bites if you lift.',
      phys: { mass: 1240, power: 196, wheelbase: 2.42, mu: 1.05, steer: 39, drag: 0.32 }, dims: { len: 4.30, wid: 1.76, hgt: 1.23 } },
    { id: 'kuro', name: 'Kuro V8', era: "'05 muscle coupe", price: 28000, tier: 4, needs: 'downtown', body: 'muscle',
      desc: 'Big V8, big smoke. Point it and pray.',
      phys: { mass: 1490, power: 285, wheelbase: 2.72, mu: 1.06, steer: 38, drag: 0.36 }, dims: { len: 4.78, wid: 1.88, hgt: 1.38 } },
    { id: 'raiden', name: 'Raiden GT', era: "'99 twin-turbo GT", price: 48000, tier: 5, needs: 'highway', body: 'gt',
      desc: 'Twin turbos and a rear wing. The car crews whisper about.',
      phys: { mass: 1420, power: 330, wheelbase: 2.66, mu: 1.09, steer: 42, drag: 0.31 }, dims: { len: 4.60, wid: 1.79, hgt: 1.36 } },
  ];
  D.CAR = {};
  D.CARS.forEach(c => { D.CAR[c.id] = c; });

  // ---------------------------------------------------------------- parts (5 levels each)
  D.PARTS = [
    { id: 'engine', name: 'Engine', icon: 'E', desc: 'More power: faster entries and longer slides.', stat: 'power' },
    { id: 'tires', name: 'Tires', icon: 'T', desc: 'More grip, so the drift holds its line.', stat: 'grip' },
    { id: 'susp', name: 'Suspension', icon: 'S', desc: 'Calmer weight shifts, cleaner transitions.', stat: 'control' },
    { id: 'angle', name: 'Angle kit', icon: 'A', desc: 'More steering lock for deeper angle.', stat: 'angle' },
    { id: 'handbrake', name: 'Handbrake', icon: 'H', desc: 'Sharper handbrake kicks to start a drift.', stat: 'kick' },
    { id: 'weight', name: 'Weight cut', icon: 'W', desc: 'Strip it out. Lighter is quicker.', stat: 'power' },
  ];
  D.PART_COST = [500, 1200, 2600, 5200, 9800];
  D.TIER_MULT = [0, 1, 1.4, 1.9, 2.5, 3.2];
  D.partCost = (carId, partId, level) => Math.round(D.PART_COST[level] * D.TIER_MULT[D.CAR[carId].tier] / 50) * 50;

  // ---------------------------------------------------------------- paint
  D.PAINTS = [
    { name: 'Rally Red', hex: '#d62828' }, { name: 'Hot Pink', hex: '#ff3e9a' }, { name: 'Sunset Orange', hex: '#ff7b00' },
    { name: 'Taxi Yellow', hex: '#ffc300' }, { name: 'Lime Shock', hex: '#8ac926' }, { name: 'Mint', hex: '#2ec4b6' },
    { name: 'Sky Blue', hex: '#3a86ff' }, { name: 'Midnight Blue', hex: '#1d3a8a' }, { name: 'Night Purple', hex: '#6a2c91' },
    { name: 'Arctic White', hex: '#eef1f4' }, { name: 'Gunmetal', hex: '#4a4e57' }, { name: 'Jet Black', hex: '#121316' },
  ];
  D.FINISHES = [
    { id: 'gloss', name: 'Gloss', price: 0 },
    { id: 'metallic', name: 'Metallic', price: 800 },
    { id: 'matte', name: 'Matte', price: 800 },
  ];
  D.WHEELS = [
    { name: 'Silver', hex: '#c9ccd2' }, { name: 'Black', hex: '#1b1c1f' }, { name: 'Gold', hex: '#c9a227' },
    { name: 'White', hex: '#f2f2f2' }, { name: 'Bronze', hex: '#a0703a' }, { name: 'Neon', hex: '#39ff14' },
  ];
  D.PAINT_PRICE = 300;

  // ---------------------------------------------------------------- map helpers
  // road = thick polyline; corners get rounded with arcs of radius r (one number, or one per point)
  function rounded(pts, r, closed) {
    if (!r) return pts;
    const out = [], n = pts.length;
    for (let i = 0; i < n; i++) {
      const p = pts[i];
      const first = i === 0, last = i === n - 1, rv = Array.isArray(r) ? r[i] : r;
      if ((!closed && (first || last)) || !rv) { out.push(p); continue; }
      const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
      const d1 = Math.hypot(p[0] - a[0], p[1] - a[1]), d2 = Math.hypot(b[0] - p[0], b[1] - p[1]);
      const rr = Math.min(rv, d1 * 0.45, d2 * 0.45);
      const u1 = [(a[0] - p[0]) / d1, (a[1] - p[1]) / d1], u2 = [(b[0] - p[0]) / d2, (b[1] - p[1]) / d2];
      const s = [p[0] + u1[0] * rr, p[1] + u1[1] * rr], e = [p[0] + u2[0] * rr, p[1] + u2[1] * rr];
      // quadratic bezier through the corner
      for (let k = 0; k <= 8; k++) {
        const t = k / 8, it = 1 - t;
        out.push([it * it * s[0] + 2 * it * t * p[0] + t * t * e[0], it * it * s[1] + 2 * it * t * p[1] + t * t * e[1]]);
      }
    }
    return out;
  }
  // smooth closed curve through control points (Catmull-Rom), sampled every ~step metres
  function spline(ctrl, step, closed) {
    const out = [], n = ctrl.length;
    const P = i => ctrl[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
    const segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), k = Math.max(2, Math.ceil(len / step));
      for (let j = 0; j < k; j++) {
        const t = j / k, t2 = t * t, t3 = t2 * t;
        const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
      }
    }
    if (!closed) out.push(ctrl[n - 1]);
    return out;
  }
  function circle(cx, cz, r, n) { const out = []; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; out.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); } return out; }
  D.mapHelpers = { rounded, spline, circle };
  const road = (w, pts, closed, r) => ({ w, pts: rounded(pts, r === undefined ? w * 1.4 : r, closed), closed: !!closed });
  const loop = (w, pts, r) => road(w, pts, true, r);
  const rect = (x, z, w, h) => ({ x, z, w, h });
  const box = (x, z, w, h, kind, ht) => ({ x, z, w, h, kind: kind || 'block', ht: ht || 3 });

  // ---------------------------------------------------------------- districts
  // x right, z "down" on the minimap; yaw 0 faces +z, PI/2 faces +x
  const docksContainers = [];
  for (const [z, xs] of [[-80, [-140, -112, -84, -56]], [-15, [-126, -98, -70, -42]], [50, [-140, -112, -84, -56]]]) {
    for (const x of xs) docksContainers.push(box(x, z, 12.2, 5, 'container', 2 + ((x * 7 + z) & 1)));
  }
  docksContainers.push(box(92, -52, 54, 12, 'container', 3), box(92, 48, 54, 12, 'container', 2));

  D.DISTRICTS = [
    {
      id: 'docks', name: 'The Docks', crew: 'Rust Rats', leader: 'Spanner', vibe: 'scrappy beginners in junk cars',
      color: '#f59e0b', rivalCar: 'rookie', rivalPaint: '#7a4a2a', rivalRust: true,
      target: 6000, reward: 2500, bounds: [-212, -172, 212, 178], ground: 'concrete', theme: 'docks',
      roads: [
        loop(18, [[-182, -142], [182, -142], [182, 117], [-182, 117]], 34),
        road(16, [[0, -142], [0, 117]], false, 0),
      ],
      lots: [rect(-90, -12, 152, 226), rect(90, -12, 152, 226)],
      boxes: docksContainers,
      islands: [],
      spawn: { x: -150, z: 117, yaw: Math.PI / 2 },
      course: loop(0, [[-100, 117], [182, 117], [182, -142], [-182, -142], [-182, 117]], 34).pts,
      water: { z: 132 },
    },
    {
      id: 'industrial', name: 'Industrial Zone', crew: 'Forge Kings', leader: 'Anvil', vibe: 'heavy, loud, smoke-everything builds',
      color: '#ef4444', rivalCar: 'kuro', rivalPaint: '#2b2b2e',
      target: 15000, reward: 5000, bounds: [-200, -200, 200, 200], ground: 'concrete', theme: 'industrial',
      roads: [
        road(15, [[-150, -172], [-150, 172]], false, 0),
        road(12, [[-60, -172], [-60, 60]], false, 0),
        road(15, [[30, -172], [30, 172]], false, 0),
        road(15, [[120, -60], [120, 172]], false, 0),
        road(12, [[172, -172], [172, -60]], false, 0),
        road(15, [[-172, -150], [172, -150]], false, 0),
        road(15, [[-150, -60], [172, -60]], false, 0),
        road(12, [[-150, 40], [120, 40]], false, 0),
        road(15, [[-172, 140], [172, 140]], false, 0),
      ],
      lots: [rect(-105, 95, 78, 58), rect(78, -105, 70, 70)],
      discs: [[-150, 140, 17], [-150, -150, 17], [30, -150, 17], [30, -60, 17], [120, -60, 17], [120, 140, 17]],
      boxes: [box(-60, 120, 10, 22, 'crate', 4), box(150, 95, 22, 10, 'crate', 3)],
      islands: [[-105, 95, 9], [78, -105, 8]],
      spawn: { x: -150, z: 120, yaw: Math.PI },
      course: rounded([[-150, 140], [-150, -150], [30, -150], [30, -60], [120, -60], [120, 140]], 22, true),
    },
    {
      id: 'downtown', name: 'Downtown', crew: 'Neon Syndicate', leader: 'Vega', vibe: 'flashy show cars, all style',
      color: '#ec4899', rivalCar: 'tsuki', rivalPaint: '#ff3e9a',
      target: 28000, reward: 10000, bounds: [-232, -232, 232, 232], ground: 'sidewalk', theme: 'downtown',
      roads: [
        road(16, [[-170, -205], [-170, 205]], false, 0), road(15, [[-60, -205], [-60, 205]], false, 0),
        road(16, [[60, -205], [60, 205]], false, 0), road(16, [[170, -205], [170, 205]], false, 0),
        road(16, [[-205, -170], [205, -170]], false, 0), road(16, [[-205, -60], [205, -60]], false, 0),
        road(16, [[-205, 60], [205, 60]], false, 0), road(16, [[-205, 170], [205, 170]], false, 0),
        { w: 15, pts: circle(0, 0, 31, 48), closed: true },
        road(15, [[0, -60], [0, -30]], false, 0), road(15, [[0, 60], [0, 30]], false, 0),
        road(13, [[60, 0], [30, 0]], false, 0), road(13, [[-60, 0], [-30, 0]], false, 0),
      ],
      lots: [],
      discs: [[-170, 170, 16], [-170, -170, 16], [60, -170, 16], [60, -60, 16], [0, -60, 15], [0, 60, 15], [170, 60, 16], [170, 170, 16]],
      boxes: [
        box(-130, -175, 4.5, 2, 'parked'), box(-118, -175, 4.5, 2, 'parked'), box(-96, -175, 4.5, 2, 'parked'),
        box(-165, 20, 2, 4.5, 'parked'), box(-165, 34, 2, 4.5, 'parked'), box(100, 65, 4.5, 2, 'parked'),
        box(116, 65, 4.5, 2, 'parked'), box(175, -110, 2, 4.5, 'parked'), box(175, -96, 2, 4.5, 'parked'),
      ],
      islands: [[0, 0, 22]],
      spawn: { x: -170, z: 150, yaw: Math.PI },
      course: rounded([[-170, 170], [-170, -170], [60, -170], [60, -60], [0, -60],
        ...[-90, -60, -30, 0, 30, 60, 90].map(a => [31 * Math.cos(a * Math.PI / 180), 31 * Math.sin(a * Math.PI / 180)]),
        [0, 60], [170, 60], [170, 170]],
      [22, 22, 22, 22, 14, 10, 0, 0, 0, 0, 0, 10, 14, 22, 22], true),
    },
    {
      id: 'highway', name: 'The Highway', crew: 'Redline Collective', leader: 'Mach', vibe: 'pure speed, high-angle sweepers',
      color: '#38bdf8', rivalCar: 'ryu', rivalPaint: '#e11d48',
      target: 40000, reward: 16000, bounds: [-312, -242, 312, 242], ground: 'grass', theme: 'highway', barriers: true,
      roads: [
        { w: 20, pts: spline([[-250, -60], [-205, -180], [0, -205], [200, -175], [262, -30], [230, 120], [60, 192], [-120, 172], [-240, 100]], 7, true), closed: true },
        { w: 14, pts: spline([[-40, -203], [-30, -110], [50, -30], [100, 70], [60, 190]], 6, false), closed: false },
      ],
      lots: [], boxes: [], islands: [],
      spawn: { x: -246, z: 40, yaw: Math.PI },
      course: spline([[-250, -60], [-205, -180], [0, -205], [200, -175], [262, -30], [230, 120], [60, 192], [-120, 172], [-240, 100]], 7, true),
    },
    {
      id: 'crown', name: 'The Crown', crew: 'Kaido Zero', leader: 'Zero', vibe: 'the crew that runs the whole city',
      color: '#a855f7', rivalCar: 'raiden', rivalPaint: '#0e0e10',
      target: 52000, reward: 25000, bounds: [-232, -232, 232, 232], ground: 'sidewalk', theme: 'crown',
      roads: [
        loop(17, [[-172, -172], [172, -172], [172, 172], [-172, 172]], 44),
        road(18, [[0, -56], [-28, -100], [10, -138], [0, -172]], false, 18),
        road(14, [[56, 0], [172, 0]], false, 0),
        road(18, [[0, 56], [28, 100], [-10, 138], [0, 172]], false, 18),
        road(14, [[-56, 0], [-172, 0]], false, 0),
        road(11, [[105, -172], [105, -60], [150, -60]], false, 10),
        road(11, [[60, -110], [150, -110]], false, 0),
      ],
      lots: [],
      discs: [[0, 0, 58]],
      boxes: [box(105, -86, 2, 4.5, 'parked'), box(128, -114, 4.5, 2, 'parked')],
      islands: [[0, 0, 15]],
      spawn: { x: -172, z: 110, yaw: Math.PI },
      course: rounded([[-172, 100], [-172, -172], [0, -172], [10, -138], [-28, -100], [0, -56], [-36, -22], [-30, 30], [0, 56], [28, 100], [-10, 138], [0, 172], [-172, 172]],
        [0, 44, 16, 18, 18, 16, 16, 16, 16, 18, 18, 16, 44], true),
    },
  ];
  D.DISTRICT = {};
  D.DISTRICTS.forEach((d, i) => { d.index = i; D.DISTRICT[d.id] = d; });
  D.CREDITS_PER_POINT = { roam: 1 / 20, battle: 1 / 12 };

  // ---------------------------------------------------------------- night meet challenges
  D.CHALLENGES = [
    { id: 'bank', text: 'Bank a single drift worth {n}', n: [2500, 6000, 12000, 20000], stat: 'bestChain', pay: 1 },
    { id: 'manji', text: 'Pull {n} manji switches in one drift', n: [2, 3, 4, 5], stat: 'manjiChain', pay: 1.2 },
    { id: 'near', text: 'Get {n} near-misses in one run', n: [3, 5, 8, 12], stat: 'nearRun', pay: 1 },
    { id: 'link', text: 'Link {n} corners in one chain', n: [2, 3, 5, 7], stat: 'linkChain', pay: 1.1 },
    { id: 'x5', text: 'Hit the x5 multiplier', n: [1, 1, 1, 1], stat: 'maxMult5', pay: 0.8 },
    { id: 'tandem', text: 'Tandem for {n} seconds in Takeover', n: [4, 8, 12, 16], stat: 'tandemRun', pay: 1.3 },
    { id: 'score', text: 'Score {n} in one free roam run', n: [8000, 20000, 45000, 90000], stat: 'roamRun', pay: 1.2 },
  ];

  D.TIPS = [
    'Straighten out cleanly to bank your points. Hit a wall and the drift is gone.',
    'The multiplier grows every couple of seconds you hold a drift, up to x5.',
    'Flick the other way mid-drift for a manji bonus.',
    'Tail close to a wall without touching it for near-miss points.',
    'In Takeover, drift close behind the crew leader for tandem points.',
    'Pro controls pay 20% more points. No assists, all you.',
  ];
})(window.KN);
