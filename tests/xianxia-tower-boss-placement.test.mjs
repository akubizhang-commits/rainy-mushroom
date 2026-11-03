import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { FLOORS, ARCHETYPES } from '../js/xianxia/TowerContent.js'
const A = Object.fromEntries(ARCHETYPES.map(a => [a.id,a]))
const normals = w => w.enemy_groups.filter(g=>A[g.archetype].role==='normal').flatMap(g=>Array(g.count).fill(A[g.archetype].species+'_normal'))
test('boss identities remain final while stone-pass opening introduces ground beasts',()=>{
 assert.deepEqual(FLOORS.map(f=>f.boss_id),['boar_boss','wolf_boss','spider_boss','crocodile_boss','snake_boss','bear_boss','rhino_boss','yak_boss','tiger_boss_zhenyan'])
 assert.deepEqual(FLOORS.map(f=>f.boss_rank),[3,3,4,4,5,5,6,6,7])
 assert.equal(FLOORS[6].name,'震岳石关')
 assert.equal(normals(FLOORS[6].waves[1]).filter(a=>a==='tiger_normal').length,9)
 assert.equal(normals(FLOORS[6].waves[10]).filter(a=>a==='falcon_normal').length,9)
})
test('support batches spread flying pressure and preserve eight native supports',()=>{
 const ninth=normals(FLOORS[8].waves[19])
 assert.equal(ninth.length,8)
 assert.equal(ninth.slice(0,4).filter(a=>a==='falcon_normal').length,2)
 assert.equal(ninth.slice(4).filter(a=>a==='falcon_normal').length,3)
 const fourth=normals(FLOORS[3].waves[19])
 assert.equal(fourth[0],'crocodile_normal')
 assert.equal(fourth.slice(0,4).filter(a=>a==='crocodile_normal').length,2)
 assert.equal(fourth.slice(4).filter(a=>a==='crocodile_normal').length,1)
 for(const f of FLOORS) for(const w of f.waves){
  const n=normals(w),heavy=n.filter(id=>['tiger','ape','bear','crocodile'].includes(id.split('_')[0])).length
  assert.ok(heavy/n.length<=.4,`${f.floor}/${w.wave}`)
 }
})
test('menu uses combat art resolution and current rhino/yak lore',()=>{
 const source=fs.readFileSync(new URL('../cocos-pilot/assets/scripts/TowerMenu.ts',import.meta.url),'utf8')
 assert.match(source,/TowerMonsterArt\.artFamily\(/)
 assert.doesNotMatch(source,/裂风隼王盘旋|撼岩猿王守着/)
 assert.match(source,/震岳犀王/)
 assert.match(source,/苍鬃牛魔王/)
})

test('runtime registers both finite support batches with exactly one boss',async()=>{
 const {TowerRun}=await import('../js/xianxia/TowerRun.js')
 const loadout={active:{sj_yujian:1},passive:{},evolutions:[],weaponId:'eq_sword_suwen',weaponQuality:1,weaponRefine:0}
 for(const floor of [4,9]){
  const run=new TowerRun({attemptId:1,floor,seed:17,hp:100,xp:0,arenaVersion:1,loadout})
  run.state.wave=20;run._registerWave()
  const p=run.state.pending
  assert.equal(p.length,9)
  assert.equal(new Set(p.map(x=>x.id)).size,9)
  assert.equal(p.filter(x=>A[x.archetype].role==='boss'&&x.trigger==='start').length,1)
  assert.equal(p.filter(x=>A[x.archetype].role==='normal'&&x.trigger==='start').length,4)
  assert.equal(p.filter(x=>x.trigger==='half').length,4)
  if(floor===9) assert.equal(p.filter(x=>A[x.archetype].species==='falcon'&&x.trigger==='start').length,2)
 }
})
