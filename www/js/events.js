/* NO ANTICHEAT: event modes. Loot Rush (everyone starts with a pistol, the map is covered in loot,
   bots loot too, guns drop on death) and Chaos FFA (rotating goofy modifiers, live on weekends
   and during the daily Chaos Hour). */
(function (NA) {
  'use strict';
  const U = NA.U, D = NA.DATA, C = NA.Chat;
  const E = {};
  const S = () => NA.Save.data;
  const fill = n => { const a = []; while (a.length < n) a.push('*'); return a; };
  const topTier = () => D.TIERS[Math.max(3, Math.min(S().highestTier, D.MAX_PLAYABLE_TIER)) - 1];

  E.lootUnlocked = () => S().highestTier >= 3;
  E.chaosUnlocked = () => S().highestTier >= 3;

  // ---------------------------------------------------------------- schedule
  // Live Fri 3 pm → Mon 3 am (local), plus Chaos Hour every evening 6–9 pm.
  E.chaosWindow = function (now) {
    now = now || new Date();
    if (S().flags.eventsAlwaysLive) return { live: true, label: 'LIVE (admin)', ms: 0 };
    const t = new Date(now), day = t.getDay(), h = t.getHours() + t.getMinutes() / 60;
    const weekend = (day === 5 && h >= 15) || day === 6 || day === 0 || (day === 1 && h < 3);
    if (weekend) {
      const end = new Date(t);
      end.setDate(end.getDate() + (8 - day) % 7); // Fri→Mon is 3 days, Sat 2, Sun 1, Mon 0
      end.setHours(3, 0, 0, 0);
      return { live: true, label: 'Weekend event', ms: end - t };
    }
    if (h >= 18 && h < 21) { const end = new Date(t); end.setHours(21, 0, 0, 0); return { live: true, label: 'Chaos Hour', ms: end - t }; }
    const next = new Date(t);
    if (h >= 21) next.setDate(next.getDate() + 1);
    next.setHours(18, 0, 0, 0);
    return { live: false, label: 'Next Chaos Hour', ms: next - t };
  };
  E.fmt = ms => { const m = Math.max(0, Math.round(ms / 60000)); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`; };

  // ---------------------------------------------------------------- tiers
  E.lootTier = function () {
    const t = topTier(), hi = t.id;
    const map = hi >= 8 ? 'island' : hi >= 7 ? 'metro' : hi >= 5 ? 'shipyard' : 'courtyard';
    const players = { island: 16, metro: 12, shipyard: 10, courtyard: 8 }[map];
    return {
      id: 200, name: 'Loot Rush', rank: t.rank, map, mode: 'ffa', modeLabel: 'Loot Rush', scoreToWin: map === 'island' ? 20 : 15, timeLimit: 420,
      base: Math.round(t.base * 0.9), kill: t.kill, winsToUnlock: 99, shield: 0, loot: true, lootMode: true, lootTier: hi,
      bot: Object.assign({}, t.bot, { weapons: ['p9'] }), enemies: fill(players - 1), allies: [],
    };
  };
  E.chaosTier = function () {
    const t = topTier(), hi = t.id;
    const maps = ['warehouse', 'courtyard'].concat(hi >= 5 ? ['shipyard'] : [], hi >= 6 ? ['office'] : []);
    return {
      id: 300, name: 'Chaos FFA', rank: t.rank, map: U.pick(maps), mode: 'ffa', modeLabel: 'Chaos FFA', scoreToWin: 20, timeLimit: 300,
      base: Math.round(t.base * 1.1), kill: t.kill, winsToUnlock: 99, shield: 0, loot: hi >= 4, chaos: true,
      bot: Object.assign({}, t.bot), enemies: fill(9), allies: [],
    };
  };

  // ---------------------------------------------------------------- chaos modifiers
  E.MODS = {
    bigheads: { name: 'BIG HEADS', desc: 'everyone\'s head is huge' },
    moon: { name: 'MOON GRAVITY', desc: 'jump forever' },
    speed: { name: 'SPEED DEMON', desc: 'everyone runs 60% faster' },
    rapid: { name: 'RAPID FIRE FOR ALL', desc: 'every gun fires twice as fast' },
    oneshot: { name: 'ONE TAP', desc: 'all damage ×4' },
    aimbot: { name: 'AIMBOT FOR ALL', desc: 'everyone gets aimbot. yes, everyone' },
    walls: { name: 'WALLHACK FOR ALL', desc: 'everyone sees through walls' },
    disco: { name: 'DISCO', desc: 'the lights have opinions' },
  };
  E.startChaos = function (mt) {
    mt.chaosFx = { cur: null, t: 4, last: null };
  };
  function setMod(mt, id, on) {
    const fx = mt.chaosFx;
    fx[id] = on;
    if (id === 'disco' && !on) restoreSky();
    NA.Game.computeMods();
  }
  function restoreSky() {
    const W = NA.World, R = NA.R;
    if (!W.current || !R.scene.fog) return;
    const c = new THREE.Color(W.current.def.sky);
    R.scene.fog.color.copy(c);
    if (R.scene.background && R.scene.background.isColor) R.scene.background.copy(c);
  }
  E.tickChaos = function (mt, dt) {
    const fx = mt.chaosFx;
    fx.t -= dt;
    if (fx.disco) {
      const c = new THREE.Color().setHSL((performance.now() / 1500) % 1, 0.75, 0.55);
      if (NA.R.scene.fog) NA.R.scene.fog.color.copy(c);
      if (NA.R.scene.background && NA.R.scene.background.isColor) NA.R.scene.background.copy(c);
    }
    if (fx.t > 0) return;
    if (fx.cur) setMod(mt, fx.cur, false);
    const ids = Object.keys(E.MODS).filter(k => k !== fx.cur);
    const id = U.pick(ids);
    fx.last = fx.cur; fx.cur = id; fx.t = 25;
    setMod(mt, id, true);
    NA.UI.centerMsg(`CHAOS: ${E.MODS[id].name}`, 2200);
    C.system(`CHAOS · ${E.MODS[id].name}: ${E.MODS[id].desc} (25 s)`, { priority: true });
    NA.Audio.buy();
  };
  E.stop = function () { restoreSky(); };

  // ---------------------------------------------------------------- event cards for the Play screen
  E.cards = function (tourneyCard) {
    const s = S(), cw = E.chaosWindow(), html = [];
    html.push(tourneyCard());
    const lt = E.lootTier(), lo = E.lootUnlocked();
    html.push(`<button class="tier ev-loot ${lo ? 'open' : 'locked'}" data-event="loot">
      <div class="swatch"></div><div class="tnum">EVENT · always on</div><div class="tname">Loot Rush</div>
      <div class="tmeta">Everyone spawns with a pistol. Loot the map, kills drop guns. ${lt.enemies.length + 1}-player FFA on ${D.MAPS[lt.map].name}</div>
      <div class="tpay">Win ${U.fmt(lt.base * NA.Game.diff().pay)} + ${U.fmt(lt.kill * NA.Game.diff().pay)}/kill</div>
      <div class="tprog">${lo ? 'Loot ESP is extra good here' : 'Locked: reach Tier 3'}</div></button>`);
    const ch = E.chaosUnlocked(), ct = E.chaosTier();
    html.push(`<button class="tier ev-chaos ${ch && cw.live ? 'open' : 'locked'}" data-event="chaos">
      <div class="swatch"></div><div class="tnum">${cw.live ? `<b class="live">● LIVE</b> · ${cw.label} · ends in ${E.fmt(cw.ms)}` : `EVENT · ${cw.label} in ${E.fmt(cw.ms)}`}</div><div class="tname">Chaos FFA</div>
      <div class="tmeta">10-player FFA. Every 25 s a new chaos modifier hits everyone: big heads, moon gravity, aimbot for all… No suspicion here.</div>
      <div class="tpay">Win ${U.fmt(ct.base * NA.Game.diff().pay)} + ${U.fmt(ct.kill * NA.Game.diff().pay)}/kill</div>
      <div class="tprog">${!ch ? 'Locked: reach Tier 3' : cw.live ? 'Live now' : 'Live on weekends (Fri 3 pm – Mon 3 am) and 6–9 pm daily'}</div></button>`);
    return html.join('');
  };
  E.play = function (kind) {
    if (kind === 'loot') {
      if (!E.lootUnlocked()) { NA.UI.toast('Loot Rush unlocks at Tier 3'); return false; }
      NA.Game.startMatch(E.lootTier());
      return true;
    }
    if (!E.chaosUnlocked()) { NA.UI.toast('Chaos FFA unlocks at Tier 3'); return false; }
    const cw = E.chaosWindow();
    if (!cw.live) { NA.UI.toast(`Chaos FFA is not live. ${cw.label} in ${E.fmt(cw.ms)}`); return false; }
    NA.Game.startMatch(E.chaosTier());
    return true;
  };

  NA.Events = E;
})(window.NA);
