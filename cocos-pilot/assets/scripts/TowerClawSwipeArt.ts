import {Node,UITransform,Sprite,SpriteFrame,Texture2D,ImageAsset,Color,isValid} from 'cc';
import {towerResources as resources} from './TowerResources';

type Plume = {node:Node;sprite:Sprite;transform:UITransform;seen:boolean};
/** Family-specific ordinary sweep feedback; follows the existing attack clock and sector. */
export class TowerClawSwipeArt {
 private requested=false;
 private dead=false;
 private image:ImageAsset|null=null;
 private texture:Texture2D|null=null;
 private frame:SpriteFrame|null=null;
 private plumes=new Map<string,Plume>();
 constructor(private parent:Node,private family='tiger',private asset='claw-swipe',private width=.75,private height=.5,
  private tint:readonly [number,number,number,number]=[255,255,255,255],private kind='sweep'){}
 private load(){
  if(this.requested)return;this.requested=true;
  resources.load(`tower-monsters-motion/${this.asset}`,ImageAsset,(error,image)=>{
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
  for(const owner of state.enemies||[]){
   const ai=owner.ai,a=ai?.attack;
   // 83号：普通熊、猿的掌扫/抡臂是扇形 slam；圆形 slam 仍归 TowerSlamArt。
   if(owner.family!==this.family||owner.hp<=0||a?.kind!==this.kind||this.kind==='slam'&&a.shape!=='sector'||!['windup','active'].includes(ai.mode))continue;
   if(![a.x,a.y,a.range,a.dirX,a.dirY,ai.until,state.time].every(Number.isFinite)||a.range<=0||Math.hypot(a.dirX,a.dirY)<=0)continue;
   this.load();
   if(!this.frame||ai.mode!=='active'||state.time>=ai.until)continue;
   const z={id:a.id};
   let plume=this.plumes.get(z.id);
   if(!plume){
    const node=new Node(`${this.asset}-${z.id}`);node.layer=this.parent.layer;this.parent.addChild(node);
    const transform=node.addComponent(UITransform);const sprite=node.addComponent(Sprite);
    sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.trim=false;sprite.spriteFrame=this.frame;
    plume={node,transform,sprite,seen:true};this.plumes.set(z.id,plume);
   }
   plume.seen=true;
   const fade=Math.min(1,Math.max(0,(ai.until-state.time)/.08));
   plume.transform.setContentSize(a.range*this.width,a.range*this.height);
   plume.transform.setAnchorPoint(.5,.5);
   plume.node.angle=Math.atan2(a.dirY,a.dirX)*180/Math.PI;
   const length=Math.hypot(a.dirX,a.dirY);
   plume.node.setPosition(a.x+a.dirX/length*a.range*.55-camera.x,a.y+a.dirY/length*a.range*.55-camera.y);
   plume.sprite.color=new Color(this.tint[0],this.tint[1],this.tint[2],Math.round(this.tint[3]*fade));
  }
  for(const [id,plume]of this.plumes)if(!plume.seen){plume.sprite.spriteFrame=null;plume.node.removeFromParent();plume.node.destroy();this.plumes.delete(id);}
 }
 destroy(){
  this.dead=true;
  for(const plume of this.plumes.values()){plume.sprite.spriteFrame=null;plume.node.removeFromParent();plume.node.destroy();}this.plumes.clear();
  this.frame?.destroy();this.frame=null;this.texture?.destroy();this.texture=null;this.image?.decRef();this.image=null;
 }
}
