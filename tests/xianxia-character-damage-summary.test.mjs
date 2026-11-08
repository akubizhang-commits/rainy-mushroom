import {outgoingDamageFactor} from '../js/xianxia/TowerAttributeRules.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import { characterCombatAttributes, TowerRun } from '../js/xianxia/TowerRun.js'
import { WEAPONS, createIronWeapon, createFixedWeapon, weaponAttackProfile, weaponElementBonus, weaponDamageModifiers } from '../js/xianxia/TowerWeapons.js'
import { createFixedEquipment, RINGS, ringDamageModifiers } from '../js/xianxia/TowerEquipment.js'
import { cultivationLevelXp } from '../js/xianxia/TowerProfile.js'
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`)
const loadout=()=>({growthVersion:1,skillsInitialized:true,active:{sj_arc:1},passive:{},evolutions:[],evolutionLevels:{},tutorialWaves:0,weapon:createIronWeapon(),weaponId:'iron',weaponQuality:0,weaponRefine:0,weaponFocusCount:0})

test('empty bonuses are numeric zero and physical/magic crit include the same current sources',()=>{
 const l=loadout(), a=characterCombatAttributes(l)
 for(const key of ['physicalCritChance','magicCritChance','physicalDamageIncrease','magicDamageIncrease','skillDamageIncrease','attachedDamage','burstDamage']) assert.equal(a[key],0,key)
 assert.equal(a.physicalCritExtra,.5);assert.equal(a.magicCritExtra,.5)
 assert.deepEqual(a.conditionalDamageIncreases,[])
})

test('summary aggregates bone, ring and weapon without applying conditional bonuses globally',()=>{
 const l=loadout();l.weapon=createFixedWeapon('eq_sword_guiyan','weapon-1');l.passive={sj_bone:4,sj_heart:4,sj_gate:2}
 const d=RINGS.find(d=>d.tier==='ling'&&d.quality===4);l.ring=createFixedEquipment(d.id,'ring-1')
 const a=characterCombatAttributes(l),r=ringDamageModifiers(l.ring),p=weaponAttackProfile(l.weapon)
 near(a.physicalCritChance,Math.min(1,.28+r.critChance+(l.weapon.affixes.find(a=>a.type==='critChance')?.value??0)/100));near(a.magicCritChance,a.physicalCritChance)
 near(a.physicalCritExtra,.5+r.critBonus+(l.weapon.affixes.find(a=>a.type==='critBonus')?.value??0)/100);near(a.magicCritExtra,a.physicalCritExtra)
 near(a.physicalDamageIncrease,outgoingDamageFactor(l,'basic_attack','physical',false,'none')-1)
 near(a.skillDamageIncrease,r.skillDamage)
 near(a.attachedDamage,p.onHit)
 near(a.burstDamage,1.2)
 assert.equal(a.conditionalDamageIncreases.length,l.weapon.affixes.filter(a=>['skill','flow','element'].includes(a.type)).length)
})

test('displayed channel increments reproduce actual normal and critical hybrid hits',()=>{
 const l=loadout();l.passive={sj_bone:4,sj_heart:4}
 const d=RINGS.find(d=>d.tier==='ling'&&d.quality===4);l.ring=createFixedEquipment(d.id,'ring-1')
 l.ringId=l.ring.id
 const run=new TowerRun({attemptId:1,floor:9,seed:41,hp:100,xp:cultivationLevelXp(21),training:true,loadout:l})
 const e={id:'summary-target',x:100,y:0,hp:1e7,maxHp:1e7,radius:20};run.state.enemies.push(e)
 const a=characterCombatAttributes(l)
 for(const critical of [false,true]){
  run._random=()=>critical?0:.99999
  run._damageEnemy({target:e.id,source:'sj_arc',damage:200,direct:true,damageParts:{physical:100,magic:100}})
  const hit=run.state.effects.findLast(e=>e.kind==='hit'&&e.source==='sj_arc')
  near(hit.damageParts.physical,100*outgoingDamageFactor(l,'sj_arc','physical',true)*(critical?1+a.physicalCritExtra:1))
  near(hit.damageParts.magic,100*outgoingDamageFactor(l,'sj_arc','magic',true)*(critical?1+a.magicCritExtra:1))
 }
})

test('ring crit affixes reach the sheet and real hits; weapons no longer add tiny crit lines',()=>{
 const l=loadout();l.weapon=createFixedWeapon('eq_sword_guiyan','weapon-1');l.weaponId=l.weapon.id;l.weaponQuality=l.weapon.quality
 const d=RINGS.find(d=>d.tier==='ling'&&d.quality===4);l.ring=createFixedEquipment(d.id,'ring-1')
 assert.ok(!l.weapon.affixes.some(a=>a.type==='critChance'))
 assert.ok(!l.weapon.affixes.some(a=>a.type==='critBonus'))
 assert.equal(l.ring.affixes.some(a=>a.type==='focus'),false)
 l.ringId=l.ring.id
 const a=characterCombatAttributes(l),r=ringDamageModifiers(l.ring)
 const chance=(l.weapon.affixes.find(a=>a.type==='critChance')?.value??0)/100, bonus=(l.weapon.affixes.find(a=>a.type==='critBonus')?.value??0)/100
 near(a.physicalCritChance,r.critChance+chance);near(a.physicalCritExtra,.5+r.critBonus+bonus)
 assert.equal(a.focusEvery,0)
 const run=new TowerRun({attemptId:1,floor:9,seed:41,hp:100,xp:cultivationLevelXp(21),training:true,loadout:l})
 run.state.enemies.push({id:'crit-target',x:100,y:0,hp:1e7,maxHp:1e7,radius:20})
 run._random=()=>r.critChance/2
 run._damageEnemy({target:'crit-target',source:'basic_attack',damage:100,direct:true,damageParts:{physical:100,magic:0}})
 const hit=run.state.effects.findLast(e=>e.kind==='hit'&&!e.attached)
 assert.equal(hit.critical,true)
 near(hit.damage,100*(1+a.physicalDamageIncrease)*(1+a.physicalCritExtra))
})

test('prior equipment schema resets only this mode and failed reset leaves storage untouched',async()=>{
 const {TowerCampaignStore,TOWER_CAMPAIGN_KEY}=await import('../js/xianxia/TowerCampaign.js')
 const {checksum}=await import('../js/xianxia/Checksum.js')
 const old=JSON.stringify({format:'xianxia-sect-tower-campaign',schema:44,data:'{}',checksum:checksum('{}')})
 const saved=new Map([[TOWER_CAMPAIGN_KEY,old],['other-game','keep']])
 const failed=new TowerCampaignStore({getItem:k=>saved.get(k),setItem:()=>{throw Error('disk full')}},0)
 assert.equal(failed.readOnly,true);assert.equal(saved.get(TOWER_CAMPAIGN_KEY),old)
 const disk={getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)}
 const reset=new TowerCampaignStore(disk,0)
 assert.equal(reset.readOnly,false);assert.equal(reset.migrationReport.reset,true)
 assert.equal(saved.get('other-game'),'keep')
 assert.equal(reset.act({type:'sync'},0).ok,true)
 assert.deepEqual(new TowerCampaignStore(disk,0).state,reset.state)
})

test('merged damage increase is identical for both channels on every current weapon',()=>{
 for(const definition of WEAPONS.filter(d=>d.quality)){
  const l=loadout();l.weapon=createFixedWeapon(definition.id,'audit-weapon');l.passive={sj_bone:4}
  const a=characterCombatAttributes(l)
  near(a.physicalDamageIncrease,a.magicDamageIncrease)
 }
})
