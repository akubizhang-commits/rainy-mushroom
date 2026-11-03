import { currentCampaignSchema } from './helpers/tower-schema.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { TowerCampaignStore, combatLoadout, TOWER_CAMPAIGN_KEY } from '../js/xianxia/TowerCampaign.js'
import { GROWTH_SKILLS, GROWTH_EVOLUTIONS, skillRequirement, decreaseSkillQuote, rankCap } from '../js/xianxia/TowerGrowth.js'
import { skillPresentation } from '../js/xianxia/TowerSkillPresentation.js'
import { TowerRun, validateTowerSnapshot } from '../js/xianxia/TowerRun.js'
import { checksum } from '../js/xianxia/Checksum.js'
const xpAt = n => 30*(n-1)+15*(n-1)**2
function fixture(level=27) {
 const disk={raw:null,getItem(){return this.raw},setItem(k,v){assert.equal(k,TOWER_CAMPAIGN_KEY);if(this.fail)throw Error('disk full');this.raw=v}}
 const state=structuredClone(new TowerCampaignStore(disk,0).state)
 state.xp=xpAt(level);state.spiritStones=10000
 const data=JSON.stringify(state)
 disk.raw=JSON.stringify({format:'xianxia-sect-tower-campaign',schema:currentCampaignSchema,data,checksum:checksum(data)})
 const store=new TowerCampaignStore(disk,0);assert.equal(store.readOnly,false)
 return {store,disk}
}
test('all skills can be learned and fully upgraded with zero cleared floors',()=>{
 for(const row of [...GROWTH_SKILLS,...GROWTH_EVOLUTIONS]) {
  const {store,disk}=fixture()
  if(row.kind==='evolution') assert.equal(store.act({type:'learnSkill',id:row.parent},0).ok,true)
  assert.equal(skillRequirement(store.state,row.id).ok,true,row.id)
  const p=skillPresentation(store.state,row.id)
  assert.deepEqual(p.nextRequirement.prerequisites,row.kind==='evolution'?{[row.parent]:1}:{})
  assert.equal(p.nextRequirement.clear,0)
  assert.ok(!p.requirementLines.some(s=>/通关|波|藏经阁/.test(s)))
  assert.equal(store.act({type:'learnSkill',id:row.id},0).ok,true,row.id)
  while ((store.state.skills[row.id] ?? store.state.evolutionRanks[row.id] ?? 0) < row.maxLevel) {
   const rank=store.state.skills[row.id] ?? store.state.evolutionRanks[row.id] ?? 0
   for(const [id,required] of Object.entries(row.rankRequirements[rank].prerequisites || {})) {
    while((store.state.skills[id] || 0) < required)
     assert.equal(store.act({type:'learnSkill',id},0).ok,true,`${row.id}: satisfy ${id} skill prerequisite`)
   }
   assert.equal(store.state.clearedFloor,0)
   assert.equal(store.act({type:'learnSkill',id:row.id},0).ok,true,`${row.id} upgrade without clearing floors`)
  }
  assert.equal(new TowerCampaignStore(disk,0).readOnly,false,row.id)
 }
})
test('learning and rank caps are constant within each realm phase',()=>{
 for(const row of [...GROWTH_SKILLS,...GROWTH_EVOLUTIONS]) for(let level=1;level<=25;level+=3){
  const caps=[0,1,2].map(offset=>rankCap(row.id,xpAt(level+offset),0))
  assert.equal(new Set(caps).size,1,`${row.id} phase ${level}`)
 }
})
test('advanced skills retain actual parent rank across casts and partial refunds',()=>{
 for(const row of GROWTH_EVOLUTIONS){
  const {store,disk}=fixture()
  assert.equal(store.act({type:'learnSkill',id:row.parent},0).ok,true)
  assert.equal(store.act({type:'learnSkill',id:row.id},0).ok,true)
  const loadout=combatLoadout(store.state)
  assert.equal(loadout.active[row.parent],1)
  const start=store.act({type:'startFloor',floor:1,seed:12},0)
  assert.equal(start.ok,true,row.id);const run=TowerRun.restore(start.snapshot)
  for(let i=0;i<600;i++)run.advance(1/60)
  assert.equal(validateTowerSnapshot(run.snapshot()),true,row.id)
  assert.equal(new TowerCampaignStore(disk,0).readOnly,false)
  const state=structuredClone(store.state);state.activeRun=null;state.skills[row.parent]=2
  const quote=decreaseSkillQuote(state,row.parent)
  assert.equal(quote.ok,true);assert.equal(quote.changes.length,1)
  assert.deepEqual(quote.evolutionRanks,state.evolutionRanks)
  assert.equal(combatLoadout({...state,skills:quote.skills}).active[row.parent],1)
 }
})
test('basic skills can be purchased before teaching and still respect resources and realm',()=>{
 const {store}=fixture(2)
 assert.equal(store.act({type:'learnSkill',id:'sj_arc'},0).ok,true)
 assert.equal(skillRequirement(store.state,'sj_line').reason,'stage-locked')
 assert.equal(skillRequirement(store.state,'sj_wanjian').reason,'insufficient-points')
})

test('paused book purchases debit atomically and remain debited through checkpoints and settlement',()=>{
 const {store,disk}=fixture()
 const start=store.act({type:'startFloor',floor:1,seed:12},0)
 let run=TowerRun.restore(start.snapshot);run.pause()
 assert.equal(store.act({type:'checkpoint',snapshot:run.snapshot()},0).ok,true)
 const before=store.state,raw=disk.raw
 disk.fail=true
 assert.equal(store.act({type:'learnSkill',id:'sj_line'},0).reason,'save-failed')
 assert.equal(store.state,before);assert.equal(disk.raw,raw)
 disk.fail=false
 assert.equal(store.act({type:'learnSkill',id:'sj_line'},0).ok,true)
 assert.equal(store.state.spiritStones,9800)
 const reload=new TowerCampaignStore(disk,0)
 assert.equal(reload.readOnly,false)
 run=TowerRun.restore(reload.state.activeRun.snapshot)
 assert.equal(reload.act({type:'checkpoint',snapshot:run.snapshot()},0).ok,true)
 assert.equal(reload.state.spiritStones,9800)
 run.abandon()
 assert.equal(reload.act({type:'finishFloor',snapshot:run.snapshot()},0).ok,true)
 assert.equal(reload.state.spiritStones,9800)
 assert.equal(new TowerCampaignStore(disk,0).readOnly,false)
})
