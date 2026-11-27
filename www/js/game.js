/* Kaido Nights: renderer, input, the drive loop (free roam, Takeover battles, tutorial), rival AI and camera. */
(function (KN) {
  'use strict';
  const U = KN.U, D = KN.DATA, $ = KN.$;
  const G = KN.Game = { state: 'boot', time: 0, camYaw: 0, shake: 0 };

  // ---------------------------------------------------------------- renderer + reflections
  G.init = function () {
    const q = KN.Save.data.settings.quality;
    const r = G.renderer = new THREE.WebGLRenderer({ canvas: $('gl'), antialias: q === 'high', powerPreference: 'high-performance' });
    // settings.pr: a lower resolution the frame-rate watchdog picked on an earlier run
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, q === 'high' ? 2 : 1.25, KN.Save.data.settings.pr || 9));
    r.shadowMap.enabled = q === 'high';
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    G.camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.3, 2600);
    KN.textures();
    G.env = makeEnv(r);
    const s = G.scene = new THREE.Scene();
    s.environment = G.env;
    G.hemi = new THREE.HemisphereLight(0x6070b0, 0x0e0f16, 0.62);
    G.moon = new THREE.DirectionalLight(0xa9b8ff, 0.5);
    G.moon.position.set(-60, 120, -40);
    G.moon.castShadow = r.shadowMap.enabled;
    G.moon.shadow.mapSize.set(1024, 1024);
    Object.assign(G.moon.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 10, far: 300 });
    G.moon.shadow.bias = -0.0006;
    s.add(G.hemi, G.moon, G.moon.target, new THREE.AmbientLight(0x1a1c2a, 0.6));
    KN.Scenes.init(G);
    G.resize();
    window.addEventListener('resize', G.resize);
    bindInput();
  };
  // frame-rate watchdog: if driving runs slow for a few seconds, drop the render resolution a step (and remember it)
  const PR_STEPS = [2, 1.75, 1.5, 1.25, 1];
  G.perf = { ema: 16.7, slowT: 0, drops: 0 };
  G.watchFrame = function (ms) {
    const P = G.perf, d = G.drive;
    if (G.state !== 'drive' || !d || d.paused || d.finished || document.hidden || d.t < 3) { P.slowT = 0; P.ema = 16.7; return; }   // skip the shader warm-up
    ms = Math.min(100, ms);
    P.ema = U.lerp(P.ema, ms, 0.06);
    P.slowT = P.ema > 23 ? P.slowT + ms / 1000 : Math.max(0, P.slowT - ms / 2000);
    if (P.slowT < 2.5) return;
    P.slowT = 0; P.ema = 16.7;
    const cur = G.renderer.getPixelRatio(), next = PR_STEPS.find(v => v < cur - 0.01);
    if (!next) return;
    G.renderer.setPixelRatio(next); G.resize(); P.drops++;
    KN.Save.data.settings.pr = next; KN.Save.save();
  };
  G.resize = function () {
    const w = window.innerWidth, h = window.innerHeight;
    G.renderer.setSize(w, h, false);
    G.camera.aspect = w / h; G.camera.updateProjectionMatrix();
    if (G.smoke) G.smoke.mat.uniforms.scale.value = h * G.renderer.getPixelRatio() / (2 * Math.tan(G.camera.fov * Math.PI / 360));
  };
  // a small HDR "city" to reflect in paint and puddles
  function makeEnv(renderer) {
    const s = new THREE.Scene();
    s.add(new THREE.Mesh(new THREE.SphereGeometry(60, 24, 12), new THREE.ShaderMaterial({
      side: THREE.BackSide,
      vertexShader: 'varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'varying vec3 vp; void main(){ float h = vp.y; vec3 c = mix(vec3(0.05,0.03,0.07), vec3(0.18,0.08,0.2), smoothstep(-0.2, 0.05, h)); c = mix(c, vec3(0.02,0.03,0.08), smoothstep(0.05, 0.7, h)); gl_FragColor = vec4(c, 1.0); }',
    })));
    const panel = (r, g, b, x, y, z, w, h) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
      m.material.color.setRGB(r, g, b); m.position.set(x, y, z); m.lookAt(0, 0, 0); s.add(m);
    };
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; panel(3.2, 2.2, 1.3, Math.cos(a) * 30, 14 + (i % 3) * 3, Math.sin(a) * 30, 6, 1.2); }
    panel(2.6, 0.5, 1.6, 40, 3, 10, 14, 3); panel(0.4, 2.2, 2.8, -40, 4, -12, 16, 3); panel(2.4, 1.6, 0.4, 10, 2, -42, 12, 2.5);
    panel(1.2, 1.3, 1.8, 0, 50, 0, 30, 30);
    const pm = new THREE.PMREMGenerator(renderer), env = pm.fromScene(s, 0.035).texture;
    pm.dispose();
    return env;
  }

  // ---------------------------------------------------------------- input
  const IN = G.input = { left: 0, right: 0, gas: 0, brake: 0, hand: 0, keys: {}, tilt: 0, tiltOK: false, tiltBase: null, steerSm: 0, roles: new Map() };
  function bindInput() {
    const layer = $('touch');
    const roleFor = e => {
      const t = e.target.closest && e.target.closest('[data-role]');
      if (t) return t.dataset.role;
      const mode = KN.Save.data.settings.controls;
      // tilt with no motion events (blocked, or a desktop browser): steer with the screen halves instead
      if (mode === 'thumb' || (mode === 'tilt' && !IN.tiltOK)) return e.clientX < window.innerWidth / 2 ? 'left' : 'right';
      if (mode === 'tilt') return 'hand';
      return null;
    };
    const recompute = () => {
      const roles = [...IN.roles.values()];
      for (const k of ['left', 'right', 'gas', 'brake', 'hand']) IN[k] = roles.includes(k) ? 1 : 0;
      document.querySelectorAll('#touch [data-role]').forEach(b => b.classList.toggle('on', roles.includes(b.dataset.role)));
      layer.classList.toggle('l-on', !!IN.left); layer.classList.toggle('r-on', !!IN.right);
    };
    layer.addEventListener('pointerdown', e => { KN.Audio.init(); IN.roles.set(e.pointerId, roleFor(e)); try { layer.setPointerCapture(e.pointerId); } catch (_) { /* old webviews */ } recompute(); e.preventDefault(); });
    layer.addEventListener('pointermove', e => {
      const mode = KN.Save.data.settings.controls, held = IN.roles.get(e.pointerId);
      if ((held !== 'left' && held !== 'right') || !(mode === 'thumb' || (mode === 'tilt' && !IN.tiltOK))) return;
      IN.roles.set(e.pointerId, e.clientX < window.innerWidth / 2 ? 'left' : 'right'); recompute();
    });
    for (const t of ['pointerup', 'pointercancel']) layer.addEventListener(t, e => { IN.roles.delete(e.pointerId); recompute(); });
    const KEYS = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'gas', KeyW: 'gas', ArrowDown: 'brake', KeyS: 'brake', Space: 'hand' };
    window.addEventListener('keydown', e => {
      KN.Audio.init();
      if (KEYS[e.code]) { IN.keys[KEYS[e.code]] = 1; e.preventDefault(); }
      if ((e.code === 'Escape' || e.code === 'KeyP') && G.state === 'drive') KN.UI.togglePause();
    });
    window.addEventListener('keyup', e => { if (KEYS[e.code]) IN.keys[KEYS[e.code]] = 0; });
    window.addEventListener('deviceorientation', e => {
      if (e.beta == null) return;
      const ang = (screen.orientation && screen.orientation.angle) || window.orientation || 90;
      const v = (ang === 90 ? 1 : -1) * e.beta;
      IN.tiltOK = true;
      if (IN.tiltBase === null) IN.tiltBase = v;
      IN.tilt = v - IN.tiltBase;
    });
  }
  G.requestTilt = function () {
    IN.tiltBase = null;
    const DOE = window.DeviceOrientationEvent;
    if (DOE && typeof DOE.requestPermission === 'function') return DOE.requestPermission().catch(() => 'denied');
    return Promise.resolve('granted');
  };
  function readInput(dt) {
    const mode = KN.Save.data.settings.controls, k = IN.keys;
    let left = IN.left || k.left, right = IN.right || k.right, gas = IN.gas || k.gas ? 1 : 0, brake = IN.brake || k.brake ? 1 : 0, hand = IN.hand || k.hand ? 1 : 0;
    let target = (right ? 1 : 0) - (left ? 1 : 0), analog = false;
    const pad = navigator.getGamepads ? [...navigator.getGamepads()].find(p => p && p.connected) : null;
    if (pad) {
      const ax = pad.axes[0] || 0;
      if (Math.abs(ax) > 0.12) { target = ax; analog = true; }
      gas = Math.max(gas, pad.buttons[7] ? pad.buttons[7].value : 0);
      brake = Math.max(brake, pad.buttons[6] ? pad.buttons[6].value : 0);
      if ((pad.buttons[0] && pad.buttons[0].pressed) || (pad.buttons[2] && pad.buttons[2].pressed)) hand = 1;
    }
    if (mode === 'tilt' && IN.tiltOK && !left && !right) {
      const span = 24 / (KN.Save.data.settings.tiltSens || 1), v = IN.tilt;
      target = Math.abs(v) < 2.5 ? 0 : U.clamp((v - Math.sign(v) * 2.5) / span, -1, 1); analog = true;
    }
    if (mode === 'thumb' && left && right) { target = 0; brake = 1; }
    IN.steerSm = analog ? U.lerp(IN.steerSm, target, U.damp(14, dt)) : U.approach(IN.steerSm, target, 6.5 * dt);
    return { steer: IN.steerSm, throttle: gas, brake, hand };
  }

  // ---------------------------------------------------------------- driving
  const lookOf = cs => ({ paint: cs.paint, finish: cs.finish, wheels: cs.wheels, rust: cs.rust, kit: cs.kit });
  G.lookOf = lookOf;
  function disposeGroup(g) {
    g.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
    });
  }
  G.clearDrive = function () {
    const s = G.scene;
    if (G.world) { s.remove(G.world.group); disposeGroup(G.world.group); G.world = null; }
    if (G.player) { s.remove(G.player.mesh.group); disposeGroup(G.player.mesh.group); G.player = null; }
    if (G.rival) { s.remove(G.rival.mesh.group); disposeGroup(G.rival.mesh.group); G.rival = null; }
    if (G.smoke) { s.remove(G.smoke.points); G.smoke.points.geometry.dispose(); G.smoke = null; }
    if (G.skids) { s.remove(G.skids.mesh); G.skids.mesh.geometry.dispose(); G.skids = null; }
  };

  G.startDrive = function (districtId, mode) {
    G.clearDrive();
    const save = KN.Save.data, cs = KN.Save.car();
    const world = G.world = KN.World.build(districtId, save.settings.quality);
    G.scene.add(world.group);
    G.scene.fog = new THREE.FogExp2(world.theme.fog, mode === 'battle' ? 0.0024 : 0.0026);
    const ph = new KN.Car(KN.carParams(save.car, cs.parts));
    const mesh = KN.buildCar(save.car, lookOf(cs));
    KN.addHeadlights(mesh, true);
    G.scene.add(mesh.group);
    G.player = { phys: ph, mesh };
    const C = world.course;
    let sx = world.def.spawn.x, sz = world.def.spawn.z, syaw = world.def.spawn.yaw;
    if (mode === 'battle') { const p = C.pts[C.n - 5]; sx = p[0]; sz = p[1]; syaw = C.heading[C.n - 5]; }
    ph.reset(sx, sz, syaw);
    G.smoke = new KN.Smoke(G.scene, 460);
    G.skids = new KN.Skids(G.scene, 2600);
    G.resize();
    const as = KN.ASSISTS[save.settings.controls] || KN.ASSISTS.thumb;
    G.score = new KN.Score({ pay: as.pay, on: (ev, data) => KN.UI.scoreEvent(ev, data) });
    G.drive = {
      mode, def: world.def, t: 0, countdown: mode === 'battle' ? 3.4 : 0.6, progIdx: mode === 'battle' ? C.n - 5 : 0, progress: 0, playerS: 0,
      timeLimit: Math.round(C.len / 13.5 * 1.7), finished: false, paused: false, offT: 0, onCourse: true, tandemT: 0, impacts: 0,
    };
    if (mode === 'battle') G.rival = makeRival(world.def, C);
    G.camYaw = syaw; G.camPos = null;
    KN.Scenes.resetView(G.camera);
    G.state = 'drive';
    KN.UI.showHud(mode);
    KN.Audio.init();
  };

  function courseAt(s) {
    const C = G.world.course, f = ((s / 2) % C.n + C.n) % C.n, i = Math.floor(f), t = f - i, j = (i + 1) % C.n;
    const a = C.pts[i], b = C.pts[j];
    return { x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, h: C.heading[i] + U.wrap(C.heading[j] - C.heading[i]) * t, k: C.curv[i] };
  }
  function makeRival(def, C) {
    const look = { paint: def.rivalPaint, finish: 'gloss', wheels: '#1b1c1f', rust: !!def.rivalRust };
    const mesh = KN.buildCar(def.rivalCar, look);
    KN.addHeadlights(mesh, false);
    G.scene.add(mesh.group);
    const st = { x: 0, z: 0, yaw: 0, steer: 0, speed: 0, r: 0, ax: 0, wheelRot: 0, smoke: 0, brake: 0, hand: 0 };
    return { mesh, s: 14, v: 0, ang: 0, st, def };
  }
  function updateRival(dt) {
    const R = G.rival, d = G.drive, st = R.st;
    if (d.countdown <= 0) {
      let kmax = 0;
      for (let k = 0; k < 16; k++) kmax = Math.max(kmax, Math.abs(courseAt(R.s + k * 2).k));
      let vt = U.clamp(Math.sqrt(8.5 / Math.max(kmax, 0.002)), 12, 30);
      const gap = R.s - d.playerS;
      if (gap > 45) vt *= 0.62; else if (gap > 28) vt *= 0.85; else if (gap < 7) vt *= 1.15;
      R.v = U.approach(R.v, vt, (vt > R.v ? 5.5 : 10) * dt);
      R.s += R.v * dt;
    }
    const c = courseAt(R.s);
    const target = U.clamp(c.k * R.v * R.v * 0.055, -0.9, 0.9);
    R.ang = U.lerp(R.ang, target, U.damp(3.2, dt));
    Object.assign(st, { x: c.x, z: c.z, yaw: c.h + R.ang, speed: R.v, r: c.k * R.v, steer: U.clamp(-R.ang * 0.9, -0.6, 0.6), smoke: Math.abs(R.ang) > 0.2 ? U.clamp(Math.abs(R.ang) * 1.6, 0, 1) : 0 });
    st.wheelRot += R.v * dt / 0.31;
    R.mesh.update(st, dt);
    if (st.smoke > 0.05) emitWheels(st, R.mesh, st.smoke, 'r', R.v);
  }

  function updateProgress() {
    const C = G.world.course, d = G.drive, ph = G.player.phys;
    let best = d.progIdx, bd = 1e12;
    for (let k = -14; k <= 42; k++) {
      const i = ((d.progIdx + k) % C.n + C.n) % C.n, p = C.pts[i], dd = (p[0] - ph.x) ** 2 + (p[1] - ph.z) ** 2;
      if (dd < bd) { bd = dd; best = i; }
    }
    const dist = Math.sqrt(bd);
    let delta = best - d.progIdx;
    if (delta < -C.n / 2) delta += C.n; if (delta > C.n / 2) delta -= C.n;
    if (dist < 32 && delta > 0 && delta < 42) { d.progIdx = best; d.progress += delta; }
    d.playerS = d.progress * 2 + (G.rival ? 0 : 0);
    return dist < 26;
  }

  // rear (and front, when locked) wheel positions: smoke + skid marks
  function emitWheels(st, mesh, k, tag, speed) {
    const s = Math.sin(st.yaw), c = Math.cos(st.yaw), wb = mesh.def.phys.wheelbase / 2, tw = mesh.Wd / 2 - 0.15;
    for (const side of [-1, 1]) {
      const x = st.x - s * wb + c * tw * side, z = st.z - c * wb - s * tw * side;
      if (Math.random() < 0.3 + k * 0.6) G.smoke.emit(x, 0.35, z, (st.vx || s * speed) * 0.3, (st.vz || c * speed) * 0.3, k);
      G.skids.mark(tag + side, x, z, k);
    }
  }

  // beginner modes (auto gas): how fast can we go and still stop before the wall on the arc we're on now?
  function aheadLimit(ph, w, d, dt) {
    const v = ph.speed;
    if (v < 4) { d.vdPrev = null; d.omega = 0; return 99; }
    const vd = Math.atan2(ph.vx, ph.vz);
    if (d.vdPrev != null && dt > 0) d.omega = U.lerp(d.omega || 0, U.clamp(U.wrap(vd - d.vdPrev) / dt, -3, 3), 0.25);
    d.vdPrev = vd;
    const k = U.clamp((d.omega || 0) / v, -0.08, 0.08);   // path curvature, radius >= 12.5 m
    let x = ph.x, z = ph.z, hd = vd, s = 0;
    while (s < 55) {
      const c = w.sdf(x, z) - 1.0;
      if (c < 0.4 && s > 2) break;
      const step = U.clamp(c, 0.8, 6);
      hd += k * step; x += Math.sin(hd) * step; z += Math.cos(hd) * step; s += step;
    }
    let lim = Math.sqrt(2 * 7 * Math.max(0, s - 5));
    // on the course and heading along it: brake for the corners coming up, the way the crew leader does
    const C = w.course;
    let ci = d.ci == null ? 0 : d.ci, bd = 1e12;
    const span = d.ci == null ? C.n : 40;
    for (let k = -span; k <= span; k++) { const i = ((ci + k) % C.n + C.n) % C.n, p = C.pts[i], dd = (p[0] - ph.x) ** 2 + (p[1] - ph.z) ** 2; if (dd < bd) { bd = dd; ci = i; } }
    if (bd > 40 * 40) d.ci = null; else d.ci = ci;
    if (bd < 22 * 22) {
      const along = Math.cos(U.wrap(vd - C.heading[ci]));
      const dir = along > 0.6 ? 1 : along < -0.6 ? -1 : 0;
      for (let k = 1; dir && k <= 45; k++) {
        const kap = Math.abs(C.curv[((ci + dir * k) % C.n + C.n) % C.n]);
        if (kap < 0.012) continue;
        lim = Math.min(lim, Math.sqrt(9 / kap + 2 * 7 * Math.max(0, k * 2 - 4)));
      }
    }
    return Math.max(6, lim);   // never below a crawl, or it can't turn away from a wall
  }
  G.aheadLimit = aheadLimit;

  G.update = function (dt) {
    G.time += dt;
    if (G.state !== 'drive') { KN.Scenes.update(dt); return; }
    const d = G.drive;
    if (!d || d.paused || d.finished) { if (d && !d.finished) render(); return; }
    d.t += dt;
    const P = G.player, ph = P.phys, as = KN.ASSISTS[KN.Save.data.settings.controls] || KN.ASSISTS.thumb;
    let inp = readInput(dt), frozen = false;
    if (d.countdown > 0) {
      // held on the line: no creeping, just revs
      d.countdown -= dt; frozen = true;
      ph.u = ph.w = ph.r = ph.speed = ph.beta = ph.smoke = 0;
      ph.throttle = d.mode === 'battle' ? 0.6 : 0;
      ph.rpm = U.lerp(ph.rpm, d.mode === 'battle' ? 0.3 + 0.45 * Math.max(0, Math.sin(d.t * 6)) : 0.18, U.damp(8, dt));
      if (d.countdown <= 0) KN.UI.go();
    } else {
      if (as.autoGas) inp.vmax = aheadLimit(ph, G.world, d, dt);
      ph.step(dt, inp, as);
    }
    const col = KN.collide(ph, G.world);
    if (col.impact > 2.2) {
      KN.Audio.thud(Math.min(1, col.impact / 12)); KN.Haptics.tap(col.impact > 6 ? 'HEAVY' : 'MEDIUM');
      G.shake = Math.min(1, G.shake + col.impact / 14); d.impacts++;
    }
    // nose-first in a wall: say how to back out, then put the car back on the road
    if (!frozen) {
      d.stuckT = ph.speed < 1.4 && col.near < 0.3 ? (d.stuckT || 0) + dt : 0;
      if (d.stuckT > 1.0 && !d.hinted) { d.hinted = true; KN.UI.toast(KN.Save.data.settings.controls === 'thumb' ? 'Stuck? Hold both sides to reverse' : 'Stuck? Hold BRAKE to reverse'); }
      if (d.stuckT > 3.2) respawn();
    }
    let onCourse = true, tandem = false, noScore = '';
    if (d.mode === 'battle') {
      const before = d.progress;
      onCourse = updateProgress();
      // points only while you're actually making your way round the course (no donuts in a lot beside it)
      d.stallT = d.progress > before ? 0 : (d.stallT || 0) + dt;
      if (!onCourse) noScore = 'OFF COURSE';
      else if (d.stallT > 2.5 && d.countdown <= 0) { onCourse = false; noScore = 'FOLLOW THE COURSE'; }
      updateRival(dt);
      const R = G.rival.st, dx = R.x - ph.x, dz = R.z - ph.z, dist = Math.hypot(dx, dz);
      const behind = dx * Math.sin(R.yaw) + dz * Math.cos(R.yaw) > -2;
      tandem = dist < 15 && behind && Math.abs(G.rival.ang) > 0.18 && G.score.drifting;
      d.rivalDist = dist;
    } else if (d.mode === 'roam') {
      // free roam: circling on the spot doesn't pay, you have to travel
      d.trail = d.trail || []; d.trailT = (d.trailT || 0) + dt;
      if (d.trailT >= 0.5) { d.trailT = 0; d.trail.push([ph.x, ph.z]); if (d.trail.length > 7) d.trail.shift(); }
      if (d.trail.length >= 7 && Math.hypot(ph.x - d.trail[0][0], ph.z - d.trail[0][1]) < 18) { onCourse = false; noScore = 'KEEP MOVING'; }
    }
    d.onCourse = onCourse; d.noScore = noScore;
    G.score.update(dt, ph, { near: col.near, impact: col.impact, onCourse, tandem, frozen });
    // effects
    const st = { x: ph.x, z: ph.z, yaw: ph.yaw, vx: ph.vx, vz: ph.vz };
    if (ph.smoke > 0.04) emitWheels(st, P.mesh, ph.smoke, 'p', ph.speed); else { G.skids.mark('p-1', 0, 0, 0); G.skids.mark('p1', 0, 0, 0); }
    G.smoke.update(dt);
    P.mesh.update(ph, dt);
    KN.Audio.engine(ph.rpm, ph.throttle, true);
    KN.Audio.skid(ph.smoke * U.clamp(ph.speed / 10, 0, 1));
    updateCamera(dt);
    G.moon.position.set(ph.x - 60, 120, ph.z - 40); G.moon.target.position.set(ph.x, 0, ph.z);
    if (G.world.halo) G.world.halo.quaternion.copy(G.camera.quaternion);
    KN.UI.hud(dt);
    if (d.mode === 'battle' && d.countdown <= 0 && (d.progress >= G.world.course.n - 6 || d.t > d.timeLimit)) G.finishDrive(d.progress >= G.world.course.n - 6 ? 'finish' : 'time');
    render();
  };
  function respawn() {
    const d = G.drive, ph = G.player.phys, C = G.world.course;
    let best = d.progIdx;
    if (d.mode !== 'battle') {
      let bd = 1e12;
      for (let i = 0; i < C.n; i++) { const p = C.pts[i], dd = (p[0] - ph.x) ** 2 + (p[1] - ph.z) ** 2; if (dd < bd) { bd = dd; best = i; } }
    }
    let h = C.heading[best];
    if (d.mode !== 'battle' && Math.cos(U.wrap(h - ph.yaw)) < -0.2) h = U.wrap(h + Math.PI);
    ph.reset(C.pts[best][0], C.pts[best][1], h);
    G.camYaw = h; G.camPos = null; d.stuckT = 0;
    G.skids.mark('p-1', 0, 0, 0); G.skids.mark('p1', 0, 0, 0);
    KN.UI.respawned();
  }
  G.respawn = respawn;
  function render() { G.renderer.render(G.scene, G.camera); }
  G.render = render;

  function updateCamera(dt) {
    const ph = G.player.phys, cam = G.camera;
    const vdir = ph.speed > 3 ? Math.atan2(ph.vx, ph.vz) : ph.yaw;
    const target = ph.yaw + U.wrap(vdir - ph.yaw) * 0.62;
    G.camYaw += U.wrap(target - G.camYaw) * U.damp(3.6, dt);
    const dist = 6.6 + ph.speed * 0.045, hgt = 2.45 + ph.speed * 0.018;
    const want = new THREE.Vector3(ph.x - Math.sin(G.camYaw) * dist, hgt, ph.z - Math.cos(G.camYaw) * dist);
    if (!G.camPos) G.camPos = want.clone(); else G.camPos.lerp(want, U.damp(9, dt));
    cam.position.copy(G.camPos);
    if (G.shake > 0) { cam.position.x += U.rand(-1, 1) * G.shake * 0.25; cam.position.y += U.rand(-1, 1) * G.shake * 0.15; G.shake = Math.max(0, G.shake - dt * 2.5); }
    cam.lookAt(ph.x + Math.sin(G.camYaw) * 3.2, 0.95, ph.z + Math.cos(G.camYaw) * 3.2);
    const fov = 60 + Math.min(13, ph.speed * 0.32);
    if (Math.abs(cam.fov - fov) > 0.05) { cam.fov = U.lerp(cam.fov, fov, U.damp(3, dt)); cam.updateProjectionMatrix(); }
  }

  // ---------------------------------------------------------------- results
  G.finishDrive = function (why) {
    const d = G.drive;
    if (!d || d.finished) return;
    if (G.score.active) G.score.bank();
    d.finished = true;
    KN.Audio.engine(0.2, 0, false); KN.Audio.skid(0);
    const save = KN.Save.data, sc = G.score, run = sc.run, def = d.def;
    let credits = 0, win = null, reward = 0;
    const prevBest = save.best[def.id] || 0;
    if (d.mode === 'battle') {
      win = sc.total >= def.target;
      save.attempts[def.id] = (save.attempts[def.id] || 0) + 1;
      save.battleBest[def.id] = Math.max(save.battleBest[def.id] || 0, sc.total);
      credits = Math.min(D.CREDIT_CAP.battle, Math.round(sc.total * D.CREDITS_PER_POINT.battle));
      if (win) { reward = save.taken[def.id] ? Math.round(def.reward * 0.25 / 50) * 50 : def.reward; if (!save.taken[def.id]) save.stats.battlesWon++; save.taken[def.id] = true; }
    } else {
      credits = Math.min(D.CREDIT_CAP.roam, Math.round(sc.total * D.CREDITS_PER_POINT.roam));
      save.best[def.id] = Math.max(save.best[def.id] || 0, sc.total);
    }
    let tutorial = 0;
    if (d.mode === 'tutorial') { tutorial = 800; save.intro.done = true; save.intro.step = 99; }
    const st = save.stats;
    st.runs++; st.drifts += run.drifts; st.bestDrift = Math.max(st.bestDrift, run.bestChain); st.totalPoints += sc.total;
    st.nearMiss += run.near; st.manji += run.manji; st.links += run.links; st.tandem += Math.round(run.tandemRun); st.crashes += run.crashes;
    st.scrapes += run.scrapes; st.playSec += Math.round(d.t);
    const capped = credits >= D.CREDIT_CAP[d.mode === 'battle' ? 'battle' : 'roam'];
    const res = { mode: d.mode, why, def, total: sc.total, credits, capped, reward, tutorial, win, run, target: def.target, time: d.t, prevBest };
    res.challenges = KN.UI.checkChallenges(d.mode, run, sc.total);
    save.credits += credits + reward + tutorial + res.challenges.reduce((a, c) => a + c.pay, 0);
    KN.Save.save();
    G.lastResult = res;
    setTimeout(() => KN.UI.showResults(res), why === 'quit' ? 0 : 700);
  };
  G.exitDrive = function () {
    G.clearDrive();
    G.drive = null;
    G.scene.fog = null;
    G.state = 'menu';
    KN.Audio.engine(0, 0, false); KN.Audio.skid(0);
  };
})(window.KN);
