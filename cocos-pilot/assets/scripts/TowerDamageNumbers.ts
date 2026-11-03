import {Node,Label,UITransform,UIOpacity,Color,isValid} from 'cc';
import {ELEMENT_NAMES} from './shared/js/xianxia/TowerWeaponElements';

/** Bounded pooled labels, fed only by settled hit receipts. Pauses use run time. */
export class TowerDamageNumbers {
 private pool:{node:Node;label:Label;opacity:UIOpacity}[]=[];
 private receipts=new Map<string,any>();
 private state:any=null;private time=-1;
 reset(){this.receipts.clear();this.state=null;this.time=-1;for(const p of this.pool)if(isValid(p.node,true))p.node.active=false}
 draw(parent:Node,s:any,camera:{x:number;y:number}){
  if(!s||!parent)return;
  if(this.state!==s||s.time<this.time){this.reset();this.state=s}
  this.time=s.time;
  for(const e of s.effects||[]){
   if(e.kind!=='hit'||!(e.damage>0)||!e.id||this.receipts.has(e.id))continue;
   this.receipts.set(e.id,{...e,at:e.startedAt??s.time});
  }
  for(const [id,e] of this.receipts)if(s.time-e.at>=.65)this.receipts.delete(id);
  while(this.receipts.size>48)this.receipts.delete(this.receipts.keys().next().value!);
  let index=0;
  for(const e of this.receipts.values()){
   let item=this.pool[index++];
   if(!item||!isValid(item.node,true)){
    const node=new Node('战斗伤害数字');node.parent=parent;node.layer=parent.layer;
    node.addComponent(UITransform).setContentSize(150,36);
    const label=node.addComponent(Label);label.fontSize=18;label.lineHeight=24;
    label.isBold=true;label.enableOutline=true;label.outlineColor=new Color(17,24,31,255);label.outlineWidth=2;
    item={node,label,opacity:node.addComponent(UIOpacity)};this.pool[index-1]=item;
   }
   const age=Math.max(0,s.time-e.at),extra=e.source==='weapon_on_hit',bleed=e.source==='weapon_bleed',wound=e.source==='wound';
   const critical=!extra&&e.critical;
   item.label.fontSize=critical?22:18;
   item.label.lineHeight=critical?28:24;
   item.node.active=s.player.hp>0;
   const value=Number(e.damage.toFixed(e.damage<10?1:0));
   item.label.string=`${value}${bleed?' · 流血':wound?' · 剑痕':extra?' · '+(e.element==='none'?'附伤':ELEMENT_NAMES[e.element]||'附伤'):''}`;
   item.label.color=bleed?new Color('#E88989'):wound?new Color('#8DDBBE'):extra?new Color(255,192,103,255):e.critical?new Color(255,235,139,255):new Color(240,250,255,255);
   item.node.setPosition(e.x-camera.x+(extra?25:-10),e.y-camera.y+Math.max(40,e.targetRadius||20)+age*42+(extra?0:27),0);
   item.opacity.opacity=Math.round(255*Math.min(1,(.65-age)/.22));
  }
  for(let i=index;i<this.pool.length;i++)if(isValid(this.pool[i].node,true))this.pool[i].node.active=false;
 }
}
