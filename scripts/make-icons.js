// Renders the app icon (1024x1024) and launch splash (2732x2732): a white spade on the app's red.
const path = require('path');
const { chromium } = require('playwright');
const out = path.join(__dirname, '..', 'ios', 'App', 'App', 'Assets.xcassets');
const SPADE = 'M50 6C58 20 92 38 92 60C92 74 80 82 68 82C61 82 55 78 52 72C53 82 57 90 64 95L36 95C43 90 47 82 48 72C45 78 39 82 32 82C20 82 8 74 8 60C8 38 42 20 50 6Z';
const art = (s) => `<div style="width:${s}px;height:${s}px;display:grid;place-items:center;position:relative;overflow:hidden;
  background:radial-gradient(120% 120% at 25% 10%,#f6676c 0%,#dc3a42 40%,#a51e28 78%,#7d131c 100%)">
  <svg viewBox="0 0 100 100" width="${s * 0.5}" height="${s * 0.5}" style="margin-top:${s * 0.02}px;filter:drop-shadow(0 ${s * 0.02}px ${s * 0.03}px rgba(70,0,10,.35))"><path d="${SPADE}" fill="#fff"/></svg></div>`;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ deviceScaleFactor: 1 });
  const shot = async (size, inner, file, bg) => { await p.setViewportSize({ width: size, height: size });
    await p.setContent(`<html><body style="margin:0;background:${bg};display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px">${inner}</body></html>`);
    await p.screenshot({ path: path.join(out, file) }); };
  await shot(1024, art(1024), 'AppIcon.appiconset/AppIcon-512@2x.png', '#a51e28');
  for (const f of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png'])
    await shot(2732, `<div style="border-radius:126px;overflow:hidden;box-shadow:0 40px 120px rgba(229,72,77,.25)">${art(560)}</div>`, 'Splash.imageset/' + f, '#121212');
  await b.close();
})();
