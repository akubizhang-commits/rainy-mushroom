import {currentCampaignSchema} from './helpers/tower-schema.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import {WEAPONS,createFixedWeapon,weaponAttackProfile,weaponSummary,validateWeapon} from '../js/xianxia/TowerWeapons.js'
import {WEAPON_BLEED_IDS,addWeaponBleed,tickWeaponBleeds,validWeaponBleeds} from '../js/xianxia/TowerWeaponBleed.js'
import {TowerRun,validateTowerSnapshot,stats} from '../js/xianxia/TowerRun.js'
import {cultivationLevelXp} from '../js/xianxia/TowerProfile.js'
import {TowerCampaignStore,TOWER_CAMPAIGN_KEY} from '../js/xianxia/TowerCampaign.js'
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`)
function fixture(isolated=true){
 const weapon=createFixedWeapon('eq_sword_caiyun','bleed-probe')
 const loadout={growthVersion:1,skillsInitialized:true,active:{sj_arc:1},passive:{sj_heart:4,sj_mark:4,sj_gate:1},
   evolutions:[],evolutionLevels:{},tutorialWaves:0,weapon,weaponId:weapon.id,weaponQuality:weapon.quality,weaponRefine:0,weaponFocusCount:0}
 const xp=cultivationLevelXp(30),run=new TowerRun({attemptId:1,floor:1,seed:101,xp,hp:stats(xp,loadout).maxHp,loadout,training:true})
 for(let i=0;i<600&&!run.state.enemies.length;i++)run.advance(1/60)
 const e=run.state.enemies[0];assert.ok(e)
 if(isolated){e.hp=e.maxHp=1e8
 run.state.enemies=[e];run.state.pending=[];run.state.reserved=[];run.state.projectiles=[];run.state.zones=[]}
 return {run,e}
}
test('six identities have 50 percent conversion and a separate fixed DOT bonus',()=>{
 const selected=[]
 for(const d of WEAPONS){
  const w=createFixedWeapon(d.id,d.quality?d.id:'iron'),p=weaponAttackProfile(w)
  const old=d.quality?{fan:.02,fa:.02,bao:.03,ling:.05}[d.tier]:0
  near(p.onHit+p.bleed,old);assert.equal(p.bleedConversion,p.bleed?.5:0)
  if(p.bleed){selected.push(d.id);assert.equal(p.onHit,0);assert.ok(weaponSummary(w).specialLines.some(s=>s.startsWith('流血')))}
  else assert.ok(!weaponSummary(w).specialLines.some(s=>s.startsWith('流血')))
  assert.ok(validateWeapon(w))
 }
 assert.deepEqual(selected.sort(),[...WEAPON_BLEED_IDS].sort())
})
test('one application pays its inherited budget in six ticks and disappears',()=>{
 const e={id:'target',hp:1000};const s={time:0,enemies:[e]},hits=[]
 addWeaponBleed(e,0,60,24)
 for(let i=1;i<=6;i++){s.time=i*.5;tickWeaponBleeds(s,hits)}
 assert.equal(hits.length,6)
 near(hits.reduce((n,h)=>n+h.damage,0),60)
 near(hits.reduce((n,h)=>n+h.damageParts.physical,0),24)
 assert.ok(hits.every(h=>h.scaled&&!h.direct&&h.source==='weapon_bleed'))
 assert.equal(e.weaponBleed,undefined)
})
test('refresh merges only the unpaid budget, preserves next tick and never duplicates damage',()=>{
 const e={id:'target',hp:1000},s={time:0,enemies:[e]},hits=[]
 addWeaponBleed(e,0,60,60);s.time=.5;tickWeaponBleeds(s,hits)
 addWeaponBleed(e,.75,30,0)
 assert.equal(e.weaponBleed.nextAt,1);assert.equal(e.weaponBleed.endsAt,3.75)
 for(let i=2;i<=7;i++){s.time=i*.5;tickWeaponBleeds(s,hits)}
 s.time=3.75;tickWeaponBleeds(s,hits)
 near(hits.reduce((n,h)=>n+h.damage,0),90.8)
 near(hits.reduce((n,h)=>n+h.damageParts.physical,0),60.5)
 assert.equal(e.weaponBleed,undefined)
})
test('actual settled critical is inherited; bleed does not reroll crit, multiply mitigation, attach or trigger procs',()=>{
 const {run,e}=fixture();run._random=()=>0
 run._damageEnemy({target:e.id,damage:100,damageParts:{physical:60,magic:40},source:'sj_arc',direct:true})
 const parent=run.state.effects.filter(x=>x.kind==='hit'&&!x.attached).at(-1)
 assert.ok(parent.critical)
 near(e.weaponBleed.remaining,parent.damage*2*1.02)
 const b=structuredClone(e.weaponBleed),before=e.hp,burstCount=run.state.swordBursts.length
 const wound=e.qingping.amount,oldEffects=run.state.effects.length
 // A later armor phase must not re-mitigate this inherited damage.
 e.mechanic={kind:'armor',armorActive:true}
 run._random=()=>{throw Error('DOT must not roll random')}
 for(let i=0;i<6;i++){
  run.state.time=b.nextAt+i*.5;const hits=[];tickWeaponBleeds(run.state,hits)
  for(const hit of hits)run._damageEnemy(hit)
 }
 near(before-e.hp,b.remaining)
 assert.equal(run.state.swordBursts.length,burstCount)
 assert.equal(e.qingping.amount,wound)
 assert.equal(e.weaponBleed,undefined)
 const hits=run.state.effects.slice(oldEffects).filter(x=>x.kind==='hit')
 assert.equal(hits.length,6);assert.ok(hits.every(x=>!x.critical&&!x.attached))
})
test('pending bleed survives snapshot restore; pause freezes its time and ticks',()=>{
 const {run,e}=fixture(false)
 addWeaponBleed(e,run.state.time,60,30)
 assert.ok(validateTowerSnapshot(run.snapshot()))
 run.pause();const before=run.snapshot()
 run.advance(1);assert.deepEqual(run.snapshot(),before)
 const restored=TowerRun.restore(before)
 assert.deepEqual(restored.state.enemies[0].weaponBleed,run.state.enemies[0].weaponBleed)
 const left=[],right=[]
 for(let i=0;i<6;i++){
  run.state.time+=.5;restored.state.time+=.5
  tickWeaponBleeds(run.state,left);tickWeaponBleeds(restored.state,right)
 }
 assert.deepEqual(left,right)
})
test('dead targets cannot gain bleed and existing status is removed without a damage tick',()=>{
 const e={id:'dead',hp:0};addWeaponBleed(e,0,60,30);assert.equal(e.weaponBleed,undefined)
 e.hp=100;addWeaponBleed(e,0,60,30);e.hp=0
 const hits=[];tickWeaponBleeds({time:.5,enemies:[e]},hits)
 assert.equal(hits.length,0);assert.equal(e.weaponBleed,undefined)
})
test('malformed or overdue status cannot enter a current snapshot',()=>{
 const {run,e}=fixture();addWeaponBleed(e,run.state.time,60,30)
 const valid=structuredClone(e.weaponBleed)
 for(const patch of [{remaining:-1},{physical:100},{nextAt:run.state.time-1},{endsAt:run.state.time+4},{remaining:NaN},{unexpected:1}]){
  e.weaponBleed={...valid,...patch};assert.equal(validWeaponBleeds(run.state),false)
 }
})
test('schema53 reset remains isolated and atomic; current save reload is unchanged',()=>{
 const disk=new Map([['another-game','keep']]),storage={getItem:k=>disk.get(k)??null,setItem:(k,v)=>disk.set(k,v)}
 const store=new TowerCampaignStore(storage,0);assert.ok(store.act({type:'sync'},0).ok)
 const record=JSON.parse(disk.get(TOWER_CAMPAIGN_KEY));assert.equal(record.schema,currentCampaignSchema)
 record.schema=53;const old=JSON.stringify(record);disk.set(TOWER_CAMPAIGN_KEY,old)
 const failed=new TowerCampaignStore({...storage,setItem(){throw Error('disk full')}},0)
 assert.ok(failed.readOnly);assert.equal(disk.get(TOWER_CAMPAIGN_KEY),old)
 const reset=new TowerCampaignStore(storage,0);assert.ok(!reset.readOnly)
 assert.equal(disk.get('another-game'),'keep')
 assert.deepEqual(new TowerCampaignStore(storage,0).state,reset.state)
})
