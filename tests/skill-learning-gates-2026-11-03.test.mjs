import test from 'node:test'
import assert from 'node:assert/strict'
import { TowerCampaignStore, TOWER_CAMPAIGN_KEY } from '../js/xianxia/TowerCampaign.js'
import { GROWTH_SKILLS, rankCap, skillRequirement } from '../js/xianxia/TowerGrowth.js'
import { cultivationLevelXp } from '../js/xianxia/TowerProfile.js'
import { skillPresentation } from '../js/xianxia/TowerSkillPresentation.js'
import { checksum } from '../js/xianxia/Checksum.js'
import { currentCampaignSchema } from './helpers/tower-schema.mjs'

function fixture(level, skills = {}) {
 const disk={raw:null,writes:0,fail:false,getItem(){return this.raw},setItem(key,value){
  assert.equal(key,TOWER_CAMPAIGN_KEY)
  if(this.fail)throw Error('disk full')
  this.raw=value;this.writes++
 }}
 const fresh=new TowerCampaignStore(disk,0)
 const data=JSON.stringify({...fresh.state,xp:cultivationLevelXp(level),skills,skillsInitialized:true,spiritStones:10000,
  loadouts:fresh.state.loadouts.map(row=>({...row,active:[],passive:[],evolutions:[]}))})
 disk.raw=JSON.stringify({format:'xianxia-sect-tower-campaign',schema:currentCampaignSchema,data,checksum:checksum(data)})
 const store=new TowerCampaignStore(disk,0)
 assert.equal(store.readOnly,false)
 return {store,disk}
}

test('bone can spend the first earned point without buying a book and persists',()=>{
 const {store,disk}=fixture(2,{sj_arc:1})
 const bone=GROWTH_SKILLS.find(s=>s.id==='sj_bone')
 assert.equal(bone.learnLevel,1)
 assert.deepEqual(bone.pointCosts,[1,1,1,1])
 const stones=store.state.spiritStones
 assert.equal(skillRequirement(store.state,'sj_bone').ok,true)
 assert.equal(store.act({type:'learnSkill',id:'sj_bone'},0).level,1)
 assert.equal(new TowerCampaignStore(disk,0).state.skills.sj_bone,1)
 assert.equal(store.state.spiritStones,stones)
 assert.equal(bone.damage_bonus[0],.06)
 assert.equal(bone.speed_bonus[0],.02)
})

test('heart remains locked until early golden core and keeps its effects and point costs',()=>{
 const early=fixture(20)
 const before=early.disk.raw
 assert.equal(early.store.act({type:'learnSkill',id:'sj_heart'},0).reason,'stage-locked')
 assert.equal(early.disk.raw,before)
 const {store,disk}=fixture(21)
 assert.equal(skillRequirement(store.state,'sj_heart').ok,true)
 assert.equal(store.act({type:'learnSkill',id:'sj_heart'},0).level,1)
 assert.equal(new TowerCampaignStore(disk,0).state.skills.sj_heart,1)
 const heart=GROWTH_SKILLS.find(s=>s.id==='sj_heart')
 assert.deepEqual(heart.crit_chance,[.08,.14,.20,.28])
 assert.deepEqual(heart.pointCosts,[1,1,1,1])
 assert.deepEqual(heart.rankRequirements.map(r=>r.characterLevel),[21,24,24,27])
 assert.match(skillPresentation(store.state,'sj_heart').requirementLines.join(' '),/金丹/)
 for(const [level,cap] of [[7,0],[20,0],[21,1],[23,1],[24,3],[26,3],[27,4]])
  assert.equal(rankCap('sj_heart',cultivationLevelXp(level)),cap)
 const failed=fixture(21),state=JSON.stringify(failed.store.state),raw=failed.disk.raw
 failed.disk.fail=true
 assert.equal(failed.store.act({type:'learnSkill',id:'sj_heart'},0).reason,'save-failed')
 assert.equal(JSON.stringify(failed.store.state),state)
 assert.equal(failed.disk.raw,raw)
})

test('spirit rejects before foundation and opens its three ranks at 11/14/17',()=>{
 for(const [level,rank] of [[10,0],[13,1],[16,2]]){
  const {store,disk}=fixture(level,rank?{sj_spirit:rank}:{})
  const before=JSON.stringify(store.state),raw=disk.raw,writes=disk.writes
  assert.equal(store.act({type:'learnSkill',id:'sj_spirit'},0).ok,false)
  assert.equal(JSON.stringify(store.state),before)
  assert.equal(disk.raw,raw);assert.equal(disk.writes,writes)
 }
 for(const [level,rank] of [[11,0],[14,1],[17,2]]){
  const {store,disk}=fixture(level,rank?{sj_spirit:rank}:{})
  assert.equal(skillRequirement(store.state,'sj_spirit').ok,true)
  assert.equal(store.act({type:'learnSkill',id:'sj_spirit'},0).level,rank+1)
  assert.equal(new TowerCampaignStore(disk,0).state.skills.sj_spirit,rank+1)
 }
 const {store}=fixture(10)
 assert.match(skillPresentation(store.state,'sj_spirit').requirementLines[0],/筑基.*初期/)
})

test('level two offers a second active using the one earned point',()=>{
 const locked=fixture(1,{sj_arc:1})
 assert.equal(skillRequirement(locked.store.state,'sj_yujian').reason,'stage-locked')
 const {store,disk}=fixture(2,{sj_arc:1})
 assert.equal(store.act({type:'learnSkill',id:'sj_yujian'},0).level,1)
 assert.equal(new TowerCampaignStore(disk,0).state.skills.sj_yujian,1)
 assert.equal(store.act({type:'learnSkill',id:'sj_bone'},0).reason,'insufficient-points')
 assert.match(skillPresentation(locked.store.state,'sj_yujian').requirementLines[0],/2/)
})

test('yujian grows through refining without forcing spirit purchases',()=>{
 // 2026-11-06（85号）：御剑术1–3/4–6/7–9/10级分别在2/7/11/14级开放。
 for(const [level,previous,next] of [[7,3,4],[11,6,7],[14,9,10]]){
  assert.equal(rankCap('sj_yujian',cultivationLevelXp(level-1)),previous)
  const ready=fixture(level,{sj_yujian:previous})
  assert.equal(ready.store.act({type:'learnSkill',id:'sj_yujian'},0).level,next)
  assert.equal(new TowerCampaignStore(ready.disk,0).state.skills.sj_yujian,next)
 }
 const ready=fixture(14,{sj_yujian:10,sj_spirit:1})
 assert.equal(ready.store.act({type:'decreaseSkill',id:'sj_spirit'},0).ok,true)
 assert.equal(ready.store.state.skills.sj_yujian,10)
})

test('newly unlocked spirit purchase stays atomic if saving fails',()=>{
 const {store,disk}=fixture(11)
 const before=JSON.stringify(store.state),raw=disk.raw
 disk.fail=true
 assert.equal(store.act({type:'learnSkill',id:'sj_spirit'},0).reason,'save-failed')
 assert.equal(JSON.stringify(store.state),before);assert.equal(disk.raw,raw)
})

test('orbit starts at refining middle and reaches rank ten at foundation peak',()=>{
 const early=fixture(3),before=early.disk.raw
 assert.equal(early.store.act({type:'learnSkill',id:'sj_wanjian'},0).reason,'stage-locked')
 assert.equal(early.disk.raw,before)
 const ready=fixture(4)
 assert.equal(ready.store.act({type:'learnSkill',id:'sj_wanjian'},0).level,1)
 assert.equal(new TowerCampaignStore(ready.disk,0).state.skills.sj_wanjian,1)
 for(const [level,cap] of [[3,0],[4,3],[6,3],[7,6],[10,6],[11,9],[13,9],[14,10],[16,10],[17,10]])
  assert.equal(rankCap('sj_wanjian',cultivationLevelXp(level)),cap)
 const definition=GROWTH_SKILLS.find(s=>s.id==='sj_wanjian')
 assert.deepEqual(definition.pointCosts,Array(10).fill(1))
 assert.equal(definition.cooldown,6);assert.equal(definition.duration,4)
 assert.match(skillPresentation(ready.store.state,'sj_wanjian').requirementLines[0],/炼气.*中期/)
 const evolve=fixture(24,{sj_wanjian:1})
 assert.equal(evolve.store.act({type:'learnSkill',id:'evo_wuwo'},0).level,1)
 assert.equal(new TowerCampaignStore(evolve.disk,0).state.evolutionRanks.evo_wuwo,1)
})

test('liangyi starts at foundation peak with atomic learning and persistent ranks',()=>{
 const early=fixture(16),before=JSON.stringify(early.store.state),raw=early.disk.raw
 assert.equal(early.store.act({type:'learnSkill',id:'sj_formation'},0).reason,'stage-locked')
 assert.equal(JSON.stringify(early.store.state),before)
 assert.equal(early.disk.raw,raw)
 const ready=fixture(17)
 const definition=GROWTH_SKILLS.find(s=>s.id==='sj_formation')
 assert.equal(definition.learnLevel,17)
 assert.deepEqual(definition.pointCosts,Array(10).fill(1))
 assert.equal(definition.bookCost,200)
 assert.match(skillPresentation(ready.store.state,'sj_formation').requirementLines[0],/筑基.*巅峰/)
 const stones=ready.store.state.spiritStones
 assert.equal(ready.store.act({type:'learnSkill',id:'sj_formation'},0).level,1)
 assert.equal(ready.store.state.spiritStones,stones-200)
 assert.equal(new TowerCampaignStore(ready.disk,0).state.skills.sj_formation,1)
 for(const [level,cap] of [[16,0],[17,3],[20,3],[21,6],[23,6],[24,9],[26,9],[27,10]])
  assert.equal(rankCap('sj_formation',cultivationLevelXp(level)),cap)
 const failed=fixture(17),state=JSON.stringify(failed.store.state),saved=failed.disk.raw
 failed.disk.fail=true
 assert.equal(failed.store.act({type:'learnSkill',id:'sj_formation'},0).reason,'save-failed')
 assert.equal(JSON.stringify(failed.store.state),state)
 assert.equal(failed.disk.raw,saved)
 const evolve=fixture(27)
 assert.equal(evolve.store.act({type:'learnSkill',id:'sj_formation'},0).level,1)
 assert.equal(evolve.store.act({type:'learnSkill',id:'evo_sixiang'},0).level,1)
 assert.equal(new TowerCampaignStore(evolve.disk,0).state.evolutionRanks.evo_sixiang,1)
})

test('prior gate saves reset only this mode, and failed reset leaves the old record intact',()=>{
 const {disk}=fixture(11,{sj_spirit:1})
 const old=JSON.parse(disk.raw);old.schema=currentCampaignSchema-1
 disk.raw=JSON.stringify(old)
 const original=disk.raw
 disk.fail=true
 const failed=new TowerCampaignStore(disk,0)
 assert.equal(failed.readOnly,true)
 assert.equal(disk.raw,original)
 disk.fail=false
 const reset=new TowerCampaignStore(disk,0)
 assert.equal(reset.readOnly,false)
 assert.deepEqual(reset.state.skills,{sj_arc:1})
 assert.equal(reset.state.xp,0)
 assert.equal(reset.migrationReport.reset,true)
 assert.equal(JSON.parse(disk.raw).schema,currentCampaignSchema)
})
