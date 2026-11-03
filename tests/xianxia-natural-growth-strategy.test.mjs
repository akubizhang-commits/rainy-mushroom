import { TOWER_XP_CAP } from '../js/xianxia/TowerProfile.js'
import { currentCampaignSchema } from './helpers/tower-schema.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { planNaturalGrowth } from '../scripts/lib/tower-natural-growth.mjs'
import { DEFAULT_GROWTH_POLICY, pursuitGrowthPriorities } from '../scripts/lib/tower-natural-growth-policies.mjs'
import { TowerCampaignStore } from '../js/xianxia/TowerCampaign.js'
import { growthSummary } from '../js/xianxia/TowerGrowth.js'
import { checksum } from '../js/xianxia/Checksum.js'

const evolutions = ['evo_wuwo', 'evo_sixiang']
// Legal late-game fixture: 38 of 80 earned SP are already allocated and only the
// two 2400-stone books are affordable. No test grants are used by the harness.
function fixture(patch = {}) {
  let raw = null
  const disk = { getItem: () => raw, setItem: (_, value) => { raw = value } }
  const fresh = new TowerCampaignStore(disk, 0)
  const data = JSON.stringify({ ...fresh.state, xp: TOWER_XP_CAP, clearedFloor: 9,
    researchPurchases: 3, spiritStones: 4800, books: ['sj_formation', 'sj_bone'],
    skills: { sj_arc: 1, sj_wanjian: 10, sj_formation: 6, sj_bone: 4,
      sj_heart: 4, vajra: 2, sj_yujian: 2 }, ...patch })
  raw = JSON.stringify({ format: 'xianxia-sect-tower-campaign', schema: currentCampaignSchema, data, checksum: checksum(data) })
  const store = new TowerCampaignStore(disk, 0)
  assert.equal(store.readOnly, false, store.error)
  assert.equal(store.state.xp, TOWER_XP_CAP)
  return { store, disk }
}
function apply(store, actions) {
  for (const action of actions) {
    const result = store.act(action, 0)
    assert.equal(result.ok, true, `${JSON.stringify(action)}: ${result.reason}`)
  }
}

test('array learns incremental evolutions and retains both base investments', () => {
  const { store, disk } = fixture()
  assert.equal(growthSummary(store.state).available, 42)
  const actions = planNaturalGrowth(store.state, [['sj_wanjian', 10], ['sj_formation', 6]], evolutions)
  apply(store, actions)
  assert.ok(store.state.evolutionRanks.evo_wuwo >= 1)
  assert.ok(store.state.evolutionRanks.evo_sixiang >= 1)
  assert.equal(store.state.spiritStones, 0, 'both books debit their real 2400-stone price')
  assert.equal(store.state.skills.sj_wanjian, 10)
  assert.equal(store.state.skills.sj_formation, 6)
  assert.ok(growthSummary(store.state).available >= 0)
  assert.deepEqual(new TowerCampaignStore(disk, 0).state, store.state)
})

test('unaffordable or locked evolution never dismantles its parent', () => {
  const { store } = fixture({ spiritStones: 2399 })
  assert.deepEqual(planNaturalGrowth(store.state, [], evolutions), [])
  const state = { ...store.state, spiritStones: 4800, xp: 5400 }
  assert.deepEqual(planNaturalGrowth(state, [], evolutions), [])
})

test('tower strategy saves points for the next evolution and never refunds in battle', () => {
  const { store } = fixture()
  const state = { ...store.state, books: [...store.state.books, 'sj_line', 'sj_shadow'],
    skills: { ...store.state.skills, sj_yujian: 1, sj_line: 7, sj_cross: 9, sj_shadow: 9, sj_spirit: 1 }, activeRun: {} }
  assert.equal(growthSummary(state).available, 1)
  const actions = planNaturalGrowth(state, [['sj_yujian', 2]], evolutions)
  assert.deepEqual(actions, [], 'the one available point must not go to an ordinary skill')
})

test('insufficient points never dismantle the parent to purchase an evolution', () => {
  const { store } = fixture()
  const state = { ...store.state, books: [...store.state.books, 'sj_line', 'sj_shadow'],
    skills: { sj_arc: 10, sj_line: 10, sj_formation: 10, sj_wanjian: 1, sj_shadow: 10, sj_cross: 9 } }
  // Exercise the actual earned-point accounting with a focused unaffordable parent.
  const available = growthSummary(state).available
  assert.equal(available, 1)
  assert.deepEqual(planNaturalGrowth(state, [], ['evo_wuwo']), [])
})

test('fresh campaign continues ordinary growth before evolution unlocks', () => {
  const disk = { getItem: () => null, setItem() {} }
  const fresh = new TowerCampaignStore(disk, 0)
  const state = { ...fresh.state, xp: 45 }
  const actions = planNaturalGrowth(state, [['sj_arc', 2]], evolutions)
  assert.deepEqual(actions, [{ type: 'learnSkill', id: 'sj_arc' }])
})

test('an affordable tower evolution uses saved points without dismantling its parent', () => {
  const { store } = fixture()
  const skills = { ...store.state.skills, sj_heart: 1 }
  const state = { ...store.state, skills, activeRun: {} }
  assert.equal(growthSummary(state).available, 45)
  const actions = planNaturalGrowth(state, [], evolutions)
  assert.ok(actions.some(a => a.id === 'evo_wuwo'))
  assert.ok(actions.some(a => a.id === 'evo_sixiang'))
  assert.ok(actions.every(a => a.type === 'learnSkill'))
  assert.equal(state.skills.sj_wanjian, 10, 'preview never mutates its source')
})

 test('already evolved routes continue investing in their base instead of refunding it', () => {
 const {store} = fixture({ skills: { sj_arc:1, sj_wanjian:10, sj_formation:6 } })
 apply(store, planNaturalGrowth(store.state, [], evolutions))
 const actions = planNaturalGrowth(store.state, [['sj_formation', 7]], evolutions)
 assert.ok(actions.some(a => a.id === 'sj_formation' && a.type === 'learnSkill'))
 assert.ok(actions.every(a => a.type === 'learnSkill'))
 apply(store,actions)
 assert.equal(store.state.skills.sj_formation,7)
 })

test('pursuit split baseline buys real ranks and books, retains parents and leaves one earned point', () => {
  const {store,disk}=fixture({researchPurchases:0,spiritStones:10000,books:[],skills:{sj_arc:1}})
  const priorities=pursuitGrowthPriorities('split').flatMap(([id,n])=>id==='sj_yujian'&&n>=4
    ?[['sj_spirit',Math.ceil((n-3)/3)],[id,n]]:[[id,n]])
  const before=structuredClone(store.state)
  const actions=planNaturalGrowth(store.state,priorities,['evo_wanjian'])
  assert.deepEqual(store.state,before,'planning is read-only')
  apply(store,actions)
  assert.equal(store.state.skills.sj_arc,6)
  assert.equal(store.state.skills.sj_cross,3)
  assert.equal(store.state.skills.sj_yujian,10)
  assert.equal(store.state.skills.sj_shadow,10)
  assert.equal(store.state.evolutionRanks.evo_wanjian,2)
  assert.equal(growthSummary(store.state).spent,67)
  assert.equal(growthSummary(store.state).available,1)
  assert.ok(store.state.spiritStones<before.spiritStones,'books are actually paid')
  assert.deepEqual(planNaturalGrowth(store.state,priorities,['evo_wanjian']),[])
  assert.deepEqual(new TowerCampaignStore(disk,0).state,store.state)
})

test('pursuit legacy remains reproducible and shared progression prefix stays unchanged', () => {
  const old=pursuitGrowthPriorities('legacy'),next=pursuitGrowthPriorities('split')
  assert.equal(DEFAULT_GROWTH_POLICY,'legacy')
  assert.deepEqual(pursuitGrowthPriorities(),old,'unconfirmed candidate must remain opt-in')
  assert.deepEqual(next.slice(0,12),old.slice(0,12))
  assert.deepEqual(old.slice(12),[['sj_cross',6],['sj_arc',10]])
  next[0][1]=10
  assert.equal(pursuitGrowthPriorities('split')[0][1],3)
})
