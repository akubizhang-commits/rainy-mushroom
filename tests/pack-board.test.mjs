import test from 'node:test'
import assert from 'node:assert/strict'
import { PackBoard } from '../js/library/PackBoard.js'

const cabinets = [
  { rows: [{ height: 'tall', length: 4 }, { height: 'short', length: 3 }] },
  { rows: [{ height: 'short', length: 5 }] },
]
const book = (cabinet, thickness, height = 'short') => ({ cabinet, thickness, height })

test('fit judges the cabinet first, then height, then remaining room', () => {
  const board = new PackBoard(cabinets)
  assert.equal(board.fit(book(1, 3, 'tall'), 0, 1), 'wrong-cabinet')
  assert.equal(board.fit(book(0, 1, 'tall'), 0, 1), 'too-tall')
  assert.equal(board.fit(book(0, 3, 'tall'), 0, 0), 'ok')
  assert.equal(board.fit(book(0, 1), 0, 0), 'ok', 'short books fit tall rows')
  assert.equal(board.fit(book(0, 1), 5, 0), 'too-thick', 'missing rows never accept')
  board.place(book(0, 3, 'tall'), 0, 0)
  assert.equal(board.fit(book(0, 2), 0, 0), 'too-thick')
  assert.equal(board.size(book(1, 2), 0, 0), 'too-thick', 'size ignores the cabinet')
})

test('rows fill exactly, report completion, and close up after a removal', () => {
  const board = new PackBoard(cabinets)
  const a = book(0, 1), b = book(0, 2), c = book(0, 1, 'tall')
  assert.ok(board.place(a, 0, 0) && board.place(b, 0, 0) && board.place(c, 0, 0))
  assert.equal(board.used(0, 0), 4)
  assert.equal(board.full(0, 0), true)
  assert.equal(board.place(book(0, 1), 0, 0), false)
  assert.equal(board.complete, false)
  assert.deepEqual(board.remove(b), { cabinet: 0, row: 0, index: 1 })
  assert.deepEqual(board.row(0, 0).books, [a, c])
  assert.equal(board.full(0, 0), false)
  assert.equal(board.remove(b), null)
  assert.deepEqual(board.where(c), { cabinet: 0, row: 0, index: 1 })
})

test('the board is complete only when every row is exactly full', () => {
  const board = new PackBoard(cabinets)
  board.place(book(0, 3, 'tall'), 0, 0); board.place(book(0, 1), 0, 0)
  board.place(book(0, 3), 0, 1)
  board.place(book(1, 3), 1, 0)
  assert.equal(board.complete, false)
  board.place(book(1, 2), 1, 0)
  assert.equal(board.complete, true)
})
