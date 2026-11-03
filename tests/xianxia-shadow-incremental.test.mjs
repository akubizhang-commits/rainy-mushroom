import test from 'node:test'
import assert from 'node:assert/strict'
import {TowerRun} from '../js/xianxia/TowerRun.js'
import {GROWTH_SKILLS} from '../js/xianxia/TowerGrowth.js'
import {skillForm} from '../js/xianxia/TowerSkillForms.js'
import {castActionTiming} from '../js/xianxia/TowerSkillTiming.js'
const skill=GROWTH_SKILLS.find(s=>s.id==='sj_shadow')
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`)
function hits(rank){
 const form=skillForm('sj_shadow',rank),run=Object.create(TowerRun.prototype)
 run.state={arenaVersion:1,time:0,player:{x:33,y:-60},enemies:[{id:'boss',x:33,y:-60,radius:42,hp:1e6}]};run._effect=()=>({})
 const z={...form,id:'probe',kind:'shadow',formId:'sj_shadow',formLevel:rank,parentLevel:rank,x:33,y:-60,dirX:1,dirY:0,pulseIndex:0,damage:skill.damage[rank-1]/form.hits,direct:true}
 const out=[];for(let i=0;i<form.hits;i++)run._growthZonePulse(z,out,()=>{})
 return out.map(h=>h.damage)
}
test('rank six preserves rank-five swings and gives only the upgrade increment to the third',()=>{
 const before=hits(5),after=hits(6)
 close(after[0],before[0]);close(after[1],before[1]);close(after[2],skill.damage[5]-skill.damage[4])
})
test('rank ten preserves all three previous swings and adds only its increment',()=>{
 const before=hits(9),after=hits(10)
 before.forEach((damage,i)=>close(after[i],damage));close(after[3],skill.damage[9]-skill.damage[8])
})
test('rank one through five retain equal shares and all ranks conserve full-hit budget',()=>{
 for(let rank=1;rank<=10;rank++){
  const values=hits(rank);close(values.reduce((a,b)=>a+b,0),skill.damage[rank-1])
  if(rank<=5)for(const damage of values)close(damage,skill.damage[rank-1]/values.length)
  if(rank>5){const previous=hits(rank-1);previous.forEach((damage,i)=>assert.ok(values[i]+1e-8>=damage))}
 }
})
test('extra zone slashes do not extend cast occupancy, initial delay or earlier hit times',()=>{
 for(const [a,b] of [[5,6],[9,10]])for(const speed of [0,.12,.3]){
  const before=skillForm('sj_shadow',a),after=skillForm('sj_shadow',b)
  assert.deepEqual(castActionTiming('sj_shadow',before.hits,speed),castActionTiming('sj_shadow',after.hits,speed))
  close(before.initialDelay,after.initialDelay);close(before.interval,after.interval)
 }
})

import {TowerCampaignStore} from '../js/xianxia/TowerCampaign.js'
import {skillPresentation} from '../js/xianxia/TowerSkillPresentation.js'
test('panel shows the real unequal slash damage and the unchanged total',()=>{
 for(const rank of [6,10]){
  const state=structuredClone(new TowerCampaignStore({getItem:()=>null,setItem(){}},0).state)
  state.skills={...state.skills,sj_shadow:rank}
  const p=skillPresentation(state,'sj_shadow'),value=key=>p.stats.find(row=>row.key===key)?.value
  const first=p.stats.find(row=>row.key==='hitDamage');assert.match(first.label,/首斩/)
  const expected=hits(rank),total=value('fullDamage')
  close(value('hitDamage')/total,expected[0]/skill.damage[rank-1])
  for(let i=2;i<=expected.length;i++)close(value(`shadowHit${i}`)/total,expected[i-1]/skill.damage[rank-1])
 }
})
