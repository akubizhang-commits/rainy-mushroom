import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { ARCHETYPES, FLOORS, FLOOR01, FLOOR01_BOSS, ECONOMY } from '../js/xianxia/TowerContent.js'

const source = name => JSON.parse(readFileSync(new URL(`../docs/xianxia/sect-tower-v1/data/${name}`, import.meta.url), 'utf8'))
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`)
const expected = [[150,3500,16000,4.664,7.932,9.332,14.928], [230,10400,60500,8.0795,13.739,16.1645,25.861], [340,20400,79200,10.1805,17.3085,20.361,32.5765], [600,41400,271700,13.1175,22.2975,26.2305,41.9715], [880,64400,693000,16.5195,28.089,33.0435,52.8705], [1250,100000,729000,25.4375,43.2465,50.875,81.4], [1850,195000,1122000,40.0565,68.0955,80.1075,128.1775], [2600,230000,2316100,50.457,85.778,100.914,161.4635], [3600,285000,3335000,63.5635,108.0585,127.127,203.401]]
const fields = ['normal_hp','elite_hp','boss_hp','normal_damage','elite_damage','boss_damage','boss_heavy_damage']

test('all nine floor baselines equal the calibrated mechanic budgets, not player-dependent multipliers', () => {
  assert.equal(FLOORS.length, 9)
  FLOORS.forEach((f, i) => {
    assert.equal(f.floor, i + 1)
    const scale = f.floor_stat_scale
    assert.equal(scale.version, 4)
    assert.equal(scale.reference_level, (i + 1) * 3)
    assert.deepEqual(fields.map(k => scale[k]), expected[i])
    assert.equal(scale.early_normal_through_wave, i === 3 ? 5 : 4)
    assert.equal(scale.early_normal_hp_multiplier, i === 3 ? .7 : 1)
    if (i) for (const key of fields) assert.ok(scale[key] > FLOORS[i - 1].floor_stat_scale[key])
  })
})

test('family factors preserve heavy, agile and ranged identities across every role and named boss', () => {
  const hp = { boar:1.15, bear:1.15, crocodile:1.15, wolf:.9, tiger:.9, rhino:.9, yak:.9,
    snake:.75, falcon:.75, bat:.75, scorpion:.75, spider:1, centipede:1, ape:1 }
  for (const a of ARCHETYPES) {
    const family = a.id.split('_')[0]
    assert.equal(a.floor_hp_factor, hp[family], a.id)
    assert.equal(a.floor_speed_factor, ['boar','bear','crocodile'].includes(family) ? .9 : 1, a.id)
    assert.ok(a.move_speed * a.floor_speed_factor > 0)
  }
  const baseline=JSON.parse(readFileSync(new URL('../reports/rank-role-rebalance-2026-11-01/before/rank-attributes.json',import.meta.url))).archetypes
  for(const old of baseline){
    const current=ARCHETYPES.find(a=>a.id===old.id);assert.ok(current,old.id)
    assert.equal(current.role,old.role);assert.equal(current.rank,old.rank)
    if(old.id!=='spider_elite_chixiao') assert.equal(current.move_speed,old.move_speed)
  }
  assert.equal(new Set(ARCHETYPES.map(a=>a.id)).size,ARCHETYPES.length)
})

test('eleven-family roster preserves 20 waves, summons and authored first-floor timing', () => {
  const old=JSON.parse(readFileSync(new URL('../reports/rank-role-rebalance-2026-11-01/before/floor01-encounters.json',import.meta.url)))
  for(const [i,w] of FLOOR01.waves.entries()){
    assert.deepEqual(w.batches.flatMap(b=>b.unit_ids),old.waves[i].batches.flatMap(b=>b.unit_ids))
    assert.equal(w.planned_required,old.waves[i].planned_required)
  }
  const ids = new Set(ARCHETYPES.map(a => a.id))
  for (const floor of FLOORS) {
    assert.equal(floor.waves.length, 20)
    assert.ok(new Set(floor.waves.flatMap(w => w.enemy_groups.map(g => g.archetype.split('_')[0]))).size >= 3)
    for (const wave of floor.waves) for (const g of wave.enemy_groups) assert.ok(ids.has(g.archetype))
  }
})

test('first-floor aliases resolve to the same baselines and boss attacks carry final light/heavy values only once', () => {
  assert.deepEqual(FLOOR01.floor_stat_scale, FLOORS[0].floor_stat_scale)
  for (const [id, a] of Object.entries(FLOOR01.enemies)) {
    const canonical = ARCHETYPES.find(x => x.id === id)
    assert.deepEqual(a, { ...canonical, body_radius: a.body_radius })
  }
  const s = FLOORS[0].floor_stat_scale
  assert.equal(FLOOR01_BOSS.stats_resolved, true)
  close(FLOOR01_BOSS.hp, 16000 * 1.15)
  close(FLOOR01_BOSS.move_speed, 154 * .9)
  assert.equal(FLOOR01_BOSS.damage, s.boss_damage)
  const charge = FLOOR01_BOSS.attacks.find(a => a.id === 'charge')
  const gore = FLOOR01_BOSS.attacks.find(a => a.id === 'gore')
  assert.deepEqual([charge.damage_class, charge.damage], ['heavy', 14.928])
  assert.deepEqual([gore.damage_class, gore.damage], ['light', 9.332])
  close(charge.phase2.maximum_damage_if_both_segments_hit, 29.856)
  const attacks = FLOOR01_BOSS.attacks.map(({ damage, damage_class, ...a }) => {
    if (a.phase2) { a.phase2 = { ...a.phase2 }; delete a.phase2.maximum_damage_if_both_segments_hit }
    return a
  })
  assert.equal(digest(attacks), '20072d22d2a2b45ff603ddaf1272ca07853a17f0b8900fa159436bf365b03861', 'damage changes cannot alter warnings, shapes, cooldowns or hit ledgers')
})

test('generated constants remain identical to their source tables and generation has a read-only check', () => {
  assert.deepEqual(FLOORS, source('tower-design.json').floors)
  assert.deepEqual(ARCHETYPES, source('rank-attributes.json').archetypes)
  assert.deepEqual(FLOOR01, source('floor01-encounters.json'))
  assert.deepEqual(FLOOR01_BOSS, source('floor01-boss.json'))
  assert.deepEqual(ECONOMY, source('economy-v2.json'))
  const run = spawnSync('python3', ['scripts/build-tower-content.py', '--check'], { cwd: new URL('..', import.meta.url), encoding:'utf8' })
  assert.equal(run.status, 0, run.stdout + run.stderr)
})

test('source economy metadata describes ten-layer growth without the stale20-percent cultivation ceiling', () => {
  const cap = ECONOMY.cultivation_cap, f = cap.growth_formula
  assert.equal(ECONOMY.schema_version, 4, 'metadata cleanup is not a save migration')
  assert.equal(cap.max_level, 30)
  assert.equal(cap.max_xp, 14400)
  assert.equal(Object.hasOwn(cap, 'max_attack_bonus'), false)
  assert.equal(Object.hasOwn(cap, 'max_hp_bonus'), false)
  assert.deepEqual([f.minor_attack_multiplier, f.minor_hp_multiplier, f.breakthrough_attack_multiplier, f.breakthrough_hp_multiplier], [1.08,1.08,1.35,1.35])
  assert.equal(f.breakthrough_replaces_minor_step, true)
  assert.equal(f.intermediate_rounding, false)
})
