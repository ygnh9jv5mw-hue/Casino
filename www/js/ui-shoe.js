/* Shoe simulator: a full double-deck or multi-deck game with other players, animated dealing, a burn card,
   a cut card at a fixed or random depth, face-up or pitch (face-down) dealing, count checks, bet grading,
   index-play grading, a decision clock, table chatter and a heat meter with backoffs. */
(function () {
  const A = window.APP, B = window.BJ, { $, $$, esc, SCREENS, rnd, pick, sgn } = A;
  const SPEEDS = { slow: 520, normal: 330, fast: 170, instant: 0 };
  const CHAT = [
    () => { const a = 7 + rnd(13), b = 4 + rnd(12); return { who: 'Player next to you', q: `"Hey, what's ${a} + ${b}?"`, opts: [a + b, a + b + 1, a + b - 2].sort(() => Math.random() - 0.5), ans: a + b }; },
    () => ({ who: 'Cocktail server', q: '"Can I get you anything to drink?"', opts: ['Water, thanks', 'A Coke', "I'm good"], ans: null }),
    () => ({ who: 'Dealer', q: '"Where are you visiting from?"', opts: ['Just in town for work', "Here for a friend's wedding", 'A road trip'], ans: null }),
    () => { const a = 2 + rnd(8); return { who: 'Player at third base', q: `"If I bet ${a} reds at $5, how much is that?"`, opts: [a * 5, a * 5 + 5, a * 5 - 5].sort(() => Math.random() - 0.5), ans: a * 5, money: true }; },
    () => ({ who: 'Pit boss', q: '"How are the cards treating you tonight?"', opts: ['Up and down', 'Can\'t complain', 'Brutal shoe'], ans: null }),
    () => ({ who: 'Dealer', q: '"Want to put one up for the dealer?"', opts: ['Next win, promise', 'Sure, here you go', 'Not this hand'], ans: null })
  ];
  const CUT_RANGE = { dd: [0.5, 0.75], shoe: [0.65, 0.85] };

  SCREENS.shoe = (args) => {
    const S = A.S, dd = B.isDD();
    const defaults = dd ? { decks: 2, cut: 'random', burn: true, deal: 'pitch', seats: 2 } : { decks: 6, cut: 0.75, burn: true, deal: 'up', seats: 2 };
    const cfg = Object.assign({ speed: 'normal', clock: 0, dev: true, showRC: false, heat: true, chatter: true }, defaults, S.prof.shoe || {});
    if (dd) cfg.decks = 2; else if (cfg.decks !== 8) cfg.decks = 6;
    let G, R, tid = 0, clock = null, openSettings = () => {};
    const later = (fn, ms) => { clearTimeout(tid); tid = setTimeout(fn, ms === undefined ? SPEEDS[cfg.speed] : ms); };
    const pitch = () => cfg.deal === 'pitch';
    function newShoe(msg) {
      const [lo, hi] = CUT_RANGE[dd ? 'dd' : 'shoe'];
      const pen = cfg.cut === 'random' ? lo + Math.random() * (hi - lo) : +cfg.cut;
      G = { shoe: B.shoe(cfg.decks), burned: 0, rc: 0, phase: 'bet', msg: msg || '', msgOk: true, untilCheck: 3 + rnd(3), heat: 0, maxHeat: 0, prevBet: 0, prevWon: false, pen,
        st: { hands: 0, dec: 0, decOk: 0, checks: 0, checksOk: 0, bets: 0, betsOk: 0, units: 0, peeks: 0, misses: [] }, backoff: false };
      G.cut = Math.round(cfg.decks * 52 * (1 - pen));
      if (cfg.burn) { G.shoe.pop(); G.burned = 1; G.msg = (G.msg ? G.msg + '<br>' : '') + 'Shuffle — one card burned face down. Count starts at 0.'; }
    }
    newShoe();
    const total = { hands: 0 }; // hands this session (for workout targets)
    const drawC = (vis = true) => { const c = G.shoe.pop(); c.anim = 1; c.down = !vis; if (vis) G.rc += B.hilo(c.r); return c; };
    const reveal = (c) => { if (c && c.down) { c.down = false; c.anim = 1; G.rc += B.hilo(c.r); } };
    const unseen = () => G.shoe.length + G.burned;
    const decksLeft = () => Math.max(0.5, Math.round(unseen() / 26) / 2);
    const tc = () => B.trueCount(G.rc, decksLeft());
    const youAt = () => Math.floor(cfg.seats / 2);
    const dealerHits = (cards) => { const v = B.value(cards); return v.total < 17 || (B.rules().h17 && v.total === 17 && v.soft); };
    const anyDown = (cards) => cards.some((c) => c.down);
    const insIdx = () => B.devIdx(B.DEVIATIONS.find((d) => d.insurance));
    const cutLabel = () => (cfg.cut === 'random' ? 'random cut' : Math.round(cfg.cut * 100) + '% cut');

    return {
      title: dd ? 'Double Deck' : 'Shoe Simulator',
      right: '<button class="iconbtn" id="rbtn" aria-label="Table settings">' + A.icon('gear') + '</button>',
      onRight: () => openSettings(),
      html: '<div id="sw"></div>',
      mount(root) {
        const sw = $('#sw', root);
        // ----- rendering -----
        function draw() {
          const st = G.st, dp = Math.round((100 * (cfg.decks * 52 - G.shoe.length)) / (cfg.decks * 52));
          const hud = `<div class="hud">
            <div><b class="${st.units >= 0 ? 'pos' : 'neg'}">${st.units >= 0 ? '+' : ''}${st.units}u</b><span>result</span></div>
            <div><b>${st.dec ? Math.round((100 * st.decOk) / st.dec) + '%' : '–'}</b><span>plays</span></div>
            <div><b>${st.checks ? st.checksOk + '/' + st.checks : '–'}</b><span>counts</span></div>
            <div><b>${st.bets ? Math.round((100 * st.betsOk) / st.bets) + '%' : '–'}</b><span>bets</span></div>
            <button class="peek" id="peek">${cfg.showRC ? `RC ${sgn(G.rc)} · TC ${sgn(tc())}` : 'Peek'}</button></div>
            ${cfg.heat ? `<div class="heat"><span>Heat</span><div class="hbar"><i style="width:${Math.min(100, G.heat)}%" class="${G.heat > 70 ? 'hot' : G.heat > 40 ? 'warm' : ''}"></i></div></div>` : ''}`;
          const ch = (c, cls = '') => (c.down ? A.cardHTML(null, (c.anim ? 'deal ' : '') + cls) : A.cardHTML(c, cls));
          const arc = `<svg class="arc" viewBox="0 0 300 70"><path id="ap" d="M10,10 Q150,70 290,10" fill="none"/><text><textPath href="#ap" startOffset="50%" text-anchor="middle">BLACKJACK PAYS 3 TO 2</textPath></text></svg>`;
          const head = `<div class="dealer-row"><div class="shoebox" title="${dd ? 'deck' : 'shoe'}"><i style="height:${100 - dp}%"></i></div><div class="dealer"><div class="cards">${R ? R.dealer.map((c) => ch(c)).join('') : ''}</div>${R && !anyDown(R.dealer) && R.dealer.length > 1 ? `<div class="tot">${B.value(R.dealer).total}${B.value(R.dealer).total > 21 ? ' · bust' : ''}</div>` : ''}</div><div class="discard"><i style="height:${dp}%"></i></div></div>`;
          let table = '';
          if (R) {
            const others = R.seats.map((s, i) => s.you ? `<div class="oseat you-mark"><span>YOU</span></div>` : `<div class="oseat ${R.turn === i ? 'act' : ''}"><div class="cards mini">${s.cards.map((c) => ch(c, 'sm')).join('')}</div><div class="tot sm">${!s.cards.length ? '' : anyDown(s.cards) ? '?' : B.value(s.cards).total > 21 ? 'bust' : B.value(s.cards).total}</div></div>`).join('');
            const you = R.hands.map((h, i) => {
              const v = B.value(h.cards), hid = anyDown(h.cards);
              const res = G.phase === 'over' ? (h.res > 0 ? ` <span class="pos">+${h.res * h.bet}u</span>` : h.res < 0 ? ` <span class="neg">${h.res * h.bet}u</span>` : ' push') : '';
              return `<div class="hand ${G.phase === 'play' && i === R.act && R.hands.length > 1 ? 'act' : ''}"><div class="cards">${h.cards.map((c) => ch(c)).join('')}</div>
                <div class="tot">${h.bj ? 'Blackjack!' : hid ? 'double card face down' : (v.soft && v.total < 21 ? 'soft ' : '') + v.total}${!hid && v.total > 21 ? ' · bust' : ''}${h.surr ? ' · surrendered' : ''} · ${h.bet}u${res}</div></div>`;
            }).join('');
            table = `<div class="table">${head}${arc}
              <div class="rule-line">${B.rules().h17 ? 'Dealer must hit soft 17' : 'Dealer must stand on all 17s'} · Insurance pays 2 to 1</div>
              ${cfg.seats ? `<div class="others">${others}</div>` : ''}<div class="you">${you}</div></div>`;
          } else {
            table = `<div class="table empty">${head}${arc}
              <div class="rule-line">${B.rules().h17 ? 'Dealer must hit soft 17' : 'Dealer must stand on all 17s'} · ${dd ? 'double deck' : cfg.decks + ' decks'} · ${cutLabel()}${cfg.burn ? ' · burn card' : ''}${pitch() ? ' · pitched' : ''}</div><div class="you"><div class="place">Place your bet</div></div></div>`;
          }
          let ctl = '';
          const msg = G.msg ? `<div class="fb ${G.msgOk ? 'ok' : 'bad'} slim">${G.msg}</div>` : '';
          if (G.phase === 'bet') ctl = `${msg}<p class="center tiny muted">Bet by the true count: ${B.rampText()}${cfg.heat ? ' · jump too fast and you\'ll get heat' : ''}</p>${A.chips()}`;
          else if (G.phase === 'ins') ctl = `${msg}<p class="center"><b>Insurance?</b></p><div class="acts two"><button class="act a-Y" data-ins="1">Take insurance</button><button class="act a-N" data-ins="0">No insurance</button></div>`;
          else if (G.phase === 'play') { const o = options(R.hands[R.act]); ctl = `${msg}${cfg.clock ? '<div class="tbar"><i></i></div>' : ''}<div class="acts">${['H', 'S', 'D', 'P', 'R'].map((k) => `<button class="act a-${k}" data-a="${k}" ${(k === 'D' && !o.canDouble) || (k === 'P' && !o.canSplit) || (k === 'R' && !o.canSurrender) ? 'disabled' : ''}>${B.NAMES[k]}</button>`).join('')}</div>`; }
          else if (G.phase === 'over') ctl = `${msg}<div class="fb ${R.net > 0 ? 'ok' : R.net < 0 ? 'bad' : 'info'} slim">${R.net > 0 ? `You won ${R.net}u` : R.net < 0 ? `You lost ${-R.net}u` : 'Push'}</div><button class="btn big" id="nr">Next hand ›</button>`;
          else ctl = `${msg}<div class="wait">Dealing…</div>`;
          sw.innerHTML = hud + table + `<div class="ctl">${ctl}</div>`;
          if (R) [R.dealer, ...R.seats.map((s) => s.cards || []), ...R.hands.map((h) => h.cards)].forEach((a) => a.forEach((c) => (c.anim = 0)));
          bind();
        }
        function bind() {
          const pk = $('#peek', sw); if (pk) pk.onclick = () => { if (!cfg.showRC) { G.st.peeks++; pk.textContent = `RC ${sgn(G.rc)} · TC ${sgn(tc())}`; } };
          $$('[data-bet]', sw).forEach((b) => (b.onclick = () => placeBet(+b.dataset.bet)));
          $$('[data-ins]', sw).forEach((b) => (b.onclick = () => insurance(b.dataset.ins === '1')));
          $$('[data-a]', sw).forEach((b) => (b.onclick = () => act(b.dataset.a)));
          const nr = $('#nr', sw); if (nr) nr.onclick = nextHand;
          if (G.phase === 'play' && cfg.clock) { if (clock) clock.stop(); clock = A.timer($('.ctl .tbar i', sw), cfg.clock, () => act('S', true)); }
        }

        // ----- flow -----
        function placeBet(u) {
          const t = tc(), want = B.ramp(t); G.st.bets++; S.shoe.bets++;
          const cover = cfg.heat && u < want && u >= want / 2;
          const good = u === want || cover;
          if (good) { G.st.betsOk++; S.shoe.betsOk++; }
          G.msg = good ? (cover ? `Cover bet accepted (ramp says ${want}u at TC ${sgn(t)})` : '') : `Bet ${u}u — at TC ${sgn(t)} the ramp says ${want}u`; G.msgOk = good;
          if (!good) A.fx.bad();
          if (cfg.heat) {
            const jump = G.prevBet ? Math.log2(u / G.prevBet) : 0; let add = 0;
            if (jump >= 1.5 && !(G.prevWon && u <= G.prevBet * 2)) add = (jump - 1) * 24;
            if (G.st.hands === 0 && u >= B.rampSteps()[3]) add += 25;
            G.heat = Math.max(0, G.heat * 0.93 - 3 + add); G.maxHeat = Math.max(G.maxHeat, G.heat);
            if (add >= 20 && G.heat < 100) G.msg += (G.msg ? '<br>' : '') + '🔥 The pit boss glanced over at that bet jump.';
            if (G.heat >= 100) return backoff();
          }
          G.bet = u; G.prevBet = u;
          if (cfg.chatter && Math.random() < 0.14) return chatter(() => deal());
          deal();
        }
        function chatter(done) {
          const c = pick(CHAT)();
          A.sheet(`<div class="kicker">${esc(c.who)}</div><h3 class="m0">${esc(c.q)}</h3><p class="tiny muted">Answer — and keep your count.</p><div class="opts">${c.opts.map((o) => `<button class="opt" data-o="${esc(o)}"><b>${c.money ? '$' : ''}${esc(o)}</b></button>`).join('')}</div>`, (r, close) => {
            r.querySelector('.sheet').setAttribute('data-lock', '1');
            $$('[data-o]', r).forEach((b) => (b.onclick = () => { if (c.ans !== null && String(c.ans) !== b.dataset.o) A.toast('Close enough — eyes back on the cards.'); close(); done(); }));
          });
        }
        function deal() {
          const n = cfg.seats, ya = youAt();
          R = { dealer: [], seats: [], hands: [], act: 0, turn: -1, net: 0 };
          for (let i = 0; i <= n; i++) R.seats.push(i === ya ? { you: true } : { cards: [] });
          R.hands.push({ cards: [], bet: G.bet });
          G.phase = 'deal'; G.msg = G.msg || '';
          const steps = [];
          for (let pass = 0; pass < 2; pass++) {
            // you always see your own cards; other players' cards are face down in a pitch game
            R.seats.forEach((s) => steps.push(() => (s.you ? R.hands[0].cards.push(drawC(true)) : s.cards.push(drawC(!pitch())))));
            steps.push(pass === 0 ? () => R.dealer.push(drawC(true)) : () => R.dealer.push(drawC(false)));
          }
          run(steps, afterDeal);
        }
        function run(steps, done) { let i = 0; const nx = () => { if (i >= steps.length) return done(); steps[i++](); draw(); later(nx); }; nx(); }
        function afterDeal() {
          R.up = B.rv(R.dealer[0].r);
          if (R.up === 11) { G.phase = 'ins'; draw(); return; }
          peek();
        }
        function insurance(take) {
          const want = tc() >= insIdx(); G.st.dec++; S.shoe.dec++;
          if (take === want) { G.st.decOk++; S.shoe.decOk++; G.msg = `✓ ${take ? 'Insured' : 'No insurance'} at TC ${sgn(tc())}`; G.msgOk = true; A.fx.ok(); }
          else { G.msg = `✗ Insurance only at TC ${sgn(insIdx())} or higher (TC is ${sgn(tc())})`; G.msgOk = false; A.fx.bad(); G.st.misses.push({ t: `Insurance at TC ${sgn(tc())}`, a: want ? 'Take it' : 'Decline', w: `Take insurance at ${sgn(insIdx())} or higher` }); }
          if (take) R.ins = R.hands[0].bet / 2;
          peek();
        }
        function peek() {
          if (B.isBJ(R.dealer)) { reveal(R.dealer[1]); G.msg = (G.msg ? G.msg + '<br>' : '') + 'Dealer has blackjack.'; return settle(); }
          if (B.isBJ(R.hands[0].cards)) { R.hands[0].done = true; R.hands[0].bj = true; }
          R.seats.forEach((s) => { if (!s.you && B.isBJ(s.cards)) s.cards.forEach(reveal); }); // blackjacks are turned up at once
          othersTurn(0, youAt(), () => {
            if (R.hands[0].done) return othersTurn(youAt() + 1, R.seats.length, dealerTurn);
            G.phase = 'play'; R.turn = -1; draw();
          });
        }
        function othersTurn(from, to, done) {
          let i = from;
          const nextSeat = () => {
            while (i < to && R.seats[i].you) i++;
            if (i >= to) { R.turn = -1; return done(); }
            const s = R.seats[i]; R.turn = i;
            const step = () => {
              const v = B.value(s.cards); if (v.total >= 21) { if (v.total > 21) s.cards.forEach(reveal); i++; return nextSeat(); }
              const p = B.play(s.cards, R.up, null, { canSplit: false, canSurrender: false });
              if (p === 'S') { i++; return nextSeat(); }
              if (p === 'D') { s.cards.forEach(reveal); s.cards.push(drawC(!pitch())); draw(); i++; return later(nextSeat); } // double card goes face down in a pitch game
              s.cards.push(drawC(true));
              if (B.value(s.cards).total > 21) s.cards.forEach(reveal); // busted hands are turned over and taken
              draw(); later(step);
            };
            step();
          };
          nextSeat();
        }
        function options(h) {
          const two = h.cards.length === 2;
          return { canDouble: two && !h.splitAces, canSplit: two && B.isPair(h.cards) && R.hands.length < 4 && !h.splitAces, canSurrender: two && R.hands.length === 1 && !h.fromSplit && B.rules().ls };
        }
        function act(a, timedOut) {
          if (G.phase !== 'play') return;
          if (clock) { clock.stop(); clock = null; }
          const h = R.hands[R.act], o = options(h), t = cfg.dev ? tc() : null;
          const book = B.play(h.cards, R.up, t, o), good = !timedOut && a === book;
          G.st.dec++; S.shoe.dec++; A.hist(1, good ? 1 : 0);
          const cell = B.cellOf(h.cards, R.up); // the mastery map tracks basic strategy, so grade the cell against the basic play
          if (cell && !h.fromSplit && !timedOut && o.canDouble && o.canSurrender === B.rules().ls) A.gradeCell(cell, a === B.play(h.cards, R.up, null, o));
          if (good) { G.st.decOk++; S.shoe.decOk++; G.msg = `✓ ${B.NAMES[a]}`; G.msgOk = true; A.fx.ok(); }
          else {
            const label = `${handLbl(h.cards)} vs ${B.upName(R.up)}${cfg.dev ? ` (TC ${sgn(tc())})` : ''}`;
            const w = B.tcNote(h.cards, R.up, t, o) || B.why(h.cards, R.up, book);
            G.st.misses.push({ t: label, a: B.NAMES[book], w });
            G.msg = `${timedOut ? '⏱ Too slow — you stood. ' : '✗ '}Book play: <b>${B.NAMES[book]}</b> (${esc(label)})`; G.msgOk = false; A.fx.bad();
          }
          if (a === 'H') { h.cards.push(drawC(true)); if (B.value(h.cards).total >= 21) h.done = true; }
          else if (a === 'S') h.done = true;
          else if (a === 'D') { h.bet *= 2; h.cards.push(drawC(!pitch())); h.done = true; }
          else if (a === 'R') { h.surr = true; h.done = true; }
          else if (a === 'P') {
            const c2 = h.cards.pop(), aces = h.cards[0].r === 'A';
            const nh = { cards: [c2], bet: h.bet, fromSplit: true }; h.fromSplit = true;
            h.cards.push(drawC(true)); nh.cards.push(drawC(true)); R.hands.splice(R.act + 1, 0, nh);
            if (aces) { h.done = nh.done = true; h.splitAces = nh.splitAces = true; }
            else if (B.value(h.cards).total === 21) h.done = true;
          }
          while (R.act < R.hands.length && R.hands[R.act].done) R.act++;
          A.save();
          if (R.act >= R.hands.length) { G.phase = 'deal'; draw(); return later(() => othersTurn(youAt() + 1, R.seats.length, dealerTurn)); }
          draw();
        }
        const handLbl = (c) => { const v = B.value(c); return B.isPair(c) ? `Pair of ${c[0].r === 'A' ? 'Aces' : B.rv(c[0].r) + 's'}` : (v.soft ? 'Soft ' : 'Hard ') + v.total; };
        function dealerTurn() {
          G.phase = 'dealer'; reveal(R.dealer[1]); draw();
          const live = R.hands.some((h) => !h.surr && !h.bj && B.value(h.cards).total <= 21) || R.seats.some((s) => !s.you && B.value(s.cards).total <= 21 && !B.isBJ(s.cards));
          const step = () => { if (live && dealerHits(R.dealer)) { R.dealer.push(drawC(true)); draw(); later(step); } else later(settle, Math.min(250, SPEEDS[cfg.speed])); };
          later(step);
        }
        function settle() {
          // everything still face down is turned over as the dealer settles each hand
          R.dealer.forEach(reveal); R.seats.forEach((s) => (s.cards || []).forEach(reveal)); R.hands.forEach((h) => h.cards.forEach(reveal));
          const d = B.value(R.dealer).total, dBJ = B.isBJ(R.dealer); let net = 0;
          for (const h of R.hands) {
            const p = B.value(h.cards).total;
            if (h.surr) h.res = -0.5; else if (dBJ) h.res = h.bj ? 0 : -1; else if (h.bj) h.res = 1.5;
            else if (p > 21) h.res = -1; else if (d > 21 || p > d) h.res = 1; else if (p === d) h.res = 0; else h.res = -1;
            net += h.res * h.bet;
          }
          if (R.ins) net += dBJ ? R.ins * 2 : -R.ins;
          R.net = net; G.st.units += net; G.st.hands++; S.shoe.hands++; total.hands++; G.prevWon = net > 0;
          G.phase = 'over'; A.save(); draw();
        }
        function nextHand() {
          G.msg = '';
          if (args.hands && total.hands >= args.hands) return report(false, true);
          if (G.shoe.length < G.cut) return report(false);
          G.untilCheck--;
          R = null;
          if (G.untilCheck <= 0) return countCheck();
          G.phase = 'bet'; draw();
        }
        function countCheck() {
          G.phase = 'check';
          const p = A.pad((g) => {
            const good = g === G.rc; G.st.checks++; S.shoe.checks++; if (good) { G.st.checksOk++; S.shoe.checksOk++; A.fx.ok(); A.addXP(5); } else A.fx.bad();
            A.hist(1, good ? 1 : 0);
            G.msg = good ? `✓ Count check: ${sgn(G.rc)}` : `✗ The count was ${sgn(G.rc)} — you said ${sgn(g)}`; G.msgOk = good;
            G.untilCheck = 3 + rnd(4); G.phase = 'bet'; A.save(); draw();
          }, { label: 'Check count', small: true });
          sw.innerHTML = `<div class="card center"><div class="kicker">Count check</div><h2 class="m0">What's the running count?</h2><p class="tiny muted">No peeking. ${G.shoe.length} cards left to deal${cfg.burn ? ' (the burn card is never counted)' : ''}.</p></div>${p.html}`;
          p.bind(sw);
        }
        function backoff() {
          G.backoff = true; S.shoe.backoffs++; A.save(); A.fx.bad();
          A.sheet(`<div class="burst cold">✋</div><div class="kicker">Backed off</div><h2 class="m0">"You're welcome to play any other game, but no more blackjack tonight."</h2>
            <p class="muted">Your bet jumps drew too much heat. Ramp more gradually, parlay wins, and avoid big bets right after the shuffle.</p><button class="btn" id="bo">See report</button>`, (r, close) => { r.querySelector('.sheet').setAttribute('data-lock', '1'); $('#bo', r).onclick = () => { close(); report(true); }; });
        }
        function report(backedOff, workoutDone) {
          const st = G.st;
          if (!backedOff && !workoutDone) { S.shoe.shoes++; S.best.shoeClean = (S.best.shoeClean || 0) + 1; }
          const xp = Math.round(st.decOk * 0.5 + st.checksOk * 3 + st.betsOk * 0.5) + (backedOff ? 0 : 20);
          A.addXP(xp); A.save();
          const pct = (a, b) => (b ? Math.round((100 * a) / b) + '%' : '–');
          sw.innerHTML = `<div class="result"><div class="kicker">${backedOff ? 'Backed off' : workoutDone ? 'Session complete' : dd ? 'Deck complete' : 'Shoe complete'}</div>
            <div class="big-num ${st.units >= 0 ? 'pos' : 'neg'}">${st.units >= 0 ? '+' : ''}${st.units}u</div>
            <p class="muted">${st.hands} hands · ${!backedOff && !workoutDone ? `cut card came at ${Math.round(G.pen * 100)}% · ` : ''}peak heat ${Math.round(G.maxHeat)}%${st.peeks ? ` · ${st.peeks} peeks` : ''}</p>
            <div class="stats"><div><b>${pct(st.decOk, st.dec)}</b><span>correct plays</span></div><div><b>${st.checks ? st.checksOk + '/' + st.checks : '–'}</b><span>count checks</span></div><div><b>${pct(st.betsOk, st.bets)}</b><span>correct bets</span></div></div>
            <div class="fb info">Results swing — judge yourself on plays, counts and bets, not units.</div>
            ${st.misses.length ? `<h3 class="sec">Review your misses</h3><div class="card misses">${st.misses.slice(-10).map((m) => `<div class="miss"><b>${esc(m.t)}</b><span>${esc(m.a)}</span><small>${esc(m.w)}</small></div>`).join('')}</div>` : ''}
            ${args.wk && workoutDone ? '<button class="btn big" id="wkn">Continue workout ›</button>' : `<button class="btn big" id="ns">${backedOff ? 'New casino — shuffle up' : 'Shuffle up — next ' + (dd ? 'deck' : 'shoe')}</button>`}
            ${args.wk && workoutDone ? '' : '<button class="btn ghost" id="dn">Done</button>'}</div>`;
          const w = $('#wkn', sw); if (w) w.onclick = () => A.wkNext();
          const ns = $('#ns', sw); if (ns) ns.onclick = () => { newShoe(); R = null; draw(); };
          const dn = $('#dn', sw); if (dn) dn.onclick = () => A.back();
        }
        function settings() {
          const seg = (k, opts) => `<label>${opts.label}</label><div class="seg" data-c="${k}">${opts.v.map(([v, t]) => `<button data-v="${v}" class="${String(cfg[k]) === String(v) ? 'on' : ''}">${t}</button>`).join('')}</div>`;
          A.sheet(`<h3 class="m0">Table settings</h3><p class="tiny muted">${esc(B.rulesLabel())} — change your game in Settings.</p>
            ${seg('deal', { label: 'Dealing', v: [['up', 'Face up'], ['pitch', 'Pitch (face down)']] })}
            ${seg('cut', { label: 'Cut card', v: [['random', 'Random'], [0.5, '50%'], [0.65, '65%'], [0.75, '75%'], [0.83, '83%']] })}
            ${dd ? '' : seg('decks', { label: 'Decks', v: [[6, '6 decks'], [8, '8 decks']] })}
            ${seg('seats', { label: 'Other players', v: [[0, '0'], [1, '1'], [2, '2'], [3, '3'], [4, '4'], [5, '5']] })}
            ${seg('speed', { label: 'Deal speed', v: [['slow', 'Slow'], ['normal', 'Normal'], ['fast', 'Fast'], ['instant', 'Instant']] })}
            ${seg('clock', { label: 'Decision clock', v: [[0, 'Off'], [5000, '5s'], [3000, '3s'], [2000, '2s']] })}
            <div class="tgl"><span>Burn the first card</span>${sw2('burn')}</div>
            <div class="tgl"><span>Grade with index plays</span>${sw2('dev')}</div>
            <div class="tgl"><span>Heat & backoffs</span>${sw2('heat')}</div>
            <div class="tgl"><span>Table chatter (distraction)</span>${sw2('chatter')}</div>
            <div class="tgl"><span>Always show the count</span>${sw2('showRC')}</div>
            <p class="tiny muted">Random cut: the shuffle comes ${dd ? '50–75%' : '65–85%'} of the way through, different every time — like a cut card placed by a player.</p>
            <button class="btn" id="cs">Save · shuffle up</button>`, (r, close) => {
            $$('[data-c]', r).forEach((g) => $$('button', g).forEach((b) => (b.onclick = () => { const v = b.dataset.v; cfg[g.dataset.c] = isNaN(+v) ? v : +v; $$('button', g).forEach((x) => x.classList.toggle('on', x === b)); })));
            $$('[data-sw]', r).forEach((b) => (b.onclick = () => { cfg[b.dataset.sw] = !cfg[b.dataset.sw]; b.classList.toggle('on', cfg[b.dataset.sw]); }));
            $('#cs', r).onclick = () => { S.prof.shoe = Object.assign({}, cfg); A.save(); close(); clearTimeout(tid); newShoe('New settings saved.'); R = null; draw(); };
          });
        }
        const sw2 = (k) => `<button class="switch ${cfg[k] ? 'on' : ''}" data-sw="${k}"><i></i></button>`;
        openSettings = settings;
        draw();
        return () => { clearTimeout(tid); if (clock) clock.stop(); };
      }
    };
  };
})();
