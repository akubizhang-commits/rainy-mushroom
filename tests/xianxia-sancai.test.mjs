import test from 'node:test'
import assert from 'node:assert/strict'
import {GROWTH_SKILLS, skillRequirement, rankCap} from '../js/xianxia/TowerGrowth.js'
import {COMBAT_SKILLS} from '../js/xianxia/TowerCombatSkills.js'
import {skillForm} from '../js/xianxia/TowerSkillForms.js'
import {castActionTiming} from '../js/xianxia/TowerSkillTiming.js'
import {cultivationLevelXp} from '../js/xianxia/TowerProfile.js'
import {skillManaCost} from '../js/xianxia/TowerCharacterStats.js'
import {TowerRun, validateTowerSnapshot, stats} from '../js/xianxia/TowerRun.js'
import {createIronWeapon, createFixedWeapon, WEAPONS, weaponFlatAttack, weaponDamageModifiers} from '../js/xianxia/TowerWeapons.js'
import {outgoingDamageFactor} from '../js/xianxia/TowerAttributeRules.js'
import {skillElement} from '../js/xianxia/TowerWeaponElements.js'
import {applyEquipmentSkillLevels} from '../js/xianxia/TowerEquipmentSkillLevels.js'
const near=(a,b,label='')=>assert.ok(Math.abs(a-b)<1e-7,`${label}: ${a} != ${b}`)
const definition=()=>GROWTH_SKILLS.find(s=>s.id==='sj_sancai')
function runFixture(rank=1) {
 const weapon=createIronWeapon()
 return new TowerRun({attemptId:1,floor:1,seed:41,hp:100,xp:cultivationLevelXp(11),training:true,
  loadout:{growthVersion:1,skillsInitialized:true,active:{sj_sancai:rank},passive:{},
   evolutions:[],evolutionLevels:{},tutorialWaves:0,weapon,weaponId:weapon.id,
   weaponQuality:0,weaponRefine:0,weaponFocusCount:0}})
}
function placedFixture(rank=1) {
 const run=runFixture(rank),s=run.state,p=s.player
 const enemy=run._enemy({...s.pending[0],id:'sancai-target',x:p.x+230,y:p.y})
 Object.assign(enemy,{hp:1e7,maxHp:1e7,moveSpeed:0})
 enemy.ai.readyAt=enemy.ai.graceUntil=enemy.ai.entryUntil=1e8
 s.enemies=[enemy];s.pending=[];s.reserved=[];s.wavePlanned=1
 return {run,s,p,enemy}
}

// 2026-11-09：三才剑阵移到筑基巅峰（17 级），等级段 17/21/24/27。
test('Sancai learns independently at 17, has phased ranks and a fixed six-hit budget',()=>{
 const d=definition();assert.ok(d,'Sancai exists')
 assert.equal(d.name,'三才剑阵');assert.equal(d.learnLevel,17);assert.equal(d.damageType,'hybrid')
 assert.deepEqual(d.prerequisites,{});assert.deepEqual(d.pointCosts,Array(10).fill(1))
 const state={xp:cultivationLevelXp(17),skills:{},evolutionRanks:{},books:[],
  clearedFloor:0,researchPurchases:0,skillsInitialized:true,playtestSkillPoints:100}
 assert.equal(skillRequirement(state,d.id).ok,true)
 assert.equal(skillRequirement({...state,xp:cultivationLevelXp(16)},d.id).reason,'stage-locked')
 for(const [level,cap] of [[17,3],[21,6],[24,9],[27,10]])assert.equal(rankCap(d.id,cultivationLevelXp(level)),cap)
 const combat=COMBAT_SKILLS.find(s=>s.id===d.id)
 for(let rank=1;rank<=11;rank++){
  near(combat.damage[rank-1],6*1.25*1.12**(rank-1)*3.85) // 2026-11-06：三才伤害×1.25；2026-11-09：×3.85
  const f=skillForm(d.id,rank)
  assert.equal(f.shape,'triangle');assert.equal(f.hits,6);assert.equal(f.eyes,3)
  near(f.initialDelay,.35);near(f.interval,1);near(f.duration,6)
  assert.equal(f.radius,rank>=7?180:rank>=4?165:150)
  assert.equal(castActionTiming(d.id,3).releases.length,1)
 }
 near(castActionTiming(d.id,3).windup,.25);near(skillManaCost(d.id),5)
})

test('triangle uses its actual edges and round enemy hurtbox, not the circumscribed circle',async()=>{
 const {sancaiVertices,sancaiContains}=await import('../js/xianxia/TowerSancai.js')
 const z={x:20,y:30,radius:150},v=sancaiVertices(z)
 assert.equal(v.length,3);for(const p of v)near(Math.hypot(p.x-z.x,p.y-z.y),150)
 assert.ok(sancaiContains(z,{x:20,y:30,radius:0}))
 assert.ok(sancaiContains(z,{...v[0],radius:0}))
 assert.equal(sancaiContains(z,{x:20,y:-70,radius:1}),false)
 assert.ok(sancaiContains(z,{x:20,y:-50,radius:5}))
 assert.equal(sancaiContains(z,{x:20,y:-50.01,radius:5}),false)
})

test('slow affects all ranks, nonstacking, and ends on exit or at exactly three seconds',async()=>{
 const {formationMovementMultiplier:sancaiMovementMultiplier}=await import('../js/xianxia/TowerFormationControl.js')
 const z={kind:'sancai',formId:'sj_sancai',source:'sj_sancai',hostile:false,x:0,y:0,radius:150,startedAt:1,expiresAt:4}
 const e={x:0,y:0,radius:10,role:'normal',hp:100}
 near(sancaiMovementMultiplier([z],e,1),.8)
 near(sancaiMovementMultiplier([z,{...z}],e,2),.8)
 for(const role of ['elite','boss'])near(sancaiMovementMultiplier([z],{...e,role},2),.8)
 near(sancaiMovementMultiplier([z],{...e,y:-150},2),1)
 near(sancaiMovementMultiplier([z],e,4),1)
 near(sancaiMovementMultiplier([z],e,.99),1)
 near(sancaiMovementMultiplier([],e,2),1)
})

test('real cast releases once, freezes its center and performs only six budgeted pulses',()=>{
 const {run,s,enemy}=placedFixture()
 const pulses=new Map(),hits=new Map();let center,spent
 for(let frame=0;frame<430;frame++){
  run.advance(1/60)
  for(const z of s.zones.filter(z=>z.kind==='sancai')){
   if(!center){center={x:z.x,y:z.y,start:z.startedAt};spent=s.manaState.spent;s.cooldowns.sj_sancai=9999}
   near(z.x,center.x);near(z.y,center.y);near(z.expiresAt-z.startedAt,6)
   const c=z.castContext,a=stats(c.xp,c.loadout).attack-weaponFlatAttack(c.loadout.weapon)+c.weaponAttack
   near(z.damage*6/a,7.5*3.85,'whole cast budget')
  }
  for(const e of s.effects){
   if(e.kind==='sancai')pulses.set(e.id,e)
   if(e.kind==='hit'&&e.source==='sancai')hits.set(e.id,e)
  }
  if(center&&frame===50)enemy.x+=10
 }
 assert.ok(center);assert.equal(pulses.size,6);assert.equal(hits.size,6)
 assert.deepEqual([...pulses.values()].map(e=>e.pulseIndex),[1,2,3,4,5,6])
 for(const [i,e] of [...pulses.values()].entries())near(e.startedAt-center.start,.35+i)
 near(spent,5);near(s.manaState.spent,5)
 assert.equal(s.zones.some(z=>z.kind==='sancai'),false)
})

test('pulses cap at six distinct targets, never damage outside the triangle, do not proc wounds',()=>{
 const {run,s,enemy}=placedFixture()
 s.enemies=Array.from({length:8},(_,i)=>({...structuredClone(enemy),id:`inside-${i}`,x:enemy.x+i}))
 s.enemies.push({...structuredClone(enemy),id:'outside',y:enemy.y-120})
 while(!s.zones.some(z=>z.kind==='sancai'))run.advance(1/60)
 s.cooldowns.sj_sancai=9999
 const z=s.zones.find(z=>z.kind==='sancai'),out=[]
 run._growthZonePulse(z,out)
 assert.equal(out.length,6);assert.equal(new Set(out.map(h=>h.target)).size,6)
 assert.equal(out.some(h=>h.target==='outside'),false)
 assert.ok(out.every(h=>h.direct===false&&h.source==='sancai'))
})

test('ordinary approach movement is reduced in real combat and restored on exit',()=>{
 const {run,s,enemy}=placedFixture()
 while(!s.zones.some(z=>z.kind==='sancai'))run.advance(1/60)
 s.cooldowns.sj_sancai=9999
 enemy.moveSpeed=100;enemy.ai.entryUntil=0;enemy.ai.transitionUntil=0;enemy.ai.transitionPending=false
 run._attackSpec=()=>null
 const move=()=>{const p={x:enemy.x,y:enemy.y};run._enemyActions([],s.player);return Math.hypot(enemy.x-p.x,enemy.y-p.y)}
 near(move(),100/60*(1-.2*(1-enemy.controlResistance)))
 enemy.y+=300
 near(move(),100/60)
})

test('natural casts validate, resume deterministically, pause and reject tampered field budgets',()=>{
 const run=runFixture();let observed=false
 for(let frame=0;frame<1000;frame++){
  run.advance(1/60)
  assert.equal(validateTowerSnapshot(run.snapshot()),true,`frame ${frame}`)
  const zone=run.state.zones.find(z=>z.kind==='sancai')
  if(!zone)continue
  observed=true
  run.pause();const paused=run.snapshot();run.advance(10);assert.deepEqual(run.snapshot(),paused);run.resume()
  const snap=run.snapshot(),restored=TowerRun.restore(snap)
  for(const edit of [
   z=>z.damage*=3,z=>z.expiresAt+=1,z=>z.ticks+=1,z=>z.radius+=1,
   z=>z.direct=true,z=>z.hostile=true,z=>z.formId='sj_formation',
  ]){
   const bad=structuredClone(snap);edit(bad.zones.find(z=>z.kind==='sancai'))
   assert.equal(validateTowerSnapshot(bad),false)
  }
  for(let n=0;n<240;n++){run.advance(1/60);restored.advance(1/60)}
  assert.deepEqual(restored.snapshot(),run.snapshot());assert.ok(validateTowerSnapshot(run.snapshot()))
  break
 }
 assert.ok(observed,'real Sancai field')
})

test('Sancai shares formation equipment bonuses, thunder element and panel budget',async()=>{
 assert.ok(definition())
 assert.equal(skillElement('sj_sancai'),'thunder')
 const loadout={active:{sj_sancai:1},passive:{},evolutions:[],evolutionLevels:{},
  ring:{affixes:[{type:'formationDamage',value:12}]}}
 near(outgoingDamageFactor(loadout,'sj_sancai','magic',true),1.12)
 const weapon=WEAPONS.filter(d=>d.quality>0).map(d=>createFixedWeapon(d.id,`sancai-${d.id}`))
  .find(w=>w.affixes.some(a=>a.type==='flow'&&a.target==='formation'))
 assert.ok(weapon)
 assert.ok(weaponDamageModifiers(weapon,'sj_sancai','magic').flat>0)
 const {TowerCampaignStore}=await import('../js/xianxia/TowerCampaign.js')
 const {skillPresentation}=await import('../js/xianxia/TowerSkillPresentation.js')
 const state=new TowerCampaignStore({getItem(){return null},setItem(){}},0).state
 const p=skillPresentation(state,'sj_sancai')
 assert.ok(p);assert.match(p.description,/三/);assert.match(p.description,/20%/)
 const values=Object.fromEntries(p.stats.map(row=>[row.key,row.value]))
 near(values.fullDamage,values.tickDamage*6);near(values.duration,6);near(values.manaCost,5)
})

test('learning and refunds preserve save atomicity and active field contexts',async()=>{
 const {TowerCampaignStore}=await import('../js/xianxia/TowerCampaign.js')
 const {checksum}=await import('../js/xianxia/Checksum.js')
 const disk={allowPlaytestTools:true,raw:null,fail:false,getItem(){return this.raw},
  setItem(k,v){if(this.fail)throw Error('full');this.raw=v}}
 const initial=new TowerCampaignStore(disk,0);initial.act({type:'sync'},0)
 const envelope=JSON.parse(disk.raw),data=JSON.parse(envelope.data)
 Object.assign(data,{xp:cultivationLevelXp(17),skills:{},skillsInitialized:true,playtestSkillPoints:100})
 envelope.data=JSON.stringify(data);envelope.checksum=checksum(envelope.data);disk.raw=JSON.stringify(envelope)
 const store=new TowerCampaignStore(disk,0),before=store.state,raw=disk.raw
 disk.fail=true
 assert.equal(store.act({type:'learnSkill',id:'sj_sancai'},0).reason,'save-failed')
 assert.equal(store.state,before);assert.equal(disk.raw,raw)
 disk.fail=false;assert.equal(store.act({type:'learnSkill',id:'sj_sancai'},0).ok,true)
 assert.equal(new TowerCampaignStore(disk,0).state.skills.sj_sancai,1)
 const {decreaseSkillQuote}=await import('../js/xianxia/TowerGrowth.js')
 const quote=decreaseSkillQuote(store.state,'sj_sancai')
 assert.equal(quote.ok,true);assert.equal(quote.skills.sj_sancai??0,0)
})

test('equipment plus-one keeps training range in real casts, panel and restored fields',async()=>{
 const weapon=createFixedWeapon('eq_sword_taiheng','sancai-plus-one')
 const {TowerCampaignStore}=await import('../js/xianxia/TowerCampaign.js')
 const {skillPresentation}=await import('../js/xianxia/TowerSkillPresentation.js')
 const fresh=new TowerCampaignStore({getItem(){return null},setItem(){}},0).state
 for(const [trained,expectedRadius] of [[3,150],[6,165],[10,180]]){
  const loadout=applyEquipmentSkillLevels({...runFixture().state.loadout,
   active:{sj_sancai:trained},weapon,weaponId:weapon.id,weaponQuality:weapon.quality})
  const run=new TowerRun({attemptId:1,floor:1,seed:41,hp:100,xp:cultivationLevelXp(30),training:true,loadout})
  for(let i=0;i<1000&&!run.state.zones.some(z=>z.kind==='sancai');i++){
   run.advance(1/60);assert.ok(validateTowerSnapshot(run.snapshot()),`natural frame ${i}`)
  }
  const z=run.state.zones.find(z=>z.kind==='sancai')
  assert.ok(z);assert.equal(z.radius,expectedRadius,`trained ${trained}`)
  assert.equal(z.parentLevel,trained+1);assert.equal(z.hits,6)
  const panel=skillPresentation({...fresh,activeRun:{snapshot:run.snapshot()}},'sj_sancai')
  assert.equal(panel.currentForm.radius,expectedRadius)
  assert.equal(panel.learnedLevel,trained);assert.equal(panel.effectiveLevel,trained+1)
  const restored=TowerRun.restore(run.snapshot())
  for(let i=0;i<200;i++){run.advance(1/60);restored.advance(1/60)}
  assert.deepEqual(restored.snapshot(),run.snapshot())
  assert.ok(validateTowerSnapshot(run.snapshot()))
 }
})

test('upgrading during a live field preserves the released cast and does not reset cooldown',()=>{
 const run=runFixture()
 for(let i=0;i<1000&&!run.state.zones.some(z=>z.kind==='sancai');i++)run.advance(1/60)
 assert.ok(run.state.zones.some(z=>z.kind==='sancai'))
 run.pause()
 const before=run.snapshot(),zone=before.zones.find(z=>z.kind==='sancai')
 const next={...before.loadout,active:{...before.loadout.active,sj_sancai:2}}
 run.setGrowthLoadout(next)
 assert.deepEqual(run.state.zones.find(z=>z.kind==='sancai'),zone)
 assert.equal(run.state.cooldowns.sj_sancai,before.cooldowns.sj_sancai)
 assert.equal(run.state.player.mana,before.player.mana)
 assert.ok(validateTowerSnapshot(run.snapshot()))
 const resumed=TowerRun.restore(run.snapshot())
 run.resume();resumed.resume()
 for(let i=0;i<240;i++){run.advance(1/60);resumed.advance(1/60)}
 assert.deepEqual(run.snapshot(),resumed.snapshot())
})
