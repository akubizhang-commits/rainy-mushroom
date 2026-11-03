import test from 'node:test'
import assert from 'node:assert/strict'
import { steerMechanics } from '../scripts/verify-monster-mechanics-balance.mjs'
import { skillForm } from '../js/xianxia/TowerSkillForms.js'
import { swordQiHits, swordQiReleaseOffset, swordQiTravelLimit } from '../js/xianxia/TowerSwordQi.js'
import { insideHex } from '../js/xianxia/TowerArena.js'
import { clearPillars, clipPillars } from '../js/xianxia/TowerObstacles.js'

// Based on a level-six floor-two fight. The wall case is moved slightly
// north for the approved narrower diagonal blade; the centre ray is clear,
// but the full crescent intersects terrain at its release point.
const positions = [
  { name: 'outer wall', player: { x: 580.2060116007764, y: 615 },
    enemy: { x: 680.925176102031, y: 548.169019948599 } },
  { name: 'pillar', player: { x: 449.59564941624046, y: -238.63825823951817 },
    enemy: { x: 316.2684507395191, y: -176.42770532687155 } },
]

function canHit(player, enemy) {
  const form = skillForm('sj_arc', 6), offset = swordQiReleaseOffset(form)
  const distance = Math.hypot(enemy.x - player.x, enemy.y - player.y)
  const dx = (enemy.x - player.x) / distance, dy = (enemy.y - player.y) / distance
  const from = { x: player.x + dx * offset, y: player.y + dy * offset }
  const range = swordQiTravelLimit(form.bladeKind, form.width, form.bladeWidth,
    from, dx, dy, 4000, 1)
  return range > 0 && swordQiHits(form.bladeKind, form.width, form.bladeWidth,
    from, { x: from.x + dx * range, y: from.y + dy * range }, dx, dy, enemy)
}

for (const fixture of positions) {
  test(`bot leaves a ${fixture.name} position where its crescent cannot hit`, () => {
    const player = { ...fixture.player, radius: 18, hp: 150, maxHp: 150, moveSpeed: 220 }
    const enemy = { ...fixture.enemy, id: 'wolf', hp: 10000, radius: 42 }
    let input
    const run = {
      state: { time: 0, arenaVersion: 1, player, enemies: [enemy],
        loadout: { active: { sj_arc: 6, sj_yujian: 2 } },
        zones: [], projectiles: [], drops: [], monsterMechanics: { zones: [] } },
      setInput(x, y) { input = { x, y } },
    }
    assert.equal(canHit(player, enemy), false)
    steerMechanics(run)
    const destination = {
      x: player.x + input.x * player.moveSpeed * .35,
      y: player.y + input.y * player.moveSpeed * .35,
    }
    assert.ok(insideHex(destination, player.radius))
    assert.ok(clearPillars(destination, player.radius))
    assert.equal(clipPillars(player, destination.x - player.x,
      destination.y - player.y, 1, player.radius), 1)
    assert.equal(canHit(destination, enemy), true, 'move to a reachable firing position')
  })
}
