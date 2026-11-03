import test from 'node:test'
import assert from 'node:assert/strict'
import {TowerRun} from '../js/xianxia/TowerRun.js'
import {addQingping,tickQingping,validQingping} from '../js/xianxia/TowerQingping.js'
const fixture=()=>({state:{loadout:{growthVersion:1},time:0,player:{x:10,y:20},enemies:[{id:'a',x:100,y:20,hp:100,woundBudget:0,woundUntil:0}]}})
test('visual contact does not burst; converted budgets tick with current stack bonus',()=>{
 const r=fixture(),e=r.state.enemies[0];addQingping(r,e,15);r.state.time=.2;addQingping(r,e,10)
 assert.equal(e.qingping.startedAt,0);assert.equal(e.qingping.amount,25);assert.equal(e.woundBudget,25)
 r.state.time=.48;assert.equal(tickQingping(r).length,0)
 r.state.time=.5;const hits=tickQingping(r);assert.equal(hits.length,1)
 near(hits[0].damage,25/7*1.01);assert.equal(tickQingping(r).length,0)
 r.state.time=1;addQingping(r,e,5);near(e.woundBudget,25-25/7+5)
 assert.equal(e.woundUntil,4);assert.equal(e.qingping.startedAt,0);assert.equal(e.qingpingDot.stacks,3)
})
test('dead target cannot receive contact feedback, corrupt pending state is rejected',()=>{
 const r=fixture(),e=r.state.enemies[0];addQingping(r,e,15);e.hp=0;r.state.time=.48
 assert.equal(tickQingping(r).length,0);assert.equal(e.woundBudget,0);assert.ok(validQingping(r.state))
 e.qingping.amount=NaN;assert.equal(validQingping(r.state),false)
})
test('pending wound survives a real snapshot and applies once after restore',()=>{
 const r=new TowerRun({attemptId:44,floor:1,seed:12,xp:0,hp:100,training:true,loadout:{growthVersion:1,active:{sj_yujian:1},passive:{},evolutions:[],evolutionLevels:{},tutorialWaves:0,weaponId:'eq_sword_suwen',weaponQuality:1,weaponRefine:0}})
 for(let i=0;i<180&&!r.state.enemies.length;i++)r.advance(1/60);const e=r.state.enemies[0];assert.ok(e);addQingping(r,e,10)
 const restored=TowerRun.restore(r.snapshot());restored.state.time=e.qingping.startedAt+.5
 assert.equal(tickQingping(restored).length,1);assert.equal(tickQingping(restored).length,0)
 near(restored.state.enemies[0].woundBudget,10-10/6)
 const bad=r.snapshot();bad.enemies[0].qingping.impactAt+=1;assert.throws(()=>TowerRun.restore(bad))
})

function combatFixture(level) {
 const r=new TowerRun({attemptId:44,floor:1,seed:12,xp:0,hp:100,training:true,loadout:{growthVersion:1,active:{sj_yujian:1},passive:{sj_mark:level},evolutions:[],evolutionLevels:{},tutorialWaves:0,weaponId:'eq_sword_suwen',weaponQuality:1,weaponRefine:0}})
 for(let i=0;i<180&&!r.state.enemies.length;i++){r.state.cooldowns.sj_yujian=9999;r.advance(1/60)}
 const e=r.state.enemies[0];assert.ok(e)
 return {r,e}
}
function step(r,frames) {
 for(let i=0;i<frames;i++){
  for(const id of Object.keys(r.state.cooldowns))r.state.cooldowns[id]=9999
  for(const e of r.state.enemies)e.ai.graceUntil=99999
  r.advance(1/60)
 }
}
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`)
for(const [index,share] of [.20,.30,.40,.50].entries()) {
 test(`rank ${index+1}: real ticks pay the converted budget with rank bonus over three seconds`,()=>{
  const {r,e}=combatFixture(index+1),hp=e.hp
  r._damageEnemy({target:e.id,source:'sj_yujian',direct:true,damage:10})
  const direct=hp-e.hp,before=e.hp,events=[]
  const original=r._effect.bind(r)
  r._effect=(kind,x,y,radius,extra)=>{if(extra?.source==='wound')events.push(extra);return original(kind,x,y,radius,extra)}
  step(r,28);near(e.hp,before)
  step(r,2);near(before-e.hp,direct*(1+share)/6)
  assert.equal(events.length,1);assert.equal(events[0].impact.skill,'sj_mark')
  step(r,150);near(before-e.hp,direct*(1+share));near(e.woundBudget,0)
  assert.equal(events.filter(x=>x.impact).length,1)
 })
}
test('wound does not repeat mitigation or vulnerability, unrelated damage still does',()=>{
 for(const modifier of [.5,1.2]){
  const {r,e}=combatFixture(4)
  e.mechanic={armorUntil:9999,armor:modifier<1?1-modifier:0,vulnerableUntil:9999,vulnerability:modifier>1?modifier-1:0}
  const hp=e.hp;r._damageEnemy({target:e.id,source:'sj_yujian',direct:true,damage:10})
  near(hp-e.hp,5*modifier)
  const before=e.hp
  r._damageEnemy({target:e.id,source:'wound',direct:false,scaled:true,damage:1})
  near(before-e.hp,1)
  const next=e.hp
  r._damageEnemy({target:e.id,source:'sword_burst',direct:false,scaled:true,damage:1})
  near(next-e.hp,modifier)
 }
})
test('pause and restore retain both budgets and layers; refresh does not replay contact',()=>{
 const {r,e}=combatFixture(4)
 r._damageEnemy({target:e.id,source:'sj_yujian',direct:true,damage:10})
 step(r,12);r.pause();const frozen=r.snapshot();r.advance(1);assert.deepEqual(r.snapshot(),frozen)
 const restored=TowerRun.restore(frozen);restored.resume()
 const target=restored.state.enemies.find(x=>x.id===e.id),before=target.hp
 step(restored,18);near(before-target.hp,7.5/6)
 restored._damageEnemy({target:e.id,source:'sj_yujian',direct:true,damage:10})
 const pending=7.5*5/6+7.5;near(target.woundBudget,pending)
 const again=TowerRun.restore(restored.snapshot()),e2=again.state.enemies.find(x=>x.id===e.id),hp=e2.hp
 step(again,1);near(e2.hp,hp)
 step(again,180);near(hp-e2.hp,pending*1.01);near(e2.woundBudget,0)
})
