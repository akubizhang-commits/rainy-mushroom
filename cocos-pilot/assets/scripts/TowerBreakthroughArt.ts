import {ImageAsset,isValid,Node,Sprite,SpriteFrame,Texture2D,UITransform} from 'cc';
import {towerResources as resources} from './TowerResources';
import {createBreakthroughPainter} from './shared/js/xianxia/TowerBreakthroughPainter';
import {createJindanPainter} from './shared/js/xianxia/TowerJindanPainter';

/** One reusable 960×540 canvas texture; time is owned by TowerView.
 * Uses the same offscreen-canvas path as LiangyiFormationArt on WeChat.
 * No uploads while paused. A missing optional asset leaves the original art visible.
 */
export class TowerBreakthroughArt {
 private dead=false;private requested=false;private failed=false;
 private images:Record<string,ImageAsset>={};
 private canvas:any=null;private image:ImageAsset|null=null;
 private texture:Texture2D|null=null;private frame:SpriteFrame|null=null;
 private actor:Node|null=null;private painter:any=null;private key='';
 uploads=0;
 constructor(private kind:'zhuji'|'jindan'='zhuji'){}
 private get assets(){return this.kind==='jindan'?[['hero','seated'],['dao','jindan-dao'],['core','jindan-core']]:[['hero','seated'],['dao','dao'],['beam','beam']];}
 get ready(){return !this.dead&&!this.failed&&this.assets.every(([key])=>!!this.images[key]);}
 preload(){
  if(this.requested||this.dead)return;this.requested=true;
  for(const [key,name] of this.assets){
   resources.load(`tower-breakthrough/${name}`,ImageAsset,(error,image)=>{
    if(this.dead||this.failed)return;
    if(error||!image){this.failed=true;this.release();return;}
    image.addRef();this.images[key]=image;
   });
  }
 }
 private create(){
  const scope=globalThis as any,wx=scope.wx;
  this.canvas=wx?.createOffscreenCanvas?wx.createOffscreenCanvas({type:'2d',width:960,height:540})
   :wx?.createCanvas?wx.createCanvas():scope.document?.createElement('canvas');
  if(!this.canvas)throw Error('2D canvas unavailable');
  this.canvas.width=960;this.canvas.height=540;
  if(!this.canvas.getContext('2d'))throw Error('2D canvas context unavailable');
  this.image=new ImageAsset(this.canvas);this.texture=new Texture2D();this.texture.image=this.image;
  this.texture.setFilters(Texture2D.Filter.LINEAR,Texture2D.Filter.LINEAR);
  this.frame=new SpriteFrame();this.frame.texture=this.texture;this.frame.packable=false;
  const images=Object.fromEntries(Object.entries(this.images).map(([key,image])=>[key,image.data]));
  this.painter=(this.kind==='jindan'?createJindanPainter:createBreakthroughPainter)(this.canvas,images);
 }
 draw(parent:Node,width:number,height:number,status:string,elapsed:number,success:boolean,reduced:boolean){
  this.preload();if(!this.ready)return false;
  try{
   if(!this.frame)this.create();
   if(!this.actor||!isValid(this.actor,true)){
    this.actor=new Node(this.kind==='jindan'?'金丹盘坐特效':'筑基盘坐特效');this.actor.layer=parent.layer;parent.addChild(this.actor);
    this.actor.addComponent(UITransform);
    const sprite=this.actor.addComponent(Sprite);sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.trim=false;sprite.spriteFrame=this.frame;
    this.key='';
   }
   const ceremony=status==='ceremony';
   // Reserve the lower material/result controls outside the ceremony.
   const scale=Math.min(width/1280,(ceremony?height:Math.max(180,height-250))/720);
   this.actor.getComponent(UITransform)!.setContentSize(1280*scale,720*scale);
   this.actor.setPosition(0,ceremony?0:70);
   const t=ceremony?Math.floor(Math.max(0,elapsed)*30)/30:4;
   const key=`${status}:${t}:${success}:${reduced}`;
   if(this.key!==key){
    this.painter.draw(t,{success,reduced,effects:ceremony||this.kind==='jindan'&&status==='success',background:false,labels:false});
    this.texture!.uploadData(this.canvas);this.uploads++;this.key=key;
   }
   return true;
  }catch(error){
   this.failed=true;this.release();console.warn('Breakthrough artwork unavailable; retaining fallback.',error);return false;
  }
 }
 clearBindings(){
  if(this.actor&&isValid(this.actor,true)){this.actor.getComponent(Sprite)!.spriteFrame=null;this.actor.removeFromParent();this.actor.destroy();}
  this.actor=null;this.key='';
 }
 private release(){
  this.clearBindings();this.painter=null;this.frame?.destroy();this.frame=null;
  this.texture?.destroy();this.texture=null;this.image?.destroy();this.image=null;this.canvas=null;
  for(const image of Object.values(this.images))image.decRef();this.images={};
 }
 destroy(){this.dead=true;this.release();}
}
