import { currentCampaignSchema } from './helpers/tower-schema.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { GROWTH_SKILLS, rankCap, skillRequirement } from '../js/xianxia/TowerGrowth.js'
import { skillPresentation } from '../js/xianxia/TowerSkillPresentation.js'
import { TowerCampaignStore } from '../js/xianxia/TowerCampaign.js'
import { checksum } from '../js/xianxia/Checksum.js'
import { cultivationLevelXp as xpAt } from '../js/xianxia/TowerProfile.js'
const fresh = () => structuredClone(new TowerCampaignStore({getItem:()=>null,setItem(){}},0).state)
test('yujian unlocks at exactly level two and persists only after a successful write', () => {
  const disk={raw:null,fail:false,getItem(){return this.raw},setItem(k,v){if(this.fail)throw Error('full');this.raw=v}}
  const seed=xp=>{
    const data=JSON.stringify({...fresh(),xp})
    disk.raw=JSON.stringify({format:'xianxia-sect-tower-campaign',schema:currentCampaignSchema,data,checksum:checksum(data)})
    return new TowerCampaignStore(disk,0)
  }
  let store=seed(xpAt(2)-1), before=store.state, raw=disk.raw
  assert.equal(store.act({type:'learnSkill',id:'sj_yujian'},0).reason,'stage-locked')
  assert.equal(store.state,before);assert.equal(disk.raw,raw)
  store=seed(xpAt(2));before=store.state;raw=disk.raw;disk.fail=true
  assert.equal(store.act({type:'learnSkill',id:'sj_yujian'},0).reason,'save-failed')
  assert.equal(store.state,before);assert.equal(disk.raw,raw);disk.fail=false
  assert.equal(store.act({type:'learnSkill',id:'sj_yujian'},0).ok,true)
  assert.equal(new TowerCampaignStore(disk,0).state.skills.sj_yujian,1)
})
for (const skill of GROWTH_SKILLS) test(`${skill.id}: all rank boundaries agree with purchase and detail rules`, () => {
  for(let rank=1;rank<=skill.maxLevel;rank++) {
    const level=skill.rankRequirements[rank-1].characterLevel
    const state={...fresh(),xp:xpAt(level),playtestSkillPoints:100,skillsInitialized:true,
      skills:{...(skill.id==='sj_yujian'?{sj_spirit:3}:{}),...(rank>1?{[skill.id]:rank-1}:{})},books:[]}
    const detail=skillPresentation(state,skill.id)
    assert.equal(detail.nextRequirement.characterLevel,level)
    assert.equal(skillRequirement(state,skill.id).ok,true)
    assert.ok(rankCap(skill.id,state.xp,0)>=rank)
    assert.equal(rankCap(skill.id,state.xp,0),rankCap(skill.id,state.xp,9))
    if(level>1){
      const below={...state,xp:xpAt(level)-1}
      assert.ok(rankCap(skill.id,below.xp)<rank)
      assert.equal(skillRequirement(below,skill.id).ok,false)
      assert.equal(skillPresentation(below,skill.id).nextRequirement.canUpgrade,false)
    }
  }
})
test('ordinary skills use next-rank requirements without retired prerequisite bands',()=>{
 const state=fresh()
 for(const id of ['sj_yujian','sj_arc','sj_line','vajra']){
  const definition=GROWTH_SKILLS.find(s=>s.id===id)
  assert.deepEqual(skillPresentation(state,id).rankRuleLines,[])
  assert.equal(skillPresentation(state,id).nextRequirement.characterLevel,definition.rankRequirements[(state.skills[id]||0)].characterLevel)
 }
 state.skills.sj_arc=10
 assert.deepEqual(skillPresentation(state,'sj_arc').rankRuleLines,[])
 assert.equal(skillPresentation(state,'sj_arc').nextRequirement,null)
})
test('third rank saves atomically, fourth rank stays locked until middle phase',()=>{
 const disk={raw:null,fail:false,getItem(){return this.raw},setItem(k,v){if(this.fail)throw Error('full');this.raw=v}}
 const state={...fresh(),xp:xpAt(3)}
 const data=JSON.stringify(state)
 disk.raw=JSON.stringify({format:'xianxia-sect-tower-campaign',schema:currentCampaignSchema,data,checksum:checksum(data)})
 const store=new TowerCampaignStore(disk,0)
 assert.equal(store.act({type:'learnSkill',id:'sj_arc'},0).ok,true)
 const before=store.state,raw=disk.raw;disk.fail=true
 assert.equal(store.act({type:'learnSkill',id:'sj_arc'},0).reason,'save-failed')
 assert.equal(store.state,before);assert.equal(disk.raw,raw);disk.fail=false
 assert.equal(store.act({type:'learnSkill',id:'sj_arc'},0).ok,true)
 const reload=new TowerCampaignStore(disk,0)
 assert.equal(reload.readOnly,false);assert.equal(reload.state.skills.sj_arc,3)
 assert.equal(reload.act({type:'learnSkill',id:'sj_arc'},0).reason,'realm-locked')
})
