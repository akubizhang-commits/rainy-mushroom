import test from 'node:test'
import assert from 'node:assert/strict'
import { ARCHETYPES, MONSTER_RANK_BASELINE } from '../js/xianxia/TowerContent.js'
import { towerEnemyStats } from '../js/xianxia/TowerEnemyStats.js'
import { monsterAttributes, monsterHealthMultiplier, mitigateMonsterDamage, applyArmorBreak, tickMonsterAttributes,
  validMonsterAttributes, monsterControlDuration, summonedMonsterHp } from '../js/xianxia/TowerMonsterAttributes.js'
import { formationMovementMultiplier } from '../js/xianxia/TowerFormationControl.js'
import { addQingping } from '../js/xianxia/TowerQingping.js'
import { TowerRun, validateTowerSnapshot } from '../js/xianxia/TowerRun.js'
import { tickMonsterMechanics, validateMonsterMechanics } from '../js/xianxia/TowerMonsterMechanics.js'

const near = (a,b) => assert.ok(Math.abs(a-b)<1e-8, `${a} != ${b}`)
test('all species/ranks have seven finite attributes; thick hides have a magic weakness', () => {
  for(const a of ARCHETYPES) {
    const s=towerEnemyStats(a,4,10)
    for(const key of ['hp','damage','moveSpeed','physicalDefense','magicDefense','attackInterval','controlResistance'])
      assert.ok(Number.isFinite(s[key])&&s[key]>=0,`${a.id}.${key}`)
    assert.ok(s.attackInterval>0 && s.controlResistance<1)
  }
  const rhino=monsterAttributes({species:'rhino',rank:3,role:'normal'},4)
  const wolf=monsterAttributes({species:'wolf',rank:3,role:'normal'},4)
  assert.ok(rhino.physicalDefense>rhino.magicDefense)
  assert.ok(rhino.physicalDefense>wolf.physicalDefense)
})
test('mixed damage EHP stays at the previous authored HP budget',()=>{
  for(const a of ARCHETYPES.filter(a=>a.role==='normal')) {
    const s=towerEnemyStats(a,4,10)
    const parts=mitigateMonsterDamage({...s,hp:s.hp},0,{physical:50,magic:50})
    const previous=MONSTER_RANK_BASELINE.normal_hp[a.rank]*(a.floor_hp_factor??1)
    near(s.hp/(parts.physical+parts.magic)*100,previous)
  }
})
test('physical and magic mitigate independently and armor break cannot alter mechanic armor',()=>{
  const e={hp:100,physicalDefense:500,magicDefense:0,mechanic:{armor:.8}}
  assert.deepEqual(mitigateMonsterDamage(e,0,{physical:100,magic:100}),{physical:50,magic:100})
  assert.equal(applyArmorBreak(e,0,.2,3),true)
  near(mitigateMonsterDamage(e,0,{physical:100,magic:100}).physical,100*500/900)
  assert.equal(e.mechanic.armor,.8)
  applyArmorBreak(e,1,.1,3)
  assert.equal(e.armorBreak.fraction,.2)
  near(mitigateMonsterDamage(e,4,{physical:100,magic:100}).physical,50)
  tickMonsterAttributes([e],4)
  assert.equal(e.armorBreak,undefined)
})
test('armor break rejects invalid inputs, never adds damage to zero armor, and cleans up death',()=>{
  const e={hp:100,physicalDefense:0,magicDefense:0}
  for(const fraction of [-1,NaN,Infinity,2])assert.equal(applyArmorBreak(e,0,fraction,3),false)
  applyArmorBreak(e,0,.2,3)
  assert.deepEqual(mitigateMonsterDamage(e,0,{physical:100,magic:100}),{physical:100,magic:100})
  e.hp=0;tickMonsterAttributes([e],1);assert.equal(e.armorBreak,undefined)
})
test('sword scar keeps vulnerability while adding physical armor break after contact',()=>{
  const e={hp:100,physicalDefense:100}
  const r={state:{time:0,scarReadyAt:0,enemies:[e]}}
  addQingping(r,e)
  assert.equal(e.scarDebuff.vulnerability,.2)
  assert.deepEqual(e.armorBreak,{fraction:.2,endsAt:3})
})
test('control resistance reduces continuous slow strength and timed control duration',()=>{
  const e={hp:100,x:0,y:0,radius:10,controlResistance:.25}
  const z={formId:'sj_formation',x:0,y:0,radius:100,startedAt:0,expiresAt:8}
  near(formationMovementMultiplier([z],e,1),.775)
  near(monsterControlDuration(e,4),3)
  near(formationMovementMultiplier([z],{...e,controlResistance:1},1),1)
})
test('static attribute and armor-break corruption cannot validate',()=>{
  const a=ARCHETYPES[0], attributes=monsterAttributes(a,1)
  const e={...attributes,hp:100}
  assert.equal(validMonsterAttributes(e,a,1,0),true)
  for(const key of Object.keys(attributes))assert.equal(validMonsterAttributes({...e,[key]:NaN},a,1,0),false,key)
  assert.equal(validMonsterAttributes({...e,armorBreak:{fraction:2,endsAt:3}},a,1,0),false)
})

function fixture(floor=1) {
  const r=new TowerRun({attemptId:1,floor,seed:91,xp:0,hp:100,training:true,
    loadout:{growthVersion:1,active:{sj_yujian:1},passive:{sj_mark:1},
      evolutions:[],evolutionLevels:{},tutorialWaves:0,
      weaponId:'eq_sword_suwen',weaponQuality:1,weaponRefine:0}})
  for(let i=0;i<600&&!r.state.enemies.length;i++)r.advance(1/60)
  r._random=()=>1
  return r
}
test('real hit resolves both channels, then scar and armor break affect only later contacts',()=>{
  const r=fixture(),e=r.state.enemies[0],start=e.hp
  const p=10*500/(500+e.physicalDefense),m=10*500/(500+e.magicDefense)
  const hit={target:e.id,source:'sj_shadow',damage:20,damageParts:{physical:10,magic:10},direct:true}
  r._damageEnemy(hit)
  near(start-e.hp,p+m)
  const first=r.state.effects.findLast(x=>x.kind==='hit')
  near(first.damageParts.physical,p);near(first.damageParts.magic,m)
  const before=e.hp;r._damageEnemy(hit)
  near(before-e.hp,(10*500/(500+e.physicalDefense*.8)+m)*1.2)
  const second=r.state.effects.findLast(x=>x.kind==='hit')
  near(second.damageParts.magic,m*1.2)
})
test('resolved bleed is not mitigated twice, even after mechanic armor appears',()=>{
  const r=fixture(),e=r.state.enemies[0]
  e.mechanic={armor:.8,armorUntil:r.state.time+10}
  const before=e.hp
  r._damageEnemy({target:e.id,damage:10,damageParts:{physical:6,magic:4},
    source:'weapon_bleed',direct:false,scaled:true})
  near(before-e.hp,10)
  const effect=r.state.effects.findLast(x=>x.kind==='hit')
  assert.deepEqual(effect.damageParts,{physical:6,magic:4})
})
test('real save survives pause/restore; altered attributes, invented armor break and expiry are rejected',()=>{
  const r=fixture(),e=r.state.enemies[0]
  r._damageEnemy({target:e.id,source:'sj_yujian',damage:.01,direct:true})
  r.pause();const snapshot=r.snapshot()
  assert.equal(validateTowerSnapshot(snapshot),true)
  const restored=TowerRun.restore(snapshot);restored.advance(10)
  assert.deepEqual(restored.snapshot(),snapshot)
  for(const key of ['physicalDefense','magicDefense','attackInterval','controlResistance']){
    const forged=structuredClone(snapshot);forged.enemies[0][key]+=1
    assert.equal(validateTowerSnapshot(forged),false,key)
  }
  for(const patch of [{fraction:1},{endsAt:snapshot.time+20}]){
    const forged=structuredClone(snapshot);Object.assign(forged.enemies[0].armorBreak,patch)
    assert.equal(validateTowerSnapshot(forged),false)
  }
  restored.resume()
  restored.state.time=e.armorBreak.endsAt
  tickMonsterAttributes(restored.state.enemies,restored.state.time)
  assert.equal(restored.state.enemies[0].armorBreak,undefined)
})
test('attack interval controls ordinary cooldown without changing authored attack animation',()=>{
  for(const [floor,id] of [[1,'boar_normal'],[4,'wolf_normal'],[4,'tiger_normal'],[1,'boar_boss']]){
    const r=fixture(floor),e=r._enemy({id:'probe',archetype:id,x:0,y:0})
    r.state.player.x=50;r.state.player.y=0
    const base=r._baseAttackSpec(e),actual=r._attackSpec(e)
    assert.ok(base&&actual,id)
    assert.equal(actual.cooldown,e.attackInterval,id)
    for(const key of ['windup','active','recovery'])assert.equal(actual[key],base[key],`${id}.${key}`)
  }
})
test('real boss summons preserve effective HP and objectives are unarmored and control-proof',()=>{
  for(const floor of [2,6]){
    const r=fixture(floor),a=ARCHETYPES.find(a=>a.role==='boss'&&(floor===2?a.species==='wolf':a.species==='bear'))
    const boss=r._enemy({id:'boss-probe',archetype:a.id,x:150,y:0})
    r.state.enemies=[boss];r.state.player.x=0;r.state.player.y=0;r._visible=()=>true
    boss.mechanic.cooldowns.M05=100
    if(floor===6)boss.hp=boss.maxHp*.59
    for(let i=0;i<1400;i++){
      r.state.time+=1/60;tickMonsterMechanics(r,[])
      if(r.state.enemies.some(e=>e.temporary))break
    }
    const summons=r.state.enemies.filter(e=>e.temporary)
    assert.ok(summons.length>0,`floor ${floor}`)
    assert.equal(validateMonsterMechanics(r.state),true)
    for(const e of summons){
      assert.equal(validMonsterAttributes(e,ARCHETYPES.find(a=>a.id===e.archetype),floor,r.state.time),true)
      if(e.temporary.kind==='crystal'){
        assert.equal(e.physicalDefense,0);assert.equal(e.magicDefense,0);assert.equal(e.controlResistance,1)
        assert.equal(applyArmorBreak(e,r.state.time,.2,3),false)
      }
      if(['crystal','clone'].includes(e.temporary.kind)){
        const ratio=e.temporary.kind==='clone'?.22:.016
        near(e.maxHp/monsterHealthMultiplier(e),boss.maxHp/monsterHealthMultiplier(boss)*ratio)
      }
    }
    const forgedRadius=structuredClone(r.state)
    forgedRadius.enemies.find(e=>e.temporary).radius=.1
    assert.equal(validateMonsterMechanics(forgedRadius),false,'temporary radius is authored, not save-selected')
    if(floor===2){
      const forgedSpecies=structuredClone(r.state),e=forgedSpecies.enemies.find(e=>e.temporary)
      const a=ARCHETYPES.find(a=>a.id==='boar_normal')
      Object.assign(e,{archetype:a.id,family:'boar',rank:a.rank},monsterAttributes(a,floor))
      e.hp=e.maxHp=e.temporary.baseHp=summonedMonsterHp(boss,e,.22)
      assert.equal(validMonsterAttributes(e,a,floor,r.state.time),true,'individually valid replacement attributes')
      assert.equal(validateMonsterMechanics(forgedSpecies),false,'clone species must match its owner recipe')
    }
  }
})
