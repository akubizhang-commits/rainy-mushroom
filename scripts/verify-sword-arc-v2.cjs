'use strict';
// Verify the approved open-arc atlas in the actual built Cocos scene.
// Combat cases use real run.advance() events. Only loadout/enemy placement is
// controlled in a fresh smoke=1 memory session. No campaign save is modified.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { createServer } = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ||
  '/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'design/xianxia-sword-arc-v2-2026-10-30/integration');
const CASES = [
  { name: 'rank1-right', rank: 1, angle: 0, pulses: 1 },
  { name: 'rank1-up', rank: 1, angle: 90, pulses: 1 },
  { name: 'rank1-left', rank: 1, angle: 180, pulses: 1 },
  { name: 'rank1-diagonal', rank: 1, angle: 45, pulses: 1 },
  { name: 'rank10-three', rank: 10, angle: 0, pulses: 3 },
];
const near = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-4,
  `${message}: ${actual} != ${expected}`);
const pngType = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
  '.png': 'image/png', '.css': 'text/css', '.wasm': 'application/wasm' };

async function installFixture(page, url, errors) {
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    window.__arcWrites = [];
    for (const method of ['setItem', 'removeItem', 'clear']) {
      const original = Storage.prototype[method];
      Storage.prototype[method] = function (...args) {
        window.__arcWrites.push({ method, key: args[0] });
        return original.apply(this, args);
      };
    }
  });
  await page.goto(url);
  await page.waitForFunction(() => !!window.__towerTest?.host?.menu);
  await page.evaluate(() => {
    const h = window.__towerTest.host;
    window.__arcInitial = { store: JSON.stringify(window.__towerTest.state()),
      storage: JSON.stringify(localStorage), startupProbe: window.__arcWrites.splice(0) };
    window.__prepareArc = fixture => {
      if (h.run) h.withdraw();
      h.campElapsed = 0; h.enterTraining(); h.run.pause();
      const run = h.run, s = run.state, p = s.player, template = s.pending[0];
      if (!template) throw new Error('Missing authored enemy template');
      s.arenaVersion = 1;
      s.loadout.growthVersion = 1;
      s.loadout.active = { sj_arc: fixture.rank };
      s.loadout.passive = {}; s.loadout.evolutions = []; s.loadout.evolutionLevels = {};
      s.cooldowns = { sj_arc: 0 };
      s.casts = []; s.zones = []; s.effects = []; s.projectiles = [];
      const angle = fixture.angle * Math.PI / 180;
      p.faceX = Math.cos(angle); p.faceY = Math.sin(angle);
      const enemy = run._enemy({ ...template, id: 'arc-qa-target',
        x: p.x + Math.cos(angle) * 100, y: p.y + Math.sin(angle) * 100 });
      enemy.hp = enemy.maxHp = 1e8; enemy.moveSpeed = 0;
      enemy.ai.readyAt = enemy.ai.graceUntil = enemy.ai.entryUntil = 1e8;
      s.enemies = [enemy]; s.pending = []; s.reserved = []; s.drops = [];
      s.wavePlanned = 1; s.waveKilled = 0;
      h.characterArt.reset();
      window.__arcCastEvents = [];
      window.__arcRealEffects = new Map();
      window.__arcHistory = [];
      window.__arcFallbackCalls = 0;
      const crescent = h.skillEffects.crescent;
      h.skillEffects.crescent = function (...args) {
        window.__arcFallbackCalls++;
        return crescent.apply(this, args);
      };
      window.__arcView = () => {
        const art = h.arcArt, state = h.run.state;
        return { time: state.time, camera: { ...h.camera },
          actors: Array.from(art.actors, ([id, actor]) => ({
            id, x: actor.node.position.x, y: actor.node.position.y,
            angle: actor.node.angle, width: actor.ui.width, height: actor.ui.height,
            frameIndex: art.frames.indexOf(actor.sprite.spriteFrame),
            image: actor.sprite.spriteFrame?.texture?.image?.url,
          })),
          trackIds: Array.from(art.tracks.keys()),
          effects: state.effects.filter(effect => effect.kind === 'arc').map(effect => ({ ...effect })),
        };
      };
      window.__stepArc = () => {
        const before = h.characterArt.sample(s);
        run.resume();
        run.advance(1 / 60, event => { window.__arcCastEvents.push(event); h.characterArt.observeCast(event); });
        run.pause();
        h.characterArt.observe(before, s);
        for (const effect of s.effects) if (effect.kind === 'arc')
          window.__arcRealEffects.set(effect.id, { ...effect });
        h.draw();
        window.__arcHistory.push(window.__arcView());
      };
      h.draw();
    };
  });
}

async function cleanup(page) {
  return page.evaluate(() => {
    const h = window.__towerTest.host, art = h.arcArt, battle = h.battle;
    h.withdraw();
    return { actorsCleared: art.actors.size === 0, tracksCleared: art.tracks.size === 0,
      layerCleared: h.arcLayer === null, runCleared: h.run === null,
      battleDetached: !battle.parent || !cc.isValid(battle, true),
      storeUnchanged: JSON.stringify(window.__towerTest.state()) === window.__arcInitial.store,
      storageUnchanged: JSON.stringify(localStorage) === window.__arcInitial.storage,
      writes: window.__arcWrites, startupProbe: window.__arcInitial.startupProbe };
  });
}
function assertCleanup(result) {
  for (const [key, value] of Object.entries(result))
    if (!['writes', 'startupProbe'].includes(key)) assert.equal(value, true, key);
  assert.deepEqual(result.writes, []);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const server = createServer((req, res) => {
    const file = path.resolve(ROOT, '.' + decodeURIComponent(new URL(req.url, 'http://local').pathname));
    if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (error, bytes) => {
      if (error) { res.writeHead(404).end(); return; }
      res.setHeader('Content-Type', pngType[path.extname(file)] || 'application/octet-stream');
      res.end(bytes);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`;
  const report = { status: 'RUNNING', generatedAt: new Date().toISOString(),
    buildIndexModifiedAt: fs.statSync(path.join(ROOT, 'cocos-pilot/build/web-mobile/index.html')).mtime.toISOString(),
    scope: 'Approved v2 atlas presentation only. Real simulation releases supply pulse IDs and ranges.',
    fixture: 'Controlled loadout and one immobilized existing enemy in memory training; no manually created arc effects.',
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
      await page.evaluate(fixture => window.__prepareArc(fixture), CASES[0]);
      await page.waitForFunction(() => window.__towerTest.host.arcArt?.ready);
      await page.waitForFunction(() => !!window.__towerTest.host.environmentArt.nodes.get('floor')?.active);
      const atlas = await page.evaluate(() => {
        const h = window.__towerTest.host, art = h.arcArt;
        return { image: art.image.url, width: art.image.width, height: art.image.height,
          frames: art.frames.map(frame => ({ x: frame.rect.x, y: frame.rect.y,
            width: frame.rect.width, height: frame.rect.height })),
          layers: h.battle.children.map(node => node.name) };
      });
      loadedAssetUrl = atlas.image;
      const nativeUrl = new URL(atlas.image, url).href;
      const response = loadedResponses.get(nativeUrl);
      assert.ok(response?.ok(), 'The rendered atlas must have a successful native image response');
      const delivered = await response.body();
      const source = fs.readFileSync(path.join(ROOT, 'cocos-pilot/assets/resources/tower-skill-fx/sword-arc-v2.png'));
      const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
      atlas.network = { url: nativeUrl, status: response.status(), bytes: delivered.length,
        sha256: sha256(delivered), sourceSha256: sha256(source) };
      assert.equal(atlas.network.sha256, atlas.network.sourceSha256, 'Native image bytes differ from approved runtime atlas');
      assert.equal(atlas.width, 1024); assert.equal(atlas.height, 1024);
      assert.equal(atlas.frames.length, 16);
      assert.equal(new Set(atlas.frames.map(frame => `${frame.x}:${frame.y}`)).size, 16);
      assert.ok(atlas.frames.every(frame => frame.width === 256 && frame.height === 256));
      const layer = atlas.layers.indexOf('弦月斩特效层');
      assert.ok(layer > atlas.layers.indexOf('青石地面'));
      assert.ok(layer < atlas.layers.indexOf('妖兽静态素材'));
      assert.ok(layer < atlas.layers.indexOf('攻击预警'));
      report.atlases.push({ viewport, ...atlas });

      for (const fixture of CASES) {
        await page.evaluate(fixture => window.__prepareArc(fixture), fixture);
        const captures = [];
        for (let pulse = 1; pulse <= fixture.pulses; pulse++) {
          const result = await page.evaluate(pulse => {
            const h = window.__towerTest.host, s = h.run.state;
            let effect;
            for (let tick = 0; tick < 90; tick++) {
              window.__stepArc();
              effect = Array.from(window.__arcRealEffects.values()).find(e => e.pulseIndex === pulse);
              if (effect) break;
            }
            if (!effect) throw new Error(`No real pulse ${pulse}`);
            // Capture a visible early atlas frame after actual release.
            window.__stepArc(); window.__stepArc();
            const before = JSON.stringify(s);
            window.__arcFallbackCalls = 0; h.draw();
            const first = window.__arcView(), fallbackCount = window.__arcFallbackCalls;
            h.draw();
            return { effect, view: first, fallbackCount, redrawUnchanged: JSON.stringify(s) === before,
              snapshot: before, castEvents: window.__arcCastEvents };
          }, pulse);
          assert.ok(result.redrawUnchanged);
          assert.equal(result.effect.source, 'sj_arc'); assert.equal(result.effect.shape, 'sector');
          assert.equal(result.effect.pulseIndex, pulse); assert.equal(result.effect.pulseCount, fixture.pulses);
          assert.equal(result.fallbackCount, 0, 'Vector crescent is still drawn over the loaded atlas');
          const actor = result.view.actors.find(actor => actor.id === result.effect.id);
          assert.ok(actor, 'Each real pulse must have its own sprite ID');
          near(actor.x, result.effect.x - result.view.camera.x, 'origin X');
          near(actor.y, result.effect.y - result.view.camera.y, 'origin Y');
          near(Math.abs(actor.angle), fixture.angle, 'facing');
          near(actor.width, result.effect.radius * 816 / 394, 'radius mapping');
          near(actor.height, actor.width, 'square atlas aspect');
          assert.ok(actor.frameIndex > 0 && actor.frameIndex < 16);
          if (fixture.pulses === 3 && pulse > 1)
            assert.ok(result.view.actors.length >= 2, 'Overlapping pulses need independent phase tracks');
          const frozen = result.view;
          await page.waitForTimeout(100);
          const afterPause = await page.evaluate(() => window.__arcView());
          assert.deepEqual(afterPause, frozen, 'Paused actor phase or position changed');
          assert.equal(await page.evaluate(() => JSON.stringify(window.__towerTest.host.run.state)), result.snapshot);
          await page.screenshot({ path: path.join(OUT, `${fixture.name}-pulse${pulse}-${viewport.width}.png`) });
          delete result.snapshot;
          captures.push(result);
        }
        const ending = await page.evaluate(() => {
          const h = window.__towerTest.host, s = h.run.state, id = Array.from(window.__arcRealEffects.keys()).at(-1);
          // Move the camera by changing only this detached fixture's player pose,
          // then restore it without advancing the simulation.
          const before = window.__arcView(), oldX = s.player.x, oldY = s.player.y;
          s.player.x += 27; s.player.y -= 19; h.draw();
          const moved = window.__arcView();
          s.player.x = oldX; s.player.y = oldY; h.draw();
          const restored = window.__arcView();
          for (let i = 0; i < 20; i++) window.__stepArc();
          return { id, before, moved, restored, expired: window.__arcView(),
            realEffects: Array.from(window.__arcRealEffects.values()), history: window.__arcHistory,
            events: window.__arcCastEvents };
        });
        const previous = ending.before.actors.find(actor => actor.id === ending.id);
        const moved = ending.moved.actors.find(actor => actor.id === ending.id);
        near(moved.x, previous.x - 27, 'camera X');
        near(moved.y, previous.y + 19, 'camera Y');
        assert.equal(moved.frameIndex, previous.frameIndex);
        assert.deepEqual(ending.restored, ending.before);
        assert.equal(ending.realEffects.length, fixture.pulses);
        assert.equal(new Set(ending.realEffects.map(e => e.id)).size, fixture.pulses);
        assert.equal(ending.expired.actors.length, 0); assert.equal(ending.expired.trackIds.length, 0);
        report.cases.push({ viewport, fixture, captures, ending });
      }
      const closed = await cleanup(page); assertCleanup(closed);
      report.cleanup.push({ viewport, ...closed });
      await context.close();
    }

    // A fresh browser context has no loaded texture. Block only the exact atlas
    // URL observed above, leaving the character/environment and combat intact.
    const context = await browser.newContext({ viewport: { width: 844, height: 390 } });
    const blockedPath = new URL(loadedAssetUrl, url).pathname, blocked = [], warnings = [];
    await context.route('**/*', route => {
      if (new URL(route.request().url()).pathname === blockedPath) {
        blocked.push(route.request().url());
        return route.fulfill({ status: 404, body: '' });
      }
      return route.continue();
    });
    const page = await context.newPage();
    page.on('console', message => { if (message.type() === 'warning') warnings.push(message.text()); });
    await installFixture(page, url, report.errors);
    await page.evaluate(fixture => window.__prepareArc(fixture), CASES[0]);
    await page.waitForFunction(() => window.__towerTest.host.arcArt?.requested);
    // Cocos may retry an HTTP failure. Wait for the loader's final fallback notice.
    for (let i = 0; i < 80 && !warnings.some(message => message.includes('atlas unavailable')); i++)
      await page.waitForTimeout(100);
    assert.ok(blocked.length > 0, 'Expected blocked v2 texture request');
    assert.ok(warnings.some(message => message.includes('atlas unavailable')), 'Loader did not settle to fallback');
    const fallback = await page.evaluate(() => {
      const h = window.__towerTest.host, s = h.run.state;
      for (let tick = 0; tick < 90 && !s.effects.some(e => e.kind === 'arc'); tick++) window.__stepArc();
      if (!s.effects.some(e => e.kind === 'arc')) throw new Error('No real fallback arc release');
      window.__arcFallbackCalls = 0;
      const before = JSON.stringify(s); h.draw();
      return { ready: h.arcArt.ready, actorCount: h.arcArt.actors.size,
        fallbackCalls: window.__arcFallbackCalls, readOnly: JSON.stringify(s) === before,
        realEffects: Array.from(window.__arcRealEffects.values()) };
    });
    assert.equal(fallback.ready, false); assert.equal(fallback.actorCount, 0);
    assert.equal(fallback.fallbackCalls, 1); assert.ok(fallback.readOnly);
    assert.equal(fallback.realEffects.length, 1);
    await page.waitForFunction(() => !!window.__towerTest.host.environmentArt.nodes.get('floor')?.active);
    await page.screenshot({ path: path.join(OUT, 'asset-failure-vector-fallback-844.png') });
    const closed = await cleanup(page); assertCleanup(closed);
    report.fallback = { ...fallback, blockedPath, blockedRequests: blocked.length, warnings, cleanup: closed };
    await context.close();
    assert.deepEqual(report.errors, []);
    report.status = 'PASS';
  } catch (error) {
    report.status = 'FAIL'; report.error = error.stack; process.exitCode = 1;
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
    fs.writeFileSync(path.join(OUT, 'browser.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(`${report.status}: ${report.cases.length} real combat cases, ${report.atlases.length} landscape atlas checks`);
    if (report.error) console.error(report.error);
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
