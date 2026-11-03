import {capIdentityWeapons} from './lib/cap-identity-weapons.mjs'
// Offline deterministic calibration; runtime receives only fixed authored values.
import fs from 'node:fs'
import {capDotWeapons} from './lib/cap-dot-weapons.mjs'
import {definitions,visitWeaponBudget} from './lib/equipment-budget.mjs'
import {EQUIPMENT_ROSTER} from '../js/xianxia/TowerEquipmentRoster.js'
import {weaponBasePoints} from '../js/xianxia/TowerWeaponBases.js'
import {RINGS,ARMORS,createFixedEquipment,ringDamageModifiers,ringCooldownReduction,armorModifiers} from '../js/xianxia/TowerEquipment.js'
import {equipmentTier} from '../js/xianxia/TowerEquipmentTiers.js'
import {cultivationAt,cultivationLevelXp} from '../js/xianxia/TowerProfile.js'
const targets={fan:[1,1.05],fa:[0,1.15,1.32,1.52,1.75],bao:[0,1.45,1.67,1.92,2.2],ling:[0,1.85,2.13,2.45,2.8]}
const base=level=>100*cultivationAt(cultivationLevelXp(level)).attackMultiplier
const rings=RINGS.map(d=>({d,item:createFixedEquipment(d.id,d.quality?'tune-ring':'basic-ring')}))
const values={}
for(const d of EQUIPMENT_ROSTER.filter(d=>d.category==='weapon'&&d.quality)){
 const {tier,quality:q,role}=d,points=weaponBasePoints(d),spec=['qi','formation'].includes(role)
 const level={fan:1,fa:7,bao:15,ling:25}[tier],B=base(level)
 const ring=rings.find(r=>r.d.tier===tier&&r.d.quality===q&&(q===4?r.d.role==='graduate':tier==='fan'||r.d.role==='burst')).item
 const element=tier==='bao'?.5+q*.25:tier==='ling'?1+q*.25:0
 const critChance={fan:.1,fa:.15,bao:.2,ling:.25}[tier]*q,critBonus=critChance*2
 const onHit={fan:.5,fa:1,bao:1.5,ling:2}[tier]
 const best=role==='formation'?(points.physical+points.magic)/2:points.physical
 function ratio(u,flatAttack,level,r,p,bone,armorCDR=0){
  const m=ringDamageModifiers(r),b=base(level)
  const bonus=1+u/100+element/100, factor=bonus+(spec?.05*(bonus+.25):0)
  const crit=1+Math.min(1,p+m.critChance+critChance/100)*(.5+m.critBonus+critBonus/100)
  return (b+flatAttack)/(b+5)*(factor*(1+(m.skillDamage||0))+bone)/(1+bone)*crit/(1+p*.5)*(1+onHit/100)/(1-Math.min(.3,ringCooldownReduction(r)+armorCDR))
 }
 let lo=0,hi=250,target=targets[tier][q]*(role==='master'?1.005:role==='general'?1/1.035:1)
 for(let n=0;n<60;n++){const mid=(lo+hi)/2;if(ratio(mid,best,level,ring,.08,.12)>target)hi=mid;else lo=mid}
 let universal=lo
 universal=Math.floor(universal*1e6)/1e6
 values[d.id]={universal,flow:spec?Number((.05*(100+universal+element+25)).toFixed(6)):0}
 console.log(d.id,points,values[d.id])
}
// Preserve same-quality weapon tradeoffs when the full-set cap binds. A shared
// attenuation avoids making a generic weapon beat a capped specialist.
const scales={}
for(const d of definitions.filter(d=>d.category==='weapon'&&d.quality)){
 let cap=Infinity
 visitWeaponBudget(d,row=>{
  const slope=row.flow?1.05:1
  const intercept=1+row.element+(row.flow?.05*(1+row.element+.25):0)
  cap=Math.min(cap,100*(3/row.coefficient-intercept)/slope)
 })
 const key=d.tier+':'+d.quality
 scales[key]=Math.min(scales[key]??1,(100+cap)/(100+values[d.id].universal))
}
for(const d of definitions.filter(d=>d.category==='weapon'&&d.quality)){
 const tuning=values[d.id],element=d.tier==='bao'?.5+d.quality*.25:d.tier==='ling'?1+d.quality*.25:0
 tuning.universal=Math.floor(Math.max(0,(100+tuning.universal)*scales[d.tier+':'+d.quality]-100)*1e6)/1e6
 tuning.flow=['qi','formation'].includes(d.role)?Math.floor(.05*(100+tuning.universal+element+25)*1e6)/1e6:0
}
// After applying the all-slot ceiling, restore a meaningful quality ladder.
// Otherwise the cap can leave an upper-quality specialist ahead of the top
// generalist. Require 5% mean appropriate-channel growth before crit/speed.
for(const tier of ['ling','bao','fa']){
 const higherTier={fa:'bao',bao:'ling'}[tier]
 if(higherTier){
  const tops=definitions.filter(d=>d.category==='weapon'&&d.tier===tier&&d.quality===4)
  let scale=1
  for(const d of tops)for(const channel of ['physical','hybrid']){
   const next=definitions.find(n=>n.category==='weapon'&&n.tier===higherTier&&n.quality===3&&n.role===(channel==='physical'?'qi':'formation'))
   for(let level=next.minLevel;level<=30;level++){
    const power=n=>{
     const B=base(level),p=B+n.base.physicalAttack+(n.base.strength||0),m=B+n.base.magicAttack+(n.base.intelligence||0)
     return channel==='physical'?p:(p+m)/2
    }
    const element=n=>n.tier==='bao'?.5+n.quality*.25:n.tier==='ling'?1+n.quality*.25:0
    const t=values[next.id]
    const cap=100*(power(next)*(1+(t.universal+t.flow+element(next))/100)/power(d)/1.05-1)-element(d)
    scale=Math.min(scale,(100+cap)/(100+values[d.id].universal))
   }
  }
  for(const d of tops)values[d.id].universal=Math.floor(Math.max(0,(100+values[d.id].universal)*scale-100)*1e6)/1e6
 }
 for(const quality of [3,2,1]){
 const current=definitions.filter(d=>d.category==='weapon'&&d.tier===tier&&d.quality===quality)
 const next=definitions.filter(d=>d.category==='weapon'&&d.tier===tier&&d.quality===quality+1)
 let scale=1
 for(const d of current)for(const channel of d.role==='general'?['physical','hybrid']:[d.role==='qi'?'physical':'hybrid']){
  const higher=next.find(n=>n.role===(quality===3?(channel==='physical'?'graduate':'master'):d.role))
  for(let level=d.minLevel;level<=30;level++){
   const power=(n)=>{
    const B=base(level),p=B+n.base.physicalAttack+(n.base.strength||0),m=B+n.base.magicAttack+(n.base.intelligence||0)
    return channel==='physical'?p:(p+m)/2
   }
   const element=n=>n.tier==='bao'?.5+n.quality*.25:n.tier==='ling'?1+n.quality*.25:0
   const spec=['qi','formation'].includes(d.role),ht=values[higher.id]
   const higherFactor=1+(ht.universal+element(higher)+ht.flow)/100
   const cap=100*(power(higher)*higherFactor/power(d)/1.05-
    (1+element(d)/100+(spec?.05*(1+element(d)/100+.25):0)))/(spec?1.05:1)
   scale=Math.min(scale,(100+cap)/(100+values[d.id].universal))
  }
 }
 for(const d of current){
  const t=values[d.id],element=tier==='bao'?.5+quality*.25:tier==='ling'?1+quality*.25:0
  t.universal=Math.floor(Math.max(0,(100+t.universal)*scale-100)*1e6)/1e6
  t.flow=['qi','formation'].includes(d.role)?Math.floor(.05*(100+t.universal+element+25)*1e6)/1e6:0
 }
}
}
capDotWeapons(values)
capIdentityWeapons(values)
fs.writeFileSync('js/xianxia/TowerWeaponTuning.js' ,'// Generated by scripts/tune-sword-flow.mjs; fixed item values, not level scaling.\nexport const WEAPON_TUNING = Object.freeze('+JSON.stringify(values,null,2)+')\n')
