import test from 'node:test'
import assert from 'node:assert/strict'
import {skillHitFeedback,collectHitFeedback,HIT_PROFILES} from '../js/xianxia/TowerHitFeedback.js'
import {TowerRun} from '../js/xianxia/TowerRun.js'
const hit=(skill='sj_yujian',extra={})=>({id:'a',kind:'hit',source:skill,targetId:'enemy',targetRadius:18,x:100,y:20,damage:5,startedAt:1,expiresAt:1.25,impact:{skill,dirX:1,dirY:0,pulseIndex:1,pulseCount:1,castId:'cast'},...extra})
for(const skill of Object.keys(HIT_PROFILES))test(`${skill}: bounded feedback, positive settlement only, deterministic expiry`,()=>{
 const h=hit(skill),before=structuredClone(h)
 for(let i=0;i<20;i++){
  const p=skillHitFeedback(h,1+i*.009);if(!p)continue
  for(const n of [p.x,p.y,p.scaleX,p.scaleY,p.fade,p.lift])assert.ok(Number.isFinite(n))
  assert.ok(Math.hypot(p.x,p.y)<=9);assert.ok(p.scaleX>.82&&p.scaleX<1.18&&p.scaleY>.82&&p.scaleY<1.18)
  assert.deepEqual(skillHitFeedback(h,1+i*.009),p)
 }
 assert.deepEqual(h,before);assert.equal(skillHitFeedback(h,1.3),null)
 for(const extra of [{damage:0},{damage:-1},{damage:Infinity},{hostile:true},{x:NaN},{targetId:null},{impact:{...h.impact,dirX:NaN}}])assert.equal(skillHitFeedback({...h,...extra},1.01),null)
 assert.equal(skillHitFeedback(h,.9),null)
})
test('same-target rapid hits merge without restarting the impact clock; heavy hit wins',()=>{
 const a=hit('sj_wanjian'),b=hit('evo_tiandi',{id:'b',startedAt:1.02,impact:{skill:'evo_tiandi',dirX:0,dirY:-1,pulseIndex:1,pulseCount:1}})
 const result=collectHitFeedback([a,b,b],1.04)
 assert.equal(result.length,1);assert.equal(result[0].skill,'evo_tiandi');assert.ok(Math.abs(result[0].age-.04)<1e-6)
 assert.equal(collectHitFeedback([a,b],1.24).length,0)
})
test('same target repeats are capped, different targets remain independent and scene has a hard cap',()=>{
 const hits=Array.from({length:100},(_,i)=>hit('sj_cross',{id:String(i),targetId:String(i)}))
 assert.equal(collectHitFeedback(hits,1.01).length,24)
 assert.deepEqual(collectHitFeedback(hits,1.01),collectHitFeedback(hits,1.01))
 assert.equal(collectHitFeedback([hit(),hit('sj_arc',{id:'b',targetId:'second'})],1.01).length,2)
})
test('formation finale is stronger but ordinary pulses are not global camera events',()=>{
 const ordinary=hit('evo_sixiang',{impact:{skill:'evo_sixiang',dirX:0,dirY:-1,pulseIndex:2,pulseCount:9}})
 const final={...ordinary,impact:{...ordinary.impact,pulseIndex:9}}
 assert.ok(skillHitFeedback(final,1.02).strength>skillHitFeedback(ordinary,1.02).strength)
 assert.equal(skillHitFeedback(ordinary,1.02).shape,'rain')
})
test('real settlement copies directional metadata without changing damage, coordinates or RNG',()=>{
 const make=()=>new TowerRun({attemptId:41,floor:1,seed:312,xp:0,hp:100,loadout:{growthVersion:1,active:{sj_arc:1},passive:{},evolutions:[],evolutionLevels:{},tutorialWaves:0,weaponId:'eq_sword_suwen',weaponQuality:1,weaponRefine:0}})
 const a=make(),b=make()
 for(const r of [a,b]){const e=r._enemy({...r.state.pending[0],id:'enemy',x:100,y:20});e.hp=e.maxHp=1000;r.state.enemies=[e]}
 const impact=hit().impact
 a._damageEnemy({target:'enemy',damage:5,direct:true,source:'sj_yujian',impact})
 b._damageEnemy({target:'enemy',damage:5,direct:true,source:'sj_yujian'})
 assert.deepEqual(a.state.enemies,b.state.enemies)
 const receipt=a.state.effects.at(-1);assert.equal(receipt.targetId,'enemy');assert.deepEqual(receipt.impact,impact);assert.notEqual(receipt.impact,impact)
 assert.equal(a.state.effects.at(-1).damage,b.state.effects.at(-1).damage)
})
test('hit input validation tolerates missing receipts and does not accept unrelated sources',()=>{
 assert.equal(skillHitFeedback(null,1),null);assert.equal(skillHitFeedback(undefined,1),null)
 assert.equal(collectHitFeedback([null,{},hit('enemy')],1).length,0)
})
