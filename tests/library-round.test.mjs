import test from 'node:test'
import assert from 'node:assert/strict'
import { LibraryRound, HEARTS, RACK_SIZE, MAGNIFIER_SECONDS } from '../js/library/LibraryRound.js'
import { BOOK_H } from '../js/library/BookPile.js'

const level = (patch = {}) => ({ id: 't', seed: 't', sections: ['mushroom', 'plant'], cols: 2, jitter: 0, rowStep: .3, waterSpeed: 0, leaks: [], ...patch })
const shelve = (round, book) => { assert.equal(round.pick(book.id), true); return round.drop(book.id, round.shelf.keyOf(book)) }
const free = round => round.books.find(b => round.canPick(b.id))

test('correct drops shelve, wrong or empty drops return the book to the floor', () => {
  const round = new LibraryRound(level()), book = free(round), other = round.books.find(b => b !== book)
  assert.equal(round.pick(book.id), true)
  assert.equal(round.drop(book.id, round.shelf.keyOf(other)), 'rejected')
  assert.equal(book.state, 'floor')
  round.pick(book.id)
  assert.equal(round.drop(book.id, null), 'rejected', 'released outside the shelf')
  assert.equal(book.state, 'floor')
  assert.equal(shelve(round, book), 'shelved')
  assert.equal(book.state, 'shelved')
  assert.equal(round.remaining, 3)
  assert.deepEqual(round.drain()[0], { type: 'shelved', id: book.id, key: round.shelf.keyOf(book) })
  assert.deepEqual(round.drain(), [])
})

test('only one book can be held at a time and covered books cannot be picked', () => {
  const round = new LibraryRound(level()), [a, b] = round.books
  b.x = a.x; b.y = a.y; b.z = a.z + 1
  assert.equal(round.canPick(a.id), false)
  assert.equal(round.pick(b.id), true)
  assert.equal(round.pick(round.books[2].id), false)
  round.cancel(b.id)
  assert.equal(b.state, 'floor')
})

test('water soaks floor books, damages their slot and costs a heart', () => {
  const round = new LibraryRound(level({ waterSpeed: 1 })), low = round.books[0]
  for (const book of round.books.slice(1)) book.y = .8
  round.rain.water = low.y - BOOK_H / 2 - .01
  round.update(.02)
  assert.equal(low.state, 'soaked')
  assert.equal(round.hearts, HEARTS - 1)
  assert.ok(round.shelf.damaged.has(round.shelf.keyOf(low)))
  assert.ok(round.drain().some(e => e.type === 'soaked' && e.id === low.id))
})

test('a held book is safe from water', () => {
  const round = new LibraryRound(level()), book = free(round)
  round.pick(book.id)
  round.rain.water = 1
  round.update(.1)
  assert.equal(book.state, 'held')
})

test('a long frame advances at most MAX_STEP so returning from background cannot flood the pile', () => {
  const round = new LibraryRound(level({ waterSpeed: .1 }))
  round.update(60)
  assert.ok(round.time <= .1 + 1e-9)
  assert.ok(round.water <= .01 + 1e-9)
})

test('completing a row recedes water once', () => {
  const round = new LibraryRound(level())
  round.rain.water = .5
  for (const book of round.books.filter(b => b.section === 'mushroom')) shelve(round, book)
  assert.ok(Math.abs(round.water - .42) < 1e-9)
  assert.ok(round.drain().some(e => e.type === 'row' && e.row === 0))
})

test('shelving the last book wins; soaking the last book also ends the round', () => {
  const round = new LibraryRound(level())
  for (const book of round.books) shelve(round, book)
  assert.equal(round.status, 'won')
  const second = new LibraryRound(level())
  for (const book of second.books.slice(0, 3)) shelve(second, book)
  second.rain.water = 1
  second.update(.1)
  assert.equal(second.status, 'won')
  assert.equal(second.hearts, HEARTS - 1)
})

test('losing all hearts waits for revive; revive works once, then the next loss ends the round', () => {
  const round = new LibraryRound(level({ sections: ['mushroom', 'plant', 'bird', 'flower'], cols: 2 }))
  round.rain.water = .6
  for (const book of round.books) book.y = .3
  round.update(.1)
  assert.equal(round.status, 'reviving')
  assert.equal(round.hearts, 0)
  const held = round.books.find(b => b.state === 'floor')
  assert.equal(round.pick(held.id), false, 'no picking while waiting')
  assert.equal(round.useMagnifier(), false)
  assert.equal(round.revive(), true)
  assert.equal(round.hearts, HEARTS)
  assert.ok(Math.abs(round.water - .3) < 1e-9)
  assert.equal(round.revive(), false)
  round.rain.water = .6
  round.update(.1)
  assert.equal(round.status, 'lost')
})

test('dropping while the round is not playing is rejected', () => {
  const round = new LibraryRound(level()), book = free(round)
  round.pick(book.id)
  round.status = 'reviving'
  assert.equal(round.drop(book.id, round.shelf.keyOf(book)), 'rejected')
  assert.equal(book.state, 'floor')
})

test('give up only ends a round that is waiting for revive', () => {
  const round = new LibraryRound(level())
  round.giveUp()
  assert.equal(round.status, 'playing')
  round.status = 'reviving'
  round.giveUp()
  assert.equal(round.status, 'lost')
})

test('leaks wet the top floor book under them; wet books cannot be shelved and dry on the rack', () => {
  const round = new LibraryRound(level({ leaks: [{ x: .5, min: 1, max: 1 }] }))
  const [a, b] = round.books
  a.x = .5; b.x = .5; b.y = a.y + .3; b.z = a.z + 10
  round.update(.1); for (let i = 0; i < 10; i += 1) round.update(.1)
  assert.equal(b.wet, true)
  assert.equal(a.wet, false)
  round.drain()
  assert.equal(round.pick(b.id), true)
  assert.equal(round.drop(b.id, round.shelf.keyOf(b)), 'rejected')
  round.pick(b.id)
  assert.equal(round.dropToRack(b.id), true)
  assert.equal(b.state, 'drying')
  for (const other of round.books) if (other !== b) other.state = 'shelved'
  round.rain.water = .7
  round.rain.leaks = []
  for (let i = 0; i < 49; i += 1) round.update(.1)
  assert.equal(b.state, 'drying', 'drying books are not soaked')
  round.update(.1); round.update(.1)
  assert.equal(b.state, 'floor')
  assert.equal(b.wet, false)
  assert.ok(b.z > Math.max(...round.books.filter(o => o !== b).map(o => o.z)))
  assert.equal(b.y, 1 - BOOK_H / 2, 'no room above water: highest spot')
  assert.ok(round.drain().some(e => e.type === 'dried' && e.id === b.id))
})

test('dried books sit at least 0.15 above the water', () => {
  const round = new LibraryRound(level())
  const book = free(round)
  book.wet = true
  round.pick(book.id)
  round.dropToRack(book.id)
  round.rain.water = .1
  for (let i = 0; i < 51; i += 1) round.update(.1)
  assert.equal(book.state, 'floor')
  assert.ok(book.y - BOOK_H / 2 >= .1 + .15 - 1e-9)
})

test('the rack holds two books and refuses dry books', () => {
  const round = new LibraryRound(level({ sections: ['mushroom', 'plant'], cols: 3 }))
  const books = round.books.filter(b => round.canPick(b.id)).slice(0, RACK_SIZE + 2)
  books.forEach(b => { b.wet = true })
  for (const b of books.slice(0, RACK_SIZE)) { round.pick(b.id); assert.equal(round.dropToRack(b.id), true) }
  round.pick(books[RACK_SIZE].id)
  assert.equal(round.dropToRack(books[RACK_SIZE].id), false)
  assert.equal(books[RACK_SIZE].state, 'floor')
  const dry = round.books.find(b => round.canPick(b.id) && !b.wet)
  round.pick(dry.id)
  assert.equal(round.dropToRack(dry.id), false)
})

test('magnifier: one free charge, lasts 8 seconds, hints the right slot, extra charges from ads', () => {
  const round = new LibraryRound(level()), book = round.books[0]
  assert.equal(round.hintSlot(book.id), null)
  assert.equal(round.useMagnifier(), true)
  assert.equal(round.useMagnifier(), false, 'already active')
  assert.equal(round.hintSlot(book.id), round.shelf.keyOf(book))
  for (let i = 0; i < MAGNIFIER_SECONDS * 10 + 1; i += 1) round.update(.1)
  assert.equal(round.hintSlot(book.id), null)
  assert.equal(round.useMagnifier(), false, 'no charges left')
  round.grantMagnifier()
  assert.equal(round.useMagnifier(), true)
  book.wet = true
  assert.equal(round.hintSlot(book.id), null, 'wet books give no hint')
})
