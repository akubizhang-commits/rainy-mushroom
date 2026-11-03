import {BlockInputEvents,Button,Color,Graphics,ImageAsset,Label,Node,Sprite,SpriteFrame,Texture2D,UITransform,view} from 'cc';
import {LoadingState,TowerAssetQueue} from './TowerAssetQueue';
import {towerResources as resources} from './TowerResources';

/** A native fallback remains usable if the loading illustration itself fails. */
export class TowerLoadingScreen {
 readonly root:Node;
 private background:Graphics;
 private artwork:Sprite;
 private image:ImageAsset|null=null;
 private texture:Texture2D|null=null;
 private frame:SpriteFrame|null=null;
 private dead=false;
 private title:Label;
 private tagline:Label;
 private caption:Label;
 private progress:Graphics;
 private progressWidth=280;
 private retry:Node;
 private quietFrames=0;
 private size='';
 private state:LoadingState={pending:0,failed:0,completed:0,total:0};
 get blocked(){return this.root.active;}
 get presentationReady(){return !!this.frame||this.state.failed>0;}
 beginTransition(){
  if(this.dead)return;
  this.queue.beginBlocking();
  this.quietFrames=0;this.root.active=true;
  this.root.setSiblingIndex(this.root.parent!.children.length-1);
 }
 constructor(parent:Node,private queue:TowerAssetQueue){
  this.root=this.node('游戏加载界面',parent,1280,720);
  this.root.addComponent(BlockInputEvents);
  this.background=this.root.addComponent(Graphics);
  this.artwork=this.node('加载主视觉',this.root,1920,1080).addComponent(Sprite);
  this.artwork.sizeMode=Sprite.SizeMode.CUSTOM;this.artwork.trim=false;
  this.title=this.label('栖 云 宗',this.root,0,-56,58,'#EFE7D2');
  this.title.horizontalAlign=Label.HorizontalAlign.LEFT;
  this.title.overflow=Label.Overflow.CLAMP;
  this.tagline=this.label('修习剑诀 · 独闯九层锁妖塔',this.root,0,0,22,'#C2D0C4');
  this.tagline.horizontalAlign=Label.HorizontalAlign.LEFT;
  this.tagline.overflow=Label.Overflow.CLAMP;
  this.caption=this.label('正在准备山门…',this.root,0,-105,20,'#A5B8A8');
  this.progress=this.node('加载进度',this.root,280,3).addComponent(Graphics);
  this.progress.node.setPosition(0,-141);
  this.retry=this.node('重新加载',this.root,180,48);this.retry.setPosition(0,-202);
  const button=this.retry.addComponent(Graphics);button.fillColor=new Color('#32594D');
  button.roundRect(-90,-24,180,48,8);button.fill();
  this.label('重新加载',this.retry,0,0,22,'#EFE7D2');
  this.retry.addComponent(Button);
  this.retry.on(Button.EventType.CLICK,()=>queue.retryFailed());
  this.retry.active=false;
  queue.onChange=state=>this.changed(state);
  this.resize();this.changed(queue.state);
  resources.load('loading/keyart',ImageAsset,(error,image)=>{
   if(this.dead||error||!image)return;
   image.addRef();this.image=image;
   this.texture=new Texture2D();this.texture.image=image;
   this.texture.setFilters(Texture2D.Filter.LINEAR,Texture2D.Filter.LINEAR);
   this.frame=new SpriteFrame();this.frame.texture=this.texture;this.artwork.spriteFrame=this.frame;
   this.title.color=new Color('#203E38');this.tagline.color=new Color('#304D44');
  });
 }
 private node(name:string,parent:Node,w:number,h:number){
  const n=new Node(name);n.layer=parent.layer;parent.addChild(n);
  n.addComponent(UITransform).setContentSize(w,h);return n;
 }
 private label(text:string,parent:Node,x:number,y:number,size:number,color:string){
  const n=this.node(text,parent,760,50);n.setPosition(x,y);
  const label=n.addComponent(Label);label.string=text;label.fontSize=size;label.lineHeight=size+6;
  label.fontFamily='serif';label.color=new Color(color);label.horizontalAlign=Label.HorizontalAlign.CENTER;
  label.verticalAlign=Label.VerticalAlign.CENTER;return label;
 }
 private changed(state:LoadingState){
  this.state=state;
  if(state.pending||state.failed){
   this.quietFrames=0;this.root.active=true;this.root.setSiblingIndex(this.root.parent!.children.length-1);
  }
  this.retry.active=state.failed>0;
  this.caption.string=state.failed?'画面未能载入，请检查网络后重试':
   state.pending?`正在准备画面 · ${state.completed} / ${state.total}`:'山门已就绪';
  this.drawProgress();
 }
 private drawProgress(){
  const state=this.state,width=this.progressWidth;
  this.progress.clear();this.progress.fillColor=new Color('#325247');
  this.progress.rect(-width/2,-1,width,2);this.progress.fill();
  if(state.total){
   this.progress.fillColor=new Color('#D8C28D');
   this.progress.rect(-width/2,-1,width*state.completed/state.total,2);this.progress.fill();
  }
 }
 private resize(){
  const {width,height}=view.getVisibleSize(),key=`${width}:${height}`;
  if(key===this.size)return;this.size=key;
  this.root.getComponent(UITransform)!.setContentSize(width,height);
  this.background.clear();this.background.fillColor=new Color('#162E28');
  this.background.rect(-width/2,-height/2,width,height);this.background.fill();
  const scale=Math.max(width/1920,height/1080),w=1920*scale,h=1080*scale;
  this.artwork.node.getComponent(UITransform)!.setContentSize(w,h);
  this.artwork.node.setPosition(0,(h-height)/2);
  // Bottom-aligned cover retains the heroine's feet and all flying swords.
  this.title.node.getComponent(UITransform)!.setContentSize(width*.40,84);
  this.tagline.node.getComponent(UITransform)!.setContentSize(width*.44,42);
  this.title.node.setPosition(-width*.22,height*.35);
  this.tagline.node.setPosition(-width*.20,height*.26);
  this.caption.node.getComponent(UITransform)!.setContentSize(490,44);
  this.caption.node.setPosition(0,-height/2+92);
  this.progressWidth=width*.9;
  this.progress.node.getComponent(UITransform)!.setContentSize(this.progressWidth,3);
  this.progress.node.setPosition(0,-height/2+62);
  this.retry.setPosition(0,-height/2+146);
  this.drawProgress();
 }
 update(_dt:number){
  if(!this.blocked)return;
  this.resize();
  // Give renderers two preparation frames after the last callback, so atlas
  // bindings and draw-time sprites are ready before uncovering the scene.
  if(!this.state.pending&&!this.state.failed&&++this.quietFrames>=2){
   this.root.active=false;this.queue.endBlocking();
  }
 }
 destroy(){this.dead=true;this.queue.onChange=null;this.root.destroy();this.frame?.destroy();this.texture?.destroy();this.image?.decRef();}
}
