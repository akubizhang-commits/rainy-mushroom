import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {stripTypeScriptTypes} from 'node:module'
import {runInNewContext} from 'node:vm'
import {convergencePoses} from '../js/xianxia/TowerConvergence.js'
const source=stripTypeScriptTypes(readFileSync(new URL('../cocos-pilot/assets/scripts/ConvergenceArt.ts',import.meta.url),'utf8')
  .replace(/^import .*$/gm,''),{mode:'transform'}).replace(/^export /gm,'')
const Art=runInNewContext(`${source};ConvergenceArt`,{convergencePoses})
test('only positive terminal hits shake; same-frame hits do not stack, pause is stable',()=>{
 const art=new Art(),hit={kind:'hit',damage:1,startedAt:1,impact:{skill:'evo_wanjian',pulseIndex:9,pulseCount:9}}
 const s={time:1.03,player:{hp:10},effects:[hit]}
 const before=JSON.stringify(s),kick=art.cameraKick(s)
 assert.ok(Math.hypot(kick.x,kick.y)>0)
 assert.deepEqual(art.cameraKick(s),kick);assert.equal(JSON.stringify(s),before)
 s.effects.push({...hit});assert.deepEqual(art.cameraKick(s),kick)
 s.time=1.2;assert.equal(Math.hypot(...Object.values(art.cameraKick(s))),0)
 for(const change of [{damage:0},{hostile:true},{impact:{skill:'evo_wanjian',pulseIndex:1,pulseCount:9}}]){
  s.time=1.03;s.effects=[{...hit,...change}]
  assert.equal(Math.hypot(...Object.values(art.cameraKick(s))),0)
 }
 s.effects=[hit];s.player.hp=0;assert.equal(Math.hypot(...Object.values(art.cameraKick(s))),0)
})
test('decorative swords remain finite and capped with overlapping casts',()=>{
 const zone={kind:'sword_rain',formId:'evo_wanjian',formLevel:2,parentLevel:10,x:0,y:0,
  dirX:0,dirY:1,nextAt:1.2,startedAt:1,pulseIndex:0,ticks:9}
 const state={time:1.12,player:{hp:1},zones:Array.from({length:10},(_,i)=>({...zone,id:i}))}
 const poses=convergencePoses(state)
 assert.equal(poses.length,80)
 assert.equal(new Set(poses.map(p=>p.id)).size,poses.length)
 assert.ok(poses.every(p=>[p.x,p.y,p.angle,p.alpha,p.span].every(Number.isFinite)))
})
