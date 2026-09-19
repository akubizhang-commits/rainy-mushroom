import {Node,Label,Color,UITransform,Graphics,Button,ScrollView,Mask,Layout,Sprite,isValid,Vec2} from 'cc';
import {PhotoLibrary} from './PhotoLibrary';
export const UI={ink:new Color('#243D33'),muted:new Color('#546B5C'),paper:new Color('#FAF7EE'),green:new Color('#345D48'),sage:new Color('#E5ECDD'),border:new Color('#CBD5C5'),amber:new Color('#A77037')};
export class PilotUI{
 root:Node;content:Node|null=null;scroll:ScrollView|null=null;private releases=new Set<()=>void>();
 constructor(parent:Node,public width:number,public height:number,public top=26,public bottom=20){this.root=this.node('Interface',parent,width,height)}
 node(name:string,parent:Node,w=335,h=44){const n=new Node(name);n.layer=parent.layer;parent.addChild(n);n.addComponent(UITransform).setContentSize(w,h);return n}
 text(text:string,parent=this.root,w=this.width-48,h=44,size=16,color=UI.ink){const n=this.node(text.slice(0,30),parent,w,h),l=n.addComponent(Label);l.string=text;l.fontSize=size;l.lineHeight=size*1.55;l.color=color;l.enableWrapText=true;l.overflow=Label.Overflow.CLAMP;l.verticalAlign=Label.VerticalAlign.CENTER;return n}
 box(n:Node,color=UI.paper,r=16){const s=n.getComponent(UITransform)!.contentSize,g=n.addComponent(Graphics);g.fillColor=color;g.roundRect(-s.width/2,-s.height/2,s.width,s.height,r);g.fill();return g}
 button(text:string,fn:()=>void,parent=this.root,w=this.width-48,h=52,tone='green'){
  const n=this.node(text,parent,w,Math.max(52,h));h=Math.max(52,h);this.box(n,tone==='green'?UI.green:tone==='selected'?UI.sage:UI.paper,13);
  if(tone==='paper'){const outline=n.getComponent(Graphics)!;outline.strokeColor=UI.border;outline.lineWidth=1.2;outline.roundRect(-w/2+.6,-h/2+.6,w-1.2,h-1.2,13);outline.stroke()}
  const label=this.text(text,n,w-18,h,16,tone==='green'?UI.paper:UI.ink);label.getComponent(Label)!.horizontalAlign=Label.HorizontalAlign.CENTER;
  const b=n.addComponent(Button);b.transition=Button.Transition.SCALE;b.zoomScale=.975;n.on(Button.EventType.CLICK,fn);return n;
 }
 icon(kind:string,fn:()=>void,parent=this.root,selected=false){const n=this.button('',fn,parent,52,52,selected?'green':'paper');n.name=kind;const drawing=this.node('Icon',n,24,24);const g=drawing.addComponent(Graphics);g.strokeColor=selected?UI.paper:UI.green;g.lineWidth=2.3;
  if(kind==='pause'){g.moveTo(-5,-8);g.lineTo(-5,8);g.moveTo(5,-8);g.lineTo(5,8)}
  else if(kind==='back'){g.moveTo(5,9);g.lineTo(-5,0);g.lineTo(5,-9)}
  else{g.rect(-8,-9,16,18);g.moveTo(-4,4);g.lineTo(4,4);g.moveTo(-4,0);g.lineTo(4,0)}g.stroke();return n;
 }
 header(title:string,back?:()=>void){const n=this.text(title,this.root,this.width-150,48,20);n.setPosition(0,this.height/2-this.top-28);n.getComponent(Label)!.horizontalAlign=Label.HorizontalAlign.CENTER;if(back)this.icon('back',back).setPosition(-this.width/2+40,this.height/2-this.top-28)}
 page(title:string,back?:()=>void){
  const bg=this.node('Paper',this.root,this.width,this.height);this.box(bg,UI.sage,0);bg.setSiblingIndex(0);this.header(title,back);
  const upper=this.height/2-this.top-62,lower=-this.height/2+this.bottom,h=upper-lower,n=this.node('Scroll',this.root,this.width,h);n.setPosition(0,(upper+lower)/2);
  const scroll=n.addComponent(ScrollView);scroll.horizontal=false;scroll.vertical=true;scroll.inertia=true;scroll.brake=.9;scroll.elastic=false;scroll.cancelInnerEvents=true;this.scroll=scroll;
  const viewport=this.node('Viewport',n,this.width,h);viewport.addComponent(Mask);
  const content=this.node('Content',viewport,this.width-32,h);content.getComponent(UITransform)!.setAnchorPoint(.5,1);content.setPosition(0,h/2);scroll.content=content;this.stack(content,14,10);this.content=content;return content;
 }
 stack(n:Node,spacing=10,padding=0){const l=n.addComponent(Layout);l.type=Layout.Type.VERTICAL;l.resizeMode=Layout.ResizeMode.CONTAINER;l.spacingY=spacing;l.paddingTop=padding;l.paddingBottom=padding;return l}
 paragraph(text:string,parent=this.content!,size=16,color=UI.ink){const width=parent.getComponent(UITransform)!.width-24,n=this.text(text,parent,width,10,size,color),l=n.getComponent(Label)!;l.horizontalAlign=Label.HorizontalAlign.LEFT;l.overflow=Label.Overflow.RESIZE_HEIGHT;l.updateRenderData(true);return n}
 card(parent=this.content!,width=this.width-32){const n=this.node('Card',parent,width,1);this.stack(n,10,16);return n}
 decorateCard(n:Node,color=UI.paper){n.getComponent(Layout)!.updateLayout();this.box(n,color,18)}
 row(buttons:Array<{label:string,action:()=>void,selected?:boolean}>,parent=this.content!){const width=parent.getComponent(UITransform)!.width,n=this.node('Options',parent,width,52),w=(width-(buttons.length-1)*8)/buttons.length;buttons.forEach((b,i)=>this.button(b.label,b.action,n,w,52,b.selected?'green':'paper').setPosition(-width/2+w/2+i*(w+8),0));return n}
 photo(id:string,index=0,parent=this.content!,height=154,preview=false,options:{width?:number,fit?:'contain'|'cover'}={}){
  const width=options.width??parent.getComponent(UITransform)!.width-24,n=this.node(preview?'生境预览':'实拍照片',parent,width,height);this.box(n,UI.sage,12);
  const placeholder=this.text('照片加载中',n,width-16,height,13,UI.muted);placeholder.getComponent(Label)!.horizontalAlign=Label.HorizontalAlign.CENTER;
  let pending=false,failed=false;const load=()=>{if(pending||!isValid(n,true))return;pending=true;failed=false;placeholder.getComponent(Label)!.string='照片加载中';
  PhotoLibrary.acquire(id,index,preview).then(asset=>{
   if(!isValid(n,true)){asset.release();return}const release=()=>{asset.release();this.releases.delete(release)};this.releases.add(release);n.once(Node.EventType.NODE_DESTROYED,release);placeholder.destroy();const frame=options.fit==='cover'?this.node('Thumbnail crop',n,width,height):n;if(frame!==n)frame.addComponent(Mask);const pic=this.node('Photo',frame,width,height),sprite=pic.addComponent(Sprite);sprite.spriteFrame=asset.frame;sprite.sizeMode=Sprite.SizeMode.CUSTOM;
   const rect=asset.frame.originalSize,fit=(options.fit==='cover'?Math.max:Math.min)(width/rect.width,height/rect.height);pic.getComponent(UITransform)!.setContentSize(rect.width*fit,rect.height*fit);
  },()=>{failed=true;if(isValid(placeholder,true))placeholder.getComponent(Label)!.string='照片未加载，点击重试'}).finally(()=>{pending=false})};n.on(Node.EventType.TOUCH_END,(event:any)=>{if(failed){event.propagationStopped=true;load()}});load();return n;
 }
 scrollY(){return this.scroll?.getScrollOffset().y||0}
 restoreScroll(y:number){this.content?.getComponent(Layout)?.updateLayout();this.scroll?.scrollToOffset(new Vec2(0,Math.min(Math.max(0,y),Math.max(0,this.scroll.getMaxScrollOffset().y))),0)}
 destroy(){this.root.destroy();for(const release of this.releases)release();this.releases.clear()}
}
