/* NO ANTICHEAT: game data. Every tunable number and chat line lives here. */
window.NA = window.NA || {};
(function (NA) {
  'use strict';

  // ---------------------------------------------------------------- tiers
  const TIERS = [
    { id: 1, name: 'Aim Map 1v1', rank: 'Wood V', map: 'aim_map', mode: 'duel', modeLabel: 'Duel',
      scoreToWin: 5, timeLimit: 240, base: 10, kill: 2, winsToUnlock: 2,
      bot: { hp: 100, acc: 0.08, dmg: 5, rate: 1.5, react: 0.9 },
      enemies: ['BOT_Kevin'], allies: [] },
    { id: 2, name: 'Aim Map 2v2', rank: 'Wood I', map: 'aim_map', mode: 'tdm', modeLabel: 'Team deathmatch',
      scoreToWin: 10, timeLimit: 240, base: 30, kill: 4, winsToUnlock: 3,
      bot: { hp: 100, acc: 0.12, dmg: 8, rate: 1.69, react: 0.75 },
      enemies: ['BOT_Kevin', 'NotABot42'], allies: ['mom_plays_too'] },
    { id: 3, name: 'Warehouse', rank: 'Bronze', map: 'warehouse', mode: 'ffa', modeLabel: 'Free-for-all',
      scoreToWin: 10, timeLimit: 300, base: 90, kill: 8, winsToUnlock: 3,
      bot: { hp: 100, acc: 0.16, dmg: 10, rate: 1.88, react: 0.65 },
      enemies: ['xX_Gr1ndM4ster_Xx', 'ttv_clipfarmer', '*'], allies: [] },
  ];
  const LOCKED_TIERS = [
    { id: 4, name: 'Courtyard 5v5', rank: 'Silver' },
    { id: 5, name: 'Shipyard', rank: 'Gold' },
    { id: 6, name: 'Office 8v8', rank: 'Platinum' },
    { id: 7, name: 'Metro', rank: 'Diamond' },
    { id: 8, name: 'Island 16v16', rank: 'Master' },
    { id: 9, name: 'Megalobby', rank: 'Grandmaster' },
  ];
  const MAX_PLAYABLE_TIER = 3;

  // ---------------------------------------------------------------- weapons
  const WEAPONS = {
    pistol: { id: 'pistol', name: 'P9 Pistol', dmg: 25, head: 2, rate: 4, mag: 12, reload: 1.6, tier: 1 },
    rifle: { id: 'rifle', name: 'AR-7 Rifle', dmg: 20, head: 2.5, rate: 10, mag: 30, reload: 2.2, tier: 2 },
  };

  // ---------------------------------------------------------------- cheats
  // toggle: shows in the in-match cheat menu. levels > 1 get an intensity slider.
  const CHEATS = [
    { id: 'aimassist', name: 'Aim Assist (Lite)', cat: 'Aim', tier: 1, base: 15, growth: 2.0, max: 5, toggle: true,
      tag: "It's basically a controller.", fx: l => `Pulls your crosshair toward enemies within ${2 + l}°` },
    { id: 'steady', name: 'Steady Hands', cat: 'Aim', tier: 1, base: 20, growth: 2.0, max: 5, toggle: true,
      tag: 'Gaming chair firmware update.', fx: l => `Sway −${18 * l}%` + (l >= 3 ? ', no panic' : '') },
    { id: 'nospread', name: 'No Spread', cat: 'Aim', tier: 1, base: 40, growth: 2.2, max: 5, toggle: true,
      tag: 'Bullets go where you point. Revolutionary.', fx: l => `Spread −${20 * l}%` },
    { id: 'norecoil', name: 'No Recoil', cat: 'Aim', tier: 2, base: 60, growth: 2.5, max: 3, toggle: true,
      tag: 'Your mouse, but heavier.', fx: l => `Recoil −${Math.round(100 * l / 3)}%` },
    { id: 'triggerbot', name: 'Triggerbot', cat: 'Aim', tier: 2, base: 250, growth: 3.0, max: 3, toggle: true,
      tag: 'You were going to click anyway.', fx: l => `Fires on enemies by itself, ${[250, 120, 0][l - 1]} ms delay` },
    { id: 'aimbot', name: 'Aimbot', cat: 'Aim', tier: 3, base: 500, growth: 3.5, max: 5, toggle: true, hot: true,
      tag: 'Aim is a setting now.',
      fx: l => ['Legit: 10° FOV, slow and smooth', '20° FOV, faster', '45° FOV', '90° FOV, instant snap', 'RAGE: 360°, snaps behind you'][l - 1] },
    { id: 'radar', name: 'Radar Hack', cat: 'Vision', tier: 2, base: 150, growth: 1, max: 1, toggle: true,
      tag: 'Minimap, but honest.', fx: () => 'Every enemy shows on your minimap' },
    { id: 'wallhack', name: 'Wallhack (ESP)', cat: 'Vision', tier: 3, base: 300, growth: 2.5, max: 5, toggle: true, hot: true,
      tag: 'Walls are a suggestion.',
      fx: l => ['Red boxes through walls', '+ health bars', '+ names and distance', '+ skeletons', '+ snaplines and glowing chams'][l - 1] },
    { id: 'speedhack', name: 'Speedhack', cat: 'Movement', tier: 3, base: 400, growth: 2.5, max: 4, toggle: true,
      tag: 'Legs, but more.', fx: l => `Move speed +${25 * l}%` },
    { id: 'rapidfire', name: 'Rapid Fire', cat: 'Weapon', tier: 2, base: 200, growth: 2.5, max: 4, toggle: true,
      tag: 'Click faster. Automatically.', fx: l => `Fire rate +${30 * l}%` },
    { id: 'infammo', name: 'Infinite Ammo', cat: 'Weapon', tier: 3, base: 600, growth: 1, max: 1, toggle: true,
      tag: 'Reloading is for other people.', fx: () => 'No reloads, no fumbles' },
    { id: 'kdspoof', name: 'K/D Spoofer', cat: 'Server', tier: 3, base: 1200, growth: 1, max: 1, toggle: true,
      tag: 'Your stats, but believable.', fx: () => 'Fake scoreboard stats, suspicion gains −20%' },
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
  const CATEGORIES = ['Aim', 'Vision', 'Movement', 'Weapon', 'Server', 'Farm', 'Misc'];
  const TEASERS = ['Headshot Lock', 'Damage Boost', 'Vote Rigging', 'Wallbang', 'Spinbot', 'Silent Aim', 'God Mode', 'Kill All'];

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
    'xX_Gr1ndM4ster_Xx': 'tryhard', ttv_clipfarmer: 'streamer',
  };
  const NAME_A = ['Silent', 'Salty', 'Frosty', 'Lazy', 'Hyper', 'Spicy', 'Sleepy', 'Cyber', 'Turbo', 'Toxic', 'Crispy', 'Feral', 'Soggy', 'Quiet', 'Mild'];
  const NAME_B = ['Panda', 'Sniper', 'Goblin', 'Potato', 'Falcon', 'Noodle', 'Ghost', 'Taco', 'Viper', 'Llama', 'Wizard', 'Pickle', 'Frog', 'Waffle', 'Moose'];
  const NAME_SPECIAL = ['definitely_human', 'real_person_irl', 'totally_organic_gamer', 'eepy_frog', 'grandpa_gamer'];

  // ---------------------------------------------------------------- chat
  // Bands: 0 Chill, 1 Curious, 2 Suspicious, 3 Accusing, 4 Meltdown
  const CHAT = {
    ambient: [
      ['anyone else lagging', 'gl hf', 'my cat just walked on my keyboard', 'how do u unlock the gold skin', 'this map is so old lol',
        'first game today', 'brb snacks', 'is this ranked?', 'tip: hold W', 'the servers feel extra empty today', 'w lobby',
        'anyone wanna duo after', 'tip: the enemy is the one shooting at you', 'love this map', 'chat is quiet today'],
      ['ok who is actually good here', 'this lobby got sweaty', 'someone is warming up', 'wait who is {player}', '{player} is cooking',
        'lucky shots tonight', 'is {player} new?', 'ok {player} chill', 'the aim on some people tonight', '{player} woke up and chose violence'],
      ['bro?', "{player}'s account is {accountAge} days old and he's top frag", 'how does he know where i am', 'spectating {player} rn',
        'his crosshair is glued to heads', 'that was not human reaction time', 'he prefired every corner. EVERY corner.',
        'check his profile', "i've never seen anyone improve this fast", 'something is off with {player}'],
      ['HACKER', 'report {player}', "he's not even trying to hide it", 'he turned 180 and headshot me without looking',
        'everyone report {player} after this', 'reported. obviously.', 'this is so blatant', 'why is nobody banning him',
        'turn it off bro', "{player} you're not slick"],
      ['THERE IS NO ANTICHEAT', 'devs??????', 'support email bounced', 'why do i keep queueing into him', 'this game is dead',
        'i reported him 30 times', 'can someone record this', 'how is this allowed', 'anticheat when', 'i give up. genuinely.'],
    ],
    killed: [
      ['nice shot!', 'gg', 'ok fair', 'how did that hit lol', 'nice one', 'lol ok', 'you got me', 'good shot'],
      ['lucky', 'ok that was clean', 'bro got good overnight', "who's coaching u", 'nice flick… wait', 'how', 'that was crazy'],
      ['bro?', 'how did you know i was there', "that's the third time", "nah something's off", 'what was that tracking'],
      ['HACKER', 'aimbot', 'lmao turn it off', 'reported', "you're so obvious", 'wow. just wow.'],
      ['WHY IS THERE NO ANTICHEAT', "i'm done", 'unbelievable', '????', 'devs are asleep'],
    ],
    taunt: {
      1: ['nice try!', "you'll get there", 'gg', 'tip: aim at the head', 'close one!', 'keep practicing!', 'u got this'],
      2: ['ez', 'sit', 'maybe buy aimbot lol', 'skill issue', 'lmao', 'that was free'],
    },
    postWin: ['gg', 'gg wp', 'good game everyone', 'gg {player}', 'nice game'],
    postWinSus: ['gg (reported)', 'enjoy your "win"', 'reported. gg.', "can't wait for the ban wave", 'gg i guess'],
    postLoss: ['gg', 'gg ez', 'nice try {player}', 'gg go next', 'gg wp'],
    fumble: ['lmao he dropped his mag', 'bro fumbled the reload', 'reload skill: 0', 'butterfingers'],
    firstSeen: {
      aimbot: ['he turned 180 and headshot me without looking', 'his crosshair just snapped', 'that flick was not human'],
      speedhack: ['why is he so fast', 'is he on a scooter', 'bro has the zoomies'],
      wallhack: ['how did he know i was there', "he's tracking me through the wall", 'he prefired me'],
      triggerbot: ['he shoots the exact frame i peek', 'reaction time: 0 ms??'],
      rapidfire: ['is his gun on fast forward', 'that pistol fires like a minigun'],
      infammo: ['does he ever reload', 'bro has had the same mag for 2 minutes'],
    },
    keywords: [
      { re: /\bgg\b/i, early: ['gg!', 'gg wp'], late: ['gg', 'gg (reported)'] },
      { re: /not cheat|legit|no hack|not hack|no cheat/i, early: ['sure buddy', 'then turn it off', "that's what a cheater would say"], late: ['sure buddy', 'then turn it off', "that's what a cheater would say"], sus: 10, mom: 'i believe you sweetie' },
      { re: /\bez\b|easy/i, early: ['ez? you can barely aim', 'you could not hit kevin on the aim map'], late: ['ez with aimbot', 'you could not hit kevin on the aim map'], sus: 5 },
      { re: /sorry|sry/i, early: ['apology not accepted', 'its ok', 'sorry for what lol'], late: ['apology not accepted', 'sorry for what lol'] },
      { re: /anticheat|anti-cheat|ban/i, early: ['LMAO', 'coming soon™', 'what anticheat'], late: ['LMAO', 'coming soon™', 'what anticheat'] },
    ],
    fallback: ['nobody asked', 'what', 'ok', '??', 'who asked'],
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
    comingSoon: ["heads up. the lobbies above warehouse are still being 'set up'.", 'come back next update.'],
  };
  const SELLER_BUY = {
    aimassist: 'pleasure doing business', steady: 'firmware updated', nospread: 'precision is a purchase',
    norecoil: 'heavier mouse. same you.', triggerbot: 'you were going to click anyway', aimbot: 'welcome to the big leagues',
    radar: "now you always know where they are. they'll never know why.", wallhack: "you'll never be surprised again. by anything.",
    speedhack: 'gotta go fast', rapidfire: 'your finger thanks you', infammo: 'reloading was holding you back',
    kdspoof: 'smart. sort of.', autoqueue: 'efficiency. i respect it', affiliate: 'referring yourself. bold.',
    rgb: '…ok', practice: 'lol. lmao even.',
  };

  NA.DATA = {
    TIERS, LOCKED_TIERS, MAX_PLAYABLE_TIER, WEAPONS, CHEATS, CHEAT, CATEGORIES, TEASERS, MAPS,
    CHARACTERS, NAME_A, NAME_B, NAME_SPECIAL, CHAT, STORY, SELLER_BUY,
    ANTICHEAT_DAYS_BASE: 1204,
  };
})(window.NA);
