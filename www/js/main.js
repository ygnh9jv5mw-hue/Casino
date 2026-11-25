/* NO ANTICHEAT: boot and main loop. */
(function (NA) {
  'use strict';
  const U = NA.U;

  function boot() {
    NA.Save.load();
    NA.Audio.setVolume(NA.Save.data.settings.volume);
    const canvas = document.getElementById('gl');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: !U.isTouch, powerPreference: 'high-performance' });
    renderer.autoClear = false;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.05, 300);
    scene.add(camera);
    scene.add(new THREE.HemisphereLight(0xe4edff, 0x4a4036, 0.95));
    const sun = new THREE.DirectionalLight(0xffffff, 0.55);
    sun.position.set(0.6, 1, 0.35);
    scene.add(sun);
    const vmScene = new THREE.Scene();
    const vmCamera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.01, 10);
    NA.R = { renderer, scene, camera, vmScene, vmCamera };

    NA.World.build(scene, 'aim_map');
    NA.Game.initFX();
    NA.Game.computeMods();
    NA.Chat.init();
    NA.UI.init();
    NA.Comms.init();
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', () => setTimeout(resize, 250));
    requestAnimationFrame(loop);
  }

  function resize() {
    const R = NA.R, w = innerWidth, h = innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, U.isTouch ? 1.75 : 2);
    R.renderer.setPixelRatio(dpr);
    R.renderer.setSize(w, h, false);
    R.camera.aspect = w / h; R.camera.updateProjectionMatrix();
    R.vmCamera.aspect = w / h; R.vmCamera.updateProjectionMatrix();
    NA.UI.resize(w, h);
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
    if (G.state === 'idle') G.menuCamera(now / 1000);
    R.renderer.clear();
    R.renderer.render(R.scene, R.camera);
    if (G.state === 'playing') { R.renderer.clearDepth(); R.renderer.render(R.vmScene, R.vmCamera); }
    NA.UI.drawOverlay(now);
    hudT += dt; if (hudT > 0.1) { hudT = 0; NA.UI.hudTick(); }
    mmT += dt; if (mmT > 0.12) { mmT = 0; NA.UI.drawMinimap(); }
    fadeT += dt; if (fadeT > 1) { fadeT = 0; NA.Chat.tickFade(); }
    frames++; fpsT += dt;
    if (fpsT >= 1) { NA.UI.fps(frames / fpsT); frames = 0; fpsT = 0; }
  }

  window.addEventListener('DOMContentLoaded', boot);
})(window.NA);
