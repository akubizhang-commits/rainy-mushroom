import {Node,UITransform,Sprite,SpriteFrame,Texture2D,ImageAsset,Color,isValid} from 'cc';
import {setTowerDepth} from './TowerDepthOrder';
import {towerResources as resources} from './TowerResources';

type Core = {node:Node;sprite:Sprite;transform:UITransform;seen:boolean};
/** Presentation only: the existing M03 summon owns health, lifetime and collision. */
export class TowerCoreArt {
 private requested=false;
 private dead=false;
 private image:ImageAsset|null=null;
 private texture:Texture2D|null=null;
 private frame:SpriteFrame|null=null;
 private cores=new Map<string,Core>();
 constructor(private parent:Node){}
 private load(){
  if(this.requested)return;this.requested=true;
  resources.load('tower-monsters-motion/core',ImageAsset,(error,image)=>{
   if(this.dead||error||!image||!isValid(this.parent,true))return;
   image.addRef();this.image=image;
   this.texture=new Texture2D();this.texture.image=image;
   this.texture.setFilters(Texture2D.Filter.LINEAR,Texture2D.Filter.LINEAR);
   this.frame=new SpriteFrame();this.frame.texture=this.texture;
  });
 }
 has(id:string){return this.cores.has(id);}
 draw(state:any,camera:{x:number;y:number}){
  if(this.dead)return;
  for(const core of this.cores.values())core.seen=false;
  for(const e of state.enemies||[]){
   if(e.temporary?.kind!=='core'||e.hp<=0||state.time>=e.temporary.expiresAt||![e.x,e.y,e.radius].every(Number.isFinite))continue;
   if(!state.enemies.some((owner:any)=>owner.id===e.temporary.ownerId&&owner.hp>0))continue;
   this.load();if(!this.frame)continue;
   let core=this.cores.get(e.id);
   if(!core){
    const node=new Node(`汲灵核-${e.id}`);node.layer=this.parent.layer;this.parent.addChild(node);
    const transform=node.addComponent(UITransform);const sprite=node.addComponent(Sprite);
    sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.trim=false;sprite.spriteFrame=this.frame;
    core={node,transform,sprite,seen:true};this.cores.set(e.id,core);
   }
   core.seen=true;
   const height=Math.max(56,e.radius*2),size=height*512/448;
   core.transform.setContentSize(size,size);
   core.node.setPosition(e.x-camera.x,e.y-camera.y+height/2);
   setTowerDepth(core.node,e.y);
   core.sprite.color=new Color(255,255,255,255);
  }
  for(const [id,core]of this.cores)if(!core.seen){core.sprite.spriteFrame=null;core.node.removeFromParent();core.node.destroy();this.cores.delete(id);}
 }
 destroy(){
  this.dead=true;
  for(const core of this.cores.values()){core.sprite.spriteFrame=null;core.node.removeFromParent();core.node.destroy();}this.cores.clear();
  this.frame?.destroy();this.frame=null;this.texture?.destroy();this.texture=null;this.image?.decRef();this.image=null;
 }
}
