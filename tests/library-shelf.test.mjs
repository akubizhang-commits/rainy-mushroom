import test from 'node:test'
import assert from 'node:assert/strict'
import { SeededRandom } from '../js/library/LibraryRandom.js'
import { LIBRARY_LEVELS, SECTIONS, levelById, levelBooks } from '../js/library/LibraryLevels.js'
import { ShelfBoard, shelfLayout, nearestSlot, SNAP_RADIUS } from '../js/library/ShelfBoard.js'

test('seeded random repeats for the same seed', () => {
  const a = new SeededRandom('x'), b = new SeededRandom('x')
  assert.deepEqual([a.next(), a.next(), a.int(1, 6)], [b.next(), b.next(), b.int(1, 6)])
  assert.deepEqual(new SeededRandom('s').shuffle([1, 2, 3, 4]).sort(), [1, 2, 3, 4])
})

test('five levels match the designed shelf sizes and every section is defined', () => {
  assert.deepEqual(LIBRARY_LEVELS.map(l => levelBooks(l).length), [10, 15, 18, 24, 24])
  assert.deepEqual(LIBRARY_LEVELS.map(l => l.sections.length), [2, 3, 3, 4, 4])
  assert.deepEqual(LIBRARY_LEVELS.map(l => l.leaks.length), [0, 0, 0, 0, 1])
  for (const l of LIBRARY_LEVELS) {
    assert.ok(l.waterSpeed > 0 && l.tip && l.name)
    for (const s of l.sections) assert.ok(SECTIONS[s], s)
  }
  assert.equal(levelById('library-03').name, '苔藓书柜')
  assert.equal(levelById('nope'), null)
})

test('every book has exactly one slot and ids are unique', () => {
  for (const l of LIBRARY_LEVELS) {
    const books = levelBooks(l), board = new ShelfBoard(l.sections, l.cols)
    assert.equal(new Set(books.map(b => board.keyOf(b))).size, books.length)
    assert.equal(new Set(books.map(b => b.id)).size, books.length)
  }
})

test('placing accepts only the matching empty slot', () => {
  const board = new ShelfBoard(['mushroom', 'plant'], 5), book = { id: 'plant-3', section: 'plant', volume: 3 }
  assert.equal(board.keyOf(book), '1:2')
  assert.equal(board.keyOf({ id: 'x', section: 'bird', volume: 1 }), null)
  assert.equal(board.place(book, '1:1'), false)
  assert.equal(board.place(book, null), false)
  assert.equal(board.place(book, '1:2'), true)
  assert.equal(board.place(book, '1:2'), false)
})

test('a row completes once when every undamaged slot is filled', () => {
  const board = new ShelfBoard(['mushroom'], 3), b = v => ({ id: `mushroom-${v}`, section: 'mushroom', volume: v })
  board.place(b(1), '0:0')
  assert.equal(board.claimCompletedRow('0:0'), -1)
  board.damage(b(2))
  board.place(b(3), '0:2')
  assert.equal(board.claimCompletedRow('0:2'), 0)
  assert.equal(board.claimCompletedRow('0:2'), -1)
  assert.equal(board.place(b(2), '0:1'), false, 'damaged slots stay closed')
})

test('shelf layout and snapping pick the nearest slot within the radius', () => {
  const slots = shelfLayout({ left: 0, top: 100, width: 140, height: 100, plaque: 40 }, 2, 2)
  assert.deepEqual(slots.map(s => [s.key, s.x, s.y]), [['0:0', 65, 75], ['0:1', 115, 75], ['1:0', 65, 25], ['1:1', 115, 25]])
  assert.equal(nearestSlot(slots, 66, 74), '0:0')
  assert.equal(nearestSlot(slots, 65, 75 + SNAP_RADIUS), '0:0')
  assert.equal(nearestSlot(slots, 65, 75 + SNAP_RADIUS + 1), null)
})
