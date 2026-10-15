import test from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'

import { SurvivorRun } from '../js/survivor/SurvivorRun.js'
import { DT } from '../js/survivor/SimClock.js'

const here = dirname(fileURLToPath(import.meta.url))
const survivorDir = resolve(here, '../js/survivor')

// FNV-1a 32-bit over a short string (same family as the save checksum; here only used
// to compress a per-second state snapshot into a comparable hash).
function fnv1a(str) {
  let hash = 2166136261
  for (let i = 0; i < str.length; i += 1) {
    hash ^= str.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16)
}

// Snapshot the deterministic state into a string: player, every enemy, every shot,
// every spore, progression and purified count. Rounded to kill the chance that two
// genuinely-equal float paths print differently (they won't, but this keeps the hash
// readable); both runs round identically so divergence still shows.
function stateHash(run) {
  const parts = []
  parts.push(`t${run.time.toFixed(6)}`)
  parts.push(`p${run.player.x.toFixed(6)},${run.player.y.toFixed(6)},${run.player.hp.toFixed(6)}`)
  parts.push(`lv${run.progression.level},xp${run.progression.xp.toFixed(6)},pur${run.purified}`)
  parts.push(`st${run.state}`)
  for (let i = 0; i < run.enemies.count; i += 1) {
    const e = run.enemies.active[i]
    parts.push(`e${e.uid}:${e.kind}:${e.x.toFixed(6)}:${e.y.toFixed(6)}:${e.hp.toFixed(6)}`)
  }
  for (let i = 0; i < run.shots.count; i += 1) {
    const s = run.shots.active[i]
    parts.push(`s${s.uid}:${s.x.toFixed(6)}:${s.y.toFixed(6)}:${s.pierceLeft}`)
  }
  for (let i = 0; i < run.spores.count; i += 1) {
    const sp = run.spores.active[i]
    parts.push(`sp${sp.uid}:${sp.x.toFixed(6)}:${sp.y.toFixed(6)}:${sp.xp}`)
  }
  return fnv1a(parts.join('|'))
}

// A fixed, reproducible input script: a few direction changes over N seconds, choosing
// card 0 whenever the run offers a level-up. Returns per-second hashes + summary.
function playScripted(seed, seconds) {
  const run = new SurvivorRun({ seed, viewport: { width: 720, height: 1560 } })
  const hashes = []
  const totalSteps = seconds * 60
  for (let i = 0; i < totalSteps; i += 1) {
    // Deterministic input pattern (no Math.random): sweep direction by step index.
    const phase = i % 240
    if (phase < 60) run.setInput(1, 0)
    else if (phase < 120) run.setInput(0, 1)
    else if (phase < 180) run.setInput(-1, 0)
    else run.setInput(0, -1)

    if (run.state === 'levelup') {
      run.choose(0)
    }
    if (run.state === 'playing') {
      run.step()
    }
    // Record a hash at each whole second boundary.
    if ((i + 1) % 60 === 0) hashes.push(stateHash(run))
    if (run.state === 'won' || run.state === 'lost') break
  }
  return { hashes, summary: run.summary() }
}

test('same seed + same inputs → identical summary and per-second state hashes', () => {
  const a = playScripted('determinism-seed', 20)
  const b = playScripted('determinism-seed', 20)
  assert.deepEqual(a.hashes, b.hashes, 'per-second state hashes diverge')
  assert.deepEqual(a.summary, b.summary, 'summaries diverge')
  assert.ok(a.hashes.length > 0, 'something actually ran')
})

test('different seeds produce different trajectories', () => {
  const a = playScripted('seed-A', 20)
  const b = playScripted('seed-B', 20)
  assert.notDeepEqual(a.hashes, b.hashes)
})

test('a longer run is also fully reproducible (up to timed victory)', () => {
  // 180s is the timed-victory target; run the full length twice.
  const a = playScripted('long-seed', 181)
  const b = playScripted('long-seed', 181)
  assert.deepEqual(a.hashes, b.hashes)
  assert.deepEqual(a.summary, b.summary)
})

// --- forbidden-API source scan (03 §3.3) ---
function collectJsFiles(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) out.push(...collectJsFiles(full))
    else if (name.endsWith('.js')) out.push(full)
  }
  return out
}

// Strip // line comments and /* */ block comments so the scan only sees real code
// (the modules document the ban in prose like "no Math.random", which must not trip it).
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1')
}

test('no js/survivor source uses a non-deterministic or platform API', () => {
  const files = collectJsFiles(survivorDir)
  assert.ok(files.length >= 15, 'found the survivor sources')
  const forbidden = [
    /\bMath\s*\.\s*random\b/,
    /\bDate\s*\.\s*now\b/,
    /\bperformance\s*\.\s*now\b/,
    /\bfrom\s+['"]cc['"]/,
    /\bwx\s*\./,
  ]
  for (const file of files) {
    const code = stripComments(readFileSync(file, 'utf8'))
    for (const pattern of forbidden) {
      assert.ok(!pattern.test(code), `${file} matches forbidden API ${pattern}`)
    }
  }
})
