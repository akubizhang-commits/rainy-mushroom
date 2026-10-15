import test from 'node:test'
import assert from 'node:assert/strict'

import { SpatialGrid } from '../js/survivor/SpatialGrid.js'
import { SeededRandom } from '../js/survivor/SurvivorRandom.js'

// Build a dense active list of entities with stable slots, mimicking a Pool's output.
function makeEntities(count, factory) {
  const active = new Array(count)
  for (let i = 0; i < count; i += 1) {
    const e = factory(i)
    e.slot = i
    active[i] = e
  }
  return active
}

// Brute-force reference: exact circle-vs-circle test over every entity.
function bruteForce(active, count, x, y, r) {
  const hits = new Set()
  for (let i = 0; i < count; i += 1) {
    const e = active[i]
    const dx = e.x - x
    const dy = e.y - y
    if (dx * dx + dy * dy <= (r + e.r) * (r + e.r)) hits.add(e.slot)
  }
  return hits
}

// Resolve queryCircle candidates into an exact hit set, including the `large` list.
function gridHits(grid, active, x, y, r, out) {
  const hits = new Set()
  const n = grid.queryCircle(x, y, r, out)
  const bySlot = new Map()
  for (let i = 0; i < active.length; i += 1) {
    if (active[i]) bySlot.set(active[i].slot, active[i])
  }
  for (let i = 0; i < n; i += 1) {
    const e = bySlot.get(out[i])
    const dx = e.x - x
    const dy = e.y - y
    if (dx * dx + dy * dy <= (r + e.r) * (r + e.r)) hits.add(e.slot)
  }
  // Large entities (r > maxCellRadius) are tested directly from the overflow list.
  for (const e of grid.large) {
    const dx = e.x - x
    const dy = e.y - y
    if (dx * dx + dy * dy <= (r + e.r) * (r + e.r)) hits.add(e.slot)
  }
  return hits
}

test('500 random scenarios: grid queryCircle matches brute force exactly', () => {
  const rng = new SeededRandom('grid-500')
  const capacity = 202
  const out = new Int32Array(capacity)
  for (let scenario = 0; scenario < 500; scenario += 1) {
    // Player (query centre) wanders the plane so the window origin shifts.
    const px = rng.range(-2000, 2000)
    const py = rng.range(-2000, 2000)
    const count = rng.int(0, capacity)
    const active = makeEntities(count, () => ({
      // Keep most entities inside the window around the player; a few spread wide.
      x: px + rng.range(-1100, 1100),
      y: py + rng.range(-1100, 1100),
      r: rng.range(4, 14)
    }))
    const grid = new SpatialGrid({ capacity })
    grid.build(active, count, { x: px, y: py })

    // Several query circles per scenario, including the player's own position.
    for (let q = 0; q < 4; q += 1) {
      const qx = q === 0 ? px : px + rng.range(-900, 900)
      const qy = q === 0 ? py : py + rng.range(-900, 900)
      const qr = rng.range(0, 120)
      const expected = bruteForce(active, count, qx, qy, qr)
      const actual = gridHits(grid, active, qx, qy, qr, out)
      assert.deepEqual(
        [...actual].sort((a, b) => a - b),
        [...expected].sort((a, b) => a - b),
        `scenario ${scenario} query ${q}`
      )
    }
  }
})

test('large entities (r > maxCellRadius) land in the large list, not the grid', () => {
  const grid = new SpatialGrid({ capacity: 8, maxCellRadius: 32 })
  const active = makeEntities(3, (i) => ({
    x: i * 10,
    y: 0,
    r: i === 1 ? 56 : 10 // the middle entity is Boss-sized
  }))
  grid.build(active, 3, { x: 0, y: 0 })
  assert.equal(grid.large.length, 1)
  assert.equal(grid.large[0].slot, 1)
  assert.equal(grid.itemCount, 2)
})

test('entities outside the window are clamped to edge cells and still found', () => {
  const grid = new SpatialGrid({ cols: 8, rows: 8, cellSize: 64, capacity: 8 })
  // Far entity well beyond the ±256 window around origin.
  const active = makeEntities(1, () => ({ x: 100000, y: 0, r: 10 }))
  grid.build(active, 1, { x: 0, y: 0 })
  const out = new Int32Array(8)
  // A query at the far-right edge of the window should surface the clamped entity.
  const edgeX = grid.cellSize * (grid.originCol + grid.cols - 1)
  const n = grid.queryCircle(edgeX, 0, 64, out)
  let found = false
  for (let i = 0; i < n; i += 1) if (out[i] === 0) found = true
  assert.ok(found)
})

test('empty grid returns no candidates', () => {
  const grid = new SpatialGrid({ capacity: 8 })
  grid.build([], 0, { x: 0, y: 0 })
  const out = new Int32Array(8)
  assert.equal(grid.queryCircle(0, 0, 50, out), 0)
})

test('rebuild each step reflects moved entities', () => {
  const grid = new SpatialGrid({ capacity: 8 })
  const out = new Int32Array(8)
  const active = makeEntities(1, () => ({ x: 0, y: 0, r: 10 }))
  grid.build(active, 1, { x: 0, y: 0 })
  assert.equal(grid.queryCircle(0, 0, 20, out), 1)
  // Move the entity far away and rebuild; the old location is now empty.
  active[0].x = 500
  active[0].y = 500
  grid.build(active, 1, { x: 500, y: 500 })
  assert.equal(grid.queryCircle(0, 0, 20, out), 0)
  assert.equal(grid.queryCircle(500, 500, 20, out), 1)
})
