import test from 'node:test'
import assert from 'node:assert/strict'

import { SeededRandom } from '../js/survivor/SurvivorRandom.js'
import {
  xpToNext,
  makeProgression,
  addXp,
  draftOffer,
  CARD_HEAL,
  CARD_CRYSTAL,
} from '../js/survivor/Progression.js'
import { WEAPONS } from '../js/survivor/data/weapons.js'

test('xpToNext matches the 01 §15.2 sample table', () => {
  // | L | 升到 L+1 所需 |
  const table = { 1: 5, 2: 11, 5: 31, 10: 71, 15: 118, 20: 173, 24: 222, 25: 235 }
  for (const [L, needed] of Object.entries(table)) {
    assert.equal(xpToNext(Number(L)), needed, `xpToNext(${L})`)
  }
})

test('xpToNext follows floor(5 + 6(L−1) + 0.15(L−1)²) for every level 1..30', () => {
  for (let L = 1; L <= 30; L += 1) {
    const expected = Math.floor(5 + 6 * (L - 1) + 0.15 * (L - 1) * (L - 1))
    assert.equal(xpToNext(L), expected)
  }
})

test('cumulative xp to reach Lv25 matches the §15.2 table (2651 to L+1 at L=25)', () => {
  // Sum of xpToNext(1..L) = cumulative to L+1.
  let cum = 0
  for (let L = 1; L <= 25; L += 1) cum += xpToNext(L)
  assert.equal(cum, 2651)
  let cum24 = 0
  for (let L = 1; L <= 24; L += 1) cum24 += xpToNext(L)
  assert.equal(cum24, 2416)
})

test('addXp levels up once when crossing a single threshold', () => {
  const prog = makeProgression()
  assert.equal(prog.level, 1)
  assert.equal(prog.needed, 5)
  const gained = addXp(prog, 5)
  assert.equal(gained, 1)
  assert.equal(prog.level, 2)
  assert.equal(prog.pendingLevels, 1)
  assert.equal(prog.needed, xpToNext(2))
})

test('addXp enqueues multiple level-ups when a big pickup crosses several thresholds', () => {
  const prog = makeProgression()
  // Lv1→2 needs 5, Lv2→3 needs 11, Lv3→4 needs 17 → 33 total crosses 3 levels (33≥5+11+17=33).
  const gained = addXp(prog, 5 + 11 + 17)
  assert.equal(gained, 3)
  assert.equal(prog.level, 4)
  assert.equal(prog.pendingLevels, 3)
  assert.equal(prog.xp, 0)
})

test('draftOffer always returns three cards', () => {
  const rng = new SeededRandom('draft')
  for (let lvl = 1; lvl <= 5; lvl += 1) {
    const offer = draftOffer({ weaponLevel: lvl, isFirstLevelUp: false }, rng)
    assert.equal(offer.length, 3, `weaponLevel ${lvl}`)
  }
})

test('first level-up guarantees the weapon upgrade card (首升保底)', () => {
  const rng = new SeededRandom('first')
  const offer = draftOffer({ weaponLevel: 1, isFirstLevelUp: true }, rng)
  const upgrade = offer.find((c) => c.kind === 'weapon' && c.id === 'spore_shot')
  assert.ok(upgrade, 'offer includes the spore_shot upgrade')
  assert.equal(upgrade.level, 2)
})

test('weapon upgrade card is offered whenever the weapon can still level up', () => {
  const rng = new SeededRandom('upg')
  for (let lvl = 1; lvl < WEAPONS.spore_shot.levels.length; lvl += 1) {
    const offer = draftOffer({ weaponLevel: lvl, isFirstLevelUp: false }, rng)
    const upgrade = offer.find((c) => c.kind === 'weapon')
    assert.ok(upgrade, `weaponLevel ${lvl} offers an upgrade`)
    assert.equal(upgrade.level, lvl + 1)
  }
})

test('a maxed weapon falls back to filler cards and still offers three (兜底卡)', () => {
  const rng = new SeededRandom('maxed')
  const maxLevel = WEAPONS.spore_shot.levels.length
  const offer = draftOffer({ weaponLevel: maxLevel, isFirstLevelUp: false }, rng)
  assert.equal(offer.length, 3)
  assert.ok(offer.every((c) => c.kind !== 'weapon'), 'no weapon upgrade when maxed')
  // Fallback cards come from the known pool.
  const ids = new Set([CARD_HEAL.id, CARD_CRYSTAL.id])
  assert.ok(offer.every((c) => ids.has(c.id)))
})

test('draftOffer is deterministic for the same seed and parameters', () => {
  const a = draftOffer({ weaponLevel: 2, isFirstLevelUp: false }, new SeededRandom('x'))
  const b = draftOffer({ weaponLevel: 2, isFirstLevelUp: false }, new SeededRandom('x'))
  assert.deepEqual(a.map((c) => c.id), b.map((c) => c.id))
})
