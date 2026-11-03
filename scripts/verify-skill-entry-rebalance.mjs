// Equal-SP fixed fixtures. Real combat, no combat stat overrides or player saves.
import assert from 'node:assert/strict'
import {readFileSync,writeFileSync,mkdirSync,readdirSync} from 'node:fs'
import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
import {createHash} from 'node:crypto'
import {steerMechanics} from './verify-monster-mechanics-balance.mjs'
const option=(key,fallback)=>process.argv.find(a=>a.startsWith(`--${key}=`))?.slice(key.length+3)??fallback
const root=resolve(option('root','.')),label=option('label','after'),suite=option('suite','late')
const out=resolve('reports/skill-entry-rebalance-2026-11-03')
const load=name=>import(pathToFileURL(resolve(root,`js/xianxia/${name}.js`)))
const {TowerRun,stats,validateTowerSnapshot}=await load('TowerRun')
const {TowerCampaignStore,combatLoadout,TOWER_CAMPAIGN_KEY}=await load('TowerCampaign')
const {growthSummary}=await load('TowerGrowth')
const {cultivationLevelXp}=await load('TowerProfile')
const {rollWeapon,createFixedWeapon,createIronWeapon}=await load('TowerWeapons')
const {rollEquipment,createBasicEquipment}=await load('TowerEquipment')
const {checksum}=await load('Checksum')
const hash=()=>Object.fromEntries(readdirSync(resolve(root,'js/xianxia')).filter(f=>f.endsWith('.js')).sort()
 .map(f=>[f,createHash('sha256').update(readFileSync(resolve(root,'js/xianxia',f))).digest('hex')]))
const hashes=hash(),rows=[],fixtures=[]
const seeds=option('seeds','101,211,307').split(',').map(Number)
const definitions=suite==='entry'?[
 {name:'arc',skills:{sj_arc:2}},
 {name:'mixed',skills:{sj_arc:1,sj_yujian:1}},
 {name:'bone',skills:{sj_arc:1,sj_bone:1}},
]:suite==='early'?[
 {name:'qi',skills:{sj_arc:6,sj_heart:1,vajra:1}},
 {name:'yujian-mixed',skills:{sj_yujian:3,sj_arc:3,sj_heart:1,vajra:1}},
 ...(option('candidate','no')==='yes'?[{name:'yujian-specialized',skills:{sj_yujian:6,sj_heart:1,vajra:1}}]:[]),
]:[
 {name:'qi',skills:{sj_line:10,sj_arc:10},evo:{evo_tiandi:2}},
 {name:'yujian',skills:{sj_yujian:10,sj_shadow:10},evo:{evo_wanjian:2}},
 {name:'formation',skills:{sj_formation:10,sj_wanjian:6},evo:{evo_sixiang:2}},
]
function fixture(def,mark){
 let raw=null
 const disk={getItem:k=>k===TOWER_CAMPAIGN_KEY?raw:null,setItem:(k,v)=>{raw=v}}
 let store=new TowerCampaignStore(disk,0);store.act({type:'sync'},0)
 const env=JSON.parse(raw),early=suite!=='late',entry=suite==='entry'
 const state={...structuredClone(store.state),skillsInitialized:true,skills:{},xp:cultivationLevelXp(entry?2:early?7:30),
  clearedFloor:entry?0:early?1:9,researchPurchases:early?0:3,spiritStones:20000}
 const weapon=entry?createIronWeapon():early?rollWeapon('fa',2,()=>0,'weapon-1'):createFixedWeapon(option('weapon','eq_sword_xiaohan'),'weapon-1')
 const armor=entry?createBasicEquipment('armor'):rollEquipment('armor',early?'fa':'ling',2,()=>0,'gear-1')
 const ring=entry?createBasicEquipment('ring'):rollEquipment('ring',early?'fa':'ling',2,()=>0,'gear-2')
 state.weapons[weapon.id]=weapon;state.weaponCounters[weapon.id]=0;state.weaponSequence=1;state.equipmentSequence=2
 for(const item of [armor,ring]){state.equipment[item.id]=item;if(item.category==='ring')state.equipmentCounters[item.id]=0}
 Object.assign(state.loadouts[0],{weaponId:weapon.id,armorId:armor.id,ringId:ring.id,active:[],passive:[],evolutions:[]})
 env.data=JSON.stringify(state);env.checksum=checksum(env.data);raw=JSON.stringify(env)
 store=new TowerCampaignStore(disk,0);assert.equal(store.readOnly,false)
 const skills={...(early?{}:{sj_spirit:3,sj_bone:4,sj_heart:4,vajra:4,sj_flight:1}),...def.skills,...(mark?{sj_mark:mark}:{})}
 for(const [id,rank] of Object.entries({...skills,...def.evo}))
  for(let i=0;i<rank;i++){const result=store.act({type:'learnSkill',id},0);assert.equal(result.ok,true,`${def.name} ${id}: ${result.reason}`)}
 assert.deepEqual(new TowerCampaignStore(disk,0).state,store.state)
 const points=growthSummary(store.state);assert.equal(points.spent,entry?2:early?8:50+mark*2)
 const loadout=combatLoadout(store.state)
 return {name:def.name,mark,points,xp:store.state.xp,floor:entry?1:early?2:9,loadout,skills,books:store.state.books}
}
function play(f,seed){
 const run=new TowerRun({attemptId:1,floor:f.floor,seed,xp:f.xp,hp:stats(f.xp,f.loadout).maxHp,loadout:f.loadout,arenaVersion:1})
 assert.equal(run._playtestAssist,false)
 const encounters=new Map();let seen=new Set(),received=0,checks=0,nextCheck=15,firstKill=null
 const maxSeconds=Number(option('seconds','1200'))
 while(run.state.phase==='playing'&&run.state.time<maxSeconds){
  const s=run.state,p=s.player;run.setViewport({xmin:p.x-560,xmax:p.x+560,ymin:p.y-315,ymax:p.y+315})
  steerMechanics(run);run.advance(1/60)
  for(const e of s.enemies)if(['elite','boss'].includes(e.role)&&!e.temporary){
   if(!encounters.has(e.id))encounters.set(e.id,{id:e.id,role:e.role,spawnAt:s.time,firstDamage:null,deadAt:null})
   if(e.hp<e.maxHp)encounters.get(e.id).firstDamage??=s.time
  }
  for(const k of s.killLedger){firstKill??=s.time;const e=encounters.get(k.id);if(e)e.deadAt??=s.time}
  const next=new Set();for(const fx of s.effects){next.add(fx.id);if(!seen.has(fx.id)&&fx.kind==='player_hit')received+=fx.damage||0}seen=next
  if(s.time>=nextCheck){assert.ok(validateTowerSnapshot(run.snapshot()),`snapshot ${f.name} ${s.time}`);checks++;nextCheck+=15}
 }
 assert.ok(validateTowerSnapshot(run.snapshot()))
 const s=run.state
 return {name:f.name,mark:f.mark,seed,spent:f.points.spent,outcome:s.phase==='playing'?'timeout':s.phase,
  seconds:s.time,firstKill,clearedWaves:s.clearedWaves.length,kills:s.killLedger.length,
  hp:s.player.hp,maxHp:s.player.maxHp,received,snapshotChecks:checks,
  encounters:[...encounters.values()].map(e=>({...e,damageToDeath:e.deadAt&&e.firstDamage?e.deadAt-e.firstDamage:null}))}
}
mkdirSync(out,{recursive:true})
const flush=complete=>writeFileSync(resolve(out,`${suite}-${label}.json`),JSON.stringify({
 method:'Fixed attainable skill fixtures purchased through in-memory Campaign; same gear, SP, floor and seeds. Gear/resources supplied for calibration, not an acquisition simulation. 60Hz real AI, movement-only bot, failures/timeouts retained. Does not estimate human win rates.',
 complete,suite,label,hashes,fixtures,rows},null,2))
for(const def of definitions)for(const mark of suite!=='late'?[0]:option('marks','0,1,4').split(',').map(Number)){
 const f=fixture(def,mark);fixtures.push(f)
 for(const seed of seeds){const row=play(f,seed);rows.push(row);flush(false);console.log(JSON.stringify({name:row.name,mark,seed,outcome:row.outcome,seconds:Math.round(row.seconds),kills:row.kills}))}
}
assert.deepEqual(hash(),hashes,'Source changed during audit')
flush(true)
