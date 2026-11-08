import { FORGING_RECIPES, dismantleStoneRefund } from './TowerForging.js'
import { equipmentSourceLabel } from './TowerEquipmentSources.js'
import { campaignMaxHp } from './TowerCampaign.js'
import { ALCHEMY_MATERIALS, ALCHEMY_RECIPES } from './TowerAlchemy.js'
import { cultivationPillAllowance, cultivationPillHint, cultivationPillUseHint, cultivationUseQuote, CULTIVATION_PILL_UNLOCK_HINT } from './TowerPills.js'
import { EQUIPMENT_TIERS, canUseEquipment, equipmentRequirement, isStarterEquipment } from './TowerEquipmentTiers.js'
// Pure backpack queries. Commands are quotes only; Campaign revalidates and
// commits them atomically against the live save.
import { weaponName, weaponSummary } from './TowerWeapons.js'
import { equipmentName, equipmentSummary } from './TowerEquipment.js'
import { CAMP_PILLS, breakthroughDescription, cultivationAt, TOWER_RESOURCE_CAP } from './TowerProfile.js'
import { STONE_CAP } from './TowerEconomy.js'
import { EQUIPMENT_CAPACITY } from './TowerCrafting.js'

export const INVENTORY_CATEGORIES = ['all', 'equipment', 'pill', 'material']
const tierOrder = Object.fromEntries(EQUIPMENT_TIERS.map(t => [t.id, t.order]))
const copy = value => JSON.parse(JSON.stringify(value))
const blocked = (state, operation) => state.readOnly ? '档案只读，暂不能操作'
  : state.activeRun && !(['equip','unequip'].includes(operation) && state.activeRun.snapshot?.phase === 'paused') ? '战斗中仅可换装，其他操作请先回宗' : ''
export function inventoryUsage(state, id, category) {
  return (state.loadouts || []).flatMap((row, index) => row[`${category}Id`] === id
    ? [{ index, name: row.name || `配装${index + 1}` }] : [])
}
export function inventoryEntries(state, filters = {}) {
  const rows = [
    ...Object.values(state.weapons || {}).map(item => ({ item, category: 'weapon' })),
    ...Object.values(state.equipment || {}).map(item => ({ item, category: item.category })),
  ].map(({ item, category }) => ({
    id: item.id, category, item, name: category === 'weapon' ? weaponName(item) : equipmentName(item),
    shortName: (category === 'weapon' ? weaponName(item) : equipmentName(item)).split('·').at(-1),
    tier: item.tier, quality: item.quality,
    count: 1, usedBy: inventoryUsage(state, item.id, category),
    equipped: state.loadouts?.[state.selectedLoadout]?.[`${category}Id`] === item.id,
    isNew: state.inventoryMeta?.[item.id]?.seen === false,
    order: state.inventoryMeta?.[item.id]?.order ?? Number(item.id.match(/\d+$/)?.[0] || 0),
  }))
  for (const [id, pill] of Object.entries(CAMP_PILLS)) if (state.pills?.[id] > 0) {
    rows.push({ id, category: pill.material ? 'material' : 'pill', name: pill.name, shortName: pill.name, item: pill,
      count: state.pills[id], tier: 'basic', quality: 0, usedBy: [],
      equipped: false, isNew: false, order: -1 })
  }
  return rows.filter(row => (!filters.category || filters.category === 'all' || row.category === filters.category
    || (filters.category === 'equipment' && ['weapon', 'armor', 'ring'].includes(row.category)))
    && (!filters.materialType || row.category !== 'material' || (row.item.craftingType === 'forge' ? 'forge' : 'alchemy') === filters.materialType)
    && (!filters.tier || filters.tier === 'all' || row.tier === filters.tier)
    && (!filters.quality || filters.quality === 'all' || row.quality === Number(filters.quality))
    && (!filters.status || filters.status === 'all' || (filters.status === 'equipped' ? row.equipped : row.usedBy.length > 0)))
    .sort((a, b) => (filters.sort === 'name' ? a.name.localeCompare(b.name, 'zh-CN')
      : filters.sort === 'quality' ? ((tierOrder[b.tier] ?? -1) - (tierOrder[a.tier] ?? -1) || b.quality - a.quality) : 0)
      || b.order - a.order || a.id.localeCompare(b.id))
}
export function inventoryCapacity(state) {
  return { used: Object.keys(state.weapons || {}).length + Object.keys(state.equipment || {}).length,
    max: EQUIPMENT_CAPACITY }
}
export function inventoryQuote(state, id, operation) {
  const row = inventoryEntries(state).find(row => row.id === id)
  const fail = reason => ({ ok: false, reason })
  if (!row) return fail('物品已不在背包')
  if (blocked(state, operation)) return fail(blocked(state, operation))
  const { item, category } = row, weapon = category === 'weapon'
  if (operation === 'use') {
    if (category !== 'pill' && !item.successChance) return fail(item.craftingType==='forge'?'炼器材料不可直接服用':'炼丹材料不可直接服用')
    const c = cultivationAt(state.xp)
    if (item.restoreSpirit) return fail('塔内灵力不足时自动服用，回宗后灵力回满')
    if (item.healShare && state.hp >= campaignMaxHp(state)) return fail('气血已满，不消耗丹药')
    if (item.successChance && state.xp !== item.gate) return fail(`需${item.from}十层满修为，当前境界不符时不消耗`)
    if (item.xp && c.breakthroughReady) return fail(c.realm === '炼气' ? '炼气大圆满，需服用筑基丹突破' : '筑基大圆满，需服用结丹丹药或赤鳞金髓')
    if (item.xp && c.capped) return fail('修为已封顶，不消耗丹药')
    if (item.xp) {
      const quote = cultivationUseQuote(state, id)
      if (!quote.ok && quote.reason !== 'cultivation-overflow-confirmation') return fail(quote.reason === 'cultivation-floor-locked' ? CULTIVATION_PILL_UNLOCK_HINT : quote.reason === 'wrong-realm' ? `仅限${item.realm}服用` : '本境修为丹额度已用尽或修为已满')
      if (!quote.ok) return { ok: true, confirmation: `实际获得${quote.gained}修为，浪费${quote.wasted}修为，仍占本境1颗额度。确认服用？`, action: { type: 'usePill', id, confirmed: true } }
    }
    return { ok: true, action: { type: 'usePill', id } }
  }
  if (operation === 'sell' && item.material) {
    return { ok: true, refund: item.sellPrice, action: { type: 'sellMaterial', id, count: 1 } }
  }
  if (['pill', 'material'].includes(category)) return fail('此物品不可执行装备操作')
  if (operation === 'unequip') {
    if (!row.equipped) return fail('此物品未穿戴')
    return { ok: true, action: { type: 'setLoadout', index: state.selectedLoadout,
      loadout: { ...copy(state.loadouts[state.selectedLoadout]), [`${category}Id`]: '' } } }
  }
  if (operation === 'equip') {
    if (row.equipped) return fail('当前配装已装备')
    if (!canUseEquipment(item, cultivationAt(state.xp).level)) return fail(`需${equipmentRequirement(item)}装备`)
    return { ok: true, action: weapon
      ? { type: 'setLoadout', index: state.selectedLoadout,
        loadout: { ...copy(state.loadouts[state.selectedLoadout]), weaponId: id } }
      : { type: 'equipEquipment', category, id } }
  }
  if (operation === 'dismantle') {
    if (isStarterEquipment(item)) return fail('基础赠送装备不可分解')
    if (row.usedBy.length) return fail(`${row.usedBy.map(u => u.name).join('、')}正在使用`)
    const refund = dismantleStoneRefund(item)
    if (state.spiritStones > STONE_CAP - refund) return fail('灵石已达存储上限')
    return { ok: true, refund, action: { type: weapon ? 'dismantleWeapon' : 'dismantleEquipment', id } }
  }
  return fail('不支持的操作')
}
export function inventoryDescription(state, row) {
  if (row.category === 'material') {
    if (row.item.craftingType === 'forge') return ['炼器材料', row.item.description]
    const material = ALCHEMY_MATERIALS[row.id] || row.item
    const recipes = row.item.craftingType === 'forge' ? Array.from(new Set(FORGING_RECIPES.filter(recipe=>recipe.ingredients.some(i=>i.id===row.id)).map(r=>r.name))) : Object.values(ALCHEMY_RECIPES).filter(recipe => recipe.ingredients.some(i => i.id === row.id)).map(recipe => CAMP_PILLS[recipe.outputId].name)
    return [`${row.item.successChance ? breakthroughDescription(row.item) + '；也可用于炼丹或出售。' : row.item.craftingType === 'forge' ? '炼器材料，不能直接服用。' : '炼丹材料，不能直接服用。'}\n用于：${recipes.join('、')}\n来源：${material.source}\n售价：${row.item.sellPrice}下品灵石／份`, row.item.description]
  }
  if (row.category === 'pill') {
    const pill = row.item
    return [pill.restoreSpirit ? `${pill.description}回宗后灵力值立即回满，无需手动服药。` : pill.successChance ? breakthroughDescription(pill) : pill.healShare
      ? `只能在非战斗状态使用该道具，恢复最大气血值的${pill.healShare * 100}%，不超过气血上限。每次使用一颗。`
      : `只能在非战斗状态使用该道具，增加${pill.xp}修为。仅限${pill.realm}服用，不可跨瓶颈。每次使用一颗。\n${cultivationPillHint(state,row.id)}\n${cultivationPillUseHint(state,row.id)}`, pill.description]
  }
  const detail = inventoryDetail(state, row)
  return [`${equipmentSourceLabel(row.item.definitionId)} · 穿戴要求：${detail.requirement}`, '', '装备属性', ...detail.basic,
    ...(detail.effects.length ? ['', '效果', ...detail.effects] : []), '', detail.description]
}

/** Presentation only: realm eligibility is independent of locks, combat or read-only state. */
export function inventoryDetail(state, row) {
  const weapon = row.category === 'weapon'
  const summary = weapon ? weaponSummary(row.item) : equipmentSummary(row.item)
  const basic = [...summary.baseLines], effects = [...summary.ordinaryLines,...summary.specialLines]
  return {
    name: row.shortName || summary.name.split('·').at(-1),
    rank: row.tier === 'fan' ? summary.tierName : `${summary.tierName}·${summary.qualityName}`,
    requirement: equipmentRequirement(row.item),
    requirementMet: canUseEquipment(row.item, cultivationAt(state.xp).level),
    basic, effects, ordinaryEffects:[...summary.ordinaryLines],specialEffects:[...summary.specialLines],
    description: summary.description,
  }
}
