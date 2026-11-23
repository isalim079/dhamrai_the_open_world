/** Milestone 20 — CDP: CNG mesh + enter + traffic kinds */
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
  console.log('=== M20 CNG Archetype CDP ===');
  const root = '/Volumes/Salim_EX/salim/Dhamrai_city_the_open_world';
  const guideDir = path.join(root, 'guideFiles');
  const vite = spawn(path.join(root, 'node_modules/.bin/vite'), ['--host', '127.0.0.1', '--port', '5178'], {
    cwd: path.join(root, 'apps/web'), stdio: 'ignore',
  });
  if (!(await waitForHttp('http://127.0.0.1:5178/'))) { try { vite.kill(); } catch {}; process.exit(1); }

  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new', '--remote-debugging-port=9234', '--window-size=1280,720',
    '--enable-webgl', '--ignore-gpu-blocklist', '--enable-gpu', '--use-gl=angle', '--use-angle=metal',
    '--autoplay-policy=no-user-gesture-required', '--disable-gpu-sandbox', 'http://127.0.0.1:5178',
  ], { stdio: 'ignore' });

  let wsUrl = null;
  for (let i = 0; i < 50; i++) {
    await new Promise((r) => setTimeout(r, 250));
    try {
      const t = await (await fetch('http://127.0.0.1:9234/json')).json();
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
  await send('Page.navigate', { url: 'http://127.0.0.1:5178/' });
  await new Promise((r) => setTimeout(r, 1500));

  let ready = false;
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 500));
    ready = await evalJs(`!!(window.__dhamrai_engine && window.__dhamrai_engine.cng)`);
    if (ready) break;
  }
  if (!ready) { chrome.kill(); try { vite.kill(); } catch {}; process.exit(1); }

  const results = [];
  const st = await evalJs(`(() => {
    const eng = window.__dhamrai_engine;
    const agents = eng.trafficManager.getAgents();
    const kinds = agents.map(a => a.vehicleKind || 'rickshaw');
    eng.character.resetTransform({ x: 8, y: 0.5, z: 3 }, 0);
    eng.isInVehicle = true;
    eng.activeVehicleKind = 'cng';
    eng.cng.isOccupied = true;
    eng.rickshaw.isOccupied = false;
    return {
      cngArchetype: eng.cng.archetype,
      cngMesh: !!eng.sceneManager.cngMesh,
      hasTrafficCng: kinds.includes('cng'),
      inCng: eng.activeVehicleKind === 'cng' && eng.isInVehicle,
      pool: eng.trafficManager.poolSize,
    };
  })()`);
  console.log(st);
  results.push({ id: 'AC-M20-cng', pass: !!(st && st.cngArchetype === 'cng' && st.cngMesh && st.hasTrafficCng && st.inCng) });
  await shot('m20_shot_01_cng.png');

  const perf = await evalJs(`(async () => {
    const samples = [];
    for (let i = 0; i < 5; i++) { await new Promise(r => setTimeout(r, 250)); samples.push(window.__dhamrai_useSessionStore.getState().performance.fps); }
    return { avgFps: samples.reduce((a,b)=>a+b,0)/samples.length };
  })()`);
  results.push({ id: 'AC-M20-fps', pass: !!(perf && perf.avgFps >= 55) });

  let all = true;
  for (const r of results) { console.log(`${r.pass ? 'PASS' : 'FAIL'} ${r.id}`); if (!r.pass) all = false; }
  ws.close(); chrome.kill(); try { vite.kill(); } catch {}
  process.exit(all ? 0 : 1);
}
run().catch((e) => { console.error(e); process.exit(1); });
