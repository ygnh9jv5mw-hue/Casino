/* Progress tab: activity, records, mastery, session log, bankroll calculator, responsible play. */
(function () {
  const A = window.APP, B = window.BJ, { $, $$, esc, SCREENS, go, fmt$ } = A;

  function activity(days = 14) {
    const S = A.S, out = []; const d = new Date();
    for (let i = days - 1; i >= 0; i--) { const x = new Date(d); x.setDate(d.getDate() - i); const k = A.dayKey(x); out.push({ k, d: x, h: S.hist[k] || { n: 0, ok: 0, xp: 0 }, goal: S.goalDays.includes(k) }); }
    return out;
  }
  function bars(data) {
    const max = Math.max(A.S.prof.goal, ...data.map((x) => x.h.xp));
    const w = 300, h = 110, bw = w / data.length;
    const gy = h - 18 - ((h - 26) * A.S.prof.goal) / max;
    return `<svg class="bars" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <line x1="0" x2="${w}" y1="${gy}" y2="${gy}" class="goal-line"/>
      ${data.map((x, i) => { const bh = ((h - 26) * x.h.xp) / max; return `<rect x="${i * bw + 3}" y="${h - 18 - bh}" width="${bw - 6}" height="${Math.max(bh, x.h.xp ? 2 : 0)}" rx="3" class="${x.goal ? 'hit' : ''}"/>
        <text x="${i * bw + bw / 2}" y="${h - 4}" text-anchor="middle">${'SMTWTFS'[x.d.getDay()]}</text>`; }).join('')}</svg>`;
  }

  SCREENS.progress = () => {
    const S = A.S, rk = A.rank(), act = activity(), b = S.best;
    const reps = Object.values(S.hist).reduce((a, h) => a + h.n, 0), right = Object.values(S.hist).reduce((a, h) => a + h.ok, 0);
    const wk = act.slice(-7).reduce((a, x) => a + x.h.xp, 0);
    const rec = (t, v, ok) => `<div class="recd ${ok ? 'ok' : ''}"><b>${v}</b><span>${esc(t)}</span></div>`;
    return {
      title: 'Progress',
      html: `
      <div class="card rankcard"><span class="badge big r${rk.i}">${rk.i + 1}</span><div class="grow"><div class="kicker">Rank</div><h3 class="m0">${esc(rk.name)}</h3>
        <div class="xpbar"><i style="width:${Math.round(rk.pct * 100)}%"></i></div><div class="tiny muted">${S.xp.toLocaleString()} XP${rk.next ? ` · next: ${esc(rk.next)} at ${rk.to.toLocaleString()}` : ''}</div></div></div>
      <div class="card"><div class="row-sb"><div><div class="kicker">Last 14 days</div><h3 class="m0">${wk.toLocaleString()} XP this week</h3></div><div class="tiny muted">${A.streak()}-day streak</div></div>${bars(act)}
        <div class="stats"><div><b>${reps.toLocaleString()}</b><span>total reps</span></div><div><b>${reps ? Math.round((100 * right) / reps) + '%' : '–'}</b><span>accuracy</span></div><div><b>${S.days.length}</b><span>days trained</span></div></div></div>
      <h3 class="sec">Casino-ready</h3>
      <div class="card checks">${A.readiness().map((i) => A.checkRow(i)).join('')}</div>
      <h3 class="sec">Mastery</h3>
      <button class="card masteries" data-go="mastery">
        <div>${A.ring(A.masteryPct('hard'), 58, 6, Math.round(A.masteryPct('hard') * 100) + '%')}<span>Hard</span></div>
        <div>${A.ring(A.masteryPct('soft'), 58, 6, Math.round(A.masteryPct('soft') * 100) + '%')}<span>Soft</span></div>
        <div>${A.ring(A.masteryPct('pairs'), 58, 6, Math.round(A.masteryPct('pairs') * 100) + '%')}<span>Pairs</span></div>
        <div>${A.ring(A.idxPct(), 58, 6, Math.round(A.idxPct() * 100) + '%', 'var(--good)')}<span>Indices</span></div></button>
      <h3 class="sec">Personal records</h3>
      <div class="records">
        ${rec('Blitz', b.blitz || '–', b.blitz >= 40)}${rec('Best streak', b.strat || '–', b.strat >= 100)}${rec('Reflex', b.reflex || '–', b.reflex >= 60)}
        ${rec('Pairs', b.pairs || '–', b.pairs >= 40)}${rec('Deck', b.deck !== null ? b.deck.toFixed(1) + 's' : '–', b.deck !== null && b.deck <= 25)}${rec('Ladder', b.ladder ? b.ladder.toFixed(1) + '/s' : '–', b.ladder >= 3)}
        ${rec('Table flash', b.flash ? 'Lvl ' + b.flash : '–', b.flash >= 8)}${rec('True count', b.tc !== null ? b.tc.toFixed(1) + 's' : '–', b.tc !== null && b.tc <= 2)}${rec('Index recall', b.recall || '–', b.recall >= 20)}
      </div>
      <h3 class="sec">Shoe simulator</h3>
      <div class="card stats"><div><b>${S.shoe.hands}</b><span>hands</span></div><div><b>${S.shoe.dec ? Math.round((100 * S.shoe.decOk) / S.shoe.dec) + '%' : '–'}</b><span>plays</span></div><div><b>${S.shoe.checks ? Math.round((100 * S.shoe.checksOk) / S.shoe.checks) + '%' : '–'}</b><span>counts</span></div><div><b>${S.shoe.backoffs}</b><span>backoffs</span></div></div>
      <h3 class="sec">Real-world play</h3>
      <div class="group">
      <button class="list-item" data-go="log"><span class="ic">${A.icon('notebook')}</span><span class="tx"><b>Session log</b><span>${S.log.length} sessions logged</span></span><span class="chev">${A.icon('chevron')}</span></button>
      <button class="list-item" data-go="bankroll"><span class="ic">${A.icon('calc')}</span><span class="tx"><b>Bankroll & risk of ruin</b><span>Plan your bets before you play</span></span><span class="chev">${A.icon('chevron')}</span></button>
      </div>`,
      mount: A.bindGo
    };
  };

  SCREENS.bankroll = () => ({
    title: 'Bankroll & Risk',
    html: `<div class="card"><div class="grid2">
      <div><label>Bankroll ($)</label><input id="b1" inputmode="decimal" value="10000"></div>
      <div><label>Average bet ($)</label><input id="b2" inputmode="decimal" value="50"></div>
      <div><label>Your edge (%)</label><input id="b3" inputmode="decimal" value="1.0"></div>
      <div><label>Std. dev. per hand ($)</label><input id="b4" inputmode="decimal" value="140"></div>
      <div><label>Hands per hour</label><input id="b5" inputmode="numeric" value="80"></div>
      <div><label>Hours planned</label><input id="b6" inputmode="numeric" value="100"></div></div>
      <p class="tiny muted">With a 1–12 spread, standard deviation per hand is roughly 2.5–3× your average bet.</p></div><div id="bo"></div>`,
    mount(root) {
      A.S.flags.bankroll = true; A.save();
      const calc = () => {
        // clamp every input to a sane range so typos, negatives or huge numbers can't produce NaN
        const v = (id, lo, hi) => { const x = parseFloat($(id, root).value); return isFinite(x) ? Math.min(hi, Math.max(lo, x)) : 0; };
        const B0 = v('#b1', 0, 1e9), avg = v('#b2', 0, 1e7), edge = v('#b3', -50, 50) / 100, sd = v('#b4', 0, 1e7), hph = v('#b5', 0, 1000), hrs = Math.round(v('#b6', 0, 1e5));
        const ev = avg * edge, evh = ev * hph, sdh = sd * Math.sqrt(hph), N = hph * hrs, evT = ev * N, sdT = sd * Math.sqrt(N);
        const ror = ev > 0 && sd > 0 ? Math.exp((-2 * ev * B0) / (sd * sd)) : 1;
        const n0 = ev > 0 ? (sd / ev) ** 2 : Infinity, behind = sdT > 0 ? 0.5 * erfc(evT / sdT / Math.SQRT2) : 0;
        const safe = ev > 0 ? Math.ceil((-Math.log(0.05) * sd * sd) / (2 * ev)) : 0;
        $('#bo', root).innerHTML = `<div class="grid2">
          <div class="stat"><b>${fmt$(evh)}</b><span>expected per hour</span></div><div class="stat"><b>±${fmt$(sdh)}</b><span>1 SD per hour</span></div>
          <div class="stat"><b>${fmt$(evT)}</b><span>expected over ${hrs}h</span></div><div class="stat"><b>${fmt$(evT - sdT)} to ${fmt$(evT + sdT)}</b><span>68% range over ${hrs}h</span></div>
          <div class="stat"><b class="${ror <= 0.05 ? 'pos' : ror <= 0.15 ? 'goldt' : 'neg'}">${(ror * 100).toFixed(1)}%</b><span>risk of ruin</span></div>
          <div class="stat"><b>${(behind * 100).toFixed(0)}%</b><span>chance of being behind after ${hrs}h</span></div></div>
          <div class="card" style="margin-top:10px"><p class="small m0">Bankroll for 5% risk of ruin at these bets: <b>${safe ? fmt$(safe) : '—'}</b>.<br>N0 = ${isFinite(n0) ? Math.round(n0).toLocaleString() + ' hands (' + Math.round(n0 / (hph || 1)) + ' hours)' : '∞'} — how long until your edge outweighs one standard deviation.
          ${ror > 0.05 ? '<br><b>Above 5% risk of ruin: lower your bets or grow the bankroll.</b>' : '<br>Within the professional range.'}</p></div>`;
      };
      $$('input', root).forEach((i) => (i.oninput = calc)); calc();
    }
  });
  function erfc(x) { const z = Math.abs(x), t = 1 / (1 + 0.5 * z);
    const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
    return x >= 0 ? r : 2 - r; }

  SCREENS.log = () => {
    const S = A.S, tot = S.log.reduce((a, s) => ({ h: a.h + s.hours, r: a.r + s.result }), { h: 0, r: 0 });
    return {
      title: 'Session Log',
      html: `<div class="grid2"><div class="stat"><b>${tot.h.toFixed(1)}h</b><span>${S.log.length} sessions</span></div>
        <div class="stat"><b class="${tot.r >= 0 ? 'pos' : 'neg'}">${fmt$(tot.r)}</b><span>${tot.h ? fmt$(tot.r / tot.h) + ' per hour' : 'total result'}</span></div></div>
        <div class="card" style="margin-top:12px"><b>Add a session</b>
          <div class="grid2"><div><label>Date</label><input id="l1" type="date" value="${A.dayKey()}"></div><div><label>Casino</label><input id="l2" placeholder="Where"></div>
          <div><label>Hours</label><input id="l3" inputmode="decimal" placeholder="1.5"></div><div><label>Result ($)</label><input id="l4" inputmode="decimal" placeholder="-200 or 450"></div></div>
          <label>Notes (game, penetration, heat…)</label><textarea id="l5" rows="2"></textarea><div style="height:10px"></div><button class="btn" id="ladd">Save session</button></div>
        ${S.log.slice().reverse().map((s) => `<div class="list-item"><span class="tx"><b>${esc(s.date)} · ${esc(s.where || 'Session')}</b><span>${s.hours}h · <span class="${s.result >= 0 ? 'pos' : 'neg'}">${fmt$(s.result)}</span>${s.notes ? ' · ' + esc(s.notes) : ''}</span></span><button class="iconbtn sm" data-del="${s.id}" aria-label="Delete">${A.icon('close')}</button></div>`).join('')}
        <p class="tiny muted">Judge yourself on hours played and accuracy. Short-term results are mostly variance.</p>`,
      mount(root) {
        $('#ladd', root).onclick = () => {
          const hours = parseFloat($('#l3', root).value), result = parseFloat($('#l4', root).value);
          if (!(hours > 0) || isNaN(result)) return A.toast('Enter hours and a result (use a minus sign for a loss).');
          S.log.push({ id: Date.now(), date: $('#l1', root).value, where: $('#l2', root).value.trim(), hours, result, notes: $('#l5', root).value.trim() }); A.save(); A.replace('log', {});
        };
        $$('[data-del]', root).forEach((b) => (b.onclick = () => { S.log = S.log.filter((s) => String(s.id) !== b.dataset.del); A.save(); A.replace('log', {}); }));
      }
    };
  };

  SCREENS.about = () => ({
    title: 'Responsible Play',
    html: `<div class="card lesson"><p><b>Advantage play is a skill, not a guarantee.</b> A counter's edge is small — about 0.5–1.5% — and shows up only over thousands of hands. Losing sessions, weeks and months happen to every professional.</p>
      <ul><li>Only play with money you can afford to lose.</li><li>Set a loss limit and a time limit before you sit down.</li><li>Never chase losses, and never play impaired.</li><li>If you can't play perfectly, don't play for money — practise here instead.</li><li>Follow the gambling-age laws where you live.</li></ul>
      <p>If gambling stops being fun, help is free and confidential: call or text <b>1-800-GAMBLER</b> (US) or visit ncpgambling.org.</p></div>
      <p class="tiny muted">This app is for education and practice only. It doesn't take bets, hold money or connect to any casino.</p>`
  });
})();
