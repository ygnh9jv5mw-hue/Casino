/* Today tab, daily workout, bootcamp, onboarding, settings. */
(function () {
  const A = window.APP, { $, $$, esc, SCREENS, go, CAMP } = A;

  function readiness() {
    const S = A.S, b = S.best, sh = S.shoe;
    return [
      { t: 'Basic strategy: 95% of the chart mastered', ok: A.masteryPct('all') >= 0.95, v: Math.round(A.masteryPct('all') * 100) + '% mastered', go: 'strategy' },
      { t: 'Strategy Blitz: 40+ in 60 seconds', ok: b.blitz >= 40, v: `best ${b.blitz}`, go: 'blitz' },
      { t: 'Deck countdown: perfect in 25s', ok: b.deck !== null && b.deck <= 25, v: b.deck !== null ? `best ${b.deck.toFixed(1)}s` : 'not done yet', go: 'deck' },
      { t: 'Speed count: a perfect table at 120 a minute', ok: b.speed >= 120, v: b.speed ? `best ${b.speed} a minute` : 'not done yet', go: 'speed' },
      { t: 'True count: 10/10 under 2s each', ok: b.tc !== null && b.tc <= 2, v: b.tc !== null ? `best ${b.tc.toFixed(2)}s avg` : 'not done yet', go: 'tc' },
      { t: 'Index plays: 90% mastered', ok: A.idxPct() >= 0.9, v: Math.round(A.idxPct() * 100) + '% mastered', go: 'index' },
      { t: 'Shoe sim: 150 hands, 98% plays, 95% counts', ok: sh.hands >= 150 && sh.dec && sh.decOk / sh.dec >= 0.98 && sh.checks >= 20 && sh.checksOk / sh.checks >= 0.95,
        v: sh.hands ? `${sh.hands} hands · ${sh.dec ? Math.round((100 * sh.decOk) / sh.dec) : 0}% plays · ${sh.checks ? Math.round((100 * sh.checksOk) / sh.checks) : 0}% counts` : 'not done yet', go: 'shoe' }
    ];
  }
  A.readiness = readiness;
  const checkRow = (i, extra = '') => `<button class="check ${i.ok ? 'done' : ''}" ${i.go ? `data-go="${i.go}"` : ''} ${extra}><span class="dot">${i.ok ? A.icon('check') : ''}</span><span class="ct"><span>${esc(i.t)}</span>${i.v ? `<small>${esc(i.v)}</small>` : ''}</span>${i.go && !i.ok ? `<span class="chev">${A.icon('chevron')}</span>` : ''}</button>`;
  A.checkRow = checkRow;
  function bindGo(root) { $$('[data-go]', root).forEach((b) => (b.onclick = () => go(b.dataset.go, b.dataset.id ? { id: b.dataset.id } : {}))); }
  A.bindGo = bindGo;

  // a round badge: the rank number, a bootcamp stage
  const medal = A.medal;
  // three cards fanned across the workout card
  const fan = () => `<div class="hero-fan" aria-hidden="true">${[['J', '♣'], ['A', '♠'], ['K', '♥']].map(([r, s]) => A.cardHTML({ r, s })).join('')}</div>`;
  // drill pictures: little scenes on felt, made of the same cards and chips as the drills
  const at = (r, s, st) => A.cardHTML({ r, s }, 'sm').replace('<div class="pc', `<div style="${st}" class="pc`);
  const chip = (c, st) => `<i class="art-chip" style="--cc:${c};${st}"></i>`;
  function art(kind) {
    const S = A.S;
    if (kind === 'speed') {
      const T = A.SC_TABLES, i = S.spd.stars.findIndex((x) => !x), cpm = (T[i] || T[T.length - 1]).cpm;
      return `<span class="drill-art">${at('9', '♥', 'left:calc(50% - 58px);top:38px;transform:rotate(-14deg)')}${at('K', '♠', 'left:calc(50% - 20px);top:28px;transform:rotate(-3deg)')}${at('4', '♦', 'left:calc(50% + 18px);top:36px;transform:rotate(11deg)')}<span class="art-pill red" style="right:10px;top:10px">${cpm}/min</span></span>`;
    }
    if (kind === 'strategy') return `<span class="drill-art">${at('8', '♠', 'left:calc(50% - 38px);top:14px;transform:rotate(-8deg)')}${at('8', '♦', 'left:calc(50% - 4px);top:12px;transform:rotate(7deg)')}<span class="art-acts"><i style="background:#3166c4">Hit</i><i style="background:#c2373e">Stand</i><i style="background:#7b55d0">Split</i></span></span>`;
    if (kind === 'tc') return `<span class="drill-art dark"><span class="art-num"><b>+3</b><span>True count</span></span></span>`;
    if (kind === 'casino') return `<span class="drill-art">${chip('#1c1c20', 'left:calc(50% - 50px);top:44px')}${chip('#d32f39', 'left:calc(50% - 20px);top:24px')}${chip('#1d8a57', 'left:calc(50% + 8px);top:48px')}<span class="art-pill" style="left:10px;top:10px">6 decks</span></span>`;
    return `<span class="drill-art dark"><span class="art-shoe"></span><span class="art-pill" style="left:10px;top:10px">${A.B.isDD() ? '2 decks' : 'Full shoe'}</span></span>`;
  }
  A.art = art;
  const drill = (g, kind, t, s) => `<button class="drill" data-go="${g}">${art(kind)}<b>${esc(t)}</b><small>${esc(s)}</small></button>`;

  SCREENS.today = () => {
    const S = A.S, rk = A.rank(), txp = A.todayXP(), goal = S.prof.goal, cur = A.currentStage(), stage = CAMP[cur];
    const wk = A.workout(), wi = A.wkIndex(), wkDone = wi >= wk.length;
    const tasks = stage.tasks, nDone = tasks.filter(A.taskDone).length, nextTask = tasks.find((t) => !A.taskDone(t));
    const hr = new Date().getHours(), greet = hr < 4 ? 'Good evening' : hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
    const when = hr >= 18 || hr < 4 ? 'Tonight' : 'Today';
    const h = S.hist[A.dayKey()] || { n: 0, ok: 0 }, acc = h.n ? Math.round((100 * h.ok) / h.n) + '%' : '–';
    const streak = A.streak(), pct = Math.min(1, txp / goal);
    const bonus = txp >= goal && !S.flags['bonus_' + A.dayKey()];
    const hero = !wkDone
      ? `<section class="hero">${fan()}
          <div class="kicker">${when}'s workout</div>
          <h2>${wi ? `Step ${wi + 1} of ${wk.length}` : `${wk.length} drills`}</h2>
          <p>${wi ? `Next: ${esc(wk[wi].t)}` : `${wk.length * 3} minutes of strategy, counting speed and a live table.`}</p>
          <div class="hero-steps">${wk.map((s, i) => `<i class="${i < wi ? 'on' : i === wi ? 'cur' : ''}"></i>`).join('')}</div>
          <button class="btn" id="wkgo">${wi ? 'Continue' : 'Start'} <small>· ${esc(wk[wi].t)}</small></button>
          <button class="linkbtn" data-go="workout">See the drills</button></section>`
      : `<section class="hero done">${fan()}
          <div class="kicker">${A.icon('check')} Workout done · +100 XP</div>
          <h2>${nextTask ? 'Keep going' : 'Bootcamp complete'}</h2>
          <p>${nextTask ? `Stage ${stage.id}: ${esc(A.taskLabel(nextTask))}` : 'Keep your edge at the live table.'}</p>
          <div class="hero-steps">${wk.map(() => '<i class="on"></i>').join('')}</div>
          <button class="btn" id="cont">${nextTask ? 'Continue the course' : 'Play the casino table'}</button></section>`;
    return {
      title: greet, kicker: `${rk.name} · ${S.xp.toLocaleString()} XP`,
      right: `<button class="iconbtn" id="rbtn" aria-label="Settings">${A.icon('gear')}</button>`,
      onRight: () => go('settings'),
      html: `${hero}
      <div class="tstats">
        <button class="ts" data-tab="progress"><span class="ts-ic flame ${streak ? 'on' : ''}">${A.icon('flame')}</span><b>${streak}</b><span>day streak</span></button>
        <button class="ts" data-tab="progress"><span class="ts-ic">${A.ring(pct, 30, 4, '', pct >= 1 ? 'var(--good)' : 'var(--red)')}</span><b>${Math.min(txp, 99999)}<em>/${goal}</em></b><span>XP today</span></button>
        <button class="ts" data-tab="progress"><span class="ts-ic">${A.icon('train')}</span><b>${acc}</b><span>accuracy</span></button>
      </div>
      ${bonus ? `<div class="bonus"><span class="bonus-ic">${A.icon('trophy')}</span><div class="grow"><b>Daily goal reached</b><span>Your bonus is ready</span></div><button class="btn sm" id="bonus">Claim +50 XP</button></div>` : ''}
      <div class="row-sb"><h3 class="sec">Your course</h3><button class="linkbtn" data-go="camp">All stages</button></div>
      <div class="course">
        <button class="course-head" data-go="camp" data-cur-stage="${stage.id}">${medal(stage.id, 'cur')}<span class="grow"><span class="kicker">Stage ${stage.id} of ${CAMP.length}</span><b>${esc(stage.title)}</b></span><span class="chev">${A.icon('chevron')}</span></button>
        <div class="segs" aria-hidden="true">${CAMP.map((st, i) => `<i class="${i === cur ? 'cur' : i < cur || A.stageDone(st) ? 'on' : ''}"></i>`).join('')}</div>
        <div class="course-meta"><span>${nDone} of ${tasks.length} tasks done</span><span>${Math.round((100 * nDone) / tasks.length)}%</span></div>
        ${nextTask ? `<button class="course-next" id="cont2"><span class="grow"><small>Up next</small><b>${esc(A.taskLabel(nextTask))}</b></span><span class="play">${A.icon('play')}</span></button>` : ''}
      </div>
      <div class="row-sb"><h3 class="sec">Practice</h3><button class="linkbtn" id="alld">All drills</button></div>
      <div class="rail">
        ${drill('speed', 'speed', 'Speed Count', A.scTotal ? `${A.scTotal()}/24 stars` : 'A live table')}
        ${drill('strategy', 'strategy', 'Strategy', `${Math.round(A.masteryPct('all') * 100)}% mastered`)}
        ${drill('tc', 'tc', 'True count', S.best.tc !== null ? 'Best ' + S.best.tc.toFixed(1) + 's' : 'Divide fast')}
        ${drill('casino', 'casino', 'Casino table', S.casino ? A.fmt$(S.casino.bank) : 'Chips, heat, a real game')}
        ${drill('shoe', 'shoe', A.B.isDD() ? 'Double deck' : 'Shoe simulator', S.shoe.hands ? S.shoe.hands + ' hands' : 'Count a whole shoe')}
      </div>
      <p class="foot">Training only. No betting, no money.</p>`,
      mount(root) {
        bindGo(root);
        $$('[data-tab]', root).forEach((b) => (b.onclick = () => A.setTab(b.dataset.tab)));
        const next = () => { if (!nextTask) return go('casino'); const [s, a] = A.taskGo(nextTask); go(s, a); };
        const c = $('#cont', root); if (c) c.onclick = next;
        const c2 = $('#cont2', root); if (c2) c2.onclick = next;
        const w = $('#wkgo', root); if (w) w.onclick = () => startStep();
        $('#alld', root).onclick = () => A.setTab('train');
        const bn = $('#bonus', root); if (bn) bn.onclick = () => {
          if (S.flags['bonus_' + A.dayKey()]) return;
          S.flags['bonus_' + A.dayKey()] = true; A.save(); bn.disabled = true;
          A.fx.win(); A.confetti();
          const box = $('.bonus', root); box.classList.add('open'); $('b', box).textContent = 'Bonus claimed'; $('.grow > span', box).textContent = '+50 XP. Back tomorrow for the next one.';
          setTimeout(() => { A.addXP(50); A.render(); }, 900);
        };
      }
    };
  };
  // start (or continue) today's workout and jump straight into the current drill
  function startStep(fromOverview) {
    if (A.wkIndex() === 0 && !(A.S.wk.d === A.dayKey() && A.S.wk.plan && A.S.wk.plan.length)) A.startWorkout();
    const plan = A.workout(), s = plan[A.wkIndex()];
    if (!s) return go('workout');
    const args = Object.assign({ wk: true }, s.args);
    if (fromOverview) A.replace(s.id, args); else go(s.id, args);
  }
  const tile = (g, ic, t, s) => `<button class="tile" data-go="${g}"><span class="ti">${A.icon(ic)}</span><b>${esc(t)}</b><small>${esc(s)}</small></button>`;
  A.tile = tile;

  SCREENS.workout = () => {
    const wk = A.workout(), wi = A.wkIndex(), done = wi >= wk.length;
    return {
      title: 'Daily Workout',
      html: `<p class="muted">Short, mixed and back to back. Each drill leads straight into the next.</p>
        <div class="steps">${wk.map((s, i) => `<div class="step ${i < wi ? 'done' : i === wi ? 'cur' : ''}"><span class="sn">${i < wi ? A.icon('check') : i + 1}</span><span class="ct"><b>${esc(s.t)}</b><small>${esc(s.s)}</small></span></div>`).join('')}</div>
        ${done ? `<div class="fb ok">${A.icon('check')} Workout complete · +100 XP</div><button class="btn ghost" id="again">Run it again</button>`
          : `<button class="btn big" id="go">${wi ? 'Continue' : 'Start'} · ${esc(wk[wi].t)}</button>`}`,
      mount(root) {
        const g = $('#go', root); if (g) g.onclick = () => startStep(true);
        const a = $('#again', root); if (a) a.onclick = () => { A.startWorkout(); A.S.flags['wk_' + A.dayKey()] = true; A.save(); A.replace('workout', {}); };
      }
    };
  };

  SCREENS.camp = () => {
    const cur = A.currentStage();
    // a stage's tasks in a sheet: tap one to go straight to it
    const openStage = (i) => {
      const st = CAMP[i], open = A.stageOpen(i), done = A.stageDone(st), n = st.tasks.filter(A.taskDone).length;
      A.sheet(`<div class="st-head">${medal(done ? A.icon('check') : open ? st.id : A.icon('lock'), done ? 'done' : open ? 'open' : 'lock')}<div class="grow"><div class="kicker">Stage ${st.id} of ${CAMP.length} · ${n}/${st.tasks.length} done</div><h2 class="m0">${esc(st.title)}</h2><p class="muted small m0">${esc(st.sub)}</p></div></div>
        <div class="checks">${st.tasks.map((t, j) => checkRow({ t: A.taskLabel(t), ok: A.taskDone(t), go: open ? 'x' : '' }, `data-t="${j}"`)).join('')}</div>
        ${open ? '' : '<p class="tiny muted">Finish the stage before it to unlock this one.</p>'}<button class="btn ghost" id="stc">Close</button>`, (r, close) => {
        $('#stc', r).onclick = close;
        $$('[data-t]', r).forEach((b) => (b.onclick = () => { if (!open) return A.toast('Finish the previous stage to unlock this one.'); close(); const [s, a] = A.taskGo(st.tasks[+b.dataset.t]); go(s, a); }));
      });
    };
    const node = (st, i) => {
      const done = A.stageDone(st), open = A.stageOpen(i), isCur = i === cur, n = st.tasks.filter(A.taskDone).length;
      const cls = isCur ? 'cur' : done ? 'done' : open ? 'open' : 'lock';
      const badge = medal(done && !isCur ? A.icon('check') : open || isCur ? st.id : A.icon('lock'), cls);
      if (isCur) return `<div class="pn cur" data-cur-stage="${st.id}">${badge}<div class="pn-body"><div class="kicker">Stage ${st.id} · ${n} of ${st.tasks.length} done</div><b>${esc(st.title)}</b><small>${esc(st.sub)}</small>
        <div class="checks">${st.tasks.map((t, j) => checkRow({ t: A.taskLabel(t), ok: A.taskDone(t), go: 'x' }, `data-t="${j}"`)).join('')}</div></div></div>`;
      return `<div class="pn ${cls}">${badge}<button class="pn-body" data-stage="${i}"><b>${esc(st.title)}</b><small>${done ? 'Done' : open ? `${n} of ${st.tasks.length} done` : esc(st.sub)}</small></button></div>`;
    };
    return {
      title: 'Bootcamp',
      html: `<p class="muted">${CAMP.length} stages from your first hand to casino-ready. Each one opens on results, not days.</p>
        <div class="path">${CAMP.map(node).join('')}</div>`,
      mount(root) {
        $$('[data-stage]', root).forEach((b) => (b.onclick = () => openStage(+b.dataset.stage)));
        $$('.pn.cur [data-t]', root).forEach((b) => (b.onclick = () => { const [s, a] = A.taskGo(CAMP[cur].tasks[+b.dataset.t]); go(s, a); }));
        const here = $('.pn.cur', root); if (here && cur > 1) setTimeout(() => here.scrollIntoView({ block: 'center' }), 60);
      }
    };
  };

  // ---------------- onboarding ----------------
  function onboard() {
    const S = A.S; let step = 0;
    const choice = (k, v, t, s) => `<button class="opt" data-k="${k}" data-v="${v}"><b>${t}</b><small>${s}</small></button>`;
    const steps = [
      () => `<div class="ob-hero"><div class="logo">${A.icon('spadeSolid', 'fill')}</div><h2>${esc(A.CFG.brand)}</h2><p class="muted">The fastest way to learn to count cards — properly.</p></div>
        <ul class="ob-list"><li><b>Adaptive drills</b> that hammer the hands you miss</li><li><b>14-stage bootcamp</b> that unlocks on results</li><li><b>A real 6-deck shoe</b> with heat, distractions and count checks</li><li><b>Daily workouts</b>, streaks and ranks to keep you sharp</li></ul>
        <button class="btn big" data-next>Let's set you up</button>`,
      () => `<h2>Where are you starting?</h2><p class="muted">We'll unlock the right stages. You can always go back.</p>
        ${choice('level', 'new', 'New to strategy', 'Start from the very first stage')}
        ${choice('level', 'basic', 'I know basic strategy', 'Unlock up to card counting (stage 5)')}
        ${choice('level', 'counter', 'I already count', 'Unlock up to index plays (stage 9)')}`,
      () => `<h2>How hard do you want to train?</h2><p class="muted">Your daily XP goal. Hit it every day to build your streak.</p>
        ${choice('goal', 100, 'Casual · 100 XP', 'About 10 minutes a day')}
        ${choice('goal', 250, 'Serious · 250 XP', 'About 20 minutes a day')}
        ${choice('goal', 500, 'Intense · 500 XP', '40+ minutes — the fastest path')}`,
      () => `<h2>What game do you play?</h2><p class="muted">Basic strategy, index numbers, the bet ramp and the simulator all change with the number of decks.</p>
        ${choice('decks', 2, 'Double deck', 'Two decks — usually hand-held, burn card, cut card at a random depth')}
        ${choice('decks', 6, 'Shoe game', '6 or 8 decks dealt from a shoe')}`,
      () => `<h2>What rules will you play?</h2><p class="muted">Every chart and drill adapts. Most US games are H17. Check the felt: "Dealer hits soft 17".</p>
        ${choice('h17', 1, 'Dealer hits soft 17 (H17)', 'Most common in the US')}
        ${choice('h17', 0, 'Dealer stands on all 17s (S17)', 'Better game, found at higher limits')}`,
      () => `<div class="ob-hero"><div class="logo">${A.icon('check')}</div><h2>You're set.</h2><p class="muted">Your first stage is ready, and so is today's workout.</p></div>
        <button class="btn big" data-done>Start training</button>`
    ];
    const draw = (root) => {
      $('.ob', root).innerHTML = steps[step]() + `<div class="ob-dots">${steps.map((_, i) => `<i class="${i === step ? 'on' : ''}"></i>`).join('')}</div>`;
      const nx = $('[data-next]', root); if (nx) nx.onclick = () => { step++; draw(root); };
      $$('[data-k]', root).forEach((b) => (b.onclick = () => {
        const k = b.dataset.k, v = b.dataset.v;
        if (k === 'level') { S.prof.level = v; S.prof.unlockTo = v === 'counter' ? 9 : v === 'basic' ? 5 : 1; }
        if (k === 'goal') S.prof.goal = +v;
        if (k === 'h17') { S.prof.h17 = v === '1'; A.applyRules(); }
        if (k === 'decks') { S.prof.decks = +v; S.prof.gameAsked = true; A.applyRules(); }
        A.save(); A.fx.tap(); step++; draw(root);
      }));
      const dn = $('[data-done]', root); if (dn) dn.onclick = () => { S.prof.onboarded = true; A.save(); close(); A.render(); };
    };
    const close = A.sheet('<div class="ob" data-lock></div>', (r) => draw(r));
  }
  A.onboard = onboard;

  // one-time question for players who set up before double-deck support existed
  A.askGame = () => {
    const S = A.S;
    A.sheet(`<div class="kicker">New in this version</div><h2 class="m0">What game do you play?</h2>
      <p class="muted">Double-deck basic strategy, index numbers and betting are different. Pick your game and everything adapts — you can change it any time in Settings.</p>
      <div class="opts"><button class="opt" data-g="2"><b>Double deck</b><small>Two decks, burn card, cut card at a random depth</small></button>
      <button class="opt" data-g="6"><b>Shoe game</b><small>6 or 8 decks dealt from a shoe</small></button></div>`, (r, close) => {
      r.querySelector('.sheet').setAttribute('data-lock', '1');
      $$('[data-g]', r).forEach((b) => (b.onclick = () => { S.prof.decks = +b.dataset.g; S.prof.gameAsked = true; S.prof.shoe = null; A.applyRules(); A.save(); close(); A.render(); A.toast(`Set up for ${B2().rulesLabel()}`, 'good'); }));
    });
  };
  const B2 = () => A.B;

  // ---------------- settings ----------------
  SCREENS.settings = () => {
    const p = A.S.prof;
    const seg = (k, opts) => `<div class="seg" data-set="${k}">${opts.map(([v, t]) => `<button data-v="${v}" class="${String(p[k]) === String(v) ? 'on' : ''}">${t}</button>`).join('')}</div>`;
    return {
      title: 'Settings',
      html: `
        <h3 class="fsec">Profile</h3>
        <div class="flat">
          <button class="frow" id="nm"><span class="ft"><b>Name</b><span>${p.name ? esc(p.name) : 'Add your name for your profile'}</span></span><span class="chev">${A.icon('chevron')}</span></button>
        </div>
        <h3 class="fsec">Table rules</h3>
        <div class="flat">
          <div class="frow col"><span class="ft"><b>Game</b><span>${esc(A.B.rulesLabel())}</span></span>${seg('decks', [[2, 'Double deck'], [6, 'Shoe (6–8 decks)']])}</div>
          <div class="frow col"><span class="ft"><b>Dealer on soft 17</b><span>Check the felt: "Dealer hits soft 17"</span></span>${seg('h17', [[true, 'Hits (H17)'], [false, 'Stands (S17)']])}</div>
          <div class="frow col"><span class="ft"><b>Late surrender</b><span>Charts, drills and the simulator all follow these rules</span></span>${seg('ls', [[true, 'Offered'], [false, 'Not offered']])}</div>
        </div>
        <h3 class="fsec">Training</h3>
        <div class="flat">
          <div class="frow col"><span class="ft"><b>Daily goal</b><span>Hit it every day to build your streak</span></span>${seg('goal', [[100, 'Casual 100'], [250, 'Serious 250'], [500, 'Intense 500']])}</div>
          <div class="frow col"><span class="ft"><b>Starting point</b><span>Unlock the bootcamp from a later stage</span></span>${seg('unlockTo', [[1, 'Stage 1'], [5, 'Stage 5'], [9, 'Stage 9']])}</div>
        </div>
        <h3 class="fsec">Feedback</h3>
        <div class="flat">
          <div class="frow"><span class="ft"><b>Sound effects</b><span>Sounds for cards, answers and alerts</span></span>${sw('sound', p.sound)}</div>
          <div class="frow"><span class="ft"><b>Haptics</b><span>A tap you can feel on answers and results</span></span>${sw('haptics', p.haptics)}</div>
          <div class="frow"><span class="ft"><b>Daily reminder</b><span>Leave it empty to turn it off</span></span><input type="time" id="rem" value="${esc(p.remind)}"></div>
        </div>
        <h3 class="fsec">Your progress</h3>
        <div class="flat">
          <button class="frow" id="bkup"><span class="ft"><b>Back up progress</b><span>A code to keep in Notes or email to yourself</span></span><span class="chev">${A.icon('chevron')}</span></button>
          <button class="frow" id="rstr"><span class="ft"><b>Restore from a code</b><span>Bring your progress to this phone</span></span><span class="chev">${A.icon('chevron')}</span></button>
          <button class="frow danger" id="reset"><span class="ft"><b>Reset all progress</b><span>Start over from zero</span></span><span class="chev">${A.icon('chevron')}</span></button>
        </div>
        <h3 class="fsec">More</h3>
        <div class="flat">
          <button class="frow" data-go="about"><span class="ft"><b>Responsible play</b><span>Limits, the law, and getting help</span></span><span class="chev">${A.icon('chevron')}</span></button>
        </div>
        <p class="foot">${esc(A.CFG.brand)} · training only, no real money</p>`,
      mount(root) {
        $$('[data-set]', root).forEach((g) => $$('button', g).forEach((b) => (b.onclick = () => {
          const k = g.dataset.set, raw = b.dataset.v; p[k] = raw === 'true' ? true : raw === 'false' ? false : +raw;
          if (k === 'decks') { p.gameAsked = true; p.shoe = null; }
          if (k === 'h17' || k === 'ls' || k === 'decks') A.applyRules();
          A.save(); A.replace('settings', {});
        })));
        $$('[data-sw]', root).forEach((b) => (b.onclick = () => { p[b.dataset.sw] = !p[b.dataset.sw]; A.save(); b.classList.toggle('on', p[b.dataset.sw]); A.fx.tap(); }));
        $('#rem', root).onchange = async (e) => { p.remind = e.target.value; A.save(); const ok = await A.scheduleReminder(); A.toast(p.remind ? (ok ? `Reminder set for ${p.remind}` : 'Reminder saved (allow notifications in iOS Settings)') : 'Reminder off'); };
        bindGo(root);
        $('#nm', root).onclick = () => A.editName();
        $('#bkup', root).onclick = () => {
          const code = A.backupCode();
          A.sheet(`<h3 class="m0">Your backup code</h3><p class="muted small">It holds everything: XP, mastery, records, lessons, logs and settings. Keep it in Notes or email it to yourself, then paste it into Restore from a code on any phone.</p>
            <textarea id="bcode" class="code" rows="5" readonly>${esc(code)}</textarea><div style="height:10px"></div>
            <button class="btn" id="bcopy">Copy code</button>${navigator.share ? '<button class="btn ghost" id="bshare">Share</button>' : ''}<button class="btn ghost" id="bdone">Done</button>`, (r, close) => {
            const ta = $('#bcode', r);
            $('#bcopy', r).onclick = () => {
              const done = () => A.toast('Copied. Paste it somewhere safe.', 'good');
              const fallback = () => { ta.focus(); ta.select(); try { document.execCommand('copy') ? done() : A.toast('Select the code and copy it.'); } catch (e) { A.toast('Select the code and copy it.'); } };
              try { navigator.clipboard.writeText(code).then(done, fallback); } catch (e) { fallback(); }
            };
            const sh = $('#bshare', r); if (sh) sh.onclick = () => { navigator.share({ title: 'BJ MasterClass backup', text: code }).catch(() => {}); };
            $('#bdone', r).onclick = close;
          });
        };
        $('#rstr', root).onclick = () => A.sheet(`<h3 class="m0">Restore from a code</h3><p class="muted small">Paste a backup code. It replaces the progress on this phone.</p>
          <textarea id="rcode" class="code" rows="5" placeholder="BJMC-…"></textarea><div style="height:10px"></div><button class="btn" id="rgo">Check the code</button><button class="btn ghost" id="rno">Cancel</button>`, (r, close) => {
          $('#rno', r).onclick = close;
          $('#rgo', r).onclick = () => {
            const st = A.readBackup($('#rcode', r).value);
            if (!st) return A.toast('That code didn\'t work. Copy the whole code, starting with BJMC-.', 'bad');
            close();
            A.sheet(`<h3 class="m0">Replace this phone's progress?</h3><p class="muted">The code has ${st.xp.toLocaleString()} XP, ${Object.keys(st.done).length} lessons done and ${st.days.length} days of training. Everything on this phone now will be replaced.</p>
              <button class="btn" id="ryes">Restore</button><button class="btn ghost" id="rcan">Cancel</button>`, (r2, close2) => {
              $('#rcan', r2).onclick = close2;
              $('#ryes', r2).onclick = () => { close2(); A.restoreBackup(st); A.toast('Progress restored.', 'good'); };
            });
          };
        });
        $('#reset', root).onclick = () => A.sheet(`<h3 class="m0">Reset everything?</h3><p class="muted">XP, mastery, records, lessons and logs will be erased.</p><button class="btn danger" id="y">Erase progress</button><button class="btn ghost" id="n">Cancel</button>`,
          (r, close) => { $('#n', r).onclick = close; $('#y', r).onclick = () => { close(); A.reset(); setTimeout(onboard, 50); }; });
      }
    };
  };
  // your name, shown on your profile
  A.editName = () => A.sheet(`<h3 class="m0">Your name</h3><p class="muted small">Shown on your profile. It stays on this phone.</p>
    <input id="nmv" maxlength="40" placeholder="Your name" value="${esc(A.S.prof.name)}" autocomplete="name"><div style="height:12px"></div><button class="btn" id="nmok">Save</button><button class="btn ghost" id="nmno">Cancel</button>`, (r, close) => {
    const inp = $('#nmv', r); setTimeout(() => inp.focus(), 320);
    $('#nmno', r).onclick = close;
    $('#nmok', r).onclick = () => { A.S.prof.name = inp.value.trim().slice(0, 40); A.save(); close(); A.render(); };
  });
  const sw = (k, on) => `<button class="switch ${on ? 'on' : ''}" data-sw="${k}" aria-label="${k}"><i></i></button>`;
})();
