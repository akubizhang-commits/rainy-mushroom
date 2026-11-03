import {equipmentPrimaryBonuses} from '../js/xianxia/TowerEquipmentBases.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import { TowerRun, stats, validateTowerSnapshot } from '../js/xianxia/TowerRun.js'
import { createIronWeapon, createFixedWeapon, weaponFlatAttack, rollWeapon, validateWeapon, weaponDamageModifiers, WEAPONS } from '../js/xianxia/TowerWeapons.js'
import { createBasicEquipment, createFixedEquipment, EQUIPMENT, rollEquipment, validateEquipment, ringDamageModifiers, ringCooldownReduction, armorModifiers } from '../js/xianxia/TowerEquipment.js'
import { GROWTH_SKILLS } from '../js/xianxia/TowerGrowth.js'
import { cultivationAt, cultivationLevelXp } from '../js/xianxia/TowerProfile.js'

const STEP = 1 / 60
const clone = value => JSON.parse(JSON.stringify(value))
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} != ${expected}`)
const maximum = () => 1 - Number.EPSILON
function weapon(tier = 'ling', quality = 4, affinity = 'qi', fixed = false) {
  const candidates = WEAPONS.filter(d => d.tier === tier && d.quality === quality)
  const selected = quality === 4 ? candidates[fixed ? 0 : 1] : candidates.find(d => d.affinity === affinity) ?? (tier === 'fan' ? candidates[0] : null)
  assert.ok(selected, `${tier}/${quality} has ${affinity} weapons`)
  const w = createFixedWeapon(selected.id, `weapon-${tier}-${quality}-${affinity}-${fixed}`)
  assert.equal(w.refine, 0)
  assert.ok(validateWeapon(w))
  return w
}
function equipment(category, tier = 'ling', quality = 4, cdr = false) {
  const candidates = EQUIPMENT.filter(d => d.category === category && d.tier === tier && d.quality === quality)
  const selected = quality === 4 ? candidates[cdr ? 0 : 1] : candidates.find(d => d.role === (category === 'armor' ? 'sustain' : cdr ? 'cooldown' : 'crit')) ?? candidates[0]
  assert.ok(selected, `${tier}/${quality} has ${category}`)
  const item = createFixedEquipment(selected.id, `${category}-${tier}-${quality}`)
  assert.equal(item.refine, 0)
  assert.ok(validateEquipment(item, category))
  return item
}
function loadout(w = weapon(), options = {}) {
  const result = {
    growthVersion: 1, active: { sj_yujian: 1, ...options.active }, passive: options.passive ?? {},
    evolutions: Object.keys(options.evolutions ?? {}), evolutionLevels: options.evolutions ?? {},
    tutorialWaves: 0, weapon: clone(w), weaponId: w.id, weaponQuality: w.quality, weaponRefine: w.refine,
    weaponFocusCount: options.focus ?? 0,
  }
  for (const kind of ['ring', 'armor']) if (options[kind]) {
    result[kind] = clone(options[kind]); result[`${kind}Id`] = options[kind].id
  }
  return result
}
const unlockXp = { fan: 0, fa: cultivationLevelXp(4), bao: cultivationLevelXp(11), ling: cultivationLevelXp(21) }
const make = (w = weapon(), options = {}) => new TowerRun({
  attemptId: 17, floor: 9, seed: 123,
  xp: Math.max(...[w, options.ring, options.armor].filter(Boolean).map(item => unlockXp[item.tier])),
  hp: 50, loadout: loadout(w, options), ...options.run,
})
function dummy(run, id = 'target') {
  const enemy = { id, x: 100, y: -60, radius: 20, hp: 1e6, maxHp: 1e6, woundBudget: 0, woundUntil: 0 }
  run.state.enemies.push(enemy)
  return enemy
}
function hit(run, enemy, source, extra = {}) {
  const before = run.state.effects.length
  run._damageEnemy({ target: enemy.id, damage: 100, direct: true, source, ...extra })
  // This suite isolates the parent hit's crit/focus/passive formula. Independent
  // attached hits are asserted separately in xianxia-weapon-actions.test.mjs.
  return run.state.effects.slice(before).findLast(e => e.kind === 'hit' && e.source === source && e.targetId === enemy.id)?.damage ?? 0
}
function safeStep(run) {
  for (const id of Object.keys(run.state.cooldowns)) run.state.cooldowns[id] = 99999
  for (const e of run.state.enemies) e.ai.graceUntil = 99999
  run.advance(STEP)
}
function safeAdvance(run, seconds) {
  for (let i = 0; i < Math.round(seconds * 60); i++) safeStep(run)
}
function realTargets(run, count = 1) {
  for (let i = 0; i < 1200 && run.state.enemies.length < count; i++) safeStep(run)
  assert.ok(run.state.enemies.length >= count)
  for (const [i, e] of run.state.enemies.entries()) {
    e.ai.graceUntil = 99999; e.x = run.state.player.x + 130 + i * 35; e.y = run.state.player.y
  }
  return run.state.enemies.slice(0, count)
}
function incoming(run, damage, id = 'test-hit') {
  run.state.projectiles.push({ id, x: run.state.player.x, y: run.state.player.y,
    vx: 0, vy: 0, radius: 10, damage, hostile: true, hitIds: [], expiresAt: run.state.time + 1 })
  safeStep(run)
}

// Starter +5 and any replacement weapon are added once after cultivation.
test('iron follows growth; fixed attack stays constant and is added once across the whole multi-sword cast', () => {
  const fixed = weapon('ling', 1, 'general', true)
  const tampered = clone(fixed); tampered.affixes[0].value += 1
  assert.equal(validateWeapon(tampered), false)
  for (const xp of [0, unlockXp.ling, cultivationLevelXp(27)]) {
    const baseAttack = 100 * cultivationAt(xp).attackMultiplier
    for (const w of xp < unlockXp.ling ? [createIronWeapon()] : [createIronWeapon(), fixed]) {
      const added = weaponFlatAttack(w)+equipmentPrimaryBonuses({weapon:w}).strength
      const run = make(w, { active: { sj_yujian: 10 }, run: { xp } })
      close(run.state.player.attack, baseAttack + added)
      assert.ok(validateTowerSnapshot(run.snapshot()))
      close(TowerRun.restore(run.snapshot()).state.player.attack, baseAttack + added)
      const e = dummy(run), skill = GROWTH_SKILLS.find(s => s.id === 'sj_yujian')
      run._releaseSkill({ skill: skill.id, level: 10, x: 33, y: -60,
        targetX: e.x, targetY: e.y, dirX: 1, dirY: 0,
        castContext: { xp, loadout: clone(run.state.loadout) }, ...run._weaponCast(skill.id) }, [])
      assert.equal(run.state.projectiles.length, 1)
      const total = run.state.projectiles.reduce((sum, p) => sum + p.damage, 0)
      close(total, (baseAttack + added) * skill.damage[9])
      close(total - baseAttack * skill.damage[9], added * skill.damage[9])
    }
  }
  close(stats(0, { passive: {}, weaponQuality: 4, weaponRefine: 4 }).attack, 130)
})

test('all three slots validate, omitted slots stay bare, and identities/categories cannot be forged', () => {
  const full = make(weapon(), { ring: equipment('ring'), armor: equipment('armor') })
  assert.ok(validateTowerSnapshot(full.snapshot()))
  assert.equal(full.state.weaponState.ringId, full.state.loadout.ringId)
  assert.equal(full.state.armorState.armorId, full.state.loadout.armorId)
  const bare = make()
  assert.equal(bare.state.weaponState.ringId, null)
  assert.equal(bare.state.armorState, undefined)
  assert.ok(validateTowerSnapshot(bare.snapshot()))
  const basic = make(createIronWeapon(), { ring: createBasicEquipment('ring'), armor: createBasicEquipment('armor') })
  assert.ok(validateTowerSnapshot(basic.snapshot()))
  for (const mutate of [
    l => { l.ringId = 'wrong' }, l => { l.armorId = 'wrong' },
    l => { l.ring = l.armor; l.ringId = l.armor.id },
    l => { delete l.armor }, l => { l.ring.affixes[0].value = 999 },
    l => { l.weapon.affixes.push({ type: 'lifesteal', value: .5 }) },
    l => { l.weaponQuality = 0 }, l => { l.weaponFocusCount = 5 },
  ]) {
    const l = clone(full.state.loadout); mutate(l)
    assert.throws(() => new TowerRun({ attemptId: 1, floor: 1, hp: 50, xp: 5400, loadout: l }))
  }
})

test('disabled refinement is rejected for every slot without changing a paused run', () => {
  const run = make(weapon(), { ring: equipment('ring'), armor: equipment('armor') })
  run.pause()
  const saved = run.snapshot()
  for (const category of ['weapon', 'ring', 'armor']) {
    for (const refine of [1, 4]) {
      const next = clone(saved.loadout)
      next[category].refine = refine
      if (category === 'weapon') next.weaponRefine = refine
      assert.throws(() => run.setGrowthLoadout(next), `${category} +${refine}`)
      assert.deepEqual(run.snapshot(), saved)
      assert.equal(validateTowerSnapshot({ ...clone(saved), loadout: next }), false)
    }
  }
  const restored = TowerRun.restore(saved)
  assert.deepEqual(weaponDamageModifiers(restored.state.loadout.weapon, 'sj_line', 'physical'), weaponDamageModifiers(saved.loadout.weapon, 'sj_line', 'physical'))
  assert.deepEqual(ringDamageModifiers(restored.state.loadout.ring), ringDamageModifiers(saved.loadout.ring))
  assert.deepEqual(armorModifiers(restored.state.loadout.armor), armorModifiers(saved.loadout.armor))
})

test('weapon flat and ring crit/focus use additive shares while preserving the original bone/crit baseline', () => {
  for (const fixed of [false, true]) {
    const w = weapon('ling', 4, 'qi', fixed), ring = equipment('ring')
    const run = make(w, { ring, focus: 4, passive: { sj_bone: 4, sj_heart: 4 } })
    run._random = () => 0
    const raw = run.state.player.attack * 2, baseline = raw * 1.25
    const flat = weaponDamageModifiers(w, 'sj_line', 'physical').flat, r = ringDamageModifiers(ring)
    const cast = run._weaponCast('sj_line')
    const expected = baseline * (1 + flat + r.critBonus + r.special) + raw * .5
    close(hit(run, dummy(run), 'sj_line', { ...cast, damage: raw }), expected)
    close(hit(run, dummy(run, 'other'), 'sj_line', { ...cast, damage: raw }), expected)
    assert.equal(run.state.weaponState.effectiveCasts, 1)
    assert.equal(run.state.weaponState.focusCount, 0)
    assert.equal(run.state.loadout.weaponFocusCount, 4)
    assert.ok(run.state.effects.findLast(e => e.source === 'sj_line').weaponFocus)
    assert.equal(run.state.player.hp, 50, 'dealing damage never heals through weapon or ring')
  }
})

test('focus belongs to the ring, shares a counter across skills and ignores whiffs, zero hits and corpses', () => {
  const ring = equipment('ring'), run = make(weapon(), { ring }), e = dummy(run)
  run._random = () => .99999
  const miss = run._weaponCast('sj_arc')
  run._damageEnemy({ target: 'absent', damage: 100, direct: true, source: 'sj_arc', ...miss })
  hit(run, e, 'sj_arc', { ...miss, damage: 0 })
  assert.equal(run.state.weaponState.focusCount, 0)
  for (const [i, source] of ['sj_yujian', 'sj_arc', 'sj_shadow', 'sj_line', 'sj_arc', 'sj_line'].entries()) {
    const d = weaponDamageModifiers(run.state.loadout.weapon, source, 'physical').flat
    close(hit(run, e, source, run._weaponCast(source)), 100 * (1 + d + (i === 4 ? ringDamageModifiers(ring).special : 0)))
  }
  assert.equal(run.state.weaponState.focusCount, 1)
  assert.equal(run.state.weaponState.effectiveCasts, 6)
  e.hp = 0; hit(run, e, 'sj_arc', run._weaponCast('sj_arc'))
  assert.equal(run.state.weaponState.effectiveCasts, 6)
  for (const ring of [undefined, createBasicEquipment('ring'), equipment('ring', 'fa', 3)]) {
    const bare = make(weapon(), { ring }), target = dummy(bare)
    hit(bare, target, 'sj_line', bare._weaponCast('sj_line'))
    assert.equal(bare.state.weaponState.effectiveCasts, 0)
    assert.ok(!bare.state.effects.at(-1).weaponFocus)
  }
  const training = make(weapon(), { ring, focus: 4, run: { training: true } })
  hit(training, dummy(training), 'sj_line', training._weaponCast('sj_line'))
  assert.equal(training.state.weaponState.focusCount, 1)
  assert.equal(training.state.loadout.weaponFocusCount, 4)
})

test('zone aliases apply one skill family across damage types and continuous damage excludes ring effects', () => {
  const ring = equipment('ring')
  for (const [affinity, pairs] of [
    ['general', [['shadow', 'sj_shadow'], ['sword_rain', 'sj_yujian'], ['rain', 'sj_yujian'], ['evo_wanjian', 'sj_yujian']]],
    ['formation', [['formation', 'sj_formation'], ['evo_sixiang', 'sj_formation'], ['orbit', 'sj_wanjian'], ['evo_wuwo', 'sj_wanjian']]],
    ['qi', [['evo_tiandi', 'sj_line']]],
  ]) {
    const w = weapon('fa', 3, affinity), run = make(w, { ring, focus: 4 }), e = dummy(run)
    run._random = () => .99999
    const type = affinity === 'formation' ? 'hybrid' : 'physical'
    for (const [source, parent] of pairs) close(hit(run, e, source), 100 * (1 + weaponDamageModifiers(w, parent, type).flat))
    assert.equal(run.state.weaponState.focusCount, 4)
    if (affinity === 'formation') {
      const phys = weaponDamageModifiers(w, 'sj_formation', 'physical').flat
      const mixed = weaponDamageModifiers(w, 'sj_formation', 'hybrid').flat
      close(phys, mixed)
    }
  }
  const run = make(weapon(), { ring, focus: 4, passive: { sj_heart: 4 } }), e = dummy(run)
  run._random = () => 0
  for (const [source, parent, type] of [['formation', 'sj_formation', 'hybrid'], ['sword_rain', 'sj_yujian', 'physical']]) {
    close(hit(run, e, source), 100 * (1 + weaponDamageModifiers(run.state.loadout.weapon, parent, type).flat))
  }
  assert.equal(run.state.weaponState.focusCount, 4)
})

test('scaled wound/burst never double-enhance damage but never reapply weapon, ring or healing', () => {
  const run = make(weapon(), { ring: equipment('ring'), armor: equipment('armor'), focus: 4,
    passive: { sj_mark: 4, sj_gate: 4, sj_bone: 4, sj_heart: 4 } })
  run._random = () => 0
  const e = dummy(run), direct = hit(run, e, 'sj_line', run._weaponCast('sj_line'))
  close(e.qingping.amount, direct * 1.15); close(e.woundBudget, direct * 1.15); assert.equal(run.state.swordBursts.length, 1); assert.equal(run.state.gateEntries.length, 0)
  const before = clone(run.state.weaponState), armorBefore = clone(run.state.armorState)
  for (const source of ['wound', 'sword_burst']) close(hit(run, e, source, { scaled: true, direct: false, damage: 13 }), 13)
  close(e.qingping.amount, direct * 1.15); close(e.woundBudget, direct * 1.15)
  assert.deepEqual(run.state.weaponState, before)
  assert.deepEqual(run.state.armorState, armorBefore)
  assert.equal(run.state.player.hp, 50)
})

test('all legal weapon/ring grade combinations stay within the shared total budget using actual combat hits', () => {
  const bands = ['fan','fa','bao','ling'].flatMap(tier => (tier==='fan'?[1]:[1,2,3,4]).map(quality=>[tier,quality]))
  for (let wi = -1; wi < bands.length; wi++) for (let ri = -1; ri < bands.length; ri++) {
    const minXp = Math.max(wi < 0 ? 0 : unlockXp[bands[wi][0]], ri < 0 ? 0 : unlockXp[bands[ri][0]])
    for (const cdr of [false, true]) for (const fixed of [false, true]) for (const xp of [minXp, cultivationLevelXp(27)]) for (const passives of [false, true]) {
      const w = wi < 0 ? createIronWeapon() : weapon(...bands[wi], 'qi', fixed)
      const ring = ri < 0 ? undefined : equipment('ring', ...bands[ri], cdr)
      const r = ring ? ringDamageModifiers(ring) : { critChance: 0, critBonus: 0, special: 0 }
      const run = make(w, { ring, focus: 4, passive: passives ? { sj_heart: 4, sj_bone: 4 } : {}, run: { xp } })
      const e = dummy(run), raw = run.state.player.attack, baseP = passives ? .28 : 0
      const cast = run._weaponCast('sj_line')
      run._random = () => .999999
      const normal = hit(run, e, 'sj_line', { ...cast, damage: raw })
      run._random = () => 0
      const crit = hit(run, e, 'sj_line', { ...cast, damage: raw })
      const mean = (normal * (1 - baseP - r.critChance) + crit * (baseP + r.critChance)) / (1 - (ring ? ringCooldownReduction(ring) : 0))
      const baseline = (100 * cultivationAt(xp).attackMultiplier + 5) * ((passives ? 1.25 : 1) + baseP * .5)
      const cap = 3 // Current fixed-equipment shared damage budget, including precharged focus and CDR.
      const flat = weaponDamageModifiers(w, 'sj_line', 'physical').flat
      const expected = raw * ((passives ? 1.25 : 1) * (1 + flat + (baseP + r.critChance) * r.critBonus + r.special) + (baseP + r.critChance) * .5) / (1 - (ring ? ringCooldownReduction(ring) : 0))
      close(mean, expected)
      assert.ok(mean / baseline <= cap + 1e-8, `weapon=${wi},ring=${ri},fixed=${fixed},xp=${xp}: ${mean / baseline} > ${cap}`)
    }
  }
})

test('armor reduction composes with existing vajra and one actual hit schedules exactly one heal', () => {
  const armor = equipment('armor'), m = armorModifiers(armor)
  const run = make(createIronWeapon(), { armor, passive: { vajra: 4 }, run: { hp: 100 } })
  incoming(run, 10)
  const damage = 10 * (1 - .15) * (1 - m.reduction)
  close(run.state.player.hp, 100 - damage)
  close(run.state.armorState.pending.damage, damage)
  close(run.state.armorState.pending.amount, Math.min(damage, run.state.armorState.entryMaxHp * m.healFraction))
  assert.ok(m.reduction <= .17)
  const pending = clone(run.state.armorState.pending)
  incoming(run, 50, 'during-invulnerability')
  assert.deepEqual(run.state.armorState.pending, pending)
  assert.equal(run.state.armorState.triggerCount, 1)
  safeAdvance(run, .6)
  incoming(run, 10, 'second-actual-hit')
  assert.deepEqual(run.state.armorState.pending, pending)
  assert.equal(run.state.armorState.cooldownUntil, pending.triggeredAt + 20)
  assert.ok(validateTowerSnapshot(run.snapshot()))
})

for (const tier of ['fan', 'fa', 'bao', 'ling']) for (const quality of (tier === 'fan' ? [1] : [1, 4])) {
  test(`${tier}/${quality} armor heals after its delay, with real loss, entry HP and floor caps`, () => {
    const armor = equipment('armor', tier, quality), m = armorModifiers(armor)
    const run = make(createIronWeapon(), { armor })
    incoming(run, .01)
    const lost = 50 - run.state.player.hp, receipt = clone(run.state.armorState.pending)
    assert.equal(receipt.dueAt - receipt.triggeredAt, quality === 4 ? 2 : 3)
    safeAdvance(run, m.healDelay - STEP)
    close(run.state.player.hp, 50 - lost)
    safeStep(run)
    close(run.state.player.hp, 50)
    close(run.state.armorState.healedTotal, lost)
    assert.equal(run.state.armorState.pending, null)
    assert.ok(validateTowerSnapshot(run.snapshot()))
    const floorCap = run.state.armorState.entryMaxHp * .1
    // Exercise a full floor's budget without resetting its cooldown or entry HP.
    for (let i = 0; i < 160 && run.state.armorState.healedTotal < floorCap - 1e-8; i++) {
      safeAdvance(run, Math.max(0, run.state.armorState.cooldownUntil - run.state.time))
      run.state.player.hp = 50
      incoming(run, 10)
      safeAdvance(run, m.healDelay)
      assert.ok(run.state.armorState.healedTotal <= floorCap + 1e-8)
    }
    close(run.state.armorState.healedTotal, floorCap)
    const count = run.state.armorState.triggerCount
    safeAdvance(run, 20); incoming(run, 10)
    assert.equal(run.state.armorState.pending, null)
    assert.equal(run.state.armorState.triggerCount, count)
    assert.ok(validateTowerSnapshot(run.snapshot()))
  })
}

test('entry max HP does not grow the armor allowance on level up; full HP never banks unused healing', () => {
  const armor = equipment('armor', 'fan', 1), run = make(createIronWeapon(), { armor, run: { xp: 44 } })
  const [target] = realTargets(run)
  incoming(run, 10)
  const entry = run.state.armorState.entryMaxHp, promised = run.state.armorState.pending.amount
  run._damageEnemy({ target: target.id, damage: target.hp, direct: false, scaled: true, source: 'fixture' })
  safeStep(run)
  assert.ok(run.state.player.maxHp > entry)
  close(run.state.armorState.entryMaxHp, entry)
  close(run.state.armorState.pending.amount, promised)
  run.state.player.hp = run.state.player.maxHp
  safeAdvance(run, armorModifiers(armor).healDelay)
  assert.equal(run.state.armorState.healedTotal, 0)
  assert.equal(run.state.armorState.pending, null)
  incoming(run, .1)
  assert.equal(run.state.armorState.pending, null, 'cooldown starts on trigger, even when the heal was unused')
  assert.ok(validateTowerSnapshot(run.snapshot()))
})

test('pending armor heal never revives, including a lethal hit on the exact due tick', () => {
  const armor = equipment('armor'), run = make(createIronWeapon(), { armor })
  incoming(run, 1)
  safeAdvance(run, armorModifiers(armor).healDelay - STEP)
  incoming(run, 1000, 'lethal-on-due-tick')
  assert.equal(run.state.phase, 'lost')
  assert.equal(run.state.player.hp, 0)
  assert.equal(run.state.armorState.pending, null)
  assert.equal(run.state.armorState.healedTotal, 0)
  assert.ok(validateTowerSnapshot(run.snapshot()))
  const restored = TowerRun.restore(run.snapshot())
  restored.advance(60)
  assert.equal(restored.state.player.hp, 0)
})

test('armor pending/cooldown survive pause, JSON restoration and paused skill learning unchanged', () => {
  const armor = equipment('armor'), run = make(createIronWeapon(), { armor, ring: equipment('ring') })
  incoming(run, 10); safeAdvance(run, .5); run.pause()
  const saved = run.snapshot()
  assert.ok(validateTowerSnapshot(saved))
  const restored = TowerRun.restore(saved)
  run.advance(60); assert.deepEqual(run.snapshot(), saved)
  run.setGrowthLoadout({ ...saved.loadout, passive: { sj_bone: 1 } })
  assert.deepEqual(run.state.armorState, saved.armorState)
  restored.setGrowthLoadout({ ...saved.loadout, passive: { sj_bone: 1 } })
  for (const actor of [run, restored]) { actor.resume(); safeAdvance(actor, 3) }
  assert.deepEqual(run.snapshot(), restored.snapshot())
  const after = run.snapshot()
  assert.ok(after.armorState.healedTotal > 0)
  assert.equal(after.armorState.cooldownUntil, saved.armorState.cooldownUntil)
  const resumed = TowerRun.restore(after)
  incoming(resumed, 1)
  assert.equal(resumed.state.armorState.pending, null)
  assert.ok(validateTowerSnapshot(resumed.snapshot()))
})

test('strict armor snapshot checks reject forged amount, elapsed delay, cooldown, entry HP and spent cap', () => {
  const run = make(createIronWeapon(), { armor: equipment('armor') })
  incoming(run, 10); run.pause()
  const saved = run.snapshot()
  assert.ok(validateTowerSnapshot(saved))
  for (const mutate of [
    s => { delete s.armorState }, s => { s.armorState.entryMaxHp++ },
    s => { s.armorState.armorId = 'other' }, s => { s.armorState.healedTotal = s.armorState.entryMaxHp * .1 + 1 },
    s => { s.armorState.healedTotal = -1 }, s => { s.armorState.healedTotal = 1 },
    s => { s.armorState.pending.amount++ }, s => { s.armorState.pending.damage = 0 },
    s => { s.armorState.pending.damage = .001 }, s => { s.armorState.pending.dueAt-- },
    s => { s.armorState.pending.triggeredAt++ }, s => { s.armorState.pending = null },
    s => { s.armorState.cooldownUntil = s.time }, s => { s.armorState.triggerCount++ },
    s => { s.armorState.lastTriggerAt = null }, s => { s.armorState.pending.extra = true },
  ]) {
    const corrupt = clone(saved); mutate(corrupt)
    assert.equal(validateTowerSnapshot(corrupt), false, JSON.stringify(corrupt.armorState))
    assert.throws(() => TowerRun.restore(corrupt))
  }
})

test('real multi-sword focus is counted once and survives a save between projectile hits', () => {
  const run = make(weapon(), { ring: equipment('ring'), focus: 4, active: { sj_yujian: 10 } })
  const targets = realTargets(run, 2)
  run.state.yujian.ready=10
  targets[0].x = run.state.player.x + 160; targets[0].y = run.state.player.y - 70
  targets[1].x = run.state.player.x + 340; targets[1].y = run.state.player.y + 100
  run.state.cooldowns.sj_yujian = 0
  for (let i = 0; i < 90 && run.state.weaponState.effectiveCasts === 0; i++) {
    run.advance(STEP)
    if(run.state.projectiles.length)run.state.cooldowns.sj_yujian=99999
  }
  assert.equal(run.state.weaponState.effectiveCasts, 1)
  assert.ok(run.state.projectiles.length > 0)
  const activeCast=run.state.projectiles.find(p=>p.hitIds.length)?.weaponCastId
  assert.ok(activeCast, 'the first volley has a hit receipt')
  run.pause()
  const saved = run.snapshot(), restored = TowerRun.restore(saved)
  assert.equal(saved.weaponState.focusCount, 0)
  assert.equal(saved.loadout.weaponFocusCount, 4)
  for (const actor of [run, restored]) { actor.resume(); safeAdvance(actor, 1) }
  assert.deepEqual(run.snapshot(), restored.snapshot())
  assert.equal(run.state.weaponState.effectiveCasts, 1)
  assert.equal(run.state.weaponState.casts.length, 0)
  assert.ok(validateTowerSnapshot(run.snapshot()))
})

test('cast snapshots bind ring and armor instances and reject counter/source tampering', () => {
  const run = make(weapon(), { ring: equipment('ring'), armor: equipment('armor'), focus: 3 })
  const [e] = realTargets(run); e.x = run.state.player.x + 340
  run.state.cooldowns.sj_yujian = 0
  for(let i=0;i<60&&!run.state.projectiles.length;i++)run.advance(1/60)
  run.pause()
  const saved = run.snapshot()
  assert.ok(saved.projectiles.length > 0)
  assert.ok(validateTowerSnapshot(saved))
  for (const mutate of [
    s => { s.weaponState.ringId = 'wrong' }, s => { s.weaponState.focusCount = 4 },
    s => { s.weaponState.casts[0].ordinal = 1 }, s => { s.weaponState.casts[0].skillId = 'sj_line' },
    s => { s.projectiles[0].source = 'wound' }, s => { delete s.projectiles[0].weaponCastId },
    s => { s.projectiles[0].castContext.loadout.ring = createBasicEquipment('ring') },
    s => { s.projectiles[0].castContext.loadout.armor = createBasicEquipment('armor') },
    s => { delete s.loadout.ring; delete s.loadout.ringId },
  ]) {
    const corrupt = clone(saved); mutate(corrupt)
    assert.equal(validateTowerSnapshot(corrupt), false)
  }
  for (const kind of ['ring', 'armor']) {
    const l = clone(saved.loadout); l[kind] = createBasicEquipment(kind); l[`${kind}Id`] = l[kind].id
    assert.throws(() => run.setGrowthLoadout(l))
    assert.deepEqual(run.snapshot(), saved)
  }
})

test('all active skills and evolutions cross real waves with ring/armor state and deterministic replay', () => {
  const active = Object.fromEntries(GROWTH_SKILLS.filter(s => s.kind === 'active').map(s => [s.id, s.maxLevel]))
  const run = make(weapon('ling', 4, 'formation'), { active, ring: equipment('ring'), armor: equipment('armor'), focus: 2,
    passive: { sj_bone: 4, sj_heart: 4, sj_mark: 4, sj_gate: 4 },
    evolutions: { evo_wanjian: 2, evo_wuwo: 2, evo_tiandi: 2, evo_sixiang: 2 } })
  incoming(run, 10)
  const cooldown = run.state.armorState.cooldownUntil
  // Guarantee actual direct-cast receipts independently of orbit damage
  // stealing kills in early waves after the approved equipment power increase.
  const target = dummy(run, 'focus-probe')
  for (let i = 0; i < 6; i++) hit(run, target, 'sj_line', run._weaponCast('sj_line'))
  run.state.enemies = run.state.enemies.filter(e => e !== target)
  for (const id of Object.keys(run.state.cooldowns)) run.state.cooldowns[id] = 0
  for (let i = 0; i < 3600 && run.state.wave < 3; i++) {
    run.state.player.hp = Math.max(50, run.state.player.hp)
    for (const e of run.state.enemies) {
      e.x = run.state.player.x + 70; e.y = run.state.player.y; e.ai.graceUntil = run.state.time + 10
    }
    run.advance(STEP)
    if (i % 113 === 0) {
      const restored = TowerRun.restore(run.snapshot())
      run.advance(STEP); restored.advance(STEP)
      assert.deepEqual(run.snapshot(), restored.snapshot())
    }
  }
  assert.ok(run.state.wave >= 3)
  assert.ok(run.state.weaponState.effectiveCasts > 5)
  assert.equal(run.state.armorState.cooldownUntil, cooldown)
  assert.ok(validateTowerSnapshot(run.snapshot()))
})
