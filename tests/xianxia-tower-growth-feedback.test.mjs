import test from 'node:test'
import assert from 'node:assert/strict'
import { TowerCampaignStore, combatLoadout } from '../js/xianxia/TowerCampaign.js'
import { TowerRun, stats } from '../js/xianxia/TowerRun.js'
import { rollWeapon } from '../js/xianxia/TowerWeapons.js'
import { cultivationAt, cultivationLevelXp } from '../js/xianxia/TowerProfile.js'
import { FLOORS, FLOOR01, ARCHETYPES } from '../js/xianxia/TowerContent.js'
import { towerEnemyStats } from '../js/xianxia/TowerEnemyStats.js'
import { towerKillXp } from '../js/xianxia/TowerCultivationRewards.js'
import { skillRequirement, tutorialProgress } from '../js/xianxia/TowerGrowth.js'
import { skillPresentation } from '../js/xianxia/TowerSkillPresentation.js'

const fresh = () => structuredClone(new TowerCampaignStore({getItem:()=>null,setItem(){}},0).state)
function shots(rank, targets=2, weapon=null) {
  const state=fresh(); state.xp=225; state.skills.sj_yujian=rank
  if(weapon){state.weapons[weapon.id]=weapon;state.loadouts[0].weaponId=weapon.id}
  const loadout=combatLoadout(state)
  const run=new TowerRun({attemptId:1,floor:1,seed:1,xp:225,hp:100,loadout,training:true})
  const p=run.state.player
  run.state.enemies=Array.from({length:targets},(_,i)=>({id:`e${i}`,x:p.x+80,y:p.y+i*35,radius:10,hp:10000,woundBudget:0,woundUntil:0}))
  run.state.yujian.ready=rank
  run._releaseSkill({skill:'sj_yujian',level:rank,formId:'sj_yujian',castContext:{xp:225,loadout},
    dirX:1,dirY:0,pulseIndex:0,x:p.x,y:p.y},[])
  for(const shot of run.state.projectiles)run._damageEnemy({target:shot.targetId,damage:shot.damage,
    source:'sj_yujian',direct:true,castContext:shot.castContext})
  return run.state.enemies.map(e=>10000-e.hp)
}
test('fan equipment adds its fixed attack and strength without promising a kill-count breakpoint',()=>{
  const state=fresh(), bare=fresh();bare.loadouts[0].weaponId=''
  const weapon=rollWeapon('fan',1,()=>.999999,'test-fan')
  state.weapons[weapon.id]=weapon;state.loadouts[0].weaponId=weapon.id
  const equipped=stats(0,combatLoadout(state)).attack
  assert.equal(equipped,129)
  assert.equal(stats(0,combatLoadout(bare)).attack,110)
  assert.equal(stats(0,combatLoadout(fresh())).attack,115)
})
test('rank three increases stored damage and concentrates all swords on a sole target',()=>{
  const before=shots(2),after=shots(3),solo=shots(3,1)
  assert.ok(after[0]>before[0])
  assert.ok(after[1]>0)
  assert.ok(Math.abs(solo[0]-after[0]-after[1])<1e-7)
  const state=fresh();state.xp=225;state.skills.sj_yujian=3
  assert.equal(skillPresentation(state,'sj_yujian').currentForm.hits,3,
    'all stored swords can hit one enemy')
})
test('nominal full-clear XP remains deterministic with the Foundation barrier at 6600',()=>{
  let cumulative=0
  for(const f of FLOORS){
    for(const w of f.waves){
      const ids=f.floor===1?FLOOR01.waves[w.wave-1].batches.flatMap(b=>b.unit_ids):
        Array.from({length:w.enemy_groups.reduce((n,g)=>n+g.count,0)},(_,i)=>`u${i+1}`)
      for(const id of ids){const xp=towerKillXp(f.floor,w.wave,id);assert.ok(Number.isSafeInteger(xp)&&xp>=0);cumulative+=xp}
    }
    assert.equal(cultivationAt(cumulative).level,[3,6,9,12,15,18,20,24,27][f.floor-1])
  }
  assert.equal(cumulative,10920)
})
test('special skills use their own current level gates without floor prerequisites',()=>{
  for(const [id,level] of [['sj_line',13],['sj_shadow',11],['sj_formation',17]]){
    const state=fresh();state.xp=cultivationLevelXp(level);state.clearedFloor=0
    assert.equal(skillRequirement(state,id).ok,true)
    assert.equal(skillPresentation(state,id).nextRequirement.characterLevel,level)
    assert.equal(skillRequirement({...state,xp:cultivationLevelXp(level)-1},id).reason,'stage-locked')
  }
})
test('teaching waits for authored milestones and cannot be farmed with wave-one retries',()=>{
  let progress=0
  for(let i=0;i<25;i++)progress=tutorialProgress(progress,1,[1])
  assert.equal(progress,0)
  assert.equal(tutorialProgress(0,1,[1,2,3,4,5,6,7]),0)
  assert.equal(tutorialProgress(0,1,[1,2,3,4,5,6,7,8]),0)
  assert.equal(tutorialProgress(1,1,Array.from({length:20},(_,i)=>i+1)),1)
  assert.equal(tutorialProgress(1,2,[]),1)
  assert.equal(tutorialProgress(1,2,[1]),1)
})
