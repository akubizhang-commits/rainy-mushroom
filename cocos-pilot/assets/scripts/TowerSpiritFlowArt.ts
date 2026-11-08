import {Node,UITransform,Sprite,SpriteFrame,Texture2D,ImageAsset,Color,isValid} from 'cc';
import {towerResources as resources} from './TowerResources';

type Plume = {node:Node;sprite:Sprite;transform:UITransform;seen:boolean};
/** M03 visual connection only; simulation owns healing and interruption. */
export class TowerSpiritFlowArt {
 private requested=false;
 private dead=false;
 private image:ImageAsset|null=null;
 private texture:Texture2D|null=null;
 private frame:SpriteFrame|null=null;
 private plumes=new Map<string,Plume>();
 constructor(private parent:Node){}
 private load(){
  if(this.requested)return;this.requested=true;
  resources.load('tower-monsters-motion/spirit-flow',ImageAsset,(error,image)=>{
   if(this.dead||error||!image||!isValid(this.parent,true))return;
   image.addRef();this.image=image;
   this.texture=new Texture2D();this.texture.image=image;
   this.texture.setFilters(Texture2D.Filter.LINEAR,Texture2D.Filter.LINEAR);
   this.frame=new SpriteFrame();this.frame.texture=this.texture;
  });
 }
 has(id:string){return this.plumes.has(id);}
 draw(state:any,camera:{x:number;y:number},bodyPosition?:(id:string)=>{x:number;y:number}|null){
  if(this.dead)return;
  for(const plume of this.plumes.values())plume.seen=false;
  for(const core of state.enemies||[]){
   if(core.temporary?.kind!=='core'||core.hp<=0||state.time>=core.temporary.expiresAt)continue;
   const owner=state.enemies.find((e:any)=>e.id===core.temporary.ownerId&&e.hp>0);if(!owner)continue;
   this.load();const m=owner.mechanic;
   if(!this.frame||m?.skillId!=='M03'||m.phase!=='active'||state.time>=m.until||m.healRemaining<=0||owner.hp>=owner.maxHp||owner.hp/owner.maxHp<=.2)continue;
   const point=bodyPosition?.(owner.id),attached=point&&Number.isFinite(point.x+point.y);
   if(bodyPosition&&!attached)continue;
   const z={id:core.id,x:core.x,y:core.y+Math.max(56,core.radius*2)/2,
    toX:attached?point.x+camera.x:owner.x,toY:attached?point.y+camera.y:owner.y+Math.max(56,owner.radius*2)*.6};
   if(![z.x,z.y,z.toX,z.toY].every(Number.isFinite)||Math.hypot(z.toX-z.x,z.toY-z.y)<1)continue;
   let plume=this.plumes.get(z.id);
   if(!plume){
    const node=new Node(`汲灵联系-${z.id}`);node.layer=this.parent.layer;this.parent.addChild(node);
    const transform=node.addComponent(UITransform);const sprite=node.addComponent(Sprite);
    sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.trim=false;sprite.spriteFrame=this.frame;
    plume={node,transform,sprite,seen:true};this.plumes.set(z.id,plume);
   }
   plume.seen=true;
   const fade=.8+.2*Math.sin((state.time-m.startedAt)*Math.PI*3);
   plume.transform.setContentSize(Math.hypot(z.toX-z.x,z.toY-z.y),Math.min(24,Math.max(10,Math.hypot(z.toX-z.x,z.toY-z.y)*.12)));
   plume.transform.setAnchorPoint(0,.5);
   plume.node.angle=Math.atan2(z.toY-z.y,z.toX-z.x)*180/Math.PI;
   plume.node.setPosition(z.x-camera.x,z.y-camera.y);
   plume.sprite.color=new Color(255,255,255,Math.round(215*fade));
  }
  for(const [id,plume]of this.plumes)if(!plume.seen){plume.sprite.spriteFrame=null;plume.node.removeFromParent();plume.node.destroy();this.plumes.delete(id);}
 }
 destroy(){
  this.dead=true;
  for(const plume of this.plumes.values()){plume.sprite.spriteFrame=null;plume.node.removeFromParent();plume.node.destroy();}this.plumes.clear();
  this.frame?.destroy();this.frame=null;this.texture?.destroy();this.texture=null;this.image?.decRef();this.image=null;
 }
}
