import {towerResources as resources} from './TowerResources';
import {Color,ImageAsset,isValid,Node,Rect,Sprite,SpriteFrame,Texture2D,UITransform} from 'cc';
import {NingshenAuraState} from './shared/js/xianxia/TowerNingshen';
/** Approved original painted ring. One pooled sprite below all actors and warnings. */
export class NingshenAuraArt {
 private requested=false;private dead=false;private image:ImageAsset|null=null;private texture:Texture2D|null=null;
 private frames:SpriteFrame[]=[];private node:Node|null=null;private sprite:Sprite|null=null;
 private model=new NingshenAuraState();
 preload(){
  if(this.requested||this.dead)return;this.requested=true;
  resources.load('tower-skill-fx/ningshen-aura-v1',ImageAsset,(error,image)=>{
   if(this.dead||error||!image)return;
   image.addRef();this.image=image;const texture=new Texture2D();texture.image=image;this.texture=texture;
   texture.setFilters(Texture2D.Filter.LINEAR,Texture2D.Filter.LINEAR);
   for(let i=0;i<32;i++){const frame=new SpriteFrame();frame.texture=texture;frame.rect=new Rect(i%8*512,Math.floor(i/8)*288,512,288);this.frames.push(frame)}
  });
 }
 syncTower(parent:Node,s:any,camera:{x:number;y:number}){
  if(this.dead||!isValid(parent,true))return;
  this.preload();const pose=this.model.sample(s);
  if(!pose.visible||!this.frames.length){if(this.node)this.node.active=false;return}
  if(!this.node||!isValid(this.node,true)||this.node.parent!==parent){
   if(this.node&&isValid(this.node,true))this.node.destroy();this.node=new Node('凝神诀青玉灵珠环');this.node.layer=parent.layer;parent.addChild(this.node);
   const ui=this.node.addComponent(UITransform);ui.setContentSize(418,235.125);
   // Match the painted ellipse center, not the asymmetric glow's bounds.
   ui.setAnchorPoint(850/1672,1-477/941);
   this.sprite=this.node.addComponent(Sprite);this.sprite.sizeMode=Sprite.SizeMode.CUSTOM;
  }
  this.node.active=true;this.node.setScale(pose.scale,pose.scale,1);this.node.setPosition(pose.x-camera.x,pose.y-camera.y);
  this.sprite!.spriteFrame=this.frames[pose.frame];this.sprite!.color=new Color(255,255,255,pose.alpha);
 }
 clearBindings(){if(this.node&&isValid(this.node,true))this.node.destroy();this.node=null;this.sprite=null;this.model.reset()}
 destroy(){this.dead=true;this.clearBindings();for(const f of this.frames)f.destroy();this.frames=[];this.texture?.destroy();this.texture=null;this.image?.decRef();this.image=null}
}
