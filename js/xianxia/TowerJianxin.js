/** Visual-only observer. Simulation time owns both loop and critical pulse. */
export class JianxinAuraState {
 constructor(){this.reset()}
 reset(){this.state=null;this.time=-1;this.pulseAt=-Infinity}
 sample(s){
  if(this.state!==s||s.time<this.time)this.reset();
  this.state=s;this.time=s.time;
  const visible=Number.isFinite(s.time)&&s.player?.hp>0&&(s.loadout?.passive?.sj_heart||0)>0&&!['lost','won','abandoned'].includes(s.phase);
  if(!visible){this.pulseAt=-Infinity;return {visible:false}}
  for(const e of s.effects||[])if(e.kind==='hit'&&!e.hostile&&e.critical&&e.damage>0&&Number.isFinite(e.startedAt)&&e.startedAt<=s.time)
   this.pulseAt=Math.max(this.pulseAt,e.startedAt);
  const pulse=Math.max(0,1-(s.time-this.pulseAt)/.65);
  return {visible:true,x:s.player.x,y:s.player.y,frame:Math.floor(((s.time%4)+4)%4*4),alpha:Math.round(110+120*pulse)};
 }
}
