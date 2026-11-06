// Read-only audit for doc 83: full-floor replays with the verify-survival-pressure
// movement policy, attributing every landed hit to the role of the monster that dealt it.
// Not a human win rate. Usage:
//   node scripts/audit-normal-monster-moving.mjs --inputs=DIR --floors=1,2 --modes=normal,intermittent
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { TowerRun, stats } from '../js/xianxia/TowerRun.js'
import { ARCHETYPES } from '../js/xianxia/TowerContent.js'
import { steerMechanics } from './verify-monster-mechanics-balance.mjs'

const option = (k, d) => process.argv.find(a => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d
const inputs = option('inputs', 'reports/growth-check-2026-11-04')
const floors = option('floors', '1,2,3,4,5,6,7,8,9').split(',').map(Number)
const modes = option('modes', 'normal,intermittent').split(',')
const roleOf = Object.fromEntries(ARCHETYPES.map(a => [a.id, a.role]))

const owners = new Map()
function remember(run) {
  for (const p of run.state.projectiles || []) if (p.hostile) owners.set(p.id, p.source)
  for (const z of run.state.zones || []) if (z.source) owners.set(z.id, z.source)
}
function sourceRole(run, hit) {
  const s = run.state, find = id => s.enemies.find(e => e.id === id) ?? s.killLedger?.find(k => k.id === id)
  const role = actor => actor ? (actor.role ?? roleOf[actor.archetype]) : 'unknown'
  if (hit.id.startsWith('mechanic:')) {
    const zone = s.monsterMechanics?.zones.find(z => hit.id.startsWith(z.id))
    return zone ? role(find(zone.ownerId)) : 'mechanic'
  }
  const zoneId = [...owners.keys()].find(id => hit.id === id || hit.id.startsWith(`${id}:`))
  const source = owners.get(hit.id) ?? (zoneId ? owners.get(zoneId) : undefined) ?? hit.id
  const owner = typeof source === 'string' ? source.split(':a')[0] : ''
  const actor = find(owner)
  if (!actor) return 'unknown'
  if (actor.temporary) return 'summon'
  return role(actor) === 'normal' && process.argv.includes('--by-archetype') ? `normal:${actor.archetype}` : role(actor)
}

const rows = []
for (const route of ['qi', 'array']) {
  const natural = JSON.parse(gunzipSync(readFileSync(`${inputs}/${route}.json.gz`)))
  for (const floor of floors) for (const mode of modes) {
    const entry = natural.attempts.find(a => a.floor === floor)
    const run = new TowerRun({ attemptId: 1, floor, seed: 100 + floor, xp: entry.xp,
      hp: stats(entry.xp, entry.loadout).maxHp, loadout: entry.loadout, arenaVersion: 1 })
    const by = {}
    owners.clear()
    let current = null
    const actions = run._enemyActions.bind(run)
    run._enemyActions = (incoming, ...rest) => { current = incoming; return actions(incoming, ...rest) }
    const effect = run._effect.bind(run)
    run._effect = (kind, x, y, radius, extra) => {
      if (kind === 'player_hit' && current?.length) {
        const role = sourceRole(run, current[0])
        const row = by[role] ??= { hits: 0, damageMaxHpUnits: 0 }
        row.hits++; row.damageMaxHpUnits += extra.damage / run.state.player.maxHp
      }
      return effect(kind, x, y, radius, extra)
    }
    let minHp = 1
    while (['playing', 'paused'].includes(run.state.phase) && run.state.time < 1500) {
      if (run.state.phase === 'paused') run.resume()
      const p = run.state.player
      run.setViewport({ xmin: p.x - 560, xmax: p.x + 560, ymin: p.y - 315, ymax: p.y + 315 })
      if (mode === 'normal' || mode === 'intermittent' && run.state.time % 3 < 1) steerMechanics(run)
      else run.setInput(0, 0)
      remember(run)
      run.advance(1 / 60)
      minHp = Math.min(minHp, p.hp / p.maxHp)
    }
    if (run.state.phase === 'playing') run.abandon()
    rows.push({ route, floor, mode, outcome: run.state.phase, seconds: Math.round(run.state.time), minHp, by })
  }
}
console.log(JSON.stringify(rows, null, 1))
