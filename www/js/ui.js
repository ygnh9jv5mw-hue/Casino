/* Kaido Nights: screens, HUD, garage intro, tutorial prompts. */
(function (KN) {
  'use strict';
  const U = KN.U, D = KN.DATA, $ = KN.$, A = KN.Audio, esc = U.esc;
  const UI = KN.UI = { cur: 'scr-title', stack: [] };
  const S = () => KN.Save.data;
  const fmtT = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const cr = n => '¥' + U.fmt(n);

  // ---------------------------------------------------------------- screens
  UI.show = function (id) {
    document.querySelectorAll('.screen').forEach(e => e.classList.toggle('hidden', e.id !== id));
    UI.cur = id;
    // the garage/meet camera slides the car into the space right of this screen's panel
    const p = document.querySelector('#' + id + ' [data-panel]');
    if (p) KN.Scenes.panel = p.getBoundingClientRect().right + 6;
  };
  UI.respawned = function () {
    const f = $('fade'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
    centerMsg('BACK ON THE ROAD', 1.1, 'title');
  };
  UI.toast = function (msg, kind) {
    const t = $('toast'); t.textContent = msg; t.className = 'show ' + (kind || '');
    clearTimeout(UI._tt); UI._tt = setTimeout(() => { t.className = ''; }, 2200);
  };
  const click = (id, fn) => $(id).addEventListener('click', e => { A.init(); A.click(); fn(e); });
  const wallet = () => { for (const id of ['hub-cr', 'map-cr', 'gar-cr', 'meet-cr']) { const e = $(id); if (e) e.textContent = cr(S().credits); } $('hub-rep').textContent = U.fmt(S().rep) + ' REP'; };
  UI.wallet = wallet;

  UI.init = function () {
    $('t-ver').textContent = 'v' + KN.VERSION;
    click('title-go', () => { if (!S().intro.done) UI.startIntro(); else UI.showHub(); });
    document.querySelectorAll('[data-back]').forEach(b => b.addEventListener('click', () => { A.click(); UI.showHub(); }));
    click('h-takeover', () => UI.showMap());
    click('h-roam', () => UI.showRoam());
    click('h-garage', () => UI.showGarage('parts'));
    click('h-meet', () => UI.showMeet());
    click('h-settings', () => UI.showSettings());
    click('pause-btn', () => UI.togglePause());
    $('gar-tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) { A.click(); UI.showGarage(b.dataset.tab); } });
    $('gar-body').addEventListener('click', garageClick);
    $('city').addEventListener('click', e => { const b = e.target.closest('[data-district]'); if (b) { A.click(); UI.showBattle(b.dataset.district); } });
    $('roam-list').addEventListener('click', e => { const b = e.target.closest('[data-roam]'); if (b) { A.click(); KN.Game.startDrive(b.dataset.roam, 'roam'); } });
    $('meet-body').addEventListener('click', meetClick);
    $('set-body').addEventListener('click', settingsClick);
    $('set-body').addEventListener('input', settingsInput);
    $('scr-pause').addEventListener('click', pauseClick);
    $('res').addEventListener('click', resultsClick);
    $('vs').addEventListener('click', e => {
      const b = e.target.closest('[data-go]'); if (!b) return; A.click();
      if (b.dataset.go === 'back') UI.showMap(); else KN.Game.startDrive(b.dataset.go, 'battle');
    });
    $('story').addEventListener('click', storyClick);
  };

  // ---------------------------------------------------------------- hub
  UI.nextDistrict = () => D.DISTRICTS.find(d => !S().taken[d.id]) || null;
  UI.unlocked = d => d.index === 0 || !!S().taken[D.DISTRICTS[d.index - 1].id];
  UI.showHub = function () {
    KN.Game.state = 'menu';
    KN.Scenes.showGarage('show');
    const n = UI.nextDistrict(), car = D.CAR[S().car];
    $('h-take-title').textContent = n ? n.crew : 'City is yours';
    $('h-take-sub').textContent = n ? `${n.name} · beat ${n.leader}` : 'Replay any district';
    $('hub-carname').textContent = car.name; $('hub-carera').textContent = car.era;
    const owned = D.DISTRICTS.filter(d => S().taken[d.id]).length;
    $('h-progress').innerHTML = D.DISTRICTS.map(d => `<i class="${S().taken[d.id] ? 'on' : ''}" style="--c:${d.color}"></i>`).join('') + `<span>${owned}/5 districts</span>`;
    wallet();
    UI.show('scr-hub');
    $('hud').classList.add('hidden'); $('touch').classList.add('hidden');
  };

  // ---------------------------------------------------------------- garage intro (first run)
  const STORY = [
    { k: 'name', title: '街道 <em>KAIDŌ</em>', body: 'Kaidō means <b>road</b> in Japanese. Kaido Nights is about the roads, and the meets, that come alive after dark.', btn: 'NEXT' },
    { k: 'car', title: 'This is your car.', body: "A rusty '85 hatchback. Light, slow, rear-wheel drive. Every legend starts with a junk car.", btn: 'NEXT' },
    { k: 'paint', title: 'Free respray', body: 'The shop owes you one. Pick a colour and the respray strips the rust off.', btn: 'RESPRAY (FREE)' },
    { k: 'parts', title: 'Starter parts', body: 'They threw in a couple of parts. Install them. This is how the upgrade menu works.', btn: 'NEXT' },
    { k: 'controls', title: 'How do you want to drive?', body: 'You can switch any time in Settings.', btn: 'NEXT' },
    { k: 'go', title: 'The Docks are quiet tonight.', body: 'Take it out. The Rust Rats run the docks, but first, learn to slide.', btn: 'DRIVE' },
  ];
  UI.startIntro = function () {
    KN.Game.state = 'menu';
    const s = S();
    UI.intro = { step: Math.min(s.intro.step || 0, STORY.length - 1), paint: D.PAINTS[0].hex };
    KN.Scenes.showGarage(s.cars.rookie.rust ? 'dim' : 'show');
    UI.show('scr-intro');
    renderStory();
  };
  function renderStory() {
    const st = STORY[UI.intro.step], s = S(), cs = s.cars.rookie;
    let extra = '';
    if (st.k === 'paint') extra = `<div class="swatches">${D.PAINTS.map(p => `<button class="sw ${UI.intro.paint === p.hex ? 'on' : ''}" data-paint="${p.hex}" style="--c:${p.hex}" title="${esc(p.name)}"></button>`).join('')}</div><div class="sw-name">${esc(D.PAINTS.find(p => p.hex === UI.intro.paint).name)}</div>`;
    if (st.k === 'parts') extra = `<div class="freebies">${[['tires', 'Street tires', 'More grip, so slides hold their line.'], ['handbrake', 'Handbrake tune', 'Sharper kicks to start a drift.']].map(([id, n, dsc]) => `<div class="fb ${cs.parts[id] ? 'done' : ''}"><b>${n}</b><span>${dsc}</span><button data-free="${id}">${cs.parts[id] ? 'INSTALLED ✓' : 'INSTALL · FREE'}</button></div>`).join('')}</div>${statBars('rookie', cs.parts)}`;
    if (st.k === 'controls') extra = controlPicker();
    const ready = st.k !== 'parts' || (cs.parts.tires && cs.parts.handbrake);
    $('story').innerHTML = `<div class="st-step">${UI.intro.step + 1}/${STORY.length}</div><h2>${st.title}</h2><p>${st.body}</p>${extra}<button class="btn-go ${ready ? '' : 'dis'}" data-story="next">${st.btn}</button>`;
  }
  function controlPicker() {
    const c = S().settings.controls;
    const opt = (id, name, dsc) => `<button class="ctl ${c === id ? 'on' : ''}" data-ctl="${id}"><b>${name}</b><span>${dsc}</span></button>`;
    return `<div class="ctl-grp"><small>BEGINNER</small>${opt('thumb', 'One-thumb', 'Auto gas. Hold left or right to slide.')}${opt('tilt', 'Tilt', 'Auto gas. Tilt the phone to steer.')}</div>
      <div class="ctl-grp"><small>ADVANCED</small>${opt('arcade', 'Arcade', 'Gas, brake, e-brake, steer. Light assists.')}${opt('pro', 'Pro', 'Full manual. No assists. +20% points.')}</div>`;
  }
  function storyClick(e) {
    const s = S(), cs = s.cars.rookie, st = STORY[UI.intro.step];
    const sw = e.target.closest('[data-paint]');
    if (sw) { A.click(); UI.intro.paint = sw.dataset.paint; renderStory(); return; }
    const fr = e.target.closest('[data-free]');
    if (fr && !cs.parts[fr.dataset.free]) { A.init(); A.bank(1); cs.parts[fr.dataset.free] = 1; KN.Save.save(); KN.Scenes.flashGarage(); renderStory(); return; }
    const ct = e.target.closest('[data-ctl]');
    if (ct) { A.click(); setControls(ct.dataset.ctl); renderStory(); return; }
    if (!e.target.closest('[data-story]')) return;
    A.init(); A.click();
    if (st.k === 'parts' && !(cs.parts.tires && cs.parts.handbrake)) { UI.toast('Install both parts first'); return; }
    if (st.k === 'paint') {
      cs.paint = UI.intro.paint; cs.rust = false; KN.Save.save();
      A.spray(); KN.Scenes.flashGarage();
      $('story').classList.add('spraying');
      setTimeout(() => { KN.Scenes.setLook(KN.Game.lookOf(cs)); KN.Scenes.showGarage('show'); $('story').classList.remove('spraying'); }, 900);
    }
    if (st.k === 'go') { s.intro.step = STORY.length - 1; KN.Save.save(); KN.Game.startDrive('docks', 'tutorial'); return; }
    UI.intro.step++; s.intro.step = UI.intro.step; KN.Save.save();
    setTimeout(renderStory, st.k === 'paint' ? 950 : 0);
  }
  function setControls(id) {
    S().settings.controls = id; KN.Save.save();
    if (id === 'tilt') KN.Game.requestTilt().then(r => { if (r === 'denied') UI.toast('Tilt is blocked, so the arrows work too'); });
  }

  // ---------------------------------------------------------------- takeover map + battle intro
  const CITY_POS = [[14, 70], [36, 38], [58, 66], [80, 34], [56, 12]];
  UI.showMap = function () {
    KN.Scenes.showGarage('show');
    const s = S();
    $('city').innerHTML = `<svg class="city-lines" viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points="${CITY_POS.map(p => p.join(',')).join(' ')}"/></svg>` + D.DISTRICTS.map((d, i) => {
      const owned = !!s.taken[d.id], open = UI.unlocked(d);
      const [x, y] = CITY_POS[i];
      return `<button class="dist ${owned ? 'owned' : open ? 'open' : 'locked'}" data-district="${open ? d.id : ''}" style="left:${x}%;top:${y}%;--c:${d.color}">
        <small>${esc(d.name)}</small><b>${esc(d.crew)}</b>
        <span>${owned ? 'TAKEN OVER ✓' : open ? 'Beat ' + esc(d.leader) + ': ' + U.fmt(d.target) : 'Beat ' + esc(D.DISTRICTS[i - 1].crew) + ' first'}</span></button>`;
    }).join('');
    wallet();
    UI.show('scr-map');
  };
  UI.showBattle = function (id) {
    const d = D.DISTRICT[id], s = S();
    if (!d || !UI.unlocked(d)) return;
    const rc = D.CAR[d.rivalCar], owned = !!s.taken[id];
    KN.Scenes.showRival(d);
    $('vs').innerHTML = `<div class="vs-card" style="--c:${d.color}">
      <small>TAKEOVER · ${esc(d.name).toUpperCase()}</small>
      <h2>${esc(d.crew)}</h2>
      <p class="vs-vibe">${esc(d.vibe)}</p>
      <div class="vs-row"><div><span>Leader</span><b>${esc(d.leader)}</b></div><div><span>Car</span><b>${esc(rc.name)}</b></div><div><span>Score to beat</span><b>${U.fmt(d.target)}</b></div></div>
      <ul class="vs-rules"><li>Follow ${esc(d.leader)} through one lap of the course.</li><li>Drift close behind them for <b>tandem</b> points (x1.5).</li><li>Hold <b>x5</b> for 5 seconds and the drift banks itself (MAX BANK).</li><li>Off the course, points stop counting.</li></ul>
      <div class="vs-pay">Win: ${cr(owned ? Math.round(d.reward * 0.25 / 50) * 50 : d.reward)}${owned ? ' (replay)' : ' + the district'}${d.index < 4 && !owned ? ' + unlocks ' + esc(D.DISTRICTS[d.index + 1].name) : ''}</div>
      <div class="vs-btns"><button class="btn-ghost" data-go="back">Back</button><button class="btn-go" data-go="${id}">DRIFT</button></div></div>`;
    UI.show('scr-battle');
  };
  UI.showRoam = function () {
    KN.Scenes.showGarage('show');
    const s = S();
    $('roam-list').innerHTML = D.DISTRICTS.map(d => {
      const open = UI.unlocked(d);
      return `<button class="roam ${open ? '' : 'locked'}" data-roam="${open ? d.id : ''}" style="--c:${d.color}"${open ? '' : ' disabled'}><small>${esc(d.crew)} turf</small><b>${esc(d.name)}</b><span>${open ? (s.best[d.id] ? 'Best run: ' + U.fmt(s.best[d.id]) : 'No runs yet') : 'Locked'}</span></button>`;
    }).join('') + `<p class="roam-note">Free roam pays ¥1 for every ${Math.round(1 / D.CREDITS_PER_POINT.roam)} points, up to ${cr(D.CREDIT_CAP.roam)} a run. Keep moving: circling on the spot doesn't pay. Pause to end a run.</p>`;
    UI.show('scr-roam');
  };

  // ---------------------------------------------------------------- garage
  function statBars(carId, parts) {
    const st = KN.carStats(carId, parts);
    const bar = (n, v) => `<div class="stat"><span>${n}</span><i><u style="width:${Math.round(v * 100)}%"></u></i></div>`;
    return `<div class="stats">${bar('Power', st.power)}${bar('Grip', st.grip)}${bar('Angle', st.angle)}${bar('Control', st.control)}</div>`;
  }
  UI.showGarage = function (tab) {
    KN.Scenes.showGarage('show');
    UI.garTab = tab || UI.garTab || 'parts';
    document.querySelectorAll('#gar-tabs [data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === UI.garTab));
    const s = S(), cs = KN.Save.car(), carId = s.car;
    $('gar-stats').innerHTML = `<div class="gar-car"><b>${esc(D.CAR[carId].name)}</b><span>${esc(D.CAR[carId].era)}</span></div>` + statBars(carId, cs.parts);
    let html = '';
    if (UI.garTab === 'parts') {
      html = D.PARTS.map(p => {
        const lv = cs.parts[p.id] || 0, max = lv >= 5, cost = max ? 0 : D.partCost(carId, p.id, lv);
        return `<div class="part"><div class="p-ic">${p.icon}</div><div class="p-txt"><b>${p.name}</b><span>${p.desc}</span><div class="pips">${[0, 1, 2, 3, 4].map(i => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</div></div>
          <button class="buy ${max ? 'max' : s.credits < cost ? 'cant' : ''}" data-part="${p.id}" ${max ? 'disabled' : ''}>${max ? 'MAXED' : cr(cost)}</button></div>`;
      }).join('');
    } else if (UI.garTab === 'paint') {
      html = `<h4>Paint <small>${cr(D.PAINT_PRICE)} a respray</small></h4><div class="swatches">${D.PAINTS.map(p => `<button class="sw ${cs.paint === p.hex && !cs.rust ? 'on' : ''}" data-paint="${p.hex}" style="--c:${p.hex}" title="${esc(p.name)}"></button>`).join('')}</div>
        <h4>Finish</h4><div class="chips">${D.FINISHES.map(f => `<button class="chip ${cs.finish === f.id ? 'on' : ''}" data-finish="${f.id}">${f.name}${f.price && cs.finish !== f.id ? ' · ' + cr(f.price) : ''}</button>`).join('')}</div>
        <h4>Wheels <small>${cr(150)}</small></h4><div class="swatches">${D.WHEELS.map(w => `<button class="sw ${cs.wheels === w.hex ? 'on' : ''}" data-wheels="${w.hex}" style="--c:${w.hex}" title="${esc(w.name)}"></button>`).join('')}</div>
        <h4>Rear wing</h4><div class="chips"><button class="chip ${cs.kit.spoiler ? 'on' : ''}" data-kit="spoiler">${cs.kit.spoiler ? 'Fitted ✓ (tap to remove)' : 'Fit a wing · ' + cr(600)}</button></div>`;
    } else {
      html = D.CARS.map(c => {
        const own = !!s.cars[c.id], sel = s.car === c.id, open = !c.needs || s.taken[c.needs];
        const btn = sel ? '<button class="buy max" disabled>DRIVING</button>' : own ? `<button class="buy" data-car="${c.id}">DRIVE</button>`
          : open ? `<button class="buy ${s.credits < c.price ? 'cant' : ''}" data-buycar="${c.id}">${cr(c.price)}</button>` : `<button class="buy cant" disabled>Take ${esc(D.DISTRICT[c.needs].name)}</button>`;
        return `<div class="part car-row ${sel ? 'sel' : ''}"><div class="p-ic car">${c.tier}</div><div class="p-txt"><b>${esc(c.name)}</b><span>${esc(c.era)}${!own && c.price ? ' · ' + cr(c.price) : ''} · ${esc(c.desc)}</span></div>${btn}</div>`;
      }).join('');
    }
    $('gar-body').innerHTML = html;
    wallet();
    UI.show('scr-garage');
  };
  function spend(n) { const s = S(); if (s.credits < n) { A.lose(); UI.toast('Not enough credits', 'bad'); return false; } s.credits -= n; KN.Save.save(); return true; }
  function garageClick(e) {
    const s = S(), cs = KN.Save.car(), carId = s.car, b = e.target.closest('button');
    if (!b) return;
    A.init();
    if (b.dataset.part) {
      const lv = cs.parts[b.dataset.part] || 0; if (lv >= 5) return;
      if (!spend(D.partCost(carId, b.dataset.part, lv))) return;
      cs.parts[b.dataset.part] = lv + 1; KN.Save.save(); A.bank(1); KN.Scenes.flashGarage(); KN.Haptics.tap();
    } else if (b.dataset.paint) {
      if (cs.paint === b.dataset.paint && !cs.rust) return;
      if (!spend(D.PAINT_PRICE)) return;
      cs.paint = b.dataset.paint; cs.rust = false; A.spray();
    } else if (b.dataset.finish) {
      const f = D.FINISHES.find(x => x.id === b.dataset.finish);
      if (cs.finish === f.id) return;
      if (f.price && !spend(f.price)) return;
      cs.finish = f.id; A.spray();
    } else if (b.dataset.wheels) {
      if (cs.wheels === b.dataset.wheels) return;
      if (!spend(150)) return;
      cs.wheels = b.dataset.wheels; A.click();
    } else if (b.dataset.kit) {
      if (cs.kit.spoiler) cs.kit.spoiler = 0; else { if (!spend(600)) return; cs.kit.spoiler = 1; }
      KN.Save.save(); KN.Scenes.setGarageCar(carId, KN.Game.lookOf(cs)); UI.showGarage(); return;
    } else if (b.dataset.car) {
      s.car = b.dataset.car; KN.Save.save(); KN.Scenes.setGarageCar(s.car, KN.Game.lookOf(KN.Save.car())); UI.showGarage(); return;
    } else if (b.dataset.buycar) {
      const c = D.CAR[b.dataset.buycar];
      if (!spend(c.price)) return;
      s.cars[c.id] = KN.Save.carState(U.pick(['#d62828', '#3a86ff', '#eef1f4', '#121316', '#ffc300']), false);
      s.car = c.id; KN.Save.save(); A.win(); UI.toast(`${c.name} is yours`, 'good');
      KN.Scenes.setGarageCar(s.car, KN.Game.lookOf(KN.Save.car())); UI.showGarage('cars'); return;
    } else return;
    KN.Save.save();
    KN.Scenes.setLook(KN.Game.lookOf(cs));
    UI.showGarage();
  }

  // ---------------------------------------------------------------- night meet
  UI.style = function () {
    const s = S(), cs = KN.Save.car(), c = D.CAR[s.car];
    const parts = Object.values(cs.parts).reduce((a, b) => a + b, 0);
    return Math.max(5, Math.round(c.tier * 22 + parts * 5 + (cs.finish !== 'gloss' ? 14 : 0) + (cs.wheels !== '#c9ccd2' ? 6 : 0) + (cs.kit.spoiler ? 8 : 0) - (cs.rust ? 30 : 0)));
  };
  UI.dailyChallenges = function () {
    const s = S(), day = U.today();
    if (s.challenges.day !== day || !s.challenges.list.length) {
      const tier = Math.min(3, Object.keys(s.taken).length), rnd = U.rng(U.hash(day));
      const pool = D.CHALLENGES.slice(), list = [];
      while (list.length < 3 && pool.length) {
        const c = pool.splice(Math.floor(rnd() * pool.length), 1)[0];
        list.push({ id: c.id, n: c.n[tier], done: false, pay: Math.round(c.pay * (400 + 600 * tier) / 50) * 50 });
      }
      s.challenges = { day, list };
      KN.Save.save();
    }
    return s.challenges.list;
  };
  UI.checkChallenges = function (mode, run, total) {
    const got = [];
    for (const ch of UI.dailyChallenges()) {
      if (ch.done) continue;
      const def = D.CHALLENGES.find(c => c.id === ch.id), v = {
        bestChain: run.bestChain, manjiChain: run.manjiChain, nearRun: run.nearRun, linkChain: run.linkChain, maxMult5: run.maxMult5,
        tandemRun: mode === 'battle' ? run.tandemRun : 0, roamRun: mode === 'roam' ? total : 0,
      }[def.stat];
      if (v >= ch.n) { ch.done = true; S().rep += 10; got.push({ text: def.text.replace('{n}', U.fmt(ch.n)), pay: ch.pay }); }
    }
    return got;
  };
  UI.showMeet = function () {
    KN.Game.state = 'menu';
    KN.Scenes.showMeet();
    renderMeet();
    UI.show('scr-meet');
  };
  function renderMeet(reaction) {
    const s = S(), style = UI.style(), shown = s.meet.day === U.today() && s.meet.shown, n = UI.nextDistrict();
    const list = UI.dailyChallenges();
    $('meet-body').innerHTML = `
      <div class="m-card"><small>YOUR BUILD</small><b>${esc(D.CAR[s.car].name)}</b><div class="style-meter"><i style="width:${Math.min(100, style / 1.8)}%"></i></div><span>Style ${style}</span>
        <button class="btn-go ${shown ? 'dis' : ''}" data-meet="show">${shown ? 'SHOWN OFF TONIGHT' : 'SHOW IT OFF'}</button>
        ${reaction ? `<div class="m-react">${reaction}</div>` : ''}</div>
      <div class="m-card"><small>TONIGHT'S CHALLENGES</small>${list.map(ch => { const d = D.CHALLENGES.find(c => c.id === ch.id); return `<div class="chal ${ch.done ? 'done' : ''}"><span>${esc(d.text.replace('{n}', U.fmt(ch.n)))}</span><b>${ch.done ? 'DONE ✓' : cr(ch.pay)}</b></div>`; }).join('')}<p class="m-note">Rewards pay out automatically when you finish a run. New challenges every day.</p></div>
      ${n ? `<div class="m-card rival" style="--c:${n.color}"><small>A RIVAL WALKS UP</small><p>"${esc(rivalLine(n))}"</p><span>${esc(n.leader)} · ${esc(n.crew)}</span><button class="btn-go" data-meet="rival" data-id="${n.id}">ACCEPT</button></div>` : '<div class="m-card"><small>THE CITY IS YOURS</small><p>Every crew bows when you roll in.</p></div>'}`;
    $('meet-cr').textContent = cr(s.credits);
  }
  function rivalLine(d) {
    return {
      docks: 'Nice paint. Shame about the driver. Docks, tonight.',
      industrial: "The Forge Kings don't race. We burn. Bring tyres.",
      downtown: 'You drive like a parking ticket. Downtown. Show me style.',
      highway: 'Heard you can slide. Can you slide at 200?',
      crown: 'Everyone wants the Crown. Nobody keeps it.',
    }[d.id];
  }
  function meetClick(e) {
    const b = e.target.closest('[data-meet]'); if (!b) return;
    A.init(); A.click();
    const s = S();
    if (b.dataset.meet === 'rival') { UI.showBattle(b.dataset.id); return; }
    if (b.dataset.meet === 'show') {
      if (s.meet.day === U.today() && s.meet.shown) return;
      const style = UI.style(), pay = style * 8, rep = Math.round(style / 4);
      s.meet = { day: U.today(), shown: true }; s.credits += pay; s.rep += rep; KN.Save.save();
      KN.Scenes.showOff(); A.win(); KN.Haptics.tap('MEDIUM');
      const lines = style > 120 ? ['the crowd loses it', 'phones out everywhere', '"that build is insane"'] : style > 60 ? ['heads turn', '"clean."', 'somebody whistles'] : ['a few polite nods', '"...is that rust?"', 'one guy takes a photo. of the car next to yours'];
      renderMeet(`${U.pick(lines)} · +${cr(pay)} · +${rep} rep <button class="mini-ad" data-ad="meet" data-pay="${pay}">▶ AD: DOUBLE IT</button>`);
      wallet();
    }
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-ad="meet"]'); if (!b || !KN.Ads.canReward()) return;
    KN.Ads.rewarded(() => { S().credits += +b.dataset.pay; KN.Save.save(); UI.toast(`+${cr(+b.dataset.pay)}`, 'good'); b.remove(); wallet(); $('meet-cr').textContent = cr(S().credits); });
  });

  // ---------------------------------------------------------------- settings
  UI.showSettings = function () {
    KN.Scenes.showGarage('show');
    const st = S().settings;
    $('set-body').innerHTML = `<div class="set-card"><h4>Controls</h4>${controlPicker()}
        ${st.controls === 'tilt' ? `<label class="srow">Tilt sensitivity <input type="range" min="0.5" max="2" step="0.1" value="${st.tiltSens}" data-set="tiltSens"><b>${st.tiltSens.toFixed(1)}</b></label>` : ''}
        <p class="m-note">Keyboard: arrows or WASD, Space for e-brake. Controllers work too.</p></div>
      <div class="set-card"><h4>Sound &amp; feel</h4>
        <label class="srow">Volume <input type="range" min="0" max="1" step="0.05" value="${st.volume}" data-set="volume"><b>${Math.round(st.volume * 100)}%</b></label>
        <label class="srow">Vibration <input type="checkbox" ${st.haptics ? 'checked' : ''} data-set="haptics"></label>
        <label class="srow">Graphics <span class="chips"><button class="chip ${st.quality === 'high' ? 'on' : ''}" data-q="high">High</button><button class="chip ${st.quality === 'low' ? 'on' : ''}" data-q="low">Low (faster)</button></span></label>
        <p class="m-note">Graphics changes apply next time you open the game.</p></div>
      <div class="set-card"><h4>Playtest</h4><p class="m-note">Played a bit? Copy this report and send it with what you thought.</p>
        <button class="btn-go small" data-report="1">COPY PLAYTEST REPORT</button><textarea class="report hidden" id="report" readonly></textarea>
        <button class="btn-ghost danger" data-reset="1">${UI.resetArm ? 'Tap again to wipe everything' : 'Reset all progress'}</button><p class="m-note">Kaido Nights v${KN.VERSION}. Ads in this build are placeholders.</p></div>`;
    UI.show('scr-settings');
  };
  function settingsClick(e) {
    const b = e.target.closest('button'); if (!b) return;
    A.init(); A.click();
    if (b.dataset.ctl) { setControls(b.dataset.ctl); UI.showSettings(); }
    else if (b.dataset.report) {
      const text = UI.report(), ta = $('report');
      const show = () => { ta.value = text; ta.classList.remove('hidden'); ta.focus(); ta.select(); UI.toast('Select the text and copy it'); };
      try { navigator.clipboard.writeText(text).then(() => { UI.toast('Report copied', 'good'); ta.value = text; ta.classList.remove('hidden'); }, show); } catch (_) { show(); }
    }
    else if (b.dataset.q) { S().settings.quality = b.dataset.q; delete S().settings.pr; KN.Save.save(); UI.showSettings(); }
    else if (b.dataset.reset) {
      if (!UI.resetArm) { UI.resetArm = true; UI.showSettings(); setTimeout(() => { UI.resetArm = false; }, 3000); return; }
      KN.Save.reset(); UI.resetArm = false; location.reload();
    }
  }
  // a plain-text summary a tester can paste into a message
  UI.report = function () {
    const s = S(), st = s.stats, ua = navigator.userAgent || '';
    const ios = (ua.match(/OS (\d+)_(\d+)/) || []).slice(1).join('.');
    const device = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : 'Computer';
    const ctl = { thumb: 'One-thumb', tilt: 'Tilt', arcade: 'Arcade', pro: 'Pro' }[s.settings.controls];
    const G = KN.Game, pr = G.renderer ? G.renderer.getPixelRatio() : 1;
    return [
      `Kaido Nights v${KN.VERSION} playtest report`,
      `Device: ${device}${ios ? ' iOS ' + ios : ''}, ${screen.width}x${screen.height}, render x${pr}${s.settings.pr ? ' (lowered for speed)' : ''}`,
      `Controls: ${ctl}. Graphics: ${s.settings.quality}`,
      `Played: ${Math.round(st.playSec / 60)} min over ${st.runs} runs`,
      'Takeover: ' + D.DISTRICTS.map(d => `${d.name} ${s.taken[d.id] ? 'TAKEN' : 'not yet'} (${s.attempts[d.id] || 0} tries, best ${U.fmt(s.battleBest[d.id] || 0)} of ${U.fmt(d.target)})`).join('; '),
      'Free roam best: ' + (D.DISTRICTS.filter(d => s.best[d.id]).map(d => `${d.name} ${U.fmt(s.best[d.id])}`).join('; ') || 'none'),
      `Drifts ${st.drifts}, best drift ${U.fmt(st.bestDrift)}, near misses ${st.nearMiss}, manji ${st.manji}, links ${st.links}, scrapes ${st.scrapes}, crashes ${st.crashes}`,
      `Garage: ${Object.keys(s.cars).map(id => D.CAR[id].name + (id === s.car ? ' (driving)' : '')).join(', ')}. ${cr(s.credits)}, ${s.rep} rep`,
    ].join('\n');
  };
  function settingsInput(e) {
    const t = e.target, k = t.dataset.set; if (!k) return;
    const st = S().settings;
    if (k === 'haptics') st.haptics = t.checked; else st[k] = +t.value;
    if (k === 'volume') A.setVolume(st.volume);
    const out = t.parentElement.querySelector('b');
    if (out) out.textContent = k === 'volume' ? Math.round(st.volume * 100) + '%' : (+t.value).toFixed(1);
    KN.Save.save();
  }

  // ---------------------------------------------------------------- HUD
  const TUT = {
    first: {
      thumb: 'Gas is automatic. Let it pick up speed, then hold the <b>right</b> side of the screen to slide right, the <b>left</b> side to slide left.',
      tilt: 'Tilt the phone to steer into a slide. Gas is automatic. Tap the screen for a handbrake kick.',
      arcade: 'Hold <b>GAS</b>, steer, and tap <b>E-BRAKE</b> to kick the tail out.',
      pro: 'Gas, steer, tap <b>E-BRAKE</b> to start a drift, then counter-steer to hold it. No assists.',
    },
    steps: [
      { key: 'start' },
      { text: 'Now <b>let go</b> and straighten out to <b>bank</b> the points.', key: 'bank' },
      { text: 'Hold a drift longer to grow the multiplier. Try for <b>x3</b>.', key: 'x3', skip: 60 },
      { text: 'Flick to the <b>other side</b> mid-drift for a manji bonus.', key: 'manji', skip: 30 },
      { text: 'Tail close to walls for near-miss points. A scrape drops the multiplier, a hard hit loses the drift. <b>Bank 2 more</b> to finish.', key: 'banks', skip: 45 },
    ],
  };
  UI.showHud = function (mode) {
    const st = S().settings;
    UI.show('none');
    $('hud').className = 'c-' + st.controls + (mode === 'tutorial' ? ' tutorial' : '');
    const t = $('touch'); t.className = 'm-' + st.controls + (st.controls === 'tilt' && !KN.Game.input.tiltOK ? ' no-tilt' : '');
    $('h-battle').classList.toggle('hidden', mode !== 'battle');
    $('feed').innerHTML = ''; $('cmsg').textContent = ''; $('drift').classList.remove('on');
    $('offc').classList.add('hidden'); $('tandem').classList.add('hidden');
    const G = KN.Game;
    UI.tut = mode === 'tutorial' ? { i: 0, t: 0, banks0: 0 } : null;
    $('tut').classList.toggle('hidden', !UI.tut);
    if (UI.tut) setTut();
    if (mode === 'battle') {
      const d = G.drive.def;
      $('hb-name').textContent = d.leader.toUpperCase(); $('hb-target').textContent = U.fmt(d.target);
      centerMsg('3', 1);
      UI._cd = 3;
    } else centerMsg(G.drive.def.name.toUpperCase(), 1.6, 'title');
    UI.mm = null;
  };
  function setTut() {
    const step = TUT.steps[UI.tut.i];
    const ctl = S().settings.controls === 'tilt' && !KN.Game.input.tiltOK ? 'thumb' : S().settings.controls;
    $('tut').innerHTML = (UI.tut.i === 0 ? TUT.first[ctl] || TUT.first.thumb : step.text) + `<small>${UI.tut.i + 1}/${TUT.steps.length}</small>`;
  }
  function tutAdvance(key) {
    if (!UI.tut) return;
    const step = TUT.steps[UI.tut.i];
    if (step.key !== key) return;
    UI.tut.i++; UI.tut.t = 0; A.step();
    if (UI.tut.i >= TUT.steps.length) { UI.tut = null; $('tut').classList.add('hidden'); centerMsg('TUTORIAL DONE', 2, 'title'); setTimeout(() => KN.Game.finishDrive('tutorial'), 1400); return; }
    if (TUT.steps[UI.tut.i].key === 'banks') UI.tut.banks0 = KN.Game.score.run.banks;
    setTut();
  }
  UI.go = function () { if (KN.Game.drive.mode !== 'battle') return; centerMsg('GO!', 0.8, 'go'); A.tone(880, 0.35, 'square', 0.12); KN.Haptics.tap('MEDIUM'); };
  function centerMsg(text, dur, kind) {
    const c = $('cmsg'); c.textContent = text; c.className = 'center-msg show ' + (kind || '');
    clearTimeout(UI._cm); UI._cm = setTimeout(() => { c.className = 'center-msg'; }, (dur || 1.2) * 1000);
  }
  function feed(text, kind) {
    const f = $('feed'), el = document.createElement('div');
    el.className = 'fd ' + (kind || ''); el.textContent = text;
    f.appendChild(el);
    while (f.children.length > 4) f.firstChild.remove();
    setTimeout(() => el.remove(), 1600);
  }
  UI.scoreEvent = function (ev, data) {
    if (ev === 'bank') {
      if (data.auto) { feed('MAX BANK +' + U.fmt(data.value), 'bank'); centerMsg('MAX BANK +' + U.fmt(data.value), 1.2, 'bank max'); A.bank(5); KN.Haptics.tap('MEDIUM'); }
      else { feed('+' + U.fmt(data.value), 'bank'); centerMsg('BANKED +' + U.fmt(data.value), 1.1, 'bank'); A.bank(data.mult); KN.Haptics.tap(); }
      tutAdvance('bank');
      if (UI.tut && TUT.steps[UI.tut.i].key === 'x3' && data.mult >= 3) tutAdvance('x3');
      if (UI.tut && TUT.steps[UI.tut.i].key === 'banks' && KN.Game.score.run.banks - UI.tut.banks0 >= 2) tutAdvance('banks');
    } else if (ev === 'scrape') {
      feed(data.from > data.to ? `SCRAPE  x${data.from} → x${data.to}` : 'SCRAPE', 'scrape');
      const r = $('d-mult'); r.classList.remove('pop'); void r.offsetWidth; r.classList.add('pop');
    } else if (ev === 'lose') {
      feed(`${data.reason} −${U.fmt(data.value)}`, 'lose'); centerMsg(data.reason, 1.1, 'lose'); A.lose(); KN.Haptics.tap('HEAVY');
    } else if (ev === 'bonus') {
      feed(`${data.name} +${U.fmt(data.pts)}`, 'bonus'); A.bonus();
      if (data.kind === 'manji') tutAdvance('manji');
    } else if (ev === 'mult') {
      const r = $('d-mult'); r.classList.remove('pop'); void r.offsetWidth; r.classList.add('pop'); A.step();
    } else if (ev === 'start') tutAdvance('start');
  };
  UI.hud = function (dt) {
    const G = KN.Game, d = G.drive, ph = G.player.phys, sc = G.score;
    if (d.mode === 'battle' && d.countdown > 0) {
      const n = Math.ceil(d.countdown - 0.4);
      if (n !== UI._cd && n > 0) { UI._cd = n; centerMsg(String(n), 0.9); A.tone(440, 0.2, 'square', 0.1); }
    }
    $('h-total').textContent = U.fmt(sc.total);
    $('h-speed').textContent = Math.round(ph.speed * 3.6);
    $('h-gear').textContent = ph.u < -0.5 ? 'R' : ph.gear;
    const dr = $('drift');
    dr.classList.toggle('on', sc.active);
    if (sc.active) {
      $('d-pts').textContent = U.fmt(sc.value);
      $('d-mult').textContent = 'x' + sc.mult;
      $('d-ring').style.strokeDashoffset = String(119.4 * (1 - sc.stepProgress));
      $('d-tag').textContent = sc.drifting ? Math.round(Math.abs(ph.beta) * 57.3) + '°' + (sc.mult >= 5 ? ' · MAX' : sc.links ? ` · LINK ${sc.links}` : '') : 'BANKING…';
      dr.classList.toggle('tandem', sc.tandem);
      dr.classList.toggle('max', sc.mult >= 5);
    }
    if (d.mode === 'battle') {
      const tgt = d.def.target;
      $('hb-fill').style.width = Math.min(100, sc.total / tgt * 100) + '%';
      $('hb-fill').classList.toggle('win', sc.total >= tgt);
      $('hb-time').textContent = fmtT(d.timeLimit - d.t);
      $('hb-lap').textContent = Math.min(100, Math.round(d.progress / G.world.course.n * 100)) + '% of the lap';
      $('tandem').classList.toggle('hidden', !sc.tandem);
    }
    const ns = d.countdown <= 0 && !!d.noScore && (d.mode === 'battle' || sc.drifting);
    $('offc').classList.toggle('hidden', !ns);
    if (ns && $('offc').textContent !== d.noScore) $('offc').textContent = d.noScore;
    if (UI.tut) {
      UI.tut.t += dt;
      const step = TUT.steps[UI.tut.i];
      if (step.key === 'x3' && sc.active && sc.mult >= 3) tutAdvance('x3');
      if (step.skip && UI.tut.t > step.skip) tutAdvance(step.key);
    }
    drawMinimap();
  };
  function drawMinimap() {
    const G = KN.Game, w = G.world, ph = G.player.phys, cv = $('minimap'), c = cv.getContext('2d');
    const W = cv.width, H = cv.height, mm = w.minimap, k = 1.6;   // canvas px per map px (map px = 2 m)
    c.clearRect(0, 0, W, H);
    c.save();
    c.beginPath(); c.arc(W / 2, H / 2, W / 2 - 2, 0, Math.PI * 2); c.clip();
    c.fillStyle = 'rgba(8,10,18,0.85)'; c.fillRect(0, 0, W, H);
    c.translate(W / 2, H / 2); c.rotate(ph.yaw - Math.PI); c.scale(k, k);
    const px = (ph.x - w.x0) * mm.scale, pz = (ph.z - w.z0) * mm.scale;
    c.drawImage(mm.canvas, -px, -pz);
    if (G.drive.mode === 'battle') {
      const C = w.course;
      c.strokeStyle = G.drive.def.color; c.lineWidth = 1.6; c.globalAlpha = 0.9; c.beginPath();
      for (let i = 0; i < C.n; i += 3) { const p = C.pts[i], x = (p[0] - w.x0) * mm.scale - px, y = (p[1] - w.z0) * mm.scale - pz; i ? c.lineTo(x, y) : c.moveTo(x, y); }
      c.closePath(); c.stroke(); c.globalAlpha = 1;
      if (G.rival) { const R = G.rival.st; c.fillStyle = '#ff4d6d'; c.beginPath(); c.arc((R.x - w.x0) * mm.scale - px, (R.z - w.z0) * mm.scale - pz, 3, 0, Math.PI * 2); c.fill(); }
    }
    c.restore();
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(W / 2, H / 2 - 7); c.lineTo(W / 2 + 5, H / 2 + 5); c.lineTo(W / 2, H / 2 + 2); c.lineTo(W / 2 - 5, H / 2 + 5); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.25)'; c.lineWidth = 2; c.beginPath(); c.arc(W / 2, H / 2, W / 2 - 2, 0, Math.PI * 2); c.stroke();
  }

  // ---------------------------------------------------------------- pause
  UI.togglePause = function () {
    const G = KN.Game, d = G.drive; if (!d || d.finished) return;
    d.paused = !d.paused;
    if (d.paused) {
      KN.Audio.engine(0.2, 0, false); KN.Audio.skid(0);
      const ctl = S().settings.controls;
      $('pause-box').innerHTML = `<h2>Paused</h2><button class="btn-go" data-p="resume">RESUME</button><button class="btn-ghost" data-p="restart">Restart</button>
        <button class="btn-ghost" data-p="controls">Controls: ${{ thumb: 'One-thumb', tilt: 'Tilt', arcade: 'Arcade', pro: 'Pro' }[ctl]}</button>
        <button class="btn-ghost" data-p="end">${d.mode === 'tutorial' ? 'Skip tutorial' : d.mode === 'battle' ? 'Forfeit' : 'End run'}</button>`;
      $('scr-pause').classList.remove('hidden');
    } else $('scr-pause').classList.add('hidden');
  };
  function pauseClick(e) {
    const b = e.target.closest('[data-p]'); if (!b) return;
    A.click();
    const G = KN.Game, d = G.drive, p = b.dataset.p;
    if (p === 'resume') { UI.togglePause(); return; }
    if (p === 'controls') {
      const order = ['thumb', 'tilt', 'arcade', 'pro'], c = S().settings.controls, n = order[(order.indexOf(c) + 1) % 4];
      setControls(n);
      $('touch').className = 'm-' + n;
      $('hud').classList.remove('c-' + c); $('hud').classList.add('c-' + n);
      if (UI.tut && UI.tut.i === 0) setTut();
      d.paused = false; UI.togglePause(); return;
    }
    $('scr-pause').classList.add('hidden');
    if (p === 'restart') { G.startDrive(d.def.id, d.mode); return; }
    if (p === 'end') {
      if (d.mode === 'tutorial') { S().intro.done = true; KN.Save.save(); G.exitDrive(); UI.showHub(); return; }
      if (d.mode === 'battle') { G.exitDrive(); UI.showMap(); return; }
      d.paused = false; G.finishDrive('quit');
    }
  }

  // ---------------------------------------------------------------- results
  UI.showResults = function (r) {
    UI.lastRes = r;
    $('hud').classList.add('hidden'); $('touch').classList.add('hidden');
    const run = r.run;
    let title, sub = '';
    if (r.mode === 'battle') { title = r.win ? 'TAKEOVER!' : 'NOT TONIGHT'; sub = r.win ? `${r.def.crew} bow out. ${r.def.name} is yours.` : `${r.def.leader} holds ${r.def.name}. You needed ${U.fmt(r.target)}.`; }
    else if (r.mode === 'tutorial') { title = 'TUTORIAL DONE'; sub = 'You can slide. Now go take the city.'; }
    else { title = 'RUN OVER'; sub = r.total > 0 && r.total > r.prevBest ? 'New personal best here!' : r.prevBest ? 'Best run here: ' + U.fmt(r.prevBest) : 'Pause any time to end a free roam run.'; }
    const lines = [[`${U.fmt(r.total)} points${r.capped ? ' (run max)' : ''}`, r.credits]];
    if (r.reward) lines.push(['Takeover reward', r.reward]);
    if (r.tutorial) lines.push(['Tutorial bonus', r.tutorial]);
    for (const c of r.challenges) lines.push(['Challenge: ' + c.text, c.pay]);
    const sum = lines.reduce((a, l) => a + l[1], 0);
    const nextD = r.mode === 'battle' && r.win && r.def.index < 4 ? D.DISTRICTS[r.def.index + 1] : null;
    const unlockCar = r.mode === 'battle' && r.win ? D.CARS.find(c => c.needs === r.def.id) : null;
    $('res').innerHTML = `<div class="res-head ${r.mode === 'battle' ? (r.win ? 'win' : 'loss') : ''}" style="--c:${r.def.color}"><small>${esc(r.def.name.toUpperCase())}</small><h2>${title}</h2><p>${esc(sub)}</p></div>
      ${r.mode === 'battle' ? `<div class="res-vs"><div><span>You</span><b>${U.fmt(r.total)}</b></div><div><span>${esc(r.def.leader)}</span><b>${U.fmt(r.target)}</b></div></div>` : `<div class="res-vs single"><div><span>Score</span><b>${U.fmt(r.total)}</b></div></div>`}
      <div class="res-chips"><span>Best drift <b>${U.fmt(run.bestChain)}</b></span><span>Drifts <b>${run.drifts}</b></span><span>Near misses <b>${run.near}</b></span><span>Manji <b>${run.manji}</b></span><span>Links <b>${run.links}</b></span>${r.mode === 'battle' ? `<span>Tandem <b>${run.tandemRun.toFixed(1)}s</b></span>` : ''}${run.maxBanks ? `<span>Max banks <b>${run.maxBanks}</b></span>` : ''}<span>Scrapes <b>${run.scrapes}</b></span><span>Crashes <b>${run.crashes}</b></span></div>
      <div class="res-pay">${lines.map(l => `<div><span>${esc(l[0])}</span><b>+${cr(l[1])}</b></div>`).join('')}<div class="tot"><span>Total</span><b>+${cr(sum)}</b></div></div>
      ${nextD ? `<div class="res-unlock">Unlocked: <b>${esc(nextD.name)}</b>${unlockCar ? ` and the <b>${esc(unlockCar.name)}</b> in the garage` : ''}</div>` : unlockCar ? `<div class="res-unlock">Unlocked: the <b>${esc(unlockCar.name)}</b> in the garage</div>` : ''}
      <div class="res-btns">${KN.Ads.canReward() && sum > 0 ? `<button class="btn-ghost ad" data-r="ad">▶ AD: DOUBLE THE CREDITS</button>` : ''}
        ${r.mode !== 'tutorial' ? '<button class="btn-ghost" data-r="retry">Retry</button>' : ''}<button class="btn-go" data-r="done">CONTINUE</button></div>`;
    UI.show('scr-results');
    if (r.mode === 'battle' && r.win) A.win();
    UI._resSum = sum;
  };
  function resultsClick(e) {
    const b = e.target.closest('[data-r]'); if (!b) return;
    A.click();
    const r = UI.lastRes, G = KN.Game;
    if (b.dataset.r === 'ad') {
      KN.Ads.rewarded(() => { S().credits += UI._resSum; KN.Save.save(); UI.toast(`+${cr(UI._resSum)}`, 'good'); b.remove(); });
      return;
    }
    if (b.dataset.r === 'retry') { G.startDrive(r.def.id, r.mode); return; }
    G.exitDrive();
    if (r.mode === 'battle') UI.showMap(); else UI.showHub();
  }
})(window.KN);
