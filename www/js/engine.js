// Blackjack engine: cards, hand values, Hi-Lo, rules-aware basic strategy (4–8 decks, DAS,
// dealer stands or hits soft 17, late surrender on/off), Illustrious 18 + Fab 4 index plays,
// and plain-English explanations for every play.
(function () {
  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const SUITS = ['♠', '♥', '♦', '♣'];
  let R = { h17: true, ls: true }; // table rules

  const rv = (r) => (r === 'A' ? 11 : r === '10' || r === 'J' || r === 'Q' || r === 'K' ? 10 : +r);
  const hilo = (r) => { const v = rv(r); return v <= 6 ? 1 : v >= 10 ? -1 : 0; };
  const card = (r, s) => ({ r, s: s || SUITS[(Math.random() * 4) | 0] });
  const tenRank = () => ['10', 'J', 'Q', 'K'][(Math.random() * 4) | 0];
  const rankFor = (v) => (v === 11 ? 'A' : v === 10 ? tenRank() : String(v));

  function shoe(decks) {
    const c = [];
    for (let d = 0; d < decks; d++) for (const s of SUITS) for (const r of RANKS) c.push({ r, s });
    for (let i = c.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [c[i], c[j]] = [c[j], c[i]]; }
    return c;
  }

  function value(cards) {
    let total = 0, aces = 0;
    for (const c of cards) { const v = rv(c.r); total += v; if (v === 11) aces++; }
    while (total > 21 && aces) { total -= 10; aces--; }
    return { total, soft: aces > 0 };
  }
  const isBJ = (cards) => cards.length === 2 && value(cards).total === 21;
  const isPair = (cards) => cards.length === 2 && rv(cards[0].r) === rv(cards[1].r);
  const has = (tc) => tc !== null && tc !== undefined;

  // ---- basic strategy + indices (tc === null → basic strategy only) ----
  function surrender(total, up, tc, pair8) {
    if (pair8) return R.h17 && up === 11; // 8,8 vs A only under H17
    let basic = (total === 16 && up >= 9) || (total === 15 && up === 10);
    if (R.h17 && up === 11 && (total === 15 || total === 17)) basic = true;
    if (!has(tc)) return basic;
    if (total === 15 && up === 10) return tc >= 0;
    if (total === 14 && up === 10) return tc >= 3;
    if (total === 15 && up === 9) return tc >= 2;
    if (total === 15 && up === 11 && !R.h17) return tc >= 1;
    return basic;
  }
  function split(v, up, tc) {
    if (v === 11 || v === 8) return true;
    if (v === 10) { if (!has(tc)) return false; if (up === 5) return tc >= 5; if (up === 6) return tc >= 4; return false; }
    if (v === 9) return (up >= 2 && up <= 6) || up === 8 || up === 9;
    if (v === 7) return up <= 7;
    if (v === 6) return up <= 6;
    if (v === 5) return false;
    if (v === 4) return up === 5 || up === 6;
    return up <= 7; // 2s, 3s
  }
  function hard(t, up, tc) {
    if (has(tc)) {
      if (t === 16 && up === 10) return tc >= 0 ? 'S' : 'H';
      if (t === 15 && up === 10) return tc >= 4 ? 'S' : 'H';
      if (t === 16 && up === 9) return tc >= 5 ? 'S' : 'H';
      if (t === 10 && up === 10) return tc >= 4 ? 'D' : 'H';
      if (t === 10 && up === 11) return tc >= (R.h17 ? 3 : 4) ? 'D' : 'H';
      if (t === 11 && up === 11 && !R.h17) return tc >= 1 ? 'D' : 'H';
      if (t === 9 && up === 2) return tc >= 1 ? 'D' : 'H';
      if (t === 9 && up === 7) return tc >= 3 ? 'D' : 'H';
      if (t === 12 && up === 2) return tc >= 3 ? 'S' : 'H';
      if (t === 12 && up === 3) return tc >= 2 ? 'S' : 'H';
      if (t === 12 && up === 4) return tc < 0 ? 'H' : 'S';
      if (t === 12 && up === 5) return tc < -2 ? 'H' : 'S';
      if (t === 12 && up === 6) return tc < -1 ? 'H' : 'S';
      if (t === 13 && up === 2) return tc < -1 ? 'H' : 'S';
      if (t === 13 && up === 3) return tc < -2 ? 'H' : 'S';
    }
    if (t <= 8) return 'H';
    if (t === 9) return up >= 3 && up <= 6 ? 'D' : 'H';
    if (t === 10) return up <= 9 ? 'D' : 'H';
    if (t === 11) return up <= 10 || R.h17 ? 'D' : 'H';
    if (t === 12) return up >= 4 && up <= 6 ? 'S' : 'H';
    if (t <= 16) return up <= 6 ? 'S' : 'H';
    return 'S';
  }
  function soft(t, up) {
    if (t >= 20) return 'S';
    if (t === 19) return R.h17 && up === 6 ? 'Ds' : 'S';
    if (t === 18) return (up >= 3 && up <= 6) || (R.h17 && up === 2) ? 'Ds' : up <= 8 ? 'S' : 'H';
    if (t === 17) return up >= 3 && up <= 6 ? 'D' : 'H';
    if (t >= 15) return up >= 4 && up <= 6 ? 'D' : 'H';
    return up >= 5 && up <= 6 ? 'D' : 'H';
  }

  // Returns 'H' | 'S' | 'D' | 'P' | 'R'
  function play(cards, up, tc, o) {
    o = Object.assign({ canDouble: true, canSplit: true, canSurrender: true }, o || {});
    const canR = o.canSurrender && R.ls && cards.length === 2;
    const { total, soft: isSoft } = value(cards);
    const pair = isPair(cards), pv = pair ? rv(cards[0].r) : 0;
    if (canR && !isSoft && (!pair || pv === 8) && surrender(total, up, tc, pv === 8)) return 'R';
    if (pair && o.canSplit && split(pv, up, tc)) return 'P';
    let p = isSoft ? soft(total, up) : hard(total, up, tc);
    const canD = cards.length === 2 && o.canDouble;
    if (p === 'Ds') p = canD ? 'D' : 'S';
    if (p === 'D' && !canD) p = 'H';
    return p;
  }

  const NAMES = { H: 'Hit', S: 'Stand', D: 'Double', P: 'Split', R: 'Surrender' };
  const upName = (v) => (v === 11 ? 'A' : String(v));

  // ---- strategy "cells" for adaptive drilling and the mastery map ----
  // key: h8..h17 (h8 = 8 or less), s13..s20 (A2..A9), p2..p11 (pairs) + '-' + up
  const UPS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const ROWS = {
    hard: [17, 16, 15, 14, 13, 12, 11, 10, 9, 8].map((t) => 'h' + t),
    soft: [20, 19, 18, 17, 16, 15, 14, 13].map((t) => 's' + t),
    pairs: [11, 10, 9, 8, 7, 6, 5, 4, 3, 2].map((v) => 'p' + v)
  };
  const ALL_CELLS = [].concat(...Object.values(ROWS).map((rows) => [].concat(...rows.map((r) => UPS.map((u) => r + '-' + u)))));
  function cellCards(row) {
    const k = row[0], n = +row.slice(1);
    if (k === 'p') { const r = rankFor(n); return [card(r), card(n === 10 ? tenRank() : r)]; }
    if (k === 's') return [card('A'), card(String(n - 11))];
    // hard: two different non-ace cards totalling n (8 → anything 5..8)
    const t = n === 8 ? 5 + ((Math.random() * 4) | 0) : n;
    const opts = [];
    for (let a = 2; a <= 10; a++) { const b = t - a; if (b >= 2 && b <= 10 && a !== b) opts.push([a, b]); }
    const [a, b] = opts[(Math.random() * opts.length) | 0];
    return [card(rankFor(a)), card(rankFor(b))];
  }
  function rowLabel(row) {
    const k = row[0], n = +row.slice(1);
    if (k === 'p') return n === 11 ? 'A,A' : n === 10 ? 'T,T' : n + ',' + n;
    if (k === 's') return 'A,' + (n - 11);
    return n === 8 ? '≤8' : n === 17 ? '17+' : String(n);
  }
  function cellLabel(key) {
    const [row, up] = key.split('-'); const k = row[0], n = +row.slice(1);
    const h = k === 'p' ? `Pair of ${n === 11 ? 'Aces' : n === 10 ? 'tens' : n + 's'}` : k === 's' ? `Soft ${n} (A,${n - 11})` : n === 8 ? 'Hard 8 or less' : `Hard ${n}`;
    return `${h} vs ${upName(+up)}`;
  }
  function cellOf(cards, up) {
    if (cards.length !== 2) return null;
    const v = value(cards);
    if (isPair(cards)) return 'p' + rv(cards[0].r) + '-' + up;
    if (v.soft) return 's' + v.total + '-' + up;
    return 'h' + Math.max(8, Math.min(17, v.total)) + '-' + up;
  }

  // ---- explanations (rules of thumb) ----
  function why(cards, up, ans) {
    const v = value(cards), pair = isPair(cards), pv = pair ? rv(cards[0].r) : 0;
    if (ans === 'R') {
      if (pv === 8) return 'H17 with surrender: give up 8,8 against an Ace — the one time you don\'t split 8s.';
      return `Surrender 16 vs 9, 10, A and 15 vs 10${R.h17 ? ' — plus 15 and 17 vs A when the dealer hits soft 17' : ''}. Losing half beats losing about 75% of the time.`;
    }
    if (pair) {
      if (pv === 11) return 'Always split Aces. Two hands starting with 11 beat one soft 12.';
      if (pv === 8) return 'Always split 8s. 16 is the worst hand in blackjack; two hands of 8 are far better.';
      if (pv === 10) return ans === 'P' ? 'Split tens only on a high count: +4 or more vs 6, +5 or more vs 5.' : 'Never split tens off the top. 20 wins about 80% of the time (the count changes this only at +4 vs 6 and +5 vs 5).';
      if (pv === 9) return 'Split 9s against 2–9 except 7. Stand vs 7 (your 18 beats 17), 10 and A.';
      if (pv === 7) return 'Split 7s against 2–7, otherwise hit.';
      if (pv === 6) return 'Split 6s against 2–6 (dealer bust cards), otherwise hit.';
      if (pv === 4) return 'Split 4s only against 5 and 6 (with double after split), otherwise hit.';
      if (pv !== 5) return 'Split 2s and 3s against 2–7, otherwise hit.';
      return 'Never split 5s. Play them as a hard 10: double against 2–9.';
    }
    if (v.soft) {
      const t = v.total;
      if (t >= 20) return 'Always stand on soft 20.';
      if (t === 19) return R.h17 ? 'Soft 19: double vs 6 when the dealer hits soft 17 (stand if you can\'t double); stand otherwise.' : 'Always stand on soft 19.';
      if (t === 18) return `Soft 18: double vs ${R.h17 ? '2–6' : '3–6'} (stand if you can't double), stand vs ${R.h17 ? '7 and 8' : '2, 7 and 8'}, hit vs 9, 10, A.`;
      if (t === 17) return 'Soft 17: double vs 3–6, otherwise hit. Never stand on soft 17 — one card can\'t bust you.';
      if (t >= 15) return 'Soft 15–16 (A4, A5): double vs 4–6, otherwise hit.';
      return 'Soft 13–14 (A2, A3): double vs 5–6, otherwise hit.';
    }
    const t = v.total;
    if (t >= 17) return 'Always stand on hard 17 or more.' + (R.h17 && R.ls && up === 11 && t === 17 ? ' (Exception: surrender 17 vs A when the dealer hits soft 17.)' : '');
    if (t >= 13) return 'Stiff hands (13–16): stand vs 2–6 — the dealer\'s bust cards — and hit vs 7 or higher.';
    if (t === 12) return '12 is the exception: stand only vs 4, 5, 6. Hit vs 2 and 3 (they bust less often) and vs 7+.';
    if (t === 11) return R.h17 ? 'Always double 11 when the dealer hits soft 17.' : 'Double 11 vs 2–10, hit vs an Ace (dealer stands on soft 17).';
    if (t === 10) return 'Double 10 vs 2–9. Hit vs 10 and Ace.';
    if (t === 9) return 'Double 9 vs 3–6, otherwise hit.';
    return 'Always hit 8 or less — you can\'t bust.';
  }
  function tcNote(cards, up, tc, o) {
    if (!has(tc)) return '';
    const b = play(cards, up, null, o), d = play(cards, up, tc, o);
    return b !== d ? `Index play: at TC ${tc >= 0 ? '+' + tc : tc} the count overrides basic strategy (${NAMES[b]} → ${NAMES[d]}).` : '';
  }

  // ---- Illustrious 18 + Fab 4 ----
  const C = (...r) => r.map((x) => card(x));
  const DEVIATIONS = [
    { id: 'ins', name: 'Insurance', up: 11, idx: 3, insurance: true, hand: () => C('10', '7'), set: 'I18', rule: 'Take insurance at +3 or higher', act: 'Take insurance' },
    { id: '16v10', name: '16 vs 10', up: 10, idx: 0, hand: () => C('10', '6'), o: { canSurrender: false }, set: 'I18', rule: 'Stand at 0 or higher', act: 'Stand' },
    { id: '15v10', name: '15 vs 10', up: 10, idx: 4, hand: () => C('10', '5'), o: { canSurrender: false }, set: 'I18', rule: 'Stand at +4 or higher', act: 'Stand' },
    { id: 'TTv5', name: '10,10 vs 5', up: 5, idx: 5, hand: () => C('10', 'K'), set: 'I18', rule: 'Split at +5 or higher', act: 'Split' },
    { id: 'TTv6', name: '10,10 vs 6', up: 6, idx: 4, hand: () => C('Q', '10'), set: 'I18', rule: 'Split at +4 or higher', act: 'Split' },
    { id: '10v10', name: '10 vs 10', up: 10, idx: 4, hand: () => C('6', '4'), set: 'I18', rule: 'Double at +4 or higher', act: 'Double' },
    { id: '12v3', name: '12 vs 3', up: 3, idx: 2, hand: () => C('10', '2'), set: 'I18', rule: 'Stand at +2 or higher', act: 'Stand' },
    { id: '12v2', name: '12 vs 2', up: 2, idx: 3, hand: () => C('10', '2'), set: 'I18', rule: 'Stand at +3 or higher', act: 'Stand' },
    { id: '11vA', name: '11 vs A', up: 11, idx: 1, hand: () => C('6', '5'), set: 'I18', rule: 'Double at +1 or higher (S17 games)', act: 'Double', s17only: true },
    { id: '9v2', name: '9 vs 2', up: 2, idx: 1, hand: () => C('5', '4'), set: 'I18', rule: 'Double at +1 or higher', act: 'Double' },
    { id: '10vA', name: '10 vs A', up: 11, idx: 4, idxH17: 3, hand: () => C('7', '3'), set: 'I18', rule: 'Double at +4 or higher (+3 when the dealer hits soft 17)', act: 'Double' },
    { id: '9v7', name: '9 vs 7', up: 7, idx: 3, hand: () => C('6', '3'), set: 'I18', rule: 'Double at +3 or higher', act: 'Double' },
    { id: '16v9', name: '16 vs 9', up: 9, idx: 5, hand: () => C('10', '6'), o: { canSurrender: false }, set: 'I18', rule: 'Stand at +5 or higher', act: 'Stand' },
    { id: '13v2', name: '13 vs 2', up: 2, idx: -1, hand: () => C('10', '3'), set: 'I18', rule: 'Hit below −1', act: 'Hit', below: true },
    { id: '12v4', name: '12 vs 4', up: 4, idx: 0, hand: () => C('10', '2'), set: 'I18', rule: 'Hit below 0', act: 'Hit', below: true },
    { id: '12v5', name: '12 vs 5', up: 5, idx: -2, hand: () => C('10', '2'), set: 'I18', rule: 'Hit below −2', act: 'Hit', below: true },
    { id: '12v6', name: '12 vs 6', up: 6, idx: -1, hand: () => C('10', '2'), set: 'I18', rule: 'Hit below −1', act: 'Hit', below: true },
    { id: '13v3', name: '13 vs 3', up: 3, idx: -2, hand: () => C('10', '3'), set: 'I18', rule: 'Hit below −2', act: 'Hit', below: true },
    { id: '14v10R', name: '14 vs 10 (surrender)', up: 10, idx: 3, hand: () => C('10', '4'), set: 'Fab4', rule: 'Surrender at +3 or higher', act: 'Surrender' },
    { id: '15v10R', name: '15 vs 10 (surrender)', up: 10, idx: 0, hand: () => C('10', '5'), set: 'Fab4', rule: 'Surrender at 0 or higher', act: 'Surrender' },
    { id: '15v9R', name: '15 vs 9 (surrender)', up: 9, idx: 2, hand: () => C('10', '5'), set: 'Fab4', rule: 'Surrender at +2 or higher', act: 'Surrender' },
    { id: '15vAR', name: '15 vs A (surrender)', up: 11, idx: 1, hand: () => C('10', '5'), set: 'Fab4', rule: 'Surrender at +1 or higher (S17 games)', act: 'Surrender', s17only: true }
  ];
  const devIdx = (d) => (R.h17 && d.idxH17 !== undefined ? d.idxH17 : d.idx);
  const activeDevs = () => DEVIATIONS.filter((d) => !(d.s17only && R.h17) && !(d.set === 'Fab4' && !R.ls));

  // Bet ramp (units), 1–12 spread.
  const ramp = (tc) => (tc <= 1 ? 1 : tc === 2 ? 2 : tc === 3 ? 4 : tc === 4 ? 8 : 12);
  const trueCount = (rc, decks) => Math.floor(rc / decks);

  window.BJ = {
    RANKS, SUITS, UPS, ROWS, ALL_CELLS, rv, hilo, card, rankFor, shoe, value, isBJ, isPair, play, NAMES, upName,
    cellCards, cellLabel, rowLabel, cellOf, why, tcNote, DEVIATIONS, activeDevs, devIdx, ramp, trueCount,
    setRules: (r) => { R = Object.assign({}, R, r); }, rules: () => Object.assign({}, R)
  };
})();
