/* NO ANTICHEAT: long-term progression. Ranked ladder (Iron to Legend), promos, rank rewards,
   seasons, the Legend leaderboard, prestige, daily challenges, login streaks and gun mastery. */
(function (NA) {
  'use strict';
  const U = NA.U, D = NA.DATA;
  const P = {};
  const S = () => NA.Save.data;

  // ---------------------------------------------------------------- ladder
  P.RANKS = ['Iron', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Emerald', 'Diamond', 'Master', 'Grandmaster', 'Legend'];
  P.COLORS = ['#9ca3af', '#cd7f32', '#cbd5e1', '#facc15', '#22d3ee', '#10b981', '#60a5fa', '#c084fc', '#f43f5e', '#fbbf24'];
  P.LEGEND_RP = 2700; // 9 ranks × 3 divisions × 100 RP
  P.rankOf = function (rp) {
    rp = Math.max(0, rp | 0);
    const idx = Math.min(9, Math.floor(rp / 300));
    if (idx === 9) return { idx, div: 0, name: 'Legend', short: 'Legend', inDiv: 100, trophies: rp - P.LEGEND_RP, color: P.COLORS[9] };
    const div = 3 - Math.floor((rp % 300) / 100);
    return { idx, div, name: `${P.RANKS[idx]} ${div}`, short: P.RANKS[idx], inDiv: rp % 100, trophies: 0, color: P.COLORS[idx] };
  };
  P.myRank = () => P.rankOf(S().ranked.rr);

  // What you get for reaching each rank: credits plus a crosshair unlock.
  P.REWARDS = [null,
    { credits: 1000, unlock: ['style', 'dot'] }, { credits: 2500, unlock: ['color', 'cyan'] }, { credits: 6000, unlock: ['color', 'gold'] },
    { credits: 15000, unlock: ['style', 'circle'] }, { credits: 35000, unlock: ['color', 'emerald'] }, { credits: 80000, unlock: ['style', 'tee'] },
    { credits: 160000, unlock: ['color', 'violet'] }, { credits: 300000, unlock: ['style', 'chevron'] }, { credits: 600000, unlock: ['color', 'rainbow'] }];

  // ---------------------------------------------------------------- cosmetics
  P.STYLES = { cross: 'Classic cross', dot: 'Dot', circle: 'Circle', tee: 'T-shape', chevron: 'Chevron' };
  P.CROSS_COLORS = { white: '#ffffff', green: '#4ade80', cyan: '#22d3ee', gold: '#facc15', emerald: '#10b981', violet: '#c084fc', pink: '#f472b6', rainbow: 'rainbow' };
  P.owns = (kind, id) => (S().cosmetics.owned || []).indexOf(kind + ':' + id) >= 0 || (kind === 'style' && id === 'cross') || (kind === 'color' && (id === 'white' || id === 'green' || id === 'pink'));
  P.unlock = (kind, id) => { const c = S().cosmetics; c.owned = c.owned || []; if (!P.owns(kind, id)) c.owned.push(kind + ':' + id); };
  P.crossColor = now => {
    const id = S().cosmetics.color, v = P.CROSS_COLORS[id] || '#ffffff';
    return v === 'rainbow' ? `hsl(${(now / 8) % 360},90%,62%)` : v;
  };

  // ---------------------------------------------------------------- ranked results
  P.applyRanked = function (won, ctx) {
    const s = S(), r = s.ranked, before = P.rankOf(r.rr), out = { before };
    if (ctx.promo) {
      r.promo = false;
      if (won) { r.rr = (before.idx + 1) * 300 + 10; out.promoted = true; }
      else { r.rr = before.idx * 300 + 270; out.promoFailed = true; }
      out.delta = 0;
    } else {
      let d = won ? Math.round(U.randInt(18, 26) * ctx.diff.rp) + (ctx.mvp ? 3 : 0) : -Math.round(U.randInt(10, 16) * ctx.diff.rpLoss);
      const cap = before.idx < 9 ? before.idx * 300 + 299 : Infinity;
      if (d > 0 && r.rr + d >= cap) { d = cap - r.rr; r.rr = cap; r.promo = true; out.promoStarted = true; }
      else r.rr = Math.max(0, r.rr + d);
      out.delta = d;
    }
    r.peakRR = Math.max(r.peakRR || 0, r.rr);
    s.season.peak = Math.max(s.season.peak || 0, r.rr);
    out.after = P.rankOf(r.rr);
    if (out.after.idx > before.idx) {
      const rw = P.REWARDS[out.after.idx];
      s.credits += rw.credits; s.lifetimeCredits += rw.credits;
      P.unlock(rw.unlock[0], rw.unlock[1]);
      out.reward = rw;
      NA.Chat.dm(`${out.after.short}. respect. here's ${U.fmt(rw.credits)} and a new crosshair, check settings`);
    }
    NA.Save.save();
    return out;
  };

  // ---------------------------------------------------------------- seasons
  const EPOCH = Date.UTC(2026, 10, 2), SEASON_MS = 28 * 864e5; // 4-week seasons starting Mon 2 Nov 2026
  P.seasonId = () => Math.max(1, Math.floor((Date.now() - EPOCH) / SEASON_MS) + 1);
  P.seasonStart = id => EPOCH + (id - 1) * SEASON_MS;
  P.seasonEndsIn = () => P.seasonStart(P.seasonId() + 1) - Date.now();
  P.fmtDays = ms => { const h = Math.max(0, Math.floor(ms / 36e5)); return h >= 48 ? `${Math.floor(h / 24)} days` : `${h} h`; };
  P.checkSeason = function () {
    const s = S(), cur = P.seasonId();
    if (!s.season.id) { s.season.id = cur; s.season.peak = s.ranked.rr; NA.Save.save(); return null; }
    if (s.season.id === cur) return null;
    const peak = P.rankOf(s.season.peak || 0);
    const reward = Math.round(500 * Math.pow(2.2, peak.idx));
    s.season.history.push({ id: s.season.id, peak: peak.name, idx: peak.idx });
    s.credits += reward;
    s.ranked.rr = Math.max(0, s.ranked.rr - 600);
    s.ranked.promo = false;
    s.season = { id: cur, peak: s.ranked.rr, history: s.season.history };
    NA.Save.save();
    NA.Chat.dm(`season ${cur} is live. you peaked ${peak.name} last season: ${U.fmt(reward)} reward. ranks dropped a bit, time to climb`);
    return { reward, peak };
  };

  // ---------------------------------------------------------------- Legend leaderboard (offline bots that keep climbing)
  function rng(seed) { let x = seed >>> 0; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; }; }
  P.leaderboard = function () {
    const sid = P.seasonId(), r = rng(9001 + sid * 31), hours = (Date.now() - P.seasonStart(sid)) / 36e5;
    const parts = [D.NAME_FIRST, D.NAME_WORD, D.NAME_ADJ];
    const rows = [];
    const used = new Set();
    for (let i = 0; i < 60; i++) {
      let n;
      do {
        const k = r();
        const a = parts[0][Math.floor(r() * parts[0].length)], b = parts[1][Math.floor(r() * parts[1].length)], c = parts[2][Math.floor(r() * parts[2].length)];
        n = k < 0.3 ? a + Math.floor(r() * 999) : k < 0.55 ? c + b : k < 0.75 ? `${a}_${b}` : k < 0.88 ? 'ttv_' + a + b : b[0].toUpperCase() + b.slice(1) + Math.floor(r() * 99);
      } while (used.has(n));
      used.add(n);
      const base = Math.pow(r(), 1.6) * 700, rate = 0.4 + r() * 3.2;
      rows.push({ name: n, trophies: Math.round(Math.min(2400, base + rate * hours)), me: false });
    }
    const me = P.myRank();
    if (me.idx === 9) rows.push({ name: S().username, trophies: me.trophies, me: true });
    rows.sort((a, b) => b.trophies - a.trophies);
    rows.forEach((x, i) => { x.pos = i + 1; });
    return rows;
  };

  // ---------------------------------------------------------------- prestige
  P.canPrestige = () => (S().winsByTier[D.MAX_PLAYABLE_TIER] || 0) >= D.TIERS[D.MAX_PLAYABLE_TIER - 1].winsToUnlock;
  P.prestige = function () {
    const s = S();
    if (!P.canPrestige()) return false;
    s.prestige = (s.prestige || 0) + 1;
    s.highestTier = 1; s.winsByTier = {}; s.flags.comingSoon = false;
    NA.Save.save();
    NA.Chat.dm(`prestige ${s.prestige}. back to tier 1, but every payout is +${20 * s.prestige}% now. the bots got the memo too`);
    return true;
  };
  P.payBoost = () => 1 + 0.2 * (S().prestige || 0);
  P.skillBoost = () => Math.min(0.1, 0.02 * (S().prestige || 0));

  // ---------------------------------------------------------------- daily challenges + login streak
  const POOL = [
    { id: 'win2', text: 'Win 2 matches', ev: 'win', goal: 2, pay: 1.5 },
    { id: 'kills25', text: 'Get 25 kills', ev: 'kill', goal: 25, pay: 1.2 },
    { id: 'hs10', text: 'Get 10 headshot kills', ev: 'headshot', goal: 10, pay: 1.2 },
    { id: 'rankedWin', text: 'Win a Ranked match', ev: 'rankedWin', goal: 1, pay: 2, req: () => NA.Ranked.unlocked() },
    { id: 'hardWin', text: 'Win on Hard or Nightmare', ev: 'hardWin', goal: 1, pay: 2 },
    { id: 'legitWin', text: 'Win a match with aimbot off', ev: 'noAimbotWin', goal: 1, pay: 1.5 },
    { id: 'wallbang3', text: 'Get 3 kills through walls', ev: 'wallbangKill', goal: 3, pay: 1.5, req: () => S().highestTier >= 5 },
    { id: 'reportBan', text: 'Get a cheater banned', ev: 'cheaterBanned', goal: 1, pay: 2.5 },
    { id: 'lootRush', text: 'Play a Loot Rush match', ev: 'lootRush', goal: 1, pay: 1, req: () => S().highestTier >= 3 },
    { id: 'legendary', text: 'Pick up a Legendary gun', ev: 'legendary', goal: 1, pay: 1.5, req: () => S().highestTier >= 3 },
    { id: 'lowSus', text: 'Win with suspicion under 50%', ev: 'lowSusWin', goal: 1, pay: 1.5 },
    { id: 'flawless', text: 'Win a match without dying', ev: 'flawless', goal: 1, pay: 2 },
    { id: 'clip', text: 'Post a clip in Comms', ev: 'clipPosted', goal: 1, pay: 1 },
  ];
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
  const hash = str => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  P.tierBase = () => { const t = D.TIERS[Math.min(S().highestTier, D.MAX_PLAYABLE_TIER) - 1]; return Math.max(60, t.base); };
  P.daily = function () {
    const s = S(), day = today();
    if (s.daily.day !== day) {
      const r = rng(hash(day + s.username));
      const pool = POOL.filter(c => !c.req || c.req());
      const pick = [];
      while (pick.length < 3 && pool.length) pick.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
      s.daily.day = day;
      s.daily.items = pick.map(c => ({ id: c.id, n: 0, done: false, reward: Math.round(c.pay * P.tierBase()) }));
      NA.Save.save();
    }
    return s.daily.items.map(it => Object.assign({}, POOL.find(c => c.id === it.id), it));
  };
  P.track = function (ev, n) {
    const s = S();
    if (!s.daily.items || s.daily.day !== today()) P.daily();
    let done = null;
    for (const it of s.daily.items) {
      const c = POOL.find(x => x.id === it.id);
      if (!c || c.ev !== ev || it.done) continue;
      it.n = Math.min(c.goal, it.n + (n || 1));
      if (it.n >= c.goal) {
        it.done = true;
        s.credits += it.reward; s.lifetimeCredits += it.reward;
        done = c.text;
        NA.UI.toast(`Daily done: ${c.text} (+${U.fmt(it.reward)})`);
      }
    }
    NA.Save.save();
    return done;
  };
  P.checkLogin = function () {
    const s = S(), day = today();
    if (s.daily.lastLogin === day) return null;
    const y = new Date(); y.setDate(y.getDate() - 1);
    const yesterday = `${y.getFullYear()}-${y.getMonth() + 1}-${y.getDate()}`;
    s.daily.streak = s.daily.lastLogin === yesterday ? (s.daily.streak || 0) + 1 : 1;
    s.daily.lastLogin = day;
    const reward = Math.round((1 + 0.25 * Math.min(7, s.daily.streak)) * P.tierBase() * 0.6);
    s.credits += reward; s.lifetimeCredits += reward;
    NA.Save.save();
    return { streak: s.daily.streak, reward };
  };

  // ---------------------------------------------------------------- gun mastery
  P.MASTERY = [[25, 'Bronze', '#b07a45'], [100, 'Silver', '#c8ced8'], [250, 'Gold', '#e8b923'], [500, 'Diamond', '#7dd3fc']];
  P.mastery = function (id) {
    const k = (S().mastery || {})[id] || 0;
    let lvl = 0;
    for (let i = 0; i < P.MASTERY.length; i++) if (k >= P.MASTERY[i][0]) lvl = i + 1;
    const next = P.MASTERY[lvl] ? P.MASTERY[lvl][0] : null;
    return { kills: k, lvl, name: lvl ? P.MASTERY[lvl - 1][1] : 'None', color: lvl ? P.MASTERY[lvl - 1][2] : null, next };
  };
  P.addMasteryKill = function (id) {
    const s = S();
    s.mastery = s.mastery || {};
    const before = P.mastery(id).lvl;
    s.mastery[id] = (s.mastery[id] || 0) + 1;
    const after = P.mastery(id);
    if (after.lvl > before) NA.UI.toast(`${D.WEAPONS[id].name} mastery: ${after.name} camo unlocked`);
  };

  // ---------------------------------------------------------------- the RANKS screen
  P.render = function () {
    const s = S(), $ = id => document.getElementById(id), esc = U.esc;
    P.checkSeason();
    const me = P.myRank(), rs = s.ranked;
    const pct = me.idx === 9 ? 100 : me.inDiv;
    const next = me.idx === 9 ? `${me.trophies} trophies` : rs.promo ? `PROMO MATCH next: win it to reach ${P.RANKS[me.idx + 1]}` : `${me.inDiv}/100 RP to ${me.div > 1 ? P.RANKS[me.idx] + ' ' + (me.div - 1) : 'promo'}`;
    $('rk-head').innerHTML = `
      <div class="rk-badge" style="--rc:${me.color}"><b>${me.short === 'Legend' ? '★' : me.div}</b><span>${esc(me.short.toUpperCase())}</span></div>
      <div class="rk-info">
        <div class="rk-name" style="color:${me.color}">${esc(me.name)}${s.prestige ? ` <span class="prest">P${s.prestige}</span>` : ''}</div>
        <div class="rk-bar"><i style="width:${pct}%;background:${me.color}"></i></div>
        <div class="muted small">${esc(next)} · Ranked RP ${rs.rr} · peak ${P.rankOf(rs.peakRR || 0).name}</div>
        <div class="muted small">Season ${P.seasonId()} · ends in ${P.fmtDays(P.seasonEndsIn())} · season peak ${P.rankOf(s.season.peak || 0).name}${s.season.history.length ? ' · past: ' + s.season.history.slice(-4).map(h => `S${h.id} ${h.peak}`).join(', ') : ''}</div>
      </div>`;
    const daily = P.daily();
    $('rk-daily').innerHTML = `<div class="sec-h">Daily challenges <span class="muted small">(new ones tomorrow · login streak ${s.daily.streak || 0} day${s.daily.streak === 1 ? '' : 's'})</span></div>` +
      daily.map(c => `<div class="dc ${c.done ? 'done' : ''}"><span>${c.done ? '✔' : '○'} ${esc(c.text)}</span><b>${c.n}/${c.goal}</b><em>${U.fmt(c.reward)}</em></div>`).join('');
    const can = P.canPrestige();
    $('rk-prestige').innerHTML = `<div class="sec-h">Prestige ${s.prestige ? `<span class="prest">P${s.prestige}</span>` : ''}</div>
      <div class="muted small">Beat the Megalobby (Tier 9), then reset your lobby tiers for a permanent +20% payout per prestige. Cheats, guns and credits stay. Bots get slightly smarter.</div>
      <button class="btn tiny ${can ? 'primary' : ''}" id="rk-prest-btn" ${can ? '' : 'disabled'}>${can ? `PRESTIGE ${(s.prestige || 0) + 1}` : 'Locked: clear Tier 9'}</button>`;
    const lb = P.leaderboard(), mine = lb.find(x => x.me);
    $('rk-board').innerHTML = `<div class="sec-h">Legend leaderboard · Season ${P.seasonId()}</div>
      <div class="muted small">${me.idx === 9 ? `You are #${mine.pos} with ${mine.trophies} trophies. The others keep climbing while you're away.` : 'Reach Legend in Ranked to get on the board. Trophies = RP above Legend.'}</div>
      <div class="lb">${lb.slice(0, 50).concat(mine && mine.pos > 50 ? [mine] : []).map(x => `<div class="lb-row ${x.me ? 'me' : ''}"><span>#${x.pos}</span><b>${esc(x.name)}</b><em>🏆 ${x.trophies}</em></div>`).join('')}</div>`;
  };

  NA.Prog = P;
})(window.NA);
