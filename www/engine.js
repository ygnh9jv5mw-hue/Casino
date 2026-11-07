// Blackjack engine: cards, hand values, Hi-Lo, basic strategy (6 decks, S17, DAS, late surrender)
// and the Illustrious 18 + Fab 4 index plays.
(function () {
  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const SUITS = ['♠', '♥', '♦', '♣'];

  const rv = (r) => (r === 'A' ? 11 : ['10', 'J', 'Q', 'K'].includes(r) ? 10 : +r); // rank value
  const hilo = (r) => { const v = rv(r); return v <= 6 ? 1 : v >= 10 ? -1 : 0; };
  const card = (r, s) => ({ r, s: s || SUITS[(Math.random() * 4) | 0] });

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

  // tc === null means basic strategy only.
  function surrender(total, up, tc) {
    const basic = (total === 16 && up >= 9) || (total === 15 && up === 10);
    if (tc === null || tc === undefined) return basic;
    if (total === 15 && up === 10) return tc >= 0;
    if (total === 14 && up === 10) return tc >= 3;
    if (total === 15 && up === 9) return tc >= 2;
    if (total === 15 && up === 11) return tc >= 1;
    return basic;
  }

  function split(v, up, tc) {
    if (v === 11 || v === 8) return true;
    if (v === 10) {
      if (tc === null || tc === undefined) return false;
      if (up === 5) return tc >= 5;
      if (up === 6) return tc >= 4;
      return false;
    }
    if (v === 9) return (up >= 2 && up <= 6) || up === 8 || up === 9;
    if (v === 7) return up <= 7;
    if (v === 6) return up <= 6;
    if (v === 5) return false;
    if (v === 4) return up === 5 || up === 6;
    return up <= 7; // 2s and 3s
  }

  function hard(t, up, tc) {
    const dev = tc !== null && tc !== undefined;
    if (dev) {
      if (t === 16 && up === 10) return tc >= 0 ? 'S' : 'H';
      if (t === 15 && up === 10) return tc >= 4 ? 'S' : 'H';
      if (t === 16 && up === 9) return tc >= 5 ? 'S' : 'H';
      if (t === 10 && up === 10) return tc >= 4 ? 'D' : 'H';
      if (t === 10 && up === 11) return tc >= 4 ? 'D' : 'H';
      if (t === 11 && up === 11) return tc >= 1 ? 'D' : 'H';
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
    if (t === 11) return up <= 10 ? 'D' : 'H';
    if (t === 12) return up >= 4 && up <= 6 ? 'S' : 'H';
    if (t <= 16) return up <= 6 ? 'S' : 'H';
    return 'S';
  }

  function soft(t, up) {
    if (t >= 19) return 'S';
    if (t === 18) return up >= 3 && up <= 6 ? 'Ds' : up <= 8 ? 'S' : 'H';
    if (t === 17) return up >= 3 && up <= 6 ? 'D' : 'H';
    if (t >= 15) return up >= 4 && up <= 6 ? 'D' : 'H';
    return up >= 5 && up <= 6 ? 'D' : 'H'; // soft 13, 14
  }

  // Returns 'H' | 'S' | 'D' | 'P' | 'R'
  function play(cards, up, tc, o) {
    o = Object.assign({ canDouble: true, canSplit: true, canSurrender: true }, o || {});
    const { total, soft: isSoft } = value(cards);
    const two = cards.length === 2;
    const pair = two && rv(cards[0].r) === rv(cards[1].r);
    if (o.canSurrender && two && !isSoft && !(pair && rv(cards[0].r) === 8) && surrender(total, up, tc)) return 'R';
    if (pair && o.canSplit && split(rv(cards[0].r), up, tc)) return 'P';
    let p = isSoft ? soft(total, up) : hard(total, up, tc);
    const canD = two && o.canDouble;
    if (p === 'Ds') p = canD ? 'D' : 'S';
    if (p === 'D' && !canD) p = 'H';
    return p;
  }

  const NAMES = { H: 'Hit', S: 'Stand', D: 'Double', P: 'Split', R: 'Surrender' };

  // Index plays for the deviations trainer. hand: cards to show; o: rules for that spot.
  const C = (...r) => r.map((x) => card(x));
  const DEVIATIONS = [
    { name: 'Insurance', up: 11, idx: 3, insurance: true, hand: () => C('10', '7'), set: 'I18', rule: 'Take insurance at +3 or higher' },
    { name: '16 vs 10', up: 10, idx: 0, hand: () => C('10', '6'), o: { canSurrender: false }, set: 'I18', rule: 'Stand at 0 or higher' },
    { name: '15 vs 10', up: 10, idx: 4, hand: () => C('10', '5'), o: { canSurrender: false }, set: 'I18', rule: 'Stand at +4 or higher' },
    { name: '10,10 vs 5', up: 5, idx: 5, hand: () => C('10', 'K'), set: 'I18', rule: 'Split at +5 or higher' },
    { name: '10,10 vs 6', up: 6, idx: 4, hand: () => C('Q', '10'), set: 'I18', rule: 'Split at +4 or higher' },
    { name: '10 vs 10', up: 10, idx: 4, hand: () => C('6', '4'), set: 'I18', rule: 'Double at +4 or higher' },
    { name: '12 vs 3', up: 3, idx: 2, hand: () => C('10', '2'), set: 'I18', rule: 'Stand at +2 or higher' },
    { name: '12 vs 2', up: 2, idx: 3, hand: () => C('10', '2'), set: 'I18', rule: 'Stand at +3 or higher' },
    { name: '11 vs A', up: 11, idx: 1, hand: () => C('6', '5'), set: 'I18', rule: 'Double at +1 or higher' },
    { name: '9 vs 2', up: 2, idx: 1, hand: () => C('5', '4'), set: 'I18', rule: 'Double at +1 or higher' },
    { name: '10 vs A', up: 11, idx: 4, hand: () => C('7', '3'), set: 'I18', rule: 'Double at +4 or higher' },
    { name: '9 vs 7', up: 7, idx: 3, hand: () => C('6', '3'), set: 'I18', rule: 'Double at +3 or higher' },
    { name: '16 vs 9', up: 9, idx: 5, hand: () => C('10', '6'), o: { canSurrender: false }, set: 'I18', rule: 'Stand at +5 or higher' },
    { name: '13 vs 2', up: 2, idx: -1, hand: () => C('10', '3'), set: 'I18', rule: 'Hit below −1' },
    { name: '12 vs 4', up: 4, idx: 0, hand: () => C('10', '2'), set: 'I18', rule: 'Hit below 0' },
    { name: '12 vs 5', up: 5, idx: -2, hand: () => C('10', '2'), set: 'I18', rule: 'Hit below −2' },
    { name: '12 vs 6', up: 6, idx: -1, hand: () => C('10', '2'), set: 'I18', rule: 'Hit below −1' },
    { name: '13 vs 3', up: 3, idx: -2, hand: () => C('10', '3'), set: 'I18', rule: 'Hit below −2' },
    { name: '14 vs 10 (surrender)', up: 10, idx: 3, hand: () => C('10', '4'), set: 'Fab4', rule: 'Surrender at +3 or higher' },
    { name: '15 vs 10 (surrender)', up: 10, idx: 0, hand: () => C('10', '5'), set: 'Fab4', rule: 'Surrender at 0 or higher' },
    { name: '15 vs 9 (surrender)', up: 9, idx: 2, hand: () => C('10', '5'), set: 'Fab4', rule: 'Surrender at +2 or higher' },
    { name: '15 vs A (surrender)', up: 11, idx: 1, hand: () => C('10', '5'), set: 'Fab4', rule: 'Surrender at +1 or higher' }
  ];

  // Bet ramp (units) for a 6-deck game, 1-12 spread.
  const ramp = (tc) => (tc <= 1 ? 1 : tc === 2 ? 2 : tc === 3 ? 4 : tc === 4 ? 8 : 12);

  window.BJ = { RANKS, SUITS, rv, hilo, card, shoe, value, isBJ, play, NAMES, DEVIATIONS, ramp };
})();
