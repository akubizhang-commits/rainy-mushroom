import {towerResources as resources} from './TowerResources';
import {ImageAsset,isValid,Node,Sprite,SpriteFrame,Texture2D,UITransform} from 'cc';
/** Library Liuquan master, using exactly the wake's heading and projection. */
export class FlightSwordArt {
 private requested=false;private dead=false;private image:ImageAsset|null=null;private texture:Texture2D|null=null;private frame:SpriteFrame|null=null;
 private root:Node|null=null;private node:Node|null=null;
 preload(){
  if(this.requested||this.dead)return;this.requested=true;
  resources.load('tower-skill-fx/flight-liuquan-v1',ImageAsset,(err,image)=>{
   if(this.dead||err||!image)return;image.addRef();this.image=image;
   this.texture=new Texture2D();this.texture.image=image;this.texture.setFilters(Texture2D.Filter.LINEAR,Texture2D.Filter.LINEAR);
   this.frame=new SpriteFrame();this.frame.texture=this.texture;
  });
 }
 syncTower(parent:Node,pose:any,camera:{x:number;y:number}){
  if(this.dead||!isValid(parent,true))return;this.preload();
  if(!pose?.visible||!this.frame){if(this.root)this.root.active=false;return}
  if(!this.root||!isValid(this.root,true)||this.root.parent!==parent){
   this.clearBindings();this.root=new Node('流泉飞剑投影');this.root.layer=parent.layer;parent.addChild(this.root);
   this.node=new Node('流泉剑原画');this.node.layer=parent.layer;this.root.addChild(this.node);
   const ui=this.node.addComponent(UITransform);ui.setContentSize(100,64);ui.setAnchorPoint(.46,.5);
   const sprite=this.node.addComponent(Sprite);sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.spriteFrame=this.frame;
  }
  this.root.active=true;this.root.setPosition(pose.centerX-camera.x,pose.centerY-camera.y);this.root.setScale(1,pose.depth,1);this.node!.angle=pose.angle;
 }
 get ready(){return !!this.frame}
 clearBindings(){if(this.root&&isValid(this.root,true))this.root.destroy();this.root=null;this.node=null}
 destroy(){this.dead=true;this.clearBindings();this.frame?.destroy();this.frame=null;this.texture?.destroy();this.texture=null;this.image?.decRef();this.image=null}
}
