# Strategy calculator

Exact finite-deck EV engine used to generate the **double-deck** basic strategy charts and to
shift the published index numbers for **double deck** and **H17** games.

- `bscalc.js` — EV engine (dealer peeks; DAS; late surrender; split = two independent hands, no resplit).
  `node bscalc.js chart <decks> <h17|s17> > out.json` writes a chart.
- `cmp.js` — checks a generated 6-deck chart against the published 6-deck H17/S17 charts.
  The engine reproduces both, 280/280 cells each.
- `idx.js <decks>` — finds where each Illustrious 18 / Fab 4 play crosses over, using a typical remaining
  deck at each true count (Hi-Lo proportional model). For 6-deck S17 it lands on the published number for
  20 of 22 plays (16 vs 9 and 15 vs A surrender come out one lower).
- `anchor.js` — final index = published 6-deck S17 number + (computed crossing for your game − computed 6-deck S17
  crossing). This keeps the standard numbers and applies only the computed deck/rule shift.
- `encode.js` — turns the double-deck JSON charts into the strings in `www/js/engine.js`.
- `engine-test.js` — verifies the app engine against all of the above (`node engine-test.js`).
