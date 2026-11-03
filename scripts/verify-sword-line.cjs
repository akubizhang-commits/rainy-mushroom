'use strict';
// Actual Cocos build verification. Fixtures only select loadouts and place an
// immobilized authored enemy in smoke=1 memory training. Every line effect and
// pulse ID comes from TowerRun.advance(), never a fabricated presentation event.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { createServer } = require('node:http');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ||
  '/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'design/xianxia-yixiantian-v2-2026-10-30/integration');
const CASES = [
  { name: 'rank1-right', rank: 1, angle: 0, pulses: 1, reach: 360 },
  { name: 'rank1-up', rank: 1, angle: 90, pulses: 1, reach: 360 },
  { name: 'rank1-left', rank: 1, angle: 180, pulses: 1, reach: 360 },
  { name: 'rank1-diagonal', rank: 1, angle: 45, pulses: 1, reach: 360 },
  { name: 'rank6-two-locked-origin', rank: 6, angle: 0, pulses: 2, reach: 450, moveAfterFirst: true },
  { name: 'rank10-three-locked-origin', rank: 10, angle: 0, pulses: 3, reach: 510, moveAfterFirst: true },
  { name: 'pillar-clipped', rank: 1, angle: 90, pulses: 1, reach: 360, origin: { x: 33, y: 120 }, clipped: true },
  { name: 'boundary-clipped', rank: 1, angle: 0, pulses: 1, reach: 360, origin: { x: 850, y: 0 }, clipped: true },
];
const near = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-4,
  `${message}: ${actual} != ${expected}`);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const expectedFrame = age => Math.min(15, Math.floor((age <= .05 ? age : .05 + (age - .05) * .20 / .28) / .25 * 16));
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
  '.png': 'image/png', '.css': 'text/css', '.wasm': 'application/wasm' };

async function installFixture(page, url, errors) {
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    window.__lineWrites = [];
    for (const method of ['setItem', 'removeItem', 'clear']) {
      const original = Storage.prototype[method];
      Storage.prototype[method] = function (...args) {
        window.__lineWrites.push({ method, key: args[0] });
        return original.apply(this, args);
      };
    }
  });
  await page.goto(url);
  await page.waitForFunction(() => !!window.__towerTest?.host?.menu);
  await page.evaluate(() => {
    const h = window.__towerTest.host;
    window.__lineInitial = { store: JSON.stringify(window.__towerTest.state()),
      storage: JSON.stringify(localStorage), startupProbe: window.__lineWrites.splice(0) };
    window.__prepareLine = fixture => {
      if (h.run) h.withdraw();
      h.campElapsed = 0; h.enterTraining(); h.run.pause();
      const run = h.run, s = run.state, p = s.player, template = s.pending[0];
      if (!template) throw new Error('Missing authored enemy template');
      s.arenaVersion = 1; s.loadout.growthVersion = 1;
      s.loadout.active = { sj_line: fixture.rank };
      s.loadout.passive = {}; s.loadout.evolutions = []; s.loadout.evolutionLevels = {};
      s.cooldowns = { sj_line: 0 };
      s.casts = []; s.zones = []; s.effects = []; s.projectiles = [];
      p.x = fixture.origin?.x ?? 33; p.y = fixture.origin?.y ?? -60;
      const angle = fixture.angle * Math.PI / 180;
      p.faceX = Math.cos(angle); p.faceY = Math.sin(angle);
      const distance = Math.min(100, (fixture.expectedLength ?? fixture.reach) / 2);
      const enemy = run._enemy({ ...template, id: 'line-qa-target',
        x: p.x + Math.cos(angle) * distance, y: p.y + Math.sin(angle) * distance });
      enemy.hp = enemy.maxHp = 1e8; enemy.moveSpeed = 0;
      enemy.ai.readyAt = enemy.ai.graceUntil = enemy.ai.entryUntil = 1e8;
      s.enemies = [enemy]; s.pending = []; s.reserved = []; s.drops = [];
      s.wavePlanned = 1; s.waveKilled = 0;
      h.characterArt.reset();
      window.__lineCastEvents = []; window.__lineRealEffects = new Map(); window.__lineHistory = [];
      window.__lineFallbackCalls = 0;
      if (!h.skillEffects.__lineQaOriginalItem) {
        h.skillEffects.__lineQaOriginalItem = h.skillEffects.item;
        h.skillEffects.item = function (...args) {
          if (args[1]?.kind === 'line' && args[1]?.source === 'sj_line' && !args[1]?.hostile)
            window.__lineFallbackCalls++;
          return this.__lineQaOriginalItem.apply(this, args);
        };
      }
      window.__lineView = () => {
        const art = h.lineArt, state = h.run.state;
        return { time: state.time, camera: { ...h.camera },
          actors: Array.from(art.actors, ([id, actor]) => ({
            id, x: actor.node.position.x, y: actor.node.position.y,
            angle: actor.node.angle, width: actor.ui.width, height: actor.ui.height,
            anchorX: actor.ui.anchorX, anchorY: actor.ui.anchorY,
            frameIndex: art.frames.indexOf(actor.sprite.spriteFrame),
            image: actor.sprite.spriteFrame?.texture?.image?.url,
          })),
          trackIds: Array.from(art.tracks.keys()),
          effects: state.effects.filter(e => e.kind === 'line' && e.source === 'sj_line').map(e => ({ ...e })),
        };
      };
      window.__stepLine = () => {
        const before = h.characterArt.sample(s);
        run.resume();
        run.advance(1 / 60, event => { window.__lineCastEvents.push(event); h.characterArt.observeCast(event); });
        run.pause(); h.characterArt.observe(before, s);
        for (const effect of s.effects) if (effect.kind === 'line' && effect.source === 'sj_line')
          window.__lineRealEffects.set(effect.id, { ...effect });
        h.draw(); window.__lineHistory.push(window.__lineView());
      };
      h.draw();
    };
  });
}
async function cleanup(page) {
  return page.evaluate(() => {
    const h = window.__towerTest.host, art = h.lineArt, battle = h.battle;
    h.withdraw();
    return { actorsCleared: art.actors.size === 0, tracksCleared: art.tracks.size === 0,
      layerCleared: h.lineLayer === null, runCleared: h.run === null,
      battleDetached: !battle.parent || !cc.isValid(battle, true),
      storeUnchanged: JSON.stringify(window.__towerTest.state()) === window.__lineInitial.store,
      storageUnchanged: JSON.stringify(localStorage) === window.__lineInitial.storage,
      writes: window.__lineWrites, startupProbe: window.__lineInitial.startupProbe };
  });
}
function assertCleanup(result) {
  for (const [key, value] of Object.entries(result))
    if (!['writes', 'startupProbe'].includes(key)) assert.equal(value, true, key);
  assert.deepEqual(result.writes, []);
}
function assertActor(actor, effect, view, fixture) {
  assert.ok(actor, 'Every real pulse needs its own sprite ID');
  const length = Math.hypot(effect.toX - effect.x, effect.toY - effect.y);
  near(length, fixture.expectedLength, 'actual obstacle-clipped release length');
  near(actor.x, effect.x - view.camera.x, 'origin X');
  near(actor.y, effect.y - view.camera.y, 'origin Y');
  near(Math.abs(actor.angle), fixture.angle, 'direction');
  near(actor.width, length * 928 / 896, 'independent length scaling');
  near(actor.height, effect.width * 116 / 72, 'independent corridor width scaling');
  near(actor.anchorX, 16 / 928, 'source origin anchor X'); near(actor.anchorY, .5, 'source origin anchor Y');
  near(effect.width, 28, 'rank must not widen the corridor');
  const angle = actor.angle * Math.PI / 180;
  // Source visible endpoint is 896 px from source origin in a 928 px crop.
  near(actor.x + Math.cos(angle) * actor.width * 896 / 928, effect.toX - view.camera.x, 'visible endpoint X');
  near(actor.y + Math.sin(angle) * actor.width * 896 / 928, effect.toY - view.camera.y, 'visible endpoint Y');
  assert.equal(actor.frameIndex, expectedFrame(view.time - effect.startedAt), 'piecewise tail timeline');
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const [{ clipHexRay }, { clipPillars }] = await Promise.all([
    import(pathToFileURL(path.join(ROOT, 'js/xianxia/TowerArena.js')).href),
    import(pathToFileURL(path.join(ROOT, 'js/xianxia/TowerObstacles.js')).href),
  ]);
  for (const fixture of CASES) {
    const origin = fixture.origin ?? { x: 33, y: -60 }, a = fixture.angle * Math.PI / 180;
    fixture.expectedLength = clipPillars(origin, Math.cos(a), Math.sin(a),
      clipHexRay(origin, Math.cos(a), Math.sin(a), fixture.reach, 14), 14);
    if (fixture.clipped) assert.ok(fixture.expectedLength < fixture.reach / 2);
  }
  const server = createServer((req, res) => {
    const file = path.resolve(ROOT, '.' + decodeURIComponent(new URL(req.url, 'http://local').pathname));
    if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (error, bytes) => {
      if (error) { res.writeHead(404).end(); return; }
      res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream'); res.end(bytes);
    });
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const url = `http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`;
  const report = { status: 'RUNNING', generatedAt: new Date().toISOString(),
    buildIndexModifiedAt: fs.statSync(path.join(ROOT, 'cocos-pilot/build/web-mobile/index.html')).mtime.toISOString(),
    scope: 'Existing paid line atlas; 0.25s source release and 0.33s visual lifetime. Gameplay is unmodified.',
    fixture: 'Controlled loadout and immobilized authored enemy in memory training; real TowerRun.advance releases.',
    cases: [], atlases: [], cleanup: [], fallback: null, errors: [] };
  let browser, loadedAssetUrl;
  try {
    browser = await chromium.launch({ headless: true, executablePath: process.env.UI_CHROMIUM_EXECUTABLE ||
      '/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell' });
    for (const viewport of [{ width: 1280, height: 720 }, { width: 844, height: 390 }]) {
      const context = await browser.newContext({ viewport }), page = await context.newPage();
      const loadedResponses = new Map();
      page.on('response', response => loadedResponses.set(response.url(), response));
      await installFixture(page, url, report.errors);
      await page.evaluate(f => window.__prepareLine(f), CASES[0]);
      await page.waitForFunction(() => window.__towerTest.host.lineArt?.ready);
      await page.waitForFunction(() => !!window.__towerTest.host.environmentArt.nodes.get('floor')?.active);
      const atlas = await page.evaluate(() => {
        const h = window.__towerTest.host, art = h.lineArt;
        return { image: art.image.url, width: art.image.width, height: art.image.height,
          frames: art.frames.map(f => ({ x: f.rect.x, y: f.rect.y, width: f.rect.width, height: f.rect.height })),
          layers: h.battle.children.map(n => n.name) };
      });
      loadedAssetUrl = atlas.image;
      const nativeUrl = new URL(atlas.image, url).href, response = loadedResponses.get(nativeUrl);
      assert.ok(response?.ok(), 'Rendered texture must have a successful native image response');
      const delivered = await response.body();
      const source = fs.readFileSync(path.join(ROOT, 'cocos-pilot/assets/resources/tower-skill-fx/sword-line-v1.png'));
      atlas.network = { url: nativeUrl, status: response.status(), bytes: delivered.length,
        sha256: sha256(delivered), sourceSha256: sha256(source) };
      assert.equal(atlas.network.sha256, atlas.network.sourceSha256, 'Delivered texture differs from approved runtime atlas');
      assert.equal(atlas.width, 4096); assert.equal(atlas.height, 512); assert.equal(atlas.frames.length, 16);
      assert.equal(new Set(atlas.frames.map(f => `${f.x}:${f.y}`)).size, 16);
      assert.ok(atlas.frames.every(f => f.width === 1024 && f.height === 128));
      const layer = atlas.layers.indexOf('剑破虚空特效层');
      assert.ok(layer > atlas.layers.indexOf('青石地面'), 'line VFX above floor');
      assert.ok(layer < atlas.layers.indexOf('妖兽静态素材'), 'line VFX below actors');
      assert.ok(layer < atlas.layers.indexOf('攻击预警'), 'line VFX below warnings');
      report.atlases.push({ viewport, ...atlas });

      for (const fixture of CASES) {
        await page.evaluate(f => window.__prepareLine(f), fixture);
        const captures = [];
        for (let pulse = 1; pulse <= fixture.pulses; pulse++) {
          const result = await page.evaluate(pulse => {
            const h = window.__towerTest.host, s = h.run.state;
            let effect;
            for (let tick = 0; tick < 90; tick++) {
              window.__stepLine();
              effect = Array.from(window.__lineRealEffects.values()).find(e => e.pulseIndex === pulse);
              if (effect) break;
            }
            if (!effect) throw new Error(`No real line release ${pulse}`);
            window.__stepLine(); window.__stepLine();
            const before = JSON.stringify(s); window.__lineFallbackCalls = 0; h.draw();
            const view = window.__lineView(), fallbackCount = window.__lineFallbackCalls;
            h.draw();
            return { effect, view, fallbackCount, redrawUnchanged: JSON.stringify(s) === before,
              snapshot: before, castEvents: window.__lineCastEvents };
          }, pulse);
          assert.ok(result.redrawUnchanged);
          assert.equal(result.effect.source, 'sj_line'); assert.equal(result.effect.kind, 'line');
          assert.equal(result.effect.pulseIndex, pulse); assert.equal(result.effect.pulseCount, fixture.pulses);
          assert.equal(result.fallbackCount, 0, 'Loaded sprite should suppress only its vector line');
          assertActor(result.view.actors.find(a => a.id === result.effect.id), result.effect, result.view, fixture);
          if (pulse > 1) {
            assert.ok(result.view.actors.length >= 2, 'Adjacent releases require independent overlapping tracks');
            near(result.effect.x, captures[0].effect.x, 'same-volley locked origin X');
            near(result.effect.y, captures[0].effect.y, 'same-volley locked origin Y');
            near(result.effect.dirX, captures[0].effect.dirX, 'same-volley locked direction X');
            near(result.effect.dirY, captures[0].effect.dirY, 'same-volley locked direction Y');
          }
          await page.waitForTimeout(100);
          assert.deepEqual(await page.evaluate(() => window.__lineView()), result.view, 'Pause freezes phase and position');
          assert.equal(await page.evaluate(() => JSON.stringify(window.__towerTest.host.run.state)), result.snapshot);
          await page.screenshot({ path: path.join(OUT, `${fixture.name}-pulse${pulse}-${viewport.width}.png`) });
          delete result.snapshot; captures.push(result);
          if (fixture.moveAfterFirst && pulse === 1) await page.evaluate(() => {
            const h = window.__towerTest.host, p = h.run.state.player;
            p.x += 37; p.y -= 24; p.faceX = 0; p.faceY = -1; h.draw();
          });
        }
        if (fixture.name === 'rank1-right' && viewport.width === 1280) {
          const before = await page.evaluate(() => window.__lineView());
          await page.setViewportSize({ width: 1100, height: 620 });
          await page.waitForTimeout(150);
          const resized = await page.evaluate(() => window.__lineView());
          assert.deepEqual(resized, before, 'Resize preserves simulation phase and rebinds the same line');
          await page.setViewportSize(viewport); await page.waitForTimeout(150);
          assert.deepEqual(await page.evaluate(() => window.__lineView()), before);
          // Rebuilding a paused training scene intentionally shows its menu.
          // Hide only that fixture's overlay for unobstructed VFX evidence;
          // simulation and sprite phases stay paused and unchanged.
          const pauseOverlayHiddenForScreenshot = await page.evaluate(() => {
            const overlay = window.__towerTest.host.overlay;
            if (!overlay) return false;
            overlay.active = false; return true;
          });
          report.resize = { from: viewport, to: { width: 1100, height: 620 }, before, resized,
            pauseOverlayHiddenForScreenshot };
        }
        const ending = await page.evaluate(() => {
          const h = window.__towerTest.host, s = h.run.state, id = Array.from(window.__lineRealEffects.keys()).at(-1);
          const before = window.__lineView(), oldX = s.player.x, oldY = s.player.y;
          s.player.x += 27; s.player.y -= 19; h.draw();
          const moved = window.__lineView();
          s.player.x = oldX; s.player.y = oldY; h.draw();
          const restored = window.__lineView();
          for (let i = 0; i < 23; i++) {
            window.__stepLine();
            if (!s.effects.some(e => e.id === id) && h.lineArt.actors.has(id)) break;
          }
          return { id, before, moved, restored, tail: window.__lineView() };
        });
        assert.ok(ending.tail.actors.some(a => a.id === ending.id));
        assert.ok(!ending.tail.effects.some(e => e.id === ending.id));
        const tailFile = `${fixture.name}-tail-${fixture.name === 'rank1-right' && viewport.width === 1280 ? 'unobstructed-' : ''}${viewport.width}.png`;
        await page.screenshot({ path: path.join(OUT, tailFile) });
        ending.tailScreenshot = tailFile;
        Object.assign(ending, await page.evaluate(() => {
          for (let i = 0; i < 12; i++) window.__stepLine();
          return { expired: window.__lineView(), realEffects: Array.from(window.__lineRealEffects.values()),
            history: window.__lineHistory, events: window.__lineCastEvents };
        }));
        const previous = ending.before.actors.find(a => a.id === ending.id);
        const moved = ending.moved.actors.find(a => a.id === ending.id);
        near(moved.x, previous.x - 27, 'camera X'); near(moved.y, previous.y + 19, 'camera Y');
        assert.equal(moved.frameIndex, previous.frameIndex); assert.deepEqual(ending.restored, ending.before);
        assert.equal(ending.realEffects.length, fixture.pulses);
        assert.equal(new Set(ending.realEffects.map(e => e.id)).size, fixture.pulses);
        for (const effect of ending.realEffects) {
          const tail = ending.history.filter(v => v.time - effect.startedAt >= .25 &&
            v.time - effect.startedAt < .33 && !v.effects.some(e => e.id === effect.id));
          assert.ok(tail.length >= 3, 'Visual tail must survive removed 0.25s source effects');
          for (const view of tail) assertActor(view.actors.find(a => a.id === effect.id), effect, view, fixture);
          for (const view of ending.history.filter(v => v.time - effect.startedAt >= .33))
            assert.ok(!view.actors.some(a => a.id === effect.id), 'Sprite must expire at 0.33s');
        }
        assert.equal(ending.expired.actors.length, 0); assert.equal(ending.expired.trackIds.length, 0);
        report.cases.push({ viewport, fixture, captures, ending });
      }
      const closed = await cleanup(page); assertCleanup(closed); report.cleanup.push({ viewport, ...closed });
      await context.close();
    }

    const context = await browser.newContext({ viewport: { width: 844, height: 390 } });
    const blockedPath = new URL(loadedAssetUrl, url).pathname, blocked = [], warnings = [];
    await context.route('**/*', route => {
      if (new URL(route.request().url()).pathname === blockedPath) {
        blocked.push(route.request().url()); return route.fulfill({ status: 404, body: '' });
      }
      return route.continue();
    });
    const page = await context.newPage();
    page.on('console', m => { if (m.type() === 'warning') warnings.push(m.text()); });
    await installFixture(page, url, report.errors);
    await page.evaluate(f => window.__prepareLine(f), CASES[0]);
    await page.waitForFunction(() => window.__towerTest.host.lineArt?.requested);
    for (let i = 0; i < 80 && !warnings.some(m => m.includes('atlas unavailable')); i++)
      await page.waitForTimeout(100);
    assert.ok(blocked.length > 0, 'Expected failed native atlas requests');
    assert.ok(warnings.some(m => m.includes('atlas unavailable')), 'Loader must settle to fallback');
    const fallback = await page.evaluate(() => {
      const h = window.__towerTest.host, s = h.run.state;
      for (let tick = 0; tick < 90 && !s.effects.some(e => e.kind === 'line'); tick++) window.__stepLine();
      if (!s.effects.some(e => e.kind === 'line')) throw new Error('No real fallback line release');
      window.__lineFallbackCalls = 0;
      const before = JSON.stringify(s); h.draw();
      return { ready: h.lineArt.ready, actorCount: h.lineArt.actors.size,
        fallbackCalls: window.__lineFallbackCalls, readOnly: JSON.stringify(s) === before,
        realEffects: Array.from(window.__lineRealEffects.values()) };
    });
    assert.equal(fallback.ready, false); assert.equal(fallback.actorCount, 0);
    assert.equal(fallback.fallbackCalls, 1); assert.ok(fallback.readOnly); assert.equal(fallback.realEffects.length, 1);
    await page.waitForFunction(() => !!window.__towerTest.host.environmentArt.nodes.get('floor')?.active);
    await page.screenshot({ path: path.join(OUT, 'asset-failure-vector-fallback-844.png') });
    const closed = await cleanup(page); assertCleanup(closed);
    report.fallback = { ...fallback, blockedPath, blockedRequests: blocked.length, warnings, cleanup: closed };
    await context.close();
    assert.deepEqual(report.errors, []); report.status = 'PASS';
  } catch (error) {
    report.status = 'FAIL'; report.error = error.stack; process.exitCode = 1;
  } finally {
    await browser?.close(); await new Promise(resolve => server.close(resolve));
    fs.writeFileSync(path.join(OUT, 'browser.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(`${report.status}: ${report.cases.length} real combat cases, ${report.atlases.length} landscape atlas checks`);
    if (report.error) console.error(report.error);
  }
}
module.exports = { installFixture, cleanup, assertCleanup, CASES };
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
