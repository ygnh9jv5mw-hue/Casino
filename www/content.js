// Course content: 8 modules, each a list of lessons. Lesson bodies are HTML.
// "drill" links a lesson to a trainer in the Train tab.
window.COURSE = [
  {
    id: 'm1', title: 'Foundations That Never Break', icon: '♠',
    blurb: 'Rules, basic strategy and the habits every winning player is built on.',
    lessons: [
      { id: 'm1l1', title: 'Why blackjack can be beaten', body: `
        <p>Every other casino game is a series of independent events: the roulette wheel has no memory. Blackjack is different. Cards that are dealt don't come back until the shuffle, so <b>the composition of the remaining cards changes every round</b>.</p>
        <p>When the shoe is rich in tens and aces, the player gains: more blackjacks (paid 3:2), better doubles, and the dealer busts more often because they must hit stiff hands. When it's rich in small cards, the dealer gains.</p>
        <p>Off the top of a six-deck shoe, perfect basic strategy leaves the house around 0.4–0.6%. Counting tells you when that edge has flipped to you, so you can bet more exactly when you're the favourite.</p>
        <div class="callout">Card counting is mental arithmetic. No devices, no cheating — and in the US, it's legal.</div>` },
      { id: 'm1l2', title: 'Reading the table rules in 10 seconds', body: `
        <p>Rules move the house edge more than most players realise. Check the felt and the placard before you sit:</p>
        <ul>
          <li><b>Blackjack pays 3:2</b> — never play 6:5. It adds ~1.4% to the house edge and no count beats it.</li>
          <li><b>S17 vs H17</b> — dealer stands on soft 17 is better for you (~0.2%).</li>
          <li><b>DAS</b> — double after split allowed (+~0.14% for you).</li>
          <li><b>Late surrender</b> — worth ~0.08% off the top and much more at high counts.</li>
          <li><b>Penetration</b> — how deep the dealer deals before shuffling. The single most important condition for a counter. Look for 75% or better.</li>
          <li><b>Continuous shuffling machines</b> — cannot be counted. Walk.</li>
        </ul>` },
      { id: 'm1l3', title: 'Basic strategy: the zero point', drill: 'strategy', body: `
        <p>Basic strategy is the mathematically best play for every hand using only your cards and the dealer's upcard. Counting adds on top of it — if your basic strategy has errors, they cost more than your count earns.</p>
        <p>Learn it in this order: <b>hard totals → soft totals → pairs → surrender</b>. Then drill until every answer is instant. Target: 100 hands in a row, zero errors, under 2 seconds each.</p>
        <p>The chart in the Train tab is for 6 decks, S17, DAS, late surrender.</p>` },
      { id: 'm1l4', title: 'The mistakes that cost the most', body: `
        <ul>
          <li><b>Not splitting 8s or Aces.</b> Always split them.</li>
          <li><b>Standing on soft 17 or soft 18 vs 9/10/A.</b> Hit A7 against 9, 10 and Ace.</li>
          <li><b>Not doubling soft hands.</b> A2–A7 against weak dealer cards are money hands.</li>
          <li><b>Taking insurance / "even money"</b> without a count. It's a side bet with a big house edge — until the true count reaches +3.</li>
          <li><b>Hitting 12 vs 4–6.</b> Let the dealer bust.</li>
        </ul>` }
    ]
  },
  {
    id: 'm2', title: 'The Hi-Lo Count, Mastered', icon: '♣',
    blurb: 'Running count, true count and deck estimation at casino speed.',
    lessons: [
      { id: 'm2l1', title: 'Card values', drill: 'count', body: `
        <table class="tbl"><tr><th>Cards</th><th>Hi-Lo value</th></tr>
        <tr><td>2 3 4 5 6</td><td class="pos">+1</td></tr>
        <tr><td>7 8 9</td><td>0</td></tr>
        <tr><td>10 J Q K A</td><td class="neg">−1</td></tr></table>
        <p>Start at 0 after the shuffle. Add each card's value as it is exposed. A positive count means more high cards remain — good for you.</p>
        <p>A full deck counts to exactly 0. Your first benchmark: count down a deck in under 30 seconds and land on 0 every time.</p>` },
      { id: 'm2l2', title: 'Counting in pairs (cancellation)', drill: 'count', body: `
        <p>Don't count one card at a time. Look at cards in pairs and cancel: a high card and a low card together are 0. A 5 and a K? Zero, ignore. Two small cards? +2.</p>
        <p>At a real table, count each player's whole hand as one glance: "K-5-3" is +1. The dealer's hole card gets counted when it's flipped.</p>` },
      { id: 'm2l3', title: 'The true count', drill: 'truecount', body: `
        <p>A running count of +6 means very different things with 1 deck left versus 5 decks left. Divide by decks remaining:</p>
        <div class="callout">True count = Running count ÷ Decks remaining</div>
        <p>Estimate decks remaining by looking at the discard tray (decks played) and subtracting from the shoe size. Estimate to the nearest half deck.</p>
        <p>Round <b>down</b> (floor): RC +7 with 2 decks left is TC +3.5 → +3. RC −7 with 2 decks left is −3.5 → −4. Consistency matters more than which convention you use.</p>` },
      { id: 'm2l4', title: 'Casino-ready benchmarks', drill: 'shoe', body: `
        <ul>
          <li>Deck countdown: under 25 seconds, perfect accuracy</li>
          <li>Pairs/hands at a glance: no counting card by card</li>
          <li>True count conversion: under 2 seconds</li>
          <li>Full shoe simulator: correct count at every check with distractions on</li>
        </ul>
        <p>Don't play for real money until you hit all four. The Train tab tracks your bests.</p>` }
    ]
  },
  {
    id: 'm3', title: '100+ Index Plays', icon: '♥',
    blurb: 'When the count says break basic strategy — ranked by value.',
    lessons: [
      { id: 'm3l1', title: 'What a deviation is', drill: 'deviations', body: `
        <p>Basic strategy is right for a neutral deck. As the true count moves, some plays flip. Each deviation has an <b>index</b>: the true count at which you switch.</p>
        <p>Example: 16 vs 10 is a hit off the top. At a true count of 0 or higher, you stand.</p>
        <p>Most of the value is in a small number of plays. Learn those first.</p>` },
      { id: 'm3l2', title: 'Insurance: the most valuable play', drill: 'deviations', body: `
        <p>Insurance pays 2:1 and wins when the dealer has a ten in the hole. It is a bet on the density of tens — exactly what the Hi-Lo count measures.</p>
        <div class="callout">Take insurance at true count +3 or higher. Never below.</div>` },
      { id: 'm3l3', title: 'The Illustrious 18', drill: 'deviations', body: `
        <p>The 18 deviations that capture most of the gain (multi-deck, S17). "Stand at +2" means stand when TC ≥ +2, otherwise basic strategy.</p>
        <table class="tbl"><tr><th>Hand</th><th>Play</th><th>Index</th></tr>
        <tr><td>Insurance</td><td>Take</td><td>+3</td></tr>
        <tr><td>16 vs 10</td><td>Stand</td><td>0</td></tr>
        <tr><td>15 vs 10</td><td>Stand</td><td>+4</td></tr>
        <tr><td>10,10 vs 5</td><td>Split</td><td>+5</td></tr>
        <tr><td>10,10 vs 6</td><td>Split</td><td>+4</td></tr>
        <tr><td>10 vs 10</td><td>Double</td><td>+4</td></tr>
        <tr><td>12 vs 3</td><td>Stand</td><td>+2</td></tr>
        <tr><td>12 vs 2</td><td>Stand</td><td>+3</td></tr>
        <tr><td>11 vs A</td><td>Double</td><td>+1</td></tr>
        <tr><td>9 vs 2</td><td>Double</td><td>+1</td></tr>
        <tr><td>10 vs A</td><td>Double</td><td>+4</td></tr>
        <tr><td>9 vs 7</td><td>Double</td><td>+3</td></tr>
        <tr><td>16 vs 9</td><td>Stand</td><td>+5</td></tr>
        <tr><td>13 vs 2</td><td>Hit</td><td>below −1</td></tr>
        <tr><td>12 vs 4</td><td>Hit</td><td>below 0</td></tr>
        <tr><td>12 vs 5</td><td>Hit</td><td>below −2</td></tr>
        <tr><td>12 vs 6</td><td>Hit</td><td>below −1</td></tr>
        <tr><td>13 vs 3</td><td>Hit</td><td>below −2</td></tr></table>` },
      { id: 'm3l4', title: 'The Fab 4 surrenders', drill: 'deviations', body: `
        <table class="tbl"><tr><th>Hand</th><th>Surrender at</th></tr>
        <tr><td>14 vs 10</td><td>+3</td></tr>
        <tr><td>15 vs 10</td><td>0</td></tr>
        <tr><td>15 vs 9</td><td>+2</td></tr>
        <tr><td>15 vs A</td><td>+1</td></tr></table>
        <p>Where late surrender is offered, these are worth nearly as much as the Illustrious 18.</p>` }
    ]
  },
  {
    id: 'm4', title: 'Bankroll, Bet Spreads & Risk of Ruin', icon: '♦',
    blurb: 'The part that separates pros from broke counters.',
    lessons: [
      { id: 'm4l1', title: 'Your edge comes from your bet spread', body: `
        <p>Counting only pays if you bet more when the count is high. A typical six-deck ramp with a 1–12 spread:</p>
        <table class="tbl"><tr><th>True count</th><th>Bet (units)</th></tr>
        <tr><td>≤ +1</td><td>1 (or leave)</td></tr><tr><td>+2</td><td>2</td></tr><tr><td>+3</td><td>4</td></tr>
        <tr><td>+4</td><td>8</td></tr><tr><td>+5 and up</td><td>12</td></tr></table>
        <p>Your edge rises roughly 0.5% per true count. Off the top you're behind; at +4 you're well ahead.</p>` },
      { id: 'm4l2', title: 'Variance is the whole game', drill: 'bankroll', body: `
        <p>Even with a 1% edge, the standard deviation of blackjack is about 1.15 bets per hand — larger with a spread. That means losing weeks and even losing months are normal.</p>
        <p><b>Risk of ruin</b> is the probability of losing your entire bankroll before the edge takes over. Pros size their bets so it stays at 5% or less.</p>
        <p>Use the Bankroll calculator in Tools to see your expected hourly win, swings, and risk of ruin.</p>` },
      { id: 'm4l3', title: 'Rules for your bankroll', body: `
        <ul>
          <li>Your bankroll is money you can lose without changing your life. Never rent money, savings or credit.</li>
          <li>Size your max bet from your bankroll, not from your last session.</li>
          <li>When the bankroll drops, resize your units down. Don't chase.</li>
          <li>Log every session. Judge yourself on accuracy and hours played, not on short-term results.</li>
        </ul>` }
    ]
  },
  {
    id: 'm5', title: 'Heat, Cover & Backoffs', icon: '🎭',
    blurb: 'Play long sessions without drawing attention — and leave cleanly.',
    lessons: [
      { id: 'm5l1', title: 'How casinos spot counters', body: `
        <p>Surveillance watches for one thing above all: <b>bet size that follows the count</b>. Big jumps in the bet right after a run of small cards are the classic tell.</p>
        <p>Other flags: staring at the cards, moving lips, only playing high counts, perfect index plays (like standing 16 vs 10), and leaving the instant the count drops.</p>` },
      { id: 'm5l2', title: 'Cover play', body: `
        <ul>
          <li>Ramp gradually and parlay wins instead of jumping straight to max bet.</li>
          <li>Talk, order a drink (and don't drink it), look like a recreational player.</li>
          <li>Keep sessions short — 45–60 minutes per pit — and rotate casinos.</li>
          <li>Skip low-value deviations at small stakes; they are expensive "tells".</li>
          <li>Don't bet so big that you get rated and watched from the first hand.</li>
        </ul>` },
      { id: 'm5l3', title: 'Backoffs and your rights', body: `
        <p>A <b>backoff</b> is when staff tell you that you can't play blackjack anymore. Stay calm, polite and brief: "No problem," color up and leave. Don't argue and don't show ID if you're not required to.</p>
        <p>Casinos are private property and generally can refuse your play. If you are formally trespassed and come back, that can be a crime — don't return.</p>
        <div class="callout">Never use any device to count or track. Devices are illegal in many jurisdictions (including Nevada) and will get you prosecuted. Your brain is legal.</div>` }
    ]
  },
  {
    id: 'm6', title: 'Advanced Card Counting', icon: '📈',
    blurb: 'Squeeze more out of every shoe.',
    lessons: [
      { id: 'm6l1', title: 'Wonging and back-counting', body: `
        <p>Back-counting means counting a table while standing behind it and only stepping in when the count turns positive. You skip most of the negative hands entirely.</p>
        <p>Many casinos restrict mid-shoe entry; know the rule before you try it. Leaving when the count goes negative ("Wonging out") is the other half.</p>` },
      { id: 'm6l2', title: 'Playing two hands', body: `
        <p>At high counts, spreading to two hands gets more money on the table during the good part of the shoe and reduces the per-hand variance. Each hand is usually around 75% of the single-hand bet.</p>` },
      { id: 'm6l3', title: 'Penetration and game selection', body: `
        <p>A great counter at a bad game loses to an average counter at a great game. Rank games by penetration first, then rules, then crowd. The deeper the shoe is dealt, the more often high counts appear.</p>` }
    ]
  },
  {
    id: 'm7', title: 'Beyond Card Counting', icon: '🔍',
    blurb: 'Advantage techniques past the count — for the disciplined.',
    lessons: [
      { id: 'm7l1', title: 'The advantage-play landscape', body: `
        <p>Card counting is one tool. Advanced players also study legal techniques that use information the game gives away — such as promotions and coupons with positive value, side bets that become beatable at extreme counts, and procedural weaknesses in how a game is dealt.</p>
        <p>All of these require a solid counting foundation first. Book a 1-on-1 to see which apply to the games near you.</p>` },
      { id: 'm7l2', title: 'Staying on the right side of the line', body: `
        <p>Using what you can see and remember is legal. Touching chips after the result, marking cards, collusion with the dealer or using devices is cheating — and a crime. Advantage play is about skill, never cheating.</p>` }
    ]
  },
  {
    id: 'm8', title: 'Team Play', icon: '🤝',
    blurb: 'How blackjack teams work — and how to earn a seat on one.',
    lessons: [
      { id: 'm8l1', title: 'Why teams win', body: `
        <p>A team pools its bankroll. Five players with $10,000 each can bet like a player with $50,000 — and win at five times the rate — while the swings are shared.</p>
        <p>Typical roles: <b>spotters</b> count tables at minimum bets and signal when the count is high; the <b>big player</b> comes in and bets big only on hot shoes.</p>` },
      { id: 'm8l2', title: 'Trust, testing and accounting', body: `
        <ul>
          <li>Every member passes counting and strategy tests under pressure.</li>
          <li>Every session is logged: hours, count accuracy, results.</li>
          <li>Win splits are agreed in writing before a bank is formed.</li>
        </ul>
        <p>Members who prove themselves in the MasterClass get a path to try out for a team.</p>` }
    ]
  }
];
