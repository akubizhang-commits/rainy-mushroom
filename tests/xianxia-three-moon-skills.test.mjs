import test from 'node:test'
import assert from 'node:assert/strict'
import {GROWTH_SKILLS,skillRequirement,skillStage} from '../js/xianxia/TowerGrowth.js'
import {skillForm,skillHitShare} from '../js/xianxia/TowerSkillForms.js'
import {castActionTiming} from '../js/xianxia/TowerSkillTiming.js'
import {cultivationAt} from '../js/xianxia/TowerProfile.js'
import {TowerRun,validateTowerSnapshot} from '../js/xianxia/TowerRun.js'
import {createIronWeapon} from '../js/xianxia/TowerWeapons.js'
const ids=['sj_arc','sj_moon','sj_moon_triple']
const xpAt=level=>{for(let xp=0;xp<=14400;xp++)if(cultivationAt(xp).level===level)return xp;throw Error('level')}
test('sword qi skills unlock at the approved realm phases',()=>{
 for(const [id,name,level] of [['sj_arc','流云斩',1],['sj_moon','玄月斩',4],['sj_cross','双月斩',17],['sj_moon_triple','逐月斩',14]]){
  const d=GROWTH_SKILLS.find(d=>d.id===id);assert.ok(d,id);assert.equal(d.name,name);assert.equal(d.learnLevel,level);assert.equal(skillStage(id).minLevel,level)
  const s={xp:xpAt(level),skills:{},evolutionRanks:{},books:[],clearedFloor:0,researchPurchases:0,skillsInitialized:true,playtestSkillPoints:100}
  assert.equal(skillRequirement(s,id).ok,true,id)
  if(level>1)assert.equal(skillRequirement({...s,xp:xpAt(level-1)},id).reason,'stage-locked',id)
 }
})
test('shapes and counts never change with trained or equipment rank',()=>{
 for(let rank=1;rank<=11;rank++)for(const [id,shape,count] of [['sj_arc','sector',3],['sj_moon','sector',1],['sj_moon_triple','crescent-projectile',3]]){
  const f=skillForm(id,rank);assert.equal(f.shape,shape);assert.equal(f.hits,count);assert.equal(castActionTiming(id,count).releases.length,count)
  const shares=Array.from({length:count},(_,i)=>skillHitShare(id,rank,i+1));assert.ok(Math.abs(shares.reduce((a,b)=>a+b)-1)<1e-8)
  if(id==='sj_arc')assert.ok(shares[0]<shares[1]&&shares[1]<shares[2])
 }
})
function fixture(id,distance=100){
 const weapon=createIronWeapon();const r=new TowerRun({attemptId:1,floor:1,seed:12,xp:0,hp:100,loadout:{growthVersion:1,active:{[id]:1},passive:{},evolutions:[],evolutionLevels:{},tutorialWaves:0,weapon,weaponId:weapon.id,weaponQuality:0,weaponRefine:0,weaponFocusCount:0}})
 r.state.cooldowns[id]=9999
 for(let i=0;i<200&&!r.state.enemies.length;i++)r.advance(1/60)
 const p=r.state.player,e=r.state.enemies[0];Object.assign(e,{x:p.x+distance,y:p.y});if(id==='sj_arc')Object.assign(e,{hp:1e6,maxHp:1e6,moveSpeed:0});e.ai.graceUntil=9999
 r.state.cooldowns[id]=0;r.advance(1/60);r.state.cooldowns[id]=9999
 return {r,e}
}
test('melee makes three increasing real hits and never creates projectiles',()=>{
 const {r,e}=fixture('sj_arc');const seen=new Set(),hits=[]
 for(let i=0;i<70;i++){r.advance(1/60);for(const h of r.state.effects)if(h.kind==='hit'&&h.source==='sj_arc'&&!seen.has(h.id)){seen.add(h.id);hits.push(h.damage)}assert.equal(r.state.projectiles.some(p=>p.source==='sj_arc'),false)}
 assert.equal(hits.length,3);assert.ok(hits[0]<hits[1]&&hits[1]<hits[2]);assert.ok(e.hp<1e6)
})
for(const [id,count] of [['sj_moon_triple',3]])test(`${id} creates ${count} independent ranged waves, stops at medium range, restores`,()=>{
 const {r}=fixture(id,300),seen=new Map()
 for(let i=0;i<90;i++){
  r.advance(1/60)
  for(const p of r.state.projectiles.filter(p=>p.source===id)){seen.set(p.id,{...p});assert.ok(p.range<=420);assert.equal(validateTowerSnapshot(r.snapshot()),true);const restored=TowerRun.restore(r.snapshot());assert.deepEqual(restored.snapshot(),r.snapshot())}
 }
 assert.equal(seen.size,count);assert.deepEqual([...seen.values()].map(p=>p.pulseIndex),Array.from({length:count},(_,i)=>i+1))
 assert.ok([...seen.values()].every(p=>p.dissolveAt!==null))
})

test('independent learning persists, realm rejection and failed saves are atomic',async()=>{
 const {TowerCampaignStore}=await import('../js/xianxia/TowerCampaign.js')
 const {checksum}=await import('../js/xianxia/Checksum.js')
 const disk={allowPlaytestTools:true,raw:null,fail:false,getItem(){return this.raw},setItem(k,v){if(this.fail)throw Error('full');this.raw=v}}
 const initial=new TowerCampaignStore(disk,0);assert.ok(initial.act({type:'sync'},0).ok)
 const envelope=JSON.parse(disk.raw),data=JSON.parse(envelope.data)
 data.xp=xpAt(14);data.skills={};data.skillsInitialized=true;data.playtestSkillPoints=100
 envelope.data=JSON.stringify(data);envelope.checksum=checksum(envelope.data);disk.raw=JSON.stringify(envelope)
 const store=new TowerCampaignStore(disk,0);assert.equal(store.readOnly,false)
 for(const id of ['sj_moon_triple','sj_moon','sj_arc']){
  const before=store.state,raw=disk.raw;disk.fail=true
  assert.equal(store.act({type:'learnSkill',id},0).reason,'save-failed');assert.equal(store.state,before);assert.equal(disk.raw,raw)
  disk.fail=false;assert.ok(store.act({type:'learnSkill',id},0).ok,id)
  assert.deepEqual(new TowerCampaignStore(disk,0).state,store.state)
 }
 assert.deepEqual(store.state.skills,{sj_moon_triple:1,sj_moon:1,sj_arc:1})
 const earlyDisk={...disk,raw:null},early=new TowerCampaignStore(earlyDisk,0)
 assert.equal(early.act({type:'learnSkill',id:'sj_moon'},0).reason,'stage-locked')
 assert.equal(early.act({type:'learnSkill',id:'sj_moon_triple'},0).reason,'stage-locked')
})

test('Xuanyue sweeps a broad stationary area once, expires and restores',()=>{
 const {r,e}=fixture('sj_moon',220);Object.assign(e,{hp:1e6,maxHp:1e6,moveSpeed:0});
 r.state.cooldowns.sj_moon=0;
 for(let i=0;i<60&&!r.state.casts.some(c=>c.skill==='sj_moon'&&c.locked);i++)r.advance(1/60);
 r.state.cooldowns.sj_moon=9999;
 const p=r.state.player;
 const side={...e,id:'moon-side',ai:{...e.ai},x:p.x,y:p.y+110};
 const outside={...e,id:'moon-outside',ai:{...e.ai},radius:1,x:p.x+250,y:p.y};
 r.state.enemies.push(side,outside);
 const seen=new Map(),hits=new Set();
 for(let i=0;i<70;i++){
  r.advance(1/60);
  assert.equal(r.state.projectiles.some(s=>s.source==='sj_moon'),false);
  for(const fx of r.state.effects.filter(f=>f.source==='sj_moon')){
   if(fx.kind==='cross'){seen.set(fx.id,fx);assert.equal(fx.x,p.x);assert.equal(fx.y,p.y)}
   if(fx.kind==='hit'&&fx.targetId===e.id)hits.add(fx.id);
  }
 }
 assert.equal(seen.size,1);assert.ok(e.hp<1e6);assert.ok(side.hp<1e6);assert.equal(outside.hp,1e6);
 assert.equal(r.state.effects.some(f=>f.source==='sj_moon'&&f.kind==='cross'),false);
});

test('stationary Xuanyue normal combat saves and restores',()=>{const {r}=fixture('sj_moon',220);for(let i=0;i<60;i++){r.advance(1/60);assert.equal(validateTowerSnapshot(r.snapshot()),true);assert.deepEqual(TowerRun.restore(r.snapshot()).snapshot(),r.snapshot())}});
