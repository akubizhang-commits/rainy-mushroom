import test from 'node:test'
import assert from 'node:assert/strict'
import {TowerRun,validateTowerSnapshot} from '../js/xianxia/TowerRun.js'
import {tickMonsterMechanics} from '../js/xianxia/TowerMonsterMechanics.js'

function fixture() {
 const run=new TowerRun({attemptId:1,floor:5,seed:123,hp:100,xp:0,
  loadout:{active:{sj_yujian:1},passive:{},evolutions:[],weaponId:'eq_sword_suwen',weaponQuality:1,weaponRefine:0}})
 const s=run.state;s.time=100;s.ticks=6000;s.nextWindupAt=0
 const e=run._enemy({id:'caster',archetype:'snake_boss',x:s.player.x+200,y:s.player.y})
 s.enemies=[e];s.pending=[];s.reserved=[]
 e.ai.entryUntil=e.ai.readyAt=e.ai.graceUntil=0
 for(const id of e.mechanic.skills)e.mechanic.cooldowns[id]=id==='M16'?0:1e9
 return {run,s,e}
}

test('ready boss mechanic drains existing hostile shots without scheduling more ordinary attacks',()=>{
 const {run,s,e}=fixture()
 const shot={id:'in-flight',hostile:true};s.projectiles=[shot]
 run._requestAttacks(tickMonsterMechanics(run,[]))
 assert.equal(e.ai.mode,'approach','ready M16 must not be starved by another ordinary shot')
 assert.equal(s.projectiles[0],shot,'in-flight shots must not be erased or changed')
 assert.equal(e.mechanic.uses.M16,0,'mechanic cannot overlap the in-flight shot')
 s.projectiles=[]
 tickMonsterMechanics(run,[])
 assert.equal(e.mechanic.skillId,'M16')
 assert.equal(e.mechanic.phase,'windup')
 assert.equal(e.mechanic.uses.M16,1)
})

for(const reason of ['cooldown','global-gap','control-protection','offscreen'])test(`ordinary attacks remain available when drain is inapplicable: ${reason}`,()=>{
 const {run,s,e}=fixture()
 s.projectiles=[{id:'in-flight',hostile:reason!=='friendly-only'}]
 if(reason==='cooldown')e.mechanic.cooldowns.M16=200
 if(reason==='global-gap')s.monsterMechanics.nextMajorAt=200
 if(reason==='control-protection')s.monsterControl.rootUntil=s.time-1
 if(reason==='offscreen'){
  const support=run._enemy({id:'support',archetype:'snake_normal',x:s.player.x+200,y:s.player.y})
  support.ai.entryUntil=support.ai.readyAt=support.ai.graceUntil=0;support.ai.cooldowns={}
  s.enemies.push(support);run._visible=actor=>actor.id==='support'
 }
 run._requestAttacks(tickMonsterMechanics(run,[]))
 assert.ok(s.enemies.some(actor=>actor.ai.mode==='windup'))
})

test('friendly projectiles do not postpone a ready mechanic',()=>{
 const {run,s,e}=fixture(),shot={id:'friendly',hostile:false}
 s.projectiles=[shot]
 assert.notEqual(tickMonsterMechanics(run,[]),true)
 assert.equal(e.mechanic.uses.M16,1)
 assert.equal(s.projectiles[0],shot)
})

test('the final shot expiring later in the tick still leaves the next tick free for the ready mechanic',()=>{
 const {run,s,e}=fixture()
 s.projectiles=[{id:'last-shot',hostile:true}]
 run._projectiles=()=>{s.projectiles=[]}
 run.advance(1/60)
 assert.equal(e.ai.mode,'approach')
 assert.equal(e.mechanic.uses.M16,0)
 run.advance(1/60)
 assert.equal(e.mechanic.uses.M16,1)
 assert.equal(e.mechanic.phase,'windup')
})

test('a ready mechanic with no legal summon position does not indefinitely disable ordinary attacks',()=>{
 const {run,s,e}=fixture()
 e.hp=e.maxHp*.5;e.mechanic.cooldowns.M16=1e9;e.mechanic.cooldowns.M03=0
 s.view={xmin:s.player.x-1,xmax:s.player.x+1,ymin:s.player.y-1,ymax:s.player.y+1}
 run._visible=()=>true
 tickMonsterMechanics(run,[])
 assert.equal(e.mechanic.uses.M03,0)
 run._requestAttacks()
 assert.equal(e.ai.mode,'windup')
})

test('a naturally firing boss reaches its mechanic and a drain checkpoint resumes deterministically',()=>{
 const {run}=fixture(),s=run.state
 // Use a fresh complete ledger instead of the controlled actors above.
 const actual=new TowerRun({attemptId:1,floor:5,seed:123,hp:100,xp:0,loadout:s.loadout,arenaVersion:1})
 actual.setPlaytestAssist(true)
 for(let i=0;i<30000&&actual.state.wave<20;i++){
  actual.resume()
  for(const e of actual.state.enemies)actual._damageEnemy({target:e.id,damage:1e12,direct:false,scaled:true,source:'fixture'})
  actual.advance(.1)
 }
 assert.equal(actual.state.wave,20)
 for(const id in actual.state.cooldowns)actual.state.cooldowns[id]=1e9
 for(let i=0;i<600&&!actual.state.enemies.some(e=>e.role==='boss');i++){actual.resume();actual.advance(1/60)}
 const boss=actual.state.enemies.find(e=>e.role==='boss');assert.ok(boss)
 let waited=false
 const request=actual._requestAttacks.bind(actual)
 actual._requestAttacks=drain=>{waited ||= !!drain;request(drain)}
 for(let i=0;i<6000&&!waited;i++){
  const p=actual.state.player,dx=boss.x-p.x,dy=boss.y-p.y,d=Math.hypot(dx,dy)
  actual.resume();actual.setInput(d>180?dx/d:0,d>180?dy/d:0);actual.advance(1/60)
 }
 assert.ok(waited,'actual hostile projectile stream must exercise draining')
 const snapshot=actual.snapshot()
 assert.ok(validateTowerSnapshot(snapshot))
 const restored=TowerRun.restore(snapshot);restored.setPlaytestAssist(true)
 for(let i=0;i<1800;i++){actual.advance(1/60);restored.advance(1/60)}
 assert.deepEqual(restored.snapshot(),actual.snapshot())
 assert.ok(boss.mechanic.uses.M16+boss.mechanic.uses.M11>0,'ranged boss must get a real mechanic turn')
})
