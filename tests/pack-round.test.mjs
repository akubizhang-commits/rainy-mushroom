import test from 'node:test'
import assert from 'node:assert/strict'
import { PackRound, REVIVE_SHARE } from '../js/library/PackRound.js'

// Both cabinets are red; only the pattern tells them apart.
const level = {
  id: 'tiny', seed: 'tiny', refund: 1, cabinets: [
    { color: 'red', pattern: 'cap', rows: [{ height: 'tall', length: 3 }, { height: 'short', length: 2 }] },
    { color: 'red', pattern: 'leaf', rows: [{ height: 'short', length: 3 }] },
  ],
}
const make = (cabinet, thickness, height, shown, slot) => ({
  id: `b${slot}`, slot, cabinet, thickness, height, shown, flipped: false, state: 'floor',
  color: 'red', pattern: cabinet ? 'leaf' : 'cap',
})
// b0 tall 3 → L0; b1 2 → L1; b2 3 → R0 (ambiguous); b3 2 (spare for the wrong-size checks)
const deal = (steps = 20) => ({ steps, books: [make(0, 3, 'tall', ['pattern'], 0), make(0, 2, 'short', ['color', 'pattern'], 1), make(1, 3, 'short', ['color'], 2), make(0, 2, 'short', ['pattern'], 3)] })
const round = (steps) => new PackRound(level, { deal: deal(steps) })

test('flipping costs one step, reveals everything, and only works once', () => {
  const r = round()
  assert.deepEqual(r.visible('b2'), ['color'])
  assert.equal(r.canFlip('b1'), false, 'fully shown books have nothing to flip')
  assert.equal(r.flip('b2'), true)
  assert.deepEqual(r.visible('b2'), ['color', 'pattern'])
  assert.equal(r.used, 1)
  assert.equal(r.flip('b2'), false)
  assert.equal(r.used, 1)
  assert.deepEqual(r.drain(), [{ type: 'flipped', id: 'b2' }])
})

test('a wrong cabinet costs two steps, bounces the book and flips it', () => {
  const r = round()
  assert.equal(r.place('b2', 0, 1), 'wrong-cabinet')
  assert.equal(r.used, 2)
  assert.equal(r.book('b2').state, 'floor')
  assert.equal(r.book('b2').flipped, true)
  assert.deepEqual(r.drain(), [{ type: 'wrong', id: 'b2', cabinet: 0 }])
})

test('the right cabinet with the wrong size costs nothing', () => {
  const r = round()
  assert.equal(r.place('b0', 0, 1), 'too-tall')
  assert.equal(r.place('b1', 0, 0), 'ok')
  assert.equal(r.place('b3', 0, 0), 'too-thick')
  assert.equal(r.used, 1)
  assert.equal(r.book('b3').state, 'floor')
})

test('a row filled for the first time refunds once; pulling a book out costs a step', () => {
  const r = round()
  assert.equal(r.place('b1', 0, 1), 'ok')
  assert.equal(r.used, 0, '1 step spent, 1 refunded')
  assert.deepEqual(r.drain(), [{ type: 'placed', id: 'b1', cabinet: 0, row: 1 }, { type: 'full', cabinet: 0, row: 1 }])
  assert.equal(r.remove('b1'), true)
  assert.equal(r.used, 1)
  assert.equal(r.book('b1').state, 'floor')
  assert.deepEqual(r.drain(), [{ type: 'removed', id: 'b1', cabinet: 0, row: 1 }])
  assert.equal(r.place('b1', 0, 1), 'ok')
  assert.equal(r.used, 2, 'no second refund')
  assert.equal(r.remove('b0'), false, 'floor books cannot be removed')
})

test('hover previews only use what the player can already see', () => {
  const r = round()
  assert.equal(r.preview('b2', 0, 1), 'too-thick', 'ambiguous book: the size is the only visible problem')
  assert.equal(r.preview('b2', 1, 0), 'ok')
  assert.equal(r.preview('b0', 1, 0), 'mismatch', 'shown pattern rules the right cabinet out')
  assert.equal(r.preview('b0', 0, 1), 'too-tall')
  r.flip('b2')
  assert.equal(r.preview('b2', 0, 0), 'mismatch')
})

test('running out of steps offers one revive, then the round is lost', () => {
  const r = round(4)
  r.place('b2', 0, 0)
  r.place('b3', 1, 0)
  assert.equal(r.status, 'reviving')
  assert.equal(r.water, 1)
  assert.equal(r.flip('b0'), false, 'no actions while waiting for a revive')
  assert.equal(r.revive(), true)
  assert.equal(r.used, 4 - Math.ceil(4 * REVIVE_SHARE))
  assert.equal(r.status, 'playing')
  assert.equal(r.revive(), false)
  r.place('b3', 1, 0)
  assert.equal(r.status, 'lost')
  assert.equal(r.revive(), false)
})

test('giving up while reviving loses', () => {
  const r = round(2)
  r.place('b2', 0, 0)
  assert.equal(r.status, 'reviving')
  r.giveUp()
  assert.equal(r.status, 'lost')
})

test('the board completes and the round is won even when the last placement uses the final step', () => {
  const r = new PackRound(level, { deal: { steps: 3, books: deal().books.slice(0, 3) } })
  r.flip('b2')
  r.place('b0', 0, 0)
  r.place('b1', 0, 1)
  assert.equal(r.used, 1)
  assert.equal(r.place('b2', 1, 0), 'ok')
  assert.equal(r.status, 'won')
  assert.equal(r.place('b2', 1, 0), 'rejected')
  assert.ok(r.drain().some(e => e.type === 'won'))
})
