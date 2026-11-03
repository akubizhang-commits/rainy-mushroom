import { currentCampaignSchema } from './helpers/tower-schema.mjs'
import { assertCurrentCampaign, assertActionSucceeds } from './helpers/tower-current-state.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { GROWTH_SKILLS, rankCap, skillRequirement } from '../js/xianxia/TowerGrowth.js'
import { skillPresentation } from '../js/xianxia/TowerSkillPresentation.js'
import { TowerCampaignStore } from '../js/xianxia/TowerCampaign.js'
import { checksum } from '../js/xianxia/Checksum.js'
const fresh = () => structuredClone(new TowerCampaignStore({getItem:()=>null,setItem(){}},0).state)
// Independent rule table from 71/91. Boundary expectations must not be derived
// from the same rankRequirements/cultivationLevelXp functions under test.
const xpAt = [null,0,45,120,225,360,525,720,945,1200,1485,1801,2145,2520,2925,3360,3825,4320,4845,5400,5985,6601,7245,7920,8625,9360,10125,10920,11745,12600,13485]
const bands = (a,b,c,d) => [a,a,a,b,b,b,c,c,c,d]
const gates = {
 sj_arc:bands(1,4,7,11),sj_yujian:bands(2,4,7,11),sj_cross:bands(7,11,14,17),
 sj_wanjian:bands(17,21,24,27),sj_line:bands(11,14,17,21),sj_shadow:bands(11,14,17,21),sj_formation:bands(11,14,17,21),
 sj_spirit:[11,14,17],sj_bone:[1,4,4,7],sj_heart:[7,11,11,14],vajra:[4,7,7,11],
 sj_mark:[14,17,17,21],sj_gate:[17,21,21,24],sj_flight:[11],
}
test('yujian unlocks at exactly 45 XP and persists only after a successful write', () => {
  const disk={raw:null,fail:false,getItem(){return this.raw},setItem(k,v){if(this.fail)throw Error('full');this.raw=v}}
  const seed=xp=>{
    const expected={...fresh(),xp},data=JSON.stringify(expected)
    disk.raw=JSON.stringify({format:'xianxia-sect-tower-campaign',schema:currentCampaignSchema,data,checksum:checksum(data)})
    return assertCurrentCampaign(new TowerCampaignStore(disk,0),expected)
  }
  let store=seed(44), before=store.state, raw=disk.raw
  assert.equal(store.act({type:'learnSkill',id:'sj_yujian'},0).reason,'stage-locked')
  assert.equal(store.state,before);assert.equal(disk.raw,raw)
  store=seed(45);before=store.state;raw=disk.raw
  assertActionSucceeds(store.state,{type:'learnSkill',id:'sj_yujian'},0);disk.fail=true
  assert.equal(store.act({type:'learnSkill',id:'sj_yujian'},0).reason,'save-failed')
  assert.equal(store.state,before);assert.equal(disk.raw,raw);disk.fail=false
  assert.equal(store.act({type:'learnSkill',id:'sj_yujian'},0).ok,true)
  assertCurrentCampaign(new TowerCampaignStore(disk,0),store.state)
  assert.equal(store.state.skills.sj_yujian,1)
})
for (const skill of GROWTH_SKILLS) test(`${skill.id}: all rank boundaries agree with purchase and detail rules`, () => {
  assert.deepEqual(skill.rankRequirements.map(r=>r.characterLevel),gates[skill.id])
  for(let rank=1;rank<=skill.maxLevel;rank++) {
    const level=gates[skill.id][rank-1]
    const state={...fresh(),xp:xpAt[level],playtestSkillPoints:100,skillsInitialized:true,
      skills:rank>1?{[skill.id]:rank-1}:{},books:[]}
    const detail=skillPresentation(state,skill.id)
    assert.equal(detail.nextRequirement.characterLevel,level)
    assert.equal(skillRequirement(state,skill.id).ok,true)
    assert.ok(rankCap(skill.id,state.xp,0)>=rank)
    assert.equal(rankCap(skill.id,state.xp,0),rankCap(skill.id,state.xp,9))
    if(level>1){
      const below={...state,xp:xpAt[level]-1}
      assert.ok(rankCap(skill.id,below.xp)<rank)
      assert.equal(skillRequirement(below,skill.id).ok,false)
      assert.equal(skillPresentation(below,skill.id).nextRequirement.canUpgrade,false)
    }
  }
})
test('detail hides redundant rank bands for ordinary skills and retains evolution parent requirements',()=>{
  const state=fresh()
  for(const skill of GROWTH_SKILLS) assert.deepEqual(skillPresentation(state,skill.id).rankRuleLines,[],skill.id)
  assert.deepEqual(skillPresentation(state,'sj_yujian').nextRequirement.prerequisites,{})
  assert.deepEqual(skillPresentation(state,'evo_wanjian').rankRuleLines,
    ['1级：金丹 · 初期，需御剑术1级','2级：金丹 · 巅峰，需御剑术1级'])
  assert.deepEqual(skillPresentation(state,'evo_sixiang').rankRuleLines,
    ['1级：金丹 · 巅峰，需两仪剑阵1级','2级：金丹 · 十层，需两仪剑阵1级'])
  state.skills.sj_arc=10
  assert.deepEqual(skillPresentation(state,'sj_arc').rankRuleLines,[])
})
test('third rank saves atomically, fourth rank stays locked until middle phase',()=>{
 const disk={raw:null,fail:false,getItem(){return this.raw},setItem(k,v){if(this.fail)throw Error('full');this.raw=v}}
 const state={...fresh(),xp:120},data=JSON.stringify(state)
 disk.raw=JSON.stringify({format:'xianxia-sect-tower-campaign',schema:currentCampaignSchema,data,checksum:checksum(data)})
 const store=assertCurrentCampaign(new TowerCampaignStore(disk,0),state)
 assert.equal(store.act({type:'learnSkill',id:'sj_arc'},0).ok,true)
 const before=store.state,raw=disk.raw
 assertActionSucceeds(store.state,{type:'learnSkill',id:'sj_arc'},0);disk.fail=true
 assert.equal(store.act({type:'learnSkill',id:'sj_arc'},0).reason,'save-failed')
 assert.equal(store.state,before);assert.equal(disk.raw,raw);disk.fail=false
 assert.equal(store.act({type:'learnSkill',id:'sj_arc'},0).ok,true)
 const reload=assertCurrentCampaign(new TowerCampaignStore(disk,0),store.state)
 assert.equal(reload.state.skills.sj_arc,3)
 assert.equal(reload.act({type:'learnSkill',id:'sj_arc'},0).reason,'realm-locked')
})
