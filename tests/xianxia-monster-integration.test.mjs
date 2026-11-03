import test from 'node:test'
import assert from 'node:assert/strict'
import {tickMonsterMechanics} from '../js/xianxia/TowerMonsterMechanics.js'
import {insideHex} from '../js/xianxia/TowerArena.js'
import {clearPillars} from '../js/xianxia/TowerObstacles.js'
import {TowerRun, validateTowerSnapshot} from '../js/xianxia/TowerRun.js'
const plain={active:{sj_yujian:1},passive:{},evolutions:[],weaponId:'eq_sword_suwen',weaponQuality:1,weaponRefine:0}
const make=()=>new TowerRun({attemptId:1,floor:2,seed:123,hp:100,xp:0,arenaVersion:1,loadout:plain})
test('new encounters persist their mechanic version and pause all mechanic clocks',()=>{
 const run=make()
 assert.equal(run.state.monsterMechanics?.version,1)
 assert.ok(validateTowerSnapshot(run.snapshot()))
 run.advance(.8);run.pause()
 const snapshot=run.snapshot();run.advance(10)
 assert.deepEqual(run.snapshot(),snapshot)
 const restored=TowerRun.restore(JSON.parse(JSON.stringify(snapshot)))
 restored.resume();run.resume();restored.advance(.3);run.advance(.3)
 assert.deepEqual(restored.snapshot(),run.snapshot())
})
test('malformed enemy mechanic fields cannot be accepted by checkpoint validation',()=>{
 const run=make();const snap=run.snapshot()
 snap.monsterMechanics={version:1,zones:[],arbitraryCheat:true}
 assert.equal(validateTowerSnapshot(snap),false)
})
test('hard control stops movement but not auto attacks and cannot chain through immunity',()=>{
 const run=make(),x=run.state.player.x
 run._applyMonsterControl({rootSeconds:.7})
 run.setInput(1,0);run.advance(.3)
 assert.equal(run.state.player.x,x)
 const until=run.state.monsterControl.rootUntil
 run._applyMonsterControl({rootSeconds:.8})
 assert.equal(run.state.monsterControl.rootUntil,until)
 run.advance(.5)
 assert.ok(run.state.player.x>x)
 assert.ok(run.state.monsterControl.immuneUntil>=3.7)
 run.pause();assert.ok(validateTowerSnapshot(run.snapshot()))
})
test('mechanic control state rejects invalid fractions and nonfinite duration',()=>{
 const original=make().snapshot()
 for(const patch of [{slowFraction:.9},{rootUntil:Infinity},{immuneUntil:-1}]) {
  const snap=structuredClone(original);Object.assign(snap.monsterControl,patch)
  assert.equal(validateTowerSnapshot(snap),false)
 }
})

test('campaign checkpoint cannot erase the mechanic version of an active attempt',async()=>{
 const {TowerCampaignStore}=await import('../js/xianxia/TowerCampaign.js')
 let raw=null,writes=0
 const disk={getItem(){return raw},setItem(k,v){raw=v;writes++}}
 const store=new TowerCampaignStore(disk,0)
 const entered=store.act({type:'startFloor',floor:1,seed:123},0)
 assert.equal(entered.ok,true)
 const snapshot=structuredClone(entered.snapshot);snapshot.phase='paused'
 delete snapshot.monsterMechanics;delete snapshot.monsterControl
 const before=raw,n=writes
 assert.equal(store.act({type:'checkpoint',snapshot},0).ok,false)
 assert.equal(raw,before);assert.equal(writes,n)
})

// Controlled clear reaches real authored wave 20; this fixture is NOT a balance run.
function authoredBoss(floor) {
 const run=new TowerRun({attemptId:1,floor,seed:17,hp:100,xp:0,arenaVersion:1,loadout:plain})
 run.setPlaytestAssist(true)
 for(let i=0;i<30000&&run.state.wave<20;i++) {
  run.resume() // This fixture chooses to continue at cultivation caps.
  for(const e of run.state.enemies)run._damageEnemy({target:e.id,damage:1e12,direct:false,scaled:true,source:'fixture'})
  run.advance(.1)
 }
 assert.equal(run.state.wave,20)
 run.resume() // Wave 20 may begin at a safe cultivation node.
 for(let i=0;i<200&&!run.state.enemies.some(e=>e.role==='boss');i++)run.advance(.1)
 const boss=run.state.enemies.find(e=>e.role==='boss')
 assert.ok(boss)
 run.state.cooldowns.sj_yujian=1e9
 return {run,boss}
}
for(const floor of [1,2,3,4,5,6,7,8,9])test(`authored floor ${floor} controllers survive real Run save/reload during combat`,()=>{
 const {run,boss}=authoredBoss(floor)
 boss.hp=boss.maxHp*.55
 for(let i=0;i<400;i++) {
  run.advance(.1)
  if(i%30===0)assert.ok(validateTowerSnapshot(run.snapshot()),`floor ${floor} snapshot at ${run.state.time}, ${boss.mechanic.phase}`)
 }
 run.pause()
 const restored=TowerRun.restore(JSON.parse(JSON.stringify(run.snapshot())))
 assert.deepEqual(restored.snapshot(),run.snapshot())
 run.resume();restored.resume();restored.setPlaytestAssist(true)
 for(let i=0;i<30;i++){run.advance(.1);restored.advance(.1)}
 assert.deepEqual(restored.snapshot(),run.snapshot())
})
test('killing a real boss removes temporary actors without extra currency or formal kills',()=>{
 const {run,boss}=authoredBoss(2)
 boss.mechanic.cooldowns.M05=1e9
 for(let i=0;i<300&&!run.state.enemies.some(e=>e.temporary);i++)run.advance(.1)
 assert.ok(run.state.enemies.some(e=>e.temporary))
 const count=run.state.killLedger.length
 run._damageEnemy({target:boss.id,damage:1e12,direct:false,scaled:true,source:'fixture'})
 run._deaths()
 assert.equal(run.state.killLedger.length,count+1)
 assert.equal(run.state.enemies.some(e=>e.temporary?.ownerId===boss.id),false)
 assert.equal(run.state.monsterMechanics.zones.some(z=>z.ownerId===boss.id),false)
})

test('native enemies cannot start a followup attack while a major mechanic is resolving',()=>{
 const run=make(),s=run.state
 const boss=run._enemy({id:'admission-boss',archetype:'wolf_boss',x:s.player.x+80,y:s.player.y})
 const normal=run._enemy({id:'admission-normal',archetype:'wolf_normal',x:s.player.x+60,y:s.player.y})
 s.enemies=[boss,normal];s.time=10
 for(const e of s.enemies){e.ai.entryUntil=0;e.ai.graceUntil=0;e.ai.readyAt=0}
 boss.mechanic.phase='active';boss.mechanic.skillId='M01';boss.mechanic.until=20
 run._requestAttacks()
 assert.equal(normal.ai.mode,'approach')
})

test('actual temporary kills trigger combat chains without awarding economic rewards',()=>{
 const {run,boss}=authoredBoss(2)
 boss.mechanic.cooldowns.M05=1e9
 for(let i=0;i<300&&!run.state.enemies.some(e=>e.temporary);i++)run.advance(.1)
 const s=run.state,clone=s.enemies.find(e=>e.temporary)
 assert.ok(clone)
 clone.x=boss.x;clone.y=boss.y;clone.hp=0;clone.killedBy='fixture'
 s.loadout.passive.sj_gate=1;s.gateReadyAt=0;s.gateEntries=[{amount:100,expiresAt:s.time+10}]
 const hp=boss.hp,ledger=s.killLedger.length,earned=structuredClone(s.earned)
 run._deaths()
 assert.ok(boss.hp<hp)
 assert.equal(s.killLedger.length,ledger)
 assert.deepEqual(s.earned,earned)
})

test('two authored elites enter sequentially without losing formal units',()=>{
 const run=make(),s=run.state
 s.wave=10;run._registerWave();s.time=100;s.waveStartedAt=0
 const elites=s.pending.filter(p=>p.archetype.includes('_elite_'))
 assert.equal(elites.length,2)
 s.pending=elites;s.enemies=[];s.reserved=[]
 run._spawn()
 assert.equal(s.reserved.length,1)
 assert.equal(s.pending.length,1)
 s.time+=10;run._spawn()
 assert.equal(s.enemies.length,1)
 assert.equal(s.pending.length,1)
 const first=s.enemies[0].id
 s.enemies=[];run._spawn()
 assert.equal(s.reserved.length,1)
 assert.notEqual(s.reserved[0].id,first)
 assert.equal(s.pending.length,0)
})

test('summon warnings and materialization fit the actual yak body at the arena edge',()=>{
 const {run,boss}=authoredBoss(8),s=run.state
 boss.x=-829.27318579165;boss.y=-274.2320989655407
 s.player.x=-689.5995459027374;s.player.y=-379.08029073610805
 for(const e of s.enemies)if(e!==boss){e.x=400;e.y=300}
 boss.ai.entryUntil=0;boss.ai.mode='approach';boss.ai.attack=null;s.monsterMechanics.nextMajorAt=0;s.zones=[];s.projectiles=[]
 boss.mechanic.cooldowns.M19=1e9;boss.mechanic.cooldowns.M15=1e9;boss.mechanic.cooldowns.M05=0
 tickMonsterMechanics(run,[])
 assert.equal(boss.mechanic.skillId,'M05')
 assert.ok(boss.mechanic.spawnPoints.length)
 assert.ok(s.monsterMechanics.zones.filter(z=>z.spawnKind).every(z=>z.radius===26))
 for(const p of boss.mechanic.spawnPoints){
  assert.equal(insideHex(p,26),true,`actual 26px yak body must fit at ${p.x},${p.y}`)
  assert.equal(clearPillars(p,26),true)
 }
 run.advance(2.3)
 const minions=s.enemies.filter(e=>e.temporary?.ownerId===boss.id)
 assert.ok(minions.length)
 for(const e of minions){assert.equal(insideHex(e,e.radius),true);assert.equal(clearPillars(e,e.radius),true)}
 assert.equal(validateTowerSnapshot(run.snapshot()),true)
})
