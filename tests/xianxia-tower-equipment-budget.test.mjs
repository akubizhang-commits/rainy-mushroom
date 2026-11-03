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
test('fixed ring continuum envelope stays below20% standalone with full focus and cooldown acceleration',()=>{
 for(const d of EQUIPMENT.filter(d=>d.category==='ring')){
  const r=item(d),m=ringDamageModifiers(r),R=ringCooldownReduction(r)
  assert.ok(validateEquipment(r,'ring'));assert.equal(r.refine,0)
  // For all native p in[0,1], crit extra q in[0,.5], focus z in[0,1],
  // added numerator <= U+.5*C+K+X; denominator before CDR is at least1.
  assert.ok((1+(m.skillDamage||0)+.5*m.critChance+m.critBonus+m.special)/(1-R)<=1.20+1e-10,d.id)
  assert.ok(m.critChance<=.1&&m.critBonus<=.03&&R<=.025&&m.special<=.004)
 }
})
test('armor retains31%HP,17%reduction,1%recovery,20s cooldown and10% per-floor healing limits',()=>{
 for(const d of EQUIPMENT.filter(d=>d.category==='armor'&&d.quality)){
  const a=item(d),m=armorModifiers(a)
  assert.ok(validateEquipment(a,'armor'));assert.equal(a.refine,0)
  assert.ok(m.hpBonus<=.31&&m.reduction<=.17&&m.healFraction<=.01,d.id)
  assert.equal(m.healFloorCap,.1);assert.equal(m.healCooldown,20);assert.equal(m.healDelay,d.quality===4?2:3)
  // A resource upper bound, not fictitious actual healing at full health.
  assert.ok((1+m.hpBonus)*(1+m.healFloorCap)/(1-m.reduction)<=1.31*1.1/.83+1e-10)
 }
})
