// Engine tests v3: shoe charts (published), double-deck charts (computed), index layer.
global.window = {}; require(__dirname + '/../../www/js/engine.js'); const B = window.BJ;
const fs = require('fs');
const c = (...r) => r.map((x) => B.card(x)); let fails = 0;
const T = (cards, up, tc, o, want, label) => { const g = B.play(c(...cards), up, tc, o); if (g !== want) { console.log('FAIL', label || '', B.rules(), cards, up, tc, o, g, 'want', want); fails++; } };
const SH17 = {
  h17:'SSSSSSSSSR', h16:'SSSSSHHRRR', h15:'SSSSSHHHRR', h14:'SSSSSHHHHH', h13:'SSSSSHHHHH', h12:'HHSSSHHHHH', h11:'DDDDDDDDDD', h10:'DDDDDDDDHH', h9:'HDDDDHHHHH', h8:'HHHHHHHHHH',
  s20:'SSSSSSSSSS', s19:'SSSSDSSSSS', s18:'DDDDDSSHHH', s17:'HDDDDHHHHH', s16:'HHDDDHHHHH', s15:'HHDDDHHHHH', s14:'HHHDDHHHHH', s13:'HHHDDHHHHH',
  p11:'PPPPPPPPPP', p10:'SSSSSSSSSS', p9:'PPPPPSPPSS', p8:'PPPPPPPPPR', p7:'PPPPPPHHHH', p6:'PPPPPHHHHH', p5:'DDDDDDDDHH', p4:'HHHPPHHHHH', p3:'PPPPPPHHHH', p2:'PPPPPPHHHH' };
const SS17 = Object.assign({}, SH17, { h17:'SSSSSSSSSS', h15:'SSSSSHHHRH', h11:'DDDDDDDDDH', s19:'SSSSSSSSSS', s18:'SDDDDSSHHH', p8:'PPPPPPPPPP' });
// double-deck expectations straight from the calculator output files (top action with surrender allowed)
const UPR = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
const SP = __dirname + '/';
const fromCalc = (f, key) => { const j = JSON.parse(fs.readFileSync(SP + f)); const o = {}; for (const r of Object.keys(SH17)) o[r] = UPR.map((u) => j[r + '-' + u][key]).join(''); return o; };
const runs = [
  [{ decks: 6, h17: true, ls: true }, SH17], [{ decks: 6, h17: false, ls: true }, SS17],
  [{ decks: 2, h17: true, ls: true }, fromCalc('c2h17.json', 'top')], [{ decks: 2, h17: false, ls: true }, fromCalc('c2s17.json', 'top')],
  [{ decks: 2, h17: true, ls: false }, fromCalc('c2h17.json', 'noR')], [{ decks: 2, h17: false, ls: false }, fromCalc('c2s17.json', 'noR')]
];
for (const [rules, chart] of runs) {
  B.setRules(rules); let n = 0;
  for (const row in chart) for (let i = 0; i < 10; i++) {
    const up = B.UPS[i], want = chart[row][i];
    for (let k = 0; k < 6; k++) { const cards = B.cellCards(row); const g = B.play(cards, up, null); n++; if (g !== want) { console.log('CHART FAIL', rules, row, up, cards.map((x) => x.r).join(','), g, 'want', want); fails++; break; } }
  }
  // no-double fallbacks for double-deck (3-card hands use the row's no-double play)
  console.log('chart ok', JSON.stringify(rules), n, 'checks');
}
// double-deck no-double fallbacks vs calculator
for (const [f, h17] of [['c2h17.json', true], ['c2s17.json', false]]) {
  B.setRules({ decks: 2, h17, ls: true }); const j = JSON.parse(fs.readFileSync(SP + f));
  for (const r of ['s18', 's19', 's17', 'h11', 'h10', 'h9']) for (let i = 0; i < 10; i++) {
    const x = j[r + '-' + UPR[i]]; if (x.top !== 'D') continue;
    const g = B.play(B.cellCards(r), B.UPS[i], null, { canDouble: false }); if (g !== x.noD) { console.log('NO-DOUBLE FAIL', h17, r, B.UPS[i], g, 'want', x.noD); fails++; }
  }
}
// index layer
const flips = (rules) => { B.setRules(rules); for (const d of B.activeDevs()) { if (d.insurance) continue;
  const o = Object.assign({ canSurrender: d.kind === 'sur' }, d.o || {}), i = B.devIdx(d);
  const a = B.play(d.hand(), d.up, i, o), b = B.play(d.hand(), d.up, i - 1, o);
  if (a !== d.hi || b !== d.lo) { console.log('INDEX FAIL', JSON.stringify(rules), d.id, 'at', i, a, 'below', b, 'want', d.hi, d.lo); fails++; } } };
for (const decks of [6, 2]) for (const h17 of [true, false]) flips({ decks, h17, ls: true });
B.setRules({ decks: 6, h17: false, ls: true });
T(['10','6'],10,0,{canSurrender:false},'S'); T(['10','6'],10,-1,{canSurrender:false},'H'); T(['10','6'],10,5,{},'R'); T(['10','5'],10,-1,{},'H'); T(['10','5'],10,0,{},'R');
T(['3','4','5'],3,2,{},'S','3-card 12 v 3 at +2'); T(['2','4','4'],10,4,{},'H','3-card 10 v 10 cannot double');
B.setRules({ decks: 6, h17: true, ls: true }); T(['10','2'],6,-4,{},'S'); T(['10','2'],6,-5,{},'H'); T(['6','5'],11,-1,{},'D'); T(['6','5'],11,-2,{},'H'); T(['10','5'],11,-1,{},'R'); T(['10','5'],11,-2,{},'H');
B.setRules({ decks: 2, h17: true, ls: true }); T(['5','4'],2,null,{},'D'); T(['5','4'],2,0,{},'H'); T(['5','4'],2,1,{},'D'); T(['6','6'],7,null,{},'P'); T(['7','7'],8,null,{},'P'); T(['8','8'],11,null,{},'P');
T(['10','6'],9,null,{},'H'); T(['10','6'],10,null,{},'R'); T(['10','7'],11,null,{},'R'); T(['10','7'],11,null,{canSurrender:false},'S'); T(['A','7'],2,null,{canDouble:false},'S'); T(['A','3'],4,null,{},'D');
B.setRules({ decks: 2, h17: false, ls: true }); T(['6','5'],11,null,{},'H'); T(['6','5'],11,1,{},'D'); T(['A','3'],4,null,{},'H'); T(['10','7'],11,null,{},'S');
console.log('ramp dd', [-1, 0, 1, 2, 3, 4, 6].map((t) => (B.setRules({ decks: 2 }), B.ramp(t))).join(','), 'shoe', [-1, 1, 2, 3, 4, 5, 7].map((t) => (B.setRules({ decks: 6 }), B.ramp(t))).join(','));
B.setRules({ decks: 2, h17: true, ls: true }); console.log(B.devRule(B.DEVIATIONS[0]), '|', B.devRule(B.DEVIATIONS.find((d) => d.id === '12v6')), '|', B.devRule(B.DEVIATIONS.find((d) => d.id === 'TTv6')), '|', B.rulesLabel());
console.log(fails ? fails + ' FAILURES' : 'ALL ENGINE TESTS PASS');
