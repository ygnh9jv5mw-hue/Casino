/* NO ANTICHEAT: the lobby showroom. Your character on a lit stage behind the title screen,
   the main menu, the Item Shop and the Locker. Also renders the shop's item thumbnails. */
(function (NA) {
  'use strict';
  const U = NA.U;
  const SR = { scene: null, camera: null, av: null, spin: 0, spinV: 0, layout: 'menu', look: null, t: 0, preview: null, key: '' };
  const SCREENS = { 'scr-title': 'title', 'scr-name': 'title', 'scr-menu': 'menu', 'scr-items': 'items' };
  const LAYOUT = {
    title: { cx: 0.66, dist: 6.6, ty: 1.12, tx: 0 },
    menu: { cx: 0.62, dist: 5.9, ty: 1.12, tx: 0 },
    items: { cx: 0.25, dist: 5.6, ty: 1.12, tx: 0 },
    gun: { cx: 0.25, dist: 3.7, ty: 1.15, tx: 0.05 },
  };
  const AV = () => NA.Avatar, CS = () => NA.Cosmetics;

  function canvasTex(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    return t;
  }
  const radial = (stops) => canvasTex(128, 128, (g) => {
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    stops.forEach(s => gr.addColorStop(s[0], s[1]));
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  });

  SR.init = function () {
    const scene = new THREE.Scene();
    SR.scene = scene;
    SR.camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.1, 120);
    // sky: dark gradient with two coloured glows behind the stage
    const sky = new THREE.Mesh(new THREE.SphereGeometry(60, 32, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: { top: { value: new THREE.Color(0x04060c) }, bot: { value: new THREE.Color(0x0e1430) }, gA: { value: new THREE.Color(0x1d6fd8) }, gB: { value: new THREE.Color(0xd8326a) }, t: { value: 0 } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform vec3 top, bot, gA, gB; uniform float t; varying vec3 vP;
        void main(){
          float h = vP.y * 0.5 + 0.5;
          vec3 c = mix(bot, top, smoothstep(0.42, 0.85, h));
          float a = max(0.0, dot(vP, normalize(vec3(-0.35, 0.08, -1.0))));
          float b = max(0.0, dot(vP, normalize(vec3(0.55, 0.22, -1.0))));
          c += gA * pow(a, 7.0) * (0.75 + 0.1 * sin(t * 0.7)) + gB * pow(b, 12.0) * 0.55;
          c *= 1.0 - 0.25 * smoothstep(0.3, 0.0, h);
          gl_FragColor = vec4(c, 1.0);
        }`,
    }));
    SR.sky = sky;
    scene.add(sky);
    // floor: a faint grid that fades out
    const floorTex = canvasTex(512, 512, (g, w, h) => {
      const gr = g.createRadialGradient(256, 256, 10, 256, 256, 256);
      gr.addColorStop(0, 'rgba(40,56,100,0.9)'); gr.addColorStop(0.45, 'rgba(22,30,58,0.65)'); gr.addColorStop(1, 'rgba(10,14,30,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'destination-in';
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'source-over';
      g.strokeStyle = 'rgba(120,160,255,0.16)'; g.lineWidth = 2;
      for (let i = 0; i <= 512; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.moveTo(0, i); g.lineTo(512, i); g.stroke(); }
      g.globalCompositeOperation = 'destination-in';
      const m = g.createRadialGradient(256, 256, 40, 256, 256, 256);
      m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = m; g.fillRect(0, 0, w, h);
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), new THREE.MeshBasicMaterial({ map: floorTex, transparent: true, depthWrite: false }));
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
    // stage
    const toon = (c, o) => new THREE.MeshToonMaterial(Object.assign({ color: c, gradientMap: AV().grad() }, o || {}));
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.18, 0.24, 48), toon(0x1a2032));
    ped.position.y = 0.12;
    scene.add(ped);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.98, 0.98, 0.02, 48), toon(0x262f48));
    top.position.y = 0.245;
    scene.add(top);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.06, 0.022, 8, 72), ringMat);
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.24;
    scene.add(ring);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.17, 0.012, 6, 72), new THREE.MeshBasicMaterial({ color: 0xf43f5e }));
    ring2.rotation.x = Math.PI / 2; ring2.position.y = 0.02;
    scene.add(ring2);
    SR.ring = ring;
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), new THREE.MeshBasicMaterial({ map: radial([[0, 'rgba(56,189,248,0.55)'], [0.35, 'rgba(56,189,248,0.18)'], [1, 'rgba(56,189,248,0)']]), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.rotation.x = -Math.PI / 2; glow.position.y = 0.01;
    scene.add(glow);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ map: radial([[0, 'rgba(0,0,0,0.6)'], [0.6, 'rgba(0,0,0,0.25)'], [1, 'rgba(0,0,0,0)']]), transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.258;
    scene.add(shadow);
    // light beams from above
    const beamTex = canvasTex(4, 128, (g) => { const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 4, 128); });
    SR.beams = [];
    [[-1.4, 0x38bdf8, 0.25], [1.6, 0xf472b6, -0.3], [0, 0xffffff, 0]].forEach(([x, c, rz], i) => {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 1.3, 9, 24, 1, true), new THREE.MeshBasicMaterial({ map: beamTex, color: c, transparent: true, opacity: i === 2 ? 0.06 : 0.09, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
      b.position.set(x, 4.6, -0.4 - Math.abs(x) * 0.3); b.rotation.z = rz;
      scene.add(b); SR.beams.push(b);
    });
    // giant faded wordmark far behind
    const word = canvasTex(1024, 192, (g, w, h) => {
      g.font = '900 150px Impact, "Arial Black", sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = 3; g.strokeStyle = 'rgba(140,170,255,0.13)';
      g.strokeText('NO ANTICHEAT', w / 2, h / 2 + 6);
      g.fillStyle = 'rgba(80,110,200,0.06)'; g.fillText('NO ANTICHEAT', w / 2, h / 2 + 6);
    });
    const wm = new THREE.Mesh(new THREE.PlaneGeometry(24, 4.5), new THREE.MeshBasicMaterial({ map: word, transparent: true, depthWrite: false }));
    wm.position.set(-1.5, 3.4, -12);
    scene.add(wm);
    // floating dust
    const N = 140, pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    const pal = [new THREE.Color(0x7dd3fc), new THREE.Color(0xf9a8d4), new THREE.Color(0xffffff)];
    for (let i = 0; i < N; i++) {
      pos[i * 3] = U.rand(-7, 7); pos[i * 3 + 1] = U.rand(0, 6.5); pos[i * 3 + 2] = U.rand(-8, 3);
      const c = pal[i % 3]; col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    pg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    SR.dust = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.07, map: radial([[0, 'rgba(255,255,255,1)'], [0.4, 'rgba(255,255,255,0.5)'], [1, 'rgba(255,255,255,0)']]), vertexColors: true, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
    scene.add(SR.dust);
    // lights: soft fill, warm key, cyan and pink rims
    scene.add(new THREE.HemisphereLight(0xa9bcff, 0x1a1024, 0.55));
    const key = new THREE.DirectionalLight(0xfff1e0, 0.95); key.position.set(2.5, 4, 5); scene.add(key);
    const rimA = new THREE.DirectionalLight(0x38bdf8, 0.8); rimA.position.set(-4, 3, -3); scene.add(rimA);
    const rimB = new THREE.DirectionalLight(0xf472b6, 0.55); rimB.position.set(4, 2.5, -3); scene.add(rimB);
    // the character
    SR.holder = new THREE.Group();
    SR.holder.position.y = 0.255;
    scene.add(SR.holder);
    // a tiny particle pool for purchases and kill-effect previews
    SR.parts = [];
    const pgeo = new THREE.BoxGeometry(0.07, 0.07, 0.07);
    for (let i = 0; i < 70; i++) {
      const m = new THREE.Mesh(pgeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
      m.visible = false; scene.add(m);
      SR.parts.push({ m, v: new THREE.Vector3(), t: 0, life: 1, g: 9 });
    }
    SR.pi = 0;
    SR.cur = Object.assign({}, LAYOUT.menu);
    SR.refresh();
    SR.resize(innerWidth, innerHeight);
  };

  // what the character should be wearing right now (equipped, or the item being previewed)
  function look() {
    const C = CS(), p = SR.preview;
    const o = { outfit: C.equipped('outfit'), gunskin: C.equipped('gunskin'), knife: C.equipped('knife'), killfx: C.equipped('killfx'), holdKnife: false };
    if (p) { o[p.kind] = p.id; if (p.kind === 'knife') o.holdKnife = true; }
    return o;
  }
  function primaryCls() {
    const s = NA.Save.data, id = s.loadout && s.loadout.primary;
    const w = id && NA.DATA.WEAPONS[id];
    return w ? w.cls : 'rifle';
  }
  SR.refresh = function () {
    if (!SR.scene) return;
    const L = look(), C = CS();
    const key = L.outfit;
    if (!SR.av || SR.key !== key) {
      if (SR.av) { SR.holder.remove(SR.av.root); AV().dispose(SR.av); }
      SR.av = AV().build(C.get('outfit', L.outfit).outfit, { cls: primaryCls() });
      SR.av.chams.visible = false;
      SR.holder.add(SR.av.root);
      SR.key = key;
    }
    const cls = primaryCls();
    if (L.holdKnife) AV().setGun(SR.av, 'knife', AV().gunMat(), knifeGeo(L.knife));
    else if (L.gunskin === 'factory') AV().setGun(SR.av, cls, AV().gunMat(), AV().mountGun(cls, false));
    else AV().setGun(SR.av, cls, C.gunMaterial(L.gunskin, 'vc'), AV().mountGun(cls, true));
    SR.look = L;
    SR.fxKind = SR.preview && SR.preview.kind === 'killfx' ? SR.preview.id : null;
  };
  const kgCache = {};
  function knifeGeo(id) {
    if (!kgCache[id]) { const g = CS().knifeGeometry(id).clone(); g.scale(2.4, 2.4, 2.4); g.rotateX(-Math.PI / 2); kgCache[id] = g; }
    return kgCache[id];
  }
  SR.setPreview = function (kind, id) {
    SR.preview = kind ? { kind, id } : null;
    SR.refresh();
    SR.fxT = 0;
  };
  SR.celebrate = function () {
    SR.hypeT = 0.001;
    burst(['#facc15', '#f472b6', '#38bdf8', '#4ade80', '#ffffff'].map(c => new THREE.Color(c).getHex()), 40, 9, 1.4);
  };
  SR.spinBy = function (dx) { SR.spinV = 0; SR.spin += dx; SR.dragT = performance.now(); };
  SR.fling = function (v) { SR.spinV = v; };

  function burst(cols, n, grav, life, rise) {
    const c = SR.holder.position;
    for (let i = 0; i < n; i++) {
      const p = SR.parts[SR.pi++ % SR.parts.length];
      p.m.position.set(c.x + U.rand(-0.4, 0.4), c.y + U.rand(0.3, 1.8), c.z + U.rand(-0.4, 0.4));
      p.m.material.color.setHex(U.pick(cols));
      p.v.set(U.rand(-2.5, 2.5), rise ? U.rand(0.8, 2.4) : U.rand(2, 6), U.rand(-2.5, 2.5));
      p.t = 0; p.life = life * U.rand(0.7, 1.2); p.g = grav; p.m.visible = true;
    }
  }
  const FXP = {
    default: () => burst([0xf1c9a5, 0xef4444, 0x60a5fa], 14, 12, 0.9),
    confetti: () => burst([0xf43f5e, 0xfacc15, 0x4ade80, 0x22d3ee, 0xa855f7], 34, 9, 1.5),
    pixels: () => burst([0x4ade80, 0x22c55e, 0x86efac], 30, -1.5, 1.2, true),
    flames: () => burst([0xf97316, 0xfacc15, 0xef4444, 0x1f2937], 30, -3, 0.8, true),
    hearts: () => burst([0xf472b6, 0xec4899, 0xfda4af], 22, -0.6, 1.5, true),
    lightning: () => { burst([0xffffff, 0xbfdbfe, 0x60a5fa], 26, 6, 0.6); SR.flashT = 0.25; },
  };

  SR.wants = function () {
    const s = document.body.dataset.screen;
    return !!SCREENS[s] && NA.Game.state !== 'playing';
  };
  SR.resize = function (w, h) {
    if (!SR.camera) return;
    SR.w = w; SR.h = h;
    SR.camera.aspect = w / h;
    SR.camera.updateProjectionMatrix();
  };
  SR.update = function (dt) {
    if (!SR.av) return;
    SR.t += dt;
    const t = SR.t, s = document.body.dataset.screen;
    let lay = SCREENS[s] || 'menu';
    if (lay === 'items' && SR.preview && SR.preview.kind === 'gunskin') lay = 'gun';
    const L = LAYOUT[lay], cur = SR.cur, k = Math.min(1, dt * 5);
    for (const key of ['cx', 'dist', 'ty', 'tx']) cur[key] = U.lerp(cur[key], L[key], k);
    // spin: drag to rotate, it drifts back to a 3/4 view when you let go
    if (!SR.dragT || performance.now() - SR.dragT > 1800) SR.spin = U.lerp(SR.spin, 0, Math.min(1, dt * 1.5));
    SR.spin += SR.spinV * dt; SR.spinV *= Math.pow(0.04, dt);
    const base = Math.PI - 0.42 + Math.sin(t * 0.25) * 0.08;
    SR.holder.rotation.y = base + SR.spin + (lay === 'gun' ? 1.1 : 0);
    // camera
    const cam = SR.camera, sway = Math.sin(t * 0.15) * 0.25;
    cam.position.set(cur.tx + sway, cur.ty + 0.45 + Math.sin(t * 0.21) * 0.06, cur.dist);
    cam.lookAt(cur.tx, cur.ty, 0);
    cam.setViewOffset(SR.w, SR.h, (0.5 - cur.cx) * SR.w, 0, SR.w, SR.h);
    // character: idle stance, inspects the gun every few seconds, jumps for joy after a purchase
    const cyc = t % 9.5, ins = cyc > 6.5 && cyc < 9 ? Math.sin((cyc - 6.5) / 2.5 * Math.PI) : 0;
    let hype = 0;
    if (SR.hypeT) { SR.hypeT += dt * 1.6; hype = SR.hypeT; if (SR.hypeT >= 1) SR.hypeT = 0; }
    AV().animate(SR.av, { pose: 'ready', inspect: Math.min(1, ins * 1.4), hype }, dt);
    // scenery
    SR.sky.material.uniforms.t.value = t;
    SR.ring.material.color.setHSL(0.55 + Math.sin(t * 0.5) * 0.03, 0.9, 0.6 + Math.sin(t * 2) * 0.05);
    SR.beams.forEach((b, i) => { b.material.opacity = (i === 2 ? 0.05 : 0.08) + Math.sin(t * 0.8 + i * 2) * 0.02; });
    const pa = SR.dust.geometry.attributes.position;
    for (let i = 0; i < pa.count; i++) {
      let y = pa.getY(i) + dt * (0.12 + (i % 5) * 0.04);
      if (y > 6.5) y = 0;
      pa.setY(i, y);
      pa.setX(i, pa.getX(i) + Math.sin(t * 0.5 + i) * dt * 0.05);
    }
    pa.needsUpdate = true;
    // kill-effect preview loops
    if (SR.fxKind) { SR.fxT = (SR.fxT || 0) - dt; if (SR.fxT <= 0) { (FXP[SR.fxKind] || FXP.default)(); SR.fxT = 1.8; } }
    for (const p of SR.parts) {
      if (!p.m.visible) continue;
      p.t += dt; p.v.y -= p.g * dt;
      p.m.position.addScaledVector(p.v, dt);
      if (p.m.position.y < 0.26 && Math.hypot(p.m.position.x, p.m.position.z) < 1) { p.m.position.y = 0.26; p.v.y *= -0.3; p.v.x *= 0.6; p.v.z *= 0.6; }
      p.m.rotation.x += dt * 5; p.m.rotation.y += dt * 3;
      if (p.t > p.life) p.m.visible = false;
    }
    if (SR.flashT > 0) { SR.flashT -= dt; SR.sky.material.uniforms.bot.value.setHex(SR.flashT > 0.12 ? 0x9fb7ff : 0x0e1430); }
  };
  SR.render = function (renderer) {
    renderer.render(SR.scene, SR.camera);
  };

  // ---------------------------------------------------------------- thumbnails for the shop cards
  // Rendered once per session into a small render target and turned into image URLs.
  const thumbs = {};
  let TS = null;
  function thumbStage() {
    if (TS) return TS;
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xdfe6ff, 0x2a2440, 0.75));
    const key = new THREE.DirectionalLight(0xffffff, 0.9); key.position.set(2, 3, 4); scene.add(key);
    const rim = new THREE.DirectionalLight(0x9fd8ff, 0.6); rim.position.set(-3, 2, -3); scene.add(rim);
    const cam = new THREE.PerspectiveCamera(26, 3 / 4, 0.05, 50);
    const rt = new THREE.WebGLRenderTarget(192, 256);
    TS = { scene, cam, rt, buf: new Uint8Array(192 * 256 * 4), canvas: document.createElement('canvas') };
    TS.canvas.width = 192; TS.canvas.height = 256;
    return TS;
  }
  function snap(obj, camPos, target) {
    const R = NA.R.renderer, S = thumbStage();
    S.scene.add(obj);
    S.cam.position.copy(camPos); S.cam.lookAt(target);
    const oc = R.getClearColor(new THREE.Color()), oa = R.getClearAlpha();
    R.setRenderTarget(S.rt);
    R.setClearColor(0x000000, 0);
    R.clear();
    R.render(S.scene, S.cam);
    R.readRenderTargetPixels(S.rt, 0, 0, 192, 256, S.buf);
    R.setRenderTarget(null);
    R.setClearColor(oc, oa);
    S.scene.remove(obj);
    const g = S.canvas.getContext('2d'), img = g.createImageData(192, 256);
    for (let y = 0; y < 256; y++) img.data.set(S.buf.subarray((255 - y) * 192 * 4, (256 - y) * 192 * 4), y * 192 * 4);
    g.putImageData(img, 0, 0);
    return S.canvas.toDataURL('image/png');
  }
  SR.thumb = function (kind, id) {
    const key = kind + ':' + id;
    if (thumbs[key]) return thumbs[key];
    const C = CS();
    let url = null;
    if (kind === 'outfit') {
      const av = AV().build(C.get('outfit', id).outfit, { cls: 'rifle' });
      av.chams.visible = false;
      av.root.rotation.y = Math.PI - 0.45;
      AV().animate(av, { pose: 'ready' }, 0.016);
      av.root.updateMatrixWorld(true);
      url = snap(av.root, new THREE.Vector3(0.2, 1.25, 5.3), new THREE.Vector3(0, 1.0, 0));
      AV().dispose(av);
    } else if (kind === 'gunskin' || kind === 'knife') {
      // centre the model and scale it to fit the card diagonally
      const geo = kind === 'knife' ? C.knifeGeometry(id) : AV().gunGeo('rifle', id === 'factory' ? null : [0xffffff, 0x30343b, 0xe8822e, 0xd1d5db]);
      const mat = kind === 'knife' ? AV().toon() : C.gunMaterial(id, 'vc');
      if (kind === 'knife' && C.get('knife', id).glow) mat.emissive.setHex(0x0e4f5c);
      geo.computeBoundingBox();
      const bb = geo.boundingBox, size = bb.getSize(new THREE.Vector3());
      const inner = new THREE.Mesh(geo, mat);
      inner.position.copy(bb.getCenter(new THREE.Vector3())).multiplyScalar(-1);
      const g = new THREE.Group();
      g.add(inner);
      g.rotation.set(0, Math.PI / 2, 0.95);
      g.scale.setScalar(1.22 / Math.max(size.x, size.y, size.z));
      url = snap(g, new THREE.Vector3(0, 0, 2.4), new THREE.Vector3(0, 0, 0));
      if (kind === 'knife') mat.dispose(); else geo.dispose();
    } else {
      url = fxIcon(id);
    }
    thumbs[key] = url;
    return url;
  };
  // kill effects get a drawn icon: a burst in that effect's colours
  function fxIcon(id) {
    const cols = { default: ['#f1c9a5', '#ef4444', '#60a5fa'], confetti: ['#f43f5e', '#facc15', '#4ade80', '#22d3ee', '#a855f7'], pixels: ['#4ade80', '#22c55e', '#86efac'], flames: ['#f97316', '#facc15', '#ef4444'], hearts: ['#f472b6', '#ec4899', '#fda4af'], lightning: ['#ffffff', '#bfdbfe', '#60a5fa'] }[id] || ['#fff'];
    const c = document.createElement('canvas'); c.width = 192; c.height = 256;
    const g = c.getContext('2d');
    let x = id.length * 7919;
    const r = () => { x = (x * 1103515245 + 12345) & 0x7fffffff; return x / 0x7fffffff; };
    if (id === 'lightning') {
      g.strokeStyle = '#e0f2fe'; g.lineWidth = 7; g.shadowColor = '#60a5fa'; g.shadowBlur = 18;
      g.beginPath(); g.moveTo(110, 20); g.lineTo(80, 110); g.lineTo(112, 112); g.lineTo(78, 220); g.stroke();
    }
    for (let i = 0; i < 46; i++) {
      const a = r() * Math.PI * 2, d = 18 + r() * 70, s = 6 + r() * 12;
      g.save(); g.translate(96 + Math.cos(a) * d, 132 + Math.sin(a) * d * (id === 'flames' || id === 'pixels' || id === 'hearts' ? 1.25 : 1) - (id === 'flames' || id === 'pixels' || id === 'hearts' ? 20 : 0));
      g.rotate(r() * 3); g.fillStyle = cols[i % cols.length]; g.globalAlpha = 0.65 + r() * 0.35;
      if (id === 'hearts') { g.font = `${s * 2}px sans-serif`; g.fillText('♥', -s / 2, s / 2); } else g.fillRect(-s / 2, -s / 2, s, s);
      g.restore();
    }
    return c.toDataURL('image/png');
  }

  // ---------------------------------------------------------------- map pictures for the menus
  // Each map is built off-screen with its own lighting, a few players are posed in front of the
  // camera, and the frame is saved as a JPEG (cached between launches).
  const ART_VER = 'na_art_v9_';
  const SHOTS = {
    aim_map: [[-15, 5, 8.5], [4, 0.8, -2]], warehouse: [[-17, 5.2, 17], [2, 1.4, -3]], courtyard: [[-26, 8, 24], [0, 4, -12]],
    shipyard: [[-36, 11, 30], [0, 5, -20]], office: [[-29, 3.1, -21], [2, 1, 2]], metro: [[-46, 4.4, -14], [0, 1.6, 3]],
    island: [[-58, 20, 52], [24, 4, -26]], servers: [[-26, 4.1, 17], [2, 1.6, -4]], lancafe: [[-18.4, 2.85, 12.4], [4, 1.1, -3]],
    arena: [[-31, 6.5, 21], [0, 4, 0]],
  };
  const artMem = {};
  let AS = null, artQueue = [], artBusy = false;
  function artStage() {
    if (AS) return AS;
    const scene = new THREE.Scene();
    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8), sun = new THREE.DirectionalLight(0xffffff, 0.8);
    scene.add(hemi, sun, sun.target);
    const cam = new THREE.PerspectiveCamera(55, 16 / 9, 0.1, 400);
    const rt = new THREE.WebGLRenderTarget(400, 225);
    AS = { scene, hemi, sun, cam, rt, buf: new Uint8Array(400 * 225 * 4), canvas: document.createElement('canvas') };
    AS.canvas.width = 400; AS.canvas.height = 225;
    return AS;
  }
  function skyTex(zen, hor) {
    return canvasTex(4, 128, (g) => { const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, '#' + new THREE.Color(zen).getHexString()); gr.addColorStop(0.75, '#' + new THREE.Color(hor).getHexString()); gr.addColorStop(1, '#' + new THREE.Color(hor).getHexString()); g.fillStyle = gr; g.fillRect(0, 0, 4, 128); });
  }
  function renderMapArt(id) {
    const R = NA.R.renderer, S = artStage(), L = NA.Decor.light(id), def = NA.DATA.MAPS[id];
    S.hemi.color.setHex(L.hemiS); S.hemi.groundColor.setHex(L.hemiG); S.hemi.intensity = L.hemiI;
    S.sun.color.setHex(L.sunC); S.sun.intensity = L.sunI; S.sun.position.set(L.sun[0], L.sun[1], L.sun[2]).multiplyScalar(50);
    const sky = L.indoor ? null : skyTex(L.zen, L.hor);
    S.scene.background = sky || new THREE.Color(L.fogC || L.hor);
    S.scene.fog = new THREE.Fog(L.fogC || L.hor, L.fog[0] * 1.4, L.fog[1] * 1.6);
    const { group, colliders } = NA.World.previewGroup(id);
    S.scene.add(group);
    const shot = SHOTS[id] || [[-def.size[0] * 0.4, 8, def.size[1] * 0.4], [0, 1, 0]];
    S.cam.position.set(shot[0][0], shot[0][1], shot[0][2]);
    S.cam.lookAt(shot[1][0], shot[1][1], shot[1][2]);
    // pose a few players in front of the camera, avoiding anything solid
    const avs = [], dir = new THREE.Vector3(shot[1][0] - shot[0][0], 0, shot[1][2] - shot[0][2]).normalize(), side = new THREE.Vector3(-dir.z, 0, dir.x);
    const blocked = (x, z) => colliders.some(c => c.maxY > 0.4 && c.minY < 2 && x + 0.5 > c.minX && x - 0.5 < c.maxX && z + 0.5 > c.minZ && z - 0.5 < c.maxZ);
    const cols = [0x2563eb, 0xdc2626, 0x16a34a, 0xf59e0b, 0x7c3aed];
    [[7.5, -1.8], [9.5, 1.6], [12.5, -0.2], [15, 3]].forEach(([dist, off], i) => {
      for (const tweak of [0, 1.2, -1.2, 2.4]) {
        const x = shot[0][0] + dir.x * dist + side.x * (off + tweak), z = shot[0][2] + dir.z * dist + side.z * (off + tweak);
        if (Math.abs(x) > def.size[0] / 2 - 1 || Math.abs(z) > def.size[1] / 2 - 1 || blocked(x, z)) continue;
        const outfit = i === 0 ? CS().outfit() : AV().botOutfit(cols[i % cols.length], '');
        const av = AV().build(outfit, { cls: ['rifle', 'smg', 'sniper', 'shotgun'][i % 4] });
        av.chams.visible = false;
        av.root.position.set(x, 0, z);
        av.root.rotation.y = Math.atan2(shot[0][0] - x, shot[0][2] - z) + Math.PI + (i % 2 ? 0.5 : -0.4);
        AV().animate(av, { pose: 'ready' }, 0.016);
        S.scene.add(av.root); avs.push(av);
        break;
      }
    });
    S.scene.updateMatrixWorld(true);
    const oc = R.getClearColor(new THREE.Color()), oa = R.getClearAlpha();
    R.setRenderTarget(S.rt);
    R.setClearColor(0x000000, 1);
    R.clear();
    R.render(S.scene, S.cam);
    R.readRenderTargetPixels(S.rt, 0, 0, 400, 225, S.buf);
    R.setRenderTarget(null);
    R.setClearColor(oc, oa);
    S.scene.remove(group);
    group.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    for (const av of avs) { S.scene.remove(av.root); AV().dispose(av); }
    if (sky) sky.dispose();
    const g = S.canvas.getContext('2d'), img = g.createImageData(400, 225);
    for (let y = 0; y < 225; y++) img.data.set(S.buf.subarray((224 - y) * 400 * 4, (225 - y) * 400 * 4), y * 400 * 4);
    g.putImageData(img, 0, 0);
    return S.canvas.toDataURL('image/jpeg', 0.84);
  }
  // returns the picture if it is ready, otherwise queues it and calls SR.onArt when done
  SR.mapArt = function (id) {
    if (artMem[id]) return artMem[id];
    try { const c = localStorage.getItem(ART_VER + id); if (c) { artMem[id] = c; return c; } } catch (e) { /* storage blocked */ }
    if (artQueue.indexOf(id) < 0) artQueue.push(id);
    pumpArt();
    return null;
  };
  function pumpArt() {
    if (artBusy || !artQueue.length) return;
    artBusy = true;
    setTimeout(() => {
      // never while playing: rendering a whole map would hitch the frame rate
      if (NA.Game.state === 'playing' || NA.Game.state === 'lobby') { artBusy = false; setTimeout(pumpArt, 1500); return; }
      const id = artQueue.shift();
      try {
        const url = renderMapArt(id);
        artMem[id] = url;
        try { localStorage.setItem(ART_VER + id, url); } catch (e) { /* full */ }
        if (SR.onArt) SR.onArt(id, url);
      } catch (e) { console.warn('map art failed', id, e); }
      artBusy = false;
      if (artQueue.length) setTimeout(pumpArt, 220);
    }, 60);
  }
  // ---------------------------------------------------------------- tile pictures (drawn)
  // Promise-based: the cheats and comms pictures draw other rendered images into themselves.
  const tileMem = {};
  const loadImg = url => new Promise(res => { if (!url) { res(null); return; } const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = url; });
  SR.tileArt = async function (kind) {
    if (tileMem[kind]) return tileMem[kind];
    const c = document.createElement('canvas'); c.width = 240; c.height = 135;
    const g = c.getContext('2d');
    if (kind === 'cheats') {
      // a "wallhack" view: a player behind a wall with an ESP box, health bar and snapline
      const gr = g.createLinearGradient(0, 0, 0, 135); gr.addColorStop(0, '#2e1065'); gr.addColorStop(1, '#0b0718'); g.fillStyle = gr; g.fillRect(0, 0, 240, 135);
      g.fillStyle = 'rgba(255,255,255,0.05)'; for (let x = 0; x < 240; x += 16) g.fillRect(x, 0, 1, 135); for (let y = 0; y < 135; y += 16) g.fillRect(0, y, 240, 1);
      const im = await loadImg(SR.thumb('outfit', 'tactical'));
      if (im) { g.globalAlpha = 0.9; g.drawImage(im, 118, 4, 98, 131); g.globalAlpha = 1; }
      g.strokeStyle = '#f43f5e'; g.lineWidth = 2.5; g.strokeRect(140, 16, 56, 112);
      g.fillStyle = '#22c55e'; g.fillRect(132, 16, 4, 112); g.fillStyle = '#fda4af'; g.font = 'bold 11px sans-serif'; g.fillText('BOT_Kevin · 12m', 128, 11);
      g.strokeStyle = 'rgba(244,63,94,0.85)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(110, 135); g.lineTo(168, 40); g.stroke();
      g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(168, 34, 6, 0, 7); g.stroke();
    } else if (kind === 'ranks') {
      const r = NA.Prog.myRank(), col = r.color || '#94a3b8';
      g.fillStyle = '#0b0f17'; g.fillRect(0, 0, 240, 135);
      const gr = g.createRadialGradient(170, 66, 4, 170, 66, 120); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(11,15,23,0)'); g.fillStyle = gr; g.globalAlpha = 0.6; g.fillRect(0, 0, 240, 135); g.globalAlpha = 1;
      g.save(); g.translate(170, 62);
      g.fillStyle = col; g.strokeStyle = '#fff'; g.lineWidth = 4;
      g.beginPath(); g.moveTo(0, -50); g.lineTo(40, -32); g.lineTo(40, 10); g.quadraticCurveTo(40, 44, 0, 58); g.quadraticCurveTo(-40, 44, -40, 10); g.lineTo(-40, -32); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.92)';
      const n = r.idx >= 9 ? 3 : Math.max(1, 4 - (r.div || 3));
      for (let i = 0; i < n; i++) { const y = 14 - i * 14; g.beginPath(); g.moveTo(-22, y); g.lineTo(0, y - 14); g.lineTo(22, y); g.lineTo(22, y + 8); g.lineTo(0, y - 6); g.lineTo(-22, y + 8); g.closePath(); g.fill(); }
      g.restore();
    } else if (kind === 'comms') {
      const gr = g.createLinearGradient(0, 0, 240, 135); gr.addColorStop(0, '#312e81'); gr.addColorStop(1, '#0b1020'); g.fillStyle = gr; g.fillRect(0, 0, 240, 135);
      const art = SR.mapArt('arena');
      const im = await loadImg(art);
      if (im) g.drawImage(im, 0, 0, 240, 135);
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, 0, 240, 135);
      g.fillStyle = 'rgba(255,255,255,0.92)'; g.beginPath(); g.arc(170, 66, 24, 0, 7); g.fill();
      g.fillStyle = '#4f46e5'; g.beginPath(); g.moveTo(162, 54); g.lineTo(162, 78); g.lineTo(183, 66); g.fill();
      g.fillStyle = '#ef4444'; g.fillRect(120, 10, 40, 16); g.fillStyle = '#fff'; g.font = 'bold 11px sans-serif'; g.fillText('CLIP', 127, 22);
      if (!im) return c.toDataURL('image/jpeg', 0.85);
    }
    tileMem[kind] = c.toDataURL(kind === 'cheats' ? 'image/png' : 'image/jpeg', 0.86);
    return tileMem[kind];
  };
  SR.resetTileArt = k => { delete tileMem[k]; };

  NA.Showroom = SR;
})(window.NA);
