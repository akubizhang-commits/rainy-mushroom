import test from 'node:test'
import assert from 'node:assert/strict'
import {WEAPONS,createFixedWeapon,createIronWeapon,weaponSummary} from '../js/xianxia/TowerWeapons.js'
import * as gear from '../js/xianxia/TowerEquipment.js'
import {stats,characterCombatAttributes,TowerRun,validateTowerSnapshot} from '../js/xianxia/TowerRun.js'
import {cultivationLevelXp} from '../js/xianxia/TowerProfile.js'
import {TowerCampaignStore,combatLoadout,campaignMaxHp} from '../js/xianxia/TowerCampaign.js'
import {checksum} from '../js/xianxia/Checksum.js'
import {inventoryDetail} from '../js/xianxia/TowerInventory.js'
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`)
const make=d=>d.category==='weapon'?createFixedWeapon(d.id,d.quality?d.id:'iron')
  :gear.createFixedEquipment(d.id,d.quality?d.id:`basic-${d.category}`)
const summary=d=>d.category==='weapon'?weaponSummary(make(d)):gear.equipmentSummary(make(d))
const loadout=(items={})=>({growthVersion:1,active:{sj_yujian:1},passive:{},evolutions:[],evolutionLevels:{},
  tutorialWaves:0,weaponQuality:items.weapon?.quality??0,weaponRefine:0,weaponFocusCount:0,weapon:createIronWeapon(),weaponId:items.weapon?.id??'iron',...items,
  ...Object.fromEntries(['armor','ring'].filter(k=>items[k]).map(k=>[`${k}Id`,items[k].id]))})
const pick=(category,role='master',quality=4)=>make([...WEAPONS,...gear.EQUIPMENT].find(d=>d.category===category&&d.tier==='ling'&&d.quality===quality&&d.role===role))

test('all identities have slot-specific intrinsic defense and three distinct attribute sections',()=>{
  for(const d of [...WEAPONS,...gear.EQUIPMENT]){
    const s=summary(d)
    assert.ok(s.baseAttributes,`${d.id} missing base attributes`)
    if(d.category==='weapon')assert.ok(s.baseAttributes.physicalAttack>0&&s.baseAttributes.magicAttack>0)
    else {
      assert.ok(s.baseAttributes[d.category==='armor'?'physicalDefense':'magicDefense']>0)
      assert.equal(s.baseAttributes[d.category==='armor'?'magicDefense':'physicalDefense']??0,0)
    }
    assert.ok(Array.isArray(s.ordinaryLines)&&Array.isArray(s.specialLines))
    assert.deepEqual(s.lines,[...s.baseLines,...s.ordinaryLines,...s.specialLines])
    assert.ok(!s.affixes.some(a=>['strength','intelligence','awareness','vitality'].includes(a.type)))
    if(d.category==='weapon'&&d.quality){
      assert.match(s.ordinaryLines.join(' '),/附加伤害/)
      assert.doesNotMatch(s.specialLines.join(' '),/附加伤害/)
      assert.equal(s.specialLines.length,s.affixes.filter(a=>['flow','element'].includes(a.type)).length)
      assert.ok(s.specialLines.every(line=>/流派伤害|元素.*伤害/.test(line)))
    }else if(d.category==='armor'&&d.quality){
      assert.match(s.specialLines.join(' '),/气血回复 .*\/3秒/)
      assert.equal(s.specialLines.length,1)
      assert.doesNotMatch(s.ordinaryLines.join(' '),/气血回复/)
    }else assert.equal(s.specialLines.length,0)
  }
})
test('each category includes one, two and three primary-attribute identities without giving every item everything',()=>{
  for(const category of ['weapon','armor','ring']){
    const counts=new Set([...WEAPONS,...gear.EQUIPMENT].filter(d=>d.category===category&&d.quality)
      .map(d=>['strength','intelligence','awareness'].filter(k=>summary(d).baseAttributes?.[k]>0).length))
    assert.deepEqual([...counts].sort(),[1,2,3],category)
  }
})
test('three-slot primary bonuses apply once; vitality converts to HP and removed equipment leaves no bonus',()=>{
  const items={weapon:pick('weapon'),armor:pick('armor'),ring:pick('ring')}
  const l=loadout(items),base=stats(cultivationLevelXp(21),loadout()),actual=stats(cultivationLevelXp(21),l)
  const bases=[weaponSummary(items.weapon),gear.equipmentSummary(items.armor),gear.equipmentSummary(items.ring)].map(s=>s.baseAttributes)
  for(const k of ['strength','intelligence','awareness','vitality']){
    near(actual[k],base[k]+bases.reduce((n,a)=>n+(a[k]??0),0))
  }
  near(actual.maxMana,actual.awareness)
  near(actual.maxHp,(base.maxHp+actual.vitality*10)*(1+gear.armorModifiers(items.armor).hpBonus))
  near(actual.attack,actual.strength+weaponSummary(items.weapon).baseAttack)
  near(actual.magicAttack,actual.intelligence+weaponSummary(items.weapon).baseMagicAttack)
  const unarmed=stats(0,loadout({...items,weaponEquipped:false})),withoutWeapon=stats(0,loadout({armor:items.armor,ring:items.ring}))
  for(const k of ['strength','intelligence','awareness','vitality','maxHp'])near(unarmed[k],withoutWeapon[k])
})
test('real incoming damage reads ring magic defense, armor physical defense and restores identically',()=>{
  for(const type of ['physical','magic','hybrid']){
    for(const slots of [{armor:pick('armor')},{ring:pick('ring')},{armor:pick('armor'),ring:pick('ring')},{}]){
      const l=loadout(slots)
      const run=new TowerRun({attemptId:9,floor:1,seed:4,xp:cultivationLevelXp(21),hp:100,loadout:l})
      const sheet=characterCombatAttributes(l)
      const p=1000/(1000+sheet.physicalDefense),m=1000/(1000+sheet.magicDefense)
      if(!slots.ring)near(m,1)
      if(!slots.armor)near(p,1)
      run._projectile(run.state.player.x,run.state.player.y,0,0,10,20,true,{damageType:type})
      const snapshot=run.snapshot()
      assert.ok(validateTowerSnapshot(snapshot))
      const restored=TowerRun.restore(JSON.parse(JSON.stringify(snapshot)))
      const hp=restored.state.player.hp
      restored.advance(1/60)
      near(hp-restored.state.player.hp,20*(type==='physical'?p:type==='magic'?m:(p+m)/2))
      run.advance(1/60);assert.deepEqual(restored.snapshot(),run.snapshot())
    }
  }
})
test('equipment details classify primary stats and effects without duplicate lines',()=>{
  for(const d of [...WEAPONS,...gear.EQUIPMENT]){
    const item=make(d),s=summary(d)
    const detail=inventoryDetail({xp:cultivationLevelXp(21)},{category:d.category,item,tier:d.tier})
    assert.deepEqual(detail.basic,s.baseLines)
    assert.deepEqual(detail.ordinaryEffects,s.ordinaryLines)
    assert.deepEqual(detail.specialEffects,s.specialLines)
    assert.equal(new Set([...detail.basic,...detail.effects]).size,s.lines.length)
  }
})
test('switching or removing each slot clamps HP/mana atomically and never refills on re-equip',()=>{
  for(const slot of ['weapon','armor','ring']){
    let raw=null,fail=false
    const disk={getItem:()=>raw,setItem:(_,v)=>{if(fail)throw Error('disk full');raw=v}}
    const fresh=new TowerCampaignStore(disk,0);fresh.act({type:'sync'},0)
    const envelope=JSON.parse(raw),state=structuredClone(fresh.state)
    state.xp=cultivationLevelXp(21)
    state.weaponSequence=1;state.equipmentSequence=2
    const weapon=createFixedWeapon('eq_sword_taiheng','weapon-1')
    const armor=gear.createFixedEquipment('eq_armor_shouyi','gear-1')
    const ring=gear.createFixedEquipment('eq_ring_dingwei','gear-2')
    state.weapons[weapon.id]=weapon;state.weaponCounters[weapon.id]=0
    state.equipment[armor.id]=armor;state.equipment[ring.id]=ring;state.equipmentCounters[ring.id]=0
    Object.assign(state.loadouts[0],{weaponId:weapon.id,armorId:armor.id,ringId:ring.id})
    state.hp=campaignMaxHp(state);state.mana=stats(state.xp,combatLoadout(state)).maxMana
    const data=JSON.stringify(state);raw=JSON.stringify({...envelope,data,checksum:checksum(data)})
    const store=new TowerCampaignStore(disk,0)
    assert.equal(store.readOnly,false);assert.deepEqual(store.state,state)
    const high=structuredClone(store.state.loadouts[0]),low={...high,[`${slot}Id`]:''}
    const before=store.state,saved=raw
    fail=true
    assert.equal(store.act({type:'setLoadout',index:0,loadout:low},0).ok,false)
    assert.deepEqual(store.state,before);assert.equal(raw,saved)
    fail=false
    assert.ok(store.act({type:'setLoadout',index:0,loadout:low},0).ok)
    const lowered=stats(state.xp,combatLoadout(store.state))
    near(store.state.hp,lowered.maxHp);near(store.state.mana,lowered.maxMana)
    if(slot!=='weapon')assert.equal(characterCombatAttributes(combatLoadout(store.state))[slot==='armor'?'physicalDefense':'magicDefense'],0)
    const hp=store.state.hp,mana=store.state.mana
    assert.ok(store.act({type:'setLoadout',index:0,loadout:high},0).ok)
    near(store.state.hp,hp);near(store.state.mana,mana)
    assert.deepEqual(new TowerCampaignStore(disk,0).state,store.state)
    assert.ok(store.act({type:'setLoadout',index:1,loadout:low},0).ok)
    assert.ok(store.act({type:'selectLoadout',index:1},0).ok)
    near(store.state.hp,lowered.maxHp);near(store.state.mana,lowered.maxMana)
  }
})
test('derived primary fields cannot be injected into an item or restored player',()=>{
  for(const d of [...WEAPONS,...gear.EQUIPMENT]){
    const item=make(d),validate=d.category==='weapon'?w=>weaponSummary(w):w=>gear.equipmentSummary(w)
    item.baseAttributes={strength:9999}
    assert.throws(()=>validate(item))
  }
  const l=loadout({weapon:pick('weapon'),armor:pick('armor'),ring:pick('ring')})
  const run=new TowerRun({attemptId:9,floor:1,seed:4,xp:cultivationLevelXp(21),hp:100,loadout:l})
  for(const key of ['strength','intelligence','awareness','vitality','maxHp','maxMana']){
    const s=run.snapshot();s.player[key]+=10
    assert.equal(validateTowerSnapshot(s),false,key)
  }
})
test('empty equipment slots can checkpoint and finish atomically without writing an undefined ring counter',()=>{
  for(const slots of [['ring'],['armor','ring'],['weapon','armor','ring']]){
    let raw=null,fail=false
    const disk={getItem:()=>raw,setItem:(_,v)=>{if(fail)throw Error('disk full');raw=v}}
    const store=new TowerCampaignStore(disk,0)
    const l={...store.state.loadouts[0],...Object.fromEntries(slots.map(k=>[`${k}Id`, '']))}
    assert.ok(store.act({type:'setLoadout',index:0,loadout:l},0).ok)
    const entered=store.act({type:'startFloor',floor:1,seed:41},0)
    assert.ok(entered.ok)
    const run=TowerRun.restore(entered.snapshot)
    run.advance(1/60);run.pause()
    assert.ok(store.act({type:'checkpoint',snapshot:run.snapshot()},0).ok)
    assert.deepEqual(new TowerCampaignStore(disk,0).state,store.state)
    run.abandon()
    const before=store.state,saved=raw,action={type:'finishFloor',snapshot:run.snapshot()}
    fail=true
    assert.equal(store.act(action,0).ok,false);assert.deepEqual(store.state,before);assert.equal(raw,saved)
    fail=false
    const finished=store.act(action,0)
    assert.ok(finished.ok,JSON.stringify(finished))
    assert.equal('undefined' in store.state.equipmentCounters,false)
    assert.deepEqual(new TowerCampaignStore(disk,0).state,store.state)
    const settled=store.state
    assert.equal(store.act(action,0).ok,false);assert.deepEqual(store.state,settled)
  }
})
