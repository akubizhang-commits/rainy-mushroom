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
  draftCandidates,
  WEIGHT_UPGRADE,
  WEIGHT_NEW_WEAPON,
  WEIGHT_NEW_PASSIVE,
} from '../js/survivor/Progression.js'

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

const START = () => ({ weapons: [{ id: 'spore_shot', level: 1 }], passives: {}, isFirstLevelUp: false })
const key = (c) => `${c.kind}:${c.id}`

test('draftOffer always returns three distinct non-fallback cards when the pool allows', () => {
  const rng = new SeededRandom('draft')
  for (let i = 0; i < 200; i += 1) {
    const offer = draftOffer(START(), rng)
    assert.equal(offer.length, 3)
    assert.equal(new Set(offer.map(key)).size, 3, 'no duplicate card in one offer')
    for (const c of offer) {
      assert.ok(c.kind === 'weapon' || c.kind === 'passive')
      assert.equal(c.evolution, false, 'S2 never offers evolution cards')
    }
  }
})

test('candidate pool follows 01 §8.2 weights and excludes out-of-scope content (K3)', () => {
  const pool = draftCandidates({ weapons: [{ id: 'spore_shot', level: 2 }], passives: { might: 1 } })
  const byKey = new Map(pool.map((p) => [key(p.card), p]))
  assert.equal(byKey.get('weapon:spore_shot').weight, WEIGHT_UPGRADE)
  assert.equal(byKey.get('weapon:spore_shot').card.level, 3)
  assert.equal(byKey.get('weapon:spore_shot').card.isNew, false)
  assert.equal(byKey.get('passive:might').weight, WEIGHT_UPGRADE)
  assert.equal(byKey.get('passive:might').card.level, 2)
  for (const id of ['umbrella_blades', 'dew_ring', 'raindrop', 'leaf_boomerang']) {
    assert.equal(byKey.get(`weapon:${id}`).weight, WEIGHT_NEW_WEAPON)
    assert.equal(byKey.get(`weapon:${id}`).card.isNew, true)
    assert.equal(byKey.get(`weapon:${id}`).card.level, 1)
  }
  for (const id of ['cooldown', 'area', 'speed']) {
    assert.equal(byKey.get(`passive:${id}`).weight, WEIGHT_NEW_PASSIVE)
  }
  assert.equal(pool.length, 9)
  assert.deepEqual([WEIGHT_UPGRADE, WEIGHT_NEW_WEAPON, WEIGHT_NEW_PASSIVE], [10, 8, 4]) // 08 K11：新被动 6 → 4
})

test('regen / magnet never appear in any offer; all five weapons do (08 K8)', () => {
  const banned = new Set(['regen', 'magnet'])
  const weaponsSeen = new Set()
  const rng = new SeededRandom('banned')
  let state = START()
  for (let i = 0; i < 2000; i += 1) {
    const offer = draftOffer(state, rng)
    for (const c of offer) {
      assert.ok(!banned.has(c.id), `offered ${c.id}`)
      if (c.kind === 'weapon') weaponsSeen.add(c.id)
    }
    if (i % 50 === 0) state = START()
    // Walk the build forward by taking the first card so later offers cover upgrades.
    state = applyForTest(state, offer[0])
  }
  assert.deepEqual([...weaponsSeen].sort(), ['dew_ring', 'leaf_boomerang', 'raindrop', 'spore_shot', 'umbrella_blades'])
})

test('first level-up guarantees at least one new-weapon card (首升保底)', () => {
  for (let i = 0; i < 500; i += 1) {
    const offer = draftOffer({ ...START(), isFirstLevelUp: true }, new SeededRandom(`first-${i}`))
    assert.ok(offer.some((c) => c.kind === 'weapon' && c.isNew), `seed first-${i}`)
  }
})

test('maxed weapons and passives no longer produce upgrade cards', () => {
  const state = {
    weapons: [{ id: 'spore_shot', level: 5 }, { id: 'umbrella_blades', level: 5 }],
    passives: { might: 5, area: 2 },
    isFirstLevelUp: false,
  }
  const rng = new SeededRandom('maxed')
  for (let i = 0; i < 300; i += 1) {
    for (const c of draftOffer(state, rng)) {
      assert.notEqual(c.id, 'spore_shot')
      assert.notEqual(c.id, 'umbrella_blades')
      assert.notEqual(c.id, 'might')
      if (c.id === 'area') assert.equal(c.level, 3)
    }
  }
})

test('full weapon slots stop new-weapon cards; full passive slots stop new-passive cards', () => {
  const rng = new SeededRandom('slots')
  const state = {
    weapons: [{ id: 'spore_shot', level: 2 }],
    passives: { might: 1 },
    weaponSlots: 1,
    passiveSlots: 1,
    isFirstLevelUp: true, // guarantee cannot be met → silently skipped
  }
  for (let i = 0; i < 300; i += 1) {
    const offer = draftOffer(state, rng)
    assert.equal(offer.length, 3)
    assert.ok(offer.every((c) => !c.isNew), 'no new weapon/passive with full slots')
    assert.ok(offer.some((c) => c.id === 'spore_shot'))
    assert.ok(offer.some((c) => c.id === 'might'))
  }
})

test('everything maxed → only fallback cards (兜底卡), still three of them', () => {
  const state = {
    weapons: [{ id: 'spore_shot', level: 5 }, { id: 'umbrella_blades', level: 5 }, { id: 'dew_ring', level: 5 }, { id: 'raindrop', level: 5 }],
    passives: { might: 5, cooldown: 5, area: 5, speed: 5 },
    isFirstLevelUp: false,
  }
  const ids = new Set([CARD_HEAL.id, CARD_CRYSTAL.id])
  const rng = new SeededRandom('allmax')
  for (let i = 0; i < 50; i += 1) {
    const offer = draftOffer(state, rng)
    assert.equal(offer.length, 3)
    assert.ok(offer.every((c) => ids.has(c.id)))
    assert.ok(offer.some((c) => c.id === CARD_HEAL.id) && offer.some((c) => c.id === CARD_CRYSTAL.id))
  }
})

test('one candidate left → it is offered and fallback cards fill the rest', () => {
  const state = {
    weapons: [{ id: 'spore_shot', level: 4 }, { id: 'umbrella_blades', level: 5 }, { id: 'dew_ring', level: 5 }, { id: 'leaf_boomerang', level: 5 }],
    passives: { might: 5, cooldown: 5, area: 5, speed: 5 },
    isFirstLevelUp: false,
  }
  const offer = draftOffer(state, new SeededRandom('one'))
  assert.equal(offer[0].id, 'spore_shot')
  assert.equal(offer[0].level, 5)
  assert.ok(offer.slice(1).every((c) => c.kind === 'heal' || c.kind === 'crystal'))
})

test('10 000 draws: first-card type frequency matches the weight ratio within 5%', () => {
  // Pool: 1 upgrade (W_UP) + 4 new weapons (4 × W_NEW) + 4 new passives (4 × W_PAS).
  const total = WEIGHT_UPGRADE + 4 * WEIGHT_NEW_WEAPON + 4 * WEIGHT_NEW_PASSIVE
  const expected = { upgrade: WEIGHT_UPGRADE / total, newWeapon: (4 * WEIGHT_NEW_WEAPON) / total, newPassive: (4 * WEIGHT_NEW_PASSIVE) / total }
  const counts = { upgrade: 0, newWeapon: 0, newPassive: 0 }
  const rng = new SeededRandom('freq')
  const N = 10000
  for (let i = 0; i < N; i += 1) {
    const c = draftOffer(START(), rng)[0]
    if (!c.isNew) counts.upgrade += 1
    else if (c.kind === 'weapon') counts.newWeapon += 1
    else counts.newPassive += 1
  }
  for (const k of Object.keys(expected)) {
    const freq = counts[k] / N
    assert.ok(Math.abs(freq - expected[k]) / expected[k] < 0.05, `${k}: ${freq} vs ${expected[k]}`)
  }
  // 01 §8.2 参考：10 / 32 / 16（共 58），单张抽到新被动约 28%。
  assert.equal(total, 58)
  assert.ok(Math.abs(counts.newPassive / N - 16 / 58) < 0.02, `新被动 ≈ 27.6% (got ${counts.newPassive / N})`)
})

test('draftOffer is deterministic for the same seed and parameters', () => {
  const a = draftOffer(START(), new SeededRandom('x'))
  const b = draftOffer(START(), new SeededRandom('x'))
  assert.deepEqual(a.map(key), b.map(key))
})

// Minimal mirror of SurvivorRun._applyCard for walking builds in tests.
function applyForTest(state, c) {
  const weapons = state.weapons.map((w) => ({ ...w }))
  const passives = { ...state.passives }
  if (c.kind === 'weapon') {
    const w = weapons.find((x) => x.id === c.id)
    if (w) w.level = c.level
    else weapons.push({ id: c.id, level: 1 })
  } else if (c.kind === 'passive') {
    passives[c.id] = c.level
  }
  return { weapons, passives, isFirstLevelUp: false }
}

// --- 5 选 4：武器栏 4 格（08 K8，01 §8.2 第 2 条） ---

test('with 3 weapons owned, the 2 unowned weapons are both new-weapon candidates', () => {
  const pool = draftCandidates({
    weapons: [{ id: 'spore_shot', level: 1 }, { id: 'raindrop', level: 1 }, { id: 'leaf_boomerang', level: 1 }],
    passives: {},
  })
  const fresh = pool.filter((p) => p.card.kind === 'weapon' && p.card.isNew).map((p) => p.card.id).sort()
  assert.deepEqual(fresh, ['dew_ring', 'umbrella_blades'])
})

test('4 weapons owned (slots full) → no new-weapon card ever, the 5th weapon is left out', () => {
  const combos = [
    ['spore_shot', 'umbrella_blades', 'dew_ring', 'raindrop'],
    ['spore_shot', 'umbrella_blades', 'dew_ring', 'leaf_boomerang'],
    ['spore_shot', 'raindrop', 'leaf_boomerang', 'dew_ring'],
  ]
  for (const ids of combos) {
    const state = { weapons: ids.map((id) => ({ id, level: 1 })), passives: {}, isFirstLevelUp: true }
    const left = ['spore_shot', 'umbrella_blades', 'dew_ring', 'raindrop', 'leaf_boomerang'].find((id) => !ids.includes(id))
    assert.ok(!draftCandidates(state).some((p) => p.card.isNew && p.card.kind === 'weapon'))
    const rng = new SeededRandom(`full-${left}`)
    for (let i = 0; i < 500; i += 1) {
      for (const c of draftOffer(state, rng)) {
        assert.ok(!(c.kind === 'weapon' && c.isNew), `new weapon ${c.id} offered with full slots`)
        assert.notEqual(c.id, left)
      }
    }
  }
})

test('walking random builds: never more than 4 weapons, and every run leaves exactly one out', () => {
  const ALL = ['spore_shot', 'umbrella_blades', 'dew_ring', 'raindrop', 'leaf_boomerang']
  const leftOut = new Set()
  for (let run = 0; run < 60; run += 1) {
    const rng = new SeededRandom(`walk-${run}`)
    const pickRng = new SeededRandom(`walk-pick-${run}`)
    let state = { ...START(), isFirstLevelUp: true }
    for (let lv = 0; lv < 60; lv += 1) {
      const offer = draftOffer(state, rng)
      // Prefer weapon cards so slots fill quickly; otherwise pick at random.
      const weaponIdx = offer.findIndex((c) => c.kind === 'weapon' && c.isNew)
      const pick = weaponIdx >= 0 ? offer[weaponIdx] : offer[pickRng.int(0, offer.length - 1)]
      state = applyForTest(state, pick)
      assert.ok(state.weapons.length <= 4, 'weapon slots never exceed 4')
    }
    assert.equal(state.weapons.length, 4)
    const missing = ALL.filter((id) => !state.weapons.some((w) => w.id === id))
    assert.equal(missing.length, 1)
    leftOut.add(missing[0])
  }
  // Over many seeds each of the four non-starting weapons is sometimes the one left out.
  assert.deepEqual([...leftOut].sort(), ['dew_ring', 'leaf_boomerang', 'raindrop', 'umbrella_blades'])
})
