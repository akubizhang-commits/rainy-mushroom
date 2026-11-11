import test from 'node:test'
import assert from 'node:assert/strict'
import {GROWTH_SKILLS} from '../js/xianxia/TowerGrowth.js'
import {TowerRun,validateTowerSnapshot} from '../js/xianxia/TowerRun.js'
import {skillPresentation} from '../js/xianxia/TowerSkillPresentation.js'
import {TowerCampaignStore} from '../js/xianxia/TowerCampaign.js'
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`)
const module=()=>import('../js/xianxia/TowerFormationControl.js')
const zone=(id,patch={})=>({kind:id==='sj_sancai'?'sancai':'formation',formId:id,source:id==='sj_sancai'?'sj_sancai':'sj_formation',hostile:false,x:0,y:0,radius:150,startedAt:1,expiresAt:9.2,...patch})
const enemy={x:0,y:0,radius:10,hp:100,role:'normal'}
test('moon cross and sancai cost one point at every rank',()=>{
 for(const id of ['sj_cross','sj_sancai'])assert.deepEqual(GROWTH_SKILLS.find(s=>s.id===id).pointCosts,Array(10).fill(1))
})
test('all monster ranks receive the strongest field only, with exact lifetime and visibility',async()=>{
 const {formationMovementMultiplier:move}=await module()
 for(const role of ['normal','elite','boss']){
  const e={...enemy,role}
  for(const [id,f] of [['sj_sancai',.8],['sj_formation',.7],['evo_sixiang',.6]]){
   const z=zone(id);near(move([z],e,1),f);near(move([z,z],e,2),f)
   near(move([z],e,.99),1);near(move([z],e,id==='sj_sancai'?7:9),1)
   near(move([z],e,2,()=>false),1);near(move([{...z,hostile:true}],e,2),1)
   near(move([{...z,renderOnly:true}],e,2),1);near(move([z],{...e,hp:0},2),1)
  }
  near(move(['sj_sancai','sj_formation','evo_sixiang'].map(id=>zone(id)),e,2),.6)
  near(move([],e,2),1)
 }
})
test('triangle, circle and diamond slow follow actual hurtbox geometry',async()=>{
 const {formationMovementMultiplier:move}=await module()
 near(move([zone('sj_sancai')],{...enemy,y:-90},2),1)
 near(move([zone('sj_formation')],{...enemy,x:159},2),.7)
 near(move([zone('sj_formation')],{...enemy,x:161},2),1)
 near(move([zone('evo_sixiang')],{...enemy,x:100,y:100},2),1)
 near(move([zone('evo_sixiang')],{...enemy,x:80,y:80},2),.6)
})
test('real casts slow approach, preserve attack timing and survive pause/restore',()=>{
 for(const [id,parent,rank,factor] of [['sj_sancai','sj_sancai',1,.8],['sj_formation','sj_formation',1,.7],['evo_sixiang','sj_formation',1,.6]]){
  const run=new TowerRun({attemptId:1,floor:1,seed:7,xp:14400,hp:100,training:true,loadout:{growthVersion:1,active:{[parent]:1},passive:{},evolutions:id===parent?[]:[id],evolutionLevels:id===parent?{}:{[id]:rank},tutorialWaves:0,weaponId:'eq_sword_suwen',weaponQuality:1,weaponRefine:0}})
  for(let i=0;i<1000&&!run.state.zones.some(z=>z.formId===id);i++)run.advance(1/60)
  const s=run.state,z=s.zones.find(z=>z.formId===id);assert.ok(z,id)
  run.pause();assert.equal(validateTowerSnapshot(run.snapshot()),true,id)
  const restored=TowerRun.restore(run.snapshot());restored.advance(1);assert.deepEqual(restored.snapshot(),run.snapshot())
  restored.resume();const e=restored.state.enemies[0];Object.assign(e,{x:z.x,y:z.y,moveSpeed:100});
  e.ai.entryUntil=0;e.ai.transitionUntil=0;e.ai.transitionPending=false;e.ai.graceUntil=0
  restored._attackSpec=()=>null
  const measure=()=>{const before={x:e.x,y:e.y},ready=e.ai.readyAt;restored._enemyActions([],restored.state.player);assert.equal(e.ai.readyAt,ready);return Math.hypot(e.x-before.x,e.y-before.y)}
  for(const role of ['normal','elite','boss']){e.role=role;e.x=z.x;e.y=z.y;near(measure(),100/60*(1-(1-factor)*(1-e.controlResistance)))}
  restored.state.zones=[];near(measure(),100/60)
 }
})
test('skill captions expose slow for all enemies and nonstacking movement-only rule',()=>{
 const state=structuredClone(new TowerCampaignStore({getItem:()=>null,setItem(){}},0).state);state.xp=14400
 state.skills={sj_arc:1,sj_sancai:1,sj_formation:1};state.books=['sj_formation','evo_sixiang'];state.evolutions=['evo_sixiang'];state.evolutionRanks={evo_sixiang:1}
 for(const [id,value] of [['sj_sancai',.2],['sj_formation',.3],['evo_sixiang',.4]]){
  const p=skillPresentation(state,id),slow=p.stats.find(s=>s.key==='slow');assert.ok(slow,id);assert.equal(slow.value,`${value*100}%`);assert.match(p.description,/精英|Boss/)
 }
})
