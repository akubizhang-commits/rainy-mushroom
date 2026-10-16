import test from 'node:test'
import assert from 'node:assert/strict'
import { crystalsForRun, settle, bonuses, nextPrice, buy, spentTotal, reset } from '../js/survivor/Meta.js'
import { defaultProfile } from '../js/survivor/SurvivorSave.js'
import { PERMANENT } from '../js/survivor/data/permanent.js'

test('01 §13.1 example: 3-minute loss ≈ 18 + 6 = 24', () => {
  const r = crystalsForRun({ outcome: 'lost', survivalSec: 180, purified: 300, eliteDefeated: 0, bossDefeated: false, shinyCards: 0 })
  assert.equal(r.survival, 18)
  assert.equal(r.purified, 6)
  assert.equal(r.total, 24)
})

test('01 §13.1 example: win at ~8:10 with ~1400 purified = 49+28+5+30+20 = 132', () => {
  const r = crystalsForRun({ outcome: 'won', survivalSec: 490, purified: 1400, eliteDefeated: 1, bossDefeated: true, shinyCards: 0 })
  assert.deepEqual(r, { survival: 49, purified: 28, elite: 5, boss: 30, victory: 20, shiny: 0, total: 132 })
})

test('shiny cards ×5, elite reward is flat 5, fractions floored, bad input → 0', () => {
  assert.equal(crystalsForRun({ survivalSec: 19.9, purified: 49, eliteDefeated: 3, shinyCards: 2 }).total, 1 + 0 + 5 + 10)
  assert.equal(crystalsForRun({ survivalSec: NaN, purified: -10 }).total, 0)
  assert.equal(crystalsForRun(null).total, 0)
})

test('settle adds crystals, counts runs/wins, keeps best survival, does not mutate input', () => {
  const p0 = defaultProfile()
  const { profile: p1, earned } = settle(p0, { outcome: 'lost', survivalSec: 180.6, purified: 300, abandoned: true })
  assert.equal(earned.total, 24)
  assert.equal(p1.crystals, 24)
  assert.equal(p1.runs, 1)
  assert.equal(p1.wins, 0)
  assert.equal(p1.bestSurvivalSec, 180)
  assert.deepEqual(p0, defaultProfile())
  const { profile: p2 } = settle(p1, { outcome: 'won', survivalSec: 100, purified: 0 })
  assert.equal(p2.wins, 1)
  assert.equal(p2.runs, 2)
  assert.equal(p2.bestSurvivalSec, 180)
  assert.equal(p2.crystals, 24 + 10 + 20)
})

test('bonuses map levels to Stats bonus fields', () => {
  assert.deepEqual(bonuses(defaultProfile()), { maxHp: 0, might: 0, moveSpeed: 0, pickup: 0, regen: 0 })
  const p = defaultProfile()
  p.permanent = { perm_hp: 5, perm_might: 3, perm_speed: 3, perm_magnet: 2, perm_regen: 3 }
  assert.deepEqual(bonuses(p), { maxHp: 50, might: 0.15, moveSpeed: 0.15, pickup: 0.3, regen: 0.6 })
})

test('buy deducts price per level, rejects insufficient / max / unknown without change', () => {
  let p = { ...defaultProfile(), crystals: 100 }
  assert.equal(nextPrice(p, 'perm_hp'), 20)
  const r1 = buy(p, 'perm_hp')
  assert.equal(r1.ok, true)
  assert.equal(r1.profile.crystals, 80)
  assert.equal(r1.profile.permanent.perm_hp, 1)
  assert.equal(p.permanent.perm_hp, 0, 'input untouched')
  p = r1.profile
  const r2 = buy(p, 'perm_hp')
  assert.equal(r2.profile.crystals, 40)
  const r3 = buy({ ...r2.profile, crystals: 69 }, 'perm_hp')
  assert.deepEqual([r3.ok, r3.reason, r3.profile.crystals], [false, 'insufficient', 69])
  const maxed = { ...defaultProfile(), crystals: 9999, permanent: { ...defaultProfile().permanent, perm_speed: 3 } }
  assert.equal(nextPrice(maxed, 'perm_speed'), null)
  assert.equal(buy(maxed, 'perm_speed').reason, 'max')
  assert.equal(buy(maxed, 'perm_nope').reason, 'unknown')
})

test('buying everything costs 1570; reset refunds in full', () => {
  let p = { ...defaultProfile(), crystals: 2000 }
  for (const def of PERMANENT) {
    for (let i = 0; i < def.prices.length; i++) {
      const r = buy(p, def.id)
      assert.equal(r.ok, true)
      p = r.profile
    }
  }
  assert.equal(p.crystals, 2000 - 1570)
  assert.equal(spentTotal(p), 1570)
  const { profile: q, refunded } = reset(p)
  assert.equal(refunded, 1570)
  assert.equal(q.crystals, 2000)
  assert.deepEqual(q.permanent, defaultProfile().permanent)
  assert.equal(spentTotal(p), 1570, 'input untouched')
})
