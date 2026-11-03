import fs from 'node:fs'
import {fixture,playFixture,sourceHashes} from './verify-monster-mechanics-balance.mjs'
const out=process.argv[2]||'reports/rank-role-rebalance-2026-11-01/combat-initial.json'
const rows=[];const hashes=sourceHashes()
for(const floor of [1,2,3,4,5,6,7,8,9])for(const route of ['qi','array','mixed'])for(const quality of (floor>=6?[1,2,4]:[2])){
 const f=fixture(floor,route,quality,{mode:'entry'});const row=playFixture(f,{seed:419,maxSeconds:1500});rows.push(row)
 fs.writeFileSync(out,JSON.stringify({method:'Current runtime, fixed entry fixture; movement-only bot; generated gear is comparison fixture, not proof of natural acquisition.',hashes,rows},null,2))
 console.log(floor,route,quality,row.outcome,row.time,row.hp,'boss',row.encounters.find(e=>e.role==='boss')?.engagedSeconds)
}
