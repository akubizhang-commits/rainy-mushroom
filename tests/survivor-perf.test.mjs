// PERF-01（04 §4.7、03 §7.2 / §7.3，09 A3）：跑 scripts/survivor/bench.mjs（子进程，带 --expose-gc），
// 以宽松阈值断言满载平均单步 ≤ 2 ms、8 分钟模拟堆增长 ≤ 5 MB；实测值写进测试报告（目标 ≤ 0.6 ms）。
// --print-json 不写文件，测试不留临时产物（04 §3.1）。
import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const bench = fileURLToPath(new URL('../scripts/survivor/bench.mjs', import.meta.url))

test('PERF-01 满载单步 ≤ 2 ms、8 分钟堆增长 ≤ 5 MB（survivor:bench 实测）', () => {
  const r = spawnSync(process.execPath, [bench, '--print-json'], { encoding: 'utf8', timeout: 60000 })
  assert.equal(r.status, 0, r.stderr)
  const out = JSON.parse(r.stdout.trim().split('\n').pop())
  const f = out.fullLoad
  assert.ok(f.enemiesAtStepStartMin >= 200, `满载：每步开始时敌人 ≥ 200（实际 ${f.enemiesAtStepStartMin}）`)
  assert.equal(f.spores, 250)
  assert.equal(f.weapons.length, 5)
  assert.ok(Number.isFinite(f.avgStepMs) && f.avgStepMs > 0)
  assert.ok(f.avgStepMs <= out.thresholds.avgStepMs, `平均单步 ${f.avgStepMs} ms ≤ 2 ms`)
  assert.deepEqual(f.dropped, { enemies: 0, shots: 0, bubbles: 0, zones: 0, pickups: 0 })
  const m = out.run8min
  assert.ok(m.simSec >= 480, `跑满 8 分钟模拟（${m.simSec}s）`)
  assert.ok(m.heapGrowthBytes <= out.thresholds.heapGrowthBytes, `8 分钟堆增长 ${m.heapGrowthBytes} B ≤ 5 MB`)
  assert.ok(Number.isFinite(out.alloc.bytesPerStep))
})
