/* Kaido Nights: car models (made-up designs built from side profiles), paint and rust,
   lights, plus tyre smoke and skid marks. */
(function (KN) {
  'use strict';
  const U = KN.U, D = KN.DATA;

  // side profiles: x 0 = rear .. 1 = front, y in metres. lower = body below the windows, cab = glasshouse
  const BODIES = {
    hatch: {
      lower: [[0, 0.30], [0.0, 0.70], [0.025, 0.86], [0.30, 0.89], [0.64, 0.87], [0.95, 0.80], [1.0, 0.72], [1.0, 0.30]],
      cab: [[0.035, 0.86], [0.085, 1.31], [0.56, 1.34], [0.665, 0.87]], roofFrom: 0.1, roofTo: 0.55,
    },
    popup: {
      lower: [[0, 0.32], [0.0, 0.76], [0.06, 0.85], [0.30, 0.86], [0.60, 0.85], [0.80, 0.79], [0.95, 0.70], [1.0, 0.62], [1.0, 0.33]],
      cab: [[0.12, 0.85], [0.33, 1.26], [0.55, 1.29], [0.645, 0.85]], roofFrom: 0.34, roofTo: 0.54, popups: true,
    },
    rotary: {
      lower: [[0, 0.34], [0.0, 0.66], [0.03, 0.76], [0.10, 0.82], [0.30, 0.84], [0.55, 0.81], [0.72, 0.74], [0.86, 0.66], [0.96, 0.58], [1.0, 0.50], [1.0, 0.34]],
      cab: [[0.20, 0.82], [0.30, 1.08], [0.38, 1.19], [0.50, 1.23], [0.57, 1.16], [0.635, 0.80]], roofFrom: 0.36, roofTo: 0.53, ducktail: true,
    },
    muscle: {
      lower: [[0, 0.35], [0.0, 0.86], [0.04, 0.93], [0.34, 0.95], [0.60, 0.93], [0.93, 0.86], [1.0, 0.78], [1.0, 0.36]],
      cab: [[0.10, 0.93], [0.34, 1.35], [0.53, 1.38], [0.615, 0.93]], roofFrom: 0.35, roofTo: 0.52, scoop: true,
    },
    gt: {
      lower: [[0, 0.33], [0.0, 0.82], [0.05, 0.92], [0.30, 0.93], [0.63, 0.91], [0.94, 0.81], [1.0, 0.71], [1.0, 0.32]],
      cab: [[0.15, 0.92], [0.30, 1.32], [0.57, 1.36], [0.66, 0.91]], roofFrom: 0.31, roofTo: 0.56, wing: true,
    },
  };

  // ---------------------------------------------------------------- textures
  let RUST = null;
  function rustTexture() {
    if (RUST) return RUST;
    const cv = document.createElement('canvas'); cv.width = cv.height = 256;
    const c = cv.getContext('2d');
    c.fillStyle = '#7d828a'; c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 60; i++) {
      const x = Math.random() * 256, y = Math.random() * 256, r = U.rand(6, 34);
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${U.randInt(110, 150)},${U.randInt(52, 70)},${U.randInt(22, 32)},0.95)`); g.addColorStop(0.7, 'rgba(120,70,40,0.5)'); g.addColorStop(1, 'rgba(120,70,40,0)');
      c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    }
    for (let i = 0; i < 4000; i++) { c.fillStyle = `rgba(${U.randInt(60, 150)},${U.randInt(40, 80)},${U.randInt(20, 40)},0.35)`; c.fillRect(Math.random() * 256, Math.random() * 256, 1.5, 1.5); }
    c.strokeStyle = 'rgba(200,200,200,0.25)';
    for (let i = 0; i < 30; i++) { c.beginPath(); const x = Math.random() * 256, y = Math.random() * 256; c.moveTo(x, y); c.lineTo(x + U.rand(-30, 30), y + U.rand(-5, 5)); c.stroke(); }
    RUST = new THREE.CanvasTexture(cv); RUST.wrapS = RUST.wrapT = THREE.RepeatWrapping;
    return RUST;
  }
  let PLATE = null;
  function plateTexture() {
    if (PLATE) return PLATE;
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 40;
    const c = cv.getContext('2d');
    c.fillStyle = '#f2f2ea'; c.fillRect(0, 0, 128, 40); c.strokeStyle = '#2a6b3a'; c.lineWidth = 3; c.strokeRect(2, 2, 124, 36);
    c.fillStyle = '#1d4f2a'; c.font = '900 22px -apple-system, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('街 86-21', 64, 21);
    PLATE = new THREE.CanvasTexture(cv);
    return PLATE;
  }

  KN.paintMaterial = function (look) {
    if (look.rust) return new THREE.MeshStandardMaterial({ color: 0xc9b8a8, map: rustTexture(), roughness: 0.9, metalness: 0.2, envMapIntensity: 0.4 });
    const f = look.finish || 'gloss';
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(look.paint), metalness: f === 'metallic' ? 0.62 : 0.12, roughness: f === 'matte' ? 0.72 : f === 'metallic' ? 0.3 : 0.38,
      clearcoat: f === 'matte' ? 0 : 1, clearcoatRoughness: 0.05, envMapIntensity: f === 'matte' ? 0.5 : 1.35,
    });
  };
  const GLASS = () => new THREE.MeshPhysicalMaterial({ color: 0x0b0f17, metalness: 0.3, roughness: 0.08, clearcoat: 1, envMapIntensity: 1.6 });
  const TRIM = () => new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.6, metalness: 0.2 });

  function extrude(points, depth, L, bevel) {
    const sh = new THREE.Shape();
    points.forEach((p, i) => (i ? sh.lineTo(p[0] * L, p[1]) : sh.moveTo(p[0] * L, p[1])));
    sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: depth - bevel * 2, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 1, curveSegments: 1 });
    g.rotateY(-Math.PI / 2);
    g.translate((depth - bevel * 2) / 2, 0, -L / 2);
    g.computeVertexNormals();
    return g;
  }
  // body profile with wheel arches cut in
  function withArches(lower, L, wb, archR) {
    const xr = 0.5 - wb / 2 / L, xf = 0.5 + wb / 2 / L, ar = archR / L, out = [];
    const bottom = lower[0][1];
    // walk the top of the profile (all points except the closing bottom ones), then the bottom with arches, front to rear
    for (const p of lower) out.push(p);
    const arch = (xc) => { const pts = []; for (let k = 0; k <= 8; k++) { const t = Math.PI * (k / 8); pts.push([xc + Math.cos(t) * ar, bottom + Math.sin(t) * archR * 0.95]); } return pts; };
    const tail = [];
    tail.push([xf + ar, bottom], ...arch(xf), [xf - ar, bottom], [xr + ar, bottom], ...arch(xr), [xr - ar, bottom]);
    return out.concat(tail);
  }

  // ---------------------------------------------------------------- build a car
  KN.buildCar = function (carId, look) {
    const def = D.CAR[carId], dims = def.dims, body = BODIES[def.body];
    const L = dims.len, Wd = dims.wid, wb = def.phys.wheelbase, wr = 0.31;
    const g = new THREE.Group(), shell = new THREE.Group();
    g.add(shell);
    const paint = KN.paintMaterial(look), glass = GLASS(), trim = TRIM();
    const lowerGeo = extrude(withArches(body.lower, L, wb, wr + 0.06), Wd, L, 0.07);
    const lower = new THREE.Mesh(lowerGeo, paint); lower.castShadow = true; shell.add(lower);
    const cabGeo = extrude(body.cab, Wd * 0.84, L, 0.05);
    const cab = new THREE.Mesh(cabGeo, glass); cab.castShadow = true; shell.add(cab);
    // painted roof panel + pillars
    const roofY = Math.max(...body.cab.map(p => p[1]));
    const roofLen = (body.roofTo - body.roofFrom) * L;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(Wd * 0.8, 0.05, roofLen), paint);
    roof.position.set(0, roofY + 0.005, ((body.roofFrom + body.roofTo) / 2 - 0.5) * L); shell.add(roof);
    // bumpers, grille, lights
    const front = body.lower[body.lower.length - 2], rear = body.lower[1];
    const fz = L / 2, rz = -L / 2;
    const bumperF = new THREE.Mesh(new THREE.BoxGeometry(Wd * 0.98, 0.2, 0.12), trim); bumperF.position.set(0, 0.42, fz + 0.02); shell.add(bumperF);
    const bumperR = new THREE.Mesh(new THREE.BoxGeometry(Wd * 0.98, 0.2, 0.12), trim); bumperR.position.set(0, 0.42, rz - 0.02); shell.add(bumperR);
    const grille = new THREE.Mesh(new THREE.BoxGeometry(Wd * 0.45, 0.12, 0.05), trim); grille.position.set(0, Math.min(front[1] - 0.12, 0.6), fz + 0.03); shell.add(grille);
    const headMat = new THREE.MeshBasicMaterial({ color: 0xfff3d6 }), tailMat = new THREE.MeshBasicMaterial({ color: 0x8a0d16 });
    const lights = { head: [], tail: [], tailMat, headMat };
    const hy = body.popups ? front[1] - 0.06 : Math.max(0.55, front[1] - 0.12);
    for (const sx of [-1, 1]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(Wd * 0.22, body.popups ? 0.05 : 0.11, 0.04), body.popups ? trim : headMat);
      hl.position.set(sx * Wd * 0.33, hy, fz + 0.045); shell.add(hl); lights.head.push(hl);
      const tl = new THREE.Mesh(new THREE.BoxGeometry(Wd * 0.26, 0.1, 0.04), tailMat);
      tl.position.set(sx * Wd * 0.31, Math.min(rear[1] - 0.1, 0.78), rz - 0.045); shell.add(tl); lights.tail.push(tl);
      const mir = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.09, 0.11), paint);
      mir.position.set(sx * (Wd * 0.47 + 0.07), body.cab[body.cab.length - 1][1] + 0.12, (body.cab[body.cab.length - 1][0] - 0.06 - 0.5) * L); shell.add(mir);
    }
    if (body.popups) {
      // pop-up lights, flipped up at night
      for (const sx of [-1, 1]) {
        const pod = new THREE.Group(); pod.position.set(sx * Wd * 0.31, front[1] + 0.02, fz - 0.35);
        const box = new THREE.Mesh(new THREE.BoxGeometry(Wd * 0.24, 0.16, 0.2), paint); box.position.set(0, 0.08, 0); pod.add(box);
        const lens = new THREE.Mesh(new THREE.BoxGeometry(Wd * 0.2, 0.11, 0.02), headMat); lens.position.set(0, 0.08, 0.105); pod.add(lens);
        shell.add(pod);
      }
    }
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.13), new THREE.MeshBasicMaterial({ map: plateTexture() }));
    plate.position.set(0, 0.48, rz - 0.09); plate.rotation.y = Math.PI; shell.add(plate);
    const exh = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.2, 8), trim); exh.rotation.x = Math.PI / 2; exh.position.set(Wd * 0.3, 0.27, rz - 0.06); shell.add(exh);
    if (body.wing || (look.kit && look.kit.spoiler)) {
      const wy = rear[1] + 0.32;
      const blade = new THREE.Mesh(new THREE.BoxGeometry(Wd * 0.95, 0.05, 0.3), body.wing ? trim : paint); blade.position.set(0, wy, rz + 0.22); shell.add(blade);
      for (const sx of [-1, 1]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.12), trim); post.position.set(sx * Wd * 0.3, wy - 0.16, rz + 0.25); shell.add(post); }
    }
    if (body.ducktail) { const dt = new THREE.Mesh(new THREE.BoxGeometry(Wd * 0.8, 0.05, 0.16), paint); dt.position.set(0, rear[1] + 0.07, rz + 0.12); dt.rotation.x = -0.25; shell.add(dt); }
    if (body.scoop) { const sc = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.07, 0.6), trim); sc.position.set(0, 0.94, L * 0.22); shell.add(sc); }
    // wheels
    const tire = new THREE.MeshStandardMaterial({ color: 0x111215, roughness: 0.92 });
    const rim = new THREE.MeshStandardMaterial({ color: new THREE.Color(look.wheels || '#c9ccd2'), metalness: 0.85, roughness: 0.25, envMapIntensity: 1.4 });
    const tireGeo = new THREE.CylinderGeometry(wr, wr, 0.23, 18); tireGeo.rotateZ(Math.PI / 2);
    const rimGeo = new THREE.CylinderGeometry(wr * 0.66, wr * 0.66, 0.235, 10); rimGeo.rotateZ(Math.PI / 2);
    const spokeGeo = new THREE.BoxGeometry(0.24, wr * 1.15, 0.05);
    const wheels = [];
    for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
      const pivot = new THREE.Group(); pivot.position.set(sx * (Wd / 2 - 0.13), wr, sz * wb / 2);
      const spin = new THREE.Group(); pivot.add(spin);
      const t = new THREE.Mesh(tireGeo, tire); t.castShadow = true; spin.add(t);
      spin.add(new THREE.Mesh(rimGeo, rim));
      for (let k = 0; k < 3; k++) { const sp = new THREE.Mesh(spokeGeo, rim); sp.rotation.x = k * Math.PI / 3; spin.add(sp); }
      g.add(pivot);
      wheels.push({ pivot, spin, front: sz > 0 });
    }
    const car = { group: g, shell, wheels, lights, paint, rim, def, look: Object.assign({}, look), L, Wd };
    car.setLook = function (lk) {
      const p2 = KN.paintMaterial(lk);
      shell.traverse(o => { if (o.material === car.paint) o.material = p2; });
      car.paint.dispose(); car.paint = p2;
      car.rim.color.set(lk.wheels || '#c9ccd2');
      car.look = Object.assign({}, lk);
    };
    car.update = function (ph, dt) {
      g.position.set(ph.x, 0, ph.z);
      g.rotation.y = ph.yaw;
      const roll = U.clamp(ph.r * ph.speed * 0.006, -0.08, 0.08), pitch = U.clamp(-ph.ax * 0.006, -0.05, 0.05);
      shell.rotation.z = U.lerp(shell.rotation.z, -roll, U.damp(8, dt));
      shell.rotation.x = U.lerp(shell.rotation.x, pitch, U.damp(6, dt));
      for (const wh of wheels) { wh.spin.rotation.x = ph.wheelRot * (wh.front ? 1 : 1 + ph.smoke * 0.6); if (wh.front) wh.pivot.rotation.y = ph.steer; }
      tailMat.color.setHex(ph.brake > 0.1 || ph.hand ? 0xff2233 : 0x8a0d16);
    };
    car.dispose = function () { g.traverse(o => { if (o.geometry) o.geometry.dispose(); }); };
    return car;
  };

  // headlight beams + light for the player's car
  KN.addHeadlights = function (car, strong) {
    const spot = new THREE.SpotLight(0xfff1d8, strong ? 2.4 : 1.2, strong ? 75 : 40, 0.52, 0.55, 1.2);
    spot.position.set(0, 0.7, car.L / 2 - 0.2);
    spot.target.position.set(0, 0, car.L / 2 + 14);
    car.group.add(spot, spot.target);
    const coneGeo = new THREE.ConeGeometry(3.2, 13, 18, 1, true); coneGeo.translate(0, -6.5, 0); coneGeo.rotateX(-Math.PI / 2 - 0.08);
    const cone = new THREE.Mesh(coneGeo, new THREE.MeshBasicMaterial({ color: 0xfff1d8, map: KN.TEX.glow, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    cone.position.set(0, 0.7, car.L / 2);
    car.group.add(cone);
    // little glare sprites on the lamps
    for (const sx of [-1, 1]) {
      const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: KN.TEX.glow, color: 0xfff4dc, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
      fl.scale.set(0.9, 0.9, 1); fl.position.set(sx * car.Wd * 0.33, 0.62, car.L / 2 + 0.12); car.group.add(fl);
    }
    car.spot = spot;
    return spot;
  };

  // ---------------------------------------------------------------- tyre smoke (one draw call)
  class Smoke {
    constructor(scene, max) {
      this.max = max; this.n = 0; this.head = 0;
      const geo = new THREE.BufferGeometry();
      this.pos = new Float32Array(max * 3); this.size = new Float32Array(max); this.alpha = new Float32Array(max);
      this.vel = new Float32Array(max * 3); this.life = new Float32Array(max); this.age = new Float32Array(max);
      geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
      geo.setAttribute('size', new THREE.BufferAttribute(this.size, 1));
      geo.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1));
      this.mat = new THREE.ShaderMaterial({
        uniforms: { map: { value: KN.TEX.smoke }, scale: { value: 400 }, tint: { value: new THREE.Color(0xbcc0cb) } },
        // fades out right in front of the lens so a cloud around the car never whites out the screen
        vertexShader: 'attribute float size; attribute float alpha; varying float va; uniform float scale; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); float dz = max(0.5, -mv.z); va = alpha * smoothstep(1.5, 6.0, dz); gl_PointSize = min(size * scale / dz, 720.0); gl_Position = projectionMatrix * mv; }',
        fragmentShader: 'uniform sampler2D map; uniform vec3 tint; varying float va; void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(tint, t.a * va); }',
        transparent: true, depthWrite: false,
      });
      this.points = new THREE.Points(geo, this.mat);
      this.points.frustumCulled = false;
      scene.add(this.points);
    }
    emit(x, y, z, vx, vz, k) {
      const i = this.head; this.head = (this.head + 1) % this.max; this.n = Math.min(this.max, this.n + 1);
      this.pos[i * 3] = x + U.rand(-0.2, 0.2); this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z + U.rand(-0.2, 0.2);
      this.vel[i * 3] = vx * 0.25 + U.rand(-0.6, 0.6); this.vel[i * 3 + 1] = U.rand(0.4, 1.1); this.vel[i * 3 + 2] = vz * 0.25 + U.rand(-0.6, 0.6);
      this.life[i] = U.rand(1.4, 2.6) * (0.6 + k * 0.5); this.age[i] = 0; this.size[i] = 1.2; this.alpha[i] = 0;
      this.k = k;
    }
    update(dt) {
      for (let i = 0; i < this.n; i++) {
        if (this.age[i] >= this.life[i]) { this.alpha[i] = 0; continue; }
        this.age[i] += dt;
        const t = this.age[i] / this.life[i], dmp = Math.exp(-1.6 * dt);
        this.vel[i * 3] *= dmp; this.vel[i * 3 + 2] *= dmp;
        this.pos[i * 3] += this.vel[i * 3] * dt; this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt; this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
        this.size[i] = 1.2 + t * 5.2;
        this.alpha[i] = (t < 0.1 ? t / 0.1 : 1 - (t - 0.1) / 0.9) * 0.3;
      }
      const g = this.points.geometry;
      g.attributes.position.needsUpdate = true; g.attributes.size.needsUpdate = true; g.attributes.alpha.needsUpdate = true;
    }
    clear() { for (let i = 0; i < this.max; i++) { this.alpha[i] = 0; this.age[i] = this.life[i] = 0; } this.n = 0; }
  }
  KN.Smoke = Smoke;

  // ---------------------------------------------------------------- skid marks (ring buffer of quads)
  class Skids {
    constructor(scene, max) {
      this.max = max; this.head = 0;
      this.pos = new Float32Array(max * 12); this.col = new Float32Array(max * 16);
      const idx = new Uint32Array(max * 6);
      for (let i = 0; i < max; i++) { const b = i * 4; idx.set([b, b + 1, b + 2, b, b + 2, b + 3], i * 6); }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
      geo.setAttribute('color', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage));
      geo.setIndex(new THREE.BufferAttribute(idx, 1));
      this.mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, color: 0xffffff }));
      this.mesh.frustumCulled = false;
      this.mesh.renderOrder = 1;
      scene.add(this.mesh);
      this.last = {};
    }
    // one wheel's mark from its last point to (x, z)
    mark(id, x, z, k) {
      const L = this.last[id];
      if (!L || k <= 0.05) { this.last[id] = k > 0.05 ? [x, z] : null; return; }
      const dx = x - L[0], dz = z - L[1], d = Math.hypot(dx, dz);
      if (d < 0.35) return;
      if (d > 3) { this.last[id] = [x, z]; return; }
      const nx = -dz / d * 0.12, nz = dx / d * 0.12, y = 0.032, i = this.head;
      this.head = (this.head + 1) % this.max;
      this.pos.set([L[0] - nx, y, L[1] - nz, L[0] + nx, y, L[1] + nz, x + nx, y, z + nz, x - nx, y, z - nz], i * 12);
      const a = Math.min(0.55, 0.2 + k * 0.4);
      for (let v = 0; v < 4; v++) this.col.set([0.02, 0.02, 0.025, a], i * 16 + v * 4);
      const g = this.mesh.geometry;
      g.attributes.position.updateRange = { offset: i * 12, count: 12 }; g.attributes.position.needsUpdate = true;
      g.attributes.color.updateRange = { offset: i * 16, count: 16 }; g.attributes.color.needsUpdate = true;
      this.last[id] = [x, z];
    }
    clear() { this.pos.fill(0); this.col.fill(0); const g = this.mesh.geometry; g.attributes.position.updateRange = { offset: 0, count: -1 }; g.attributes.color.updateRange = { offset: 0, count: -1 }; g.attributes.position.needsUpdate = g.attributes.color.needsUpdate = true; this.last = {}; }
  }
  KN.Skids = Skids;
})(window.KN);
