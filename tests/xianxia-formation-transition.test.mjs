import test from 'node:test'
import assert from 'node:assert/strict'
import {GROWTH_SKILLS,rankCap} from '../js/xianxia/TowerGrowth.js'
import {cultivationLevelXp} from '../js/xianxia/TowerProfile.js'
import {TowerRun,validateTowerSnapshot} from '../js/xianxia/TowerRun.js'
import {createIronWeapon} from '../js/xianxia/TowerWeapons.js'
import {COMBAT_SKILLS} from '../js/xianxia/TowerCombatSkills.js'
const formation=GROWTH_SKILLS.find(s=>s.id==='sj_formation')
test('formation transition raises only ranks 7–10 by the approved graduated amounts',()=>{
 for(let rank=1;rank<=10;rank++){
  const factor=rank<=6?1:(1+(rank-6)*.05)*1.25,expected=1.65*32/15*1.15**(rank-1)*factor
  assert.ok(Math.abs(formation.levels[rank-1].damage-expected)<1e-10,`rank ${rank}`)
 }
 assert.equal(formation.cooldown,12);assert.equal(formation.duration,8);assert.equal(formation.ticks,6)
 assert.deepEqual(formation.radius,[132,132,144,144,156,168,168,180,180,192])
 // 2026-11-09：两仪剑阵移到金丹初期，等级段 21/24/27/30。
 assert.equal(formation.learnLevel,21)
 assert.equal(rankCap('sj_formation',cultivationLevelXp(29)),9)
 assert.equal(rankCap('sj_formation',cultivationLevelXp(30)),10)
})

test('equipment rank eleven keeps its original 15% marginal gain after transition tuning',()=>{
 const row=COMBAT_SKILLS.find(s=>s.id==='sj_formation')
 assert.ok(Math.abs(row.damage[10]/row.damage[9]-1.15)<1e-10)
 assert.ok(Math.abs(row.damage[10]-(1.65*32/15*1.15**10*1.20*1.25))<1e-10)
})

for(const evolved of [false,true])test(`${evolved?'four-symbol':'liangyi'} high-rank active field survives exact save/resume`,()=>{
 const weapon=createIronWeapon()
 const run=new TowerRun({attemptId:1,floor:1,seed:41,hp:100,xp:cultivationLevelXp(30),training:true,
  loadout:{growthVersion:1,skillsInitialized:true,active:{sj_formation:10},passive:{},
   evolutions:evolved?['evo_sixiang']:[],evolutionLevels:evolved?{evo_sixiang:2}:{},
   tutorialWaves:0,weapon,weaponId:weapon.id,weaponQuality:0,weaponRefine:0,weaponFocusCount:0}})
 let observed=false
 for(let i=0;i<1000;i++){
  run.advance(1/60)
  if(!run.state.zones.some(z=>!z.hostile))continue
  const snapshot=run.snapshot();assert.equal(validateTowerSnapshot(snapshot),true)
  const restored=TowerRun.restore(snapshot)
  for(let frame=0;frame<90;frame++){run.advance(1/60);restored.advance(1/60)}
  assert.deepEqual(restored.snapshot(),run.snapshot())
  assert.equal(validateTowerSnapshot(run.snapshot()),true)
  observed=true;break
 }
 assert.equal(observed,true,'actual field was released')
})
