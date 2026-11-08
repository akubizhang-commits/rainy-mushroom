import {Node,UITransform,Sprite,SpriteFrame,Texture2D,ImageAsset,Color,isValid} from 'cc';
import {setTowerDepth} from './TowerDepthOrder';
import {towerResources as resources} from './TowerResources';

type Egg = {node:Node;sprite:Sprite;transform:UITransform;seen:boolean};
/** Presentation only: the existing M22 summon owns health, lifetime and hatching. */
export class TowerEggArt {
 private requested=false;
 private dead=false;
 private image:ImageAsset|null=null;
 private texture:Texture2D|null=null;
 private frame:SpriteFrame|null=null;
 private eggs=new Map<string,Egg>();
 constructor(private parent:Node,private hatched=false){}
 private load(){
  if(this.requested)return;this.requested=true;
  resources.load(this.hatched?'tower-monsters-motion/egg-hatched':'tower-monsters-motion/egg',ImageAsset,(error,image)=>{
   if(this.dead||error||!image||!isValid(this.parent,true))return;
   image.addRef();this.image=image;
   this.texture=new Texture2D();this.texture.image=image;
   this.texture.setFilters(Texture2D.Filter.LINEAR,Texture2D.Filter.LINEAR);
   this.frame=new SpriteFrame();this.frame.texture=this.texture;
  });
 }
 has(id:string){return this.eggs.has(id);}
 draw(state:any,camera:{x:number;y:number}){
  if(this.dead)return;
  for(const egg of this.eggs.values())egg.seen=false;
  // Preload while the intact egg is visible; a hatch event remains authoritative.
  if(this.hatched&&(state.enemies||[]).some((e:any)=>e.temporary?.kind==='egg'&&e.hp>0))this.load();
  const candidates=this.hatched?(state.effects||[]).filter((e:any)=>e.kind==='monster_egg_hatched'&&state.time>=e.startedAt&&state.time<e.expiresAt).map((e:any)=>({...e,hp:1,temporary:{kind:'egg',ownerId:e.ownerId,expiresAt:e.expiresAt}})):state.enemies||[];
  for(const e of candidates){
   if(e.temporary?.kind!=='egg'||e.hp<=0||state.time>=e.temporary.expiresAt||![e.x,e.y,e.radius].every(Number.isFinite))continue;
   if(!state.enemies.some((owner:any)=>owner.id===e.temporary.ownerId&&owner.hp>0))continue;
   this.load();if(!this.frame)continue;
   let egg=this.eggs.get(e.id);
   if(!egg){
    const node=new Node(`${this.hatched?"孵化残囊":"妖卵"}-${e.id}`);node.layer=this.parent.layer;this.parent.addChild(node);
    const transform=node.addComponent(UITransform);const sprite=node.addComponent(Sprite);
    sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.trim=false;sprite.spriteFrame=this.frame;
    egg={node,transform,sprite,seen:true};this.eggs.set(e.id,egg);
   }
   egg.seen=true;
   const height=Math.max(56,e.radius*2),size=height*512/480;
   egg.transform.setContentSize(size,size);
   egg.node.setPosition(e.x-camera.x,e.y-camera.y+height/2);
   setTowerDepth(egg.node,e.y);
   egg.sprite.color=new Color(255,255,255,this.hatched?Math.round(255*Math.min(1,Math.max(0,(e.expiresAt-state.time)/.5))):255);
  }
  for(const [id,egg]of this.eggs)if(!egg.seen){egg.sprite.spriteFrame=null;egg.node.removeFromParent();egg.node.destroy();this.eggs.delete(id);}
 }
 destroy(){
  this.dead=true;
  for(const egg of this.eggs.values()){egg.sprite.spriteFrame=null;egg.node.removeFromParent();egg.node.destroy();}this.eggs.clear();
  this.frame?.destroy();this.frame=null;this.texture?.destroy();this.texture=null;this.image?.decRef();this.image=null;
 }
}
