import test from 'node:test'
import assert from 'node:assert/strict'
import {TowerCampaignStore,TOWER_CAMPAIGN_KEY} from '../js/xianxia/TowerCampaign.js'
import {TowerRun} from '../js/xianxia/TowerRun.js'
import {GROWTH_EVOLUTIONS,rankCap} from '../js/xianxia/TowerGrowth.js'
import {cultivationLevelXp} from '../js/xianxia/TowerProfile.js'
import {checksum} from '../js/xianxia/Checksum.js'
import {skillPresentation} from '../js/xianxia/TowerSkillPresentation.js'
import {createFixedWeapon} from '../js/xianxia/TowerWeapons.js'
import {tickQingping} from '../js/xianxia/TowerQingping.js'

function fixture(level){
 let raw=null,fail=false
 const disk={getItem:k=>k===TOWER_CAMPAIGN_KEY?raw:null,setItem(k,v){if(fail)throw Error('disk');raw=v}}
 let store=new TowerCampaignStore(disk,0);store.act({type:'sync'},0)
 const env=JSON.parse(raw)
 env.data=JSON.stringify({...store.state,xp:cultivationLevelXp(level),clearedFloor:9,researchPurchases:3,spiritStones:20000})
 env.checksum=checksum(env.data);raw=JSON.stringify(env)
 store=new TowerCampaignStore(disk,0);assert.equal(store.readOnly,false)
 return {store,reload:()=>new TowerCampaignStore(disk,0),block:()=>{fail=true},raw:()=>raw}
}
test('Four Symbols rank two requires level 30, preserves atomicity and persisted rank one',()=>{
 for(const level of [27,29,30]){
  const f=fixture(level),s=f.store
  assert.equal(s.act({type:'learnSkill',id:'sj_formation'},0).ok,true)
  assert.equal(s.act({type:'learnSkill',id:'evo_sixiang'},0).ok,true)
  const p=skillPresentation(s.state,'evo_sixiang')
  assert.match(p.requirementLines[0],/金丹 · 十层/)
  assert.ok(p.rankRuleLines.some(t=>/2级：金丹 · 十层/.test(t)))
  const before=f.raw(),result=s.act({type:'learnSkill',id:'evo_sixiang'},0)
  assert.equal(result.ok,level===30)
  if(level<30){assert.equal(result.reason,'realm-locked');assert.equal(f.raw(),before)}
  assert.equal(f.reload().state.evolutionRanks.evo_sixiang,level===30?2:1)
 }
 const f=fixture(30);f.store.act({type:'learnSkill',id:'sj_formation'},0);f.store.act({type:'learnSkill',id:'evo_sixiang'},0)
 const raw=f.raw();f.block()
 assert.equal(f.store.act({type:'learnSkill',id:'evo_sixiang'},0).reason,'save-failed')
 assert.equal(f.raw(),raw)
 for(const e of GROWTH_EVOLUTIONS)assert.equal(rankCap(e.id,cultivationLevelXp(29)),e.id==='evo_sixiang'?1:2)
 assert.equal(GROWTH_EVOLUTIONS.find(e=>e.id==='evo_sixiang').levels[1].characterLevel,30)
})
test('Scar single-hit return increases at every rank and beats no-scar with 5% on-hit weapon',()=>{
 const totals=[]
 for(let rank=0;rank<=4;rank++){
  const w=createFixedWeapon('eq_sword_wangshu','probe')
  const loadout={growthVersion:1,active:{sj_arc:1},passive:rank?{sj_mark:rank}:{},evolutions:[],evolutionLevels:{},
   tutorialWaves:0,weapon:w,weaponId:w.id,weaponQuality:w.quality,weaponRefine:0,weaponFocusCount:0}
  const r=new TowerRun({attemptId:1,floor:1,seed:1,xp:cultivationLevelXp(30),hp:100,training:true,loadout})
  const e={id:'target',hp:1e8,maxHp:1e8,x:80,y:0,radius:22,woundBudget:0,woundUntil:0,orbitNextAt:0}
  r.state.enemies=[e];r._random=()=>1
  r._damageEnemy({target:e.id,source:'sj_arc',direct:true,damage:100})
  const immediate=1e8-e.hp
  for(let i=1;i<=6;i++){r.state.time=i*.5;for(const h of tickQingping(r))r._damageEnemy(h)}
  totals.push(1e8-e.hp)
  if(rank)assert.ok(immediate<totals[rank],'damage remains delayed')
 }
 for(let i=1;i<totals.length;i++)assert.ok(totals[i]>totals[i-1])
 assert.ok(Math.abs(totals[1]/totals[0]-1.125/1.05)<1e-7)
})
test('cross burst descriptions and radius upgrade previews match all trained ranks',()=>{
 const f=fixture(30)
 for(let rank=1;rank<=10;rank++){
  const p=skillPresentation({...f.store.state,skills:{sj_cross:rank}},'sj_cross')
  const text=[p.description,...p.formLines,...p.nextFormLines,...p.statLines].join(' ')
  assert.doesNotMatch(text,/飞行十字|贯穿|布置距离|射程|刃面横宽/)
  assert.match(text,/周身剑光爆发/)
  if([3,6].includes(rank))assert.ok(p.nextFormLines.some(t=>t.includes('范围半径')))
 }
})
test('Yujian hints track its own realm bands without obsolete spirit requirements',()=>{
 const f=fixture(30)
 for(const [rank,level,stage] of [[3,4,'炼气 · 中期'],[6,7,'炼气 · 巅峰'],[9,11,'筑基 · 初期']]){
  const p=skillPresentation({...f.store.state,skills:{sj_yujian:rank}},'sj_yujian')
  assert.equal(p.nextRequirement.characterLevel,level)
  assert.equal(p.nextRequirement.stage,stage)
  assert.deepEqual(p.nextRequirement.prerequisites,{})
 }
})
