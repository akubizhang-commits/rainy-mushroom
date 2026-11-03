import {Node,UITransform,Graphics,Color,Label,isValid} from 'cc';

/** UI vector badge: blood drop and remaining time. No paid/static image generation. */
export class TowerDebuffIcons {
 private pool:{node:Node;label:Label;graphics:Graphics}[]=[];
 draw(parent:Node,s:any,camera:{x:number;y:number},width:number,height:number){
  let used=0;
  const visible=(s.enemies||[]).filter((e:any)=>e.hp>0&&(e.weaponBleed?.remaining>0||e.qingpingDot?.remaining>0)
   &&Math.abs(e.x-camera.x)<width/2-68&&Math.abs(e.y-camera.y)<height/2-65)
   .sort((a:any,b:any)=>Math.hypot(a.x-camera.x,a.y-camera.y)-Math.hypot(b.x-camera.x,b.y-camera.y)).slice(0,24);
  for(const e of visible){
   let row=0;const count=[e.weaponBleed,e.qingpingDot].filter(d=>d?.remaining>0&&d.endsAt>s.time).length;
   for(const [key,name] of [['weaponBleed','流血'],['qingpingDot','剑痕']]){
   const dot=e[key];if(!dot||!(dot.remaining>0)||dot.endsAt<=s.time)continue;
   let p=this.pool[used++];
   if(!p||!isValid(p.node,true)||p.node.parent!==parent){
    const node=new Node('敌人状态-流血');node.layer=parent.layer;parent.addChild(node);
    node.addComponent(UITransform).setContentSize(136,26);
    const graphics=node.addComponent(Graphics);
    const text=new Node('流血倒计时');text.layer=node.layer;node.addChild(text);
    text.setPosition(10,0);text.addComponent(UITransform).setContentSize(106,26);
    const label=text.addComponent(Label);label.fontSize=16;label.lineHeight=22;
    label.color=new Color('#FFE1D8');label.enableOutline=true;label.outlineWidth=2;label.outlineColor=new Color('#24191D');
    p={node,label,graphics};this.pool[used-1]=p;
   }
   p.node.active=true;
   const x=e.x-camera.x,y=e.y-camera.y;
   p.node.setPosition(x,Math.max(-height/2+24+(count-1)*29,y-(e.radius||18)-45)-row++*29);
   p.label.string=`${name}${dot.stacks}层 ${Math.max(.1,dot.endsAt-s.time).toFixed(1)}s`;
   const g=p.graphics;g.clear();g.fillColor=new Color('#24191D');g.roundRect(-68,-13,136,26,6);g.fill();
   // Blood-drop silhouette; outline and text make the status legible without color.
   g.fillColor=new Color(key==='weaponBleed'?'#D95460':'#56B7A2');g.strokeColor=new Color('#FFD0BE');g.lineWidth=1.5;
   g.moveTo(-54,10);g.bezierCurveTo(-52,4,-46,0,-46,-4);
   g.bezierCurveTo(-46,-13,-62,-13,-62,-4);g.bezierCurveTo(-62,0,-56,4,-54,10);
   g.close();g.fill();g.stroke();
   g.strokeColor=new Color('#FFF0DC');g.lineWidth=1.5;g.moveTo(-58,-3);g.lineTo(-56,0);g.stroke();
  }
  }
  for(let i=used;i<this.pool.length;i++)if(isValid(this.pool[i].node,true))this.pool[i].node.active=false;
 }
 reset(){for(const p of this.pool)if(isValid(p.node,true))p.node.active=false}
}
