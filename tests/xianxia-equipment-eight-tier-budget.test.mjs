import test from 'node:test'
import assert from 'node:assert/strict'
import {WEAPONS,createFixedWeapon,weaponFlatAttack,weaponDamageModifiers} from '../js/xianxia/TowerWeapons.js'
import {EQUIPMENT,createFixedEquipment,ringDamageModifiers,ringCooldownReduction,armorModifiers} from '../js/xianxia/TowerEquipment.js'
import {cultivationAt,cultivationLevelXp} from '../js/xianxia/TowerProfile.js'
import {equipmentTier} from '../js/xianxia/TowerEquipmentTiers.js'
const skills=['sj_yujian','sj_shadow','sj_arc','sj_line','sj_cross','sj_wanjian','sj_formation','evo_wanjian','evo_tiandi','evo_wuwo','evo_sixiang']
const types=['physical','magic','hybrid']
const nativeCrit=[0,.11,.5,.97,1], bones=[0,.03,.135,.5], focuses=[0,.2,1]
const weapon=d=>createFixedWeapon(d.id,d.quality?'budget-weapon':'iron')
const item=d=>createFixedEquipment(d.id,d.quality?'budget-item':`basic-${d.category}`)
const attack=level=>100*cultivationAt(cultivationLevelXp(level)).attackMultiplier
const eligible=(d,level)=>equipmentTier(d.tier).minLevel<=level
const weaponRows=WEAPONS.map(d=>({d,w:weapon(d),flat:Math.max(...skills.flatMap(s=>types.map(t=>weaponDamageModifiers(weapon(d),s,t).flat)))}))
const ringRows=EQUIPMENT.filter(d=>d.category==='ring').map(d=>({d,r:item(d),m:ringDamageModifiers(item(d)),R:ringCooldownReduction(item(d))}))
const ratio=(B,w,flat,m,R,p,bone,focus)=>{
 const native=.5/(1+bone),wc=weaponDamageModifiers(w,'basic_attack','physical')
 return (B+weaponFlatAttack(w))/(B+5)*(1+flat+(m.skillDamage||0)+Math.min(1,p+m.critChance+wc.critChance)*(native+m.critBonus+wc.critBonus)+focus*m.special)/(1+p*native)/(1-R)
}
test('every fixed weapon uses reviewed base attack with starter replacing rather than stacking +5',()=>{
 const expected={fan:[5,6],fa:[0,6,7,8,9],bao:[0,10,11,12,13],ling:[0,14,15,16,17]}
 for(const {d,w} of weaponRows)assert.equal(weaponFlatAttack(w),expected[d.tier][d.quality],d.id)
})
test('all legal fixed weapon/ring pairs at levels1–30 stay within6x including capped crit, bone, precharged focus and maximum legal armor CDR',t=>{
 let checks=0,periodic=0,worst=1,worstCase
 const covered=new Set()
 for(let level=1;level<=30;level++){
  const B=attack(level)
  const armorCDR=Math.max(...EQUIPMENT.filter(d=>d.category==='armor'&&eligible(d,level)).map(d=>armorModifiers(item(d)).cooldownReduction||0))
  for(const {d:wd,w,flat} of weaponRows.filter(x=>eligible(x.d,level)))for(const {d:rd,m,R} of ringRows.filter(x=>eligible(x.d,level))){
   covered.add(`${wd.id}/${rd.id}`)
   for(const p of [...nativeCrit,1-m.critChance])for(const bone of bones)for(const focus of focuses){
    const gain=ratio(B,w,flat,m,Math.min(.3,R+armorCDR),p,bone,focus)
    if(gain>worst){worst=gain;worstCase=`Lv${level} ${wd.id}/${rd.id} p${p} bone${bone} focus${focus}`}
    assert.ok(gain<=6+1e-10,`${worstCase}: ${gain}`);checks++
   }
   assert.ok((B+weaponFlatAttack(w))/(B+5)*(1+flat+(m.skillDamage||0))/(1-Math.min(.3,R+armorCDR))<=6+1e-10);periodic++
  }
 }
 assert.equal(covered.size,35*26)
 t.diagnostic(`${checks} direct boundaries; ${periodic} periodic bounds; all${covered.size}identity pairs; worst${((worst-1)*100).toFixed(6)}% ${worstCase}`)
})
const targets={fan:[null,1.05],fa:[null,1.15,1.32,1.52,1.75],bao:[null,1.45,1.67,1.92,2.2],ling:[null,1.85,2.13,2.45,2.8]}
test('matched quality sets reach approved output targets within3% at every legal level, not just a relaxed ceiling',()=>{
 for(const tier of ['fan','fa','bao','ling'])for(const quality of tier==='fan'?[1]:[1,2,3,4]){
  const ws=weaponRows.filter(x=>x.d.tier===tier&&x.d.quality===quality&&x.d.role!=='master')
  const rs=ringRows.filter(x=>x.d.tier===tier&&x.d.quality===quality&&x.d.role!=='master')
  for(let level=equipmentTier(tier).minLevel;level<=30;level++)for(const w of ws)for(const r of rs){
   const gain=ratio(attack(level),w.w,w.flat,r.m,r.R,.08,.12,.2),target=targets[tier][quality]
   assert.ok(Math.abs(gain/target-1)<=.03,`Lv${level} ${w.d.id}/${r.d.id}: ${gain}, target ${target}`)
  }
 }
})
test('armor physical survival grows across quality with finite regeneration after magic defense moves to rings',()=>{
 for(const d of EQUIPMENT.filter(d=>d.category==='armor'&&d.quality)){
  const m=armorModifiers(item(d))
  assert.ok(m.hpBonus<=.31&&m.reduction<=.17,d.id)
  assert.ok(Number.isFinite(m.healthRegen)&&m.healthRegen>=0,d.id)
 }
 for(const tier of ['fa','bao','ling']){
  const low=EQUIPMENT.filter(d=>d.category==='armor'&&d.tier===tier&&d.quality===1)
  const top=EQUIPMENT.filter(d=>d.category==='armor'&&d.tier===tier&&d.quality===4)
  const ehp=d=>{const m=armorModifiers(item(d));return(1+m.hpBonus)/(1-m.physicalReduction)}
  for(const a of low)for(const b of top)assert.ok(ehp(b)>ehp(a),`${a.id}/${b.id}: ${ehp(b)/ehp(a)}`)
 }
})
test('simultaneous master weapon and ring upgrades stay below2% across native crit, bone and focus states',()=>{
 for(const tier of ['fa','bao','ling']){
  const g=weaponRows.find(x=>x.d.tier===tier&&x.d.role==='graduate'),m=weaponRows.find(x=>x.d.tier===tier&&x.d.role==='master')
  const gr=ringRows.find(x=>x.d.tier===tier&&x.d.role==='graduate'),mr=ringRows.find(x=>x.d.tier===tier&&x.d.role==='master')
  for(const p of nativeCrit)for(const bone of bones)for(const focus of focuses){
   const B=attack(equipmentTier(tier).minLevel)
   const before=ratio(B,g.w,g.flat,gr.m,gr.R,p,bone,focus),after=ratio(B,m.w,m.flat,mr.m,mr.R,p,bone,focus)
   assert.ok(after>before&&after/before<=1.02+1e-10,`${tier} p${p} bone${bone} focus${focus}: ${after/before}`)
  }
 }
})
