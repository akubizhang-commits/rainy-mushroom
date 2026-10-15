import test from 'node:test'
import assert from 'node:assert/strict'

import {
  DEAD_ZONE,
  RADIUS,
  DESIGN_WIDTH,
  clampBase,
  computeMove,
  resolve,
} from '../js/survivor/Joystick.js'

const base = { x: 300, y: 400 }

test('常量符合 01 §4（死区 8 / 半径 60）', () => {
  assert.equal(DEAD_ZONE, 8)
  assert.equal(RADIUS, 60)
})

test('死区内归零：偏移长度 ≤ 8 输出零向量', () => {
  // 原点即底座中心。
  assert.deepEqual(computeMove(base, { x: 300, y: 400 }), { x: 0, y: 0, length: 0 })
  // 边界恰好 8 仍归零。
  assert.deepEqual(computeMove(base, { x: 300 + 8, y: 400 }), { x: 0, y: 0, length: 0 })
  // 7.9 仍在死区内。
  assert.deepEqual(computeMove(base, { x: 300 + 7.9, y: 400 }), { x: 0, y: 0, length: 0 })
})

test('线性区：8–60 之间强度线性从 0 增至 1，方向为单位向量', () => {
  // 偏移 34（死区与半径的中点）→ 强度 = (34 − 8) / (60 − 8) = 0.5。
  const m = computeMove(base, { x: 300 + 34, y: 400 })
  assert.ok(Math.abs(m.length - 0.5) < 1e-9)
  // 纯 +x 方向：x = 0.5，y = 0。
  assert.ok(Math.abs(m.x - 0.5) < 1e-9)
  assert.ok(Math.abs(m.y - 0) < 1e-9)
})

test('线性区斜向：方向归一化后乘强度', () => {
  // 偏移 (3,4) 长度 5 < 死区，取更长的 (30,40) 长度 50。
  const m = computeMove(base, { x: 300 + 30, y: 400 + 40 })
  const strength = (50 - DEAD_ZONE) / (RADIUS - DEAD_ZONE)
  assert.ok(Math.abs(m.length - strength) < 1e-9)
  // 方向 (0.6, 0.8)。
  assert.ok(Math.abs(m.x - 0.6 * strength) < 1e-9)
  assert.ok(Math.abs(m.y - 0.8 * strength) < 1e-9)
  // 向量长度等于强度。
  assert.ok(Math.abs(Math.hypot(m.x, m.y) - strength) < 1e-9)
})

test('超半径截断：偏移 > 60 时强度恒为 1，方向保持', () => {
  const m = computeMove(base, { x: 300 + 200, y: 400 })
  assert.equal(m.length, 1)
  assert.ok(Math.abs(m.x - 1) < 1e-9)
  assert.equal(m.y, 0)
  // 边界恰好 60 → 强度 1。
  const edge = computeMove(base, { x: 300 + 60, y: 400 })
  assert.ok(Math.abs(edge.length - 1) < 1e-9)
})

test('底座钳制：按下点超出可用区时底座中心内移', () => {
  const safe = { safeLeft: 24, safeRight: 24, safeBottom: 34 }
  // 左侧超界：minX = safeLeft + 60 = 84。
  assert.deepEqual(clampBase({ x: 10, y: 500 }, safe), { x: 84, y: 500 })
  // 右侧超界：maxX = 720 − safeRight − 60 = 636。
  assert.deepEqual(clampBase({ x: 700, y: 500 }, safe), { x: 636, y: 500 })
  // 底部超界：minY = safeBottom + 72 = 106。
  assert.deepEqual(clampBase({ x: 300, y: 10 }, safe), { x: 300, y: 106 })
  // 完全在界内：原样返回。
  assert.deepEqual(clampBase({ x: 300, y: 500 }, safe), { x: 300, y: 500 })
})

test('钳制常量：无安全区信息时仅受屏幕边界与半径约束', () => {
  // safe 缺省全 0：minX = 60，maxX = 720 − 60 = 660，minY = 72。
  assert.deepEqual(clampBase({ x: 0, y: 0 }), { x: 60, y: 72 })
  assert.deepEqual(clampBase({ x: DESIGN_WIDTH, y: 1000 }), { x: 660, y: 1000 })
})

test('resolve：先钳制底座再按内移后的中心算偏移', () => {
  const safe = { safeLeft: 24, safeRight: 24, safeBottom: 34 }
  // 按下点 x=10 被钳到 84；手指在 84+34 处 → 相对内移后中心强度 0.5。
  const { base: b, move } = resolve({ x: 10, y: 500 }, { x: 84 + 34, y: 500 }, safe)
  assert.deepEqual(b, { x: 84, y: 500 })
  assert.ok(Math.abs(move.length - 0.5) < 1e-9)
  assert.ok(Math.abs(move.x - 0.5) < 1e-9)
})

test('非有限输入不产生 NaN（非有限坐标按 0 处理）', () => {
  // 非有限坐标按 0 处理：base 与 point 都塌到原点 → 零向量。
  const m = computeMove({ x: NaN, y: undefined }, { x: NaN, y: undefined })
  assert.equal(m.x, 0)
  assert.equal(m.y, 0)
  assert.equal(m.length, 0)
  assert.ok(Number.isFinite(m.x) && Number.isFinite(m.y))
  // 单侧非有限不泄漏 NaN，结果各分量均有限。
  const partial = computeMove(base, { x: NaN, y: undefined })
  assert.ok(Number.isFinite(partial.x) && Number.isFinite(partial.y))
  assert.ok(Number.isFinite(partial.length))
  const b = clampBase({ x: NaN, y: Infinity })
  assert.ok(Number.isFinite(b.x))
  assert.ok(Number.isFinite(b.y))
})
