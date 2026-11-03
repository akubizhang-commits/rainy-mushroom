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
for(const evo of GROWTH_EVOLUTIONS)test(`${evo.id}: both ranks improve on the retained max-level base`,()=>{
 const base=dps(evo.parent,10),first=dps(evo.id,1),second=dps(evo.id,2)
 assert.ok(first>=base*1.19,`${first}/${base}`);assert.ok(second>first*1.09,`${second}/${first}`)
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
  assert.ok(Math.abs(skillPresentation(s,'evo_wanjian').stats.find(r=>r.key==='rainFullDamage').value-total)<1e-8)
 }
})
test('same-role fixed weapons increase attack across available tiers at current unlocks',()=>{
 const tiers=['fan','fa','bao','ling'],unlocks=[1,4,11,21]
 for(let quality=1;quality<=4;quality++)for(let t=1;t<tiers.length;t++){
  // Fan has only the starter transition and Qingfeng, not a full four-quality series.
  if(t===1&&quality>1)continue
  const level=unlocks[t],B=100*cultivationAt(cultivationLevelXp(level)).attackMultiplier
  const old=rollWeapon(tiers[t-1],quality,()=>.999999,'old')
  const next=rollWeapon(tiers[t],quality,()=>.999999,'next')
  assert.ok(weaponFlatAttack(next)>weaponFlatAttack(old))
  const factor=w=>(B+weaponFlatAttack(w))*(1+weaponDamageModifiers(w,'sj_formation','hybrid').flat)
  assert.ok(factor(next)>factor(old),`${tiers[t-1]} -> ${tiers[t]}, q${quality}`)
 }
})

test('skill specialization and passive milestones have meaningful gains without increasing point sources',()=>{
 assert.ok(defs.sj_arc.damage[2]/defs.sj_arc.cooldown>=1.2)
 assert.equal(growthSummary(fresh()).total,0)
 assert.equal(defs.vajra.reduction[3],.15)
 assert.ok(defs.sj_heart.crit_chance[2]>=.12)
 assert.ok(defs.sj_bone.damage_bonus[2]>=.18)
})
test('floor four eases the five pre-breakthrough waves and preserves fixed enemy stats',()=>{
 const boar=ARCHETYPES.find(a=>a.id==='boar_normal')
 const early=towerEnemyStats(boar,4,5).hp,later=towerEnemyStats(boar,4,6).hp
 assert.equal(early,later*.7);assert.equal(towerEnemyStats(boar,1,1).hp,172.5)
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
