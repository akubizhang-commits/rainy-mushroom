import {TowerCampaignStore} from '../../../js/xianxia/TowerCampaign.js';
import {TowerRun} from '../../../js/xianxia/TowerRun.js';
import {performance} from 'node:perf_hooks';
import os from 'node:os';
const samples=[], check=[],sizes=[];let writes=0;
for(let round=0;round<8;round++){
 const map=new Map(),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>{map.set(k,v);writes++}};
 const store=new TowerCampaignStore(storage,0);const entry=store.act({type:'startFloor',floor:1},0);if(!entry.ok)throw Error(JSON.stringify(entry));
 const run=TowerRun.restore(entry.snapshot);
 let maxEnemies=0;
 for(let tick=1;tick<=3600&&run.state.phase==='playing';tick++){
  const start=performance.now();run.advance(1/60);samples.push(performance.now()-start);maxEnemies=Math.max(maxEnemies,run.state.enemies.length);
  if(tick%45===0){const t=performance.now();const snap=run.snapshot();const result=store.act({type:'checkpoint',snapshot:snap},Math.round(tick/60*1000));check.push(performance.now()-t);if(!result.ok)throw Error(JSON.stringify(result));}
 }
 sizes.push({round,time:run.state.time,phase:run.state.phase,maxEnemies,saveBytes:Buffer.byteLength([...map.values()][0])});
}
const stats=a=>{a.sort((x,y)=>x-y);return {n:a.length,p50:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],p99:a[Math.floor(a.length*.99)],max:a.at(-1)}};
console.log(JSON.stringify({node:process.version,cpu:os.cpus()[0].model,platform:process.platform,scope:'Node pure-logic floor1 stationary fresh save; in-memory storage; no rendering or device I/O; includes cold samples',advanceMs:stats(samples),snapshotAndCheckpointMs:stats(check),runs:sizes,writes},null,2));
