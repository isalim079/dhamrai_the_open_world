/** Milestone 22 — CDP: easy bike archetype */
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
  console.log('=== M22 Easy Bike CDP ===');
  const root = '/Volumes/Salim_EX/salim/Dhamrai_city_the_open_world';
  const vite = spawn(path.join(root, 'node_modules/.bin/vite'), ['--host', '127.0.0.1', '--port', '5180'], {
    cwd: path.join(root, 'apps/web'), stdio: 'ignore',
  });
  if (!(await waitForHttp('http://127.0.0.1:5180/'))) { try { vite.kill(); } catch {}; process.exit(1); }
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new', '--remote-debugging-port=9236', '--window-size=1280,720',
    '--enable-webgl', '--ignore-gpu-blocklist', '--enable-gpu', '--use-gl=angle', '--use-angle=metal',
    '--autoplay-policy=no-user-gesture-required', '--disable-gpu-sandbox', 'http://127.0.0.1:5180',
  ], { stdio: 'ignore' });
  let wsUrl = null;
  for (let i = 0; i < 50; i++) {
    await new Promise((r) => setTimeout(r, 250));
    try {
      const t = await (await fetch('http://127.0.0.1:9236/json')).json();
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
  await send('Page.navigate', { url: 'http://127.0.0.1:5180/' });
  await new Promise((r) => setTimeout(r, 1500));
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 500));
    if (await evalJs(`!!(window.__dhamrai_engine && window.__dhamrai_engine.easyBike)`)) break;
  }
  const st = await evalJs(`(() => {
    const eng = window.__dhamrai_engine;
    const kinds = eng.trafficManager.getAgents().map(a => a.vehicleKind || 'rickshaw');
    eng.activeVehicleKind = 'easy_bike';
    eng.isInVehicle = true;
    eng.easyBike.isOccupied = true;
    return {
      arch: eng.easyBike.archetype,
      mesh: !!eng.sceneManager.easyBikeMesh,
      trafficBike: kinds.includes('easy_bike'),
      speed: eng.easyBike.normalTargetSpeedMps,
    };
  })()`);
  console.log(st);
  const pass = !!(st && st.arch === 'easy_bike' && st.mesh && st.trafficBike && st.speed > 12/3.6);
  console.log(pass ? 'PASS AC-M22-bike' : 'FAIL AC-M22-bike');
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  if (shot.result?.data) fs.writeFileSync(path.join(root, 'guideFiles', 'm22_shot_01_easy_bike.png'), Buffer.from(shot.result.data, 'base64'));
  ws.close(); chrome.kill(); try { vite.kill(); } catch {}
  process.exit(pass ? 0 : 1);
}
run().catch((e) => { console.error(e); process.exit(1); });
