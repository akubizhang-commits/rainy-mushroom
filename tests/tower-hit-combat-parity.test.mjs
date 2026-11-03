import test from 'node:test'
import assert from 'node:assert/strict'
import {TowerRun} from '../js/xianxia/TowerRun.js'
import {skillForm} from '../js/xianxia/TowerSkillForms.js'
// Casting intentionally changes combat timing versus the archived pre-polish build.
// Verify the supported boundary directly: render callbacks cannot change combat,
// even when a callback attempts to mutate an immutable event and then throws.
for(const [id,parent] of [['sj_arc','sj_arc'],['sj_cross','sj_cross'],['sj_wanjian','sj_wanjian'],['evo_wuwo','sj_wanjian'],['sj_formation','sj_formation'],['evo_sixiang','sj_formation'],['sj_line','sj_line'],['evo_tiandi','sj_line'],['sj_shadow','sj_shadow']]){
 test(`${id}: visual polish preserves every combat tick, damage, RNG and input movement`,()=>{
  const form=skillForm(id,id===parent?10:2,10)
  const make=Type=>{
   const r=new Type({attemptId:41,floor:1,seed:312,xp:0,hp:100,training:true,loadout:{growthVersion:1,active:{sj_arc:1},passive:{},evolutions:[],evolutionLevels:{},tutorialWaves:0,weaponId:'eq_sword_suwen',weaponQuality:1,weaponRefine:0}})
   const s=r.state;s.loadout.active={[parent]:10};s.loadout.evolutions=id===parent?[]:[id];s.loadout.evolutionLevels=id===parent?{}:{[id]:2};s.cooldowns={[parent]:0};s.player.x=-160;s.player.y=-70
   s.enemies=Array.from({length:3},(_,i)=>{const e=r._enemy({...s.pending[0],id:'e'+i,x:s.player.x+(id==='sj_wanjian'?form.radius:id==='evo_wuwo'?90:160),y:s.player.y+(i-1)*15});e.hp=e.maxHp=1e8;e.moveSpeed=0;e.ai.readyAt=e.ai.graceUntil=e.ai.entryUntil=1e8;return e})
   s.pending=[];s.reserved=[];r.resume();return r
  }
  const a=make(TowerRun),b=make(TowerRun)
  let callbacks=0
  for(let i=0;i<300;i++){
   const direction=i>=150&&i<200?.25:0;a.setInput(0,direction);b.setInput(0,direction)
   a.advance(1/60);b.advance(1/60,event=>{
    callbacks++;assert.ok(Object.isFrozen(event))
    try { event.startedAt=-999 } catch {}
    throw new Error('renderer unavailable')
   })
   assert.deepEqual(a.state,b.state,`tick ${i}`)
  }
  assert.ok(callbacks>0,'fixture must exercise rendering callbacks')
 })
}
