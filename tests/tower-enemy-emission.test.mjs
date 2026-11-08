import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {stripTypeScriptTypes} from 'node:module'
import {runInNewContext} from 'node:vm'
import {TowerRun,validateTowerSnapshot} from '../js/xianxia/TowerRun.js'
import {enemyAttackSpec} from '../js/xianxia/TowerEnemyAttacks.js'

const source=stripTypeScriptTypes(readFileSync(new URL('../cocos-pilot/assets/scripts/TowerMonsterArt.ts',import.meta.url),'utf8').replace(/^import .*$/gm,''),{mode:'transform'}).replace(/^export /gm,'')
const Art=runInNewContext(source+';TowerMonsterArt',{})
const launch=(family='snake-lady')=>({family,role:'boss',rank:5,radius:24,faceX:1,enraged:false,x:0,y:0,range:300})
const shot=(family)=>({x:0,y:0,vx:270,vy:0,radius:12,hostile:true,element:'poison',launch:launch(family)})

test('snake projectile starts at mouth, mirrors, scales and rejoins its unchanged ground collision path',()=>{
 assert.equal(typeof Art.projectilePose,'function','projectiles need an authored emitter pose')
 const p=shot(),before=JSON.stringify(p),start=Art.projectilePose(p)
 assert.ok(start.y>120,'boss mouth must be above the tail base')
 assert.ok(start.x>0,'right-facing portrait mirrors the left-facing mouth')
 p.launch.faceX=-1
 const left=Art.projectilePose(p)
 assert.equal(left.x,-start.x);assert.equal(left.y,start.y)
 p.launch.faceX=1;p.launch.enraged=true
 const rage=Art.projectilePose(p)
 assert.ok(Math.abs(rage.y-start.y*1.2)<1e-8)
 p.launch.enraged=false;p.x=300
 const end=Art.projectilePose(p)
 assert.equal(end.x,300);assert.equal(end.y,0)
 p.x=0
 assert.equal(JSON.stringify(p),before,'rendering must not move simulation projectiles')
})

for(const family of ['snake','snake-lady','scorpion','scorpion-humanoid','bat','bat-humanoid','falcon','falcon-humanoid']){
 test(`${family}: all roles and ranks have finite elevated emitters; pause and restored shots are deterministic`,()=>{
  assert.equal(typeof Art.projectilePose,'function')
  for(const role of ['normal','elite','boss'])for(const rank of [1,4,7])for(const faceX of [-1,1]){
   const p=shot(family);Object.assign(p.launch,{role,rank,faceX})
   const a=Art.projectilePose(p)
   assert.ok(Number.isFinite(a.x+a.y+a.angle));assert.ok(a.y>5)
   assert.deepEqual(Art.projectilePose(JSON.parse(JSON.stringify(p))),a)
   assert.deepEqual(Art.projectilePose(p),a)
  }
 })
}

test('nearby targets and vertical/diagonal shots converge before the aimed collision boundary',()=>{
 assert.equal(typeof Art.projectilePose,'function')
 for(const [vx,vy] of [[270,0],[-270,0],[0,270],[0,-270],[162,216]]){
  const p=shot();Object.assign(p,{vx,vy});p.launch.range=70
  Object.assign(p,{x:vx/270*32,y:vy/270*32})
  const a=Art.projectilePose(p)
  assert.equal(a.x,p.x);assert.equal(a.y,p.y)
  assert.equal(a.angle,Math.atan2(vy,vx))
 }
 const p=shot();delete p.launch
 const a=Art.projectilePose(p)
 assert.equal(a.x,0);assert.equal(a.y,0)
})

test('real ranged releases freeze launch identity for every family and all three boss pellets',()=>{
 for(const family of ['snake','scorpion','bat','falcon']){
  const run=new TowerRun({attemptId:1,floor:5,seed:123,hp:100,xp:0,loadout:{active:{sj_yujian:1},passive:{},evolutions:[],weaponId:'eq_sword_suwen',weaponQuality:1,weaponRefine:0}})
  const s=run.state,e=run._enemy({id:'caster',archetype:`${family}_normal`,x:s.player.x-240,y:s.player.y})
  Object.assign(e,{family,role:'boss',rank:5})
  s.enemies=[e];s.time=10;s.nextWindupAt=0
  run._newAttack(e,enemyAttackSpec(e,240,s.time))
  e.ai.mode='active';e.ai.until=11
  run._enemyActions([],s.player)
  assert.equal(s.projectiles.length,3)
  for(const p of s.projectiles){
   assert.ok(p.launch,`${family} must retain its emission source after owner removal`)
   assert.equal(p.launch.x,e.x);assert.equal(p.launch.y,e.y)
   assert.equal(p.launch.range,240);assert.equal(p.launch.role,'boss')
   assert.equal(p.x,e.x);assert.equal(p.y,e.y,'collision origin stays on the ground')
  }
  const saved=JSON.stringify(s.projectiles)
  e.x+=100;e.rank=9;e.hp=0;e.mechanic={enraged:true};s.enemies=[]
  assert.equal(JSON.stringify(s.projectiles),saved)
 }
})

test('launch data survives a real checkpoint, rejects corrupt metadata without mutating the checkpoint',()=>{
 const run=new TowerRun({attemptId:1,floor:1,seed:123,hp:100,xp:0,loadout:{active:{sj_yujian:1},passive:{},evolutions:[],weaponId:'eq_sword_suwen',weaponQuality:1,weaponRefine:0}})
 run._projectile(0,0,270,0,12,10,true,{element:'poison',launch:launch()})
 const snapshot=run.snapshot()
 assert.ok(validateTowerSnapshot(snapshot))
 const restored=TowerRun.restore(snapshot)
 assert.deepEqual(Art.projectilePose(restored.state.projectiles[0]),Art.projectilePose(snapshot.projectiles[0]))
 for(const [key,value] of [['range',-1],['faceX',0],['family','unknown'],['rank',Infinity],['enraged','yes']]){
  const bad=structuredClone(snapshot);bad.projectiles[0].launch[key]=value
  const before=structuredClone(bad)
  assert.throws(()=>TowerRun.restore(bad),/Invalid tower snapshot/)
  assert.deepEqual(bad,before)
 }
})

test('vertical releases retain a definite facing shared with the rendered attack pose',()=>{
 for(const face of [-1,1]){
  const run=new TowerRun({attemptId:1,floor:5,seed:123,hp:100,xp:0,loadout:{active:{sj_yujian:1},passive:{},evolutions:[],weaponId:'eq_sword_suwen',weaponQuality:1,weaponRefine:0}})
  const s=run.state,e=run._enemy({id:'caster',archetype:'snake_normal',x:s.player.x,y:s.player.y-180})
  s.enemies=[e];s.time=10;e.ai.faceX=face
  run._newAttack(e,enemyAttackSpec(e,180,s.time))
  assert.equal(e.ai.attack.emissionFaceX,face)
  e.ai.mode='active';e.ai.until=11;run._enemyActions([],s.player)
  assert.equal(s.projectiles[0].launch.faceX,face)
  assert.equal(s.projectiles[0].vx,0)
 }
})

test('live web and healing attachments follow actual model transform and delegated renderers',()=>{
 const root=new Art(),child=new Art(),node={position:{x:20,y:30},scale:{x:-1,y:1.2}}
 root.speciesRenderers.set('spider',child)
 const actor={family:'spider',seen:true,node,transform:{anchorX:.5,anchorY:.1,width:200,height:200}}
 child.actors.set('web',actor)
 const p=root.attachmentPosition('web','web')
 assert.equal(p.x,20);assert.ok(Math.abs(p.y-111.6)<1e-8)
 actor.seen=false;assert.equal(root.attachmentPosition('web','web'),null)
 actor.seen=true;actor.diedAt=0;assert.equal(root.attachmentPosition('web','web'),null)
 delete actor.diedAt;actor.family='snake-lady'
 const body=root.attachmentPosition('web','spirit')
 assert.ok(Math.abs(body.x-26)<1e-8);assert.ok(Math.abs(body.y-140.4)<1e-8)
})
