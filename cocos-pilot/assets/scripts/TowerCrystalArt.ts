import {Node,UITransform,Sprite,SpriteFrame,Texture2D,ImageAsset,Color,isValid} from 'cc';
import {setTowerDepth} from './TowerDepthOrder';
import {towerResources as resources} from './TowerResources';

type Crystal = {node:Node;sprite:Sprite;transform:UITransform;seen:boolean};
/** Presentation only: the existing M04 summon owns health, lifetime and collision. */
export class TowerCrystalArt {
 private requested=false;
 private dead=false;
 private image:ImageAsset|null=null;
 private texture:Texture2D|null=null;
 private frame:SpriteFrame|null=null;
 private crystals=new Map<string,Crystal>();
 constructor(private parent:Node,private broken=false){}
 private load(){
  if(this.requested)return;this.requested=true;
  resources.load(this.broken?'tower-monsters-motion/crystal-break':'tower-monsters-motion/crystal',ImageAsset,(error,image)=>{
   if(this.dead||error||!image||!isValid(this.parent,true))return;
   image.addRef();this.image=image;
   this.texture=new Texture2D();this.texture.image=image;
   this.texture.setFilters(Texture2D.Filter.LINEAR,Texture2D.Filter.LINEAR);
   this.frame=new SpriteFrame();this.frame.texture=this.texture;
  });
 }
 has(id:string){return this.crystals.has(id);}
 draw(state:any,camera:{x:number;y:number}){
  if(this.dead)return;
  for(const crystal of this.crystals.values())crystal.seen=false;
  if(this.broken&&(state.enemies||[]).some((e:any)=>e.temporary?.kind==='crystal'&&e.hp>0))this.load();
  const candidates=this.broken?(state.effects||[]).filter((e:any)=>e.kind==='monster_crystal_break'&&state.time>=e.startedAt&&state.time<e.expiresAt).map((e:any)=>({...e,hp:1,temporary:{kind:'crystal',ownerId:e.ownerId,expiresAt:e.expiresAt}})):state.enemies||[];
  for(const e of candidates){
   if(e.temporary?.kind!=='crystal'||e.hp<=0||state.time>=e.temporary.expiresAt||![e.x,e.y,e.radius].every(Number.isFinite))continue;
   if(!state.enemies.some((owner:any)=>owner.id===e.temporary.ownerId&&owner.hp>0))continue;
   this.load();if(!this.frame)continue;
   let crystal=this.crystals.get(e.id);
   if(!crystal){
    const node=new Node(`${this.broken?"结晶碎裂":"护甲结晶"}-${e.id}`);node.layer=this.parent.layer;this.parent.addChild(node);
    const transform=node.addComponent(UITransform);const sprite=node.addComponent(Sprite);
    sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.trim=false;sprite.spriteFrame=this.frame;
    crystal={node,transform,sprite,seen:true};this.crystals.set(e.id,crystal);
   }
   crystal.seen=true;
   const height=Math.max(56,e.radius*2),size=height*512/480;
   crystal.transform.setContentSize(size,size);
   crystal.node.setPosition(e.x-camera.x,e.y-camera.y+height/2);
   setTowerDepth(crystal.node,e.y);
   crystal.sprite.color=new Color(255,255,255,this.broken?Math.round(255*Math.min(1,Math.max(0,(e.expiresAt-state.time)/.45))):255);
  }
  for(const [id,crystal]of this.crystals)if(!crystal.seen){crystal.sprite.spriteFrame=null;crystal.node.removeFromParent();crystal.node.destroy();this.crystals.delete(id);}
 }
 destroy(){
  this.dead=true;
  for(const crystal of this.crystals.values()){crystal.sprite.spriteFrame=null;crystal.node.removeFromParent();crystal.node.destroy();}this.crystals.clear();
  this.frame?.destroy();this.frame=null;this.texture?.destroy();this.texture=null;this.image?.decRef();this.image=null;
 }
}
