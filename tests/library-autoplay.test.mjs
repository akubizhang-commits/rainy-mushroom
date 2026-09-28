import test from 'node:test'
import assert from 'node:assert/strict'
import { autoplay } from '../js/library/LibraryAutoplay.js'
import { LIBRARY_LEVELS } from '../js/library/LibraryLevels.js'

test('a player spending 3 seconds per book clears all five levels without losing a book', () => {
  for (const level of LIBRARY_LEVELS) {
    const result = autoplay(level, { interval: 3 })
    assert.equal(result.status, 'won', level.id)
    assert.equal(result.soaked, 0, level.id)
  }
})

test('rounds last between half a minute (tutorial) and two minutes', () => {
  const times = LIBRARY_LEVELS.map(level => autoplay(level, { interval: 3 }).time)
  assert.ok(times[0] >= 25, String(times[0]))
  for (const time of times) assert.ok(time <= 120, String(time))
  for (const time of times.slice(3)) assert.ok(time >= 60, String(time))
})

test('pressure: at 4.5 seconds per book levels 4 and 5 lose books', () => {
  for (const level of LIBRARY_LEVELS.slice(3)) assert.ok(autoplay(level, { interval: 4.5 }).soaked >= 1, level.id)
})

test('the early levels forgive a slow player', () => {
  for (const level of LIBRARY_LEVELS.slice(0, 2)) assert.equal(autoplay(level, { interval: 4.5 }).status, 'won', level.id)
})
