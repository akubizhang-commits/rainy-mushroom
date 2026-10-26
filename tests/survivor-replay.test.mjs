// RPL-01 · L2 确定性回放 R1–R6（04 §2.2，09 A2）。金标准 tests/fixtures/survivor/golden.json 由
// `npm run survivor:golden`（scripts/survivor/update-golden.mjs）生成；规则或数值有意变更时重生成，
// 提交说明写明原因并引用 01 的对应改动（04 §2.2-4）。
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { replay } from './fixtures/survivor/replay.mjs'
import idle from './fixtures/survivor/inputs-idle.mjs'
import kite from './fixtures/survivor/inputs-kite.mjs'
import win from './fixtures/survivor/inputs-win.mjs'

const golden = JSON.parse(readFileSync(new URL('./fixtures/survivor/golden.json', import.meta.url), 'utf8'))
const HASH_STEPS = [60 * 60, 180 * 60, 300 * 60] // 第 60 / 180 / 300 秒
const hashAt = new Set(HASH_STEPS)
// 金标准经 JSON 往返；比较前把运行结果也过一遍 JSON（浮点数 JSON 往返无损）
const json = (v) => JSON.parse(JSON.stringify(v))

let kiteRef = null
const kiteBase = () => (kiteRef ||= replay(kite, { hashAt }))

test('R1 站桩：replay-idle 全程 (0,0)、总选第 0 张 → lost，summary 与金标准完全相等', () => {
  const r = replay(idle)
  assert.equal(r.summary.outcome, 'lost')
  assert.deepEqual(json(r.summary), golden.idle.summary)
  assert.equal(r.steps, golden.idle.steps)
  assert.equal(r.levelUps, golden.idle.levelUps)
})

test('R2 绕圈：replay-kite summary 相等，第 60/180/300 秒状态哈希等于金标准', () => {
  const r = kiteBase()
  assert.ok(r.steps > HASH_STEPS[2], `绕圈局需活过 300 秒（实际 ${r.steps} 步）`)
  assert.deepEqual(json(r.summary), golden.kite.summary)
  assert.deepEqual(r.hashes, golden.kite.hashes)
  assert.equal(Object.keys(r.hashes).length, 3)
})

test('R3 完整通关：replay-win 固化输入 → won、bossDefeated、survivalSec ∈ [420, 600] 且与金标准相等', () => {
  const r = replay(win)
  assert.equal(r.summary.outcome, 'won')
  assert.equal(r.summary.bossDefeated, true)
  assert.ok(r.summary.survivalSec >= 420 && r.summary.survivalSec <= 600, `survivalSec ${r.summary.survivalSec}`)
  assert.deepEqual(json(r.summary), golden.win.summary)
  assert.equal(r.steps, golden.win.steps)
})

test('R4 暂停穿插：第 30、120 秒与每次三选一中 pause/resume，结果与 R2 完全相同', () => {
  const r = replay(kite, { hashAt, pauses: [30 * 60, 120 * 60], pauseInLevelup: true })
  const base = kiteBase()
  assert.deepEqual(r.summary, base.summary)
  assert.deepEqual(r.hashes, base.hashes)
  assert.equal(r.steps, base.steps)
})

test('R5 帧率无关：advance(1/60)、advance(1/30)、随机 0–0.083 帧长三者 summary 与状态哈希相同', () => {
  const base = kiteBase()
  for (const frame of [1 / 60, 1 / 30, 'random']) {
    const r = replay(kite, { hashAt, frame })
    assert.equal(r.droppedTime, 0, `${frame}: 单帧 ≤ 5 步，不丢时间`)
    assert.deepEqual(r.summary, base.summary, `frame ${frame} summary`)
    assert.deepEqual(r.hashes, base.hashes, `frame ${frame} hashes`)
  }
})

test('R6 双次运行：3 个种子同一输入跑两次，前 3 分钟逐步状态哈希完全一致', () => {
  const short = { ...kite, maxSteps: 180 * 60 }
  const traces = []
  for (const seed of ['replay-r6-a', 'replay-r6-b', 'replay-r6-c']) {
    const a = replay(short, { seed, everyStep: true })
    const b = replay(short, { seed, everyStep: true })
    assert.ok(a.trace.length > 600, `${seed} ran ${a.trace.length} steps`)
    assert.equal(a.trace.length, b.trace.length)
    for (let i = 0; i < a.trace.length; i += 1) assert.equal(a.trace[i], b.trace[i], `${seed} diverges at step ${i + 1}`)
    assert.deepEqual(a.summary, b.summary)
    traces.push(a.trace[599])
  }
  assert.equal(new Set(traces).size, 3, '不同种子轨迹不同')
})
