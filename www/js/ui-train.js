/* Train tab: hub + drills. */
(function () {
  const A = window.APP, B = window.BJ, { $, $$, esc, SCREENS, go, rnd, pick, sgn } = A;

  // ---------- hub ----------
  SCREENS.train = () => {
    const S = A.S, b = S.best;
    const it = (g, ic, t, s, rec) => `<button class="list-item" data-go="${g}"><span class="ic">${ic}</span><span class="tx"><b>${esc(t)}</b><span>${esc(s)}</span></span>${rec ? `<span class="rec">${esc(rec)}</span>` : '<span class="chev">›</span>'}</button>`;
    return {
      title: 'Train',
      html: `
      <h3 class="sec">Basic strategy</h3>
      ${it('strategy', '♠', 'Adaptive trainer', 'Drills the hands you miss until you stop missing them', Math.round(A.masteryPct('all') * 100) + '%')}
      ${it('blitz', '⚡', 'Strategy Blitz', '60 seconds. Wrong answers cost 3 seconds.', b.blitz ? 'best ' + b.blitz : '')}
      ${it('mastery', '▦', 'Mastery map', 'See every cell of the chart you own')}
      <h3 class="sec">Counting</h3>
      ${it('reflex', '±', 'Reflex', 'Card → value, as fast as you can', b.reflex ? 'best ' + b.reflex : '')}
      ${it('pairs', '⇄', 'Pair cancellation', 'Two cards at a time', b.pairs ? 'best ' + b.pairs : '')}
      ${it('deck', '🂠', 'Deck countdown', 'A full deck against the clock', b.deck !== null ? b.deck.toFixed(1) + 's' : '')}
      ${it('ladder', '↗', 'Speed ladder', 'Gets faster every time you\'re right', b.ladder ? b.ladder.toFixed(1) + '/s' : '')}
      ${it('flash', '◎', 'Table flash', 'Whole rounds, shown for a split second', b.flash ? 'level ' + b.flash : '')}
      <h3 class="sec">True count & betting</h3>
      ${it('tc', '÷', 'True count conversion', 'Running count → true count in under 2s', b.tc !== null ? b.tc.toFixed(1) + 's' : '')}
      ${it('decks', '▤', 'Tray reading', 'Estimate decks left from the discard tray', b.decks ? b.decks + '/10' : '')}
      ${it('ramp', '◉', 'Bet ramp', 'Count → bet, instantly', b.ramp ? b.ramp + '/10' : '')}
      <h3 class="sec">Index plays</h3>
      ${it('index', '✦', 'Index trainer', 'Illustrious 18 + Fab 4 at live counts', Math.round(A.idxPct() * 100) + '%')}
      ${it('recall', '#', 'Index recall', 'Name the exact number', b.recall ? 'best ' + b.recall : '')}
      <h3 class="sec">Simulation & tools</h3>
      ${it('shoe', '🂡', 'Shoe simulator', 'Count, bet and play a real shoe — with heat', S.shoe.hands ? S.shoe.hands + ' hands' : '')}
      ${it('chart', '☷', 'Strategy charts', 'For your table rules')}
      ${it('bankroll', '$', 'Bankroll & risk of ruin', 'Hourly win, swings, survival odds')}`,
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

  // Result screen used by every timed drill
  function result(root, o) {
    const S = A.S;
    root.innerHTML = `<div class="result">
      ${o.rec ? '<div class="pill gold pb">New personal best!</div>' : ''}
      <div class="kicker">${esc(o.kicker || 'Result')}</div><div class="big-num">${o.big}</div><p class="muted">${o.sub || ''}</p>
      ${o.stats ? `<div class="stats">${o.stats.map(([k, v]) => `<div><b>${v}</b><span>${esc(k)}</span></div>`).join('')}</div>` : ''}
      ${o.note ? `<div class="fb ${o.good ? 'ok' : 'info'}">${o.note}</div>` : ''}
      ${o.misses && o.misses.length ? `<h3 class="sec">Review your misses</h3><div class="card misses">${o.misses.slice(0, 8).map((m) => `<div class="miss"><b>${esc(m.t)}</b><span>${esc(m.a)}</span>${m.w ? `<small>${esc(m.w)}</small>` : ''}</div>`).join('')}</div>` : ''}
      ${o.args && o.args.wk ? '<button class="btn big" id="wkn">Continue workout ›</button><button class="btn ghost" id="ag">Go again</button>' : '<button class="btn big" id="ag">Go again</button><button class="btn ghost" id="dn">Done</button>'}
    </div>`;
    if (o.rec) { A.confetti(); A.fx.win(); }
    const w = $('#wkn', root); if (w) w.onclick = () => A.wkNext();
    $('#ag', root).onclick = o.again;
    const d = $('#dn', root); if (d) d.onclick = () => A.back();
    S && A.save();
  }

  // ---------- Adaptive strategy trainer ----------
  SCREENS.strategy = (args) => {
    const S = A.S, reps = args.reps || 0;
    let group = args.group || 'all', pressure = 0, streak = 0, n = 0, ok = 0, cur = null, tmr = null, locked = false;
    const pool = xpPool(), misses = [];
    return {
      title: 'Adaptive Trainer',
      html: `<div class="seg" id="grp">${[['all', 'All'], ['hard', 'Hard'], ['soft', 'Soft'], ['pairs', 'Pairs'], ['weak', 'Weak']].map(([v, t]) => `<button data-v="${v}" class="${v === group ? 'on' : ''}">${t}</button>`).join('')}</div>
        <div class="statrow"><div><b id="sk">0</b><span>streak</span></div><div><b id="ac">–</b><span>accuracy</span></div><div><b id="ms">–</b><span>mastered</span></div><div><b id="rp">${reps ? '0/' + reps : S.best.strat}</b><span>${reps ? 'reps' : 'best streak'}</span></div></div>
        <div id="tb" class="tbar ${pressure ? '' : 'hide'}"><i></i></div>
        ${felt(`<div class="lbl">Dealer</div><div class="cards" id="dl"></div><div class="lbl">You</div><div class="cards" id="pl"></div><div class="tot" id="pt"></div>`, 'flashable')}
        ${actBtns()}
        <div id="fb" class="fb info">${B.rules().h17 ? 'H17' : 'S17'} · DAS · ${B.rules().ls ? 'late surrender' : 'no surrender'}</div>
        <div class="row-sb small"><button class="linkbtn" id="prs">Pressure: off</button><button class="linkbtn" data-go2="chart">Chart</button></div>`,
      mount(root) {
        const upd = () => {
          $('#sk', root).textContent = streak; $('#ac', root).textContent = n ? Math.round((100 * ok) / n) + '%' : '–';
          $('#ms', root).textContent = Math.round(A.masteryPct(group === 'weak' ? 'all' : group) * 100) + '%';
          $('#rp', root).textContent = reps ? `${n}/${reps}` : S.best.strat;
        };
        function deal() {
          const key = A.pickCell(group), [row, upS] = key.split('-'), up = +upS;
          const cards = B.cellCards(row);
          cur = { key, cards, up, upc: B.card(B.rankFor(up)), ans: B.play(cards, up, null) };
          $('#dl', root).innerHTML = A.cardHTML(Object.assign(cur.upc, { anim: 1 })) + A.cardHTML(null);
          $('#pl', root).innerHTML = cards.map((c) => A.cardHTML(Object.assign(c, { anim: 1 }))).join('');
          $('#pt', root).textContent = handTotal(cards);
          setActs(root, { P: !B.isPair(cards), R: !B.rules().ls });
          locked = false;
          if (tmr) tmr.stop();
          if (pressure) tmr = A.timer($('#tb i', root), pressure, () => answer(null));
        }
        function answer(a) {
          if (locked) return; locked = true; if (tmr) tmr.stop();
          n++; const good = a === cur.ans; A.gradeCell(cur.key, good); A.hist(1, good ? 1 : 0);
          const fb = $('#fb', root), fl = $('.felt', root);
          if (good) {
            ok++; streak++; A.fx.ok(); pool.add(1);
            if (streak > S.best.strat) S.best.strat = streak;
            fb.className = 'fb ok'; fb.textContent = `✓ ${B.NAMES[a]}`;
            fl.classList.remove('good', 'badf'); void fl.offsetWidth; fl.classList.add('good');
            upd(); A.save();
            if (reps && n >= reps) return setTimeout(finish, 350);
            setTimeout(deal, 330);
          } else {
            streak = 0; A.fx.bad();
            const w = B.why(cur.cards, cur.up, cur.ans);
            misses.push({ t: B.cellLabel(cur.key), a: B.NAMES[cur.ans], w });
            fl.classList.remove('good', 'badf'); void fl.offsetWidth; fl.classList.add('badf');
            fb.className = 'fb bad'; fb.innerHTML = `<b>${a ? `Not ${B.NAMES[a]} — ` : 'Too slow — '}${B.NAMES[cur.ans]}.</b><br><span class="small">${esc(w)}</span><button class="btn sm" id="gi">Got it ›</button>`;
            upd(); A.save();
            $('#gi', root).onclick = () => { fb.className = 'fb info'; fb.textContent = 'Keep going.'; if (reps && n >= reps) finish(); else deal(); };
          }
        }
        function finish() {
          pool.flush();
          result(root, { kicker: 'Strategy reps', big: Math.round((100 * ok) / n) + '%', sub: `${ok} of ${n} correct`, args, misses, good: ok === n,
            note: ok === n ? 'Perfect set.' : 'Misses are scheduled to come back sooner until you own them.',
            again: () => A.replace('strategy', Object.assign({}, args)) });
        }
        $$('[data-a]', root).forEach((b) => (b.onclick = () => answer(b.dataset.a)));
        $$('#grp button', root).forEach((b) => (b.onclick = () => { group = b.dataset.v; $$('#grp button', root).forEach((x) => x.classList.toggle('on', x === b)); upd(); deal(); }));
        $('#prs', root).onclick = (e) => { pressure = pressure === 0 ? 3000 : pressure === 3000 ? 2000 : pressure === 2000 ? 1500 : 0; e.target.textContent = 'Pressure: ' + (pressure ? pressure / 1000 + 's' : 'off'); $('#tb', root).classList.toggle('hide', !pressure); deal(); };
        $('[data-go2]', root).onclick = () => go('chart');
        upd(); deal();
        return () => { if (tmr) tmr.stop(); pool.flush(); };
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
          bz.innerHTML = `<div class="statrow"><div><b id="sc">0</b><span>score</span></div><div><b id="tl">60</b><span>seconds</span></div><div><b>${S.best.blitz}</b><span>best</span></div></div>
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
            note: score >= 40 ? 'Casino speed. 🔥' : score >= 25 ? 'Getting fast. Push for 40.' : 'Speed comes from reps — the adaptive trainer will fix your misses.', good: score >= 40,
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
            vd.innerHTML = `<div class="statrow"><div><b id="sc">0</b><span>score</span></div><div><b id="tl">60</b><span>seconds</span></div><div><b>${S.best[kind]}</b><span>best</span></div></div><div class="tbar"><i></i></div>
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
              note: two ? (score >= 40 ? 'Pairs are automatic. 🔥' : 'Aim for 40+: high + low = zero, no thinking.') : (score >= 60 ? 'Instant recognition. 🔥' : 'Aim for 60+. Wrong answers cost a second.'), good: score >= (two ? 40 : 60),
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
                note: !good ? 'Slow down until you\'re perfect, then speed up.' : full && secs <= 25 ? 'Casino-ready speed. 🔥' : 'Goal: a perfect full deck in 25 seconds.',
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
          lw.innerHTML = `<div class="statrow"><div><b>${speed.toFixed(1)}</b><span>cards/sec</span></div><div><b>${'♥'.repeat(lives)}<span class="dim">${'♥'.repeat(3 - lives)}</span></b><span>lives</span></div><div><b>${top ? top.toFixed(1) : '–'}</b><span>top speed</span></div></div>
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
            note: top >= 3 ? 'That\'s faster than most dealers. 🔥' : 'Real tables run 2–3 cards per second at times. Keep climbing.', again: () => A.replace('ladder', Object.assign({}, args)) });
        };
        $('#st', lw).onclick = round;
        if (args.wk) round();
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
          tw.innerHTML = `<div class="statrow"><div><b>${level}</b><span>level</span></div><div><b>${(ms / 1000).toFixed(1)}s</b><span>view time</span></div><div><b>${'♥'.repeat(lives)}<span class="dim">${'♥'.repeat(3 - lives)}</span></b><span>lives</span></div></div>
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
            note: cleared >= 8 ? 'You read tables like a pro. 🔥' : 'Count hands, not cards: cancel pairs inside each hand.', again: () => A.replace('flash', Object.assign({}, args)) });
        };
        $('#st', tw).onclick = round;
        if (args.wk) round();
        return () => { if (tmr) tmr.stop(); };
      }
    };
  };

  // ---------- discard tray graphic ----------
  function tray(played, total = 6) {
    const h = Math.round((played / total) * 100);
    return `<div class="tray"><div class="tray-in"><div class="stack" style="height:${h}%"></div></div><div class="tray-lbl">${total}-deck discard tray</div></div>`;
  }
  A.tray = tray;

  // ---------- True count ----------
  SCREENS.tc = (args) => {
    const S = A.S, N = 10; let q = 0, ok = 0, times = [], cur, t0, hard = false;
    const make = () => { const left = (1 + rnd(11)) / 2; const rc = Math.round((Math.random() * 2 - 1) * 4 * left + (Math.random() < 0.5 ? rnd(6) : 0)); cur = { left, rc, ans: B.trueCount(rc, left) }; };
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
            $('#res', tw).innerHTML = `<div class="fb ${good ? 'ok' : 'bad'}">${good ? '✓' : '✗'} ${sgn(cur.rc)} ÷ ${cur.left} = ${(cur.rc / cur.left).toFixed(2)} → <b>${sgn(cur.ans)}</b> · ${dt.toFixed(1)}s</div>`;
            setTimeout(ask, good ? 600 : 1700);
          }, { label: 'Enter true count', small: true });
          tw.innerHTML = `<div class="qprog">${Array.from({ length: N }, (_, j) => `<i class="${j < q ? 'on' : j === q ? 'cur' : ''}"></i>`).join('')}</div>
            <div class="felt tcfelt"><div class="lbl">Running count</div><div class="rc">${sgn(cur.rc)}</div>${tray(6 - cur.left)}
            <div class="lbl">${hard ? 'Decks left: <b>?</b>' : `Decks left: <b>${cur.left}</b>`}</div></div><div id="res"></div>${p.html}`;
          p.bind(tw);
        };
        const done = () => {
          const avg = times.reduce((a, b) => a + b, 0) / times.length, rec = ok === N ? A.record('tc', +avg.toFixed(2)) : false;
          A.addXP(ok * 2 + (ok === N ? 10 : 0));
          result(tw, { kicker: 'True count', big: `${ok}/${N}`, sub: `${avg.toFixed(2)}s average`, rec, args, good: ok === N && avg <= 2,
            note: ok === N && avg <= 2 ? 'Casino-ready speed. 🔥' : 'Goal: 10/10 with under 2 seconds each.', again: () => { q = 0; ok = 0; times = []; ask(); } });
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
          const played = (1 + rnd(11)) / 2, left = 6 - played;
          const opts = new Set([left]); while (opts.size < 4) { const o = left + pick([-1.5, -1, -0.5, 0.5, 1, 1.5]); if (o >= 0.5 && o <= 5.5) opts.add(o); }
          const list = [...opts].sort((a, b) => a - b);
          tw.innerHTML = `<div class="qprog">${Array.from({ length: N }, (_, j) => `<i class="${j < q ? 'on' : j === q ? 'cur' : ''}"></i>`).join('')}</div>
            <div class="felt tcfelt">${tray(played)}<div class="lbl">How many decks are <b>left</b> in the shoe?</div></div>
            <div class="opts grid2">${list.map((o) => `<button class="opt" data-v="${o}"><b>${o}</b></button>`).join('')}</div><div id="res"></div>`;
          $$('[data-v]', tw).forEach((b) => (b.onclick = () => {
            const good = +b.dataset.v === left; if (good) ok++; q++; A.hist(1, good ? 1 : 0); good ? A.fx.ok() : A.fx.bad();
            $$('[data-v]', tw).forEach((x) => { x.disabled = true; if (+x.dataset.v === left) x.classList.add('right'); else if (x === b) x.classList.add('wrong'); });
            $('#res', tw).innerHTML = `<div class="fb ${good ? 'ok' : 'bad'}">${played} decks played → ${left} left</div>`;
            setTimeout(ask, good ? 700 : 1500);
          }));
        };
        const done = () => { const rec = A.record('decks', ok); A.addXP(ok * 2); result(tw, { kicker: 'Tray reading', big: `${ok}/${N}`, rec, args, good: ok >= 8, note: 'Tip: picture the tray in halves and quarters — 1.5, 3, 4.5 decks.', again: () => { q = 0; ok = 0; ask(); } }); };
        ask();
      }
    };
  };

  // ---------- Bet ramp ----------
  const CHIPS = [[1, 'c1'], [2, 'c2'], [4, 'c4'], [8, 'c8'], [12, 'c12']];
  A.chips = (attr = 'data-bet') => `<div class="chips">${CHIPS.map(([u, c]) => `<button class="chip ${c}" ${attr}="${u}"><span>${u}</span></button>`).join('')}</div>`;
  SCREENS.ramp = (args) => {
    const N = 10; let q = 0, ok = 0;
    return {
      title: 'Bet Ramp',
      html: `<div id="rw"></div>`,
      mount(root) {
        const rw = $('#rw', root);
        const ask = () => {
          if (q >= N) return done();
          const left = (1 + rnd(11)) / 2, rc = Math.round((Math.random() * 1.6 - 0.4) * 5 * left), tc = B.trueCount(rc, left), want = B.ramp(tc);
          rw.innerHTML = `<div class="qprog">${Array.from({ length: N }, (_, j) => `<i class="${j < q ? 'on' : j === q ? 'cur' : ''}"></i>`).join('')}</div>
            <div class="felt tcfelt"><div class="lbl">Running count</div><div class="rc">${sgn(rc)}</div><div class="lbl">Decks left: <b>${left}</b></div></div>
            <p class="center muted small">Ramp: ≤+1 → 1 · +2 → 2 · +3 → 4 · +4 → 8 · +5 → 12 units</p>${A.chips()}<div id="res"></div>`;
          $$('[data-bet]', rw).forEach((b) => (b.onclick = () => {
            const good = +b.dataset.bet === want; if (good) ok++; q++; A.hist(1, good ? 1 : 0); good ? A.fx.ok() : A.fx.bad();
            $$('[data-bet]', rw).forEach((x) => (x.disabled = true));
            $('#res', rw).innerHTML = `<div class="fb ${good ? 'ok' : 'bad'}">TC ${sgn(tc)} → bet <b>${want} unit${want > 1 ? 's' : ''}</b></div>`;
            setTimeout(ask, good ? 650 : 1600);
          }));
        };
        const done = () => { const rec = A.record('ramp', ok); A.addXP(ok * 2); result(rw, { kicker: 'Bet ramp', big: `${ok}/${N}`, rec, args, good: ok === N, note: 'Count → true count → bet, in one motion.', again: () => { q = 0; ok = 0; ask(); } }); };
        ask();
      }
    };
  };

  // ---------- Index trainer ----------
  SCREENS.index = (args) => {
    const S = A.S, reps = args.reps || 0; let n = 0, ok = 0, streak = 0, cur, lock = false; const pool = xpPool(), misses = [];
    return {
      title: 'Index Plays',
      html: `<div class="statrow"><div><b id="sk">0</b><span>streak</span></div><div><b id="ac">–</b><span>accuracy</span></div><div><b id="ms">${Math.round(A.idxPct() * 100)}%</b><span>mastered</span></div><div><b id="rp">${reps ? '0/' + reps : S.best.index}</b><span>${reps ? 'reps' : 'best streak'}</span></div></div><div id="iw"></div>`,
      mount(root) {
        const iw = $('#iw', root);
        const upd = () => { $('#sk', root).textContent = streak; $('#ac', root).textContent = n ? Math.round((100 * ok) / n) + '%' : '–'; $('#ms', root).textContent = Math.round(A.idxPct() * 100) + '%'; $('#rp', root).textContent = reps ? `${n}/${reps}` : S.best.index; };
        const next = () => {
          const d = A.pickDev(), idx = B.devIdx(d), tc = idx + pick([-2, -1, -1, 0, 0, 1, 1, 2]);
          const hand = d.hand(), o = Object.assign({ canSurrender: d.set === 'Fab4' }, d.o || {});
          cur = { d, tc, hand, o, ans: d.insurance ? (tc >= 3 ? 'Y' : 'N') : B.play(hand, d.up, tc, o) }; lock = false;
          const btns = d.insurance ? `<div class="acts two"><button class="act a-Y" data-a="Y">Take insurance</button><button class="act a-N" data-a="N">No insurance</button></div>`
            : actBtns({ dis: { P: !B.isPair(hand), R: !o.canSurrender || !B.rules().ls } });
          iw.innerHTML = felt(`<div class="tcbadge">TC <b>${sgn(tc)}</b></div><div class="lbl">Dealer</div><div class="cards">${A.cardHTML(B.card(B.rankFor(d.up)))}${A.cardHTML(null)}</div>
            <div class="lbl">You</div><div class="cards">${hand.map((c) => A.cardHTML(c)).join('')}</div><div class="tot">${d.insurance ? 'Dealer shows an Ace — insurance?' : handTotal(hand) + (o.canSurrender && B.rules().ls ? ' · surrender allowed' : ' · no surrender')}</div>`, 'flashable') + btns + '<div id="fb"></div>';
          $$('[data-a]', iw).forEach((b) => (b.onclick = () => answer(b.dataset.a)));
        };
        const answer = (a) => {
          if (lock) return; lock = true; n++;
          const good = a === cur.ans; A.gradeDev(cur.d.id, good); A.hist(1, good ? 1 : 0);
          const nm = (k) => (k === 'Y' ? 'Take insurance' : k === 'N' ? 'No insurance' : B.NAMES[k]);
          const fl = $('.felt', iw); fl.classList.add(good ? 'good' : 'badf');
          if (good) {
            ok++; streak++; A.fx.ok(); pool.add(2); if (streak > S.best.index) S.best.index = streak; A.save(); upd();
            $('#fb', iw).innerHTML = `<div class="fb ok">✓ ${nm(a)} — ${esc(cur.d.rule)}</div>`;
            if (reps && n >= reps) return setTimeout(finish, 500);
            setTimeout(next, 650);
          } else {
            streak = 0; A.fx.bad(); A.save(); upd();
            misses.push({ t: `${cur.d.name} at TC ${sgn(cur.tc)}`, a: nm(cur.ans), w: cur.d.rule });
            $('#fb', iw).innerHTML = `<div class="fb bad"><b>${cur.d.name} at ${sgn(cur.tc)}: ${nm(cur.ans)}.</b><br><span class="small">${esc(cur.d.rule)}.</span><button class="btn sm" id="gi">Got it ›</button></div>`;
            $('#gi', iw).onclick = () => (reps && n >= reps ? finish() : next());
          }
        };
        const finish = () => { pool.flush(); result(iw, { kicker: 'Index reps', big: Math.round((100 * ok) / n) + '%', sub: `${ok} of ${n} correct`, args, misses, good: ok === n, again: () => A.replace('index', Object.assign({}, args)) }); };
        next();
        return () => pool.flush();
      }
    };
  };

  // ---------- Index recall ----------
  SCREENS.recall = (args) => {
    const S = A.S, reps = args.reps || 0; let n = 0, ok = 0, streak = 0, cur; const pool = xpPool(), misses = [];
    return {
      title: 'Index Recall',
      html: `<div class="statrow"><div><b id="sk">0</b><span>streak</span></div><div><b id="ac">–</b><span>accuracy</span></div><div><b id="rp">${reps ? '0/' + reps : S.best.recall}</b><span>${reps ? 'reps' : 'best streak'}</span></div></div><div id="rw"></div>`,
      mount(root) {
        const rw = $('#rw', root);
        const upd = () => { $('#sk', root).textContent = streak; $('#ac', root).textContent = n ? Math.round((100 * ok) / n) + '%' : '–'; $('#rp', root).textContent = reps ? `${n}/${reps}` : S.best.recall; };
        const next = () => {
          const d = A.pickDev(); cur = d;
          const q = d.below ? `<b>${esc(d.name)}</b>: you <b>hit</b> below what true count?` : `<b>${esc(d.name)}</b>: <b>${esc(d.act.toLowerCase())}</b> at what true count or higher?`;
          const p = A.pad((g) => {
            n++; const want = B.devIdx(d), good = g === want; A.gradeDev(d.id, good); A.hist(1, good ? 1 : 0);
            if (good) { ok++; streak++; A.fx.ok(); pool.add(2); if (streak > S.best.recall) S.best.recall = streak; }
            else { streak = 0; A.fx.bad(); misses.push({ t: d.name, a: sgn(want), w: d.rule }); }
            A.save(); upd();
            $('#res', rw).innerHTML = `<div class="fb ${good ? 'ok' : 'bad'}">${good ? '✓' : '✗'} ${esc(d.rule)}</div>`;
            if (reps && n >= reps) return setTimeout(finish, 700);
            setTimeout(next, good ? 650 : 1800);
          }, { label: 'Answer', small: true });
          rw.innerHTML = `<div class="card qcard"><div class="kicker">${d.set === 'Fab4' ? 'Fab 4' : 'Illustrious 18'}</div><p class="q">${q}</p></div><div id="res"></div>${p.html}`; p.bind(rw);
        };
        const finish = () => { pool.flush(); result(rw, { kicker: 'Index recall', big: Math.round((100 * ok) / n) + '%', sub: `${ok} of ${n}`, args, misses, good: ok === n, again: () => A.replace('recall', Object.assign({}, args)) }); };
        next();
        return () => pool.flush();
      }
    };
  };

  // ---------- Strategy chart ----------
  SCREENS.chart = () => {
    const ups = B.UPS, r = B.rules();
    const head = `<tr><th></th>${ups.map((u) => `<th>${B.upName(u)}</th>`).join('')}</tr>`;
    const body = (rows) => rows.map((row) => `<tr><th>${B.rowLabel(row)}</th>${ups.map((u) => { const p = B.play(B.cellCards(row), u, null); const ds = row === 's18' && p === 'D' || row === 's19' && p === 'D'; return `<td class="k-${p}">${ds ? 'Ds' : p}</td>`; }).join('')}</tr>`).join('');
    return {
      title: 'Strategy Chart',
      html: `<div class="card tiny">${r.h17 ? 'Dealer hits soft 17' : 'Dealer stands on soft 17'} · 4–8 decks · double after split · ${r.ls ? 'late surrender' : 'no surrender'} <a class="linkbtn" id="chg">change</a></div>
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
