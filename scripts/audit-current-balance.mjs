// Read-only balance review. No gameplay data or saved games are modified.
import {mkdir,writeFile,readFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import assert from 'node:assert/strict'
import {checksum} from '../js/xianxia/Checksum.js'
import {GROWTH_SKILLS,GROWTH_EVOLUTIONS,rankCap,growthSummary} from '../js/xianxia/TowerGrowth.js'
import {TowerCampaignStore,combatLoadout} from '../js/xianxia/TowerCampaign.js'
import {TowerRun,stats} from '../js/xianxia/TowerRun.js'
import {FLOORS,FLOOR01,ARCHETYPES} from '../js/xianxia/TowerContent.js'
import {towerEnemyStats} from '../js/xianxia/TowerEnemyStats.js'
import {towerKillXp} from '../js/xianxia/TowerCultivationRewards.js'
import {cultivationAt} from '../js/xianxia/TowerProfile.js'
import {rollWeapon,weaponFlatAttack,weaponDamageModifiers} from '../js/xianxia/TowerWeapons.js'
const defs=Object.fromEntries([...GROWTH_SKILLS,...GROWTH_EVOLUTIONS].map(s=>[s.id,s]))
const fresh=()=>structuredClone(new TowerCampaignStore({getItem:()=>null,setItem(){}},0).state)
const xpAt=n=>30*(n-1)+15*(n-1)**2
const val=(s,k,r)=>Array.isArray(s[k])?s[k][r-1]:s[k]
const round=n=>Math.round(n*10000)/10000
const hashes={}
for(const file of ['TowerGrowth','TowerRun','TowerCampaign','TowerProfile','TowerContent','TowerWeapons','TowerEnemyStats','TowerCultivationRewards','TowerSkillForms','TowerSwordQi']) hashes[file]=createHash('sha256').update(await readFile(new URL(`../js/xianxia/${file}.js`,import.meta.url))).digest('hex')
function probe(id,rank,baseRank=10,distance=80){
 const d=defs[id],evo=d.kind==='evolution',s=fresh();s.xp=xpAt(27);s.skills={[evo?d.parent:id]:evo?baseRank:rank};s.skillsInitialized=true
 if(evo){s.evolutionRanks={[id]:rank};s.evolutions=[id]}
 const loadout=combatLoadout(s),run=new TowerRun({attemptId:1,floor:1,seed:1,xp:s.xp,hp:100,loadout,training:true})
 run.state.player.x=0;run.state.player.y=0
 const enemy={id:'audit',hp:1e9,x:distance,y:0,radius:22,woundBudget:0,woundUntil:0,orbitNextAt:0}
 run.state.enemies=[enemy];let damage=0,hits=0,first=null
 for(let frame=0;frame<7200;frame++){
  run.state.time=frame/60;const out=[]
  run._skills(out);run._projectiles([],out,run.state.player);run._zones([],out)
  for(const hit of out){const before=enemy.hp;run._damageEnemy(hit);const dealt=before-enemy.hp;damage+=dealt;if(dealt>0){hits++;first??=frame/60}}
  run.state.effects=[]
 }
 return {id,rank,distance,castRank:loadout.active[evo?d.parent:id],attack:run.state.player.attack,dps:round(damage/120),normalizedDps:round(damage/120/run.state.player.attack),hits,firstHit:first}
}
const runtime=[]
for(const d of GROWTH_SKILLS.filter(d=>d.kind==='active'))for(const rank of [1,3,6,9,10])runtime.push(probe(d.id,rank))
for(const d of GROWTH_EVOLUTIONS)for(const rank of [1,2])runtime.push(probe(d.id,rank))
const distanceProbes=[]
for(const id of ['sj_cross','sj_wanjian'])for(const rank of [6,7,9,10])for(const distance of [40,60,70,80,100,120,160,200,300])distanceProbes.push(probe(id,rank,10,distance))
let total=0;const milestones=[],floors=[];let previous=1
const archetypes=Object.fromEntries(ARCHETYPES.map(a=>[a.id,a]))
for(const floor of FLOORS){const entryXp=total;let units=0;const enemies={}
 for(const wave of floor.waves){let index=0;const roster=floor.floor===1?FLOOR01.waves[wave.wave-1].batches.flatMap(b=>b.unit_ids.map(id=>({id,archetype:b.archetype}))):[...wave.enemy_groups].sort((a,b)=>Number(archetypes[b.archetype].role==='boss')-Number(archetypes[a.archetype].role==='boss')).flatMap(g=>Array.from({length:g.count},()=>({id:`u${++index}`,archetype:g.archetype})))
 for(const u of roster){units++;total+=towerKillXp(floor.floor,wave.wave,u.id);const level=cultivationAt(Math.min(total,10920)).level;if(level>previous){milestones.push({level,floor:floor.floor,wave:wave.wave});previous=level}const a=archetypes[u.archetype],hp=towerEnemyStats(a,floor.floor,wave.wave).hp;const key=`${a.role}:${u.archetype}`;enemies[key]??={role:a.role,minHp:hp,maxHp:hp,count:0};enemies[key].minHp=Math.min(enemies[key].minHp,hp);enemies[key].maxHp=Math.max(enemies[key].maxHp,hp);enemies[key].count++}
 }
 const s=fresh();s.xp=entryXp;s.clearedFloor=floor.floor-1
 const attack=stats(entryXp,combatLoadout(s)).attack
 floors.push({floor:floor.floor,units,xp:total-entryXp,entryLevel:cultivationAt(entryXp).level,exitLevel:cultivationAt(Math.min(total,10920)).level,entryAttack:round(attack),entryPoints:growthSummary(s).total,arcCap:rankCap('sj_arc',entryXp),enemies})
}
const weaponSamples=[];let seed=191
const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296}
for(const tier of ['huang','xuan'])for(const quality of [1,2,3,4]){
 let min=Infinity,max=-Infinity,weak,strong
 for(let i=0;i<2000;i++){const w=rollWeapon(tier,quality,random,`review-${tier}-${quality}-${i}`);const damage=(100+weaponFlatAttack(w))*1.5*(1+weaponDamageModifiers(w,'sj_arc','physical').flat);if(damage<min){min=damage;weak=w}if(damage>max){max=damage;strong=w}}
 weaponSamples.push({tier,quality,arcRank1Level1Min:round(min),arcRank1Level1Max:round(max),weak,strong,level19Weak:round((100*cultivationAt(xpAt(19)).attackMultiplier+weaponFlatAttack(weak))*1.5*(1+weaponDamageModifiers(weak,'sj_arc','physical').flat)),level19Strong:round((100*cultivationAt(xpAt(19)).attackMultiplier+weaponFlatAttack(strong))*1.5*(1+weaponDamageModifiers(strong,'sj_arc','physical').flat))})
}
const starters=[]
for(const level of [1,2,3,4,7,10])for(let rank=1;rank<=Math.min(3,rankCap('sj_arc',xpAt(level)));rank++){
 const attack=100*cultivationAt(xpAt(level)).attackMultiplier+5,damage=attack*defs.sj_arc.damage[rank-1]
 starters.push({level,rank,damage:round(damage),spCost:defs.sj_arc.pointCosts.slice(1,rank).reduce((a,b)=>a+b,0),enemies:Object.entries(floors[0].enemies).map(([id,e])=>({id,hitsEarly:Math.ceil(e.minHp/damage),hitsLate:Math.ceil(e.maxHp/damage)}))})
}
const evolutionRatios=GROWTH_EVOLUTIONS.map(d=>({id:d.id,parent:d.parent,ratios:d.castRanks.map((r,i)=>round(val(defs[d.parent],'damage',r)*d.budgetMultipliers[i]/val(defs[d.parent],'damage',10)))}))
const purchases=[]
for(const d of GROWTH_EVOLUTIONS){
 const disk={raw:null,getItem(){return this.raw},setItem(k,v){this.raw=v}}
 const state=fresh();state.xp=10920;state.spiritStones=10000;state.skills={sj_arc:1,[d.parent]:10};state.books=defs[d.parent].special?[d.parent]:[]
 const data=JSON.stringify(state);disk.raw=JSON.stringify({format:'xianxia-sect-tower-campaign',schema:15,data,checksum:checksum(data)})
 const store=new TowerCampaignStore(disk,0);assert.equal(store.readOnly,false)
 const before=combatLoadout(store.state).active[d.parent],purchase=store.act({type:'learnSkill',id:d.id},0)
 assert.equal(purchase.ok,true);const after=combatLoadout(store.state).active[d.parent]
 assert.equal(new TowerCampaignStore(disk,0).readOnly,false)
 purchases.push({id:d.id,before,after,purchase})
}
const result={purchases,distanceProbes,evolutionRatios,method:'120s stationary-target real skill scheduler/projectiles/zones/damage at 60Hz; target x80 radius22 (normal wolf body radius). Max-level isolated builds, not simultaneous legal allocations. Floor XP: each floor once, no pills/repeats. Weapon samples: deterministic 2000 rolls per tier/quality, not exhaustive extrema.',hashes,runtime,floors,milestones,weaponSamples,starters}
for(const [file,hash]of Object.entries(hashes))if(createHash('sha256').update(await readFile(new URL(`../js/xianxia/${file}.js`,import.meta.url))).digest('hex')!==hash)throw Error(`Source changed during audit: ${file}`)
const out=new URL(`../docs/xianxia/reports/${process.argv.includes('--after') ? 'balance-optimization-2026-10-30' : 'current-balance-2026-10-30'}/`,import.meta.url);await mkdir(out,{recursive:true});await writeFile(new URL('audit.json',out),JSON.stringify(result,null,2))
console.log(JSON.stringify({runtime,floors: floors.map(({enemies,...f})=>({...f,enemies:Object.values(enemies)})),milestones:milestones.filter(m=>[10,19,25,27].includes(m.level)),weapons:weaponSamples.map(({weak,strong,...w})=>w),starters:starters.filter(s=>s.level<4)},null,2))
