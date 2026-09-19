import { test } from 'node:test'
import assert from 'node:assert/strict'
import { HarvestProgress } from '../js/roguelike/harvest.mjs'

test('初始不完成', () => {
  const h = new HarvestProgress(1500)
  assert.equal(h.isComplete, false)
})

test('未启动 tick 返回 0', () => {
  const h = new HarvestProgress(1500)
  assert.equal(h.tick(1000), 0)
})

test('启动后 tick 线性推进', () => {
  const h = new HarvestProgress(1000)
  h.start(0)
  assert.equal(h.tick(500), 0.5)
  assert.equal(h.tick(1000), 1)
  assert.equal(h.isComplete, true)
})

test('中途 release 清零', () => {
  const h = new HarvestProgress(1000)
  h.start(0)
  h.tick(500)
  h.release(500)
  assert.equal(h.tick(600), 0)
  assert.equal(h.isComplete, false)
})

test('可重新 start', () => {
  const h = new HarvestProgress(1000)
  h.start(0)
  h.release(300)
  h.start(500)
  assert.equal(h.tick(1500), 1)
})
