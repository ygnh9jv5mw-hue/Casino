// Renders the app icon (1024x1024) and launch splash (2732x2732).
const path = require('path');
const { chromium } = require('playwright');
const out = path.join(__dirname, '..', 'ios', 'App', 'App', 'Assets.xcassets');
const art = (s) => `<div style="width:${s}px;height:${s}px;display:flex;flex-direction:column;align-items:center;justify-content:center;
  background:radial-gradient(circle at 30% 20%,#1f7a4d,#0d3a24 60%,#07130d);font-family:Georgia,serif">
  <div style="font-size:${s * 0.56}px;line-height:.9;background:linear-gradient(180deg,#ffe08a,#d99a1e);-webkit-background-clip:text;color:transparent">♠</div>
  <div style="font:800 ${s * 0.13}px/1 -apple-system,Helvetica,Arial,sans-serif;color:#f2c14e;letter-spacing:${s * 0.01}px">21</div></div>`;
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ deviceScaleFactor: 1 });
  const shot = async (size, inner, file) => { await p.setViewportSize({ width: size, height: size });
    await p.setContent(`<html><body style="margin:0;background:#07130d;display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px">${inner}</body></html>`);
    await p.screenshot({ path: path.join(out, file) }); };
  await shot(1024, art(1024), 'AppIcon.appiconset/AppIcon-512@2x.png');
  for (const f of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png'])
    await shot(2732, `<div style="border-radius:120px;overflow:hidden">${art(560)}</div>`, 'Splash.imageset/' + f);
  await b.close();
})();
