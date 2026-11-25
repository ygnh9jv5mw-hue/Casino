/* NO ANTICHEAT: cosmetics bought with credits. Outfits (for your blocky character), gun skins
   (procedural textures), knives (a real melee slot) and kill effects. Plus the daily Item Shop. */
(function (NA) {
  'use strict';
  const U = NA.U, D = NA.DATA;
  const CS = {};
  const S = () => NA.Save.data;
  CS.PRICES = [1500, 4000, 10000, 30000, 80000];

  // ---------------------------------------------------------------- outfits
  const base = { skin: 0xf1c9a5, hair: 0x3b2a20, shirt: 0x2563eb, shirt2: 0x1d4ed8, pants: 0x1e3a5f, shoes: 0xf1f5f9, top: 'tee', hat: null, face: 'smile' };
  const O = (id, name, rarity, desc, o) => ({ id, name, rarity, desc, outfit: Object.assign({}, base, o) });
  CS.OUTFITS = [
    O('recruit', 'Recruit', 0, 'Fresh account energy.', {}),
    O('pizza', 'Pizza Courier', 0, 'Delivers headshots in 30 minutes or less.', { shirt: 0xdc2626, shirt2: 0xb91c1c, pants: 0x1f2937, hat: 'pizza', hatColor: 0xdc2626, logo: 0xfacc15, face: 'smile' }),
    O('street', 'Street', 1, 'Hood up. Aim down.', { shirt: 0x6b7280, shirt2: 0x4b5563, pants: 0x111827, shoes: 0xf1f5f9, top: 'hoodie', hat: 'hood', hatColor: 0x6b7280, face: 'smirk' }),
    O('tactical', 'Tactical', 1, 'Looks like he knows what he is doing.', { skin: 0xc68642, shirt: 0x4d5d3a, shirt2: 0x3f4a2a, pants: 0x6b7280, shoes: 0x1f2937, top: 'tee', vest: 0x3f4a2a, hat: 'helmet', hatColor: 0x4d5d3a, gloves: 0x1f2937, kneepads: 0x1f2937, face: 'angry', belt: 0x1c1917 }),
    O('arctic', 'Arctic', 1, 'Cold aim, colder chat.', { skin: 0xffdbac, shirt: 0xe2e8f0, shirt2: 0x94a3b8, pants: 0xcbd5e1, shoes: 0x475569, top: 'jacket', hat: 'beanie', hatColor: 0xf8fafc, scarf: 0x64748b, gloves: 0x475569, face: 'bored' }),
    O('desert', 'Desert Fox', 1, 'Sand in every crevice of the hitbox.', { skin: 0xe0ac7e, shirt: 0xc8a96a, shirt2: 0xa38550, pants: 0x8a6d3b, shoes: 0x5b4325, hat: 'bandana', hatColor: 0xd6c08a, scarf: 0xd6c08a, face: 'shades', vest: 0x8a6d3b }),
    O('nightops', 'Night Ops', 2, 'You were never here.', { skin: 0x8d5524, shirt: 0x111827, shirt2: 0x0b0f17, pants: 0x0f172a, shoes: 0x0b0f17, top: 'jacket', under: 0x1f2937, vest: 0x1f2937, gloves: 0x0b0f17, face: 'balaclava', mask: 0x0b0f17, hat: null, belt: 0x0b0f17 }),
    O('hazmat', 'Hazmat', 2, 'For lobbies that are toxic.', { shirt: 0xfacc15, shirt2: 0xeab308, pants: 0xfacc15, shoes: 0x111827, top: 'hazmat', hat: 'hazmat', hatColor: 0xfacc15, gloves: 0x111827, cuff: 0x111827 }),
    O('kevin', 'BOT_Kevin', 2, 'He has been practicing.', AV0().STORY.BOT_Kevin),
    O('streamer', 'Streamer', 2, 'Clip it. Chat, clip it.', { skin: 0xe0ac7e, hair: 0x0f0f10, shirt: 0x7c3aed, shirt2: 0x5b21b6, pants: 0x111827, top: 'hoodie', hat: 'headphones', hatColor: 0x111827, logo: 0xf472b6, face: 'surprised' }),
    O('neon', 'Neon Runner', 3, 'Undetected (by the eye).', { skin: 0xc68642, shirt: 0x0b0f17, shirt2: 0x111827, pants: 0x0b0f17, shoes: 0x22d3ee, top: 'jacket', under: 0x0b0f17, neon: 0x22d3ee, stripe2: 0x22d3ee, face: 'visor', visor: 0x22d3ee, gloves: 0x0b0f17 }),
    O('ninja', 'Ninja', 3, 'Silent aim. Literally.', { shirt: 0x111827, shirt2: 0x1f2937, pants: 0x111827, shoes: 0x111827, top: 'gi', belt2: 0xdc2626, hat: 'ninja', hatColor: 0x111827, hatColor2: 0xdc2626, gloves: 0x111827 }),
    O('astro', 'Astronaut', 3, 'Moon gravity, permanently.', { shirt: 0xf1f5f9, shirt2: 0xcbd5e1, pants: 0xf1f5f9, shoes: 0xe2e8f0, top: 'astro', hat: 'astro', visor: 0xb45309, gloves: 0xe2e8f0, backpack: 0xe2e8f0, cuff: 0x94a3b8 }),
    O('hacker', 'Hacker', 3, 'Definitely not suspicious.', { skin: 0xffdbac, shirt: 0x14532d, shirt2: 0x166534, pants: 0x111827, top: 'hoodie', hat: 'hood', hatColor: 0x14532d, logo: 0x4ade80, face: 'shades' }),
    O('angel', 'Legit Player', 3, 'Totally legit. Look at the halo.', { skin: 0xffdbac, hair: 0xe5c07b, shirt: 0xf8fafc, shirt2: 0xe2e8f0, pants: 0xf8fafc, shoes: 0xfde68a, top: 'suit', under: 0xfde68a, tie: 0xfde68a, hat: 'halo', face: 'smile' }),
    O('gold', 'Gold Standard', 4, 'Paid for with an affiliate code.', { skin: 0xc68642, shirt: 0xd4a017, shirt2: 0xb8860b, pants: 0xb8860b, shoes: 0x111827, top: 'suit', under: 0x111827, tie: 0x111827, hat: 'crown', face: 'shades', gloves: 0xfacc15 }),
    O('boss', 'Final Boss', 4, 'The reason people rage quit.', { skin: 0xb91c1c, hair: 0x111827, shirt: 0x111827, shirt2: 0x450a0a, pants: 0x111827, shoes: 0x450a0a, top: 'jacket', under: 0x7f1d1d, hat: 'horns', cape: 0x450a0a, face: 'angry', gloves: 0x111827 }),
    O('banana', 'Banana', 4, 'Peak performance.', { skin: 0xfde047, shirt: 0xfde047, shirt2: 0xfacc15, pants: 0xfde047, shoes: 0xfde047, top: 'tee', peel: true, face: 'smile', bald: true }),
  ];
  function AV0() { return NA.Avatar; }

  // ---------------------------------------------------------------- gun skins (canvas textures)
  CS.GUN_SKINS = [
    { id: 'factory', name: 'Factory New', rarity: 0, desc: 'Straight off the line.' },
    { id: 'forest', name: 'Forest Camo', rarity: 0, desc: 'Blends into hedges.' },
    { id: 'arctic', name: 'Arctic Camo', rarity: 1, desc: 'White on white on white.' },
    { id: 'tiger', name: 'Desert Tiger', rarity: 1, desc: 'Stripes add +0 damage.' },
    { id: 'carbon', name: 'Carbon Fiber', rarity: 1, desc: 'Lighter. Probably.' },
    { id: 'redline', name: 'Redline', rarity: 2, desc: 'Fast car energy.' },
    { id: 'ocean', name: 'Deep Ocean', rarity: 2, desc: 'Calm waters, loud gun.' },
    { id: 'neon', name: 'Neon Grid', rarity: 3, desc: 'Glows. Snitches on you in the dark.' },
    { id: 'toxic', name: 'Toxic', rarity: 3, desc: 'Like the lobby chat.' },
    { id: 'galaxy', name: 'Galaxy', rarity: 3, desc: 'Space-grade aim assist (not included).' },
    { id: 'gold', name: 'Gold Plated', rarity: 4, desc: 'Flex on the bots.' },
    { id: 'glitch', name: 'RGB Glitch', rarity: 4, desc: '+0% performance. Looks sick.' },
  ];
  const texCache = {};
  CS.gunTexture = function (id) {
    if (id === 'factory') return null;
    if (texCache[id]) return texCache[id];
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const r = (() => { let x = id.length * 9301 + 49297; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; }; })();
    const blobs = (cols, n, rmin, rmax) => { for (let i = 0; i < n; i++) { g.fillStyle = cols[i % cols.length]; g.beginPath(); g.ellipse(r() * 128, r() * 128, rmin + r() * (rmax - rmin), rmin + r() * (rmax - rmin) * 0.6, r() * 3, 0, Math.PI * 2); g.fill(); } };
    switch (id) {
      case 'forest': g.fillStyle = '#4b5d3a'; g.fillRect(0, 0, 128, 128); blobs(['#2f3b24', '#6b5a3a', '#7a8b52', '#1f2618'], 26, 8, 22); break;
      case 'arctic': g.fillStyle = '#e5e7eb'; g.fillRect(0, 0, 128, 128); blobs(['#9ca3af', '#f9fafb', '#6b7280', '#d1d5db'], 24, 8, 20); break;
      case 'tiger': g.fillStyle = '#d97706'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#1c1917'; for (let i = 0; i < 10; i++) { g.beginPath(); const y = i * 13 + r() * 6; g.moveTo(0, y); g.bezierCurveTo(40, y - 8, 80, y + 10, 128, y - 2); g.lineTo(128, y + 4); g.bezierCurveTo(80, y + 14, 40, y - 2, 0, y + 5); g.fill(); } break;
      case 'carbon': for (let y = 0; y < 128; y += 8) for (let x = 0; x < 128; x += 8) { const gr = g.createLinearGradient(x, y, x + 8, y + 8); const a = ((x + y) / 8) % 2 ? ['#111', '#3a3a3a'] : ['#3a3a3a', '#111']; gr.addColorStop(0, a[0]); gr.addColorStop(1, a[1]); g.fillStyle = gr; g.fillRect(x, y, 8, 8); } break;
      case 'redline': g.fillStyle = '#b91c1c'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#111827'; for (let i = 0; i < 6; i++) g.fillRect(0, 10 + i * 22, 128, 4); g.fillStyle = '#fca5a5'; g.fillRect(0, 60, 128, 2); break;
      case 'ocean': { const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, '#0ea5e9'); gr.addColorStop(1, '#1e3a8a'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 3; for (let i = 0; i < 7; i++) { g.beginPath(); for (let x = 0; x <= 128; x += 8) g.lineTo(x, 12 + i * 18 + Math.sin(x / 12 + i) * 4); g.stroke(); } break; }
      case 'neon': g.fillStyle = '#0b1020'; g.fillRect(0, 0, 128, 128); g.strokeStyle = '#22d3ee'; g.lineWidth = 2; g.shadowColor = '#22d3ee'; g.shadowBlur = 6; for (let i = 0; i <= 128; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.moveTo(0, i); g.lineTo(128, i); g.stroke(); } break;
      case 'toxic': g.fillStyle = '#0a0f0a'; g.fillRect(0, 0, 128, 128); g.fillStyle = '#4ade80'; g.shadowColor = '#4ade80'; g.shadowBlur = 8; for (let i = 0; i < 9; i++) { const x = r() * 128, w = 6 + r() * 10, h = 20 + r() * 60; g.fillRect(x, 0, w, h); g.beginPath(); g.arc(x + w / 2, h, w / 2, 0, Math.PI * 2); g.fill(); } break;
      case 'galaxy': { const gr = g.createRadialGradient(50, 60, 5, 64, 64, 90); gr.addColorStop(0, '#a855f7'); gr.addColorStop(0.5, '#3b0764'); gr.addColorStop(1, '#0b0218'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); g.fillStyle = '#fff'; for (let i = 0; i < 70; i++) { const s = r() < 0.9 ? 1 : 2; g.fillRect(r() * 128, r() * 128, s, s); } break; }
      case 'gold': { const gr = g.createLinearGradient(0, 0, 128, 128); gr.addColorStop(0, '#fde68a'); gr.addColorStop(0.35, '#d4a017'); gr.addColorStop(0.6, '#fff3b0'); gr.addColorStop(1, '#b8860b'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); break; }
      case 'glitch': for (let i = 0; i < 16; i++) { g.fillStyle = `hsl(${i * 22.5},90%,55%)`; g.fillRect(0, i * 8, 128, 8); } g.fillStyle = 'rgba(0,0,0,0.35)'; for (let i = 0; i < 12; i++) g.fillRect(r() * 128, r() * 128, 30 * r() + 10, 3); break;
      default: g.fillStyle = '#555'; g.fillRect(0, 0, 128, 128);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    texCache[id] = t;
    return t;
  };
  // one material per skin, shared by the viewmodel and the showroom gun
  const gunMats = {};
  // 'vm' for the first-person gun (plain boxes), 'vc' for character guns that carry vertex colours
  CS.gunMaterial = function (id, variant) {
    variant = variant || 'vm';
    if (id === 'factory' && variant === 'vc') return NA.Avatar.gunMat();
    const key = id + ':' + variant;
    if (gunMats[key]) return gunMats[key];
    const tex = CS.gunTexture(id);
    const opts = tex ? { map: tex, color: 0xffffff } : { color: 0x454a53 };
    if (id === 'neon' || id === 'toxic' || id === 'glitch') opts.emissive = new THREE.Color(id === 'toxic' ? 0x0f3d1e : id === 'neon' ? 0x07303a : 0x222222);
    if (variant === 'vc') opts.vertexColors = true;
    gunMats[key] = new THREE.MeshToonMaterial(Object.assign({ gradientMap: NA.Avatar.grad() }, opts));
    return gunMats[key];
  };
  CS.tick = function (now) {
    const t = texCache.glitch;
    if (t) t.offset.y = (now / 4000) % 1;
  };

  // ---------------------------------------------------------------- knives
  // parts: [w, h, d, x, y, z, colourIndex, rotX]; colours: handle, blade, accent. Built along -z.
  CS.KNIVES = [
    { id: 'combat', name: 'Combat Knife', rarity: 0, desc: 'Standard issue pointy thing.', pal: [0x1f2937, 0xd1d5db, 0x374151], parts: [[0.035, 0.035, 0.11, 0, 0, 0.02, 0], [0.07, 0.014, 0.022, 0, 0, -0.045, 2], [0.012, 0.04, 0.17, 0, 0.005, -0.14, 1], [0.012, 0.02, 0.04, 0, 0.014, -0.235, 1, -0.5]] },
    { id: 'flip', name: 'Flip Blade', rarity: 1, desc: 'Click-clack.', pal: [0x7c2d12, 0xe5e7eb, 0xfacc15], parts: [[0.03, 0.03, 0.12, 0, 0, 0.02, 0], [0.034, 0.034, 0.02, 0, 0, -0.045, 2], [0.01, 0.034, 0.15, 0, 0.004, -0.13, 1]] },
    { id: 'cleaver', name: 'Cleaver', rarity: 2, desc: 'For chopping K/D ratios.', pal: [0x3f2a1d, 0xcbd5e1, 0x111827], parts: [[0.035, 0.035, 0.1, 0, 0, 0.03, 0], [0.012, 0.11, 0.15, 0, 0.035, -0.1, 1], [0.013, 0.02, 0.02, 0, 0.07, -0.05, 2]] },
    { id: 'hook', name: 'Hook Claw', rarity: 3, desc: 'Curved, like your aim before cheats.', pal: [0x111827, 0x9ca3af, 0xdc2626], parts: [[0.035, 0.035, 0.1, 0, 0, 0.03, 0], [0.045, 0.045, 0.02, 0, 0, -0.035, 2], [0.012, 0.03, 0.09, 0, 0.012, -0.08, 1, 0.35], [0.012, 0.03, 0.09, 0, 0.0, -0.15, 1, -0.45], [0.012, 0.026, 0.05, 0, -0.03, -0.19, 1, -1.1]] },
    { id: 'bone', name: 'Bone Shiv', rarity: 3, desc: 'Found it in the warehouse. Don\'t ask.', pal: [0xe7e5e4, 0xf5f5f4, 0xa8a29e], parts: [[0.04, 0.04, 0.1, 0, 0, 0.03, 0], [0.05, 0.05, 0.03, 0, 0, -0.03, 2], [0.016, 0.035, 0.16, 0, 0, -0.12, 1], [0.012, 0.02, 0.05, 0, 0.004, -0.22, 1]] },
    { id: 'katana', name: 'Neon Katana', rarity: 4, desc: 'Brought a sword to a gunfight. Won.', pal: [0x111827, 0x22d3ee, 0xf472b6], glow: 0x22d3ee, parts: [[0.035, 0.035, 0.16, 0, 0, 0.05, 0], [0.08, 0.012, 0.08, 0, 0, -0.04, 2], [0.01, 0.035, 0.42, 0, 0.004, -0.29, 1]] },
  ];
  const knifeGeo = {};
  CS.knifeGeometry = function (id) {
    if (knifeGeo[id]) return knifeGeo[id];
    const k = CS.KNIVES.find(x => x.id === id) || CS.KNIVES[0];
    const parts = k.parts.map(p => ({ w: p[0], h: p[1], d: p[2], x: p[3], y: p[4], z: p[5], color: k.pal[p[6]], r: 0.004, rx: p[7] || 0 }));
    knifeGeo[id] = NA.Avatar.bake(parts, false);
    return knifeGeo[id];
  };

  // ---------------------------------------------------------------- kill effects
  CS.KILL_FX = [
    { id: 'default', name: 'Classic Pop', rarity: 0, desc: 'Bits of bot.' },
    { id: 'confetti', name: 'Confetti', rarity: 1, desc: 'Every kill is a party.' },
    { id: 'pixels', name: 'Deleted', rarity: 2, desc: 'They dissolve into green pixels.' },
    { id: 'flames', name: 'Flame Out', rarity: 3, desc: 'Gone in a puff of fire.' },
    { id: 'lightning', name: 'Smite', rarity: 4, desc: 'A lightning bolt. For a bot.' },
    { id: 'hearts', name: 'No Hard Feelings', rarity: 2, desc: 'Sorry. Not sorry.' },
  ];

  // ---------------------------------------------------------------- ownership, equipping
  const KIND = { outfit: 'OUTFITS', gunskin: 'GUN_SKINS', knife: 'KNIVES', killfx: 'KILL_FX' };
  const DEFAULT = { outfit: 'recruit', gunskin: 'factory', knife: 'combat', killfx: 'default' };
  CS.list = kind => CS[KIND[kind]];
  CS.get = (kind, id) => CS.list(kind).find(x => x.id === id) || CS.list(kind)[0];
  CS.price = (kind, id) => CS.PRICES[CS.get(kind, id).rarity];
  CS.owns = (kind, id) => id === DEFAULT[kind] || (S().cosmetics.owned || []).indexOf(kind + ':' + id) >= 0;
  CS.equipped = kind => { const v = S().cosmetics[kind]; return v && CS.owns(kind, v) ? v : DEFAULT[kind]; };
  CS.equip = function (kind, id) {
    if (!CS.owns(kind, id)) return false;
    S().cosmetics[kind] = id;
    NA.Save.save();
    if (NA.Showroom) NA.Showroom.refresh();
    return true;
  };
  CS.buy = function (kind, id, price) {
    const s = S();
    price = price === undefined ? CS.price(kind, id) : price;
    if (CS.owns(kind, id) || s.credits < price) return false;
    s.credits -= price;
    s.cosmetics.owned = (s.cosmetics.owned || []).concat([kind + ':' + id]);
    CS.equip(kind, id);
    if ((s.cosmetics.owned || []).filter(x => /^(outfit|gunskin|knife|killfx):/.test(x)).length >= 10) NA.Game.achieve('drip', 'Drip Check');
    NA.Save.save();
    return true;
  };
  CS.outfit = () => CS.get('outfit', CS.equipped('outfit')).outfit;

  // ---------------------------------------------------------------- daily Item Shop
  // Four featured items a day at 20% off, picked by the date.
  CS.featured = function () {
    const d = new Date(), seed = d.getFullYear() * 400 + d.getMonth() * 31 + d.getDate();
    let x = seed * 2654435761 >>> 0;
    const r = () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; };
    const pool = [];
    for (const kind of Object.keys(KIND)) for (const it of CS.list(kind)) if (it.id !== DEFAULT[kind]) pool.push({ kind, id: it.id, rarity: it.rarity });
    const out = [];
    while (out.length < 4 && pool.length) {
      const it = pool.splice(Math.floor(r() * pool.length), 1)[0];
      if (out.some(o => o.kind === it.kind) && out.length < 3) { if (r() < 0.6) continue; }
      out.push(Object.assign(it, { price: Math.round(CS.PRICES[it.rarity] * 0.8) }));
    }
    const end = new Date(d); end.setHours(24, 0, 0, 0);
    return { items: out, resetsIn: end - d };
  };

  NA.Cosmetics = CS;
})(window.NA);
