// Economy v2. Wallet amounts are integer lower-grade spirit stones.
// Combat's validated v1 `cores` receipts remain opaque reward units solely for
// replay/save compatibility; they are not demon cores or a spendable wallet.
import { CORE_RANK_VALUES } from './TowerLoot.js'

export const STONE_DRAW_COST = 100
export const STONE_STARTER = 500
export const STONE_CAP = 20_000_000_000
export const STONE_VALUES = Object.freeze([1, 100, 10_000, 1_000_000])
export const STONE_NAMES = Object.freeze(['下品', '中品', '上品', '极品'])

// Point vouchers are finite campaign rewards, never repeatable combat income.
export const DIANJUAN_DRAW_COST = 100
export const DIANJUAN_STARTER = 10 * DIANJUAN_DRAW_COST
// 2026-11-06: 点眷合并为第1/4/7层首通各2000。第1层对应炼气起步，第4、7层首通时
// 角色正好突破到筑基、金丹，可立即抽新阶装备。总额仍为6000。
export const DIANJUAN_CAMPAIGN_TOTAL = 6000
// 2026-11-06: 首通炼器材料。第2/5/8层在器心之外补齐一把上品武器所需的关键材料；
// 第3/6/9层（大境界最后一层）先发下一阶的器心与部分玄铁，提前为极品攒料。
// 估算见 scripts/audit-first-clear-forge-packs.mjs。
const pack = rows => Object.freeze(rows.map(([id, count]) => Object.freeze({ id: 'forge_' + id, count })))
export const FIRST_CLEAR_MATERIALS = Object.freeze({
  2: pack([['core_fa', 1], ['hanjingsha', 14], ['xuantie', 14], ['lingmu', 6], ['lingyu', 6]]),
  3: pack([['ninglingjing', 2], ['xuantie', 20]]),
  5: pack([['core_bao', 1], ['chitongjing', 12], ['xuantie', 20], ['lingmu', 16], ['lingyu', 16]]),
  6: pack([['ninglingjing', 2], ['xuantie', 30]]),
  8: pack([['core_ling', 1], ['xuantie', 26], ['lingmu', 20], ['lingyu', 20]]),
  9: pack([['ninglingjing', 2], ['zijingsui', 10], ['xuantie', 32], ['lingmu', 16], ['lingyu', 16]]),
})
export const FIRST_CLEAR_REWARDS = Object.freeze([
  { kind: 'contribution', name: '点眷', quantity: 2000, amount: 2000 },
  { kind: 'spiritStones', name: '下品灵石', quantity: 100, amount: 100, grade: 0 },
  // 2026-11-06：第3/6/9层是每个大境界的最后一层，主奖励是下一阶极品装备的器心：
  // 第3层赤曜器心（宝器极品）、第6层紫宸器心（灵器极品需2枚，与第8层合成一对）、
  // 第9层再给紫宸器心，供第二件灵器极品。不发成品丹药。
  { kind: 'item', id: 'forge_core_bao', name: '赤曜器心', quantity: 1, amount: 1 },
  { kind: 'contribution', name: '点眷', quantity: 2000, amount: 2000 },
  { kind: 'spiritStones', name: '中品灵石', quantity: 3, amount: 300, grade: 1 },
  { kind: 'item', id: 'forge_core_ling', name: '紫宸器心', quantity: 1, amount: 1 },
  { kind: 'contribution', name: '点眷', quantity: 2000, amount: 2000 },
  { kind: 'spiritStones', name: '中品灵石', quantity: 4, amount: 400, grade: 1 },
  { kind: 'item', id: 'forge_core_ling', name: '紫宸器心', quantity: 1, amount: 1 },
].map(Object.freeze))

const uint = value => {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError('Invalid spirit stone amount')
  return value
}
export function legacyRewardToStones(units) {
  return uint(uint(units) * 10)
}
export function splitSpiritStones(amount) {
  let remaining = uint(amount)
  const counts = [0, 0, 0, 0]
  for (let i = 3; i >= 0; i--) {
    counts[i] = Math.floor(remaining / STONE_VALUES[i])
    remaining %= STONE_VALUES[i]
  }
  return counts
}
export function formatSpiritStones(amount) {
  const counts = splitSpiritStones(amount)
  return [3, 2, 1, 0].filter(i => counts[i]).map(i => `${counts[i]}${STONE_NAMES[i]}`).join(' ') || '0下品'
}
export function stoneLootFromLegacy(loot) {
  if (!loot) return null
  const byGrade = [0, 0, 0, 0]
  // Denominate each receipt independently: the summary describes the dropped
  // bundles, while the wallet may subsequently consolidate/change denominations.
  loot.byRank.forEach((count, index) => {
    const unit = splitSpiritStones(legacyRewardToStones(CORE_RANK_VALUES[index + 1]))
    unit.forEach((value, grade) => { byGrade[grade] += value * uint(count) })
  })
  return { byGrade, count: byGrade.reduce((a, b) => a + b, 0),
    value: byGrade.reduce((a, b, i) => a + b * STONE_VALUES[i], 0) }
}
export function spiritStoneLootSummary(snapshot) {
  if (!snapshot?.loot) return null
  const byRank = Array(7).fill(0)
  for (const kill of snapshot.killLedger) if (kill.coreRank > 0) byRank[kill.coreRank - 1]++
  return stoneLootFromLegacy({ byRank })
}
// Base cultivation weight, independent of the random spirit-stone roll.
// Authored tower units use TowerCultivationRewards to apply the floor budget.
export function demonEssenceXp(rank, role) {
  const quantity = { normal: 1, elite: 5, boss: 10 }[role]
  if (!Number.isInteger(rank) || rank < 1 || rank > 9 || !quantity) throw new RangeError('Invalid demon essence')
  return rank * quantity
}
