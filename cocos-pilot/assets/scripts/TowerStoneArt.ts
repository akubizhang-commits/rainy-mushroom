import {towerResources as resources} from './TowerResources';
import {ImageAsset,isValid,Node,Sprite,SpriteFrame,Texture2D,UITransform} from 'cc';

const files=['stone_low','stone_mid','stone_high','stone_top','resource_contribution','resource_xp_essence','resource_skill_point','resource_skill_book','pill_huichuncao','pill_bailuhua','pill_huangjing','pill_lingshenxu','pill_ningluzhi','pill_linglu','pill_yusuizhi','pill_zilinghua','pill_jinsuiguo','pill_yangyuan','pill_zhenyuan','pill_zifu','pill_heqi','pill_ningqi','pill_xuming','pill_zhixue','pill_huiling','pill_huichun','pill_peiyuan','pill_zhuji','pill_ningyuan','pill_ningdan','pill_jiuzhuan','pill_xiaoyue','pill_chilin','pill_forge_xuantie','pill_forge_lingmu','pill_forge_yaopi','pill_forge_lingsi','pill_forge_lingyu','pill_forge_tiejing','pill_forge_hanjingsha','pill_forge_chitongjing','pill_forge_zijingsui','pill_forge_ninglingjing','pill_forge_core_fa','pill_forge_core_bao','pill_forge_core_ling','drop_heal','ui_bag','ui_skills','ui_settings','ui_chest'];
type Resource='resource_contribution'|'resource_xp_essence'|'resource_skill_point'|'resource_skill_book'|'pill_huichuncao'|'pill_bailuhua'|'pill_huangjing'|'pill_lingshenxu'|'pill_ningluzhi'|'pill_linglu'|'pill_yusuizhi'|'pill_zilinghua'|'pill_jinsuiguo'|'pill_yangyuan'|'pill_zhenyuan'|'pill_zifu'|'pill_heqi'|'pill_ningqi'|'pill_xuming'|'pill_zhixue'|'pill_huiling'|'pill_huichun'|'pill_peiyuan'|'pill_zhuji'|'pill_ningyuan'|'pill_ningdan'|'pill_jiuzhuan'|'pill_xiaoyue'|'pill_chilin'|'pill_forge_xuantie'|'pill_forge_lingmu'|'pill_forge_yaopi'|'pill_forge_lingsi'|'pill_forge_lingyu'|'pill_forge_tiejing'|'pill_forge_hanjingsha'|'pill_forge_chitongjing'|'pill_forge_zijingsui'|'pill_forge_ninglingjing'|'pill_forge_core_fa'|'pill_forge_core_bao'|'pill_forge_core_ling'|'drop_heal'|'ui_bag'|'ui_skills'|'ui_settings'|'ui_chest';
type Asset={done:boolean;image:ImageAsset|null;texture:Texture2D|null;frame:SpriteFrame|null};
type Binding={node:Node;sprite:Sprite;grade:number;seen:boolean;ready?:()=>void};

/** Shared denomination artwork for a host lifetime; never touches the wallet. */
export class TowerStoneArt {
 private dead=false;
 private assets=new Map<number,Asset>();
 private bindings=new Map<string,Binding>();

 beginFrame(){for(const binding of this.bindings.values())binding.seen=false;}
 /** Small shared pickup icons, ready before the first kill. No world bindings. */
 preloadDrops(){
  for(let grade=0;grade<files.length;grade++){
   const name=files[grade];
   if(grade<4||name.startsWith('pill_')||name==='drop_heal'||name==='resource_xp_essence')this.request(grade);
  }
 }
 private request(grade:number){
  let asset=this.assets.get(grade);
  if(!asset&&!this.dead){
   asset={done:false,image:null,texture:null,frame:null};this.assets.set(grade,asset);
   const current=asset;
   try{resources.load(`tower-stones/${files[grade]}`,ImageAsset,(error,image)=>this.finish(grade,current,error,image));}
   catch(error){this.finish(grade,current,error,null);}
  }
  return asset;
 }

 /** False keeps the caller's existing crystal glyph visible while loading. */
 draw(parent:Node,key:string,grade:number,x:number,y:number,size:number,ready?:()=>void){
  if(!Number.isInteger(grade)||grade<0||grade>3)return false;
  return this.drawSlot(parent,key,grade,x,y,size,ready);
 }
 drawResource(parent:Node,key:string,resource:Resource,x:number,y:number,size:number,ready?:()=>void){
  const slot=files.indexOf(resource);
  if(slot<4)return false;
  return this.drawSlot(parent,key,slot,x,y,size,ready);
 }
 private drawSlot(parent:Node,key:string,grade:number,x:number,y:number,size:number,ready?:()=>void){
  if(this.dead||!isValid(parent,true)
   ||!Number.isFinite(x+y+size)||size<=0)return false;
  let binding=this.bindings.get(key);
  if(binding&&(!isValid(binding.node,true)||binding.node.parent!==parent||binding.grade!==grade)){
   this.remove(key);binding=undefined;
  }
  if(!binding){
   const node=new Node(`灵石素材-${files[grade]}-${key}`);node.layer=parent.layer;parent.addChild(node);
   node.addComponent(UITransform).setContentSize(size,size);
   const sprite=node.addComponent(Sprite);sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.trim=false;
   node.active=false;
   binding={node,sprite,grade,seen:true,ready};this.bindings.set(key,binding);
  }
  binding.seen=true;binding.node.setPosition(x,y);
  binding.node.getComponent(UITransform)!.setContentSize(size,size);
  const asset=this.request(grade)!;
  if(asset.frame)this.show(binding,asset.frame);
  return !!asset.frame;
 }

 endFrame(){for(const [key,binding] of this.bindings)if(!binding.seen)this.remove(key);}
 clearBindings(){for(const key of this.bindings.keys())this.remove(key);}
 destroy(){
  if(this.dead)return;this.dead=true;this.clearBindings();
  for(const asset of this.assets.values())this.release(asset);
  this.assets.clear();
 }
 private finish(grade:number,asset:Asset,error:unknown,image:ImageAsset|null){
  if(this.dead||asset.done)return;asset.done=true;
  if(!error&&image&&image.width===128&&image.height===128){
   try{
    image.addRef();asset.image=image;
    const texture=asset.texture=new Texture2D();texture.image=image;
    texture.setFilters(Texture2D.Filter.LINEAR,Texture2D.Filter.LINEAR);
    const frame=asset.frame=new SpriteFrame();frame.texture=texture;
   }catch{this.release(asset);}
  }
  if(asset.frame)for(const binding of this.bindings.values())if(binding.grade===grade)this.show(binding,asset.frame);
 }
 private show(binding:Binding,frame:SpriteFrame){
  if(!isValid(binding.node,true)||!isValid(binding.sprite,true))return;
  binding.sprite.spriteFrame=frame;binding.node.active=true;
  const ready=binding.ready;binding.ready=undefined;ready?.();
 }
 private remove(key:string){
  const binding=this.bindings.get(key);
  if(binding&&isValid(binding.node,true)){binding.node.removeFromParent();binding.node.destroy();}
  this.bindings.delete(key);
 }
 private release(asset:Asset){
  asset.frame?.destroy();asset.frame=null;asset.texture?.destroy();asset.texture=null;
  asset.image?.decRef();asset.image=null;
 }
}
