/* Train tab: hub + drills. */
(function () {
  const A = window.APP, B = window.BJ, { $, $$, esc, SCREENS, go, rnd, pick, sgn } = A;

  // ---------- hub ----------
  SCREENS.train = () => {
    const S = A.S, b = S.best;
    const it = (g, ic, t, s, rec) => `<button class="list-item" data-go="${g}"><span class="ic">${A.icon(ic)}</span><span class="tx"><b>${esc(t)}</b><span>${esc(s)}</span></span>${rec ? `<span class="rec">${esc(rec)}</span>` : `<span class="chev">${A.icon('chevron')}</span>`}</button>`;
    return {
      title: 'Train',
      html: `
      <h3 class="sec">Basic strategy</h3>
      <div class="group">
        ${it('strategy', 'spade', 'Adaptive trainer', 'Real hands, played out · misses come back', Math.round(A.masteryPct('all') * 100) + '%')}
        ${it('blitz', 'bolt', 'Strategy Blitz', '60 seconds, wrong answers cost time', b.blitz ? 'Best ' + b.blitz : '')}
        ${it('mastery', 'grid', 'Mastery map', 'Every cell of the chart')}
      </div>
      <h3 class="sec">Counting</h3>
      <div class="group">
        ${it('reflex', 'pulse', 'Reflex', 'Card to count value, fast', b.reflex ? 'Best ' + b.reflex : '')}
        ${it('pairs', 'swap', 'Pair cancellation', 'Two cards at a time', b.pairs ? 'Best ' + b.pairs : '')}
        ${it('deck', 'layers', 'Deck countdown', 'A full deck against the clock', b.deck !== null ? b.deck.toFixed(1) + 's' : '')}
        ${it('ladder', 'trend', 'Speed ladder', 'Faster every time you\'re right', b.ladder ? b.ladder.toFixed(1) + '/s' : '')}
        ${it('speed', 'gauge', 'Speed count', 'Hold the count at dealer speed', b.speed ? b.speed + '/min' : '')}
        ${it('flash', 'eye', 'Table flash', 'A whole round at a glance', b.flash ? 'Level ' + b.flash : '')}
      </div>
      <h3 class="sec">True count & betting</h3>
      <div class="group">
        ${it('tc', 'divide', 'True count', 'Running count to true count', b.tc !== null ? b.tc.toFixed(1) + 's' : '')}
        ${it('decks', 'tray', 'Tray reading', 'Decks left from the discard tray', b.decks ? b.decks + '/10' : '')}
        ${it('ramp', 'coins', 'Bet ramp', 'From count to bet, instantly', b.ramp ? b.ramp + '/10' : '')}
      </div>
      <h3 class="sec">Index plays</h3>
      <div class="group">
        ${it('index', 'sparkle', 'Index trainer', 'Illustrious 18 and Fab 4, hands played out', Math.round(A.idxPct() * 100) + '%')}
        ${it('recall', 'hash', 'Index recall', 'Name the exact number', b.recall ? 'Best ' + b.recall : '')}
      </div>
      <h3 class="sec">Play</h3>
      <div class="group">
        ${it('shoe', 'cards', B.isDD() ? 'Double-deck simulator' : 'Shoe simulator', B.isDD() ? 'Burn card, random cut, pitch dealing' : 'Count, bet and play a full shoe', S.shoe.hands ? S.shoe.hands + ' hands' : '')}
        ${it('casino', 'chip', 'Casino table', 'A normal 6-deck game with real procedures', S.casino ? A.fmt$(S.casino.bank) : '')}
      </div>
      <h3 class="sec">Tools</h3>
      <div class="group">
        ${it('chart', 'table', 'Strategy chart', B.rulesLabel())}
        ${it('bankroll', 'calc', 'Bankroll & risk of ruin', 'Plan your bets before you play')}
      </div>`,
      mount: A.bindGo
    };
  };

  // ---------- shared bits ----------
  const ACTS = ['H', 'S', 'D', 'P', 'R'];
  const actBtns = (opts = {}) => `<div class="acts">${ACTS.map((k) => `<button class="act a-${k}" data-a="${k}" ${opts.dis && opts.dis[k] ? 'disabled' : ''}>${B.NAMES[k]}</button>`).join('')}</div>`;
  function setActs(root, dis) { $$('[data-a]', root).forEach((b) => (b.disabled = !!dis[b.dataset.a])); }
  const felt = (inner, cls = '') => `<div class="felt ${cls}">${inner}</div>`;
  const handTotal = (cards) => { const v = B.value(cards); return (v.soft && v.total < 21 ? 'soft ' : '') + v.total; };
  function xpPool() { let p = 0; return { add: (n) => { p += n; if (p >= 10) { A.addXP(p); p = 0; } }, flush: () => { if (p) A.addXP(p); p = 0; } }; }
  // compact line of stats above a drill: [label, id, value]
  const meta = (items) => `<div class="meta">${items.map(([label, id, v, cls]) => `<span class="${cls || ''}">${label ? label + ' ' : ''}<b id="${id}">${v}</b></span>`).join('')}</div>`;
  A.meta = meta;
  // after a wrong answer: the right play, why, and a Next button (no auto-skip)
  function wrongPanel(el, title, why, onNext, id = 'gi') {
    el.className = 'fb bad';
    el.innerHTML = `<b>${title}</b><span class="small">${esc(why)}</span><button class="btn sm" id="${id}">Next ${A.icon('chevron')}</button>`;
    el.querySelector('#' + id).onclick = onNext;
  }
  A.wrongPanel = wrongPanel;

  // Result screen used by every drill: the score, at most a few stats, mistakes folded away, and a clear Next
  function result(root, o) {
    const S = A.S, here = A.current, nx = A.nextAfter(here);
    const misses = o.misses && o.misses.length ? o.misses.slice(0, 10) : null;
    root.innerHTML = `<div class="result">
      ${o.rec ? `<div class="pill gold pb">${A.icon('trophy')} New personal best</div>` : ''}
      <div class="kicker">${esc(o.kicker || 'Result')}</div><div class="big-num">${o.big}</div><p class="muted">${o.sub || ''}</p>
      ${o.stats ? `<div class="stats">${o.stats.map(([k, v]) => `<div><b>${v}</b><span>${esc(k)}</span></div>`).join('')}</div>` : ''}
      ${o.note ? `<p class="resnote">${o.note}</p>` : ''}
      ${misses ? `<details><summary>Review ${misses.length} mistake${misses.length > 1 ? 's' : ''}</summary><div class="misses">${misses.map((m) => `<div class="miss"><b>${esc(m.t)}</b><span>${esc(m.a)}</span>${m.w ? `<small>${esc(m.w)}</small>` : ''}</div>`).join('')}</div></details>` : ''}
      ${o.args && o.args.wk
        ? `<button class="btn big" id="wkn">Continue workout ${A.icon('chevron')}</button><button class="btn ghost" id="ag">${esc(o.againLabel || 'Go again')}</button>`
        : `<button class="btn next" id="nxt"><span class="nextlbl">Next</span>${esc(nx.label)}</button><div class="btnrow"><button class="btn ghost" id="ag">${esc(o.againLabel || 'Go again')}</button><button class="btn ghost" id="dn">Done</button></div>`}
    </div>`;
    A.countUp($('.big-num', root), String(o.big));
    if (o.rec) { A.confetti(); A.fx.win(); }
    const w = $('#wkn', root); if (w) w.onclick = () => A.wkNext();
    const n = $('#nxt', root); if (n) n.onclick = () => A.replace(nx.s, nx.a);
    $('#ag', root).onclick = o.again;
    const d = $('#dn', root); if (d) d.onclick = () => A.back();
    S && A.save();
  }

  // ---------- a real hand: your action is played out, the dealer plays, the hand is settled ----------
  // The cards still to come. With a true count, they match it: at +4 the low cards are gone and tens are
  // more likely, at -4 the reverse, so the play-out shows what really tends to happen at that count.
  function countedShoe(tc) {
    const left = B.isDD() ? 1 : 3, s = B.shoe(left); // about half the cards are still to be dealt
    let k = tc === null || tc === undefined ? 0 : Math.round(Math.abs(tc) * left);
    const gone = tc > 0 ? 1 : -1; // positive count: low cards (+1) have been played; negative: high cards (-1)
    for (let i = s.length - 1; i >= 0 && k > 0; i--) if (B.hilo(s[i].r) === gone) { s.splice(i, 1); k--; }
    return s;
  }
  function makeHand({ cards, up, upCard, tc = null, firstOpts = {} }) {
    const shoe = tc === null || tc === undefined ? B.shoe(B.isDD() ? 2 : 6) : countedShoe(tc);
    for (const c of [upCard, ...cards]) { const i = shoe.findIndex((x) => x.r === c.r); if (i >= 0) shoe.splice(i, 1); }
    // the dealer has already peeked, so the hole card can't complete a blackjack
    const bad = up === 11 ? 10 : up === 10 ? 11 : -1;
    let hi = shoe.length - 1; while (hi > 0 && B.rv(shoe[hi].r) === bad) hi--;
    const hole = shoe.splice(hi, 1)[0]; hole.down = true;
    const G = { up, tc, shoe, dealer: [upCard, hole], hands: [{ cards, bet: 1 }], act: 0, done: false };
    G.draw = () => { const c = G.shoe.pop(); c.anim = 1; return c; };
    G.cur = () => G.hands[G.act];
    G.options = (h) => {
      const two = h.cards.length === 2, first = G.hands.length === 1 && !h.fromSplit && two;
      return { canDouble: two && !h.splitAces && (!first || firstOpts.canDouble !== false), canSplit: two && B.isPair(h.cards) && G.hands.length < 4 && !h.splitAces,
        canSurrender: first && B.rules().ls && firstOpts.canSurrender !== false };
    };
    G.apply = (a) => { // returns true while the player still has decisions to make
      const h = G.cur();
      if (a === 'H') { h.cards.push(G.draw()); if (B.value(h.cards).total >= 21) h.done = true; }
      else if (a === 'S') h.done = true;
      else if (a === 'D') { h.bet *= 2; h.cards.push(G.draw()); h.done = true; }
      else if (a === 'R') { h.surr = true; h.done = true; }
      else if (a === 'P') {
        const c2 = h.cards.pop(), aces = h.cards[0].r === 'A', nh = { cards: [c2], bet: h.bet, fromSplit: true }; h.fromSplit = true;
        h.cards.push(G.draw()); nh.cards.push(G.draw()); G.hands.splice(G.act + 1, 0, nh);
        if (aces) h.done = nh.done = h.splitAces = nh.splitAces = true;
      }
      for (;;) { // skip hands that are finished (or a split hand that made 21)
        while (G.act < G.hands.length && G.hands[G.act].done) G.act++;
        if (G.act < G.hands.length && B.value(G.cur().cards).total === 21) { G.cur().done = true; continue; }
        break;
      }
      return G.act < G.hands.length;
    };
    G.live = () => G.hands.some((h) => !h.surr && B.value(h.cards).total <= 21);
    G.dealerHits = () => { const v = B.value(G.dealer); return v.total < 17 || (B.rules().h17 && v.total === 17 && v.soft); };
    G.settle = () => {
      const d = B.value(G.dealer).total; let net = 0;
      for (const h of G.hands) { const p = B.value(h.cards).total; h.res = h.surr ? -0.5 : p > 21 ? -1 : d > 21 || p > d ? 1 : p === d ? 0 : -1; net += h.res * h.bet; }
      G.net = net; G.done = true; return net;
    };
    return G;
  }
  function renderHand(el, G, badge = '') {
    const showD = !G.dealer.some((c) => c.down), dv = B.value(G.dealer);
    const res = (h) => (h.res === undefined ? '' : h.res > 0 ? `<span class="res win">+${h.res * h.bet}</span>` : h.res < 0 ? `<span class="res lose">${h.res * h.bet}</span>` : '<span class="res push">Push</span>');
    const hands = G.hands.map((h, i) => {
      const v = B.value(h.cards), active = !G.done && i === G.act && G.hands.length > 1;
      return `<div class="hand ${active ? 'act' : ''}"><div class="cards">${h.cards.map((c) => A.cardHTML(c)).join('')}</div>
        <div class="tot">${(v.soft && v.total < 21 ? 'soft ' : '') + v.total}${v.total > 21 ? ' · bust' : ''}${h.surr ? ' · surrendered' : ''}${h.bet > 1 ? ' · doubled' : ''}</div>${res(h)}</div>`;
    }).join('');
    el.innerHTML = `${badge}<div class="lbl">Dealer</div><div class="cards">${G.dealer.map((c) => (c.down ? A.cardHTML(null, c.anim ? 'deal' : '', c.anim ? c.delay : 0) : A.cardHTML(c))).join('')}</div>${showD ? `<div class="tot">${dv.total}${dv.total > 21 ? ' · bust' : ''}</div>` : ''}
      <div class="lbl" style="margin-top:12px">You</div><div class="you">${hands}</div>`;
    [G.dealer, ...G.hands.map((h) => h.cards)].forEach((a) => a.forEach((c) => { c.anim = 0; c.flip = 0; c.delay = 0; }));
  }
  // Runs one hand on the felt: takes your decisions, plays them out, then the dealer, then settles.
  function playHand(ui, o) {
    const G = makeHand(o); const timers = []; let clock = null, locked = false, decisions = 0, allGood = true;
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));
    const paint = () => renderHand(ui.felt, G, o.badge || '');
    const enable = () => { const op = G.options(G.cur()); setActs(ui.root, { D: !op.canDouble, P: !op.canSplit, R: !op.canSurrender }); };
    const startClock = () => { if (clock) clock.stop(); if (o.pressure) clock = A.timer(ui.tbar, o.pressure, () => decide(null)); };
    function decide(a) {
      if (locked || G.done) return;
      if (clock) clock.stop();
      const h = G.cur(), op = G.options(h), book = B.play(h.cards, G.up, o.tc, op), good = a === book, first = decisions === 0;
      decisions++; if (!good) allGood = false;
      o.onDecision({ a, book, good, first, cards: h.cards.slice(), op });
      if (!o.playOut) { locked = true; return o.onEnd({ net: null, quick: true, good }); }
      const more = G.apply(a || 'S'); paint();
      if (more) { enable(); startClock(); return; }
      locked = true; setActs(ui.root, { H: 1, S: 1, D: 1, P: 1, R: 1 });
      later(dealerTurn, 420);
    }
    function dealerTurn() {
      const hole = G.dealer[1]; hole.down = false; hole.flip = 1; paint(); A.fx.tap();
      const step = () => { if (G.live() && G.dealerHits()) { G.dealer.push(G.draw()); paint(); later(step, 480); } else later(end, 360); };
      later(step, 620);
    }
    function end() { const net = G.settle(); paint(); net > 0 ? A.fx.ok() : net < 0 ? A.fx.tap() : null; o.onEnd({ net, quick: false, allGood, surr: G.hands.length === 1 && !!G.hands[0].surr }); }
    // dealt like a casino: your card, the dealer's up card, your second card, the dealer's hole card
    o.cards.forEach((c, i) => { c.anim = 1; c.delay = i ? 240 : 0; }); Object.assign(o.upCard, { anim: 1, delay: 120 }); Object.assign(G.dealer[1], { anim: 1, delay: 360 });
    paint(); enable(); startClock();
    return { decide, stop: () => { locked = true; if (clock) clock.stop(); timers.forEach(clearTimeout); } };
  }
  const unitsTxt = (x) => `${x} unit${x === 1 ? '' : 's'}`;
  const handOutcome = (r) => (r.surr
    ? { label: 'Surrendered: half your bet back', note: r.allGood ? 'Right play. Played out, this hand loses more than half a bet on average, so surrendering costs less.' : '' }
    : { allGood: r.allGood });
  // o: { allGood, label, note } — a right play can lose and a wrong one can win; say so, so the result never teaches the wrong lesson
  function outcomeHTML(net, last, o = {}) {
    const head = o.label || (net > 0 ? `You win ${unitsTxt(net)}` : net < 0 ? `You lose ${unitsTxt(-net)}` : 'Push');
    const note = o.note !== undefined ? o.note : o.allGood === true && net < 0 ? 'Right play, unlucky cards. Over many hands it is still the best play.'
      : o.allGood === false && net > 0 ? 'You won this one, but the right play does better over many hands.' : '';
    return `<div class="outcome ${net > 0 ? 'win' : net < 0 ? 'lose' : 'push'}">${head}${note ? `<small>${note}</small>` : ''}</div>
    <button class="btn" id="nh">${last ? 'See results' : 'Next hand'}</button>`;
  }

  // ---------- Adaptive strategy trainer ----------
  const FOCUS = [['all', 'All hands'], ['hard', 'Hard totals'], ['soft', 'Soft hands'], ['pairs', 'Pairs'], ['weak', 'Weak spots']];
  SCREENS.strategy = (args) => {
    const S = A.S, reps = args.reps || 20;
    let group = args.group || 'all', pressure = 0, playOut = S.prof.playOut !== false, streak = 0, hands = 0, n = 0, ok = 0, units = 0, game = null, key = null, tid = 0;
    const pool = xpPool(), misses = [];
    const focusName = () => FOCUS.find((f) => f[0] === group)[1];
    return {
      title: 'Adaptive Trainer',
      right: `<button class="iconbtn" id="rbtn" aria-label="Strategy chart">${A.icon('table')}</button>`,
      onRight: () => go('chart'),
      html: `${meta([['', 'rp', `0/${reps}`], ['Streak', 'sk', 0], ['', 'ac', '–', 'acc']])}
        <div id="tb" class="tbar hide"><i></i></div>
        <div class="felt flashable" id="felt"></div>
        ${actBtns()}
        <div id="fb" class="fb info">${esc(B.rulesLabel())}</div><div id="out"></div>
        <div class="row-sb"><button class="pillbtn" id="focus">Focus <b>${focusName()}</b></button><button class="pillbtn" id="opts">${A.icon('sliders')} Options</button></div>`,
      mount(root) {
        const fb = $('#fb', root), out = $('#out', root), feltEl = $('#felt', root);
        const upd = () => { $('#sk', root).textContent = streak; $('#ac', root).textContent = n ? Math.round((100 * ok) / n) + '%' : '–'; $('#rp', root).textContent = `${hands}/${reps}`; };
        function newHand() {
          if (game) game.stop(); clearTimeout(tid);
          out.innerHTML = ''; fb.className = 'fb info'; fb.textContent = '';
          key = A.pickCell(group); const [row, upS] = key.split('-'), up = +upS;
          const cards = B.cellCards(row), upCard = B.card(B.rankFor(up));
          game = playHand({ root, felt: feltEl, tbar: $('#tb i', root) }, { cards, up, upCard, tc: null, playOut, pressure, onDecision, onEnd });
        }
        function onDecision(d) {
          n++; if (d.first) A.gradeCell(key, d.good); A.hist(1, d.good ? 1 : 0);
          feltEl.classList.remove('good', 'badf'); void feltEl.offsetWidth; feltEl.classList.add(d.good ? 'good' : 'badf');
          if (d.good) { ok++; streak++; A.fx.ok(); pool.add(1); if (streak > S.best.strat) S.best.strat = streak; fb.className = 'fb ok'; fb.innerHTML = `${A.icon('check')} ${B.NAMES[d.a]}`; }
          else {
            streak = 0; A.fx.bad();
            const w = B.why(d.cards, +key.split('-')[1], d.book);
            misses.push({ t: d.first ? B.cellLabel(key) : `${B.value(d.cards).soft ? 'Soft' : 'Hard'} ${B.value(d.cards).total} vs ${B.upName(+key.split('-')[1])}`, a: B.NAMES[d.book], w });
            fb.className = 'fb bad'; fb.innerHTML = `<b>${d.a ? `${B.NAMES[d.book]} was the play, not ${B.NAMES[d.a]}` : `Too slow — ${B.NAMES[d.book]} was the play`}</b><span class="small">${esc(w)}</span>`;
          }
          upd(); A.save();
        }
        function onEnd(r) {
          if (r.quick) { // play-out off: straight to the next hand
            hands++; upd();
            if (r.good) { tid = setTimeout(() => (hands >= reps ? finish() : newHand()), 330); return; }
            out.innerHTML = `<button class="btn" id="nh">${hands >= reps ? 'See results' : 'Next hand'}</button>`;
          } else { hands++; units += r.net; upd(); out.innerHTML = outcomeHTML(r.net, hands >= reps, handOutcome(r)); }
          $('#nh', out).onclick = () => (hands >= reps ? finish() : newHand());
        }
        function finish() {
          if (game) game.stop(); clearTimeout(tid); pool.flush();
          result(root, { kicker: `${focusName()} · ${hands} hands`, big: n ? Math.round((100 * ok) / n) + '%' : '0%', sub: `${ok} of ${n} decisions correct${playOut ? ` · ${units > 0 ? 'won ' + unitsTxt(units) : units < 0 ? 'lost ' + unitsTxt(-units) : 'broke even'}` : ''}`, args, misses, good: ok === n,
            note: ok === n ? 'A perfect set.' : 'The hands you missed will come back sooner until you get them right.',
            again: () => A.replace('strategy', Object.assign({}, args, { group })) });
        }
        $$('[data-a]', root).forEach((b) => (b.onclick = () => game && game.decide(b.dataset.a)));
        $('#focus', root).onclick = () => A.sheet(`<h3 class="m0">Focus</h3><p class="muted small">Which hands should come up?</p><div class="opts">${FOCUS.map(([v, t]) => `<button class="opt" data-f="${v}"><b>${t}</b>${v === group ? '<small>Current</small>' : ''}</button>`).join('')}</div>`, (r, close) => {
          $$('[data-f]', r).forEach((b) => (b.onclick = () => { group = b.dataset.f; close(); $('#focus b', root).textContent = focusName(); newHand(); }));
        });
        $('#opts', root).onclick = () => A.sheet(`<h3 class="m0">Options</h3>
          <div class="tgl"><span>Play hands out<br><small class="muted">See the cards, the dealer and the result</small></span><button class="switch ${playOut ? 'on' : ''}" id="po"><i></i></button></div>
          <label>Pressure (time per decision)</label><div class="seg" id="pz">${[[0, 'Off'], [3000, '3s'], [2000, '2s'], [1500, '1.5s']].map(([v, t]) => `<button data-v="${v}" class="${pressure === v ? 'on' : ''}">${t}</button>`).join('')}</div>
          <button class="btn" id="oc" style="margin-top:14px">Done</button>`, (r, close) => {
          $('#po', r).onclick = (e) => { playOut = !playOut; S.prof.playOut = playOut; A.save(); e.currentTarget.classList.toggle('on', playOut); };
          $$('#pz button', r).forEach((b) => (b.onclick = () => { pressure = +b.dataset.v; $$('#pz button', r).forEach((x) => x.classList.toggle('on', x === b)); }));
          $('#oc', r).onclick = () => { close(); $('#tb', root).classList.toggle('hide', !pressure); newHand(); };
        });
        upd(); newHand();
        return () => { if (game) game.stop(); clearTimeout(tid); pool.flush(); };
      }
    };
  };

  // ---------- Blitz ----------
  SCREENS.blitz = (args) => {
    const S = A.S; let score = 0, n = 0, cur, tmr, started = false, lock = false; const misses = [];
    return {
      title: 'Strategy Blitz',
      html: `<div id="bz"><div class="intro card"><div class="big-num">60s</div><p>Answer as many hands as you can. <b>Right = +1. Wrong = −3 seconds.</b></p><p class="muted small">Best: ${S.best.blitz}</p><button class="btn big" id="st">Start</button></div></div>`,
      mount(root) {
        const bz = $('#bz', root);
        const start = () => {
          started = true;
          bz.innerHTML = `${meta([['Score', 'sc', 0], ['', 'tl', 60], ['Best', 'bsx', S.best.blitz]])}
            <div class="tbar"><i></i></div>${felt(`<div class="lbl">Dealer</div><div class="cards" id="dl"></div><div class="lbl">You</div><div class="cards" id="pl"></div><div class="tot" id="pt"></div>`, 'compact flashable')}${actBtns()}`;
          tmr = A.timer($('.tbar i', bz), 60000, end, (left) => { const t = $('#tl', bz); if (t) t.textContent = Math.max(0, Math.ceil(left / 1000)); });
          $$('[data-a]', bz).forEach((b) => (b.onclick = () => answer(b.dataset.a)));
          deal();
        };
        const deal = () => {
          if (!$('#dl', bz)) return; // round already over
          const key = A.pickCell('all'), [row, upS] = key.split('-'), up = +upS, cards = B.cellCards(row);
          cur = { key, cards, up, ans: B.play(cards, up, null) };
          $('#dl', bz).innerHTML = A.cardHTML(B.card(B.rankFor(up))) + A.cardHTML(null);
          $('#pl', bz).innerHTML = cards.map((c) => A.cardHTML(c)).join('');
          $('#pt', bz).textContent = handTotal(cards);
          setActs(bz, { P: !B.isPair(cards), R: !B.rules().ls }); lock = false;
        };
        const answer = (a) => {
          const fl = $('.felt', bz); if (lock || !fl) return;
          n++; const good = a === cur.ans; A.gradeCell(cur.key, good); A.hist(1, good ? 1 : 0);
          fl.classList.remove('good', 'badf'); void fl.offsetWidth;
          if (good) { score++; A.fx.ok(); fl.classList.add('good'); $('#sc', bz).textContent = score; deal(); }
          else {
            A.fx.bad(); fl.classList.add('badf'); tmr.add(-3000); lock = true;
            misses.push({ t: B.cellLabel(cur.key), a: B.NAMES[cur.ans], w: B.why(cur.cards, cur.up, cur.ans) });
            $('#pt', bz).innerHTML = `<span class="bad-t">${B.NAMES[cur.ans]}</span>`;
            setTimeout(deal, 650);
          }
        };
        const end = () => {
          const rec = A.record('blitz', score); A.addXP(score + 5);
          result(bz, { kicker: 'Blitz score', big: score, sub: `${n ? Math.round((100 * score) / n) : 0}% accuracy · ${n} hands`, rec, args, misses,
            note: score >= 40 ? 'Casino speed.' : score >= 25 ? 'Getting fast — push for 40.' : 'Speed comes from reps. The adaptive trainer will fix the hands you missed.', good: score >= 40,
            again: () => A.replace('blitz', Object.assign({}, args)) });
        };
        $('#st', bz).onclick = start;
        if (args.wk) start();
        return () => { if (tmr) tmr.stop(); };
      }
    };
  };

  // ---------- Reflex & Pairs (60s value drills) ----------
  function valueDrill(kind) {
    return (args) => {
      const S = A.S, two = kind === 'pairs'; let score = 0, n = 0, ans = 0, tmr, t0 = 0, rts = [];
      const btns = two ? [2, 1, 0, -1, -2] : [1, 0, -1];
      return {
        title: two ? 'Pair Cancellation' : 'Reflex',
        html: `<div id="vd"><div class="intro card"><div class="big-num">60s</div><p>${two ? 'Two cards — tap their combined Hi-Lo value.' : 'Tap each card\'s Hi-Lo value: <b>+1</b> for 2–6, <b>0</b> for 7–9, <b>−1</b> for 10–A.'}</p><p class="muted small">Best: ${S.best[kind]}</p><button class="btn big" id="st">Start</button></div></div>`,
        mount(root) {
          const vd = $('#vd', root);
          const start = () => {
            vd.innerHTML = `${meta([['Score', 'sc', 0], ['', 'tl', 60], ['Best', 'bsx', S.best[kind]]])}<div class="tbar"><i></i></div>
              <div class="flashcard" id="fc"></div><div class="vals ${two ? 'five' : ''}">${btns.map((v) => `<button class="val ${v > 0 ? 'pos' : v < 0 ? 'neg' : ''}" data-v="${v}">${sgn(v)}</button>`).join('')}</div>`;
            tmr = A.timer($('.tbar i', vd), 60000, end, (l) => { const t = $('#tl', vd); if (t) t.textContent = Math.max(0, Math.ceil(l / 1000)); });
            $$('[data-v]', vd).forEach((b) => (b.onclick = () => answer(+b.dataset.v)));
            next();
          };
          const next = () => {
            const cs = two ? [B.card(pick(B.RANKS)), B.card(pick(B.RANKS))] : [B.card(pick(B.RANKS))];
            ans = cs.reduce((s, c) => s + B.hilo(c.r), 0);
            $('#fc', vd).innerHTML = cs.map((c) => A.cardHTML(Object.assign(c, { anim: 1 }), 'big')).join(''); t0 = performance.now();
          };
          const answer = (v) => {
            n++; rts.push(performance.now() - t0); const good = v === ans; A.hist(1, good ? 1 : 0);
            const fc = $('#fc', vd); fc.classList.remove('good', 'badf'); void fc.offsetWidth; fc.classList.add(good ? 'good' : 'badf');
            if (good) { score++; A.fx.ok(); $('#sc', vd).textContent = score; } else { A.fx.bad(); tmr.add(-1000); }
            next();
          };
          const end = () => {
            const rec = A.record(kind, score); A.addXP(Math.round(score / 2) + 5);
            const avg = rts.length ? rts.reduce((a, b) => a + b, 0) / rts.length / 1000 : 0;
            result(vd, { kicker: two ? 'Pairs score' : 'Reflex score', big: score, sub: `${n ? Math.round((100 * score) / n) : 0}% accuracy · ${avg.toFixed(2)}s per answer`, rec, args,
              note: two ? (score >= 40 ? 'Pairs are automatic.' : 'Aim for 40 or more — high plus low is zero, no thinking.') : (score >= 60 ? 'Instant recognition.' : 'Aim for 60 or more. Wrong answers cost a second.'), good: score >= (two ? 40 : 60),
              again: () => A.replace(kind, Object.assign({}, args)) });
          };
          $('#st', vd).onclick = start;
          if (args.wk) start();
          return () => { if (tmr) tmr.stop(); };
        }
      };
    };
  }
  SCREENS.reflex = valueDrill('reflex');
  SCREENS.pairs = valueDrill('pairs');

  // ---------- Deck countdown ----------
  SCREENS.deck = (args) => {
    const S = A.S, st = { size: 52, speed: 0, per: 1 }; let timerId = 0;
    const setup = () => `<div class="card"><p>Count down a shuffled deck. 1–3 cards are held back, so the answer is rarely 0.</p>
      <label>Cards</label><div class="seg" data-g="size"><button data-v="52">Full deck</button><button data-v="26">Half deck</button></div>
      <label>Pace</label><div class="seg" data-g="speed"><button data-v="0">Tap (timed)</button><button data-v="900">Slow</button><button data-v="550">Med</button><button data-v="350">Fast</button><button data-v="220">Pro</button></div>
      <label>Cards per flash</label><div class="seg" data-g="per"><button data-v="1">1</button><button data-v="2">2</button><button data-v="3">3</button></div>
      <p class="tiny muted">Benchmark: a perfect full deck in 25 seconds. Best: ${S.best.deck !== null ? S.best.deck.toFixed(1) + 's' : '—'}</p>
      <button class="btn big" id="st">Start</button></div>`;
    return {
      title: 'Deck Countdown',
      html: '<div id="dw"></div>',
      mount(root) {
        const dw = $('#dw', root);
        const bindSetup = () => {
          dw.innerHTML = setup();
          $$('.seg', dw).forEach((g) => { const k = g.dataset.g; $$('button', g).forEach((b) => { b.classList.toggle('on', String(st[k]) === b.dataset.v); b.onclick = () => { st[k] = +b.dataset.v; bindSetup(); }; }); });
          $('#st', dw).onclick = run;
        };
        const run = () => {
          const n = st.size - (1 + rnd(3)), cards = B.shoe(1).slice(0, n), answer = cards.reduce((s, c) => s + B.hilo(c.r), 0);
          let i = 0; const t0 = performance.now();
          dw.innerHTML = `<div class="flashcard tall" id="fc"></div><div class="prog"><i id="pg"></i></div><div class="muted small center" id="pr">0 / ${n}</div>${st.speed ? '' : '<button class="btn big" id="nx">Next ›</button>'}`;
          const step = () => {
            if (i >= n) return finish((performance.now() - t0) / 1000);
            const grp = cards.slice(i, i + st.per); i += grp.length;
            $('#fc', dw).innerHTML = grp.map((c) => A.cardHTML(Object.assign(c, { anim: 1 }), 'big')).join('');
            $('#pr', dw).textContent = `${i} / ${n}`; $('#pg', dw).style.width = (100 * i) / n + '%';
            if (st.speed) timerId = setTimeout(step, st.speed * grp.length);
          };
          step(); if (!st.speed) { $('#nx', dw).onclick = step; $('#fc', dw).onclick = step; }
          function finish(secs) {
            const p = A.pad((g) => {
              const good = g === answer; A.hist(1, good ? 1 : 0);
              const full = st.size === 52, rec = good && full ? A.record('deck', +secs.toFixed(1)) : false;
              A.addXP(good ? (full ? 25 : 12) : 5);
              good ? A.fx.ok() : A.fx.bad();
              result(dw, { kicker: good ? 'Correct' : 'Not quite', big: good ? secs.toFixed(1) + 's' : sgn(answer), sub: good ? `count ${sgn(answer)} · ${(secs / n).toFixed(2)}s per card` : `You said ${sgn(g)}. Took ${secs.toFixed(1)}s.`, rec, args, good: good && secs <= 25 && full,
                note: !good ? 'Slow down until you\'re perfect, then speed up.' : full && secs <= 25 ? 'Casino-ready speed.' : 'Goal: a perfect full deck in 25 seconds.',
                again: () => run() });
              if (!args.wk) { const s2 = document.createElement('button'); s2.className = 'btn ghost'; s2.textContent = 'Change settings'; s2.onclick = bindSetup; $('.result', dw).appendChild(s2); }
            }, { label: 'Check count' });
            dw.innerHTML = `<h2 class="center">What's the count?</h2>${p.html}`; p.bind(dw);
          }
        };
        if (args.wk) { st.size = 52; run(); } else bindSetup();
        return () => clearTimeout(timerId);
      }
    };
  };

  // ---------- Speed ladder ----------
  SCREENS.ladder = (args) => {
    const S = A.S; let speed = 1.2, lives = 3, top = 0, rounds = 0, tid = 0;
    return {
      title: 'Speed Ladder',
      html: `<div id="lw"><div class="intro card"><div class="big-num">↗</div><p>12 cards flash automatically. Get the count right and the next round is <b>20% faster</b>. Three misses and you're out.</p><p class="muted small">Best: ${S.best.ladder ? S.best.ladder.toFixed(1) + ' cards/sec' : '—'}</p><button class="btn big" id="st">Start</button></div></div>`,
      mount(root) {
        const lw = $('#lw', root);
        const round = () => {
          const cards = B.shoe(1).slice(0, 12), ans = cards.reduce((s, c) => s + B.hilo(c.r), 0); let i = 0;
          lw.innerHTML = `${meta([['Speed', 'spd', speed.toFixed(1) + '/s'], ['Lives', 'lv', lives + '/3'], ['Top', 'tp', top ? top.toFixed(1) + '/s' : '–']])}
            <div class="flashcard tall" id="fc"></div><div class="prog"><i id="pg"></i></div>`;
          const step = () => {
            if (i >= cards.length) return ask();
            $('#fc', lw).innerHTML = A.cardHTML(Object.assign(cards[i], { anim: 1 }), 'big'); i++; $('#pg', lw).style.width = (100 * i) / 12 + '%';
            tid = setTimeout(step, 1000 / speed);
          };
          const ask = () => {
            const p = A.pad((g) => {
              rounds++; const good = g === ans; A.hist(1, good ? 1 : 0);
              if (good) { A.fx.ok(); top = Math.max(top, speed); speed *= 1.2; A.addXP(6); A.toast(`✓ ${sgn(ans)} — faster!`, 'good'); }
              else { A.fx.bad(); lives--; speed = Math.max(0.8, speed * 0.9); A.toast(`✗ It was ${sgn(ans)}`, 'bad'); }
              if (lives <= 0) return end(); round();
            }, { label: 'Check' });
            lw.innerHTML = `<h2 class="center">Count?</h2>${p.html}`; p.bind(lw);
          };
          step();
        };
        const end = () => {
          const rec = top ? A.record('ladder', +top.toFixed(2)) : false;
          result(lw, { kicker: 'Top speed', big: top ? top.toFixed(1) : '0', sub: `cards per second · ${rounds} rounds`, rec, args, good: top >= 3,
            note: top >= 3 ? 'That\'s faster than most dealers.' : 'Real tables run 2–3 cards per second at times. Keep climbing.', again: () => A.replace('ladder', Object.assign({}, args)) });
        };
        $('#st', lw).onclick = round;
        if (args.wk) round();
        return () => clearTimeout(tid);
      }
    };
  };

  // ---------- Speed count ----------
  // Hold the running count at dealer speed. The cards keep coming; now and then the stream stops and asks for the count,
  // the way you need it the moment you bet. A speed (cards a minute) is certified when every stop is right over a deck or more.
  const SPEED_LVLS = [60, 80, 100, 120, 150, 180, 210, 240];
  const SPEED_STYLES = [['single', 'One at a time'], ['pair', 'Two at a time'], ['table', 'Table rounds']];
  const speedName = (v) => (v >= 240 ? 'Pro' : v >= 180 ? 'Fast dealer' : v >= 120 ? 'Casino speed' : v >= 100 ? 'Almost there' : 'Learning');
  SCREENS.speed = (args) => {
    const S = A.S, best = () => S.best.speed || 0;
    const nextLvl = () => SPEED_LVLS.find((v) => v > best()) || SPEED_LVLS[SPEED_LVLS.length - 1];
    const st = {
      cpm: SPEED_LVLS.includes(args.cpm) ? args.cpm : nextLvl(),
      style: SPEED_STYLES.some((s) => s[0] === args.style) ? args.style : 'single',
      len: [26, 52, 104].includes(args.len) ? args.len : 52
    };
    let tid = 0;
    return {
      title: 'Speed Count',
      html: '<div id="sw"></div>',
      mount(root) {
        const sw = $('#sw', root);
        const later = (fn, ms) => { clearTimeout(tid); tid = setTimeout(fn, ms); };

        function setup() {
          clearTimeout(tid);
          sw.innerHTML = `<div class="card">
            <div class="kicker">Your certified speed</div>
            <h3 class="m0">${best() ? `${best()} cards a minute · ${speedName(best())}` : 'None yet'}</h3>
            <p class="muted small">Cards keep coming at dealer speed. Now and then the stream stops: enter the running count. Get every stop right over a deck or more and that speed is yours.</p>
            <label>Speed (cards a minute)</label>
            <div class="lvls">${SPEED_LVLS.map((v) => `<button class="lvl ${v === st.cpm ? 'on' : ''} ${v <= best() ? 'done' : ''}" data-v="${v}" aria-label="${v} cards a minute${v <= best() ? ', certified' : ''}"><b>${v}</b><small>${+(v / 60).toFixed(1)}/sec</small></button>`).join('')}</div>
            <label>How the cards come</label>
            <div class="seg" data-g="style">${SPEED_STYLES.map(([v, t]) => `<button data-v="${v}" class="${st.style === v ? 'on' : ''}">${t}</button>`).join('')}</div>
            <label>Length</label>
            <div class="seg" data-g="len">${[[26, 'Half deck'], [52, '1 deck'], [104, '2 decks']].map(([v, t]) => `<button data-v="${v}" class="${st.len === v ? 'on' : ''}">${t}</button>`).join('')}</div>
            <p class="tiny muted">${st.style === 'table' ? 'Table rounds: two or three players and the dealer. The hole card only counts once it is turned over. ' : ''}Casino speed is about 120 a minute, a deck in 26 seconds. Half-deck runs are practice and don't certify a speed.</p>
            <button class="btn big" id="go">Start · ${st.cpm} a minute</button></div>`;
          $$('.lvl', sw).forEach((b) => (b.onclick = () => { st.cpm = +b.dataset.v; setup(); }));
          $$('.seg', sw).forEach((g) => $$('button', g).forEach((b) => (b.onclick = () => { const k = g.dataset.g; st[k] = k === 'len' ? +b.dataset.v : b.dataset.v; setup(); })));
          $('#go', sw).onclick = run;
        }

        function run() {
          clearTimeout(tid);
          const ms = 60000 / st.cpm, table = st.style === 'table', per = st.style === 'pair' ? 2 : 1;
          let rc = 0, shown = 0, stops = 0, right = 0, sinceStop = 0, nextStop = 13 + rnd(14);
          const misses = [];
          sw.innerHTML = `${meta([['', 'sp', st.cpm + '/min'], ['Cards', 'cn', `0/${st.len}`], ['Stops', 'ck', '0/0']])}
            <div id="stage">${table
              ? `<div class="felt sptable"><div class="lbl">Dealer</div><div class="dl" id="dl"></div><div class="seats">${[0, 1, 2].map((k) => `<div class="seat" id="s${k}"></div>`).join('')}</div></div>`
              : '<div class="flashcard tall" id="fc"></div>'}
            <div class="prog"><i id="pg"></i></div></div><div id="ckp"></div>`;
          const stage = $('#stage', sw), ckp = $('#ckp', sw);
          const upd = () => {
            $('#cn', sw).textContent = `${Math.min(shown, st.len)}/${st.len}`; $('#ck', sw).textContent = `${right}/${stops}`;
            $('#pg', sw).style.width = Math.min(100, (100 * shown) / st.len) + '%';
          };
          const see = (c) => { rc += B.hilo(c.r); shown++; sinceStop++; };

          // a stop: the cards are hidden, you give the running count, then the stream carries on (or the run ends)
          function stop(last, resume) {
            stops++; stage.style.display = 'none';
            const p = A.pad((g) => {
              const good = g === rc; if (good) right++;
              A.hist(1, good ? 1 : 0); good ? A.fx.ok() : A.fx.bad(); upd();
              if (!good) misses.push({ t: `Stop ${stops}, after ${shown} cards`, a: `The count was ${sgn(rc)}`, w: `You said ${sgn(g)}` });
              if (last) return finish();
              const go = () => { ckp.innerHTML = ''; stage.style.display = ''; sinceStop = 0; nextStop = 13 + rnd(14); resume(); };
              if (good) { ckp.innerHTML = `<div class="fb ok">${A.icon('check')} ${sgn(rc)}, keep going</div>`; return later(go, 700); }
              ckp.innerHTML = `<div class="fb bad"><b>It's ${sgn(rc)}</b><span class="small">You said ${sgn(g)}. Carry on from ${sgn(rc)}.</span><button class="btn sm" id="kg">Keep going ${A.icon('chevron')}</button></div>`;
              $('#kg', ckp).onclick = go;
            }, { label: 'Check' });
            ckp.innerHTML = `<div class="stopcard"><div class="kicker">${last ? 'End of the run' : `Stop ${stops}`}</div><h2 class="m0">What's the running count?</h2></div>${p.html}`;
            p.bind(ckp); A.fx.tap();
          }

          if (!table) {
            // one or two cards at a time, each group on screen for its share of the minute
            const cards = B.shoe(Math.ceil(st.len / 52)).slice(0, st.len), fc = $('#fc', sw), anim = ms >= 400 ? 1 : 0; let i = 0;
            const step = () => {
              if (i >= cards.length) return stop(true);
              if (sinceStop >= nextStop && cards.length - i > 8) return stop(false, step);
              const grp = cards.slice(i, i + per); i += grp.length;
              fc.innerHTML = grp.map((c) => A.cardHTML(Object.assign(c, { anim }), 'big')).join('');
              grp.forEach(see); upd();
              later(step, ms * grp.length);
            };
            upd(); return later(step, 500);
          }

          // table rounds: dealt in casino order, players hit, the hole card is turned over, the dealer draws, the cards are scooped
          const shoe = B.shoe(Math.ceil(st.len / 52) + 1), dl = $('#dl', sw), seatEl = [0, 1, 2].map((k) => $('#s' + k, sw));
          const dealerHits = (cards) => { const v = B.value(cards); return v.total < 17 || (B.rules().h17 && v.total === 17 && v.soft); };
          function round() {
            if (shown + 10 > st.len) return stop(true);
            if (sinceStop >= nextStop) return stop(false, round);
            const seats = [0, 1, 2]; if (Math.random() < 0.45) seats.splice(rnd(3), 1); // two or three players
            const hands = [[], [], []], dealer = [], ev = [];
            for (let pass = 0; pass < 2; pass++) {
              for (const s of seats) { const c = shoe.pop(); hands[s].push(c); ev.push({ s, c }); }
              const c = shoe.pop(); dealer.push(c); ev.push({ s: 'd', c, down: pass === 1 });
            }
            const up = B.rv(dealer[0].r);
            for (const s of seats) {
              for (;;) { // the other players play roughly by the book
                const v = B.value(hands[s]); if (v.total >= 21) break;
                const hit = v.total <= 11 || (v.soft && v.total <= 17) || (!v.soft && v.total <= 16 && up >= 7) || (!v.soft && v.total === 12 && up <= 3);
                if (!hit) break;
                const c = shoe.pop(); hands[s].push(c); ev.push({ s, c });
              }
            }
            ev.push({ s: 'd', flip: dealer[1] });
            if (seats.some((s) => B.value(hands[s]).total <= 21 && !B.isBJ(hands[s]))) while (dealerHits(dealer)) { const c = shoe.pop(); dealer.push(c); ev.push({ s: 'd', c }); }
            dl.innerHTML = ''; seatEl.forEach((el, k) => { el.innerHTML = ''; el.className = 'seat' + (seats.includes(k) ? '' : ' empty'); });
            let j = 0;
            const next = () => {
              if (j >= ev.length) { // let the finished round sit for a moment, then scoop it
                return later(() => { dl.innerHTML = ''; seatEl.forEach((el) => (el.innerHTML = '')); later(round, Math.max(300, ms)); }, Math.max(700, 2 * ms));
              }
              const e = ev[j++];
              if (e.flip) { const h = dl.children[1]; const html = A.cardHTML(Object.assign(e.flip, { flip: 1 }), 'sm'); e.flip.flip = 0; if (h) h.outerHTML = html; see(e.flip); }
              else if (e.down) dl.insertAdjacentHTML('beforeend', A.cardHTML(null, 'sm deal'));
              else {
                const el = e.s === 'd' ? dl : seatEl[e.s];
                el.insertAdjacentHTML('beforeend', A.cardHTML(Object.assign(e.c, { anim: 1 }), 'sm')); e.c.anim = 0;
                if (el !== dl && el.children.length >= 4) el.classList.add('many');
                see(e.c);
              }
              upd(); later(next, ms);
            };
            next();
          }
          upd(); later(round, 500);

          function finish() {
            clearTimeout(tid);
            const clean = right === stops, cert = clean && st.len >= 52, newBest = cert && st.cpm > best();
            if (newBest) { S.best.speed = st.cpm; A.save(); }
            A.addXP(right * 3 + (cert ? 20 : 0));
            const up = SPEED_LVLS.find((v) => v > st.cpm);
            result(sw, {
              kicker: `${st.cpm} a minute · ${SPEED_STYLES.find((s) => s[0] === st.style)[1].toLowerCase()}`,
              big: `${right}/${stops}`, sub: `stops right · ${shown} cards`, rec: newBest, args, misses, good: clean,
              note: cert ? (up ? `${st.cpm} a minute is certified. Next up: ${up}.` : 'Top speed certified. Faster than nearly any dealer.')
                : clean ? 'Clean run. Count a full deck or more to certify this speed.' : 'Drop a speed until every stop is right, then push again.',
              againLabel: cert && up && !args.wk ? `Try ${up} a minute` : 'Go again',
              again: () => { if (cert && up && !args.wk) st.cpm = up; run(); }
            });
            if (!args.wk) { const b2 = document.createElement('button'); b2.className = 'btn ghost'; b2.textContent = 'Change settings'; b2.onclick = setup; $('.result', sw).appendChild(b2); }
          }
        }

        if (args.wk) run(); else setup();
        return () => clearTimeout(tid);
      }
    };
  };

  // ---------- Table flash ----------
  SCREENS.flash = (args) => {
    const S = A.S; let level = Math.max(1, (S.best.flash || 1) - 2), lives = 3, cleared = 0, tmr, rounds = 0;
    return {
      title: 'Table Flash',
      html: `<div id="tw"><div class="intro card"><div class="big-num">◎</div><p>A whole round is shown for a split second. Count it at a glance — then the cards are gone. Each level adds players and cuts the time.</p><p class="muted small">Best: level ${S.best.flash || 0}</p><button class="btn big" id="st">Start at level ${level}</button></div></div>`,
      mount(root) {
        const tw = $('#tw', root);
        const round = () => {
          const players = Math.min(1 + Math.ceil(level / 2), 6), ms = Math.max(700, 4500 - 350 * (level - 1));
          const hands = []; for (let p = 0; p < players; p++) { const h = [B.card(pick(B.RANKS)), B.card(pick(B.RANKS))]; if (Math.random() < 0.3) h.push(B.card(pick(B.RANKS))); hands.push(h); }
          const up = B.card(pick(B.RANKS)), all = [up].concat(...hands), ans = all.reduce((s, c) => s + B.hilo(c.r), 0);
          tw.innerHTML = `${meta([['Level', 'lvl', level], ['View', 'vt', (ms / 1000).toFixed(1) + 's'], ['Lives', 'lv', lives + '/3']])}
            <div class="tbar"><i></i></div><div class="felt table-flash"><div class="lbl">Dealer</div><div class="cards">${A.cardHTML(up, 'sm')}</div>
            <div class="seats">${hands.map((h) => `<div class="cards mini">${h.map((c) => A.cardHTML(c, 'sm')).join('')}</div>`).join('')}</div></div>`;
          tmr = A.timer($('.tbar i', tw), ms, () => {
            const p = A.pad((g) => {
              rounds++; const good = g === ans; A.hist(1, good ? 1 : 0);
              if (good) { A.fx.ok(); cleared = Math.max(cleared, level); level++; A.addXP(5 + level); A.toast(`✓ ${sgn(ans)} — level ${level}`, 'good'); }
              else { A.fx.bad(); lives--; A.toast(`✗ That round was ${sgn(ans)}`, 'bad'); level = Math.max(1, level - 1); }
              if (lives <= 0) return end(); round();
            }, { label: 'Check' });
            tw.innerHTML = `<h2 class="center">That round's count?</h2><p class="muted center small">Dealer up card + ${players} hands</p>${p.html}`; p.bind(tw);
          });
        };
        const end = () => {
          const rec = cleared ? A.record('flash', cleared) : false;
          result(tw, { kicker: 'Highest level cleared', big: cleared, sub: `${rounds} rounds`, rec, args, good: cleared >= 8,
            note: cleared >= 8 ? 'You read tables like a pro.' : 'Count hands, not cards: cancel pairs inside each hand.', again: () => A.replace('flash', Object.assign({}, args)) });
        };
        $('#st', tw).onclick = round;
        if (args.wk) round();
        return () => { if (tmr) tmr.stop(); };
      }
    };
  };

  // ---------- discard tray graphic ----------
  function tray(played, total = gameDecks()) {
    const h = Math.round((played / total) * 100);
    return `<div class="tray ${total <= 2 ? 'dd' : ''}"><div class="tray-in"><div class="stack" style="height:${h}%"></div></div><div class="tray-lbl">${total}-deck discard tray</div></div>`;
  }
  A.tray = tray;
  const gameDecks = () => (B.isDD() ? 2 : 6);
  // decks left for drills: half decks in a 6-deck shoe; half decks (TC) or quarter decks (tray) in double deck
  const randLeft = (quarter) => (B.isDD() ? (quarter ? (1 + rnd(7)) / 4 : (1 + rnd(3)) / 2) : (1 + rnd(11)) / 2);

  // ---------- True count ----------
  SCREENS.tc = (args) => {
    const S = A.S, N = 10; let q = 0, ok = 0, times = [], cur, t0, hard = false;
    const make = () => {
      const left = randLeft(false), dd = B.isDD();
      const rc = dd ? (rnd(2) ? 1 : -1) * (1 + rnd(9)) : Math.round((Math.random() * 2 - 1) * 4 * left + (Math.random() < 0.5 ? rnd(6) : 0));
      cur = { left, rc, ans: B.trueCount(rc, left) };
    };
    return {
      title: 'True Count',
      html: `<div class="seg" id="md"><button class="on" data-v="0">Decks left shown</button><button data-v="1">Read the tray</button></div><div id="tw"></div>`,
      mount(root) {
        const tw = $('#tw', root);
        $$('#md button', root).forEach((b) => (b.onclick = () => { hard = b.dataset.v === '1'; $$('#md button', root).forEach((x) => x.classList.toggle('on', x === b)); q = 0; ok = 0; times = []; ask(); }));
        const ask = () => {
          if (q >= N) return done();
          make(); t0 = performance.now();
          const p = A.pad((g) => {
            const dt = (performance.now() - t0) / 1000; times.push(dt); q++;
            const good = g === cur.ans; if (good) ok++; A.hist(1, good ? 1 : 0); good ? A.fx.ok() : A.fx.bad();
            const math = `${sgn(cur.rc)} ÷ ${cur.left} = ${(cur.rc / cur.left).toFixed(2)}, rounded down`;
            if (good) { $('#res', tw).innerHTML = `<div class="fb ok">${A.icon('check')} ${sgn(cur.ans)} · ${dt.toFixed(1)}s</div>`; setTimeout(ask, 600); }
            else wrongPanel($('#res', tw), `True count ${sgn(cur.ans)}, not ${sgn(g)}`, math, ask, 'tnx');
          }, { label: 'Enter true count', small: true });
          tw.innerHTML = `<div class="qprog">${Array.from({ length: N }, (_, j) => `<i class="${j < q ? 'on' : j === q ? 'cur' : ''}"></i>`).join('')}</div>
            <div class="felt tcfelt"><div class="lbl">Running count</div><div class="rc">${sgn(cur.rc)}</div>${tray(gameDecks() - cur.left)}
            <div class="lbl">${hard ? 'Decks left: <b>?</b>' : `Decks left: <b>${cur.left}</b>`}</div></div><div id="res"></div>${p.html}`;
          p.bind(tw);
        };
        const done = () => {
          const avg = times.reduce((a, b) => a + b, 0) / times.length, rec = ok === N ? A.record('tc', +avg.toFixed(2)) : false;
          A.addXP(ok * 2 + (ok === N ? 10 : 0));
          result(tw, { kicker: 'True count', big: `${ok}/${N}`, sub: `${avg.toFixed(2)}s average`, rec, args, good: ok === N && avg <= 2,
            note: ok === N && avg <= 2 ? 'Casino-ready speed.' : 'Goal: 10/10 with under 2 seconds each.', again: () => { q = 0; ok = 0; times = []; ask(); } });
        };
        ask();
      }
    };
  };

  // ---------- Tray reading ----------
  SCREENS.decks = (args) => {
    const N = 10; let q = 0, ok = 0;
    return {
      title: 'Tray Reading',
      html: '<div id="tw"></div>',
      mount(root) {
        const tw = $('#tw', root);
        const ask = () => {
          if (q >= N) return done();
          const dd = B.isDD(), total = gameDecks(), left = randLeft(true), played = total - left;
          const steps = dd ? [-0.75, -0.5, -0.25, 0.25, 0.5, 0.75] : [-1.5, -1, -0.5, 0.5, 1, 1.5], lo = dd ? 0.25 : 0.5, hi = dd ? 1.75 : 5.5;
          const opts = new Set([left]); while (opts.size < 4) { const o = left + pick(steps); if (o >= lo && o <= hi) opts.add(o); }
          const list = [...opts].sort((a, b) => a - b);
          tw.innerHTML = `<div class="qprog">${Array.from({ length: N }, (_, j) => `<i class="${j < q ? 'on' : j === q ? 'cur' : ''}"></i>`).join('')}</div>
            <div class="felt tcfelt">${tray(played)}<div class="lbl">How many decks are <b>left</b> ${dd ? 'to deal' : 'in the shoe'}?</div></div>
            <div class="opts grid2">${list.map((o) => `<button class="opt" data-v="${o}"><b>${o}</b></button>`).join('')}</div><div id="res"></div>`;
          $$('[data-v]', tw).forEach((b) => (b.onclick = () => {
            const good = +b.dataset.v === left; if (good) ok++; q++; A.hist(1, good ? 1 : 0); good ? A.fx.ok() : A.fx.bad();
            $$('[data-v]', tw).forEach((x) => { x.disabled = true; if (+x.dataset.v === left) x.classList.add('right'); else if (x === b) x.classList.add('wrong'); });
            if (good) { $('#res', tw).innerHTML = `<div class="fb ok">${A.icon('check')} ${left} decks left</div>`; setTimeout(ask, 700); }
            else wrongPanel($('#res', tw), `${left} decks left`, `${played} decks are in the tray, so ${left} are still to be dealt.`, ask, 'tnx');
          }));
        };
        const done = () => { const rec = A.record('decks', ok); A.addXP(ok * 2); result(tw, { kicker: 'Tray reading', big: `${ok}/${N}`, rec, args, good: ok >= 8, note: B.isDD() ? 'Tip: in double deck, think in quarter decks — 13 cards each. Half a deck is 26 cards.' : 'Tip: picture the tray in halves and quarters — 1.5, 3, 4.5 decks.', again: () => { q = 0; ok = 0; ask(); } }); };
        ask();
      }
    };
  };

  // ---------- Bet ramp ----------
  const CHIPC = ['c1', 'c2', 'c4', 'c8', 'c12'];
  A.chips = (attr = 'data-bet') => `<div class="chips">${B.rampSteps().map((u, i) => `<button class="chip ${CHIPC[i]}" ${attr}="${u}"><span>${u}</span></button>`).join('')}</div>`;
  SCREENS.ramp = (args) => {
    const N = 10; let q = 0, ok = 0;
    return {
      title: 'Bet Ramp',
      html: `<div id="rw"></div>`,
      mount(root) {
        const rw = $('#rw', root);
        const ask = () => {
          if (q >= N) return done();
          const left = randLeft(false), rc = Math.round((Math.random() * 1.6 - 0.4) * (B.isDD() ? 4 : 5) * left), tc = B.trueCount(rc, left), want = B.ramp(tc);
          rw.innerHTML = `<div class="qprog">${Array.from({ length: N }, (_, j) => `<i class="${j < q ? 'on' : j === q ? 'cur' : ''}"></i>`).join('')}</div>
            <div class="felt tcfelt"><div class="lbl">Running count</div><div class="rc">${sgn(rc)}</div><div class="lbl">Decks left: <b>${left}</b></div></div>
            <p class="center muted small">${B.isDD() ? 'Double-deck ramp' : 'Ramp'}: ${B.rampText()}</p>${A.chips()}<div id="res"></div>`;
          $$('[data-bet]', rw).forEach((b) => (b.onclick = () => {
            const good = +b.dataset.bet === want; if (good) ok++; q++; A.hist(1, good ? 1 : 0); good ? A.fx.ok() : A.fx.bad();
            $$('[data-bet]', rw).forEach((x) => (x.disabled = true));
            if (good) { $('#res', rw).innerHTML = `<div class="fb ok">${A.icon('check')} ${want} unit${want > 1 ? 's' : ''}</div>`; setTimeout(ask, 650); }
            else wrongPanel($('#res', rw), `Bet ${want} unit${want > 1 ? 's' : ''}`, `${sgn(rc)} ÷ ${left} decks = true count ${sgn(tc)}. Ramp: ${B.rampText()}.`, ask, 'tnx');
          }));
        };
        const done = () => { const rec = A.record('ramp', ok); A.addXP(ok * 2); result(rw, { kicker: 'Bet ramp', big: `${ok}/${N}`, rec, args, good: ok === N, note: 'Count → true count → bet, in one motion.', again: () => { q = 0; ok = 0; ask(); } }); };
        ask();
      }
    };
  };

  // ---------- Index trainer ----------
  SCREENS.index = (args) => {
    const S = A.S, reps = args.reps || 20;
    let n = 0, ok = 0, streak = 0, spots = 0, units = 0, game = null, cur = null; const pool = xpPool(), misses = [];
    const playOut = () => S.prof.playOut !== false;
    return {
      title: 'Index Plays',
      html: `${meta([['', 'rp', `0/${reps}`], ['Streak', 'sk', 0], ['', 'ac', '–', 'acc']])}
        <div class="felt flashable" id="felt"></div><div id="acts"></div><div id="fb"></div><div id="out"></div>`,
      mount(root) {
        const feltEl = $('#felt', root), actsEl = $('#acts', root), fb = $('#fb', root), out = $('#out', root);
        const upd = () => { $('#sk', root).textContent = streak; $('#ac', root).textContent = n ? Math.round((100 * ok) / n) + '%' : '–'; $('#rp', root).textContent = `${spots}/${reps}`; };
        const nm = (k) => (k === 'Y' ? 'Take insurance' : k === 'N' ? 'No insurance' : B.NAMES[k]);
        const badge = (tc) => `<div class="tcbadge">TC <b>${sgn(tc)}</b></div>`;
        const flash = (good) => { feltEl.classList.remove('good', 'badf'); void feltEl.offsetWidth; feltEl.classList.add(good ? 'good' : 'badf'); };
        function grade(good, chosen, right, first, cards) {
          n++; A.hist(1, good ? 1 : 0); if (first) A.gradeDev(cur.d.id, good); flash(good);
          if (good) { ok++; streak++; A.fx.ok(); pool.add(2); if (streak > S.best.index) S.best.index = streak; fb.className = 'fb ok'; fb.innerHTML = `${A.icon('check')} ${nm(chosen)}`; }
          else {
            streak = 0; A.fx.bad();
            // the first decision is the index play itself; later ones (after a hit or split) are judged on the hand you then hold
            const v = cards && B.value(cards), spot = first || !v ? cur.d.name : `${v.soft ? 'Soft' : 'Hard'} ${v.total} vs ${B.upName(cur.d.up)}`;
            const why = first || !v ? cur.rule : B.why(cards, cur.d.up, right);
            misses.push({ t: `${spot} at TC ${sgn(cur.tc)}`, a: nm(right), w: why });
            fb.className = 'fb bad'; fb.innerHTML = `<b>${chosen ? `${nm(right)} was the play, not ${nm(chosen)}` : `Too slow — ${nm(right)}`}</b><span class="small">${esc(spot)} at ${sgn(cur.tc)}: ${esc(why)}${/[.!?]$/.test(why) ? '' : '.'}</span>`;
          }
          upd(); A.save();
        }
        function done(net, opts) {
          spots++; if (typeof net === 'number') units += net; upd();
          out.innerHTML = typeof net === 'number' ? outcomeHTML(net, spots >= reps, opts) : `<button class="btn" id="nh">${spots >= reps ? 'See results' : 'Next spot'}</button>`;
          $('#nh', out).onclick = () => (spots >= reps ? finish() : next());
        }
        function next() {
          if (game) game.stop();
          fb.className = ''; fb.innerHTML = ''; out.innerHTML = '';
          const d = A.pickDev(), idx = B.devIdx(d), tc = idx + pick([-2, -1, -1, 0, 0, 1, 1, 2]);
          cur = { d, tc, rule: B.devRule(d) };
          const upCard = B.card(B.rankFor(d.up)), hand = d.hand();
          if (d.insurance) { // insurance: decide, then the hole card is turned over
            const hole = countedShoe(tc)[0];
            const paint = (reveal) => {
              feltEl.innerHTML = `${badge(tc)}<div class="lbl">Dealer</div><div class="cards">${A.cardHTML(upCard)}${reveal ? A.cardHTML(Object.assign(hole, { flip: 1 })) : A.cardHTML(null, 'deal', 360)}</div>
                <div class="lbl" style="margin-top:12px">You</div><div class="cards">${hand.map((c) => A.cardHTML(c)).join('')}</div><div class="tot">Dealer shows an Ace — insurance?</div>`;
              hole.flip = 0;
            };
            hand.forEach((c, i) => Object.assign(c, { anim: 1, delay: i ? 240 : 0 })); Object.assign(upCard, { anim: 1, delay: 120 });
            paint(false); [upCard, ...hand].forEach((c) => Object.assign(c, { anim: 0, delay: 0 }));
            actsEl.innerHTML = `<div class="acts two"><button class="act a-Y" data-a="Y">Take insurance</button><button class="act a-N" data-a="N">No insurance</button></div>`;
            $$('[data-a]', actsEl).forEach((b) => (b.onclick = () => {
              $$('[data-a]', actsEl).forEach((x) => (x.disabled = true));
              const a = b.dataset.a, right = tc >= idx ? 'Y' : 'N'; grade(a === right, a, right, true);
              setTimeout(() => {
                paint(true); const bj = B.rv(hole.r) === 10;
                const tot = $('.tot', feltEl); if (tot) tot.textContent = bj ? 'Dealer has blackjack — insurance pays 2 to 1' : 'No blackjack — insurance loses';
                // the insurance bet is half the main bet: it pays 2 to 1 when the hole card is a ten
                done(a === 'Y' ? (bj ? 1 : -0.5) : null, { allGood: a === right, label: bj ? 'Insurance wins 1 unit' : 'Insurance loses half a unit' });
              }, 450);
            }));
            return;
          }
          actsEl.innerHTML = actBtns();
          const firstOpts = Object.assign({ canSurrender: d.kind === 'sur' }, d.o || {});
          $$('[data-a]', actsEl).forEach((b) => (b.onclick = () => game && game.decide(b.dataset.a)));
          game = playHand({ root: actsEl, felt: feltEl, tbar: null }, { cards: hand, up: d.up, upCard, tc, firstOpts, badge: badge(tc), playOut: playOut(), pressure: 0,
            onDecision: (x) => grade(x.good, x.a, x.book, x.first, x.cards),
            onEnd: (r) => done(r.quick ? null : r.net, handOutcome(r)) });
        }
        function finish() {
          if (game) game.stop(); pool.flush();
          result(root, { kicker: `Index plays · ${spots} spots`, big: n ? Math.round((100 * ok) / n) + '%' : '0%', sub: `${ok} of ${n} decisions correct`, args, misses, good: ok === n,
            again: () => A.replace('index', Object.assign({}, args)) });
        }
        upd(); next();
        return () => { if (game) game.stop(); pool.flush(); };
      }
    };
  };

  // ---------- Index recall ----------
  SCREENS.recall = (args) => {
    const S = A.S, reps = args.reps || 20; let n = 0, ok = 0, streak = 0, cur; const pool = xpPool(), misses = [];
    return {
      title: 'Index Recall',
      html: `${meta([['', 'rp', `0/${reps}`], ['Streak', 'sk', 0], ['', 'ac', '–', 'acc']])}<div id="rw"></div>`,
      mount(root) {
        const rw = $('#rw', root);
        const upd = () => { $('#sk', root).textContent = streak; $('#ac', root).textContent = n ? Math.round((100 * ok) / n) + '%' : '–'; $('#rp', root).textContent = `${n}/${reps}`; };
        const next = () => {
          const d = A.pickDev(); cur = d;
          const hiN = d.insurance ? 'take insurance' : B.NAMES[d.hi].toLowerCase(), loN = d.insurance ? 'decline it' : d.kind === 'pair' ? 'stand' : B.NAMES[d.lo].toLowerCase();
          const q = `<b>${esc(d.name)}</b>: from what true count do you <b>${esc(hiN)}</b>${d.insurance ? '' : ` instead of ${esc(loN)}`}?`;
          const rule = B.devRule(d);
          const p = A.pad((g) => {
            n++; const want = B.devIdx(d), good = g === want; A.gradeDev(d.id, good); A.hist(1, good ? 1 : 0);
            if (good) { ok++; streak++; A.fx.ok(); pool.add(2); if (streak > S.best.recall) S.best.recall = streak; }
            else { streak = 0; A.fx.bad(); misses.push({ t: d.name, a: sgn(want), w: rule }); }
            A.save(); upd();
            const after = () => (n >= reps ? finish() : next());
            if (good) { $('#res', rw).innerHTML = `<div class="fb ok">${A.icon('check')} ${sgn(want)}</div>`; setTimeout(after, 650); }
            else wrongPanel($('#res', rw), `${sgn(want)}, not ${sgn(g)}`, rule, after, 'tnx');
          }, { label: 'Answer', small: true });
          rw.innerHTML = `<div class="card qcard"><div class="kicker">${d.set === 'Fab4' ? 'Fab 4' : 'Illustrious 18'}</div><p class="q">${q}</p></div><div id="res"></div>${p.html}`; p.bind(rw);
        };
        const finish = () => { pool.flush(); result(rw, { kicker: `Index recall · ${n} questions`, big: Math.round((100 * ok) / n) + '%', sub: `${ok} of ${n}`, args, misses, good: ok === n, again: () => A.replace('recall', Object.assign({}, args)) }); };
        next();
        return () => pool.flush();
      }
    };
  };

  // ---------- Strategy chart ----------
  SCREENS.chart = () => {
    const ups = B.UPS, r = B.rules();
    const head = `<tr><th></th>${ups.map((u) => `<th>${B.upName(u)}</th>`).join('')}</tr>`;
    const body = (rows) => rows.map((row) => `<tr><th>${B.rowLabel(row)}</th>${ups.map((u) => { const p = B.chartCode(row, u); return `<td class="k-${p === 'Ds' ? 'D' : p}">${p}</td>`; }).join('')}</tr>`).join('');
    return {
      title: B.isDD() ? 'Double-Deck Chart' : 'Strategy Chart',
      html: `<div class="card tiny">${esc(B.rulesLabel())} <a class="linkbtn" id="chg">change</a></div>
        <div class="legend"><span class="k-H">H</span> Hit <span class="k-S">S</span> Stand <span class="k-D">D</span> Double <span class="k-D">Ds</span> Double/else stand <span class="k-P">P</span> Split ${r.ls ? '<span class="k-R">R</span> Surrender' : ''}</div>
        <h3 class="sec">Hard totals</h3><table class="chart">${head}${body(B.ROWS.hard)}</table>
        <h3 class="sec">Soft totals</h3><table class="chart">${head}${body(B.ROWS.soft)}</table>
        <h3 class="sec">Pairs</h3><table class="chart">${head}${body(B.ROWS.pairs)}</table>
        <p class="tiny muted">"D" means double if allowed, otherwise hit. "Ds" means double if allowed, otherwise stand.</p>`,
      mount(root) { $('#chg', root).onclick = () => go('settings'); }
    };
  };

  // ---------- Mastery map ----------
  SCREENS.mastery = () => {
    const S = A.S, ups = B.UPS;
    const head = `<tr><th></th>${ups.map((u) => `<th>${B.upName(u)}</th>`).join('')}</tr>`;
    const lvl = (k) => { const c = S.cells[k]; return !c ? 'u' : c.b >= 3 ? 'm' + Math.min(c.b, 5) : c.b === 0 ? 'x' : 'l' + c.b; };
    const body = (rows) => rows.map((row) => `<tr><th>${B.rowLabel(row)}</th>${ups.map((u) => `<td class="mm-${lvl(row + '-' + u)}" data-k="${row}-${u}"></td>`).join('')}</tr>`).join('');
    return {
      title: 'Mastery Map',
      html: `<div class="statrow"><div><b>${Math.round(A.masteryPct('hard') * 100)}%</b><span>hard</span></div><div><b>${Math.round(A.masteryPct('soft') * 100)}%</b><span>soft</span></div><div><b>${Math.round(A.masteryPct('pairs') * 100)}%</b><span>pairs</span></div><div><b>${Math.round(A.masteryPct('all') * 100)}%</b><span>overall</span></div></div>
        <div class="legend"><span class="mm-u"></span>new <span class="mm-x"></span>missed <span class="mm-l1"></span>learning <span class="mm-m3"></span>mastered</div>
        <h3 class="sec">Hard</h3><table class="chart mm">${head}${body(B.ROWS.hard)}</table>
        <h3 class="sec">Soft</h3><table class="chart mm">${head}${body(B.ROWS.soft)}</table>
        <h3 class="sec">Pairs</h3><table class="chart mm">${head}${body(B.ROWS.pairs)}</table>
        <p class="tiny muted">A cell is mastered after 3 correct answers in a row. Tap any cell to see the play.</p>
        <button class="btn" data-go="strategy">Train weak cells</button>`,
      mount(root) {
        $('[data-go="strategy"]', root).onclick = () => go('strategy', { group: A.groupCells('weak').some((k) => S.cells[k] && S.cells[k].b < 3) ? 'weak' : 'all' });
        $$('[data-k]', root).forEach((td) => (td.onclick = () => {
          const k = td.dataset.k, [row, up] = k.split('-'), cards = B.cellCards(row), p = B.play(cards, +up, null), c = S.cells[k];
          A.sheet(`<div class="kicker">${esc(B.cellLabel(k))}</div><h2 class="m0">${B.NAMES[p]}</h2><p class="muted">${esc(B.why(cards, +up, p))}</p><p class="tiny muted">${c ? `Answered ${c.n}× · ${c.ok} right · ${c.miss} missed` : 'Not practised yet'}</p><button class="btn" id="x">Close</button>`, (r, close) => ($('#x', r).onclick = close));
        }));
      }
    };
  };
})();
