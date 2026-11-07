// Blackjack engine: cards, hand values, Hi-Lo, rules-aware basic strategy and index plays.
// Games: shoe (4–8 decks) and double deck. Rules: dealer hits/stands soft 17, DAS, late surrender on/off.
// Shoe charts are the published multi-deck charts. Double-deck charts were computed with an exact
// expected-value engine (validated by reproducing the published 6-deck charts cell for cell).
// Index numbers: published Illustrious 18 / Fab 4 (6-deck S17), shifted for H17 and double deck by
// the same engine's computed change in each crossing point.
(function () {
  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const SUITS = ['♠', '♥', '♦', '♣'];
  let R = { h17: true, ls: true, decks: 6 }; // table rules

  const rv = (r) => (r === 'A' ? 11 : r === '10' || r === 'J' || r === 'Q' || r === 'K' ? 10 : +r);
  const hilo = (r) => { const v = rv(r); return v <= 6 ? 1 : v >= 10 ? -1 : 0; };
  const card = (r, s) => ({ r, s: s || SUITS[(Math.random() * 4) | 0] });
  const tenRank = () => ['10', 'J', 'Q', 'K'][(Math.random() * 4) | 0];
  const rankFor = (v) => (v === 11 ? 'A' : v === 10 ? tenRank() : String(v));
  const DD = () => R.decks <= 2;

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

  // ---------------- shoe (4–8 deck) basic strategy ----------------
  const shoeSur = (total, up, pair8) => (pair8 ? R.h17 && up === 11 : (total === 16 && up >= 9) || (total === 15 && up === 10) || (R.h17 && up === 11 && (total === 15 || total === 17)));
  function shoeSplit(v, up) {
    if (v === 11 || v === 8) return true;
    if (v === 10 || v === 5) return false;
    if (v === 9) return (up >= 2 && up <= 6) || up === 8 || up === 9;
    if (v === 7) return up <= 7;
    if (v === 6) return up <= 6;
    if (v === 4) return up === 5 || up === 6;
    return up <= 7; // 2s, 3s
  }
  function shoeHard(t, up) {
    if (t <= 8) return 'H';
    if (t === 9) return up >= 3 && up <= 6 ? 'D' : 'H';
    if (t === 10) return up <= 9 ? 'D' : 'H';
    if (t === 11) return up <= 10 || R.h17 ? 'D' : 'H';
    if (t === 12) return up >= 4 && up <= 6 ? 'S' : 'H';
    if (t <= 16) return up <= 6 ? 'S' : 'H';
    return 'S';
  }
  function shoeSoft(t, up) {
    if (t >= 20) return 'S';
    if (t === 19) return R.h17 && up === 6 ? 'Ds' : 'S';
    if (t === 18) return (up >= 3 && up <= 6) || (R.h17 && up === 2) ? 'Ds' : up <= 8 ? 'S' : 'H';
    if (t === 17) return up >= 3 && up <= 6 ? 'D' : 'H';
    if (t >= 15) return up >= 4 && up <= 6 ? 'D' : 'H';
    if (t >= 13) return up >= 5 && up <= 6 ? 'D' : 'H';
    return 'H';
  }

  // ---------------- double-deck basic strategy (computed) ----------------
  // columns: dealer 2,3,4,5,6,7,8,9,T,A. Codes: H S D(double/else hit) d(double/else stand) P R(surrender/else hit) r(surrender/else stand)
  const DDC = {
    h17: { h17: 'SSSSSSSSSr', h16: 'SSSSSHHHRR', h15: 'SSSSSHHHRR', h14: 'SSSSSHHHHH', h13: 'SSSSSHHHHH', h12: 'HHSSSHHHHH', h11: 'DDDDDDDDDD', h10: 'DDDDDDDDHH', h9: 'DDDDDHHHHH', h8: 'HHHHHHHHHH',
      s20: 'SSSSSSSSSS', s19: 'SSSSdSSSSS', s18: 'dddddSSHHH', s17: 'HDDDDHHHHH', s16: 'HHDDDHHHHH', s15: 'HHDDDHHHHH', s14: 'HHDDDHHHHH', s13: 'HHHDDHHHHH',
      p11: 'PPPPPPPPPP', p10: 'SSSSSSSSSS', p9: 'PPPPPSPPSS', p8: 'PPPPPPPPPP', p7: 'PPPPPPPHHH', p6: 'PPPPPPHHHH', p5: 'DDDDDDDDHH', p4: 'HHHPPHHHHH', p3: 'PPPPPPHHHH', p2: 'PPPPPPHHHH' },
    s17: { h17: 'SSSSSSSSSS', h16: 'SSSSSHHHRR', h15: 'SSSSSHHHRH', h14: 'SSSSSHHHHH', h13: 'SSSSSHHHHH', h12: 'HHSSSHHHHH', h11: 'DDDDDDDDDH', h10: 'DDDDDDDDHH', h9: 'DDDDDHHHHH', h8: 'HHHHHHHHHH',
      s20: 'SSSSSSSSSS', s19: 'SSSSSSSSSS', s18: 'SddddSSHHH', s17: 'HDDDDHHHHH', s16: 'HHDDDHHHHH', s15: 'HHDDDHHHHH', s14: 'HHHDDHHHHH', s13: 'HHHDDHHHHH',
      p11: 'PPPPPPPPPP', p10: 'SSSSSSSSSS', p9: 'PPPPPSPPSS', p8: 'PPPPPPPPPP', p7: 'PPPPPPPHHH', p6: 'PPPPPPHHHH', p5: 'DDDDDDDDHH', p4: 'HHHPPHHHHH', p3: 'PPPPPPHHHH', p2: 'PPPPPPHHHH' }
  };
  const col = (up) => (up === 11 ? 9 : up - 2);
  const ddCode = (row, up) => { const t = DDC[R.h17 ? 'h17' : 's17'][row]; return t ? t[col(up)] : null; };
  const ddHardRow = (t) => 'h' + Math.max(8, Math.min(17, t));

  // ---------------- basic strategy dispatch ----------------
  function basicSur(total, up, pv) {
    if (DD()) { if (total < 14 || total > 17) return false; const c = ddCode(pv ? 'p' + pv : 'h' + total, up); return c === 'R' || c === 'r'; }
    return shoeSur(total, up, pv === 8);
  }
  function basicSplit(pv, up) { return DD() ? ddCode('p' + pv, up) === 'P' : shoeSplit(pv, up); }
  function basicTotal(t, soft, up) { // H S D Ds
    if (!DD()) return soft ? shoeSoft(t, up) : shoeHard(t, up);
    if (soft) { if (t >= 20 || t === 21) return 'S'; if (t <= 12) return 'H'; const c = ddCode('s' + t, up); return c === 'd' ? 'Ds' : c; }
    if (t >= 18) return 'S';
    const c = ddCode(ddHardRow(t), up);
    return c === 'R' ? 'H' : c === 'r' ? 'S' : c === 'd' ? 'Ds' : c;
  }

  // ---------------- index plays ----------------
  // [shoe S17, shoe H17, double-deck S17, double-deck H17]
  const IDX = {
    ins: [3, 3, 3, 3], '16v10': [0, 0, 0, 0], '15v10': [4, 4, 4, 4], TTv5: [5, 5, 5, 5], TTv6: [4, 4, 4, 3], '10v10': [4, 4, 4, 4],
    '12v3': [2, 2, 2, 2], '12v2': [3, 3, 3, 3], '11vA': [1, -1, 1, -1], '9v2': [1, 1, 1, 1], '10vA': [4, 3, 3, 3], '9v7': [3, 3, 3, 3],
    '16v9': [5, 5, 5, 5], '13v2': [-1, -1, -1, -1], '12v4': [0, 0, 0, 0], '12v5': [-2, -2, -2, -2], '12v6': [-1, -4, -1, -3], '13v3': [-2, -2, -2, -2],
    '14v10R': [3, 3, 3, 3], '15v10R': [0, 0, 0, 0], '15v9R': [2, 2, 2, 2], '15vAR': [1, -1, 1, -1]
  };
  const gi = () => (DD() ? 2 : 0) + (R.h17 ? 1 : 0);
  const C = (...r) => r.map((x) => card(x));
  // kind: hard (t) — hi/lo play by count · pair (v) — split or not · sur (t) — surrender or not · ins
  const DEVIATIONS = [
    { id: 'ins', name: 'Insurance', up: 11, kind: 'ins', insurance: true, hand: () => C('10', '7'), set: 'I18', hi: 'Y', lo: 'N' },
    { id: '16v10', name: '16 vs 10', up: 10, kind: 'hard', t: 16, hi: 'S', lo: 'H', hand: () => C('10', '6'), o: { canSurrender: false }, set: 'I18' },
    { id: '15v10', name: '15 vs 10', up: 10, kind: 'hard', t: 15, hi: 'S', lo: 'H', hand: () => C('10', '5'), o: { canSurrender: false }, set: 'I18' },
    { id: 'TTv5', name: '10,10 vs 5', up: 5, kind: 'pair', v: 10, hi: 'P', lo: 'S', hand: () => C('10', 'K'), set: 'I18' },
    { id: 'TTv6', name: '10,10 vs 6', up: 6, kind: 'pair', v: 10, hi: 'P', lo: 'S', hand: () => C('Q', '10'), set: 'I18' },
    { id: '10v10', name: '10 vs 10', up: 10, kind: 'hard', t: 10, hi: 'D', lo: 'H', hand: () => C('6', '4'), set: 'I18' },
    { id: '12v3', name: '12 vs 3', up: 3, kind: 'hard', t: 12, hi: 'S', lo: 'H', hand: () => C('10', '2'), set: 'I18' },
    { id: '12v2', name: '12 vs 2', up: 2, kind: 'hard', t: 12, hi: 'S', lo: 'H', hand: () => C('10', '2'), set: 'I18' },
    { id: '11vA', name: '11 vs A', up: 11, kind: 'hard', t: 11, hi: 'D', lo: 'H', hand: () => C('6', '5'), set: 'I18' },
    { id: '9v2', name: '9 vs 2', up: 2, kind: 'hard', t: 9, hi: 'D', lo: 'H', hand: () => C('5', '4'), set: 'I18' },
    { id: '10vA', name: '10 vs A', up: 11, kind: 'hard', t: 10, hi: 'D', lo: 'H', hand: () => C('7', '3'), set: 'I18' },
    { id: '9v7', name: '9 vs 7', up: 7, kind: 'hard', t: 9, hi: 'D', lo: 'H', hand: () => C('6', '3'), set: 'I18' },
    { id: '16v9', name: '16 vs 9', up: 9, kind: 'hard', t: 16, hi: 'S', lo: 'H', hand: () => C('10', '6'), o: { canSurrender: false }, set: 'I18' },
    { id: '13v2', name: '13 vs 2', up: 2, kind: 'hard', t: 13, hi: 'S', lo: 'H', hand: () => C('10', '3'), set: 'I18' },
    { id: '12v4', name: '12 vs 4', up: 4, kind: 'hard', t: 12, hi: 'S', lo: 'H', hand: () => C('10', '2'), set: 'I18' },
    { id: '12v5', name: '12 vs 5', up: 5, kind: 'hard', t: 12, hi: 'S', lo: 'H', hand: () => C('10', '2'), set: 'I18' },
    { id: '12v6', name: '12 vs 6', up: 6, kind: 'hard', t: 12, hi: 'S', lo: 'H', hand: () => C('10', '2'), set: 'I18' },
    { id: '13v3', name: '13 vs 3', up: 3, kind: 'hard', t: 13, hi: 'S', lo: 'H', hand: () => C('10', '3'), set: 'I18' },
    { id: '14v10R', name: '14 vs 10 (surrender)', up: 10, kind: 'sur', t: 14, hi: 'R', lo: 'H', hand: () => C('10', '4'), set: 'Fab4' },
    { id: '15v10R', name: '15 vs 10 (surrender)', up: 10, kind: 'sur', t: 15, hi: 'R', lo: 'H', hand: () => C('10', '5'), set: 'Fab4' },
    { id: '15v9R', name: '15 vs 9 (surrender)', up: 9, kind: 'sur', t: 15, hi: 'R', lo: 'H', hand: () => C('10', '5'), set: 'Fab4' },
    { id: '15vAR', name: '15 vs A (surrender)', up: 11, kind: 'sur', t: 15, hi: 'R', lo: 'H', hand: () => C('10', '5'), set: 'Fab4' }
  ];
  const devIdx = (d) => IDX[d.id][gi()];
  const activeDevs = () => DEVIATIONS.filter((d) => !(d.set === 'Fab4' && !R.ls));
  const findDev = (kind, t, up) => DEVIATIONS.find((d) => d.kind === kind && (kind === 'pair' ? d.v === t : d.t === t) && d.up === up);
  const NM = { H: 'Hit', S: 'Stand', D: 'Double', P: 'Split', R: 'Surrender', Y: 'Take insurance', N: 'No insurance' };
  const sg = (n) => (n > 0 ? '+' + n : n < 0 ? '−' + Math.abs(n) : '0');
  function devRule(d) {
    const i = devIdx(d);
    if (d.insurance) return `Take insurance at ${sg(i)} or higher`;
    return `${NM[d.hi]} at ${sg(i)} or higher, otherwise ${d.kind === 'pair' ? 'stand' : d.kind === 'sur' ? 'play it out' : NM[d.lo].toLowerCase()}`;
  }

  // Returns 'H' | 'S' | 'D' | 'P' | 'R'. tc === null → basic strategy only.
  function play(cards, up, tc, o) {
    o = Object.assign({ canDouble: true, canSplit: true, canSurrender: true }, o || {});
    const canR = o.canSurrender && R.ls && cards.length === 2;
    const { total, soft } = value(cards);
    const pair = isPair(cards), pv = pair ? rv(cards[0].r) : 0;
    if (canR && !soft && (!pair || pv === 8)) {
      let sur = basicSur(total, up, pv);
      if (has(tc) && !pair) { const d = findDev('sur', total, up); if (d) sur = tc >= devIdx(d); }
      if (sur) return 'R';
    }
    if (pair && o.canSplit) {
      let sp = basicSplit(pv, up);
      if (has(tc)) { const d = findDev('pair', pv, up); if (d) sp = tc >= devIdx(d); }
      if (sp) return 'P';
    }
    const canD = cards.length === 2 && o.canDouble;
    let p = basicTotal(total, soft, up);
    if (has(tc) && !soft) { const d = findDev('hard', total, up); if (d) p = tc >= devIdx(d) ? d.hi : d.lo; }
    if (p === 'Ds') p = canD ? 'D' : 'S';
    if (p === 'D' && !canD) p = 'H';
    return p;
  }

  const NAMES = { H: 'Hit', S: 'Stand', D: 'Double', P: 'Split', R: 'Surrender' };
  const upName = (v) => (v === 11 ? 'A' : String(v));

  // ---------------- strategy cells (adaptive drilling, mastery map) ----------------
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
  // chart display code for a cell: H S D Ds P R
  function chartCode(row, up) {
    const k = row[0], n = +row.slice(1);
    if (k === 'p') { const cards = [card(rankFor(n)), card(rankFor(n))]; return play(cards, up, null); }
    const cards = cellCards(row), p = play(cards, up, null);
    if (p === 'D') { const nd = play(cards, up, null, { canDouble: false }); return nd === 'S' ? 'Ds' : 'D'; }
    return p;
  }

  // ---------------- explanations ----------------
  function why(cards, up, ans) {
    const v = value(cards), pair = isPair(cards), pv = pair ? rv(cards[0].r) : 0, dd = DD();
    const t = v.total;
    if (ans === 'R') {
      if (pv === 8) return 'H17 shoe game with surrender: give up 8,8 against an Ace — the one time you don\'t split 8s.';
      if (dd) return `Double deck: surrender 16 vs 10 and A, 15 vs 10${R.h17 ? ', and 15 and 17 vs A' : ''}. (16 vs 9 is a hit in double deck.)`;
      return `Surrender 16 vs 9, 10, A and 15 vs 10${R.h17 ? ' — plus 15 and 17 vs A when the dealer hits soft 17' : ''}. Losing half beats losing about 75% of the time.`;
    }
    if (pair) {
      if (pv === 11) return 'Always split Aces. Two hands starting with 11 beat one soft 12.';
      if (pv === 8) return dd && R.h17 && up === 11 ? 'Double deck: split 8s even against an Ace (it edges out surrender).' : 'Always split 8s. 16 is the worst hand in blackjack; two hands of 8 are far better.';
      if (pv === 10) return ans === 'P' ? 'Split tens only on a high count (see index plays).' : 'Never split tens off the top. 20 wins about 80% of the time.';
      if (pv === 9) return 'Split 9s against 2–9 except 7. Stand vs 7 (your 18 beats 17), 10 and A.';
      if (pv === 7) return dd ? 'Double deck: split 7s against 2–8, otherwise hit.' : 'Split 7s against 2–7, otherwise hit.';
      if (pv === 6) return dd ? 'Double deck: split 6s against 2–7, otherwise hit.' : 'Split 6s against 2–6 (dealer bust cards), otherwise hit.';
      if (pv === 4) return 'Split 4s only against 5 and 6 (with double after split), otherwise hit.';
      if (pv !== 5) return 'Split 2s and 3s against 2–7, otherwise hit.';
      return 'Never split 5s. Play them as a hard 10: double against 2–9.';
    }
    if (v.soft) {
      if (t >= 20) return 'Always stand on soft 20.';
      if (t === 19) return R.h17 ? 'Soft 19: double vs 6 when the dealer hits soft 17 (stand if you can\'t double); stand otherwise.' : 'Always stand on soft 19.';
      if (t === 18) return `Soft 18: double vs ${R.h17 ? '2–6' : '3–6'} (stand if you can't double), stand vs ${R.h17 ? '7 and 8' : '2, 7 and 8'}, hit vs 9, 10, A.`;
      if (t === 17) return 'Soft 17: double vs 3–6, otherwise hit. Never stand on soft 17 — one card can\'t bust you.';
      if (t >= 15) return 'Soft 15–16 (A4, A5): double vs 4–6, otherwise hit.';
      if (t === 14 && dd && R.h17) return 'Double deck H17: A3 doubles vs 4–6, otherwise hit.';
      return 'Soft 13–14 (A2, A3): double vs 5–6, otherwise hit.';
    }
    if (t >= 17) return 'Always stand on hard 17 or more.' + (R.h17 && R.ls && up === 11 && t === 17 ? ' (Exception: surrender 17 vs A when the dealer hits soft 17.)' : '');
    if (t === 16 && up === 9 && dd) return 'Double deck: hit 16 vs 9 (no surrender) — stand only at a true count of +5 or more.';
    if (t >= 13) return 'Stiff hands (13–16): stand vs 2–6 — the dealer\'s bust cards — and hit vs 7 or higher.';
    if (t === 12) return '12 is the exception: stand only vs 4, 5, 6. Hit vs 2 and 3 (they bust less often) and vs 7+.';
    if (t === 11) return R.h17 ? 'Always double 11 when the dealer hits soft 17.' : 'Double 11 vs 2–10, hit vs an Ace (dealer stands on soft 17).';
    if (t === 10) return 'Double 10 vs 2–9. Hit vs 10 and Ace.';
    if (t === 9) return dd ? 'Double deck: double 9 vs 2–6, otherwise hit.' : 'Double 9 vs 3–6, otherwise hit.';
    return 'Always hit 8 or less — you can\'t bust.';
  }
  function tcNote(cards, up, tc, o) {
    if (!has(tc)) return '';
    const b = play(cards, up, null, o), d = play(cards, up, tc, o);
    return b !== d ? `Index play: at TC ${sg(tc)} the count overrides basic strategy (${NAMES[b]} → ${NAMES[d]}).` : '';
  }

  // ---------------- betting ----------------
  const RAMPS = { shoe: [[1, 1], [2, 2], [3, 4], [4, 8], [5, 12]], dd: [[0, 1], [1, 2], [2, 4], [3, 6], [4, 8]] };
  function ramp(tc) { const r = RAMPS[DD() ? 'dd' : 'shoe']; let u = r[0][1]; for (const [t, b] of r) if (tc >= t) u = b; return u; }
  const rampSteps = () => RAMPS[DD() ? 'dd' : 'shoe'].map((x) => x[1]);
  const rampText = () => (DD() ? '≤0 → 1 · +1 → 2 · +2 → 4 · +3 → 6 · +4 → 8 units' : '≤+1 → 1 · +2 → 2 · +3 → 4 · +4 → 8 · +5 → 12 units');
  const trueCount = (rc, decks) => Math.floor(rc / decks);
  const rulesLabel = () => `${DD() ? 'Double deck' : `${R.decks}-deck shoe`} · ${R.h17 ? 'H17' : 'S17'} · DAS · ${R.ls ? 'late surrender' : 'no surrender'}`;

  window.BJ = {
    RANKS, SUITS, UPS, ROWS, ALL_CELLS, rv, hilo, card, rankFor, shoe, value, isBJ, isPair, play, NAMES, upName,
    cellCards, cellLabel, rowLabel, cellOf, chartCode, why, tcNote, DEVIATIONS, activeDevs, devIdx, devRule, IDX,
    ramp, rampSteps, rampText, trueCount, rulesLabel, isDD: DD,
    setRules: (r) => { R = Object.assign({}, R, r); }, rules: () => Object.assign({}, R)
  };
})();
