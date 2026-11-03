// Armor effects use simulation time and are serialized with the battle snapshot.
export const armorEffectValue=(loadout,type)=>loadout?.armor?.affixes.find(a=>a.type===type)?.value??0
export const hasArmorEffect=loadout=>!!(armorEffectValue(loadout,'lowHealthShield')||armorEffectValue(loadout,'safeRecovery'))
export function newArmorState(loadout){return {armorId:loadout.armor.id,healedTotal:0,...(hasArmorEffect(loadout)?{lastHitAt:0,shield:0,shieldUntil:0,shieldReadyAt:0}:{})}}
export function tickArmorEffects(s){const a=s.armorState;if(!a||!hasArmorEffect(s.loadout))return;if(s.player.hp<=0||s.time>=a.shieldUntil)a.shield=0;else a.shield=Math.min(a.shield,s.player.maxHp*armorEffectValue(s.loadout,'lowHealthShield')/100)}
export function resolveArmorHit(s,damage){
 const p=s.player,a=s.armorState;tickArmorEffects(s)
 if(!(damage>0))return {damage:0,absorbed:0,shieldTriggered:false}
 const absorbed=hasArmorEffect(s.loadout)?Math.min(damage,a.shield):0
 if(hasArmorEffect(s.loadout)){a.shield-=absorbed;a.lastHitAt=s.time}
 const actual=damage-absorbed;p.hp=Math.max(0,p.hp-actual)
 let shieldTriggered=false
 if(p.hp>0&&p.hp<p.maxHp*.3&&armorEffectValue(s.loadout,'lowHealthShield')&&s.time>=a.shieldReadyAt){
  a.shield=p.maxHp*armorEffectValue(s.loadout,'lowHealthShield')/100;a.shieldUntil=s.time+6;a.shieldReadyAt=s.time+20;shieldTriggered=true
 }
 if(p.hp<=0&&a&&hasArmorEffect(s.loadout))a.shield=0
 return {damage:actual,absorbed,shieldTriggered}
}
export function validArmorEffectState(s){
 const a=s.armorState;if(!hasArmorEffect(s.loadout))return !!a&&Object.keys(a).sort().join(',')==='armorId,healedTotal'
 if(!a||Object.keys(a).sort().join(',')!=='armorId,healedTotal,lastHitAt,shield,shieldReadyAt,shieldUntil')return false
 if(!['lastHitAt','shield','shieldReadyAt','shieldUntil'].every(k=>Number.isFinite(a[k])&&a[k]>=0))return false
 if(a.lastHitAt>s.time||a.shield>s.player.maxHp*armorEffectValue(s.loadout,'lowHealthShield')/100+1e-8||a.shieldUntil>s.time+6+1e-8||a.shieldReadyAt>s.time+20+1e-8)return false
 if(!armorEffectValue(s.loadout,'lowHealthShield'))return a.shield===0&&a.shieldUntil===0&&a.shieldReadyAt===0
 if(a.shieldReadyAt===0)return a.shield===0&&a.shieldUntil===0
 if(Math.abs(a.shieldReadyAt-a.shieldUntil-14)>1e-8)return false
 return !(a.shield>0&&(s.player.hp<=0||s.time>=a.shieldUntil))
}
