import test from 'node:test'
import assert from 'node:assert/strict'
import { PACK_LEVELS, PACK_IDS, packLevelById, generate, candidates, isAmbiguous, sharedAttr } from '../js/library/PackLevels.js'

const seeds = level => [level.seed, ...Array.from({ length: 49 }, (_, i) => `${level.seed}:${i}`)]

test('three levels in order, looked up by id', () => {
  assert.deepEqual(PACK_IDS, ['pack-01', 'pack-02', 'pack-03'])
  assert.equal(packLevelById('pack-02').name, PACK_LEVELS[1].name)
  assert.equal(packLevelById('nope'), null)
})

test('every deal fills each cabinet exactly and tall books fit the tall rows', () => {
  for (const level of PACK_LEVELS) for (const seed of seeds(level)) {
    const { books, steps } = generate(level, seed)
    assert.equal(steps, Math.ceil(books.length * level.slack))
    assert.deepEqual(books.map(b => b.slot), books.map((b, i) => i))
    assert.equal(new Set(books.map(b => b.id)).size, books.length)
    level.cabinets.forEach((cabinet, c) => {
      const mine = books.filter(b => b.cabinet === c)
      const sum = list => list.reduce((s, x) => s + x, 0)
      assert.equal(sum(mine.map(b => b.thickness)), sum(cabinet.rows.map(r => r.length)), `${level.id} ${seed} cabinet ${c}`)
      assert.ok(sum(mine.filter(b => b.height === 'tall').map(b => b.thickness)) <= sum(cabinet.rows.filter(r => r.height === 'tall').map(r => r.length)))
      for (const b of mine) {
        assert.equal(b.color, cabinet.color)
        assert.equal(b.pattern, cabinet.pattern)
        assert.ok(b.thickness >= 1 && b.thickness <= 3)
        assert.ok(b.shown.length >= 1)
        assert.equal(b.state, 'floor')
        assert.equal(b.flipped, false)
      }
    })
  }
})

test('ambiguity: none on level 1, exactly the target count on levels 2 and 3', () => {
  assert.equal(sharedAttr(PACK_LEVELS[0].cabinets), null)
  for (const level of PACK_LEVELS) for (const seed of seeds(level)) {
    const { books } = generate(level, seed)
    assert.equal(books.filter(b => isAmbiguous(b, level.cabinets)).length, level.ambiguous, `${level.id} ${seed}`)
    for (const b of books) assert.ok(candidates(b, level.cabinets).includes(b.cabinet))
  }
  assert.equal(PACK_LEVELS[0].ambiguous, 0)
  assert.ok(PACK_LEVELS[2].ambiguous > PACK_LEVELS[1].ambiguous)
})

test('the same seed deals the same books', () => {
  const level = PACK_LEVELS[2]
  assert.deepEqual(generate(level, 'x'), generate(level, 'x'))
  assert.notDeepEqual(generate(level, 'x'), generate(level, 'y'))
})

test('book counts stay near the level targets', () => {
  const targets = [8, 12, 15]
  PACK_LEVELS.forEach((level, i) => {
    const counts = seeds(level).map(seed => generate(level, seed).books.length)
    const mean = counts.reduce((s, n) => s + n, 0) / counts.length
    assert.ok(Math.abs(mean - targets[i]) <= 3, `${level.id} mean ${mean}`)
  })
})
