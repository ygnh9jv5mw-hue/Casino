/* Blackjack MasterClass app */
(function () {
  const CFG = window.APP_CONFIG, COURSE = window.COURSE, B = window.BJ;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rnd = (n) => (Math.random() * n) | 0;
  const pick = (a) => a[rnd(a.length)];
  const fmt$ = (n) => (n < 0 ? '−$' : '$') + Math.abs(Math.round(n)).toLocaleString();
  const sgn = (n) => (n > 0 ? '+' + n : n < 0 ? '−' + Math.abs(n) : '0');
  const today = () => new Date().toISOString().slice(0, 10);

  // ---------- storage ----------
  const KEY = 'bjmc.v1';
  const DEF = { age: false, done: {}, days: [], best: { strat: 0, deck: null, tc: null }, missed: {},
    shoe: { hands: 0, dec: 0, decOk: 0, checks: 0, checksOk: 0, bets: 0, betsOk: 0 }, log: [], drills: 0 };
  let S;
  try { S = Object.assign({}, DEF, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { S = Object.assign({}, DEF); }
  S.best = Object.assign({}, DEF.best, S.best); S.shoe = Object.assign({}, DEF.shoe, S.shoe);
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
  const practiced = () => { const t = today(); if (!S.days.includes(t)) S.days.push(t); S.drills++; save(); };
  function streak() {
    const set = new Set(S.days); let n = 0; const d = new Date();
    if (!set.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1);
    while (set.has(d.toISOString().slice(0, 10))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  // ---------- helpers ----------
  const RED = (s) => s === '♥' || s === '♦';
  const cardHTML = (c, cls = '') => c ? `<div class="pc ${RED(c.s) ? 'red' : ''} ${cls}"><span class="r">${c.r}</span><span class="s">${c.s}</span><span class="c">${c.s}</span></div>` : `<div class="pc back ${cls}"></div>`;
  const upName = (v) => (v === 11 ? 'A' : String(v));
  const upCard = (v) => B.card(v === 11 ? 'A' : v === 10 ? pick(['10', 'J', 'Q', 'K']) : String(v));
  const lessonCount = () => COURSE.reduce((n, m) => n + m.lessons.length, 0);
  const doneCount = () => COURSE.reduce((n, m) => n + m.lessons.filter((l) => S.done[l.id]).length, 0);
  function openUrl(u) { if (!u) return toast('Coming soon — link not set yet.'); window.open(u, '_blank'); }
  function toast(msg) {
    $('#modal').innerHTML = `<div class="scrim"><div class="sheet"><p>${esc(msg)}</p><button class="btn" id="mok">OK</button></div></div>`;
    $('#mok').onclick = () => ($('#modal').innerHTML = '');
  }
  function pad(onSubmit, opts = {}) {
    // numeric keypad with sign; returns html + binder
    let val = '', neg = false;
    const html = `<div class="display" id="pd">${opts.placeholder || '0'}</div>
      <div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => `<button data-k="${n}">${n}</button>`).join('')}
      <button data-k="±">±</button><button data-k="0">0</button><button data-k="⌫">⌫</button></div>
      <button class="btn" style="margin-top:10px" data-k="go">${opts.label || 'Submit'}</button>`;
    const bind = (root) => {
      const show = () => ($('#pd', root).textContent = (neg ? '−' : val ? '+' : '') + (val || '0'));
      $$('[data-k]', root).forEach((b) => (b.onclick = () => {
        const k = b.dataset.k;
        if (k === 'go') { const n = (neg ? -1 : 1) * (+val || 0); val = ''; neg = false; show(); return onSubmit(n); }
        if (k === '±') neg = !neg; else if (k === '⌫') val = val.slice(0, -1); else if (val.length < 3) val = (val === '0' ? '' : val) + k;
        show();
      }));
    };
    return { html, bind };
  }

  // ---------- router ----------
  let tab = 'home', stack = [], cleanup = null;
  const go = (screen, args) => { stack.push({ screen, args }); render(); };
  const back = () => { stack.pop(); render(); };
  function render() {
    if (cleanup) { cleanup(); cleanup = null; }
    const cur = stack.length ? stack[stack.length - 1] : { screen: tab };
    const scr = SCREENS[cur.screen](cur.args || {});
    $('#top').innerHTML = (stack.length ? '<button class="back" id="bk">‹ Back</button>' : '') + `<h1>${esc(scr.title)}</h1>`;
    if (stack.length) $('#bk').onclick = back;
    const v = $('#view'); v.innerHTML = scr.html; v.scrollTop = 0;
    $$('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    if (scr.mount) cleanup = scr.mount(v) || null;
  }
  $$('#tabs button').forEach((b) => (b.onclick = () => { tab = b.dataset.tab; stack = []; render(); }));

  // ---------- readiness ----------
  function readiness() {
    const sh = S.shoe;
    return [
      { t: 'Basic strategy: 100 correct in a row', ok: S.best.strat >= 100, v: `best streak ${S.best.strat}` },
      { t: 'Deck countdown: perfect in 25s or less', ok: S.best.deck !== null && S.best.deck <= 25, v: S.best.deck !== null ? `best ${S.best.deck.toFixed(1)}s` : 'not done yet' },
      { t: 'True count: 10/10, under 2s each', ok: S.best.tc !== null && S.best.tc <= 2, v: S.best.tc !== null ? `best avg ${S.best.tc.toFixed(2)}s` : 'not done yet' },
      { t: 'Shoe simulator: 20+ count checks at 95%+', ok: sh.checks >= 20 && sh.checksOk / sh.checks >= 0.95, v: sh.checks ? `${sh.checksOk}/${sh.checks} correct` : 'not done yet' },
      { t: 'Shoe simulator: 98%+ correct decisions (100+)', ok: sh.dec >= 100 && sh.decOk / sh.dec >= 0.98, v: sh.dec ? `${Math.round((100 * sh.decOk) / sh.dec)}% of ${sh.dec}` : 'not done yet' }
    ];
  }
  const checkHTML = (items) => items.map((i) => `<div class="check ${i.ok ? 'done' : ''}"><div class="dot">${i.ok ? '✓' : ''}</div><div><div>${esc(i.t)}</div><div class="muted small">${esc(i.v)}</div></div></div>`).join('');

  // ---------- screens ----------
  const SCREENS = {};

  SCREENS.home = () => {
    const done = doneCount(), total = lessonCount(), r = readiness(), ready = r.filter((x) => x.ok).length;
    let next = null;
    for (const m of COURSE) { for (const l of m.lessons) if (!S.done[l.id]) { next = { m, l }; break; } if (next) break; }
    return {
      title: CFG.brand,
      html: `
      <div class="box hero"><div class="kicker">The right way to beat the casino</div>
        <h2>${ready === r.length ? 'You are casino-ready.' : 'Build a real edge.'}</h2>
        <p class="muted">${ready}/${r.length} casino-ready benchmarks · ${done}/${total} lessons</p>
        <div class="bar"><i style="width:${Math.round((100 * done) / total)}%"></i></div>
        <div style="height:14px"></div>
        ${next ? `<button class="btn" data-go="lesson" data-id="${next.l.id}">Continue: ${esc(next.l.title)}</button>` : `<button class="btn" data-go="shoe">Play the shoe simulator</button>`}
      </div>
      <div class="grid2">
        <div class="stat"><b>🔥 ${streak()}</b><span>day practice streak</span></div>
        <div class="stat"><b>${S.best.strat}</b><span>best strategy streak</span></div>
      </div>
      <h3>Today's training</h3>
      ${item('◎', 'Basic strategy', 'Every hand, instant answers', 'strategy')}
      ${item('＋', 'Running count', 'Count down a deck against the clock', 'count')}
      ${item('÷', 'True count', 'Convert in under 2 seconds', 'truecount')}
      ${item('🂡', 'Shoe simulator', 'Real table, real distractions', 'shoe')}
      <h3>Casino-ready checklist</h3>
      <div class="box">${checkHTML(r)}</div>
      <div class="foot">21+ only. Practice is free; real play has real risk.<br>Problem gambling help: 1-800-GAMBLER</div>`,
      mount: bindGo
    };
  };
  const item = (ic, t, s, goTo, id) => `<button class="list-item" data-go="${goTo}" ${id ? `data-id="${id}"` : ''}><div class="ic">${ic}</div><div class="tx"><b>${esc(t)}</b><span>${esc(s)}</span></div><div class="chev">›</div></button>`;
  function bindGo(root) { $$('[data-go]', root).forEach((b) => (b.onclick = () => go(b.dataset.go, { id: b.dataset.id }))); }

  // ----- Learn -----
  SCREENS.learn = () => ({
    title: 'MasterClass',
    html: `<p class="muted">${doneCount()} of ${lessonCount()} lessons complete</p>` + COURSE.map((m, i) => {
      const d = m.lessons.filter((l) => S.done[l.id]).length;
      return `<button class="list-item" data-go="module" data-id="${m.id}"><div class="ic">${m.icon}</div><div class="tx">
        <b>${i + 1}. ${esc(m.title)}</b><span>${esc(m.blurb)}</span><div class="bar"><i style="width:${(100 * d) / m.lessons.length}%"></i></div></div><div class="chev">›</div></button>`;
    }).join(''),
    mount: bindGo
  });
  SCREENS.module = ({ id }) => {
    const m = COURSE.find((x) => x.id === id);
    return {
      title: m.title,
      html: `<p class="muted">${esc(m.blurb)}</p>` + m.lessons.map((l, i) => `<button class="list-item" data-go="lesson" data-id="${l.id}"><div class="ic">${S.done[l.id] ? '✓' : i + 1}</div><div class="tx"><b>${esc(l.title)}</b>${l.drill ? '<span>Includes a drill</span>' : ''}</div><div class="chev">›</div></button>`).join(''),
      mount: bindGo
    };
  };
  SCREENS.lesson = ({ id }) => {
    let m, l, idx;
    COURSE.forEach((mm) => mm.lessons.forEach((ll, i) => { if (ll.id === id) { m = mm; l = ll; idx = i; } }));
    const nextL = m.lessons[idx + 1];
    return {
      title: l.title,
      html: `<div class="pill gold">${esc(m.title)}</div><div class="lesson" style="margin-top:12px">${l.body}</div>
        ${l.drill ? `<button class="btn dark" data-drill="${l.drill}">Practice this now</button>` : ''}
        <button class="btn" id="done" style="margin-top:10px">${S.done[l.id] ? (nextL ? 'Next lesson ›' : 'Back to module') : 'Mark complete' + (nextL ? ' & continue' : '')}</button>`,
      mount(root) {
        const d = $('[data-drill]', root); if (d) d.onclick = () => go(d.dataset.drill);
        $('#done', root).onclick = () => {
          S.done[l.id] = true; save();
          if (nextL) { stack.pop(); go('lesson', { id: nextL.id }); } else back();
        };
      }
    };
  };

  // ----- Train hub -----
  SCREENS.train = () => {
    const weak = Object.entries(S.missed).sort((a, b) => b[1] - a[1]).slice(0, 3);
    return {
      title: 'Train',
      html: `
      ${item('◎', 'Basic strategy trainer', 'Hard, soft, pairs & surrender', 'strategy')}
      ${item('＋', 'Running count', 'Deck countdown & speed flashes', 'count')}
      ${item('÷', 'True count conversion', 'Read the tray, divide fast', 'truecount')}
      ${item('⚡', 'Index plays', 'Illustrious 18 + Fab 4', 'deviations')}
      ${item('🂡', 'Shoe simulator', 'Count, bet & play a full 6-deck shoe', 'shoe')}
      ${item('▦', 'Strategy charts', 'Reference for every hand', 'chart')}
      ${weak.length ? `<h3>Your weak spots</h3><div class="box">${weak.map(([k, n]) => `<div class="check"><div class="dot">!</div><div>${esc(k)}<div class="muted small">missed ${n}×</div></div></div>`).join('')}</div>` : ''}`,
      mount: bindGo
    };
  };

  // ----- Basic strategy drill -----
  SCREENS.strategy = () => {
    let streakN = 0, total = 0, ok = 0, cur;
    const vals = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    function deal() {
      const t = Math.random(); let cards;
      if (t < 0.5) { let a, b; do { a = pick(vals); b = pick(vals); } while (B.rv(a) === B.rv(b)); cards = [B.card(a), B.card(b)]; }
      else if (t < 0.75) cards = [B.card('A'), B.card(pick(['2', '3', '4', '5', '6', '7', '8', '9']))];
      else { const r = pick(['A', ...vals]); cards = [B.card(r), B.card(B.rv(r) === 10 ? pick(['10', 'J', 'Q', 'K']) : r)]; }
      const up = pick([2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10, 11]);
      cur = { cards, up, upc: upCard(up), ans: B.play(cards, up, null) };
    }
    const label = (c) => { const v = B.value(c.cards); const pair = B.rv(c.cards[0].r) === B.rv(c.cards[1].r);
      return (pair ? `Pair ${c.cards[0].r === 'A' ? 'A' : B.rv(c.cards[0].r)}s` : (v.soft ? 'Soft ' : 'Hard ') + v.total) + ' vs ' + upName(c.up); };
    return {
      title: 'Basic Strategy',
      html: `<div class="row small muted" style="margin-bottom:8px"><div>Streak <b id="sk" style="color:var(--gold)">0</b></div><div style="text-align:center">Best <b id="bs">${S.best.strat}</b></div><div style="text-align:right">Accuracy <b id="ac">–</b></div></div>
        <div class="felt"><div class="lbl">Dealer</div><div class="cards" id="dl"></div><div class="lbl" style="margin-top:14px">You</div><div class="cards" id="pl"></div><div class="tot" id="pt"></div></div>
        <div class="choices">${['H', 'S', 'D', 'P', 'R'].map((k) => `<button class="choice c-${k}" data-a="${k}">${B.NAMES[k]}</button>`).join('')}<button class="choice" style="background:#183424" data-a="chart">Chart</button></div>
        <div class="fb info" id="fb">6 decks · dealer stands soft 17 · DAS · late surrender</div>`,
      mount(root) {
        const show = () => { $('#dl', root).innerHTML = cardHTML(cur.upc) + cardHTML(null); $('#pl', root).innerHTML = cur.cards.map((c) => cardHTML(c)).join('');
          const v = B.value(cur.cards); $('#pt', root).textContent = (v.soft && v.total < 21 ? 'Soft ' : '') + v.total;
          $$('[data-a="P"]', root)[0].disabled = B.rv(cur.cards[0].r) !== B.rv(cur.cards[1].r); };
        deal(); show();
        $$('[data-a]', root).forEach((b) => (b.onclick = () => {
          const a = b.dataset.a; if (a === 'chart') return go('chart');
          total++; const fb = $('#fb', root);
          if (a === cur.ans) { ok++; streakN++; fb.className = 'fb ok'; fb.textContent = `✓ ${B.NAMES[a]} — ${label(cur)}`;
            if (streakN > S.best.strat) { S.best.strat = streakN; $('#bs', root).textContent = streakN; } }
          else { streakN = 0; fb.className = 'fb bad'; fb.textContent = `✗ ${label(cur)}: ${B.NAMES[cur.ans]}, not ${B.NAMES[a]}`; S.missed[label(cur)] = (S.missed[label(cur)] || 0) + 1; }
          if (total % 10 === 1) practiced(); else save();
          $('#sk', root).textContent = streakN; $('#ac', root).textContent = Math.round((100 * ok) / total) + '%';
          deal(); show();
        }));
      }
    };
  };

  // ----- Running count drill -----
  SCREENS.count = () => {
    const st = { mode: 'deck', speed: 0, per: 1 }; // speed 0 = tap to advance
    let timer = null;
    const setup = () => `
      <p class="muted">Cards are shown one at a time (or in pairs). Keep the Hi-Lo running count. A few cards are held back, so the answer isn't always 0.</p>
      <label>Cards</label><div class="seg" data-g="mode"><button data-v="deck">Full deck</button><button data-v="quick">20 cards</button></div>
      <label>Speed</label><div class="seg" data-g="speed"><button data-v="0">Tap (timed)</button><button data-v="1000">Slow</button><button data-v="600">Medium</button><button data-v="350">Fast</button><button data-v="220">Pro</button></div>
      <label>Cards per flash</label><div class="seg" data-g="per"><button data-v="1">1</button><button data-v="2">2 (pairs)</button></div>
      <div style="height:10px"></div><button class="btn" id="start">Start</button>
      <p class="muted small" style="margin-top:12px">Benchmark: a perfect full deck in 25 seconds or less. Best: ${S.best.deck !== null ? S.best.deck.toFixed(1) + 's' : '—'}</p>`;
    return {
      title: 'Running Count',
      html: `<div id="cw">${setup()}</div>`,
      mount(root) {
        const cw = $('#cw', root);
        function bindSetup() {
          $$('.seg', cw).forEach((g) => { const k = g.dataset.g; $$('button', g).forEach((b) => { b.classList.toggle('on', String(st[k]) === b.dataset.v);
            b.onclick = () => { st[k] = k === 'mode' ? b.dataset.v : +b.dataset.v; bindSetup(); }; }); });
          $('#start', cw).onclick = run;
        }
        function run() {
          const deck = B.shoe(1); const n = st.mode === 'deck' ? 52 - (1 + rnd(3)) : 20; const cards = deck.slice(0, n);
          const answer = cards.reduce((s, c) => s + B.hilo(c.r), 0); let i = 0; const t0 = performance.now();
          cw.innerHTML = `<div class="felt" style="min-height:240px;display:grid;place-items:center" id="fl"><div class="cards" id="cc"></div></div>
            <div class="muted small" style="text-align:center" id="pr">0 / ${n}</div>${st.speed ? '' : '<button class="btn" id="nx" style="margin-top:12px">Next ›</button>'}`;
          const step = () => {
            if (i >= n) return finish((performance.now() - t0) / 1000);
            const grp = cards.slice(i, i + st.per); i += grp.length;
            $('#cc', cw).innerHTML = grp.map((c) => cardHTML(c, 'big')).join(''); $('#pr', cw).textContent = `${i} / ${n}`;
            if (st.speed) timer = setTimeout(step, st.speed * grp.length);
          };
          if (st.speed) step(); else { step(); $('#nx', cw).onclick = step; $('#fl', cw).onclick = step; }
          function finish(secs) {
            const p = pad((g) => {
              const okk = g === answer; let msg;
              if (okk && st.mode === 'deck' && (S.best.deck === null || secs < S.best.deck)) { S.best.deck = secs; msg = 'New best time!'; }
              practiced();
              cw.innerHTML = `<div class="fb ${okk ? 'ok' : 'bad'}" style="font-size:18px">${okk ? '✓ Correct' : '✗ Not quite'} — the count was ${sgn(answer)}${okk ? '' : `, you said ${sgn(g)}`}</div>
                <div class="grid2"><div class="stat"><b>${secs.toFixed(1)}s</b><span>time</span></div><div class="stat"><b>${(secs / n).toFixed(2)}s</b><span>per card</span></div></div>
                ${msg ? `<p class="fb ok">${msg}</p>` : ''}<div style="height:12px"></div><button class="btn" id="again">Go again</button><button class="btn ghost" id="set">Change settings</button>`;
              $('#again', cw).onclick = run; $('#set', cw).onclick = () => { cw.innerHTML = setup(); bindSetup(); };
            }, { label: 'Check count' });
            cw.innerHTML = `<p style="text-align:center">What's the running count?</p>${p.html}`; p.bind(cw);
          }
        }
        bindSetup();
        return () => clearTimeout(timer);
      }
    };
  };

  // ----- True count drill -----
  SCREENS.truecount = () => {
    let q = 0, ok = 0, times = [], cur, t0, hard = false;
    const N = 10;
    function make() {
      const left = (1 + rnd(11)) / 2; // 0.5 .. 6? cap at 5.5
      const decks = Math.min(left, 5.5);
      const rc = Math.round((Math.random() * 2 - 1) * 4 * decks + (Math.random() < 0.5 ? rnd(6) : 0));
      cur = { decks, rc, ans: Math.floor(rc / decks) };
    }
    const tray = (left) => { const played = 6 - left; let h = ''; for (let i = 0; i < 12; i++) h += `<i class="${i < played * 2 ? '' : 'left'}" style="height:${i < played * 2 ? 70 : 10}px"></i>`; return h; };
    return {
      title: 'True Count',
      html: `<div class="seg" id="md"><button class="on" data-v="0">Show decks left</button><button data-v="1">Read the tray</button></div><div id="tw"></div>`,
      mount(root) {
        const tw = $('#tw', root);
        $$('#md button', root).forEach((b) => (b.onclick = () => { hard = b.dataset.v === '1'; $$('#md button', root).forEach((x) => x.classList.toggle('on', x === b)); q = 0; ok = 0; times = []; ask(); }));
        function ask() {
          if (q >= N) return done();
          make(); t0 = performance.now();
          const p = pad((g) => {
            const dt = (performance.now() - t0) / 1000; times.push(dt); q++;
            const good = g === cur.ans; if (good) ok++;
            tw.querySelector('#res').innerHTML = `<div class="fb ${good ? 'ok' : 'bad'}">${good ? '✓' : '✗'} ${sgn(cur.rc)} ÷ ${cur.decks} = ${(cur.rc / cur.decks).toFixed(2)} → TC ${sgn(cur.ans)} (${dt.toFixed(1)}s)</div>`;
            setTimeout(ask, good ? 650 : 1600);
          }, { label: 'Enter true count' });
          tw.innerHTML = `<div class="muted small" style="text-align:center">Question ${q + 1} of ${N} · round down</div>
            <div class="felt"><div class="lbl">Running count</div><div class="big-num" style="color:#fff">${sgn(cur.rc)}</div>
            <div class="lbl" style="margin-top:8px">6-deck discard tray</div><div class="tray">${tray(cur.decks)}</div>
            <div class="lbl">${hard ? 'Decks left: ?' : `Decks left: ${cur.decks}`}</div></div><div id="res"></div>${p.html}`;
          p.bind(tw);
        }
        function done() {
          const avg = times.reduce((a, b) => a + b, 0) / times.length; practiced();
          if (ok === N && (S.best.tc === null || avg < S.best.tc)) { S.best.tc = avg; save(); }
          tw.innerHTML = `<div class="big-num">${ok}/${N}</div><p style="text-align:center" class="muted">average ${avg.toFixed(2)}s per conversion</p>
            <div class="fb ${ok === N && avg <= 2 ? 'ok' : 'info'}">${ok === N && avg <= 2 ? 'Casino-ready speed!' : 'Goal: 10/10 with under 2s average.'}</div><button class="btn" id="ag">Go again</button>`;
          $('#ag', tw).onclick = () => { q = 0; ok = 0; times = []; ask(); };
        }
        ask();
      }
    };
  };

  // ----- Deviations drill -----
  SCREENS.deviations = () => {
    let set = 'all', cur, n = 0, ok = 0;
    function make() {
      const list = B.DEVIATIONS.filter((d) => set === 'all' || d.set === set);
      const d = pick(list); const tc = d.idx + pick([-2, -1, -1, 0, 0, 1, 1, 2]);
      const hand = d.hand(); const upc = upCard(d.up);
      const o = Object.assign({ canSurrender: d.set === 'Fab4' }, d.o || {});
      const ans = d.insurance ? (tc >= 3 ? 'Y' : 'N') : B.play(hand, d.up, tc, o);
      cur = { d, tc, hand, upc, o, ans };
    }
    return {
      title: 'Index Plays',
      html: `<div class="seg" id="ds"><button class="on" data-v="all">All</button><button data-v="I18">Illustrious 18</button><button data-v="Fab4">Fab 4</button></div><div id="dw"></div>`,
      mount(root) {
        const dw = $('#dw', root);
        $$('#ds button', root).forEach((b) => (b.onclick = () => { set = b.dataset.v; $$('#ds button', root).forEach((x) => x.classList.toggle('on', x === b)); next(); }));
        function next() {
          make(); const c = cur; const pair = B.rv(c.hand[0].r) === B.rv(c.hand[1].r);
          const btns = c.d.insurance ? ['Y', 'N'] : ['H', 'S', 'D', 'P', 'R'];
          dw.innerHTML = `<div class="row small muted" style="margin-bottom:8px"><div>${ok}/${n} correct</div><div style="text-align:right">${c.o.canSurrender ? 'Surrender allowed' : 'No surrender'}</div></div>
            <div class="felt"><div class="lbl">True count</div><div class="big-num" style="color:#fff">${sgn(c.tc)}</div>
            <div class="lbl">Dealer</div><div class="cards">${cardHTML(c.upc)}${cardHTML(null)}</div>
            <div class="lbl" style="margin-top:10px">You</div><div class="cards">${c.hand.map((x) => cardHTML(x)).join('')}</div></div>
            ${c.d.insurance ? '<p style="text-align:center"><b>Dealer shows an Ace. Insurance?</b></p>' : ''}
            <div class="choices" style="${btns.length === 2 ? 'grid-template-columns:1fr 1fr' : ''}">${btns.map((k) => `<button class="choice c-${k}" data-a="${k}" ${(k === 'P' && !pair) || (k === 'R' && !c.o.canSurrender) ? 'disabled' : ''}>${k === 'Y' ? 'Take insurance' : k === 'N' ? 'No insurance' : B.NAMES[k]}</button>`).join('')}</div>
            <div id="df"></div>`;
          $$('[data-a]', dw).forEach((b) => (b.onclick = () => {
            n++; const good = b.dataset.a === c.ans; if (good) ok++; if (n % 10 === 1) practiced();
            if (!good) { S.missed['Index: ' + c.d.name] = (S.missed['Index: ' + c.d.name] || 0) + 1; save(); }
            const nm = (k) => (k === 'Y' ? 'Insure' : k === 'N' ? 'No insurance' : B.NAMES[k]);
            $('#df', dw).innerHTML = `<div class="fb ${good ? 'ok' : 'bad'}">${good ? '✓' : '✗'} ${esc(c.d.name)} at ${sgn(c.tc)}: <b>${nm(c.ans)}</b><br><span class="small">${esc(c.d.rule)}</span></div><button class="btn" id="nx">Next ›</button>`;
            $$('[data-a]', dw).forEach((x) => (x.disabled = true)); $('#nx', dw).onclick = next;
          }));
        }
        next();
      }
    };
  };

  // ----- Shoe simulator -----
  SCREENS.shoe = () => {
    const DECKS = 6, CUT = Math.round(DECKS * 52 * 0.25);
    const G = { shoe: B.shoe(DECKS), rc: 0, bots: true, dev: true, units: 0, bet: 1, untilCheck: 3 + rnd(3), phase: 'bet', msg: '', showRC: false };
    const sh = S.shoe;
    const draw = (count = true) => { const c = G.shoe.pop(); if (count) G.rc += B.hilo(c.r); return c; };
    const decksLeft = () => Math.max(0.5, Math.round(G.shoe.length / 26) / 2);
    const tc = () => Math.floor(G.rc / decksLeft());
    let R = null; // round state
    function newRound() {
      R = { dealer: [], hole: null, holeShown: false, bots: [[], []], hands: [], act: 0 };
      if (G.bots) R.bots[0].push(draw()); R.hands.push({ cards: [draw()], bet: G.bet }); if (G.bots) R.bots[1].push(draw());
      R.dealer.push(draw());
      if (G.bots) R.bots[0].push(draw()); R.hands[0].cards.push(draw()); if (G.bots) R.bots[1].push(draw());
      R.hole = draw(false);
      R.up = B.rv(R.dealer[0].r);
      if (G.bots) botPlay(R.bots[0]);
      if (R.up === 11) G.phase = 'ins'; else peek();
    }
    const revealHole = () => { if (!R.holeShown) { R.holeShown = true; G.rc += B.hilo(R.hole.r); R.dealer.push(R.hole); } };
    function peek() {
      const dBJ = B.isBJ([R.dealer[0], R.hole]);
      if (dBJ) { revealHole(); if (G.bots) botPlay(R.bots[1]); G.msg = 'Dealer has blackjack.'; return settle(); }
      if (B.isBJ(R.hands[0].cards)) { R.hands[0].done = true; R.hands[0].bj = true; if (G.bots) botPlay(R.bots[1]); return dealerPlay(); }
      G.phase = 'play';
    }
    function botPlay(cards) {
      while (true) { const v = B.value(cards); if (v.total >= 21) return;
        let p = B.play(cards, R.up, null, { canSplit: false, canSurrender: false });
        if (p === 'R') p = 'H'; if (p === 'S') return; cards.push(draw()); if (p === 'D') return; }
    }
    function act(a) {
      const h = R.hands[R.act]; const opts = options(h);
      const book = B.play(h.cards, R.up, G.dev ? tc() : null, opts);
      sh.dec++; if (a === book) sh.decOk++; else S.missed[`${handLbl(h.cards)} vs ${upName(R.up)}${G.dev ? ` (TC ${sgn(tc())})` : ''}`] = (S.missed[`${handLbl(h.cards)} vs ${upName(R.up)}${G.dev ? ` (TC ${sgn(tc())})` : ''}`] || 0) + 1;
      G.msg = a === book ? `✓ ${B.NAMES[a]}` : `✗ Book play was ${B.NAMES[book]} (${handLbl(h.cards)} vs ${upName(R.up)}${G.dev ? `, TC ${sgn(tc())}` : ''})`;
      G.msgOk = a === book;
      if (a === 'H') { h.cards.push(draw()); if (B.value(h.cards).total >= 21) h.done = true; }
      else if (a === 'S') h.done = true;
      else if (a === 'D') { h.bet *= 2; h.cards.push(draw()); h.done = true; }
      else if (a === 'R') { h.surr = true; h.done = true; }
      else if (a === 'P') {
        const c2 = h.cards.pop(); const aces = h.cards[0].r === 'A';
        const nh = { cards: [c2], bet: h.bet, fromSplit: true }; h.fromSplit = true;
        h.cards.push(draw()); nh.cards.push(draw()); R.hands.splice(R.act + 1, 0, nh);
        if (aces) { h.done = true; nh.done = true; h.splitAces = nh.splitAces = true; }
        else if (B.value(h.cards).total === 21) h.done = true;
      }
      while (R.act < R.hands.length && R.hands[R.act].done) R.act++;
      if (R.act >= R.hands.length) { if (G.bots) botPlay(R.bots[1]); dealerPlay(); }
      save();
    }
    function options(h) {
      const two = h.cards.length === 2;
      return { canDouble: two && !h.splitAces, canSplit: two && B.rv(h.cards[0].r) === B.rv(h.cards[1].r) && R.hands.length < 4 && !h.splitAces,
        canSurrender: two && R.hands.length === 1 && !h.fromSplit };
    }
    const handLbl = (c) => { const v = B.value(c); return c.length === 2 && B.rv(c[0].r) === B.rv(c[1].r) ? `Pair ${c[0].r === 'A' ? 'A' : B.rv(c[0].r)}s` : (v.soft ? 'Soft ' : 'Hard ') + v.total; };
    function dealerPlay() {
      revealHole();
      const live = R.hands.some((h) => !h.surr && B.value(h.cards).total <= 21 && !h.bj);
      if (live) while (B.value(R.dealer).total < 17) R.dealer.push(draw());
      settle();
    }
    function settle() {
      const d = B.value(R.dealer).total, dBJ = B.isBJ([R.dealer[0], R.hole]); let net = 0;
      for (const h of R.hands) {
        const p = B.value(h.cards).total;
        if (h.surr) h.res = -0.5;
        else if (dBJ) h.res = h.bj ? 0 : -1;
        else if (h.bj) h.res = 1.5;
        else if (p > 21) h.res = -1;
        else if (d > 21 || p > d) h.res = 1;
        else if (p === d) h.res = 0; else h.res = -1;
        net += h.res * h.bet;
      }
      if (R.ins) net += dBJ ? R.ins * 2 : -R.ins;
      G.units += net; sh.hands++; G.net = net; G.phase = 'over'; save();
    }
    return {
      title: 'Shoe Simulator',
      html: `<div id="sw"></div>`,
      mount(root) {
        const sw = $('#sw', root);
        function draw_() {
          const decAcc = sh.dec ? Math.round((100 * sh.decOk) / sh.dec) + '%' : '–';
          const head = `<div class="row small muted"><div>Shoe ${Math.round((100 * (DECKS * 52 - G.shoe.length)) / (DECKS * 52))}% dealt</div><div style="text-align:center">Result <b style="color:${G.units >= 0 ? 'var(--green)' : 'var(--red)'}">${G.units >= 0 ? '+' : ''}${G.units} u</b></div><div style="text-align:right">Plays ${decAcc}</div></div>
            <div class="row small muted" style="margin:4px 0 8px"><div>Count checks ${sh.checksOk}/${sh.checks}</div><div style="text-align:right">${G.showRC ? `RC ${sgn(G.rc)} · TC ${sgn(tc())}` : '<span id="peek" style="color:var(--gold)">Peek count</span>'}</div></div>`;
          if (G.phase === 'check') {
            const p = pad((g) => {
              sh.checks++; const good = g === G.rc; if (good) sh.checksOk++; save(); practiced();
              G.msg = good ? `✓ Count check: ${sgn(G.rc)}` : `✗ Count was ${sgn(G.rc)}, you said ${sgn(g)}`; G.msgOk = good;
              G.untilCheck = 3 + rnd(4); G.phase = 'bet'; draw_();
            }, { label: 'Check' });
            sw.innerHTML = head + `<div class="felt"><div class="lbl">Count check</div><p>What is the running count right now?</p></div>${p.html}`; p.bind(sw); return bindPeek();
          }
          if (G.phase === 'bet') {
            sw.innerHTML = head + (G.msg ? `<div class="fb ${G.msgOk ? 'ok' : 'bad'}">${esc(G.msg)}</div>` : '') +
              `<div class="felt"><div class="lbl">Place your bet</div><p class="small">Bet by the true count. Ramp: TC ≤+1 → 1u, +2 → 2u, +3 → 4u, +4 → 8u, +5+ → 12u</p>
              <div class="choices">${[1, 2, 4, 8, 12].map((u) => `<button class="choice c-H" data-bet="${u}">${u} unit${u > 1 ? 's' : ''}</button>`).join('')}<button class="choice c-R" id="opts">Options</button></div></div>`;
            $$('[data-bet]', sw).forEach((b) => (b.onclick = () => {
              const u = +b.dataset.bet, want = B.ramp(tc()); sh.bets++; if (u === want) sh.betsOk++;
              G.bet = u; G.msg = u === want ? '' : `Bet note: at TC ${sgn(tc())} the ramp says ${want}u (you bet ${u}u).`; G.msgOk = false;
              newRound(); draw_();
            }));
            $('#opts', sw).onclick = () => {
              $('#modal').innerHTML = `<div class="scrim"><div class="sheet"><h3 style="margin-top:0">Simulator options</h3>
                <label><input type="checkbox" id="o1" ${G.bots ? 'checked' : ''} style="width:auto"> Other players at the table (distraction)</label>
                <label><input type="checkbox" id="o2" ${G.dev ? 'checked' : ''} style="width:auto"> Grade with index plays (I18 + Fab 4)</label>
                <label><input type="checkbox" id="o3" ${G.showRC ? 'checked' : ''} style="width:auto"> Always show the count (practice mode)</label>
                <div style="height:10px"></div><button class="btn" id="oc">Done</button><button class="btn ghost" id="os">Shuffle new shoe</button></div></div>`;
              $('#oc').onclick = () => { G.bots = $('#o1').checked; G.dev = $('#o2').checked; G.showRC = $('#o3').checked; $('#modal').innerHTML = ''; draw_(); };
              $('#os').onclick = () => { G.shoe = B.shoe(DECKS); G.rc = 0; G.msg = 'New shoe — count starts at 0.'; G.msgOk = true; $('#modal').innerHTML = ''; draw_(); };
            };
            return bindPeek();
          }
          // table
          const dealerCards = R.holeShown ? R.dealer.map((c) => cardHTML(c)).join('') : cardHTML(R.dealer[0]) + cardHTML(null);
          const dTot = R.holeShown ? `<div class="tot">${B.value(R.dealer).total}</div>` : '';
          const bots = G.bots ? `<div class="bots">${R.bots.map((b, i) => `<div><div class="cards">${b.map((c) => cardHTML(c)).join('')}</div><div class="tot">Seat ${i === 0 ? 1 : 3} · ${B.value(b).total}</div></div>`).join('')}</div>` : '';
          const hands = R.hands.map((h, i) => {
            const v = B.value(h.cards); const res = G.phase === 'over' ? (h.res > 0 ? ` · +${h.res * h.bet}u` : h.res < 0 ? ` · ${h.res * h.bet}u` : ' · push') : '';
            return `<div class="hand ${G.phase === 'play' && i === R.act && R.hands.length > 1 ? 'act' : ''}"><div class="cards">${h.cards.map((c) => cardHTML(c)).join('')}</div>
              <div class="tot">${h.bj ? 'Blackjack' : (v.soft && v.total < 21 ? 'Soft ' : '') + v.total}${h.surr ? ' · surrendered' : ''} · ${h.bet}u${res}</div></div>`;
          }).join('');
          let controls = '';
          if (G.phase === 'ins') controls = `<p style="text-align:center"><b>Insurance?</b></p><div class="choices" style="grid-template-columns:1fr 1fr"><button class="choice c-Y" data-ins="1">Take insurance</button><button class="choice c-N" data-ins="0">No insurance</button></div>`;
          else if (G.phase === 'play') { const o = options(R.hands[R.act]);
            controls = `<div class="choices">${['H', 'S', 'D', 'P', 'R'].map((k) => `<button class="choice c-${k}" data-a="${k}" ${(k === 'D' && !o.canDouble) || (k === 'P' && !o.canSplit) || (k === 'R' && !o.canSurrender) ? 'disabled' : ''}>${B.NAMES[k]}</button>`).join('')}</div>`; }
          else controls = `<div class="fb ${G.net > 0 ? 'ok' : G.net < 0 ? 'bad' : 'info'}">${G.net > 0 ? 'You won' : G.net < 0 ? 'You lost' : 'Push'} ${G.net ? Math.abs(G.net) + 'u' : ''}</div><button class="btn" id="nr">Next hand ›</button>`;
          sw.innerHTML = head + `<div class="felt"><div class="lbl">Dealer</div><div class="cards">${dealerCards}</div>${dTot}${bots}
            <div class="seat"><div class="lbl">You</div><div class="hands">${hands}</div></div></div>
            ${G.msg ? `<div class="fb ${G.msgOk ? 'ok' : 'bad'}">${esc(G.msg)}</div>` : ''}${controls}`;
          $$('[data-a]', sw).forEach((b) => (b.onclick = () => { act(b.dataset.a); draw_(); }));
          $$('[data-ins]', sw).forEach((b) => (b.onclick = () => {
            const take = b.dataset.ins === '1', want = tc() >= 3; sh.dec++; if (take === want) sh.decOk++;
            G.msg = take === want ? `✓ ${take ? 'Insured' : 'No insurance'} at TC ${sgn(tc())}` : `✗ Insurance rule: take it only at TC +3 or higher (TC is ${sgn(tc())})`; G.msgOk = take === want;
            if (take) R.ins = R.hands[0].bet / 2; peek(); draw_();
          }));
          const nr = $('#nr', sw); if (nr) nr.onclick = () => {
            G.msg = ''; if (G.shoe.length < CUT) { G.shoe = B.shoe(DECKS); G.rc = 0; G.msg = 'Cut card reached — new shoe, count resets to 0.'; G.msgOk = true; G.untilCheck = 3 + rnd(3); }
            G.untilCheck--; G.phase = G.untilCheck <= 0 ? 'check' : 'bet'; draw_();
          };
          bindPeek();
        }
        function bindPeek() { const p = $('#peek', sw); if (p) p.onclick = () => { p.textContent = `RC ${sgn(G.rc)} · TC ${sgn(tc())}`; }; }
        draw_();
      }
    };
  };

  // ----- Charts -----
  SCREENS.chart = () => {
    const ups = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    const head = `<tr><th></th>${ups.map((u) => `<th>${upName(u)}</th>`).join('')}</tr>`;
    const row = (lbl, cards) => `<tr><th>${lbl}</th>${ups.map((u) => { const p = B.play(cards, u, null); return `<td class="k-${p}">${p}</td>`; }).join('')}</tr>`;
    const C = (...r) => r.map((x) => B.card(x));
    const hardCards = (t) => { let a = Math.min(10, t - 2), b = t - a; if (a === b) { a--; b++; } return C(String(a), String(b)); };
    let hard = ''; for (let t = 17; t >= 8; t--) hard += row(t === 17 ? '17+' : t === 8 ? '≤8' : t, hardCards(t));
    let soft = ''; for (let k = 9; k >= 2; k--) soft += row('A,' + k, C('A', String(k)));
    let pairs = ''; for (const r of ['A', '10', '9', '8', '7', '6', '5', '4', '3', '2']) pairs += row(r === '10' ? 'T,T' : r + ',' + r, C(r, r));
    return {
      title: 'Strategy Charts',
      html: `<p class="small muted">6 decks · S17 · DAS · late surrender. <span class="pill" style="background:#2c6be0;color:#fff">H</span> hit <span class="pill" style="background:#d23b3b;color:#fff">S</span> stand <span class="pill" style="background:#e3a21a;color:#241800">D</span> double <span class="pill" style="background:#8a4bd6;color:#fff">P</span> split <span class="pill" style="background:#5d6b63;color:#fff">R</span> surrender</p>
        <h3>Hard totals</h3><table class="chart">${head}${hard}</table><h3>Soft totals</h3><table class="chart">${head}${soft}</table><h3>Pairs</h3><table class="chart">${head}${pairs}</table>
        <p class="small muted">Soft 18 vs 3–6: double if allowed, otherwise stand. Other doubles: hit if doubling isn't allowed.</p>`
    };
  };

  // ----- Tools -----
  SCREENS.tools = () => ({
    title: 'Tools',
    html: `${item('$', 'Bankroll & risk of ruin', 'Hourly win, swings, survival odds', 'bankroll')}
      ${item('✎', 'Session log', 'Track hours, results and notes', 'log')}
      ${item('▦', 'Strategy charts', 'Hard, soft and pairs', 'chart')}
      ${item('⚡', 'Index play reference', 'Illustrious 18 and Fab 4', 'lesson', 'm3l3')}
      ${item('♡', 'Responsible play', 'Limits, rules, and getting help', 'about')}`,
    mount: bindGo
  });

  SCREENS.bankroll = () => ({
    title: 'Bankroll & Risk',
    html: `<div class="box"><div class="grid2">
      <div><label>Bankroll ($)</label><input id="b1" inputmode="decimal" value="10000"></div>
      <div><label>Average bet ($)</label><input id="b2" inputmode="decimal" value="50"></div>
      <div><label>Your edge (%)</label><input id="b3" inputmode="decimal" value="1.0"></div>
      <div><label>Std. dev. per hand ($)</label><input id="b4" inputmode="decimal" value="140"></div>
      <div><label>Hands per hour</label><input id="b5" inputmode="numeric" value="80"></div>
      <div><label>Hours planned</label><input id="b6" inputmode="numeric" value="100"></div></div>
      <p class="small muted" style="margin-top:10px">Tip: with a 1–12 spread, standard deviation per hand is roughly 2.5–3× your average bet.</p></div>
      <div id="bo"></div>`,
    mount(root) {
      const calc = () => {
        const v = (id) => parseFloat($(id, root).value) || 0;
        const B0 = v('#b1'), avg = v('#b2'), edge = v('#b3') / 100, sd = v('#b4'), hph = v('#b5'), hrs = v('#b6');
        const ev = avg * edge, evh = ev * hph, sdh = sd * Math.sqrt(hph), N = hph * hrs;
        const evT = ev * N, sdT = sd * Math.sqrt(N);
        const ror = ev > 0 && sd > 0 ? Math.exp((-2 * ev * B0) / (sd * sd)) : 1;
        const n0 = ev > 0 ? (sd / ev) ** 2 : Infinity;
        const behind = sdT > 0 ? 0.5 * erfc(evT / sdT / Math.SQRT2) : 0;
        $('#bo', root).innerHTML = `<div class="grid2">
          <div class="stat"><b>${fmt$(evh)}</b><span>expected per hour</span></div><div class="stat"><b>±${fmt$(sdh).replace('$', '$')}</b><span>1 SD per hour</span></div>
          <div class="stat"><b>${fmt$(evT)}</b><span>expected over ${hrs}h</span></div><div class="stat"><b>${fmt$(evT - sdT)} to ${fmt$(evT + sdT)}</b><span>68% range over ${hrs}h</span></div>
          <div class="stat"><b style="color:${ror <= 0.05 ? 'var(--green)' : ror <= 0.15 ? 'var(--gold)' : 'var(--red)'}">${(ror * 100).toFixed(1)}%</b><span>risk of ruin</span></div>
          <div class="stat"><b>${(behind * 100).toFixed(0)}%</b><span>chance of being behind after ${hrs}h</span></div></div>
          <div class="box" style="margin-top:10px"><p class="small" style="margin:0">N0 = ${isFinite(n0) ? Math.round(n0).toLocaleString() + ' hands (' + Math.round(n0 / (hph || 1)) + ' hours)' : '∞'} — the hands it takes for your edge to outweigh one standard deviation. ${ror > 0.05 ? '<b>Pros keep risk of ruin at 5% or lower: lower your bets or grow the bankroll.</b>' : 'Your risk of ruin is within the professional range.'}</p></div>`;
      };
      $$('input', root).forEach((i) => (i.oninput = calc)); calc();
    }
  });
  function erfc(x) { const z = Math.abs(x), t = 1 / (1 + 0.5 * z);
    const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
    return x >= 0 ? r : 2 - r; }

  SCREENS.log = () => {
    const tot = S.log.reduce((a, s) => ({ h: a.h + s.hours, r: a.r + s.result }), { h: 0, r: 0 });
    return {
      title: 'Session Log',
      html: `<div class="grid2"><div class="stat"><b>${tot.h.toFixed(1)}h</b><span>${S.log.length} sessions</span></div>
        <div class="stat"><b style="color:${tot.r >= 0 ? 'var(--green)' : 'var(--red)'}">${fmt$(tot.r)}</b><span>${tot.h ? fmt$(tot.r / tot.h) + ' per hour' : 'total result'}</span></div></div>
        <div class="box" style="margin-top:12px"><b>Add session</b>
          <div class="grid2"><div><label>Date</label><input id="l1" type="date" value="${today()}"></div><div><label>Casino</label><input id="l2" placeholder="Where"></div>
          <div><label>Hours</label><input id="l3" inputmode="decimal" placeholder="1.5"></div><div><label>Result ($)</label><input id="l4" inputmode="decimal" placeholder="-200 or 450"></div></div>
          <label>Notes (game, pen, heat…)</label><textarea id="l5" rows="2"></textarea><div style="height:10px"></div><button class="btn" id="ladd">Save session</button></div>
        ${S.log.slice().reverse().map((s) => `<div class="list-item"><div class="tx"><b>${esc(s.date)} · ${esc(s.where || 'Session')}</b><span>${s.hours}h · <span style="color:${s.result >= 0 ? 'var(--green)' : 'var(--red)'}">${fmt$(s.result)}</span>${s.notes ? ' · ' + esc(s.notes) : ''}</span></div><button class="back" data-del="${s.id}">✕</button></div>`).join('')}
        <p class="small muted">Judge yourself on hours played and accuracy. Short-term results are mostly variance.</p>`,
      mount(root) {
        $('#ladd', root).onclick = () => {
          const hours = parseFloat($('#l3', root).value), result = parseFloat($('#l4', root).value);
          if (!(hours > 0) || isNaN(result)) return toast('Enter hours and a result (use a minus sign for a loss).');
          S.log.push({ id: Date.now(), date: $('#l1', root).value, where: $('#l2', root).value.trim(), hours, result, notes: $('#l5', root).value.trim() }); save(); render();
        };
        $$('[data-del]', root).forEach((b) => (b.onclick = () => { S.log = S.log.filter((s) => String(s.id) !== b.dataset.del); save(); render(); }));
      }
    };
  };

  SCREENS.about = () => ({
    title: 'Responsible Play',
    html: `<div class="box lesson"><p><b>Advantage play is a skill, not a guarantee.</b> A counter's edge is small — about 0.5–1.5% — and shows up only over thousands of hands. Losing sessions, weeks and months happen to every professional.</p>
      <ul><li>Only play with money you can afford to lose.</li><li>Set a session loss limit and a time limit before you sit down.</li><li>Never chase losses, and never play impaired.</li><li>If you can't play perfectly, don't play for money — practice here instead.</li><li>You must be 21+ (or the legal age where you live).</li></ul>
      <p>If gambling stops being fun, help is free and confidential: call or text <b>1-800-GAMBLER</b> (US) or visit ncpgambling.org.</p></div>
      <p class="small muted">This app is for education and practice. It doesn't take bets, hold money or connect to any casino.</p>`
  });

  // ----- Coach -----
  SCREENS.coach = () => ({
    title: 'Coaching & Community',
    html: `<div class="box hero"><div class="kicker">Live every week</div><h2>Train with ${esc(CFG.coachName)}</h2>
        <p class="muted">Live sessions, 1-on-1 coaching and a private community of serious advantage players.</p></div>
      <h3>Weekly live trainings</h3><div class="box">${CFG.liveSchedule.map((s) => `<div class="check"><div class="dot">●</div><div><b>${esc(s.title)}</b><div class="muted small">${esc(s.day)} · ${esc(s.time)}</div></div></div>`).join('')}
        <div style="height:10px"></div><button class="btn" data-url="liveTrainingUrl">Join the live training</button></div>
      ${item('📅', `Book a 1-on-1 with ${CFG.coachName}`, 'Fix your weak spots fast', 'x', 'bookingUrl')}
      ${item('💬', 'Private community', 'Game reports, trip plans, accountability', 'x', 'communityUrl')}
      ${item('🔒', 'OSN access', 'Members-only resources', 'x', 'osnUrl')}
      ${item('🤝', 'Apply to join a team', 'Show your stats, get evaluated', 'team')}
      ${CFG.joinUrl ? '<button class="btn" data-url="joinUrl" style="margin-top:6px">Get the full MasterClass</button>' : ''}`,
    mount(root) {
      $$('[data-go="x"]', root).forEach((b) => (b.onclick = () => openUrl(CFG[b.dataset.id])));
      $$('[data-url]', root).forEach((b) => (b.onclick = () => openUrl(CFG[b.dataset.url])));
      $$('[data-go]:not([data-go="x"])', root).forEach((b) => (b.onclick = () => go(b.dataset.go, { id: b.dataset.id })));
    }
  });

  SCREENS.team = () => {
    const r = readiness(), ready = r.filter((x) => x.ok).length;
    return {
      title: 'Team Application',
      html: `<div class="box"><b>Your verified training stats</b><div style="height:6px"></div>${checkHTML(r)}</div>
        ${ready < r.length ? '<div class="fb info">Teams look for players who hit every benchmark. You can apply now, but finishing the checklist makes your case.</div>' : '<div class="fb ok">You hit every benchmark. Strong application!</div>'}
        <div class="box"><label>Name</label><input id="t1"><label>City / region</label><input id="t2"><label>Playing experience</label>
        <select id="t3"><option>New — still training</option><option>Under 100 hours</option><option>100–500 hours</option><option>500+ hours</option></select>
        <label>Why you, in a sentence or two</label><textarea id="t4" rows="3"></textarea><div style="height:10px"></div><button class="btn" id="ts">Send application</button></div>`,
      mount(root) {
        $('#ts', root).onclick = async () => {
          const name = $('#t1', root).value.trim(); if (!name) return toast('Add your name first.');
          const body = `Team application\n\nName: ${name}\nRegion: ${$('#t2', root).value}\nExperience: ${$('#t3', root).value}\n\n${$('#t4', root).value}\n\nTraining stats:\n` + r.map((x) => `${x.ok ? '✓' : '○'} ${x.t} (${x.v})`).join('\n');
          if (CFG.supportEmail) location.href = `mailto:${CFG.supportEmail}?subject=${encodeURIComponent('Team application: ' + name)}&body=${encodeURIComponent(body)}`;
          else if (navigator.share) { try { await navigator.share({ title: 'Team application', text: body }); } catch (e) {} }
          else { try { await navigator.clipboard.writeText(body); toast('Application copied — paste it into a message to your coach.'); } catch (e) { toast(body); } }
        };
      }
    };
  };

  // ---------- age gate ----------
  function gate() {
    if (S.age) return;
    $('#modal').innerHTML = `<div class="scrim"><div class="sheet"><h2 style="margin-top:0">Welcome to ${esc(CFG.brand)}</h2>
      <p class="muted">This app teaches card counting and advantage play for educational purposes. Real gambling carries real risk.</p>
      <p>Please confirm you are <b>21 or older</b> (or the legal gambling age where you live).</p>
      <button class="btn" id="ag1">I'm 21+ — let's train</button></div></div>`;
    $('#ag1').onclick = () => { S.age = true; save(); $('#modal').innerHTML = ''; };
  }

  render(); gate();
})();
