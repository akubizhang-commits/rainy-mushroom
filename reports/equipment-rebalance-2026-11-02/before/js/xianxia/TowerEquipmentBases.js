// Fixed identity attributes. These are not affixes and never roll independently.
import { EQUIPMENT_ROSTER } from './TowerEquipmentRoster.js'
import { weaponBasePoints } from './TowerWeaponBases.js'
export const VITALITY_HP = 10
export const DEFENSE_REFERENCE = 1000
export const PRIMARY_ATTRIBUTE_KEYS = Object.freeze(['strength','intelligence','awareness','vitality'])
const definitions = new Map(EQUIPMENT_ROSTER.map(d=>[d.id,d]))
const round = n => Number(n.toFixed(5))
const points = {
  weapon:{fan:[1],fa:[2,3,4,5],bao:[4,5,6,7],ling:[6,8,10,12]},
  armor:{fan:[1],fa:[3,5,7,9],bao:[8,12,16,20],ling:[20,28,36,44]},
  ring:{fan:[1],fa:[2,3,4,5],bao:[4,5,6,7],ling:[6,8,10,12]},
}
// Shared budget across the three primary stats: extra lines do not grant a full
// budget each. One-stat specialists, two-stat hybrids and three-stat generalists.
function primaryShares(d) {
  if (d.role === 'transition') return {awareness:1}
  const martial = ['qi','guard','burst','graduate'].includes(d.role)
  const caster = ['formation','recovery','cadence','master'].includes(d.role)
  if (!martial && !caster) return {strength:.45,intelligence:.45,awareness:.1}
  const main = martial ? 'strength' : 'intelligence'
  const other = martial ? 'intelligence' : 'strength'
  if (d.quality === 1) return {[main]:1}
  if (d.quality === 3) return {[main]:.8,[other]:.1,awareness:.1}
  return {[main]:.9,awareness:.1}
}
function defense(d) {
  if (!d.quality) return 1
  const rows={fan:[.24],fa:[2,4,7,10],bao:[4,7,10,13],ling:[6,9,12,16]}
  const martial=['guard','burst','graduate'].includes(d.role)
  let percent=rows[d.tier][d.quality-1]
  if(martial)percent+=({fan:0,fa:.1,bao:.12,ling:.15}[d.tier])
  const factor=d.category==='armor'?(martial?1.10:d.role==='transition'?1:.85)
    :(martial?.90:d.role==='transition'?1:1.05)
  return round(DEFENSE_REFERENCE*percent/(100-percent)*factor*(d.tier==='fan'?1:.95))
}
export function equipmentBaseAttributes(d) {
  const base=d.category==='weapon'
    ? {physicalAttack:weaponBasePoints(d).physical,magicAttack:weaponBasePoints(d).magic}
    : {[d.category==='armor'?'physicalDefense':'magicDefense']:defense(d)}
  if (!d.quality) return base
  const budget=points[d.category][d.tier][d.quality-1]
  for(const [key,share] of Object.entries(primaryShares(d)))base[key]=round(budget*share)
  // Small flat survival grant; armor retains its existing percentage HP effect.
  base.vitality=round(budget*(d.category==='armor'?.1:.05))
  return base
}
export function equipmentPrimaryBonuses(loadout) {
  const result=Object.fromEntries(PRIMARY_ATTRIBUTE_KEYS.map(k=>[k,0]))
  for(const slot of ['weapon','armor','ring']){
    const item=loadout?.[slot]
    if(!item || slot==='weapon'&&loadout.weaponEquipped===false)continue
    const d=definitions.get(item.definitionId)
    if(!d || d.category!==slot)throw new RangeError('Invalid equipment identity')
    const base=equipmentBaseAttributes(d)
    for(const key of PRIMARY_ATTRIBUTE_KEYS)result[key]+=base[key]??0
  }
  return Object.fromEntries(Object.entries(result).map(([k,v])=>[k,round(v)]))
}
export function primaryAttributeLines(base) {
  const names={strength:'力量',intelligence:'智力',awareness:'神识',vitality:'体力'}
  return PRIMARY_ATTRIBUTE_KEYS.filter(k=>base[k]>0).map(k=>`${names[k]} +${base[k]}${
    k==='vitality'?`（气血 +${round(base[k]*VITALITY_HP)}）`:''}`)
}
