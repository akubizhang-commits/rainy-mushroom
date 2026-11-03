// Real Campaign transactions, finite earned resources and movement-only combat.
// Run one route per process. Fixed fixtures belong to verify-monster-mechanics-balance.
import assert from 'node:assert/strict'
import {mkdirSync,writeFileSync,readFileSync,readdirSync,existsSync} from 'node:fs'
import {dirname} from 'node:path'
import {forgingQuote} from '../js/xianxia/TowerForging.js'
import {createHash} from 'node:crypto'
import {TowerCampaignStore,combatLoadout} from '../js/xianxia/TowerCampaign.js'
import {TowerRun,stats,validateTowerSnapshot} from '../js/xianxia/TowerRun.js'
import {cultivationAt,ZHUJI_FULL_XP} from '../js/xianxia/TowerProfile.js'
import {growthSummary,GROWTH_RESEARCH} from '../js/xianxia/TowerGrowth.js'
import {planNaturalGrowth} from './lib/tower-natural-growth.mjs'
import {weaponFlatAttack,weaponDamageModifiers} from '../js/xianxia/TowerWeapons.js'
import {armorModifiers,ringDamageModifiers,ringCooldownReduction} from '../js/xianxia/TowerEquipment.js'
import {steerMechanics} from './verify-monster-mechanics-balance.mjs'
const option=(key,fallback)=>process.argv.find(a=>a.startsWith(`--${key}=`))?.slice(key.length+3)??fallback
const route=option('route','qi'),seed=Number(option('seed','101')),maxAttempts=Number(option('attempts','18'))
const buyResearch=option('research','none')==='all'
const output=option('output',`reports/balance-fixes-2026-10-31/natural-${route}-${seed}-${Date.now()}.json`)
assert.ok(!existsSync(output),`Refusing to overwrite ${output}`)
const paths=[...readdirSync('js/xianxia').filter(f=>f.endsWith('.js')).map(f=>'js/xianxia/'+f),'scripts/verify-tower-natural-balance.mjs','scripts/verify-monster-mechanics-balance.mjs','scripts/lib/tower-natural-growth.mjs']
const hashes=()=>Object.fromEntries(paths.map(f=>[f,createHash('sha256').update(readFileSync(f)).digest('hex')]))
const priorities={
 qi:[['sj_yujian',1],['sj_arc',3],['vajra',2],['sj_line',3],['sj_arc',6],['sj_spirit',1],['sj_yujian',3],['sj_line',6],['sj_heart',4],['sj_mark',4],['sj_bone',4],['sj_arc',10]],
 array:[['sj_yujian',1],['sj_wanjian',3],['vajra',2],['sj_formation',3],['sj_wanjian',6],['sj_bone',4],['sj_formation',6],['sj_mark',4],['sj_heart',4],['sj_wanjian',10]],
 mixed:[['sj_yujian',1],['sj_arc',3],['sj_wanjian',3],['vajra',2],['sj_line',3],['sj_formation',3],['sj_bone',4],['sj_mark',4],['sj_heart',4],['sj_arc',6]],
 lance:[['sj_arc',3],['vajra',2],['sj_line',6],['sj_arc',6],['sj_line',9],['sj_bone',3],['sj_flight',1],['sj_heart',2],['sj_arc',10]],
 formation:[['sj_yujian',1],['sj_wanjian',3],['vajra',2],['sj_formation',6],['sj_wanjian',6],['sj_bone',3],['sj_flight',1],['sj_formation',9],['sj_wanjian',10]],
}
assert.ok(priorities[route],'known route')
const evolutions=route==='lance'?['evo_tiandi']:route==='formation'?['evo_sixiang']:route==='qi'?['evo_wanjian','evo_tiandi']:route==='array'?['evo_wuwo','evo_sixiang']:['evo_wanjian','evo_sixiang']
const memory=new Map(),storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)}
let store=new TowerCampaignStore(storage,seed),clock=seed
const report={method:'Actual Campaign from new save; no cultivation pills, no XP/HP edits, no free books/items. Earned-resource quality-pool equipment forging, healing pills, learn/refund transactions. Movement-only bot. Finite attempts with retained earned XP. Evolution replaces parent using normal refund. Not a human pass-rate estimate.',route,seed,maxAttempts,hashes:hashes(),attempts:[],transactions:[]}
mkdirSync(dirname(output),{recursive:true})
const flush=()=>writeFileSync(output,JSON.stringify(report,null,2))
function resources(){return {stones:store.state.spiritStones,contribution:store.state.contribution,points:growthSummary(store.state),pills:{...store.state.pills}}}
function act(a){const before=resources();const result=store.act(a,clock);if(result.ok)report.transactions.push({time:clock,action:a.type,id:a.id,tier:a.tier,category:a.category,before,after:resources()});return result}
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
function camp(){
 // The current cultivation flow requires an earned, paid breakthrough pill.
 // Record failed rolls too; never force success or grant a replacement pill.
 for(let tries=0;cultivationAt(store.state.xp).breakthroughReady&&tries<100;tries++){
  const id=store.state.xp===ZHUJI_FULL_XP?'zhuji':'ningdan'
  if(!store.state.pills[id]&&!act({type:'buyPill',id,count:1}).ok)break
  if(!act({type:'usePill',id}).ok)break
 }

 learn()
 research();learn()
 for(let i=0;i<3&&store.state.hp<stats(store.state.xp,combatLoadout(store.state)).maxHp;i++){
 if(!store.state.pills.huichun&&!act({type:'buyPill',id:'huichun',count:1}).ok)break
 if(!act({type:'usePill',id:'huichun'}).ok)break
 }
 if(store.state.clearedFloor>0&&!cultivationAt(store.state.xp).breakthroughReady){
 const level=cultivationAt(store.state.xp).level,tier=level>=21?'ling':level>=11?'bao':level>=4?'fa':'fan'
 // Preserve enough contribution for two healing purchases before forging gear.
 for(const category of ['weapon','armor']){
 const id=`${category}:${tier}:q1`,quote=forgingQuote(store.state,id,1,tier==='fan'?'buy':'craft')
 if(quote.ok&&store.state.contribution>=quote.contribution+20){
 const sequence=store.state.forgeSequence+1
 act({type:tier==='fan'?'buyGear':'craftGear',id,count:1,sequence,requestId:`natural-${sequence}`})
 }
 }
 const load=combatLoadout(store.state),attack=100*cultivationAt(store.state.xp).attackMultiplier
 const active=Object.keys(load.active)
 const wScore=w=>(attack+weaponFlatAttack(w))*(1+active.reduce((n,id)=>n+weaponDamageModifiers(w,id,['sj_wanjian','sj_formation'].includes(id)?'hybrid':'physical').flat,0)/Math.max(1,active.length))
 const weapon=Object.values(store.state.weapons).sort((a,b)=>wScore(b)-wScore(a))[0]
 act({type:'setLoadout',index:0,loadout:{...store.state.loadouts[0],weaponId:weapon.id}})
 for(const category of ['armor','ring']){
 const score=item=>{if(category==='armor'){const m=armorModifiers(item);return (1+m.hpBonus)/(1-m.reduction)+m.healFraction}const m=ringDamageModifiers(item);return (.5*m.critChance+m.critBonus+m.special*.2+1)/(1-ringCooldownReduction(item))}
 const item=Object.values(store.state.equipment).filter(i=>i.category===category).sort((a,b)=>score(b)-score(a))[0]
 act({type:'equipEquipment',category,id:item.id})}
 }

}
for(let attempt=0;attempt<maxAttempts&&store.state.clearedFloor<9;attempt++){
 camp();if(report.blocked)break;if(store.state.hp<stats(store.state.xp,combatLoadout(store.state)).maxHp*.5){report.blocked='Insufficient healing resources for a viable next attempt';break}const attemptStartMs=clock;
 const farmingBreakthrough=cultivationAt(store.state.xp).breakthroughReady;
 // If paid rolls exhausted the wallet, earn more contribution in an unlocked
 // floor. Do not enter and immediately abandon the next floor in a zero-time loop.
 const floor=farmingBreakthrough?Math.max(1,store.state.clearedFloor):store.state.clearedFloor+1,start=act({type:'startFloor',floor,seed:seed+attempt});assert.equal(start.ok,true,start.reason)
 let run=TowerRun.restore(start.snapshot),previousLevel=cultivationAt(run.state.player.xp).level
 const entry={floor,attempt:attempt+1,xp:store.state.xp,level:previousLevel,skills:structuredClone(store.state.skills),evolutions:structuredClone(store.state.evolutionRanks),points:growthSummary(store.state),loadout:combatLoadout(store.state),hp:store.state.hp,stones:store.state.spiritStones,contribution:store.state.contribution}
 const encounters=new Map()
 while(run.state.phase==='playing'&&run.state.time<1500){
 const s=run.state,p=s.player;run.setViewport({xmin:p.x-560,xmax:p.x+560,ymin:p.y-315,ymax:p.y+315});steerMechanics(run);run.advance(1/60)
 for(const e of s.enemies)if(['elite','boss'].includes(e.role)&&!e.temporary){if(!encounters.has(e.id))encounters.set(e.id,{id:e.id,role:e.role,archetype:e.archetype,firstVisibleInRange:null,firstDamage:null,maxHp:e.maxHp});const r=encounters.get(e.id);r.hp=e.hp;if(Math.abs(e.x-p.x)<=560+e.radius&&Math.abs(e.y-p.y)<=315+e.radius&&Math.hypot(e.x-p.x,e.y-p.y)<=460+e.radius)r.firstVisibleInRange??=s.time;if(e.hp<e.maxHp)r.firstDamage??=s.time}
 for(const k of s.killLedger){const r=encounters.get(k.id);if(r&&!r.deadAt){r.deadAt=s.time;r.damageToDeathSeconds=r.firstDamage===null?null:r.deadAt-r.firstDamage;r.visibleRangeToDeathSeconds=r.firstVisibleInRange===null?null:r.deadAt-r.firstVisibleInRange}}
 const level=cultivationAt(p.xp).level
 if(!farmingBreakthrough&&cultivationAt(p.xp).breakthroughReady){run.abandon();break}
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
 const row={...entry,outcome:run.state.phase,seconds:run.state.time,exitLevel:cultivationAt(store.state.xp).level,hpLeft:store.state.hp,clearedWaves:run.state.clearedWaves.length,encounters:[...encounters.values()]};report.attempts.push(row);flush();console.log(route,floor,row.outcome,Math.round(row.seconds),row.exitLevel)
}
if(store.state.clearedFloor===9){research();learn()}
report.clearedFloor=store.state.clearedFloor;report.sourceStable=JSON.stringify(report.hashes)===JSON.stringify(hashes());report.final={level:cultivationAt(store.state.xp).level,points:growthSummary(store.state),stones:store.state.spiritStones,contribution:store.state.contribution,skills:store.state.skills,evolutions:store.state.evolutionRanks,researchPurchases:store.state.researchPurchases};flush()
