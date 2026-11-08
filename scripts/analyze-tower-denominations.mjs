// Design-only, import-safe analysis. Reads real content; never writes saves,
// production data, generated shared files or reports. CLI output goes to stdout.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { ARCHETYPES, FLOORS, FLOOR01 } from '../js/xianxia/TowerContent.js'
import { CORE_RANK_VALUES, CORE_DROP_RULES } from '../js/xianxia/TowerLoot.js'
import {
  GROWTH_SKILLS, GROWTH_EVOLUTIONS, GROWTH_RESEARCH, GROWTH_STAGES, GROWTH_POINT_CAP,
  giftSkills, growthSummary, skillRequirement, skillStage,
} from '../js/xianxia/TowerGrowth.js'
import { cultivationAt, TOWER_XP_CAP, TOWER_RESOURCE_CAP } from '../js/xianxia/TowerProfile.js'

export const PROPOSED_CORE_VALUES = Object.freeze([0, 1, 10, 100, 1000, 10000, 100000, 1000000])
export const PROPOSED_SPIRIT_VALUES = Object.freeze([1, 100, 10000, 1000000])
export const PROPOSED_BOOK_COSTS = Object.freeze({
  sj_yujian: 0, sj_arc: 0, sj_wanjian: 0, vajra: 0, magnet: 0, sj_heart: 0,
  sj_line: 100, sj_shadow: 100, sj_mark: 500, sj_bone: 500,
  sj_formation: 2000, sj_gate: 1000,
  evo_wanjian: 10000, evo_tiandi: 50000, evo_wuwo: 50000, evo_sixiang: 100000,
})
export const PROPOSED_RESEARCH_COSTS = Object.freeze([1000, 10000, 1000000])
const PREFIXES = [1, 3, 5, 10, 15, 19, 20]
const A = Object.fromEntries(ARCHETYPES.map(row => [row.id, row]))
const definitions = [...GROWTH_SKILLS, ...GROWTH_EVOLUTIONS]
const sum = values => values.reduce((a, b) => a + b, 0)
const value = unit => PROPOSED_CORE_VALUES[unit.rank]
const round = number => Number(number.toFixed(6))

export function authoredUnits(floor) {
  assert.ok(Number.isInteger(floor) && floor >= 1 && floor <= 9)
  return FLOORS[floor - 1].waves.flatMap(wave => {
    if (floor === 1) return FLOOR01.waves[wave.wave - 1].batches.flatMap(batch =>
      batch.unit_ids.map(id => ({ ...A[batch.archetype], wave: wave.wave, key: `${wave.wave}:${id}` })))
    // Preserve the actual Run's stable boss-first local ID assignment.
    const groups = [...wave.enemy_groups.filter(group => A[group.archetype].role === 'boss'),
      ...wave.enemy_groups.filter(group => A[group.archetype].role !== 'boss')]
    let local = 0
    return groups.flatMap(group => Array.from({ length: group.count }, () =>
      ({ ...A[group.archetype], wave: wave.wave, key: `${wave.wave}:u${++local}` })))
  })
}

function subsets(pool, count, start = 0, prefix = [], result = []) {
  if (!count) { result.push(prefix); return result }
  for (let i = start; i <= pool.length - count; i++) subsets(pool, count - 1, i + 1, [...prefix, pool[i]], result)
  return result
}

const models = new Map()
export function proposedModel(floor) {
  if (models.has(floor)) return models.get(floor)
  const units = authoredUnits(floor)
  assert.equal(new Set(units.map(unit => unit.key)).size, units.length)
  assert.ok(units.every(unit => Number.isInteger(unit.rank) && unit.rank >= 1 && unit.rank <= 7
    && Number.isFinite(unit.hp) && unit.hp > 0))
  const normal = units.filter(unit => unit.role === 'normal')
  const elite = units.filter(unit => unit.role === 'elite')
  const bosses = units.filter(unit => unit.role === 'boss')
  assert.equal(bosses.length, 1)
  assert.equal(elite.length, 5)
  assert.ok(normal.every(unit => unit.rank <= 3))
  const normalMin = Math.ceil(normal.length * 25 / 1000)
  const normalMax = Math.ceil(normal.length * 40 / 1000)
  const eliteMaxRank = Math.max(...elite.map(unit => unit.rank))
  const eliteChoices = [3, 4, 5].map(count =>
    subsets(elite, count).filter(group => group.some(unit => unit.rank === eliteMaxRank)))
  assert.ok(eliteChoices.every(groups => groups.length))
  const marginal = new Map(units.map(unit => [unit.key, 0]))
  for (const unit of normal) marginal.set(unit.key, (normalMin + normalMax) / 2 / normal.length)
  const eliteOutcomes = []
  for (const groups of eliteChoices) for (const group of groups) {
    const probability = 1 / 3 / groups.length
    for (const unit of group) marginal.set(unit.key, marginal.get(unit.key) + probability)
    eliteOutcomes.push({ group, probability, value: sum(group.map(value)) })
  }
  marginal.set(bosses[0].key, 1)
  const sorted = normal.map(value).sort((a, b) => a - b)
  const minValue = sum(sorted.slice(0, normalMin)) + Math.min(...eliteOutcomes.map(row => row.value)) + value(bosses[0])
  const maxValue = sum(sorted.slice(-normalMax)) + Math.max(...eliteOutcomes.map(row => row.value)) + value(bosses[0])
  const meanValue = sum(units.map(unit => value(unit) * marginal.get(unit.key)))
  const result = { floor, units, normal, elite, bosses, normalMin, normalMax, eliteMaxRank,
    eliteChoices, eliteOutcomes, marginal, minValue, maxValue, meanValue,
    minCount: normalMin + 4, maxCount: normalMax + 6, meanCount: (normalMin + normalMax) / 2 + 5 }
  models.set(floor, result)
  return result
}

function randomFor(floor, seed) {
  assert.ok(Number.isInteger(seed) && seed >= 0 && seed <= 0xffffffff)
  let state = (seed ^ Math.imul(floor, 0x9e3779b9) ^ 0x44454e32) >>> 0
  state = Math.imul(state ^ state >>> 16, 0x85ebca6b)
  state = Math.imul(state ^ state >>> 13, 0xc2b2ae35)
  state = (state ^ state >>> 16) >>> 0
  return () => {
    state = state + 0x6d2b79f5 >>> 0
    let t = Math.imul(state ^ state >>> 15, state | 1)
    t ^= t + Math.imul(t ^ t >>> 7, t | 61)
    return ((t ^ t >>> 14) >>> 0) / 0x100000000
  }
}

export function buildProposedPlan(floor, seed) {
  const model = proposedModel(floor), random = randomFor(floor, seed)
  const count = model.normalMin + Math.floor(random() * (model.normalMax - model.normalMin + 1))
  const pool = [...model.normal], selected = new Set(model.bosses.map(unit => unit.key))
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(random() * (pool.length - i))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
    selected.add(pool[i].key)
  }
  const groups = model.eliteChoices[Math.floor(random() * 3)]
  for (const unit of groups[Math.floor(random() * groups.length)]) selected.add(unit.key)
  return Object.freeze(Object.fromEntries(model.units.filter(unit => selected.has(unit.key))
    .map(unit => [unit.key, unit.rank])))
}

export function splitSpiritValue(amount) {
  assert.ok(Number.isSafeInteger(amount) && amount >= 0)
  const counts = [0, 0, 0, 0]
  for (let i = 3; i >= 0; i--) {
    counts[i] = Math.floor(amount / PROPOSED_SPIRIT_VALUES[i])
    amount %= PROPOSED_SPIRIT_VALUES[i]
  }
  return counts
}

// A design-level kill receipt, not a replacement for Run/Campaign validation.
// It deliberately has no floor-minimum or first-clear award input.
export function summarizeKilled(plan, killedKeys, { training = false } = {}) {
  assert.equal(new Set(killedKeys).size, killedKeys.length)
  const byRank = Array(7).fill(0)
  if (!training) for (const key of killedKeys) {
    const rank = plan[key] || 0
    if (rank) byRank[rank - 1]++
  }
  return { byRank, count: sum(byRank),
    value: sum(byRank.map((count, index) => count * PROPOSED_CORE_VALUES[index + 1])) }
}

function prefixStats(model, wave) {
  const units = model.units.filter(unit => unit.wave <= wave)
  const normal = units.filter(unit => unit.role === 'normal')
  const sorted = normal.map(value).sort((a, b) => a - b)
  const forcedNormal = Math.max(0, model.normalMin - (model.normal.length - normal.length))
  const eliteValues = model.eliteOutcomes.map(outcome =>
    sum(outcome.group.filter(unit => unit.wave <= wave).map(value)))
  const bossValue = sum(model.bosses.filter(unit => unit.wave <= wave).map(value))
  const mean = sum(units.map(unit => value(unit) * model.marginal.get(unit.key)))
  const hp = sum(units.map(unit => unit.hp))
  const maximumNormal = Math.min(normal.length, model.normalMax)
  return { wave, kills: units.length, hp, mean: round(mean),
    minimum: sum(sorted.slice(0, forcedNormal)) + Math.min(...eliteValues) + bossValue,
    maximum: sum(maximumNormal ? sorted.slice(-maximumNormal) : []) + Math.max(...eliteValues) + bossValue,
    meanPerKill: units.length ? round(mean / units.length) : 0,
    meanPer1000Hp: hp ? round(mean / hp * 1000) : 0 }
}

function verifyConstructiveExtrema(model) {
  const sorted = [...model.normal].sort((a, b) => value(a) - value(b))
  for (const maximum of [false, true]) {
    const elite = model.eliteOutcomes.reduce((best, row) =>
      (maximum ? row.value > best.value : row.value < best.value) ? row : best)
    const normals = maximum ? sorted.slice(-model.normalMax) : sorted.slice(0, model.normalMin)
    const chosen = [...normals, ...elite.group, ...model.bosses]
    const plan = Object.fromEntries(chosen.map(unit => [unit.key, unit.rank]))
    assert.equal(chosen.length, maximum ? model.maxCount : model.minCount)
    assert.ok(model.eliteChoices[elite.group.length - 3].includes(elite.group))
    assert.equal(summarizeKilled(plan, chosen.map(unit => unit.key)).value,
      maximum ? model.maxValue : model.minValue)
  }
  assert.deepEqual(prefixStats(model, 0), {
    wave: 0, kills: 0, hp: 0, mean: 0, minimum: 0, maximum: 0, meanPerKill: 0, meanPer1000Hp: 0,
  })
}

function exactVariance(model) {
  const n = model.normal.length, meanUnit = sum(model.normal.map(value)) / n
  const populationVariance = sum(model.normal.map(unit => (value(unit) - meanUnit) ** 2)) / n
  const counts = Array.from({ length: model.normalMax - model.normalMin + 1 }, (_, i) => model.normalMin + i)
  const meanNormal = sum(counts) / counts.length * meanUnit
  const normalVariance = sum(counts.map(k =>
    k * (n - k) / (n - 1) * populationVariance + (k * meanUnit - meanNormal) ** 2)) / counts.length
  const eliteMean = sum(model.eliteOutcomes.map(row => row.probability * row.value))
  return normalVariance + sum(model.eliteOutcomes.map(row => row.probability * (row.value - eliteMean) ** 2))
}

function quantile(sorted, p) { return sorted[Math.max(0, Math.ceil(sorted.length * p) - 1)] }

function checkModel(model, samples) {
  verifyConstructiveExtrema(model)
  const histogram = new Map(), totals = [], hitsByRank = Array(8).fill(0), prefixes = PREFIXES.map(() => 0)
  const byKey = new Map(model.units.map(unit => [unit.key, unit]))
  const selectedByUnit = new Map(model.units.map(unit => [unit.key, 0]))
  for (let i = 0; i < samples; i++) {
    const seed = Math.imul(i, 0x9e3779b1) >>> 0, plan = buildProposedPlan(model.floor, seed), keys = Object.keys(plan)
    if (i < 3) {
      buildProposedPlan(model.floor, (seed ^ 1) >>> 0)
      assert.deepEqual(buildProposedPlan(model.floor, seed), plan)
      assert.deepEqual(summarizeKilled(plan, []), { byRank: Array(7).fill(0), count: 0, value: 0 })
      assert.equal(summarizeKilled(plan, keys, { training: true }).value, 0)
      const replayed = JSON.parse(JSON.stringify(plan))
      for (const wave of PREFIXES) {
        const killed = model.units.filter(unit => unit.wave <= wave).map(unit => unit.key)
        const receipt = summarizeKilled(plan, killed), bounds = prefixStats(model, wave)
        assert.ok(receipt.value >= bounds.minimum && receipt.value <= bounds.maximum)
        assert.deepEqual(summarizeKilled(replayed, killed), receipt)
        if (wave < 20) assert.equal(receipt.byRank[model.bosses[0].rank - 1],
          killed.filter(key => byKey.get(key).role !== 'boss' && plan[key] === model.bosses[0].rank).length)
      }
    }
    let total = 0, normals = 0, elites = 0, highestElite = 0
    for (const key of keys) {
      const unit = byKey.get(key)
      assert.ok(unit)
      assert.equal(plan[key], unit.rank)
      total += value(unit)
      normals += unit.role === 'normal'
      elites += unit.role === 'elite'
      highestElite += unit.role === 'elite' && unit.rank === model.eliteMaxRank
      selectedByUnit.set(key, selectedByUnit.get(key) + 1)
      hitsByRank[unit.rank]++
      PREFIXES.forEach((wave, j) => { if (unit.wave <= wave) prefixes[j] += value(unit) })
    }
    assert.ok(normals >= model.normalMin && normals <= model.normalMax)
    assert.ok(elites >= 3 && elites <= 5 && highestElite >= 1)
    assert.equal(plan[model.bosses[0].key], model.bosses[0].rank)
    assert.ok(total >= model.minValue && total <= model.maxValue)
    assert.ok(Number.isSafeInteger(total) && total < TOWER_RESOURCE_CAP)
    histogram.set(keys.length, (histogram.get(keys.length) || 0) + 1)
    totals.push(total)
  }
  assert.equal(histogram.size, model.maxCount - model.minCount + 1)
  // Exact marginals are authoritative; sampling verifies the actual selector.
  for (const unit of model.units) {
    const p = model.marginal.get(unit.key), observed = selectedByUnit.get(unit.key)
    assert.ok(Math.abs(observed - samples * p) <= 7 * Math.sqrt(samples * p * (1 - p)) + 2)
  }
  const measuredMean = sum(totals) / samples, se = Math.sqrt(exactVariance(model) / samples)
  assert.ok(Math.abs(measuredMean - model.meanValue) <= 7 * se + 1)
  totals.sort((a, b) => a - b)
  return { samples, measuredMean: round(measuredMean), meanStandardError: round(se),
    p05: quantile(totals, .05), median: quantile(totals, .5), p95: quantile(totals, .95),
    observedMin: totals[0], observedMax: totals.at(-1),
    meanCountByRank: hitsByRank.slice(1).map(count => round(count / samples)),
    prefixMeans: prefixes.map(total => round(total / samples)) }
}

function economics() {
  const floorIncome = Array.from({ length: 9 }, (_, i) => {
    const model = proposedModel(i + 1)
    return { floor: i + 1, min: model.minValue + 5 * i + 10, mean: model.meanValue + 5 * i + 10,
      max: model.maxValue + 5 * i + 10 }
  })
  const income = (floors, statistic) => 20 + sum(floorIncome.slice(0, floors).map(row => row[statistic]))
  const researchDue = floor => sum(PROPOSED_RESEARCH_COSTS.slice(0, Math.floor(floor / 3)))
  const deadlines = [
    { level: 10, completedFloors: 2, ids: ['sj_line', 'sj_shadow'] },
    { level: 13, completedFloors: 4, ids: ['sj_mark', 'sj_bone'] },
    { level: 16, completedFloors: 5, ids: ['sj_formation', 'sj_gate'] },
    { level: 19, completedFloors: 6, ids: ['evo_wanjian'] },
    { level: 22, completedFloors: 7, ids: ['evo_tiandi', 'evo_wuwo'] },
    { level: 25, completedFloors: 8, ids: ['evo_sixiang'] },
  ]
  let priorBooks = 0
  const liquidity = deadlines.map(row => {
    const fee = sum(row.ids.map(id => PROPOSED_BOOK_COSTS[id]))
    const available = income(row.completedFloors, 'min') - priorBooks - researchDue(row.completedFloors)
    assert.ok(available >= fee, `all-books monetary stress budget misses Lv${row.level}`)
    priorBooks += fee
    return { ...row, fee, guaranteedAvailableBeforeFee: available, remaining: available - fee }
  })
  const allBooks = sum(Object.values(PROPOSED_BOOK_COSTS)), allResearch = sum(PROPOSED_RESEARCH_COSTS)
  assert.ok(income(9, 'min') >= allBooks + allResearch)
  const researchLiquidity = PROPOSED_RESEARCH_COSTS.map((cost, index) => {
    const clearedFloor = (index + 1) * 3
    const booksDue = sum(deadlines.filter(row => row.completedFloors < clearedFloor)
      .flatMap(row => row.ids).map(id => PROPOSED_BOOK_COSTS[id]))
    const previousResearch = sum(PROPOSED_RESEARCH_COSTS.slice(0, index))
    const available = income(clearedFloor, 'min') - booksDue - previousResearch
    assert.ok(available >= cost, `research ${index + 1} is unaffordable at unlock`)
    return { clearedFloor, cost, guaranteedAvailableBeforeFee: available, remaining: available - cost }
  })
  const routes = [
    { evolution: 'evo_wanjian', completedFloors: 6, skills: { sj_yujian: 6, sj_heart: 4 } },
    { evolution: 'evo_tiandi', completedFloors: 7, skills: { sj_arc: 2, sj_line: 6, sj_mark: 4 } },
    { evolution: 'evo_wuwo', completedFloors: 7, skills: { sj_wanjian: 6, sj_bone: 4 } },
    { evolution: 'evo_sixiang', completedFloors: 8, skills: { sj_wanjian: 2, sj_formation: 6, sj_gate: 2 } },
  ].map(route => {
    const level = skillStage(route.evolution).minLevel, previous = level - 1, xp = 30 * previous + 15 * previous * previous
    const state = { xp, clearedFloor: route.completedFloors, tutorialWaves: 3,
      researchPurchases: Math.floor(route.completedFloors / 3), skills: giftSkills(3), evolutionRanks: {}, books: [] }
    let bookCost = 0
    for (const [id, rank] of [...Object.entries(route.skills), [route.evolution, 1]]) {
      const key = id === route.evolution ? 'evolutionRanks' : 'skills'
      while ((state[key][id] || 0) < rank) {
        const quote = skillRequirement(state, id)
        assert.ok(quote.ok, `${route.evolution}: ${id} ${quote.reason}`)
        if (quote.bookCost) { state.books.push(id); bookCost += PROPOSED_BOOK_COSTS[id] }
        state[key][id] = quote.nextLevel
      }
    }
    const budget = growthSummary(state)
    assert.ok(budget.available >= 0 && budget.total <= 36)
    const available = income(route.completedFloors, 'min') - researchDue(route.completedFloors)
    assert.ok(available >= bookCost)
    return { evolution: route.evolution, level, completedFloors: route.completedFloors,
      bookCost, spSpent: budget.spent, spAvailable: budget.total, minimumCashAfterResearch: available }
  })
  const bossFirst = Array.from({ length: 9 }, (_, i) => {
    const model = proposedModel(i + 1), wave20 = model.units.filter(unit => unit.wave === 20)
    const prefix = model.units.filter(unit => unit.wave < 20 || unit.role === 'boss')
    const totalHp = sum(model.units.map(unit => unit.hp))
    const mean = sum(prefix.map(unit => value(unit) * model.marginal.get(unit.key)))
    const hp = sum(prefix.map(unit => unit.hp))
    return { floor: i + 1, killsToBossIncludingFirst19Waves: prefix.length,
      minHpFraction: round(hp / totalHp), retainedMeanValue: round(mean),
      valueFraction: round(mean / model.meanValue), skippedAdds: wave20.length - 1,
      fullClearBonusForgone: 5 * i, firstClearBonusForgone: 10 }
  })
  const farming = [100, 1000, 10000, 50000, 100000, 1000000].map(price => {
    const first = proposedModel(1)
    return { price, floor1Repeats: { luckiest: Math.ceil(price / first.maxValue),
      meanRateBenchmark: Math.ceil(price / first.meanValue), guaranteed: Math.ceil(price / first.minValue) } }
  })
  const ninth = proposedModel(9)
  return { floorIncome, liquidity, researchLiquidity, routes, farming, allBooks, allResearch, totalFees: allBooks + allResearch,
    minTotalIncome: income(9, 'min'), meanTotalIncome: round(income(9, 'mean')), maxTotalIncome: income(9, 'max'),
    minSurplus: income(9, 'min') - allBooks - allResearch,
    meanSurplus: round(income(9, 'mean') - allBooks - allResearch), bossFirst,
    floor9RepeatsToCapFromZero: { luckiest: Math.ceil(TOWER_RESOURCE_CAP / (ninth.maxValue + 40)),
      guaranteed: Math.ceil(TOWER_RESOURCE_CAP / (ninth.minValue + 40)) } }
}

export function analyzeDenominations({ samples = 10000 } = {}) {
  assert.ok(Number.isInteger(samples) && samples >= 1000 && samples <= 100000)
  assert.equal(GROWTH_POINT_CAP, 36)
  assert.equal(TOWER_XP_CAP, 10920)
  const hashes = Object.fromEntries(['TowerLoot', 'TowerGrowth', 'TowerProfile', 'TowerContent', 'TowerCampaign'].map(name =>
    [name, createHash('sha256').update(readFileSync(new URL(`../js/xianxia/${name}.js`, import.meta.url))).digest('hex')]))
  let xp = 0, spiritTotals = [0, 0, 0, 0], maxKillXp = 0
  const floors = Array.from({ length: 9 }, (_, i) => {
    const model = proposedModel(i + 1), old = CORE_DROP_RULES[i + 1]
    const roleRanks = {}, byRank = Array(8).fill(0)
    for (const unit of model.units) {
      roleRanks[`${unit.role}:${unit.rank}`] = (roleRanks[`${unit.role}:${unit.rank}`] || 0) + 1
      byRank[unit.rank]++
      const award = unit.rank * ({ normal: 1, elite: 5, boss: 10 }[unit.role])
      const split = splitSpiritValue(award)
      assert.equal(sum(split.map((n, index) => n * PROPOSED_SPIRIT_VALUES[index])), award)
      spiritTotals = spiritTotals.map((n, index) => n + split[index])
      xp += award
      maxKillXp = Math.max(maxKillXp, award)
    }
    const groups = Object.entries(roleRanks).map(([name, entities]) => {
      const [role, rank] = name.split(':'), unit = model.units.find(unit => unit.role === role && unit.rank === Number(rank))
      return { role, rank: Number(rank), entities, chance: round(model.marginal.get(unit.key)) }
    })
    const fullHp = sum(model.units.map(unit => unit.hp))
    const beforeBoss = Array.from({ length: 19 }, (_, index) => prefixStats(model, index + 1))
    return {
      floor: i + 1, units: model.units.length, byRank: byRank.slice(1), roleRanks,
      normalCount: [model.normalMin, model.normalMax], count: [model.minCount, model.maxCount],
      meanCount: model.meanCount, value: [model.minValue, model.maxValue], meanValue: round(model.meanValue),
      guaranteedEliteRank: model.eliteMaxRank, guaranteedBossRank: model.bosses[0].rank, groups,
      prefixes: PREFIXES.map(wave => prefixStats(model, wave)),
      bestNonBossPrefixByHp: beforeBoss.reduce((best, row) => row.meanPer1000Hp > best.meanPer1000Hp ? row : best),
      hp: fullHp, meanPer1000Hp: round(model.meanValue / fullHp * 1000),
      cumulativeXp: xp, characterLevel: cultivationAt(xp).level,
      old: { count: [old.minCount, old.maxCount], value: [old.minValue, old.maxValue], target: old.targetValue,
        ranksExcludedByUnchangedValueCap: byRank.flatMap((count, rank) => count && value({ rank }) > old.maxValue ? [rank] : []) },
      simulation: checkModel(model, samples),
    }
  })
  assert.equal(sum(floors.map(row => row.units)), 4770)
  assert.equal(xp, 9726)
  assert.equal(maxKillXp, 70)
  for (const amount of [0, 1, 99, 100, 101, 9999, 10000, 1000000, 1000101, TOWER_RESOURCE_CAP]) {
    assert.equal(sum(splitSpiritValue(amount).map((n, i) => n * PROPOSED_SPIRIT_VALUES[i])), amount)
  }
  const economy = economics()
  const stageArrivals = [{ level: 1, stage: GROWTH_STAGES[0].label, threshold: 0, floor: 1, wave: 0, xp: 0 }]
  let waveXp = 0
  for (let floor = 1; floor <= 9; floor++) for (let wave = 1; wave <= 20; wave++) {
    waveXp += sum(authoredUnits(floor).filter(unit => unit.wave === wave)
      .map(unit => unit.rank * ({ normal: 1, elite: 5, boss: 10 }[unit.role])))
    for (const stage of GROWTH_STAGES) {
      if (stage.minLevel <= cultivationAt(waveXp).level && !stageArrivals.some(row => row.level === stage.minLevel)) {
        const previous = stage.minLevel - 1
        stageArrivals.push({ level: stage.minLevel, stage: stage.label, threshold: 30 * previous + 15 * previous ** 2,
          floor, wave, xp: waveXp })
      }
    }
  }
  assert.ok(economy.liquidity.every(row =>
    row.completedFloors === stageArrivals.find(stage => stage.level === row.level).floor - 1))
  return {
    designOnly: true, samplesPerFloor: samples, hashes,
    currentCoreValues: CORE_RANK_VALUES, proposedCoreValues: PROPOSED_CORE_VALUES,
    proposedSpiritValues: PROPOSED_SPIRIT_VALUES,
    books: definitions.map(row => ({ id: row.id, level: row.learnLevel, clear: row.learnClear,
      current: row.bookCost, proposed: PROPOSED_BOOK_COSTS[row.id] })),
    research: GROWTH_RESEARCH.map((row, i) => ({ clear: row.learnClear, points: row.points,
      current: row.cost, proposed: PROPOSED_RESEARCH_COSTS[i] })),
    floors, economy, stageArrivals,
    spirit: { perKillCountByQuality: spiritTotals, maxKillXp, totalXp: xp, finalLevel: cultivationAt(xp).level,
      xpToCap: TOWER_XP_CAP - xp, separateVisualBundles: 4770 },
    validations: ['4770 authored IDs and exact enemy grades', 'all supported total counts sampled',
      'exact conditional marginals and sampled selector agree', 'constructive full-floor extrema',
      'all grade guarantees reached by actual kill selection only', 'seed replay stable',
      'prefix/empty ledgers never receive a floor minimum top-up', 'all-stage monetary stress budget nonnegative',
      'four evolution routes obey real SP/stage/prerequisite rules', 'XP conserved at every kill and all denomination boundaries',
      'all raw rewards and fees fit the existing safe-integer wallet cap'],
  }
}

function table(headers, rows) {
  return [`| ${headers.join(' | ')} |`, `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map(row => `| ${row.join(' | ')} |`)].join('\n')
}
function summary(report) {
  console.log(`Design-only analysis; ${report.samplesPerFloor} seeded plans/floor, ${report.validations.length} checks passed.\n`)
  console.log(table(['层', '怪物一至七阶', '普通掉数', '总颗数', '总价值范围', '期望', 'P05 / P50 / P95', '每千HP价值'],
    report.floors.map(f => [f.floor, f.byRank.join('/'), f.normalCount.join('–'), f.count.join('–'),
      f.value.join('–'), f.meanValue, [f.simulation.p05, f.simulation.median, f.simulation.p95].join('/'), f.meanPer1000Hp])))
  console.log('\n' + table(['角色Lv', '已完整通层', '新书', '新书合价', '扣旧书/已开放研习后最少可用', '购后余额'],
    report.economy.liquidity.map(row => [row.level, row.completedFloors, row.ids.join('/'), row.fee,
      row.guaranteedAvailableBeforeFee, row.remaining])))
  console.log('\n' + table(['层', '前5波期望', '前10波期望', '前19波期望', 'Boss先杀保留价值比例', '至少完成HP比例'],
    report.floors.map((row, i) => [row.floor, row.prefixes[2].mean, row.prefixes[3].mean, row.prefixes[5].mean,
      report.economy.bossFirst[i].valueFraction, report.economy.bossFirst[i].minHpFraction])))
  console.log('\n' + table(['进化', 'Lv', '已通层', '书费', 'SP用量/可用', '扣研习最少现金'],
    report.economy.routes.map(row => [row.evolution, row.level, row.completedFloors, row.bookCost,
      `${row.spSpent}/${row.spAvailable}`, row.minimumCashAfterResearch])))
  console.log('\n' + JSON.stringify({ economy: {
    books: report.economy.allBooks, research: report.economy.allResearch, fees: report.economy.totalFees,
    minimumIncome: report.economy.minTotalIncome, expectedIncome: report.economy.meanTotalIncome,
    maximumIncome: report.economy.maxTotalIncome, minimumSurplus: report.economy.minSurplus,
    expectedSurplus: report.economy.meanSurplus,
  }, spirit: report.spirit }, null, 2))
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const args = process.argv.slice(2), option = args.find(arg => arg.startsWith('--samples='))
  assert.ok(args.every(arg => arg === '--json' || arg.startsWith('--samples=')), 'Use [--samples=10000] [--json]')
  const report = analyzeDenominations({ samples: option ? Number(option.split('=')[1]) : 10000 })
  if (args.includes('--json')) console.log(JSON.stringify(report, null, 2))
  else summary(report)
}
