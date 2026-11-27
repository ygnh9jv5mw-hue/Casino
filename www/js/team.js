/* NO ANTICHEAT: teammates for 5v5 Payload. Hire players off the market with cheat credits (sports-style
   cards: overall, aim, game sense, clutch) or play with random fills. Good teammates cost money you
   could have spent on cheats. Teammates with good game sense notice when you cheat and report you.
   Some players on the market are secretly cheating: the clues go from obvious to invisible, and if
   Warden catches a cheater on your team in Competitive, your account goes down with theirs. */
(function (NA) {
  'use strict';
  const U = NA.U, D = NA.DATA, A = NA.Audio, C = NA.Chat;
  const T = NA.Team = {};
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const SLOT_MS = 8 * 60 * 1000, MARKET = 8, CONTRACT = 3, ROSTER = 4;
  const ROLE = { rusher: 'Entry', camper: 'Anchor', sniper: 'Sniper', flex: 'Flex' };
  T.ROLE = ROLE;

  const S = () => {
    const s = NA.Save.data;
    if (!s.team) s.team = { roster: [], hired: [], slot: 0, history: { hired: 0, reported: 0, banned: 0 } };
    return s.team;
  };
  T.roster = () => S().roster.slice(0, ROSTER);
  const slot = () => Math.floor(Date.now() / SLOT_MS);
  T.refreshIn = () => SLOT_MS - (Date.now() % SLOT_MS);

  // seeded random so the market is the same for the whole slot
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const NAMES_LEGIT = ['clutchmaster', 'quiet_ana', 'deadeye.sam', 'mid_rotation', 'tactical_tom', 'nora.flicks', 'igl_daddy', 'calmcomms', 'smoke_lineup', 'sova_main_btw', 'prefire_pete', 'jettson', 'econ_round', 'trade_me_pls', 'lurk_lord', 'anchor_ava', 'sage.wall', 'flank_frank', 'ranked_rhea', 'post_plant', 'zero_tilt', 'ecoking', 'held_angle', 'off_angle_olly', 'retake_rosa', 'utility_ugo'];
  const NAMES_OBVIOUS = ['xX_HeadOnly_Xx', 'aimgod_9000', 'n0_r3c0il', 'wallz4days', 'hackerman_lol', 'Ez_1Tap_Ez', 'lockon_larry', 'triggerhappy99', 'spinbot_steve', 'FreeAim2026'];
  const NAMES_SUS = ['night_owl_aim', 'newpc_who_dis', 'smurf_alt_7', 'returning_player', 'n1ghtshift', 'privacy_mode'];
  const REV_GOOD = ['comms are actually useful', 'held B alone for 3 rounds', 'trades every fight', 'great igl, calm voice', 'never baits', 'clutched a 1v3 for us', 'solid, shows up on time'];
  const REV_MEH = ['decent aim, no comms', 'kind of baits', 'tilted after one bad round', 'fine i guess', 'buys every round even when we eco'];
  const REV_SUS = ['how did he know i was there', 'tracks through smokes??', 'prefired every corner', 'hits shots he cant see', 'weird crosshair placement, always on heads', 'never checks corners, always right'];

  function makeCard(r, k, ht) {
    const s = NA.Save.data;
    const pick = arr => arr[Math.floor(r() * arr.length)];
    const between = (a, b) => Math.round(a + (b - a) * r());
    const baseT = D.TIERS.find(t => t.id === Math.max(2, Math.min(9, ht)));
    const roll = r();
    const cheat = roll < 0.27 ? (r() < 0.4 ? 'obvious' : r() < 0.58 ? 'sus' : 'hidden') : null;
    let aim, sense, clutch, age, hs, kd, name;
    const lvl = 0.35 + ht * 0.04; // better players show up as you climb
    if (cheat === 'obvious') {
      aim = between(95, 99); sense = between(32, 52); clutch = between(55, 80); age = between(1, 6); hs = between(76, 94); kd = +(4.5 + r() * 4.5).toFixed(1); name = pick(NAMES_OBVIOUS);
    } else if (cheat === 'sus') {
      aim = between(86, 93); sense = between(48, 64); clutch = between(60, 82); age = between(9, 40); hs = between(54, 69); kd = +(2.4 + r() * 1.2).toFixed(1); name = pick(NAMES_SUS.concat(NAMES_LEGIT));
    } else {
      const o = Math.round(50 + 45 * Math.min(1, lvl * r() + r() * 0.35));
      aim = U.clamp(o + between(-12, 12), 35, 97); sense = U.clamp(o + between(-12, 12), 35, 98); clutch = U.clamp(o + between(-15, 15), 30, 98);
      age = between(120, 2200); hs = between(14, 36); kd = +(0.7 + (aim - 40) / 40 + r() * 0.4).toFixed(1); name = pick(NAMES_LEGIT);
      if (cheat === 'hidden') { aim = Math.min(94, aim + between(2, 6)); hs = between(28, 41); }
    }
    if (r() < 0.5) name += Math.floor(r() * 99);
    const ovr = Math.round(aim * 0.45 + sense * 0.35 + clutch * 0.2);
    // price follows what they look like, and the obvious ones undercut it ("too good to be true")
    const looks = cheat === 'obvious' ? Math.max(60, ovr - 12) : ovr;
    const price = Math.max(40, Math.round(baseT.base * (0.15 + 2.2 * Math.pow(Math.max(0, looks - 45) / 50, 2)) / 10) * 10);
    const pers = cheat === 'obvious' ? 'rusher' : pick(['rusher', 'camper', 'sniper', 'flex', 'flex']);
    const main = pick(NA.Agents.LIST).id;
    const notes = [];
    if (cheat === 'obvious') notes.push(pick(['Profile: private', 'Stream: "no cam today"', 'Bio: "not cheating, just good"', 'Says he is "built different"']));
    if (cheat === 'sus') notes.push(pick(['Only plays at 3am', 'Match history hidden', 'Just bought a "new PC"', 'Came back after a long break']));
    if (cheat === 'hidden' && r() < 0.35) notes.push(pick(['Changed name recently', 'Steady improver']));
    if (!cheat && ovr >= 86 && age > 600) notes.push('Verified competitive player');
    if (!cheat && r() < 0.25) notes.push(pick(['Has a mic', 'Calls rotations', 'Plays most evenings', 'Coaches on weekends']));
    const revPool = cheat === 'obvious' ? REV_SUS : cheat === 'sus' ? REV_SUS.concat(REV_MEH, REV_GOOD) : REV_GOOD.concat(REV_MEH);
    const reviews = [];
    for (let i = 0; i < 2; i++) { const t = pick(revPool); if (reviews.indexOf(t) < 0) reviews.push(t); }
    return { id: 'c' + slot() + '_' + k, name, ovr, aim, sense, clutch, age, hs, kd, price, pers, main, cheat, notes, reviews, contract: CONTRACT };
  }
  T.market = function () {
    const st = S(), sl = slot(), ht = Math.max(2, Math.min(9, NA.Save.data.highestTier));
    if (st.slot !== sl) { st.slot = sl; st.hired = []; }
    const r = rng(sl * 7919 + ht * 131 + (NA.Save.data.createdAt || 0) % 9973);
    const out = [];
    for (let k = 0; k < MARKET; k++) out.push(makeCard(r, k, ht));
    const taken = new Set(st.hired.concat(st.roster.map(c => c.id)));
    return out.filter(c => !taken.has(c.id));
  };
  T.hire = function (id) {
    const st = S(), s = NA.Save.data, c = T.market().find(x => x.id === id);
    if (!c) return { ok: false, msg: 'Already gone' };
    if (st.roster.length >= ROSTER) return { ok: false, msg: 'Your team is full: release someone first' };
    if (s.credits < c.price) return { ok: false, msg: 'Not enough credits' };
    s.credits -= c.price;
    st.roster.push(c); st.hired.push(c.id); st.history.hired++;
    NA.Save.save();
    return { ok: true, card: c };
  };
  T.release = function (id) {
    const st = S(), i = st.roster.findIndex(c => c.id === id);
    if (i < 0) return false;
    st.roster.splice(i, 1);
    NA.Save.save();
    return true;
  };

  // ---------------------------------------------------------------- in the match
  // Puts the hired players on your team (by name, stats, role and agent), fills the rest.
  T.apply = function (bots, tier) {
    const roster = T.roster(), used = G().match ? G().match.used : new Set();
    bots.forEach((b, i) => {
      const c = roster[i];
      if (c) {
        b.name = c.name; used.add(c.name);
        b.card = c;
        b.skill = U.clamp(0.2 + c.aim / 100 * 0.75 + G().match0.diff.skill * 0.5, 0.05, 0.97);
        b.react = tier.bot.react * (1.25 - c.aim / 100 * 0.5);
        b.sense = c.sense; b.clutch = c.clutch; b.pers = c.pers; b.agent = c.main; b.baseSkill = b.skill;
        if (c.cheat) {
          const lv = c.cheat === 'obvious' ? 8 + Math.floor(Math.random() * 3) : c.cheat === 'sus' ? 4 + Math.floor(Math.random() * 3) : 2 + Math.floor(Math.random() * 2);
          b.cheat = { max: lv, cur: lv, switcher: false, rageAt: 1e9, deathRun: 0, gone: false, teammate: true };
        }
      } else {
        b.sense = U.clamp(Math.round(40 + Math.random() * 40 + tier.id * 2), 35, 95);
        b.clutch = Math.round(40 + Math.random() * 45);
      }
      b.noticed = 0; b.reportedYou = false;
    });
  };
  const G = () => NA.Game;
  let tickT = 0, wardenT = 0;
  T.reset = () => { tickT = 3; wardenT = 0; T.reports = 0; };
  // runs during Payload rounds: teammates watch you; Warden watches your cheating teammates
  T.tick = function (dt, live) {
    const g = G(), mt = g.match, p = g.player;
    if (!mt || !live) return;
    // clutch: the last one standing on a team plays up (or down) to their clutch rating
    for (const team of ['A', 'B']) {
      const al = g.entities().filter(e => e.alive && e.team === team);
      for (const b of g.bots) if (b.team === team && b.clutch) {
        if (b.baseSkill === undefined) b.baseSkill = b.skill;
        b.skill = al.length === 1 && al[0] === b ? U.clamp(b.baseSkill + (b.clutch - 60) / 250, 0.05, 0.98) : b.baseSkill;
      }
    }
    tickT -= dt;
    if (tickT <= 0) {
      tickT = 5;
      const band = mt.sus;
      for (const b of g.bots) {
        if (b.team !== p.team || b.reportedYou || b.cheat) continue;
        const watching = b.alive ? 1 : 1.6; // dead teammates spectate you
        const ch = U.clamp((b.sense - 45) / 55, 0, 1) * U.clamp((band - 35) / 65, 0, 1) * 0.32 * watching;
        if (Math.random() >= ch) continue;
        b.noticed++;
        if (b.noticed === 1) C.post(b.name, U.pick(['bro are you walling?', 'how did you know he was there', 'ok thats suspicious', 'you tracked him through the smoke??', 'turn it down a bit maybe', 'thats the third prefire this round']), 'team', { delay: 300 });
        else { b.reportedYou = true; teammateReport(b); }
      }
    }
    // Warden checks your team too (Competitive only): a cheater teammate takes you down with them
    if (g.ranked) {
      wardenT += dt;
      if (wardenT >= 10) {
        wardenT = 0;
        for (const b of g.bots) {
          if (b.team !== p.team || !b.cheat || b.cheat.gone || !b.card) continue;
          const c = b.card.cheat, ch = c === 'obvious' ? 0.05 : c === 'sus' ? 0.018 : 0.005;
          if (Math.random() < ch) { caught(b); break; }
        }
      }
    }
  };
  function teammateReport(b) {
    const g = G(), mt = g.match;
    T.reports = (T.reports || 0) + 1;
    S().history.reported++;
    C.post(b.name, U.pick(['reported. not playing with a cheater', 'reporting you after this', 'enjoy the ban', 'yeah im reporting that', 'gg cheater, report sent']), 'team', { delay: 200 });
    if (g.ranked) {
      g.addDet(8 + b.sense * 0.08);
      C.system(`A teammate reported you. ${D.RANKED.ac} is taking a closer look.`, { priority: true });
    } else {
      g.addSus(8);
      C.system('A teammate reported you. (No anticheat here, but your team is not happy.)', { priority: true });
      // three reports from your own team: they vote you out
      if (T.reports >= 3 && g.state === 'playing') {
        C.system('Your team voted to kick you: 3 yes / 0 no', { priority: true });
        setTimeout(() => { if (g.state === 'playing') g.hooks.endMatch(false, 'vote'); }, 900);
      }
    }
    NA.UI.centerMsg(`${b.name} reported you`, 1800);
  }
  function caught(b) {
    const g = G(), mt = g.match, st = S();
    b.cheat.gone = true;
    st.history.banned++;
    const i = st.roster.findIndex(c => c.id === b.card.id);
    if (i >= 0) st.roster.splice(i, 1);
    NA.Save.save();
    C.system(`${b.name} was banned by ${D.RANKED.ac}. Linked accounts are under review.`, { priority: true });
    NA.Ban.banner(b.name, 'teammate');
    // you queued with them: Warden closes your account too
    setTimeout(() => {
      if (g.state !== 'playing') return;
      NA.Ranked.ban(`Queued with a banned cheater (${b.name}). Linked account closed by ${D.RANKED.ac}`, Math.max(mt.detPeak || 0, 100), false);
      NA.Ban.flash();
      g.hooks.endMatch(false, 'ban');
    }, 2200);
  }
  T.dev = { caught: b => caught(b), report: b => { b.reportedYou = true; teammateReport(b); } };
  // after a Payload match: contracts run down, people who reported you leave
  T.afterMatch = function () {
    const st = S(), g = G(), lines = [];
    for (const b of g.bots) {
      if (!b.card) continue;
      const c = st.roster.find(x => x.id === b.card.id);
      if (!c) continue;
      if (b.reportedYou) { st.roster.splice(st.roster.indexOf(c), 1); lines.push(`${c.name} ended their contract: "not playing with a cheater"`); continue; }
      c.contract--;
      if (c.contract <= 0) { st.roster.splice(st.roster.indexOf(c), 1); lines.push(`${c.name}'s contract is up`); }
    }
    NA.Save.save();
    lines.forEach((l, i) => C.system(l, { delay: 600 + i * 400 }));
    return lines;
  };

  // ---------------------------------------------------------------- screen
  const bar = (v, col) => `<i class="tc-bar"><u style="width:${v}%;background:${col}"></u></i>`;
  const ovrColor = o => (o >= 90 ? '#facc15' : o >= 80 ? '#4ade80' : o >= 70 ? '#38bdf8' : '#94a3b8');
  function card(c, mine) {
    const a = NA.Agents.BY[c.main];
    const stat = (k, v) => `<div class="tc-st"><span>${k}</span><b>${v}</b>${bar(v, v >= 90 ? '#facc15' : v >= 75 ? '#4ade80' : v >= 60 ? '#38bdf8' : '#64748b')}</div>`;
    const ageTxt = c.age < 30 ? `${c.age} day${c.age === 1 ? '' : 's'}` : c.age < 365 ? `${Math.round(c.age / 30)} months` : `${(c.age / 365).toFixed(1)} years`;
    return `<div class="tcard${mine ? ' mine' : ''}" style="--oc:${ovrColor(c.ovr)}">
      <div class="tc-top"><div class="tc-ovr"><b>${c.ovr}</b><span>OVR</span></div><div class="tc-id"><b>${esc(c.name)}</b><span>${ROLE[c.pers]} · ${NA.PUI.face(a, 'sm')} ${esc(a.name)}</span></div></div>
      <div class="tc-stats">${stat('AIM', c.aim)}${stat('SENSE', c.sense)}${stat('CLUTCH', c.clutch)}</div>
      <div class="tc-facts"><span>Account ${ageTxt}</span><span>HS ${c.hs}%</span><span>K/D ${c.kd}</span></div>
      ${c.notes.length ? `<div class="tc-notes">${c.notes.map(n => `<span>${esc(n)}</span>`).join('')}</div>` : ''}
      <div class="tc-rev">${c.reviews.map(r => `<span>"${esc(r)}"</span>`).join('')}</div>
      <div class="tc-foot">${mine ? `<span class="tc-ct">${c.contract} match${c.contract === 1 ? '' : 'es'} left</span><button class="btn tiny" data-trel="${c.id}">RELEASE</button>`
        : `<span class="tc-price">${U.fmt(c.price)}<small> / ${CONTRACT} matches</small></span><button class="btn tiny primary" data-thire="${c.id}">HIRE</button>`}</div></div>`;
  }
  T.summary = function () {
    const r = T.roster();
    return `<div class="tier pl-team" data-tteam="1"><div class="tnum">YOUR TEAM</div><div class="tname">${r.length ? `${r.length}/4 hired` : 'Random fills'}</div>
      <div class="pt-list">${[0, 1, 2, 3].map(i => r[i] ? `<div class="pt-row" style="--oc:${ovrColor(r[i].ovr)}"><b>${r[i].ovr}</b><span>${esc(r[i].name)}</span><i>${r[i].contract}</i></div>` : '<div class="pt-row fill"><b>—</b><span>Fill (random)</span></div>').join('')}</div>
      <div class="tprog">Tap to scout players</div></div>`;
  };
  T.show = function (from) {
    T.from = from || 'scr-play';
    T.render();
    NA.UI.show('scr-team');
  };
  T.render = function () {
    const st = S(), m = T.market(), s = NA.Save.data;
    $('team-credits').textContent = U.fmt(s.credits);
    const left = Math.ceil(T.refreshIn() / 60000);
    $('team-roster').innerHTML = `<h4>YOUR TEAM <small>${st.roster.length}/4 · empty slots are random fills</small></h4>` +
      (st.roster.length ? st.roster.map(c => card(c, true)).join('') : '<div class="muted small tm-empty">Nobody hired yet. You play with random fills: free, average, and they still report you.</div>');
    $('team-market').innerHTML = `<h4>PLAYERS LOOKING FOR A TEAM <small>new players in ${left} min · contracts are ${CONTRACT} matches</small></h4><div class="tm-grid">${m.map(c => card(c, false)).join('') || '<div class="muted small">Everyone got hired. Check back soon.</div>'}</div>`;
  };
  T.bind = function () {
    $('scr-team').addEventListener('click', e => {
      const h = e.target.closest('[data-thire]'), r = e.target.closest('[data-trel]');
      if (h) {
        const res = T.hire(h.dataset.thire);
        if (res.ok) { A.buy(); NA.UI.toast(`${res.card.name} joined your team`); } else { A.deny(); NA.UI.toast(res.msg); }
        T.render(); return;
      }
      if (r) { A.click(); T.release(r.dataset.trel); T.render(); }
    });
    $('team-back').addEventListener('click', () => { A.click(); NA.UI.showPlay(); });
    setInterval(() => { if (NA.UI.current === 'scr-team') { const el = $('team-market'); if (el) { const sm = el.querySelector('h4 small'); if (sm) sm.textContent = `new players in ${Math.ceil(T.refreshIn() / 60000)} min · contracts are ${CONTRACT} matches`; } } }, 15000);
  };
})(window.NA);
