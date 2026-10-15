import test from 'node:test'
import assert from 'node:assert/strict'

import { DEFAULTS, DESIGN_WIDTH, computeSafeArea } from '../js/survivor/SafeArea.js'

test('默认值常量符合 02 §2.1（safeTop 88 / safeBottom 34 / 左右 24）', () => {
  assert.equal(DEFAULTS.safeTop, 88)
  assert.equal(DEFAULTS.safeBottom, 34)
  assert.equal(DEFAULTS.safeLeft, 24)
  assert.equal(DEFAULTS.safeRight, 24)
})

test('接口失败回退默认值：缺 windowInfo / capsule 时返回默认四边距', () => {
  assert.deepEqual(computeSafeArea(null, { bottom: 60 }), { ...DEFAULTS })
  assert.deepEqual(computeSafeArea({ windowWidth: 375 }, null), { ...DEFAULTS })
})

test('字段非有限或 windowWidth ≤ 0 时回退默认值，不报错', () => {
  const info = {
    windowWidth: 0,
    windowHeight: 812,
    safeArea: { top: 0, bottom: 812, left: 0, right: 375 },
  }
  assert.deepEqual(computeSafeArea(info, { bottom: 60 }), { ...DEFAULTS })

  const badCapsule = {
    windowWidth: 375,
    windowHeight: 812,
    safeArea: { top: 0, bottom: 812, left: 0, right: 375 },
  }
  assert.deepEqual(computeSafeArea(badCapsule, { bottom: NaN }), { ...DEFAULTS })
})

test('普通机型（scale=1，无刘海）：按 02 §2.1 公式计算四边距', () => {
  // windowWidth 720 → scale = 1，便于直接核对数字。
  const info = {
    windowWidth: 720,
    windowHeight: 1280,
    safeArea: { top: 20, bottom: 1280, left: 0, right: 720 },
  }
  const capsule = { bottom: 50 }
  const r = computeSafeArea(info, capsule)
  // safeTop = max(50 + 8, 20, 24) × 1 = 58
  assert.equal(r.safeTop, 58)
  // safeBottom = max(1280 − 1280, 16) × 1 = 16
  assert.equal(r.safeBottom, 16)
  // 左右 = max(0, 720 − 720, 0) × 1 + 24 = 24
  assert.equal(r.safeLeft, 24)
  assert.equal(r.safeRight, 24)
})

test('刘海机型：capsule.bottom 下移抬高 safeTop，底部手势条抬高 safeBottom', () => {
  // iPhone X 类：windowWidth 375 → scale = 720/375 = 1.92。
  const scale = DESIGN_WIDTH / 375
  const info = {
    windowWidth: 375,
    windowHeight: 812,
    // 刘海：safeArea.top 44；底部 home 条：safeArea.bottom 778（812 − 34）。
    safeArea: { top: 44, bottom: 778, left: 0, right: 375 },
  }
  // 胶囊因刘海整体下移：bottom = 92。
  const capsule = { bottom: 92 }
  const r = computeSafeArea(info, capsule)

  // safeTop = max(92 + 8, 44, 24) × scale = 100 × scale
  assert.ok(Math.abs(r.safeTop - 100 * scale) < 1e-9)
  // safeBottom = max(812 − 778, 16) × scale = 34 × scale
  assert.ok(Math.abs(r.safeBottom - 34 * scale) < 1e-9)
  // 左右 = max(0, 375 − 375, 0) × scale + 24 = 24
  assert.ok(Math.abs(r.safeLeft - 24) < 1e-9)
  assert.ok(Math.abs(r.safeRight - 24) < 1e-9)
})

test('刘海下移对比：capsule.bottom 越大 safeTop 越大', () => {
  const info = {
    windowWidth: 375,
    windowHeight: 812,
    safeArea: { top: 44, bottom: 778, left: 0, right: 375 },
  }
  const low = computeSafeArea(info, { bottom: 60 })
  const high = computeSafeArea(info, { bottom: 92 })
  assert.ok(high.safeTop > low.safeTop)
})

test('左右缺口机型：safeArea.left / right 内缩会增大左右边距', () => {
  const scale = DESIGN_WIDTH / 375
  const info = {
    windowWidth: 375,
    windowHeight: 812,
    // 横向缺口：左 20，右边界 355（375 − 355 = 20 的内缩）。
    safeArea: { top: 44, bottom: 778, left: 20, right: 355 },
  }
  const r = computeSafeArea(info, { bottom: 92 })
  // 左右 = max(20, 375 − 355, 0) × scale + 24 = 20 × scale + 24
  assert.ok(Math.abs(r.safeLeft - (20 * scale + 24)) < 1e-9)
  assert.ok(Math.abs(r.safeRight - (20 * scale + 24)) < 1e-9)
})
