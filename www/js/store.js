/* NO ANTICHEAT: Item Shop (daily featured deals + every cosmetic) and the Locker (try on and equip).
   Both share one screen: the character on the left, cards on the right. */
(function (NA) {
  'use strict';
  const U = NA.U, $ = id => document.getElementById(id);
  const ST = { mode: 'shop', tab: 'featured', sel: null, timer: null, queue: [] };
  const RAR = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
  const RCOL = ['#9ca3af', '#22c55e', '#3b82f6', '#a855f7', '#f59e0b'];
  const KINDS = [['outfit', 'OUTFITS', 'Outfit'], ['gunskin', 'GUN SKINS', 'Gun Skin'], ['knife', 'KNIVES', 'Knife'], ['killfx', 'KILL FX', 'Kill Effect']];
  const CS = () => NA.Cosmetics;
  const A = () => NA.Audio;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  ST.open = function (mode, focus) {
    ST.mode = mode;
    ST.tab = mode === 'shop' ? 'featured' : 'outfit';
    ST.sel = null;
    if (focus) { ST.tab = focus.kind; ST.sel = focus; }
    const s = NA.Save.data;
    if (mode === 'shop') { s.cosmetics.shopSeen = new Date().toDateString(); NA.Save.save(); }
    NA.UI.show('scr-items');
    NA.Showroom.setPreview(focus ? focus.kind : null, focus ? focus.id : null);
    render();
    clearInterval(ST.timer);
    ST.timer = setInterval(tick, 1000);
    tick();
  };
  ST.close = function () {
    clearInterval(ST.timer);
    NA.Showroom.setPreview(null);
    NA.UI.showMenu();
  };

  function featuredPrice(kind, id) {
    const f = CS().featured().items.find(x => x.kind === kind && x.id === id);
    return f ? f.price : null;
  }
  function priceOf(kind, id) {
    const fp = featuredPrice(kind, id);
    return fp !== null ? fp : CS().price(kind, id);
  }
  function card(kind, item, opts) {
    const C = CS(), own = C.owns(kind, item.id), eq = C.equipped(kind) === item.id;
    const sel = ST.sel && ST.sel.kind === kind && ST.sel.id === item.id;
    const full = C.price(kind, item.id), fp = featuredPrice(kind, item.id);
    let price;
    if (own) price = eq ? '' : 'OWNED';
    else if (ST.mode === 'locker') price = '<span style="color:#94a3b8">ITEM SHOP</span>';
    else if (fp !== null) price = `<s>₡${U.num(full)}</s>₡${U.num(fp)}`;
    else price = '₡' + U.num(full);
    const tag = eq ? '<span class="c-tag eq">EQUIPPED</span>' : '';
    const off = !own && fp !== null && ST.mode === 'shop' ? '<span class="c-tag off">-20%</span>' : '';
    const cls = `card r${item.rarity}${sel ? ' sel' : ''}${!own && ST.mode === 'locker' ? ' locked' : ''}${opts && opts.feat ? ' feat' : ''}`;
    ST.queue.push(kind + ':' + item.id);
    return `<button class="${cls}" data-kind="${kind}" data-id="${item.id}"><img data-thumb="${kind}:${item.id}" alt="">${tag}${off}<div class="c-info"><div class="c-name">${esc(item.name)}</div><div class="c-price">${price}</div></div></button>`;
  }
  function render() {
    const C = CS(), s = NA.Save.data;
    $('store-title').textContent = ST.mode === 'shop' ? 'ITEM SHOP' : 'LOCKER';
    $('store-credits').textContent = U.fmt(s.credits);
    const tabs = (ST.mode === 'shop' ? [['featured', 'FEATURED']] : []).concat(KINDS.map(k => [k[0], k[1]]));
    $('store-tabs').innerHTML = tabs.map(([k, l]) => `<button data-tab="${k}" class="${ST.tab === k ? 'on' : ''}">${l}</button>`).join('');
    ST.queue = [];
    let html = '';
    if (ST.tab === 'featured') {
      html += '<div class="sec">TODAY\'S DEALS &middot; 20% OFF</div>';
      html += C.featured().items.map(f => card(f.kind, C.get(f.kind, f.id), { feat: true })).join('');
      html += '<div class="sec">NEW TO THE SHOP</div>';
      const fresh = [['outfit', 'banana'], ['outfit', 'boss'], ['gunskin', 'glitch'], ['knife', 'katana'], ['killfx', 'lightning'], ['outfit', 'neon']];
      html += fresh.filter(([k, id]) => !C.featured().items.some(f => f.kind === k && f.id === id)).map(([k, id]) => card(k, C.get(k, id))).join('');
    } else {
      const list = C.list(ST.tab).slice().sort((a, b) => (ST.mode === 'locker' ? (C.owns(ST.tab, b.id) - C.owns(ST.tab, a.id)) : 0) || a.rarity - b.rarity);
      html += list.map(it => card(ST.tab, it)).join('');
    }
    $('store-grid').innerHTML = html;
    $('store-grid').scrollTop = 0;
    renderDetail();
    pumpThumbs();
  }
  // thumbnails are rendered a few per frame so opening the shop never freezes
  function pumpThumbs() {
    const grid = $('store-grid');
    const step = () => {
      if (!ST.queue.length || NA.UI.current !== 'scr-items') return;
      const t0 = performance.now();
      while (ST.queue.length && performance.now() - t0 < 12) {
        const key = ST.queue.shift(), i = key.indexOf(':');
        const url = NA.Showroom.thumb(key.slice(0, i), key.slice(i + 1));
        grid.querySelectorAll(`img[data-thumb="${key}"]`).forEach(img => { if (!img.src) img.src = url; });
      }
      if (ST.queue.length) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  function renderDetail() {
    const el = $('store-detail');
    if (!ST.sel) { el.classList.remove('on'); el.innerHTML = ''; return; }
    const C = CS(), { kind, id } = ST.sel, it = C.get(kind, id), s = NA.Save.data;
    const own = C.owns(kind, id), eq = C.equipped(kind) === id, price = priceOf(kind, id);
    let btn;
    if (eq) btn = '<button class="btn equip" disabled>EQUIPPED</button>';
    else if (own) btn = '<button class="btn equip" data-act="equip">EQUIP</button>';
    else if (ST.mode === 'locker') btn = '<button class="btn" data-act="goshop">GET IN SHOP</button>';
    else if (s.credits >= price) btn = `<button class="btn buy" data-act="buy">BUY ₡${U.num(price)}</button>`;
    else btn = `<button class="btn buy" disabled>NEED ₡${U.num(price - s.credits)} MORE</button>`;
    const kname = KINDS.find(k => k[0] === kind)[2];
    el.innerHTML = `<div class="d-row"><div><div class="d-rar" style="color:${RCOL[it.rarity]}">${RAR[it.rarity]} ${kname}</div><div class="d-name">${esc(it.name)}</div></div>${btn}</div><div class="d-desc">${esc(it.desc)}${kind === 'killfx' ? ' Plays when you get a kill.' : kind === 'knife' ? ' Press V or the knife button: backstabs are instant kills.' : ''}</div>`;
    el.classList.add('on');
  }
  function tick() {
    if (NA.UI.current !== 'scr-items') { clearInterval(ST.timer); return; }
    const C = CS();
    if (ST.mode === 'shop') {
      const ms = C.featured().resetsIn, p = n => String(n).padStart(2, '0');
      $('store-timer').textContent = `NEW ITEMS IN ${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)}`;
    } else {
      let own = 0, all = 0;
      for (const [k] of KINDS) for (const it of C.list(k)) { all++; if (C.owns(k, it.id)) own++; }
      $('store-timer').textContent = `${own}/${all} COLLECTED`;
    }
  }
  function select(kind, id) {
    ST.sel = { kind, id };
    document.querySelectorAll('#store-grid .card').forEach(c => c.classList.toggle('sel', c.dataset.kind === kind && c.dataset.id === id));
    NA.Showroom.setPreview(kind, id);
    renderDetail();
    A().click();
  }
  function act(what) {
    const C = CS(), { kind, id } = ST.sel, it = C.get(kind, id);
    if (what === 'buy') {
      if (!C.buy(kind, id, priceOf(kind, id))) { A().deny(); return; }
      A().buy(); NA.haptic('MEDIUM');
      NA.Showroom.setPreview(null);
      NA.Showroom.celebrate();
      NA.UI.toast(`Unlocked ${it.name}`);
      if (NA.Game.dressVM) NA.Game.dressVM();
    } else if (what === 'equip') {
      C.equip(kind, id);
      A().equip();
      NA.Showroom.setPreview(null);
      NA.UI.toast(`Equipped ${it.name}`);
      if (NA.Game.dressVM) NA.Game.dressVM();
    } else if (what === 'goshop') {
      ST.open('shop', { kind, id });
      return;
    }
    const keep = ST.sel, scroll = $('store-grid').scrollTop;
    render();
    ST.sel = keep;
    $('store-grid').scrollTop = scroll;
    renderDetail();
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('store-back').addEventListener('click', () => { A().click(); ST.close(); });
    $('store-tabs').addEventListener('click', e => {
      const b = e.target.closest('[data-tab]');
      if (!b) return;
      ST.tab = b.dataset.tab; ST.sel = null;
      NA.Showroom.setPreview(null);
      A().click();
      render();
    });
    $('store-grid').addEventListener('click', e => {
      const c = e.target.closest('.card');
      if (c) select(c.dataset.kind, c.dataset.id);
    });
    $('store-detail').addEventListener('click', e => {
      const b = e.target.closest('[data-act]');
      if (b && ST.sel) act(b.dataset.act);
    });
  });

  NA.Store = ST;
})(window.NA);
