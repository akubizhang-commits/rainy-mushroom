import {BlockInputEvents,Button,Color,Graphics,isValid,Label,Node,UITransform} from 'cc';
import {TowerCharacterArt} from './TowerCharacterArt';
import {TowerStoneArt} from './TowerStoneArt';
import {TowerBreakthroughArt} from './TowerBreakthroughArt';
import {presentationPreferences} from './TowerPreferences';
import {ceremonyFrame} from './shared/js/xianxia/TowerBreakthroughPresentation';
const ink='#F2E9CC',muted='#B8CCC0',gold='#E5C889',jade='#426F60';
export type BreakthroughModel={status:string;target:string;realm:string;options:any[];selected:string;message:string;detail:string;contribution:number;elapsed:number;success:boolean;actionText:string;canAttempt:boolean};
type Handlers={select:(id:string)=>void;attempt:()=>void;resume:()=>void;skills:()=>void};
/** A presentation-only stage; transactions and elapsed time belong to TowerView. */
export class TowerBreakthroughScene {
 root:Node|null=null;
 private art=new TowerCharacterArt();private icons=new TowerStoneArt();private hero:Node|null=null;
 private seated=new TowerBreakthroughArt();private jindan=new TowerBreakthroughArt('jindan');private stage:Node|null=null;
 private fx:Graphics|null=null;private shade:Graphics|null=null;private heading:Label|null=null;private cue:Label|null=null;
 private model:BreakthroughModel|null=null;private state:any;private w=0;private h=0;private clock=0;
 private node(name:string,parent:Node,w=0,h=0){const n=new Node(name);n.layer=parent.layer;parent.addChild(n);n.addComponent(UITransform).setContentSize(w,h);return n;}
 private label(name:string,text:string,parent:Node,x:number,y:number,w:number,h:number,size:number,color=ink){const n=this.node(name,parent,w,h);n.setPosition(x,y);const l=n.addComponent(Label);l.string=text;l.fontSize=size;l.lineHeight=size+8;l.color=new Color(color);l.horizontalAlign=Label.HorizontalAlign.CENTER;l.verticalAlign=Label.VerticalAlign.CENTER;l.overflow=Label.Overflow.CLAMP;l.enableWrapText=true;return l;}
 private button(name:string,text:string,parent:Node,x:number,y:number,w:number,run:()=>void,enabled=true,primary=false){
  const n=this.node(name,parent,w,72);n.setPosition(x,y);const g=n.addComponent(Graphics);
  g.fillColor=new Color(primary&&enabled?jade:'#233D35');g.strokeColor=new Color(enabled?gold:'#536459');g.lineWidth=1.5;
  g.roundRect(-w/2,-36,w,72,12);g.fill();g.stroke();this.label(name+'文字',text,n,0,0,w-18,68,24,enabled?ink:'#819587');
  const b=n.addComponent(Button);b.interactable=enabled;b.transition=Button.Transition.SCALE;b.zoomScale=.97;
  n.on(Button.EventType.CLICK,()=>{if(enabled&&this.root&&isValid(n,true))run();});return n;
 }
 render(parent:Node,width:number,height:number,model:BreakthroughModel,state:any,handlers:Handlers){
  this.close();this.w=width;this.h=height;this.model=model;this.state=state;
  const root=this.root=this.node('突破仪式',parent,width,height);root.addComponent(BlockInputEvents);
  this.shade=root.addComponent(Graphics);
  this.fx=this.node('突破灵气',root,width,height).addComponent(Graphics);
  this.hero=this.node('突破角色',root,220,260);
  this.stage=this.node('筑基舞台',root,width,height);
  if(model.target==='筑基'||model.status==='success'&&model.realm==='筑基')this.seated.preload();
  if(model.target==='金丹'||model.status==='success'&&model.realm==='金丹')this.jindan.preload();
  this.heading=this.label('突破境界',model.status==='success'?`${model.realm}已成`:model.status==='failure'?'破境未成':`冲击${model.target}`,root,0,height/2-54,width-180,68,42,gold);
  this.heading.isBold=true;
  this.cue=this.label('突破阶段',model.status==='success'?(model.realm==='金丹'?'金丹凝成 · 新境已开':'道基已成 · 新境已开'):model.status==='failure'?'修为保留，稍作调息可再尝试':'灵气已满 · 静候破境',root,0,height/2-105,width-160,42,23,muted);
  const bottom=-height/2;
  if(model.status==='ceremony'){
   this.heading.string='凝神破境';this.cue.string='引灵入体';
  }else if(model.status==='success'){
   this.label('突破成长',model.detail,root,0,bottom+147,Math.min(750,width-120),76,24);
   const w=Math.min(250,(width-130)/2);
   this.button('突破修习功法','修习功法',root,-w/2-10,bottom+56,w,handlers.skills);
   this.button('突破继续战斗','继续战斗',root,w/2+10,bottom+56,w,handlers.resume,true,true);
  }else{
   const count=model.options.length,pitch=96;
   model.options.forEach((item,i)=>{
    const n=this.node('突破材料-'+item.id,root,78,78);n.setPosition((i-(count-1)/2)*pitch,bottom+207);
    const selected=item.id===model.selected,g=n.addComponent(Graphics);
    g.fillColor=new Color(selected?'#526E55':'#283F36');g.strokeColor=new Color(selected?gold:'#758C75');g.lineWidth=selected?2.5:1;
    g.roundRect(-39,-39,78,78,8);g.fill();g.stroke();
    const fallback=this.label('突破材料占位',item.name,n,0,0,70,60,18);
    this.icons.drawResource(n,'ritual-'+item.id,('pill_'+item.id) as any,0,0,70,()=>{if(isValid(fallback.node,true))fallback.node.active=false;});
    this.label('突破材料数量',item.purchase?'购':String(item.count),n,23,-24,28,26,19,gold);
    const b=n.addComponent(Button);b.transition=Button.Transition.SCALE;b.zoomScale=.97;n.on(Button.EventType.CLICK,()=>handlers.select(item.id));
   });
   this.label('突破材料说明',model.detail,root,0,bottom+142,width-110,46,23);
   this.label('突破提示',model.message||'失败保留满修为 · 稍后仍可突破',root,0,bottom+101,width-110,32,20,model.message?'#F0BC9C':muted);
   const w=Math.min(320,(width-130)/2);
   this.button('突破稍后','稍后，继续挑战',root,-w/2-10,bottom+48,w,handlers.resume);
   this.button('突破确认',model.actionText,root,w/2+10,bottom+48,w,handlers.attempt,model.canAttempt,true);
  }
  this.draw(model.elapsed);
 }
 update(dt:number,elapsed?:number){this.clock+=Math.max(0,Math.min(.1,dt));if(this.root)this.draw(elapsed??this.model?.elapsed??0);}
 private draw(elapsed:number){
  if(!this.root||!this.hero||!this.fx||!this.shade||!this.model)return;
  const m=this.model,reduced=presentationPreferences().reducedMotion,ritual=m.status==='ceremony';
  const zhuji=m.target==='筑基'||m.status==='success'&&m.realm==='筑基';
  const jindan=m.target==='金丹'||m.status==='success'&&m.realm==='金丹';
  const artwork=jindan?this.jindan:this.seated;
  if((zhuji||jindan)&&this.stage&&artwork.draw(this.stage,this.w,this.h,m.status,elapsed,m.success,reduced)){
   this.hero.active=false;this.fx.clear();this.shade.clear();
   this.shade.fillColor=new Color(9,18,31,245);this.shade.rect(-this.w/2,-this.h/2,this.w,this.h);this.shade.fill();
   if(ritual){
    this.heading!.string=elapsed<2?'凝神破境':m.success?(jindan?'凝气成丹':'道基凝成'):'破境未成';
    this.cue!.string=elapsed<1.65?'引灵入体':elapsed<2?'凝气归元':m.success?(jindan?(elapsed<2.72?'灵光渐聚':elapsed<3.35?'收凝成丹':'丹息已定'):'灵息渐定'):'灵气渐散 · 修为保留';
    // Keep typography away from the approved pillar at the upper center.
    this.heading!.node.active=elapsed<2||!m.success||elapsed>=2.8;
    this.cue!.node.active=this.heading!.node.active;
   }
   return;
  }
  this.hero.active=true;
  const frame=ceremonyFrame(elapsed,m.success,reduced),reveal=ritual&&elapsed>=2,success=m.status==='success'||reveal&&m.success;
  const scale=reduced?1.4:ritual?1.4+.12*Math.min(1,elapsed/1.65):1.4;
  this.hero.setScale(scale,scale,1);this.hero.setPosition(ritual?frame.shake:0,8);
  const s={...this.state,time:this.clock,actions:{...this.state.actions,basic:null,current:null,orbit:null},player:{...this.state.player,x:0,y:0},casts:[],phase:'paused'};
  this.art.draw(this.hero,s,0,0,false);
  const shade=this.shade;shade.clear();shade.fillColor=new Color(9,27,23,185);shade.rect(-this.w/2,-this.h/2,this.w,this.h);shade.fill();
  const g=this.fx;g.clear();
  const pulse=reduced?0:Math.sin(this.clock*1.8)*.08;
  const radius=ritual?elapsed<2?110-45*frame.gather:60+200*frame.burst:86;
  const alpha=ritual&&elapsed>=2?Math.round(190*(1-frame.burst)):145;
  g.strokeColor=new Color(success?236:156,success?207:209,success?130:186,alpha);g.lineWidth=2;
  g.ellipse(0,8,radius*(1+pulse),radius*.3);g.stroke();g.ellipse(0,8,radius*.75,radius*.225);g.stroke();
  if(ritual){
   for(let i=0;i<36;i++){
    const angle=i*2.39996+this.clock*.7,spread=elapsed<2?25+((i*.618+1-frame.gather)%1)*170:25+frame.burst*(120+i%5*20);
    const x=Math.cos(angle)*spread,y=55+Math.sin(angle)*spread*.65;
    g.fillColor=new Color(235,221,161,Math.round((elapsed<2?.65:1-frame.burst)*220));g.circle(x,y,1.5+i%3*.65);g.fill();
   }
   if(frame.flash>0){g.fillColor=new Color(244,229,169,Math.round(frame.flash*255));g.rect(-this.w/2,-this.h/2,this.w,this.h);g.fill();}
   this.heading!.string=elapsed<2?'凝神破境':m.success?`${m.realm} · 初期`:'破境未成';
   this.cue!.string=elapsed<1.65?'引灵入体':elapsed<2?'凝气归元':m.success?'灵台清明 · 境界已成':'灵气渐散 · 修为保留';
  }
 }
 close(){this.seated.clearBindings();this.jindan.clearBindings();this.art.clearBindings();this.icons.clearBindings();this.root?.destroy();this.root=null;this.hero=null;this.stage=null;this.fx=null;this.shade=null;}
 destroy(){this.close();this.seated.destroy();this.jindan.destroy();this.art.destroy();this.icons.destroy();}
}
