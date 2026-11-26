/* NO ANTICHEAT: rival cheat sellers. Each one has its own menu, catalog, rotating stock,
   detection risk and quirks. Stock rotates every few minutes; Warden patches knock a
   seller offline (DETECTED, then UPDATING) every few matches. Your cheat levels are yours:
   the loader you pick decides which of them run, how high they go and how loud they are. */
(function (NA) {
  'use strict';
  const U = NA.U, D = NA.DATA;
  const ROT_MS = 180000; // stock rotates every 3 minutes (locked for the length of a match)
  const ALL = D.CHEATS.filter(c => c.toggle).map(c => c.id);
  const PRIO = ['aimbot', 'wallhack', 'triggerbot', 'wallbang', 'speedhack', 'rapidfire', 'freeze', 'radar', 'lootesp', 'nospread', 'norecoil', 'aimassist', 'infammo', 'steady', 'kdspoof', 'streamproof', 'voterig'];
  for (const id of ALL) if (!PRIO.includes(id)) PRIO.push(id);
  const LEGIT = ['aimassist', 'steady', 'nospread', 'norecoil', 'triggerbot', 'radar', 'wallhack', 'lootesp', 'kdspoof', 'streamproof'];

  const LIST = [
    {
      id: 'skillissue', name: 'skillissue.shop', short: 'skillissue', wm: ['skillissue', '.shop'], site: 'skillissue.shop', secure: false,
      tier: 1, price: 0, acc: '#a855f7', layout: 'side', ver: 'v2.0',
      tag: 'The one you started with. Every feature, mostly working.',
      perks: ['Every feature', 'No level cap', 'Normal detection'], quirks: ['3 features out of stock each drop'],
      catalog: ALL, down: 3, staples: ['aimassist', 'steady'], det: 1, cap: 99, slots: 99, weight: 3, dm: '',
      lines: {
        welcome: "you're back on my loader. good choice, i need the money",
        detected: "warden got us. we're detected for a bit. don't queue ranked on my loader rn",
        updating: 'updating the loader. give me one match',
        back: "loader's back up. undetected (for now)",
      },
    },
    {
      id: 'freehax', name: 'FREEHAX.EXE', short: 'FREEHAX', wm: ['FREEHAX', '.EXE'], site: 'free-hax-download.biz', secure: false,
      tier: 1, price: 0, free: true, acc: '#84cc16', layout: 'retro', ver: 'v6.6.6',
      tag: '100% FREE NO VIRUS!!! 4 random features each drop, 2 on at once, level 2 max.',
      perks: ['Free', 'Random features you might not have elsewhere'], quirks: ['Only 2 features on at once', 'Level 2 max', 'Twice as easy to detect', 'Crashes mid-match', 'Mines 5% of your match credits'],
      catalog: ALL, offer: 4, det: 2, cap: 2, slots: 2, miner: 0.05, crash: true, weight: 4, dm: '[FREEHAX.EXE]',
      lines: {
        welcome: 'THANK YOU FOR DOWNLOADING FREEHAX.EXE!!! please disable antivirus for best experience',
        detected: 'FREEHAX.EXE IS DETECTED. DO NOT WORRY. EVERYONE IS USING IT',
        updating: 'FREEHAX.EXE IS UPDATING. DO NOT TURN OFF YOUR COMPUTER',
        back: 'FREEHAX.EXE v6.6.7 IS OUT!!! 100% UNDETECTED (trust)',
      },
    },
    {
      id: 'ghost', name: 'ghost.cc', short: 'ghost.cc', wm: ['ghost', '.cc'], site: 'ghost.cc', secure: true,
      tier: 3, price: 1500, acc: '#34d399', layout: 'mini', ver: 'build 412',
      tag: 'Closet cheating, perfected. Legit-looking features only, very hard to detect.',
      perks: ['About a third of the detection', 'Safest loader for Ranked'], quirks: ['No aimbot, speed or exploits', 'Level 3 max', '2 features out of stock each drop'],
      catalog: LEGIT, down: 2, staples: ['aimassist'], det: 0.35, cap: 3, slots: 99, weight: 1, dm: '[ghost.cc]',
      lines: {
        welcome: "welcome to ghost.cc. rule one: don't be obvious.",
        detected: "minor flag on our signature. stay closet and you'll be fine.",
        updating: 'pushing a quiet update. back after one match.',
        back: 'update shipped. still a ghost.',
      },
    },
    {
      id: 'void', name: 'VOIDWARE', short: 'VOIDWARE', wm: ['VOID', 'WARE'], site: 'voidware.cc', secure: true,
      tier: 5, price: 6000, sub: 10, acc: '#fbbf24', layout: 'top', ver: 'PREMIUM',
      tag: 'Premium. Invite only. Every feature, about half the detection, and it panics for you before Warden scans.',
      perks: ['Every feature, no level cap', 'About half the detection', 'Auto-PANIC before Warden scans'], quirks: ['Subscription: 10 matches per payment', '1 feature out of stock each drop'],
      catalog: ALL, down: 1, staples: ['aimbot', 'wallhack'], det: 0.55, cap: 99, slots: 99, weight: 1, scanDodge: true, dm: '[VOIDWARE]',
      lines: {
        welcome: 'Welcome to VOIDWARE. Your license is active. Do not share it.',
        detected: 'Detection vector identified. Engineers are on it. Avoid Ranked for 2 matches.',
        updating: 'Silent update in progress, back after one match. +1 match added to your subscription.',
        back: 'VOIDWARE is undetected again. Enjoy.',
      },
    },
  ];
  const BY = {};
  LIST.forEach(x => { BY[x.id] = x; });

  const Sl = { LIST, BY, ROT_MS, PRIO, ALL };
  const S = () => NA.Save.data.sellers;
  const dm = (x, line) => { if (line) NA.Chat.dm((x.dm ? x.dm + ' ' : '') + line); };

  // ---------------------------------------------------------------- rotating stock (same for everyone at the same time)
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  Sl.slot = t => Math.floor((t || Date.now()) / ROT_MS);
  Sl.restockIn = () => ROT_MS - (Date.now() % ROT_MS);
  Sl.fmtRestock = () => { const s = Math.ceil(Sl.restockIn() / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const cache = {};
  Sl.stock = function (id, slot) {
    slot = slot === undefined ? Sl.slot() : slot;
    const key = id + ':' + slot;
    if (cache[key]) return cache[key];
    const x = BY[id], r = rng(hash(id) ^ Math.imul(slot, 2654435761));
    const staples = x.staples || [];
    const pool = x.catalog.filter(c => !staples.includes(c));
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
    let set;
    if (x.offer) set = new Set(pool.slice(0, x.offer));
    else { const down = new Set(pool.slice(0, x.down)); set = new Set(x.catalog.filter(c => !down.has(c))); }
    const keys = Object.keys(cache);
    if (keys.length > 32) delete cache[keys[0]];
    return (cache[key] = set);
  };

  // ---------------------------------------------------------------- ownership + status
  Sl.unlocked = id => NA.Save.data.highestTier >= BY[id].tier;
  Sl.owns = id => id === 'skillissue' || (BY[id].sub ? (S().subLeft || 0) > 0 : !!S().owned[id]);
  Sl.activeId = () => { const a = S().active; return BY[a] && Sl.owns(a) ? a : 'skillissue'; };
  Sl.active = () => BY[Sl.activeId()];
  Sl.status = id => { const st = S().status[id]; return st ? st.st : 'ok'; };
  Sl.statusLeft = id => (S().status[id] || {}).n || 0;
  Sl.STATUS_LABEL = { ok: 'UNDETECTED', detected: 'DETECTED', updating: 'UPDATING' };
  Sl.buy = function (id) {
    const x = BY[id], s = NA.Save.data, ss = S();
    if (!x || !Sl.unlocked(id)) return { ok: false, why: 'locked' };
    const renew = !!x.sub;
    if (renew || !ss.owned[id]) {
      if (s.credits < x.price) return { ok: false, why: 'credits' };
      s.credits -= x.price;
      if (renew) ss.subLeft = (ss.subLeft || 0) + x.sub; else ss.owned[id] = true;
    }
    const first = ss.active !== id;
    ss.active = id;
    if (first) dm(x, x.lines.welcome);
    NA.Save.save();
    return { ok: true };
  };
  Sl.load = function (id) {
    if (!BY[id] || !Sl.owns(id)) return false;
    S().active = id;
    NA.Save.save();
    return true;
  };

  // ---------------------------------------------------------------- loadout: locked at match start
  function build(x, stock) {
    const st = Sl.status(x.id);
    return {
      id: x.id, seller: x, status: st, stock, cap: x.cap, slots: x.slots, crashT: 0, crashAt: -1, crashes: 0, dodged: 0, autoPanic: false,
      detMult: x.det * (st === 'detected' ? 2.5 : 1),
      susMult: (0.5 + 0.5 * x.det) * (st === 'detected' ? 1.6 : 1),
    };
  }
  Sl.lock = function () {
    if (NA.UI.sellerCrash) NA.UI.sellerCrash(false, true);
    const x = Sl.active(), L = build(x, Sl.stock(x.id));
    if (x.crash && Math.random() < 0.55) L.crashAt = U.rand(25, 90);
    return (NA.Game.loadout = L);
  };
  // the live view for menus (stock as of right now)
  Sl.preview = () => build(Sl.active(), Sl.stock(Sl.activeId()));
  Sl.current = () => (NA.Game.loadout && NA.Game.match && (NA.Game.state === 'playing' || NA.Game.state === 'lobby') ? NA.Game.loadout : Sl.preview());
  // what actually runs: in stock, owned, switched on, within the seller's slot count
  Sl.allowed = function (L) {
    const out = new Set();
    if (!L || L.status === 'updating' || L.crashT > 0) return out;
    const s = NA.Save.data;
    let n = 0;
    for (const id of PRIO) {
      const c = s.cheats[id];
      if (!L.stock.has(id) || !c || !c.level || c.enabled === false) continue;
      if (n >= L.slots) break;
      out.add(id); n++;
    }
    return out;
  };
  // why a cheat isn't running ('' when it is, or would be once switched on)
  Sl.why = function (id, L) {
    L = L || Sl.current();
    const x = L.seller, c = NA.Save.data.cheats[id];
    if (!x.catalog.includes(id)) return 'NOT ON ' + x.short.toUpperCase();
    if (L.status === 'updating') return 'UPDATING';
    if (!L.stock.has(id)) return 'OUT OF STOCK';
    if (L.crashT > 0) return 'CRASHED';
    if (c && c.level && c.enabled !== false && !Sl.allowed(L).has(id)) return 'SLOT LIMIT';
    return '';
  };
  Sl.slotsUsed = L => Sl.allowed(L || Sl.current()).size;

  // ---------------------------------------------------------------- in-match quirks
  Sl.tick = function (dt) {
    const G = NA.Game, L = G.loadout;
    if (!L) return;
    if (L.crashAt >= 0) {
      L.crashAt -= dt;
      if (L.crashAt < 0) {
        L.crashAt = -1; L.crashT = 6; L.crashes++;
        G.computeMods();
        NA.UI.sellerCrash(true);
        NA.Audio.deny();
      }
    }
    if (L.crashT > 0) {
      L.crashT -= dt;
      if (L.crashT <= 0) { L.crashT = 0; G.computeMods(); NA.UI.sellerCrash(false); }
    }
  };
  // VOIDWARE: auto-panic for the length of a Warden scan
  Sl.scanWarn = function () {
    const G = NA.Game, L = G.loadout;
    if (!L || !L.seller.scanDodge || G.panic || L.status === 'updating') return false;
    L.autoPanic = true; L.dodged++;
    G.panic = true; G.computeMods();
    NA.UI.centerMsg('VOIDWARE: Warden scan incoming. Auto-PANIC on', 2400);
    return true;
  };
  Sl.scanOver = function () {
    const G = NA.Game, L = G.loadout;
    if (!L || !L.autoPanic) return;
    L.autoPanic = false;
    G.panic = false; G.computeMods();
    NA.UI.toast('VOIDWARE: scan over, cheats back on');
  };

  // ---------------------------------------------------------------- after each match: fees, subscription, Warden patches
  Sl.afterMatch = function (r) {
    const s = NA.Save.data, ss = S(), L = NA.Game.loadout, news = [];
    if (L && L.crashT > 0) { L.crashT = 0; NA.UI.sellerCrash(false, true); }
    if (L) {
      const x = L.seller;
      if (x.miner && r.pay > 0) {
        const fee = Math.max(1, Math.round(r.pay * x.miner));
        s.credits = Math.max(0, s.credits - fee); s.lifetimeCredits = Math.max(0, s.lifetimeCredits - fee);
        ss.minerTotal = (ss.minerTotal || 0) + fee;
        news.push({ k: 'bad', t: `FREEHAX.EXE mined ${U.fmt(fee)} credits on your phone (${U.fmt(ss.minerTotal)} total)` });
      }
      if (L.crashes) news.push({ k: 'warn', t: 'FREEHAX.EXE crashed mid-match: cheats were off for 6 s' });
      if (L.dodged) news.push({ k: 'good', t: `VOIDWARE dodged ${L.dodged} Warden scan${L.dodged > 1 ? 's' : ''} for you` });
      if (x.sub && ss.active === x.id) {
        ss.subLeft = Math.max(0, (ss.subLeft || 0) - 1);
        if (ss.subLeft) news.push({ k: 'info', t: `VOIDWARE: ${ss.subLeft} match${ss.subLeft === 1 ? '' : 'es'} left on your subscription` });
        else { news.push({ k: 'warn', t: 'VOIDWARE subscription ran out. Back on skillissue.shop' }); ss.active = 'skillissue'; }
      }
    }
    for (const x of LIST) {
      const st = ss.status[x.id];
      if (!st || st.st === 'ok') continue;
      st.n--;
      if (st.n > 0) continue;
      if (st.st === 'detected') {
        st.st = 'updating'; st.n = 1;
        if (x.sub && ss.subLeft > 0) ss.subLeft++;
        news.push({ k: 'warn', t: `${x.name} is UPDATING after the Warden patch: offline for 1 match` });
        dm(x, x.lines.updating);
      } else {
        st.st = 'ok'; st.n = 0;
        news.push({ k: 'good', t: `${x.name} is back: UNDETECTED` });
        dm(x, x.lines.back);
      }
    }
    if (s.highestTier >= 2 && !r.tourney) {
      ss.patchIn = (ss.patchIn || 4) - 1;
      if (ss.patchIn <= 0) {
        ss.patchIn = U.randInt(3, 5);
        const cand = LIST.filter(x => Sl.status(x.id) === 'ok' && (x.id !== 'void' || Sl.unlocked('void')) && (x.id !== 'ghost' || Sl.unlocked('ghost')));
        const w = cand.map(x => x.weight * (x.id === Sl.activeId() ? 1.5 : 1));
        let roll = Math.random() * w.reduce((a, b) => a + b, 0), pick = null;
        for (let i = 0; i < cand.length; i++) { roll -= w[i]; if (roll <= 0) { pick = cand[i]; break; } }
        pick = pick || cand[0];
        if (pick) {
          ss.status[pick.id] = { st: 'detected', n: 2 };
          ss.patches = (ss.patches || 0) + 1;
          s.ranked.acVersion[2]++;
          const ver = NA.Ranked.version();
          news.push({ k: 'bad', t: `WARDEN PATCH v${ver}: ${pick.name} is DETECTED for the next 2 matches` });
          dm(pick, pick.lines.detected);
          if (NA.Comms) NA.Comms.announce(`Warden AC v${ver} is live with new signatures. Players using ${pick.name} will be actioned.`);
        }
      }
    }
    NA.Save.save();
    return news;
  };

  NA.Sellers = Sl;
})(window.NA);
