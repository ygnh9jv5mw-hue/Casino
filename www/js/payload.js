/* NO ANTICHEAT: 5v5 Payload. Attackers carry a payload drive to one of two server sites and plug it
   in; defenders stop them or pull it back out. First to 5 rounds, sides swap after round 4. Every round
   starts with a buy phase (round credits, separate from cheat credits), nobody respawns until the next
   round, and everyone plays an agent (see agents.js). Bots play the objective: attackers group up and
   plant, defenders hold their sites, rotate when they spot the push, and retake. */
(function (NA) {
  'use strict';
  const U = NA.U, D = NA.DATA, A = NA.Audio, C = NA.Chat;
  const P = NA.Payload = {};
  const G = () => NA.Game, Wd = () => NA.World, AG = () => NA.Agents;
  const DEG = Math.PI / 180;

  // two sites on the defenders' half (+x) of each map: [x, z, radius]
  const SITES = {
    courtyard: { A: [13, -15, 4], B: [13, 15, 4] },
    office: { A: [9, -16, 4], B: [9, 16, 4] },
    servers: { A: [6.5, -15, 4], B: [6.5, 15, 4] },
    lancafe: { A: [8, -8, 3.5], B: [8, 8, 3.5] },
    arena: { A: [17, -14, 4.5], B: [17, 14, 4.5] },
  };
  P.MAPS = Object.keys(SITES);
  const CFG = {
    toWin: 5, half: 4, buy1: 20, buy: 15, live: 100, plant: 4, defuse: 6, drive: 40, end: 4.5,
    start: 800, kill: 200, plantCr: 300, win: 3000, loss: 1900, lossStep: 500, lossMax: 2900, cap: 9000,
  };
  P.CFG = CFG;

  // ---------------------------------------------------------------- the buy menu (round credits)
  // Armory guns (bought with cheat credits in the Armory) only show up if you own them.
  const SHOP = [
    { id: 'p9', cr: 0, cat: 'Sidearms' }, { id: 'tec', cr: 400, cat: 'Sidearms' }, { id: 'viper', cr: 800, cat: 'Sidearms' },
    { id: 'wasp', cr: 900, cat: 'SMGs' }, { id: 'hornet', cr: 1600, cat: 'SMGs' },
    { id: 'thumper', cr: 1000, cat: 'Shotguns' }, { id: 'brawler', cr: 1850, cat: 'Shotguns' },
    { id: 'ar7', cr: 2050, cat: 'Rifles' }, { id: 'talon', cr: 2250, cat: 'Rifles' }, { id: 'kodiak', cr: 2900, cat: 'Rifles' }, { id: 'vanguard', cr: 3100, cat: 'Rifles' },
    { id: 'dmr', cr: 2500, cat: 'Snipers' }, { id: 'longbow', cr: 4700, cat: 'Snipers' }, { id: 'grinder', cr: 3200, cat: 'Heavy' },
    { id: 'ranger', cr: 1100, cat: 'Sidearms', armory: true }, { id: 'hailstorm', cr: 5200, cat: 'Snipers', armory: true },
    { id: 'buzzsaw', cr: 5800, cat: 'Heavy', armory: true }, { id: 'railspike', cr: 6500, cat: 'Snipers', armory: true },
  ];
  const ARMOR = { light: { cr: 400, amt: 25, name: 'Light Shield' }, heavy: { cr: 1000, amt: 50, name: 'Heavy Shield' } };
  P.SHOP = SHOP; P.ARMOR = ARMOR;
  P.price = id => (SHOP.find(s => s.id === id) || { cr: 0 }).cr;
  P.shopList = () => SHOP.filter(s => !s.armory || NA.Save.data.guns[s.id]);

  let S = null;
  P.active = () => !!S;
  P.st = () => S;
  P.pending = null; // { agent, map, ranked } chosen in the menus before the match

  const other = t => (t === 'A' ? 'B' : 'A');
  const alive = team => G().entities().filter(e => e.alive && e.team === team);
  const bySide = side => G().entities().filter(e => e.team === (side === 'atk' ? S.atk : other(S.atk)));
  const dist2d = (a, x, z) => Math.hypot(a.pos.x - x, a.pos.z - z);
  const yawTo = (fx, fz, tx, tz) => Math.atan2(-(tx - fx), -(tz - fz));
  const cap = n => Math.min(CFG.cap, n);

  // Boss matches: a made-up pro team, a different one every day.
  const BOSSES = [
    { id: 'vortex', name: 'Team Vortex', tag: 'VTX', color: '#a855f7', players: ['kairo', 'lumen', 'zest', 'mako', 'quill'], comp: ['spark', 'hush', 'bulwark', 'ping', 'rook'], line: 'gl hf. you will need both' },
    { id: 'northwind', name: 'Northwind', tag: 'NWD', color: '#38bdf8', players: ['frost', 'oslo', 'brine', 'hale', 'tundr4'], comp: ['blitz', 'static', 'anchor', 'echo', 'quake'], line: 'warm-up game, right?' },
    { id: 'ember', name: 'Ember Rising', tag: 'EMB', color: '#f97316', players: ['cinder', 'ash', 'flare', 'pyr0', 'smolder'], comp: ['rook', 'mirage', 'lockdown', 'hawk', 'spark'], line: 'we watched your clips. interesting aim' },
    { id: 'nullsig', name: 'Null Signal', tag: 'NUL', color: '#e2e8f0', players: ['zer0', 'void', 'hexx', 'byte', 'glitch'], comp: ['quake', 'shade', 'tripwire', 'relay', 'blitz'], line: 'scrim partner cancelled so here we are' },
  ];
  P.BOSSES = BOSSES;
  P.boss = () => BOSSES[Math.floor(Date.now() / 86400000) % BOSSES.length];
  P.bossUnlocked = () => NA.Save.data.highestTier >= 4;
  // The tier for a Payload match: bots and pay scale with the highest tier you've reached.
  P.tier = function (mapId, boss) {
    const s = NA.Save.data, ht = Math.max(2, Math.min(D.MAX_PLAYABLE_TIER, s.highestTier)), base = D.TIERS.find(t => t.id === ht);
    const t = {
      id: ht, payload: true, mode: 'payload', modeLabel: '5v5 Payload', name: '5v5 Payload', rank: base.rank,
      map: mapId && SITES[mapId] ? mapId : U.pick(P.MAPS), scoreToWin: CFG.toWin, timeLimit: 99999,
      base: Math.round(base.base * 2), kill: base.kill, winsToUnlock: 99, shield: 0,
      bot: Object.assign({}, base.bot, { weapons: ['p9'] }),
      enemies: ['*', '*', '*', '*', '*'], allies: ['*', '*', '*', '*'],
    };
    if (boss) {
      const B = P.boss();
      Object.assign(t, { boss: B, name: `Boss match · ${B.name}`, rank: 'Pro', base: Math.round(base.base * 5), kill: Math.round(base.kill * 2), enemies: B.players.map(n => `${B.tag} ${n}`) });
      t.bot = Object.assign({}, t.bot, { skill: U.clamp(base.bot.skill + 0.25, 0.62, 0.95), react: Math.min(base.bot.react, 0.33), rateMul: Math.max(base.bot.rateMul, 0.95) });
    }
    return t;
  };
  P.unlocked = () => NA.Save.data.highestTier >= 2;

  // ---------------------------------------------------------------- setup (called by startMatch)
  P.setup = function (tier) {
    const g = G(), p = g.player, pend = P.pending || {};
    const def = SITES[tier.map];
    S = {
      tier, round: 0, score: { A: 0, B: 0 }, atk: 'A', phase: 'pre', t: 0, liveT: 0, lossRun: { A: 0, B: 0 },
      sites: {}, drive: null, plantT: 0, defuseT: 0, defuseKeep: 0, holdKey: false, prog: 0, progKind: null,
      roundsWon: 0, history: [], spec: 0, deadT: 0, matchOver: null, rotate: null, rotateAt: 0, scanT: 0,
      barriers: [], beepT: 0, myPlants: 0, myDefuses: 0, aces: 0,
    };
    for (const k of ['A', 'B']) {
      const s = def[k], sn = Wd().snap(s[0], s[1]) || { x: s[0], z: s[1] };
      S.sites[k] = { id: k, x: sn.x, z: sn.z, r: s[2] };
    }
    const sp = Wd().current.def.spawns;
    const cen = list => ({ x: list.reduce((a, q) => a + q[0], 0) / list.length, z: list.reduce((a, q) => a + q[1], 0) / list.length });
    S.spawnAtk = cen(sp.A); S.spawnDef = cen(sp.B);
    S.barAtk = Math.max.apply(null, sp.A.map(q => q[0])) + 3.5;
    S.barDef = Math.min.apply(null, sp.B.map(q => q[0])) - 3.5;
    // your hired teammates (or fills)
    if (NA.Team) { NA.Team.apply(g.bots.filter(b => b.team === p.team), tier); NA.Team.reset(); }
    // agents: yours, then the bots pick (no repeats inside a team)
    const used = { A: new Set(), B: new Set() };
    p.agent = AG().BY[pend.agent] ? pend.agent : 'spark';
    used.A.add(p.agent);
    if (tier.boss) g.bots.filter(b => b.team !== p.team).forEach((b, i) => { b.agent = tier.boss.comp[i % 5]; b.pers = ['rusher', 'flex', 'camper', 'sniper', 'rusher'][i % 5]; b.boss = true; });
    for (const b of g.bots) {
      const pool = AG().LIST.filter(a => !used[b.team].has(a.id));
      const a = b.agent && AG().BY[b.agent] && !used[b.team].has(b.agent) ? AG().BY[b.agent] : U.pick(pool);
      used[b.team].add(a.id); b.agent = a.id;
      b.pers = b.pers || pickPersonality();
    }
    for (const e of g.entities()) {
      e.kit = AG().kit(e.agent); e.st = null; AG().st(e);
      e.cr = CFG.start; e.plants = 0; e.defuses = 0; e.maxShield = 100; e.shield = 0; e.rk = 0;
    }
  };
  function pickPersonality() { const r = Math.random(); return r < 0.3 ? 'rusher' : r < 0.52 ? 'camper' : r < 0.66 ? 'sniper' : 'flex'; }
  P.PERS = { rusher: 'Rusher', camper: 'Camper', sniper: 'Sniper', flex: 'Flex' };

  P.spawns = function (team) {
    const sp = Wd().current.def.spawns;
    return !S || team === S.atk ? sp.A : sp.B;
  };
  P.begin = function () { if (S) startRound(); };
  P.cleanup = function () {
    if (!S) return;
    AG().clear();
    removeDriveMesh();
    removeBarriers();
    S = null;
    if (NA.PUI) NA.PUI.unmount();
  };

  // ---------------------------------------------------------------- rounds
  function startRound() {
    const g = G(), p = g.player;
    S.round++;
    const first = S.round === 1, swap = S.round === CFG.half + 1;
    if (swap) {
      S.atk = 'B';
      C.system('SWITCHING SIDES: your team defends now. Credits reset.', { priority: true });
    }
    AG().clear();
    removeDriveMesh();
    S.rotate = null; S.plantT = 0; S.defuseT = 0; S.defuseKeep = 0; S.holdKey = false; S.prog = 0; S.progKind = null;
    S.spec = 0; S.deadT = 0; S.liveT = 0; S.fetcher = null; S.defuser = null; S.scanT = 0; S.clutchCalled = false;
    // everyone back to their side; survivors keep their gun and shield (not after a side swap)
    for (const team of ['A', 'B']) {
      const list = U.shuffle(P.spawns(team).slice());
      G().entities().filter(e => e.team === team).forEach((e, i) => {
        const keep = e.alive && !first && !swap;
        if (first || swap) e.cr = CFG.start;
        const s = list[i % list.length];
        if (e.isPlayer) resetPlayer(e, keep, s); else resetBot(e, keep, s);
        e.yaw = team === S.atk ? -Math.PI / 2 : Math.PI / 2;
        if (!e.isPlayer) { e.mesh.rotation.y = e.yaw; }
        e.planting = 0; e.defusing = 0; e.rk = 0;
        const a = AG().BY[e.agent];
        if (a && e.kit) { e.kit.e = Math.max(e.kit.e, a.e.max); e.kit.mark = null; }
      });
    }
    p.pitch = 0;
    spawnDrive();
    for (const team of ['A', 'B']) teamBuy(team);
    planRound();
    S.phase = 'buy';
    S.t = first || swap ? CFG.buy1 : CFG.buy;
    addBarriers();
    const mp = S.score.A === CFG.toWin - 1 || S.score.B === CFG.toWin - 1;
    const last = S.score.A === CFG.toWin - 1 && S.score.B === CFG.toWin - 1;
    if (first && S.tier.boss) {
      const B = S.tier.boss, cap0 = G().bots.find(b => b.boss);
      banner(`VS ${B.name.toUpperCase()}`, 'Boss match · five pros · no fills on their side', 'lose');
      if (cap0) C.post(cap0.name, B.line, 'bot', { delay: 1500 });
    } else banner(last ? 'LAST ROUND' : swap ? 'SIDES SWITCHED' : mp ? 'MATCH POINT' : `ROUND ${S.round}`, p.team === S.atk ? 'ATTACK · plant the drive' : 'DEFEND · stop the plant', 'neutral');
    if (NA.PUI) NA.PUI.roundStart(first || swap);
  }
  function goLive() {
    const p = G().player;
    S.phase = 'live';
    S.t = CFG.live;
    S.liveT = 0;
    removeBarriers();
    if (NA.PUI) NA.PUI.closeBuy();
    // nobody picked up the drive in spawn: the plan's carrier gets it
    const d = S.drive;
    if (d.state === 'ground' && !d.moved) {
      const carrier = G().bots.find(b => b.team === S.atk && b.alive && b.plan && b.plan.carrier) || G().bots.find(b => b.team === S.atk && b.alive);
      if (carrier) giveDrive(carrier, true);
    }
    A.tone(660, 0.12, 'square', 0.08); A.tone(990, 0.16, 'square', 0.08, 0.12);
    if (p.team === S.atk) { const b = G().bots.find(x => x.team === S.atk && x.alive && x.plan); if (b && Math.random() < 0.7) C.post(b.name, U.pick([`going ${S.target}`, `${S.target} ${S.target} ${S.target}`, `lets hit ${S.target}`, `${S.target} together, dont trickle`, `${S.target} rush no stopping`]), 'team', { delay: 600 }); }
    else { const b = G().bots.find(x => x.team === p.team && x.alive); if (b && Math.random() < 0.5) C.post(b.name, U.pick(['ill hold ' + b.plan.site, 'playing ' + b.plan.site, 'call it if you see them', 'anchor ' + b.plan.site]), 'team', { delay: 900 }); }
  }
  function endRound(win, why) {
    if (!S || S.phase === 'end') return;
    const p = G().player, lose = other(win);
    S.phase = 'end'; S.t = CFG.end; S.lastWin = win; S.why = why;
    S.score[win]++;
    S.lossRun[win] = 0; S.lossRun[lose]++;
    for (const e of G().entities()) {
      const bonus = e.team === win ? CFG.win : Math.min(CFG.lossMax, CFG.loss + CFG.lossStep * (S.lossRun[lose] - 1));
      e.cr = cap((e.cr || 0) + bonus + (e.boss ? 1200 : 0));
      e.planting = 0; e.defusing = 0;
    }
    S.history.push(win);
    S.holdKey = false; S.prog = 0;
    const mine = win === p.team;
    if (mine) S.roundsWon++;
    const why2 = { elim: mine ? 'Enemy team eliminated' : 'Your team was eliminated', time: S.atk === win ? 'Time ran out' : 'Time ran out before the plant', drive: 'The drive uploaded', defuse: 'Drive pulled out' }[why] || '';
    banner(mine ? 'ROUND WON' : 'ROUND LOST', why2, mine ? 'win' : 'lose');
    if (mine) A.win(); else A.lose();
    if (S.score[win] >= CFG.toWin) S.matchOver = win;
    // aces: one player killed all five
    const ace = G().entities().find(e => e.rk >= 5);
    if (ace) { C.system(`ACE: ${ace.name} killed all five`, { priority: true }); if (ace.isPlayer) { S.aces++; G().achieve('ace', 'Ace'); G().addSus(4); } }
  }
  function finish() {
    const p = G().player, won = S.matchOver === p.team;
    S.phase = 'over';
    P.lastScore = `${S.score[p.team]}–${S.score[other(p.team)]}`;
    const ps = NA.Save.data.plStats || (NA.Save.data.plStats = { played: 0, won: 0 });
    ps.played++; if (won) ps.won++;
    if (won && S.tier.boss) { ps.bosses = ps.bosses || []; if (ps.bosses.indexOf(S.tier.boss.id) < 0) ps.bosses.push(S.tier.boss.id); G().achieve('giant_slayer', 'Giant Slayer'); }
    G().hooks.endMatch(won);
  }

  // ---------------------------------------------------------------- entity resets
  function resetPlayer(p, keep, s) {
    G().hooks.placeAt(p, s);
    p.pitch = 0; p.hp = 100; p.alive = true; p.reloadT = 0; p.bloom = 0; p.recP = p.recY = 0; p.burstQ = 0; p.vy = 0;
    p.maxShield = 100;
    if (!keep) { p.slots = [null, G().hooks.inst('p9')]; p.slot = 1; p.shield = 0; }
    else for (const it of p.slots) if (it) it.ammo = D.WEAPONS[it.id].mag;
    if (!p.slots[p.slot]) p.slot = p.slots[0] ? 0 : 1;
    p.bought = {};
    G().ads = false;
    p.st = null; AG().st(p);
  }
  function resetBot(b, keep, s) {
    G().hooks.placeAt(b, s);
    b.hp = b.maxHp; b.alive = true; b.target = null; b.canSee = false; b.path = null; b.deathT = 0;
    if (!keep) { G().hooks.setBotWeapon(b, 'p9', 0); b.shield = 0; }
    b.maxShield = 100;
    b.ammo = D.WEAPONS[b.weapon].mag; b.reloadT = 0; b.frozenT = 0; b.retreatT = 0; b.queue = 0;
    b.lastSeen = null; b.lastAttacker = null; b.wallTarget = null; b.goalKey = null;
    b.prevPos.copy(b.pos); b.vel.set(0, 0, 0);
    b.mesh.visible = true; NA.Avatar.reset(b.mesh.userData.av);
    b.mesh.position.copy(b.pos);
    if (b.mesh.userData.ice) b.mesh.userData.ice.visible = false;
    b.st = null; AG().st(b);
  }

  // ---------------------------------------------------------------- buying
  // the player's buy menu
  P.buy = function (id) {
    const p = G().player;
    if (!S || S.phase !== 'buy' || !p.alive) return { ok: false, msg: 'You can only buy during the buy phase' };
    p.bought = p.bought || {};
    if (ARMOR[id]) {
      const ar = ARMOR[id];
      if (p.bought[id]) { p.cr += ar.cr; p.shield = Math.max(0, p.shield - ar.amt); delete p.bought[id]; return { ok: true, sold: true }; }
      if (p.shield >= ar.amt) return { ok: false, msg: 'You already have that much shield' };
      const other_ = id === 'light' ? 'heavy' : 'light';
      let refund = 0;
      if (p.bought[other_]) { refund = ARMOR[other_].cr; }
      if (p.cr + refund < ar.cr) return { ok: false, msg: 'Not enough credits' };
      if (p.bought[other_]) { p.cr += refund; p.shield = Math.max(0, p.shield - ARMOR[other_].amt); delete p.bought[other_]; }
      p.cr -= ar.cr; p.shield = Math.max(p.shield, ar.amt); p.bought[id] = ar.cr;
      return { ok: true };
    }
    if (id === 'abc') {
      const a = AG().BY[p.agent], k = p.kit;
      if (k.c >= a.c.max) {
        if (p.bought.abc) { p.bought.abc--; k.c--; p.cr += a.c.cost; return { ok: true, sold: true }; }
        return { ok: false, msg: 'Charges full' };
      }
      if (p.cr < a.c.cost) return { ok: false, msg: 'Not enough credits' };
      p.cr -= a.c.cost; k.c++; p.bought.abc = (p.bought.abc || 0) + 1;
      return { ok: true };
    }
    const it = SHOP.find(s => s.id === id), w = D.WEAPONS[id];
    if (!it || !w) return { ok: false };
    if (it.armory && !NA.Save.data.guns[id]) return { ok: false, msg: 'Buy it in the Armory first' };
    const slot = w.slot;
    const cur = p.slots[slot];
    if (cur && cur.id === id) {
      // tap again to sell back what you bought this round
      if (p.bought['g' + slot] && p.bought['g' + slot].id === id) {
        p.cr += p.bought['g' + slot].cr;
        p.slots[slot] = slot === 1 ? G().hooks.inst('p9') : (p.bought['g' + slot].prev ? G().hooks.inst(p.bought['g' + slot].prev) : null);
        delete p.bought['g' + slot];
        if (!p.slots[p.slot]) p.slot = 1;
        return { ok: true, sold: true };
      }
      return { ok: false, msg: 'You already have it' };
    }
    const refund = p.bought['g' + slot] ? p.bought['g' + slot].cr : 0;
    if (p.cr + refund < it.cr) return { ok: false, msg: 'Not enough credits' };
    const prev = p.bought['g' + slot] ? p.bought['g' + slot].prev : cur ? cur.id : null;
    p.cr += refund - it.cr;
    p.slots[slot] = G().hooks.inst(id);
    p.bought['g' + slot] = { id, cr: it.cr, prev: prev === 'p9' ? null : prev };
    G().selectSlot(slot);
    return { ok: true };
  };
  // bots: the team decides on a full buy, a force or an eco together
  function teamBuy(team) {
    const bots = G().bots.filter(b => b.team === team);
    if (!bots.length) return;
    const avg = bots.reduce((a, b) => a + b.cr, 0) / bots.length;
    const mp = S.score.A === CFG.toWin - 1 || S.score.B === CFG.toWin - 1;
    const mode = avg >= 3600 ? 'full' : (avg >= 2000 && (mp || Math.random() < 0.4)) ? 'force' : 'eco';
    for (const b of bots) botBuy(b, mode);
  }
  function botBuy(b, mode) {
    const w = D.WEAPONS[b.weapon], hasGun = w.slot === 0;
    const buyGun = (id, cr) => { if (b.cr >= cr) { b.cr -= cr; G().hooks.setBotWeapon(b, id, 0); return true; } return false; };
    if (!hasGun) {
      const sn = b.pers === 'sniper', rush = b.pers === 'rusher';
      if (mode === 'full' || b.cr >= 3900) {
        if (sn && b.cr >= 5300) buyGun('longbow', 4700);
        else if (sn) buyGun('dmr', 2500);
        else if (rush && Math.random() < 0.3) buyGun('hornet', 1600);
        else if (!buyGun(Math.random() < 0.7 ? 'kodiak' : 'vanguard', 3000)) buyGun('ar7', 2050);
      } else if (mode === 'force') {
        if (b.cr >= 2500) buyGun(sn ? 'dmr' : 'ar7', sn ? 2500 : 2050);
        else if (b.cr >= 1600) buyGun(rush ? 'thumper' : 'hornet', rush ? 1000 : 1600);
        else buyGun('wasp', 900);
      } else if (b.cr >= 1200 && Math.random() < 0.5 && b.weapon === 'p9') buyGun('viper', 800);
      else if (S.round === 1 || S.round === CFG.half + 1) { if (Math.random() < 0.35 && b.weapon === 'p9') buyGun('tec', 400); }
    }
    // shields: heavy when the gun is bought, light on ecos and pistol rounds
    if (b.shield < 50 && b.cr >= 1000 && (D.WEAPONS[b.weapon].slot === 0 || mode !== 'eco')) { b.cr -= 1000; b.shield = 50; }
    else if (b.shield < 25 && b.cr >= 400) { b.cr -= 400; b.shield = 25; }
    // ability charges with what's left
    const a = AG().BY[b.agent];
    while (a && b.kit.c < a.c.max && b.cr >= a.c.cost + (mode === 'eco' ? 0 : 100)) { b.cr -= a.c.cost; b.kit.c++; }
  }

  // ---------------------------------------------------------------- the drive
  function driveMesh(planted) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.22, 0.3), new THREE.MeshLambertMaterial({ color: 0x1f2937 }));
    body.position.y = 0.11;
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.05, 0.32), new THREE.MeshBasicMaterial({ color: 0x4ade80 }));
    strip.position.y = 0.17;
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.3, 6), new THREE.MeshLambertMaterial({ color: 0x9ca3af }));
    ant.position.set(0.16, 0.36, 0.08);
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: 0x4ade80 }));
    light.position.set(0.16, 0.53, 0.08);
    g.add(body, strip, ant, light);
    if (planted) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.75, 0.85, 40), new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
      ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04;
      g.add(ring);
      g.userData.ring = ring;
    }
    g.userData.light = light; g.userData.strip = strip;
    return g;
  }
  function removeDriveMesh() {
    const d = S && S.drive;
    if (d && d.mesh) { NA.R.scene.remove(d.mesh); d.mesh.traverse(m => { if (m.geometry) m.geometry.dispose(); }); d.mesh = null; }
  }
  function spawnDrive() {
    const p = G().player;
    let x = S.spawnAtk.x + 1.5, z = S.spawnAtk.z;
    if (p.team === S.atk) { x = p.pos.x + 2.2; z = p.pos.z; }
    const sn = Wd().snap(x, z) || { x, z };
    S.drive = { state: 'ground', carrier: null, x: sn.x, y: Math.max(0, Wd().groundAt(sn.x, sn.z, 0.2, 5)), z: sn.z, site: null, moved: false, mesh: driveMesh(false) };
    S.drive.mesh.position.set(S.drive.x, S.drive.y, S.drive.z);
    NA.R.scene.add(S.drive.mesh);
  }
  function giveDrive(e, quiet) {
    const d = S.drive, p = G().player;
    d.state = 'carried'; d.carrier = e; d.moved = true;
    if (d.mesh) d.mesh.visible = false;
    if (e.isPlayer) { if (!quiet) NA.UI.centerMsg('You have the drive. Plant it on site A or B', 2200); A.equip(); }
    else if (e.team === p.team && !quiet) C.post(e.name, U.pick(['got the drive', 'i have it', 'drive is mine', 'ok i got it']), 'team', { delay: 300 });
  }
  function dropDrive(e) {
    const d = S.drive;
    d.state = 'ground'; d.carrier = null;
    d.x = e.pos.x; d.z = e.pos.z; d.y = e.pos.y;
    if (d.mesh) { d.mesh.visible = true; d.mesh.position.set(d.x, d.y, d.z); }
    if (e.team === G().player.team) C.system('Drive dropped', { priority: true });
  }
  P.siteAt = function (pos) {
    for (const k of ['A', 'B']) { const s = S.sites[k]; if (Math.hypot(pos.x - s.x, pos.z - s.z) <= s.r) return s; }
    return null;
  };
  function plant(e) {
    const d = S.drive, p = G().player, site = P.siteAt(e.pos);
    S.phase = 'planted'; S.t = CFG.drive; S.plantT = 0; S.beepT = 0;
    d.state = 'planted'; d.carrier = null; d.x = e.pos.x; d.y = e.pos.y; d.z = e.pos.z; d.site = site ? site.id : '?';
    removeDriveMesh();
    d.mesh = driveMesh(true);
    d.mesh.position.set(d.x, d.y, d.z);
    NA.R.scene.add(d.mesh);
    e.plants++;
    if (e.isPlayer) S.myPlants++;
    AG().addUlt(e, 1);
    for (const o of G().entities()) if (o.team === S.atk) o.cr = cap(o.cr + CFG.plantCr);
    banner('DRIVE PLANTED', `Site ${d.site} · ${p.team === S.atk ? 'defend it' : 'pull it out'}`, p.team === S.atk ? 'win' : 'lose');
    A.tone(520, 0.2, 'sawtooth', 0.1); A.tone(780, 0.25, 'sawtooth', 0.1, 0.18);
    C.system(`${e.name} planted the drive on ${d.site}`, { priority: true });
    // everyone's plan changes: defenders retake, attackers guard
    for (const b of G().bots) if (b.plan) { b.plan.post = null; b.plan.retake = null; b.goalKey = null; }
    if (e.team !== p.team) NA.haptic && NA.haptic('HEAVY');
  }
  function defused(e) {
    const p = G().player;
    e.defuses++;
    if (e.isPlayer) { S.myDefuses++; G().addSus(1); }
    AG().addUlt(e, 1);
    C.system(`${e.name} pulled the drive`, { priority: true });
    if (S.drive.mesh && S.drive.mesh.userData.light) S.drive.mesh.userData.light.material.color.setHex(0x64748b);
    endRound(other(S.atk), 'defuse');
    if (e.team === p.team && !e.isPlayer) C.post(e.name, U.pick(['PULLED', 'ez defuse', 'got it', 'clutch pull']), 'team', { delay: 400 });
  }

  // ---------------------------------------------------------------- per-frame update (from updateMatch)
  P.update = function (dt) {
    if (!S || S.phase === 'over' || S.phase === 'pre') return;
    const g = G(), p = g.player;
    AG().tick(dt, S.phase === 'live' || S.phase === 'planted');
    if (NA.Team) NA.Team.tick(dt, S.phase === 'live' || S.phase === 'planted');
    S.t -= dt;
    if (!p.alive) S.deadT += dt; else S.deadT = 0;
    if (S.phase === 'live' || S.phase === 'planted') S.liveT += dt;
    switch (S.phase) {
      case 'buy':
        pickups();
        if (S.t <= 0) goLive();
        break;
      case 'live':
        pickups();
        brain(dt);
        playerObjective(dt);
        if (S.t <= 0) endRound(other(S.atk), 'time');
        else P.checkElim();
        break;
      case 'planted':
        brain(dt);
        playerObjective(dt);
        beeps(dt);
        if (S.t <= 0) { explode(); endRound(S.atk, 'drive'); }
        else P.checkElim();
        break;
      case 'end':
        if (S.t <= 0) { if (S.matchOver) finish(); else startRound(); }
        break;
    }
    // the drive on the ground bobs; a planted one blinks faster as the timer runs out
    const d = S.drive;
    if (d && d.mesh && d.mesh.visible) {
      const now = performance.now();
      if (d.state === 'planted') {
        const rate = S.t > 20 ? 1 : S.t > 10 ? 2 : S.t > 5 ? 4 : 8;
        d.mesh.userData.light.material.color.setHex(S.phase === 'planted' && Math.floor(now / 1000 * rate * 2) % 2 ? 0xef4444 : 0x7f1d1d);
        if (d.mesh.userData.ring) d.mesh.userData.ring.scale.setScalar(1 + 0.15 * Math.sin(now / 150));
      } else d.mesh.position.y = d.y + 0.05 + 0.05 * Math.sin(now / 250);
    }
  };
  function pickups() {
    const d = S.drive;
    if (!d || d.state !== 'ground') return;
    for (const e of G().entities()) {
      if (!e.alive || e.team !== S.atk) continue;
      if (Math.hypot(e.pos.x - d.x, e.pos.z - d.z) < 1.3) { giveDrive(e); break; }
    }
  }
  P.checkElim = function () {
    if (!S || (S.phase !== 'live' && S.phase !== 'planted')) return;
    const atkN = alive(S.atk).length, defN = alive(other(S.atk)).length;
    if (S.phase === 'live') {
      if (!atkN) endRound(other(S.atk), 'elim');
      else if (!defN) endRound(S.atk, 'elim');
    } else if (!defN) endRound(S.atk, 'elim');
  };
  function playerObjective(dt) {
    const p = G().player, d = S.drive;
    S.prog = 0; S.progKind = null; S.canPlant = false; S.canDefuse = false;
    if (!p.alive) { S.plantT = 0; return; }
    if (S.phase === 'live' && d.carrier === p) {
      S.canPlant = !!P.siteAt(p.pos) && !AG().lockedOut(p);
      if (S.canPlant && S.holdKey) {
        S.plantT += dt; S.prog = S.plantT / CFG.plant; S.progKind = 'plant';
        if (S.plantT >= CFG.plant) plant(p);
      } else S.plantT = 0;
    }
    if (S.phase === 'planted' && p.team !== S.atk) {
      S.canDefuse = Math.hypot(p.pos.x - d.x, p.pos.z - d.z) < 1.9 && !AG().lockedOut(p);
      if (S.canDefuse && S.holdKey) {
        S.defuseT += dt;
        if (S.defuseT >= CFG.defuse / 2) S.defuseKeep = CFG.defuse / 2;
        S.prog = S.defuseT / CFG.defuse; S.progKind = 'defuse';
        if (S.defuseT >= CFG.defuse) { S.defuseT = 0; defused(p); }
      } else S.defuseT = S.defuseKeep;
    }
  }
  function beeps(dt) {
    S.beepT -= dt;
    if (S.beepT > 0) return;
    S.beepT = S.t > 20 ? 1 : S.t > 10 ? 0.5 : S.t > 5 ? 0.25 : 0.12;
    const p = G().player, d = S.drive;
    const near = Math.hypot(p.pos.x - d.x, p.pos.z - d.z);
    A.tone(1250, 0.05, 'square', Math.max(0.015, 0.07 - near * 0.0012));
  }
  function explode() {
    const d = S.drive, FX = G().FX;
    for (let i = 0; i < 4; i++) { FX.burst({ x: d.x, y: d.y - 0.4, z: d.z }, 0xef4444); FX.burst({ x: d.x, y: d.y - 0.4, z: d.z }, 0x4ade80); }
    A.noiseBurst('lowpass', 160, 0.9, 0.6);
    NA.UI.flash && NA.UI.flash();
    // the upload fries everyone standing next to the server
    for (const e of G().entities()) if (e.alive && Math.hypot(e.pos.x - d.x, e.pos.z - d.z) < 7) { e.hp = 0; e.alive = false; if (e.isPlayer) { e.respawnT = 99; } else { e.deathT = 0; } }
  }

  // ---------------------------------------------------------------- player helpers (game.js / UI)
  P.setHold = v => { if (S) S.holdKey = !!v; };
  P.holding = () => !!(S && S.holdKey && (S.canPlant || S.canDefuse) && G().player.alive);
  P.frozen = () => !!(S && (S.phase === 'buy' || S.phase === 'end' || S.phase === 'pre' || S.phase === 'over'));
  P.canFire = () => !!S && S.phase !== 'buy' && S.phase !== 'end' && S.phase !== 'over' && !P.holding();
  P.speedMul = p => (P.holding() ? 0 : AG().speedMul(p));
  // the spawn barrier during the buy phase
  P.clampPlayer = function (p) {
    if (!S || S.phase !== 'buy') return;
    if (p.team === S.atk) p.pos.x = Math.min(p.pos.x, S.barAtk);
    else p.pos.x = Math.max(p.pos.x, S.barDef);
  };
  function addBarriers() {
    removeBarriers();
    const size = Wd().current.def.size;
    for (const x of [S.barAtk, S.barDef]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(size[1], 3.2), new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }));
      m.rotation.y = Math.PI / 2; m.position.set(x, 1.6, 0);
      NA.R.scene.add(m);
      S.barriers.push(m);
    }
  }
  function removeBarriers() {
    if (!S) return;
    for (const m of S.barriers) { NA.R.scene.remove(m); m.geometry.dispose(); m.material.dispose(); }
    S.barriers = [];
  }
  P.ready = function () { if (S && S.phase === 'buy') { S.t = Math.min(S.t, 0.6); } };
  // abilities from the player's buttons
  P.useAbility = function (slot) {
    const p = G().player;
    if (!S || !p.alive) return false;
    if (S.phase !== 'live' && S.phase !== 'planted') { NA.UI.toast(S.phase === 'buy' ? 'Abilities unlock when the round starts' : 'Round over'); A.deny(); return false; }
    const ok = AG().use(p, slot);
    if (!ok) {
      const a = AG().BY[p.agent], ab = a && a[slot];
      if (ab && ab.kind === 'teleport' && !p.kit.mark) NA.UI.toast('Place a Mark first (E)');
      else if (slot === 'x') NA.UI.toast(`Ultimate not ready (${p.kit.ult}/${a.x.ult})`);
      else if (slot === 'c' && p.kit.c <= 0) NA.UI.toast(`No ${ab.name} charges: buy them in the buy phase`);
      else NA.UI.toast('Not ready');
      A.deny();
      return false;
    }
    return true;
  };
  // spectating teammates after you die
  P.specTarget = function () {
    const p = G().player;
    if (!S || p.alive || S.deadT < 1.6) return null;
    const allies = G().bots.filter(b => b.alive && b.team === p.team);
    const pool = allies.length ? allies : G().bots.filter(b => b.alive);
    if (!pool.length) return null;
    return pool[((S.spec % pool.length) + pool.length) % pool.length];
  };
  P.specNext = () => { if (S) S.spec++; };
  P.ultCall = function (e, a) {
    const p = G().player;
    if (e.isPlayer) return;
    if (e.team === p.team) C.post(e.name, U.pick([`${a.x.name.toUpperCase()}!`, `ult up: ${a.x.name}`, `${a.x.name} going out`]), 'team');
    else NA.UI.centerMsg(`Enemy ${a.name}: ${a.x.name}`, 1400);
  };
  P.onKill = function (killer, victim) {
    if (!S) return;
    if (killer && killer !== victim && killer.team !== victim.team) {
      killer.cr = cap((killer.cr || 0) + CFG.kill);
      AG().addUlt(killer, 1);
      AG().onKill(killer);
      killer.rk = (killer.rk || 0) + 1;
    }
    AG().addUlt(victim, 1);
    if (S.drive && S.drive.carrier === victim) dropDrive(victim);
    victim.planting = 0; victim.defusing = 0;
    if (victim.isPlayer) { S.holdKey = false; S.spec = 0; }
    // clutch call-outs
    const p = G().player, mine = alive(p.team).length, theirs = alive(other(p.team)).length;
    if (p.alive && mine === 1 && theirs >= 2 && S.phase !== 'end' && !S.clutchCalled) { S.clutchCalled = true; NA.UI.centerMsg(`1v${theirs}: it's on you`, 1800); }
  };
  // someone left (or got banned) mid-match: no backfill in Payload, but don't take the drive with you
  P.onLeave = function (b) { if (S && S.drive && S.drive.carrier === b) dropDrive(b); };
  P.payout = function (won) {
    const t = S ? S.tier : G().match.tier, lines = [];
    const rw = S ? S.roundsWon : 0, rl = S ? S.history.length - rw : 0;
    lines.push([won ? `Match won ${rw}–${rl}` : `Match lost ${rw}–${rl} (25% of base)`, won ? t.base : Math.round(t.base * 0.25)]);
    if (rw) lines.push([`Rounds won ×${rw}`, Math.round(rw * t.base * 0.08)]);
    const obj = S ? S.myPlants + S.myDefuses : 0;
    if (obj) lines.push([`Plants and defuses ×${obj}`, obj * t.kill * 2]);
    if (S && S.aces) lines.push([`Aces ×${S.aces}`, S.aces * t.kill * 5]);
    if (won && t.boss) lines.push([`Beat ${t.boss.name}`, Math.round(t.base * 0.5)]);
    return lines;
  };
  P.dev = { plant: e => plant(e), endRound: (w, why) => endRound(w, why || 'elim'), give: e => giveDrive(e, true) };
  P.score = () => (S ? S.score : { A: 0, B: 0 });
  P.scoreText = () => { if (!S) return P.lastScore || ''; const t = G().player.team; return `${S.score[t]}–${S.score[other(t)]}`; };

  // ---------------------------------------------------------------- bots: the plan for a round
  function holdSpot(site, b, deep) {
    const s = S.sites[site] || mid();
    const back = (b && b.pers === 'sniper' ? 4.5 : deep ? 2.5 : 0.5) + U.rand(-0.5, 1.5);
    const x = s.x + back, z = s.z + U.rand(-s.r * 0.9, s.r * 0.9);
    return Wd().snap(x, z) || { x: s.x, z: s.z };
  }
  function mid() {
    const a = S.sites.A, b = S.sites.B;
    const m = Wd().snap((a.x + b.x) / 2 - 1, (a.z + b.z) / 2);
    return { id: 'mid', x: m ? m.x : (a.x + b.x) / 2, z: m ? m.z : 0, r: 4 };
  }
  function spotNear(x, z, rMin, rMax) {
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2, r = U.rand(rMin, rMax);
      const s = Wd().snap(x + Math.cos(a) * r, z + Math.sin(a) * r);
      if (s && Wd().findPath(x, z, s.x, s.z)) return s;
    }
    return Wd().snap(x, z) || { x, z };
  }
  // a spot ~11 m before the site on the way from the attackers' spawn: the team groups up there
  function stagePoint(id) {
    const s = S.sites[id];
    const path = Wd().findPath(S.spawnAtk.x, S.spawnAtk.z, s.x, s.z);
    if (!path || !path.length) return spotNear(s.x - 10, s.z, 0, 3);
    let need = 11, cur = { x: s.x, z: s.z };
    for (let i = path.length - 1; i >= 0; i--) {
      const q = path[i], dd = Math.hypot(q.x - cur.x, q.z - cur.z);
      if (dd >= need) { const k = need / dd, pt = { x: cur.x + (q.x - cur.x) * k, z: cur.z + (q.z - cur.z) * k }; return Wd().snap(pt.x, pt.z) || pt; }
      need -= dd; cur = q;
    }
    return Wd().snap(path[0].x, path[0].z) || path[0];
  }
  function retarget(id) {
    S.target = id; S.stage = stagePoint(id);
    for (const b of G().bots) if (b.team === S.atk && b.plan && b.plan.role !== 'lurk') { b.plan.site = id; b.plan.stage = null; b.plan.entry = null; b.plan.plantSpot = null; b.goalKey = null; }
  }
  function planRound() {
    const g = G(), atk = S.atk, def = other(atk);
    S.target = Math.random() < 0.5 ? 'A' : 'B';
    S.exec = false;
    S.stage = stagePoint(S.target);
    const atkBots = U.shuffle(g.bots.filter(b => b.team === atk));
    const defBots = U.shuffle(g.bots.filter(b => b.team === def));
    const carrierIdx = Math.max(0, atkBots.findIndex(b => b.pers !== 'sniper' && b.pers !== 'rusher'));
    atkBots.forEach((b, i) => {
      const lurk = i !== carrierIdx && b.pers === 'camper' && Math.random() < 0.5 && atkBots.length >= 4;
      const site = lurk ? other(S.target) : S.target;
      b.plan = {
        role: lurk ? 'lurk' : 'go', site, carrier: i === carrierIdx,
        delay: lurk ? U.rand(8, 16) : b.pers === 'rusher' ? U.rand(0, 1) : b.pers === 'camper' ? U.rand(2, 6) : U.rand(0.5, 3),
        stage: null, entry: null, post: null, retake: null, plantSpot: null,
      };
      if (b.plan.carrier) b.plan.delay = U.rand(1, 3);
    });
    // defenders: two per site and a floater (fewer bots when the player is on the team)
    defBots.forEach((b, i) => {
      const site = defBots.length >= 5 && i === 4 ? 'mid' : i % 2 === 0 ? 'A' : 'B';
      const spot = site === 'mid' ? spotNear(mid().x, mid().z, 0, 3) : holdSpot(site, b);
      b.plan = { role: 'hold', site, spot, look: null, rotateDelay: U.rand(1, 4) * (b.pers === 'camper' ? 1.6 : 1) * (b.sense ? 1.5 - b.sense / 100 : 1) };
    });
    for (const b of g.bots) { b.goalKey = null; b.path = null; }
  }
  function lookFrom(x, z) {
    // defenders look toward where attackers come from: the middle of the map, on their side of it
    return yawTo(x, z, Math.min(x - 8, (S.spawnAtk.x + x) / 2), z * 0.4);
  }
  // runs a few times a second: who fetches the drive, who defuses, did defenders spot the push
  let brainT = 0;
  function brain(dt) {
    brainT -= dt;
    if (brainT > 0) return;
    brainT = 0.4;
    const g = G(), d = S.drive, p = g.player;
    if (d.state === 'ground') {
      let best = null, bd = 1e9;
      for (const b of g.bots) { if (!b.alive || b.team !== S.atk) continue; const dd = dist2d(b, d.x, d.z); if (dd < bd) { bd = dd; best = b; } }
      // let the player grab it if they're right there
      if (p.alive && p.team === S.atk && dist2d(p, d.x, d.z) < Math.min(6, bd)) best = null;
      S.fetcher = best;
    } else S.fetcher = null;
    if (S.phase === 'planted') {
      let best = null, bd = 1e9;
      for (const b of g.bots) { if (!b.alive || b.team === S.atk) continue; const dd = dist2d(b, d.x, d.z); if (dd < bd) { bd = dd; best = b; } }
      S.defuser = best;
    }
    // attackers: follow the player if they head for the other site, then hit the site together
    if (S.phase === 'live' && !S.exec) {
      if (p.alive && p.team === S.atk) {
        const cur = S.sites[S.target], o = S.sites[other(S.target)];
        if (dist2d(p, o.x, o.z) < 16 && dist2d(p, o.x, o.z) < dist2d(p, cur.x, cur.z)) {
          retarget(o.id);
          const tb = g.bots.find(b => b.alive && b.team === S.atk);
          if (tb) C.post(tb.name, U.pick([`ok ${o.id} with you`, `fine, ${o.id}`, `switching ${o.id}`]), 'team', { delay: 300 });
        }
      }
      const atkAlive = alive(S.atk), main = atkAlive.filter(e => !e.plan || e.plan.role !== 'lurk');
      const ready = main.filter(e => dist2d(e, S.stage.x, S.stage.z) < 7).length;
      const tgt = S.sites[S.target];
      const pushing = p.alive && p.team === S.atk && dist2d(p, tgt.x, tgt.z) < tgt.r + 5;
      if ((main.length && ready >= Math.min(3, main.length)) || S.liveT > 45 || S.t < 40 || pushing) {
        S.exec = true;
        const tb = g.bots.find(b => b.alive && b.team === S.atk);
        if (tb && p.team === S.atk) C.post(tb.name, U.pick(['go go go', `GO ${S.target}`, 'everyone in', 'hit it now', 'execute']), 'team');
      }
    }
    // defenders call out the push and rotate
    if (S.phase === 'live' && !S.rotate) {
      for (const b of g.bots) {
        if (!b.alive || b.team === S.atk || !b.canSee || !b.target) continue;
        const t = b.target, site = nearestSite(t.pos.x, t.pos.z, 20);
        if (site) {
          S.rotate = site; S.rotateAt = S.liveT;
          if (b.team === p.team) C.post(b.name, U.pick([`they're ${site}`, `${site} ${site} ${site}`, `all ${site}`, `rotate ${site}`, `push is ${site}`]), 'team', { delay: 200 });
          break;
        }
      }
      // carrying the drive in plain sight gives the site away
      if (!S.rotate && d.carrier && d.carrier.st && d.carrier.st.reveal > 0) { const s = nearestSite(d.carrier.pos.x, d.carrier.pos.z, 24); if (s) { S.rotate = s; S.rotateAt = S.liveT; } }
    }
  }
  function nearestSite(x, z, within) {
    let best = null, bd = within;
    for (const k of ['A', 'B']) { const s = S.sites[k], dd = Math.hypot(x - s.x, z - s.z); if (dd < bd) { bd = dd; best = k; } }
    return best;
  }

  // ---------------------------------------------------------------- bots: where to go
  // Returns null or { hold, yaw } to stand still, or { x, z, key } to walk there.
  P.botGoal = function (b) {
    if (!S || !b.plan) return null;
    if (S.phase !== 'live' && S.phase !== 'planted') return { hold: true };
    const st = b.st;
    if (st && st.distractT > 0) return { hold: true, yaw: yawTo(b.pos.x, b.pos.z, st.dx, st.dz) };
    const pl = b.plan, atk = b.team === S.atk, d = S.drive;
    // heard or saw someone a moment ago: rushers chase, the rest check it if it's close
    if (b.lastSeen) {
      const ls = b.lastSeen, dd = dist2d(b, ls.x, ls.z);
      const chase = b.pers === 'rusher' ? dd < (atk ? 30 : 16) : b.pers === 'camper' ? dd < 6 : dd < (atk ? 14 : 9);
      if (chase && !(S.phase === 'planted' && !atk && S.defuser === b) && !(atk && d.carrier === b && P.siteAt(b.pos))) {
        if (dd < 1.5) b.lastSeen = null;
        else return { x: ls.x, z: ls.z, key: 'chase' + Math.round(ls.x) + ',' + Math.round(ls.z) };
      } else b.lastSeen = null;
    }
    if (atk && d.state === 'ground' && S.fetcher === b) return { x: d.x, z: d.z, key: 'drive' + Math.round(d.x) + ',' + Math.round(d.z) };
    if (S.phase === 'planted') {
      if (atk) {
        if (!pl.post) pl.post = spotNear(d.x, d.z, 4, 9);
        return spot(b, pl.post, yawTo(pl.post.x, pl.post.z, S.spawnDef.x, S.spawnDef.z), 'post');
      }
      if (S.defuser === b && (b.pers !== 'camper' || alive(S.atk).length === 0 || S.t < 15)) return spot(b, d, undefined, 'defuse', 0.9);
      if (!pl.retake) pl.retake = spotNear(d.x, d.z, 3, 7);
      return spot(b, pl.retake, yawTo(pl.retake.x, pl.retake.z, d.x, d.z), 'retake');
    }
    if (atk) {
      if (S.liveT < pl.delay) return { hold: true };
      const site = S.sites[pl.site];
      if (pl.role !== 'lurk' && !S.exec && S.stage) {
        if (!pl.stage) pl.stage = spotNear(S.stage.x, S.stage.z, 0, 2.5);
        return spot(b, pl.stage, yawTo(pl.stage.x, pl.stage.z, site.x, site.z), 'stage', 1.6);
      }
      if (d.carrier === b) {
        if (!pl.plantSpot) pl.plantSpot = spotNear(site.x, site.z, 0, site.r * 0.5);
        return spot(b, pl.plantSpot, undefined, 'plant' + pl.site, 0.7);
      }
      if (!pl.entry) pl.entry = spotNear(site.x, site.z, 0.5, site.r + 2.5);
      return spot(b, pl.entry, yawTo(pl.entry.x, pl.entry.z, S.spawnDef.x, S.spawnDef.z), 'entry' + pl.site);
    }
    // defenders hold their spot, and rotate once the push is called
    if (S.rotate && pl.site !== S.rotate && S.liveT > S.rotateAt + pl.rotateDelay) {
      pl.site = S.rotate; pl.spot = holdSpot(S.rotate, b, true); pl.look = null;
    }
    if (!pl.look) pl.look = lookFrom(pl.spot.x, pl.spot.z);
    return spot(b, pl.spot, pl.look, 'hold' + pl.site);
  };
  function spot(b, sp, yaw, key, r) {
    if (Math.hypot(b.pos.x - sp.x, b.pos.z - sp.z) < (r || 1.2)) return { hold: true, yaw };
    return { x: sp.x, z: sp.z, key: key + ':' + sp.x.toFixed(1) + ',' + sp.z.toFixed(1) };
  }

  // ---------------------------------------------------------------- bots: planting, defusing, abilities
  // Called every frame after the bot looked around. True = stand still this frame.
  P.botAct = function (b, dt) {
    if (!S || !b.plan) return false;
    if (S.phase === 'live' || S.phase === 'planted') botAbilities(b, dt);
    const d = S.drive;
    if (S.phase === 'live' && d.carrier === b) {
      const fighting = b.canSee && b.target && b.target.alive;
      if (P.siteAt(b.pos) && !fighting && !AG().lockedOut(b) && S.liveT > 3) {
        b.planting = (b.planting || 0) + dt;
        if (b.planting >= CFG.plant) { b.planting = 0; plant(b); }
        return true;
      }
      b.planting = 0;
    }
    if (S.phase === 'planted' && b.team !== S.atk && S.defuser === b) {
      const fighting = b.canSee && b.target && b.target.alive;
      if (dist2d(b, d.x, d.z) < 1.6 && (!fighting || alive(S.atk).length === 0) && !AG().lockedOut(b)) {
        b.defusing = (b.defusing || 0) + dt;
        if (b.defusing >= CFG.defuse) { b.defusing = 0; defused(b); }
        return true;
      }
      if (b.defusing > CFG.defuse / 2) b.defusing = CFG.defuse / 2; else if (!fighting) b.defusing = 0;
    }
    return false;
  };
  // how each ability gets used by bots
  function aiUse(ab) {
    switch (ab.kind) {
      case 'flash': return ab.at === 'global' ? 'entry' : 'fight';
      case 'blast': case 'slow': return 'fight';
      case 'jam': return ab.at === 'global' ? 'entry' : 'fight';
      case 'smoke': case 'decoy': return 'entry';
      case 'reveal': return 'scan';
      case 'dash': case 'buff': return 'fight';
      case 'invis': case 'shield': case 'teleport': case 'wall': return 'escape';
      case 'mark': case 'trap': case 'turret': return 'setup';
      case 'field': return 'objective';
    }
    return 'fight';
  }
  function botAbilities(b, dt) {
    b.abT = (b.abT === undefined ? U.rand(0.5, 2) : b.abT) - dt;
    if (b.abT > 0) return;
    b.abT = U.rand(0.6, 1.4) * (b.sense ? 1.4 - b.sense / 100 * 0.6 : 1);
    const a = AG().BY[b.agent];
    if (!a || !b.kit) return;
    if (b.st && b.st.blind > 0) return;
    const tgt = b.canSee && b.target && b.target.alive ? b.target : null;
    for (const slot of ['x', 'c', 'e']) {
      if (!AG().ready(b, slot)) continue;
      const ab = a[slot], aim = aimFor(b, ab, aiUse(ab), tgt);
      if (aim === false) continue;
      if (AG().use(b, slot, aim || undefined)) { b.abT = U.rand(1.2, 2.6); return; }
    }
  }
  function aimFor(b, ab, use, tgt) {
    const atk = b.team === S.atk, d = S.drive, pl = b.plan;
    const site = S.sites[pl.site] || S.sites[S.target] || S.sites.A;
    const near = (x, z, r) => Math.hypot(b.pos.x - x, b.pos.z - z) < r;
    const roll = p => Math.random() < p;
    const hurt = (b.hp + (b.shield || 0)) < 60;
    const at = (e, dy) => ({ x: e.pos ? e.pos.x : e.x, y: (e.pos ? e.pos.y : 0) + (dy === undefined ? 1 : dy), z: e.pos ? e.pos.z : e.z });
    switch (use) {
      case 'fight': {
        if (!tgt) return false;
        const dist = b.pos.distanceTo(tgt.pos);
        if (ab.kind === 'dash') { const dx = tgt.pos.x - b.pos.x, dz = tgt.pos.z - b.pos.z, s = Math.random() < 0.5 ? 1 : -1; return roll(0.3) ? { x: b.pos.x - dz * s, z: b.pos.z + dx * s } : false; }
        if (ab.kind === 'buff') return roll(0.55) ? null : false;
        if (ab.kind === 'slow' && ab.at === 'self') return dist < ab.r && roll(0.6) ? null : false;
        if (ab.kind === 'slow' && ab.at === 'cone') return dist < ab.range * 0.8 && roll(0.6) ? null : false;
        if (dist > (ab.range || 25) + 3 || dist < 3) return false;
        return roll(ab.slot === 'x' ? 0.65 : 0.35) ? at(tgt) : false;
      }
      case 'entry': {
        const goal = atk ? (S.phase === 'live' ? site : null) : (S.phase === 'planted' ? d : null);
        if (!goal) return false;
        if (!near(goal.x, goal.z, 26) || near(goal.x, goal.z, 4)) return false;
        if (ab.at === 'global' || ab.kind === 'decoy') return roll(0.5) ? null : false;
        return roll(0.55) ? { x: goal.x + U.rand(-2, 2), y: 1, z: goal.z + U.rand(-2, 2) } : false;
      }
      case 'scan': {
        if (ab.at === 'global') return S.liveT > 15 && roll(0.35) ? null : false;
        const goal = atk && S.phase === 'live' ? site : !atk && S.phase === 'planted' ? d : null;
        if (ab.at === 'self') return (goal && near(goal.x, goal.z, ab.r * 0.9)) || (tgt && roll(0.3)) ? null : false;
        if (ab.at === 'cone') { if (goal && near(goal.x, goal.z, 30) && roll(0.5)) { b.yaw = yawTo(b.pos.x, b.pos.z, goal.x, goal.z); return null; } return false; }
        if (goal && near(goal.x, goal.z, 30) && !near(goal.x, goal.z, 6)) return roll(0.55) ? { x: goal.x, y: 1, z: goal.z } : false;
        if (!atk && S.phase === 'live' && S.liveT > 12 && !S.rotate && roll(0.12)) return { x: (S.spawnAtk.x + b.pos.x) / 2, y: 1, z: b.pos.z * 0.5 };
        return false;
      }
      case 'escape': {
        if (!tgt || !hurt) return false;
        if (ab.kind === 'wall') { const dx = tgt.pos.x - b.pos.x, dz = tgt.pos.z - b.pos.z, L = Math.hypot(dx, dz) || 1; return roll(0.7) ? { x: b.pos.x + dx / L * 3, y: b.pos.y + 0.5, z: b.pos.z + dz / L * 3 } : false; }
        return roll(0.6) ? null : false;
      }
      case 'setup': {
        if (ab.kind === 'mark') return (atk ? S.phase === 'live' && near(site.x, site.z, 22) : pl.spot && near(pl.spot.x, pl.spot.z, 2)) ? null : false;
        if (atk && S.phase === 'planted' && near(d.x, d.z, 10)) return roll(0.6) ? { x: d.x + U.rand(-3, 3), y: d.y + 0.5, z: d.z + U.rand(-3, 3) } : false;
        if (!atk && S.phase === 'live' && S.liveT < 30 && pl.spot && near(pl.spot.x, pl.spot.z, 2.5)) {
          const yaw = pl.look || b.yaw, fx = -Math.sin(yaw), fz = -Math.cos(yaw), r = ab.kind === 'turret' ? 2 : U.rand(4, 7);
          return { x: b.pos.x + fx * r, y: b.pos.y + 0.5, z: b.pos.z + fz * r };
        }
        if (!atk && S.phase === 'planted' && tgt && ab.kind === 'turret') return at(b, 0.5);
        return false;
      }
      case 'objective': {
        if (atk && S.phase === 'planted' && near(d.x, d.z, 18) && (S.defuser || alive(other(S.atk)).length)) return roll(0.5) ? { x: d.x, y: d.y + 0.5, z: d.z } : false;
        if (!atk && S.phase === 'live' && tgt && tgt === d.carrier && nearestSite(tgt.pos.x, tgt.pos.z, 12)) return at(tgt, 0.5);
        return false;
      }
    }
    return false;
  }

  // ---------------------------------------------------------------- HUD info
  function banner(title, sub, kind) { if (NA.PUI) NA.PUI.banner(title, sub, kind); }
  P.info = function () {
    if (!S) return null;
    const p = G().player;
    return {
      round: S.round, score: S.score, atk: S.atk, myTeam: p.team, attacking: p.team === S.atk, phase: S.phase, t: Math.max(0, S.t),
      aliveA: alive('A').length, aliveB: alive('B').length, drive: S.drive, sites: S.sites, prog: S.prog, progKind: S.progKind,
      canPlant: S.canPlant, canDefuse: S.canDefuse, carrying: S.drive && S.drive.carrier === p, toWin: CFG.toWin,
    };
  };
})(window.NA);
