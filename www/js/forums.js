/* NO ANTICHEAT: cheat forums. Made-up coder forums where you hire sellers to write versions of
   cheat.lua for you: cheaper than writing them yourself, and they can skip the files a version
   normally needs. The catch: some sellers are scammers, some ship buggy code that crashes, and some
   sell code Warden already knows (DETECTED). Read the reviews (some are fake), check how long they've
   been around and watch their proof before you pay. Offers rotate every 3 minutes. */
(function (NA) {
  'use strict';
  const U = NA.U, D = NA.DATA;
  const Fo = NA.Forums = {};
  const S = () => NA.Save.data;
  const esc = s => U.esc(s);
  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  const FORUMS = [
    { id: 'h4xboard', name: 'h4xboard', site: 'h4xboard.net/market/coders', tier: 1, acc: '#3b82f6', short: 'h4xboard',
      tag: 'the biggest coder market. most of them deliver.', slots: 4 },
    { id: 'pastebucket', name: 'pastebucket', site: 'pastebucket.io/wts', tier: 1, acc: '#f97316', short: 'pastebucket',
      tag: 'cheap code, no questions, no refunds, no guarantees.', slots: 4 },
    { id: 'ring0', name: 'ring0', site: 'ring0.cc/private/hire', tier: 4, acc: '#22c55e', short: 'ring0.cc',
      tag: 'invite only. expensive. they rarely miss.', slots: 3 },
  ];
  const BYF = {}; FORUMS.forEach(f => { BYF[f.id] = f; });
  Fo.LIST = FORUMS; Fo.BY = BYF;

  // the regulars. kind: what they really ship. tell: 0 obvious, 1 kinda sus, 2 you can't tell
  const SELLERS = [
    { id: 'lua_lord', forum: 'h4xboard', kind: 'clean', joined: 912, posts: 4210, rating: 4.8, sales: 1840, price: 0.85, spec: ['aim', 'visuals'] },
    { id: 'kernel_kid', forum: 'h4xboard', kind: 'clean', joined: 640, posts: 1902, rating: 4.6, sales: 690, price: 0.8, spec: ['bypass', 'server'] },
    { id: 'framefixer', forum: 'h4xboard', kind: 'buggy', joined: 380, posts: 880, rating: 3.6, sales: 410, price: 0.6, spec: ['weapon', 'movement', 'aim'] },
    { id: 'oldschool_ed', forum: 'h4xboard', kind: 'detected', joined: 1500, posts: 7600, rating: 4.4, sales: 3100, price: 0.5, tell: 1, spec: ['aim', 'visuals', 'exploits'] },
    { id: 'softaim_sam', forum: 'h4xboard', kind: 'clean', joined: 270, posts: 610, rating: 4.5, sales: 260, price: 0.75, spec: ['aim'] },
    { id: 'trustme_bro', forum: 'h4xboard', kind: 'scam', joined: 4, posts: 2, rating: 5.0, sales: 0, price: 0.35, tell: 0, spec: ['aim', 'visuals', 'exploits'] },
    { id: 'espresso', forum: 'h4xboard', kind: 'scam', joined: 21, posts: 14, rating: 4.9, sales: 31, price: 0.45, tell: 1, spec: ['visuals'] },
    { id: 'pasta_chef', forum: 'pastebucket', kind: 'buggy', joined: 160, posts: 300, rating: 3.2, sales: 520, price: 0.45, spec: ['aim', 'weapon', 'movement'] },
    { id: '0xDEAD', forum: 'pastebucket', kind: 'detected', joined: 1100, posts: 90, rating: 3.9, sales: 2200, price: 0.4, tell: 0, spec: ['aim', 'exploits', 'visuals'] },
    { id: 'freecodez', forum: 'pastebucket', kind: 'scam', joined: 2, posts: 1, rating: 5.0, sales: 0, price: 0.3, tell: 0, spec: ['aim', 'visuals', 'weapon', 'exploits'] },
    { id: 'ghostwriter', forum: 'pastebucket', kind: 'clean', joined: 520, posts: 140, rating: 4.3, sales: 380, price: 0.6, spec: ['visuals', 'server', 'misc'] },
    { id: 'dll_dave', forum: 'pastebucket', kind: 'scam', joined: 33, posts: 40, rating: 4.7, sales: 58, price: 0.4, tell: 1, spec: ['bypass', 'aim'] },
    { id: 'bytemage', forum: 'pastebucket', kind: 'buggy', joined: 75, posts: 60, rating: 3.8, sales: 140, price: 0.5, tell: 1, spec: ['exploits', 'weapon'] },
    { id: 'n0name', forum: 'ring0', kind: 'clean', joined: 2400, posts: 310, rating: 4.9, sales: 260, price: 1.15, spec: ['aim', 'exploits', 'bypass'] },
    { id: 'silent_one', forum: 'ring0', kind: 'clean', joined: 1800, posts: 120, rating: 5.0, sales: 140, price: 1.25, spec: ['aim', 'visuals'] },
    { id: 'vanta', forum: 'ring0', kind: 'detected', joined: 2100, posts: 520, rating: 4.7, sales: 410, price: 0.95, tell: 2, spec: ['visuals', 'exploits', 'movement'] },
    { id: 'old_reliable', forum: 'ring0', kind: 'scam', joined: 3100, posts: 2900, rating: 4.9, sales: 1200, price: 1.0, tell: 2, spec: ['aim', 'bypass'] },
  ];
  const BYS = {}; SELLERS.forEach(s => { BYS[s.id] = s; });
  Fo.SELLERS = BYS;

  // reviews. fake ones are short, all caps-happy, and posted the same day by brand-new accounts
  const REV = {
    clean: ['2 weeks on it, no flags. works on every map', 'smooth. bit pricey but you get what you pay for', 'delivered in 10 min and explained the config', 'support answered at 3am lol. legit', 'used it all season. clean', 'third time buying from them. never had an issue'],
    buggy: ['works but crashes every few matches', 'had to restart my game twice in one match', 'good when it doesn\'t freeze', 'aim is nice, stability is not', 'crashed during a clutch. 3/5', 'ok code, needs a pcall somewhere'],
    detected: ['worked last season. not sure anymore', 'my friend got flagged in ranked with this', 'warden picked it up after 2 days?', 'fine in casual, DO NOT use in ranked', 'old signature. seller says it\'s fine', 'got a ban wave email 3 days after'],
    scamTell: ['paid and he blocked me', 'SCAMMER. took my credits and left', 'never delivered. stay away', 'account was made yesterday lmao'],
    fake: ['best cheat ever!!!', 'legit 10/10 A+++', 'TRUSTED SELLER!!!', 'works perfect thank u', 'fast and legit!!!!', 'buy from him!!'],
  };
  const REVIEWERS = ['n00bslayer', 'clutch_god', 'kd_inflator', 'midnight_aim', 'tryhard_tim', 'noscope_nan', 'pingpong', 'flickr', 'rank_gremlin', 'ttv_nobody', 'ez4me', 'sus_steve', 'legit_lou', 'jeffrey', 'cheesemaster', 'w_key', 'peekr'];
  const PROOF = {
    clean: ['recent clip, same features as the listing', 'clip from this season. looks like the real thing', '1:12 clip, every feature shown'],
    buggy: ['the clip cuts off right as the game freezes', 'clip is smooth, but you can see a crash popup at 0:41', 'short clip. nothing after 20 seconds'],
    detected: ['clip is from 3 Warden updates ago', 'clip date: 74 days ago', 'it\'s an old clip with an old UI'],
    scam0: ['the clip has someone else\'s watermark (ttv_clipfarmer)', 'it\'s a YouTube video from 2019', 'no proof. "trust me"'],
    scam1: ['clip looks fine, but the username in it isn\'t theirs', 'clip is a screen recording of a different cheat menu'],
  };
  const TITLE_TAG = { clean: ['clean', 'undetected', 'smooth', 'stable'], buggy: ['fast', 'cheap', 'beta'], detected: ['proven', 'classic', 'used by thousands'], scam: ['UNDETECTED', 'BEST', 'LIFETIME', 'CHEAPEST'] };

  Fo.slot = () => NA.Sellers.slot();
  Fo.unlocked = id => S().highestTier >= BYF[id].tier;
  const fs = () => { const s = S(); if (!s.forums) s.forums = { sold: {}, history: {}, log: [] }; return s.forums; };

  // which versions a seller could write for you right now (tier reached, not maxed; needs can be skipped)
  function eligible(spec) {
    const out = [];
    for (const f of NA.Code.FILES) {
      if (f.kind !== 'cheat' || f.id === 'practice' || f.id === 'rgb') continue;
      const lv = NA.Code.level(f.id);
      if (lv >= f.max || S().highestTier < f.tier) continue;
      if (spec && !spec.includes(f.folder)) continue;
      out.push(f);
    }
    return out;
  }
  const cache = {};
  Fo.offers = function (forumId) {
    const slot = Fo.slot(), F = BYF[forumId];
    const key = forumId + ':' + slot + ':' + S().highestTier;   // fixed for the whole 3 minutes (what you buy shows as YOU HAVE IT)
    if (cache[key]) return cache[key];
    const r = rng(hash(forumId) ^ Math.imul(slot, 2654435761));
    const pool = SELLERS.filter(s => s.forum === forumId);
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
    const out = [];
    for (const sl of pool) {
      if (out.length >= F.slots) break;
      let files = eligible(sl.spec);
      if (!files.length) files = eligible(null);
      if (!files.length) continue;
      const f = files[Math.floor(r() * files.length)], v = NA.Code.level(f.id) + 1;
      let q = sl.kind;
      if (q === 'clean' && r() < 0.1) q = 'buggy';
      else if (q === 'buggy' && r() < 0.4) q = 'clean';
      else if (q === 'detected' && r() < 0.3) q = 'clean';
      const base = NA.Code.cost(f.id);
      const price = Math.max(5, Math.round(base * sl.price * (0.9 + r() * 0.2)));
      const tag = TITLE_TAG[q === 'clean' && sl.kind === 'scam' ? 'scam' : sl.kind][Math.floor(r() * 3)];
      const nRev = 3, reviews = [];
      const tell = sl.tell == null ? 1 : sl.tell;
      for (let i = 0; i < nRev; i++) {
        let text, fake = false;
        if (sl.kind === 'scam') {
          if (tell === 0 && i === 0) text = REV.scamTell[Math.floor(r() * REV.scamTell.length)];
          else if (tell === 2) text = REV.clean[Math.floor(r() * REV.clean.length)];
          else { text = REV.fake[Math.floor(r() * REV.fake.length)]; fake = true; }
        } else if (sl.kind === 'clean') text = REV.clean[Math.floor(r() * REV.clean.length)];
        else if (tell === 2) text = REV.clean[Math.floor(r() * REV.clean.length)];
        else text = (i === 0 || (tell === 0 && i === 1)) ? REV[sl.kind][Math.floor(r() * REV[sl.kind].length)] : REV.clean[Math.floor(r() * REV.clean.length)];
        reviews.push({ who: REVIEWERS[Math.floor(r() * REVIEWERS.length)], text, ago: fake ? 0 : 1 + Math.floor(r() * 60), posts: fake ? 0 : 3 + Math.floor(r() * 400), fake });
      }
      let proof;
      if (sl.kind === 'scam') proof = tell === 2 ? PROOF.clean[0] : PROOF[tell === 0 ? 'scam0' : 'scam1'][Math.floor(r() * 2)];
      else if (tell === 2) proof = PROOF.clean[Math.floor(r() * PROOF.clean.length)];
      else proof = PROOF[q === 'clean' ? 'clean' : sl.kind][Math.floor(r() * 3)];
      const id = `${forumId}:${slot}:${sl.id}:${f.id}:${v}`;
      out.push({ id, forum: forumId, seller: sl, file: f, v, price, base, q, tag, reviews, proof, skips: !!NA.Code.why(f.id) && !/Tier/.test(NA.Code.why(f.id)) ? NA.Code.why(f.id) : '' });
    }
    return (cache[key] = out);
  };
  Fo.historyWith = id => fs().history[id] || { hires: 0, ok: 0, scam: 0, bug: 0, det: 0 };

  // pay a seller. returns { ok, outcome, msg }
  Fo.hire = function (offerId) {
    const s = S(), F = fs();
    let o = null;
    for (const fo of FORUMS) { const x = Fo.offers(fo.id).find(y => y.id === offerId); if (x) { o = x; break; } }
    if (!o) return { ok: false, msg: 'That offer is gone' };
    if (F.sold[o.id]) return { ok: false, msg: 'Already hired' };
    if (NA.Code.level(o.file.id) + 1 !== o.v) return { ok: false, msg: `You already have ${o.file.name} v${o.v}` };
    if (s.credits < o.price) return { ok: false, msg: `Need ${U.fmt(o.price - s.credits)} more` };
    s.credits -= o.price;
    F.sold[o.id] = true;
    const h = F.history[o.seller.id] || (F.history[o.seller.id] = { hires: 0, ok: 0, scam: 0, bug: 0, det: 0 });
    h.hires++;
    let msg, outcome = o.q;
    if (o.q === 'scam') {
      h.scam++;
      msg = U.pick([`${o.seller.id} took your ${U.fmt(o.price)} and blocked you.`, `${o.seller.id}'s account was deleted 5 minutes after you paid.`, `${o.seller.id}: "sent!" (nothing arrived)`]);
      if (s.achievements.indexOf('scammed') < 0) NA.Game.achieve('scammed', 'Scammed');
    } else {
      NA.Code.forumWrite(o.file.id, { seller: o.seller.id, forum: o.forum, q: o.q, price: o.price });
      if (o.q === 'clean') { h.ok++; msg = `${o.seller.id} delivered ${o.file.name} v${o.v}. Clean.`; }
      else if (o.q === 'buggy') { h.bug++; msg = `${o.seller.id} delivered ${o.file.name} v${o.v}, but it's buggy: +${NA.Code.FB_PCT}% crash chance until you fix it.`; }
      else { h.det++; msg = `${o.seller.id} delivered ${o.file.name} v${o.v}. Warden already knows this code: DETECTED.`; }
    }
    F.log.unshift({ t: Date.now(), seller: o.seller.id, forum: o.forum, file: o.file.name, v: o.v, price: o.price, outcome });
    F.log = F.log.slice(0, 12);
    NA.Save.save();
    NA.Game.computeMods();
    return { ok: true, outcome, msg };
  };

  // ---------------------------------------------------------------- the forum page (inside the browser)
  function stars(r) { const full = Math.round(r); return '★'.repeat(full) + '☆'.repeat(5 - full); }
  function ageTxt(d) { return d < 30 ? `${d} day${d === 1 ? '' : 's'}` : d < 365 ? `${Math.round(d / 30)} months` : `${(d / 365).toFixed(1)} years`; }
  Fo.page = function (forumId) {
    const F = BYF[forumId], s = S(), fsd = fs();
    if (!Fo.unlocked(forumId)) return `<div class="fo-page fo-${forumId}"><div class="fo-lock">🔒 ${esc(F.name)} is invite only. Get to Tier ${F.tier} and someone will vouch for you.</div></div>`;
    const offers = Fo.offers(forumId);
    const rows = offers.map(o => {
      const sold = !!fsd.sold[o.id], sl = o.seller, hist = Fo.historyWith(sl.id), tell = sl.tell == null ? 1 : sl.tell;
      const off = Math.round((1 - o.price / o.base) * 100);
      const risky = o.file.risk && o.file.risk[o.v];
      const open = Fo.openId === o.id;
      const joinedFlag = sl.joined < 30 ? 'flag' : '';
      const revHtml = o.reviews.map(rv => `<div class="rv ${rv.fake && tell === 0 ? 'sus' : ''}"><b>${esc(rv.who)}</b><small>${rv.posts} posts · ${rv.ago ? rv.ago + 'd ago' : 'today'}</small><span>${esc(rv.text)}</span></div>`).join('');
      const histTxt = hist.hires ? `<span class="you">You: ${hist.hires} hire${hist.hires > 1 ? 's' : ''}${hist.ok ? ` · ${hist.ok} clean` : ''}${hist.bug ? ` · ${hist.bug} buggy` : ''}${hist.det ? ` · ${hist.det} detected` : ''}${hist.scam ? ` · <b>${hist.scam} scam</b>` : ''}</span>` : '';
      let btn;
      if (sold) btn = '<button class="hire done" disabled>HIRED</button>';
      else if (NA.Code.level(o.file.id) + 1 !== o.v) btn = '<button class="hire done" disabled>YOU HAVE IT</button>';
      else btn = `<button class="hire ${s.credits < o.price ? 'cant' : ''}" data-hire="${esc(o.id)}">HIRE · ${U.fmt(o.price)}${off > 0 ? ` <i>−${off}%</i>` : ''}</button>`;
      return `<div class="th ${sold ? 'sold' : ''}">
        <div class="th-t"><b>[SELLING]</b> ${esc(o.file.name)} v${o.v} <span>· ${esc(o.file.cheat.fx(o.v))}</span> <em>${esc(o.tag)}</em></div>
        <div class="th-s"><b class="sn">${esc(sl.id)}</b><span class="st">${stars(sl.rating)} ${sl.rating.toFixed(1)}</span><span class="${joinedFlag}">joined ${ageTxt(sl.joined)} ago</span><span>${U.num(sl.posts)} posts</span><span>${U.num(sl.sales)} sales</span>${histTxt}</div>
        <div class="th-f">${o.skips ? `<span class="sk">⇢ skips: ${esc(o.skips.replace('Needs ', ''))}</span>` : ''}${risky ? `<span class="rk">⚡ unstable version</span>` : ''}
          <button class="th-x" data-open="${esc(o.id)}">${open ? 'Hide' : 'Reviews & proof'} ▾</button>${btn}</div>
        ${open ? `<div class="th-d"><div class="rvs">${revHtml}</div><div class="pf"><b>▶ Proof clip</b><span>${esc(o.proof)}</span></div></div>` : ''}
      </div>`;
    }).join('');
    const log = fsd.log.filter(l => l.forum === forumId).slice(0, 4).map(l => `<li class="${l.outcome}"><b>${esc(l.seller)}</b> ${esc(l.file)} v${l.v} · ${U.fmt(l.price)} · <i>${{ clean: 'delivered', buggy: 'buggy', detected: 'DETECTED', scam: 'SCAMMED' }[l.outcome]}</i></li>`).join('');
    return `<div class="fo-page fo-${forumId}" style="--fa:${F.acc}">
      <div class="fo-head"><b>${esc(F.name)}</b><span>${esc(F.tag)}</span></div>
      <div class="fo-crumb">Marketplace › Coders for hire · new offers in <b data-restock>${NA.Sellers.fmtRestock()}</b></div>
      <div class="fo-note">Coders write the next version of a file in your cheat.lua. Cheaper than writing it yourself, and they can skip what a version needs. But some ship buggy code, some sell code Warden already detects, and some just take the money: check reviews, account age and proof.</div>
      ${rows || '<div class="fo-empty">Nobody\'s selling anything you can use right now. Check back after the restock.</div>'}
      ${log ? `<div class="fo-log"><h5>Your hires here</h5><ul>${log}</ul></div>` : ''}
    </div>`;
  };
  Fo.click = function (e) {
    const op = e.target.closest('[data-open]');
    if (op) { NA.Audio.click(); Fo.openId = Fo.openId === op.dataset.open ? null : op.dataset.open; NA.UI.renderShop(); return true; }
    const hb = e.target.closest('[data-hire]');
    if (hb) {
      const r = Fo.hire(hb.dataset.hire);
      if (!r.ok) { NA.Audio.deny(); NA.UI.toast(r.msg); hb.classList.remove('shake'); void hb.offsetWidth; hb.classList.add('shake'); return true; }
      if (r.outcome === 'scam') NA.Audio.deny(); else NA.Audio.buy();
      NA.UI.toast(r.msg);
      NA.UI.renderShop();
      return true;
    }
    return false;
  };
})(window.NA);
