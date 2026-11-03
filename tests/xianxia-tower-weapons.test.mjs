import test from 'node:test'
import assert from 'node:assert/strict'
import {WEAPONS,createIronWeapon,createFixedWeapon,rollWeapon,validateWeapon,weaponName,weaponDescription,weaponSummary,weaponFlatAttack,weaponDamageModifiers,WEAPON_AFFIX_RANGES} from '../js/xianxia/TowerWeapons.js'
const clone=x=>JSON.parse(JSON.stringify(x))
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`)
const ordinary=WEAPONS.filter(d=>d.quality>0)
const fixed=d=>createFixedWeapon(d.id,'test')
test('36 frozen weapon identities and independent iron instances retain the API',()=>{
 assert.equal(WEAPONS.length,36);assert.equal(new Set(WEAPONS.map(w=>w.id)).size,36)
 assert.ok(Object.isFrozen(WEAPONS));for(const d of WEAPONS)assert.ok(Object.isFrozen(d))
 const iron=createIronWeapon();assert.ok(validateWeapon(iron));assert.equal(weaponFlatAttack(iron),5)
 assert.equal(weaponSummary(iron).fixedAttack,5);assert.match(weaponName(iron),/铁剑/)
 assert.deepEqual(weaponDamageModifiers(iron,'sj_yujian','physical'),{flat:0,critChance:0,critBonus:0,special:0,lifesteal:0})
 iron.affixes.push({type:'attack',value:3});assert.equal(createIronWeapon().affixes.length,0)
})
test('fixed weapons have universal type coverage and only their declared family specialization',()=>{
 for(const d of ordinary){
  const w=fixed(d);assert.ok(validateWeapon(w));assert.deepEqual(w,fixed(d))
  assert.equal(w.affixes.filter(a=>a.type==='flow').length,['qi','formation'].includes(d.role)||['eq_sword_dingyue','eq_sword_chengming','eq_sword_kunwu'].includes(d.id)?1:0)
  for(const a of w.affixes){assert.ok(['physical','magic','flow','attackSpeed','onHit','bleedConversion','bleed','element','skillLevel'].includes(a.type));if(a.type==='flow')assert.equal(a.target,({eq_sword_dingyue:'formation',eq_sword_chengming:'qi',eq_sword_kunwu:'formation'})[d.id]??d.role)}
  const m=weaponDamageModifiers(w,'sj_arc','physical');assert.equal(m.critChance,0);assert.equal(m.critBonus,0);assert.equal(m.special,0);assert.equal(m.lifesteal,0)
 }
})
test('strict validator rejects removed affixes, duplicate slots, changed values and save shape',()=>{
 const w=rollWeapon('ling',4,()=>0,'valid')
 for(const type of ['critChance','critBonus','focus','lifesteal','healFraction']){
  const bad=clone(w);bad.affixes[1]={type,value:1};assert.equal(validateWeapon(bad),false)
 }
 for(const mutate of [a=>a.affixes[1]={...a.affixes[0]},a=>a.affixes[1].target='evo_tiandi',
  a=>a.affixes[0].value=999,a=>a.affixes[0].value=NaN,a=>a.affixes[0].value+=.001,
  a=>a.affixes[0].type='magic',a=>a.affixes.pop(),a=>a.affixes.push({type:'attack',value:4}),
  a=>a.refine=5,a=>a.id='iron',a=>a.quality=3,a=>a.tier='di',a=>a.locked=1,a=>a.counter=0]){
  const bad=clone(w);mutate(bad);assert.equal(validateWeapon(bad),false,JSON.stringify(bad))
 }
 const reversed=clone(w);reversed.affixes.reverse();assert.ok(validateWeapon(reversed))
 for(const bad of [null,{},[],{...w,affixes:null}])assert.equal(validateWeapon(bad),false)
})
test('fixed attack is separate, hybrid type shares sum once and evolutions inherit parent families',()=>{
 for(const d of ordinary){
  const w=fixed(d)
  close(weaponSummary(w).fixedAttack,weaponFlatAttack(w))
  for(const skill of ['sj_arc','sj_yujian','sj_wanjian'])close(weaponDamageModifiers(w,skill,'hybrid').flat,weaponDamageModifiers(w,skill,'physical').flat)
  assert.equal(weaponDamageModifiers(w,'sj_flight','none').flat,0)
  for(const [base,evo]of [['sj_yujian','evo_wanjian'],['sj_line','evo_tiandi'],['sj_wanjian','evo_wuwo'],['sj_formation','evo_sixiang']])
   assert.deepEqual(weaponDamageModifiers(w,base,'hybrid'),weaponDamageModifiers(w,evo,'hybrid'))
 }
})
test('boundary RNG is checked and detached summaries describe actual fixed values',()=>{
 for(const n of [-1,1,NaN,Infinity,'0'])assert.throws(()=>rollWeapon('fan',1,()=>n,'bad'))
 for(const d of ordinary){
  const w=fixed(d),before=JSON.stringify(w)
  assert.equal(weaponSummary(w).name,weaponName(w))
  assert.ok(weaponDescription(w).length>=w.affixes.length)
  assert.doesNotMatch(weaponDescription(w).join(' '),/会心|吸血|饮露/)
  const summary=weaponSummary(w);summary.affixes[0].value=999;summary.lines.push('changed')
  assert.equal(JSON.stringify(w),before);assert.ok(validateWeapon(JSON.parse(before)))
 }
})
test('refinement remains disabled and historical exports immutable',()=>{
 assert.ok(Object.isFrozen(WEAPON_AFFIX_RANGES))
 for(const d of ordinary){const w=fixed(d)
  assert.equal(w.refine,0);assert.equal(weaponSummary(w).refineBonus,0)
  assert.doesNotMatch(weaponDescription(w).join(' '),/强化/)
  for(const refine of [1,2,3,4,5,-1,.1,'0',null])assert.equal(validateWeapon({...w,refine}),false)
 }
})
