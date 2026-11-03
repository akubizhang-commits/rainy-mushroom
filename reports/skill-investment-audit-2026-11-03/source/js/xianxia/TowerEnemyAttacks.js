// Pure family-level selection. Floor-one authored boss actions and the
// floor-one spider tutorial exception belong to TowerRun before this call.
const PLAYER_RADIUS = 18
const roleIndex = role => role === 'boss' ? 2 : role === 'elite' ? 1 : 0
const nonnegative = value => Number.isFinite(value) && value >= 0

function projectileElement(family) {
  switch (family) {
    case 'snake':
    case 'scorpion': return 'poison'
    case 'falcon': return 'feather'
    case 'bat': return 'sonic'
    default: return null
  }
}

/**
 * Spacing preference, independent of attack readiness. In approach mode the
 * caller should retreat below preferredMin, approach above preferredMax and
 * hold/reposition inside the band, including while the attack is cooling down.
 * Melee callers use the selected attack's reach instead of this distance band.
 */
export function enemyCombatStyle(enemy) {
  const ranged = projectileElement(enemy?.family) !== null
    || enemy?.family === 'spider' && roleIndex(enemy.role) > 0
  return { ranged, preferredMin: ranged ? 180 : 0, preferredMax: ranged ? 300 : 0 }
}

/**
 * Returns a fresh legacy-compatible attack spec or null, without changing enemy
 * or cooldowns. Distance is center-to-center; time/cooldowns are simulation
 * seconds, with cooldowns[kind] holding the absolute next eligible time.
 * Callers write time + spec.cooldown at the end of recovery, never at selection.
 * `element` labels a direct projectile; poison does not imply damage over time.
 */
export function enemyAttackSpec(enemy, distance, time, cooldowns = {}) {
  if (!enemy || !nonnegative(enemy.radius) || !nonnegative(enemy.damage)
    || !nonnegative(distance) || !nonnegative(time)
    || !cooldowns || typeof cooldowns !== 'object' || Array.isArray(cooldowns)) return null

  const ready = kind => {
    const at = Object.prototype.hasOwnProperty.call(cooldowns, kind) ? cooldowns[kind] : 0
    return nonnegative(at) && time >= at
  }
  const role = roleIndex(enemy.role)
  const baseRange = enemy.radius + 54
  const base = { kind: 'bite', damageType: 'physical', shape: 'sector', windup: [.65, .75, .85][role],
    active: .12, recovery: .6, cooldown: [1.2, 1.8, 2][role],
    range: baseRange, radius: baseRange, width: 0, angle: 100,
    damage: enemy.damage, lock: .15, speed: 0, cost: role === 0 ? 1 : 2, segments: 1 }

  if (['boar', 'rhino'].includes(enemy.family) && distance >= 130 && distance <= 270 && ready('charge')) {
    return { ...base, kind: 'charge', shape: 'capsule',
      windup: [.85, .95, 1.05][role], active: .6, recovery: [.85, 1, 1.15][role],
      cooldown: [5, 4.5, 4][role], range: 270, radius: enemy.radius,
      width: enemy.radius * 2, angle: 0, lock: [.2, .2, .25][role], speed: 460 }
  }

  const element = projectileElement(enemy.family)
  if (element !== null) {
    if (distance > 480 || !ready('shot')) return null
    // Close shots remain possible if spacing movement is blocked by a wall.
    return { ...base, kind: 'shot', shape: 'capsule', element, damageType: element === 'feather' ? 'physical' : 'magic',
      windup: [.85, .95, 1.05][role], active: .1, recovery: [.7, .8, .9][role],
      cooldown: [2.8, 2.6, 2.8][role], range: 480, radius: 12, width: 24,
      angle: 0, speed: 270 }
  }

  if (enemy.family === 'spider' && role > 0) {
    if (distance > 480 || !ready('web')) return null
    return { ...base, kind: 'web', damageType: 'magic', shape: 'circle',
      windup: role === 1 ? .9 : 1.05, active: .1, recovery: role === 1 ? .8 : .9,
      cooldown: role === 1 ? 3.2 : 3.6, range: 480, radius: role === 1 ? 90 : 110,
      angle: 0 }
  }

  let spec = base
  if (enemy.family === 'wolf') {
    const range = enemy.radius + [82, 94, 108][role]
    spec = { ...base, range, radius: range, angle: [110, 120, 130][role],
      windup: [.7, .8, .9][role], active: .16, recovery: [.65, .75, .85][role],
      cooldown: [1.2, 1.6, 2][role] }
  } else if (['bear', 'tiger', 'crocodile', 'croc', 'ape', 'rhino', 'yak'].includes(enemy.family)) {
    const circle = ['bear', 'ape', 'yak'].includes(enemy.family)
    const range = enemy.radius + [95, 108, 122][role]
    const angle = circle ? 0 : enemy.family === 'tiger' ? [140, 155, 170][role] : [160, 175, 190][role]
    spec = { ...base, kind: circle ? 'slam' : 'sweep', shape: circle ? 'circle' : 'sector',
      range, radius: range, angle, active: .18,
      windup: (enemy.family === 'ape' ? [1.05, 1.15, 1.25] : [1, 1.1, 1.2])[role],
      recovery: [.9, 1, 1.1][role], cooldown: [1.8, 2.2, 2.6][role] }
  } else if (enemy.family === 'centipede') {
    const range = enemy.radius + [78, 90, 104][role]
    spec = { ...base, kind: 'sweep', range, radius: range, angle: [130, 145, 160][role],
      windup: [.8, .9, 1][role], active: .18, recovery: [.75, .85, .95][role],
      cooldown: [1.6, 2, 2.4][role] }
  }
  // Gate only after the final family/role geometry exists. Returning null for
  // a cooling boar's out-of-reach bite lets its caller keep approaching.
  return distance <= spec.range + PLAYER_RADIUS && ready(spec.kind) ? spec : null
}
