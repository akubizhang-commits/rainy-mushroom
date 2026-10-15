import test from 'node:test'
import assert from 'node:assert/strict'

import {
  computeStats,
  actualDamage,
  actualCooldown,
  enemyHp,
  enemyContactDamage,
  COOLDOWN_FLOOR,
} from '../js/survivor/Stats.js'
import { PLAYER } from '../js/survivor/data/player.js'

test('base stats with no bonuses/passives match the player data (01 §15.1)', () => {
  const s = computeStats(PLAYER, null, null)
  assert.equal(s.might, 1)
  assert.equal(s.cooldownMul, 1)
  assert.equal(s.areaMul, 1)
  assert.equal(s.moveSpeed, 160)
  assert.equal(s.pickupRadius, 60)
  assert.equal(s.regenPerSec, 0)
  assert.equal(s.maxHp, 100)
})

test('might = (1 + 局外晨光之力) × (1 + 晨光菌丝)', () => {
  const s = computeStats(PLAYER, { might: 0.2 }, { might: 0.1 })
  assert.ok(Math.abs(s.might - 1.2 * 1.1) < 1e-9)
})

test('移动速度 = 160 × (1 + 局外轻灵蕨步) × (1 + 蕨叶轻靴)', () => {
  const s = computeStats(PLAYER, { moveSpeed: 0.1 }, { moveSpeed: 0.05 })
  assert.ok(Math.abs(s.moveSpeed - 160 * 1.1 * 1.05) < 1e-9)
})

test('拾取半径 = 60 × (1 + 局外孢子亲和) × (1 + 孢子罗盘)', () => {
  const s = computeStats(PLAYER, { pickup: 0.25 }, { pickup: 0.5 })
  assert.ok(Math.abs(s.pickupRadius - 60 * 1.25 * 1.5) < 1e-9)
})

test('cooldown multiplier honours the 0.5 floor (实际冷却 = base × max(0.5, 1 − 湿润苔衣))', () => {
  // Within range.
  assert.equal(computeStats(PLAYER, null, { cooldown: 0.3 }).cooldownMul, 0.7)
  // Exceeds the floor: clamps to 0.5.
  assert.equal(computeStats(PLAYER, null, { cooldown: 0.9 }).cooldownMul, COOLDOWN_FLOOR)
  // actualCooldown applies the multiplier.
  assert.equal(actualCooldown(1.0, 0.5), 0.5)
  assert.equal(actualCooldown(0.8, 0.7), 0.8 * 0.7)
})

test('实际范围 = base × (1 + 宽檐菌帽)', () => {
  assert.equal(computeStats(PLAYER, null, { area: 0.4 }).areaMul, 1.4)
})

test('生命回复/秒 = 局外露水祝福 + 露水叶片', () => {
  assert.ok(Math.abs(computeStats(PLAYER, { regen: 0.2 }, { regen: 0.5 }).regenPerSec - 0.7) < 1e-9)
})

test('actualDamage rounds and floors at 1 (实际伤害 = round(武器伤害 × might)，最小 1)', () => {
  assert.equal(actualDamage(10, 1), 10)
  assert.equal(actualDamage(10, 1.3), 13)
  assert.equal(actualDamage(10, 1.24), 12) // round
  assert.equal(actualDamage(10, 1.25), 13)
  assert.equal(actualDamage(0.4, 1), 1) // floors at 1
  assert.equal(actualDamage(0, 2), 1)
})

test('enemy hp/damage scale by minute (01 §9.1 / §15.1)', () => {
  // 敌人生命 = base × (1 + 0.15 × m); 接触伤害 = base × (1 + 0.05 × m)
  assert.ok(Math.abs(enemyHp(8, 0.15, 0) - 8) < 1e-9)
  assert.ok(Math.abs(enemyHp(8, 0.15, 6) - 8 * (1 + 0.15 * 6)) < 1e-9)
  assert.ok(Math.abs(enemyContactDamage(5, 0.05, 6) - 5 * (1 + 0.05 * 6)) < 1e-9)
})

test('non-finite bonus/passive terms default to 0 (no NaN leak)', () => {
  const s = computeStats(PLAYER, { might: NaN, moveSpeed: undefined }, { cooldown: Infinity })
  assert.equal(s.might, 1)
  assert.equal(s.moveSpeed, 160)
  // Non-finite cooldown term defaults to 0 → cooldownMul = max(0.5, 1 − 0) = 1 (no NaN).
  assert.equal(s.cooldownMul, 1)
  assert.ok(Number.isFinite(s.cooldownMul))
})
