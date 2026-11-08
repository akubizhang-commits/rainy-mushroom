import {Node,UITransform,Sprite,SpriteFrame,Texture2D,ImageAsset,Color,isValid} from 'cc';
import {towerResources as resources} from './TowerResources';

type Web = {node:Node;sprite:Sprite;transform:UITransform;fromX:number;fromY:number;seen:boolean};
/** Presentation only: the existing M10 zone owns targeting, timing and damage. */
export class TowerSpiderWebArt {
 private requested=false;
 private dead=false;
 private image:ImageAsset|null=null;
 private texture:Texture2D|null=null;
 private frame:SpriteFrame|null=null;
 private webs=new Map<string,Web>();
 constructor(private parent:Node){}
 has(id:string){return this.webs.has(id);}
 private load(){
  if(this.requested)return;this.requested=true;
  resources.load('tower-monsters-motion/spider-web',ImageAsset,(error,image)=>{
   if(this.dead||error||!image||!isValid(this.parent,true))return;
   image.addRef();this.image=image;
   this.texture=new Texture2D();this.texture.image=image;
   this.texture.setFilters(Texture2D.Filter.LINEAR,Texture2D.Filter.LINEAR);
   this.frame=new SpriteFrame();this.frame.texture=this.texture;
  });
 }
 draw(state:any,camera:{x:number;y:number},sourcePosition?:(id:string)=>{x:number;y:number}|null){
  if(this.dead)return;
  for(const web of this.webs.values())web.seen=false;
  for(const z of state.monsterMechanics?.zones||[]){
   if(z.skillId!=='M10'||state.time>=z.expiresAt||![z.x,z.y,z.radius,z.startedAt,z.activatesAt,z.expiresAt].every(Number.isFinite))continue;
   const owner=state.enemies.find((e:any)=>e.id===z.ownerId&&e.hp>0);if(!owner)continue;
   this.load();
   // Reserve the last part of the telegraph for flight; arrive exactly at activation.
   const launch=Math.max(z.startedAt,z.activatesAt-.35);
   if(!this.frame||state.time<launch)continue;
   let web=this.webs.get(z.id);
   if(!web){
    const point=sourcePosition?.(z.ownerId),attached=point&&Number.isFinite(point.x+point.y);
    if(sourcePosition&&!attached&&state.time<z.activatesAt)continue;
    const node=new Node(`蛛网-${z.id}`);node.layer=this.parent.layer;this.parent.addChild(node);
    const transform=node.addComponent(UITransform);const sprite=node.addComponent(Sprite);
    sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.trim=false;sprite.spriteFrame=this.frame;
    web={node,transform,sprite,fromX:attached?point.x+camera.x:owner.x,
     fromY:attached?point.y+camera.y:owner.y+8,seen:true};this.webs.set(z.id,web);
   }
   web.seen=true;
   const flight=Math.max(0,Math.min(1,(state.time-launch)/Math.max(.001,z.activatesAt-launch)));
   const fade=state.time<z.activatesAt?1:Math.max(0,1-(state.time-z.activatesAt)/Math.max(.001,z.expiresAt-z.activatesAt));
   const size=2*z.radius/(1254/1536)*(.18+.82*flight*flight);
   web.transform.setContentSize(size,size);
   web.node.setPosition(web.fromX+(z.x-web.fromX)*flight-camera.x,web.fromY+(z.y-web.fromY)*flight+Math.sin(Math.PI*flight)*18-camera.y);
   web.sprite.color=new Color(255,255,255,Math.round(255*fade));
  }
  for(const [id,web]of this.webs)if(!web.seen){web.sprite.spriteFrame=null;web.node.removeFromParent();web.node.destroy();this.webs.delete(id);}
 }
 destroy(){
  this.dead=true;
  for(const web of this.webs.values()){web.sprite.spriteFrame=null;web.node.removeFromParent();web.node.destroy();}this.webs.clear();
  this.frame?.destroy();this.frame=null;this.texture?.destroy();this.texture=null;this.image?.decRef();this.image=null;
 }
}
