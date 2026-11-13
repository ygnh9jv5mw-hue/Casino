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

  // ---------------- achievements ----------------
  // id, group, name, what it takes, picture, metal (bronze, silver, gold), earned?
  const ACH = [
    ['bs1', 'Basic strategy', 'Clean Hands', '25 right in a row in the trainer', 'spade', 'b', (S) => S.best.strat >= 25],
    ['bs2', 'Basic strategy', 'Autopilot', '100 right in a row', 'spade', 's', (S) => S.best.strat >= 100],
    ['bs3', 'Basic strategy', 'The Whole Chart', '95% of the chart mastered', 'spade', 'g', () => A.masteryPct('all') >= 0.95],
    ['rc1', 'Running count', 'Quick Eye', '40 cards in 60 seconds in Reflex', 'eye', 'b', (S) => S.best.reflex >= 40],
    ['rc2', 'Running count', 'Deck Runner', 'A full deck in 25 seconds', 'layers', 's', (S) => S.best.deck !== null && S.best.deck <= 25],
    ['rc3', 'Running count', 'Dealer Speed', 'A perfect table at 120 a minute', 'gauge', 'g', (S) => S.best.speed >= 120],
    ['tc1', 'True count', 'Divider', 'True counts in under 3 seconds', 'divide', 'b', (S) => S.best.tc !== null && S.best.tc <= 3],
    ['tc2', 'True count', 'Tray Reader', '8 of 10 in Tray reading', 'tray', 's', (S) => S.best.decks >= 8],
    ['tc3', 'True count', 'Bet the Count', '10 of 10 in Bet ramp', 'coins', 'g', (S) => S.best.ramp >= 10],
    ['ix1', 'Deviations', 'Off Script', '10 index numbers recalled', 'hash', 'b', (S) => S.best.recall >= 10],
    ['ix2', 'Deviations', 'Illustrious', 'Half the index plays mastered', 'sparkle', 's', () => A.idxPct() >= 0.5],
    ['ix3', 'Deviations', 'Every Index', '90% of index plays mastered', 'sparkle', 'g', () => A.idxPct() >= 0.9],
    ['tb1', 'At the table', 'First Shoe', 'Play a shoe to the cut card', 'cards', 'b', (S) => S.shoe.shoes >= 1],
    ['tb2', 'At the table', 'Doubled Up', 'Grow the casino bankroll to $2,000', 'chip', 's', (S) => !!S.casino && S.casino.peak >= 2000],
    ['tb3', 'At the table', 'Pro Room', 'Clear the Pro Room at Speed Count', 'trophy', 'g', (S) => S.spd.stars[7] >= 1],
    ['hb1', 'Habit', 'On a Roll', 'Your goal 3 days in a row', 'flame', 'b', () => bestStreak() >= 3],
    ['hb2', 'Habit', 'Every Day', 'A 7-day streak', 'flame', 's', () => bestStreak() >= 7],
    ['hb3', 'Habit', 'Iron Will', 'A 30-day streak', 'flame', 'g', () => bestStreak() >= 30]
  ];
  A.ACH = ACH;
  // the longest run of days with the goal hit
  function bestStreak() {
    const days = [...new Set(A.S.goalDays)].sort(); let best = 0, run = 0, prev = null;
    for (const d of days) { const t = Date.parse(d + 'T12:00:00Z'); run = prev !== null && Math.round((t - prev) / 864e5) === 1 ? run + 1 : 1; if (run > best) best = run; prev = t; }
    return best;
  }
  A.bestStreak = bestStreak;
  // A medal drawn in metal: a laurel, a coin, the skill's picture struck into it. Locked medals are dark, with a lock.
  const METAL = { b: ['#f6c79a', '#c67d3e', '#7a4214'], s: ['#fbfcfd', '#b6bcc7', '#6a707c'], g: ['#fff0b8', '#e6b84c', '#9a6a10'], x: ['#4a4a4c', '#2e2e30', '#1d1d1f'] };
  let mid = 0;
  function medallion(ic, tier, locked) {
    const [hi, mi, lo] = METAL[locked ? 'x' : tier], id = 'mdl' + (++mid);
    const leaf = (a, side) => { const r = (a * Math.PI) / 180, x = (50 + 42 * Math.cos(r)).toFixed(1), y = (50 + 42 * Math.sin(r)).toFixed(1); return `<ellipse cx="${x}" cy="${y}" rx="3.1" ry="6.8" transform="rotate(${Math.round(a + 90 + side * 24)} ${x} ${y})"/>`; };
    let leaves = ''; for (let i = 0; i < 8; i++) leaves += leaf(122 + i * 16, 1) + leaf(58 - i * 16, -1);
    const pic = ic === 'spadeSolid' ? `<g transform="translate(34.5 35) scale(1.3)" fill="${lo}">${A.ICON.spadeSolid}</g>`
      : `<g transform="translate(33.5 33.5) scale(1.375)" fill="none" stroke="${locked ? '#58585c' : lo}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${A.ICON[ic] || ''}</g>`;
    return `<svg class="mdl" viewBox="0 0 100 100" aria-hidden="true"><defs><radialGradient id="${id}" cx="34%" cy="28%" r="80%"><stop offset="0" stop-color="${hi}"/><stop offset=".5" stop-color="${mi}"/><stop offset="1" stop-color="${lo}"/></radialGradient></defs>
      <g fill="${locked ? '#38383b' : mi}">${leaves}</g><circle cx="50" cy="50" r="32" fill="url(#${id})"/>
      <circle cx="50" cy="50" r="31.4" fill="none" stroke="${hi}" stroke-opacity=".6"/><circle cx="50" cy="50" r="26" fill="none" stroke="${lo}" stroke-opacity=".5" stroke-width="1.5"/>${pic}
      ${locked ? '<path d="M43 49v-4.5a7 7 0 0 1 14 0V49" fill="none" stroke="#fff" stroke-width="3.4"/><rect x="38.5" y="48" width="23" height="17" rx="3.5" fill="#fff"/>' : ''}</svg>`;
  }
  A.medallion = medallion;
  // new medals are celebrated once you are back on a main tab; medals already earned before this version are simply marked
  A.checkAch = () => {
    const S = A.S, first = !S.flags.achInit; let changed = first;
    for (const a of ACH) {
      const k = 'ach_' + a[0]; if (S.flags[k]) continue;
      let won = false; try { won = !!a[6](S); } catch (e) {}
      if (!won) continue;
      S.flags[k] = true; changed = true;
      if (!first) A.queueCelebrate('Achievement unlocked', `<b>${esc(a[2])}</b> · ${esc(a[3])}`, `<span class="ach-burst">${medallion(a[4], a[5], false)}</span>`);
    }
    if (first) S.flags.achInit = true;
    if (changed) A.save();
  };

  let view = 'stats'; // My stats or Achievements, remembered while the app is open
  SCREENS.progress = () => {
    const S = A.S, rk = A.rank(), act = activity(), b = S.best;
    const reps = Object.values(S.hist).reduce((a, h) => a + h.n, 0), right = Object.values(S.hist).reduce((a, h) => a + h.ok, 0);
    const wk = act.slice(-7).reduce((a, x) => a + x.h.xp, 0);
    const ready = A.readiness(), readyN = ready.filter((x) => x.ok).length, won = ACH.filter((a) => S.flags['ach_' + a[0]]).length;
    const rec = (t, v, ok) => `<div class="recd ${ok ? 'ok' : ''}"><b>${v}</b><span>${esc(t)}</span></div>`;
    return {
      title: 'Progress',
      html: `
      <div class="prof">
        <div class="prof-coin">${medallion('spadeSolid', 'g', false)}</div>
        <div class="prof-name"><h2>${esc(S.prof.name || 'Player')}</h2><button class="iconbtn sm" id="pname" aria-label="Edit your name">${A.icon('pencil')}</button></div>
        <div class="prof-sub"><span class="tag blue">${esc(rk.name)}</span><span>${S.xp.toLocaleString()} XP${rk.next ? ` · ${(rk.to - S.xp).toLocaleString()} to ${esc(rk.next)}` : ' · top rank'}</span></div>
        <div class="rpath" role="img" aria-label="Rank ${rk.i + 1} of ${A.RANKS.length}">${A.RANKS.map((r, i) => `${i ? `<i class="rp-dash ${i <= rk.i ? 'on' : ''}"></i>` : ''}<span class="rp ${i < rk.i ? 'done' : i === rk.i ? 'cur' : ''}">${i + 1}</span>`).join('')}</div>
      </div>
      <div class="seg gold pseg" id="pseg"><button data-v="stats" class="${view === 'stats' ? 'on' : ''}">My stats</button><button data-v="ach" class="${view === 'ach' ? 'on' : ''}">Achievements</button></div>
      <div id="pv-stats" ${view === 'stats' ? '' : 'hidden'}>
      <h3 class="sec">My stats</h3>
      <div class="card gpa"><span class="gpa-coin">${medallion('trophy', 'g', false)}</span><div><b>${readyN}<em>/${ready.length}</em></b><span>Casino-ready benchmarks</span></div></div>
      <div class="sgrid">
        <div class="sg"><b class="g">${reps.toLocaleString()}</b><span>Reps trained</span></div>
        <div class="sg"><b>${reps ? Math.round((100 * right) / reps) + '%' : '–'}</b><span>Accuracy</span></div>
        <div class="sg"><b class="g">${A.streak()}</b><span>Day streak</span></div>
        <div class="sg"><b>${bestStreak()}</b><span>Best streak</span></div>
      </div>
      <div class="card"><div class="row-sb"><div><div class="kicker">Last 14 days</div><h3 class="m0">${wk.toLocaleString()} XP this week</h3></div><div class="tiny muted">${S.days.length} days trained</div></div>${bars(act)}</div>
      <h3 class="sec">Casino-ready</h3>
      <div class="card checks">${ready.map((i) => A.checkRow(i)).join('')}</div>
      <h3 class="sec">Mastery</h3>
      <button class="card masteries" data-go="mastery">
        <div>${A.ring(A.masteryPct('hard'), 58, 6, Math.round(A.masteryPct('hard') * 100) + '%')}<span>Hard</span></div>
        <div>${A.ring(A.masteryPct('soft'), 58, 6, Math.round(A.masteryPct('soft') * 100) + '%')}<span>Soft</span></div>
        <div>${A.ring(A.masteryPct('pairs'), 58, 6, Math.round(A.masteryPct('pairs') * 100) + '%')}<span>Pairs</span></div>
        <div>${A.ring(A.idxPct(), 58, 6, Math.round(A.idxPct() * 100) + '%', 'var(--good)')}<span>Indices</span></div></button>
      <h3 class="sec">Personal records</h3>
      <div class="records">
        ${rec('Blitz', b.blitz || '–', b.blitz >= 40)}${rec('Best streak', b.strat || '–', b.strat >= 100)}${rec('Reflex', b.reflex || '–', b.reflex >= 60)}
        ${rec('Pairs', b.pairs || '–', b.pairs >= 40)}${rec('Deck', b.deck !== null ? b.deck.toFixed(1) + 's' : '–', b.deck !== null && b.deck <= 25)}${rec('Ladder', b.ladder ? b.ladder.toFixed(1) + '/s' : '–', b.ladder >= 3)}${rec('Speed count', b.speed ? b.speed + '/min' : '–', b.speed >= 120)}
        ${rec('Table flash', b.flash ? 'Lvl ' + b.flash : '–', b.flash >= 8)}${rec('True count', b.tc !== null ? b.tc.toFixed(1) + 's' : '–', b.tc !== null && b.tc <= 2)}${rec('Index recall', b.recall || '–', b.recall >= 20)}
      </div>
      <h3 class="sec">Shoe simulator</h3>
      <div class="card stats"><div><b>${S.shoe.hands}</b><span>hands</span></div><div><b>${S.shoe.dec ? Math.round((100 * S.shoe.decOk) / S.shoe.dec) + '%' : '–'}</b><span>plays</span></div><div><b>${S.shoe.checks ? Math.round((100 * S.shoe.checksOk) / S.shoe.checks) + '%' : '–'}</b><span>counts</span></div><div><b>${S.shoe.backoffs}</b><span>backoffs</span></div></div>
      <h3 class="sec">Real-world play</h3>
      <div class="group">
      <button class="list-item" data-go="log"><span class="ic">${A.icon('notebook')}</span><span class="tx"><b>Session log</b><span>${S.log.length} sessions logged</span></span><span class="chev">${A.icon('chevron')}</span></button>
      <button class="list-item" data-go="bankroll"><span class="ic">${A.icon('calc')}</span><span class="tx"><b>Bankroll & risk of ruin</b><span>Plan your bets before you play</span></span><span class="chev">${A.icon('chevron')}</span></button>
      </div>
      </div>
      <div id="pv-ach" ${view === 'ach' ? '' : 'hidden'}>
        <div class="row-sb"><h3 class="sec">Achievements</h3><span class="ach-count">${won} of ${ACH.length}</span></div>
        <div class="ach-grid">${ACH.map((a) => { const on = !!S.flags['ach_' + a[0]]; return `<div class="ach ${on ? 'won' : 'lock'}" data-ach="${a[0]}"><span class="cat">${esc(a[1])}</span>${medallion(a[4], a[5], !on)}<b>${esc(a[2])}</b><small>${esc(a[3])}</small></div>`; }).join('')}</div>
      </div>`,
      mount(root) {
        A.bindGo(root);
        $$('#pseg button', root).forEach((bt) => (bt.onclick = () => {
          view = bt.dataset.v; A.fx.tap();
          $$('#pseg button', root).forEach((x) => x.classList.toggle('on', x === bt));
          $('#pv-stats', root).hidden = view !== 'stats'; $('#pv-ach', root).hidden = view !== 'ach';
        }));
        $('#pname', root).onclick = () => A.editName();
      }
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
