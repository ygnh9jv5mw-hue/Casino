# Blackjack MasterClass (iOS app)

Card-counting training app: the 8-module course, basic strategy / running count / true count / index play trainers,
a full 6-deck shoe simulator, bankroll & risk-of-ruin calculator, session log, coaching and team application.
Everything runs offline on the phone; progress is stored on the device.

- `www/` — the app (plain HTML/CSS/JS). `www/config.js` holds your links (booking, community, live, OSN, email).
- `www/content.js` — course lessons. `www/engine.js` — strategy engine (6D, S17, DAS, LS + I18/Fab 4).
- `ios/` — Capacitor Xcode project.
- Every push builds `dist/BlackjackMasterClass-unsigned.ipa` on a GitHub macOS runner (`.github/workflows/ipa.yml`).
  Sign it with your own signer.

Preview in a browser: open `www/index.html`.
