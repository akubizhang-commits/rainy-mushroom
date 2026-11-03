// Growth version 1: pure tables/quotes only. Campaign owns currency, source
// receipts and transactions; Run owns casting and per-target hit ledgers.
import { SKILLS, EVOLUTIONS } from './TowerContent.js'
import { cultivationAt } from './TowerProfile.js'
import { FIRST_CLEAR_REWARDS } from './TowerEconomy.js'

function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze)
    Object.freeze(value)
  }
  return value
}

// Each skill opens rank bands relative to its own starting realm phase.
export const GROWTH_STAGES = freeze([
  { id: 'lianqi-early', realm: '炼气', phase: '初期', skillIds: ['sj_arc', 'sj_yujian', 'sj_bone'] },
  { id: 'lianqi-middle', realm: '炼气', phase: '中期', skillIds: ['vajra'] },
  { id: 'lianqi-peak', realm: '炼气', phase: '巅峰', skillIds: ['sj_heart', 'sj_cross'] },
  { id: 'zhuji-early', realm: '筑基', phase: '初期', skillIds: ['sj_line', 'sj_shadow', 'sj_formation', 'sj_flight', 'sj_spirit'] },
  { id: 'zhuji-middle', realm: '筑基', phase: '中期', skillIds: ['sj_mark'] },
  { id: 'zhuji-peak', realm: '筑基', phase: '巅峰', skillIds: ['sj_gate', 'sj_wanjian'] },
  { id: 'jindan-early', realm: '金丹', phase: '初期', skillIds: ['evo_wanjian'] },
  { id: 'jindan-middle', realm: '金丹', phase: '中期', skillIds: ['evo_tiandi', 'evo_wuwo'] },
  { id: 'jindan-peak', realm: '金丹', phase: '巅峰', skillIds: ['evo_sixiang'] },
].map((stage, index) => ({
  ...stage, label: `${stage.realm}${stage.phase}`,
  minLevel: Math.floor(index / 3) * 10 + (index % 3) * 3 + 1,
  maxLevel: Math.floor(index / 3) * 10 + (index % 3 === 2 ? 10 : (index % 3 + 1) * 3),
  minRank: index % 3 * 3 + 1, maxRank: index % 3 * 3 + 3,
})))

export function growthStageAt(xp = 0) {
  const c = cultivationAt(xp)
  const stage = GROWTH_STAGES.find(stage => c.level >= stage.minLevel && c.level <= stage.maxLevel)
  return c.consummated ? { ...stage, phase: '大圆满', label: `${c.realm}大圆满` } : stage
}

export function skillStage(id) {
  return GROWTH_STAGES.find(stage => stage.skillIds.includes(id)) || null
}

// Doc52: keep full precision; each rank compounds from the previous rank.
const damageCurve = (base, multiplier) => Array.from({ length: 10 }, (_, i) => base * multiplier ** i)
// Each skill retains its initial per-rank price through max level (2026-11-02).
const activeCosts = Array(10).fill(1)
const specialActiveCosts = Array(10).fill(2)
const passiveCosts = Array(4).fill(1)
const advancedPassiveCosts = Array(4).fill(2)
// Standalone casts do not require another skill simply because they share a flow.
const prerequisites = {}
const oldSkills = new Map(SKILLS.map(skill => [skill.id, skill]))

// Hybrid spends one attack budget equally on physical and spell damage.
// Wounds inherit their triggering hit's actual split; utility buffs deal no damage.
const damageTypes = {
  sj_yujian: 'physical', sj_arc: 'physical', sj_cross: 'physical', sj_line: 'physical', sj_shadow: 'hybrid',
  sj_wanjian: 'hybrid', sj_formation: 'hybrid',
  sj_mark: 'inherited', sj_gate: 'hybrid',
  sj_spirit: 'none', sj_heart: 'none', sj_bone: 'none', vajra: 'none', sj_flight: 'none',
}

function skill(id, effects, metadata = oldSkills.get(id)) {
  const active = metadata.kind === 'active'
  const special = metadata.clear > 0, maxLevel = metadata.maxLevel ?? (active ? 10 : 4)
  const learnLevel = metadata.learnLevel ?? skillStage(id).minLevel
  const pointCosts = metadata.pointCosts ?? (active
    ? (skillStage(id).minLevel >= 10 ? specialActiveCosts : activeCosts)
    : skillStage(id).minLevel >= 10 ? advancedPassiveCosts : passiveCosts)
  const result = {
    id, name: metadata.name, kind: metadata.kind, special, maxLevel, max_level: maxLevel,
    damageType: damageTypes[id],
    learnLevel,
    learnClear: 0,
    bookCost: special ? (active ? 200 : 100) : 0,
    pointCosts: [...pointCosts],
    prerequisites: { ...(prerequisites[id] || {}) },
    ...effects,
    rankRequirements: Array.from({ length: maxLevel }, (_, index) => {
      // Compressed ranks sample former ranks 2/4/6/8. Keep their realm bands;
      // spirit uses one rank per phase so its full utility is not front-loaded.
      const phaseOffset = active ? Math.floor(index / 3)
        : id === 'sj_spirit' ? index : Math.floor((index * 2 + 1) / 3)
      const stage = GROWTH_STAGES[GROWTH_STAGES.indexOf(skillStage(id)) + phaseOffset]
      return { characterLevel: Math.max(learnLevel, stage.minLevel), realm: stage.label }
    }),
  }
  // Flat effect fields retain TowerContent's scalar/level-array convention.
  // The row view is a convenience for UI; it is not a second damage multiplier.
  result.levels = Array.from({ length: maxLevel }, (_, i) => ({
    level: i + 1,
    ...Object.fromEntries(Object.entries(effects).map(([key, value]) =>
      [key, Array.isArray(value) ? value[i] : value])),
  }))
  return result
}

// Excludes the initial gifted rank (one refundable point).
export const GROWTH_POINT_CAP = 80
export const GROWTH_RESEARCH = freeze([
  { purchase: 1, cost: 800, learnClear: 3, points: 4 },
  { purchase: 2, cost: 1600, learnClear: 6, points: 4 },
  { purchase: 3, cost: 2400, learnClear: 9, points: 4 },
])

export const GROWTH_SKILLS = freeze([
  skill('sj_yujian', {
    damage: [1.2, 1.5, ...Array.from({ length: 8 }, (_, i) => 1.8 * 1.13 ** i)],
    // damage retains the one-second budget used by evolution balance.
    generation_interval: Array.from({ length: 10 }, (_, i) => .5 ** (i / 9)),
    sword_damage_share: Array.from({ length: 10 }, (_, i) => .5 ** (i / 9)),
    cooldown: 1, windup: .12,
    reach: [360, 360, 380, 380, 400, 420, 420, 440, 440, 460],
    swords: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    target_cap: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    single_dps_factor: 1, hit_assumption: .7,
    rule: '1级每1秒生成1把飞剑，逐级加快至10级每0.5秒；悬停上限等于等级，最多10把。按目标剩余血量及在途伤害分配飞剑，多余继续悬停；多目标轮流寻敌。每剑伤害按基础生成间隔补偿，保持各级原持续伤害预算；命中后消散，不区分主副剑，不贯穿。damage保留为每秒基础伤害预算，供进化共用。',
  }, { ...oldSkills.get('sj_yujian'), learnLevel: 2 }),
  skill('sj_arc', {
    damage: [1.5, 2.1, ...Array.from({ length: 8 }, (_, i) => 3 * 1.15 ** i)].map(value => value * .8), cooldown: 1.8, windup: .18,
    radius: [140, 140, 150, 150, 160, 170, 170, 180, 180, 190],
    reach: 640, speed: 960,
    width: [140, 140, 150, 150, 160, 170, 170, 180, 180, 190].map(radius => radius * 1.2),
    bladeWidth: 12,
    angle: 90, target_cap: 6, single_dps_factor: 1 / 1.8, hit_assumption: .45,
    rule: '1–3级一次近身月牙；4–6级一道飞射；7–10级三道连射。每发同敌最多1击，整招总量按damage分摊；飞行在地形或战场边界结束，尾光不伤人。',
  }),
  // Growth-only skill; the historical five-rank catalog remains unchanged.
  skill('sj_cross', {
    damage: [1.5, 2.1, ...Array.from({ length: 8 }, (_, i) => 3 * 1.15 ** i)].map(value => value * 1.25), cooldown: 5, windup: .18,
    radius: [180, 180, 180, 220, 220, 220, 270, 270, 270, 270],
    reach: [180, 180, 180, 220, 220, 220, 270, 270, 270, 270], speed: 960,
    width: [180, 180, 180, 180, 180, 180, 270, 270, 270, 270],
    bladeWidth: [12, 12, 12, 12, 12, 12, 18, 18, 18, 18],
    target_cap: 6, single_dps_factor: 1 / 5, hit_assumption: .45,
    rule: '以自身为中心爆发纵横剑光，1–3级半径180，4–6级220，7–10级270；最多命中6个可见目标，每次施放同敌只结算一次，后续弧光与消散不追加伤害。',
  }, { name: '剑啸八方', kind: 'active', clear: 0 }),
  skill('sj_wanjian', {
    damage: damageCurve(.30, 1.20), hit_interval: .6,
    // Seven possible hits per activation replace ten per old six-second cycle.
    cooldown: 6, duration: 4, cycle_damage_multiplier: 10 / 7,
    radius: [90, 90, 95, 95, 100, 105, 105, 110, 110, 120],
    swords: [4, 4, 5, 5, 5, 6, 6, 6, 6, 8],
    target_cap: 6, single_dps_factor: 1 / .6, hit_assumption: .6,
    rule: '发动起冷却6秒，剑环持续4秒；生效期间伤害乘10/7，以每轮最多7击补偿原6秒10击。所有环绕剑对同一目标共用0.6秒命中间隔，不乘剑数。周天剑域保留常驻与原伤害。',
  }, { ...oldSkills.get('sj_wanjian'), pointCosts: [...activeCosts] }),
  skill('sj_line', {
    damage: damageCurve(8 * 1.8, 1.10), cooldown: 6, windup: .12,
    reach: [450, 450, 490, 490, 530, 560, 560, 600, 600, 640],
    width: 28, target_cap: [3, 3, 4, 4, 4, 5, 5, 5, 5, 6],
    single_dps_factor: 1 / 6, hit_assumption: .65,
    rule: '直线单次贯穿，每目标结算damage一次；目标上限增加是覆盖收益，不加攻击频率。',
  }),
  skill('sj_shadow', {
    // Raise entry damage by one third; preserve the trained rank-ten endpoint.
    damage: damageCurve(3.52, (2.64 * 1.20 ** 9 / 3.52) ** (1 / 9)), cooldown: 2.2, windup: .12,
    reach: 360, delay: .65,
    radius: [80, 80, 90, 90, 100, 110, 110, 120, 120, 130],
    target_cap: 3, single_dps_factor: 1 / 2.2, hit_assumption: .5,
    rule: '固定落点；留印0.65秒后首斩，后续每0.08秒交错斩击，1/3/6/10级共1/2/3/4斩；每斩最多3目标。1–5级各斩平分，6级和10级保留上一级各斩伤害，新增斩承接升级增量；同段数期间各斩同比成长，总伤害预算不变。',
  }),
  skill('sj_formation', {
    damage: damageCurve(32 / 15, 1.15), cooldown: 8, windup: .12,
    reach: 360, duration: 5, hit_interval: .5, ticks: 6,
    radius: [132, 132, 144, 144, 156, 168, 168, 180, 180, 192],
    target_cap: 8, single_dps_factor: .75, hit_assumption: .55,
    rule: '生成0.5秒后首跳、5秒末跳；1–9级6跳、10级7跳，总预算为damage×6，各跳平分，双阵眼共用命中账本。',
  }),
  skill('sj_spirit', {
    cast_speed: [.10, .20, .30],
    reach_bonus: [.04, .08, .12],
    pickup_bonus: [.20, .35, .50],
    rule: '每级增加4%御剑术索敌距离，灵石、材料及治疗物的拾取半径依次增加20%/35%/50%；灵石和材料基础拾取半径100，不增加掉落数量、概率或修为。',
  }, { name: '凝神诀', kind: 'passive', clear: 0, maxLevel: 3, pointCosts: [1, 1, 1] }),
  skill('sj_heart', {
    crit_chance: [.08, .14, .20, .28],
    crit_bonus: .5,
    rule: '默认暴击倍率150%，装备暴击伤害加成直接增加倍率；直接功法伤害与普攻均适用。持续功法伤害每次独立判定暴击；继承已结算伤害的衍生伤害不重复判定。',
  }),
  skill('sj_mark', {
    conversion: [.5, .5, .5, .5],
    dot_bonus: [.20, .30, .40, .50],
    duration: 3,
    rule: '直接攻击将剩余直伤的50%转化为剑痕，再乘剑痕伤害加成；与武器流血同时生效时，先分配流血再转化剩余部分。3秒内每0.5秒扣血，第2层起每层增伤1%，最多11层（10%）。新命中合并未扣额度并刷新3秒，不独立暴击，不二次减伤，不递归。',
  }, { ...oldSkills.get('sj_mark'), name: '蚀骨剑意' }),
  skill('sj_bone', {
    damage_bonus: [.06, .12, .18, .25],
    speed_bonus: [.02, .04, .06, .08],
    rule: '伤害被动加成在装备乘积之后相加；移速另算，无冷却缩减，不乘算放大触发预算。',
  }, { ...oldSkills.get('sj_bone'), clear: 0, pointCosts: [...passiveCosts] }),
  skill('sj_gate', {
    proc_damage: [.5, .7, .9, 1.2],
    radius: [80, 90, 100, 110],
    stacks: 4, target_cap: 6, trigger_cooldown: 4, burst_delay: .42,
    rule: '直接攻击命中后触发一次四剑连刺，四柄剑自动依次内刺，0.42秒后爆裂，对目标及周围最多6个敌人各造成一次伤害。每4秒最多触发一次；持续伤害与爆裂不触发新的爆裂；爆裂本身可以暴击。',
  }, { ...oldSkills.get('sj_gate'), name: '剑罡爆裂', pointCosts: [...passiveCosts] }),
  skill('vajra', {
    reduction: [.06, .09, .12, .15],
    rule: '同类功法常驻减伤相加，上限15%；与防具减伤乘算。',
  }),
  // New growth-only utility skill: leave historical five-rank saves/catalogs intact.
  skill('sj_flight', {
    speed_bonus: [.25],
    slow_resistance: [.5],
    rule: '移速增加25%，与剑骨移速加成相加；受到的减速幅度降低50%，不缩短持续时间、不解除定身；不改变攻击、冷却或掉落。',
  }, { name: '御剑飞行', kind: 'passive', clear: 0, maxLevel: 1, pointCosts: [1] }),
])

const evolutionEffects = {
  evo_wanjian: {
    regularMultiplier: 1, rainCooldown: 8, rainTicks: 6,
    rainTickInterval: .2, rainRadius: 160, rainTargetCap: 6,
    rule: '进阶替换御剑；继承御剑术实际等级的伤害，剑雨补足目标增伤及施放期间停火损失，各段平分总预算。降低基础等级会同步降低进阶伤害。',
  },
  evo_wuwo: {
    innerMultiplier: [1.2, 1.44], hit_interval: .6,
    rule: '进阶替换周天剑阵；继承实际基础等级，外圈每窗口为基础damage×budgetMultiplier，内圈为基础damage的120%/144%；同目标0.6秒只取较高一次。',
  },
  evo_tiandi: {
    cooldown: 10, windup: .45, release_cooldown: 9.55,
    rule: '进阶替换剑破虚空；继承实际基础等级，10秒为起手到下次起手，单击=基础damage×(10/基础cooldown)×budgetMultiplier；不再叠基础斩。',
  },
  evo_sixiang: {
    cooldown: 12, duration: 6, hit_interval: .5, ticks: 6, eyes: 4,
    radiusByRank: [288, 336],
    rule: '进阶替换两仪；继承实际基础等级，一阶菱形中心至顶点288、7跳，二阶扩大至336、9跳；四眼轮转、末跳合鸣，0.5秒首跳、6秒末跳；总预算为基础damage×6×budgetMultiplier×(本功法cooldown/基础cooldown)，各跳平分，四阵眼共用命中账本。',
  },
}
const evolutionRequirements = [
  { characterLevel: 21, realm: '金丹初期', clear: 0 },
  { characterLevel: 27, realm: '金丹巅峰', clear: 0 },
]
const requirementsForEvolution = id => evolutionRequirements.map((row, index) =>
  id === 'evo_sixiang' && index === 1 ? { ...row, characterLevel: 30, realm: '金丹十层' } : row)
// Rank three is intentionally undefined until the next realm is designed.
const evolutionBudgets = {
  evo_wanjian: [1.30, 1.43], evo_tiandi: [1.40, 1.54],
  // Four-symbol field trades a fixed location and long cooldown for sustained
  // damage. Equal-SP moving-boss checks: +60%, without changing Liangyi.
  evo_wuwo: [1.20, 1.44], evo_sixiang: [2.0, 2.3],
}
const evolutionPointCosts = {
  evo_wanjian: [2, 2], evo_wuwo: [4, 4],
  evo_tiandi: [2, 2], evo_sixiang: [4, 4],
}
export const GROWTH_EVOLUTIONS = freeze(EVOLUTIONS.map(old => ({
  id: old.id, name: old.name, kind: 'evolution', parent: old.parent,
  // The paired passive is only a suggestion; the parent supplies real training.
  passive: old.passive,
  damageType: damageTypes[old.parent],
  learnLevel: skillStage(old.id).minLevel,
  special: true, maxLevel: 2, max_level: 2, pointCosts: evolutionPointCosts[old.id],
  bookCost: 2400, learnClear: 0, visualRank: 10, budgetMultipliers: evolutionBudgets[old.id],
  rankRequirements: requirementsForEvolution(old.id).map(row => ({ ...row, prerequisites: { [old.parent]: 1 } })),
  ...evolutionEffects[old.id],
  levels: evolutionBudgets[old.id].map((budgetMultiplier, i) => ({
    level: i + 1, budgetMultiplier, ...requirementsForEvolution(old.id)[i],
    prerequisites: { [old.parent]: 1 }, ...evolutionEffects[old.id],
  })),
})))

const skills = new Map(GROWTH_SKILLS.map(row => [row.id, row]))
const evolutions = new Map(GROWTH_EVOLUTIONS.map(row => [row.id, row]))
const uint = (value, max = Number.MAX_SAFE_INTEGER) =>
  Number.isSafeInteger(value) && value >= 0 && value <= max
function integer(value, max, name) {
  if (!uint(value, max)) throw new RangeError(`Invalid growth ${name}`)
  return value
}
function record(value, name) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`Invalid growth ${name}`)
  }
  return value
}

export function giftSkills(tutorialWaves = 0, initialized = false) {
  integer(tutorialWaves, Number.MAX_SAFE_INTEGER, 'tutorialWaves')
  if (initialized) return {}
  return { sj_arc: 1 }
}

// Retained snapshot field; progress never grants skills in this version.
export function tutorialProgress(previous = 0) { return previous }

export function skillLearnLevel(state, definition) {
  return definition.learnLevel
}

export function realmPoints(xp = 0) {
  const level = cultivationAt(xp).level
  return level - 1 - Math.floor(level / 10) + (level >= 11 ? 8 : 0) + (level >= 21 ? 14 : 0)
}

function pointSources(state) {
  record(state, 'state')
  const realm = realmPoints(state.xp ?? 0)
  const cleared = integer(state.clearedFloor ?? 0, 9, 'clearedFloor')
  const firstClear = FIRST_CLEAR_REWARDS.slice(0, cleared).reduce((sum, reward) =>
    sum + (reward.kind === 'skillPoints' ? reward.amount : 0), 0)
  const purchases = integer(state.researchPurchases ?? 0, GROWTH_RESEARCH.length, 'researchPurchases')
  if (GROWTH_RESEARCH.slice(0, purchases).some(row => cleared < row.learnClear)) throw new RangeError('Invalid growth research unlock')
  const research = GROWTH_RESEARCH.slice(0, purchases).reduce((sum, row) => sum + row.points, 0)
  // Campaign accepts this optional source only through a branded playtest
  // adapter. Natural progression still supplies at most GROWTH_POINT_CAP.
  const bonus = Object.prototype.hasOwnProperty.call(state, 'playtestSkillPoints')
    ? integer(state.playtestSkillPoints, 10000, 'playtestSkillPoints')
    : 0
  const teaching = state.skillsInitialized
    ? Object.keys(giftSkills(state.tutorialWaves ?? 0)).reduce((sum, id) => sum + skills.get(id).pointCosts[0], 0) : 0
  return { realm, firstClear, research, total: realm + firstClear + research + bonus + teaching }
}

export function totalPoints(state) {
  return pointSources(state).total
}

export function spentPoints(state) {
  record(state, 'state')
  const gifts = giftSkills(state.tutorialWaves ?? 0, state.skillsInitialized)
  let spent = 0
  for (const [values, table, name] of [
    [state.skills ?? {}, skills, 'skills'],
    [state.evolutionRanks ?? {}, evolutions, 'evolutionRanks'],
  ]) {
    for (const [id, rank] of Object.entries(record(values, name))) {
      const definition = table.get(id)
      if (!definition) throw new RangeError(`Unknown growth ${name} ${id}`)
      integer(rank, definition.maxLevel, `${id} rank`)
      spent += definition.pointCosts.slice(0, rank).reduce((sum, cost) => sum + cost, 0)
      if (table === skills && rank > 0 && gifts[id]) spent -= definition.pointCosts[0]
    }
  }
  return spent
}

export function growthSummary(state) {
  const sources = pointSources(state), spent = spentPoints(state)
  // Preserve negative availability: a forged/legacy overspend must be rejected
  // or explicitly migrated by Campaign, never hidden by clamping it to zero.
  return { total: sources.total, spent, available: sources.total - spent,
    realm: sources.realm, firstClear: sources.firstClear, research: sources.research,
    cap: GROWTH_POINT_CAP }
}

export function rankCap(id, xp = 0, clearedFloor = 0) {
  const level = cultivationAt(xp).level
  integer(clearedFloor, 9, 'clearedFloor')
  const definition = skills.get(id)
  if (definition) {
    return definition.rankRequirements.filter(req => level >= req.characterLevel).length
  }
  const evolution = evolutions.get(id)
  if (!evolution) return 0
  return evolution.rankRequirements.filter(req =>
    level >= req.characterLevel).length
}

// ignoreStage is only for validating retained investments and replaying the
// pre-existing schema1/2 migration. Campaign never accepts it from an action.
export function skillRequirement(state, id, { inTower = false, ignoreStage = false } = {}) {
  const definition = skills.get(id) || evolutions.get(id)
  if (!definition) return { ok: false, reason: 'unknown-skill', nextLevel: 0, cost: 0, bookCost: 0 }
  record(state, 'state')
  const evolution = evolutions.has(id), gifts = giftSkills(state.tutorialWaves ?? 0, state.skillsInitialized)
  const ranks = record((evolution ? state.evolutionRanks : state.skills) ?? {}, 'ranks')
  const stored = integer(ranks[id] ?? 0, definition.maxLevel, `${id} rank`)
  const current = evolution ? stored : Math.max(stored, gifts[id] || 0)
  const nextLevel = Math.min(current + 1, definition.maxLevel)
  const maxed = current === definition.maxLevel
  const books = state.books ?? []
  if (!Array.isArray(books) || books.some(book => typeof book !== 'string')) {
    throw new TypeError('Invalid growth books')
  }
  const quote = { nextLevel, cost: maxed ? 0 : definition.pointCosts[nextLevel - 1],
    bookCost: !maxed && current === 0 && !books.includes(id) ? definition.bookCost : 0 }
  const fail = reason => ({ ok: false, reason, ...quote })
  if (maxed) return fail('max-level')
  const xp = state.xp ?? 0, floor = integer(state.clearedFloor ?? 0, 9, 'clearedFloor')
  if (!ignoreStage && cultivationAt(xp).level < definition.learnLevel) return fail('stage-locked')
  if (evolution) {
    const req = definition.rankRequirements[nextLevel - 1]
    if (cultivationAt(xp).level < req.characterLevel) return fail('realm-locked')
    if (!(state.skills?.[definition.parent] >= 1)) return fail('parent-required')
  } else {
    if (nextLevel > rankCap(id, xp, floor)) return fail('realm-locked')
    const required = definition.rankRequirements[nextLevel - 1].prerequisites || {}
    if (Object.entries(required).some(([skillId, rank]) => (state.skills?.[skillId] || 0) < rank)) return fail('prerequisite')
  }
  if (growthSummary(state).available < quote.cost) return fail('insufficient-points')
  // Currency sufficiency and the atomic book+rank purchase belong to Campaign.
  return { ok: true, ...quote }
}

// A preview is detached from its source and carries every automatic reduction.
// Campaign must recompute it inside its transaction, never trust a UI proposal.
export function decreaseSkillQuote(state, id) {
  const fail = reason => ({ ok: false, reason, returned: 0, changes: [] })
  const definition = skills.get(id) || evolutions.get(id)
  if (!definition) return fail('unknown-skill')
  record(state, 'state')
  if (state.activeRun != null) return fail('in-tower')
  const evolution = evolutions.has(id), gifts = giftSkills(state.tutorialWaves ?? 0, state.skillsInitialized)
  const ranks = record((evolution ? state.evolutionRanks : state.skills) ?? {}, 'ranks')
  const current = integer(ranks[id] ?? 0, definition.maxLevel, `${id} rank`)
  const floor = evolution ? 0 : gifts[id] || 0
  if (current <= floor) return fail(floor ? 'gift-floor' : 'not-learned')
  if (!evolution && current === 1 && GROWTH_EVOLUTIONS.some(skill =>
    skill.parent === id && state.evolutionRanks?.[skill.id] > 0)) return fail('dependent-evolution')
  if (!evolution && GROWTH_SKILLS.some(skill => {
    const learned = state.skills?.[skill.id] || 0
    const required = skill.rankRequirements[learned - 1]?.prerequisites?.[id] || 0
    return required > 0 && current - 1 < required
  })) return fail('dependent-skill')
  const before = growthSummary(state)
  const next = { ...state, skills: { ...state.skills }, evolutionRanks: { ...state.evolutionRanks } }
  const changes = new Map()
  const reduce = (values, nodeId, to) => {
    const from = values[nodeId] || 0
    if (from === to) return false
    if (to > 0) values[nodeId] = to
    else delete values[nodeId]
    changes.set(nodeId, { id: nodeId, from: changes.get(nodeId)?.from ?? from, to })
    return true
  }
  reduce(evolution ? next.evolutionRanks : next.skills, id, current - 1)
  return {
    ok: true, reason: '', returned: before.spent - growthSummary(next).spent,
    // Creator's array-spread transform assumes arrays. Materialize the iterator
    // explicitly or the web build exposes a MapIterator as one bogus change.
    changes: Array.from(changes.values()), skills: next.skills, evolutionRanks: next.evolutionRanks,
  }
}
