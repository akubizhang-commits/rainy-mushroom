import test from 'node:test'
import assert from 'node:assert/strict'
import {splitDotConversion,dotStackMultiplier} from '../js/xianxia/TowerDotConversion.js'
import {addWeaponBleed,tickWeaponBleeds} from '../js/xianxia/TowerWeaponBleed.js'
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`)
test('100 damage converts to 50 immediate and 50 over six ticks, not 100 plus 50',()=>{
 const p=splitDotConversion(100,60,.5,0,0,0)
 near(p.direct,50);near(p.bleed,50);near(p.bleedPhysical,30)
 const e={id:'e',hp:1000},s={time:0,enemies:[e]},hits=[]
 addWeaponBleed(e,0,p.bleed,p.bleedPhysical)
 for(let i=1;i<=6;i++){s.time=i*.5;tickWeaponBleeds(s,hits)}
 assert.equal(hits.length,6);for(const h of hits)near(h.damage,50/6)
 near(50+hits.reduce((n,h)=>n+h.damage,0),100)
})
test('30 percent DOT bonus yields 115 total; eleven layers yield 121.5',()=>{
 const p=splitDotConversion(100,100,.5,.3,0,0)
 near(p.direct+p.bleed,115);near(p.direct+p.bleed*dotStackMultiplier(11),121.5)
 near(dotStackMultiplier(1),1);near(dotStackMultiplier(2),1.01);near(dotStackMultiplier(99),1.1)
})
test('weapon first, Qingping converts remaining direct damage; budgets never overlap',()=>{
 const p=splitDotConversion(100,40,.5,0,.5,0)
 near(p.direct,25);near(p.bleed,50);near(p.qingping,25)
 near(p.directPhysical+p.bleedPhysical+p.qingpingPhysical,40)
 const none=splitDotConversion(100,40,0,.3,0,.5)
 near(none.direct,100);near(none.bleed+none.qingping,0)
})
test('layer bonus is applied at each tick, capped; refresh never compounds paid or unpaid budgets',()=>{
 const e={id:'e',hp:10000},s={time:0,enemies:[e]},hits=[]
 for(let i=0;i<20;i++)addWeaponBleed(e,0,10,5)
 assert.equal(e.weaponBleed.stacks,11);near(e.weaponBleed.remaining,200)
 for(let i=1;i<=6;i++){s.time=i*.5;tickWeaponBleeds(s,hits)}
 near(hits.reduce((n,h)=>n+h.damage,0),220)
 near(hits.reduce((n,h)=>n+h.damageParts.physical,0),110)
 addWeaponBleed(e,4,10,10);assert.equal(e.weaponBleed.stacks,1)
})

test('actual combat partitions critical hybrid damage, then pays weapon DOT without scar damage, procs or another crit',async()=>{
 const {TowerRun}=await import('../js/xianxia/TowerRun.js')
 const {createFixedWeapon}=await import('../js/xianxia/TowerWeapons.js')
 const {outgoingDamageFactor}=await import('../js/xianxia/TowerAttributeRules.js')
 const {tickQingping}=await import('../js/xianxia/TowerQingping.js')
 const w=createFixedWeapon('eq_sword_caiyun','conversion-test')
 const loadout={growthVersion:1,active:{sj_arc:1},passive:{sj_mark:1,sj_heart:4,sj_gate:1},evolutions:[],evolutionLevels:{},tutorialWaves:0,weapon:w,weaponId:w.id,weaponQuality:w.quality,weaponRefine:0,weaponFocusCount:0}
 const run=new TowerRun({attemptId:1,floor:1,seed:101,xp:13485,hp:100,training:true,loadout})
 for(let i=0;i<600&&!run.state.enemies.length;i++)run.advance(1/60)
 const e=run.state.enemies[0];e.hp=e.maxHp=1e7
 run._random=()=>0
 const multiplier=1.5+(w.affixes.find(a=>a.type==='critBonus')?.value??0)/100
 const physical=60*outgoingDamageFactor(loadout,'sj_arc','physical',true)*multiplier*500/(500+e.physicalDefense)
 const magic=40*outgoingDamageFactor(loadout,'sj_arc','magic',true)*multiplier*500/(500+e.magicDefense)
 const D=physical+magic,before=e.hp
 run._damageEnemy({target:e.id,source:'sj_arc',direct:true,damage:100,damageParts:{physical:60,magic:40}})
 near(before-e.hp,D*.5);near(e.weaponBleed.remaining,D*.5*1.02)
 near(e.weaponBleed.physical,physical*.5*1.02)
 const start=run.state.time
 assert.equal(e.scarDebuff.vulnerability,.2)
 run._random=()=>{throw Error('DOT cannot reroll crit')}
 e.mechanic={armorUntil:9999,armor:.5,vulnerableUntil:0,vulnerability:0}
 for(let i=1;i<=6;i++){
  run.state.time=start+i*.5;const hits=[];tickWeaponBleeds(run.state,hits);hits.push(...tickQingping(run))
  for(const h of hits)run._damageEnemy(h)
 }
 near(before-e.hp,D*(.5+.5*1.02))
 assert.equal(run.state.swordBursts?.length??0,0);assert.equal(e.weaponBleed,undefined);assert.equal(e.scarDebuff,undefined)
 assert.equal(e.woundBudget,0)
})

test('both pending statuses survive pause and real resumed simulation; invalid stacks are rejected',async()=>{
 const {TowerRun,validateTowerSnapshot}=await import('../js/xianxia/TowerRun.js')
 const {createFixedWeapon}=await import('../js/xianxia/TowerWeapons.js')
 const w=createFixedWeapon('eq_sword_caiyun','restore-conversion')
 const loadout={growthVersion:1,active:{sj_arc:1},passive:{sj_mark:1},evolutions:[],evolutionLevels:{},tutorialWaves:0,weapon:w,weaponId:w.id,weaponQuality:w.quality,weaponRefine:0,weaponFocusCount:0}
 const r=new TowerRun({attemptId:1,floor:1,seed:101,xp:13485,hp:100,training:true,loadout})
 for(let i=0;i<600&&!r.state.enemies.length;i++)r.advance(1/60)
 const e=r.state.enemies[0]
 r._damageEnemy({target:e.id,source:'sj_arc',direct:true,damage:.1})
 r.pause();const saved=r.snapshot();r.advance(1);assert.deepEqual(r.snapshot(),saved);assert.ok(validateTowerSnapshot(saved))
 for(const key of ['weaponBleed'])for(const stacks of [0,12,1.5,NaN]){
  const bad=structuredClone(saved);bad.enemies[0][key].stacks=stacks;assert.equal(validateTowerSnapshot(bad),false)
 }
 const restored=TowerRun.restore(saved);r.resume();restored.resume()
 for(let i=0;i<210;i++){r.advance(1/60);restored.advance(1/60)}
 assert.deepEqual(r.snapshot(),restored.snapshot());assert.ok(validateTowerSnapshot(restored.snapshot()))
})
