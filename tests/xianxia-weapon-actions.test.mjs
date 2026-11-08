import test from 'node:test'
import assert from 'node:assert/strict'
import * as W from '../js/xianxia/TowerWeapons.js'
import { TowerRun, validateTowerSnapshot } from '../js/xianxia/TowerRun.js'
import { cultivationLevelXp } from '../js/xianxia/TowerProfile.js'

function runWith(active = {}, weapon = W.createIronWeapon()) {
  const xp = cultivationLevelXp({ fan: 1, fa: 4, bao: 11, ling: 21 }[weapon.tier])
  return new TowerRun({ attemptId: 1, floor: 9, seed: 41, hp: 100, xp, training: true,
    loadout: { growthVersion: 1, skillsInitialized: true, active, passive: {}, evolutions: [],
      evolutionLevels: {}, tutorialWaves: 0, weapon, weaponId: weapon.id,
      weaponQuality: weapon.quality, weaponRefine: 0, weaponFocusCount: 0 } })
}
function targetFor(run) {
  for (let i = 0; i < 600 && !run.state.enemies.length; i++) run.advance(1 / 60)
  assert.ok(run.state.enemies.length)
  const enemy = run.state.enemies[0]
  for (const e of run.state.enemies) e.ai.graceUntil = 9999
  enemy.x = run.state.player.x + 85; enemy.y = run.state.player.y
  return enemy
}
function step(run, casts = []) {
  for (const e of run.state.enemies) e.ai.graceUntil = 9999
  run.advance(1 / 60, c => casts.push(c))
}

test('weapon attack endpoints vary per strike without changing the mean or item identity', () => {
  assert.equal(typeof W.weaponAttackRange, 'function')
  assert.equal(typeof W.rollWeaponAttack, 'function')
  const weapon = W.createIronWeapon(), before = JSON.stringify(weapon)
  assert.deepEqual(W.weaponAttackRange(weapon), { min: 4, max: 6, mean: 5 })
  assert.equal(W.rollWeaponAttack(weapon, 0), 4)
  assert.equal(W.rollWeaponAttack(weapon, 1 - Number.EPSILON), 6)
  assert.throws(() => W.rollWeaponAttack(weapon, -1), RangeError)
  assert.throws(() => W.rollWeaponAttack(weapon, 1), RangeError)
  assert.equal(JSON.stringify(weapon), before)
})

test('fixed weapons expose real speed and independent hit shares, never random affixes', () => {
  assert.equal(typeof W.weaponAttackProfile, 'function')
  const w = W.createFixedWeapon('eq_sword_guiyan', 'a')
  const other = W.createFixedWeapon('eq_sword_guiyan', 'b')
  assert.deepEqual(w.affixes, other.affixes)
  const basic = W.weaponAttackProfile(W.createIronWeapon()), upgraded = W.weaponAttackProfile(w)
  assert.equal(basic.interval, 1)
  assert.equal(basic.duration, .2)
  assert.ok(upgraded.interval < basic.interval)
  assert.ok(upgraded.duration < basic.duration)
  assert.ok(upgraded.onHit > 0)
  assert.ok(W.validateWeapon(w))
  const forged = structuredClone(w)
  forged.affixes.find(a => a.type === 'attackSpeed').value += 1
  assert.equal(W.validateWeapon(forged), false)
})

test('element affixes start at bao and match their element instead of every attack', () => {
  for (const d of W.WEAPONS) {
    const w = W.createFixedWeapon(d.id, d.quality ? `audit-${d.id}` : 'iron')
    const elemental = w.affixes.filter(a => a.type === 'element')
    assert.equal(elemental.length > 0, ['bao', 'ling'].includes(d.tier), d.name)
  }
  const w = W.createFixedWeapon('eq_sword_zhufeng', 'wind')
  const neutral = W.weaponDamageModifiers(w, 'sj_yujian', 'physical', 'none').flat
  const wind = W.weaponDamageModifiers(w, 'sj_yujian', 'physical', 'wind').flat
  const fire = W.weaponDamageModifiers(w, 'sj_yujian', 'physical', 'fire').flat
  assert.ok(wind > neutral)
  assert.ok(Math.abs(fire-neutral-(w.affixes.find(a=>a.type==='element'&&['fire','all'].includes(a.target))?.value??0)/100)<1e-9)
  assert.equal(W.weaponDamageModifiers(w, 'sj_yujian', 'hybrid', 'wind').flat, wind)
  assert.ok(W.weaponDescription(w).some(s => s.includes('全元素伤害')))
  assert.equal(wind,fire,'all-element affixes apply equally to wind and fire')
})

test('unlearned skills still allow a visible basic hit, with no damage before its swing', () => {
  const run = runWith(), enemy = targetFor(run), hp = enemy.hp, events = []
  step(run, events)
  assert.equal(events[0]?.skill, 'basic_attack')
  assert.equal(enemy.hp, hp)
  for (let i = 0; i < 8; i++) step(run, events)
  assert.ok(enemy.hp < hp)
  assert.ok(run.state.effects.some(e => e.kind === 'hit' && e.source === 'basic_attack'))
  assert.ok(validateTowerSnapshot(run.snapshot()))
})

test('ready basic survives frequent skill readiness and skill windups never overlap a swing', () => {
  const run = runWith({ sj_arc: 1, sj_line: 1 }), enemy = targetFor(run), events = []
  // Keep a durable actual authored target; stop before killing it by inspecting starts.
  for (let i = 0; i < 150; i++) {
    enemy.hp = enemy.maxHp
    run.state.cooldowns.sj_arc = 0
    run.state.cooldowns.sj_line = 0
    step(run, events)
  }
  const basics = events.filter(e => e.skill === 'basic_attack')
  assert.ok(basics.length >= 2, 'frequently ready skills cannot starve basic attacks')
  for (const basic of basics) for (const skill of events.filter(e => e.skill !== 'basic_attack')) {
    assert.ok(skill.startedAt >= basic.startedAt + .2 - 1e-8 || skill.releaseAt <= basic.startedAt + 1e-8)
  }
})

test('pending swing is saved deterministically; pause cannot finish it or reroll its attack', () => {
  const run = runWith(), enemy = targetFor(run)
  step(run)
  assert.ok(run.state.actions?.basic)
  run.pause()
  const saved = run.snapshot(), restored = TowerRun.restore(saved)
  run.advance(1)
  assert.deepEqual(run.snapshot(), saved)
  run.resume(); restored.resume()
  for (let i = 0; i < 20; i++) { step(run); step(restored) }
  assert.deepEqual(run.snapshot(), restored.snapshot())
  const invalid = structuredClone(saved)
  invalid.actions.basic.castContext.weaponAttack = 999
  assert.equal(validateTowerSnapshot(invalid), false)
  assert.ok(enemy.hp > 0)
})

test('a target that leaves melee range before contact takes neither basic nor attached damage', () => {
  const run = runWith({}, W.createFixedWeapon('eq_sword_guiyan', 'a')), enemy = targetFor(run)
  step(run)
  const hp = enemy.hp
  enemy.x = run.state.player.x + 350
  for (let i = 0; i < 20; i++) step(run)
  assert.equal(enemy.hp, hp)
})

test('attached damage follows every resolved direct hit and never rolls another critical', () => {
  const run = runWith({}, W.createFixedWeapon('eq_sword_zhufeng', 'a')), enemy = targetFor(run)
  const receipt = run._weaponCast('sj_arc')
  const castContext = { loadout: structuredClone(run.state.loadout), xp: run.state.player.xp, weaponAttack: 10 }
  const hit = { target: enemy.id, damage: 1, direct: true, source: 'sj_arc', ...receipt, castContext }
  run._damageEnemy(hit); run._damageEnemy(hit)
  const bonus = run.state.effects.filter(e => e.source === 'weapon_on_hit')
  assert.equal(bonus.length, 2)
  const parentHits=run.state.effects.filter(e=>e.kind==='hit'&&e.source==='sj_arc')
  for(let i=0;i<2;i++)assert.ok(Math.abs(bonus[i].damage-parentHits[i].damage*W.weaponAttackProfile(run.state.loadout.weapon).onHit)<1e-9)
  assert.ok(bonus[0].damage > 0)
  assert.equal(bonus[0].critical, undefined)
  assert.equal(run.state.weaponState.effectiveCasts, 0)
})

test('saved skill windup cannot lose its action lock or its sampled weapon attack', () => {
  const run = runWith({ sj_line: 1 })
  targetFor(run); step(run)
  const saved = run.snapshot()
  assert.ok(saved.casts.length)
  assert.ok(validateTowerSnapshot(saved))
  const unlocked = structuredClone(saved)
  unlocked.actions.busyUntil = 0
  assert.equal(validateTowerSnapshot(unlocked), false)
  const rerolled = structuredClone(saved)
  delete rerolled.casts[0].castContext.weaponAttack
  assert.equal(validateTowerSnapshot(rerolled), false)
})

test('a ten-target volley grants one attached hit to every target, including ninth and tenth', () => {
  const run = runWith({}, W.createFixedWeapon('eq_sword_zhufeng', 'a'))
  const cast = run._weaponCast('sj_yujian')
  for (let i = 0; i < 10; i++) {
    const enemy = { id: `target-${i}`, hp: 10000, x: 0, y: 0, radius: 20 }
    run.state.enemies.push(enemy)
    run._damageEnemy({ target: enemy.id, source: 'sj_yujian', direct: true, damage: 1, ...cast })
  }
  assert.equal(run.state.effects.filter(e => e.source === 'weapon_on_hit').length, 10)
})

test('learning orbit evolution cannot borrow an expired normal orbit while the body is busy', () => {
  const run = runWith({ sj_wanjian: 1 }), enemy = targetFor(run)
  // Let the normal activation expire while preserving the real action clocks.
  for (let i = 0; i < 240; i++) { enemy.hp = enemy.maxHp; step(run) }
  while (!run.state.actions.basic) { enemy.hp = enemy.maxHp; step(run) }
  run.pause()
  const next = structuredClone(run.state.loadout)
  next.evolutions = ['evo_wuwo']; next.evolutionLevels = { evo_wuwo: 1 }
  run.setGrowthLoadout(next)
  run.resume()
  enemy.orbitNextAt = 0
  const out = []
  run._growthOrbit(1, out, run.state.player)
  assert.equal(out.length, 0, 'new orbit activation must wait for the swing to finish')
})
