import {towerResources as resources} from './TowerResources';
import {Color,ImageAsset,isValid,Node,Rect,Sprite,SpriteFrame,Texture2D,UITransform} from 'cc';
import {JianxinAuraState} from './shared/js/xianxia/TowerJianxin';
/** Approved original painted ring. One pooled sprite below all actors and warnings. */
export class JianxinAuraArt {
 private requested=false;private dead=false;private image:ImageAsset|null=null;private texture:Texture2D|null=null;
 private frames:SpriteFrame[]=[];private node:Node|null=null;private sprite:Sprite|null=null;
 private model=new JianxinAuraState();
 preload(){
  if(this.requested||this.dead)return;this.requested=true;
  resources.load('tower-skill-fx/jianxin-aura-v1',ImageAsset,(error,image)=>{
   if(this.dead||error||!image)return;
   image.addRef();this.image=image;const texture=new Texture2D();texture.image=image;this.texture=texture;
   texture.setFilters(Texture2D.Filter.LINEAR,Texture2D.Filter.LINEAR);
   for(let i=0;i<16;i++){const frame=new SpriteFrame();frame.texture=texture;frame.rect=new Rect(i%4*512,Math.floor(i/4)*288,512,288);this.frames.push(frame)}
  });
 }
 syncTower(parent:Node,s:any,camera:{x:number;y:number}){
  if(this.dead||!isValid(parent,true))return;
  this.preload();const pose=this.model.sample(s);
  if(!pose.visible||!this.frames.length){if(this.node)this.node.active=false;return}
  if(!this.node||!isValid(this.node,true)||this.node.parent!==parent){
   this.clearBindings();this.node=new Node('剑心通明冰蓝光环');this.node.layer=parent.layer;parent.addChild(this.node);
   const ui=this.node.addComponent(UITransform);ui.setContentSize(174,97.875);
   // Match the painted ellipse center, not the asymmetric glow's bounds.
   ui.setAnchorPoint(848/1672,1-460/941);
   this.sprite=this.node.addComponent(Sprite);this.sprite.sizeMode=Sprite.SizeMode.CUSTOM;
  }
  this.node.active=true;this.node.setPosition(pose.x-camera.x,pose.y-camera.y);
  this.sprite!.spriteFrame=this.frames[pose.frame];this.sprite!.color=new Color(255,255,255,pose.alpha);
 }
 clearBindings(){if(this.node&&isValid(this.node,true))this.node.destroy();this.node=null;this.sprite=null;this.model.reset()}
 destroy(){this.dead=true;this.clearBindings();for(const f of this.frames)f.destroy();this.frames=[];this.texture?.destroy();this.texture=null;this.image?.decRef();this.image=null}
}
