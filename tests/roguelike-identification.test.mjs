import { test } from 'node:test'
import assert from 'node:assert/strict'
import { makeChallenge, judge } from '../js/roguelike/identification.mjs'

const target = { id: 't', name: 'T', rarity: 1, clues: ['a','b','c'], colorCap: '#000', colorStem: '#000', weightInPool: 3 }
const pool = [
  target,
  { id: 'x', name: 'X', rarity: 1, clues: ['','',''], colorCap: '#0', colorStem: '#0', weightInPool: 3 },
  { id: 'y', name: 'Y', rarity: 2, clues: ['','',''], colorCap: '#0', colorStem: '#0', weightInPool: 2 },
  { id: 'z', name: 'Z', rarity: 3, clues: ['','',''], colorCap: '#0', colorStem: '#0', weightInPool: 1 }
]

test('makeChallenge 3 个选项含正确 id', () => {
  const c = makeChallenge(target, pool, 1000, () => 0.5)
  assert.equal(c.options.length, 3)
  assert.ok(c.options.includes('t'))
  assert.equal(c.deadline, 4000)
  assert.deepEqual(c.clues, ['a','b','c'])
})

test('judge correct/wrong/timeout', () => {
  const c = makeChallenge(target, pool, 0, () => 0.1)
  assert.equal(judge(c, 't', 100), 'correct')
  assert.equal(judge(c, 'x', 100), 'wrong')
  assert.equal(judge(c, 't', 3100), 'timeout')
})

test('pool 不足 3 时抛错', () => {
  assert.throws(() => makeChallenge(target, [target], 0), /pool too small/)
})
