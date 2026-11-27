/* NO ANTICHEAT: 5v5 agents. 16 agents in 4 roles, each with a bought ability (C), a free signature
   ability (E, refills every round) and an ultimate (X, charged by kills, deaths, plants and defuses).
   Every ability is built from a small set of effects: flash, dash, buff, blast, slow, smoke, invis,
   decoy, jam, mark, teleport, wall, shield, trap, turret, field and reveal. The player and the bots
   use the same code. Only runs in Payload matches. */
(function (NA) {
  'use strict';
  const U = NA.U;
  const AG = NA.Agents = {};
  const DEG = Math.PI / 180;

  const ROLES = {
    breacher: { name: 'Breacher', color: '#fb923c', tag: 'Break into sites and start the fight' },
    ghost: { name: 'Ghost', color: '#a78bfa', tag: 'Smoke, hide and confuse' },
    warden: { name: 'Warden', color: '#4ade80', tag: 'Lock a site down' },
    scout: { name: 'Scout', color: '#38bdf8', tag: 'Find them before they find you' },
  };
  AG.ROLES = ROLES;

  // c: bought charges (cost each, max), e: signature (free every round), x: ultimate (points)
  const LIST = [
    // ---------------------------------------------------------------- breachers
    { id: 'spark', name: 'Spark', role: 'breacher', color: '#facc15', bio: 'Blinds first, asks questions never.',
      c: { name: 'Flashbang', kind: 'flash', cost: 250, max: 2, range: 18, r: 18, dur: 2.2, delay: 0.45, desc: 'Throw a flash. Enemies who can see it are blinded for 2 s.' },
      e: { name: 'Dash', kind: 'dash', max: 1, dist: 7, desc: 'Dash 7 m in the direction you are moving.' },
      x: { name: 'Overcharge', kind: 'buff', ult: 6, dur: 8, speed: 1.3, rate: 1.3, desc: 'For 8 s you move 30% faster and fire 30% faster.' } },
    { id: 'rook', name: 'Rook', role: 'breacher', color: '#fb923c', bio: 'If it is behind a wall, it is in range.',
      c: { name: 'Sticky Charge', kind: 'blast', cost: 300, max: 2, range: 16, r: 4.5, dmg: 85, delay: 1.4, desc: 'Stick a charge where you aim. It blows up after 1.4 s.' },
      e: { name: 'Concussion', kind: 'slow', max: 1, range: 18, r: 6, dur: 3.5, slow: 0.5, desc: 'Concuss an area: enemies inside move at half speed for 3.5 s.' },
      x: { name: 'Demolition', kind: 'blast', ult: 7, range: 22, r: 6.5, dmg: 150, delay: 1.6, count: 3, desc: 'Three heavy charges along your aim. Clear a site in one go.' } },
    { id: 'blitz', name: 'Blitz', role: 'breacher', color: '#f43f5e', bio: 'Never stops moving. Kills only make it faster.',
      c: { name: 'Adrenaline', kind: 'buff', cost: 200, max: 1, dur: 6, speed: 1.25, reload: 0.5, desc: 'For 6 s: 25% faster and reloads take half the time.' },
      e: { name: 'Slide', kind: 'dash', max: 1, dist: 6, resetOnKill: true, desc: 'Slide 6 m. Getting a kill gives the slide back.' },
      x: { name: 'Rampage', kind: 'buff', ult: 6, dur: 10, rate: 1.2, healOnKill: true, desc: 'For 10 s: every kill heals you to full and resets Slide.' } },
    { id: 'quake', name: 'Quake', role: 'breacher', color: '#d97706', bio: 'Shakes the floor under your feet.',
      c: { name: 'Ground Slam', kind: 'slow', at: 'self', cost: 200, max: 2, r: 7, dur: 2.5, slow: 0.5, dmg: 15, desc: 'Slam the ground: enemies within 7 m take damage and are slowed.' },
      e: { name: 'Aftershock', kind: 'blast', max: 1, range: 20, r: 3.5, dmg: 70, delay: 1.0, desc: 'A shockwave goes off where you aim after 1 s.' },
      x: { name: 'Fault Line', kind: 'slow', at: 'cone', ult: 7, range: 30, cone: 32, dur: 4, slow: 0.4, dmg: 25, desc: 'Rip the floor open in front of you: everyone in the way is concussed for 4 s.' } },
    // ---------------------------------------------------------------- ghosts
    { id: 'hush', name: 'Hush', role: 'ghost', color: '#a78bfa', bio: 'Smoke, silence and a knife in the back.',
      c: { name: 'Smoke', kind: 'smoke', cost: 150, max: 2, range: 30, r: 3.8, dur: 14, desc: 'Throw a smoke cloud that blocks vision for 14 s.' },
      e: { name: 'Vanish', kind: 'invis', max: 1, dur: 3, desc: 'Turn invisible for 3 s. Shooting ends it.' },
      x: { name: 'Whiteout', kind: 'smoke', ult: 6, range: 30, r: 4.2, dur: 16, count: 3, spread: 7, invis: 5, desc: 'Three big smokes across where you aim, and you vanish for 5 s.' } },
    { id: 'mirage', name: 'Mirage', role: 'ghost', color: '#f472b6', bio: 'Nobody is sure which one is real.',
      c: { name: 'Decoy', kind: 'decoy', cost: 200, max: 2, dur: 5, desc: 'Send a hologram of yourself running forward. Enemies who spot it are revealed.' },
      e: { name: 'Blur', kind: 'invis', max: 1, dur: 2, speed: 1.35, desc: '2 s of invisibility with a burst of speed.' },
      x: { name: 'Mirror Hall', kind: 'decoy', ult: 6, dur: 7, count: 4, desc: 'Four holograms fan out in front of you.' } },
    { id: 'static', name: 'Static', role: 'ghost', color: '#2dd4bf', bio: 'Lives in your headset. Hates your minimap.',
      c: { name: 'Static Fog', kind: 'smoke', cost: 150, max: 2, range: 28, r: 3.6, dur: 12, jam: true, desc: 'A smoke that also jams the minimap of anyone inside it.' },
      e: { name: 'Jam', kind: 'jam', max: 1, range: 22, r: 8, dur: 5, desc: 'Jam an area: enemies lose their minimap and react slower for 5 s.' },
      x: { name: 'Blackout', kind: 'jam', at: 'global', ult: 7, dur: 8, desc: 'Every enemy loses their minimap and reacts slower for 8 s.' } },
    { id: 'shade', name: 'Shade', role: 'ghost', color: '#818cf8', bio: 'Steps out of one shadow and into another.',
      c: { name: 'Shadow Step', kind: 'teleport', cost: 150, max: 2, desc: 'Teleport back to your shadow mark.' },
      e: { name: 'Mark', kind: 'mark', max: 1, desc: 'Leave a shadow mark where you stand. Shadow Step brings you back to it.' },
      x: { name: 'Nightfall', kind: 'flash', at: 'global', ult: 7, dur: 3.2, desc: 'Night falls on every enemy: all of them are blinded for 3 s.' } },
    // ---------------------------------------------------------------- wardens
    { id: 'bulwark', name: 'Bulwark', role: 'warden', color: '#4ade80', bio: 'Holds the line. Literally.',
      c: { name: 'Fortify', kind: 'shield', cost: 200, max: 2, amt: 40, desc: 'Give yourself 40 shield.' },
      e: { name: 'Barrier', kind: 'wall', max: 1, range: 10, w: 6, h: 3, dur: 20, desc: 'Raise a wall that stops bullets and people for 20 s.' },
      x: { name: 'Bastion', kind: 'shield', at: 'team', ult: 6, amt: 50, wall: true, desc: 'Every teammate gets 50 shield, and a wall goes up in front of you.' } },
    { id: 'tripwire', name: 'Tripwire', role: 'warden', color: '#a3e635', bio: 'Every doorway has a laser. Every laser snitches.',
      c: { name: 'Laser Trap', kind: 'trap', cost: 200, max: 2, range: 10, r: 2.4, slow: 0.5, dur: 3, reveal: 4, desc: 'Place a laser trap. Enemies who cross it are slowed and revealed.' },
      e: { name: 'Snitch', kind: 'reveal', max: 1, range: 26, r: 12, dur: 4, desc: 'Ping an area: enemies within 12 m of it are revealed for 4 s.' },
      x: { name: 'Lockgrid', kind: 'reveal', at: 'self', ult: 7, r: 40, dur: 6, slow: 0.7, slowDur: 2.5, desc: 'Every enemy within 40 m is revealed for 6 s and slowed.' } },
    { id: 'anchor', name: 'Anchor', role: 'warden', color: '#10b981', bio: 'Sets up shop. The turret does the talking.',
      c: { name: 'Shock Mine', kind: 'trap', cost: 150, max: 2, range: 10, r: 2.6, dmg: 60, reveal: 2, desc: 'A hidden mine that shocks the first enemy to walk over it.' },
      e: { name: 'Turret', kind: 'turret', max: 1, range: 6, hp: 80, dmg: 9, rate: 3.5, dur: 25, desc: 'Place a turret that shoots enemies in front of it for 25 s.' },
      x: { name: 'Overclock', kind: 'turret', ult: 7, range: 6, hp: 220, dmg: 14, rate: 5, dur: 22, big: true, desc: 'A heavy turret: more health, more damage, faster.' } },
    { id: 'lockdown', name: 'Lockdown', role: 'warden', color: '#34d399', bio: 'No plant. No defuse. No problem.',
      c: { name: 'Snare', kind: 'slow', cost: 200, max: 2, range: 18, r: 5, dur: 3, slow: 0.5, desc: 'Snare an area: enemies inside move at half speed for 3 s.' },
      e: { name: 'Lock Field', kind: 'field', max: 1, range: 15, r: 6, dur: 12, slow: 0.85, desc: 'A field where enemies cannot plant or defuse, for 12 s.' },
      x: { name: 'Containment', kind: 'field', ult: 7, range: 25, r: 12, dur: 12, slow: 0.6, desc: 'A huge lock field: no plant, no defuse, and everyone inside is slowed.' } },
    // ---------------------------------------------------------------- scouts
    { id: 'ping', name: 'Ping', role: 'scout', color: '#38bdf8', bio: 'Sends the drone in first. Always.',
      c: { name: 'Pulse', kind: 'reveal', at: 'self', cost: 150, max: 2, r: 15, dur: 2.5, desc: 'Reveal every enemy within 15 m of you.' },
      e: { name: 'Tag Drone', kind: 'reveal', at: 'cone', max: 1, range: 35, cone: 22, dur: 4, desc: 'A drone flies ahead and tags every enemy in front of you for 4 s.' },
      x: { name: 'Overwatch', kind: 'reveal', at: 'global', ult: 6, dur: 6, desc: 'Every enemy on the map is revealed for 6 s.' } },
    { id: 'echo', name: 'Echo', role: 'scout', color: '#22d3ee', bio: 'Hears footsteps three rooms away.',
      c: { name: 'Sonar', kind: 'reveal', cost: 200, max: 2, range: 25, r: 14, dur: 3, desc: 'A sonar ping where you aim reveals enemies around it.' },
      e: { name: 'Footsteps', kind: 'reveal', at: 'self', max: 1, r: 25, dur: 6, moving: true, desc: 'Reveal every enemy moving within 25 m.' },
      x: { name: 'Resonance', kind: 'reveal', at: 'global', ult: 6, dur: 5, desc: 'Every enemy on the map is revealed for 5 s.' } },
    { id: 'hawk', name: 'Hawk', role: 'scout', color: '#60a5fa', bio: 'One arrow to find you. One to finish it.',
      c: { name: 'Shock Arrow', kind: 'blast', cost: 250, max: 2, range: 30, r: 3.5, dmg: 70, delay: 0.6, desc: 'An arrow that shocks everyone near where it lands.' },
      e: { name: 'Recon Arrow', kind: 'reveal', max: 1, range: 40, r: 18, dur: 4, desc: 'An arrow that reveals enemies within 18 m of where it lands.' },
      x: { name: "Hunter's Fury", kind: 'buff', ult: 7, dur: 8, dmg: 1.35, reveal: 4, desc: 'Every enemy is revealed for 4 s and your shots hit 35% harder for 8 s.' } },
    { id: 'relay', name: 'Relay', role: 'scout', color: '#7dd3fc', bio: 'What Relay sees, the whole team sees.',
      c: { name: 'Boost', kind: 'buff', at: 'team', cost: 200, max: 1, r: 14, dur: 6, speed: 1.15, rate: 1.15, desc: 'You and teammates within 14 m move and shoot 15% faster for 6 s.' },
      e: { name: 'Team Scan', kind: 'reveal', at: 'self', max: 1, r: 25, dur: 4, desc: 'Reveal enemies within 25 m to the whole team.' },
      x: { name: 'Uplink', kind: 'buff', at: 'team', ult: 7, r: 999, dur: 8, rate: 1.15, reveal: 8, desc: 'Every enemy is revealed for 8 s and the team shoots 15% faster.' } },
  ];
  const BY = {};
  LIST.forEach(a => { BY[a.id] = a; a.c.slot = 'c'; a.e.slot = 'e'; a.x.slot = 'x'; a.e.free = true; });
  AG.LIST = LIST; AG.BY = BY;
  AG.byRole = role => LIST.filter(a => a.role === role);

  // ---------------------------------------------------------------- per-entity state
  const ST = () => ({ blind: 0, slow: 0, slowMul: 1, invis: 0, jam: 0, reveal: 0, buff: null, buffT: 0, dashT: 0, dvx: 0, dvz: 0, distractT: 0, dx: 0, dz: 0 });
  AG.st = e => e.st || (e.st = ST());
  AG.kit = function (agentId) {
    const a = BY[agentId];
    return { agent: agentId, c: 0, e: a ? a.e.max : 0, ult: 0, mark: null, markMesh: null };
  };
  AG.ultMax = e => (e.kit && BY[e.kit.agent] ? BY[e.kit.agent].x.ult : 7);
  AG.addUlt = (e, n) => { if (e.kit) e.kit.ult = Math.min(AG.ultMax(e), e.kit.ult + n); };
  AG.ready = (e, slot) => {
    const k = e.kit, a = k && BY[k.agent];
    if (!a) return false;
    if (slot === 'x') return k.ult >= a.x.ult;
    if (a[slot].kind === 'teleport' && !k.mark) return false;
    return k[slot] > 0;
  };
  // multipliers from buffs and slows
  AG.speedMul = e => {
    const s = e.st;
    if (!s) return 1;
    let m = 1;
    if (s.slow > 0) m *= s.slowMul;
    if (s.buffT > 0 && s.buff.speed) m *= s.buff.speed;
    for (const o of objs) if (o.type === 'field' && o.team !== e.team && o.slow && dist2(o, e.pos) < o.r * o.r) { m *= o.slow; break; }
    return m;
  };
  AG.rateMul = e => (e.st && e.st.buffT > 0 && e.st.buff.rate ? e.st.buff.rate : 1);
  AG.reloadMul = e => (e.st && e.st.buffT > 0 && e.st.buff.reload ? e.st.buff.reload : 1);
  AG.dmgMul = e => (e.st && e.st.buffT > 0 && e.st.buff.dmg ? e.st.buff.dmg : 1);
  // can the viewer not see the target? (invisible, or a smoke in between)
  AG.hidden = function (viewer, target, d) {
    const s = target.st;
    if (s && s.invis > 0 && d > 2.5) return true;
    return AG.smokeBetween(viewer.pos.x, viewer.pos.z, target.pos.x, target.pos.z);
  };
  AG.smokeBetween = function (ax, az, bx, bz) {
    for (const o of objs) {
      if (o.type !== 'smoke') continue;
      if (segCircle(ax, az, bx, bz, o.x, o.z, o.r * 0.92)) return true;
    }
    return false;
  };
  AG.inSmoke = (x, z, pad) => objs.some(o => o.type === 'smoke' && Math.hypot(o.x - x, o.z - z) < o.r + (pad || 0));
  AG.lockedOut = e => objs.some(o => o.type === 'field' && o.team !== e.team && dist2(o, e.pos) < o.r * o.r);

  function segCircle(ax, az, bx, bz, cx, cz, r) {
    const dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz;
    let t = L ? ((cx - ax) * dx + (cz - az) * dz) / L : 0;
    t = Math.max(0, Math.min(1, t));
    const px = ax + dx * t - cx, pz = az + dz * t - cz;
    return px * px + pz * pz < r * r;
  }
  const dist2 = (o, p) => (o.x - p.x) * (o.x - p.x) + (o.z - p.z) * (o.z - p.z);
  const G = () => NA.Game;
  const W = () => NA.World;
  const scene = () => NA.R.scene;
  const enemiesOf = e => G().entities().filter(o => o.alive && o.team !== e.team);
  const alliesOf = e => G().entities().filter(o => o.alive && o.team === e.team);
  const eyeY = e => e.pos.y + (e.isPlayer ? 1.6 : 1.55);

  // ---------------------------------------------------------------- effects on entities
  function blind(e, dur) {
    const s = AG.st(e);
    s.blind = Math.max(s.blind, dur);
    if (e.isPlayer) { NA.haptic && NA.haptic('HEAVY'); }
    else { e.target = null; e.canSee = false; e.reactT = Math.max(e.reactT || 0, 0.4); }
  }
  function slow(e, dur, mul) { const s = AG.st(e); s.slow = Math.max(s.slow, dur); s.slowMul = Math.min(s.slow > dur ? s.slowMul : 1, mul); }
  function reveal(e, dur) { const s = AG.st(e); s.reveal = Math.max(s.reveal, dur); }
  AG.reveal = reveal;
  function jam(e, dur) { const s = AG.st(e); s.jam = Math.max(s.jam, dur); }
  function hurt(e, dmg, owner) { if (e.alive && dmg > 0) G().hooks.damageEnt(e, dmg, owner, false, { ability: true }); }

  // ---------------------------------------------------------------- aiming
  // Where an ability lands: the crosshair for the player, a point the bot picked for bots.
  // Stops at walls (pulled back a little) and can be snapped to the floor.
  const tv = new THREE.Vector3(), td = new THREE.Vector3();
  function aimPoint(e, range, aim, ground) {
    const Wd = W();
    const ox = e.pos.x, oy = eyeY(e), oz = e.pos.z;
    let dx, dy, dz, maxT;
    if (aim) {
      dx = aim.x - ox; dy = (aim.y === undefined ? e.pos.y + 1 : aim.y) - oy; dz = aim.z - oz;
      const L = Math.hypot(dx, dy, dz) || 1;
      dx /= L; dy /= L; dz /= L; maxT = Math.min(L, range);
    } else {
      G().aimDir(td);
      dx = td.x; dy = td.y; dz = td.z; maxT = range;
    }
    const t = Wd.ray(ox, oy, oz, dx, dy, dz, maxT);
    const k = Math.max(0.4, Math.min(t, maxT) - 0.35);
    const p = { x: ox + dx * k, y: oy + dy * k, z: oz + dz * k };
    if (ground) {
      const g = Wd.groundAt(p.x, p.z, 0.1, p.y + 0.3);
      p.y = g < -10 ? 0 : g;
    }
    return p;
  }
  AG.aimPoint = aimPoint;
  function facing(e) { return { x: -Math.sin(e.yaw), z: -Math.cos(e.yaw) }; }

  // ---------------------------------------------------------------- persistent objects
  const objs = [];
  AG.objs = objs;
  const MAT = {};
  function mat(key, make) { return MAT[key] || (MAT[key] = make()); }
  const hex = c => parseInt(String(c).replace('#', ''), 16);
  function addObj(o) { objs.push(o); if (o.mesh) scene().add(o.mesh); return o; }
  function removeObj(o) {
    const i = objs.indexOf(o);
    if (i >= 0) objs.splice(i, 1);
    if (o.collider) { const cs = W().current.colliders, k = cs.indexOf(o.collider); if (k >= 0) cs.splice(k, 1); }
    if (o.mesh) {
      scene().remove(o.mesh);
      o.mesh.traverse(m => { if (m.geometry && !m.geometry.userData.keep) m.geometry.dispose(); });
      if (o.mesh.userData.av) NA.Avatar.dispose(o.mesh.userData.av);
    }
  }
  AG.clear = function () {
    while (objs.length) removeObj(objs[0]);
    if (NA.Game && NA.Game.entities) for (const e of NA.Game.entities()) {
      e.st = ST();
      if (e.kit && e.kit.markMesh) { scene().remove(e.kit.markMesh); e.kit.markMesh = null; }
      if (e.kit) e.kit.mark = null;
      if (!e.isPlayer && e.mesh && e.alive) e.mesh.visible = true;
    }
  };

  function smokeMesh(r, color) {
    const g = new THREE.Group();
    const m1 = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 12), mat('smoke' + color, () => new THREE.MeshLambertMaterial({ color: hex(color), transparent: true, opacity: 0.93, side: THREE.DoubleSide, depthWrite: false })));
    m1.scale.y = 0.85; m1.position.y = r * 0.62;
    const m2 = new THREE.Mesh(new THREE.SphereGeometry(r * 0.7, 12, 8), mat('smokeIn' + color, () => new THREE.MeshLambertMaterial({ color: hex(color), transparent: true, opacity: 0.6, depthWrite: false })));
    m2.position.y = r * 0.5;
    g.add(m1, m2);
    g.userData.puffs = [m1, m2];
    return g;
  }
  function discMesh(r, color, opacity) {
    const g = new THREE.Group();
    const d = new THREE.Mesh(new THREE.CircleGeometry(r, 40), mat('disc' + color + opacity, () => new THREE.MeshBasicMaterial({ color: hex(color), transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide })));
    d.rotation.x = -Math.PI / 2; d.position.y = 0.04;
    const ring = new THREE.Mesh(new THREE.RingGeometry(r - 0.12, r, 48), mat('ring' + color, () => new THREE.MeshBasicMaterial({ color: hex(color), transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide })));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05;
    g.add(d, ring);
    return g;
  }
  function orbMesh(color, size) {
    return new THREE.Mesh(new THREE.SphereGeometry(size || 0.14, 10, 8), mat('orb' + color, () => new THREE.MeshBasicMaterial({ color: hex(color) })));
  }
  function wallMesh(w, h, d, color) {
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat('wall' + color, () => new THREE.MeshLambertMaterial({ color: hex(color), emissive: hex(color), emissiveIntensity: 0.25, transparent: true, opacity: 0.88 })));
    m.position.y = h / 2;
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), mat('wallEdge', () => new THREE.LineBasicMaterial({ color: 0xffffff })));
    edge.position.y = h / 2;
    g.add(m, edge);
    return g;
  }
  function turretMesh(color, big) {
    const s = big ? 1.35 : 1;
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.28 * s, 0.38 * s, 0.6 * s, 10), mat('tb', () => new THREE.MeshLambertMaterial({ color: 0x334155 })));
    base.position.y = 0.3 * s;
    const head = new THREE.Group();
    head.position.y = 0.75 * s;
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.42 * s, 0.3 * s, 0.5 * s), mat('th' + color, () => new THREE.MeshLambertMaterial({ color: hex(color) })));
    const gun = new THREE.Mesh(new THREE.BoxGeometry(0.08 * s, 0.08 * s, 0.55 * s), mat('tg', () => new THREE.MeshLambertMaterial({ color: 0x111827 })));
    gun.position.z = -0.45 * s;
    const eye = orbMesh('#ef4444', 0.05 * s); eye.position.set(0, 0.06 * s, -0.26 * s);
    head.add(box, gun, eye);
    g.add(base, head);
    g.userData.head = head;
    return g;
  }
  function trapMesh(color, hiddenFromEnemy) {
    const g = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.35, 8), mat('tp', () => new THREE.MeshLambertMaterial({ color: 0x1f2937 })));
    post.position.y = 0.17;
    const lamp = orbMesh(color, 0.07); lamp.position.y = 0.38;
    g.add(post, lamp);
    g.userData.lamp = lamp;
    return g;
  }
  function driveColor(team) { return team === NA.Game.player.team ? '#4aa3ff' : '#ff5a5a'; }

  // ---------------------------------------------------------------- using abilities
  // Returns true if the ability went off (the caller pays the charge).
  AG.use = function (e, slot, aim) {
    const k = e.kit, a = k && BY[k.agent];
    if (!a || !e.alive) return false;
    const ab = a[slot];
    if (!AG.ready(e, slot)) return false;
    if (!run(e, ab, aim, a)) return false;
    if (slot === 'x') k.ult = 0; else k[slot]--;
    if (e.isPlayer) { NA.Audio.whoosh(); NA.haptic && NA.haptic('LIGHT'); }
    else if (NA.Game.player && e.pos.distanceTo(NA.Game.player.pos) < 30) NA.Audio.whoosh();
    if (slot === 'x' && NA.Payload) NA.Payload.ultCall(e, a);
    return true;
  };

  function run(e, ab, aim, a) {
    const color = a.color;
    switch (ab.kind) {
      case 'flash': {
        if (ab.at === 'global') { for (const o of enemiesOf(e)) blind(o, ab.dur); return true; }
        const p = aimPoint(e, ab.range, aim);
        addObj({ type: 'flash', team: e.team, owner: e, x: p.x, y: p.y, z: p.z, t: ab.delay, r: ab.r, dur: ab.dur, mesh: placed(orbMesh('#ffffff', 0.12), p) });
        return true;
      }
      case 'dash': {
        const s = AG.st(e);
        let dx, dz;
        if (e.isPlayer) {
          const inp = NA.Game.input, f = facing(e), r = { x: Math.cos(e.yaw), z: -Math.sin(e.yaw) };
          dx = f.x * inp.mz + r.x * inp.mx; dz = f.z * inp.mz + r.z * inp.mx;
          if (Math.hypot(dx, dz) < 0.2) { dx = f.x; dz = f.z; }
        } else if (aim) { dx = aim.x - e.pos.x; dz = aim.z - e.pos.z; }
        else { const f = facing(e); dx = f.x; dz = f.z; }
        const L = Math.hypot(dx, dz) || 1;
        s.dashT = 0.2; s.dvx = dx / L * ab.dist / 0.2; s.dvz = dz / L * ab.dist / 0.2;
        return true;
      }
      case 'buff': {
        const who = ab.at === 'team' ? alliesOf(e).filter(o => o.pos.distanceTo(e.pos) <= (ab.r || 999)) : [e];
        for (const o of who) { const s = AG.st(o); s.buff = ab; s.buffT = ab.dur; }
        if (ab.reveal) for (const o of enemiesOf(e)) reveal(o, ab.reveal);
        return true;
      }
      case 'blast': {
        const n = ab.count || 1;
        const p0 = aimPoint(e, ab.range, aim, true);
        const dir = aim ? norm(p0.x - e.pos.x, p0.z - e.pos.z) : facing(e);
        for (let i = 0; i < n; i++) {
          const off = (i - (n - 1) / 2) * 3.2;
          const p = n > 1 ? groundPt(p0.x + dir.x * off, p0.z + dir.z * off, p0.y) : p0;
          addObj({ type: 'blast', team: e.team, owner: e, x: p.x, y: p.y, z: p.z, t: ab.delay + i * 0.22, r: ab.r, dmg: ab.dmg, mesh: placed(orbMesh('#f97316', n > 1 ? 0.2 : 0.14), { x: p.x, y: p.y + 0.15, z: p.z }) });
        }
        return true;
      }
      case 'slow': {
        let hit = [];
        if (ab.at === 'self') {
          hit = enemiesOf(e).filter(o => o.pos.distanceTo(e.pos) <= ab.r);
          ring(e.pos.x, e.pos.y, e.pos.z, ab.r, color);
        } else if (ab.at === 'cone') {
          const f = facing(e);
          hit = enemiesOf(e).filter(o => {
            const dx = o.pos.x - e.pos.x, dz = o.pos.z - e.pos.z, d = Math.hypot(dx, dz);
            return d <= ab.range && d > 0.1 && Math.acos(Math.max(-1, Math.min(1, (dx * f.x + dz * f.z) / d))) <= ab.cone * DEG;
          });
          for (let i = 1; i <= 6; i++) ring(e.pos.x + f.x * i * ab.range / 6, e.pos.y, e.pos.z + f.z * i * ab.range / 6, 1.2 + i * 0.5, color);
        } else {
          const p = aimPoint(e, ab.range, aim, true);
          hit = enemiesOf(e).filter(o => Math.hypot(o.pos.x - p.x, o.pos.z - p.z) <= ab.r);
          ring(p.x, p.y, p.z, ab.r, color);
        }
        for (const o of hit) { slow(o, ab.dur, ab.slow); if (ab.dmg) hurt(o, ab.dmg, e); }
        return true;
      }
      case 'smoke': {
        const n = ab.count || 1, p0 = aimPoint(e, ab.range, aim, true);
        const f = facing(e), side = { x: -f.z, z: f.x };
        for (let i = 0; i < n; i++) {
          const off = (i - (n - 1) / 2) * (ab.spread || 0);
          const p = n > 1 ? groundPt(p0.x + side.x * off, p0.z + side.z * off, p0.y) : p0;
          const tint = ab.jam ? '#5eead4' : '#c4c9d4';
          const o = addObj({ type: 'smoke', team: e.team, owner: e, x: p.x, y: p.y, z: p.z, r: ab.r, t: ab.dur, life: ab.dur, jam: !!ab.jam, mesh: placed(smokeMesh(ab.r, tint), p) });
          o.mesh.scale.setScalar(0.2);
        }
        if (ab.invis) AG.st(e).invis = ab.invis;
        return true;
      }
      case 'invis': {
        const s = AG.st(e);
        s.invis = ab.dur;
        if (ab.speed) { s.buff = { speed: ab.speed }; s.buffT = ab.dur; }
        return true;
      }
      case 'decoy': {
        const n = ab.count || 1, f = facing(e);
        for (let i = 0; i < n; i++) {
          const ang = n > 1 ? (i - (n - 1) / 2) * 0.45 : 0;
          const dx = f.x * Math.cos(ang) - f.z * Math.sin(ang), dz = f.z * Math.cos(ang) + f.x * Math.sin(ang);
          const mesh = NA.Game.hooks.makeBotMesh(e.color || (e.team === 'A' ? 0x3b82f6 : 0xe5484d), 'rifle', e.name);
          const pos = new THREE.Vector3(e.pos.x + dx * 0.8, e.pos.y, e.pos.z + dz * 0.8);
          mesh.position.copy(pos);
          addObj({ type: 'decoy', team: e.team, owner: e, x: pos.x, y: pos.y, z: pos.z, pos, dx, dz, t: ab.dur, mesh, seen: new Set() });
        }
        return true;
      }
      case 'jam': {
        if (ab.at === 'global') { for (const o of enemiesOf(e)) jam(o, ab.dur); return true; }
        const p = aimPoint(e, ab.range, aim, true);
        ring(p.x, p.y, p.z, ab.r, color);
        for (const o of enemiesOf(e)) if (Math.hypot(o.pos.x - p.x, o.pos.z - p.z) <= ab.r) jam(o, ab.dur);
        return true;
      }
      case 'mark': {
        const k = e.kit;
        if (k.markMesh) scene().remove(k.markMesh);
        k.mark = { x: e.pos.x, y: e.pos.y, z: e.pos.z };
        k.markMesh = placed(discMesh(0.7, color, 0.45), k.mark);
        scene().add(k.markMesh);
        return true;
      }
      case 'teleport': {
        const k = e.kit, m = k.mark;
        if (!m) return false;
        NA.Game.FX.burst(e.pos, hex(color));
        e.pos.set(m.x, m.y, m.z);
        W().collide(e.pos, 0.35, 1.8);
        if (!e.isPlayer) { e.path = null; e.prevPos.copy(e.pos); e.mesh.position.copy(e.pos); }
        NA.Game.FX.burst(e.pos, hex(color));
        return true;
      }
      case 'wall': return wallAt(e, ab, aim, color);
      case 'shield': {
        const who = ab.at === 'team' ? alliesOf(e) : [e];
        for (const o of who) { o.maxShield = 100; o.shield = Math.min(100, (o.shield || 0) + ab.amt); }
        if (ab.wall) wallAt(e, { range: 6, w: 6, h: 3, dur: 15 }, aim, color);
        return true;
      }
      case 'trap': {
        const p = aimPoint(e, ab.range, aim, true);
        addObj({ type: 'trap', team: e.team, owner: e, x: p.x, y: p.y, z: p.z, r: ab.r, ab, t: 9999, armT: 0.8, mesh: placed(trapMesh(ab.dmg ? '#facc15' : '#ef4444'), p) });
        return true;
      }
      case 'turret': {
        const p = aimPoint(e, ab.range, aim, true);
        const mesh = placed(turretMesh(color, ab.big), p);
        mesh.rotation.y = e.yaw;
        addObj({ type: 'turret', team: e.team, owner: e, x: p.x, y: p.y, z: p.z, r: ab.big ? 0.6 : 0.45, yaw: e.yaw, hp: ab.hp, dmg: ab.dmg, rate: ab.rate, cd: 0.8, t: ab.dur, mesh });
        return true;
      }
      case 'field': {
        const p = aimPoint(e, ab.range, aim, true);
        addObj({ type: 'field', team: e.team, owner: e, x: p.x, y: p.y, z: p.z, r: ab.r, slow: ab.slow, t: ab.dur, mesh: placed(discMesh(ab.r, color, 0.16), p) });
        return true;
      }
      case 'reveal': {
        let list;
        const en = enemiesOf(e);
        if (ab.at === 'global') list = en;
        else if (ab.at === 'self') { list = en.filter(o => o.pos.distanceTo(e.pos) <= ab.r); ring(e.pos.x, e.pos.y, e.pos.z, Math.min(ab.r, 12), color); }
        else if (ab.at === 'cone') {
          const f = facing(e);
          list = en.filter(o => {
            const dx = o.pos.x - e.pos.x, dz = o.pos.z - e.pos.z, d = Math.hypot(dx, dz);
            return d <= ab.range && (d < 3 || Math.acos(Math.max(-1, Math.min(1, (dx * f.x + dz * f.z) / d))) <= ab.cone * DEG);
          });
          for (let i = 1; i <= 5; i++) ring(e.pos.x + f.x * i * 6, e.pos.y, e.pos.z + f.z * i * 6, 0.8, color);
        } else {
          const p = aimPoint(e, ab.range, aim, true);
          list = en.filter(o => Math.hypot(o.pos.x - p.x, o.pos.z - p.z) <= ab.r);
          ring(p.x, p.y, p.z, Math.min(ab.r, 10), color);
        }
        if (ab.moving) list = list.filter(o => Math.hypot(o.vel.x, o.vel.z) > 1.2);
        for (const o of list) { reveal(o, ab.dur); if (ab.slow) slow(o, ab.slowDur || 2, ab.slow); }
        if (e.isPlayer) NA.UI.toast(list.length ? `${ab.name}: ${list.length} enem${list.length === 1 ? 'y' : 'ies'} revealed` : `${ab.name}: nobody there`);
        return true;
      }
    }
    return false;
  }
  function norm(x, z) { const L = Math.hypot(x, z) || 1; return { x: x / L, z: z / L }; }
  function groundPt(x, z, y) { const g = W().groundAt(x, z, 0.1, (y || 0) + 1.5); return { x, y: g < -10 ? 0 : g, z }; }
  function placed(mesh, p) { mesh.position.set(p.x, p.y, p.z); return mesh; }
  // a short-lived expanding ring on the floor, so you can see where an effect landed
  function ring(x, y, z, r, color) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 40), mat('fx' + color, () => new THREE.MeshBasicMaterial({ color: hex(color), transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide })).clone());
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, (y || 0) + 0.06, z);
    addObj({ type: 'ring', t: 0.6, life: 0.6, r, x, z, mesh: m });
  }
  function wallAt(e, ab, aim, color) {
    const p = aimPoint(e, ab.range, aim, true);
    const f = facing(e);
    const alongX = Math.abs(f.z) > Math.abs(f.x); // facing along z: the wall runs along x
    const w = alongX ? ab.w : 0.6, d = alongX ? 0.6 : ab.w;
    const col = { minX: p.x - w / 2, maxX: p.x + w / 2, minY: p.y, maxY: p.y + ab.h, minZ: p.z - d / 2, maxZ: p.z + d / 2 };
    // don't wall anyone inside it
    for (const o of NA.Game.entities()) if (o.alive && o.pos.x + 0.4 > col.minX && o.pos.x - 0.4 < col.maxX && o.pos.z + 0.4 > col.minZ && o.pos.z - 0.4 < col.maxZ) {
      if (alongX) { col.minZ = col.maxZ = 0; } else { col.minX = col.maxX = 0; }
      const shift = 1.2;
      if (alongX) { const s = o.pos.z > p.z ? -1 : 1; p.z = o.pos.z + s * shift; } else { const s = o.pos.x > p.x ? -1 : 1; p.x = o.pos.x + s * shift; }
      Object.assign(col, { minX: p.x - w / 2, maxX: p.x + w / 2, minZ: p.z - d / 2, maxZ: p.z + d / 2 });
    }
    W().current.colliders.push(col);
    addObj({ type: 'wall', team: e.team, owner: e, x: p.x, y: p.y, z: p.z, r: ab.w / 2, t: ab.dur, collider: col, mesh: placed(wallMesh(w, ab.h, d, color), p), rise: 0 });
    return true;
  }

  // ---------------------------------------------------------------- per-frame update
  let pulseT = 0;
  AG.tick = function (dt, live) {
    const Gm = NA.Game, ents = Gm.entities(), p = Gm.player;
    for (const e of ents) {
      const s = AG.st(e);
      if (s.blind > 0) s.blind -= dt;
      if (s.slow > 0) { s.slow -= dt; if (s.slow <= 0) s.slowMul = 1; }
      if (s.invis > 0) s.invis -= dt;
      if (s.jam > 0) s.jam -= dt;
      if (s.reveal > 0) s.reveal -= dt;
      if (s.buffT > 0) { s.buffT -= dt; if (s.buffT <= 0) s.buff = null; }
      if (s.distractT > 0) s.distractT -= dt;
      if (!e.isPlayer && e.mesh && e.alive) e.mesh.visible = !(s.invis > 0);
      // dashes move you over 0.2 s
      if (s.dashT > 0 && e.alive) {
        const k = Math.min(dt, s.dashT);
        s.dashT -= dt;
        W().move(e.pos, s.dvx * k, s.dvz * k, e.isPlayer ? 0.35 : 0.4, 1.8);
      }
    }
    // revealed enemies tell the other team where they are (bots chase the info)
    pulseT -= dt;
    if (pulseT <= 0) {
      pulseT = 0.5;
      for (const e of ents) {
        if (!e.alive || !(e.st.reveal > 0)) continue;
        for (const b of Gm.bots) if (b.alive && b.team !== e.team && !(b.st && b.st.jam > 0) && !b.target && b.pos.distanceTo(e.pos) < 45) b.lastSeen = { x: e.pos.x, z: e.pos.z };
      }
    }
    for (let i = objs.length - 1; i >= 0; i--) {
      const o = objs[i];
      if (!o) continue;
      o.t -= dt;
      updateObj(o, dt, live, p);
      if (o.t <= 0 && objs.indexOf(o) >= 0) removeObj(o);
    }
  };

  function updateObj(o, dt, live, p) {
    const Gm = NA.Game;
    switch (o.type) {
      case 'flash': if (o.t <= 0) {
        Gm.FX.burst({ x: o.x, y: o.y - 0.8, z: o.z }, 0xffffff);
        for (const e of Gm.entities()) {
          if (!e.alive || e.team === o.team) continue;
          const d = Math.hypot(e.pos.x - o.x, e.pos.z - o.z);
          if (d > o.r || !W().los(e.pos.x, eyeY(e), e.pos.z, o.x, o.y, o.z)) continue;
          if (AG.smokeBetween(e.pos.x, e.pos.z, o.x, o.z)) continue;
          // looking away from the flash: only a short blind
          const f = facing(e), dx = o.x - e.pos.x, dz = o.z - e.pos.z, dot = (dx * f.x + dz * f.z) / (Math.hypot(dx, dz) || 1);
          blind(e, o.dur * (dot > 0.2 ? 1 : 0.35) * (d > o.r * 0.6 ? 0.75 : 1));
        }
      } break;
      case 'blast': if (o.t <= 0) {
        Gm.FX.burst({ x: o.x, y: o.y - 0.3, z: o.z }, 0xf97316);
        Gm.FX.burst({ x: o.x, y: o.y - 0.3, z: o.z }, 0xfacc15);
        if (p && Math.hypot(p.pos.x - o.x, p.pos.z - o.z) < 35) NA.Audio.noiseBurst('lowpass', 220, 0.35, 0.5);
        for (const e of Gm.entities()) {
          if (!e.alive || e.team === o.team) continue;
          const d = Math.hypot(e.pos.x - o.x, e.pos.z - o.z);
          if (d > o.r) continue;
          hurt(e, o.dmg * (1 - 0.55 * d / o.r), o.owner);
        }
        // turrets and decoys of the other team break too
        for (const t of objs.slice()) if ((t.type === 'turret' || t.type === 'decoy') && t.team !== o.team && Math.hypot(t.x - o.x, t.z - o.z) < o.r) t.t = 0;
      } else if (o.mesh) o.mesh.visible = Math.floor(o.t * (o.t < 0.6 ? 14 : 6)) % 2 === 0;
        break;
      case 'smoke': {
        const k = o.life - o.t;
        o.mesh.scale.setScalar(k < 0.5 ? 0.2 + 1.6 * k : o.t < 0.8 ? Math.max(0.05, o.t / 0.8) : 1);
        if (o.jam) for (const e of Gm.entities()) if (e.alive && e.team !== o.team && Math.hypot(e.pos.x - o.x, e.pos.z - o.z) < o.r) jam(e, 1.2);
      } break;
      case 'ring': {
        const k = 1 - o.t / o.life;
        o.mesh.scale.setScalar(Math.max(0.1, o.r * (0.25 + 0.75 * k)));
        o.mesh.material.opacity = 0.9 * (1 - k);
      } break;
      case 'wall':
        o.rise = Math.min(1, o.rise + dt * 4);
        o.mesh.scale.y = Math.max(0.05, o.t < 0.5 ? o.t / 0.5 : o.rise);
        break;
      case 'trap': {
        o.armT -= dt;
        if (o.mesh.userData.lamp) o.mesh.userData.lamp.visible = Math.floor(performance.now() / 400) % 2 === 0;
        if (o.armT > 0 || !live) break;
        for (const e of Gm.entities()) {
          if (!e.alive || e.team === o.team) continue;
          if (Math.hypot(e.pos.x - o.x, e.pos.z - o.z) > o.r) continue;
          const ab = o.ab;
          if (ab.slow) slow(e, ab.dur, ab.slow);
          if (ab.reveal) reveal(e, ab.reveal);
          if (ab.dmg) { Gm.FX.burst({ x: o.x, y: o.y - 0.5, z: o.z }, 0xfacc15); hurt(e, ab.dmg, o.owner); }
          else ring(o.x, o.y, o.z, o.r, '#ef4444');
          if (e.isPlayer) NA.UI.centerMsg(ab.dmg ? 'Shock mine!' : 'Laser trap: you are revealed', 1300);
          o.t = 0;
          break;
        }
      } break;
      case 'turret': turretTick(o, dt, live); break;
      case 'decoy': decoyTick(o, dt); break;
    }
  }

  function turretTick(o, dt, live) {
    const Gm = NA.Game, p = Gm.player;
    if (o.hp <= 0) { Gm.FX.burst({ x: o.x, y: o.y, z: o.z }, 0x94a3b8); o.t = 0; return; }
    if (!live) return;
    // enemies in its face shoot it back (a rough rate, they have better things to aim at)
    for (const b of Gm.bots) {
      if (!b.alive || b.team === o.team || b.target || b.pos.distanceTo(tv.set(o.x, o.y, o.z)) > 16) continue;
      if (W().los(b.pos.x, b.pos.y + 1.5, b.pos.z, o.x, o.y + 0.8, o.z)) o.hp -= 14 * dt;
    }
    o.cd -= dt;
    let best = null, bd = 22;
    for (const e of Gm.entities()) {
      if (!e.alive || e.team === o.team) continue;
      const dx = e.pos.x - o.x, dz = e.pos.z - o.z, d = Math.hypot(dx, dz);
      if (d >= bd) continue;
      const ang = Math.abs(U.wrap(Math.atan2(-dx, -dz) - o.yaw));
      if (ang > 75 * DEG) continue;
      if (e.st && e.st.invis > 0) continue;
      if (AG.smokeBetween(o.x, o.z, e.pos.x, e.pos.z)) continue;
      if (!W().los(o.x, o.y + 0.85, o.z, e.pos.x, e.pos.y + 1.2, e.pos.z)) continue;
      best = e; bd = d;
    }
    const head = o.mesh.userData.head;
    if (best) {
      const want = Math.atan2(-(best.pos.x - o.x), -(best.pos.z - o.z)) - o.yaw;
      head.rotation.y = U.approachAngle(head.rotation.y, want, 6 * dt);
      if (o.cd <= 0) {
        o.cd = 1 / o.rate;
        const from = tv.set(o.x, o.y + 0.85, o.z).clone();
        const hitChance = U.clamp(0.78 - bd / 45, 0.32, 0.75) * (Math.hypot(best.vel.x, best.vel.z) > 3 ? 0.8 : 1);
        const hit = Math.random() < hitChance;
        const to = new THREE.Vector3(best.pos.x + (hit ? 0 : U.rand(-0.8, 0.8)), best.pos.y + 1.2 + (hit ? 0 : U.rand(-0.4, 0.6)), best.pos.z + (hit ? 0 : U.rand(-0.8, 0.8)));
        Gm.FX.tracer(from, to, 0xff6b6b);
        if (p && p.pos.distanceTo(from) < 40) NA.Audio.shot('tec', p.pos.distanceTo(from));
        if (hit) hurt(best, o.dmg, o.owner);
      }
    } else head.rotation.y = U.approachAngle(head.rotation.y, Math.sin(performance.now() / 900) * 0.6, 2 * dt);
  }

  function decoyTick(o, dt) {
    const Gm = NA.Game, sp = 4.3;
    const before = o.pos.clone();
    W().move(o.pos, o.dx * sp * dt, o.dz * sp * dt, 0.4, 1.8);
    if (before.distanceTo(o.pos) < sp * dt * 0.4) { const t = o.dx; o.dx = -o.dz * (Math.random() < 0.5 ? 1 : -1); o.dz = t * (o.dx === -o.dz ? 1 : 1); }
    o.x = o.pos.x; o.z = o.pos.z;
    o.mesh.position.copy(o.pos);
    o.mesh.rotation.y = Math.atan2(-o.dx, -o.dz);
    NA.Avatar.animate(o.mesh.userData.av, { speed: sp, aim: false, pitch: 0, air: false }, dt);
    // enemies who see it turn to look, and give their position away
    for (const b of Gm.bots) {
      if (!b.alive || b.team === o.team || o.seen.has(b)) continue;
      const d = b.pos.distanceTo(o.pos);
      if (d > 32) continue;
      const ang = Math.abs(U.wrap(Math.atan2(-(o.x - b.pos.x), -(o.z - b.pos.z)) - b.yaw));
      if (ang > 80 * DEG || !W().los(b.pos.x, b.pos.y + 1.5, b.pos.z, o.x, o.pos.y + 1.2, o.z)) continue;
      o.seen.add(b);
      const s = AG.st(b);
      s.distractT = 1.3; s.dx = o.x; s.dz = o.z;
      reveal(b, 3);
    }
    if (o.t < 0.25) o.mesh.scale.setScalar(Math.max(0.05, o.t / 0.25));
  }

  // the player's bullets pop decoys and damage turrets along the ray
  AG.shotRay = function (o, dir, maxT, dmg, shooter) {
    for (const t of objs) {
      if ((t.type !== 'decoy' && t.type !== 'turret') || t.team === shooter.team) continue;
      const cy = t.type === 'decoy' ? t.pos.y + 1.2 : t.y + 0.75;
      const r = t.type === 'decoy' ? 0.5 : t.r;
      const hit = U.raySphere(o.x, o.y, o.z, dir.x, dir.y, dir.z, t.x, cy, t.z, r);
      if (hit >= maxT) continue;
      if (t.type === 'decoy') { NA.Game.FX.burst(t.pos, 0xf472b6); t.t = 0; if (shooter.isPlayer) NA.UI.toast('It was a decoy'); }
      else { t.hp -= dmg; if (shooter.isPlayer) NA.UI.hitmarker(false, true); }
    }
  };

  // after a kill: slide resets, rampage heals
  AG.onKill = function (killer) {
    const k = killer.kit, a = k && BY[k.agent], s = killer.st;
    if (!a) return;
    if (a.e.resetOnKill) k.e = Math.max(k.e, 1);
    if (s && s.buffT > 0 && s.buff && s.buff.healOnKill) { killer.hp = killer.maxHp || 100; k.e = Math.max(k.e, 1); }
  };
})(window.NA);
