import {Node,UITransform,Sprite,SpriteFrame,Texture2D,ImageAsset,Color,isValid} from 'cc';
import {setTowerDepth} from './TowerDepthOrder';
import {towerResources as resources} from './TowerResources';

type Pillar = {node:Node;sprite:Sprite;transform:UITransform;seen:boolean};
/** Presentation only: the existing M20 pillar / M18 lock summon owns health, lifetime and collision. */
export class TowerPillarArt {
 private requested=false;
 private dead=false;
 private image:ImageAsset|null=null;
 private texture:Texture2D|null=null;
 private frame:SpriteFrame|null=null;
 private pillars=new Map<string,Pillar>();
 constructor(private parent:Node){}
 private load(){
  if(this.requested)return;this.requested=true;
  resources.load('tower-monsters-motion/pillar',ImageAsset,(error,image)=>{
   if(this.dead||error||!image||!isValid(this.parent,true))return;
   image.addRef();this.image=image;
   this.texture=new Texture2D();this.texture.image=image;
   this.texture.setFilters(Texture2D.Filter.LINEAR,Texture2D.Filter.LINEAR);
   this.frame=new SpriteFrame();this.frame.texture=this.texture;
  });
 }
 has(id:string){return this.pillars.has(id);}
 draw(state:any,camera:{x:number;y:number}){
  if(this.dead)return;
  for(const pillar of this.pillars.values())pillar.seen=false;
  for(const e of state.enemies||[]){
   if(!['pillar','lock'].includes(e.temporary?.kind)||e.hp<=0||state.time>=e.temporary.expiresAt||![e.x,e.y,e.radius].every(Number.isFinite))continue;
   if(!state.enemies.some((owner:any)=>owner.id===e.temporary.ownerId&&owner.hp>0))continue;
   this.load();if(!this.frame)continue;
   let pillar=this.pillars.get(e.id);
   if(!pillar){
    const node=new Node(`${e.temporary.kind==='lock'?'狱锁柱':'机关柱'}-${e.id}`);node.layer=this.parent.layer;this.parent.addChild(node);
    const transform=node.addComponent(UITransform);const sprite=node.addComponent(Sprite);
    sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.trim=false;sprite.spriteFrame=this.frame;
    pillar={node,transform,sprite,seen:true};this.pillars.set(e.id,pillar);
   }
   pillar.seen=true;
   const height=Math.max(100,e.radius*3),size=height*512/480;
   pillar.transform.setContentSize(size,size);
   pillar.node.setPosition(e.x-camera.x,e.y-camera.y+height/2);
   setTowerDepth(pillar.node,e.y);
   pillar.sprite.color=new Color(255,255,255,255);
  }
  for(const [id,pillar]of this.pillars)if(!pillar.seen){pillar.sprite.spriteFrame=null;pillar.node.removeFromParent();pillar.node.destroy();this.pillars.delete(id);}
 }
 destroy(){
  this.dead=true;
  for(const pillar of this.pillars.values()){pillar.sprite.spriteFrame=null;pillar.node.removeFromParent();pillar.node.destroy();}this.pillars.clear();
  this.frame?.destroy();this.frame=null;this.texture?.destroy();this.texture=null;this.image?.decRef();this.image=null;
 }
}
