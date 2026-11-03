// Acceptance checks over real three-floor Campaign runs, not synthetic DPS.
// Produce inputs with verify-tower-natural-balance.mjs --attempts=3.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const paths = process.argv.slice(2)
assert.ok(paths.length, 'Pass one or more natural-growth report paths')
const violations = []
const measurements = []
for (const path of paths) {
  const report = JSON.parse(readFileSync(path, 'utf8'))
  assert.equal(report.sourceStable, true, `${path}: source changed during run`)
  assert.ok(!report.failure && !report.blocked, `${path}: incomplete run`)
  for (const floor of [1, 3]) {
    const attempt = report.attempts.find(a => a.floor === floor && a.outcome === 'won')
    assert.ok(attempt, `${path}: floor ${floor} must clear naturally`)
    const encounters = attempt.encounters.filter(e => e.role === 'boss' || floor === 1)
    assert.equal(encounters.length, floor === 1 ? 6 : 1, 'Every intended encounter is measured')
    for (const encounter of encounters) {
      assert.ok(encounter.deadAt && Number.isFinite(encounter.visibleRangeToDeathSeconds),
        `${path}: ${encounter.id} must die with a measured engagement time`)
      const seconds = encounter.visibleRangeToDeathSeconds
      const [min, max] = encounter.role === 'boss' ? [100, 140] : [20, 40]
      const row = { path, route: report.route, seed: report.seed, floor,
        role: encounter.role, id: encounter.id, seconds, target: [min, max] }
      measurements.push(row)
      if (seconds < min || seconds > max) violations.push(row)
    }
  }
}
console.log(JSON.stringify({ passed: violations.length === 0, measurements, violations }, null, 2))
process.exitCode = violations.length ? 1 : 0
