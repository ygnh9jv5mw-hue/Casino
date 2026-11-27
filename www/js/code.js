/* NO ANTICHEAT: the skill tree is your cheat's source code.
   Every upgrade is code you write into cheat.lua. Folders are branches, files are features, and each
   version of a file is one level. A file opens up once the file it grows out of is written.
   You start with a script pasted from a tutorial: three bugs, half working. Some versions are
   UNSTABLE: strong, but every one you run adds a chance your client crashes mid-match. The core/
   folder fixes bugs and makes the script stable. */
(function (NA) {
  'use strict';
  const D = NA.DATA, U = NA.U;
  const Code = NA.Code = {};
  const S = () => NA.Save.data;
  const st = () => S().code;

  const FOLDERS = [
    { id: 'core', label: 'the script itself: bug fixes and stability' },
    { id: 'aim', label: 'aim' }, { id: 'visuals', label: 'seeing through things' }, { id: 'weapon', label: 'guns' },
    { id: 'movement', label: 'legs' }, { id: 'server', label: 'lying to the server' }, { id: 'exploits', label: 'breaking the game' },
    { id: 'bypass', label: 'hiding from Warden' }, { id: 'misc', label: 'money and other stuff' },
  ];

  // the script you start with. bug lines turn into their fix once that fix is written
  const STARTER = [
    '-- cheat.lua',
    '-- pasted from "EASY AIMBOT 2024 (WORKING)"',
    '-- 3 bugs. 0 tests. 1 dream.',
    'local target = nil',
    '',
    'function on_frame()',
    '  target = find_enemy(fov(3))',
    '  if target then',
    { bug: 'aim', text: '    nudge(crosshair, target.head + 9999)  -- FIXME aims at the sky', fixed: '    nudge(crosshair, target.head)  -- fixed: the head, not the sky' },
    '  end',
    { bug: 'leak', text: '  while true do print("loaded") end  -- FIXME eats all the memory', fixed: '  if not said then print("loaded") said = true end' },
    { bug: 'mark', text: '  draw_watermark("MY CHEAT v1 lol")  -- FIXME remove before release', fixed: '  if cfg.watermark then draw_watermark(cfg.name) end' },
    'end',
  ];
  const BUGS = {
    aim: { name: 'Aim offset', fx: 'Aim Assist pulls half as hard', file: 'fix_aim' },
    leak: { name: 'Memory leak', fx: '+12% chance per match that the cheat crashes', file: 'fix_leak' },
    mark: { name: 'Watermark left on', fx: 'Lobbies get suspicious 25% faster', file: 'fix_mark' },
  };

  // files. kind 'cheat' = one version per level of D.CHEAT[id]; 'fix' and 'stab' have one version.
  // parent: drawn under it in the explorer. needs: [file, version] pairs that must be written first.
  // risk: { version: % crash chance per match while that version runs }
  const F = [];
  const file = o => { F.push(o); return o; };
  // ---- core
  file({ id: 'main', folder: 'core', name: 'main.lua', kind: 'main' });
  file({ id: 'fix_aim', folder: 'core', name: 'fix_aim.lua', kind: 'fix', bug: 'aim', cost: 10, title: 'Fix: aim offset', fx: 'Aim Assist works at full strength',
    code: [['-- the + 9999 was a typo. probably', 'local function aim_point(t)', '  return t.head + t.vel * 0.02', 'end']] });
  file({ id: 'fix_leak', folder: 'core', name: 'fix_leak.lua', kind: 'fix', bug: 'leak', cost: 25, title: 'Fix: memory leak', fx: 'Removes the 12% crash chance',
    code: [['-- print once. not forever.', 'local said = false', 'collectgarbage("collect")']] });
  file({ id: 'fix_mark', folder: 'core', name: 'fix_watermark.lua', kind: 'fix', bug: 'mark', cost: 40, title: 'Fix: watermark', fx: 'Lobbies stop noticing the watermark',
    code: [['-- watermark only when you ask for it', 'cfg.watermark = false', 'cfg.name = "definitely_not_a_cheat"']] });
  file({ id: 'pcall', folder: 'core', name: 'pcall_wrap.lua', kind: 'stab', parent: 'fix_leak', needs: [['fix_leak', 1]], tier: 2, cost: 300, title: 'Error handling', fx: 'Crash chance −40%',
    code: [['-- if it breaks, pretend it didn\'t', 'local ok, err = pcall(on_frame)', 'if not ok then log(err) end']] });
  file({ id: 'watchdog', folder: 'core', name: 'watchdog.lua', kind: 'stab', parent: 'pcall', needs: [['pcall', 1]], tier: 3, cost: 1200, title: 'Watchdog', fx: 'A crash restarts the cheat in 5 s instead of 15',
    code: [['-- restarts the cheat when it dies', 'every(0.5, function()', '  if not alive(cheat) then respawn(cheat) end', 'end)']] });
  file({ id: 'pool', folder: 'core', name: 'mem_pool.lua', kind: 'stab', parent: 'watchdog', needs: [['watchdog', 1]], tier: 4, cost: 4000, title: 'Memory pool', fx: 'Crash chance −40% more',
    code: [['-- allocate once, reuse forever', 'local pool = table.create(4096)', 'function alloc() return pool:take() end']] });
  file({ id: 'tests', folder: 'core', name: 'unit_tests.lua', kind: 'stab', parent: 'pool', needs: [['pool', 1]], tier: 5, cost: 12000, title: 'Unit tests', fx: 'Crash chance −50% more',
    code: [['-- 412 tests. 409 pass. ship it.', 'assert(aimbot ~= nil)', 'assert(target ~= teammate)', 'assert(not banned())']] });
  // ---- aim
  file({ id: 'aimassist', folder: 'aim', name: 'aim_assist.lua', kind: 'cheat', needs: [], code: [
    ['function assist(t)', '  nudge(crosshair, aim_point(t), 0.15)', 'end'],
    ['function assist_wider()', '  ASSIST_FOV = 4  -- more bubble', 'end'],
    ['function assist_sticky(t)', '  if t.strafing then pull = pull * 2 end', 'end'],
    ['function assist_magnet()', '  ASSIST_FOV, ASSIST_PULL = 6, 0.6', 'end'],
    ['function assist_max()', '  -- this is just aimbot with extra steps', '  ASSIST_FOV, ASSIST_PULL = 7, 0.75', 'end'],
  ] });
  file({ id: 'steady', folder: 'aim', name: 'steady_hands.lua', kind: 'cheat', parent: 'aimassist', needs: [['aimassist', 1]], code: [
    ['function steady()', '  sway = sway * 0.82', 'end'],
    ['function hold_breath()', '  breath.hold = true  -- forever', 'end'],
    ['function no_panic()', '  panic = false  -- calm. so calm.', 'end'],
    ['function tripod()', '  mount(arms, tripod)', 'end'],
    ['function statue()', '  sway = 0.1  -- you are a statue now', 'end'],
  ] });
  file({ id: 'nospread', folder: 'aim', name: 'no_spread.lua', kind: 'cheat', parent: 'steady', needs: [['steady', 1]], code: [
    ['function tighten()', '  spread = spread * 0.8', 'end'],
    ['function straight_barrel()', '  gun.barrel.bend = 0', 'end'],
    ['function laser()', '  spread = spread * 0.4', 'end'],
    ['function one_hole()', '  group(shots, "1cm")', 'end'],
    ['function no_spread()', '  spread = 0  -- physics, cancelled', 'end'],
  ] });
  file({ id: 'norecoil', folder: 'aim', name: 'no_recoil.lua', kind: 'cheat', parent: 'nospread', needs: [['nospread', 1]], code: [
    ['function comp()', '  pull_down(recoil * 0.33)', 'end'],
    ['function learn_pattern(gun)', '  pattern[gun] = record(gun, 30)', 'end'],
    ['function no_recoil()', '  recoil = 0  -- your mouse, but heavier', 'end'],
  ] });
  file({ id: 'triggerbot', folder: 'aim', name: 'triggerbot.lua', kind: 'cheat', parent: 'aimassist', needs: [['aimassist', 2]], risk: { 3: 3 }, code: [
    ['function trigger()', '  if crosshair:on(enemy) then', '    wait(250) fire()', '  end', 'end'],
    ['TRIGGER_DELAY = 120  -- faster than you'],
    ['TRIGGER_DELAY = 0  -- reflexes: inhuman', '-- WARNING: unstable on some maps'],
  ] });
  file({ id: 'aimbot', folder: 'aim', name: 'aimbot.lua', kind: 'cheat', parent: 'triggerbot', needs: [['aimassist', 3], ['triggerbot', 1]], risk: { 4: 6, 5: 10 }, code: [
    ['function aimbot()', '  local t = closest(fov(10))', '  if t then lock(t, cfg.bone) end', 'end'],
    ['function predict(t)', '  return t.pos + t.vel * ping()', 'end'],
    ['function silent(t)', '  shot.dir = to(t)  -- camera stays put', 'end'],
    ['function snap()  -- UNSTABLE', '  fov(90); speed = math.huge', 'end'],
    ['function rage()  -- VERY UNSTABLE', '  fov(360)', '  if behind(t) then spin() end', 'end'],
  ] });
  // ---- visuals
  file({ id: 'radar', folder: 'visuals', name: 'radar.lua', kind: 'cheat', needs: [['aimassist', 1]], code: [
    ['function radar()', '  for e in enemies() do', '    minimap:dot(e.pos)', '  end', 'end'],
  ] });
  file({ id: 'wallhack', folder: 'visuals', name: 'esp.lua', kind: 'cheat', parent: 'radar', needs: [['radar', 1]], risk: { 5: 3 }, code: [
    ['function esp(e)', '  box(e, through_walls)', 'end'],
    ['function esp_bars(e)', '  bar(e.health); bar(e.shield)', 'end'],
    ['function esp_text(e)', '  text(e.name, dist(e), e.gun)', 'end'],
    ['function esp_extra(e)', '  skeleton(e); tag(e.rank, e.platform)', 'end'],
    ['function esp_glow(e)  -- heavy on the GPU', '  chams(e, "glow"); snapline(e)', 'end'],
  ] });
  file({ id: 'lootesp', folder: 'visuals', name: 'loot_esp.lua', kind: 'cheat', parent: 'wallhack', needs: [['wallhack', 2]], code: [
    ['function loot_esp()', '  for g in guns() do label(g) end', 'end'],
    ['function loot_filter(g)', '  return g.rarity >= cfg.min_rarity', 'end'],
    ['function loot_all()', '  for i in items() do label(i) end', 'end'],
  ] });
  // ---- weapon
  file({ id: 'rapidfire', folder: 'weapon', name: 'rapid_fire.lua', kind: 'cheat', needs: [['norecoil', 1]], risk: { 4: 5 }, code: [
    ['function rapid()', '  gun.rate = gun.rate * 1.3', 'end'],
    ['gun.rate = base_rate * 1.6'],
    ['gun.rate = base_rate * 1.9'],
    ['gun.rate = base_rate * 2.2  -- UNSTABLE: the gun is screaming'],
  ] });
  file({ id: 'infammo', folder: 'weapon', name: 'inf_ammo.lua', kind: 'cheat', parent: 'rapidfire', needs: [['rapidfire', 2]], code: [
    ['function on_shot()', '  gun.mag = gun.mag + 1  -- reloading is for other people', 'end'],
  ] });
  // ---- movement
  file({ id: 'speedhack', folder: 'movement', name: 'speedhack.lua', kind: 'cheat', needs: [['steady', 2]], risk: { 3: 3, 4: 6 }, code: [
    ['function legs()', '  move_speed = move_speed * 1.25', 'end'],
    ['move_speed = base_speed * 1.5'],
    ['move_speed = base_speed * 1.75  -- UNSTABLE'],
    ['move_speed = base_speed * 2.0  -- legs.exe has stopped responding'],
  ] });
  // ---- server
  file({ id: 'kdspoof', folder: 'server', name: 'kd_spoof.lua', kind: 'cheat', needs: [['radar', 1]], code: [
    ['function scoreboard(me)', '  me.kills = me.kills * 0.45  -- believable', 'end'],
  ] });
  file({ id: 'streamproof', folder: 'server', name: 'stream_proof.lua', kind: 'cheat', parent: 'kdspoof', needs: [['kdspoof', 1]], code: [
    ['function on_capture(frame)', '  return frame:without(menu, esp)', 'end'],
  ] });
  file({ id: 'voterig', folder: 'server', name: 'vote_rig.lua', kind: 'cheat', parent: 'streamproof', needs: [['streamproof', 1]], code: [
    ['function on_vote(v)', '  if v.target == me then v.result = "no" end', 'end'],
  ] });
  // ---- exploits
  file({ id: 'wallbang', folder: 'exploits', name: 'wallbang.lua', kind: 'cheat', needs: [['wallhack', 3], ['aimbot', 2]], risk: { 2: 4, 3: 8 }, code: [
    ['function pierce(ray)', '  ray.walls = 1; ray.keep = 0.55', 'end'],
    ['ray.walls = 2; ray.keep = 0.75  -- UNSTABLE'],
    ['ray.walls = math.huge; ray.keep = 0.9', '-- cover is a social construct'],
  ] });
  file({ id: 'freeze', folder: 'exploits', name: 'freeze.lua', kind: 'cheat', parent: 'wallbang', needs: [['wallbang', 1]], risk: { 1: 5, 2: 9 }, code: [
    ['function on_hit(t)  -- UNSTABLE', '  desync(t, 1.2)', 'end'],
    ['DESYNC_TIME = 2.2  -- VERY UNSTABLE'],
  ] });
  // ---- bypass
  file({ id: 'hwid', folder: 'bypass', name: 'hwid_spoof.lua', kind: 'cheat', needs: [['fix_mark', 1]], code: [
    ['function boot()', '  motherboard.serial = random_serial()', 'end'],
    ['disk.serial = random_serial()'],
    ['mac_address = random_mac()  -- new pc every boot'],
  ] });
  file({ id: 'kernel', folder: 'bypass', name: 'kernel.lua', kind: 'cheat', parent: 'hwid', needs: [['hwid', 1]], code: [
    ['function load()', '  driver.ring = 0  -- below the anticheat', 'end'],
    ['driver.hide_from(warden)'],
  ] });
  file({ id: 'sigmask', folder: 'bypass', name: 'sig_mask.lua', kind: 'cheat', parent: 'hwid', needs: [['hwid', 2]], code: [
    ['function build()', '  bytes = scramble(bytes)', 'end'],
    ['bytes = scramble(scramble(bytes))'],
  ] });
  file({ id: 'cleaner', folder: 'bypass', name: 'trace_clean.lua', kind: 'cheat', parent: 'kernel', needs: [['kernel', 1]], code: [
    ['function after_match()', '  logs:wipe(); prefetch:wipe()', 'end'],
  ] });
  // ---- misc
  file({ id: 'autoqueue', folder: 'misc', name: 'auto_queue.lua', kind: 'cheat', needs: [], code: [
    ['function on_results()', '  queue(next_match)', 'end'],
  ] });
  file({ id: 'practice', folder: 'misc', name: 'practice.lua', kind: 'cheat', needs: [], code: [
    ['-- the legit way. 1,000 hours.', 'function practice()', '  while not good do aim_train() end', 'end'],
  ] });
  file({ id: 'affiliate', folder: 'misc', name: 'affiliate.lua', kind: 'cheat', parent: 'autoqueue', needs: [['autoqueue', 1]],
    code: Array.from({ length: 10 }, (_, i) => i === 0 ? ['function refer(me)', '  payout = payout * (1 + 0.15 * refs)', 'end', 'refs = 1'] : [`refs = ${i + 1}  -- referred myself again`]) });
  file({ id: 'rgb', folder: 'misc', name: 'rgb.lua', kind: 'cheat', parent: 'affiliate', needs: [['affiliate', 1]], code: [
    ['function rgb()', '  keyboard:rainbow()  -- +0 fps', 'end'],
  ] });

  const BY = {};
  F.forEach(f => { BY[f.id] = f; if (f.kind === 'cheat') { f.cheat = D.CHEAT[f.id]; f.max = f.cheat.max; f.tier = f.cheat.tier; } else f.max = f.kind === 'main' ? 0 : 1; });
  Code.FILES = F; Code.BY = BY; Code.FOLDERS = FOLDERS; Code.BUGS = BUGS;

  // ---------------------------------------------------------------- state
  Code.init = function () {
    const s = S();
    if (!s.code) {
      // first time on the code tree. a brand new player gets the pasted script with its bugs and a
      // half-working aim assist; anyone with progress already has a clean script.
      const fresh = !Object.keys(s.cheats || {}).some(k => s.cheats[k] && s.cheats[k].level) && (s.stats.matches || 0) === 0;
      s.code = { has: fresh ? {} : { fix_aim: true, fix_leak: true, fix_mark: true }, v: 1, sel: 'main', written: 0 };
      if (fresh) s.cheats.aimassist = { level: 1, enabled: true, use: 1 };
      NA.Save.save();
    }
    if (!s.code.has) s.code.has = {};
    if (!s.code.by) s.code.by = {};          // 'file:version' -> { seller, forum, det } for code a forum seller wrote
    if (!s.code.fbugs) s.code.fbugs = [];    // bugs that came with forum code
  };
  Code.level = id => { const f = BY[id]; if (!f) return 0; if (f.kind === 'cheat') return NA.Save.level(id); if (f.kind === 'main') return 1; return st().has[id] ? 1 : 0; };
  Code.cost = id => { const f = BY[id]; if (f.kind === 'cheat') return NA.Game.cost(id); const s = S(); return !s.flags.firstBuy ? Math.ceil(f.cost / 2) : f.cost; };
  Code.bugOn = b => !st().has[BUGS[b].file];
  // code credits: 25% of your old script, carried over to a new account after a ban (spent first)
  Code.legacy = () => Math.max(0, Math.floor(st().legacy || 0));
  Code.avail = () => S().credits + Code.legacy();
  function tidy(n) { if (n < 1000) return Math.round(n); const mag = Math.pow(10, Math.floor(Math.log10(n)) - 1); return Math.round(n / mag) * mag; }
  // what everything in cheat.lua cost at full price
  Code.spent = function () {
    let t = 0;
    for (const f of F) {
      const lv = Code.level(f.id);
      if (f.kind === 'cheat') { const c = f.cheat; for (let v = 1; v <= lv; v++) t += tidy(c.base * Math.pow(c.growth, v - 1)); }
      else if ((f.kind === 'fix' || f.kind === 'stab') && lv) t += f.cost;
    }
    return t;
  };
  Code.bugs = () => Object.keys(BUGS).filter(Code.bugOn);
  // why the next version can't be written yet ('' = it can)
  Code.why = function (id) {
    const f = BY[id], s = S(), lv = Code.level(id);
    if (lv >= f.max) return 'max';
    if (f.tier && s.highestTier < f.tier) return `Unlocks at Tier ${f.tier}`;
    for (const [nid, nv] of f.needs || []) if (Code.level(nid) < nv) return `Needs ${BY[nid].name}${BY[nid].max > 1 ? ' v' + nv : ''}`;
    return '';
  };
  Code.status = function (id) {
    const f = BY[id];
    if (f.kind === 'main') return 'main';
    const w = Code.why(id);
    if (w === 'max') return 'max';
    if (w) return Code.level(id) ? 'part' : 'locked';
    return Code.avail() >= Code.cost(id) ? 'ready' : 'cant';
  };
  Code.write = function (id) {
    const f = BY[id], s = S();
    if (!f || Code.why(id)) return false;
    const cost = Code.cost(id);
    if (Code.avail() < cost) return false;
    const before = Code.lines();
    const useL = Math.min(Code.legacy(), cost);
    if (f.kind === 'cheat') {
      s.credits += useL; st().legacy = Code.legacy() - useL;
      if (!NA.Game.buy(id)) { s.credits -= useL; st().legacy += useL; return false; }
    } else {
      st().legacy = Code.legacy() - useL;
      s.credits -= cost - useL;
      st().has[id] = true;
      if (!s.flags.firstBuy) { s.flags.firstBuy = true; s.flags.improvedPending = true; NA.Game.achieve('first_buy', "First One's Half Off"); }
      NA.Save.save(); NA.Game.computeMods(); NA.Audio.buy();
    }
    st().written = (st().written || 0) + 1;
    if (!Code.bugs().length && !s.flags.bugFree) { s.flags.bugFree = true; NA.Comms && NA.Game.achieve && NA.Game.achieve('bug_free', 'It Compiles'); }
    NA.Save.save();
    return { added: Code.lines() - before };
  };
  // ---------------------------------------------------------------- code from the forums
  Code.FB_PCT = 8;
  Code.forumWrite = function (id, info) {
    const s = S(), f = BY[id], c = s.cheats[id] || { level: 0, enabled: true };
    if (!f || f.kind !== 'cheat' || c.level >= f.max) return false;
    c.level++; c.enabled = true; c.use = c.level;
    s.cheats[id] = c;
    st().by[id + ':' + c.level] = { seller: info.seller, forum: info.forum, det: info.q === 'detected' };
    if (info.q === 'buggy') st().fbugs.push({ id: 'fb' + Date.now().toString(36), file: id, v: c.level, pct: Code.FB_PCT, cost: Math.max(20, Math.round(info.price * 0.35)), seller: info.seller });
    st().written = (st().written || 0) + 1;
    NA.Save.save();
    return true;
  };
  Code.fbugs = () => st().fbugs || [];
  Code.bugCount = () => Code.bugs().length + Code.fbugs().length;
  Code.fixFB = function (bid) {
    const s = S(), b = Code.fbugs().find(x => x.id === bid);
    if (!b || s.credits < b.cost) return false;
    s.credits -= b.cost;
    st().fbugs = Code.fbugs().filter(x => x.id !== bid);
    NA.Save.save(); NA.Audio.buy();
    return true;
  };
  // code Warden already has a signature for
  Code.detVersions = id => { const lv = Code.level(id), out = []; for (let v = 1; v <= lv; v++) { const b = st().by[id + ':' + v]; if (b && b.det) out.push(v); } return out; };
  Code.isDetected = id => Code.detVersions(id).length > 0;
  Code.detectedActive = function () {
    const s = S(); let n = 0;
    for (const f of F) if (f.kind === 'cheat' && Code.isDetected(f.id)) { const c = s.cheats[f.id]; if (c && c.level && c.enabled !== false) n++; }
    return n;
  };
  Code.rewriteCost = function (id) {
    const c = D.CHEAT[id], vs = Code.detVersions(id);
    if (!vs.length) return 0;
    const top = Math.max.apply(null, vs);
    return Math.max(10, Math.round(c.base * Math.pow(c.growth, top - 1) * 0.5));
  };
  Code.rewrite = function (id) {
    const s = S(), cost = Code.rewriteCost(id);
    if (!cost || s.credits < cost) return false;
    s.credits -= cost;
    for (const v of Code.detVersions(id)) st().by[id + ':' + v].det = false;
    NA.Save.save(); NA.Audio.buy(); NA.Game.computeMods();
    return true;
  };

  // risky versions you'll actually run this match (owned, switched on, at or above the risky version)
  Code.riskList = function () {
    const s = S(), out = [];
    for (const f of F) {
      if (f.kind !== 'cheat' || !f.risk) continue;
      const c = s.cheats[f.id];
      if (!c || !c.level || c.enabled === false) continue;
      const lv = Math.min(c.level, c.use || c.level);
      for (const v of Object.keys(f.risk)) if (lv >= +v) out.push({ file: f, v: +v, pct: f.risk[v] });
    }
    return out;
  };
  Code.stability = () => (st().has.pcall ? 0.6 : 1) * (st().has.pool ? 0.6 : 1) * (st().has.tests ? 0.5 : 1);
  Code.crashChance = function () {
    let p = Code.riskList().reduce((a, r) => a + r.pct, 0) + (Code.bugOn('leak') ? 12 : 0) + Code.fbugs().reduce((a, b) => a + b.pct, 0);
    return Math.min(60, p * Code.stability()) / 100;
  };
  Code.crashDur = () => (st().has.watchdog ? 5 : 15);
  Code.crashSource = function () {
    const r = Code.riskList();
    if (!r.length) return { fn: 'on_frame', file: 'main.lua', why: 'out of memory (the leak in main.lua)' };
    const x = r[Math.floor(Math.random() * r.length)];
    const line = x.file.code[x.v - 1][0];
    const fn = (line.match(/function ([a-z_]+)/) || [])[1] || x.file.name.replace('.lua', '');
    return { fn, file: x.file.name, why: U.pick(['nil pointer dereference', 'stack overflow', 'access violation reading 0x0000001C', 'attempt to index a nil value', 'segmentation fault']) };
  };

  // ---------------------------------------------------------------- the whole script, line by line
  function verLines(f, v) { return f.code[v - 1] || []; }
  function header(f, v) {
    const fx = f.kind === 'cheat' ? f.cheat.fx(v) : f.fx;
    return `-- ${f.max > 1 ? 'v' + v + ' · ' : ''}${fx}`;
  }
  Code.script = function () {
    const out = [];
    for (const l of STARTER) {
      if (typeof l === 'string') out.push({ t: l });
      else out.push(Code.bugOn(l.bug) ? { t: l.text, bug: l.bug } : { t: l.fixed, fixed: true });
    }
    for (const fo of FOLDERS) {
      const files = F.filter(f => f.folder === fo.id && f.kind !== 'main' && Code.level(f.id) > 0);
      if (!files.length) continue;
      out.push({ t: '' }, { t: `-- ===== ${fo.id}/ =====` });
      for (const f of files) {
        const lv = Code.level(f.id);
        for (let v = 1; v <= lv; v++) verLines(f, v).forEach(t => out.push({ t, f: f.id }));
      }
    }
    return out;
  };
  Code.lines = () => Code.script().filter(l => l.t.trim()).length;

  // ---------------------------------------------------------------- syntax highlighting
  const KW = /^(function|end|if|then|else|elseif|local|return|for|in|do|while|not|and|or|true|false|nil|every)$/;
  function hl(text) {
    const esc = NA.U.esc || (x => String(x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
    let code = text, cm = '';
    const ci = text.indexOf('--');
    if (ci >= 0) { code = text.slice(0, ci); cm = text.slice(ci); }
    let html = '';
    const re = /("[^"]*")|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z0-9_.:]*)(\s*\()?|(\s+)|([^\sA-Za-z0-9_"]+)/g;
    let m;
    while ((m = re.exec(code))) {
      if (m[1]) html += `<span class="s">${esc(m[1])}</span>`;
      else if (m[2]) html += `<span class="n">${m[2]}</span>`;
      else if (m[3]) {
        if (KW.test(m[3])) html += `<span class="k">${m[3]}</span>${m[4] || ''}`;
        else if (m[4]) html += `<span class="f">${esc(m[3])}</span>${m[4]}`;
        else html += `<span class="v">${esc(m[3])}</span>`;
      } else if (m[5]) html += m[5];
      else html += `<span class="p">${esc(m[6])}</span>`;
    }
    if (cm) html += `<span class="c${/FIXME|UNSTABLE|WARNING/.test(cm) ? ' warn' : ''}">${esc(cm)}</span>`;
    return html || '&nbsp;';
  }
  Code.hl = hl;

  // ---------------------------------------------------------------- the editor screen
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  Code.openFolders = null;
  Code.open = function (from, focus) {
    Code.from = from || NA.UI.current;
    if (focus && BY[focus]) st().sel = focus;
    Code.render();
    NA.UI.show('scr-code');
  };
  function pips(f) {
    if (f.max <= 1) return '';
    const lv = Code.level(f.id);
    return `<span class="pp">${'<i class="on"></i>'.repeat(lv)}${'<i></i>'.repeat(f.max - lv)}</span>`;
  }
  function rowRight(f) {
    const status = Code.status(f.id);
    if (f.kind === 'main') return `<span class="ln-ct">${Code.lines()} ln</span>`;
    if (status === 'max') return f.max > 1 ? pips(f) : '<span class="ok">✔</span>';
    if (status === 'ready') return `${f.max > 1 ? pips(f) : ''}<span class="pr">${U.fmt(Code.cost(f.id))}</span>`;
    if (status === 'cant') return `${f.max > 1 ? pips(f) : ''}<span class="pr no">${U.fmt(Code.cost(f.id))}</span>`;
    if (status === 'part') return pips(f) + '<span class="lk">🔒</span>';
    return '<span class="lk">🔒</span>';
  }
  function treeRows(folder) {
    const files = F.filter(f => f.folder === folder);
    const kids = id => files.filter(f => f.parent === id);
    const roots = files.filter(f => !f.parent || !files.some(g => g.id === f.parent));
    const out = [];
    const walk = (f, prefix, last, depth) => {
      out.push({ f, guide: depth ? prefix + (last ? '└ ' : '├ ') : '' });
      const k = kids(f.id);
      k.forEach((c, i) => walk(c, depth ? prefix + (last ? '  ' : '│ ') : '', i === k.length - 1, depth + 1));
    };
    roots.forEach(r => walk(r, '', true, 0));
    return out;
  }
  function renderTree() {
    const sel = st().sel;
    if (!Code.openFolders) {
      Code.openFolders = {};
      for (const fo of FOLDERS) Code.openFolders[fo.id] = F.some(f => f.folder === fo.id && /ready|cant/.test(Code.status(f.id)) || (f.folder === fo.id && f.id === sel)) || fo.id === 'core';
    }
    const html = ['<div class="ide-h">EXPLORER <span>cheat.lua</span></div>'];
    for (const fo of FOLDERS) {
      const open = Code.openFolders[fo.id];
      const files = F.filter(f => f.folder === fo.id);
      const ready = files.filter(f => Code.status(f.id) === 'ready').length;
      const bugs = fo.id === 'core' ? Code.bugCount() : 0;
      html.push(`<button class="fo ${open ? 'open' : ''}" data-folder="${fo.id}"><i class="car">${open ? '▾' : '▸'}</i><b>${fo.id}</b>${bugs ? `<em class="bug">${bugs} bug${bugs > 1 ? 's' : ''}</em>` : ''}${ready ? `<em>${ready}</em>` : ''}</button>`);
      if (!open) continue;
      for (const { f, guide } of treeRows(fo.id)) {
        const status = Code.status(f.id), bug = (f.kind === 'fix' && status !== 'max') || Code.fbugs().some(b => b.file === f.id), det = f.kind === 'cheat' && Code.isDetected(f.id);
        const risky = f.risk && Object.keys(f.risk).some(v => +v > Code.level(f.id) || Code.level(f.id) >= +v);
        html.push(`<button class="fi ${status} ${f.id === sel ? 'sel' : ''} ${bug ? 'isbug' : ''}" data-file="${f.id}"><span class="g">${guide}</span><i class="ic"></i><span class="nm">${esc(f.name)}</span>${risky ? '<b class="rk" title="has unstable versions">⚡</b>' : ''}${det ? '<b class="dt">DET</b>' : ''}<span class="rt">${rowRight(f)}</span></button>`);
      }
    }
    $('code-tree').innerHTML = html.join('');
  }
  function lineHtml(n, text, cls, i) {
    return `<div class="cl ${cls || ''}"${i != null ? ` style="--i:${i}"` : ''}><span class="no">${n}</span><span class="tx">${hl(text)}</span></div>`;
  }
  function redact(n, text) {
    const w = Math.max(10, Math.min(92, text.length * 1.6));
    return `<div class="cl red"><span class="no">${n}</span><span class="tx"><i style="width:${w}%"></i></span></div>`;
  }
  function riskTag(f, v) { const r = f.risk && f.risk[v]; return r ? `<span class="rtag">⚡ UNSTABLE · +${r}% crash chance per match</span>` : ''; }
  function writeCard(f, v) {
    const why = Code.why(f.id), cost = Code.cost(f.id), s = S(), can = !why && Code.avail() >= cost;
    const title = f.kind === 'cheat' ? `${f.cheat.name}${f.max > 1 ? ' · v' + v : ''}` : f.title;
    const fx = f.kind === 'cheat' ? f.cheat.fx(v) : f.fx;
    const btn = why ? `<button class="wr cant" disabled>🔒 ${esc(why)}</button>`
      : `<button class="wr ${can ? '' : 'cant'}" data-write="${f.id}">${can ? 'WRITE IT' : 'NEED ' + U.fmt(cost - Code.avail()) + ' MORE'} · ${U.fmt(cost)}</button>`;
    const tag = f.kind === 'cheat' ? f.cheat.tag : (f.kind === 'fix' ? 'Bug: ' + BUGS[f.bug].fx : 'Stability');
    return `<div class="wcard ${why ? 'locked' : ''}"><small>${f.kind === 'fix' ? 'FIX THIS BUG' : why ? 'LOCKED' : 'NEXT VERSION'}</small><b>${esc(title)}</b><span>${esc(fx)}</span><i>${esc(tag)}</i>${riskTag(f, v)}${btn}</div>`;
  }
  function renderEditor(animateFrom) {
    const sel = BY[st().sel] ? st().sel : 'main', f = BY[sel], s = S();
    const out = [];
    let path = `${f.folder}/${f.name}`;
    if (f.kind === 'main') {
      path = 'core/main.lua';
      const lines = Code.script();
      const bugs = { length: Code.bugCount() };
      out.push(`<div class="ed-sum"><b>${Code.lines()}</b> lines of cheat · ${bugs.length ? `<span class="bad">${bugs.length} bug${bugs.length > 1 ? 's' : ''}</span>` : '<span class="good">no bugs</span>'} · <span class="${Code.crashChance() > 0.15 ? 'bad' : Code.crashChance() > 0 ? 'warn' : 'good'}">${Math.round(Code.crashChance() * 100)}% crash chance per match</span></div>`);
      for (const b of Code.fbugs()) out.push(`<div class="bugrow"><span>${esc(BY[b.file].name)} v${b.v} (from ${esc(b.seller)}) crashes: +${b.pct}% crash chance per match</span><button class="wr sm ${s.credits >= b.cost ? '' : 'cant'}" data-fixfb="${b.id}">FIX · ${U.fmt(b.cost)}</button></div>`);
      lines.forEach((l, i) => {
        let h = lineHtml(i + 1, l.t, l.bug ? 'bug' : l.fixed ? 'fixed' : '');
        if (l.bug) {
          const fx = BY[BUGS[l.bug].file];
          h += `<div class="bugrow"><span>${esc(BUGS[l.bug].name)}: ${esc(BUGS[l.bug].fx)}</span><button class="wr sm ${Code.avail() >= Code.cost(fx.id) ? '' : 'cant'}" data-write="${fx.id}">FIX · ${U.fmt(Code.cost(fx.id))}</button></div>`;
        }
        out.push(h);
      });
    } else {
      const lv = Code.level(f.id);
      let n = 1;
      for (let v = 1; v <= f.max; v++) {
        const ls = verLines(f, v);
        if (v <= lv) {
          const fresh = animateFrom != null && v > animateFrom;
          const by = st().by[f.id + ':' + v];
          out.push(lineHtml(n++, header(f, v) + (by ? `  (by ${by.seller} on ${by.forum})` : ''), 'hd' + (fresh ? ' new' : ''), fresh ? 0 : null));
          ls.forEach((t, i) => out.push(lineHtml(n++, t, fresh ? 'new' : '', fresh ? i + 1 : null)));
          if (f.risk && f.risk[v]) out.push(`<div class="rnote">⚡ unstable: +${f.risk[v]}% crash chance per match while v${v} runs</div>`);
          if (by && by.det) out.push(`<div class="detrow"><span><b>DETECTED</b> Warden has this signature: in Ranked it heats up 3× faster and starts the match flagged</span>${v === Math.max.apply(null, Code.detVersions(f.id)) ? `<button class="wr sm ${s.credits >= Code.rewriteCost(f.id) ? '' : 'cant'}" data-rewrite="${f.id}">REWRITE CLEAN · ${U.fmt(Code.rewriteCost(f.id))}</button>` : ''}</div>`);
          for (const b of Code.fbugs().filter(x => x.file === f.id && x.v === v)) out.push(`<div class="bugrow"><span>Bug from ${esc(b.seller)}: +${b.pct}% crash chance per match</span><button class="wr sm ${s.credits >= b.cost ? '' : 'cant'}" data-fixfb="${b.id}">FIX · ${U.fmt(b.cost)}</button></div>`);
        } else if (v === lv + 1) {
          out.push(lineHtml(n++, header(f, v), 'hd dim'));
          ls.forEach(t => out.push(redact(n++, t)));
          out.push(writeCard(f, v));
        } else {
          out.push(lineHtml(n++, `-- v${v} · ${f.kind === 'cheat' ? f.cheat.fx(v) : ''}${f.risk && f.risk[v] ? '  ⚡' : ''}`, 'hd far'));
        }
      }
      if (lv >= f.max) out.push(`<div class="donecard">✔ ${f.max > 1 ? 'Every version written' : 'Written'}${f.kind === 'fix' ? ' · bug fixed' : ''}</div>`);
    }
    $('code-ed').innerHTML = `<div class="ed-tab"><span class="tab on">${esc(f.name)}</span><span class="path">${esc(path)}</span></div><div class="ed-body">${out.join('')}</div>`;
    $('code-title').textContent = f.name;
  }
  function renderStatus() {
    const bugs = Code.bugCount(), cc = Math.round(Code.crashChance() * 100), det = F.filter(f => f.kind === 'cheat' && Code.isDetected(f.id)).length;
    $('code-status').innerHTML = `<span class="br">⎇ main</span><span>${Code.lines()} lines</span><span class="${bugs ? 'bad' : 'good'}">${bugs ? '⚠ ' + bugs + ' bug' + (bugs > 1 ? 's' : '') : '✔ no bugs'}</span><span class="${cc > 15 ? 'bad' : cc ? 'warn' : 'good'}">⚡ ${cc}% crash/match${S().code.has.watchdog ? ' · watchdog on' : ''}</span>${det ? `<span class="bad">${det} detected</span>` : ''}<span class="sp"></span><span>Lua</span><span>UTF-8</span>`;
    $('code-credits').innerHTML = U.fmt(S().credits) + (Code.legacy() ? ` <small class="cc-leg">+${U.fmt(Code.legacy())} code</small>` : '');
  }
  Code.render = function (animateFrom) {
    renderTree(); renderEditor(animateFrom); renderStatus();
  };
  Code.bind = function () {
    $('code-tree').addEventListener('click', e => {
      const fo = e.target.closest('[data-folder]');
      if (fo) { NA.Audio.click(); Code.openFolders[fo.dataset.folder] = !Code.openFolders[fo.dataset.folder]; renderTree(); return; }
      const fi = e.target.closest('[data-file]');
      if (fi) { NA.Audio.click(); st().sel = fi.dataset.file; NA.Save.save(); renderTree(); renderEditor(); $('code-ed').scrollTop = 0; }
    });
    $('code-ed').addEventListener('click', e => {
      const fb = e.target.closest('[data-fixfb]'), rw = e.target.closest('[data-rewrite]');
      if (fb) { if (Code.fixFB(fb.dataset.fixfb)) { NA.UI.toast('Bug fixed'); Code.render(); } else { NA.Audio.deny && NA.Audio.deny(); NA.UI.toast('Not enough credits'); } return; }
      if (rw) { if (Code.rewrite(rw.dataset.rewrite)) { NA.UI.toast('Rewritten clean. Warden lost the signature'); Code.render(); } else { NA.Audio.deny && NA.Audio.deny(); NA.UI.toast('Not enough credits'); } return; }
      const b = e.target.closest('[data-write]');
      if (!b || b.disabled) return;
      const id = b.dataset.write, f = BY[id], before = Code.level(id);
      if (Code.why(id)) return;
      if (Code.avail() < Code.cost(id)) { NA.Audio.deny && NA.Audio.deny(); NA.UI.toast(`Need ${U.fmt(Code.cost(id) - Code.avail())} more credits`); return; }
      const r = Code.write(id);
      if (!r) return;
      if (f.kind === 'fix') NA.UI.toast(`Bug fixed: ${BUGS[f.bug].name}`);
      else NA.UI.toast(`+${r.added} lines · ${f.name}${f.max > 1 ? ' v' + Code.level(id) : ''}`);
      if (f.kind !== 'fix' || st().sel !== 'main') st().sel = id;
      Code.render(st().sel === id ? before : null);
      if (NA.UI.renderGoals) NA.UI.renderGoals();
    });
    $('code-back').addEventListener('click', () => {
      NA.Audio.click();
      if (Code.from === 'scr-results' && NA.Game.state === 'results') NA.UI.show('scr-results'); else NA.UI.showMenu();
    });
    $('code-browser').addEventListener('click', () => { NA.Audio.click(); NA.UI.shopSite = 'skillissue'; NA.UI.showShop('scr-code'); });
  };
  // the cheapest version you could write right now (menu goal)
  Code.nextGoal = function () {
    let best = null;
    for (const f of F) {
      if (f.kind === 'main' || Code.why(f.id)) continue;
      const cost = Code.cost(f.id);
      if (cost <= 0 && f.id !== 'practice') continue;
      if (f.id === 'practice') continue;
      if (!best || cost < best.cost) best = { id: f.id, name: f.kind === 'cheat' ? f.name : f.title, lvl: Code.level(f.id) + 1, max: f.max, cost };
    }
    return best;
  };
  Code.unlockAll = function () { for (const f of F) if (f.kind === 'fix' || f.kind === 'stab') st().has[f.id] = true; };
})(window.NA);
