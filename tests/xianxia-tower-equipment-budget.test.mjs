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
test('fixed weapon attack-and-affix coefficients remain below4.5x, before primary stats and special effects',()=>{
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
test('ring role budgets match the independent approved v2 percent ranges',()=>{
 // [skill damage, crit chance, crit bonus, CDR], in percentage points.
 const ranges={fan:[[[1,2],[2,2],[3,3],null]],
  fa:[[[3,5],[3,4],[5,7],[3,4]],[[5,6],[4,5],[7,9],[4,5]],[[6,8],[5,7],[9,12],[5,6]],[[8,10],[7,9],[12,15],[6,8]]],
  bao:[[[6,8],[5,7],[9,12],[4,5]],[[8,10],[7,8],[12,15],[5,7]],[[10,12],[8,10],[15,18],[7,9]],[[12,14],[10,12],[18,22],[9,11]]],
  ling:[[[9,11],[8,10],[15,18],[6,8]],[[11,13],[10,12],[18,22],[8,10]],[[13,15],[12,14],[22,26],[10,12]],[[15,18],[14,16],[26,30],[12,15]]],
 }
 const within=(n,b,id)=>assert.ok(b&&n>=b[0]&&n<=b[1],`${id}: ${n} outside ${b}`)
 for(const d of EQUIPMENT.filter(d=>d.category==='ring'&&d.quality)){
  const r=item(d),m=ringDamageModifiers(r),bounds=ranges[d.tier][d.quality-1],burst=['transition','burst','graduate'].includes(d.role)
  assert.ok(validateEquipment(r,'ring'));assert.equal(r.refine,0);assert.equal(m.special,0)
  const v=Object.fromEntries(r.affixes.map(a=>[a.type,a.value]))
  if(['eq_ring_weiming','eq_ring_dingwei'].includes(d.id)){
   assert.equal(v.skillDamage,bounds[0][0]-5)
   within(v.dotDamage??v.formationDamage,[10,14],d.id)
  }else within(v.skillDamage,bounds[0],d.id)
  if(burst){within(v.critChance,bounds[1],d.id);within(v.critBonus,bounds[2],d.id);assert.equal(ringCooldownReduction(r),0)}
  else {within(v.cooldownReduction,bounds[3],d.id);assert.equal(m.critChance,0);assert.equal(m.critBonus,0)}
 }
})
test('armor uses finite periodic recovery and the global2.5percent pulse cap, with no per-floor bank',async()=>{
 const {regenerationFraction}=await import('../js/xianxia/TowerAttributeRules.js')
 const base=1/60,cap=1/40
 for(const d of EQUIPMENT.filter(d=>d.category==='armor'&&d.quality)){
  const a=item(d),m=armorModifiers(a),l={armor:a}
  assert.ok(validateEquipment(a,'armor'));assert.equal(a.refine,0)
  assert.equal(m.hpBonus,0);assert.equal(m.cooldownReduction,0)
  assert.ok(m.healthRegen>=.2&&m.healthRegen<=.8,d.id)
  assert.equal(regenerationFraction(l),Math.min(cap,base+m.healthRegen/100))
  const state={time:10,armorState:{lastHitAt:0}}
  assert.ok(regenerationFraction(l,state)<=cap+1e-12,d.id)
  for(const retired of ['healFraction','healDelay','healCooldown','healFloorCap'])assert.equal(retired in m,false)
 }
})
