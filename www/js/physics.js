/* Kaido Nights: drift physics. A two-axle (bicycle) model with a grip curve per axle,
   rear traction circle (throttle and handbrake steal sideways grip, so the tail slides),
   weight transfer, and assists that scale with the control mode. Units: m, s, kg, N. */
(function (KN) {
  'use strict';
  const U = KN.U, D = KN.DATA;
  const G = 9.81, DEG = Math.PI / 180;

  // control modes: how much the game helps
  KN.ASSISTS = {
    thumb:  { counter: 0.95, limit: 1.0, stability: 1.0, sustain: 1.0, autoGas: true,  autoKick: true,  driftSteer: 1.25, capG: 4, pay: 1 },
    tilt:   { counter: 0.9,  limit: 1.0, stability: 0.95, sustain: 0.9, autoGas: true,  autoKick: true,  driftSteer: 1.15, capG: 6, pay: 1 },
    arcade: { counter: 0.55, limit: 0.85, stability: 0.7, sustain: 0.5, autoGas: false, autoKick: false, driftSteer: 0.8, pay: 1 },
    pro:    { counter: 0.0,  limit: 0.7,  stability: 1.6,  sustain: 0.0, autoGas: false, autoKick: false, driftSteer: 0.0, pay: 1.2 },
  };

  // beginner-mode tuning: traction control while turning, auto-kick speed (m/s). capG per mode: grip-steer cap in m/s² of cornering
  const T = KN.TUNE = { tc: 0.25, kickV: 7.5 };

  // physical numbers for a car with its installed parts
  KN.carParams = function (carId, parts) {
    const c = D.CAR[carId], p = c.phys, lv = id => (parts && parts[id]) || 0;
    const mass = p.mass * (1 - 0.035 * lv('weight'));
    const L = p.wheelbase, a = L * 0.5, b = L * 0.5;
    const grip = 1 + 0.04 * lv('tires');
    return {
      mass, L, a, b, h: 0.46, inertia: mass * (a * a + b * b) * 0.5,
      power: p.power * 1000 * (1 + 0.09 * lv('engine')),
      muF: p.mu * grip, muR: p.mu * grip * 0.985,
      steerMax: (p.steer + 3.4 * lv('angle')) * DEG,
      maxDrift: (54 + 3.5 * lv('angle')) * DEG,
      drag: p.drag, roll: 14, brake: mass * G * 0.95,
      kick: 1 + 0.18 * lv('handbrake'),
      control: 1 + 0.12 * lv('susp'),
      len: c.dims.len, wid: c.dims.wid,
    };
  };
  // 0..1 bars for the garage
  KN.carStats = function (carId, parts) {
    const k = KN.carParams(carId, parts);
    return {
      power: U.clamp((k.power / k.mass) / 260, 0.05, 1),
      grip: U.clamp((k.muR - 0.9) / 0.45, 0.05, 1),
      angle: U.clamp((k.steerMax / DEG - 30) / 34, 0.05, 1),
      control: U.clamp((k.control - 0.9) / 0.75, 0.05, 1),
    };
  };

  // grip curve: peaks near 9-10 degrees of slip, then falls off a little
  const lat = (alpha, fz, mu, B) => -mu * fz * Math.sin(1.35 * Math.atan(B * alpha));

  class Car {
    constructor(params) { this.p = params; this.reset(0, 0, 0); }
    reset(x, z, yaw) {
      Object.assign(this, { x, z, yaw, u: 0, w: 0, r: 0, steer: 0, ax: 0, beta: 0, speed: 0, rpm: 0.15, gear: 1,
        slipR: 0, slipF: 0, smoke: 0, kickT: 0, steerHeld: 0, hand: 0, throttle: 0, brake: 0, spin: 0, wheelRot: 0 });
    }
    get fx() { return Math.sin(this.yaw); }
    get fz() { return Math.cos(this.yaw); }
    // world velocity
    get vx() { return this.u * Math.sin(this.yaw) + this.w * Math.cos(this.yaw); }
    get vz() { return this.u * Math.cos(this.yaw) - this.w * Math.sin(this.yaw); }
    setVel(vx, vz) { const s = Math.sin(this.yaw), c = Math.cos(this.yaw); this.u = vx * s + vz * c; this.w = vx * c - vz * s; }

    // input: { steer -1..1 (right +), throttle, brake, hand (0/1) }; as = assist profile
    step(dt, input, as) {
      const n = Math.max(1, Math.ceil(dt / (1 / 120))), h = dt / n;
      for (let i = 0; i < n; i++) this.sub(h, input, as);
      this.speed = Math.hypot(this.u, this.w);
      this.beta = this.speed > 1 ? Math.atan2(this.w, Math.abs(this.u)) : 0;
      this.updateRpm(dt);
      this.wheelRot += this.u * dt / 0.31;
    }

    sub(dt, input, as) {
      const p = this.p, m = p.mass;
      let { u, w, r } = this;
      const speed = Math.hypot(u, w);
      const beta = speed > 1 ? Math.atan2(w, Math.max(0.5, Math.abs(u))) : 0;
      const drift = U.clamp((Math.abs(beta) - 4 * DEG) / (12 * DEG), 0, 1) * U.clamp((speed - 5) / 5, 0, 1);
      const steerIn = U.clamp(input.steer || 0, -1, 1);
      this.steerHeld = Math.abs(steerIn) > 0.3 ? this.steerHeld + dt : 0;

      // ---- driver aids
      let throttle = input.throttle || 0, brake = input.brake || 0, hand = input.hand ? 1 : 0;
      if (as.autoGas) {
        // input.vmax: the game's estimate of how fast we can go and still make the wall on our current arc
        const lim = input.vmax == null ? 99 : input.vmax;
        if (brake > 0.1) throttle = 0;
        else if (lim < 23 && speed > lim) {
          throttle = drift > 0.3 ? 0.2 : 0;
          if (speed > lim + 3 && u > 3) brake = Math.min(0.35, (speed - lim - 3) / 10);
        }
        else if (drift > 0.3) throttle = Math.abs(steerIn) > 0.2 ? 0.92 : 0.32;
        else throttle = speed < 23 ? 1 : 0.65;
      }
      if (as.autoKick && this.kickT <= 0 && speed > T.kickV && drift < 0.25 && Math.abs(steerIn) > 0.55 && (this.steerHeld < 0.05 || this.steerHeld > 0.45)) this.kickT = 0.2 * p.kick;
      if (this.kickT > 0) { this.kickT -= dt; hand = 1; }
      this.throttle = throttle; this.brake = brake; this.hand = hand;

      // ---- steering (+ = left in the physics frame, input + = right)
      let target = -steerIn * p.steerMax;
      if (drift < 0.5) target /= 1 + Math.max(0, speed - 8) * 0.045;   // calmer at speed while gripping
      if (as.autoGas && drift < 0.5) {
        // beginner modes: cap grip-steering to ~0.8 g of cornering so a full-lock launch can't snap into a spin
        const cap = Math.atan(p.L * (as.capG || 8) / Math.max(16, speed * speed));
        target = U.clamp(target, -cap, cap);
      }
      if (as.counter > 0 && speed > 4) {
        const cs = U.clamp(beta * (Math.abs(steerIn) < 0.2 ? 1.15 : 1), -p.steerMax, p.steerMax);
        target = U.lerp(target, cs - steerIn * p.steerMax * 0.38, as.counter * drift);
      }
      target = U.clamp(target, -p.steerMax, p.steerMax);
      this.steer = U.approach(this.steer, target, (as.counter > 0 ? 6 : 4.5) * dt);
      const delta = this.steer;

      // ---- loads with weight transfer
      const Fzf = Math.max(m * G * 0.12, m * G * p.b / p.L - m * this.ax * p.h / p.L);
      const Fzr = Math.max(m * G * 0.12, m * G * p.a / p.L + m * this.ax * p.h / p.L);

      // ---- longitudinal
      const dir = u >= 0 ? 1 : -1;
      let FxR = 0, FxF = 0;
      if (brake > 0.05 && u > 0.6) { FxR -= brake * p.brake * 0.4; FxF -= brake * p.brake * 0.6; }
      else if (brake > 0.05) FxR -= brake * 3200;                       // reverse
      if (throttle > 0) FxR += throttle * Math.min(p.power * 0.9 / Math.max(Math.abs(u), 4.5), m * G * 0.78);
      let muR = p.muR, muF = p.muF;
      if (hand) { muR *= 0.62 / Math.sqrt(p.kick); FxR = -dir * Fzr * muR * 0.75 * Math.min(1, Math.abs(u) / 2); }
      if (as.sustain > 0 && drift > 0.2 && throttle > 0.4) muR *= 1 - 0.14 * as.sustain * drift;
      const DR = muR * Fzr;
      // beginner modes: traction control while turning on grip
      if (as.autoGas && !hand && drift < 0.3 && FxR > 0) FxR = Math.min(FxR, DR * (1 - T.tc * Math.min(1, Math.abs(steerIn))));
      const spinDemand = Math.max(0, Math.abs(FxR) - DR) / DR;               // wheelspin
      FxR = U.clamp(FxR, -DR, DR);
      const latShare = Math.sqrt(Math.max(0.04, 1 - (FxR / DR) * (FxR / DR))) / (1 + spinDemand * 0.8);

      // ---- lateral
      let FyF, FyR;
      if (speed > 1.5) {
        const au = Math.max(1, Math.abs(u));
        const aF = Math.atan2(w + p.a * r, au) - delta * dir;
        const aR = Math.atan2(w - p.b * r, au);
        FyF = lat(aF, Fzf, muF, 13);
        FyR = lat(aR, Fzr, muR, 11) * latShare;
        this.slipF = Math.abs(aF); this.slipR = Math.abs(aR) + spinDemand * 0.25;
      } else {
        // parking speed: roll like a kinematic bicycle
        FyF = 0; FyR = 0; w *= 1 - Math.min(1, 10 * dt);
        r = U.lerp(r, u * Math.tan(delta) / p.L, Math.min(1, 12 * dt));
        this.slipF = this.slipR = 0;
      }
      const cs = Math.cos(delta), sn = Math.sin(delta);
      const Fx = FxR + FxF * cs - FyF * sn - p.drag * u * speed - p.roll * u;
      const Fy = FyR + FyF * cs + FxF * sn - p.drag * 0.5 * w * speed;
      const Mz = p.a * (FyF * cs + FxF * sn) - p.b * FyR;
      const du = Fx / m + w * r;
      u += du * dt;
      w += (Fy / m - u * r) * dt;
      if (speed > 1.5) r += (Mz / p.inertia) * dt;

      // ---- assisted modes: hold a slip angle picked by the input (right = slide right), straighten on release
      this.sinceDrift = drift > 0.12 ? 0 : (this.sinceDrift || 0) + dt;
      const bdot = (beta - (this.betaPrev || 0)) / dt;
      this.betaPrev = beta;
      const assistOn = as.driftSteer > 0 && speed > 6 && (drift > 0.12 || this.kickT > 0 || (this.sinceDrift < 0.7 && Math.abs(steerIn) > 0.15));
      if (assistOn) {
        const base = 24 * DEG, span = p.maxDrift - base;
        const vk = 0.5 + 0.5 * U.clamp((speed - 8) / 10, 0, 1);      // shallower target angle at low speed
        const bt = Math.abs(steerIn) > 0.15 ? Math.sign(steerIn) * (base + span * Math.min(1, Math.abs(steerIn))) * vk : 0;
        const k = as.driftSteer * Math.max(drift, this.kickT > 0 ? 0.6 : 0.35);
        r += (-(bt - beta) * 46 + bdot * 9.5) * k * dt;
      }
      // assisted modes, no input: settle the yaw so a released drift ends pointing straight, not in a lazy circle
      if (as.driftSteer > 0 && Math.abs(steerIn) < 0.15 && Math.abs(beta) < 20 * DEG && speed > 6) r -= r * 3.2 * as.driftSteer * dt;
      const maxB = p.maxDrift + 12 * DEG;
      if (as.limit > 0 && Math.abs(beta) > maxB) r += Math.sign(beta) * (Math.abs(beta) - maxB) * 60 * as.limit * dt;
      r -= r * 0.9 * as.stability * p.control * dt * (drift > 0.4 ? 0.35 : 1.2);
      this.ax = U.lerp(this.ax, du, 0.2);
      this.u = u; this.w = w; this.r = r;

      // ---- move in the world
      const s = Math.sin(this.yaw), c = Math.cos(this.yaw);
      this.x += (u * s + w * c) * dt;
      this.z += (u * c - w * s) * dt;
      this.yaw += r * dt;
      this.smoke = U.clamp((this.slipR - 0.12) * 2.4, 0, 1) * U.clamp(speed / 6, 0, 1);
    }

    // fake six-speed box, just for the engine note
    updateRpm(dt) {
      const top = 62, gears = [0, 9, 17, 26, 36, 47, 62];
      const v = Math.abs(this.u) + this.smoke * this.throttle * 9;
      let g = 1; while (g < 6 && v > gears[g]) g++;
      this.gear = g;
      const lo = gears[g - 1], hi = gears[g];
      const target = U.clamp(0.28 + 0.72 * (v - lo) / (hi - lo), 0.18, 1) * (this.throttle > 0 || v > 2 ? 1 : 0.7);
      this.rpm = U.lerp(this.rpm, Math.max(0.16, target), U.damp(10, dt));
      void top;
    }
  }
  KN.Car = Car;

  // ---------------------------------------------------------------- collisions against the district's distance field
  // returns { impact: speed into the wall (m/s), near: clearance of the closest body point }
  KN.collide = function (car, world) {
    const s = Math.sin(car.yaw), c = Math.cos(car.yaw);
    const half = car.p.len * 0.5 - 0.55, rad = car.p.wid * 0.5 + 0.05;
    let impact = 0, near = 99, pushX = 0, pushZ = 0, hits = 0;
    for (const off of [-half, -half * 0.33, half * 0.33, half]) {
      const px = car.x + s * off, pz = car.z + c * off;
      const d = world.sdf(px, pz);
      near = Math.min(near, d - rad);
      if (d < rad) {
        const g = world.grad(px, pz), pen = rad - d;
        pushX += g[0] * pen; pushZ += g[1] * pen; hits++;
        const vx = car.vx + car.r * off * c, vz = car.vz - car.r * off * s;   // velocity of that body point
        const vn = vx * g[0] + vz * g[1];
        if (vn < 0) {
          impact = Math.max(impact, -vn);
          // bounce a little, scrub speed along the wall, kick the yaw
          const nvx = car.vx - 1.25 * vn * g[0], nvz = car.vz - 1.25 * vn * g[1];
          car.setVel(nvx * 0.9, nvz * 0.9);
          const lever = off * (g[0] * c - g[1] * s);
          car.r -= lever * vn * 0.08;
        }
      }
    }
    if (hits) { car.x += pushX / hits * 1.05; car.z += pushZ / hits * 1.05; }
    return { impact, near };
  };
})(window.KN);
