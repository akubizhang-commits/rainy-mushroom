import test from 'node:test'
import assert from 'node:assert/strict'
import { TowerRun } from '../js/xianxia/TowerRun.js'
function make(rank=10){
 return new TowerRun({attemptId:1,floor:1,seed:7,xp:0,hp:100,training:true,
 loadout:{growthVersion:1,active:{sj_yujian:rank},passive:{},evolutions:[],evolutionLevels:{},tutorialWaves:0,weaponId:'eq_sword_suwen',weaponQuality:1,weaponRefine:0}})
}
function tick(r,t){r.state.time=t;r._growthSkills([],()=>{},r.state.player)}
function release(r,t){
 tick(r,t)
 const pending=r.state.casts.find(c=>c.skill==='sj_yujian')
 if(pending)tick(r,pending.releaseAt)
}
function enemies(r,n){const p=r.state.player;r.state.enemies=Array.from({length:n},(_,i)=>({id:`target-${i}`,x:p.x+200,y:p.y+i*10,hp:10000,radius:8}))}
test('rank ten generates one sword per half second and caps stored swords at rank',()=>{
 const r=make();tick(r,.49);assert.equal(r.state.yujian.ready,0)
 for(let i=1;i<=10;i++){tick(r,i*.5);assert.equal(r.state.yujian.ready,i)}
 tick(r,50);assert.equal(r.state.yujian.ready,10);assert.equal(r.state.projectiles.length,0)
})
test('ten stored swords launch together at one target, then only one replacement is generated',()=>{
 const r=make();for(let i=1;i<=10;i++)tick(r,i*.5)
 enemies(r,1);release(r,5.01)
 assert.equal(r.state.projectiles.length,10);assert.equal(r.state.yujian.ready,0)
 assert.equal(new Set(r.state.projectiles.map(s=>s.flightAt)).size,1)
 assert.equal(new Set(r.state.projectiles.map(s=>s.targetId)).size,1)
 tick(r,5.49);assert.equal(r.state.projectiles.length,10)
 release(r,5.5);assert.equal(r.state.projectiles.length,11)
 release(r,6);assert.equal(r.state.projectiles.length,12)
})
test('stored swords distribute over several enemies and share equal per-sword damage',()=>{
 const r=make(3),interval=.5**(2/9);for(let i=1;i<=3;i++)tick(r,i*interval)
 enemies(r,2);release(r,3*interval+.01)
 assert.equal(r.state.projectiles.length,3)
 assert.equal(new Set(r.state.projectiles.map(s=>s.targetId)).size,2)
 assert.ok(r.state.projectiles.every(s=>Math.abs(s.damage-209.88*.75*interval)<1e-8))
})
test('rank one can replenish while its previous sword is still in flight',()=>{
 const r=make(1);enemies(r,1);release(r,1);release(r,2)
 assert.equal(r.state.projectiles.length,2)
 assert.ok(r.state.projectiles.every(s=>Math.abs(s.damage-139.92*.75)<1e-8))
})
test('a weak lone enemy receives only enough swords and the rest remain stored',()=>{
 const r=make(10);for(let i=1;i<=10;i++)tick(r,i*.5)
 enemies(r,1);r.state.enemies[0].hp=300
 release(r,5.01)
 assert.equal(r.state.projectiles.length,2)
 assert.equal(r.state.yujian.ready,8)
 tick(r,5.3)
 assert.equal(r.state.projectiles.length,2,'in-flight damage prevents repeat dispatch')
 assert.equal(r.state.yujian.ready,8)
})
test('surplus swords cover the next enemy while preserving unused reserves',()=>{
 const r=make(10);for(let i=1;i<=10;i++)tick(r,i*.5)
 enemies(r,2);r.state.enemies[0].hp=1;r.state.enemies[1].hp=300
 release(r,5.01)
 assert.equal(r.state.projectiles.filter(s=>s.targetId==='target-0').length,1)
 assert.equal(r.state.projectiles.filter(s=>s.targetId==='target-1').length,2)
 assert.equal(r.state.yujian.ready,7)
})
test('expired or blocked swords release reserved damage so replacements can launch',()=>{
 const r=make(10);r.state.yujian.ready=10;enemies(r,1);r.state.enemies[0].hp=1
 release(r,.1);assert.equal(r.state.projectiles.length,1)
 r.state.projectiles[0].dissolveAt=.4;r.state.projectiles[0].expiresAt=.65
 release(r,.4);assert.equal(r.state.projectiles.length,2)
 assert.equal(r.state.yujian.ready,9,'production continues during the second startup')
})
test('retargeting skips enemies already covered by another in-flight sword',()=>{
 const r=make(10);r.state.yujian.ready=10;enemies(r,3)
 r.state.enemies.forEach(e=>e.hp=1);release(r,.1)
 const shot=r.state.projectiles[0]
 r.state.enemies.find(e=>e.id===shot.targetId).hp=0
 r.state.time=shot.flightAt+.01
 const outgoing=[];r._projectiles([],outgoing,r.state.player)
 assert.notEqual(shot.dissolveAt,null,'no unreserved target means no redundant chase')
})
test('reservations account for current armor and fixed damage bonuses without rolling crit',()=>{
 const r=make(1);r.state.yujian.ready=1;enemies(r,1)
 const enemy=r.state.enemies[0];enemy.hp=100
 enemy.mechanic={armorUntil:10,armor:.5}
 release(r,.1);assert.equal(r.state.projectiles.length,1)
 release(r,1);assert.equal(r.state.projectiles.length,2,'one reduced hit is insufficient')
 tick(r,2);assert.equal(r.state.projectiles.length,2,'two reduced hits already cover HP')
 assert.equal(r.state.yujian.ready,1)
})
test('real fixed-step pause and restore preserve reserve, production clock and continuation',async()=>{
 const {validateTowerSnapshot}=await import('../js/xianxia/TowerRun.js')
 const r=make(10);r.state.cooldowns.sj_yujian=999
 r.advance(.75);r.pause()
 const snap=r.snapshot();assert.ok(validateTowerSnapshot(snap));assert.equal(snap.yujian.ready,1)
 r.advance(5);assert.deepEqual(r.snapshot(),snap)
 const restored=TowerRun.restore(JSON.parse(JSON.stringify(snap)))
 for(const run of [r,restored]){run.resume();run.advance(.3)}
 assert.equal(r.state.yujian.ready,2);assert.deepEqual(r.snapshot(),restored.snapshot())
 for(const patch of [{ready:11},{ready:-1},{nextAt:r.state.time+100}]){
  const bad=r.snapshot();Object.assign(bad.yujian,patch);assert.equal(validateTowerSnapshot(bad),false)
 }
})
test('actual fixed-step scheduling is independent of advance batching',()=>{
 const a=make(),b=make();a.state.cooldowns.sj_yujian=b.state.cooldowns.sj_yujian=999
 for(let i=0;i<20;i++)a.advance(.1)
 for(let i=0;i<120;i++)b.advance(1/60)
 assert.deepEqual(a.snapshot(),b.snapshot())
})
test('rank-one replacement finds a second enemy when the nearest already has lethal damage inbound',()=>{
 const r=make(1);enemies(r,2);r.state.enemies.forEach(e=>e.hp=1)
 release(r,1);release(r,2)
 assert.equal(r.state.projectiles.length,2)
 assert.equal(new Set(r.state.projectiles.map(s=>s.targetId)).size,2)
})

test('single replacement swords cycle through all ten shoulder slots even at rank one',()=>{
 const r=make(1);enemies(r,1)
 for(let i=1;i<=12;i++)release(r,i)
 assert.deepEqual(r.state.projectiles.map(s=>s.yujianSlot),[0,1,2,3,4,5,6,7,8,9,0,1])
})
test('each sword launches from its current breathing shoulder point',async()=>{
 const {yujianHoverPose,yujianVisualPose}=await import('../js/xianxia/TowerYujian.js')
 const r=make();for(let i=1;i<=10;i++)tick(r,i*.5)
 enemies(r,1);release(r,5.01)
 for(const shot of r.state.projectiles){
  const pose=yujianHoverPose(shot.yujianSlot,r.state.time,r.state.yujian)
  assert.deepEqual(yujianHoverPose(shot.yujianSlot,r.state.time,r.state.yujian),pose)
  for(const t of [shot.gatherAt,shot.flightAt]){
   const visual=yujianVisualPose(shot,t)
   assert.ok(Math.hypot(visual.x-pose.x,visual.y-pose.y)<1e-8)
  }
 }
})

test('restoring rank-one flight preserves a shoulder slot above the skill rank',async()=>{
 const {validateTowerSnapshot}=await import('../js/xianxia/TowerRun.js')
 const r=make(1);r.state.yujian.head=9
 for(let i=0;i<1800&&!r.state.projectiles.length;i++)r.advance(1/60)
 assert.ok(r.state.projectiles.some(p=>p.yujianSlot===9))
 assert.ok(validateTowerSnapshot(r.snapshot()))
 const restored=TowerRun.restore(r.snapshot())
 r.advance(.2);restored.advance(.2)
 assert.deepEqual(restored.snapshot(),r.snapshot())
 for(const head of [-1,10,.5]){
  const bad=r.snapshot();bad.yujian.head=head
  assert.equal(validateTowerSnapshot(bad),false)
 }
})
