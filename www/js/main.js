/* Boot */
(function () {
  const A = window.APP;
  document.querySelectorAll('#tabs button').forEach((b) => (b.onclick = () => { A.fx.tap(); A.setTab(b.dataset.tab); }));
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  try {
    A.render();
  } catch (e) {
    // last-resort recovery: never leave the player on a blank screen
    document.getElementById('top').innerHTML = '<h1>Blackjack MasterClass</h1>';
    document.getElementById('view').innerHTML = `<div class="page"><div class="card"><div class="kicker">Something went wrong</div>
      <h3 class="m0">Your saved progress couldn't be opened</h3><p class="muted small">Resetting the app's data fixes this. Your progress on this phone will be cleared.</p>
      <button class="btn" id="fixit">Reset and continue</button><p class="tiny muted" style="margin-top:10px">${String(e && e.message || e).replace(/[<>&]/g, '')}</p></div></div>`;
    document.getElementById('fixit').onclick = () => { try { localStorage.removeItem('bjmc.v2'); } catch (x) {} location.reload(); };
    return;
  }
  if (!A.S.prof.onboarded) setTimeout(A.onboard, 60);
  else {
    if (!A.S.prof.gameAsked) setTimeout(A.askGame, 300);
    if (A.S.prof.remind) A.scheduleReminder();
  }
})();
