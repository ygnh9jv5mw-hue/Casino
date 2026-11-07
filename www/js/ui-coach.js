/* Coach tab and team application. */
(function () {
  const A = window.APP, { $, $$, esc, SCREENS, go, CFG } = A;

  SCREENS.coach = () => ({
    title: 'Coach',
    html: `<div class="upnext coach-hero"><div class="eyebrow">${A.icon('calendar')} Live every week</div><h2 class="m0">Train with ${esc(CFG.coachName)}</h2>
        <p class="muted">Live sessions, 1-on-1 coaching and a private community of serious advantage players.</p>
        <button class="btn" data-url="bookingUrl">Book a 1-on-1 with ${esc(CFG.coachName)}</button></div>
      <h3 class="sec">Weekly live trainings</h3>
      <div class="card">${CFG.liveSchedule.map((s) => `<div class="sched"><span class="day">${esc(s.day.slice(0, 3))}</span><span class="ct"><b>${esc(s.title)}</b><small>${esc(s.day)} · ${esc(s.time)}</small></span></div>`).join('')}
        <button class="btn dark" data-url="liveTrainingUrl" style="margin-top:12px">Join the live training</button></div>
      <h3 class="sec">Community</h3>
      <div class="group">
      <button class="list-item" data-url="communityUrl"><span class="ic">${A.icon('chat')}</span><span class="tx"><b>Private community</b><span>Game reports, trip plans, accountability</span></span><span class="chev">${A.icon('chevron')}</span></button>
      <button class="list-item" data-url="osnUrl"><span class="ic">${A.icon('lock')}</span><span class="tx"><b>OSN access</b><span>Members-only resources</span></span><span class="chev">${A.icon('chevron')}</span></button>
      <button class="list-item" data-go="team"><span class="ic">${A.icon('users')}</span><span class="tx"><b>Apply to join a team</b><span>Your training stats go with it</span></span><span class="chev">${A.icon('chevron')}</span></button>
      </div>
      ${CFG.joinUrl ? '<button class="btn" data-url="joinUrl">Get the full MasterClass</button>' : ''}`,
    mount(root) {
      $$('[data-url]', root).forEach((b) => (b.onclick = () => A.openUrl(CFG[b.dataset.url])));
      A.bindGo(root);
    }
  });

  SCREENS.team = () => {
    const r = A.readiness(), ready = r.filter((x) => x.ok).length, rk = A.rank();
    return {
      title: 'Team Application',
      html: `<div class="card"><div class="kicker">Your verified stats</div><h3 class="m0">${esc(rk.name)} · ${A.S.xp.toLocaleString()} XP · stage ${A.currentStage() + 1}/${A.CAMP.length}</h3><div class="checks">${r.map((i) => A.checkRow(Object.assign({}, i, { go: '' }))).join('')}</div></div>
        ${ready < r.length ? '<div class="fb info">Teams look for players who hit every benchmark. You can apply now, but finishing the checklist makes your case.</div>' : '<div class="fb ok">You hit every benchmark. Strong application!</div>'}
        <div class="card"><label>Name</label><input id="t1"><label>City / region</label><input id="t2"><label>Playing experience</label>
        <select id="t3"><option>New — still training</option><option>Under 100 hours</option><option>100–500 hours</option><option>500+ hours</option></select>
        <label>Why you, in a sentence or two</label><textarea id="t4" rows="3"></textarea><div style="height:10px"></div><button class="btn" id="ts">Send application</button></div>`,
      mount(root) {
        $('#ts', root).onclick = async () => {
          const name = $('#t1', root).value.trim(); if (!name) return A.toast('Add your name first.');
          const body = `Team application\n\nName: ${name}\nRegion: ${$('#t2', root).value}\nExperience: ${$('#t3', root).value}\nRank: ${rk.name} (${A.S.xp} XP), bootcamp stage ${A.currentStage() + 1}\n\n${$('#t4', root).value}\n\nTraining stats:\n` + r.map((x) => `${x.ok ? '✓' : '○'} ${x.t} (${x.v})`).join('\n');
          if (CFG.supportEmail) location.href = `mailto:${CFG.supportEmail}?subject=${encodeURIComponent('Team application: ' + name)}&body=${encodeURIComponent(body)}`;
          else if (navigator.share) { try { await navigator.share({ title: 'Team application', text: body }); } catch (e) {} }
          else { try { await navigator.clipboard.writeText(body); A.toast('Application copied — paste it into a message to your coach.'); } catch (e) { A.toast('Sharing isn\'t available here.'); } }
        };
      }
    };
  };
})();
