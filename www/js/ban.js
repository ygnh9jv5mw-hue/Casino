/* NO ANTICHEAT: a cheating ban ends the account. No timers, no appeals: the screen goes red, and
   you start over on a fresh account. You keep your cosmetics, your achievements, what you know about
   the forum sellers, and 25% of what you'd put into cheat.lua as code credits for the new script.
   When anyone else in the lobby gets banned, everyone sees a ban banner. */
(function (NA) {
  'use strict';
  const U = NA.U, D = NA.DATA;
  const Ban = NA.Ban = {};
  const S = () => NA.Save.data;
  const $ = id => document.getElementById(id);
  const esc = s => U.esc(s);
  Ban.KEEP = 0.25;

  // what's gone, worked out when the ban lands (so the screen can show it)
  function summary() {
    const s = S(), active = [];
    for (const c of D.CHEATS) { const st = s.cheats[c.id]; if (c.toggle && st && st.level && st.enabled !== false) active.push({ name: c.name, file: NA.Code.BY[c.id] ? NA.Code.BY[c.id].name : c.id, v: Math.min(st.level, st.use || st.level) }); }
    active.sort((a, b) => b.v - a.v);
    const cos = (s.cosmetics.owned || []).length;
    return {
      credits: s.credits, lines: NA.Code.lines(), tier: s.highestTier, spent: NA.Code.spent(),
      rank: NA.Ranked.unlocked() && s.ranked.matches ? NA.Prog.myRank().name : null, guns: Object.keys(s.guns).length,
      matches: s.stats.matches, active: active.slice(0, 3), cosmetics: cos,
    };
  }
  // the ban lands: saved straight away, so closing the app on the ban screen doesn't save you
  Ban.trigger = function (reason, ctx) {
    const s = S();
    if (s.pendingBan) return s.pendingBan;
    const sum = summary();
    s.pendingBan = { reason, wave: !!(ctx && ctx.wave), at: Date.now(), ticket: U.randInt(100000, 999999), name: s.username, sum, keep: Math.round(sum.spent * Ban.KEEP) };
    s.ranked.bans = (s.ranked.bans || 0) + 1;
    NA.Save.save();
    return s.pendingBan;
  };
  Ban.pending = () => S().pendingBan || null;

  // full screen red, then the ban card
  Ban.show = function () {
    const b = Ban.pending();
    if (!b) return;
    const sum = b.sum;
    const lost = [`${U.fmt(sum.credits)} credits`, `${U.num(sum.lines)} lines of cheat.lua`, `Tier ${sum.tier}`, `${sum.guns} gun${sum.guns === 1 ? '' : 's'}`];
    if (sum.rank) lost.push(`${sum.rank} rank`);
    lost.push(`${U.num(sum.matches)} match${sum.matches === 1 ? '' : 'es'} of stats`);
    const kept = [`${sum.cosmetics} cosmetic${sum.cosmetics === 1 ? '' : 's'}`, 'your achievements', `${U.fmt(b.keep)} code credits (25% of your code)`, 'what you know about the forum sellers'];
    const caught = sum.active.length ? sum.active.map(a => `${a.file} v${a.v}`).join(', ') : 'cheat.lua';
    $('ban-card').innerHTML = `
      <div class="bc-row"><span>Account</span><b class="strike">${esc(b.name || 'player')}</b></div>
      <div class="bc-row"><span>Reason</span><b>${esc(b.reason)}</b></div>
      <div class="bc-row"><span>Detected</span><b>${esc(caught)}</b></div>
      <div class="bc-row"><span>Ticket</span><b>#${b.ticket} · ${b.wave ? 'ban wave' : 'banned mid-match'} · no appeals</b></div>
      <div class="bc-cols"><div class="bc-lost"><h5>GONE WITH THE ACCOUNT</h5><ul>${lost.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
      <div class="bc-kept"><h5>YOU KEEP</h5><ul>${kept.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div></div>`;
    $('ban-sub').textContent = b.wave ? 'A ban wave caught this account after the match. It is permanently banned.' : 'This account has been permanently banned for cheating.';
    const el = $('ban-screen');
    el.classList.remove('hidden', 'go'); void el.offsetWidth; el.classList.add('go');
    if (NA.Audio.deny) NA.Audio.deny();
  };
  // the red flash over the game the moment you get banned mid-match
  Ban.flash = function () {
    const f = $('ban-flash');
    if (!f) return;
    f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
  };

  // spend everything, keep the cosmetics: a brand new account
  Ban.restart = function () {
    const old = S(), b = old.pendingBan;
    if (!b) return;
    const d = NA.Save.defaults();
    d.cosmetics = old.cosmetics;
    d.achievements = old.achievements;
    d.settings = old.settings;
    d.flags = { eventsAlwaysLive: old.flags.eventsAlwaysLive, rankedIntro: old.flags.rankedIntro, lootTip: old.flags.lootTip };
    d.forums = old.forums ? { sold: {}, history: old.forums.history || {}, log: [] } : undefined;
    d.ranked.bans = old.ranked.bans || 1;
    d.history = { accounts: ((old.history && old.history.accounts) || 1) + 1, bans: ((old.history && old.history.bans) || []).concat([{ name: b.name, at: b.at, reason: b.reason, lines: b.sum.lines, tier: b.sum.tier }]).slice(-10) };
    d.season = { id: old.season.id, peak: 0, history: old.season.history || [] };
    d.username = '';
    d.prevName = b.name;
    NA.Save.data = d;
    NA.Code.init();
    d.code.legacy = b.keep;   // code credits for the new script
    NA.Save.save();
    if (NA.Game.computeMods) NA.Game.computeMods();
    $('ban-screen').classList.add('hidden');
    NA.UI.showName();
    // suggest an alt name based on the old one
    const base = String(b.name || 'player').replace(/_?alt\d*$/i, '').slice(0, 12);
    $('name-input').value = `${base}_alt${d.history.accounts - 1}`;
    $('name-input').dispatchEvent(new Event('input'));
  };

  // another player got banned: the whole lobby sees it
  Ban.banner = function (name, how) {
    const el = $('ban-banner');
    if (!el) return;
    el.innerHTML = `<b>⚠ ${esc(name)} was banned for cheating</b><span>${how === 'report' ? 'after player reports · thank you for reporting' : how === 'teammate' ? 'your teammate · their account is gone' : 'detected by Warden AC · they are gone for good'}</span>`;
    el.classList.remove('go'); void el.offsetWidth; el.classList.add('go');
  };

  Ban.bind = function () {
    $('ban-go').addEventListener('click', () => { if (NA.Audio.click) NA.Audio.click(); Ban.restart(); });
  };
  // on boot: a ban you tried to close the app on is still waiting
  Ban.check = function () { if (Ban.pending()) { Ban.show(); return true; } return false; };
})(window.NA);
