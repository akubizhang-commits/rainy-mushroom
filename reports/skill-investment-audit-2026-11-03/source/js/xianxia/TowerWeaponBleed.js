import {addDotBudget,tickDotBudget,validDotBudget,DOT_DURATION,DOT_INTERVAL} from './TowerDotConversion.js'
export const WEAPON_BLEED_IDS=Object.freeze([
 'eq_sword_caiyun','eq_sword_lingxi','eq_sword_hanguang',
 'eq_sword_duanliu','eq_sword_xuanwei','eq_sword_zhuiri',
])
export const BLEED_DURATION=DOT_DURATION
export const BLEED_INTERVAL=DOT_INTERVAL
export function addWeaponBleed(enemy,time,amount,physicalAmount){addDotBudget(enemy,'weaponBleed',time,amount,physicalAmount)}
export function tickWeaponBleeds(state,outgoing){for(const e of state.enemies)tickDotBudget(e,'weaponBleed',state.time,'weapon_bleed',outgoing)}
export function validWeaponBleeds(state){return state.enemies.every(e=>validDotBudget(e.weaponBleed,state.time))}
