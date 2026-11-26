# NO ANTICHEAT

An incremental FPS where you can't aim, so you buy cheats. Win matches against bots, spend the credits on aimbot, wallhack and worse, and climb from a 1v1 aim map to bigger lobbies while the chat slowly figures out what's going on. There is no anticheat.

Everything is single-player and offline: every "player" is a bot and every cheat is an in-game upgrade.

## Get the iPhone app

Every push to this branch builds the app on a GitHub macOS runner. The unsigned build lands at:

**[`dist/NoAnticheat-unsigned.ipa`](dist/NoAnticheat-unsigned.ipa)**

Direct download link for signers that take a URL:
`https://github.com/ygnh9jv5mw-hue/Casino/raw/no-anticheat/dist/NoAnticheat-unsigned.ipa`

It's unsigned, so sign it with your own signer (or a sideloading tool with your Apple ID) before installing. Each run's IPA is also attached to the run under **Actions → Build NO ANTICHEAT IPA → Artifacts**.

## What's in this build (v0.7)

**New in v0.7: in-match UI redesign**
- Pre-match screen: big map name, BLUE vs RED team cards (or everyone in FFA), countdown ring and a tip, with a camera push-in over the map
- HUD: score bar with the timer in the middle and progress to the target, rounded minimap with suspicion meter, smaller chat that stays out of the way, health and segmented shield bars that flash when you get hit, a big ammo counter by the fire button with a reload bar, glass touch buttons with icons, a ghost joystick so you know where to thumb, a CHEATS button instead of "INS", and name tags on teammates
- Results and pause screens restyled to match

**v0.6**
- **The intro is a cheat loader**: a skillissue.shop loader window logs you in, lists its "products" (NO ANTICHEAT: UNDETECTED), prints a console log while the game really loads, then waits for you to press **INJECT**. The logo slams in with the sound and you land in the lobby
- **Three themed maps**:
  - **Server Farm**: Warden AC's own datacenter. Rows of blinking server racks, cable trays, a glowing core in the middle, status screens saying detections today: 0
  - **LAN Café**: NetCafe 24/7. PC rows with dividers you can peek over, RGB everywhere, arcade cabinets, a snack bar you can hide behind, neon signs
  - **FRAGLINE Arena**: the Major. A stage with both team booths and the trophy, a jumbotron, sweeping spotlights and a packed, bouncing crowd
- **Map rotation**: tiers now play a random map from a pool (never the same twice in a row). Tier names describe the lobby (2v2 Scrims, Small FFA, 5v5 Teams…) and each tier card lists its maps
- The FRAGLINE Open tournament now goes LAN Café → Server Farm → FRAGLINE Arena; Loot Rush and Chaos FFA use the new maps too

**v0.5: the visual update**
- **Intro**: animated logo (shield, crosshair, slash) with a loading bar, then a title screen with a sound sting when you tap
- **3D lobby**: your character stands on a lit stage behind the main menu (drag to spin it, tap it for the Locker); menu buttons slide and glow in
- **New characters**: smoother blocky models with real clothes (hoodies, jackets, vests, helmets, caps, headphones…), toon shading, outlines, and proper running, jumping, aiming, hit-flinch and death animations
- **Item Shop**: 18 outfits, 12 gun skins, 6 knives and 6 kill effects, bought with credits, in 5 rarities. Four featured items a day at 20% off
- **Locker**: try things on and equip them. Your outfit shows on your arms in first person and your gun skin on your gun
- **Knife**: press **V** or the knife button. 55 damage, or an instant kill from behind
- **Better maps**: sky with a sun and clouds, sun shadows, new textures, baked shading, props, and a landmark on every map (hologram on Aim Map, forklift and trusses in the Warehouse, golden statue and clock tower in the Courtyard, cranes, sea and a cargo ship at the Shipyard, a ceiling and city windows in the Office, detailed trains in the Metro, a lighthouse and palm trees on the Island)
- **Graphics setting** (Settings → Graphics): High has shadows, Low is faster on older phones

**Everything else**
- 3D blocky shooter (three.js); touch, mouse/keyboard and **game controllers**
- Your aim is broken on purpose: crosshair sway, twitches, spread, recoil, panic and fumbled reloads
- **Four difficulties** (Easy / Normal / Hard / Nightmare): harder bots, bigger payouts and more rank points
- **9 lobby tiers** from Aim Map 1v1 to a 24-player Megalobby on big maps (Courtyard, Shipyard, Office, Metro, Island)
- **Smarter bots** with a real aim model, counter-strafing, bursts, retreating and hearing gunshots
- **Cheater bots** (rare, 10 levels from closet to spinbot, some flip from legit to rage mid-match). **Report** them or **clip** them; obvious ones get banned and you get a bounty
- **18 guns** with fictional names, the **Armory**, gun **mastery camos**, floor **loot** in 5 rarities, shields and medkits
- **Events**: the **FRAGLINE Open** tournament, **Loot Rush** (everyone starts with a pistol, bots loot too, guns drop on death) and **Chaos FFA** (rotating goofy modifiers: big heads, moon gravity, aimbot for all… live on weekends and 6–9 pm daily)
- Cheats: Aimbot (Memory/Silent, bones, smoothing, prediction), Triggerbot, full ESP options, Loot ESP, Radar, Stream Proof, Shoot Through Walls, Freeze Target, Vote Rigging and more
- **Advanced tab**: reaction delay, aim curve, target priority, hit chance, humanizer, visibility check, aim key, trigger delay and fire mode, ESP distance and colors, radar size, **safe mode**, and saved **profiles** (Legit / Closet / Rage). Cheat menu in **11 languages**
- **Config Market**: buy ready-made configs from made-up config makers, with ratings and reviews (some sellers are scams)
- **Ranks**: Iron → Bronze → Silver → Gold → Platinum → Emerald → Diamond → Master → Grandmaster → **Legend**, three divisions each, **promotion matches**, rank-up rewards (credits + crosshairs), **seasons**, and a **Legend leaderboard** of bots that keep climbing
- **Prestige**, **daily challenges** and a daily login streak
- **Comms**: a fake community app. Post clips for the server to vote on, get clipped yourself (notoriety makes lobbies suspicious of you), announcements, config ads, ban appeals
- Vote kicks, rage quits and backfills; suspicion meter; lobby chat that reacts to how blatant you are; seller DMs
- Progress saves on the device

## Ranked mode (Warden AC)

Casual is the original game: there is no anticheat. **Ranked** (unlocks at Tier 2) pays ×2.5, but **Warden AC** is watching:

- A live **WARDEN** detection meter fills while cheats are on (blatant ones faster) and spikes on snaps, silent-aim shots, wallbang kills, freezes and multikills. Aimbot smoothing lowers it. Hit 100% and you are banned mid-match.
- **Bypass gear** in the shop: HWID Spoofer, Kernel Driver, Signature Mask, Trace Cleaner.
- A **loader minigame** before every ranked match: inject cleanly for less detection, botch it and you start the match already flagged. Or play legit with no cheats loaded.
- **Anticheat updates** every few matches can detect your bypass (detection ×2.5) until the seller patches it, or you pay for a priority patch.
- **Bans scale like a real game**: 5 minutes, then 30 minutes + fine, then 2 hours + fine + rank reset, then permanent. Matches you finish with high detection can still get you caught in a **ban wave** afterwards.
- **Appeals**: pick an excuse or write your own (don't mention the cheat). Review takes about a minute. Permanent bans can also be dodged with an **alt account** (needs an HWID Spoofer).

## Hidden admin panel

Tap the **FRAGLINE** logo 5 times, hold your **credits** (top right of the main menu) for 1.5 seconds, hold the **match timer** for 1.5 seconds during a match, or press **Ctrl+Shift+A** on desktop. It can add any amount of money, unlock every tier, cheat and gun, and in a match turn on god mode, kill everyone, win instantly, clear suspicion, make your gun Legendary or speed the game up.

## Controls

| iPhone | Controller | Desktop | Action |
| --- | --- | --- | --- |
| Left thumb drag | Left stick | W A S D | Move |
| Right thumb drag | Right stick | Mouse (click to lock) | Look |
| FIRE (drag it to aim while shooting) | RT | Left click | Shoot |
| ADS | LT | Right click or Z | Scope / aim down sights |
| JUMP | A | Space | Jump |
| R | X | R | Reload |
| ⇄ | Y (LB/RB pick a slot) | Q, 1, 2 | Switch weapon |
| PICK UP | B | E | Pick up a gun |
| Knife button | | V | Knife (instant kill from behind) |
| INS | View / Select | Insert or ` | Cheat menu |
| Cheat menu → PANIC | D-pad up | End | All cheats off and back on |
| CHAT | | Enter | Type in chat |
| II | Menu / Start | Esc | Pause |

## Play it in a browser

Serve the `www/` folder with any static web server and open it on your phone, then use **Share → Add to Home Screen** for a full-screen app. Opening `www/index.html` directly from disk also works on desktop.

## Project layout

```
www/                 the game (plain HTML/CSS/JS, no build step)
  js/data.js         every tunable number, gun, cheat and chat line
  js/maps.js         the big maps (seeded box generators)
  js/i18n.js         the cheat menu in 11 languages
  js/game.js         player, handicaps, cheats, bots, matches, effects
  js/ui.js           screens, HUD, wallhack overlay, shop, input
  js/world.js        maps, textures, collision, raycasts, bot pathfinding
  js/maps2.js        Server Farm, LAN Café, FRAGLINE Arena
  js/decor.js        sky, lighting, shadows, map props and landmarks
  js/intro.js        the cheat-loader boot screen
  js/avatar.js       blocky characters: one skinned mesh, toon shading, animations
  js/cosmetics.js    outfits, gun skins, knives, kill effects, daily shop
  js/showroom.js     the 3D lobby stage and shop thumbnails
  js/store.js        Item Shop and Locker screens
ios/                 Capacitor iOS wrapper (Swift Package Manager)
.github/workflows/   the IPA build
```

Ideas for later: real online leaderboard, kill cam, spectator replays after a ban, Overwatch mode, rival cheater bot.
