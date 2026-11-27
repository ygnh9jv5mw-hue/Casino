/* NO ANTICHEAT: 5v5 Payload screens and HUD. The 5V5 tab on the Play screen, agent select, the buy
   menu, the round banner, ability buttons, the plant/defuse prompt, spectating, and the Payload
   markers on the minimap and the screen. */
(function (NA) {
  'use strict';
  const U = NA.U, D = NA.DATA, A = NA.Audio;
  const PUI = NA.PUI = {};
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const G = () => NA.Game, P = () => NA.Payload, AG = () => NA.Agents;
  const CR = '¤';
  const HF = '"Futura-CondensedExtraBold", "AvenirNextCondensed-Heavy", Impact, "Arial Narrow", sans-serif';

  const ICON = {
    flash: '<path d="M12 1.5l2.2 6.3 6.3-2.2-3.9 5.4 5.4 3.9-6.6.3.8 6.6L12 17.6l-4.2 4.2.8-6.6-6.6-.3 5.4-3.9L3.5 5.6l6.3 2.2z" fill="currentColor"/>',
    dash: '<path d="M4 6l6 6-6 6M12 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
    buff: '<path d="M13 2L4 14h7l-1 8 9-12h-7z" fill="currentColor"/>',
    blast: '<circle cx="10" cy="14" r="7" fill="currentColor"/><path d="M14 8l3-3M17 5l2-1M18 7h2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    slow: '<path d="M2 9c3-3 5 3 8 0s5 3 8 0 3 0 4-1M2 15c3-3 5 3 8 0s5 3 8 0 3 0 4-1" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
    smoke: '<path d="M6.5 19a4.5 4.5 0 01-.6-9 6 6 0 0111.5-1.6A4.6 4.6 0 0117.5 19z" fill="currentColor"/>',
    invis: '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 20L20 4" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
    decoy: '<circle cx="8" cy="7" r="3" fill="currentColor"/><path d="M2.5 20c0-3.6 2.5-6 5.5-6s5.5 2.4 5.5 6z" fill="currentColor"/><circle cx="16.5" cy="7" r="3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-dasharray="2 1.6"/><path d="M12.5 20c.3-3.4 2-6 4-6 3 0 5 2.4 5 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-dasharray="2 1.6"/>',
    jam: '<path d="M5 9a10 10 0 0114 0M8 12.5a5.6 5.6 0 018 0" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="16.5" r="1.8" fill="currentColor"/><path d="M4 4l16 16" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
    mark: '<path d="M12 2l3 7H9zM12 22l-3-7h6z" fill="currentColor"/><ellipse cx="12" cy="12" rx="9" ry="3.2" fill="none" stroke="currentColor" stroke-width="2"/>',
    teleport: '<path d="M12 3a9 9 0 109 9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M12 7.5a4.5 4.5 0 104.5 4.5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M18 2v4h4" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>',
    wall: '<path d="M2 6h20v12H2zM2 12h20M8 6v6M16 6v6M5 12v6M12 12v6M19 12v6" fill="none" stroke="currentColor" stroke-width="2"/>',
    shield: '<path d="M12 2l8 3v6c0 5.2-3.4 9.3-8 11-4.6-1.7-8-5.8-8-11V5z" fill="currentColor"/>',
    trap: '<circle cx="4" cy="12" r="2.5" fill="currentColor"/><circle cx="20" cy="12" r="2.5" fill="currentColor"/><path d="M6.5 12h11" stroke="currentColor" stroke-width="2" stroke-dasharray="2.5 2"/>',
    turret: '<path d="M7 20h10l-1.5-6h-7z" fill="currentColor"/><rect x="6" y="8" width="9" height="6" rx="1.5" fill="currentColor"/><path d="M15 10.5h7" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
    field: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M5.6 5.6l12.8 12.8" stroke="currentColor" stroke-width="2.2"/>',
    reveal: '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3.2" fill="currentColor"/>',
  };
  const icon = (kind, size) => `<svg viewBox="0 0 24 24" width="${size || 20}" height="${size || 20}" aria-hidden="true">${ICON[kind] || ICON.buff}</svg>`;
  PUI.icon = icon;
  const DRIVE_SVG = '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><rect x="3" y="9" width="18" height="10" rx="2" fill="currentColor"/><path d="M16 9V4" stroke="currentColor" stroke-width="2"/><circle cx="16" cy="3" r="1.7" fill="currentColor"/></svg>';
  const face = (a, cls) => `<span class="ag-face${cls ? ' ' + cls : ''}" style="--ac:${a.color}">${esc(a.name[0])}</span>`;
  PUI.face = face;

  // ---------------------------------------------------------------- the 5V5 tab
  PUI.queueSeg = function () {
    const s = NA.Save.data, R = NA.Ranked, comp = s.plQueue === 'comp' && R.unlocked();
    return `<span class="mt-seg"><span class="diff-l">Queue</span><button class="${comp ? '' : 'on'}" data-plq="unrated">UNRATED<small>no anticheat</small></button><button class="${comp ? 'on' : ''}${R.unlocked() ? '' : ' locked'}" data-plq="comp">COMPETITIVE<small>${R.unlocked() ? `${esc(D.RANKED.ac)} · ×${D.RANKED.payMult} pay` : 'unlocks with Ranked'}</small></button></span>`;
  };
  PUI.playPanel = function () {
    const s = NA.Save.data, open = P().unlocked(), R = NA.Ranked;
    const comp = s.plQueue === 'comp' && R.unlocked(), df = G().diff();
    const t = P().tier(P().MAPS[0]), mult = (comp ? D.RANKED.payMult : 1) * df.pay;
    const st = s.plStats || { played: 0, won: 0 };
    const card = id => {
      const art = id !== 'random' && NA.Showroom.mapArt(id);
      return `<button class="tier pl-map ${open ? 'open' : 'locked'}" data-plmap="${id}">
        <span class="tart${art ? ' on' : ''}" style="${art ? `background-image:url(${art})` : ''}"></span>
        <div class="swatch"></div><div class="tnum">5V5 · PAYLOAD${comp ? ' · COMPETITIVE' : ''}</div>
        <div class="tname">${id === 'random' ? 'Random map' : esc(D.mapTitle(id))}</div>
        <div class="tmeta">First to 5 rounds · sides swap after 4 · agents · buy phase</div>
        <div class="tpay">Win ${U.fmt(t.base * mult)} + ${U.fmt(t.kill * mult)}/kill</div>
        <div class="tprog">${open ? (st.played ? `Played ${st.played} · won ${st.won}` : 'Pick a map, then an agent') : 'Unlocks at Tier 2'}</div></button>`;
    };
    const how = `<div class="tier pl-how"><div class="tnum">HOW IT WORKS</div><div class="tname">Plant the drive</div>
      <div class="tmeta">Attackers plug a payload drive into site A or B. Defenders stop the plant or pull the drive back out.</div>
      <div class="tmeta">Buy guns, shields and abilities with round credits. They're not cheat credits.</div>
      <div class="tmeta">No respawns in a round. Your cheats still work. So does the report button.</div></div>`;
    const B = P().boss(), bt = P().tier(P().MAPS[0], true), bo = P().bossUnlocked(), beaten = (st.bosses || []).indexOf(B.id) >= 0;
    const boss = `<button class="tier pl-boss ${bo ? 'open' : 'locked'}" data-plboss="1" style="--bc:${B.color}"><div class="tnum">BOSS MATCH · TODAY</div><div class="tname">vs ${esc(B.name)}</div>
      <div class="tmeta">Five pros. Full buy every round. Aim that looks like cheating (it isn't… probably).</div>
      <div class="tpay">Win ${U.fmt((bt.base * 1.5) * mult)} + ${U.fmt(bt.kill * mult)}/kill</div>
      <div class="tprog">${bo ? (beaten ? 'Beaten · a new team tomorrow' : 'A new pro team every day') : 'Unlocks at Tier 4'}</div></button>`;
    return how + NA.Team.summary() + boss + ['random'].concat(P().MAPS).map(card).join('');
  };

  // ---------------------------------------------------------------- agent select
  let sel = { map: 'random', agent: 'spark' };
  PUI.showAgents = function (map, boss) {
    const s = NA.Save.data;
    sel = { map: map || 'random', agent: s.plAgent && AG().BY[s.plAgent] ? s.plAgent : 'spark', boss: !!boss };
    renderAgents();
    NA.UI.show('scr-agents');
  };
  function renderAgents() {
    const a = AG().BY[sel.agent], R = AG().ROLES;
    $('ag-grid').innerHTML = Object.keys(R).map(role => `<div class="ag-role"><h4 style="color:${R[role].color}">${R[role].name.toUpperCase()}S <small>${esc(R[role].tag)}</small></h4>
      <div class="ag-row">${AG().byRole(role).map(x => `<button class="ag-card${x.id === sel.agent ? ' on' : ''}" data-agent="${x.id}" style="--ac:${x.color}">${face(x)}<b>${esc(x.name)}</b></button>`).join('')}</div></div>`).join('');
    $('ag-detail').innerHTML = `<div class="ag-hero" style="--ac:${a.color}">${face(a, 'big')}<div><div class="ag-name">${esc(a.name)}</div><div class="ag-rl" style="color:${R[a.role].color}">${R[a.role].name}</div><div class="ag-bio">${esc(a.bio)}</div></div></div>` +
      ['c', 'e', 'x'].map(k => {
        const ab = a[k];
        const meta = k === 'c' ? `${ab.max} charge${ab.max > 1 ? 's' : ''} · ${CR}${ab.cost} each` : k === 'e' ? 'Free every round' : `Ultimate · ${ab.ult} points`;
        return `<div class="ag-ab"><span class="ag-ic" style="--ac:${a.color}">${icon(ab.kind, 18)}<i>${k.toUpperCase()}</i></span><div><b>${esc(ab.name)}</b> <small>${meta}</small><p>${esc(ab.desc)}</p></div></div>`;
      }).join('');
    $('ag-map').textContent = (sel.boss ? `vs ${P().boss().name} · ` : '') + (sel.map === 'random' ? 'Random map' : D.mapTitle(sel.map)) + ' · ' + (NA.Save.data.plQueue === 'comp' && NA.Ranked.unlocked() ? 'Competitive' : 'Unrated');
  }
  PUI.pick = id => { if (AG().BY[id]) { sel.agent = id; renderAgents(); } };
  PUI.launch = function () {
    const s = NA.Save.data, R = NA.Ranked;
    s.plAgent = sel.agent; NA.Save.save();
    const pool = P().MAPS.filter(m => m !== G().lastMap);
    const map = sel.map === 'random' ? U.pick(pool.length ? pool : P().MAPS) : sel.map;
    P().pending = { agent: sel.agent, map };
    PUI.last = { map: sel.map, boss: sel.boss };
    const tier = P().tier(map, sel.boss);
    if (s.plQueue === 'comp' && R.unlocked()) {
      if (R.banned()) { A.deny(); NA.UI.toast('Banned from Ranked'); NA.UI.showPlay(); return; }
      NA.UI.openLoader(tier);
      return;
    }
    G().startMatch(tier);
  };
  PUI.again = () => PUI.showAgents(PUI.last ? PUI.last.map : 'random', PUI.last && PUI.last.boss);

  // ---------------------------------------------------------------- HUD
  let mounted = false;
  PUI.mount = function () {
    const hud = $('hud'), ah = $('aim-hint');
    hud.classList.add('pl');
    if (ah) { if (PUI.hint0 === undefined) PUI.hint0 = ah.textContent; ah.textContent = 'Click to aim · WASD move · Space jump · R reload · 1/2 or Q weapons · C / E / X abilities · B buy · hold F plant or defuse · Insert cheats · Enter chat'; }
    if (mounted) return;
    mounted = true;
    hud.insertAdjacentHTML('beforeend', `
      <div id="pl-banner" class="pl-only"><b></b><span></span></div>
      <div id="pl-prompt" class="pl-only hidden"><span></span><div class="pp-bar"><i></i></div></div>
      <div id="pl-bar" class="pl-only"></div>
      <div id="pl-spec" class="pl-only hidden"></div>
      <div id="pl-cr" class="pl-only"></div>`);
    document.body.insertAdjacentHTML('beforeend', '<div id="pl-buy" class="hidden"></div>');
    $('touch').insertAdjacentHTML('beforeend', `
      <button class="tb pl-only pl-ab" id="b-abc" data-btn="abc"></button>
      <button class="tb pl-only pl-ab" id="b-abe" data-btn="abe"></button>
      <button class="tb pl-only pl-ab ult" id="b-abx" data-btn="abx"></button>
      <button class="tb pl-only hidden" id="b-plant" data-btn="plant"></button>
      <button class="tb pl-only hidden" id="b-buy" data-btn="buy"></button>
      <button class="tb pl-only hidden" id="b-spec" data-btn="spec">NEXT ›</button>`);
    $('pl-buy').addEventListener('click', buyClick);
  };
  PUI.unmount = function () {
    const hud = $('hud'), ah = $('aim-hint');
    if (hud) hud.classList.remove('pl');
    if (ah && PUI.hint0 !== undefined) ah.textContent = PUI.hint0;
    PUI.closeBuy();
    if ($('pl-banner')) $('pl-banner').classList.remove('show');
    sig = {};
  };
  PUI.roundStart = function (fresh) {
    PUI.mount();
    sig = {};
    if (U.isTouch && G().player.alive) setTimeout(() => { const st = P().st(); if (st && st.phase === 'buy') PUI.openBuy(); }, fresh ? 900 : 600);
    else if (!NA.Save.data.flags.plBuyTip) { NA.Save.data.flags.plBuyTip = true; NA.UI.toast('Press B to buy'); }
  };
  let bannerT = null;
  PUI.banner = function (title, sub, kind) {
    PUI.mount();
    const el = $('pl-banner');
    el.className = 'pl-only show ' + (kind || '');
    el.querySelector('b').textContent = title;
    el.querySelector('span').textContent = sub || '';
    clearTimeout(bannerT);
    bannerT = setTimeout(() => el.classList.remove('show'), 2700);
  };

  PUI.scoreline = function () {
    const i = P().info();
    if (!i) return '';
    const p = G().player, my = p.team, op = my === 'A' ? 'B' : 'A';
    const pips = team => G().entities().filter(e => e.team === team).map(e => {
      const a = AG().BY[e.agent];
      return `<i class="pip${e.alive ? '' : ' dead'}${e === p ? ' me' : ''}" style="--ac:${a ? a.color : '#fff'}">${a ? esc(a.name[0]) : ''}</i>`;
    }).join('');
    const ct = Math.ceil(i.t);
    const clock = i.phase === 'planted' ? `<span class="pl-drv">${DRIVE_SVG}${ct}</span>` : i.phase === 'end' ? '—' : `${Math.floor(ct / 60)}:${String(ct % 60).padStart(2, '0')}`;
    return `<div class="pl-side"><div class="tm a"><span>${i.attacking ? 'ATK' : 'DEF'}</span><b>${i.score[my]}</b></div><div class="pl-pips">${pips(my)}</div></div>` +
      `<div class="to pl-clock ${i.phase}">${i.phase === 'buy' ? '<small class="bp">BUY</small>' : ''}<em>${clock}</em><small>ROUND ${i.round}</small></div>` +
      `<div class="pl-side"><div class="tm b"><b>${i.score[op]}</b><span>${i.attacking ? 'DEF' : 'ATK'}</span></div><div class="pl-pips">${pips(op)}</div></div>`;
  };
  PUI.timerText = function () {
    const i = P().info();
    if (!i) return '';
    const ct = Math.ceil(i.t);
    return `${Math.floor(ct / 60)}:${String(ct % 60).padStart(2, '0')}`;
  };

  let sig = {};
  const setHTML = (id, key, html) => { if (sig[id] !== key) { sig[id] = key; const el = $(id); if (el) el.innerHTML = html; } };
  PUI.tick = function () {
    const i = P().info();
    if (!i || !mounted) return;
    const p = G().player, a = AG().BY[p.agent], k = p.kit, touch = U.isTouch, live = i.phase === 'live' || i.phase === 'planted';
    if (!a || !k) return;
    // abilities: big buttons on touch, a bar with key labels on desktop
    const parts = [];
    for (const slot of ['c', 'e', 'x']) {
      const x = a[slot], ready = AG().ready(p, slot) && p.alive;
      const pips = slot === 'x' ? `${Math.min(k.ult, x.ult)}/${x.ult}` : '●'.repeat(k[slot]) + '○'.repeat(Math.max(0, x.max - k[slot]));
      const key = `${slot}|${ready}|${live}|${pips}`;
      if (touch) {
        const el = $('b-ab' + slot);
        if (el && sig['b-ab' + slot] !== key) {
          sig['b-ab' + slot] = key;
          el.innerHTML = `${icon(x.kind, slot === 'x' ? 24 : 21)}<span class="abp">${pips}</span>`;
          el.style.setProperty('--ac', a.color);
          el.classList.toggle('on', ready && live);
          el.classList.toggle('off', !ready);
        }
      } else parts.push(`<div class="plb${ready && live ? ' on' : ''}${ready ? '' : ' off'}${slot === 'x' ? ' ult' : ''}" style="--ac:${a.color}"><i>${slot.toUpperCase()}</i>${icon(x.kind, 20)}<span>${pips}</span></div>`);
    }
    if (!touch) setHTML('pl-bar', parts.join(''), parts.join(''));
    $('pl-bar').classList.toggle('hidden', touch || !p.alive);
    // round credits + buy button
    const buying = i.phase === 'buy' && p.alive;
    setHTML('pl-cr', `${p.cr}|${buying}|${touch}`, `<span class="crv">${CR} ${U.num(p.cr)}</span>${buying && !touch ? '<span class="crk">B · BUY</span>' : ''}`);
    const bb = $('b-buy');
    if (bb) {
      bb.classList.toggle('hidden', !buying || !touch || NA.UI.buyOpen);
      if (buying) setHTML('b-buy', 'b' + p.cr, `BUY <small>${CR}${U.num(p.cr)}</small>`);
    }
    if (NA.UI.buyOpen) {
      if (!buying) PUI.closeBuy();
      else { const t = $('bm-t'); if (t) t.textContent = '0:' + String(Math.ceil(i.t)).padStart(2, '0'); }
    }
    // plant / defuse
    let prompt = '', can = false;
    if (i.canPlant) { prompt = touch ? '' : 'HOLD F TO PLANT'; can = true; }
    else if (i.canDefuse) { prompt = touch ? '' : 'HOLD F TO DEFUSE'; can = true; }
    else if (i.carrying && i.phase === 'live') prompt = 'YOU HAVE THE DRIVE · take it to A or B';
    else if (i.phase === 'buy' && i.attacking && i.drive && i.drive.state === 'ground' && p.alive) prompt = 'Walk over the drive to carry it';
    if (i.progKind) prompt = (i.progKind === 'plant' ? 'PLANTING ' : 'DEFUSING ') + Math.round(i.prog * 100) + '%';
    const pr = $('pl-prompt');
    pr.classList.toggle('hidden', !prompt);
    if (prompt) {
      pr.querySelector('span').textContent = prompt;
      pr.classList.toggle('prog', !!i.progKind);
      pr.querySelector('i').style.width = Math.round((i.prog || 0) * 100) + '%';
    }
    const bp = $('b-plant');
    if (bp) {
      bp.classList.toggle('hidden', !touch || !can);
      if (can) setHTML('b-plant', (i.canPlant ? 'p' : 'd') + Math.round(i.prog * 20), `${DRIVE_SVG}<b>${i.progKind ? Math.round(i.prog * 100) + '%' : 'HOLD TO ' + (i.canPlant ? 'PLANT' : 'DEFUSE')}</b>`);
    }
    // spectating
    const spec = P().specTarget();
    $('pl-spec').classList.toggle('hidden', !spec);
    if (spec) {
      const sa = AG().BY[spec.agent];
      setHTML('pl-spec', spec.name + spec.hp, `<small>SPECTATING</small> ${face(sa, 'sm')}<b>${esc(spec.name)}</b><span>${esc(sa.name)} · ${Math.ceil(spec.hp)} HP</span>${touch ? '' : '<em>click to switch</em>'}`);
    }
    const bs = $('b-spec');
    if (bs) bs.classList.toggle('hidden', !spec || !touch);
  };

  // ---------------------------------------------------------------- buy menu
  PUI.openBuy = function () {
    const st = P().st();
    if (!st || st.phase !== 'buy' || !G().player.alive) return;
    NA.UI.buyOpen = true;
    if (document.pointerLockElement) document.exitPointerLock();
    if (NA.UI.resetTouch) NA.UI.resetTouch();
    renderBuy();
    $('pl-buy').classList.remove('hidden');
  };
  PUI.closeBuy = function () {
    NA.UI.buyOpen = false;
    const el = $('pl-buy');
    if (el) el.classList.add('hidden');
  };
  function renderBuy() {
    const p = G().player, st = P().st(), a = AG().BY[p.agent], k = p.kit, bought = p.bought || {};
    const list = P().shopList();
    const gun = it => {
      const w = D.WEAPONS[it.id], own = p.slots.some(s => s && s.id === it.id), sell = own && bought['g' + w.slot] && bought['g' + w.slot].id === it.id;
      const tag = sell ? 'SELL' : own ? 'OWNED' : it.cr ? CR + U.num(it.cr) : 'FREE';
      return `<button class="bm-gun${own ? ' own' : ''}${!own && p.cr < it.cr ? ' poor' : ''}${it.armory ? ' arm' : ''}" data-plbuy="${it.id}"><span class="bm-n">${esc(w.name)}</span><span class="bm-p">${tag}</span><span class="bm-s">${w.dmg}${w.pellets > 1 ? '×' + w.pellets : ''} dmg · ${w.mag} rds${it.armory ? ' · Armory' : ''}</span></button>`;
    };
    const cols = [['Sidearms'], ['SMGs', 'Shotguns'], ['Rifles'], ['Snipers', 'Heavy']].map(group => `<div class="bm-col">${group.map(c => {
      const items = list.filter(x => x.cat === c);
      return items.length ? `<h5>${c}</h5>${items.map(gun).join('')}` : '';
    }).join('')}</div>`).join('');
    const armor = Object.keys(P().ARMOR).map(id => {
      const ar = P().ARMOR[id], have = p.shield >= ar.amt;
      return `<button class="bm-gun${have ? ' own' : ''}${!have && p.cr < ar.cr ? ' poor' : ''}" data-plbuy="${id}"><span class="bm-n">${ar.name}</span><span class="bm-p">${bought[id] ? 'SELL' : have ? 'OWNED' : CR + U.num(ar.cr)}</span><span class="bm-s">+${ar.amt} shield</span></button>`;
    }).join('');
    const ab = slot => {
      const x = a[slot];
      const pips = slot === 'x' ? `${k.ult}/${x.ult}` : '●'.repeat(k[slot]) + '○'.repeat(Math.max(0, x.max - k[slot]));
      if (slot === 'c') return `<button class="bm-ab${k.c >= x.max ? ' full' : ''}${p.cr < x.cost && k.c < x.max ? ' poor' : ''}" data-plbuy="abc" style="--ac:${a.color}">${icon(x.kind, 18)}<span class="bm-n">C · ${esc(x.name)}</span><span class="bm-p">${k.c >= x.max ? (bought.abc ? 'SELL' : 'FULL') : CR + x.cost}</span><span class="bm-pips">${pips}</span></button>`;
      return `<div class="bm-ab info" style="--ac:${a.color}">${icon(x.kind, 18)}<span class="bm-n">${slot.toUpperCase()} · ${esc(x.name)}</span><span class="bm-p">${slot === 'e' ? 'FREE' : 'ULT'}</span><span class="bm-pips">${pips}</span></div>`;
    };
    const team = G().bots.filter(b => b.team === p.team).map(b => {
      const ba = AG().BY[b.agent];
      return `<div class="bm-tm">${face(ba, 'sm')}<b>${esc(b.name)}</b><em class="w">${esc(D.WEAPONS[b.weapon].name)}${b.shield ? ' · ' + b.shield + ' shield' : ''}</em><i>${CR}${U.num(b.cr)}</i></div>`;
    }).join('');
    $('pl-buy').innerHTML = `<div class="bm-head"><b>BUY PHASE</b><span class="bm-t" id="bm-t">0:${String(Math.ceil(st.t)).padStart(2, '0')}</span><span class="bm-cr">${CR} ${U.num(p.cr)}</span>
      <button class="btn tiny primary" data-plready="1">READY</button><button class="btn tiny" data-plclose="1">CLOSE ✕</button></div>
      <div class="bm-body"><div class="bm-guns">${cols}</div><div class="bm-side"><h5>Shields</h5><div class="bm-armor">${armor}</div>
      <h5>Abilities · ${esc(a.name)}</h5>${['c', 'e', 'x'].map(ab).join('')}<h5>Your team</h5>${team}</div></div>
      <div class="bm-foot">Round credits only. Tap something you bought this round to sell it back.</div>`;
  }
  function buyClick(e) {
    const b = e.target.closest('[data-plbuy]');
    if (b) {
      const r = P().buy(b.dataset.plbuy);
      if (r.ok) A.buy(); else { A.deny(); if (r.msg) NA.UI.toast(r.msg); }
      renderBuy();
      return;
    }
    if (e.target.closest('[data-plready]')) { A.click(); P().ready(); PUI.closeBuy(); return; }
    if (e.target.closest('[data-plclose]')) { A.click(); PUI.closeBuy(); }
  }

  // ---------------------------------------------------------------- input
  PUI.press = function (role) {
    if (role === 'abc' || role === 'abe' || role === 'abx') { P().useAbility(role.slice(2)); return true; }
    if (role === 'plant') { P().setHold(true); return true; }
    if (role === 'buy') { PUI.openBuy(); return true; }
    if (role === 'spec') { P().specNext(); return true; }
    return false;
  };
  PUI.key = function (k, down) {
    if (!down) { if (k === 'f' || k === '4') P().setHold(false); return false; }
    if (k === 'c' || k === 'e' || k === 'x') { P().useAbility(k); return true; }
    if (k === 'f' || k === '4') { P().setHold(true); return true; }
    if (k === 'b') { if (NA.UI.buyOpen) PUI.closeBuy(); else PUI.openBuy(); return true; }
    if (k === 'n' && !G().player.alive) { P().specNext(); return true; }
    return false;
  };

  // ---------------------------------------------------------------- minimap
  PUI.jammed = () => !!(G().player && G().player.st && G().player.st.jam > 0);
  PUI.minimap = function (g, X, Z, sc) {
    const i = P().info();
    if (!i) return;
    const p = G().player;
    g.fillStyle = 'rgba(226,232,240,0.5)';
    for (const o of AG().objs) if (o.type === 'smoke') { g.beginPath(); g.arc(X(o.x), Z(o.z), o.r * sc, 0, Math.PI * 2); g.fill(); }
    g.textAlign = 'center';
    for (const key of ['A', 'B']) {
      const s = i.sites[key];
      g.strokeStyle = 'rgba(250,204,21,0.9)'; g.lineWidth = 2;
      g.beginPath(); g.arc(X(s.x), Z(s.z), s.r * sc, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#facc15'; g.font = `900 17px ${HF}`; g.fillText(key, X(s.x), Z(s.z) + 6);
    }
    const d = i.drive;
    if (d && (d.state === 'planted' || p.team === i.atk)) {
      const pos = d.carrier ? d.carrier.pos : d;
      g.fillStyle = d.state === 'planted' ? '#ef4444' : '#4ade80';
      g.fillRect(X(pos.x) - 5, Z(pos.z) - 5, 10, 10);
    }
    if (PUI.jammed()) return;
    const now = performance.now();
    for (const b of G().bots) {
      if (!b.alive || b.team === p.team || !(b.st && b.st.reveal > 0)) continue;
      g.fillStyle = '#f43f5e';
      g.beginPath(); g.arc(X(b.pos.x), Z(b.pos.z), 6, 0, Math.PI * 2); g.fill();
      g.strokeStyle = `rgba(244,63,94,${0.5 + 0.5 * Math.sin(now / 120)})`; g.lineWidth = 2;
      g.beginPath(); g.arc(X(b.pos.x), Z(b.pos.z), 10, 0, Math.PI * 2); g.stroke();
    }
  };
  PUI.jamNoise = function (g, S) {
    for (let k = 0; k < 260; k++) {
      const v = Math.floor(Math.random() * 200 + 40);
      g.fillStyle = `rgba(${v},${v + 15},${v + 10},0.75)`;
      g.fillRect(Math.random() * S, Math.random() * S, 4, 3);
    }
    g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(0, S / 2 - 16, S, 32);
    g.fillStyle = '#5eead4'; g.font = `900 20px ${HF}`; g.textAlign = 'center'; g.fillText('JAMMED', S / 2, S / 2 + 7);
  };

  // ---------------------------------------------------------------- screen overlay
  function diamond(g, x, y, label, color, distM) {
    g.save();
    g.translate(x, y);
    g.fillStyle = 'rgba(8,11,19,0.7)'; g.strokeStyle = color; g.lineWidth = 2;
    g.beginPath(); g.moveTo(0, -13); g.lineTo(13, 0); g.lineTo(0, 13); g.lineTo(-13, 0); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = color; g.font = `900 15px ${HF}`; g.textAlign = 'center'; g.fillText(label, 0, 5.5);
    if (distM !== undefined) { g.font = '800 10px -apple-system, system-ui, sans-serif'; g.fillStyle = '#fff'; g.fillText(Math.round(distM) + 'm', 0, 26); }
    g.restore();
  }
  PUI.overlay = function (g, w, h, now) {
    const i = P().info();
    if (!i) return;
    const p = G().player, project = NA.UI.project, cam = NA.R.camera.position;
    for (const key of ['A', 'B']) {
      const s = i.sites[key], sp = project(s.x, 2.6, s.z, w, h);
      if (sp) diamond(g, sp.x, sp.y, key, '#facc15', Math.hypot(cam.x - s.x, cam.z - s.z));
    }
    const d = i.drive;
    if (d && d.state === 'planted') {
      const sp = project(d.x, d.y + 1.1, d.z, w, h);
      if (sp) {
        const pulse = 0.6 + 0.4 * Math.sin(now / (i.t < 10 ? 70 : 160));
        g.save(); g.translate(sp.x, sp.y);
        g.fillStyle = `rgba(239,68,68,${0.25 + 0.35 * pulse})`; g.beginPath(); g.arc(0, 0, 18, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#ef4444'; g.lineWidth = 2.5; g.beginPath(); g.arc(0, 0, 18, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (i.t / P().CFG.drive)); g.stroke();
        g.fillStyle = '#fff'; g.font = `900 14px ${HF}`; g.textAlign = 'center'; g.fillText(Math.ceil(i.t), 0, 5);
        g.restore();
      }
    } else if (d && d.state === 'ground' && p.team === i.atk) {
      const sp = project(d.x, d.y + 0.9, d.z, w, h);
      if (sp) diamond(g, sp.x, sp.y, '⬢', '#4ade80', Math.hypot(cam.x - d.x, cam.z - d.z));
    } else if (d && d.carrier && d.carrier !== p && d.carrier.team === p.team && d.carrier.alive) {
      const c = d.carrier, sp = project(c.pos.x, c.pos.y + 2.55, c.pos.z, w, h);
      if (sp) { g.fillStyle = '#4ade80'; g.font = `900 12px ${HF}`; g.textAlign = 'center'; g.fillText('DRIVE', sp.x, sp.y); }
    }
    // revealed enemies show through walls
    if (!PUI.jammed()) for (const b of G().bots) {
      if (!b.alive || b.team === p.team || !(b.st && b.st.reveal > 0)) continue;
      const sp = project(b.pos.x, b.pos.y + 1.1, b.pos.z, w, h);
      if (!sp) continue;
      const dist = Math.max(4, Math.hypot(cam.x - b.pos.x, cam.z - b.pos.z)), s = U.clamp(420 / dist, 10, 46);
      g.strokeStyle = `rgba(244,63,94,${0.65 + 0.35 * Math.sin(now / 110)})`; g.lineWidth = 2;
      g.strokeRect(sp.x - s * 0.42, sp.y - s, s * 0.84, s * 2);
      g.fillStyle = '#f43f5e'; g.font = `900 11px ${HF}`; g.textAlign = 'center'; g.fillText('REVEALED', sp.x, sp.y - s - 4);
    }
    const st = p.st || {};
    if (p.alive && cam.y < 5 && AG().inSmoke(cam.x, cam.z, -0.4)) { g.fillStyle = 'rgba(196,201,212,0.9)'; g.fillRect(0, 0, w, h); }
    if (p.alive && st.slow > 0) {
      const grad = g.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, h * 0.9);
      grad.addColorStop(0, 'rgba(56,189,248,0)'); grad.addColorStop(1, 'rgba(56,189,248,0.32)');
      g.fillStyle = grad; g.fillRect(0, 0, w, h);
    }
    if (p.alive && st.reveal > 0) {
      g.fillStyle = 'rgba(127,29,29,0.75)'; g.fillRect(w / 2 - 62, h * 0.2 - 13, 124, 20);
      g.fillStyle = '#fecaca'; g.font = `900 12px ${HF}`; g.textAlign = 'center'; g.fillText('YOU ARE REVEALED', w / 2, h * 0.2 + 2);
    }
    if (p.alive && st.blind > 0) { g.fillStyle = `rgba(255,255,255,${Math.min(1, st.blind / 0.7) * 0.97})`; g.fillRect(0, 0, w, h); }
  };
})(window.NA);
