// Persist the pending wound so rendering and save/restore share one contact time.
export const QINGPING_CONTACT = .48
export const QINGPING_IMPACT_SHARE = .6
export function addQingping(run,e,amount,physicalAmount=amount) {
 if(!(amount>0))return
 physicalAmount=Math.min(amount,Math.max(0,physicalAmount))
 const s=run.state
 if(e.qingping&&!e.qingping.applied){
  e.qingping.amount+=amount
  e.qingping.physicalAmount=Math.min(e.qingping.amount,e.qingping.physicalAmount+physicalAmount)
  return
 }
 if(e.woundBudget>0&&e.woundUntil>s.time){
  e.woundPhysicalBudget=(e.woundPhysicalBudget??e.woundBudget)+physicalAmount
  e.woundBudget+=amount;e.woundPhysicalBudget=Math.min(e.woundBudget,e.woundPhysicalBudget);e.woundUntil=s.time+2;return
 }
 e.qingping={startedAt:s.time,impactAt:s.time+QINGPING_CONTACT,amount,physicalAmount,applied:false,
  originX:s.player.x,originY:s.player.y,side:e.x>=s.player.x?1:-1}
}
export function tickQingping(run) {
 const s=run.state,contacts=new Map()
 for(const e of s.enemies){
  const q=e.qingping
  if(!q||q.applied||q.impactAt>s.time+1e-9)continue
  q.applied=true
  if(e.hp<=0)continue
  const impact=q.amount*QINGPING_IMPACT_SHARE
  const physicalRemainder=q.physicalAmount-q.physicalAmount*QINGPING_IMPACT_SHARE
  e.woundPhysicalBudget=(e.woundPhysicalBudget??e.woundBudget)+physicalRemainder
  e.woundBudget+=q.amount-impact
  e.woundPhysicalBudget=Math.min(e.woundBudget,e.woundPhysicalBudget)
  e.woundUntil=s.time+2;contacts.set(e.id,impact)
 }
 return contacts
}
export function validQingping(s){
 return s.enemies.every(e=>{
  const p=e.woundPhysicalBudget
  if(p!==undefined&&(!Number.isFinite(p)||p<0||p>e.woundBudget+1e-8))return false
  if(s.loadout?.growthVersion===1&&e.woundBudget>0&&p===undefined)return false
  const q=e.qingping;if(q===undefined)return true
  return q&&typeof q.applied==='boolean'&&[q.startedAt,q.impactAt,q.amount,q.originX,q.originY].every(Number.isFinite)&&
   q.startedAt>=0&&q.startedAt<=s.time+1e-8&&q.amount>0&&Math.abs(q.impactAt-q.startedAt-QINGPING_CONTACT)<1e-8&&
   Number.isFinite(q.physicalAmount)&&q.physicalAmount>=0&&q.physicalAmount<=q.amount&&
   (q.side===1||q.side===-1)
 })
}
