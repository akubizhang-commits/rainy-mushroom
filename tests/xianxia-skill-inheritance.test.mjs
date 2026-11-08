import test from 'node:test'
import assert from 'node:assert/strict'
import { TowerCampaignStore, TOWER_CAMPAIGN_KEY, combatLoadout } from '../js/xianxia/TowerCampaign.js'
import { GROWTH_SKILLS, GROWTH_EVOLUTIONS, skillRequirement, growthSummary } from '../js/xianxia/TowerGrowth.js'
import { skillPresentation } from '../js/xianxia/TowerSkillPresentation.js'
import { skillForm } from '../js/xianxia/TowerSkillForms.js'
import { TowerRun, validateTowerSnapshot } from '../js/xianxia/TowerRun.js'
import { TOWER_XP_CAP } from '../js/xianxia/TowerProfile.js'
import { checksum } from '../js/xianxia/Checksum.js'

function fixture() {
 const data = new Map([['other-game', 'keep']]); let fail = false
 const disk = { getItem: key => data.get(key) ?? null, setItem: (key,value) => { if(fail) throw Error('disk full'); data.set(key,value) } }
 let store = new TowerCampaignStore(disk,0); store.act({type:'sync'},0)
 const env = JSON.parse(data.get(TOWER_CAMPAIGN_KEY))
 env.data = JSON.stringify({...store.state,xp:TOWER_XP_CAP,clearedFloor:9,researchPurchases: 0,spiritStones:20000})
 env.checksum = checksum(env.data);data.set(TOWER_CAMPAIGN_KEY,JSON.stringify(env));store=new TowerCampaignStore(disk,0)
 return {store,disk,data,block:value=>{fail=value}}
}
function learn(store,id,n=1) { for(let i=0;i<n;i++) assert.equal(store.act({type:'learnSkill',id},0).ok,true,id) }

for(const evo of GROWTH_EVOLUTIONS) {
 test(`${evo.id}: fixed price determines full-route budget`,()=>{
  const parent=GROWTH_SKILLS.find(s=>s.id===evo.parent)
  const expected={evo_wanjian:[12,14],evo_wuwo:[14,18],evo_tiandi:[12,14],evo_sixiang:[14,18]}[evo.id]
  const base=parent.pointCosts.reduce((a,b)=>a+b,0)
  assert.equal(base+evo.pointCosts[0],expected[0]);assert.equal(base+evo.pointCosts.reduce((a,b)=>a+b,0),expected[1])
 })
 test(`${evo.id}: requires one parent rank; refund cannot leave orphaned evolution`,()=>{
  const {store,disk,block,data}=fixture()
  assert.equal(skillRequirement(store.state,evo.id).reason,'parent-required')
  learn(store,evo.parent,2); learn(store,evo.id)
  const before=structuredClone(store.state),raw=data.get(TOWER_CAMPAIGN_KEY)
  block(true);assert.equal(store.act({type:'decreaseSkill',id:evo.parent},0).reason,'save-failed')
  assert.deepEqual(store.state,before);assert.equal(data.get(TOWER_CAMPAIGN_KEY),raw)
  block(false);assert.equal(store.act({type:'decreaseSkill',id:evo.parent},0).ok,true)
  assert.equal(combatLoadout(store.state).active[evo.parent],1)
  assert.equal(store.act({type:'decreaseSkill',id:evo.parent},0).reason,'dependent-evolution')
  assert.deepEqual(new TowerCampaignStore(disk,0).state,store.state)
  assert.equal(store.act({type:'decreaseSkill',id:evo.id},0).ok,true)
  assert.equal(store.act({type:'decreaseSkill',id:evo.parent},0).ok,true)
  learn(store,evo.parent);learn(store,evo.id)
  block(true);const retained=store.state;assert.equal(store.act({type:'respecSkills'},0).ok,false);assert.deepEqual(store.state,retained)
  block(false);assert.equal(store.act({type:'respecSkills'},0).ok,true)
  assert.equal(growthSummary(store.state).available,36)
  assert.equal(store.act({type:'respecSkills'},0).ok,true);assert.equal(growthSummary(store.state).available,36)
  assert.equal(data.get('other-game'),'keep')
 })
 test(`${evo.id}: actual damage inherits parent rank while authored geometry stays unchanged`,()=>{
  const {store}=fixture(); learn(store,evo.parent);learn(store,evo.id)
  const low=skillPresentation(store.state,evo.id)
  if(evo.parent==='sj_yujian') learn(store,'sj_spirit',3)
  learn(store,evo.parent,9)
  const high=skillPresentation(store.state,evo.id)
  assert.equal(combatLoadout(store.state).active[evo.parent],10)
  const damageKey={evo_wanjian:'rainDamage',evo_wuwo:'hitDamage',evo_tiandi:'fullDamage',evo_sixiang:'fullDamage'}[evo.id]
  const damaging=p=>p.stats.filter(s=>/damage/i.test(s.key)&&typeof s.value==='number')
  assert.ok(damaging(high).length>0,damageKey)
  for(const stat of damaging(high)) assert.ok(stat.value>low.stats.find(s=>s.key===stat.key).value,stat.key)
  assert.deepEqual(low.currentForm,high.currentForm)
  assert.deepEqual(skillForm(evo.id,1,1),skillForm(evo.id,1,10))
  assert.match(high.description,/继承/); assert.doesNotMatch(high.description,/独立使用10级|返还，不影响/)
  const started=store.act({type:'startFloor',floor:1,seed:12},0);assert.equal(started.ok,true)
  let run=TowerRun.restore(started.snapshot)
  for(let i=0;i<600;i++)run.advance(1/60)
  assert.equal(validateTowerSnapshot(run.snapshot()),true)
  run=TowerRun.restore(run.snapshot());assert.equal(validateTowerSnapshot(run.snapshot()),true)
 })
}

for(const evo of GROWTH_EVOLUTIONS) test(`${evo.id}: paused base upgrade, rollback and resumed snapshots retain actual rank`,()=>{
 const {store,disk,block,data}=fixture();learn(store,evo.parent);learn(store,evo.id)
 const start=store.act({type:'startFloor',floor:1,seed:12},0);assert.equal(start.ok,true)
 let run=TowerRun.restore(start.snapshot)
 for(let i=0;i<600;i++)run.advance(1/60)
 assert.equal(validateTowerSnapshot(run.snapshot()),true)
 run.pause();assert.equal(store.act({type:'checkpoint',snapshot:run.snapshot()},0).ok,true)
 const before=store.state,raw=data.get(TOWER_CAMPAIGN_KEY)
 block(true);assert.equal(store.act({type:'learnSkill',id:evo.parent},0).reason,'save-failed')
 assert.deepEqual(store.state,before);assert.equal(data.get(TOWER_CAMPAIGN_KEY),raw)
 block(false);learn(store,evo.parent)
 assert.equal(store.state.activeRun.snapshot.loadout.active[evo.parent],2)
 assert.match(skillPresentation(store.state,evo.id).statLines.join(' '),/2级/)
 const reload=new TowerCampaignStore(disk,0);assert.deepEqual(reload.state,store.state)
 run=TowerRun.restore(reload.state.activeRun.snapshot);run.resume()
 for(let i=0;i<600;i++)run.advance(1/60)
 assert.equal(validateTowerSnapshot(run.snapshot()),true)
})

test('current saves reject orphaned evolutions and old standalone saves reset only this mode',()=>{
 const {store,disk,data}=fixture();learn(store,'sj_line');learn(store,'evo_tiandi')
 const env=JSON.parse(data.get(TOWER_CAMPAIGN_KEY)),state=JSON.parse(env.data)
 delete state.skills.sj_line;env.data=JSON.stringify(state);env.checksum=checksum(env.data)
 data.set(TOWER_CAMPAIGN_KEY,JSON.stringify(env))
 const corrupt=new TowerCampaignStore(disk,0);assert.equal(corrupt.readOnly,true)
 env.schema=29;data.set(TOWER_CAMPAIGN_KEY,JSON.stringify(env))
 const reset=new TowerCampaignStore(disk,0)
 assert.equal(reset.migrationReport.reset,true);assert.deepEqual(reset.state.evolutionRanks,{})
 assert.equal(data.get('other-game'),'keep')
})
