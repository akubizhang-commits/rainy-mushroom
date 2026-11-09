import {FORMATION_SLOWS} from './TowerFormationControl.js'
// Growth version 1: pure tables/quotes only. Campaign owns currency, source
// receipts and transactions; Run owns casting and per-target hit ledgers.
import { SKILLS, EVOLUTIONS } from './TowerContent.js'
import { cultivationAt } from './TowerProfile.js'

function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze)
    Object.freeze(value)
  }
  return value
}

// Each skill opens rank bands relative to its own starting realm phase.
// 2026-11-09（技能可学等级调整）：蚀骨剑意→炼气巅峰，逐月斩→筑基初期，双月斩→筑基中期，
// 剑破虚空、周天剑域→金丹初期，一剑开天→金丹中期。
export const GROWTH_STAGES = freeze([
  { id: 'lianqi-early', realm: '炼气', phase: '初期', skillIds: ['sj_arc', 'sj_yujian', 'sj_bone'] },
  { id: 'lianqi-middle', realm: '炼气', phase: '中期', skillIds: ['sj_moon', 'vajra', 'sj_wanjian'] },
  { id: 'lianqi-peak', realm: '炼气', phase: '巅峰', skillIds: ['sj_qinglian', 'sj_mark'] },
  { id: 'zhuji-early', realm: '筑基', phase: '初期', skillIds: ['sj_moon_triple', 'sj_shadow', 'sj_sancai', 'sj_flight', 'sj_spirit'] },
  { id: 'zhuji-middle', realm: '筑基', phase: '中期', skillIds: ['sj_cross'] },
  { id: 'zhuji-peak', realm: '筑基', phase: '巅峰', skillIds: ['sj_gate', 'sj_formation'] },
  { id: 'jindan-early', realm: '金丹', phase: '初期', skillIds: ['sj_line', 'sj_heart', 'evo_wanjian', 'evo_wuwo'] },
  { id: 'jindan-middle', realm: '金丹', phase: '中期', skillIds: ['evo_tiandi'] },
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
// 2026-11-06：悟道点减少后，特殊功法每级从2点降为1点。
const specialActiveCosts = Array(10).fill(1)
const passiveCosts = Array(4).fill(1)
const advancedPassiveCosts = Array(4).fill(2)
// Standalone casts do not require another skill simply because they share a flow.
const prerequisites = {}
// First learning, subsequent training bands and point prices are independent
// of the display phase, including skills opening on a phase's final level.
// 2026-11-06（84/85号复测）：御剑术仍2级可学，但1–3/4–6/7–9/10级分别在2/7/11/14级开放，
// 压低御剑前期强度。各楼层入层时的等级上限与“炼气中期才开放”的试验方案相同。
const bandLevels = { sj_yujian: [2, 7, 11, 14] }
// 2026-11-09：剑破虚空改为金丹初期21级可学，1–3/4–6/7–9/10级在21/24/27/30级开放
// （金丹之后没有下一阶段，第10级沿用每段3级的节奏落在30级）。蚀骨剑意与一剑开天改按所在阶段起始等级开放。
const cadenceUnlocks = { sj_line: 21, sj_gate: 19 }
const cadencePointCosts = { sj_moon_triple: specialActiveCosts, sj_cross: activeCosts, sj_sancai: activeCosts }

const oldSkills = new Map(SKILLS.map(skill => [skill.id, skill]))

// Hybrid spends one attack budget equally on physical and spell damage.
// Sword scars use their own hybrid budget; utility buffs deal no damage.
const damageTypes = {
  sj_yujian: 'physical', sj_arc: 'physical', sj_moon: 'physical', sj_moon_triple: 'physical', sj_cross: 'physical', sj_line: 'physical', sj_shadow: 'hybrid',
  sj_wanjian: 'hybrid', sj_formation: 'hybrid', sj_sancai: 'hybrid', sj_qinglian: 'hybrid',
  sj_mark: 'none', sj_gate: 'hybrid',
  sj_spirit: 'none', sj_heart: 'none', sj_bone: 'none', vajra: 'none', sj_flight: 'none',
}

function skill(id, effects, metadata = oldSkills.get(id)) {
  const active = metadata.kind === 'active'
  const special = metadata.clear > 0, maxLevel = metadata.maxLevel ?? (active ? 10 : 4)
  const learnLevel = cadenceUnlocks[id] ?? metadata.learnLevel ?? skillStage(id).minLevel
  const pointCosts = metadata.pointCosts ?? cadencePointCosts[id] ?? (active
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
      const characterLevel = bandLevels[id] ? bandLevels[id][phaseOffset]
        : cadenceUnlocks[id] !== undefined
        ? Math.min(30, learnLevel + phaseOffset * 3) : Math.max(learnLevel, stage.minLevel)
      const realm = GROWTH_STAGES.find(s => characterLevel >= s.minLevel && characterLevel <= s.maxLevel).label
      return { characterLevel, realm }
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
export const GROWTH_POINT_CAP = 35
// Retained for shared consumers; research no longer grants skill points.
export const GROWTH_RESEARCH = freeze([])

// 青莲剑阵的三层判定环，index 0 为内环。每一瓣都是判定剑，三环共用半径 200，
// 判定剑从阵眼辐射到外环半径。share 为该环一轮的整招预算占比（外 20% → 中 35% → 内 45%）；
// 一轮内每一瓣对范围内目标各结算一次，单瓣伤害 = share ÷ visualPetals。
export const QINGLIAN_RINGS = freeze([
  { radius: 200, share: .45, swords: 8, visualPetals: 8, alpha: .80 },
  { radius: 200, share: .35, swords: 12, visualPetals: 12, alpha: .70 },
  { radius: 200, share: .20, swords: 16, visualPetals: 16, alpha: .60 },
])

export const GROWTH_SKILLS = freeze([
  skill('sj_yujian', {
    // 2026-11-06：1–9级按比例压低，10级不变，御剑前期不再领先、后期保持中庸。
    damage: [1.2, 1.5, ...Array.from({ length: 8 }, (_, i) => 1.8 * 1.13 ** i)]
      .map((value, i) => value * [.5, .5, .52, .65, .72, .8, .85, .9, .95, 1][i]),
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
    // 2026-11-06：流云斩是各流派共用的开局过渡技能，只小幅加强：伤害×1.3、冷却4→3.5秒。
    damage: [1.5, 2.1, ...Array.from({ length: 8 }, (_, i) => 3 * 1.15 ** i)].map(value => value * .8 * 1.3), cooldown: 3.5, windup: .18,
    radius: [140, 140, 150, 150, 160, 170, 170, 180, 180, 190],
    reach: 640, speed: 960,
    width: [140, 140, 150, 150, 160, 170, 170, 180, 180, 190].map(radius => radius * 1.2),
    bladeWidth: 12,
    angle: 90, target_cap: 6, single_dps_factor: 1 / 4, hit_assumption: .45,
    rule: '向身前连续斩出三道月弧，伤害按25%/33%/42%逐斩增强；每斩对同一敌人最多命中一次。',
  }, { ...oldSkills.get('sj_arc'), name: '流云斩' }),
  skill('sj_moon', {
    // 2026-11-06：剑气前期优势放在剑气专属的玄月斩上，冷却6→4秒。1–6级伤害×3，
    // 7–10级倍率逐级收到×2，保证每升一级伤害都增加（约3.5%）。
    damage: damageCurve(1.8, 1.15).map((value, i) => value * [3, 3, 3, 3, 3, 3, 2.71, 2.46, 2.22, 2][i]), cooldown: 4, windup: .18,
    radius: 230, reach: 230, width: 460, angle: 300, bladeWidth: 24,
    target_cap: 6, single_dps_factor: 1 / 6, hit_assumption: .55,
    rule: '在原地展开宽阔月弧，横扫周围大范围敌人；每次施放对同一敌人造成一次伤害，最多命中6个目标。',
  }, { name: '玄月斩', kind: 'active', clear: 0, learnLevel: 4 }),
  skill('sj_moon_triple', {
    damage: damageCurve(6, 1.15), cooldown: 10, windup: .18,
    radius: 140, reach: 420, speed: 800, width: 180, bladeWidth: 12,
    target_cap: 6, single_dps_factor: 1 / 10, hit_assumption: .5,
    rule: '窄斜月、扁横月、深弧月依次飞出，每道沿固定方向飞行420距离；三道均分整招伤害，各道同敌最多命中一次。所有等级保持三道，碰到地形提前消散。',
  }, { name: '逐月斩', kind: 'active', clear: 0 }),
  // Growth-only skill; the historical five-rank catalog remains unchanged.
  skill('sj_cross', {
    damage: [1.5, 2.1, ...Array.from({ length: 8 }, (_, i) => 3 * 1.15 ** i)].map(value => value * 2), cooldown: 12, windup: .18,
    radius: [180, 180, 180, 220, 220, 220, 270, 270, 270, 270],
    reach: [180, 180, 180, 220, 220, 220, 270, 270, 270, 270], speed: 960,
    width: [180, 180, 180, 180, 180, 180, 270, 270, 270, 270],
    bladeWidth: [12, 12, 12, 12, 12, 12, 18, 18, 18, 18],
    target_cap: 8, single_dps_factor: 1 / 12, hit_assumption: .45,
    rule: '向前方原地斩出两道白紫交叉剑气，蓝黑剑气衬于底层，整招不向外飞行；攻击前方180°范围；1–3级距离180，4–6级220，7–10级270；最多命中8个可见目标，每次施放同敌只结算一次，后续弧光与消散不追加伤害。',
  }, { name: '双月斩', kind: 'active', clear: 0 }),
  skill('sj_wanjian', {
    damage: damageCurve(.30, 1.20), hit_interval: .6,
    // Seven possible hits per activation replace ten per old six-second cycle.
    cooldown: 6, duration: 4, cycle_damage_multiplier: 10 / 7,
    radius: [90, 90, 95, 95, 100, 105, 105, 110, 110, 120],
    swords: [4, 4, 5, 5, 5, 6, 6, 6, 6, 8],
    target_cap: 6, single_dps_factor: 1 / .6, hit_assumption: .6,
    rule: '发动起冷却6秒，剑环持续4秒；生效期间伤害乘10/7，以每轮最多7击补偿原6秒10击。所有环绕剑对同一目标共用0.6秒命中间隔，不乘剑数。周天剑域保留常驻与原伤害。',
  }, { ...oldSkills.get('sj_wanjian'), pointCosts: [...activeCosts] }),
  // 青莲剑阵：持续3秒，每秒一轮，外层→中层→内层依次判定；同一目标三轮合计36次命中，伤害合计为整招预算。
  skill('sj_qinglian', {
    // 2026-11-09：冷却9→8秒，每次施放伤害不变（先测试再看）。
    damage: damageCurve(8, 1.15), cooldown: 8, windup: .8, duration: 3,
    hit_interval: 1, reach: QINGLIAN_RINGS[0].radius, target_cap: null,
    single_dps_factor: 1 / 8, hit_assumption: .6,
    rule: '起阵0.8秒后三层莲瓣剑环旋转爆发3秒，每秒一轮。第一轮外层16瓣占整招预算20%，第二轮中层12瓣占35%，第三轮内层8瓣占45%；每瓣对范围内每个目标各结算一次，同一目标三轮合计36次命中。攻击目标数不限，不减速敌人。',
  }, { name: '青莲剑阵', kind: 'active', clear: 0 }),
  skill('sj_line', {
    // 2026-11-09：改为金丹初期可学，各级伤害×1.5（一剑开天按既有继承规则同步）。
    damage: damageCurve(8 * 1.8 * 1.5 * 1.5, 1.10), cooldown: 12, windup: .12,
    reach: [450, 450, 490, 490, 530, 560, 560, 600, 600, 640],
    width: 28, target_cap: [3, 3, 4, 4, 4, 5, 5, 5, 5, 6],
    single_dps_factor: 1 / 12, hit_assumption: .65,
    rule: '直线单次贯穿，每目标结算damage一次；目标上限增加是覆盖收益，不加攻击频率。',
  }),
  skill('sj_shadow', {
    // Less frequent releases carry 20/11 of the former per-cast budget.
    damage: damageCurve(6.4, (2.64 * 1.20 ** 9 / 3.52) ** (1 / 9)), cooldown: 6, windup: .12,
    reach: 360, delay: .65,
    radius: [80, 80, 90, 90, 100, 110, 110, 120, 120, 130],
    target_cap: 3, single_dps_factor: 1 / 6, hit_assumption: .5,
    rule: '固定落点；留印0.65秒后首斩，后续每0.08秒交错斩击，1/3/6/10级共1/2/3/4斩；每斩最多3目标。1–5级各斩平分，6级和10级保留上一级各斩伤害，新增斩承接升级增量；同段数期间各斩同比成长，总伤害预算不变。',
  }),
  skill('sj_sancai', {
    slow_fraction: FORMATION_SLOWS.sj_sancai,
    // 2026-11-09：冷却8→10秒，每次施放伤害不变（先测试再看）。
    damage: damageCurve(6 * 1.25, 1.12), cooldown: 10, windup: .25,
    reach: 320, duration: 3, hit_interval: 1, pulseCount: 3,
    radius: [150, 150, 150, 165, 165, 165, 180, 180, 180, 180],
    target_cap: 6, single_dps_factor: 1 / 10, hit_assumption: .65,
    rule: '前方敌群脚下布下固定三角剑阵，0.35/1.35/2.35秒三剑依次落下，三击均分整阵伤害，每击最多6目标。阵内怪物行走减速20%，含精英与Boss；离阵或3秒到期立即解除，重叠只取最强，不影响攻击、冲锋或跳跃。',
  }, { name: '三才剑阵', kind: 'active', clear: 0 }),
  skill('sj_formation', {
    slow_fraction: FORMATION_SLOWS.sj_formation,
    // Smooth the late foundation/jindan transition without changing entry ranks.
    damage: damageCurve(32 / 15, 1.15).map((damage, i) => damage * (1 + Math.max(0, i - 5) * .05) * 1.65 * (i >= 6 ? 1.25 : 1)), cooldown: 12, windup: .12,
    reach: 360, duration: 8, hit_interval: .5, ticks: 6,
    pulseCount: [12, 12, 12, 14, 14, 14, 16, 16, 16, 16],
    radius: [132, 132, 144, 144, 156, 168, 168, 180, 180, 192],
    target_cap: 8, single_dps_factor: .5, hit_assumption: .55,
    rule: '生成0.5秒后首击、8秒末击；1–3级12击、4–6级14击、7–10级16击。整轮预算为damage×6，各击平分，双阵眼共用命中账本；阵内怪物行走减速30%，含精英与Boss，重叠只取最强，离阵或8秒结束解除，不影响出招。',
  }),
  skill('sj_spirit', {
    cast_speed: [.10, .20, .30],
    reach_bonus: [.04, .08, .12],
    pickup_bonus: [.20, .35, .50],
    rule: '灵力低于30%时战斗回灵速度依次×1.25/×1.6/×2（脱战加速取较大者，不叠乘），数值见TowerSpirit.NINGSHEN_SURGE；每级增加10点神识（cast_speed为其对应施法速度，实际经神识结算）与4%御剑术索敌距离，灵石、材料及治疗物的拾取半径依次增加20%/35%/50%；灵石和材料基础拾取半径100，不增加掉落数量、概率或修为。',
  }, { name: '凝神诀', kind: 'passive', clear: 0, maxLevel: 3, pointCosts: [1, 1, 1] }),
  skill('sj_heart', {
    crit_chance: [.08, .14, .20, .28],
    crit_bonus: .5,
    rule: '默认暴击倍率150%，装备暴击伤害加成直接增加倍率；直接功法伤害与普攻均适用。持续功法伤害每次独立判定暴击；继承已结算伤害的衍生伤害不重复判定。',
  }, { ...oldSkills.get('sj_heart'), pointCosts: [...passiveCosts] }),
  skill('sj_mark', {
    vulnerability: .20, duration: 3, icd: 10,
    rule: '冷却就绪后，普攻或攻击功法直接命中一个存活敌人，施加3秒蚀骨破绽：后续直接伤害提高20%。内置冷却10秒，全技能共享；触发这一击不增伤。持续伤害和衍生伤害不触发，不叠层、不刷新。无持续伤害、施法动作或特效动画。',
  }, { ...oldSkills.get('sj_mark'), name: '蚀骨剑意', maxLevel: 1, pointCosts: [1] }),
  skill('sj_bone', {
    damage_bonus: [.06, .12, .18, .25],
    speed_bonus: [.02, .04, .06, .08],
    rule: '伤害被动加成在装备乘积之后相加；移速另算，无冷却缩减，不乘算放大触发预算。',
  }, { ...oldSkills.get('sj_bone'), clear: 0, pointCosts: [...passiveCosts] }),
  skill('sj_gate', {
    proc_damage: [.5, 1.2],
    radius: [110, 110],
    target_cap: 6, trigger_cooldown: 10, burst_delay: .2,
    rule: '重击功法命中后，0.2秒从目标体内爆裂，再射出剑气伤害周围最多6个敌人；重击为剑破虚空（含一剑开天）、双月斩、分光连斩收尾。每次重招最多触发一次，触发后冷却10秒；普攻、飞剑、持续伤害不消耗蓄势。爆点跟随目标，死亡留在最后位置。爆裂可暴击，不触发剑痕或新爆裂。',
  }, { ...oldSkills.get('sj_gate'), name: '剑罡爆裂', maxLevel: 2, pointCosts: [1, 1] }),
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
    regularMultiplier: 1, rainCooldown: 15, rainDamageBudgetSeconds: 8, rainDamageDurationByRank: [1.1, 1.4], rainTicks: 6,
    rainTickInterval: .2, rainRadius: 160, rainTargetCap: 6,
    rule: '进阶替换御剑；继承御剑术实际等级的伤害，剑雨按原8秒预算及施放期间停火损失计算伤害，基础冷却15秒，各段平分总预算。降低基础等级会同步降低进阶伤害。',
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
    slow_fraction: FORMATION_SLOWS.evo_sixiang,
    cooldown: 15, duration: 8, hit_interval: .5, ticks: 6, eyes: 4,
    pulseCount: [16, 20],
    radiusByRank: [288, 336],
    rule: '进阶替换两仪；继承实际基础等级，一阶菱形中心至顶点288、16击，二阶扩大至336、20击；四眼轮转、末跳合鸣，0.5秒首击、8秒末击；总预算为基础damage×6×budgetMultiplier×(本功法cooldown/基础cooldown)，各跳平分，四阵眼共用命中账本；阵内怪物行走减速40%，含精英与Boss，重叠只取最强，离阵或8秒结束解除，不影响出招。',
  },
}
const evolutionRequirements = [
  { characterLevel: 21, realm: '金丹初期', clear: 0 },
  { characterLevel: 27, realm: '金丹巅峰', clear: 0 },
]
const requirementsForEvolution = id => evolutionRequirements.map((row, index) =>
  id === 'evo_sixiang' && index === 1 ? { ...row, characterLevel: 30, realm: '金丹十层' }
    : id === 'evo_tiandi' && index === 0 ? { ...row, characterLevel: 24, realm: '金丹中期' } : row)
// Rank three is intentionally undefined until the next realm is designed.
const evolutionBudgets = {
  // Second ranks add 30% over the first rank; equal-SP calibration is recorded
  // in design/balance/skill-second-rank-2026-11-03.md.
  evo_wanjian: [1.30, 1.69], evo_tiandi: [1.40, 1.82],
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
  learnLevel: cadenceUnlocks[old.id] ?? skillStage(old.id).minLevel,
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
  // 2026-11-06：每升1级1点；突破筑基（11级）、金丹（21级）各再给3点。满级35点。
  return (level - 1) + (level >= 11 ? 3 : 0) + (level >= 21 ? 3 : 0)
}

function pointSources(state) {
  record(state, 'state')
  const realm = realmPoints(state.xp ?? 0)
  integer(state.clearedFloor ?? 0, 9, 'clearedFloor')
  integer(state.researchPurchases ?? 0, 0, 'researchPurchases')
  const firstClear = 0, research = 0
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
