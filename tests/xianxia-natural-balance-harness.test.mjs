import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

test('natural audit fingerprints its policy and steering code and preserves previous evidence', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tower-natural-'))
  const output = join(dir, 'report.json')
  const args = ['scripts/verify-tower-natural-balance.mjs', '--attempts=0', `--output=${output}`]
  try {
    const first = spawnSync(process.execPath, args, { encoding: 'utf8' })
    assert.equal(first.status, 0, first.stderr)
    const bytes = readFileSync(output, 'utf8')
    const report = JSON.parse(bytes)
    assert.equal(report.sourceStable, true)
    assert.equal(report.clearedFloor, 0)
    assert.equal(report.maxAttempts, 0)
    for (const path of ['scripts/verify-tower-natural-balance.mjs', 'scripts/verify-monster-mechanics-balance.mjs']) {
      assert.match(report.hashes[path], /^[0-9a-f]{64}$/)
    }
    const second = spawnSync(process.execPath, args, { encoding: 'utf8' })
    assert.notEqual(second.status, 0)
    assert.match(second.stderr, /Refusing to overwrite/)
    assert.equal(readFileSync(output, 'utf8'), bytes)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
