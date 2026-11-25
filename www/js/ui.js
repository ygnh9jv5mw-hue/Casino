/* NO ANTICHEAT: screens, HUD, overlay drawing (crosshair, ESP), shop, cheat menu and input. */
(function (NA) {
  'use strict';
  const U = NA.U, D = NA.DATA, A = NA.Audio, C = NA.Chat;
  const $ = id => document.getElementById(id);
  const esc = U.esc;
  const SCREENS = ['scr-title', 'scr-name', 'scr-menu', 'scr-play', 'scr-lobby', 'scr-results', 'scr-shop', 'scr-profile', 'scr-settings', 'scr-pause'];
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
    const t = D.TIERS.find(x => x.id === NA.Save.data.highestTier);
    return t ? t.rank : 'Wood V';
  }
  UI.showMenu = function () {
    const s = NA.Save.data;
    if (G.state === 'results') G.toIdle();
    $('menu-user').textContent = s.username;
    $('menu-rank').textContent = rankLabel();
    $('menu-credits').textContent = U.fmt(s.credits);
    const top = D.TIERS.find(t => t.id === Math.min(s.highestTier, D.MAX_PLAYABLE_TIER));
    $('m-play-sub').textContent = `Tier ${top.id}: ${top.name}`;
    $('menu-ticker').textContent = `Reports against you: ${U.num(s.stats.reports)}  ·  Action taken: 0  ·  Anticheat: Coming Soon™ (posted ${U.num(NA.Save.anticheatDays())} days ago)`;
    UI.refreshDMBadge();
    UI.show('scr-menu');
  };
  function botsLabel(t) {
    if (t.mode === 'duel') return '1v1';
    if (t.mode === 'tdm') return `${t.allies.length + 1}v${t.enemies.length}`;
    return `${t.enemies.length + 1} players`;
  }
  UI.showPlay = function () {
    const s = NA.Save.data, html = [];
    $('play-credits').textContent = U.fmt(s.credits);
    for (const t of D.TIERS) {
      const open = s.highestTier >= t.id, wins = s.winsByTier[t.id] || 0;
      let prog;
      if (!open) prog = `Locked: win Tier ${t.id - 1} first`;
      else if (t.id < D.MAX_PLAYABLE_TIER && s.highestTier <= t.id) prog = `${Math.min(wins, t.winsToUnlock)}/${t.winsToUnlock} wins to unlock Tier ${t.id + 1}`;
      else prog = `Wins: ${wins}`;
      html.push(`<button class="tier ${open ? 'open' : 'locked'} ${t.map === 'warehouse' ? 'w' : ''}" data-tier="${t.id}">
        <div class="swatch"></div><div class="tnum">TIER ${t.id} · ${t.rank}</div><div class="tname">${t.name}</div>
        <div class="tmeta">${t.modeLabel} · ${botsLabel(t)} · first to ${t.scoreToWin}</div>
        <div class="tpay">Win ₡${t.base} + ₡${t.kill}/kill</div><div class="tprog">${prog}</div></button>`);
    }
    for (const t of D.LOCKED_TIERS) {
      html.push(`<div class="tier soon locked"><div class="swatch"></div><div class="tnum">TIER ${t.id} · ${t.rank}</div>
        <div class="tname">${t.name}</div><div class="tmeta">Coming Soon™</div><div class="tprog">posted ${U.num(NA.Save.anticheatDays())} days ago</div></div>`);
    }
    $('tier-list').innerHTML = html.join('');
    UI.show('scr-play');
  };

  UI.showLobby = function () {
    const t = G.match.tier, p = G.player;
    $('lobby-title').textContent = t.name;
    $('lobby-sub').textContent = `${t.modeLabel} · ${D.MAPS[t.map].name} · first to ${t.scoreToWin}`;
    const row = (name, team, me) => `<div class="lp ${me ? 'me' : ''} ${team === 'A' || team === 'P' ? 'A' : 'B'}"><span>${esc(name)}</span><span>${me ? 'you' : U.randInt(18, 95) + ' ms'}</span></div>`;
    let html = row(p.name, p.team, true);
    for (const b of G.bots) html += row(b.name, b.team, false);
    $('lobby-players').innerHTML = html;
    $('lobby-count').textContent = '4';
    UI.show('scr-lobby');
  };
  UI.lobbyTick = n => { const el = $('lobby-count'); if (el.textContent !== String(n)) el.textContent = n; };

  UI.showHUD = function () {
    UI.show('hud');
    $('aim-hint').classList.toggle('hidden', U.isTouch || !!document.pointerLockElement);
    UI.hudTick();
  };
  UI.pause = function () {
    if (G.state !== 'playing' || G.paused) return;
    G.paused = true;
    UI.show('scr-pause');
  };
  UI.resume = function () { G.paused = false; UI.showHUD(); };

  // ---------------------------------------------------------------- results
  UI.showResults = function (r) {
    const t = G.match.tier, p = G.player;
    $('res-title').textContent = r.won ? 'VICTORY' : 'DEFEAT';
    $('res-title').className = r.won ? 'win' : 'lose';
    $('res-sub').textContent = `${t.name} · ${t.modeLabel}`;
    const order = t.mode === 'tdm' ? r.rows.filter(x => x.team === 'A').concat(r.rows.filter(x => x.team === 'B')) : r.rows;
    $('res-board').innerHTML = '<div class="row head"><span>Player</span><span>K</span><span>D</span></div>' +
      order.map(x => `<div class="row ${x.me ? 'me' : ''} ${t.mode === 'tdm' ? 't' + x.team : ''}"><span>${esc(x.name)}${x.spoof ? '<span class="spoof">spoofed</span>' : ''}</span><span>${x.k}</span><span>${x.d}</span></div>`).join('');
    $('res-stats').textContent = `Accuracy ${r.acc}% · Headshots ${p.headshots} · Peak suspicion ${r.peakSus}`;
    $('res-pay').innerHTML = r.pay.lines.map(l => `<div class="pl"><span>${esc(l[0])}</span><span>+${U.fmt(l[1])}</span></div>`).join('');
    countUp($('res-total'), r.pay.total);
    const un = $('res-unlock');
    un.classList.add('hidden'); un.classList.remove('soon');
    if (r.unlocked) {
      un.innerHTML = `<b>Tier ${r.unlocked.id} unlocked: ${esc(r.unlocked.name)}</b>${r.unlocked.id === 2 ? ' + AR-7 Rifle' : ''}${r.unlocked.id === 3 ? ' + new cheats in the shop' : ''}<br><button class="btn primary tiny" data-play="${r.unlocked.id}">PLAY TIER ${r.unlocked.id}</button>`;
      un.classList.remove('hidden');
    } else if (r.comingSoon) {
      un.innerHTML = "<b>You've beaten every lobby in this build.</b><br>Courtyard 5v5: Coming Soon™. Keep farming credits for the next update.";
      un.classList.add('soon'); un.classList.remove('hidden');
    }
    UI.refreshDMBadge();
    UI.show('scr-results');
    const s = NA.Save.data;
    if (NA.Save.level('autoqueue') && s.settings.autoQueue && !r.unlocked) UI.startAuto(t.id);
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
    const ach = { first_buy: "First One's Half Off", skill_issue: 'Skill Issue', placebo: 'Placebo', flawless: 'Flawless' };
    $('prof-body').innerHTML = [
      card(esc(s.username), 'Username'), card(rankLabel(), 'Rank'),
      card(NA.Save.accountAge() + ' days', 'Account age'), card(U.fmt(s.lifetimeCredits), 'Lifetime credits'),
      card(`${st.wins} / ${st.matches}`, 'Wins / matches'), card(kd, 'K/D'), card(acc + '%', 'Accuracy'),
      card(U.num(st.headshots), 'Headshots'), card(U.num(st.reports), 'Reports against you (action taken: 0)'),
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
  UI.showSettings = function (from) {
    UI.settingsFrom = from;
    const st = NA.Save.data.settings;
    $('set-sens').value = st.sens; $('set-sens-v').textContent = (+st.sens).toFixed(2);
    $('set-vol').value = st.volume; $('set-vol-v').textContent = Math.round(st.volume * 100) + '%';
    $('set-auto').checked = !!st.autoQueue; $('set-fps').checked = !!st.showFps;
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
  UI.renderCheatMenu = function () {
    const s = NA.Save.data, rows = [];
    let cat = '';
    for (const c of D.CHEATS) {
      if (!c.toggle) continue;
      if (c.cat !== cat) { rows.push(`<div class="cm-sec">${c.cat.toUpperCase()}</div>`); cat = c.cat; }
      const st = s.cheats[c.id];
      if (!st || !st.level) { rows.push(`<div class="cm-locked">[locked] ${esc(c.name)}: buy at skillissue.shop</div>`); continue; }
      const use = Math.min(st.use || st.level, st.level);
      const lvl = st.level > 1 ? `<div class="lvl">lvl <input type="range" min="1" max="${st.level}" step="1" value="${use}" data-lvl="${c.id}"><span>${use}/${st.level}</span></div>` : '';
      rows.push(`<div class="cm-row"><input type="checkbox" id="cm-${c.id}" data-cm="${c.id}" ${st.enabled !== false ? 'checked' : ''}><label for="cm-${c.id}">${esc(c.name)}</label>${lvl}</div>`);
    }
    $('cm-list').innerHTML = rows.join('');
    $('cm-panic').classList.toggle('on', G.panic);
    $('cm-panic').textContent = G.panic ? 'PANIC ON: tap to restore cheats' : 'PANIC (END): all cheats off';
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
  UI.hitmarker = head => { UI.hitT = performance.now(); UI.hitHead = head; };
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
    let sl;
    if (t.mode === 'tdm') sl = `<span class="a">BLUE ${mt.score.A}</span> — <span class="b">${mt.score.B} RED</span> <small>to ${t.scoreToWin}</small>`;
    else if (t.mode === 'duel') { const k = G.bots[0]; sl = `<span class="a">YOU ${p.kills}</span> — <span class="b">${k.kills} ${esc(k.name)}</span> <small>to ${t.scoreToWin}</small>`; }
    else {
      const lead = G.bots.reduce((a, b) => (b.kills > a.kills ? b : a), G.bots[0]);
      sl = `<span class="a">YOU ${p.kills}</span> · <span class="b">${esc(lead.name)} ${lead.kills}</span> <small>to ${t.scoreToWin}</small>`;
    }
    if (sl !== lastScore) { $('scoreline').innerHTML = sl; lastScore = sl; }
    const tm = Math.ceil(mt.time);
    $('timer').textContent = `${Math.floor(tm / 60)}:${String(tm % 60).padStart(2, '0')}`;
    const sus = Math.round(mt.sus);
    $('sus-fill').style.width = sus + '%';
    $('sus-val').textContent = sus;
    $('sus').className = 's' + C.band(sus, 0);
    $('credits-live').textContent = `+${U.fmt(mt.liveCredits * m.payoutMult)} this match`;
    $('hp-fill').style.width = Math.max(0, p.hp) + '%';
    $('hp-fill').style.background = p.hp > 50 ? '#4ade80' : p.hp > 25 ? '#facc15' : '#f87171';
    $('hp-val').textContent = Math.ceil(Math.max(0, p.hp));
    const w = D.WEAPONS[p.weapon];
    $('ammo-val').textContent = m.infAmmo ? '∞' : p.ammo[p.weapon];
    $('ammo-max').textContent = m.infAmmo ? '' : '/' + w.mag;
    $('weapon-name').textContent = p.reloadT > 0 ? 'RELOADING…' : w.name;
    const now = performance.now();
    const feed = mt.killfeed.filter(k => now - k.t < 6000).slice(-4)
      .map(k => `<div class="kf ${k.mine ? 'mine' : ''}"><span class="${tc(k.kt)}">${esc(k.k)}</span> ${k.head ? '<span class="hs">◎</span>' : '›'} <span class="${tc(k.vt)}">${esc(k.v)}</span></div>`).join('');
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
    const w = innerWidth, h = innerHeight, p = G.player;
    if (G.mods.esp) drawESP(g, w, h);
    drawAllyTags(g, w, h);
    if (p.alive) drawCrosshair(g, w, h, now);
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
    const col = G.aimLock ? '#ff3b5c' : '#ffffff';
    const lines = [[0, -1], [0, 1], [-1, 0], [1, 0]];
    for (const pass of [0, 1]) {
      g.strokeStyle = pass ? col : 'rgba(0,0,0,0.65)';
      g.lineWidth = pass ? 2 : 4;
      g.beginPath();
      for (const [lx, ly] of lines) { g.moveTo(s.x + lx * gap, s.y + ly * gap); g.lineTo(s.x + lx * (gap + len), s.y + ly * (gap + len)); }
      g.stroke();
    }
    g.fillStyle = col; g.fillRect(s.x - 1.5, s.y - 1.5, 3, 3);
    const ht = (now - UI.hitT) / 1000;
    if (ht < 0.18) {
      g.strokeStyle = UI.hitHead ? '#ff3b5c' : '#ffffff'; g.lineWidth = 2.5; g.beginPath();
      for (const [lx, ly] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { g.moveTo(s.x + lx * 6, s.y + ly * 6); g.lineTo(s.x + lx * 13, s.y + ly * 13); }
      g.stroke();
    }
    if (p.reloadT > 0) {
      g.strokeStyle = '#fde047'; g.lineWidth = 3; g.beginPath();
      g.arc(s.x, s.y, 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - p.reloadT / p.reloadTotal)); g.stroke();
    }
  }
  const JOINTS = { head: [0, 1.62, 0], neck: [0, 1.42, 0], pelvis: [0, 0.8, 0], ls: [-0.3, 1.36, 0], rs: [0.3, 1.36, 0], lh: [-0.38, 1.0, -0.12], rh: [0.38, 1.0, -0.12], lf: [-0.16, 0.03, 0], rf: [0.16, 0.03, 0] };
  const BONES = [['head', 'neck'], ['neck', 'pelvis'], ['neck', 'ls'], ['ls', 'lh'], ['neck', 'rs'], ['rs', 'rh'], ['pelvis', 'lf'], ['pelvis', 'rf']];
  function drawESP(g, w, h) {
    const lvl = G.mods.esp, p = G.player;
    g.font = '600 11px -apple-system, system-ui, sans-serif';
    g.textAlign = 'center';
    for (const b of G.bots) {
      if (!b.alive || !G.isEnemy(p, b)) continue;
      let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9, ok = true;
      for (const cx of [-0.4, 0.4]) for (const cy of [0, 1.86]) for (const cz of [-0.4, 0.4]) {
        const s = project(b.pos.x + cx, b.pos.y + cy, b.pos.z + cz, w, h);
        if (!s) { ok = false; break; }
        if (s.x < minX) minX = s.x; if (s.x > maxX) maxX = s.x; if (s.y < minY) minY = s.y; if (s.y > maxY) maxY = s.y;
      }
      if (!ok) continue;
      const bw = maxX - minX, bh = maxY - minY;
      g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 3; g.strokeRect(minX, minY, bw, bh);
      g.strokeStyle = '#ff2f5b'; g.lineWidth = 1.5; g.strokeRect(minX, minY, bw, bh);
      if (lvl >= 2) {
        const k = Math.max(0, b.hp / b.maxHp);
        g.fillStyle = 'rgba(0,0,0,0.7)'; g.fillRect(minX - 6, minY, 4, bh);
        g.fillStyle = k > 0.5 ? '#4ade80' : k > 0.25 ? '#facc15' : '#f87171'; g.fillRect(minX - 6, minY + bh * (1 - k), 4, bh * k);
      }
      if (lvl >= 3) {
        const dist = Math.round(p.pos.distanceTo(b.pos));
        g.fillStyle = '#000'; g.fillText(b.name, (minX + maxX) / 2 + 1, minY - 5);
        g.fillStyle = '#fff'; g.fillText(b.name, (minX + maxX) / 2, minY - 6);
        g.fillStyle = '#fde047'; g.fillText(dist + 'm', (minX + maxX) / 2, maxY + 12);
      }
      if (lvl >= 4) {
        const cy = Math.cos(b.yaw), sy = Math.sin(b.yaw), pts = {};
        for (const k in JOINTS) {
          const j = JOINTS[k];
          pts[k] = project(b.pos.x + j[0] * cy + j[2] * sy, b.pos.y + j[1], b.pos.z - j[0] * sy + j[2] * cy, w, h);
        }
        g.strokeStyle = '#f8fafc'; g.lineWidth = 1.5; g.beginPath();
        for (const [a, c] of BONES) if (pts[a] && pts[c]) { g.moveTo(pts[a].x, pts[a].y); g.lineTo(pts[c].x, pts[c].y); }
        g.stroke();
      }
      if (lvl >= 5) {
        g.strokeStyle = 'rgba(253,224,71,0.85)'; g.lineWidth = 1.5; g.beginPath();
        g.moveTo(w / 2, h); g.lineTo((minX + maxX) / 2, maxY); g.stroke();
      }
    }
  }
  function drawAllyTags(g, w, h) {
    const p = G.player;
    g.font = '700 11px -apple-system, system-ui, sans-serif';
    g.textAlign = 'center';
    for (const b of G.bots) {
      if (!b.alive || !G.isAlly(b) || p.pos.distanceTo(b.pos) > 50) continue;
      const s = project(b.pos.x, b.pos.y + 2.1, b.pos.z, w, h);
      if (!s) continue;
      g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillText(b.name, s.x + 1, s.y + 1);
      g.fillStyle = '#93c5fd'; g.fillText(b.name, s.x, s.y);
    }
  }
  UI.drawMinimap = function () {
    if (UI.current !== 'hud' || !G.player || !NA.World.current) return;
    const cv = $('minimap'), g = cv.getContext('2d'), Wd = NA.World.current, S = cv.width;
    g.clearRect(0, 0, S, S);
    const sc = (S - 20) / Math.max(Wd.def.size[0], Wd.def.size[1]), o = S / 2;
    g.fillStyle = 'rgba(203,213,225,0.55)';
    for (const c of Wd.colliders) {
      if (c.maxY <= 0.05) continue;
      g.fillRect(o + c.minX * sc, o + c.minZ * sc, (c.maxX - c.minX) * sc, (c.maxZ - c.minZ) * sc);
    }
    for (const b of G.bots) {
      if (!b.alive) continue;
      const ally = G.isAlly(b);
      if (!ally && !G.mods.radar) continue;
      g.fillStyle = ally ? '#60a5fa' : '#f43f5e';
      g.beginPath(); g.arc(o + b.pos.x * sc, o + b.pos.z * sc, 7, 0, Math.PI * 2); g.fill();
    }
    const p = G.player, px = o + p.pos.x * sc, pz = o + p.pos.z * sc, fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
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
  }
  function initTouch() {
    const el = $('touch'), joy = $('joy'), knob = $('joy-knob'), T = {};
    const has = role => Object.keys(T).some(k => T[k].role === role);
    const hideJoy = () => { joy.classList.remove('on'); knob.style.transform = ''; };
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
          joy.classList.add('on');
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
    });
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
      else if (k === '1' && G.player.weapon !== 'pistol') G.swapWeapon();
      else if (k === '2' && G.player.weapon !== 'rifle') G.swapWeapon();
      else if (e.key === 'Insert' || e.key === '`') { UI.toggleCheatMenu(); e.preventDefault(); }
      else if (e.key === 'End') { G.setPanic(!G.panic); if (UI.cheatOpen) UI.renderCheatMenu(); }
      else if (e.key === 'Enter') { UI.openChat(); e.preventDefault(); }
      else if (k === 'tab') e.preventDefault();
    });
    window.addEventListener('keyup', e => { UI.keys[e.key.toLowerCase()] = false; });
    window.addEventListener('blur', () => { UI.keys = {}; });
  }
  UI.applyKeys = function () {
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

    click('title-go', () => {
      if (!NA.Save.data.username) { $('name-input').value = 'newplayer_' + U.randInt(1000, 9999); UI.show('scr-name'); }
      else UI.showMenu();
    });
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
    click('m-profile', () => UI.showProfile());
    click('m-settings', () => UI.showSettings('scr-menu'));
    document.querySelectorAll('[data-back]').forEach(b => b.addEventListener('click', () => { A.click(); if (b.dataset.back === 'scr-menu') UI.showMenu(); else UI.show(b.dataset.back); }));
    document.querySelector('[data-back-shop]').addEventListener('click', () => { A.click(); UI.shopBack(); });
    $('tier-list').addEventListener('click', e => {
      const el = e.target.closest('[data-tier]');
      if (!el || el.classList.contains('locked')) return;
      A.unlock(); A.click();
      G.startMatch(+el.dataset.tier);
    });
    $('shop-list').addEventListener('click', e => {
      const b = e.target.closest('[data-buy]');
      if (!b) return;
      const id = b.dataset.buy;
      if (G.buy(id)) { UI.toast('Bought ' + D.CHEAT[id].name); UI.renderShop(); }
      else { A.deny(); b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); }
    });
    click('res-shop', () => UI.showShop('scr-results'));
    click('res-again', () => G.startMatch(G.match.tier.id));
    click('res-lobbies', () => { G.toIdle(); UI.showPlay(); });
    click('res-menu', () => { G.toIdle(); UI.showMenu(); });
    click('res-auto-cancel', () => UI.stopAuto());
    $('res-unlock').addEventListener('click', e => { const b = e.target.closest('[data-play]'); if (b) { A.click(); G.startMatch(+b.dataset.play); } });
    click('pause-resume', () => UI.resume());
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
    $('cm-close').addEventListener('click', () => UI.closeCheatMenu());
    $('cm-panic').addEventListener('click', () => { G.setPanic(!G.panic); UI.renderCheatMenu(); });
    $('cm-list').addEventListener('change', e => {
      const id = e.target.dataset.cm;
      if (!id) return;
      NA.Save.data.cheats[id].enabled = e.target.checked;
      NA.Save.save(); G.computeMods();
    });
    $('cm-list').addEventListener('input', e => {
      const id = e.target.dataset.lvl;
      if (!id) return;
      const st = NA.Save.data.cheats[id];
      st.use = +e.target.value;
      e.target.nextElementSibling.textContent = `${st.use}/${st.level}`;
      NA.Save.save(); G.computeMods();
    });
    $('chat-form').addEventListener('submit', e => { e.preventDefault(); C.playerSays($('chat-input').value); UI.closeChat(); });
    tap($('b-chat'), () => UI.openChat());
    tap($('b-ins'), () => UI.toggleCheatMenu());
    tap($('b-pause'), () => UI.pause());
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
