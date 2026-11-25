/* NO ANTICHEAT: "Comms", the fake community app. Post clips of suspected cheaters and let the
   server vote; get clipped yourself (notoriety); server chatter, announcements and config ads. */
(function (NA) {
  'use strict';
  const U = NA.U, D = NA.DATA;
  const CO = { channel: 'general' };
  const S = () => NA.Save.data;
  const $ = id => document.getElementById(id);
  const esc = s => U.esc(String(s));
  const CHANNELS = [
    ['announcements', 'Official news. Read-only.'],
    ['general', 'Talk about anything. Mostly cheaters.'],
    ['clips', 'Post clips of suspicious players. The server votes. Mods ban.'],
    ['config-market', 'Config makers advertise here. Buy at your own risk.'],
    ['ban-appeals', 'Got banned? Cry here.'],
  ];
  const GENERAL = [
    'anyone else lagging tonight', 'ranked is unplayable rn', 'who wants to duo', 'just hit {rank} lets gooo', 'warden banned my friend for NOTHING (he was cheating)',
    'is the auto sniper nerf ever coming', 'imagine buying a config lol', 'loot rush is so fun ngl', 'chaos ffa big heads is peak', 'how do i report someone',
    'devs pls fix the warehouse spawn', 'my k/d is 0.4 and i still have fun', 'got clipped yesterday and im not even cheating', 'is mom_plays_too a real person',
    'BOT_Kevin is getting good??', 'tournament quarterfinal was sweaty', 'whats the best gun for ranked', 'kodiak one tap is so satisfying', 'ban wave when',
    'there is no anticheat in casual. i checked', 'whoever made the Full Send config owes me an account', 'nightmare difficulty bots are cracked', 'season reset hurt',
  ];
  const ABOUT_YOU = ['anyone else get matched with {player}?? 💀', '{player} is either cracked or cracked if you know what i mean', 'i spectated {player}. say less',
    'is {player} a pro or', 'just lost to {player} again', 'someone clip {player} pls'];
  const APPEALS = ['i was banned for no reason (i was using aimbot)', 'my little brother did it', 'warden is broken i swear', 'appealed 3 times, denied 3 times',
    'got unbanned!! said it was lag', 'they said my excuse was "not credible". rude'];
  const C_HIGH = ['blatant', 'walls 100%', 'that flick is not human', 'ban', 'bro is not even trying to hide it', 'look at the crosshair through the wall', 'obvious'];
  const C_MID = ['hmm sus', 'could be legit, could be not', 'need more angles', 'closet for sure', 'idk the tracking is weird'];
  const C_LOW = ['thats just a good player', 'reported for skill lol', 'ratio', 'bro is mad he lost', 'skill issue (yours)', 'nothing here'];
  const C_ME = ['is that {player}??', 'same guy from yesterday', 'ban this man', 'clip of the year', '{player} explain', 'the way he pre-aims every corner'];

  function rng(seed) { let x = seed >>> 0; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; }; }
  const name = () => NA.Game.genName(new Set());
  const ago = t => { const s = Math.max(1, Math.round((Date.now() - t) / 1000)); return s < 60 ? `${s}s` : s < 3600 ? `${Math.round(s / 60)}m` : s < 86400 ? `${Math.round(s / 3600)}h` : `${Math.round(s / 86400)}d`; };
  const colorOf = n => { let h = 0; for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0; return `hsl(${h % 360},65%,55%)`; };

  function store() {
    const c = S().comms;
    c.msgs = c.msgs || {};
    for (const [id] of CHANNELS) c.msgs[id] = c.msgs[id] || [];
    c.posts = c.posts || [];
    return c;
  }
  function push(ch, msg, unread) {
    const c = store();
    c.msgs[ch].push(Object.assign({ t: Date.now() }, msg));
    if (c.msgs[ch].length > 40) c.msgs[ch].splice(0, c.msgs[ch].length - 40);
    if (unread) c.unread = (c.unread || 0) + 1;
  }
  CO.announce = (text, unread) => push('announcements', { by: 'FRAGLINE', text, staff: true }, unread !== false);

  // Fill channels with what "happened" since you last looked (real time).
  function catchUp() {
    const c = store(), now = Date.now(), s = S();
    const since = c.last ? Math.min(now - c.last, 6 * 36e5) : 36e5;
    const nGen = Math.min(10, Math.max(c.last ? 0 : 6, Math.floor(since / (4 * 60e3))));
    const deck = U.shuffle(GENERAL.slice());
    for (let i = 0; i < nGen; i++) {
      const youMention = c.notoriety > 40 && Math.random() < c.notoriety / 200;
      const line = (youMention ? U.pick(ABOUT_YOU) : deck[i % deck.length]).replace('{player}', s.username).replace('{rank}', U.pick(NA.Prog.RANKS.slice(2)));
      push('general', { by: name(), text: line, t: now - (nGen - i) * U.randInt(40, 240) * 1000 });
    }
    const nAds = Math.min(3, Math.max(c.last ? 0 : 2, Math.floor(since / (25 * 60e3))));
    for (let i = 0; i < nAds; i++) {
      const cfg = U.pick(NA.Cfg.CONFIGS);
      const ad = cfg.scam ? `🔥🔥 ${cfg.name} 🔥🔥 only ${U.fmt(cfg.price)}. DM me. 100% legit seller` : U.pick([`${cfg.name} is on the market. ${cfg.stars}★, ${cfg.dl} downloads`, `new update for ${cfg.name}: "${cfg.tag}"`, `${cfg.name} only ${U.fmt(cfg.price)} this week`]);
      push('config-market', { by: cfg.author, text: ad, shop: true, t: now - U.randInt(60, 3000) * 1000 });
    }
    if (Math.random() < Math.min(1, since / (60 * 60e3))) push('ban-appeals', { by: name(), text: U.pick(APPEALS), t: now - U.randInt(60, 1800) * 1000 });
    // announcements that follow the real game state
    const ac = NA.Ranked.version();
    if (c.lastAc !== ac) { if (c.lastAc) CO.announce(`Warden AC updated to v${ac}. Bypass makers have been notified (by themselves).`); c.lastAc = ac; }
    const sid = NA.Prog.seasonId();
    if (c.lastSeason !== sid) { CO.announce(`Season ${sid} is live. Ranks were adjusted. Good luck on the ladder.`, !!c.lastSeason); c.lastSeason = sid; }
    if (!c.patch04) { c.patch04 = true; CO.announce('v0.4 patch notes: blocky players, difficulty levels, Loot Rush, Chaos FFA, ranks Iron→Legend, cheater reports, the Advanced tab, Config Market and this app. Casual still has no anticheat.'); }
    const cw = NA.Events.chaosWindow();
    const key = cw.live ? 'chaos-' + new Date().toDateString() + cw.label : null;
    if (key && c.lastChaos !== key) { c.lastChaos = key; CO.announce(`🎉 Chaos FFA is LIVE (${cw.label}). Big heads, moon gravity, aimbot for all.`); }
    if (Math.random() < Math.min(0.5, since / (3 * 36e5))) CO.announce(`Ban wave complete: ${U.num(U.randInt(1200, 9800))} accounts banned in Ranked. Casual: still 0.`, false);
    c.last = now;
    resolvePosts();
    decayNotoriety();
    NA.Save.save();
  }

  // ---------------------------------------------------------------- clips + votes
  function makePost(target, level, mine, title) {
    const pct = mine ? (level >= 5 ? U.rand(0.82, 0.96) : level >= 3 ? U.rand(0.62, 0.82) : level >= 1 ? U.rand(0.4, 0.66) : U.rand(0.08, 0.32)) : level;
    const pool = pct >= 0.7 ? C_HIGH : pct >= 0.45 ? C_MID : C_LOW;
    const comments = [];
    for (let i = 0; i < U.randInt(2, 4); i++) comments.push({ by: name(), text: U.pick(mine ? pool : C_ME.concat(pool)).replace('{player}', S().username) });
    return { id: Date.now() + '' + U.randInt(100, 999), target, level, mine, title, created: Date.now(), dur: U.randInt(40, 75) * 1000, total: U.randInt(18, 70), pct, resolved: false, verdict: null, comments, defended: false };
  }
  CO.votes = p => { const f = Math.min(1, (Date.now() - p.created) / p.dur); const v = Math.round(p.total * f); return { v, yes: Math.round(v * p.pct), f }; };
  CO.post = function (clipId) {
    const s = S(), c = store(), clip = s.clips.find(x => x.id === clipId);
    if (!clip || clip.posted) return false;
    clip.posted = true;
    c.posts.unshift(makePost(clip.name, clip.level, true, `${clip.name} in ${clip.where} (${clip.kills}/${clip.deaths}). cheating or nah?`));
    c.posts = c.posts.slice(0, 25);
    NA.Prog.track('clipPosted');
    NA.Save.save();
    return true;
  };
  CO.defend = function (postId) {
    const p = store().posts.find(x => x.id === postId);
    if (!p || p.mine || p.defended || p.resolved) return null;
    p.defended = true;
    const line = U.pick(["it's a gaming chair", 'i just have good game sense', 'i was lagging, that clip is fake', 'check my hours bro', 'ok and?']);
    p.comments.push({ by: S().username, text: line, me: true });
    p.pct = U.clamp(p.pct + U.rand(-0.18, 0.1), 0.05, 0.99);
    p.comments.push({ by: name(), text: U.pick(['"gaming chair" lmao', 'thats what a cheater would say', 'ok fair', 'ratio', 'nobody asked']) });
    NA.Save.save();
    return line;
  };
  function resolvePosts() {
    const s = S(), c = store();
    for (const p of c.posts) {
      if (p.resolved || Date.now() - p.created < p.dur) continue;
      p.resolved = true;
      if (p.mine) {
        if (p.level >= 1 && p.pct >= 0.7) {
          const reward = Math.round(NA.Prog.tierBase() * (1 + p.level * 0.4));
          s.credits += reward; c.rep = (c.rep || 0) + 3; s.reports.banned++;
          p.verdict = `BANNED by moderators · +${U.fmt(reward)} bounty`;
          NA.Prog.track('cheaterBanned');
          NA.Game.achieve('jury', 'Court of Public Opinion');
        } else if (p.level === 0 && p.pct < 0.4) { c.rep = (c.rep || 0) - 2; p.verdict = 'Community says legit. You got ratio\'d.'; }
        else p.verdict = 'Inconclusive. Mods "will look into it".';
      } else {
        if (p.pct >= 0.75) { c.notoriety = Math.min(100, (c.notoriety || 0) + p.boost); c.notorietyAt = Date.now(); p.verdict = `TRENDING. Notoriety +${p.boost}`; }
        else p.verdict = 'Fizzled out. Nobody cared.';
      }
      c.unread = (c.unread || 0) + 1;
    }
  }
  function decayNotoriety() {
    const c = store();
    if (!c.notoriety) return;
    const h = (Date.now() - (c.notorietyAt || Date.now())) / 36e5;
    if (h > 0.1) { c.notoriety = Math.max(0, Math.round(c.notoriety - h * 8)); c.notorietyAt = Date.now(); }
  }
  CO.notoriety = () => { decayNotoriety(); return store().notoriety || 0; };
  // After a match where you were obvious, someone may clip you.
  CO.afterMatch = function (mt) {
    if (!mt || mt.tier.chaos || mt.susPeak < 60 || Math.random() > 0.5) return;
    const c = store(), s = S();
    const b = U.pick(G0().bots.filter(x => G0().isEnemy(G0().player, x))) || { name: name() };
    const pct = U.clamp(0.55 + (mt.susPeak - 60) / 90 + U.rand(-0.1, 0.1), 0.2, 0.98);
    const p = makePost(s.username, pct, false, U.pick([`${s.username} aimbot compilation`, `is this legit?? (${s.username})`, `${s.username} pre-aims EVERY corner`, `reporting ${s.username}, look at this`]));
    p.by = b.name;
    p.boost = Math.round(12 + (mt.susPeak - 60) / 2.5);
    c.posts.unshift(p);
    c.posts = c.posts.slice(0, 25);
    c.unread = (c.unread || 0) + 1;
    NA.Save.save();
  };
  const G0 = () => NA.Game;

  // ---------------------------------------------------------------- UI
  CO.badge = function () {
    const c = store(), el = $('comms-badge');
    resolvePosts();
    if (el) el.classList.toggle('hidden', !(c.unread > 0) && !S().clips.some(x => !x.posted));
  };
  CO.open = function () {
    catchUp();
    store().unread = 0;
    NA.Save.save();
    CO.jump = true;
    CO.render();
    NA.UI.show('scr-comms');
    clearInterval(CO.timer);
    CO.timer = setInterval(() => { if (NA.UI.current !== 'scr-comms') { clearInterval(CO.timer); return; } resolvePosts(); if (CO.channel === 'clips') CO.render(); }, 1000);
  };
  function msgHtml(m) {
    const n = m.by;
    return `<div class="co-msg"><i class="av" style="background:${m.staff ? '#f59e0b' : colorOf(n)}">${esc(n[0].toUpperCase())}</i><div><div class="co-mh"><b ${m.staff ? 'class="staff"' : ''}>${esc(n)}</b>${m.staff ? '<span class="tag">STAFF</span>' : ''}<span>${ago(m.t)}</span></div><div class="co-mt">${esc(m.text)}${m.shop ? ' <button class="btn tiny" data-co-shop="1">OPEN SHOP</button>' : ''}</div></div></div>`;
  }
  function postHtml(p) {
    const v = CO.votes(p), yesPct = v.v ? Math.round(100 * v.yes / v.v) : 0;
    const head = p.mine ? `<b>${esc(S().username)}</b> posted a clip` : `<b>${esc(p.by)}</b> posted a clip <span class="aboutyou">about you</span>`;
    return `<div class="co-post ${p.mine ? '' : 'you'}">
      <div class="co-mh">${head}<span>${ago(p.created)}</span></div>
      <div class="co-clip"><span class="play">▶</span><div><b>${esc(p.title)}</b><div class="muted small">clip · ${p.mine ? esc(p.target) : esc(S().username)} · 0:${String(U.randInt(12, 49)).padStart(2, '0')}</div></div></div>
      <div class="co-vote"><div class="vb"><i style="width:${yesPct}%"></i></div><span>${v.yes} say cheating · ${v.v - v.yes} say legit${p.resolved ? '' : ` · voting… ${Math.round(v.f * 100)}%`}</span></div>
      ${p.verdict ? `<div class="co-verdict ${/BANNED|TRENDING/.test(p.verdict) ? 'hot' : ''}">${esc(p.verdict)}</div>` : ''}
      <div class="co-comments">${p.comments.slice(0, Math.max(1, Math.ceil(p.comments.length * Math.max(v.f, 0.3)))).map(c => `<div><b ${c.me ? 'class="me"' : ''}>${esc(c.by)}</b> ${esc(c.text)}</div>`).join('')}</div>
      ${!p.mine && !p.defended && !p.resolved ? `<button class="btn tiny" data-co-defend="${p.id}">DEFEND YOURSELF</button>` : ''}
    </div>`;
  }
  CO.render = function () {
    const c = store(), s = S();
    $('co-online').textContent = `· ${U.num(1100 + (Math.floor(Date.now() / 6e4) * 37) % 900)} online`;
    $('co-channels').innerHTML = CHANNELS.map(([id]) => {
      const n = id === 'clips' ? s.clips.filter(x => !x.posted).length + c.posts.filter(p => !p.mine && !p.resolved).length : 0;
      return `<button class="co-ch ${CO.channel === id ? 'on' : ''}" data-co-ch="${id}"># ${id}${n ? `<i>${n}</i>` : ''}</button>`;
    }).join('');
    const noto = CO.notoriety();
    $('co-me').innerHTML = `<b>@${esc(s.username)}</b><div class="muted small">rep ${c.rep || 0} · notoriety ${noto}%</div>${noto >= 30 ? '<div class="muted small warn">people know your name. lobbies start more suspicious</div>' : ''}`;
    const ch = CHANNELS.find(x => x[0] === CO.channel);
    $('co-top').innerHTML = `<b># ${ch[0]}</b><span class="muted small">${esc(ch[1])}</span>`;
    let html = '';
    if (CO.channel === 'clips') {
      const drafts = s.clips.filter(x => !x.posted);
      html += `<div class="co-drafts"><div class="sec-h">Your saved clips</div>${drafts.length ? drafts.map(d => `<div class="co-draft"><span>🎬 <b>${esc(d.name)}</b> · ${esc(d.where)} · ${ago(d.at)} ago</span><button class="btn tiny primary" data-co-post="${d.id}">POST</button></div>`).join('') : '<div class="muted small">No clips yet. In a match: pause → CLIP a player, or tap CLIP IT when someone kills you.</div>'}</div>`;
      html += c.posts.length ? c.posts.map(postHtml).join('') : '<div class="muted small">No posts yet.</div>';
    } else {
      const list = c.msgs[CO.channel] || [];
      html = list.length ? list.slice().sort((a, b) => a.t - b.t).map(msgHtml).join('') : '<div class="muted small">Nothing here yet.</div>';
    }
    const box = $('co-msgs');
    const atBottom = box.scrollTop + box.clientHeight >= box.scrollHeight - 30;
    box.innerHTML = html;
    if (CO.channel !== 'clips' && (atBottom || CO.jump)) box.scrollTop = box.scrollHeight;
    CO.jump = false;
  };
  CO.init = function () {
    $('co-channels').addEventListener('click', e => { const b = e.target.closest('[data-co-ch]'); if (!b) return; NA.Audio.click(); CO.channel = b.dataset.coCh; CO.jump = true; CO.render(); $('co-msgs').scrollTop = CO.channel === 'clips' ? 0 : $('co-msgs').scrollHeight; });
    $('co-msgs').addEventListener('click', e => {
      const p = e.target.closest('[data-co-post]'), d = e.target.closest('[data-co-defend]'), sh = e.target.closest('[data-co-shop]');
      if (p) { if (CO.post(p.dataset.coPost)) { NA.Audio.buy(); NA.UI.toast('Clip posted. The server is voting…'); } CO.render(); }
      if (d) { const line = CO.defend(d.dataset.coDefend); if (line) NA.UI.toast(`You: "${line}"`); CO.render(); }
      if (sh) NA.UI.showShop('scr-comms');
    });
  };

  NA.Comms = CO;
})(window.NA);
