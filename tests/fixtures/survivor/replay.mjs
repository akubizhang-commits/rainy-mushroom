// L2 确定性回放的公共驱动（04 §2.2）：输入脚本解释、状态哈希、整局回放。
// 供 tests/survivor-replay.test.mjs 与 scripts/survivor/update-golden.mjs 共用；夹具不放进
// js/survivor/，不会被 sync-shared 带进构建（04 §3.2）。
//
// 输入脚本（inputs-*.mjs 默认导出）：
//   { seed, maxSteps, moves: [[fromStep, x, y], ...], picks: [i0, i1, ...], defaultPick }
//   - moves 按 fromStep 升序，第 k 段从 fromStep 起生效直到下一段；步号从 0 计。
//   - picks[n] = 第 n 次升级（从 0 计）选第几张；超出列表或越界时用 defaultPick（再越界取 0）。
// 输入按“步”而不是按“帧”施加：驱动把 run.step 包一层，每个固定步开始前按当前步号 setInput，
// 所以 advance(1/60)、advance(1/30) 或随机帧长喂入，模拟序列完全相同（R5）。
import { SurvivorRun } from '../../../js/survivor/SurvivorRun.js'
import { SeededRandom } from '../../../js/survivor/SurvivorRandom.js'

// FNV-1a 32 位（04 §2.2-3），返回 8 位十六进制。
export function fnv1a(str) {
  let hash = 2166136261
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

const q = (v) => Math.round(v * 1000) // 坐标 / 数值 ×1000 取整

// 04 §2.2-3：time、玩家位置与生命、每个活跃敌人 kind/x/y/hp（按池稠密表顺序）、
// 孢子总经验、等级、武器档位（进化档记 e，S3 B2）、拾取物（kind/x/y，S3 B3）。
export function stateHash(run) {
  const parts = [`t${q(run.time)}`, `p${q(run.player.x)},${q(run.player.y)},${q(run.player.hp)}`]
  const en = run.enemies
  for (let i = 0; i < en.count; i += 1) {
    const e = en.active[i]
    parts.push(`${e.kind}:${q(e.x)}:${q(e.y)}:${q(e.hp)}`)
  }
  let sporeXp = 0
  for (let i = 0; i < run.spores.count; i += 1) sporeXp += run.spores.active[i].xp
  parts.push(`sx${q(sporeXp)}`, `lv${run.progression.level}`)
  for (const w of run.weapons) parts.push(`w${w.id}${w.level}${w.evolved ? 'e' : ''}`)
  for (let i = 0; i < run.drops.count; i += 1) {
    const d = run.drops.active[i]
    parts.push(`d${d.kind}:${q(d.x)}:${q(d.y)}`)
  }
  return fnv1a(parts.join('|'))
}

// 当前步号对应的摇杆向量（moves 升序，游标单调前进）。
function makeMover(moves) {
  let k = -1
  return (step) => {
    while (k + 1 < moves.length && moves[k + 1][0] <= step) k += 1
    return k < 0 ? [0, 0] : [moves[k][1], moves[k][2]]
  }
}

function pickIndex(script, n, offer) {
  const want = n < script.picks.length ? script.picks[n] : script.defaultPick || 0
  return Number.isInteger(want) && want >= 0 && want < offer.length ? want : 0
}

// 整局回放。options：
//   frame: 'step'（直接 run.step，默认）| 数字（固定帧长喂 advance）| 'random'（SeededRandom 帧长 0–0.083）
//   hashAt: 需要记录状态哈希的步号集合（Set），默认空；everyStep: true 时每步记录（R6）
//   pauses: 步号到达这些值后（下一帧前）pause → 空喂几帧 → resume（R4）；pauseInLevelup: 每次三选一时 pause/resume 一次
// 返回 { summary, hashes: {step: hash}, trace: [hash...]（everyStep 时）, steps, levelUps }
export function replay(script, options = {}) {
  const { frame = 'step', hashAt = new Set(), everyStep = false, pauses = [], pauseInLevelup = false, seed = script.seed } = options
  const run = new SurvivorRun({ seed, viewport: { width: 720, height: 1560 } })
  const move = makeMover(script.moves)
  const hashes = {}
  const trace = []
  let steps = 0
  let levelUps = 0
  const pauseAt = pauses.slice().sort((a, b) => a - b)
  const original = run.step.bind(run)
  run.step = () => {
    if (steps >= script.maxSteps) return // 多步帧不越过脚本长度，保证各帧长模式终点一致
    const [x, y] = move(steps)
    run.setInput(x, y)
    original()
    steps += 1
    if (hashAt.has(steps)) hashes[steps] = stateHash(run)
    if (everyStep) trace.push(stateHash(run))
  }
  const frameRng = frame === 'random' ? new SeededRandom(`${seed}:frames`) : null
  const feed = () => {
    if (frame === 'step') run.step()
    else run.advance(frameRng ? frameRng.range(0, 0.083) : frame)
  }
  // 暂停期间空喂：模拟必须冻结（RUN-03）
  const idleFrames = () => { for (let i = 0; i < 5; i += 1) run.advance(1 / 30) }
  let guard = 0
  while (run.state !== 'won' && run.state !== 'lost' && steps < script.maxSteps && guard < script.maxSteps * 20) {
    guard += 1
    if (run.state === 'levelup') {
      if (pauseInLevelup) { run.pause(); idleFrames(); run.resume() }
      run.choose(pickIndex(script, levelUps, run.offer))
      levelUps += 1
      continue
    }
    if (pauseAt.length && steps >= pauseAt[0]) { pauseAt.shift(); run.pause(); idleFrames(); run.resume() }
    feed()
    run.drainEvents()
  }
  return { summary: run.summary(), hashes, trace, steps, levelUps, droppedTime: run.diag.droppedTime }
}
