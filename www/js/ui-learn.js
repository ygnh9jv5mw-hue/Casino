/* Learn tab: modules, lessons, quizzes. */
(function () {
  const A = window.APP, { $, $$, esc, SCREENS, go, COURSE } = A;

  const MOD_IC = ['spade', 'pulse', 'sparkle', 'coins', 'eye', 'layers', 'trend', 'users'];
  SCREENS.learn = () => {
    const S = A.S, total = A.lessons().length, done = A.doneCount();
    const quizzes = COURSE.filter((m) => (S.quiz[m.id] || 0) >= 80).length;
    // the next lesson to read, straight from the top of the tab
    let nm = null, nl = null, ni = 0;
    for (const m of COURSE) { const i = m.lessons.findIndex((l) => !S.done[l.id]); if (i >= 0) { nm = m; nl = m.lessons[i]; ni = i; break; } }
    const top = nl
      ? `<div class="card learn-next"><div class="row-sb"><div class="grow"><div class="kicker">Module ${COURSE.indexOf(nm) + 1} · lesson ${ni + 1} of ${nm.lessons.length}</div><h3>${esc(nl.title)}</h3><div class="muted small">${nl.mins || 3} min read · ${done} of ${total} lessons done</div></div>${A.ring(done / total, 52, 5, Math.round((100 * done) / total) + '%')}</div>
        <button class="btn" data-go="lesson" data-id="${nl.id}">${done ? 'Continue reading' : 'Start the first lesson'}</button></div>`
      : `<div class="card row-sb"><div><h3 class="m0">All ${total} lessons done</h3><div class="muted small">${quizzes} of ${COURSE.length} module quizzes passed</div></div>${A.ring(1, 52, 5, '100%', 'var(--good)')}</div>`;
    return {
      title: 'Learn',
      html: `${top}
        <h3 class="sec">Modules</h3>
        <div class="mcards">` +
        COURSE.map((m, i) => {
          const d = m.lessons.filter((l) => S.done[l.id]).length, q = S.quiz[m.id], all = d === m.lessons.length && q >= 80;
          const mins = m.lessons.reduce((a, l) => a + (l.mins || 3), 0);
          const tag = all ? '<span class="tag green">Done</span>' : d || q !== undefined ? '<span class="tag gold">In progress</span>' : `<span class="tag">Module ${i + 1}</span>`;
          return `<button class="mcard ${all ? 'done' : ''}" data-go="module" data-id="${m.id}"><span class="mcard-top"><span class="mtile">${A.icon(all ? 'check' : MOD_IC[i % MOD_IC.length])}</span>${tag}</span>
            <b>${esc(m.title)}</b><span class="mcard-sub">${esc(m.blurb || '')}</span><span class="mcard-meta">${m.lessons.length} lessons · ${mins} min${q !== undefined ? ` · quiz ${q}%` : ''}</span>
            ${d && !all ? `<span class="bar"><i style="width:${(100 * d) / m.lessons.length}%"></i></span>` : ''}</button>`;
        }).join('') + '</div>',
      mount: A.bindGo
    };
  };

  SCREENS.module = ({ id }) => {
    const S = A.S, m = COURSE.find((x) => x.id === id), q = S.quiz[m.id];
    return {
      title: m.title,
      html: `<p class="muted">${esc(m.blurb)}</p><div class="group">` +
        m.lessons.map((l, i) => `<button class="list-item" data-go="lesson" data-id="${l.id}"><span class="ic ${S.done[l.id] ? 'ok' : ''}">${S.done[l.id] ? A.icon('check') : i + 1}</span><span class="tx"><b>${esc(l.title)}</b><span>${l.mins || 3} min${l.drill ? ' · with a drill' : ''}</span></span><span class="chev">${A.icon('chevron')}</span></button>`).join('') +
        (m.quiz ? `<button class="list-item quizrow" data-go="quiz" data-id="${m.id}"><span class="ic ${q >= 80 ? 'ok' : ''}">${q >= 80 ? A.icon('check') : A.icon('quiz')}</span><span class="tx"><b>Module quiz</b><span>${m.quiz.length} questions · pass at 80%${q !== undefined ? ` · best ${q}%` : ''}</span></span><span class="chev">${A.icon('chevron')}</span></button>` : '') + '</div>',
      mount: A.bindGo
    };
  };

  // Lesson bodies can contain placeholders that are filled from the player's own game and rules.
  const B = window.BJ, sg = A.sgn;
  function devTable(set) {
    const rows = B.activeDevs().filter((d) => d.set === set).map((d) => {
      const i = B.devIdx(d), play = d.insurance ? 'Take insurance' : B.NAMES[d.hi];
      const other = d.insurance ? '' : d.kind === 'pair' ? 'stand' : d.kind === 'sur' ? 'play it out' : B.NAMES[d.lo].toLowerCase();
      return `<tr><td>${esc(d.name.replace(' (surrender)', ''))}</td><td>${esc(play)}</td><td><b>${sg(i)}</b> or higher${other ? `<br><span class="tiny muted">else ${esc(other)}</span>` : ''}</td></tr>`;
    }).join('');
    return `<table class="tbl"><tr><th>Hand</th><th>Play</th><th>True count</th></tr>${rows}</table>`;
  }
  function gameNotes() {
    if (!B.isDD()) return '';
    const h17 = B.rules().h17;
    return `<div class="callout">Your game is <b>double deck</b>. A few cells change:
      <ul style="margin:8px 0 0"><li>Double <b>9 vs 2</b> (as well as 3–6).</li><li>Split <b>6s vs 2–7</b> and <b>7s vs 2–8</b>.</li>
      <li>Hit <b>16 vs 9</b> — no surrender.</li>
      ${h17 ? '<li>Double <b>A3 vs 4</b>, <b>soft 18 vs 2</b> and <b>soft 19 vs 6</b>.</li><li>Split <b>8s vs A</b> instead of surrendering.</li>' : '<li>Hit <b>11 vs A</b> off the top (double from +1).</li>'}</ul></div>`;
  }
  const fill = (html) => html.replace('{{I18}}', () => devTable('I18')).replace('{{FAB4}}', () => (B.rules().ls ? devTable('Fab4') : '<p class="muted">Your game has no surrender, so the Fab 4 don\'t apply. Turn surrender on in Settings if your casino offers it.</p>'))
    .replace('{{RULES}}', () => esc(B.rulesLabel())).replace('{{GAME_NOTES}}', gameNotes);

  SCREENS.lesson = ({ id }) => {
    const S = A.S; let m, l, idx;
    COURSE.forEach((mm) => mm.lessons.forEach((ll, i) => { if (ll.id === id) { m = mm; l = ll; idx = i; } }));
    const nextL = m.lessons[idx + 1];
    return {
      title: l.title,
      html: `<div class="kicker" style="margin-top:6px">${esc(m.title)} · ${l.mins || 3} min read</div>
        <div class="lesson">${fill(l.body)}</div>
        ${l.takeaways ? `<div class="card takeaways"><h3>Key takeaways</h3><ul>${l.takeaways.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>` : ''}
        <button class="btn" id="done" style="margin-top:16px">${S.done[l.id] ? (nextL ? 'Next lesson' : m.quiz ? 'Take the quiz' : 'Back to module') : nextL ? 'Complete · next lesson' : m.quiz ? 'Complete · take the quiz' : 'Complete lesson'}</button>
        ${l.drill ? `<button class="btn ghost" id="drill">Practice this now</button>` : ''}`,
      mount(root) {
        const d = $('#drill', root); if (d) d.onclick = () => { if (!S.done[l.id]) { S.done[l.id] = true; A.addXP(20); } go(l.drill); };
        $('#done', root).onclick = () => {
          if (!S.done[l.id]) { S.done[l.id] = true; A.addXP(20); A.fx.ok(); }
          A.save();
          if (nextL) A.replace('lesson', { id: nextL.id });
          else if (m.quiz && (S.quiz[m.id] || 0) < 80) A.replace('quiz', { id: m.id });
          else A.back();
        };
      }
    };
  };

  SCREENS.quiz = ({ id }) => {
    const m = COURSE.find((x) => x.id === id);
    const qs = m.quiz.map((q) => { const order = q.a.map((_, i) => i).sort(() => Math.random() - 0.5); return { q: q.q, a: order.map((i) => q.a[i]), c: order.indexOf(q.c), why: q.why }; });
    let i = 0, ok = 0;
    return {
      title: `Module ${COURSE.indexOf(m) + 1} Quiz`,
      html: '<div id="qz"></div>',
      mount(root) {
        const qz = $('#qz', root);
        const show = () => {
          if (i >= qs.length) return finish();
          const q = qs[i];
          qz.innerHTML = `<div class="qprog">${qs.map((_, j) => `<i class="${j < i ? 'on' : j === i ? 'cur' : ''}"></i>`).join('')}</div>
            <div class="kicker">Question ${i + 1} of ${qs.length}</div><h2 class="q">${esc(q.q)}</h2>
            <div class="opts">${q.a.map((a, j) => `<button class="opt" data-j="${j}"><b>${esc(a)}</b></button>`).join('')}</div><div id="qf"></div>`;
          $$('[data-j]', qz).forEach((b) => (b.onclick = () => {
            const j = +b.dataset.j, good = j === q.c; if (good) ok++;
            good ? A.fx.ok() : A.fx.bad();
            $$('[data-j]', qz).forEach((x) => { x.disabled = true; if (+x.dataset.j === q.c) x.classList.add('right'); else if (x === b) x.classList.add('wrong'); });
            $('#qf', qz).innerHTML = `<div class="fb ${good ? 'ok' : 'bad'}">${good ? `${A.icon('check')} Correct` : '<b>Not quite.</b>'} <span class="small">${esc(q.why)}</span></div><button class="btn" id="qn">${i + 1 < qs.length ? 'Next question' : 'See result'}</button>`;
            $('#qn', qz).onclick = () => { i++; show(); };
          }));
        };
        const finish = () => {
          const S = A.S, pct = Math.round((100 * ok) / qs.length), prev = S.quiz[m.id] || 0, pass = pct >= 80;
          if (pct > prev) S.quiz[m.id] = pct;
          if (pass && prev < 80) A.addXP(75); else A.addXP(ok * 3);
          A.hist(qs.length, ok); A.save();
          if (pass) A.confetti();
          const mi = COURSE.indexOf(m), nm = COURSE[mi + 1];
          const nx = pass ? (nm ? { s: 'module', a: { id: nm.id }, label: `Module ${mi + 2}: ${nm.title}` } : A.nextAfter('quiz')) : { s: 'module', a: { id }, label: 'Review the lessons' };
          qz.innerHTML = `<div class="result"><div class="kicker">${pass ? 'Passed' : 'Not yet'}</div><div class="big-num">${pct}%</div><p class="muted">${ok} of ${qs.length} correct${pass ? '' : ' · 80% to pass'}</p>
            <button class="btn next" id="qnx"><span class="nextlbl">Next</span>${esc(nx.label)}</button>
            <div class="btnrow"><button class="btn ghost" id="qa">${pass ? 'Retake' : 'Try again'}</button><button class="btn ghost" id="qd">Done</button></div></div>`;
          $('#qnx', qz).onclick = () => A.replace(nx.s, nx.a);
          $('#qa', qz).onclick = () => A.replace('quiz', { id });
          $('#qd', qz).onclick = () => A.back();
        };
        show();
      }
    };
  };
})();
