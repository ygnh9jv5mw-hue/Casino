/* Boot */
(function () {
  const A = window.APP;
  document.querySelectorAll('#tabs button').forEach((b) => (b.onclick = () => { A.fx.tap(); A.setTab(b.dataset.tab); }));
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  A.render();
  if (!A.S.prof.onboarded) setTimeout(A.onboard, 60);
  else if (A.S.prof.remind) A.scheduleReminder();
})();
