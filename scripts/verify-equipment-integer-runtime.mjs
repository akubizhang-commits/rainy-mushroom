// Real 60Hz combat against explicitly controlled immortal targets.
// Not a win-rate test. Natural Campaign runs are recorded separately.
import assert from 'node:assert/strict'
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import {createHash} from 'node:crypto'
const option=(k,f)=>process.argv.find(a=>a.startsWith(`--${k}=`))?.slice(k.length+3)??f
const version=option('version','after'),phase=option('phase','standard')
assert.ok(['before','after'].includes(version))
assert.ok(['standard','expanded','edge','dilution'].includes(phase))
const standardLike=phase==='standard'||phase==='dilution'
const root=new URL(version==='before'?'../reports/equipment-integer-v2-2026-11-03/before/':'../',import.meta.url)
const load=name=>import(new URL(`js/xianxia/${name}.js`,root))
const [W,G,C,P,R,Growth]=await Promise.all(['TowerWeapons','TowerEquipment','TowerRun','TowerProfile','TowerEquipmentRoster','TowerGrowth'].map(load))
const out=new URL(`../reports/equipment-integer-v2-2026-11-03/${version}-${phase}.json`,import.meta.url)
const roster=R.EQUIPMENT_ROSTER
const make=d=>d.category==='weapon'?W.createFixedWeapon(d.id,d.quality?d.id:'iron'):G.createFixedEquipment(d.id,d.quality?d.id:`basic-${d.category}`)
const levels={fan:1,fa:4,bao:11,ling:21}
const skills={
 1:{qi:{sj_arc:1},array:{sj_wanjian:1}},
 4:{qi:{sj_arc:3},pursuit:{sj_yujian:1},array:{sj_wanjian:3},mixed:{sj_arc:1,sj_wanjian:1}},
 11:{qi:{sj_arc:6,sj_line:1},pursuit:{sj_yujian:3,sj_shadow:1},array:{sj_wanjian:6,sj_formation:1},mixed:{sj_arc:3,sj_wanjian:3,sj_formation:1}},
 21:{qi:{sj_arc:9,sj_line:4},pursuit:{sj_yujian:3,sj_shadow:4},array:{sj_wanjian:9,sj_formation:4},mixed:{sj_arc:6,sj_wanjian:6,sj_shadow:3}},
}
function definitions(tier,q,route){
 const caster=['array','mixed'].includes(route)
 return ['weapon','armor','ring'].map(category=>{
  const role=tier==='fan'?'transition':q===4?(caster?'master':'graduate'):
   category==='weapon'?(route==='qi'?'qi':route==='array'?'formation':'general'):category==='armor'?(caster?'recovery':'guard'):(caster?'cadence':'burst')
  const d=roster.find(d=>d.category===category&&d.tier===tier&&d.quality===q&&d.role===role)
  assert.ok(d,`${tier}/${q}/${category}/${role}`);return d
 })
}
function loadout(defs,active,passive={}){
 const items=Object.fromEntries(defs.map(d=>[d.category,make(d)]))
 return {growthVersion:1,skillsInitialized:true,active,passive,evolutions:[],evolutionLevels:{},tutorialWaves:0,
  ...items,weaponQuality:items.weapon.quality,weaponRefine:0,weaponFocusCount:0,
  ...Object.fromEntries(Object.entries(items).map(([k,v])=>[`${k}Id`,v.id]))}
}
function sample(defs,level,active,seed,seconds=180,count=1,passive={}){
 for(const [id,rank] of Object.entries({...active,...passive})){
  const d=Growth.GROWTH_SKILLS.find(d=>d.id===id)
  assert.ok(level>=d.learnLevel&&level>=d.rankRequirements[rank-1].characterLevel,`${id}/${rank}/${level}`)
  for(const [p,n] of Object.entries(d.rankRequirements[rank-1].prerequisites??{}))
   assert.ok((passive[p]??active[p]??0)>=n,`${id} requires ${p} ${n}`)
 }
 const xp=P.cultivationLevelXp(level),l=loadout(defs,active,passive),stats=C.stats(xp,l)
 const spent=Growth.spentPoints({skillsInitialized:true,skills:{...active,...passive}})
 assert.ok(spent<=Growth.realmPoints(xp)+1,`Fixture overspends naturally available points: ${spent}`)
 const run=new C.TowerRun({attemptId:1,floor:9,seed,xp,hp:stats.maxHp,training:true,loadout:l})
 for(const id of Object.keys(l.active))run.state.cooldowns[id]=1e9
 for(let i=0;i<600&&!run.state.enemies.length;i++)run.advance(1/60)
 const template=run.state.enemies[0];assert.ok(template)
 run.state.enemies=Array.from({length:count},(_,i)=>({...structuredClone(template),id:`controlled-${i}`,hp:1e12,maxHp:1e12,radius:24,
  mechanic:undefined,speed:0,ai:{...structuredClone(template.ai),graceUntil:1e9}}))
 run.state.pending=[];run.state.reserved=[];run.state.projectiles=[];run.state.zones=[]
 for(const id of Object.keys(l.active))run.state.cooldowns[id]=0
 const start=run.state.time,warmup=seconds===180?30:Math.min(10,seconds/3)
 let damage=0,hits=0,damageBySource={},manaMin=stats.maxMana
 const original=run._damageEnemy
 run._damageEnemy=function(hit){
  const e=this.state.enemies.find(e=>e.id===hit.target),before=e?.hp??0
  const value=original.call(this,hit)
  if(this.state.time>=start+warmup&&e){
   const delta=Math.max(0,before-e.hp),source=hit.impact?.skill??hit.source??'unknown'
   damage+=delta;hits++;damageBySource[source]=(damageBySource[source]??0)+delta
  }
  return value
 }
 for(let i=0;i<seconds*60;i++){
  const p=run.state.player
  run.state.enemies.forEach((e,j)=>{
   e.x=p.x+100+(count===5?j*45:(j%5)*8);e.y=p.y+(count===5?(j%2?1:-1)*j*45:Math.floor(j/5)*8)
   e.ai.graceUntil=1e9
  })
  run.advance(1/60);manaMin=Math.min(manaMin,p.mana)
  assert.equal(run.state.phase,'playing');assert.equal(run.state.enemies.length,count)
 }
 return {dps:damage/(seconds-warmup),damage,hits,damageBySource,manaMin,manaSpent:run.state.manaState.spent,stats}
}
const result={version,phase,method:'Actual TowerRun.advance(1/60), fixed immortal stationary targets, normal mana/CD/action/crit/weapon rolls and automatic basic attacks. 180s samples discard 30s; other durations discard up to 10s. Not natural progression or human win rates.',
 rulings:['Pursuit training is rank 3 at Lv11/21: proposed rank 4/7 requires spirit passive, conflicting with no-passive fixture. Same legal rank applied to both versions.'],
 sources:Object.fromEntries(['TowerEquipmentFixed','TowerWeapons','TowerEquipment','TowerRun','TowerGrowth'].flatMap(name=>{
  try{return [[name,createHash('sha256').update(readFileSync(new URL(`js/xianxia/${name}.js`,root))).digest('hex')]]}catch{return []}
 })),rows:[]}
const baseline=roster.filter(d=>!d.quality)
const filter=option('tier','all')
if(phase==='edge'){
 const baselineCache=new Map()
 const ids=[
 ['eq_sword_zhaodan','eq_armor_yunwen','eq_ring_dingxin'],
 ['eq_sword_zhaoyuan','eq_armor_chengxiao','eq_ring_zhenxin'],
 ['eq_sword_taiheng','eq_armor_chengxiao','eq_ring_weiming'],
 ['eq_sword_taiheng','eq_armor_chengxiao','eq_ring_dingwei'],
 ['eq_sword_taiheng','eq_armor_wugou','eq_ring_zhenxin'],
 ['eq_sword_kunwu','eq_armor_yuheng','eq_ring_weiming'],
 ['eq_sword_duanliu','eq_armor_chengxiao','eq_ring_weiming'],
 ]
 for(const set of ids){
 for(const skill of ['sj_arc','sj_wanjian','sj_line','sj_formation','sj_yujian','sj_shadow'])
 for(const rank of [1,2,3,4,5,6,7,8,9,10])for(const withPassive of [false,true]){
  const level=set[0]==='eq_sword_zhaodan'?4:set[0]==='eq_sword_kunwu'?11:21
  const passive={}
  if(withPassive)for(const id of ['sj_spirit','sj_bone']){
   const d=Growth.GROWTH_SKILLS.find(d=>d.id===id)
   const rank=d.rankRequirements.slice(0,3).filter(r=>r.characterLevel<=level&&d.learnLevel<=level).length
   if(rank)passive[id]=rank
  }
  const definition=Growth.GROWTH_SKILLS.find(d=>d.id===skill)
  if(definition.rankRequirements[rank-1].characterLevel>level)continue
  for(const [id,n] of Object.entries(definition.rankRequirements[rank-1].prerequisites??{}))passive[id]=Math.max(passive[id]??0,n)
  if(Growth.spentPoints({skillsInitialized:true,skills:{[skill]:rank,...passive}})>Growth.realmPoints(P.cultivationLevelXp(level))+1)continue
  const active={[skill]:rank},seed=101,seconds=180,count=1
  const defs=set.map(id=>roster.find(d=>d.id===id))
  const key=JSON.stringify({level,active,passive,seed,seconds,count})
  if(!baselineCache.has(key))baselineCache.set(key,sample(baseline,level,active,seed,seconds,count,passive))
  const empty=baselineCache.get(key)
  assert.ok(empty.dps>0,`Empty baseline: ${skill}/${rank}/${level}`)
  const actual=sample(defs,level,active,seed,seconds,count,passive)
  result.rows.push({ids:set,level,seed,seconds,count,active,passive,baselineDps:empty.dps,ratio:actual.dps/empty.dps,...actual})
 }
 writeFileSync(out,JSON.stringify(result,null,2)+'\n')
 console.log(version,phase,set[0],set[2],'rows',result.rows.length)
 }
 result.complete=true;writeFileSync(out,JSON.stringify(result,null,2)+'\n')
 console.log(version,phase,result.rows.length,'max',Math.max(...result.rows.map(r=>r.ratio)))
}else{
for(const tier of ['fan','fa','bao','ling'].filter(t=>filter==='all'||filter===t)){
 const level=phase==='dilution'?{fan:3,fa:10,bao:20,ling:30}[tier]:levels[tier]
 for(const [route,active] of Object.entries(skills[levels[tier]])){
  const cases=standardLike?[[180,1]]:[[30,1],[600,1],[180,5],[180,20]]
  for(const [seconds,count] of cases)for(const seed of (standardLike?[101,211,307]:[101])){
   const empty=sample(baseline,level,active,seed,seconds,count)
   assert.ok(empty.dps>0,`Empty baseline: ${tier}/${route}/${seconds}/${count}`)
   for(let q=1;q<=(tier==='fan'?1:4);q++){
    if(!standardLike&&q!==1&&q!==4)continue
    const defs=definitions(tier,q,route),actual=sample(defs,level,active,seed,seconds,count)
    result.rows.push({tier,quality:q,route,level,seed,seconds,count,active,ids:defs.map(d=>d.id),baselineDps:empty.dps,ratio:actual.dps/empty.dps,...actual})
   }
  }
  mkdirSync(new URL('.',out),{recursive:true});writeFileSync(out,JSON.stringify(result,null,2)+'\n')
  console.log(version,phase,tier,route,'rows',result.rows.length)
 }
}
result.complete=true;writeFileSync(out,JSON.stringify(result,null,2)+'\n')
}
