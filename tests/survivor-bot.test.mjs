// BOT-01 快速档（04 §2.3 末段，09 A3）：scripts/survivor/bot.mjs 3 个种子 × 两种走位（flee / spore）
// + random 选卡，断言跑完不抛错、终态、实体数从不超过池容量、summary 字段齐全且为有限数。
// 完整统计在 `npm run survivor:balance`。
import test from 'node:test'
import assert from 'node:assert/strict'
import { playRun } from '../scripts/survivor/bot.mjs'
import { LIMITS } from '../js/survivor/data/limits.js'

const SEEDS = ['bot-quick-0', 'bot-quick-1', 'bot-quick-2']
const POOLS = [['enemies', 'enemies'], ['shots', 'playerProjectiles'], ['mistBubbles', 'mistBubbles'], ['spores', 'spores'], ['zones', 'raindropZones']]

for (const move of ['flee', 'spore']) {
  for (const seed of SEEDS) {
    test(`BOT-01 ${seed} · ${move} · random：终态、不超池容量、summary 有限`, () => {
      const peak = {}
      const sample = (run) => { for (const [k] of POOLS) peak[k] = Math.max(peak[k] || 0, run[k].count) }
      const { rec, run } = playRun({ seed, move, pick: 'random', hooks: { onSecond: (s, r) => sample(r), onEvent: (e, r) => sample(r) } })
      sample(run)
      assert.ok(['won', 'lost'].includes(run.state), `终态（实际 ${run.state} @ ${run.time.toFixed(1)}s）`)
      assert.equal(rec.outcome, run.state)
      for (const [k, cap] of POOLS) assert.ok(peak[k] <= LIMITS.pools[cap], `${k} 峰值 ${peak[k]} ≤ ${LIMITS.pools[cap]}`)
      assert.equal(rec.droppedTime, 0)
      const s = run.summary()
      for (const key of ['outcome', 'survivalSec', 'purified', 'level', 'weapons', 'passives', 'eliteDefeated', 'bossDefeated', 'shinyCards', 'abandoned', 'killer']) {
        assert.ok(key in s, `summary.${key}`)
      }
      for (const key of ['survivalSec', 'purified', 'level', 'eliteDefeated', 'shinyCards']) assert.ok(Number.isFinite(s[key]), `summary.${key} 有限数`)
      assert.ok(s.survivalSec > 0 && s.level >= 1)
      for (const w of [...s.weapons, ...s.passives]) assert.ok(typeof w.id === 'string' && Number.isInteger(w.level) && w.level >= 1)
      assert.ok(Number.isFinite(run.player.hp) && Number.isFinite(run.player.x) && Number.isFinite(run.player.y), '玩家状态无 NaN')
    })
  }
}
