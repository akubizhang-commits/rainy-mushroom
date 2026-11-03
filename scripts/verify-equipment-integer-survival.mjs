// Stress fixtures use real incoming damage/regen/shield ticks, not natural enemies.
import {writeFileSync} from 'node:fs'
import {TowerRun,stats} from '../js/xianxia/TowerRun.js'
import {EQUIPMENT_ROSTER} from '../js/xianxia/TowerEquipmentRoster.js'
import {createFixedEquipment,createBasicEquipment,armorModifiers} from '../js/xianxia/TowerEquipment.js'
import {createIronWeapon} from '../js/xianxia/TowerWeapons.js'
import {cultivationLevelXp} from '../js/xianxia/TowerProfile.js'
const gear=id=>createFixedEquipment(id,id)
const loadout=armor=>({growthVersion:1,skillsInitialized:true,active:{},passive:{},evolutions:[],evolutionLevels:{},tutorialWaves:0,
 weapon:createIronWeapon(),weaponId:'iron',weaponQuality:0,weaponRefine:0,weaponFocusCount:0,armor,armorId:armor.id,
 ring:createBasicEquipment('ring'),ringId:'basic-ring'})
const report={method:'EHP without healing, same level/other slots. Stress: actual TowerRun ticks; only incoming damage is injected once per second as a fraction of starting max HP, physical/magic. No enemy attacks or player movement. 600s cutoff is censored, not immortal proof.',ehp:[],stress:[]}
for(const [tier,unlock,end] of [['fa',4,10],['bao',11,20],['ling',21,30]])for(const caster of [false,true]){
 const find=q=>EQUIPMENT_ROSTER.find(d=>d.category==='armor'&&d.tier===tier&&d.quality===q&&d.role===(q===4?(caster?'master':'graduate'):(caster?'recovery':'guard')))
 const a=gear(find(1).id),b=gear(find(4).id)
 for(const level of [unlock,end]){
  const xp=cultivationLevelXp(level),pa=stats(xp,loadout(a)),pb=stats(xp,loadout(b))
  const physical=(pb.maxHp/(1-armorModifiers(b).physicalReduction))/(pa.maxHp/(1-armorModifiers(a).physicalReduction)),magic=pb.maxHp/pa.maxHp
  const expected=level===unlock?{physical:[1.35,1.90],magic:[1.20,1.55]}:{physical:[1.25,1.80],magic:[1.10,1.40]}
  report.ehp.push({tier,level,caster,from:a.definitionId,to:b.definitionId,physical,magic,expected,
   withinTargets:physical>=expected.physical[0]&&physical<=expected.physical[1]&&magic>=expected.magic[0]&&magic<=expected.magic[1]})
 }
}
for(const id of ['eq_armor_panshi','eq_armor_wuyin','eq_armor_wugou','eq_armor_chengxiao'])for(const damageType of ['physical','magic'])for(const fraction of [.01,.03,.06]){
 const l=loadout(gear(id)),xp=cultivationLevelXp(21),p=stats(xp,l)
 const run=new TowerRun({attemptId:1,floor:9,seed:101,xp,hp:p.maxHp,training:true,loadout:l})
 run._projectiles=function(incoming){if(this.state.ticks%60===0)incoming.push({id:`stress-${this.state.ticks}`,damage:p.maxHp*fraction,damageType})}
 for(let i=0;i<600*60&&run.state.phase==='playing';i++){
  run.state.enemies=[];run.state.projectiles=[];run.state.zones=[]
  run.advance(1/60)
 }
 report.stress.push({id,damageType,fraction,seconds:run.state.time,outcome:run.state.phase,hpFraction:run.state.player.hp/p.maxHp,healed:run.state.armorState.healedTotal,shield:run.state.armorState.shield??0})
}
writeFileSync(new URL('../reports/equipment-integer-v2-2026-11-03/survival.json',import.meta.url),JSON.stringify(report,null,2)+'\n')
console.log('EHP',report.ehp.length,'outside targets',report.ehp.filter(r=>!r.withinTargets).length,'stress',report.stress.length)
