import fs from 'node:fs'
import {EQUIPMENT_ROSTER} from '../js/xianxia/TowerEquipmentRoster.js'
import {equipmentBaseAttributes} from '../js/xianxia/TowerEquipmentBases.js'
import {equipmentTier} from '../js/xianxia/TowerEquipmentTiers.js'
import {createFixedWeapon,weaponSummary,createIronWeapon} from '../js/xianxia/TowerWeapons.js'
import {createFixedEquipment,equipmentSummary} from '../js/xianxia/TowerEquipment.js'
import {stats,characterCombatAttributes} from '../js/xianxia/TowerRun.js'
import {outgoingDamageFactor} from '../js/xianxia/TowerAttributeRules.js'
import {cultivationLevelXp} from '../js/xianxia/TowerProfile.js'
const rows=EQUIPMENT_ROSTER.map(d=>{const w=d.category==='weapon',item=w?createFixedWeapon(d.id,d.quality?d.id:'iron'):createFixedEquipment(d.id,d.quality?d.id:`basic-${d.category}`);return {...d,base:equipmentBaseAttributes(d),item,summary:(w?weaponSummary:equipmentSummary)(item)}})
const comparisons=[]
function power(r,level,heart=0){const l={growthVersion:1,active:{sj_arc:1},passive:heart?{sj_heart:heart}:{},evolutions:[],evolutionLevels:{},weapon:createIronWeapon(),[r.category]:r.item};const s=stats(cultivationLevelXp(level),l),c=characterCombatAttributes(l),crit=1+c.critChance*c.physicalCritExtra;return {physical:s.attack*outgoingDamageFactor(l,'sj_arc','physical',true)*crit,magic:s.magicAttack*outgoingDamageFactor(l,'sj_shadow','magic',true)*crit}}
for(const tier of ['fa','bao','ling']){
 const a=rows.find(d=>d.category==='ring'&&d.tier===tier&&d.role==='graduate'),b=rows.find(d=>d.category==='ring'&&d.tier===tier&&d.role==='master')
 for(let level=equipmentTier(tier).minLevel;level<=30;level++)for(const heart of [0,4]){if(heart===4&&level<14)continue;const x=power(a,level,heart),y=power(b,level,heart);comparisons.push({tier,level,heart,a:a.name,b:b.name,physicalRatio:y.physical/x.physical,magicRatio:y.magic/x.magic,hybridRatio:(y.physical+y.magic)/(x.physical+x.magic)})}
}
const groups=[]
for(const category of ['weapon','armor','ring'])for(const tier of ['fa','bao','ling'])for(let q=1;q<=4;q++){
 const rs=rows.filter(d=>d.category===category&&d.tier===tier&&d.quality===q)
 groups.push({category,tier,q,names:rs.map(d=>d.name),effectTypeSignatures:rs.map(d=>d.item.affixes.map(a=>a.type+':'+(a.target||'')).sort().join('|')),specialLines:rs.map(d=>d.summary.specialLines),baseKeys:rs.map(d=>Object.keys(d.base).sort().join('|'))})
}
const out=process.argv[2]||'reports/equipment-slot-review-2026-11-03';fs.mkdirSync(out,{recursive:true});fs.writeFileSync(`${out}/review.json`,JSON.stringify({rows,groups,ringComparisons:comparisons,method:'Ring expected skill damage: isolate ring slot, same character level/learned heart rank, starter weapon; no scheduling or enemies. Extreme crit builds beyond current heart ranks not sampled.'},null,2))
for(const tier of ['fa','bao','ling']){const r=comparisons.filter(r=>r.tier===tier);console.log(tier,r[0].a,r[0].b,'physical',Math.min(...r.map(x=>x.physicalRatio)),Math.max(...r.map(x=>x.physicalRatio)),'hybrid',Math.min(...r.map(x=>x.hybridRatio)),Math.max(...r.map(x=>x.hybridRatio)))}
for(const category of ['weapon','armor','ring']){console.log('\n'+category);for(const r of rows.filter(d=>d.category===category&&d.tier==='ling'&&d.quality===4||d.category===category&&d.tier==='fa'&&d.quality===1))console.log(r.name,r.base,r.item.affixes)}
const progression=[]
for(const category of ['weapon','armor','ring'])for(const tier of ['fa','bao','ling'])for(const lane of [0,1]){
 const roles=category==='weapon'?[lane?'formation':'qi',lane?'master':'graduate']:category==='armor'?[lane?'recovery':'guard',lane?'master':'graduate']:[lane?'cadence':'burst',lane?'master':'graduate']
 const rs=[1,2,3,4].map(q=>rows.find(d=>d.category===category&&d.tier===tier&&d.quality===q&&d.role===roles[q===4?1:0]))
 progression.push({category,tier,lane,items:rs.map(d=>({name:d.name,base:d.base,affixes:d.item.affixes})),coreNondecreasing:rs.every((r,i)=>!i||(category==='weapon'?(lane?(r.base.physicalAttack+r.base.magicAttack)/2:r.base.physicalAttack):(r.base.physicalDefense??r.base.magicDefense))>=(category==='weapon'?(lane?(rs[i-1].base.physicalAttack+rs[i-1].base.magicAttack)/2:rs[i-1].base.physicalAttack):(rs[i-1].base.physicalDefense??rs[i-1].base.magicDefense)))})
}
const crossArmor=[]
for(const [oldTier,newTier] of [['fa','bao'],['bao','ling']])for(const lane of [0,1]){const a=rows.find(d=>d.category==='armor'&&d.tier===oldTier&&d.quality===4&&d.role===(lane?'master':'graduate')),b=rows.find(d=>d.category==='armor'&&d.tier===newTier&&d.quality===3&&d.role===(lane?'recovery':'guard'));for(const level of [equipmentTier(newTier).minLevel,30]){const ehp=r=>{const l={growthVersion:1,active:{sj_arc:1},passive:{},evolutions:[],evolutionLevels:{},weapon:createIronWeapon(),armor:r.item};const s=stats(cultivationLevelXp(level),l),c=characterCombatAttributes(l);return {physical:s.maxHp/(1-c.physicalReduction),magic:s.maxHp/(1-c.magicReduction)}};const x=ehp(a),y=ehp(b);crossArmor.push({a:a.name,b:b.name,level,physicalRatio:y.physical/x.physical,magicRatio:y.magic/x.magic})}}
fs.writeFileSync(`${out}/progression.json`,JSON.stringify({progression,crossArmor},null,2));console.log('core decreases',progression.filter(r=>!r.coreNondecreasing));console.log('armor cross-tier isolated EHP',crossArmor)
