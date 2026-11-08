// Ownership: this script and reports/tower-landscape-2026-10-28/ui-* only.
// Prepare without browser/build/sync: node scripts/verify-tower-landscape-ui.cjs --check
// Run ONLY after parent build-ready:
// UI_CHROMIUM_EXECUTABLE=/Users/zhangnu/Library/Caches/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-mac-arm64/chrome-headless-shell \
// node scripts/verify-tower-landscape-ui.cjs --build-ready
// Initial: UI_CASES=tree,input UI_RUN_PHASE=initial
// Delivery: UI_CASES=hex,ranged UI_EXTREME=1 UI_RUN_PHASE=final UI_RUN_TAG=delivery
// Arc bridge (after its build-ready): UI_CASES=hex,sector UI_SIZES=844x390 UI_RUN_PHASE=final UI_RUN_TAG=delivery-arc
// Mask closure (after its build-ready): UI_CASES=mask UI_EXTREME=1 UI_SIZES=844x390,1920x280,3840x1080 UI_RUN_PHASE=final UI_RUN_TAG=delivery-mask
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'docs/xianxia/reports/tower-landscape-2026-10-28');
const URL = process.env.PREVIEW_URL ||
  'http://127.0.0.1:8767/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1';
const PLAYWRIGHT = process.env.PLAYWRIGHT_MODULE ||
  '/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright';
const PIXEL_PYTHON = '/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3';
const SIZES = [{ width: 1280, height: 720 }, { width: 844, height: 390 },
  { width: 1024, height: 768 }, { width: 390, height: 844 },
  ...(process.env.UI_EXTREME === '1' ? [{ width: 1920, height: 280 }, { width: 3840, height: 1080 }] : [])];
const SOURCES = ['cocos-pilot/assets/scripts/TowerMenu.ts', 'cocos-pilot/assets/scripts/TowerView.ts',
  'cocos-pilot/assets/scripts/PinePilot.ts', 'js/xianxia/TowerCampaign.js', 'js/xianxia/TowerGrowth.js',
  'js/xianxia/TowerRun.js', 'js/xianxia/TowerLoot.js', 'js/xianxia/TowerArena.js',
  'js/xianxia/TowerEnemyAttacks.js', 'cocos-pilot/assets/scripts/TowerArenaView.ts'];
const ARGS = new Set(process.argv.slice(2)), TAG = process.env.UI_RUN_TAG || 'acceptance';
assert.match(TAG, /^[a-zA-Z0-9-]+$/);
const PHASE = process.env.UI_RUN_PHASE || 'initial';
assert.ok(['initial', 'final'].includes(PHASE));
const selectedCases = (process.env.UI_CASES || '').split(',').filter(Boolean);
const selectedSizes = (process.env.UI_SIZES || '').split(',').filter(Boolean);
const clone = value => JSON.parse(JSON.stringify(value));
const compact = value => value.replace(/\s+/g, '');
const hash = value => createHash('sha256').update(Buffer.isBuffer(value) || typeof value === 'string'
  ? value : JSON.stringify(value)).digest('hex');
const rank = (s, id) => s.skills[id] || s.evolutionRanks[id] || 0;
function write(name, value) {
  assert.match(name, /^ui-[a-zA-Z0-9_.-]+$/);
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n');
}
function compareLetterboxPixels(beforePath, afterPath, bounds) {
  // Compare the actual PNGs, not only UITransform/Mask geometry. Keep two
  // outside-edge pixels clear of fractional rasterization at SHOW_ALL scale.
  const program = `
from PIL import Image, ImageChops
import json, math, sys
before=Image.open(sys.argv[1]).convert('RGB')
after=Image.open(sys.argv[2]).convert('RGB')
assert before.size == after.size
b=json.loads(sys.argv[3]); w,h=after.size
regions=[('left',(0,0,max(0,math.floor(b['left'])-2),h)),
 ('right',(min(w,math.ceil(b['right'])+2),0,w,h))]
result=[]
for name,rect in regions:
 if rect[2]<=rect[0]: continue
 delta=ImageChops.difference(before.crop(rect),after.crop(rect))
 r,g,blue=delta.split(); maximum=ImageChops.lighter(ImageChops.lighter(r,g),blue)
 hist=maximum.histogram()
 result.append({'side':name,'rect':rect,'pixels':(rect[2]-rect[0])*h,
  'changedPixelsBeyondOneRGBLevel':sum(hist[2:]),'maximumRGBDifference':maximum.getextrema()[1]})
print(json.dumps({'before':sys.argv[1],'after':sys.argv[2],'bands':result,
 'examinedPixels':sum(r['pixels'] for r in result),
 'changedPixels':sum(r['changedPixelsBeyondOneRGBLevel'] for r in result)}))
`;
  return JSON.parse(execFileSync(PIXEL_PYTHON, ['-c', program, beforePath, afterPath, JSON.stringify(bounds)], { encoding: 'utf8' }));
}
async function modules() {
  return Object.assign({}, ...await Promise.all(['TowerCampaign', 'TowerGrowth', 'TowerProfile', 'TowerRun', 'TowerPlaytest', 'TowerArena']
    .map(name => import(pathToFileURL(path.join(ROOT, `js/xianxia/${name}.js`)).href))),
  await import(pathToFileURL(path.join(ROOT, 'js/xianxia/Checksum.js')).href));
}
function sourceContract() {
  const menu = fs.readFileSync(path.join(ROOT, SOURCES[0]), 'utf8');
  const view = fs.readFileSync(path.join(ROOT, SOURCES[1]), 'utf8');
  const selectors = { treePanel: '技能树面板', treeScroll: '技能树二维卷轴', treeContent: '境界技能树内容',
    detail: '技能详情固定栏', detailScroll: '技能详情独立卷轴', detailContent: '技能详情栏内容',
    name: '技能节点-<id>', icon: '技能图标-<id>', level: '技能等级-<id>',
    plus: 'learnSkill-<id>', minus: 'decreaseSkill-<id>', joystick: '移动摇杆' };
  for (const name of ['技能树面板', '技能树二维卷轴', '境界技能树内容', '技能详情固定栏', '技能详情独立卷轴'])
    assert.ok(menu.includes(`'${name}'`), `Menu selector not ready: ${name}`);
  assert.ok(view.includes("'移动摇杆'"), 'Fixed joystick source not ready');
  return { selectors, expectedRealmRows: { 炼气: 12, 金丹: 4 },
    handoff844LogicalViewports: { tree: { width: 820, height: 297.47 }, detail: { width: 364, height: 281.47 } },
    cdMeaning: 'Current source displays authored cooldown / hit interval / 常驻, not a live countdown.',
    sourceHashes: Object.fromEntries(SOURCES.map(file => [file, hash(fs.readFileSync(path.join(ROOT, file)))])) };
}
// Explicit artificial camp sources. Purchases use Campaign.act and its encoder;
// no user profile, preassembled battle snapshot, monster or reward is imported.
function fixture(rt, kind) {
  const memory = new Map(), storage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, v) };
  const now = Date.now(), transactions = [];
  let store = new rt.TowerCampaignStore(storage, now);
  assert.ok(store.act({ type: 'sync' }, now).ok);
  const envelope = JSON.parse(memory.get(rt.TOWER_CAMPAIGN_KEY));
  const state = JSON.parse(envelope.data);
  const sector = kind === 'sector', xp = sector ? 0 : rt.TOWER_XP_CAP;
  const sources = { xp, hp: rt.cultivationAt(xp).maxHp,
    cores: 2000, clearedFloor: 9, tutorialWaves: sector ? 0 : 3 };
  Object.assign(state, sources, { skills: rt.giftSkills(sources.tutorialWaves), books: [], evolutions: [], evolutionRanks: {}, researchPurchases: 0 });
  envelope.data = JSON.stringify(state); envelope.checksum = rt.checksum(envelope.data);
  memory.set(rt.TOWER_CAMPAIGN_KEY, JSON.stringify(envelope));
  store = new rt.TowerCampaignStore(storage, now);
  assert.equal(store.readOnly, false);
  function act(action) {
    const result = store.act(action, now); transactions.push({ action, result });
    assert.ok(result.ok, JSON.stringify({ action, result }));
  }
  function learn(id, level) {
    while (rank(store.state, id) < level) act({ type: 'learnSkill', id });
  }
  if (kind === 'tree') {
    learn('sj_arc', 2); learn('sj_line', 1); learn('sj_yujian', 8); learn('sj_heart', 5); learn('evo_wanjian', 2);
  } else if (!sector) learn('vajra', 1);
  act({ type: 'sync' });
  store = new rt.TowerCampaignStore(storage, now);
  assert.equal(store.readOnly, false);
  return { kind: 'ARTIFICIAL CAMPAIGN-VALIDATED UI FIXTURE — NOT NATURAL PROGRESSION/BALANCE',
    name: kind, sources, transactions, state: clone(store.state), raw: memory.get(rt.TOWER_CAMPAIGN_KEY) };
}
function sectorFixture(rt, faceY) {
  const seed = fixture(rt, 'sector'), now = Date.now(), memory = new Map([[rt.TOWER_CAMPAIGN_KEY, seed.raw]]);
  const storage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, v) };
  let store = new rt.TowerCampaignStore(storage, now);
  assert.ok(store.act({ type: 'startFloor', floor: 7, seed: 123 }, now).ok);
  const run = rt.TowerRun.restore(store.state.activeRun.snapshot);
  assert.equal(run.state.arenaVersion, 1);
  run.state.cooldowns.sj_yujian = 99999;
  run.advance(2);
  const tiger = run.state.enemies.find(e => e.archetype === 'tiger_normal');
  assert.ok(tiger, 'Authored floor 7 must naturally spawn the target tiger');
  // Labelled UI fixture, matching parent's real-host regression: isolate real
  // spawned actors and orient the target; Run still authors and locks the zone.
  for (const e of run.state.enemies) {
    Object.assign(e, { x: -500, y: -400 });
    Object.assign(e.ai, { entryUntil: 99999, graceUntil: 99999 });
  }
  tiger.x = run.state.player.x; tiger.y = run.state.player.y - faceY * 100;
  Object.assign(tiger.ai, { entryUntil: 0, graceUntil: 0, readyAt: 0 }); run.state.nextWindupAt = 0;
  for (let i = 0; i < 120 && !tiger.ai.attack?.locked; i++) run.advance(1 / 60);
  assert.equal(tiger.ai.mode, 'windup'); assert.equal(tiger.ai.attack.locked, true);
  assert.equal(tiger.ai.attack.shape, 'sector'); assert.equal(tiger.ai.attack.angle, 140);
  assert.equal(tiger.ai.attack.dirX, 0); assert.equal(tiger.ai.attack.dirY, faceY);
  run.state.nextWindupAt = 99999; run.pause();
  const snapshot = run.snapshot();
  assert.equal(rt.validateTowerSnapshot(snapshot), true);
  assert.ok(store.act({ type: 'checkpoint', snapshot }, now).ok, 'Campaign must validate and encode sector fixture');
  store = new rt.TowerCampaignStore(storage, now); assert.equal(store.readOnly, false);
  const warning = snapshot.zones.find(z => z.ownerId === tiger.id && z.renderOnly);
  return { ...seed, name: faceY > 0 ? 'sector-up' : 'sector-down',
    kind: 'CAMPAIGN-ENCODED AUTHORED TIGER ATTACK UI FIXTURE; actor placement/cooldown isolation, not natural combat evidence',
    state: clone(store.state), raw: memory.get(rt.TOWER_CAMPAIGN_KEY),
    probe: { faceX: 0, faceY, ownerId: tiger.id, warning, attack: tiger.ai.attack } };
}

// Read-only geometry and rendered labels. UI actions use real mouse/key input.
function inspectScene() {
  const walk = n => [n, ...n.children.flatMap(walk)];
  const canvas = document.querySelector('canvas'), rect = canvas.getBoundingClientRect();
  const camera = walk(cc.director.getScene()).map(n => n.getComponent('cc.Camera')).find(Boolean);
  const xy = p => {
    const v = camera.worldToScreen(p);
    return { x: rect.x + v.x / canvas.width * rect.width, y: rect.y + (1 - v.y / canvas.height) * rect.height };
  };
  const box = n => {
    const t = n.getComponent('cc.UITransform'); if (!t) return null;
    const corners = [[-t.anchorX, -t.anchorY], [1 - t.anchorX, 1 - t.anchorY]].map(([x, y]) =>
      xy(t.convertToWorldSpaceAR(new cc.Vec3(x * t.width, y * t.height, 0))));
    return { left: Math.min(...corners.map(p => p.x)), right: Math.max(...corners.map(p => p.x)),
      top: Math.min(...corners.map(p => p.y)), bottom: Math.max(...corners.map(p => p.y)) };
  };
  return walk(towerQA.root).filter(n => n.activeInHierarchy).map(n => {
    const button = n.getComponent('cc.Button'), label = n.getComponent('cc.Label');
    const scroll = n.getComponent('cc.ScrollView'), graphics = n.getComponent('cc.Graphics');
    const transform = n.getComponent('cc.UITransform');
    const impl = graphics?.impl || graphics?._impl, paths = impl?.paths || impl?._paths;
    let clip = { left: Math.max(0, rect.left), right: Math.min(innerWidth, rect.right),
      top: Math.max(0, rect.top), bottom: Math.min(innerHeight, rect.bottom) };
    let p = n.parent; const ancestors = [];
    while (p) {
      ancestors.push(p.name);
      if (p.getComponent('cc.Mask')) {
        const b = box(p);
        if (b) clip = { left: Math.max(clip.left, b.left), right: Math.min(clip.right, b.right),
          top: Math.max(clip.top, b.top), bottom: Math.min(clip.bottom, b.bottom) };
      }
      p = p.parent;
    }
    return { name: n.name, ancestors, button: !!button, enabled: button?.interactable ?? false, mask: !!n.getComponent('cc.Mask'),
      text: label?.string || '', box: box(n), clip, ...xy(n.worldPosition),
      logicalSize: transform ? { width: transform.width, height: transform.height } : null,
      local: { x: n.position.x, y: n.position.y }, graphics: !!graphics, graphicsPathCount: paths?.length ?? null,
      scroll: scroll ? { horizontal: scroll.horizontal, vertical: scroll.vertical, offset: scroll.getScrollOffset() } : null };
  });
}
function inspectHost() {
  const h = towerQA;
  return { screen: h.screen, landscape: h.landscape, size: { width: h.width, height: h.height },
    selected: h.menu?.detailId, menuPage: h.menu?.currentPage,
    treePan: h.menu?.scroll?.getScrollOffset(), detailPan: h.menu?.skillPaneScroll?.getScrollOffset(),
    stick: { ...h.stick }, touch: h.touch, keys: [...h.keys],
    phase: h.run?.state.phase, input: h.run?.state.input, camera: h.camera, tools: h.tools };
}
function inspectArenaPaths() {
  const read = graphics => {
    const impl = graphics?.impl || graphics?._impl;
    return (impl?.paths || impl?._paths || []).map(p => ({
      closed: p.closed, points: (p.points || p._points || []).map(v => ({ x: v.x, y: v.y })),
    })).filter(p => p.points.length >= 6 && p.points.length <= 8);
  };
  return { world: read(towerQA.world), hud: read(towerQA.ui), camera: { ...towerQA.camera } };
}
const inside = (b, v, tolerance = 2) => b && b.left >= v.left - tolerance && b.right <= v.right + tolerance &&
  b.top >= v.top - tolerance && b.bottom <= v.bottom + tolerance;
const usable = n => n && inside(n.box, n.clip, 1) && n.x > n.clip.left + 8 && n.x < n.clip.right - 8 &&
  n.y > n.clip.top + 8 && n.y < n.clip.bottom - 8;
function near(actual, expected, message, tolerance = 2) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} vs ${expected}`);
}
function samePan(after, before, label) {
  assert.ok(after && before, `${label}: missing scroll`);
  near(after.x, before.x, `${label} x`, 1); near(after.y, before.y, `${label} y`, 1);
}
function cadence(skill, rt) {
  if (skill.kind === 'passive') return '常驻';
  if (skill.id === 'evo_wanjian') return `剑雨${skill.rainCooldown}秒`;
  if (skill.cooldown) return `${skill.cooldown}秒`;
  const parent = rt.GROWTH_SKILLS.find(s => s.id === skill.parent);
  const interval = skill.hit_interval ?? parent?.hit_interval;
  return interval ? `命中${interval}秒` : '常驻';
}

async function main() {
  assert.ok(ARGS.has('--check') || ARGS.has('--build-ready'),
    '等待 parent build-ready；可先 --check，未获新构建确认不得运行浏览器。');
  const rt = await modules(), contract = sourceContract();
  const fixtures = { tree: fixture(rt, 'tree'), input: fixture(rt, 'input') };
  if (selectedCases.includes('sector')) {
    fixtures['sector-up'] = sectorFixture(rt, 1); fixtures['sector-down'] = sectorFixture(rt, -1);
  }
  const prep = { status: ARGS.has('--build-ready') ? 'BUILD_READY_PREFLIGHT_PASS' : 'PREPARED_WAITING_FOR_BUILD_READY', browserExecuted: false,
    preparedAt: new Date().toISOString(), sizes: SIZES, contract,
    fixtures: Object.values(fixtures).map(({ raw, state, ...f }) => ({ ...f, rawHash: hash(raw),
      growth: rt.growthSummary(state), skills: state.skills, evolutionRanks: state.evolutionRanks })) };
  assert.equal(rt.GROWTH_SKILLS.length, 12); assert.equal(rt.GROWTH_EVOLUTIONS.length, 4);
  assert.equal(rt.decreaseSkillQuote(fixtures.tree.state, 'evo_wanjian').returned, 4);
  assert.ok(rt.skillRequirement(fixtures.tree.state, 'sj_line').ok);
  write('ui-script-check.json', prep);
  if (ARGS.has('--check')) {
    console.log('PASS: source selector contract and two Campaign fixtures. Browser/build/sync not started.');
    return;
  }
  const { chromium } = require(PLAYWRIGHT), executablePath = process.env.UI_CHROMIUM_EXECUTABLE;
  if (executablePath) assert.ok(executablePath.includes('/ms-playwright/') &&
    executablePath.endsWith('/chrome-headless-shell'), 'Use installed Playwright headless only');
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  const report = { status: 'RUNNING', buildClassification: PHASE, scriptHash: hash(fs.readFileSync(__filename)),
    startedAt: new Date().toISOString(), url: URL, preparation: prep,
    browser: { version: browser.version(), module: PLAYWRIGHT, executablePath },
    results: [], failures: 0, visualReview: 'PENDING: actual circle geometry, row labels, fixed pane, joystick and modal images.' };
  async function scenario(viewport, kind, body) {
    if (selectedCases.length && !selectedCases.includes(kind) && !(kind.startsWith('sector-') && selectedCases.includes('sector'))) return;
    if (selectedSizes.length && !selectedSizes.includes(`${viewport.width}x${viewport.height}`)) return;
    const prefix = `ui-${TAG}-${viewport.width}x${viewport.height}-${kind}`, seed = fixtures[kind] || fixtures.input;
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
    const page = await context.newPage(), assetReads = [];
    const record = { viewport, kind, fixtureHash: hash(seed.raw), ok: false, checks: [], actions: [], screenshots: [],
      pageErrors: [], console: [], httpErrors: [], requestFailures: [], assets: [], invalidLabels: [] };
    report.results.push(record);
    page.on('pageerror', e => record.pageErrors.push(e.stack || e.message));
    page.on('console', m => { if (['error', 'warning'].includes(m.type())) record.console.push({ type: m.type(), text: m.text() }); });
    page.on('requestfailed', r => record.requestFailures.push({ url: r.url(), error: r.failure()?.errorText }));
    page.on('response', r => {
      if (r.status() >= 400) record.httpErrors.push({ url: r.url(), status: r.status() });
      if (r.request().resourceType() === 'script') {
        const asset = { url: r.url(), status: r.status() }; record.assets.push(asset);
        assetReads.push(r.body().then(bytes => { asset.sha256 = hash(bytes); })
          .catch(error => { asset.bodyReadError = String(error); }));
      }
    });
    await context.addInitScript(({ key, raw }) => {
      if (!sessionStorage.getItem('landscape-qa-fixture')) {
        localStorage.setItem(key, raw); sessionStorage.setItem('landscape-qa-fixture', '1');
      }
    }, { key: rt.TOWER_CAMPAIGN_KEY, raw: seed.raw });
    const scene = () => page.evaluate(inspectScene), host = () => page.evaluate(inspectHost);
    const state = () => page.evaluate(() => JSON.parse(JSON.stringify(towerQA.store.state)));
    const snapshot = () => page.evaluate(() => towerQA.run?.snapshot());
    const check = (name, data = {}) => record.checks.push({ name, passed: true, ...data });
    async function load(url = page.url().startsWith('http') ? page.url() : URL) {
      await page.goto(url);
      await page.waitForFunction(() => {
        const p = window.cc?.director.getScene()?.children.find(n => n.name === 'PinePilot');
        window.towerQA = p?.components.find(c => c.constructor.name === 'PinePilot')?.survivor;
        return !!window.towerQA?.store?.state;
      }, null, { timeout: 30000 });
      assert.equal(await page.evaluate(() => towerQA.store.readOnly), false);
      await page.waitForTimeout(120);
    }
    async function find(target, { parent, button = false, bottom = false } = {}) {
      const found = (await scene()).filter(n => (!button || n.button) &&
        (target instanceof RegExp ? target.test(n.name) : n.name === target) &&
        (!parent || n.ancestors.includes(parent)));
      return found.sort((a, b) => bottom ? b.y - a.y : a.y - b.y)[0];
    }
    async function settlePans() {
      // Cocos inertia keeps targets moving after mouse-up. Observe it settling;
      // never stopAutoScroll(), mutate offsets, or click stale coordinates.
      let previous = null, stable = 0;
      for (let i = 0; i < 80; i++) {
        const h = await host(), now = [h.treePan?.x || 0, h.treePan?.y || 0,
          h.detailPan?.x || 0, h.detailPan?.y || 0];
        if (!h.treePan && !h.detailPan) return;
        if (previous && now.every((v, index) => Math.abs(v - previous[index]) < .15)) stable++;
        else stable = 0;
        if (stable >= 3) return;
        previous = now; await page.waitForTimeout(65);
      }
      throw Error('Scroll inertia did not settle before pointer input');
    }
    async function drag(from, to, label, hold = 0, release = true) {
      record.actions.push({ type: 'pointer-drag', label, from, to, holdMs: hold, release });
      await page.mouse.move(from.x, from.y); await page.mouse.down();
      await page.mouse.move(to.x, to.y, { steps: 12 });
      if (hold) await page.waitForTimeout(hold);
      // A deliberate stop before lifting avoids a fast synthetic flick while
      // preserving ordinary Cocos touch/drag/scroll behavior.
      if (release) await page.waitForTimeout(550);
      if (release) await page.mouse.up();
      await page.waitForTimeout(180);
      if (release) await settlePans();
    }
    async function reveal(target, options = {}) {
      for (let i = 0; i < 100; i++) {
        const n = await find(target, options); assert.ok(n, `Missing target ${target}`);
        if (usable(n)) return n;
        const c = n.clip, w = c.right - c.left, h = c.bottom - c.top;
        assert.ok(w > 35 && h > 35, `No usable clipped area: ${target}`);
        const dx = n.box.left < c.left - 1 || n.x <= c.left + 8 ? Math.min(w * .55, c.left + w / 2 - n.x)
          : n.box.right > c.right + 1 || n.x >= c.right - 8 ? -Math.min(w * .55, n.x - c.left - w / 2) : 0;
        const dy = n.box.top < c.top - 1 || n.y <= c.top + 8 ? Math.min(h * .55, c.top + h / 2 - n.y)
          : n.box.bottom > c.bottom + 1 || n.y >= c.bottom - 8 ? -Math.min(h * .55, n.y - c.top - h / 2) : 0;
        const start = { x: c.left + w / 2 - dx / 2, y: c.top + h / 2 - dy / 2 };
        await drag(start, { x: start.x + dx, y: start.y + dy }, `reveal ${n.name}`);
      }
      throw Error(`Unable to pointer-pan to ${target}`);
    }
    async function click(target, options = {}) {
      await settlePans();
      const n = await reveal(target, { ...options, button: true });
      assert.equal(n.enabled, !options.disabled, `Unexpected enabled state: ${n.name}`);
      record.actions.push({ type: 'pointer-click', target: n.name, x: n.x, y: n.y, enabled: n.enabled });
      await page.mouse.click(n.x, n.y); await page.waitForTimeout(120); return n;
    }
    async function key(key, down) {
      record.actions.push({ type: down ? 'key-down' : 'key-up', key });
      await page.keyboard[down ? 'down' : 'up'](key);
    }
    async function shot(label) {
      const file = `${prefix}-${label}.png`;
      const beforeSnapshot = PHASE === 'final' ? await snapshot() : null;
      await page.screenshot({ path: path.join(OUT, file) }); record.screenshots.push(file);
      const afterSnapshot = PHASE === 'final' ? await snapshot() : null;
      const nodes = await scene();
      record.invalidLabels.push(...nodes.filter(n => /undefined|NaN/.test(compact(n.text)))
        .map(n => ({ stage: label, name: n.name, text: n.text })));
      const evidence = { host: await host(), scene: nodes, beforeSnapshot, afterSnapshot };
      write(`${prefix}-${label}.json`, evidence);
      return evidence;
    }
    async function layout() {
      const h = await host(), tree = await find('技能树面板'), detail = await find('技能详情固定栏');
      assert.ok(tree && detail, 'Tree and fixed selected-skill pane required');
      const v = page.viewportSize(), bounds = { left: 0, top: 0, right: v.width, bottom: v.height };
      assert.ok(inside(tree.box, bounds) && inside(detail.box, bounds), 'Panels extend outside viewport');
      if (v.width >= v.height) assert.ok(tree.box.right <= detail.box.left + 2, 'Landscape must put fixed details right of tree');
      else assert.ok(tree.box.bottom <= detail.box.top + 2, 'Portrait fallback must keep two separate stacked panes');
      assert.equal(h.menuPage, 'library');
      assert.ok(!(await scene()).some(n => ['对话面板', '全洗确认遮罩', '技能详情遮罩'].includes(n.name)), 'Details must not open a modal');
      return { tree, detail };
    }
    async function modalBounds(label) {
      const nodes = await scene(), v = page.viewportSize(), bounds = { left: 0, top: 0, right: v.width, bottom: v.height };
      const modal = nodes.find(n => n.name === '对话面板') || nodes.find(n => n.name === '初始化技能');
      assert.ok(modal, `${label}: modal absent`); assert.ok(inside(modal.box, bounds), `${label}: panel outside viewport`);
      const controls = nodes.filter(n => n.button && n.ancestors.includes(modal.name));
      assert.ok(controls.length);
      for (const n of controls.filter(n => !n.ancestors.includes('全洗明细内容')))
        assert.ok(inside(n.box, bounds), `${label}: button outside viewport: ${n.name}`);
      for (const n of nodes.filter(n => n.text && n.ancestors[0] === modal.name))
        assert.ok(inside(n.box, bounds), `${label}: title/body label outside viewport`);
      check(`Modal stays inside viewport: ${label}`, { viewport: v, box: modal.box, controls: controls.map(n => n.name) });
    }
    async function change(id, action) {
      await reveal(`${action}-${id}`, { button: true });
      const beforeHost = await host(), beforeState = await state(), beforeLayout = await layout();
      const quote = action === 'learnSkill'
        ? rt.skillRequirement(beforeState, id, { inTower: !!beforeState.activeRun }) : rt.decreaseSkillQuote(beforeState, id);
      assert.ok(quote.ok);
      const beforeText = compact((await scene()).filter(n => n.ancestors.includes('技能详情固定栏')).map(n => n.text).join('\n'));
      assert.ok(!/undefined|NaN/.test(beforeText), 'Invalid actual detail label before transaction');
      if (action === 'decreaseSkill' && beforeHost.selected === id) {
        assert.ok(beforeText.includes(`立即返还${quote.returned}技能点`), 'Actual refund preview amount differs');
        for (const c of quote.changes) {
          const name = [...rt.GROWTH_SKILLS, ...rt.GROWTH_EVOLUTIONS].find(s => s.id === c.id).name;
          assert.ok(beforeText.includes(`${name}${c.from}→${c.to}级`), 'Actual refund preview transition differs');
        }
        check('Actual compiled refund labels match quote; no undefined/NaN', { id, text: beforeText, changes: quote.changes });
      }
      const beforeControl = await click(`${action}-${id}`), afterHost = await host(), afterState = await state();
      assert.equal(afterHost.selected, beforeHost.selected, `${action}: selection changed`);
      samePan(afterHost.treePan, beforeHost.treePan, `${action}: two-axis tree pan`);
      samePan(afterHost.detailPan, beforeHost.detailPan, `${action}: independent detail pan`);
      const control = await find(`${action}-${id}`, { button: true });
      assert.ok(usable(control)); near(control.x, beforeControl.x, 'control x'); near(control.y, beforeControl.y, 'control y');
      assert.deepEqual((await layout()).detail.box, beforeLayout.detail.box, 'fixed detail pane moved');
      if (action === 'learnSkill') {
        assert.equal(rank(afterState, id), quote.nextLevel);
        assert.equal(rt.growthSummary(afterState).available, rt.growthSummary(beforeState).available - quote.cost);
      } else {
        assert.deepEqual(afterState.skills, quote.skills); assert.deepEqual(afterState.evolutionRanks, quote.evolutionRanks);
        assert.equal(rt.growthSummary(afterState).available, rt.growthSummary(beforeState).available + quote.returned);
        assert.deepEqual(afterState.books, beforeState.books);
      }
      const g = rt.growthSummary(afterState), text = compact((await scene()).map(n => n.text).join('\n'));
      assert.ok(text.includes(`技能点${g.available}/${g.total}·已分配${g.spent}`), 'SP summary stale');
      check(`${action}-${id}: allocation, selection, two-axis tree pan and detail pan retained`, { beforeHost, afterHost, quote });
    }
    try {
      await load();
      await body({ page, record, scene, host, state, snapshot, find, reveal, drag, click, key, shot, check, load, layout, modalBounds, change });
      assert.deepEqual(record.pageErrors, []); assert.deepEqual(record.console.filter(c => c.type === 'error'), []);
      assert.deepEqual(record.httpErrors, []); assert.deepEqual(record.requestFailures, []); assert.deepEqual(record.invalidLabels, []);
      record.ok = true;
    } catch (error) {
      report.failures++; record.error = error.stack || String(error);
      try { await shot('FAIL'); } catch (e) { record.captureError = String(e); }
      console.error(`${prefix}: ${record.error}`);
    } finally {
      await Promise.allSettled(assetReads); await context.close();
      write(`ui-browser-${TAG}.json`, report);
      console.log(`${prefix}: ${record.ok ? 'PASS' : 'FAIL'}`);
    }
  }
  try {
    for (const viewport of SIZES) {
      if (PHASE === 'final') {
        if (selectedCases.includes('mask')) {
          await scenario(viewport, 'mask', async q => {
            const extreme = viewport.width >= 1900, root = await q.find('霁云宗·功能版');
            assert.equal(root.mask, true, 'Actual built game root must own Mask');
            if (extreme) {
              const h = await q.host();
              near(h.size.width, 1280, 'Masked SHOW_ALL width', .01);
              near(h.size.height, 560, 'Masked SHOW_ALL height', .01);
              await q.shot('letterbox-before-world');
            } else {
              await q.click('技能树', { bottom: true }); await q.layout();
              await q.click('技能图标-vajra');
              await q.change('vajra', 'learnSkill');
              await q.shot('mask-tree-input');
              q.check('Root Mask allows real tree entry, circle selection and committed plus input');
              await q.click('宗门', { bottom: true });
            }
            const beforeImage = extreme ? path.join(OUT, q.record.screenshots.at(-1)) : null;
            await q.click('体验工具'); await q.click('进入独立体验档'); await q.click('无敌秒杀：关闭');
            if (extreme) await q.click('游戏速度 ×3');
            await q.click('返回宗门', { parent: '对话面板' });
            await q.click('锁妖塔', { bottom: true }); await q.click('重访第9层');
            await q.page.waitForFunction(() => towerQA.run?.state.time > 0);
            assert.equal((await q.snapshot()).arenaVersion, 1);
            const joystick = await q.find('移动摇杆'), scale = (joystick.box.right - joystick.box.left) / 224;
            assert.ok(inside(joystick.box, root.box));
            const before = (await q.snapshot()).player;
            await q.drag({ x: joystick.x, y: joystick.y }, { x: joystick.x + (extreme ? 36 : 60) * scale,
              y: joystick.y - (extreme ? 63 : 0) * scale }, extreme ? 'reproduce former wall overflow position' : 'legal fixed stick under root Mask',
              extreme ? 0 : 600, false);
            if (extreme) {
              let reached = false;
              for (let i = 0; i < 70; i++) {
                await q.page.waitForTimeout(100);
                const p = (await q.snapshot()).player, a = rt.HEX_VERTICES[0], b = rt.HEX_VERTICES[1];
                const dx = b.x - a.x, dy = b.y - a.y;
                const gap = -(dx * (p.y - a.y) - dy * (p.x - a.x)) / Math.hypot(dx, dy) - p.radius;
                if (gap < .5) { reached = true; break; }
              }
              assert.ok(reached, 'Could not reach the previous overflow camera position by real stick');
            }
            const moved = await q.snapshot(); assert.ok(moved.player.x > before.x + 5, 'Mask blocked legal joystick input');
            await q.page.mouse.up(); q.record.actions.push({ type: 'pointer-release', target: '移动摇杆 under root Mask' });
            await q.page.waitForTimeout(120);
            const released = await q.snapshot(), controls = await q.host();
            assert.equal(controls.touch, null); near(controls.stick.dx, 0, 'release dx', 1e-8); near(controls.stick.dy, 0, 'release dy', 1e-8);
            await q.page.waitForTimeout(180);
            const stopped = await q.snapshot();
            near(stopped.player.x, released.player.x, 'masked stick release x', 1e-6);
            near(stopped.player.y, released.player.y, 'masked stick release y', 1e-6);
            assert.deepEqual((await q.find('移动摇杆')).box, joystick.box);
            await q.shot(extreme ? 'letterbox-wall-clipped' : 'mask-fixed-stick');
            q.check('Actual root Mask preserves legal fixed joystick drag/release and fixed location', {
              root: root.box, before, moved: moved.player, released: released.player });
            if (extreme) {
              const afterImage = path.join(OUT, q.record.screenshots.at(-1));
              const pixels = compareLetterboxPixels(beforeImage, afterImage, root.box);
              write(`ui-${TAG}-${viewport.width}x${viewport.height}-mask-pixels.json`, pixels);
              assert.ok(pixels.examinedPixels > 100000);
              assert.equal(pixels.changedPixels, 0, 'World/ground still paints the letterbox pixels');
              q.check('VIS-01 actual PNG outside-root pixels unchanged from clean camp background', pixels);
            }
          });
          continue;
        }
        await scenario(viewport, 'hex', async q => {
          const extreme = viewport.width >= 1900;
          if (viewport.width === 844 || extreme) {
            await q.click('技能树', { bottom: true });
            const original = await q.layout();
            if (extreme) {
              const h = await q.host(), root = await q.find('霁云宗·功能版');
              near(h.size.width, 1280, 'SHOW_ALL logical width', .01);
              near(h.size.height, 560, 'SHOW_ALL minimum logical height', .01);
              const scale = Math.min(viewport.width / 1280, viewport.height / 560);
              near(root.box.right - root.box.left, 1280 * scale, 'letterbox content width', 2);
              near(root.box.bottom - root.box.top, 560 * scale, 'letterbox content height', 2);
              q.check('Extreme frame fits complete 1280x560 SHOW_ALL canvas', { host: h, root: root.box });
            }
            await q.shot('tree-current-build');
            if (viewport.width === 844) {
              for (const [id, side] of [['vajra', 1], ['magnet', -1]]) {
                const icon = await q.reveal(`技能图标-${id}`, { button: true });
                const x = icon.x + side * (icon.box.right - icon.box.left) * .375;
                q.record.actions.push({ type: 'pointer-click', target: icon.name, probe: '75% circle radius', x, y: icon.y });
                await q.page.mouse.click(x, icon.y); await q.page.waitForTimeout(120);
                assert.equal((await q.host()).selected, id, 'Circle edge pointer missed');
              }
              const icon = await q.find('技能图标-vajra'), c = icon.clip;
              const delta = icon.y - c.top + 12, x = (c.left + c.right) / 2, y = (c.top + c.bottom) / 2;
              await q.drag({ x, y: y + delta / 2 }, { x, y: y - delta / 2 }, 'clip circle center above Mask');
              const clipped = await q.find('技能图标-vajra');
              assert.ok(clipped.y < clipped.clip.top && clipped.y > 0, 'Need an actual clipped center inside browser');
              q.record.actions.push({ type: 'pointer-click', target: clipped.name, probe: 'outside Mask negative case', x: clipped.x, y: clipped.y });
              await q.page.mouse.click(clipped.x, clipped.y); await q.page.waitForTimeout(100);
              assert.equal((await q.host()).selected, 'magnet', 'Clipped icon accepted pointer outside Mask');
              await q.click('技能节点-vajra'); assert.equal((await q.host()).selected, 'vajra');
              await q.change('vajra', 'learnSkill'); await q.change('vajra', 'decreaseSkill');
              assert.deepEqual((await q.layout()).detail.box, original.detail.box);
              await q.shot('camp-pointer-preview');
              q.check('844 circle edge clicks, Mask clipping negative, same-page details and camp +/- actual labels');
            }
            await q.click('宗门', { bottom: true });
          }
          await q.click('体验工具'); await q.modalBounds('delivery tools entry');
          await q.click('进入独立体验档');
          const normalRaw = await q.page.evaluate(key => localStorage.getItem(key), rt.TOWER_CAMPAIGN_KEY);
          await q.click('无敌秒杀：关闭'); await q.click('游戏速度 ×3');
          await q.modalBounds('delivery tools x3'); await q.shot('tools-modal');
          await q.click('返回宗门', { parent: '对话面板' });
          await q.click('锁妖塔', { bottom: true }); await q.click('重访第9层');
          await q.page.waitForFunction(() => towerQA.run?.state.time > 0);
          const fresh = await q.snapshot(), h = await q.host();
          assert.equal(fresh.arenaVersion, 1, 'New real Campaign attempt did not opt into hex');
          assert.equal((await q.state()).activeRun.snapshot.arenaVersion, 1);
          await q.shot('hex-spawn');
          const paths = await q.page.evaluate(inspectArenaPaths);
          const matches = (list, expected) => list.some(p => expected.every(v =>
            p.points.some(t => Math.hypot(t.x - v.x, t.y - v.y) < .02)));
          assert.ok(matches(paths.world, rt.HEX_VERTICES.map(v => ({ x: v.x - paths.camera.x, y: v.y - paths.camera.y }))),
            'Actual world Graphics missing six hex vertices');
          const top = h.landscape ? 108 : 161, mapScale = Math.min(76 / 1890, 96 / 2160);
          const mapPoints = rt.HEX_VERTICES.map(v => ({ x: h.size.width / 2 - 69 + (v.x - rt.HEX_CENTER.x) * mapScale,
            y: h.size.height / 2 - top - 68 + (v.y - rt.HEX_CENTER.y) * mapScale }));
          assert.ok(matches(paths.hud, mapPoints), 'Actual HUD Graphics missing six-vertex overview');
          q.check('New Campaign arenaVersion=1; actual world and HUD paths contain six hex vertices', { paths });
          const root = await q.find('霁云宗·功能版'), joystick = await q.find('移动摇杆');
          assert.ok(inside(joystick.box, root.box), 'Joystick outside letterboxed game');
          assert.ok(joystick.x < root.box.left + (root.box.right - root.box.left) * .3);
          const scale = (joystick.box.right - joystick.box.left) / 224;
          const gaps = actor => rt.HEX_VERTICES.map((a, i) => {
            const b = rt.HEX_VERTICES[(i + 1) % 6], dx = b.x - a.x, dy = b.y - a.y;
            return -(dx * (actor.y - a.y) - dy * (actor.x - a.x)) / Math.hypot(dx, dy) - actor.radius;
          });
          const samples = [], start = fresh.player;
          await q.drag({ x: joystick.x, y: joystick.y },
            { x: joystick.x + 36 * scale, y: joystick.y - 63 * scale }, 'fixed joystick toward northeast diagonal wall', 0, false);
          let reached = false;
          for (let i = 0; i < 70; i++) {
            await q.page.waitForTimeout(100);
            const s = await q.snapshot(), margins = gaps(s.player);
            assert.equal(s.phase, 'playing');
            assert.ok(margins.every(v => v >= -1e-6), 'Player circle crossed hex wall');
            for (const e of s.enemies) assert.ok(gaps(e).every(v => v >= -1e-6), 'Enemy circle crossed hex wall');
            const bottom = h.landscape ? 72 : 86, cameraY = h.landscape ? 12 : 40;
            const expected = { xmin: s.player.x - h.size.width / 2 + 8, xmax: s.player.x + h.size.width / 2 - 8,
              ymin: s.player.y + cameraY - h.size.height / 2 + bottom + 8,
              ymax: s.player.y + cameraY + h.size.height / 2 - top - 8 };
            for (const k of Object.keys(expected)) near(s.view[k], expected[k], `x3 per-tick viewport ${k}`, 1e-6);
            samples.push({ time: s.time, player: s.player, margins, view: s.view, enemies: s.enemies.length });
            if (margins[0] < .5) { reached = true; break; }
          }
          await q.page.mouse.up(); q.record.actions.push({ type: 'pointer-release', target: '移动摇杆 diagonal wall' });
          assert.ok(reached, 'Natural joystick did not reach slanted hex edge within observation window');
          await q.page.waitForTimeout(120);
          const edge = await q.snapshot();
          assert.ok(Math.hypot(edge.player.x - start.x, edge.player.y - start.y) > 500);
          assert.deepEqual((await q.find('移动摇杆')).box, joystick.box);
          await q.shot('hex-diagonal-wall');
          q.check('Real x3 fixed joystick reaches slanted edge; player/enemy circles contained; per-tick viewport follows', { samples });
          const idle = edge.player, empty = { x: root.box.left + (root.box.right - root.box.left) * .76,
            y: root.box.top + (root.box.bottom - root.box.top) * .53 };
          await q.drag(empty, { x: empty.x - 35 * scale, y: empty.y + 25 * scale }, 'right-side field negative', 150);
          const still = await q.snapshot();
          near(still.player.x, idle.x, 'blank drag x', 1e-6); near(still.player.y, idle.y, 'blank drag y', 1e-6);
          await q.click('暂停'); const paused = await q.snapshot();
          await q.modalBounds('hex pause'); await q.shot('hex-pause');
          await q.page.waitForTimeout(150); assert.deepEqual(await q.snapshot(), paused);
          await q.click('继续挑战'); const resumed = await q.snapshot();
          near(resumed.player.x, paused.player.x, 'hex resume x', 1e-6);
          near(resumed.player.y, paused.player.y, 'hex resume y', 1e-6);
          assert.deepEqual(resumed.input, { x: 0, y: 0 });
          await q.key('d', true); await q.page.waitForTimeout(90);
          if (h.landscape) await q.click('技能树', { parent: '锁妖塔战场' });
          else { await q.click('暂停'); await q.click(/^技能树 · 可用/); }
          await q.key('d', false);
          assert.deepEqual((await q.host()).keys, []); assert.equal((await q.host()).touch, null);
          await q.layout(); await q.click('技能图标-vajra');
          const beforeMinus = await q.snapshot(), allocated = await q.state();
          await q.click('decreaseSkill-vajra', { disabled: true });
          assert.deepEqual(await q.snapshot(), beforeMinus);
          assert.deepEqual((await q.state()).skills, allocated.skills);
          await q.change('vajra', 'learnSkill');
          const frozen = await q.snapshot(), saved = await q.state();
          await q.page.waitForTimeout(250); assert.deepEqual(await q.snapshot(), frozen);
          await q.shot('hex-paused-skills');
          const rotated = h.landscape ? { width: 390, height: 844 } : { width: 844, height: 390 };
          for (const size of [rotated, viewport]) {
            q.record.actions.push({ type: 'viewport-resize', size }); await q.page.setViewportSize(size);
            await q.page.waitForFunction(wide => towerQA.landscape === wide, size.width >= size.height);
            await q.page.waitForTimeout(200);
            assert.deepEqual(await q.snapshot(), frozen, 'Orientation mutated full paused hex snapshot');
            assert.deepEqual((await q.state()).activeRun, saved.activeRun);
            await q.layout(); await q.shot(`hex-orientation-${size.width}x${size.height}`);
          }
          await q.load(); assert.deepEqual(await q.snapshot(), frozen);
          await q.modalBounds('hex reload pause'); await q.shot('hex-reload');
          await q.click('继续挑战');
          const reloadResume = await q.snapshot();
          near(reloadResume.player.x, frozen.player.x, 'reload resume x', 1e-6);
          near(reloadResume.player.y, frozen.player.y, 'reload resume y', 1e-6);
          assert.equal(await q.page.evaluate(key => localStorage.getItem(key), rt.TOWER_CAMPAIGN_KEY), normalRaw);
          q.check('Hex pause/resume, disabled minus, paused plus, input reset, frozen CD, orientation and reload/save isolation', {
            pausedHash: hash(frozen), activeRunHash: hash(saved.activeRun), hp: frozen.player.hp, rng: frozen.rng });
        });
        if (viewport.width === 844 && selectedCases.includes('sector')) for (const kind of ['sector-up', 'sector-down']) {
          await scenario(viewport, kind, async q => {
            const probe = fixtures[kind].probe, before = await q.snapshot();
            assert.equal(before.phase, 'paused'); assert.equal(before.arenaVersion, 1);
            const rawBefore = await q.page.evaluate(key => localStorage.getItem(key), rt.TOWER_CAMPAIGN_KEY);
            await q.page.evaluate(() => {
              const world = towerQA.world, original = world.arc;
              window.towerArcProbe = [];
              // Observe actual compiled renderer calls during normal paused
              // frames. Preserve arguments/return values; never invoke draw().
              world.arc = function (...args) {
                if (window.towerArcProbe.length < 256) window.towerArcProbe.push(args);
                return original.apply(this, args);
              };
            });
            await q.page.waitForFunction(radius => window.towerArcProbe.some(a => Math.abs(a[2] - radius) < 1e-8),
              probe.attack.range, { timeout: 5000 });
            const arcs = await q.page.evaluate(radius => window.towerArcProbe.filter(a => Math.abs(a[2] - radius) < 1e-8),
              probe.attack.range);
            const camera = (await q.host()).camera;
            for (const [x, y, radius, start, end, counterclockwise] of arcs) {
              near(x, probe.warning.x - camera.x, 'sector world x', 1e-8);
              near(y, probe.warning.y - camera.y, 'sector world y', 1e-8);
              near(radius, probe.attack.range, 'sector radius', 1e-8);
              near(end - start, 140 * Math.PI / 180, 'sector authored sweep', 1e-8);
              near(Math.cos((start + end) / 2), 0, 'sector exact vertical faceX', 1e-8);
              near(Math.sin((start + end) / 2), probe.faceY, 'sector vertical faceY', 1e-8);
              assert.equal(counterclockwise, false);
            }
            await q.shot('compiled-vertical-sector');
            assert.deepEqual(await q.snapshot(), before, 'Graphics observation mutated snapshot');
            assert.equal(await q.page.evaluate(key => localStorage.getItem(key), rt.TOWER_CAMPAIGN_KEY), rawBefore);
            q.check('Compiled actual Graphics.arc respects exact vertical zero-X direction, frozen state and save', {
              fixture: fixtures[kind].kind, probe, arcs, snapshotHash: hash(before) });
          });
        }
        if (viewport.width === 1280) await scenario(viewport, 'ranged', async q => {
          await q.click('锁妖塔', { bottom: true }); await q.click('重访第9层');
          await q.page.waitForFunction(() => towerQA.run?.state.time > 0);
          assert.equal((await q.snapshot()).arenaVersion, 1);
          const observations = [];
          let captured = false;
          for (let attempt = 0; attempt < 4 && !captured; attempt++) {
            await q.page.waitForFunction(() => {
              const s = towerQA.run?.state, v = s?.view;
              return s?.phase === 'playing' && s.projectiles.some(p => p.hostile &&
                ['poison', 'feather', 'sonic'].includes(p.element) &&
                p.x > v.xmin + 25 && p.x < v.xmax - 25 && p.y > v.ymin + 25 && p.y < v.ymax - 25);
            }, null, { timeout: 30000, polling: 'raf' });
            const evidence = await q.shot(`real-ranged-emit-${attempt + 1}`);
            const before = evidence.beforeSnapshot.projectiles.filter(p => p.hostile && p.element);
            const after = evidence.afterSnapshot.projectiles.filter(p => p.hostile && p.element);
            const retained = before.filter(p => after.some(a => a.id === p.id));
            observations.push({ beforeTime: evidence.beforeSnapshot.time, afterTime: evidence.afterSnapshot.time,
              before, after, emitCount: evidence.afterSnapshot.events?.length, enemies: evidence.afterSnapshot.enemies });
            captured = retained.length > 0;
          }
          assert.ok(captured, 'No real hostile projectile persisted across screenshot capture');
          q.check('Real new-attempt ranged projectile visible across screenshot interval; no injected enemy/shot', { observations });
          await q.click('暂停'); await q.shot('real-ranged-paused');
        });
        continue;
      }
      await scenario(viewport, 'tree', async q => {
        await q.click('技能树', { bottom: true });
        const originalLayout = await q.layout(), initial = await q.state();
        assert.equal((await q.host()).selected, 'sj_yujian', 'initial fixed pane must select 御剑术');
        const defs = [...rt.GROWTH_SKILLS, ...rt.GROWTH_EVOLUTIONS], nodes = await q.scene();
        if (viewport.width === 844 && viewport.height === 390) {
          const treeScroll = nodes.find(n => n.name === '技能树二维卷轴');
          const detailScroll = nodes.find(n => n.name === '技能详情独立卷轴');
          for (const [node, expected] of [[treeScroll, contract.handoff844LogicalViewports.tree],
            [detailScroll, contract.handoff844LogicalViewports.detail]]) {
            near(node.logicalSize.width, expected.width, `${node.name} logical width`, .2);
            near(node.logicalSize.height, expected.height, `${node.name} logical height`, .2);
          }
          const targets = ['vajra', 'magnet', 'sj_yujian', 'sj_heart'].flatMap(id =>
            ['learnSkill-', 'decreaseSkill-'].map(prefix => nodes.find(n => n.name === prefix + id)));
          for (const control of targets) {
            assert.ok(inside(control.box, control.clip, .75), `initial small-landscape control clipped: ${control.name}`);
            assert.ok(control.box.right - control.box.left >= 48, `${control.name}: hit target too narrow`);
            assert.ok(control.box.bottom - control.box.top >= 48, `${control.name}: hit target too short`);
          }
          q.check('844x390 handoff geometry and initial +/- edge visibility', {
            treeViewport: treeScroll.logicalSize, detailViewport: detailScroll.logicalSize,
            controls: targets.map(n => ({ name: n.name, box: n.box, clip: n.clip })) });
        }
        for (const skill of defs) {
          for (const prefix of ['技能节点-', '技能图标-', '技能等级-', 'learnSkill-', 'decreaseSkill-'])
            assert.equal(nodes.filter(n => n.name === prefix + skill.id).length, 1, `${prefix}${skill.id}`);
          const icon = nodes.find(n => n.name === `技能图标-${skill.id}`), badge = nodes.find(n => n.name === `技能等级-${skill.id}`);
          near(icon.box.right - icon.box.left, icon.box.bottom - icon.box.top, `${skill.id}: square circle bounds`, 1);
          assert.ok(icon.graphics && icon.button, `${skill.id}: drawn clickable icon`);
          assert.ok(badge.x < icon.x && badge.y > icon.y, `${skill.id}: level badge must be lower-left`);
          assert.ok(nodes.some(n => n.ancestors.includes(badge.name) && n.text === String(rank(initial, skill.id))));
          const caption = compact(nodes.filter(n => n.ancestors.includes(`技能节点-${skill.id}`)).map(n => n.text).join(''));
          assert.ok(caption.includes(skill.name) && caption.includes(cadence(skill, rt)), `${skill.id}: name/cadence absent`);
        }
        const rowY = ids => ids.map(id => nodes.find(n => n.name === `技能图标-${id}`).y);
        const basic = rowY(rt.GROWTH_SKILLS.map(s => s.id)), evo = rowY(rt.GROWTH_EVOLUTIONS.map(s => s.id));
        assert.ok(Math.max(...basic) - Math.min(...basic) < 1);
        assert.ok(Math.max(...evo) - Math.min(...evo) < 1 && evo[0] > basic[0]);
        q.check('16 circle icons, lower-left rank badges, authored CD/name captions and two realm rows', { basicRowY: basic, evolutionRowY: evo });
        await q.shot('initial-tree');
        for (const skill of defs) {
          await q.click(`技能图标-${skill.id}`);
          assert.equal((await q.host()).selected, skill.id);
          assert.deepEqual((await q.layout()).detail.box, originalLayout.detail.box);
          const labels = (await q.scene()).filter(n => n.ancestors.includes('技能详情固定栏')).map(n => n.text);
          assert.ok(labels.some(t => compact(t).includes(skill.name)), `${skill.id}: selected details stale`);
        }
        q.check('All 16 nodes reachable by real two-axis drag and pointer selection; fixed pane stays put');
        await q.shot('last-evolution-selected');
        await q.click('技能节点-sj_line');
        await q.change('sj_line', 'learnSkill'); await q.change('sj_line', 'decreaseSkill');
        await q.click('技能图标-evo_wanjian');
        await q.reveal('decreaseSkill-evo_wanjian', { button: true });
        // The first evolution can legitimately be reached at horizontal zero.
        // Establish a nonzero offset with a real drag before testing retention.
        if (Math.abs((await q.host()).treePan.x) < 10) {
          const target = await q.find('decreaseSkill-evo_wanjian');
          const c = target.clip;
          await q.drag({ x: (c.left + c.right) / 2 + 30, y: (c.top + c.bottom) / 2 },
            { x: (c.left + c.right) / 2 - 30, y: (c.top + c.bottom) / 2 }, 'establish horizontal retention fixture');
          await q.reveal('decreaseSkill-evo_wanjian', { button: true });
        }
        const before = await q.host();
        assert.ok(Math.abs(before.treePan.x) > 10 && before.treePan.y > 10, 'test needs nonzero horizontal AND vertical pan');
        const detailView = await q.find('技能详情独立卷轴'), c = detailView.box;
        await q.drag({ x: (c.left + c.right) / 2, y: c.bottom - 20 },
          { x: (c.left + c.right) / 2, y: c.top + 20 }, 'independent detail scroll');
        const after = await q.host(); samePan(after.treePan, before.treePan, 'detail scrolling must not move tree');
        assert.ok(after.detailPan.y > before.detailPan.y + 10);
        await q.reveal('技能图标-evo_wanjian', { button: true });
        const reselectBefore = await q.host();
        await q.click('技能图标-evo_wanjian');
        const reselectAfter = await q.host();
        samePan(reselectAfter.treePan, reselectBefore.treePan, 'reselect retains tree pan');
        samePan(reselectAfter.detailPan, reselectBefore.detailPan, 'reselect retains detail scroll');
        await q.change('evo_wanjian', 'decreaseSkill'); await q.change('evo_wanjian', 'learnSkill');
        await q.shot('pan-and-selection-retained');
        await q.click('查看全洗退款明细');
        await q.modalBounds('camp respec'); await q.shot('respec-modal'); await q.click('关闭', { parent: '初始化技能' });
        const saved = await q.state(); await q.load();
        const reloaded = await q.state();
        for (const key of ['skills', 'evolutionRanks', 'books', 'cores']) assert.deepEqual(reloaded[key], saved[key]);
        q.check('Committed allocation survives independent-context reload');
      });
      await scenario(viewport, 'input', async q => {
        await q.click('体验工具'); await q.modalBounds('playtest entry');
        await q.click('进入独立体验档'); await q.modalBounds('playtest tools'); await q.shot('tools-modal');
        const normalRaw = await q.page.evaluate(key => localStorage.getItem(key), rt.TOWER_CAMPAIGN_KEY);
        await q.click('无敌秒杀：关闭'); await q.click('返回宗门', { parent: '对话面板' });
        await q.click('锁妖塔', { bottom: true }); await q.click('重访第9层');
        await q.page.waitForFunction(() => towerQA.run?.state.phase === 'playing');
        const joystick = await q.find('移动摇杆');
        assert.ok(joystick && joystick.x < viewport.width * .3 && joystick.y > viewport.height * .5);
        assert.ok(inside(joystick.box, { left: 0, top: 0, right: viewport.width, bottom: viewport.height }));
        await q.shot('fixed-joystick');
        const scale = (joystick.box.right - joystick.box.left) / 224;
        const p0 = (await q.snapshot()).player;
        await q.drag({ x: joystick.x, y: joystick.y }, { x: joystick.x + 60 * scale, y: joystick.y },
          'joystick right hold', 600, false);
        const moving = await q.host(), p1 = (await q.snapshot()).player;
        assert.ok(p1.x > p0.x + 5 && moving.touch !== null && moving.stick.dx > .5, 'held joystick must move player right');
        assert.deepEqual((await q.find('移动摇杆')).box, joystick.box, 'joystick center relocated');
        await q.page.mouse.up(); q.record.actions.push({ type: 'pointer-release', target: '移动摇杆' });
        await q.page.waitForTimeout(150);
        const stopped = await q.snapshot(), released = await q.host();
        assert.equal(released.touch, null); near(released.stick.dx, 0, 'released dx', 1e-8); near(released.stick.dy, 0, 'released dy', 1e-8);
        await q.page.waitForTimeout(300);
        const later = await q.snapshot();
        near(later.player.x, stopped.player.x, 'release stops x', 1e-6); near(later.player.y, stopped.player.y, 'release stops y', 1e-6);
        q.check('Actual fixed joystick drag/hold moves; release resets input and stops player', { p0, p1, released });
        const empty = { x: viewport.width * .8, y: viewport.height * .5 };
        const idle = (await q.snapshot()).player;
        await q.drag(empty, { x: empty.x - 50, y: empty.y + 25 }, 'right-side blank drag', 250);
        const untouched = await q.host(), idleAfter = (await q.snapshot()).player;
        assert.equal(untouched.touch, null);
        near(idleAfter.x, idle.x, 'right field drag cannot move x', 1e-6);
        near(idleAfter.y, idle.y, 'right field drag cannot move y', 1e-6);
        q.check('Right-side empty battlefield drag neither moves player nor relocates joystick');
        // Pause while the real mouse is held: resetInput must cancel the active
        // joystick even though release occurs after the battle tree is rebuilt.
        await q.drag({ x: joystick.x, y: joystick.y }, { x: joystick.x, y: joystick.y - 45 * scale },
          'held joystick before pause', 100, false);
        await q.key('Escape', true); await q.key('Escape', false);
        await q.page.mouse.up(); q.record.actions.push({ type: 'pointer-release', target: 'old joystick after pause' });
        await q.page.waitForTimeout(100); await q.modalBounds('battle pause');
        assert.equal((await q.host()).touch, null);
        const paused = await q.snapshot(), pausedHost = await q.host();
        assert.equal(paused.phase, 'paused');
        assert.equal(pausedHost.touch, null); assert.deepEqual(pausedHost.keys, []);
        near(pausedHost.stick.dx, 0, 'pause clears host joystick dx', 1e-8);
        near(pausedHost.stick.dy, 0, 'pause clears host joystick dy', 1e-8);
        // Paused Run.setInput is deliberately a no-op: input in the immutable
        // checkpoint is the last sample, not an active movement command.
        await q.page.waitForTimeout(200); assert.deepEqual(await q.snapshot(), paused);
        q.check('Held-pointer pause clears host controls and freezes historical input sample', {
          historicalInput: paused.input, hostControls: pausedHost });
        await q.shot('pause-modal');
        await q.click('继续挑战');
        const resumed = await q.snapshot();
        assert.deepEqual(resumed.input, { x: 0, y: 0 }, 'resume must clear historical input before movement');
        near(resumed.player.x, paused.player.x, 'resume has no leftover x motion', 1e-6);
        near(resumed.player.y, paused.player.y, 'resume has no leftover y motion', 1e-6);
        // Open skills with actual key input still held. The skill transition must
        // clear both keyboard and joystick state and checkpoint the paused run.
        await q.key('d', true); await q.page.waitForTimeout(120);
        if ((await q.host()).landscape) await q.click('技能树', { parent: '锁妖塔战场' });
        else { await q.click('暂停'); await q.click(/^技能树 · 可用/); }
        const skillHost = await q.host(); assert.equal(skillHost.screen, 'skills');
        assert.deepEqual(skillHost.keys, []); assert.equal(skillHost.touch, null);
        await q.key('d', false);
        const skillSnapshot = await q.snapshot(); assert.equal(skillSnapshot.phase, 'paused');
        await q.page.waitForTimeout(350); assert.deepEqual(await q.snapshot(), skillSnapshot, 'skills must freeze full combat snapshot/CD');
        await q.layout(); await q.shot('skills-paused');
        q.check('Pause cancels held pointer; skill entry cancels held key and freezes full snapshot');
        const saved = await q.state();
        const orientationEvidence = { before: { snapshotHash: hash(skillSnapshot), activeRunHash: hash(saved.activeRun),
          hp: skillSnapshot.player.hp, rng: skillSnapshot.rng, time: skillSnapshot.time,
          floor: skillSnapshot.floor, wave: skillSnapshot.wave, clearedWaves: skillSnapshot.clearedWaves,
          earned: skillSnapshot.earned }, resized: [] };
        const rotated = viewport.width >= viewport.height ? { width: 390, height: 844 } : { width: 844, height: 390 };
        for (const size of [rotated, viewport]) {
          q.record.actions.push({ type: 'viewport-resize', size });
          await q.page.setViewportSize(size);
          await q.page.waitForFunction(wide => towerQA.landscape === wide, size.width >= size.height);
          await q.page.waitForTimeout(250);
          assert.deepEqual(await q.snapshot(), skillSnapshot, 'orientation changed HP/RNG/time/loot/progress');
          assert.deepEqual((await q.state()).activeRun, saved.activeRun, 'orientation changed persisted attempt');
          orientationEvidence.resized.push({ size, snapshotHash: hash(await q.snapshot()),
            activeRunHash: hash((await q.state()).activeRun), host: await q.host() });
          await q.layout(); await q.shot(`orientation-${size.width}x${size.height}`);
        }
        q.check('Orientation roundtrip preserves exact HP/RNG/progress/loot/cooldowns and active save', orientationEvidence);
        await q.load(); assert.deepEqual(await q.snapshot(), skillSnapshot);
        await q.modalBounds('reload pause'); await q.shot('reload-pause');
        await q.click('继续挑战');
        await q.page.waitForFunction(time => towerQA.run?.state.time > time, skillSnapshot.time);
        const resumedStick = await q.host(); assert.equal(resumedStick.touch, null); assert.deepEqual(resumedStick.keys, []);
        assert.equal(await q.page.evaluate(key => localStorage.getItem(key), rt.TOWER_CAMPAIGN_KEY), normalRaw);
        q.check('Reload/resume remains playable and ordinary raw save was untouched');
      });
    }
    assert.ok(report.results.length > 0, 'No selected cases executed');
    report.status = report.failures ? 'FAILED' : 'AUTOMATED_PASS_VISUAL_REVIEW_PENDING';
  } catch (error) {
    report.failures++; report.error = error.stack || String(error); report.status = 'FAILED';
  } finally {
    report.finishedAt = new Date().toISOString();
    write(`ui-browser-${TAG}.json`, report); await browser.close();
  }
  if (report.failures) process.exitCode = 1;
}
if (require.main === module) main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
