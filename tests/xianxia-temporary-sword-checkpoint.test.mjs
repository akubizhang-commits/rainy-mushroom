import test from 'node:test'
import assert from 'node:assert/strict'
import { TowerRun,validateTowerSnapshot } from '../js/xianxia/TowerRun.js'
import { validateMonsterMechanicsProgress } from '../js/xianxia/TowerMonsterMechanics.js'
import { fixture } from '../scripts/verify-monster-mechanics-balance.mjs'

// Controlled wave setup only; the projectile and summoned actor are emitted by
// their real runtime controllers. This is a save-integrity test, not a balance run.
function hitSummonedActor() {
 const f=fixture(4,'qi')
 // Explicit projectile skill: sj_arc is now a local sector, not a flying blade.
 // This fixture verifies summon receipts, not skill acquisition or build balance.
 const loadout={...f.loadout,active:{...f.loadout.active,sj_moon_triple:1}}
 const run=new TowerRun({attemptId:1,floor:2,seed:17,hp:f.stats.maxHp,xp:f.xp,loadout,arenaVersion:1})
 run.setPlaytestAssist(true)
 for(let i=0;i<30000&&run.state.wave<20;i++){
  for(const e of run.state.enemies)run._damageEnemy({target:e.id,damage:1e12,direct:false,scaled:true,source:'fixture'})
  run.advance(.1)
 }
 assert.equal(run.state.wave,20)
 for(const id of Object.keys(run.state.cooldowns))run.state.cooldowns[id]=1e9
 for(let i=0;i<1000&&!run.state.enemies.some(e=>e.role==='boss');i++)run.advance(.1)
 run.state.enemies.find(e=>e.role==='boss').mechanic.cooldowns.M05=1e9
 for(let i=0;i<1000&&!run.state.enemies.some(e=>e.temporary);i++)run.advance(.1)
 const s=run.state,actor=s.enemies.find(e=>e.temporary)
 assert.ok(actor,'a real mechanic must summon an actor')
 assert.equal(validateTowerSnapshot(run.snapshot()),true,'setup is a valid full-ledger snapshot')
 s.player.x=33;s.player.y=-60
 for(const e of s.enemies){e.x=400;e.y=300}
 actor.x=200;actor.y=-60
 s.cooldowns.sj_moon_triple=0
 let shot
 for(let i=0;i<120&&!shot;i++){
  run.advance(1/60)
  shot=s.projectiles.find(p=>p.bladeKind&&p.hitIds.includes(actor.id))
 }
 assert.ok(shot,'real sword projectile must hit a summoned actor')
 return {run,actor,shot}
}

test('a sword hitting a live summon remains checkpointable and resumes deterministically',()=>{
 const {run}=hitSummonedActor()
 const snapshot=run.snapshot()
 assert.equal(validateTowerSnapshot(snapshot),true)
 const restored=TowerRun.restore(JSON.parse(JSON.stringify(snapshot)))
 restored.setPlaytestAssist(true)
 run.advance(.1);restored.advance(.1)
 assert.deepEqual(restored.snapshot(),run.snapshot())
})

test('dead summons retain their consumed sword target slots without invalidating saves',()=>{
 const {run,actor,shot}=hitSummonedActor()
 const hits=[...shot.hitIds]
 run._damageEnemy({target:actor.id,damage:1e12,direct:false,scaled:true,source:'fixture'})
 run._deaths()
 assert.ok(!run.state.enemies.some(e=>e.id===actor.id))
 assert.deepEqual(shot.hitIds,hits,'death must not refund a piercing target slot')
 assert.equal(validateTowerSnapshot(run.snapshot()),true)
})

test('temporary sword hit references reject unknown owners, future sequences and wrong waves',()=>{
 const {run,shot}=hitSummonedActor()
 for(const id of ['arbitrary','temporary:a1:f2:w20:u1:99999999','temporary:a1:f2:w19:u1:1','temporary:a2:f2:w20:u1:1','temporary:a1:f2:w20:u1:0']){
  const s=run.snapshot()
  s.projectiles.find(p=>p.id===shot.id).hitIds=[id]
  assert.equal(validateTowerSnapshot(s),false,id)
 }
})

test('owner death can remove summons while in-flight sword receipts still round-trip',()=>{
 const {run,actor,shot}=hitSummonedActor()
 const hits=[...shot.hitIds]
 run._damageEnemy({target:actor.temporary.ownerId,damage:1e12,direct:false,scaled:true,source:'fixture'})
 run._deaths()
 assert.ok(!run.state.enemies.some(e=>e.id===actor.temporary.ownerId))
 assert.deepEqual(shot.hitIds,hits)
 assert.equal(validateTowerSnapshot(run.snapshot()),true)
 assert.deepEqual(TowerRun.restore(run.snapshot()).snapshot(),run.snapshot())
})

test('real owner and allocated global sequence do not forge a summon hit receipt',()=>{
 const {run,actor,shot}=hitSummonedActor()
 const s=run.snapshot(),fake=`temporary:${actor.temporary.ownerId}:1`
 assert.notEqual(fake,actor.id)
 s.projectiles.find(p=>p.id===shot.id).hitIds=[fake]
 assert.equal(validateTowerSnapshot(s),false,'sequence 1 belonged to a warning, not a summoned actor')
})

test('a different dead elite cannot borrow an allocated summon sequence',()=>{
 const {run,actor,shot}=hitSummonedActor(),s=run.snapshot()
 const other=s.killLedger.find(k=>k.archetype.startsWith('wolf_elite_'))
 assert.ok(other)
 const sequence=actor.id.split(':').at(-1)
 s.projectiles.find(p=>p.id===shot.id).hitIds=[`temporary:${other.id}:${sequence}`]
 assert.equal(validateTowerSnapshot(s),false)
})

test('summon allocation history is append-only across checkpoints and owner death',()=>{
 const {run,actor}=hitSummonedActor(),before=run.snapshot()
 assert.ok(before.monsterMechanics.summons.some(r=>r.id===actor.id))
 run._damageEnemy({target:actor.temporary.ownerId,damage:1e12,direct:false,scaled:true,source:'fixture'})
 run._deaths()
 const after=run.snapshot()
 assert.equal(validateMonsterMechanicsProgress(before,after),true)
 const erased=structuredClone(after);erased.monsterMechanics.summons=[]
 assert.equal(validateMonsterMechanicsProgress(before,erased),false)
 const rewritten=structuredClone(after);rewritten.monsterMechanics.summons[0].kind='minion'
 assert.equal(validateMonsterMechanicsProgress(before,rewritten),false)
})
