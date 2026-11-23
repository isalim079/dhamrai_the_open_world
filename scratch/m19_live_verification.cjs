/** Milestone 19 — CDP: soft arrest at high heat near Thana */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

async function waitForHttp(url, n = 60) {
  for (let i = 0; i < n; i++) {
    try { if ((await fetch(url)).ok) return true; } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

async function run() {
  console.log('=== M19 Soft Arrest CDP ===');
  const root = '/Volumes/Salim_EX/salim/Dhamrai_city_the_open_world';
  const guideDir = path.join(root, 'guideFiles');
  const vite = spawn(path.join(root, 'node_modules/.bin/vite'), ['--host', '127.0.0.1', '--port', '5177'], {
    cwd: path.join(root, 'apps/web'), stdio: 'ignore',
  });
  if (!(await waitForHttp('http://127.0.0.1:5177/'))) { try { vite.kill(); } catch {}; process.exit(1); }

  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new', '--remote-debugging-port=9233', '--window-size=1280,720',
    '--enable-webgl', '--ignore-gpu-blocklist', '--enable-gpu', '--use-gl=angle', '--use-angle=metal',
    '--autoplay-policy=no-user-gesture-required', '--disable-gpu-sandbox', 'http://127.0.0.1:5177',
  ], { stdio: 'ignore' });

  let wsUrl = null;
  for (let i = 0; i < 50; i++) {
    await new Promise((r) => setTimeout(r, 250));
    try {
      const t = await (await fetch('http://127.0.0.1:9233/json')).json();
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
  const shot = async (name) => {
    const r = await send('Page.captureScreenshot', { format: 'png' });
    if (r.result?.data) { fs.writeFileSync(path.join(guideDir, name), Buffer.from(r.result.data, 'base64')); console.log('📸', name); }
  };

  await send('Runtime.enable'); await send('Page.enable');
  await send('Page.navigate', { url: 'http://127.0.0.1:5177/' });
  await new Promise((r) => setTimeout(r, 1500));

  let ready = false;
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 500));
    ready = await evalJs(`!!(window.__dhamrai_engine && window.__dhamrai_useGameStore)`);
    if (ready) break;
  }
  if (!ready) { chrome.kill(); try { vite.kill(); } catch {}; process.exit(1); }

  const results = [];
  const arrest = await evalJs(`(() => {
    const eng = window.__dhamrai_useGameStore.getState().engine;
    if (!eng) return null;
    eng.applyPoliceHeatDelta(90);
    const res = eng.trySoftArrest(5, Date.now());
    window.__dhamrai_useGameStore.getState().syncFromEngine();
    return {
      ok: res.success,
      heat: eng.policeHeat,
      holding: eng.isSoftArrestHolding(),
      fine: res.arrest?.fineMinorUnits,
    };
  })()`);
  console.log(arrest);
  results.push({ id: 'AC-M19-arrest', pass: !!(arrest && arrest.ok && arrest.holding && arrest.heat === 25) });
  await shot('m19_shot_01_soft_arrest.png');

  let all = true;
  for (const r of results) { console.log(`${r.pass ? 'PASS' : 'FAIL'} ${r.id}`); if (!r.pass) all = false; }
  ws.close(); chrome.kill(); try { vite.kill(); } catch {}
  process.exit(all ? 0 : 1);
}
run().catch((e) => { console.error(e); process.exit(1); });
