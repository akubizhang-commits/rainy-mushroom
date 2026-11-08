// Real mechanic event traces fed through real incoming-hit / healing resolution.
// Fixed full-hit controls, not natural player movement or a win-rate simulation.
import fs from 'node:fs'
import {dirname,resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
import {TowerRun,stats} from '../js/xianxia/TowerRun.js'
import {ARCHETYPES,FLOORS} from '../js/xianxia/TowerContent.js'
import {initializeMonsterMechanics,tickMonsterMechanics} from '../js/xianxia/TowerMonsterMechanics.js'
import {ENEMY_INCOMING_DAMAGE_MULTIPLIER,towerEnemyStats} from '../js/xianxia/TowerEnemyStats.js'
import {cultivationLevelXp} from '../js/xianxia/TowerProfile.js'
import {createFixedEquipment,createBasicEquipment,equipmentDefenses,equipmentDamageMultiplier} from '../js/xianxia/TowerEquipment.js'
import {createIronWeapon} from '../js/xianxia/TowerWeapons.js'
import {EQUIPMENT_ROSTER} from '../js/xianxia/TowerEquipmentRoster.js'
const option=(key,d)=>process.argv.find(a=>a.startsWith(`--${key}=`))?.slice(key.length+3)??d
const output=option('output','reports/boss-defense-2026-11-04/baseline.json')
const levels=[3,7,10,13,17,20,22,26,29]
const skills={1:['M06'],3:['M10','M11'],4:['M08','M12'],5:['M16','M11'],6:['M07','M09'],7:['M06','M07'],8:['M15','M19'],9:['M06','M19']}
export function trace(floor,id,archetypeId=FLOORS[floor-1].boss_id){
 const a=ARCHETYPES.find(a=>a.id===archetypeId),authored=towerEnemyStats(a,floor,20)
 const s={time:0,floor,wave:20,arenaVersion:1,player:{x:33,y:-60,radius:18,moveSpeed:220},enemies:[],projectiles:[],zones:[],
  monsterMechanics:{version:1,zones:[],sequence:0,nextMajorAt:0}}
 const run={state:s,_visible:()=>true}
 const e={id:'actor',archetype:a.id,family:a.species,role:a.role,rank:a.rank,x:150,y:-60,radius:a.role==='boss'?42:34,
  hp:(id==='M11'||id==='M19')?4e5:1e6,maxHp:1e6,damage:authored.damage,ai:{attack:null,mode:'approach',entryUntil:0,eligibleSince:-1}}
 s.enemies=[e];initializeMonsterMechanics(run,e)
 Object.assign(e.mechanic,{skills:[id],cooldowns:{[id]:0},uses:{[id]:0}})
 const events=[];let started=false
 for(let frame=1;frame<=1800;frame++){
  s.time=frame/60
  const zone=s.monsterMechanics.zones.find(z=>z.damage>0)
  if(zone){
   if(['M06','M09'].includes(id)){s.player.x=e.x;s.player.y=e.y}
   else if(zone.shape==='sector'){s.player.x=zone.x+20*(zone.faceX||1);s.player.y=zone.y+20*(zone.faceY||0)}
   else if(zone.shape==='ring'){s.player.x=zone.x+Math.max(1,(zone.radius+zone.innerRadius)/2);s.player.y=zone.y}
   else {s.player.x=zone.x;s.player.y=zone.y}
  }
  const incoming=[];tickMonsterMechanics(run,incoming)
  if(e.mechanic.uses[id])started=true
  for(const hit of incoming)events.push({frame,damage:hit.damage,damageType:hit.damageType})
  if(started&&e.mechanic.phase==='idle'&&!s.monsterMechanics.zones.length)break
 }
 if(!events.length)throw Error(`No full-hit trace: floor ${floor} ${id}`)
 const accepted=[]
 for(const event of events)if(!accepted.length||event.frame-accepted.at(-1).frame>=36)accepted.push(event)
 return {floor,id,archetype:archetypeId,role:a.role,events,accepted,periodFrames:Math.max(480,events.at(-1).frame+120)}
}
export function loadout(level,quality){
 const tier=level<4?'fan':level<11?'fa':level<21?'bao':'ling'
 const item=category=>{
  if(tier==='fan')return createBasicEquipment(category)
  const preferred=category==='armor'?(quality===4?'graduate':'guard'):(quality===4?'graduate':'guard')
  const d=EQUIPMENT_ROSTER.find(d=>d.category===category&&d.tier===tier&&d.quality===quality&&d.role===preferred)
   ??EQUIPMENT_ROSTER.find(d=>d.category===category&&d.tier===tier&&d.quality===quality)
  return createFixedEquipment(d.id,d.id)
 }
 const armor=item('armor'),ring=item('ring'),weapon=createIronWeapon()
 return {classId:'sword',growthVersion:1,skillsInitialized:true,active:{},passive:{},evolutions:[],evolutionLevels:{},tutorialWaves:0,
  weapon,weaponId:weapon.id,weaponQuality:0,weaponRefine:0,weaponFocusCount:0,armor,armorId:armor.id,ring,ringId:ring.id}
}
export function survival(t,l,level){
 const xp=cultivationLevelXp(level),p=stats(xp,l)
 const r=new TowerRun({attemptId:1,floor:t.floor,seed:101,xp,hp:p.maxHp,loadout:l,training:true})
 const events=new Map()
 for(const e of t.events)if(!events.has(e.frame)||events.get(e.frame).damage<e.damage)events.set(e.frame,e)
 let eventsDelivered=0,lastCast=0,hitsTaken=0,damageTaken=0,absorbed=0,firstCastDamage=0
 const effect=r._effect.bind(r)
 r._effect=(kind,x,y,radius,extra)=>{
  if(kind==='player_hit'){
   hitsTaken++;damageTaken+=extra.damage;absorbed+=extra.absorbed
   if(lastCast===1)firstCastDamage+=extra.damage
  }
  return effect(kind,x,y,radius,extra)
 }
 r._projectiles=function(incoming){
  const f=(this.state.ticks-1)%t.periodFrames+1,e=events.get(f)
  if(e){incoming.push({id:`skill-${this.state.ticks}`,damage:e.damage,damageType:e.damageType});eventsDelivered++;lastCast=Math.floor((this.state.ticks-1)/t.periodFrames)+1}
 }
 for(let f=0;f<12*t.periodFrames&&r.state.phase==='playing';f++){
  r.state.enemies=[];r.state.projectiles=[];r.state.zones=[]
  r.advance(1/60)
 }
 return {level,armor:l.armor.definitionId,ring:l.ring.definitionId,maxHp:p.maxHp,defenses:equipmentDefenses(l),
  castsToDeath:r.state.phase==='lost'?lastCast:null,eventsDelivered,hitsTaken,damageTaken,absorbed,firstCastDamage,seconds:r.state.time,
  finalHp:r.state.player.hp,regenerated:r.state.armorState.healedTotal,
  rawCastDamage:t.accepted.reduce((sum,e)=>sum+e.damage,0)*ENEMY_INCOMING_DAMAGE_MULTIPLIER,
  noHealCastDamage:t.accepted.reduce((sum,e)=>sum+e.damage*ENEMY_INCOMING_DAMAGE_MULTIPLIER*equipmentDamageMultiplier(l,e.damageType),0)}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(fs.realpathSync(resolve(process.argv[1]))).href){
const traces=[],rows=[],elites=[]
for(const [floorText,ids] of Object.entries(skills)){
 const floor=Number(floorText),level=levels[floor-1]
 for(const id of ids){
  const t=trace(floor,id);traces.push(t)
  for(const quality of (floor===1?[0]:[1,2,4]))rows.push({floor,id,quality,...survival(t,loadout(level,quality),level)})
 }
}
for(const f of FLOORS){
 const seen=new Set()
 for(const w of f.waves)for(const group of w.enemy_groups){
  const a=ARCHETYPES.find(a=>a.id===group.archetype)
  if(a.role!=='elite')continue
  const id=({boar:'M06',wolf:'M05',spider:'M10',crocodile:'M08',bear:'M02'})[a.species]??'M07'
  if(['M02','M05'].includes(id)||seen.has(`${id}:${a.rank}`))continue
  seen.add(`${id}:${a.rank}`)
  const level=levels[f.floor-1],t=trace(f.floor,id,a.id)
  elites.push({...t,quality:f.floor===1?0:2,...survival(t,loadout(level,f.floor===1?0:2),level)})
 }
}
fs.mkdirSync(dirname(output),{recursive:true})
fs.writeFileSync(output,JSON.stringify({method:'Forced full-hit mechanic traces, repeated at max(8 seconds, last hit + 2 seconds); actual regeneration, shield, mitigation and 0.6-second immunity. No consumables/passives/ordinary attacks. This controls repeated mistakes, not actual AI cooldowns. 12-cast survivors censored. Non-damaging utility/summon skills excluded. Elites use actual floor spawn identities at the same representative level as the floor boss.',traces,rows,elites},null,2)+'\n')
for(const r of rows)if(r.quality===2||r.floor===1)console.log(r.floor,r.id,r.castsToDeath,`castHP=${(100*r.noHealCastDamage/r.maxHp).toFixed(1)}%`)

}
