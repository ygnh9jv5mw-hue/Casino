// Course content: 8 modules. Each lesson has an HTML body, key takeaways, and an optional drill
// (a Train screen id). Each module ends with a quiz: { q, a: [choices], c: correct index, why }.
window.COURSE = [
  {
    id: 'm1', title: 'Foundations That Never Break', icon: '♠',
    blurb: 'Rules, basic strategy and the habits every winning player is built on.',
    lessons: [
      { id: 'm1l1', title: 'Why blackjack can be beaten', mins: 3, body: `
        <p>Every other casino game is a series of independent events — the roulette wheel has no memory. Blackjack does. Cards that are dealt don't come back until the shuffle, so <b>the cards left in the shoe change every round</b>.</p>
        <p>When the shoe is rich in tens and aces, the player gains: more blackjacks (paid 3:2), stronger doubles, and the dealer busts more because they must hit stiff hands. When it's rich in small cards, the dealer gains.</p>
        <p>Off the top of a six-deck shoe, perfect basic strategy leaves the house around 0.5%. Counting tells you when that edge has flipped to you — and you bet more exactly then.</p>
        <div class="callout">Card counting is mental arithmetic. No devices, no cheating — and in the US, it's legal.</div>`,
        takeaways: ['Dealt cards change what is left in the shoe', 'Tens and aces left = good for you', 'Basic strategy first, counting second'] },
      { id: 'm1l2', title: 'Reading the table in 10 seconds', mins: 3, body: `
        <p>Rules move the house edge more than most players realise. Check the felt and the placard before you sit:</p>
        <ul>
          <li><b>Blackjack pays 3:2</b> — never play 6:5. It adds about 1.4% to the house edge and no count beats it.</li>
          <li><b>S17 vs H17</b> — "dealer stands on all 17s" is worth about 0.2% to you. The felt says which.</li>
          <li><b>DAS</b> — double after split (+0.14% for you).</li>
          <li><b>Late surrender</b> — small off the top, big at high counts.</li>
          <li><b>Penetration</b> — how deep the dealer deals before shuffling. The most important condition for a counter. Look for 75% or more.</li>
          <li><b>Continuous shuffling machines</b> — can't be counted. Walk away.</li>
        </ul>
        <p>Set your table's rules in <b>Settings</b> so every drill and chart in this app matches the game you'll play.</p>`,
        takeaways: ['Only play 3:2', 'Penetration is king', 'No CSMs', 'Match the app to your rules in Settings'] },
      { id: 'm1l3', title: 'Basic strategy in 9 rules', mins: 5, drill: 'strategy', body: `
        <p>The chart has 280 cells, but it compresses into a handful of rules. Learn the rules, then drill the cells until they're automatic.</p>
        <ol>
          <li><b>Always split Aces and 8s. Never split 5s or 10s.</b></li>
          <li><b>Stiff hands (13–16): stand vs 2–6, hit vs 7+.</b> The dealer's 2–6 are bust cards.</li>
          <li><b>12 is the exception: stand only vs 4–6.</b></li>
          <li><b>Double 11</b> vs everything (S17: not vs Ace). <b>Double 10</b> vs 2–9. <b>Double 9</b> vs 3–6.</li>
          <li><b>Soft hands double against weak cards:</b> A2–A3 vs 5–6, A4–A5 vs 4–6, A6–A7 vs 3–6.</li>
          <li><b>Soft 18:</b> stand vs 2, 7, 8 · hit vs 9, 10, A. <b>Never stand on soft 17.</b></li>
          <li><b>Pairs vs 2–7:</b> split 2s, 3s, 7s; 6s vs 2–6; 4s only vs 5–6; 9s vs everything but 7, 10, A.</li>
          <li><b>Surrender</b> 16 vs 9, 10, A and 15 vs 10 (H17: also 15 and 17 vs A, and 8,8 vs A).</li>
          <li><b>Always hit 8 or less. Always stand on hard 17+.</b></li>
        </ol>
        {{GAME_NOTES}}
        <p>Target: 100 hands in a row with zero errors, under 2 seconds each. The adaptive trainer feeds you the hands you miss until you stop missing them.</p>`,
        takeaways: ['Split A & 8, never 5 & 10', 'Stiffs stand vs 2–6', '12 stands only vs 4–6', 'Hard 17+ always stands'] },
      { id: 'm1l4', title: 'The mistakes that cost the most', mins: 3, drill: 'blitz', body: `
        <ul>
          <li><b>Not splitting 8s or Aces.</b> Always split them.</li>
          <li><b>Standing on soft 17, or on soft 18 vs 9/10/A.</b> Hit.</li>
          <li><b>Not doubling soft hands.</b> A2–A7 against weak dealer cards are money hands.</li>
          <li><b>Insurance and "even money"</b> without a count. It's a side bet with a big house edge — until the true count reaches +3.</li>
          <li><b>Hitting 12 vs 4–6.</b> Let the dealer bust.</li>
          <li><b>Being slow.</b> Hesitation is a tell and it steals attention from the count. Speed comes from reps.</li>
        </ul>`,
        takeaways: ['No insurance below +3', 'Soft doubles make money', 'Speed is part of accuracy'] }
    ],
    quiz: [
      { q: 'What does a 6:5 blackjack payout do?', a: ['Slightly helps the player', 'Adds about 1.4% to the house edge', 'Nothing, if you count cards', 'Only matters at single deck'], c: 1, why: 'Paying 6:5 instead of 3:2 costs about 1.4% — more than a counter\'s whole edge.' },
      { q: 'Hard 12 vs a dealer 4?', a: ['Hit', 'Stand', 'Double', 'Surrender'], c: 1, why: '12 stands only against 4, 5 and 6.' },
      { q: 'Soft 18 (A,7) vs a dealer 9?', a: ['Stand', 'Double', 'Hit', 'Surrender'], c: 2, why: 'Soft 18 hits against 9, 10 and Ace.' },
      { q: 'Pair of 5s vs a dealer 6?', a: ['Split', 'Double', 'Hit', 'Stand'], c: 1, why: 'Never split 5s — play them as a hard 10 and double vs 2–9.' },
      { q: 'Which condition matters most to a counter?', a: ['Table minimum', 'Number of players', 'Penetration', 'Dealer speed'], c: 2, why: 'The deeper the cut card, the more often big counts appear.' },
      { q: 'Hard 16 vs a 10, surrender allowed, no count?', a: ['Hit', 'Stand', 'Surrender', 'Double'], c: 2, why: 'Surrender 16 vs 9, 10 and A.' }
    ]
  },
  {
    id: 'm2', title: 'The Hi-Lo Count, Mastered', icon: '♣',
    blurb: 'Running count, true count and deck estimation at casino speed.',
    lessons: [
      { id: 'm2l1', title: 'Card values', mins: 2, drill: 'reflex', body: `
        <table class="tbl"><tr><th>Cards</th><th>Hi-Lo value</th></tr>
        <tr><td>2 3 4 5 6</td><td class="pos">+1</td></tr>
        <tr><td>7 8 9</td><td>0</td></tr>
        <tr><td>10 J Q K A</td><td class="neg">−1</td></tr></table>
        <p>Start at 0 after the shuffle. Add each card's value as it's exposed. A positive count means more high cards remain — good for you.</p>
        <p>Your first goal is <b>instant recognition</b>: you see a card and the value appears in your head with no thought. The Reflex drill builds exactly that.</p>`,
        takeaways: ['Small cards +1, big cards −1', '7, 8, 9 are zero', 'Recognition must be instant'] },
      { id: 'm2l2', title: 'Count in pairs, not cards', mins: 3, drill: 'pairs', body: `
        <p>Pros never count one card at a time. Look at cards in pairs and cancel: a high card and a low card together are 0. A 5 and a King? Zero — ignore them. Two small cards? +2.</p>
        <p>At a real table, count each player's whole hand in one glance: K‑5‑3 is +1. Count the dealer's hole card when it's flipped.</p>
        <p>Practise the cancellation drill until two-card values are instant, then move to Table Flash, which shows a whole round at once.</p>`,
        takeaways: ['High + low cancels to 0', 'Count hands, not cards', 'Train with Pairs and Table Flash'] },
      { id: 'm2l3', title: 'The true count', mins: 4, drill: 'tc', body: `
        <p>A running count of +6 means very different things with 1 deck left versus 5 decks left. Divide by decks remaining:</p>
        <div class="callout">True count = Running count ÷ Decks remaining</div>
        <p>Estimate decks remaining from the discard tray: look at how many decks are in the tray and subtract from the shoe size. Estimate to the nearest half deck.</p>
        <p>Round <b>down</b> (floor): RC +7 with 2 decks left is +3.5 → +3. RC −7 with 2 decks left is −3.5 → −4. Consistency matters more than which convention you use.</p>`,
        takeaways: ['TC = RC ÷ decks left', 'Read the tray to the nearest half deck', 'Always round down'] },
      { id: 'm2l4', title: 'Casino-ready benchmarks', mins: 2, drill: 'deck', body: `
        <ul>
          <li>Reflex: 60+ correct in 60 seconds</li>
          <li>Deck countdown: under 25 seconds, perfect</li>
          <li>Speed count: a perfect table at 120 cards a minute, other players and all</li>
          <li>True count conversion: under 2 seconds</li>
          <li>Shoe simulator: right count at every check, with other players at the table</li>
        </ul>
        <p>Don't play for real money until you hit all of them. The Progress tab tracks every record.</p>`,
        takeaways: ['Deck in under 25s', 'Hold the count at 120 cards a minute', 'TC in under 2s', 'Perfect counts under distraction'] },
      { id: 'm2l5', title: 'Double deck: burn card, cut card, pitch games', mins: 5, drill: 'shoe', body: `
        <p>With only 104 cards, <b>every card moves the true count more</b>. A running count of +3 is a true count of +2 with a deck and a half left, +3 with one deck, and +6 with half a deck. Estimate decks left to the nearest half deck — 1½, 1, ½ — and divide.</p>
        <p><b>The burn card.</b> After the shuffle the dealer burns the top card face down. You never see it, so you never count it. It just stays part of the "unseen" cards — your running count still starts at 0.</p>
        <p><b>The cut card.</b> Where the shuffle comes is set by the cut, so penetration changes every deck. The deeper the cut, the more often the count gets big. When you can see where the cut card sits, you know how much of the deck you'll get — a shallow cut is a reason to keep your bets small or move on.</p>
        <p><b>Pitch (hand-held) games.</b> Cards are dealt face down, so you can't count everything right away:</p>
        <ul>
          <li>Count <b>your own cards</b> and the <b>dealer's up card</b> immediately.</li>
          <li>Count other players' cards when they <b>bust</b>, turn up a <b>blackjack</b>, or <b>double</b> (they turn their two cards over).</li>
          <li>The <b>double-down card</b> is dealt face down — count it when it's turned over at the end.</li>
          <li>When the dealer flips the hole card and settles each hand, <b>count everything that's turned over</b>. Be ready: it happens fast.</li>
        </ul>
        <p><b>Betting.</b> Your edge rises quickly in double deck, so the ramp starts earlier and is shorter: 1 unit at 0 or below, then 2, 4, 6, 8 units at +1, +2, +3, +4. Big jumps get noticed fast in a double-deck pit — ramp and parlay.</p>
        <div class="callout">Set your game to Double deck in Settings and every chart, index number, ramp and the simulator (burn card, random cut, pitch dealing) switch over.</div>`,
        takeaways: ['Each card matters more — estimate decks to the half', 'Never count the burn card', 'Pitch: count cards as they are turned over', 'Ramp earlier, ramp quieter'] }
    ],
    quiz: [
      { q: 'What is the Hi-Lo value of a 7?', a: ['+1', '0', '−1', '+½'], c: 1, why: '7, 8 and 9 are neutral.' },
      { q: 'Cards dealt: K, 5, 3, A, 9. What did the count change by?', a: ['+2', '0', '−1', '+1'], c: 1, why: 'K −1, 5 +1, 3 +1, A −1, 9 0 → 0.' },
      { q: 'Running count +9 with 3 decks left. True count?', a: ['+2', '+3', '+4', '+9'], c: 1, why: '9 ÷ 3 = 3.' },
      { q: 'Running count −5 with 2 decks left, rounding down?', a: ['−2', '−3', '−2.5', '−1'], c: 1, why: '−5 ÷ 2 = −2.5, which floors to −3.' },
      { q: 'A complete deck counts to…', a: ['+4', '−4', '0', 'It depends'], c: 2, why: 'Twenty +1s and twenty −1s cancel out.' },
      { q: 'Why convert to a true count?', a: ['Casinos require it', 'The same running count means more when fewer decks are left', 'It makes the count smaller', 'It is only for insurance'], c: 1, why: 'The true count measures the density of high cards per deck.' }
    ]
  },
  {
    id: 'm3', title: 'Index Plays', icon: '♥',
    blurb: 'When the count says break basic strategy — the plays worth the most.',
    lessons: [
      { id: 'm3l1', title: 'What a deviation is', mins: 2, drill: 'index', body: `
        <p>Basic strategy is right for a neutral deck. As the true count moves, some plays flip. Each deviation has an <b>index</b>: the true count at which you switch.</p>
        <p>Example: 16 vs 10 is a hit off the top. At a true count of 0 or higher, you stand.</p>
        <p>Most of the value is in a small number of plays — learn them first, and learn the <b>number</b>, not just the play. The Index Recall drill asks for the number directly.</p>`,
        takeaways: ['An index is the TC where a play flips', 'Learn the number, not just the play'] },
      { id: 'm3l2', title: 'Insurance: the most valuable play', mins: 2, drill: 'index', body: `
        <p>Insurance pays 2:1 and wins when the dealer has a ten in the hole. It's a bet on the density of tens — exactly what Hi-Lo measures.</p>
        <div class="callout">Take insurance at true count +3 or higher. Never below.</div>`,
        takeaways: ['Insurance at +3 or higher', 'Never "even money" below +3'] },
      { id: 'm3l3', title: 'The Illustrious 18', mins: 6, drill: 'recall', body: `
        <p>The 18 deviations that capture most of the gain. Each row reads: <b>at this true count or higher, make this play</b> — below it, play the other way (usually hit or stand).</p>
        {{I18}}
        <p class="small muted">These numbers are set for your game ({{RULES}}). Change your game in Settings and the table updates.</p>`,
        takeaways: ['Memorise in groups: stands, doubles, splits, hits', 'Most indices are between −2 and +5'] },
      { id: 'm3l4', title: 'The Fab 4 surrenders', mins: 2, drill: 'index', body: `
        {{FAB4}}
        <p>Where late surrender is offered, these are worth nearly as much as the Illustrious 18. Below the index, don't surrender — play the hand out.</p>`,
        takeaways: ['14 vs 10 at +3', '15 vs 10 at 0', '15 vs 9 at +2'] }
    ],
    quiz: [
      { q: '16 vs 10, no surrender, true count +1?', a: ['Hit', 'Stand', 'Double', 'Split'], c: 1, why: 'Stand at 0 or higher.' },
      { q: '10 vs 10 at true count +2?', a: ['Double', 'Hit', 'Stand', 'Surrender'], c: 1, why: 'The double index is +4. Below that, hit.' },
      { q: '12 vs 3 at true count +2?', a: ['Hit', 'Stand', 'Double', 'Surrender'], c: 1, why: 'Stand at +2 or higher.' },
      { q: 'Dealer shows an Ace, true count +2. Insurance?', a: ['Take it', 'Decline', 'Only with blackjack', 'Only for half'], c: 1, why: 'Insurance only at +3 or higher.' },
      { q: '15 vs 10 with surrender, true count 0?', a: ['Hit', 'Stand', 'Surrender', 'Double'], c: 2, why: 'Surrender at 0 or higher.' },
      { q: 'At what true count do you split 10s against a 5?', a: ['+3', '+4', '+5', '+6'], c: 2, why: '10,10 vs 5 splits at +5 in every game.' }
    ]
  },
  {
    id: 'm4', title: 'Bankroll, Bet Spreads & Risk of Ruin', icon: '♦',
    blurb: 'The part that separates pros from broke counters.',
    lessons: [
      { id: 'm4l1', title: 'Your edge comes from your bet spread', mins: 3, drill: 'ramp', body: `
        <p>Counting only pays if you bet more when the count is high. A typical six-deck ramp with a 1–12 spread:</p>
        <table class="tbl"><tr><th>True count</th><th>Bet (units)</th></tr>
        <tr><td>+1 or lower</td><td>1 (or leave)</td></tr><tr><td>+2</td><td>2</td></tr><tr><td>+3</td><td>4</td></tr>
        <tr><td>+4</td><td>8</td></tr><tr><td>+5 and up</td><td>12</td></tr></table>
        <p>Your edge rises roughly 0.5% per true count. Off the top you're behind; at +4 you're well ahead.</p>`,
        takeaways: ['Edge ≈ +0.5% per true count', 'Bet small until +2, big from +4'] },
      { id: 'm4l2', title: 'Variance is the whole game', mins: 3, drill: 'bankroll', body: `
        <p>Even with a 1% edge, blackjack's standard deviation is about 1.15 bets per hand — larger with a spread. Losing weeks and even losing months are normal.</p>
        <p><b>Risk of ruin</b> is the chance of losing your entire bankroll before the edge takes over. Pros size their bets so it stays at 5% or less.</p>
        <p>Use the Bankroll calculator to see your expected hourly win, your swings and your risk of ruin.</p>`,
        takeaways: ['Swings are normal', 'Keep risk of ruin ≤ 5%'] },
      { id: 'm4l3', title: 'Rules for your bankroll', mins: 2, body: `
        <ul>
          <li>Your bankroll is money you can lose without changing your life. Never rent money, savings or credit.</li>
          <li>Size your max bet from your bankroll, not from your last session.</li>
          <li>When the bankroll drops, resize your units down. Don't chase.</li>
          <li>Log every session. Judge yourself on accuracy and hours, not short-term results.</li>
        </ul>`,
        takeaways: ['Resize down after losses', 'Log every session'] }
    ],
    quiz: [
      { q: 'Roughly how much does each +1 true count add to your edge?', a: ['0.05%', '0.5%', '5%', '1.5%'], c: 1, why: 'About half a percent per true count.' },
      { q: 'With a 1–12 spread, what do you bet at TC +5?', a: ['4 units', '8 units', '12 units', '1 unit'], c: 2, why: '+5 and above is your max bet.' },
      { q: 'What is risk of ruin?', a: ['The house edge', 'The chance of losing your whole bankroll', 'The chance of a backoff', 'Your hourly loss'], c: 1, why: 'It measures survival, not a single session.' },
      { q: 'Professional players usually keep risk of ruin at…', a: ['5% or less', '25%', '50%', 'It doesn\'t matter'], c: 0, why: 'Low risk of ruin keeps you in the game long enough for the edge to win.' },
      { q: 'After a big losing week you should…', a: ['Double your bets to win it back', 'Resize your units to the new bankroll', 'Stop counting', 'Play more hands per hour'], c: 1, why: 'Bet from the bankroll you have, never chase.' }
    ]
  },
  {
    id: 'm5', title: 'Heat, Cover & Backoffs', icon: '🎭',
    blurb: 'Play long sessions without drawing attention — and leave cleanly.',
    lessons: [
      { id: 'm5l1', title: 'How casinos spot counters', mins: 3, body: `
        <p>Surveillance watches for one thing above all: <b>bet size that follows the count</b>. Big jumps right after a run of small cards are the classic tell.</p>
        <p>Other flags: staring at the cards, moving lips, only playing high counts, perfect index plays (like standing 16 vs 10), and leaving the instant the count drops.</p>
        <p>The shoe simulator has a <b>heat meter</b>: jump your bets too hard and you'll get backed off.</p>`,
        takeaways: ['Bet jumps are the #1 tell', 'Act like a player, not a calculator'] },
      { id: 'm5l2', title: 'Cover play', mins: 3, drill: 'shoe', body: `
        <ul>
          <li>Ramp gradually: <b>parlay wins</b> instead of jumping straight to your max bet.</li>
          <li>Talk, order a drink (and don't drink it), look recreational.</li>
          <li>Keep sessions short — 45–60 minutes per pit — and rotate casinos.</li>
          <li>Skip low-value index plays at small stakes; they're expensive tells.</li>
          <li>Don't bet so big that you get rated and watched from the first hand.</li>
        </ul>`,
        takeaways: ['Parlay instead of jumping', 'Short sessions, rotate casinos'] },
      { id: 'm5l3', title: 'Backoffs and your rights', mins: 3, body: `
        <p>A <b>backoff</b> is when staff tell you that you can't play blackjack anymore. Stay calm, polite and brief: "No problem." Colour up and leave. Don't argue.</p>
        <p>Casinos are private property and can generally refuse your play. If you're formally trespassed and come back, that can be a crime — don't return.</p>
        <div class="callout">Never use any device to count or track. Devices are illegal in many places (including Nevada). Your brain is legal.</div>`,
        takeaways: ['Polite, brief, gone', 'Never return after a trespass', 'No devices, ever'] }
    ],
    quiz: [
      { q: 'What does surveillance look for first?', a: ['Big tips', 'Bet size that follows the count', 'Players who talk', 'Winning players'], c: 1, why: 'A spread that tracks the count is the classic signature.' },
      { q: 'Which is good cover?', a: ['Jump from 1 to 12 units after a shuffle', 'Parlay a winning bet up instead of jumping', 'Stare at the discard tray', 'Leave the moment the count drops'], c: 1, why: 'Parlaying looks like a gambler pressing a win.' },
      { q: 'You get backed off. You should…', a: ['Argue your rights', 'Stay polite, colour up and leave', 'Switch tables in the same pit', 'Ask for a supervisor'], c: 1, why: 'Calm and brief keeps you welcome elsewhere.' },
      { q: 'Using a device to count cards is…', a: ['Fine if hidden', 'Illegal in many places, including Nevada', 'Legal everywhere', 'Allowed online only'], c: 1, why: 'Devices turn a legal skill into a crime.' },
      { q: 'A sensible session length per pit is…', a: ['5 minutes', '45–60 minutes', '4 hours', 'Until the shoe is perfect'], c: 1, why: 'Short sessions limit how long you can be watched.' }
    ]
  },
  {
    id: 'm6', title: 'Advanced Card Counting', icon: '📈',
    blurb: 'Squeeze more out of every shoe.',
    lessons: [
      { id: 'm6l1', title: 'Back-counting', mins: 3, body: `
        <p>Back-counting means counting a table while standing behind it and only stepping in when the count turns positive. You skip most of the negative hands entirely.</p>
        <p>Many casinos restrict mid-shoe entry — know the rule before you try it. Leaving when the count goes negative is the other half.</p>`,
        takeaways: ['Play only the good part of the shoe', 'Check mid-shoe entry rules'] },
      { id: 'm6l2', title: 'Playing two hands', mins: 2, body: `
        <p>At high counts, spreading to two hands puts more money on the table during the best part of the shoe, with less variance than one hand of the same total size. Each hand is usually about 75% of the single-hand bet.</p>`,
        takeaways: ['Two hands at high counts', '~75% of the single bet on each'] },
      { id: 'm6l3', title: 'Penetration and game selection', mins: 2, body: `
        <p>A great counter at a bad game loses to an average counter at a great game. Rank games by penetration first, then rules, then crowding. The deeper the shoe is dealt, the more often high counts appear.</p>`,
        takeaways: ['Game selection beats skill', 'Penetration → rules → crowd'] }
    ],
    quiz: [
      { q: 'Back-counting means…', a: ['Counting backwards', 'Counting a table while standing and joining when the count is positive', 'Counting only the dealer\'s cards', 'Recounting the discard tray'], c: 1, why: 'You skip the negative part of the shoe.' },
      { q: 'Why play two hands at high counts?', a: ['It hides your count', 'More money in good counts with less variance than one bigger bet', 'Casinos prefer it', 'It changes the true count'], c: 1, why: 'Two hands get more action when you have the edge.' },
      { q: 'Rank these for game selection:', a: ['Crowd, rules, penetration', 'Penetration, rules, crowd', 'Rules, crowd, penetration', 'Minimum bet first'], c: 1, why: 'Penetration drives how often you get a big edge.' }
    ]
  },
  {
    id: 'm7', title: 'Beyond Card Counting', icon: '🔍',
    blurb: 'Advantage techniques past the count — for the disciplined.',
    lessons: [
      { id: 'm7l1', title: 'The advantage-play landscape', mins: 3, body: `
        <p>Card counting is one tool. Advanced players also study legal techniques that use information the game gives away — promotions and coupons with positive value, side bets that become beatable at extreme counts, and weaknesses in how a game is dealt.</p>
        <p>All of these need a solid counting foundation first. Book a 1-on-1 to see which apply to the games near you.</p>`,
        takeaways: ['Counting is the foundation', 'Promotions can carry real value'] },
      { id: 'm7l2', title: 'Staying on the right side of the line', mins: 2, body: `
        <p>Using what you can see and remember is legal. Touching chips after the result, marking cards, colluding with a dealer or using devices is cheating — and a crime. Advantage play is about skill, never cheating.</p>`,
        takeaways: ['Observation = legal', 'Touching, marking, devices = cheating'] }
    ],
    quiz: [
      { q: 'Which of these is legal advantage play?', a: ['Marking cards', 'Using information you can legitimately see and remember', 'Adding chips after the result', 'A hidden counting device'], c: 1, why: 'Skill and observation are legal; the rest is cheating.' },
      { q: 'What should you master before advanced techniques?', a: ['Nothing', 'Card counting', 'Roulette systems', 'Slot volatility'], c: 1, why: 'Everything advanced is built on accurate counting.' }
    ]
  },
  {
    id: 'm8', title: 'Team Play', icon: '🤝',
    blurb: 'How blackjack teams work — and how to earn a seat on one.',
    lessons: [
      { id: 'm8l1', title: 'Why teams win', mins: 3, body: `
        <p>A team pools its bankroll. Five players with $10,000 each can bet like one player with $50,000 — and win at five times the rate — while the swings are shared.</p>
        <p>Typical roles: <b>spotters</b> count tables at minimum bets and signal when the count is high; the <b>big player</b> comes in and bets big only on hot shoes.</p>`,
        takeaways: ['Pooled bankroll = bigger bets, shared swings', 'Spotters + big player'] },
      { id: 'm8l2', title: 'Trust, testing and accounting', mins: 2, body: `
        <ul>
          <li>Every member passes counting and strategy tests under pressure.</li>
          <li>Every session is logged: hours, count accuracy, results.</li>
          <li>Win splits are agreed in writing before a bank is formed.</li>
        </ul>
        <p>Hit every benchmark in this app, then apply from the Coach tab — your verified stats go with your application.</p>`,
        takeaways: ['Tested, logged, agreed in writing'] }
    ],
    quiz: [
      { q: 'The main advantage of a team?', a: ['Free drinks', 'Pooled bankroll: bigger bets and shared variance', 'Lower house edge', 'Casinos can\'t back off teams'], c: 1, why: 'A bigger combined bank lets everyone bet like a big player.' },
      { q: 'A spotter\'s job is to…', a: ['Bet the max', 'Count at minimum bets and signal high counts', 'Distract the dealer', 'Hold the money'], c: 1, why: 'Spotters find the hot shoes for the big player.' },
      { q: 'What must be agreed in writing before forming a bank?', a: ['Table choice', 'Win splits', 'Drink orders', 'Seat positions'], c: 1, why: 'Clear money rules keep teams together.' }
    ]
  }
];
