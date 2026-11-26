/* NO ANTICHEAT: the boot screen is a cheat loader. It logs in, lists "products", prints a
   console log tied to the real loading steps, then waits for you to press INJECT. That tap is
   also what lets iOS play sound, so the logo slam and sting happen right after it. */
(function (NA) {
  'use strict';
  const $ = id => document.getElementById(id);
  const IN = {};
  const fast = /[?&]fast=1/.test(location.search);
  let queue = [], shown = 0, total = 1, ready = false, injected = false, onDone = null, stopRain = null, pumping = false;

  function hwid() {
    const h = () => Math.floor(Math.random() * 65536).toString(16).toUpperCase().padStart(4, '0');
    return `${h()}-${h()}-B0T5-${h()}`;
  }
  // a faint hex "rain" behind the window
  function rain() {
    const c = $('ldr-rain'), g = c.getContext('2d'), size = 14;
    let w, h, drops, alive = true, last = 0;
    const rs = () => { w = c.width = innerWidth; h = c.height = innerHeight; drops = Array.from({ length: Math.ceil(w / size) }, () => Math.random() * -40); };
    rs();
    addEventListener('resize', rs);
    const tick = t => {
      if (!alive) return;
      requestAnimationFrame(tick);
      if (t - last < 55) return;
      last = t;
      g.fillStyle = 'rgba(4,6,11,0.2)'; g.fillRect(0, 0, w, h);
      g.font = '12px ui-monospace, Menlo, monospace';
      for (let i = 0; i < drops.length; i++) {
        const y = drops[i] * size;
        g.fillStyle = Math.random() < 0.05 ? '#e0f2fe' : i % 7 === 0 ? 'rgba(244,63,94,0.55)' : 'rgba(56,189,248,0.6)';
        g.fillText('0123456789ABCDEF'[(Math.random() * 16) | 0], i * size, y);
        if (y > h && Math.random() > 0.97) drops[i] = 0;
        drops[i] += 0.55 + (i % 3) * 0.2;
      }
    };
    requestAnimationFrame(tick);
    return () => { alive = false; removeEventListener('resize', rs); };
  }
  // type text into a field one character at a time
  function type(el, text, ms, done) {
    let i = 0;
    el.classList.add('caret');
    const t = setInterval(() => {
      el.textContent = text.slice(0, ++i);
      if (i >= text.length) { clearInterval(t); el.classList.remove('caret'); done && done(); }
    }, ms);
  }

  IN.start = function () {
    stopRain = fast ? null : rain();
    $('ldr-hwid').textContent = hwid();
    const user = (NA.Save.data && NA.Save.data.username) || 'guest';
    if (fast) { $('ldr-login').classList.add('out'); $('ldr-main').classList.add('on'); return; }
    // fake login: type the username and key, press LOGIN, then switch to the product screen
    setTimeout(() => type($('ldr-user'), user, 55, () => type($('ldr-key'), 'SKIL-L1SS-UE69-XXXX', 28, () => {
      const b = $('ldr-loginbtn');
      b.classList.add('press');
      setTimeout(() => { b.classList.remove('press'); b.classList.add('busy'); b.textContent = 'AUTHENTICATING'; }, 120);
      setTimeout(() => { $('ldr-login').classList.add('out'); $('ldr-main').classList.add('on'); pump(); }, 700);
    })), 350);
  };
  // queue log lines; kind: ok | info | warn | done
  IN.log = function (kind, text) {
    queue.push([kind, text]);
    total = Math.max(total, shown + queue.length);
    if ($('ldr-main').classList.contains('on')) pump();
  };
  IN.expect = n => { total = n; };
  function pump() {
    if (pumping) return;
    pumping = true;
    const step = () => {
      if (!queue.length) { pumping = false; checkReady(); return; }
      const [kind, text] = queue.shift();
      const d = document.createElement('div');
      d.className = kind;
      d.innerHTML = `<i>${kind === 'warn' ? '[!]' : kind === 'info' ? '[~]' : kind === 'done' ? '[✓]' : '[+]'}</i>${text}`;
      const log = $('ldr-log');
      log.appendChild(d);
      while (log.children.length > 14) log.removeChild(log.firstChild);
      shown++;
      const p = Math.min(100, Math.round(shown / total * 100));
      $('ldr-bar').style.width = p + '%';
      $('ldr-pct').textContent = p + '%';
      setTimeout(step, fast ? 0 : 120 + Math.random() * 90);
    };
    step();
  }
  // the boot finished: arm the INJECT button
  IN.ready = function (cb) {
    onDone = cb;
    ready = true;
    checkReady();
  };
  function checkReady() {
    if (!ready || queue.length || pumping || injected) return;
    if (fast) { finish(false); return; }
    const b = $('ldr-inject');
    b.disabled = false;
    b.classList.add('ready');
    b.querySelector('span').textContent = 'INJECT';
    $('ldr-state').textContent = 'ready to inject';
    b.onclick = inject;
  }
  function inject() {
    if (injected) return;
    injected = true;
    const A = NA.Audio, b = $('ldr-inject');
    A.unlock();
    A.inject && A.inject();
    NA.haptic && NA.haptic('MEDIUM');
    b.classList.remove('ready'); b.classList.add('injecting');
    b.querySelector('span').textContent = 'INJECTING';
    $('ldr-state').textContent = 'injecting';
    [['ok', 'writing to memory'], ['ok', 'hooking DirectX'], ['info', 'disabling anticheat… there isn\'t one'], ['done', 'injected · gl hf']].forEach((l, i) => setTimeout(() => {
      const d = document.createElement('div');
      d.className = l[0];
      d.innerHTML = `<i>${l[0] === 'info' ? '[~]' : l[0] === 'done' ? '[✓]' : '[+]'}</i>${l[1]}`;
      $('ldr-log').appendChild(d);
    }, i * 170));
    let p = 0;
    const fill = setInterval(() => { p = Math.min(100, p + 7); b.style.setProperty('--p', p + '%'); if (p >= 100) clearInterval(fill); }, 50);
    setTimeout(() => $('intro').classList.add('glitch'), 760);
    setTimeout(() => {
      const intro = $('intro');
      intro.classList.add('go');
      setTimeout(() => A.intro(), 780);
    }, 1000);
    setTimeout(() => finish(true), 1000 + 2050);
  }
  function finish(injectedNow) {
    const intro = $('intro');
    if (stopRain) stopRain();
    intro.classList.add('out');
    if (onDone) onDone(injectedNow);
    setTimeout(() => intro.remove(), 500);
  }

  NA.Intro = IN;
})(window.NA);
