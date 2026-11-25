/* NO ANTICHEAT: player, handicaps, cheats, bots, matches and effects. */
(function (NA) {
  'use strict';
  const U = NA.U, D = NA.DATA, A = NA.Audio, W = NA.World, C = NA.Chat;
  const DEG = U.DEG;
  const EYE = 1.6, PR = 0.35, PH = 1.8, GRAV = 22, JUMP_V = 7.3, WALK = 5, BR = 0.4, BOT_SPEED = 3.8;
  const FFA_COLORS = [0xe5484d, 0xf59e0b, 0x22c55e, 0xa855f7];
  const TOGGLES = D.CHEATS.filter(c => c.toggle).map(c => c.id);

  const G = {
    state: 'idle', paused: false, panic: false, bots: [], match: null, player: null, mods: null,
    lastAcc: 0, speed: 1, aimLock: false, aimTarget: null, turnLog: [], trigT: 0,
    input: { mx: 0, mz: 0, fire: false, jump: false, lookDX: 0, lookDY: 0 },
  };
  const tv1 = new THREE.Vector3(), tv2 = new THREE.Vector3(), tv3 = new THREE.Vector3();

  // ---------------------------------------------------------------- cheats -> modifiers
  G.computeMods = function () {
    const s = NA.Save.data;
    const on = id => {
      const c = s.cheats[id];
      if (!c || !c.level || G.panic || c.enabled === false) return 0;
      return Math.max(1, Math.min(c.level, c.use || c.level));
    };
    const ab = on('aimbot'), tb = on('triggerbot');
    const m = {
      swayMult: Math.max(0.1, 1 - 0.18 * on('steady')),
      panic: on('steady') < 3,
      spreadMult: Math.max(0, 1 - 0.2 * on('nospread')),
      recoilMult: Math.max(0, 1 - on('norecoil') / 3),
      assistR: on('aimassist') ? 2 + on('aimassist') : 0,
      assistPull: 15 * on('aimassist'),
      aimbot: ab ? { lvl: ab, fov: [10, 20, 45, 90, 360][ab - 1], speed: [90, 180, 400, Infinity, Infinity][ab - 1] } : null,
      trigger: tb ? [0.25, 0.12, 0][tb - 1] : null,
      radar: on('radar') > 0,
      esp: on('wallhack'),
      speedMult: 1 + 0.25 * on('speedhack'),
      fireRateMult: 1 + 0.3 * on('rapidfire'),
      infAmmo: on('infammo') > 0,
      kdSpoof: on('kdspoof') > 0,
      payoutMult: 1 + 0.15 * NA.Save.level('affiliate'),
      practiceDone: !!(s.practiceStartedAt && Date.now() - s.practiceStartedAt >= 3600e6),
    };
    if (m.practiceDone) m.swayMult *= 0.95;
    m.anyActive = TOGGLES.some(id => on(id) > 0);
    G.mods = m;
    for (const b of G.bots) b.mesh.userData.chams.visible = m.esp >= 5;
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
  G.achieve = function (id, title) {
    const s = NA.Save.data;
    if (s.achievements.indexOf(id) >= 0) return;
    s.achievements.push(id);
    NA.Save.save();
    NA.UI.toast('Achievement: ' + title);
  };

  // ---------------------------------------------------------------- entities
  function newPlayer() {
    return {
      name: NA.Save.data.username, team: 'A', isPlayer: true, pos: new THREE.Vector3(), vy: 0, onGround: true,
      yaw: 0, pitch: 0, hp: 100, alive: true, respawnT: 0, lastHurtT: -99, lastKillT: -99,
      kills: 0, deaths: 0, headshots: 0, shotsFired: 0, shotsHit: 0, streak: 0,
      weapon: NA.Save.data.highestTier >= 2 ? 'rifle' : 'pistol', ammo: { pistol: 12, rifle: 30 },
      reloadT: 0, reloadTotal: 1, fireCD: 0, bloom: 0, recP: 0, recY: 0, offYaw: 0, offPitch: 0,
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
  function makeBotMesh(color) {
    if (!geo) {
      geo = {
        body: new THREE.CapsuleGeometry(0.34, 0.8, 4, 10), head: new THREE.SphereGeometry(0.22, 14, 10),
        visor: new THREE.BoxGeometry(0.32, 0.09, 0.1), gun: new THREE.BoxGeometry(0.08, 0.09, 0.55),
      };
    }
    const g = new THREE.Group();
    g.rotation.order = 'YXZ';
    const body = new THREE.Mesh(geo.body, mat(color)); body.position.y = 0.76;
    const head = new THREE.Mesh(geo.head, mat(0xf1c9a5)); head.position.y = 1.62;
    const visor = new THREE.Mesh(geo.visor, mat(0x15171c)); visor.position.set(0, 1.66, -0.17);
    const gun = new THREE.Mesh(geo.gun, mat(0x24262b)); gun.position.set(0.24, 1.15, -0.32);
    const chams = new THREE.Group();
    const cb = new THREE.Mesh(geo.body, chamsMat()); cb.position.y = 0.76; cb.renderOrder = 10;
    const ch = new THREE.Mesh(geo.head, chamsMat()); ch.position.y = 1.62; ch.renderOrder = 10;
    chams.add(cb, ch);
    chams.visible = false;
    g.add(body, head, visor, gun, chams);
    g.userData.chams = chams;
    return g;
  }
  function genName(used) {
    for (let i = 0; i < 20; i++) {
      let n;
      const r = Math.random();
      if (r < 0.2) n = U.pick(D.NAME_SPECIAL);
      else {
        n = U.pick(D.NAME_A) + U.pick(D.NAME_B) + U.pick(['', '7', '99', '1337', '_', '2009', '42']);
        if (Math.random() < 0.25) n = 'xX_' + n + '_Xx';
        else if (Math.random() < 0.15) n = 'ttv_' + n.toLowerCase();
      }
      if (!used.has(n)) { used.add(n); return n; }
    }
    return 'player' + U.randInt(100, 999);
  }
  function addBot(name, team, tier) {
    const color = team === 'A' ? 0x3b82f6 : team === 'B' ? 0xe5484d : FFA_COLORS[G.bots.length % FFA_COLORS.length];
    const mesh = makeBotMesh(color);
    NA.R.scene.add(mesh);
    const b = {
      name, team, color, isPlayer: false, story: !!D.CHARACTERS[name],
      pos: new THREE.Vector3(), vy: 0, onGround: true, yaw: 0, hp: tier.bot.hp, maxHp: tier.bot.hp, alive: true,
      stats: tier.bot, mesh, target: null, canSee: false, perceptT: Math.random() * 0.2, reactT: 0, fireCD: 0,
      strafeDir: 1, strafeT: 0, path: null, pathI: 0, repathT: 0, lastSeen: null, stuckT: 0, lastPos: new THREE.Vector3(),
      lastAttacker: null, lastAttackT: -99, kills: 0, deaths: 0, respawnT: 0, deathT: 0, visToPlayer: false, visibleSince: -1,
    };
    G.bots.push(b);
    return b;
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
    ent.pos.set(s[0], 0, s[1]);
    ent.pos.y = Math.max(0, W.groundAt(s[0], s[1], 0.3, 10));
    ent.vy = 0;
    ent.yaw = Math.atan2(s[0], s[1]);
  }
  function spawnPlayer() {
    const p = G.player;
    placeAt(p, pickSpawn(p));
    p.pitch = 0; p.hp = 100; p.alive = true; p.reloadT = 0; p.bloom = 0; p.recP = p.recY = 0;
    p.ammo = { pistol: D.WEAPONS.pistol.mag, rifle: D.WEAPONS.rifle.mag };
  }
  function respawnBot(b) {
    placeAt(b, pickSpawn(b));
    b.hp = b.maxHp; b.alive = true; b.target = null; b.canSee = false; b.path = null; b.deathT = 0;
    b.mesh.visible = true; b.mesh.rotation.x = 0;
    b.mesh.position.copy(b.pos); b.mesh.rotation.y = b.yaw;
  }

  // ---------------------------------------------------------------- match lifecycle
  G.startMatch = function (tierId) {
    const tier = D.TIERS.find(t => t.id === tierId);
    W.build(NA.R.scene, tier.map);
    clearBots();
    G.panic = false;
    G.player = newPlayer();
    G.player.team = tier.mode === 'ffa' ? 'P' : 'A';
    const used = new Set([NA.Save.data.username]);
    tier.allies.forEach(n => { used.add(n); addBot(n, 'A', tier); });
    tier.enemies.forEach((n, i) => {
      const name = n === '*' ? genName(used) : n;
      used.add(name);
      addBot(name, tier.mode === 'ffa' ? 'F' + i : 'B', tier);
    });
    G.computeMods();
    G.match = {
      tier, time: tier.timeLimit, score: { A: 0, B: 0 }, sus: G.act() === 1 ? 0 : 10, susPeak: 0, susIdle: 0,
      reportT: 0, reports: 0, ambientT: U.rand(6, 10), multiExtra: 0, liveCredits: 0, firstSeen: {}, rapidShots: 0,
      killfeed: [], visT: 0, momNice: 0, startTime: 0, ended: false,
    };
    spawnPlayer();
    G.bots.forEach(respawnBot);
    G.state = 'lobby';
    G.lobbyT = 4;
    G.paused = false;
    G.aimLock = false;
    G.turnLog = [];
    C.clear();
    G.bots.forEach((b, i) => C.post('SYSTEM', `${b.name} joined the lobby`, 'system', { delay: i * 250 }));
    C.system(`Anticheat status: Coming Soon™ (posted {days} days ago)`);
    NA.UI.showLobby();
  };

  function beginPlay() {
    const s = NA.Save.data, t = G.match.tier;
    G.state = 'playing';
    G.match.startTime = performance.now();
    NA.UI.showHUD();
    if (s.stats.matches === 0 && t.id === 1) { C.system('Welcome to FRAGLINE! Tip: aim at the enemy.'); C.beat(D.STORY.intro, 1800); }
    else if (s.flags.improvedPending && G.botByName('BOT_Kevin')) { s.flags.improvedPending = false; C.beat(D.STORY.improved); }
    if (t.id === 2 && !s.flags.momHello) { s.flags.momHello = true; C.beat(D.STORY.momHello, 1500); }
    if (t.id === 3 && !s.flags.grindHello) { s.flags.grindHello = true; C.beat(D.STORY.grindHello); }
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
    G.toIdle();
    NA.UI.showMenu();
  };
  G.toIdle = function () {
    G.state = 'idle';
    G.paused = false;
    G.input.fire = false;
    clearBots();
  };

  function computePayout(won) {
    const t = G.match.tier, p = G.player;
    const lines = [];
    lines.push([won ? 'Win' : 'Loss (25% of base)', won ? t.base : Math.round(t.base * 0.25)]);
    if (p.kills) lines.push([`Kills ×${p.kills}`, p.kills * t.kill]);
    if (p.headshots) lines.push([`Headshots ×${p.headshots}`, Math.round(p.headshots * t.kill * 0.5)]);
    if (G.match.multiExtra) lines.push([`Multikills +${G.match.multiExtra}`, G.match.multiExtra * t.kill]);
    if (won && p.deaths === 0) lines.push(['Flawless', Math.round(t.base * 0.25)]);
    const sub = lines.reduce((a, l) => a + l[1], 0);
    const mult = G.mods.payoutMult;
    if (mult > 1) lines.push([`Affiliate ×${mult.toFixed(2)}`, Math.round(sub * (mult - 1))]);
    return { lines, total: Math.round(sub * mult) };
  }

  function endMatch(won) {
    if (G.state !== 'playing') return;
    G.state = 'results';
    G.input.fire = false;
    const p = G.player, mt = G.match, t = mt.tier, s = NA.Save.data;
    const pay = computePayout(won);
    const acc = p.shotsFired ? Math.round(100 * p.shotsHit / p.shotsFired) : 0;
    G.lastAcc = acc;
    s.credits += pay.total; s.lifetimeCredits += pay.total;
    const st = s.stats;
    st.matches++; if (won) st.wins++;
    st.kills += p.kills; st.deaths += p.deaths; st.headshots += p.headshots;
    st.shotsFired += p.shotsFired; st.shotsHit += p.shotsHit;
    st.accHistory.push(acc); if (st.accHistory.length > 60) st.accHistory.shift();
    let unlocked = null, comingSoon = false;
    if (won) {
      s.winsByTier[t.id] = (s.winsByTier[t.id] || 0) + 1;
      if (s.winsByTier[t.id] >= t.winsToUnlock && s.highestTier <= t.id) {
        if (t.id < D.MAX_PLAYABLE_TIER) { s.highestTier = t.id + 1; unlocked = D.TIERS.find(x => x.id === t.id + 1); }
        else if (!s.flags.comingSoon) { s.flags.comingSoon = true; comingSoon = true; }
      }
    }
    if (p.shotsFired >= 10 && acc < 5) G.achieve('skill_issue', 'Skill Issue');
    if (won && p.deaths === 0) G.achieve('flawless', 'Flawless');
    // post-match chat
    const band = C.band(mt.sus, G.act());
    const speakers = U.shuffle(G.bots).slice(0, Math.min(2, G.bots.length));
    speakers.forEach((b, i) => {
      if (b.name === 'BOT_Kevin' && st.matches === 1) return;
      const pool = won ? (band >= 2 ? 'postWinSus' : 'postWin') : 'postLoss';
      C.post(b.name, U.pick(D.CHAT[pool]), G.isAlly(b) ? 'team' : 'bot', { delay: 600 + i * 900 });
    });
    if (st.matches === 1) {
      C.beat(D.STORY.firstEnd);
      if (!s.flags.sellerIntro) { s.flags.sellerIntro = true; D.STORY.sellerIntro.forEach(l => C.dm(l)); }
    }
    if (comingSoon) {
      D.STORY.comingSoon.forEach(l => C.dm(l));
      C.system('Courtyard 5v5: Coming Soon™');
    }
    NA.Save.save();
    if (won) A.win(); else A.lose();
    NA.UI.showResults({ won, pay, acc, unlocked, comingSoon, rows: scoreboard(), peakSus: Math.round(mt.susPeak) });
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
    if (G.mods.kdSpoof) amt *= 0.8;
    mt.sus = U.clamp(mt.sus + amt, 0, 100);
    mt.susIdle = 0;
    if (mt.sus > mt.susPeak) mt.susPeak = mt.sus;
  };
  function firstSeen(id) {
    const mt = G.match;
    if (!mt || mt.firstSeen[id]) return;
    mt.firstSeen[id] = true;
    const b = G.randomEnemy();
    if (b) C.post(b.name, U.pick(D.CHAT.firstSeen[id]), 'bot', { delay: 500 });
  }

  // ---------------------------------------------------------------- kills
  function registerKill(killer, victim, head) {
    const mt = G.match, p = G.player, now = performance.now();
    killer.kills++;
    victim.deaths++;
    if (mt.tier.mode === 'tdm' && (killer.team === 'A' || killer.team === 'B')) mt.score[killer.team]++;
    mt.killfeed.push({ k: killer.name, v: victim.name, head, mine: killer === p, me: victim === p, t: now, kt: killer.team, vt: victim.team });
    if (mt.killfeed.length > 6) mt.killfeed.shift();
    if (killer === p) {
      const t = mt.tier;
      p.streak++;
      if (head) p.headshots++;
      mt.liveCredits += t.kill * (head ? 1.5 : 1);
      let susGain = 1 + (head ? 1 : 0);
      if (now - p.lastKillT < 2000) {
        mt.multiExtra++; susGain += 2;
        if (t.id === 3 && G.botByName('ttv_clipfarmer') && !NA.Save.data.flags.clip) { NA.Save.data.flags.clip = true; C.beat(D.STORY.clip); }
      }
      p.lastKillT = now;
      const turned = G.turnLog.reduce((a, e) => a + (now - e.t < 150 ? e.deg : 0), 0);
      if (turned > 60) { susGain += 4; firstSeen('aimbot'); }
      if (G.mods.esp && victim.visibleSince > 0 && now - victim.visibleSince < 700) firstSeen('wallhack');
      if (G.usedTrigger) firstSeen('triggerbot');
      G.addSus(susGain);
      A.kill(); NA.haptic('MEDIUM');
      NA.UI.killPop(head);
      // victim reaction
      const band = C.band(mt.sus, G.act());
      if (Math.random() < 0.45) {
        const npc = D.CHAT.npcKilled[victim.name];
        C.post(victim.name, npc && band < 2 ? U.pick(npc) : C.line('killed', band), 'bot', { delay: U.rand(300, 900) });
      }
      if (mt.tier.mode === 'tdm' && mt.momNice < 3 && G.botByName('mom_plays_too') && Math.random() < 0.6) {
        mt.momNice++;
        C.post('mom_plays_too', U.pick(D.STORY.momNice), 'team', { delay: 1200 });
      }
      if (t.id === 3 && G.aimLock && !NA.Save.data.flags.aimbotReveal) { NA.Save.data.flags.aimbotReveal = true; C.beat(D.STORY.aimbotReveal, 1300); }
    }
    if (victim === p) {
      p.streak = 0;
      NA.UI.centerMsg(`Killed by ${killer.name}`, 1800);
      if (Math.random() < 0.25 && !killer.isPlayer) C.post(killer.name, U.pick(D.CHAT.taunt[G.act()]), G.isAlly(killer) ? 'team' : 'bot', { delay: 500 });
    }
    checkWin();
  }

  function damageBot(b, dmg, attacker, head) {
    if (!b.alive) return;
    b.hp -= dmg;
    b.lastAttacker = attacker;
    b.lastAttackT = performance.now();
    if (attacker === G.player) { NA.UI.hitmarker(head); if (head) A.headshot(G.player.streak); else A.hit(); NA.haptic('LIGHT'); }
    if (b.hp <= 0) {
      b.alive = false; b.hp = 0; b.respawnT = 3; b.deathT = 0;
      FX.burst(b.pos, b.color);
      registerKill(attacker, b, head);
    }
  }
  function damagePlayer(dmg, attacker) {
    const p = G.player;
    if (!p.alive) return;
    p.hp -= dmg;
    p.lastHurtT = performance.now();
    NA.UI.hurt(attacker);
    A.hurt();
    if (p.hp <= 0) {
      p.hp = 0; p.alive = false; p.respawnT = 2;
      p.reloadT = 0;
      registerKill(attacker, p, false);
    }
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
    p.yaw -= inp.lookDX;
    p.pitch = U.clamp(p.pitch - inp.lookDY, -85 * DEG, 85 * DEG);
    inp.lookDX = inp.lookDY = 0;
    aimHelpers(dt, now);

    // movement
    const speed = WALK * m.speedMult;
    const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), rx = Math.cos(p.yaw), rz = -Math.sin(p.yaw);
    let mvx = fx * inp.mz + rx * inp.mx, mvz = fz * inp.mz + rz * inp.mx;
    const len = Math.hypot(mvx, mvz);
    if (len > 1) { mvx /= len; mvz /= len; }
    p.pos.x += mvx * speed * dt; W.collide(p.pos, PR, PH, 'x');
    p.pos.z += mvz * speed * dt; W.collide(p.pos, PR, PH, 'z');
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
    if (now - p.lastHurtT > 4000 && p.hp < 100) p.hp = Math.min(100, p.hp + 10 * dt);
  }

  function handicaps(dt, now) {
    const p = G.player, m = G.mods;
    const t = now / 1000;
    let amp = 5 * m.swayMult;
    if (m.panic && (now - p.lastHurtT < 2000 || nearestEnemyDist() < 8)) amp *= 1.6;
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

  // Aim assist and aimbot both turn the camera so that the aim point (camera + sway + recoil) lands on a target.
  function aimHelpers(dt, now) {
    const p = G.player, m = G.mods;
    G.aimLock = false; G.aimTarget = null;
    while (G.turnLog.length && now - G.turnLog[0].t > 300) G.turnLog.shift();
    if (!m.aimbot && !m.assistR) return;
    const e = eye(tv1);
    const limit = m.aimbot ? m.aimbot.fov / 2 : m.assistR;
    const aYaw = p.yaw + p.offYaw, aPitch = p.pitch + p.offPitch;
    let best = null, bestAng = Infinity, bestYaw = 0, bestPitch = 0;
    for (const b of G.bots) {
      if (!b.alive || !G.isEnemy(p, b)) continue;
      const tx = b.pos.x, ty = b.pos.y + 1.2, tz = b.pos.z;
      const dx = tx - e.x, dy = ty - e.y, dz = tz - e.z;
      const dist = Math.hypot(dx, dy, dz);
      if (dist > 90) continue;
      const ty2 = Math.atan2(-dx, -dz), tp = Math.asin(dy / dist);
      const ang = Math.hypot(U.wrap(ty2 - aYaw), tp - aPitch) / DEG;
      if (ang <= limit && ang < bestAng && W.los(e.x, e.y, e.z, tx, ty, tz)) { best = b; bestAng = ang; bestYaw = ty2; bestPitch = tp; }
    }
    if (!best) return;
    const wantYaw = bestYaw - p.offYaw, wantPitch = U.clamp(bestPitch - p.offPitch, -85 * DEG, 85 * DEG);
    const speed = m.aimbot ? m.aimbot.speed : m.assistPull;
    const before = p.yaw;
    if (speed === Infinity) { p.yaw = wantYaw; p.pitch = wantPitch; }
    else {
      const step = speed * DEG * dt;
      p.yaw = U.approachAngle(p.yaw, wantYaw, step);
      p.pitch = U.approach(p.pitch, wantPitch, step);
    }
    const turned = Math.abs(U.wrap(p.yaw - before)) / DEG;
    if (turned > 0.5) G.turnLog.push({ t: now, deg: turned });
    if (m.aimbot) { G.aimLock = true; G.aimTarget = best; }
  }

  function spread(dir, cone) {
    if (cone <= 0) return dir;
    const r = cone * Math.sqrt(Math.random()), th = Math.random() * Math.PI * 2;
    const up = Math.abs(dir.y) < 0.99 ? tv3.set(0, 1, 0) : tv3.set(1, 0, 0);
    const right = new THREE.Vector3().crossVectors(dir, up).normalize();
    const up2 = new THREE.Vector3().crossVectors(right, dir).normalize();
    return dir.addScaledVector(right, Math.tan(r) * Math.cos(th)).addScaledVector(up2, Math.tan(r) * Math.sin(th)).normalize();
  }
  G.spreadCone = () => (G.player ? (4.5 + G.player.bloom) * G.mods.spreadMult : 0);

  function trace(o, dir, shooter) {
    const wallT = W.ray(o.x, o.y, o.z, dir.x, dir.y, dir.z, 120);
    let best = null, bestT = wallT;
    for (const b of G.bots) {
      if (!b.alive || !G.isEnemy(shooter, b)) continue;
      const th = U.raySphere(o.x, o.y, o.z, dir.x, dir.y, dir.z, b.pos.x, b.pos.y + 1.62, b.pos.z, 0.25);
      const tb = U.rayBox(o.x, o.y, o.z, dir.x, dir.y, dir.z,
        { minX: b.pos.x - 0.36, maxX: b.pos.x + 0.36, minY: b.pos.y + 0.02, maxY: b.pos.y + 1.45, minZ: b.pos.z - 0.36, maxZ: b.pos.z + 0.36 }, bestT);
      const t = Math.min(th, tb);
      if (t < bestT) { bestT = t; best = { bot: b, head: th <= tb, t }; }
    }
    const point = new THREE.Vector3().copy(o).addScaledVector(dir, Math.min(bestT, 120));
    if (best) { best.point = point; return best; }
    return { bot: null, point, t: bestT, wall: wallT < 120 };
  }

  function weapon(dt, now) {
    const p = G.player, m = G.mods, w = D.WEAPONS[p.weapon];
    p.fireCD -= dt;
    if (p.reloadT > 0) {
      p.reloadT -= dt;
      if (p.reloadT <= 0) { p.ammo[p.weapon] = w.mag; p.shotsSinceReload = 0; }
      return;
    }
    let want = G.input.fire;
    G.usedTrigger = false;
    if (m.trigger !== null && !want) {
      const hit = trace(eye(tv1), aimDir(tv2), p);
      if (hit.bot) { G.trigT += dt; if (G.trigT >= m.trigger) { want = true; G.usedTrigger = true; } }
      else G.trigT = 0;
    }
    if (want && p.fireCD <= 0) {
      if (p.ammo[p.weapon] <= 0 && !m.infAmmo) { G.reload(); return; }
      fire(now);
      p.fireCD = 1 / (w.rate * m.fireRateMult);
    }
  }
  function fire(now) {
    const p = G.player, m = G.mods, w = D.WEAPONS[p.weapon];
    if (!m.infAmmo) p.ammo[p.weapon]--;
    p.shotsFired++; p.shotsSinceReload++;
    const o = eye(new THREE.Vector3());
    const dir = spread(aimDir(new THREE.Vector3()), G.spreadCone() * DEG);
    p.bloom = Math.min(5, p.bloom + 1);
    p.recP = Math.min(p.recP + 2.5 * m.recoilMult * DEG, 12 * DEG);
    p.recY = U.clamp(p.recY + U.rand(-1.5, 1.5) * m.recoilMult * DEG, -6 * DEG, 6 * DEG);
    const hit = trace(o, dir, p);
    FX.tracer(muzzleWorld(new THREE.Vector3()), hit.point, 0xfff1a6);
    VM.kick = 1; VM.flashT = 0.05;
    A.shot(p.weapon, 0);
    if (hit.bot) { p.shotsHit++; damageBot(hit.bot, w.dmg * (hit.head ? w.head : 1), p, hit.head); }
    else if (hit.wall) FX.puff(hit.point);
    if (m.fireRateMult > 1 && ++G.match.rapidShots === 15) firstSeen('rapidfire');
    if (m.infAmmo && p.shotsSinceReload === w.mag * 2 + 1) firstSeen('infammo');
    if (p.ammo[p.weapon] <= 0 && !m.infAmmo) G.reload();
  }
  function muzzleWorld(out) {
    const cam = NA.R.camera;
    out.set(0.22, -0.2, -0.7).applyQuaternion(cam.quaternion).add(cam.position);
    return out;
  }
  G.reload = function () {
    const p = G.player;
    if (!p || !p.alive || G.state !== 'playing') return;
    const w = D.WEAPONS[p.weapon];
    if (p.reloadT > 0 || G.mods.infAmmo || p.ammo[p.weapon] >= w.mag) return;
    let t = w.reload;
    if (Math.random() < 0.15) {
      t += 1.5;
      NA.UI.toast('Fumbled the reload');
      A.fumble();
      if (Math.random() < 0.6) { const b = G.randomEnemy(); if (b) C.post(b.name, U.pick(D.CHAT.fumble), 'bot', { delay: 400 }); }
    } else A.reload();
    p.reloadT = t; p.reloadTotal = t;
  };
  G.swapWeapon = function () {
    const p = G.player;
    if (!p || NA.Save.data.highestTier < 2) { NA.UI.toast('Rifle unlocks at Tier 2'); return; }
    p.weapon = p.weapon === 'pistol' ? 'rifle' : 'pistol';
    p.reloadT = 0; p.fireCD = 0.35;
  };
  G.jump = () => { G.input.jump = true; };

  // ---------------------------------------------------------------- bots
  function perceive(b, now) {
    const st = b.stats;
    const ex = b.pos.x, ey = b.pos.y + 1.55, ez = b.pos.z;
    let best = null, bestD = 60;
    for (const e of G.entities()) {
      if (!e.alive || !G.isEnemy(b, e)) continue;
      const dx = e.pos.x - ex, dz = e.pos.z - ez;
      const d = Math.hypot(dx, dz);
      if (d > bestD) continue;
      const ang = Math.abs(U.wrap(Math.atan2(-dx, -dz) - b.yaw));
      const recent = b.lastAttacker === e && now - b.lastAttackT < 3000;
      if (ang > 55 * DEG && !recent) continue;
      if (!W.los(ex, ey, ez, e.pos.x, e.pos.y + 1.2, e.pos.z)) continue;
      best = e; bestD = d;
    }
    if (best !== b.target) { b.target = best; b.reactT = st.react * U.rand(0.7, 1.3); }
    b.canSee = !!best;
  }
  function botShoot(b, tgt, dist) {
    let chance = b.stats.acc;
    if (dist > 40) chance *= 0.7;
    const hit = Math.random() < chance;
    const from = tv1.set(0.24, 1.15, -0.6).applyAxisAngle(new THREE.Vector3(0, 1, 0), b.yaw).add(b.pos).clone();
    const to = new THREE.Vector3(tgt.pos.x, tgt.pos.y + 1.2, tgt.pos.z);
    if (!hit) to.add(new THREE.Vector3(U.rand(-1, 1), U.rand(-0.6, 0.8), U.rand(-1, 1)).normalize().multiplyScalar(U.rand(0.6, 1.4)));
    FX.tracer(from, to, 0xffc46b);
    A.shot('bot', G.player ? G.player.pos.distanceTo(b.pos) : 20);
    if (hit) { if (tgt.isPlayer) damagePlayer(b.stats.dmg, b); else damageBot(tgt, b.stats.dmg, b, false); }
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
    b.perceptT -= dt;
    if (b.perceptT <= 0) { b.perceptT = 0.2; perceive(b, now); }
    let mvx = 0, mvz = 0;
    const tgt = b.target;
    if (tgt && tgt.alive && b.canSee) {
      const dx = tgt.pos.x - b.pos.x, dz = tgt.pos.z - b.pos.z;
      const dist = Math.hypot(dx, dz) || 1;
      b.yaw = U.approachAngle(b.yaw, Math.atan2(-dx, -dz), 6 * dt);
      b.strafeT -= dt;
      if (b.strafeT <= 0) { b.strafeT = U.rand(0.5, 1.5); b.strafeDir = Math.random() < 0.5 ? -1 : 1; }
      mvx = (-dz / dist) * b.strafeDir * 0.8;
      mvz = (dx / dist) * b.strafeDir * 0.8;
      if (dist > 18) { mvx += dx / dist * 0.6; mvz += dz / dist * 0.6; }
      else if (dist < 6) { mvx -= dx / dist * 0.5; mvz -= dz / dist * 0.5; }
      b.reactT -= dt;
      if (b.reactT <= 0) {
        b.fireCD -= dt;
        if (b.fireCD <= 0) { botShoot(b, tgt, dist); b.fireCD = (1 / b.stats.rate) * U.rand(0.85, 1.15); }
      }
      b.lastSeen = { x: tgt.pos.x, z: tgt.pos.z };
      b.path = null;
    } else {
      b.repathT -= dt;
      if (!b.path || b.pathI >= b.path.length || b.repathT <= 0) {
        const goal = b.lastSeen && Math.random() < 0.75 ? b.lastSeen : W.randomPoint();
        b.path = W.findPath(b.pos.x, b.pos.z, goal.x, goal.z) || [];
        b.pathI = 0; b.repathT = U.rand(3, 6); b.lastSeen = null;
      }
      const wp = b.path[b.pathI];
      if (wp) {
        const dx = wp.x - b.pos.x, dz = wp.z - b.pos.z, d = Math.hypot(dx, dz);
        if (d < 0.6) b.pathI++;
        else { mvx = dx / d; mvz = dz / d; b.yaw = U.approachAngle(b.yaw, Math.atan2(-dx, -dz), 5 * dt); }
      }
    }
    const l = Math.hypot(mvx, mvz);
    if (l > 1) { mvx /= l; mvz /= l; }
    b.pos.x += mvx * BOT_SPEED * dt; W.collide(b.pos, BR, PH, 'x');
    b.pos.z += mvz * BOT_SPEED * dt; W.collide(b.pos, BR, PH, 'z');
    const yPrev = b.pos.y;
    b.vy -= GRAV * dt; b.pos.y += b.vy * dt;
    const g = W.groundAt(b.pos.x, b.pos.z, BR * 0.7, yPrev);
    if (b.pos.y <= g) { b.pos.y = g; b.vy = 0; }
    // unstick
    b.stuckT += dt;
    if (b.stuckT > 1) {
      if (l > 0.3 && b.pos.distanceTo(b.lastPos) < 0.3) { b.path = null; b.strafeDir *= -1; }
      b.lastPos.copy(b.pos); b.stuckT = 0;
    }
    b.mesh.position.copy(b.pos);
    b.mesh.rotation.y = b.yaw;
  }

  // ---------------------------------------------------------------- match tick
  function updateMatch(dt, now) {
    const mt = G.match, p = G.player, m = G.mods;
    mt.time -= dt;
    if (mt.time <= 0) { mt.time = 0; endByTime(); return; }
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
        if (mt.reports % 3 === 1) C.system('Thank you for your report! Our team will review it within 3–5 business years.');
      }
    }
    mt.ambientT -= dt;
    if (mt.ambientT <= 0) {
      mt.ambientT = mt.tier.mode === 'duel' ? U.rand(12, 20) : U.rand(7, 14);
      const b = G.randomBot();
      if (b) {
        const own = D.CHAT.personal[b.name];
        const band = C.band(mt.sus, G.act());
        const text = own && (band < 2 || b.name === 'mom_plays_too') && Math.random() < 0.75 ? U.pick(own) : C.line('ambient', band);
        C.post(b.name, text, G.isAlly(b) ? 'team' : 'bot');
      }
    }
    // who can the player see (used to spot wallhack prefires)
    mt.visT -= dt;
    if (mt.visT <= 0) {
      mt.visT = 0.15;
      const e = eye(tv1);
      for (const b of G.bots) {
        if (!b.alive) { b.visToPlayer = false; continue; }
        const vis = W.los(e.x, e.y, e.z, b.pos.x, b.pos.y + 1.2, b.pos.z);
        if (vis && !b.visToPlayer) b.visibleSince = now;
        b.visToPlayer = vis;
      }
    }
  }

  // ---------------------------------------------------------------- frame
  G.update = function (dt, now) {
    if (G.state === 'lobby') {
      G.lobbyT -= dt;
      NA.UI.lobbyTick(Math.ceil(Math.max(0, G.lobbyT)));
      if (G.lobbyT <= 0) beginPlay();
    } else if (G.state === 'playing' && !G.paused) {
      updatePlayer(dt, now);
      for (const b of G.bots) updateBot(b, dt, now);
      if (G.state === 'playing') updateMatch(dt, now);
    }
    FX.update(dt);
    updateCamera(dt);
    updateVM(dt);
  };

  function updateCamera(dt) {
    const cam = NA.R.camera, p = G.player;
    if (!p || G.state === 'idle') return;
    if (p.alive) { G.deathCam = 0; cam.position.set(p.pos.x, p.pos.y + EYE, p.pos.z); }
    else { G.deathCam = Math.min(1, (G.deathCam || 0) + dt * 2.5); cam.position.set(p.pos.x, p.pos.y + EYE - 1.2 * G.deathCam, p.pos.z); }
    cam.rotation.order = 'YXZ';
    cam.rotation.set(p.pitch, p.yaw, p.alive ? 0 : 0.45 * G.deathCam);
  }

  // Slow orbit over the map behind menus.
  G.menuCamera = function (t) {
    const cam = NA.R.camera, size = W.current ? W.current.def.size : [32, 20];
    const r = Math.max(size[0], size[1]) * 0.62;
    cam.position.set(Math.sin(t * 0.08) * r, size[0] > 35 ? 13 : 9, Math.cos(t * 0.08) * r);
    cam.rotation.order = 'YXZ';
    cam.lookAt(0, 0, 0);
  };

  // ---------------------------------------------------------------- effects
  const FX = { tracers: [], parts: [], ti: 0, pi: 0 };
  G.initFX = function () {
    const scene = NA.R.scene;
    const tg = new THREE.BoxGeometry(0.03, 0.03, 1);
    tg.translate(0, 0, 0.5);
    for (let i = 0; i < 40; i++) {
      const m = new THREE.Mesh(tg, new THREE.MeshBasicMaterial({ color: 0xfff1a6, transparent: true, opacity: 0, depthWrite: false }));
      m.visible = false; m.frustumCulled = false;
      scene.add(m);
      FX.tracers.push({ m, t: 0, life: 0.09 });
    }
    const pg = new THREE.BoxGeometry(0.09, 0.09, 0.09);
    for (let i = 0; i < 90; i++) {
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
    for (let i = 0; i < 14; i++) {
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
  const VM = { group: null, kick: 0, flashT: 0, bobT: 0 };
  function buildViewmodel() {
    const scene = NA.R.vmScene;
    const dark = new THREE.MeshLambertMaterial({ color: 0x2a2d33 }), mid = new THREE.MeshLambertMaterial({ color: 0x454a53 }), acc = new THREE.MeshLambertMaterial({ color: 0xe8822e });
    const box = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); return o; };
    VM.pistol = new THREE.Group();
    VM.pistol.add(box(0.07, 0.09, 0.26, mid, 0, 0, -0.08), box(0.05, 0.05, 0.12, dark, 0, 0.01, -0.26),
      box(0.06, 0.15, 0.07, dark, 0, -0.1, 0.0), box(0.072, 0.02, 0.06, acc, 0, 0.055, -0.15));
    VM.rifle = new THREE.Group();
    VM.rifle.add(box(0.08, 0.11, 0.55, mid, 0, 0, -0.2), box(0.045, 0.045, 0.3, dark, 0, 0.02, -0.6),
      box(0.06, 0.15, 0.08, dark, 0, -0.11, -0.02), box(0.06, 0.17, 0.07, dark, 0, -0.12, -0.25),
      box(0.07, 0.09, 0.2, dark, 0, -0.01, 0.17), box(0.03, 0.04, 0.12, acc, 0, 0.08, -0.15));
    VM.group = new THREE.Group();
    VM.group.add(VM.pistol, VM.rifle);
    VM.group.scale.setScalar(0.9);
    VM.base = new THREE.Vector3(0.25, -0.23, -0.46);
    // Soft round flash drawn on a canvas, so it never reads as a square.
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
    const rifle = p && p.weapon === 'rifle';
    VM.pistol.visible = !rifle; VM.rifle.visible = !!rifle;
    VM.group.visible = G.state === 'playing' && !!p && p.alive;
    if (!VM.group.visible) return;
    VM.kick = Math.max(0, VM.kick - dt * 7);
    const moving = Math.hypot(G.input.mx, G.input.mz) > 0.1 && p.onGround;
    VM.bobT += dt * (moving ? 9 : 2);
    const bob = moving ? 0.012 : 0.004;
    let dip = 0;
    if (p.reloadT > 0) dip = Math.sin((1 - p.reloadT / p.reloadTotal) * Math.PI) * 0.18;
    VM.group.position.set(VM.base.x + Math.cos(VM.bobT) * bob, VM.base.y + Math.abs(Math.sin(VM.bobT)) * bob - dip, VM.base.z + VM.kick * 0.07);
    VM.group.rotation.x = VM.kick * 0.22 + dip * 2;
    if (VM.flashT > 0) {
      VM.flashT -= dt;
      VM.flash.visible = true;
      VM.flash.position.set(0, 0.02, rifle ? -0.78 : -0.34);
      VM.flash.rotation.z = Math.random() * 3;
      const s = U.rand(0.8, 1.3);
      VM.flash.scale.set(s, s, s);
    } else VM.flash.visible = false;
  }

  // ---------------------------------------------------------------- dev hooks (used by automated tests)
  G.dev = {
    credits(n) { NA.Save.data.credits += n; NA.Save.save(); },
    unlock(t) { NA.Save.data.highestTier = Math.max(NA.Save.data.highestTier, t); NA.Save.save(); },
    killAll() { for (const b of G.bots) if (b.alive && G.isEnemy(G.player, b)) damageBot(b, 999, G.player, true); },
    endMatch(won) { endMatch(won); },
  };

  NA.Game = G;
})(window.NA);
