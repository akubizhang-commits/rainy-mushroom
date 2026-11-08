import test from 'node:test'
import assert from 'node:assert/strict'
import {TowerRun} from '../js/xianxia/TowerRun.js'
import {ARCHETYPES} from '../js/xianxia/TowerContent.js'
import {fixture} from '../scripts/verify-monster-mechanics-balance.mjs'
import {BossTiming,installBossTiming} from '../scripts/lib/tower-boss-timing.mjs'

test('boss timing hooks preserve deterministic combat including RNG and damage',()=>{
  const f=fixture(4,'qi'),create=()=>{
    const run=new TowerRun({attemptId:1,floor:4,seed:101,xp:f.xp,hp:f.stats.maxHp,loadout:f.loadout,arenaVersion:1})
    const a=ARCHETYPES.find(a=>a.species==='crocodile'&&a.role==='boss')
    run.state.enemies=[run._enemy({id:'probe-boss',archetype:a.id,x:130,y:-60})]
    run.state.pending=[]
    return run
  }
  const control=create(),observed=create(),advance=TowerRun.prototype.advance
  const probe=new BossTiming(),restore=installBossTiming(TowerRun,probe)
  try{
    for(let i=0;i<600;i++){advance.call(control,1/60);observed.advance(1/60)}
    assert.deepEqual(observed.snapshot(),control.snapshot())
    const [row]=probe.results()
    assert.ok(row.seconds>0)
    assert.ok(row.damage>0)
    assert.ok(Math.abs(Object.values(row.geometry).reduce((a,b)=>a+b,0)-row.seconds)<1e-8)
    const seconds=row.seconds
    observed.pause();observed.advance(1/60)
    assert.equal(row.seconds,seconds,'paused wall time is not combat time')
  }finally{restore()}
})

test('mana block records an eligible scheduler fallback, not merely low mana',()=>{
  const probe=new BossTiming()
  const run={state:{time:5,player:{mana:0},actions:{busyUntil:0,bypasses:0,waiting:{sj_arc:2}},
    loadout:{active:{sj_arc:3}}},_basicReady:()=>false,_castForm:()=>({id:'sj_arc'})}
  const frame={bosses:[{}],blocked:null}
  probe.frames.set(run,frame);probe.basicFallback(run)
  assert.equal(frame.blocked,'sj_arc')
  frame.blocked=null;run.state.actions.busyUntil=6;probe.basicFallback(run)
  assert.equal(frame.blocked,null,'body lock is not a failed mana attempt')
  run.state.actions.busyUntil=0;run.state.player.mana=4;probe.basicFallback(run)
  assert.equal(frame.blocked,null,'affordable candidate is not mana-blocked')
})

test('abandon outside advance closes a living boss as a censored encounter',()=>{
  const f=fixture(4,'qi')
  const run=new TowerRun({attemptId:2,floor:4,seed:101,xp:f.xp,hp:f.stats.maxHp,loadout:f.loadout,arenaVersion:1})
  const a=ARCHETYPES.find(a=>a.species==='crocodile'&&a.role==='boss')
  run.state.enemies=[run._enemy({id:'timeout-boss',archetype:a.id,x:350,y:-60})]
  run.state.pending=[]
  const probe=new BossTiming(),restore=installBossTiming(TowerRun,probe)
  try{
    run.advance(1/60)
    run.abandon()
    const [row]=probe.results()
    assert.equal(row.endedAt,run.state.time)
    assert.equal(row.outcome,'abandoned')
    assert.equal(row.killed,false)
  }finally{restore()}
})
