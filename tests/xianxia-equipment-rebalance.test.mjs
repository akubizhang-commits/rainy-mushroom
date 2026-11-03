import test from 'node:test'
import assert from 'node:assert/strict'
import {definitions,envelope} from '../scripts/lib/equipment-budget.mjs'
import {WEAPON_TUNING} from '../js/xianxia/TowerWeaponTuning.js'
import {TowerCampaignStore} from '../js/xianxia/TowerCampaign.js'
import {cultivationLevelXp} from '../js/xianxia/TowerProfile.js'
import {createFixedWeapon} from '../js/xianxia/TowerWeapons.js'
import {naturalEquipmentScore} from '../scripts/lib/tower-natural-equipment.mjs'

test('all legal three-slot combinations produce finite conservative estimates, including basic and cast speed',t=>{
  let count=0,max=0
  for(const d of definitions.filter(d=>d.category==='weapon')){
    const result=envelope(d,WEAPON_TUNING[d.id]??{universal:0,flow:0})
    assert.ok(Number.isFinite(result.max)&&result.max>=1,JSON.stringify(result))
    count+=result.count;max=Math.max(max,result.max)
  }
  // This loose analytic screen is not a 6x proof: real timing/rank checks live
  // in verify-equipment-integer-runtime.mjs and its retained report.
  t.diagnostic(JSON.stringify({count,max,withinSix: max<=6}))
})
test('natural shopping evaluates authored gear above starters and does not mutate the campaign',()=>{
  const store=new TowerCampaignStore({getItem:()=>null,setItem:()=>{}},1)
  const state={...structuredClone(store.state),xp:cultivationLevelXp(11)}
  const before=structuredClone(state)
  const old=definitions.find(d=>d.category==='weapon'&&d.tier==='fa'&&d.role==='graduate')
  const fresh=definitions.find(d=>d.category==='weapon'&&d.tier==='bao'&&d.role==='qi'&&d.quality===1)
  const score=d=>naturalEquipmentScore(state,'qi',createFixedWeapon(d.id,d.quality?d.id:'iron'),'weapon')
  assert.ok(score(old)>score(definitions.find(d=>d.category==='weapon'&&!d.quality)))
  assert.ok(score(fresh)>score(definitions.find(d=>d.category==='weapon'&&!d.quality)))
  assert.deepEqual(state,before)
})
