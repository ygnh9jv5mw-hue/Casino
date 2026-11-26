/* Kaido Nights: the garage (menus) and the night meet. */
(function (KN) {
  'use strict';
  const U = KN.U, D = KN.DATA;
  const S = KN.Scenes = { cur: null, spin: 0.25, drag: null };
  let G;

  S.init = function (game) {
    G = game;
    buildGarage();
    buildMeet();
    const cv = KN.$('gl');
    cv.addEventListener('pointerdown', e => { if (G.state !== 'drive') S.drag = { x: e.clientX, v: 0 }; });
    window.addEventListener('pointermove', e => { if (S.drag) { const dx = e.clientX - S.drag.x; S.drag.x = e.clientX; S.drag.v = dx * 0.01; S.carYaw += S.drag.v; } });
    window.addEventListener('pointerup', () => { if (S.drag) { S.spin = U.clamp(S.drag.v * 20, -1.5, 1.5) || 0.25; S.drag = null; } });
  };
  S.carYaw = -0.6;

  // ---------------------------------------------------------------- garage
  function neonTube(color, len, horiz) {
    const g = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, len, 8), new THREE.MeshBasicMaterial({ color }));
    if (horiz) g.rotation.z = Math.PI / 2;
    return g;
  }
  function poster(text, sub, bg, fg) {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 360;
    const c = cv.getContext('2d');
    c.fillStyle = bg; c.fillRect(0, 0, 256, 360);
    c.fillStyle = fg; c.font = '900 64px -apple-system, sans-serif'; c.textAlign = 'center'; c.fillText(text, 128, 170);
    c.font = '700 22px -apple-system, sans-serif'; c.globalAlpha = 0.8; c.fillText(sub, 128, 220);
    c.globalAlpha = 0.3; c.fillRect(30, 260, 196, 4);
    return new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.25), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv) }));
  }
  function buildGarage() {
    const s = S.garage = new THREE.Scene();
    s.environment = G.env;
    s.background = new THREE.Color(0x07080d);
    s.fog = new THREE.Fog(0x07080d, 14, 34);
    const T = KN.textures();
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: 0x5c5f66, map: T.concrete, roughness: 0.32, metalness: 0.15, envMapIntensity: 1.4 }));
    floor.material.map.repeat && floor.geometry.attributes.uv.array.forEach((_, i, a) => { a[i] *= 6; });
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; s.add(floor);
    const wallMat = new THREE.MeshLambertMaterial({ color: 0x24262d });
    const back = new THREE.Mesh(new THREE.PlaneGeometry(30, 9), wallMat); back.position.set(0, 4.5, -7); s.add(back);
    const left = new THREE.Mesh(new THREE.PlaneGeometry(20, 9), wallMat); left.rotation.y = Math.PI / 2; left.position.set(-9, 4.5, 0); s.add(left);
    const right = new THREE.Mesh(new THREE.PlaneGeometry(20, 9), wallMat); right.rotation.y = -Math.PI / 2; right.position.set(11, 4.5, 0); s.add(right);
    // roller door with slats
    const door = new THREE.Mesh(new THREE.PlaneGeometry(7, 4.2), new THREE.MeshLambertMaterial({ color: 0x3a3d45, map: T.corrugated }));
    door.position.set(-2, 2.1, -6.95); s.add(door);
    // neon strips
    const pink = neonTube(0xff3ea5, 9, true); pink.position.set(-2, 5.4, -6.9); s.add(pink);
    const cyan = neonTube(0x3ee7ff, 6, false); cyan.position.set(-8.9, 3, -3); s.add(cyan);
    const cyan2 = neonTube(0x3ee7ff, 6, false); cyan2.position.set(-8.9, 3, 3); s.add(cyan2);
    const p1 = poster('街道', 'KAIDO NIGHTS', '#14081f', '#ff3ea5'); p1.position.set(4.5, 3.2, -6.9); s.add(p1);
    const p2 = poster('86', 'ROOKIE CUP', '#0a1a22', '#3ee7ff'); p2.position.set(6.6, 3.2, -6.9); s.add(p2);
    // tool chests + tyre stack
    const chest = new THREE.MeshStandardMaterial({ color: 0xb4232a, roughness: 0.4, metalness: 0.4 });
    for (const [x, z] of [[7.5, -5.6], [8.8, -5.6]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.1, 0.6), chest); b.position.set(x, 0.55, z); b.castShadow = true; s.add(b); }
    const tyreGeo = new THREE.TorusGeometry(0.33, 0.13, 8, 16); tyreGeo.rotateX(Math.PI / 2);
    for (let k = 0; k < 4; k++) { const t = new THREE.Mesh(tyreGeo, new THREE.MeshStandardMaterial({ color: 0x111215, roughness: 0.9 })); t.position.set(-7.6, 0.14 + k * 0.27, -5.4); s.add(t); }
    // turntable
    const tt = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 3.3, 0.08, 48), new THREE.MeshStandardMaterial({ color: 0x1b1c21, roughness: 0.3, metalness: 0.6 }));
    tt.position.y = 0.04; tt.receiveShadow = true; s.add(tt);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.3, 0.03, 6, 64), new THREE.MeshBasicMaterial({ color: 0xff3ea5 })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.09; s.add(ring);
    S.ring = ring;
    // lights
    s.add(new THREE.HemisphereLight(0x8090c0, 0x101015, 0.55));
    const key = new THREE.SpotLight(0xffffff, 1.6, 30, 0.6, 0.5, 1); key.position.set(3, 7, 4); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); s.add(key, key.target);
    const rim = new THREE.PointLight(0xff3ea5, 1.0, 14); rim.position.set(-4, 2.5, -5); s.add(rim);
    const rim2 = new THREE.PointLight(0x3ee7ff, 0.9, 14); rim2.position.set(-7, 2, 3); s.add(rim2);
    S.gLights = { key, rim, rim2 };
    // dim "abandoned" bulb for the intro
    const bulb = new THREE.PointLight(0xffc98a, 0, 12); bulb.position.set(0, 3.6, 0.5); s.add(bulb);
    const bulbMesh = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffd9a0 })); bulbMesh.position.copy(bulb.position); s.add(bulbMesh);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 5, 4), new THREE.MeshBasicMaterial({ color: 0x111111 })); cord.position.set(0, 6.1, 0.5); s.add(cord);
    S.bulb = bulb;
    S.gTurn = new THREE.Group(); s.add(S.gTurn);
  }
  S.setGarageCar = function (carId, look) {
    if (S.gCar) { S.gTurn.remove(S.gCar.group); S.gCar.dispose(); }
    S.gCar = KN.buildCar(carId, look);
    S.gCar.group.traverse(o => { if (o.isMesh) o.castShadow = true; });
    S.gTurn.add(S.gCar.group);
    S.gCarId = carId;
  };
  S.setLook = function (look) { if (S.gCar) S.gCar.setLook(look); };
  // mood: 'dim' for the rusty intro, 'show' for menus
  function lights(mood) {
    S.cur = 'garage'; S.mood = mood || 'show';
    const dim = S.mood === 'dim';
    S.gLights.key.intensity = dim ? 0.35 : 1.6;
    S.gLights.rim.intensity = dim ? 0.15 : 1.0; S.gLights.rim2.intensity = dim ? 0.1 : 0.9;
    S.bulb.intensity = dim ? 1.4 : 0;
    S.ring.visible = !dim;
  }
  S.showGarage = function (mood) {
    lights(mood);
    const s = KN.Save.data;
    if (!S.gCar || S.gCarId !== s.car || S.gRival) { S.setGarageCar(s.car, G.lookOf(KN.Save.car())); S.gRival = false; }
  };
  // the Takeover intro puts the crew leader's car on the turntable
  S.showRival = function (def) {
    lights('show');
    S.setGarageCar(def.rivalCar, { paint: def.rivalPaint, finish: 'gloss', wheels: '#1b1c1f', rust: !!def.rivalRust, kit: {} });
    S.gRival = true;
  };
  // camera framing: looks straight at the car; frameView() then slides the picture into the space right of the menu
  S.frame = { pos: new THREE.Vector3(4.9, 1.95, 6.0), look: new THREE.Vector3(0, 0.5, 0) };
  S.panel = 0; S.viewX = null;
  function frameView(cam, dt) {
    const w = window.innerWidth, h = window.innerHeight;
    if (w < h * 1.15) { if (cam.view && cam.view.enabled) cam.clearViewOffset(); S.viewX = null; return; }
    const panel = U.clamp(S.panel || Math.min(w * 0.5, 440), 0, w * 0.62);
    const want = (panel + w) / 2 - w / 2;
    const prev = S.viewX;
    S.viewX = prev === null ? want : U.lerp(prev, want, U.damp(7, dt));
    if (prev === null || Math.abs(S.viewX - prev) > 0.05 || !cam.view || !cam.view.enabled || cam.view.fullWidth !== w || cam.view.fullHeight !== h) cam.setViewOffset(w, h, -S.viewX, 0, w, h);
  }
  S.resetView = function (cam) { S.viewX = null; cam.clearViewOffset(); };
  S.flash = 0;

  // ---------------------------------------------------------------- night meet
  function buildMeet() {
    const s = S.meet = new THREE.Scene();
    s.environment = G.env;
    s.background = new THREE.Color(0x05060c);
    s.fog = new THREE.FogExp2(0x0b0a1a, 0.02);
    const T = KN.textures();
    const lot = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: 0x7c7f86, map: T.asphalt, roughness: 0.55, metalness: 0.1, envMapIntensity: 1.2 }));
    lot.geometry.attributes.uv.array.forEach((_, i, a) => { a[i] *= 10; });
    lot.rotation.x = -Math.PI / 2; lot.receiveShadow = true; s.add(lot);
    const lines = new KN.MB(false);
    for (let k = -4; k <= 4; k++) { const x = k * 3.4; lines.quad([x - 0.06, 0.02, -9], [x + 0.06, 0.02, -9], [x + 0.06, 0.02, -3.5], [x - 0.06, 0.02, -3.5], [0, 1, 0]); }
    s.add(new THREE.Mesh(lines.geometry(), new THREE.MeshBasicMaterial({ color: 0xd8d2b0, transparent: true, opacity: 0.6 })));
    // building with neon
    const bld = new THREE.Mesh(new THREE.BoxGeometry(46, 14, 4), new THREE.MeshLambertMaterial({ map: T.facadeA.map, emissive: 0xffffff, emissiveMap: T.facadeA.em, emissiveIntensity: 0.7 }));
    bld.position.set(0, 7, -14); s.add(bld);
    const signs = [['KAIDO MEET', '#ff3ea5', -8], ['24H', '#3ee7ff', 7], ['TUNE', '#ffe14a', 14]];
    for (const [txt, col, x] of signs) {
      const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128;
      const c = cv.getContext('2d');
      c.strokeStyle = col; c.shadowColor = col; c.shadowBlur = 24; c.lineWidth = 6; c.strokeRect(10, 10, 492, 108);
      c.fillStyle = '#fff'; c.font = '900 72px -apple-system, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, 256, 68);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(txt.length > 4 ? 9 : 4.4, txt.length > 4 ? 2.25 : 1.1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, blending: THREE.AdditiveBlending }));
      m.position.set(x, 9.5, -11.9); s.add(m);
    }
    // string lights
    const bulbs = [];
    for (let k = 0; k <= 30; k++) { const t = k / 30, x = -20 + t * 40, y = 6.2 - Math.sin(t * Math.PI) * 1.6; bulbs.push(x, y, -2); }
    const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(bulbs, 3));
    s.add(new THREE.Points(bg, new THREE.PointsMaterial({ color: 0xffd38a, size: 0.35, map: T.glow, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
    // crowd silhouettes
    const crowdMat = new THREE.MeshLambertMaterial({ color: 0x0c0d12 });
    const rnd = U.rng(5);
    for (let k = 0; k < 26; k++) {
      const a = -0.8 + rnd() * 1.6, r = 7.5 + rnd() * 3;
      const p = new THREE.Mesh(new THREE.CapsuleGeometry ? new THREE.CapsuleGeometry(0.22, 1.0, 3, 6) : new THREE.CylinderGeometry(0.22, 0.22, 1.5, 6), crowdMat);
      p.position.set(Math.sin(a) * r * 1.5, 0.75, Math.cos(a) * r - 1); s.add(p);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), crowdMat); head.position.set(p.position.x, 1.62, p.position.z); s.add(head);
    }
    // parked meet cars
    S.meetCars = new THREE.Group(); s.add(S.meetCars);
    const ids = ['tsuki', 'ryu', 'kuro', 'raiden', 'tsuki', 'rookie'];
    const paints = ['#ff3e9a', '#3a86ff', '#121316', '#eef1f4', '#8ac926', '#ffc300'];
    ids.forEach((id, k) => {
      const car = KN.buildCar(id, { paint: paints[k], finish: k % 2 ? 'metallic' : 'gloss', wheels: k % 3 ? '#1b1c1f' : '#c9a227' });
      const x = (k - 2.5) * 3.4 + (k >= 3 ? 3.4 : 0);
      car.group.position.set(x, 0, -6.3); car.group.rotation.y = Math.PI + (k % 2 ? 0.08 : -0.08);
      car.group.traverse(o => { if (o.isMesh) o.castShadow = true; });
      S.meetCars.add(car.group);
    });
    s.add(new THREE.HemisphereLight(0x8a7ac0, 0x0c0b12, 0.85));
    const spot = new THREE.SpotLight(0xffffff, 2.0, 30, 0.45, 0.6, 1); spot.position.set(0, 10, 4); spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024);
    s.add(spot, spot.target);
    const pinkL = new THREE.PointLight(0xff3ea5, 1.3, 26); pinkL.position.set(-8, 6, -9); s.add(pinkL);
    const cyanL = new THREE.PointLight(0x3ee7ff, 1.1, 26); cyanL.position.set(8, 6, -9); s.add(cyanL);
    S.meetSpot = new THREE.Group(); s.add(S.meetSpot);
    // camera flashes during show-off
    S.flashes = [];
    for (let k = 0; k < 6; k++) {
      const f = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.glow, color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      f.scale.set(1.4, 1.4, 1); s.add(f); S.flashes.push(f);
    }
  }
  S.showMeet = function () {
    S.cur = 'meet';
    const s = KN.Save.data;
    if (S.mCar) { S.meetSpot.remove(S.mCar.group); S.mCar.dispose(); }
    S.mCar = KN.buildCar(s.car, G.lookOf(KN.Save.car()));
    S.mCar.group.traverse(o => { if (o.isMesh) o.castShadow = true; });
    S.mCar.group.position.set(0, 0, 0.5); S.mCar.group.rotation.y = -0.55;
    S.meetSpot.add(S.mCar.group);
    S.orbit = 0; S.showT = 0;
  };
  S.showOff = function () { S.showT = 3.2; };

  // ---------------------------------------------------------------- per frame
  S.update = function (dt) {
    const cam = G.camera;
    frameView(cam, dt);
    if (S.cur === 'garage') {
      if (!S.drag) S.carYaw += S.spin * dt * (S.mood === 'dim' ? 0.2 : 1), S.spin = U.lerp(S.spin, 0.25, U.damp(0.8, dt));
      S.gTurn.rotation.y = S.carYaw;
      cam.position.lerp(S.frame.pos, U.damp(4, dt));
      cam.lookAt(S.frame.look);
      if (cam.fov !== 42) { cam.fov = 42; cam.updateProjectionMatrix(); }
      if (S.mood === 'dim') S.bulb.intensity = 1.25 + Math.sin(G.time * 13) * 0.08 + (Math.random() < 0.01 ? -0.8 : 0);
      if (S.flash > 0) { S.flash -= dt; S.gLights.key.intensity = (S.mood === 'dim' ? 0.35 : 1.6) + Math.max(0, S.flash) * 6; }
      G.renderer.render(S.garage, cam);
    } else if (S.cur === 'meet') {
      S.orbit += dt * (S.showT > 0 ? 0.9 : 0.12);
      const r = S.showT > 0 ? 6.2 : 7.4;
      cam.position.set(Math.sin(S.orbit + 0.5) * r, S.showT > 0 ? 1.6 : 2.6, Math.cos(S.orbit + 0.5) * r + 0.5);
      cam.lookAt(0, 0.6, 0);
      if (cam.fov !== 50) { cam.fov = 50; cam.updateProjectionMatrix(); }
      if (S.showT > 0) {
        S.showT -= dt;
        for (const f of S.flashes) {
          if (Math.random() < dt * 3) { f.position.set(U.rand(-9, 9), U.rand(1.2, 2.2), U.rand(4, 9)); f.material.opacity = 1; }
          f.material.opacity = Math.max(0, f.material.opacity - dt * 5);
        }
      }
      G.renderer.render(S.meet, cam);
    }
  };
  S.flashGarage = function () { S.flash = 0.5; };
})(window.KN);
