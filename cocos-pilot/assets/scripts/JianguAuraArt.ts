import {towerResources as resources} from './TowerResources';
import {Color,Graphics,ImageAsset,isValid,Node,Rect,Sprite,SpriteFrame,Texture2D,UITransform} from 'cc';
import {JianguAuraState} from './shared/js/xianxia/TowerJiangu';
/** Approved original painted ring. One pooled sprite below all actors and warnings. */
export class JianguAuraArt {
 private requested=false;private dead=false;private image:ImageAsset|null=null;private texture:Texture2D|null=null;
 private frames:SpriteFrame[]=[];private node:Node|null=null;private sprite:Sprite|null=null;
 private trailNode:Node|null=null;private trailGraphics:Graphics|null=null;
 private model=new JianguAuraState();
 preload(){
  if(this.requested||this.dead)return;this.requested=true;
  resources.load('tower-skill-fx/jiangu-aura-v1',ImageAsset,(error,image)=>{
   if(this.dead||error||!image)return;
   image.addRef();this.image=image;const texture=new Texture2D();texture.image=image;this.texture=texture;
   texture.setFilters(Texture2D.Filter.LINEAR,Texture2D.Filter.LINEAR);
   for(let i=0;i<32;i++){const frame=new SpriteFrame();frame.texture=texture;frame.rect=new Rect(i%8*512,Math.floor(i/8)*288,512,288);this.frames.push(frame)}
  });
 }
 syncTower(parent:Node,s:any,camera:{x:number;y:number}){
  if(this.dead||!isValid(parent,true))return;
  this.preload();const pose=this.model.sample(s);
  if(!pose.visible||!this.frames.length){if(this.node)this.node.active=false;this.trailGraphics?.clear();return}
  this.drawTrail(parent,pose,camera);
  if(!this.node||!isValid(this.node,true)||this.node.parent!==parent){
   if(this.node&&isValid(this.node,true))this.node.destroy();this.node=new Node('剑骨银紫双弧');this.node.layer=parent.layer;parent.addChild(this.node);
   const ui=this.node.addComponent(UITransform);ui.setContentSize(330,185.625);
   // Match the painted ellipse center, not the asymmetric glow's bounds.
   ui.setAnchorPoint(836/1672,1-475/941);
   this.sprite=this.node.addComponent(Sprite);this.sprite.sizeMode=Sprite.SizeMode.CUSTOM;
  }
  this.node.active=true;this.node.setPosition(pose.x-camera.x,pose.y-camera.y);
  this.sprite!.spriteFrame=this.frames[pose.frame];this.sprite!.color=new Color(255,255,255,pose.alpha);
 }
 private drawTrail(parent:Node,pose:any,camera:{x:number;y:number}){
  if(!this.trailNode||!isValid(this.trailNode,true)||this.trailNode.parent!==parent){
   if(this.trailNode&&isValid(this.trailNode,true))this.trailNode.destroy();
   this.trailNode=new Node('剑骨移动光丝');this.trailNode.layer=parent.layer;parent.addChild(this.trailNode);this.trailNode.setSiblingIndex(0);
   this.trailGraphics=this.trailNode.addComponent(Graphics);
  }
  const g=this.trailGraphics!;g.clear();const points=[...pose.trail,{x:pose.x,y:pose.y,alpha:1}];
  for(let i=1;i<points.length;i++){
   const a=points[i-1],b=points[i],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);if(len<.01)continue;
   const nx=-dy/len,ny=dx/len,opacity=Math.round(100*a.alpha);
   for(const side of [-1,1]){
    const offset=side*26;
    for(const glow of [true,false]){
     g.strokeColor=new Color(218,195,255,glow?Math.round(opacity*.25):opacity);g.lineWidth=glow?7:1.6;
     g.moveTo(a.x-camera.x+nx*offset,a.y-camera.y+ny*offset);g.lineTo(b.x-camera.x+nx*offset,b.y-camera.y+ny*offset);g.stroke();
    }
   }
  }
 }
 clearBindings(){if(this.trailNode&&isValid(this.trailNode,true))this.trailNode.destroy();this.trailNode=null;this.trailGraphics=null;if(this.node&&isValid(this.node,true))this.node.destroy();this.node=null;this.sprite=null;this.model.reset()}
 destroy(){this.dead=true;this.clearBindings();for(const f of this.frames)f.destroy();this.frames=[];this.texture?.destroy();this.texture=null;this.image?.decRef();this.image=null}
}
