import {Node,UITransform,Sprite,SpriteFrame,Texture2D,ImageAsset,Color,isValid} from 'cc';
import {towerResources as resources} from './TowerResources';

type Plate={node:Node;sprite:Sprite;transform:UITransform};
type Armor={node:Node;body:Node;plates:Plate[];side:number;seen:boolean};
// Landmarks on the delivered bear-humanoid portrait, measured from its top left.
const LANDMARKS=[
 [[.34,.32,.23,-25],[.43,.41,.18,-18],[.28,.50,.18,-15]],
 [[.64,.33,.23,25],[.55,.41,.18,18],[.73,.49,.18,15]]
];
/** M04 presentation only. Crystal receipts bind each half of the armor across reloads. */
export class TowerArmorArt {
 private requested=false;
 private dead=false;
 private image:ImageAsset|null=null;
 private texture:Texture2D|null=null;
 private frame:SpriteFrame|null=null;
 private groups=new Map<string,Armor>();
 constructor(private actors:Node){}
 private load(){
  if(this.requested)return;this.requested=true;
  resources.load('tower-monsters-motion/crystal',ImageAsset,(error,image)=>{
   if(this.dead||error||!image||!isValid(this.actors,true))return;
   image.addRef();this.image=image;
   this.texture=new Texture2D();this.texture.image=image;
   this.texture.setFilters(Texture2D.Filter.LINEAR,Texture2D.Filter.LINEAR);
   this.frame=new SpriteFrame();this.frame.texture=this.texture;
  });
 }
 draw(state:any){
  if(this.dead)return;
  for(const group of this.groups.values())group.seen=false;
  for(const owner of state.enemies||[]){
   const m=owner.mechanic;
   if(owner.archetype!=='bear_boss'||owner.hp<=0||!m)continue;
   // Preload in windup without showing armor before the simulation activates it.
   if(m.skillId==='M04')this.load();
   if(!(m.armor>0&&m.armorUntil>state.time))continue;
   const body=this.actors.children.find(n=>n.name===`妖兽素材-${owner.id}`&&n.active&&isValid(n,true));
   const transform=body?.getComponent(UITransform);
   if(!body||!transform)continue;
   const receipts=(state.monsterMechanics?.summons||[]).filter((r:any)=>r.ownerId===owner.id&&r.kind==='crystal'&&r.batch===m.batch)
    .slice().sort((a:any,b:any)=>a.sequence-b.sequence).slice(0,2);
   this.load();if(!this.frame)continue;
   for(let side=0;side<receipts.length;side++){
    const receipt=receipts[side];
    const crystal=state.enemies.find((e:any)=>e.id===receipt.id&&e.hp>0&&e.temporary?.kind==='crystal'&&e.temporary.ownerId===owner.id&&e.temporary.batch===m.batch&&e.temporary.expiresAt>state.time);
    if(!crystal)continue;
    let group=this.groups.get(receipt.id);
    if(group&&(!isValid(group.node,true)||group.body!==body)){
     this.remove(group);this.groups.delete(receipt.id);group=undefined;
    }
    if(!group){
     const node=new Node(`本体晶甲-${receipt.id}`);node.layer=body.layer;body.addChild(node);
     node.addComponent(UITransform);
     const plates=LANDMARKS[side].map(()=>{
      const n=new Node('晶甲片');n.layer=body.layer;node.addChild(n);
      const t=n.addComponent(UITransform),sprite=n.addComponent(Sprite);
      sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.trim=false;sprite.spriteFrame=this.frame;
      return {node:n,sprite,transform:t};
     });
     group={node,body,plates,side,seen:true};this.groups.set(receipt.id,group);
    }
    group.seen=true;
    for(let i=0;i<group.plates.length;i++){
     const [u,v,size,angle]=LANDMARKS[side][i],p=group.plates[i];
     p.transform.setContentSize(transform.width*size*1.05,transform.height*size);
     p.node.setPosition((u-transform.anchorX)*transform.width,(1-v-transform.anchorY)*transform.height);
     p.node.angle=angle;
     p.sprite.color=new Color(175,205,196,170);
    }
   }
  }
  for(const [id,group]of this.groups)if(!group.seen){this.remove(group);this.groups.delete(id);}
 }
 private remove(group:Armor){
  if(!isValid(group.node,true))return;
  for(const p of group.plates)p.sprite.spriteFrame=null;
  group.node.removeFromParent();group.node.destroy();
 }
 destroy(){
  this.dead=true;for(const group of this.groups.values())this.remove(group);this.groups.clear();
  this.frame?.destroy();this.frame=null;this.texture?.destroy();this.texture=null;this.image?.decRef();this.image=null;
 }
}
