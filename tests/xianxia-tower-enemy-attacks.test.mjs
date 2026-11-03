import test from 'node:test'
import assert from 'node:assert/strict'
import { ARCHETYPES, FLOOR01 } from '../js/xianxia/TowerContent.js'
import { enemyAttackSpec, enemyCombatStyle } from '../js/xianxia/TowerEnemyAttacks.js'

// Real authored damage/role/body sizes; no Run instance or spawn/loot mutation.
function enemy(id) {
  const a = ARCHETYPES.find(item => item.id === id)
  const family = id.split('_')[0]
  const radius = FLOOR01.enemies[id]?.body_radius
    ?? (a.role === 'boss' ? 42 : a.role === 'elite' ? 34
      : { bear: 32, crocodile: 30, ape: 28, tiger: 28, bat: 18, falcon: 20 }[family] ?? 24)
  return { family, role: a.role, radius, damage: a.damage }
}

for (const [role, cooldown] of [['normal', 5], ['elite', 4.5], ['boss', 4]]) {
  test(`boar ${role}: charge waits for its exact cooldown and can bite independently`, () => {
    const e = enemy(`boar_${role}`)
    const ready = enemyAttackSpec(e, 240, 10, {})
    assert.ok(ready, 'a ready boar at 240 must charge')
    assert.equal(ready.kind, 'charge')
    assert.equal(ready.cooldown, cooldown)
    assert.ok(ready.windup >= .85)
    assert.equal(ready.range, 270)
    assert.equal(ready.speed, 460, 'shorter dash keeps its speed')
    assert.equal(ready.active, .6)
    assert.ok(ready.active * ready.speed >= ready.range, 'the active dash must reach its selection boundary')
    const cooldowns = { charge: 10 + cooldown }
    assert.equal(enemyAttackSpec(e, 240, 10 + cooldown - .000001, cooldowns), null)
    assert.equal(enemyAttackSpec(e, 240, 10 + cooldown, cooldowns)?.kind, 'charge')
    assert.equal(enemyAttackSpec(e, 240, 10 + cooldown + .000001, cooldowns)?.kind, 'charge')
    assert.equal(enemyAttackSpec(e, 60, 10, cooldowns)?.kind, 'bite')
    assert.equal(enemyAttackSpec(e, 60, 10, { ...cooldowns, bite: 11 }), null)
    assert.equal(enemyAttackSpec(e, 60, 11, { ...cooldowns, bite: 11 })?.kind, 'bite')
    // A bite's cooldown must not reset or prevent a ready charge.
    assert.equal(enemyAttackSpec(e, 240, 10, { bite: 11 })?.kind, 'charge')
  })
}

test('normal boar charges at 130 and 270, approaches through the gap and outside range', () => {
  const e = enemy('boar_normal')
  for (const d of [130, 270]) assert.equal(enemyAttackSpec(e, d, 0)?.kind, 'charge')
  for (const d of [98.001, 129.999, 270.001, 360, 480]) {
    assert.equal(enemyAttackSpec(e, d, 0), null, `distance ${d}`)
  }
  assert.equal(enemyAttackSpec(e, 98, 0)?.kind, 'bite')
  assert.equal(enemyAttackSpec(e, 130, 0, { charge: 5 }), null, 'cooling charge must permit approach')
})

for (const [id, kind, shape, range, angle] of [
  ['wolf_normal', 'bite', 'sector', 104, 110],
  ['wolf_elite', 'bite', 'sector', 124, 120],
  ['wolf_boss', 'bite', 'sector', 150, 130],
  ['bear_normal', 'slam', 'circle', 127, 0],
  ['bear_elite', 'slam', 'circle', 142, 0],
  ['bear_boss', 'slam', 'circle', 164, 0],
  ['tiger_normal', 'sweep', 'sector', 123, 140],
  ['tiger_elite', 'sweep', 'sector', 142, 155],
  ['tiger_boss', 'sweep', 'sector', 164, 170],
  ['crocodile_normal', 'sweep', 'sector', 125, 160],
  ['crocodile_elite', 'sweep', 'sector', 142, 175],
  ['crocodile_boss', 'sweep', 'sector', 164, 190],
  ['ape_normal', 'slam', 'circle', 123, 0],
  ['ape_elite', 'slam', 'circle', 142, 0],
  ['ape_boss', 'slam', 'circle', 164, 0],
  ['centipede_normal', 'sweep', 'sector', 102, 130],
  ['centipede_elite', 'sweep', 'sector', 124, 145],
  ['centipede_boss', 'sweep', 'sector', 146, 160],
]) {
  test(`${id}: final range is selectable beyond the old bite gate, with a strict outer boundary`, () => {
    const e = enemy(id)
    const spec = enemyAttackSpec(e, range + 18, 20)
    assert.ok(spec, `${id} must reach a player disk touching its final attack range`)
    assert.equal(spec.kind, kind)
    assert.equal(spec.shape, shape)
    assert.equal(spec.range, range)
    assert.equal(spec.radius, range)
    assert.equal(spec.angle, angle)
    assert.equal(spec.damage, e.damage)
    assert.equal(enemyAttackSpec(e, range + 18.000001, 20), null)
    assert.equal(enemyAttackSpec(e, range + 18, 20, { [kind]: 20.000001 }), null)
    assert.equal(enemyAttackSpec(e, range + 18, 20, { [kind]: 20 })?.kind, kind)
    assert.equal(enemyAttackSpec(e, 300, 20), null, 'melee families cannot silently become chargers')
  })
}

for (const [family, element] of [
  ['snake', 'poison'], ['scorpion', 'poison'], ['falcon', 'feather'], ['bat', 'sonic'],
]) {
  for (const role of ['normal', 'elite', 'boss']) {
    test(`${family} ${role}: shoots from its preferred band and uses a shot cooldown`, () => {
      const e = enemy(`${family}_${role}`)
      assert.deepEqual(enemyCombatStyle(e), { ranged: true, preferredMin: 180, preferredMax: 300 })
      for (const d of [0, 60, 179.999, 180, 240, 300, 480]) {
        const spec = enemyAttackSpec(e, d, 12)
        assert.equal(spec?.kind, 'shot', `distance ${d}`)
        assert.equal(spec.element, element)
        assert.equal(spec.shape, 'capsule')
        assert.equal(spec.damage, e.damage)
        assert.ok(!('dot' in spec) && !('poisonDuration' in spec), 'element is not ongoing poison damage')
      }
      assert.equal(enemyAttackSpec(e, 480.000001, 12), null)
      assert.equal(enemyAttackSpec(e, 240, 12, { shot: 12.000001 }), null)
      assert.equal(enemyAttackSpec(e, 240, 12, { shot: 12 })?.kind, 'shot')
      // The preferred band survives a cooldown: a caller can keep spacing
      // instead of interpreting null as "walk into the player".
      assert.deepEqual(enemyCombatStyle(e), { ranged: true, preferredMin: 180, preferredMax: 300 })
    })
  }
}

test('spiders separate normal bite from elite/boss web ground control', () => {
  const normal = enemy('spider_normal')
  assert.equal(enemyAttackSpec(normal, 96, 0)?.kind, 'bite')
  assert.equal(enemyAttackSpec(normal, 96.001, 0), null)
  assert.equal(enemyAttackSpec(normal, 240, 0), null)
  assert.equal(enemyCombatStyle(normal).ranged, false)
  for (const [role, radius] of [['elite', 90], ['boss', 110]]) {
    const e = enemy(`spider_${role}`)
    const spec = enemyAttackSpec(e, 240, 0)
    assert.equal(spec?.kind, 'web')
    assert.equal(spec.shape, 'circle')
    assert.equal(spec.radius, radius)
    assert.equal(spec.damage, e.damage)
    assert.equal(enemyAttackSpec(e, 480, 0)?.kind, 'web')
    assert.equal(enemyAttackSpec(e, 480.001, 0), null)
    assert.equal(enemyAttackSpec(e, 240, 0, { web: 1 }), null)
    assert.equal(enemyCombatStyle(e).ranged, true)
  }
})

test('unknown families and roles conservatively keep a cooldown-limited close bite', () => {
  for (const family of ['unknown', 'constructor', '__proto__', '', undefined]) {
    const e = { family, role: 'normal', radius: 24, damage: 7.25 }
    const spec = enemyAttackSpec(e, 96, 4)
    assert.equal(spec?.kind, 'bite')
    assert.equal(spec.damage, 7.25)
    assert.equal(enemyAttackSpec(e, 96.001, 4), null)
    assert.equal(enemyAttackSpec(e, 200, 4), null)
    assert.equal(enemyAttackSpec(e, 60, 4, { bite: 5 }), null)
    assert.deepEqual(enemyCombatStyle(e), { ranged: false, preferredMin: 0, preferredMax: 0 })
  }
  const e = { family: 'spider', role: 'legendary', radius: 24, damage: 8 }
  assert.equal(enemyAttackSpec(e, 60, 0)?.kind, 'bite')
  assert.equal(enemyAttackSpec(e, 240, 0), null)
  assert.equal(enemyCombatStyle(e).ranged, false)
})

test('every authored archetype yields serializable old-spec fields without modifying its source', () => {
  const kinds = ['bite', 'charge', 'shot', 'web', 'slam', 'sweep']
  const numeric = ['damage', 'windup', 'active', 'recovery', 'cooldown', 'range',
    'radius', 'width', 'angle', 'lock', 'speed', 'cost', 'segments']
  for (const a of ARCHETYPES) {
    const e = Object.freeze(enemy(a.id))
    const cooldowns = Object.freeze({})
    const before = JSON.stringify({ e, cooldowns })
    const d = enemyCombatStyle(e).ranged ? 240 : 60
    const spec = enemyAttackSpec(e, d, 10, cooldowns)
    assert.ok(spec, a.id)
    assert.ok(kinds.includes(spec.kind), a.id)
    assert.ok(['circle', 'sector', 'capsule'].includes(spec.shape), a.id)
    for (const key of numeric) {
      assert.ok(Number.isFinite(spec[key]) && spec[key] >= 0, `${a.id}.${key}`)
    }
    assert.equal(spec.damage, a.damage, a.id)
    assert.equal(spec.cost, a.role === 'normal' ? 1 : 2, a.id)
    assert.equal(spec.segments, 1, 'authored floor-one combos stay outside the module')
    assert.ok(spec.lock <= spec.windup, a.id)
    assert.deepEqual(JSON.parse(JSON.stringify(spec)), spec)
    assert.equal(JSON.stringify({ e, cooldowns }), before)
    spec.range = 9999
    assert.notEqual(enemyAttackSpec(e, d, 10, cooldowns).range, 9999, 'results must not share mutable data')
  }
})

test('invalid numeric inputs cannot request attacks or bypass an invalid cooldown', () => {
  const e = enemy('wolf_normal')
  for (const d of [-1, NaN, Infinity, undefined, '60']) {
    assert.equal(enemyAttackSpec(e, d, 0), null)
  }
  for (const time of [-1, NaN, Infinity, '0']) assert.equal(enemyAttackSpec(e, 60, time), null)
  for (const patch of [{ radius: NaN }, { radius: -1 }, { damage: Infinity }, { damage: -1 }]) {
    assert.equal(enemyAttackSpec({ ...e, ...patch }, 60, 0), null)
  }
  assert.equal(enemyAttackSpec(null, 60, 0), null)
  for (const bite of [NaN, Infinity, -1, '0']) {
    assert.equal(enemyAttackSpec(e, 60, 0, { bite }), null)
  }
})
