import test from 'node:test'
import assert from 'node:assert/strict'
import {ARCHETYPES, FLOORS} from '../js/xianxia/TowerContent.js'
import {TowerRun, validateTowerSnapshot} from '../js/xianxia/TowerRun.js'
import {CORE_DROP_RULES} from '../js/xianxia/TowerLoot.js'
import {towerEnemyStats} from '../js/xianxia/TowerEnemyStats.js'
import {TowerCampaignStore,TOWER_CAMPAIGN_KEY} from '../js/xianxia/TowerCampaign.js'

const id='spider_elite_chixiao'
const loadout={active:{sj_yujian:1},passive:{},evolutions:[],weaponId:'eq_sword_suwen',weaponQuality:1,weaponRefine:0}

test('Chixiao is one named rank-six elite in floor eight wave eighteen; original spider boss stays rank four',()=>{
 const a=ARCHETYPES.find(a=>a.id===id)
 assert.ok(a)
 assert.deepEqual([a.name,a.rank,a.role],['赤绡蛛姬',6,'elite'])
 const placements=FLOORS.flatMap(f=>f.waves.flatMap(w=>w.enemy_groups.filter(g=>g.archetype===id).map(g=>[f.floor,w.wave,g.count,g.rank])))
 assert.deepEqual(placements,[[8,18,1,6]])
 const wave=FLOORS[7].waves[17]
 assert.equal(wave.enemy_groups.reduce((n,g)=>n+g.count,0),wave.normal_count+1)
 assert.equal(wave.elite.spider,1)
 assert.equal(ARCHETYPES.find(a=>a.id==='spider_boss').rank,4)
 assert.equal(FLOORS[2].boss_id,'spider_boss')
})

test('named rank-six elite keeps the approved 28x HP and 1.7x attack with nonzero loot chance',()=>{
 const a=ARCHETYPES.find(a=>a.id===id);assert.ok(a)
 const stats=towerEnemyStats(a,8,15)
 const normal=ARCHETYPES.find(n=>n.role==='normal'&&n.species==='spider'&&n.rank===6)
 assert.equal(stats.hp,towerEnemyStats(normal,8,15).hp*28)
 assert.equal(stats.damage,towerEnemyStats(normal,8,15).damage*1.7)
 const p=CORE_DROP_RULES[8].chancesByRole.elite[6]
 assert.ok(p>0&&p<=1)
})

test('authored spawn restores and pauses correctly and cannot award a second kill',()=>{
 assert.ok(ARCHETYPES.some(a=>a.id===id))
 const run=new TowerRun({attemptId:1,floor:8,seed:17,hp:100,xp:0,arenaVersion:1,loadout})
 run.setPlaytestAssist(true)
 for(let i=0;i<20000&&!run.state.enemies.some(e=>e.archetype===id);i++){
  run.resume()
  for(const e of [...run.state.enemies])run._damageEnemy({target:e.id,damage:1e12,direct:false,scaled:true,source:'fixture'})
  run.advance(.1)
 }
 const e=run.state.enemies.find(e=>e.archetype===id);assert.ok(e)
 assert.deepEqual([e.family,e.role,e.rank],['spider','elite',6])
 assert.deepEqual(e.mechanic.skills,['M10'])
 run.pause()
 const snapshot=run.snapshot();assert.ok(validateTowerSnapshot(snapshot))
 run.advance(5);assert.deepEqual(run.snapshot(),snapshot)
 const restored=TowerRun.restore(JSON.parse(JSON.stringify(snapshot)))
 assert.deepEqual(restored.snapshot(),snapshot)
 restored.resume()
 restored._damageEnemy({target:e.id,damage:1e12,direct:false,scaled:true,source:'fixture'})
 restored.advance(.1)
 const once=restored.state.killLedger.filter(k=>k.id===e.id).length
 restored._damageEnemy({target:e.id,damage:1e12,direct:false,scaled:true,source:'fixture'})
 restored.advance(.1)
 assert.equal(once,1)
 assert.equal(restored.state.killLedger.filter(k=>k.id===e.id).length,1)
 assert.ok(validateTowerSnapshot(restored.snapshot()))
})

test('old encounter schemas reset only this mode and failed reset writes preserve the original bytes',()=>{
 const disk=new Map([['other-game','keep']])
 const storage={getItem:k=>disk.get(k)??null,setItem:(k,v)=>disk.set(k,v)}
 const fresh=new TowerCampaignStore(storage,0)
 assert.equal(fresh.act({type:'sync'},0).ok,true)
 const record=JSON.parse(disk.get(TOWER_CAMPAIGN_KEY))
 const currentSchema=record.schema
 assert.ok(currentSchema>36)
 record.schema=36
 const old=JSON.stringify(record)
 disk.set(TOWER_CAMPAIGN_KEY,old)
 const failed=new TowerCampaignStore({...storage,setItem(){throw Error('disk full')}},0)
 assert.equal(failed.readOnly,true)
 assert.equal(failed.error,'save-failed')
 assert.equal(disk.get(TOWER_CAMPAIGN_KEY),old)
 assert.equal(disk.get('other-game'),'keep')
 const reset=new TowerCampaignStore(storage,0)
 assert.equal(reset.readOnly,false)
 assert.deepEqual(reset.migrationReport,{reset:true,fromSchema:36})
 assert.equal(disk.get('other-game'),'keep')
 const reloaded=new TowerCampaignStore(storage,0)
 assert.deepEqual(reloaded.state,reset.state)
})
