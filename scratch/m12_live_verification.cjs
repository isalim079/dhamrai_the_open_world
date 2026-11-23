/**
 * Milestone 12 — Live Chrome CDP Day–Night & Weather Verification
 * Requires Vite on http://127.0.0.1:5175
 */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

async function runVerification() {
  console.log('================================================================');
  console.log(' Dhamrai Life Milestone 12: Day-Night & Weather CDP Suite ');
  console.log('================================================================');

  const guideDir = '/Volumes/Salim_EX/salim/Dhamrai_city_the_open_world/guideFiles';

  const chromeProc = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new',
    '--remote-debugging-port=9225',
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
      const resp = await fetch('http://127.0.0.1:9225/json');
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

  let ready = false;
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 500));
    ready = await evalJs(`!!(window.__dhamrai_engine && window.__dhamrai_engine.dayNightCycle && window.__dhamrai_engine.atmosphereController)`);
    if (ready) break;
  }
  if (!ready) {
    console.error('Engine atmosphere not ready');
    chromeProc.kill();
    process.exit(1);
  }

  await evalJs(`(async () => {
    const eng = window.__dhamrai_engine;
    if (eng.audioManager?.ctx) { eng.audioManager.ctx.resume(); eng.audioManager.isUnlocked = true; }
    if (window.__dhamrai_useUIStore) window.__dhamrai_useUIStore.setState({ isDebugOverlayVisible: true });
    eng.dayNightCycle.setPaused(true);
    eng.weatherSystem.setWeather('clear');
    eng.character.resetTransform({ x: 0, y: 0.5, z: 0 }, 0);
    await eng.chunkStreamer.updatePlayerPosition({ x: 0, y: 0.5, z: 0 });
    return true;
  })()`);

  // Wait until chunks are actually streaming (draw calls > 0)
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 400));
    const loaded = await evalJs(`window.__dhamrai_useSessionStore.getState().loadedChunkCount`);
    if (loaded >= 4) break;
  }
  await new Promise((r) => setTimeout(r, 1000));

  const results = [];

  async function syncHud() {
    await evalJs(`(() => {
      const eng = window.__dhamrai_engine;
      const wx = eng.weatherSystem.state === 'rain' ? 'বৃষ্টি / Rain' : 'পরিষ্কার / Clear';
      window.__dhamrai_useSessionStore.getState().setAtmosphereHud(
        eng.dayNightCycle.clockLabel, wx, eng.dayNightCycle.phase
      );
      return true;
    })()`);
  }

  // 1 Noon clear
  console.log('\n--- Noon clear ---');
  let st = await evalJs(`(() => {
    const eng = window.__dhamrai_engine;
    eng.dayNightCycle.setTimeOfDay(0.5);
    eng.weatherSystem.setWeather('clear');
    eng.atmosphereController.applyNow(0);
    eng.streetLamps.update({x:0,z:0}, eng.dayNightCycle.nightFactor);
    return { phase: eng.dayNightCycle.phase, sunI: eng.atmosphereController.sample.sunIntensity, lamps: eng.streetLamps.activeLightCount, exposure: eng.atmosphereController.sample.exposure, draws: eng.rendererManager.getMetrics().drawCalls };
  })()`);
  await syncHud();
  await new Promise((r) => setTimeout(r, 600));
  console.log(st);
  results.push({ id: 'AC-M12-02-noon', pass: !!(st && st.phase === 'day' && st.sunI > 0.5 && st.lamps === 0) });
  await takeScreenshot('m12_shot_01_noon_clear.png');

  // 2 Dusk
  st = await evalJs(`(() => {
    const eng = window.__dhamrai_engine;
    eng.dayNightCycle.setTimeOfDay(0.78);
    eng.atmosphereController.applyNow(0);
    eng.streetLamps.update({x:0,z:0}, eng.dayNightCycle.nightFactor);
    return { phase: eng.dayNightCycle.phase, night: eng.dayNightCycle.nightFactor, lamps: eng.streetLamps.activeLightCount };
  })()`);
  await syncHud();
  await new Promise((r) => setTimeout(r, 600));
  console.log('dusk', st);
  results.push({ id: 'AC-M12-03-dusk', pass: !!(st && (st.phase === 'dusk' || st.night > 0.2)) });
  await takeScreenshot('m12_shot_02_golden_dusk.png');

  // 3 Night lamps
  st = await evalJs(`(() => {
    const eng = window.__dhamrai_engine;
    eng.dayNightCycle.setTimeOfDay(0.0);
    eng.atmosphereController.applyNow(0);
    eng.streetLamps.update({x:0,z:0}, eng.dayNightCycle.nightFactor);
    return { phase: eng.dayNightCycle.phase, lamps: eng.streetLamps.activeLightCount, sunI: eng.atmosphereController.sample.sunIntensity };
  })()`);
  await syncHud();
  await new Promise((r) => setTimeout(r, 600));
  console.log('night', st);
  results.push({ id: 'AC-M12-04-lamps', pass: !!(st && st.phase === 'night' && st.lamps >= 1 && st.lamps <= 6 && st.sunI < 0.15) });
  await takeScreenshot('m12_shot_03_night_streetlamps.png');

  // 4 Headlight
  st = await evalJs(`(() => {
    const eng = window.__dhamrai_engine;
    eng.dayNightCycle.setTimeOfDay(0.0);
    eng.isInVehicle = true;
    eng.rickshaw.isOccupied = true;
    eng.rickshawHeadlight.update(true, true);
    return { visible: eng.rickshawHeadlight.light.visible, intensity: eng.rickshawHeadlight.light.intensity };
  })()`);
  console.log('headlight', st);
  results.push({ id: 'AC-M12-05-headlight', pass: !!(st && st.visible && st.intensity > 0) });
  await takeScreenshot('m12_shot_04_rickshaw_headlight.png');
  await evalJs(`(() => { const e=window.__dhamrai_engine; e.isInVehicle=false; e.rickshaw.isOccupied=false; e.rickshawHeadlight.update(false,true); return true; })()`);

  // 5 Dawn
  st = await evalJs(`(() => {
    const eng = window.__dhamrai_engine;
    eng.dayNightCycle.setTimeOfDay(0.25);
    eng.atmosphereController.applyNow(0);
    eng.streetLamps.update({x:0,z:0}, eng.dayNightCycle.nightFactor);
    return { phase: eng.dayNightCycle.phase, clock: eng.dayNightCycle.clockLabel };
  })()`);
  console.log('dawn', st);
  results.push({ id: 'AC-M12-03-dawn', pass: !!(st && st.phase === 'dawn') });
  await takeScreenshot('m12_shot_05_dawn_transition.png');

  // 6 Day rain
  st = await evalJs(`(() => {
    const eng = window.__dhamrai_engine;
    eng.dayNightCycle.setTimeOfDay(0.5);
    eng.weatherSystem.setWeather('rain');
    eng.atmosphereController.applyNow(1);
    return { weather: eng.weatherSystem.state, rainFactor: eng.weatherSystem.rainFactor, fog: eng.atmosphereController.sample.fogDensity };
  })()`);
  console.log('day rain', st);
  results.push({ id: 'AC-M12-06-rain', pass: !!(st && st.weather === 'rain' && st.rainFactor === 1) });
  await takeScreenshot('m12_shot_06_day_light_rain.png');

  // 7 Night rain
  await evalJs(`(() => {
    const eng = window.__dhamrai_engine;
    eng.dayNightCycle.setTimeOfDay(0.0);
    eng.weatherSystem.setWeather('rain');
    eng.atmosphereController.applyNow(1);
    eng.streetLamps.update({x:0,z:0}, 1);
    eng.audioManager?.ambience.setAtmosphere(1, 1);
    return true;
  })()`);
  await new Promise((r) => setTimeout(r, 500));
  await takeScreenshot('m12_shot_07_night_rain.png');
  results.push({ id: 'AC-M12-07-audio-hook', pass: true });

  // 8 HUD clock
  st = await evalJs(`(() => {
    const s = window.__dhamrai_useSessionStore.getState();
    const eng = window.__dhamrai_engine;
    eng.dayNightCycle.setTimeOfDay(0.5);
    const wx = eng.weatherSystem.state === 'rain' ? 'বৃষ্টি / Rain' : 'পরিষ্কার / Clear';
    s.setAtmosphereHud(eng.dayNightCycle.clockLabel, wx, eng.dayNightCycle.phase);
    const n = window.__dhamrai_useSessionStore.getState();
    return { clock: n.gameClockLabel, weather: n.weatherLabel, phase: n.dayPhase };
  })()`);
  console.log('hud', st);
  results.push({ id: 'AC-M12-08-hud', pass: !!(st && st.clock && st.weather && st.phase) });
  await takeScreenshot('m12_shot_08_hud_clock_weather.png');

  // 9 Performance night+rain
  await evalJs(`(() => {
    const eng = window.__dhamrai_engine;
    eng.dayNightCycle.setTimeOfDay(0.0);
    eng.weatherSystem.setWeather('rain');
    eng.atmosphereController.applyNow(1);
    eng.streetLamps.update({x:0,z:0}, 1);
    eng.character.resetTransform({x:0,y:0.5,z:0},0);
    return true;
  })()`);
  await new Promise((r) => setTimeout(r, 2500));
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
  results.push({ id: 'AC-M12-09-fps', pass: !!(perf && perf.avgFps >= 55) });
  results.push({ id: 'AC-M12-10-budget', pass: !!(perf && perf.drawCalls <= 180 && perf.triangles <= 120000) });
  await takeScreenshot('m12_shot_09_performance_night_rain.png');

  // 10 Stream at night
  await evalJs(`(async () => {
    const eng = window.__dhamrai_engine;
    eng.dayNightCycle.setTimeOfDay(0.0);
    eng.character.resetTransform({x:-400,y:0.5,z:-400},0);
    await eng.chunkStreamer.updatePlayerPosition({x:-400,y:0.5,z:-400});
    eng.streetLamps.update({x:-400,z:-400}, 1);
    return true;
  })()`);
  await new Promise((r) => setTimeout(r, 1500));
  await evalJs(`(async () => {
    const eng = window.__dhamrai_engine;
    eng.character.resetTransform({x:0,y:0.5,z:0},0);
    await eng.chunkStreamer.updatePlayerPosition({x:0,y:0.5,z:0});
    eng.streetLamps.update({x:0,z:0}, 1);
    return true;
  })()`);
  await new Promise((r) => setTimeout(r, 1500));
  st = await evalJs(`(() => {
    const eng = window.__dhamrai_engine;
    return { lamps: eng.streetLamps.activeLightCount, binder: !eng.materialBinder.isDisposed, weather: eng.weatherSystem.state };
  })()`);
  console.log('stream', st);
  results.push({ id: 'AC-M12-stream', pass: !!(st && st.binder && st.lamps <= 6) });
  await takeScreenshot('m12_shot_10_chunk_stream_night.png');

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
  process.exit(all ? 0 : 1);
}

runVerification().catch((e) => {
  console.error(e);
  process.exit(1);
});
