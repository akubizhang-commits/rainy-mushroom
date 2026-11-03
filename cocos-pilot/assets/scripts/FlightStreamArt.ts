import {towerResources as resources} from './TowerResources';
import {Color,ImageAsset,isValid,Node,Rect,Sprite,SpriteFrame,Texture2D,UITransform} from 'cc';
import {FlightStreamState} from './shared/js/xianxia/TowerFlight';
/** Approved wind painting; pooled sprite below actors, following actual flight motion. */
export class FlightStreamArt {
 private requested=false;private dead=false;private image:ImageAsset|null=null;private texture:Texture2D|null=null;
 private frames:SpriteFrame[]=[];private node:Node|null=null;private sprite:Sprite|null=null;
 public pose:any=null;private projection:Node|null=null;
 private model=new FlightStreamState();
 preload(){
  if(this.requested||this.dead)return;this.requested=true;
  resources.load('tower-skill-fx/flight-stream-v3',ImageAsset,(error,image)=>{
   if(this.dead||error||!image)return;
   image.addRef();this.image=image;const texture=this.texture=new Texture2D();texture.image=image;
   texture.setFilters(Texture2D.Filter.LINEAR,Texture2D.Filter.LINEAR);
   for(let i=0;i<32;i++){const frame=new SpriteFrame();this.frames.push(frame);frame.texture=texture;frame.rect=new Rect(i%8*512,Math.floor(i/8)*288,512,288)}
  },{rollback:()=>this.releaseArt()});
 }
 syncTower(parent:Node,s:any,camera:{x:number;y:number}){
  if(this.dead||!isValid(parent,true))return;
  this.preload();const pose=this.model.sample(s);this.pose=pose;
  if(!pose.visible||!this.frames.length){if(this.node)this.node.active=false;return}
  if(!this.node||!isValid(this.node,true)||this.projection?.parent!==parent){
   if(this.projection&&isValid(this.projection,true))this.projection.destroy();
   this.projection=new Node('御剑飞行地面投影');this.projection.layer=parent.layer;parent.addChild(this.projection);
   this.node=new Node('御剑飞行冰蓝尾流');this.node.layer=parent.layer;this.projection.addChild(this.node);
   const ui=this.node.addComponent(UITransform);ui.setContentSize(70,55);
   // Anchor the painted tip, so length changes cannot push it through the sword.
   ui.setAnchorPoint(.95,.50);
   this.sprite=this.node.addComponent(Sprite);this.sprite.sizeMode=Sprite.SizeMode.CUSTOM;
  }
  this.node.active=true;this.projection!.setPosition(pose.x-camera.x,pose.y-camera.y);this.projection!.setScale(1,pose.depth,1);
  this.node.angle=pose.angle;this.node.getComponent(UITransform)!.setContentSize(pose.length,pose.height);
  this.sprite!.spriteFrame=this.frames[pose.frame];this.sprite!.color=new Color(255,255,255,pose.alpha);
 }
 get ready(){return this.frames.length===32}
 clearBindings(){if(this.projection&&isValid(this.projection,true))this.projection.destroy();this.projection=null;this.pose=null;this.node=null;this.sprite=null;this.model.reset()}
 private releaseArt(){for(const f of this.frames)f.destroy();this.frames=[];this.texture?.destroy();this.texture=null;this.image?.decRef();this.image=null}
 destroy(){this.dead=true;this.clearBindings();this.releaseArt()}
}
