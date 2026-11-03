/** Visual movement history, independent of combat and wall-clock time. */
export class JianguAuraState {
 constructor(){this.reset()}
 reset(){this.state=null;this.time=-1;this.last=null;this.history=[]}
 sample(s){
  if(this.state!==s||s.time<this.time)this.reset();
  this.state=s;
  const visible=Number.isFinite(s.time)&&s.player?.hp>0&&(s.loadout?.passive?.sj_bone||0)>0&&!['lost','won','abandoned'].includes(s.phase);
  if(!visible){this.reset();return {visible:false,trail:[]}}
  const p=s.player,dt=s.time-this.time;
  if(this.last&&(Math.hypot(p.x-this.last.x,p.y-this.last.y)>80||dt===0&&(p.x!==this.last.x||p.y!==this.last.y)))this.history=[];
  else if(this.last&&dt>0&&dt<=.25&&Math.hypot(p.x-this.last.x,p.y-this.last.y)>.05)this.history.push({...this.last});
  this.history=this.history.filter(q=>s.time-q.time<.24).slice(-32);
  this.last={x:p.x,y:p.y,time:s.time};this.time=s.time;
  const trail=this.history.map(q=>({x:q.x,y:q.y,alpha:1-(s.time-q.time)/.24}));
  return {visible:true,x:p.x,y:p.y,frame:Math.floor(((s.time%4)+4)%4*8),alpha:115,trail};
 }
}
