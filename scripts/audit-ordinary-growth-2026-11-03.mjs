// Audit-only copy: cap equipped/crafted gear at q3; same earned resources and RNG.
import {canUseEquipmentTier} from '../js/xianxia/TowerEquipmentTiers.js'
import {mixedTopItems} from '../js/xianxia/TowerMixedDraw.js'
// Real Campaign transactions, finite earned resources and movement-only combat.
// Run one route per process. Fixed fixtures belong to verify-monster-mechanics-balance.
import assert from 'node:assert/strict'
import {mkdirSync,writeFileSync,readFileSync,readdirSync,existsSync} from 'node:fs'
import {dirname} from 'node:path'
import {EQUIPMENT_ROSTER} from '../js/xianxia/TowerEquipmentRoster.js'
import {FORGING_RECIPES,forgingQuote,createForgedGear} from '../js/xianxia/TowerForging.js'
import {createHash} from 'node:crypto'
import {TowerCampaignStore,combatLoadout} from '../js/xianxia/TowerCampaign.js'
import {TowerRun,stats,validateTowerSnapshot} from '../js/xianxia/TowerRun.js'
import {cultivationAt,ZHUJI_FULL_XP,CAMP_PILLS} from '../js/xianxia/TowerProfile.js'
import {growthSummary,GROWTH_RESEARCH} from '../js/xianxia/TowerGrowth.js'
import {planNaturalGrowth} from './lib/tower-natural-growth.mjs'
import {DEFAULT_GROWTH_POLICY,pursuitGrowthPriorities} from './lib/tower-natural-growth-policies.mjs'
import {naturalEquipmentScore} from './lib/tower-natural-equipment.mjs'
import {weaponFlatAttack,weaponDamageModifiers} from '../js/xianxia/TowerWeapons.js'
import {armorModifiers,ringDamageModifiers,ringCooldownReduction} from '../js/xianxia/TowerEquipment.js'
import {steerMechanics} from './verify-monster-mechanics-balance.mjs'
const option=(key,fallback)=>process.argv.find(a=>a.startsWith(`--${key}=`))?.slice(key.length+3)??fallback
const route=option('route','qi'),alchemyRoute=option('alchemy','mixed'),seed=Number(option('seed','101')),maxAttempts=Number(option('attempts','8'))
const ordinaryControl=option('operation','good');
const drawMode=option('draw','early'); const reserveMode=option('reserve','standard')
const buyResearch=option('research','none')==='all'
const growthPolicy=option('growth-policy',DEFAULT_GROWTH_POLICY)
assert.ok(['legacy','split'].includes(growthPolicy),'known growth policy')
const output=option('output',`design/balance/alchemy-natural-${alchemyRoute}-${seed}.json`)
assert.ok(!existsSync(output),`Refusing to overwrite ${output}`)
const paths=[...readdirSync('js/xianxia').filter(f=>f.endsWith('.js')).map(f=>'js/xianxia/'+f),'scripts/audit-ordinary-growth-2026-11-03.mjs','scripts/verify-monster-mechanics-balance.mjs','scripts/lib/tower-natural-growth.mjs','scripts/lib/tower-natural-growth-policies.mjs','scripts/lib/tower-natural-equipment.mjs']
const hashes=()=>Object.fromEntries(paths.map(f=>[f,createHash('sha256').update(readFileSync(f)).digest('hex')]))
const priorities={
 qi:[['sj_yujian',1],['sj_arc',3],['vajra',2],['sj_line',3],['sj_arc',6],['sj_yujian',3],['sj_bone',4],['sj_heart',4],['sj_mark',4],['sj_arc',10],['sj_line',6],['sj_yujian',10],['sj_line',10]],
 array:[['sj_yujian',1],['sj_wanjian',3],['vajra',2],['sj_formation',3],['sj_wanjian',6],['sj_bone',4],['sj_formation',6],['sj_wanjian',10],['sj_formation',10],['sj_yujian',6],['sj_heart',4],['sj_mark',4],['sj_yujian',10]],
 mixed:[['sj_yujian',1],['sj_arc',3],['sj_wanjian',3],['vajra',2],['sj_line',3],['sj_formation',3],['sj_bone',4],['sj_arc',6],['sj_wanjian',6],['sj_heart',4],['sj_mark',4],['sj_yujian',6],['sj_line',6],['sj_formation',6],['sj_arc',10],['sj_wanjian',10]],
 lance:[['sj_yujian',1],['sj_arc',3],['vajra',2],['sj_line',6],['sj_bone',4],['sj_line',10],['sj_arc',6],['sj_heart',4],['sj_mark',4],['sj_yujian',6],['sj_arc',10],['sj_yujian',10]],
 formation:[['sj_yujian',1],['sj_wanjian',3],['vajra',2],['sj_formation',6],['sj_bone',4],['sj_formation',10],['sj_wanjian',6],['sj_yujian',6],['sj_wanjian',10],['sj_heart',4],['sj_mark',4]],
 pursuit:pursuitGrowthPriorities(growthPolicy),
}
for(const key of Object.keys(priorities)) priorities[key]=priorities[key].flatMap(([id,n])=>id==='sj_yujian'&&n>=4?[['sj_spirit',Math.ceil((n-3)/3)],[id,n]]:[[id,n]])
assert.ok(priorities[route],'known route')
const evolutionRoutes={qi:['evo_wanjian'],array:['evo_wuwo'],mixed:[],lance:['evo_tiandi'],formation:['evo_sixiang'],pursuit:['evo_wanjian']}
const evolutions=evolutionRoutes[route]
let observation=null
const gainXp=TowerRun.prototype._gainXp
TowerRun.prototype._gainXp=function(amount){const before=this.state.player.xp;const result=gainXp.call(this,amount);if(observation){observation.xpOffered+=amount;observation.xpGained+=this.state.player.xp-before;observation.xpLost+=amount-(this.state.player.xp-before)}return result}
const damageEnemy=TowerRun.prototype._damageEnemy
TowerRun.prototype._damageEnemy=function(hit){const e=this.state.enemies.find(e=>e.id===hit.target),before=e?.hp??0;const value=damageEnemy.call(this,hit);if(observation&&e){const role=e.temporary?'temporary':e.role,key=hit.impact?.skill??hit.source??'unknown';observation.damage[role]??={};observation.damage[role][key]=(observation.damage[role][key]??0)+Math.max(0,before-e.hp)}return value}
const memory=new Map(),storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)}
let store=new TowerCampaignStore(storage,seed),clock=seed
const report={completed:false,breakthroughPolicy:'safe-wave-node',method:'Actual Campaign from new save; cultivation pills according to reported alchemy/draw policy, earned/starting-resource healing and breakthrough pills only, no XP/HP edits, no free books/items. Earned-material fixed-identity forging, at most one upgrade per slot per camp, healing pills, learn/refund transactions. Movement-only bot. Finite attempts with retained earned XP. Evolution inherits actual base rank; no parent refund. Not a human pass-rate estimate.',route,alchemyRoute,drawMode,reserveMode,seed,maxAttempts,realmMilestones:{},hashes:hashes(),attempts:[],transactions:[]}
report.operation=ordinaryControl;report.equipmentQualityCap=3;
report.growthPolicy=route==='pursuit'?growthPolicy:'unchanged'
report.growthPriorities=priorities[route]
mkdirSync(dirname(output),{recursive:true})
const flush=()=>writeFileSync(output,JSON.stringify(report,null,2))
function resources(){return {xp:store.state.xp,clearedFloor:store.state.clearedFloor,materials:structuredClone(store.state.materials??{}),stones:store.state.spiritStones,contribution:store.state.contribution,points:growthSummary(store.state),xp:store.state.xp,craftSequence:store.state.craftSequence,pills:{...store.state.pills}}}
function act(a){const before=resources();const result=store.act(a,clock);if(result.ok)report.transactions.push({time:clock,action:a.type,id:a.id,tier:a.tier,category:a.category,result,before,after:resources()});return result}
function learn(){
 for(const action of planNaturalGrowth(store.state,priorities[route],evolutions)){
 const result=act(action)
 if(!result.ok){
 report.failure={kind:'growth-plan-rejected',action,reason:result.reason,floor:store.state.activeRun?.snapshot.floor??store.state.clearedFloor+1,time:clock}
 writeFileSync(`${output}.campaign.json`,JSON.stringify(store.state,null,2));flush()
 }
 assert.equal(result.ok,true,`Planned growth action failed: ${JSON.stringify(action)} ${result.reason}`)
 }
}
function research(){
 if(!buyResearch)return
 for(;;){
 const row=GROWTH_RESEARCH[store.state.researchPurchases]
 if(!row||store.state.clearedFloor<row.learnClear||store.state.spiritStones<row.cost)break
 const before=growthSummary(store.state).total
 assert.equal(act({type:'researchPoint'}).ok,true)
 assert.equal(growthSummary(store.state).total,before+row.points)
 }
}
assert.ok(['none','buy','craft','mixed'].includes(alchemyRoute))
function supply(id){
 if(store.state.pills[id])return true
 if(!['none','buy'].includes(alchemyRoute)&&act({type:'craftPill',id,count:1,sequence:store.state.craftSequence+1,requestId:`natural-${alchemyRoute}-${clock}-${report.transactions.length}`}).ok)return true
 return (alchemyRoute!=='craft'||!CAMP_PILLS[id].xp)&&act({type:'buyPill',id,count:1}).ok
}
function pills(){
 const realm=cultivationAt(store.state.xp).realm
 const choices=Object.entries(CAMP_PILLS).filter(([,p])=>p.xp&&p.realm===realm).sort((a,b)=>b[1].xp-a[1].xp)
 for(let i=0;alchemyRoute!=='none'&&i<6&&!cultivationAt(store.state.xp).breakthroughReady;i++){
 let used=false
 for(const [id] of choices)if(supply(id)&&act({type:'usePill',id,confirmed:true}).ok){used=true;break}
 if(!used)break
 }
 for(let i=0;i<100&&cultivationAt(store.state.xp).breakthroughReady;i++){
 const id=store.state.xp===1800?'zhuji':'ningdan'
 if(!supply(id)||!act({type:'usePill',id}).ok)break
 }
 const current=cultivationAt(store.state.xp).realm
 if(current!=='炼气')report.realmMilestones[current]??={simulationSeconds:(clock-seed)/1000,attempts:report.attempts.length,contribution:store.state.contribution,stones:store.state.spiritStones}
}
function camp(){
 if(drawMode!=='none'){
  if(!store.state.mixedDraw.trialClaimed)assert.ok(act({type:'claimDrawTrial'}).ok)
  const level=cultivationAt(store.state.xp).level
  if(store.state.mixedDraw.tickets>=10&&(drawMode==='early'||level>=21)){
   const tier=drawMode==='early'?'fa':'ling',target=mixedTopItems(tier).find(i=>i.category==='weapon')
   assert.ok(act({type:'setMixedWish',tier,targetId:target.id}).ok)
   assert.ok(act({type:'drawMixed',tier,count:10,sequence:store.state.mixedDraw.sequence+1,requestId:`natural-draw-${seed}`}).ok)
  }
  // Consume only naturally awarded cultivation pills; never purchase extra XP here.
  for(let i=0;i<6&&!cultivationAt(store.state.xp).breakthroughReady;i++){
   const realm=cultivationAt(store.state.xp).realm
   const id=Object.keys(CAMP_PILLS).find(id=>CAMP_PILLS[id].xp&&CAMP_PILLS[id].realm===realm&&store.state.pills[id]>0)
   if(!id||!act({type:'usePill',id,confirmed:true}).ok)break
  }
 }
 pills()
 learn()
 research();learn()
 for(let i=0;i<3&&store.state.hp<stats(store.state.xp,combatLoadout(store.state)).maxHp;i++){
 if(!supply('huichun'))break
 if(!act({type:'usePill',id:'huichun'}).ok)break
 }
 if(store.state.clearedFloor>0&&!cultivationAt(store.state.xp).breakthroughReady){
 const level=cultivationAt(store.state.xp).level
 const owned=category=>Object.values(category==='weapon'?store.state.weapons:store.state.equipment).filter(i=>(category==='weapon'||i.category===category)&&i.quality<=3&&canUseEquipmentTier(i.tier,level))
 const score=(i,category)=>naturalEquipmentScore(store.state,route,i,category)
 // A new tier's lower quality is not automatically an upgrade. Forge only
 // when the recipe's average candidate beats the best owned item by 3%.
 for(const category of ['weapon','armor','ring']){
  const best=owned(category).sort((a,b)=>score(b,category)-score(a,category))[0]
  const candidates=FORGING_RECIPES.filter(r=>r.category===category&&r.quality<=3).map(r=>({r,q:forgingQuote(store.state,r.id,1,'craft')}))
   .filter(({q})=>q.ok&&store.state.contribution-q.contribution>=20&&store.state.spiritStones-q.spiritStones>=100)
   .map(row=>({...row,score:row.r.definitionIds.reduce((sum,id)=>sum+score(createForgedGear(row.r.id,'preview',id),category),0)/row.r.definitionIds.length}))
   .filter(row=>row.score>score(best,category)*1.03).sort((a,b)=>b.score-a.score)
  const choice=candidates[0]
  if(choice){const r=choice.r;assert.ok(act({type:'craftGear',id:r.id,count:1,sequence:store.state.forgeSequence+1,requestId:`growth-${route}-${seed}-${store.state.forgeSequence+1}`}).ok)}
 }
 const weapon=owned('weapon').sort((a,b)=>score(b,'weapon')-score(a,'weapon'))[0]
 assert.ok(act({type:'setLoadout',index:0,loadout:{...store.state.loadouts[0],weaponId:weapon.id}}).ok)
 for(const category of ['armor','ring']){const item=owned(category).sort((a,b)=>score(b,category)-score(a,category))[0];assert.ok(act({type:'equipEquipment',category,id:item.id}).ok)}
 }

}
let postClearRuns=0,matureRunDone=false
for(let attempt=0;attempt<maxAttempts&&(store.state.clearedFloor<9||postClearRuns<8&&!matureRunDone);attempt++){
 camp();
 if(reserveMode!=='none'&&[3,6].includes(store.state.clearedFloor)){
  const id=store.state.xp<=1800?'zhuji':store.state.xp<=6600?'ningdan':null;
  if(id)for(let n=store.state.pills[id];n<3;n++){if(!act({type:'buyPill',id,count:1}).ok)break;}
 }
 if(report.blocked)break;if(store.state.hp<stats(store.state.xp,combatLoadout(store.state)).maxHp*.5){report.blocked='Insufficient healing resources for a viable next attempt';break}const attemptStartMs=clock;
 const farmingBreakthrough=cultivationAt(store.state.xp).breakthroughReady;
 // If paid rolls exhausted the wallet, earn more contribution in an unlocked
 // floor. Do not enter and immediately abandon the next floor in a zero-time loop.
 const postClear=store.state.clearedFloor===9
 const floor=postClear?9:farmingBreakthrough?Math.max(1,store.state.clearedFloor):store.state.clearedFloor+1,start=act({type:'startFloor',floor,seed:seed+attempt});assert.equal(start.ok,true,start.reason)
 let run=TowerRun.restore(start.snapshot),previousLevel=cultivationAt(run.state.player.xp).level
 observation={damage:{},waveSeconds:{},minHpFraction:1,capSeconds:0,xpOffered:0,xpGained:0,xpLost:0}
 const entry={postClear,floor,attempt:attempt+1,xp:store.state.xp,level:previousLevel,skills:structuredClone(store.state.skills),evolutions:structuredClone(store.state.evolutionRanks),points:growthSummary(store.state),loadout:combatLoadout(store.state),hp:store.state.hp,stones:store.state.spiritStones,contribution:store.state.contribution}
 if(floor===4||floor===9){writeFileSync(`${output}.floor9-entry-${attempt+1}.json`,JSON.stringify({campaign:store.state,snapshot:start.snapshot},null,2))}
 const encounters=new Map()
 while(['playing','paused'].includes(run.state.phase)&&run.state.time<1500){
 if(run.state.phase==='paused'){
  clock=attemptStartMs+Math.floor(run.state.time*1000);
  assert.equal(act({type:'checkpoint',snapshot:run.snapshot()}).ok,true);
  for(let trial=0;trial<100&&cultivationAt(store.state.xp).breakthroughReady;trial++){
   const choices=Object.entries(CAMP_PILLS).filter(([id,p])=>p.successChance&&p.gate===store.state.xp&&store.state.pills[id]>0).sort((a,b)=>b[1].successChance-a[1].successChance);
   if(!choices.length)break;
   const result=act({type:'breakthrough',attemptId:run.state.attemptId,sequence:store.state.activeRun.snapshot.breakthrough.sequence+1,id:choices[0][0]});
   assert.equal(result.ok,true,result.reason);
   (report.breakthroughs??=[]).push({floor:run.state.floor,wave:run.state.wave,time:run.state.time,success:result.success,id:choices[0][0],xp:store.state.xp});
  }
  learn();run=TowerRun.restore(store.state.activeRun.snapshot);previousLevel=cultivationAt(run.state.player.xp).level;run.resume();
 }

 const s=run.state,p=s.player;run.setViewport({xmin:p.x-560,xmax:p.x+560,ymin:p.y-315,ymax:p.y+315});if(ordinaryControl==='good'||s.time%3<1)steerMechanics(run);else run.setInput(0,0);const beforeTime=s.time,beforeWave=s.wave;const capped=cultivationAt(p.xp).breakthroughReady;run.advance(1/60);if(capped)observation.capSeconds+=s.time-beforeTime;observation.waveSeconds[beforeWave]=(observation.waveSeconds[beforeWave]??0)+s.time-beforeTime;observation.minHpFraction=Math.min(observation.minHpFraction,p.hp/p.maxHp)
 for(const e of s.enemies)if(['elite','boss'].includes(e.role)&&!e.temporary){if(!encounters.has(e.id))encounters.set(e.id,{id:e.id,role:e.role,archetype:e.archetype,firstVisibleInRange:null,firstDamage:null,maxHp:e.maxHp,spawnAt:s.time,playerLevelAtSpawn:cultivationAt(p.xp).level,loadoutAtSpawn:structuredClone(s.loadout),playerXpAtSpawn:p.xp});const r=encounters.get(e.id);r.hp=e.hp;if(Math.abs(e.x-p.x)<=560+e.radius&&Math.abs(e.y-p.y)<=315+e.radius&&Math.hypot(e.x-p.x,e.y-p.y)<=460+e.radius)r.firstVisibleInRange??=s.time;if(e.hp<e.maxHp)r.firstDamage??=s.time}
 for(const k of s.killLedger){const r=encounters.get(k.id);if(r&&!r.deadAt){r.deadAt=s.time;r.damageToDeathSeconds=r.firstDamage===null?null:r.deadAt-r.firstDamage;r.visibleRangeToDeathSeconds=r.firstVisibleInRange===null?null:r.deadAt-r.firstVisibleInRange}}
 const level=cultivationAt(p.xp).level
 // Baseline policy: complete the floor even at the cultivation cap; break through in camp.
 if(level!==previousLevel&&s.phase==='playing'){previousLevel=level;run.pause();clock=attemptStartMs+Math.floor(s.time*1000);assert.equal(act({type:'checkpoint',snapshot:run.snapshot()}).ok,true);learn();run=TowerRun.restore(store.state.activeRun.snapshot);run.resume()}
 }
 if(run.state.phase==='playing')run.abandon()
 const snapshot=run.snapshot()
 const validSnapshot=validateTowerSnapshot(snapshot)
 if(!validSnapshot){
 writeFileSync(`${output}.invalid-snapshot.json`,JSON.stringify(snapshot,null,2))
 report.failure={kind:'invalid-terminal-snapshot',floor,time:run.state.time};flush()
 }
 assert.ok(validSnapshot);clock=attemptStartMs+Math.ceil(run.state.time*1000)
 assert.equal(act({type:'finishFloor',snapshot}).ok,true)
 const settled=structuredClone(store.state)
 assert.equal(store.act({type:'finishFloor',snapshot},clock).ok,false,'duplicate settlement cannot grant rewards')
 assert.deepEqual(store.state,settled)
 writeFileSync(`${output}.campaign.json`,JSON.stringify(store.state,null,2))
 const reloaded=new TowerCampaignStore(storage,clock);assert.equal(reloaded.readOnly,false);assert.deepEqual(reloaded.state,store.state);store=reloaded
 if(postClear){postClearRuns++;if(entry.level>=30&&run.state.phase==='won')matureRunDone=true}
 const row={...entry,observation,exitLoadout:combatLoadout(store.state),exitPoints:growthSummary(store.state),outcome:run.state.phase,seconds:run.state.time,exitLevel:cultivationAt(store.state.xp).level,hpLeft:store.state.hp,clearedWaves:run.state.clearedWaves.length,encounters:[...encounters.values()]};report.attempts.push(row);flush();console.log(route,floor,row.outcome,Math.round(row.seconds),row.exitLevel)
}
if(store.state.clearedFloor===9){research();learn()}
report.completed=true;report.matureRunDone=matureRunDone;report.postClearRuns=postClearRuns;report.repeatedFloorAttempts=report.attempts.filter((row,i,all)=>all.slice(0,i).some(prev=>prev.floor===row.floor)).length;report.realmTimingAssessment=Object.keys(report.realmMilestones).length?'Only observed realms timed; unreached realms NOT ASSESSED — NO DATA':'NOT ASSESSED — NO DATA: no realm reached within finite attempt budget';report.clearedFloor=store.state.clearedFloor;report.sourceStable=JSON.stringify(report.hashes)===JSON.stringify(hashes());report.final={xp:store.state.xp,level:cultivationAt(store.state.xp).level,points:growthSummary(store.state),stones:store.state.spiritStones,contribution:store.state.contribution,skills:store.state.skills,evolutions:store.state.evolutionRanks,researchPurchases:store.state.researchPurchases};flush()

writeFileSync(`${output}.final-campaign.json`,JSON.stringify(store.state,null,2));
