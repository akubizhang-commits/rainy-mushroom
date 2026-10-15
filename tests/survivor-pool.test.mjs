import test from 'node:test'
import assert from 'node:assert/strict'

import { Pool } from '../js/survivor/Pool.js'
import { SeededRandom, hashSeed } from '../js/survivor/SurvivorRandom.js'

function makePool(capacity, reset) {
  return new Pool(capacity, (slot) => ({ slot, value: 0 }), reset)
}

test('Pool pre-allocates capacity objects with stable slots', () => {
  const pool = makePool(4)
  assert.equal(pool.capacity, 4)
  assert.equal(pool.count, 0)
  assert.equal(pool.items.length, 4)
  for (let slot = 0; slot < 4; slot += 1) {
    assert.equal(pool.items[slot].slot, slot)
  }
})

test('acquire adds to the dense active table and runs reset with uid', () => {
  const pool = makePool(3, (obj, value) => { obj.value = value })
  const a = pool.acquire(10)
  const b = pool.acquire(20)
  assert.equal(pool.count, 2)
  assert.equal(a.value, 10)
  assert.equal(b.value, 20)
  // uid is strictly increasing across acquisitions.
  assert.equal(a.uid, 1)
  assert.equal(b.uid, 2)
  // active holds exactly the acquired objects in order.
  assert.deepEqual(pool.active.slice(0, pool.count), [a, b])
  assert.ok(pool.isActive(a))
  assert.ok(pool.isActive(b))
})

test('acquire returns null when the pool is full', () => {
  const pool = makePool(2)
  const a = pool.acquire()
  const b = pool.acquire()
  assert.ok(a)
  assert.ok(b)
  assert.equal(pool.acquire(), null)
  assert.equal(pool.count, 2)
})

test('release swap-removes: last active object moves into the freed position', () => {
  const pool = makePool(4)
  const a = pool.acquire()
  const b = pool.acquire()
  const c = pool.acquire()
  // Release the middle one; c should take b's slot in the active table.
  assert.equal(pool.release(b), true)
  assert.equal(pool.count, 2)
  assert.deepEqual(pool.active.slice(0, pool.count), [a, c])
  assert.equal(pool.isActive(b), false)
  assert.ok(pool.isActive(a))
  assert.ok(pool.isActive(c))
  // Releasing an already-free object is a no-op returning false.
  assert.equal(pool.release(b), false)
})

test('released slots are reused and keep the pool usable at capacity', () => {
  const pool = makePool(2)
  const a = pool.acquire()
  const b = pool.acquire()
  assert.equal(pool.acquire(), null)
  pool.release(a)
  const c = pool.acquire()
  assert.ok(c)
  assert.equal(pool.count, 2)
  // uid keeps increasing even when a slot is reused.
  assert.equal(c.uid, 3)
  // The reused object is one of the pre-allocated instances.
  assert.ok(pool.items.includes(c))
  assert.ok(pool.isActive(b))
})

test('uid never repeats across acquire/release churn', () => {
  const pool = makePool(3)
  const seen = new Set()
  let held = []
  for (let round = 0; round < 50; round += 1) {
    while (held.length < 3) {
      const obj = pool.acquire()
      if (!obj) break
      assert.equal(seen.has(obj.uid), false, 'uid must be unique')
      seen.add(obj.uid)
      held.push(obj)
    }
    // Release one to make room for the next round.
    pool.release(held.shift())
  }
  assert.equal(seen.size, 52)
})

test('releaseAll clears the active table and restores full capacity', () => {
  const pool = makePool(3)
  pool.acquire()
  pool.acquire()
  pool.releaseAll()
  assert.equal(pool.count, 0)
  assert.ok(pool.acquire())
  assert.ok(pool.acquire())
  assert.ok(pool.acquire())
  assert.equal(pool.acquire(), null)
})

test('SurvivorRandom reproduces the same sequence for the same seed', () => {
  const a = new SeededRandom('seed-42')
  const b = new SeededRandom('seed-42')
  for (let i = 0; i < 1000; i += 1) {
    assert.equal(a.next(), b.next())
  }
})

test('SurvivorRandom diverges for different seeds', () => {
  const a = new SeededRandom('alpha')
  const b = new SeededRandom('beta')
  let anyDifferent = false
  for (let i = 0; i < 100; i += 1) {
    if (a.next() !== b.next()) anyDifferent = true
  }
  assert.ok(anyDifferent)
})

test('range stays within [min, max) and chance is deterministic', () => {
  const rng = new SeededRandom('range')
  for (let i = 0; i < 1000; i += 1) {
    const v = rng.range(5, 9)
    assert.ok(v >= 5 && v < 9)
  }
  const c1 = new SeededRandom('chance')
  const c2 = new SeededRandom('chance')
  for (let i = 0; i < 100; i += 1) {
    assert.equal(c1.chance(0.3), c2.chance(0.3))
  }
  // Degenerate probabilities short-circuit without consuming the stream.
  const edge = new SeededRandom('edge')
  assert.equal(edge.chance(0), false)
  assert.equal(edge.chance(-1), false)
  assert.equal(edge.chance(1), true)
  assert.equal(edge.chance(2), true)
  // next() still at the original position after the short-circuits above.
  assert.equal(edge.next(), new SeededRandom('edge').next())
})

test('derive produces independent, reproducible child streams', () => {
  const parent = new SeededRandom('run-1')
  const spawnA = parent.derive('spawn')
  const spawnB = new SeededRandom('run-1').derive('spawn')
  const draft = new SeededRandom('run-1').derive('draft')
  // Same (seed, label) → identical sequence.
  for (let i = 0; i < 100; i += 1) {
    assert.equal(spawnA.next(), spawnB.next())
  }
  // Different label → different stream (equivalent to hashing distinct seeds).
  assert.equal(spawnB.seed, 'run-1:spawn')
  assert.equal(draft.seed, 'run-1:draft')
  assert.notEqual(hashSeed('run-1:spawn'), hashSeed('run-1:draft'))
})
