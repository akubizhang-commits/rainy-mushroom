// Import-safe numeric QA; only writes the assigned drop-* reports when run as CLI.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { performance } from 'node:perf_hooks'
import { ARCHETYPES, FLOORS, FLOOR01 } from '../js/xianxia/TowerContent.js'
import { GROWTH_SKILLS, GROWTH_EVOLUTIONS, GROWTH_RESEARCH } from '../js/xianxia/TowerGrowth.js'
import { CORE_RANK_VALUES, CORE_DROP_RULES, buildCoreDropPlan } from '../js/xianxia/TowerLoot.js'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const REPORT_DIR = resolve(ROOT, 'docs/xianxia/reports/tower-loot-inline-2026-10-28')
const A = Object.fromEntries(ARCHETYPES.map(a => [a.id, a]))
const TARGETS = [63, 65, 78, 87, 90, 108, 105, 110, 119]
const ELITE = [0, 3, 5, 8, 10, 12, 15, 18]
const BOSS = [0, 10, 15, 20, 25, 30, 35, 40]
const WAVES = [1, 3, 5, 10, 15, 19, 20]
const PROPOSALS = 128
const round = n => Number(n.toFixed(9))
const hash = text => createHash('sha256').update(text).digest('hex')
const oldCredit = u => u.role === 'normal' ? .05 : (u.role === 'elite' ? ELITE : BOSS)[u.rank]

function authoredUnits(floor) {
  return FLOORS[floor - 1].waves.flatMap(w => {
    if (floor === 1) return FLOOR01.waves[w.wave - 1].batches.flatMap(b =>
      b.unit_ids.map(id => ({ key: `${w.wave}:${id}`, wave: w.wave, ...A[b.archetype] })))
    // Independent partition reference for the production stable boss-first sort.
    const groups = [...w.enemy_groups.filter(g => A[g.archetype].role === 'boss'),
      ...w.enemy_groups.filter(g => A[g.archetype].role !== 'boss')]
    return groups.flatMap(g => Array(g.count).fill(A[g.archetype]))
      .map((a, i) => ({ key: `${w.wave}:u${i + 1}`, wave: w.wave, ...a }))
  })
}

function distribution(histogram, samples) {
  const entries = Object.entries(histogram).map(([v, count]) => [Number(v), count]).sort((a, b) => a[0] - b[0])
  const mean = entries.reduce((s, [v, count]) => s + v * count, 0) / samples
  const variance = entries.reduce((s, [v, count]) => s + (v - mean) ** 2 * count, 0) / (samples - 1)
  const se = Math.sqrt(variance / samples)
  const quantile = p => {
    let count = 0
    for (const [v, n] of entries) { count += n; if (count >= Math.ceil(p * samples)) return v }
  }
  return { min: entries[0][0], p05: quantile(.05), median: quantile(.5), p95: quantile(.95),
    max: entries.at(-1)[0], mean: round(mean), standardDeviation: round(Math.sqrt(variance)),
    standardError: round(se), mean95Interval: [round(mean - 1.96 * se), round(mean + 1.96 * se)], histogram }
}

// Exact finite Bernoulli model, independent of the runtime geometric sampler.
// Forward probability and backward acceptance likelihood give each role/rank's
// marginal after BOTH constraints, without noisy rare-drop calibration.
export function analyzeCoreDropModel(units, rule) {
  const width = rule.maxValue + 1, size = (rule.maxCount + 1) * width
  const forward = [new Float64Array(size)]
  forward[0][0] = 1
  for (const u of units) {
    const p = rule.chancesByRole[u.role][u.rank], d = CORE_RANK_VALUES[u.rank]
    const before = forward.at(-1), after = new Float64Array(size)
    for (let c = 0; c <= rule.maxCount; c++) for (let v = 0; v <= rule.maxValue; v++) {
      const i = c * width + v
      after[i] += before[i] * (1 - p)
      if (c < rule.maxCount && v + d <= rule.maxValue) after[i + width + d] += before[i] * p
    }
    forward.push(after)
  }
  let acceptance = 0, adjoint = new Float64Array(size)
  const counts = new Set(), values = new Set()
  for (let c = rule.minCount; c <= rule.maxCount; c++) for (let v = rule.minValue; v <= rule.maxValue; v++) {
    const i = c * width + v, mass = forward.at(-1)[i]
    acceptance += mass; adjoint[i] = 1
    if (mass > 0) { counts.add(c); values.add(v) }
  }
  assert.ok(acceptance > .05, 'calibration must retain efficient acceptance')
  const groups = new Map()
  for (let k = units.length - 1; k >= 0; k--) {
    const u = units[k], p = rule.chancesByRole[u.role][u.rank], d = CORE_RANK_VALUES[u.rank]
    const before = new Float64Array(size)
    let hits = 0
    for (let c = 0; c <= rule.maxCount; c++) for (let v = 0; v <= rule.maxValue; v++) {
      const i = c * width + v
      const include = c < rule.maxCount && v + d <= rule.maxValue ? p * adjoint[i + width + d] : 0
      before[i] = (1 - p) * adjoint[i] + include
      hits += forward[k][i] * include
    }
    const key = `${u.role}:rank${u.rank}`
    if (!groups.has(key)) groups.set(key, { name: key, role: u.role, rank: u.rank, entities: 0, hits: 0 })
    const group = groups.get(key)
    group.entities++; group.hits += hits / acceptance
    adjoint = before
  }
  const marginalRows = [...groups.values()].map(g => ({ ...g,
    effectiveChance: g.hits / g.entities,
    oldCreditChance: oldCredit(g) / CORE_RANK_VALUES[g.rank],
    effectiveValuePerEntity: g.hits / g.entities * CORE_RANK_VALUES[g.rank] }))
  const marginal = new Map(marginalRows.map(g => [g.name, g]))
  return {
    acceptanceProbability: acceptance,
    expectedProposals: (1 - (1 - acceptance) ** PROPOSALS) / acceptance,
    exhaustionProbability: (1 - acceptance) ** PROPOSALS,
    physicallyFeasibleCounts: [...counts].sort((a, b) => a - b),
    physicallyFeasibleValues: [...values].sort((a, b) => a - b),
    marginals: marginalRows,
    prefixes: WAVES.map(wave => {
      const subset = units.filter(u => u.wave <= wave)
      const old = subset.reduce((s, u) => s + oldCredit(u), 0)
      const value = subset.reduce((s, u) => s + marginal.get(`${u.role}:rank${u.rank}`).effectiveValuePerEntity, 0)
      return { wave, oldSteadyValue: old, conditionalMean: value, relativeChange: value / old - 1 }
    }),
  }
}

function expectedAttempts(histogram, samples, deficit, bonus) {
  const pmf = Object.entries(histogram).map(([v, n]) => [Number(v) + bonus, n / samples])
  const zero = pmf.find(([v]) => v === 0)?.[1] ?? 0, e = Array(deficit + 1).fill(0)
  for (let d = 1; d <= deficit; d++) {
    e[d] = (1 + pmf.reduce((s, [v, p]) => s + (v > 0 ? p * e[Math.max(0, d - v)] : 0), 0)) / (1 - zero)
  }
  return round(e[deficit])
}

export function verifyTowerLootDistribution({ samples = 100000 } = {}) {
  if (!Number.isInteger(samples) || samples < 10000 || samples > 1000000) {
    throw new RangeError('samples must be an integer from 10000 to 1000000')
  }
  const started = performance.now(), floors = []
  const sourceHashes = Object.fromEntries(['js/xianxia/TowerLoot.js', 'js/xianxia/TowerContent.js',
    'scripts/verify-tower-loot-distribution.mjs', 'tests/xianxia-tower-loot.test.mjs',
    'js/xianxia/TowerGrowth.js'].map(p => [p, hash(readFileSync(resolve(ROOT, p)))]))
  for (let floor = 1; floor <= 9; floor++) {
    const units = authoredUnits(floor), byKey = new Map(units.map(u => [u.key, u]))
    assert.equal(byKey.size, units.length)
    const rule = CORE_DROP_RULES[floor], model = analyzeCoreDropModel(units, rule)
    const normal = units.filter(u => u.role === 'normal').length
    const rareValue = units.filter(u => u.role !== 'normal').reduce((s, u) => s + oldCredit(u), 0)
    assert.equal(Math.floor(normal / 20) + rareValue, TARGETS[floor - 1])
    const buckets = new Map(), bucketNames = u => [u.role, `rank${u.rank}`, `${u.role}:rank${u.rank}`]
    for (const u of units) for (const name of bucketNames(u)) {
      if (!buckets.has(name)) buckets.set(name, { name, entitiesPerFloor: 0, proposalSum: 0,
        oldValuePerFloor: 0, dropCount: 0, droppedValue: 0 })
      const b = buckets.get(name)
      b.entitiesPerFloor++; b.proposalSum += rule.chancesByRole[u.role][u.rank]
      b.oldValuePerFloor += oldCredit(u)
    }
    const perEntity = new Map(units.map(u => [u.key, 0]))
    const countHistogram = {}, prefixHistograms = WAVES.map(() => ({})), digest = createHash('sha256')
    const loopStart = performance.now()
    for (let i = 0; i < samples; i++) {
      const seed = Math.imul(i, 0x9e3779b1) >>> 0, plan = buildCoreDropPlan(floor, seed)
      const byWave = Array(21).fill(0), entries = Object.entries(plan)
      assert.ok(Object.isFrozen(plan))
      for (const [key, rank] of entries) {
        const u = byKey.get(key)
        assert.ok(u); assert.equal(rank, u.rank)
        const value = CORE_RANK_VALUES[rank]
        byWave[u.wave] += value; perEntity.set(key, perEntity.get(key) + 1)
        for (const name of bucketNames(u)) { const b = buckets.get(name); b.dropCount++; b.droppedValue += value }
      }
      let value = 0, prefixIndex = 0
      for (let wave = 1; wave <= 20; wave++) {
        value += byWave[wave]
        if (wave === WAVES[prefixIndex]) {
          const h = prefixHistograms[prefixIndex++]; h[value] = (h[value] ?? 0) + 1
        }
      }
      assert.ok(value >= rule.minValue && value <= rule.maxValue)
      assert.ok(entries.length >= rule.minCount && entries.length <= rule.maxCount)
      countHistogram[entries.length] = (countHistogram[entries.length] ?? 0) + 1
      digest.update(`${seed}:${JSON.stringify(plan)}\n`)
      if (i < 4 || i % 10000 === 0) {
        buildCoreDropPlan(floor, (seed ^ 1) >>> 0)
        assert.deepEqual(buildCoreDropPlan(floor, seed), plan)
        // Arbitrary disjoint subsets can recover only the entries they killed.
        const subset = units.filter((_, k) => (k + i) % 7 === 0)
        const keys = new Set(subset.map(u => u.key))
        const credit = list => list.reduce((s, u) => s + CORE_RANK_VALUES[plan[u.key] ?? 0], 0)
        assert.equal(credit(subset) + credit(units.filter(u => !keys.has(u.key))), value)
      }
    }
    const loopMs = performance.now() - loopStart
    const count = distribution(countHistogram, samples), value = distribution(prefixHistograms.at(-1), samples)
    assert.ok(Math.abs(value.mean / rule.targetValue - 1) < .05)
    assert.ok(Object.keys(countHistogram).length >= 3 && Object.keys(value.histogram).length >= 3)
    assert.ok([...perEntity.values()].every(hits => hits > 0 && hits < samples))
    const rates = [...buckets.values()].map(b => ({ name: b.name, entitiesPerFloor: b.entitiesPerFloor,
      opportunities: b.entitiesPerFloor * samples, dropCount: b.dropCount,
      proposalChance: round(b.proposalSum / b.entitiesPerFloor),
      effectiveChance: round(b.dropCount / (b.entitiesPerFloor * samples)),
      meanCountPerFloor: round(b.dropCount / samples), meanValuePerFloor: round(b.droppedValue / samples),
      oldValuePerFloor: round(b.oldValuePerFloor), relativeCreditChange: round(b.droppedValue / samples / b.oldValuePerFloor - 1) }))
    for (const b of rates) assert.ok(Math.abs(b.relativeCreditChange) < .2, `${floor}/${b.name}: role/rank credit drift`)
    const prefixes = WAVES.map((wave, index) => {
      const subset = units.filter(u => u.wave <= wave), normalCount = subset.filter(u => u.role === 'normal').length
      const oldRare = subset.filter(u => u.role !== 'normal').reduce((s, u) => s + oldCredit(u), 0)
      const oldSteady = normalCount / 20 + oldRare, newValue = distribution(prefixHistograms[index], samples)
      const relative = newValue.mean / oldSteady - 1
      assert.ok(Math.abs(relative) < .2, `${floor}/wave${wave}: tempo drift ${relative}`)
      const theoretical = model.prefixes[index].conditionalMean
      assert.ok(Math.abs(newValue.mean - theoretical) < 7 * newValue.standardError + .015,
        `${floor}/wave${wave}: seeded sampler disagrees with independent Bernoulli model`)
      return { wave, entities: subset.length, normalCount, oldRareValue: oldRare,
        oldZeroCounterValue: Math.floor(normalCount / 20) + oldRare, oldSteadyValue: round(oldSteady),
        newValue, relativeChange: round(relative), theoreticalConditionalMean: theoretical,
        clearBonus: wave === 20 ? 5 * (floor - 1) : 0, firstClearBonus: wave === 20 ? 10 : 0 }
    })
    const clearBonus = 5 * (floor - 1), last = prefixes.find(p => p.wave === 19)
    const first = units[0]
    const archetypes = new Map()
    for (const u of units) {
      if (!archetypes.has(u.id)) archetypes.set(u.id, { id: u.id, name: u.name,
        rank: u.rank, role: u.role, entitiesPerFloor: 0, hits: 0,
        proposalChance: rule.chancesByRole[u.role][u.rank] })
      const a = archetypes.get(u.id)
      a.entitiesPerFloor++; a.hits += perEntity.get(u.key)
    }
    floors.push({ floor, samples, rule, authored: { total: units.length, normal, elite: 5, boss: 1 },
      oldKillValue: TARGETS[floor - 1], oldSteadyKillValue: normal / 20 + rareValue,
      physicalCoreCount: count, killValue: value, rates, prefixes, candidateModel: model,
      clearBonus, firstClearBonus: 10,
      repeatClearValueRange: [rule.minValue + clearBonus, rule.maxValue + clearBonus],
      firstClearValueRange: [rule.minValue + clearBonus + 10, rule.maxValue + clearBonus + 10],
      firstAuthoredEntity: { key: first.key, archetype: first.id, rank: first.rank,
        proposalChance: rule.chancesByRole[first.role][first.rank],
        effectiveChance: perEntity.get(first.key) / samples,
        meanValue: perEntity.get(first.key) / samples * CORE_RANK_VALUES[first.rank] },
      archetypes: [...archetypes.values()].map(a => ({ ...a,
        effectiveChance: a.hits / (a.entitiesPerFloor * samples),
        meanValuePerEntity: a.hits / (a.entitiesPerFloor * samples) * CORE_RANK_VALUES[a.rank] })),
      bossWave: { oldMarginalSteady: normal / 20 + rareValue + clearBonus - last.oldSteadyValue,
        newMarginal: round(value.mean + clearBonus - last.newValue.mean),
        oldW19RepeatShare: last.oldSteadyValue / (normal / 20 + rareValue + clearBonus),
        newW19RepeatShare: last.newValue.mean / (value.mean + clearBonus) },
      everyAuthoredEntityDroppedAndMissed: true, planDigestSha256: digest.digest('hex'),
      verificationLoopMs: round(loopMs), verificationMicrosecondsPerPlan: round(loopMs * 1000 / samples) })
  }
  for (let i = 0; i < 9; i++) for (let j = i + 1; j < 9; j++) {
    assert.equal(Math.sign(floors[i].killValue.mean - floors[j].killValue.mean), Math.sign(TARGETS[i] - TARGETS[j]))
  }
  const farmModels = floors.flatMap(f => f.prefixes.flatMap(p => [10, 20, 80, 160, 240].map(deficit => {
    let oldAttempts = 1
    while (Math.floor(oldAttempts * p.normalCount / 20) + oldAttempts * (p.oldRareValue + p.clearBonus) < deficit) oldAttempts++
    return { floor: f.floor, wave: p.wave, deficit, oldAttemptsWithCarriedCounter: oldAttempts,
      newExpectedAttemptsIID: expectedAttempts(p.newValue.histogram, samples, deficit, p.clearBonus),
      oldLongRunCycleEquivalent: round(deficit / (p.oldSteadyValue + p.clearBonus)),
      newLongRunCycleEquivalent: round(deficit / (p.newValue.mean + p.clearBonus)) }
  })))
  const books = GROWTH_SKILLS.filter(s => s.bookCost).map(s => ({ id: s.id, name: s.name,
    cost: s.bookCost, clear: s.learnClear, prerequisites: s.prerequisites, pointCost: s.pointCosts[0] }))
  const milestones = [1, 2, 3, 6, 9].map(clear => {
    const fs = floors.slice(0, clear), normal = fs.reduce((s, f) => s + f.authored.normal, 0)
    const old = 20 + Math.floor(normal / 20) + fs.reduce((s, f) => s + f.prefixes.at(-1).oldRareValue + f.clearBonus + 10, 0)
    const current = 20 + fs.reduce((s, f) => s + f.killValue.mean + f.clearBonus + 10, 0)
    const minimum = 20 + fs.reduce((s, f) => s + f.rule.minValue + f.clearBonus + 10, 0)
    const basket = books.filter(b => b.clear <= clear).reduce((s, b) => s + b.cost, 0)
      + GROWTH_RESEARCH.filter(x => x.learnClear <= clear).reduce((s, x) => s + x.cost, 0) + (clear >= 6 ? 240 : 0)
    return { clearedFloor: clear, oldWallet: old, newMeanWallet: round(current), newMinimumWallet: minimum,
      basketCost: basket, minimumRemainder: minimum - basket }
  })
  for (const [p, expected] of Object.entries(sourceHashes)) assert.equal(hash(readFileSync(resolve(ROOT, p))), expected, `Source changed during verification: ${p}`)
  return { reportVersion: 2, designRevision: 'denomination-v1', lootVersion: 1,
    rankValues: CORE_RANK_VALUES, samplesPerFloor: samples, totalPlans: samples * 9,
    seedSequence: 'Math.imul(i,0x9e3779b1) >>> 0, i=0..samples-1', maxProposals: PROPOSALS,
    sourceHashes, elapsedMs: round(performance.now() - started), runtime: process.version,
    acceptance: { fullFloorMeanRelativeTolerance: .05, prefixMeanRelativeTolerance: .2,
      maxObservedPrefixRelativeChange: Math.max(...floors.flatMap(f => f.prefixes.map(p => Math.abs(p.relativeChange)))),
      maxObservedFullMeanRelativeChange: Math.max(...floors.map(f => Math.abs(f.killValue.mean / f.rule.targetValue - 1))) },
    claims: ['One matching-rank core per kill; credit uses denomination, not rank.',
      'Mean tempo and bounded full-floor income verified; per-run variance and player difficulty are not unchanged.',
      'Conditioned rates differ from proposal rates; exact Bernoulli model independently checks the seeded geometric sampler.',
      'No full test-suite or build run; historical linear-prototype reports are superseded.'],
    floors, farmModels, books, research: GROWTH_RESEARCH,
    evolutions: GROWTH_EVOLUTIONS.map(e => ({ id: e.id, name: e.name, cost: e.bookCost,
      clear: e.learnClear, requirements: e.rankRequirements[0], pointCost: e.pointCosts[0] })), milestones }
}

const num = n => n.toFixed(3)
const pct = n => `${(n * 100).toFixed(2)}%`
function distributionMarkdown(r) {
  return ['# 妖丹面额修订：分布验证', '',
    `面额 [${r.rankValues.join(',')}]；每层 ${r.samplesPerFloor} 个 seed，共 ${r.totalPlans} 计划。旧线性版结果见 drop-linear-*，均已被本修订替代。`, '',
    '| 层 | 物理颗数规则 / 实测 | 旧击杀目标 | 新均值 | 击杀价值规则 / 可行值 | 重复 / 首通总值范围 |',
    '|---:|---|---:|---:|---|---|',
    ...r.floors.map(f => `| ${f.floor} | ${f.rule.minCount}–${f.rule.maxCount} / ${f.physicalCoreCount.min}–${f.physicalCoreCount.max} | ${f.oldKillValue} | ${num(f.killValue.mean)} | ${f.rule.minValue}–${f.rule.maxValue} / ${f.candidateModel.physicallyFeasibleValues.join(',')} | ${f.repeatClearValueRange.join('–')} / ${f.firstClearValueRange.join('–')} |`), '',
    '| 层 | 候选合格率 | 平均候选次数（理论） | 128次耗尽率（理论） |', '|---:|---:|---:|---:|',
    ...r.floors.map(f => `| ${f.floor} | ${pct(f.candidateModel.acceptanceProbability)} | ${num(f.candidateModel.expectedProposals)} | ${f.candidateModel.exhaustionProbability.toExponential(3)} |`), '',
    '| 层 | 角色/阶 | 候选率 | 实际条件率 | 精确条件率 | 旧价值/层 | 新价值/层 |', '|---:|---|---:|---:|---:|---:|---:|',
    ...r.floors.flatMap(f => f.rates.filter(b => b.name.includes(':')).map(b => `| ${f.floor} | ${b.name} | ${pct(b.proposalChance)} | ${pct(b.effectiveChance)} | ${pct(f.candidateModel.marginals.find(m => m.name === b.name).effectiveChance)} | ${num(b.oldValuePerFloor)} | ${num(b.meanValuePerFloor)} |`)), '',
    `全部计划通过双预算、阶位、实体有效性；全部实体在样本中均有掉落和未掉落。最大整层均值偏差 ${pct(r.acceptance.maxObservedFullMeanRelativeChange)}；最大指定前缀均值偏差 ${pct(r.acceptance.maxObservedPrefixRelativeChange)}。`, '',
    '完整颗数/价值直方图、分位数、采样误差、各阶/角色合计、精确模型及源码哈希见同名JSON。基于均值的验收不意味着局部方差、短期购买等待或玩家难度完全不变。', '',
    ...r.claims.map(c => `- ${c}`), ''].join('\n')
}
function tempoMarkdown(r) {
  return ['# 妖丹面额修订：收益节奏与购买门槛', '',
    `当前面额 [${r.rankValues.join(',')}]；${r.samplesPerFloor} seed/层。原线性版“前三波2.55–3.85倍”的失败证据保存在 drop-linear-tempo.md/json，已被本版本替代。`, '',
    '旧0从普通计数余数0起算；旧长均保留跨局余数，每普通击杀长期0.05，加旧精英/Boss值。新值是实际种子样本均值，条件模型列是独立前向/后向Bernoulli计算。前缀均值容差20%，整层均值相对旧目标容差5%；整层每局价值仍硬限±10%。', '',
    '| 层 | 波次 | 旧0 | 旧长均 | 新均值 | 相对旧长均 | 精确条件均值 | 95%采样区间 |', '|---:|---:|---:|---:|---:|---:|---:|---|',
    ...r.floors.flatMap(f => f.prefixes.map(p => `| ${f.floor} | ${p.wave} | ${p.oldZeroCounterValue} | ${num(p.oldSteadyValue)} | ${num(p.newValue.mean)} | ${pct(p.relativeChange)} | ${num(p.theoreticalConditionalMean)} | ${p.newValue.mean95Interval.map(num).join('–')} |`)), '',
    '| 层 | 19波占重复通关收益 旧长均→新 | 末波边际含清层奖励 旧→新 |', '|---:|---:|---:|',
    ...r.floors.map(f => `| ${f.floor} | ${pct(f.bossWave.oldW19RepeatShare)}→${pct(f.bossWave.newW19RepeatShare)} | ${num(f.bossWave.oldMarginalSteady)}→${num(f.bossWave.newMarginal)} |`), '',
    '线性版把Boss之前的钱抬高，面额修订把普通、精英、Boss的期望价值各自对齐。退局仍保留真实击杀所得、重开仍会新分配；没有新增失败补足、收费或处罚。均值比例恢复不代表每分钟效率已测定：没有模拟战斗、重开、治疗和死亡。', '',
    '## 经卷、研习及方差限制', '',
    `普通特殊书：${r.books.map(b => `${b.name}${b.cost}（通${b.clear}）`).join('；')}。进化书每种240，通6并满足角色19级、母技能6/心法4与技能点。研习80/160/240，通3/6/9，终身共3次各+1技能点。价格及门槛未改。`, '',
    '下面按缺口从0起算，假设其他门槛已满足。旧次数精确保留普通计数余数；新预计次数用样本PMF的独立循环更新方程求出，计入超额到账。它不是每分钟收益，也不是精确真实玩家等待时间。', '',
    '| 循环 | 缺10 旧→新预计 | 缺20 | 缺80 | 缺160 | 缺240 |', '|---|---:|---:|---:|---:|---:|',
    ...[1, 3, 6, 9].map(floor => `| ${floor}层前3波 | ${[10, 20, 80, 160, 240].map(deficit => { const m = r.farmModels.find(m => m.floor === floor && m.wave === 3 && m.deficit === deficit); return `${m.oldAttemptsWithCarriedCounter}→${num(m.newExpectedAttemptsIID)}` }).join(' | ')} |`), '',
    '高阶普通怪现在是低概率大面额，而旧普通奖励是每20杀固定1。虽长期期望接近，低价书可能被一次大额掉落直接覆盖，更多尝试也可能零收入。JSON保留P05/中位数/P95/零收入频数及购买循环模型：不能据此声称每局体验或一切购买时点完全不变。', '',
    '| 已通层 | 旧累计钱包 | 新均值 | 新硬下界 | 书+研习+通6后一种进化书 | 最低余额 |', '|---:|---:|---:|---:|---:|---:|',
    ...r.milestones.map(m => `| ${m.clearedFloor} | ${m.oldWallet} | ${num(m.newMeanWallet)} | ${m.newMinimumWallet} | ${m.basketCost} | ${m.minimumRemainder} |`), '',
    '以上购物篮假定初始20、每层一次完整首通且无其他消费。即使各层只给最低预算仍可付清；境界、通层和技能点要求不因钱更多而跳过。', '',
    '## 同种跨层与原型选择', '',
    '同阶面额固定，条件概率仍按楼层和角色/阶位校准；normalChance等标量只是按该角色实体数加权的展示摘要。实际只用chancesByRole[role][rank]。同种怪在不同层可以有不同候选率/条件率，但本修订对齐的是每只普通怪长期0.05的价值，而非固定掉率。', '',
    '| 层 | 首个编排实体 | 阶 | 候选率 | 实际率 | 单实体均值 |',
    '|---:|---|---:|---:|---:|---:|',
    ...r.floors.map(f => { const a = f.firstAuthoredEntity; return `| ${f.floor} | ${a.archetype} | ${a.rank} | ${pct(a.proposalChance)} | ${pct(a.effectiveChance)} | ${num(a.meanValue)} |` }), '',
    '首个编排实体不保证最先被击杀；稀有单实体采样波动较大。JSON另列每种原型的全层合并实际率，可用于同种跨层比较。', '',
    '原始高面额基础率采用 normal=0.05/面额、elite=旧精英值/面额、boss=旧Boss值/面额；直接条件筛选时六层前三波仍低35.27%。精确条件边际的有界离线校准只运行1–2轮后停止，避免为逼近零误差把接受率压到千分之一。原型、被舍弃的过拟合结果、最终候选率均存于 drop-denomination-prototype.json。', '',
    `当前最大前缀均值偏差 ${pct(r.acceptance.maxObservedPrefixRelativeChange)}，消除了线性版2倍以上的系统性早期收入增加。验收范围是均值节奏、角色/阶位期望、确定性与整层预算；局部方差和实战体验仍不同。`, '',
    '复现：node scripts/verify-tower-loot-distribution.mjs --samples=100000。脚本仅写本目录drop-distribution.md/json与drop-tempo.md/json，无全仓测试/构建/游戏存档操作。', ''].join('\n')
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2)
  if (args.length > 1 || args.length === 1 && !/^--samples=\d+$/.test(args[0])) throw new RangeError('Usage: node scripts/verify-tower-loot-distribution.mjs [--samples=100000]')
  const report = verifyTowerLootDistribution({ samples: args.length ? Number(args[0].split('=')[1]) : 100000 })
  mkdirSync(REPORT_DIR, { recursive: true })
  writeFileSync(resolve(REPORT_DIR, 'drop-distribution.json'), `${JSON.stringify(report, null, 2)}\n`)
  writeFileSync(resolve(REPORT_DIR, 'drop-distribution.md'), distributionMarkdown(report))
  writeFileSync(resolve(REPORT_DIR, 'drop-tempo.json'), `${JSON.stringify({ ...report, kind: 'tempo-and-affordability' }, null, 2)}\n`)
  writeFileSync(resolve(REPORT_DIR, 'drop-tempo.md'), tempoMarkdown(report))
  console.log(JSON.stringify({ ok: true, totalPlans: report.totalPlans, elapsedMs: report.elapsedMs, ...report.acceptance }))
}
