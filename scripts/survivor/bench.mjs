// 生存玩法 Node 性能基线（03 §7.2 / §7.3，04 §2 L4、§4.7 PERF-01，09 A3）。不进构建、不被 sync。用法：
//   node scripts/survivor/bench.mjs [--steps 3600] [--json tmp/survivor-bench.json] [--print-json]
// 自动以 `--expose-gc --min-semi-space-size=64 --max-semi-space-size=64` 重启自身（gc() 量堆；新生代放大到 64 MB，计量窗口内不触发 scavenge）。
// 场景与输出：
//   1. 满载单步：200 敌人（每步补满到视口附近）+ 250 孢子 + 5 把武器全 Lv5，先热身 300 步，再计时 --steps 步；
//      输出平均 / P50 / P95 / 最大单步耗时（ms，只计 run.step()，不含补怪）。
//   2. 热路径分配：满载下 gc() 后连跑 600 步、期间无 GC 时的 heapUsed 增量 / 步（字节，近似值；
//      窗口内发生 GC 时 gcInWindow > 0，读数只作下限）。
//   3. 8 分钟堆增长：bot.mjs 贴孢子型 + prefer:spore_shot 跑满 8 分钟模拟（每步回满生命，保证跑满），
//      开局与结束各 gc() 一次后的 heapUsed 差（字节）。
// 默认把结果写到 tmp/survivor-bench.json；--print-json 只把 JSON 打到 stdout 最后一行（供 survivor-perf 测试读取），不写文件。
// 计时用 performance.now（脚本层，逻辑层 js/survivor/ 仍禁用）；随机落点用 SeededRandom，结果之外的流程可复现。
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { cpus } from 'node:os'
import { PerformanceObserver, performance } from 'node:perf_hooks'
import { fileURLToPath } from 'node:url'

const self = fileURLToPath(import.meta.url)
if (typeof globalThis.gc !== 'function') {
  const r = spawnSync(process.execPath, ['--expose-gc', '--min-semi-space-size=64', '--max-semi-space-size=64', self, ...process.argv.slice(2)], { stdio: 'inherit' })
  process.exit(r.status ?? 1)
}

const { SurvivorRun } = await import('../../js/survivor/SurvivorRun.js')
const { SeededRandom } = await import('../../js/survivor/SurvivorRandom.js')
const { makeWeaponState } = await import('../../js/survivor/Weapons.js')
const { dropSpore } = await import('../../js/survivor/Pickups.js')
const { WEAPONS } = await import('../../js/survivor/data/weapons.js')
const { LIMITS } = await import('../../js/survivor/data/limits.js')
const { steer, makePicker } = await import('./bot.mjs')

const root = resolve(import.meta.dirname, '../..')
const opts = { steps: 3600, json: 'tmp/survivor-bench.json', print: false }
const argv = process.argv.slice(2)
for (let i = 0; i < argv.length; i += 1) {
  const a = argv[i]
  if (a === '--steps') { opts.steps = Math.max(60, parseInt(argv[i + 1], 10) || 3600); i += 1 }
  else if (a === '--json') { opts.json = argv[i + 1]; i += 1 }
  else if (a === '--print-json') opts.print = true
  else throw new Error(`unknown argument: ${a}`)
}

const ENEMY_FILL = 200
const SPORE_FILL = LIMITS.pools.spores // 250
const VIEW = { width: 720, height: 1560 }

// --- 满载场景 ---
function fullLoadRun() {
  const run = new SurvivorRun({ seed: 'bench-full', viewport: VIEW })
  run.weapons = Object.keys(WEAPONS).map((id) => makeWeaponState(id, WEAPONS[id].levels.length)) // 5 把全 Lv5（绕过 4 格栏位，压测用）
  run.time = 300 // 5:00 后的敌人成长系数
  const rng = new SeededRandom('bench-fill')
  const kinds = ['gnat', 'beetle', 'moth', 'snail', 'sporeling']
  let k = 0
  const refill = () => {
    const p = run.player
    p.hp = p.maxHp
    while (run.state === 'levelup') run.choose(0)
    // 敌人补到 200：落在角色周围 120–520 的环带（视口内），保证武器持续命中、敌人持续净化与重生
    while (run.enemies.count < ENEMY_FILL) {
      const a = rng.range(0, Math.PI * 2)
      const d = rng.range(120, 520)
      const before = run.enemies.count
      run.spawner._spawnOne(run, kinds[k++ % kinds.length], run.time / 60, { x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d })
      if (run.enemies.count === before) break
    }
    // 孢子补到 250：放在拾取半径外（600–900），不会被立即吸走
    while (run.spores.count < SPORE_FILL) {
      const a = rng.range(0, Math.PI * 2)
      const d = rng.range(600, 900)
      dropSpore(run, p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, 1)
    }
  }
  let t = 0
  const input = () => { t += 1; run.setInput(Math.cos(t / 90), Math.sin(t / 90)) }
  return { run, refill, input }
}

const pct = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1) + 0.5))]
const round = (v, d = 4) => Math.round(v * 10 ** d) / 10 ** d

function benchSteps() {
  const { run, refill, input } = fullLoadRun()
  for (let i = 0; i < 300; i += 1) { refill(); input(); run.step(); run.drainEvents() }
  const times = new Float64Array(opts.steps)
  let shotsMax = 0
  let enemiesMin = Infinity
  for (let i = 0; i < opts.steps; i += 1) {
    refill(); input()
    enemiesMin = Math.min(enemiesMin, run.enemies.count)
    const t0 = performance.now()
    run.step()
    times[i] = performance.now() - t0
    shotsMax = Math.max(shotsMax, run.shots.count)
    run.drainEvents()
  }
  const sorted = Float64Array.from(times).sort()
  let sum = 0
  for (const v of times) sum += v
  return {
    steps: opts.steps,
    enemiesAtStepStartMin: enemiesMin,
    shotsMax,
    spores: run.spores.count,
    weapons: run.weapons.map((w) => `${w.id}:${w.level}`),
    avgStepMs: round(sum / opts.steps),
    p50StepMs: round(pct(sorted, 0.5)),
    p95StepMs: round(pct(sorted, 0.95)),
    maxStepMs: round(sorted[sorted.length - 1]),
    dropped: { ...run.diag.dropped },
  }
}

async function benchAlloc() {
  const { run, refill, input } = fullLoadRun()
  for (let i = 0; i < 300; i += 1) { refill(); input(); run.step(); run.drainEvents() }
  // GC 条目异步送达：只统计开始时间落在计量窗口内的条目
  const gcTimes = []
  const obs = new PerformanceObserver((list) => { for (const e of list.getEntries()) gcTimes.push(e.startTime) })
  obs.observe({ entryTypes: ['gc'] })
  const N = 600
  globalThis.gc()
  const w0 = performance.now()
  const h0 = process.memoryUsage().heapUsed
  for (let i = 0; i < N; i += 1) { refill(); input(); run.step(); run.drainEvents() }
  const h1 = process.memoryUsage().heapUsed
  const w1 = performance.now()
  await new Promise((r) => setTimeout(r, 20))
  obs.disconnect()
  const gcCount = gcTimes.filter((t) => t >= w0 && t <= w1).length
  return { steps: N, bytesPerStep: Math.round((h1 - h0) / N), gcInWindow: gcCount }
}

function bench8min() {
  const SEC = 480
  globalThis.gc()
  const run = new SurvivorRun({ seed: 'bench-8min', viewport: VIEW, firstRun: true })
  const picker = makePicker('prefer:spore_shot', 'bench-8min')
  globalThis.gc()
  const h0 = process.memoryUsage().heapUsed
  let steps = 0
  while (run.time < SEC && run.state !== 'won' && run.state !== 'lost') {
    if (run.state === 'levelup') { run.choose(picker(run.offer)); continue }
    const [x, y] = steer(run, 'spore')
    run.setInput(x, y)
    run.player.hp = run.player.maxHp
    run.step()
    steps += 1
    run.drainEvents()
  }
  globalThis.gc()
  const h1 = process.memoryUsage().heapUsed
  return { simSec: round(run.time, 2), steps, state: run.state, heapStartMB: round(h0 / 1048576, 2), heapEndMB: round(h1 / 1048576, 2), heapGrowthBytes: h1 - h0 }
}

const result = {
  generatedBy: 'scripts/survivor/bench.mjs',
  node: process.version,
  platform: `${process.platform}-${process.arch}`,
  cpu: cpus()[0]?.model || 'unknown',
  fullLoad: benchSteps(),
  alloc: await benchAlloc(),
  run8min: bench8min(),
  thresholds: { avgStepMs: 2, heapGrowthBytes: 5 * 1024 * 1024, targetAvgStepMs: 0.6 },
}

if (opts.print) {
  console.log(JSON.stringify(result))
} else {
  const out = resolve(root, opts.json)
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, JSON.stringify(result, null, 2) + '\n')
  const f = result.fullLoad
  console.log(`[survivor:bench] ${result.node} ${result.platform} · ${result.cpu}`)
  console.log(`  满载单步（${f.steps} 步，敌人 ≥ ${f.enemiesAtStepStartMin}、孢子 ${f.spores}、弹体峰值 ${f.shotsMax}、5 武器 Lv5）：平均 ${f.avgStepMs} ms / P50 ${f.p50StepMs} / P95 ${f.p95StepMs} / 最大 ${f.maxStepMs} ms（断言 ≤ 2 ms，目标 ≤ 0.6 ms）`)
  console.log(`  热路径分配：约 ${result.alloc.bytesPerStep} B/步（${result.alloc.steps} 步窗口，窗口内 GC ${result.alloc.gcInWindow} 次）`)
  const m = result.run8min
  console.log(`  8 分钟模拟（${m.simSec}s，${m.steps} 步）：堆 ${m.heapStartMB} → ${m.heapEndMB} MB，增长 ${(m.heapGrowthBytes / 1048576).toFixed(2)} MB（断言 ≤ 5 MB）`)
  console.log(`  dropped：${JSON.stringify(f.dropped)}；写入 ${opts.json}`)
}
