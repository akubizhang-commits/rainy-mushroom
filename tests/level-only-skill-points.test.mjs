import test from 'node:test'
import assert from 'node:assert/strict'
import {TowerCampaignStore,TOWER_CAMPAIGN_KEY} from '../js/xianxia/TowerCampaign.js'
import {realmPoints,growthSummary,GROWTH_POINT_CAP} from '../js/xianxia/TowerGrowth.js'
import {FIRST_CLEAR_REWARDS} from '../js/xianxia/TowerEconomy.js'
import {cultivationLevelXp} from '../js/xianxia/TowerProfile.js'
import {checksum} from '../js/xianxia/Checksum.js'
function fixture(patch={}) {
 const values=new Map([['other-game','untouched']]);let blocked=false
 const disk={getItem:k=>values.get(k)??null,setItem:(k,v)=>{if(blocked)throw Error('disk full');values.set(k,v)}}
 let store=new TowerCampaignStore(disk,0);store.act({type:'sync'},0)
 const envelope=JSON.parse(values.get(TOWER_CAMPAIGN_KEY));envelope.data=JSON.stringify({...structuredClone(store.state),...patch});envelope.checksum=checksum(envelope.data)
 values.set(TOWER_CAMPAIGN_KEY,JSON.stringify(envelope));store=new TowerCampaignStore(disk,0)
 return {store,disk,values,block:v=>blocked=v,envelope}
}
test('every level adds one point and Zhuji/Jindan breakthroughs add three more',()=>{
 assert.equal(realmPoints(0),0);assert.equal(GROWTH_POINT_CAP,35)
 for(let level=2;level<=30;level++){
  const xp=cultivationLevelXp(level)
  assert.equal(realmPoints(xp),(level-1)+(level>=11?3:0)+(level>=21?3:0));assert.equal(realmPoints(xp)-realmPoints(xp-1),level===11||level===21?4:1)
 }
})
test('all floors have zero influence on points and removed bonuses grant no replacement currency',()=>{
 for(let floor=0;floor<=9;floor++){
  const f=fixture({xp:13485,clearedFloor:floor});const s=growthSummary(f.store.state)
  assert.equal(s.total,35);assert.equal(s.firstClear,0);assert.equal(s.research,0)
 }
 // 2026-11-06：点眷合并为第1/4/7层各2000，第3/6/9层改为只给炼器材料。
 for(const floor of [1,4,7])assert.deepEqual(FIRST_CLEAR_REWARDS[floor-1],{kind:'contribution',name:'点眷',quantity:2000,amount:2000})
 // 第3/6/9层：下一阶极品用的器心，不发成品丹药。
 assert.deepEqual([3,6,9].map(f=>[FIRST_CLEAR_REWARDS[f-1].kind,FIRST_CLEAR_REWARDS[f-1].id,FIRST_CLEAR_REWARDS[f-1].quantity]),[['item','forge_core_bao',1],['item','forge_core_ling',1],['item','forge_core_ling',1]])
 assert.equal(FIRST_CLEAR_REWARDS.filter(r=>r.kind==='spiritStones').reduce((n,r)=>n+r.amount,0),800)
 assert.equal(FIRST_CLEAR_REWARDS.filter(r=>r.kind==='contribution').reduce((n,r)=>n+r.amount,0),6000)
})
test('stale research action cannot spend currency or create points, and forged research counters are rejected',()=>{
 const f=fixture({xp:13485,clearedFloor:9,spiritStones:5000})
 const before=f.values.get(TOWER_CAMPAIGN_KEY)
 assert.equal(f.store.act({type:'researchPoint'},0).reason,'retired-research')
 assert.equal(f.values.get(TOWER_CAMPAIGN_KEY),before)
 assert.equal(f.store.state.spiritStones,5000)
 const forged=fixture({researchPurchases:1});assert.equal(forged.store.readOnly,true)
})
test('initial gifted rank can be refunded once and normal training preserves 35+1 total',()=>{
 const f=fixture({xp:13485,clearedFloor:9,spiritStones:5000})
 assert.equal(growthSummary(f.store.state).total,35)
 assert.equal(f.store.act({type:'respecSkills'},0).ok,true)
 assert.equal(growthSummary(f.store.state).total,36)
 assert.equal(growthSummary(f.store.state).available,36)
 f.store.act({type:'respecSkills'},0);assert.equal(growthSummary(f.store.state).available,36)
 assert.equal(f.store.act({type:'learnSkill',id:'sj_line'},0).ok,true)
 assert.equal(growthSummary(f.store.state).available,35)
 assert.equal(f.store.act({type:'decreaseSkill',id:'sj_line'},0).ok,true)
 assert.equal(growthSummary(new TowerCampaignStore(f.disk,0).state).available,36)
})
test('pre-change schema77 resets only this game and preserves original bytes when reset cannot be saved',()=>{
 const f=fixture();const old={...f.envelope,schema:77};f.values.set(TOWER_CAMPAIGN_KEY,JSON.stringify(old))
 const before=f.values.get(TOWER_CAMPAIGN_KEY);f.block(true)
 const blocked=new TowerCampaignStore(f.disk,0);assert.equal(blocked.readOnly,true);assert.equal(blocked.error,'save-failed');assert.equal(f.values.get(TOWER_CAMPAIGN_KEY),before)
 f.block(false);const reset=new TowerCampaignStore(f.disk,0);assert.equal(reset.readOnly,false);assert.equal(reset.migrationReport.reset,true)
 assert.equal(reset.state.xp,0);assert.equal(f.values.get('other-game'),'untouched')
})
