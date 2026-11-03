import {currentCampaignSchema} from './helpers/tower-schema.mjs'
import {equipmentBaseAttributes} from '../js/xianxia/TowerEquipmentBases.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import * as gear from '../js/xianxia/TowerEquipment.js'
import * as timing from '../js/xianxia/TowerSkillTiming.js'
import {createIronWeapon, createFixedWeapon, weaponAttackProfile} from '../js/xianxia/TowerWeapons.js'
import {TowerRun, stats, characterCombatAttributes, validateTowerSnapshot} from '../js/xianxia/TowerRun.js'
import {cultivationLevelXp} from '../js/xianxia/TowerProfile.js'
import {TowerCampaignStore, TOWER_CAMPAIGN_KEY} from '../js/xianxia/TowerCampaign.js'
import {checksum} from '../js/xianxia/Checksum.js'
import {FORGE_MATERIALS} from '../js/xianxia/TowerForgeMaterials.js'
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`)
const armor=(tier,q,caster=false)=>{
  const role=q===4?(caster?'master':'graduate'):(caster?'recovery':'guard')
  const d=gear.ARMORS.find(d=>d.tier===tier&&d.quality===q&&d.role===role)
  return gear.createFixedEquipment(d.id,d.id)
}
const baseOf=item=>equipmentBaseAttributes(gear.ARMORS.find(d=>d.id===item.definitionId))
const loadout=item=>({growthVersion:1,skillsInitialized:true,active:{},passive:{},evolutions:[],
  evolutionLevels:{},tutorialWaves:0,weapon:createIronWeapon(),weaponId:'iron',
  weaponQuality:0,weaponRefine:0,weaponFocusCount:0,armor:item,armorId:item.id})

test('same-quality armor pairs retain their physical or magical emphasis within the integer design budgets',()=>{
  // Approved v2 design §4.2/§5: fixed points replace old fractional HP/CDR.
  const budgets={fa:[[12,18,30,39,4,4],[18,24,57,72,6,6],[30,36,90,114,8,8],[36,48,129,159,10,12]],
    bao:[[30,36,69,87,10,12],[42,54,114,141,14,16],[60,72,165,201,18,20],[78,90,225,270,22,26]],
    ling:[[60,72,150,183,24,28],[84,102,219,264,32,36],[114,132,300,354,40,44],[144,168,390,450,48,56]]}
  const within=(v,lo,hi)=>assert.ok(v>=lo&&v<=hi,`${v} outside ${lo}..${hi}`)
  for(const tier of Object.keys(budgets))for(let q=1;q<=4;q++){
    const physical=armor(tier,q),magic=armor(tier,q,true)
    const p=gear.armorModifiers(physical),m=gear.armorModifiers(magic)
    assert.ok(p.strength>p.intelligence);assert.ok(m.intelligence>m.strength)
    assert.ok(p.attackSpeed>0&&m.castSpeed>0)
    assert.equal(p.castSpeed,0);assert.equal(m.attackSpeed,0)
    assert.ok(p.physicalDefense>m.physicalDefense)
    assert.equal(p.magicDefense,0);assert.equal(m.magicDefense,0)
    for(const item of [physical,magic]){
      const b=baseOf(item),mod=gear.armorModifiers(item),[lo,hi,dlo,dhi,vlo,vhi]=budgets[tier][q-1]
      within((b.strength??0)+(b.intelligence??0),lo,hi)
      within(b.physicalDefense,dlo,dhi);within(b.vitality,vlo,vhi)
      if(b.awareness)within((b.strength??0)+(b.intelligence??0),lo,Math.floor((lo+hi)/2))
      for(const value of Object.values(b))assert.ok(Number.isInteger(value)&&value>0)
      assert.equal(mod.hpBonus,0);assert.equal(mod.cooldownReduction,0)
      assert.ok(gear.validateEquipment(item))
      const bad=structuredClone(item);bad.affixes.push({type:'strength',value:999})
      assert.equal(gear.validateEquipment(bad),false)
    }
    assert.match(gear.equipmentDescription(physical).join(' '),/力量 \+\d+.*普攻速度 \+/)
    assert.match(gear.equipmentDescription(magic).join(' '),/智力 \+\d+.*施法速度 \+/)
    if(q>1)for(const caster of [false,true]){
      const a=baseOf(armor(tier,q-1,caster)),b=baseOf(armor(tier,q,caster))
      assert.ok(b.vitality>=a.vitality);assert.ok(b.physicalDefense>a.physicalDefense)
    }
  }
})

test('fixed primary attributes aggregate once after cultivation and disappear when armor is removed',()=>{
  for(const caster of [false,true]){
    const l=loadout(armor('ling',4,caster)),basic={...l,armor:gear.createBasicEquipment('armor')}
    for(const level of [21,30]){
      const xp=cultivationLevelXp(level),a=stats(xp,l),b=stats(xp,basic)
      near(a.strength-b.strength,baseOf(l.armor).strength??0);near(a.intelligence-b.intelligence,baseOf(l.armor).intelligence??0)
      near(a.attack-b.attack,baseOf(l.armor).strength??0);near(a.magicAttack-b.magicAttack,baseOf(l.armor).intelligence??0)
      assert.deepEqual(stats(xp,{...l,armor:basic.armor}),b)
    }
  }
})

test('weapon and armor attack speed add once; cast speed affects body phases, not cooldown or independent durations',()=>{
  assert.equal(typeof timing.equipmentAttackProfile,'function')
  const l=loadout(armor('ling',4)),w=createFixedWeapon('eq_sword_taiheng','weapon')
  l.weapon=w
  const p=timing.equipmentAttackProfile(l),base=weaponAttackProfile(w)
  near(p.speed,base.speed+gear.armorModifiers(l.armor).attackSpeed);near(p.interval,1/(1+base.speed+gear.armorModifiers(l.armor).attackSpeed));near(p.duration,.2/(1+base.speed+gear.armorModifiers(l.armor).attackSpeed))
  near(characterCombatAttributes(l).attackSpeed,p.speed)
  const caster=loadout(armor('ling',4,true)),xp=cultivationLevelXp(21)
  near(timing.equipmentCastSpeed(caster,xp),.2+gear.armorModifiers(caster.armor).castSpeed+(baseOf(caster.armor).awareness??0)/100)
  const plain={...caster,armor:gear.createBasicEquipment('armor')}
  assert.ok(timing.castActionTiming('sj_line',3,timing.equipmentCastSpeed(caster,xp)).duration
    <timing.castActionTiming('sj_line',3,timing.equipmentCastSpeed(plain,xp)).duration)
  near(timing.skillCooldown(10,caster),10)
  near(timing.applyCastSpeed(3,.16,false),3)
  near(timing.equipmentAttackProfile(caster).speed,0)
})

function fixture(item,active={}){
  const l=loadout(item);l.active=active
  const run=new TowerRun({attemptId:1,floor:9,seed:41,hp:100,xp:cultivationLevelXp(21),training:true,loadout:l})
  for(const id of Object.keys(active))run.state.cooldowns[id]=100
  for(let i=0;i<600&&!run.state.enemies.length;i++)run.advance(1/60)
  assert.ok(run.state.enemies.length)
  for(const e of run.state.enemies)e.ai.graceUntil=9999
  const enemy=run.state.enemies[0];enemy.x=run.state.player.x+(Object.keys(active).length?220:85);enemy.y=run.state.player.y
  return {run,enemy}
}

test('real armor-speed basic swing uses the same frozen timing at start, validation and restore',()=>{
  const {run,enemy}=fixture(armor('ling',4))
  run.advance(1/60)
  const b=run.state.actions.basic
  assert.ok(b);near(b.endsAt-b.startedAt,.2/(1+gear.armorModifiers(run.state.loadout.armor).attackSpeed))
  near(run.state.actions.readyAt-b.startedAt,1/(1+gear.armorModifiers(run.state.loadout.armor).attackSpeed))
  const snap=run.snapshot();assert.ok(validateTowerSnapshot(snap))
  const bad=structuredClone(snap);bad.actions.basic.endsAt+=.01
  assert.equal(validateTowerSnapshot(bad),false)
  const restored=TowerRun.restore(snap),hp=enemy.hp
  for(let i=0;i<30;i++){run.advance(1/60);restored.advance(1/60)}
  assert.ok(enemy.hp<hp);assert.deepEqual(restored.snapshot(),run.snapshot())
})

test('real spell action freezes armor cast speed through pause and JSON restore',()=>{
  const {run}=fixture(armor('ling',4,true),{sj_line:1})
  run.state.cooldowns.sj_line=0;run.advance(1/60)
  const c=run.state.actions.current
  assert.ok(c);near(c.speed,timing.equipmentCastSpeed(run.state.loadout,run.state.player.xp))
  const expected=timing.castActionTiming(c.skill,c.hits,c.speed)
  near(c.endsAt-c.startedAt,expected.duration)
  run.pause();const snap=run.snapshot();assert.ok(validateTowerSnapshot(snap))
  run.advance(1);assert.deepEqual(run.snapshot(),snap)
  const restored=TowerRun.restore(JSON.parse(JSON.stringify(snap)))
  run.resume();restored.resume()
  for(let i=0;i<45;i++){run.advance(1/60);restored.advance(1/60)}
  assert.deepEqual(restored.snapshot(),run.snapshot())
})

test('actual released physical skill favors strength; hybrid settlement increases only the selected attribute channel',()=>{
  const observed=[]
  for(const caster of [false,true]){
    const {run,enemy}=fixture(armor('ling',4,caster),{sj_line:1})
    // Durable authored target to measure full hits, rather than overkill capped HP.
    enemy.hp=enemy.maxHp=1e8;enemy.x=run.state.player.x+140
    run.state.cooldowns.sj_line=0
    let hit
    for(let i=0;i<120&&!hit;i++){
      run.advance(1/60)
      hit=run.state.effects.find(e=>e.kind==='hit'&&e.source==='sj_line')
    }
    assert.ok(hit);observed.push(hit.damageParts.physical)
    const context=run._attackContext(),a=stats(context.xp,context.loadout)
    const weaponRollDelta=context.weaponAttack-5
    const physical=a.attack+weaponRollDelta,magic=a.magicAttack+(context.weaponMagicAttack-5)
    run._damageEnemy({target:enemy.id,source:'sj_shadow',damage:physical,direct:true,castContext:context})
    const hybrid=run.state.effects.findLast(e=>e.kind==='hit'&&e.source==='sj_shadow')
    near(hybrid.damageParts.physical,physical/2);near(hybrid.damageParts.magic,magic/2)
    near(hybrid.damageParts.physical-hybrid.damageParts.magic,((baseOf(run.state.loadout.armor).strength??0)-(baseOf(run.state.loadout.armor).intelligence??0))/2)
  }
  assert.ok(observed[0]>observed[1])
})

test('new armor can be crafted, equipped and reloaded; duplicate receipts and failed writes grant nothing twice',()=>{
  let raw=null,fail=false
  const disk={getItem:()=>raw,setItem:(_,v)=>{if(fail)throw Error('disk full');raw=v}}
  const initial=new TowerCampaignStore(disk,0);assert.ok(initial.act({type:'sync'},0).ok)
  const envelope=JSON.parse(raw),state=structuredClone(initial.state)
  Object.assign(state,{xp:cultivationLevelXp(21),spiritStones:100000,contribution:100000})
  Object.assign(state.pills,Object.fromEntries(Object.keys(FORGE_MATERIALS).map(id=>[id,1000])))
  const data=JSON.stringify(state);raw=JSON.stringify({...envelope,data,checksum:checksum(data)})
  const store=new TowerCampaignStore(disk,0);assert.equal(store.readOnly,false)
  const action={type:'craftGear',id:'armor:ling:q4',count:1,sequence:1,requestId:'armor-offense'}
  const before=store.state,saved=raw;fail=true
  assert.equal(store.act(action,0).ok,false);assert.deepEqual(store.state,before);assert.equal(raw,saved)
  fail=false
  const crafted=store.act(action,0);assert.ok(crafted.ok,JSON.stringify(crafted))
  const item=store.state.equipment[crafted.ids[0]]
  assert.ok(gear.equipmentSummary(item).baseAttributes.strength||gear.equipmentSummary(item).baseAttributes.intelligence)
  const awarded=structuredClone(store.state)
  assert.ok(store.act(action,0).duplicate);assert.deepEqual(store.state,awarded)
  assert.ok(store.act({type:'equipEquipment',category:'armor',id:item.id},0).ok)
  const loaded=new TowerCampaignStore(disk,0)
  assert.deepEqual(loaded.state,store.state)
  assert.equal(loaded.state.loadouts[0].armorId,item.id)
})

test('obsolete armor schema resets only the campaign key and a failed reset leaves storage untouched',()=>{
  for(const fail of [false,true]){
    const records=new Map([['other-game','keep']])
    const disk={getItem:k=>records.get(k)??null,setItem:(k,v)=>records.set(k,v)}
    const store=new TowerCampaignStore(disk,0)
    assert.ok(store.act({type:'unlockFloor',floor:2},0).ok===false) // no unauthorized grant
    // Create the first legitimate current record through the store.
    const current={format:'xianxia-sect-tower-campaign',schema:50,data:'obsolete',checksum:'obsolete'}
    const old=JSON.stringify(current);records.set(TOWER_CAMPAIGN_KEY,old)
    const reloaded=new TowerCampaignStore({...disk,setItem:(k,v)=>{if(fail)throw Error('disk full');records.set(k,v)}},0)
    assert.equal(records.get('other-game'),'keep')
    if(fail){assert.equal(reloaded.error,'save-failed');assert.equal(records.get(TOWER_CAMPAIGN_KEY),old)}
    else {
      assert.equal(reloaded.error,'');assert.equal(reloaded.migrationReport?.reset,true)
      assert.equal(JSON.parse(records.get(TOWER_CAMPAIGN_KEY)).schema,currentCampaignSchema)
      assert.deepEqual(new TowerCampaignStore(disk,0).state,reloaded.state)
    }
  }
})
