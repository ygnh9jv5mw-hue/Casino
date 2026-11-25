# NO ANTICHEAT — Game Design Doc

Nov 24, 2026 · @nick

*An incremental FPS where you can't aim, so you buy cheats.*

> **Build status (this branch):** v0.1 covers Milestones 1 and 2 plus parts of 3 and 4: Tiers 1 to 3, Aimbot and Wallhack/ESP, the cheat menu, chat, suspicion and the first two story acts. It's built as a mobile web game (touch controls, landscape) and wrapped for iOS with Capacitor. See README.md.

## How to hand this to an AI

Give the builder this whole doc (export it as Markdown), then send the kickoff prompt below. Build one milestone at a time and play each one before asking for the next.

**Kickoff prompt**

```
Read the whole design doc first. Then build Milestone 1 only, using the stack and file structure in the Tech spec section. Target: desktop web browser. When it runs, stop and tell me what you built, how to test it, and every decision you made where the doc was silent.
```

After testing, reply "Milestone N works, build Milestone N+1" or describe what's broken.

**Rules for the builder**

- Build in milestone order (see Build milestones). Never attempt the whole game in one pass.
- The game must run with zero console errors at the end of every milestone.
- Every tunable number (costs, payouts, bot stats, timings) and every chat line lives in data files, never inside game systems. The numbers here are starting values; expect tuning.
- No external assets: geometry from primitives, textures drawn on canvas, sound from the Web Audio API.
- Everything is fiction. All "players" are offline bots and every cheat is an in-game upgrade. Nothing touches real games, real players or real cheat software.
- Where this doc is silent, pick the simplest option that keeps the game funny and readable, and say what you picked.

## Overview

NO ANTICHEAT is a single-player incremental FPS: you're hopeless at an online shooter, so you spend your match winnings on cheats and climb from a 1v1 aim map to 64-player lobbies while the chat slowly works out what's going on.

**The pitch.** You're terrible at FRAGLINE, a free-to-play arena shooter, and can barely hit a training bot on a 1v1 aim map. Every match pays credits, and a sketchy website sells cheats: aim assist, wallhack, aimbot, speedhack, then things that shouldn't be possible. Lobby chat goes from "you'll get better!" to "REPORT HIM" to "is there even an anticheat?" to something much stranger. There is no anticheat.

- **Genre:** incremental + FPS hybrid, single-player, offline. Every other "player" is a bot.
- **Platform:** desktop browser, mouse and keyboard.
- **Length:** about 3 hours to the ending, then New Game+ and Sandbox.
- **Tone:** deadpan satire of gamer culture. PG-13: gamer slang, no slurs, and swear words appear pre-censored as `****` by FRAGLINE's chat filter.
- **References:** Universal Paperclips (a story told through escalating numbers and text), Cookie Clicker (number go up), Krunker (low-poly browser FPS look).

**Design pillars**

1. **Pathetic to godlike.** You start unable to hit a stationary bot and finish by deleting a 64-player lobby with one key. The contrast is the joke.
2. **Every purchase is felt immediately.** Each cheat visibly changes the very next match.
3. **The chat is the story.** All narrative arrives through lobby chat, seller DMs and system messages, reacting to how blatantly you play.
4. **The game slowly plays itself.** You go from aiming, to managing cheat menus and alt accounts, to watching.

**Names** (placeholders, rename freely)

- Game: **NO ANTICHEAT** (alternates: Skill Issue, Totally Legit, Pay2Aim)
- The shooter inside the game: **FRAGLINE**
- The cheat store: **SKILLISSUE.SHOP**, run by a seller called **@undetected**
- The player picks a username at first launch (default `newplayer_9471`).

## Core loop

```
Play a match -> Earn credits -> Buy cheats -> Win faster and bigger -> Unlock bigger lobbies -> back to Play a match
Alts and Autopilot (from T6) --------> Earn credits
Win faster and bigger --(blatant play)--> Chat catches on (suspicion drives the story)
Unlock bigger lobbies --(new act)------> Chat catches on
```

The loop speeds up with every purchase: each cheat makes the next win faster or bigger, each lobby tier roughly triples payouts, and from T6 alts add credits without playing. How blatantly you play feeds chat suspicion, and new tiers open new story acts.

## You can't aim: the handicap

The player's aim must be bad no matter how good the real person is, so five handicaps sit between the mouse and the bullet, and cheats remove them one by one.

| Handicap | Starting value | What it does | Removed by |
| --- | --- | --- | --- |
| Sway | 5° | The crosshair drifts on smooth noise (about 0.5 Hz), plus a random 3–8° twitch every 2–6 s | Steady Hands, Aimbot |
| Spread | 4.5° cone radius | Each shot lands at a random point in the cone; bloom adds 1° per shot (max +5°) and recovers at 10°/s | No Spread |
| Recoil | 2.5° up, ±1.5° sideways per shot | Kicks the aim point; recovers at 8°/s | No Recoil |
| Panic | Sway ×1.6 | Applies for 2 s after taking damage, or while an enemy is within 8 m | Steady Hands level 3 |
| Fumble | 15% of reloads | A fumbled reload takes 1.5 s longer, with a dropped-mag animation and chat mockery | Infinite Ammo |

- **Sway moves the crosshair, not the camera.** The camera follows the mouse exactly; the crosshair dot wanders around the screen and bullets go where it is. This reads clearly and avoids motion sickness. Settings offer "Camera sway (intense)" for players who want the real thing.
- **Tuning target:** an experienced real-world FPS player lands 10–15% of shots in T1 with no cheats. The first match takes about 2 minutes and feels like a funny struggle, never a losing streak.
- **Practice (Legit)** sits in the shop for free as a joke. Buying it starts a 1,000-hour real-time timer saved with the game. Reward on completion: −5% sway and the achievement "Practice Makes Perfect".

## Weapons, movement and controls

Three hitscan weapons cover the whole game; cheats change how they behave, not which gun you hold.

| Weapon | Unlocks | Damage (headshot ×) | Fire rate | Magazine | Reload |
| --- | --- | --- | --- | --- | --- |
| P9 Pistol | Start | 25 (×2) | 4/s, semi-auto | 12 | 1.6 s |
| AR-7 Rifle | T2 | 20 (×2.5) | 10/s, auto | 30 | 2.2 s |
| SR-1 Sniper | T4 | 90 (×2.5) | 0.8/s | 5 | 3.0 s |

- Every shot is a raycast with a visible tracer. Map geometry blocks shots unless Wallbang is on.
- Right-click scopes the sniper (2.5× zoom); sway doubles while scoped.
- Player: 100 HP, regenerates 10 HP/s after 4 s without damage, respawns 2 s after death. Dying never costs credits.
- Movement: walk 5 m/s, jump 1.2 m, normal gravity. No sprint, crouch, ladders or ramps, which keeps collision simple; upper platforms are reached by jumping onto crates.

**Controls**

| Key | Action |
| --- | --- |
| W A S D | Move |
| Mouse | Look (pointer lock) |
| Left click | Fire |
| Right click | Scope (sniper) |
| R | Reload |
| 1 / 2 / 3 | Switch weapon |
| Space | Jump; fly up while flying |
| Shift | Fly down while flying |
| Tab (hold) | Scoreboard |
| Enter | Type in chat |
| Insert or \` | Open or close the cheat menu |
| End | Panic key: every cheat off, press again to restore |
| F | Lobby Freeze (once owned) |
| K | Kill All (once owned) |
| N | Vote no on a vote kick against you |
| Esc | Release the mouse and pause |

Never bind Ctrl: Ctrl+W closes the browser tab mid-match.

## Bots

Every other "player" is a bot with a username and a chat personality; mechanically each one is a simple state machine that roams, spots enemies and trades probabilistic shots.

**Behavior**

1. **Roam:** walk the map's navigation grid toward a random point, biased toward where an enemy was last seen.
2. **Perceive:** every 200 ms (staggered across bots), look for enemies within 60 m inside a 110° view cone, confirmed by a line-of-sight raycast.
3. **Engage:** wait out a reaction delay (the tier's value ±30%), then strafe sideways, switching direction every 0.5–1.5 s, and fire at 1.5 shots/s in T1, rising evenly to 3/s in T9. Each shot hits with the tier's accuracy, cut by distance (−30% beyond 40 m), Spinbot (−40%) and Fake Lag (−60%). Misses draw a tracer that passes near the target.
4. **Die and respawn:** tip over and fade, then respawn after 3 s at the spawn point farthest from enemies.

- Bots target the nearest visible enemy, so in FFA and TDM they fight each other too and big lobbies feel alive.
- In lobbies of 16 or more, bots beyond 50 m and out of the player's view resolve fights abstractly (a timed kill roll instead of real shots) to save CPU.
- Suspicion changes behavior (see Suspicion): at high Sus, bots gang up on the player, rage-quit, freeze for scripted events and call vote kicks.

**Usernames** come from generated parts (adjective + noun + number, `xX_…_Xx` wrappers, `ttv_` prefixes) mixed with hand-written names that foreshadow the ending: NotABot42, definitely\_human, real\_person\_irl, totally\_organic\_gamer.

**Archetypes** decide each bot's chat voice: tryhard, wholesome, toxic, casual, newbie, streamer, conspiracy, and NPC (flat, oddly formal). The recurring story characters are in the Story section.

**Look:** a capsule body, a sphere head (its own hitbox) and a small box visor showing which way it faces, tinted by team color. White flash on hit; on death, tip over and fade or burst into small cubes.

## Lobby tiers and maps

Nine lobby tiers take you from a 1v1 aim map to a 64-player free-for-all; each pays roughly 3× the last and fields tougher bots, so the cheats you can afford decide how high you climb.

Win the listed number of matches in a tier to unlock the next; any unlocked tier can be replayed. Modes: Duel, TDM (team deathmatch, score = team kills) and FFA (free-for-all).

| Tier | Lobby | Rank | Map | Mode | Bots (allies) | Win at | Time limit | Wins to unlock next |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T1 | Aim Map 1v1 | Wood V | aim\_map | Duel | 1 | 5 kills | 4 min | 2 |
| T2 | Aim Map 2v2 | Wood I | aim\_map | TDM | 3 (1) | 10 | 4 min | 3 |
| T3 | Warehouse | Bronze | warehouse | FFA | 3 | 10 | 5 min | 3 |
| T4 | Courtyard 5v5 | Silver | courtyard | TDM | 9 (4) | 30 | 6 min | 3 |
| T5 | Shipyard | Gold | shipyard | FFA | 7 | 20 | 6 min | 4 |
| T6 | Office 8v8 | Platinum | office | TDM | 15 (7) | 50 | 7 min | 4 |
| T7 | Metro | Diamond | metro | FFA | 15 | 30 | 7 min | 4 |
| T8 | Island 16v16 | Master | island | TDM | 31 (15) | 100 | 8 min | 4 |
| T9 | Megalobby | Grandmaster | island | FFA | 63 | 50 | 8 min | — |

A tier should feel comfortable with its recommended loadout and like a struggle without it; tune bot stats until that's true.

| Tier | Base ₡ | ₡ per kill | Bot HP | Bot accuracy | Bot damage | Bot reaction | Recommended loadout |
| --- | --- | --- | --- | --- | --- | --- | --- |
| T1 | 10 | 2 | 100 | 8% | 5 | 900 ms | Nothing (T1 can't really be lost) |
| T2 | 30 | 4 | 100 | 12% | 8 | 750 ms | Aim Assist 1, Steady Hands 1 |
| T3 | 90 | 8 | 100 | 16% | 10 | 650 ms | Aim Assist 2, No Spread 2 |
| T4 | 300 | 15 | 100 | 20% | 12 | 550 ms | Aimbot 1, Wallhack 1, Infinite Ammo |
| T5 | 1,000 | 40 | 100 | 24% | 14 | 480 ms | Aimbot 2, Damage Boost 1, Speedhack 1, Headshot Lock |
| T6 | 3,500 | 100 | 125 | 28% | 15 | 420 ms | Aimbot 3, Damage Boost 2, Wallbang, Fullbright |
| T7 | 12,000 | 300 | 150 | 32% | 16 | 360 ms | Aimbot 4, Damage Boost 3, Silent Aim 1, Fake Lag |
| T8 | 45,000 | 900 | 150 | 36% | 18 | 320 ms | Aimbot 5, One Tap, Fly |
| T9 | 175,000 | 2,500 | 200 | 40% | 20 | 280 ms | God Mode, Explosive Kills, Silent Aim 2 |

**Payout rules**

- Win: base + kills × per-kill. Loss: 25% of base + kills × per-kill. Quitting mid-match pays kills only.
- Headshot kills earn +50% of the per-kill value, raised by Headshot Bounty (+25% of that bonus per level).
- Multikill (2+ kills within 2 s): +1 per-kill value for each extra kill. Flawless win (0 deaths): +25% of base.
- A default win, when rage-quits empty the lobby, pays 75% of a normal win.
- Everything is multiplied by the payout multiplier: (1 + Affiliate Program + Gaming Chair bonuses) × the New Game+ bonus.

**Maps** (built from boxes listed in a data file; each has its own color palette and 8–32 spawn points)

- **aim\_map** (32×20 m): flat floor with an orange and grey dev-texture grid, two low platforms, a few waist-high walls. The classic aim map.
- **warehouse** (40×40 m): crate stacks, shelving rows, an open center. The first map where Wallhack pays off.
- **courtyard** (60×50 m): symmetrical, two team spawns, a central fountain, arches and pillars.
- **shipyard** (80×80 m): shipping containers in rows and stacks with long sightlines between them.
- **office** (70×60 m): a cubicle maze and corridors, lit dark; Fullbright fixes it.
- **metro** (90×50 m): subway platforms, pillars, parked trains as cover, dim tunnels.
- **island** (160×160 m): open grass, scattered houses and rocks, a central tower, light fog.
- **Navigation:** generate it automatically per map: grid points every 3 m outside obstacles, linked to neighbors with a clear path, searched with A\*. No hand-placed waypoints.

## The cheat shop (SKILLISSUE.SHOP)

The shop sells 43 items in seven categories, each with an effect you can see in the very next match; costs grow exponentially per level, so every tier has something new to save for.

- Cost of the next level = base cost × growth ^ current level, rounded to two significant figures above 1,000.
- The first cheat you ever buy is half price (the seller's "first one's half off").
- Locked items show as `??? · unlocks at Tier N`.
- Every owned cheat can be switched on or off and tuned in the cheat menu. Switched off, it adds no suspicion.
- The shop is open between matches, and mid-match once you own Autopilot. Its look is in Screens.

**Aim**

| Cheat | Unlocks | Base cost (₡) | Levels (cost ×) | Effect | Tagline |
| --- | --- | --- | --- | --- | --- |
| Aim Assist (Lite) | T1 | 15 | 5 (×2.0) | Pulls the crosshair toward enemies within 2° + 1° per level, at 15°/s per level | It's basically a controller. |
| Steady Hands | T1 | 20 | 5 (×2.0) | Sway −18% per level; level 3 also removes Panic | Gaming chair firmware update. |
| No Spread | T1 | 40 | 5 (×2.2) | Spread and bloom −20% per level, zero at level 5 | Bullets go where you point. Revolutionary. |
| No Recoil | T2 | 60 | 3 (×2.5) | Recoil −33% per level | Your mouse, but heavier. |
| Triggerbot | T2 | 250 | 3 (×3.0) | Fires when the crosshair is on an enemy; delay 250 / 120 / 0 ms | You were going to click anyway. |
| Aimbot | T3 | 500 | 5 (×3.5) | 1 Legit: 10° FOV, slow and smooth · 2: 20°, faster · 3: 45° · 4: 90°, instant snap · 5 Rage: 360°, snaps behind you | Aim is a setting now. |
| Humanizer | T4 | 2,500 | 3 (×2.5) | Aim-related suspicion −25% per level; aimbot adds wobble and deliberate misses | Miss on purpose. Sometimes. |
| Headshot Lock | T4 | 4,000 | 1 | Aimbot and Silent Aim go for heads | Bodies are for amateurs. |
| Silent Aim | T6 | 60,000 | 3 (×4.0) | Shots hit any enemy within 30° / 90° / 360° of the crosshair; the tracer bends to them | Look at the floor. They die anyway. |

**Vision**

| Cheat | Unlocks | Base cost (₡) | Levels (cost ×) | Effect | Tagline |
| --- | --- | --- | --- | --- | --- |
| Radar Hack | T2 | 150 | 1 | The minimap shows every enemy | Minimap, but honest. |
| Wallhack (ESP) | T3 | 300 | 5 (×2.5) | 1 red boxes through walls · 2 health bars · 3 names and distance · 4 skeletons · 5 snaplines and glowing outlines | Walls are a suggestion. |
| Chat ESP | T4 | 5,000 | 1 | Shows the enemy team's private chat in red (story content) | Read their team chat. |
| Fullbright | T6 | 2,000 | 1 | Dark maps fully lit | Turn the lights on. Just for you. |

**Movement**

| Cheat | Unlocks | Base cost (₡) | Levels (cost ×) | Effect | Tagline |
| --- | --- | --- | --- | --- | --- |
| Speedhack | T3 | 400 | 4 (×2.5) | Move speed +25% per level | Legs, but more. |
| Bhop Script | T4 | 1,500 | 1 | Hold Space to chain jumps, each adding speed, up to 2.5× | Hop to it. |
| Spinbot | T5 | 25,000 | 1 | Your model spins; bot accuracy against you −40%; a picture-in-picture shows you spinning | Become the ceiling fan. |
| Fake Lag | T6 | 40,000 | 1 | You jitter between positions; bot accuracy against you −60%; your ping shows 999 | Blame your internet. |
| Fly / Noclip | T7 | 150,000 | 2 (×3.0) | 1 fly (Space up, Shift down) · 2 pass through walls | Gravity is optional. |
| Teleport | T9 | 2,000,000 | 3 (×2.0) | While firing, teleport behind the nearest enemy every 2 / 1 / 0.5 s | Nothing personnel, kid. |

**Weapon**

| Cheat | Unlocks | Base cost (₡) | Levels (cost ×) | Effect | Tagline |
| --- | --- | --- | --- | --- | --- |
| Rapid Fire | T2 | 200 | 4 (×2.5) | Fire rate +30% per level | Click faster. Automatically. |
| Infinite Ammo | T3 | 600 | 1 | No reloads, no fumbles | Reloading is for other people. |
| Damage Boost | T4 | 1,000 | 5 (×3.0) | Damage ×1.5 per level, compounding | Server-side damage. |
| Wallbang | T5 | 8,000 | 1 | Bullets pass through map geometry | Through and through. |
| One Tap | T7 | 120,000 | 1 | Any hit kills | One hit. That's the whole cheat. |
| Explosive Kills | T8 | 500,000 | 3 (×3.0) | Kills explode (4 / 6 / 8 m radius) and chain to nearby enemies | Every kill is a group activity. |

**Server** (rage and closet)

| Cheat | Unlocks | Base cost (₡) | Levels (cost ×) | Effect | Tagline |
| --- | --- | --- | --- | --- | --- |
| K/D Spoofer | T3 | 1,200 | 1 | Scoreboard shows believable fake stats; suspicion gains −20%; removes the K/D floor | Your stats, but believable. |
| Vote Rigging | T4 | 3,000 | 1 | Vote kicks against you always fail | Democracy is a setting too. |
| Backfill Bribe | T5 | 20,000 | 1 | Bots who rage-quit are replaced within 3 s | Fresh opponents, on demand. |
| God Mode | T8 | 400,000 | 1 | You take no damage | You can't die. Literally. |
| Lobby Freeze | T8 | 1,000,000 | 3 (×2.0) | Press F: every bot freezes for 5 s; cooldown 30 / 20 / 10 s | Everyone hold still. |
| Kill All | T9 | 5,000,000 | 4 (×2.5) | Press K: every enemy dies; cooldown 60 / 30 / 15 / 5 s | Console access. Don't ask how. |

**Farm** (automation)

| Cheat | Unlocks | Base cost (₡) | Levels (cost ×) | Effect | Tagline |
| --- | --- | --- | --- | --- | --- |
| Auto-Queue | T1 | 50 | 1 | The next match starts by itself after the results screen | Skip the menus. |
| Autopilot | T6 | 12,000 | 1 | Your character moves by itself using bot AI; with Aimbot and Triggerbot, matches play themselves | Hands-free fragging. |
| Alt Account | T6 | 5,000 | No cap (×1.15) | Each alt earns credits in the background (see Idle layer) | Why play one account when you can play forty? |
| Second Monitor | T6 | 50,000 | 1 | Alt income +50% | Watch them all at once. |
| Phone Farm | T7 | 600,000 | 1 | Alt income +100% | A wall of phones. Very normal. |
| Server Rack | T8 | 6,000,000 | 1 | Alt income +200% | Your bedroom is 40°C now. |
| Lobby Takeover | T9 | 25,000,000 | 1 | Fills whole lobbies with your alts: instant wins at 2× payout, and the chat goes quiet | Why fight strangers? |

**Misc**

| Cheat | Unlocks | Base cost (₡) | Levels (cost ×) | Effect | Tagline |
| --- | --- | --- | --- | --- | --- |
| Affiliate Program | T3 | 500 | 10 (×3.0) | All payouts +15% per level | Refer yourself. Get paid. |
| Headshot Bounty | T4 | 2,000 | 5 (×3.0) | Headshot bonus +25% per level | Heads are worth more. |
| Gaming Chair | T4 | 10,000 | 3 (×10) | All payouts +10% per level (Gaming Chair, Pro, Throne) | It's what the pros use. |
| RGB Keyboard | T3 | 5,000 | 1 | Nothing; unlocks the achievement Placebo | +0% performance. Looks sick. |
| Practice (Legit) | T1 | Free | 1 | Starts a 1,000-hour real-time timer; reward −5% sway | The long way round. |

## The in-match cheat menu

Press Insert (or \` on laptops and Macs) during a match to open a small overlay, styled like a cheap real cheat menu, where you switch and tune owned cheats live.

- **Look:** dark purple window, monospace text, title bar `skillissue v1.0 | undetected | INS to hide`. The match keeps running behind it, and the mouse is freed while it's open.
- **Layout:** one collapsible section per category, a checkbox per owned cheat, and sliders for tunables: aimbot FOV (up to your owned maximum), aimbot smoothing, which ESP elements show, speed multiplier.
- **Abilities:** hotkeys appear beside ability cheats (F Lobby Freeze, K Kill All) with their cooldowns.
- **Locked cheats** show as grey lines: `[locked] buy at skillissue.shop`.
- **Panic key (End)** switches every cheat off at once and back on with a second press. It's how you dodge a vote kick.
- **Why it matters:** this is where players choose between closet cheating (low suspicion, slower wins) and raging (fast wins, furious chat).

## Suspicion, reports and vote kicks

Suspicion (Sus) is a 0–100 meter per match, shown in the HUD as an eye icon; it drives what chat says and how the lobby reacts, but there is no anticheat, so nothing ever bans you.

**Starting Sus by act** (your reputation arrives before you do): Act 1: 0 · Act 2: 10 · Act 3: 25 · Act 4: 40 · Act 5: 60.

| Event | Sus gained |
| --- | --- |
| Any kill | +1 |
| Headshot kill | +1 more |
| Kill on a target you couldn't see (through walls) | +3 |
| Aimbot snap (aim turned over 60° in under 150 ms) right before a kill | +4 |
| Multikill (2+ kills within 2 s) | +2 per extra kill |
| Moving faster than 1.4× base speed | +0.5 per second |
| Flying or noclipping | +2 per second |
| Surviving lethal damage (God Mode) | +1 |
| Kill All | +50 |

- **Decay:** −0.5/s after 3 s with no gains; −2/s while every cheat is switched off.
- **K/D floor:** Sus can't drop below (kills − deaths) × 2, capped at 50. K/D Spoofer removes the floor.
- **Modifiers:** K/D Spoofer ×0.8 on all gains; Humanizer cuts aim-related gains.
- **Chat bands:** 0–19 Chill · 20–39 Curious · 40–59 Suspicious · 60–79 Accusing · 80–100 Meltdown. In Act 1 chat never goes past Curious: nobody suspects the newbie yet.

**Reports.** While Sus is 40 or more, a bot reports you every 5 s. The lifetime count sits on the main menu: `Reports against you: 12,481 · Action taken: 0 · Anticheat: Coming Soon™`. Each report triggers a system line: "\[SYSTEM\] Thank you for your report! Our team will review it within 3–5 business years."

**Lobby reactions** (from Act 2)

- **Rage-quits** (Sus 60+): each non-story bot has a 0.2% chance per second to leave with a line ("uninstalling", "this game is dead"). If an FFA lobby drops below 2 enemies, or a team empties, you win by default at 75% payout. Backfill Bribe replaces leavers.
- **Gang up** (Sus 85+): bots pick you as their target 4× more often. Chat: "EVERYONE TARGET {player}".
- **Vote kicks** (T4+, Sus 70+): at most one per 60 s, with a 25% chance every 10 s. A banner shows `VOTE KICK: {player} · Reason: cheating · YES 0/9` and yes votes tick up over 15 s. The vote passes if Sus is still 60 or more when the timer ends: you're kicked, keep 50% of what you'd earned, and the results screen adds "You were kicked. Nothing else happens. There is no anticheat."
- **Beating a vote:** hit the panic key and let Sus decay below 60, or own Vote Rigging, which makes every vote fail ("Vote failed: 15 yes, 1 no"). Press N to vote no on yourself.

## Chat system

Chat carries the story, so it gets its own engine: lines are picked from pools by situation, suspicion band, act and speaker, then paced like a real lobby.

**Where it appears:** a chat box bottom-left in matches and on the lobby and results screens, a kill feed top-right, and seller DMs in the shop.

**Sources:** ambient chatter between bots; reactions (to your kills, multikills, a cheat being seen, vote kicks, rage-quits); scripted story beats; system messages; replies to what the player types.

**Selection rules**

- Filter lines by pool, Sus band, act, speaker or archetype, and cheat; then pick by weight.
- Use a shuffle bag per pool so lines don't repeat until the pool runs out. Lines flagged `once` never repeat in a save.
- Post at most one message every 0.8 s. When the queue overflows, drop the oldest ambient lines first; story beats always go first.
- The first time each cheat is visibly used in a lobby, someone reacts to that cheat specifically.
- Template variables: `{player}`, `{killer}`, `{victim}`, `{kills}`, `{streak}`, `{acc}` (your accuracy), `{reports}`, `{accountAge}`, `{days}` (days since FRAGLINE promised an anticheat: starts at 1,204 and grows by one per real day).
- The kill feed shows 6 entries at most; Kill All shows `+57 more`.

**Content targets:** at least 40 lines per Sus band for ambient and reaction pools, at least 5 first-sight lines per cheat, and 2–4 replies per keyword. Match the voice below: lowercase, short, deadpan.

| Band | Sample lines |
| --- | --- |
| Chill | "u new?" · "tip: the enemy is the one shooting at you" · "gg you'll get there" · "is ur monitor on" |
| Curious | "lucky" · "ok that was clean" · "bro got good overnight" · "who's coaching u" |
| Suspicious | "bro?" · "account is {accountAge} days old and he's top frag" · "he prefired every corner. EVERY corner." · "how does he know where i am" |
| Accusing | "HACKER" · "report {player}" · "he's not even trying to hide it" · "he turned 180 and headshot me without looking" |
| Meltdown | "THERE IS NO ANTICHEAT" · "devs??????" · "support email bounced" · "why do i keep queueing into him" |

| Cheat first seen | Sample lines |
| --- | --- |
| Speedhack | "why is he so fast" · "is he on a scooter" |
| Wallhack | "how did he know i was there" · "he's tracking me through the wall" |
| Spinbot | "is he ok" · "bro turned into a ceiling fan" |
| Fly | "HE'S FLYING" · "bro is in the sky" |
| Silent Aim | "he's looking at the FLOOR" |
| Wallbang | "HOW DID HE SHOOT ME THROUGH 3 WALLS" |
| Kill All | "?" · "????????????" · "what just happened" |

**Player typing.** Enter opens a chat input, and bots answer from a keyword table:

| Player types | Replies |
| --- | --- |
| gg | "gg!" early on; "gg (reported)" from Act 3; a quiet "gg." in Act 5 |
| not cheating, legit, no hacks | "sure buddy" · "then turn it off" · mom\_plays\_too: "i believe you sweetie" (Sus +10) |
| ez | "ez with aimbot" · "you couldn't hit kevin on the aim map" (Sus +5) |
| sorry | "apology not accepted" until Act 3; "it's ok. we're used to it." from Act 4 |
| anticheat | "LMAO" · "coming soon™" |
| who are you, are you real | Act 5 only: BOT\_Kevin answers (see Story) |
| Anything else | 30% chance of "nobody asked", "what" or "ok" |

**System lines:** "\[SYSTEM\] Welcome to FRAGLINE! Tip: aim at the enemy." · "\[SYSTEM\] Anticheat status: Coming Soon™ (posted {days} days ago)".

**Enemy team chat** (shown in red, only with Chat ESP): "ok everyone rush him when he spawns" · "i'll distract him, you report" · "does anyone have a plan that isn't reporting" · "wait can he read this".

## Story: characters, acts and endings

The story is told entirely through chat in five acts: the lobby figures out you're cheating, then that nothing can stop you, then that the game is abandoned, and finally that they are all bots and you're the last human on FRAGLINE.

**Recurring characters.** They turn up lobby after lobby (itself a clue) and never rage-quit.

| Character | Who they are | Arc |
| --- | --- | --- |
| BOT\_Kevin | The T1 training bot, literally named BOT. Polite, flat, lowercase | The heart of the story; asks for the final match |
| xX\_Gr1ndM4ster\_Xx | Ranked tryhard who keeps a spreadsheet of reports | Smug, then furious, then leads the resistance, then gives up |
| mom\_plays\_too | Wholesome, defends you to everyone, calls you "sweetie" | Believes you, then knows, then is proud anyway |
| ttv\_clipfarmer | Streamer chasing clips of you | His viewer count has always been 0 |
| truthseeker\_07 | Conspiracy guy, wrong about everything else | First to find the anticheat page, then the truth |
| NotABot42 | Obviously a bot who insists he's human: "As a human, I also enjoy breathing." | "ok. i might be a bot." |
| @undetected | The seller: deadpan, businesslike, DMs you in the shop | Admits the shop is a script too |

**Acts** follow your highest unlocked tier: Act 1 (T1–T2), Act 2 (T3–T4), Act 3 (T5–T6), Act 4 (T7–T8), Act 5 (T9 and the finale). Each beat fires once, at its trigger, ahead of ambient lines. The lines below are canon; write more in the same voice.

**Act 1 · Skill Issue** (everyone thinks you're a newbie)

- First match, BOT\_Kevin: "hello. i am a training bot." · "you can do it." After it: "gg. your accuracy was {acc}%. that is a record."
- After match 1, the seller DMs: "saw ur stats lol" · "{acc}%. that's not a skill issue, that's a skill absence." · "first one's half off. nobody has to know."
- After the first purchase, BOT\_Kevin: "you have improved. good job." In T2, teammate mom\_plays\_too: "nice shot sweetie!! :)"

**Act 2 · Lucky** (people start noticing)

- First match with Aimbot: "lucky" · "bro what" · Gr1ndM4ster: "who is this guy. account is {accountAge} days old and he's top frag?" · "smurf."
- ttv\_clipfarmer: "CLIPPED. my chat says ur cracked."
- The seller, after a big purchase: "you're my best customer. don't tell the others."

**Act 3 · Reported** (open accusations, report spam, vote kicks)

- On joining a lobby: "oh no it's HIM" · "not this guy again" · "{player} in lobby. gg go next."
- Gr1ndM4ster: "i have reported you {reports} times. i have a spreadsheet."
- mom\_plays\_too: "he's just practicing a lot!" and later "…sweetie are you eating"
- truthseeker\_07: "has anyone in this game ever actually been banned? name one person." · "…exactly."
- **Title drop** (first T6 win). truthseeker\_07: "i found the anticheat page." · "it says coming soon™." · "it was posted {days} days ago." Gr1ndM4ster: "…" mom\_plays\_too: "oh no". Then a full-screen glitch title card, NO ANTICHEAT, for 3 seconds.

**Act 4 · Abandoned** (the lobby fights back and fails; one scripted event per match, in this order)

1. **Boycott.** Gr1ndM4ster: "EVERYONE STOP MOVING. no kills, no fun for him." Every bot freezes for 20 s. Then: "…he's still killing us." · "we're standing still, of course he is."
2. **Email.** truthseeker\_07: "i emailed support. it bounced." · "i drove to their office. it's a mattress store now."
3. **Mass quit.** "everyone leave on 3. 1. 2. 3." Every bot leaves except mom\_plays\_too: "i didn't want you to be alone." Backfill bots join in silence.
4. **Hide.** Every bot crams into one corner. With Wallhack you see a single stack of 15 boxes.
5. **The seller:** "my other customers stopped buying." · "…actually i checked. i don't have other customers. it's been just you for a while."
6. **The servers.** truthseeker\_07: "the servers are still running. who is paying for the servers?"

Also in Act 4: once you own alts, "why do half the people in this lobby have the same crosshair settings"; and BOT\_Kevin in a big lobby: "hello. i remember you. you could not hit me." · "you can hit me now. from over there. through the wall."

**Act 5 · Dead Server** (they work out what's really going on; one beat per match, in this order)

1. truthseeker\_07: "weird question. has anyone here ever logged off?"
2. Gr1ndM4ster: "i just tried to alt-tab. there's nothing to alt-tab to."
3. ttv\_clipfarmer: "i've streamed for 3 years. my viewer count has been 0 the whole time. i thought i was just bad at streaming."
4. NotABot42: "ok. i might be a bot."
5. mom\_plays\_too: "sweetie… i don't think i'm anybody's mom."
6. BOT\_Kevin: "i told you on day one. i am a training bot. i thought you all knew."
7. truthseeker\_07: "there's one real player left on FRAGLINE." · "it's him."
8. Gr1ndM4ster: "so for three years i've been grinding ranked against bots, and the only human is a cheater. cool. cool cool cool."
9. The seller: "i should tell you something. the shop is a script too. 'undetected' was never a feature." · "there was just nobody left to detect you." Then: "\[SYSTEM\] New lobby available: the last lobby (1 player)." The profile now reads "Global rank: #1 of 1".

In Act 5, typing "who are you" or "are you real" gets BOT\_Kevin: "i am kevin. i am a training bot. i have always told you this."

**The Last Lobby (finale).** The aim map again, at sunset, with white void past the walls. The recurring characters stand in a row and don't shoot.

- BOT\_Kevin: "hello. we have a request." Gr1ndM4ster: "turn it off. all of it." mom\_plays\_too: "we just want to see the real you." truthseeker\_07: "one match. legit. you vs kevin. first to 5. like day one." ttv\_clipfarmer: "i'll stream it. to nobody. like always."
- The cheat menu opens by itself with two buttons:

| Choice | What happens | Ending |
| --- | --- | --- |
| UNINSTALL ALL | "skillissue.exe has stopped working." Every cheat switches off and your crosshair starts swaying again. You play a 1v1 against BOT\_Kevin, who is just as bad (8% accuracy), while the others cheer every hit and miss ("HE HIT IT", "LEGIT!!", "come on kevin"). Win or lose, everyone types "gg". Credits roll over the bots jumping and waving. Last line: "\[SYSTEM\] Anticheat status: not needed." | Legit |
| KILL ALL | Everyone drops at once. Silence, then BOT\_Kevin: "gg". "\[SYSTEM\] All players have left. Server shutting down." Fade to black, credits with no music, final text: "You win." | No Anticheat |

The finale can be replayed for the other ending, and either ending unlocks New Game+ and Sandbox.

**Seller DMs on purchases** (examples): Aimbot: "welcome to the big leagues" · Wallhack: "you'll never be surprised again. by anything." · Vote Rigging: "democracy is overrated" · RGB Keyboard: "…ok" · Practice (Legit): "lol. lmao even." · God Mode: "not sure what you're proving at this point" · Kill All: "i honestly didn't think anyone would buy this one".

## Idle layer and endgame

From T6 the game starts playing itself: alt accounts farm credits in the background, Autopilot runs your own matches, and time away keeps paying.

**Alt accounts** (unlock at T6; the seller: "why play one account when you can play forty?")

- Each alt plays simulated matches in a tier you choose (default: your highest tier minus one).
- Income per alt per second = that tier's base payout × alt win rate ÷ 300.
- Alt win rate = 30% + 5% per distinct cheat you own, up to 90%.
- Multiply by the farm upgrades (Second Monitor +50%, Phone Farm +100%, Server Rack +200%, added together) and by the global payout multiplier.
- Farm screen: a grid of tiny monitors, one per alt, each showing its name (`{player}_alt3`, `totally_different_guy`), its tier and its credits per second, with a running total. Past 12 alts, show the count instead.
- Target share of income from alts: about 10% at T6, 40–50% at T7–T8, about 70% at T9.

**Offline progress:** on load, pay alt income for the time away at 50%, capped at 8 hours, with a popup: "While you were away: +₡X (your alts kept cheating)".

**Autopilot** lets matches run while you shop: the shop opens as an overlay and the match doesn't pause. With Aimbot, Triggerbot and Auto-Queue, your main account goes idle too.

**New Game+ ("New Account"):** start over at T1 on a fresh account, keeping achievements and endings seen. Each completion adds ×1.5 to payouts and a 10% "loyal customer" discount. Recurring characters get déjà vu lines ("why does this feel familiar"; BOT\_Kevin: "welcome back.").

**Sandbox:** pick any map, set 1–64 bots, every cheat unlocked at max level. No credits, no story, pure mayhem.

**Achievements**

| Achievement | How to get it |
| --- | --- |
| Skill Issue | Finish a match under 5% accuracy |
| First One's Half Off | Buy your first cheat |
| Closet Cheater | Win a T5+ match with Sus under 30 |
| Rage Quit (Theirs) | Make 10 bots rage-quit in one match |
| Democracy | Survive 25 vote kicks |
| Placebo | Buy the RGB Keyboard |
| Through and Through | Kill 3 enemies with one Wallbang shot |
| Nothing Personnel | Get 10 Teleport kills in one match |
| Hands Off | Win a match without touching the mouse or keyboard |
| Solo Queue | Buy Lobby Takeover |
| Title Drop | See the title card |
| Practice Makes Perfect | Finish 1,000 hours of legit practice |
| Legit | Uninstall everything in the finale |
| No Anticheat | Kill All in the finale |

## Screens, HUD, art and audio

Three visual styles carry the joke: a generic esports game client (FRAGLINE), a sketchy 2000s website (the shop) and a cheap purple cheat menu.

**Screens**

- **Title:** NO ANTICHEAT in glitchy type; Play, Settings, Credits. A news ticker: "FRAGLINE anticheat coming soon™ (posted {days} days ago)".
- **Main menu (the FRAGLINE client):** Play, Shop, Farm, Profile, Settings, and the banner "Reports against you: N · Action taken: 0".
- **Tier select:** a card per tier with map color, mode, bot count, payout, rank, lock state and your wins.
- **Lobby:** a 5-second countdown with the player list (names, ranks) and chat already running.
- **Results:** scoreboard, your accuracy, K/D and headshot %, an itemized payout, post-match chat, and Shop, Next match and Change lobby buttons.
- **Shop:** a fake browser window with the address bar `https://skillissue.shop`, a "Not secure" warning, flashing HOT badges and a green UNDETECTED check badge on every item; category tabs; item cards with level pips, price and Buy button; the seller's DMs in a side panel.
- **Profile:** lifetime stats, rank, account age, reports received, and an accuracy-over-time graph that starts near 3% and ends at 100%. The graph tells the story.
- **Settings:** mouse sensitivity, FOV 70–110, invert Y, volume (master, effects, music, announcer), chat speed, camera sway (intense), colorblind ESP palette, show FPS, reset save, export and import save.

**HUD:** health, ammo, crosshair (showing the sway live), kill feed, score and timer, minimap (enemies appear only with Radar Hack), chat, the Sus eye meter, credits earned this match, and "+₡12" pop-ups on kills.

**ESP overlay:** a 2D canvas over the 3D view. Each frame, project every bot's bounding box to the screen and draw the owned elements: box, health bar, name, skeleton, snapline. It should look cheap and garish on purpose; by T9 the screen is a mess of boxes and lines.

**Art direction:** low-poly, flat-shaded, bright. Primitives only, with grid textures drawn on canvas (orange and grey dev textures on aim\_map). A boxy viewmodel gun bottom-right with recoil kick and muzzle flash. Bots are colored capsules. The Last Lobby is the aim map at sunset.

**Audio** (all synthesized with the Web Audio API)

- Gunshots: a noise burst through a filter envelope, tuned per weapon.
- Hitmarker tick, a headshot ding that rises in pitch with your streak, a kill thump.
- Chat blip, purchase cha-ching arpeggio, vote-kick alarm, title-drop glitch sting.
- Optional announcer through the browser's speech synthesis ("HEADSHOT", "UNSTOPPABLE"), off by default.
- Optional simple synth loop per act; silence for the Kill All ending.

## Tech spec

Build it as a browser game with Vite, TypeScript and Three.js: no physics engine, no other runtime dependencies, and it runs with `npm install` then `npm run dev`. Menus and overlays are HTML/CSS layered over the WebGL canvas.

If your AI tool can only produce a single file, build Milestone 1 as one `index.html` that loads Three.js from a CDN through an import map, then move to the Vite project from Milestone 2.

**File structure**

```
src/
  main.ts          boot, screen router
  game/
    loop.ts        fixed 60 Hz simulation, render every frame
    player.ts      controller, collision, handicaps
    weapons.ts     hitscan, spread, recoil, reload
    bots.ts        state machine, perception, off-screen fights
    nav.ts         navigation grid + A*
    match.ts       modes, scoring, spawns, payouts
    cheats.ts      computeModifiers, aimbot, triggerbot, abilities
    suspicion.ts   Sus meter, reports, rage-quits, vote kicks
    chat.ts        chat engine, pools, queue, keyword replies
    story.ts       acts, beat triggers, finale
    farm.ts        alts, offline progress
    audio.ts       Web Audio synth
  render/          scene.ts, maps.ts, viewmodel.ts, esp.ts, effects.ts
  ui/              hud.ts, cheatMenu.ts, shop.ts, menus.ts, results.ts, farm.ts, settings.ts
  data/            balance.ts, cheats.ts, tiers.ts, maps.ts, weapons.ts
    chat/          ambient.ts, reactions.ts, story.ts, keywords.ts, names.ts
  save/
    save.ts        load, autosave, versioning, migration, export/import
```

**Data shapes**

```ts
type Category = "aim" | "vision" | "movement" | "weapon" | "server" | "farm" | "misc";

interface CheatDef {
  id: string; name: string; category: Category; tagline: string;
  unlockTier: number; requires?: string[];
  baseCost: number; growth: number; maxLevel: number;  // Infinity for alts
  blatancy: number;                                    // Sus per visible use
  toggleable: boolean; hotkey?: string;
  apply(level: number, m: Modifiers): void;            // writes into Modifiers
}

interface Modifiers {
  swayMult: number; spreadMult: number; recoilMult: number; panic: boolean;
  aimAssist: { radiusDeg: number; pullDegPerSec: number };
  aimbot: { fovDeg: number; degPerSec: number; headLock: boolean } | null;
  triggerbotDelayMs: number | null; silentAimFovDeg: number;
  espLevel: number; radar: boolean; fullbright: boolean; chatEsp: boolean;
  speedMult: number; bhop: boolean; fly: 0 | 1 | 2; spinbot: boolean; fakeLag: boolean;
  teleportEverySec: number | null;
  fireRateMult: number; damageMult: number; infiniteAmmo: boolean; wallbang: boolean;
  oneTap: boolean; explosiveRadius: number; godMode: boolean;
  susMult: number; kdFloor: boolean; voteRigging: boolean; backfill: boolean;
  payoutMult: number; headshotBonusMult: number; altIncomeMult: number;
}

interface TierDef {
  id: number; name: string; rank: string; map: string;
  mode: "duel" | "ffa" | "tdm" | "finale";
  bots: number; allies: number; scoreToWin: number; timeLimitSec: number;
  basePayout: number; killPayout: number; winsToUnlockNext: number;
  bot: { hp: number; accuracy: number; damage: number; fireRate: number; reactionMs: number };
}

interface ChatLine {
  text: string;
  pool: "ambient" | "onKilled" | "onMultikill" | "onCheatSeen" | "lobbyJoin" | "postMatch"
      | "voteKick" | "rageQuit" | "keyword" | "story" | "seller" | "enemyTeam";
  susMin?: number; susMax?: number; actMin?: number; actMax?: number;
  speaker?: string; archetype?: string; cheatId?: string; keyword?: string;
  once?: boolean; weight?: number; delayMs?: number;
}

interface SaveData {
  version: number; createdAt: number; lastSeen: number; username: string;
  credits: number; lifetimeCredits: number;
  cheats: Record<string, { level: number; enabled: boolean; sliders?: Record<string, number> }>;
  highestTier: number; winsByTier: Record<number, number>;
  act: number; storyFlags: string[]; endingsSeen: string[];
  alts: { count: number; tier: number };
  stats: { matches: number; wins: number; kills: number; deaths: number; headshots: number;
           shotsFired: number; shotsHit: number; reports: number; voteKicksSurvived: number;
           accuracyHistory: number[] };
  practiceStartedAt: number | null; ngPlus: number; achievements: string[];
  settings: Record<string, number | boolean>;
}
```

**Implementation notes**

- `computeModifiers(save)` starts from defaults and calls `apply` for each owned, enabled cheat. Recompute it on every purchase, toggle or slider change; game systems only ever read the Modifiers object.
- Aim point = camera direction + sway offset + recoil offset. Shot direction = aim point + random spread. Raycast against bot hitboxes (head sphere, body capsule) and map boxes.
- Aimbot: pick the enemy with the smallest angle to the aim point inside the FOV (line of sight required unless Wallbang is on), then turn the camera toward the target bone at `degPerSec`, instantly from level 4. Mouse input still applies, so the player can fight it. Sway is suppressed while locked on. Level 5 whipping the camera 180° is intended.
- Triggerbot: if the ray from the crosshair hits an enemy, fire after the delay.
- Silent Aim: on firing, if any enemy is inside `silentAimFovDeg`, the shot hits the closest one and its tracer is drawn as a curve.
- ESP: project the 8 corners of each bot's bounds to screen space and take the min and max for the box; skip bots behind the camera.
- Collision: the player and bots are vertical cylinders against axis-aligned map boxes, resolved one axis at a time. Noclip skips collision.
- Performance target: 60 fps on a mid-range laptop with 64 bots. Share geometries and materials (or use InstancedMesh), stagger perception checks, simulate distant fights abstractly, and cap tracers and particles.
- Saving: localStorage key `noanticheat_save`, autosaved every 10 s and after each purchase and match, versioned with migrations, exportable and importable as a base64 string.
- Dev menu (F9, dev builds only; \~ would clash with the \` cheat-menu key): add credits, set tier and act, fire any story beat, spawn bots, show bot states and Sus, and skip time to test offline progress.
- Keyboard: call preventDefault on game keys while the pointer is locked, and never bind Ctrl.

**Building it in Roblox Studio instead**

The design works in Roblox too: keep every number and data table, and swap the web pieces for these.

| System | Roblox approach |
| --- | --- |
| Code layout | ModuleScripts mirroring the folders above; data files as ModuleScripts that return tables |
| FPS camera | `CameraMode = LockFirstPerson`; crosshair, sway and spread drawn in a ScreenGui |
| Hitscan | `workspace:Raycast` with RaycastParams |
| Bots | Lightweight part-based rigs moved by script rather than 64 Humanoids; the same nav grid and A\* written in Luau |
| ESP | ScreenGui frames placed with `Camera:WorldToViewportPoint`; Roblox caps how many Highlight outlines render at once (31), so use them only for a few targets |
| Chat | A custom ScreenGui chat box for bot lines; filter anything the player types through TextService before showing it |
| Saving | DataStoreService, wrapped in pcall with retries |
| Audio | Sounds from the Creator Store instead of Web Audio synthesis |
| Credits | Ironically, this version needs an anticheat: keep credits and purchases on the server so real exploiters can't give themselves money |

## Build milestones

Seven milestones, each ending in a playable build with zero console errors: the game is fun to poke at from Milestone 2 and complete at Milestone 6.

1. **M1 · Bad at shooting.** Three.js scene, aim\_map, pointer-lock controller with collision, the pistol, all five handicaps, one strafing bot that shoots back, HP with regen and respawn, a first-to-5 duel, a basic HUD and the results screen.
   - Done when: a full T1 match plays start to finish in about 2 minutes and aiming feels hilariously bad.
2. **M2 · The shop.** Credits and payouts, SKILLISSUE.SHOP, the first cheats (Aim Assist, Steady Hands, No Spread, No Recoil, Rapid Fire, Triggerbot, Radar Hack, Auto-Queue, Practice), the cheat menu with the panic key, save and load, tier select with T1–T2 and the rifle.
   - Done when: a purchase changes the next match within seconds, and a page reload keeps everything.
3. **M3 · Lobbies and chat.** FFA and TDM, bots fighting each other, the nav grid and A\*, kill feed, scoreboard, the warehouse and courtyard maps, T3–T4, the username generator, the chat engine with its pools, the Sus meter, the reports counter, and the recurring characters (no story beats yet).
   - Done when: a 5v5 TDM runs smoothly and chat reacts sensibly to how blatantly you play.
4. **M4 · Real cheats.** Aimbot and Wallhack at every level, Speedhack, Bhop, Infinite Ammo, Damage Boost, Headshot Lock, Humanizer, K/D Spoofer, Wallbang, Spinbot, Fake Lag, Silent Aim, Fullbright, Chat ESP and the sniper; the shipyard, office and metro maps; T5–T7; rage-quits, gang-ups, vote kicks, Vote Rigging and Backfill Bribe.
   - Done when: every cheat has a visible effect and its own first-sight chat reaction.
5. **M5 · God mode and the farm.** Fly/Noclip, One Tap, God Mode, Explosive Kills, Lobby Freeze, Kill All, Teleport, Autopilot, alts with the farm screen and upgrades, offline progress, the island map, T8–T9 with 32 and 64 bots, and a performance pass.
   - Done when: T9 holds 60 fps on a mid-range laptop and a full idle setup earns credits with no input.
6. **M6 · The story.** Every Act 1–5 beat, the title drop, the Act 4 events, The Last Lobby with both endings, credits, New Game+, Sandbox, achievements and player chat typing.
   - Done when: a fresh save can reach both endings (fast-forward with the dev menu).
7. **M7 · Polish.** All audio, hit feedback (hitmarkers, headshot ding, screen shake, "+₡" pop-ups), the announcer, the settings menu, the profile graph, tips during the first 3 matches, and a balance pass against the pacing targets.
   - Done when: a first-time player reaches T4 in roughly 20–25 minutes without help.

## Pacing and balance

| Tier | Reached at (efficient player) | Key cheats bought there |
| --- | --- | --- |
| T1 Aim Map 1v1 | 0:00 | Aim Assist |
| T2 Aim Map 2v2 | 0:05 | Steady Hands, No Spread |
| T3 Warehouse | 0:11 | Auto-Queue, No Recoil |
| T4 Courtyard 5v5 | 0:17 | Wallhack, Aimbot, Infinite Ammo |
| T5 Shipyard | 0:37 | Damage Boost, Headshot Lock |
| T6 Office 8v8 | 0:59 | Wallbang, first alt accounts |
| T7 Metro | 1:24 | Autopilot, Silent Aim |
| T8 Island 16v16 | 1:50 | One Tap, Fly, God Mode |
| T9 Megalobby | 2:02 | Explosive Kills, Kill All |
| The Last Lobby | 2:17 | credits roll at about 2:22 |

These times come from a simulation of the economy in this doc: matches of 2–2.5 minutes including menus, each tier's recommended loadout bought first, spare credits spent on cheap extras, and alts bought as soon as they're affordable. Aimbot lands at about 0:24, and T4–T7 are the long middle of the run.

**Tuning rules**

- If a stage drags, raise that tier's payouts first; if players skip a cheat, lower its base cost. Change growth rates last.
- Check alt income against the targets in Idle layer. If alts pass half of all income before T8, raise the 300 s divisor.
- Keep the first purchase inside the first 3 minutes and Aimbot before minute 30: those two moments sell the game.

## Out of scope and open decisions

Version 1 is a single-player desktop browser game; these stay out of it: real multiplayer, mobile and touch controls, gamepad, monetization, voice chat and a level editor.

**Decisions for you, the designer**

- [ ] Final title and the name of the game inside the game
- [ ] Keep the Act 5 "everyone is a bot" twist, or end on the Act 3 title drop with a simpler finale
- [ ] Whether dying should cost anything (currently it doesn't)
- [ ] Platform: web is the default because an AI can build it end to end in code; Roblox works too (see Tech spec)
