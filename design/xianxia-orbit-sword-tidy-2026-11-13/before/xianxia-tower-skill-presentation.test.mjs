import {COMBAT_SKILLS} from '../js/xianxia/TowerCombatSkills.js'
import { resonanceDamageFactor } from '../js/xianxia/TowerResonance.js'
import {convergenceRainMultiplier} from '../js/xianxia/TowerSkillForms.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import { skillPresentation } from '../js/xianxia/TowerSkillPresentation.js'
import { TowerCampaignStore, combatLoadout } from '../js/xianxia/TowerCampaign.js'
import { rollWeapon, weaponDamageModifiers, weaponFlatAttack } from '../js/xianxia/TowerWeapons.js'
import { rollEquipment, validateEquipment } from '../js/xianxia/TowerEquipment.js'
import { cultivationAt, TOWER_XP_CAP } from '../js/xianxia/TowerProfile.js'
import { outgoingDamageFactor } from '../js/xianxia/TowerAttributeRules.js'
import { skillManaCost } from '../js/xianxia/TowerCharacterStats.js'
import { equipmentCastSpeed, castActionTiming } from '../js/xianxia/TowerSkillTiming.js'
import { TowerRun, stats } from '../js/xianxia/TowerRun.js'
import { GROWTH_SKILLS, GROWTH_EVOLUTIONS } from '../js/xianxia/TowerGrowth.js'
const fresh = () => JSON.parse(JSON.stringify(new TowerCampaignStore({getItem:()=>null,setItem(){}},0).state))
const equip = (s) => { const w=rollWeapon('ling',4,()=>0,'weapon-1'); s.weapons[w.id]=w; s.weaponCounters[w.id]=0; s.loadouts[0].weaponId=w.id; return w }
const value = (p,key) => p.stats.find(s=>s.key===key).value
const close = (a,b) => assert.ok(Math.abs(a-b)<1e-8, `${a} != ${b}`)
test('orbit separates duration, cast cooldown and hit interval while wuwo stays permanent',()=>{
 const s=fresh();s.skills.sj_wanjian=1
 const p=skillPresentation(s,'sj_wanjian')
 assert.equal(p.cooldown,6)
 assert.equal(value(p,'duration'),4)
 assert.equal(value(p,'hitInterval'),.6)
 assert.match(p.description,/发动.*冷却/)
 assert.equal(skillPresentation(s,'evo_wuwo').cooldown,null)
})
test('strongest current cooldown ring leaves an orbit gap without shortening duration or hit interval',()=>{
 const s=fresh();s.skills.sj_wanjian=1;s.xp=10920;s.tutorialWaves=3
 const ring=rollEquipment('ring','ling',4,()=>.999,'orbit-cdr')
 s.equipment[ring.id]=ring;s.equipmentCounters[ring.id]=0;s.loadouts[0].ringId=ring.id
 const p=skillPresentation(s,'sj_wanjian')
 close(p.cooldown,5.1);assert.equal(value(p,'duration'),4);assert.equal(value(p,'hitInterval'),.6)
 const run=new TowerRun({attemptId:1,floor:1,seed:123,hp:100,xp:s.xp,loadout:combatLoadout(s)})
 run.advance(1/60)
 const start=run.state.time, release=run.state.casts[0].releaseAt
 assert.equal(run.state.actions.orbit,null)
 run.advance(.2)
 close(run.state.orbitUntil-release,4)
 close(run.state.cooldowns.sj_wanjian-start,5.1)
 close(run.state.cooldowns.sj_wanjian-run.state.orbitUntil,5.1-4-(release-start))
})
test('all skills expose immutable UI contract, first-rank preview and actual mana costs',()=>{
 const state=fresh(), before=JSON.stringify(state)
 for(const s of [...GROWTH_SKILLS,...GROWTH_EVOLUTIONS]){
  const p=skillPresentation(state,s.id)
  assert.ok(['物理攻击','物理＋法术攻击','法术攻击','伤害类型继承','被动功法'].includes(p.category))
  assert.equal(p.manaCost,skillManaCost(s.id)); assert.ok(p.cooldown===null||p.cooldown>0)
  assert.ok(p.statLines.length);assert.ok(p.description);assert.ok(p.requirementLines[0].startsWith('角色'))
  assert.equal(p.preview,s.id!=='sj_arc');assert.equal(p.previewLevel,1)
 }
 assert.equal(JSON.stringify(state),before)
 assert.equal(skillPresentation(state,'unknown'),null)
})
test('equipment and bone affect real per-sword/round damage, crit is not guaranteed',()=>{
 const s=fresh();s.xp=10920;s.skills={sj_yujian:10,sj_bone:4,sj_heart:4};equip(s)
 const p=skillPresentation(s,'sj_yujian');close(value(p,'roundDamage'),stats(s.xp,combatLoadout(s)).attack*(1.8*1.13**7*.5)*outgoingDamageFactor(combatLoadout(s),'sj_yujian','physical',true))
 close(value(p,'swordDamage'),value(p,'roundDamage'));assert.match(p.description,/10把/)
 const run=new TowerRun({attemptId:1,floor:1,seed:123,hp:100,xp:s.xp,loadout:combatLoadout(s)})
 run.state.enemies=[{id:77,hp:10000,x:0,y:0,woundBudget:0}];run._random=()=>1
 const outgoing=[];run._releaseSkill({skill:'sj_arc',level:1,x:0,y:0,dirX:1,dirY:0},outgoing)
 // Real damage resolver uses the same equipment attack and additive bone multiplier.
 run._damageEnemy({target:77,damage:run.state.player.attack*(1.8*1.13**7*.5),direct:true,source:'sj_yujian'})
 close(run.state.effects.findLast(e=>e.kind==='hit'&&e.source==='sj_yujian').damage,value(p,'roundDamage'))
})
test('next requirements follow rank caps, stage and evolution rank not first unlock',()=>{
 const s=fresh();s.skills.sj_yujian=3
 // 85号：御剑术4级起需7级，7级起需11级。
 assert.equal(skillPresentation(s,'sj_yujian').requirementLines[0],'角色炼气 · 巅峰')
 assert.equal(skillPresentation(s,'sj_yujian').nextRequirement.characterLevel,7)
 s.skills.sj_yujian=6
 assert.equal(skillPresentation(s,'sj_yujian').requirementLines[0],'角色筑基 · 初期')
 assert.equal(skillPresentation(s,'sj_yujian').nextRequirement.characterLevel,11)
 s.evolutionRanks.evo_tiandi=1
 assert.equal(skillPresentation(s,'evo_tiandi').nextRequirement.characterLevel,27)
 assert.doesNotMatch(skillPresentation(s,'evo_tiandi').requirementLines.join(' '),/剑破虚空.*8/)
 s.evolutionRanks.evo_tiandi=2
 assert.equal(skillPresentation(s,'evo_tiandi').nextRequirement,null)
 assert.equal(skillPresentation(s,'evo_tiandi').maxed,true)
 assert.deepEqual(skillPresentation(s,'evo_tiandi').requirementLines,[])
 s.skills.sj_yujian=10;assert.equal(skillPresentation(s,'sj_yujian').maxed,true)
 assert.deepEqual(skillPresentation(s,'sj_yujian').requirementLines,[])
})
test('evolution replacement and conditional budgets retain distinct units',()=>{
 const s=fresh();s.skills={sj_yujian:6,sj_line:6,sj_wanjian:6,sj_formation:6,sj_bone:4,sj_gate:2};s.evolutionRanks={evo_wanjian:1,evo_tiandi:1,evo_wuwo:1,evo_sixiang:1}
 const y=skillPresentation(s,'evo_wanjian'),line=skillPresentation(s,'evo_tiandi'),f=skillPresentation(s,'evo_sixiang')
 assert.equal(line.cooldown,12);assert.equal(y.cooldown,.5**(5/9))
 // 85号：面板数值含主修流派共鸣。
 const res=id=>resonanceDamageFactor(combatLoadout(s),id)
 close(value(y,'rainTickDamage')*19,115*1.25*(1.8*1.13**3)*.8*convergenceRainMultiplier(1)*res('sj_yujian')) // 御剑6级×0.8
 close(value(f,'tickDamage')*16,105*1.25*COMBAT_SKILLS.find(d=>d.id==='sj_formation').damage[5]*6*2*(15/12)*res('sj_formation'))
 assert.match(skillPresentation(s,'sj_line').description,/进阶/)
 assert.equal(skillPresentation(s,'evo_wuwo').cooldown,null)
 assert.ok(skillPresentation(s,'sj_gate').stats.find(x=>x.key==='procCap').condition)
 assert.equal(skillPresentation(s,'sj_gate').cooldown,null)
})
test('liangyi and sixiang panels show their independent enlarged ranges and next-rank growth',()=>{
 for(const [rank,radius,nextRadius,nextHits] of [[2,132,144,12],[9,180,192,16]]){
  const s=fresh();s.skills.sj_formation=rank
  const p=skillPresentation(s,'sj_formation')
  assert.equal(value(p,'radius'),radius)
  assert.equal(p.currentForm.radius,radius)
  assert.equal(p.currentForm.hits,rank===2?12:16)
  assert.equal(p.nextForm.radius,nextRadius)
  assert.equal(p.nextForm.hits,nextHits)
 }
 const s=fresh();s.skills.sj_formation=10
 assert.equal(value(skillPresentation(s,'sj_formation'),'ticks'),16)
 for(const rank of [1,2]){
  s.evolutionRanks.evo_sixiang=rank
  const p=skillPresentation(s,'evo_sixiang')
  assert.equal(value(p,'radius'),rank===1?288:336)
  assert.equal(value(p,'ticks'),rank===1?16:20)
  assert.equal(p.currentForm.radius,rank===1?288:336)
  if(rank===1){
   assert.equal(p.nextForm.radius,336)
   assert.ok(p.nextFormLines.some(line=>line.includes('288')&&line.includes('336')),
    'the upgrade preview must expose its larger actual field')
  }
 }
})
test('active snapshot supplies live XP and frozen equipment, without mutating it',()=>{
 const s=fresh(); const run=new TowerRun({attemptId:1,floor:1,seed:123,hp:100,xp:1485,loadout:combatLoadout(s)})
 s.activeRun={snapshot:run.snapshot()};s.xp=10920;equip(s)
 const before=JSON.stringify(s),p=skillPresentation(s,'sj_yujian')
 close(value(p,'roundDamage'),(110*cultivationAt(1485).attackMultiplier+5)*1.2*.5); // 御剑1级×0.5assert.equal(JSON.stringify(s),before)
})
test('next-rank effects cross actual form thresholds without changing the frozen run or camp',()=>{
 const s=fresh();s.skills={sj_yujian:1,sj_arc:6,sj_line:5,sj_shadow:9,sj_formation:9,sj_wanjian:5}
 s.evolutionRanks={evo_sixiang:1}
 const run=new TowerRun({attemptId:1,floor:1,seed:123,hp:100,xp:1485,loadout:combatLoadout(s)})
 s.activeRun={snapshot:run.snapshot()};s.skills.sj_arc=9;s.skills.sj_formation=10
 s.evolutionRanks.evo_sixiang=2;s.xp=10920;equip(s)
 const before=JSON.stringify(s)
 for(const [id,current,next] of [['sj_arc',3,3],['sj_line',1,2],['sj_shadow',3,4]]){
  const p=skillPresentation(s,id)
  assert.equal(p.currentForm.hits,current,id);assert.equal(p.nextForm.hits,next,id)
  assert.equal(p.nextPreview.level,p.learnedLevel+1)
  if(current!==next) assert.ok(p.nextFormLines.some(line=>line.includes(`${current} → ${next}击`)),id)
 }
 assert.equal(skillPresentation(s,'sj_formation').maxed,false,'evolution retains the actual rank-9 base')
 assert.equal(skillPresentation(s,'sj_formation').learnedLevel,9)
 const arc=skillPresentation(s,'sj_arc')
 close(value(arc.nextPreview,'hitDamage')+value(arc.nextPreview,'arcHit2Damage')+value(arc.nextPreview,'arcHit3Damage'),value(arc,'fullDamage')*1.15)
 assert.equal(arc.learnedLevel,6,'uses the battle rank, not the higher camp rank')
 const orbit=skillPresentation(s,'sj_wanjian')
 assert.equal(orbit.currentForm.hits,null);assert.equal(orbit.nextForm.hits,null)
 // 2026-11-09 方案A：剑数 6/8/10/12，5 级 8 柄、6 级 10 柄。
 assert.equal(orbit.currentForm.swords,8);assert.equal(orbit.nextForm.swords,10)
 const evolution=skillPresentation(s,'evo_sixiang')
 assert.equal(evolution.learnedLevel,1);assert.equal(evolution.currentForm.hits,16);assert.equal(evolution.nextForm.hits,20)
 assert.equal(evolution.currentForm.radius,288,'current presentation keeps the battle evolution rank')
 assert.equal(evolution.nextForm.radius,336,'the next evolution expands the actual diamond')
 close(value(evolution.nextPreview,'tickDamage')*20,value(evolution,'fullDamage')*2.3/2.0)
 assert.equal(JSON.stringify(s),before)
 arc.nextForm.radius=9999;arc.nextPreview.stats[0].value=-1
 assert.equal(JSON.stringify(s),before,'returned predictions are detached from actual battle state')
 assert.notEqual(skillPresentation(s,'sj_arc').nextForm.radius,9999)
})
test('unchanged forms still explain the next rank, and maximum rank has no prediction',()=>{
 const s=fresh();s.skills.sj_arc=1
 const p=skillPresentation(s,'sj_arc')
 assert.equal(p.currentForm.hits,3);assert.equal(p.nextForm.hits,3)
 assert.match(p.nextFormLines.join(' '),/本级形态不变/)
 s.skills.sj_arc=10
 const max=skillPresentation(s,'sj_arc')
 assert.equal(max.nextPreview,null);assert.equal(max.nextForm,null);assert.deepEqual(max.nextFormLines,[])
})
// 2026-11-09：周天剑域（evo_wuwo）并入周天剑阵后退役。
test('all learnable evolution numbers match sampled casts and independent main-hit resolution',()=>{
 const s=fresh();s.xp=TOWER_XP_CAP;s.tutorialWaves=3
 s.skills={sj_yujian:8,sj_arc:3,sj_line:8,sj_wanjian:8,sj_formation:8,sj_heart:3,sj_bone:3,sj_gate:2}
 s.evolutionRanks={evo_wanjian:2,evo_tiandi:2,evo_sixiang:2};equip(s)
 for(const [evo,parent,key]of[['evo_wanjian','sj_yujian','rainTickDamage'],['evo_tiandi','sj_line','hitDamage'],['evo_sixiang','sj_formation','tickDamage']]){
  const loadout=combatLoadout(s);loadout.active={[parent]:8};loadout.evolutions=[evo];loadout.evolutionLevels={[evo]:2}
  const run=new TowerRun({attemptId:1,floor:1,seed:12,hp:100,xp:s.xp,loadout})
  const enemy={id:'panel',hp:1e7,x:120,y:0,radius:5,woundBudget:0,orbitNextAt:0}
  run.state.player.x=0;run.state.player.y=0;run.state.enemies=[enemy];run._random=()=>.5
  const outgoing=[];run._skills(outgoing)
  assert.ok(run.state.casts.length,evo)
  run.state.time=run.state.casts[0].releaseAt;run.state.ticks=Math.round(run.state.time*60)
  run._skills(outgoing)
  if(run.state.zones.length)run._growthZonePulse(run.state.zones[0],outgoing)
  const hit=outgoing.find(h=>h.target==='panel');assert.ok(hit,evo)
  run._damageEnemy(hit)
  const main=run.state.effects.findLast(e=>e.kind==='hit'&&e.source!=='weapon_on_hit')
  // 85号：本测试的战斗配装只保留一个流派，共鸣与完整存档不同；比较去掉共鸣后的命中。
  close(main.damage/resonanceDamageFactor(loadout,parent),value(skillPresentation(s,evo),key)/resonanceDamageFactor(combatLoadout(s),parent))
 }
})
test('requirement lines include actual book/floor costs, known books are not charged again',()=>{
 const s=fresh();let p=skillPresentation(s,'sj_formation')
 assert.deepEqual(p.requirementLines,['角色金丹 · 初期','悟道点 1','经卷 2中品灵石']) // 2026-11-09：两仪剑阵→金丹初期
 s.books=['sj_formation'];p=skillPresentation(s,'sj_formation')
 assert.ok(!p.requirementLines.some(x=>x.startsWith('经卷')))
 p=skillPresentation(s,'sj_flight');assert.deepEqual(p.requirementLines,['角色筑基 · 初期','悟道点 1'])
 s.skills.sj_flight=1;assert.equal(skillPresentation(s,'sj_flight').maxed,true)
 s.skills.vajra=2;assert.equal(skillPresentation(s,'vajra').requirementLines[0],'角色炼气 · 巅峰')
 s.skills.vajra=3;assert.equal(skillPresentation(s,'vajra').requirementLines[0],'角色筑基 · 初期')
})
test('retained investments still display the learning-stage floor on their next rank',()=>{
 const s=fresh();s.skills.vajra=1;s.skills.sj_heart=1;s.skills.sj_formation=1
 for (const [id,stage,level] of [['vajra','炼气 · 巅峰',7],['sj_heart','金丹 · 中期',24],['sj_formation','金丹 · 初期',21]]) {
  const p=skillPresentation(s,id)
  assert.equal(p.requirementLines[0],`角色${stage}`)
  assert.equal(p.nextRequirement.characterLevel,level)
  assert.equal(p.nextRequirement.reason,'stage-locked')
 }
})
test('player descriptions avoid implementation jargon and preserve damage units',()=>{
 const s=fresh()
 for(const def of [...GROWTH_SKILLS,...GROWTH_EVOLUTIONS]){
  const p=skillPresentation(s,def.id)
  assert.doesNotMatch(p.description,/账本|预算|缩放|递归|母版|母技能|damage|target|窗口|结算/)
  assert.doesNotMatch(p.statLines.join(' '),/预算|缩放/)
 }
 assert.equal(skillPresentation(s,'sj_arc').stats.find(x=>x.key==='hitDamage').label,'剑气伤害（首击）')
 assert.match(skillPresentation(s,'sj_formation').stats.find(x=>x.key==='tickDamage').label,/每脉冲/)
 assert.match(skillPresentation(s,'sj_yujian').description,/伤害已计入当前装备与被动，未计暴击/)
})
test('special affordability uses spirit stones only, at the exact book-price boundary',()=>{
 for (const def of [...GROWTH_SKILLS,...GROWTH_EVOLUTIONS].filter(row=>row.special&&row.id!=='evo_wuwo')) {
  const s=fresh();s.xp=10920;s.clearedFloor=9;s.researchPurchases=0;s.tutorialWaves=3
  s.skills={sj_yujian:1,sj_arc:1,sj_wanjian:1,...(def.kind==='evolution'
   ? {[def.parent]:6} : def.prerequisites)}
  s.cores=1000000;s.spiritStones=def.bookCost-1
  assert.equal(skillPresentation(s,def.id).nextRequirement.canUpgrade,false,`${def.id}: cores cannot pay`)
  s.cores=0;s.spiritStones=def.bookCost
  const before=JSON.stringify(s)
  assert.equal(skillPresentation(s,def.id).nextRequirement.canUpgrade,true,`${def.id}: exact stones pay`)
  assert.equal(JSON.stringify(s),before,'presentation never spends the balance')
  delete s.spiritStones
  assert.equal(skillPresentation(s,def.id).nextRequirement.canUpgrade,false,`${def.id}: missing balance`)
 }
})
test('zero-price upgrades need no currency balance; paid books stay free after respec',()=>{
 const s=fresh();s.xp=10920;s.clearedFloor=9;s.researchPurchases=0;s.tutorialWaves=3
 s.skills={sj_yujian:1,sj_arc:2,sj_wanjian:1};delete s.spiritStones;delete s.cores
 for (const id of ['sj_yujian','vajra','sj_flight']) {
  const req=skillPresentation(s,id).nextRequirement
  assert.equal(req.bookCost,0);assert.equal(req.canUpgrade,true,id)
 }
 s.books=['sj_line']
 assert.equal(skillPresentation(s,'sj_line').nextRequirement.canUpgrade,true)
 s.skills.sj_line=1
 assert.equal(skillPresentation(s,'sj_line').nextRequirement.canUpgrade,true)
 s.xp=0
 assert.equal(skillPresentation(s,'sj_flight').nextRequirement.canUpgrade,false,'free books do not bypass stage gates')
})
test('all definitions own explicit damage types and presentation follows metadata',()=>{
 const expected={
  sj_yujian:'physical',sj_arc:'physical',sj_moon:'physical',sj_moon_triple:'physical',sj_cross:'physical',sj_line:'physical',sj_shadow:'hybrid',sj_jinghong:'physical',
  evo_wanjian:'physical',evo_tiandi:'physical',sj_mark:'none',sj_gate:'hybrid',
  sj_wanjian:'hybrid',sj_qinglian:'hybrid',sj_formation:'hybrid',sj_sancai:'hybrid',evo_wuwo:'hybrid',evo_sixiang:'hybrid',
  sj_spirit:'none',sj_heart:'none',sj_bone:'none',vajra:'none',sj_flight:'none',
 }
 const labels={physical:'物理攻击',hybrid:'物理＋法术攻击',magic:'法术攻击',inherited:'伤害类型继承',none:'被动功法'}
 const s=fresh()
 assert.equal(Object.keys(expected).length,GROWTH_SKILLS.length+GROWTH_EVOLUTIONS.length)
 for (const def of [...GROWTH_SKILLS,...GROWTH_EVOLUTIONS]) {
  assert.equal(def.damageType,expected[def.id],def.id)
  assert.ok(Object.prototype.hasOwnProperty.call(def,'damageType'))
  const p=skillPresentation(s,def.id)
  assert.equal(p.damageType,def.damageType)
  assert.equal(p.category,labels[def.damageType])
  if (def.damageType==='hybrid') assert.match(p.description,/物理与法术混合伤害/)
 }
})
test('damage type definitions preserve unsplit total damage for all six active skills',()=>{
 const s=fresh()
 // 2026-11-06：御剑1级×0.5，流云斩×1.3，剑破虚空×1.5；2026-11-09：剑破虚空再×1.5，周天剑阵1级×0.5（方案B2）。
 const examples=[['sj_yujian','roundDamage',60],['sj_arc','fullDamage',156],
  ['sj_line','hitDamage',3240],['sj_shadow','hitDamage',640],
 ['sj_wanjian','tickDamage',300/7*.5],['sj_formation','tickDamage',176]]
 const run=new TowerRun({attemptId:1,floor:1,seed:123,hp:100,xp:0,loadout:combatLoadout(s)})
 run._random=()=>1
 for (const [id,key,expected] of examples) {
  const p=skillPresentation(s,id)
  close(value(p,key),expected*(p.damageType==='hybrid'?1.05:1.15))
  assert.ok(!p.stats.some(row=>/physicalDamage|magicDamage|magicShare|physicalShare/.test(row.key)))
  const enemy={id:77,hp:10000,x:0,y:0,woundBudget:0}
  run.state.enemies=[enemy]
  run._damageEnemy({target:77,damage:expected,direct:id!=='sj_formation',source:id,damageType:p.damageType})
  close(10000-enemy.hp,expected*(p.damageType==='hybrid'?(.5+.5*95/115):1))
 }
})

test('dependency hints omit former special/passive gates and retain exact evolution parent ranks',()=>{
 for(const id of ['sj_shadow','sj_line','sj_formation']){
  const s=fresh();s.xp=10920;s.clearedFloor=9;s.spiritStones=10000
  const p=skillPresentation(s,id)
  assert.deepEqual(p.nextRequirement.prerequisites,{})
  assert.equal(p.nextRequirement.canUpgrade,true,id)
 }
 for(const row of GROWTH_EVOLUTIONS.filter(r=>r.id!=='evo_wuwo')) for(const [rank,parentLevel] of [[0,6],[1,8],[2,8]]){ // 周天剑域已退役
  const s=fresh();s.xp=TOWER_XP_CAP;s.clearedFloor=9;s.tutorialWaves=3;s.researchPurchases=0;s.spiritStones=10000
  s.skills={sj_yujian:1,sj_arc:1,sj_wanjian:1,[row.parent]:parentLevel}
  s.evolutionRanks=rank?{[row.id]:rank}:{}
  s.books=rank?[row.id]:[]
  const p=skillPresentation(s,row.id)
  if(rank===2){
   assert.equal(p.maxed,true);assert.equal(p.nextRequirement,null);assert.deepEqual(p.requirementLines,[])
   continue
  }
  const parent=GROWTH_SKILLS.find(skill=>skill.id===row.parent)
  const passive=GROWTH_SKILLS.find(skill=>skill.id===row.passive)
  assert.deepEqual(p.nextRequirement.prerequisites,{[row.parent]:1})
  assert.ok(p.requirementLines.includes(`${parent.name} 1级`))
  assert.ok(!p.requirementLines.includes(`${parent.name} ${parentLevel}级`))
  assert.ok(!p.requirementLines.some(line=>line.includes(passive.name)))
  assert.equal(p.nextRequirement.canUpgrade,true)
  assert.equal(p.nextRequirement.characterLevel,Math.max(row.learnLevel,rank===0?21:row.id==='evo_sixiang'?30:27))
 }
})

test('real cooldown ring applies its damage and awareness too, preserves hit units and frozen gear',()=>{
 const s=fresh();s.xp=TOWER_XP_CAP;s.tutorialWaves=3
 s.skills={sj_yujian:8,sj_arc:3,sj_line:8,sj_wanjian:8,sj_formation:8,sj_shadow:8,sj_gate:1}
 s.evolutionRanks={evo_wanjian:1,evo_tiandi:1,evo_wuwo:1,evo_sixiang:1}
 const plainLoadout=combatLoadout(s)
 const baseline=Object.fromEntries([...GROWTH_SKILLS,...GROWTH_EVOLUTIONS].map(d=>[d.id,skillPresentation(s,d.id)]))
 const ring=rollEquipment('ring','ling',4,()=>.999,'presentation-cdr')
 assert.equal(validateEquipment(ring,'ring'),true)
 assert.equal(ring.affixes.find(a=>a.type==='cooldownReduction').value,15)
 // This is a real multi-stat ring, not a synthetic CDR-only item. Account for
 // its primary stats and damage affixes separately from the 15% cooldown cut.
 s.equipment[ring.id]=ring;s.equipmentCounters[ring.id]=0;s.loadouts[0].ringId=ring.id
 const before=JSON.stringify(s)
 for(const id of ['sj_yujian','sj_arc','sj_line','sj_shadow','sj_formation','sj_wanjian','sj_qinglian','evo_wanjian','evo_tiandi','evo_sixiang']){
  const p=skillPresentation(s,id),plain=baseline[id]
  close(p.cooldown,plain.cooldown*.85)
  for(const row of plain.stats){
   if(row.key==='rainCooldown')close(value(p,row.key),row.value*.85)
   else if(row.key==='hitInterval'&&['sj_arc','sj_line'].includes(id)){const t=castActionTiming(id,p.currentForm.hits,equipmentCastSpeed(combatLoadout(s),s.xp));close(value(p,row.key),t.releases[1]-t.releases[0])}
   else if(row.key==='windup') close(value(p,row.key),castActionTiming(id,p.currentForm.hits??1,equipmentCastSpeed(combatLoadout(s),s.xp)).windup)
   else if(row.key==='actionDuration') close(value(p,row.key),castActionTiming(id,p.currentForm.hits??1,equipmentCastSpeed(combatLoadout(s),s.xp)).duration)
   else if(/damage|^shadowHit/i.test(row.key)){
    const power=load=>{const a=stats(s.xp,load);const physical=a.attack*outgoingDamageFactor(load,id,'physical',true);const magic=a.magicAttack*outgoingDamageFactor(load,id,'magic',true);return p.damageType==='hybrid'?(physical+magic)/2:p.damageType==='magic'?magic:physical}
    close(value(p,row.key),row.value*power(combatLoadout(s))/power(plainLoadout))
   }
   else assert.equal(value(p,row.key),row.value,`${id}/${row.key}: ring must preserve cadence and geometry`)
  }
 }
 close(value(skillPresentation(s,'evo_tiandi'),'windup'),castActionTiming('evo_tiandi',1,equipmentCastSpeed(combatLoadout(s),s.xp)).windup)
 close(value(skillPresentation(s,'evo_wanjian'),'rainInterval'),.1)
 close(value(skillPresentation(s,'evo_sixiang'),'hitInterval'),.5)
 close(value(skillPresentation(s,'evo_wuwo'),'hitInterval'),.6)
 close(value(skillPresentation(s,'sj_gate'),'triggerCooldown'),10)
 assert.equal(JSON.stringify(s),before)

 const run=new TowerRun({attemptId:1,floor:1,seed:12,hp:100,xp:s.xp,loadout:combatLoadout(s)})
 run.state.player.x=0;run.state.player.y=0
 run.state.enemies=[{id:77,hp:100000,x:80,y:0,radius:5,woundBudget:0,orbitNextAt:0}]
 run._skills([])
 // Skills now share the body channel. Measure cooldown from the actual start.
 for(let i=0;i<180&&!run.state.casts.some(c=>c.skill==='sj_line');i++){run.state.ticks++;run.state.time=run.state.ticks/60;run._skills([])}
 const line=run.state.casts.find(c=>c.skill==='sj_line');assert.ok(line)
 close(run.state.cooldowns.sj_line-line.startedAt,12*.85)
 close(line.releaseAt-line.startedAt,castActionTiming('evo_tiandi',1,equipmentCastSpeed(combatLoadout(s),s.xp)).windup)
 let rainStart=null
 for(let i=0;i<180&&!run.state.zones.some(z=>z.kind==='sword_rain');i++){
  run.state.ticks++;run.state.time=run.state.ticks/60;run._skills([])
  const rain=run.state.casts.find(c=>c.formId==='evo_wanjian');if(rain)rainStart=rain.startedAt
 }
 assert.notEqual(rainStart,null)
 close(run.state.cooldowns.evo_wanjian-rainStart,15*.85)
 close(run.state.zones.find(z=>z.kind==='sword_rain').interval,.1)

 s.activeRun={snapshot:run.snapshot()}
 s.loadouts[0].ringId='basic-ring'
 const frozen=JSON.stringify(s.activeRun)
 close(skillPresentation(s,'evo_tiandi').cooldown,12*.85)
 close(value(skillPresentation(s,'evo_wanjian'),'rainCooldown'),15*.85)
 assert.equal(JSON.stringify(s.activeRun),frozen)
 s.activeRun=null
 close(skillPresentation(s,'evo_tiandi').cooldown,12)
})

test('independent moon panels keep stable shapes and itemize their complete damage budgets',()=>{
 const s=fresh();
 for(const rank of [1,3,4,7,10])for(const [id,hits] of [['sj_arc',3],['sj_moon',1],['sj_moon_triple',3]]){
  s.skills={[id]:rank};const p=skillPresentation(s,id);
  assert.equal(p.currentForm.hits,hits);
  assert.doesNotMatch(p.description,/4级可离体|7级可连续/);
  if(id==='sj_arc'){
   close(value(p,'hitDamage'),value(p,'fullDamage')*.25);
   close(value(p,'arcHit2Damage'),value(p,'fullDamage')*.33);
   close(value(p,'arcHit3Damage'),value(p,'fullDamage')*.42);
  }else{close(value(p,'hitDamage')*hits,value(p,'fullDamage'));assert.ok(p.formLines.some(l=>l.includes(id==='sj_moon'?'横向460、纵向230':'420')))}
 }
});
