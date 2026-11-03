// Review-only probes. Writes evidence, never gameplay data or persistent saves.
import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { FLOORS, FLOOR01, ARCHETYPES } from '../js/xianxia/TowerContent.js'
import { towerKillXp } from '../js/xianxia/TowerCultivationRewards.js'
import { cultivationAt, TOWER_XP_CAP } from '../js/xianxia/TowerProfile.js'
import { GROWTH_SKILLS, giftSkills, tutorialProgress, realmPoints, rankCap } from '../js/xianxia/TowerGrowth.js'
import { TowerCampaignStore, combatLoadout } from '../js/xianxia/TowerCampaign.js'
import { TowerRun, stats } from '../js/xianxia/TowerRun.js'
import { towerEnemyStats } from '../js/xianxia/TowerEnemyStats.js'
import { validateWeapon } from '../js/xianxia/TowerWeapons.js'

const A = Object.fromEntries(ARCHETYPES.map(a => [a.id, a]))
const fresh = () => structuredClone(new TowerCampaignStore({
  getItem: () => null, setItem() {},
}, 0).state)
const round = n => Number(n.toFixed(5))
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`)
const xpAt = level => level === 1 ? 0 : 30 * (level - 1) + 15 * (level - 1) ** 2
const weapons = [
  {
    id: 'audit-general', definitionId: 'eq_sword_lingxi', tier: 'huang',
    quality: 4, refine: 0, locked: false,
    affixes: [
      { type: 'physical', value: 3 },
      { type: 'skill', target: 'sj_yujian', value: 6 },
      { type: 'skill', target: 'sj_shadow', value: 6 },
      { type: 'flow', target: 'qi', value: 4 },
    ],
  },
  {
    id: 'audit-qi', definitionId: 'eq_sword_zhaodan', tier: 'huang',
    quality: 4, refine: 0, locked: false,
    affixes: [
      { type: 'physical', value: 3 },
      { type: 'skill', target: 'sj_arc', value: 6 },
      { type: 'skill', target: 'sj_line', value: 6 },
      { type: 'flow', target: 'qi', value: 4 },
    ],
  },
]
weapons.forEach(w => assert.ok(validateWeapon(w)))

// Deterministic stationary target probe: real release and real damage settlement,
// no movement/collision/AI simulation. Every emitted sword is assumed to hit.
function probe({ level = 1, rank = 1, targets = 1, weapon = null, empty = false }) {
  const state = fresh()
  state.xp = xpAt(level)
  state.skills.sj_yujian = rank
  assert.ok(rank <= rankCap('sj_yujian', state.xp))
  if (weapon) {
    state.weapons[weapon.id] = weapon
    state.loadouts[state.selectedLoadout].weaponId = weapon.id
  }
  if (empty) state.loadouts[state.selectedLoadout].weaponId = ''
  const loadout = combatLoadout(state)
  const run = new TowerRun({ attemptId: 1, floor: 1, seed: 1, xp: state.xp,
    hp: 100, loadout, training: true })
  const p = run.state.player
  run.state.enemies = Array.from({ length: targets }, (_, i) => ({
    id: `probe-${i}`, x: p.x + 80, y: p.y + i * 35, radius: 10,
    hp: 10000, woundBudget: 0, woundUntil: 0,
  }))
  run._releaseSkill({ skill: 'sj_yujian', level: rank, formId: 'sj_yujian',
    castContext: { xp: state.xp, loadout }, dirX: 1, dirY: 0, pulseIndex: 0,
    x: p.x, y: p.y }, [])
  const shots = run.state.projectiles.filter(s => !s.hostile)
  for (const shot of shots) run._damageEnemy({
    target: shot.targetId, damage: shot.damage, source: 'sj_yujian', direct: true,
    castContext: shot.castContext,
  })
  const damage = run.state.enemies.map(e => 10000 - e.hp)
  const skill = GROWTH_SKILLS.find(s => s.id === 'sj_yujian')
  const factor = weapon ? (weapon.id === 'audit-general' ? 1.09 : 1.03) : 1
  close(damage.reduce((a, b) => a + b, 0),
    stats(state.xp, loadout).attack * skill.damage[rank - 1] * factor
      * (1 + Math.max(0, Math.min(skill.swords[rank - 1], targets) - 1) * skill.secondary_share))
  const hp = towerEnemyStats(A.boar_normal, 1, level === 1 ? 1 : 13).hp
  return { level, skillRank: rank, targets, weapon: empty ? 'empty' : weapon?.id ?? 'iron',
    projectiles: shots.length, damageByTarget: damage.map(round),
    boarHp: round(hp), roundsToKillFirstBoar: Math.ceil(hp / damage[0]) }
}

let total = 0
const floors = [], waves = [], milestones = []
const seen = new Set()
for (const floor of FLOORS) {
  let floorXp = 0
  for (const wave of floor.waves) {
    let index = 0
    const units = floor.floor === 1
      ? FLOOR01.waves[wave.wave - 1].batches.flatMap(b =>
        b.unit_ids.map(id => ({ id, archetype: b.archetype })))
      : [...wave.enemy_groups].sort((a, b) =>
        Number(A[b.archetype].role === 'boss') - Number(A[a.archetype].role === 'boss'))
        .flatMap(g => Array.from({ length: g.count }, () =>
          ({ id: `u${++index}`, archetype: g.archetype })))
    let waveXp = 0
    for (const unit of units) {
      const xp = towerKillXp(floor.floor, wave.wave, unit.id)
      assert.ok(Number.isInteger(xp) && xp >= 0)
      waveXp += xp; floorXp += xp; total += xp
      const level = cultivationAt(Math.min(total, TOWER_XP_CAP)).level
      if (!seen.has(level)) {
        milestones.push({ level, threshold: xpAt(level), floor: floor.floor, wave: wave.wave })
        seen.add(level)
      }
    }
    if (floor.floor === 1) waves.push({
      wave: wave.wave, units: units.length, waveXp, cumulativeXp: total,
      level: cultivationAt(total).level, earnedSkillPoints: realmPoints(total),
      giftedSkills: Object.keys(giftSkills(tutorialProgress(0, 1, Array.from({length:wave.wave}, (_, i) => i + 1)))),
      enemies: [...new Set(units.map(u => u.archetype))].map(id => ({
        id, ...towerEnemyStats(A[id], 1, wave.wave),
      })),
    })
  }
  floors.push({ floor: floor.floor, xp: floorXp, cumulativeXp: total,
    level: cultivationAt(Math.min(total, TOWER_XP_CAP)).level })
}
assert.deepEqual(floors.map(f => f.level), [3, 6, 9, 12, 15, 18, 21, 24, 27])
assert.equal(total, 10920)
const probes = [
  probe({ empty: true }), probe({}),
  probe({ weapon: weapons[0] }), probe({ weapon: weapons[1] }),
  probe({ level: 2, rank: 2 }), probe({ level: 5, rank: 1 }),
  probe({ level: 4, rank: 2, targets: 2 }),
  probe({ level: 4, rank: 3, targets: 2 }),
  probe({ level: 4, rank: 3, targets: 1 }),
]
close(probes[1].damageByTarget[0] - probes[0].damageByTarget[0], 6)
assert.ok(probes[7].damageByTarget[0] > probes[6].damageByTarget[0])
assert.ok(probes[7].roundsToKillFirstBoar <= probes[6].roundsToKillFirstBoar)
const files = ['TowerRun', 'TowerGrowth', 'TowerProfile', 'TowerWeapons',
  'TowerEquipment', 'TowerCampaign', 'TowerContent', 'TowerEnemyStats',
  'TowerCultivationRewards', 'TowerSkillForms', 'TowerEconomy', 'TowerSkillTiming']
const hashes = Object.fromEntries(await Promise.all(files.map(async file => [
  `${file}.js`, createHash('sha256').update(await readFile(
    new URL(`../js/xianxia/${file}.js`, import.meta.url))).digest('hex'),
])))
const result = {
  assumptions: [
    'Fresh campaign; clear each authored floor once; no pills, repeat runs or playtest bonuses.',
    'Milestone wave is exact under full prior waves; within-wave kill order is not modeled.',
    'Damage probes use real release/settlement on stationary targets with guaranteed hits, no crit ring.',
    'Two-target round count assumes both remain available; not a full encounter time prediction.',
  ],
  source_sha256: hashes, floors, firstFloorWaves: waves, milestones, probes,
  repeatFloorOne: {
    level25FullClearEquivalents: Math.ceil(xpAt(25) / floors[0].xp),
    level27FullClearEquivalents: Math.ceil(xpAt(27) / floors[0].xp),
  },
}
const output = new URL('../docs/xianxia/reports/growth-feedback-2026-10-30/', import.meta.url)
await mkdir(output, { recursive: true })
await writeFile(new URL('after.json', output), JSON.stringify(result, null, 2) + '\n')
console.log(JSON.stringify({ floors, milestones: milestones.filter(m =>
  [10, 19, 25, 27].includes(m.level)), probes, repeatFloorOne: result.repeatFloorOne }, null, 2))
