import { CAMP_PILLS, cultivationAt, cultivationXpCap, TOWER_XP_CAP } from './TowerProfile.js'
export const CULTIVATION_PILL_LIMIT = 6
export const CULTIVATION_PILL_UNLOCK_FLOOR = 1
export const cultivationPillsUnlocked = state => (state.clearedFloor ?? 0) >= CULTIVATION_PILL_UNLOCK_FLOOR
export const CULTIVATION_PILL_UNLOCK_HINT = '通关镇妖塔第1层后开放修为丹'
export const freshCultivationPillUses = () => ({ 炼气: 0, 筑基: 0, 金丹: 0 })
export function cultivationPillAllowance(state, id) {
  const realm = CAMP_PILLS[id]?.realm || cultivationAt(state.xp).realm
  const total = CULTIVATION_PILL_LIMIT, used = state.cultivationPillUses?.[realm] || 0
  const remaining = Math.max(0,total-used)
  return { realm,total,used,remaining,purchasable:cultivationPillsUnlocked(state)?remaining:0 }
}
export function cultivationStockQuote(state,id,count,confirmed=false) {
  const pill=CAMP_PILLS[id]
  if (!pill?.xp) return {ok:true}
  if(!cultivationPillsUnlocked(state))return {ok:false,reason:'cultivation-floor-locked'}
  if(pill.realm!==cultivationAt(state.xp).realm)return {ok:false,reason:'wrong-realm'}
  const allowance=cultivationPillAllowance(state,id)
  const inventoryAfter=Object.entries(CAMP_PILLS).filter(([,p])=>p.xp&&p.realm===pill.realm).reduce((n,[key])=>n+(state.pills[key]||0),count)
  const result={...allowance,inventoryAfter}
  if(!allowance.remaining)return {ok:false,reason:'cultivation-allowance',...result}
  if(inventoryAfter>allowance.remaining&&!confirmed)return {ok:false,reason:'cultivation-stock-confirmation',...result}
  return {ok:true,...result}
}
export function cultivationUseQuote(state,id,confirmed=false) {
 const pill=CAMP_PILLS[id]
 if(!pill?.xp)return {ok:false,reason:'not-usable'}
 if(!cultivationPillsUnlocked(state))return {ok:false,reason:'cultivation-floor-locked'}
 if(pill.realm!==cultivationAt(state.xp).realm)return {ok:false,reason:'wrong-realm'}
 if(state.xp===TOWER_XP_CAP)return {ok:false,reason:'cultivation-capped'}
 if(state.xp===cultivationXpCap(state.xp))return {ok:false,reason:'breakthrough-required'}
 if(!cultivationPillAllowance(state,id).remaining)return {ok:false,reason:'cultivation-allowance'}
 const gained=Math.min(pill.xp,cultivationXpCap(state.xp)-state.xp),wasted=pill.xp-gained
 return wasted&&!confirmed?{ok:false,reason:'cultivation-overflow-confirmation',gained,wasted}:{ok:true,gained,wasted}
}
export function cultivationPillHint(state) {
 if(!cultivationPillsUnlocked(state))return CULTIVATION_PILL_UNLOCK_HINT
 const a=cultivationPillAllowance(state)
 return `${a.realm}修为丹已服${a.used}/${a.total}颗；同境两种修为丹共用额度，剩余${a.remaining}颗。`
}
