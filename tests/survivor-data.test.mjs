import test from 'node:test'
import assert from 'node:assert/strict'

import { PLAYER } from '../js/survivor/data/player.js'
import { WEAPONS } from '../js/survivor/data/weapons.js'
import { PASSIVES } from '../js/survivor/data/passives.js'
import { ENEMIES } from '../js/survivor/data/enemies.js'
import { WAVES } from '../js/survivor/data/waves.js'
import { LIMITS } from '../js/survivor/data/limits.js'
import { STRINGS } from '../js/survivor/data/strings.js'
import { validate } from '../js/survivor/data/validate.js'

test('validate() returns an empty array for the shipped data', () => {
  assert.deepEqual(validate(), [])
})

test('spore_shot five levels match the 01-gdd §6.1 table item by item', () => {
  // 01 §6.1：伤害/冷却/发数/穿透/弹速/击退（life=飞行寿命 1.2 秒）
  const expected = [
    { damage: 10, cooldown: 1.0, count: 1, pierce: 1, speed: 420, knockback: 10, life: 1.2 },
    { damage: 10, cooldown: 1.0, count: 2, pierce: 1, speed: 420, knockback: 10, life: 1.2 },
    { damage: 15, cooldown: 1.0, count: 2, pierce: 1, speed: 420, knockback: 10, life: 1.2 },
    { damage: 15, cooldown: 0.8, count: 2, pierce: 2, speed: 420, knockback: 10, life: 1.2 },
    { damage: 15, cooldown: 0.8, count: 3, pierce: 2, speed: 420, knockback: 10, life: 1.2 },
  ]
  const levels = WEAPONS.spore_shot.levels
  assert.equal(levels.length, 5)
  expected.forEach((exp, i) => {
    for (const [field, value] of Object.entries(exp)) {
      assert.equal(levels[i][field], value, `spore_shot Lv${i + 1} ${field}`)
    }
  })
  // 进化：孢子风暴（01 §6.1）
  assert.deepEqual(
    { ...WEAPONS.spore_shot.evolved },
    { name: '孢子风暴', damage: 22, cooldown: 0.6, count: 5, pierce: 3, speed: 480, knockback: 15, life: 1.2 },
  )
})

test('umbrella_blades five levels match the 01-gdd §6.2 table', () => {
  // 伤害/片数/旋转半径/角速度/单敌受击间隔/击退
  const rows = [
    [8, 2, 70, 200, 0.5, 20],
    [12, 2, 70, 200, 0.5, 20],
    [12, 3, 70, 200, 0.5, 20],
    [12, 3, 90, 220, 0.5, 20],
    [16, 4, 90, 220, 0.5, 25],
  ]
  const fields = ['damage', 'count', 'orbitRadius', 'angularSpeedDeg', 'hitInterval', 'knockback']
  const w = WEAPONS.umbrella_blades
  assert.equal(w.levels.length, 5)
  rows.forEach((row, i) => fields.forEach((f, j) => assert.equal(w.levels[i][f], row[j], `Lv${i + 1} ${f}`)))
  assert.equal(w.bladeRadius, 16)
  assert.equal(w.evolved, null, 'S2 不做进化')
})

test('dew_ring five levels match the 01-gdd §6.3 table', () => {
  // 伤害/半径/伤害间隔/圈内减速
  const rows = [
    [4, 60, 0.8, 0.15],
    [4, 75, 0.8, 0.15],
    [7, 75, 0.8, 0.15],
    [7, 90, 0.8, 0.25],
    [10, 90, 0.6, 0.25],
  ]
  const fields = ['damage', 'radius', 'interval', 'slow']
  const w = WEAPONS.dew_ring
  assert.equal(w.levels.length, 5)
  rows.forEach((row, i) => fields.forEach((f, j) => assert.equal(w.levels[i][f], row[j], `Lv${i + 1} ${f}`)))
  assert.equal(w.evolved, null, 'S2 不做进化')
})

test('raindrop / leaf_boomerang stay as empty placeholders (08 §2)', () => {
  for (const id of ['raindrop', 'leaf_boomerang']) {
    assert.equal(WEAPONS[id].placeholder, true)
    assert.equal(WEAPONS[id].levels.length, 0)
  }
  const indices = Object.values(WEAPONS).map((w) => w.index).sort()
  assert.deepEqual(indices, [0, 1, 2, 3, 4])
})

test('passives match 01-gdd §7: per-level effect and Lv5 total; regen/magnet absent in S2', () => {
  const expected = { might: [0.1, 'might'], cooldown: [0.08, 'cooldown'], area: [0.1, 'area'], speed: [0.08, 'moveSpeed'] }
  assert.deepEqual(Object.keys(PASSIVES).sort(), Object.keys(expected).sort())
  for (const [id, [per, stat]] of Object.entries(expected)) {
    const p = PASSIVES[id]
    assert.equal(p.perLevel, per, `${id} perLevel`)
    assert.equal(p.stat, stat, `${id} stat`)
    assert.equal(p.levels.length, 5)
    p.levels.forEach((v, i) => assert.ok(Math.abs(v - per * (i + 1)) < 1e-12, `${id} Lv${i + 1}`))
  }
  assert.equal(PASSIVES.might.levels[4], 0.5)
  assert.equal(PASSIVES.cooldown.levels[4], 0.4)
  assert.equal(PASSIVES.area.levels[4], 0.5)
  assert.equal(PASSIVES.speed.levels[4], 0.4)
  assert.equal(PASSIVES.regen, undefined)
  assert.equal(PASSIVES.magnet, undefined)
})

test('gnat and beetle match 01-gdd §9 table: hp/moveSpeed/damage/xp/radius', () => {
  // 01 §9：生命/移速/接触伤害/经验/碰撞半径
  assert.equal(ENEMIES.gnat.hp, 8)
  assert.equal(ENEMIES.gnat.moveSpeed, 110)
  assert.equal(ENEMIES.gnat.contactDamage, 5)
  assert.equal(ENEMIES.gnat.xp, 1)
  assert.equal(ENEMIES.gnat.radius, 10)

  assert.equal(ENEMIES.beetle.hp, 25)
  assert.equal(ENEMIES.beetle.moveSpeed, 70)
  assert.equal(ENEMIES.beetle.contactDamage, 8)
  assert.equal(ENEMIES.beetle.xp, 2)
  assert.equal(ENEMIES.beetle.radius, 16)
})

test('enemies carry the §9.1 growth coefficients', () => {
  for (const id of ['gnat', 'beetle']) {
    assert.equal(ENEMIES[id].hpGrowthPerMin, 0.15, `${id} hpGrowthPerMin`)
    assert.equal(ENEMIES[id].damageGrowthPerMin, 0.05, `${id} damageGrowthPerMin`)
  }
})

test('wave segments are contiguous and start at 0', () => {
  const segments = WAVES.segments
  assert.ok(segments.length > 0)
  assert.equal(segments[0].fromSec, 0)
  for (let i = 1; i < segments.length; i += 1) {
    assert.equal(segments[i].fromSec, segments[i - 1].toSec, `segment ${i} 首尾相接`)
  }
})

test('each wave composition sums to 100 and references known enemies', () => {
  for (const seg of WAVES.segments) {
    let sum = 0
    for (const [id, pct] of Object.entries(seg.composition)) {
      assert.ok(ENEMIES[id], `composition id ${id} 存在于 enemies`)
      sum += pct
    }
    assert.equal(sum, 100, `段 ${seg.fromSec}-${seg.toSec} 组成和为 100`)
  }
})

test('wave on-screen caps stay within the hard limit', () => {
  for (const seg of WAVES.segments) {
    assert.ok(seg.cap <= LIMITS.hardCaps.enemies, `段 ${seg.fromSec}-${seg.toSec} 同屏上限 ≤ limits`)
  }
})

test('wave segments cover the whole timed run (BUG-S1-01: no empty field before the win)', () => {
  const last = WAVES.segments[WAVES.segments.length - 1]
  assert.ok(last.toSec >= WAVES.winAtSeconds, `波次需覆盖到 ${WAVES.winAtSeconds}s，实际到 ${last.toSec}s`)
})

test('waves.winAtSeconds is the 180s timed-victory target (00 §8 D4)', () => {
  assert.equal(WAVES.winAtSeconds, 180)
})

test('all data modules survive a JSON round-trip', () => {
  for (const mod of [PLAYER, WEAPONS, PASSIVES, ENEMIES, WAVES, LIMITS, STRINGS]) {
    assert.deepEqual(JSON.parse(JSON.stringify(mod)), mod)
  }
})

test('player-facing strings pass the compliance word-list scan', () => {
  // 01 §2 合规词表：禁止 {吃,食用,采食,美味}×{蘑菇,菌} 组合，禁止 {击杀,消灭,屠杀,死亡,血,尸}
  const forbiddenSingles = ['击杀', '消灭', '屠杀', '死亡', '血', '尸']
  const eatVerbs = ['吃', '食用', '采食', '美味']
  const mushroomNouns = ['蘑菇', '菌']
  for (const [key, value] of Object.entries(STRINGS)) {
    assert.equal(typeof value, 'string', `${key} 必须为字符串`)
    for (const word of forbiddenSingles) {
      assert.ok(!value.includes(word), `strings.${key} 含违规词「${word}」`)
    }
    for (const verb of eatVerbs) {
      if (!value.includes(verb)) continue
      for (const noun of mushroomNouns) {
        assert.ok(!value.includes(noun), `strings.${key} 含「${verb}…${noun}」违规组合`)
      }
    }
  }
})

test('data modules are frozen', () => {
  for (const mod of [PLAYER, WEAPONS, PASSIVES, ENEMIES, WAVES, LIMITS, STRINGS]) {
    assert.ok(Object.isFrozen(mod))
  }
})
