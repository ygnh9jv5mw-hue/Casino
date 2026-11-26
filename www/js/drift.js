/* Kaido Nights: drift scoring.
   Base points = angle x speed while sideways. Hold the drift to grow the multiplier (x1 to x5, early steps
   fast, later ones slower). Style bonuses: near-misses, linked corners, manji switches, tandem.
   Straighten out cleanly to bank the chain; hit a wall or spin and it's gone. */
(function (KN) {
  'use strict';
  const U = KN.U, DEG = 180 / Math.PI;
  const STEPS = [0, 1.4, 3.2, 5.6, 8.6];          // seconds held for x1 .. x5
  const MIN_ANGLE = 12, MIN_SPEED = 7, BANK_AFTER = 1.05;

  class Score {
    constructor(opts) {
      this.pay = (opts && opts.pay) || 1;
      this.on = (opts && opts.on) || (() => {});
      this.total = 0;
      this.run = { bestChain: 0, manjiChain: 0, nearRun: 0, linkChain: 0, maxMult5: 0, tandemRun: 0, banks: 0, crashes: 0, drifts: 0, manji: 0, links: 0, near: 0 };
      this.clearChain();
      this.nearCD = 0; this.drifting = false;
    }
    clearChain() { this.active = false; this.chain = 0; this.holdT = 0; this.mult = 1; this.gap = 0; this.dir = 0; this.links = 0; this.manji = 0; this.near = 0; this.tandem = false; }
    get value() { return Math.round(this.chain * this.mult * this.pay); }
    get stepProgress() { const m = this.mult; if (m >= 5) return 1; return U.clamp((this.holdT - STEPS[m - 1]) / (STEPS[m] - STEPS[m - 1]), 0, 1); }
    // ctx: { near: clearance (m), impact: wall hit speed, onCourse, tandem, frozen }
    update(dt, car, ctx) {
      this.nearCD -= dt;
      const ab = Math.abs(car.beta) * DEG, speed = car.speed;
      const backwards = car.u < -1.5 || ab > 84;
      if (this.active && (ctx.impact > 3.6 || backwards)) { this.lose(ctx.impact > 3.6 ? 'CRASHED' : 'SPUN OUT'); return; }
      const sideways = !ctx.frozen && ab > MIN_ANGLE && speed > MIN_SPEED;
      if (sideways) {
        if (!this.active) { this.clearChain(); this.active = true; this.run.drifts++; this.dir = Math.sign(car.beta); this.on('start'); }
        else if (!this.drifting && this.gap > 0.3) { this.links++; this.run.links++; this.bonus('LINK', 250 * this.links, 'link'); }
        this.drifting = true; this.gap = 0;
        const d = Math.sign(car.beta);
        if (d !== this.dir && ab > 15) { this.manji++; this.run.manji++; this.bonus('MANJI', 400, 'manji'); this.dir = d; }
        this.holdT += dt;
        let m = 1; while (m < 5 && this.holdT >= STEPS[m]) m++;
        if (m > this.mult) { this.mult = m; this.on('mult', m); if (m === 5) this.run.maxMult5 = 1; }
        let pts = Math.min(ab, 70) * speed * 0.42 * dt;
        if (ctx.onCourse === false) pts = 0;
        this.tandem = !!ctx.tandem;
        if (ctx.tandem) { pts *= 1.5; this.run.tandemRun += dt; }
        this.chain += pts;
        if (ctx.near > 0.05 && ctx.near < 1.3 && this.nearCD <= 0 && speed > 10) {
          this.near++; this.run.near++; this.run.nearRun++;
          this.bonus('NEAR MISS', Math.round(250 + (1.3 - ctx.near) * 350), 'near');
          this.nearCD = 1.1;
        }
      } else if (this.active) {
        this.drifting = false; this.tandem = false;
        this.gap += dt;
        if (this.gap > BANK_AFTER) this.bank();
      }
    }
    bonus(name, pts, kind) { this.chain += pts; this.on('bonus', { name, pts, kind }); }
    bank() {
      if (!this.active) return 0;
      const v = this.value;
      this.total += v;
      const r = this.run;
      r.banks++; r.bestChain = Math.max(r.bestChain, v); r.manjiChain = Math.max(r.manjiChain, this.manji); r.linkChain = Math.max(r.linkChain, this.links);
      this.on('bank', { value: v, mult: this.mult, links: this.links, manji: this.manji });
      this.clearChain();
      return v;
    }
    lose(reason) {
      const v = this.value;
      this.run.crashes++;
      this.on('lose', { value: v, reason });
      this.clearChain();
    }
  }
  KN.Score = Score;
  KN.Score.STEPS = STEPS;
})(window.KN);
