import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generateRoute } from '../js/roguelike/routeGenerator.mjs'

test('相同 seed 生成相同 Route', () => {
  const a = generateRoute(42)
  const b = generateRoute(42)
  assert.deepEqual(a, b)
})

test('4 层节点，每层 2-3 个', () => {
  const r = generateRoute(1)
  const byLayer = new Map()
  for (const n of r.nodes) {
    if (n.layer > 0) {  // Count only game layers, exclude start (layer 0)
      byLayer.set(n.layer, (byLayer.get(n.layer) ?? 0) + 1)
    }
  }
  assert.equal(byLayer.size, 4)  // 层 1..4
  for (const [, count] of byLayer) assert.ok(count >= 2 && count <= 3)
})

test('起点连到第 1 层的所有节点', () => {
  const r = generateRoute(2)
  const start = r.nodes.find(n => n.id === r.startId)
  const layer1 = r.nodes.filter(n => n.layer === 1).map(n => n.id).sort()
  assert.deepEqual([...start.nextIds].sort(), layer1)
})

test('至少一半节点是 mushroom 类型', () => {
  const r = generateRoute(7)
  const shrooms = r.nodes.filter(n => n.type === 'mushroom').length
  assert.ok(shrooms >= Math.floor(r.nodes.length / 2))
})
