# Kaido Nights (v0.1.1 test build)

A night-city drifting game for iPhone and the web. You start with a rusty '85 hatchback, learn to slide at the Docks, then take over the city one crew at a time.

*Kaidō* (街道) means "road" in Japanese.

## What's in v0.1

- **Garage intro**: a free respray (it strips the rust), free starter parts, then pick your controls and do a short tutorial drive.
- **Takeover**: five districts with five crews. Follow the crew leader through one lap and beat their score to take the district. Drifting close behind them pays ×1.5 (tandem).

  | District | Crew | Leader | Score to beat |
  | --- | --- | --- | --- |
  | The Docks | Rust Rats | Spanner | 8,000 |
  | Industrial Zone | Forge Kings | Anvil | 30,000 |
  | Downtown | Neon Syndicate | Vega | 70,000 |
  | The Highway | Redline Collective | Mach | 110,000 |
  | The Crown | Kaido Zero | Zero | 160,000 |

- **Free roam**: drift any district you've unlocked, for cash (up to ¥3,000 a run; circling on the spot doesn't pay).
- **Scoring**: points come from drift angle × speed. Hold a drift to grow the multiplier from ×1 up to ×5. Bonuses:
  - LINK: chain corners together.
  - MANJI: flick from one side to the other mid-drift.
  - NEAR MISS: tail close to a wall.

  Straighten out to bank the points. Hold ×5 for 5 seconds and the chain banks itself while the drift carries on (MAX BANK). A scrape against a wall drops the multiplier one step; a hard hit or a spin loses the chain.
- **Garage**:
  - Upgrades: engine, tires, suspension, angle kit, handbrake and weight cut, five levels each.
  - Paint, finish (gloss, metallic or matte), wheels and a rear wing.
  - Four more cars, unlocked by taking districts.
- **Night meet**:
  - Show your build off once a night for cash and rep.
  - Three daily challenges.
  - A rival who points you at the next Takeover.
- **Playtest report**: Settings → Copy playtest report gives testers a text summary (device, controls, tries and best score per crew, crashes) to send back.
- **Ads**: the rewarded "double it" ads are placeholders for now. AdMob (iPhone) and AdSense H5 Games Ads (web) can be plugged into `www/js/ads.js`.

All cars, crews and brands are made up.

## Controls

You can change the control mode in Settings, or from the pause menu mid-run.

| Mode | Level | How it works |
| --- | --- | --- |
| One-thumb | Beginner | Gas is automatic and eases off before walls and corners. Hold the right half of the screen to slide right, the left half to slide left. Hold both to brake or reverse. |
| Tilt | Beginner | Gas is automatic, like one-thumb. Tilt the phone to steer. Tap for a handbrake kick. |
| Arcade | Advanced | Gas, brake, e-brake and steering, with light assists. |
| Pro | Advanced | Fully manual with no assists. Pays +20% points. |

On a keyboard, use the arrow keys or WASD, with Space for the e-brake and Esc to pause. Controllers also work.

## Install on iPhone

Every push to this branch builds an unsigned IPA on GitHub Actions and commits it to `dist/`:

- `dist/KaidoNights-v0.1.1-unsigned.ipa`
- `dist/KaidoNights-unsigned.ipa` (always the latest build)

Sign and install it with your usual signer, the same way as NO ANTICHEAT.

## Run in a browser

Open `www/index.html`, or serve the `www/` folder. The game plays in landscape.

## Code map

All the game code is in `www/js`, using three.js r149 and no build step.

| File | What it does |
| --- | --- |
| `core.js` | Helpers, the save (localStorage), sound (WebAudio) and haptics |
| `data.js` | Cars, parts, paint, districts (roads, lots, courses), challenges |
| `physics.js` | Bicycle-model car physics with per-mode driver assists, plus wall collisions |
| `world.js` | Builds a district from its road shapes (signed distance field, curbs, buildings, lamps, neon, sky) |
| `cars.js` | Low-poly car models, paint and rust, tyre smoke, skid marks |
| `drift.js` | Drift scoring |
| `game.js` | Renderer, input, the drive loop, rival AI, camera and results |
| `scenes.js` | Garage turntable and night meet |
| `ui.js` | Menus, the garage intro, tutorial prompts and the HUD |
| `ads.js` | Rewarded-ad placeholder |
| `main.js` | Boot and main loop |
