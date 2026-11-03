import test from 'node:test'
import assert from 'node:assert/strict'
import {createFixedWeapon,WEAPONS,weaponSummary,validateWeapon} from '../js/xianxia/TowerWeapons.js'
import {applyEquipmentSkillLevels,validEquipmentSkillLevels} from '../js/xianxia/TowerEquipmentSkillLevels.js'
import {COMBAT_SKILLS,COMBAT_EVOLUTIONS} from '../js/xianxia/TowerCombatSkills.js'
const loadout=id=>({growthVersion:1,active:{sj_arc:10,sj_line:10},passive:{sj_heart:4,sj_bone:4},evolutions:['evo_tiandi'],evolutionLevels:{evo_tiandi:2},weapon:createFixedWeapon(id,id)})
test('only two selected supreme weapons carry a level affix',()=>{
 for(const d of WEAPONS){const w=createFixedWeapon(d.id,d.quality?d.id:'iron'),a=w.affixes.filter(a=>a.type==='skillLevel');assert.equal(a.length,['eq_sword_zhaodan','eq_sword_taiheng'].includes(d.id)?1:0);if(a.length){assert.equal(a[0].value,1);assert.ok(weaponSummary(w).specialLines.some(s=>s.includes('技能等级 +1')))}}
})
test('fixed identity validation rejects spreading the rare affix to other weapons',()=>{
 const other=createFixedWeapon('eq_sword_dingyue','other')
 other.affixes.push({type:'skillLevel',target:'all',value:1})
 assert.equal(validateWeapon(other),false)
 const chosen=createFixedWeapon('eq_sword_zhaodan','chosen')
 chosen.affixes.find(a=>a.type==='skillLevel').target='all'
 assert.equal(validateWeapon(chosen),false)
})
test('realm belongs to skill unlock realm, unlearned skills never appear, all applies once',()=>{
 const qi=applyEquipmentSkillLevels(loadout('eq_sword_zhaodan'));assert.equal(qi.active.sj_arc,11);assert.equal(qi.active.sj_line,10);assert.equal(qi.passive.sj_heart,5);assert.equal(qi.active.sj_yujian,undefined)
 const goldInput=loadout('eq_sword_taiheng');goldInput.weapon.affixes.find(a=>a.type==='skillLevel').target='金丹';const gold=applyEquipmentSkillLevels(goldInput);assert.equal(gold.evolutionLevels.evo_tiandi,3);assert.equal(gold.active.sj_line,10)
 const all=applyEquipmentSkillLevels(loadout('eq_sword_taiheng'));assert.equal(all.active.sj_arc,11);assert.equal(all.active.sj_line,11);assert.equal(all.evolutionLevels.evo_tiandi,3);assert.equal(all.passive.sj_bone,5)
 assert.deepEqual(applyEquipmentSkillLevels(all),all);assert.ok(validEquipmentSkillLevels(all))
 const bad=structuredClone(all);bad.active.sj_arc=12;assert.equal(validEquipmentSkillLevels(bad),false)
 const removed=applyEquipmentSkillLevels({...all,weapon:createFixedWeapon('eq_sword_suwen','plain')});assert.deepEqual(removed.active,all.trainedSkills.active);assert.equal(removed.trainedSkills,undefined)
})
test('overcap combat rows are finite; training tables remain separately capped',()=>{
 for(const d of [...COMBAT_SKILLS,...COMBAT_EVOLUTIONS])for(const [key,v] of Object.entries(d))if(Array.isArray(v)&&v.length&&v.every(x=>typeof x==='number')&&v.length===d.maxLevel)assert.ok(Number.isFinite(v.at(-1)),`${d.id}.${key}`)
 assert.equal(COMBAT_SKILLS.find(s=>s.id==='sj_arc').maxLevel,11)
 assert.equal(COMBAT_EVOLUTIONS.find(s=>s.id==='evo_tiandi').maxLevel,3)
})

test('campaign loadout and skill panel separate training from equipped ranks',async()=>{
 const {TowerCampaignStore,combatLoadout}=await import('../js/xianxia/TowerCampaign.js')
 const {skillPresentation}=await import('../js/xianxia/TowerSkillPresentation.js')
 const s=structuredClone(new TowerCampaignStore({getItem:()=>null,setItem(){}},0).state)
 s.skills={sj_arc:10,sj_heart:4};const trained=structuredClone(s.skills)
 const w=createFixedWeapon('eq_sword_zhaodan','rare');s.weapons[w.id]=w;s.loadouts[0].weaponId=w.id
 assert.equal(combatLoadout(s).active.sj_arc,11)
 const p=skillPresentation(s,'sj_arc');assert.equal(p.learnedLevel,10);assert.equal(p.effectiveLevel,11);assert.equal(p.maxed,true);assert.equal(p.nextPreview,null)
 s.skills.sj_arc=9;const next=skillPresentation(s,'sj_arc');assert.equal(next.effectiveLevel,10);assert.equal(next.nextPreview.effectiveLevel,11)
 s.skills.sj_arc=10;s.loadouts[0].weaponId=null
 assert.equal(combatLoadout(s).active.sj_arc,10);assert.deepEqual(s.skills,trained)
})
test('six real combat routes accept boosted ranks and deterministically restore snapshots',async()=>{
 const {readFileSync}=await import('node:fs')
 const {TowerRun,stats,validateTowerSnapshot}=await import('../js/xianxia/TowerRun.js')
 const {steerMechanics}=await import('../scripts/verify-monster-mechanics-balance.mjs')
 const fixtures=JSON.parse(readFileSync(new URL('../reports/flow-equal-budget-2026-11-02/controlled.json',import.meta.url))).fixtures
 for(const f of fixtures){
  const l=structuredClone(f.loadout),w=createFixedWeapon('eq_sword_taiheng','rare')
  Object.assign(l,{weapon:w,weaponId:w.id,weaponQuality:w.quality})
  const {createFixedEquipment}=await import('../js/xianxia/TowerEquipment.js')
  for(const slot of ['armor','ring'])if(l[slot])l[slot]=createFixedEquipment(l[slot].definitionId,l[slot].id)
  const r=new TowerRun({attemptId:1,floor:9,seed:101,xp:f.xp,hp:stats(f.xp,l).maxHp,loadout:l,arenaVersion:1})
  for(let i=0;i<1800;i++){steerMechanics(r);r.advance(1/60);if(i%300===0)assert.ok(validateTowerSnapshot(r.snapshot()),f.route)}
  const restored=TowerRun.restore(r.snapshot());r.advance(1/60);restored.advance(1/60);assert.deepEqual(restored.snapshot(),r.snapshot(),f.route)
 }
})

test('rank eleven keeps ten swords and redistributes the former eleven-sword damage budget',async()=>{
 const {TowerRun}=await import('../js/xianxia/TowerRun.js')
 const {cultivationLevelXp}=await import('../js/xianxia/TowerProfile.js')
 const {validYujianState,validYujianShot}=await import('../js/xianxia/TowerYujian.js')
 const row=COMBAT_SKILLS.find(s=>s.id==='sj_yujian')
 assert.equal(row.swords[10],10)
 assert.ok(Math.abs(row.damage[10]*row.sword_damage_share[10]/(row.damage[9]*row.sword_damage_share[9])-1.243)<1e-12)
 const sample=trained=>{
  const w=createFixedWeapon('eq_sword_taiheng','test'),r=new TowerRun({attemptId:1,floor:1,seed:7,xp:cultivationLevelXp(30),hp:100,training:true,loadout:{growthVersion:1,active:{sj_yujian:trained},passive:{},evolutions:[],evolutionLevels:{},tutorialWaves:0,weapon:w,weaponId:w.id,weaponQuality:4,weaponRefine:0,weaponFocusCount:0}})
  const tick=t=>{r.state.time=t;r._growthSkills([],()=>{},r.state.player)}
  for(let i=1;i<=12;i++)tick(i*.5)
  assert.equal(r.state.yujian.ready,10)
  assert.equal(validYujianState({...r.state.yujian,ready:11},r.state.time),false)
  const p=r.state.player;r.state.enemies=[{id:'target',x:p.x+200,y:p.y,hp:1e9,radius:8}]
  tick(6.01);const c=r.state.casts.find(c=>c.skill==='sj_yujian');assert.ok(c);tick(c.releaseAt)
  assert.equal(r.state.projectiles.length,10)
  assert.equal(new Set(r.state.projectiles.map(p=>p.yujianSlot)).size,10)
  assert.ok(r.state.projectiles.every(p=>p.yujianSlot<10))
  assert.equal(validYujianShot({...r.state.projectiles[0],yujianSlot:10}),false)
  return r.state.projectiles.reduce((n,p)=>n+p.damage,0)
 }
 assert.ok(Math.abs(sample(10)/sample(9)-1.243)<1e-10)
})
