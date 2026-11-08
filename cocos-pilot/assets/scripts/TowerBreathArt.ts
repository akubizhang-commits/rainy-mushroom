import {Node,UITransform,Sprite,SpriteFrame,Texture2D,ImageAsset,Color,isValid} from 'cc';
import {towerResources as resources} from './TowerResources';

type Plume = {node:Node;sprite:Sprite;transform:UITransform;seen:boolean;jet?:{node:Node;sprite:Sprite;transform:UITransform}};
/** Presentation only: the existing M16 zone owns targeting, timing and damage. */
export class TowerBreathArt {
 private requested=false;
 private dead=false;
 private image:ImageAsset|null=null;
 private texture:Texture2D|null=null;
 private frame:SpriteFrame|null=null;
 private plumes=new Map<string,Plume>();
 constructor(private parent:Node){}
 private load(){
  if(this.requested)return;this.requested=true;
  resources.load('tower-monsters-motion/breath',ImageAsset,(error,image)=>{
   if(this.dead||error||!image||!isValid(this.parent,true))return;
   image.addRef();this.image=image;
   this.texture=new Texture2D();this.texture.image=image;
   this.texture.setFilters(Texture2D.Filter.LINEAR,Texture2D.Filter.LINEAR);
   this.frame=new SpriteFrame();this.frame.texture=this.texture;
  });
 }
 has(id:string){return this.plumes.has(id);}
 draw(state:any,camera:{x:number;y:number},mouthPosition?:(id:string)=>{x:number;y:number}|null){
  if(this.dead)return;
  for(const plume of this.plumes.values())plume.seen=false;
  for(const z of state.monsterMechanics?.zones||[]){
   if(z.skillId!=='M16'||state.time>=z.expiresAt||![z.x,z.y,z.radius,z.faceX,z.faceY,z.startedAt,z.activatesAt,z.expiresAt].every(Number.isFinite))continue;
   const owner=state.enemies.find((e:any)=>e.id===z.ownerId&&e.hp>0);if(!owner)continue;
   this.load();
   if(!this.frame||state.time<z.activatesAt)continue;
   let plume=this.plumes.get(z.id);
   if(!plume){
    const node=new Node(`妖息-${z.id}`);node.layer=this.parent.layer;this.parent.addChild(node);
    const transform=node.addComponent(UITransform);const sprite=node.addComponent(Sprite);
    sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.trim=false;sprite.spriteFrame=this.frame;
    plume={node,transform,sprite,seen:true};this.plumes.set(z.id,plume);
   }
   plume.seen=true;
   const mouth=mouthPosition?.(z.ownerId),hasMouth=!!mouth&&Number.isFinite(mouth.x+mouth.y);
   const direction=Math.atan2(z.faceY,z.faceX),dx=Math.cos(direction),dy=Math.sin(direction);
   // Keep the distant cloud in the original ground hazard; a separate jet descends from the mouth.
   const offset=hasMouth?z.radius*.3:0,remaining=z.radius-offset;
   const fade=Math.min(1,Math.max(0,(z.expiresAt-state.time)/.25));
   plume.transform.setContentSize(remaining*512/480,remaining*768/480);
   plume.transform.setAnchorPoint(16/512,.5);
   plume.node.angle=Math.atan2(z.faceY,z.faceX)*180/Math.PI;
   plume.node.setPosition(z.x+dx*offset-camera.x,z.y+dy*offset-camera.y);
   plume.sprite.color=new Color(255,255,255,Math.round((hasMouth?155:215)*fade));
   if(hasMouth){
    if(!plume.jet){
     const node=new Node(`口部妖息-${z.id}`);node.layer=this.parent.layer;this.parent.addChild(node);
     const transform=node.addComponent(UITransform),sprite=node.addComponent(Sprite);
     sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.trim=false;sprite.spriteFrame=this.frame;
     plume.jet={node,transform,sprite};
    }
    const jet=plume.jet,tx=z.x+dx*z.radius*.55-camera.x,ty=z.y+dy*z.radius*.55-camera.y;
    const length=Math.hypot(tx-mouth!.x,ty-mouth!.y);
    jet.node.active=true;jet.transform.setAnchorPoint(16/512,.5);
    jet.transform.setContentSize(length*512/480,Math.min(48,Math.max(20,z.radius*.24)));
    jet.node.setPosition(mouth!.x,mouth!.y);jet.node.angle=Math.atan2(ty-mouth!.y,tx-mouth!.x)*180/Math.PI;
    jet.sprite.color=new Color(255,255,255,Math.round(235*fade));
   }else if(plume.jet)plume.jet.node.active=false;
  }
  for(const [id,plume]of this.plumes)if(!plume.seen){this.remove(plume);this.plumes.delete(id);}
 }
 private remove(plume:Plume){
  if(plume.jet){plume.jet.sprite.spriteFrame=null;plume.jet.node.removeFromParent();plume.jet.node.destroy();}
  plume.sprite.spriteFrame=null;plume.node.removeFromParent();plume.node.destroy();
 }
 destroy(){
  this.dead=true;
  for(const plume of this.plumes.values())this.remove(plume);this.plumes.clear();
  this.frame?.destroy();this.frame=null;this.texture?.destroy();this.texture=null;this.image?.decRef();this.image=null;
 }
}
