import { EQUIPMENT_ROSTER } from './TowerEquipmentRoster.js'
import { equipmentBaseAttributes, primaryAttributeLines, DEFENSE_REFERENCE } from './TowerEquipmentBases.js'
export { DEFENSE_REFERENCE } from './TowerEquipmentBases.js'
// Revision 43: ring offense and armor defense. Pure item data/quotes only;
// regeneration integration and persistence belong to combat.
import { OPEN_EQUIPMENT_TIERS, equipmentTier, isStarterEquipment } from './TowerEquipmentTiers.js'
import { EQUIPMENT_LORE } from './TowerEquipmentLore.js'
function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze)
    Object.freeze(value)
  }
  return value
}
const categoryNames = { armor: '防具', ring: '戒指' }
const tierNames = Object.fromEntries(OPEN_EQUIPMENT_TIERS.map(t => [t, equipmentTier(t).name]))
const qualityNames = ['初始','下品','中品','上品','极品']
export const EQUIPMENT = freeze(EQUIPMENT_ROSTER.filter(d => d.category !== 'weapon').map(d => ({
  ...d, qualities: [d.quality], tags: [], description: EQUIPMENT_LORE[d.id],
})))
export const ARMORS = freeze(EQUIPMENT.filter(d => d.category === 'armor'))
export const RINGS = freeze(EQUIPMENT.filter(d => d.category === 'ring'))
const definitions = new Map(EQUIPMENT.map(d => [d.id,d]))
// HISTORICAL random-roll ranges, retained only for compatibility with older tools.
// Not authoritative fixed-instance values; use createFixedEquipment + modifiers.
// Base-only ranges. Values are percentage points except healDelay (seconds).
// Refinement is disabled; its former share is included in the base maxima.
// Ring share is bounded for p in [0,1], q in [0,.5] by .5*C+K+focus.
export const RING_AFFIX_RANGES = freeze({
  fan: [null,
    { critChance: [.2,.5] },
    { critChance: [.3,.6], critBonus: [.1,.3], cooldownReduction: [.1,.2] },
    { critChance: [.4,.8], critBonus: [.2,.4], cooldownReduction: [.2,.3] },
    { critChance: [.5,1], critBonus: [.2,.5], focus: [.1,.2], cooldownReduction: [.2,.4] }],
  fa: [null,
    { critChance: [.5,1] },
    { critChance: [.6,1.2], critBonus: [.2,.5], cooldownReduction: [.2,.4] },
    { critChance: [.8,1.5], critBonus: [.3,.7], cooldownReduction: [.3,.6] },
    { critChance: [1,2], critBonus: [.5,1], focus: [.2,.4], cooldownReduction: [.4,.8] }],
  bao: [null,
    { critChance:[1,2] },
    { critChance:[1,2], critBonus:[.5,1.5], cooldownReduction:[.5,1] },
    { critChance:[1,3], critBonus:[1,2], cooldownReduction:[1,1.5] },
    { critChance:[1,3], critBonus:[1,2], focus:[.4,.8], cooldownReduction:[1,1.5] },
  ],
  ling: [null,
    { critChance:[3,6] },
    { critChance:[2,4], critBonus:[1,2], cooldownReduction:[1,1.5] },
    { critChance:[3,5], critBonus:[1.5,3], cooldownReduction:[1.5,2.5] },
    { critChance:[3,6], critBonus:[2,3], focus:[1,2], cooldownReduction:[2,2.5] },
  ],
})
const upperArmor = freeze({
  bao: [null,
    { hpBonus:[2,3], reduction:[.5,1.5], healFraction:[.2,.3] },
    { hpBonus:[2,4], reduction:[1,2.5], healFraction:[.3,.4] },
    { hpBonus:[3,5], reduction:[1.5,3], healFraction:[.4,.5] },
    { hpBonus:[4,6], reduction:[2,3], healFraction:[.5,.6], healDelay:[2,2] },
  ],
  ling: [null,
    { hpBonus:[4,5], reduction:[1.5,3], healFraction:[.4,.5] },
    { hpBonus:[4,6], reduction:[2.5,4], healFraction:[.5,.6] },
    { hpBonus:[5,8], reduction:[3,5], healFraction:[.6,.8] },
    { hpBonus:[6,10], reduction:[4,6], healFraction:[.8,1], healDelay:[2,2] },
  ],
})
// Early armor preserves the same recovery timings, with smaller percentages.
const scaleArmor = factor => upperArmor.bao.map(spec => spec && Object.fromEntries(
  Object.entries(spec).map(([key, bounds]) => [key, key === 'healDelay' ? bounds :
    bounds.map(n => Math.max(.1, Math.floor(n * factor * 10 + 1e-8) / 10))])))
export const ARMOR_AFFIX_RANGES = freeze({ fan: scaleArmor(.3), fa: scaleArmor(.6), ...upperArmor })
const own = (o,k) => Object.prototype.hasOwnProperty.call(o,k)
const record = v => v !== null && typeof v === 'object' && !Array.isArray(v)
const exact = (v,keys) => record(v) && Object.keys(v).length === keys.length && keys.every(k => own(v,k))
const categoryValid = c => c === 'armor' || c === 'ring'
const validId = id => typeof id === 'string' && id.trim().length > 0 && id === id.trim()
  && !['iron','basic-armor','basic-ring'].includes(id)
const dec = n => Number(n.toFixed(12))
// Fixed reference for both damage types; never changes silently with enemy level.
const armorRows = freeze({
  fan: [null,[.6,.24,.075]],
  fa: [null,[3,2,.15],[10,4,.21],[17,7,.28],[24,10,.35]],
  bao: [null,[6,4,.3],[13,7,.4],[20,10,.5],[27,13,.6]],
  ling: [null,[9,6,.55],[16,9,.65],[23,12,.8],[30,16,.98]],
})
const armorRoleBudgets = freeze({fan:[0,0,0],fa:[.15,.1,.04],bao:[.2,.12,.06],ling:[.25,.15,.08]})
// Retain authored identities/art. Top quality continues the two build choices,
// rather than making the historical "master" identity a universal upgrade.
const martialArmor = d => d.role === 'guard' || d.role === 'graduate'
const casterArmor = d => d.role === 'recovery' || d.role === 'master'
const armorOffense = freeze({
  fa: { speed:[2,3,4,5] },
  bao: { speed:[3,4,5,6] },
  ling: { speed:[4,5,6,8] },
})
export function createBasicEquipment(category) {
  if (!categoryValid(category)) throw new RangeError('Invalid equipment category')
  return {id:`basic-${category}`,definitionId:`eq_${category}_basic`,category,
    tier:'fan',quality:0,refine:0,locked:false,affixes:[]}
}
// Fixed identity budgets. Regeneration is fixed HP/second and clamps to missing HP.
function fixedAffixes(d) {
  if (!d.quality) return []
  const q = d.quality
  let values
  if (d.category === 'armor') {
    values = {hpBonus:armorRows[d.tier][q][0]}
    const offense = armorOffense[d.tier]
    if (martialArmor(d)) {
      values.hpBonus += armorRoleBudgets[d.tier][0] - q * .5
      values.attackSpeed = offense.speed[q-1]
    }
    if (casterArmor(d)) {
      values.hpBonus -= q
      values.castSpeed = offense.speed[q-1] * 2
      values.cooldownReduction = q * .3
    }
    // Percentage points of max HP per three-second pulse, added to base 1/60.
    values.healthRegen = Number((Math.min(1 / 120, q / 480 + (casterArmor(d) ? 1 / 1200 : 0))
      * (martialArmor(d) ? .75 : 1) * 100).toFixed(5))
  } else {
    // [crit chance, crit bonus, cooldown reduction, focus], percentage points.
    // Existing ring share and scheduling remain; full matched-set targets are
    // calibrated in TowerWeapons. Cross-tier middle dominance is retired.
    const rows = {
      fan: {transition:[.2,.1,.06,0]},
      fa: {
        burst: [null,[.5,.1,.1,0],[.8,.2,.2,0],[1.1,.35,.3,0]],
        cadence:[null,[.3,.1,.2,0],[.6,.2,.3,0],[.9,.3,.4,0]],
        graduate:[1.2,.4,.4,.1],
      },
      bao: {
        burst:[null,[2,.6,.4,0],[3,1,.6,0],[3.8,1.4,.9,0]],
        cadence:[null,[1.5,.5,.7,0],[2,.8,1.1,0],[3,1.2,1.2,0]],
        graduate:[4,1.5,1.2,.2],
      },
      ling: {
        burst:[null,[4.5,1.5,1.1,0],[6,2,1.4,0],[7,2.4,2,0]],
        cadence:[null,[3.5,1.2,1.8,0],[4.5,1.5,2,0],[6.5,2.2,2.5,0]],
        graduate:[7.5,2.5,2.5,.4],
      },
    }
    const spec = rows[d.tier][d.role === 'master' ? 'graduate' : d.role]
    const [critChance,critBonus,cooldownReduction,focus] = q === 4 || d.tier === 'fan' ? spec : spec[q]
    values = {critChance,critBonus,cooldownReduction}
    const skillDamage = {"fan": [0, 0], "fa": [0, 2, 3, 4, 5], "bao": [0, 4, 5, 5.5, 6], "ling": [0, 6, 7, 8, 9]}[d.tier][q]
    if (skillDamage) values.skillDamage = skillDamage
    if (d.role === 'master') { values.critChance += 1.5; values.critBonus += .3 }
  }
  return Object.entries(values).map(([type,value]) => ({type,value:Number(value.toFixed(5))}))
}
export function createFixedEquipment(definitionId, instanceId) {
  const d = definitions.get(definitionId)
  if (!d || (d.quality ? !validId(instanceId) : instanceId !== `basic-${d.category}`)) throw new RangeError('Invalid fixed equipment arguments')
  return {id:instanceId,definitionId:d.id,category:d.category,tier:d.tier,quality:d.quality,refine:0,locked:false,affixes:fixedAffixes(d)}
}
export function rollEquipment(category,tier,quality,random,instanceId) {
  const pool = EQUIPMENT.filter(d => d.category === category && d.tier === tier && d.quality === quality && quality > 0)
  if (!pool.length || typeof random !== 'function' || !validId(instanceId)) throw new RangeError('Invalid equipment roll arguments')
  const n = random()
  if (!Number.isFinite(n) || n < 0 || n >= 1) throw new RangeError('Equipment RNG must return [0,1)')
  return createFixedEquipment(pool[Math.floor(n * pool.length)].id,instanceId)
}
export function validateEquipment(instance,category) {
  if (category !== undefined && !categoryValid(category)) return false
  if (!exact(instance,['id','definitionId','category','tier','quality','refine','locked','affixes'])) return false
  const d = definitions.get(instance.definitionId)
  if (!d || instance.category !== d.category || category !== undefined && category !== d.category
    || instance.tier !== d.tier || instance.quality !== d.quality || instance.refine !== 0
    || typeof instance.locked !== 'boolean' || !Array.isArray(instance.affixes)) return false
  if (!d.quality) return instance.id === `basic-${d.category}` && instance.affixes.length === 0
  if (!validId(instance.id)) return false
  const expected = fixedAffixes(d)
  return instance.affixes.length === expected.length && expected.every(a => instance.affixes.filter(b =>
    exact(b,['type','value']) && b.type === a.type && b.value === a.value).length === 1)
}
function checked(instance,category) {
  if (!validateEquipment(instance,category)) throw new RangeError('Invalid equipment instance')
  return definitions.get(instance.definitionId)
}
const value = (instance,type) => instance.affixes.find(a => a.type === type)?.value ?? 0
export function ringDamageModifiers(instance) {
  const d = checked(instance,'ring')
  if (isStarterEquipment(instance)) return {critChance:0,critBonus:0,special:0}
  return {critChance:value(instance,'critChance')/100,
    critBonus:value(instance,'critBonus')/100,special:value(instance,'focus')/100,skillDamage:value(instance,'skillDamage')/100}
}
/** Fraction applied to eligible base cooldowns by the runtime. Never changes
 * damage per hit, projectile count, windup, hit windows or healing cooldowns.
 * Caller must not apply the same reduction twice to an evolved parent. */
export function ringCooldownReduction(instance) {
  checked(instance,'ring')
  return value(instance,'cooldownReduction')/100
}
/** Bonus percentage points of max HP per three-second pulse; no hit trigger or floor cap. */
export function armorModifiers(instance) {
  const d = checked(instance,'armor')
  const base = equipmentBaseAttributes(d)
  const defenses = {physicalDefense:base.physicalDefense,magicDefense:0}
  const physicalReduction = defenses.physicalDefense / (defenses.physicalDefense + DEFENSE_REFERENCE)
  const magicReduction = defenses.magicDefense / (defenses.magicDefense + DEFENSE_REFERENCE)
  // `reduction` is a compatibility summary for a 50/50 damage mix, NOT an extra layer.
  const common = {...defenses,physicalReduction,magicReduction,reduction:(physicalReduction+magicReduction)/2,
    cooldownReduction:value(instance,'cooldownReduction')/100,castSpeed:value(instance,'castSpeed')/100,
    attackSpeed:value(instance,'attackSpeed')/100,
    strength:base.strength??0,intelligence:base.intelligence??0}
  return {...common,hpBonus:value(instance,'hpBonus')/100,healthRegen:value(instance,'healthRegen')}
}
export function armorDamageMultiplier(instance, damageType = 'physical') {
  return equipmentDamageMultiplier({armor:instance},damageType)
}
export function equipmentDefenses(loadout) {
  return {
    physicalDefense:loadout?.armor?equipmentBaseAttributes(checked(loadout.armor,'armor')).physicalDefense:0,
    magicDefense:loadout?.ring?equipmentBaseAttributes(checked(loadout.ring,'ring')).magicDefense:0,
  }
}
export function equipmentDamageMultiplier(loadout, damageType = 'physical') {
  if (!['physical','magic','hybrid'].includes(damageType)) throw new RangeError('Invalid incoming damage type')
  const d=equipmentDefenses(loadout)
  const physical=DEFENSE_REFERENCE/(DEFENSE_REFERENCE+d.physicalDefense)
  const magic=DEFENSE_REFERENCE/(DEFENSE_REFERENCE+d.magicDefense)
  return damageType==='physical'?physical:damageType==='magic'?magic:(physical+magic)/2
}
export function equipmentName(instance) {
  const d = checked(instance)
  return d.tier === 'fan' ? `凡器·${d.name}` : `${tierNames[d.tier]}${qualityNames[instance.quality]}·${d.name}`
}
function equipmentSections(instance) {
  const d = checked(instance)
  const baseAttributes=equipmentBaseAttributes(d)
  const baseLines=[d.category==='armor'?`物理防御 +${Number(baseAttributes.physicalDefense.toFixed(2))}`
    :`法术防御 +${Number(baseAttributes.magicDefense.toFixed(2))}`,...primaryAttributeLines(baseAttributes)]
  const result={baseAttributes,baseLines,ordinaryLines:[],specialLines:[]}
  if (isStarterEquipment(instance)) return result
  if (d.category === 'ring') {
    const m = ringDamageModifiers(instance)
    const lines = [...(value(instance,'skillDamage') ? [`功法伤害 +${value(instance,'skillDamage')}%`] : []),`物理／法术暴击率 +${dec(m.critChance*100)}%`]
    if (value(instance,'critBonus')) lines.push(`物理／法术暴击伤害 +${value(instance,'critBonus')}%`)
    if (ringCooldownReduction(instance)) lines.push(`所有技能冷却时间 -${value(instance,'cooldownReduction')}%`)
    return {...result,ordinaryLines:lines}
  }
  const m = armorModifiers(instance)
  return {...result,ordinaryLines:[`气血上限 +${dec(m.hpBonus*100)}%`,
    ...(m.attackSpeed ? [`普攻速度 +${dec(m.attackSpeed*100)}%`] : []),
    ...(m.castSpeed ? [`施法速度 +${dec(m.castSpeed*100)}%`] : []),
    ...(m.cooldownReduction ? [`所有技能冷却时间 -${dec(m.cooldownReduction*100)}%`] : [])],
    specialLines:[`气血回复 +${m.healthRegen}%/3秒`]}
}
export function equipmentDescription(instance) {
  const s=equipmentSections(instance)
  return [...s.baseLines,...s.ordinaryLines,...s.specialLines]
}
export function equipmentSummary(instance) {
  const d = checked(instance)
  const modifiers = d.category === 'ring' ? ringDamageModifiers(instance) : armorModifiers(instance)
  const sections=equipmentSections(instance)
  return {id:instance.id,definitionId:d.id,name:equipmentName(instance),category:d.category,
    categoryName:categoryNames[d.category],tier:d.tier,tierName:tierNames[d.tier],quality:instance.quality,
    qualityName:d.tier==='fan'?'':qualityNames[instance.quality],tags:[...d.tags],refine:instance.refine,locked:instance.locked,description:d.description,
    affixes:instance.affixes.map(a => ({...a})),modifiers,
    ...(d.category === 'ring' ? {cooldownReduction:ringCooldownReduction(instance)} : {}),
    ...sections,affixLines:[...sections.ordinaryLines,...sections.specialLines],
    lines:equipmentDescription(instance)}
}
