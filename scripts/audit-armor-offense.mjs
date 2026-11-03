import {writeFileSync,mkdirSync} from 'node:fs'
import assert from 'node:assert/strict'
import {ARMORS,createFixedEquipment,createBasicEquipment,armorModifiers,equipmentSummary} from '../js/xianxia/TowerEquipment.js'
import {equipmentTier} from '../js/xianxia/TowerEquipmentTiers.js'
import {cultivationLevelXp} from '../js/xianxia/TowerProfile.js'
import {stats} from '../js/xianxia/TowerRun.js'
import {equipmentCastSpeed,castActionTiming} from '../js/xianxia/TowerSkillTiming.js'
import {createIronWeapon} from '../js/xianxia/TowerWeapons.js'
const rows=[],bounds=[]
for(const d of ARMORS.filter(d=>d.quality&&d.tier!=='fan')){
 const item=createFixedEquipment(d.id,d.id),m=armorModifiers(item),tier=equipmentTier(d.tier)
 const l={growthVersion:1,weapon:createIronWeapon(),passive:{},armor:item}
 const plain={...l,armor:createBasicEquipment('armor')}
 const ownEhp=type=>(1+m.hpBonus)/(1-m[`${type}Reduction`])
 rows.push({name:equipmentSummary(item).name,role:m.strength?'守御武斗':'回复术法',
   tier:d.tier,quality:d.quality,modifiers:m,physicalEhp:ownEhp('physical'),magicEhp:ownEhp('magic')})
 for(let level=tier.minLevel;level<=30;level++){
  const xp=cultivationLevelXp(level),a=stats(xp,l),b=stats(xp,plain)
  const physical=a.attack/b.attack,magic=a.magicAttack/b.magicAttack
  const body=castActionTiming('sj_line',3,equipmentCastSpeed(plain,xp)).duration
    /castActionTiming('sj_line',3,equipmentCastSpeed(l,xp)).duration
  // These are isolated contributions, never claimed as whole-build DPS.
  // The selected point tables peak at bao q4: 20/(269.8656+5)=7.2763%.
  assert.ok(physical>=1&&physical<=1.075&&magic>=1&&magic<=1.075)
  assert.ok(m.attackSpeed<=.08&&m.castSpeed<=.16)
  bounds.push({id:d.id,level,physicalAttackRatio:physical,magicAttackRatio:magic,castBodyThroughputRatio:body})
 }
}
for(const tier of ['fa','bao','ling'])for(let q=1;q<=4;q++){
 const [a,b]=rows.filter(r=>r.tier===tier&&r.quality===q)
 assert.ok(a.modifiers.strength>b.modifiers.strength&&b.modifiers.intelligence>a.modifiers.intelligence)
 assert.ok(a.modifiers.physicalDefense>b.modifiers.physicalDefense&&b.modifiers.magicDefense>a.modifiers.magicDefense)
}
const maxima={physicalAttackRatio:Math.max(...bounds.map(r=>r.physicalAttackRatio)),
 magicAttackRatio:Math.max(...bounds.map(r=>r.magicAttackRatio)),
 castBodyThroughputRatio:Math.max(...bounds.map(r=>r.castBodyThroughputRatio))}
const out=new URL('../reports/armor-offense-2026-11-02/',import.meta.url);mkdirSync(out,{recursive:true})
writeFileSync(new URL('balance.json',out),JSON.stringify({rows,bounds,maxima},null,2)+'\n')
console.log(JSON.stringify({armorCount:rows.length,legalLevelCases:bounds.length,maxima,
 note:'Attack ratios use starter weapon at the same level; body throughput is not DPS. No randomized combat or encounter win-rate claim.'},null,2))
