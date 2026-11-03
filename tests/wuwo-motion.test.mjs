import test from 'node:test'
import assert from 'node:assert/strict'
import { skillForm, orbitSwordPose } from '../js/xianxia/TowerSkillForms.js'
import { TowerRun } from '../js/xianxia/TowerRun.js'

const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`)
test('each sword smoothly speeds up and slows down on its own reproducible cycle',()=>{
 const f=skillForm('evo_wuwo',2,10),curves=[]
 for(let i=0;i<12;i++){
  const values=Array.from({length:241},(_,n)=>orbitSwordPose(f,n/20,i).speedFactor)
  assert.ok(values.every(Number.isFinite))
  assert.ok(Math.min(...values)<.55&&Math.max(...values)>1.45)
  assert.ok(values.slice(1).every((v,n)=>Math.abs(v-values[n])<.12),'no abrupt speed jumps')
  curves.push(values.map(v=>v.toFixed(3)).join(','))
 }
 assert.equal(new Set(curves).size,12)
})
test('wuwo retains ranges and counts with twice the previous independent flight speed',()=>{
 for(const [rank,radius,inner,count] of [[1,180,120,8],[2,210,150,12]]){
  const f=skillForm('evo_wuwo',rank,10)
  assert.equal(f.radius,radius);assert.equal(f.innerRadius,inner)
  assert.equal(f.swords,count);assert.equal(f.motionSpeed,2.6)
  assert.equal(f.interval,.6)
 }
})
test('wuwo blades have distinct tracks, tangent headings and replay-stable endpoints',()=>{
 const f=skillForm('evo_wuwo',2,10)
 const radii=new Set(),heights=new Set()
 for(let i=0;i<f.swords;i++){
  const a=orbitSwordPose(f,2,i),b=orbitSwordPose(f,2.001,i)
  assert.deepEqual(a,orbitSwordPose(f,2,i))
  radii.add(Math.round(Math.hypot(a.x,a.y)))
  heights.add(Math.round(a.depthY-a.y))
  const tangent=Math.atan2(b.y-a.y,b.x-a.x)
  assert.ok(Math.cos(tangent-a.angle)>.999,'blade points along flight, not radially outwards')
  close(Math.hypot(a.tipX-a.baseX,a.tipY-a.baseY),a.length)
  close((a.baseX+a.tipX)/2,a.x);close((a.baseY+a.tipY)/2,a.y)
 }
 assert.ok(radii.size>6);assert.ok(heights.size>3)
})
test('inner expansion deals one shared hit per enemy without overlapping double damage',()=>{
 const run=new TowerRun({attemptId:31,floor:9,seed:123,xp:0,hp:100,
  loadout:{growthVersion:1,active:{sj_yujian:1,sj_wanjian:10},passive:{},evolutions:['evo_wuwo'],
   evolutionLevels:{evo_wuwo:2},tutorialWaves:0,weaponId:'eq_sword_suwen',weaponQuality:1,weaponRefine:0}})
 run.state.cooldowns.sj_yujian=1e8
 for(let i=0;i<300&&!run.state.enemies.length;i++)run.advance(1/60)
 const s=run.state,e=s.enemies[0]
 Object.assign(e,{x:s.player.x,y:s.player.y+140,radius:2,hp:1e6,maxHp:1e6,moveSpeed:0,orbitNextAt:0})
 e.ai.graceUntil=1e8;s.enemies=[e];s.pending=[];s.reserved=[]
 run.advance(1/60)
 assert.ok(e.hp<1e6,'new inner band is active away from the horizontal sword lanes')
 const hp=e.hp,at=e.orbitNextAt
 run.advance(.4);assert.equal(e.hp,hp)
 run.advance(.4)
 assert.ok(e.orbitNextAt>at)
})
test('unmodified live wuwo attempt saves and resumes deterministically',()=>{
 const run=new TowerRun({attemptId:32,floor:9,seed:123,xp:0,hp:100,
  loadout:{growthVersion:1,active:{sj_yujian:1,sj_wanjian:10},passive:{},evolutions:['evo_wuwo'],
   evolutionLevels:{evo_wuwo:2},tutorialWaves:0,weaponId:'eq_sword_suwen',weaponQuality:1,weaponRefine:0}})
 run.advance(.8)
 const restored=TowerRun.restore(JSON.parse(JSON.stringify(run.snapshot())))
 for(let i=0;i<120;i++){
  run.advance(1/60);restored.advance(1/60)
  assert.deepEqual(restored.snapshot(),run.snapshot())
 }
})
test('outer swords retain expanded combat reach in all four world directions',()=>{
 const run=new TowerRun({attemptId:33,floor:9,seed:123,xp:0,hp:100,
  loadout:{growthVersion:1,active:{sj_yujian:1,sj_wanjian:10},passive:{},evolutions:['evo_wuwo'],
   evolutionLevels:{evo_wuwo:2},tutorialWaves:0,weaponId:'eq_sword_suwen',weaponQuality:1,weaponRefine:0}})
 const s=run.state,p=s.player,seen=new Set()
 s.enemies=[[180,0],[-180,0],[0,180],[0,-180]].map(([x,y],id)=>({
  id:`outer-${id}`,hp:1000,x:p.x+x,y:p.y+y,radius:2,orbitNextAt:0
 }))
 for(let i=1;i<=720;i++){
  s.time=i/60;const outgoing=[];run._growthSkills(outgoing,undefined,p)
  for(const hit of outgoing)seen.add(hit.target)
 }
 assert.equal(seen.size,4,'screen perspective must not compress world collision reach')
})
