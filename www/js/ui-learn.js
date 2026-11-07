/* Learn tab: modules, lessons, quizzes. */
(function () {
  const A = window.APP, { $, $$, esc, SCREENS, go, COURSE } = A;

  SCREENS.learn = () => {
    const S = A.S, total = A.lessons().length, done = A.doneCount();
    return {
      title: 'Learn',
      html: `<div class="card row-sb"><div><div class="kicker">The MasterClass</div><h3 class="m0">${done} of ${total} lessons</h3><div class="muted small">${COURSE.filter((m) => (S.quiz[m.id] || 0) >= 80).length} of ${COURSE.length} quizzes passed</div></div>${A.ring(done / total, 60, 7, Math.round((100 * done) / total) + '%')}</div>` +
        COURSE.map((m, i) => {
          const d = m.lessons.filter((l) => S.done[l.id]).length, q = S.quiz[m.id];
          const mins = m.lessons.reduce((a, l) => a + (l.mins || 3), 0);
          return `<button class="list-item mod" data-go="module" data-id="${m.id}"><span class="ic">${m.icon}</span><span class="tx">
            <b>${i + 1}. ${esc(m.title)}</b><span>${m.lessons.length} lessons · ${mins} min${q !== undefined ? ` · quiz ${q}%` : ''}</span>
            <span class="bar"><i style="width:${(100 * d) / m.lessons.length}%"></i></span></span>${d === m.lessons.length && q >= 80 ? '<span class="pill ok">✓</span>' : '<span class="chev">›</span>'}</button>`;
        }).join(''),
      mount: A.bindGo
    };
  };

  SCREENS.module = ({ id }) => {
    const S = A.S, m = COURSE.find((x) => x.id === id), q = S.quiz[m.id];
    return {
      title: m.title,
      html: `<p class="muted">${esc(m.blurb)}</p>` +
        m.lessons.map((l, i) => `<button class="list-item" data-go="lesson" data-id="${l.id}"><span class="ic ${S.done[l.id] ? 'ok' : ''}">${S.done[l.id] ? '✓' : i + 1}</span><span class="tx"><b>${esc(l.title)}</b><span>${l.mins || 3} min${l.drill ? ' · includes a drill' : ''}</span></span><span class="chev">›</span></button>`).join('') +
        (m.quiz ? `<button class="list-item quizrow" data-go="quiz" data-id="${m.id}"><span class="ic ${q >= 80 ? 'ok' : ''}">${q >= 80 ? '✓' : '?'}</span><span class="tx"><b>Module quiz</b><span>${m.quiz.length} questions · pass at 80%${q !== undefined ? ` · best ${q}%` : ''}</span></span><span class="chev">›</span></button>` : ''),
      mount: A.bindGo
    };
  };

  SCREENS.lesson = ({ id }) => {
    const S = A.S; let m, l, idx;
    COURSE.forEach((mm) => mm.lessons.forEach((ll, i) => { if (ll.id === id) { m = mm; l = ll; idx = i; } }));
    const nextL = m.lessons[idx + 1];
    return {
      title: l.title,
      html: `<div class="pill gold">${esc(m.title)} · ${l.mins || 3} min</div>
        <div class="lesson">${l.body}</div>
        ${l.takeaways ? `<div class="card takeaways"><div class="kicker">Key takeaways</div><ul>${l.takeaways.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div>` : ''}
        ${l.drill ? `<button class="btn dark" id="drill">Practice this now ›</button>` : ''}
        <button class="btn" id="done" style="margin-top:10px">${S.done[l.id] ? (nextL ? 'Next lesson ›' : m.quiz ? 'Take the quiz ›' : 'Back to module') : 'Mark complete' + (nextL ? ' & continue' : '') + ' · +20 XP'}</button>`,
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
            $('#qf', qz).innerHTML = `<div class="fb ${good ? 'ok' : 'bad'}">${good ? 'Correct.' : 'Not quite.'} <span class="small">${esc(q.why)}</span></div><button class="btn" id="qn">${i + 1 < qs.length ? 'Next question ›' : 'See result'}</button>`;
            $('#qn', qz).onclick = () => { i++; show(); };
          }));
        };
        const finish = () => {
          const S = A.S, pct = Math.round((100 * ok) / qs.length), prev = S.quiz[m.id] || 0, pass = pct >= 80;
          if (pct > prev) S.quiz[m.id] = pct;
          if (pass && prev < 80) A.addXP(75); else A.addXP(ok * 3);
          A.hist(qs.length, ok); A.save();
          if (pass) A.confetti();
          qz.innerHTML = `<div class="result"><div class="big-num">${pct}%</div><p class="muted">${ok} of ${qs.length} correct</p>
            <div class="fb ${pass ? 'ok' : 'bad'}">${pass ? 'Passed! Module quiz complete.' : 'You need 80% to pass. Review the lessons and try again.'}</div>
            <button class="btn" id="qa">${pass ? 'Done' : 'Try again'}</button></div>`;
          $('#qa', qz).onclick = () => (pass ? A.back() : A.replace('quiz', { id }));
        };
        show();
      }
    };
  };
})();
