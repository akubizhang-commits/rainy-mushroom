import test from 'node:test'
import assert from 'node:assert/strict'
import { TowerRun, validateTowerSnapshot } from '../js/xianxia/TowerRun.js'
import { COMBAT_SKILLS } from '../js/xianxia/TowerCombatSkills.js'
import { skillPresentation } from '../js/xianxia/TowerSkillPresentation.js'
import { TowerCampaignStore } from '../js/xianxia/TowerCampaign.js'

const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`)
function make(rank=1,extra={}){return new TowerRun({attemptId:1,floor:1,seed:7,xp:0,hp:100,training:true,
 loadout:{growthVersion:1,active:rank?{sj_yujian:rank,...extra}:{...extra},passive:{},evolutions:[],evolutionLevels:{},tutorialWaves:0,weaponId:'eq_sword_suwen',weaponQuality:1,weaponRefine:0}})}
function tick(r,t){r.state.time=t;r._growthSkills([],()=>{},r.state.player)}

test('rank one waits a full second before producing each replacement with compensated damage',()=>{
 const r=make();near(r.state.yujian.nextAt,1)
 const p=r.state.player;r.state.enemies=[{id:'target',x:p.x+200,y:p.y,hp:1e9,radius:8}]
 tick(r,.999);assert.equal(r.state.casts.length,0)
 tick(r,1);tick(r,r.state.casts[0].releaseAt)
 assert.equal(r.state.projectiles.length,1);near(r.state.projectiles[0].damage,127.2)
 tick(r,1.999);assert.equal(r.state.projectiles.length,1)
 tick(r,2);tick(r,r.state.casts[0].releaseAt)
 assert.equal(r.state.projectiles.length,2)
})

test('all ranks preserve the sustained damage budget while production accelerates to the old cap',()=>{
 const row=COMBAT_SKILLS.find(s=>s.id==='sj_yujian');let last=Infinity
 for(let rank=1;rank<=10;rank++){
  const r=make(rank),interval=r.state.yujian.nextAt
  assert.ok(interval<last);last=interval
  near(row.damage[rank-1]*row.sword_damage_share[rank-1]/interval,row.damage[rank-1])
  tick(r,interval-1e-5);assert.equal(r.state.yujian.ready,0)
  tick(r,interval);assert.equal(r.state.yujian.ready,1)
  near(r.state.yujian.nextAt,2*interval)
 }
 near(make(10).state.yujian.nextAt,.5)
 near(row.generation_interval[10],.5)
 near(row.sword_damage_share[10],.55)
})

test('rank changes preserve fractional production progress and forgetting relearning starts a fresh clock',()=>{
 const r=make(1,{sj_arc:1});r.advance(.25);r.pause()
 const loadout=structuredClone(r.state.loadout);loadout.active.sj_yujian=10
 const upgraded=r.setGrowthLoadout(loadout)
 near(upgraded.yujian.nextAt,.25+.375);assert.ok(validateTowerSnapshot(upgraded))
 loadout.active.sj_yujian=1;r.setGrowthLoadout(loadout);near(r.state.yujian.nextAt,1)
 delete loadout.active.sj_yujian;r.setGrowthLoadout(loadout)
 r.resume();r.advance(2);r.pause();loadout.active.sj_yujian=1
 r.setGrowthLoadout(loadout);near(r.state.yujian.nextAt,r.state.time+1)
 assert.equal(r.state.yujian.ready,0)
})

test('rank-one snapshots accept their longer clock and pause restore continues identically',()=>{
 const r=make();r.advance(.25);r.pause();const snap=r.snapshot()
 assert.ok(validateTowerSnapshot(snap));near(snap.yujian.nextAt,1)
 const bad=structuredClone(snap);bad.yujian.nextAt=snap.time+1.01
 assert.equal(validateTowerSnapshot(bad),false)
 r.advance(5);assert.deepEqual(r.snapshot(),snap)
 const b=TowerRun.restore(snap);r.resume();b.resume();r.advance(.8);b.advance(.8)
 assert.deepEqual(r.snapshot(),b.snapshot())
})

test('skill description uses the same rank-dependent generation rate',()=>{
 const state=structuredClone(new TowerCampaignStore({getItem:()=>null,setItem(){}},0).state)
 state.skills.sj_yujian=1
 const panel=skillPresentation(state,'sj_yujian')
 assert.ok(JSON.stringify(panel).includes('每1秒生成1把飞剑'))
})

test('equipping cooldown gear preserves production progress and validates the shorter clock',async()=>{
 const {createIronWeapon}=await import('../js/xianxia/TowerWeapons.js')
 const {createFixedEquipment}=await import('../js/xianxia/TowerEquipment.js')
 const {cultivationLevelXp}=await import('../js/xianxia/TowerProfile.js')
 const weapon=createIronWeapon(),loadout={growthVersion:1,active:{sj_yujian:1},passive:{},evolutions:[],evolutionLevels:{},tutorialWaves:0,
  weapon,weaponId:weapon.id,weaponQuality:weapon.quality,weaponRefine:weapon.refine,weaponFocusCount:0}
 const r=new TowerRun({attemptId:1,floor:1,seed:7,xp:cultivationLevelXp(30),hp:100,training:true,loadout})
 r.advance(.25);r.pause()
 const equipped=structuredClone(r.state.loadout)
 equipped.ring=createFixedEquipment('eq_ring_wenmai','test-ring');equipped.ringId=equipped.ring.id
 r.setEquipmentLoadout(equipped);near(r.state.yujian.nextAt,.25+.75*.96)
 assert.ok(validateTowerSnapshot(r.snapshot()))
 r.setEquipmentLoadout(loadout);near(r.state.yujian.nextAt,1)
 assert.ok(validateTowerSnapshot(r.snapshot()))
})
