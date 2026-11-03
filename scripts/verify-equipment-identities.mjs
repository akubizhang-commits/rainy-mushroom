import fs from 'node:fs'
import assert from 'node:assert/strict'
import {EQUIPMENT_ROSTER} from '../js/xianxia/TowerEquipmentRoster.js'
import {createFixedWeapon,weaponSummary,validateWeapon} from '../js/xianxia/TowerWeapons.js'
import {createFixedEquipment,equipmentSummary,validateEquipment} from '../js/xianxia/TowerEquipment.js'
import {equipmentTier} from '../js/xianxia/TowerEquipmentTiers.js'
import {stats,characterCombatAttributes} from '../js/xianxia/TowerRun.js'
import {cultivationLevelXp} from '../js/xianxia/TowerProfile.js'
import {definitions,envelope} from './lib/equipment-budget.mjs'
import {WEAPON_TUNING} from '../js/xianxia/TowerWeaponTuning.js'
const out=process.argv[2]??'reports/equipment-identity-implementation-2026-11-03'
const rows=EQUIPMENT_ROSTER.map(d=>{const w=d.category==='weapon',i=w?createFixedWeapon(d.id,d.quality?d.id:'iron'):createFixedEquipment(d.id,d.quality?d.id:`basic-${d.category}`);assert.ok((w?validateWeapon:validateEquipment)(i));return {...d,item:i,summary:(w?weaponSummary:equipmentSummary)(i)}})
const budgets=definitions.filter(d=>d.category==='weapon').map(d=>({id:d.id,...envelope(d,WEAPON_TUNING[d.id]??{universal:0,flow:0})}))
assert.ok(budgets.filter(b=>b.id!=='eq_sword_taiheng').every(b=>b.max<=3.00001))
const ehp=(d,level)=>{const l={growthVersion:1,active:{sj_arc:1},passive:{},evolutions:[],evolutionLevels:{},armor:d.item};const s=stats(cultivationLevelXp(level),l),c=characterCombatAttributes(l);return {physical:s.maxHp/(1-c.physicalReduction),magic:s.maxHp/(1-c.magicReduction)}}
const cross=[]
for(const [old,next] of [['fa','bao'],['bao','ling']])for(const caster of [false,true]){
 const a=rows.find(d=>d.category==='armor'&&d.tier===old&&d.quality===4&&d.role===(caster?'master':'graduate'))
 const b=rows.find(d=>d.category==='armor'&&d.tier===next&&d.quality===3&&d.role===(caster?'recovery':'guard'))
 for(let level=equipmentTier(next).minLevel;level<=30;level++){const x=ehp(a,level),y=ehp(b,level);for(const type of ['physical','magic']){const ratio=y[type]/x[type];assert.ok(ratio>=1.05);cross.push({from:a.id,to:b.id,level,type,ratio})}}
}
const sameTier=[]
for(const tier of ['fa','bao','ling'])for(const caster of [false,true]){
 const a=rows.find(d=>d.category==='armor'&&d.tier===tier&&d.quality===1&&d.role===(caster?'recovery':'guard'))
 const b=rows.find(d=>d.category==='armor'&&d.tier===tier&&d.quality===4&&d.role===(caster?'master':'graduate'))
 for(let level=equipmentTier(tier).minLevel;level<=30;level++){const x=ehp(a,level),y=ehp(b,level);sameTier.push({tier,caster,level,physical:y.physical/x.physical,magic:y.magic/x.magic})}
}
const report={identities:rows.length,crossArmorMinimum:Math.min(...cross.map(x=>x.ratio)),budgetCases:budgets.reduce((n,x)=>n+x.count,0),staticBudgetMaxExcludingTaiheng:Math.max(...budgets.filter(x=>x.id!=='eq_sword_taiheng').map(x=>x.max)),limitations:['Budget includes new ring formation and conservative DOT uplift, but not equipment skill-level bonus; Taiheng unchanged by explicit user decision.','EHP excludes conditional shields and regeneration. Same-tier per-slot ratios are descriptive; no invented per-slot target.']}
fs.writeFileSync(`${out}/audit.json`,JSON.stringify({report,rows,budgets,crossArmor:cross,sameTierArmor:sameTier},null,2));console.log(report)
