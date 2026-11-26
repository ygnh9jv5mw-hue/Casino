/* NO ANTICHEAT: screens, HUD, overlay drawing (crosshair, ESP), shop, cheat menu and input. */
(function (NA) {
  'use strict';
  const U = NA.U, D = NA.DATA, A = NA.Audio, C = NA.Chat;
  const $ = id => document.getElementById(id);
  const esc = U.esc;
  const SCREENS = ['scr-title', 'scr-name', 'scr-menu', 'scr-items', 'scr-play', 'scr-lobby', 'scr-results', 'scr-shop', 'scr-profile', 'scr-settings', 'scr-pause', 'scr-ranks', 'scr-comms'];
  const UI = { current: 'scr-title', hurtA: 0, hurtAng: null, hitT: -9, hitHead: false, keys: {}, cheatOpen: false, chatOpen: false, autoTimer: null };
  let G = null;
  const tv1 = new THREE.Vector3(), tv2 = new THREE.Vector3(), pv = new THREE.Vector3();

  // ---------------------------------------------------------------- screens
  UI.show = function (id) {
    for (const s of SCREENS) $(s).classList.toggle('hidden', s !== id);
    $('hud').classList.toggle('hidden', id !== 'hud');
    UI.current = id;
    document.body.dataset.screen = id;
    const chat = $('chat');
    if (id === 'scr-results') $('res-chat').appendChild(chat);
    else if (chat.parentNode !== document.body) document.body.appendChild(chat);
    if (id !== 'hud') {
      UI.closeCheatMenu(); UI.closeChat();
      if (UI.resetTouch) UI.resetTouch();
      if (document.pointerLockElement) document.exitPointerLock();
    }
    if (id !== 'scr-results') UI.stopAuto();
  };
  function rankLabel() {
    const s = NA.Save.data;
    if (NA.Ranked.unlocked() && s.ranked.matches) return NA.Prog.myRank().name + (s.prestige ? ` · P${s.prestige}` : '');
    const t = D.TIERS.find(x => x.id === s.highestTier);
    return (t ? t.rank + ' lobby' : 'Iron lobby') + (s.prestige ? ` · P${s.prestige}` : '');
  }
  UI.showMenu = function () {
    const s = NA.Save.data;
    if (G.state === 'results') G.toIdle();
    const P = NA.Prog;
    const season = P.checkSeason();
    if (season) UI.toast(`Season ${P.seasonId()} started: +${U.fmt(season.reward)} for your peak rank`);
    const login = P.checkLogin();
    if (login) UI.toast(`Daily login (day ${login.streak}): +${U.fmt(login.reward)}`);
    G.resolveReports();
    const daily = P.daily();
    $('m-ranks-sub').textContent = `${NA.Prog.myRank().name} · dailies ${daily.filter(c => c.done).length}/${daily.length}`;
    $('ranks-badge').classList.toggle('hidden', daily.every(c => c.done));
    if (NA.Comms) NA.Comms.badge();
    $('menu-user').textContent = s.username;
    $('menu-rank').textContent = rankLabel();
    $('menu-credits').textContent = U.fmt(s.credits);
    const top = D.TIERS.find(t => t.id === Math.min(s.highestTier, D.MAX_PLAYABLE_TIER)) || D.TIERS[0];
    $('m-play-sub').textContent = `Tier ${top.id}: ${top.name}`;
    $('menu-ticker').textContent = `Reports against you: ${U.num(s.stats.reports)}  ·  Action taken: 0  ·  Anticheat: Coming Soon™ (posted ${U.num(NA.Save.anticheatDays())} days ago)`;
    UI.refreshDMBadge();
    const CSm = NA.Cosmetics, today = new Date().toDateString();
    $('menu-user2').textContent = s.username;
    $('menu-outfit').textContent = CSm.get('outfit', CSm.equipped('outfit')).name;
    $('items-badge').classList.toggle('hidden', s.cosmetics.shopSeen === today);
    const left = CSm.featured().resetsIn;
    $('m-items-sub').textContent = `new items in ${Math.floor(left / 3600000)}h ${Math.floor(left / 60000) % 60}m`;
    const owned = (s.cosmetics.owned || []).filter(x => /^(outfit|gunskin|knife|killfx):/.test(x)).length;
    $('m-locker-sub').textContent = `${owned + 4} items`;
    const fromElsewhere = UI.current !== 'scr-menu';
    UI.show('scr-menu');
    if (fromElsewhere) {
      const lob = document.querySelector('.lobby');
      lob.classList.remove('enter'); void lob.offsetWidth; lob.classList.add('enter');
      for (let i = 0; i < 4; i++) A.whoosh(0.08 + i * 0.07);
    }
  };
  function botsLabel(t) {
    if (t.mode === 'duel') return '1v1';
    if (t.mode === 'tdm') return `${t.allies.length + 1}v${t.enemies.length}`;
    if (t.mode === 'duel') return '1v1';
    return `${t.enemies.length + 1} players`;
  }
  UI.showPlay = function () {
    const s = NA.Save.data, html = [], R = NA.Ranked;
    if (s.playMode === 'ranked' && !R.unlocked()) s.playMode = 'casual';
    const ranked = s.playMode === 'ranked', events = s.playMode === 'events';
    $('play-credits').textContent = U.fmt(s.credits);
    $('mode-casual').classList.toggle('on', !ranked && !events);
    $('mode-ranked').classList.toggle('on', ranked);
    $('mode-events').classList.toggle('on', events);
    const cw = NA.Events.chaosWindow();
    $('mode-events').querySelector('small').innerHTML = cw.live && NA.Events.chaosUnlocked() ? '<b class="live">● Chaos FFA live</b> · Loot Rush' : 'Loot Rush · Tournament · Chaos';
    $('mode-ranked').classList.toggle('locked', !R.unlocked());
    $('mode-ranked').querySelector('small').textContent = R.unlocked() ? `${D.RANKED.ac} · ×${D.RANKED.payMult} pay` : `Unlocks at Tier ${D.RANKED.unlockTier}`;
    $('ranked-panel').classList.toggle('hidden', !ranked);
    const df = G.diff();
    $('diff-row').innerHTML = '<span class="diff-l">Difficulty</span>' + D.DIFFICULTY.map(x => `<button class="diff ${x.id === df.id ? 'on' : ''}" data-diff="${x.id}" style="--dc:${x.color}">${x.name}<small>×${x.pay} pay</small></button>`).join('') + `<span class="diff-tag">${esc(df.tag)}</span>`;
    if (ranked) UI.renderRankedPanel();
    if (events) { $('tier-list').innerHTML = NA.Events.cards(tourneyCard); UI.show('scr-play'); return; }
    for (const t of D.TIERS) {
      const open = s.highestTier >= t.id, wins = s.winsByTier[t.id] || 0;
      let prog;
      if (!open) prog = `Locked: win Tier ${t.id - 1} first`;
      else if (t.id < D.MAX_PLAYABLE_TIER && s.highestTier <= t.id) prog = `${Math.min(wins, t.winsToUnlock)}/${t.winsToUnlock} wins to unlock Tier ${t.id + 1}`;
      else prog = `Wins: ${wins}`;
      html.push(`<button class="tier ${open ? 'open' : 'locked'} m-${t.map}" data-tier="${t.id}">
        <div class="swatch"></div><div class="tnum">TIER ${t.id} · ${t.rank}</div><div class="tname">${t.name}</div>
        <div class="tmeta">${t.modeLabel} · ${botsLabel(t)} · first to ${t.scoreToWin}${t.loot ? ' · loot + shields' : ''}</div>
        <div class="tmaps">${(t.maps || [t.map]).map(D.mapTitle).join(' · ')}</div>
        <div class="tpay">Win ${U.fmt(t.base * (ranked ? D.RANKED.payMult : 1) * df.pay)} + ${U.fmt(t.kill * (ranked ? D.RANKED.payMult : 1) * df.pay)}/kill</div><div class="tprog">${prog}</div></button>`);
    }
    for (const t of D.LOCKED_TIERS) {
      html.push(`<div class="tier soon locked"><div class="swatch"></div><div class="tnum">TIER ${t.id} · ${t.rank}</div>
        <div class="tname">${t.name}</div><div class="tmeta">Coming Soon™</div><div class="tprog">posted ${U.num(NA.Save.anticheatDays())} days ago</div></div>`);
    }
    $('tier-list').innerHTML = html.join('');
    UI.show('scr-play');
  };

  // ---------------------------------------------------------------- ranked panel, loader, appeal
  UI.renderRankedPanel = function () {
    const R = NA.Ranked, rs = NA.Save.data.ranked, el = $('ranked-panel');
    const verdict = R.tickAppeal();
    if (verdict) UI.toast(verdict === 'won' ? 'Appeal accepted: ban lifted' : 'Appeal denied');
    const status = R.bypassStatus();
    const parts = [];
    parts.push(`<div class="rk-row"><span class="rk-ac">🛡 ${D.RANKED.ac} v${R.version()}</span>
      <span>Bypass: <b class="${status === 'DETECTED' ? 'bad' : 'good'}">${status}</b></span>
      <span>Rank: <b>${R.rankName(rs.rr)}</b> ${rs.rr} RR</span><span>Offences: ${rs.offenses}</span>
      <span>Detection rate ×${R.matchMult(2).toFixed(2)}</span></div>`);
    if (status === 'DETECTED') {
      parts.push(`<div class="rk-warn">Warden updated and your bypass is detected (detection ×2.5). Free patch in ${R.fmtLeft(rs.patchReadyAt - Date.now())}.
        <button class="btn tiny" data-rk="patch">PRIORITY PATCH ${U.fmt(R.patchCost())}</button></div>`);
    }
    if (R.banned()) {
      const b = rs.ban || { label: 'Banned', reason: '', ticket: 0 };
      let act = '';
      const a = rs.appeal;
      if (a && !a.done) act = `<span class="muted">Appeal under review… ${R.fmtLeft(a.at - Date.now())}</span>`;
      else if (a && a.done && !a.won) act = `<span class="muted">Appeal denied: "${esc(a.deny)}"</span>`;
      else if (!b.appealed) act = '<button class="btn tiny primary" data-rk="appeal">APPEAL</button>';
      if (rs.perma) act += NA.Save.level('hwid') ? ` <button class="btn tiny" data-rk="alt">NEW ALT ACCOUNT ${U.fmt(R.altCost())}</button>` : ' <span class="muted">Alt accounts need an HWID Spoofer (shop → Bypass).</span>';
      parts.push(`<div class="rk-ban"><b>${rs.perma ? 'PERMANENTLY BANNED FROM RANKED' : 'BANNED · ' + R.fmtLeft(R.banLeft())}</b> · ${esc(b.label)} · ticket #${b.ticket}<br>
        <span class="muted">${esc(b.reason || '')}</span><div class="rk-act">${act}</div></div>`);
    } else if (rs.appeal && rs.appeal.done && rs.appeal.won && Date.now() - rs.appeal.at < 120000) {
      parts.push('<div class="rk-ok">Appeal accepted. "After review, we found no evidence of cheating." (They did not look very hard.)</div>');
    }
    el.innerHTML = parts.join('');
  };
  // Every match start goes through here so Ranked can run its checks and the loader.
  UI.queue = function (tierId, forceRanked) {
    const s = NA.Save.data, R = NA.Ranked;
    const ranked = (forceRanked !== undefined ? forceRanked : s.playMode === 'ranked') && R.unlocked();
    if (!ranked) { G.startMatch(tierId); return; }
    if (R.banned()) { A.deny(); UI.toast(NA.Save.data.ranked.perma ? 'Permanently banned from Ranked' : 'Banned from Ranked for ' + R.fmtLeft(R.banLeft())); UI.showPlay(); return; }
    UI.openLoader(tierId);
  };
  // Loader minigame: stop the needle in the green zone three times.
  UI.openLoader = function (tierId) {
    const L = UI.loader = { tierId, stage: 0, hits: 0, t: 0, dir: 1, pos: 0, zone: 0, w: 0, log: [] };
    const newZone = () => { L.w = [0.22, 0.16, 0.11][L.stage]; L.zone = U.rand(0.1, 0.9 - L.w); L.speed = [0.9, 1.15, 1.45][L.stage]; };
    newZone();
    L.newZone = newZone;
    $('ld-log').innerHTML = `<div>&gt; skillissue loader v2.0</div><div>&gt; target: FRAGLINE.exe · ${esc(D.RANKED.ac)} v${NA.Ranked.version()} (${NA.Ranked.bypassStatus().toLowerCase()})</div><div>&gt; stage 1/3: map driver… press INJECT in the green zone</div>`;
    $('ld-inject').disabled = false;
    $('loader').classList.remove('hidden');
    const tick = () => {
      if (!UI.loader || UI.loader !== L) return;
      const now = performance.now(), dt = L.last ? (now - L.last) / 1000 : 0; L.last = now;
      if (L.stage < 3) {
        L.pos += L.dir * L.speed * dt;
        if (L.pos > 1) { L.pos = 1; L.dir = -1; } if (L.pos < 0) { L.pos = 0; L.dir = 1; }
      }
      $('ld-zone').style.left = (L.zone * 100) + '%'; $('ld-zone').style.width = (L.w * 100) + '%';
      $('ld-needle').style.left = (L.pos * 100) + '%';
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const LD_STEPS = ['map driver', 'hide module from Warden', 'hook game memory'];
  UI.loaderInject = function () {
    const L = UI.loader;
    if (!L || L.stage >= 3) return;
    const ok = L.pos >= L.zone && L.pos <= L.zone + L.w;
    if (ok) { L.hits++; A.buy(); } else A.deny();
    const log = $('ld-log');
    log.insertAdjacentHTML('beforeend', `<div class="${ok ? 'good' : 'bad'}">&gt; ${LD_STEPS[L.stage]}… ${ok ? 'OK' : 'ERROR 0x' + U.randInt(4096, 65535).toString(16).toUpperCase() + ' (trace left behind)'}</div>`);
    L.stage++;
    if (L.stage < 3) { L.newZone(); log.insertAdjacentHTML('beforeend', `<div>&gt; stage ${L.stage + 1}/3: ${LD_STEPS[L.stage]}…</div>`); }
    else {
      $('ld-inject').disabled = true;
      const res = ['Injected with errors: you start the match at 45% detection', 'Sloppy injection: you start at 25% detection', 'Injected. Normal detection.', 'Clean injection: detection −25% this match'][L.hits];
      log.insertAdjacentHTML('beforeend', `<div class="${L.hits >= 2 ? 'good' : 'bad'}">&gt; ${res}</div>`);
      setTimeout(() => { if (UI.loader === L) { UI.closeLoader(); G.startMatch(L.tierId, { ranked: true, loader: L.hits }); } }, 1300);
    }
    log.scrollTop = log.scrollHeight;
  };
  UI.closeLoader = function () { UI.loader = null; $('loader').classList.add('hidden'); };

  UI.openAppeal = function () {
    const rs = NA.Save.data.ranked;
    if (!rs.ban || rs.ban.appealed) return;
    $('ap-ticket').textContent = `Ticket #${rs.ban.ticket} · ${rs.ban.label} · peak detection ${rs.ban.peak}%`;
    $('ap-list').innerHTML = D.RANKED.excuses.map((e, i) => `<label class="ap-opt"><input type="radio" name="ap" value="${i}" ${i === 0 ? 'checked' : ''}> ${esc(e.text)}</label>`).join('') +
      '<label class="ap-opt"><input type="radio" name="ap" value="-1"> Write my own:</label>';
    $('ap-text').value = '';
    $('appeal').classList.remove('hidden');
  };
  UI.submitAppeal = function () {
    const sel = document.querySelector('input[name=ap]:checked');
    const idx = sel ? +sel.value : 0, text = $('ap-text').value;
    if (idx < 0 && text.trim().length < 5) { UI.toast('Write something first'); return; }
    if (NA.Ranked.appeal(idx, text)) { UI.toast('Appeal submitted. Review takes about a minute.'); A.buy(); }
    $('appeal').classList.add('hidden');
    UI.showPlay();
  };

  function tourneyCard() {
    const s = NA.Save.data, T = D.TOURNAMENT, open = s.highestTier >= T.unlockTier;
    return `<button class="tier tourney ${open ? 'open' : 'locked'}" data-tourney="1">
      <div class="swatch"></div><div class="tnum">TOURNAMENT · 3 rounds</div><div class="tname">FRAGLINE Open</div>
      <div class="tmeta">1v1 bracket vs seeded pros · ${T.rounds.map(r => r.label).join(' → ')}</div>
      <div class="tmaps">${T.rounds.map(r => D.mapTitle(r.map)).join(' → ')}</div>
      <div class="tpay">Entry ${U.fmt(T.fee)} · prizes ${T.prize.slice(1).map(U.fmt).join(' / ')}</div>
      <div class="tprog">${open ? `Titles: ${s.tourney.won} · entered ${s.tourney.played}` : `Locked: reach Tier ${T.unlockTier}`}</div></button>`;
  }

  // Pre-match: map name, mode, both teams (or everyone in FFA), countdown ring and a tip.
  const TIPS = [
    'Open the cheat menu with the ⚡ CHEATS button.',
    'Knife from behind for an instant kill.',
    'Too obvious and the lobby reports you. Watch the SUS meter.',
    'Loot glows by rarity: gold beats purple beats blue.',
    'Headshots pay more. Aimbot knows that.',
    'Ranked has a real anticheat. Kind of.',
    'New skins rotate in the Item Shop every day.',
    'Big FFA lobbies pay more per kill.',
  ];
  UI.showLobby = function () {
    const t = G.match.tier, p = G.player, s = NA.Save.data;
    $('pm-map').textContent = D.mapTitle(t.map);
    $('lobby-title').textContent = t.name;
    $('lobby-sub').textContent = `${t.modeLabel} · ${G.bots.length + 1} players · first to ${t.scoreToWin}`;
    let i = 0;
    const card = (name, me, side) => {
      const ping = me ? 0 : U.randInt(14, 95);
      const RK = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLAT', 'EMERALD', 'DIAMOND', 'MASTER', 'GM', 'LEGEND'];
      const rk = me ? (NA.Prog.myRank().name || 'IRON').split(' ')[0].toUpperCase().slice(0, 7) : RK[Math.max(0, Math.min(9, Math.round(t.id - 2 + (Math.random() * 3 - 1))))];
      return `<div class="pc${me ? ' me' : ''}" style="animation-delay:${(i++) * 45}ms"><span class="png${ping > 70 ? ' p2' : ''}"><u></u><u></u><u></u></span><b>${esc(name)}${me ? ' (you)' : ''}</b><span class="lv">${rk}</span></div>`;
    };
    const el = $('lobby-players');
    if (t.mode === 'tdm') {
      const A = [p].concat(G.bots.filter(b => b.team === 'A')), B = G.bots.filter(b => b.team === 'B');
      const many = Math.max(A.length, B.length) > 8;
      const colA = A.slice(0, many ? 8 : 99).map(e => card(e.name, e === p, 'A')).join('') + (many && A.length > 8 ? `<div class="pc"><b>+${A.length - 8} more</b></div>` : '');
      const colB = B.slice(0, many ? 8 : 99).map(e => card(e.name, false, 'B')).join('') + (many && B.length > 8 ? `<div class="pc"><b>+${B.length - 8} more</b></div>` : '');
      el.className = 'pm-teams';
      el.innerHTML = `<div class="pm-col A"><h4>BLUE TEAM</h4>${colA}</div><div class="pm-vs">VS</div><div class="pm-col B"><h4>RED TEAM</h4>${colB}</div>`;
    } else {
      const all = [p].concat(G.bots), shown = all.slice(0, 15);
      el.className = 'pm-teams ffa';
      el.innerHTML = shown.map(e => card(e.name, e === p)).join('') + (all.length > 15 ? `<div class="pc"><b>+${all.length - 15} more</b></div>` : '');
    }
    $('pm-tip').textContent = U.pick(TIPS);
    $('lobby-count').textContent = '4';
    const arc = $('pm-arc');
    arc.style.transition = 'none'; arc.style.strokeDashoffset = '0'; void arc.offsetWidth; arc.style.transition = '';
    UI.show('scr-lobby');
  };
  UI.lobbyTick = n => {
    const el = $('lobby-count');
    if (el.textContent !== String(n)) { el.textContent = n; $('pm-arc').style.strokeDashoffset = String(163.4 * (1 - n / 4)); if (n > 0) A.click(); }
  };

  UI.showHUD = function () {
    UI.show('hud');
    $('aim-hint').classList.toggle('hidden', U.isTouch || !!document.pointerLockElement);
    UI.hudTick();
  };
  UI.pause = function () {
    if (G.state !== 'playing' || G.paused) return;
    G.paused = true;
    UI.renderPausePlayers();
    UI.show('scr-pause');
  };
  UI.renderPausePlayers = function () {
    const rows = G.bots.filter(b => G.isEnemy(G.player, b)).sort((a, b) => b.kills - a.kills);
    $('pause-players').innerHTML = rows.map(b => `<div class="pp"><b>${esc(b.name)}</b><span>${b.kills}/${b.deaths}</span>
      <button class="btn tiny" data-prep="${esc(b.name)}" ${b.reported ? 'disabled' : ''}>${b.reported ? 'REPORTED' : 'REPORT'}</button>
      <button class="btn tiny" data-pclip="${esc(b.name)}" ${b.clipped ? 'disabled' : ''}>${b.clipped ? 'CLIPPED' : 'CLIP'}</button></div>`).join('') || '<div class="muted small">No enemies.</div>';
  };
  UI.resume = function () { G.paused = false; UI.showHUD(); };

  // ---------------------------------------------------------------- results
  UI.showResults = function (r) {
    const t = G.match.tier, p = G.player;
    $('res-title').textContent = r.kicked === 'ban' ? 'BANNED' : r.kicked ? 'KICKED' : r.tourney && r.tourney.champion ? 'CHAMPION' : r.won ? 'VICTORY' : 'DEFEAT';
    $('res-title').className = r.won ? 'win' : 'lose';
    $('res-sub').textContent = `${G.ranked ? 'RANKED · ' : ''}${t.name} · ${t.modeLabel}`;
    const order = t.mode === 'tdm' ? r.rows.filter(x => x.team === 'A').concat(r.rows.filter(x => x.team === 'B')) : r.rows;
    $('res-board').innerHTML = '<div class="row head"><span>Player</span><span>K</span><span>D</span></div>' +
      order.map(x => `<div class="row ${x.me ? 'me' : ''} ${t.mode === 'tdm' ? 't' + x.team : ''}"><span>${esc(x.name)}${x.spoof ? '<span class="spoof">spoofed</span>' : ''}${x.me || x.ally ? '' : `<button class="rep" data-rep="${esc(x.name)}">report</button>`}</span><span>${x.k}</span><span>${x.d}</span></div>`).join('');
    $('res-stats').textContent = `Accuracy ${r.acc}% · Headshots ${p.headshots} · Peak suspicion ${r.peakSus}` + (r.ranked ? ` · Peak Warden detection ${r.ranked.peak}%` : '');
    $('res-pay').innerHTML = r.pay.lines.map(l => `<div class="pl"><span>${esc(l[0])}</span><span>+${U.fmt(l[1])}</span></div>`).join('');
    countUp($('res-total'), r.pay.total);
    const un = $('res-unlock');
    un.classList.add('hidden'); un.classList.remove('soon');
    const rk = r.ranked, RS = NA.Save.data.ranked;
    if (rk && (rk.ban || rk.wave)) {
      const b = rk.ban || rk.wave;
      un.innerHTML = `<b class="ban">${rk.wave ? 'BAN WAVE · ' : ''}${esc(b.label)}</b><br>${esc(b.reason)}${b.fine ? ` · fined ${U.fmt(b.fine)}` : ''}${b.rrLost ? ` · rank reset (−${b.rrLost} RR)` : ''}${rk.confiscated ? ` · winnings confiscated (${U.fmt(rk.confiscated)})` : ''}<br><span class="muted">Ticket #${b.ticket}. You can appeal from the Ranked lobby list.</span>`;
      un.classList.add('soon'); un.classList.remove('hidden');
    } else if (rk) {
      const k = rk.rank || {};
      const rkLine = k.promoted ? `<b class="up">PROMOTED to ${esc(k.after.name)}!</b>${k.reward ? ` +${U.fmt(k.reward.credits)} and a new crosshair` : ''}`
        : k.promoFailed ? `<b class="ban">Promo lost.</b> Back to ${esc(k.after.name)}: climb ${300 - (RS.rr % 300)} RP to try again`
        : k.promoStarted ? `<b class="up">PROMO MATCH UNLOCKED:</b> win your next Ranked match to reach ${NA.Prog.RANKS[k.after.idx + 1]}`
        : `<b>${rk.rr >= 0 ? '+' : ''}${rk.rr} RP</b> · ${esc(NA.Ranked.rankName(RS.rr))}`;
      un.innerHTML = rkLine + `${rk.legit ? ' · played legit' : ''}` +
        (rk.update ? `<br>${esc(D.RANKED.ac)} updated to v${rk.update}: bypass ${rk.detected ? '<b class="ban">DETECTED</b>' : 'still undetected'}` : '');
      un.classList.remove('hidden');
    } else if (r.tourney && r.tourney.next) {
      un.innerHTML = `<b>You advance to the ${esc(r.tourney.label)}.</b><br><button class="btn primary tiny" data-next="1">PLAY ${esc(r.tourney.label.toUpperCase())}</button>`;
      un.classList.remove('hidden');
    } else if (r.tourney && r.tourney.champion) {
      un.innerHTML = '<b>FRAGLINE Open champion.</b> The trophy is a JPEG. The prize money is real (in-game).';
      un.classList.remove('hidden');
    } else if (r.tourney && r.tourney.out) {
      un.innerHTML = 'Eliminated from the FRAGLINE Open. Buy something and enter again.';
      un.classList.add('soon'); un.classList.remove('hidden');
    } else if (r.kicked) {
      un.innerHTML = '<b>The lobby voted you out.</b> Vote Rigging is in the shop, in the Server section.';
      un.classList.add('soon'); un.classList.remove('hidden');
    } else if (r.unlocked) {
      un.innerHTML = `<b>Tier ${r.unlocked.id} unlocked: ${esc(r.unlocked.name)}</b>${UNLOCK_NOTES[r.unlocked.id] ? ' + ' + UNLOCK_NOTES[r.unlocked.id] : ''}<br><button class="btn primary tiny" data-play="${r.unlocked.id}">PLAY TIER ${r.unlocked.id}</button>`;
      un.classList.remove('hidden');
    } else if (r.comingSoon) {
      un.innerHTML = "<b>You've beaten every lobby in this build.</b><br>Pro League: Coming Soon™. Keep farming credits for the next update.";
      un.classList.add('soon'); un.classList.remove('hidden');
    }
    UI.refreshDMBadge();
    UI.show('scr-results');
    const s = NA.Save.data;
    if (NA.Save.level('autoqueue') && s.settings.autoQueue && !r.unlocked && t.tourney === undefined && !G.ranked && t.id <= D.MAX_PLAYABLE_TIER) UI.startAuto(t.id);
  };
  const UNLOCK_NOTES = {
    2: 'AR-7 Rifle + Armory guns', 3: 'new cheats in the shop', 4: 'loot, shields, Loot ESP, Stream Proof, the Tournament',
    5: 'snipers, Shoot Through Walls, Vote Rigging', 6: 'Freeze Target, LMGs', 7: 'Hailstorm and Buzzsaw', 8: 'the Railspike', 9: 'the Megalobby',
  };
  function countUp(el, total) {
    const t0 = performance.now();
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / 800);
      el.textContent = U.fmt(total * k);
      if (k < 1) requestAnimationFrame(step);
    };
    step();
  }
  UI.startAuto = function (tierId) {
    UI.stopAuto();
    let n = 6;
    $('res-auto').classList.remove('hidden');
    $('res-auto-text').textContent = `Auto-Queue: next match in ${n}`;
    UI.autoTimer = setInterval(() => {
      n--;
      if (n <= 0) { UI.stopAuto(); G.startMatch(tierId); return; }
      $('res-auto-text').textContent = `Auto-Queue: next match in ${n}`;
    }, 1000);
  };
  UI.stopAuto = function () {
    if (UI.autoTimer) clearInterval(UI.autoTimer);
    UI.autoTimer = null;
    const el = $('res-auto');
    if (el) el.classList.add('hidden');
  };

  // ---------------------------------------------------------------- shop
  function practiceLeft() {
    const ms = Math.max(0, 3600e6 - (Date.now() - NA.Save.data.practiceStartedAt));
    const h = Math.floor(ms / 3600e3), m = Math.floor(ms / 60e3) % 60, s = Math.floor(ms / 1e3) % 60;
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  UI.showShop = function (from) {
    UI.shopFrom = from || UI.current;
    UI.renderShop();
    UI.show('scr-shop');
    setTimeout(() => {
      NA.Save.data.sellerDMs.forEach(d => { d.read = true; });
      NA.Save.save();
      UI.refreshDMBadge();
    }, 2500);
  };
  UI.shopBack = function () {
    if (UI.shopFrom === 'scr-results' && G.state === 'results') UI.show('scr-results');
    else if (UI.shopFrom === 'scr-comms') NA.Comms.open();
    else UI.showMenu();
  };
  UI.renderShop = function () {
    const s = NA.Save.data, html = [];
    $('shop-credits').textContent = U.fmt(s.credits);
    if (!s.flags.firstBuy) html.push('<div class="teaser"><b>FIRST ONE\'S HALF OFF.</b> Prices below already include it. One time only.</div>');
    for (const cat of D.CATEGORIES) {
      const items = D.CHEATS.filter(c => c.cat === cat);
      if (!items.length) continue;
      html.push(`<div class="cat-h">${cat}</div><div class="items">`);
      for (const c of items) {
        const lvl = NA.Save.level(c.id), locked = s.highestTier < c.tier, maxed = lvl >= c.max, cost = G.cost(c.id);
        const pips = c.max > 1 ? '●'.repeat(lvl) + '○'.repeat(c.max - lvl) : (lvl ? '● OWNED' : '');
        let fx = maxed ? c.fx(lvl) : 'Next: ' + c.fx(lvl + 1);
        if (c.id === 'practice' && lvl) fx = `Practicing… ${practiceLeft()} left`;
        let btn;
        if (locked) btn = `<button class="buy cant" disabled>Tier ${c.tier}</button>`;
        else if (maxed) btn = `<button class="buy max" disabled>${c.max > 1 ? 'MAXED' : 'OWNED'}</button>`;
        else btn = `<button class="buy ${s.credits < cost ? 'cant' : ''}" data-buy="${c.id}">${cost === 0 ? 'FREE' : 'BUY ' + U.fmt(cost)}</button>`;
        html.push(`<div class="item ${locked ? 'locked' : ''}">${c.hot && !locked ? '<span class="hot">HOT</span>' : ''}
          <div class="iname">${locked ? '??? · unlocks at Tier ' + c.tier : esc(c.name)}</div>
          <div class="itag">${locked ? '&nbsp;' : esc(c.tag)}</div>
          <div class="ifx">${locked ? '&nbsp;' : esc(fx)}</div>
          <div class="pips">${pips || '&nbsp;'}</div>
          <div class="ufoot"><span class="und">✔ UNDETECTED</span>${btn}</div></div>`);
      }
      html.push('</div>');
    }
    html.push(NA.Cfg.shopHtml());
    html.push('<div class="cat-h">Armory</div><div class="items">');
    for (const id of D.WEAPON_ORDER) {
      const w = D.WEAPONS[id], owned = !!s.guns[id], locked = s.highestTier < w.tier;
      const equipped = s.loadout.primary === id || s.loadout.secondary === id;
      const rpm = Math.round(w.rate * 60 * (w.burst || 1));
      const stats = `${D.CLASS_LABEL[w.cls]} · ${w.pellets > 1 ? w.pellets + '×' : ''}${w.dmg} dmg · ${rpm} rpm · ${w.mag} mag${w.scope ? ' · ' + w.scope + 'x' : ''}${w.pen ? ' · pierces ' + (w.pen > 5 ? 'all' : w.pen) : ''}`;
      let btn;
      if (locked) btn = `<button class="buy cant" disabled>Tier ${w.tier}</button>`;
      else if (equipped) btn = '<button class="buy max" disabled>EQUIPPED</button>';
      else if (owned) btn = `<button class="buy" data-equip="${id}">EQUIP</button>`;
      else btn = `<button class="buy ${s.credits < w.price ? 'cant' : ''}" data-gun="${id}">${w.price ? 'BUY ' + U.fmt(w.price) : 'FREE'}</button>`;
      html.push(`<div class="item gun ${locked ? 'locked' : ''}">
        <div class="iname">${locked ? '??? · unlocks at Tier ' + w.tier : esc(w.name)}<span class="slot">${w.slot ? 'SECONDARY' : 'PRIMARY'}</span></div>
        <div class="itag">${locked ? '&nbsp;' : esc(w.tag)}</div>
        <div class="ifx">${locked ? '&nbsp;' : esc(stats)}</div>
        <div class="ufoot"><span class="und">${owned ? '✔ OWNED' : '&nbsp;'}${(() => { const m = NA.Prog.mastery(id); return m.kills ? ` · <span style="color:${m.color || '#94a3b8'}">${m.name} mastery ${m.kills}${m.next ? '/' + m.next : ''}</span>` : ''; })()}</span>${btn}</div></div>`);
    }
    html.push('</div>');
    html.push(`<div class="teaser">Restocking next update: ${D.TEASERS.join(' · ')}</div>`);
    $('shop-list').innerHTML = html.join('');
    const dms = s.sellerDMs;
    $('shop-dms').innerHTML = dms.length ? dms.map(d => `<div class="dm ${d.read ? '' : 'new'}">${esc(d.text)}</div>`).join('') : '<div class="dm-empty">no messages yet</div>';
    $('shop-dms').scrollTop = 1e6;
  };
  UI.refreshDMBadge = function () {
    const n = NA.Save.data.sellerDMs.filter(d => !d.read).length;
    for (const id of ['shop-badge', 'res-badge']) {
      const el = $(id);
      if (!el) continue;
      el.textContent = n;
      el.classList.toggle('hidden', n === 0);
    }
    if (UI.current === 'scr-shop') UI.renderShop();
  };

  // ---------------------------------------------------------------- profile + settings
  UI.showProfile = function () {
    const s = NA.Save.data, st = s.stats;
    const acc = st.shotsFired ? (100 * st.shotsHit / st.shotsFired).toFixed(1) : '0.0';
    const kd = st.deaths ? (st.kills / st.deaths).toFixed(2) : st.kills.toFixed(2);
    const card = (v, l, wide) => `<div class="stat ${wide ? 'wide' : ''}"><b>${v}</b><span>${l}</span></div>`;
    const ach = { first_buy: "First One's Half Off", skill_issue: 'Skill Issue', placebo: 'Placebo', flawless: 'Flawless', arsenal: 'Arsenal', champion: 'FRAGLINE Open Champion', kicked: 'Democracy', ragequits: 'Lobby Cleaner', snitch: 'Hall Monitor', jury: 'Court of Public Opinion', scammed: 'Scammed', banned: 'Detected', banwave: 'Caught in the Wave' };
    $('prof-body').innerHTML = [
      card(esc(s.username), 'Username'), card(rankLabel(), 'Rank'),
      card(NA.Save.accountAge() + ' days', 'Account age'), card(U.fmt(s.lifetimeCredits), 'Lifetime credits'),
      card(`${st.wins} / ${st.matches}`, 'Wins / matches'), card(kd, 'K/D'), card(acc + '%', 'Accuracy'),
      card(U.num(st.headshots), 'Headshots'), card(`${s.tourney.won} / ${s.tourney.played}`, 'Tournament titles / entries'), card(U.num(st.reports), 'Reports against you (action taken: 0)'),
      card(s.practiceStartedAt ? practiceLeft() : 'not started', 'Practice (Legit) time left'),
      card(s.achievements.length ? s.achievements.map(a => esc(ach[a] || a)).join(' · ') : 'none yet', 'Achievements', true),
      '<div class="stat wide"><canvas id="acc-chart" width="700" height="90" style="width:100%;height:70px"></canvas><span>Accuracy per match</span></div>',
    ].join('');
    UI.show('scr-profile');
    const cv = $('acc-chart'), g = cv.getContext('2d'), h = st.accHistory;
    g.clearRect(0, 0, cv.width, cv.height);
    if (h.length > 1) {
      const top = Math.max(10, ...h) * 1.15;
      g.strokeStyle = '#3b82f6'; g.lineWidth = 3; g.beginPath();
      h.forEach((v, i) => { const x = 8 + i / (h.length - 1) * (cv.width - 16), y = cv.height - 8 - v / top * (cv.height - 16); if (i) g.lineTo(x, y); else g.moveTo(x, y); });
      g.stroke();
      g.fillStyle = '#8d97a8'; g.font = '18px sans-serif'; g.fillText(`best ${Math.max(...h)}%`, cv.width - 110, 22);
    } else { g.fillStyle = '#8d97a8'; g.font = '22px sans-serif'; g.fillText('Play a few matches to see your accuracy here.', 10, 50); }
  };
  UI.renderCrosshairPick = function () {
    const P = NA.Prog, c = NA.Save.data.cosmetics;
    $('set-xstyle').innerHTML = Object.keys(P.STYLES).map(k => `<button class="chip ${c.style === k ? 'on' : ''} ${P.owns('style', k) ? '' : 'locked'}" data-xs="${k}">${P.STYLES[k]}${P.owns('style', k) ? '' : ' 🔒'}</button>`).join('');
    $('set-xcolor').innerHTML = Object.keys(P.CROSS_COLORS).map(k => { const v = P.CROSS_COLORS[k]; return `<button class="chip sw ${c.color === k ? 'on' : ''} ${P.owns('color', k) ? '' : 'locked'}" data-xc="${k}" title="${k}" style="--sw:${v === 'rainbow' ? 'linear-gradient(90deg,#f43f5e,#facc15,#4ade80,#22d3ee,#c084fc)' : v}">${P.owns('color', k) ? '' : '🔒'}</button>`; }).join('');
  };
  UI.showRanks = function () {
    $('ranks-credits').textContent = U.fmt(NA.Save.data.credits);
    NA.Prog.render();
    UI.show('scr-ranks');
  };
  UI.showSettings = function (from) {
    UI.settingsFrom = from;
    const st = NA.Save.data.settings;
    $('set-sens').value = st.sens; $('set-sens-v').textContent = (+st.sens).toFixed(2);
    $('set-vol').value = st.volume; $('set-vol-v').textContent = Math.round(st.volume * 100) + '%';
    $('set-auto').checked = !!st.autoQueue; $('set-fps').checked = !!st.showFps;
    $('set-gfx').value = NA.Graphics.quality();
    $('set-lang').innerHTML = NA.I18N.LANGS.map(l => `<option value="${l[0]}" ${l[0] === st.lang ? 'selected' : ''}>${l[1]}</option>`).join('');
    $('set-pad').textContent = UI.padName ? 'Controller: ' + UI.padName : 'Controller: none connected (pair one in iOS Settings → Bluetooth)';
    UI.renderCrosshairPick();
    UI.resetArm = false; $('set-reset').textContent = 'Reset all progress';
    UI.show('scr-settings');
  };

  // ---------------------------------------------------------------- cheat menu
  UI.toggleCheatMenu = () => (UI.cheatOpen ? UI.closeCheatMenu() : UI.openCheatMenu());
  UI.openCheatMenu = function () {
    if (G.state !== 'playing') return;
    UI.cheatOpen = true;
    UI.renderCheatMenu();
    $('cheatmenu').classList.remove('hidden');
    document.body.classList.add('cm-open');
    if (document.pointerLockElement) document.exitPointerLock();
  };
  UI.closeCheatMenu = function () {
    if (!UI.cheatOpen) return;
    UI.cheatOpen = false;
    $('cheatmenu').classList.add('hidden');
    document.body.classList.remove('cm-open');
  };
  // Each option: [key, kind, minLevel, choices]. kind: chk | sel | rng
  const CM_OPTS = {
    aimbot: [['type', 'sel', 1, ['memory', 'silent']], ['bone', 'sel', 1, ['head', 'neck', 'pelvis', 'random']], ['smooth', 'rng', 1, [1, 10]], ['predict', 'chk', 2], ['fovCircle', 'chk', 1]],
    triggerbot: [['headOnly', 'chk', 1]],
    wallhack: [['box', 'chk', 1], ['health', 'chk', 2], ['shield', 'chk', 2], ['name', 'chk', 3], ['distance', 'chk', 3], ['weapon', 'chk', 3],
      ['skeleton', 'chk', 4], ['platform', 'chk', 4], ['rank', 'chk', 4], ['kills', 'chk', 4], ['botTag', 'chk', 4], ['snaplines', 'chk', 5], ['chams', 'chk', 5]],
    lootesp: [['minRarity', 'sel', 2, [0, 1, 2, 3, 4]], ['weapons', 'chk', 1], ['shields', 'chk', 3], ['meds', 'chk', 3]],
  };
  UI.cmTab = 'aim';
  UI.renderCheatMenu = function () {
    const s = NA.Save.data, T = NA.I18N.t, rows = [];
    const tabs = ['aim', 'visuals', 'misc', 'exploits', 'advanced', 'config'];
    $('cm-tabs').innerHTML = tabs.map(t => `<button data-tab="${t}" class="${UI.cmTab === t ? 'on' : ''}">${T(t)}</button>`).join('');
    $('cm-head').textContent = `skillissue v2.0 | ${T('undetected')} | ${T('hide')}` + (G.mods && G.mods.streamProof ? ` | ● ${T('hidden')}` : '');
    if (UI.cmTab === 'advanced') {
      $('cm-list').innerHTML = NA.Cfg.renderAdvanced();
      $('cm-panic').classList.toggle('on', G.panic);
      $('cm-panic').textContent = G.panic ? T('panicOn') : T('panic');
      return;
    }
    if (UI.cmTab === 'config') {
      rows.push(`<div class="cm-opt"><span>${T('language')}</span><select data-lang="1">${NA.I18N.LANGS.map(l => `<option value="${l[0]}" ${l[0] === s.settings.lang ? 'selected' : ''}>${l[1]}</option>`).join('')}</select></div>`);
      rows.push(`<div class="cm-note">config: default.cfg · ${G.bots.length} entities · ping ${U.randInt(18, 40)} ms</div>`);
    }
    for (const c of D.CHEATS) {
      if (!c.toggle || c.tab !== UI.cmTab) continue;
      const st = s.cheats[c.id], name = T('c_' + c.id);
      if (!st || !st.level) { rows.push(`<div class="cm-locked">[locked] ${esc(name)}: ${T('locked')}</div>`); continue; }
      const use = Math.min(st.use || st.level, st.level);
      const lvl = st.level > 1 ? `<div class="lvl">${T('level')} <input type="range" min="1" max="${st.level}" step="1" value="${use}" data-lvl="${c.id}"><span>${use}/${st.level}</span></div>` : '';
      rows.push(`<div class="cm-row"><input type="checkbox" id="cm-${c.id}" data-cm="${c.id}" ${st.enabled !== false ? 'checked' : ''}><label for="cm-${c.id}">${esc(name)}</label>${lvl}</div>`);
      const opts = CM_OPTS[c.id];
      if (!opts || st.enabled === false) continue;
      const o = G.opt(c.id), out = [];
      for (const [key, kind, min, ch] of opts) {
        const gated = use < min || (c.id === 'aimbot' && key === 'type' && use < 3);
        if (gated) { out.push(`<div class="cm-opt dim"><span>${T(key)}</span><em>${T('unlockAt')} ${c.id === 'aimbot' && key === 'type' ? 3 : min}</em></div>`); continue; }
        if (kind === 'chk') out.push(`<label class="cm-opt"><span>${T(key)}</span><input type="checkbox" data-opt="${c.id}.${key}" ${o[key] ? 'checked' : ''}></label>`);
        else if (kind === 'sel') {
          const label = v => (key === 'minRarity' ? D.RARITY[v].name : T(v));
          out.push(`<div class="cm-opt"><span>${T(key)}</span><select data-opt="${c.id}.${key}">${ch.map(v => `<option value="${v}" ${String(o[key]) === String(v) ? 'selected' : ''}>${label(v)}</option>`).join('')}</select></div>`);
        } else out.push(`<div class="cm-opt"><span>${T(key)}</span><input type="range" min="${ch[0]}" max="${ch[1]}" step="1" value="${o[key]}" data-opt="${c.id}.${key}"><b>${o[key]}</b></div>`);
      }
      rows.push(`<div class="cm-sub">${out.join('')}</div>`);
    }
    $('cm-list').innerHTML = rows.join('') || '<div class="cm-locked">—</div>';
    $('cm-panic').classList.toggle('on', G.panic);
    $('cm-panic').textContent = G.panic ? T('panicOn') : T('panic');
  };

  // ---------------------------------------------------------------- hidden admin panel
  UI.openAdmin = function () {
    UI.adminOpen = true;
    UI.adminAt = performance.now();
    if (G.state === 'playing' && !G.paused) { G.paused = true; UI.adminPaused = true; }
    if (document.pointerLockElement) document.exitPointerLock();
    if (UI.resetTouch) UI.resetTouch();
    UI.adminRefresh();
    $('admin').classList.remove('hidden');
    A.buy();
  };
  UI.closeAdmin = function () {
    UI.adminOpen = false;
    $('admin').classList.add('hidden');
    if (UI.adminPaused) { UI.adminPaused = false; if (G.state === 'playing') G.paused = false; }
    if (UI.current === 'scr-menu') UI.showMenu();
    else if (UI.current === 'scr-play') UI.showPlay();
    else if (UI.current === 'scr-shop') UI.renderShop();
  };
  UI.adminRefresh = function () {
    $('adm-god').textContent = 'God mode: ' + (G.god ? 'ON' : 'off');
    $('adm-god').classList.toggle('on', !!G.god);
    $('adm-speed').textContent = 'Game speed: ' + G.speed + '×';
    $('adm-events').textContent = 'Events always live: ' + (NA.Save.data.flags.eventsAlwaysLive ? 'ON' : 'off');
    $('adm-head-credits').textContent = U.fmt(NA.Save.data.credits);
    $('adm-reset').textContent = UI.admResetArm ? 'Tap again to erase everything' : 'Reset all progress';
  };

  // ---------------------------------------------------------------- chat input
  UI.openChat = function () {
    if (UI.chatOpen) return;
    UI.chatOpen = true;
    if (document.pointerLockElement) document.exitPointerLock();
    if (UI.resetTouch) UI.resetTouch();
    $('chat-form').classList.remove('hidden');
    setTimeout(() => $('chat-input').focus(), 30);
  };
  UI.closeChat = function () {
    if (!UI.chatOpen) return;
    UI.chatOpen = false;
    $('chat-form').classList.add('hidden');
    $('chat-input').value = '';
    $('chat-input').blur();
    window.scrollTo(0, 0);
  };

  // ---------------------------------------------------------------- HUD
  UI.toast = function (text) {
    const el = $('toast');
    el.textContent = text;
    el.classList.add('on');
    clearTimeout(UI.toastTimer);
    UI.toastTimer = setTimeout(() => el.classList.remove('on'), 2200);
  };
  UI.centerMsg = function (text, ms) {
    const el = $('center-msg');
    el.textContent = text;
    clearTimeout(UI.cmTimer);
    UI.cmTimer = setTimeout(() => { el.textContent = ''; }, ms || 1500);
  };
  UI.hitmarker = (head, shield) => { UI.hitT = performance.now(); UI.hitHead = head; UI.hitShield = shield; };
  UI.hurt = attacker => {
    UI.hurtA = 0.55;
    const p = G.player;
    if (attacker && p) UI.hurtAng = U.wrap(Math.atan2(-(attacker.pos.x - p.pos.x), -(attacker.pos.z - p.pos.z)) - p.yaw);
    UI.hurtAngT = performance.now();
  };
  UI.killPop = head => {
    const el = $('killpop'), t = G.match.tier;
    el.textContent = `${head ? 'HEADSHOT ' : ''}+${U.fmt(t.kill * (head ? 1.5 : 1) * G.mods.payoutMult)}`;
    el.classList.remove('go'); void el.offsetWidth; el.classList.add('go');
  };
  UI.fps = v => { const el = $('fps'); el.classList.toggle('hidden', !NA.Save.data.settings.showFps); el.textContent = Math.round(v) + ' fps'; };
  const tc = team => (team === 'A' ? 'tA' : team === 'B' ? 'tB' : team === 'P' ? 'tP' : 'tF');
  let lastScore = '', lastFeed = '';
  UI.hudTick = function () {
    if (UI.current !== 'hud' || !G.match || !G.player) return;
    const p = G.player, mt = G.match, t = mt.tier, m = G.mods;
    // score bar: two blocks with the timer between, progress lines towards the target
    const pr = v => `<i class="pr" style="width:${Math.min(100, v / t.scoreToWin * 100)}%"></i>`;
    const blk = (side, val, label, me) => `<div class="sb ${side}${me ? ' me' : ''}">${side === 'a' ? `<span>${label}</span><b>${val}</b>` : `<b>${val}</b><span>${label}</span>`}${pr(val)}</div>`;
    let sl;
    if (t.mode === 'tdm') sl = blk('a', mt.score.A, p.team === 'A' ? 'BLUE · you' : 'BLUE') + '<div class="gap"></div>' + blk('b', mt.score.B, 'RED');
    else if (t.mode === 'duel') { const k = G.bots[0]; sl = blk('a', p.kills, 'YOU', true) + '<div class="gap"></div>' + blk('b', k.kills, esc(k.name)); }
    else if (G.bots.length) {
      const lead = G.bots.reduce((a, b) => (b.kills > a.kills ? b : a), G.bots[0]);
      const place = 1 + G.bots.filter(b => b.kills > p.kills).length;
      sl = blk('a', p.kills, `YOU · #${place}`, true) + '<div class="gap"></div>' + blk('b', lead.kills, esc(lead.name));
    } else sl = blk('a', p.kills, 'YOU', true) + '<div class="gap"></div>' + blk('b', 0, '-');
    sl += `<small class="to">FIRST TO ${t.scoreToWin}</small>`;
    if (sl !== lastScore) { $('scoreline').innerHTML = sl; lastScore = sl; }
    const tm = Math.ceil(mt.time);
    $('timer').textContent = `${Math.floor(tm / 60)}:${String(tm % 60).padStart(2, '0')}`;
    $('timer').classList.toggle('low', tm <= 30);
    const sus = Math.round(mt.sus);
    $('sus-fill').style.width = sus + '%';
    $('sus-val').textContent = sus;
    $('sus').className = 's' + C.band(sus, 0);
    const killer = !p.alive && G.lastKiller && !G.lastKiller.isPlayer && G.bots.indexOf(G.lastKiller) >= 0 ? G.lastKiller : null;
    $('death-actions').classList.toggle('hidden', !killer);
    if (killer && UI.daFor !== killer) {
      UI.daFor = killer;
      $('da-name').textContent = `Killed by ${killer.name}`;
      $('da-report').disabled = !!killer.reported; $('da-report').textContent = killer.reported ? 'REPORTED' : 'REPORT';
      $('da-clip').disabled = !!killer.clipped; $('da-clip').textContent = killer.clipped ? 'CLIPPED' : 'CLIP IT';
    }
    if (!killer) UI.daFor = null;
    $('minimap').dataset.size = G.mods.adv.radarSize;
    $('det').classList.toggle('hidden', !G.ranked);
    if (G.ranked) {
      const d = Math.round(mt.det);
      $('det-fill').style.width = d + '%';
      $('det-val').textContent = G.legit ? 'LEGIT' : d + '%';
      $('det').className = d >= 80 ? 'hot' : d >= 50 ? 'warm' : '';
    }
    $('credits-live').textContent = `+${U.fmt(mt.liveCredits * m.payoutMult)} this match`;
    const hpw = Math.max(0, p.hp) + '%';
    $('hp-fill').style.width = hpw;
    $('hp-ghost').style.width = hpw;
    $('hp-fill').style.background = p.hp > 50 ? 'linear-gradient(90deg,#22c55e,#4ade80)' : p.hp > 25 ? 'linear-gradient(90deg,#eab308,#facc15)' : 'linear-gradient(90deg,#dc2626,#f87171)';
    if (UI.lastHp !== undefined && p.hp < UI.lastHp - 0.5) { const v = $('vitals'); v.classList.remove('hurt'); void v.offsetWidth; v.classList.add('hurt'); }
    UI.lastHp = p.hp;
    $('hp-val').textContent = Math.ceil(Math.max(0, p.hp));
    const w = G.curW(), wi = G.curInst();
    $('ammo-val').textContent = m.infAmmo ? '∞' : wi.ammo;
    $('ammo-max').textContent = m.infAmmo ? '' : '/' + w.mag;
    const wn = $('weapon-name');
    wn.textContent = p.reloadT > 0 ? 'RELOADING…' : (wi.rarity ? D.RARITY[wi.rarity].name + ' ' : '') + w.name;
    const am = $('ammo');
    am.classList.toggle('low', !m.infAmmo && wi.ammo <= Math.ceil(w.mag * 0.25));
    am.classList.toggle('reloading', p.reloadT > 0);
    if (p.reloadT > 0) $('ammo-rl').style.width = Math.round((1 - p.reloadT / (p.reloadTotal || 1)) * 100) + '%';
    wn.style.color = D.RARITY[wi.rarity].color;
    $('sh').classList.toggle('hidden', !p.maxShield);
    $('sh-fill').style.width = Math.max(0, p.shield / (p.maxShield || 100) * 100) + '%';
    $('sh-val').textContent = Math.ceil(p.shield);
    $('b-ads').classList.toggle('hidden', !w.scope && w.cls !== 'rifle' && w.cls !== 'lmg' && w.cls !== 'smg');
    $('b-ads').classList.toggle('on', G.ads);
    const nl = G.nearLoot;
    $('b-pick').classList.toggle('hidden', !nl);
    if (nl) $('b-pick').innerHTML = `PICK UP<small style="color:${D.RARITY[nl.rarity].color}">${esc(D.RARITY[nl.rarity].name + ' ' + G.lootLabel(nl))}</small>`;
    $('b-swap').classList.toggle('dim', !p.slots[p.slot === 0 ? 1 : 0]);
    const now = performance.now();
    const feed = mt.killfeed.filter(k => now - k.t < 6000).slice(-4)
      .map(k => `<div class="kf ${k.mine ? 'mine' : ''}"><span class="${tc(k.kt)}">${esc(k.k)}</span> ${k.wb ? '<span class="hs">▦</span>' : ''}${k.knife ? '<span class="kn">🔪</span>' : k.head ? '<span class="hs">◎</span>' : '›'} <span class="${tc(k.vt)}">${esc(k.v)}</span></div>`).join('');
    if (feed !== lastFeed) { $('killfeed').innerHTML = feed; lastFeed = feed; }
  };

  // ---------------------------------------------------------------- overlay (crosshair, ESP, damage)
  UI.resize = function (w, h) {
    UI.dpr = Math.min(window.devicePixelRatio || 1, 2);
    UI.ov.width = Math.round(w * UI.dpr);
    UI.ov.height = Math.round(h * UI.dpr);
    checkRotate();
  };
  function project(x, y, z, w, h) {
    const cam = NA.R.camera;
    pv.set(x, y, z).applyMatrix4(cam.matrixWorldInverse);
    if (pv.z > -0.15) return null;
    pv.applyMatrix4(cam.projectionMatrix);
    return { x: (pv.x + 1) * 0.5 * w, y: (1 - pv.y) * 0.5 * h };
  }
  UI.project = project;
  UI.drawOverlay = function (now) {
    const g = UI.ovg;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, UI.ov.width, UI.ov.height);
    if (G.state !== 'playing' || !G.player || UI.current !== 'hud') return;
    g.setTransform(UI.dpr, 0, 0, UI.dpr, 0, 0);
    const w = innerWidth, h = innerHeight, p = G.player, m = G.mods;
    const cw = G.curW();
    if (G.ads && (cw.scope || 0) >= 2.5 && p.alive) drawScope(g, w, h);
    if (m.lootEsp) drawLootESP(g, w, h);
    if (m.esp) drawESP(g, w, h);
    drawAllyTags(g, w, h);
    if (p.alive) {
      if (m.aimbot && m.aimbot.fovCircle && m.aimbot.fov < 180) {
        const r = Math.tan(m.aimbot.fov / 2 * U.DEG) / Math.tan(NA.R.camera.fov * U.DEG / 2) * h / 2;
        if (r < Math.max(w, h)) { g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1; g.beginPath(); g.arc(w / 2, h / 2, r, 0, Math.PI * 2); g.stroke(); }
      }
      if (G.silentTarget) {
        const st = G.silentTarget, s = project(st.x, st.y, st.z, w, h);
        if (s) { g.strokeStyle = '#ff3b5c'; g.lineWidth = 1.5; g.beginPath(); g.arc(s.x, s.y, 5, 0, Math.PI * 2); g.stroke(); }
      }
      drawCrosshair(g, w, h, now);
    }
    if (UI.hurtA > 0) {
      UI.hurtA = Math.max(0, UI.hurtA - 0.02);
      const grad = g.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.85);
      grad.addColorStop(0, 'rgba(255,0,0,0)'); grad.addColorStop(1, `rgba(220,20,30,${UI.hurtA})`);
      g.fillStyle = grad; g.fillRect(0, 0, w, h);
    }
    if (UI.hurtAng !== null && now - UI.hurtAngT < 900) {
      const a = UI.hurtAng, R = Math.min(w, h) * 0.22;
      g.strokeStyle = `rgba(255,60,60,${1 - (now - UI.hurtAngT) / 900})`; g.lineWidth = 6; g.beginPath();
      g.arc(w / 2, h / 2, R, -Math.PI / 2 - a - 0.3, -Math.PI / 2 - a + 0.3); g.stroke();
    }
    if (!p.alive) { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, 0, w, h); }
  };
  function drawCrosshair(g, w, h, now) {
    const p = G.player, e = G.eye(tv1), d = G.aimDir(tv2);
    const s = project(e.x + d.x * 25, e.y + d.y * 25, e.z + d.z * 25, w, h) || { x: w / 2, y: h / 2 };
    const r = Math.tan(G.spreadCone() * U.DEG) / Math.tan(NA.R.camera.fov * U.DEG / 2) * h / 2;
    if (r > 5) { g.beginPath(); g.arc(s.x, s.y, r, 0, Math.PI * 2); g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 1; g.stroke(); }
    const gap = Math.max(4, Math.min(r * 0.5, 22)), len = 7;
    const style = NA.Save.data.cosmetics.style || 'cross';
    const col = G.aimLock ? '#ff3b5c' : NA.Prog.crossColor(now);
    const lines = style === 'tee' ? [[0, 1], [-1, 0], [1, 0]] : [[0, -1], [0, 1], [-1, 0], [1, 0]];
    for (const pass of [0, 1]) {
      g.strokeStyle = pass ? col : 'rgba(0,0,0,0.65)';
      g.lineWidth = pass ? 2 : 4;
      g.beginPath();
      if (style === 'circle') g.arc(s.x, s.y, gap + 2, 0, Math.PI * 2);
      else if (style === 'chevron') { g.moveTo(s.x - gap - 4, s.y + gap + 2); g.lineTo(s.x, s.y + 2); g.lineTo(s.x + gap + 4, s.y + gap + 2); }
      else if (style !== 'dot') for (const [lx, ly] of lines) { g.moveTo(s.x + lx * gap, s.y + ly * gap); g.lineTo(s.x + lx * (gap + len), s.y + ly * (gap + len)); }
      g.stroke();
    }
    g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(s.x - 2.5, s.y - 2.5, 5, 5);
    g.fillStyle = col; g.fillRect(s.x - 1.5, s.y - 1.5, 3, 3);
    const ht = (now - UI.hitT) / 1000;
    if (ht < 0.18) {
      g.strokeStyle = UI.hitHead ? '#ff3b5c' : UI.hitShield ? '#38bdf8' : '#ffffff'; g.lineWidth = 2.5; g.beginPath();
      for (const [lx, ly] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { g.moveTo(s.x + lx * 6, s.y + ly * 6); g.lineTo(s.x + lx * 13, s.y + ly * 13); }
      g.stroke();
    }
    if (p.reloadT > 0) {
      g.strokeStyle = '#fde047'; g.lineWidth = 3; g.beginPath();
      g.arc(s.x, s.y, 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - p.reloadT / p.reloadTotal)); g.stroke();
    }
  }
  function drawScope(g, w, h) {
    const r = h * 0.46;
    g.save();
    g.fillStyle = '#000';
    g.beginPath(); g.rect(0, 0, w, h); g.arc(w / 2, h / 2, r, 0, Math.PI * 2, true); g.fill('evenodd');
    g.strokeStyle = 'rgba(0,0,0,0.85)'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(w / 2 - r, h / 2); g.lineTo(w / 2 + r, h / 2); g.moveTo(w / 2, h / 2 - r); g.lineTo(w / 2, h / 2 + r); g.stroke();
    g.restore();
  }
  function label(g, text, x, y, color) {
    g.fillStyle = 'rgba(0,0,0,0.85)'; g.fillText(text, x + 1, y + 1);
    g.fillStyle = color; g.fillText(text, x, y);
  }
  function drawLootESP(g, w, h) {
    const m = G.mods, o = m.lootOpt, p = G.player, lvl = m.lootEsp;
    const minR = lvl >= 2 ? +o.minRarity || 0 : 0;
    g.font = '600 10px -apple-system, system-ui, sans-serif';
    g.textAlign = 'center';
    for (const it of G.loot) {
      if (!it.alive) continue;
      if (it.kind === 'weapon' && (!o.weapons || it.rarity < minR)) continue;
      if (it.kind === 'shield' && (lvl < 3 || !o.shields)) continue;
      if (it.kind === 'med' && (lvl < 3 || !o.meds)) continue;
      const d = p.pos.distanceTo(it.pos);
      if (d > 90) continue;
      const s = project(it.pos.x, it.pos.y + 0.7, it.pos.z, w, h);
      if (!s) continue;
      const col = it.kind === 'shield' ? '#38bdf8' : it.kind === 'med' ? '#f8fafc' : D.RARITY[it.rarity].color;
      g.fillStyle = col; g.beginPath(); g.moveTo(s.x, s.y - 4); g.lineTo(s.x + 4, s.y); g.lineTo(s.x, s.y + 4); g.lineTo(s.x - 4, s.y); g.fill();
      if (d > 35 && it.rarity < 3) continue;
      const name = it.kind === 'weapon' ? `${D.RARITY[it.rarity].name} ${D.WEAPONS[it.id].name}` : G.lootLabel(it);
      label(g, `${name} ${Math.round(d)}m`, s.x, s.y - 7, col);
    }
  }
  const JOINTS = { head: [0, 1.66, 0], neck: [0, 1.44, 0], pelvis: [0, 0.8, 0], ls: [-0.38, 1.4, 0], rs: [0.38, 1.4, 0], lh: [-0.2, 1.3, -0.55], rh: [0.38, 1.38, -0.6], lf: [-0.125, 0.03, 0], rf: [0.125, 0.03, 0] };
  const BONES = [['head', 'neck'], ['neck', 'pelvis'], ['neck', 'ls'], ['ls', 'lh'], ['neck', 'rs'], ['rs', 'rh'], ['pelvis', 'lf'], ['pelvis', 'rf']];
  function drawESP(g, w, h) {
    const lvl = G.mods.esp, o = G.mods.espOpt, p = G.player;
    const has = (k, min) => lvl >= min && o[k];
    g.font = '600 10px -apple-system, system-ui, sans-serif';
    g.textAlign = 'center';
    // text only for the nearest few, or a big lobby turns into soup
    const list = G.bots.filter(b => b.alive && G.isEnemy(p, b)).map(b => [p.pos.distanceTo(b.pos), b]).sort((a, c) => a[0] - c[0]);
    list.forEach(([dist, b], idx) => {
      if (dist > G.mods.adv.espDist) return;
      const text = idx < 6 && dist < 90;
      let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9, ok = true;
      for (const cx of [-0.4, 0.4]) for (const cy of [0, 1.86]) for (const cz of [-0.4, 0.4]) {
        const s = project(b.pos.x + cx, b.pos.y + cy, b.pos.z + cz, w, h);
        if (!s) { ok = false; break; }
        if (s.x < minX) minX = s.x; if (s.x > maxX) maxX = s.x; if (s.y < minY) minY = s.y; if (s.y > maxY) maxY = s.y;
      }
      if (!ok) return;
      const bw = maxX - minX, bh = maxY - minY, cx = (minX + maxX) / 2;
      const bot = has('botTag', 4);
      const sch = G.mods.adv.espColor;
      const vc = sch === 'ice' ? ['#7dd3fc', '#3b82f6'] : sch === 'mono' ? ['#ffffff', '#94a3b8'] : sch === 'rainbow' ? [`hsl(${(performance.now() / 10 + idx * 40) % 360},90%,60%)`, `hsl(${(performance.now() / 10 + idx * 40) % 360},90%,45%)`] : ['#ffd23f', '#ff2f5b'];
      const col = b.frozenT > 0 ? '#9be7ff' : bot ? '#22d3ee' : b.visToPlayer ? vc[0] : vc[1];
      if (has('box', 1) || !has('skeleton', 4)) {
        g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 3; g.strokeRect(minX, minY, bw, bh);
        g.strokeStyle = col; g.lineWidth = 1.5; g.strokeRect(minX, minY, bw, bh);
      }
      let bx = minX - 6;
      if (has('health', 2)) {
        const k = Math.max(0, b.hp / b.maxHp);
        g.fillStyle = 'rgba(0,0,0,0.7)'; g.fillRect(bx, minY, 4, bh);
        g.fillStyle = k > 0.5 ? '#4ade80' : k > 0.25 ? '#facc15' : '#f87171'; g.fillRect(bx, minY + bh * (1 - k), 4, bh * k);
        bx -= 6;
      }
      if (has('shield', 2) && b.maxShield) {
        const k = Math.max(0, b.shield / b.maxShield);
        g.fillStyle = 'rgba(0,0,0,0.7)'; g.fillRect(bx, minY, 4, bh);
        g.fillStyle = '#38bdf8'; g.fillRect(bx, minY + bh * (1 - k), 4, bh * k);
      }
      let ty = minY - 4;
      if (text && has('name', 3)) { label(g, b.name, cx, ty, '#ffffff'); ty -= 11; }
      const tags = [];
      if (bot) tags.push('[BOT]');
      if (has('platform', 4)) tags.push(b.platform);
      if (has('rank', 4)) tags.push(b.rank);
      if (!text) tags.length = 0;
      if (tags.length) label(g, tags.join(' · '), cx, ty, bot ? '#67e8f9' : '#cbd5e1');
      let by = maxY + 11;
      const under = [];
      if (has('distance', 3)) under.push(Math.round(dist) + 'm');
      if (has('kills', 4)) under.push(b.kills + ' K');
      if (text && under.length) { label(g, under.join(' · '), cx, by, '#fde047'); by += 11; }
      if (text && has('weapon', 3)) label(g, D.WEAPONS[b.weapon].name + (b.reloadT > 0 ? ' (reloading)' : ''), cx, by, '#e2e8f0');
      if (has('skeleton', 4)) {
        const cy = Math.cos(b.yaw), sy = Math.sin(b.yaw), pts = {};
        for (const k in JOINTS) {
          const j = JOINTS[k];
          pts[k] = project(b.pos.x + j[0] * cy + j[2] * sy, b.pos.y + j[1], b.pos.z - j[0] * sy + j[2] * cy, w, h);
        }
        g.strokeStyle = '#f8fafc'; g.lineWidth = 1.5; g.beginPath();
        for (const [a, c] of BONES) if (pts[a] && pts[c]) { g.moveTo(pts[a].x, pts[a].y); g.lineTo(pts[c].x, pts[c].y); }
        g.stroke();
      }
      if (has('snaplines', 5)) {
        g.strokeStyle = 'rgba(253,224,71,0.8)'; g.lineWidth = 1.2; g.beginPath();
        g.moveTo(w / 2, h); g.lineTo(cx, maxY); g.stroke();
      }
    });
  }
  function drawAllyTags(g, w, h) {
    const p = G.player;
    g.font = '700 11px -apple-system, system-ui, sans-serif';
    g.textAlign = 'center';
    for (const b of G.bots) {
      if (!b.alive || !G.isAlly(b) || p.pos.distanceTo(b.pos) > 50) continue;
      const s = project(b.pos.x, b.pos.y + 2.1, b.pos.z, w, h);
      if (!s) continue;
      const tw = g.measureText(b.name).width + 12;
      g.fillStyle = 'rgba(8,11,19,0.6)';
      if (g.roundRect) { g.beginPath(); g.roundRect(s.x - tw / 2, s.y - 11, tw, 15, 7); g.fill(); } else g.fillRect(s.x - tw / 2, s.y - 11, tw, 15);
      g.fillStyle = '#60a5fa'; g.fillRect(s.x - tw / 2 + 3, s.y - 6, 4, 4);
      g.fillStyle = '#dbeafe'; g.fillText(b.name, s.x + 3, s.y);
    }
  }
  UI.drawMinimap = function () {
    if (UI.current !== 'hud' || !G.player || !NA.World.current) return;
    const cv = $('minimap'), g = cv.getContext('2d'), Wd = NA.World.current, S = cv.width;
    g.clearRect(0, 0, S, S);
    const p = G.player, big = Math.max(Wd.def.size[0], Wd.def.size[1]);
    // big maps: a 70 m window that follows you
    const view = Math.min(big, 70), sc = (S - 20) / view;
    const cxw = big > 70 ? p.pos.x : 0, czw = big > 70 ? p.pos.z : 0;
    const X = x => S / 2 + (x - cxw) * sc, Z = z => S / 2 + (z - czw) * sc;
    g.fillStyle = 'rgba(203,213,225,0.55)';
    for (const c of Wd.colliders) {
      if (c.maxY <= 0.05) continue;
      g.fillRect(X(c.minX), Z(c.minZ), (c.maxX - c.minX) * sc, (c.maxZ - c.minZ) * sc);
    }
    if (G.mods.lootEsp) {
      for (const it of G.loot) {
        if (!it.alive || it.kind !== 'weapon' || it.rarity < 2) continue;
        g.fillStyle = D.RARITY[it.rarity].color; g.fillRect(X(it.pos.x) - 3, Z(it.pos.z) - 3, 6, 6);
      }
    }
    for (const b of G.bots) {
      if (!b.alive) continue;
      const ally = G.isAlly(b);
      if (!ally && !G.mods.radar) continue;
      g.fillStyle = ally ? '#60a5fa' : '#f43f5e';
      g.beginPath(); g.arc(X(b.pos.x), Z(b.pos.z), big > 70 ? 5 : 7, 0, Math.PI * 2); g.fill();
    }
    const px = X(p.pos.x), pz = Z(p.pos.z), fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
    g.fillStyle = '#ffffff'; g.beginPath();
    g.moveTo(px + fx * 14, pz + fz * 14);
    g.lineTo(px - fz * 8 - fx * 7, pz + fx * 8 - fz * 7);
    g.lineTo(px + fz * 8 - fx * 7, pz - fx * 8 - fz * 7);
    g.closePath(); g.fill();
  };

  // ---------------------------------------------------------------- input
  function tap(el, fn) {
    el.addEventListener('touchstart', e => { e.preventDefault(); e.stopPropagation(); A.unlock(); fn(); }, { passive: false });
    el.addEventListener('click', fn);
  }
  function press(role) {
    if (role === 'jump') G.jump();
    else if (role === 'reload') G.reload();
    else if (role === 'swap') G.swapWeapon();
    else if (role === 'ads') G.toggleAds();
    else if (role === 'pick') G.pickup();
    else if (role === 'knife') G.knife();
  }
  function initTouch() {
    const el = $('touch'), joy = $('joy'), knob = $('joy-knob'), T = {};
    const has = role => Object.keys(T).some(k => T[k].role === role);
    const hideJoy = () => { joy.classList.remove('on'); el.classList.remove('joy-on'); knob.style.transform = ''; };
    el.addEventListener('touchstart', e => {
      e.preventDefault();
      A.unlock();
      if (G.state !== 'playing' || G.paused) return;
      for (const t of e.changedTouches) {
        const b = t.target && t.target.closest ? t.target.closest('[data-btn]') : null;
        if (b) {
          b.classList.add('down');
          if (b.dataset.btn === 'fire') { T[t.identifier] = { role: 'fire', x: t.clientX, y: t.clientY, el: b }; G.input.fire = true; }
          else { T[t.identifier] = { role: 'btn', el: b }; press(b.dataset.btn); }
          continue;
        }
        if (t.clientX < innerWidth * 0.42 && !has('joy')) {
          T[t.identifier] = { role: 'joy', ox: t.clientX, oy: t.clientY };
          joy.style.left = t.clientX + 'px'; joy.style.top = t.clientY + 'px';
          joy.classList.add('on'); el.classList.add('joy-on');
        } else if (!has('look')) T[t.identifier] = { role: 'look', x: t.clientX, y: t.clientY };
      }
    }, { passive: false });
    el.addEventListener('touchmove', e => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        const r = T[t.identifier];
        if (!r) continue;
        if (r.role === 'joy') {
          let dx = t.clientX - r.ox, dy = t.clientY - r.oy;
          const d = Math.hypot(dx, dy), max = 50;
          if (d > max) { dx *= max / d; dy *= max / d; }
          G.input.mx = dx / max; G.input.mz = -dy / max;
          knob.style.transform = `translate(${dx}px, ${dy}px)`;
        } else if (r.role === 'look' || r.role === 'fire') {
          const s = 0.0045 * NA.Save.data.settings.sens;
          G.input.lookDX += (t.clientX - r.x) * s;
          G.input.lookDY += (t.clientY - r.y) * s;
          r.x = t.clientX; r.y = t.clientY;
        }
      }
    }, { passive: false });
    const end = e => {
      for (const t of e.changedTouches) {
        const r = T[t.identifier];
        if (!r) continue;
        if (r.el) r.el.classList.remove('down');
        if (r.role === 'joy') { G.input.mx = 0; G.input.mz = 0; hideJoy(); }
        delete T[t.identifier];
        if (r.role === 'fire' && !has('fire')) G.input.fire = false;
      }
    };
    el.addEventListener('touchend', end);
    el.addEventListener('touchcancel', end);
    UI.resetTouch = () => {
      for (const k of Object.keys(T)) delete T[k];
      G.input.mx = 0; G.input.mz = 0; G.input.fire = false;
      hideJoy();
      document.querySelectorAll('.tb.down').forEach(b => b.classList.remove('down'));
    };
  }
  function initDesktop() {
    $('touch').addEventListener('mousedown', e => {
      if (G.state !== 'playing' || G.paused) return;
      if (!document.pointerLockElement) {
        try { const r = document.body.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (err) { /* no pointer lock */ }
        return;
      }
      if (e.button === 0) G.input.fire = true;
      if (e.button === 2) G.toggleAds(true);
    });
    $('touch').addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('mouseup', e => { if (e.button === 2 && !U.isTouch) G.toggleAds(false); });
    window.addEventListener('mouseup', e => { if (e.button === 0 && !U.isTouch) G.input.fire = false; });
    document.addEventListener('mousemove', e => {
      if (!document.pointerLockElement || G.state !== 'playing' || G.paused) return;
      const s = 0.0022 * NA.Save.data.settings.sens;
      G.input.lookDX += e.movementX * s;
      G.input.lookDY += e.movementY * s;
    });
    document.addEventListener('pointerlockchange', () => {
      const locked = !!document.pointerLockElement;
      $('aim-hint').classList.toggle('hidden', locked || U.isTouch || UI.current !== 'hud');
      if (!locked) G.input.fire = false;
      if (!locked && G.state === 'playing' && !G.paused && !UI.cheatOpen && !UI.chatOpen) UI.pause();
    });
    window.addEventListener('keydown', e => {
      if (UI.chatOpen) { if (e.key === 'Escape') UI.closeChat(); return; }
      const k = e.key.toLowerCase();
      UI.keys[k] = true;
      if (G.state !== 'playing' || G.paused) return;
      if (k === ' ') { G.jump(); e.preventDefault(); }
      else if (k === 'r') G.reload();
      else if (k === 'q') G.swapWeapon();
      else if (k === '1') G.selectSlot(0);
      else if (k === '2') G.selectSlot(1);
      else if (k === 'e' || k === 'f') G.pickup();
      else if (k === 'v') G.knife();
      else if (k === 'z') G.toggleAds();
      else if (e.key === 'Insert' || e.key === '`') { UI.toggleCheatMenu(); e.preventDefault(); }
      else if (e.key === 'End') { G.setPanic(!G.panic); if (UI.cheatOpen) UI.renderCheatMenu(); }
      else if (e.key === 'Enter') { UI.openChat(); e.preventDefault(); }
      else if (k === 'tab') e.preventDefault();
    });
    window.addEventListener('keyup', e => { UI.keys[e.key.toLowerCase()] = false; });
    window.addEventListener('blur', () => { UI.keys = {}; });
  }
  // ---------------------------------------------------------------- controller (Gamepad API: MFi, Xbox, DualSense on iOS 14+)
  const padPrev = [];
  function pollPad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let pad = null;
    for (const pp of pads) if (pp && pp.connected) { pad = pp; break; }
    if (!pad) { if (UI.padName) { UI.padName = null; UI.toast('Controller disconnected'); } return false; }
    if (!UI.padName) { UI.padName = pad.id.replace(/\(.*?\)/g, '').trim().slice(0, 40) || 'Gamepad'; UI.toast('Controller connected'); }
    const ax = i => { const v = pad.axes[i] || 0; return Math.abs(v) < 0.15 ? 0 : (v - Math.sign(v) * 0.15) / 0.85; };
    const btn = i => !!(pad.buttons[i] && (pad.buttons[i].pressed || pad.buttons[i].value > 0.5));
    const edge = i => { const now = btn(i), was = padPrev[i]; padPrev[i] = now; return now && !was; };
    const playing = G.state === 'playing' && !G.paused;
    if (edge(9)) { if (playing) UI.pause(); else if (G.paused) UI.resume(); }
    if (edge(8) && G.state === 'playing') UI.toggleCheatMenu();
    if (!playing) { for (let i = 0; i < 16; i++) padPrev[i] = btn(i); return true; }
    const mx = ax(0), mz = -ax(1);
    if (mx || mz || UI.padMoved) { G.input.mx = mx; G.input.mz = mz; UI.padMoved = !!(mx || mz); }
    const s = 0.045 * NA.Save.data.settings.sens;
    const lx = ax(2), ly = ax(3);
    G.input.lookDX += lx * Math.abs(lx) * s * 2.2;
    G.input.lookDY += ly * Math.abs(ly) * s * 1.6;
    const rt = btn(7);
    if (rt !== !!padPrev.rt) { G.input.fire = rt; padPrev.rt = rt; }
    const lt = btn(6);
    if (lt !== !!padPrev.lt) { G.toggleAds(lt); padPrev.lt = lt; }
    if (edge(0)) G.jump();
    if (edge(1)) G.pickup();
    if (edge(2)) G.reload();
    if (edge(3)) G.swapWeapon();
    if (edge(12)) { G.setPanic(!G.panic); if (UI.cheatOpen) UI.renderCheatMenu(); }
    if (edge(4)) G.selectSlot(0);
    if (edge(5)) G.selectSlot(1);
    return true;
  }
  UI.applyKeys = function () {
    pollPad();
    const k = UI.keys;
    if (!(k.w || k.a || k.s || k.d || k.arrowup || k.arrowdown || k.arrowleft || k.arrowright)) {
      if (UI.keysWereDown) { G.input.mx = 0; G.input.mz = 0; UI.keysWereDown = false; }
      return;
    }
    UI.keysWereDown = true;
    G.input.mx = ((k.d || k.arrowright) ? 1 : 0) - ((k.a || k.arrowleft) ? 1 : 0);
    G.input.mz = ((k.w || k.arrowup) ? 1 : 0) - ((k.s || k.arrowdown) ? 1 : 0);
  };
  function checkRotate() {
    const portrait = U.isTouch && innerHeight > innerWidth;
    $('rotate').classList.toggle('hidden', !portrait);
    if (portrait && G && G.state === 'playing' && !G.paused) UI.pause();
  }

  // ---------------------------------------------------------------- init
  UI.init = function () {
    G = NA.Game;
    UI.ov = $('overlay');
    UI.ovg = UI.ov.getContext('2d');
    if (U.isTouch) document.body.classList.add('touch');
    const click = (id, fn) => $(id).addEventListener('click', () => { A.unlock(); A.click(); fn(); });

    let going = false;
    click('title-go', () => {
      if (going) return;
      going = true;
      A.intro();
      NA.haptic('MEDIUM');
      $('scr-title').classList.add('go');
      document.querySelector('.title-v5').classList.add('go');
      setTimeout(() => {
        going = false;
        $('scr-title').classList.remove('go');
        document.querySelector('.title-v5').classList.remove('go');
        if (!NA.Save.data.username) { $('name-input').value = 'newplayer_' + U.randInt(1000, 9999); UI.show('scr-name'); }
        else UI.showMenu();
      }, 620);
    });
    // tap anywhere on the title screen
    $('scr-title').addEventListener('click', e => { if (!e.target.closest('#title-go')) $('title-go').click(); });
    // after the loader's INJECT: straight to name entry (first time) or the lobby
    UI.afterInject = () => {
      if (!NA.Save.data.username) { $('name-input').value = 'newplayer_' + U.randInt(1000, 9999); UI.show('scr-name'); }
      else UI.showMenu();
    };
    click('m-items', () => NA.Store.open('shop'));
    click('m-locker', () => NA.Store.open('locker'));
    // the character in the lobby: drag to spin it, tap to open the Locker
    const spinZone = (el, onTap) => {
      let id = null, sx = 0, lx = 0, lt = 0, v = 0, moved = 0;
      el.addEventListener('pointerdown', e => { id = e.pointerId; sx = lx = e.clientX; lt = performance.now(); moved = 0; v = 0; try { el.setPointerCapture(id); } catch (er) { /* old webkit */ } });
      el.addEventListener('pointermove', e => {
        if (e.pointerId !== id) return;
        const dx = e.clientX - lx, now = performance.now();
        moved += Math.abs(dx);
        NA.Showroom.spinBy(dx * 0.012);
        v = dx * 0.012 / Math.max(0.008, (now - lt) / 1000);
        lx = e.clientX; lt = now;
      });
      const up = e => {
        if (e.pointerId !== id) return;
        id = null;
        if (moved < 8 && onTap && Math.abs(e.clientX - sx) < 8) onTap();
        else if (performance.now() - lt < 80) NA.Showroom.fling(U.clamp(v, -12, 12));
      };
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
    };
    spinZone($('lobby-char'), () => { A.unlock(); A.click(); NA.Store.open('locker'); });
    spinZone($('store-char'), null);
    click('name-go', () => {
      let n = $('name-input').value.trim().replace(/[^A-Za-z0-9_.-]/g, '').slice(0, 18);
      if (n.length < 3) n = 'newplayer_' + U.randInt(1000, 9999);
      NA.Save.data.username = n;
      NA.Save.data.createdAt = Date.now();
      NA.Save.save();
      UI.showMenu();
    });
    click('m-play', () => UI.showPlay());
    click('m-shop', () => UI.showShop('scr-menu'));
    click('m-ranks', () => UI.showRanks());
    click('m-comms', () => { if (NA.Comms) NA.Comms.open(); });
    document.getElementById('scr-ranks').addEventListener('click', e => {
      if (e.target.id === 'rk-prest-btn') {
        if (UI.prestArm) { UI.prestArm = false; if (NA.Prog.prestige()) { A.win(); UI.toast(`Prestige ${NA.Save.data.prestige}!`); } UI.showRanks(); }
        else { UI.prestArm = true; e.target.textContent = 'TAP AGAIN: tiers reset to 1'; setTimeout(() => { UI.prestArm = false; }, 3000); }
      }
    });
    const findBot = name => G.bots.find(b => b.name === name);
    $('pause-players').addEventListener('click', e => {
      const r = e.target.closest('[data-prep]'), c = e.target.closest('[data-pclip]');
      if (r) { G.report(findBot(r.dataset.prep)); UI.renderPausePlayers(); }
      if (c) { G.clip(findBot(c.dataset.pclip)); UI.renderPausePlayers(); }
    });
    tap($('da-report'), () => { if (UI.daFor) { G.report(UI.daFor); $('da-report').disabled = true; $('da-report').textContent = 'REPORTED'; } });
    tap($('da-clip'), () => { if (UI.daFor) { G.clip(UI.daFor); $('da-clip').disabled = true; $('da-clip').textContent = 'CLIPPED'; } });
    $('res-board').addEventListener('click', e => {
      const b = e.target.closest('[data-rep]');
      if (!b) return;
      const bot = findBot(b.dataset.rep);
      if (bot && G.report(bot)) { b.disabled = true; b.textContent = 'reported'; }
    });
    $('set-xstyle').addEventListener('click', e => {
      const b = e.target.closest('[data-xs]'); if (!b) return;
      if (!NA.Prog.owns('style', b.dataset.xs)) { A.deny(); UI.toast('Unlocks by ranking up in Ranked'); return; }
      NA.Save.data.cosmetics.style = b.dataset.xs; NA.Save.save(); A.click(); UI.renderCrosshairPick();
    });
    $('set-xcolor').addEventListener('click', e => {
      const b = e.target.closest('[data-xc]'); if (!b) return;
      if (!NA.Prog.owns('color', b.dataset.xc)) { A.deny(); UI.toast('Unlocks by ranking up in Ranked'); return; }
      NA.Save.data.cosmetics.color = b.dataset.xc; NA.Save.save(); A.click(); UI.renderCrosshairPick();
    });
    click('m-profile', () => UI.showProfile());
    click('m-settings', () => UI.showSettings('scr-menu'));
    document.querySelectorAll('[data-back]').forEach(b => b.addEventListener('click', () => { A.click(); if (b.dataset.back === 'scr-menu') UI.showMenu(); else UI.show(b.dataset.back); }));
    document.querySelector('[data-back-shop]').addEventListener('click', () => { A.click(); UI.shopBack(); });
    $('tier-list').addEventListener('click', e => {
      const ev = e.target.closest('[data-event]');
      if (ev) { A.unlock(); A.click(); if (!NA.Events.play(ev.dataset.event)) A.deny(); return; }
      const tt = e.target.closest('[data-tourney]');
      if (tt) {
        if (tt.classList.contains('locked')) return;
        A.unlock(); A.click();
        if (!G.startTourney()) { A.deny(); UI.toast(`Entry fee is ${U.fmt(D.TOURNAMENT.fee)}`); }
        return;
      }
      const el = e.target.closest('[data-tier]');
      if (!el || el.classList.contains('locked')) return;
      A.unlock(); A.click();
      UI.queue(+el.dataset.tier);
    });
    $('shop-list').addEventListener('click', e => {
      const cb = e.target.closest('[data-cfg-buy]'), ca = e.target.closest('[data-cfg-apply]');
      if (cb) {
        const r = NA.Cfg.buy(cb.dataset.cfgBuy);
        if (!r.ok) { A.deny(); cb.classList.remove('shake'); void cb.offsetWidth; cb.classList.add('shake'); return; }
        A.buy();
        UI.toast(r.scam === 'never' ? 'Payment sent. Waiting for the seller…' : r.scam === 'trash' ? 'Config applied. Something feels off…' : 'Config applied' + (r.missing.length ? ` (you don't own: ${r.missing.slice(0, 3).join(', ')})` : ''));
        UI.renderShop(); return;
      }
      if (ca) { const c = NA.Cfg.CONFIGS.find(x => x.id === ca.dataset.cfgApply); const miss = NA.Cfg.apply(c.cfg); A.buy(); UI.toast(`Applied ${c.name}` + (miss.length ? ` (missing: ${miss.slice(0, 3).join(', ')})` : '')); return; }
      const gb = e.target.closest('[data-gun]'), eb = e.target.closest('[data-equip]');
      if (eb) { G.equipGun(eb.dataset.equip); A.click(); UI.toast('Equipped ' + D.WEAPONS[eb.dataset.equip].name); UI.renderShop(); return; }
      if (gb) {
        if (G.buyGun(gb.dataset.gun)) { UI.toast('Bought + equipped ' + D.WEAPONS[gb.dataset.gun].name); UI.renderShop(); }
        else { A.deny(); gb.classList.remove('shake'); void gb.offsetWidth; gb.classList.add('shake'); }
        return;
      }
      const b = e.target.closest('[data-buy]');
      if (!b) return;
      const id = b.dataset.buy;
      if (G.buy(id)) { UI.toast('Bought ' + D.CHEAT[id].name); UI.renderShop(); }
      else { A.deny(); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); }
    });
    click('res-shop', () => UI.showShop('scr-results'));
    click('res-again', () => {
      const t = G.match.tier;
      if (t.tourney !== undefined) { if (G.tourney) G.startMatch(G.tourneyTier(G.tourney.round)); else { G.toIdle(); UI.showPlay(); } }
      else if (t.lootMode || t.chaos) { if (!NA.Events.play(t.chaos ? 'chaos' : 'loot')) { G.toIdle(); UI.showPlay(); } }
      else UI.queue(t.id, G.ranked);
    });
    click('res-lobbies', () => { G.toIdle(); UI.showPlay(); });
    click('res-menu', () => { G.toIdle(); UI.showMenu(); });
    click('res-auto-cancel', () => UI.stopAuto());
    $('res-unlock').addEventListener('click', e => {
      if (e.target.closest('[data-next]') && G.tourney) { A.click(); G.startMatch(G.tourneyTier(G.tourney.round)); return; }
      const b = e.target.closest('[data-play]'); if (b) { A.click(); UI.queue(+b.dataset.play, G.ranked); }
    });
    click('pause-resume', () => UI.resume());
    $('diff-row').addEventListener('click', e => {
      const b = e.target.closest('[data-diff]');
      if (!b) return;
      A.click();
      NA.Save.data.settings.difficulty = b.dataset.diff; NA.Save.save();
      UI.showPlay();
    });
    click('mode-events', () => { NA.Save.data.playMode = 'events'; NA.Save.save(); A.click(); UI.showPlay(); });
    click('mode-casual', () => { NA.Save.data.playMode = 'casual'; NA.Save.save(); A.click(); UI.showPlay(); });
    click('mode-ranked', () => {
      if (!NA.Ranked.unlocked()) { A.deny(); UI.toast(`Ranked unlocks at Tier ${D.RANKED.unlockTier}`); return; }
      NA.Save.data.playMode = 'ranked'; NA.Save.save(); A.click(); UI.showPlay();
      if (!NA.Save.data.flags.rankedIntro) { NA.Save.data.flags.rankedIntro = true; NA.Chat.dm('ranked has a real anticheat. Warden. buy bypass gear, inject clean, and dont be obvious. if you get banned, appeal. it works sometimes'); }
    });
    $('ranked-panel').addEventListener('click', e => {
      const b = e.target.closest('[data-rk]');
      if (!b) return;
      const R = NA.Ranked, act = b.dataset.rk;
      if (act === 'appeal') UI.openAppeal();
      else if (act === 'patch') { if (R.patchNow()) { UI.toast('Bypass patched: undetected'); A.buy(); } else A.deny(); UI.showPlay(); }
      else if (act === 'alt') { if (R.makeAlt()) { UI.toast('New account created. Fresh start, same cheats.'); A.buy(); } else A.deny(); UI.showPlay(); }
    });
    setInterval(() => { if (UI.current === 'scr-play' && NA.Save.data.playMode === 'ranked') UI.renderRankedPanel(); }, 1000);
    click('ld-inject', () => UI.loaderInject());
    click('ld-legit', () => { const L = UI.loader; if (!L) return; UI.closeLoader(); G.startMatch(L.tierId, { ranked: true, legit: true, loader: 2 }); });
    click('ld-cancel', () => UI.closeLoader());
    click('ap-send', () => UI.submitAppeal());
    click('ap-cancel', () => $('appeal').classList.add('hidden'));
    $('ap-text').addEventListener('focus', () => { const r = document.querySelector('input[name=ap][value="-1"]'); if (r) r.checked = true; });
    click('pause-settings', () => UI.showSettings('scr-pause'));
    click('pause-leave', () => G.leaveMatch());
    click('set-back', () => { if (UI.settingsFrom === 'scr-pause' && G.state === 'playing') UI.show('scr-pause'); else UI.showMenu(); });
    $('set-sens').addEventListener('input', e => { NA.Save.data.settings.sens = +e.target.value; $('set-sens-v').textContent = (+e.target.value).toFixed(2); NA.Save.save(); });
    $('set-vol').addEventListener('input', e => { NA.Save.data.settings.volume = +e.target.value; A.setVolume(+e.target.value); $('set-vol-v').textContent = Math.round(e.target.value * 100) + '%'; NA.Save.save(); });
    $('set-auto').addEventListener('change', e => { NA.Save.data.settings.autoQueue = e.target.checked; NA.Save.save(); });
    $('set-fps').addEventListener('change', e => { NA.Save.data.settings.showFps = e.target.checked; NA.Save.save(); });
    click('set-reset', () => {
      if (!UI.resetArm) { UI.resetArm = true; $('set-reset').textContent = 'Tap again to erase everything'; setTimeout(() => { UI.resetArm = false; $('set-reset').textContent = 'Reset all progress'; }, 3000); return; }
      NA.Save.reset();
      location.reload();
    });
    // Hidden admin: tap the FRAGLINE logo 5 times quickly, hold the match timer for 1.5 s, or press Ctrl+Shift+A.
    // Raw touch events: iOS can swallow quick repeated taps on plain elements as a double-tap gesture.
    const onPress = (el, fn) => {
      let lastTouch = 0;
      el.addEventListener('touchstart', e => { lastTouch = performance.now(); fn(e, 'down'); }, { passive: false });
      el.addEventListener('mousedown', e => { if (performance.now() - lastTouch > 800) fn(e, 'down'); });
      ['touchend', 'touchcancel'].forEach(ev => el.addEventListener(ev, e => fn(e, 'up')));
      ['mouseup', 'mouseleave'].forEach(ev => el.addEventListener(ev, e => { if (performance.now() - lastTouch > 800) fn(e, 'up'); }));
    };
    const tapsToOpen = el => {
      let taps = [];
      onPress(el, (e, kind) => {
        if (kind !== 'down') return;
        if (e.cancelable) e.preventDefault();
        const now = performance.now();
        taps = taps.filter(t => now - t < 3000).concat(now);
        if (taps.length >= 5) { taps = []; UI.openAdmin(); }
      });
    };
    const holdToOpen = (el, ms) => {
      let t = null;
      onPress(el, (e, kind) => {
        clearTimeout(t);
        if (kind === 'down') { if (e.cancelable) e.preventDefault(); t = setTimeout(() => UI.openAdmin(), ms); }
      });
    };
    // 1) tap any FRAGLINE logo 5 times  2) hold your credits for 1.5 s  3) hold the match timer for 1.5 s  4) Ctrl+Shift+A
    document.querySelectorAll('.client-logo').forEach(el => { el.classList.add('adm-trigger'); tapsToOpen(el); });
    holdToOpen($('menu-credits'), 1500);
    $('menu-credits').classList.add('adm-trigger');
    const timer = $('timer');
    timer.style.pointerEvents = 'auto';
    timer.classList.add('adm-trigger');
    holdToOpen(timer, 1500);
    window.addEventListener('keydown', e => { if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') { e.preventDefault(); UI.adminOpen ? UI.closeAdmin() : UI.openAdmin(); } });
    $('adm-close').addEventListener('click', () => UI.closeAdmin());
    $('admin').addEventListener('click', e => {
      if (performance.now() - UI.adminAt < 500) return; // the tap that opened it
      if (e.target.id === 'admin') { UI.closeAdmin(); return; }
      const b = e.target.closest('[data-adm]');
      if (!b) return;
      A.click();
      const act = b.dataset.adm;
      if (act === 'reset') {
        if (!UI.admResetArm) { UI.admResetArm = true; UI.adminRefresh(); setTimeout(() => { UI.admResetArm = false; UI.adminRefresh(); }, 3000); return; }
        NA.Save.reset(); location.reload(); return;
      }
      const msg = G.admin(act, $('adm-amount').value);
      if (act === 'custom' && msg && msg[0] === '+') $('adm-amount').value = '';
      if (msg) UI.toast(msg);
      if (act === 'win') { UI.adminOpen = false; UI.adminPaused = false; $('admin').classList.add('hidden'); return; }
      UI.adminRefresh();
    });
    $('cm-close').addEventListener('click', () => UI.closeCheatMenu());
    $('cm-panic').addEventListener('click', () => { G.setPanic(!G.panic); UI.renderCheatMenu(); });
    $('cm-tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) { UI.cmTab = b.dataset.tab; A.click(); UI.renderCheatMenu(); } });
    $('cm-list').addEventListener('click', e => {
      const sv = e.target.closest('[data-psave]'), ld = e.target.closest('[data-pload]');
      if (sv) { NA.Cfg.saveProfile(sv.dataset.psave); A.click(); UI.toast(`Saved profile: ${sv.dataset.psave}`); UI.renderCheatMenu(); }
      if (ld) { const miss = NA.Cfg.loadProfile(ld.dataset.pload); A.buy(); UI.toast(`Loaded ${ld.dataset.pload}` + (miss && miss.length ? ` (missing: ${miss.join(', ')})` : '')); UI.renderCheatMenu(); }
    });
    $('cm-list').addEventListener('change', e => {
      const t = e.target;
      if (t.dataset.adv) { NA.Cfg.onAdvChange(t); if (t.type !== 'range') UI.renderCheatMenu(); return; }
      if (t.dataset.lang) { NA.Save.data.settings.lang = t.value; NA.Save.save(); UI.renderCheatMenu(); return; }
      if (t.dataset.opt) {
        const [id, key] = t.dataset.opt.split('.');
        const v = t.type === 'checkbox' ? t.checked : t.type === 'range' ? +t.value : (key === 'minRarity' ? +t.value : t.value);
        G.setOpt(id, key, v);
        if (t.tagName === 'SELECT' || t.type === 'checkbox') UI.renderCheatMenu();
        return;
      }
      const id = t.dataset.cm;
      if (!id) return;
      NA.Save.data.cheats[id].enabled = t.checked;
      NA.Save.save(); G.computeMods();
      UI.renderCheatMenu();
    });
    $('cm-list').addEventListener('input', e => {
      const t = e.target;
      if (t.dataset.adv && t.type === 'range') { NA.Cfg.onAdvChange(t); return; }
      if (t.dataset.opt && t.type === 'range') {
        const [id, key] = t.dataset.opt.split('.');
        G.setOpt(id, key, +t.value);
        if (t.nextElementSibling) t.nextElementSibling.textContent = t.value;
        return;
      }
      const id = t.dataset.lvl;
      if (!id) return;
      const st = NA.Save.data.cheats[id];
      st.use = +t.value;
      t.nextElementSibling.textContent = `${st.use}/${st.level}`;
      NA.Save.save(); G.computeMods();
    });
    $('cm-list').addEventListener('change', e => { if (e.target.dataset.lvl) UI.renderCheatMenu(); });
    $('set-lang').addEventListener('change', e => { NA.Save.data.settings.lang = e.target.value; NA.Save.save(); });
    $('set-gfx').addEventListener('change', e => NA.Graphics.set(e.target.value));
    window.addEventListener('gamepadconnected', () => { pollPad(); if (UI.current === 'scr-settings') UI.showSettings(UI.settingsFrom); });
    $('chat-form').addEventListener('submit', e => { e.preventDefault(); C.playerSays($('chat-input').value); UI.closeChat(); });
    tap($('b-chat'), () => UI.openChat());
    tap($('b-ins'), () => UI.toggleCheatMenu());
    tap($('b-pause'), () => UI.pause());
    window.addEventListener('keydown', e => {
      if (UI.chatOpen || G.state !== 'playing') return;
      if (e.key === 'F1' || e.key === 'F2') e.preventDefault();
    });
    initTouch();
    initDesktop();
    document.addEventListener('gesturestart', e => e.preventDefault());
    document.addEventListener('dblclick', e => e.preventDefault());
    document.addEventListener('visibilitychange', () => { if (document.hidden && G.state === 'playing' && !G.paused) UI.pause(); });
    window.addEventListener('resize', checkRotate);
    UI.show('scr-title');
  };

  NA.UI = UI;
})(window.NA);
