// Same saved natural-entry states, real engine, no purchases after restoration.
import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {TowerRun,validateTowerSnapshot} from '../js/xianxia/TowerRun.js'
import {manaQueueBlock} from './lib/tower-mana-queue.mjs'
import {steerMechanics,sourceHashes} from './verify-monster-mechanics-balance.mjs'

const option=(key,fallback)=>process.argv.find(a=>a.startsWith(`--${key}=`))?.slice(key.length+3)??fallback
const input=option('input','reports/boss-pacing-2026-11-05')
const output=option('output','reports/mana-queue-2026-11-05/baseline.json')
const filter=option('filter','.boss-')
assert.ok(!fs.existsSync(output),'Refusing to overwrite evidence')
fs.mkdirSync(path.dirname(output),{recursive:true})
const hashes=sourceHashes(),rows=[]
const fingerprint=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex')
const diagnosticHashes=Object.fromEntries(['scripts/verify-mana-queue.mjs','scripts/lib/tower-mana-queue.mjs']
  .map(p=>[p,fingerprint(p)])),inputs={}
let active=null
const originalBasic=TowerRun.prototype._startBasic,originalStart=TowerRun.prototype._startSkillAction
TowerRun.prototype._startBasic=function(...args){
  if(active){
    const block=manaQueueBlock(this)
    if(block){
      active.blockedFrames++
      if(block.alternatives.length){
        active.affordableBlockedFrames++
        active.blockedBySkill[block.head]=(active.blockedBySkill[block.head]??0)+1
        if(active.examples.length<5)active.examples.push(block)
      }
    }
  }
  return originalBasic.apply(this,args)
}
TowerRun.prototype._startSkillAction=function(id,...args){
  if(active){
    const t=active.casts[id]??={count:0,maxWait:0}
    t.count++;t.maxWait=Math.max(t.maxWait,this.state.time-(this.state.actions.waiting[id]??this.state.time))
  }
  return originalStart.call(this,id,...args)
}
try{
  for(const file of fs.readdirSync(input).filter(n=>n.includes(filter)&&n.endsWith('.json')).sort()){
    inputs[file]=fingerprint(path.join(input,file))
    const snapshot=JSON.parse(fs.readFileSync(path.join(input,file)))
    assert.ok(validateTowerSnapshot(snapshot),file)
    const run=TowerRun.restore(snapshot),boss=run.state.enemies.find(e=>e.role==='boss'&&!e.temporary)
    assert.ok(boss,file)
    const start=run.state.time,spent=run.state.manaState.spent,pills=run.state.spiritState.uses.length
    active={file,floor:snapshot.floor,start,blockedFrames:0,affordableBlockedFrames:0,
      blockedBySkill:{},examples:[],casts:{}}
    while(['playing','paused'].includes(run.state.phase)&&boss.hp>0&&run.state.time-start<600){
      if(run.state.phase==='paused')run.resume()
      const p=run.state.player
      run.setViewport({xmin:p.x-560,xmax:p.x+560,ymin:p.y-315,ymax:p.y+315})
      steerMechanics(run);run.advance(1/60)
    }
    Object.assign(active,{seconds:run.state.time-start,bossKilled:boss.hp<=0,
      outcome:run.state.phase,manaSpent:run.state.manaState.spent-spent,
      pillUses:run.state.spiritState.uses.length-pills,
      hp:run.state.player.hp,bossHp:boss.hp,snapshotValid:validateTowerSnapshot(run.snapshot())})
    assert.ok(active.snapshotValid,`${file}: invalid terminal snapshot`)
    rows.push(active);active=null
    console.log(file,rows.at(-1).seconds.toFixed(2),'affordable blocked frames',rows.at(-1).affordableBlockedFrames)
  }
}finally{
  TowerRun.prototype._startBasic=originalBasic;TowerRun.prototype._startSkillAction=originalStart
}
fs.writeFileSync(output,JSON.stringify({hashes,diagnosticHashes,inputs,
  sourceStable:JSON.stringify(hashes)===JSON.stringify(sourceHashes())
    &&Object.entries(diagnosticHashes).every(([p,h])=>fingerprint(p)===h)
    &&Object.entries(inputs).every(([p,h])=>fingerprint(path.join(input,p))===h),
  method:'Replay saved natural Boss snapshots; same deterministic movement; no post-restore skill purchases. Queued affordable alternatives are observed immediately before the basic fallback. Independent from earlier full-journey timing because movement caches restart.',
  rows},null,2)+'\n')
