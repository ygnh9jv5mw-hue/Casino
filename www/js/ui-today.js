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

  SCREENS.today = () => {
    const S = A.S, rk = A.rank(), txp = A.todayXP(), goal = S.prof.goal, stage = CAMP[A.currentStage()];
    const wk = A.workout(), wi = A.wkIndex(), wkDone = wi >= wk.length;
    const tasks = stage.tasks, nDone = tasks.filter(A.taskDone).length;
    const nextTask = tasks.find((t) => !A.taskDone(t));
    const greet = (() => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; })();
    const upnext = !wkDone
      ? `<div class="eyebrow">${A.icon('play')} Daily workout</div>
         <h2>${wi ? `Step ${wi + 1} of ${wk.length}` : `${wk.length} drills · ${wk.length * 3} min`}</h2>
         <p>${wi ? `Next up: ${esc(wk[wi].t)}` : 'A mixed session built from where you are. +100 XP when you finish.'}</p>
         <div class="steps-mini">${wk.map((s, i) => `<i class="${i < wi ? 'on' : ''}"></i>`).join('')}</div>
         <button class="btn" id="wkgo">${wi ? 'Continue workout' : 'Start workout'}</button>
         <button class="linkbtn" data-go="workout" style="display:block;margin:6px auto -8px">See today's drills</button>`
      : `<div class="eyebrow">${A.icon('check')} Workout done</div>
         <h2>${nextTask ? esc(A.taskLabel(nextTask)) : 'Bootcamp complete'}</h2>
         <p>${nextTask ? `Stage ${stage.id} · ${esc(stage.title)}` : 'Keep your edge with the casino table and the simulator.'}</p>
         <button class="btn" id="cont">${nextTask ? 'Continue bootcamp' : 'Play the casino table'}</button>`;
    return {
      title: 'Today',
      right: `<button class="iconbtn" id="rbtn" aria-label="Settings">${A.icon('gear')}</button>`,
      onRight: () => go('settings'),
      html: `
      <p class="muted" style="margin:0 2px 2px">${greet}</p>
      <div class="upnext">${upnext}</div>
      <div class="strip">
        <div>${A.icon('flame')}<div><b>${A.streak()}</b><span>day streak</span></div></div>
        <i class="sep"></i>
        <div>${A.ring(txp / goal, 34, 4)}<div><b>${Math.min(txp, 99999)}<span style="display:inline;color:var(--text-3);font-size:13px"> / ${goal}</span></b><span>XP today</span></div></div>
        <i class="sep"></i>
        <div><span class="badge r${rk.i}">${rk.i + 1}</span><div><b>${esc(rk.name)}</b><span>${rk.next ? `${(rk.to - S.xp).toLocaleString()} XP to go` : 'Top rank'}</span></div></div>
      </div>
      <button class="card camp-card" data-go="camp">
        <div class="camprow"><span class="num">${stage.id}</span><span class="tx"><b>${esc(stage.title)}</b><span>${nextTask ? 'Next: ' + esc(A.taskLabel(nextTask)) : 'Stage complete'}</span></span><span class="chev">${A.icon('chevron')}</span></div>
        <div class="bar"><i style="width:${Math.round((100 * nDone) / tasks.length)}%"></i></div>
      </button>
      <div class="row-sb"><h3 class="sec" style="margin-bottom:12px">Practice</h3><button class="linkbtn" id="alld">All drills</button></div>
      <div class="tiles">
        ${tile('strategy', 'spade', 'Strategy', Math.round(A.masteryPct('all') * 100) + '% mastered')}
        ${tile('reflex', 'pulse', 'Counting', S.best.reflex ? 'Reflex best ' + S.best.reflex : 'Card values')}
        ${tile('tc', 'divide', 'True count', S.best.tc !== null ? 'Best ' + S.best.tc.toFixed(1) + 's' : 'Convert fast')}
        ${tile('casino', 'chip', 'Casino table', S.casino ? A.fmt$(S.casino.bank) : '6-deck shoe')}
      </div>
      <p class="foot">Training only — no betting, no money.</p>`,
      mount(root) {
        bindGo(root);
        const c = $('#cont', root); if (c) c.onclick = () => { if (!nextTask) return go('casino'); const [s, a] = A.taskGo(nextTask); go(s, a); };
        const w = $('#wkgo', root); if (w) w.onclick = () => startStep();
        $('#alld', root).onclick = () => A.setTab('train');
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
    return {
      title: 'Bootcamp',
      html: `<p class="muted">${CAMP.length} stages from zero to casino-ready. Each one unlocks on results, not days.</p>` +
        CAMP.map((st, i) => {
          const open = A.stageOpen(i), dn = A.stageDone(st), tasks = st.tasks;
          const n = tasks.filter(A.taskDone).length;
          return `<details class="stage ${dn ? 'done' : open ? 'open' : 'locked'}" ${i === cur ? 'open' : ''}>
            <summary><span class="sn">${dn ? A.icon('check') : open ? st.id : A.icon('lock')}</span><span class="ct"><b>${esc(st.title)}</b><small>${esc(st.sub)} · ${n}/${tasks.length}</small></span></summary>
            <div class="checks">${tasks.map((t, j) => checkRow({ t: A.taskLabel(t), ok: A.taskDone(t), go: open ? 'x' : '' }, `data-s="${i}" data-t="${j}"`)).join('')}</div></details>`;
        }).join(''),
      mount(root) {
        $$('[data-s]', root).forEach((b) => (b.onclick = () => { const i = +b.dataset.s; if (!A.stageOpen(i)) return A.toast('Finish the previous stage to unlock this one.'); const [s, a] = A.taskGo(CAMP[i].tasks[+b.dataset.t]); go(s, a); }));
      }
    };
  };

  // ---------------- onboarding ----------------
  function onboard() {
    const S = A.S; let step = 0;
    const choice = (k, v, t, s) => `<button class="opt" data-k="${k}" data-v="${v}"><b>${t}</b><small>${s}</small></button>`;
    const steps = [
      () => `<div class="ob-hero"><div class="logo">${A.icon('spade')}</div><h2>${esc(A.CFG.brand)}</h2><p class="muted">The fastest way to learn to count cards — properly.</p></div>
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
        <h3 class="sec">Table rules</h3>
        <div class="card"><label>Game</label>${seg('decks', [[2, 'Double deck'], [6, 'Shoe (6–8 decks)']])}
          <label>Dealer on soft 17</label>${seg('h17', [[true, 'Hits (H17)'], [false, 'Stands (S17)']])}
          <label>Late surrender</label>${seg('ls', [[true, 'Offered'], [false, 'Not offered']])}
          <p class="tiny muted">${esc(A.B.rulesLabel())}. Charts, drills, index numbers, the bet ramp and the shoe simulator all follow these rules.</p></div>
        <h3 class="sec">Training</h3>
        <div class="card"><label>Daily goal</label>${seg('goal', [[100, 'Casual 100'], [250, 'Serious 250'], [500, 'Intense 500']])}
          <label>Starting point</label>${seg('unlockTo', [[1, 'Stage 1'], [5, 'Stage 5'], [9, 'Stage 9']])}
          <div class="tgl"><span>Sound effects</span>${sw('sound', p.sound)}</div>
          <div class="tgl"><span>Haptics</span>${sw('haptics', p.haptics)}</div>
          <div class="tgl"><span>Daily reminder</span><input type="time" id="rem" value="${esc(p.remind)}"></div>
          <p class="tiny muted">Leave the reminder empty to turn it off.</p></div>
        <h3 class="sec">More</h3>
        <button class="list-item" data-go="about"><span class="ic">${A.icon('heart')}</span><span class="tx"><b>Responsible play</b><span>Limits, the law, and getting help</span></span><span class="chev">${A.icon('chevron')}</span></button>
        <button class="list-item" id="reset"><span class="ic" style="color:var(--bad)">${A.icon('reset')}</span><span class="tx"><b>Reset all progress</b><span>Start over from zero</span></span></button>
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
        $('#reset', root).onclick = () => A.sheet(`<h3 class="m0">Reset everything?</h3><p class="muted">XP, mastery, records, lessons and logs will be erased.</p><button class="btn danger" id="y">Erase progress</button><button class="btn ghost" id="n">Cancel</button>`,
          (r, close) => { $('#n', r).onclick = close; $('#y', r).onclick = () => { close(); A.reset(); setTimeout(onboard, 50); }; });
      }
    };
  };
  const sw = (k, on) => `<button class="switch ${on ? 'on' : ''}" data-sw="${k}" aria-label="${k}"><i></i></button>`;
})();
