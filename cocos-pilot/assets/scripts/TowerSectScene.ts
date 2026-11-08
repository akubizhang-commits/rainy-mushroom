import {towerResources as resources} from './TowerResources';
import { Button, Color, ImageAsset, isValid, Label, LabelOutline, LabelShadow, Node, Sprite, SpriteFrame, Texture2D, UITransform, Vec2 } from 'cc';

// Coordinates refer to the approved 2560 × 1440 painting, including its whitespace.
export const SECT_PLACES = [
 // body: left, top, width, height in the painting; independent of label clamping.
 {name:'霁云主峰',sub:'宗门大殿 · 藏经阁',x:.50,y:.29,target:'home',body:[.44,.055,.13,.18]},
 {name:'凌霄剑峰',sub:'',x:.28,y:.35,target:'swordPeak',body:[.215,.105,.11,.205]},
 {name:'炼器峰',sub:'',x:.10,y:.56,target:'forge',body:[.02,.37,.16,.15]},
 {name:'丹霞峰',sub:'',x:.31,y:.64,target:'pills',body:[.23,.40,.14,.18]},
 {name:'万法峰',sub:'未开放 · 法修传承',x:.74,y:.29,target:'',body:[.67,.12,.12,.115]},
 {name:'云篆符峰',sub:'未开放 · 符修传承',x:.81,y:.48,target:'',body:[.765,.26,.11,.155]},
 {name:'御兽峰',sub:'未开放 · 御兽传承',x:.91,y:.69,target:'',body:[.815,.455,.18,.155]},
 {name:'锁妖塔',sub:'',x:.65,y:.69,target:'tower',body:[.615,.405,.078,.245]},
 {name:'山门',sub:'未开放 · 宗门周边',x:.50,y:.93,target:'',body:[.365,.555,.25,.33]},
];

export class TowerSectScene {
 private dead=false;
 private requested=false;
 private image:ImageAsset|null=null;
 private texture:Texture2D|null=null;
 private frame:SpriteFrame|null=null;
 private binding:Sprite|null=null;
 private status:Label|null=null;
 private failed=false;

 attach(parent:Node,width:number,height:number,go:(page:string)=>void) {
  this.clearBindings();
  const root=this.node('霁云宗群峰场景',parent,width,height);
  root.setSiblingIndex(0);
  // Cover the landscape viewport; preserve aspect ratio and crop only excess edges.
  const scale=Math.max(width/2560,height/1440),w=2560*scale,h=1440*scale;
  root.setPosition(0,0);
  const bg=this.node('霁云宗已确认母稿',root,w,h);
  const sprite=bg.addComponent(Sprite);sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.trim=false;
  this.binding=sprite;if(this.frame)sprite.spriteFrame=this.frame;
  this.status=this.text(root,this.failed?'场景暂未加载，仍可点击名称进入':'场景载入中',0,0,24,false);
  this.status.node.active=!this.frame;
  this.load();
  const activate=(place:typeof SECT_PLACES[number])=>{
   if(place.target)go(place.target);
   else if(this.status&&isValid(this.status,true)){
    this.status.string=place.sub.replace('未开放 · ','')+'将在后续开放';this.status.node.active=true;
   }
  };
  // Keep all building hit regions below the labels. Match the painting's cover
  // transform exactly, so cropping never shifts a building's interactive area.
  for(const place of SECT_PLACES){
   const [left,top,bw,bh]=place.body;
   const body=this.node(`宗门建筑-${place.name}`,root,bw*w,bh*h);
   body.setPosition((left+bw/2-.5)*w,(.5-top-bh/2)*h);
   body.addComponent(Button).transition=Button.Transition.NONE;
   body.on(Button.EventType.CLICK,()=>{
    if(!this.dead&&isValid(body,true))activate(place);
   });
  }
  for(const place of SECT_PLACES){
   const x=Math.max(-width/2+110,Math.min(width/2-110,(place.x-.5)*w));
   const y=Math.max(-height/2+42,Math.min(height/2-140,(.5-place.y)*h));
   const hit=this.node(`宗门入口-${place.name}`,root,Math.max(128,w*.14),Math.max(74,h*.13));
   hit.setPosition(x,y+20);
   // Preserve the existing name entrance, including its viewport-safe position.
   this.text(hit,place.name,0,-20,place.target?30:26,!place.target);
   if(place.sub)this.text(hit,place.sub,0,-48,20,!place.target);
   const button=hit.addComponent(Button);button.transition=Button.Transition.SCALE;button.zoomScale=.97;
   hit.on(Button.EventType.CLICK,()=>{
    if(this.dead||!isValid(hit,true))return;
    activate(place);
   });
  }
 }
 clearBindings(){this.binding=null;this.status=null;}
 destroy(){this.dead=true;this.clearBindings();this.frame?.destroy();this.texture?.destroy();this.image?.decRef();this.frame=null;this.texture=null;this.image=null;}
 private node(name:string,parent:Node,w:number,h:number){const n=new Node(name);n.layer=parent.layer;parent.addChild(n);n.addComponent(UITransform).setContentSize(w,h);return n;}
 private text(parent:Node,text:string,x:number,y:number,size:number,muted:boolean){
  const n=this.node(text,parent,Math.max(200,text.length*size+12),size+12);n.setPosition(x,y);
  const l=n.addComponent(Label);l.string=text;l.fontSize=size;l.lineHeight=size+8;l.fontFamily='serif';
  l.horizontalAlign=Label.HorizontalAlign.CENTER;l.verticalAlign=Label.VerticalAlign.CENTER;l.enableWrapText=false;
  l.color=new Color(muted?'#DDE4DA':'#FFF9E8');
  const outline=n.addComponent(LabelOutline);outline.color=new Color('#203A32');outline.width=2.2;
  const shadow=n.addComponent(LabelShadow);shadow.color=new Color(25,44,39,185);shadow.offset=new Vec2(0,-2);shadow.blur=3;
  return l;
 }
 private load(){
  if(this.requested||this.dead)return;this.requested=true;
  resources.load('sect-scene/luoyun',ImageAsset,(error,image)=>{
   if(this.dead)return;
   if(error||!image){this.failed=true;if(this.status&&isValid(this.status,true))this.status.string='场景暂未加载，仍可点击名称进入';return;}
   image.addRef();this.image=image;this.texture=new Texture2D();this.texture.image=image;
   this.texture.setFilters(Texture2D.Filter.LINEAR,Texture2D.Filter.LINEAR);
   this.frame=new SpriteFrame();this.frame.texture=this.texture;
   if(this.binding&&isValid(this.binding,true))this.binding.spriteFrame=this.frame;
   if(this.status&&isValid(this.status,true))this.status.node.active=false;
  });
 }
}
