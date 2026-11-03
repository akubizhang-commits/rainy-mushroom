import {Node,UITransform,Sprite,SpriteFrame,Texture2D,ImageAsset,Color,isValid} from 'cc';
import {towerResources as resources} from './TowerResources';

type Plume = {node:Node;sprite:Sprite;transform:UITransform;seen:boolean};
/** Presentation only: the existing M18 zone owns targeting, timing and damage. */
export class TowerChainArt {
 private requested=false;
 private dead=false;
 private image:ImageAsset|null=null;
 private texture:Texture2D|null=null;
 private frame:SpriteFrame|null=null;
 private plumes=new Map<string,Plume>();
 constructor(private parent:Node){}
 private load(){
  if(this.requested)return;this.requested=true;
  resources.load('tower-monsters-motion/chain',ImageAsset,(error,image)=>{
   if(this.dead||error||!image||!isValid(this.parent,true))return;
   image.addRef();this.image=image;
   this.texture=new Texture2D();this.texture.image=image;
   this.texture.setFilters(Texture2D.Filter.LINEAR,Texture2D.Filter.LINEAR);
   this.frame=new SpriteFrame();this.frame.texture=this.texture;
  });
 }
 has(id:string){return this.plumes.has(id);}
 draw(state:any,camera:{x:number;y:number}){
  if(this.dead)return;
  for(const plume of this.plumes.values())plume.seen=false;
  for(const z of state.monsterMechanics?.zones||[]){
   if(z.skillId!=='M18'||z.shape!=='ring'||state.time>=z.expiresAt||![z.x,z.y,z.radius,z.faceX,z.faceY,z.startedAt,z.activatesAt,z.expiresAt].every(Number.isFinite))continue;
   const owner=state.enemies.find((e:any)=>e.id===z.ownerId&&e.hp>0);if(!owner)continue;
   this.load();
   if(!this.frame||state.time<z.activatesAt)continue;
   let plume=this.plumes.get(z.id);
   if(!plume){
    const node=new Node(`狱锁-${z.id}`);node.layer=this.parent.layer;this.parent.addChild(node);
    const transform=node.addComponent(UITransform);const sprite=node.addComponent(Sprite);
    sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.trim=false;sprite.spriteFrame=this.frame;
    plume={node,transform,sprite,seen:true};this.plumes.set(z.id,plume);
   }
   plume.seen=true;
   const fade=Math.min(1,Math.max(0,(z.expiresAt-state.time)/.25));
   plume.transform.setContentSize(z.radius*512/240,z.radius*512/240);
   plume.transform.setAnchorPoint(.5,.5);
   plume.node.angle=Math.atan2(z.faceY,z.faceX)*180/Math.PI;
   plume.node.setPosition(z.x-camera.x,z.y-camera.y);
   plume.sprite.color=new Color(255,255,255,Math.round(255*fade));
  }
  for(const [id,plume]of this.plumes)if(!plume.seen){plume.sprite.spriteFrame=null;plume.node.removeFromParent();plume.node.destroy();this.plumes.delete(id);}
 }
 destroy(){
  this.dead=true;
  for(const plume of this.plumes.values()){plume.sprite.spriteFrame=null;plume.node.removeFromParent();plume.node.destroy();}this.plumes.clear();
  this.frame?.destroy();this.frame=null;this.texture?.destroy();this.texture=null;this.image?.decRef();this.image=null;
 }
}
