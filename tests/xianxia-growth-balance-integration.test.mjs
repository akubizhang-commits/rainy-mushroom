import {monsterHealthMultiplier} from '../js/xianxia/TowerMonsterAttributes.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import {forgingRecipe,forgingQuote} from '../js/xianxia/TowerForging.js'
import {TowerCampaignStore} from '../js/xianxia/TowerCampaign.js'
import {TowerRun,validateTowerSnapshot} from '../js/xianxia/TowerRun.js'
import {TOWER_RESOURCE_CAP,cultivationLevelXp} from '../js/xianxia/TowerProfile.js'
import {checksum} from '../js/xianxia/Checksum.js'
import {towerEnemyStats} from '../js/xianxia/TowerEnemyStats.js'
import {ARCHETYPES,FLOORS} from '../js/xianxia/TowerContent.js'

test('targeted boss HP tuning preserves early bosses, attack and speed',()=>{
  for(let floor=1;floor<=9;floor++){
    const a=ARCHETYPES.find(a=>a.id===FLOORS[floor-1].boss_id),scale=FLOORS[floor-1].floor_stat_scale
    const stats=towerEnemyStats(a,floor,20),factor=[1,1,1.55,1.2,1.5,1.45,1.2,1.65,1.65][floor-1]
    assert.equal(stats.hp,scale.boss_hp*(a.floor_hp_factor??1)*factor*monsterHealthMultiplier(stats))
    assert.equal(stats.damage,scale.boss_damage)
    assert.equal(stats.moveSpeed,a.move_speed*(a.floor_speed_factor??1))
  }
})

function fixture(floor, extra={}) {
  const disk={raw:null,fail:false,getItem(){return this.raw},setItem(k,v){if(this.fail)throw Error('disk full');this.raw=v}}
  const initial=new TowerCampaignStore(disk,101);assert.ok(initial.act({type:'sync'},0).ok)
  const envelope=JSON.parse(disk.raw)
  const state={...initial.state,xp:cultivationLevelXp((floor-1)*3+1),clearedFloor:floor-1,
    ...extra,pills:{...initial.state.pills,...extra.pills}}
  envelope.data=JSON.stringify(state);envelope.checksum=checksum(envelope.data);disk.raw=JSON.stringify(envelope)
  const store=new TowerCampaignStore(disk,101);assert.equal(store.readOnly,false,store.error)
  return {disk,store}
}
function victory(store,floor) {
  const start=store.act({type:'startFloor',floor,seed:101},0);assert.ok(start.ok,start.reason)
  const run=TowerRun.restore(start.snapshot)
  // Persistence fixture: real spawn/kill ledgers with controlled HP and position.
  // This is not a difficulty or balance simulation.
  for(let frame=0;frame<100000&&['playing','paused'].includes(run.state.phase);frame++){
    run.resume();run.state.player.hp=run.state.player.maxHp
    for(const e of run.state.enemies){e.hp=1;e.x=run.state.player.x+60;e.y=run.state.player.y;e.ai.graceUntil=run.state.time+10}
    run.advance(1/30)
  }
  assert.equal(run.state.phase,'won')
  const snapshot=run.snapshot();assert.ok(validateTowerSnapshot(snapshot));return snapshot
}

test('approved top recipes retain tier gates and scale batch charges exactly',()=>{
  for(const [tier,unit,main,core,stones,level] of [['fa',16,28,1,1200,4],['bao',32,40,1,2400,11],['ling',64,56,2,4800,21]]){
    for(const category of ['weapon','armor','ring']){
      const r=forgingRecipe(`${category}:${tier}:q4`)
      assert.deepEqual(r.ingredients.map(a=>a.count),[unit*2,unit,unit,main,core])
      assert.equal(r.spiritStones,stones)
      const s={xp:cultivationLevelXp(level),pills:Object.fromEntries(r.ingredients.map(a=>[a.id,a.count*2])),spiritStones:stones*2,contribution:0,weapons:{},equipment:{}}
      assert.ok(forgingQuote(s,r.id,2).ok)
      assert.equal(forgingQuote({...s,spiritStones:stones*2-1},r.id,2).reason,'insufficient')
      assert.equal(forgingQuote({...s,xp:cultivationLevelXp(level-1)},r.id,1).reason,'realm-locked')
    }
  }
})

for(const [floor,tier] of [[2,'fa'],[5,'bao'],[8,'ling']])test(`floor ${floor} first-clear core is atomic, visible, reload-safe and awarded once`,()=>{
  const {store,disk}=fixture(floor),snapshot=victory(store,floor),id=`forge_core_${tier}`
  assert.ok(store.act({type:'checkpoint',snapshot},0).ok)
  const before=store.state,raw=disk.raw,amount=before.pills[id],action={type:'finishFloor',snapshot}
  disk.fail=true;assert.equal(store.act(action,0).reason,'save-failed');assert.equal(store.state,before);assert.equal(disk.raw,raw)
  disk.fail=false;const result=store.act(action,0);assert.ok(result.ok,result.reason)
  assert.equal(store.state.pills[id],amount+1)
  assert.ok(result.materials.some(r=>r.id===id&&r.count>=1))
  const reload=new TowerCampaignStore(disk,101);assert.deepEqual(reload.state,store.state)
  assert.equal(reload.act(action,0).reason,'wrong-attempt');assert.equal(reload.state.pills[id],amount+1)
  const again=victory(reload,floor);assert.ok(reload.act({type:'checkpoint',snapshot:again},0).ok)
  const repeatedAmount=reload.state.pills[id]
  assert.ok(reload.act({type:'finishFloor',snapshot:again},0).ok)
  assert.equal(reload.state.lastResult.firstClear,false);assert.equal(reload.state.pills[id],repeatedAmount)
})

test('guaranteed core at capacity follows material overflow rather than disappearing or exceeding cap',()=>{
  const id='forge_core_fa',{store,disk}=fixture(2,{pills:{[id]:TOWER_RESOURCE_CAP}})
  const snapshot=victory(store,2);assert.ok(store.act({type:'checkpoint',snapshot},0).ok)
  const stones=store.state.spiritStones,converted=store.state.activeRun.materialOverflow.convertedStones
  const result=store.act({type:'finishFloor',snapshot},0);assert.ok(result.ok,result.reason)
  assert.equal(store.state.pills[id],TOWER_RESOURCE_CAP)
  assert.equal(store.state.spiritStones,stones+100+20)
  assert.equal(result.materialOverflow.convertedStones,converted+20)
  assert.deepEqual(new TowerCampaignStore(disk,0).state,store.state)
})
