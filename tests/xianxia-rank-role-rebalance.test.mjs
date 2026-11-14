import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
const data=()=>JSON.parse(fs.readFileSync('docs/xianxia/sect-tower-v1/data/tower-design.json'))
const normals=[{1:372},{1:300,2:110},{1:224,2:224},{2:486},{2:262,3:262},{3:450,4:112},{3:360,4:240},{3:256,4:350,5:32},{4:474,5:202}]
const elites=[{2:5},{2:3,3:2},{3:5},{3:3,4:2},{4:5},{4:3,5:2},{4:3,5:2},{4:3,5:2,6:1},{5:5,6:1}]
test('approved per-floor rank quotas, normal totals and distinct elite identities',()=>{
 const A=Object.fromEntries(JSON.parse(fs.readFileSync('docs/xianxia/sect-tower-v1/data/rank-attributes.json')).archetypes.map(a=>[a.id,a]))
 const allNames=[]
 data().floors.forEach((f,i)=>{
  const counts={normal:{},elite:{},boss:{}};const names=[]
  for(const w of f.waves){let n=0;for(const g of w.enemy_groups){const a=A[g.archetype];assert.equal(g.rank,a.rank);counts[a.role][a.rank]=(counts[a.role][a.rank]||0)+g.count;n+=g.count;if(a.role==='elite')for(let j=0;j<g.count;j++)names.push(a.name)}assert.equal(w.planned_required,n)}
  assert.deepEqual(counts.normal,normals[i],`floor ${i+1} normals`);assert.deepEqual(counts.elite,elites[i],`floor ${i+1} elites`)
  allNames.push(...names)
  assert.equal(new Set(names).size,names.length,`floor ${i+1} unique named leaders`)
  if(i>=7)assert.equal(f.waves[17].enemy_groups.filter(g=>A[g.archetype].role==='elite').reduce((n,g)=>n+g.count,0),1)
 })
 assert.equal(new Set(allNames).size,47,'all physical leaders have distinct individual names across the tower')
})
test('same species/rank share a normal baseline across floors; elite authored rank HP/damage; normal has no elite mechanics',async()=>{
 const {ARCHETYPES,MONSTER_RANK_BASELINE}=await import('../js/xianxia/TowerContent.js');const {towerEnemyStats}=await import('../js/xianxia/TowerEnemyStats.js')
 const {initializeMonsterMechanics}=await import('../js/xianxia/TowerMonsterMechanics.js')
 for(const a of ARCHETYPES.filter(a=>a.role==='elite'&&a.roster_revision==='rank-role-v1')){
  const n=ARCHETYPES.find(n=>n.role==='normal'&&n.species===a.species&&n.rank===a.rank);assert.ok(n,a.id)
  const e=towerEnemyStats(a,9,18),b=towerEnemyStats(n,9,18)
  // 2026-11-09：F4第15波两只蝙蝠精英另有单独血量系数（ENCOUNTER_HP_MULTIPLIERS）。
  const encounter=(await import('../js/xianxia/TowerEnemyStats.js')).ENCOUNTER_HP_MULTIPLIERS[a.id]??1
  // 2026-11-09：普通怪按楼层加血降伤（F9 与 F6 倍率不同），比例要先除去普通怪的楼层系数。
  const {NORMAL_HP_BY_FLOOR:H,NORMAL_DAMAGE_BY_FLOOR:Dm}=await import('../js/xianxia/TowerEnemyStats.js')
  assert.ok(Math.abs(e.hp/b.hp*H[8]-MONSTER_RANK_BASELINE.elite_hp_multiplier_by_rank[a.rank]*encounter)<1e-9);assert.ok(Math.abs(e.damage/b.damage*Dm[8]-MONSTER_RANK_BASELINE.elite_damage_multiplier)<1e-9)
  assert.equal(e.moveSpeed,b.moveSpeed)
  const f6=towerEnemyStats(n,6,18);assert.ok(Math.abs(f6.hp/H[5]-b.hp/H[8])<1e-9&&Math.abs(f6.damage/Dm[5]-b.damage/Dm[8])<1e-9)
 }
 for(const a of ARCHETYPES.filter(a=>a.role==='normal')){
  const enemy={family:a.species,role:'normal'};initializeMonsterMechanics({state:{floor:9,time:0}},enemy);assert.equal(enemy.mechanic,undefined)
 }
})
