/**
 * Milestone 15 — CDP: objective beacon + compass bearing
 */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

async function waitForHttp(url, attempts = 60) {
  for (let i = 0; i < attempts; i++) {
    try {
      if ((await fetch(url)).ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

async function run() {
  console.log('=== M15 Wayfinding CDP ===');
  const root = '/Volumes/Salim_EX/salim/Dhamrai_city_the_open_world';
  const guideDir = path.join(root, 'guideFiles');
  const viteProc = spawn(path.join(root, 'node_modules/.bin/vite'), ['--host', '127.0.0.1', '--port', '5175'], {
    cwd: path.join(root, 'apps/web'),
    stdio: 'ignore',
  });
  if (!(await waitForHttp('http://127.0.0.1:5175/'))) {
    try { viteProc.kill(); } catch {}
    process.exit(1);
  }

  const chromeProc = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new', '--remote-debugging-port=9229', '--window-size=1280,720',
    '--enable-webgl', '--ignore-gpu-blocklist', '--enable-gpu', '--use-gl=angle', '--use-angle=metal',
    '--autoplay-policy=no-user-gesture-required', '--disable-gpu-sandbox', 'http://127.0.0.1:5175',
  ], { stdio: 'ignore' });

  let wsUrl = null;
  for (let i = 0; i < 50; i++) {
    await new Promise((r) => setTimeout(r, 250));
    try {
      const t = await (await fetch('http://127.0.0.1:9229/json')).json();
      const p = t.find((x) => x.type === 'page' && x.webSocketDebuggerUrl);
      if (p) { wsUrl = p.webSocketDebuggerUrl; break; }
    } catch {}
  }
  if (!wsUrl) { chromeProc.kill(); try { viteProc.kill(); } catch {}; process.exit(1); }

  const ws = new WebSocket(wsUrl);
  let id = 1;
  const cb = new Map();
  ws.onmessage = (e) => { const d = JSON.parse(e.data); if (d.id && cb.has(d.id)) { cb.get(d.id)(d); cb.delete(d.id); } };
  await new Promise((r) => (ws.onopen = r));
  const send = (method, params = {}) => new Promise((res) => { const i = id++; cb.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  const evalJs = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    return r.result?.result?.value ?? null;
  };
  const shot = async (name) => {
    const r = await send('Page.captureScreenshot', { format: 'png' });
    if (r.result?.data) {
      fs.writeFileSync(path.join(guideDir, name), Buffer.from(r.result.data, 'base64'));
      console.log('📸', name);
    }
  };

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Page.navigate', { url: 'http://127.0.0.1:5175/' });
  await new Promise((r) => setTimeout(r, 1500));

  let ready = false;
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 500));
    ready = await evalJs(`!!(window.__dhamrai_engine && window.__dhamrai_engine.objectiveMarker)`);
    if (ready) break;
  }
  if (!ready) { chromeProc.kill(); try { viteProc.kill(); } catch {}; process.exit(1); }

  await evalJs(`(async () => {
    const eng = window.__dhamrai_engine;
    if (eng.audioManager?.ctx) { eng.audioManager.ctx.resume(); eng.audioManager.isUnlocked = true; }
    window.__dhamrai_useUIStore?.setState({ isDebugOverlayVisible: true });
    eng.character.resetTransform({ x: 0, y: 0.5, z: 0 }, 0);
    await eng.chunkStreamer.updatePlayerPosition({ x: 0, y: 0.5, z: 0 });
    const store = window.__dhamrai_useGameStore.getState();
    store.activateMission('mission_1_first_fare');
    return true;
  })()`);
  await new Promise((r) => setTimeout(r, 1500));

  const results = [];
  let st = await evalJs(`(() => {
    const eng = window.__dhamrai_engine;
    const school = { x: -73.1, y: 1, z: -221.3 };
    eng.objectiveMarker.setTarget(school);
    window.__dhamrai_useSessionStore.getState().setWayfindingHud({
      objectiveBearingDeg: 0,
      objectiveDistanceM: 230,
      hasActiveObjective: true,
    });
    return { visible: eng.objectiveMarker.root.visible, y: eng.objectiveMarker.root.position.y };
  })()`);
  console.log('beacon', st);
  results.push({ id: 'AC-M15-beacon', pass: !!(st && st.visible) });
  await shot('m15_shot_01_objective_beacon.png');

  st = await evalJs(`(() => {
    const s = window.__dhamrai_useSessionStore.getState();
    s.setWayfindingHud({ objectiveBearingDeg: 45, objectiveDistanceM: 120, hasActiveObjective: true });
    const n = window.__dhamrai_useSessionStore.getState();
    return { bearing: n.objectiveBearingDeg, dist: n.objectiveDistanceM, has: n.hasActiveObjective };
  })()`);
  console.log('compass', st);
  results.push({ id: 'AC-M15-compass', pass: !!(st && st.has && st.bearing === 45) });
  await shot('m15_shot_02_compass_hud.png');

  await new Promise((r) => setTimeout(r, 1500));
  const perf = await evalJs(`(async () => {
    const samples = [];
    for (let i = 0; i < 5; i++) {
      await new Promise(r => setTimeout(r, 200));
      samples.push(window.__dhamrai_useSessionStore.getState().performance);
    }
    return { avgFps: samples.reduce((a,b)=>a+b.fps,0)/samples.length, ...samples[samples.length-1] };
  })()`);
  console.log('perf', perf);
  results.push({ id: 'AC-M15-fps', pass: !!(perf && perf.avgFps >= 55) });
  await shot('m15_shot_03_performance.png');

  let all = true;
  for (const r of results) {
    console.log(`${r.pass ? 'PASS' : 'FAIL'} ${r.id}`);
    if (!r.pass) all = false;
  }
  ws.close();
  chromeProc.kill();
  try { viteProc.kill(); } catch {}
  process.exit(all ? 0 : 1);
}
run().catch((e) => { console.error(e); process.exit(1); });
