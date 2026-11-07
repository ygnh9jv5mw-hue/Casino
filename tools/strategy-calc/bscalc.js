// Exact(ish) blackjack EV calculator for total-dependent basic strategy and index generation.
// Finite deck, dealer peeks (EVs conditioned on no dealer blackjack), DAS, late surrender optional.
// Ranks: 0=A, 1..8 = 2..9, 9 = T.
const VAL = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const sum = (d) => { let s = 0; for (let i = 0; i < 10; i++) s += d[i]; return s; };
const eff = (hard, ace) => (ace && hard + 10 <= 21 ? hard + 10 : hard);
const isSoft = (hard, ace) => ace && hard + 10 <= 21;
const key = (d) => d.map((x) => (Number.isInteger(x) ? x : x.toFixed(4))).join(',');

function makeCalc(h17) {
  const dmemo = new Map(), fmemo = new Map(), pmemo = new Map();
  function dealerFrom(deck, hard, ace) {
    if (hard > 21) return [0, 0, 0, 0, 0, 1];
    const t = eff(hard, ace), soft = isSoft(hard, ace);
    if (t >= 18 || (t === 17 && !(soft && h17))) { const o = [0, 0, 0, 0, 0, 0]; o[t - 17] = 1; return o; }
    const k = key(deck) + '|' + hard + '|' + (ace ? 1 : 0);
    let r = fmemo.get(k); if (r) return r;
    const N = sum(deck); const out = [0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 10; i++) {
      const c = deck[i]; if (c <= 0) continue; const p = c / N;
      deck[i] -= 1; const s = dealerFrom(deck, hard + VAL[i], ace || i === 0); deck[i] += 1;
      for (let j = 0; j < 6; j++) out[j] += p * s[j];
    }
    fmemo.set(k, out); return out;
  }
  // dealer final distribution [17,18,19,20,21,bust], conditioned on no dealer blackjack
  function dealer(deck, up) {
    const k = up + '#' + key(deck);
    let r = dmemo.get(k); if (r) return r;
    const bj = up === 0 ? 9 : up === 9 ? 0 : -1;
    const denom = sum(deck) - (bj >= 0 ? Math.max(0, deck[bj]) : 0);
    const out = [0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 10; i++) {
      if (i === bj) continue; const c = deck[i]; if (c <= 0) continue; const p = c / denom;
      deck[i] -= 1; const s = dealerFrom(deck, VAL[up] + VAL[i], up === 0 || i === 0); deck[i] += 1;
      for (let j = 0; j < 6; j++) out[j] += p * s[j];
    }
    dmemo.set(k, out); return out;
  }
  function stand(deck, up, tot) {
    if (tot > 21) return -1;
    const d = dealer(deck, up); let ev = d[5];
    for (let j = 0; j < 5; j++) { const dt = 17 + j; if (dt < tot) ev += d[j]; else if (dt > tot) ev -= d[j]; }
    return ev;
  }
  // optimal value with hit/stand only
  function best(deck, up, hard, ace) {
    if (hard > 21) return -1;
    const k = up + '@' + key(deck) + '|' + hard + '|' + (ace ? 1 : 0);
    let r = pmemo.get(k); if (r !== undefined) return r;
    const t = eff(hard, ace); const s = stand(deck, up, t);
    r = t >= 21 ? s : Math.max(s, hit(deck, up, hard, ace));
    pmemo.set(k, r); return r;
  }
  function hit(deck, up, hard, ace) {
    const N = sum(deck); let ev = 0;
    for (let i = 0; i < 10; i++) {
      const c = deck[i]; if (c <= 0) continue; const p = c / N;
      deck[i] -= 1; const nh = hard + VAL[i]; ev += p * (nh > 21 ? -1 : best(deck, up, nh, ace || i === 0)); deck[i] += 1;
    }
    return ev;
  }
  function dbl(deck, up, hard, ace) {
    const N = sum(deck); let ev = 0;
    for (let i = 0; i < 10; i++) {
      const c = deck[i]; if (c <= 0) continue; const p = c / N;
      deck[i] -= 1; const nh = hard + VAL[i]; ev += p * (nh > 21 ? -1 : stand(deck, up, eff(nh, ace || i === 0))); deck[i] += 1;
    }
    return 2 * ev;
  }
  // split: 2 x EV of one hand starting with the pair card (deck already excludes both pair cards + upcard)
  function split(deck, up, pr, das) {
    const N = sum(deck); let ev = 0;
    for (let i = 0; i < 10; i++) {
      const c = deck[i]; if (c <= 0) continue; const p = c / N;
      deck[i] -= 1;
      let v;
      const hard = VAL[pr] + VAL[i], ace = pr === 0 || i === 0;
      if (pr === 0) v = stand(deck, up, eff(hard, ace)); // split aces: one card
      else { v = Math.max(stand(deck, up, eff(hard, ace)), hit(deck, up, hard, ace)); if (das) v = Math.max(v, dbl(deck, up, hard, ace)); }
      deck[i] += 1; ev += p * v;
    }
    return 2 * ev;
  }
  // EVs for a 2-card starting hand (deck excludes the 2 cards and the upcard)
  function evs(deck, up, c1, c2) {
    const hard = VAL[c1] + VAL[c2], ace = c1 === 0 || c2 === 0;
    const o = { S: stand(deck, up, eff(hard, ace)), H: hit(deck, up, hard, ace), D: dbl(deck, up, hard, ace), R: -0.5 };
    if (c1 === c2) { deck[c1] += 1; const d2 = deck.slice(); d2[c1] -= 1; deck[c1] -= 1; o.P = split(deck, up, c1, true); }
    return o;
  }
  return { dealer, stand, hit, dbl, split, evs, clear: () => { dmemo.clear(); fmemo.clear(); pmemo.clear(); } };
}

// ---------- chart generation ----------
const UPS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]; // dealer 2..9, T, A as rank indices
const rowsHard = [17, 16, 15, 14, 13, 12, 11, 10, 9, 8];
function chart(decks, h17) {
  const C = makeCalc(h17), full = new Array(10).fill(4 * decks); full[9] = 16 * decks;
  const out = {};
  const pickCode = (ev, canP) => {
    const acts = ['H', 'S', 'D', 'R'].concat(canP ? ['P'] : []);
    const bestOf = (list) => list.reduce((a, b) => (ev[b] > ev[a] ? b : a));
    const top = bestOf(acts);
    const noR = bestOf(acts.filter((a) => a !== 'R'));
    const noRnoD = bestOf(acts.filter((a) => a !== 'R' && a !== 'D'));
    const noD = bestOf(acts.filter((a) => a !== 'D'));
    // code: primary with LS + fallbacks
    return { top, noR, noD, noRnoD, ev };
  };
  for (const up of UPS) {
    C.clear();
    const base = full.slice(); base[up] -= 1;
    // hard rows: weighted over non-pair, non-ace 2-card compositions
    for (const t of rowsHard) {
      const comps = [];
      for (let a = 1; a <= 9; a++) for (let b = a + 1; b <= 9; b++) if (VAL[a] + VAL[b] === t) comps.push([a, b]);
      const agg = { H: 0, S: 0, D: 0, R: 0 }; let W = 0;
      for (const [a, b] of comps) {
        const w = base[a] * base[b]; const d = base.slice(); d[a]--; d[b]--;
        const e = C.evs(d, up, a, b); for (const k in agg) agg[k] += w * e[k]; W += w;
      }
      for (const k in agg) agg[k] /= W;
      out['h' + t + '-' + up] = pickCode(agg, false);
    }
    for (let x = 1; x <= 8; x++) { // soft 13..20 = A + 2..9
      const d = base.slice(); d[0]--; d[x]--;
      out['s' + (11 + VAL[x]) + '-' + up] = pickCode(C.evs(d, up, 0, x), false);
    }
    for (let pr = 0; pr <= 9; pr++) {
      const d = base.slice(); d[pr] -= 2;
      out['p' + (pr === 0 ? 11 : VAL[pr]) + '-' + up] = pickCode(C.evs(d, up, pr, pr), true);
    }
  }
  return out;
}

// ---------- index generation (fractional "typical" deck at a given true count) ----------
function tcDeck(decksLeft, tc) {
  const rc = tc * decksLeft, d = new Array(10);
  const low = (20 * decksLeft - rc / 2) / 5, high = 20 * decksLeft + rc / 2;
  for (let i = 1; i <= 5; i++) d[i] = low; // 2..6
  for (let i = 6; i <= 8; i++) d[i] = 4 * decksLeft; // 7..9
  d[9] = high * 0.8; d[0] = high * 0.2;
  return d;
}
function crossing(h17, decksLeft, up, c1, c2, hi, lo, opts = {}) {
  // returns t* where EV(hi) - EV(lo) changes sign (scanning upward)
  let prev = null, prevT = null;
  for (let t = -12; t <= 12.0001; t += 0.25) {
    const C = makeCalc(h17), d = tcDeck(decksLeft, t);
    let diff;
    if (opts.insurance) { diff = 3 * (d[9] / sum(d)) - 1; }
    else { const e = C.evs(d, up, c1, c2); diff = e[hi] - e[lo]; }
    if (prev !== null && prev < 0 && diff >= 0) return prevT + (0 - prev) / (diff - prev) * (t - prevT);
    prev = diff; prevT = t;
  }
  return prev >= 0 ? -99 : 99;
}

module.exports = { makeCalc, chart, crossing, tcDeck, UPS, VAL };

if (require.main === module) {
  const mode = process.argv[2] || 'chart';
  if (mode === 'chart') {
    const decks = +(process.argv[3] || 6), h17 = process.argv[4] !== 's17';
    const t0 = Date.now(); const c = chart(decks, h17);
    console.log(JSON.stringify(Object.fromEntries(Object.entries(c).map(([k, v]) => [k, { top: v.top, noR: v.noR, noD: v.noD, noRnoD: v.noRnoD }]))));
    console.error('ms', Date.now() - t0);
  }
}
