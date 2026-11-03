import test from 'node:test'
import assert from 'node:assert/strict'
import { FLOORS, ARCHETYPES } from '../js/xianxia/TowerContent.js'
import { TowerRun } from '../js/xianxia/TowerRun.js'
import { enemyAttackSpec } from '../js/xianxia/TowerEnemyAttacks.js'

test('seven and eight deploy rhino and yak bosses without replacing their normal waves', () => {
  for (const [floor, id, name, family] of [[7,'rhino_boss','震岳犀王','rhino'],[8,'yak_boss','苍鬃牛魔王','yak']]) {
    const config=FLOORS[floor-1];
    assert.equal(config.boss_id,id);
    assert.equal(config.boss_name,name);
    const group=config.waves[19].enemy_groups.find(g=>g.archetype===id);
    assert.equal(group.count,1);
    assert.equal(group.rank,6);
    const run=new TowerRun({attemptId:1,floor,seed:42,hp:100,xp:0,loadout:{active:{sj_wanjian:1},passive:{},evolutions:[],weaponId:'eq_sword_suwen',weaponQuality:1,weaponRefine:0}});
    const boss=run._enemy({id:'boss-test',archetype:id,x:0,y:0});
    assert.equal(boss.family,family);
    assert.equal(boss.name,name);
    assert.equal(boss.maxHp, config.floor_stat_scale.boss_hp*ARCHETYPES.find(a=>a.id===id).floor_hp_factor);
    assert.equal(ARCHETYPES.find(a=>a.id===id).role,'boss');
  }
  assert.equal(FLOORS[1].boss_id,'wolf_boss');
  assert.equal(FLOORS[8].boss_id,'tiger_boss_zhenyan');
});

test('rhino charges and yak stomps with cooldowns and no attack beyond their reach', () => {
  const e=family=>({family,role:'boss',radius:42,damage:100});
  const charge=enemyAttackSpec(e('rhino'),240,0);
  assert.equal(charge.kind,'charge');
  assert.equal(charge.shape,'capsule');
  assert.equal(enemyAttackSpec(e('rhino'),240,0,{charge:1}),null);
  assert.equal(enemyAttackSpec(e('rhino'),60,0).kind,'sweep');
  assert.equal(enemyAttackSpec(e('yak'),60,0).kind,'slam');
  assert.equal(enemyAttackSpec(e('yak'),60,0,{slam:1}),null);
  assert.equal(enemyAttackSpec(e('yak'),400,0),null);
});

// These tests isolate the native species selector; mechanics own the current charge schedule.
for (const [floor,family,distance,kind] of [[7,'rhino',240,'charge'],[7,'rhino',60,'sweep'],[8,'yak',60,'slam']]) {
 test(`${family} ${kind} uses floor heavy damage and respects cooldown`, () => {
  const run=new TowerRun({attemptId:1,floor,seed:42,hp:100,xp:0,loadout:{active:{sj_wanjian:1},passive:{},evolutions:[],weaponId:'eq_sword_suwen',weaponQuality:1,weaponRefine:0}});
  const e=run._enemy({id:'boss-test',archetype:`${family}_boss`,x:run.state.player.x+distance,y:run.state.player.y});
  const attack=run._baseAttackSpec(e);
  assert.equal(attack.kind,kind);
  assert.equal(attack.damage,FLOORS[floor-1].floor_stat_scale.boss_heavy_damage);
  e.ai.cooldowns[kind]=run.state.time+10;
  assert.equal(run._baseAttackSpec(e),null);
 });
}

for (const [floor,family,distance,kind,damageKey] of [[7,'falcon',240,'shot','boss_damage'],[8,'ape',60,'slam','boss_heavy_damage']]) {
 test(`reserve species at floor ${floor} ${family} uses its species attack and the correct damage budget`, () => {
  const run=new TowerRun({attemptId:1,floor,seed:42,hp:100,xp:0,loadout:{active:{sj_wanjian:1},passive:{},evolutions:[],weaponId:'eq_sword_suwen',weaponQuality:1,weaponRefine:0}});
  const e=run._enemy({id:'boss-test',archetype:`${family}_boss`,x:run.state.player.x+distance,y:run.state.player.y});
  const attack=run._baseAttackSpec(e);
  assert.equal(attack.kind,kind);
  assert.equal(attack.damage,FLOORS[floor-1].floor_stat_scale[damageKey]);
  if (family==='falcon') assert.equal(attack.element,'feather');
  e.ai.cooldowns[kind]=run.state.time+10;
  assert.equal(run._baseAttackSpec(e),null);
 });
}
