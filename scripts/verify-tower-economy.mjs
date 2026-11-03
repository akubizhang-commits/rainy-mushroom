// Independent, import-safe numerical acceptance. No production/storage writes.
// CLI writes only docs/xianxia/reports/tower-economy-2026-10-28/balance.{json,md}.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { ARCHETYPES, FLOORS, FLOOR01, ECONOMY } from '../js/xianxia/TowerContent.js'
import { CORE_DROP_RULES, CORE_RANK_VALUES, buildCoreDropPlan } from '../js/xianxia/TowerLoot.js'
import { STONE_DRAW_COST, STONE_STARTER, STONE_CAP, STONE_VALUES, legacyRewardToStones,
  splitSpiritStones, formatSpiritStones, stoneLootFromLegacy, demonEssenceXp,
  spiritStoneLootSummary } from '../js/xianxia/TowerEconomy.js'
import { GROWTH_SKILLS, GROWTH_EVOLUTIONS } from '../js/xianxia/TowerGrowth.js'
import { TowerCampaignStore, TOWER_CAMPAIGN_KEY } from '../js/xianxia/TowerCampaign.js'
import { TowerRun, validateTowerSnapshot } from '../js/xianxia/TowerRun.js'
import { TOWER_XP_CAP } from '../js/xianxia/TowerProfile.js'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = resolve(ROOT, 'docs/xianxia/reports/tower-economy-2026-10-28')
const SOURCES = ['TowerContent', 'TowerLoot', 'TowerEconomy', 'TowerGrowth', 'TowerCampaign',
  'TowerRun', 'TowerProfile'].map(name => `js/xianxia/${name}.js`).concat([
  'js/xianxia/Checksum.js', 'scripts/verify-tower-economy.mjs',
  'docs/xianxia/sect-tower-v1/39-resource-roles-rework-proposal.md',
])
const hashSources = () => Object.fromEntries(SOURCES.map(p =>
  [p, createHash('sha256').update(readFileSync(resolve(ROOT, p))).digest('hex')]))
const A = Object.fromEntries(ARCHETYPES.map(a => [a.id, a]))
// Fixed pre-rework budgets, also cross-checked against the authored ECONOMY table.
const OLD_XP = [452, 490, 631, 903, 1000, 1561, 1511, 1105, 2073]
const OLD_CONTRIBUTION = [100, 105, 110, 115, 120, 125, 130, 135, 140]
const OLD_MIN = [57, 59, 71, 79, 81, 98, 95, 99, 108]
const OLD_MAX = [69, 71, 85, 95, 99, 118, 115, 121, 130]
const SEEDS = [0, 1, 2, 3, 7, 19, 42, 123, 456, 789, 2026, 1028, 65535,
  65536, 123456789, 0x12345678, 0x7fffffff, 0x80000000, 0xfffffffe, 0xffffffff]
const LOADOUT = { active: { sj_wanjian: 1 }, passive: {}, evolutions: [],
  weaponId: 'eq_sword_suwen', weaponQuality: 1, weaponRefine: 0 }
const sum = xs => xs.reduce((a, b) => a + b, 0)
const range = xs => [Math.min(...xs), Math.max(...xs)]

function unitsFor(floor) {
  return FLOORS[floor - 1].waves.flatMap(w => {
    const groups = floor === 1
      ? FLOOR01.waves[w.wave - 1].batches.flatMap(b =>
        b.unit_ids.map(localId => ({ localId, ...A[b.archetype] })))
      : [...w.enemy_groups.filter(g => A[g.archetype].role === 'boss'),
        ...w.enemy_groups.filter(g => A[g.archetype].role !== 'boss')]
        .flatMap(g => Array.from({ length: g.count }, () => A[g.archetype]))
        .map((a, i) => ({ localId: `u${i + 1}`, ...a }))
    return groups.map(a => ({ ...a, wave: w.wave, key: `${w.wave}:${a.localId}` }))
  })
}

function denomination(amount) {
  const parts = splitSpiritStones(amount)
  assert.equal(parts.length, 4)
  assert.ok(parts.every(n => Number.isSafeInteger(n) && n >= 0))
  assert.ok(parts.slice(0, 3).every(n => n < 100))
  assert.equal(sum(parts.map((n, i) => n * [1, 100, 10000, 1000000][i])), amount)
  const text = formatSpiritStones(amount)
  const matches = [...text.matchAll(/(\d+)(下品|中品|上品|极品)/g)]
  assert.equal(matches.map(m => m[0]).join(' '), text)
  assert.equal(sum(matches.map(m => Number(m[1])
    * ({ 下品: 1, 中品: 100, 上品: 10000, 极品: 1000000 })[m[2]])), amount)
  return { amount, parts, text }
}

// Isolated kill-handler fixture, not a playable snapshot or a real balance.
// Inject authored deaths only; production _deaths/_gainXp award all XP/reward units.
function killFixture(floor, seed, units) {
  const run = new TowerRun({ attemptId: 1, floor, seed, hp: 100, xp: 0, loadout: LOADOUT })
  const lootSeed = run.state.loot.seed
  for (const wave of FLOORS[floor - 1].waves) {
    run.state.wave = wave.wave
    run.state.enemies = units.filter(u => u.wave === wave.wave).map(u => ({
      id: `a1:f${floor}:w${u.wave}:${u.localId}`, archetype: u.id,
      rank: u.rank, role: u.role, hp: 0, x: 0, y: 0,
    }))
    run._deaths()
  }
  return { lootSeed, rawXp: run.state.rawKillXp, creditedXp: run.state.earned.xp,
    legacyUnits: run.state.earned.cores, kills: run.state.killLedger.length,
    stoneSummary: spiritStoneLootSummary(run.state) }
}

// One actual authored-spawn/skill-hit/clear replay per floor. Explicit assist and
// enemy repositioning isolate rewards from survival difficulty; no wallet grants.
function assistedClear(floor, seed) {
  const run = new TowerRun({ attemptId: 1, floor, seed, hp: 100, xp: 0, loadout: LOADOUT })
  run.setPlaytestAssist(true)
  let ticks = 0
  for (; ticks < 80000 && run.state.phase === 'playing'; ticks++) {
    for (const e of run.state.enemies) { e.x = run.state.player.x + 60; e.y = run.state.player.y }
    run.advance(1 / 60)
  }
  assert.equal(run.state.phase, 'won', `floor ${floor} replay timeout`)
  const s = run.snapshot()
  assert.ok(validateTowerSnapshot(s), `floor ${floor} invalid replay`)
  return { ticks, rawXp: s.rawKillXp, creditedXp: s.earned.xp,
    contribution: s.earned.contribution, legacyUnits: s.earned.cores,
    killStones: spiritStoneLootSummary(s).value }
}

function memoryStore() {
  const records = new Map()
  const storage = { getItem: k => records.get(k) ?? null, setItem: (k, v) => records.set(k, v) }
  return { records, store: new TowerCampaignStore(storage, 0) }
}

// Pure arithmetic ledgers. Each scenario is independent, never added to a save.
function purchasePath(rows, { starter, bonuses, recurringBooks }) {
  let stones = starter, contribution = bonuses ? 300 : 0, ordinaryBought = false, evolutionFloor = null
  const ledger = []
  for (const row of rows) {
    const before = stones
    const income = row.killStones + (bonuses ? row.clearBonusStones + 100 : 0)
    const contributionIncome = row.contribution + (bonuses ? 50 : 0)
    stones += income; contribution += contributionIncome
    const draw = stones >= 100 && contribution >= 100
    if (draw) { stones -= 100; contribution -= 100 }
    const booksDue = recurringBooks || !ordinaryBought
    const ordinary = booksDue && stones >= 300
    if (ordinary) { stones -= 300; ordinaryBought = true }
    const canAffordEvolution = evolutionFloor === null && stones >= 2400
    if (canAffordEvolution) { stones -= 2400; evolutionFloor = row.floor }
    ledger.push({ floor: row.floor, before, income, contributionIncome, draw,
      ordinaryBookSpend: ordinary ? 300 : 0, booksDue,
      evolutionSpend: canAffordEvolution ? 2400 : 0, after: stones, contributionAfter: contribution })
  }
  return { modelOnly: true, starter, bonuses, recurringBooks, evolutionFloor, ledger }
}

export function verifyTowerEconomy({ progress = () => {} } = {}) {
  const sourceHashes = hashSources(), checks = [], floors = []
  const check = (name, fn) => {
    try { const details = fn(); checks.push({ name, passed: true }); return details }
    catch (error) { checks.push({ name, passed: false, message: error.message }); return null }
  }
  const denominations = check('百进位、格式化与非法输入', () => {
    assert.deepEqual([...STONE_VALUES], [1, 100, 10000, 1000000])
    const result = [0, 1, 30, 70, 99, 100, 101, 9999, 10000, 10001,
      999999, 1000000, 1000001, 1010101, STONE_CAP, Number.MAX_SAFE_INTEGER].map(denomination)
    assert.deepEqual(splitSpiritStones(100 - 30), [70, 0, 0, 0])
    for (const n of [-1, .5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      assert.throws(() => splitSpiritStones(n), RangeError)
      assert.throws(() => legacyRewardToStones(n), RangeError)
    }
    assert.throws(() => legacyRewardToStones(Number.MAX_SAFE_INTEGER), RangeError)
    return result
  })
  const campaign = check('Campaign schema4、初始赠送及双资源抽取消费', () => {
    const { records, store } = memoryStore(), before = { ...store.state }
    assert.equal(before.spiritStones, 500)
    assert.equal(STONE_STARTER, 500)
    assert.equal(before.contribution, 300)
    assert.equal(STONE_DRAW_COST, 100)
    assert.equal(ECONOMY.weapon_draw.cost, 100)
    const draw = store.act({ type: 'drawWeapon' }, 0)
    assert.equal(draw.ok, true, draw.reason)
    assert.equal(store.state.spiritStones, before.spiritStones - 100)
    assert.equal(store.state.contribution, before.contribution - 100 + draw.draw.refund)
    assert.equal(store.state.xp, before.xp)
    const record = JSON.parse(records.get(TOWER_CAMPAIGN_KEY))
    assert.equal(record.schema, 4)
    assert.equal(Object.hasOwn(store.state, 'cores'), false)
    return { schema: record.schema, starterStones: before.spiritStones,
      starterContribution: before.contribution, drawCost: 100, refund: draw.draw.refund,
      storage: 'isolated Map; not user save; not used in affordability model' }
  })
  check('经卷价格200/100、进化2400', () => {
    const specials = GROWTH_SKILLS.filter(s => s.special)
    assert.ok(specials.some(s => s.kind === 'active') && specials.some(s => s.kind === 'passive'))
    for (const s of specials) assert.equal(s.bookCost, s.kind === 'active' ? 200 : 100, s.id)
    assert.ok(GROWTH_EVOLUTIONS.length > 0)
    for (const s of GROWTH_EVOLUTIONS) assert.equal(s.bookCost, 2400, s.id)
  })
  for (const f of FLOORS) {
    const floor = f.floor, units = unitsFor(floor), rule = CORE_DROP_RULES[floor]
    const row = { floor, enemyCount: units.length, oldXp: OLD_XP[floor - 1],
      contribution: OLD_CONTRIBUTION[floor - 1], firstClearContribution: 50,
      clearBonusStones: 50 * (floor - 1), firstClearStones: 100,
      allowedKillStones: [OLD_MIN[floor - 1] * 10, OLD_MAX[floor - 1] * 10], samples: [] }
    check(`第${floor}层旧预算/逐怪固定修为`, () => {
      assert.equal(rule.minValue, OLD_MIN[floor - 1])
      assert.equal(rule.maxValue, OLD_MAX[floor - 1])
      const authoredXp = sum(units.map(u => u.rank * ({ normal: 1, elite: 5, boss: 10 })[u.role]))
      assert.equal(authoredXp, row.oldXp)
      assert.equal(ECONOMY.floors[floor - 1].cultivation, row.oldXp)
      assert.equal(ECONOMY.floors[floor - 1].contribution, row.contribution)
      const contribution = sum(f.waves.map(w =>
        2 + (w.kind === 'elite' ? 5 : w.kind === 'boss' ? 45 + 5 * (floor - 1) : 0)))
      assert.equal(contribution, row.contribution)
      for (const u of units) assert.equal(demonEssenceXp(u.rank, u.role),
        u.rank * ({ normal: 1, elite: 5, boss: 10 })[u.role])
    })
    for (const seed of SEEDS) {
      const sample = check(`第${floor}层种子${seed}:灵石与运行时击杀XP`, () => {
        const fixture = killFixture(floor, seed, units)
        const plan = buildCoreDropPlan(floor, fixture.lootSeed)
        const byKey = new Map(units.map(u => [u.key, u])), byRank = Array(7).fill(0)
        for (const [key, rank] of Object.entries(plan)) {
          assert.equal(byKey.get(key)?.rank, rank, `unrecognized drop ${key}`)
          byRank[rank - 1]++
        }
        const legacyUnits = sum(byRank.map((n, i) => n * CORE_RANK_VALUES[i + 1]))
        const killStones = legacyRewardToStones(legacyUnits)
        assert.equal(killStones, legacyUnits * 10)
        assert.ok(killStones >= row.allowedKillStones[0] && killStones <= row.allowedKillStones[1])
        assert.equal(fixture.rawXp, row.oldXp)
        assert.equal(fixture.creditedXp, Math.min(TOWER_XP_CAP, row.oldXp))
        assert.equal(fixture.kills, units.length)
        assert.equal(fixture.legacyUnits, legacyUnits)
        assert.equal(stoneLootFromLegacy({ byRank }).value, killStones)
        assert.equal(fixture.stoneSummary.value, killStones)
        denomination(killStones)
        return { seed, lootSeed: fixture.lootSeed, legacyUnits, killStones,
          rawXp: fixture.rawXp, creditedXp: fixture.creditedXp }
      })
      if (sample) row.samples.push(sample)
    }
    row.observedKillStones = row.samples.length ? range(row.samples.map(s => s.killStones)) : null
    row.observedXp = row.samples.length ? range(row.samples.map(s => s.rawXp)) : null
    check(`第${floor}层跨种子随机值变化而XP不变`, () => {
      assert.equal(row.samples.length, 20)
      assert.ok(new Set(row.samples.map(s => s.killStones)).size > 1)
      assert.deepEqual(row.observedXp, [row.oldXp, row.oldXp])
    })
    row.replay = check(`第${floor}层真实出生/击杀/清层贡献回放（辅助模式）`, () => {
      const replay = assistedClear(floor, 456)
      assert.equal(replay.rawXp, row.oldXp)
      assert.equal(replay.creditedXp, row.oldXp)
      assert.equal(replay.contribution, row.contribution)
      assert.equal(replay.legacyUnits * 10, replay.killStones + row.clearBonusStones)
      return replay
    })
    floors.push(row)
    progress(`第${floor}层完成：${row.samples.length}/20种子，灵石${row.observedKillStones}，XP ${row.observedXp}`)
  }
  const cumulativeXp = []
  let xp = 0
  for (const f of floors) {
    const before = xp, gained = Math.min(TOWER_XP_CAP - xp, f.oldXp)
    xp += gained
    cumulativeXp.push({ floor: f.floor, raw: f.oldXp, before, gained, after: xp,
      discardedAtCap: f.oldXp - gained })
  }
  const models = []
  for (const bonuses of [false, true]) for (const recurringBooks of [false, true]) {
    const config = { starter: bonuses ? STONE_STARTER : 0, bonuses, recurringBooks }
    const paths = SEEDS.map(seed => {
      const rows = floors.map(f => ({ ...f, killStones: f.samples.find(s => s.seed === seed)?.killStones }))
      return rows.every(r => Number.isFinite(r.killStones)) ? { seed, ...purchasePath(rows, config) } : null
    }).filter(Boolean)
    const bounds = ['min', 'max'].map((label, i) => ({
      label, ...purchasePath(floors.map(f => ({ ...f, killStones: f.allowedKillStones[i] })), config),
    }))
    models.push({ name: `${bonuses ? '初始赠送+首通+清层' : '零初始仅击杀（保守）'}/${recurringBooks
      ? '每层200+100经卷压力模型' : '全程仅一套200+100经卷'}`, paths, bounds })
    check(`购买力:${models.at(-1).name}`, () => {
      assert.equal(paths.length, 20)
      for (const p of [...paths, ...bounds]) {
        assert.ok(p.evolutionFloor !== null, '九层内仍不足一次进化经卷')
        for (const l of p.ledger) {
          assert.ok(l.draw, `第${l.floor}层不能负担一抽`)
          assert.ok(!l.booksDue || l.ordinaryBookSpend === 300, `第${l.floor}层普通经卷不足`)
          assert.ok(l.after >= 0 && l.contributionAfter >= 0)
          assert.equal(l.after, l.before + l.income - 100 - l.ordinaryBookSpend - l.evolutionSpend)
        }
      }
    })
  }
  check('运行过程中输入文件未变化', () => assert.deepEqual(hashSources(), sourceHashes))
  return { generatedAt: new Date().toISOString(), command: 'node scripts/verify-tower-economy.mjs',
    sourceHashes, seeds: SEEDS, samplesPerFloor: 20, campaign, denominations, floors, cumulativeXp,
    totalRawXp: sum(OLD_XP), models, checks, failed: checks.filter(c => !c.passed),
    observations: [
      '第6→7层随机灵石预算下降属于旧预算平移；XP第6→7→8层也下降，本次未重新平衡。',
      '未抽到某层理论最高值不算失败；少量固定样本只能检查样本越界，不能证明全分布。',
      '按保守模型，第一层最低570石扣一抽100和一套经卷300后剩170；提案示例仅买200主动经卷，故其余款为270。',
    ],
    limitations: [
      '20种子/层是固定样本验收，不是概率拟合、尾部概率或所有种子证明。',
      '180个击杀处理器夹具注入死亡；9个真实出生/清层回放开启辅助并集中敌人。不能证明难度、耗时、生存或自然通关。',
      '购买模型假设顺序完整清九层、一层一次抽取，扣100石+100贡献；忽略重复武器返贡献，故贡献偏保守。',
      '零初始模型不计赠送/通层/首通；另一个模型计500石+300贡献、每层50*(层-1)通层石、首通100石+50贡献。不是玩家真实余额。',
      '普通经卷200/100指需付费的特殊主动/被动经卷，基础免费技能仍免费。',
      '资金够不等于可购买：未模拟境界、技能点、前置、实际书目/重复购买和进化通6层门槛；每层买一套是压力预算。',
      '不含研习、丹药、强化、死亡重试消耗、部分通关、重复首通、存档迁移、保存失败原子性及UI；首通奖励在购买模型中是明示假设，未做九层Campaign结算回放。',
      '累计XP表单独按封顶算可入账修为；不把溢出转钱。隔离Map抽取仅测交易契约，其余额不输入购买模型。',
    ] }
}

function markdown(r) {
  return [
    '# 灵石经济独立数值验收', '',
    `运行：\`${r.command}\`；时间：${r.generatedAt}。${r.checks.length}项检查，未通过${r.failed.length}项。未构建。`, '',
    '| 层 | 允许击杀灵石 | 20种子实测 | 固定XP | 清层贡献 / 含首通 |',
    '|---|---|---|---|---|',
    ...r.floors.map(f => `| ${f.floor} | ${f.allowedKillStones.join('–')} | ${f.observedKillStones?.join('–') ?? '失败'} | ${f.observedXp?.join('–') ?? '失败'} | ${f.contribution} / ${f.contribution + 50} |`),
    '', `九层原始修为合计${r.totalRawXp}，从0开始累计入账${r.cumulativeXp.at(-1).after}。灵石样本变化不改变逐怪XP；清层奖励另算，不混入随机范围。`,
    '', '百进位拆分/格式化验证包含0、99/100、9999/10000、999999/1000000、上限和最大安全整数，并验证1中品支付30后余70下品。',
    '', '| 资金模型 | 样本最早–最晚攒够并扣除2400的层 | 理论最低/最高收入路径对应层 |',
    '|---|---|---|',
    ...r.models.map(m => `| ${m.name} | ${m.paths.length ? range(m.paths.map(p => p.evolutionFloor ?? 99)).join('–') : '失败'} | ${m.bounds.map(p => p.evolutionFloor ?? '九层不足').join(' / ')} |`),
    '', '各模型先扣每层一抽100石+100贡献，再扣到期经卷200+100，够2400时扣一次进化费并继续后续层。明细包含每层期初、收入、支出和期末；理论上下界不是概率区间。进化实际还受通6层及其他条件限制。',
    '', ...r.observations.map(s => `- ${s}`),
    '', '## 未通过项', '',
    ...(r.failed.length ? r.failed.map(c => `- ${c.name}：${c.message}`) : ['无数值断言失败；未覆盖项不能视为通过。']),
    '', '## 模型与限制', '', ...r.limitations.map(s => `- ${s}`),
    '', '完整种子、交易探针、各层回放、源文件SHA-256和逐层资金表见 `balance.json`。', '',
  ].join('\n')
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const report = verifyTowerEconomy({ progress: message => console.log(message) })
  mkdirSync(OUT, { recursive: true })
  writeFileSync(resolve(OUT, 'balance.json'), JSON.stringify(report, null, 2) + '\n')
  writeFileSync(resolve(OUT, 'balance.md'), markdown(report))
  console.log(JSON.stringify({ checks: report.checks.length, failed: report.failed, report: OUT }))
  if (report.failed.length) process.exitCode = 1
}
