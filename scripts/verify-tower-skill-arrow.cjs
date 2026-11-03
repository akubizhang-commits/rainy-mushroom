// Focused compiled-menu smoke. Run after npm run cocos:build.
// Fresh browser context + smoke=1: no real profile or persistent save.
// Fixtures render a detached state through the real compiled menu; this checks
// presentation, not campaign transactions (covered by the host suite).
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createServer } = require('node:http');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'docs/xianxia/reports/tower-skill-arrow-2026-10-30');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ||
  '/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const prerequisites = ['sj_yujian', 'sj_arc', 'sj_wanjian', 'sj_line', 'sj_formation',
  'sj_heart', 'sj_mark', 'sj_bone', 'sj_gate'];
const cases = [
  { name: 'realm-cap', id: 'sj_yujian', patch: { xp: 630, skills: { sj_yujian: 3 } }, level: 3, arrow: false },
  { name: 'no-points', id: 'sj_yujian', patch: {}, level: 1, arrow: false },
  { name: 'stage-locked', id: 'vajra', patch: { xp: 45 }, level: 0, arrow: false },
  { name: 'tutorial-locked', id: 'sj_arc', patch: { xp: 630 }, level: 0, arrow: false },
  { name: 'unlocked', id: 'vajra', patch: { xp: 630 }, level: 0, arrow: true },
  { name: 'current-level', id: 'sj_yujian', patch: { xp: 630, skills: { sj_yujian: 2 } }, level: 2, arrow: true },
  { name: 'maximum', id: 'sj_yujian', patch: { xp: 10920, skills: { sj_yujian: 10 } }, level: 10, arrow: false },
];
async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const server = createServer((req, res) => {
    const file = path.resolve(ROOT, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (error, bytes) => {
      if (error) { res.writeHead(404).end(); return; }
      const mime = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
        '.wasm': 'application/wasm', '.png': 'image/png', '.css': 'text/css' };
      res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
      res.end(bytes);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  const report = { status: 'RUNNING', fixtures: 'detached menu state, smoke=1 memory storage', results: [], errors: [] };
  try {
    browser = await chromium.launch({ headless: true, executablePath: process.env.UI_CHROMIUM_EXECUTABLE ||
      '/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell' });
    for (const viewport of [{ width: 1280, height: 720 }, { width: 844, height: 390 }]) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      page.on('pageerror', error => report.errors.push(error.message));
      await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);
      await page.waitForFunction(() => !!window.__towerTest?.host?.menu);
      const initial = await page.evaluate(() => {
        window.__towerTest.page('library');
        return { state: window.__towerTest.state(), storage: JSON.stringify(localStorage) };
      });
      for (const fixture of cases) {
        const result = await page.evaluate(({ fixture, initial, prerequisites }) => {
          const menu = window.__towerTest.host.menu;
          const state = { ...initial.state, ...fixture.patch };
          menu.detailId = fixture.id;
          menu.render(state, 'library', '');
          const walk = node => [node, ...node.children.flatMap(walk)];
          const nodes = walk(menu.root), get = name => nodes.find(node => node.name === name);
          const label = node => walk(node).map(n => n.getComponent('cc.Label')).find(Boolean);
          const badge = get(`技能等级-${fixture.id}`), hint = get(`技能可升级-${fixture.id}`);
          const numeral = label(badge), plus = get(`learnSkill-${fixture.id}`);
          const expected = prerequisites.filter(id => !(state.skills[id] || 0)).sort();
          const actual = nodes.filter(n => n.name.startsWith('技能前置标记-')).map(n => ({
            id: n.name.slice('技能前置标记-'.length), text: label(n).string,
            color: label(n).color.toHEX('#rrggbb'), y: n.position.y,
          }));
          return { expectedLevel: state.skills[fixture.id] || 0, arrow: !!hint, level: numeral.string, centered: numeral.horizontalAlign === cc.Label.HorizontalAlign.CENTER,
            numeralX: numeral.node.position.x, badgeY: badge.position.y,
            badgeColor: badge.getComponent('cc.Graphics').fillColor.toHEX('#rrggbb'),
            hint: hint && { x: hint.position.x, y: hint.position.y, width: hint.getComponent('cc.UITransform').width,
              hasText: !!label(hint), color: hint.getComponent('cc.Graphics').fillColor.toHEX('#rrggbb') },
            enabled: plus.getComponent('cc.Button').interactable, expected, actual };
        }, { fixture, initial, prerequisites });
        assert.equal(result.arrow, result.enabled, 'arrow agrees with current purchase availability');
        assert.equal(result.level, String(result.expectedLevel));
        assert.ok(result.centered); assert.equal(result.numeralX, 0);
        if (result.hint) {
          assert.equal(result.hint.x + result.hint.width / 2, 40);
          assert.equal(result.hint.y, result.badgeY);
          assert.equal(result.hint.hasText, false);
          assert.equal(result.hint.color, result.badgeColor);
        }
        report.results.push({ viewport, case: fixture.name, ...result });
        if (fixture.name === 'current-level') {
          await page.waitForTimeout(350);
          await page.screenshot({ path: path.join(OUT, `hints-${viewport.width}x${viewport.height}.png`) });
        }
      }
      assert.deepEqual(await page.evaluate(() => window.__towerTest.state()), initial.state, 'render fixtures mutated campaign');
      assert.equal(await page.evaluate(() => JSON.stringify(localStorage)), initial.storage, 'persistent storage changed');
      await context.close();
    }
    assert.deepEqual(report.errors, []);
    report.status = 'PASS';
  } catch (error) {
    report.status = 'FAIL'; report.error = error.stack; process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
    fs.writeFileSync(path.join(OUT, 'browser.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(`${report.status}: ${report.results.length} compiled UI cases; ${OUT}`);
    if (report.error) console.error(report.error);
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
