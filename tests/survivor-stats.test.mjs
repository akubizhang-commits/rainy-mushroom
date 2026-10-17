import test from 'node:test'
import assert from 'node:assert/strict'

import {
  computeStats,
  actualDamage,
  actualCooldown,
  enemyHp,
  enemyContactDamage,
  COOLDOWN_FLOOR,
  passiveTerms,
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

test('might = (1 + 局外晨光之力) × (1 + 晨光菌丝): Lv1 +10%, Lv5 +50%', () => {
  const lv1 = computeStats(PLAYER, { might: 0.2 }, { might: 1 })
  assert.ok(Math.abs(lv1.might - 1.2 * 1.1) < 1e-9)
  const lv5 = computeStats(PLAYER, { might: 0.2 }, { might: 5 })
  assert.ok(Math.abs(lv5.might - 1.2 * 1.5) < 1e-9)
})

test('移动速度 = 160 × (1 + 局外轻灵蕨步) × (1 + 蕨叶轻靴): Lv1 +8%, Lv5 +40%', () => {
  const lv1 = computeStats(PLAYER, { moveSpeed: 0.1 }, { speed: 1 })
  assert.ok(Math.abs(lv1.moveSpeed - 160 * 1.1 * 1.08) < 1e-9)
  const lv5 = computeStats(PLAYER, { moveSpeed: 0.1 }, { speed: 5 })
  assert.ok(Math.abs(lv5.moveSpeed - 160 * 1.1 * 1.4) < 1e-9)
})

test('拾取半径 = 60 × (1 + 局外孢子亲和)（孢子罗盘 S2 未做，项为 0）', () => {
  const s = computeStats(PLAYER, { pickup: 0.25 }, { magnet: 3 })
  assert.ok(Math.abs(s.pickupRadius - 60 * 1.25) < 1e-9)
})

test('实际冷却 = base × max(0.5, 1 − 湿润苔衣): Lv1 0.92, Lv5 0.6, never below 0.5', () => {
  assert.ok(Math.abs(computeStats(PLAYER, null, { cooldown: 1 }).cooldownMul - 0.92) < 1e-9)
  assert.ok(Math.abs(computeStats(PLAYER, null, { cooldown: 5 }).cooldownMul - 0.6) < 1e-9)
  // Levels above max clamp to Lv5; with any 局外 bonus the floor still holds.
  const over = computeStats(PLAYER, { might: 1, moveSpeed: 1, pickup: 1, regen: 1 }, { cooldown: 99 })
  assert.ok(Math.abs(over.cooldownMul - 0.6) < 1e-9)
  for (let lv = 0; lv <= 5; lv += 1) {
    assert.ok(computeStats(PLAYER, { might: 0.25 }, { cooldown: lv }).cooldownMul >= COOLDOWN_FLOOR)
  }
  assert.equal(actualCooldown(1.0, 0.5), 0.5)
  assert.equal(actualCooldown(0.8, 0.7), 0.8 * 0.7)
})

test('实际范围 = base × (1 + 宽檐菌帽): Lv1 1.1, Lv5 1.5', () => {
  assert.ok(Math.abs(computeStats(PLAYER, null, { area: 1 }).areaMul - 1.1) < 1e-9)
  assert.ok(Math.abs(computeStats(PLAYER, null, { area: 5 }).areaMul - 1.5) < 1e-9)
})

test('生命回复/秒 = 局外露水祝福（露水叶片 S2 未做，项为 0）', () => {
  assert.ok(Math.abs(computeStats(PLAYER, { regen: 0.2 }, { regen: 5 }).regenPerSec - 0.2) < 1e-9)
})

test('passiveTerms sums every passive at its level and ignores unknown/invalid entries', () => {
  const t = passiveTerms({ might: 2, cooldown: 3, area: 4, speed: 5, raindrop: 3, magnet: 2 })
  assert.ok(Math.abs(t.might - 0.2) < 1e-9)
  assert.ok(Math.abs(t.cooldown - 0.24) < 1e-9)
  assert.ok(Math.abs(t.area - 0.4) < 1e-9)
  assert.ok(Math.abs(t.moveSpeed - 0.4) < 1e-9)
  assert.equal(t.pickup, 0)
  assert.equal(t.regen, 0)
  const z = passiveTerms({ might: 0, area: -3, speed: NaN })
  assert.deepEqual(z, { might: 0, cooldown: 0, area: 0, moveSpeed: 0, pickup: 0, regen: 0 })
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
