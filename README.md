# NO ANTICHEAT

An incremental FPS where you can't aim, so you buy cheats. Win matches against bots, spend the credits on aimbot, wallhack and worse, and climb from a 1v1 aim map to bigger lobbies while the chat slowly figures out what's going on. There is no anticheat.

Everything is single-player and offline: every "player" is a bot and every cheat is an in-game upgrade.

## Get the iPhone app

Every push to this branch builds the app on a GitHub macOS runner. The unsigned build lands at:

**[`dist/NoAnticheat-unsigned.ipa`](dist/NoAnticheat-unsigned.ipa)**

Direct download link for signers that take a URL:
`https://github.com/ygnh9jv5mw-hue/Casino/raw/no-anticheat/dist/NoAnticheat-unsigned.ipa`

It's unsigned, so sign it with your own signer (or a sideloading tool with your Apple ID) before installing. Each run's IPA is also attached to the run under **Actions → Build NO ANTICHEAT IPA → Artifacts**.

## What's in this build (v0.2)

- 3D low-poly shooter (three.js), landscape, touch controls, mouse/keyboard, and **game controllers** (MFi, Xbox, DualSense)
- Your aim is broken on purpose: crosshair sway, twitches, spread, recoil, panic and fumbled reloads
- **9 lobby tiers** from Aim Map 1v1 to a 24-player Megalobby, on 5 new big maps (Courtyard 5v5, Shipyard, Office 8v8, Metro, Island 16v16)
- **Smarter bots**: real aim model (starts off target and settles, struggles with fast strafes), counter-strafing, bursts, reloads, retreating when hurt, hearing gunshots, roaming to fights
- **18 guns** with fictional names: pistols, hand cannon, revolver, SMGs, ARs, burst rifle, battle rifle, DMR, snipers with scopes, pump and auto shotguns, LMG, minigun, Railspike. Buy them in the **Armory**
- **Loot and shields** on the big maps: floor guns in 5 rarities (Common to Legendary), shield cells and medkits
- Cheats: **Aimbot** (Memory or Silent, hitbox head / neck / pelvis / random, smoothing, prediction, FOV circle), Triggerbot (head-only option), **ESP** (box, skeleton, health, shield, name, distance, weapon, platform, rank, kills, bot tags, snaplines, chams), **Loot ESP** (rarity and type filters), Radar, **Stream Proof**, **Shoot Through Walls**, **Freeze Target**, **Vote Rigging** and more
- In-match cheat menu with tabs (Aim / Visuals / Misc / Exploits / Config) in **11 languages**
- **Vote kicks** in big lobbies (they can actually kick you), **rage quits** and backfills
- **Tournament**: the 3-round FRAGLINE Open bracket with entry fee and prizes
- Suspicion meter, reports counter, lobby chat that reacts to how blatantly you play, seller DMs and story beats on every tier
- Progress saves on the device

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
  js/world.js        maps, collision, raycasts, bot pathfinding
ios/                 Capacitor iOS wrapper (Swift Package Manager)
.github/workflows/   the IPA build
```

Next stages from the design doc: alt accounts, the full story ending, and the Pro League.
