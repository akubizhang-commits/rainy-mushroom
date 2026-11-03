import test from 'node:test'
import assert from 'node:assert/strict'
import {TowerRun} from '../js/xianxia/TowerRun.js'
import {tickSwordBursts,validSwordBursts} from '../js/xianxia/TowerSwordBurst.js'
function fixture(rank=4){
 const r=new TowerRun({attemptId:41,floor:1,seed:312,xp:10920,hp:100,training:true,loadout:{growthVersion:1,active:{sj_yujian:1},passive:{sj_gate:rank},evolutions:[],evolutionLevels:{},tutorialWaves:0,weaponId:'eq_sword_suwen',weaponQuality:1,weaponRefine:0}})
 const s=r.state;s.enemies=[0,35,180].map((x,i)=>{const e=r._enemy({...s.pending[0],id:'enemy'+i,x,y:0});e.hp=e.maxHp=10000;return e});s.pending=[];s.reserved=[];s.player.attack=100;return r
}
const hit=(r,key,extra={})=>r._damageEnemy({target:'enemy0',source:'sj_yujian',damage:10,direct:true,impact:{skill:'sj_yujian',castId:key,dirX:1,dirY:0},...extra})
test('one direct hit starts four-sword sequence; burst damages once after the complete sequence',()=>{
 const r=fixture(),s=r.state;hit(r,'first');assert.equal(s.swordBursts.length,1)
 for(let i=0;i<4;i++)hit(r,'extra'+i)
 assert.equal(s.swordBursts.length,1)
 const hp=s.enemies.map(e=>e.hp);s.time=.4;tickSwordBursts(r);assert.deepEqual(s.enemies.map(e=>e.hp),hp)
 s.time=.42;tickSwordBursts(r);assert.deepEqual(s.enemies.map(e=>e.hp),[hp[0]-120,hp[1]-120,hp[2]])
 tickSwordBursts(r);assert.equal(s.effects.filter(e=>e.kind==='sword_burst').length,1)
})
test('zero damage, DOT and secondary damage do not trigger; global cooldown prevents repeats',()=>{
 const r=fixture()
 for(const extra of [{damage:0},{direct:false},{scaled:true},{source:'sword_burst'}])hit(r,'ignored',extra)
 assert.equal(r.state.swordBursts,undefined)
 hit(r,'one');hit(r,'one');assert.equal(r.state.swordBursts.length,1)
 r.state.time=3.99;hit(r,'early');assert.equal(r.state.swordBursts.length,1)
 r.state.time=4;hit(r,'new');assert.equal(r.state.swordBursts.length,2)
})
test('killing trigger still bursts once and pending state survives serialization',()=>{
 const r=fixture();r.state.enemies[0].hp=1;hit(r,'kill')
 assert.equal(r.state.swordBursts.length,1);assert.ok(validSwordBursts(r.state))
 r.state=JSON.parse(JSON.stringify(r.state));r.state.time=.42;tickSwordBursts(r)
 assert.equal(r.state.enemies[1].hp,9880);assert.equal(r.state.swordBursts.length,0)
 assert.equal(r.state.effects.filter(e=>e.kind==='sword_burst').length,1)
})
test('malformed burst snapshot is rejected and ranks increase damage/range',()=>{
 const r=fixture(1);for(let i=0;i<4;i++)hit(r,'a'+i)
 assert.equal(r.state.swordBursts[0].damage,50);assert.equal(r.state.swordBursts[0].radius,80)
 assert.ok(validSwordBursts(r.state));r.state.swordBursts[0].dueAt=-1;assert.equal(validSwordBursts(r.state),false)
})
test('real snapshot restore preserves pending burst and rejects corruption',()=>{
 const r=new TowerRun({attemptId:44,floor:1,seed:12,xp:0,hp:100,training:true,loadout:{growthVersion:1,active:{sj_yujian:1},passive:{},evolutions:[],evolutionLevels:{},tutorialWaves:0,weaponId:'eq_sword_suwen',weaponQuality:1,weaponRefine:0}})
 r.state.swordBursts=[{id:'burst-qa',targetId:'dead-target',x:0,y:0,radius:80,damage:50,dueAt:.42,startedAt:0}]
 const restored=TowerRun.restore(r.snapshot());assert.deepEqual(restored.state.swordBursts,r.state.swordBursts)
 restored.state.time=.42;tickSwordBursts(restored);assert.equal(restored.state.effects.filter(e=>e.kind==='sword_burst').length,1)
 tickSwordBursts(restored);assert.equal(restored.state.effects.filter(e=>e.kind==='sword_burst').length,1)
 const bad=r.snapshot();bad.swordBursts[0].damage=NaN;assert.throws(()=>TowerRun.restore(bad))
})
