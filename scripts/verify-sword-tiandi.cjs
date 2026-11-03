'use strict';
// Production Cocos verification. Fixtures only select a training loadout and
// place an authored enemy; all effects, sprite loading and drawing are real.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { createServer } = require('node:http'), { createHash } = require('node:crypto');
const { pathToFileURL } = require('node:url');
const ROOT = path.resolve(__dirname, '..');
const { installFixture, assertCleanup } = require('./verify-sword-line.cjs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ||
  '/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const BASE = path.join(ROOT, 'design/xianxia-tiandi-v1-2026-10-30/integration');
const ASSET = 'cocos-pilot/assets/resources/tower-skill-fx/sword-tiandi-v1.png';
const APPROVED = 'design/xianxia-tiandi-v1-2026-10-30/attempt-03/tiandi-candidate-atlas.png';
const BASELINE = 'design/xianxia-tiandi-v1-2026-10-30/rehearsal/attempt-03/browser.json';
const TAIL_BASELINE = 'design/xianxia-tiandi-v1-2026-10-30/attempt-04-long-tail/rehearsal/attempt-02/browser.json';
const CFG = { atlasSize: [4096, 768], cellSize: [1024, 192], frameCount: 16,
  anchor: [16 / 928, .5], lengthRatio: 928 / 896, widthRatio: 1.25, visualDuration: .75 };
const CASES = [
  { name: 'rank1-parent6-right', rank: 1, parent: 6, angle: 0, reach: 610, width: 80 },
  { name: 'rank1-parent10-left', rank: 1, parent: 10, angle: 180, reach: 670, width: 80 },
  { name: 'rank2-parent8-right', rank: 2, parent: 8, angle: 0, reach: 740, width: 112 },
  { name: 'rank2-parent10-right', rank: 2, parent: 10, angle: 0, reach: 770, width: 112 },
  { name: 'rank2-up', rank: 2, parent: 10, angle: 90, reach: 770, width: 112, origin: { x: -500, y: -400 } },
  { name: 'rank2-diagonal', rank: 2, parent: 10, angle: 45, reach: 770, width: 112, origin: { x: -500, y: -60 } },
  { name: 'pillar-clipped', rank: 2, parent: 10, angle: 90, reach: 770, width: 112, origin: { x: 33, y: 120 }, clipped: true },
  { name: 'boundary-clipped', rank: 2, parent: 10, angle: 0, reach: 770, width: 112, origin: { x: 850, y: -60 }, clipped: true },
  { name: 'moving-before-after-lock', rank: 2, parent: 10, angle: 0, reach: 770, width: 112, origin: { x: -220, y: -60 }, moving: true },
];
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const near = (actual, expected, label) => assert.ok(Math.abs(actual - expected) < 1e-5,
  `${label}: ${actual} != ${expected}`);
const expectedFrame = age => {
  const sourceAge = age <= .0625 ? age : .0625 + (age - .0625) * .4375 / .6875;
  return Math.min(15, Math.floor((sourceAge + 1e-9) / .5 * 16));
};
const corePaths = ['cocos-pilot/build/web-mobile/index.html', 'cocos-pilot/assets/scripts/SwordTiandiArt.ts',
  'cocos-pilot/assets/scripts/TowerCharacterArt.ts', 'cocos-pilot/assets/scripts/TowerView.ts',
  'cocos-pilot/assets/scripts/TowerSkillEffects.ts', 'js/xianxia/TowerRun.js', 'js/xianxia/TowerSkillForms.js', ASSET];
const sourceHashes = () => Object.fromEntries(corePaths.map(p => [p, sha(fs.readFileSync(path.join(ROOT, p)))]));
function outputDirectory() {
  if (process.argv[2]) return path.resolve(process.argv[2]);
  for (let i = 1; ; i++) {
    const p = path.join(BASE, `browser-attempt-${String(i).padStart(2, '0')}`);
    if (!fs.existsSync(p)) return p;
  }
}

async function installTelemetry(page) {
  await page.evaluate(() => {
    const h = window.__towerTest.host;
    if (!h.tiandiArt) throw new Error('Build does not contain production SwordTiandiArt');
    const q = window.__tiandiQA = {
      events: [], effects: new Map(), hits: [], history: [], fallbackCalls: 0,
      read() {
        const s = h.run?.state, art = h.tiandiArt, body = h.characterArt;
        const index = body.body ? body.frames.indexOf(body.body.spriteFrame) : -1;
        return { time: s?.time, camera: { ...h.camera },
          player: s ? { x: s.player.x, y: s.player.y } : null,
          actors: Array.from(art.actors, ([id, a]) => ({ id, x: a.node.position.x, y: a.node.position.y,
            angle: a.node.angle, width: a.ui.width, height: a.ui.height,
            anchorX: a.ui.anchorX, anchorY: a.ui.anchorY,
            frameIndex: art.frames.indexOf(a.sprite.spriteFrame),
            image: a.sprite.spriteFrame?.texture?.image?.url })),
          tracks: Array.from(art.tracks.keys()),
          effects: (s?.effects || []).filter(e => e.source === 'evo_tiandi').map(e => ({ ...e })),
          casts: (s?.casts || []).map(c => ({ ...c, castContext: undefined })),
          character: { index, ordinal: body.atlas?.clips.slash.frames.indexOf(index),
            attack: body.attack ? { ...body.attack } : null, angle: body.root?.angle },
          enemyHp: s?.enemies[0]?.hp };
      },
    };
    const observe = h.characterArt.observeCast;
    h.characterArt.observeCast = function (event) {
      const before = this.attack ? { ...this.attack } : null;
      observe.call(this, event);
      q.events.push({ time: h.run?.state.time, event: { ...event },
        before, after: this.attack ? { ...this.attack } : null });
    };
    window.__prepareTiandi = fixture => {
      window.__prepareLine({ rank: fixture.parent, reach: fixture.reach,
        expectedLength: fixture.expectedLength, angle: fixture.angle, origin: fixture.origin });
      const run = h.run, s = run.state;
      s.loadout.evolutions = ['evo_tiandi']; s.loadout.evolutionLevels = { evo_tiandi: fixture.rank };
      s.player.hp = s.player.maxHp;
      q.events = []; q.effects.clear(); q.hits = []; q.history = []; q.fallbackCalls = 0;
      // Observe the unmodified combat step, including the normal update(dt) path.
      const advance = run.advance;
      run.advance = function (...args) {
        const hp = this.state.enemies[0]?.hp, result = advance.apply(this, args);
        for (const e of this.state.effects)
          if (!e.hostile && e.kind === 'tiandi' && e.source === 'evo_tiandi') q.effects.set(e.id, { ...e });
        if (this.state.enemies[0]?.hp < hp)
          q.hits.push({ time: this.state.time, oldHp: hp, newHp: this.state.enemies[0].hp });
        return result;
      };
      // Count production fallback calls without changing their behavior.
      if (!h.skillEffects.__tiandiQaOriginalItem) {
        h.skillEffects.__tiandiQaOriginalItem = h.skillEffects.item;
        h.skillEffects.item = function (...args) {
          const e = args[1];
          if (!e?.hostile && e?.kind === 'tiandi' && e?.source === 'evo_tiandi') q.fallbackCalls++;
          return this.__tiandiQaOriginalItem.apply(this, args);
        };
      }
      h.draw();
    };
    window.__stepTiandi = () => {
      const run = h.run, s = run.state, before = h.characterArt.sample(s);
      run.resume(); run.advance(1 / 60, event => h.characterArt.observeCast(event)); run.pause();
      h.characterArt.observe(before, s); h.draw();
      const view = q.read(); q.history.push(view); return view;
    };
  });
}
function assertActor(actor, effect, view) {
  assert.ok(actor, 'Real release has a production tiandi sprite');
  near(actor.x, effect.x - view.camera.x, 'origin x'); near(actor.y, effect.y - view.camera.y, 'origin y');
  const angle = Math.atan2(effect.toY - effect.y, effect.toX - effect.x);
  near(actor.angle, angle * 180 / Math.PI, 'direction');
  near(actor.width, Math.hypot(effect.toX - effect.x, effect.toY - effect.y) * CFG.lengthRatio, 'length scale');
  near(actor.height, effect.width * CFG.widthRatio, 'width scale');
  near(actor.anchorX, CFG.anchor[0], 'anchor x'); near(actor.anchorY, CFG.anchor[1], 'anchor y');
  near(actor.x + Math.cos(angle) * actor.width / CFG.lengthRatio, effect.toX - view.camera.x, 'visible endpoint x');
  near(actor.y + Math.sin(angle) * actor.width / CFG.lengthRatio, effect.toY - view.camera.y, 'visible endpoint y');
  assert.equal(actor.frameIndex, expectedFrame(view.time - effect.startedAt), 'independent visual timeline');
}
async function checkCleanup(page) {
  const result = await page.evaluate(() => {
    const h = window.__towerTest.host, art = h.tiandiArt, line = h.lineArt, battle = h.battle;
    h.withdraw();
    return { tiandi: { actorsCleared: art.actors.size === 0, tracksCleared: art.tracks.size === 0,
        drawnCleared: art.drawn.size === 0, layerCleared: h.tiandiLayer === null },
      base: { actorsCleared: line.actors.size === 0, tracksCleared: line.tracks.size === 0,
        layerCleared: h.lineLayer === null, runCleared: h.run === null,
        battleDetached: !battle || !battle.parent || !cc.isValid(battle, true),
        storeUnchanged: JSON.stringify(window.__towerTest.state()) === window.__lineInitial.store,
        storageUnchanged: JSON.stringify(localStorage) === window.__lineInitial.storage,
        writes: window.__lineWrites, startupProbe: window.__lineInitial.startupProbe } };
  });
  for (const [key, value] of Object.entries(result.tiandi)) assert.equal(value, true, `tiandi cleanup ${key}`);
  assertCleanup(result.base);
  return { tiandi: result.tiandi, ...result.base };
}
async function checkSceneLifecycle(page, fixture, viewport, out) {
  await page.evaluate(f => window.__prepareTiandi(f), fixture);
  const tail = await page.evaluate(() => {
    const q = window.__tiandiQA, h = window.__towerTest.host;
    for (let i = 0; i < 90; i++) {
      window.__stepTiandi();
      const e = Array.from(q.effects.values())[0];
      if (e && h.run.state.time - e.startedAt > .3) break;
    }
    window.__tiandiBeforeResizeNode = Array.from(h.tiandiArt.actors.values())[0]?.node;
    return q.read();
  });
  assert.equal(tail.actors.length, 1); assert.equal(tail.effects.length, 0);
  const resizedViewport = { width: viewport.width - 120, height: viewport.height - 40 };
  await page.setViewportSize(resizedViewport); await page.waitForTimeout(180);
  const resized = await page.evaluate(() => {
    const h = window.__towerTest.host, old = window.__tiandiBeforeResizeNode;
    return { view: window.__tiandiQA.read(), oldNodeDetached: !old.parent || !cc.isValid(old, true),
      nodes: h.tiandiLayer.children.length };
  });
  assert.deepEqual(resized.view, tail, 'Scene reconstruction keeps the paused tail phase and locked geometry');
  assert.ok(resized.oldNodeDetached); assert.equal(resized.nodes, 1);
  await page.setViewportSize(viewport); await page.waitForTimeout(180);
  assert.deepEqual(await page.evaluate(() => window.__tiandiQA.read()), tail);
  await page.screenshot({ path: path.join(out, `scene-rebuilt-tail-${viewport.width}.png`) });
  const exitedDuringTail = await checkCleanup(page);
  const reentered = await page.evaluate(() => {
    const h = window.__towerTest.host;
    h.enterTraining(); h.run.pause(); h.draw();
    return { actors: h.tiandiArt.actors.size, tracks: h.tiandiArt.tracks.size,
      nodes: h.tiandiLayer.children.length };
  });
  assert.deepEqual(reentered, { actors: 0, tracks: 0, nodes: 0 }, 'A new training scene has no old tail');
  const cleanupAfterReentry = await checkCleanup(page);
  return { viewport, tail, resized, exitedDuringTail, reentered, cleanupAfterReentry };
}
async function recordRank(page, rank, out) {
  await page.evaluate(f => window.__prepareTiandi(f),
    { rank, parent: 10, angle: 0, reach: rank === 1 ? 670 : 770, width: rank === 1 ? 80 : 112 });
  await page.waitForFunction(() => {
    const h = window.__towerTest.host;
    return h.tiandiArt.ready && h.characterArt.body?.spriteFrame && h.environmentArt.nodes.get('floor')?.active;
  });
  const recording = await page.evaluate(async () => {
    const h = window.__towerTest.host, run = h.run, q = window.__tiandiQA;
    const canvas = document.querySelector('#GameCanvas'), stream = canvas.captureStream(30);
    const mimeType = 'video/webm;codecs=vp9', chunks = [];
    if (!MediaRecorder.isTypeSupported(mimeType)) throw new Error('VP9 unsupported');
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5000000 });
    const stopped = new Promise(resolve => {
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = resolve;
    });
    const history = [], initial = run.state.time, started = performance.now();
    const timer = setInterval(() => history.push(q.read()), 16);
    recorder.start(); run.resume();
    await new Promise(resolve => setTimeout(resolve, 2350));
    run.pause(); h.draw(); history.push(q.read()); recorder.stop(); clearInterval(timer);
    await stopped; stream.getTracks().forEach(track => track.stop());
    const blob = new Blob(chunks, { type: mimeType });
    const dataUrl = await new Promise(resolve => {
      const file = new FileReader; file.onload = () => resolve(file.result); file.readAsDataURL(blob);
    });
    return { dataUrl, wallSeconds: (performance.now() - started) / 1000,
      simSeconds: run.state.time - initial, events: q.events, history,
      effects: Array.from(q.effects.values()), hits: q.hits, fallbackCalls: q.fallbackCalls };
  });
  assert.equal(recording.effects.length, 1); assert.equal(recording.hits.length, 1);
  assert.equal(recording.events.length, 2); assert.equal(recording.fallbackCalls, 0);
  assert.ok(recording.simSeconds > 2.1 && recording.simSeconds < 2.6, 'Production update has real-time pacing');
  assert.ok(recording.history.some(v => v.actors.length === 1), 'Recording contains a real sprite release');
  assert.equal(recording.history.at(-1).actors.length, 0, 'Recording contains the fully vanished tail');
  const file = `rank${rank}-production-realtime.webm`;
  fs.writeFileSync(path.join(out, file), Buffer.from(recording.dataUrl.split(',')[1], 'base64'));
  delete recording.dataUrl;
  return { rank, file, ...recording,
    description: 'Native canvas recording. Unmodified production TowerView.update(dt), resource loading and sprite rendering. No frame stepping or playback speed change.' };
}

async function main() {
  const OUT = outputDirectory();
  assert.ok(!fs.existsSync(OUT), 'Use a fresh output directory to preserve earlier QA');
  fs.mkdirSync(OUT, { recursive: true }); fs.copyFileSync(__filename, path.join(OUT, 'verify-sword-tiandi.snapshot.cjs'));
  const before = sourceHashes(), approved = fs.readFileSync(path.join(ROOT, APPROVED));
  assert.equal(before[ASSET], sha(approved), 'Production atlas must be byte-identical to the approved candidate');
  const baseline = JSON.parse(fs.readFileSync(path.join(ROOT, BASELINE), 'utf8'));
  const approvedTail = JSON.parse(fs.readFileSync(path.join(ROOT, TAIL_BASELINE), 'utf8'));
  const [{ clipHexRay }, { clipPillars }] = await Promise.all([
    import(pathToFileURL(path.join(ROOT, 'js/xianxia/TowerArena.js')).href),
    import(pathToFileURL(path.join(ROOT, 'js/xianxia/TowerObstacles.js')).href),
  ]);
  for (const f of CASES) {
    const p = f.origin || { x: 33, y: -60 }, angle = f.angle * Math.PI / 180;
    f.expectedLength = clipPillars(p, Math.cos(angle), Math.sin(angle),
      clipHexRay(p, Math.cos(angle), Math.sin(angle), f.reach, f.width / 2), f.width / 2);
  }
  const report = { status: 'RUNNING', generatedAt: new Date().toISOString(),
    scope: 'Production SwordTiandiArt, approved atlas, 0.75s visual window, unchanged real TowerRun combat and character motion. No presentation injection.',
    buildIndexModifiedAt: fs.statSync(path.join(ROOT, corePaths[0])).mtime.toISOString(),
    contract: CFG, approvedTailBaseline: TAIL_BASELINE,
    sourceBefore: before, sourceAfter: null, sourcesUnchanged: null,
    cases: [], atlases: [], lifecycle: [], recordings: [], fallback: null, errors: [] };
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
    '.png': 'image/png', '.css': 'text/css', '.wasm': 'application/wasm' };
  const server = createServer((req, res) => {
    const file = path.resolve(ROOT, '.' + decodeURIComponent(new URL(req.url, 'http://local').pathname));
    if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (error, bytes) => {
      if (error) { res.writeHead(404).end(); return; }
      res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream'); res.end(bytes);
    });
  });
  let browser, loadedAssetUrl;
  try {
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    const url = `http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`;
    browser = await chromium.launch({ headless: true, executablePath: process.env.UI_CHROMIUM_EXECUTABLE ||
      '/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell' });
    for (const viewport of [{ width: 1280, height: 720 }, { width: 844, height: 390 }]) {
      const context = await browser.newContext({ viewport }), page = await context.newPage(), responses = new Map();
      page.on('response', response => responses.set(response.url(), response));
      await installFixture(page, url, report.errors);
      await page.evaluate(() => window.__prepareLine({ rank: 10, reach: 770, angle: 0 }));
      await page.waitForFunction(() => {
        const h = window.__towerTest.host;
        return h.tiandiArt?.ready && h.characterArt.body?.spriteFrame && h.environmentArt.nodes.get('floor')?.active;
      });
      await installTelemetry(page);
      const atlas = await page.evaluate(() => {
        const h = window.__towerTest.host, a = h.tiandiArt;
        return { image: a.image.url, width: a.image.width, height: a.image.height,
          frames: a.frames.map(f => ({ x: f.rect.x, y: f.rect.y, width: f.rect.width, height: f.rect.height })),
          layers: h.battle.children.map(n => n.name), layerName: h.tiandiLayer.name };
      });
      loadedAssetUrl = new URL(atlas.image, url).href;
      const response = responses.get(loadedAssetUrl); assert.ok(response?.ok(), 'Production texture loaded over HTTP');
      atlas.network = { url: loadedAssetUrl, status: response.status(), sha256: sha(await response.body()) };
      assert.equal(atlas.network.sha256, before[ASSET]);
      assert.equal(atlas.width, CFG.atlasSize[0]); assert.equal(atlas.height, CFG.atlasSize[1]);
      assert.equal(atlas.frames.length, 16); assert.equal(new Set(atlas.frames.map(f => `${f.x}:${f.y}`)).size, 16);
      assert.ok(atlas.frames.every(f => f.width === 1024 && f.height === 192));
      const layer = atlas.layers.indexOf(atlas.layerName);
      assert.ok(layer > atlas.layers.indexOf('青石地面')); assert.ok(layer < atlas.layers.indexOf('妖兽静态素材'));
      assert.ok(layer < atlas.layers.indexOf('攻击预警')); report.atlases.push({ viewport, ...atlas });
      for (const fixture of CASES) {
        await page.evaluate(f => window.__prepareTiandi(f), fixture);
        const result = await page.evaluate(f => {
          const h = window.__towerTest.host, s = h.run.state, q = window.__tiandiQA;
          let lock = null, beforeMove = null, afterMove = null, release = null;
          for (let tick = 0; tick < 75; tick++) {
            window.__stepTiandi();
            if (f.moving && s.time >= .16 && !beforeMove) {
              beforeMove = { player: { ...s.player }, cast: { ...s.casts[0], castContext: undefined } };
              s.player.x += 18; s.player.y += 24; s.enemies[0].x += 32; s.enemies[0].y += 20; h.draw();
            }
            const cast = s.casts.find(c => c.formId === 'evo_tiandi');
            if (cast?.locked && !lock) {
              lock = { ...cast, castContext: undefined };
              if (f.moving) { s.player.x += 120; s.player.y -= 40; afterMove = { player: { ...s.player } }; h.draw(); }
            }
            const effect = Array.from(q.effects.values())[0];
            if (effect) { release = { effect, view: q.read() }; break; }
          }
          if (!release) throw new Error('No real tiandi release');
          const state = JSON.stringify(s); q.fallbackCalls = 0; h.draw();
          const view = q.read(), fallbackCalls = q.fallbackCalls; h.draw();
          return { lock, beforeMove, afterMove, release, view, fallbackCalls,
            drawUnchanged: state === JSON.stringify(s), state };
        }, fixture);
        const e = result.release.effect;
        assert.equal(e.kind, 'tiandi'); assert.equal(e.source, 'evo_tiandi');
        assert.equal(e.pulseCount, 1); assert.equal(e.pulseIndex, 1); near(e.width, fixture.width, 'skill width');
        near(result.lock.lockAt - result.lock.startedAt, .30, 'lock after .30s');
        near(e.x, result.lock.x, 'locked origin x'); near(e.y, result.lock.y, 'locked origin y');
        near(e.dirX, result.lock.dirX, 'locked direction x'); near(e.dirY, result.lock.dirY, 'locked direction y');
        near(e.reach, clipPillars(e, e.dirX, e.dirY,
          clipHexRay(e, e.dirX, e.dirY, fixture.reach, fixture.width / 2), fixture.width / 2), 'clipped length');
        if (fixture.clipped) assert.ok(e.reach < fixture.reach / 2);
        if (fixture.moving) { assert.notEqual(result.beforeMove.cast.x, result.lock.x); assert.notEqual(result.afterMove.player.x, e.x); }
        assert.ok(result.drawUnchanged); assert.equal(result.fallbackCalls, 0);
        assertActor(result.view.actors.find(a => a.id === e.id), e, result.view);
        await page.waitForTimeout(100);
        const paused = await page.evaluate(() => ({ view: window.__tiandiQA.read(), state: JSON.stringify(window.__towerTest.host.run.state) }));
        assert.deepEqual(paused.view, result.view); assert.equal(paused.state, result.state);
        await page.screenshot({ path: path.join(OUT, `${fixture.name}-${viewport.width}-impact.png`) });
        const later = await page.evaluate(() => {
          const q = window.__tiandiQA;
          for (let i = 0; i < 60; i++) window.__stepTiandi();
          return { history: q.history, effects: Array.from(q.effects.values()), events: q.events, hits: q.hits, view: q.read() };
        });
        assert.equal(later.effects.length, 1); assert.equal(later.hits.length, 1);
        assert.equal(later.events.length, 2, 'Start and lock use one attack timeline');
        near(later.events[0].event.startedAt, later.events[1].event.startedAt, 'lock preserves attack start');
        near(later.events[0].event.releaseAt, later.events[1].event.releaseAt, 'lock preserves release');
        near(later.events[0].event.releaseAt - later.events[0].event.startedAt, .45, 'windup .45s');
        assert.equal(later.view.actors.length, 0); assert.equal(later.view.tracks.length, 0);
        const phases = later.history.filter(v => v.time >= e.startedAt && v.time - e.startedAt < .75);
        const phaseChecks = phases.map(v => {
          assertActor(v.actors.find(a => a.id === e.id), e, v);
          return { age: v.time - e.startedAt, frameIndex: v.actors.find(a => a.id === e.id).frameIndex };
        });
        assert.ok(phaseChecks.some(v => v.age > .5 && v.age < .65 && v.frameIndex < 15), 'Visible tail beyond .5s');
        const tail = phases.filter(v => v.time - e.startedAt > .25);
        assert.ok(tail.length > 20); assert.ok(tail.every(v => !v.effects.some(x => x.id === e.id) && v.actors.some(a => a.id === e.id)));
        for (const v of later.history.filter(v => v.time - e.startedAt >= .75))
          assert.ok(!v.actors.some(a => a.id === e.id), 'Sprite expires at .75s');
        for (let i = 1; i < later.history.length; i++) {
          const p = later.history[i - 1].character, n = later.history[i].character;
          if (p.ordinal >= 0 && n.ordinal >= 0 && p.attack?.start === n.attack?.start)
            assert.ok(n.ordinal >= p.ordinal, 'Character cannot rewind at lock or release');
        }
        const prior = baseline.cases.find(c => c.fixture?.name === fixture.name && c.viewport.width === viewport.width);
        assert.ok(prior, 'Original character-motion baseline exists');
        const oldPoses = new Map(prior.history.map(v => [Math.round(v.time * 6000), v.character]));
        let bodyUnchangedSamples = 0;
        for (const v of later.history) {
          const p = oldPoses.get(Math.round(v.time * 6000)); if (!p) continue;
          assert.equal(v.character.ordinal, p.ordinal, 'Body timing unchanged');
          assert.equal(v.character.index, p.index, 'Body source pose unchanged'); bodyUnchangedSamples++;
        }
        assert.ok(bodyUnchangedSamples > 20);
        const approvedCase = approvedTail.cases.find(c => c.fixture?.name === fixture.name && c.viewport.width === viewport.width);
        assert.ok(approvedCase, 'Approved slow-tail rehearsal exists');
        const approvedViews = new Map(approvedCase.history.map(v => [Math.round(v.time * 6000), v]));
        let approvedTailSamples = 0;
        for (const v of later.history) {
          const old = approvedViews.get(Math.round(v.time * 6000)); if (!old) continue;
          assert.deepEqual(v.actors.map(a => a.id), old.actors.map(a => a.id), 'Approved tail sprite lifetimes');
          for (const actor of v.actors) {
            const previous = old.actors.find(a => a.id === actor.id);
            for (const key of ['x', 'y', 'angle', 'width', 'height', 'anchorX', 'anchorY'])
              near(actor[key], previous[key], `Approved tail ${key}`);
            assert.equal(actor.frameIndex, previous.frameIndex, 'Approved tail frame phase');
          }
          assert.equal(v.character.index, old.character.index, 'Approved tail character pose');
          assert.equal(v.character.ordinal, old.character.ordinal, 'Approved tail character phase');
          approvedTailSamples++;
        }
        assert.ok(approvedTailSamples > 80, 'Enough samples to cover complete approved timeline');
        delete result.state;
        report.cases.push({ viewport, fixture, ...result, ...later, pauseVerified: true, phaseChecks, bodyUnchangedSamples, approvedTailSamples });
      }
      report.lifecycle.push(await checkSceneLifecycle(page, CASES[3], viewport, OUT));
      if (viewport.width === 1280) for (const rank of [1, 2]) report.recordings.push(await recordRank(page, rank, OUT));
      report.lifecycle.push({ viewport, finalCleanup: await checkCleanup(page) }); await context.close();
    }
    const context = await browser.newContext({ viewport: { width: 844, height: 390 } });
    const blockedPath = new URL(loadedAssetUrl).pathname, blocked = [], warnings = [];
    await context.route('**/*', route => {
      if (new URL(route.request().url()).pathname === blockedPath) {
        blocked.push(route.request().url()); return route.fulfill({ status: 404, body: '' });
      }
      return route.continue();
    });
    const page = await context.newPage();
    page.on('console', message => { if (message.type() === 'warning') warnings.push(message.text()); });
    await installFixture(page, url, report.errors);
    await page.evaluate(() => window.__prepareLine({ rank: 10, reach: 770, angle: 0 }));
    await installTelemetry(page); await page.evaluate(f => window.__prepareTiandi(f), CASES[0]);
    for (let i = 0; i < 80 && !warnings.some(m => /tiandi.*atlas unavailable/i.test(m)); i++)
      await page.waitForTimeout(100);
    assert.ok(blocked.length > 0); assert.ok(warnings.some(m => /tiandi.*atlas unavailable/i.test(m)), 'Loader settles to vector fallback');
    const fallback = await page.evaluate(() => {
      const q = window.__tiandiQA, h = window.__towerTest.host;
      for (let i = 0; i < 75 && q.effects.size === 0; i++) window.__stepTiandi();
      if (q.effects.size !== 1) throw new Error('No real fallback release');
      q.fallbackCalls = 0; const state = JSON.stringify(h.run.state); h.draw();
      return { ready: h.tiandiArt.ready, actorCount: h.tiandiArt.actors.size,
        fallbackCalls: q.fallbackCalls, readOnly: state === JSON.stringify(h.run.state),
        effects: Array.from(q.effects.values()), hits: q.hits };
    });
    assert.equal(fallback.ready, false); assert.equal(fallback.actorCount, 0);
    assert.equal(fallback.fallbackCalls, 1); assert.ok(fallback.readOnly);
    assert.equal(fallback.effects.length, 1); assert.equal(fallback.hits.length, 1);
    await page.waitForFunction(() => window.__towerTest.host.environmentArt.nodes.get('floor')?.active);
    await page.screenshot({ path: path.join(OUT, 'asset-failure-vector-fallback-844.png') });
    report.fallback = { ...fallback, blockedPath, blockedRequests: blocked.length, warnings, cleanup: await checkCleanup(page) };
    await context.close(); assert.deepEqual(report.errors, []); report.status = 'PASS';
  } catch (error) {
    report.status = 'FAIL'; report.error = error.stack; process.exitCode = 1;
  } finally {
    report.sourceAfter = sourceHashes();
    report.sourcesUnchanged = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter);
    if (!report.sourcesUnchanged) { report.status = 'FAIL'; report.sourceMutationError = 'Source changed during QA'; process.exitCode = 1; }
    await browser?.close();
    if (server.listening) await new Promise(resolve => server.close(resolve));
    fs.writeFileSync(path.join(OUT, 'browser.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(`${report.status}: ${report.cases.length} production cases, ${report.atlases.length} atlas checks; ${OUT}`);
    if (report.error) console.error(report.error);
  }
}
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { CASES, expectedFrame, installTelemetry };
