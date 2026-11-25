/* NO ANTICHEAT: Ranked mode, where Warden AC exists and you have to "bypass" it. */
(function (NA) {
  'use strict';
  const U = NA.U, D = NA.DATA;
  const R = {};
  const S = () => NA.Save.data.ranked;
  const RK = () => D.RANKED;
  const lvl = id => NA.Save.level(id);

  R.unlocked = () => NA.Save.data.highestTier >= RK().unlockTier;
  R.version = () => S().acVersion.join('.');
  R.rankName = rr => { let n = RK().ranks[0][1]; for (const [min, name] of RK().ranks) if (rr >= min) n = name; return n; };
  R.banned = () => S().perma || Date.now() < S().banUntil;
  R.banLeft = () => Math.max(0, S().banUntil - Date.now());
  R.fmtLeft = ms => { const s = Math.ceil(ms / 1000), m = Math.floor(s / 60); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}:${String(s % 60).padStart(2, '0')}`; };

  // How much of Warden's attention the bypass gear soaks up.
  R.gearMult = () => Math.max(0.3, (1 - 0.1 * lvl('hwid')) * (1 - 0.18 * lvl('kernel')));
  R.patchCost = () => { const t = NA.Save.data.highestTier; return Math.round(120 * Math.pow(2.1, t) * (1 - 0.4 * lvl('sigmask'))); };
  R.altCost = () => Math.round(RK().altBase * Math.pow(2, S().alts));
  R.bypassStatus = () => {
    const s = S();
    if (s.bypassDetected && Date.now() >= s.patchReadyAt) { s.bypassDetected = false; NA.Save.save(); NA.Chat.dm('patched. bypass is undetected again. try not to get clipped'); }
    return s.bypassDetected ? 'DETECTED' : 'UNDETECTED';
  };

  // Detection gained per second from what you have switched on.
  R.heatRate = function (mods) {
    const s = NA.Save.data;
    if (NA.Game.panic || NA.Game.legit) return 0;
    let h = 0;
    for (const id in RK().heat) {
      const c = s.cheats[id];
      if (!c || !c.level || c.enabled === false) continue;
      const use = Math.max(1, Math.min(c.level, c.use || c.level));
      let x = RK().heat[id] * Math.pow(use, 0.85);
      if (id === 'aimbot') {
        // smoothing looks human, silent aim does not
        const o = NA.Game.opt('aimbot');
        x *= 1 - 0.07 * (U.clamp(+o.smooth || 1, 1, 10) - 1);
        if (o.type === 'silent' && use >= 3) x *= 1.4;
      }
      h += x;
    }
    return h;
  };
  R.matchMult = function (loader) {
    let m = R.gearMult();
    if (loader === 3) m *= 0.75;
    if (S().bypassDetected) m *= 2.5;
    return m;
  };

  // Apply the next step of the ban ladder. Returns the ban record.
  R.ban = function (reason, peak, wave) {
    const s = S(), save = NA.Save.data;
    const step = RK().ladder[Math.min(s.offenses, RK().ladder.length - 1)];
    s.offenses++;
    s.bans++;
    const fine = Math.min(Math.round(save.credits * step.fine), 250000);
    save.credits -= fine;
    const rrLost = step.rrReset ? s.rr : 0;
    if (step.rrReset) s.rr = 0;
    if (step.mins) s.banUntil = Date.now() + step.mins * 60000;
    else s.perma = true;
    s.ban = { reason, peak: Math.round(peak), wave: !!wave, label: step.label, fine, rrLost, perma: !step.mins, at: Date.now(), ticket: U.randInt(10000, 99999), appealed: false };
    s.appeal = null;
    NA.Save.save();
    return s.ban;
  };

  R.appeal = function (excuseIdx, custom) {
    const s = S();
    if (!s.ban || s.ban.appealed || !R.banned()) return false;
    let base, deny;
    if (excuseIdx >= 0) { base = RK().excuses[excuseIdx].base; deny = RK().excuses[excuseIdx].deny; }
    else {
      const t = String(custom || '').trim();
      base = 0.22 + (t.length > 80 ? 0.08 : 0);
      deny = 'We read your appeal. All of it. Denied.';
      if (/aimbot|hack|cheat|esp|wall/i.test(t)) { base = 0.03; deny = 'You mentioned the cheat in your appeal. Thank you for confirming.'; }
      if (/sorry|apolog/i.test(t)) base += 0.05;
    }
    let chance = base * (1 - s.ban.peak / 160) * (s.ban.perma ? 0.6 : 1) * (s.ban.wave ? 1.2 : 1) * (1 + 0.05 * lvl('hwid'));
    chance = U.clamp(chance, 0.03, 0.6);
    s.ban.appealed = true;
    s.appeal = { at: Date.now() + RK().appealMins * 60000, chance, deny, text: excuseIdx >= 0 ? RK().excuses[excuseIdx].text : String(custom || '').slice(0, 200), done: false, won: false };
    NA.Save.save();
    return true;
  };
  // Resolve a finished review. Returns 'won' | 'denied' | null.
  R.tickAppeal = function () {
    const s = S(), a = s.appeal;
    if (!a || a.done || Date.now() < a.at) return null;
    a.done = true;
    a.won = Math.random() < a.chance;
    if (a.won) {
      NA.Save.data.credits += s.ban.fine;
      s.rr += s.ban.rrLost;
      s.banUntil = 0; s.perma = false;
      s.offenses = Math.max(0, s.offenses - 1);
      s.appealsWon++;
    }
    NA.Save.save();
    return a.won ? 'won' : 'denied';
  };
  R.makeAlt = function () {
    const s = S(), save = NA.Save.data, cost = R.altCost();
    if (!s.perma || lvl('hwid') < 1 || save.credits < cost) return false;
    save.credits -= cost;
    s.alts++;
    s.perma = false; s.banUntil = 0; s.offenses = 0; s.rr = 0; s.ban = null; s.appeal = null;
    NA.Save.save();
    return true;
  };
  R.patchNow = function () {
    const s = S(), save = NA.Save.data, cost = R.patchCost();
    if (!s.bypassDetected || save.credits < cost) return false;
    save.credits -= cost;
    s.bypassDetected = false;
    NA.Save.save();
    return true;
  };

  // After every ranked match: rank points, a delayed ban wave roll, and anticheat updates.
  R.afterMatch = function (won, peak, banned) {
    const s = S(), out = {};
    s.matches++;
    if (!banned) {
      const d = won ? U.randInt(18, 26) : -U.randInt(10, 16);
      s.rr = Math.max(0, s.rr + d);
      s.peakRR = Math.max(s.peakRR, s.rr);
      out.rr = d;
      if (peak >= 70) {
        const p = (peak - 70) / 30 * 0.55 * (lvl('cleaner') ? 0.4 : 1);
        if (Math.random() < p) out.wave = R.ban('Ban wave: flagged by Warden AC after the match', peak, true);
      }
    }
    s.sinceUpdate++;
    if (s.sinceUpdate >= s.nextUpdate) {
      s.sinceUpdate = 0;
      s.nextUpdate = U.randInt(4, 7);
      const v = s.acVersion;
      if (Math.random() < 0.35) { v[1]++; v[2] = 0; } else v[2]++;
      out.update = R.version();
      if (Math.random() < 0.75 * (1 - 0.35 * lvl('sigmask'))) {
        s.bypassDetected = true;
        s.patchReadyAt = Date.now() + 5 * 60000;
        out.detected = true;
        NA.Chat.dm(`warden pushed v${R.version()}. bypass is DETECTED. free patch in 5 min, or pay ${U.fmt(R.patchCost())} for priority`);
      } else NA.Chat.dm(`warden updated to v${R.version()}. signature mask held up. you're still clean`);
    }
    NA.Save.save();
    return out;
  };

  NA.Ranked = R;
})(window.NA);
