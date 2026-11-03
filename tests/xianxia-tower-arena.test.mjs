import test from 'node:test'
import assert from 'node:assert/strict'
import { FLOOR01 } from '../js/xianxia/TowerContent.js'
import {
  HEX_VERTICES, HEX_CENTER, insideHex, boundHexActor, clipHexRay
} from '../js/xianxia/TowerArena.js'

const vertices = [
  { x: 33, y: 1020 }, { x: 978, y: 480 }, { x: 978, y: -600 },
  { x: 33, y: -1140 }, { x: -912, y: -600 }, { x: -912, y: 480 }
]
const radii = [18, 24, 34, 42]
const tolerance = 1e-7
const close = (actual, expected, message) =>
  assert.ok(Math.abs(actual - expected) < tolerance, `${message}: ${actual} != ${expected}`)
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)

// Independent oracle: clockwise edge cross-products give inward wall clearance.
function clearances(point) {
  return vertices.map((a, i) => {
    const b = vertices[(i + 1) % 6]
    return ((b.y - a.y) * (point.x - a.x) - (b.x - a.x) * (point.y - a.y))
      / distance(a, b)
  })
}
function contained(point, radius) {
  assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y))
  for (const clearance of clearances(point)) {
    assert.ok(clearance >= radius - tolerance, `clearance ${clearance} < radius ${radius}`)
  }
}
const walls = vertices.map((a, i) => {
  const b = vertices[(i + 1) % 6]
  const length = distance(a, b)
  return { x: (a.y - b.y) / length, y: (b.x - a.x) / length, a, b }
})
function corner(i, radius) {
  const a = walls[(i + 5) % 6], b = walls[i]
  const da = a.x * a.a.x + a.y * a.a.y - radius
  const db = b.x * b.a.x + b.y * b.a.y - radius
  const determinant = a.x * b.y - a.y * b.x
  return { x: (da * b.y - a.y * db) / determinant,
    y: (a.x * db - da * b.x) / determinant }
}

test('hex constants preserve the exact authored bbox and center and are deeply frozen', () => {
  assert.deepEqual(HEX_VERTICES, vertices)
  assert.deepEqual(HEX_CENTER, { x: 33, y: -60 })
  assert.ok(Object.isFrozen(HEX_CENTER))
  assert.ok(Object.isFrozen(HEX_VERTICES) && HEX_VERTICES.every(Object.isFrozen))
  assert.equal(Math.max(...vertices.map(v => v.x)) - Math.min(...vertices.map(v => v.x)), 1890)
  assert.equal(Math.max(...vertices.map(v => v.y)) - Math.min(...vertices.map(v => v.y)), 2160)
  for (const v of vertices) assert.equal(insideHex(v), true)
  assert.equal(insideHex({ x: 978, y: 1020 }), false)
})

test('all six face contacts contain circles of radius 18/24/34/42 and reject crossings', () => {
  for (const radius of radii) for (const wall of walls) {
    const contact = { x: (wall.a.x + wall.b.x) / 2 - wall.x * radius,
      y: (wall.a.y + wall.b.y) / 2 - wall.y * radius }
    contained(contact, radius)
    assert.equal(insideHex(contact, radius), true)
    const outside = { x: contact.x + wall.x * .001, y: contact.y + wall.y * .001 }
    assert.equal(insideHex(outside, radius), false)
    const actor = { x: contact.x + wall.x * 200, y: contact.y + wall.y * 200,
      radius, health: 73 }
    assert.equal(boundHexActor(actor), actor)
    close(actor.x, contact.x, 'face projection x')
    close(actor.y, contact.y, 'face projection y')
    assert.equal(actor.health, 73)
    assert.equal(actor.radius, radius)
    contained(actor, radius)
  }
})

test('all six inset corners are exact nearest points in their outward normal cones', () => {
  for (const radius of radii) for (let i = 0; i < 6; i++) {
    const expected = corner(i, radius)
    const a = walls[(i + 5) % 6], b = walls[i]
    for (const [wa, wb] of [[10, 10], [20, 400], [700, 3]]) {
      const actor = { x: expected.x + wa * a.x + wb * b.x,
        y: expected.y + wa * a.y + wb * b.y, radius }
      boundHexActor(actor)
      close(actor.x, expected.x, 'corner projection x')
      close(actor.y, expected.y, 'corner projection y')
      contained(actor, radius)
      const before = { ...actor }
      for (let n = 0; n < 100; n++) boundHexActor(actor)
      assert.deepEqual(actor, before, 'a projected corner must not drift')
    }
  }
})

test('grid projections satisfy the nearest-point inequality against every inset vertex', () => {
  for (const radius of radii) {
    const inset = vertices.map((_, i) => corner(i, radius))
    for (let x = -1700; x <= 1700; x += 137) for (let y = -1800; y <= 1800; y += 149) {
      const actor = boundHexActor({ x, y, radius })
      contained(actor, radius)
      for (const v of inset) {
        const dot = (x - actor.x) * (v.x - actor.x) + (y - actor.y) * (v.y - actor.y)
        assert.ok(dot <= 1e-6, `not nearest: radius=${radius} (${x},${y}), dot=${dot}`)
      }
    }
  }
})

test('continuous movement stays contained, projection is nonexpansive, and corners do not oscillate', () => {
  for (const radius of radii) {
    let previousRaw, previousProjection
    const actor = { ...HEX_CENTER, radius }
    for (let n = 0; n <= 3000; n++) {
      const angle = n / 3000 * Math.PI * 2
      const raw = { x: 33 + 1800 * Math.cos(angle), y: -60 + 1800 * Math.sin(angle) }
      const projected = boundHexActor({ ...raw, radius })
      if (previousRaw) {
        assert.ok(distance(projected, previousProjection) <= distance(raw, previousRaw) + tolerance)
      }
      previousRaw = raw
      previousProjection = projected
      actor.x += 12 * Math.cos(angle)
      actor.y += 12 * Math.sin(angle)
      boundHexActor(actor)
      contained(actor, radius)
    }
    const top = corner(0, radius)
    const pushed = { ...top, radius }
    for (let n = 0; n < 1000; n++) {
      pushed.y += 3
      boundHexActor(pushed)
      close(pushed.x, top.x, 'constant corner push x')
      close(pushed.y, top.y, 'constant corner push y')
    }
  }
})

test('rays end at the radius-inset wall on all faces, corners, and a dense angle sweep', () => {
  for (const radius of radii) {
    const origins = [HEX_CENTER, ...walls.map(w => ({
      x: (w.a.x + w.b.x) / 2 - w.x * (radius + 10),
      y: (w.a.y + w.b.y) / 2 - w.y * (radius + 10)
    }))]
    for (const origin of origins) for (let degrees = 0; degrees < 360; degrees += 2) {
      const dx = Math.cos(degrees * Math.PI / 180), dy = Math.sin(degrees * Math.PI / 180)
      const length = clipHexRay(origin, dx, dy, 5000, radius)
      assert.ok(Number.isFinite(length) && length >= 0 && length <= 5000)
      const end = { x: origin.x + length * dx, y: origin.y + length * dy }
      contained(end, radius)
      close(Math.min(...clearances(end)), radius, 'ray endpoint contact')
      assert.equal(insideHex({ x: end.x + dx * .01, y: end.y + dy * .01 }, radius), false)
    }
    for (let i = 0; i < 6; i++) {
      const end = corner(i, radius)
      const length = distance(HEX_CENTER, end)
      const dx = (end.x - 33) / length, dy = (end.y + 60) / length
      close(clipHexRay(HEX_CENTER, dx, dy, 5000, radius), length, 'corner ray')
      close(clipHexRay(HEX_CENTER, dx, dy, 12, radius), 12, 'range limit')
    }
  }
})

test('ray boundary, zero, non-unit direction, and outside-origin semantics are explicit', () => {
  const radius = 42, right = { x: 978 - radius, y: -60 }
  close(clipHexRay(right, 1, 0, 2000, radius), 0, 'outward wall ray')
  close(clipHexRay(right, -1, 0, 2000, radius), 1890 - 2 * radius, 'inward wall ray')
  assert.ok(clipHexRay(right, 0, 1, 2000, radius) > 0, 'tangent ray')
  assert.equal(clipHexRay(HEX_CENTER, 0, 0, 2000, radius), 0)
  assert.equal(clipHexRay(HEX_CENTER, 1, 0, 0, radius), 0)
  assert.equal(clipHexRay({ x: 5000, y: 0 }, -1, 0, 9000, radius), 0)
  close(clipHexRay(HEX_CENTER, 2, 0, 2000, radius), (945 - radius) / 2, 'ray parameter')
  assert.deepEqual(right, { x: 936, y: -60 }, 'ray does not mutate its origin')
})

test('every authored portal retains at least one unmodified radius-42 spawn candidate', () => {
  assert.equal(FLOOR01.arena.portals.length, 8)
  for (const portal of FLOOR01.arena.portals) {
    const usable = portal.candidates.filter(p => insideHex(p, 42))
    assert.ok(usable.length > 0, `portal ${portal.id} has no boss candidate`)
    for (const p of usable) contained(p, 42)
  }
})

test('nonfinite, missing, string, negative, and impossible inputs are rejected without mutation', () => {
  for (const value of [NaN, Infinity, -Infinity, undefined, null, '12']) {
    assert.throws(() => insideHex({ x: value, y: 0 }), RangeError)
    const actor = { x: 0, y: value, radius: 42 }
    const before = { ...actor }
    assert.throws(() => boundHexActor(actor), RangeError)
    assert.deepEqual(actor, before)
    assert.throws(() => clipHexRay(HEX_CENTER, value, 0, 20, 42), RangeError)
    assert.throws(() => clipHexRay(HEX_CENTER, 1, value, 20, 42), RangeError)
    assert.throws(() => clipHexRay(HEX_CENTER, 1, 0, value, 42), RangeError)
  }
  for (const radius of [NaN, Infinity, -Infinity, -1, null, '42', 1000]) {
    assert.throws(() => insideHex(HEX_CENTER, radius), RangeError)
    const actor = { x: 5000, y: 0, radius }
    assert.throws(() => boundHexActor(actor), RangeError)
    assert.equal(actor.x, 5000)
    assert.throws(() => clipHexRay(HEX_CENTER, 1, 0, 20, radius), RangeError)
  }
  assert.throws(() => clipHexRay(HEX_CENTER, 1, 0, -1, 42), RangeError)
  assert.throws(() => insideHex(null), RangeError)
  assert.throws(() => boundHexActor(null), RangeError)
})

test('degenerate maximum-radius inset and extreme finite inputs still produce finite contained outputs', () => {
  const maxRadius = Math.min(...clearances(HEX_CENTER))
  contained(boundHexActor({ x: 10000, y: 10000, radius: maxRadius }), maxRadius)
  const limit = Number.MAX_VALUE
  for (const point of [{ x: limit, y: limit }, { x: -limit, y: limit },
    { x: limit, y: -limit }, { x: -limit, y: -limit }, { x: limit, y: -60 }]) {
    assert.equal(insideHex(point, 42), false)
    contained(boundHexActor({ ...point, radius: 42 }), 42)
  }
  const length = clipHexRay(HEX_CENTER, limit, limit, limit, 42)
  assert.ok(Number.isFinite(length) && length >= 0)
  contained({ x: 33 + limit * length, y: -60 + limit * length }, 42)
})
