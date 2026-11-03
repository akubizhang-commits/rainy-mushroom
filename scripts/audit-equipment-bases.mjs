import {mkdirSync,writeFileSync} from 'node:fs'
import {EQUIPMENT_ROSTER} from '../js/xianxia/TowerEquipmentRoster.js'
import {equipmentBaseAttributes} from '../js/xianxia/TowerEquipmentBases.js'
import {equipmentTier} from '../js/xianxia/TowerEquipmentTiers.js'
import {cultivationLevelXp} from '../js/xianxia/TowerProfile.js'
import * as weapons from '../js/xianxia/TowerWeapons.js'
import * as gear from '../js/xianxia/TowerEquipment.js'
import * as combat from '../js/xianxia/TowerRun.js'
import * as oldWeapons from '../reports/equipment-base-attributes-2026-11-02/before/js/xianxia/TowerWeapons.js'
import * as oldGear from '../reports/equipment-base-attributes-2026-11-02/before/js/xianxia/TowerEquipment.js'
import * as oldCombat from '../reports/equipment-base-attributes-2026-11-02/before/js/xianxia/TowerRun.js'
const out=new URL('../reports/equipment-base-attributes-2026-11-02/',import.meta.url)
mkdirSync(out,{recursive:true})
const APIs=[{weapons:oldWeapons,gear:oldGear,combat:oldCombat},{weapons,gear,combat}]
const make=(api,d)=>d.category==='weapon'?api.weapons.createFixedWeapon(d.id,d.quality?d.id:'iron')
  :api.gear.createFixedEquipment(d.id,d.quality?d.id:`basic-${d.category}`)
function loadout(api,defs,active={sj_line:1}){
  const items=Object.fromEntries(defs.map(d=>[d.category,make(api,d)]))
  items.weapon??=api.weapons.createIronWeapon()
  return {growthVersion:1,skillsInitialized:true,active,passive:{},evolutions:[],evolutionLevels:{},tutorialWaves:0,
    ...items,weaponQuality:items.weapon.quality,weaponRefine:0,weaponFocusCount:0,
    ...Object.fromEntries(Object.entries(items).map(([k,v])=>[`${k}Id`,v.id]))}
}
const rows=EQUIPMENT_ROSTER.map(d=>({...d,baseAttributes:equipmentBaseAttributes(d)}))
const legal=[],matched=[],regressions=[],dominance=[]
for(const d of EQUIPMENT_ROSTER.filter(d=>d.quality)){
  for(let level=equipmentTier(d.tier).minLevel;level<=30;level++){
    const xp=cultivationLevelXp(level),l=loadout(APIs[1],[d]),s=combat.stats(xp,l)
    const empty=combat.stats(xp,loadout(APIs[1],[]))
    legal.push({id:d.id,level,physicalAttackRatio:s.attack/empty.attack,magicAttackRatio:s.magicAttack/empty.magicAttack,
      hpRatio:s.maxHp/empty.maxHp,awarenessBonus:s.awareness-empty.awareness,
      physicalDefense:combat.characterCombatAttributes(l,xp).physicalDefense,
      magicDefense:combat.characterCombatAttributes(l,xp).magicDefense})
  }
}
// Isolated authored stat axes; dominance here is not a proof of encounter dominance.
for(const category of ['weapon','armor','ring'])for(const tier of ['fa','bao','ling'])for(let q=1;q<=4;q++){
  const ds=rows.filter(d=>d.category===category&&d.tier===tier&&d.quality===q)
  const vector=d=>{
    const s=d.category==='weapon'?weapons.weaponSummary(make(APIs[1],d)):gear.equipmentSummary(make(APIs[1],d))
    return {...s.baseAttributes,...Object.fromEntries(s.affixes.map(a=>[`${a.type}:${a.target??''}`,a.value]))}
  }
  for(const a of ds)for(const b of ds)if(a.id!==b.id){
    const x=vector(a),y=vector(b),keys=[...new Set([...Object.keys(x),...Object.keys(y)])]
    if(keys.every(k=>(x[k]??0)>=(y[k]??0))&&keys.some(k=>(x[k]??0)>(y[k]??0)))dominance.push({better:a.id,worse:b.id})
  }
}
for(const category of ['weapon','armor','ring'])for(const tier of ['fa','bao','ling']){
  for(let q=2;q<=4;q++){
    const previous=rows.filter(d=>d.category===category&&d.tier===tier&&d.quality===q-1)
    const next=rows.filter(d=>d.category===category&&d.tier===tier&&d.quality===q)
    const budget=d=>['strength','intelligence','awareness'].reduce((n,k)=>n+(d.baseAttributes[k]??0),0)
    if(Math.min(...next.map(budget))<=Math.max(...previous.map(budget)))
      regressions.push({category,tier,quality:q,kind:'primary-point-budget'})
  }
}
// Thirty seconds of real action scheduling against one stationary, immortal
// authored target. Attack callbacks, cast timings, weapon rolls and crits run.
// Incoming damage disabled: this measures static damage, not survival/win rate.
function sample(api,defs,xp,skill){
  const l=loadout(api,defs,skill?{[skill]:1}:{})
  const run=new api.combat.TowerRun({attemptId:1,floor:9,seed:41,xp,hp:100,training:true,loadout:l})
  for(const id of Object.keys(l.active))run.state.cooldowns[id]=1000
  for(let i=0;i<600&&!run.state.enemies.length;i++)run.advance(1/60)
  const enemy=run.state.enemies[0]
  if(!enemy)throw Error('No authored training target')
  run.state.enemies=[enemy]
  run.state.pending=[];run.state.reserved=[];run.state.projectiles=[];run.state.zones=[]
  enemy.ai.graceUntil=1e9;enemy.x=run.state.player.x+70;enemy.y=run.state.player.y
  enemy.hp=enemy.maxHp=1e9
  // Hold the other scheduling streams; only this target is part of this sample.
  run.state.enemies.forEach(e=>{e.ai.graceUntil=1e9})
  if(skill)run.state.cooldowns[skill]=0
  let damage=0
  for(let i=0;i<1800;i++){
    const before=enemy.hp
    run.advance(1/60)
    if(run.state.phase!=='playing'||run.state.enemies.length!==1)throw Error('Static target fixture changed')
    damage+=before-enemy.hp
    enemy.x=run.state.player.x+70;enemy.y=run.state.player.y
  }
  return {damage,dps:damage/30,stats:api.combat.stats(xp,l)}
}
for(const tier of ['fan','fa','bao','ling'])for(let q=1;q<=(tier==='fan'?1:4);q++)for(const martial of [true,false]){
  if(tier==='fan'&&!martial)continue
  const role=category=>tier==='fan'?'transition':q===4?(martial?'graduate':'master')
    :category==='weapon'?(martial?'qi':'formation'):category==='armor'?(martial?'guard':'recovery'):(martial?'burst':'cadence')
  const defs=['weapon','armor','ring'].map(category=>EQUIPMENT_ROSTER.find(d=>d.category===category&&d.tier===tier&&d.quality===q&&d.role===role(category)))
  const level=equipmentTier(tier).minLevel,xp=cultivationLevelXp(level)
  for(const skill of [null,'sj_line','sj_shadow']){
    const before=sample(APIs[0],defs,xp,skill),after=sample(APIs[1],defs,xp,skill)
    matched.push({tier,quality:q,martial,level,skill:skill??'basic_attack',ids:defs.map(d=>d.id),
      beforeDps:before.dps,afterDps:after.dps,ratio:after.dps/before.dps,
      beforeHp:before.stats.maxHp,afterHp:after.stats.maxHp,
      hpRatio:after.stats.maxHp/before.stats.maxHp})
  }
}
const summary={identities:rows.length,legalCases:legal.length,matchedCases:matched.length,
  minimumDpsRatio:Math.min(...matched.map(r=>r.ratio)),maximumDpsRatio:Math.max(...matched.map(r=>r.ratio)),
  maximumHpRatio:Math.max(...matched.map(r=>r.hpRatio)),regressions,dominance,
  targets:{defenseReference:1000,vitalityHp:10,primaryBudgetMonotonic:true},
  limitations:['New absolute primary-stat/HP/DPS target ranges absent; numbers not certified balanced.',
    'Static single-target DPS includes basic attacks alongside the selected spell; not encounter TTK.',
    'Natural progression/win rates/economy not assessed in this audit.']}
writeFileSync(new URL('balance.json',out),JSON.stringify({summary,rows,legal,matched},null,2)+'\n')
console.log(JSON.stringify(summary,null,2))
