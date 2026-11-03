const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { chromium } = require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'docs/xianxia/reports/passive-compression-2026-10-31');

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const server = createServer((req, res) => {
    const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://local').pathname));
    if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
    fs.readFile(file, (error, data) => {
      if (error) return res.writeHead(404).end();
      res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript',
        '.json': 'application/json', '.png': 'image/png', '.css': 'text/css' })[path.extname(file)] || 'application/octet-stream');
      res.end(data);
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const report = { cases: [], errors: [] };
  let browser;
  try {
    browser = await chromium.launch({ headless: true, channel: 'chrome' });
    for (const viewport of [{ width: 844, height: 390 }, { width: 1280, height: 720 }]) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      page.on('pageerror', error => report.errors.push(error.message));
      await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);
      await page.waitForFunction(() => window.__towerTest?.host?.menu);
      const result = await page.evaluate(() => {
        const host = window.__towerTest.host;
        host.campElapsed = -100000;
        const state = JSON.parse(JSON.stringify(host.store.state));
        state.xp = 10920;
        state.spiritStones = 10000;
        host.store._state = state;
        const sync = host.store.act({ type: 'sync' }, Date.now());
        if (!sync.ok) throw Error(JSON.stringify(sync));
        const purchases = [];
        for (let rank = 1; rank <= 3; rank++) purchases.push(host.store.act({ type: 'learnSkill', id: 'sj_spirit' }, Date.now()));
        const removed = host.store.act({ type: 'learnSkill', id: 'magnet' }, Date.now());
        host.menu.go('librarySkills');
        host.menu.openDetails('sj_spirit');
        const walk = node => [node, ...node.children.flatMap(walk)];
        const nodes = walk(host.root);
        const detail = nodes.find(node => node.name === '技能详情固定栏');
        return { purchases, removed, hasRemovedNode: nodes.some(node => node.name === '技能节点-magnet'),
          text: walk(detail).map(node => node.getComponent('cc.Label')?.string || '').join('\n') };
      });
      assert.ok(result.purchases.every((purchase, index) => purchase.ok && purchase.level === index + 1 && purchase.cost === 1));
      assert.equal(result.removed.ok, false);
      assert.equal(result.hasRemovedNode, false);
      assert.match(result.text, /12%/);
      assert.match(result.text, /50%/);
      await page.screenshot({ path: path.join(out, `spirit-${viewport.width}.png`) });
      const refund = await page.evaluate(() => {
        const host = window.__towerTest.host;
        for (let rank = 1; rank <= 10; rank++) {
          const result = host.store.act({ type: 'learnSkill', id: 'sj_yujian' }, Date.now());
          if (!result.ok) throw Error(JSON.stringify(result));
        }
        const blocked = host.store.act({ type: 'decreaseSkill', id: 'sj_spirit' }, Date.now());
        const sword = host.store.act({ type: 'decreaseSkill', id: 'sj_yujian' }, Date.now());
        const spirit = host.store.act({ type: 'decreaseSkill', id: 'sj_spirit' }, Date.now());
        return { blocked, sword, spirit };
      });
      assert.equal(refund.blocked.reason, 'dependent-skill');
      assert.equal(refund.sword.ok, true);
      assert.equal(refund.spirit.returned, 1);
      // The smoke host intentionally uses memory-only storage. Reopen that
      // storage through the real constructor, without clearing it via navigation.
      const restored = await page.evaluate(() => {
        const host = window.__towerTest.host;
        const reopened = new host.store.constructor(host.store.storage, Date.now());
        if (reopened.readOnly) throw Error(reopened.error);
        return reopened.state.skills;
      });
      assert.equal(restored.sj_spirit, 2);
      assert.equal(restored.sj_yujian, 9);
      assert.equal(restored.magnet, undefined);
      report.cases.push({ viewport, ...result, refund, restored });
      await context.close();
    }
    assert.deepEqual(report.errors, []);
    report.status = 'passed';
  } catch (error) {
    report.status = 'failed';
    report.failure = error.stack;
    throw error;
  } finally {
    fs.writeFileSync(path.join(out, 'ui.json'), JSON.stringify(report, null, 2));
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
