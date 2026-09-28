import test from 'node:test'
import assert from 'node:assert/strict'
import { PACK_LEVELS } from '../js/library/PackLevels.js'
import { planner, greedy } from '../js/library/PackBots.js'

const seeds = level => [level.seed, ...Array.from({ length: 49 }, (_, i) => `${level.seed}:${i}`)]

test('a careful player clears every level on every seed without reviving', () => {
  for (const level of PACK_LEVELS) for (const seed of seeds(level)) {
    const result = planner(level, seed)
    assert.equal(result.status, 'won', `${level.id} ${seed}`)
    assert.equal(result.revived, false)
  }
})

test('stuffing books in without thinking runs out of steps on most seeds of levels 2 and 3', () => {
  for (const level of PACK_LEVELS.slice(1)) {
    const failed = seeds(level).filter(seed => greedy(level, seed).status !== 'won').length
    assert.ok(failed > 25, `${level.id}: greedy failed ${failed}/50`)
  }
})
