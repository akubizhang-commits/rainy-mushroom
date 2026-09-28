import test from 'node:test'
import assert from 'node:assert/strict'
import { RainState } from '../js/library/RainState.js'
import { SeededRandom } from '../js/library/LibraryRandom.js'

test('water rises at the configured speed, caps at 1 and recedes to at least 0', () => {
  const rain = new RainState({ waterSpeed: .1 }, new SeededRandom('r'))
  rain.advance(2)
  assert.ok(Math.abs(rain.water - .2) < 1e-9)
  rain.advance(100)
  assert.equal(rain.water, 1)
  rain.recede(.3)
  assert.ok(Math.abs(rain.water - .7) < 1e-9)
  rain.recede(5)
  assert.equal(rain.water, 0)
})

test('leaks drip once per random interval inside their range', () => {
  const rain = new RainState({ waterSpeed: 0, leaks: [{ x: .5, min: 6, max: 8 }] }, new SeededRandom('leak'))
  const times = []
  for (let t = 0; t < 60; t = Math.round((t + .1) * 10) / 10) if (rain.advance(.1).length) times.push(t + .1)
  assert.ok(times.length >= 7 && times.length <= 10, String(times.length))
  times.forEach((time, i) => { const gap = time - (times[i - 1] ?? 0); assert.ok(gap >= 5.9 && gap <= 8.1, String(gap)) })
})

test('a long step reports every drip it covers', () => {
  const rain = new RainState({ waterSpeed: 0, leaks: [{ x: .3, min: 1, max: 1 }] }, new SeededRandom('long'))
  assert.deepEqual(rain.advance(3.05), [.3, .3, .3])
})
