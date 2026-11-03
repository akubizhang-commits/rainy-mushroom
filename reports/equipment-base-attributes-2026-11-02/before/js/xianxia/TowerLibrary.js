import { FORGING_RECIPES } from './TowerForging.js'
import { equipmentSourceLabel } from './TowerEquipmentSources.js'
import { ALCHEMY_MATERIALS, ALCHEMY_RECIPES } from './TowerAlchemy.js'
import { CULTIVATION_PILL_UNLOCK_HINT } from './TowerPills.js'
// Read-only encyclopedia for the sect/tower mode. Values come from the same
// definitions and ranges as crafting/combat; no inventory or save is consulted.
import { CAMP_PILLS, breakthroughDescription, TOWER_XP_CAP, cultivationAt } from './TowerProfile.js'
import { WEAPONS, WEAPON_BASE_ATTACK, createFixedWeapon, weaponDescription } from './TowerWeapons.js'
import { EQUIPMENT, createFixedEquipment, equipmentDescription } from './TowerEquipment.js'
import { OPEN_EQUIPMENT_TIERS, equipmentTier, equipmentTierRequirement, isStarterEquipment } from './TowerEquipmentTiers.js'

function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze)
    Object.freeze(value)
  }
  return value
}
const number = value => String(Number(value.toFixed(12)))
const range = values => values[0] === values[1] ? number(values[0]) : `${number(values[0])}～${number(values[1])}`
const tierIsOpen = definition => OPEN_EQUIPMENT_TIERS.includes(definition.tier)
const equipmentDefinitions = new Map([...WEAPONS, ...EQUIPMENT].filter(tierIsOpen).map(d => [d.id, d]))

// Only accepted runtime art belongs here. Missing art leaves a text placeholder;
// it must never borrow another item's identity or hide its encyclopedia entry.
const illustrated = new Set([
  'eq_sword_iron', 'eq_sword_suwen', 'eq_sword_songfeng', 'eq_sword_shoushan',
  'eq_sword_guiyan', 'eq_sword_caiyun', 'eq_sword_panxi', 'eq_sword_liuquan',
  'eq_sword_ningshuang', 'eq_sword_xingluo', 'eq_sword_lingxi', 'eq_sword_zhaodan', 'eq_sword_dingyue', 'eq_sword_tingyu', 'eq_sword_qingxiao', 'eq_sword_liuxia', 'eq_sword_hanguang', 'eq_sword_duanliu', 'eq_sword_xuanjun', 'eq_sword_zhufeng', 'eq_sword_zhenyue', 'eq_armor_basic', 'eq_armor_qingma', 'eq_armor_chentie', 'eq_armor_bichen', 'eq_armor_yunwen', 'eq_armor_houlin', 'eq_armor_liufeng', 'eq_armor_ninglu', 'eq_armor_fushan', 'eq_armor_dangyu', 'eq_armor_shouyi', 'eq_armor_zhenyue', 'eq_armor_huilan', 'eq_armor_mingche', 'eq_armor_humai', 'eq_armor_jingbo',
  'eq_ring_basic', 'eq_ring_anxi', 'eq_ring_huyuan', 'eq_ring_dingxin',
  'eq_ring_qinglu', 'eq_ring_wenmai', 'eq_ring_wenpo', 'eq_ring_shoudan', 'eq_ring_huichun', 'eq_ring_changning', 'eq_ring_xuxi', 'eq_ring_huming', 'eq_ring_hanyuan', 'eq_ring_guizhen',
])
const affinityNames = { general: '长剑', qi: '剑气长剑', formation: '剑阵长剑' }
const categoryNames = { armor: '防具', ring: '戒指' }
export const LIBRARY_QUALITY_NAMES = freeze(['不入品', '下品', '中品', '上品', '极品'])
export const LIBRARY_VOLUMES = freeze([
  { id: 'pills', name: '丹药录', subtitle: '药性与服用' },
  { id: 'weapons', name: '兵器谱', subtitle: '锋刃与用法' },
  { id: 'equipment', name: '百器鉴', subtitle: '法衣与灵戒' },
  { id: 'materials', name: '材料录', subtitle: '灵材与用途' },
])
export const LIBRARY_ENTRIES = freeze([
  ...Object.entries(CAMP_PILLS).map(([id, pill]) => ({
    id: `pill_${id}`, volume: pill.material ? 'materials' : 'pills', chapter: pill.material ? (pill.successChance ? '突破灵材篇' : pill.craftingType === 'forge' ? '炼器材料篇' : '炼丹材料篇') : '丹药篇', name: pill.name,
    category: pill.material ? (pill.successChance ? '突破灵材' : pill.craftingType==='forge'?'炼器材料':'炼丹材料') : pill.successChance ? '突破丹药' : pill.healShare ? '疗伤丹药' : '修为丹药',
    icon: ['forge_xuantie','forge_lingmu','forge_yaopi','forge_lingsi','forge_lingyu','forge_tiejing','forge_hanjingsha','forge_chitongjing','forge_zijingsui','forge_ninglingjing','forge_core_fa','forge_core_bao','forge_core_ling'].includes(id) ? `tower-stones/pill_${id}` : ['huichuncao','bailuhua','huangjing','lingshenxu','ningluzhi','linglu','yusuizhi','zilinghua','jinsuiguo','yangyuan','zhenyuan','zifu','heqi','ningqi','xuming','zhixue','huichun','peiyuan','zhuji','ningyuan','ningdan','jiuzhuan','xiaoyue','chilin'].includes(id) ? `tower-stones/pill_${id}` : '', description: pill.description, qualities: [0],
  })),
  ...WEAPONS.filter(tierIsOpen).map(d => ({
    id: d.id, volume: 'weapons', chapter: '长剑篇', name: d.name,
    category: `${equipmentTier(d.tier).name} · ${affinityNames[d.affinity]}`,
    icon: illustrated.has(d.id) ? `tower-equipment/${d.id}` : '',
    description: `${equipmentSourceLabel(d.id)}。${d.description}`, qualities: [...d.qualities],
  })),
  ...EQUIPMENT.filter(tierIsOpen).map(d => ({
    id: d.id, volume: 'equipment', chapter: d.category === 'armor' ? '防具篇' : '戒指篇', name: d.name,
    category: `${equipmentTier(d.tier).name} · ${categoryNames[d.category]}`,
    icon: illustrated.has(d.id) ? `tower-equipment/${d.id}` : '',
    description: `${equipmentSourceLabel(d.id)}。${d.description}`, qualities: [...d.qualities],
  })),
])
const entriesById = new Map(LIBRARY_ENTRIES.map(entry => [entry.id, entry]))

/** Detached arrays of immutable entries. Query tokens match names/categories,
 * never ownership, player level, or a different game mode's item catalogue. */
export function libraryEntries(volume, query = '', chapter = '全部') {
  const tokens = typeof query === 'string' ? query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean) : []
  return LIBRARY_ENTRIES.filter(entry => entry.volume === volume
    && (chapter === '全部' || chapter === entry.chapter)
    && tokens.every(token => `${entry.name} ${entry.category} ${entry.chapter}`.toLocaleLowerCase().includes(token)))
}
export function libraryChapters(volume) {
  // Cocos' loose spread transform treats a Set as one array element.
  return Array.from(new Set(libraryEntries(volume).map(entry => entry.chapter)))
}

function materialDetails(entry) {
  const id = entry.id.slice('pill_'.length), material = ALCHEMY_MATERIALS[id]
  const forgeRecipes = FORGING_RECIPES.filter(r => r.ingredients.some(i => i.id === id))
  const alchemyRecipes = Object.values(ALCHEMY_RECIPES).filter(r => r.ingredients.some(i => i.id === id))
  const uses = []
  // Group the same ingredient cost across equipment categories to keep the book readable.
  const forgeGroups = new Map()
  for (const recipe of forgeRecipes) {
    const count = recipe.ingredients.find(i => i.id === id).count
    const key = `${recipe.tier}:${recipe.quality}:${count}`
    if (!forgeGroups.has(key)) forgeGroups.set(key, { recipe, count, categories: [] })
    forgeGroups.get(key).categories.push({ weapon: '兵器', armor: '法衣', ring: '灵戒' }[recipe.category])
  }
  for (const { recipe, count, categories } of forgeGroups.values()) {
    uses.push(`${equipmentTier(recipe.tier).name}·${LIBRARY_QUALITY_NAMES[recipe.quality]}${categories.join('／')}：每次炼制需${count}份。`)
  }
  for (const recipe of alchemyRecipes) {
    uses.push(`${CAMP_PILLS[recipe.outputId].name}：每炉需${recipe.ingredients.find(i => i.id === id).count}份。`)
  }
  return {
    summary: material.successChance ? `${material.from}突破${material.target}，也可留作炼丹。`
      : forgeRecipes.length ? '炼器峰配方材料。' : alchemyRecipes.length ? '丹霞峰配方材料。' : '战利品，可出售换取灵石。',
    requirement: '材料可堆叠，不占装备格',
    effects: [material.successChance ? breakthroughDescription(material)
      : forgeRecipes.length ? '用于炼制兵器、法衣或灵戒，适用配方见下方。'
      : alchemyRecipes.length ? '用于炼制丹药，适用配方见下方。' : '当前没有炼制配方，可在背包出售。'],
    conditions: [material.successChance ? '仅在宗门、对应境界十层满修为时服用，每次消耗1份；失败保留修为，境界不符不消耗。'
      : uses.length ? '不能直接服用；前往对应山峰，集齐配方材料并支付炼制费用后使用。' : '无需境界条件，可自行选择保留或出售。'],
    tips: [...uses, `背包主动出售：${material.sellPrice}下品灵石／份。`],
    source: material.source,
    note: material.successChance ? '可用于直接突破或炼丹，请按需要保留。' : uses.length ? '此处列出本材料用量；完整配方与炼费请查看对应山峰。' : '铁精作为首层战利品保留，凡器从炼器峰购买。',
  }
}

function pillDetails(entry) {
  const id = entry.id.slice('pill_'.length), pill = CAMP_PILLS[id]
  const recipe = ALCHEMY_RECIPES[id]
  const recipeText = recipe ? `配方：${recipe.ingredients.map(i => `${CAMP_PILLS[i.id].name}×${i.count}`).join('＋')}；炼费${recipe.contributionCost}贡献／炉，确定产出1颗。` : ''

  if (pill.successChance) return {
    summary: `${pill.from}突破${pill.target}。`, requirement: `境界要求：${pill.from}十层满修为`,
    effects: [breakthroughDescription(pill)],
    conditions: ['仅在宗门服用，每次消耗1份。失败保留满修为，境界不符不消耗。'],
    tips: ['达到大圆满后，成功突破才能继续积累修为。', recipeText],
    source: pill.material ? `第${pill.floor}层${pill.boss} · 掉落率35% · 可售${pill.sellPrice}下品灵石` : pill.purchasable ? `丹霞峰 · 购买或炼制 · ${number(pill.price)}贡献／颗` : '丹霞峰炼制／机缘抽奖（按境界与库存）', note: '在背包中服用。',

  }
  const healing = !!pill.healShare
  return {
    summary: healing ? '恢复气血，适合再次挑战前补充气血。' : '温养根基，补充修为。',
    requirement: healing ? '境界要求：无' : `${CULTIVATION_PILL_UNLOCK_HINT}；仅限${pill.realm}服用；每境两种修为丹共享6颗`,
    effects: [healing ? `恢复最大气血值的${number(pill.healShare * 100)}%` : `增加${number(pill.xp)}修为`],
    conditions: ['仅在宗门使用，塔内不可服用；每次消耗1颗。',
      healing ? '满血时不可服用且不消耗；恢复后的气血不超过上限。'
        : `修为上限为${cultivationAt(TOWER_XP_CAP).realm}圆满（${number(TOWER_XP_CAP)}修为）。封顶不可服用且不消耗；临近本境瓶颈将事先确认实际收益与浪费，不跨瓶颈。`],
    tips: [healing ? '丹药按最大气血计算恢复量，先查看缺失气血，再决定服用时机。'
      : '每境共享6颗，服用才扣额度，旧境额度不结转；库存超额买炼需确认。', recipeText],
    source: pill.purchasable ? `丹霞峰 · 购买或炼制 · ${number(pill.price)}贡献／颗` : '丹霞峰炼制／机缘抽奖（按境界与库存）',
    note: '丹药录收录当前宗门可用的丹药，服用操作在背包中进行。',
  }
}

function initialDetails(d, entry) {
  return {
    summary: entry.volume === 'weapons' ? '初入宗门时的基础长剑。' : '初入宗门时的基础装备。',
    requirement: '境界要求：无',
    effects: entry.volume === 'weapons' ? weaponDescription(createFixedWeapon(d.id, 'iron'))
      : equipmentDescription(createFixedEquipment(d.id, `basic-${d.category}`)),
    conditions: ['穿戴在对应装备位后生效。'],
    tips: ['可用作比较新装备收益的起点。'],
    source: '初始配装',
    note: '初始装备属性固定。',
  }
}

const roleNames = {transition:'凡器过渡',general:'全功法通用',qi:'剑气专精',formation:'剑阵专精',
  guard:'稳固',recovery:'续航',burst:'暴击',cadence:'回转',graduate:'全向毕业',master:'全向大毕业'}
function fixedDetails(d, common) {
  const weapon = d.category === 'weapon'
  const item = weapon ? createFixedWeapon(d.id,'library-readonly') : createFixedEquipment(d.id,'library-readonly')
  return {...common, summary:`${roleNames[d.role]}，同名装备属性固定。`,
    effects:weapon ? weaponDescription(item) : equipmentDescription(item),
    conditions:['穿戴后生效；相同名称的不同实例属性完全相同。'],
    tips:weapon ? ['武器物理与法术攻击每次施放取值，多段共享；混合功法各取50%，普攻只用物理攻击。',
      '普攻与施法互斥，等待不重置普攻。',
      '攻速只影响普攻。附加伤害按每次普攻或功法的结算伤害（含暴击）追加，不重复判定暴击或触发。',
      '元素强化从宝器开放，仅增加对应元素伤害；进化继承母功法元素。']
      : [d.category === 'armor' ? '换装增加气血上限不会立即回复气血；每3秒恢复一次，回复量以当前气血上限计算。' : '回转不缩短前摇、命中窗口或持续伤害每跳间隔。'],
    source:`炼器峰 · ${equipmentSourceLabel(d.id)}`}
}

/** Invalid IDs return null. Unsupported quality falls back to the item's first
 * allowed quality; immutable results cannot mutate the source catalogue. */
export function libraryDetails(id, quality) {
  const entry = entriesById.get(id)
  if (!entry) return null
  if (entry.volume === 'materials') return freeze(materialDetails(entry))
  if (entry.volume === 'pills') return freeze(pillDetails(entry))
  const d = equipmentDefinitions.get(id)
  const selected = d.qualities.includes(quality) ? quality : d.qualities[0]
  if (isStarterEquipment({ definitionId: id, quality: selected })) return freeze(initialDetails(d, entry))
  const common = {
    requirement: `境界要求：${equipmentTierRequirement(d.tier)}`,
    note: '这里展示此装备唯一品质的固定属性；炼制仅随机产物名称。',
  }
  return freeze(fixedDetails(d, common))
}
