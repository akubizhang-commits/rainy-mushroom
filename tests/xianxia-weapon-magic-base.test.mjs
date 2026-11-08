import test from 'node:test'
import assert from 'node:assert/strict'
import * as W from '../js/xianxia/TowerWeapons.js'
import * as D from '../js/xianxia/TowerDamage.js'
import { TowerRun, stats, validateTowerSnapshot } from '../js/xianxia/TowerRun.js'

function fixture() {
  const weapon=W.createIronWeapon()
  const loadout={growthVersion:1,skillsInitialized:true,active:{},passive:{},evolutions:[],
    evolutionLevels:{},tutorialWaves:0,weapon,weaponId:weapon.id,weaponQuality:0,weaponRefine:0,weaponFocusCount:0}
  const run=new TowerRun({attemptId:1,floor:9,seed:41,hp:100,xp:0,training:true,loadout})
  for(let i=0;i<600&&!run.state.enemies.length;i++)run.advance(1/60)
  const enemy=run.state.enemies[0]
  for(const e of run.state.enemies)e.ai.graceUntil=9999
  enemy.x=run.state.player.x+85;enemy.y=run.state.player.y
  return {run,enemy,loadout}
}
test('each fixed weapon has a separate magic base and visible physical/magic ranges',()=>{
  assert.equal(typeof W.weaponFlatMagicAttack,'function')
  for(const d of W.WEAPONS){
    const w=W.createFixedWeapon(d.id,d.quality?'audit':'iron')
    assert.equal(W.weaponMagicAttackRange(w).mean,W.weaponFlatMagicAttack(w))
    assert.equal(W.weaponAttackRange(w).mean,W.weaponFlatAttack(w))
    assert.ok(W.weaponSummary(w).baseLines.some(s=>s.includes('基础法术攻击')))
    assert.ok(W.weaponSummary(w).baseLines.some(s=>s.includes('基础物理攻击')))
    assert.equal(W.weaponSummary(w).affixLines.length,w.affixes.length)
  }
  const {loadout}=fixture(), equipped=stats(0,loadout), empty=stats(0,{...loadout,weaponEquipped:false})
  assert.equal(equipped.magicAttack-empty.magicAttack,5)
})
test('hybrid uses half of each distinct attack channel instead of half the sum twice',()=>{
  assert.equal(typeof D.attackDamageParts,'function')
  assert.deepEqual(D.attackDamageParts(200,'hybrid',100,160),{physical:100,magic:160})
  assert.deepEqual(D.attackDamageParts(200,'physical',100,160),{physical:200,magic:0})
  assert.deepEqual(D.attackDamageParts(200,'magic',100,160),{physical:0,magic:320})
})
test('real hybrid hit and crit use the captured magic base; pure physical ignores it',()=>{
  const {run,enemy}=fixture(),context=run._attackContext()
  assert.equal(typeof context.weaponMagicAttack,'number')
  context.weaponAttack=4;context.weaponMagicAttack=6
  const hit=source=>{
    enemy.hp=enemy.maxHp=10000;enemy.physicalDefense=enemy.magicDefense=0
    run._damageEnemy({target:enemy.id,source,damage:114,direct:true,castContext:context})
    return run.state.effects.at(-1)
  }
  const mixed=hit('sj_shadow')
  assert.equal(mixed.damage,105)
  assert.ok(Math.abs(mixed.damageParts.physical-57)<1e-8)
  assert.ok(Math.abs(mixed.damageParts.magic-48)<1e-8)
  assert.equal(hit('basic_attack').damage,114)
  context.loadout.passive.sj_heart=1;run._random=()=>0
  const critical=hit('sj_shadow')
  assert.equal(critical.damage,157.5)
  assert.ok(Math.abs(critical.damageParts.physical-85.5)<1e-8)
  assert.ok(Math.abs(critical.damageParts.magic-72)<1e-8)
})
test('pending swing stores magic sampling and rejects missing or out-of-range values',()=>{
  const {run}=fixture()
  run.advance(1/60)
  const snapshot=run.snapshot()
  assert.equal(typeof snapshot.actions.basic.castContext.weaponMagicAttack,'number')
  assert.ok(validateTowerSnapshot(snapshot))
  const missing=structuredClone(snapshot);delete missing.actions.basic.castContext.weaponMagicAttack
  assert.equal(validateTowerSnapshot(missing),false)
  const forged=structuredClone(snapshot);forged.actions.basic.castContext.weaponMagicAttack=999
  assert.equal(validateTowerSnapshot(forged),false)
  const restored=TowerRun.restore(snapshot)
  for(let i=0;i<15;i++){run.advance(1/60);restored.advance(1/60)}
  assert.deepEqual(restored.snapshot(),run.snapshot())
})
