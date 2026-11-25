/* NO ANTICHEAT: player, weapons, handicaps, cheats, bots, loot, matches and effects. */
(function (NA) {
  'use strict';
  const U = NA.U, D = NA.DATA, A = NA.Audio, W = NA.World, C = NA.Chat;
  const DEG = U.DEG;
  const EYE = 1.6, PR = 0.35, PH = 1.8, GRAV = 22, JUMP_V = 7.3, WALK = 5, BR = 0.4, BOT_SPEED = 3.9, BASE_FOV = 62;
  const FFA_COLORS = [0xe5484d, 0xf59e0b, 0x22c55e, 0xa855f7, 0xec4899, 0x14b8a6, 0xf97316, 0x84cc16];
  const TOGGLES = D.CHEATS.filter(c => c.toggle).map(c => c.id);
  const BONE_Y = { head: 1.62, neck: 1.42, chest: 1.15, pelvis: 0.85 };

  const G = {
    state: 'idle', paused: false, panic: false, bots: [], match: null, player: null, mods: null, tourney: null,
    lastAcc: 0, speed: 1, aimLock: false, aimTarget: null, silentTarget: null, turnLog: [], trigT: 0, ads: false, fovNow: BASE_FOV,
    nearLoot: null, loot: [], botStats: { shots: 0, hits: 0 },
    input: { mx: 0, mz: 0, fire: false, jump: false, lookDX: 0, lookDY: 0 },
  };
  const tv1 = new THREE.Vector3(), tv2 = new THREE.Vector3(), tv3 = new THREE.Vector3(), tv4 = new THREE.Vector3();

  // ---------------------------------------------------------------- cheats -> modifiers
  G.opt = function (id) {
    const c = D.CHEAT[id], st = NA.Save.data.cheats[id];
    const o = Object.assign({}, c.opts || {}, (st && st.opt) || {});
    return o;
  };
  G.setOpt = function (id, key, val) {
    const st = NA.Save.data.cheats[id];
    if (!st) return;
    st.opt = st.opt || {};
    st.opt[key] = val;
    NA.Save.save();
    G.computeMods();
  };
  G.computeMods = function () {
    const s = NA.Save.data;
    const on = id => {
      const c = s.cheats[id];
      if (!c || !c.level || G.panic || G.legit || c.enabled === false) return 0;
      return Math.max(1, Math.min(c.level, c.use || c.level));
    };
    const ab = on('aimbot'), tb = on('triggerbot'), wb = on('wallbang'), fz = on('freeze'), le = on('lootesp');
    let aimbot = null;
    if (ab) {
      const o = G.opt('aimbot');
      aimbot = {
        lvl: ab, fov: [10, 20, 45, 90, 360][ab - 1], speed: [70, 160, 360, 1200, Infinity][ab - 1],
        silent: o.type === 'silent' && ab >= 3, bone: o.bone, smooth: U.clamp(+o.smooth || 1, 1, 10),
        predict: !!o.predict && ab >= 2, fovCircle: o.fovCircle !== false,
      };
    }
    const m = {
      swayMult: Math.max(0.1, 1 - 0.18 * on('steady')),
      panic: on('steady') < 3,
      spreadMult: Math.max(0, 1 - 0.2 * on('nospread')),
      recoilMult: Math.max(0, 1 - on('norecoil') / 3),
      assistR: on('aimassist') ? 2 + on('aimassist') : 0,
      assistPull: 15 * on('aimassist'),
      aimbot,
      trigger: tb ? [0.25, 0.12, 0][tb - 1] : null,
      triggerHead: tb ? !!G.opt('triggerbot').headOnly : false,
      radar: on('radar') > 0,
      esp: on('wallhack'),
      espOpt: G.opt('wallhack'),
      lootEsp: le, lootOpt: G.opt('lootesp'),
      speedMult: 1 + 0.25 * on('speedhack'),
      fireRateMult: 1 + 0.3 * on('rapidfire'),
      infAmmo: on('infammo') > 0,
      kdSpoof: on('kdspoof') > 0,
      streamProof: on('streamproof') > 0,
      voteRig: on('voterig') > 0,
      wallbang: wb ? { pen: [1, 2, 99][wb - 1], keep: [0.55, 0.75, 0.9][wb - 1] } : null,
      freeze: fz ? [1.2, 2.2][fz - 1] : 0,
      payoutMult: 1 + 0.15 * NA.Save.level('affiliate'),
      practiceDone: !!(s.practiceStartedAt && Date.now() - s.practiceStartedAt >= 3600e6),
    };
    if (m.practiceDone) m.swayMult *= 0.95;
    m.anyActive = TOGGLES.some(id => on(id) > 0);
    G.mods = m;
    const chams = m.esp >= 5 && m.espOpt.chams !== false;
    for (const b of G.bots) b.mesh.userData.chams.visible = chams && G.player && G.isEnemy(G.player, b);
    return m;
  };
  G.setPanic = function (v) { G.panic = v; G.computeMods(); NA.UI.toast(v ? 'PANIC: all cheats off' : 'Cheats restored'); };
  G.act = () => (NA.Save.data.highestTier >= 3 ? 2 : 1);

  // ---------------------------------------------------------------- shop
  function tidy(n) {
    if (n < 1000) return Math.round(n);
    const mag = Math.pow(10, Math.floor(Math.log10(n)) - 1);
    return Math.round(n / mag) * mag;
  }
  G.cost = function (id) {
    const c = D.CHEAT[id], s = NA.Save.data;
    let cost = tidy(c.base * Math.pow(c.growth, NA.Save.level(id)));
    if (!s.flags.firstBuy && c.base > 0) cost = Math.ceil(cost / 2);
    return cost;
  };
  G.buy = function (id) {
    const c = D.CHEAT[id], s = NA.Save.data;
    const st = s.cheats[id] || { level: 0, enabled: true };
    if (st.level >= c.max || s.highestTier < c.tier) return false;
    const cost = G.cost(id);
    if (s.credits < cost) return false;
    s.credits -= cost;
    st.level++;
    st.enabled = true;
    st.use = st.level;
    s.cheats[id] = st;
    if (st.level === 1 && D.SELLER_BUY[id]) C.dm(D.SELLER_BUY[id]);
    if (!s.flags.firstBuy && c.base > 0) { s.flags.firstBuy = true; s.flags.improvedPending = true; G.achieve('first_buy', "First One's Half Off"); }
    if (cost >= 500 && !s.flags.bestCustomer) { s.flags.bestCustomer = true; C.dm(D.STORY.bestCustomer); }
    if (id === 'practice') s.practiceStartedAt = Date.now();
    if (id === 'rgb') G.achieve('placebo', 'Placebo');
    NA.Save.save();
    G.computeMods();
    A.buy();
    return true;
  };
  G.buyGun = function (id) {
    const w = D.WEAPONS[id], s = NA.Save.data;
    if (!w || s.guns[id] || s.highestTier < w.tier || s.credits < w.price) return false;
    s.credits -= w.price;
    s.guns[id] = true;
    G.equipGun(id);
    C.dm(U.pick(D.SELLER_BUY.gun));
    if (Object.keys(s.guns).length >= 8) G.achieve('arsenal', 'Arsenal');
    NA.Save.save();
    A.buy();
    return true;
  };
  G.equipGun = function (id) {
    const w = D.WEAPONS[id], s = NA.Save.data;
    if (!w || !s.guns[id]) return;
    if (w.slot === 0) s.loadout.primary = id; else s.loadout.secondary = id;
    NA.Save.save();
  };
  G.achieve = function (id, title) {
    const s = NA.Save.data;
    if (s.achievements.indexOf(id) >= 0) return;
    s.achievements.push(id);
    NA.Save.save();
    NA.UI.toast('Achievement: ' + title);
  };

  // ---------------------------------------------------------------- weapons
  function inst(id, rarity) { return { id, rarity: rarity || 0, ammo: D.WEAPONS[id].mag }; }
  G.curInst = () => (G.player ? G.player.slots[G.player.slot] : null);
  G.curW = () => { const i = G.curInst(); return i ? D.WEAPONS[i.id] : D.WEAPONS.p9; };
  function falloff(w, d) {
    if (!w.falloff) return 1;
    const f = w.falloff;
    if (d <= f[0]) return 1;
    if (d >= f[1]) return f[2];
    return U.lerp(1, f[2], (d - f[0]) / (f[1] - f[0]));
  }

  // ---------------------------------------------------------------- entities
  function newPlayer(tier) {
    const s = NA.Save.data;
    const primary = s.loadout.primary && s.guns[s.loadout.primary] ? inst(s.loadout.primary) : null;
    const secondary = inst(s.loadout.secondary && s.guns[s.loadout.secondary] ? s.loadout.secondary : 'p9');
    return {
      name: s.username, team: 'A', isPlayer: true, pos: new THREE.Vector3(), vy: 0, onGround: true,
      yaw: 0, pitch: 0, hp: 100, maxHp: 100, shield: tier.shield || 0, maxShield: tier.shield ? 100 : 0, alive: true, respawnT: 0, lastHurtT: -99, lastKillT: -99,
      kills: 0, deaths: 0, headshots: 0, shotsFired: 0, shotsHit: 0, streak: 0, vel: new THREE.Vector3(),
      slots: [primary, secondary], slot: primary ? 0 : 1, loadout: [primary && primary.id, secondary.id],
      reloadT: 0, reloadTotal: 1, fireCD: 0, burstQ: 0, burstT: 0, bloom: 0, recP: 0, recY: 0, offYaw: 0, offPitch: 0,
      twT: 9, twY: 0, twP: 0, nextTwitch: U.rand(2, 5), shotsSinceReload: 0, fastT: 0,
    };
  }
  G.entities = () => (G.player ? [G.player].concat(G.bots) : G.bots.slice());
  G.isEnemy = (a, b) => a !== b && a.team !== b.team;
  G.isAlly = b => !!(G.player && b && b !== G.player && b.team === G.player.team);
  G.botByName = name => G.bots.find(b => b.name === name) || null;
  G.randomBot = () => (G.bots.length ? U.pick(G.bots) : null);
  G.randomEnemy = () => { const e = G.bots.filter(b => G.isEnemy(G.player, b)); return e.length ? U.pick(e) : null; };

  let geo = null;
  const matCache = {};
  function mat(color) {
    if (!matCache[color]) matCache[color] = new THREE.MeshLambertMaterial({ color });
    return matCache[color];
  }
  const chamsMat = () => matCache.chams || (matCache.chams = new THREE.MeshBasicMaterial({ color: 0xff2a6d, transparent: true, opacity: 0.6, depthTest: false, depthWrite: false }));
  const iceMat = () => matCache.ice || (matCache.ice = new THREE.MeshBasicMaterial({ color: 0x9be7ff, transparent: true, opacity: 0.55, depthWrite: false }));
  const GUN_LEN = { pistol: 0.32, smg: 0.5, rifle: 0.7, dmr: 0.85, sniper: 1.05, shotgun: 0.75, lmg: 0.9 };
  function makeBotMesh(color, cls) {
    if (!geo) {
      geo = {
        body: new THREE.CapsuleGeometry(0.34, 0.8, 4, 10), head: new THREE.SphereGeometry(0.22, 14, 10),
        visor: new THREE.BoxGeometry(0.32, 0.09, 0.1), gun: new THREE.BoxGeometry(0.08, 0.09, 1),
        iceBody: new THREE.CapsuleGeometry(0.42, 0.9, 4, 8), iceHead: new THREE.SphereGeometry(0.3, 10, 8),
      };
    }
    const g = new THREE.Group();
    g.rotation.order = 'YXZ';
    const body = new THREE.Mesh(geo.body, mat(color)); body.position.y = 0.76;
    const head = new THREE.Mesh(geo.head, mat(0xf1c9a5)); head.position.y = 1.62;
    const visor = new THREE.Mesh(geo.visor, mat(0x15171c)); visor.position.set(0, 1.66, -0.17);
    const len = GUN_LEN[cls] || 0.55;
    const gun = new THREE.Mesh(geo.gun, mat(0x24262b)); gun.scale.z = len; gun.position.set(0.24, 1.15, -0.1 - len / 2);
    const chams = new THREE.Group();
    const cb = new THREE.Mesh(geo.body, chamsMat()); cb.position.y = 0.76; cb.renderOrder = 10;
    const ch = new THREE.Mesh(geo.head, chamsMat()); ch.position.y = 1.62; ch.renderOrder = 10;
    chams.add(cb, ch);
    chams.visible = false;
    const ice = new THREE.Group();
    const ib = new THREE.Mesh(geo.iceBody, iceMat()); ib.position.y = 0.78;
    const ih = new THREE.Mesh(geo.iceHead, iceMat()); ih.position.y = 1.62;
    ice.add(ib, ih); ice.visible = false;
    g.add(body, head, visor, gun, chams, ice);
    g.userData.chams = chams;
    g.userData.ice = ice;
    return g;
  }
  function genName(used) {
    const leet = s => s.replace(/[aeios]/g, c => (Math.random() < 0.35 ? { a: '4', e: '3', i: '1', o: '0', s: '5' }[c] : c));
    const cap = s => s[0].toUpperCase() + s.slice(1);
    const year = () => U.pick(['2007', '2008', '2009', '2010', '06', '07', '09', '11', '99', '04']);
    const num = () => U.pick([String(U.randInt(1, 99)), String(U.randInt(100, 999)), year(), 'x', '_']);
    const F = () => U.pick(D.NAME_FIRST), Wd = () => U.pick(D.NAME_WORD), Ad = () => U.pick(D.NAME_ADJ);
    const patterns = [
      () => F() + num(),                                   // jake2009
      () => Ad() + Wd(),                                   // sleepyfrog
      () => Ad() + '_' + Wd() + (Math.random() < 0.4 ? U.randInt(1, 99) : ''), // lazy_otter42
      () => cap(F()) + cap(Wd()),                          // MiaFrost
      () => leet(Wd()) + U.randInt(1, 999),                // gh0st317
      () => F() + '.' + Wd(),                              // luis.nova
      () => 'its' + F(),                                   // itsjake
      () => F() + U.pick(['yt', 'plays', 'gaming', 'fps', 'aim', 'tv']), // mateoplays
      () => cap(Wd()) + cap(Wd()),                         // VoidRaven
      () => `[${U.pick(D.NAME_CLAN)}] ${F()}`,             // [KRM] dante
      () => 'not' + F(),                                   // notkyle
      () => U.pick(D.NAME_SPECIAL),
      () => 'ttv_' + F() + Wd(),
      () => 'xX' + cap(leet(Wd())) + 'Xx',
      () => F() + '_' + F(),                               // sam_lena
      () => (Math.random() < 0.5 ? 'The' : 'Mr') + cap(Wd()),
    ];
    const weights = [16, 14, 10, 8, 8, 5, 6, 6, 7, 5, 4, 4, 2, 2, 2, 3];
    for (let i = 0; i < 40; i++) {
      let r = Math.random() * weights.reduce((x, y) => x + y, 0), k = 0;
      while (r > weights[k]) { r -= weights[k]; k++; }
      let n = patterns[k]();
      if (Math.random() < 0.08) n = n.toUpperCase();
      if (n.length > 18) continue;
      if (!used.has(n)) { used.add(n); return n; }
    }
    return 'player' + U.randInt(1000, 99999);
  }
  function rankIndex(rank) { const i = D.RANKS.indexOf(String(rank).split(' ')[0]); return i < 0 ? D.RANKS.length - 1 : i; }
  function botSkill(name, tier) {
    let s = tier.bot.skill + U.rand(-0.06, 0.06) + (G.ranked ? D.RANKED.skillBonus : 0);
    const adj = D.BOT_SKILL[name];
    if (adj) s += adj[tier.id] !== undefined ? adj[tier.id] : (adj['*'] || 0);
    return U.clamp(s, 0.05, 0.99);
  }
  let ffaIdx = 0;
  function addBot(name, team, tier) {
    const wid = name === 'BOT_Kevin' && tier.id <= 2 ? 'p9' : U.pick(tier.bot.weapons);
    const w = D.WEAPONS[wid];
    const color = team === 'A' ? 0x3b82f6 : team === 'B' ? 0xe5484d : FFA_COLORS[ffaIdx++ % FFA_COLORS.length];
    const mesh = makeBotMesh(color, w.cls);
    NA.R.scene.add(mesh);
    const ri = U.clamp(rankIndex(tier.rank) + U.randInt(-1, 1), 0, D.RANKS.length - 1);
    const b = {
      name, team, color, isPlayer: false, story: !!D.CHARACTERS[name],
      pos: new THREE.Vector3(), vy: 0, onGround: true, yaw: 0, hp: tier.bot.hp, maxHp: tier.bot.hp,
      shield: tier.shield || 0, maxShield: tier.shield ? 100 : 0, alive: true,
      stats: tier.bot, skill: botSkill(name, tier), weapon: wid, ammo: w.mag, reloadT: 0, burstLeft: 0, queue: 0, queueT: 0,
      platform: name === 'BOT_Kevin' ? 'TRAINING' : name === 'mom_plays_too' ? 'TABLET' : U.pick(D.PLATFORMS),
      rank: D.RANKS[ri] + ' ' + ['I', 'II', 'III', 'IV', 'V'][U.randInt(0, 4)],
      mesh, target: null, canSee: false, perceptT: Math.random() * 0.2, reactT: 0, fireCD: 0, err: 10, errYaw: 0, errPitch: 0,
      strafeDir: 1, strafeT: 0, path: null, pathI: 0, repathT: 0, lastSeen: null, stuckT: 0, lastPos: new THREE.Vector3(),
      vel: new THREE.Vector3(), prevPos: new THREE.Vector3(), retreatT: 0, frozenT: 0, freezeCD: 0,
      lastAttacker: null, lastAttackT: -99, kills: 0, deaths: 0, respawnT: 0, deathT: 0, visToPlayer: false, visibleSince: -1, killedByMe: 0,
    };
    G.bots.push(b);
    return b;
  }
  function removeBot(b) {
    NA.R.scene.remove(b.mesh);
    const i = G.bots.indexOf(b);
    if (i >= 0) G.bots.splice(i, 1);
    for (const o of G.bots) if (o.target === b) o.target = null;
  }
  function clearBots() {
    for (const b of G.bots) NA.R.scene.remove(b.mesh);
    G.bots = [];
  }
  function spawnList(team) {
    const sp = W.current.def.spawns;
    if (team === 'A' && sp.A) return sp.A;
    if (team === 'B' && sp.B) return sp.B;
    return sp.all || sp.A.concat(sp.B);
  }
  function pickSpawn(ent) {
    const list = spawnList(ent.team);
    const enemies = G.entities().filter(e => e.alive && G.isEnemy(ent, e) && e.pos);
    let best = list[0], bestD = -1;
    for (const s of U.shuffle(list)) {
      let dmin = 999;
      for (const e of enemies) { const d = Math.hypot(e.pos.x - s[0], e.pos.z - s[1]); if (d < dmin) dmin = d; }
      if (dmin > bestD) { bestD = dmin; best = s; }
    }
    return best;
  }
  function placeAt(ent, s) {
    ent.pos.set(s[0] + U.rand(-0.4, 0.4), 0, s[1] + U.rand(-0.4, 0.4));
    W.collide(ent.pos, PR, PH, 'x'); W.collide(ent.pos, PR, PH, 'z');
    ent.pos.y = Math.max(0, W.groundAt(ent.pos.x, ent.pos.z, 0.3, 10));
    ent.vy = 0;
    ent.yaw = Math.atan2(ent.pos.x, ent.pos.z);
  }
  function spawnPlayer() {
    const p = G.player, t = G.match.tier;
    placeAt(p, pickSpawn(p));
    p.pitch = 0; p.hp = 100; p.shield = t.shield || 0; p.alive = true; p.reloadT = 0; p.bloom = 0; p.recP = p.recY = 0; p.burstQ = 0;
    // respawn with the loadout (loot is lost on death)
    const s = NA.Save.data;
    p.slots = [p.loadout[0] ? inst(p.loadout[0]) : null, inst(p.loadout[1])];
    p.slot = p.slots[0] ? 0 : 1;
    G.ads = false;
  }
  function respawnBot(b) {
    placeAt(b, pickSpawn(b));
    b.hp = b.maxHp; b.shield = G.match.tier.shield || 0; b.alive = true; b.target = null; b.canSee = false; b.path = null; b.deathT = 0;
    b.ammo = D.WEAPONS[b.weapon].mag; b.reloadT = 0; b.frozenT = 0; b.retreatT = 0; b.queue = 0;
    b.prevPos.copy(b.pos); b.vel.set(0, 0, 0);
    b.mesh.visible = true; b.mesh.rotation.x = 0; b.mesh.userData.ice.visible = false;
    b.mesh.position.copy(b.pos); b.mesh.rotation.y = b.yaw;
  }

  // ---------------------------------------------------------------- match lifecycle
  G.tourneyTier = function (r) {
    const T = D.TOURNAMENT, rd = T.rounds[r];
    return {
      id: 100 + r, name: `FRAGLINE Open · ${rd.label}`, rank: 'Pro', map: rd.map, mode: 'duel', modeLabel: 'Tournament duel',
      scoreToWin: r === 2 ? 7 : 5, timeLimit: 300, base: T.prize[r + 1], kill: 30 + r * 20, winsToUnlock: 99, shield: r === 2 ? 50 : 0,
      bot: { hp: 100, skill: rd.skill, react: 0.35, rateMul: 0.9, weapons: rd.weapons },
      enemies: [G.tourney.names[r]], allies: [], tourney: r,
    };
  };
  G.startTourney = function () {
    const s = NA.Save.data, T = D.TOURNAMENT;
    if (s.highestTier < T.unlockTier || s.credits < T.fee) return false;
    s.credits -= T.fee;
    s.tourney.played++;
    NA.Save.save();
    G.tourney = { round: 0, names: U.shuffle(T.names).slice(0, 3) };
    G.startMatch(G.tourneyTier(0));
    return true;
  };

  // opts: { ranked, legit, loader (0..3 clean injections) }
  G.startMatch = function (tierOrId, opts) {
    const tier = typeof tierOrId === 'object' ? tierOrId : D.TIERS.find(t => t.id === tierOrId);
    if (tier.tourney === undefined) G.tourney = null;
    opts = opts || {};
    G.ranked = !!opts.ranked && tier.tourney === undefined;
    G.legit = G.ranked && !!opts.legit;
    G.loader = opts.loader === undefined ? 2 : opts.loader;
    W.build(NA.R.scene, tier.map);
    clearBots();
    clearLoot();
    ffaIdx = 0;
    G.panic = false;
    G.ads = false;
    G.player = newPlayer(tier);
    G.player.team = tier.mode === 'ffa' ? 'P' : 'A';
    const used = new Set([NA.Save.data.username]);
    tier.allies.forEach(n => { const name = n === '*' ? genName(used) : n; used.add(name); addBot(name, 'A', tier); });
    tier.enemies.forEach((n, i) => {
      const name = n === '*' ? genName(used) : n;
      used.add(name);
      addBot(name, tier.mode === 'ffa' ? 'F' + i : 'B', tier);
    });
    G.computeMods();
    G.match = {
      tier, time: tier.timeLimit, score: { A: 0, B: 0 }, sus: G.act() === 1 ? 0 : 10, susPeak: 0, susIdle: 0,
      reportT: 0, reports: 0, ambientT: U.rand(6, 10), multiExtra: 0, liveCredits: 0, firstSeen: {}, rapidShots: 0,
      killfeed: [], visT: 0, momNice: 0, startTime: 0, ended: false, vote: null, voteCD: 40, pendingLeave: [], backfill: [],
      ragequits: 0, used, sndT: 0, snd: 0,
      det: 0, detPeak: 0, detMult: 1, flagged: false, warned: false,
    };
    if (G.ranked) {
      G.match.detMult = NA.Ranked.matchMult(G.loader);
      if (!G.legit && G.loader <= 1) G.match.det = G.loader === 0 ? 45 : 25;
      G.match.detPeak = G.match.det;
    }
    spawnPlayer();
    G.bots.forEach(respawnBot);
    spawnLoot(tier);
    G.state = 'lobby';
    G.lobbyT = 4;
    G.paused = false;
    G.aimLock = false;
    G.turnLog = [];
    C.clear();
    const shown = G.bots.slice(0, 6);
    shown.forEach((b, i) => C.post('SYSTEM', `${b.name} joined the lobby`, 'system', { delay: i * 200 }));
    if (G.bots.length > shown.length) C.system(`…and ${G.bots.length - shown.length} more joined`);
    if (G.ranked) {
      C.system(`RANKED · protected by ${D.RANKED.ac} v${NA.Ranked.version()} (kernel mode)`);
      if (G.legit) C.system('Playing legit: cheats are unloaded for this match.');
      else if (NA.Save.data.ranked.bypassDetected) C.system('Warden signature database is up to date.');
    } else C.system(`Anticheat status: Coming Soon™ (posted {days} days ago)`);
    NA.UI.showLobby();
  };

  function beginPlay() {
    const s = NA.Save.data, t = G.match.tier;
    G.state = 'playing';
    G.match.startTime = performance.now();
    NA.UI.showHUD();
    if (t.tourney !== undefined) {
      C.system(`FRAGLINE Open · ${D.TOURNAMENT.rounds[t.tourney].label}. Admins online: 0.`);
    } else if (s.stats.matches === 0 && t.id === 1) { C.system('Welcome to FRAGLINE! Tip: aim at the enemy.'); C.beat(D.STORY.intro, 1800); }
    else if (s.flags.improvedPending && G.botByName('BOT_Kevin')) { s.flags.improvedPending = false; C.beat(D.STORY.improved); }
    if (t.id === 2 && !s.flags.momHello) { s.flags.momHello = true; C.beat(D.STORY.momHello, 1500); }
    if (t.id === 3 && !s.flags.grindHello) { s.flags.grindHello = true; C.beat(D.STORY.grindHello); }
    const hello = D.STORY.tierHello[t.id];
    if (hello && !s.flags['hello' + t.id]) { s.flags['hello' + t.id] = true; C.beat(hello, 1500); }
    if (t.loot && !s.flags.lootTip) { s.flags.lootTip = true; C.system('Loot is on the ground. Walk over shields and medkits; press PICK UP (E) for guns.'); }
    NA.Save.save();
  }

  G.leaveMatch = function () {
    if (!G.match || G.state === 'results') return;
    const t = G.match.tier, p = G.player, s = NA.Save.data;
    if (G.state === 'playing') {
      const pay = Math.round(p.kills * t.kill * G.mods.payoutMult);
      s.credits += pay; s.lifetimeCredits += pay;
      s.stats.matches++; s.stats.kills += p.kills; s.stats.deaths += p.deaths;
      s.stats.shotsFired += p.shotsFired; s.stats.shotsHit += p.shotsHit; s.stats.headshots += p.headshots;
      NA.Save.save();
    }
    G.tourney = null;
    // leaving a ranked match counts as a loss, and Warden still reviews what it saw
    if (G.ranked && G.state === 'playing') {
      const out = NA.Ranked.afterMatch(false, G.match.detPeak, false);
      if (out.wave) NA.UI.toast('Ban wave: ' + out.wave.label);
    }
    G.toIdle();
    NA.UI.showMenu();
  };
  G.toIdle = function () {
    G.state = 'idle';
    G.paused = false;
    G.input.fire = false;
    G.ads = false;
    clearBots();
    clearLoot();
  };

  function computePayout(won, kicked) {
    const t = G.match.tier, p = G.player;
    const lines = [];
    if (kicked === 'ban') return { lines: [['Banned by ' + D.RANKED.ac + ': winnings confiscated', 0]], total: 0 };
    if (kicked) lines.push(['Kicked by vote (no win bonus)', 0]);
    else if (t.tourney !== undefined) lines.push([won ? `${D.TOURNAMENT.rounds[t.tourney].label} won` : 'Eliminated', won ? t.base : 0]);
    else lines.push([won ? 'Win' : 'Loss (25% of base)', won ? t.base : Math.round(t.base * 0.25)]);
    if (p.kills) lines.push([`Kills ×${p.kills}`, p.kills * t.kill]);
    if (p.headshots && !kicked) lines.push([`Headshots ×${p.headshots}`, Math.round(p.headshots * t.kill * 0.5)]);
    if (G.match.multiExtra && !kicked) lines.push([`Multikills +${G.match.multiExtra}`, G.match.multiExtra * t.kill]);
    if (won && p.deaths === 0) lines.push(['Flawless', Math.round(t.base * 0.25)]);
    const sub = lines.reduce((a, l) => a + l[1], 0);
    const mult = G.mods.payoutMult;
    if (mult > 1) lines.push([`Affiliate ×${mult.toFixed(2)}`, Math.round(sub * (mult - 1))]);
    let total = Math.round(sub * mult);
    if (G.ranked) { lines.push([`Ranked ×${D.RANKED.payMult}`, Math.round(total * (D.RANKED.payMult - 1))]); total = Math.round(total * D.RANKED.payMult); }
    return { lines, total };
  }

  function endMatch(won, kicked) {
    if (G.state !== 'playing') return;
    G.state = 'results';
    G.input.fire = false;
    G.ads = false;
    const p = G.player, mt = G.match, t = mt.tier, s = NA.Save.data;
    const pay = computePayout(won, kicked);
    const acc = p.shotsFired ? Math.round(100 * p.shotsHit / p.shotsFired) : 0;
    G.lastAcc = acc;
    s.credits += pay.total; s.lifetimeCredits += pay.total;
    const st = s.stats;
    st.matches++; if (won) st.wins++;
    st.kills += p.kills; st.deaths += p.deaths; st.headshots += p.headshots;
    st.shotsFired += p.shotsFired; st.shotsHit += p.shotsHit;
    st.accHistory.push(acc); if (st.accHistory.length > 60) st.accHistory.shift();
    let unlocked = null, comingSoon = false, tourney = null, ranked = null;
    if (G.ranked) {
      ranked = NA.Ranked.afterMatch(won, mt.detPeak, kicked === 'ban');
      ranked.peak = Math.round(mt.detPeak);
      ranked.legit = G.legit;
      if (kicked === 'ban') ranked.ban = NA.Save.data.ranked.ban;
      if (ranked.wave) { s.credits -= pay.total; s.lifetimeCredits -= pay.total; ranked.confiscated = pay.total; }
    }
    if (t.tourney !== undefined) {
      if (won) {
        G.tourney.round++;
        if (G.tourney.round >= 3) { s.tourney.won++; G.achieve('champion', 'FRAGLINE Open Champion'); tourney = { champion: true }; G.tourney = null; }
        else tourney = { next: G.tourney.round, label: D.TOURNAMENT.rounds[G.tourney.round].label };
      } else { tourney = { out: true }; G.tourney = null; }
    } else if (won && kicked !== 'ban') {
      s.winsByTier[t.id] = (s.winsByTier[t.id] || 0) + 1;
      if (s.winsByTier[t.id] >= t.winsToUnlock && s.highestTier <= t.id) {
        if (t.id < D.MAX_PLAYABLE_TIER) {
          s.highestTier = t.id + 1; unlocked = D.TIERS.find(x => x.id === t.id + 1);
          if (s.highestTier === 2) { s.guns.ar7 = true; if (!s.loadout.primary) s.loadout.primary = 'ar7'; }
        } else if (!s.flags.comingSoon) { s.flags.comingSoon = true; comingSoon = true; }
      }
    }
    if (p.shotsFired >= 10 && acc < 5) G.achieve('skill_issue', 'Skill Issue');
    if (won && p.deaths === 0) G.achieve('flawless', 'Flawless');
    if (kicked === 'vote') G.achieve('kicked', 'Democracy');
    if (kicked === 'ban') G.achieve('banned', 'Detected');
    if (ranked && ranked.wave) G.achieve('banwave', 'Caught in the Wave');
    const band = C.band(mt.sus, G.act());
    const speakers = U.shuffle(G.bots).slice(0, Math.min(2, G.bots.length));
    speakers.forEach((b, i) => {
      if (b.name === 'BOT_Kevin' && st.matches === 1) return;
      if (kicked === 'ban') { C.post(b.name, U.pick(D.CHAT.ac.banned), G.isAlly(b) ? 'team' : 'bot', { delay: 400 + i * 700 }); return; }
      const pool = kicked ? null : won ? (band >= 2 ? 'postWinSus' : 'postWin') : 'postLoss';
      C.post(b.name, pool ? U.pick(D.CHAT[pool]) : U.pick(D.CHAT.vote.pass), G.isAlly(b) ? 'team' : 'bot', { delay: 600 + i * 900 });
    });
    if (st.matches === 1) {
      C.beat(D.STORY.firstEnd);
      if (!s.flags.sellerIntro) { s.flags.sellerIntro = true; D.STORY.sellerIntro.forEach(l => C.dm(l)); }
    }
    if (comingSoon) {
      D.STORY.comingSoon.forEach(l => C.dm(l));
      C.system('Pro League: Coming Soon™');
    }
    NA.Save.save();
    if (won) A.win(); else A.lose();
    NA.UI.showResults({ won, kicked, pay, acc, unlocked, comingSoon, tourney, ranked, rows: scoreboard(), peakSus: Math.round(mt.susPeak) });
  }

  function scoreboard() {
    const m = G.mods, rows = G.entities().map(e => {
      let k = e.kills, d = e.deaths, spoof = false;
      if (e.isPlayer && m.kdSpoof) { k = Math.max(1, Math.round(e.kills * 0.45)); d = e.deaths + Math.round(e.kills * 0.4); spoof = true; }
      return { name: e.name, team: e.team, k, d, me: !!e.isPlayer, spoof };
    });
    rows.sort((a, b) => b.k - a.k);
    return rows;
  }

  function checkWin() {
    const t = G.match.tier;
    if (G.state !== 'playing') return;
    if (t.mode === 'tdm') {
      if (G.match.score.A >= t.scoreToWin) endMatch(true);
      else if (G.match.score.B >= t.scoreToWin) endMatch(false);
    } else {
      if (G.player.kills >= t.scoreToWin) endMatch(true);
      else if (G.bots.some(b => b.kills >= t.scoreToWin)) endMatch(false);
    }
  }
  function endByTime() {
    const t = G.match.tier;
    if (t.mode === 'tdm') endMatch(G.match.score.A > G.match.score.B);
    else endMatch(G.bots.every(b => b.kills < G.player.kills));
  }

  // ---------------------------------------------------------------- suspicion
  G.addSus = function (amt) {
    const mt = G.match;
    if (!mt || G.state !== 'playing') return;
    if (amt > 0 && G.mods.kdSpoof) amt *= 0.8;
    if (amt > 0 && G.mods.streamProof) amt *= 0.7;
    mt.sus = U.clamp(mt.sus + amt, 0, 100);
    if (amt > 0) mt.susIdle = 0;
    if (mt.sus > mt.susPeak) mt.susPeak = mt.sus;
  };
  // ---------------------------------------------------------------- Warden AC (ranked only)
  G.addDet = function (amt) {
    const mt = G.match;
    if (!G.ranked || !mt || G.state !== 'playing' || G.legit || amt <= 0) return;
    mt.det = Math.min(100, mt.det + amt * mt.detMult);
  };
  function updateDetection(dt) {
    const mt = G.match;
    const heat = NA.Ranked.heatRate(G.mods) * mt.detMult;
    const decay = (G.panic || G.legit) ? 6 : D.RANKED.decay;
    mt.det = U.clamp(mt.det + (heat - decay) * dt, 0, 100);
    if (mt.det > mt.detPeak) mt.detPeak = mt.det;
    if (mt.det >= 55 && !mt.flagged) {
      mt.flagged = true;
      const b = G.randomBot(); if (b) C.post(b.name, U.pick(D.CHAT.ac.flagged), 'bot', { delay: 600 });
    }
    if (mt.det >= 80 && !mt.warned) { mt.warned = true; NA.UI.centerMsg('⚠ WARDEN DETECTION HIGH: hit PANIC or play legit', 2600); A.deny(); }
    if (mt.det < 60) mt.warned = false;
    if (mt.det >= 100) G.banNow();
  }
  G.banNow = function () {
    if (!G.ranked || G.state !== 'playing') return;
    const mt = G.match;
    NA.Ranked.ban(`Cheat software detected by ${D.RANKED.ac} v${NA.Ranked.version()}`, Math.max(mt.detPeak, 100), false);
    C.system(`A player in your match has been banned by ${D.RANKED.ac}. Thank you for reporting.`, { priority: true });
    NA.UI.centerMsg('BANNED BY WARDEN AC', 2500);
    endMatch(false, 'ban');
  };

  function firstSeen(id) {
    const mt = G.match;
    if (!mt || mt.firstSeen[id] || !D.CHAT.firstSeen[id]) return;
    mt.firstSeen[id] = true;
    const b = G.randomEnemy();
    if (b) C.post(b.name, U.pick(D.CHAT.firstSeen[id]), 'bot', { delay: 500 });
  }

  // ---------------------------------------------------------------- kills
  function registerKill(killer, victim, head, info) {
    const mt = G.match, p = G.player, now = performance.now();
    killer.kills++;
    victim.deaths++;
    if (mt.tier.mode === 'tdm' && (killer.team === 'A' || killer.team === 'B')) mt.score[killer.team]++;
    mt.killfeed.push({ k: killer.name, v: victim.name, head, wb: !!(info && info.walls), mine: killer === p, me: victim === p, t: now, kt: killer.team, vt: victim.team });
    if (mt.killfeed.length > 6) mt.killfeed.shift();
    if (killer === p) {
      const t = mt.tier;
      p.streak++;
      if (head) p.headshots++;
      victim.killedByMe++;
      mt.liveCredits += t.kill * (head ? 1.5 : 1);
      let susGain = 1 + (head ? 1 : 0);
      if (now - p.lastKillT < 2000) {
        mt.multiExtra++; susGain += 2;
        if (G.botByName('ttv_clipfarmer') && !NA.Save.data.flags.clip && !G.mods.streamProof) { NA.Save.data.flags.clip = true; C.beat(D.STORY.clip); }
      }
      p.lastKillT = now;
      const turned = G.turnLog.reduce((a, e) => a + (now - e.t < 150 ? e.deg : 0), 0);
      if (turned > 60) { susGain += 4; firstSeen('aimbot'); G.addDet(7); }
      if (info && info.silentDev > 8) { susGain += 3; firstSeen('silent'); G.addDet(4); }
      if (info && info.walls) { susGain += 3; firstSeen('wallbang'); G.addDet(8); }
      if (head && p.streak >= 3) G.addDet(1.5);
      if (now - p.lastKillT < 2000) G.addDet(3);
      if (G.mods.esp && victim.visibleSince > 0 && now - victim.visibleSince < 700) firstSeen('wallhack');
      if (G.usedTrigger) firstSeen('triggerbot');
      G.addSus(susGain);
      A.kill(); NA.haptic('MEDIUM');
      NA.UI.killPop(head);
      const band = C.band(mt.sus, G.act());
      if (Math.random() < (G.bots.length > 10 ? 0.25 : 0.45)) {
        const npc = D.CHAT.npcKilled[victim.name];
        C.post(victim.name, npc && band < 2 ? U.pick(npc) : C.line('killed', band), 'bot', { delay: U.rand(300, 900) });
      }
      if (mt.tier.mode === 'tdm' && mt.momNice < 3 && G.botByName('mom_plays_too') && Math.random() < 0.6) {
        mt.momNice++;
        C.post('mom_plays_too', U.pick(D.STORY.momNice), 'team', { delay: 1200 });
      }
      if (t.id === 3 && G.aimLock && !NA.Save.data.flags.aimbotReveal) { NA.Save.data.flags.aimbotReveal = true; C.beat(D.STORY.aimbotReveal, 1300); }
      // rage quit: a victim farmed too hard leaves, someone backfills
      if (!victim.story && t.id >= 3 && t.tourney === undefined && band >= 3 && victim.killedByMe >= 3 && Math.random() < 0.3 && mt.pendingLeave.indexOf(victim) < 0) mt.pendingLeave.push(victim);
    }
    if (victim === p) {
      p.streak = 0;
      NA.UI.centerMsg(`Killed by ${killer.name}${killer.weapon ? ' · ' + D.WEAPONS[killer.weapon].name : ''}`, 1800);
      if (Math.random() < 0.25 && !killer.isPlayer) C.post(killer.name, U.pick(D.CHAT.taunt[G.act()]), G.isAlly(killer) ? 'team' : 'bot', { delay: 500 });
    }
    checkWin();
  }

  function applyDamage(ent, dmg) {
    if (ent.shield > 0) {
      const s = Math.min(ent.shield, dmg);
      ent.shield -= s; dmg -= s;
    }
    ent.hp -= dmg;
  }
  function damageBot(b, dmg, attacker, head, info) {
    if (!b.alive) return;
    const hadShield = b.shield > 0;
    applyDamage(b, dmg);
    b.lastAttacker = attacker;
    b.lastAttackT = performance.now();
    if (attacker === G.player) {
      NA.UI.hitmarker(head, hadShield);
      if (head) A.headshot(G.player.streak); else A.hit();
      NA.haptic('LIGHT');
      const fz = G.mods.freeze;
      if (fz && b.hp > 0 && performance.now() > b.freezeCD) {
        b.frozenT = fz; b.freezeCD = performance.now() + 4000 + fz * 1000;
        b.mesh.userData.ice.visible = true;
        G.addSus(2); firstSeen('freeze'); G.addDet(6);
      }
    }
    if (b.hp <= 0) {
      b.alive = false; b.hp = 0; b.shield = 0; b.respawnT = 3; b.deathT = 0; b.frozenT = 0; b.mesh.userData.ice.visible = false;
      FX.burst(b.pos, b.color);
      registerKill(attacker, b, head, info);
    }
  }
  function damagePlayer(dmg, attacker) {
    const p = G.player;
    if (!p.alive || G.god) return;
    applyDamage(p, dmg);
    p.lastHurtT = performance.now();
    NA.UI.hurt(attacker);
    A.hurt();
    if (p.hp <= 0) {
      p.hp = 0; p.alive = false; p.respawnT = 2.5;
      p.reloadT = 0;
      G.ads = false;
      registerKill(attacker, p, false);
    }
  }
  function damageEnt(e, dmg, attacker, head, info) { if (e.isPlayer) damagePlayer(dmg, attacker); else damageBot(e, dmg, attacker, head, info); }

  // ---------------------------------------------------------------- hits
  const hitBox = { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0 };
  function hitEntity(e, o, dir, maxT) {
    const th = U.raySphere(o.x, o.y, o.z, dir.x, dir.y, dir.z, e.pos.x, e.pos.y + 1.62, e.pos.z, 0.25);
    hitBox.minX = e.pos.x - 0.36; hitBox.maxX = e.pos.x + 0.36; hitBox.minY = e.pos.y + 0.02; hitBox.maxY = e.pos.y + 1.45;
    hitBox.minZ = e.pos.z - 0.36; hitBox.maxZ = e.pos.z + 0.36;
    const tb = U.rayBox(o.x, o.y, o.z, dir.x, dir.y, dir.z, hitBox, maxT);
    const t = Math.min(th, tb);
    if (t >= maxT) return null;
    return { t, head: th <= tb };
  }
  // pen: walls a bullet may cross; keep: damage kept per wall
  function trace(o, dir, shooter, pen, keep) {
    const MAXD = 160;
    const wallT = W.ray(o.x, o.y, o.z, dir.x, dir.y, dir.z, MAXD);
    const lim = pen ? MAXD : wallT;
    let best = null;
    for (const e of G.entities()) {
      if (!e.alive || !G.isEnemy(shooter, e)) continue;
      const h = hitEntity(e, o, dir, best ? best.t : lim);
      if (h) best = { ent: e, head: h.head, t: h.t };
    }
    if (best && best.t <= wallT) { best.walls = 0; best.mult = 1; best.point = new THREE.Vector3().copy(o).addScaledVector(dir, best.t); return best; }
    if (best && pen) {
      const walls = W.countWalls(o.x, o.y, o.z, dir.x, dir.y, dir.z, best.t);
      if (walls <= pen) { best.walls = walls; best.mult = Math.pow(keep, walls); best.point = new THREE.Vector3().copy(o).addScaledVector(dir, best.t); return best; }
    }
    return { ent: null, point: new THREE.Vector3().copy(o).addScaledVector(dir, Math.min(wallT, MAXD)), t: wallT, wall: wallT < MAXD };
  }

  // ---------------------------------------------------------------- player
  const swayPh = [Math.random() * 6, Math.random() * 6, Math.random() * 6, Math.random() * 6];
  function eye(out) { const p = G.player; return out.set(p.pos.x, p.pos.y + EYE, p.pos.z); }
  function aimDir(out) { const p = G.player; return U.dirFromAngles(p.yaw + p.offYaw, p.pitch + p.offPitch, out); }
  G.aimDir = aimDir;
  G.eye = eye;
  function nearestEnemyDist() {
    const p = G.player;
    let d = 999;
    for (const b of G.bots) if (b.alive && G.isEnemy(p, b)) d = Math.min(d, p.pos.distanceTo(b.pos));
    return d;
  }

  function updatePlayer(dt, now) {
    const p = G.player, m = G.mods, inp = G.input;
    if (!p.alive) {
      p.respawnT -= dt;
      if (p.respawnT <= 0) spawnPlayer();
      inp.lookDX = inp.lookDY = 0;
      return;
    }
    const zoomScale = G.fovNow / BASE_FOV;
    p.yaw -= inp.lookDX * zoomScale;
    p.pitch = U.clamp(p.pitch - inp.lookDY * zoomScale, -85 * DEG, 85 * DEG);
    inp.lookDX = inp.lookDY = 0;
    aimHelpers(dt, now);

    const speed = WALK * m.speedMult * (G.ads ? 0.6 : 1);
    const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), rx = Math.cos(p.yaw), rz = -Math.sin(p.yaw);
    let mvx = fx * inp.mz + rx * inp.mx, mvz = fz * inp.mz + rz * inp.mx;
    const len = Math.hypot(mvx, mvz);
    if (len > 1) { mvx /= len; mvz /= len; }
    const ox = p.pos.x, oz = p.pos.z;
    p.pos.x += mvx * speed * dt; W.collide(p.pos, PR, PH, 'x');
    p.pos.z += mvz * speed * dt; W.collide(p.pos, PR, PH, 'z');
    if (dt > 0) p.vel.set((p.pos.x - ox) / dt, 0, (p.pos.z - oz) / dt);
    if (inp.jump && p.onGround) { p.vy = JUMP_V; p.onGround = false; }
    inp.jump = false;
    const yPrev = p.pos.y;
    p.vy -= GRAV * dt;
    p.pos.y += p.vy * dt;
    const g = W.groundAt(p.pos.x, p.pos.z, PR * 0.7, yPrev);
    if (p.pos.y <= g) { p.pos.y = g; p.vy = 0; p.onGround = true; } else p.onGround = false;
    if (p.pos.y < -10) spawnPlayer();
    if (len > 0.2 && m.speedMult >= 1.4) { G.addSus(0.5 * dt); p.fastT += dt; if (p.fastT > 3) firstSeen('speedhack'); }

    handicaps(dt, now);
    weapon(dt, now);
    if (now - p.lastHurtT > 5000 && p.hp < 100) p.hp = Math.min(100, p.hp + 8 * dt);
    lootCheck();
  }

  function handicaps(dt, now) {
    const p = G.player, m = G.mods;
    const t = now / 1000;
    let amp = 5 * m.swayMult;
    if (m.panic && (now - p.lastHurtT < 2000 || nearestEnemyDist() < 8)) amp *= 1.6;
    if (G.ads) amp *= 0.8;
    const lockMul = G.aimLock ? 0.1 : 1;
    p.nextTwitch -= dt;
    if (p.nextTwitch <= 0) {
      p.nextTwitch = U.rand(2, 6);
      const mag = U.rand(3, 8), ang = Math.random() * Math.PI * 2;
      p.twY = Math.cos(ang) * mag; p.twP = Math.sin(ang) * mag; p.twT = 0;
    }
    let tw = 0;
    if (p.twT < 0.7) { p.twT += dt; tw = p.twT < 0.1 ? p.twT / 0.1 : Math.max(0, 1 - (p.twT - 0.1) / 0.6); }
    const sx = 0.62 * Math.sin(t * 2.7 + swayPh[0]) + 0.38 * Math.sin(t * 4.46 + swayPh[1]);
    const sy = 0.6 * Math.sin(t * 2.32 + swayPh[2]) + 0.4 * Math.sin(t * 5.2 + swayPh[3]);
    const swayYaw = (sx * amp + p.twY * tw * m.swayMult) * lockMul * DEG;
    const swayPitch = (sy * amp * 0.8 + p.twP * tw * m.swayMult) * lockMul * DEG;
    const rec = 8 * DEG * dt;
    p.recP = U.approach(p.recP, 0, rec);
    p.recY = U.approach(p.recY, 0, rec);
    p.bloom = Math.max(0, p.bloom - 10 * dt);
    p.offYaw = swayYaw + p.recY;
    p.offPitch = swayPitch + p.recP;
  }

  // ---------------------------------------------------------------- aim cheats
  function boneFor(b, ab, now) {
    if (!ab || ab.bone !== 'random') return ab ? ab.bone || 'head' : 'chest';
    if (!b.rbone || now > b.rboneT) { b.rbone = U.pick(['head', 'head', 'neck', 'pelvis']); b.rboneT = now + 1400; }
    return b.rbone;
  }
  // Without prediction the cheat aims where the target was a tick ago; with it, slightly ahead.
  function aimPoint(b, bone, predict, out) {
    const lag = predict ? -0.05 : 0.14;
    return out.set(b.pos.x - b.vel.x * lag, b.pos.y + BONE_Y[bone], b.pos.z - b.vel.z * lag);
  }
  function canHitThrough(e, tx, ty, tz) {
    if (W.los(e.x, e.y, e.z, tx, ty, tz)) return true;
    const wb = G.mods.wallbang;
    if (!wb) return false;
    const dx = tx - e.x, dy = ty - e.y, dz = tz - e.z, d = Math.hypot(dx, dy, dz);
    return W.countWalls(e.x, e.y, e.z, dx / d, dy / d, dz / d, d) <= wb.pen;
  }
  // Best enemy inside a cone around the current aim point.
  function findTarget(limitDeg, bonePick, predict, now) {
    const p = G.player, e = eye(tv1);
    const aYaw = p.yaw + p.offYaw, aPitch = p.pitch + p.offPitch;
    let best = null;
    for (const b of G.bots) {
      if (!b.alive || !G.isEnemy(p, b)) continue;
      const bone = bonePick(b);
      const pt = aimPoint(b, bone, predict, tv4);
      const dx = pt.x - e.x, dy = pt.y - e.y, dz = pt.z - e.z;
      const dist = Math.hypot(dx, dy, dz);
      if (dist > 130) continue;
      const ty = Math.atan2(-dx, -dz), tp = Math.asin(dy / dist);
      const ang = Math.hypot(U.wrap(ty - aYaw), tp - aPitch) / DEG;
      if (ang > limitDeg || (best && ang >= best.ang)) continue;
      if (!canHitThrough(e, pt.x, pt.y, pt.z)) continue;
      best = { b, ang, yaw: ty, pitch: tp, bone, x: pt.x, y: pt.y, z: pt.z, dist };
    }
    return best;
  }
  function aimHelpers(dt, now) {
    const p = G.player, m = G.mods, ab = m.aimbot;
    G.aimLock = false; G.aimTarget = null; G.silentTarget = null;
    while (G.turnLog.length && now - G.turnLog[0].t > 300) G.turnLog.shift();
    if (ab && ab.silent) {
      const tgt = findTarget(ab.fov / 2, b => boneFor(b, ab, now), ab.predict, now);
      if (tgt) { G.silentTarget = tgt; G.aimTarget = tgt.b; }
      if (!m.assistR) return;
    }
    if (!(ab && !ab.silent) && !m.assistR) return;
    const memory = ab && !ab.silent;
    const limit = memory ? ab.fov / 2 : m.assistR;
    const best = findTarget(limit, b => (memory ? boneFor(b, ab, now) : 'chest'), memory && ab.predict, now);
    if (!best) return;
    const wantYaw = best.yaw - p.offYaw, wantPitch = U.clamp(best.pitch - p.offPitch, -85 * DEG, 85 * DEG);
    let speed = memory ? ab.speed : m.assistPull;
    if (memory && ab.smooth > 1) speed = speed === Infinity ? 1500 / ab.smooth : speed / ab.smooth;
    const before = p.yaw;
    if (speed === Infinity) { p.yaw = wantYaw; p.pitch = wantPitch; }
    else {
      const step = speed * DEG * dt;
      p.yaw = U.approachAngle(p.yaw, wantYaw, step);
      p.pitch = U.approach(p.pitch, wantPitch, step);
    }
    const turned = Math.abs(U.wrap(p.yaw - before)) / DEG;
    if (turned > 0.5) G.turnLog.push({ t: now, deg: turned });
    if (memory) { G.aimLock = true; G.aimTarget = best.b; }
  }

  function spread(dir, cone) {
    if (cone <= 0) return dir;
    const r = cone * Math.sqrt(Math.random()), th = Math.random() * Math.PI * 2;
    const up = Math.abs(dir.y) < 0.99 ? tv3.set(0, 1, 0) : tv3.set(1, 0, 0);
    const right = new THREE.Vector3().crossVectors(dir, up).normalize();
    const up2 = new THREE.Vector3().crossVectors(right, dir).normalize();
    return dir.addScaledVector(right, Math.tan(r) * Math.cos(th)).addScaledVector(up2, Math.tan(r) * Math.sin(th)).normalize();
  }
  G.spreadCone = () => {
    if (!G.player) return 0;
    const w = G.curW();
    return (w.spread + G.player.bloom * w.bloom) * G.mods.spreadMult * (G.ads ? w.adsMul : 1);
  };

  function weapon(dt, now) {
    const p = G.player, m = G.mods, w = G.curW(), wi = G.curInst();
    p.fireCD -= dt;
    if (p.reloadT > 0) {
      p.reloadT -= dt;
      if (p.reloadT <= 0) { wi.ammo = w.mag; p.shotsSinceReload = 0; }
      return;
    }
    if (p.burstQ > 0) {
      p.burstT -= dt;
      if (p.burstT <= 0 && (wi.ammo > 0 || m.infAmmo)) { fire(now, true); p.burstQ--; p.burstT = 0.075; }
      if (wi.ammo <= 0 && !m.infAmmo) p.burstQ = 0;
      return;
    }
    let want = G.input.fire;
    G.usedTrigger = false;
    if (m.trigger !== null && !want) {
      const hit = trace(eye(tv1), aimDir(tv2), p, 0, 1);
      if (hit.ent && (!m.triggerHead || hit.head)) { G.trigT += dt; if (G.trigT >= m.trigger) { want = true; G.usedTrigger = true; } }
      else G.trigT = 0;
    }
    if (want && p.fireCD <= 0) {
      if (wi.ammo <= 0 && !m.infAmmo) { G.reload(); return; }
      fire(now, false);
      if (w.burst > 1) { p.burstQ = w.burst - 1; p.burstT = 0.075; }
      p.fireCD = 1 / (w.rate * m.fireRateMult);
    }
  }
  function fire(now, burstFollow) {
    const p = G.player, m = G.mods, w = G.curW(), wi = G.curInst();
    if (!m.infAmmo) wi.ammo--;
    if (!burstFollow) { p.shotsFired++; }
    p.shotsSinceReload++;
    const o = eye(new THREE.Vector3());
    const camDir = aimDir(new THREE.Vector3());
    let base = camDir.clone(), silentDev = 0;
    const st = G.silentTarget;
    if (st && st.b.alive) {
      base.set(st.x - o.x, st.y - o.y, st.z - o.z).normalize();
      silentDev = Math.acos(U.clamp(base.dot(camDir), -1, 1)) / DEG;
      if (silentDev > 6) { G.addSus(0.6); G.addDet(0.8); }
    }
    const cone = (st && w.pellets === 1) ? 0 : G.spreadCone() * DEG;
    p.bloom = Math.min(5, p.bloom + 1);
    p.recP = Math.min(p.recP + w.recoil * m.recoilMult * DEG, 12 * DEG);
    p.recY = U.clamp(p.recY + U.rand(-0.6, 0.6) * w.recoil * m.recoilMult * DEG, -6 * DEG, 6 * DEG);
    const wb = m.wallbang;
    const pen = Math.max(w.pen, wb ? wb.pen : 0), keep = wb ? wb.keep : 0.6;
    const mult = D.RARITY[wi.rarity].mult;
    let anyHit = false;
    const muzzle = muzzleWorld(new THREE.Vector3());
    for (let k = 0; k < w.pellets; k++) {
      const dir = spread(base.clone(), cone);
      const hit = trace(o, dir, p, pen, keep);
      if (k < 3) FX.tracer(muzzle, hit.point, wi.rarity >= 3 ? 0xd8b4fe : 0xfff1a6);
      if (hit.ent) {
        anyHit = true;
        const dmg = w.dmg * mult * (hit.head ? w.head : 1) * falloff(w, hit.t) * hit.mult;
        damageEnt(hit.ent, dmg, p, hit.head, { walls: hit.walls, silentDev });
      } else if (hit.wall && k < 3) FX.puff(hit.point);
    }
    if (anyHit && !burstFollow) p.shotsHit++;
    VM.kick = 1; VM.flashT = 0.05;
    A.shot(wi.id, 0);
    noise(p);
    if (m.fireRateMult > 1 && ++G.match.rapidShots === 15) firstSeen('rapidfire');
    if (m.infAmmo && p.shotsSinceReload === w.mag * 2 + 1) firstSeen('infammo');
    if (wi.ammo <= 0 && !m.infAmmo && !p.burstQ) G.reload();
  }
  function muzzleWorld(out) {
    const cam = NA.R.camera;
    out.set(0.22, -0.2, -0.7).applyQuaternion(cam.quaternion).add(cam.position);
    return out;
  }
  G.reload = function () {
    const p = G.player;
    if (!p || !p.alive || G.state !== 'playing') return;
    const w = G.curW(), wi = G.curInst();
    if (p.reloadT > 0 || G.mods.infAmmo || wi.ammo >= w.mag) return;
    let t = w.reload * (1 - 0.04 * wi.rarity);
    p.burstQ = 0;
    if (Math.random() < 0.15) {
      t += 1.5;
      NA.UI.toast('Fumbled the reload');
      A.fumble();
      if (Math.random() < 0.6) { const b = G.randomEnemy(); if (b) C.post(b.name, U.pick(D.CHAT.fumble), 'bot', { delay: 400 }); }
    } else A.reload();
    p.reloadT = t; p.reloadTotal = t;
  };
  G.selectSlot = function (i) {
    const p = G.player;
    if (!p || !p.slots[i] || p.slot === i) return;
    p.slot = i; p.reloadT = 0; p.burstQ = 0; p.fireCD = 0.35;
    G.ads = false;
  };
  G.swapWeapon = function () {
    const p = G.player;
    if (!p) return;
    const other = p.slot === 0 ? 1 : 0;
    if (!p.slots[other]) { NA.UI.toast(NA.Save.data.highestTier < 2 ? 'Rifle unlocks at Tier 2' : 'Buy a primary in the Armory'); return; }
    G.selectSlot(other);
  };
  G.toggleAds = function (v) {
    if (!G.player || !G.player.alive || G.state !== 'playing') return;
    G.ads = v === undefined ? !G.ads : !!v;
  };
  G.jump = () => { G.input.jump = true; };

  // ---------------------------------------------------------------- loot
  const lootGeo = {};
  function lootMesh(item) {
    if (!lootGeo.gun) {
      lootGeo.gun = new THREE.BoxGeometry(0.7, 0.16, 0.16);
      lootGeo.cell = new THREE.CylinderGeometry(0.18, 0.18, 0.42, 10);
      lootGeo.med = new THREE.BoxGeometry(0.42, 0.28, 0.32);
      lootGeo.beam = new THREE.CylinderGeometry(0.05, 0.05, 3, 6, 1, true);
      lootGeo.base = new THREE.CylinderGeometry(0.5, 0.5, 0.04, 16);
    }
    const col = new THREE.Color(D.RARITY[item.rarity].color);
    const g = new THREE.Group();
    const core = new THREE.Mesh(item.kind === 'weapon' ? lootGeo.gun : item.kind === 'shield' ? lootGeo.cell : lootGeo.med,
      new THREE.MeshBasicMaterial({ color: item.kind === 'shield' ? 0x38bdf8 : item.kind === 'med' ? 0xf8fafc : col }));
    core.position.y = 0.6;
    const base = new THREE.Mesh(lootGeo.base, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.5 }));
    base.position.y = 0.03;
    g.add(core, base);
    if (item.kind === 'weapon' && item.rarity >= 2) {
      const beam = new THREE.Mesh(lootGeo.beam, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.35, depthWrite: false }));
      beam.position.y = 1.5;
      g.add(beam);
    }
    g.userData.core = core;
    return g;
  }
  function rollRarity(tid) {
    const boost = 1 + Math.max(0, tid - 4) * 0.3;
    const wts = [50, 28, 14 * boost, 6 * boost, 2 * boost];
    let r = Math.random() * wts.reduce((a, b) => a + b, 0);
    for (let i = 0; i < wts.length; i++) { r -= wts[i]; if (r <= 0) return i; }
    return 0;
  }
  function makeLoot(tier) {
    const k = Math.random();
    const kind = k < 0.55 ? 'weapon' : k < 0.8 ? 'shield' : 'med';
    const pool = D.WEAPON_ORDER.filter(id => id !== 'p9' && D.WEAPONS[id].tier <= tier.id + 1);
    const item = { kind, rarity: rollRarity(tier.id), id: kind === 'weapon' ? U.pick(pool) : null, pos: new THREE.Vector3(), alive: true, respawnT: 0, ph: Math.random() * 6 };
    const pt = W.randomPoint();
    item.pos.set(pt.x, Math.max(0, W.groundAt(pt.x, pt.z, 0.2, 10)), pt.z);
    item.mesh = lootMesh(item);
    item.mesh.position.copy(item.pos);
    NA.R.scene.add(item.mesh);
    return item;
  }
  function spawnLoot(tier) {
    if (!tier.loot) return;
    const n = U.clamp(Math.round((G.bots.length + 1) * 1.3), 10, 36);
    for (let i = 0; i < n; i++) G.loot.push(makeLoot(tier));
  }
  function clearLoot() {
    for (const it of G.loot) NA.R.scene.remove(it.mesh);
    G.loot = [];
    G.nearLoot = null;
  }
  G.lootLabel = it => (it.kind === 'weapon' ? D.WEAPONS[it.id].name : it.kind === 'shield' ? 'Shield Cell' : 'Medkit');
  function lootCheck() {
    const p = G.player;
    G.nearLoot = null;
    let bestD = 1.7;
    for (const it of G.loot) {
      if (!it.alive) continue;
      const d = Math.hypot(it.pos.x - p.pos.x, it.pos.z - p.pos.z);
      if (d > bestD || Math.abs(it.pos.y - p.pos.y) > 1.6) continue;
      if (it.kind === 'shield' && p.maxShield && p.shield < p.maxShield) { takeLoot(it); continue; }
      if (it.kind === 'med' && p.hp < 100) { takeLoot(it); continue; }
      if (it.kind === 'weapon') { G.nearLoot = it; bestD = d; }
    }
  }
  function takeLoot(it) {
    const p = G.player, m = G.mods;
    it.alive = false; it.mesh.visible = false; it.respawnT = 25;
    if (it.kind === 'shield') { p.shield = Math.min(p.maxShield || 100, p.shield + [25, 25, 50, 50, 75][it.rarity]); NA.UI.toast('+Shield'); A.reload(); }
    else if (it.kind === 'med') { p.hp = Math.min(100, p.hp + [40, 50, 60, 80, 100][it.rarity]); NA.UI.toast('+Health'); A.reload(); }
    else {
      const w = D.WEAPONS[it.id];
      p.slots[w.slot] = inst(it.id, it.rarity);
      G.selectSlot(w.slot);
      p.slot = w.slot;
      NA.UI.toast(`Picked up ${D.RARITY[it.rarity].name} ${w.name}`);
      A.buy();
      if (m.lootEsp && it.rarity >= 3) { G.addSus(2); firstSeen('lootesp'); }
    }
  }
  G.pickup = function () {
    if (G.state !== 'playing' || !G.nearLoot || !G.player.alive) return;
    takeLoot(G.nearLoot);
    G.nearLoot = null;
  };
  function updateLoot(dt, now) {
    const t = now / 1000;
    for (const it of G.loot) {
      if (!it.alive) {
        it.respawnT -= dt;
        if (it.respawnT <= 0) {
          NA.R.scene.remove(it.mesh);
          const fresh = makeLoot(G.match.tier);
          Object.assign(it, fresh);
        }
        continue;
      }
      const c = it.mesh.userData.core;
      c.rotation.y = t * 1.6 + it.ph;
      c.position.y = 0.6 + Math.sin(t * 2 + it.ph) * 0.08;
    }
  }

  // ---------------------------------------------------------------- bots
  // Gunfire is loud: enemies nearby without a target head toward the shooter.
  function noise(shooter) {
    for (const b of G.bots) {
      if (!b.alive || b.target || !G.isEnemy(b, shooter)) continue;
      if (b.pos.distanceTo(shooter.pos) > 34) continue;
      if (Math.random() < 0.35 + b.skill * 0.5) { b.lastSeen = { x: shooter.pos.x, z: shooter.pos.z }; b.path = null; }
    }
  }
  function perceive(b, now) {
    const ex = b.pos.x, ey = b.pos.y + 1.55, ez = b.pos.z;
    const fov = (50 + 28 * b.skill) * DEG, range = Math.min(110, W.current.def.fog[1] * 0.8);
    const cand = [];
    for (const e of G.entities()) {
      if (!e.alive || !G.isEnemy(b, e)) continue;
      const dx = e.pos.x - ex, dz = e.pos.z - ez;
      const d = Math.hypot(dx, dz);
      if (d > range) continue;
      const ang = Math.abs(U.wrap(Math.atan2(-dx, -dz) - b.yaw));
      const recent = b.lastAttacker === e && now - b.lastAttackT < 3000;
      if (ang > fov && !recent && d > 2.5) continue;
      cand.push([d - (recent ? 20 : 0) - (e === b.target ? 8 : 0), e]);
    }
    cand.sort((p, q) => p[0] - q[0]);
    let best = null;
    for (let i = 0; i < cand.length && i < 5; i++) {
      const e = cand[i][1];
      if (W.los(ex, ey, ez, e.pos.x, e.pos.y + 1.2, e.pos.z) || W.los(ex, ey, ez, e.pos.x, e.pos.y + 1.62, e.pos.z)) { best = e; break; }
    }
    if (best !== b.target) {
      b.target = best;
      if (best) {
        const dx = best.pos.x - b.pos.x, dz = best.pos.z - b.pos.z;
        const off = Math.abs(U.wrap(Math.atan2(-dx, -dz) - b.yaw)) / DEG;
        const preaim = Math.min(1, off / 60);
        // first shots start off-target and settle; better bots start closer and settle faster
        const floor = U.lerp(3.6, 0.4, b.skill);
        b.err = floor + U.lerp(14, 3, b.skill) * (0.35 + 0.65 * preaim);
        b.errYaw = U.rand(-1, 1); b.errPitch = U.rand(-0.6, 0.6);
        b.reactT = b.stats.react * U.rand(0.7, 1.3) * (0.6 + 0.4 * preaim);
      }
    }
    b.canSee = !!best;
  }
  function botFire(b, tgt, dist, moving) {
    const w = D.WEAPONS[b.weapon];
    const sk = b.skill;
    // angular speed of the target across the bot's view, which is the hard part of aiming
    const dx = tgt.pos.x - b.pos.x, dz = tgt.pos.z - b.pos.z, d = Math.hypot(dx, dz) || 1;
    const lat = Math.abs((tgt.vel.x * -dz + tgt.vel.z * dx) / d);
    const angVel = lat / d / DEG;
    let err = b.err + angVel * U.lerp(0.35, 0.05, sk);
    if (moving) err *= U.lerp(1.6, 1.15, sk);
    if (tgt.isPlayer && !tgt.onGround) err *= 1.25;
    const from = tv1.set(b.pos.x, b.pos.y + 1.55, b.pos.z);
    const head = Math.random() < 0.12 + 0.45 * sk;
    const aimY = tgt.pos.y + (head ? 1.6 : 1.1);
    const lead = sk * 0.06;
    const base = tv2.set(tgt.pos.x + tgt.vel.x * lead - from.x, aimY - from.y, tgt.pos.z + tgt.vel.z * lead - from.z).normalize();
    // systematic offset that shrinks while tracking, plus random jitter and weapon spread
    const sysYaw = b.errYaw * b.err * 0.5 * DEG, sysPitch = b.errPitch * b.err * 0.5 * DEG;
    const yaw0 = Math.atan2(-base.x, -base.z) + sysYaw, pitch0 = Math.asin(U.clamp(base.y, -1, 1)) + sysPitch;
    const spreadDeg = w.spread * (w.scope ? w.adsMul * 2 : 0.55) * U.lerp(1, 0.55, sk);
    const audible = G.player && G.player.pos.distanceTo(b.pos) < 45;
    for (let k = 0; k < w.pellets; k++) {
      const dir = U.dirFromAngles(yaw0, pitch0, new THREE.Vector3());
      spread(dir, (err * 0.5 + (w.pellets > 1 ? w.spread : spreadDeg)) * DEG);
      const hit = trace(from, dir, b, 0, 1);
      if (k < 2) FX.tracer(tv3.set(0.24, 1.15, -0.6).applyAxisAngle(new THREE.Vector3(0, 1, 0), b.yaw).add(b.pos).clone(), hit.point, 0xffc46b);
      G.botStats.shots++;
      if (hit.ent) { G.botStats.hits++; damageEnt(hit.ent, w.dmg * (hit.head ? w.head : 1) * falloff(w, hit.t), b, hit.head); }
    }
    const mt = G.match;
    if (audible && mt.snd < 18) { mt.snd++; A.shot(b.weapon, G.player.pos.distanceTo(b.pos)); }
    b.ammo--;
    if (b.ammo <= 0) b.reloadT = w.reload * U.rand(1, 1.3);
    noise(b);
  }
  function updateBot(b, dt, now) {
    if (!b.alive) {
      b.deathT += dt;
      b.mesh.rotation.x = -Math.min(1, b.deathT / 0.35) * Math.PI / 2;
      if (b.deathT > 0.9) b.mesh.visible = false;
      b.respawnT -= dt;
      if (b.respawnT <= 0) respawnBot(b);
      return;
    }
    if (dt > 0) {
      b.vel.set((b.pos.x - b.prevPos.x) / dt, 0, (b.pos.z - b.prevPos.z) / dt);
      b.prevPos.copy(b.pos);
    }
    if (b.frozenT > 0) {
      b.frozenT -= dt;
      b.vel.set(0, 0, 0);
      if (b.frozenT <= 0) b.mesh.userData.ice.visible = false;
      return;
    }
    const w = D.WEAPONS[b.weapon], sk = b.skill;
    if (now - b.lastAttackT > 5000 && b.hp < b.maxHp) b.hp = Math.min(b.maxHp, b.hp + 8 * dt);
    if (b.reloadT > 0) { b.reloadT -= dt; if (b.reloadT <= 0) b.ammo = w.mag; }
    b.perceptT -= dt;
    if (b.perceptT <= 0) { b.perceptT = 0.2; perceive(b, now); }
    let mvx = 0, mvz = 0;
    const tgt = b.target;
    if (b.retreatT > 0) b.retreatT -= dt;
    const hurt = (b.hp + b.shield) / (b.maxHp + b.maxShield) < 0.3;
    if (tgt && tgt.alive && b.canSee && !(b.retreatT > 0 && b.pos.distanceTo(tgt.pos) > 7)) {
      const dx = tgt.pos.x - b.pos.x, dz = tgt.pos.z - b.pos.z;
      const dist = Math.hypot(dx, dz) || 1;
      b.yaw = U.approachAngle(b.yaw, Math.atan2(-dx, -dz), (4 + 8 * sk) * dt);
      // settle the aim while tracking
      const floor = U.lerp(3.6, 0.4, sk);
      b.err = floor + (b.err - floor) * Math.exp(-U.lerp(1.1, 6, sk) * dt);
      b.strafeT -= dt;
      if (b.strafeT <= 0) { b.strafeT = U.rand(0.35, 1.3) * (1.4 - sk); b.strafeDir = Math.random() < 0.5 ? -1 : 1; }
      let strafe = 0.8;
      const aboutToShoot = b.fireCD < 0.12 && b.reactT <= 0 && b.reloadT <= 0;
      if (sk > 0.45 && aboutToShoot) strafe = 0; // counter-strafe: stop, shoot, move
      mvx = (-dz / dist) * b.strafeDir * strafe;
      mvz = (dx / dist) * b.strafeDir * strafe;
      const ideal = w.cls === 'shotgun' ? 6 : w.cls === 'sniper' || w.cls === 'dmr' ? 30 : w.cls === 'smg' ? 10 : 16;
      if (dist > ideal + 6) { mvx += dx / dist * 0.6; mvz += dz / dist * 0.6; }
      else if (dist < ideal - 6) { mvx -= dx / dist * 0.5; mvz -= dz / dist * 0.5; }
      if (hurt && sk > 0.35 && b.retreatT <= 0 && Math.random() < dt * 1.5) {
        b.retreatT = U.rand(2.5, 4);
        const away = W.randomPoint();
        b.path = W.findPath(b.pos.x, b.pos.z, away.x, away.z) || []; b.pathI = 0;
      }
      b.reactT -= dt;
      if (b.reactT <= 0 && b.reloadT <= 0) {
        b.fireCD -= dt;
        if (b.queue > 0) {
          b.queueT -= dt;
          if (b.queueT <= 0) { b.queue--; b.queueT = 0.075; botFire(b, tgt, dist, strafe > 0); }
        } else if (b.fireCD <= 0) {
          botFire(b, tgt, dist, strafe > 0);
          if (w.burst > 1) { b.queue = w.burst - 1; b.queueT = 0.075; }
          let cd = 1 / (w.rate * b.stats.rateMul) * U.rand(0.9, 1.15);
          if (w.rate >= 7) {
            if (b.burstLeft <= 0) b.burstLeft = U.randInt(3, 4 + Math.round(sk * 7));
            if (--b.burstLeft <= 0) cd += U.rand(0.25, 0.6) * (1.3 - sk);
          }
          b.fireCD = cd;
        }
      }
      b.lastSeen = { x: tgt.pos.x, z: tgt.pos.z };
      if (!(b.retreatT > 0)) b.path = null;
    }
    if (!(tgt && tgt.alive && b.canSee) || b.retreatT > 0) {
      if (b.reloadT <= 0 && b.ammo < w.mag * 0.4 && !b.canSee) b.reloadT = w.reload;
      b.repathT -= dt;
      if (!b.path || b.pathI >= b.path.length || b.repathT <= 0) {
        let goal;
        if (b.lastSeen && Math.random() < 0.8) goal = b.lastSeen;
        else if (Math.random() < 0.55) {
          const foes = G.entities().filter(e => e.alive && G.isEnemy(b, e));
          const f = foes.length ? U.pick(foes) : null;
          goal = f ? { x: f.pos.x + U.rand(-8, 8), z: f.pos.z + U.rand(-8, 8) } : W.randomPoint();
        } else goal = W.randomPoint();
        b.path = W.findPath(b.pos.x, b.pos.z, goal.x, goal.z) || [];
        b.pathI = 0; b.repathT = U.rand(3, 6); b.lastSeen = null;
      }
      const wp = b.path[b.pathI];
      if (wp) {
        const dx = wp.x - b.pos.x, dz = wp.z - b.pos.z, d = Math.hypot(dx, dz);
        if (d < 0.6) b.pathI++;
        else {
          mvx = dx / d; mvz = dz / d;
          b.yaw = U.approachAngle(b.yaw, Math.atan2(-dx, -dz), 5 * dt);
        }
      }
    }
    const l = Math.hypot(mvx, mvz);
    if (l > 1) { mvx /= l; mvz /= l; }
    const spd = BOT_SPEED * (b.retreatT > 0 ? 1.15 : 1);
    b.pos.x += mvx * spd * dt; W.collide(b.pos, BR, PH, 'x');
    b.pos.z += mvz * spd * dt; W.collide(b.pos, BR, PH, 'z');
    const yPrev = b.pos.y;
    b.vy -= GRAV * dt; b.pos.y += b.vy * dt;
    const g = W.groundAt(b.pos.x, b.pos.z, BR * 0.7, yPrev);
    if (b.pos.y <= g) { b.pos.y = g; b.vy = 0; }
    if (b.pos.y < -10) respawnBot(b);
    b.stuckT += dt;
    if (b.stuckT > 1) {
      if (l > 0.3 && b.pos.distanceTo(b.lastPos) < 0.3) { b.path = null; b.strafeDir *= -1; b.retreatT = 0; }
      b.lastPos.copy(b.pos); b.stuckT = 0;
    }
    b.mesh.position.copy(b.pos);
    b.mesh.rotation.y = b.yaw;
  }

  // ---------------------------------------------------------------- vote kicks, rage quits
  function updateSocial(dt) {
    const mt = G.match, t = mt.tier, m = G.mods;
    // rage quits and backfills
    while (mt.pendingLeave.length) {
      const b = mt.pendingLeave.shift();
      if (G.bots.indexOf(b) < 0) continue;
      C.post(b.name, U.pick(D.CHAT.rageQuit), 'bot');
      C.system(`${b.name} left the match`);
      mt.backfill.push({ t: U.rand(5, 9), team: b.team });
      removeBot(b);
      mt.ragequits++;
      if (mt.ragequits === 3) G.achieve('ragequits', 'Lobby Cleaner');
    }
    for (const bf of mt.backfill) {
      bf.t -= dt;
      if (bf.t <= 0) {
        bf.done = true;
        const name = genName(mt.used);
        const nb = addBot(name, bf.team, t);
        respawnBot(nb);
        nb.mesh.userData.chams.visible = m.esp >= 5 && m.espOpt.chams !== false && G.isEnemy(G.player, nb);
        C.system(`${name} joined in progress`);
        C.post(name, U.pick(D.CHAT.backfill), 'bot', { delay: 2500 });
      }
    }
    mt.backfill = mt.backfill.filter(x => !x.done);
    // vote kicks (big lobbies only)
    if (t.id < 4 || t.tourney !== undefined) return;
    if (!mt.vote) {
      mt.voteCD -= dt;
      if (mt.voteCD <= 0 && mt.sus >= 80) {
        const enemies = G.bots.filter(b => G.isEnemy(G.player, b));
        if (!enemies.length) return;
        const caller = U.pick(enemies);
        mt.vote = { t: 7, caller };
        C.system(`VOTE KICK: ${caller.name} wants to kick ${G.player.name} (reason: "obviously cheating"). F1 yes / F2 no`, { priority: true });
        NA.UI.centerMsg('VOTE KICK STARTED AGAINST YOU', 2500);
        for (let i = 0; i < 2; i++) { const b = U.pick(enemies); C.post(b.name, U.pick(D.CHAT.vote.start), 'bot', { delay: 400 + i * 700 }); }
      }
      return;
    }
    mt.vote.t -= dt;
    if (mt.vote.t > 0) return;
    const total = G.bots.length;
    const allies = G.bots.filter(b => G.isAlly(b)).length;
    let yes = Math.round((total - allies) * U.rand(0.75, 1) + allies * U.rand(0, 0.5));
    const mom = G.botByName('mom_plays_too') && G.isAlly(G.botByName('mom_plays_too'));
    mt.vote = null;
    mt.voteCD = 70;
    if (m.voteRig) {
      C.system(`Vote failed: 0 yes / ${total} no`, { priority: true });
      const b = G.randomEnemy(); if (b) C.post(b.name, U.pick(D.CHAT.vote.fail), 'bot', { delay: 700 });
      G.addSus(-15);
      return;
    }
    if (mom) yes = Math.max(0, yes - 1);
    const need = Math.ceil(total * 0.6);
    if (yes >= need && Math.random() < 0.6) {
      C.system(`Vote passed: ${yes} yes / ${total - yes} no. ${G.player.name} was kicked.`, { priority: true });
      endMatch(false, 'vote');
    } else {
      C.system(`Vote failed: ${Math.min(yes, need - 1)} yes / ${total - Math.min(yes, need - 1)} no${mom ? ' (mom_plays_too voted no)' : ''}`, { priority: true });
      const b = G.randomEnemy(); if (b) C.post(b.name, U.pick(D.CHAT.vote.fail), 'bot', { delay: 700 });
    }
  }

  // ---------------------------------------------------------------- match tick
  function updateMatch(dt, now) {
    const mt = G.match, p = G.player, m = G.mods;
    mt.time -= dt;
    if (mt.time <= 0) { mt.time = 0; endByTime(); return; }
    mt.sndT += dt; if (mt.sndT > 1) { mt.sndT = 0; mt.snd = 0; }
    mt.susIdle += dt;
    if (mt.susIdle > 3) mt.sus -= (m.anyActive ? 0.5 : 2) * dt;
    const floor = m.kdSpoof ? 0 : U.clamp((p.kills - p.deaths) * 2, 0, 50);
    mt.sus = U.clamp(Math.max(mt.sus, floor), 0, 100);
    if (mt.sus > mt.susPeak) mt.susPeak = mt.sus;
    if (mt.sus >= 40) {
      mt.reportT += dt;
      if (mt.reportT >= 5) {
        mt.reportT = 0; mt.reports++;
        NA.Save.data.stats.reports++;
        G.addDet(1.2);
        if (mt.reports % 3 === 1) C.system('Thank you for your report! Our team will review it within 3–5 business years.');
      }
    }
    mt.ambientT -= dt;
    if (mt.ambientT <= 0) {
      mt.ambientT = mt.tier.mode === 'duel' ? U.rand(12, 20) : U.rand(6, 12);
      const b = G.randomBot();
      if (b) {
        const own = D.CHAT.personal[b.name];
        const band = C.band(mt.sus, G.act());
        let text = own && (band < 2 || b.name === 'mom_plays_too') && Math.random() < 0.75 ? U.pick(own) : C.line('ambient', band);
        if (G.ranked && !b.story && Math.random() < 0.45) text = U.pick(band >= 2 ? D.CHAT.ac.sus : D.CHAT.ac.ambient);
        C.post(b.name, text, G.isAlly(b) ? 'team' : 'bot');
      }
    }
    mt.visT -= dt;
    if (mt.visT <= 0) {
      mt.visT = 0.15;
      const e = eye(tv1);
      for (const b of G.bots) {
        if (!b.alive) { b.visToPlayer = false; continue; }
        const vis = p.pos.distanceTo(b.pos) < 120 && W.los(e.x, e.y, e.z, b.pos.x, b.pos.y + 1.2, b.pos.z);
        if (vis && !b.visToPlayer) b.visibleSince = now;
        b.visToPlayer = vis;
      }
    }
    updateSocial(dt);
    updateLoot(dt, now);
    if (G.ranked && G.state === 'playing') updateDetection(dt);
  }

  // ---------------------------------------------------------------- frame
  G.update = function (dt, now) {
    if (G.state === 'lobby') {
      G.lobbyT -= dt;
      NA.UI.lobbyTick(Math.ceil(Math.max(0, G.lobbyT)));
      if (G.lobbyT <= 0) beginPlay();
    } else if (G.state === 'playing' && !G.paused) {
      updatePlayer(dt, now);
      for (let i = 0; i < G.bots.length; i++) updateBot(G.bots[i], dt, now);
      if (G.state === 'playing') updateMatch(dt, now);
    }
    FX.update(dt);
    updateCamera(dt);
    updateVM(dt);
  };

  function updateCamera(dt) {
    const cam = NA.R.camera, p = G.player;
    if (!p || G.state === 'idle') {
      if (cam.fov !== BASE_FOV) { cam.fov = BASE_FOV; cam.updateProjectionMatrix(); }
      G.fovNow = BASE_FOV;
      return;
    }
    if (p.alive) { G.deathCam = 0; cam.position.set(p.pos.x, p.pos.y + EYE, p.pos.z); }
    else { G.deathCam = Math.min(1, (G.deathCam || 0) + dt * 2.5); cam.position.set(p.pos.x, p.pos.y + EYE - 1.2 * G.deathCam, p.pos.z); }
    cam.rotation.order = 'YXZ';
    cam.rotation.set(p.pitch, p.yaw, p.alive ? 0 : 0.45 * G.deathCam);
    const w = G.curW();
    const target = G.ads && G.state === 'playing' ? BASE_FOV / Math.max(1.25, w.scope || 1.25) : BASE_FOV;
    const f = Math.abs(G.fovNow - target) < 0.05 ? target : U.lerp(G.fovNow, target, Math.min(1, dt * 14));
    if (f !== G.fovNow || cam.fov !== f) { G.fovNow = f; cam.fov = f; cam.updateProjectionMatrix(); }
  }

  // Slow orbit over the map behind menus.
  G.menuCamera = function (t) {
    const cam = NA.R.camera, size = W.current ? W.current.def.size : [32, 20];
    const big = Math.max(size[0], size[1]);
    const r = big * 0.62;
    cam.position.set(Math.sin(t * 0.08) * r, Math.max(9, big * 0.22), Math.cos(t * 0.08) * r);
    cam.rotation.order = 'YXZ';
    cam.lookAt(0, 0, 0);
  };

  // ---------------------------------------------------------------- effects
  const FX = { tracers: [], parts: [], ti: 0, pi: 0 };
  G.initFX = function () {
    const scene = NA.R.scene;
    const tg = new THREE.BoxGeometry(0.03, 0.03, 1);
    tg.translate(0, 0, 0.5);
    for (let i = 0; i < 60; i++) {
      const m = new THREE.Mesh(tg, new THREE.MeshBasicMaterial({ color: 0xfff1a6, transparent: true, opacity: 0, depthWrite: false }));
      m.visible = false; m.frustumCulled = false;
      scene.add(m);
      FX.tracers.push({ m, t: 0, life: 0.09 });
    }
    const pg = new THREE.BoxGeometry(0.09, 0.09, 0.09);
    for (let i = 0; i < 120; i++) {
      const m = new THREE.Mesh(pg, new THREE.MeshBasicMaterial({ color: 0xffffff }));
      m.visible = false;
      scene.add(m);
      FX.parts.push({ m, v: new THREE.Vector3(), t: 0, life: 0 });
    }
    buildViewmodel();
  };
  FX.tracer = function (from, to, color) {
    const tr = FX.tracers[FX.ti++ % FX.tracers.length];
    const dist = from.distanceTo(to);
    if (dist < 0.05) return;
    tr.m.position.copy(from);
    tr.m.lookAt(to);
    tr.m.scale.set(1, 1, dist);
    tr.m.material.color.setHex(color);
    tr.m.material.opacity = 0.9;
    tr.m.visible = true;
    tr.t = 0;
  };
  function spawnPart(pos, color, vel, life) {
    const pt = FX.parts[FX.pi++ % FX.parts.length];
    pt.m.position.copy(pos);
    pt.m.material.color.setHex(color);
    pt.v.copy(vel);
    pt.t = 0; pt.life = life;
    pt.m.visible = true;
  }
  FX.burst = function (pos, color) {
    for (let i = 0; i < 12; i++) {
      spawnPart(tv3.set(pos.x + U.rand(-0.3, 0.3), pos.y + U.rand(0.4, 1.7), pos.z + U.rand(-0.3, 0.3)),
        i % 3 === 0 ? 0xf1c9a5 : color, new THREE.Vector3(U.rand(-3, 3), U.rand(2, 6), U.rand(-3, 3)), U.rand(0.6, 1));
    }
  };
  FX.puff = function (pos) {
    for (let i = 0; i < 3; i++) spawnPart(pos, 0xbfc3ca, new THREE.Vector3(U.rand(-1.5, 1.5), U.rand(0.5, 2.5), U.rand(-1.5, 1.5)), 0.35);
  };
  FX.update = function (dt) {
    for (const tr of FX.tracers) {
      if (!tr.m.visible) continue;
      tr.t += dt;
      tr.m.material.opacity = Math.max(0, 0.9 * (1 - tr.t / tr.life));
      if (tr.t >= tr.life) tr.m.visible = false;
    }
    for (const pt of FX.parts) {
      if (!pt.m.visible) continue;
      pt.t += dt;
      pt.v.y -= 15 * dt;
      pt.m.position.addScaledVector(pt.v, dt);
      if (pt.m.position.y < 0.05) { pt.m.position.y = 0.05; pt.v.y *= -0.3; pt.v.x *= 0.6; pt.v.z *= 0.6; }
      pt.m.rotation.x += dt * 6; pt.m.rotation.y += dt * 4;
      if (pt.t >= pt.life) pt.m.visible = false;
    }
  };
  G.FX = FX;

  // ---------------------------------------------------------------- viewmodel
  const VM = { group: null, kick: 0, flashT: 0, bobT: 0, models: {}, muzzleZ: {} };
  function buildViewmodel() {
    const scene = NA.R.vmScene;
    const dark = new THREE.MeshLambertMaterial({ color: 0x2a2d33 }), mid = new THREE.MeshLambertMaterial({ color: 0x454a53 });
    const acc = new THREE.MeshLambertMaterial({ color: 0xe8822e }), wood = new THREE.MeshLambertMaterial({ color: 0x7a5232 });
    const glass = new THREE.MeshLambertMaterial({ color: 0x1e3a5f });
    const box = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); return o; };
    const grp = (...parts) => { const g = new THREE.Group(); g.add(...parts); return g; };
    VM.models.pistol = grp(box(0.07, 0.09, 0.26, mid, 0, 0, -0.08), box(0.05, 0.05, 0.12, dark, 0, 0.01, -0.26),
      box(0.06, 0.15, 0.07, dark, 0, -0.1, 0.0), box(0.072, 0.02, 0.06, acc, 0, 0.055, -0.15));
    VM.muzzleZ.pistol = -0.34;
    VM.models.smg = grp(box(0.075, 0.1, 0.4, mid, 0, 0, -0.14), box(0.04, 0.04, 0.14, dark, 0, 0.01, -0.4),
      box(0.05, 0.2, 0.06, dark, 0, -0.14, -0.16), box(0.06, 0.14, 0.07, dark, 0, -0.1, 0.0), box(0.03, 0.03, 0.18, dark, 0, 0.02, 0.14), box(0.03, 0.03, 0.08, acc, 0, 0.065, -0.1));
    VM.muzzleZ.smg = -0.5;
    VM.models.rifle = grp(box(0.08, 0.11, 0.55, mid, 0, 0, -0.2), box(0.045, 0.045, 0.3, dark, 0, 0.02, -0.6),
      box(0.06, 0.15, 0.08, dark, 0, -0.11, -0.02), box(0.06, 0.17, 0.07, dark, 0, -0.12, -0.25),
      box(0.07, 0.09, 0.2, dark, 0, -0.01, 0.17), box(0.03, 0.04, 0.12, acc, 0, 0.08, -0.15));
    VM.muzzleZ.rifle = -0.78;
    VM.models.dmr = grp(box(0.08, 0.11, 0.62, mid, 0, 0, -0.22), box(0.04, 0.04, 0.36, dark, 0, 0.02, -0.7),
      box(0.06, 0.15, 0.08, dark, 0, -0.11, -0.02), box(0.06, 0.12, 0.07, dark, 0, -0.1, -0.28),
      box(0.07, 0.1, 0.22, wood, 0, -0.01, 0.18), box(0.06, 0.06, 0.22, glass, 0, 0.1, -0.18));
    VM.muzzleZ.dmr = -0.9;
    VM.models.sniper = grp(box(0.08, 0.1, 0.7, wood, 0, 0, -0.22), box(0.038, 0.038, 0.5, dark, 0, 0.02, -0.82),
      box(0.06, 0.14, 0.08, dark, 0, -0.1, -0.02), box(0.07, 0.07, 0.3, glass, 0, 0.11, -0.2), box(0.08, 0.08, 0.04, dark, 0, 0.11, -0.36),
      box(0.07, 0.11, 0.2, wood, 0, -0.02, 0.2), box(0.02, 0.02, 0.06, acc, 0.05, 0.04, -0.05));
    VM.muzzleZ.sniper = -1.08;
    VM.models.shotgun = grp(box(0.085, 0.1, 0.5, mid, 0, 0, -0.18), box(0.05, 0.05, 0.42, dark, 0, 0.03, -0.55),
      box(0.06, 0.05, 0.3, wood, 0, -0.04, -0.5), box(0.06, 0.15, 0.08, dark, 0, -0.11, 0.0), box(0.07, 0.1, 0.22, wood, 0, -0.01, 0.18));
    VM.muzzleZ.shotgun = -0.78;
    VM.models.lmg = grp(box(0.1, 0.13, 0.62, mid, 0, 0, -0.2), box(0.05, 0.05, 0.36, dark, 0, 0.02, -0.68),
      box(0.12, 0.13, 0.16, acc, 0, -0.1, -0.2), box(0.06, 0.15, 0.08, dark, 0, -0.12, 0.02), box(0.08, 0.1, 0.2, dark, 0, -0.01, 0.2),
      box(0.03, 0.12, 0.03, dark, 0.03, -0.1, -0.6), box(0.03, 0.12, 0.03, dark, -0.03, -0.1, -0.6));
    VM.muzzleZ.lmg = -0.88;
    VM.group = new THREE.Group();
    for (const k in VM.models) VM.group.add(VM.models[k]);
    VM.group.scale.setScalar(0.9);
    VM.base = new THREE.Vector3(0.25, -0.23, -0.46);
    const fc = document.createElement('canvas');
    fc.width = fc.height = 64;
    const fg = fc.getContext('2d'), grad = fg.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,250,220,1)'); grad.addColorStop(0.35, 'rgba(255,190,70,0.85)'); grad.addColorStop(1, 'rgba(255,120,0,0)');
    fg.fillStyle = grad; fg.fillRect(0, 0, 64, 64);
    const fm = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(fc), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    VM.flash = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), fm);
    VM.flash.visible = false;
    VM.group.add(VM.flash);
    scene.add(VM.group);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.0));
    const dl = new THREE.DirectionalLight(0xffffff, 0.6); dl.position.set(1, 2, 1); scene.add(dl);
  }
  function updateVM(dt) {
    if (!VM.group) return;
    const p = G.player;
    const w = G.curW(), cls = w.cls;
    for (const k in VM.models) VM.models[k].visible = k === cls;
    const scoped = G.ads && (w.scope || 0) >= 2.5;
    VM.group.visible = G.state === 'playing' && !!p && p.alive && !scoped;
    if (!VM.group.visible) return;
    VM.kick = Math.max(0, VM.kick - dt * 7);
    const moving = Math.hypot(G.input.mx, G.input.mz) > 0.1 && p.onGround;
    VM.bobT += dt * (moving ? 9 : 2);
    const bob = moving ? 0.012 : 0.004;
    let dip = 0;
    if (p.reloadT > 0) dip = Math.sin((1 - p.reloadT / p.reloadTotal) * Math.PI) * 0.18;
    const adsX = G.ads ? -0.25 : 0, adsY = G.ads ? 0.1 : 0;
    VM.group.position.set(VM.base.x + adsX + Math.cos(VM.bobT) * bob, VM.base.y + adsY + Math.abs(Math.sin(VM.bobT)) * bob - dip, VM.base.z + VM.kick * 0.07);
    VM.group.rotation.x = VM.kick * 0.22 + dip * 2;
    if (VM.flashT > 0) {
      VM.flashT -= dt;
      VM.flash.visible = true;
      VM.flash.position.set(0, 0.02, VM.muzzleZ[cls] || -0.5);
      VM.flash.rotation.z = Math.random() * 3;
      const s = U.rand(0.8, 1.3) * (cls === 'shotgun' || cls === 'sniper' ? 1.6 : 1);
      VM.flash.scale.set(s, s, s);
    } else VM.flash.visible = false;
  }

  // ---------------------------------------------------------------- dev hooks (used by automated tests)
  G.dev = {
    credits(n) { NA.Save.data.credits += n; NA.Save.save(); },
    unlock(t) { NA.Save.data.highestTier = Math.max(NA.Save.data.highestTier, t); if (t >= 2) NA.Save.data.guns.ar7 = true; NA.Save.save(); },
    killAll() { for (const b of G.bots.slice()) if (b.alive && G.isEnemy(G.player, b)) damageBot(b, 9999, G.player, true); },
    endMatch(won) { endMatch(won); },
    give(id, rarity) { const w = D.WEAPONS[id]; G.player.slots[w.slot] = inst(id, rarity || 0); G.selectSlot(w.slot); },
    sus(v) { G.match.sus = v; },
    det(v) { G.match.det = v; },
  };

  // ---------------------------------------------------------------- admin panel actions
  G.admin = function (act, amount) {
    const s = NA.Save.data, inMatch = G.state === 'playing';
    const maxCheats = () => { for (const c of D.CHEATS) { s.cheats[c.id] = Object.assign(s.cheats[c.id] || {}, { level: c.max, use: c.max, enabled: true }); } s.flags.firstBuy = true; };
    const allGuns = () => { for (const id of D.WEAPON_ORDER) s.guns[id] = true; };
    const tiers = () => { s.highestTier = D.MAX_PLAYABLE_TIER; s.guns.ar7 = true; if (!s.loadout.primary) s.loadout.primary = 'ar7'; };
    let msg = '';
    switch (act) {
      case 'c10k': s.credits += 1e4; s.lifetimeCredits += 1e4; msg = '+₡10,000'; break;
      case 'custom': {
        const n = Math.floor(+amount || 0);
        if (n <= 0) return 'Type an amount first';
        s.credits = Math.min(1e15, s.credits + n); s.lifetimeCredits += n; msg = '+' + U.fmt(n); break;
      }
      case 'unban': { const r = s.ranked; r.banUntil = 0; r.perma = false; r.offenses = 0; r.appeal = null; r.bypassDetected = false; msg = 'Ranked ban cleared'; break; }
      case 'det0': if (!G.match) return 'Start a match first'; G.match.det = 0; G.match.detPeak = 0; msg = 'Warden detection cleared'; break;
      case 'setzero': s.credits = 0; msg = 'Credits set to ₡0'; break;
      case 'c1m': s.credits += 1e6; s.lifetimeCredits += 1e6; msg = '+₡1,000,000'; break;
      case 'tiers': tiers(); msg = 'All tiers unlocked'; break;
      case 'cheats': maxCheats(); msg = 'Every cheat maxed'; break;
      case 'guns': allGuns(); msg = 'Every gun owned'; break;
      case 'everything': tiers(); maxCheats(); allGuns(); s.credits += 1e6; msg = 'Everything unlocked'; break;
      case 'god': G.god = !G.god; msg = 'God mode ' + (G.god ? 'on' : 'off'); break;
      case 'speed': G.speed = G.speed >= 4 ? 1 : G.speed * 2; msg = 'Game speed ' + G.speed + '×'; break;
      case 'killall': if (!inMatch && !G.paused) return 'Start a match first'; G.dev.killAll(); msg = 'Lobby deleted'; break;
      case 'win': if (!G.match || G.state !== 'playing') return 'Start a match first'; G.paused = false; endMatch(true); msg = 'GG'; break;
      case 'sus': if (!G.match) return 'Start a match first'; G.match.sus = 0; G.match.susPeak = 0; msg = 'Suspicion cleared'; break;
      case 'legendary': {
        if (!G.player || G.state !== 'playing') return 'Start a match first';
        const wi = G.curInst(); wi.rarity = 4; wi.ammo = D.WEAPONS[wi.id].mag; msg = 'Legendary ' + D.WEAPONS[wi.id].name; break;
      }
      default: return '';
    }
    NA.Save.save();
    G.computeMods();
    return msg;
  };

  NA.Game = G;
})(window.NA);
