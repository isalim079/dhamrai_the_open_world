/**
 * Milestone 14 — Live Chrome CDP: police fine, heat, flee, save
 * Spawns Vite in-process.
 */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

async function waitForHttp(url, attempts = 60) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

async function runVerification() {
  console.log('================================================================');
  console.log(' Dhamrai Life Milestone 14: Police Fine & Wanted CDP ');
  console.log('================================================================');

  const root = '/Volumes/Salim_EX/salim/Dhamrai_city_the_open_world';
  const guideDir = path.join(root, 'guideFiles');

  const viteProc = spawn(
    path.join(root, 'node_modules/.bin/vite'),
    ['--host', '127.0.0.1', '--port', '5175'],
    { cwd: path.join(root, 'apps/web'), stdio: 'ignore', detached: false }
  );
  if (!(await waitForHttp('http://127.0.0.1:5175/'))) {
    console.error('Vite failed');
    try { viteProc.kill(); } catch {}
    process.exit(1);
  }
  console.log('Vite ready');

  const chromeProc = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new',
    '--remote-debugging-port=9228',
    '--window-size=1280,720',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--enable-gpu',
    '--use-gl=angle',
    '--use-angle=metal',
    '--autoplay-policy=no-user-gesture-required',
    '--disable-gpu-sandbox',
    'http://127.0.0.1:5175',
  ], { stdio: 'ignore' });

  let targetWsUrl = null;
  for (let i = 0; i < 50; i++) {
    await new Promise((r) => setTimeout(r, 250));
    try {
      const targets = await (await fetch('http://127.0.0.1:9228/json')).json();
      const page = targets.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
      if (page) {
        targetWsUrl = page.webSocketDebuggerUrl;
        break;
      }
    } catch {}
  }
  if (!targetWsUrl) {
    console.error('No CDP target');
    chromeProc.kill();
    try { viteProc.kill(); } catch {}
    process.exit(1);
  }

  const ws = new WebSocket(targetWsUrl);
  let idCounter = 1;
  const callbacks = new Map();
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && callbacks.has(data.id)) {
      callbacks.get(data.id)(data);
      callbacks.delete(data.id);
    }
  };
  await new Promise((r) => (ws.onopen = r));

  function sendCommand(method, params = {}) {
    return new Promise((resolve) => {
      const id = idCounter++;
      callbacks.set(id, resolve);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async function evalJs(expr) {
    const res = await sendCommand('Runtime.evaluate', {
      expression: expr,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.result?.exceptionDetails) {
      console.error('eval exception', JSON.stringify(res.result.exceptionDetails).slice(0, 400));
    }
    return res.result?.result?.value ?? null;
  }

  async function takeScreenshot(fileName) {
    const res = await sendCommand('Page.captureScreenshot', { format: 'png' });
    if (res.result?.data) {
      const buf = Buffer.from(res.result.data, 'base64');
      fs.writeFileSync(path.join(guideDir, fileName), buf);
      console.log(`📸 ${fileName}`);
    }
  }

  await sendCommand('Runtime.enable');
  await sendCommand('Page.enable');
  await sendCommand('Page.navigate', { url: 'http://127.0.0.1:5175/' });
  await new Promise((r) => setTimeout(r, 1500));

  let ready = false;
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 500));
    ready = await evalJs(
      `!!(window.__dhamrai_engine && window.__dhamrai_engine.civicBridge && window.__dhamrai_useGameStore.getState().engine)`
    );
    if (ready) break;
  }
  if (!ready) {
    console.error('Engine not ready');
    chromeProc.kill();
    try { viteProc.kill(); } catch {}
    process.exit(1);
  }

  await evalJs(`(async () => {
    const eng = window.__dhamrai_engine;
    if (eng.audioManager?.ctx) { eng.audioManager.ctx.resume(); eng.audioManager.isUnlocked = true; }
    if (window.__dhamrai_useUIStore) window.__dhamrai_useUIStore.setState({ isDebugOverlayVisible: true });
    if (eng.dayNightCycle) { eng.dayNightCycle.setPaused(true); eng.dayNightCycle.setTimeOfDay(0.45); }
    if (eng.weatherSystem) eng.weatherSystem.setWeather('clear');
    const t = { x: -61, y: 0.5, z: 66.5 };
    eng.character.resetTransform(t, 0);
    await eng.chunkStreamer.updatePlayerPosition(t);
    return true;
  })()`);

  for (let i = 0; i < 25; i++) {
    await new Promise((r) => setTimeout(r, 400));
    const loaded = await evalJs(`window.__dhamrai_useSessionStore.getState().loadedChunkCount`);
    if (loaded >= 4) break;
  }
  await new Promise((r) => setTimeout(r, 600));

  const results = [];

  // 1 Baseline heat HUD
  let st = await evalJs(`(() => {
    const core = window.__dhamrai_useGameStore.getState().engine;
    window.__dhamrai_useSessionStore.getState().setCivicHud({
      policeHeat: core.policeHeat,
      activeFineMinorUnits: 0,
      policeStopActive: false,
    });
    return { heat: core.policeHeat, schema: core.toSaveEnvelope().saveSchemaVersion };
  })()`);
  console.log('baseline', st);
  results.push({ id: 'AC-M14-hud-baseline', pass: !!(st && st.heat === 0 && st.schema === 2) });
  await takeScreenshot('m14_shot_01_heat_hud.png');

  // 2 Speeding stop
  st = await evalJs(`(() => {
    const eng = window.__dhamrai_engine;
    const core = window.__dhamrai_useGameStore.getState().engine;
    const thana = { x: -61, y: 0, z: 66.5 };
    eng.character.resetTransform({ x: thana.x, y: 0.5, z: thana.z }, 0);
    eng.isInVehicle = true;
    const civic = eng.civicBridge.tick(core, {
      playerPos: thana,
      speedKph: 18,
      inVehicle: true,
      dayPhase: 'day',
      nowMs: 250000,
    });
    window.__dhamrai_useUIStore.getState().openDialogue('dialogue_police_stop');
    window.__dhamrai_useSessionStore.getState().setCivicHud({
      policeHeat: core.policeHeat,
      activeFineMinorUnits: core.activePoliceStop?.currentFineMinorUnits ?? 0,
      policeStopActive: true,
    });
    window.__dhamrai_useSessionStore.getState().setStatusMessage(civic.messageBn + ' / ' + civic.messageEn);
    return {
      opened: civic.stopOpened,
      fine: civic.fineMinorUnits,
      heat: core.policeHeat,
      stopId: core.activePoliceStop?.id,
    };
  })()`);
  console.log('stop', st);
  results.push({ id: 'AC-M14-01-speeding', pass: !!(st && st.opened && st.fine >= 2500 && st.heat > 0) });
  await takeScreenshot('m14_shot_02_speeding_stop.png');
  await takeScreenshot('m14_shot_03_police_dialogue.png');

  // 3 Pay fine
  st = await evalJs(`(() => {
    const core = window.__dhamrai_useGameStore.getState().engine;
    const before = core.economy.balanceMinorUnits;
    const fine = core.activePoliceStop?.currentFineMinorUnits ?? 0;
    const pay = core.payFine(260000, 'cdp_fine_' + Date.now());
    if (pay.success) core.clearPoliceStop();
    window.__dhamrai_useGameStore.getState().syncFromEngine();
    window.__dhamrai_useSessionStore.getState().setCivicHud({
      policeHeat: core.policeHeat,
      activeFineMinorUnits: 0,
      policeStopActive: false,
    });
    window.__dhamrai_useUIStore.getState().closeDialogue();
    return {
      ok: pay.success,
      category: pay.transaction?.category,
      cashDelta: core.economy.balanceMinorUnits - before,
      fine,
      heat: core.policeHeat,
    };
  })()`);
  console.log('pay', st);
  results.push({
    id: 'AC-M14-02-pay',
    pass: !!(st && st.ok && st.category === 'FINE_PENALTY' && st.cashDelta === -st.fine),
  });
  await takeScreenshot('m14_shot_04_fine_paid.png');

  // 4 Insufficient funds
  st = await evalJs(`(() => {
    const eng = window.__dhamrai_engine;
    const core = window.__dhamrai_useGameStore.getState().engine;
    // Drain cash
    while (core.economy.balanceMinorUnits >= 5000) {
      core.processDailyVehicleRent(Date.now());
    }
    const bal = core.economy.balanceMinorUnits;
    if (bal > 0) core.economy.debit(bal, 'FINE_PENALTY', 'drain', Date.now(), 'cdp_drain_' + Date.now());
    const thana = { x: -61, y: 0, z: 66.5 };
    eng.civicBridge.tick(core, {
      playerPos: thana,
      speedKph: 18,
      inVehicle: true,
      dayPhase: 'day',
      nowMs: 400000,
    });
    const pay = core.payFine(400100, 'cdp_fail_' + Date.now());
    window.__dhamrai_useUIStore.getState().openDialogue('dialogue_police_stop');
    window.__dhamrai_useUIStore.getState().setDialogueNode('node_no_funds');
    return { reason: pay.reason, stop: !!core.activePoliceStop };
  })()`);
  console.log('insolvent', st);
  results.push({ id: 'AC-M14-03-insolvent', pass: !!(st && st.reason === 'INSUFFICIENT_FUNDS' && st.stop) });
  await takeScreenshot('m14_shot_05_insufficient_funds.png');
  await evalJs(`window.__dhamrai_useUIStore.getState().closeDialogue()`);

  // Credit some cash back for remaining tests
  await evalJs(`(() => {
    const core = window.__dhamrai_useGameStore.getState().engine;
    core.economy.credit(30000, 'REPUTATION_BONUS', 'cdp topup', Date.now(), 'cdp_topup');
    if (core.activePoliceStop) {
      core.payFine(Date.now(), 'cdp_clear_' + Date.now());
      core.clearPoliceStop();
    }
    return core.economy.balanceMinorUnits;
  })()`);

  // 5 Flee
  st = await evalJs(`(() => {
    const eng = window.__dhamrai_engine;
    const core = window.__dhamrai_useGameStore.getState().engine;
    const thana = { x: -61, y: 0, z: 66.5 };
    eng.civicBridge.tick(core, {
      playerPos: thana,
      speedKph: 18,
      inVehicle: true,
      dayPhase: 'day',
      nowMs: 600000,
    });
    const heatBefore = core.policeHeat;
    const fled = eng.civicBridge.tick(core, {
      playerPos: { x: thana.x + 25, y: 0, z: thana.z + 25 },
      speedKph: 12,
      inVehicle: true,
      dayPhase: 'day',
      nowMs: 600500,
    });
    window.__dhamrai_useSessionStore.getState().setCivicHud({
      policeHeat: core.policeHeat,
      activeFineMinorUnits: core.activePoliceStop?.currentFineMinorUnits ?? 0,
      policeStopActive: true,
    });
    window.__dhamrai_useSessionStore.getState().setStatusMessage(fled.messageBn);
    return { fled: fled.fled, heatUp: core.policeHeat > heatBefore, fleeing: core.activePoliceStop?.fleeing };
  })()`);
  console.log('flee', st);
  results.push({ id: 'AC-M14-04-flee', pass: !!(st && st.fled && st.heatUp && st.fleeing) });
  await takeScreenshot('m14_shot_06_flee_wanted.png');

  // Clear stop for night test
  await evalJs(`(() => {
    const core = window.__dhamrai_useGameStore.getState().engine;
    if (core.activePoliceStop) {
      core.payFine(Date.now(), 'cdp_pay2_' + Date.now());
      core.clearPoliceStop();
    }
    // Force high heat for HUD
    core.applyPoliceHeatDelta(50);
    window.__dhamrai_useSessionStore.getState().setCivicHud({
      policeHeat: core.policeHeat,
      activeFineMinorUnits: 0,
      policeStopActive: false,
    });
    return core.policeHeat;
  })()`);
  await takeScreenshot('m14_shot_07_high_heat.png');

  // 6 Night stop
  st = await evalJs(`(() => {
    const eng = window.__dhamrai_engine;
    const core = window.__dhamrai_useGameStore.getState().engine;
    eng.dayNightCycle.setTimeOfDay(0.0);
    const thana = { x: -61, y: 0, z: 66.5 };
    // Reset cooldown via flag far past
    core.setWorldFlag('lastPoliceStopMs', 0);
    const civic = eng.civicBridge.tick(core, {
      playerPos: thana,
      speedKph: 18,
      inVehicle: true,
      dayPhase: 'night',
      nowMs: 900000,
    });
    return {
      opened: civic.stopOpened,
      fine: civic.fineMinorUnits,
      phase: eng.dayNightCycle.phase,
      // night = 2500+1500 = 4000 base (license held)
      nightSurcharge: (civic.fineMinorUnits ?? 0) >= 4000,
    };
  })()`);
  console.log('night', st);
  results.push({ id: 'AC-M14-06-night', pass: !!(st && st.opened && st.nightSurcharge && st.phase === 'night') });
  await takeScreenshot('m14_shot_08_night_stop.png');

  // 7 Save roundtrip
  st = await evalJs(`(() => {
    const core = window.__dhamrai_useGameStore.getState().engine;
    if (core.activePoliceStop) {
      core.payFine(Date.now(), 'cdp_pay3_' + Date.now());
      core.clearPoliceStop();
    }
    core.applyPoliceHeatDelta(12);
    const env = core.toSaveEnvelope('cdp_m14', 'CDP');
    const restored = core.constructor.fromSaveEnvelope(env);
    return {
      schema: env.saveSchemaVersion,
      heatSaved: env.player.policeHeat,
      civicSaved: env.player.civicTrust,
      heatLoad: restored.policeHeat,
      civicLoad: restored.civicTrust,
    };
  })()`);
  console.log('save', st);
  results.push({
    id: 'AC-M14-08-save',
    pass: !!(st && st.schema === 2 && st.heatSaved === st.heatLoad && st.civicSaved === st.civicLoad),
  });
  results.push({ id: 'AC-M14-09-schema', pass: !!(st && st.schema === 2) });
  await takeScreenshot('m14_shot_09_save_reload_heat.png');

  // 8 Perf
  await evalJs(`(() => {
    const eng = window.__dhamrai_engine;
    eng.character.resetTransform({ x: 0, y: 0.5, z: 0 }, 0);
    eng.isInVehicle = false;
    return true;
  })()`);
  await new Promise((r) => setTimeout(r, 2000));
  const perf = await evalJs(`(async () => {
    const samples = [];
    for (let i = 0; i < 6; i++) {
      await new Promise(r => setTimeout(r, 250));
      samples.push(window.__dhamrai_useSessionStore.getState().performance);
    }
    const avgFps = samples.reduce((a,b)=>a+b.fps,0)/samples.length;
    const last = samples[samples.length-1];
    return { avgFps, ...last };
  })()`);
  console.log('perf', perf);
  results.push({ id: 'AC-M14-14-fps', pass: !!(perf && perf.avgFps >= 55) });
  results.push({ id: 'AC-M14-budget', pass: !!(perf && perf.drawCalls <= 180) });
  await takeScreenshot('m14_shot_10_performance.png');

  console.log('\n================ RESULTS ================');
  let all = true;
  for (const r of results) {
    console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.id}`);
    if (!r.pass) all = false;
  }
  console.log(all ? '\nALL LIVE SCENARIOS PASSED' : '\nSOME FAILED');
  console.log(JSON.stringify({ results, perf }, null, 2));
  ws.close();
  chromeProc.kill();
  try { viteProc.kill(); } catch {}
  process.exit(all ? 0 : 1);
}

runVerification().catch((e) => {
  console.error(e);
  process.exit(1);
});
