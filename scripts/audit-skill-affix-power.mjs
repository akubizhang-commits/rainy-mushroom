import {writeFileSync,readFileSync} from 'node:fs'
import {GROWTH_SKILLS} from '../js/xianxia/TowerGrowth.js'
import {COMBAT_SKILLS,COMBAT_EVOLUTIONS} from '../js/xianxia/TowerCombatSkills.js'
import {applyEquipmentSkillLevels} from '../js/xianxia/TowerEquipmentSkillLevels.js'
import {createFixedWeapon,createIronWeapon} from '../js/xianxia/TowerWeapons.js'
import {createFixedEquipment} from '../js/xianxia/TowerEquipment.js'
import {stats,characterCombatAttributes} from '../js/xianxia/TowerRun.js'
import {outgoingDamageFactor} from '../js/xianxia/TowerAttributeRules.js'
import {cultivationLevelXp} from '../js/xianxia/TowerProfile.js'
const defs=Object.fromEntries([...COMBAT_SKILLS,...COMBAT_EVOLUTIONS].map(d=>[d.id,d]))
const field=(d,k,lv)=>Array.isArray(d[k])?d[k][lv-1]:d[k]
function damage(input,id,level){const l=applyEquipmentSkillLevels(input),s=stats(cultivationLevelXp(level),l),d=defs[id],e=d.kind==='evolution'?d:null,b=e?defs[e.parent]:d,rank=l.active[b.id];let budget=field(b,'damage',rank)*(e?field(e,'budgetMultipliers',l.evolutionLevels[id]):1);if(id==='sj_yujian')budget*=field(b,'sword_damage_share',rank);const type=d.damageType,c=characterCombatAttributes(l),physical=s.attack*outgoingDamageFactor(l,id,'physical',true),magic=s.magicAttack*outgoingDamageFactor(l,id,'magic',true);return budget*(type==='physical'?physical:type==='magic'?magic:(physical+magic)/2)*(1+c.critChance*c.physicalCritExtra)}
const rows=[]
for(const level of [11,21,25,30])for(const weaponId of ['eq_sword_zhaodan','eq_sword_taiheng']){
 if(weaponId==='eq_sword_taiheng'&&level<21)continue
 const w=createFixedWeapon(weaponId,'sample'),tier=level<21?'fa':'ling'
 // Pick actual current highest-quality identities from the full audit.
 const roster=JSON.parse(readFileSync('reports/equipment-affix-review-2026-11-03/audit.json')).rows
 const armor=roster.find(d=>d.category==='armor'&&d.tier===tier&&d.quality===4&&['master','recovery'].includes(d.role))??roster.find(d=>d.category==='armor'&&d.tier===tier&&d.quality===4)
 const ring=roster.find(d=>d.category==='ring'&&d.tier===tier&&d.quality===4)
 for(const d of GROWTH_SKILLS.filter(d=>d.kind==='active'))for(let rank=1;rank<=d.maxLevel;rank++){
 if(d.rankRequirements[rank-1].characterLevel>level)continue
 for(const passive of [{},{sj_heart:1,sj_bone:1}]){
 if(level<14&&passive.sj_bone)continue
 const base={growthVersion:1,active:{[d.id]:rank},passive,evolutions:[],evolutionLevels:{}}
 const starter={...base,weapon:createIronWeapon(),armor:createFixedEquipment('eq_armor_basic','basic-armor'),ring:createFixedEquipment('eq_ring_basic','basic-ring')}
 const loadout={...base,weapon:w,armor:armor.item,ring:ring.item}
 const ratio=damage(loadout,d.id,level)/damage(starter,d.id,level)
 rows.push({weaponId,level,skill:d.id,rank,passive,armor:armor.id,ring:ring.id,ratio})
 }
 }
}
rows.sort((a,b)=>b.ratio-a.ratio);writeFileSync('reports/equipment-affix-review-2026-11-03/skill-power.json',JSON.stringify({method:'Expected damage per common skill unit, same trained skills and level, three equipped slots vs starter slots; no scheduling speed or DOT stacks. Selected highest-quality gear, not an exhaustive envelope.',rows},null,2));console.log(rows.slice(0,5))
