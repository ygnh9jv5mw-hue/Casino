// Index generation: find the true count where the high-count play overtakes the low-count play,
// using a "typical" remaining deck at each true count (Hi-Lo proportional model).
const { makeCalc, tcDeck, VAL } = require('./bscalc.js');
const sum = (d) => d.reduce((a, b) => a + b, 0);
// rank idx: 0=A, 1..8 = 2..9, 9 = T
const SIT = [
  { id: 'ins', ins: true, up: 0, pub6: { s17: 3, h17: 3 } },
  { id: '16v10', c: [9, 5], up: 9, hi: 'S', lo: 'H', pub6: { s17: 0, h17: 0 } },
  { id: '15v10', c: [9, 4], up: 9, hi: 'S', lo: 'H', pub6: { s17: 4, h17: 4 } },
  { id: 'TTv5', c: [9, 9], up: 4, hi: 'P', lo: 'S', pub6: { s17: 5, h17: 5 } },
  { id: 'TTv6', c: [9, 9], up: 5, hi: 'P', lo: 'S', pub6: { s17: 4, h17: 4 } },
  { id: '10v10', c: [5, 3], up: 9, hi: 'D', lo: 'H', pub6: { s17: 4, h17: 4 } },
  { id: '12v3', c: [9, 1], up: 2, hi: 'S', lo: 'H', pub6: { s17: 2, h17: 2 } },
  { id: '12v2', c: [9, 1], up: 1, hi: 'S', lo: 'H', pub6: { s17: 3, h17: 3 } },
  { id: '11vA', c: [5, 4], up: 0, hi: 'D', lo: 'H', pub6: { s17: 1, h17: null } },
  { id: '9v2', c: [4, 3], up: 1, hi: 'D', lo: 'H', pub6: { s17: 1, h17: 1 } },
  { id: '10vA', c: [6, 2], up: 0, hi: 'D', lo: 'H', pub6: { s17: 4, h17: 3 } },
  { id: '9v7', c: [5, 2], up: 6, hi: 'D', lo: 'H', pub6: { s17: 3, h17: 3 } },
  { id: '16v9', c: [9, 5], up: 8, hi: 'S', lo: 'H', pub6: { s17: 5, h17: 5 } },
  { id: '13v2', c: [9, 2], up: 1, hi: 'S', lo: 'H', pub6: { s17: -1, h17: -1 } },
  { id: '12v4', c: [9, 1], up: 3, hi: 'S', lo: 'H', pub6: { s17: 0, h17: 0 } },
  { id: '12v5', c: [9, 1], up: 4, hi: 'S', lo: 'H', pub6: { s17: -2, h17: -2 } },
  { id: '12v6', c: [9, 1], up: 5, hi: 'S', lo: 'H', pub6: { s17: -1, h17: -1 } },
  { id: '13v3', c: [9, 2], up: 2, hi: 'S', lo: 'H', pub6: { s17: -2, h17: -2 } },
  { id: '14v10R', c: [9, 3], up: 9, hi: 'R', lo: 'H', pub6: { s17: 3, h17: 3 } },
  { id: '15v10R', c: [9, 4], up: 9, hi: 'R', lo: 'H', pub6: { s17: 0, h17: 0 } },
  { id: '15v9R', c: [9, 4], up: 8, hi: 'R', lo: 'H', pub6: { s17: 2, h17: 2 } },
  { id: '15vAR', c: [9, 4], up: 0, hi: 'R', lo: 'H', pub6: { s17: 1, h17: null } }
];

function diffAt(s, h17, dl, t) {
  const d = tcDeck(dl, t);
  if (s.ins) return 3 * (d[9] / sum(d)) - 1;
  const C = makeCalc(h17), [a, b] = s.c, up = s.up;
  const hard = VAL[a] + VAL[b], ace = a === 0 || b === 0, tot = ace && hard + 10 <= 21 ? hard + 10 : hard;
  const ev = (act) => act === 'S' ? C.stand(d, up, tot) : act === 'H' ? C.hit(d, up, hard, ace) : act === 'D' ? C.dbl(d, up, hard, ace) : act === 'R' ? -0.5 : C.split(d, up, a, true);
  return ev(s.hi) - ev(s.lo);
}
function cross(s, h17, dl) {
  // coarse scan for the sign change, then bisect
  let lo = -14, flo = diffAt(s, h17, dl, lo);
  if (flo >= 0) return -Infinity; // high-count play is always better in range
  for (let t = -12; t <= 14; t += 2) {
    const f = diffAt(s, h17, dl, t);
    if (f >= 0) { let a = t - 2, b = t; for (let i = 0; i < 7; i++) { const m = (a + b) / 2; if (diffAt(s, h17, dl, m) >= 0) b = m; else a = m; } return (a + b) / 2; }
  }
  return Infinity;
}
const decks = +(process.argv[2] || 6);
const depths = decks === 2 ? [0.75, 1, 1.25] : [2, 3, 4];
const out = {};
for (const h17 of [false, true]) {
  console.log(`== ${decks} decks ${h17 ? 'H17' : 'S17'}  (crossing at decks-left ${depths.join('/')})`);
  for (const s of SIT) {
    const xs = depths.map((dl) => cross(s, h17, dl));
    const avg = xs.reduce((a, b) => a + b, 0) / xs.length, idx = Math.round(avg);
    const pub = decks === 6 ? s.pub6[h17 ? 'h17' : 's17'] : undefined;
    out[s.id] = out[s.id] || {}; out[s.id][h17 ? "h17" : "s17"] = isFinite(avg) ? +avg.toFixed(3) : null;
    console.log(s.id.padEnd(8), xs.map((x) => (isFinite(x) ? x.toFixed(2) : String(x))).join(' / ').padEnd(26), '→', isFinite(avg) ? idx : '—', decks === 6 ? `(published ${pub === null ? 'basic' : pub})${pub !== null && isFinite(avg) && pub !== idx ? '  <-- differs' : ''}` : '');
  }
}
require('fs').writeFileSync(`idx${decks}.json`, JSON.stringify(out));
