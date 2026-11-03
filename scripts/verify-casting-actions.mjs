// Controlled stationary-target comparison of the approved action-clock changes.
// Not a campaign win-rate or progression test. Only the three archived combat
// modules differ; all other data is the current shared workspace version.
import {mkdtempSync,cpSync,copyFileSync,writeFileSync,rmSync,readFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {createHash} from 'node:crypto'
import {TowerRun} from '../js/xianxia/TowerRun.js'
import {createIronWeapon} from '../js/xianxia/TowerWeapons.js'
const root=fileURLToPath(new URL('../',import.meta.url))
const report=join(root,'reports/casting-actions-2026-11-01')
const temp=mkdtempSync(join(tmpdir(),'casting-comparison-'))
const modules=['TowerRun.js','TowerAttackActions.js','TowerSkillTiming.js']
const all={sj_yujian:10,sj_arc:10,sj_cross:10,sj_wanjian:10,sj_line:10,sj_shadow:10,sj_formation:10}
const builds=[...['sj_arc','sj_line','sj_formation','sj_yujian','sj_wanjian'].map(id=>({name:id,active:{[id]:10},evolutions:{}})),
 {name:'mixed',active:all,evolutions:{}},
 {name:'mixed-evolved',active:all,evolutions:{evo_wanjian:2,evo_wuwo:2,evo_tiandi:2,evo_sixiang:2}}]
function sample(Type,build,seed){
 const weapon=createIronWeapon()
 const r=new Type({attemptId:1,floor:1,seed,hp:100,xp:0,training:true,loadout:{growthVersion:1,skillsInitialized:true,
 active:build.active,passive:{},evolutions:Object.keys(build.evolutions),evolutionLevels:build.evolutions,tutorialWaves:0,
 weapon,weaponId:weapon.id,weaponQuality:weapon.quality,weaponRefine:0,weaponFocusCount:0}})
 const s=r.state;Object.assign(s.player,{x:0,y:0})
 const enemy={id:'probe',hp:1e12,x:85,y:0,radius:22,woundBudget:0,woundUntil:0,orbitNextAt:0}
 s.enemies=[enemy];const damage={},starts={};let firstDamage=null
 for(let i=0;i<3600;i++){
  s.ticks=i;s.time=i/60;const outgoing=[]
  r._skills(outgoing,event=>{if(event.pulseIndex===1)starts[event.skill]=(starts[event.skill]||0)+1},s.player)
  r._projectiles([],outgoing,s.player);r._zones([],outgoing)
  for(const hit of outgoing){const hp=enemy.hp;r._damageEnemy(hit);const dealt=hp-enemy.hp;if(dealt>0){firstDamage??=s.time;damage[hit.source]=(damage[hit.source]||0)+dealt}}
  s.effects=[];r._pruneWeaponState()
 }
 return {dps:Object.values(damage).reduce((a,b)=>a+b,0)/60,firstDamage,damage,starts}
}
try{
 cpSync(join(root,'js'),join(temp,'js'),{recursive:true})
 writeFileSync(join(temp,'package.json'),' {"type":"module"}')
 for(const name of modules)copyFileSync(join(report,'before',name),join(temp,'js/xianxia',name))
 const {TowerRun:Before}=await import(pathToFileURL(join(temp,'js/xianxia/TowerRun.js')).href)
 const rows=builds.map(build=>{
  const samples=Array.from({length:10},(_,i)=>{const seed=419+i;return {seed,before:sample(Before,build,seed),after:sample(TowerRun,build,seed)}})
  const mean=key=>samples.reduce((sum,s)=>sum+s[key].dps,0)/samples.length
  return {build,meanDpsBefore:mean('before'),meanDpsAfter:mean('after'),ratio:mean('after')/mean('before'),samples}
 })
 const hashes=Object.fromEntries(modules.map(name=>[name,createHash('sha256').update(readFileSync(join(root,'js/xianxia',name))).digest('hex')]))
 writeFileSync(join(report,'stationary-comparison.json'),JSON.stringify({method:'60 seconds, 60Hz, 10 seeds, stationary 85px target with 1e12 HP, iron sword, XP0, no passives; synthetic builds, damage/HP validation intentionally bypassed. Before replaces only three archived modules, keeping other current shared data. No progression, acquisition or human-playability verdict.',hashes,rows},null,2))
 for(const row of rows)console.log(`${row.build.name}: ${row.meanDpsBefore.toFixed(2)} -> ${row.meanDpsAfter.toFixed(2)} (${((row.ratio-1)*100).toFixed(1)}%)`)
}finally{rmSync(temp,{recursive:true,force:true})}
