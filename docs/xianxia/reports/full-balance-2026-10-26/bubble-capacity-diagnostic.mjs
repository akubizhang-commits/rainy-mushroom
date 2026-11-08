// Read-only single-case replay. Writes JSON to stdout, never to project files.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'
import { playRun } from '../../../../scripts/survivor/bot.mjs'

const root = new URL('../../../../', import.meta.url)
const read = path => JSON.parse(readFileSync(new URL(path, root), 'utf8'))
const sha = path => createHash('sha256').update(readFileSync(new URL(path, root))).digest('hex')
const directory = 'reports/full-balance-2026-10-26/'
const provenance = read(directory + 'provenance.json')
const runtimePaths = Object.keys(provenance.sourceBefore).filter(
  path => path.startsWith('js/') || path === 'scripts/survivor/bot.mjs',
)
const before = Object.fromEntries(runtimePaths.map(path => [path, sha(path)]))
const drift = runtimePaths.filter(path => before[path] !== provenance.sourceBefore[path])
if (drift.length) throw new Error(`Historical runtime source drift: ${drift.join(', ')}`)

const cases = read(directory + 'diagnostic-runs.json').B.filter(r => r.dropped.bubbles > 0)
if (cases.length !== 1) throw new Error(`Expected one B bubble case, got ${cases.length}`)
const selected = cases[0]
const batch = read(directory + 'B-xianxia-1.json')
const matches = r => r.seed === selected.seed && r.move === selected.move && r.pick === selected.pick
const historical = batch.runs.find(matches)
const repeated = read(directory + 'B-xianxia-2.json').runs.find(matches)
if (!historical || !repeated) throw new Error('Missing historical paired record')
const drops = []
let installed = null
let poolRef
let originalAcquire
const options = {
  seed: selected.seed, move: selected.move, pick: selected.pick,
  ruleset: 'xianxia', maxSec: batch.opts.maxSec,
}
const { run, rec } = playRun({
  ...options,
  hooks: {
    onSecond(sec, world) {
      if (sec !== 1 || installed) return
      const pool = world.mistBubbles
      poolRef = pool
      originalAcquire = pool.acquire
      installed = { sec, time: world.time, tick: world.simulationTick, droppedBefore: world.diag.dropped.bubbles }
      pool.acquire = function (...args) {
        // Exactly one original call, same receiver/arguments/result; no RNG use.
        const result = originalAcquire.apply(this, args)
        if (result === null) {
          const active = this.active.slice(0, this.count)
          const bySource = {}
          for (const bubble of active) bySource[bubble.source] = (bySource[bubble.source] || 0) + 1
          drops.push({
            time: world.time, simulationTick: world.simulationTick,
            phase: world.state, phaseSteps: world._phaseSteps,
            pool: {
              count: this.count, capacity: this.capacity, freeTop: this.freeTop,
              nextUid: this.nextUid, bySource,
              minLife: Math.min(...active.map(b => b.life)),
              maxLife: Math.max(...active.map(b => b.life)),
              expiringAtHostileStep: active.filter(b => b.life <= 1 / 60).length,
            },
            droppedCounterBeforeCallerIncrement: world.diag.dropped.bubbles,
            player: { x: world.player.x, y: world.player.y, hp: world.player.hp, invuln: world.player.invuln },
            enemyCount: world.enemies.count,
            boss: world.boss ? structuredClone(world.boss) : null,
            bossEntity: world.bossEnemy ? {
              hp: world.bossEnemy.hp, maxHp: world.bossEnemy.maxHp,
              x: world.bossEnemy.x, y: world.bossEnemy.y,
            } : null,
            stack: new Error('null acquire observer').stack,
          })
        }
        return result
      }
    },
  },
})
if (poolRef) delete poolRef.acquire // restore prototype lookup; replay is over
const plain = ({ detailed, config, ...record }) => record
// Match balance.mjs's actual export: compact display picks, plus independently
// compare full-precision picks against detailed.choices so rounding hides nothing.
const serializedRecord = JSON.parse(JSON.stringify({
  ...rec, picks: rec.picks.map(p => `${p.t.toFixed(1)}:${p.picked}`),
}))
const fullPicks = record => record.detailed.choices.map(
  ({ t, level, offer, picked }) => ({ t, level, offer, picked }),
)
const streams = Object.fromEntries(['_spawnRng', '_draftRng', 'weaponRng', 'dropRng'].map(
  key => [key, { seed: run[key].seed, state: run[key].state }],
))
const checks = {
  sourceUnchangedDuringReplay: runtimePaths.every(path => sha(path) === before[path]),
  plainRecordMatchesFirst: isDeepStrictEqual(serializedRecord, plain(historical)),
  plainRecordMatchesRepeat: isDeepStrictEqual(serializedRecord, plain(repeated)),
  fullPrecisionPicksMatchBoth: [historical, repeated].every(record =>
    isDeepStrictEqual(JSON.parse(JSON.stringify(rec.picks)), fullPicks(record))),
  finalSummaryMatchesFirst: isDeepStrictEqual(run.summary(), historical.detailed.finalSummary),
  finalRngMatchesFirst: isDeepStrictEqual(streams, historical.detailed.rngFinal),
  observedAllDrops: installed?.droppedBefore === 0 && drops.length === rec.dropped.bubbles,
}
console.log(JSON.stringify({
  options, installed, runtimeFileCount: runtimePaths.length, runtimeSourceDrift: drift,
  drops, checks,
  final: {
    outcome: rec.outcome, survivalSec: rec.survivalSec, finalHp: rec.finalHp,
    bossSpawnSec: rec.bossSpawnSec, bossDefeatSec: rec.bossDefeatSec,
    dropped: rec.dropped, droppedTime: rec.droppedTime,
  },
}, null, 2))
if (Object.values(checks).some(value => !value)) process.exitCode = 1
