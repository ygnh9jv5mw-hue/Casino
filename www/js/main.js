/* Kaido Nights: boot + main loop. */
(function (KN) {
  'use strict';
  function boot() {
    KN.Save.load();
    KN.Game.init();
    KN.UI.init();
    KN.Scenes.showGarage(KN.Save.data.cars.rookie && KN.Save.data.cars.rookie.rust && !KN.Save.data.intro.done ? 'dim' : 'show');
    KN.UI.show('scr-title');
    KN.Game.state = 'title';
    let last = performance.now();
    function frame(now) {
      const ms = now - last, dt = Math.min(0.05, ms / 1000);
      last = now;
      KN.Game.watchFrame(ms);
      try { KN.Game.update(dt); } catch (e) { console.error(e); }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { if (KN.Game.state === 'drive' && KN.Game.drive && !KN.Game.drive.paused && !KN.Game.drive.finished) KN.UI.togglePause(); if (KN.Audio.ctx) KN.Audio.ctx.suspend(); }
      else if (KN.Audio.ctx) KN.Audio.ctx.resume();
    });
    // turning the phone upright mid-run pauses it
    window.addEventListener('resize', () => {
      const G = KN.Game, d = G.drive;
      if (window.innerHeight > window.innerWidth && G.state === 'drive' && d && !d.paused && !d.finished) KN.UI.togglePause();
    });
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.SplashScreen) window.Capacitor.Plugins.SplashScreen.hide().catch(() => {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})(window.KN);
