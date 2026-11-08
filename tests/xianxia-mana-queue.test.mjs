import test from 'node:test'
import assert from 'node:assert/strict'
import {newAttackActions} from '../js/xianxia/TowerAttackActions.js'
import {manaQueueBlock} from '../scripts/lib/tower-mana-queue.mjs'
import {TowerRun} from '../js/xianxia/TowerRun.js'
import {createIronWeapon} from '../js/xianxia/TowerWeapons.js'

function probe(){
  const actions=newAttackActions()
  actions.waiting={sj_line:0,sj_arc:.1}
  return {state:{time:.2,actions,player:{mana:4},loadout:{active:{sj_line:1,sj_arc:1}}},
    _basicReady:()=>false,_castForm:({skill})=>({id:skill})}
}
test('observer finds an affordable alternative without modifying queue, mana or age',()=>{
  const r=probe(),before=structuredClone(r.state)
  assert.deepEqual(manaQueueBlock(r),{time:.2,head:'sj_line',cost:10,mana:4,alternatives:['sj_arc']})
  assert.deepEqual(r.state,before)
  r.state.player.mana=0
  assert.deepEqual(manaQueueBlock(r).alternatives,[])
  r.state.player.mana=10
  assert.equal(manaQueueBlock(r),null)
})
test('busy and basic-priority gates are not reported as mana blocks',()=>{
  const r=probe()
  r.state.actions.busyUntil=1;assert.equal(manaQueueBlock(r),null)
  r.state.actions.busyUntil=0;r.state.actions.bypasses=1;r._basicReady=()=>true
  assert.equal(manaQueueBlock(r),null)
})
test('observer reads evolved cost instead of its cheaper parent cost',()=>{
  const r=probe()
  r._castForm=({skill})=>({id:skill==='sj_line'?'evo_tiandi':skill})
  r.state.player.mana=12
  assert.equal(manaQueueBlock(r).cost,20)
})
test('existing automatic medicine serves the oldest candidate before fallback',()=>{
  const weapon=createIronWeapon()
  const r=new TowerRun({attemptId:1,floor:1,seed:41,xp:0,hp:100,mana:4,spiritPills:1,training:true,
    loadout:{growthVersion:1,skillsInitialized:true,active:{sj_line:1,sj_arc:1},passive:{},
      evolutions:[],evolutionLevels:{},tutorialWaves:0,weapon,weaponId:weapon.id,
      weaponQuality:0,weaponRefine:0,weaponFocusCount:0}})
  const s=r.state
  s.enemies=[{id:'probe',x:s.player.x+100,y:s.player.y,hp:1e8,maxHp:1e8,radius:20}]
  s.actions.waiting={sj_line:0,sj_arc:.1};s.time=.2
  r._growthSkills([],null,s.player)
  assert.equal(s.actions.current.parent,'sj_line')
  assert.equal(s.spiritState.uses.length,1)
  assert.equal(s.manaState.spent,10)
  assert.equal(s.player.mana,34)
  assert.equal(manaQueueBlock(r),null)
})
