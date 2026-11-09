import {monsterHealthMultiplier} from '../js/xianxia/TowerMonsterAttributes.js'
import { resonanceDamageFactor } from '../js/xianxia/TowerResonance.js'
import { currentCampaignSchema } from './helpers/tower-schema.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { GROWTH_SKILLS, GROWTH_EVOLUTIONS, growthSummary } from '../js/xianxia/TowerGrowth.js'
import { TowerCampaignStore, combatLoadout } from '../js/xianxia/TowerCampaign.js'
import { TowerRun, validateTowerSnapshot } from '../js/xianxia/TowerRun.js'
import { skillPresentation } from '../js/xianxia/TowerSkillPresentation.js'
import { skillForm, convergenceRainMultiplier } from '../js/xianxia/TowerSkillForms.js'
import { WEAPON_BASE_ATTACK, rollWeapon, weaponDamageModifiers, weaponFlatAttack } from '../js/xianxia/TowerWeapons.js'
import { cultivationAt, cultivationLevelXp } from '../js/xianxia/TowerProfile.js'
import { ARCHETYPES } from '../js/xianxia/TowerContent.js'
import { towerEnemyStats } from '../js/xianxia/TowerEnemyStats.js'
import { checksum } from '../js/xianxia/Checksum.js'
const defs=Object.fromEntries(GROWTH_SKILLS.map(s=>[s.id,s]))
const fresh=()=>structuredClone(new TowerCampaignStore({getItem:()=>null,setItem(){}},0).state)
function fixture(id,rank,distance=80) {
 const evo=GROWTH_EVOLUTIONS.find(s=>s.id===id),s=fresh();s.xp=10920;s.skillsInitialized=true
 s.skills=evo?{[evo.parent]:10}:{[id]:rank};s.evolutionRanks=evo?{[id]:rank}:{};s.evolutions=evo?[id]:[]
 const run=new TowerRun({attemptId:1,floor:1,seed:1,xp:s.xp,hp:100,loadout:combatLoadout(s),training:true})
 Object.assign(run.state.player,{x:0,y:0})
 const enemy={id:'probe',hp:1e9,x:distance,y:0,radius:22,woundBudget:0,woundUntil:0,orbitNextAt:0}
 run.state.enemies=[enemy]
 // Mean-roll laboratory; no native crit in this fixture.
 run._random=()=>.5
 return {s,run,enemy}
}
function dps(id,rank,distance=80){
 const {run,enemy}=fixture(id,rank,distance);let total=0
 for(let i=0;i<7200;i++){
  run.state.time=i/60;const out=[];run._skills(out);run._projectiles([],out,run.state.player);run._zones([],out)
  for(const hit of out){const hp=enemy.hp;run._damageEnemy(hit);if(hit.source!=='basic_attack')total+=hp-enemy.hp}
  run.state.effects=[]
 }
 return total/120/run.state.player.attack
}
for(const evo of GROWTH_EVOLUTIONS.filter(e=>!['evo_wanjian','evo_tiandi'].includes(e.id)))test(`${evo.id}: both ranks improve on the retained max-level base`,()=>{
 const base=dps(evo.parent,10),first=dps(evo.id,1),second=dps(evo.id,2)
 assert.ok(first>=base*1.19,`${first}/${base}`);assert.ok(second>first*1.09,`${second}/${first}`)
})
// Doc 91 / skill-second-rank-2026-11-03 approves authored budget multipliers,
// not a universal 19% measured DPS gain after mana, range and action scheduling.
for(const [id,budgets] of [['evo_wanjian',[1.30,1.69]],['evo_tiandi',[1.40/1.3,1.82/1.3]]])test(`${id}: emitted casts retain the approved first/second-rank budgets`,()=>{
 const definition=GROWTH_EVOLUTIONS.find(e=>e.id===id)
 assert.deepEqual(definition.budgetMultipliers,budgets)
 for(const rank of [1,2]){
  const {run}=fixture(id,rank),out=[]
  run._startBasic=()=>{}
  for(let frame=0;frame<120&&!out.some(h=>h.source===id)&&!run.state.zones.length;frame++){
   run.state.ticks=frame;run.state.time=frame/60;run._skills(out)
  }
  const base=run.state.player.attack*defs[definition.parent].damage[9]
  if(id==='evo_wanjian'){
   const zone=run.state.zones.find(z=>z.kind==='sword_rain');assert.ok(zone)
   assert.ok(Math.abs(zone.damage*zone.pulseCount-base*((budgets[rank-1]-1)*8+definition.rainDamageDurationByRank[rank-1]))<1e-7)
  }else{
   const hit=out.find(h=>h.source===id);assert.ok(hit)
   assert.ok(Math.abs(hit.damage-base*(12/defs.sj_line.cooldown)*budgets[rank-1])<1e-7)
  }
 }
})
test('upgrading cross and orbit preserves hits in previously covered near positions',()=>{
 for(const distance of [60,70,80,100,120])for(const [id,a,b]of[['sj_cross',6,7],['sj_wanjian',9,10]]){
  const before=dps(id,a,distance),after=dps(id,b,distance)
  assert.ok(before>.1,`${id} ${distance} fixture must hit before`)
  assert.ok(after>=before*.98,`${id} ${distance}: ${before} -> ${after}`)
 }
})
test('rain detail and emitted zones use the same compensated budget',()=>{
 for(const rank of [1,2]){
  const {s,run}=fixture('evo_wanjian',rank);run._skills([])
  for(let i=0;i<60&&!run.state.zones.length;i++){run.state.ticks++;run.state.time=run.state.ticks/60;run._skills([])}
  const zone=run.state.zones.find(z=>z.kind==='sword_rain'),form=skillForm('evo_wanjian',rank,10)
  const total=run.state.player.attack*defs.sj_yujian.damage[9]*convergenceRainMultiplier(rank)
  assert.ok(Math.abs(zone.damage*form.hits-total)<1e-8)
  // 85号：面板显示含主修共鸣的实际伤害。
  assert.ok(Math.abs(skillPresentation(s,'evo_wanjian').stats.find(r=>r.key==='rainFullDamage').value-total*resonanceDamageFactor(run.state.loadout,'sj_yujian'))<1e-8)
 }
})
test('same-quality higher ranks increase the reviewed attack base without guaranteeing an off-build upgrade',()=>{
 const tiers=['fan','fa','bao','ling'],unlocks=[1,4,11,21]
 for(let quality=1;quality<=4;quality++)for(let t=1;t<tiers.length;t++){
  // Fan gear has one authored quality; do not invent removed fan identities.
  if(WEAPON_BASE_ATTACK[tiers[t-1]][quality]===undefined)continue
  assert.ok(WEAPON_BASE_ATTACK[tiers[t]][quality]>WEAPON_BASE_ATTACK[tiers[t-1]][quality])
  // Compare the same affix type and roll at the higher rank's unlock. Off-build
  // lower quality is deliberately not promised to beat a matched old极品.
  const level=unlocks[t],xp=cultivationLevelXp(level)
  const B=110*cultivationAt(xp).attackMultiplier
  const old=rollWeapon(tiers[t-1],quality,()=>.999999,'old')
  const next=rollWeapon(tiers[t],quality,()=>.999999,'next')
  const factor=w=>(B+weaponFlatAttack(w))*(1+weaponDamageModifiers(w,'sj_formation','hybrid').flat)
  assert.ok(factor(next)>factor(old))
 }
})

test('skill specialization and passive milestones have meaningful gains without increasing point sources',()=>{
 assert.equal(defs.sj_arc.cooldown,3.5)
 assert.ok(defs.sj_arc.damage[2]>defs.sj_arc.damage[1]&&defs.sj_arc.damage[1]>defs.sj_arc.damage[0])
 assert.equal(growthSummary(fresh()).total,0)
 assert.equal(defs.vajra.reduction[3],.15)
 assert.ok(defs.sj_heart.crit_chance[2]>=.12)
 assert.ok(defs.sj_bone.damage_bonus[2]>=.18)
})
test('floor four eases the five pre-breakthrough waves and preserves fixed enemy stats',()=>{
 const boar=ARCHETYPES.find(a=>a.id==='boar_normal')
 const early=towerEnemyStats(boar,4,5).hp,later=towerEnemyStats(boar,4,6).hp
 assert.ok(Math.abs(early-later*.7)<1e-9);const first=towerEnemyStats(boar,1,1);assert.equal(first.hp,172.5*monsterHealthMultiplier(first))
})
test('evolution purchases and compensated active zones survive pause/save/reload with atomic failure',()=>{
 for(const evo of GROWTH_EVOLUTIONS){
  const disk={raw:null,fail:false,getItem(){return this.raw},setItem(k,v){if(this.fail)throw Error('disk full');this.raw=v}}
  const s=fresh();Object.assign(s,{xp:10920,spiritStones:10000})
  const data=JSON.stringify(s);disk.raw=JSON.stringify({format:'xianxia-sect-tower-campaign',schema:currentCampaignSchema,data,checksum:checksum(data)})
  const store=new TowerCampaignStore(disk,0);assert.equal(store.readOnly,false)
  assert.equal(store.act({type:'learnSkill',id:evo.parent},0).ok,true)
  const before=store.state,raw=disk.raw;disk.fail=true
  assert.equal(store.act({type:'learnSkill',id:evo.id},0).reason,'save-failed');assert.equal(store.state,before);assert.equal(disk.raw,raw)
  disk.fail=false;assert.equal(store.act({type:'learnSkill',id:evo.id},0).ok,true)
  const start=store.act({type:'startFloor',floor:1,seed:12},0);assert.equal(start.ok,true)
  const run=TowerRun.restore(start.snapshot);run.advance(8);run.pause()
  assert.equal(validateTowerSnapshot(run.snapshot()),true)
  assert.equal(store.act({type:'checkpoint',snapshot:run.snapshot()},0).ok,true)
  assert.equal(new TowerCampaignStore(disk,0).readOnly,false)
 }
})
