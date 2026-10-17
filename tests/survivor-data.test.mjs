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

test('all enemies match 01-gdd §9 table: hp/moveSpeed/damage/xp/radius/kbRes/firstSeen', () => {
  // 01 §9：生命/移速/接触伤害/经验/碰撞半径/击退抗性/首次出现
  const rows = {
    gnat: [8, 110, 5, 1, 10, 0, 0],
    beetle: [25, 70, 8, 2, 16, 0.3, 60],
    moth: [18, 130, 6, 2, 14, 0, 120],
    snail: [80, 35, 12, 5, 22, 0.8, 180],
    sporeling: [40, 60, 6, 4, 16, 0.2, 240],
    elite_beetle: [1500, 80, 15, 50, 28, 0.9, 300],
  }
  const fields = ['hp', 'moveSpeed', 'contactDamage', 'xp', 'radius', 'knockbackResist', 'firstSeenSec']
  for (const [id, row] of Object.entries(rows)) {
    assert.ok(ENEMIES[id], `${id} 存在`)
    fields.forEach((f, j) => assert.equal(ENEMIES[id][f], row[j], `${id}.${f}`))
  }
})

test('enemy behaviour parameters match 01-gdd §9', () => {
  assert.equal(ENEMIES.gnat.behavior, 'chase')
  assert.equal(ENEMIES.beetle.behavior, 'chase')
  assert.equal(ENEMIES.snail.behavior, 'chase')
  assert.equal(ENEMIES.moth.behavior, 'sway')
  assert.equal(ENEMIES.moth.swayAmplitude, 40)
  assert.equal(ENEMIES.moth.swayPeriod, 1.2)
  const s = ENEMIES.sporeling
  assert.equal(s.behavior, 'ranged')
  assert.equal(s.approachRange, 180)
  assert.equal(s.fireRange, 250)
  assert.equal(s.fireInterval, 3)
  assert.equal(s.bubble.speed, 150)
  assert.equal(s.bubble.damage, 6)
  assert.equal(s.bubble.life, 3)
  const e = ENEMIES.elite_beetle
  assert.deepEqual([e.chargeEvery, e.chargeWindup, e.chargeDuration, e.chargeSpeedMul], [5, 0.8, 1, 2.5])
})

test('enemies carry the §9.1 growth coefficients (Boss is fixed)', () => {
  for (const id of Object.keys(ENEMIES)) {
    const boss = id === 'boss_mist_snail'
    assert.equal(ENEMIES[id].hpGrowthPerMin, boss ? 0 : 0.15, `${id} hpGrowthPerMin`)
    assert.equal(ENEMIES[id].damageGrowthPerMin, boss ? 0 : 0.05, `${id} damageGrowthPerMin`)
  }
})

test('boss_mist_snail matches 01-gdd §9.2 stats and skills', () => {
  const b = ENEMIES.boss_mist_snail
  assert.deepEqual(
    [b.hp, b.moveSpeed, b.contactDamage, b.radius, b.knockbackResist, b.xp, b.behavior],
    [10000, 45, 20, 56, 1, 0, 'boss'],
  )
  assert.deepEqual([b.summon.every, b.summon.enemy, b.summon.count], [8, 'gnat', 12])
  assert.deepEqual([b.charge.every, b.charge.windup, b.charge.duration, b.charge.speedMul], [6, 0.8, 1, 2.5])
  assert.deepEqual([b.bubbleRing.every, b.bubbleRing.hpBelow, b.bubbleRing.count], [10, 0.5, 8])
  assert.deepEqual({ ...b.bubbleRing.bubble }, { speed: 120, damage: 10, life: 4, radius: 12 })
  assert.deepEqual([b.enrage.atSec, b.enrage.speedMul, b.enrage.damageMul], [600, 1.3, 1.5])
  assert.deepEqual({ ...WAVES.boss }, { enemy: 'boss_mist_snail', atSec: 420, warningSec: 2 })
})

test('extraction follows 01-gdd §9.3', () => {
  assert.deepEqual({ ...WAVES.extraction }, { cleansingSec: 1.5, distance: 250, radius: 50, holdSec: 2, healPerSec: 5 })
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

test('only the last wave segment is open-ended (08 K2: 7:00–Boss 击败, toSec null)', () => {
  const segs = WAVES.segments
  assert.equal(segs[segs.length - 1].toSec, null)
  for (let i = 0; i < segs.length - 1; i += 1) assert.ok(Number.isFinite(segs[i].toSec), `段 ${i} 有限`)
})

test('wave segments follow 01-gdd §10 from 0:00 to Boss 击败', () => {
  // [from, to, rate, cap, gnat, beetle, moth, snail, sporeling]
  const rows = [
    [0, 60, 1.0, 30, 100, 0, 0, 0, 0],
    [60, 120, 1.6, 50, 70, 30, 0, 0, 0],
    [120, 180, 2.2, 80, 50, 30, 20, 0, 0],
    [180, 240, 2.8, 110, 40, 30, 20, 10, 0],
    [240, 300, 3.4, 140, 35, 25, 20, 10, 10],
    [300, 360, 4.0, 160, 30, 25, 20, 15, 10],
    [360, 420, 4.8, 200, 30, 20, 20, 15, 15],
    [420, null, 1.5, 80, 60, 0, 40, 0, 0],
  ]
  const ids = ['gnat', 'beetle', 'moth', 'snail', 'sporeling']
  assert.equal(WAVES.segments.length, rows.length)
  rows.forEach((row, i) => {
    const seg = WAVES.segments[i]
    assert.deepEqual([seg.fromSec, seg.toSec, seg.spawnRate, seg.cap], row.slice(0, 4), `段 ${i}`)
    ids.forEach((id, j) => assert.equal(seg.composition[id] || 0, row[4 + j], `段 ${i} ${id}`))
  })
})

test('each enemy first appears in the wave whose fromSec equals its firstSeenSec', () => {
  for (const id of ['gnat', 'beetle', 'moth', 'snail', 'sporeling']) {
    const first = WAVES.segments.find((seg) => (seg.composition[id] || 0) > 0)
    assert.ok(first, `${id} 出现在波次中`)
    assert.equal(first.fromSec, ENEMIES[id].firstSeenSec, `${id} 首次出现时间`)
  }
})

test('wave events follow 01-gdd §10 and reference known enemies', () => {
  const events = WAVES.events
  assert.ok(Array.isArray(events))
  for (let i = 1; i < events.length; i += 1) assert.ok(events[i].atSec >= events[i - 1].atSec, '按时间升序')
  for (const ev of events) assert.ok(ENEMIES[ev.enemy], `事件引用的敌人 ${ev.enemy} 存在`)
  const ring = events.find((e) => e.atSec === 150)
  assert.deepEqual({ ...ring }, { atSec: 150, type: 'ring', enemy: 'gnat', count: 24, radius: 350 })
  assert.ok(!ring.optional, '2:30 包围圈必做')
  const cross = events.find((e) => e.atSec === 270)
  assert.equal(cross.type, 'cross')
  assert.equal(cross.enemy, 'moth')
  assert.equal(cross.count, 16)
  const wall = events.find((e) => e.atSec === 390)
  assert.deepEqual([wall.type, wall.enemy, wall.count, wall.radius], ['ring', 'snail', 20, 400])
  const elite = events.find((e) => e.atSec === 300)
  assert.equal(elite.enemy, 'elite_beetle')
  assert.equal(elite.optional, true, '精英未实现，保持 optional')
})

test('waves.winAtSeconds is removed: timed victory is a debug option only (08 K1)', () => {
  assert.equal('winAtSeconds' in WAVES, false)
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
