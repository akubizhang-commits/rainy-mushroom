import { NORMAL_HP_BY_FLOOR, NORMAL_DAMAGE_BY_FLOOR } from '../js/xianxia/TowerEnemyStats.js' // 2026-11-09：普通怪按楼层加血降伤，精英不受影响
import {monsterHealthMultiplier} from '../js/xianxia/TowerMonsterAttributes.js'
import {currentCampaignSchema} from './helpers/tower-schema.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import {ARCHETYPES,MONSTER_RANK_BASELINE,FLOORS} from '../js/xianxia/TowerContent.js'
import {towerEnemyStats} from '../js/xianxia/TowerEnemyStats.js'
import {enemyAttackSpec} from '../js/xianxia/TowerEnemyAttacks.js'
import {initializeMonsterMechanics,MONSTER_SKILLS,tickMonsterMechanics} from '../js/xianxia/TowerMonsterMechanics.js'
const hp=[0,4,4,8,20,24,28,28,28,28]
test('elite durability follows explicit rank budgets; normal and boss budgets do not inherit it',()=>{
 for(const a of ARCHETYPES.filter(a=>a.role==='elite')){
  const e=towerEnemyStats(a,9,18),n=towerEnemyStats({...a,role:'normal'},9,18)
  assert.ok(Math.abs(e.hp/n.hp*NORMAL_HP_BY_FLOOR[8]-hp[a.rank])<1e-9,a.id)
  assert.ok(Math.abs(e.damage/n.damage*NORMAL_DAMAGE_BY_FLOOR[8]-1.7)<1e-9,a.id)
  const early=towerEnemyStats(a,1,18);assert.deepEqual({...early,attackInterval:e.attackInterval},e);assert.equal(early.attackInterval,a.species==='spider'?1.8:e.attackInterval)
  assert.equal(e.moveSpeed,n.moveSpeed)
  const attack=enemyAttackSpec({...e,radius:34,family:'wolf',role:'elite'},50,0)
  assert.equal(attack.damage,e.damage)
 }
 const boss=towerEnemyStats(ARCHETYPES.find(a=>a.id==='boar_boss'),1,20);assert.equal(boss.hp,18400*monsterHealthMultiplier(boss))
 assert.equal(MONSTER_RANK_BASELINE.normal_hp[4],4000)
})
test('only elite initial mechanic waits are shortened; authored readable windups remain',()=>{
 for(const family of ['boar','wolf','spider','tiger']){
  const state={floor:1,time:10,monsterMechanics:{}};
  const elite={family,role:'elite'},boss={family,role:'boss'};
  initializeMonsterMechanics({state},elite);initializeMonsterMechanics({state},boss)
  const skill=elite.mechanic.skills[0];assert.equal(elite.mechanic.cooldowns[skill],10+Math.min(4,MONSTER_SKILLS[skill].first))
  for(const id of boss.mechanic.skills)assert.equal(boss.mechanic.cooldowns[id],10+MONSTER_SKILLS[id].first)
 }
 assert.equal(MONSTER_SKILLS.M06.windup,1.3)
})
test('elite mechanic damage receives its own boost even when floor safety cap applies',()=>{
 const a=ARCHETYPES.find(a=>a.role==='elite'&&a.species==='spider'&&a.rank===3)
 const base=towerEnemyStats(a,3,5),e={...base,id:'elite',archetype:a.id,role:'elite',family:'spider',rank:a.rank,x:150,y:-60,hp:base.hp,maxHp:base.hp,radius:34,ai:{mode:'approach',graceUntil:0,entryUntil:0}};
 const state={time:0,floor:3,wave:5,arenaVersion:1,player:{x:33,y:-60,radius:18},enemies:[e],projectiles:[],zones:[],monsterMechanics:{version:1,zones:[],sequence:0,nextMajorAt:0}};
 const run={state,_visible:()=>true};initializeMonsterMechanics(run,e)
 for(let i=0;i<250;i++){state.time+=1/60;tickMonsterMechanics(run,[])}
 const z=state.monsterMechanics.zones.find(z=>z.skillId==='M10');assert.ok(z)
 assert.equal(z.damage,Math.min(e.damage,FLOORS[2].floor_stat_scale.boss_damage*.8)*2.5*1.25)
})
test('elite revision resets only obsolete mode saves and leaves a failed reset untouched',async()=>{
 const {TowerCampaignStore,TOWER_CAMPAIGN_KEY}=await import('../js/xianxia/TowerCampaign.js');
 const disk=new Map([['unrelated-save','keep']]);let fail=false;
 const storage={getItem:k=>disk.get(k)??null,setItem:(k,v)=>{if(fail)throw Error('disk full');disk.set(k,v)}};
 const original=new TowerCampaignStore(storage,0);assert.ok(original.act({type:'sync'},0).ok);
 const envelope=JSON.parse(disk.get(TOWER_CAMPAIGN_KEY));assert.equal(envelope.schema,currentCampaignSchema);envelope.schema=currentCampaignSchema-1;
 const obsolete=JSON.stringify(envelope);disk.set(TOWER_CAMPAIGN_KEY,obsolete);fail=true;
 const blocked=new TowerCampaignStore(storage,0);assert.equal(blocked.readOnly,true);assert.equal(disk.get(TOWER_CAMPAIGN_KEY),obsolete);
 fail=false;const reset=new TowerCampaignStore(storage,0);assert.equal(reset.readOnly,false);assert.equal(reset.migrationReport.reset,true);assert.equal(JSON.parse(disk.get(TOWER_CAMPAIGN_KEY)).schema,currentCampaignSchema);assert.equal(disk.get('unrelated-save'),'keep');
 assert.equal(new TowerCampaignStore(storage,0).readOnly,false);
});
