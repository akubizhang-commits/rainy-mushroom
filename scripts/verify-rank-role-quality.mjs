import fs from 'node:fs'
import {fixture,playFixture,sourceHashes} from './verify-monster-mechanics-balance.mjs'
const route=process.argv[2]||'qi',out=`reports/rank-role-rebalance-2026-11-01/quality-final-${route}.json`
const hashes=sourceHashes(),rows=[]
for(const quality of [1,2,4]){
 const f=fixture(9,route,quality,{mode:'entry'});rows.push(playFixture(f,{seed:419,maxSeconds:1500}))
 fs.writeFileSync(out,JSON.stringify({method:'Same entry level/skills/seed; generated gear comparison fixture; movement-only bot; not natural item acquisition or human success rates.',hashes,rows,sourceStable:JSON.stringify(hashes)===JSON.stringify(sourceHashes())},null,2))
 console.log(route,quality,rows.at(-1).outcome,rows.at(-1).time,rows.at(-1).encounters.find(e=>e.role==='boss')?.engagedSeconds)
}
