/** Milestone 16 — CDP: NPC day/night schedules */
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
  console.log('=== M16 NPC Schedules CDP ===');
  const root = '/Volumes/Salim_EX/salim/Dhamrai_city_the_open_world';
  const guideDir = path.join(root, 'guideFiles');
  const vite = spawn(path.join(root, 'node_modules/.bin/vite'), ['--host', '127.0.0.1', '--port', '5175'], {
    cwd: path.join(root, 'apps/web'), stdio: 'ignore',
  });
  if (!(await waitForHttp('http://127.0.0.1:5175/'))) { try { vite.kill(); } catch {}; process.exit(1); }

  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new', '--remote-debugging-port=9230', '--window-size=1280,720',
    '--enable-webgl', '--ignore-gpu-blocklist', '--enable-gpu', '--use-gl=angle', '--use-angle=metal',
    '--autoplay-policy=no-user-gesture-required', '--disable-gpu-sandbox', 'http://127.0.0.1:5175',
  ], { stdio: 'ignore' });

  let wsUrl = null;
  for (let i = 0; i < 50; i++) {
    await new Promise((r) => setTimeout(r, 250));
    try {
      const t = await (await fetch('http://127.0.0.1:9230/json')).json();
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
  await send('Page.navigate', { url: 'http://127.0.0.1:5175/' });
  await new Promise((r) => setTimeout(r, 1500));

  let ready = false;
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 500));
    ready = await evalJs(`!!(window.__dhamrai_engine && window.__dhamrai_engine.npcManager)`);
    if (ready) break;
  }
  if (!ready) { chrome.kill(); try { vite.kill(); } catch {}; process.exit(1); }

  await evalJs(`(async () => {
    const eng = window.__dhamrai_engine;
    if (eng.audioManager?.ctx) { eng.audioManager.ctx.resume(); eng.audioManager.isUnlocked = true; }
    eng.dayNightCycle.setPaused(true);
    eng.character.resetTransform({ x: 0, y: 0.5, z: 0 }, 0);
    await eng.chunkStreamer.updatePlayerPosition({ x: 0, y: 0.5, z: 0 });
    return true;
  })()`);
  await new Promise((r) => setTimeout(r, 1200));

  const results = [];
  let st = await evalJs(`(() => {
    const eng = window.__dhamrai_engine;
    eng.dayNightCycle.setTimeOfDay(0.5);
    eng.atmosphereController.applyNow(0);
    eng.npcManager.applyDayPhase('day');
    const vendor = eng.npcManager.npcs.get('npc_tea_vendor');
    const mistri = eng.npcManager.npcs.get('npc_mistri_gautom');
    return { vendorVis: vendor?.mesh.visible, mistriVis: mistri?.mesh.visible, phase: eng.npcManager.dayPhase };
  })()`);
  console.log('day', st);
  results.push({ id: 'AC-M16-day-vendors', pass: !!(st && st.vendorVis && st.mistriVis) });
  await shot('m16_shot_01_day_vendors.png');

  st = await evalJs(`(() => {
    const eng = window.__dhamrai_engine;
    eng.dayNightCycle.setTimeOfDay(0.0);
    eng.atmosphereController.applyNow(0);
    eng.npcManager.applyDayPhase('night');
    const vendor = eng.npcManager.npcs.get('npc_tea_vendor');
    const mistri = eng.npcManager.npcs.get('npc_mistri_gautom');
    const police = eng.npcManager.npcs.get('npc_police_rafiq');
    const teaOpen = eng.economyInteractables.findNearest({ x: 3.2, y: 0, z: -2.4 }, 2.5, 'night');
    return {
      vendorVis: vendor?.mesh.visible,
      mistriVis: mistri?.mesh.visible,
      policeVis: police?.mesh.visible,
      teaClosed: teaOpen === null,
      phase: eng.npcManager.dayPhase,
    };
  })()`);
  console.log('night', st);
  results.push({ id: 'AC-M16-night-hide', pass: !!(st && st.vendorVis === false && st.mistriVis === false && st.policeVis === true && st.teaClosed) });
  await shot('m16_shot_02_night_closed.png');

  await new Promise((r) => setTimeout(r, 1500));
  const perf = await evalJs(`(async () => {
    const samples = [];
    for (let i = 0; i < 6; i++) {
      await new Promise(r => setTimeout(r, 250));
      samples.push(window.__dhamrai_useSessionStore.getState().performance.fps);
    }
    const avgFps = samples.reduce((a,b)=>a+b,0)/samples.length;
    const draws = window.__dhamrai_engine.rendererManager.getMetrics().drawCalls;
    return { avgFps, draws, samples };
  })()`);
  console.log('perf', perf);
  results.push({ id: 'AC-M16-fps', pass: !!(perf && (perf.avgFps >= 55 || perf.draws <= 180)) });
  await shot('m16_shot_03_performance.png');

  let all = true;
  for (const r of results) { console.log(`${r.pass ? 'PASS' : 'FAIL'} ${r.id}`); if (!r.pass) all = false; }
  ws.close(); chrome.kill(); try { vite.kill(); } catch {}
  process.exit(all ? 0 : 1);
}
run().catch((e) => { console.error(e); process.exit(1); });
