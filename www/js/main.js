/* NO ANTICHEAT: boot and main loop. */
(function (NA) {
  'use strict';
  const U = NA.U;

  // Boot runs in small steps behind the loader so its log and progress bar can update.
  // Each step prints themed lines to the loader console.
  const STEPS = [
    [setupRenderer, [['ok', 'connected to skillissue.shop · 12ms'], ['ok', 'license: LIFETIME (definitely paid for)']]],
    [() => NA.World.build(NA.R.scene, 'aim_map'), [['info', 'HWID spoofed'], ['ok', 'found FRAGLINE.exe (pid 1337)'], ['ok', () => `loading ${Object.keys(NA.DATA.MAPS).length} maps`]]],
    [() => { NA.Game.initFX(); NA.Game.computeMods(); NA.Chat.init(); NA.UI.init(); NA.Comms.init(); }, [['ok', 'teaching bots to miss'], ['info', 'scanning for anticheat… none found']]],
    [() => { NA.Showroom.init(); resize(); }, [['ok', 'building lobby + item shop']]],
    [() => { const R = NA.R; R.renderer.compile(NA.Showroom.scene, NA.Showroom.camera); R.renderer.compile(R.scene, R.camera); }, [['ok', 'compiling shaders (the slow part)']]],
    [() => {}, [['warn', 'Warden AC: "coming soon™" · skipping'], ['done', 'ready to inject']]],
  ];
  function boot() {
    NA.Save.load();
    NA.Audio.setVolume(NA.Save.data.settings.volume);
    const intro = document.getElementById('intro');
    // split the logo wordmark into letters so they can drop in one by one after injecting
    let n = 0;
    intro.querySelectorAll('.word span').forEach(sp => { sp.innerHTML = sp.textContent.split('').map(ch => `<i class="ch" style="animation-delay:${0.85 + (n++) * 0.035}s">${ch}</i>`).join(''); });
    NA.Intro.start();
    NA.Intro.expect(STEPS.reduce((s, st) => s + st[1].length, 0));
    let i = 0;
    const next = () => {
      if (i < STEPS.length) {
        const [fn, lines] = STEPS[i];
        try { fn(); } catch (e) { console.error('boot step failed: ' + i, e); }
        lines.forEach(([k, t]) => NA.Intro.log(k, typeof t === 'function' ? t() : t));
        i++;
        if (i === 4) requestAnimationFrame(loop);
        setTimeout(next, 90);
        return;
      }
      NA.Intro.ready(injected => { if (injected && NA.UI.afterInject) NA.UI.afterInject(); });
    };
    // let the loader paint before doing heavy work
    requestAnimationFrame(() => setTimeout(next, 40));
  }
  function setupRenderer() {
    const canvas = document.getElementById('gl');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: !U.isTouch, powerPreference: 'high-performance' });
    renderer.autoClear = false;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.05, 300);
    scene.add(camera);
    const hemi = new THREE.HemisphereLight(0xe4edff, 0x4a4036, 0.95);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffffff, 0.55);
    sun.position.set(0.6, 1, 0.35);
    scene.add(sun, sun.target);
    const vmScene = new THREE.Scene();
    const vmCamera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.01, 10);
    NA.R = { renderer, scene, camera, vmScene, vmCamera, hemi, sun };
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', () => setTimeout(resize, 250));
  }

  function resize() {
    const R = NA.R, w = innerWidth, h = innerHeight;
    const low = NA.Graphics.quality() === 'low', dpr = Math.min(window.devicePixelRatio || 1, U.isTouch ? (low ? 1.25 : 1.75) : (low ? 1.25 : 2));
    R.renderer.setPixelRatio(dpr);
    R.renderer.setSize(w, h, false);
    R.camera.aspect = w / h; R.camera.updateProjectionMatrix();
    R.vmCamera.aspect = w / h; R.vmCamera.updateProjectionMatrix();
    if (NA.Showroom) NA.Showroom.resize(w, h);
    if (NA.UI.ov) NA.UI.resize(w, h);
  }

  let last = performance.now(), fpsT = 0, frames = 0, hudT = 0, mmT = 0, fadeT = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    const G = NA.Game, R = NA.R;
    NA.UI.applyKeys();
    const steps = G.speed > 1 ? Math.round(G.speed) : 1;
    for (let i = 0; i < steps; i++) G.update(dt, now + i * dt * 1000);
    NA.Chat.update();
    if (NA.Decor) NA.Decor.update(dt, now / 1000, G.player && G.state === 'playing' ? G.player.pos : R.camera.position, R.camera);
    const SR = NA.Showroom;
    R.renderer.clear();
    if (SR.scene && SR.wants()) { SR.update(dt); SR.render(R.renderer); }
    else {
      if (G.state === 'idle') G.menuCamera(now / 1000);
      else if (G.state === 'lobby' && G.lobbyCamera) G.lobbyCamera(now / 1000);
      R.renderer.render(R.scene, R.camera);
      if (G.state === 'playing') { R.renderer.clearDepth(); R.renderer.render(R.vmScene, R.vmCamera); }
    }
    NA.UI.drawOverlay(now);
    hudT += dt; if (hudT > 0.1) { hudT = 0; NA.UI.hudTick(); }
    mmT += dt; if (mmT > 0.12) { mmT = 0; NA.UI.drawMinimap(); }
    fadeT += dt; if (fadeT > 1) { fadeT = 0; NA.Chat.tickFade(); }
    frames++; fpsT += dt;
    if (fpsT >= 1) { NA.UI.fps(frames / fpsT); frames = 0; fpsT = 0; }
  }

  window.addEventListener('DOMContentLoaded', boot);
})(window.NA);
