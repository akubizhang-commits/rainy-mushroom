import { FLOORS, FLOOR01, ARCHETYPES, MONSTER_RANK_BASELINE } from './TowerContent.js'
import { monsterAttributes, monsterHealthMultiplier } from './TowerMonsterAttributes.js'

// Applied once at the incoming-hit boundary, including authored heavy attacks
// and mechanic zones that do not use an actor's ordinary damage field.
export const ENEMY_INCOMING_DAMAGE_MULTIPLIER = 2

// Fixed floor budgets, calibrated against ordinary natural gear, never player stats.
// 2026-11-09 F4难度尖峰调查（.agents/tasks/f4-difficulty-spike-2026-11-09.md）：伏潭鳄王 1.2→0.85，约降29%。
export const BOSS_HP_MULTIPLIERS = Object.freeze([1, 1, 1.55, 0.85, 1.5, 1.45, 1.2, 1.65, 1.65])
// 同一调查：F4第15波两只4阶蝙蝠精英保留4阶与形态，只把血量降到原来的0.35/0.75（约5.6万→2.6万）。
export const ENCOUNTER_HP_MULTIPLIERS = Object.freeze({ bat_elite_f4_w15_n4: .35 / .75, bat_elite_f4_w15_n5: .35 / .75 })
// Fixed authored floor/role/family stats. Never uses the player's level.
export function towerEnemyStats(archetype, floor, wave = 1) {
  const base=towerEnemyBaseStats(archetype,floor,wave)
  const attributes=monsterAttributes(archetype,floor)
  return {...base,...attributes,hp:base.hp*monsterHealthMultiplier(attributes)}
}
function towerEnemyBaseStats(archetype, floor, wave) {
  const scale = FLOORS[floor - 1]?.floor_stat_scale
  if (!scale) return { hp: archetype.hp, damage: archetype.damage, moveSpeed: archetype.move_speed }
  const role = archetype.role
  if (scale.rank_role_version === 1 && role !== 'boss') {
    const elite = role === 'elite'
    const early = !elite && wave <= scale.early_normal_through_wave
      ? scale.early_normal_hp_multiplier : 1
    return {
      hp: MONSTER_RANK_BASELINE.normal_hp[archetype.rank]
        * (archetype.floor_hp_factor ?? 1) * early
        * (elite ? MONSTER_RANK_BASELINE.elite_hp_multiplier_by_rank[archetype.rank] : 1)
        * (ENCOUNTER_HP_MULTIPLIERS[archetype.id] ?? 1),
      damage: MONSTER_RANK_BASELINE.normal_damage[archetype.rank]
        * (elite ? MONSTER_RANK_BASELINE.elite_damage_multiplier : 1),
      moveSpeed: archetype.move_speed * (archetype.floor_speed_factor ?? 1),
    }
  }
  const early = role === 'normal' && wave <= scale.early_normal_through_wave
    ? scale.early_normal_hp_multiplier
    : role === 'elite' && wave <= (scale.early_elite_through_wave ?? 0)
      ? scale.early_elite_hp_multiplier : 1
  return {
    hp: scale[`${role}_hp`] * (archetype.floor_hp_factor ?? 1) * early
      * (role === 'boss' ? BOSS_HP_MULTIPLIERS[floor - 1] : 1),
    damage: scale[`${role}_damage`],
    moveSpeed: archetype.move_speed * (archetype.floor_speed_factor ?? 1),
  }
}

// One body-size authority for native actors and temporary spawn placement.
const archetypesById = Object.fromEntries(ARCHETYPES.map(a => [a.id, a]))
export function towerEnemyRadius(id) {
  const role = archetypesById[id]?.role, family = archetypesById[id]?.species ?? id.split('_')[0]
  return FLOOR01.enemies[id]?.body_radius
    ?? (role === 'boss' ? 42 : role === 'elite' ? 34
      : { bear: 32, crocodile: 30, ape: 28, tiger: 28, bat: 18, falcon: 20 }[family] ?? 24)
}
