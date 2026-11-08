import test from 'node:test'
import assert from 'node:assert/strict'
import {TowerRun,validateTowerSnapshot} from '../js/xianxia/TowerRun.js'
import {GROWTH_SKILLS} from '../js/xianxia/TowerGrowth.js'
import {tickQingping} from '../js/xianxia/TowerQingping.js'
import {enemyDebuffs} from '../js/xianxia/TowerEnemyStatuses.js'
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`)
function fixture(){
 const r=new TowerRun({attemptId:91,floor:1,seed:101,xp:10920,hp:100,training:true,
  loadout:{growthVersion:1,active:{sj_line:1},passive:{sj_mark:1},evolutions:[],evolutionLevels:{},tutorialWaves:0,
   weaponId:'eq_sword_suwen',weaponQuality:1,weaponRefine:0}})
 for(let i=0;i<600&&!r.state.enemies.length;i++)r.advance(1/60)
 r._random=()=>.99
 const e=r.state.enemies[0],originalHp=e.maxHp;e.hp=e.maxHp=1e7
 return {r,s:r.state,e,originalHp}
}
function hit(r,e,extra={}){
 const before=e.hp
 r._damageEnemy({target:e.id,source:'sj_yujian',damage:100,damageParts:{physical:100,magic:0},direct:true,...extra})
 return before-e.hp
}
test('scar costs one point to master at rank one',()=>{
 const d=GROWTH_SKILLS.find(d=>d.id==='sj_mark')
 assert.equal(d.maxLevel,1);assert.deepEqual(d.pointCosts,[1]);assert.equal(d.icd,10)
 assert.equal(d.vulnerability,.2);assert.equal(d.dot_tick,undefined)
})
test('trigger hit stays immediate; only subsequent direct damage gains 20%; no DOT or animation state',()=>{
 const {r,s,e}=fixture(),p=100*500/(500+e.physicalDefense),q=100*500/(500+e.physicalDefense*.8);near(hit(r,e),p)
 assert.ok(e.scarDebuff);assert.equal(e.qingping,undefined);assert.equal(e.qingpingDot,undefined)
 near(hit(r,e),1.2*q)
 near(hit(r,e,{direct:false,scaled:true,source:'weapon_bleed'}),100)
 near(hit(r,e,{direct:false,source:'formation'}),q)
 near(hit(r,e,{direct:true,source:'sj_wanjian'}),q)
 assert.deepEqual(tickQingping(r),[])
 assert.deepEqual(enemyDebuffs(e,s.time).map(d=>d.label),['蚀骨易伤20%'])
})
test('global ten second cooldown affects one target; hits neither stack nor refresh; exact expiry and ready boundary',()=>{
 const {r,s,e}=fixture(),t=s.time,p=100*500/(500+e.physicalDefense)
 const other={...structuredClone(e),id:'other'};s.enemies.push(other)
 hit(r,e);hit(r,other);assert.equal(other.scarDebuff,undefined)
 near(s.scarReadyAt,t+10)
 s.time=t+2;hit(r,e);near(e.scarDebuff.endsAt,t+3)
 s.time=t+3;near(hit(r,e),p);tickQingping(r);assert.equal(e.scarDebuff,undefined)
 s.time=t+9.99;hit(r,other);assert.equal(other.scarDebuff,undefined)
 s.time=t+10;near(hit(r,other),p);assert.ok(other.scarDebuff);near(s.scarReadyAt,t+20)
})
test('periodic and derived hits, zero damage, misses and killing hits do not consume readiness',()=>{
 const {r,s,e}=fixture()
 for(const extra of [{source:'formation',direct:false},{source:'sj_wanjian',direct:true},{source:'evo_wuwo',direct:true},{source:'weapon_on_hit',scaled:true},{source:'sword_burst',scaled:true},{damage:0,damageParts:{physical:0,magic:0}}]){
  hit(r,e,extra);assert.equal(e.scarDebuff,undefined);assert.equal(s.scarReadyAt,0)
 }
 hit(r,{id:'missing',hp:1});assert.equal(s.scarReadyAt,0)
 e.hp=1;hit(r,e);assert.equal(e.scarDebuff,undefined);assert.equal(s.scarReadyAt,0)
})
test('armor is unchanged; debuff works on both armored and unarmored enemies and clears on death',()=>{
 const {r,s,e}=fixture(),p=100*500/(500+e.physicalDefense),q=100*500/(500+e.physicalDefense*.8);e.mechanic={armor:.5,armorUntil:s.time+100,vulnerableUntil:0,vulnerability:0}
 near(hit(r,e),.5*p);near(hit(r,e),.6*q)
 e.mechanic.armor=0;near(hit(r,e),1.2*q)
 e.hp=1;hit(r,e);assert.equal(e.scarDebuff,undefined);assert.deepEqual(enemyDebuffs(e,s.time),[])
})
test('debuff and cooldown pause, restore deterministically, and reject corrupt saved state',()=>{
 const {r,s,e,originalHp}=fixture();e.hp=e.maxHp=originalHp
 hit(r,e,{damage:.01,damageParts:{physical:.01,magic:0}});delete r._random
 r.pause();const snap=r.snapshot();assert.ok(validateTowerSnapshot(snap))
 r.advance(1);assert.deepEqual(r.snapshot(),snap)
 const copy=TowerRun.restore(snap);copy.resume();r.resume()
 for(let i=0;i<30;i++){r.advance(1/60);copy.advance(1/60)}
 assert.deepEqual(r.snapshot(),copy.snapshot())
 for(const edit of [x=>x.scarReadyAt=-1,x=>x.scarReadyAt=x.time+11,x=>x.enemies[0].scarDebuff.vulnerability=2,x=>x.enemies[0].scarDebuff.endsAt=x.time+4]){
  const bad=structuredClone(snap);edit(bad);assert.equal(validateTowerSnapshot(bad),false)
 }
})
