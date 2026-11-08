import test from 'node:test'
import assert from 'node:assert/strict'
import {TowerCampaignStore} from '../js/xianxia/TowerCampaign.js'
import {checksum} from '../js/xianxia/Checksum.js'
import {cultivationLevelXp} from '../js/xianxia/TowerProfile.js'
import {growthSummary} from '../js/xianxia/TowerGrowth.js'
import {currentCampaignSchema} from './helpers/tower-schema.mjs'
import {planNaturalGrowth} from '../scripts/lib/tower-natural-growth.mjs'
import {growthCompletionPriorities} from '../scripts/lib/tower-natural-growth-policies.mjs'

function fixture(skills, level=30) {
  let raw=null
  const disk={getItem:()=>raw,setItem:(_,v)=>raw=v}
  const fresh=new TowerCampaignStore(disk,0)
  const data=JSON.stringify({...fresh.state,xp:cultivationLevelXp(level),
    spiritStones:10000,skills,books:['sj_mark'],clearedFloor:9})
  raw=JSON.stringify({format:'xianxia-sect-tower-campaign',schema:currentCampaignSchema,data,checksum:checksum(data)})
  const store=new TowerCampaignStore(disk,0)
  assert.equal(store.readOnly,false,store.error)
  return {store,disk}
}
const cores={
  moon:{sj_arc:1,sj_yujian:1,sj_bone:4,sj_moon:10,vajra:2,sj_moon_triple:6,sj_cross:6,sj_heart:4},
  sancai:{sj_arc:3,sj_yujian:4,sj_bone:4,vajra:2,sj_wanjian:6,sj_sancai:10,sj_spirit:1,sj_mark:1,sj_heart:4},
}
for(const route of ['moon','sancai'])test(`${route} completion spends available route goals without dismantling core or replaying purchases`,()=>{
  const {store,disk}=fixture(cores[route]),before=structuredClone(store.state)
  const priorities=Object.entries(cores[route]),extra=growthCompletionPriorities(route)
  const actions=planNaturalGrowth(store.state,priorities,[],extra)
  assert.deepEqual(store.state,before)
  for(const a of actions)assert.equal(store.act(a,0).ok,true)
  for(const [id,rank] of priorities)assert.ok(store.state.skills[id]>=rank,id)
  assert.equal(growthSummary(store.state).total,35)
  assert.equal(growthSummary(store.state).spent,35)
  assert.deepEqual(planNaturalGrowth(store.state,priorities,[],extra),[])
  assert.deepEqual(new TowerCampaignStore(disk,0).state,store.state)
})
test('completion waits for core goals, including a realm-locked rank',()=>{
  const {store}=fixture({sj_arc:1,sj_yujian:1},2)
  assert.deepEqual(planNaturalGrowth(store.state,[['sj_moon',1]],[],growthCompletionPriorities('moon')),[])
})
test('completion stays opt-in and returned policies are independent',()=>{
  assert.deepEqual(growthCompletionPriorities('qi'),[])
  const first=growthCompletionPriorities('moon');first[0][1]=99
  assert.equal(growthCompletionPriorities('moon')[0][1],10)
  const {store}=fixture(cores.moon)
  assert.deepEqual(planNaturalGrowth(store.state,Object.entries(cores.moon),[]),[])
})
