import test from 'node:test'
import assert from 'node:assert/strict'
import {TowerRun} from '../js/xianxia/TowerRun.js'
import {tickSwordBursts,validSwordBursts} from '../js/xianxia/TowerSwordBurst.js'
function fixture(rank=2){
 const r=new TowerRun({attemptId:41,floor:1,seed:312,xp:10920,hp:100,training:true,loadout:{growthVersion:1,active:{sj_yujian:1},passive:{sj_gate:rank},evolutions:[],evolutionLevels:{},tutorialWaves:0,weaponId:'eq_sword_suwen',weaponQuality:1,weaponRefine:0}})
 const s=r.state;s.enemies=[0,35,180].map((x,i)=>{const e=r._enemy({...s.pending[0],id:'enemy'+i,x,y:0});e.hp=e.maxHp=10000;e.physicalDefense=e.magicDefense=0;return e});s.pending=[];s.reserved=[];s.player.attack=100;return r
}
const hit=(r,key,extra={})=>r._damageEnemy({target:'enemy0',source:'sj_line',damage:10,direct:true,impact:{skill:'sj_yujian',castId:key,dirX:1,dirY:0},...extra})
const burstDamage=120*(.5+.5*90/110)
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`)
test('one heavy hit bursts in the body then damages neighbors only after sword flight',()=>{
 const r=fixture(),s=r.state;hit(r,'first');assert.equal(s.swordBursts.length,1)
 for(let i=0;i<4;i++)hit(r,'extra'+i)
 assert.equal(s.swordBursts.length,1)
 const hp=s.enemies.map(e=>e.hp);s.time=.19;tickSwordBursts(r);assert.deepEqual(s.enemies.map(e=>e.hp),hp)
 s.time=.2;tickSwordBursts(r)
 near(s.enemies[0].hp,hp[0]-burstDamage);assert.equal(s.enemies[1].hp,hp[1]);s.time=.4;tickSwordBursts(r);near(s.enemies[1].hp,hp[1]-burstDamage);assert.equal(s.enemies[2].hp,hp[2])
 tickSwordBursts(r);assert.equal(s.effects.filter(e=>e.kind==='sword_burst').length,1)
})
test('zero damage, DOT and secondary damage do not trigger; global cooldown prevents repeats',()=>{
 const r=fixture()
 for(const extra of [{damage:0},{direct:false},{scaled:true},{source:'sword_burst'}])hit(r,'ignored',extra)
 assert.equal(r.state.swordBursts,undefined)
 hit(r,'one');hit(r,'one');assert.equal(r.state.swordBursts.length,1)
 r.state.time=9.99;hit(r,'early');assert.equal(r.state.swordBursts.length,1)
 r.state.time=10;hit(r,'new');assert.equal(r.state.swordBursts.length,2)
})
test('killing trigger still bursts once and pending state survives serialization',()=>{
 const r=fixture();r.state.enemies[0].hp=1;hit(r,'kill')
 assert.equal(r.state.swordBursts.length,1);assert.ok(validSwordBursts(r.state))
 r.state=JSON.parse(JSON.stringify(r.state));r.state.time=.2;tickSwordBursts(r);r.state.time=.4;tickSwordBursts(r)
 near(r.state.enemies[1].hp,10000-burstDamage);assert.equal(r.state.swordBursts.length,0)
 assert.equal(r.state.effects.filter(e=>e.kind==='sword_burst').length,1)
})
test('malformed burst snapshot is rejected and ranks increase damage with the same full range',()=>{
 const r=fixture(1);for(let i=0;i<4;i++)hit(r,'a'+i)
 assert.equal(r.state.swordBursts[0].damage,50);assert.equal(r.state.swordBursts[0].radius,110)
 assert.ok(validSwordBursts(r.state));r.state.swordBursts[0].dueAt=-1;assert.equal(validSwordBursts(r.state),false)
})
test('real snapshot restore preserves pending burst and rejects corruption',()=>{
 const r=new TowerRun({attemptId:44,floor:1,seed:12,xp:0,hp:100,training:true,loadout:{growthVersion:1,active:{sj_yujian:1},passive:{},evolutions:[],evolutionLevels:{},tutorialWaves:0,weaponId:'eq_sword_suwen',weaponQuality:1,weaponRefine:0}})
 r.state.swordBursts=[{id:'burst-qa',targetId:'dead-target',x:0,y:0,radius:80,damage:50,dueAt:.2,startedAt:0}]
 const restored=TowerRun.restore(r.snapshot());assert.deepEqual(restored.state.swordBursts,r.state.swordBursts)
 restored.state.time=.2;tickSwordBursts(restored);assert.equal(restored.state.effects.filter(e=>e.kind==='sword_burst').length,1)
 tickSwordBursts(restored);assert.equal(restored.state.effects.filter(e=>e.kind==='sword_burst').length,1)
 const bad=r.snapshot();bad.swordBursts[0].damage=NaN;assert.throws(()=>TowerRun.restore(bad))
})
test('six surrounding victims plus center, with no repeated hits from decorative swords',()=>{
 const r=fixture(),s=r.state,base=s.enemies[0]
 s.enemies=Array.from({length:9},(_,i)=>({...structuredClone(base),id:`enemy${i}`,x:i*10,y:0,hp:10000}))
 hit(r,'cap');s.time=.2;tickSwordBursts(r)
 assert.equal(s.swordBurstShots.length,6)
 assert.equal(s.effects.filter(e=>e.kind==='hit'&&e.source==='sword_burst').length,1)
 for(let i=13;i<60;i++){s.time=i/60;tickSwordBursts(r)}
 const hits=s.effects.filter(e=>e.kind==='hit'&&e.source==='sword_burst')
 assert.equal(hits.length,7);assert.equal(new Set(hits.map(h=>h.targetId)).size,7)
 assert.equal(s.swordBurstShots.length,0);assert.equal(s.swordBursts.length,0)
})
test('outward swords track moving victims; dead victims disappear without splash or retarget',()=>{
 const r=fixture(),s=r.state;hit(r,'move');s.time=.2;tickSwordBursts(r)
 const neighbor=s.enemies[1],hp=neighbor.hp;neighbor.x=150;neighbor.y=40
 s.time=.28;tickSwordBursts(r);assert.equal(neighbor.hp,hp)
 assert.ok(s.swordBurstShots[0].x>0&&s.swordBurstShots[0].y>0)
 s.time=.6;tickSwordBursts(r);assert.ok(neighbor.hp<hp)
 const dead=fixture();hit(dead,'dead');dead.state.time=.2;tickSwordBursts(dead)
 dead.state.enemies[1].hp=0;dead.state.time=.3;tickSwordBursts(dead)
 assert.equal(dead.state.swordBurstShots.length,0)
 assert.equal(dead.state.effects.filter(e=>e.kind==='hit'&&e.source==='sword_burst').length,1)
})
test('in-flight snapshot restores identically and duplicate projectile victims are rejected',()=>{
 const r=new TowerRun({attemptId:45,floor:1,seed:12,xp:0,hp:100,training:true,loadout:{growthVersion:1,active:{sj_yujian:1},passive:{},evolutions:[],evolutionLevels:{},tutorialWaves:0,weaponId:'eq_sword_suwen',weaponQuality:1,weaponRefine:0}})
 while(!r.state.enemies.length)r.advance(1/60)
 const s=r.state,e=s.enemies[0],at=s.time
 s.swordBurstShots=[{id:'shot-restore',burstId:'burst-restore',targetId:e.id,x:e.x-100,y:e.y,originX:e.x-100,originY:e.y,originRadius:24,damage:12,launchAt:at,updatedAt:at,expiresAt:at+.8,index:0}]
 const snapshot=r.snapshot()
 assert.ok(validSwordBursts(snapshot))
 const restored=TowerRun.restore(snapshot)
 s.time=at+.3;restored.state.time=at+.3;tickSwordBursts(r);tickSwordBursts(restored)
 assert.deepEqual(restored.state.enemies,s.enemies)
 assert.deepEqual(restored.state.swordBurstShots,s.swordBurstShots)
 const bad=structuredClone(snapshot);bad.swordBurstShots.push({...bad.swordBurstShots[0],id:'duplicate'})
 assert.equal(validSwordBursts(bad),false)
 const backwards=structuredClone(snapshot);backwards.swordBurstShots[0].updatedAt=-1
 assert.equal(validSwordBursts(backwards),false)
})
