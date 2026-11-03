import assert from 'node:assert/strict'
import fs from 'node:fs'
import {definitions,envelope,baseAttack} from './lib/equipment-budget.mjs'
import {WEAPON_TUNING} from '../js/xianxia/TowerWeaponTuning.js'
import * as weapons from '../js/xianxia/TowerWeapons.js'
import * as equipment from '../js/xianxia/TowerEquipment.js'
import * as oldWeapons from '../reports/equipment-rebalance-2026-11-02/before/js/xianxia/TowerWeapons.js'
import * as oldEquipment from '../reports/equipment-rebalance-2026-11-02/before/js/xianxia/TowerEquipment.js'
import {stats} from '../js/xianxia/TowerRun.js'
import {cultivationLevelXp} from '../js/xianxia/TowerProfile.js'
import {outgoingDamageFactor,regenerationFraction} from '../js/xianxia/TowerAttributeRules.js'
const output='reports/equipment-rebalance-2026-11-02'
const make=(d,old=false)=>d.category==='weapon'?(old?oldWeapons:weapons).createFixedWeapon(d.id,d.quality?d.id:'iron')
 :(old?oldEquipment:equipment).createFixedEquipment(d.id,d.quality?d.id:`basic-${d.category}`)
const summary=(d,old=false)=>d.category==='weapon'?(old?oldWeapons:weapons).weaponSummary(make(d,old))
 :(old?oldEquipment:equipment).equipmentSummary(make(d,old))
const rows=definitions.map(d=>({id:d.id,name:d.name,category:d.category,tier:d.tier,quality:d.quality,role:d.role,before:summary(d,true),after:summary(d)}))
const budgets=definitions.filter(d=>d.category==='weapon').map(d=>({id:d.id,...envelope(d,WEAPON_TUNING[d.id]??{universal:0,flow:0})}))
assert.ok(budgets.every(r=>Number.isFinite(r.max)&&r.max<=3.000001))
const dominance=[]
const vector=s=>({...s.baseAttributes,...Object.fromEntries(s.affixes.map(a=>[a.type+':'+(a.target||''),a.value]))})
for(const a of rows)for(const b of rows)if(a.id!==b.id&&a.category===b.category&&a.tier===b.tier&&a.quality===b.quality){
 const x=vector(a.after),y=vector(b.after),keys=[...new Set([...Object.keys(x),...Object.keys(y)])]
 if(keys.every(k=>(x[k]||0)>=(y[k]||0))&&keys.some(k=>(x[k]||0)>(y[k]||0)))dominance.push({better:a.id,worse:b.id})
}
assert.deepEqual(dominance,[])
const quality=[],survival=[],reference=[],crossTier=[]
for(const tier of ['fa','bao'])for(const old of definitions.filter(d=>d.category==='weapon'&&d.tier===tier&&d.quality===4)){
 for(const channel of ['physical','hybrid']){
  const next=definitions.find(d=>d.category==='weapon'&&d.tier===({fa:'bao',bao:'ling'}[tier])&&d.quality===3&&d.role===(channel==='physical'?'qi':'formation'))
  for(let level=next.minLevel;level<=30;level++){
   const power=d=>{
    const l={weapon:make(d),passive:{}},s=stats(cultivationLevelXp(level),l),id=channel==='physical'?'sj_arc':'sj_formation'
    return channel==='physical'?s.attack*outgoingDamageFactor(l,id,'physical',true):
     (s.attack*outgoingDamageFactor(l,id,'physical',true)+s.magicAttack*outgoingDamageFactor(l,id,'magic',true))/2
   }
   const gain=power(next)/power(old)-1
   assert.ok(gain>=.05-1e-6,JSON.stringify({old:old.id,next:next.id,level,channel,gain}))
   crossTier.push({old:old.id,next:next.id,level,channel,gain})
  }
 }
}
for(const tier of ['fa','bao','ling']){
 const ws=definitions.filter(d=>d.category==='weapon'&&d.tier===tier)
 for(const d of ws.filter(d=>d.quality<4)){
  for(const channel of d.role==='general'?['physical','hybrid']:[d.role==='qi'?'physical':'hybrid']){
   const next=ws.find(n=>n.quality===d.quality+1&&n.role===(d.quality===3?(channel==='physical'?'graduate':'master'):d.role))
   for(let level=d.minLevel;level<=30;level++){
    const power=d=>{
     const l={weapon:make(d),passive:{}},s=stats(cultivationLevelXp(level),l),skill=channel==='physical'?'sj_arc':'sj_formation'
     return channel==='physical'?s.attack*outgoingDamageFactor(l,skill,'physical',true):
      (s.attack*outgoingDamageFactor(l,skill,'physical',true)+s.magicAttack*outgoingDamageFactor(l,skill,'magic',true))/2
    }
    const gain=power(next)/power(d)-1
    assert.ok(gain>=.05-1e-6,JSON.stringify({id:d.id,next:next.id,level,channel,gain}))
    quality.push({id:d.id,next:next.id,level,channel,gain})
   }
  }
 }
 for(const martial of [true,false]){
  const defs=q=>['weapon','armor','ring'].map(category=>definitions.find(d=>d.category===category&&d.tier===tier&&d.quality===q&&d.role===(q===4?(martial?'graduate':'master'):category==='weapon'?(martial?'qi':'formation'):category==='armor'?(martial?'guard':'recovery'):(martial?'burst':'cadence'))))
  for(let level=ws[0].minLevel;level<=30;level++){
   const cases=[1,2,3,4].map(q=>{
    const ds=defs(q),l={...Object.fromEntries(ds.map(d=>[d.category,make(d)])),passive:{}},s=stats(cultivationLevelXp(level),l)
    const EHP=Object.fromEntries(['physical','magic','hybrid'].map(type=>[type,s.maxHp/equipment.equipmentDamageMultiplier(l,type)]))
    assert.ok(regenerationFraction(l)<=.025+1e-7)
    return {q,hp:s.maxHp,EHP,regenPer3s:s.maxHp*regenerationFraction(l)}
   })
   for(let i=1;i<cases.length;i++)for(const type of ['physical','magic','hybrid'])assert.ok(cases[i].EHP[type]>cases[i-1].EHP[type])
   survival.push({tier,martial,level,cases,topVsLow:Object.fromEntries(['physical','magic','hybrid'].map(t=>[t,cases[3].EHP[t]/cases[0].EHP[t]]))})
  }
  for(const q of [1,2,3,4]){
   const ds=defs(q),level={fa:7,bao:15,ling:25}[tier],l={...Object.fromEntries(ds.map(d=>[d.category,make(d)])),passive:{}},s=stats(cultivationLevelXp(level),l)
   const id=martial?'sj_arc':'sj_formation',damage=martial?s.attack*outgoingDamageFactor(l,id,'physical',true):
    (s.attack*outgoingDamageFactor(l,id,'physical',true)+s.magicAttack*outgoingDamageFactor(l,id,'magic',true))/2
   reference.push({tier,q,martial,level,meanHitRatio:damage/(baseAttack(level)+5),ids:ds.map(d=>d.id)})
  }
 }
}
const report={identities:rows.length,changed:rows.filter(r=>JSON.stringify(vector(r.before))!==JSON.stringify(vector(r.after))).length,
 budgetCases:budgets.reduce((n,r)=>n+r.count,0),maxBudget:Math.max(...budgets.map(r=>r.max)),dominance,
 minimumQualityGain:Math.min(...quality.map(r=>r.gain)),maximumQualityGain:Math.max(...quality.map(r=>r.gain)),
 minimumCrossTierGain:Math.min(...crossTier.map(r=>r.gain)),
 ehpTopVsLow:{min:Math.min(...survival.flatMap(r=>Object.values(r.topVsLow))),max:Math.max(...survival.flatMap(r=>Object.values(r.topVsLow)))},
 limitations:['Envelope uses expected attack and criticals, not finite-time DPS or a per-hit cap.',
 'Cast and cooldown speed use their maximum, not their product; frame quantization, competition and target uptime need runtime samples.',
 'No humanoid pass-rate or economic acquisition verdict from this deterministic audit.']}
fs.writeFileSync(`${output}/audit.json`,JSON.stringify({report,rows,budgets,quality,crossTier,survival,reference},null,2)+'\n')
fs.writeFileSync(`${output}/equipment-values.csv`,'id,name,category,tier,quality,role,before,after\n'+rows.map(r=>[r.id,r.name,r.category,r.tier,r.quality,r.role,JSON.stringify(vector(r.before)),JSON.stringify(vector(r.after))].map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\n')+'\n')
console.log(JSON.stringify(report,null,2))
