'use strict';
// Run after the root task's unified Cocos build. The browser context is fresh,
// smoke=1 selects memory storage, and combat fixtures use the real training run.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createServer } = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ||
  '/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'design/xianxia-skill-review-2026-10-30/verification');
const basics = ['sj_yujian', 'sj_arc', 'sj_wanjian', 'sj_line', 'sj_shadow', 'sj_formation'];
const evolutions = ['evo_wanjian', 'evo_wuwo', 'evo_tiandi', 'evo_sixiang'];
const cases = [
  { name: 'arc-first', active: { sj_arc: 10 }, source: 'sj_arc', pulse: 1, shape: 'sector' },
  { name: 'arc-third', active: { sj_arc: 10 }, source: 'sj_arc', pulse: 3, shape: 'sector' },
  { name: 'arc-up', active: { sj_arc: 10 }, source: 'sj_arc', pulse: 1, shape: 'sector', vertical: true },
  { name: 'line-third', active: { sj_line: 10 }, source: 'sj_line', pulse: 3, shape: 'line' },
  { name: 'tiandi-release', active: { sj_line: 10 }, evolution: 'evo_tiandi', source: 'evo_tiandi', pulse: 1, kind: 'tiandi', shape: 'line' },
  { name: 'shadow-cross', active: { sj_shadow: 10 }, source: 'sj_shadow', pulse: 2, kind: 'shadow', shape: 'shadow' },
  { name: 'formation-first', active: { sj_formation: 10 }, source: 'sj_formation', pulse: 1, shape: 'circle' },
  { name: 'formation-final', active: { sj_formation: 10 }, source: 'sj_formation', pulse: 7, shape: 'circle' },
  { name: 'sixiang-fourth', active: { sj_formation: 10 }, evolution: 'evo_sixiang', source: 'evo_sixiang', pulse: 4, shape: 'diamond' },
  { name: 'sixiang-final', active: { sj_formation: 10 }, evolution: 'evo_sixiang', source: 'evo_sixiang', pulse: 9, shape: 'diamond' },
  { name: 'orbit-eight', active: { sj_wanjian: 10 }, seconds: .4 },
  { name: 'wuwo-twelve', active: { sj_wanjian: 10 }, evolution: 'evo_wuwo', seconds: .4 },
  { name: 'convergence-first', active: { sj_yujian: 10 }, evolution: 'evo_wanjian', source: 'evo_wanjian', pulse: 1, kind: 'convergence', shape: 'line' },
  { name: 'convergence-fifth', active: { sj_yujian: 10 }, evolution: 'evo_wanjian', source: 'evo_wanjian', pulse: 5, kind: 'convergence', shape: 'line' },
  { name: 'convergence-terminal', active: { sj_yujian: 10 }, evolution: 'evo_wanjian', source: 'evo_wanjian', pulse: 9, kind: 'convergence', shape: 'line', terminal: true },
];
const percentile = (values, quantile) => values.slice().sort((a, b) => a - b)[Math.min(values.length - 1, Math.floor(values.length * quantile))];
async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const server = createServer((req, res) => {
    const file = path.resolve(ROOT, '.' + decodeURIComponent(new URL(req.url, 'http://local').pathname));
    if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (error, bytes) => {
      if (error) { res.writeHead(404).end(); return; }
      res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
        '.png': 'image/png', '.css': 'text/css', '.wasm': 'application/wasm' })[path.extname(file)] || 'application/octet-stream');
      res.end(bytes);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const report = { status: 'RUNNING', generatedAt: new Date().toISOString(),
    builtIndexModifiedAt: fs.statSync(path.join(ROOT, 'cocos-pilot/build/web-mobile/index.html')).mtime.toISOString(),
    fixture: 'Real compiled Cocos training run; only loadout/enemy placement is controlled; smoke=1 memory storage.',
    timingScope: 'CPU time of complete TowerView.draw(), plus browser requestAnimationFrame cadence. Neither is a mobile GPU or 60 fps certification.',
    details: [], combat: [], performance: [], cleanup: [], errors: [] };
  let browser;
  try {
    browser = await chromium.launch({ headless: true, executablePath: process.env.UI_CHROMIUM_EXECUTABLE ||
      '/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell' });
    for (const viewport of [{ width: 1280, height: 720 }, { width: 844, height: 390 }]) {
      const context = await browser.newContext({ viewport });
      await context.addInitScript(() => {
        window.__writes = [];
        for (const method of ['setItem', 'removeItem', 'clear']) {
          const original = Storage.prototype[method];
          Storage.prototype[method] = function (...args) { window.__writes.push({ method, key: args[0] }); return original.apply(this, args); };
        }
      });
      const page = await context.newPage();
      page.on('pageerror', error => report.errors.push(error.message));
      await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);
      await page.waitForFunction(() => !!window.__towerTest?.host?.menu);
      await page.evaluate(() => {
        const h = window.__towerTest.host;
        window.__initial = { store: JSON.stringify(window.__towerTest.state()), storage: JSON.stringify(localStorage),
          startupWrites: window.__writes.splice(0) };
        // Direct training-state fixtures never alter a campaign profile or invoke
        // a save transaction. All effects below come from run.advance().
        window.__prepareSkillFixture = fixture => {
          if (h.run) h.withdraw();
          h.campElapsed = 0; h.enterTraining(); h.run.pause();
          const run = h.run, s = run.state, p = s.player, unit = s.pending[0];
          if (!unit) throw new Error('Expected authored first-wave template');
          s.arenaVersion = 1; // Exercise the current tower floor/pillars in memory training.
          s.loadout.growthVersion = 1;
          s.loadout.active = { ...fixture.active };
          s.loadout.passive = fixture.concurrent ? { sj_heart: 8, sj_mark: 8, sj_bone: 8, sj_gate: 8, vajra: 8, magnet: 8 } : {};
          s.loadout.evolutions = fixture.concurrent ? ['evo_wanjian', 'evo_wuwo', 'evo_tiandi', 'evo_sixiang'] : fixture.evolution ? [fixture.evolution] : [];
          s.loadout.evolutionLevels = Object.fromEntries(s.loadout.evolutions.map(id => [id, 2]));
          s.cooldowns = Object.fromEntries([...Object.keys(s.loadout.active), ...s.loadout.evolutions].map(id => [id, 0]));
          s.casts = []; s.zones = []; s.effects = []; s.projectiles = [];
          const points = fixture.concurrent ? [[100, 0], [150, 30], [190, -25], [220, 80], [-100, 0], [-120, -70], [0, 110], [0, -110], [280, 0], [340, 30], [150, 130], [110, -130]]
            : fixture.vertical ? [[0, 100], [-35, 150], [40, 190]] : [[100, 0], [150, 30], [190, -25]];
          s.enemies = points.map(([x, y], index) => {
            const enemy = run._enemy({ ...unit, id: `qa-enemy-${index}`, x: p.x + x, y: p.y + y });
            enemy.hp = enemy.maxHp = 1e8; enemy.moveSpeed = 0;
            enemy.ai.readyAt = enemy.ai.graceUntil = enemy.ai.entryUntil = 1e8;
            return enemy;
          });
          s.pending = []; s.reserved = []; s.drops = [];
          s.wavePlanned = s.enemies.length; s.waveKilled = 0;
          s.player.faceX = fixture.vertical ? 0 : 1; s.player.faceY = fixture.vertical ? 1 : 0;
          h.characterArt.reset();
          window.__skillEvents = [];
          window.__stepSkill = () => {
            const before = h.characterArt.sample(s);
            run.resume();
            run.advance(1 / 60, event => { window.__skillEvents.push(event); h.characterArt.observeCast(event); });
            run.pause();
            h.characterArt.observe(before, s);
          };
          h.draw();
        };
      });
      for (const id of [...basics, ...evolutions]) {
        const detail = await page.evaluate(({ id, basics, evolutions }) => {
          const h = window.__towerTest.host;
          h.campElapsed = 0; h.goto('library');
          const state = { ...window.__towerTest.state(), xp: 10920, tutorialWaves: 3,
            playtestSkillPoints: 1000, clearedFloor: 9,
            skills: Object.fromEntries(basics.map(key => [key, 10])),
            evolutions, evolutionRanks: Object.fromEntries(evolutions.map(key => [key, 2])) };
          h.menu.detailId = id; h.menu.skillPaneOffset = 0; h.menu.render(state, 'library', '');
          const walk = node => [node, ...node.children.flatMap(walk)];
          const pane = walk(h.menu.root).find(node => node.name === '技能详情固定栏');
          const labels = walk(pane).map(node => node.getComponent('cc.Label')).filter(Boolean).map(label => label.string);
          return { id, labels, scrollHeight: h.menu.skillPaneScroll.content.getComponent('cc.UITransform').height };
        }, { id, basics, evolutions });
        assert.ok(detail.labels.some(text => text.includes('形态：')), `${id} missing shape description`);
        await page.waitForTimeout(80);
        await page.screenshot({ path: path.join(OUT, `detail-${id}-${viewport.width}.png`) });
        report.details.push({ viewport, ...detail });
      }
      for (const fixture of cases) {
        const result = await page.evaluate(fixture => {
          window.__prepareSkillFixture(fixture);
          const h = window.__towerTest.host, s = h.run.state;
          let matched = null;
          for (let tick = 0; tick < 360; tick++) {
            window.__stepSkill();
            matched = s.effects.find(effect => effect.source === fixture.source
              && effect.pulseIndex === fixture.pulse && (!fixture.kind || effect.kind === fixture.kind));
            if (fixture.seconds ? s.time >= fixture.seconds : matched) break;
          }
          if (!fixture.seconds && !matched) throw new Error(`No real effect generated for ${fixture.name}`);
          const before = JSON.stringify(s);
          h.draw(); h.draw();
          if (JSON.stringify(s) !== before) throw new Error('Drawing mutated training state');
          return { time: s.time, matched, zones: s.zones, events: window.__skillEvents, characterAttack: h.characterArt.attack,
            orbitForm: h.skillEffects.orbitForm, effectCount: s.effects.length, stateBeforePause: before,
            layerNames: h.battle.children.map(node => node.name) };
        }, fixture);
        if (fixture.shape) assert.equal(result.matched.shape, fixture.shape);
        if (fixture.terminal) assert.equal(result.matched.terminal, true);
        if (fixture.name === 'orbit-eight') assert.equal(result.orbitForm.swords, 8);
        if (fixture.name === 'wuwo-twelve') assert.equal(result.orbitForm.swords, 12);
        if (fixture.name === 'arc-up') { assert.ok(Math.abs(result.matched.dirX) < .001); assert.ok(result.matched.dirY > .99); }
        if (fixture.source && fixture.source !== 'sj_wanjian') assert.ok(result.events.length > 0, `${fixture.name} missing real character event`);
        const friendlyLayer = result.layerNames.indexOf('场地与妖兽');
        assert.ok(friendlyLayer >= 0 && friendlyLayer < result.layerNames.indexOf('妖兽静态素材'));
        assert.ok(friendlyLayer < result.layerNames.indexOf('攻击预警'), 'Friendly skills obscure hostile warnings');
        await page.waitForFunction(() => !!window.__towerTest.host.characterArt.atlas);
        await page.waitForFunction(() => !!window.__towerTest.host.environmentArt.nodes.get('floor')?.active);
        await page.waitForTimeout(60);
        const frozen = await page.evaluate(() => JSON.stringify(window.__towerTest.host.run.state));
        assert.equal(frozen, result.stateBeforePause, 'paused state advanced');
        await page.screenshot({ path: path.join(OUT, `combat-${fixture.name}-${viewport.width}.png`) });
        delete result.stateBeforePause;
        report.combat.push({ viewport, fixture: fixture.name, pausedUnchanged: true, drawReadOnly: true, ...result });
      }
      for (const seconds of [.35, 1.3, 3]) {
        const perf = await page.evaluate(({ active, seconds }) => {
          window.__prepareSkillFixture({ active, concurrent: true });
          const h = window.__towerTest.host, s = h.run.state;
          while (s.time < seconds) window.__stepSkill();
          for (let i = 0; i < 12; i++) h.draw();
          const before = JSON.stringify(s), timings = [], count = node => 1 + node.children.reduce((n, child) => n + count(child), 0);
          const nodesBefore = count(h.battle);
          for (let i = 0; i < 120; i++) { const start = performance.now(); h.draw(); timings.push(performance.now() - start); }
          return { time: s.time, timings, readOnly: JSON.stringify(s) === before, nodesBefore, nodesAfter: count(h.battle),
            effects: s.effects.length, zones: s.zones.length, projectiles: s.projectiles.length, enemies: s.enemies.length,
            sources: [...new Set(s.effects.map(effect => effect.source))] };
        }, { active: Object.fromEntries(basics.map(id => [id, 10])), seconds });
        assert.ok(perf.readOnly); assert.equal(perf.nodesAfter, perf.nodesBefore, 'Repeated draw allocated scene nodes');
        const { timings, ...record } = perf;
        report.performance.push({ viewport, ...record, samples: timings.length,
          medianMs: percentile(timings, .5), p95Ms: percentile(timings, .95), maxMs: Math.max(...timings) });
        await page.screenshot({ path: path.join(OUT, `concurrent-${seconds}-${viewport.width}.png`) });
      }
      const cadence = await page.evaluate(() => new Promise(resolve => {
        const deltas = []; let last;
        const sample = time => { if (last !== undefined) deltas.push(time - last); last = time;
          if (deltas.length < 60) requestAnimationFrame(sample); else resolve(deltas); };
        requestAnimationFrame(sample);
      }));
      report.performance.push({ viewport, scope: 'browser requestAnimationFrame, paused concurrent scene', samples: cadence.length,
        medianMs: percentile(cadence, .5), p95Ms: percentile(cadence, .95), maxMs: Math.max(...cadence) });
      const cleanup = await page.evaluate(() => {
        const h = window.__towerTest.host, oldBattle = h.battle;
        h.withdraw();
        return { runCleared: h.run === null, effectsCleared: h.skillEffects === null,
          battleDetached: !oldBattle.parent || !cc.isValid(oldBattle, true), characterBindingCleared: h.characterArt.root === null,
          storeUnchanged: JSON.stringify(window.__towerTest.state()) === window.__initial.store,
          storageUnchanged: JSON.stringify(localStorage) === window.__initial.storage, writes: window.__writes,
          startupProbe: window.__initial.startupWrites };
      });
      for (const [key, value] of Object.entries(cleanup)) if (!['writes', 'startupProbe'].includes(key)) assert.equal(value, true, key);
      assert.deepEqual(cleanup.writes, []);
      report.cleanup.push({ viewport, ...cleanup });
      await context.close();
    }
    assert.deepEqual(report.errors, []);
    report.status = 'PASS';
  } catch (error) {
    report.status = 'FAIL'; report.error = error.stack; process.exitCode = 1;
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
    fs.writeFileSync(path.join(OUT, 'browser.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(`${report.status}: ${report.details.length} details, ${report.combat.length} real combat captures; ${OUT}`);
    if (report.error) console.error(report.error);
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
