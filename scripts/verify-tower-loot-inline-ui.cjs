// Isolated pointer acceptance for inline skill controls and graded kill loot.
// Ownership: this script and reports/tower-loot-inline-2026-10-28/ui-* only.
// Preparation (does not start a browser, server, build or sync):
//   node scripts/verify-tower-loot-inline-ui.cjs --check
// ONLY after the coordinator says buildready:
//   node scripts/verify-tower-loot-inline-ui.cjs --build-ready
// Optional: UI_CASES=labels,retreat,cap UI_SIZES=390x844 UI_RUN_TAG=final-loot
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { createHash } = require('node:crypto');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'docs/xianxia/reports/tower-loot-inline-2026-10-28');
const PREVIEW = process.env.PREVIEW_URL ||
  'http://127.0.0.1:8767/cocos-pilot/build/web-mobile/index.html?ruleset=xianxia&tower=1';
const PLAYWRIGHT = process.env.PLAYWRIGHT_MODULE ||
  '/Users/zhangnu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright';
const VIEWPORTS = [
  { width: 390, height: 844 }, { width: 360, height: 640 },
  { width: 1280, height: 800 }, { width: 720, height: 1280 }, { width: 1080, height: 2400 },
];
const SOURCE_FILES = ['cocos-pilot/assets/scripts/TowerMenu.ts', 'cocos-pilot/assets/scripts/TowerView.ts',
  'js/xianxia/TowerCampaign.js', 'js/xianxia/TowerGrowth.js', 'js/xianxia/TowerLoot.js', 'js/xianxia/TowerRun.js'];
const ARGS = new Set(process.argv.slice(2));
const TAG = process.env.UI_RUN_TAG || 'acceptance';
assert.match(TAG, /^[a-zA-Z0-9-]+$/);
const split = value => (value || '').split(',').filter(Boolean);
const SELECT_CASES = split(process.env.UI_CASES), SELECT_SIZES = split(process.env.UI_SIZES);
const clone = value => JSON.parse(JSON.stringify(value));
const compactText = value => value.replace(/\s+/g, '');
const hash = value => createHash('sha256').update(Buffer.isBuffer(value) || typeof value === 'string'
  ? value : JSON.stringify(value)).digest('hex');
function write(name, data) {
  assert.match(name, /^ui-[a-zA-Z0-9_.-]+$/);
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, name), typeof data === 'string' ? data : JSON.stringify(data, null, 2) + '\n');
}
async function modules() {
  const files = ['js/xianxia/TowerCampaign.js', 'js/xianxia/TowerGrowth.js', 'js/xianxia/TowerProfile.js',
    'js/xianxia/TowerRun.js', 'js/xianxia/TowerLoot.js', 'js/xianxia/TowerPlaytest.js', 'js/xianxia/Checksum.js'];
  return Object.assign({}, ...await Promise.all(files.map(file => import(pathToFileURL(path.join(ROOT, file)).href))));
}
function sourceContract() {
  const menu = fs.readFileSync(path.join(ROOT, SOURCE_FILES[0]), 'utf8');
  const view = fs.readFileSync(path.join(ROOT, SOURCE_FILES[1]), 'utf8');
  const contract = {
    plus: 'learnSkill-<id>', minus: 'decreaseSkill-<id>', name: '技能节点-<id>',
    row: '技能行-<id>', tree: '十六技能树', inlineDetails: '同页技能详情',
    sourceHasInlineDetails: menu.includes("'同页技能详情'"),
    sourceHasActionControls: menu.includes('`${action}-${id}`'),
    sourceHasValueUnit: menu.includes('妖丹值') && menu.includes('折合一阶计价'),
    sourceHasLootSummary: view.includes('coreLootSummary'),
  };
  assert.ok(contract.sourceHasInlineDetails && contract.sourceHasActionControls, 'new inline source contract absent');
  return contract;
}

// Artificial camp source fields only. Every purchased rank/book is obtained via
// Campaign.act; the final envelope comes from Campaign's real encoder/validator.
// No user profile is read. The map is transferred ONLY into a fresh browser context.
function fixture(rt, kind) {
  const memory = new Map(), storage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, v) };
  const now = Date.now(), transactions = [];
  let store = new rt.TowerCampaignStore(storage, now);
  assert.ok(store.act({ type: 'sync' }, now).ok);
  const envelope = JSON.parse(memory.get(rt.TOWER_CAMPAIGN_KEY));
  const state = JSON.parse(envelope.data);
  const sources = { xp: rt.TOWER_XP_CAP, hp: rt.cultivationAt(rt.TOWER_XP_CAP).maxHp,
    clearedFloor: ['loot', 'cap'].includes(kind) ? 8 : 9,
    cores: kind === 'cap' ? rt.TOWER_RESOURCE_CAP - 3 : 2000, tutorialWaves: 3 };
  Object.assign(state, sources, { skills: rt.giftSkills(3), books: [], evolutions: [],
    evolutionRanks: {}, researchPurchases: 0 });
  envelope.data = JSON.stringify(state); envelope.checksum = rt.checksum(envelope.data);
  memory.set(rt.TOWER_CAMPAIGN_KEY, JSON.stringify(envelope));
  store = new rt.TowerCampaignStore(storage, now);
  assert.equal(store.readOnly, false, `${kind} source validation: ${store.error}`);
  const act = action => {
    const result = store.act(action, now); transactions.push({ action, result });
    assert.ok(result.ok, JSON.stringify({ kind, action, result }));
  };
  const learnTo = (id, rank) => {
    while ((store.state.skills[id] || store.state.evolutionRanks[id] || 0) < rank) act({ type: 'learnSkill', id });
  };
  if (kind === 'camp') {
    learnTo('sj_arc', 6); learnTo('sj_line', 6); learnTo('vajra', 5);
  } else if (kind === 'refunds') {
    learnTo('sj_arc', 2); learnTo('sj_line', 1);
    learnTo('sj_yujian', 8); learnTo('sj_heart', 5); learnTo('evo_wanjian', 2);
  } else if (kind === 'paused') learnTo('vajra', 1);
  act({ type: 'sync' });
  store = new rt.TowerCampaignStore(storage, now);
  assert.equal(store.readOnly, false, `${kind} encoded roundtrip: ${store.error}`);
  return { kind: 'ARTIFICIAL VALIDATED CAMP FIXTURE — UI ONLY, NOT NATURAL PROGRESSION OR BALANCE',
    name: kind, sources, transactions, raw: memory.get(rt.TOWER_CAMPAIGN_KEY), state: clone(store.state) };
}

// Read-only Cocos scene geometry. All UI activations below use page.mouse.click;
// no Button.emit, synthetic click, host.action, host.goto or direct skill mutation.
function inspectScene() {
  const walk = n => [n, ...n.children.flatMap(walk)];
  const canvas = document.querySelector('canvas'), rect = canvas.getBoundingClientRect();
  const nodes = walk(cc.director.getScene());
  const camera = nodes.map(n => n.getComponent('cc.Camera')).find(Boolean);
  const xy = p => {
    const v = camera.worldToScreen(p);
    return { x: rect.x + v.x / canvas.width * rect.width, y: rect.y + (1 - v.y / canvas.height) * rect.height };
  };
  const local = (n, x, y) => xy(n.getComponent('cc.UITransform').convertToWorldSpaceAR(new cc.Vec3(x, y, 0)));
  const box = n => {
    const t = n.getComponent('cc.UITransform'); if (!t) return null;
    const points = [[-t.anchorX, -t.anchorY], [1 - t.anchorX, 1 - t.anchorY]]
      .map(([x, y]) => local(n, x * t.width, y * t.height));
    return { left: Math.min(...points.map(p => p.x)), right: Math.max(...points.map(p => p.x)),
      top: Math.min(...points.map(p => p.y)), bottom: Math.max(...points.map(p => p.y)) };
  };
  return walk(window.towerQA.root).filter(n => n.activeInHierarchy).map(n => {
    const button = n.getComponent('cc.Button'), label = n.getComponent('cc.Label');
    const graphics = n.getComponent('cc.Graphics');
    let clip = { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }, parent = n.parent;
    const ancestors = [];
    while (parent) {
      ancestors.push(parent.name);
      if (parent.getComponent('cc.Mask')) {
        const b = box(parent);
        if (b) clip = { left: Math.max(clip.left, b.left), right: Math.min(clip.right, b.right),
          top: Math.max(clip.top, b.top), bottom: Math.min(clip.bottom, b.bottom) };
      }
      parent = parent.parent;
    }
    // Read optional graphics paths to substantiate actual rendered connectors.
    // Screenshots remain required: component presence alone is not visual proof.
    const paths = n.name === '十六技能树' ? (graphics?.impl || graphics?._impl)?.paths ||
      (graphics?.impl || graphics?._impl)?._paths : null;
    const segments = [];
    if (Array.isArray(paths)) for (const p of paths) {
      const points = p.points || p._points || [];
      for (let i = 1; i < points.length; i++) if (Number.isFinite(points[i - 1].x + points[i].x)) {
        segments.push({ from: local(n, points[i - 1].x, points[i - 1].y),
          to: local(n, points[i].x, points[i].y) });
      }
    }
    return { name: n.name, ancestors, button: !!button, enabled: button?.interactable ?? false,
      text: label?.string || '', ...xy(n.worldPosition), box: box(n), clip,
      graphics: !!graphics, ...(paths ? { connectorSegments: segments } : {}) };
  });
}
const rank = (state, id) => state.skills[id] || state.evolutionRanks[id] || 0;
const summaryFields = state => ({ skills: state.skills, books: state.books, evolutionRanks: state.evolutionRanks,
  evolutions: state.evolutions, cores: state.cores, researchPurchases: state.researchPurchases });
const frozenCombat = s => Object.fromEntries(Object.entries(s).filter(([key]) => key !== 'loadout'));
const visible = n => n && n.x > n.clip.left + 2 && n.x < n.clip.right - 2 &&
  n.y > n.clip.top + 10 && n.y < n.clip.bottom - 10;
function independentLoot(rt, snapshot) {
  const byRank = Array(7).fill(0);
  let value = 0;
  for (const kill of snapshot.killLedger) if (kill.coreRank > 0) {
    assert.ok(Number.isInteger(kill.coreRank) && kill.coreRank <= 7, 'invalid graded receipt');
    const denomination = rt.CORE_RANK_VALUES[kill.coreRank];
    assert.ok(Number.isFinite(denomination) && denomination > 0, 'invalid core denomination');
    byRank[kill.coreRank - 1]++; value += denomination;
  }
  return { byRank, count: byRank.reduce((a, b) => a + b, 0), value };
}

async function main() {
  assert.ok(ARGS.has('--check') || ARGS.has('--build-ready'),
    'Waiting for parent buildready. Use --check to prepare without opening a browser.');
  const rt = await modules(), contract = sourceContract();
  const fixtures = Object.fromEntries(['camp', 'refunds', 'paused', 'loot', 'cap'].map(name => [name, fixture(rt, name)]));
  const preparation = { status: 'PREPARED_WAITING_FOR_BUILDREADY', browserExecuted: false,
    preparedAt: new Date().toISOString(), contract, viewports: VIEWPORTS, coreRankValues: rt.CORE_RANK_VALUES,
    sourceHashes: Object.fromEntries(SOURCE_FILES.map(file => [file, hash(fs.readFileSync(path.join(ROOT, file)))])),
    fixtures: Object.values(fixtures).map(({ raw, state, ...f }) => ({ ...f, rawHash: hash(raw),
      summary: rt.growthSummary(state), state: summaryFields(state) })) };
  // Check the actual varying-cost and dependency cases before starting any browser.
  assert.equal(rt.skillRequirement(fixtures.camp.state, 'sj_arc').cost, 2);
  assert.equal(rt.skillRequirement(fixtures.camp.state, 'sj_line').cost, 3);
  assert.equal(rt.skillRequirement(fixtures.camp.state, 'vajra').cost, 2);
  assert.equal(rt.decreaseSkillQuote(fixtures.refunds.state, 'evo_wanjian').returned, 4);
  assert.ok(rt.decreaseSkillQuote(fixtures.refunds.state, 'sj_arc').changes.some(c => c.id === 'sj_line'));
  assert.ok(rt.decreaseSkillQuote(fixtures.refunds.state, 'sj_yujian').changes.some(c => c.id === 'evo_wanjian'));
  write('ui-script-check.json', preparation);
  if (ARGS.has('--check')) {
    console.log('PASS: source contract, five Campaign-encoded fixtures, variable costs and cascades. Browser not started.');
    return;
  }
  const { chromium } = require(PLAYWRIGHT);
  // Bundled Chromium, fresh nonpersistent contexts. No CDP, liveIAB, Chrome channel,
  // user data directory, storageState import, browser killing or external profile.
  const executablePath = process.env.UI_CHROMIUM_EXECUTABLE;
  if (executablePath) assert.ok(executablePath.includes('/ms-playwright/') &&
    executablePath.endsWith('/chrome-headless-shell'), 'Only an installed Playwright headless executable may override launch');
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  const report = { status: 'RUNNING', startedAt: new Date().toISOString(), url: PREVIEW,
    browser: { version: browser.version(), playwrightModule: PLAYWRIGHT, executablePath: executablePath || 'Playwright default' },
    authorizedBuildFlag: true, preparation, selection: { cases: SELECT_CASES, sizes: SELECT_SIZES },
    evidencePolicy: 'UI buttons use actual pointer clicks. Camp fixture sources are artificial. Loot uses real Run spawns/attacks/receipts with explicit playtest assist and accelerated stepping, not balance evidence.',
    results: [], failures: 0, visualReview: 'PENDING: inspect screenshots, especially connector visibility and graded-drop legibility.' };
  const reportName = `ui-browser-${TAG}.json`;
  async function scenario(viewport, name, body) {
    if (SELECT_CASES.length && !SELECT_CASES.includes(name)) return;
    if (SELECT_SIZES.length && !SELECT_SIZES.includes(`${viewport.width}x${viewport.height}`)) return;
    const seed = fixtures[['diagnostic', 'labels'].includes(name) ? 'camp' : name === 'retreat' ? 'loot' : name];
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
    const page = await context.newPage(), prefix = `ui-${TAG}-${viewport.width}x${viewport.height}-${name}`;
    const record = { name, viewport, fixture: { kind: seed.kind, name: seed.name, rawHash: hash(seed.raw) },
      checks: [], clicks: [], scrolls: [], screenshots: [], pageErrors: [], console: [], httpErrors: [],
      requestFailures: [], servedAssets: [], uiTextFailures: [], ok: false };
    const assetReads = [];
    report.results.push(record);
    page.on('pageerror', e => record.pageErrors.push(e.stack || e.message));
    page.on('console', m => {
      if (['error', 'warning'].includes(m.type())) record.console.push({ type: m.type(), text: m.text() });
    });
    page.on('response', r => {
      if (r.status() >= 400) record.httpErrors.push({ url: r.url(), status: r.status() });
      if (r.request().resourceType() === 'script') {
        const asset = { url: r.url(), status: r.status() };
        record.servedAssets.push(asset);
        assetReads.push(r.body().then(body => { asset.hash = hash(body); })
          .catch(error => { asset.bodyReadError = String(error); }));
      }
    });
    page.on('requestfailed', r => record.requestFailures.push({ url: r.url(), error: r.failure()?.errorText }));
    await context.addInitScript(({ key, raw }) => {
      if (!sessionStorage.getItem('tower-loot-inline-fixture-installed')) {
        localStorage.setItem(key, raw); sessionStorage.setItem('tower-loot-inline-fixture-installed', '1');
      }
    }, { key: rt.TOWER_CAMPAIGN_KEY, raw: seed.raw });
    const state = () => page.evaluate(() => JSON.parse(JSON.stringify(towerQA.store.state)));
    const snapshot = () => page.evaluate(() => towerQA.run?.snapshot());
    const scene = () => page.evaluate(inspectScene);
    async function load(url = page.url().startsWith('http') ? page.url() : PREVIEW) {
      await page.goto(url);
      await page.waitForFunction(() => {
        const pilot = window.cc?.director.getScene()?.children.find(n => n.name === 'PinePilot');
        window.towerQA = pilot?.components.find(c => c.constructor.name === 'PinePilot')?.survivor;
        return !!window.towerQA?.store?.state;
      }, null, { timeout: 30000 });
      assert.equal(await page.evaluate(() => towerQA.store.readOnly), false, 'writable fixture failed validation');
      await page.waitForTimeout(150);
    }
    async function shot(label) {
      const file = `${prefix}-${label}.png`;
      await page.screenshot({ path: path.join(OUT, file) });
      record.screenshots.push(file);
      const nodes = await scene();
      record.uiTextFailures.push(...nodes.filter(n => n.text && /undefined|NaN/.test(compactText(n.text)))
        .map(n => ({ stage: label, name: n.name, text: n.text, ancestors: n.ancestors })));
      write(`${prefix}-${label}.json`, { scene: nodes, host: await page.evaluate(() => ({
        screen: towerQA.screen, menuPage: towerQA.menu?.currentPage, detailId: towerQA.menu?.detailId,
        scroll: towerQA.menu?.scroll?.getScrollOffset(), time: towerQA.run?.state.time,
      })) });
      return file;
    }
    const check = (label, details = {}) => record.checks.push({ label, passed: true, ...details });
    async function find(target, { parent, bottom = false, button = true } = {}) {
      const matches = (await scene()).filter(n => (!button || n.button) &&
        (target instanceof RegExp ? target.test(n.name) : n.name === target) &&
        (!parent || n.ancestors.includes(parent)));
      matches.sort((a, b) => bottom ? b.y - a.y : a.y - b.y);
      return matches[0];
    }
    async function reveal(target, options = {}) {
      for (let i = 0; i < 100; i++) {
        const n = await find(target, options);
        assert.ok(n, `Missing node: ${target}`);
        if (visible(n)) return n;
        const clip = n.clip, height = clip.bottom - clip.top;
        assert.ok(height > 20, `No usable viewport for ${target}`);
        const delta = Math.sign(n.y - (clip.top + clip.bottom) / 2) *
          Math.min(180, Math.max(35, Math.abs(n.y - (clip.top + clip.bottom) / 2) * .6), height * .55);
        const x = Math.max(clip.left + 12, Math.min(clip.right - 12, n.x));
        await page.mouse.move(x, (clip.top + clip.bottom) / 2);
        await page.mouse.wheel(0, delta);
        record.scrolls.push({ target: n.name, x, delta });
        await page.waitForTimeout(85);
      }
      throw Error(`Could not pointer-scroll to ${target}`);
    }
    async function click(target, options = {}) {
      const n = await reveal(target, options);
      if (!options.disabled) assert.ok(n.enabled, `Disabled pointer target: ${n.name}`);
      else assert.equal(n.enabled, false, `Expected disabled target: ${n.name}`);
      const entry = { target: n.name, x: n.x, y: n.y, enabled: n.enabled,
        pointer: 'mouse', at: new Date().toISOString(), ancestors: n.ancestors };
      record.clicks.push(entry);
      await page.mouse.click(n.x, n.y);
      // Sample immediately after input dispatch; no navigation/extra click is used to refresh.
      entry.immediateState = summaryFields(await state());
      await page.waitForTimeout(options.settle ?? 100);
      return n;
    }
    async function noOverlay() {
      const nodes = await scene();
      assert.ok(!nodes.some(n => /技能详情遮罩|全洗确认遮罩|^技能详情$|^对话面板$/.test(n.name)),
        'skill interaction opened a blocking overlay or secondary page');
      assert.equal(await page.evaluate(() => towerQA.menu?.currentPage), 'library');
      assert.ok(nodes.some(n => n.name === '十六技能树'));
    }
    async function points(label) {
      const s = await state(), expected = rt.growthSummary(s);
      const labels = (await scene()).filter(n => n.text).map(n => n.text);
      assert.ok(labels.some(text => compactText(text).includes(`技能点·可用${expected.available}/总获${expected.total}`)),
        `${label}: point summary stale`);
      return expected;
    }
    async function stayPut(id, previous) {
      const control = await find(`learnSkill-${id}`), nameNode = await find(`技能节点-${id}`);
      assert.ok(visible(control), `${id}: upgraded control left viewport without additional scrolling`);
      assert.ok(Math.abs(control.y - previous.y) < 8, `${id}: control moved ${control.y - previous.y}px`);
      const row = await find(`技能行-${id}`, { button: false });
      assert.ok(row.box.left >= row.clip.left - 2 && row.box.right <= row.clip.right + 2,
        `${id}: skill row clipped horizontally`);
      // Tall cards need not fit vertically on small screens; the actual clicked control must.
      check(`${id}: inline transaction preserves visible control`, { before: previous, after: control,
        nameVisible: visible(nameNode), rowBox: row.box });
      await noOverlay();
    }
    async function learn(id) {
      const before = await state(), quote = rt.skillRequirement(before, id, { inTower: !!before.activeRun });
      assert.ok(quote.ok && before.cores >= quote.bookCost, `${id}: fixture must permit upgrade`);
      const control = await click(`learnSkill-${id}`);
      const after = await state();
      assert.equal(rank(after, id), quote.nextLevel);
      assert.equal(rank(record.clicks.at(-1).immediateState, id), quote.nextLevel, 'rank did not update on pointer dispatch');
      assert.equal(rt.growthSummary(after).available, rt.growthSummary(before).available - quote.cost);
      assert.equal(after.cores, before.cores - quote.bookCost);
      await points(id); await stayPut(id, control);
      check(`${id}: plus commits rank, points and book cost immediately`, { quote });
      return { before, after, quote };
    }
    async function decrease(id) {
      const before = await state(), quote = rt.decreaseSkillQuote(before, id);
      assert.ok(quote.ok, `${id}: fixture must permit decrease`);
      const observation = await observeBuiltDecrease(id);
      assert.deepEqual(JSON.parse(observation.quote.changes.json), quote.changes,
        `${id}: built preview changes must be actual change objects`);
      assert.deepEqual(JSON.parse(observation.detachedTransactionDryRun.changes.json), quote.changes,
        `${id}: built transaction changes must be actual change objects`);
      const changeText = change => {
        const definition = [...rt.GROWTH_SKILLS, ...rt.GROWTH_EVOLUTIONS].find(skill => skill.id === change.id);
        assert.ok(definition, `Unknown changed skill ${change.id}`);
        return `${definition.name}${change.from}→${change.to}级`;
      };
      const rowText = async () => compactText((await scene())
        .filter(n => n.ancestors.includes(`技能行-${id}`)).map(n => n.text).join('\n'));
      const previewText = await rowText(), related = quote.changes.filter(change => change.id !== id);
      assert.ok(previewText.includes(`−返还${quote.returned}点`), `${id}: actual preview refund value wrong`);
      if (related.length) {
        assert.ok(previewText.includes('连退：'), `${id}: cascade preview missing`);
        for (const change of related) assert.ok(previewText.includes(changeText(change)),
          `${id}: actual cascade preview missing ${changeText(change)}`);
      } else {
        assert.ok(previewText.includes('仅此技能降一级'), `${id}: single-skill preview missing`);
        assert.ok(!previewText.includes('连退：'), `${id}: spurious cascade in production preview`);
      }
      const control = await click(`decreaseSkill-${id}`);
      const after = await state();
      assert.deepEqual(after.skills, quote.skills);
      assert.deepEqual(after.evolutionRanks, quote.evolutionRanks);
      assert.deepEqual(after.books, before.books);
      assert.equal(after.cores, before.cores, 'refund must not refund book currency');
      assert.equal(rt.growthSummary(after).available, rt.growthSummary(before).available + quote.returned);
      assert.deepEqual(record.clicks.at(-1).immediateState.skills, quote.skills, 'refund rank stale on pointer dispatch');
      await points(id);
      const next = await find(`decreaseSkill-${id}`);
      assert.ok(visible(next), `${id}: decreased control left viewport`);
      assert.ok(Math.abs(next.y - control.y) < 8, `${id}: decrease moved control`);
      const feedbackText = await rowText();
      assert.ok(feedbackText.includes(`已保存：返还${quote.returned}点`), `${id}: committed refund feedback wrong`);
      for (const change of quote.changes) assert.ok(feedbackText.includes(changeText(change)),
        `${id}: committed change missing ${changeText(change)}`);
      await noOverlay();
      check(`${id}: minus returns exact invested cost and retains books`, { quote, previewText, feedbackText,
        builtPreviewAndTransactionChangesAreObjects: true });
      return { before, after, quote };
    }
    async function observeBuiltDecrease(id) {
      const observation = await page.evaluate(id => {
        const describe = value => ({
          type: Object.prototype.toString.call(value),
          isArray: Array.isArray(value), keys: value && Object.keys(value),
          json: JSON.stringify(value),
          elements: Array.isArray(value) ? value.map(item => ({
            type: Object.prototype.toString.call(item), keys: Object.keys(item),
            id: item.id, from: item.from, to: item.to,
            iterableContents: typeof item?.[Symbol.iterator] === 'function' ? Array.from(item) : null,
          })) : null,
        });
        const skill = { id, kind: id.startsWith('evo_') ? 'evolution' : 'passive' };
        const quote = towerQA.menu.decreaseQuote(skill);
        // A detached state copy exercises the built transaction branch without
        // committing or touching any live state/storage. Actual UI click follows.
        const detached = JSON.parse(JSON.stringify(towerQA.store.state));
        const result = towerQA.store._apply(detached, { type: 'decreaseSkill', id });
        return { id, quote: { ok: quote.ok, returned: quote.returned, changes: describe(quote.changes) },
          detachedTransactionDryRun: { ok: result.ok, returned: result.returned, changes: describe(result.changes) },
          liveRank: towerQA.store.state.skills[id], detachedRank: detached.skills[id] };
      }, id);
      (record.builtDecreaseObservations ||= []).push(observation);
      return observation;
    }
    async function disabled(id, action) {
      const before = summaryFields(await state());
      await click(`${action}-${id}`, { disabled: true });
      assert.deepEqual(summaryFields(await state()), before, `${action}-${id} changed saved state while disabled`);
      await noOverlay();
      check(`${action}-${id}: actual click on disabled control has no effect`);
    }
    async function enter(floor) {
      await click('锁妖塔', { bottom: true });
      const s = await state();
      await click(floor <= s.clearedFloor ? `重访第${floor}层`
        : floor === s.clearedFloor + 1 ? `继续挑战第${floor}层` : `挑战第${floor}层`);
      await page.waitForFunction(() => towerQA.run?.state.phase === 'playing');
    }
    async function lootSummary(expected, snapshotValue, label, { credited, extra = 0 } = {}) {
      const independentlyCounted = independentLoot(rt, snapshotValue);
      assert.deepEqual(expected, independentlyCounted,
        `${label}: summary must sum CORE_RANK_VALUES[coreRank] from actual kill receipts`);
      const text = (await scene()).filter(n => n.ancestors.includes('对话面板')).map(n => n.text).join('\n');
      assert.ok(text.includes('妖丹值'), `${label}: wallet value unit absent`);
      assert.ok(text.includes(`掉落 ${expected.count}颗`), `${label}: drop count missing`);
      assert.ok(text.includes(`按一阶折合${expected.value}点`), `${label}: first-rank equivalent missing`);
      expected.byRank.forEach((count, i) => {
        if (count) assert.ok(text.includes(`${i + 1}阶×${count}`), `${label}: rank ${i + 1} count missing`);
      });
      const bonus = snapshotValue.earned.cores - expected.value;
      if (bonus) assert.ok(text.includes(`通层奖另加${bonus}点`), `${label}: clear bonus not separate`);
      if (credited !== undefined) {
        const overflow = Math.max(0, snapshotValue.earned.cores + extra - credited);
        if (overflow) {
          assert.ok(text.includes(`余额已达上限，${overflow}点未入账。`), `${label}: cap overflow wrong`);
          assert.ok(!text.includes('已自动收取'), `${label}: uncredited overflow presented as collected`);
        } else assert.ok(!text.includes('未入账'), `${label}: unexpected overflow warning`);
      }
      check(`${label}: visible summary has exact counts, ranks and value`, {
        expected, independentlyCounted, coreRankValues: rt.CORE_RANK_VALUES, earned: snapshotValue.earned,
        credited, extra, text });
    }
    // Explicit assisted real simulation, with only normal movement input and
    // advance(). No enemy repositioning, HP edits, fake kill receipts or loot edits.
    async function simulate(mode, minimumRank = 2) {
      for (let batch = 0; batch < 260; batch++) {
        const result = await page.evaluate(({ mode, minimumRank }) => {
          const host = towerQA, run = host.run;
          if (!run) return { error: 'Run ended before requested sample' };
          let visibleDrop = null;
          for (let i = 0; i < 480 && run.state.phase === 'playing'; i++) {
            const s = run.state, p = s.player, W = host.width, H = host.height;
            run.setViewport({ xmin: p.x - W / 2 + 8, xmax: p.x + W / 2 - 8,
              ymin: p.y + 40 - H / 2 + 94, ymax: p.y + 40 + H / 2 - 169 });
            const target = [...s.enemies].sort((a, b) =>
              Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0];
            const dx = target ? target.x - p.x : 0, dy = target ? target.y - p.y : 0;
            const length = Math.max(1, Math.hypot(dx, dy));
            run.setInput(dx / length, dy / length); run.advance(1 / 60);
            visibleDrop = run.state.drops.find(d => d.kind === 'core' && d.rank >= minimumRank &&
              d.x - p.x > -W / 2 + 60 && d.x - p.x < W / 2 - 60 &&
              d.y - p.y - 40 > -H / 2 + 140 && d.y - p.y - 40 < H / 2 - 210);
            if (mode === 'drop' && visibleDrop) break;
          }
          const snapshot = run.snapshot();
          host.update(0); // normal draw/terminal persistence only; no UI activation
          return { snapshot, visibleDrop, screen: host.screen };
        }, { mode, minimumRank });
        assert.ok(!result.error, result.error);
        if (batch % 20 === 0) console.log(`${prefix}: real assisted simulation ${mode}, t=${result.snapshot.time.toFixed(1)}, wave=${result.snapshot.wave}`);
        if (mode === 'drop' && result.visibleDrop || result.snapshot.phase !== 'playing') return result;
      }
      throw Error('Real assisted simulation exhausted time budget');
    }
    try {
      await load();
      record.build = await page.evaluate(() => ({ scriptURLs: [...document.scripts].map(s => s.src).filter(Boolean),
        userAgent: navigator.userAgent, canvas: { width: document.querySelector('canvas').width,
          height: document.querySelector('canvas').height } }));
      // Capture bytes actually served; source hashes alone cannot identify the build.
      const script = record.servedAssets.find(r => /index\.[^/]+\.js|\/index\.js/.test(r.url));
      if (script) {
        const response = await context.request.get(script.url);
        record.build.entryAsset = { url: script.url, status: response.status(), hash: hash(await response.body()) };
      }
      await body({ page, state, snapshot, scene, find, reveal, click, shot, check, load, points, noOverlay,
        learn, decrease, disabled, enter, lootSummary, simulate, observeBuiltDecrease, record });
      record.uiTextFailures.push(...(await scene()).filter(n => n.text &&
        /undefined|NaN/.test(compactText(n.text))).map(n => ({
        stage: 'final', name: n.name, text: n.text, ancestors: n.ancestors })));
      assert.deepEqual(record.uiTextFailures, [], 'UI must not show undefined or NaN');
      assert.deepEqual(record.pageErrors, [], 'runtime exceptions');
      assert.deepEqual(record.console.filter(m => m.type === 'error'), [], 'console errors');
      assert.deepEqual(record.httpErrors, [], 'HTTP failures');
      assert.deepEqual(record.requestFailures, [], 'network request failures');
      record.ok = true;
    } catch (e) {
      report.failures++; record.error = e.stack || String(e);
      try { await shot('FAIL'); record.failureScene = await scene(); } catch (error) { record.captureError = String(error); }
      console.error(`${prefix}: ${record.error}`);
    } finally {
      await Promise.allSettled(assetReads);
      await context.close(); write(reportName, report);
      console.log(`${prefix}: ${record.ok ? 'PASS' : 'FAIL'} (${record.clicks.length} actual clicks)`);
    }
  }
  async function targetedLoot(q, capped) {
    q.record.kind = 'ARTIFICIAL CAMP + REAL ASSISTED DROPS — UI/PERSISTENCE ONLY, NOT BALANCE';
    await q.click('体验工具'); await q.click('进入独立体验档');
    const normalRaw = await q.page.evaluate(key => localStorage.getItem(key), rt.TOWER_CAMPAIGN_KEY);
    await q.click('无敌秒杀：关闭'); await q.click('返回宗门', { parent: '对话面板' });
    await q.enter(9);
    const sample = await q.simulate('drop', 2);
    assert.ok(sample.visibleDrop, 'a real visible graded drop is required');
    assert.ok(rt.validateTowerSnapshot(sample.snapshot));
    const sampled = independentLoot(rt, sample.snapshot);
    assert.deepEqual(rt.coreLootSummary(sample.snapshot), sampled);
    assert.equal(sample.visibleDrop.amount, rt.CORE_RANK_VALUES[sample.visibleDrop.rank]);
    await q.shot('graded-popup');
    const dropLabels = (await q.scene()).filter(n => /^\d阶妖丹$/.test(n.text));
    assert.ok(dropLabels.length, 'graded core popup label not rendered');
    q.check('Actual graded drop visual and denomination amount', {
      drop: sample.visibleDrop, labels: dropLabels.map(n => ({ text: n.text, x: n.x, y: n.y })),
      independentlyCounted: sampled, rankValues: rt.CORE_RANK_VALUES });
    await q.click('暂停');
    const paused = await q.snapshot(), camp = await q.state(), partial = independentLoot(rt, paused);
    const credit = Math.min(paused.earned.cores, rt.TOWER_RESOURCE_CAP - camp.activeRun.base.cores);
    assert.equal(paused.earned.cores, partial.value, 'sample must precede full-floor bonus');
    if (capped) { assert.equal(credit, 3); assert.ok(partial.value > credit); }
    await q.lootSummary(partial, paused, 'pause', { credited: credit });
    const pauseText = compactText((await q.scene()).filter(n => n.ancestors.includes('对话面板')).map(n => n.text).join('\n'));
    assert.ok(pauseText.includes(`${credit}妖丹值`), 'pause must show actual wallet credit');
    await q.shot('pause-values');
    await q.load();
    assert.deepEqual(await q.snapshot(), paused, 'reload changed loot/receipts/visuals/cooldowns');
    assert.deepEqual((await q.state()).activeRun, camp.activeRun);
    assert.deepEqual(rt.buildCoreDropPlan(9, (await q.snapshot()).loot.seed), rt.buildCoreDropPlan(9, paused.loot.seed));
    await q.lootSummary(partial, paused, 'reload pause', { credited: credit });
    await q.shot('reload-identical-loot');
    await q.click('返回宗门', { parent: '对话面板' }); // actual retreat, not host.withdraw()
    await q.page.waitForFunction(() => towerQA.store.state.activeRun === null);
    const settled = await q.state();
    assert.equal(settled.lastResult.outcome, 'abandoned');
    assert.equal(settled.lastResult.firstClear, false);
    assert.equal(settled.lastResult.earned.cores, credit);
    if (!capped) assert.deepEqual(settled.lastResult.coreLoot, partial);
    await q.lootSummary(partial, paused, 'retreat settlement', { credited: credit });
    const text = compactText((await q.scene()).filter(n => n.ancestors.includes('对话面板')).map(n => n.text).join('\n'));
    const earned = settled.lastResult.earned;
    assert.ok(text.includes(`实际入账：修为${earned.xp}·妖丹值${earned.cores}·贡献${earned.contribution}`),
      'retreat actual-credit label does not match lastResult');
    assert.ok(!text.includes('首通奖励已结算'), 'retreat must not imply a first-clear reward');
    await q.shot('retreat-actual-credit');
    assert.equal(await q.page.evaluate(key => localStorage.getItem(key), rt.TOWER_CAMPAIGN_KEY), normalRaw);
    await q.click('返回宗门', { parent: '对话面板' }); await q.load();
    assert.deepEqual((await q.state()).lastResult, settled.lastResult);
    assert.equal(await q.page.evaluate(key => localStorage.getItem(key), rt.TOWER_CAMPAIGN_KEY), normalRaw);
    await q.click('锁妖塔', { bottom: true });
    const card = await q.find(/^最近战报/, { button: false });
    assert.ok(card); await q.reveal(card.name, { button: false }); await q.shot('retreat-reload-result');
    const allText = compactText((await q.scene()).map(n => n.text).join('\n'));
    assert.ok(allText.includes(`已保留修为${earned.xp}/妖丹值${earned.cores}/贡献${earned.contribution}`));
    if (!capped) assert.ok(allText.includes(`本次击杀掉落${partial.count}颗，折合${partial.value}点`));
    q.check('Real retreat and reload preserve actual credit with no first-clear bonus or normal-save write', {
      capped, partial, credited: credit, overflow: partial.value - credit,
      lastResult: settled.lastResult, normalRawHash: hash(normalRaw),
      cappedRawLootNotPersisted: capped && !settled.lastResult.coreLoot });
  }
  try {
    for (const viewport of VIEWPORTS) {
      if (SELECT_CASES.includes('labels')) await scenario(viewport, 'labels', async q => {
        const denominations = rt.CORE_RANK_VALUES.slice(1).join('／');
        const header = '妖丹按阶位折合一阶计价；掉落颗数另列';
        const revealText = async (content, parent) => {
          const node = (await q.scene()).find(n => n.text && compactText(n.text).includes(content) &&
            (!parent || n.ancestors.includes(parent)));
          assert.ok(node, `Production label missing: ${content}`);
          await q.reveal(node.name, { button: false, parent });
          return node.text;
        };
        await q.click('技能树', { bottom: true }); await q.noOverlay();
        assert.ok((await q.scene()).some(n => compactText(n.text).includes(header)));
        await q.reveal('learnSkill-vajra'); await q.shot('camp-header');
        const learned = await q.learn('vajra'); assert.equal(learned.quote.cost, 2);
        await q.decrease('vajra'); await q.disabled('sj_yujian', 'decreaseSkill');
        await q.click('技能节点-vajra'); await q.noOverlay();
        assert.ok(await q.find('同页技能详情', { button: false }));
        await q.reveal('关闭', { parent: '同页技能详情' }); await q.shot('inline-details');
        await q.click('关闭', { parent: '同页技能详情' });
        const prices = (await q.scene()).filter(n => n.ancestors.includes('技能行-sj_shadow')).map(n => n.text).join('\n');
        assert.ok(compactText(prices).includes('20妖丹值'), 'book price still uses wallet value');
        await q.click('锁妖塔', { bottom: true });
        const towerText = await revealText(`一至七阶每颗折合：${denominations}妖丹值`, '妖丹掉落规则');
        await q.shot('tower-denomination-table');
        await q.click('宗门', { bottom: true }); await q.click('宗门大殿');
        const helpText = await revealText(`一至七阶妖丹每颗折合${denominations}点`, '灵石、妖丹值、宗门贡献');
        await q.shot('help-denomination-table');
        assert.ok(!(await q.scene()).some(n => /对应1至7点/.test(compactText(n.text))));
        q.check('Current compiled inline +/- and details work; header/table/book labels match denominations', {
          header, denominations, towerText, helpText });
      });
      if (SELECT_CASES.includes('retreat')) await scenario(viewport, 'retreat', q => targetedLoot(q, false));
      if (SELECT_CASES.includes('cap')) await scenario(viewport, 'cap', q => targetedLoot(q, true));
      if (SELECT_CASES.includes('diagnostic')) await scenario(viewport, 'diagnostic', async q => {
        await q.click('技能树', { bottom: true });
        await q.reveal('decreaseSkill-vajra');
        await q.observeBuiltDecrease('vajra');
        await q.shot('built-refund-preview');
        await q.decrease('vajra');
        await q.shot('built-refund-feedback');
        q.check('Observed built quote and detached transaction result, then clicked actual minus');
      });
      await scenario(viewport, 'camp', async q => {
        await q.click('技能树', { bottom: true }); await q.noOverlay(); await q.points('initial');
        const nodes = await q.scene(), ids = [...rt.GROWTH_SKILLS, ...rt.GROWTH_EVOLUTIONS].map(s => s.id);
        for (const id of ids) for (const prefix of ['技能节点-', 'learnSkill-', 'decreaseSkill-']) {
          assert.equal(nodes.filter(n => n.name === prefix + id && n.button &&
            n.ancestors.includes('十六技能树')).length, 1, `${prefix}${id}: exactly one inline control`);
        }
        const labels = nodes.map(n => n.text).join('\n');
        assert.ok(labels.includes('妖丹值') && labels.includes('折合一阶计价'));
        const special = rt.GROWTH_SKILLS.find(s => s.id === 'sj_shadow');
        assert.ok(nodes.some(n => n.ancestors.includes('技能行-sj_shadow') &&
          compactText(n.text).includes(`${special.bookCost}妖丹值`)), 'first-book price needs value unit');
        q.check('All 16 names and +/- controls belong to the same tree; book prices distinguish value from count');
        await q.reveal('learnSkill-vajra'); await q.shot('tree-top');
        for (const id of ['sj_arc', 'sj_line', 'vajra']) {
          await q.learn(id); await q.shot(`plus-${id}`); await q.decrease(id);
        }
        await q.disabled('sj_yujian', 'decreaseSkill');
        await q.disabled('sj_wanjian', 'decreaseSkill');
        await q.click('技能节点-sj_line'); await q.noOverlay();
        const details = await q.find('同页技能详情', { button: false });
        assert.ok(details && details.ancestors.includes('十六技能树'), 'details must be a child of the existing tree');
        assert.equal(await q.page.evaluate(() => towerQA.menu.detailId), 'sj_line');
        await q.reveal('关闭', { parent: '同页技能详情' }); await q.shot('inline-details');
        const tree = await q.find('十六技能树', { button: false });
        assert.ok(tree.graphics, 'parent connections need rendered Graphics');
        q.check('Skill-name click expands details inside original tree without a modal', {
          connectorGeometryAvailable: !!tree.connectorSegments, segmentCount: tree.connectorSegments?.length });
        await q.click('关闭', { parent: '同页技能详情' }); await q.noOverlay();
        // Center a connection gap via genuine pointer scrolling for visual review.
        await q.reveal('learnSkill-sj_shadow'); await q.shot('parent-connections');
        const saved = summaryFields(await q.state());
        await q.load(); assert.deepEqual(summaryFields(await q.state()), saved);
        q.check('Camp inline changes and permanent books survive reload');
      });
      await scenario(viewport, 'refunds', async q => {
        await q.click('技能树', { bottom: true });
        const evo = await q.decrease('evo_wanjian'); assert.equal(evo.quote.returned, 4);
        await q.shot('evolution-variable-refund');
        const evoPurchase = await q.learn('evo_wanjian'); assert.equal(evoPurchase.quote.bookCost, 0);
        const special = await q.decrease('sj_arc');
        assert.ok(special.quote.changes.some(c => c.id === 'sj_line' && c.to === 0));
        assert.equal(special.quote.returned, 3);
        await q.shot('special-dependency-cascade'); await q.disabled('sj_arc', 'decreaseSkill');
        await q.learn('sj_arc');
        const repurchase = await q.learn('sj_line'); assert.equal(repurchase.quote.bookCost, 0);
        const cascade = await q.decrease('sj_yujian');
        assert.ok(cascade.quote.changes.some(c => c.id === 'evo_wanjian' && c.from === 2 && c.to === 1));
        assert.equal(cascade.quote.returned, 6); // parent rank 8 cost 2 + evolution rank 2 cost 4
        await q.shot('evolution-dependency-cascade');
        q.check('Dependency cascades refund actual investment; re-learning retained books costs no currency');
        const saved = summaryFields(await q.state());
        await q.load(); assert.deepEqual(summaryFields(await q.state()), saved);
      });
      await scenario(viewport, 'paused', async q => {
        await q.enter(1);
        await q.page.waitForFunction(() => towerQA.run?.state.time > .5);
        await q.click('暂停');
        const paused = await q.snapshot(); assert.equal(paused.phase, 'paused');
        await q.click(/^技能树 · 可用/);
        for (const id of ['sj_yujian', 'sj_arc', 'sj_wanjian', 'vajra', 'sj_line', 'evo_wanjian'])
          await q.disabled(id, 'decreaseSkill');
        for (const id of ['magnet', 'sj_line', 'evo_wanjian']) await q.disabled(id, 'learnSkill');
        for (const id of ['sj_yujian', 'vajra']) {
          await q.learn(id); await q.learn(id); await q.disabled(id, 'learnSkill');
        }
        await q.reveal('learnSkill-sj_yujian'); await q.shot('paused-inline-rules');
        assert.deepEqual(frozenCombat(await q.snapshot()), frozenCombat(paused),
          'paused upgrades must not advance cooldowns, simulation or combat receipts');
        await q.page.waitForTimeout(450);
        assert.deepEqual(frozenCombat(await q.snapshot()), frozenCombat(paused));
        q.check('Paused plus follows rank-3/base/learned-passive rules; all minus disabled; time and cooldowns frozen',
          { time: paused.time, cooldowns: paused.cooldowns });
        const saved = await q.snapshot(); await q.load();
        assert.deepEqual(await q.snapshot(), saved, 'paused allocation must persist full snapshot');
        await q.click('继续挑战');
        await q.page.waitForFunction(t => towerQA.run?.state.time > t, saved.time);
        q.check('Reload preserves paused skill allocation; actual resume click restarts simulation');
      });
      await scenario(viewport, 'loot', async q => {
        q.record.kind = 'ARTIFICIAL CAMP + ISOLATED PLAYTEST ASSIST + REAL COMBAT STEPPING — UI ONLY, NOT BALANCE';
        await q.click('体验工具'); await q.click('进入独立体验档');
        const normalRaw = await q.page.evaluate(key => localStorage.getItem(key), rt.TOWER_CAMPAIGN_KEY);
        await q.click('无敌秒杀：关闭');
        await q.click('返回宗门', { parent: '对话面板' });
        assert.equal(await q.page.evaluate(() => towerQA.playtest && towerQA.tools.invincible), true);
        await q.enter(9);
        const sample = await q.simulate('drop', 2);
        assert.ok(sample.visibleDrop, 'must capture a real visible graded drop, not just count a ledger');
        assert.ok(rt.validateTowerSnapshot(sample.snapshot));
        // Running screenshot has no pause overlay hiding the actual drop graphics.
        await q.shot('graded-drop-battlefield');
        const dropLabels = (await q.scene()).filter(n => /^\d阶妖丹$/.test(n.text));
        assert.ok(dropLabels.length, 'actual graded-drop labels not rendered');
        q.check('Real kill produces visible graded core, rank label and immediate value credit', {
          visibleDrop: sample.visibleDrop, labels: dropLabels.map(n => ({ text: n.text, x: n.x, y: n.y })),
          loot: rt.coreLootSummary(sample.snapshot) });
        await q.click('暂停');
        const beforeReload = await q.snapshot(), beforeState = await q.state();
        const partial = rt.coreLootSummary(beforeReload);
        assert.ok(partial.count > 0 && partial.value > 0);
        assert.equal(beforeReload.earned.cores, partial.value, 'before boss clear all value comes from kill drops');
        await q.lootSummary(partial, beforeReload, 'pause');
        await q.shot('pause-counts-values');
        await q.load();
        assert.deepEqual(await q.snapshot(), beforeReload, 'reload must preserve exact loot seed/ledger/visuals/cooldowns');
        assert.deepEqual((await q.state()).activeRun, beforeState.activeRun);
        await q.lootSummary(partial, beforeReload, 'reload pause');
        assert.deepEqual(rt.buildCoreDropPlan(9, (await q.snapshot()).loot.seed),
          rt.buildCoreDropPlan(9, beforeReload.loot.seed), 'future loot plan changes on reload');
        await q.shot('reload-same-loot');
        await q.click('继续挑战');
        const finished = await q.simulate('finish');
        assert.equal(finished.snapshot.phase, 'won', 'full floor must finish through real combat');
        assert.ok(rt.validateTowerSnapshot(finished.snapshot));
        // update(0) may consume skipFrame; wait for host to commit terminal Run.
        await q.page.waitForFunction(() => towerQA.store.state.activeRun === null);
        const full = rt.coreLootSummary(finished.snapshot), settled = await q.state();
        assert.deepEqual(settled.lastResult.coreLoot, full);
        assert.equal(finished.snapshot.earned.cores, full.value + 40, 'floor 9 clear bonus separate from drops');
        assert.equal(settled.lastResult.earned.cores, full.value + 40 + 10, 'first-clear bonus separate from drops');
        assert.equal(settled.lastResult.firstClear, true);
        await q.lootSummary(full, finished.snapshot, 'settlement');
        const dialogText = (await q.scene()).filter(n => n.ancestors.includes('对话面板')).map(n => n.text).join('\n');
        assert.ok(dialogText.includes('首通奖励已结算，包含在以上收益中'),
          'first-clear bonus must be marked as already included in credited total');
        assert.ok(compactText(dialogText).includes(`实际入账：修为${settled.lastResult.earned.xp}·妖丹值${settled.lastResult.earned.cores}·贡献${settled.lastResult.earned.contribution}`),
          'settlement actual-credit label must use lastResult including first-clear bonus');
        await q.shot('settlement-counts-values');
        assert.equal(await q.page.evaluate(key => localStorage.getItem(key), rt.TOWER_CAMPAIGN_KEY), normalRaw,
          'playtest must not write ordinary fixture save');
        await q.click('返回宗门', { parent: '对话面板' }); await q.load();
        assert.deepEqual((await q.state()).lastResult, settled.lastResult);
        await q.click('锁妖塔', { bottom: true });
        const reportCard = await q.find(/^最近战报/, { button: false });
        assert.ok(reportCard, 'persisted latest-result card absent');
        await q.reveal(reportCard.name, { button: false });
        await q.shot('persisted-result');
        const labels = compactText((await q.scene()).map(n => n.text).join('\n'));
        assert.ok(labels.includes(`本次击杀掉落${full.count}颗，折合${full.value}点`));
        q.check('Exact loot and bonuses persist through full settlement and reload; normal storage untouched', {
          full, result: settled.lastResult, normalRawHash: hash(normalRaw) });
      });
    }
    assert.ok(report.results.length > 0, 'case/viewport selection ran zero cases');
    report.status = report.failures ? 'FAILED' : 'AUTOMATED_PASS_VISUAL_REVIEW_PENDING';
  } catch (error) {
    report.failures++; report.error = error.stack || String(error);
    report.status = 'FAILED';
  } finally {
    report.finishedAt = new Date().toISOString();
    if (report.failures) report.status = 'FAILED';
    write(reportName, report);
    await browser.close();
  }
  if (report.failures) process.exitCode = 1;
}
if (require.main === module) main().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
