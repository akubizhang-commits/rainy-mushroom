import test from 'node:test'
import assert from 'node:assert/strict'

import { PLAYER } from '../js/survivor/data/player.js'
import { WEAPONS } from '../js/survivor/data/weapons.js'
import { PASSIVES } from '../js/survivor/data/passives.js'
import { ENEMIES } from '../js/survivor/data/enemies.js'
import { WAVES } from '../js/survivor/data/waves.js'
import { LIMITS } from '../js/survivor/data/limits.js'
import { STRINGS } from '../js/survivor/data/strings.js'
import { PICKUPS } from '../js/survivor/data/pickups.js'
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
    { name: '孢子风暴', damage: 22, cooldown: 0.6, count: 5, pierce: 3, speed: 480, knockback: 15, life: 1.2, multiTarget: true },
  )
  assert.deepEqual([WEAPONS.spore_shot.evolvesWith, WEAPONS.spore_shot.evolution], ['cooldown', 'spore_storm'])
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
  // 进化：菌伞华盖（01 §6.2），宽檐菌帽解锁
  assert.deepEqual({ ...w.evolved }, { name: '菌伞华盖', damage: 24, count: 6, orbitRadius: 110, angularSpeedDeg: 240, hitInterval: 0.4, knockback: 40 })
  assert.equal(w.evolvesWith, 'area')
})

test('dew_ring five levels match the 01-gdd §6.3 table', () => {
  // 伤害/半径/伤害间隔/圈内减速
  const rows = [
    // 08 K17（2026-09-11 第二轮）：半径 60/75/75/90/90 → 80/95/95/115/115
    [4, 80, 0.8, 0.15],
    [4, 95, 0.8, 0.15],
    [7, 95, 0.8, 0.15],
    [7, 115, 0.8, 0.25],
    [10, 115, 0.6, 0.25],
  ]
  const fields = ['damage', 'radius', 'interval', 'slow']
  const w = WEAPONS.dew_ring
  assert.equal(w.levels.length, 5)
  rows.forEach((row, i) => fields.forEach((f, j) => assert.equal(w.levels[i][f], row[j], `Lv${i + 1} ${f}`)))
  // 进化：晨露结界（01 §6.3），露水叶片解锁
  assert.deepEqual({ ...w.evolved }, { name: '晨露结界', damage: 16, radius: 145, interval: 0.5, slow: 0.4 })
  assert.equal(w.evolvesWith, 'regen')
})
test('raindrop five levels match the 01-gdd §6.4 table (08 K8)', () => {
  // 伤害/落点数/落点半径/冷却/击退
  const rows = [
    [22, 2, 45, 2.2, 15],
    [22, 3, 45, 2.2, 15],
    [32, 3, 45, 2.2, 15],
    [32, 3, 60, 2.2, 15],
    [32, 5, 60, 1.8, 15],
  ]
  const fields = ['damage', 'count', 'radius', 'cooldown', 'knockback']
  const w = WEAPONS.raindrop
  assert.equal(w.levels.length, 5)
  rows.forEach((row, i) => fields.forEach((f, j) => assert.equal(w.levels[i][f], row[j], `Lv${i + 1} ${f}`)))
  // 01 §6.4 文字规则：400 范围选敌、阴影 0.4 秒、无敌人时 150–300 随机落点
  assert.deepEqual([w.range, w.warnSec, w.fallbackMin, w.fallbackMax], [400, 0.4, 150, 300])
  // 进化：骤雨（01 §6.4），晨光菌丝解锁
  assert.deepEqual({ ...w.evolved }, { name: '骤雨', damage: 45, count: 8, radius: 70, cooldown: 1.4, knockback: 20 })
  assert.equal(w.evolvesWith, 'might')
  assert.equal(w.placeholder, undefined)
  assert.ok(Math.max(...w.levels.map((l) => l.count), w.evolved.count) <= LIMITS.pools.raindropZones)
})

test('leaf_boomerang five levels match the 01-gdd §6.5 table (08 K8)', () => {
  // 伤害/片数/最远距离/飞行速度/冷却/击退
  const rows = [
    // 08 K17（2026-09-11 第二轮）：最远距离 220/220/220/280/280 → 280/280/280/340/340
    [12, 1, 280, 360, 1.6, 25],
    [18, 1, 280, 360, 1.6, 25],
    [18, 2, 280, 360, 1.6, 25],
    [18, 2, 340, 420, 1.6, 25],
    [24, 3, 340, 420, 1.6, 30],
  ]
  const fields = ['damage', 'count', 'maxDistance', 'speed', 'cooldown', 'knockback']
  const w = WEAPONS.leaf_boomerang
  assert.equal(w.levels.length, 5)
  rows.forEach((row, i) => fields.forEach((f, j) => assert.equal(w.levels[i][f], row[j], `Lv${i + 1} ${f}`)))
  assert.equal(w.spreadDeg, 25, '多片 25° 扇形')
  // 进化：秋风叶舞（01 §6.5），蕨叶轻靴解锁；6 片 60° 间隔向四周（radial）
  assert.deepEqual({ ...w.evolved }, { name: '秋风叶舞', damage: 36, count: 6, maxDistance: 360, speed: 420, cooldown: 1.4, knockback: 35, radial: true })
  assert.equal(w.evolvesWith, 'speed')
  assert.equal(w.placeholder, undefined)
})

test('all five weapons are drafted content with unique hitAt indices 0–4', () => {
  assert.deepEqual(Object.keys(WEAPONS), ['spore_shot', 'umbrella_blades', 'dew_ring', 'raindrop', 'leaf_boomerang'])
  for (const w of Object.values(WEAPONS)) assert.equal(w.levels.length, 5)
  const indices = Object.values(WEAPONS).map((w) => w.index).sort()
  assert.deepEqual(indices, [0, 1, 2, 3, 4])
  assert.equal(LIMITS.pools.raindropZones, 16)
  assert.equal(PLAYER.weaponSlots, 4, '5 选 4：武器栏 4 格不变')
})

test('player pickupRadius follows 01 §5 (08 K10: 60 → 100, K18: 100 → 140)', () => {
  assert.equal(PLAYER.pickupRadius, 140)
})

test('new weapon cards have names and descriptions in strings (card_<id>)', () => {
  for (const id of ['raindrop', 'leaf_boomerang']) {
    assert.equal(STRINGS[`card_${id}`], WEAPONS[id].name)
    assert.ok(STRINGS[`card_${id}_desc`].length > 0)
  }
})

test('passives match 01-gdd §7: per-level effect and Lv5 total, all six in table order (S3 B1)', () => {
  const expected = { might: [0.1, 'might'], cooldown: [0.08, 'cooldown'], area: [0.1, 'area'], regen: [0.4, 'regen'], speed: [0.08, 'moveSpeed'], magnet: [0.2, 'pickup'] }
  assert.deepEqual(Object.keys(PASSIVES), Object.keys(expected))
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
  assert.equal(PASSIVES.regen.levels[4], 2.0, '露水叶片 Lv5 +2.0/秒')
  assert.equal(PASSIVES.magnet.levels[4], 1.0, '孢子罗盘 Lv5 +100%')
  assert.equal(PASSIVES.regen.name, '露水叶片')
  assert.equal(PASSIVES.magnet.name, '孢子罗盘')
})
test('every weapon evolves with an existing passive; 孢子罗盘 unlocks nothing (01 §7)', () => {
  const pairs = Object.fromEntries(Object.entries(WEAPONS).map(([id, w]) => [id, w.evolvesWith]))
  assert.deepEqual(pairs, { spore_shot: 'cooldown', umbrella_blades: 'area', dew_ring: 'regen', raindrop: 'might', leaf_boomerang: 'speed' })
  for (const w of Object.values(WEAPONS)) {
    assert.ok(PASSIVES[w.evolvesWith])
    assert.ok(w.evolved && typeof w.evolved.name === 'string')
  }
  assert.ok(!Object.values(pairs).includes('magnet'))
})
test('evolution / passive / elite strings exist (card_evolve_<id>, card_regen, card_magnet)', () => {
  for (const [id, w] of Object.entries(WEAPONS)) {
    assert.equal(STRINGS[`card_evolve_${id}`], w.evolved.name, `card_evolve_${id}`)
    assert.ok(STRINGS[`card_evolve_${id}_desc`].length > 0)
  }
  for (const id of ['regen', 'magnet']) {
    assert.equal(STRINGS[`card_${id}`], PASSIVES[id].name)
    assert.ok(STRINGS[`card_${id}_desc`].length > 0)
  }
  for (const k of ['cardEvolve', 'slotEvolved', 'eliteWarning', 'bannerWind']) assert.ok(STRINGS[k].length > 0, k)
})
test('pickups follow 01-gdd §11 (S3 B3)', () => {
  assert.deepEqual([PICKUPS.dew.heal, PICKUPS.dew.chance, PICKUPS.dew.cap, PICKUPS.dew.lifeSec], [20, 0.008, 3, 30])
  assert.deepEqual([PICKUPS.bigDew.heal, PICKUPS.bigDew.cap], [50, null])
  assert.deepEqual([PICKUPS.wind.chance, PICKUPS.wind.cap, PICKUPS.wind.lifeSec], [0.0015, 1, 30])
  assert.deepEqual([...PICKUPS.eliteDrops], ['bigDew', 'wind'])
  assert.equal(LIMITS.pools.pickups, 5)
  assert.equal(LIMITS.hardCaps.pickups, 5)
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
  assert.equal(s.fireInterval, 2) // 08 K21：3 → 2
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
    [4500, 45, 20, 56, 1, 0, 'boss'], // 08 K7：10000 → 4500
  )
  assert.deepEqual([b.summon.every, b.summon.enemy, b.summon.count], [8, 'gnat', 12])
  assert.deepEqual([b.charge.every, b.charge.windup, b.charge.duration, b.charge.speedMul], [6, 0.8, 1, 2.5])
  assert.deepEqual([b.bubbleRing.every, b.bubbleRing.hpBelow, b.bubbleRing.count], [10, 0.5, 8])
  assert.deepEqual({ ...b.bubbleRing.bubble }, { speed: 120, damage: 10, life: 4, radius: 12 })
  // 08 K13 / 01 §9.2 超时兜底：阶段数组 + 雾壳剥落。
  assert.deepEqual(b.enrage.map((p) => ({ ...p })), [
    { atSec: 600, speedMul: 1.3, damageMul: 1.5 },
    { atSec: 660, speedMul: 1.6, damageMul: 2.0, cooldownMul: 0.5, ringIgnoresHp: true, takenMul: 1.5 },
  ])
  assert.deepEqual({ ...b.erosion }, { fromSec: 720, everySec: 60, takenStep: 0.5, takenMax: 4.0 })
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

test('enemy projectile (mist bubble) caps are 60 in hardCaps / pools / nodes (S3-D1, BUG-S2-01)', () => {
  // 01 §10 全局上限“敌方弹体 60”；03 §7.3 池容量、§6.2 渲染节点池同为 60
  assert.equal(LIMITS.hardCaps.enemyProjectiles, 60)
  assert.equal(LIMITS.pools.mistBubbles, 60)
  assert.equal(LIMITS.nodes.mistBubbles, 60)
  assert.ok(LIMITS.nodes.mistBubbles <= LIMITS.pools.mistBubbles, '渲染节点 ≤ 逻辑池')
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
    [0, 60, 1.3, 30, 100, 0, 0, 0, 0], // 08 K9：1.0 → 1.3
    [60, 120, 1.6, 50, 70, 30, 0, 0, 0],
    [120, 180, 2.53, 80, 50, 30, 20, 0, 0], // 08 K16：2.2 → 2.53（+15%），上限不变
    [180, 240, 3.22, 110, 40, 30, 20, 10, 0], // 08 K16：2.8 → 3.22（+15%），上限不变
    [240, 300, 3.4, 140, 25, 25, 20, 10, 20], // 08 K21：菌灵 10 → 20、蚊蚋 35 → 25
    [300, 360, 4.0, 160, 20, 25, 20, 15, 20], // 08 K21：菌灵 10 → 20、蚊蚋 30 → 20
    [360, 420, 4.8, 160, 20, 20, 20, 15, 25], // 08 K19：上限 200 → 160；08 K21：菌灵 15 → 25、蚊蚋 30 → 20
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
  assert.equal(ring.gap, undefined, '2:30 包围圈不带缺口')
  const wall = events.find((e) => e.atSec === 390)
  // 08 K12：14 只、半径 400，16 槽跳过 k = 0/15，以朝向为锚。
  assert.deepEqual([wall.type, wall.enemy, wall.count, wall.radius], ['ring', 'snail', 14, 400])
  assert.deepEqual({ ...wall.gap, skip: [...wall.gap.skip] }, { slots: 16, skip: [0, 15], anchor: 'facing' })
  const elite = events.find((e) => e.atSec === 300)
  assert.deepEqual({ ...elite }, { atSec: 300, type: 'elite', enemy: 'elite_beetle', count: 1 }, 'S3 B4：5:00 精英必做')
  assert.ok(events.every((e) => !e.optional), '没有可选事件')
})

test('waves.winAtSeconds is removed: timed victory is a debug option only (08 K1)', () => {
  assert.equal('winAtSeconds' in WAVES, false)
})

test('all data modules survive a JSON round-trip', () => {
  for (const mod of [PLAYER, WEAPONS, PASSIVES, ENEMIES, WAVES, LIMITS, STRINGS, PICKUPS]) {
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
  for (const mod of [PLAYER, WEAPONS, PASSIVES, ENEMIES, WAVES, LIMITS, STRINGS, PICKUPS]) {
    assert.ok(Object.isFrozen(mod))
  }
})
