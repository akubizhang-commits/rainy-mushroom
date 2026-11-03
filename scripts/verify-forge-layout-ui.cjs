const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { createServer } = require('node:http');
const { chromium } = require('/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = path.resolve(__dirname, '..'), out = path.join(root, 'docs/xianxia/reports/forge-layout-2026-10-30');
(async () => {
 fs.mkdirSync(out, { recursive: true });
 const server = createServer((req, res) => {
  const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://local').pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (e, b) => { if (e) { res.writeHead(404).end(); return; }
   res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css' })[path.extname(file)] || 'application/octet-stream'); res.end(b); });
 });
 await new Promise(r => server.listen(0, '127.0.0.1', r));
 let browser; const report = { cases: [], errors: [], note: 'Memory-backed campaign fixtures; no user save changes. Frame timing is desktop browser only.' };
 try {
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
  for (const viewport of [{ width: 844, height: 390 }, { width: 1280, height: 720 }]) {
   const context = await browser.newContext({ viewport }), page = await context.newPage();
   page.on('pageerror', e => report.errors.push(e.message));
   await page.goto(`http://127.0.0.1:${server.address().port}/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1&smoke=1`);
   await page.waitForFunction(() => window.__towerTest?.host?.menu);
   await page.waitForFunction(() => !window.__towerTest.host.transitioning);
   await page.evaluate(async () => {
    const { TowerCampaignStore, TOWER_CAMPAIGN_KEY } = await import('/js/xianxia/TowerCampaign.js');
    const { checksum } = await import('/js/xianxia/Checksum.js');
    const h = window.__towerTest.host, records = new Map();
    const disk = { getItem: k => records.get(k) ?? null, setItem: (k, v) => records.set(k, v) };
    const initial = new TowerCampaignStore(disk, Date.now()); initial.act({ type: 'sync' }, Date.now());
    const record = JSON.parse(records.get(TOWER_CAMPAIGN_KEY)), s = JSON.parse(record.data);
    s.xp = 10920; s.spiritStones = 10000; s.contribution = 10000;
    record.data = JSON.stringify(s); record.checksum = checksum(record.data); records.set(TOWER_CAMPAIGN_KEY, JSON.stringify(record));
    h.store = new TowerCampaignStore(disk, Date.now()); h.campElapsed = -100000;
    h.goto('forge');
    window.eightTierClick = name => {
     const walk = n => [n, ...n.children.flatMap(walk)], node = walk(h.root).find(n => n.name === name && n.getComponent('cc.Button'));
     if (!node) throw Error('Missing button ' + name);
     node.emit('click');
    };
    window.eightTierClick('炼器主殿');
   });
   await page.waitForTimeout(300);
   for (const [tier, name] of [['fan','凡器'], ['fa','法器'], ['bao','宝器'], ['ling','灵器']]) {
    const result = await page.evaluate(({ tier, name }) => {
     const h = window.__towerTest.host; window.eightTierClick('选择' + name);
     const walk = n => [n, ...n.children.flatMap(walk)];
     const panel = walk(h.root).find(n => n.name === '炼制选择面板');
     const texts = walk(panel).map(n => n.getComponent('cc.Label')?.string || '').join('\n');
     const ranks = ['凡器','法器','宝器','灵器','法宝','灵宝','仙器','神器'];
     const badges = ranks.map(label => walk(panel).find(n => n.name === '选择' + label || n.name === label + '未开放'));
     if (badges.some(n => !n)) throw Error('Missing rank plaque');
     if (Math.abs(badges[0].position.x + badges[7].position.x) > 1) throw Error('Rank row not centered');
     const preview = walk(panel).find(n => n.name === '炼器类别预览');
     if (badges.some(n => n.position.y <= preview.position.y)) throw Error('Rank row must be above type selector');
     if (!texts.includes('宗门开炉 · 以器结缘')) throw Error('Missing forge invitation');
     const plaquePaths = badges.map(n => n.children.find(c => c.name.startsWith('tower-ui/jade-plaque-'))?.name);
     if (plaquePaths.some(p => !p) || new Set(plaquePaths).size !== 8) throw Error('Each rank needs its own jade plaque');
     const focus = walk(panel).filter(n => n.name === '玉牌选中高亮');
     if (focus.length !== 1 || focus[0].parent.name !== '选择' + name) throw Error('Selection highlight must follow the selected rank');
     if (texts.includes('已选')) throw Error('Selection must not use a text subtitle');
     if (texts.includes('未开放')) throw Error('Future ranks should use muted names, not subtitles');
     const labels = walk(panel).map(n => n.getComponent('cc.Label')).filter(Boolean);
     const intro = labels.find(l => l.string.startsWith('长老已备好炉火'));
     if (intro?.horizontalAlign !== 0) throw Error('Forge introduction must be left aligned');

     const before = h.store.state.spiritStones;
     window.eightTierClick(name + '武器抽取一次');
     const item = h.menu.forgeResult?.draws[0]?.weapon;
     return { tier, name, texts, before, after: h.store.state.spiritStones, item };
    }, { tier, name });
    assert.equal(result.item.tier, tier); assert.equal(result.before - result.after, 100);
    for (const future of ['法宝', '灵宝', '仙器', '神器']) assert.ok(result.texts.includes(future));
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(out, `${tier}-result-${viewport.width}.png`) });
    await page.evaluate(id => {
     const h = window.__towerTest.host;
     window.eightTierClick('返回炼器峰-左'); h.menu.showInventory(h.store.state);
     window.eightTierClick('背包物品-' + id);
    }, result.item.id);
    await page.screenshot({ path: path.join(out, `${tier}-detail-${viewport.width}.png`) });
    const equipped = await page.evaluate(() => {
     const h = window.__towerTest.host; window.eightTierClick('穿戴');
     const id = h.store.state.loadouts[h.store.state.selectedLoadout].weaponId;
     window.eightTierClick('关闭背包'); window.eightTierClick('炼器主殿'); return id;
    });
    assert.equal(equipped, result.item.id);
    report.cases.push({ viewport, ...result });
   }
   await page.screenshot({ path: path.join(out, `forge-${viewport.width}.png`) });
   await page.evaluate(() => { const h = window.__towerTest.host; window.eightTierClick('关闭炼器菜单'); h.menu.showInventory(h.store.state); });
   await page.waitForTimeout(200);
   await page.screenshot({ path: path.join(out, `inventory-${viewport.width}.png`) });
   const frames = await page.evaluate(() => new Promise(resolve => {
    const times = []; let last;
    function frame(now) { if (last !== undefined) times.push(now - last); last = now; if (times.length < 120) requestAnimationFrame(frame); else resolve(times.sort((a,b)=>a-b)); }
    requestAnimationFrame(frame);
   }));
   report.cases.push({ viewport, menuFrameMedianMs: frames[60], menuFrameP95Ms: frames[114] });
   await context.close();
  }
  assert.deepEqual(report.errors, []); report.status = 'passed';
 } catch (e) { report.status = 'failed'; report.failure = e.stack; throw e; }
 finally { fs.writeFileSync(path.join(out, 'ui.json'), JSON.stringify(report, null, 2)); if (browser) await browser.close(); await new Promise(r => server.close(r)); }
})().catch(e => { console.error(e); process.exitCode = 1; });
