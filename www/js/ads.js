/* Kaido Nights: rewarded ads. This build only has a placeholder: the real thing is AdMob on
   iPhone and AdSense H5 Games Ads on the web, plugged in here once the ad accounts exist.
   Ads are always optional, never mid-run, and capped per session. */
(function (KN) {
  'use strict';
  const Ads = KN.Ads = { cap: 5, used: 0 };
  Ads.canReward = () => Ads.used < Ads.cap;
  Ads.rewarded = function (onReward) {
    if (!Ads.canReward()) return;
    const ov = KN.$('ad'), cnt = KN.$('ad-count');
    let n = 3;
    ov.classList.remove('hidden'); cnt.textContent = n;
    const iv = setInterval(() => {
      n--; cnt.textContent = n;
      if (n <= 0) { clearInterval(iv); ov.classList.add('hidden'); Ads.used++; KN.Audio.win(); onReward(); }
    }, 1000);
  };
})(window.KN);
