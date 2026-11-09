// Group-damage comparison for 青莲剑阵: one cast of sj_qinglian at rank 1 against N enemies inside reach.
// Usage: node scripts/qinglian-group-damage.mjs <js-root> <label>
//   <js-root> is a directory containing xianxia/TowerRun.js, e.g. ./js or an extracted baseline tree.
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const [, , jsRoot, label = 'run'] = process.argv
assert.ok(jsRoot, 'js root required')
const base = pathToFileURL(resolve(jsRoot, 'xianxia')).href + '/'
const { TowerRun, stats } = await import(base + 'TowerRun.js')
const { TowerCampaignStore, combatLoadout, TOWER_CAMPAIGN_KEY } = await import(base + 'TowerCampaign.js')
const { checksum } = await import(base + 'Checksum.js')

const FLOOR = 6
const SEEDS = [101, 211, 307]
// Enemies on different bearings, all inside the 200 px reach.
const GROUPS = {
  single: [60],
  group10: [25, 55, 85, 115, 145, 165, 180, 190, 196, 198],
}

function loadoutState() {
  // Level-7 campaign state with sj_qinglian learned, through the real store.
  let raw = null
  const disk = { getItem: k => (k === TOWER_CAMPAIGN_KEY ? raw : null), setItem: (k, v) => { raw = v } }
  const store = new TowerCampaignStore(disk, 0)
  store.act({ type: 'sync' }, 0)
  const env = JSON.parse(raw), state = JSON.parse(env.data)
  state.xp = 1200; state.skills = { sj_arc: 1 }; state.skillsInitialized = true
  env.data = JSON.stringify(state); env.checksum = checksum(env.data); raw = JSON.stringify(env)
  const s2 = new TowerCampaignStore(disk, 0)
  s2.act({ type: 'learnSkill', id: 'sj_qinglian' }, 0)
  return s2
}

function castOnce(distances, seed) {
  const store = loadoutState()
  const loadout = combatLoadout(store.state)
  const run = new TowerRun({ attemptId: 1, floor: FLOOR, seed, xp: store.state.xp,
    hp: stats(store.state.xp, loadout).maxHp, loadout, arenaVersion: 1 })
  const s = run.state
  run.pause()
  const template = s.pending[0] ?? s.enemies[0]
  assert.ok(template, 'need an enemy template')
  s.loadout.active = { sj_qinglian: 1 }; s.loadout.passive = {}; s.loadout.evolutions = []
  s.loadout.evolutionLevels = {}; delete s.loadout.trainedSkills
  s.cooldowns = { sj_qinglian: 0 }; s.casts = []; s.zones = []; s.effects = []; s.projectiles = []
  const p = s.player; p.x = 0; p.y = 0; p.faceX = 1; p.faceY = 0
  s.enemies = distances.map((d, i) => {
    const a = i * 2 * Math.PI / distances.length
    const e = run._enemy({ ...template, id: `g-${i}`, x: p.x + d * Math.cos(a), y: p.y + d * Math.sin(a) })
    e.hp = e.maxHp = 1e8; e.moveSpeed = 0; e.ai.readyAt = e.ai.graceUntil = e.ai.entryUntil = 1e8
    return e
  })
  s.pending = []; s.reserved = []; s.wavePlanned = 1; s.waveKilled = 0
  const before = s.enemies.map(e => e.hp)
  run.resume()
  const t0 = s.time
  while (s.time - t0 < 6) {
    run.advance(1 / 60, () => {})
    if (s.phase !== 'playing') break
  }
  const dealt = s.enemies.map((e, i) => before[i] - e.hp)
  return { perTarget: dealt.map(v => +v.toFixed(2)), total: +dealt.reduce((a, b) => a + b, 0).toFixed(2) }
}

const out = { label, jsRoot, floor: FLOOR, seeds: SEEDS, groups: {} }
for (const [name, distances] of Object.entries(GROUPS)) {
  const runs = SEEDS.map(seed => castOnce(distances, seed))
  const mean = xs => +(xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(2)
  out.groups[name] = {
    distances,
    meanTotalDamage: mean(runs.map(r => r.total)),
    meanPerTargetDamage: mean(runs.map(r => r.perTarget.reduce((a, b) => a + b, 0) / r.perTarget.length)),
    perSeed: runs.map(r => ({ total: r.total, perTarget: r.perTarget })),
  }
}
console.log(JSON.stringify(out, null, 2))
