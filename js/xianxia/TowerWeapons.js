import { FIXED_EQUIPMENT } from './TowerEquipmentFixed.js'
import { weaponBasePoints } from './TowerWeaponBases.js'
import { equipmentBaseAttributes, primaryAttributeLines } from './TowerEquipmentBases.js'
import { EQUIPMENT_ROSTER } from './TowerEquipmentRoster.js'
// Revision 43 pure weapon data. Affix values are percentage points in saves,
// except `attack` which is fixed attack points; modifiers are fractions.
// No RNG, counters, persistence or combat side effects
// are owned here. The caller supplies RNG and a unique instance ID.
import { OPEN_EQUIPMENT_TIERS, equipmentTier, isStarterEquipment } from './TowerEquipmentTiers.js'
import { EQUIPMENT_LORE } from './TowerEquipmentLore.js'
import { ELEMENT_NAMES, skillElement, validWeaponElement } from './TowerWeaponElements.js'
function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze)
    Object.freeze(value)
  }
  return value
}
export const WEAPONS = freeze(EQUIPMENT_ROSTER.filter(d => d.category === 'weapon').map(d => ({
  ...d, qualities: [d.quality], tags: [], affinity: ['qi','formation'].includes(d.role) ? d.role : 'general',
  description: EQUIPMENT_LORE[d.id],
})))
const definitions = new Map(WEAPONS.map(w => [w.id, w]))
// Neutral reference rows for older consumers. Per-identity values are available
// through weaponFlatAttack / weaponFlatMagicAttack and weaponSummary.
export const WEAPON_BASE_ATTACK = freeze(Object.fromEntries(
  OPEN_EQUIPMENT_TIERS.map(tier=>[tier, (tier==='fan'?[0,1]:[0,1,2,3,4]).map(quality=>
    weaponBasePoints({tier,quality,role:'general'}).physical)])))
export const WEAPON_BASE_MAGIC_ATTACK = WEAPON_BASE_ATTACK
// HISTORICAL random-roll ranges only; fixed factories are authoritative.
export const WEAPON_AFFIX_RANGES = freeze({
  fan: [null,
    { A: [.1, .3], S: [.3, .7] }, { A: [.2, .4], S: [.4, 1] },
    { A: [.3, .5], S: [.5, 1], F: [.2, .5] }, { A: [.4, .6], S: [.6, 1.2], F: [.3, .7] }],
  fa: [null,
    { A: [.3, .5], S: [.5, 1] }, { A: [.4, .8], S: [.8, 1.5] },
    { A: [.5, 1], S: [1, 2], F: [.3, .7] }, { A: [.6, 1.2], S: [1.2, 2.5], F: [.5, 1] }],
  bao: [null,
    { A: [.4, .8], S: [.8, 1.5] }, { A: [.5, 1], S: [1, 2] },
    { A: [.6, 1.2], S: [1.2, 2.5], F: [.5, 1] }, { A: [.8, 1.5], S: [1.5, 3], F: [.7, 1.5] }],
  ling: [null,
    { A: [.5, 1], S: [1, 3] }, { A: [.7, 1.5], S: [1.5, 3.5] },
    { A: [1, 2], S: [2, 3], F: [.5, 1] }, { A: [1, 2], S: [2, 4], F: [1, 2] }],
})
export const WEAPON_ATTACK_REFERENCE = freeze(Object.fromEntries(
  OPEN_EQUIPMENT_TIERS.map(tier => [tier, equipmentTier(tier).referenceAttack])))
export const WEAPON_FIXED_ATTACK_RANGES = freeze(Object.fromEntries(
  Object.entries(WEAPON_AFFIX_RANGES).map(([tier, specs]) => [tier, specs.map(spec =>
    spec && spec.A.map(amount => Math.max(.1, Math.floor(amount * .008 * WEAPON_ATTACK_REFERENCE[tier] * 10 + 1e-8) / 10)))])))
const families = freeze({
  // 2026-11-06：御剑流派与85号共鸣一致（御剑术、分光连斩，万剑归宗经进化归属继承）。
  yujian: ['sj_yujian', 'sj_shadow'], qi: ['sj_arc', 'sj_moon', 'sj_moon_triple', 'sj_line', 'sj_cross'], formation: ['sj_wanjian', 'sj_formation', 'sj_sancai'],
})
const evolutionFamilies = freeze({
  evo_wanjian: 'sj_yujian', evo_tiandi: 'sj_line', evo_wuwo: 'sj_wanjian', evo_sixiang: 'sj_formation',
})
const skillNames = freeze({ sj_yujian: '御剑术', sj_shadow: '分光连斩', sj_arc: '流云斩', sj_moon: '玄月斩', sj_moon_triple: '逐月斩', sj_cross: '双月斩',
  sj_line: '剑破虚空', sj_wanjian: '周天剑阵', sj_formation: '两仪剑阵', sj_sancai: '三才剑阵' })
const own = (o, key) => Object.prototype.hasOwnProperty.call(o, key)
const record = x => x !== null && typeof x === 'object' && !Array.isArray(x)
const exactKeys = (x, keys) => record(x) && Object.keys(x).length === keys.length && keys.every(k => own(x, k))
const validId = id => typeof id === 'string' && id.trim().length > 0 && id === id.trim() && !['iron','basic-armor','basic-ring'].includes(id)

export function createIronWeapon() {
  // `locked` is a retired serialized field, with no gameplay or UI behavior.
  return { id: 'iron', definitionId: 'eq_sword_iron', tier: 'fan', quality: 0, refine: 0, locked: false, affixes: [] }
}

// Percentages are recalibrated offline after allocating the fixed attack budget.
function fixedAffixes(d) { return FIXED_EQUIPMENT[d.id].affixes.map(a=>({...a})) }
export function createFixedWeapon(definitionId, instanceId) {
  const d = definitions.get(definitionId)
  if (!d || (d.quality ? !validId(instanceId) : instanceId !== 'iron')) throw new RangeError('Invalid fixed weapon arguments')
  return {id:instanceId,definitionId:d.id,tier:d.tier,quality:d.quality,refine:0,locked:false,affixes:fixedAffixes(d)}
}
/** One RNG draw chooses identity only; affixes never roll. */
export function rollWeapon(tier, quality, random, instanceId) {
  const pool = WEAPONS.filter(d => d.tier === tier && d.quality === quality && quality > 0)
  if (!pool.length || typeof random !== 'function' || !validId(instanceId)) throw new RangeError('Invalid weapon roll arguments')
  const n = random()
  if (!Number.isFinite(n) || n < 0 || n >= 1) throw new RangeError('Weapon RNG must return [0, 1)')
  return createFixedWeapon(pool[Math.floor(n * pool.length)].id, instanceId)
}
/** Exact fixed affixes; order is immaterial, values/slots/targets cannot vary. */
export function validateWeapon(instance) {
  if (!exactKeys(instance, ['id','definitionId','tier','quality','refine','locked','affixes'])) return false
  const d = definitions.get(instance.definitionId)
  if (!d || instance.tier !== d.tier || instance.quality !== d.quality || instance.refine !== 0
    || typeof instance.locked !== 'boolean' || !Array.isArray(instance.affixes)) return false
  if (!d.quality) return instance.id === 'iron' && instance.affixes.length === 0
  if (!validId(instance.id)) return false
  const expected = fixedAffixes(d)
  if (instance.affixes.length !== expected.length) return false
  return expected.every(a => instance.affixes.filter(b => exactKeys(b,Object.keys(a))
    && Object.keys(a).every(k => b[k] === a[k])).length === 1)
}
function checked(instance) {
  if (!validateWeapon(instance)) throw new RangeError('Invalid weapon instance')
  return definitions.get(instance.definitionId)
}
const zero = () => ({ flat: 0, critChance: 0, critBonus: 0, special: 0, lifesteal: 0 })
const decimal = n => Number(n.toFixed(12))

/** Fixed points added AFTER cultivation: 100 * cultivation + fixedAttack.
 * Includes fixed weapon base plus a rolled attack affix. Do not add
 * summary.baseAttack again; it is already included in this total.
 */
export function weaponFlatAttack(instance) {
  const d = checked(instance)
  return weaponBasePoints(d).physical
}
export function weaponFlatMagicAttack(instance) {
  const d = checked(instance)
  return weaponBasePoints(d).magic
}

function attackRange(mean) {
  const spread = Math.max(1, Math.round(mean * .2))
  return { min: Number((mean - spread).toFixed(1)), max: Number((mean + spread).toFixed(1)), mean }
}
export function weaponAttackRange(instance) { return attackRange(weaponFlatAttack(instance)) }
export function weaponMagicAttackRange(instance) { return attackRange(weaponFlatMagicAttack(instance)) }
/** One inclusive tenth-point roll per cast, shared by all its pulses. */
export function rollWeaponAttack(instance, random, type = 'physical') {
  if (!Number.isFinite(random) || random < 0 || random >= 1) throw new RangeError('Invalid weapon attack roll')
  if (!['physical','magic'].includes(type)) throw new RangeError('Invalid weapon attack type')
  const { min, max } = type === 'magic' ? weaponMagicAttackRange(instance) : weaponAttackRange(instance)
  const steps = Math.round((max - min) * 10)
  return Number((min + Math.min(steps, Math.floor(random * (steps + 1))) / 10).toFixed(1))
}
export function weaponAttackProfile(instance) {
  const d = checked(instance)
  const speed = (instance.affixes.find(a => a.type === 'attackSpeed')?.value ?? 0) / 100
  const target = instance.affixes.find(a => a.type === 'element')?.target
  return { interval: 1 / (1 + speed), duration: .2 / (1 + speed),
    reach: 110, coefficient: .3, speed,
    onHit: (instance.affixes.find(a => a.type === 'onHit')?.value ?? 0) / 100,
    bleedConversion: (instance.affixes.find(a => a.type === 'bleedConversion')?.value ?? 0) / 100,
    bleed: (instance.affixes.find(a => a.type === 'bleed')?.value ?? 0) / 100,
    hitElement: target === 'all' ? d.role === 'general' ? 'fire' : 'thunder' : target ?? 'none' }
}
export function weaponElementBonus(instance, element) {
  checked(instance)
  if (!validWeaponElement(element)) throw new RangeError('Invalid weapon element')
  if (element === 'none') return 0
  const affix = instance.affixes.find(a => a.type === 'element' && [element, 'all'].includes(a.target))
  return (affix?.value ?? 0) / 100
}

/** Weapon-only additive coefficients, including weapon critical chance and damage.
 * Ring critical bonuses are combined by combat; special/lifesteal remain zero.
 * `hybrid` weights physical/magic A by 50%; S/F each apply once. Refinement is disabled.
 * Fixed points are excluded here; use weaponFlatAttack separately.
 */
export function weaponDamageModifiers(instance, skillId, damageType, element = skillElement(skillId)) {
  const d = checked(instance)
  if (!['physical', 'hybrid', 'magic', 'none'].includes(damageType) || typeof skillId !== 'string'
    || !validWeaponElement(element)) {
    throw new RangeError('Invalid weapon damage query')
  }
  const result = zero()
  if (isStarterEquipment(instance) || damageType === 'none') return result
  result.critChance = (instance.affixes.find(a => a.type === 'critChance')?.value ?? 0) / 100
  result.critBonus = (instance.affixes.find(a => a.type === 'critBonus')?.value ?? 0) / 100
  const family = own(evolutionFamilies, skillId) ? evolutionFamilies[skillId] : skillId
  const flow = families.qi.includes(family) ? 'qi' : families.formation.includes(family) ? 'formation' : families.yujian.includes(family) ? 'yujian' : null
  for (const a of instance.affixes) {
    const v = a.value / 100
    if (a.type === 'physical' || a.type === 'magic') {
      if (damageType === a.type) result.flat += v
      else if (damageType === 'hybrid') result.flat += v / 2
    } else if (a.type === 'skill' && a.target === family || a.type === 'flow' && a.target === flow) result.flat += v
  }
  result.flat += weaponElementBonus(instance, element)
  return Object.fromEntries(Object.entries(result).map(([k, v]) => [k, decimal(v)]))
}
const tierNames = Object.fromEntries(OPEN_EQUIPMENT_TIERS.map(t => [t, equipmentTier(t).name]))
const qualityNames = ['初始', '下品', '中品', '上品', '极品']
export function weaponName(instance) {
  const d = checked(instance)
  return d.tier === 'fan' ? `凡器·${d.name}` : `${tierNames[d.tier]}${qualityNames[instance.quality]}·${d.name}`
}
function weaponSections(instance) {
  const d = checked(instance)
  const lines = instance.affixes.map(a => {
    const v = Number(a.value.toFixed(2))
    switch (a.type) {
      case 'attack': return `攻击 +${v}`
      case 'physical': return `物理伤害 +${v}%`
      case 'magic': return `法术伤害 +${v}%`
      case 'skill': return `${skillNames[a.target]}${Object.values(evolutionFamilies).includes(a.target) ? '及其进化' : ''}伤害 +${v}%`
      case 'flow': return `${({ qi: '剑气', yujian: '御剑', formation: '剑阵' })[a.target]}流派伤害 +${v}%`
      case 'attackSpeed': return `普攻速度 +${v}%`
      case 'critChance': return `物理／法术暴击率 +${v}%`
      case 'critBonus': return `物理／法术暴击伤害 +${v}%`
      case 'onHit': return `附加伤害 +${v}%`
      case 'skillLevel': return `${a.target==='all'?'所有':a.target+'境界'}技能等级 +1（已学习，可突破满级）`
      case 'bleedConversion': return `流血转化 ${v}%：从原伤害中扣除，3秒内结算`
      case 'bleed': return `流血伤害 +${v}%；第2层起每层+1%，最多11层（+10%）`
      case 'element': return `${ELEMENT_NAMES[a.target]}${a.target === 'all' ? '' : '属性'}伤害 +${v}%`
      default: throw new RangeError('Invalid affix')
    }
  })
  const range = weaponAttackRange(instance), magic = weaponMagicAttackRange(instance)
  return {baseAttributes:equipmentBaseAttributes(d),
    baseLines:[`基础物理攻击 +${range.min}～${range.max}`,
      `基础法术攻击 +${magic.min}～${magic.max}`,...primaryAttributeLines(equipmentBaseAttributes(d))],
    ordinaryLines:lines.filter((_,i)=>!['skill','flow','element','bleed','bleedConversion','skillLevel'].includes(instance.affixes[i].type)),
    specialLines:lines.filter((_,i)=>['skill','flow','element','bleed','bleedConversion','skillLevel'].includes(instance.affixes[i].type))}
}
export function weaponDescription(instance) {
  const s=weaponSections(instance)
  return [...s.baseLines,...s.ordinaryLines,...s.specialLines]
}
/** Detached UI view. `fixedAttack` is the total fixed point bonus, including
 * iron's +5. `baseAttack` is the fixed tier/quality part of that total;
 * these are not additive. `refineBonus` stays zero while refinement is disabled. Learned-skill status
 * cannot be inferred from an instance; callers can match `skillTargets` against
 * the character's skill set without unlocking anything.
 */
export function weaponSummary(instance) {
  const d = checked(instance)
  const sections=weaponSections(instance)
  return {
    id: instance.id, definitionId: d.id, name: weaponName(instance),
    tier: d.tier, tierName: tierNames[d.tier], quality: instance.quality, qualityName: d.tier === 'fan' ? '' : qualityNames[instance.quality],
    affinity: d.affinity, tags: [...d.tags], description: d.description, refine: instance.refine, locked: instance.locked,
    baseAttack: weaponBasePoints(d).physical,
    fixedAttack: weaponFlatAttack(instance),
    baseMagicAttack: weaponBasePoints(d).magic,
    fixedMagicAttack: weaponFlatMagicAttack(instance), magicAttackRange: weaponMagicAttackRange(instance),
    attackRange: weaponAttackRange(instance), attackProfile: weaponAttackProfile(instance),
    ...sections,
    affixLines: [...sections.ordinaryLines,...sections.specialLines],
    refineBonus: 0,
    skillTargets: instance.affixes.filter(a => a.type === 'skill').map(a => a.target),
    affixes: instance.affixes.map(a => ({ ...a })), lines: weaponDescription(instance),
  }
}
