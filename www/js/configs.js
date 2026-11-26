/* NO ANTICHEAT: the Advanced cheat-menu tab, saved profiles, and the Config Market
   (ready-made setups from made-up config makers, some of them scams). */
(function (NA) {
  'use strict';
  const U = NA.U, D = NA.DATA;
  const K = {};
  const S = () => NA.Save.data;

  // ---------------------------------------------------------------- advanced settings
  K.ADV_DEFAULTS = {
    reaction: 0, curve: 'linear', priority: 'crosshair', hitChance: 100, humanizer: 0, visCheck: true, aimKey: 'always',
    trigDelay: 0, trigMode: 'burst', espDist: 140, espColor: 'classic', radarSize: 'm', safeMode: false,
  };
  K.adv = () => Object.assign({}, K.ADV_DEFAULTS, S().adv || {});
  K.setAdv = function (key, val) { const s = S(); s.adv = Object.assign({}, s.adv || {}); s.adv[key] = val; NA.Save.save(); NA.Game.computeMods(); };
  const owns = id => NA.Save.level(id) > 0;
  // [key, kind, needs (cheat id or null), choices]
  K.ADV_ROWS = [
    ['h:c_aimbot', 'head', 'aimbot'],
    ['reaction', 'rng', 'aimbot', [0, 500, 20, 'ms']],
    ['curve', 'sel', 'aimbot', ['linear', 'smooth', 'human']],
    ['priority', 'sel', 'aimbot', ['crosshair', 'closest', 'lowhp']],
    ['hitChance', 'rng', 'aimbot', [10, 100, 5, '%']],
    ['humanizer', 'rng', 'aimbot', [0, 10, 1, '']],
    ['visCheck', 'chk', 'aimbot'],
    ['aimKey', 'sel', 'aimbot', ['always', 'whileFiring', 'whileAds']],
    ['h:c_triggerbot', 'head', 'triggerbot'],
    ['trigDelay', 'rng', 'triggerbot', [0, 300, 10, 'ms']],
    ['trigMode', 'sel', 'triggerbot', ['single', 'burst']],
    ['h:visuals', 'head', null],
    ['espDist', 'rng', 'wallhack', [25, 150, 5, 'm']],
    ['espColor', 'sel', 'wallhack', ['classic', 'ice', 'mono', 'rainbow']],
    ['radarSize', 'sel', 'radar', ['small', 'medium', 'large']],
    ['h:safeMode', 'head', null],
    ['safeMode', 'chk', null],
  ];
  const AIMKEY = { always: 'always', whileFiring: 'firing', whileAds: 'ads' }, RADAR = { small: 's', medium: 'm', large: 'l' };
  K.renderAdvanced = function () {
    const T = NA.I18N.t, a = K.adv(), esc = U.esc, out = [];
    for (const [key, kind, need, ch] of K.ADV_ROWS) {
      if (kind === 'head') { out.push(`<div class="cm-adv-h">${T(key.slice(2))}</div>`); continue; }
      if (need && !owns(need)) { out.push(`<div class="cm-opt dim"><span>${T(key)}</span><em>${T('locked')}</em></div>`); continue; }
      let v = a[key];
      if (key === 'aimKey') v = Object.keys(AIMKEY).find(k => AIMKEY[k] === v) || 'always';
      if (key === 'radarSize') v = Object.keys(RADAR).find(k => RADAR[k] === v) || 'medium';
      if (kind === 'chk') out.push(`<label class="cm-opt"><span>${T(key)}</span><input type="checkbox" data-adv="${key}" ${v ? 'checked' : ''}></label>`);
      else if (kind === 'sel') out.push(`<div class="cm-opt"><span>${T(key)}</span><select data-adv="${key}">${ch.map(c => `<option value="${c}" ${c === v ? 'selected' : ''}>${T(c)}</option>`).join('')}</select></div>`);
      else out.push(`<div class="cm-opt"><span>${T(key)}</span><input type="range" min="${ch[0]}" max="${ch[1]}" step="${ch[2]}" value="${v}" data-adv="${key}"><b>${v}${ch[3]}</b></div>`);
    }
    out.push(`<div class="cm-adv-h">${T('profiles')}</div>`);
    const prof = S().profiles || {};
    for (const slot of ['legit', 'closet', 'rage']) {
      out.push(`<div class="cm-opt"><span>${esc(T(slot))}${prof[slot] ? ' ✔' : ''}</span><span class="cm-pbtn"><button data-psave="${slot}">${T('save')}</button><button data-pload="${slot}" ${prof[slot] ? '' : 'disabled'}>${T('load')}</button></span></div>`);
    }
    return out.join('');
  };
  K.onAdvChange = function (el) {
    const key = el.dataset.adv;
    let v = el.type === 'checkbox' ? el.checked : el.type === 'range' ? +el.value : el.value;
    if (key === 'aimKey') v = AIMKEY[v];
    if (key === 'radarSize') v = RADAR[v];
    K.setAdv(key, v);
    if (el.type === 'range' && el.nextElementSibling) {
      const row = K.ADV_ROWS.find(r => r[0] === key);
      el.nextElementSibling.textContent = v + (row && row[3] ? row[3][3] : '');
    }
  };

  // ---------------------------------------------------------------- profiles + applying configs
  K.snapshot = function () {
    const s = S(), cheats = {};
    for (const c of D.CHEATS) {
      if (!c.toggle) continue;
      const st = s.cheats[c.id];
      if (st && st.level) cheats[c.id] = { enabled: st.enabled !== false, use: st.use || st.level, opt: Object.assign({}, st.opt || {}) };
    }
    return { cheats, adv: K.adv() };
  };
  K.saveProfile = function (slot) { const s = S(); s.profiles = Object.assign({}, s.profiles); s.profiles[slot] = K.snapshot(); NA.Save.save(); };
  // Apply a config: cheats it lists get switched on at its level (capped at what you own), the rest switch off.
  K.apply = function (cfg) {
    const s = S(), missing = [];
    for (const c of D.CHEATS) {
      if (!c.toggle) continue;
      const st = s.cheats[c.id], want = cfg.cheats[c.id];
      if (!st || !st.level) { if (want && want.enabled !== false) missing.push(c.name); continue; }
      if (!want && cfg.keep) continue; // visual packs leave the rest of your setup alone
      if (want && want.enabled !== false) {
        st.enabled = true;
        st.use = Math.max(1, Math.min(st.level, want.use || st.level));
        if (want.opt) st.opt = Object.assign({}, st.opt || {}, want.opt);
      } else st.enabled = false;
    }
    if (cfg.adv) s.adv = Object.assign({}, K.ADV_DEFAULTS, cfg.adv);
    if (cfg.client) s.client = Object.assign({}, s.client || {}, cfg.client);
    NA.Save.save();
    NA.Game.computeMods();
    return missing;
  };
  K.loadProfile = function (slot) { const p = (S().profiles || {})[slot]; return p ? K.apply(p) : null; };

  // ---------------------------------------------------------------- config market
  const ALL_ESP = { box: true, health: true, shield: true, name: true, distance: true, weapon: true, skeleton: true, platform: true, rank: true, kills: true, botTag: true, snaplines: true, chams: true };
  K.CONFIGS = [
    { id: 'closet', name: 'Closet King', author: 'silentsteve', stars: 4.8, dl: '48.2k', price: 350, tier: 3, tag: 'Looks legit on stream. Wins anyway.',
      reviews: ['"nobody suspects a thing" ★★★★★', '"12 ranked wins, 0 bans" ★★★★★', '"too legit, i still missed" ★★★'],
      cfg: { cheats: { aimbot: { use: 1, opt: { type: 'memory', bone: 'neck', smooth: 7, predict: true, fovCircle: false } }, aimassist: { use: 2 }, steady: { use: 3 },
        wallhack: { use: 2, opt: { box: true, health: true, shield: true, name: false, distance: false, weapon: false, skeleton: false, snaplines: false, chams: false } } },
        adv: { reaction: 220, curve: 'human', humanizer: 8, hitChance: 70, priority: 'crosshair', visCheck: true, aimKey: 'firing', safeMode: true } } },
    { id: 'tourney', name: 'Tournament Safe', author: 'configdaddy', stars: 4.5, dl: '31.9k', price: 900, tier: 4, tag: 'Balanced for Ranked. Warden-tested™.',
      reviews: ['"hit Diamond with this" ★★★★★', '"safe mode saved my account twice" ★★★★', '"a bit slow on snipers" ★★★★'],
      cfg: { cheats: { aimbot: { use: 2, opt: { type: 'memory', bone: 'head', smooth: 4, predict: true, fovCircle: true } }, triggerbot: { use: 1, opt: { headOnly: false } },
        wallhack: { use: 3, opt: { box: true, health: true, shield: true, name: true, distance: true, weapon: true, skeleton: false, snaplines: false, chams: false } },
        norecoil: { use: 2 }, nospread: { use: 3 }, steady: { use: 4 }, radar: { use: 1 } },
        adv: { reaction: 140, curve: 'smooth', humanizer: 5, hitChance: 85, trigDelay: 80, trigMode: 'single', priority: 'crosshair', visCheck: true, aimKey: 'always', safeMode: true } } },
    { id: 'sniper', name: 'Quickscope Queen', author: 'quickscope_quinn', stars: 4.6, dl: '12.4k', price: 1200, tier: 5, tag: 'Snipers only. Scope, flick, click, leave.',
      reviews: ['"every scope is a headshot" ★★★★★', '"useless with an smg lol" ★★★', '"aim key on ADS is genius" ★★★★★'],
      cfg: { cheats: { aimbot: { use: 4, opt: { type: 'memory', bone: 'head', smooth: 1, predict: true, fovCircle: false } }, triggerbot: { use: 3, opt: { headOnly: true } }, steady: { use: 5 }, nospread: { use: 5 } },
        adv: { reaction: 60, curve: 'linear', aimKey: 'ads', trigMode: 'single', trigDelay: 0, priority: 'crosshair', hitChance: 100, humanizer: 2, visCheck: true } } },
    { id: 'loot', name: 'Loot Goblin', author: 'goldgunsonly', stars: 4.4, dl: '9.7k', price: 800, tier: 4, tag: 'For Loot Rush. Purple or nothing.',
      reviews: ['"legendary every game" ★★★★★', '"walked into 4 people looting. still worth it" ★★★★'],
      cfg: { cheats: { lootesp: { use: 3, opt: { minRarity: 3, weapons: true, shields: true, meds: true } }, radar: { use: 1 }, speedhack: { use: 1 }, steady: { use: 3 } }, adv: { espDist: 120 } } },
    { id: 'spray', name: 'Laser Beam', author: 'spraygod', stars: 4.2, dl: '21.1k', price: 600, tier: 3, tag: 'Zero recoil, zero spread, zero shame.',
      reviews: ['"my bullets go in a straight line now??" ★★★★★', '"chat called me a laser. accurate" ★★★★'],
      cfg: { cheats: { norecoil: { use: 3 }, nospread: { use: 5 }, steady: { use: 5 }, rapidfire: { use: 2 }, aimassist: { use: 5 } }, adv: {} } },
    { id: 'rage', name: 'Full Send', author: 'xXrageXx', stars: 3.9, dl: '66.6k', price: 700, tier: 5, tag: 'Everything on. Ranked not recommended (lol).',
      reviews: ['"banned in 40 seconds 10/10" ★★★★★', '"K/D 47. account gone" ★★★★', '"casual only. trust" ★★★★'],
      cfg: { cheats: { aimbot: { use: 5, opt: { type: 'silent', bone: 'head', smooth: 1, predict: true } }, triggerbot: { use: 3 }, wallhack: { use: 5, opt: ALL_ESP }, speedhack: { use: 4 },
        rapidfire: { use: 4 }, infammo: { use: 1 }, wallbang: { use: 3 }, freeze: { use: 2 }, radar: { use: 1 }, nospread: { use: 5 }, norecoil: { use: 3 } },
        adv: { reaction: 0, curve: 'linear', hitChance: 100, humanizer: 0, visCheck: false, aimKey: 'always', trigMode: 'burst', safeMode: false } } },
    { id: 'rainbow', name: 'Rainbow Visuals Pack', author: 'esp_artist', stars: 4.9, dl: '88.4k', price: 450, tier: 2, tag: 'RGB everything. Corner boxes, rainbow chams, centre tracers.',
      reviews: ['"my screen looks like a gaming keyboard" ★★★★★', '"cant see the game anymore but it looks sick" ★★★★', '"10/10 drip" ★★★★★'],
      cfg: { keep: true, cheats: { wallhack: { use: 5, opt: ALL_ESP }, lootesp: { use: 2 } }, adv: { espColor: 'rainbow' },
        client: { theme: 'rainbow', boxStyle: 'corners', chamsStyle: 'rainbow', tracer: 'center', watermark: true, arraylist: true, hitSound: 'pop' } } },
    { id: 'clean', name: 'Clean Minimal', author: 'minimalist.cfg', stars: 4.7, dl: '23.0k', price: 300, tier: 2, tag: 'Mint corners, health bars, nothing else. Looks clean in clips.',
      reviews: ['"finally a config that does not look like a christmas tree" ★★★★★', '"quiet and deadly" ★★★★'],
      cfg: { cheats: { wallhack: { use: 2, opt: { box: true, health: true, shield: true, name: false, distance: false, weapon: false, skeleton: false, snaplines: false, chams: false } }, aimassist: { use: 2 } },
        client: { theme: 'mint', boxStyle: 'corners', chamsStyle: 'solid', tracer: 'bottom', arraylist: false, watermark: true, hitSound: 'classic' } } },
    { id: 'neon', name: 'Neon HvH', author: 'hvh_legend', stars: 4.3, dl: '41.7k', price: 1100, tier: 5, tag: '3D boxes, pulsing chams, ding on every hit. Casual only. Obviously.',
      reviews: ['"the ding is addictive" ★★★★★', '"banned before the first ding" ★★★', '"rage but make it pretty" ★★★★★'],
      cfg: { cheats: { aimbot: { use: 5, opt: { type: 'silent', bone: 'head', smooth: 1, predict: true, fovCircle: true } }, triggerbot: { use: 3 }, wallhack: { use: 5, opt: ALL_ESP }, nospread: { use: 5 }, norecoil: { use: 3 }, rapidfire: { use: 3 } },
        adv: { reaction: 0, curve: 'linear', hitChance: 100, humanizer: 0, visCheck: false, aimKey: 'always', espColor: 'classic' },
        client: { theme: 'crimson', boxStyle: '3d', chamsStyle: 'pulse', tracer: 'top', watermark: true, arraylist: true, hitSound: 'ding' } } },
    { id: 'scam1', name: 'FREE UNDETECTED CFG 2026 (legit 100%)', author: 'kernel_kid_real', stars: 5.0, dl: '3', price: 1500, tier: 3, scam: 'trash', tag: '100% undetected. Limited time. Trust me bro.',
      reviews: ['"amazing" ★★★★★', '"amazing" ★★★★★', '"amazing" ★★★★★'],
      cfg: { cheats: { speedhack: { use: 4 }, rapidfire: { use: 4 } }, adv: { visCheck: false, safeMode: false, humanizer: 0 } } },
    { id: 'scam2', name: 'Private Pack (pay first, DM after)', author: 'trusted_seller_01', stars: 4.9, dl: '—', price: 2500, tier: 4, scam: 'never', tag: 'Best private config. Delivered after payment.',
      reviews: ['"he delivered (i think)" ★★★★★', '"still waiting" ★', '"vouch" ★★★★★'], cfg: null },
  ];
  K.owned = id => (S().configsOwned || []).indexOf(id) >= 0;
  K.needs = cfg => Object.keys(cfg.cheats || {}).filter(id => !owns(id)).map(id => D.CHEAT[id].name);
  K.buy = function (id) {
    const s = S(), c = K.CONFIGS.find(x => x.id === id);
    if (!c || s.credits < c.price || s.highestTier < c.tier) return { ok: false };
    s.credits -= c.price;
    if (c.scam === 'never') {
      NA.Save.save();
      NA.Chat.dm(`${c.author}: payment received. config is "processing"`);
      setTimeout(() => NA.Chat.dm(`${c.author} has blocked you.`), 15000);
      NA.Game.achieve('scammed', 'Scammed');
      return { ok: true, scam: 'never' };
    }
    if (!K.owned(id)) s.configsOwned = (s.configsOwned || []).concat([id]);
    const missing = K.apply(c.cfg);
    if (c.scam === 'trash') { NA.Chat.dm(`${c.author}: lol thanks for the ${U.fmt(c.price)}`); NA.Game.achieve('scammed', 'Scammed'); }
    return { ok: true, missing, scam: c.scam };
  };
  K.shopHtml = function () {
    const s = S(), esc = U.esc, html = ['<div class="cat-h">Config Market <span class="muted small">community configs · applies to cheats you own</span></div><div class="items">'];
    for (const c of K.CONFIGS) {
      const locked = s.highestTier < c.tier, owned = K.owned(c.id), needs = c.cfg ? K.needs(c.cfg) : [];
      const review = c.reviews[(Math.floor(Date.now() / 6e4) + c.id.length) % c.reviews.length];
      let btn;
      if (locked) btn = `<button class="buy cant" disabled>Tier ${c.tier}</button>`;
      else if (owned) btn = `<button class="buy" data-cfg-apply="${c.id}">APPLY</button>`;
      else btn = `<button class="buy ${s.credits < c.price ? 'cant' : ''}" data-cfg-buy="${c.id}">BUY ${U.fmt(c.price)}</button>`;
      html.push(`<div class="item cfg ${locked ? 'locked' : ''}">
        <div class="iname">${esc(c.name)}</div>
        <div class="itag">by @${esc(c.author)} · <span class="stars">★ ${c.stars.toFixed(1)}</span> · ${c.dl} downloads</div>
        <div class="ifx">${esc(c.tag)}<br><i>${esc(review)}</i>${needs.length && !locked ? `<br><span class="need">Uses ${esc(needs.slice(0, 4).join(', '))}${needs.length > 4 ? '…' : ''} (not owned)</span>` : ''}</div>
        <div class="ufoot"><span class="und cfg-own">${owned ? '✔ OWNED' : ''}</span>${btn}</div></div>`);
    }
    html.push('</div>');
    return html.join('');
  };

  NA.Cfg = K;
})(window.NA);
