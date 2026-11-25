/* NO ANTICHEAT: lobby chat, story beats and seller DMs. */
(function (NA) {
  'use strict';
  const U = NA.U, D = NA.DATA;
  const C = { lines: [], queue: [], last: 0, el: null };

  C.init = () => { C.el = document.getElementById('chat'); };
  C.clear = () => { C.lines = []; C.queue = []; C.render(); };

  C.ctx = () => {
    const s = NA.Save.data, p = NA.Game && NA.Game.player;
    const acc = p && p.shotsFired ? Math.round(100 * p.shotsHit / p.shotsFired) : NA.Game.lastAcc || 0;
    return { player: s.username, accountAge: NA.Save.accountAge(), days: U.num(NA.Save.anticheatDays()), acc, reports: U.num(s.stats.reports) };
  };
  C.fill = text => {
    const ctx = C.ctx();
    return text.replace(/\{(\w+)\}/g, (m, k) => (ctx[k] !== undefined ? ctx[k] : m));
  };

  // kind: bot | team | system | player | enemyteam
  C.post = (name, text, kind, opts) => {
    const msg = { name, text: C.fill(text), kind: kind || 'bot', t: performance.now(), delay: (opts && opts.delay) || 0 };
    msg.priority = !!(opts && opts.priority);
    if (msg.priority) {
      let i = 0;
      while (i < C.queue.length && C.queue[i].priority) i++;
      C.queue.splice(i, 0, msg);
    } else C.queue.push(msg);
    if (C.queue.length > 10) C.queue.length = 10;
  };
  C.system = (text, opts) => C.post('SYSTEM', text, 'system', opts);

  // Queue a scripted beat: [[speaker, text], ...]. '*' means a random lobby bot.
  C.beat = (lines, gap) => {
    let delay = 0;
    for (const [who, text] of lines) {
      let name = who;
      if (who === '*') { const b = NA.Game.randomBot(); name = b ? b.name : 'someone'; }
      const bot = NA.Game.botByName(name);
      C.post(name, text, bot && bot.team === NA.Game.player.team && NA.Game.match && NA.Game.match.tier.mode === 'tdm' ? 'team' : 'bot', { priority: false, delay });
      delay += gap || 1200;
    }
  };

  C.update = () => {
    const now = performance.now();
    if (C.queue.length && now - C.last > 800) {
      const m = C.queue[0];
      if (now - m.t >= m.delay) {
        C.queue.shift();
        m.t = now;
        C.lines.push(m);
        if (C.lines.length > 30) C.lines.shift();
        C.last = now;
        NA.Audio.chat();
        C.render();
      }
    }
  };

  C.render = () => {
    if (!C.el) return;
    const show = C.lines.slice(-7);
    C.el.innerHTML = show.map(m => {
      if (m.kind === 'system') return `<div class="cl sys">[SYSTEM] ${U.esc(m.text)}</div>`;
      const cls = m.kind === 'team' ? 'team' : m.kind === 'player' ? 'me' : m.kind === 'enemyteam' ? 'et' : 'bot';
      return `<div class="cl ${cls}"><b>${U.esc(m.name)}:</b> ${U.esc(m.text)}</div>`;
    }).join('');
  };
  // Fade old lines during matches.
  C.tickFade = () => {
    if (!C.el) return;
    const now = performance.now();
    const kids = C.el.children, show = C.lines.slice(-7);
    const inMatch = NA.Game.state === 'playing';
    for (let i = 0; i < kids.length; i++) {
      const age = (now - show[i].t) / 1000;
      kids[i].style.opacity = inMatch && age > 12 ? Math.max(0.15, 1 - (age - 12) / 4) : 1;
    }
  };

  // ---------------------------------------------------------------- pools
  C.band = (sus, act) => {
    let b = sus < 20 ? 0 : sus < 40 ? 1 : sus < 60 ? 2 : sus < 80 ? 3 : 4;
    if (act === 1) b = Math.min(b, 1);
    return b;
  };
  C.line = (pool, band) => {
    const arr = band === undefined ? D.CHAT[pool] : D.CHAT[pool][band];
    return U.fromBag(pool + ':' + band, arr);
  };

  // ---------------------------------------------------------------- player typing
  C.playerSays = text => {
    text = String(text || '').trim().slice(0, 80);
    if (!text) return;
    const G = NA.Game;
    C.post(NA.Save.data.username, text, 'player', { priority: true });
    const act = G.act();
    let reply = null, speaker = G.randomBot(), susAdd = 0;
    for (const k of D.CHAT.keywords) {
      if (k.re.test(text)) {
        reply = U.pick(G.ranked && k.ranked ? k.ranked : act >= 2 ? k.late : k.early);
        susAdd = k.sus || 0;
        if (k.mom && G.botByName('mom_plays_too') && Math.random() < 0.5) { speaker = G.botByName('mom_plays_too'); reply = k.mom; }
        break;
      }
    }
    if (!reply && Math.random() < 0.3) reply = U.pick(D.CHAT.fallback);
    if (susAdd && G.state === 'playing') G.addSus(susAdd);
    if (reply && speaker) C.post(speaker.name, reply, G.isAlly(speaker) ? 'team' : 'bot', { delay: U.rand(900, 1800) });
  };

  // ---------------------------------------------------------------- seller DMs
  C.dm = (text) => {
    const s = NA.Save.data;
    s.sellerDMs.push({ text: C.fill(text), t: Date.now(), read: false });
    if (s.sellerDMs.length > 40) s.sellerDMs.shift();
    NA.Save.save();
    if (NA.UI) NA.UI.refreshDMBadge();
  };

  NA.Chat = C;
})(window.NA);
