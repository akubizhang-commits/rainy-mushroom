import {Node,UITransform,Sprite,SpriteFrame,Texture2D,ImageAsset,Color,isValid} from 'cc';
import {towerResources as resources} from './TowerResources';

type Patch = {node:Node;sprite:Sprite;transform:UITransform;seen:boolean};
/** Shared seal image: M19/M24 safety marks and M21 charge trap; simulation owns all rules. */
export class TowerSafeSealArt {
 private requested=false;
 private dead=false;
 private image:ImageAsset|null=null;
 private texture:Texture2D|null=null;
 private frame:SpriteFrame|null=null;
 private patches=new Map<string,Patch>();
 constructor(private parent:Node,private groundParent:Node=parent){}
 private load(){
  if(this.requested)return;this.requested=true;
  resources.load('tower-monsters-motion/safe-seal',ImageAsset,(error,image)=>{
   if(this.dead||error||!image||!isValid(this.parent,true))return;
   image.addRef();this.image=image;
   this.texture=new Texture2D();this.texture.image=image;
   this.texture.setFilters(Texture2D.Filter.LINEAR,Texture2D.Filter.LINEAR);
   this.frame=new SpriteFrame();this.frame.texture=this.texture;
  });
 }
 has(id:string){return this.patches.has(id);}
 draw(state:any,camera:{x:number;y:number}){
  if(this.dead)return;
  for(const patch of this.patches.values())patch.seen=false;
  for(const z of state.monsterMechanics?.zones||[]){
   if(!['M19','M21','M24'].includes(z.skillId)||state.time>=z.expiresAt||![z.x,z.y,z.radius,z.startedAt,z.activatesAt,z.expiresAt].every(Number.isFinite))continue;
   const owner=state.enemies.find((e:any)=>e.id===z.ownerId&&e.hp>0);if(!owner)continue;
   this.load();
   if(!this.frame)continue;
   const seals=z.skillId==='M21'?[{x:z.x,y:z.y,radius:z.radius}]:(z.safeZones||[]);
   for(const [index,safe] of seals.entries()){
   if(![safe.x,safe.y,safe.radius].every(Number.isFinite)||safe.radius<=0)continue;
   const key=`${z.id}:${index}`;
   let patch=this.patches.get(key);
   if(!patch){
    const parent=z.skillId==='M21'?this.groundParent:this.parent;
    const node=new Node(`${z.skillId==='M21'?'破甲阵':'安全地印'}-${z.id}`);node.layer=parent.layer;parent.addChild(node);
    const transform=node.addComponent(UITransform);const sprite=node.addComponent(Sprite);
    sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.trim=false;sprite.spriteFrame=this.frame;
    patch={node,transform,sprite,seen:true};this.patches.set(key,patch);
   }
   patch.seen=true;
   const size=safe.radius*512/217.6;
   patch.transform.setContentSize(size,size);
   patch.node.setPosition(safe.x-camera.x,safe.y-camera.y);
   patch.sprite.color=new Color(255,255,255,z.skillId==='M21'&&state.time<z.activatesAt?140:255);
   }
  }
  for(const [id,patch]of this.patches)if(!patch.seen){patch.sprite.spriteFrame=null;patch.node.removeFromParent();patch.node.destroy();this.patches.delete(id);}
 }
 destroy(){
  this.dead=true;
  for(const patch of this.patches.values()){patch.sprite.spriteFrame=null;patch.node.removeFromParent();patch.node.destroy();}this.patches.clear();
  this.frame?.destroy();this.frame=null;this.texture?.destroy();this.texture=null;this.image?.decRef();this.image=null;
 }
}
