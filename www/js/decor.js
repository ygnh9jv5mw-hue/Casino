/* NO ANTICHEAT: what makes the maps look like places. Sky dome with a sun and blocky clouds,
   per-map lighting and shadows, and decoration that never blocks a bullet: trims, windows,
   lamps, signs, scenery past the walls, and one landmark per map. */
(function (NA) {
  'use strict';
  const U = NA.U;
  const DC = { sky: null, clouds: null, anim: [], water: null };

  // ---------------------------------------------------------------- lighting presets
  const LIGHT = {
    aim_map:   { zen: 0x2f7ad6, hor: 0xc4e2ff, sun: [0.45, 1, 0.3], sunC: 0xfff4e2, sunI: 0.74, hemiS: 0xcfe2ff, hemiG: 0x9a958c, hemiI: 0.87, fog: [50, 140] },
    warehouse: { zen: 0x56779e, hor: 0xd5dee8, sun: [-0.35, 1, 0.5], sunC: 0xfff1dc, sunI: 0.62, hemiS: 0xd9e4f2, hemiG: 0x8a8378, hemiI: 0.94, fog: [40, 120] },
    courtyard: { zen: 0x3a7fd0, hor: 0xf5d7ad, sun: [0.75, 0.62, 0.42], sunC: 0xffdcae, sunI: 0.78, hemiS: 0xbcd4f2, hemiG: 0x9c8a74, hemiI: 0.82, fog: [55, 160] },
    shipyard:  { zen: 0x4f7fb5, hor: 0xd9e3ea, sun: [-0.5, 0.85, -0.35], sunC: 0xfff0d8, sunI: 0.70, hemiS: 0xc9d8e8, hemiG: 0x8a867e, hemiI: 0.87, fog: [50, 150] },
    office:    { zen: 0x4b86c9, hor: 0xdfe8f0, sun: [0.3, 1, 0.55], sunC: 0xfff6ea, sunI: 0.43, hemiS: 0xf2f5fa, hemiG: 0x8a8580, hemiI: 1.05, fog: [40, 120], indoor: true },
    metro:     { zen: 0x1a1f2a, hor: 0x3a4250, sun: [0.2, 1, 0.1], sunC: 0xdfe9ff, sunI: 0.35, hemiS: 0xe6eeff, hemiG: 0x5b5a62, hemiI: 0.82, fog: [30, 95], indoor: true },
    island:    { zen: 0x1677d4, hor: 0xb2e6ff, sun: [0.55, 1, -0.45], sunC: 0xfff3dc, sunI: 0.7, hemiS: 0xc7e6ff, hemiG: 0x9aa37a, hemiI: 0.8, fog: [70, 210] },
  };
  DC.light = id => LIGHT[id] || LIGHT.aim_map;

  // ---------------------------------------------------------------- sky
  function makeSky(scene) {
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { zen: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunC: { value: new THREE.Color(0xfff2d6) }, indoor: { value: 0 } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }',
      fragmentShader: `uniform vec3 zen, hor, sunDir, sunC; uniform float indoor; varying vec3 vP;
        void main(){
          float h = clamp(vP.y, -1.0, 1.0);
          vec3 c = mix(hor, zen, pow(max(h, 0.0), 0.55));
          c = mix(c, hor * 0.82, smoothstep(0.0, -0.25, h));
          float s = max(dot(normalize(vP), normalize(sunDir)), 0.0);
          c += sunC * (pow(s, 900.0) * 3.0 + pow(s, 24.0) * 0.28) * (1.0 - indoor);
          gl_FragColor = vec4(c, 1.0);
        }`,
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(200, 32, 16), mat);
    sky.frustumCulled = false; sky.renderOrder = -10;
    scene.add(sky);
    // chunky clouds, Minecraft style, drifting slowly
    const geos = [], r = (() => { let x = 77; return () => { x = (x * 16807) % 2147483647; return x / 2147483647; }; })();
    for (let i = 0; i < 26; i++) {
      const a = r() * Math.PI * 2, d = 70 + r() * 90, cx = Math.cos(a) * d, cz = Math.sin(a) * d, y = 48 + r() * 18;
      const n = 2 + Math.floor(r() * 4);
      for (let k = 0; k < n; k++) {
        const g = new THREE.BoxGeometry(8 + r() * 14, 2.5 + r() * 2, 6 + r() * 10);
        g.translate(cx + (r() - 0.5) * 16, y + r() * 2, cz + (r() - 0.5) * 12);
        geos.push(g);
      }
    }
    const merged = mergeGeos(geos);
    const clouds = new THREE.Mesh(merged, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92, fog: false }));
    clouds.frustumCulled = false;
    scene.add(clouds);
    return { sky, clouds };
  }
  function mergeGeos(geos) {
    let nv = 0, ni = 0;
    for (const g of geos) { nv += g.attributes.position.count; ni += g.index.count; }
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), idx = new Uint32Array(ni);
    let vo = 0, io = 0;
    for (const g of geos) {
      pos.set(g.attributes.position.array, vo * 3); nor.set(g.attributes.normal.array, vo * 3);
      const s = g.index.array; for (let i = 0; i < s.length; i++) idx[io + i] = s[i] + vo;
      vo += g.attributes.position.count; io += s.length; g.dispose();
    }
    const m = new THREE.BufferGeometry();
    m.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    m.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    m.setIndex(new THREE.BufferAttribute(idx, 1));
    return m;
  }

  // Apply a map's sky, fog and lights. Shadows follow the player (High graphics only).
  DC.apply = function (scene, id, def) {
    const L = DC.light(id), R = NA.R;
    if (!DC.sky) { const s = makeSky(scene); DC.sky = s.sky; DC.clouds = s.clouds; }
    const u = DC.sky.material.uniforms;
    u.zen.value.setHex(L.zen); u.hor.value.setHex(L.hor); u.sunDir.value.set(L.sun[0], L.sun[1], L.sun[2]).normalize(); u.sunC.value.setHex(L.sunC);
    u.indoor.value = L.indoor ? 1 : 0;
    DC.clouds.visible = !L.indoor;
    scene.background = new THREE.Color(L.hor);
    scene.fog = new THREE.Fog(L.hor, L.fog[0], L.fog[1]);
    if (id === 'metro') scene.fog.color.setHex(0x2a303b);
    R.hemi.color.setHex(L.hemiS); R.hemi.groundColor.setHex(L.hemiG); R.hemi.intensity = L.hemiI;
    R.sun.color.setHex(L.sunC); R.sun.intensity = L.sunI;
    DC.sunDir = new THREE.Vector3(L.sun[0], L.sun[1], L.sun[2]).normalize();
    DC.setShadows(NA.Graphics.shadows());
  };
  DC.setShadows = function (on) {
    const R = NA.R, sun = R.sun;
    R.renderer.shadowMap.enabled = on;
    R.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    sun.castShadow = on;
    if (on) {
      const s = 30, cam = sun.shadow.camera;
      sun.shadow.mapSize.set(U.isTouch ? 1024 : 2048, U.isTouch ? 1024 : 2048);
      cam.left = -s; cam.right = s; cam.top = s; cam.bottom = -s; cam.near = 1; cam.far = 140;
      cam.updateProjectionMatrix();
      sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
    }
    const W = NA.World.current;
    if (W) W.group.traverse(o => { if (o.isMesh && !o.userData.noShadow) { o.castShadow = on && !o.userData.noCast; o.receiveShadow = on; } });
    if (NA.Game.bots) for (const b of NA.Game.bots) NA.Avatar.shadows(b.mesh.userData.av, on);
    // materials need recompiling when shadows switch
    if (W) W.group.traverse(o => { if (o.material) o.material.needsUpdate = true; });
  };
  const tv = new THREE.Vector3();
  DC.update = function (dt, t, focus, cam) {
    if (DC.sky && cam) DC.sky.position.copy(cam.position);
    if (DC.clouds && DC.clouds.visible) DC.clouds.rotation.y = t * 0.004;
    const sun = NA.R.sun;
    if (focus && DC.sunDir) {
      // snap the shadow camera to texels so shadows don't shimmer while you move
      const step = 60 / sun.shadow.mapSize.x;
      tv.set(Math.round(focus.x / step) * step, 0, Math.round(focus.z / step) * step);
      sun.target.position.copy(tv);
      sun.position.copy(tv).addScaledVector(DC.sunDir, 70);
    }
    for (const a of DC.anim) a(dt, t);
    DC.waterTick(t);
  };

  // ---------------------------------------------------------------- decoration
  // Decor boxes use the same format as map boxes plus an options object, and never get colliders.
  // { x, z, y, w, h, d, m, ry, rx, rz, uv01, noCast, solid } (solid ones do block movement and bullets)
  const BUILD = {};
  DC.build = function (id, def) {
    DC.anim = [];
    const out = { boxes: [], meshes: [] };
    const add = (m, x, z, y, w, h, d, o) => out.boxes.push(Object.assign({ m, x, z, y, w, h, d }, o || {}));
    if (BUILD[id]) BUILD[id](add, out, def);
    return out;
  };
  // helpers
  function trimWalls(add, def, m, h, t) {
    // a cap along the top of the perimeter walls
    const [w, d] = def.size;
    add(m, 0, -d / 2 - 0.25, h, w + 1.3, 0.25, t); add(m, 0, d / 2 + 0.25, h, w + 1.3, 0.25, t);
    add(m, -w / 2 - 0.25, 0, h, t, 0.25, d + 1.3); add(m, w / 2 + 0.25, 0, h, t, 0.25, d + 1.3);
  }
  function lampPost(add, x, z, h, ry) {
    add('darkMetal', x, z, 0, 0.18, h, 0.18);
    add('darkMetal', x + Math.sin(ry || 0) * 0.5, z + Math.cos(ry || 0) * 0.5, h - 0.1, 0.14, 0.14, 1.1, { ry: ry || 0 });
    add('lamp', x + Math.sin(ry || 0) * 0.95, z + Math.cos(ry || 0) * 0.95, h - 0.3, 0.4, 0.2, 0.4, { noCast: true });
  }
  function skyline(add, cx, cz, count, spread, minH, maxH, seed, keepOut) {
    let s = seed;
    const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < count; i++) {
      const a = r() * Math.PI * 2, d = keepOut + r() * spread;
      const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
      const w = 8 + r() * 14, dd = 8 + r() * 14, h = minH + r() * (maxH - minH);
      add(r() < 0.5 ? 'tower1' : 'tower2', x, z, -1, w, h, dd, { noCast: true });
      if (r() < 0.4) add('roofTop', x, z, h - 1, w * 0.4, 2.5, dd * 0.4, { noCast: true });
    }
  }
  function tree(add, x, z, s) {
    add('trunk', x, z, 0, 0.5 * s, 2.6 * s, 0.5 * s);
    add('leaves', x, z, 2.2 * s, 3 * s, 1.8 * s, 3 * s);
    add('leaves', x, z, 3.8 * s, 2 * s, 1.2 * s, 2 * s);
  }

  // aim map: training facility with target boards and a spinning hologram crosshair
  BUILD.aim_map = function (add, out) {
    trimWalls(add, { size: [32, 20] }, 'devOrange', 4, 0.7);
    for (const x of [-12, -4, 4, 12]) { add('target', x, -9.98, 1.2, 1.4, 1.4, 0.06, { uv01: true }); add('target', x, 9.98, 1.2, 1.4, 1.4, 0.06, { uv01: true, ry: Math.PI }); }
    add('signAim', 0, -9.97, 2.5, 6, 1.1, 0.08, { uv01: true });
    add('signAim', 0, 9.97, 2.5, 6, 1.1, 0.08, { uv01: true, ry: Math.PI });
    // floor markings
    for (const s of [-1, 1]) add('paintY', s * 8, 0, 0.004, 0.12, 0.01, 18, { noCast: true });
    add('paintY', 0, 0, 0.004, 0.12, 0.01, 18, { noCast: true });
    // hologram above the centre block
    const holo = new THREE.Group();
    const hm = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.07, 6, 40), hm);
    const bar1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.7, 0.05), hm), bar2 = bar1.clone(), bar3 = bar1.clone(), bar4 = bar1.clone();
    bar1.position.y = 1.1; bar2.position.y = -1.1; bar3.position.x = 1.1; bar3.rotation.z = Math.PI / 2; bar4.position.x = -1.1; bar4.rotation.z = Math.PI / 2;
    const dot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.05), new THREE.MeshBasicMaterial({ color: 0xf43f5e }));
    holo.add(ring, bar1, bar2, bar3, bar4, dot);
    holo.position.set(0, 3.4, 0);
    holo.userData.noShadow = true;
    holo.traverse(o => { o.userData.noShadow = true; });
    out.meshes.push(holo);
    DC.anim.push((dt, t) => { holo.rotation.y = t * 0.8; holo.position.y = 3.4 + Math.sin(t * 1.6) * 0.15; });
    // a little skyline beyond the walls
    skyline(add, 0, 0, 14, 60, 10, 32, 11, 45);
  };

  // warehouse: roof trusses, hanging lamps, a big sign, a forklift and pallets
  BUILD.warehouse = function (add, out) {
    trimWalls(add, { size: [40, 40] }, 'steel', 6, 0.7);
    for (let x = -16; x <= 16; x += 8) {
      add('steel', x, 0, 7.2, 0.35, 0.45, 41);
      add('steel', x, 0, 6.6, 0.12, 0.6, 41, { noCast: true });
      for (const z of [-12, 0, 12]) { add('darkMetal', x, z, 6.4, 0.05, 0.8, 0.05, { noCast: true }); add('lamp', x, z, 6.15, 0.7, 0.25, 0.7, { noCast: true }); }
    }
    for (const z of [-19.9, 19.9]) for (let x = -18; x <= 18; x += 6) add('steel', x, z, 0, 0.5, 6, 0.3);
    add('signWarehouse', 0, -19.95, 3.6, 12, 1.8, 0.1, { uv01: true });
    add('signWarehouse', 0, 19.95, 3.6, 12, 1.8, 0.1, { uv01: true, ry: Math.PI });
    // stripes on the floor: forklift lanes
    for (const x of [-4, 4]) add('paintY', x, 0, 0.004, 0.15, 0.01, 38, { noCast: true });
    add('paintY', 0, -6.8, 0.004, 30, 0.01, 0.15, { noCast: true }); add('paintY', 0, 6.8, 0.004, 30, 0.01, 0.15, { noCast: true });
    // forklift parked against the wall
    const fx = -17.6, fz = 9;
    add('forklift', fx, fz, 0.25, 1.3, 0.9, 2.1, { solid: true }); add('forklift', fx, fz + 0.3, 1.15, 1.3, 0.12, 1.2);
    add('darkMetal', fx - 0.55, fz - 0.3, 1.15, 0.08, 1.1, 0.08); add('darkMetal', fx + 0.55, fz - 0.3, 1.15, 0.08, 1.1, 0.08);
    add('darkMetal', fx, fz - 1.3, 0, 0.9, 2.6, 0.12); add('darkMetal', fx - 0.3, fz - 1.8, 0.05, 0.12, 0.08, 1); add('darkMetal', fx + 0.3, fz - 1.8, 0.05, 0.12, 0.08, 1);
    for (const [wx, wz] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.7], [0.6, 0.7]]) add('tire', fx + wx, fz + wz, 0, 0.25, 0.5, 0.5);
    // pallets and barrels tucked into corners
    for (const [x, z] of [[18.6, -6], [18.6, -8], [-18.6, -3]]) { add('pallet', x, z, 0, 1.2, 0.15, 1.2); add('barrel', x, z, 0.15, 0.7, 1, 0.7, { solid: true }); }
    skyline(add, 0, 0, 12, 60, 14, 36, 23, 50);
  };

  // courtyard: stone caps, arches, flower boxes, lamps, a golden statue, and a clock tower
  BUILD.courtyard = function (add, out, def) {
    trimWalls(add, def, 'stoneCap', 6, 0.9);
    for (const s of [-1, 1]) {
      add('stoneCap', 0, s * 21, 4, 29, 0.25, 1.0);
      for (const x of [-10.5, -3.5, 3.5, 10.5]) add('stoneCap', x, s * 21, 0, 1.0, 4, 1.0);
      for (let z = -15; z <= 15; z += 6) { add('stoneCap', s * 18, z, 5, 1.3, 0.3, 1.3); add('stoneCap', s * 18, z, 0, 1.25, 0.35, 1.25); }
      for (const x of [-21, 21]) for (const z of [-29.7, 29.7]) add('stoneCap', x, z, 0, 1.4, 6.4, 0.9);
      // windows on the arcade buildings
      for (const x of [-11, -4, 4, 11]) add('window', x, s * 21 + s * 0.31, 2.2, 1.4, 1.2, 0.04, { uv01: true, noCast: true });
      lampPost(add, s * 13, s * -2, 3.6, s > 0 ? -Math.PI / 2 : Math.PI / 2);
      lampPost(add, s * -13, s * 2, 3.6, s > 0 ? Math.PI / 2 : -Math.PI / 2);
      add('flowers', s * 9, -10, 1.1, 5.8, 0.25, 0.8, { noCast: true }); add('flowers', s * 9, 10, 1.1, 5.8, 0.25, 0.8, { noCast: true });
    }
    // fountain basin water + golden statue on the centre column
    add('water', 0, 0, 0.9, 7.2, 0.02, 7.2, { noCast: true });
    const g = 'gold', sy = 3.3;
    add(g, 0, 0, sy, 0.7, 0.9, 0.4); add(g, -0.18, 0, sy - 0.0, 0.25, 0.1, 0.3);
    add(g, 0, 0, sy + 0.9, 0.95, 1.0, 0.5); add(g, 0, 0, sy + 1.9, 0.6, 0.6, 0.6);
    add(g, -0.62, 0, sy + 1.2, 0.3, 1.1, 0.3, { rz: -0.4 }); add(g, 0.7, 0, sy + 1.75, 0.3, 1.1, 0.3, { rz: 0.5 });
    add(g, 1.05, 0, sy + 2.6, 0.5, 0.5, 0.5); // trophy held high
    // clock tower beyond the north wall: tall enough to see from anywhere
    const tz = -42;
    add('brickTower', 0, tz, -1, 7, 26, 7); add('stoneCap', 0, tz, 25, 8, 0.8, 8);
    add('clock', 0, tz + 3.52, 18, 4.2, 4.2, 0.05, { uv01: true, noCast: true });
    add('clock', 0, tz - 3.52, 18, 4.2, 4.2, 0.05, { uv01: true, ry: Math.PI, noCast: true });
    add('roofTile', 0, tz, 25.8, 6, 3, 6); add('roofTile', 0, tz, 28.8, 3.6, 3, 3.6); add('roofTile', 0, tz, 31.8, 1.4, 3, 1.4);
    add('gold', 0, tz, 34.8, 0.3, 2.2, 0.3);
    for (const [x, z] of [[-40, -10], [-44, 14], [40, 12], [44, -16], [-20, 40], [22, 44], [-36, 36], [36, -36]]) tree(add, x, z, 1.6);
    skyline(add, 0, 0, 16, 70, 10, 30, 47, 62);
  };

  // shipyard: crane details with a hanging container, lane paint, bollards, the sea and a cargo ship
  BUILD.shipyard = function (add, out, def) {
    trimWalls(add, def, 'steel', 7, 0.7);
    for (const cx of [-14, 14]) {
      add('crane', cx, -38, 13.2, 19, 0.5, 0.5, { rx: 0 }); // second rail
      add('craneCab', cx + 3, -38, 13.4, 3, 1.6, 2.2);
      add('darkMetal', cx + 3, -38, 9.8, 0.06, 3.6, 0.06, { noCast: true });
      add('contB', cx + 3, -38, 7.2, 6.1, 2.6, 2.5);
      for (const x of [-9, 9]) { add('hazard', cx + x, -38, 0, 1.25, 1.2, 1.25, { solid: true }); }
    }
    // lane paint and bollards
    for (const z of [-24, -12, 0, 12, 24]) add('paintW', 0, z, 0.004, 80, 0.01, 0.2, { noCast: true });
    for (let x = -36; x <= 36; x += 12) add('paintY', x, 0, 0.004, 0.25, 0.01, 76, { noCast: true });
    for (let x = -40; x <= 40; x += 8) add('bollard', x, 41.3, 0, 0.5, 0.8, 0.5, { solid: true });
    // floodlight towers in the corners
    for (const [x, z] of [[-40, -40], [40, 40], [-40, 40], [40, -40]]) {
      add('darkMetal', x, z, 0, 0.4, 12, 0.4, { solid: true }); add('steel', x, z, 12, 2.2, 0.4, 0.6);
      add('lamp', x, z, 11.7, 2, 0.35, 0.5, { noCast: true });
    }
    // the sea past the south wall, with a cargo ship
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(420, 200), waterMat());
    sea.rotation.x = -Math.PI / 2; sea.position.set(0, -0.6, 150); sea.userData.noShadow = true;
    out.meshes.push(sea);
    const sx = 10, sz = 78;
    add('hull', sx, sz, -2, 70, 7, 14); add('hullRed', sx, sz, -2.5, 70.5, 1.2, 14.5);
    add('shipWhite', sx + 26, sz, 5, 12, 9, 12); add('window', sx + 19.95, sz, 11, 0.05, 1.2, 9, { uv01: true, noCast: true });
    add('darkMetal', sx + 28, sz, 14, 1.6, 4, 1.6);
    for (let x = -28; x <= 14; x += 6.5) { add(['contR', 'contB', 'contG', 'contY'][Math.abs(x) % 4 | 0], sx + x, sz - 3, 5, 6.1, 2.6, 2.5); add(['contY', 'contR', 'contB', 'contG'][Math.abs(x) % 4 | 0], sx + x, sz + 3, 5, 6.1, 2.6, 2.5); if (x % 13 === 0) add('contG', sx + x, sz, 7.6, 6.1, 2.6, 2.5); }
    skyline(add, 0, -40, 10, 60, 8, 24, 91, 70);
  };

  // office: ceiling with light panels, windows with a skyline, plants, a reception sign
  BUILD.office = function (add, out, def) {
    const [w, d] = def.size;
    add('ceiling', 0, 0, 4, w + 1, 0.3, d + 1, { noCast: true });
    for (let x = -28; x <= 28; x += 8) for (let z = -20; z <= 20; z += 8) add('lampPanel', x, z, 3.98, 1.6, 0.04, 0.8, { noCast: true });
    // windows all along the outer walls
    for (let x = -28; x <= 28; x += 6) { add('windowCity', x, -d / 2 - 0.02, 1.2, 4.2, 2.2, 0.04, { uv01: true, noCast: true }); add('windowCity', x, d / 2 + 0.02, 1.2, 4.2, 2.2, 0.04, { uv01: true, noCast: true, ry: Math.PI }); }
    for (let z = -18; z <= 18; z += 6) { add('windowCity', -w / 2 - 0.02, z, 1.2, 0.04, 2.2, 4.2, { uv01: true, noCast: true, ry: 0 }); add('windowCity', w / 2 + 0.02, z, 1.2, 0.04, 2.2, 4.2, { uv01: true, noCast: true }); }
    // skirting boards on every interior wall
    for (const x of [-16, 0, 16]) add('skirting', x, 0, 0, 0.56, 0.12, d - 0.2, { noCast: true });
    for (const z of [-8, 8]) add('skirting', 0, z, 0, w - 0.2, 0.12, 0.56, { noCast: true });
    // monitors and chairs on desks, plants in corners
    for (const cx of [-24, -8, 8, 24]) for (const cz of [-16, 0, 16]) {
      for (const [dx, dz] of [[-3, 4], [3, -4]]) {
        add('monitor', cx + dx, cz + dz, 0.8, 0.7, 0.45, 0.06); add('darkMetal', cx + dx, cz + dz + 0.1, 0.8, 0.08, 0.12, 0.08);
        add('chair', cx + dx, cz + dz + (dz > 0 ? 1 : -1), 0, 0.6, 0.5, 0.6); add('chair', cx + dx, cz + dz + (dz > 0 ? 1.28 : -1.28), 0.5, 0.6, 0.6, 0.1);
      }
      add('pot', cx - 6.6, cz + 6.6, 0, 0.6, 0.5, 0.6); add('leaves', cx - 6.6, cz + 6.6, 0.5, 0.9, 1.1, 0.9);
    }
    add('signOffice', 0, -d / 2 + 0.3, 2.5, 7, 1.1, 0.08, { uv01: true, noCast: true });
    add('signOffice', 0, d / 2 - 0.3, 2.5, 7, 1.1, 0.08, { uv01: true, noCast: true, ry: Math.PI });
  };

  // metro: tunnel ceiling with strip lights, detailed trains, platform edge, signs, ads
  BUILD.metro = function (add, out, def) {
    const [w, d] = def.size;
    add('ceilingDark', 0, 0, 6, w + 1, 0.4, d + 1, { noCast: true });
    for (const z of [-10, 10, -3.5, 3.5]) add('lampStrip', 0, z, 5.95, w - 6, 0.06, 0.25, { noCast: true });
    for (const s of [-1, 1]) {
      add('platformEdge', 0, s * 2.45, 0, w, 0.03, 0.4, { noCast: true });
      for (let x = -45; x <= 45; x += 15) add('adPanel', x, s * (d / 2 - 0.02), 1.6, 4, 2.2, 0.06, { uv01: true, noCast: true, ry: s > 0 ? Math.PI : 0 });
      for (const x of [-25, 25]) add('signMetro', x, s * 10, 3.6, 3.4, 0.8, 0.12, { uv01: true, noCast: true, ry: s > 0 ? Math.PI : 0 });
    }
    // trains: windows, doors, stripe, lights
    for (const x of [-38, -19, 0, 19, 38]) {
      for (const s of [-1, 1]) {
        add('trainWin', x, s * 1.62, 1.7, 14.5, 0.9, 0.04, { uv01: true, noCast: true, ry: s > 0 ? 0 : Math.PI });
        add('stripe', x, s * 1.62, 0.9, 16, 0.18, 0.03, { noCast: true });
        for (const dx of [-4.8, 0, 4.8]) add('door', x + dx, s * 1.63, 0.15, 1.3, 2.6, 0.03, { noCast: true });
      }
      add('darkMetal', x, 0, 3.4, 3, 0.4, 1.6); add('darkMetal', x + 5, 0, 3.4, 2, 0.3, 1.2);
    }
    for (const s of [-1, 1]) add('headlight', s * 46, 0, 1.0, 0.04, 0.4, 2.4, { noCast: true });
    add('rail', 0, -0.72, 0.0, w, 0.12, 0.12, { noCast: true }); add('rail', 0, 0.72, 0.0, w, 0.12, 0.12, { noCast: true });
  };

  // island: lighthouse, palm trees, sea, a wooden pier, house details
  BUILD.island = function (add, out, def) {
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), waterMat());
    sea.rotation.x = -Math.PI / 2; sea.position.y = -0.55; sea.userData.noShadow = true;
    out.meshes.push(sea);
    // lighthouse on the north-east coast, outside the rocks
    const lx = 82, lz = -82;
    add('rock', lx, lz, -1, 12, 3.5, 12); add('rock', lx - 4, lz + 5, -1, 7, 2.2, 6);
    for (let i = 0; i < 6; i++) add(i % 2 ? 'paintRedWall' : 'paintWhiteWall', lx, lz, 2.5 + i * 4, 4.2 - i * 0.25, 4, 4.2 - i * 0.25);
    add('darkMetal', lx, lz, 26.5, 3.6, 0.3, 3.6); add('lampBig', lx, lz, 26.8, 2.2, 2.4, 2.2, { noCast: true }); add('roofTile', lx, lz, 29.2, 2.8, 1.6, 2.8);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 3.5, 40, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff3c4, transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
    beam.geometry.translate(0, 20, 0); beam.geometry.rotateZ(Math.PI / 2);
    const pivot = new THREE.Group(); pivot.position.set(lx, 28, lz); pivot.add(beam); pivot.userData.noShadow = true; beam.userData.noShadow = true;
    out.meshes.push(pivot);
    DC.anim.push((dt, t) => { pivot.rotation.y = t * 0.6; });
    // pier
    add('planksDeck', -20, 82, -0.2, 6, 0.3, 26); for (let z = 72; z <= 94; z += 4) { add('trunk', -22.6, z, -2, 0.4, 2.2, 0.4); add('trunk', -17.4, z, -2, 0.4, 2.2, 0.4); }
    // house details: chimneys, door frames, windows
    const houses = [[-35, -35], [35, -35], [-35, 35], [35, 35], [0, -46], [0, 46], [-48, 0], [48, 0]];
    for (const [hx, hz] of houses) {
      add('brick', hx + 3, hz + 2, 3.6, 0.9, 1.6, 0.9);
      add('window', hx - 3, hz - 4.22, 1.3, 1.4, 1.1, 0.04, { uv01: true, noCast: true, ry: Math.PI });
      add('window', hx + 5.22, hz, 1.3, 0.04, 1.1, 1.4, { uv01: true, noCast: true });
      add('roofTile', hx, hz, 3.6, 9, 0.6, 6); add('roofTile', hx, hz, 4.2, 6.5, 0.6, 3.8);
    }
    // palm trees along the beach (outside the grass, inside the rocks)
    for (let i = 0; i < 20; i++) {
      const a = i / 20 * Math.PI * 2 + 0.2, rr = 63;
      const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      if (Math.abs(Math.abs(x) - 60) < 6 && Math.abs(z) < 55) continue; // keep spawn lines clear
      add('palm', x, z, 0, 0.45, 5, 0.45, { rz: 0.12 * Math.sin(i), solid: true });
      for (let k = 0; k < 4; k++) add('palmLeaf', x + Math.cos(k * 1.57) * 1.2, z + Math.sin(k * 1.57) * 1.2, 4.8, k % 2 ? 0.6 : 3, 0.2, k % 2 ? 3 : 0.6, { noCast: false });
    }
  };

  // ---------------------------------------------------------------- water
  let WATER = null;
  function waterMat() {
    if (WATER) return WATER;
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#2b7bb9'; g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 90; i++) { g.fillStyle = i % 3 ? 'rgba(255,255,255,0.18)' : 'rgba(10,40,80,0.25)'; g.fillRect(Math.random() * 128, Math.random() * 128, 6 + Math.random() * 18, 2); }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(60, 30);
    WATER = new THREE.MeshLambertMaterial({ map: t, color: 0xb8e2ff });
    return WATER;
  }
  DC.waterTick = (t) => { if (WATER) WATER.map.offset.set(t * 0.01, t * 0.004); };

  NA.Decor = DC;
})(window.NA);
