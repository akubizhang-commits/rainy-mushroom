const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { chromium } = require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

(async () => {
  const root = path.resolve(__dirname, '..'), out = path.join(root, 'reports/sword-damage-types-2026-11-01/ui');
  const build = process.env.SWORD_DAMAGE_BUILD_PATH || path.join(root, 'cocos-pilot/build/web-mobile');
  fs.mkdirSync(out, { recursive: true });
  const server = createServer((req, res) => {
    const file = path.resolve(build, '.' + decodeURIComponent(new URL(req.url, 'http://local').pathname));
    if (!file.startsWith(build + path.sep)) return res.writeHead(403).end();
    fs.readFile(file, (error, bytes) => {
      if (error) return res.writeHead(404).end();
      res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
        '.png': 'image/png', '.css': 'text/css', '.wasm': 'application/wasm' })[path.extname(file)] || 'application/octet-stream');
      res.end(bytes);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  const report = { build, details: [], combat: [], errors: [] };
  try {
    browser = await chromium.launch({ headless: true, channel: 'chrome' });
    for (const viewport of [{ width: 844, height: 390 }, { width: 1280, height: 720 }]) {
      const context = await browser.newContext({ viewport }), page = await context.newPage();
      page.on('pageerror', e => report.errors.push(e.message));
      await page.goto(`http://127.0.0.1:${server.address().port}/index.html?ruleset=xianxia&tower=1&smoke=1`);
      await page.waitForFunction(() => window.__towerTest?.host?.menu);
      await page.waitForSelector('#tower-boot-loading', { state: 'detached', timeout: 60000 });
      await page.waitForFunction(() => !window.__towerTest.host.host?.assetLoading?.blocked);
      for (const id of ['sj_yujian', 'sj_arc', 'sj_cross', 'sj_line', 'sj_shadow', 'sj_wanjian',
        'sj_formation', 'sj_mark', 'sj_gate', 'evo_wanjian', 'evo_tiandi', 'evo_wuwo', 'evo_sixiang']) {
        const detail = await page.evaluate(id => {
          const h = window.__towerTest.host;
          h.campElapsed = -100000;
          h.menu.libraryArea = 'skills'; h.goto('library'); h.menu.openDetails(id);
          const walk = n => [n, ...n.children.flatMap(walk)];
          const pane = walk(h.menu.root).find(n => n.name === '技能详情固定栏');
          return { id, text: walk(pane).map(n => n.getComponent('cc.Label')?.string || '').join('\n') };
        }, id);
        assert.doesNotMatch(detail.text, /魔法/);
        if (id === 'sj_mark') assert.match(detail.text.replace(/\s/g, ''), /继承.*物理.*法术/);
        else if (['sj_yujian', 'evo_wanjian'].includes(id)) assert.match(detail.text, /物理攻击/);
        else {
          assert.match(detail.text, /物理＋法术攻击/);
          assert.match(detail.text.replace(/\s/g, ''), /50%.*50%/);
        }
        report.details.push({ viewport, ...detail });
        if (['sj_arc', 'sj_mark', 'sj_wanjian'].includes(id)) {
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          await page.waitForFunction(() => !window.__towerTest.host.host.assetLoading.blocked, {}, { timeout: 60000 });
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          await page.screenshot({ path: path.join(out, `${viewport.width}-${id}.png`) });
        }
      }
      const combat = await page.evaluate(() => {
        const h = window.__towerTest.host; h.enterTraining(); h.run.pause();
        const r = h.run, s = r.state;
        s.loadout.passive = { sj_mark: 4 };
        const e = r._enemy({ ...s.pending[0], id: 'damage-type-check', x: s.player.x + 100, y: s.player.y });
        e.hp = 10000; s.enemies = [e]; r._random = () => 1;
        r._damageEnemy({ target: e.id, source: 'sj_yujian', direct: true, damage: 10 });
        r._damageEnemy({ target: e.id, source: 'sj_arc', direct: true, damage: 10 });
        return { events: s.effects.filter(x => x.kind === 'hit').map(x => ({ source: x.source, damage: x.damage, parts: x.damageParts })),
          wound: { total: e.qingping.amount, physical: e.qingping.physicalAmount } };
      });
      const sword = combat.events.find(x => x.source === 'sj_yujian'), qi = combat.events.find(x => x.source === 'sj_arc');
      assert.equal(sword.parts.magic, 0);
      assert.equal(qi.parts.physical, qi.parts.magic);
      assert.ok(Math.abs(combat.wound.physical - combat.wound.total * .75) < 1e-7);
      report.combat.push({ viewport, ...combat });
      await context.close();
    }
    assert.deepEqual(report.errors, []);
    console.log(`PASS: ${report.details.length} skill details; ${report.combat.length} compiled combat checks; no browser errors`);
  } finally {
    fs.writeFileSync(path.join(out, 'checks.json'), JSON.stringify(report, null, 2));
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
