/** Milestone 27–32 — CDP: plots inspect/buy/build/rent + garage discount */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

async function waitForHttp(url, n = 60) {
  for (let i = 0; i < n; i++) {
    try { if ((await fetch(url)).ok) return true; } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

async function run() {
  console.log('=== M27–M32 Property CDP ===');
  const root = '/Volumes/Salim_EX/salim/Dhamrai_city_the_open_world';
  const vite = spawn(path.join(root, 'node_modules/.bin/vite'), ['--host', '127.0.0.1', '--port', '5182'], {
    cwd: path.join(root, 'apps/web'), stdio: 'ignore',
  });
  if (!(await waitForHttp('http://127.0.0.1:5182/'))) { try { vite.kill(); } catch {}; process.exit(1); }
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new', '--remote-debugging-port=9238', '--window-size=1280,720',
    '--enable-webgl', '--ignore-gpu-blocklist', '--enable-gpu', '--use-gl=angle', '--use-angle=metal',
    '--autoplay-policy=no-user-gesture-required', '--disable-gpu-sandbox', 'http://127.0.0.1:5182',
  ], { stdio: 'ignore' });
  let wsUrl = null;
  for (let i = 0; i < 50; i++) {
    await new Promise((r) => setTimeout(r, 250));
    try {
      const t = await (await fetch('http://127.0.0.1:9238/json')).json();
      const p = t.find((x) => x.type === 'page' && x.webSocketDebuggerUrl);
      if (p) { wsUrl = p.webSocketDebuggerUrl; break; }
    } catch {}
  }
  if (!wsUrl) { chrome.kill(); try { vite.kill(); } catch {}; process.exit(1); }
  const ws = new WebSocket(wsUrl);
  let id = 1; const cb = new Map();
  ws.onmessage = (e) => { const d = JSON.parse(e.data); if (d.id && cb.has(d.id)) { cb.get(d.id)(d); cb.delete(d.id); } };
  await new Promise((r) => (ws.onopen = r));
  const send = (m, p = {}) => new Promise((res) => { const i = id++; cb.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
  const evalJs = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.result?.value ?? null;
  await send('Runtime.enable'); await send('Page.enable');
  await send('Page.navigate', { url: 'http://127.0.0.1:5182/' });
  await new Promise((r) => setTimeout(r, 1500));
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 500));
    if (await evalJs(`!!(window.__dhamrai_useGameStore && window.__dhamrai_useGameStore.getState().engine && window.__dhamrai_engine.plotMarkers)`)) break;
  }

  const st = await evalJs(`(() => {
    const eng = window.__dhamrai_useGameStore.getState().engine;
    eng.economy.credit(80000, 'REPUTATION_BONUS', 'cdp topup', Date.now(), 'tx_cdp_prop_top');
    const plotId = 'plot_rathkhola_corner';
    eng.inspectPlot(plotId);
    const buy = eng.purchasePlot(plotId, Date.now());
    const buy2 = eng.purchasePlot(plotId, Date.now() + 1);
    const build = eng.placeBuilding(plotId, 'tea_kiosk', Date.now() + 2);
    const rent = eng.claimRentalIncome(plotId, Date.now() + 3);
    eng.purchasePlot('plot_mistri_yard', Date.now() + 4);
    eng.placeBuilding('plot_mistri_yard', 'repair_garage', Date.now() + 5);
    window.__dhamrai_useGameStore.getState().syncFromEngine();
    return {
      catalog: eng.plotCatalog.length,
      buy: buy.success,
      buyDup: buy2.reason,
      build: build.success,
      rent: rent.success && rent.incomeMinorUnits === 800,
      garage: eng.hasRepairGarage(),
      markers: !!window.__dhamrai_engine.plotMarkers,
      owned: eng.getOwnedPlotIds().length,
    };
  })()`);
  console.log(st);
  const results = [
    { id: 'AC-M27-catalog', pass: !!(st && st.catalog >= 4 && st.markers) },
    { id: 'AC-M28-buy', pass: !!(st && st.buy && st.buyDup === 'ALREADY_OWNED') },
    { id: 'AC-M29-build', pass: !!(st && st.build) },
    { id: 'AC-M30-rent', pass: !!(st && st.rent) },
    { id: 'AC-M31-garage', pass: !!(st && st.garage) },
    { id: 'AC-M32-owned', pass: !!(st && st.owned >= 2) },
  ];
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  if (shot.result?.data) {
    fs.writeFileSync(path.join(root, 'guideFiles', 'm27_m32_shot_01_property.png'), Buffer.from(shot.result.data, 'base64'));
    console.log('📸 m27_m32_shot_01_property.png');
  }
  let all = true;
  for (const r of results) { console.log(`${r.pass ? 'PASS' : 'FAIL'} ${r.id}`); if (!r.pass) all = false; }
  ws.close(); chrome.kill(); try { vite.kill(); } catch {}
  process.exit(all ? 0 : 1);
}
run().catch((e) => { console.error(e); process.exit(1); });
