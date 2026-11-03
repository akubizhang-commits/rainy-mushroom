import {Node,UITransform,Sprite,SpriteFrame,Texture2D,ImageAsset,Color,isValid} from 'cc';
import {towerResources as resources} from './TowerResources';

type Bolt = {node:Node;sprite:Sprite;transform:UITransform;seen:boolean};
/** Presentation only: the existing M13 zone owns targeting, timing and damage. */
export class TowerLightningArt {
 private requested=false;
 private dead=false;
 private image:ImageAsset|null=null;
 private texture:Texture2D|null=null;
 private frame:SpriteFrame|null=null;
 private bolts=new Map<string,Bolt>();
 constructor(private parent:Node){}
 private load(){
  if(this.requested)return;this.requested=true;
  resources.load('tower-monsters-motion/lightning',ImageAsset,(error,image)=>{
   if(this.dead||error||!image||!isValid(this.parent,true))return;
   image.addRef();this.image=image;
   this.texture=new Texture2D();this.texture.image=image;
   this.texture.setFilters(Texture2D.Filter.LINEAR,Texture2D.Filter.LINEAR);
   this.frame=new SpriteFrame();this.frame.texture=this.texture;
  });
 }
 has(id:string){return this.bolts.has(id);}
 draw(state:any,camera:{x:number;y:number}){
  if(this.dead)return;
  for(const bolt of this.bolts.values())bolt.seen=false;
  for(const z of state.monsterMechanics?.zones||[]){
   if(z.skillId!=='M13'||state.time>=z.expiresAt||![z.x,z.y,z.radius,z.startedAt,z.activatesAt,z.expiresAt].every(Number.isFinite))continue;
   const owner=state.enemies.find((e:any)=>e.id===z.ownerId&&e.hp>0);if(!owner)continue;
   this.load();
   if(!this.frame||state.time<z.activatesAt)continue;
   let bolt=this.bolts.get(z.id);
   if(!bolt){
    const node=new Node(`落雷-${z.id}`);node.layer=this.parent.layer;this.parent.addChild(node);
    const transform=node.addComponent(UITransform);const sprite=node.addComponent(Sprite);
    sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.trim=false;sprite.spriteFrame=this.frame;
    bolt={node,transform,sprite,seen:true};this.bolts.set(z.id,bolt);
   }
   bolt.seen=true;
   const fade=Math.max(0,1-(state.time-z.activatesAt)/Math.max(.001,z.expiresAt-z.activatesAt));
   const height=300;
   bolt.transform.setContentSize(height*384/1024,height);
   // Measured bright impact point in the padded 384x1024 texture.
   bolt.transform.setAnchorPoint(173/384,54/1024);
   bolt.node.setPosition(z.x-camera.x,z.y-camera.y);
   bolt.sprite.color=new Color(255,255,255,Math.round(255*fade));
  }
  for(const [id,bolt]of this.bolts)if(!bolt.seen){bolt.sprite.spriteFrame=null;bolt.node.removeFromParent();bolt.node.destroy();this.bolts.delete(id);}
 }
 destroy(){
  this.dead=true;
  for(const bolt of this.bolts.values()){bolt.sprite.spriteFrame=null;bolt.node.removeFromParent();bolt.node.destroy();}this.bolts.clear();
  this.frame?.destroy();this.frame=null;this.texture?.destroy();this.texture=null;this.image?.decRef();this.image=null;
 }
}
