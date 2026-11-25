# NO ANTICHEAT

An incremental FPS where you can't aim, so you buy cheats. Win matches against bots, spend the credits on aimbot, wallhack and worse, and climb from a 1v1 aim map to bigger lobbies while the chat slowly figures out what's going on. There is no anticheat.

Everything is single-player and offline: every "player" is a bot and every cheat is an in-game upgrade.

## Get the iPhone app

Every push to this branch builds the app on a GitHub macOS runner. The unsigned build lands at:

**[`dist/NoAnticheat-unsigned.ipa`](dist/NoAnticheat-unsigned.ipa)**

Direct download link for signers that take a URL:
`https://github.com/ygnh9jv5mw-hue/Casino/raw/no-anticheat/dist/NoAnticheat-unsigned.ipa`

It's unsigned, so sign it with your own signer (or a sideloading tool with your Apple ID) before installing. Each run's IPA is also attached to the run under **Actions → Build NO ANTICHEAT IPA → Artifacts**.

## What's in this build (v0.1)

- 3D low-poly shooter (three.js), landscape, touch controls on iPhone and mouse/keyboard on desktop
- Your aim is broken on purpose: crosshair sway, twitches, spread, recoil, panic and fumbled reloads
- 3 lobby tiers: Aim Map 1v1, Aim Map 2v2, Warehouse free-for-all (Tiers 4 to 9 are "Coming Soon™")
- SKILLISSUE.SHOP with 16 items, including Aim Assist, No Spread, Triggerbot, Aimbot (up to 360° rage) and Wallhack (boxes, health, names, skeletons, snaplines, glowing chams)
- In-match cheat menu (INS) with per-cheat toggles, intensity sliders and a panic button
- Suspicion meter, reports counter, lobby chat that reacts to how blatantly you play, seller DMs, and the first two story acts
- Progress saves on the device

## Controls

| iPhone | Desktop | Action |
| --- | --- | --- |
| Left thumb drag | W A S D | Move |
| Right thumb drag | Mouse (click to lock) | Look |
| FIRE (drag it to aim while shooting) | Left click | Shoot |
| JUMP | Space | Jump |
| R | R | Reload |
| ⇄ | Q, 1, 2 | Switch weapon (rifle from Tier 2) |
| INS | Insert or ` | Cheat menu |
| Cheat menu → PANIC | End | All cheats off and back on |
| CHAT | Enter | Type in chat |
| II | Esc | Pause |

## Play it in a browser

Serve the `www/` folder with any static web server and open it on your phone, then use **Share → Add to Home Screen** for a full-screen app. Opening `www/index.html` directly from disk also works on desktop.

## Project layout

```
www/                 the game (plain HTML/CSS/JS, no build step)
  js/data.js         every tunable number and chat line
  js/game.js         player, handicaps, cheats, bots, matches, effects
  js/ui.js           screens, HUD, wallhack overlay, shop, input
  js/world.js        maps, collision, raycasts, bot pathfinding
ios/                 Capacitor iOS wrapper (Swift Package Manager)
.github/workflows/   the IPA build
```

Next stages from the design doc: Tiers 4 to 7 with vote kicks and rage-quits, then the late-game cheats, alt accounts and the full story.
