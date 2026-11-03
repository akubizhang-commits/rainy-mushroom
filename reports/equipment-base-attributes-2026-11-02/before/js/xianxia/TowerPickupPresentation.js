/** View-owned state: loading a snapshot continues flight, never replays credited rewards. */
export class PickupFeedback {
 constructor(){this.reset()}
 reset(){this.snapshot=null;this.initial=new Set()}
 sample(s){
  if(this.snapshot!==s){
   this.snapshot=s
   this.initial=new Set((s.effects||[]).filter(e=>e.kind==='resource_pickup').map(e=>e.id))
  }
  if(['won','lost','abandoned'].includes(s.phase))return []
  const arrivals=new Map()
  for(const e of s.effects||[])if(e.kind==='resource_pickup'&&!this.initial.has(e.id)
   &&e.startedAt<=s.time&&e.expiresAt>s.time){
   const key=e.lootKind==='core'?'core':e.itemId,old=arrivals.get(key)
   arrivals.set(key,{effect:e,amount:(old?.amount||0)+e.amount})
  }
  return Array.from(arrivals.values()).slice(-5)
 }
}
export function pickupLabelBudget(drops,camera,width,height){
 return drops.reduce((count,d)=>count+(d.receipts
  &&Math.abs(d.x-camera.x)<=width/2+64&&Math.abs(d.y-camera.y)<=height/2+76?1:0),7)
}
