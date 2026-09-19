import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadMushroomsForHabitat, HABITAT_WARM_MIXED } from '../js/roguelike/speciesAdapter.mjs'

test('loadMushroomsForHabitat 返回 10 个菌物卡', () => {
  const cards = loadMushroomsForHabitat(HABITAT_WARM_MIXED)
  assert.equal(cards.length, 10)
})

test('每张卡包含 id/name/rarity/clues(3)/颜色/权重', () => {
  const [card] = loadMushroomsForHabitat(HABITAT_WARM_MIXED)
  assert.equal(typeof card.id, 'string')
  assert.equal(typeof card.name, 'string')
  assert.ok([1, 2, 3].includes(card.rarity))
  assert.equal(card.clues.length, 3)
  assert.match(card.colorCap, /^#/)
  assert.match(card.colorStem, /^#/)
  assert.equal(card.weightInPool, 4 - card.rarity)
})

test('未知生境抛错', () => {
  assert.throws(() => loadMushroomsForHabitat('nope'), /unknown habitat/)
})
