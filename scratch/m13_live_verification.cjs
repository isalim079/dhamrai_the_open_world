/**
 * Milestone 13 — Live Chrome CDP: wear, stamina, tea, repair
 * Spawns Vite in-process so Chrome and the server share the same session.
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
  console.log(' Dhamrai Life Milestone 13: Maintenance & Tea Economy CDP ');
  console.log('================================================================');

  const root = '/Volumes/Salim_EX/salim/Dhamrai_city_the_open_world';
  const guideDir = path.join(root, 'guideFiles');

  // Same-session Vite (keeps alive for Chrome headless)
  const viteProc = spawn(
    path.join(root, 'node_modules/.bin/vite'),
    ['--host', '127.0.0.1', '--port', '5175'],
    { cwd: path.join(root, 'apps/web'), stdio: 'ignore', detached: false }
  );
  const viteUp = await waitForHttp('http://127.0.0.1:5175/');
  if (!viteUp) {
    console.error('Vite failed to start on 5175');
    try { viteProc.kill(); } catch {}
    process.exit(1);
  }
  console.log('Vite ready on 127.0.0.1:5175');

  const chromeProc = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new',
    '--remote-debugging-port=9226',
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
      const resp = await fetch('http://127.0.0.1:9226/json');
      const targets = await resp.json();
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
      console.log(`📸 ${fileName} (${buf.length} bytes)`);
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
      `!!(window.__dhamrai_engine && window.__dhamrai_engine.economyInteractables && window.__dhamrai_useGameStore.getState().engine)`
    );
    if (ready) break;
  }
  if (!ready) {
    console.error('Engine / economy interactables not ready');
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
    eng.character.resetTransform({ x: 0, y: 0.5, z: 0 }, 0);
    await eng.chunkStreamer.updatePlayerPosition({ x: 0, y: 0.5, z: 0 });
    return true;
  })()`);

  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 400));
    const loaded = await evalJs(`window.__dhamrai_useSessionStore.getState().loadedChunkCount`);
    if (loaded >= 4) break;
  }
  await new Promise((r) => setTimeout(r, 800));

  const results = [];

  // Sync condition HUD from domain
  async function syncCondition() {
    return evalJs(`(() => {
      const core = window.__dhamrai_useGameStore.getState().engine;
      if (!core) return null;
      window.__dhamrai_useSessionStore.getState().setConditionHud({
        staminaPercent: core.staminaPercent,
        damagePercent: core.player.vehicleState.damagePercent,
        tirePressurePercent: core.tirePressurePercent,
        isPunctured: core.isPunctured,
        sprintBlocked: !core.canSprint(),
      });
      return {
        stamina: core.staminaPercent,
        damage: core.player.vehicleState.damagePercent,
        tire: core.tirePressurePercent,
        punctured: core.isPunctured,
        schema: core.toSaveEnvelope().saveSchemaVersion,
      };
    })()`);
  }

  // 1 Baseline HUD meters
  console.log('\n--- Baseline meters ---');
  let st = await syncCondition();
  console.log(st);
  results.push({ id: 'AC-M13-hud-baseline', pass: !!(st && st.stamina === 100 && st.tire === 100 && st.schema === 2) });
  await takeScreenshot('m13_shot_01_stamina_hud.png');
  await takeScreenshot('m13_shot_02_vehicle_condition_meters.png');

  // 2 Travel wear ~500m
  console.log('\n--- Travel wear 500m ---');
  st = await evalJs(`(() => {
    const core = window.__dhamrai_useGameStore.getState().engine;
    const before = { damage: core.player.vehicleState.damagePercent, tire: core.tirePressurePercent };
    const wear = core.applyTravelWear(500, false, () => 1);
    window.__dhamrai_useSessionStore.getState().setConditionHud({
      staminaPercent: core.staminaPercent,
      damagePercent: core.player.vehicleState.damagePercent,
      tirePressurePercent: core.tirePressurePercent,
      isPunctured: core.isPunctured,
      sprintBlocked: !core.canSprint(),
    });
    return { before, after: { damage: wear.damagePercent, tire: wear.tirePressurePercent }, deltaD: wear.damageDelta, deltaT: wear.tireDelta };
  })()`);
  console.log(st);
  results.push({
    id: 'AC-M13-01-wear',
    pass: !!(st && st.after.damage > st.before.damage && st.after.tire < st.before.tire),
  });
  await takeScreenshot('m13_shot_06_wear_after_travel.png');

  // 3 Sprint drain + block
  console.log('\n--- Sprint stamina drain ---');
  st = await evalJs(`(() => {
    const core = window.__dhamrai_useGameStore.getState().engine;
    // Drain below critical
    for (let i = 0; i < 20; i++) {
      core.tickStamina({ dtSec: 1, sprinting: true, inVehicle: true, moving: true });
    }
    const blocked = !core.canSprint();
    window.__dhamrai_useSessionStore.getState().setConditionHud({
      staminaPercent: core.staminaPercent,
      damagePercent: core.player.vehicleState.damagePercent,
      tirePressurePercent: core.tirePressurePercent,
      isPunctured: core.isPunctured,
      sprintBlocked: blocked,
    });
    return { stamina: core.staminaPercent, blocked };
  })()`);
  console.log(st);
  results.push({ id: 'AC-M13-02-sprint-block', pass: !!(st && st.blocked && st.stamina < 15) });
  await takeScreenshot('m13_shot_05_low_stamina_sprint_block.png');

  // 4 Tea stall prompt + purchase
  console.log('\n--- Tea stall purchase ---');
  st = await evalJs(`(() => {
    const eng = window.__dhamrai_engine;
    const core = window.__dhamrai_useGameStore.getState().engine;
    eng.character.resetTransform({ x: 3.2, y: 0.5, z: -2.4 }, 0);
    const near = eng.economyInteractables.findNearest({ x: 3.2, y: 0, z: -2.4 }, 2.5);
    const cashBefore = core.economy.balanceMinorUnits;
    const stamBefore = core.staminaPercent;
    const buy = core.purchaseConsumable('cha_cup', Date.now(), 'cdp_tea_' + Date.now());
    window.__dhamrai_useGameStore.getState().syncFromEngine();
    window.__dhamrai_useSessionStore.getState().setConditionHud({
      staminaPercent: core.staminaPercent,
      damagePercent: core.player.vehicleState.damagePercent,
      tirePressurePercent: core.tirePressurePercent,
      isPunctured: core.isPunctured,
      sprintBlocked: !core.canSprint(),
      economyPrompt: near ? near.item.promptBn : '',
    });
    window.__dhamrai_useSessionStore.getState().setStatusMessage(near ? near.item.promptBn + ' / ' + near.item.promptEn : '');
    return {
      nearKind: near?.item.kind,
      buyOk: buy.success,
      category: buy.transaction?.category,
      cashDelta: core.economy.balanceMinorUnits - cashBefore,
      stamAfter: core.staminaPercent,
      stamBefore,
    };
  })()`);
  console.log(st);
  results.push({
    id: 'AC-M13-03-tea',
    pass: !!(st && st.nearKind === 'tea_stall' && st.buyOk && st.category === 'CONSUMABLE_PURCHASE' && st.cashDelta === -500 && st.stamAfter > st.stamBefore),
  });
  await takeScreenshot('m13_shot_03_tea_stall_prompt.png');
  await takeScreenshot('m13_shot_04_cha_purchase.png');

  // 5 Puncture event
  console.log('\n--- Puncture ---');
  st = await evalJs(`(() => {
    const core = window.__dhamrai_useGameStore.getState().engine;
    // Drain tire below threshold without puncture (rng always fails), then force puncture
    core.applyTravelWear(12000, true, () => 1);
    let triggered = false;
    for (let i = 0; i < 8 && !core.isPunctured; i++) {
      const r = core.applyTravelWear(400, true, () => 0);
      if (r.punctureTriggered) triggered = true;
    }
    window.__dhamrai_useSessionStore.getState().setConditionHud({
      staminaPercent: core.staminaPercent,
      damagePercent: core.player.vehicleState.damagePercent,
      tirePressurePercent: core.tirePressurePercent,
      isPunctured: core.isPunctured,
      sprintBlocked: !core.canSprint(),
    });
    window.__dhamrai_useSessionStore.getState().setStatusMessage('⚠️ পাংচার! মিস্ত্রি গৌতমের কাছে যান');
    const mods = core.getSpeedModifiers();
    return { punctured: core.isPunctured, limp: mods.limpMode, tire: core.tirePressurePercent, triggered };
  })()`);
  console.log(st);
  results.push({ id: 'AC-M13-06-puncture', pass: !!(st && st.punctured && st.limp) });
  await takeScreenshot('m13_shot_07_puncture_event.png');

  // 6 High damage speed mult + mistri repair
  console.log('\n--- Mistri repair ---');
  st = await evalJs(`(() => {
    const eng = window.__dhamrai_engine;
    const core = window.__dhamrai_useGameStore.getState().engine;
    // Force high damage for speed check
    core.applyTravelWear(80_000, true, () => 1);
    const modsBefore = core.getSpeedModifiers();
    const cashBefore = core.economy.balanceMinorUnits;
    eng.character.resetTransform({ x: -6.5, y: 0.5, z: 2.0 }, 0);
    const near = eng.economyInteractables.findNearest({ x: -6.5, y: 0, z: 2.0 }, 2.5);
    window.__dhamrai_useUIStore.getState().openDialogue('dialogue_mistri_gautom');
    const repair = core.purchaseRepair('full_service', Date.now(), 'cdp_repair_' + Date.now());
    window.__dhamrai_useGameStore.getState().syncFromEngine();
    window.__dhamrai_useSessionStore.getState().setConditionHud({
      staminaPercent: core.staminaPercent,
      damagePercent: core.player.vehicleState.damagePercent,
      tirePressurePercent: core.tirePressurePercent,
      isPunctured: core.isPunctured,
      sprintBlocked: !core.canSprint(),
      economyPrompt: near ? near.item.promptBn : '',
    });
    const modsAfter = core.getSpeedModifiers();
    return {
      nearKind: near?.item.kind,
      speedMultBefore: modsBefore.topSpeedMult,
      repairOk: repair.success,
      category: repair.transaction?.category,
      cashDelta: core.economy.balanceMinorUnits - cashBefore,
      damage: core.player.vehicleState.damagePercent,
      tire: core.tirePressurePercent,
      punctured: core.isPunctured,
      speedMultAfter: modsAfter.topSpeedMult,
      schema: core.toSaveEnvelope().saveSchemaVersion,
    };
  })()`);
  console.log(st);
  results.push({ id: 'AC-M13-07-speed', pass: !!(st && st.speedMultBefore < 1) });
  results.push({
    id: 'AC-M13-05-repair',
    pass: !!(
      st &&
      st.nearKind === 'mistri' &&
      st.repairOk &&
      st.category === 'MAINTENANCE_COST' &&
      st.cashDelta === -7500 &&
      st.damage === 0 &&
      st.tire === 100 &&
      st.punctured === false
    ),
  });
  results.push({ id: 'AC-M13-09-schema', pass: !!(st && st.schema === 2) });
  await takeScreenshot('m13_shot_08_mistri_repair_menu.png');
  await takeScreenshot('m13_shot_09_post_repair_meters.png');
  await evalJs(`window.__dhamrai_useUIStore.getState().closeDialogue()`);

  // 7 Save/reload fields
  console.log('\n--- Save roundtrip ---');
  st = await evalJs(`(() => {
    const core = window.__dhamrai_useGameStore.getState().engine;
    core.tickStamina({ dtSec: 2, sprinting: true, inVehicle: false, moving: true });
    core.applyTravelWear(300, false, () => 1);
    const env = core.toSaveEnvelope('cdp_m13', 'CDP');
    const EngineCtor = core.constructor;
    const restored = EngineCtor.fromSaveEnvelope(env);
    return {
      schema: env.saveSchemaVersion,
      staminaSaved: env.player.staminaPercent,
      tireSaved: env.player.vehicleState?.tirePressurePercent,
      damageSaved: env.player.vehicleState?.damagePercent,
      staminaLoad: restored.staminaPercent,
      tireLoad: restored.tirePressurePercent,
      damageLoad: restored.player.vehicleState.damagePercent,
    };
  })()`);
  console.log(st);
  results.push({
    id: 'AC-M13-08-save',
    pass: !!(
      st &&
      st.schema === 2 &&
      st.staminaSaved === st.staminaLoad &&
      st.tireSaved === st.tireLoad &&
      st.damageSaved === st.damageLoad
    ),
  });

  // 8 Performance
  console.log('\n--- Performance ---');
  await evalJs(`(() => {
    const eng = window.__dhamrai_engine;
    eng.character.resetTransform({ x: 0, y: 0.5, z: 0 }, 0);
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
  console.log(perf);
  results.push({ id: 'AC-M13-14-fps', pass: !!(perf && perf.avgFps >= 55) });
  results.push({ id: 'AC-M13-budget', pass: !!(perf && perf.drawCalls <= 180) });
  await takeScreenshot('m13_shot_10_performance.png');

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
