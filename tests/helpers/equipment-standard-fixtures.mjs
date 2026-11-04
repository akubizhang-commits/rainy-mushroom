import assert from 'node:assert/strict'
import {TowerCampaignStore,TOWER_CAMPAIGN_KEY,combatLoadout} from '../../js/xianxia/TowerCampaign.js'
import {GROWTH_SKILLS,growthSummary} from '../../js/xianxia/TowerGrowth.js'
import {cultivationLevelXp} from '../../js/xianxia/TowerProfile.js'
import {checksum} from '../../js/xianxia/Checksum.js'
import {currentCampaignSchema} from './tower-schema.mjs'
import {assertCurrentCampaign} from './tower-current-state.mjs'

export const targets={fan:[null,1.30],fa:[null,1.80,2.20,2.70,3.30],bao:[null,2.10,2.70,3.30,4.00],ling:[null,2.60,3.30,4.10,5.00]}
export const levels={fan:1,fa:4,bao:11,ling:21}
// Original integer-budget §8 fixtures are retained verbatim for comparison.
export const standard={
 1:{qi:{sj_arc:1},array:{sj_wanjian:1}},
 4:{qi:{sj_arc:3},pursuit:{sj_yujian:1},array:{sj_wanjian:3},mixed:{sj_arc:1,sj_wanjian:1}},
 11:{qi:{sj_arc:6,sj_line:1},pursuit:{sj_yujian:3,sj_shadow:1},array:{sj_wanjian:6,sj_formation:1},mixed:{sj_arc:3,sj_wanjian:3,sj_formation:1}},
 21:{qi:{sj_arc:9,sj_line:4},pursuit:{sj_yujian:3,sj_shadow:4},array:{sj_wanjian:9,sj_formation:4},mixed:{sj_arc:6,sj_wanjian:6,sj_shadow:3}},
}
// Frozen before new DPS measurements. Do not add skills or reallocate free points.
// Literal replacements make later rule changes fail validation rather than quietly
// producing a different benchmark. See the 2026-11-04 technical-review decision.
const replacements={
 '1/array':{active:{},actualRoute:'basic',kind:'preparatory-basic',reason:'周天剑阵17级开放；1级只保留普攻。'},
 '4/array':{active:{},actualRoute:'basic',kind:'preparatory-basic',reason:'周天剑阵17级开放；4级只保留普攻。'},
 '4/mixed':{active:{sj_arc:1},actualRoute:'qi',kind:'preparatory-qi',reason:'周天剑阵17级开放；保留原剑气斩1级，不增加替代技能。'},
 '11/array':{active:{sj_formation:1},actualRoute:'formation',kind:'partial-formation',reason:'周天剑阵17级开放；只保留原两仪剑阵1级，缺周天覆盖。'},
 '11/mixed':{active:{sj_arc:3,sj_formation:1},actualRoute:'qi+formation',kind:'partial-mixed',reason:'周天剑阵17级开放；保留原剑气斩3级和两仪剑阵1级，缺周天覆盖。'},
 '21/array':{active:{sj_wanjian:6,sj_formation:4},actualRoute:'array',kind:'capped-array',reason:'21级周天剑阵训练上限6；原两仪剑阵4级保持不变。'},
}

export function standardCases(){
 const rows=[]
 for(const tier of ['fan','fa','bao','ling']){
  const level=levels[tier]
  for(const [route,requested] of Object.entries(standard[level])){
   const replacement=replacements[`${level}/${route}`]
   for(let quality=1;quality<=(tier==='fan'?1:4);quality++){
    const requestedActive={...requested},active={...(replacement?.active??requested)}
    const missing=Object.entries(requestedActive).filter(([id,n])=>(active[id]??0)<n)
      .map(([id,n])=>({id,requestedRank:n,actualRank:active[id]??0,missingRanks:Array.from({length:n-(active[id]??0)},(_,i)=>(active[id]??0)+i+1)}))
    rows.push({tier,quality,route,level,requestedActive,active,target:targets[tier][quality],changed:!!replacement,
     coverage:{kind:replacement?.kind??'complete',requestedRoute:route,actualRoute:replacement?.actualRoute??route,
      missingRequestedSkills:missing,missingOrbitRoute:missing.some(row=>row.id==='sj_wanjian'&&row.actualRank===0),
      reason:replacement?.reason??'原标准配装合法，技能及训练等级保持不变。'}})
   }
  }
 }
 return rows
}

// All persistence is in memory. The ordinary Store has no playtest adapter flag.
export function openFixtureCampaign(state){
 const data=JSON.stringify(state)
 let raw=JSON.stringify({format:'xianxia-sect-tower-campaign',schema:currentCampaignSchema,data,checksum:checksum(data)}),writes=0
 const disk={
  getItem(key){assert.equal(key,TOWER_CAMPAIGN_KEY);return raw},
  setItem(key,value){assert.equal(key,TOWER_CAMPAIGN_KEY);raw=value;writes++},
 }
 return {store:new TowerCampaignStore(disk,0),disk,get raw(){return raw},get writes(){return writes}}
}

export function trainingCampaign(level,bookFunds=0){
 const state=structuredClone(new TowerCampaignStore({getItem:()=>null,setItem(){}},0).state)
 Object.assign(state,{xp:cultivationLevelXp(level),spiritStones:bookFunds})
 const fixture=openFixtureCampaign(state)
 assertCurrentCampaign(fixture.store,state)
 assert.equal(fixture.store.allowPlaytestTools,false)
 assert.equal(fixture.store.act({type:'respecSkills'},0).ok,true)
 return fixture
}

export function trainFixture(level,active){
 const bookFunds=Object.keys(active).reduce((sum,id)=>sum+(GROWTH_SKILLS.find(d=>d.id===id)?.bookCost??0),0)
 const fixture=trainingCampaign(level,bookFunds),{store}=fixture
 const before=growthSummary(store.state),transactions=[]
 for(const [id,rank] of Object.entries(active)){
  for(let next=1;next<=rank;next++){
   const result=store.act({type:'learnSkill',id},0)
   assert.equal(result.ok,true,`Lv${level} ${id} rank${next}: ${result.reason}`)
   transactions.push({id,rank:result.level,cost:result.cost,bookCost:result.bookCost})
  }
 }
 assert.deepEqual(store.state.skills,active,'Campaign must learn exactly the requested fixture')
 const loadout=combatLoadout(store.state)
 assert.deepEqual(loadout.active,active)
 assert.deepEqual(loadout.passive,{})
 assert.deepEqual(loadout.evolutions,[])
 assert.equal(store.state.clearedFloor,0)
 assert.equal(store.state.researchPurchases,0)
 assert.equal(Object.hasOwn(store.state,'playtestSkillPoints'),false)
 const after=growthSummary(store.state)
 assert.equal(after.total,before.total,'learning cannot create skill points')
 assert.ok(after.available>=0,'natural points cannot be overspent')
 assert.equal(store.state.spiritStones,0,'normal learning pays exactly the supplied book fees')
 assertCurrentCampaign(new TowerCampaignStore(fixture.disk,0),store.state)
 return {fixture,training:{pointBudget:before.total,spent:after.spent,available:after.available,
  firstClear:after.firstClear,research:after.research,bookFees:bookFunds,transactions}}
}
