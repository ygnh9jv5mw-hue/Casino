/* Table games.
   - Simulator (SCREENS.shoe): the training table for the player's own game (double deck or shoe) with count checks,
     bet grading, index-play grading, a decision clock, chatter and a heat meter.
   - Casino table (SCREENS.casino): a normal 6-deck casino game played with a chip bankroll and real shoe
     procedures — shuffle, the player cut, a cut card placed at a random depth, a burn card, the cut card coming out,
     the last hand finished with the last few cards, then a fresh shuffle. Coaching is silent unless turned on. */
(function () {
  const A = window.APP, B = window.BJ, { $, $$, esc, SCREENS, rnd, pick, sgn, fmt$ } = A;
  const SPEEDS = { slow: 520, normal: 330, fast: 170, instant: 0 };
  const CHAT = [
    () => { const a = 7 + rnd(13), b = 4 + rnd(12); return { who: 'Player next to you', q: `"Hey, what's ${a} + ${b}?"`, opts: [a + b, a + b + 1, a + b - 2].sort(() => Math.random() - 0.5), ans: a + b }; },
    () => ({ who: 'Cocktail server', q: '"Can I get you anything to drink?"', opts: ['Water, thanks', 'A Coke', "I'm good"], ans: null }),
    () => ({ who: 'Dealer', q: '"Where are you visiting from?"', opts: ['Just in town for work', "Here for a friend's wedding", 'A road trip'], ans: null }),
    () => { const a = 2 + rnd(8); return { who: 'Player at third base', q: `"If I bet ${a} reds at $5, how much is that?"`, opts: [a * 5, a * 5 + 5, a * 5 - 5].sort(() => Math.random() - 0.5), ans: a * 5, money: true }; },
    () => ({ who: 'Pit boss', q: '"How are the cards treating you tonight?"', opts: ['Up and down', 'Can\'t complain', 'Brutal shoe'], ans: null }),
    () => ({ who: 'Dealer', q: '"Want to put one up for the dealer?"', opts: ['Next win, promise', 'Sure, here you go', 'Not this hand'], ans: null })
  ];
  // how deep the cut card goes (fraction of the cards dealt before the shuffle)
  const CUT_RANGE = { dd: [0.5, 0.75], shoe: [0.65, 0.85], casino: [0.67, 0.83] };
  const CASINO_CHIPS = [[5, 'c2'], [25, 'c4'], [100, 'c8'], [500, 'c12']];
  const START_BANK = 1000;

  function makeTable(mode) {
    const casino = mode === 'casino';
    return (args) => {
      const S = A.S;
      let cfg;
      if (casino) {
        cfg = Object.assign({ decks: 6, h17: !!S.prof.h17, ls: !!S.prof.ls, cut: 'random', burn: true, deal: 'up', seats: 'random', speed: 'normal', clock: 0, dev: true, showRC: false, heat: true, chatter: true, coach: false, quiz: true, min: 25 }, S.prof.casino || {});
        cfg.decks = cfg.decks === 8 ? 8 : 6;
        B.setRules({ decks: cfg.decks, h17: cfg.h17, ls: cfg.ls }); // the casino table always plays shoe strategy
        S.casino = S.casino || { bank: START_BANK, hands: 0, net: 0, peak: START_BANK, shoes: 0 };
      } else {
        const ddg = B.isDD();
        const defaults = ddg ? { decks: 2, cut: 'random', burn: true, deal: 'pitch', seats: 2 } : { decks: 6, cut: 0.75, burn: true, deal: 'up', seats: 2 };
        cfg = Object.assign({ speed: 'normal', clock: 0, dev: true, showRC: false, heat: true, chatter: true, coach: true, quiz: false }, defaults, S.prof.shoe || {});
        if (ddg) cfg.decks = 2; else if (cfg.decks !== 8) cfg.decks = 6;
      }
      // re-check stored table settings so a bad value can never break the table
      if (!SPEEDS.hasOwnProperty(cfg.speed)) cfg.speed = 'normal';
      if (![0, 2000, 3000, 5000].includes(cfg.clock)) cfg.clock = 0;
      if (!(cfg.seats === 'random' && casino) && !(Number.isInteger(cfg.seats) && cfg.seats >= 0 && cfg.seats <= 5)) cfg.seats = casino ? 'random' : 2;
      if (!(cfg.cut === 'random' || (typeof cfg.cut === 'number' && cfg.cut >= 0.4 && cfg.cut <= 0.9))) cfg.cut = 'random';
      if (!['up', 'pitch'].includes(cfg.deal)) cfg.deal = 'up';
      if (![10, 25, 50, 100].includes(cfg.min)) cfg.min = 25;
      for (const k of ['dev', 'showRC', 'heat', 'chatter', 'coach', 'quiz', 'burn', 'h17', 'ls']) cfg[k] = !!cfg[k];
      if (casino) B.setRules({ decks: cfg.decks, h17: cfg.h17, ls: cfg.ls });
      const dd = B.isDD();
      const N = () => cfg.decks * 52;
      const maxBet = () => cfg.min * 40;
      const unitsOf = (bet) => (casino ? bet / cfg.min : bet);
      const money = (x) => (casino ? fmt$(x) : `${x}u`);
      const signed = (x) => (casino ? (x > 0 ? '+' : x < 0 ? '−' : '') + fmt$(Math.abs(x)) : `${x >= 0 ? '+' : ''}${x}u`);
      let G, R, tid = 0, clock = null, openSettings = () => {}, lastShoe = null;
      const later = (fn, ms) => { clearTimeout(tid); tid = setTimeout(fn, ms === undefined ? SPEEDS[cfg.speed] : ms); };
      const pitch = () => cfg.deal === 'pitch';

      function newShoe(msg) {
        const [lo, hi] = CUT_RANGE[casino ? 'casino' : dd ? 'dd' : 'shoe'];
        const pen = cfg.cut === 'random' ? lo + Math.random() * (hi - lo) : +cfg.cut;
        G = { shoe: B.shoe(cfg.decks), burned: 0, rc: 0, phase: casino ? 'shuffle' : 'bet', msg: msg || '', msgOk: true, untilCheck: 3 + rnd(3), heat: G ? G.heat * 0.5 : 0, maxHeat: 0,
          prevBet: 0, prevWon: false, pen, cutOut: false, pend: 0, lastBet: G ? G.lastBet : 0,
          seats: cfg.seats === 'random' ? 1 + rnd(5) : +cfg.seats,
          st: { hands: 0, dec: 0, decOk: 0, checks: 0, checksOk: 0, bets: 0, betsOk: 0, units: 0, peeks: 0, misses: [] }, backoff: false };
        G.cut = Math.round(N() * (1 - pen));
        if (!casino) burn();
      }
      function burn() {
        if (!cfg.burn) return;
        G.shoe.pop(); G.burned = 1;
        if (!casino) G.msg = (G.msg ? G.msg + '<br>' : '') + 'Shuffle — one card burned face down. Count starts at 0.';
      }
      newShoe();
      const total = { hands: 0 }; // hands this session (for workout targets)
      const drawC = (vis = true) => {
        if (!G.shoe.length) { // out of cards mid-round: like a real dealer, shuffle the discards (everything not on the table) and finish the hand
          const fresh = B.shoe(cfg.decks), onTable = R ? [...R.dealer, ...R.seats.flatMap((s) => s.cards || []), ...R.hands.flatMap((h) => h.cards)] : [];
          for (const t of onTable) { const i = fresh.findIndex((x) => x.r === t.r && x.s === t.s); if (i >= 0) fresh.splice(i, 1); }
          G.shoe = fresh; G.rc = 0; G.burned = 0; G.cutOut = true;
          G.msg = 'Out of cards — the dealer shuffled the discards to finish this hand. The count restarts at 0.'; G.msgOk = true;
        }
        const c = G.shoe.pop(); c.anim = 1; c.down = !vis; if (vis) G.rc += B.hilo(c.r);
        if (!G.cutOut && G.shoe.length < G.cut) G.cutOut = true; // the cut card comes out — this round is the last
        return c;
      };
      const reveal = (c) => { if (c && c.down) { c.down = false; c.anim = 1; G.rc += B.hilo(c.r); } };
      const unseen = () => G.shoe.length + G.burned;
      const decksLeft = () => Math.max(0.5, Math.round(unseen() / 26) / 2);
      const tc = () => B.trueCount(G.rc, decksLeft());
      const youAt = () => Math.floor(G.seats / 2);
      const dealerHits = (cards) => { const v = B.value(cards); return v.total < 17 || (B.rules().h17 && v.total === 17 && v.soft); };
      const anyDown = (cards) => cards.some((c) => c.down);
      const insIdx = () => B.devIdx(B.DEVIATIONS.find((d) => d.insurance));
      const cutLabel = () => (cfg.cut === 'random' ? 'random cut' : Math.round(cfg.cut * 100) + '% cut');
      const exposure = () => (R ? R.hands.reduce((a, h) => a + h.bet, 0) + (R.ins || 0) : 0);
      const say = (m, ok) => { if (!casino || cfg.coach) { G.msg = m; G.msgOk = ok; } };

      return {
        title: casino ? 'Casino Table' : dd ? 'Double Deck' : 'Shoe Simulator',
        right: '<button class="iconbtn" id="rbtn" aria-label="Table settings">' + A.icon('gear') + '</button>',
        onRight: () => openSettings(),
        html: '<div id="sw"></div>',
        mount(root) {
          const sw = $('#sw', root);
          // ---------- rendering ----------
          function draw() {
            if (G.phase === 'shuffle' || G.phase === 'cut' || G.phase === 'place') return drawCeremony();
            const st = G.st, dp = Math.round((100 * (N() - G.shoe.length)) / N()), cutPct = (100 * G.cut) / N();
            const hud = casino
              ? `<div class="hud"><div><b>${fmt$(S.casino.bank)}</b><span>bank</span></div><div><b class="${st.units >= 0 ? 'pos' : 'neg'}">${signed(st.units)}</b><span>this shoe</span></div>
                 <div><b>${st.dec ? Math.round((100 * st.decOk) / st.dec) + '%' : '–'}</b><span>plays</span></div><div><b>${st.bets ? Math.round((100 * st.betsOk) / st.bets) + '%' : '–'}</b><span>bets</span></div>
                 <button class="peek" id="peek">${cfg.showRC ? `RC ${sgn(G.rc)} · TC ${sgn(tc())}` : 'Peek'}</button></div>`
              : `<div class="hud"><div><b class="${st.units >= 0 ? 'pos' : 'neg'}">${signed(st.units)}</b><span>result</span></div>
                 <div><b>${st.dec ? Math.round((100 * st.decOk) / st.dec) + '%' : '–'}</b><span>plays</span></div>
                 <div><b>${st.checks ? st.checksOk + '/' + st.checks : '–'}</b><span>counts</span></div>
                 <div><b>${st.bets ? Math.round((100 * st.betsOk) / st.bets) + '%' : '–'}</b><span>bets</span></div>
                 <button class="peek" id="peek">${cfg.showRC ? `RC ${sgn(G.rc)} · TC ${sgn(tc())}` : 'Peek'}</button></div>`;
            const heat = cfg.heat ? `<div class="heat"><span>Heat</span><div class="hbar"><i style="width:${Math.min(100, G.heat)}%" class="${G.heat > 70 ? 'hot' : G.heat > 40 ? 'warm' : ''}"></i></div></div>` : '';
            const ch = (c, cls = '') => (c.down ? A.cardHTML(null, (c.anim ? 'deal ' : '') + cls) : A.cardHTML(c, cls));
            const arc = `<svg class="arc" viewBox="0 0 300 70"><path id="ap" d="M10,10 Q150,70 290,10" fill="none"/><text><textPath href="#ap" startOffset="50%" text-anchor="middle">BLACKJACK PAYS 3 TO 2</textPath></text></svg>`;
            const shoebox = `<div class="shoebox" title="${dd ? 'deck' : 'shoe'}"><i style="height:${100 - dp}%"></i>${!G.cutOut ? `<b class="cutmark" style="bottom:${cutPct}%"></b>` : ''}</div>`;
            const head = `<div class="dealer-row">${shoebox}<div class="dealer"><div class="cards">${R ? R.dealer.map((c) => ch(c)).join('') : ''}</div>${R && !anyDown(R.dealer) && R.dealer.length > 1 ? `<div class="tot">${B.value(R.dealer).total}${B.value(R.dealer).total > 21 ? ' · bust' : ''}</div>` : ''}</div><div class="discard"><i style="height:${dp}%"></i></div></div>`;
            const ruleLine = `${B.rules().h17 ? 'Dealer must hit soft 17' : 'Dealer must stand on all 17s'} · ${casino ? `$${cfg.min}–$${maxBet().toLocaleString()} · ${cfg.decks} decks` : 'Insurance pays 2 to 1'}`;
            const cutPill = G.cutOut ? '<div class="cutpill">✂ Cut card is out — last hand before the shuffle</div>' : '';
            let table;
            if (R) {
              const others = R.seats.map((s, i) => s.you ? `<div class="oseat you-mark"><span>YOU</span></div>` : `<div class="oseat ${R.turn === i ? 'act' : ''}"><div class="cards mini">${s.cards.map((c) => ch(c, 'sm')).join('')}</div><div class="tot sm">${!s.cards.length ? '' : anyDown(s.cards) ? '?' : B.value(s.cards).total > 21 ? 'bust' : B.value(s.cards).total}</div></div>`).join('');
              const you = R.hands.map((h, i) => {
                const v = B.value(h.cards), hid = anyDown(h.cards);
                const res = G.phase === 'over' ? (h.res > 0 ? ` <span class="pos">+${money(h.res * h.bet)}</span>` : h.res < 0 ? ` <span class="neg">−${money(-h.res * h.bet)}</span>` : ' push') : '';
                return `<div class="hand ${G.phase === 'play' && i === R.act && R.hands.length > 1 ? 'act' : ''}"><div class="cards">${h.cards.map((c) => ch(c)).join('')}</div>
                  <div class="tot">${h.bj ? 'Blackjack!' : hid ? 'double card face down' : (v.soft && v.total < 21 ? 'soft ' : '') + v.total}${!hid && v.total > 21 ? ' · bust' : ''}${h.surr ? ' · surrendered' : ''} · ${money(h.bet)}${res}</div></div>`;
              }).join('');
              table = `<div class="table">${head}${arc}<div class="rule-line">${ruleLine}</div>${cutPill}${G.seats ? `<div class="others">${others}</div>` : ''}<div class="you">${you}</div></div>`;
            } else {
              const extra = casino ? '' : ` · ${dd ? 'double deck' : cfg.decks + ' decks'} · ${cutLabel()}${cfg.burn ? ' · burn card' : ''}${pitch() ? ' · pitched' : ''}`;
              table = `<div class="table empty">${head}${arc}<div class="rule-line">${ruleLine}${extra}</div>${cutPill}
                <div class="you"><div class="place">${casino && G.pend ? `<span class="pend">${fmt$(G.pend)}</span>` : 'Place your bet'}</div></div></div>`;
            }
            let ctl = '';
            const msg = G.msg ? `<div class="fb ${G.msgOk ? 'ok' : 'bad'} slim">${G.msg}</div>` : '';
            if (G.phase === 'bet') {
              if (casino) {
                ctl = `${msg}${CASINO_CHIPS.length ? `<div class="chips">${CASINO_CHIPS.map(([v, c]) => `<button class="chip ${c}" data-chip="${v}" ${v > S.casino.bank ? 'disabled' : ''}><span>${v}</span></button>`).join('')}</div>` : ''}
                  <div class="betbtns"><button class="btn dark" id="clr">Clear</button><button class="btn dark" id="rebet" ${G.lastBet && G.lastBet <= S.casino.bank ? '' : 'disabled'}>Rebet${G.lastBet ? ' ' + fmt$(G.lastBet) : ''}</button><button class="btn" id="dealb" ${G.pend >= cfg.min ? '' : 'disabled'}>Deal</button></div>
                  <p class="center tiny muted">${G.pend && G.pend < cfg.min ? `Table minimum is $${cfg.min}.` : `Bet with the count: 1 unit = $${cfg.min} · ${B.rampText()}`}</p>`;
              } else ctl = `${msg}<p class="center tiny muted">Bet by the true count: ${B.rampText()}${cfg.heat ? ' · jump too fast and you\'ll get heat' : ''}</p>${A.chips()}`;
            } else if (G.phase === 'ins') { const can = canInsure(); ctl = `${msg}<p class="center"><b>Insurance?</b>${can ? '' : ' <span class="tiny muted">— not enough chips</span>'}</p><div class="acts two"><button class="act a-Y" data-ins="1" ${can ? '' : 'disabled'}>Take insurance</button><button class="act a-N" data-ins="0">No insurance</button></div>`; }
            else if (G.phase === 'play') { const o = options(R.hands[R.act]); ctl = `${msg}${cfg.clock ? '<div class="tbar"><i></i></div>' : ''}<div class="acts">${['H', 'S', 'D', 'P', 'R'].map((k) => `<button class="act a-${k}" data-a="${k}" ${(k === 'D' && !o.canDouble) || (k === 'P' && !o.canSplit) || (k === 'R' && !o.canSurrender) ? 'disabled' : ''}>${B.NAMES[k]}</button>`).join('')}</div>`; }
            else if (G.phase === 'over') ctl = `${msg}<div class="fb ${R.net > 0 ? 'ok' : R.net < 0 ? 'bad' : 'info'} slim">${R.net > 0 ? `You won ${money(R.net)}` : R.net < 0 ? `You lost ${money(-R.net)}` : 'Push'}</div><button class="btn big" id="nr">${G.cutOut ? 'Shuffle up ›' : 'Next hand ›'}</button>`;
            else ctl = `${msg}<div class="wait">Dealing…</div>`;
            // when the controls change (new phase), ignore taps for a moment so the second tap of a double-tap
            // can't land on whatever button just appeared under the finger (e.g. a chip under "Next hand")
            if (G.phase !== lastPhase) { lastPhase = G.phase; tapGuardUntil = performance.now() + 380; }
            sw.innerHTML = hud + heat + table + `<div class="ctl">${ctl}</div>`;
            if (R) [R.dealer, ...R.seats.map((s) => s.cards || []), ...R.hands.map((h) => h.cards)].forEach((a) => a.forEach((c) => (c.anim = 0)));
            bind();
          }
          let lastPhase = '', tapGuardUntil = 0;
          const guard = (fn) => (...a) => { if (performance.now() < tapGuardUntil) return; fn(...a); };
          function bind() {
            const pk = $('#peek', sw); if (pk) pk.onclick = () => { if (!cfg.showRC) { G.st.peeks++; pk.textContent = `RC ${sgn(G.rc)} · TC ${sgn(tc())}`; } };
            $$('[data-bet]', sw).forEach((b) => (b.onclick = guard(() => placeBet(+b.dataset.bet))));
            $$('[data-chip]', sw).forEach((b) => (b.onclick = guard(() => { const v = +b.dataset.chip; if (G.pend + v > Math.min(maxBet(), S.casino.bank)) return A.toast(G.pend + v > maxBet() ? `Table maximum is ${fmt$(maxBet())}.` : 'Not enough chips.'); G.pend += v; A.fx.tap(); draw(); })));
            const clr = $('#clr', sw); if (clr) clr.onclick = () => { G.pend = 0; draw(); };
            const rb = $('#rebet', sw); if (rb) rb.onclick = guard(() => { if (G.lastBet && G.lastBet <= S.casino.bank) { G.pend = G.lastBet; draw(); } });
            const db = $('#dealb', sw); if (db) db.onclick = guard(() => { if (G.pend >= cfg.min) { const u = G.pend; G.pend = 0; placeBet(u); } });
            $$('[data-ins]', sw).forEach((b) => (b.onclick = guard(() => insurance(b.dataset.ins === '1'))));
            $$('[data-a]', sw).forEach((b) => (b.onclick = guard(() => act(b.dataset.a))));
            const nr = $('#nr', sw); if (nr) nr.onclick = guard(nextHand);
            if (G.phase === 'play' && cfg.clock) { if (clock) clock.stop(); clock = A.timer($('.ctl .tbar i', sw), cfg.clock, () => act('S', true)); }
          }

          // ---------- casino shoe procedure: shuffle → cut → cut card placed → burn ----------
          function drawCeremony() {
            const sum = lastShoe;
            const summary = sum ? `<div class="card shoesum"><div class="kicker">${sum.backoff ? 'Backed off — new casino' : 'Last shoe'}</div>
              <div class="stats"><div><b class="${sum.net >= 0 ? 'pos' : 'neg'}">${signed(sum.net)}</b><span>${sum.hands} hands</span></div><div><b>${sum.dec ? Math.round((100 * sum.decOk) / sum.dec) + '%' : '–'}</b><span>plays</span></div><div><b>${sum.bets ? Math.round((100 * sum.betsOk) / sum.bets) + '%' : '–'}</b><span>bets on ramp</span></div><div><b>${sum.quiz === null ? '–' : sum.quiz ? '✓' : '✗'}</b><span>count</span></div></div>
              ${sum.misses.length ? `<details><summary class="small">Review ${sum.misses.length} mistake${sum.misses.length > 1 ? 's' : ''}</summary><div class="misses">${sum.misses.slice(-8).map((m) => `<div class="miss"><b>${esc(m.t)}</b><span>${esc(m.a)}</span><small>${esc(m.w)}</small></div>`).join('')}</div></details>` : ''}</div>` : '';
            let body = '';
            if (G.phase === 'shuffle') body = `<div class="card center ceremony"><div class="riffle"><i></i><i></i><i></i></div><h3 class="m0">Shuffling ${cfg.decks} decks…</h3><p class="tiny muted">${G.seats} other player${G.seats === 1 ? '' : 's'} at the table this shoe.</p><button class="btn ghost" id="skip">Skip</button></div>`;
            else if (G.phase === 'cut') body = `<div class="card center ceremony"><div class="kicker">The cut</div><h3 class="m0">You've been offered the cut</h3>
              <p class="muted small">Tap the stack where you want to cut the cards.</p><div class="cutstack" id="cstack"><span class="cs-hint">tap to cut</span></div>
              <button class="btn ghost" id="pass">Pass — let the dealer cut</button></div>`;
            else {
              const q = Math.max(1, Math.round(cfg.decks * (1 - G.pen) * 4) / 4), whole = Math.floor(q), frac = { 0: '', 0.25: '¼', 0.5: '½', 0.75: '¾' }[q - whole];
              const decksTxt = `about ${q === 1 ? 'a deck' : `${whole}${frac} decks`}`;
              body = `<div class="card center ceremony"><div class="kicker">Ready</div><h3 class="m0">Cut card in — ${decksTxt} from the back</h3>
                <div class="cutstack placed"><b class="cutmark h" style="left:${G.pen * 100}%"></b></div>
                <p class="muted small">${G.cutBy === 'you' ? 'You cut the cards.' : 'The dealer cut the cards.'} The dealer burns the top card face down — your count starts at 0.<br>About ${Math.round(G.pen * 100)}% of the shoe will be dealt before the shuffle.</p>
                <button class="btn big" id="goBet">Place your bets ›</button></div>`;
            }
            sw.innerHTML = summary + body;
            const sk = $('#skip', sw); if (sk) sk.onclick = () => { G.phase = 'cut'; draw(); };
            const cs = $('#cstack', sw); if (cs) cs.onclick = (e) => { const r = cs.getBoundingClientRect(); cutAt((e.clientX - r.left) / r.width, 'you'); };
            const ps = $('#pass', sw); if (ps) ps.onclick = () => cutAt(0.3 + Math.random() * 0.4, 'dealer');
            const gb = $('#goBet', sw); if (gb) gb.onclick = () => { clearTimeout(tid); G.phase = 'bet'; draw(); if (casino && S.casino.bank < cfg.min) broke(); };
            if (G.phase === 'shuffle') later(() => { G.phase = 'cut'; draw(); }, 1600);
          }
          function cutAt(f, by) {
            f = Math.max(0.15, Math.min(0.85, f || 0.5));
            const k = Math.round(G.shoe.length * f); G.shoe = G.shoe.slice(k).concat(G.shoe.slice(0, k)); // the cut: bottom part goes on top
            G.cutBy = by; burn(); A.fx.tap(); G.phase = 'place'; draw();
          }

          // ---------- flow ----------
          function placeBet(u) {
            const t = tc(), want = B.ramp(t), units = unitsOf(u); G.st.bets++; S.shoe.bets++;
            const cover = cfg.heat && units < want && units >= want / 2;
            const good = units === want || cover;
            if (good) { G.st.betsOk++; S.shoe.betsOk++; }
            G.msg = '';
            say(good ? (cover ? `Cover bet accepted (ramp says ${money(casino ? want * cfg.min : want)} at TC ${sgn(t)})` : '') : `Bet ${money(u)} — at TC ${sgn(t)} the ramp says ${money(casino ? want * cfg.min : want)}`, good);
            if (!good && (!casino || cfg.coach)) A.fx.bad();
            if (casino && !good) G.st.misses.push({ t: `Bet at TC ${sgn(t)}`, a: `${money(want * cfg.min)} (${want} unit${want > 1 ? 's' : ''})`, w: `Ramp: ${B.rampText()}` });
            if (cfg.heat) {
              const jump = G.prevBet ? Math.log2(u / G.prevBet) : 0; let add = 0;
              if (jump >= 1.5 && !(G.prevWon && u <= G.prevBet * 2)) add = (jump - 1) * 24;
              if (G.st.hands === 0 && units >= B.rampSteps()[3]) add += 25;
              G.heat = Math.max(0, G.heat * 0.93 - 3 + add); G.maxHeat = Math.max(G.maxHeat, G.heat);
              if (add >= 20 && G.heat < 100) { G.msg += (G.msg ? '<br>' : '') + 'The pit boss glanced over at that bet jump.'; G.msgOk = false; }
              if (G.heat >= 100) return backoff();
            }
            G.bet = u; G.prevBet = u; G.lastBet = u;
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
            const n = G.seats, ya = youAt();
            R = { dealer: [], seats: [], hands: [], act: 0, turn: -1, net: 0 };
            for (let i = 0; i <= n; i++) R.seats.push(i === ya ? { you: true } : { cards: [] });
            R.hands.push({ cards: [], bet: G.bet });
            G.phase = 'deal';
            const steps = [];
            for (let pass = 0; pass < 2; pass++) {
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
          // in the casino, insurance costs half the bet in real chips — it can't be taken without them
          function canInsure() { return !casino || S.casino.bank - exposure() >= R.hands[0].bet / 2; }
          function insurance(take) {
            const afford = canInsure(); if (!afford) take = false;
            const want = tc() >= insIdx() && afford; G.st.dec++; S.shoe.dec++;
            if (take === want) { G.st.decOk++; S.shoe.decOk++; say(`✓ ${take ? 'Insured' : 'No insurance'} at TC ${sgn(tc())}`, true); if (!casino || cfg.coach) A.fx.ok(); }
            else { say(`✗ Insurance only at TC ${sgn(insIdx())} or higher (TC is ${sgn(tc())})`, false); if (!casino || cfg.coach) A.fx.bad(); G.st.misses.push({ t: `Insurance at TC ${sgn(tc())}`, a: want ? 'Take it' : 'Decline', w: `Take insurance at ${sgn(insIdx())} or higher` }); }
            if (take) R.ins = R.hands[0].bet / 2;
            peek();
          }
          function peek() {
            if (B.isBJ(R.dealer)) { reveal(R.dealer[1]); G.msg = (G.msg ? G.msg + '<br>' : '') + 'Dealer has blackjack.'; return settle(); }
            if (B.isBJ(R.hands[0].cards)) { R.hands[0].done = true; R.hands[0].bj = true; }
            R.seats.forEach((s) => { if (!s.you && B.isBJ(s.cards)) s.cards.forEach(reveal); });
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
                if (p === 'D') { s.cards.forEach(reveal); s.cards.push(drawC(!pitch())); draw(); i++; return later(nextSeat); }
                s.cards.push(drawC(true));
                if (B.value(s.cards).total > 21) s.cards.forEach(reveal);
                draw(); later(step);
              };
              step();
            };
            nextSeat();
          }
          function options(h) {
            const two = h.cards.length === 2;
            const o = { canDouble: two && !h.splitAces, canSplit: two && B.isPair(h.cards) && R.hands.length < 4 && !h.splitAces, canSurrender: two && R.hands.length === 1 && !h.fromSplit && B.rules().ls };
            if (casino) { const room = S.casino.bank - exposure(); if (room < h.bet) { o.canDouble = false; o.canSplit = false; } }
            return o;
          }
          function act(a, timedOut) {
            if (G.phase !== 'play') return;
            if (clock) { clock.stop(); clock = null; }
            const h = R.hands[R.act], o = options(h), t = cfg.dev ? tc() : null;
            const book = B.play(h.cards, R.up, t, o), good = !timedOut && a === book;
            G.st.dec++; S.shoe.dec++; A.hist(1, good ? 1 : 0);
            const cell = B.cellOf(h.cards, R.up);
            if (cell && !h.fromSplit && !timedOut && o.canDouble && o.canSurrender === B.rules().ls && !casino) A.gradeCell(cell, a === B.play(h.cards, R.up, null, o));
            if (good) { G.st.decOk++; S.shoe.decOk++; say(`✓ ${B.NAMES[a]}`, true); if (!casino || cfg.coach) A.fx.ok(); }
            else {
              const label = `${handLbl(h.cards)} vs ${B.upName(R.up)}${cfg.dev ? ` (TC ${sgn(tc())})` : ''}`;
              const w = B.tcNote(h.cards, R.up, t, o) || B.why(h.cards, R.up, book);
              G.st.misses.push({ t: label, a: B.NAMES[book], w });
              say(`${timedOut ? '⏱ Too slow — you stood. ' : '✗ '}Book play: <b>${B.NAMES[book]}</b> (${esc(label)})`, false); if (!casino || cfg.coach) A.fx.bad();
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
            if (casino) { const c = S.casino; c.bank += net; c.net += net; c.hands++; c.peak = Math.max(c.peak, c.bank); }
            G.phase = 'over'; A.save(); draw();
          }
          function nextHand() {
            G.msg = '';
            if (!casino && args.hands && total.hands >= args.hands) return report(false, true);
            if (G.cutOut) return casino ? (cfg.quiz ? shuffleQuiz() : endShoe(null)) : report(false);
            R = null;
            if (casino) { if (S.casino.bank < cfg.min) return broke(); G.phase = 'bet'; return draw(); }
            G.untilCheck--;
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
          // casino: one count question as the cut card comes out, then the summary and a fresh shuffle
          function shuffleQuiz() {
            G.phase = 'check'; R = null;
            const p = A.pad((g) => {
              const good = g === G.rc; G.st.checks++; S.shoe.checks++; if (good) { G.st.checksOk++; S.shoe.checksOk++; A.fx.ok(); A.addXP(5); } else A.fx.bad();
              A.hist(1, good ? 1 : 0); A.save();
              A.toast(good ? `✓ Right — the count was ${sgn(G.rc)}` : `✗ The count was ${sgn(G.rc)} (you said ${sgn(g)})`, good ? 'good' : 'bad');
              endShoe(good);
            }, { label: 'Answer', small: true });
            sw.innerHTML = `<div class="card center"><div class="kicker">Cut card's out</div><h2 class="m0">Before the shuffle: what was the running count?</h2><p class="tiny muted">The last hand is done. Everything goes back into a fresh shuffle.</p></div>${p.html}`;
            p.bind(sw);
          }
          function endShoe(quizOk, backedOff) {
            const st = G.st;
            if (!backedOff) { S.shoe.shoes++; S.best.shoeClean = (S.best.shoeClean || 0) + 1; }
            S.casino.shoes = (S.casino.shoes || 0) + 1;
            A.addXP(Math.round(st.decOk * 0.4 + st.betsOk * 0.4 + st.checksOk * 3) + (backedOff ? 0 : 10));
            lastShoe = { net: st.units, hands: st.hands, dec: st.dec, decOk: st.decOk, bets: st.bets, betsOk: st.betsOk, quiz: quizOk === undefined ? null : quizOk, misses: st.misses.slice(), backoff: !!backedOff };
            A.save(); R = null; newShoe(); draw();
          }
          function broke() {
            A.sheet(`<div class="burst cold">${A.icon('chip')}</div><h2 class="m0">Out of chips</h2><p class="muted">Variance happens — even to perfect players. Reload ${fmt$(START_BANK)} in practice chips and keep training.</p><button class="btn" id="rl">Reload ${fmt$(START_BANK)}</button>`, (r, close) => {
              r.querySelector('.sheet').setAttribute('data-lock', '1');
              $('#rl', r).onclick = () => { S.casino.bank = START_BANK; S.casino.reloads = (S.casino.reloads || 0) + 1; A.save(); close(); G.phase = 'bet'; draw(); };
            });
          }
          function backoff() {
            G.backoff = true; S.shoe.backoffs++; A.save(); A.fx.bad();
            A.sheet(`<div class="burst cold">${A.icon('close')}</div><div class="kicker">Backed off</div><h2 class="m0">"You're welcome to play any other game, but no more blackjack tonight."</h2>
              <p class="muted">Your bet jumps drew too much heat. Ramp more gradually, parlay wins, and avoid big bets right after the shuffle.</p><button class="btn" id="bo">${casino ? 'Walk to another casino' : 'See report'}</button>`, (r, close) => {
              r.querySelector('.sheet').setAttribute('data-lock', '1');
              $('#bo', r).onclick = () => { close(); if (casino) { G.heat = 0; endShoe(undefined, true); } else report(true); };
            });
          }
          function report(backedOff, workoutDone) {
            const st = G.st;
            if (!backedOff && !workoutDone) { S.shoe.shoes++; S.best.shoeClean = (S.best.shoeClean || 0) + 1; }
            const xp = Math.round(st.decOk * 0.5 + st.checksOk * 3 + st.betsOk * 0.5) + (backedOff ? 0 : 20);
            A.addXP(xp); A.save();
            const pct = (a, b) => (b ? Math.round((100 * a) / b) + '%' : '–');
            sw.innerHTML = `<div class="result"><div class="kicker">${backedOff ? 'Backed off' : workoutDone ? 'Session complete' : dd ? 'Deck complete' : 'Shoe complete'}</div>
              <div class="big-num ${st.units >= 0 ? 'pos' : 'neg'}">${signed(st.units)}</div>
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
            const common = `${seg('speed', { label: 'Deal speed', v: [['slow', 'Slow'], ['normal', 'Normal'], ['fast', 'Fast'], ['instant', 'Instant']] })}
              ${seg('clock', { label: 'Decision clock', v: [[0, 'Off'], [5000, '5s'], [3000, '3s'], [2000, '2s']] })}`;
            const html = casino
              ? `<h3 class="m0">Casino table</h3><p class="tiny muted">A normal shoe game. Strategy here is 6-deck strategy, whatever your main game is.</p>
                ${seg('h17', { label: 'Dealer on soft 17', v: [[true, 'Hits (H17)'], [false, 'Stands (S17)']] })}
                ${seg('ls', { label: 'Late surrender', v: [[true, 'Offered'], [false, 'Not offered']] })}
                ${seg('decks', { label: 'Decks', v: [[6, '6 decks'], [8, '8 decks']] })}
                ${seg('min', { label: 'Table minimum', v: [[10, '$10'], [25, '$25'], [50, '$50'], [100, '$100']] })}
                ${seg('cut', { label: 'Cut card', v: [['random', 'Random'], [0.67, '2 decks'], [0.75, '1½ decks'], [0.83, '1 deck']] })}
                ${seg('seats', { label: 'Other players', v: [['random', 'Random'], [0, '0'], [1, '1'], [2, '2'], [3, '3'], [4, '4'], [5, '5']] })}
                ${common}
                <div class="tgl"><span>Coach me during play</span>${sw2('coach')}</div>
                <div class="tgl"><span>Count question at each shuffle</span>${sw2('quiz')}</div>
                <div class="tgl"><span>Grade with index plays</span>${sw2('dev')}</div>
                <div class="tgl"><span>Heat & backoffs</span>${sw2('heat')}</div>
                <div class="tgl"><span>Table chatter</span>${sw2('chatter')}</div>
                <div class="tgl"><span>Burn the first card</span>${sw2('burn')}</div>
                <div class="tgl"><span>Always show the count</span>${sw2('showRC')}</div>
                <p class="tiny muted">Bank: ${fmt$(S.casino.bank)} · ${S.casino.hands} hands played · lifetime ${signed(S.casino.net)}</p>
                <button class="btn" id="cs">Save · shuffle up</button><button class="btn ghost" id="rbank">Reset bankroll to ${fmt$(START_BANK)}</button>`
              : `<h3 class="m0">Table settings</h3><p class="tiny muted">${esc(B.rulesLabel())} — change your game in Settings.</p>
                ${seg('deal', { label: 'Dealing', v: [['up', 'Face up'], ['pitch', 'Pitch (face down)']] })}
                ${seg('cut', { label: 'Cut card', v: [['random', 'Random'], [0.5, '50%'], [0.65, '65%'], [0.75, '75%'], [0.83, '83%']] })}
                ${dd ? '' : seg('decks', { label: 'Decks', v: [[6, '6 decks'], [8, '8 decks']] })}
                ${seg('seats', { label: 'Other players', v: [[0, '0'], [1, '1'], [2, '2'], [3, '3'], [4, '4'], [5, '5']] })}
                ${common}
                <div class="tgl"><span>Burn the first card</span>${sw2('burn')}</div>
                <div class="tgl"><span>Grade with index plays</span>${sw2('dev')}</div>
                <div class="tgl"><span>Heat & backoffs</span>${sw2('heat')}</div>
                <div class="tgl"><span>Table chatter (distraction)</span>${sw2('chatter')}</div>
                <div class="tgl"><span>Always show the count</span>${sw2('showRC')}</div>
                <p class="tiny muted">Random cut: the shuffle comes ${dd ? '50–75%' : '65–85%'} of the way through, different every time — like a cut card placed by a player.</p>
                <button class="btn" id="cs">Save · shuffle up</button>`;
            A.sheet(html, (r, close) => {
              $$('[data-c]', r).forEach((g) => $$('button', g).forEach((b) => (b.onclick = () => { const v = b.dataset.v; cfg[g.dataset.c] = v === 'true' ? true : v === 'false' ? false : isNaN(+v) ? v : +v; $$('button', g).forEach((x) => x.classList.toggle('on', x === b)); })));
              $$('[data-sw]', r).forEach((b) => (b.onclick = () => { cfg[b.dataset.sw] = !cfg[b.dataset.sw]; b.classList.toggle('on', cfg[b.dataset.sw]); }));
              $('#cs', r).onclick = () => {
                if (casino) { S.prof.casino = Object.assign({}, cfg); B.setRules({ decks: cfg.decks, h17: cfg.h17, ls: cfg.ls }); } else S.prof.shoe = Object.assign({}, cfg);
                A.save(); close(); clearTimeout(tid); lastShoe = null; R = null; newShoe(casino ? '' : 'New settings saved.'); draw();
              };
              const rbk = $('#rbank', r); if (rbk) rbk.onclick = () => { S.casino = { bank: START_BANK, hands: 0, net: 0, peak: START_BANK, shoes: 0 }; A.save(); close(); A.toast(`Bankroll reset to ${fmt$(START_BANK)}`); draw(); };
            });
          }
          const sw2 = (k) => `<button class="switch ${cfg[k] ? 'on' : ''}" data-sw="${k}"><i></i></button>`;
          openSettings = settings;
          draw();
          return () => { clearTimeout(tid); if (clock) clock.stop(); if (casino) A.applyRules(); };
        }
      };
    };
  }

  SCREENS.shoe = makeTable('trainer');
  SCREENS.casino = makeTable('casino');
})();
