// Compiled Tower renderer QA. Reuses verify-tower-skill-hints server/browser setup.
// Synthetic paused training fixture; real draw(), resources, scene graph and GPU.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createServer } = require('node:http');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'docs/xianxia/reports/tower-monsters-2026-10-28');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ||
  '/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const families = ['boar', 'wolf', 'bear', 'tiger', 'ape', 'snake', 'crocodile', 'scorpion', 'centipede', 'spider', 'bat', 'falcon'];
async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const server = createServer((req, res) => {
    const file = path.resolve(ROOT, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (error, bytes) => {
      if (error) { res.writeHead(404).end(); return; }
      const mime = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
        '.wasm': 'application/wasm', '.png': 'image/png', '.css': 'text/css' };
      res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream'); res.end(bytes);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const report = { status: 'RUNNING', fixture: '12-family paused training presentation; smoke=1 memory storage', results: [], errors: [] };
  let browser;
  try {
    browser = await chromium.launch({ headless: true, executablePath: process.env.UI_CHROMIUM_EXECUTABLE ||
      '/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell' });
    for (const viewport of [{ width: 1280, height: 720 }, { width: 844, height: 390 }]) {
      const context = await browser.newContext({ viewport });
      await context.addInitScript(() => {
        window.__persistentWrites = [];
        for (const name of ['setItem', 'removeItem', 'clear']) {
          const original = Storage.prototype[name];
          Storage.prototype[name] = function (...args) {
            window.__persistentWrites.push({ name, key: args[0] }); return original.apply(this, args);
          };
        }
      });
      const page = await context.newPage();
      page.on('pageerror', error => report.errors.push(error.message));
      await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);
      await page.waitForFunction(() => !!window.__towerTest?.host?.menu);
      await page.evaluate(families => {
        const h = window.__towerTest.host;
        window.__monsterQA = { initial: JSON.stringify(window.__towerTest.state()), storage: JSON.stringify(localStorage), writes: [], fallback: [] };
        const qa = window.__monsterQA, storage = h.platform.storage, setItem = storage.setItem;
        qa.bootStorageProbes = window.__persistentWrites; window.__persistentWrites = [];
        storage.setItem = function (...args) { qa.writes.push(args[0]); return setItem.apply(this, args); };
        h.enterTraining(); h.run.pause();
        const s = h.run.state, p = s.player;
        s.arenaVersion = 1;
        s.enemies = families.map((family, i) => ({
          id: `qa-${family}`, family, rank: 1 + i % 3, role: i % 3 === 0 ? 'boss' : i % 3 === 1 ? 'elite' : 'normal',
          radius: [18, 26, 34][i % 3], hp: 65, maxHp: 100,
          x: p.x + (i < 6 ? [-475, -285, -95, 95, 285, 475][i] : [-330, -165, 85, 250, 415, 580][i - 6]),
          y: p.y + 12 + (i < 6 ? 105 : -100),
          ai: { mode: i === 3 ? 'windup' : 'idle' },
        }));
        s.reserved = []; s.pending = []; s.drops = []; s.effects = [];
        s.zones = [{ x: s.enemies[3].x, y: s.enemies[3].y, toX: s.enemies[3].x - 75,
          toY: s.enemies[3].y, shape: 'sector', angle: 100, faceX: -1, faceY: 0,
          radius: 75, hostile: true, phase: 'windup' }];
        // Projectiles intentionally cross an actor to verify the foreground layer.
        s.projectiles = [{ x: s.enemies[0].x, y: s.enemies[0].y, radius: 5, hostile: true, element: 'poison' }];
        qa.snapshot = JSON.stringify(s);
        const beast = h.beast;
        h.beast = function (...args) { qa.fallback.push(args[1]); return beast.apply(this, args); };
        h.draw();
      }, families);
      await page.waitForFunction(() => window.__towerTest.host.monsterArt.actors.size === 9);
      const result = await page.evaluate(() => {
        const h = window.__towerTest.host, qa = window.__monsterQA;
        qa.fallback = []; h.draw();
        const layerNames = h.battle.children.map(n => n.name);
        const actors = Array.from(h.monsterArt.actors.values()).map(a => ({ family: a.family,
          width: a.transform.width, height: a.transform.height, x: a.node.position.x, y: a.node.position.y,
          scaleX: a.node.scale.x, scaleY: a.node.scale.y, loaded: !!a.sprite.spriteFrame?.texture,
          source: a.sprite.spriteFrame?.texture?.image?.url || null }));
        return { actors, fallbacks: qa.fallback, layerNames, cacheSize: h.monsterArt.entries.size,
          labels: h.labels.filter(l => l.node.active).map(l => l.string),
          snapshotUnchanged: qa.snapshot === JSON.stringify(h.run.state),
          logical: { width: h.width, height: h.height }, bootStorageProbes: qa.bootStorageProbes,
          persistentWrites: window.__persistentWrites,
          memoryWrites: qa.writes };
      });
      assert.equal(result.actors.length, 9);
      assert.equal(result.cacheSize, 9);
      assert.deepEqual(result.actors.map(a => a.family).sort(), families.slice(0, 9).sort());
      assert.deepEqual(result.fallbacks.sort(), families.slice(9).sort());
      assert.ok(result.actors.every(a => a.loaded && a.width >= 64 && a.width <= 110 && a.width === a.height && a.scaleY === 1));
      assert.equal(result.labels.length, 12);
      assert.ok(result.snapshotUnchanged);
      const index = name => result.layerNames.indexOf(name);
      for (const [a, b] of [['场地与妖兽', '妖兽静态素材'], ['妖兽静态素材', '攻击预警'], ['攻击预警', '战斗前景'], ['战斗前景', '妖兽名牌']]) {
        assert.ok(index(a) >= 0 && index(a) < index(b), `${a} before ${b}`);
      }
      assert.deepEqual(result.persistentWrites, []); assert.deepEqual(result.memoryWrites, []);
      assert.deepEqual(result.bootStorageProbes, [{ name: 'setItem', key: 'storage' }, { name: 'removeItem', key: 'storage' }],
        'only the Cocos startup availability probe may touch persistent storage');
      await page.screenshot({ path: path.join(OUT, `battlefield-${viewport.width}x${viewport.height}.png`) });
      const cleanup = await page.evaluate(() => {
        const h = window.__towerTest.host, qa = window.__monsterQA, art = h.monsterArt;
        const layer = h.monsterLayer, nodes = Array.from(art.actors.values()).map(a => a.node);
        // Same IDs are stable across draws; removing enemies prunes the pool.
        h.draw(); const stable = nodes.every(n => h.monsterLayer.children.includes(n));
        const enemies = h.run.state.enemies;
        h.run.state.enemies = enemies.slice(0, 2); h.draw(); const pruned = art.actors.size;
        h.run.state.enemies = enemies; h.draw(); const restored = art.actors.size;
        h.withdraw();
        const camp = { screen: h.screen, actors: art.actors.size, battleGone: h.battle === null,
          detached: layer.children.length === 0 && nodes.every(n => n.parent === null) };
        const entries = Array.from(art.entries.values());
        const owned = entries.map(e => ({ image: e.image, refs: e.image.refCount, frame: e.frame, texture: e.texture }));
        // Destroy from paused training: avoids the host's intentional camp sync.
        h.enterTraining(); h.run.pause(); h.destroy();
        return { stable, pruned, restored, camp, destroy: { actors: art.actors.size, entries: art.entries.size,
          released: owned.every(e => e.image.refCount === e.refs - 1 && !cc.isValid(e.frame, true) && !cc.isValid(e.texture, true)) },
          campaignUnchanged: qa.initial === JSON.stringify(h.store.state),
          storageUnchanged: qa.storage === JSON.stringify(localStorage), memoryWrites: qa.writes,
          persistentWrites: window.__persistentWrites };
      });
      assert.ok(cleanup.stable); assert.equal(cleanup.pruned, 2); assert.equal(cleanup.restored, 9);
      assert.deepEqual(cleanup.camp, { screen: 'camp', actors: 0, battleGone: true, detached: true });
      assert.deepEqual(cleanup.destroy, { actors: 0, entries: 0, released: true });
      assert.ok(cleanup.campaignUnchanged && cleanup.storageUnchanged);
      assert.deepEqual(cleanup.memoryWrites, []); assert.deepEqual(cleanup.persistentWrites, []);
      report.results.push({ viewport, ...result, cleanup });
      await context.close();
    }
    assert.deepEqual(report.errors, []); report.status = 'PASS';
  } catch (error) { report.status = 'FAIL'; report.error = error.stack; process.exitCode = 1; }
  finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
    fs.writeFileSync(path.join(OUT, 'browser.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(`${report.status}: ${report.results.length} compiled battlefield cases; ${OUT}`);
    if (report.error) console.error(report.error);
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
