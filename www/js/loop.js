/* NO ANTICHEAT: reasons to play one more. Win streaks, earnings while you're away,
   the next thing worth buying, and short jobs from the cheat sellers. */
(function (NA) {
  'use strict';
  const U = NA.U, D = NA.DATA;
  const L = {};
  const S = () => NA.Save.data;
  const ss = () => { const s = S(); s.loop = s.loop || {}; return s.loop; };

  // ---------------------------------------------------------------- win streaks
  // bonus on the n-th win in a row: +10% per win after the first, up to +50%
  L.streakBonus = n => Math.min(0.5, 0.1 * Math.max(0, n - 1));
  L.streak = () => S().stats.streak || 0;

  // ---------------------------------------------------------------- earnings while you're away
  const AWAY_MIN = 10 * 60e3, AWAY_CAP = 8 * 3600e3;
  L.ratePerHour = function () {
    const aff = NA.Save.level('affiliate');
    return Math.round(NA.Prog.tierBase() * 0.6 * (1 + 0.25 * aff) * NA.Prog.payBoost());
  };
  L.touch = function () { ss().lastSeen = Date.now(); };
  // called on load: anything earned since you closed the app waits on the menu
  L.checkAway = function () {
    const lp = ss(), now = Date.now();
    if (!S().username || !lp.lastSeen) { lp.lastSeen = now; return; }
    const ms = Math.min(AWAY_CAP, now - lp.lastSeen);
    if (ms >= AWAY_MIN) {
      const amt = Math.max(1, Math.round(L.ratePerHour() * ms / 3600e3));
      lp.away = { amt: (lp.away ? lp.away.amt : 0) + amt, ms: (lp.away ? lp.away.ms : 0) + ms, uses: U.randInt(12, 60) };
    }
    lp.lastSeen = now;
    NA.Save.save();
  };
  L.pendingAway = () => ss().away || null;
  L.claimAway = function () {
    const a = ss().away;
    if (!a) return 0;
    const s = S();
    s.credits += a.amt; s.lifetimeCredits += a.amt;
    ss().away = null;
    NA.Save.save();
    return a.amt;
  };
  L.fmtAway = ms => { const h = Math.floor(ms / 3600e3), m = Math.floor(ms / 60e3) % 60; return h ? `${h}h ${m}m` : `${m}m`; };

  // ---------------------------------------------------------------- the next thing worth buying
  L.nextGoal = function () {
    const s = S(), G = NA.Game;
    let best = null;
    for (const c of D.CHEATS) {
      if (c.base <= 0 || s.highestTier < c.tier) continue;
      const lvl = NA.Save.level(c.id);
      if (lvl >= c.max) continue;
      const cost = G.cost(c.id);
      if (!best || cost < best.cost) best = { id: c.id, name: c.name, lvl: lvl + 1, max: c.max, cost };
    }
    if (!best) return null;
    best.have = s.credits;
    best.pct = Math.min(1, s.credits / best.cost);
    return best;
  };
  L.tierGoal = function () {
    const s = S(), t = D.TIERS.find(x => x.id === s.highestTier);
    if (!t || t.id >= D.MAX_PLAYABLE_TIER) return null;
    const wins = Math.min(s.winsByTier[t.id] || 0, t.winsToUnlock);
    return { tier: t.id + 1, wins, need: t.winsToUnlock, from: t.name };
  };

  // ---------------------------------------------------------------- seller jobs
  // three at a time; finishing one pays out and a new one shows up
  const JOBS = [
    { id: 'si_win', seller: 'skillissue', text: 'Win {n} matches with skillissue.shop loaded', n: 2, test: c => c.won && c.seller === 'skillissue', pay: 1.2 },
    { id: 'si_kills', seller: 'skillissue', text: 'Get {n} kills with skillissue.shop loaded', n: 25, test: c => c.seller === 'skillissue' ? c.kills : 0, pay: 1 },
    { id: 'fh_kills', seller: 'freehax', text: 'Get {n} kills with FREEHAX.EXE loaded', n: 12, test: c => c.seller === 'freehax' ? c.kills : 0, pay: 1.3 },
    { id: 'fh_win', seller: 'freehax', text: 'Win a match on FREEHAX.EXE (good luck)', n: 1, test: c => c.won && c.seller === 'freehax', pay: 1.5 },
    { id: 'gh_quiet', seller: 'ghost', text: 'Win on ghost.cc with suspicion under 40', n: 1, test: c => c.won && c.seller === 'ghost' && c.susPeak < 40, pay: 1.4 },
    { id: 'gh_ranked', seller: 'ghost', text: 'Win {n} Ranked matches on ghost.cc', n: 2, test: c => c.won && c.ranked && c.seller === 'ghost', pay: 1.8 },
    { id: 'vw_ranked', seller: 'void', text: 'Win a Ranked match with VOIDWARE loaded', n: 1, test: c => c.won && c.ranked && c.seller === 'void', pay: 1.2, sub: 3 },
    { id: 'vw_heads', seller: 'void', text: 'Get {n} headshots with VOIDWARE loaded', n: 15, test: c => c.seller === 'void' ? c.heads : 0, pay: 1, sub: 2 },
    { id: 'any_timed', seller: 'skillissue', text: 'Win {n} timed matches', n: 2, test: c => c.won && c.timed, pay: 1.2 },
    { id: 'any_heads', seller: 'skillissue', text: 'Get {n} headshots in one match', n: 5, once: true, test: c => c.heads >= 5 ? 5 : 0, pay: 1 },
    { id: 'any_streak', seller: 'skillissue', text: 'Reach a {n}-win streak', n: 3, once: true, test: c => c.streak >= 3 ? 3 : 0, pay: 1.5 },
  ];
  L.JOBS = JOBS;
  const jobDef = id => JOBS.find(j => j.id === id);
  function rollJob(exclude) {
    const s = S(), Sl = NA.Sellers;
    const pool = JOBS.filter(j => !exclude.includes(j.id) && Sl.unlocked(j.seller));
    const j = U.pick(pool.length ? pool : JOBS);
    return { id: j.id, n: 0, reward: Math.round(j.pay * NA.Prog.tierBase() * 1.5 / 10) * 10 };
  }
  L.jobs = function () {
    const lp = ss();
    lp.jobs = (lp.jobs || []).filter(j => jobDef(j.id));
    while (lp.jobs.length < 3) lp.jobs.push(rollJob(lp.jobs.map(j => j.id)));
    return lp.jobs.map(j => { const d = jobDef(j.id); return Object.assign({}, d, j, { label: d.text.replace('{n}', d.n), seller: NA.Sellers.BY[d.seller] }); });
  };
  L.jobsDone = () => ss().jobsDone || 0;

  // ---------------------------------------------------------------- after every match
  L.afterMatch = function (c) {
    const s = S(), st = s.stats, lp = ss(), news = [];
    // streak
    const prev = st.streak || 0;
    if (c.counts) {
      st.streak = c.won ? prev + 1 : 0;
      st.bestStreak = Math.max(st.bestStreak || 0, st.streak);
      if (c.won && st.streak >= 2) news.push({ k: 'good', t: `WIN STREAK ${st.streak}: +${Math.round(L.streakBonus(st.streak) * 100)}% on that win, +${Math.round(L.streakBonus(st.streak + 1) * 100)}% on the next` });
      else if (!c.won && prev >= 2) news.push({ k: 'warn', t: `Win streak of ${prev} is over` });
    }
    c.streak = st.streak || 0;
    // jobs
    L.jobs();
    for (const j of lp.jobs) {
      const d = jobDef(j.id), got = d.test(c);
      if (!got) continue;
      const inc = typeof got === 'number' ? got : 1;
      j.n = d.once ? Math.max(j.n, inc) : j.n + inc;
      if (j.n >= d.n) {
        j.done = true;
        s.credits += j.reward; s.lifetimeCredits += j.reward;
        if (d.sub) s.sellers.subLeft = (s.sellers.subLeft || 0) + d.sub;
        lp.jobsDone = (lp.jobsDone || 0) + 1;
        news.push({ k: 'good', t: `JOB DONE for ${NA.Sellers.BY[d.seller].name}: +${U.fmt(j.reward)}${d.sub ? ` and +${d.sub} VOIDWARE matches` : ''}` });
      }
    }
    lp.jobs = lp.jobs.filter(j => !j.done);
    L.jobs();
    NA.Save.save();
    return news;
  };

  // keep "last seen" fresh while the game is open
  setInterval(() => { if (NA.Save.data && NA.Save.data.username) L.touch(); }, 30000);
  document.addEventListener('visibilitychange', () => { if (NA.Save.data && NA.Save.data.username) { L.touch(); NA.Save.save(); } });

  NA.Loop = L;
})(window.NA);
