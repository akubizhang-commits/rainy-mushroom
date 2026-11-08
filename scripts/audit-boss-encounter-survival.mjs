// Actual mixed boss AI, ordinary attacks, adds, cooldowns and regeneration.
// Player does not dodge or damage enemies: this measures standing-still risk,
// not normal clear time, human win rate, or a count of fully eaten major casts.
import fs from 'node:fs'
import {dirname} from 'node:path'
import {TowerRun,stats} from '../js/xianxia/TowerRun.js'
import {cultivationLevelXp} from '../js/xianxia/TowerProfile.js'
import {FLOORS} from '../js/xianxia/TowerContent.js'
import {loadout} from './audit-boss-skill-survival.mjs'
const output=process.argv.find(a=>a.startsWith('--output='))?.slice(9)??'reports/boss-defense-2026-11-04/encounters.json'
const levels=[3,7,10,13,17,20,22,26,29],rows=[]
for(const floor of [1,2,3,4,5,6,7,8,9])for(const bossHpFraction of [1,.4,.1])for(const quality of (floor===1?[0]:[2,4])){
 const level=levels[floor-1],l=loadout(level,quality),xp=cultivationLevelXp(level),p=stats(xp,l)
 const r=new TowerRun({attemptId:1,floor,seed:101,xp,hp:p.maxHp,loadout:l,arenaVersion:1})
 const s=r.state
 s.wave=20;s.pending=[];s.reserved=[];s.enemies=[];s.projectiles=[];s.zones=[]
 s.player.x=33;s.player.y=-60
 const boss=r._enemy({id:'audit-boss',archetype:FLOORS[floor-1].boss_id,x:150,y:-60})
 boss.hp=boss.maxHp*bossHpFraction;s.enemies=[boss]
 r._spawn=()=>{};r._damageEnemy=()=>{}
 let hits=0,damage=0
 const effect=r._effect.bind(r)
 r._effect=(kind,x,y,radius,extra)=>{
  if(kind==='player_hit'){hits++;damage+=extra.damage}
  return effect(kind,x,y,radius,extra)
 }
 while(s.phase==='playing'&&s.time<180){
  r.setViewport({xmin:s.player.x-560,xmax:s.player.x+560,ymin:s.player.y-315,ymax:s.player.y+315})
  r.setInput(0,0);r.advance(1/60)
 }
 rows.push({floor,level,quality,bossHpFraction,phase:s.phase,seconds:s.time,
  hp:s.player.hp,maxHp:s.player.maxHp,hits,damage,regenerated:s.armorState.healedTotal,majorCasts:boss.mechanic.uses})
}
fs.mkdirSync(dirname(output),{recursive:true})
fs.writeFileSync(output,JSON.stringify({method:'Actual boss AI and native attacks with adds; stationary player, player damage disabled, no scheduled floor reinforcements. Boss starts at full, 40% or 10% HP to cover gated skills. 180-second survivors censored. Does not force every skill to connect.',rows},null,2)+'\n')
for(const row of rows)console.log(row.floor,row.quality,row.bossHpFraction,row.phase,row.seconds.toFixed(1),row.hits)
