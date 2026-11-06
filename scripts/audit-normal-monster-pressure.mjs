// Read-only audit for doc 83: how much pressure normal monsters put on a player.
// The player stands still and never attacks, so every attack that reaches it lands.
// This is an upper bound of unavoidable pressure, not a playtest of a moving player.
// Usage: node scripts/audit-normal-monster-pressure.mjs [seconds]
import { TowerRun } from '../js/xianxia/TowerRun.js'
import { FLOORS, ARCHETYPES } from '../js/xianxia/TowerContent.js'
import { cultivationAt, TOWER_XP_CAP } from '../js/xianxia/TowerProfile.js'

const STEP = 1 / 60, SECONDS = Number(process.argv[2] ?? 60)
const loadout = { active: { sj_wanjian: 1 }, passive: {}, evolutions: [],
  weaponId: 'eq_sword_suwen', weaponQuality: 1, weaponRefine: 0 }
const role = Object.fromEntries(ARCHETYPES.map(a => [a.id, a.role]))
const area = a => a.shape === 'circle' ? Math.PI * a.radius ** 2
  : a.shape === 'sector' ? a.angle / 360 * Math.PI * a.radius ** 2
  : a.range * a.width + Math.PI * (a.width / 2) ** 2

function normalsOn(floor) {
  const ids = FLOORS[floor - 1].waves.flatMap(w => w.enemy_groups.map(g => g.archetype))
  return [...new Set(ids)].filter(id => role[id] === 'normal').sort()
}

function simulate(floor, archetypes, distance = 200) {
  // Max cultivation HP keeps one late hit from ending the measurement early.
  const hp = cultivationAt(TOWER_XP_CAP).maxHp
  const run = new TowerRun({ attemptId: 1, floor, seed: 123, hp, xp: TOWER_XP_CAP, loadout })
  run._startBasic = () => {}; run._regenerateHp = () => {}
  const s = run.state
  for (const id of Object.keys(s.cooldowns)) s.cooldowns[id] = 1e9
  s.cooldowns.sj_wanjian = 1e9
  s.pending = []; s.reserved = []; s.time = 10; s.nextWindupAt = 0
  s.enemies = archetypes.map((archetype, i) => {
    const angle = i / archetypes.length * Math.PI * 2
    const e = run._enemy({ id: `audit-${i}`, archetype,
      x: s.player.x + Math.cos(angle) * distance, y: s.player.y + Math.sin(angle) * distance })
    e.hp = e.maxHp = 1e12
    return e
  })
  const seen = new Map(s.enemies.map(e => [e.id, 0]))
  let damage = 0, starts = 0, skills = 0, danger = 0, maxSkillWindups = 0
  for (let t = 0; t < SECONDS; t += STEP) {
    const before = s.player.hp
    run.advance(STEP)
    damage += Math.max(0, before - s.player.hp)
    s.player.hp = s.player.maxHp
    let windups = 0
    for (const e of s.enemies) {
      const a = e.ai.attack
      if (a && e.ai.sequence !== seen.get(e.id)) {
        seen.set(e.id, e.ai.sequence); starts++; danger += area(a)
        if (a.kind !== 'bite' && a.kind !== 'gore') skills++
      }
      if (a && a.kind !== 'bite' && ['windup', 'active'].includes(e.ai.mode)) windups++
    }
    maxSkillWindups = Math.max(maxSkillWindups, windups)
  }
  const perMin = n => Math.round(n / SECONDS * 60 * 10) / 10
  return { attacksPerMin: perMin(starts), skillsPerMin: perMin(skills),
    damagePerMin: perMin(damage), dangerAreaPerMin: Math.round(danger / SECONDS * 60),
    maxSimultaneousSkills: maxSkillWindups, playerMaxHp: s.player.maxHp }
}

const out = { seconds: SECONDS, floors: [] }
for (const { floor } of FLOORS) {
  const ids = normalsOn(floor)
  if (!ids.length) continue
  const single = Object.fromEntries(ids.map(id => [id, simulate(floor, [id])]))
  const crowdIds = Array.from({ length: 6 }, (_, i) => ids[i % ids.length])
  out.floors.push({ floor, normals: ids, single, crowd6: simulate(floor, crowdIds) })
}
console.log(JSON.stringify(out, null, 1))
