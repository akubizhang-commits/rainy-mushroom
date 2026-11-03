import {skillManaCost} from './TowerCharacterStats.js'
import { outgoingDamageFactor } from './TowerAttributeRules.js'
// Read-only presentation of current growth skills. Damage excludes crits and
// conditional procs; hybrid ratios describe the budget before equipment bonuses.
import { GROWTH_SKILLS, GROWTH_EVOLUTIONS, GROWTH_STAGES, skillRequirement, skillLearnLevel } from './TowerGrowth.js'
import { combatLoadout } from './TowerCampaign.js'
import { stats as combatStats } from './TowerRun.js'
import { formatSpiritStones } from './TowerEconomy.js'
import { weaponDamageModifiers } from './TowerWeapons.js'
import { ELEMENT_NAMES, skillElement } from './TowerWeaponElements.js'
import { skillCooldown, castActionTiming, equipmentCastSpeed } from './TowerSkillTiming.js'
import { skillForm, skillHitShare, convergenceRainMultiplier } from './TowerSkillForms.js'

const skills = new Map(GROWTH_SKILLS.map(s => [s.id, s]))
const evolutions = new Map(GROWTH_EVOLUTIONS.map(s => [s.id, s]))
const categoryLabels = {
  physical: '物理攻击', hybrid: '物理＋法术攻击', magic: '法术攻击',
  inherited: '伤害类型继承', none: '被动功法',
}
const field = (s, key, rank) => Array.isArray(s[key]) ? s[key][rank - 1] : s[key]
const fmt = n => String(Number(n.toFixed(3)))
const percent = n => `${fmt(n * 100)}%`
const stageAt = level => {
  const stage = GROWTH_STAGES.find(stage => level >= stage.minLevel && level <= stage.maxLevel)
  return stage ? `${stage.realm} · ${stage.phase}` : '元婴 · 初期'
}

function rankRuleLines(definition) {
  const bands = []
  definition.rankRequirements.forEach((req, index) => {
    const level = Math.max(definition.learnLevel, req.characterLevel)
    const last = bands[bands.length - 1]
    if (last && last.level === level) last.end = index + 1
    else bands.push({ level, start: index + 1, end: index + 1 })
  })
  return bands.map(band => {
    const required = definition.rankRequirements[band.start - 1].prerequisites || {}
    const extra = Object.entries(required).map(([id, rank]) => `${skills.get(id).name}${rank}级`).join('、')
    return `${band.start === band.end ? band.start : `${band.start}–${band.end}`}级：${stageAt(band.level)}${extra ? `，需${extra}` : ''}`
  })
}

function requirements(state, definition, learned, inTower) {
  if (learned >= definition.maxLevel) return { lines: [], detail: null }
  const nextLevel = learned + 1
  const req = definition.rankRequirements?.[nextLevel - 1]
  const characterLevel = Math.max(skillLearnLevel(state, definition), req.characterLevel)
  const prerequisites = { ...(req.prerequisites || {}) }, clear = 0
  const quote = skillRequirement(state, definition.id, { inTower })
  const lines = [`角色${stageAt(characterLevel)}`]
  for (const [id, rank] of Object.entries(prerequisites)) lines.push(`${skills.get(id).name} ${rank}级`)
  lines.push(`功法点 ${definition.pointCosts[nextLevel - 1]}`)
  if (quote.bookCost) lines.push(`经卷 ${formatSpiritStones(quote.bookCost)}灵石`)
  return { lines, detail: { nextLevel, characterLevel, stage: stageAt(characterLevel),
    clear, prerequisites, cost: definition.pointCosts[nextLevel - 1], bookCost: quote.bookCost,
    canUpgrade: quote.ok && (state.spiritStones ?? 0) >= quote.bookCost, reason: quote.reason || null } }
}

/** Campaign state in; detached presentation out. Unknown IDs return null.
 * cooldown: seconds (main cast cycle), manaCost: points spent once at the start of an active cast.
 * Active-run snapshot XP/loadout take precedence over camp profile values.
 */
function presentRank(state, id) {
  const definition = skills.get(id) || evolutions.get(id)
  if (!definition) return null
  const snapshot = state.activeRun?.snapshot
  const loadout = snapshot?.loadout || combatLoadout(state)
  const xp = snapshot?.player.xp ?? state.xp
  const effective = snapshot ? { ...state, xp, skills: { ...loadout.active, ...loadout.passive },
    evolutionRanks: { ...loadout.evolutionLevels }, tutorialWaves: loadout.tutorialWaves } : state
  const learned = (definition.kind === 'evolution' ? effective.evolutionRanks : effective.skills)[id] || 0
  const level = learned || 1, preview = !learned
  const { attack, magicAttack } = combatStats(xp, loadout)
  const boneRank = loadout.passive.sj_bone || 0
  const bone = boneRank ? field(skills.get('sj_bone'), 'damage_bonus', boneRank) : 0
  const typedDamage = (type, base) => base * outgoingDamageFactor(loadout, id, type, true)
  const damage = multiplier => multiplier * (definition.damageType === 'hybrid'
    ? (typedDamage('physical', attack) + typedDamage('magic', magicAttack)) / 2
    : typedDamage(definition.damageType, definition.damageType === 'magic' ? magicAttack : attack))
  const rows = []
  const add = (key, label, value, unit = '', condition = '') => {
    const text = `${label} ${typeof value === 'number' ? fmt(value) : value}${unit}${condition ? `（${condition}）` : ''}`
    rows.push({ key, label, value, unit, text, ...(condition ? { condition } : {}) })
  }
  const pct = (key, label, value, condition = '') => add(key, label, percent(value), '', condition)
  const descriptions = {
    sj_line: '剑气沿狭长直线贯穿敌人；精进后沿同一道剑路连续穿刺。',
    sj_shadow: '在目标位置留下剑痕，短暂延迟后由不同方向接连斩落。',
    evo_tiandi: '蓄势凝成一柄巨剑，一击劈开前方敌阵；地面裂光随后消散。',
    sj_spirit: '凝聚神识，每级增加10点神识（对应10%施法速度，并提高灵力上限和恢复）与4%御剑术索敌距离，并解锁更高等级御剑术；同时扩大灵石、材料和地面治疗物的拾取范围。',
    sj_heart: '提高普攻与功法的暴击几率，持续功法伤害每次独立判定；基础暴击倍率150%。',
    sj_mark: '直接攻击引出青碧巨剑，斜斩时立即造成首批剑痕伤害的60%，剩余40%在随后2秒内持续造成。剑痕继承触发命中实际造成的物理与法术伤害比例。剑痕期间再次命中只追加持续伤害并刷新时长，不重复落剑爆发。',
    sj_bone: '提高攻击伤害与移动速度；不额外增强剑痕与击杀爆发。移速可与御剑飞行叠加。',
    sj_gate: '直接攻击命中后，四柄剑自动依次内刺，再集中爆裂，伤害目标及周围敌人。',
    vajra: '被动减少受到的伤害，护身纹不产生吸收护盾。',
    sj_flight: '脚踏飞剑滑行，提高25%移动速度，可与剑骨叠加；仍受地形阻挡。',
  }
  let description = descriptions[id] || '', cooldown = null
  const evo = definition.kind === 'evolution' ? definition : null
  const base = evo ? skills.get(evo.parent) : definition
  const parentLevel = evo ? effective.skills[evo.parent] || 1 : level
  const val = key => field(base, key, parentLevel)
  const budget = evo ? evo.budgetMultipliers[level - 1] : 1
  const damageType = definition.damageType
  const category = categoryLabels[damageType]
  const form = { ...skillForm(id, level, parentLevel) }
  const spiritRank = loadout.passive.sj_spirit || 0
  if (id === 'sj_yujian' && spiritRank) form.reach *= 1 + field(skills.get('sj_spirit'), 'reach_bonus', spiritRank)
  const flyingBlade = ['crescent-projectile', 'cross-projectile'].includes(form.shape)
  if (id === 'sj_arc') description = form.shape === 'sector'
    ? '挥出一道近身月牙，斩击身前扇形范围内的敌人；4级可离体飞射，7级可连续释放三道月牙。'
    : form.hits === 1
      ? '挥出一道高速飞行的月牙剑气，沿固定方向穿过前方敌阵；7级可连续释放三道月牙。'
      : `连续释放${form.hits}道高速飞行的月牙剑气，沿固定方向依次穿过前方敌阵。`
  if (id === 'sj_cross') description = form.shape === 'cross'
    ? '在身前交叉挥出两道月牙剑气，两刃锋面共同朝前、末端后掠，形成一道近身十字斩；交会处只命中一次。4级变为飞行十字斩，7级扩大攻击范围。'
    : `以两道锋面共同朝前的交叉月牙组成一道${swordQiFormName(id, form) === '大型飞行十字斩' ? '大型' : ''}飞行十字斩，沿固定方向贯穿前方敌阵；两刃交会处只命中一次。`
  if (flyingBlade) description += `${id === 'sj_cross' ? '整发' : '每道'}对同一敌人最多命中1次，遇阻挡或战场边界消散，尾光不造成伤害。`
  // Runtime geometry counts emitted swords; the panel counts hits per enemy.
  if (id === 'sj_yujian') form.hits = form.swords

  if (base.kind === 'active') {
    add('manaCost', '灵力消耗', skillManaCost(form.id || id), '点', '每次施放扣除；不足仍正常释放；多段和持续伤害不重复扣除');
    cooldown = val('cooldown') ?? null
    const raw = val('damage')
    if (base.id === 'sj_yujian') {
      const swords = val('swords'), perSword = damage(raw * val('sword_damage_share'))
      cooldown = val('generation_interval')
      add('roundDamage', '每剑伤害', perSword)
      add('swordDamage', '每剑伤害', perSword)
      add('swords', '悬停上限', swords, '把')
      add('storedDamage', '满蓄总伤害', perSword * swords)
      description = `每${fmt(skillCooldown(cooldown,loadout))}秒生成1把飞剑，最多悬停${swords}把；按目标血量分配足够飞剑同时出击，扣除在途剑的预计伤害，多余继续悬停；多目标自动寻敌，命中后消散并逐把补充。`
      if (evo) {
        const total = damage(raw * convergenceRainMultiplier(level))
        add('rainTickDamage', '归宗剑伤（每击）', total / form.hits)
        add('rainFullDamage', '归宗剑伤（全程上限）', total, '', '命中每道穿刺与最终合剑')
        add('rainCooldown', '归宗周期', skillCooldown(evo.rainCooldown, loadout), '秒')
        add('rainTicks', '归宗击数', form.hits)
        add('rainInterval', '归宗剑击间隔', form.interval, '秒')
        add('rainTargetCap', '每击目标上限', form.targetCap)
        description += `定时从${form.hits - 1}个方向向固定落点刺剑，最后合为一剑。归宗出剑时暂停普通飞剑，结束后恢复追击。`
      }
    } else if (base.id === 'sj_wanjian') {
      if (evo) cooldown = null
      else add('duration', '持续时间', val('duration'), '秒')
      add('tickDamage', evo ? '外圈剑伤（每次）' : '环绕剑伤（每次）', damage(raw) * (evo ? budget : val('cycle_damage_multiplier')))
      if (evo) add('innerDamage', '内圈剑伤（每次）', damage(raw) * evo.innerMultiplier[level - 1])
      add('hitInterval', '同目标命中间隔', form.interval, '秒')
      add('swords', '环绕剑数量', form.swords, '把')
      description = `${form.swords}把飞剑循阵环绕身边，以剑锋及阵中灵力绞杀附近敌人。${evo ? '内圈剑意覆盖近身空隙，内外圈共用同一次命中间隔。' : '3／6／10级增至5／6／8把飞剑，并同步扩大剑环和剑身覆盖范围。剑圈内侧留有近身空隙。'}`
      if (!evo) description += `剑环持续${fmt(val('duration'))}秒，发动起计算${fmt(skillCooldown(cooldown,loadout))}秒冷却；结束后剑环消失，冷却完成自动再次发动。`
    } else if (base.id === 'sj_formation') {
      if (evo) cooldown = evo.cooldown
      const total = damage(raw) * budget * val('ticks') * (evo ? evo.cooldown / val('cooldown') : 1)
      add('tickDamage', '剑阵伤害（每脉冲）', total / form.hits)
      add('fullDamage', '剑阵伤害（全程上限）', total, '', '留在阵内命中全部脉冲')
      add('ticks', '脉冲次数', form.hits)
      add('initialDelay', '首击延迟', form.initialDelay, '秒')
      add('hitInterval', '脉冲间隔', form.interval, '秒')
      add('duration', '持续时间', form.duration, '秒')
      description = evo
        ? `四个阵眼构成菱形剑阵，轮流引动剑气，最后四眼合鸣；同敌全程最多${form.hits}击。${level === 1 ? '二阶扩大剑阵范围，增加至9次打击。' : '二阶剑阵覆盖更大的菱形范围。'}`
        : `在施法范围内最近的敌人脚下布下圆形剑阵，双眼交替引动落剑；${form.hits > 6 ? '最后双眼合鸣，' : ''}同敌全程最多${form.hits}击。剑阵范围随等级扩大。`
    } else {
      if (evo) cooldown = evo.cooldown
      const total = damage(raw) * (evo ? evo.cooldown / val('cooldown') * budget : 1)
      const weightedShadow = base.id === 'sj_shadow' && form.hits >= 3
      add('hitDamage', base.id === 'sj_shadow' ? (weightedShadow ? '剑影伤害（首斩）' : '剑影伤害（每斩）') : base.id === 'sj_arc' ? '剑气伤害（首击）' : '剑气伤害（每击）', total * (base.id === 'sj_arc' || weightedShadow ? skillHitShare(base.id, parentLevel, 1) : 1 / form.hits))
      if (weightedShadow) {
        for (let pulse = 2; pulse <= form.hits; pulse++)
          add(`shadowHit${pulse}`, `剑影伤害（第${pulse}斩）`, total * skillHitShare(base.id, parentLevel, pulse))
      }
      if (base.id === 'sj_arc' && form.hits > 1) add('followupDamage', '后续剑气每击', total * skillHitShare(base.id, parentLevel, 2))
      add('fullDamage', '整招伤害上限', total, '', '同一敌人命中全部剑击')
      add('hits', '同敌最多命中', form.hits, '次')
      if (base.id === 'sj_shadow') add('delay', '剑影首斩延迟', form.initialDelay, '秒')
      if (form.hits > 1) add('hitInterval', '连续剑击间隔', form.interval, '秒')
    }
    const action = castActionTiming(form.id, form.hits ?? 1, equipmentCastSpeed(loadout,xp))
    const baseAction = castActionTiming(form.id, form.hits ?? 1)
    add('baseWindup', '基础施法时间', baseAction.windup, '秒')
    add('windup', '当前施法时间', action.windup, '秒')
    add('actionDuration', '动作总时长', action.duration, '秒', '含连发与收招，可移动')
    description += '施法与普攻依次执行；已释放效果独立运行。施法速度不改变持续伤害频率。'
    if (['sj_arc', 'sj_line'].includes(form.id) && action.releases.length > 1) {
      const intervalRow = rows.find(row => row.key === 'hitInterval')
      if (intervalRow) {
        intervalRow.value = action.releases[1] - action.releases[0]
        intervalRow.text = `${intervalRow.label} ${fmt(intervalRow.value)}秒`
      }
    }
    if (cooldown !== null) cooldown = skillCooldown(cooldown, loadout)
    const geometryFields = flyingBlade
      ? [['reach', 'reach', '索敌距离', ''], ['target_cap', 'targetCap', '每发目标上限', ''], ['width', 'width', '刃面横宽', '']]
      : form.shape === 'cross'
        ? [['target_cap', 'targetCap', '每击目标上限', ''], ['width', 'width', '十字横宽', '']]
        : form.shape === 'sector'
          ? [['radius', 'radius', '半径', ''], ['target_cap', 'targetCap', '每击目标上限', ''], ['angle', 'angle', '扇区角度', '°']]
          : [['reach', 'reach', '射程', ''], ['radius', 'radius', '半径', ''], ['target_cap', 'targetCap', '每击目标上限', ''], ['width', 'width', '宽度', ''], ['angle', 'angle', '扇区角度', '°']]
    for (const [key, formKey, label, unit] of geometryFields) {
      if (form[formKey] > 0) add(key, label, form[formKey], unit)
    }
    if (evo) description += `进阶后替代${base.name}施放，继承其修炼等级；基础等级与进阶等级共同决定伤害。`
    else {
      const replacing = GROWTH_EVOLUTIONS.find(e => e.parent === id && effective.evolutionRanks[e.id])
      if (replacing) description += `已进阶为${replacing.name}；继续修炼本功法可提升进阶伤害，退点会同步降低伤害。当前攻击伤害请查看该进阶功法。`
    }
    description += '伤害已计入当前装备与被动，未计暴击与附加伤害。'
  } else {
    const value = key => field(definition, key, level)
    if (id === 'sj_spirit') {
      pct('reachBonus', '御剑术索敌距离加成', value('reach_bonus'))
      pct('pickupBonus', '拾取半径加成', value('pickup_bonus'))
      add('awareness', '神识增加', level*10, '点')
    } else if (id === 'sj_heart') {
      pct('critChance', '暴击率', value('crit_chance'))
      pct('critMultiplier', '基础暴击倍率', 1.5)
    } else if (id === 'sj_mark') {
      pct('woundShare', '有效直伤转剑痕', value('wound_share'))
      add('duration', '剑痕持续', value('duration'), '秒')
    } else if (id === 'sj_bone') {
      pct('damageBonus', '攻击伤害加成', value('damage_bonus'))
      pct('speedBonus', '移速加成', value('speed_bonus'))
    } else if (id === 'sj_gate') {
      add('procCap', '每目标爆裂伤害', attack * value('proc_damage'), '', '直接命中触发，每4秒最多一次；四剑为前奏，爆裂结算一次伤害')
      add('stacks', '自动内刺剑数', value('stacks'), '柄')
      add('triggerCooldown', '触发间隔', value('trigger_cooldown'), '秒')
      add('target_cap', '目标上限', value('target_cap'))
      add('radius', '爆裂半径', value('radius'))
    } else if (id === 'vajra') {
      pct('reduction', '常驻减伤', value('reduction'))
      pct('reductionCap', '常驻减伤合计上限', .15)
    } else if (id === 'sj_flight') pct('speedBonus', '移速加成', value('speed_bonus'))
  }
  if (evo) {
    add('trainingRank', '继承基础修炼', `${base.name}${parentLevel}级`,
      '', effective.skills[evo.parent] ? '' : '尚未修炼，按1级预览')
    description += '保留进阶时基础功法至少保留1级；须先退还进阶，才能退空基础功法。'
  }
  if (damageType === 'hybrid') description += '造成物理与法术混合伤害，基础伤害按物理攻击力×50%＋法术攻击力×50%计算，再乘功法倍率，各自享受对应伤害加成。'
  const element = skillElement(id)
  if (damageType !== 'none') {
    add('element', '伤害属性', element === 'none' ? '无属性' : `${ELEMENT_NAMES[element]}属性`)
    description += '面板伤害按武器平均攻击计算；每次施放的实际攻击会在武器范围内浮动。'
  }
  const requirement = requirements(effective, definition, learned, !!snapshot)
  return { id, name: definition.name, category, damageType, element, cooldown, manaCost: base.kind==='active' ? skillManaCost(form.id || id) : 0,
    description: `${preview ? '首级预览。' : ''}${description}`,
    statLines: rows.map(row => row.text), requirementLines: requirement.lines,
    rankRuleLines: rankRuleLines(definition),
    preview, maxed: learned >= definition.maxLevel, learnedLevel: learned, previewLevel: level,
    stats: rows, nextRequirement: requirement.detail, currentForm: form, formLines: describeForm(id, form) }
}

function swordQiFormName(id, form) {
  if (id === 'sj_arc') return form.shape === 'sector' ? '近身月牙' : form.hits > 1 ? '月牙连射' : '月牙飞射'
  if (id === 'sj_cross') return form.shape === 'cross' ? '近身十字斩'
    : form.width > field(skills.get(id), 'width', 1) ? '大型飞行十字斩' : '飞行十字斩'
  return null
}

function describeForm(id, form) {
  const shape = {
    sj_yujian: `${form.swords}把追踪飞剑`, sj_arc: `${swordQiFormName(id, form)}，${form.hits}道月牙`,
    sj_cross: `${swordQiFormName(id, form)}，单发`,
    sj_line: `${form.hits}次同路穿刺`, sj_shadow: `${form.hits}道交错剑痕`,
    sj_wanjian: `${form.swords}剑环身`, sj_formation: '双眼圆形剑阵',
    evo_wanjian: `${form.hits - 1}次向心穿刺＋1记合剑`, evo_tiandi: '一道巨剑重斩',
    evo_wuwo: `${form.swords}剑错轨巡游与近身剑意`, evo_sixiang: '四眼菱形剑阵',
  }[id]
  if (!shape) {
    if (id === 'sj_gate') return ['形态：一次触发，四剑先后快速内刺，再集中爆裂。',
      `范围：目标周围半径${form.radius}，最多${form.targetCap}个目标，各受一次伤害。`,
      '规则：每4秒最多触发一次；爆裂与持续伤害不触发连刺。']
    const scope = {
      sj_heart: '作用范围：自身的直接攻击。',
      sj_mark: '作用范围：被直接攻击命中的敌人，剑痕留在敌人身上。',
      sj_spirit: '作用范围：御剑术索敌距离及自身周围灵石、材料和地面治疗物的拾取范围。',
    }[id] || '作用范围：自身。'
    return [id === 'sj_mark' ? '形态：攻击附带持续剑痕，不增加独立出招。' : '形态：被动生效，不增加攻击次数。', scope]
  }
  const lines = [`形态：${shape}。`, form.hits === null
    ? `打击：持续环绕，同一敌人每${fmt(form.interval)}秒最多1击。`
    : `打击：${id === 'evo_wanjian' ? '归宗一轮' : '整招'}对同一敌人最多${form.hits}击。`]
  if (id === 'evo_wanjian') lines.push(`范围：最远选点距离${form.reach}，飞剑从距落点${form.radius}处沿宽${form.width}的剑路刺入；末段合剑宽${form.width * 2}，从施法起点贯穿落点后再延伸${form.radius}。`)
  else if (form.shape === 'projectile') lines.push(`范围：索敌距离${form.reach}，每剑追击一个目标。`)
  else if (['crescent-projectile', 'cross-projectile'].includes(form.shape)) lines.push(`范围：${id === 'sj_cross' ? '两道交叉月牙的弧形刃面，整体横宽' : '刃面横宽'}${fmt(form.width)}，沿途贯穿至地形阻挡或战场边界；索敌距离${form.reach}。`)
  else if (form.shape === 'cross') lines.push(`范围：身前相交的两道月牙弧形刃面，整体横宽${fmt(form.width)}、刃宽${form.bladeWidth}；刃面间空隙不造成伤害。`)
  else if (form.shape === 'sector') lines.push(`范围：前方${form.angle}°扇区，半径${form.radius}。`)
  else if (form.shape === 'line') lines.push(`范围：最长${form.reach}、宽${form.width}的直线剑路。`)
  else if (form.shape === 'orbit') lines.push(`范围：剑环轨道半径${form.radius}，剑身外缘约${form.radius + form.bladeLength / 2 + form.bladeWidth / 2}${id === 'sj_wanjian' ? `，内侧约${form.innerRadius}为近身空隙` : `，内圈覆盖至半径${form.innerRadius}`}。`)
  else if (form.shape === 'diamond') lines.push(`范围：菱形内部，中心至顶点${form.radius}。`)
  else if (form.shape === 'shadow') lines.push(`范围：落点周围半径${form.radius}内的交错剑路，剑路宽${form.width}。`)
  else lines.push(`范围：落点半径${form.radius}的圆形区域${form.reach ? `，最远布置距离${form.reach}` : ''}。`)
  const lock = {
    sj_yujian: '无目标时逐把蓄剑；按血量派剑并计入在途伤害，多余悬停，高血量目标可全部集火。',
    sj_arc: form.shape === 'sector' ? '整招方向固定，从人物当时的位置挥出。'
      : '整招方向固定，各发从人物当时位置射出；离体后不跟随人物或追敌，尾光无伤害。',
    sj_cross: form.shape === 'cross' ? '两道月牙在身前固定位置交叉斩击，锋面共同朝前、末端后掠，共用每敌一次命中。'
      : '两道月牙交叉飞行，锋面共同朝向前进方向、末端后掠；离体后保持形状与方向，共用每敌一次命中，尾光无伤害。',
    sj_line: '首刺锁定起点与方向，后续穿刺沿原剑路发出。',
    sj_shadow: '出招时固定落点，后续剑痕不追随敌人。',
    sj_wanjian: '剑环跟随人物移动，只有剑身扫过才会命中。',
    sj_formation: '起手时锁定落点，剑阵固定在原地，不追随敌人；剑雨余光不追加伤害。',
    evo_wanjian: '归宗落点固定，穿刺与末段合剑各自命中所在剑路。',
    evo_tiandi: '蓄势末段同时锁定起点与方向，人物移动不改变剑路；地面裂光不追加伤害。',
    evo_wuwo: '飞剑沿不同轨迹护身，剑境随人物移动；近身剑意与飞剑共用命中间隔。',
    evo_sixiang: '施放后四个阵眼固定在原地，阵眼数量不倍增击数。',
  }[id]
  lines.push(`定位：${lock}`)
  if (form.targetCap > 0 && form.shape !== 'projectile') lines.push(`每击最多覆盖${form.targetCap}个敌人。`)
  return lines
}

function compareForms(current, next) {
  const lines = []
  const currentName = swordQiFormName(current.id, current), nextName = swordQiFormName(next.id, next)
  if (currentName && currentName !== nextName) lines.push(`形态突破：${currentName} → ${nextName}。`)
  const geometryKeys = form => !swordQiFormName(form.id, form) ? null
    : form.shape === 'sector' ? ['radius', 'angle']
      : form.shape === 'cross' ? ['width', 'bladeWidth'] : ['reach', 'width', 'bladeWidth']
  const currentGeometry = geometryKeys(current), nextGeometry = geometryKeys(next)
  for (const [key, label, unit] of [
    ['hits', '同敌最多命中', '击'], ['swords', '剑数', '把'], ['eyes', '阵眼', '个'],
    ['radius', '范围半径', ''], ['reach', '射程', ''], ['width', '剑路宽度', ''],
    ['angle', '扇区角度', '°'], ['targetCap', '每击目标上限', '个'],
    ['interval', '命中间隔', '秒'], ['duration', '持续时间', '秒'],
  ]) {
    if (['radius', 'reach', 'width', 'angle'].includes(key)
      && (currentGeometry && !currentGeometry.includes(key) || nextGeometry && !nextGeometry.includes(key))) continue
    const shownLabel = currentName && key === 'reach' ? '索敌距离'
      : currentName && key === 'width' ? '刃面横宽' : label
    if (current[key] !== next[key] && current[key] != null && next[key] != null)
      lines.push(`${shownLabel}：${fmt(current[key])} → ${fmt(next[key])}${unit}。`)
  }
  if (currentName === nextName && ['shape', 'hits', 'swords', 'eyes'].every(key => current[key] === next[key]))
    lines.unshift('本级形态不变，沿用当前打击方式。')
  return lines
}

/** Predict by copying the current combat loadout, so in-run previews keep the
 * snapshot's XP, equipment, passives and parent rank without spending anything. */
export function skillPresentation(state, id) {
  const current = presentRank(state, id)
  if (!current) return null
  if (current.maxed) return { ...current, nextForm: null, nextFormLines: [], nextPreview: null }
  const definition = skills.get(id) || evolutions.get(id)
  const snapshot = state.activeRun?.snapshot
  const nextLoadout = JSON.parse(JSON.stringify(snapshot?.loadout || combatLoadout(state)))
  const rank = current.learnedLevel + 1
  if (definition.kind === 'evolution') {
    nextLoadout.evolutionLevels[id] = rank
    if (!nextLoadout.evolutions.includes(id)) nextLoadout.evolutions.push(id)
  } else nextLoadout[definition.kind === 'active' ? 'active' : 'passive'][id] = rank
  const projected = presentRank({ ...state, activeRun: { snapshot: {
    player: { xp: snapshot?.player.xp ?? state.xp }, loadout: nextLoadout,
  } } }, id)
  return { ...current, nextForm: projected.currentForm,
    nextFormLines: current.preview ? ['学习后获得上述首级形态。'] : compareForms(current.currentForm, projected.currentForm),
    nextPreview: { level: rank, currentForm: projected.currentForm, formLines: projected.formLines,
      description: projected.description, stats: projected.stats, statLines: projected.statLines, cooldown: projected.cooldown } }
}
