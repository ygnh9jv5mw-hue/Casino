// Bootcamp: performance-gated stages. A stage unlocks when every task in the previous one is done,
// so fast learners move as fast as their results allow.
// Task kinds: lesson {id} · quiz {id, pct} · best {key, min} · fastest {key, max} · mastery {group, pct}
//             idx {pct} · shoe {hands, dec, checks, chk} · flag {key}
window.CAMP = [
  { id: 1, title: 'The Edge', sub: 'Why counting works and how to read a table', tasks: [
    { k: 'lesson', id: 'm1l1' }, { k: 'lesson', id: 'm1l2' },
    { k: 'mastery', group: 'hard', pct: 0.4, t: 'Hard totals: 40% mastered', go: 'strategy' } ] },
  { id: 2, title: 'Hard Totals', sub: 'The backbone of basic strategy', tasks: [
    { k: 'lesson', id: 'm1l3' },
    { k: 'best', key: 'blitz', min: 15, t: 'Strategy Blitz: score 15+', go: 'blitz' },
    { k: 'mastery', group: 'hard', pct: 0.9, t: 'Hard totals: 90% mastered', go: 'strategy' } ] },
  { id: 3, title: 'Soft Hands & Pairs', sub: 'Where most players leak money', tasks: [
    { k: 'lesson', id: 'm1l4' },
    { k: 'mastery', group: 'soft', pct: 0.85, t: 'Soft totals: 85% mastered', go: 'strategy' },
    { k: 'mastery', group: 'pairs', pct: 0.85, t: 'Pairs: 85% mastered', go: 'strategy' } ] },
  { id: 4, title: 'Basic Strategy Exam', sub: 'Perfect, fast, under pressure', tasks: [
    { k: 'quiz', id: 'm1', pct: 80 },
    { k: 'mastery', group: 'all', pct: 0.95, t: 'Whole chart: 95% mastered', go: 'strategy' },
    { k: 'best', key: 'strat', min: 50, t: '50 correct in a row', go: 'strategy' },
    { k: 'best', key: 'blitz', min: 30, t: 'Strategy Blitz: score 30+', go: 'blitz' } ] },
  { id: 5, title: 'Card Values', sub: 'Make Hi-Lo automatic', tasks: [
    { k: 'lesson', id: 'm2l1' }, { k: 'lesson', id: 'm2l2' },
    { k: 'best', key: 'reflex', min: 40, t: 'Reflex: 40+ in 60s', go: 'reflex' },
    { k: 'best', key: 'pairs', min: 25, t: 'Pairs: 25+ in 60s', go: 'pairs' } ] },
  { id: 6, title: 'Counting Speed', sub: 'Count a deck without thinking', tasks: [
    { k: 'fastest', key: 'deck', max: 45, t: 'Deck countdown: perfect in 45s', go: 'deck' },
    { k: 'best', key: 'ladder', min: 2, t: 'Speed Ladder: 2 cards/sec', go: 'ladder' },
    { k: 'best', key: 'reflex', min: 55, t: 'Reflex: 55+ in 60s', go: 'reflex' },
    { k: 'best', key: 'speed', min: 100, t: 'Speed count: a perfect table at 100 a minute', go: 'speed', args: { cpm: 100 } } ] },
  { id: 7, title: 'True Count', sub: 'Divide fast, read the tray', tasks: [
    { k: 'lesson', id: 'm2l3' },
    { k: 'fastest', key: 'tc', max: 3, t: 'True count: 10/10, under 3s each', go: 'tc' },
    { k: 'best', key: 'decks', min: 8, t: 'Tray reading: 8/10', go: 'decks' } ] },
  { id: 8, title: 'Casino Speed', sub: 'Whole rounds at a glance', tasks: [
    { k: 'lesson', id: 'm2l4' }, { k: 'lesson', id: 'm2l5' },
    { k: 'fastest', key: 'deck', max: 30, t: 'Deck countdown: perfect in 30s', go: 'deck' },
    { k: 'best', key: 'flash', min: 6, t: 'Table Flash: level 6', go: 'flash' },
    { k: 'best', key: 'speed', min: 120, t: 'Speed count: a perfect table at 120 a minute', go: 'speed', args: { cpm: 120 } },
    { k: 'quiz', id: 'm2', pct: 80 } ] },
  { id: 9, title: 'Index Plays I', sub: 'Insurance and the Illustrious 18', tasks: [
    { k: 'lesson', id: 'm3l1' }, { k: 'lesson', id: 'm3l2' }, { k: 'lesson', id: 'm3l3' },
    { k: 'idx', pct: 0.5, t: 'Index plays: 50% mastered', go: 'index' } ] },
  { id: 10, title: 'Index Plays II', sub: 'Every index, instantly', tasks: [
    { k: 'lesson', id: 'm3l4' },
    { k: 'idx', pct: 0.9, t: 'Index plays: 90% mastered', go: 'index' },
    { k: 'best', key: 'recall', min: 15, t: 'Index Recall: 15 in a row', go: 'recall' },
    { k: 'quiz', id: 'm3', pct: 80 } ] },
  { id: 11, title: 'Money', sub: 'Bet like a professional', tasks: [
    { k: 'lesson', id: 'm4l1' }, { k: 'lesson', id: 'm4l2' }, { k: 'lesson', id: 'm4l3' },
    { k: 'best', key: 'ramp', min: 10, t: 'Bet Ramp: 10/10', go: 'ramp' },
    { k: 'flag', key: 'bankroll', t: 'Run your numbers in the bankroll calculator', go: 'bankroll' },
    { k: 'quiz', id: 'm4', pct: 80 } ] },
  { id: 12, title: 'Heat', sub: 'Stay in the game', tasks: [
    { k: 'lesson', id: 'm5l1' }, { k: 'lesson', id: 'm5l2' }, { k: 'lesson', id: 'm5l3' },
    { k: 'best', key: 'shoeClean', min: 1, t: 'Finish a full shoe without a backoff', go: 'shoe' },
    { k: 'quiz', id: 'm5', pct: 80 } ] },
  { id: 13, title: 'Live Fire', sub: 'The casino-ready test', tasks: [
    { k: 'shoe', hands: 150, dec: 0.98, checks: 20, chk: 0.95, t: 'Shoe sim: 150 hands, 98% plays, 95% counts', go: 'shoe' },
    { k: 'fastest', key: 'deck', max: 25, t: 'Deck countdown: perfect in 25s', go: 'deck' },
    { k: 'fastest', key: 'tc', max: 2, t: 'True count: 10/10, under 2s each', go: 'tc' },
    { k: 'best', key: 'blitz', min: 40, t: 'Strategy Blitz: score 40+', go: 'blitz' } ] },
  { id: 14, title: 'Pro', sub: 'Advanced play and the team', tasks: [
    { k: 'lesson', id: 'm6l1' }, { k: 'lesson', id: 'm6l2' }, { k: 'lesson', id: 'm6l3' },
    { k: 'lesson', id: 'm7l1' }, { k: 'lesson', id: 'm7l2' }, { k: 'lesson', id: 'm8l1' }, { k: 'lesson', id: 'm8l2' },
    { k: 'quiz', id: 'm6', pct: 80 }, { k: 'quiz', id: 'm7', pct: 80 }, { k: 'quiz', id: 'm8', pct: 80 } ] }
];
