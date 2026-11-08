import test from 'node:test'
import assert from 'node:assert/strict'
import {
  GROWTH_SKILLS, GROWTH_EVOLUTIONS, GROWTH_POINT_CAP, GROWTH_RESEARCH,
  giftSkills, realmPoints, totalPoints, spentPoints, growthSummary,
  skillRequirement, rankCap,
} from '../js/xianxia/TowerGrowth.js'
import {cultivationLevelXp, cultivationAt} from '../js/xianxia/TowerProfile.js'
import { SKILLS, EVOLUTIONS } from '../js/xianxia/TowerContent.js'

const skill = id => GROWTH_SKILLS.find(row => row.id === id)
const evolution = id => GROWTH_EVOLUTIONS.find(row => row.id === id)
const state = (extra = {}) => ({
  xp: 14400, clearedFloor: 9, researchPurchases: 0, tutorialWaves: 3,
  skills: giftSkills(3), evolutionRanks: {}, books: [], ...extra,
})
const close = (actual, expected, label) =>
  assert.ok(Math.abs(actual - expected) < 1e-10, `${label}: ${actual} != ${expected}`)
const quote = (s, id, options) => skillRequirement(s, id, options)

test('explicit playtest bonus extends available SP without changing natural sources or rank gates', () => {
  const ordinary = state({ skills: { ...giftSkills(3), sj_yujian: 3 } })
  const before = growthSummary(ordinary)
  const boosted = { ...ordinary, playtestSkillPoints: 999 + before.spent - before.total }
  const after = growthSummary(boosted)
  assert.equal(after.available, 999)
  assert.equal(after.total, before.spent + 999)
  assert.equal(totalPoints(boosted), after.total)
  assert.equal(after.spent, before.spent)
  for (const key of ['realm', 'firstClear', 'research', 'cap']) assert.equal(after[key], before[key])
  assert.equal(after.cap, 35, 'natural point cap is unchanged')
  assert.equal(quote(state({ xp: 0, skills: { sj_yujian: 3 }, playtestSkillPoints: 999 }), 'sj_yujian').reason, 'stage-locked')
  assert.equal(totalPoints({ ...state(), playtestSkillPoints: 10000 }), 10035)
  for (const value of [-1, .5, '999', null, undefined, Infinity, NaN, 10001, Number.MAX_SAFE_INTEGER]) {
    assert.throws(() => growthSummary({ ...ordinary, playtestSkillPoints: value }), RangeError)
  }
})

test('growth rows retain level-addressable effects without changing the legacy five-level catalog', () => {
  assert.deepEqual(GROWTH_SKILLS.filter(row => !['sj_flight', 'sj_cross', 'sj_spirit','sj_moon','sj_moon_triple','sj_sancai','sj_qinglian'].includes(row.id)).map(row => row.id), SKILLS.filter(row => row.id !== 'magnet').map(row => row.id))
  assert.deepEqual(GROWTH_EVOLUTIONS.map(row => row.id), EVOLUTIONS.map(row => row.id))
  for (const row of GROWTH_SKILLS.filter(row => !['sj_flight', 'sj_cross', 'sj_spirit','sj_moon','sj_moon_triple','sj_sancai','sj_qinglian'].includes(row.id))) {
    const max = row.kind === 'active' ? 10 : row.id === 'sj_mark' ? 1 : row.id === 'sj_gate' ? 2 : 4
    assert.equal(row.maxLevel, max)
    assert.equal(row.pointCosts.length, max)
    assert.equal(row.levels.length, max)
    const old = SKILLS.find(candidate => candidate.id === row.id)
    assert.equal(old.max_level, 5)
    assert.equal(old.prices.length, 5)
    assert.notEqual(old, row)
    for (const [field, value] of Object.entries(old)) {
      if(row.id==='sj_mark'&&field==='wound_share')continue
      if(row.id==='sj_gate' && ['share','icd','budget_lifetime'].includes(field)) continue
      if (['prices', 'max_level', 'level_clear_requirements', 'clear'].includes(field)) continue
      assert.ok(Object.hasOwn(row, field), `${row.id}.${field}`)
      if (Array.isArray(value)) {
        assert.equal(row[field].length, max, `${row.id}.${field}`)
        for (let i = 0; i < max; i++) {
          assert.equal(row.levels[i][field], row[field][i], `${row.id}.${field} level ${i + 1}`)
          assert.ok(Number.isFinite(row[field][i]))
        }
      }
    }
  }
})

const levelPoints=level=>(level-1)+(level>=11?3:0)+(level>=21?3:0)
test('each level awards one point and Zhuji/Jindan breakthroughs add three', () => {
 for(let level=1;level<=30;level++){
  const xp=cultivationLevelXp(level)
  assert.equal(realmPoints(xp),levelPoints(level))
  assert.equal(realmPoints(xp),levelPoints(level),'re-reading does not award again')
  if(level>1)assert.equal(realmPoints(xp-1),levelPoints(level-1))
 }
})

test('first clears and retired research never extend the 35 level points', () => {
 for(let clearedFloor=0;clearedFloor<=9;clearedFloor++){
  const s=state({clearedFloor,researchPurchases:0})
  assert.equal(growthSummary(s).firstClear,0)
  assert.equal(totalPoints(s),35)
  assert.equal(totalPoints({...s,kills:100000,repeatedClears:10000,time:1e12}),35)
 }
 assert.deepEqual(GROWTH_RESEARCH,[])
 assert.deepEqual(growthSummary(state()),{total:35,spent:0,available:35,realm:35,firstClear:0,research:0,cap:35})
 assert.equal(GROWTH_POINT_CAP,35)
 for(const researchPurchases of [-1,.5,4])assert.throws(()=>totalPoints(state({researchPurchases})),RangeError)
})

test('starter grant is always arc and ignores all milestone counters', () => {
 for(const n of [0,1,2,3,10000]) assert.deepEqual(giftSkills(n),{sj_arc:1})
 const detached=giftSkills(0);detached.sj_arc=10
 assert.equal(giftSkills(0).sj_arc,1)
 assert.equal(totalPoints(state({xp:0,clearedFloor:0,researchPurchases:0})),0)
})

test('spending charges every learned rank once except the initial arc gift', () => {
  assert.equal(spentPoints(state({
    tutorialWaves: 0, skills: { sj_yujian: 3, sj_arc: 1 },
  })), 3, 'only the initial arc gift is free')
  assert.equal(spentPoints(state({
    tutorialWaves: 1, skills: { sj_yujian: 3, sj_arc: 1 },
  })), 3)
  const invested = state({
    skills: { ...giftSkills(3), sj_yujian: 10, sj_heart: 4 },
    evolutionRanks: { evo_wanjian: 1 }, books: ['evo_wanjian'],
  })
  assert.equal(spentPoints(invested), 16)
  const reset = { ...invested, skills: giftSkills(3), evolutionRanks: {} }
  assert.equal(growthSummary(reset).available - growthSummary(invested).available, 16)
  assert.equal(spentPoints(reset), 0)
  assert.deepEqual(reset.books, ['evo_wanjian'])
  assert.equal(quote(reset, 'sj_yujian').nextLevel, 1)
})

test('all fully invested nodes cost 142 after the starter gift, and an overspend remains visible', () => {
  const full = state({
    skills: Object.fromEntries(GROWTH_SKILLS.map(row => [row.id, row.maxLevel])),
    evolutionRanks: Object.fromEntries(GROWTH_EVOLUTIONS.map(row => [row.id, 2])),
  })
  // 152 = former 142 plus 青莲剑阵 at ten ranks, one point each.
  assert.equal(spentPoints(full), 152)
  assert.equal(growthSummary(full).available, -117)
  const extra = state({ skills: { ...giftSkills(3), sj_line: 10, sj_shadow: 10, sj_formation: 10, sj_wanjian: 10 } })
  assert.equal(quote(extra, 'vajra').reason, 'insufficient-points')
})

test('invalid point sources and ranks cannot silently manufacture or erase investment', () => {
  for (const xp of [-1, 1.5, NaN, Infinity, 14401, '10920']) {
    assert.throws(() => realmPoints(xp), RangeError)
  }
  for (const n of [-1, .5, Infinity, NaN, '3']) assert.throws(() => giftSkills(n), RangeError)
  for (const patch of [
    { clearedFloor: 10 }, { researchPurchases: -1 }, { researchPurchases: .5 },
    { skills: { sj_yujian: 11 } }, { skills: { sj_arc: '2' } },
    { skills: { fake_skill: 0 } }, { evolutionRanks: { evo_wanjian: 4 } },
  ]) assert.throws(() => growthSummary(state(patch)))
  assert.throws(() => spentPoints({ skills: [] }), TypeError)
  assert.throws(() => quote(state({ books: {} }), 'sj_yujian'), TypeError)
  assert.deepEqual(quote(state(), '__proto__'), {
    ok: false, reason: 'unknown-skill', nextLevel: 0, cost: 0, bookCost: 0,
  })
})

test('rank bands follow each skill starting phase independently of books', () => {
  for (const row of GROWTH_SKILLS) {
    for (const [xp, level] of [[1484,9], [1485,10], [5399,18], [5400,19]]) {
      const expected = row.rankRequirements.filter(req => req.characterLevel <= level).length
      assert.equal(rankCap(row.id, xp, 9), expected)
    }
  }
  assert.equal(rankCap('unknown', 0, 0), 0)
  const locked = state({ xp: 224, skills: { ...giftSkills(3), sj_yujian: 3 } })
  assert.equal(quote(locked, 'sj_yujian').reason, 'realm-locked')
  assert.deepEqual(quote({ ...locked, xp: 1485, skills: { ...locked.skills, sj_spirit: 2 } }, 'sj_yujian'), {
    ok: true, nextLevel: 4, cost: 1, bookCost: 0,
  })
  assert.equal(quote(state({ xp: 1484, skills: { ...giftSkills(3), sj_heart: 3 } }), 'sj_heart').reason, 'stage-locked')
  assert.equal(quote(state({ xp: 5400, skills: { ...giftSkills(3), sj_heart: 3 } }), 'sj_heart').cost, 1)
})

test('unlearned basic attacks can be purchased without teaching events', () => {
 const before=state({tutorialWaves:0,skills:giftSkills(0)})
 for(const id of ['sj_yujian','sj_wanjian']) assert.deepEqual(quote(before,id),{ok:true,nextLevel:1,cost:1,bookCost:0})
 assert.equal(quote(before,'sj_arc').nextLevel,2)
})

test('tower quotes permit learned skills and evolutions within current rank gates', () => {
  assert.equal(quote(state(), 'sj_yujian', { inTower: true }).ok, true)
  assert.equal(quote(state(), 'sj_heart', { inTower: true }).ok, true)
  assert.equal(quote(state({ skills: { ...giftSkills(3), sj_heart: 1 } }), 'sj_heart', { inTower: true }).ok, true)
  assert.equal(quote(state({ skills: { ...giftSkills(3), sj_mark: 1 } }), 'sj_mark', { inTower: true }).ok, false)
  assert.equal(quote(state({ skills: { ...giftSkills(3), sj_yujian: 3, sj_spirit: 2 } }), 'sj_yujian', { inTower: true }).ok, true)
  assert.equal(quote(state({ skills: { ...giftSkills(3), sj_shadow: 1 } }), 'sj_shadow', { inTower: true }).ok, true)
  for (const row of GROWTH_EVOLUTIONS) {
    assert.equal(quote(state({skills:{...giftSkills(3),[row.parent]:1}}), row.id, { inTower: true }).ok, true)
  }
})

test('special first study quotes its book cost without floor or base-skill prerequisites', () => {
  for (const [id, parent, floor] of [
    ['sj_shadow', 'sj_yujian', 1], ['sj_line', 'sj_arc', 1], ['sj_formation', 'sj_wanjian', 2],
  ]) {
    const s = state({ researchPurchases: 0, clearedFloor: floor - 1, skills: giftSkills(3) })
    assert.equal(quote(s, id).ok, true)
    assert.deepEqual(skill(id).prerequisites, {})
    const withoutBase = { ...giftSkills(3) }; delete withoutBase[parent]
    assert.equal(quote({ ...s, clearedFloor: floor, skills: withoutBase }, id).ok, true)
    const eligible = { ...s, clearedFloor: floor }
    assert.deepEqual(quote(eligible, id), { ok: true, nextLevel: 1, cost: 1, bookCost: 200 })
    assert.equal(quote({ ...eligible, books: [id] }, id).bookCost, 0)
    assert.equal(quote({ ...eligible, skills: { ...eligible.skills, [id]: 1 } }, id).bookCost, 0)
  }
  for (const [id, floor] of [['sj_mark', 1], ['sj_bone', 1], ['sj_gate', 2]]) {
    const before = state({ researchPurchases: 0, clearedFloor: floor - 1 })
    assert.equal(quote(before, id).ok, true)
    assert.deepEqual(quote({ ...before, clearedFloor: floor }, id), {
      ok: true, nextLevel: 1, cost: 1, bookCost: id === 'sj_bone' ? 0 : 100,
    })
  }
  for (const id of ['sj_heart', 'vajra', 'sj_spirit']) {
    assert.equal(quote(state({ researchPurchases: 0, clearedFloor: 0 }), id).bookCost, 0)
  }
})

test('insufficient points and maximum level always return a finite actionable quote', () => {
  const fresh = { xp: 0, skills: giftSkills(0) }
  assert.deepEqual(quote(fresh, 'sj_arc'), {
    ok: false, reason: 'insufficient-points', nextLevel: 2, cost: 1, bookCost: 0,
  })
  assert.deepEqual(quote({ ...fresh, xp: 45 }, 'sj_arc'), {
    ok: true, nextLevel: 2, cost: 1, bookCost: 0,
  })
  assert.equal(quote({ ...fresh, xp: 45, skills: { sj_yujian: 2, sj_arc: 1 } }, 'sj_arc').reason,
    'insufficient-points', 'a level-eligible rank still requires unspent points')
  assert.deepEqual(quote(state({ skills: { sj_arc: 10 } }), 'sj_arc'), {
    ok: false, reason: 'max-level', nextLevel: 10, cost: 0, bookCost: 0,
  })
})

test('all four evolutions have independent realm gates and approved costs', () => {
  for (const [id, parent, passive, learnXp] of [
    ['evo_wanjian', 'sj_yujian', 'sj_heart', 6601],
    ['evo_wuwo', 'sj_wanjian', 'sj_bone', 8625],
    ['evo_tiandi', 'sj_line', 'sj_mark', 7245],
    ['evo_sixiang', 'sj_formation', 'sj_gate', 10920],
  ]) {
    assert.equal(evolution(id).parent, parent)
    assert.equal(evolution(id).passive, passive)
    const first = state({ xp: learnXp, clearedFloor: 6, researchPurchases: 0,
      skills: { ...giftSkills(3), [parent]: 1 } })
    assert.deepEqual(quote(first, id), { ok: true, nextLevel: 1, cost: evolution(id).pointCosts[0], bookCost: 2400 })
    assert.equal(quote({ ...first, books: [id] }, id).bookCost, 0)
    assert.equal(quote({ ...first, xp: learnXp - 1 }, id).reason, 'stage-locked')
    assert.equal(quote({ ...first, clearedFloor: 5 }, id).ok, true)
    assert.equal(quote({ ...first, skills: { ...first.skills, [parent]: 5 } }, id).ok, true)
    assert.equal(Object.hasOwn(first.skills, passive), false)
    assert.equal(evolution(id).visualRank, 10)
    const second = state({
      skills: { ...giftSkills(3), [parent]: 1 },
      evolutionRanks: { [id]: 1 }, books: [id],
    })
    assert.deepEqual(quote(second, id), { ok: true, nextLevel: 2, cost: evolution(id).pointCosts[1], bookCost: 0 })
    assert.equal(quote({ ...second, xp: 9359 }, id).reason, id === 'evo_sixiang' ? 'stage-locked' : 'realm-locked')
    assert.equal(quote({ ...second, clearedFloor: 8, researchPurchases: 0 }, id).ok, true)
    assert.equal(quote({ ...second, skills: { ...second.skills, [parent]: 7 } }, id).ok, true)
    assert.equal(Object.hasOwn(second.skills, passive), false)
    assert.deepEqual(quote({ ...second, evolutionRanks: { [id]: 2 } }, id), {
      ok: false, reason: 'max-level', nextLevel: 2, cost: 0, bookCost: 0,
    })
    assert.equal(rankCap(id, 5399, 9), 0)
    assert.equal(rankCap(id, 5400, 5), 0)
    assert.equal(rankCap(id, 5400, 6), 0)
    assert.equal(rankCap(id, 9359, 9), 1)
    assert.equal(rankCap(id, 10920, 9), id === 'evo_sixiang' ? 1 : 2)
  }
})

const routes = [
  {
    name: '御剑追击', bookSpend: 2600, spent: 30,
    skills: { sj_spirit: 3, sj_yujian: 10, sj_heart: 4, sj_shadow: 3, sj_arc: 3, sj_wanjian: 3, vajra: 3 },
    evolutionRanks: { evo_wanjian: 1 },
  },
  {
    name: '剑气贯穿', bookSpend: 2600, spent: 32,
    skills: { sj_arc: 10, sj_line:10, vajra: 4, sj_bone: 3, sj_flight: 1, sj_spirit: 3 },
    evolutionRanks: { evo_tiandi: 1 },
  },
  {
    name: '剑阵控场', bookSpend: 2600, spent: 35,
    skills: { sj_arc: 10, sj_formation:10, vajra: 1, sj_bone: 3, sj_flight: 1, sj_spirit: 3 },
    evolutionRanks: { evo_sixiang: 2 },
  },
]

for (const route of routes) {
  test(`${route.name} can be acquired one rank at a time within 35 points with all prerequisites`, () => {
    const s = state()
    let paidBooks = 0
    for (const [table, key] of [[GROWTH_SKILLS, 'skills'], [GROWTH_EVOLUTIONS, 'evolutionRanks']]) {
      for (const row of [...table].sort((a, b) => Number(b.id === 'sj_spirit') - Number(a.id === 'sj_spirit'))) {
        const target = route[key][row.id] || 0
        while ((s[key][row.id] || 0) < target) {
          const result = quote(s, row.id)
          assert.equal(result.ok, true, JSON.stringify({ id: row.id, ...result }))
          const before = growthSummary(s).available
          s[key][row.id] = result.nextLevel
          if (result.bookCost) { s.books.push(row.id); paidBooks += result.bookCost }
          assert.equal(growthSummary(s).available, before - result.cost)
        }
      }
    }
    assert.equal(paidBooks, route.bookSpend)
    assert.equal(spentPoints(s), route.spent)
    assert.equal(growthSummary(s).available, 35 - route.spent)
    assert.equal(totalPoints(s), 35)
    if (route.spent === 35) assert.equal(quote(s, 'sj_yujian').reason, 'insufficient-points')
  })
}

test('27-point pursuit build keeps its evolution using only level points', () => {
  const { sj_shadow, ...withoutShadow } = routes[0].skills
  const s = state({
    clearedFloor: 6, researchPurchases: 0,
    skills: withoutShadow, evolutionRanks: routes[0].evolutionRanks,
  })
  assert.equal(spentPoints(s), 27)
  assert.equal(realmPoints(s.xp), 35)
  assert.equal(growthSummary(s).available, 8, 'only level points pay this build')
})

// 2026-11-06（84/85号复测）基础数值调整：御剑1–9级按比例压低，流云斩×1.3，剑破虚空×1.5，两仪7–10级×1.25。
const EXTRA = { sj_yujian: [.5,.5,.52,.65,.72,.8,.85,.9,.95,1], sj_arc: Array(10).fill(1.3), sj_line: Array(10).fill(1.5), sj_formation: [1,1,1,1,1,1,1.25,1.25,1.25,1.25] }
const extra = (id, i) => EXTRA[id]?.[i] ?? 1
test('six active curves preserve normalized per-target budgets and constant attack frequency', () => {
  for (const [id, base, interval, factor, multiplier] of [
    ['sj_yujian', 1.2, 1, 1, 1.13], ['sj_arc', 1.2, 3.5, 1/4, 1.15],
    ['sj_wanjian', .3, 6, 1 / .6, 1.2], ['sj_line', 14.4, 12, 1/12, 1.1],
    ['sj_shadow', 6.4, 6, 1/6, (2.64*1.2**9/3.52)**(1/9)], ['sj_formation', 32 / 15 * 1.65, 12, .5, 1.15],
  ]) {
    const row = skill(id)
    assert.equal(row.cooldown ?? row.hit_interval, interval)
    close(row.single_dps_factor, factor, id)
    for (let i = 0; i < 10; i++) {
      const transition = id === 'sj_formation' ? [1,1,1,1,1,1,1.05,1.10,1.15,1.20][i] : 1
      close(row.damage[i], ((id === 'sj_yujian' ? (i === 0 ? 1.2 : i === 1 ? 1.5 : 1.8 * 1.13 ** (i-2)) : id === 'sj_arc' ? (.8 * (i === 0 ? 1.5 : i === 1 ? 2.1 : 3 * 1.15 ** (i-2))) : base * multiplier ** i * transition) * extra(id, i)), `${id} lv${i + 1}`)
      const periodDamage = id === 'sj_yujian'
        ? row.damage[i] / row.swords[i] * row.swords[i]
        : row.damage[i]
      close(periodDamage, ((id === 'sj_yujian' ? (i === 0 ? 1.2 : i === 1 ? 1.5 : 1.8 * 1.13 ** (i-2)) : id === 'sj_arc' ? (.8 * (i === 0 ? 1.5 : i === 1 ? 2.1 : 3 * 1.15 ** (i-2))) : base * multiplier ** i * transition) * extra(id, i)), `${id} no extra sword multiplier`)
    }
  }
  close(skill('sj_yujian').damage[9], 1.8 * 1.13 ** 7, 'primary sword retains full damage')
  close(skill('sj_wanjian').damage[9] / skill('sj_wanjian').hit_interval, .5 * 1.2 ** 9, 'eight orbit visuals share one hit window')
  close(skill('sj_formation').damage[9] * 6 / 8, 1.6 * 1.15 ** 9 * 1.20 * 1.65 * 1.25, 'six-tick damage budget per eight seconds')
  assert.equal(skill('sj_line').target_cap[0], 3)
  assert.equal(skill('sj_line').target_cap[9], 6)
  assert.equal(skill('sj_arc').target_cap, 6)
  assert.equal(skill('sj_formation').target_cap, 8)
})

test('differentiated evolution budgets do not add a second parent attack channel', () => {
  for (let level = 1; level <= 10; level++) {
    for (let rank = 1; rank <= 2; rank++) {
      const y = skill('sj_yujian'), rain = evolution('evo_wanjian')
      const yDps = y.damage[level - 1] / y.cooldown
      const normalDps = yDps * rain.regularMultiplier
      const rainTick = yDps * (rain.budgetMultipliers[rank - 1] - rain.regularMultiplier) * rain.rainCooldown / rain.rainTicks
      close((normalDps + rainTick * rain.rainTicks / rain.rainCooldown) / yDps, [1.3, 1.69][rank - 1], 'rain+normal')
      const line = skill('sj_line'), bigLine = evolution('evo_tiandi')
      const hit = line.damage[level - 1] * bigLine.cooldown / line.cooldown * bigLine.budgetMultipliers[rank - 1]
      close(hit / bigLine.cooldown / (line.damage[level - 1] / line.cooldown), [1.4, 1.82][rank - 1], 'line cadence')
      const orbit = evolution('evo_wuwo')
      close(Math.max(orbit.innerMultiplier[rank - 1], orbit.budgetMultipliers[rank - 1]), [1.2, 1.44][rank - 1], 'overlapping rings use max')
      const f = skill('sj_formation'), four = evolution('evo_sixiang')
      close(f.damage[level - 1] * four.budgetMultipliers[rank - 1] * four.ticks / f.cooldown
        / (f.damage[level - 1] * f.ticks / f.cooldown), [2.0, 2.3][rank - 1], 'eyes share one tick budget')
    }
  }
})

test('passive endpoint budgets stay bounded and their intermediate progression matches the new ranks', () => {
  const heart = skill('sj_heart'), mark = skill('sj_mark'), bone = skill('sj_bone'), gate = skill('sj_gate')
  assert.deepEqual(heart.crit_chance, [.08, .14, .20, .28])
  assert.deepEqual(skill('vajra').reduction, [.06, .09, .12, .15])
  assert.deepEqual(skill('sj_spirit').pickup_bonus, [.20, .35, .50])
  assert.equal(mark.vulnerability,.2);assert.equal(mark.maxLevel,1);assert.deepEqual(mark.pointCosts,[1])
  assert.deepEqual(bone.damage_bonus, [.06, .12, .18, .25])
  assert.deepEqual(bone.speed_bonus, [.02, .04, .06, .08])
  assert.equal(gate.name, '剑罡爆裂'); assert.equal(gate.maxLevel, 2)
  assert.deepEqual(gate.proc_damage, [.5, 1.2])
  assert.equal(gate.trigger_cooldown, 10)
  assert.equal(gate.target_cap, 6)
  close(heart.crit_chance[3] * heart.crit_bonus, .14, 'max expected crit contribution')
  close(1000 * (1+mark.vulnerability), 1200, 'follow-up direct damage gains twenty percent')
  close(100 * gate.proc_damage[1], 120, 'burst damage per target scales from attack')
})

test('quotes and lookups do not mutate caller state, gifts or shared tables', () => {
  const s = state({
    skills: { ...giftSkills(3), sj_yujian: 6, sj_heart: 4 },
    books: ['evo_wanjian'],
  })
  const before = structuredClone(s)
  for (const row of [...GROWTH_SKILLS, ...GROWTH_EVOLUTIONS]) {
    quote(s, row.id)
    rankCap(row.id, s.xp, s.clearedFloor)
  }
  growthSummary(s)
  assert.deepEqual(s, before)
  assert.throws(() => { skill('sj_yujian').damage[9] = 100 }, TypeError)
  assert.throws(() => { skill('sj_line').prerequisites.sj_arc = 0 }, TypeError)
  assert.throws(() => { evolution('evo_wanjian').rankRequirements[0].parentLevel = 0 }, TypeError)
  assert.throws(() => { GROWTH_RESEARCH[0].cost = 0 }, TypeError)
})
