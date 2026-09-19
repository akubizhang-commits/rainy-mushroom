import { test } from 'node:test'
import assert from 'node:assert/strict'
import { RoguelikeGame } from '../js/roguelike/RoguelikeGame.mjs'
import { HABITAT_WARM_MIXED } from '../js/roguelike/speciesAdapter.mjs'

const cfg = { habitatId: HABITAT_WARM_MIXED, seed: 42 }

test('初始体力=5，状态=traveling，位置=起点', () => {
  const g = new RoguelikeGame(cfg)
  assert.equal(g.hp, 5)
  assert.equal(g.state, 'traveling')
  assert.equal(g.currentNodeId, g.route.startId)
})

test('起点可选下一节点=layer 1', () => {
  const g = new RoguelikeGame(cfg)
  const next = g.availableNextIds()
  const layer1 = g.route.nodes.filter(n => n.layer === 1).map(n => n.id)
  assert.deepEqual([...next].sort(), layer1.sort())
})

test('进入非相邻节点抛错', () => {
  const g = new RoguelikeGame(cfg)
  const layer4 = g.route.nodes.find(n => n.layer === 4)
  assert.throws(() => g.enterNode(layer4.id), /not reachable/)
})

test('进入合法节点 → state=inEncounter', () => {
  const g = new RoguelikeGame(cfg)
  const target = g.availableNextIds()[0]
  g.enterNode(target)
  assert.equal(g.state, 'inEncounter')
  assert.equal(g.currentNodeId, target)
})

test('resolve 采菌 → harvested 增加，state 回到 traveling', () => {
  const g = new RoguelikeGame(cfg)
  g.enterNode(g.availableNextIds()[0])
  const card = { id: 'x', name: '测试菌', rarity: 2, clues: ['a','b','c'], colorCap: '#000', colorStem: '#000', weightInPool: 2 }
  g.resolveEncounter({ harvested: card })
  assert.equal(g.harvested.length, 1)
  assert.equal(g.state, 'traveling')
})

test('体力扣到 0 → gameEnded 事件，state=ended', () => {
  const g = new RoguelikeGame({ ...cfg, startHp: 1 })
  let ended = false
  g.on('gameEnded', () => { ended = true })
  g.enterNode(g.availableNextIds()[0])
  g.resolveEncounter({ hpDelta: -1 })
  assert.equal(g.hp, 0)
  assert.equal(g.state, 'ended')
  assert.ok(ended)
})

test('走完第 4 层最后一个节点 → gameEnded', () => {
  const g = new RoguelikeGame(cfg)
  while (g.state !== 'ended') {
    const nexts = g.availableNextIds()
    if (nexts.length === 0) break
    g.enterNode(nexts[0])
    g.resolveEncounter({})
  }
  assert.equal(g.state, 'ended')
})

test('采菌流：识别正确 → 采集 +1，体力不变', () => {
  const g = new RoguelikeGame(cfg)
  const first = g.availableNextIds().find(id => {
    return g.route.nodes.find(n => n.id === id).type === 'mushroom'
  }) ?? g.availableNextIds()[0]
  g.enterNode(first)
  const { challenge, revealTarget } = g.makeMushroomEncounter(0, () => 0.3)
  const verdict = challenge.correctId === revealTarget.id ? 'correct' : 'correct'
  g.applyMushroomOutcome(revealTarget, verdict)
  assert.equal(g.harvested.length, 1)
  assert.equal(g.hp, 5)
})

test('采菌流：识别错误 → 体力 -1，无采集', () => {
  const g = new RoguelikeGame(cfg)
  g.enterNode(g.availableNextIds()[0])
  const { revealTarget } = g.makeMushroomEncounter(0)
  g.applyMushroomOutcome(revealTarget, 'wrong')
  assert.equal(g.hp, 4)
  assert.equal(g.harvested.length, 0)
})
