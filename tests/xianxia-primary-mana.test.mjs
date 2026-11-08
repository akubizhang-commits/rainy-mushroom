import test from 'node:test'
import assert from 'node:assert/strict'
import {primaryAttributes,skillManaCost,MANA_COSTS} from '../js/xianxia/TowerCharacterStats.js'
import {TowerRun,stats,validateTowerSnapshot} from '../js/xianxia/TowerRun.js'
import {cultivationAt,cultivationLevelXp} from '../js/xianxia/TowerProfile.js'
import {createIronWeapon} from '../js/xianxia/TowerWeapons.js'
import {createBasicEquipment} from '../js/xianxia/TowerEquipment.js'
import {GROWTH_SKILLS} from '../js/xianxia/TowerGrowth.js'
import {EQUIPMENT_COOLDOWN_CAP} from '../js/xianxia/TowerSkillTiming.js'
import {equipmentCastSpeed} from '../js/xianxia/TowerSkillTiming.js'
import {TowerCampaignStore} from '../js/xianxia/TowerCampaign.js'
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`)
const loadout=()=>({growthVersion:1,skillsInitialized:true,active:{sj_arc:1},passive:{},evolutions:[],evolutionLevels:{},tutorialWaves:0,weapon:createIronWeapon(),weaponId:'iron',weaponQuality:0,weaponRefine:0,weaponFocusCount:0,armor:createBasicEquipment('armor'),armorId:'basic-armor',ring:createBasicEquipment('ring'),ringId:'basic-ring'})
const make=(l=loadout(),mana=100)=>new TowerRun({attemptId:1,floor:1,xp:cultivationLevelXp(21),hp:100,seed:41,training:true,mana,loadout:l})
const advance=(run,n)=>{for(let i=0;i<n;i++)run.advance(1/60)}
function target(run){const p=run.state.player;run.state.enemies.push({id:'test-target',x:p.x+70,y:p.y,hp:1e8,maxHp:1e8,radius:20,armor:0})}
test('birth, level growth and derived attack apply once; awareness drives casting',()=>{
 const l=loadout(),a=primaryAttributes(0,l)
 assert.deepEqual(a,{strength:110,intelligence:90,awareness:100,vitality:10,maxMana:100,manaRegen:3})
 for(let level=1;level<=30;level++){
  const xp=cultivationLevelXp(level),s=stats(xp,l)
  near(s.attack,s.strength+5);near(s.magicAttack,s.intelligence+5)
  near(s.strength,110*cultivationAt(xp).attackMultiplier)
  near(s.intelligence,90*cultivationAt(xp).attackMultiplier)
  assert.equal(s.awareness,100+level-1);near(s.manaRegen,s.awareness*.03)
  near(equipmentCastSpeed(l,xp),(level-1)/100)
  assert.equal(s.maxMana,s.awareness);assert.ok(!('spirit' in s))
 }
 l.passive.sj_spirit=3
 assert.equal(primaryAttributes(0,l).awareness,130);near(equipmentCastSpeed(l),.3)
})
test('every current active form has cost, basics and passives are free',()=>{
 for(const id of ['sj_yujian','sj_arc','sj_cross','sj_line','sj_shadow','sj_wanjian','sj_qinglian','sj_formation','evo_wanjian','evo_tiandi','evo_wuwo','evo_sixiang'])assert.ok(MANA_COSTS[id]>0,id)
 for(const id of ['basic_attack','sj_spirit','sj_bone','sj_gate'])assert.equal(skillManaCost(id),0)
})
test('starter flying swords remain sustainable, while whole-catalog spam has a cost',()=>{
 const regen=primaryAttributes(0,loadout()).manaRegen
 assert.ok(skillManaCost('sj_yujian')<=regen)
 assert.ok(Object.values(MANA_COSTS).every(Number.isInteger))
})
test('insufficient spirit waits without consuming partial mana; basic attacks still start',()=>{
 for(const mana of [0,.25]){
  const r=make(loadout(),mana);target(r)
  r._growthSkills([],null,r.state.player)
  assert.equal(r.state.actions.current,null)
  assert.equal(r.state.manaState.spent,0);near(r.state.player.mana,mana)
  assert.ok(r.state.actions.basic)
 }
 const r=make(loadout(),100);target(r);r._growthSkills([],null,r.state.player)
 assert.equal(r.state.actions.current.parent,'sj_arc')
 near(r.state.player.mana,100-skillManaCost('sj_arc'))
})
test('every evolved power waits at zero spirit with no medicine',()=>{
 for(const [id,evo] of Object.entries({sj_yujian:'evo_wanjian',sj_line:'evo_tiandi',sj_wanjian:'evo_wuwo',sj_formation:'evo_sixiang'})){
  const l=loadout();l.active={[id]:10};l.evolutions=[evo];l.evolutionLevels={[evo]:1}
  const r=make(l,0);target(r);r.state.cooldowns[evo]=0;r._growthSkills([],null,r.state.player)
  assert.equal(r.state.actions.current,null)
  assert.equal(r.state.player.mana,0);assert.equal(r.state.manaState.spent,0)
 }
})
test('multi-hit casting charges once, and recovery has no target or full-health requirement',()=>{
 const l=loadout();l.active={sj_arc:7};const r=make(l,50);target(r)
 r._growthSkills([],null,r.state.player)
 assert.equal(r.state.manaState.spent,skillManaCost('sj_arc'))
 for(let i=1;i<=60;i++){r.state.time=i/60;r._advanceSkillCasts([],null)}
 assert.equal(r.state.manaState.spent,skillManaCost('sj_arc'))
 const empty=loadout();empty.active={};const regen=make(empty,0);regen.setPlaytestAssist(true)
 advance(regen,60);near(regen.state.player.mana,regen.state.player.manaRegen)
})
test('pause and reload preserve mana and ledger; malformed or forged values are rejected',()=>{
 const l=loadout();l.active={};const r=make(l,0);r.setPlaytestAssist(true);advance(r,60);r.pause()
 const frozen=r.snapshot();r.advance(60);assert.deepEqual(r.snapshot(),frozen)
 assert.ok(validateTowerSnapshot(frozen));const restored=TowerRun.restore(frozen);restored.resume();advance(restored,60)
 near(restored.state.player.mana,frozen.player.mana+restored.state.player.manaRegen)
 for(const value of [-1,999999,NaN]){const bad=structuredClone(frozen);bad.player.mana=value;assert.equal(validateTowerSnapshot(bad),false)}
 const forged=structuredClone(frozen);forged.player.mana+=1;assert.equal(validateTowerSnapshot(forged),false)
})
test('campaign checkpoints and camp recovery persist mana; failed save is atomic; finish cannot repeat',()=>{
 const data=new Map(),disk={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)}
 const store=new TowerCampaignStore(disk,0);assert.equal(store.state.mana,100)
 const entered=store.act({type:'startFloor',floor:1,seed:41},0);assert.equal(entered.ok,true)
 const r=TowerRun.restore(entered.snapshot);advance(r,120);r.pause();const snapshot=r.snapshot()
 assert.ok(validateTowerSnapshot(snapshot))
 assert.equal(store.act({type:'checkpoint',snapshot},2000).ok,true)
 near(store.state.mana,snapshot.player.mana)
 const reloaded=new TowerCampaignStore(disk,2000);near(reloaded.state.mana,snapshot.player.mana)
 r.resume();advance(r,60);r.pause();const next=r.snapshot(),before=JSON.stringify(store.state),saved=new Map(data)
 const write=disk.setItem;disk.setItem=()=>{throw Error('disk full')}
 assert.equal(store.act({type:'checkpoint',snapshot:next},3000).ok,false)
 assert.equal(JSON.stringify(store.state),before);assert.deepEqual(data,saved);disk.setItem=write
 assert.equal(store.act({type:'checkpoint',snapshot:next},3000).ok,true)
 r.abandon();assert.equal(store.act({type:'finishFloor',snapshot:r.snapshot()},3000).ok,true)
 assert.equal(store.act({type:'finishFloor',snapshot:r.snapshot()},3000).ok,false)
 const beforeCamp=store.state.mana;store.act({type:'sync'},6000)
 near(store.state.mana,Math.min(100,beforeCamp+12))
 const same=store.state.mana;store.act({type:'sync'},6000);near(store.state.mana,same)
})
