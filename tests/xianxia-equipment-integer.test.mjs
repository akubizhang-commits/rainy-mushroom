import test from 'node:test'
import assert from 'node:assert/strict'
import {EQUIPMENT_ROSTER} from '../js/xianxia/TowerEquipmentRoster.js'
import {equipmentBaseAttributes} from '../js/xianxia/TowerEquipmentBases.js'
import {createFixedWeapon,validateWeapon,weaponSummary,weaponAttackRange} from '../js/xianxia/TowerWeapons.js'
import {createFixedEquipment,validateEquipment,equipmentSummary} from '../js/xianxia/TowerEquipment.js'
import {newArmorState,resolveArmorHit,validArmorEffectState} from '../js/xianxia/TowerArmorEffects.js'
const make=d=>d.category==='weapon'?createFixedWeapon(d.id,d.quality?d.id:'iron'):createFixedEquipment(d.id,d.quality?d.id:`basic-${d.category}`)

test('approved integer attributes have meaningful magnitudes and only armor grants vitality',()=>{
  for(const d of EQUIPMENT_ROSTER){
    const base=equipmentBaseAttributes(d)
    for(const [key,n] of Object.entries(base))assert.ok(Number.isInteger(n)&&n>0,`${d.id}/${key}: ${n}`)
    if(d.category!=='armor')assert.equal(base.vitality??0,0,d.id)
  }
  const guiyan=equipmentBaseAttributes(EQUIPMENT_ROSTER.find(d=>d.id==='eq_sword_guiyan'))
  assert.deepEqual(guiyan,{physicalAttack:32,magicAttack:32,strength:9,intelligence:9})
  const armor=equipmentBaseAttributes(EQUIPMENT_ROSTER.find(d=>d.id==='eq_armor_chentie'))
  assert.equal(armor.vitality,4)
})
test('fixed identities return independent instances and reject edited numeric rolls',()=>{
  for(const d of EQUIPMENT_ROSTER.filter(d=>d.quality)){
    const a=make(d),b=make(d),valid=d.category==='weapon'?validateWeapon:validateEquipment
    assert.deepEqual(a,b);assert.ok(valid(a))
    a.affixes[0].value+=1
    assert.ok(!valid(a),d.id);assert.ok(valid(b))
    assert.deepEqual(b,make(d))
    assert.ok(!b.affixes.some(a=>a.type==='hpBonus'),d.id)
    if(d.category==='ring'){
      const types=b.affixes.map(a=>a.type)
      assert.ok(!(types.includes('critChance')&&types.includes('cooldownReduction')),d.id)
    }
  }
})
test('displayed effects match actual authored special values and contain no zero lines',()=>{
  for(const d of EQUIPMENT_ROSTER){
    const item=make(d),summary=d.category==='weapon'?weaponSummary(item):equipmentSummary(item)
    assert.ok(!summary.lines.some(s=>/\+0(?:%|$)/.test(s)),d.id)
    for(const a of item.affixes.filter(a=>['lowHealthShield','safeRecovery','dotDamage','formationDamage'].includes(a.type)))
      assert.ok(summary.specialLines.some(s=>s.includes(`${a.value}%`)),`${d.id}/${a.type}`)
    if(d.category==='weapon'){
      const r=weaponAttackRange(item);assert.ok(Number.isInteger(r.min)&&Number.isInteger(r.max))
      assert.equal((r.min+r.max)/2,r.mean)
    }
  }
})
test('shield triggering and snapshot limits use the effect value rather than a hidden 12 percent',()=>{
  const armor=createFixedEquipment('eq_armor_wugou','shield')
  const amount=armor.affixes.find(a=>a.type==='lowHealthShield').value
  assert.equal(amount,14)
  const loadout={armor},s={time:1,loadout,player:{hp:31,maxHp:100},armorState:newArmorState(loadout)}
  assert.ok(resolveArmorHit(s,2).shieldTriggered)
  assert.equal(s.armorState.shield,amount)
  assert.ok(validArmorEffectState(s))
  assert.equal(resolveArmorHit(s,5).absorbed,5)
  assert.equal(s.armorState.shield,amount-5)
})
