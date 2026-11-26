/* NO ANTICHEAT: game data. Every tunable number and chat line lives here. */
window.NA = window.NA || {};
(function (NA) {
  'use strict';

  // ---------------------------------------------------------------- tiers
  // bot.skill (0..1) drives the aim model: how far off a bot starts, how fast it settles and how
  // well it tracks movement. rateMul slows trigger fingers on the early tiers.
  const fill = (names, total) => { const a = names.slice(); while (a.length < total) a.push('*'); return a; };
  const TIERS = [
    { id: 1, name: 'Aim Map 1v1', rank: 'Iron', map: 'aim_map', mode: 'duel', modeLabel: 'Duel',
      scoreToWin: 5, timeLimit: 240, base: 10, kill: 2, winsToUnlock: 2,
      bot: { hp: 100, skill: 0.16, react: 0.85, rateMul: 0.6, weapons: ['p9'] },
      enemies: ['BOT_Kevin'], allies: [] },
    { id: 2, name: '2v2 Scrims', rank: 'Bronze', map: 'aim_map', maps: ['aim_map', 'lancafe'], mode: 'tdm', modeLabel: 'Team deathmatch',
      scoreToWin: 10, timeLimit: 240, base: 30, kill: 4, winsToUnlock: 3,
      bot: { hp: 100, skill: 0.24, react: 0.72, rateMul: 0.62, weapons: ['p9', 'wasp'] },
      enemies: ['BOT_Kevin', 'NotABot42'], allies: ['mom_plays_too'] },
    { id: 3, name: 'Small FFA', rank: 'Silver', map: 'warehouse', maps: ['warehouse', 'lancafe', 'servers'], mode: 'ffa', modeLabel: 'Free-for-all',
      scoreToWin: 10, timeLimit: 300, base: 90, kill: 8, winsToUnlock: 3,
      bot: { hp: 100, skill: 0.32, react: 0.6, rateMul: 0.68, weapons: ['p9', 'wasp', 'ar7', 'thumper', 'kodiak'] },
      enemies: ['xX_Gr1ndM4ster_Xx', 'ttv_clipfarmer', '*'], allies: [] },
    { id: 4, name: '5v5 Teams', rank: 'Gold', map: 'courtyard', maps: ['courtyard', 'arena'], mode: 'tdm', modeLabel: 'Team deathmatch',
      scoreToWin: 30, timeLimit: 420, base: 260, kill: 16, winsToUnlock: 3, shield: 50, loot: true,
      bot: { hp: 100, skill: 0.4, react: 0.55, rateMul: 0.72, weapons: ['wasp', 'ar7', 'kodiak', 'thumper', 'tec', 'talon'] },
      enemies: fill(['sgt_sweatpants'], 5), allies: fill(['mom_plays_too'], 4) },
    { id: 5, name: 'Big FFA', rank: 'Platinum', map: 'shipyard', maps: ['shipyard', 'servers'], mode: 'ffa', modeLabel: 'Free-for-all',
      scoreToWin: 15, timeLimit: 420, base: 650, kill: 32, winsToUnlock: 3, shield: 50, loot: true,
      bot: { hp: 100, skill: 0.48, react: 0.5, rateMul: 0.78, weapons: ['ar7', 'kodiak', 'talon', 'hornet', 'dmr', 'brawler', 'longbow'] },
      enemies: fill(['ttv_clipfarmer'], 7), allies: [] },
    { id: 6, name: '8v8 Teams', rank: 'Emerald', map: 'office', maps: ['office', 'arena'], mode: 'tdm', modeLabel: 'Team deathmatch',
      scoreToWin: 50, timeLimit: 480, base: 1500, kill: 60, winsToUnlock: 3, shield: 75, loot: true,
      bot: { hp: 100, skill: 0.56, react: 0.45, rateMul: 0.84, weapons: ['hornet', 'kodiak', 'talon', 'vanguard', 'brawler', 'grinder', 'viper'] },
      enemies: fill(['xX_Gr1ndM4ster_Xx'], 8), allies: fill([], 7) },
    { id: 7, name: 'Sweat FFA', rank: 'Diamond', map: 'metro', maps: ['metro', 'arena', 'servers'], mode: 'ffa', modeLabel: 'Free-for-all',
      scoreToWin: 20, timeLimit: 480, base: 3600, kill: 120, winsToUnlock: 3, shield: 75, loot: true,
      bot: { hp: 100, skill: 0.64, react: 0.4, rateMul: 0.9, weapons: ['kodiak', 'vanguard', 'hornet', 'dmr', 'grinder', 'brawler', 'ranger', 'hailstorm'] },
      enemies: fill(['NotABot42'], 11), allies: [] },
    { id: 8, name: 'Island 16v16', rank: 'Master', map: 'island', mode: 'tdm', modeLabel: 'Team deathmatch',
      scoreToWin: 80, timeLimit: 600, base: 8500, kill: 240, winsToUnlock: 3, shield: 100, loot: true,
      bot: { hp: 100, skill: 0.72, react: 0.35, rateMul: 0.95, weapons: ['kodiak', 'vanguard', 'dmr', 'longbow', 'hailstorm', 'grinder', 'talon', 'brawler'] },
      enemies: fill([], 16), allies: fill(['mom_plays_too'], 15) },
    { id: 9, name: 'Megalobby', rank: 'Grandmaster', map: 'island', mode: 'ffa', modeLabel: 'Free-for-all',
      scoreToWin: 25, timeLimit: 600, base: 22000, kill: 520, winsToUnlock: 3, shield: 100, loot: true,
      bot: { hp: 100, skill: 0.8, react: 0.3, rateMul: 1, weapons: ['vanguard', 'hailstorm', 'longbow', 'grinder', 'buzzsaw', 'kodiak', 'railspike'] },
      enemies: fill(['BOT_Kevin', 'xX_Gr1ndM4ster_Xx', 'ttv_clipfarmer', 'sgt_sweatpants'], 23), allies: [] },
  ];
  // Story bots that are better (or worse) than the lobby around them.
  const BOT_SKILL = { BOT_Kevin: { 1: -0.02, 2: -0.04, 9: 0.17 }, mom_plays_too: { '*': -0.08 }, sgt_sweatpants: { '*': 0.08 }, 'xX_Gr1ndM4ster_Xx': { '*': 0.06 } };
  const LOCKED_TIERS = [
    { id: 10, name: 'Pro League', rank: 'Pro' },
  ];
  const MAX_PLAYABLE_TIER = 9;
  const TOURNAMENT = {
    unlockTier: 4, fee: 400, prize: [0, 900, 2600, 9000],
    rounds: [
      { label: 'Quarterfinal', map: 'lancafe', skill: 0.5, weapons: ['ar7', 'kodiak'] },
      { label: 'Semifinal', map: 'servers', skill: 0.66, weapons: ['kodiak', 'vanguard', 'talon'] },
      { label: 'Grand Final', map: 'arena', skill: 0.82, weapons: ['vanguard', 'dmr', 'kodiak'] },
    ],
    names: ['FaZe_Wannabe', 'org_less_pro', 'Seed1_Dominator', 'coach_says_aim', 'lan_legend_04', 'ProbablyPro'],
  };

  // ---------------------------------------------------------------- difficulty
  // Applies to every lobby. Harder bots pay more credits and more rank points.
  const DIFFICULTY = [
    { id: 'easy', name: 'Easy', skill: -0.12, react: 1.3, rate: 0.75, pay: 0.6, rp: 0.5, rpLoss: 1, cheater: -0.04, shield: 0, color: '#4ade80', tag: 'Bots warm up first and your aim drifts less. Pays less.' },
    { id: 'normal', name: 'Normal', skill: 0, react: 1, rate: 1, pay: 1, rp: 1, rpLoss: 1, cheater: 0, shield: 0, color: '#facc15', tag: 'The standard lobby.' },
    { id: 'hard', name: 'Hard', skill: 0.08, react: 0.85, rate: 1.1, pay: 1.6, rp: 1.4, rpLoss: 0.85, cheater: 0.04, shield: 0, color: '#fb923c', tag: 'Sweats only. Pays more.' },
    { id: 'nightmare', name: 'Nightmare', skill: 0.16, react: 0.7, rate: 1.2, pay: 2.5, rp: 1.8, rpLoss: 0.7, cheater: 0.08, shield: 25, color: '#f43f5e', tag: 'Every bot is cracked. Huge pay.' },
  ];

  // ---------------------------------------------------------------- ranked (Warden AC)
  const RANKED = {
    unlockTier: 2, payMult: 2.5, skillBonus: 0.05, ac: 'Warden AC',
    // detection per second while a cheat is enabled, multiplied by the level you use
    heat: { aimassist: 0.08, steady: 0.05, nospread: 0.1, norecoil: 0.12, triggerbot: 0.35, aimbot: 0.45, radar: 0.2, wallhack: 0.15, lootesp: 0.12,
      speedhack: 0.8, rapidfire: 0.55, infammo: 0.9, kdspoof: 0, streamproof: 0, voterig: 0.4, wallbang: 1.1, freeze: 1.4 },
    decay: 0.9,          // per second, always
    // Warden gets stricter the higher you climb: more heat per cheat, slower cool-down, a head start
    // on detection, timed scans (Gold+), and a harder injector minigame. One entry per rank.
    tiers: [
      { name: 'Warden Lite', mode: 'user-mode', heat: 0.6, decay: 1.4, start: 0, scan: 0, zone: 1.25, speed: 0.85 },
      { name: 'Warden v3', mode: 'user-mode', heat: 0.75, decay: 1.25, start: 0, scan: 0, zone: 1.15, speed: 0.9 },
      { name: 'Warden v3.5', mode: 'user-mode', heat: 0.9, decay: 1.1, start: 0, scan: 0, zone: 1.05, speed: 0.95 },
      { name: 'Warden v4', mode: 'kernel', heat: 1.05, decay: 1.0, start: 5, scan: 60, zone: 1, speed: 1 },
      { name: 'Warden v4.2', mode: 'kernel', heat: 1.2, decay: 0.9, start: 8, scan: 50, zone: 0.92, speed: 1.06 },
      { name: 'Warden v5', mode: 'kernel + AI', heat: 1.4, decay: 0.8, start: 12, scan: 42, zone: 0.85, speed: 1.12 },
      { name: 'Warden v5.5', mode: 'kernel + AI', heat: 1.6, decay: 0.7, start: 16, scan: 36, zone: 0.78, speed: 1.18 },
      { name: 'Warden v6', mode: 'hardware', heat: 1.85, decay: 0.6, start: 20, scan: 30, zone: 0.72, speed: 1.25 },
      { name: 'Warden v6 Pro', mode: 'hardware', heat: 2.1, decay: 0.5, start: 25, scan: 25, zone: 0.66, speed: 1.32 },
      { name: 'Warden INFINITY', mode: 'it watches you sleep', heat: 2.4, decay: 0.42, start: 30, scan: 20, zone: 0.6, speed: 1.4 },
    ],
    // the ban ladder: offence 1, 2, 3, 4+ (minutes; 0 = permanent)
    ladder: [
      { mins: 5, fine: 0, rrReset: false, label: '5-minute ranked ban' },
      { mins: 30, fine: 0.15, rrReset: false, label: '30-minute ban + 15% fine' },
      { mins: 120, fine: 0.25, rrReset: true, label: '2-hour ban, 25% fine, rank reset' },
      { mins: 0, fine: 0.25, rrReset: true, label: 'Permanent ranked ban' },
    ],
    appealMins: 0.75,    // review time
    excuses: [
      { text: 'My little brother was playing on my account', base: 0.34, deny: 'Your little brother also needs to stop cheating.' },
      { text: 'It was lag, my ping spiked', base: 0.24, deny: 'Lag does not turn you 180° onto a head.' },
      { text: "I'm just really good. Check my match history", base: 0.28, deny: 'We checked your match history. That is the problem.' },
      { text: 'I bought a new gaming chair', base: 0.14, deny: 'Chairs are not a valid input device.' },
      { text: 'I was testing your anticheat for you', base: 0.1, deny: 'Thank you for testing. The test result is: banned.' },
      { text: "I don't even know what an aimbot is", base: 0.18, deny: 'Your config file named "aimbot_final_v2" says otherwise.' },
    ],
    altBase: 2500,
  };

  // ---------------------------------------------------------------- weapons
  // spread: hip cone in degrees. adsMul scales it while scoped. falloff: [full-damage range, min range, min mult].
  // pen: walls a bullet goes through by itself. burst: rounds per trigger pull (rate counts pulls).
  const W = (o) => Object.assign({ head: 2, spread: 4.5, bloom: 1, recoil: 2, pellets: 1, scope: 0, adsMul: 0.5, pen: 0, burst: 1, falloff: null, price: 0, tier: 1 }, o);
  const WEAPONS = {
    p9: W({ id: 'p9', name: 'P9 Pistol', cls: 'pistol', slot: 1, dmg: 25, rate: 4, mag: 12, reload: 1.6, recoil: 2.5, tag: 'Standard issue. Standard aim not included.' }),
    tec: W({ id: 'tec', name: 'Tec Spitter', cls: 'pistol', slot: 1, dmg: 14, head: 1.8, rate: 15, mag: 24, reload: 1.7, spread: 6, recoil: 1.4, falloff: [10, 26, 0.55], price: 420, tier: 2, tag: 'A machine pistol for people who hold the button.' }),
    viper: W({ id: 'viper', name: 'Viper .50', cls: 'pistol', slot: 1, dmg: 52, head: 2.3, rate: 2.2, mag: 7, reload: 2, spread: 4, recoil: 6, price: 1600, tier: 4, tag: 'Hand cannon. Wrist sold separately.' }),
    ranger: W({ id: 'ranger', name: 'Ranger Six', cls: 'pistol', slot: 1, dmg: 70, head: 2, rate: 1.6, mag: 6, reload: 2.6, spread: 3, recoil: 7, price: 4200, tier: 6, tag: 'Six shots. Make them count. Or buy aimbot.' }),
    wasp: W({ id: 'wasp', name: 'Wasp-9 SMG', cls: 'smg', slot: 0, dmg: 16, head: 1.8, rate: 13, mag: 30, reload: 1.9, spread: 5.5, recoil: 1.6, falloff: [12, 32, 0.6], price: 650, tier: 2, tag: 'Spray, pray, repeat.' }),
    hornet: W({ id: 'hornet', name: 'Hornet PDW', cls: 'smg', slot: 0, dmg: 13, head: 1.8, rate: 18, mag: 45, reload: 2.1, spread: 6, recoil: 1.3, falloff: [10, 28, 0.55], price: 2300, tier: 4, tag: 'Fifteen hundred rounds a minute of "trust me".' }),
    ar7: W({ id: 'ar7', name: 'AR-7 Rifle', cls: 'rifle', slot: 0, dmg: 20, head: 2.5, rate: 10, mag: 30, reload: 2.2, spread: 4, recoil: 2, price: 0, tier: 2, tag: 'The rifle everyone starts with. Free at Tier 2.' }),
    kodiak: W({ id: 'kodiak', name: 'Kodiak AK', cls: 'rifle', slot: 0, dmg: 29, head: 3.5, rate: 9, mag: 30, reload: 2.5, spread: 4.5, recoil: 3.2, price: 1900, tier: 3, tag: 'One-tap to the head. If you can find the head.' }),
    talon: W({ id: 'talon', name: 'Talon Burst', cls: 'rifle', slot: 0, dmg: 27, head: 2.5, rate: 3.2, burst: 3, mag: 24, reload: 2.3, spread: 3, recoil: 1.8, price: 3100, tier: 4, tag: 'Three rounds per click. Two of them miss.' }),
    vanguard: W({ id: 'vanguard', name: 'Vanguard BR', cls: 'rifle', slot: 0, dmg: 36, head: 2.5, rate: 6, mag: 20, reload: 2.6, spread: 3.5, recoil: 3.8, scope: 1.6, adsMul: 0.45, price: 6200, tier: 5, tag: 'Battle rifle with a red dot you will not need.' }),
    dmr: W({ id: 'dmr', name: 'Marksman DMR', cls: 'dmr', slot: 0, dmg: 48, head: 2.2, rate: 4, mag: 15, reload: 2.4, spread: 3.5, recoil: 3.5, scope: 2.5, adsMul: 0.15, pen: 1, price: 5200, tier: 5, tag: 'Semi-auto, 2.5x scope, goes through a door.' }),
    longbow: W({ id: 'longbow', name: 'Longbow AWR', cls: 'sniper', slot: 0, dmg: 115, head: 2, rate: 0.75, mag: 5, reload: 3.2, spread: 9, recoil: 9, scope: 5, adsMul: 0.03, pen: 2, price: 9500, tier: 5, tag: 'Bolt action. One shot, one "how?!"' }),
    hailstorm: W({ id: 'hailstorm', name: 'Hailstorm Auto-Sniper', cls: 'sniper', slot: 0, dmg: 70, head: 2, rate: 2.6, mag: 10, reload: 3, spread: 7, recoil: 5, scope: 3.5, adsMul: 0.07, pen: 1, price: 15000, tier: 7, tag: 'An auto-sniper. Everyone in chat hates this gun.' }),
    thumper: W({ id: 'thumper', name: 'Thumper Pump', cls: 'shotgun', slot: 0, dmg: 13, head: 1.5, pellets: 8, rate: 1.1, mag: 5, reload: 3, spread: 7, recoil: 7, falloff: [6, 18, 0.25], price: 850, tier: 3, tag: 'Point in their general direction.' }),
    brawler: W({ id: 'brawler', name: 'Brawler Auto', cls: 'shotgun', slot: 0, dmg: 10, head: 1.5, pellets: 6, rate: 3.5, mag: 8, reload: 3.2, spread: 7.5, recoil: 4, falloff: [5, 15, 0.25], price: 4600, tier: 5, tag: 'Auto shotgun. The lobby will write essays.' }),
    grinder: W({ id: 'grinder', name: 'Grinder LMG', cls: 'lmg', slot: 0, dmg: 23, head: 2, rate: 11, mag: 100, reload: 4.8, spread: 5, recoil: 1.9, pen: 1, price: 7200, tier: 6, tag: 'A hundred rounds. Reload during lunch.' }),
    buzzsaw: W({ id: 'buzzsaw', name: 'Buzzsaw Minigun', cls: 'lmg', slot: 0, dmg: 12, head: 1.6, rate: 26, mag: 200, reload: 6, spread: 7, recoil: 0.9, price: 21000, tier: 7, tag: 'Holds the fire button for you emotionally.' }),
    railspike: W({ id: 'railspike', name: 'Railspike', cls: 'sniper', slot: 0, dmg: 140, head: 1.6, rate: 0.9, mag: 4, reload: 3, spread: 1, adsMul: 0.3, scope: 2, recoil: 6, pen: 9, price: 42000, tier: 8, tag: 'Experimental. Walls are decorative.' }),
  };
  const WEAPON_ORDER = ['p9', 'tec', 'viper', 'ranger', 'wasp', 'hornet', 'ar7', 'kodiak', 'talon', 'vanguard', 'dmr', 'longbow', 'hailstorm', 'thumper', 'brawler', 'grinder', 'buzzsaw', 'railspike'];
  const CLASS_LABEL = { pistol: 'Pistol', smg: 'SMG', rifle: 'Assault rifle', dmr: 'Marksman', sniper: 'Sniper', shotgun: 'Shotgun', lmg: 'LMG' };
  const RARITY = [
    { name: 'Common', color: '#b4bcc8', mult: 1 },
    { name: 'Uncommon', color: '#4ade80', mult: 1.06 },
    { name: 'Rare', color: '#38bdf8', mult: 1.12 },
    { name: 'Epic', color: '#c084fc', mult: 1.18 },
    { name: 'Legendary', color: '#fbbf24', mult: 1.25 },
  ];
  const PLATFORMS = ['PC', 'PC', 'PC', 'PS5', 'XBOX', 'MOBILE', 'SWITCH'];
  const RANKS = ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Emerald', 'Diamond', 'Master', 'Grandmaster', 'Legend'];

  // ---------------------------------------------------------------- cheats
  // toggle: shows in the in-match cheat menu. levels > 1 get an intensity slider.
  // tab: which cheat-menu tab it lives in. opts: defaults for its menu options.
  const CHEATS = [
    { id: 'aimassist', name: 'Aim Assist (Lite)', cat: 'Aim', tab: 'aim', tier: 1, base: 15, growth: 2.0, max: 5, toggle: true,
      tag: "It's basically a controller.", fx: l => `Pulls your crosshair toward enemies within ${2 + l}°` },
    { id: 'steady', name: 'Steady Hands', cat: 'Aim', tab: 'aim', tier: 1, base: 20, growth: 2.0, max: 5, toggle: true,
      tag: 'Gaming chair firmware update.', fx: l => `Sway −${18 * l}%` + (l >= 3 ? ', no panic' : '') },
    { id: 'nospread', name: 'No Spread', cat: 'Aim', tab: 'aim', tier: 1, base: 40, growth: 2.2, max: 5, toggle: true,
      tag: 'Bullets go where you point. Revolutionary.', fx: l => `Spread −${20 * l}%` },
    { id: 'norecoil', name: 'No Recoil', cat: 'Aim', tab: 'aim', tier: 2, base: 60, growth: 2.5, max: 3, toggle: true,
      tag: 'Your mouse, but heavier.', fx: l => `Recoil −${Math.round(100 * l / 3)}%` },
    { id: 'triggerbot', name: 'Triggerbot', cat: 'Aim', tab: 'aim', tier: 2, base: 250, growth: 3.0, max: 3, toggle: true,
      opts: { headOnly: false },
      tag: 'You were going to click anyway.', fx: l => `Fires on enemies by itself, ${[250, 120, 0][l - 1]} ms delay` },
    { id: 'aimbot', name: 'Aimbot', cat: 'Aim', tab: 'aim', tier: 3, base: 500, growth: 3.2, max: 5, toggle: true, hot: true,
      opts: { type: 'memory', bone: 'head', smooth: 1, predict: true, fovCircle: true },
      tag: 'Aim is a setting now. Memory or Silent, pick a bone.',
      fx: l => ['Legit: 10° FOV · memory aim · bone select', '20° FOV · + prediction', '45° FOV · + SILENT aim', '90° FOV, instant snap', 'RAGE: 360°, snaps behind you'][l - 1] },
    { id: 'radar', name: 'Radar Hack', cat: 'Vision', tab: 'visuals', tier: 2, base: 150, growth: 1, max: 1, toggle: true,
      tag: 'Minimap, but honest.', fx: () => 'Every enemy shows on your minimap' },
    { id: 'wallhack', name: 'ESP', cat: 'Vision', tab: 'visuals', tier: 3, base: 300, growth: 2.5, max: 5, toggle: true, hot: true,
      opts: { box: true, health: true, shield: true, name: true, distance: true, weapon: true, skeleton: true, platform: false, rank: false, kills: true, snaplines: false, chams: true, botTag: true },
      tag: 'Walls are a suggestion.',
      fx: l => ['Boxes through walls', '+ health and shield bars', '+ name, distance, weapon', '+ skeleton, platform, rank, kills, bot tags', '+ snaplines and glowing chams'][l - 1] },
    { id: 'lootesp', name: 'Loot ESP', cat: 'Vision', tab: 'visuals', tier: 4, base: 1800, growth: 2.2, max: 3, toggle: true,
      opts: { minRarity: 0, weapons: true, shields: true, meds: true },
      tag: 'Know where the purple guns are.', fx: l => ['Weapons through walls', '+ rarity filter', '+ shields and medkits, full filters'][l - 1] },
    { id: 'speedhack', name: 'Speedhack', cat: 'Movement', tab: 'misc', tier: 3, base: 400, growth: 2.5, max: 4, toggle: true,
      tag: 'Legs, but more.', fx: l => `Move speed +${25 * l}%` },
    { id: 'rapidfire', name: 'Rapid Fire', cat: 'Weapon', tab: 'misc', tier: 2, base: 200, growth: 2.5, max: 4, toggle: true,
      tag: 'Click faster. Automatically.', fx: l => `Fire rate +${30 * l}%` },
    { id: 'infammo', name: 'Infinite Ammo', cat: 'Weapon', tab: 'misc', tier: 3, base: 600, growth: 1, max: 1, toggle: true,
      tag: 'Reloading is for other people.', fx: () => 'No reloads, no fumbles' },
    { id: 'kdspoof', name: 'K/D Spoofer', cat: 'Server', tab: 'misc', tier: 3, base: 1200, growth: 1, max: 1, toggle: true,
      tag: 'Your stats, but believable.', fx: () => 'Fake scoreboard stats, suspicion gains −20%' },
    { id: 'streamproof', name: 'Stream Proof', cat: 'Server', tab: 'misc', tier: 4, base: 3500, growth: 1, max: 1, toggle: true,
      tag: 'Spectators and streamers see a clean screen.', fx: () => 'Hides the menu and visuals from spectators: suspicion gains −30%, no clips' },
    { id: 'voterig', name: 'Vote Rigging', cat: 'Server', tab: 'misc', tier: 5, base: 9000, growth: 1, max: 1, toggle: true,
      tag: 'Democracy, but you count the votes.', fx: () => 'Vote kicks against you always fail' },
    { id: 'wallbang', name: 'Shoot Through Walls', cat: 'Exploit', tab: 'exploits', tier: 5, base: 6000, growth: 2.5, max: 3, toggle: true, hot: true,
      tag: 'Cover is a social construct.', fx: l => [`Bullets pierce 1 wall, keep 55% damage`, `Pierce 2 walls, keep 75%`, `Pierce everything, keep 90%`][l - 1] },
    { id: 'freeze', name: 'Freeze Target', cat: 'Exploit', tab: 'exploits', tier: 6, base: 16000, growth: 2.5, max: 2, toggle: true,
      tag: 'Desync them. Politely.', fx: l => `Enemies you hit freeze for ${[1.2, 2.2][l - 1]} s (4 s cooldown each)` },
    { id: 'hwid', name: 'HWID Spoofer', cat: 'Bypass', tier: 2, base: 400, growth: 3.0, max: 3,
      tag: 'New motherboard serial every boot. Ranked only.', fx: l => `Warden detection −${10 * l}% · lets you make alt accounts` },
    { id: 'kernel', name: 'Kernel Driver', cat: 'Bypass', tier: 3, base: 1500, growth: 3.5, max: 2,
      tag: 'Runs below the anticheat. Allegedly.', fx: l => `Warden detection −${18 * l}%` },
    { id: 'sigmask', name: 'Signature Mask', cat: 'Bypass', tier: 3, base: 1200, growth: 3.0, max: 2,
      tag: 'Scrambles the cheat so updates miss it.', fx: l => `Anticheat updates detect your bypass ${35 * l}% less often, patches −${40 * l}%` },
    { id: 'cleaner', name: 'Trace Cleaner', cat: 'Bypass', tier: 4, base: 5000, growth: 1, max: 1,
      tag: 'Wipes logs after every match.', fx: () => 'Delayed ban waves are 60% less likely' },
    { id: 'autoqueue', name: 'Auto-Queue', cat: 'Farm', tier: 1, base: 50, growth: 1, max: 1,
      tag: 'Skip the menus.', fx: () => 'The next match starts by itself' },
    { id: 'affiliate', name: 'Affiliate Program', cat: 'Misc', tier: 3, base: 500, growth: 3.0, max: 10,
      tag: 'Refer yourself. Get paid.', fx: l => `All payouts +${15 * l}%` },
    { id: 'rgb', name: 'RGB Keyboard', cat: 'Misc', tier: 3, base: 5000, growth: 1, max: 1,
      tag: '+0% performance. Looks sick.', fx: () => 'Does nothing' },
    { id: 'practice', name: 'Practice (Legit)', cat: 'Misc', tier: 1, base: 0, growth: 1, max: 1,
      tag: 'The long way round.', fx: () => 'Starts a 1,000-hour timer. Reward: −5% sway' },
  ];
  const CHEAT = {};
  CHEATS.forEach(c => { CHEAT[c.id] = c; });
  const CATEGORIES = ['Aim', 'Vision', 'Movement', 'Weapon', 'Server', 'Exploit', 'Bypass', 'Farm', 'Misc'];
  const TEASERS = ['God Mode', 'Kill All', 'Spinbot', 'Teleport', 'Rank Boost'];

  // ---------------------------------------------------------------- maps
  // box: [x, z, yBottom, w, h, d, material]
  const MAPS = {
    aim_map: {
      name: 'aim_map', size: [32, 20], sky: 0x9cc4ea, fog: [40, 110],
      boxes: [
        [0, 0, -1, 32, 1, 20, 'devFloor'],
        [0, -10.25, 0, 33, 4, 0.5, 'devWall'], [0, 10.25, 0, 33, 4, 0.5, 'devWall'],
        [-16.25, 0, 0, 0.5, 4, 20, 'devWall'], [16.25, 0, 0, 0.5, 4, 20, 'devWall'],
        [-11, 0, 0, 4, 1, 6, 'devOrange'], [11, 0, 0, 4, 1, 6, 'devOrange'],
        [-5, -4, 0, 0.6, 1.2, 3, 'devGrey'], [5, 4, 0, 0.6, 1.2, 3, 'devGrey'],
        [0, -6.5, 0, 3, 1.2, 0.6, 'devGrey'], [0, 6.5, 0, 3, 1.2, 0.6, 'devGrey'],
        [0, 0, 0, 1.6, 1.6, 1.6, 'devOrange'],
        [-6, 5.5, 0, 1.2, 1.2, 1.2, 'devGrey'], [6, -5.5, 0, 1.2, 1.2, 1.2, 'devGrey'],
      ],
      spawns: {
        A: [[-14.5, -7], [-14.5, 7], [-8.5, -7.5], [-8.5, 7.5]],
        B: [[14.5, 7], [14.5, -7], [8.5, 7.5], [8.5, -7.5]],
      },
    },
    warehouse: {
      name: 'warehouse', size: [40, 40], sky: 0x8fa3b8, fog: [30, 90],
      boxes: [
        [0, 0, -1, 40, 1, 40, 'concrete'],
        [0, -20.25, 0, 41, 6, 0.5, 'wall'], [0, 20.25, 0, 41, 6, 0.5, 'wall'],
        [-20.25, 0, 0, 0.5, 6, 40, 'wall'], [20.25, 0, 0, 0.5, 6, 40, 'wall'],
        [-9, -10, 0, 12, 3, 1.2, 'rack'], [9, -10, 0, 12, 3, 1.2, 'rack'],
        [-9, 10, 0, 12, 3, 1.2, 'rack'], [9, 10, 0, 12, 3, 1.2, 'rack'],
        [-5, -4, 0, 1, 6, 1, 'pillar'], [5, 4, 0, 1, 6, 1, 'pillar'],
        [-5, 4, 0, 1, 6, 1, 'pillar'], [5, -4, 0, 1, 6, 1, 'pillar'],
        [-2.5, 1.5, 0, 2, 2, 2, 'crate'], [2.5, -1.5, 0, 2, 2, 2, 'crate'],
        [-15, -15, 0, 2, 2, 2, 'crate'], [-13, -15, 0, 2, 2, 2, 'crate'], [-15, -13, 0, 2, 2, 2, 'crate'], [-15, -15, 2, 2, 2, 2, 'crate'],
        [15, 15, 0, 2, 2, 2, 'crate'], [13, 15, 0, 2, 2, 2, 'crate'], [15, 13, 0, 2, 2, 2, 'crate'], [15, 15, 2, 2, 2, 2, 'crate'],
        [-16, 4, 0, 2, 2, 2, 'crate'], [16, -4, 0, 2, 2, 2, 'crate'],
        [-3, -15, 0, 3, 1.2, 2, 'crate2'], [3, 15, 0, 3, 1.2, 2, 'crate2'],
        [12, -16, 0, 2, 1.2, 4, 'crate2'], [-12, 16, 0, 2, 1.2, 4, 'crate2'],
      ],
      spawns: {
        all: [[-18, -8], [18, 8], [-8, 18], [8, -18], [-18, 12], [18, -12], [0, -17], [0, 17]],
      },
    },
  };

  // ---------------------------------------------------------------- people
  const CHARACTERS = {
    BOT_Kevin: 'npc', mom_plays_too: 'wholesome', NotABot42: 'npc',
    'xX_Gr1ndM4ster_Xx': 'tryhard', ttv_clipfarmer: 'streamer', sgt_sweatpants: 'tryhard',
  };
  // Gamertag parts. The generator mixes real-world patterns: name+year, two lowercase words,
  // l33t swaps, clan tags, underscores, the odd ttv_ and the odd xX_ _Xx (rare, like in real lobbies).
  const NAME_FIRST = ['jake', 'tyler', 'ethan', 'mason', 'liam', 'noah', 'aiden', 'kyle', 'josh', 'connor', 'dylan', 'brandon', 'luis', 'diego', 'mateo',
    'marcus', 'andre', 'jayden', 'emma', 'mia', 'sofia', 'chloe', 'ava', 'lena', 'nina', 'zoe', 'yuki', 'kenji', 'arjun', 'omar', 'ivan', 'luka', 'felix', 'max', 'leo', 'sam'];
  const NAME_WORD = ['frog', 'toast', 'goose', 'moth', 'crow', 'otter', 'raven', 'wolf', 'fox', 'bean', 'noodle', 'pickle', 'cactus', 'static', 'nova', 'ghost',
    'drift', 'ember', 'frost', 'void', 'echo', 'pixel', 'blaze', 'storm', 'shadow', 'reaper', 'hawk', 'viper', 'lynx', 'koala', 'mango', 'biscuit', 'waffle', 'yeti', 'ninja', 'tofu'];
  const NAME_ADJ = ['sleepy', 'silent', 'lazy', 'salty', 'quiet', 'tiny', 'angry', 'soft', 'cold', 'lucky', 'sad', 'sneaky', 'feral', 'crispy', 'dizzy', 'shy', 'zesty', 'spooky', 'lowkey', 'notso'];
  const NAME_CLAN = ['KRM', 'NVS', 'L0L', 'TTV', 'FAZ', 'SLP', 'DRK', 'VLT', 'OWO', 'RNG', 'GG', 'AIM'];
  const NAME_SPECIAL = ['definitely_human', 'notacheater', 'dad_with_a_job', 'mom_said_1_more', 'hardstuckgold', 'ping_999', 'controller_player', 'just_vibing',
    'lagswitch_larry', 'uninstalling_soon', 'ImNotLaggingYouAre', 'no_scope_nate', 'touchgrass', 'skill_issue_tbh', 'one_more_game', 'wifi_on_a_train'];

  // ---------------------------------------------------------------- chat
  // Banded pools (index = suspicion band 0..4). {player} = you, {accountAge} = fake account age.
  const CHAT = {
    ambient: [
      ['gl', 'glhf', 'hi', 'anyone else lagging or just me', 'my ping is cooked', 'last game then bed', 'who wants to duo after',
        'this map again lol', 'w lobby', 'brb', 'is this ranked', 'my dog is barking at nothing', 'servers are kinda empty today',
        'why do i always spawn here', 'new mouse who dis', 'school tmrw ugh', 'im on wifi sorry', 'lets gooo', 'chat dead', 'ok im warmed up'],
      ['ok who is actually good', 'lobby got sweaty fast', 'who is {player}', '{player} is cooking', 'ok {player} relax',
        'bro is locked in', 'is {player} a smurf', 'mans is warmed up', '{player} chill its casual', 'nice aim {player} lol', 'he is kinda nasty ngl'],
      ['bro?', "{player}'s acc is {accountAge} days old and hes top frag", 'how does he always know where i am', 'spectating {player} rn',
        'his crosshair stays on head level the whole time', 'that reaction time is crazy', 'he prefired every corner', 'check his profile',
        'nobody improves this fast', 'something is off with {player}', 'hmm', 'ok thats weird'],
      ['hacker', 'report {player}', 'hes not even hiding it', 'he 180d and hit me without looking', 'everyone report {player}',
        'reported', 'this is so blatant', 'how is he not banned', 'turn it off bro', '{player} ur not slick', 'clip that', 'cheater in lobby fyi'],
      ['THERE IS NO ANTICHEAT', 'devs????', 'support email bounced lmao', 'why do i keep getting his lobby', 'game is dead fr',
        'reported him like 30 times', 'someone record this', 'how is this allowed', 'anticheat when', 'i give up', 'uninstalling after this'],
    ],
    killed: [
      ['ns', 'nice shot', 'gg', 'ok fair', 'how did that hit lol', 'lol ok', 'u got me', 'nt me', 'mb', 'clean'],
      ['lucky', 'ok that was clean', 'bro got good overnight', 'who coaching u', 'nice flick... wait', 'how', 'thats crazy', 'nah wtf'],
      ['bro?', 'how did u know i was there', 'thats 3 times now', 'nah somethings off', 'what was that tracking', 'u were looking at me thru the wall??'],
      ['hacker', 'aimbot', 'lmao turn it off', 'reported', 'so obvious', 'wow', 'actual cheater', 'enjoy ur ban'],
      ['WHY IS THERE NO ANTICHEAT', 'im done', 'unreal', '????', 'devs are asleep', 'not even mad anymore'],
    ],
    taunt: {
      1: ['nt', 'unlucky', 'gg', 'aim at the head lol', 'close one', 'almost had me', 'u got this'],
      2: ['ez', 'sit', 'maybe buy aimbot lol', 'skill issue', 'lmao', 'free', 'L', 'go next'],
    },
    postWin: ['gg', 'gg wp', 'ggs', 'gg {player}', 'good game', 'gg go next'],
    postWinSus: ['gg (reported)', 'enjoy ur "win"', 'reported gg', 'cant wait for the ban wave', 'gg i guess', 'gg cheater'],
    postLoss: ['gg', 'gg ez', 'nt {player}', 'gg go next', 'ggs', 'ez'],
    fumble: ['lmao he dropped his mag', 'bro fumbled the reload', 'reload skill 0', 'butterfingers', 'he forgot how to reload lol'],
    firstSeen: {
      aimbot: ['he 180d and headshot me without looking', 'his crosshair just snapped', 'that flick was not human', 'aim lock???'],
      speedhack: ['why is he so fast', 'is he on a scooter', 'bro has the zoomies', 'speed hacking lol'],
      wallhack: ['how did he know i was there', 'hes tracking me thru the wall', 'he prefired me', 'walls bro'],
      triggerbot: ['he shoots the exact frame i peek', 'reaction time 0ms??'],
      rapidfire: ['is his gun on fast forward', 'that pistol fires like a minigun'],
      infammo: ['does he ever reload', 'same mag for 2 minutes'],
      silent: ['his bullets CURVE', 'he was looking at the wall and i died', 'he shot left and hit me on the right', 'silent aim lmao'],
      wallbang: ['i was behind a WALL', 'he shot me thru two containers', 'cover does nothing vs this guy'],
      freeze: ['i cant move?? lag??', 'i froze mid strafe', 'my game freezes every time he shoots me'],
      lootesp: ['how does he always have a gold gun', 'he walked straight to the legendary'],
    },
    vote: {
      start: ['f1', 'F1 F1 F1', 'kick him', 'finally', 'yes obviously', 'vote yes'],
      fail: ['how did that fail', 'who voted no', 'rigged', 'the vote is rigged too??', 'devs pls'],
      pass: ['bye', 'cya', 'kicked lol', 'justice', 'later cheater'],
    },
    rageQuit: ['im out', 'uninstalling', 'not playing with this guy', 'alt f4', 'done. reported.', 'this game is a joke'],
    backfill: ['why did i join mid game', 'hi', 'whats the score', 'why is everyone mad', 'who are we mad at'],
    cheater: {
      accuse: ['{name} is cheating fr', 'yo {name} is hacking', 'is {name} cheating or just cracked', '{name} just headshot me thru a wall??', 'report {name}',
        '{name} is not even hiding it', 'two cheaters in one lobby lmao', 'someone spectate {name}', '{name} knows where everyone is', 'clip {name} pls'],
      switched: ['bro {name} just turned it on', '{name} stopped hiding it lol', 'ok {name} is raging now', '{name} went full send', 'what happened to {name} hes cracked now'],
      banned: ['W', 'finally', 'gg {name}', 'reported him too', 'thanks whoever reported', 'cya {name}', 'justice'],
    },
    // Ranked (Warden AC) lobby talk
    ac: {
      ambient: ['ranked is so sweaty', 'warden banned my friend for nothing lol', 'ban wave tonight trust', 'finally a lobby with anticheat',
        'kernel anticheat on my pc is crazy', 'warden caught 3 people yesterday', 'if hes cheating warden will get him', 'rr gains are mid today'],
      sus: ['warden should pick him up soon', 'reported, warden will handle it', 'bro is risking his account', 'enjoy the ban wave', 'he must have a bypass'],
      banned: ['LMAO BANNED', 'warden got him', 'gg cheater', 'see ya', 'the ban hammer', 'W anticheat', 'clip of the ban pls'],
      flagged: ['did warden just flag someone', 'ooh someone got flagged', 'warden is watching'],
    },
    keywords: [
      { re: /\bgg\b/i, early: ['gg!', 'gg wp'], late: ['gg', 'gg (reported)'] },
      { re: /not cheat|legit|no hack|not hack|no cheat/i, early: ['sure buddy', 'then turn it off', "that's what a cheater would say"], late: ['sure buddy', 'then turn it off', "that's what a cheater would say"], sus: 10, mom: 'i believe you sweetie' },
      { re: /\bez\b|easy/i, early: ['ez? you can barely aim', 'you could not hit kevin on the aim map'], late: ['ez with aimbot', 'you could not hit kevin on the aim map'], sus: 5 },
      { re: /sorry|sry/i, early: ['apology not accepted', 'its ok', 'sorry for what lol'], late: ['apology not accepted', 'sorry for what lol'] },
      { re: /anticheat|anti-cheat|ban/i, early: ['LMAO', 'coming soon™', 'what anticheat'], late: ['LMAO', 'coming soon™', 'what anticheat'], ranked: ['warden is watching u', 'ban wave soon', 'enjoy it while it lasts'] },
    ],
    fallback: ['nobody asked', 'what', 'ok', '??', 'who asked', 'k', 'lol', 'mhm'],
    // Lines a specific character says instead of the shared ambient pool.
    personal: {
      BOT_Kevin: ['i am strafing now.', 'please aim at me.', 'i believe in you.', 'i have been here a long time.', 'beep.', 'i am a training bot. i am here to help.'],
      NotABot42: ['As a human, I also enjoy breathing.', 'Greetings, fellow human players.', 'I am typing this with my human fingers.', 'What a normal day to play the game.'],
      mom_plays_too: ['you can do it everyone!', 'remember to drink water :)', 'this is so fun', 'gg in advance :)', 'leave him alone hes just good :)'],
    },
    npcKilled: {
      BOT_Kevin: ['ouch.', 'good shot.', 'i have respawned. please continue.', 'that one hurt.'],
      NotABot42: ['I felt that in my human body.', 'A normal amount of pain.'],
    },
  };

  // ---------------------------------------------------------------- story
  const STORY = {
    intro: [['BOT_Kevin', 'hello. i am a training bot.'], ['BOT_Kevin', 'you can do it.']],
    firstEnd: [['BOT_Kevin', 'gg. your accuracy was {acc}%. that is a record.']],
    sellerIntro: ['saw ur stats lol', "{acc}% accuracy. that's not a skill issue, that's a skill absence.", "first one's half off. nobody has to know."],
    improved: [['BOT_Kevin', 'you have improved. good job.']],
    momHello: [['mom_plays_too', 'hi everyone! :)'], ['mom_plays_too', 'stay close to me sweetie']],
    momNice: ['nice shot sweetie!! :)', 'look at you go!!', "that's my teammate!", 'so proud of you :)'],
    grindHello: [['xX_Gr1ndM4ster_Xx', 'warehouse is my map. good luck newbie']],
    aimbotReveal: [['*', 'lucky'], ['*', 'bro what'], ['xX_Gr1ndM4ster_Xx', "who is this guy. account is {accountAge} days old and he's top frag?"], ['xX_Gr1ndM4ster_Xx', 'smurf.']],
    clip: [['ttv_clipfarmer', 'CLIPPED. my chat says ur cracked.']],
    bestCustomer: "you're my best customer. don't tell the others.",
    comingSoon: ["you cleared the megalobby. there's nothing left to cheat in.", 'pro league is "coming soon". like the anticheat.'],
    tierHello: {
      4: [['sgt_sweatpants', '5 stack. comms on. who is this solo'], ['mom_plays_too', 'hi sweetie! big lobby today :)']],
      5: [['ttv_clipfarmer', 'chat said you would be here. CLIPPING EVERYTHING']],
      6: [['xX_Gr1ndM4ster_Xx', 'i reported you 400 times. i have a spreadsheet.'], ['*', 'is that the guy']],
      7: [['NotABot42', 'Hello again, fellow human. I have upgraded my humanity.']],
      8: [['mom_plays_too', 'i brought the whole book club!! :)'], ['*', 'why are there 32 people here']],
      9: [['BOT_Kevin', 'hello. i have been practicing.'], ['BOT_Kevin', 'i learned it from you.']],
    },
    tourney: [['SYSTEM', 'Welcome to the FRAGLINE Open. Prize pool: {prize}. Admins: 0.']],
  };
  const SELLER_BUY = {
    aimassist: 'pleasure doing business', steady: 'firmware updated', nospread: 'precision is a purchase',
    norecoil: 'heavier mouse. same you.', triggerbot: 'you were going to click anyway', aimbot: 'welcome to the big leagues',
    radar: "now you always know where they are. they'll never know why.", wallhack: "you'll never be surprised again. by anything.",
    speedhack: 'gotta go fast', rapidfire: 'your finger thanks you', infammo: 'reloading was holding you back',
    kdspoof: 'smart. sort of.', autoqueue: 'efficiency. i respect it', affiliate: 'referring yourself. bold.',
    rgb: '…ok', practice: 'lol. lmao even.',
    lootesp: 'gold guns glow now. you know where to walk', streamproof: "streamers can't clip what they can't see",
    voterig: 'votes are a suggestion too', wallbang: 'cover is for people who paid less', freeze: 'this one is my favorite. dont tell anyone',
    hwid: 'new serial, new you. ranked is fair game now', kernel: 'ring 0 baby. warden cant see what it cant reach',
    sigmask: 'when they update, you stay invisible. mostly', cleaner: 'no logs no problems',
    gun: ['nice piece', 'that one hits different', 'gun + aimbot = combo meal'],
  };

  NA.DATA = {
    TIERS, LOCKED_TIERS, MAX_PLAYABLE_TIER, BOT_SKILL, TOURNAMENT, RANKED, DIFFICULTY, WEAPONS, WEAPON_ORDER, CLASS_LABEL, RARITY, PLATFORMS, RANKS, CHEATS, CHEAT, CATEGORIES, TEASERS, MAPS,
    CHARACTERS, NAME_FIRST, NAME_WORD, NAME_ADJ, NAME_CLAN, NAME_SPECIAL, CHAT, STORY, SELLER_BUY,
    ANTICHEAT_DAYS_BASE: 1204,
  };
})(window.NA);
