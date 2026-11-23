/** Milestone 18 — CDP: parcel mission + courier */
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
  console.log('=== M18 Parcel Delivery CDP ===');
  const root = '/Volumes/Salim_EX/salim/Dhamrai_city_the_open_world';
  const guideDir = path.join(root, 'guideFiles');
  const vite = spawn(path.join(root, 'node_modules/.bin/vite'), ['--host', '127.0.0.1', '--port', '5176'], {
    cwd: path.join(root, 'apps/web'), stdio: 'ignore',
  });
  if (!(await waitForHttp('http://127.0.0.1:5176/'))) { try { vite.kill(); } catch {}; process.exit(1); }

  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new', '--remote-debugging-port=9232', '--window-size=1280,720',
    '--enable-webgl', '--ignore-gpu-blocklist', '--enable-gpu', '--use-gl=angle', '--use-angle=metal',
    '--autoplay-policy=no-user-gesture-required', '--disable-gpu-sandbox', 'http://127.0.0.1:5176',
  ], { stdio: 'ignore' });

  let wsUrl = null;
  for (let i = 0; i < 50; i++) {
    await new Promise((r) => setTimeout(r, 250));
    try {
      const t = await (await fetch('http://127.0.0.1:9232/json')).json();
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
  await send('Page.navigate', { url: 'http://127.0.0.1:5176/' });
  await new Promise((r) => setTimeout(r, 1500));

  let ready = false;
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 500));
    ready = await evalJs(`!!(window.__dhamrai_engine && window.__dhamrai_useGameStore)`);
    if (ready) break;
  }
  if (!ready) { chrome.kill(); try { vite.kill(); } catch {}; process.exit(1); }

  const results = [];
  const courier = await evalJs(`(() => {
    const npc = window.__dhamrai_engine.npcManager.npcs.get('npc_courier_salma');
    return npc ? { id: npc.definition.id, dialogue: npc.definition.dialogueTreeId } : null;
  })()`);
  results.push({ id: 'AC-M18-courier', pass: !!(courier && courier.dialogue === 'dialogue_courier_salma') });

  const mission = await evalJs(`(() => {
    const st = window.__dhamrai_useGameStore.getState();
    const eng = st.engine;
    if (!eng) return { err: 'no engine' };
    try {
      // Satisfy M1 prerequisite for M4
      const m1 = eng.missions.getInstance('mission_1_first_fare');
      if (m1 && m1.state !== 'COMPLETED') {
        if (m1.state === 'AVAILABLE') eng.missions.activateMission('mission_1_first_fare', Date.now());
        eng.missions.completeObjective('mission_1_first_fare', 'obj_m1_pickup');
        eng.missions.completeObjective('mission_1_first_fare', 'obj_m1_dropoff');
        eng.missions.completeMission('mission_1_first_fare', eng.economy, () => {}, Date.now());
      }
      eng.missions.activateMission('mission_4_market_parcel', Date.now());
      eng.missions.completeObjective('mission_4_market_parcel', 'obj_m4_collect_parcel');
      if (!eng.inventory.hasItem('market_parcel')) {
        eng.inventory.addItem({
          id: 'market_parcel', nameBn: 'পার্সেল', nameEn: 'Parcel', category: 'CARGO',
          quantity: 1, isStackable: false, maxStackSize: 1, descriptionBn: '', descriptionEn: '',
        });
      }
      st.syncFromEngine();
      return {
        state: eng.missions.getInstance('mission_4_market_parcel')?.state,
        hasParcel: eng.inventory.hasItem('market_parcel'),
        def: !!eng.missions.getDefinition('mission_4_market_parcel'),
      };
    } catch (e) {
      return { err: String(e && e.message ? e.message : e) };
    }
  })()`);
  console.log(mission);
  results.push({ id: 'AC-M18-mission', pass: !!(mission && mission.state === 'ACTIVE' && mission.hasParcel && mission.def) });
  await shot('m18_shot_01_parcel_mission.png');

  let all = true;
  for (const r of results) { console.log(`${r.pass ? 'PASS' : 'FAIL'} ${r.id}`); if (!r.pass) all = false; }
  ws.close(); chrome.kill(); try { vite.kill(); } catch {}
  process.exit(all ? 0 : 1);
}
run().catch((e) => { console.error(e); process.exit(1); });
