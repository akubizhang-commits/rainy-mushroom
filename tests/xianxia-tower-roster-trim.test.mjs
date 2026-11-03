import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {FLOORS,ARCHETYPES} from '../js/xianxia/TowerContent.js'
const A=Object.fromEntries(ARCHETYPES.map(a=>[a.id,a]))
const before=JSON.parse(fs.readFileSync(new URL('../design/tower-roster-trim-2026-11-01/before-tower-design.json',import.meta.url))).floors
const pools=[['boar','wolf','spider'],['wolf','boar','bat'],['spider','bat','wolf'],['crocodile','boar','bat'],['snake','crocodile','spider'],['bear','boar','bat'],['boar','tiger','falcon'],['wolf','spider','snake','bear'],['tiger','wolf','falcon']]
const hist=w=>{const h={};for(const g of w.enemy_groups){const a=A[g.archetype],k=`${a.role}:${g.rank}`;h[k]=(h[k]||0)+g.count}return h}
test('eleven deployed families; three species reserved without deleting prototypes',()=>{
 const deployed=new Set()
 for(const [i,f] of FLOORS.entries()){
  const normal=new Set()
  for(const w of f.waves) for(const g of w.enemy_groups){const a=A[g.archetype],family=a.id.split('_')[0];deployed.add(family);if(a.role==='normal')normal.add(family);assert.ok(!['ape','scorpion','centipede'].includes(family))}
  assert.deepEqual([...normal].sort(),[...pools[i]].sort())
  assert.deepEqual([...f.normal_family_pool].sort(),[...pools[i]].sort())
 }
 assert.equal(deployed.size,11)
 for(const family of ['ape','scorpion','centipede'])assert.ok(ARCHETYPES.some(a=>a.id===family+'_normal'))
})
test('normal quantities and final bosses preserved under new rank budgets; heavy bodies stay bounded',()=>{
 for(const [i,f] of FLOORS.entries()){
  assert.equal(f.boss_id,before[i].boss_id);assert.equal(f.boss_rank,before[i].boss_rank)
  for(const [j,w] of f.waves.entries()){
   assert.equal(w.normal_count,before[i].waves[j].normal_count,`${i+1}/${j+1} normal count`)
   const normals=w.enemy_groups.filter(g=>A[g.archetype].role==='normal'),count=normals.reduce((n,g)=>n+g.count,0)
   const heavy=normals.filter(g=>['bear','tiger','crocodile','ape'].includes(g.archetype.split('_')[0])).reduce((n,g)=>n+g.count,0)
   assert.ok(heavy/count<=.4,`${i+1}/${j+1} heavy`)
   if(w.wave>=4)assert.ok(new Set(normals.map(g=>g.archetype.split('_')[0])).size>=2)
  }
 }
})

test('all nine floors complete authored waves, restore snapshots and serialize elite spawns',async()=>{
 const {TowerRun,validateTowerSnapshot}=await import('../js/xianxia/TowerRun.js')
 const loadout={active:{sj_yujian:1},passive:{},evolutions:[],weaponId:'eq_sword_suwen',weaponQuality:1,weaponRefine:0}
 for(let floor=1;floor<=9;floor++){
  let run=new TowerRun({attemptId:1,floor,seed:101+floor,hp:100,xp:0,arenaVersion:1,loadout})
  run.setPlaytestAssist(true)
  const checked=new Set(),seen=new Set()
  for(let step=0;step<30000;step++){
   run.resume()
   assert.ok(run.state.enemies.filter(e=>e.role==='elite'&&!e.temporary).length<=1,`floor ${floor} elite overlap`)
   for(const e of [...run.state.enemies]){
    assert.ok(!['ape','scorpion','centipede'].includes(e.family))
    if(!e.temporary)seen.add(e.id)
    run._damageEnemy({target:e.id,damage:1e12,direct:false,scaled:true,source:'roster-test'})
   }
   run.advance(.1)
   if([5,15,20].includes(run.state.wave)&&!checked.has(run.state.wave)){
    const snapshot=run.snapshot();assert.ok(validateTowerSnapshot(snapshot),`floor ${floor} wave ${run.state.wave}`)
    run=TowerRun.restore(JSON.parse(JSON.stringify(snapshot)));run.setPlaytestAssist(true);checked.add(run.state.wave)
   }
   const expected=FLOORS[floor-1].waves.reduce((n,w)=>n+w.planned_required,0)
   if(run.state.killLedger.length===expected){assert.equal(seen.size,expected);break}
  }
  assert.equal(run.state.killLedger.length,FLOORS[floor-1].waves.reduce((n,w)=>n+w.planned_required,0),`floor ${floor} complete`)
  assert.equal(checked.size,3)
 }
})
