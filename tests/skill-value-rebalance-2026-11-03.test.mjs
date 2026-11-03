import test from 'node:test'
import assert from 'node:assert/strict'
import {TowerRun} from '../js/xianxia/TowerRun.js'
import {tickQingping} from '../js/xianxia/TowerQingping.js'
import {tickSwordBursts} from '../js/xianxia/TowerSwordBurst.js'
import {GROWTH_SKILLS} from '../js/xianxia/TowerGrowth.js'
import {createIronWeapon} from '../js/xianxia/TowerWeapons.js'
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`)
function probe(rank=0, extra={}) {
 const w=createIronWeapon()
 const loadout={weapon:w,weaponId:w.id,weaponQuality:0,weaponRefine:0,weaponFocusCount:0,growthVersion:1,active:{sj_arc:1},passive:{...(rank?{sj_mark:rank}:{}),...extra},
  evolutions:[],evolutionLevels:{},tutorialWaves:0}
 const r=new TowerRun({attemptId:1,floor:1,seed:1,xp:13485,hp:100,training:true,loadout})
 r.state.enemies=[{id:'target',hp:1e7,maxHp:1e7,x:80,y:0,radius:22,woundBudget:0,woundUntil:0,orbitNextAt:0}]
 r._random=()=>1
 return r
}
test('scar keeps the approved conversion tradeoff at every rank',()=>{
 for(let rank=1;rank<=4;rank++){
  const r=probe(rank),e=r.state.enemies[0]
  r._damageEnemy({target:e.id,source:'sj_arc',direct:true,damage:100})
  near(1e7-e.hp,50)
  near(e.woundBudget,[60,65,70,75][rank-1])
  for(let n=1;n<=6;n++){r.state.time=n*.5;for(const h of tickQingping(r))r._damageEnemy(h)}
  near(1e7-e.hp,[110,115,120,125][rank-1])
  assert.equal(e.qingpingDot,undefined)
 }
})
test('formation and derived explosions retain their damage without triggering conversion',()=>{
 for(const source of ['formation','orbit','sword_rain','sword_burst']){
  const r=probe(4),e=r.state.enemies[0]
  r._damageEnemy({target:e.id,source,direct:false,damage:100})
  near(1e7-e.hp,100);assert.equal(e.qingpingDot,undefined)
 }
})
test('shadow early ranks gain damage without changing the trained endpoint or per-rank cost',()=>{
 const d=GROWTH_SKILLS.find(s=>s.id==='sj_shadow')
 near(d.damage[0]/d.cooldown,1.6)
 near(d.damage[9],2.64*1.2**9)
 for(let i=1;i<10;i++)assert.ok(d.damage[i]>d.damage[i-1])
 assert.deepEqual(d.pointCosts,Array(10).fill(2))
})
test('burst retains its single pulse at half the investment and cannot recursively trigger itself',()=>{
 const r=probe(0,{sj_gate:4}),e=r.state.enemies[0]
 assert.deepEqual(GROWTH_SKILLS.find(s=>s.id==='sj_gate').pointCosts,[1,1,1,1])
 r._damageEnemy({target:e.id,source:'sj_arc',direct:true,damage:1})
 near(r.state.swordBursts[0].damage,r.state.player.attack*1.2)
 assert.equal(r.state.swordBursts.length,1)
 const before=e.hp;r.state.time=.42;tickSwordBursts(r)
 assert.ok(e.hp<before);assert.equal(r.state.swordBursts.length,0)
 r._damageEnemy({target:e.id,source:'sj_arc',direct:true,damage:1})
 assert.equal(r.state.swordBursts.length,0)
 r.state.time=4;r._damageEnemy({target:e.id,source:'sj_arc',direct:true,damage:1})
 assert.equal(r.state.swordBursts.length,1)
})
