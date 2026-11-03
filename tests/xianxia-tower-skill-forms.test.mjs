import test from 'node:test'
import assert from 'node:assert/strict'
import { TowerRun, validateTowerSnapshot } from '../js/xianxia/TowerRun.js'
import { GROWTH_SKILLS } from '../js/xianxia/TowerGrowth.js'
import { skillForm, orbitSwordPose } from '../js/xianxia/TowerSkillForms.js'

const STEP = 1 / 60
const coefficient = (id, rank) => GROWTH_SKILLS.find(s => s.id === id).damage[rank - 1]
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`)
function make(id, level, evolution = null, evolutionLevel = 1) {
  const run = new TowerRun({ attemptId: 11, floor: 9, seed: 123, xp: 0, hp: 100,
    loadout: { growthVersion: 1, active: { sj_yujian: 1, [id]: level }, passive: {},
      evolutions: evolution ? [evolution] : [], evolutionLevels: evolution ? { [evolution]: evolutionLevel } : {},
      tutorialWaves: 0, weaponId: 'eq_sword_suwen', weaponQuality: 1, weaponRefine: 0 } })
  for (const key of Object.keys(run.state.cooldowns)) run.state.cooldowns[key] = 99999
  for (let i = 0; i < 300 && !run.state.enemies.length; i++) run.advance(STEP)
  const enemy = run.state.enemies[0]
  Object.assign(enemy, { x: run.state.player.x + 100, y: run.state.player.y, radius: 5,
    hp: 1e6, maxHp: 1e6, moveSpeed: 0 })
  enemy.ai.graceUntil = 99999
  run.state.enemies = [enemy]
  run.state.pending = []; run.state.reserved = []
  run.state.casts = []; run.state.projectiles = []; run.state.zones = []; run.state.effects = []
  if (id === 'sj_wanjian') run.state.cooldowns.sj_wanjian = 0
  return { run, enemy }
}
function sample(run, seconds, action) {
  const hits = [], seen = new Set()
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    action?.(i)
    run.advance(STEP)
    for (const e of run.state.effects) if (e.kind === 'hit' && !seen.has(e.id)) {
      seen.add(e.id); hits.push({ ...e, at: run.state.time })
    }
  }
  return hits
}
function start(run, id) { run.state.cooldowns[id] = 0; run.advance(STEP); run.state.cooldowns[id] = 99999 }

test('orbit expires after four seconds and restarts six seconds after activation', () => {
  const { run, enemy } = make('sj_wanjian', 1)
  enemy.radius = 22
  run.state.cooldowns.sj_wanjian = 0
  run.advance(STEP)
  const started = run.state.time
  const activation = run.state.casts[0].releaseAt
  assert.equal(run.state.orbitUntil, undefined, 'no orbit before its cast releases')
  close(run.state.cooldowns.sj_wanjian, started + 6)
  sample(run, .2)
  close(run.state.orbitUntil, activation + 4)
  const hits = sample(run, 6.8)
  assert.ok(hits.some(hit => hit.at < activation + 4))
  assert.ok(!hits.some(hit => hit.at >= activation + 4 + 1e-8 && hit.at < activation + 6 - 1e-8))
  assert.ok(hits.some(hit => hit.at >= activation + 6))
  for (const hit of hits) close(hit.damage, run.state.player.attack * coefficient('sj_wanjian', 1) * 10 / 7)
})

test('orbit timing survives pause and snapshot restore without granting a fresh activation', () => {
  const run = new TowerRun({ attemptId: 11, floor: 1, seed: 123, xp: 0, hp: 100,
    loadout: { growthVersion: 1, active: { sj_wanjian: 1 }, passive: {},
      evolutions: [], evolutionLevels: {}, tutorialWaves: 0,
      weaponId: 'eq_sword_suwen', weaponQuality: 1, weaponRefine: 0 } })
  run.advance(STEP)
  sample(run, 1)
  run.pause()
  const saved = run.snapshot()
  assert.equal(validateTowerSnapshot(saved), true)
  run.advance(2)
  assert.deepEqual(run.snapshot(), saved)
  const restored = TowerRun.restore(saved)
  close(restored.state.orbitUntil, saved.orbitUntil)
  close(restored.state.cooldowns.sj_wanjian, saved.cooldowns.sj_wanjian)
  for (const value of [-1, NaN, Infinity, saved.time + 5]) {
    const bad = structuredClone(saved); bad.orbitUntil = value
    assert.equal(validateTowerSnapshot(bad), false)
  }
  restored.resume()
  sample(restored, 3.3)
  assert.ok(restored.state.time >= restored.state.orbitUntil)
  assert.ok(restored.state.time < restored.state.cooldowns.sj_wanjian)
})

const previousFormationRadii = [110, 110, 120, 120, 130, 140, 140, 150, 150, 160]
const formationRadii = [132, 132, 144, 144, 156, 168, 168, 180, 180, 192]

for (const [index, radius] of formationRadii.entries()) {
  const rank = index + 1, previousRadius = previousFormationRadii[index]
  test(`liangyi rank ${rank} damages its expanded circle with the extended cadence and original budget`, () => {
    const { run, enemy } = make('sj_formation', rank)
    start(run, 'sj_formation')
    sample(run, .5)
    const zone = run.state.zones.find(z => z.formId === 'sj_formation')
    assert.ok(zone)
    const probes = [
      ['new-band', previousRadius + enemy.radius + (radius - previousRadius) / 2, 0],
      ['edge-contact', radius + enemy.radius - 1, .5],
      ['outside', radius + enemy.radius + 1, -.5],
    ].map(([id, distance, angle]) => ({
      ...structuredClone(enemy), id,
      x: zone.x + Math.cos(angle) * distance, y: zone.y + Math.sin(angle) * distance,
    }))
    run.state.enemies.push(...probes)
    assert.deepEqual(run._targets(zone, previousRadius, 8).map(e => e.id), [enemy.id],
      'all three probes lie beyond the previous collision circle')
    const pulses = [], seen = new Set()
    const hits = sample(run, 6.4, () => {
      for (const effect of run.state.effects) {
        if (effect.kind === 'formation' && !seen.has(effect.id)) {
          seen.add(effect.id); pulses.push({ ...effect })
        }
      }
    })
    const count = rank === 10 ? 7 : 6
    assert.equal(zone.radius, radius, 'zone exposes the real expanded radius')
    assert.equal(pulses.length, count)
    assert.equal(hits.length, count * 3, 'each real target takes one hit per pulse')
    for (const hit of hits) {
      const target = run.state.enemies.find(e => e.id === hit.targetId)
      assert.ok(target, 'formation feedback retains the actual damaged target identity')
      assert.equal(hit.targetRadius, target.radius, 'feedback retains the collision radius')
      assert.equal(hit.x, target.x); assert.equal(hit.y, target.y)
      assert.ok(hit.damage > 0)
    }
    for (const [i, pulse] of pulses.entries()) {
      assert.equal(pulse.radius, radius, 'effect and collision use the same radius')
      assert.equal(pulse.pulseIndex, i + 1)
      assert.equal(pulse.pulseCount, count)
      assert.deepEqual(new Set(pulse.targetIds), new Set([enemy.id, 'new-band', 'edge-contact']))
      const due = zone.startedAt + .5 + i * 4.5 / (count - 1)
      close(pulse.startedAt, Math.ceil((due - 1e-8) * 60) / 60)
    }
    for (const target of [enemy, ...probes.slice(0, 2)]) {
      close(1e6 - target.hp, run.state.player.attack * coefficient('sj_formation', rank) * 6)
    }
    assert.equal(probes[2].hp, 1e6, 'the full collider beyond the new edge stays unharmed')
    assert.equal(skillForm('sj_formation', rank).reach, 360, 'placement reach is unchanged')
    assert.equal(skillForm('sj_formation', rank).targetCap, 8)
  })
}

test('sixiang range follows its own evolution rank instead of parent investment', () => {
  for (let parentRank = 1; parentRank <= 10; parentRank++) {
    for (const [rank, radius] of [[1, 288], [2, 336]]) {
      const form = skillForm('evo_sixiang', rank, parentRank)
      assert.equal(form.radius, radius)
      assert.equal(form.shape, 'diamond')
      assert.equal(form.hits, rank === 1 ? 7 : 9)
    }
  }
})

for (const [id, counts, seconds, total] of [
  ['sj_arc', [1, 1, 1, 3], 1, 1],
  ['sj_line', [1, 1, 2, 3], 1, 1],
  ['sj_shadow', [1, 2, 3, 4], 1.6, 1],
  ['sj_formation', [6, 6, 6, 7], 5.4, 6],
]) {
  for (const [i, rank] of [1, 3, 6, 10].entries()) {
    test(`${id} rank ${rank} produces ${counts[i]} distinct beats without multiplying the cast budget`, () => {
      const { run, enemy } = make(id, rank)
      start(run, id)
      const hits = sample(run, seconds)
      assert.equal(hits.length, counts[i])
      close(1e6 - enemy.hp, run.state.player.attack * coefficient(id, rank) * total)
      assert.equal(new Set(hits.map(h => h.at)).size, counts[i], 'beats are not simultaneous duplicate receipts')
      if (id === 'sj_shadow') {
        for (let beat = 1; beat < hits.length; beat++) {
          assert.ok(Math.abs(hits[beat].at - hits[beat - 1].at - .08) <= STEP,
            'shadow follow-up hits keep the accepted 80ms cadence within one simulation step')
        }
      }
    })
  }
}

test('line combo retains its first released ray when the caster moves between beats', () => {
  const { run, enemy } = make('sj_line', 10)
  start(run, 'sj_line')
  const hits = sample(run, 1, i => { if (i === 12) run.state.player.y += 100 })
  assert.equal(hits.length, 3)
  close(1e6 - enemy.hp, run.state.player.attack * coefficient('sj_line', 10))
})

test('arc volley keeps its facing but releases later blades at the current caster position', () => {
  const { run } = make('sj_arc', 7)
  start(run, 'sj_arc')
  const hits = sample(run, 1, i => { if (i === 16) run.state.player.y += 400 })
  assert.equal(hits.length, 1, 'moving away must move subsequent arc hitboxes away from the first target')
})

test('shadow slashes retain their ground mark after the target leaves it', () => {
  const { run, enemy } = make('sj_shadow', 10)
  start(run, 'sj_shadow')
  const hits = sample(run, 1.6, i => { if (i === 15) enemy.y += 300 })
  assert.equal(hits.length, 0)
})

test('orbit swords leave a real inner gap instead of damaging the whole disc', () => {
  const { run, enemy } = make('sj_wanjian', 1)
  enemy.x = run.state.player.x + 20
  assert.equal(sample(run, .55).length, 0)
  close(enemy.hp, 1e6)
})

test('orbit blades sweep the annulus while sharing one target interval', () => {
  const { run, enemy } = make('sj_wanjian', 10)
  enemy.x = run.state.player.x + 120
  const hits = sample(run, 1.6)
  assert.ok(hits.length >= 2, 'a stationary target on the ring is reached by rotating swords')
  for (let i = 1; i < hits.length; i++) assert.ok(hits[i].at - hits[i - 1].at >= .6 - STEP / 2)
  for (const hit of hits) close(hit.damage, run.state.player.attack * coefficient('sj_wanjian', 10) * 10 / 7)
})

test('each additional orbit sword tier expands both the ring and its outer reach', () => {
  const stages = [[1, 4], [3, 5], [6, 6], [10, 8]]
  let previous
  for (const [rank, count] of stages) {
    const form = skillForm('sj_wanjian', rank)
    const outer = form.radius + form.bladeLength / 2 + form.bladeWidth / 2
    assert.equal(form.swords, count)
    assert.equal(form.innerRadius, 67, 'upgrades preserve the basic skill’s close gap')
    if (previous) {
      assert.ok(form.radius > previous.radius, 'more swords orbit farther from the player')
      assert.ok(form.bladeLength > previous.bladeLength, 'the blade coverage also grows')
      assert.ok(outer > previous.outer, 'the actual outer attack boundary expands')
    }
    previous = { ...form, outer }
  }
})

test('wuwo fills the close gap without multiplying hits where the inner field meets orbit blades', () => {
  for (const distance of [20, 122]) {
    const { run, enemy } = make('sj_wanjian', 10, 'evo_wuwo', 2)
    enemy.x = run.state.player.x + distance
    const hits = sample(run, .59)
    assert.equal(hits.length, 1)
  }
})

for (const rank of [1, 2]) {
  test(`sixiang rank ${rank} damages the expanded diamond and its collider boundary without adding pulses`, () => {
    const { run, enemy } = make('sj_formation', 10, 'evo_sixiang', rank)
    start(run, 'sj_formation')
    sample(run, .5)
    const zone = run.state.zones.find(z => z.kind === 'formation')
    const radius = rank === 1 ? 288 : 336, count = rank === 1 ? 7 : 9, body = enemy.radius
    assert.equal(zone.shape, 'diamond')
    const edgeContact = radius / 2 + (body - 1) / Math.SQRT2
    const edgeClear = radius / 2 + (body + 1) / Math.SQRT2
    const probes = [
      ['new-band', 224, 0],
      ['rank2-band', 312, 0],
      ['edge-contact', edgeContact, edgeContact],
      ['edge-clear', edgeClear, edgeClear],
      ['vertex-contact', -radius - body + 1, 0],
      ['vertex-clear', -radius - body - 1, 0],
      ['circle-only', radius * .7, radius * .7],
    ].map(([id, x, y]) => ({ ...structuredClone(enemy), id, x: zone.x + x, y: zone.y + y }))
    run.state.enemies.push(...probes)
    assert.deepEqual(run._targets(zone, 160).map(e => e.id), [enemy.id],
      'every probe is outside the former broad-phase radius')
    const damaged = new Set([enemy.id, 'new-band', 'edge-contact', 'vertex-contact',
      ...(rank === 2 ? ['rank2-band'] : [])])
    const pulses = [], seen = new Set(), center = { x: zone.x, y: zone.y }
    const hits = sample(run, 6.4, i => {
      if (i === 12) run.state.player.x -= 50
      for (const effect of run.state.effects) if (effect.kind === 'formation' && !seen.has(effect.id)) {
        seen.add(effect.id); pulses.push({ ...effect })
      }
    })
    assert.equal(zone.radius, radius)
    assert.equal(pulses.length, count)
    assert.equal(hits.length, damaged.size * count, 'four eyes still share one hit per target and pulse')
    const ticks = Array.from({ length: count }, (_, i) => Math.ceil((.5 + i * 5.5 / (count - 1)) * 60 - 1e-8))
    for (const [i, pulse] of pulses.entries()) {
      assert.equal(pulse.radius, radius)
      assert.equal(pulse.shape, 'diamond')
      assert.equal(pulse.pulseIndex, i + 1); assert.equal(pulse.pulseCount, count)
      assert.equal(pulse.x, center.x); assert.equal(pulse.y, center.y)
      assert.deepEqual(new Set(pulse.targetIds), damaged)
      close(pulse.startedAt - zone.startedAt, ticks[i] / 60)
    }
    const budget = run.state.player.attack * coefficient('sj_formation', 10) * 9 * (rank === 1 ? 2.0 : 2.3)
    for (const target of [enemy, ...probes]) {
      close(1e6 - target.hp, damaged.has(target.id) ? budget : 0)
      assert.equal(hits.filter(h => h.targetId === target.id).length, damaged.has(target.id) ? count : 0)
    }
  })

  test(`sixiang rank ${rank} caps each expanded-area pulse at eight nearest targets`, () => {
    const { run, enemy } = make('sj_formation', 10, 'evo_sixiang', rank)
    start(run, 'sj_formation')
    sample(run, .5)
    const zone = run.state.zones.find(z => z.kind === 'formation')
    const added = Array.from({ length: 8 }, (_, i) => ({
      ...structuredClone(enemy), id: `expanded-${i}`, x: zone.x + 180 + i * 12, y: zone.y,
    }))
    run.state.enemies.push(...added)
    const hits = sample(run, 6.4), count = rank === 1 ? 7 : 9
    assert.equal(hits.length, 8 * count)
    assert.equal(added[7].hp, 1e6, 'the ninth nearest eligible target stays unharmed')
    const budget = run.state.player.attack * coefficient('sj_formation', 10) * 9 * (rank === 1 ? 2.0 : 2.3)
    for (const target of [enemy, ...added.slice(0, 7)]) {
      assert.equal(hits.filter(h => h.targetId === target.id).length, count)
      close(1e6 - target.hp, budget)
    }
  })

  test(`convergence rank ${rank} strikes ${rank === 1 ? 7 : 9} times and suspends ordinary yujian without catching up`, () => {
    const { run, enemy } = make('sj_yujian', 10, 'evo_wanjian', rank)
    run.state.cooldowns.sj_yujian = 0
    run.state.cooldowns.evo_wanjian = 0
    const hits = sample(run, 1.9, () => {
      assert.equal(run.state.projectiles.filter(p => !p.hostile).length, 0, 'no ordinary sword during the special')
    })
    assert.equal(hits.length, rank === 1 ? 7 : 9)
    close(1e6 - enemy.hp, run.state.player.attack * coefficient('sj_yujian', 10) * (((rank === 1 ? 1.30 : 1.69) - 1) * 8 + (rank === 1 ? 1.1 : 1.4)))
    assert.ok(run.state.cooldowns.sj_yujian > run.state.time)
  })
}

test('tiandi keeps one damage receipt while both ranks have genuinely wider and longer geometry', () => {
  let first
  for (const rank of [1, 2]) {
    const { run, enemy } = make('sj_line', 10, 'evo_tiandi', rank)
    start(run, 'sj_line')
    const hits = sample(run, .55)
    assert.equal(hits.length, 1)
    const e = run.state.effects.find(e => e.kind === 'tiandi')
    assert.ok(e.width > 28)
    assert.ok(e.reach > 510)
    if (first) { assert.ok(e.width > first.width); assert.ok(e.reach > first.reach) }
    first = e
    close(1e6 - enemy.hp, run.state.player.attack * coefficient('sj_line', 10) * 10 / 6 * (rank === 1 ? 1.40 : 1.82))
  }
})

test('a real multi-beat cast pauses and restores without replaying spent beats', () => {
  const run = new TowerRun({ attemptId: 2, floor: 9, seed: 123, xp: 0, hp: 100,
    loadout: { growthVersion: 1, active: { sj_yujian: 1, sj_arc: 10 }, passive: {},
      evolutions: [], evolutionLevels: {}, tutorialWaves: 0,
      weaponId: 'eq_sword_suwen', weaponQuality: 1, weaponRefine: 0 } })
  for (const key of Object.keys(run.state.cooldowns)) run.state.cooldowns[key] = 99999
  for (let i = 0; i < 300 && !run.state.enemies.length; i++) run.advance(STEP)
  for (const enemy of run.state.enemies) {
    enemy.x = run.state.player.x + 100; enemy.y = run.state.player.y; enemy.ai.graceUntil = 99999
  }
  start(run, 'sj_arc')
  run.advance(.2)
  run.pause()
  assert.ok(validateTowerSnapshot(run.snapshot()))
  const restored = TowerRun.restore(run.snapshot()), paused = run.snapshot()
  run.advance(2); assert.deepEqual(run.snapshot(), paused)
  run.resume(); restored.resume()
  run.advance(.6); restored.advance(.6)
  assert.deepEqual(run.snapshot(), restored.snapshot())
  assert.ok(validateTowerSnapshot(run.snapshot()))
})

function liveCast(id, level, evolution, rank, elapsed) {
  const run = new TowerRun({ attemptId: 3, floor: 9, seed: 123, xp: 0, hp: 100,
    loadout: { growthVersion: 1, active: { sj_yujian: 1, [id]: level }, passive: {},
      evolutions: evolution ? [evolution] : [], evolutionLevels: evolution ? { [evolution]: rank } : {},
      tutorialWaves: 0, weaponId: 'eq_sword_suwen', weaponQuality: 1, weaponRefine: 0 } })
  for (const key of Object.keys(run.state.cooldowns)) run.state.cooldowns[key] = 99999
  for (let i = 0; i < 300 && !run.state.enemies.length; i++) run.advance(STEP)
  for (const enemy of run.state.enemies) {
    enemy.x = run.state.player.x + 100; enemy.y = run.state.player.y; enemy.ai.graceUntil = 99999
  }
  start(run, id)
  if (evolution === 'evo_wanjian') {
    // Finish any explicitly started ordinary volley before requesting special.
    run.advance(.4)
    run.state.cooldowns.evo_wanjian = 0
  }
  run.advance(elapsed)
  return run
}

for (const rank of [1, 10]) {
  test(`liangyi rank ${rank} saves its expanded zone and resumes without replaying spent pulses`, () => {
    const run = liveCast('sj_formation', rank, null, 0, 1.05)
    run.pause()
    const saved = run.snapshot(), zone = saved.zones.find(z => z.formId === 'sj_formation')
    assert.equal(zone.radius, rank === 1 ? 132 : 192)
    assert.equal(zone.pulseIndex, 1)
    assert.ok(validateTowerSnapshot(saved))
    const corrupt = structuredClone(saved)
    corrupt.zones.find(z => z.formId === 'sj_formation').radius = rank === 1 ? 110 : 160
    assert.equal(validateTowerSnapshot(corrupt), false, 'old radius is not accepted as current geometry')
    const restored = TowerRun.restore(JSON.parse(JSON.stringify(saved)))
    run.advance(1)
    assert.deepEqual(run.snapshot(), saved, 'pause cannot consume a pulse')
    run.resume(); restored.resume()
    for (let i = 0; i < 400; i++) {
      run.advance(STEP); restored.advance(STEP)
      assert.deepEqual(restored.snapshot(), run.snapshot())
    }
    assert.ok(validateTowerSnapshot(run.snapshot()))
  })
}

for (const rank of [1, 2]) {
  test(`sixiang rank ${rank} saves its new range and resumes the remaining pulse ledger`, () => {
    const run = liveCast('sj_formation', 10, 'evo_sixiang', rank, 1.05)
    run.pause()
    const saved = run.snapshot(), zone = saved.zones.find(z => z.formId === 'evo_sixiang')
    assert.equal(zone.radius, rank === 1 ? 288 : 336)
    assert.equal(zone.pulseIndex, 1)
    assert.ok(validateTowerSnapshot(saved))
    const obsolete = structuredClone(saved)
    obsolete.zones.find(z => z.formId === 'evo_sixiang').radius = 160
    assert.equal(validateTowerSnapshot(obsolete), false, 'old geometry is not a valid current zone')
    assert.throws(() => TowerRun.restore(obsolete))
    const restored = TowerRun.restore(JSON.parse(JSON.stringify(saved)))
    run.advance(1)
    assert.deepEqual(run.snapshot(), saved, 'pause cannot advance the enlarged field')
    run.resume(); restored.resume()
    for (let i = 0; i < 400; i++) {
      run.advance(STEP); restored.advance(STEP)
      assert.deepEqual(restored.snapshot(), run.snapshot())
    }
    assert.ok(validateTowerSnapshot(run.snapshot()))
  })
}

for (const [id, level, evolution, rank, elapsed] of [
  ['sj_arc', 10, null, 0, .22], ['sj_line', 10, null, 0, .15],
  ['sj_shadow', 10, null, 0, 1], ['sj_formation', 10, 'evo_sixiang', 2, 1],
  ['sj_yujian', 10, 'evo_wanjian', 2, .5],
]) {
  test(`${evolution ?? id} preserves pending beats and receipts across a real JSON snapshot`, () => {
    const run = liveCast(id, level, evolution, rank, elapsed)
    assert.ok(validateTowerSnapshot(run.snapshot()))
    run.pause()
    const saved = run.snapshot(), restored = TowerRun.restore(JSON.parse(JSON.stringify(saved)))
    run.advance(2); assert.deepEqual(run.snapshot(), saved)
    run.resume(); restored.resume()
    for (let i = 0; i < 400; i++) {
      run.advance(STEP); restored.advance(STEP)
      assert.deepEqual(restored.snapshot(), run.snapshot())
    }
    assert.ok(validateTowerSnapshot(run.snapshot()))
  })
}

test('multi-beat snapshots reject changed segment counts, timing and directions', () => {
  const run = liveCast('sj_arc', 10, null, 0, .22), saved = run.snapshot()
  assert.ok(saved.casts.some(c => c.skill === 'sj_arc'))
  for (const mutate of [
    c => { c.pulseCount = 9 },
    c => { c.releaseAt += 1 },
    c => { c.dirX = 2 },
    c => { delete c.formId; delete c.pulseCount; delete c.pulseIndex },
    c => { delete c.castContext },
  ]) {
    const corrupt = structuredClone(saved)
    mutate(corrupt.casts.find(c => c.skill === 'sj_arc'))
    assert.equal(validateTowerSnapshot(corrupt), false)
    assert.throws(() => TowerRun.restore(corrupt))
  }
})

test('formation snapshots bind the complete pulse ledger and geometry to the captured rank', () => {
  const run = liveCast('sj_formation', 10, 'evo_sixiang', 2, 1.5), saved = run.snapshot()
  for (const mutate of [
    z => { z.formLevel = 1 },
    z => { z.shape = 'circle' },
    z => { z.width = 500 },
    z => { z.nextAt += .5 },
    z => { z.damage *= 4 },
    z => { z.parentLevel = 1 },
    z => { delete z.formId; delete z.pulseCount; delete z.pulseIndex },
    z => { delete z.castContext },
  ]) {
    const corrupt = structuredClone(saved)
    mutate(corrupt.zones.find(z => z.kind === 'formation'))
    assert.equal(validateTowerSnapshot(corrupt), false)
  }
})

test('tiandi locks facing but launches from the moving character after pause and restore', () => {
  const run = liveCast('sj_line', 10, 'evo_tiandi', 2, .32)
  const cast = run.state.casts.find(c => c.formId === 'evo_tiandi')
  assert.ok(cast)
  const origin = { x: cast.x, y: cast.y, dirX: cast.dirX, dirY: cast.dirY }
  run.pause()
  const restored = TowerRun.restore(run.snapshot())
  for (const actor of [run, restored]) {
    actor.resume()
    actor.setInput(0, 1)
    actor.advance(.2)
    const effect = actor.state.effects.find(e => e.kind === 'tiandi')
    assert.ok(effect)
    assert.equal(effect.x, origin.x)
    assert.ok(effect.y > origin.y && effect.y < actor.state.player.y, 'origin follows movement until the release step')
    assert.equal(effect.dirX, origin.dirX)
    assert.equal(effect.dirY, origin.dirY)
    assert.notEqual(actor.state.player.y, origin.y)
  }
  assert.deepEqual(run.snapshot(), restored.snapshot())
})

test('tiandi updates the actor to its final locked direction without restarting the action timeline', () => {
  const { run, enemy } = make('sj_line', 10, 'evo_tiandi', 2), notices = []
  run.state.cooldowns.sj_line = 0
  run.advance(.2, e => notices.push(e))
  enemy.x = run.state.player.x - 100
  run.advance(.3, e => notices.push(e))
  const relevant = notices.filter(e => e.skill === 'evo_tiandi')
  assert.equal(relevant.length, 2)
  assert.equal(relevant[0].dirX, 1)
  assert.equal(relevant[1].dirX, -1)
  assert.equal(relevant[1].startedAt, relevant[0].startedAt)
  assert.equal(relevant[1].releaseAt, relevant[0].releaseAt)
  assert.equal(run.state.effects.find(e => e.kind === 'tiandi').dirX, relevant[1].dirX)
})

test('critical hit presentation marks an actual critical without an additional damage event', () => {
  const { run } = make('sj_arc', 1)
  run.state.loadout.passive.sj_heart = 4
  run.state.rng = 1
  start(run, 'sj_arc')
  const hits = sample(run, .4)
  assert.equal(hits.length, 1)
  assert.equal(hits[0].critical, true)
  close(hits[0].damage, run.state.player.attack * coefficient('sj_arc', 1) * 1.5)
})

test('a due convergence drains existing ordinary swords before starting instead of extending the volley', () => {
  const { run } = make('sj_yujian', 10, 'evo_wanjian', 2)
  const until = run.state.time + .6
  run._projectile(-700, -800, 0, 0, 7, 1, false, { source: 'sj_yujian', expiresAt: until,
    targetId: 'departed-target', castContext: { loadout: structuredClone(run.state.loadout), xp: 0 } })
  run.state.cooldowns.sj_yujian = 0
  run.state.cooldowns.evo_wanjian = 0
  const hits = sample(run, .5)
  assert.equal(hits.length, 0)
  assert.ok(!run.state.casts.some(c => c.skill === 'sj_yujian'), 'do not extend the volley while special is waiting')
  run.advance(.55)
  assert.ok(run.state.zones.some(z => z.formId === 'evo_wanjian'))
})

for (const id of ['sj_shadow', 'sj_formation']) {
  test(`${id} notifies the actor of its first real impact after the placement delay`, () => {
    const { run } = make(id, 1), notices = []
    run.state.cooldowns[id] = 0
    run.advance(STEP, e => notices.push(e))
    run.state.cooldowns[id] = 99999
    const hits = sample(run, 1)
    assert.equal(notices.length, 1)
    assert.ok(hits[0].at >= notices[0].releaseAt)
    assert.ok(hits[0].at - notices[0].releaseAt < STEP + 1e-9)
  })
}

// A blade pass must keep pace with the shared damage window, even before extra swords unlock.
for (const rank of [1, 3, 6, 10]) {
  for (const distance of [70, 80, 100]) {
    test(`orbit rank ${rank} sustains its window budget at distance ${distance}`, () => {
      const { run, enemy } = make('sj_wanjian', rank)
      Object.assign(enemy, { x: run.state.player.x + distance, radius: 22 })
      const hits = sample(run, 12)
      assert.ok(hits.length >= 12, `expected at least 12 hits across two active windows, received ${hits.length}`)
      assert.ok(hits.length <= 14, 'each four-second activation allows at most seven hits')
      for (let i = 1; i < hits.length; i++) assert.ok(hits[i].at - hits[i - 1].at >= .6 - STEP / 2)
      close(1e6 - enemy.hp, hits.length * run.state.player.attack * coefficient('sj_wanjian', rank) * 10 / 7)
    })
  }
}
for (const angularSpeed of [-.35, .35]) {
  test(`low-rank orbit reaches a moving target at angular speed ${angularSpeed}`, () => {
    const { run, enemy } = make('sj_wanjian', 1)
    enemy.radius = 22
    const hits = sample(run, 12, i => {
      const angle = i * STEP * angularSpeed
      enemy.x = run.state.player.x + Math.cos(angle) * 90
      enemy.y = run.state.player.y + Math.sin(angle) * 90
    })
    assert.ok(hits.length >= 10, `moving target should receive at least ten hits across two activations, got ${hits.length}`)
    assert.ok(hits.length <= 14)
    for (let i = 1; i < hits.length; i++) assert.ok(hits[i].at - hits[i - 1].at >= .6 - STEP / 2)
  })
}

test('faster orbit still leaves angular gaps and does not hit beyond the visible blade tips', () => {
  const { run, enemy } = make('sj_wanjian', 1)
  const form = skillForm('sj_wanjian', 1)
  const pose = orbitSwordPose(form, run.state.time + STEP, 0)
  const angle = pose.angle + Math.PI / form.swords
  Object.assign(enemy, { radius: 1,
    x: run.state.player.x + Math.cos(angle) * 90,
    y: run.state.player.y + Math.sin(angle) * 90 })
  assert.equal(sample(run, STEP).length, 0, 'a target between adjacent swords is not damaged')
  assert.ok(sample(run, .6).length >= 1, 'the actual rotating blade eventually reaches the target')
  Object.assign(enemy, { radius: 22, x: run.state.player.x + 140, y: run.state.player.y })
  assert.equal(sample(run, 1.2).length, 0, 'the outer boundary is not extended by faster rotation')
})

for (const rank of [2, 3, 6, 7, 10]) {
  test(`cross rank ${rank} delivers its heavy cast budget without duplicate blade hits`, () => {
    const { run, enemy } = make('sj_cross', rank)
    enemy.radius = 22
    enemy.x = run.state.player.x + 100
    start(run, 'sj_cross')
    const hits = sample(run, 1.5)
    assert.equal(hits.length, 1, 'the two crossing blades share one receipt')
    close(hits[0].damage, run.state.player.attack * coefficient('sj_cross', rank))
    assert.equal(skillForm('sj_cross', rank).hits, 1)
  })
}

for (const [evolution,rank,duration,count] of [[null,1,5,7],['evo_sixiang',1,6,7],['evo_sixiang',2,6,9]]) {
  test(`formation ${evolution ?? 'liangyi'} rank ${rank} loses only future hits when a boss leaves`, () => {
    const measure = leaveAfter => {
      const {run,enemy}=make('sj_formation',10,evolution,rank)
      start(run,'sj_formation')
      const begin=run.state.time
      const hits=sample(run,duration+.7,()=>{
        if(run.state.time-begin>=leaveAfter)enemy.x=run.state.player.x+800
      })
      return hits
    }
    const full=measure(Infinity),first=measure(1.05),partial=measure(3.2)
    assert.equal(full.length,count)
    assert.equal(first.length,1)
    assert.ok(partial.length>1&&partial.length<count)
    close(full.reduce((n,h)=>n+h.damage,0),first[0].damage*count)
    close(partial.reduce((n,h)=>n+h.damage,0),first[0].damage*partial.length)
  })
}


test('long rainbow gains real damage reach while Tiandi retains approved ranges',()=>{
 for(const [rank,reach] of [[1,450],[3,490],[6,560],[10,640]])assert.equal(skillForm('sj_line',rank).reach,reach)
 assert.equal(skillForm('evo_tiandi',1,10).reach,670)
 assert.equal(skillForm('evo_tiandi',2,10).reach,770)
 for(const [distance,hit] of [[410,true],[475,false]]){
  const {run,enemy}=make('sj_line',1)
  enemy.x=run.state.player.x+distance;enemy.y=run.state.player.y
  start(run,'sj_line');sample(run,.6)
  assert.equal(enemy.hp<1e6,hit,`target at ${distance}`)
 }
})
