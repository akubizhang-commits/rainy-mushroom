import test from 'node:test'
import assert from 'node:assert/strict'
import {GROWTH_SKILLS,GROWTH_EVOLUTIONS,skillRequirement,rankCap,skillStage} from '../js/xianxia/TowerGrowth.js'
import {skillForm} from '../js/xianxia/TowerSkillForms.js'
import {cultivationLevelXp} from '../js/xianxia/TowerProfile.js'
import {TowerRun,validateTowerSnapshot} from '../js/xianxia/TowerRun.js'
import {createIronWeapon} from '../js/xianxia/TowerWeapons.js'
const find=id=>[...GROWTH_SKILLS,...GROWTH_EVOLUTIONS].find(s=>s.id===id)
const state=level=>({xp:cultivationLevelXp(level),skills:{},evolutionRanks:{},books:[],clearedFloor:0,researchPurchases:0,skillsInitialized:true,playtestSkillPoints:100})
test('sword techniques follow approved first learning gates with stable prices',()=>{
 for(const [id,level,cost] of [['sj_arc',1,1],['sj_moon',4,1],['sj_moon_triple',11,1],['sj_cross',14,1],['sj_line',21,1],['sj_mark',7,1],['sj_gate',19,1],['evo_tiandi',24,2]]){
  assert.equal(find(id).learnLevel,level,id);assert.equal(find(id).pointCosts[0],cost,id)
  const s=state(level);if(id==='evo_tiandi')s.skills.sj_line=1;
  assert.equal(skillRequirement(s,id).ok,true,id)
  if(level>1)assert.equal(skillRequirement({...s,xp:cultivationLevelXp(level-1)},id).reason,'stage-locked',id)
 }
})
test('relocated rank bands require further growth and preserve evolution prerequisites',()=>{
 for(const [id,first] of [['sj_line',21]]){
  assert.equal(rankCap(id,cultivationLevelXp(first)),3)
  assert.equal(rankCap(id,cultivationLevelXp(first+2)),3)
  assert.equal(rankCap(id,cultivationLevelXp(first+3)),6)
  assert.equal(rankCap(id,cultivationLevelXp(first+9)),10)
 }
 assert.equal(skillRequirement(state(24),'evo_tiandi').reason,'parent-required')
 const s=state(26);s.skills.sj_line=1;s.evolutionRanks.evo_tiandi=1
 assert.equal(skillRequirement(s,'evo_tiandi').reason,'realm-locked')
 s.xp=cultivationLevelXp(27);assert.equal(skillRequirement(s,'evo_tiandi').ok,true)
})
test('moon techniques occupy Zhuji early and middle phases with realm-aligned training bands',()=>{
 for(const [id,stage,gates] of [['sj_moon_triple','zhuji-early',[11,14,17,21]],['sj_cross','zhuji-middle',[14,17,21,24]]]){
  assert.equal(skillStage(id).id,stage)
  for(let band=0;band<gates.length;band++){
   assert.equal(rankCap(id,cultivationLevelXp(gates[band])-1),band*3)
   assert.equal(rankCap(id,cultivationLevelXp(gates[band])),Math.min(10,(band+1)*3))
  }
 }
})
test('approved cooldowns change only the requested families',()=>{
 for(const [id,cd] of [['sj_arc',3.5],['sj_moon',4],['sj_moon_triple',10],['sj_cross',12],['sj_line',12],['sj_shadow',6],['sj_formation',12],['evo_sixiang',15],['sj_wanjian',6],['sj_yujian',1],['evo_tiandi',10]])assert.equal(find(id).cooldown,cd,id)
 assert.equal(find('sj_wanjian').duration,4)
})
test('formations have more real attack slots over eight seconds without multiplying their total twice',()=>{
 for(const [id,rank,hits] of [['sj_formation',1,12],['sj_formation',4,14],['sj_formation',7,16],['sj_formation',10,16],['evo_sixiang',1,16],['evo_sixiang',2,20]]){
  const f=skillForm(id,rank,10);assert.equal(f.hits,hits);assert.equal(f.duration,8);assert.equal(f.initialDelay,.5)
  assert.ok(Math.abs(f.initialDelay+(f.hits-1)*f.interval-8)<1e-10)
 }
 const base=find('sj_formation');
 assert.ok(Math.abs(base.damage[0]*base.ticks/base.cooldown/(32/15*6/8)-1.1)<1e-10)
 const evo=find('evo_sixiang');
 assert.ok(Math.abs(base.damage[0]*6*evo.budgetMultipliers[0]/base.cooldown/(32/15*6*2/8)-1.1)<1e-10)
})
for(const evolved of [false,true])test(`${evolved?'sixiang':'liangyi'} live multi-pulse field restores and rejects forged pulse counts`,()=>{
 const weapon=createIronWeapon();const run=new TowerRun({attemptId:1,floor:1,seed:41,hp:100,xp:cultivationLevelXp(30),training:true,loadout:{growthVersion:1,active:{sj_formation:10},passive:{},evolutions:evolved?['evo_sixiang']:[],evolutionLevels:evolved?{evo_sixiang:2}:{},tutorialWaves:0,weapon,weaponId:weapon.id,weaponQuality:0,weaponRefine:0,weaponFocusCount:0}})
 let found=false;
 for(let i=0;i<1000;i++){
  run.advance(1/60);const z=run.state.zones.find(z=>!z.hostile&&z.formId===(evolved?'evo_sixiang':'sj_formation'));if(!z)continue;
  assert.equal(z.pulseCount,evolved?20:16);assert.equal(validateTowerSnapshot(run.snapshot()),true)
  const forged=run.snapshot();forged.zones.find(q=>q.id===z.id).pulseCount++;assert.equal(validateTowerSnapshot(forged),false)
  const restored=TowerRun.restore(run.snapshot());for(let j=0;j<510;j++){run.advance(1/60);restored.advance(1/60)}
  assert.deepEqual(restored.snapshot(),run.snapshot());assert.equal(validateTowerSnapshot(run.snapshot()),true);found=true;break;
 }assert.equal(found,true)
})
