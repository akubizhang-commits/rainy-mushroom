import {Node,Label,UITransform,UIOpacity,Color,isValid} from 'cc';
import {ELEMENT_NAMES} from './shared/js/xianxia/TowerWeaponElements';
import {PlayerDamageFeedback} from './shared/js/xianxia/TowerPlayerDamageFeedback';
import {presentationPreferences} from './TowerPreferences';

type DamageAnchor={x:number;y:number;halfWidth:number};

/** Bounded pooled labels, fed only by settled hit receipts. Pauses use run time. */
export class TowerDamageNumbers {
 private pool:{node:Node;label:Label;opacity:UIOpacity}[]=[];
 private receipts=new Map<string,any>();
 private anchors=new Map<string|number,DamageAnchor & {at:number}>();
 private incoming=new PlayerDamageFeedback();
 private playerPool:{node:Node;label:Label;absorbed:Label;opacity:UIOpacity}[]=[];
 heavyPulse(s:any){return this.incoming.heavyPulse(s)}
 private state:any=null;private time=-1;
 reset(){this.receipts.clear();this.anchors.clear();this.incoming.reset();this.state=null;this.time=-1;for(const p of [...this.pool,...this.playerPool])if(isValid(p.node,true))p.node.active=false}
 draw(parent:Node,s:any,camera:{x:number;y:number},anchors=new Map<string|number,DamageAnchor>(),viewport:{width:number;height:number;blocked?:{x:number;y:number;width:number;height:number}[]}={width:960,height:540},playerWaist?:{x:number;y:number}|null,playerFacing=1){
  if(!s||!parent)return;
  if(this.state!==s||s.time<this.time){this.reset();this.state=s}
  this.time=s.time;
  const prefs=presentationPreferences();
  for(const [id,a] of anchors)this.anchors.set(id,{x:a.x+camera.x,y:a.y+camera.y,halfWidth:a.halfWidth,at:s.time});
  for(const [id,a] of this.anchors)if(s.time-a.at>1)this.anchors.delete(id);
  for(const e of s.effects||[]){
   if(e.kind!=='hit'||!(e.damage>0)||!e.id||this.receipts.has(e.id))continue;
   const at=e.startedAt??s.time;
   if(s.time-at>=.65)continue;
   const anchor=this.anchors.get(e.targetId);
   this.receipts.set(e.id,{...e,at,anchor:anchor?{...anchor}:{x:e.x,y:e.y+Math.max(40,e.targetRadius||20),halfWidth:30}});
  }
  for(const [id,e] of this.receipts)if(s.time-e.at>=.65)this.receipts.delete(id);
  while(this.receipts.size>48)this.receipts.delete(this.receipts.keys().next().value!);
  // Keep newest receipts per target. A common drift preserves row separation,
  // including simultaneous direct/bleed/elemental hits and reduced-motion mode.
  const groups=new Map<string|number,any[]>();
  for(const e of this.receipts.values()){
   const key=e.targetId??e.id,group=groups.get(key)||[];
   group.unshift(e);groups.set(key,group);
  }
  const placed=(viewport.blocked||[]).map(p=>({...p,y:p.y-p.height/2+22}));
  let index=0;
  for(const group of groups.values()){
   group.sort((a,b)=>b.at-a.at);group.splice(4);
   const newest=group[0],a=newest.anchor;
   const text=(e:any)=>`${Number(e.damage.toFixed(e.damage<10?1:0))}${e.source==='weapon_bleed'?' · 流血':e.source==='wound'?' · 剑痕':e.source==='weapon_on_hit'?' · '+(e.element==='none'?'附伤':ELEMENT_NAMES[e.element]||'附伤'):''}`;
   // Conservative glyph widths leave space for Chinese labels and the outline.
   const width=Math.max(...group.map(e=>Array.from(text(e)).reduce((sum,ch)=>sum+(ch.charCodeAt(0)>255?1:.68),0)*(e.critical&&e.source!=='weapon_on_hit'?22:18)+12));
   const height=group.length*44,age=Math.max(0,s.time-newest.at);
   const drift=prefs.reducedMotion?0:Math.min(.65,age)*18;
   const left=-viewport.width/2+12,right=viewport.width/2-12;
   const bottom=-viewport.height/2+24,top=viewport.height/2-24;
   const center=a.x-camera.x,gap=a.halfWidth+12+drift*.5;
   let x=center+gap+width/2;
   if(x+width/2>right)x=center-gap-width/2;
   x=Math.max(left+width/2,Math.min(right-width/2,x));
   let y=Math.max(bottom,Math.min(top-height+44,a.y-camera.y+drift));
   // Avoid other targets' text blocks too. In a dense pack, omit an overflow
   // block rather than paint illegible numbers over another block.
   const overlaps=(cy:number)=>placed.some(p=>Math.abs(x-p.x)<(width+p.width)/2+6&&cy<p.y+p.height&&cy+height>p.y);
   if(overlaps(y)){
    const initialY=y,initialX=x;
    const sides=[initialX,center-gap-width/2,center+gap+width/2]
     .filter(px=>px-width/2>=left&&px+width/2<=right);
    let found=false;
    // Search both sides at each nearby height before moving far from the body.
    for(let step=0;step<=Math.ceil(viewport.height/16)&&!found;step++){
     for(const candidate of step===0?[initialY]:[initialY+step*16,initialY-step*16]){
      if(candidate<bottom||candidate+height-44>top)continue;
      for(const px of sides){x=px;if(!overlaps(candidate)){y=candidate;found=true;break;}}
      if(found)break;
     }
    }
    if(!found)continue;
   }
   placed.push({x,y,width,height});
   for(let row=0;row<group.length;row++){
   const e=group[row];
   let item=this.pool[index++];
   if(!item||!isValid(item.node,true)){
    const node=new Node('战斗伤害数字');node.parent=parent;node.layer=parent.layer;
    node.addComponent(UITransform).setContentSize(150,36);
    const label=node.addComponent(Label);label.fontSize=18;label.lineHeight=24;
    label.overflow=Label.Overflow.NONE;
    label.isBold=true;label.enableOutline=true;label.outlineColor=new Color(17,24,31,255);label.outlineWidth=2;
    item={node,label,opacity:node.addComponent(UIOpacity)};this.pool[index-1]=item;
   }
   const age=Math.max(0,s.time-e.at),extra=e.source==='weapon_on_hit',bleed=e.source==='weapon_bleed',wound=e.source==='wound';
   const critical=!extra&&e.critical;
   item.label.fontSize=critical?22:18;
   item.label.lineHeight=critical?28:24;
   item.node.active=s.player.hp>0;
   item.label.string=text(e);
   item.label.color=bleed?new Color('#E88989'):wound?new Color('#8DDBBE'):extra?new Color(255,192,103,255):e.critical?new Color(255,235,139,255):new Color(240,250,255,255);
   item.node.setPosition(x,y+row*44,0);
   item.opacity.opacity=Math.round(255*Math.min(1,(.65-age)/.22));
  }
  }
  for(let i=index;i<this.pool.length;i++)if(isValid(this.pool[i].node,true))this.pool[i].node.active=false;
  const rows=this.incoming.update(s,prefs.playerDamageNumbers);
  // Stack above the head: the 108px body puts the crown about 54px above the
  // belt. The newest row sits 8px clear of it; a mixed row's absorbed line
  // hangs 37px below its label centre, a plain label 17px.
  const mixedRow=(r:any)=>r.damage>0&&r.absorbed>0;
  const headX=playerWaist?.x??s.player.x-camera.x;
  const headTop=(playerWaist?.y??s.player.y-camera.y+52)+54;
  const newestRow=rows[rows.length-1];
  const stack=rows.slice(0,-1).reduce((height:number,r:any)=>height+(mixedRow(r)?58:34),0);
  const baseY=Math.min(headTop+8+(newestRow&&mixedRow(newestRow)?37:17),
   viewport.height/2-24-17-stack-(prefs.reducedMotion?0:.7*48));
  rows.forEach((row:any,i:number)=>{
   let item=this.playerPool[i];
   if(!item||!isValid(item.node,true)){
    const node=new Node('自身受伤数字');node.parent=parent;node.layer=parent.layer;
    node.addComponent(UITransform).setContentSize(240,40);
    const label=node.addComponent(Label);label.isBold=true;label.enableOutline=true;
    label.outlineColor=new Color('#201722');label.outlineWidth=2;label.overflow=Label.Overflow.NONE;
    const shield=new Node('自身护盾吸收');shield.parent=node;shield.layer=parent.layer;
    shield.addComponent(UITransform).setContentSize(240,26);shield.setPosition(0,-25,0);
    const absorbed=shield.addComponent(Label);absorbed.isBold=true;absorbed.fontSize=18;absorbed.lineHeight=24;
    absorbed.enableOutline=true;absorbed.outlineColor=new Color('#201722');absorbed.outlineWidth=2;
    absorbed.color=new Color('#B9E7F2');absorbed.overflow=Label.Overflow.NONE;
    item={node,label,absorbed,opacity:node.addComponent(UIOpacity)};this.playerPool[i]=item;
   }
   const age=Math.max(0,s.time-row.at);
   const mixed=row.damage>0&&row.absorbed>0;
   item.node.active=true;item.label.string=mixed?row.text.split(' · ')[0]:row.text;
   item.absorbed.node.active=mixed;item.absorbed.string=mixed?row.text.split(' · ').slice(1).join(' · '):'';
   item.label.fontSize=row.heavy?28:23;item.label.lineHeight=34;
   item.label.color=new Color(row.damage>0?'#FF968B':'#B9E7F2');
   // Centred over the head. Newest stays closest to it; older rows float above.
   item.node.setPosition(headX,baseY+
    rows.slice(i,-1).reduce((height:number,r:any)=>height+(mixedRow(r)?58:34),0)+
    (prefs.reducedMotion?0:Math.min(age,.7)*48),0);
   item.opacity.opacity=Math.round(255*Math.min(1,(.9-age)/.2));
  });
  for(let i=rows.length;i<this.playerPool.length;i++)if(isValid(this.playerPool[i].node,true))this.playerPool[i].node.active=false;
 }
}
