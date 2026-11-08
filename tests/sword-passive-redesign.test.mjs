import test from 'node:test'
import assert from 'node:assert/strict'
import {TowerRun,validateTowerSnapshot} from '../js/xianxia/TowerRun.js'
import {tickQingping} from '../js/xianxia/TowerQingping.js'
import {tickSwordBursts} from '../js/xianxia/TowerSwordBurst.js'
import {monsterDamageMultiplier} from '../js/xianxia/TowerMonsterMechanics.js'

const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`)
function fixture(passive={sj_mark:1,sj_gate:2}){
 const r=new TowerRun({attemptId:91,floor:1,seed:101,xp:10920,hp:100,training:true,
  loadout:{growthVersion:1,active:{sj_line:1},passive,evolutions:[],evolutionLevels:{},tutorialWaves:0,
   weaponId:'eq_sword_suwen',weaponQuality:1,weaponRefine:0}})
 for(let i=0;i<600&&!r.state.enemies.length;i++)r.advance(1/60)
 r._random=()=>.99
 const e=r.state.enemies[0],originalHp=e.maxHp;e.hp=e.maxHp=1e7
 return {r,s:r.state,e,originalHp}
}
function hit(r,e,source='sj_yujian',extra={}){
 r._damageEnemy({target:e.id,source,damage:100,damageParts:{physical:100,magic:0},direct:true,
  impact:{skill:source,castId:'cast-1',pulseIndex:1,pulseCount:1},...extra})
}
test('only named heavy skills consume burst readiness; shadow needs its final pulse',()=>{
 const {r,s,e}=fixture({sj_gate:2})
 for(const source of ['basic_attack','sj_yujian','sj_arc','sj_moon','sj_moon_triple','orbit','formation']){
  hit(r,e,source);assert.equal(s.swordBursts?.length??0,0,source)
 }
 hit(r,e,'shadow',{impact:{castId:'shadow-1',pulseIndex:1,pulseCount:3}})
 assert.equal(s.swordBursts?.length??0,0)
 hit(r,e,'shadow',{impact:{castId:'shadow-1',pulseIndex:3,pulseCount:3}})
 assert.equal(s.swordBursts.length,1)
})
test('burst follows a moving enemy and cannot repeat from the same cast after cooldown',()=>{
 const {r,s,e}=fixture({sj_gate:2})
 hit(r,e,'sj_line');assert.equal(s.swordBursts.length,1)
 const start=s.time;e.x+=200
 s.time=start+.1;tickSwordBursts(r)
 near(s.swordBursts[0].x,e.x)
 const hp=e.hp;s.time=start+.2;tickSwordBursts(r)
 assert.ok(e.hp<hp,'moving original target must be hit')
 s.time=start+10;hit(r,e,'sj_line');assert.equal(s.swordBursts.length,0)
 hit(r,e,'sj_line',{impact:{castId:'cast-2',pulseIndex:1,pulseCount:1}})
 assert.equal(s.swordBursts.length,1)
})
