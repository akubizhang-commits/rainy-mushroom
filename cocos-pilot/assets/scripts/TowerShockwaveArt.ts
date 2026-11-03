import {Node,UITransform,Sprite,SpriteFrame,Texture2D,ImageAsset,Color,isValid,Rect,Mask,Graphics} from 'cc';
import {towerResources as resources} from './TowerResources';

type Strip={node:Node;transform:UITransform;sprite:Sprite};
type Wave={node:Node;mask:Graphics;strips:Strip[];seen:boolean};
/** Unwrapped user art follows the existing annulus, including its fixed-width band. */
export class TowerShockwaveArt {
 private requested=false;private dead=false;
 private image:ImageAsset|null=null;private texture:Texture2D|null=null;
 private frames:SpriteFrame[]=[];private waves=new Map<string,Wave>();
 constructor(private parent:Node){}
 private load(){
  if(this.requested)return;this.requested=true;
  resources.load('tower-monsters-motion/shockwave',ImageAsset,(error,image)=>{
   if(this.dead||error||!image||!isValid(this.parent,true))return;
   image.addRef();this.image=image;this.texture=new Texture2D();this.texture.image=image;
   this.texture.setFilters(Texture2D.Filter.LINEAR,Texture2D.Filter.LINEAR);
   for(let i=0;i<72;i++){const f=new SpriteFrame();f.texture=this.texture;f.rect=new Rect(i*16,0,16,256);this.frames.push(f);}
  });
 }
 has(id:string){return this.waves.has(id);}
 draw(state:any,camera:{x:number;y:number}){
  if(this.dead)return;
  for(const w of this.waves.values())w.seen=false;
  for(const z of state.monsterMechanics?.zones||[]){
   if(!['M15','M07'].includes(z.skillId)||state.time>=z.expiresAt||![z.x,z.y,z.radius,z.innerRadius,z.angle,z.faceX,z.faceY,z.activatesAt,z.expiresAt].every(Number.isFinite))continue;
   if(!state.enemies.some((e:any)=>e.id===z.ownerId&&e.hp>0))continue;
   this.load();if(!this.frames.length||state.time<z.activatesAt)continue;
   let w=this.waves.get(z.id);
   if(!w){
    const node=new Node(`环形震波-${z.id}`);node.layer=this.parent.layer;this.parent.addChild(node);node.addComponent(UITransform);
    const stencil=node.addComponent(Mask);stencil.type=Mask.Type.GRAPHICS_STENCIL;
    const mask=node.getComponent(Graphics)!;
    const strips:Strip[]=[];
    for(let i=0;i<72;i++){
     const part=new Node(`尘浪-${i}`);part.layer=node.layer;node.addChild(part);
     const transform=part.addComponent(UITransform),sprite=part.addComponent(Sprite);
     sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.trim=true;sprite.spriteFrame=this.frames[i];
     part.setScale(-1,1,1);strips.push({node:part,transform,sprite});
    }
    w={node,mask,strips,seen:true};this.waves.set(z.id,w);
   }
   w.seen=true;w.node.setPosition(z.x-camera.x,z.y-camera.y);w.node.angle=Math.atan2(z.faceY,z.faceX)*180/Math.PI;
   // M07 dust is cosmetic inside the unchanged full-disk damage zone.
   const stomp=z.skillId==='M07',progress=Math.max(0,Math.min(1,(state.time-z.activatesAt)/(z.expiresAt-z.activatesAt)));
   const outer=Math.max(0,z.radius)*(stomp?.45+.55*progress:1),inner=stomp?Math.max(0,outer-35):Math.max(0,Math.min(outer,z.innerRadius));
   const angle=stomp?Math.PI*2:z.angle,half=angle/2,step=angle/72,mid=(outer+inner)/2;
   // Stencil clips tangent strips to the exact simulation band and safe opening.
   const g=w.mask;g.clear();g.moveTo(Math.cos(-half)*inner,Math.sin(-half)*inner);
   for(let i=0;i<=72;i++){const a=-half+i*step;g.lineTo(Math.cos(a)*outer,Math.sin(a)*outer);}
   for(let i=72;i>=0;i--){const a=-half+i*step;g.lineTo(Math.cos(a)*inner,Math.sin(a)*inner);}
   g.close();g.fill();
   const alpha=Math.round(235*Math.min(1,Math.max(0,(z.expiresAt-state.time)/.15)));
   for(let i=0;i<72;i++){
    const a=-half+(i+.5)*step,s=w.strips[i];
    s.transform.setContentSize(2*outer*Math.tan(step/2)+.25,outer-inner);
    s.node.setPosition(Math.cos(a)*mid,Math.sin(a)*mid);s.node.angle=a*180/Math.PI-90;
    s.sprite.color=new Color(255,255,255,alpha);
   }
  }
  for(const [id,w]of this.waves)if(!w.seen){this.remove(w);this.waves.delete(id);}
 }
 private remove(w:Wave){for(const s of w.strips)s.sprite.spriteFrame=null;w.node.removeFromParent();w.node.destroy();}
 destroy(){this.dead=true;for(const w of this.waves.values())this.remove(w);this.waves.clear();for(const f of this.frames)f.destroy();this.frames=[];this.texture?.destroy();this.texture=null;this.image?.decRef();this.image=null;}
}
