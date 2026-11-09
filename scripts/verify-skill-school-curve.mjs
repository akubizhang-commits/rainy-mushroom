// Doc 84 follow-up: power curve of each skill school by floor, with a moving bot and a standing bot.
// For every floor the character has the natural level of that floor entry (growth-check 2026-11-04),
// the natural gear tier, and spends ALL realm points greedily on the school's attack skills through the
// real Campaign learn action (so realm gates, book costs and evolution rules apply). No passives.
// Gear is fixed and shared by all schools; resources are supplied. Not an acquisition simulation.
// Usage: node scripts/verify-skill-school-curve.mjs --school=qi|qiHeavy|yujian|formation|qinglian|spread|mixA|mixB|mixC --floors=2,3,... --seeds=101,211,307 --modes=move,half
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { steerMechanics } from './verify-monster-mechanics-balance.mjs'
import { TowerRun, stats, validateTowerSnapshot } from '../js/xianxia/TowerRun.js'
import { TowerCampaignStore, combatLoadout, TOWER_CAMPAIGN_KEY } from '../js/xianxia/TowerCampaign.js'
import { growthSummary } from '../js/xianxia/TowerGrowth.js'
import { createFixedWeapon } from '../js/xianxia/TowerWeapons.js'
import { EQUIPMENT_ROSTER } from '../js/xianxia/TowerEquipmentRoster.js'
import { createFixedEquipment } from '../js/xianxia/TowerEquipment.js'
import { checksum } from '../js/xianxia/Checksum.js'

const option = (key, fallback) => process.argv.find(a => a.startsWith(`--${key}=`))?.slice(key.length + 3) ?? fallback
const school = option('school', 'qi')
const floors = option('floors', '2,3,4,5,6,7,8,9').split(',').map(Number)
const seeds = option('seeds', '101,211').split(',').map(Number)
const modes = option('modes', 'move,half').split(',')
const out = resolve(option('out', 'reports/skill-school-curve-2026-11-06'))

// Natural entry xp and gear by floor (qi route of reports/growth-check-2026-11-04).
const ENTRY = {
  2: { xp: 480 }, 3: { xp: 930, gear: ['eq_sword_panxi', 'eq_armor_chentie', 'eq_ring_huyuan'] },
  4: { xp: 1650, gear: ['eq_sword_panxi', 'eq_armor_houlin', 'eq_ring_huyuan'] },
  5: { xp: 3338, gear: ['eq_sword_zhenyue', 'eq_armor_humai', 'eq_ring_huming'] },
  6: { xp: 4514, gear: ['eq_sword_liuxia', 'eq_armor_humai', 'eq_ring_huming'] },
  7: { xp: 6075, gear: ['eq_sword_liuxia', 'eq_armor_jingbo', 'eq_ring_huming'] },
  8: { xp: 8707, gear: ['eq_sword_qiyao', 'eq_armor_wuyin', 'eq_ring_taihe'] },
  9: { xp: 10732, gear: ['eq_sword_qiyao', 'eq_armor_wuyin', 'eq_ring_taihe'] },
}
// Buy order with target ranks. Items that are gated are skipped and retried after other purchases.
const SCHOOLS = {
  // 剑气玩家优先点剑气专属的玄月斩，流云斩是所有流派共用的过渡技能。
  qi: [['sj_moon', 10], ['sj_arc', 10], ['sj_line', 10], ['evo_tiandi', 2], ['sj_cross', 10], ['sj_moon_triple', 10]],
  // Leftover points go to the starter skill, as a real player without another sink would do.
  // 85号第9节：没有流派功法可点时，玩家会把点数投进开局自带的流云斩过渡。
  yujian: [['sj_yujian', 10], ['sj_shadow', 10], ['evo_wanjian', 2], ['sj_arc', 10]],
  formation: [['sj_wanjian', 10], ['sj_sancai', 6], ['sj_formation', 10], ['evo_sixiang', 2], ['sj_sancai', 10], ['evo_wuwo', 2], ['sj_arc', 10]],
  // 青莲剑阵 only unlocks at 炼气巅峰 (Lv7); lower floors show the starter-only fallback.
  qinglian: [['sj_qinglian', 10]],
}
// 2026-11-09 补充：剑气玩家优先点剑气重招（剑破虚空、双月斩、逐月斩），流云斩放最后，
// 用来量化剑破虚空移出筑基后筑基阶段的变化（qi 列表在筑基期把点数全给了玄月斩和流云斩）。
SCHOOLS.qiHeavy = [['sj_moon', 10], ['sj_line', 10], ['evo_tiandi', 2], ['sj_cross', 10], ['sj_moon_triple', 10], ['sj_arc', 10]]
// 2026-11-09 补充：既有 formation 列表不买青莲剑阵。炼气阶段剑阵现在有周天（中期）与青莲（巅峰）两门，
// 这一列表按开放顺序依次投入，用来衡量带青莲的纯剑阵。不改动既有 formation 列表，便于前后对照。
SCHOOLS.formationQL = [['sj_wanjian', 10], ['sj_qinglian', 10], ['sj_sancai', 6], ['sj_formation', 10], ['evo_sixiang', 2], ['sj_sancai', 10], ['evo_wuwo', 2], ['sj_arc', 10]]
// Mixed builds: formation core plus a second school's skills (does mixing beat staying in one school?)
SCHOOLS.mixA = [['sj_wanjian', 10], ['sj_formation', 10], ['evo_sixiang', 2], ['sj_yujian', 10], ['sj_sancai', 10], ['sj_arc', 10]]
SCHOOLS.mixB = [['sj_wanjian', 10], ['sj_formation', 10], ['evo_sixiang', 2], ['sj_shadow', 10], ['sj_sancai', 10], ['sj_arc', 10]]
SCHOOLS.mixC = [['sj_arc', 10], ['sj_wanjian', 10], ['sj_formation', 10], ['evo_sixiang', 2], ['sj_line', 10], ['evo_tiandi', 2]]
// A player who buys one more rank of every skill in turn (the "learn everything" strategy).
const ACTIVES = ['sj_arc', 'sj_yujian', 'sj_moon', 'sj_wanjian', 'sj_sancai', 'sj_shadow', 'sj_line', 'sj_moon_triple', 'sj_cross', 'sj_formation']
SCHOOLS.spread = Array.from({ length: 10 }, (_, r) => ACTIVES.map(id => [id, r + 1])).flat()
// Leftover points go to passives (心法/通用), which do not count toward resonance, as a real player would.
const PASSIVES = [['sj_bone', 4], ['vajra', 4], ['sj_spirit', 3], ['sj_heart', 4], ['sj_gate', 2], ['sj_mark', 1], ['sj_flight', 1]]
for (const key of Object.keys(SCHOOLS)) SCHOOLS[key] = [...SCHOOLS[key], ...PASSIVES]
assert.ok(SCHOOLS[school], `unknown school ${school}`)

function fixture(floor) {
  const entry = ENTRY[floor]
  let raw = null
  const disk = { getItem: k => k === TOWER_CAMPAIGN_KEY ? raw : null, setItem: (k, v) => { raw = v } }
  let store = new TowerCampaignStore(disk, 0); store.act({ type: 'sync' }, 0)
  const env = JSON.parse(raw)
  const state = { ...structuredClone(store.state), skillsInitialized: true, skills: { sj_arc: 1 }, xp: entry.xp,
    clearedFloor: floor - 1, spiritStones: 50000 }
  if (entry.gear) {
    const [w, a, r] = entry.gear
    // --weapon=matched：换成同阶同品质、与本流派对应的剑（剑气→qi、剑阵→formation、御剑→general）。
    const role = { qi: 'qi', formation: 'formation', yujian: 'general' }[school]
    const base = EQUIPMENT_ROSTER.find(d => d.id === w)
    const matched = option('weapon', 'fixed') === 'matched' && role
      ? EQUIPMENT_ROSTER.find(d => d.category === 'weapon' && d.tier === base.tier && d.quality === base.quality && d.role === role)?.id ?? w : w
    const weapon = createFixedWeapon(matched, 'weapon-1')
    const armor = createFixedEquipment(a, 'gear-1'), ring = createFixedEquipment(r, 'gear-2')
    state.weapons[weapon.id] = weapon; state.weaponCounters[weapon.id] = 0; state.weaponSequence = 1; state.equipmentSequence = 2
    for (const item of [armor, ring]) { state.equipment[item.id] = item; if (item.category === 'ring') state.equipmentCounters[item.id] = 0 }
    Object.assign(state.loadouts[0], { weaponId: weapon.id, armorId: armor.id, ringId: ring.id })
  }
  Object.assign(state.loadouts[0], { active: [], passive: [], evolutions: [] })
  env.data = JSON.stringify(state); env.checksum = checksum(env.data); raw = JSON.stringify(env)
  store = new TowerCampaignStore(disk, 0); assert.equal(store.readOnly, false, `floor ${floor} campaign state rejected`)
  const bought = {}
  for (let pass = 0; pass < 12; pass++) {
    let progress = false
    for (const [id, target] of SCHOOLS[school]) {
      while ((bought[id] ?? 0) < target) {
        const result = store.act({ type: 'learnSkill', id }, 0)
        if (!result.ok) break
        bought[id] = (bought[id] ?? 0) + 1; progress = true
      }
    }
    if (!progress) break
  }
  const points = growthSummary(store.state)
  return { floor, xp: store.state.xp, points, bought, loadout: combatLoadout(store.state) }
}

function play(f, seed, mode) {
  const run = new TowerRun({ attemptId: 1, floor: f.floor, seed, xp: f.xp, hp: stats(f.xp, f.loadout).maxHp,
    loadout: f.loadout, arenaVersion: 1 })
  assert.equal(run._playtestAssist, false)
  const encounters = new Map(); let seen = new Set(), received = 0, nextCheck = 15, minHp = 1
  const maxSeconds = 1500
  while (['playing', 'paused'].includes(run.state.phase) && run.state.time < maxSeconds) {
    if (run.state.phase === 'paused') { run.resume(); continue } // level-up / breakthrough pauses
    const s = run.state, p = s.player
    run.setViewport({ xmin: p.x - 560, xmax: p.x + 560, ymin: p.y - 315, ymax: p.y + 315 })
    // move: always dodge. half: dodge one second in every three, otherwise stand (closer to a stand-and-shoot player).
    if (mode === 'move' || mode === 'half' && s.time % 3 < 1) steerMechanics(run); else run.setInput(0, 0)
    run.advance(1 / 60)
    minHp = Math.min(minHp, p.hp / p.maxHp)
    for (const e of s.enemies) if (['elite', 'boss'].includes(e.role) && !e.temporary) {
      if (!encounters.has(e.id)) encounters.set(e.id, { id: e.id, role: e.role, firstDamage: null, deadAt: null })
      if (e.hp < e.maxHp) encounters.get(e.id).firstDamage ??= s.time
    }
    for (const k of s.killLedger) { const e = encounters.get(k.id); if (e) e.deadAt ??= s.time }
    const next = new Set(); for (const fx of s.effects) { next.add(fx.id); if (!seen.has(fx.id) && fx.kind === 'player_hit') received += fx.damage || 0 } seen = next
    if (s.time >= nextCheck) { assert.ok(validateTowerSnapshot(run.snapshot())); nextCheck += 15 }
  }
  const s = run.state
  const times = role => [...encounters.values()].filter(e => e.role === role && e.deadAt && e.firstDamage).map(e => e.deadAt - e.firstDamage)
  return { school, floor: f.floor, mode, seed, outcome: ['playing', 'paused'].includes(s.phase) ? 'timeout' : s.phase,
    seconds: s.time, kills: s.killLedger.length, received, maxHp: s.player.maxHp, minHp,
    bossSeconds: times('boss')[0] ?? null, eliteMedian: (() => { const t = times('elite').sort((a, b) => a - b); return t.length ? t[Math.floor(t.length / 2)] : null })() }
}

mkdirSync(out, { recursive: true })
const rows = [], fixtures = []
for (const floor of floors) {
  const f = fixture(floor); fixtures.push({ floor, xp: f.xp, spent: f.points.spent, available: f.points.available, bought: f.bought })
  for (const mode of modes) for (const seed of seeds) {
    const row = play(f, seed, mode); rows.push(row)
    console.log(JSON.stringify({ school, floor, mode, seed, outcome: row.outcome, s: Math.round(row.seconds), boss: row.bossSeconds && Math.round(row.bossSeconds) }))
    writeFileSync(resolve(out, `${school}.json`), JSON.stringify({ school, fixtures, rows }, null, 1))
  }
}
