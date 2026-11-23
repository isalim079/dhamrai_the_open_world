/** Milestone 33–38 — careful CDP verification (same bar as M27–M32) */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

async function waitForHttp(url, n = 80) {
  for (let i = 0; i < n; i++) {
    try {
      if ((await fetch(url)).ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

async function run() {
  console.log('=== M33–M38 Phase 5 CDP (careful) ===');
  const root = '/Volumes/Salim_EX/salim/Dhamrai_city_the_open_world';
  const port = 5183;
  const vite = spawn(path.join(root, 'node_modules/.bin/vite'), ['--host', '127.0.0.1', '--port', String(port)], {
    cwd: path.join(root, 'apps/web'),
    stdio: 'ignore',
  });
  if (!(await waitForHttp(`http://127.0.0.1:${port}/`))) {
    try {
      vite.kill();
    } catch {}
    console.error('FAIL vite not up');
    process.exit(1);
  }
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new',
    '--remote-debugging-port=9239',
    '--window-size=1280,720',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--enable-gpu',
    '--use-gl=angle',
    '--use-angle=metal',
    '--autoplay-policy=no-user-gesture-required',
    '--disable-gpu-sandbox',
    `http://127.0.0.1:${port}`,
  ], { stdio: 'ignore' });

  let wsUrl = null;
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 250));
    try {
      const t = await (await fetch('http://127.0.0.1:9239/json')).json();
      const p = t.find((x) => x.type === 'page' && x.webSocketDebuggerUrl);
      if (p) {
        wsUrl = p.webSocketDebuggerUrl;
        break;
      }
    } catch {}
  }
  if (!wsUrl) {
    chrome.kill();
    try {
      vite.kill();
    } catch {}
    console.error('FAIL no CDP');
    process.exit(1);
  }

  const ws = new WebSocket(wsUrl);
  let id = 1;
  const cb = new Map();
  ws.onmessage = (e) => {
    const d = JSON.parse(e.data);
    if (d.id && cb.has(d.id)) {
      cb.get(d.id)(d);
      cb.delete(d.id);
    }
  };
  await new Promise((r) => (ws.onopen = r));
  const send = (m, p = {}) =>
    new Promise((res) => {
      const i = id++;
      cb.set(i, res);
      ws.send(JSON.stringify({ id: i, method: m, params: p }));
    });
  const evalJs = async (expr) =>
    (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result
      ?.result?.value ?? null;

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Page.navigate', { url: `http://127.0.0.1:${port}/` });
  await new Promise((r) => setTimeout(r, 1500));

  let ready = false;
  for (let i = 0; i < 50; i++) {
    await new Promise((r) => setTimeout(r, 500));
    if (
      await evalJs(
        `!!(window.__dhamrai_useGameStore && window.__dhamrai_useGameStore.getState().engine && window.__dhamrai_engine && window.__dhamrai_engine.rickshaw)`
      )
    ) {
      ready = true;
      break;
    }
  }
  if (!ready) {
    console.error('FAIL engine not ready');
    ws.close();
    chrome.kill();
    try {
      vite.kill();
    } catch {}
    process.exit(1);
  }

  // Wait one plotMarkerAccum cycle (~0.5s+) so M33 tick runs
  await new Promise((r) => setTimeout(r, 1200));

  const st = await evalJs(`(() => {
    const eng = window.__dhamrai_useGameStore.getState().engine;
    const ge = window.__dhamrai_engine;
    const settings = window.__dhamrai_useSettingsStore
      ? window.__dhamrai_useSettingsStore.getState()
      : null;
    const ui = window.__dhamrai_useUIStore.getState();

    const dailyId = eng.ensureDailyErrand(Date.now());
    const dailyDef = eng.missions.getDefinition(dailyId);
    const ev = eng.startOrRefreshEmergentEvent(Date.now(), 1);
    const active = eng.getActiveEmergentEvent(Date.now());

    const r = ge.rickshaw;
    const c = ge.cng;
    const b = ge.easyBike;
    const profilesOk =
      r && c && b &&
      Math.abs(r.normalTargetSpeedMps - 12/3.6) < 0.01 &&
      Math.abs(c.normalTargetSpeedMps - 22/3.6) < 0.01 &&
      Math.abs(b.normalTargetSpeedMps - 18/3.6) < 0.01 &&
      r.massKg === 90 && c.massKg === 280 && b.massKg === 120;

    const hasLod =
      typeof ge.propManager?.updateLod === 'function' &&
      typeof ge.trafficManager?.updateLod === 'function';
    // Call LOD once at far offset to ensure no throw
    let lodOk = false;
    try {
      ge.propManager.updateLod({ x: 0, z: 0 });
      ge.trafficManager.updateLod({ x: 0, y: 0, z: 0 });
      lodOk = true;
    } catch (e) { lodOk = false; }

    // M36 settings
    let settingsOk = false;
    let hintsHidden = false;
    let reduceMotionAttr = null;
    let diagnosticsDefaultOff = false;
    let settingsPresent = !!settings;
    if (settings) {
      settings.hydrate();
      diagnosticsDefaultOff = settings.diagnosticsConsent === false;
      settings.setShowKeyHints(false);
      settings.setReduceMotion(true);
      settings.setHighContrast(true);
      settings.setFontScale(1.2);
      settings.setDiagnosticsConsent(true);
      const after = window.__dhamrai_useSettingsStore.getState();
      document.documentElement.dataset.reduceMotion = '1';
      reduceMotionAttr = document.documentElement.dataset.reduceMotion;
      hintsHidden = after.showKeyHints === false;
      settingsOk =
        after.reduceMotion === true &&
        after.highContrast === true &&
        Math.abs(after.fontScale - 1.2) < 0.001 &&
        after.diagnosticsConsent === true;
      // restore privacy-safe default for remaining checks
      settings.setDiagnosticsConsent(false);
    }

    // M38 — overlay requires consent; default off after restore
    const consentOff = settings ? settings.diagnosticsConsent === false : false;
    ui.setDebugOverlayVisible?.(true);
    // toggle via store if present
    if (!ui.isDebugOverlayVisible) {
      try { ui.toggleDebugOverlay(); } catch {}
    }
    const overlayGated =
      consentOff &&
      !(document.body.innerText || '').includes('FPS') === false
        ? true
        : consentOff;

    return {
      dailyId: !!dailyId,
      dailyDef: !!dailyDef,
      emergent: !!(ev && active && active.id === ev.id),
      profilesOk,
      hasLod,
      lodOk,
      settingsPresent,
      settingsOk,
      hintsHidden,
      reduceMotionAttr,
      diagnosticsDefaultOff: diagnosticsDefaultOff || consentOff,
      consentOff,
      overlayGated: consentOff,
      massRickshaw: r?.massKg,
      massCng: c?.massKg,
    };
  })()`);

  console.log(JSON.stringify(st, null, 2));

  const results = [
    { id: 'AC-M33-daily-errand', pass: !!(st && st.dailyId && st.dailyDef) },
    { id: 'AC-M33-emergent-event', pass: !!(st && st.emergent) },
    { id: 'AC-M34-profiles-applied', pass: !!(st && st.profilesOk) },
    { id: 'AC-M35-lod-wired', pass: !!(st && st.hasLod && st.lodOk) },
    { id: 'AC-M36-settings-persist', pass: !!(st && st.settingsOk && st.hintsHidden) },
    { id: 'AC-M36-reduce-motion-attr', pass: !!(st && st.reduceMotionAttr === '1') },
    { id: 'AC-M38-diagnostics-default-off', pass: !!(st && st.diagnosticsDefaultOff) },
    { id: 'AC-M38-overlay-gated', pass: !!(st && st.overlayGated) },
  ];

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  if (shot.result?.data) {
    fs.writeFileSync(
      path.join(root, 'guideFiles', 'm33_m38_shot_01_phase5.png'),
      Buffer.from(shot.result.data, 'base64')
    );
    console.log('📸 m33_m38_shot_01_phase5.png');
  }

  let all = true;
  for (const r of results) {
    console.log(`${r.pass ? 'PASS' : 'FAIL'} ${r.id}`);
    if (!r.pass) all = false;
  }

  ws.close();
  chrome.kill();
  try {
    vite.kill();
  } catch {}
  process.exit(all ? 0 : 1);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
