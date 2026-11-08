import {BlockInputEvents,Button,Color,Graphics,ImageAsset,Label,LabelOutline,Node,Sprite,SpriteFrame,Texture2D,UITransform,view} from 'cc';
import {LoadingState,TowerAssetQueue} from './TowerAssetQueue';
import {towerResources as resources} from './TowerResources';

// Loading carousel. Missing files are skipped, so a slide can be removed by deleting
// its image. `bottom` keeps the keyart heroine's feet; `center` keeps a map whole.
// `light` text with a dark outline stays readable over the mid-tone world sea.
const SLIDES:{path:string;anchor:'bottom'|'center';light?:boolean}[]=[
 {path:'loading/keyart',anchor:'bottom'},
 {path:'loading/world-cangxuan',anchor:'center',light:true},
];
const SLIDE_SECONDS=6;
type Slide={anchor:'bottom'|'center';light:boolean;image:ImageAsset;texture:Texture2D;frame:SpriteFrame};
/** A native fallback remains usable if the loading illustration itself fails. */
export class TowerLoadingScreen {
 readonly root:Node;
 private background:Graphics;
 private artwork:Sprite;
 private slides:(Slide|undefined)[]=[];
 private slideIndex=0;
 private slideTime=0;
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
  this.advanceSlide();
 }
 constructor(parent:Node,private queue:TowerAssetQueue){
  this.root=this.node('游戏加载界面',parent,1280,720);
  this.root.addComponent(BlockInputEvents);
  this.background=this.root.addComponent(Graphics);
  this.artwork=this.node('加载主视觉',this.root,1920,1080).addComponent(Sprite);
  this.artwork.sizeMode=Sprite.SizeMode.CUSTOM;this.artwork.trim=false;
  this.title=this.label('霁 云 宗',this.root,0,-56,58,'#EFE7D2');
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
  SLIDES.forEach((slide,index)=>{
   if(index>0&&!resources.getInfoWithPath(slide.path,ImageAsset))return;
   resources.load(slide.path,ImageAsset,(error,image)=>{
    if(this.dead||error||!image)return;
    image.addRef();
    const texture=new Texture2D();texture.image=image;
    texture.setFilters(Texture2D.Filter.LINEAR,Texture2D.Filter.LINEAR);
    const frame=new SpriteFrame();frame.texture=texture;
    this.slides[index]={anchor:slide.anchor,light:!!slide.light,image,texture,frame};
    if(!this.frame||index===this.slideIndex)this.showSlide(index);
   });
  });
 }
 private showSlide(index:number){
  const slide=this.slides[index];if(!slide)return;
  this.slideIndex=index;this.slideTime=0;this.frame=slide.frame;
  this.artwork.spriteFrame=slide.frame;
  const light=slide.light;
  this.title.color=new Color(light?'#F4EEDC':'#203E38');this.tagline.color=new Color(light?'#E6E9DD':'#304D44');
  this.caption.color=new Color(light?'#E6E9DD':'#A5B8A8');
  for(const label of [this.title,this.tagline,this.caption]){
   const outline=label.getComponent(LabelOutline)||label.addComponent(LabelOutline);
   outline.color=new Color(22,46,40,200);outline.width=light?2:0;outline.enabled=light;
  }
  this.placeArtwork();
 }
 /** Next loaded slide; with one image the current frame simply stays. */
 private advanceSlide(){
  if(!this.slides?.length)return;
  for(let step=1;step<=SLIDES.length;step++){
   const index=(this.slideIndex+step)%SLIDES.length;
   if(this.slides[index]){if(index!==this.slideIndex)this.showSlide(index);else this.slideTime=0;return;}
  }
 }
 private placeArtwork(){
  const {width,height}=view.getVisibleSize();
  const scale=Math.max(width/1920,height/1080),w=1920*scale,h=1080*scale;
  this.artwork.node.getComponent(UITransform)!.setContentSize(w,h);
  this.artwork.node.setPosition(0,this.slides[this.slideIndex]?.anchor==='center'?0:(h-height)/2);
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
  this.placeArtwork();
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
 update(dt:number){
  if(!this.blocked)return;
  this.resize();
  if((this.slideTime+=dt)>=SLIDE_SECONDS)this.advanceSlide();
  // Give renderers two preparation frames after the last callback, so atlas
  // bindings and draw-time sprites are ready before uncovering the scene.
  if(!this.state.pending&&!this.state.failed&&++this.quietFrames>=2){
   this.root.active=false;this.queue.endBlocking();
  }
 }
 destroy(){this.dead=true;this.queue.onChange=null;this.root.destroy();
  for(const slide of this.slides)if(slide){slide.frame.destroy();slide.texture.destroy();slide.image.decRef();}
 }
}
