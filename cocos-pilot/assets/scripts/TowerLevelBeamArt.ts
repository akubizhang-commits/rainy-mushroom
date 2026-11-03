import {Node,UITransform,Sprite,SpriteFrame,Texture2D,ImageAsset,Color,isValid} from 'cc';
import {drawLevelBeam} from './shared/js/xianxia/TowerLevelBeamPainter';

/** Procedural small-level beam; no external artwork or resource loading. */
export class TowerLevelBeamArt {
 private dead=false;private failed=false;
 private texture:Texture2D|null=null;private frame:SpriteFrame|null=null;private actor:Node|null=null;
 private canvas:any=null;private canvasImage:ImageAsset|null=null;private flowKey='';
 uploads=0;
 preload(){
  if(this.dead||this.failed||this.frame)return;
  try{
   const scope=globalThis as any,wx=scope.wx;
   this.canvas=wx?.createOffscreenCanvas?wx.createOffscreenCanvas({type:'2d',width:384,height:768})
    :wx?.createCanvas?wx.createCanvas():scope.document?.createElement('canvas');
   if(!this.canvas)throw Error('2D canvas unavailable');
   this.canvas.width=384;this.canvas.height=768;
   drawLevelBeam(this.canvas,0,true);
   this.canvasImage=new ImageAsset(this.canvas);this.texture=new Texture2D();this.texture.image=this.canvasImage;
   this.texture.setFilters(Texture2D.Filter.LINEAR,Texture2D.Filter.LINEAR);
   this.frame=new SpriteFrame();this.frame.texture=this.texture;this.frame.packable=false;
  }catch(error){this.failed=true;console.warn('Level beam unavailable; retaining level-up particles.',error);}
 }
 draw(parent:Node,effect:{started:number;duration:number}|undefined,time:number,x:number,y:number,height:number,reduced:boolean){
  if(this.dead)return;
  this.preload();
  const age=effect?time-effect.started:-1;
  if(!effect||age<0||age>=effect.duration){if(this.actor&&isValid(this.actor,true))this.actor.active=false;return;}
  if(!this.frame||this.failed)return;
  if(!this.actor||!isValid(this.actor,true)||this.actor.parent!==parent){
   this.clear();this.actor=new Node('小境界晋升光柱');this.actor.layer=parent.layer;parent.addChild(this.actor);
   this.actor.addComponent(UITransform);
   const sprite=this.actor.addComponent(Sprite);sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.trim=false;sprite.spriteFrame=this.frame;
  }
  this.actor.active=true;this.animate(age,reduced);
  const smooth=(v:number)=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v);};
  const fade=1-smooth((age-.58)/Math.max(.01,effect.duration-.58));
  const beamHeight=Math.max(720,height*1.8);
  this.actor.getComponent(UITransform)!.setContentSize(440,beamHeight);
  this.actor.setPosition(x,y+beamHeight*(.93-.5));
  this.actor.getComponent(Sprite)!.color=new Color(255,255,255,Math.round(255*(reduced?.38:.95)*fade*smooth(age/.08)));
 }
 private animate(age:number,reduced:boolean){
  const t=reduced?0:Math.floor(age*30)/30,key=`${t}:${reduced}`;
  if(key===this.flowKey)return;
  drawLevelBeam(this.canvas,t,reduced);
  this.texture!.uploadData(this.canvas);this.uploads++;this.flowKey=key;
 }
 clear(){
  if(this.actor&&isValid(this.actor,true)){this.actor.getComponent(Sprite)!.spriteFrame=null;this.actor.removeFromParent();this.actor.destroy();}
  this.actor=null;
 }
 destroy(){this.dead=true;this.clear();this.frame?.destroy();this.texture?.destroy();this.canvasImage?.destroy();this.frame=null;this.texture=null;this.canvasImage=null;this.canvas=null;}
}
