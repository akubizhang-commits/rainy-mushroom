// Run the existing actual-Campaign driver with observational timing hooks.
import fs from 'node:fs'
import path from 'node:path'
import {createHash} from 'node:crypto'
import assert from 'node:assert/strict'
import {TowerRun} from '../js/xianxia/TowerRun.js'
import {BossTiming,installBossTiming} from './lib/tower-boss-timing.mjs'
import {sourceHashes} from './verify-monster-mechanics-balance.mjs'

const output=process.argv.find(a=>a.startsWith('--output='))?.slice(9)
assert.ok(output,'Explicit --output required')
assert.ok(!fs.existsSync(output)&&!fs.existsSync(`${output}.timing.json`),'Refusing to overwrite evidence')
fs.mkdirSync(path.dirname(output),{recursive:true})
const hash=()=>{
  const files=['scripts/verify-boss-natural-timing.mjs','scripts/lib/tower-boss-timing.mjs',
    'scripts/verify-rank-role-natural.mjs','scripts/lib/tower-natural-growth.mjs',
    'scripts/lib/tower-natural-growth-policies.mjs','scripts/lib/tower-natural-equipment.mjs']
  return {...sourceHashes(),...Object.fromEntries(files.map(p=>[p,createHash('sha256').update(fs.readFileSync(p)).digest('hex')]))}
}
const hashes=hash(),probe=new BossTiming({onBoss:(run,row)=>{
  if([4,7,9].includes(row.floor))fs.writeFileSync(`${output}.boss-${row.attemptId}.json`,JSON.stringify(run.snapshot()))
}})
installBossTiming(TowerRun,probe)
let completed=false
try {await import('./verify-rank-role-natural.mjs');completed=true}
finally {
  const endHashes=hash()
  fs.writeFileSync(`${output}.timing.json`,JSON.stringify({completed,hashes,endHashes,
    sourceStable:JSON.stringify(hashes)===JSON.stringify(endHashes),
    method:'Actual Campaign driver, read-only timing hooks at 60Hz. Geometry is an outer action-envelope/line-of-sight proxy, not guaranteed hits. Mana block records a ready scheduler candidate after automatic pill attempt. Armor, action busy and mana counters overlap geometry. Hit attribution includes attached on-hit damage under its parent source.',
    bosses:probe.results()},null,2)+'\n')
}
