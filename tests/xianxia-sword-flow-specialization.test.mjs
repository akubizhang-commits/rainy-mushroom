import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {WEAPONS,createFixedWeapon,weaponFlatAttack,weaponFlatMagicAttack,weaponSummary,weaponDamageModifiers,weaponAttackProfile} from '../js/xianxia/TowerWeapons.js'
import {RINGS,ARMORS,createFixedEquipment,ringDamageModifiers,ringCooldownReduction,armorModifiers} from '../js/xianxia/TowerEquipment.js'
import {GROWTH_SKILLS} from '../js/xianxia/TowerGrowth.js'
import {equipmentTier} from '../js/xianxia/TowerEquipmentTiers.js'
import {cultivationLevelXp} from '../js/xianxia/TowerProfile.js'
import {stats} from '../js/xianxia/TowerRun.js'
import {outgoingDamageFactor} from '../js/xianxia/TowerAttributeRules.js'
const weapon=d=>createFixedWeapon(d.id,d.quality?'test-w':'iron')
const item=d=>createFixedEquipment(d.id,d.quality?'test-i':`basic-${d.category}`)
const base=lv=>stats(cultivationLevelXp(lv),{passive:{},weaponQuality:0,weaponRefine:0}).strength
const skillTypes=Object.fromEntries(GROWTH_SKILLS.filter(s=>s.kind==='active').map(s=>[s.id,s.damageType]))
function value(w,id,lv,bone){
 const l={weapon:w,passive:bone?{sj_bone:bone}:{}},attributes=stats(cultivationLevelXp(lv),l)
 const p=attributes.attack*outgoingDamageFactor(l,id,'physical',true)
 const m=attributes.magicAttack*outgoingDamageFactor(l,id,'magic',true)
 return skillTypes[id]==='physical'?p:(p+m)/2
}
test('fixed bases visibly specialize and matched flow maintains its appropriate attack-channel emphasis, including passive dilution',t=>{
 let min=Infinity,max=0,count=0
 for(const tier of ['fa','bao','ling'])for(const quality of [1,2,3]){
  const qi=weapon(WEAPONS.find(d=>d.tier===tier&&d.quality===quality&&d.role==='qi'))
  const formation=weapon(WEAPONS.find(d=>d.tier===tier&&d.quality===quality&&d.role==='formation'))
  const general=weapon(WEAPONS.find(d=>d.tier===tier&&d.quality===quality&&d.role==='general'))
  assert.ok(weaponFlatAttack(qi)>weaponFlatAttack(formation))
  assert.ok(weaponFlatMagicAttack(formation)>weaponFlatMagicAttack(qi))
  assert.ok((weaponFlatAttack(formation)+weaponFlatMagicAttack(formation))/2>(weaponFlatAttack(qi)+weaponFlatMagicAttack(qi))/2)
  for(let lv=equipmentTier(tier).minLevel;lv<=30;lv++)for(const bone of [0,1,2,3,4])for(const id of ['sj_arc','sj_cross','sj_line','sj_wanjian','sj_formation']){
   // 法器阶剑阵武器也加流云斩（2026-11-06），两类武器在流云斩上不再分高低。
   if(tier==='fa'&&id==='sj_arc')continue
   const array=['sj_wanjian','sj_formation'].includes(id),good=array?formation:qi,bad=array?qi:formation
   assert.ok(Number.isFinite(value(general,id,lv,bone)))
   const gain=value(good,id,lv,bone)/value(bad,id,lv,bone)-1
   assert.ok(gain>0&&gain<.6,`${tier}/${quality}/${lv}/${bone}/${id}: ${gain}`)
   min=Math.min(min,gain);max=Math.max(max,gain);count++
  }
 }
 t.diagnostic(JSON.stringify({count,min,max}))
})
test('weapon summaries expose both authoritative fixed bases and attack ranges',()=>{
 for(const d of WEAPONS){const w=weapon(d),s=weaponSummary(w)
  assert.equal(s.baseAttack,weaponFlatAttack(w));assert.equal(s.baseMagicAttack,weaponFlatMagicAttack(w))
  assert.equal(s.attackRange.mean,s.baseAttack);assert.equal(s.magicAttackRange.mean,s.baseMagicAttack)
  assert.match(s.baseLines[0],/基础物理攻击/);assert.match(s.baseLines[1],/基础法术攻击/)
 }
})
test('all legal fixed weapon-ring combinations respect 6x new-formula budget at critical breakpoints',t=>{
 let max=0,caseMax,count=0
 const rings=RINGS.map(d=>({d,r:item(d),m:ringDamageModifiers(item(d)),cdr:ringCooldownReduction(item(d))}))
 const armors=ARMORS.map(d=>({d,cdr:armorModifiers(item(d)).cooldownReduction}))
 for(let lv=1;lv<=30;lv++){
  const b=base(lv),armorCdr=Math.max(...armors.filter(x=>equipmentTier(x.d.tier).minLevel<=lv).map(x=>x.cdr))
  for(const d of WEAPONS.filter(d=>equipmentTier(d.tier).minLevel<=lv)){
   const w=weapon(d),p=b+weaponFlatAttack(w),m=b+weaponFlatMagicAttack(w),wc=weaponDamageModifiers(w,'sj_arc','physical'),attached=weaponAttackProfile(w).onHit
   const rows=Object.entries(skillTypes).map(([id,type])=>{
    const pf=1+weaponDamageModifiers(w,id,'physical').flat,mf=1+weaponDamageModifiers(w,id,'magic').flat
    return type==='physical'?{a:p*pf,b:p}:{a:(p*pf+m*mf)/2,b:(p+m)/2}
   })
   for(const r of rings.filter(x=>equipmentTier(x.d.tier).minLevel<=lv))for(const native of [0,.08,.28,1,Math.max(0,1-r.m.critChance-wc.critChance)])for(const bone of [0,.25]){
    const crit=(1+Math.min(1,native+r.m.critChance+wc.critChance)*(.5+r.m.critBonus+wc.critBonus))/(1+native*.5)
    const attack=Math.max(...rows.map(x=>x.a*(1+(r.m.skillDamage||0))+x.b*bone))
    const ratio=attack/((b+5)*(1+bone))*crit*(1+attached)/(1-Math.min(.3,armorCdr+r.cdr))
    if(ratio>max){max=ratio;caseMax={lv,weapon:d.id,ring:r.d.id,native,bone}}
    assert.ok(ratio<=6.000001,JSON.stringify({ratio,...caseMax}));count++
   }
  }
 }
 const report={count,max,caseMax,scope:'Expected per-hit damage and cooldown upper estimate; not actual DPS or clear rate'}
 fs.writeFileSync('reports/equipment-integer-v2-2026-11-03/two-slot-budget.json',JSON.stringify(report,null,2));t.diagnostic(JSON.stringify(report))
})
