import test from 'node:test'
import assert from 'node:assert/strict'
import {multipliedEquipmentBonus,criticalMultiplier,outgoingDamageFactor,regenerationAmount,regenerationFraction} from '../js/xianxia/TowerAttributeRules.js'
import {TowerRun,characterCombatAttributes,validateTowerSnapshot} from '../js/xianxia/TowerRun.js'
import {createIronWeapon,createFixedWeapon,weaponAttackProfile} from '../js/xianxia/TowerWeapons.js'
import {ARMORS,createFixedEquipment,createBasicEquipment} from '../js/xianxia/TowerEquipment.js'
import {equipmentCastSpeed,castActionTiming,skillCooldown} from '../js/xianxia/TowerSkillTiming.js'
import {cultivationLevelXp} from '../js/xianxia/TowerProfile.js'
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`)
const base=()=>({growthVersion:1,skillsInitialized:true,active:{sj_arc:1},passive:{},evolutions:[],evolutionLevels:{},tutorialWaves:0,weapon:createIronWeapon(),weaponId:'iron',weaponQuality:0,weaponRefine:0,weaponFocusCount:0,armor:createBasicEquipment('armor'),armorId:'basic-armor'})
const make=l=>new TowerRun({attemptId:1,floor:1,seed:41,hp:10,xp:cultivationLevelXp(21),training:true,loadout:l})
test('user examples: 150, 168, 110, 165, 120, 144, 154',()=>{
 near(100*criticalMultiplier(),150)
 near(100*criticalMultiplier([.18]),168)
 near(100*(1+.1),110)
 near(100*criticalMultiplier()*(1+.1),165)
 near(100*multipliedEquipmentBonus([.2]),120)
 near(100*multipliedEquipmentBonus([.2,.2]),144)
 near(100*multipliedEquipmentBonus([.2,.2],.1),154)
})
test('actual basic and skill hits multiply final ordinary damage by crit and attach after crit on every hit',()=>{
 const l=base();l.weapon=createFixedWeapon('eq_sword_guiyan','weapon-1');l.weaponId=l.weapon.id;l.weaponQuality=l.weapon.quality;l.passive={sj_heart:4,sj_bone:4}
 const run=make(l),a=characterCombatAttributes(l),fraction=weaponAttackProfile(l.weapon).onHit
 const target={id:'test-target',x:100,y:0,hp:1e8,maxHp:1e8,radius:20};run.state.enemies.push(target)
 for(const source of ['basic_attack','sj_arc','formation'])for(const crit of [false,true])for(let hit=0;hit<2;hit++){
  run._random=()=>crit?0:.99999
  const before=target.hp,oldEffects=run.state.effects.length,isDirect=source!=='formation'
  run._damageEnemy({target:target.id,source,damage:100,direct:isDirect,damageParts:{physical:100,magic:0}})
  const skill=source==='formation'?'sj_formation':source
  const ordinary=100*outgoingDamageFactor(l,skill,'physical',source!=='basic_attack')
  const expected=ordinary*(crit?1+a.physicalCritExtra:1)
  const effects=run.state.effects.slice(oldEffects).filter(e=>e.kind==='hit')
  near(effects.find(e=>!e.attached).damage,expected)
  near(effects.find(e=>e.attached).damage,expected*fraction)
  near(before-target.hp,expected*(1+fraction))
 }
})
test('all armor and bare character recover in 120–180 seconds at every tested max HP',()=>{
 for(const armor of [null,createBasicEquipment('armor'),...ARMORS.filter(d=>d.quality).map((d,i)=>createFixedEquipment(d.id,'a'+i))]){
  for(const maxHp of [100,500,10000]){
   const amount=regenerationAmount(maxHp,{armor}),seconds=Math.ceil(maxHp/amount-1e-9)*3
   assert.ok(seconds>=120&&seconds<=180,`${armor?.definitionId}: ${seconds}`)
  }
 }
})
test('critical eligibility is independent of direct-hit proc eligibility; inherited wounds never reroll',()=>{
 const l=base();l.passive={sj_heart:4,sj_mark:1,sj_gate:1}
 const run=make(l),target={id:'crit-rule-target',x:100,y:0,hp:1e8,maxHp:1e8,radius:20}
 run.state.enemies.push(target)
 let rolls=0
 run._random=()=>{rolls++;return 0}
 for(const source of ['formation','sword_burst']){
  const start=rolls,oldEffects=run.state.effects.length
  run._damageEnemy({target:target.id,source,damage:100,direct:false,scaled:false,damageParts:{physical:100,magic:0}})
  assert.equal(rolls-start,1)
  const hit=run.state.effects.slice(oldEffects).find(e=>e.kind==='hit')
  assert.equal(hit.critical,true)
  near(hit.damage,150)
  assert.equal(run.state.swordBursts?.length??0,0,'non-direct hits cannot recursively trigger burst')
  assert.equal(target.scarDebuff,undefined,'periodic and derived damage cannot apply scar')
 }
 const start=rolls,before=target.hp,oldEffects=run.state.effects.length
 run._damageEnemy({target:target.id,source:'wound',damage:100,direct:false,scaled:true,damageParts:{physical:100,magic:0}})
 assert.equal(rolls,start)
 near(before-target.hp,100)
 assert.ok(!run.state.effects.slice(oldEffects).find(e=>e.kind==='hit').critical)
})
test('condensation raises base 100% casting speed while keeping cooldown and periodic clocks unchanged',()=>{
 const l=base(),old=castActionTiming('sj_line',3,equipmentCastSpeed(l)),cooldown=skillCooldown(10,l)
 assert.equal(equipmentCastSpeed(l),0)
 l.passive.sj_spirit=3;near(equipmentCastSpeed(l),.3)
 const fast=castActionTiming('sj_line',3,equipmentCastSpeed(l))
 assert.ok(fast.windup<old.windup&&fast.duration<old.duration)
 assert.equal(skillCooldown(10,l),cooldown)
 const run=make(l);run.setPlaytestAssist(true)
 for(let i=0;i<240;i++)run.advance(1/60)
 assert.ok(validateTowerSnapshot(run.snapshot()))
})

test('learning casting speed during a paused cast preserves the original cast and valid save',()=>{
 const l=base(),run=make(l)
 run.setPlaytestAssist(true)
 let found=false
 for(let i=0;i<600;i++){
  run.advance(1/60)
  if(run.state.actions.current){found=true;break}
 }
 assert.ok(found)
 const originalSpeed=run.state.actions.current.speed
 run.pause()
 const next=structuredClone(run.state.loadout);next.passive.sj_spirit=1
 run.setGrowthLoadout(next)
 assert.equal(run.state.actions.current.speed,originalSpeed)
 assert.ok(validateTowerSnapshot(run.snapshot()))
 const restored=TowerRun.restore(run.snapshot());restored.resume()
 for(let i=0;i<30;i++)restored.advance(1/60)
 assert.ok(validateTowerSnapshot(restored.snapshot()))
})

test('runtime factor multiplies different equipment sources, adds passive after product, and excludes skill-only affixes from basics',()=>{
 const l={passive:{sj_bone:1},armor:{affixes:[{type:'skillDamage',value:20}]},ring:{affixes:[{type:'skillDamage',value:20}]}}
 near(outgoingDamageFactor(l,'sj_arc','physical',true),1.2*1.2+.06)
 near(outgoingDamageFactor(l,'basic_attack','physical',false),1.06)
 l.armor.affixes=[];l.ring.affixes.push({type:'skillDamage',value:20})
 near(outgoingDamageFactor(l,'sj_arc','physical',true),1.4+.06)
})
