import {EQUIPMENT_RANGES} from '../js/xianxia/TowerEquipmentRanges.js'
import {equipmentBaseAttributes} from '../js/xianxia/TowerEquipmentBases.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import {WEAPONS,createFixedWeapon,validateWeapon,weaponFlatAttack,weaponDamageModifiers} from '../js/xianxia/TowerWeapons.js'
import {EQUIPMENT,createFixedEquipment,validateEquipment,ringDamageModifiers,ringCooldownReduction,armorModifiers} from '../js/xianxia/TowerEquipment.js'
import {equipmentTier} from '../js/xianxia/TowerEquipmentTiers.js'
// Retired random A/S/F slot ceilings are not fixed-identity budgets. These
// independent ceilings bound each new component; the exhaustive mixed-item
// legacy two-slot screen lives in xianxia-equipment-eight-tier-budget.test.mjs.
// Real three-slot DPS and the unresolved global cap are reported by
// verify-equipment-integer-runtime.mjs / audit-equipment-integer.mjs.
const skills=['sj_yujian','sj_shadow','sj_arc','sj_line','sj_cross','sj_wanjian','sj_formation','evo_wanjian','evo_tiandi','evo_wuwo','evo_sixiang']
const weapon=d=>createFixedWeapon(d.id,d.quality?'budget-w':'iron')
const item=d=>createFixedEquipment(d.id,d.quality?'budget-e':`basic-${d.category}`)
test('fixed weapons remain below4.5x standalone including fixed attack and every skill/type',()=>{
 for(const d of WEAPONS){
  const w=weapon(d),B=equipmentTier(d.tier).referenceAttack
  assert.ok(validateWeapon(w));assert.equal(w.refine,0)
  for(const skill of skills)for(const type of ['physical','hybrid','magic']){
   const m=weaponDamageModifiers(w,skill,type)
   assert.deepEqual([m.special,m.lifesteal],[0,0]);assert.ok(m.critChance>=0&&m.critBonus>=0)
   assert.ok((B+weaponFlatAttack(w))/(B+5)*(1+m.flat+m.critChance*(.5+m.critBonus))<=4.5+1e-10,d.id)
  }
 }
})
// The integer V2 contract defines component ranges, not the retired 20% ring envelope.
test('ring offense and armor survival remain inside approved per-component ranges',()=>{
 for(const d of EQUIPMENT.filter(d=>d.quality)){
  const instance=item(d),base=equipmentBaseAttributes(d),range=EQUIPMENT_RANGES[`${d.tier}:${d.quality}`]
  const slot=range[d.category],ordinary=range.ordinary
  assert.ok(validateEquipment(instance,d.category))
  const defense=base[d.category==='armor'?'physicalDefense':'magicDefense']
  assert.ok(defense>=slot.defense[0]&&defense<=slot.defense[1],d.id)
  const v=Object.fromEntries(instance.affixes.map(a=>[a.type,a.value]))
  if(d.category==='ring'){
   assert.ok(!(v.critChance&&v.cooldownReduction),d.id)
   for(const [key,bounds] of [['critChance',ordinary.crit],['critBonus',ordinary.critBonus],['cooldownReduction',ordinary.cdr]])
    if(v[key])assert.ok(v[key]>=bounds[0]&&v[key]<=bounds[1],d.id+'/'+key)
  }else{
   assert.equal(armorModifiers(instance).hpBonus,0)
   assert.ok(base.vitality>=slot.vitality[0]&&base.vitality<=slot.vitality[1],d.id)
   assert.ok(v.healthRegen>0&&v.healthRegen<=2.5,d.id)
   assert.ok(!(v.attackSpeed&&v.castSpeed),d.id)
  }
 }
})
