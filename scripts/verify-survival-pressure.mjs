// Controlled replays of naturally acquired builds; not a new-save win-rate test.
import assert from 'node:assert/strict'
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import {gunzipSync} from 'node:zlib'
import {dirname} from 'node:path'
import {TowerRun,stats,validateTowerSnapshot} from '../js/xianxia/TowerRun.js'
import {steerMechanics} from './verify-monster-mechanics-balance.mjs'
const option=(k,d)=>process.argv.find(a=>a.startsWith(`--${k}=`))?.slice(k.length+3)??d
const inputs=option('inputs','reports/growth-check-2026-11-04')
const output=option('output','reports/survival-pressure-2026-11-04/controlled.json')
const floors=option('floors','3,7,9').split(',').map(Number)
const modes=option('modes','normal,intermittent').split(',')
const rows=[]
for(const route of ['qi','array']){
 const natural=JSON.parse(gunzipSync(readFileSync(`${inputs}/${route}.json.gz`)))
 for(const floor of floors)for(const mode of modes){
  const entry=natural.attempts.find(a=>a.floor===floor)
  assert.ok(entry)
  const run=new TowerRun({attemptId:1,floor,seed:100+floor,xp:entry.xp,
   hp:stats(entry.xp,entry.loadout).maxHp,loadout:entry.loadout,arenaVersion:1})
  const telemetry={hits:0,damage:0,damageMaxHpUnits:0,regen:0,drops:0,levelHeal:0,minHp:1,belowHalfSeconds:0}
  const effect=run._effect.bind(run)
  run._effect=(kind,x,y,radius,extra)=>{
   if(kind==='player_hit'){telemetry.hits++;telemetry.damage+=extra.damage;telemetry.damageMaxHpUnits+=extra.damage/run.state.player.maxHp}
   return effect(kind,x,y,radius,extra)
  }
  for(const [method,key] of [['_regenerateHp','regen'],['_drops','drops'],['_gainXp','levelHeal']]){
   const original=run[method].bind(run)
   run[method]=(...args)=>{const before=run.state.player.hp;const value=original(...args);telemetry[key]+=Math.max(0,run.state.player.hp-before);return value}
  }
  while(['playing','paused'].includes(run.state.phase)&&run.state.time<1500){
   if(run.state.phase==='paused')run.resume()
   const s=run.state,p=s.player
   run.setViewport({xmin:p.x-560,xmax:p.x+560,ymin:p.y-315,ymax:p.y+315})
   if(mode==='normal'||mode==='intermittent'&&s.time%3<1)steerMechanics(run)
   else run.setInput(0,0)
   run.advance(1/60)
   telemetry.minHp=Math.min(telemetry.minHp,p.hp/p.maxHp)
   if(p.hp/p.maxHp<.5)telemetry.belowHalfSeconds+=1/60
  }
  if(run.state.phase==='playing')run.abandon()
  assert.ok(validateTowerSnapshot(run.snapshot()),'terminal snapshot')
  rows.push({route,floor,mode,entryLevel:entry.level,outcome:run.state.phase,seconds:run.state.time,
   hp:run.state.player.hp,maxHp:run.state.player.maxHp,...telemetry})
  mkdirSync(dirname(output),{recursive:true})
  writeFileSync(output,JSON.stringify({method:'Same natural entry builds, full health, original floor seed; no new skill purchases. Intermittent moves one second per three seconds. Not human win rates.',rows},null,2)+'\n')
  console.log(route,floor,mode,run.state.phase,`minHP=${(telemetry.minHp*100).toFixed(1)}%`,`hits=${telemetry.hits}`)
 }
}
