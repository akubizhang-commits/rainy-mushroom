import {equipmentPrimaryBonuses} from '../js/xianxia/TowerEquipmentBases.js'
import {regenerationFraction} from '../js/xianxia/TowerAttributeRules.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import { characterCombatAttributes } from '../js/xianxia/TowerRun.js'
import { createIronWeapon } from '../js/xianxia/TowerWeapons.js'
import { createBasicEquipment, rollEquipment, armorModifiers, equipmentDamageMultiplier } from '../js/xianxia/TowerEquipment.js'
const plain = () => ({
  growthVersion: 1, passive: {}, weapon: createIronWeapon(),
  ring: createBasicEquipment('ring'), armor: createBasicEquipment('armor'),
})
const near = (a,b) => assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`)

test('starter sheet reports inactive effects without inventing focus chance or attack speed', () => {
  const loadout=plain(), before=JSON.stringify(loadout)
  const a=characterCombatAttributes(loadout)
  assert.equal(a.critChance,0)
  assert.equal(a.baseCritExtra,.5)
  for(const key of ['ringCritExtra','focusEvery','focusExtra','cooldownReduction',
    'damageBonus','pickupBonus','scarVulnerability','scarCooldown','killBurstShare'])
    assert.equal(a[key],0,key)
  assert.equal(a.physicalDefense,1);assert.equal(a.magicDefense,1)
  near(a.physicalReduction,1/501);near(a.magicReduction,1/501);near(a.reduction,1/501)
  assert.equal('focusChance' in a,false)
  assert.equal(a.attackSpeed,0)
  assert.equal(a.castSpeed,0);near(a.healthRegen,1/60)
  assert.equal(JSON.stringify(loadout),before)
})

test('equipped passives and rolled gear aggregate with combat damage bases and multiplicative defense', () => {
  const loadout=plain()
  loadout.passive={sj_heart:4,sj_bone:4,vajra:4,sj_spirit: 3,sj_mark:1,sj_gate:2}
  loadout.ring=rollEquipment('ring','ling',4,()=>.999999,'sheet-ring')
  loadout.armor=rollEquipment('armor','ling',4,()=>.999999,'sheet-armor')
  const value=(item,type)=>(item.affixes.find(a=>a.type===type)?.value??0)/100
  const a=characterCombatAttributes(loadout)
  near(a.critChance,.28+value(loadout.ring,'critChance'))
  assert.equal(a.baseCritExtra,.5)
  near(a.ringCritExtra,value(loadout.ring,'critBonus'))
  assert.equal(a.focusEvery,0)
  near(a.focusExtra,value(loadout.ring,'focus'))
  near(a.cooldownReduction,value(loadout.ring,'cooldownReduction')+armorModifiers(loadout.armor).cooldownReduction)
  near(a.damageBonus,.25)
  near(a.reduction,1-.85*equipmentDamageMultiplier(loadout,'hybrid'))
  near(a.healthRegen,regenerationFraction(loadout));near(a.castSpeed,.3+equipmentPrimaryBonuses(loadout).awareness/100+armorModifiers(loadout.armor).castSpeed)
  assert.equal(a.pickupBonus,.5)
  assert.equal(a.scarVulnerability,.2)
  assert.equal(a.scarCooldown,10)
  assert.equal(a.burstDamage,1.2)
  loadout.passive={}
  loadout.ring=createBasicEquipment('ring')
  const changed=characterCombatAttributes(loadout)
  assert.equal(changed.critChance,0)
  assert.equal(changed.focusEvery,0)
  near(changed.cooldownReduction,armorModifiers(loadout.armor).cooldownReduction)
})
