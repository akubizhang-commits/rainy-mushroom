import {equipmentBaseAttributes} from '../js/xianxia/TowerEquipmentBases.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import * as gear from '../js/xianxia/TowerEquipment.js'
import * as timing from '../js/xianxia/TowerSkillTiming.js'
import { enemyAttackSpec } from '../js/xianxia/TowerEnemyAttacks.js'
import { TowerRun, characterCombatAttributes, validateTowerSnapshot } from '../js/xianxia/TowerRun.js'
import { createIronWeapon } from '../js/xianxia/TowerWeapons.js'
import { cultivationLevelXp } from '../js/xianxia/TowerProfile.js'

const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`)
const pick = (role, tier = 'fa', quality = 1, category = 'armor') => {
  const d = gear.EQUIPMENT.find(d => d.category === category && d.role === role && d.tier === tier && d.quality === quality)
  assert.ok(d)
  return gear.createFixedEquipment(d.id, `test-${d.id}`)
}
test('every armor has intrinsic physical defense; fixed affixes cannot add the retired flat reduction', () => {
  const basic = gear.armorModifiers(gear.createBasicEquipment('armor'))
  assert.equal(basic.physicalDefense, 1)
  assert.equal(basic.magicDefense, 0)
  for (const d of gear.ARMORS.filter(d => d.quality)) {
    const item = gear.createFixedEquipment(d.id, d.id)
    const m = gear.armorModifiers(item)
    assert.ok(m.physicalDefense > 0 && m.magicDefense === 0)
    assert.ok(!item.affixes.some(a => a.type === 'reduction'))
    assert.match(gear.equipmentDescription(item).join(' '), /物理防御/)
    assert.doesNotMatch(gear.equipmentDescription(item).join(' '), /法术防御/)
    const bad = structuredClone(item)
    bad.affixes.push({ type: 'reduction', value: 10 })
    assert.equal(gear.validateEquipment(bad), false)
  }
})
test('physical/magic defenses route separately, hybrid splits once, absent armor has no reduction', () => {
  assert.equal(typeof gear.armorDamageMultiplier, 'function')
  const armor = pick('guard'), m = gear.armorModifiers(armor)
  assert.ok(m.physicalDefense > m.magicDefense)
  const physical = gear.armorDamageMultiplier(armor, 'physical')
  const magic = gear.armorDamageMultiplier(armor, 'magic')
  close(physical, 500 / (500 + m.physicalDefense))
  close(magic, 500 / (500 + m.magicDefense))
  close(gear.armorDamageMultiplier(armor, 'hybrid'), (physical + magic) / 2)
  close(gear.armorDamageMultiplier(null, 'physical'), 1)
  assert.throws(() => gear.armorDamageMultiplier(armor, 'fire'))
  assert.equal(gear.armorModifiers(pick('recovery')).magicDefense,0)
})
test('armor has no cooldown affix; ring cooldown cap and explicit cast timing remain independent', () => {
  const armor = pick('recovery'), ring = pick('cadence', 'fa', 1, 'ring')
  const m = gear.armorModifiers(armor)
  assert.equal(m.cooldownReduction,0)
  close(timing.skillCooldown(10, { armor, ring }), 10 * (1 - m.cooldownReduction - gear.ringCooldownReduction(ring)))
  assert.equal(typeof timing.cooldownFromBonuses, 'function')
  close(timing.cooldownFromBonuses(10, [.2, .25]), 7)
  assert.equal(typeof timing.applyCastSpeed, 'function')
  close(timing.applyCastSpeed(2, .25), 2)
  close(timing.applyCastSpeed(2, .25, true), 1.6)
  close(timing.skillCastTime(2, { armor }, true), 2 / (1 + timing.equipmentCastSpeed({armor})))
  assert.ok(m.castSpeed > 0, 'caster armor now participates in body timing')
})
test('enemy physical and magical attacks have explicit types independent of their element', () => {
  const enemy = { radius: 20, damage: 100, role: 'normal' }
  assert.equal(enemyAttackSpec({ ...enemy, family: 'wolf' }, 50, 0).damageType, 'physical')
  assert.equal(enemyAttackSpec({ ...enemy, family: 'snake' }, 200, 0).damageType, 'magic')
  assert.equal(enemyAttackSpec({ ...enemy, family: 'falcon' }, 200, 0).damageType, 'physical')
  assert.equal(enemyAttackSpec({ ...enemy, family: 'bat' }, 200, 0).damageType, 'magic')
})
function runWithArmor(armor) {
  return new TowerRun({ attemptId: 9, floor: 1, seed: 4, xp: cultivationLevelXp(6), hp: 100,
    loadout: { growthVersion:1, active: {sj_yujian:1}, passive: {}, evolutions:[], evolutionLevels:{},
      tutorialWaves:0, weaponQuality:0, weaponRefine:0, weaponFocusCount:0,
      weapon: createIronWeapon(), weaponId: 'iron',
      armor, armorId: armor.id } })
}
test('real hostile projectiles apply the selected defense once and preserve types through restore', () => {
  assert.equal(typeof gear.armorDamageMultiplier, 'function')
  for (const damageType of ['physical', 'magic', 'hybrid']) {
    const armor = pick('guard'), run = runWithArmor(armor)
    run._projectile(run.state.player.x, run.state.player.y, 0, 0, 10, 20, true, { damageType })
    const snap = run.snapshot()
    assert.ok(validateTowerSnapshot(snap))
    const restored = TowerRun.restore(snap)
    const before = restored.state.player.hp
    restored.advance(1 / 60)
    close(before - restored.state.player.hp, 40 * gear.armorDamageMultiplier(armor, damageType))
    const sheet = characterCombatAttributes(restored.state.loadout)
    close(sheet.physicalReduction, 1 - gear.armorDamageMultiplier(armor, 'physical'))
    close(sheet.magicReduction, 1 - gear.armorDamageMultiplier(armor, 'magic'))
    const bad = structuredClone(snap)
    bad.projectiles[0].damageType = 'invalid'
    assert.equal(validateTowerSnapshot(bad), false)
  }
})
test('hostile zones preserve magic damage, reject invalid types and receive the no regeneration before the first three-second boundary', () => {
  const armor = pick('recovery'), run = runWithArmor(armor)
  run._zone('web', run.state.player.x, run.state.player.y, 100, 20, 1/60, 2, 1, 1, true, false)
  const snap = run.snapshot()
  assert.equal(snap.zones[0].damageType, 'magic')
  assert.ok(validateTowerSnapshot(snap))
  const bad = structuredClone(snap); bad.zones[0].damageType = 'invalid'
  assert.equal(validateTowerSnapshot(bad), false)
  const restored = TowerRun.restore(snap), before = restored.state.player.hp
  restored.advance(1/60)
  const loss = before - restored.state.player.hp
  close(loss, 40 * gear.armorDamageMultiplier(armor, 'magic'))
  close(restored.state.armorState.healedTotal,0)
})
test('each armor quality increases both damage-type survival; top variants retain physical and magical choices', () => {
  for (const tier of ['fa','bao','ling']) {
    for (const type of ['physical','magic']) {
      const survivability = item => (1000+10*equipmentBaseAttributes(gear.ARMORS.find(d=>d.id===item.definitionId)).vitality) / gear.armorDamageMultiplier(item,type)
      for (let q=2;q<=4;q++) {
        const pool = quality => gear.ARMORS.filter(d=>d.tier===tier&&d.quality===quality)
          .map(d=>gear.createFixedEquipment(d.id,d.id))
        assert.ok(Math.min(...pool(q).map(survivability)) > Math.max(...pool(q-1).map(survivability)), `${tier} q${q} ${type}`)
      }
      const graduate=pick('graduate',tier,4), master=pick('master',tier,4)
      const g=gear.armorModifiers(graduate),m=gear.armorModifiers(master)
      assert.ok(g.strength>m.strength&&m.intelligence>g.intelligence)
      assert.ok(g.physicalDefense>m.physicalDefense&&m.magicDefense===0&&g.magicDefense===0)
    }
    const guard=pick('guard',tier), recovery=pick('recovery',tier)
    assert.ok(gear.armorModifiers(guard).physicalDefense>gear.armorModifiers(recovery).physicalDefense)
    assert.equal(gear.armorModifiers(guard).magicDefense,0)
    assert.equal(gear.armorModifiers(guard).cooldownReduction,0)
    assert.equal(gear.armorModifiers(recovery).hpBonus,0);assert.equal(gear.armorModifiers(guard).hpBonus,0)
  }
})
