import test from 'node:test'
import assert from 'node:assert/strict'
import {trace,loadout,survival} from '../scripts/audit-boss-skill-survival.mjs'
import {equipmentDamageMultiplier,equipmentDefenses} from '../js/xianxia/TowerEquipment.js'

const cases=[[1,3,'M06'],[3,10,'M10'],[3,10,'M11'],[4,13,'M08'],[4,13,'M12'],
 [5,17,'M16'],[5,17,'M11'],[6,20,'M07'],[6,20,'M09'],[7,22,'M06'],
 [7,22,'M07'],[8,26,'M15'],[8,26,'M19'],[9,29,'M06'],[9,29,'M19']]
for(const [floor,level,id] of cases)test(`floor ${floor} ${id}: fixed-cadence budget is 3–5 full casts; better gear lasts longer`,()=>{
 const t=trace(floor,id),ordinary=survival(t,loadout(level,floor===1?0:2),level)
 assert.ok(ordinary.castsToDeath>=3&&ordinary.castsToDeath<=5,JSON.stringify(ordinary))
 if(floor>1){
  const low=survival(t,loadout(level,1),level)
  assert.ok(low.castsToDeath>=3&&low.castsToDeath<=5,JSON.stringify(low))
  const good=survival(t,loadout(level,4),level)
  assert.ok(good.castsToDeath===null||good.castsToDeath>ordinary.castsToDeath,JSON.stringify({ordinary,good}))
 }
})
test('high-rank early elite mechanics retain the floor safety cap before the approved 1.25 boost',()=>{
 for(const [floor,id,elite] of [[2,'M06','boar_elite_f2_w15_n4'],[3,'M07','bat_elite_f3_w10_n2']]){
  const eliteTrace=trace(floor,id,elite),bossTrace=trace(floor,id)
  // 79-monster-rank-role: November 4 boost follows the existing 80% cap.
  const capped=bossTrace.events[0].damage*.8*1.25
  assert.ok(Math.abs(eliteTrace.events[0].damage-capped)<1e-9)
 }
})
test('overlapping poison pools count seven accepted ticks, not fifteen stacked hits',()=>{
 const t=trace(4,'M12')
 assert.equal(t.events.length,15)
 assert.equal(t.accepted.length,7)
})
test('defense adds effective health independently of vitality, with separate physical/magic routes',()=>{
 for(const level of [10,20,29]){
  const low=loadout(level,2),high=loadout(level,4)
  for(const type of ['physical','magic']){
   const defense=equipmentDefenses(low)[type==='physical'?'physicalDefense':'magicDefense']
   assert.ok(Math.abs(equipmentDamageMultiplier(low,type)-500/(500+defense))<1e-10)
   assert.ok(equipmentDamageMultiplier(high,type)<equipmentDamageMultiplier(low,type))
  }
  assert.equal(equipmentDamageMultiplier(low,'hybrid'),
   (equipmentDamageMultiplier(low,'physical')+equipmentDamageMultiplier(low,'magic'))/2)
 }
})
