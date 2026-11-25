/* NO ANTICHEAT: blocky characters, done properly. Each character is ONE skinned mesh built from
   bevelled blocks (vertex colours, no textures) with a 7-bone skeleton, toon shading and an
   outline pass. About 3 draw calls per character instead of a dozen. Used by bots, the menu
   showroom and the locker. */
(function (NA) {
  'use strict';
  const U = NA.U;
  const AV = {};

  // ---------------------------------------------------------------- shared materials
  let GRAD = null;
  function grad() {
    if (GRAD) return GRAD;
    const v = [95, 175, 255], data = new Uint8Array(v.length * 4);
    v.forEach((x, i) => { data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = x; data[i * 4 + 3] = 255; });
    GRAD = new THREE.DataTexture(data, v.length, 1, THREE.RGBAFormat);
    GRAD.minFilter = GRAD.magFilter = THREE.NearestFilter;
    GRAD.needsUpdate = true;
    return GRAD;
  }
  AV.grad = grad;
  AV.toon = (opts) => new THREE.MeshToonMaterial(Object.assign({ vertexColors: true, gradientMap: grad() }, opts || {}));
  let OUTLINE = null, CHAMS = null, ICE = null, GUNMAT = null;
  function outlineMat() {
    if (OUTLINE) return OUTLINE;
    OUTLINE = new THREE.MeshBasicMaterial({ color: 0x0d0f14, side: THREE.BackSide });
    OUTLINE.onBeforeCompile = sh => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  transformed += normal * 0.022;'); };
    OUTLINE.customProgramCacheKey = () => 'na-outline';
    return OUTLINE;
  }
  AV.outlineMat = outlineMat;
  function chamsMat() { return CHAMS || (CHAMS = new THREE.MeshBasicMaterial({ color: 0xff2a6d, transparent: true, opacity: 0.6, depthTest: false, depthWrite: false })); }
  function iceMat() { return ICE || (ICE = new THREE.MeshBasicMaterial({ color: 0x9be7ff, transparent: true, opacity: 0.5, depthWrite: false })); }
  AV.gunMat = () => GUNMAT || (GUNMAT = AV.toon());

  // ---------------------------------------------------------------- bevelled box
  // A 3-segment box whose inner ring is pulled out to the bevel line, then the outer
  // vertices are rounded onto the bevel: flat faces, soft edges, correct normals.
  const rbCache = {};
  function bevelBox(w, h, d, r) {
    const key = `${w.toFixed(3)},${h.toFixed(3)},${d.toFixed(3)},${r.toFixed(3)}`;
    if (rbCache[key]) return rbCache[key];
    r = Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
    let g;
    if (r < 0.012 || Math.min(w, h, d) < 0.05) g = new THREE.BoxGeometry(w, h, d);
    else {
      g = new THREE.BoxGeometry(w, h, d, 3, 3, 3);
      const p = g.attributes.position, n = g.attributes.normal, v = new THREE.Vector3(), inner = new THREE.Vector3();
      const hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r;
      const remap = (c, half, hin) => (Math.abs(Math.abs(c) - half) < 1e-5 ? c : Math.sign(c) * hin);
      for (let i = 0; i < p.count; i++) {
        v.set(remap(p.getX(i), w / 2, hx), remap(p.getY(i), h / 2, hy), remap(p.getZ(i), d / 2, hz));
        inner.set(U.clamp(v.x, -hx, hx), U.clamp(v.y, -hy, hy), U.clamp(v.z, -hz, hz));
        v.sub(inner);
        const len = v.length();
        if (len > 1e-6) { v.multiplyScalar(1 / len); n.setXYZ(i, v.x, v.y, v.z); p.setXYZ(i, inner.x + v.x * r, inner.y + v.y * r, inner.z + v.z * r); }
        else p.setXYZ(i, inner.x, inner.y, inner.z);
      }
    }
    rbCache[key] = g;
    return g;
  }
  AV.bevelBox = bevelBox;

  // Bake a list of parts into one geometry with vertex colours (and optional skin weights).
  const BONES = ['hips', 'spine', 'head', 'armL', 'armR', 'legL', 'legR'];
  function bake(parts, skinned) {
    let nv = 0, ni = 0;
    const geos = parts.map(pt => {
      const g = bevelBox(pt.w, pt.h, pt.d, pt.r || 0).clone();
      if (pt.rz) g.rotateZ(pt.rz);
      if (pt.rx) g.rotateX(pt.rx);
      if (pt.ry) g.rotateY(pt.ry);
      g.translate(pt.x, pt.y, pt.z);
      nv += g.attributes.position.count; ni += g.index.count;
      return g;
    });
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), col = new Float32Array(nv * 3), uvs = new Float32Array(nv * 2);
    const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
    const si = skinned ? new Uint16Array(nv * 4) : null, sw = skinned ? new Float32Array(nv * 4) : null;
    const c = new THREE.Color();
    let vo = 0, io = 0;
    geos.forEach((g, k) => {
      const pt = parts[k], cnt = g.attributes.position.count;
      pos.set(g.attributes.position.array, vo * 3);
      nor.set(g.attributes.normal.array, vo * 3);
      c.set(pt.color);
      const shade = pt.shade || 1;
      const gp = g.attributes.position.array, gn = g.attributes.normal.array;
      for (let i = 0; i < cnt; i++) {
        // planar UVs in world units (so gun skins tile evenly)
        const ax = Math.abs(gn[i * 3]), ay = Math.abs(gn[i * 3 + 1]), az = Math.abs(gn[i * 3 + 2]);
        const X = gp[i * 3], Y = gp[i * 3 + 1], Z = gp[i * 3 + 2];
        if (ax >= ay && ax >= az) { uvs[(vo + i) * 2] = Z * 3.2; uvs[(vo + i) * 2 + 1] = Y * 3.2; }
        else if (ay >= az) { uvs[(vo + i) * 2] = X * 3.2; uvs[(vo + i) * 2 + 1] = Z * 3.2; }
        else { uvs[(vo + i) * 2] = X * 3.2; uvs[(vo + i) * 2 + 1] = Y * 3.2; }
        col[(vo + i) * 3] = c.r * shade; col[(vo + i) * 3 + 1] = c.g * shade; col[(vo + i) * 3 + 2] = c.b * shade;
        if (skinned) { si[(vo + i) * 4] = BONES.indexOf(pt.bone); sw[(vo + i) * 4] = 1; }
      }
      const src = g.index.array;
      for (let i = 0; i < src.length; i++) idx[io + i] = src[i] + vo;
      vo += cnt; io += src.length;
      g.dispose();
    });
    const m = new THREE.BufferGeometry();
    m.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    m.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    m.setAttribute('color', new THREE.BufferAttribute(col, 3));
    m.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    if (skinned) { m.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); m.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4)); }
    m.setIndex(new THREE.BufferAttribute(idx, 1));
    m.computeBoundingSphere();
    return m;
  }
  AV.bake = bake;

  // ---------------------------------------------------------------- outfits
  // An outfit is plain data, so the shop, the locker and the bots all use the same builder.
  const SKINS = [0xf1c9a5, 0xe0ac7e, 0xc68642, 0x8d5524, 0xffdbac, 0xf5d0b0];
  const HAIR = [0x2b1d14, 0x5a3a22, 0x0f0f10, 0xc9a35b, 0x8a3b1e, 0x3b2a20];
  const PANTS = [0x1f2937, 0x334155, 0x1e3a5f, 0x3f2a1d, 0x2f3a24, 0x111827, 0x4b5563];
  const SHOES = [0xf1f5f9, 0x111827, 0x7c2d12, 0x334155, 0xdc2626];
  AV.botOutfit = function (color, name) {
    const r = Math.random;
    const story = AV.STORY[name];
    if (story) return Object.assign({}, story, { shirt: story.keepShirt ? story.shirt : color });
    const tops = ['tee', 'tee', 'hoodie', 'jacket', 'vest', 'tee'];
    const hats = [null, null, 'cap', 'beanie', 'helmet', 'headphones', 'capBack', 'bandana', null];
    const faces = ['smile', 'smirk', 'bored', 'angry', 'surprised', 'shades', 'smile'];
    return {
      skin: U.pick(SKINS), hair: U.pick(HAIR), shirt: color, shirt2: new THREE.Color(color).multiplyScalar(0.7).getHex(), pants: U.pick(PANTS), shoes: U.pick(SHOES),
      top: U.pick(tops), hat: U.pick(hats), hatColor: U.pick([0x111827, 0xef4444, 0xf59e0b, 0x10b981, 0x6366f1, 0xf8fafc, 0x334155]),
      face: U.pick(faces), vest: r() < 0.25 ? U.pick([0x3f4a2a, 0x374151, 0x1f2937]) : null, backpack: r() < 0.2 ? U.pick([0x374151, 0x7c2d12, 0x14532d]) : null,
      gloves: r() < 0.3 ? 0x1f2937 : null, belt: r() < 0.5 ? 0x1c1917 : null,
    };
  };
  AV.STORY = {
    BOT_Kevin: { skin: 0xb8c0cc, hair: 0x9aa3ae, shirt: 0x94a3b8, shirt2: 0x64748b, pants: 0x475569, shoes: 0x334155, top: 'tee', hat: 'antenna', hatColor: 0xf43f5e, face: 'visor', visor: 0x22d3ee, keepShirt: true },
    NotABot42: { skin: 0xc7cdd6, hair: 0x9aa3ae, shirt: 0x1f2937, shirt2: 0x111827, pants: 0x111827, shoes: 0x111827, top: 'suit', hat: null, face: 'bored', tie: 0xdc2626, keepShirt: false },
    mom_plays_too: { skin: 0xf1c9a5, hair: 0x8a5a2b, shirt: 0xf9a8d4, shirt2: 0xf472b6, pants: 0x93c5fd, shoes: 0xf1f5f9, top: 'jacket', hat: null, face: 'smile', glasses: true, keepShirt: false },
    ttv_clipfarmer: { skin: 0xe0ac7e, hair: 0x0f0f10, shirt: 0x7c3aed, shirt2: 0x5b21b6, pants: 0x111827, shoes: 0xf1f5f9, top: 'hoodie', hat: 'headphones', hatColor: 0x111827, face: 'surprised', keepShirt: false },
    'xX_Gr1ndM4ster_Xx': { skin: 0xffdbac, hair: 0x2b1d14, shirt: 0x111827, shirt2: 0xdc2626, pants: 0x111827, shoes: 0xdc2626, top: 'hoodie', hat: 'capBack', hatColor: 0xdc2626, face: 'angry', keepShirt: false },
    sgt_sweatpants: { skin: 0xc68642, hair: 0x0f0f10, shirt: 0x4d5d3a, shirt2: 0x3f4a2a, pants: 0x6b7280, shoes: 0x1f2937, top: 'vest', hat: 'helmet', hatColor: 0x4d5d3a, face: 'angry', vest: 0x3f4a2a, gloves: 0x1f2937, keepShirt: false },
  };

  function outfitParts(o) {
    const P = [];
    const add = (bone, color, w, h, d, x, y, z, r, extra) => P.push(Object.assign({ bone, color, w, h, d, x, y, z, r: r === undefined ? 0.035 : r }, extra || {}));
    const long = o.top === 'hoodie' || o.top === 'jacket' || o.top === 'suit' || o.top === 'gi' || o.top === 'hazmat' || o.top === 'astro';
    const pantsC = o.pants, shoeC = o.shoes || 0x1f2937;
    // legs
    for (const s of [-1, 1]) {
      const bone = s < 0 ? 'legL' : 'legR', x = s * 0.125;
      add(bone, pantsC, 0.235, 0.66, 0.26, x, 0.47, 0, 0.045);
      add(bone, shoeC, 0.25, 0.13, 0.33, x, 0.075, -0.035, 0.05);
      add(bone, 0x0d0f14, 0.252, 0.03, 0.332, x, 0.02, -0.035, 0.01, { shade: 1 });
      if (o.kneepads) add(bone, o.kneepads, 0.2, 0.12, 0.05, x, 0.42, -0.13, 0.02);
      if (o.stripe2) add(bone, o.stripe2, 0.03, 0.62, 0.262, x + s * 0.104, 0.47, 0, 0.005);
    }
    // hips + belt
    add('hips', pantsC, 0.5, 0.16, 0.27, 0, 0.83, 0, 0.04);
    if (o.belt) { add('hips', o.belt, 0.515, 0.055, 0.285, 0, 0.885, 0, 0.012); add('hips', 0xd4af37, 0.07, 0.045, 0.02, 0, 0.885, -0.145, 0.005); }
    // torso
    const sh = o.shirt, sh2 = o.shirt2 || sh;
    add('spine', sh, 0.52, 0.57, 0.28, 0, 1.18, 0, 0.065);
    if (o.top === 'hoodie') {
      add('spine', sh2, 0.3, 0.13, 0.03, 0, 1.03, -0.142, 0.02);            // front pocket
      add('spine', sh2, 0.44, 0.13, 0.3, 0, 1.47, 0.04, 0.05);             // hood bunched at the neck
      add('spine', 0xf8fafc, 0.015, 0.14, 0.015, -0.06, 1.33, -0.145, 0);  // drawstrings
      add('spine', 0xf8fafc, 0.015, 0.14, 0.015, 0.06, 1.33, -0.145, 0);
    } else if (o.top === 'jacket') {
      add('spine', sh2, 0.035, 0.55, 0.02, 0, 1.18, -0.142, 0.005);         // zip
      add('spine', o.under || 0xf8fafc, 0.16, 0.3, 0.02, 0, 1.3, -0.141, 0.01);
      add('spine', sh2, 0.5, 0.09, 0.3, 0, 1.45, 0, 0.04);                 // collar
    } else if (o.top === 'suit') {
      add('spine', o.under || 0xf8fafc, 0.16, 0.42, 0.02, 0, 1.25, -0.141, 0.01);
      add('spine', o.tie || 0x1e3a8a, 0.06, 0.34, 0.02, 0, 1.24, -0.148, 0.005);
    } else if (o.top === 'gi') {
      add('spine', sh2, 0.08, 0.5, 0.02, -0.06, 1.2, -0.142, 0.005, { rz: 0.35 });
      add('spine', o.belt2 || 0xdc2626, 0.53, 0.06, 0.29, 0, 0.98, 0, 0.012);
    } else if (o.top === 'hazmat' || o.top === 'astro') {
      add('spine', sh2, 0.24, 0.16, 0.04, 0, 1.24, -0.15, 0.02);             // chest panel
      add('spine', o.top === 'astro' ? 0x2563eb : 0x111827, 0.06, 0.06, 0.02, -0.06, 1.24, -0.172, 0.005);
      add('spine', o.top === 'astro' ? 0xdc2626 : 0x111827, 0.06, 0.06, 0.02, 0.06, 1.24, -0.172, 0.005);
    } else {
      add('spine', sh2, 0.2, 0.05, 0.02, 0, 1.43, -0.141, 0.01);            // tee collar
      if (o.logo) add('spine', o.logo, 0.16, 0.12, 0.02, 0, 1.24, -0.142, 0.01);
    }
    if (o.stripes) for (const y of [1.08, 1.2, 1.32]) add('spine', o.stripes, 0.525, 0.035, 0.285, 0, y, 0, 0.01);
    if (o.neon) { add('spine', o.neon, 0.03, 0.52, 0.29, -0.2, 1.18, 0, 0.005); add('spine', o.neon, 0.03, 0.52, 0.29, 0.2, 1.18, 0, 0.005); }
    if (o.vest) {
      add('spine', o.vest, 0.56, 0.42, 0.33, 0, 1.2, 0, 0.05);
      for (const x of [-0.14, 0, 0.14]) add('spine', o.vest, 0.11, 0.12, 0.05, x, 1.09, -0.18, 0.02, { shade: 0.8 });
    }
    if (o.backpack) { add('spine', o.backpack, 0.4, 0.46, 0.17, 0, 1.17, 0.22, 0.05); add('spine', o.backpack, 0.3, 0.14, 0.06, 0, 1.05, 0.32, 0.03, { shade: 0.8 }); }
    if (o.cape) add('spine', o.cape, 0.5, 0.9, 0.04, 0, 0.98, 0.17, 0.02, { rx: -0.08 });
    if (o.scarf) add('spine', o.scarf, 0.46, 0.1, 0.32, 0, 1.44, 0, 0.04);
    // arms
    for (const s of [-1, 1]) {
      const bone = s < 0 ? 'armL' : 'armR', x = s * 0.38;
      add(bone, sh, 0.215, 0.3, 0.245, x, 1.29, 0, 0.05);
      add(bone, long ? sh : o.skin, 0.205, 0.34, 0.23, x, 0.99, 0, 0.045);
      if (long && o.cuff) add(bone, o.cuff, 0.215, 0.05, 0.24, x, 0.85, 0, 0.012);
      add(bone, o.gloves || o.skin, 0.215, 0.13, 0.235, x, 0.79, 0, 0.05);
      if (o.neon) add(bone, o.neon, 0.21, 0.03, 0.25, x, 1.16, 0, 0.005);
    }
    // head
    const hy = 1.67;
    add('head', o.skin, 0.44, 0.44, 0.44, 0, hy, 0, 0.075);
    const capLike = ['cap', 'capBack', 'beanie', 'helmet', 'astro', 'hood', 'crown', 'hazmat', 'ninja', 'pizza'];
    if (!o.bald && capLike.indexOf(o.hat) < 0 && o.face !== 'balaclava') {
      add('head', o.hair, 0.46, 0.1, 0.46, 0, hy + 0.2, 0.0, 0.03);
      add('head', o.hair, 0.46, 0.26, 0.08, 0, hy + 0.06, 0.2, 0.02);
      add('head', o.hair, 0.46, 0.08, 0.1, 0, hy + 0.15, -0.19, 0.02);
    }
    // face (front is -z)
    const fz = -0.224, ink = 0x15161a;
    const eyes = (h) => { add('head', ink, 0.06, h || 0.09, 0.02, -0.09, hy + 0.04, fz, 0.01); add('head', ink, 0.06, h || 0.09, 0.02, 0.09, hy + 0.04, fz, 0.01); };
    const f = o.face || 'smile';
    if (f === 'shades') { add('head', 0x0b0c10, 0.34, 0.08, 0.03, 0, hy + 0.05, fz - 0.005, 0.015); add('head', 0x0b0c10, 0.02, 0.02, 0.2, -0.2, hy + 0.06, -0.12, 0.005); add('head', 0x0b0c10, 0.02, 0.02, 0.2, 0.2, hy + 0.06, -0.12, 0.005); }
    else if (f === 'visor') add('head', o.visor || 0x22d3ee, 0.36, 0.09, 0.03, 0, hy + 0.04, fz - 0.005, 0.02);
    else if (f === 'goggles') { add('head', 0x111827, 0.47, 0.05, 0.47, 0, hy + 0.05, 0, 0.01); add('head', o.visor || 0x84cc16, 0.13, 0.09, 0.04, -0.09, hy + 0.05, fz - 0.01, 0.02); add('head', o.visor || 0x84cc16, 0.13, 0.09, 0.04, 0.09, hy + 0.05, fz - 0.01, 0.02); }
    else if (f === 'balaclava') { add('head', o.mask || 0x111827, 0.455, 0.455, 0.455, 0, hy, 0, 0.075); add('head', o.skin, 0.3, 0.08, 0.02, 0, hy + 0.05, -0.229, 0.01); add('head', ink, 0.05, 0.05, 0.02, -0.08, hy + 0.05, -0.236, 0.005); add('head', ink, 0.05, 0.05, 0.02, 0.08, hy + 0.05, -0.236, 0.005); }
    else eyes(f === 'surprised' ? 0.11 : f === 'angry' ? 0.07 : 0.09);
    if (f === 'angry') { add('head', ink, 0.1, 0.025, 0.02, -0.09, hy + 0.12, fz, 0.005, { rz: -0.35 }); add('head', ink, 0.1, 0.025, 0.02, 0.09, hy + 0.12, fz, 0.005, { rz: 0.35 }); }
    if (o.glasses) { add('head', 0x111827, 0.13, 0.11, 0.015, -0.09, hy + 0.04, fz - 0.012, 0.01); add('head', 0x111827, 0.13, 0.11, 0.015, 0.09, hy + 0.04, fz - 0.012, 0.01); }
    if (f !== 'balaclava' && !o.mouthMask) {
      if (f === 'smile' || f === 'shades' || f === 'visor' || f === 'goggles') { add('head', ink, 0.1, 0.025, 0.02, 0, hy - 0.1, fz, 0.005); add('head', ink, 0.03, 0.03, 0.02, -0.062, hy - 0.083, fz, 0.005); add('head', ink, 0.03, 0.03, 0.02, 0.062, hy - 0.083, fz, 0.005); }
      else if (f === 'smirk') { add('head', ink, 0.1, 0.025, 0.02, 0.01, hy - 0.1, fz, 0.005, { rz: 0.18 }); }
      else if (f === 'surprised') add('head', ink, 0.06, 0.06, 0.02, 0, hy - 0.1, fz, 0.01);
      else add('head', ink, 0.12, 0.025, 0.02, 0, hy - 0.1, fz, 0.005);
    }
    if (o.mouthMask) add('head', o.mouthMask, 0.4, 0.17, 0.03, 0, hy - 0.08, fz - 0.005, 0.02);
    // headwear
    const hc = o.hatColor || 0x111827;
    switch (o.hat) {
      case 'cap': add('head', hc, 0.47, 0.13, 0.47, 0, hy + 0.22, 0, 0.04); add('head', hc, 0.38, 0.04, 0.22, 0, hy + 0.17, -0.31, 0.015, { shade: 0.85 }); break;
      case 'capBack': add('head', hc, 0.47, 0.13, 0.47, 0, hy + 0.22, 0, 0.04); add('head', hc, 0.38, 0.04, 0.2, 0, hy + 0.2, 0.3, 0.015, { shade: 0.85 }); break;
      case 'beanie': add('head', hc, 0.48, 0.21, 0.48, 0, hy + 0.2, 0, 0.06); add('head', hc, 0.49, 0.06, 0.49, 0, hy + 0.11, 0, 0.02, { shade: 0.8 }); break;
      case 'helmet': add('head', hc, 0.52, 0.24, 0.52, 0, hy + 0.2, 0.01, 0.08); add('head', hc, 0.54, 0.04, 0.54, 0, hy + 0.09, 0.01, 0.015, { shade: 0.8 }); break;
      case 'headphones': add('head', hc, 0.5, 0.05, 0.1, 0, hy + 0.25, 0, 0.02); add('head', hc, 0.08, 0.17, 0.17, -0.25, hy, 0, 0.03); add('head', hc, 0.08, 0.17, 0.17, 0.25, hy, 0, 0.03); break;
      case 'bandana': add('head', hc, 0.465, 0.07, 0.465, 0, hy + 0.12, 0, 0.02); add('head', hc, 0.06, 0.14, 0.03, 0.06, hy + 0.05, 0.245, 0.01, { rz: 0.4 }); break;
      case 'crown': add('head', 0xfacc15, 0.4, 0.09, 0.4, 0, hy + 0.27, 0, 0.015); for (const [x, z] of [[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15], [0, -0.17]]) add('head', 0xfacc15, 0.06, 0.1, 0.06, x, hy + 0.36, z, 0.01); add('head', 0xef4444, 0.06, 0.06, 0.02, 0, hy + 0.27, -0.205, 0.01); break;
      case 'antenna': add('head', 0x64748b, 0.03, 0.2, 0.03, 0.1, hy + 0.32, 0, 0.005); add('head', hc, 0.08, 0.08, 0.08, 0.1, hy + 0.45, 0, 0.03); break;
      case 'hood': add('head', hc, 0.53, 0.5, 0.42, 0, hy + 0.04, 0.07, 0.09); add('head', hc, 0.53, 0.1, 0.06, 0, hy + 0.25, -0.17, 0.03); break;
      case 'astro': add('head', 0xf1f5f9, 0.58, 0.58, 0.58, 0, hy + 0.01, 0, 0.12); add('head', o.visor || 0x0f172a, 0.42, 0.26, 0.03, 0, hy + 0.02, -0.29, 0.04); break;
      case 'hazmat': add('head', hc, 0.56, 0.56, 0.56, 0, hy + 0.01, 0, 0.12); add('head', 0x111827, 0.38, 0.18, 0.03, 0, hy + 0.04, -0.285, 0.04); add('head', 0x374151, 0.16, 0.14, 0.1, 0, hy - 0.14, -0.3, 0.04); break;
      case 'ninja': add('head', hc, 0.465, 0.465, 0.465, 0, hy, 0, 0.075); add('head', o.skin, 0.32, 0.09, 0.02, 0, hy + 0.05, -0.233, 0.01); add('head', ink, 0.05, 0.05, 0.02, -0.08, hy + 0.05, -0.24, 0.005); add('head', ink, 0.05, 0.05, 0.02, 0.08, hy + 0.05, -0.24, 0.005); add('head', o.hatColor2 || 0xdc2626, 0.475, 0.06, 0.475, 0, hy + 0.13, 0, 0.02); break;
      case 'pizza': add('head', hc, 0.47, 0.13, 0.47, 0, hy + 0.22, 0, 0.04); add('head', hc, 0.38, 0.04, 0.22, 0, hy + 0.17, -0.31, 0.015, { shade: 0.85 }); add('head', 0xfacc15, 0.12, 0.08, 0.02, 0, hy + 0.23, -0.238, 0.01); break;
      case 'halo': add('head', 0xfde68a, 0.36, 0.03, 0.36, 0, hy + 0.42, 0, 0.012); break;
      case 'horns': add('head', 0xb91c1c, 0.07, 0.16, 0.07, -0.15, hy + 0.28, 0, 0.02, { rz: 0.3 }); add('head', 0xb91c1c, 0.07, 0.16, 0.07, 0.15, hy + 0.28, 0, 0.02, { rz: -0.3 }); break;
      default: break;
    }
    if (o.peel) { // banana suit: a big peel around the whole head
      add('head', 0xfde047, 0.56, 0.62, 0.5, 0, hy + 0.08, 0.06, 0.15); add('head', 0x713f12, 0.08, 0.12, 0.08, 0, hy + 0.45, 0.06, 0.03);
    }
    return P;
  }
  AV.outfitParts = outfitParts;

  // ---------------------------------------------------------------- guns (built along -z, grip at the origin)
  const GUN_PARTS = {
    pistol: [[0.05, 0.07, 0.23, 0, 0.06, -0.08], [0.046, 0.13, 0.06, 0, -0.02, 0.0, 1, -0.2], [0.03, 0.025, 0.06, 0, 0.1, -0.15, 2]],
    smg: [[0.06, 0.085, 0.36, 0, 0.05, -0.1], [0.04, 0.17, 0.05, 0, -0.06, -0.13, 1], [0.045, 0.12, 0.055, 0, -0.03, 0.02, 1, -0.2], [0.03, 0.04, 0.17, 0, 0.04, 0.15], [0.025, 0.025, 0.09, 0, 0.06, -0.32, 1]],
    rifle: [[0.065, 0.095, 0.5, 0, 0.05, -0.14], [0.032, 0.032, 0.24, 0, 0.06, -0.5, 1], [0.05, 0.18, 0.07, 0, -0.07, -0.16, 1, 0.25], [0.048, 0.12, 0.06, 0, -0.03, 0.02, 1, -0.2], [0.055, 0.09, 0.22, 0, 0.04, 0.17], [0.03, 0.04, 0.12, 0, 0.12, -0.12, 2]],
    dmr: [[0.065, 0.095, 0.56, 0, 0.05, -0.16], [0.03, 0.03, 0.3, 0, 0.06, -0.58, 1], [0.05, 0.14, 0.07, 0, -0.06, -0.16, 1], [0.048, 0.12, 0.06, 0, -0.03, 0.02, 1, -0.2], [0.06, 0.1, 0.24, 0, 0.03, 0.18, 2], [0.045, 0.045, 0.22, 0, 0.13, -0.14, 1]],
    sniper: [[0.065, 0.09, 0.62, 0, 0.05, -0.18], [0.03, 0.03, 0.42, 0, 0.06, -0.7, 1], [0.05, 0.1, 0.07, 0, -0.04, -0.14, 1], [0.048, 0.12, 0.06, 0, -0.03, 0.02, 1, -0.2], [0.07, 0.12, 0.26, 0, 0.02, 0.2, 2], [0.055, 0.055, 0.3, 0, 0.14, -0.16, 1], [0.07, 0.07, 0.04, 0, 0.14, -0.32, 1]],
    shotgun: [[0.07, 0.09, 0.48, 0, 0.05, -0.15], [0.045, 0.045, 0.34, 0, 0.07, -0.48, 1], [0.06, 0.055, 0.2, 0, 0.0, -0.36, 2], [0.048, 0.12, 0.06, 0, -0.03, 0.02, 1, -0.2], [0.06, 0.1, 0.22, 0, 0.03, 0.18, 2]],
    lmg: [[0.085, 0.11, 0.58, 0, 0.05, -0.16], [0.04, 0.04, 0.32, 0, 0.06, -0.58, 1], [0.12, 0.12, 0.15, 0, -0.07, -0.18, 2], [0.05, 0.12, 0.06, 0, -0.03, 0.02, 1, -0.2], [0.07, 0.1, 0.22, 0, 0.04, 0.19, 1]],
    knife: [[0.035, 0.035, 0.11, 0, 0, 0.0, 1], [0.012, 0.04, 0.17, 0, 0.005, -0.13, 3], [0.06, 0.012, 0.02, 0, 0, -0.055, 2]],
  };
  // colours: 0 body, 1 dark, 2 accent, 3 blade
  AV.gunGeo = function (cls, palette) {
    const pal = palette || [0x3a3f48, 0x1f2329, 0xe8822e, 0xd1d5db];
    const parts = (GUN_PARTS[cls] || GUN_PARTS.rifle).map(p => ({ w: p[0], h: p[1], d: p[2], x: p[3], y: p[4], z: p[5], color: pal[p[6] || 0], r: 0.008, rx: p[7] || 0 }));
    return bake(parts, false);
  };
  // guns for characters, rotated to sit in the right hand. "skinned" ones have a white body so a skin texture shows.
  const gunCache = {};
  AV.mountGun = function (cls, skinned) {
    const k = cls + (skinned ? ':s' : '');
    if (!gunCache[k]) { const g = AV.gunGeo(cls, skinned ? [0xffffff, 0x30343b, 0xe8822e, 0xd1d5db] : null); g.rotateX(-Math.PI / 2); gunCache[k] = g; }
    return gunCache[k];
  };
  const botGun = cls => AV.mountGun(cls, false);

  // ---------------------------------------------------------------- build a character
  AV.build = function (outfit, opts) {
    opts = opts || {};
    const geo = bake(outfitParts(outfit), true);
    const root = new THREE.Group();
    root.rotation.order = 'YXZ';
    const mat = AV.toon();
    const body = new THREE.SkinnedMesh(geo, mat);
    const B = {};
    const bone = (name, x, y, z, parent) => { const b = new THREE.Bone(); b.name = name; b.position.set(x, y, z); (parent || body).add(b); B[name] = b; return b; };
    bone('hips', 0, 0.82, 0);
    bone('spine', 0, 0.08, 0, B.hips);
    bone('head', 0, 0.55, 0, B.spine);
    bone('armL', -0.38, 0.5, 0, B.spine);
    bone('armR', 0.38, 0.5, 0, B.spine);
    bone('legL', -0.125, -0.02, 0, B.hips);
    bone('legR', 0.125, -0.02, 0, B.hips);
    body.updateMatrixWorld(true);
    const skel = new THREE.Skeleton(BONES.map(n => B[n]));
    body.bind(skel);
    root.add(body);
    let outline = null;
    if (opts.outline !== false) {
      outline = new THREE.SkinnedMesh(geo, outlineMat());
      outline.bind(skel, body.bindMatrix);
      root.add(outline);
    }
    const chams = new THREE.SkinnedMesh(geo, chamsMat());
    chams.bind(skel, body.bindMatrix);
    chams.renderOrder = 10; chams.visible = false;
    root.add(chams);
    const ice = new THREE.Mesh(bevelBox(1.05, 1.95, 0.7, 0.1), iceMat());
    ice.position.y = 0.97; ice.visible = false;
    root.add(ice);
    const gunMount = new THREE.Object3D();
    gunMount.position.set(0, -0.6, -0.07);
    B.armR.add(gunMount);
    const av = { root, body, outline, chams, ice, bones: B, mat, geo, gunMount, gun: null, t: Math.random() * 10, ph: 0, aimK: 0, airK: 0, hitAt: -9, kickAt: -9, deadT: 0, outfit, skin: opts.skin || null };
    AV.setGun(av, opts.cls || 'rifle', opts.gunMat, opts.gunGeo);
    root.userData.av = av;
    return av;
  };
  AV.setGun = function (av, cls, material, geometry) {
    if (!material && av.skin && cls !== 'knife') { material = NA.Cosmetics.gunMaterial(av.skin, 'vc'); geometry = AV.mountGun(cls, true); }
    if (av.gun) av.gunMount.remove(av.gun);
    av.gun = new THREE.Mesh(geometry || botGun(cls), material || AV.gunMat());
    if (cls !== 'knife') av.gun.scale.setScalar(1.25);
    av.gun.castShadow = av.body.castShadow;
    av.gunMount.add(av.gun);
    av.cls = cls;
  };
  AV.dispose = function (av) { av.geo.dispose(); av.mat.dispose(); };
  AV.reset = function (av) {
    av.deadT = 0; av.root.rotation.x = 0; av.body.position.y = 0;
    av.mat.opacity = 1; av.mat.transparent = false; av.mat.emissive.setRGB(0, 0, 0);
    av.ice.visible = false;
    if (av.outline) av.outline.visible = true;
    if (av.gun) av.gun.visible = true;
  };
  AV.shadows = function (av, on) { av.body.castShadow = on; if (av.gun) av.gun.castShadow = on; };

  // ---------------------------------------------------------------- animation
  // st: { speed, aim (0/1), pitch, air, dead, deadT, dance, idleLook, bigHead }
  AV.animate = function (av, st, dt) {
    const B = av.bones, t = (av.t += dt), now = performance.now();
    if (st.dead) { animateDeath(av, st.deadT); return; }
    if (st.pose) { animatePose(av, st, t, dt); return; }
    if (av.gunMount.rotation.z) av.gunMount.rotation.z = 0;
    const sp = st.speed || 0, k = Math.min(1, sp / 4);
    av.ph += dt * sp * 2.5;
    const s = Math.sin(av.ph);
    av.aimK = U.lerp(av.aimK, st.aim ? 1 : 0, Math.min(1, dt * 9));
    av.airK = U.lerp(av.airK, st.air ? 1 : 0, Math.min(1, dt * 10));
    const aimK = av.aimK, airK = av.airK, pitch = st.pitch || 0;
    const hit = Math.max(0, 1 - (now - av.hitAt) / 260), kick = Math.max(0, 1 - (now - av.kickAt) / 120);
    // body
    B.hips.position.y = 0.82 + Math.abs(Math.cos(av.ph)) * 0.04 * k - airK * 0.02;
    B.hips.rotation.set(0, Math.sin(av.ph) * 0.08 * k, 0);
    B.spine.rotation.set(-0.12 * k + Math.sin(t * 1.9) * 0.02 * (1 - k) + hit * 0.3, -B.hips.rotation.y, 0);
    // legs
    B.legL.rotation.set(s * 0.85 * k * (1 - airK) + airK * 0.75, 0, 0);
    B.legR.rotation.set(-s * 0.85 * k * (1 - airK) - airK * 0.25, 0, 0);
    // arms: swing when running, raised when aiming, flung up a bit in the air
    const swingL = -s * 0.7 * k, swingR = s * 0.7 * k;
    B.armR.rotation.set(U.lerp(swingR + 0.25, Math.PI / 2 + pitch - kick * 0.18, aimK), 0, U.lerp(airK * 0.45, 0, aimK));
    B.armL.rotation.set(U.lerp(swingL, Math.PI / 2 - 0.12 + pitch, aimK), 0, U.lerp(-airK * 0.45, 0.5, aimK));
    // head
    const look = st.aim ? 0 : Math.sin(t * 0.45) * 0.35 * (1 - k);
    B.head.rotation.set(pitch * 0.6 + hit * 0.25, look, 0);
    const big = st.bigHead ? 2.3 : 1;
    if (B.head.scale.x !== big) B.head.scale.setScalar(big);
    if (st.dance) {
      B.armL.rotation.set(Math.PI * 0.92 + Math.sin(t * 9) * 0.35, 0, Math.sin(t * 9) * 0.5);
      B.armR.rotation.set(Math.PI * 0.92 - Math.sin(t * 9) * 0.35, 0, -Math.sin(t * 9) * 0.5);
      B.hips.rotation.y = Math.sin(t * 4.5) * 0.6;
      B.legL.rotation.x = Math.max(0, Math.sin(t * 9)) * 0.5; B.legR.rotation.x = Math.max(0, -Math.sin(t * 9)) * 0.5;
    }
    if (hit > 0) av.mat.emissive.setRGB(hit * 0.55, hit * 0.55, hit * 0.55);
    else if (av.mat.emissive.r) av.mat.emissive.setRGB(0, 0, 0);
  };
  // Showroom poses: 'ready' (low ready, breathing, looks around, inspects the gun now and then)
  // and 'hype' (a little jump and fist pump after you buy something).
  function animatePose(av, st, t, dt) {
    const B = av.bones, br = Math.sin(t * 1.7);
    const ins = st.inspect || 0, e = ins * ins * (3 - 2 * ins);
    const hype = st.hype || 0, hj = Math.sin(Math.min(1, hype) * Math.PI);
    B.hips.position.y = 0.82 + br * 0.006 + hj * 0.35;
    B.hips.rotation.set(0, 0.05 * Math.sin(t * 0.6), 0);
    B.spine.rotation.set(-0.03 + br * 0.012 - hj * 0.15, 0.16 + e * 0.15, 0);
    B.legL.rotation.set(0.05 + hj * 0.6, 0, -0.07);
    B.legR.rotation.set(-0.07 + hj * 0.2, 0, 0.07);
    // low ready: both hands on the gun, held across the body; inspect raises it to eye level; hype throws it up
    B.armR.rotation.set(U.lerp(U.lerp(0.95 + br * 0.015, 1.5, e), 2.85, hj), U.lerp(0, -0.5, e), U.lerp(U.lerp(-0.64, -0.2, e), -0.2, hj));
    B.armL.rotation.set(U.lerp(U.lerp(0.95 + br * 0.015, 0.12, e), 2.6, hj), 0, U.lerp(U.lerp(0.64, -0.06, e), -0.35, hj));
    av.gunMount.rotation.z = U.lerp(U.lerp(0.6, 0.1, e), 0, hj);
    const look = Math.sin(t * 0.37) * 0.25 + Math.sin(t * 0.13) * 0.15;
    B.head.rotation.set(U.lerp(0.04, 0.28, e) - hj * 0.2, U.lerp(look, -0.55, e), 0);
    if (B.head.scale.x !== 1) B.head.scale.setScalar(1);
    if (av.mat.emissive.r) av.mat.emissive.setRGB(0, 0, 0);
  }
  // fall backwards with a bounce, limbs splayed, then sink and fade
  function animateDeath(av, T) {
    const B = av.bones;
    const f = Math.min(1, T / 0.42), e = 1 - Math.pow(1 - f, 3);
    const bounce = T > 0.42 && T < 0.62 ? Math.sin((T - 0.42) / 0.2 * Math.PI) * 0.12 : 0;
    av.root.rotation.x = -Math.PI / 2 * e + bounce;
    B.armL.rotation.set(0.4 * e, 0, -1.25 * e);
    B.armR.rotation.set(0.6 * e, 0, 1.25 * e);
    B.legL.rotation.set(0.28 * e, 0, -0.15 * e);
    B.legR.rotation.set(-0.18 * e, 0, 0.15 * e);
    B.head.rotation.set(-0.35 * e, 0.3 * e, 0);
    B.spine.rotation.set(0, 0, 0);
    av.mat.emissive.setRGB(0, 0, 0);
    if (T > 1.1) {
      const k = Math.min(1, (T - 1.1) / 0.5);
      av.body.position.y = -k * 0.35;
      av.mat.transparent = true; av.mat.opacity = 1 - k;
      if (av.outline) av.outline.visible = false;
      if (av.gun) av.gun.visible = false;
    }
  }

  NA.Avatar = AV;
})(window.NA);
