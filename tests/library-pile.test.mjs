import test from 'node:test'
import assert from 'node:assert/strict'
import { layoutPile, overlapRatio, isCovered, BOOK_W, BOOK_H } from '../js/library/BookPile.js'
import { LIBRARY_LEVELS, levelBooks } from '../js/library/LibraryLevels.js'

const pileOf = level => layoutPile(levelBooks(level), { seed: `${level.seed}:pile`, jitter: level.jitter, rowStep: level.rowStep })

test('pile layout is deterministic and stays inside the pile area above the start waterline', () => {
  for (const level of LIBRARY_LEVELS) {
    const pile = pileOf(level)
    assert.deepEqual(pile, pileOf(level))
    assert.deepEqual(pile.map(b => b.z).sort((a, b) => a - b), pile.map((_, i) => i))
    for (const book of pile) {
      assert.ok(book.x - BOOK_W / 2 >= 0 && book.x + BOOK_W / 2 <= 1, book.id)
      assert.ok(book.y - BOOK_H / 2 >= .12 && book.y + BOOK_H / 2 <= 1, book.id)
      assert.equal(book.state, 'floor')
      assert.equal(book.wet, false)
    }
  }
})

test('overlap ratio is symmetric and covers the whole book when identical', () => {
  const a = { x: .5, y: .5 }, b = { x: .5 + BOOK_W / 2, y: .5 }
  assert.ok(Math.abs(overlapRatio(a, a) - 1) < 1e-9)
  assert.ok(Math.abs(overlapRatio(a, b) - .5) < 1e-9)
  assert.equal(overlapRatio(a, b), overlapRatio(b, a))
  assert.equal(overlapRatio(a, { x: .9, y: .9 }), 0)
})

test('only a higher floor book covering more than 30% blocks a book', () => {
  const low = { id: 'a', x: .5, y: .5, z: 0, state: 'floor' }
  const top = { id: 'b', x: .5 + BOOK_W * .6, y: .5, z: 1, state: 'floor' }
  assert.equal(isCovered(low, [low, top]), true)
  assert.equal(isCovered(top, [low, top]), false)
  assert.equal(isCovered(low, [low, { ...top, state: 'held' }]), false)
  assert.equal(isCovered(low, [low, { ...top, x: .5 + BOOK_W * .75 }]), false, '25% overlap is not enough')
})

test('level 1 has no overlaps; every later level starts with at least one blocked book', () => {
  const overlaps = pile => pile.some(a => pile.some(b => a !== b && overlapRatio(a, b) > 0))
  assert.equal(overlaps(pileOf(LIBRARY_LEVELS[0])), false)
  for (const level of LIBRARY_LEVELS.slice(1)) {
    const pile = pileOf(level)
    assert.ok(pile.some(b => isCovered(b, pile)), level.id)
  }
})
