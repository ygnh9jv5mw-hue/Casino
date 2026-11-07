# Blackjack MasterClass (iOS app)

A card-counting training app built to make people learn fast:

- **Bootcamp** — 14 stages from zero to casino-ready that unlock on results, not days.
- **Daily workout** — a mixed, back-to-back drill session built from your current stage.
- **Adaptive basic strategy** — spaced repetition over all 280 chart cells, with an explanation for every miss
  and a mastery map. Supports H17/S17 and surrender on/off (verified against the published charts).
- **Counting gym** — Reflex, Pair cancellation, Deck countdown, Speed ladder, Table flash.
- **True count & betting** — conversion, tray reading, bet ramp.
- **Index plays** — Illustrious 18 + Fab 4 trainer and exact-number recall.
- **Shoe simulator** — 6/8 decks, up to 5 other players, animated dealing, count checks, bet grading,
  index-play grading, decision clock, table chatter and a heat meter that can get you backed off.
- **Course** — 8 modules, 25 lessons with key takeaways, a quiz per module.
- XP, ranks, daily goal, streaks, personal records, haptics, sound and an optional daily reminder.

Everything runs offline; progress is stored on the device.

## Files
- `www/config.js` — your links (booking, community, live training, OSN, email) and the live schedule.
- `www/js/content.js` — lessons and quizzes. `www/js/camp.js` — bootcamp stages.
- `www/js/engine.js` — strategy engine. Other `www/js/*.js` — screens.
- `ios/` — Capacitor Xcode project.

## Build
Every push builds `dist/BlackjackMasterClass-unsigned.ipa` on a GitHub macOS runner (`.github/workflows/ipa.yml`).
Sign it with your own signer. Preview in a browser: open `www/index.html`.
