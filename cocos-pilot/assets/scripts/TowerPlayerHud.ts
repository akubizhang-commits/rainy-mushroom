import {TowerStatusIconArt,STATUS_ICON_SIZE} from './TowerStatusIconArt';
import {towerResources as resources} from './TowerResources';
import {Node,Graphics,Color,Label,ImageAsset,isValid,Sprite,SpriteFrame,Texture2D,Vec2,UITransform} from 'cc';
const C=(s:string)=>new Color(s);
export const SETTINGS_ICON_SIZE=35;
type HudStyle = 'battle' | 'paper';
const PORTRAIT_REALM_STYLES:Readonly<Record<string,{border:string;lightning?:string}>>={
 '炼气':{border:'#A8DCD2'},
 '筑基':{border:'#D3D7D6'},
 '金丹':{border:'#E5BB59'},
 '元婴':{border:'#A8D5F2'},
 '化神':{border:'#AC83DA'},
 '炼虚':{border:'#DEFFF5'},
 '合体':{border:'#BDC9D6'},
 '大乘':{border:'#FFF0C7'},
 '渡劫':{border:'#A16DE0',lightning:'#F2E5FF'},
};
/** Shared horizontal tracks: stable empty state and distinct thicknesses. */
function drawResourceTrack(g:Graphics,ratio:number,height:number,color:string,width=200){
 const fill=Number.isFinite(ratio)?Math.max(0,Math.min(1,ratio)):0;
 g.clear();g.fillColor=C('#A4B3A8');g.roundRect(-width/2,-height/2,width,height,height/2);g.fill();
 if(fill>0){g.fillColor=C(color);g.roundRect(-width/2,-height/2,width*fill,height,Math.min(height/2,width*fill/2));g.fill();}
}
/** surge: 凝神诀 low-mana regen active; pulse in [0,1] comes from simulation time. */
export function drawPlayerMana(g:Graphics|null,ratio:number,surge=false,pulse=0){
 if(!g)return;
 if(!surge){drawResourceTrack(g,ratio,6,'#397B9B');return;}
 const t=Math.max(0,Math.min(1,pulse)),mix=(a:number,b:number)=>Math.round(a+(b-a)*t);
 drawResourceTrack(g,ratio,6,`#${[mix(0x2E,0x6F),mix(0xB5,0xE8),mix(0xA4,0xD6)].map(n=>n.toString(16).padStart(2,'0')).join('')}`);
 g.strokeColor=C('#7FE3CF');g.lineWidth=1;g.roundRect(-101,-4,202,8,4);g.stroke();
}
export function drawPlayerHp(g:Graphics|null,ratio:number,style:HudStyle='battle',heavyPulse=0){
  if(!g)return;g.clear();
  const fill=Number.isFinite(ratio)?Math.max(0,Math.min(1,ratio)):0;
  if(style==='paper'){
   drawResourceTrack(g,fill,8,fill<=.25?'#963F32':'#A56855');
   if(heavyPulse>0){
    g.strokeColor=new Color(255,150,139,Math.round(255*Math.min(1,heavyPulse)));
    g.lineWidth=2;g.roundRect(-103,-7,206,14,6);g.stroke();
   }
   return;
  }
  const shape=(share:number)=>{
   g.moveTo(-132,20);g.lineTo(-132+264*share,20);
   g.lineTo(-116+232*share,-20);g.lineTo(-116,-20);g.close();
  };
  g.fillColor=C('#341D24');shape(1);g.fill();
  if(fill>0){g.fillColor=C('#A52E3F');shape(fill);g.fill();}
  g.strokeColor=C('#C58B79');g.lineWidth=1;shape(1);g.stroke();
 }
const paintedXp=new WeakMap<Graphics,number>();
type XpArtwork={root:Node;body:Sprite;head:Sprite;tail:Sprite;ready:boolean;share:number};
const xpArtwork=new WeakMap<Graphics,XpArtwork>();
export function drawPlayerXp(g:Graphics|null,ratio:number,capped=false){
 if(!g)return;
 if(g.node.name==='HUD.XPBar'){g.node.active=true;drawResourceTrack(g,capped?1:ratio,4,'#AF8B40',g.node.getComponent(UITransform)!.width);return;}
 const share=!capped&&Number.isFinite(ratio)?Math.max(0,Math.min(1,ratio)):0;
 g.node.active=share>0;
 const art=xpArtwork.get(g);
 if(art)art.share=share;
 if(paintedXp.get(g)===share)return;
 paintedXp.set(g,share);g.clear();
 if(art?.ready){
  art.root.active=true;
  const sweep=Math.PI*2*share,tail=Math.min(.30,sweep*.30),head=Math.min(.50,sweep*.46);
  // All textures use the same centre. Negative fill reveals clockwise; the
  // head's local counterclockwise slice is rotated to the earned endpoint.
  art.body.fillStart=.25-tail*.65/(Math.PI*2);
  art.body.fillRange=-Math.max(0,sweep-tail*.65-head*.65)/(Math.PI*2);
  art.tail.fillStart=.25;art.tail.fillRange=-Math.min(.30,sweep)/(Math.PI*2);
  art.head.fillStart=.25;art.head.fillRange=Math.min(.50,sweep)/(Math.PI*2);
  art.head.node.angle=-360*share;
  return;
 }
 if(share<=0)return;
 // The inner edge meets the portrait's 43-unit border without a gap.
 // Start at twelve o'clock and advance clockwise without an empty track.
 const sweep=Math.PI*2*share;
 const point=(angle:number,r:number)=>({x:r*Math.sin(angle),y:r*Math.cos(angle)});
 const stroke=(r:number,width:number,color:string,start=0,end=sweep)=>{
  const steps=Math.max(1,Math.ceil((end-start)*24)),p=point(start,r);
  g.strokeColor=C(color);g.lineWidth=width;g.moveTo(p.x,p.y);
  for(let i=1;i<=steps;i++){
   const p=point(start+(end-start)*i/steps,r);g.lineTo(p.x,p.y);
  }
  g.stroke();
 };
 // The body overlaps the sculpted tail and neck, but never extends past them.
 const tailLength=Math.min(.28,sweep*.30),headLength=Math.min(.42,sweep*.46);
 const bodyStart=tailLength*.65,bodyEnd=sweep-headLength*.65;
 const body=(r:number,width:number,color:string)=>stroke(r,width,color,bodyStart,bodyEnd);
 body(45.25,4.5,'#427B60');
 body(45.35,3.5,'#86B995');
 body(45.7,2.25,'#B9D8B5');
 body(46.15,.7,'#E0EACD');
 body(43.75,.6,'#649778');
 // Two offset rows of overlapping scales. Their grooves follow the curved body.
 for(let row=0;row<2;row++){
  const radius=44.3+row*1.45;
  for(let a=tailLength+.065+row*.065;a+.095<sweep-headLength;a+=.13){
   for(const [offset,width,color] of [[0,.6,'#609273'],[.24,.3,'#D8E5C7']] as const){
    g.strokeColor=C(color);g.lineWidth=width;
    for(let j=0;j<=8;j++){
     const t=j/8,p=point(a+.095*t,radius+offset+.85*Math.sin(Math.PI*t));
     if(j===0)g.moveTo(p.x,p.y);else g.lineTo(p.x,p.y);
    }
    g.stroke();
   }
  }
 }
 const size=Math.min(1,sweep/.8);
 type CarvingPoint=readonly [number,number];
 const local=(head:boolean,u:number,r:number)=>point(head?sweep-u*headLength:u*tailLength,43+r*size);
 const carving=(head:boolean,shape:readonly CarvingPoint[],color:string,inset=0)=>{
  g.fillColor=C(color);
  shape.forEach(([u,r],i)=>{
   const p=local(head,.5+(u-.5)*(1-inset),3.2+(r-3.2)*(1-inset));
   if(i===0)g.moveTo(p.x,p.y);else g.lineTo(p.x,p.y);
  });
  g.close();g.fill();
 };
 const groove=(head:boolean,shape:readonly CarvingPoint[],color:string,width:number)=>{
  g.strokeColor=C(color);g.lineWidth=width;
  shape.forEach(([u,r],i)=>{const p=local(head,u,r);if(i===0)g.moveTo(p.x,p.y);else g.lineTo(p.x,p.y);});
  g.stroke();
 };
 // The fixed origin is a pointed, swept dragon tail, with a small jade fin.
 const tail:CarvingPoint[]=[[0,2.1],[.2,2.8],[.40,4.0],[.52,6.0],[.63,4.4],[.79,4.8],[1,4.5],
  [1,0],[.72,.4],[.47,1.1],[.22,1.8]];
 carving(false,tail,'#427B60');
 carving(false,tail,'#93BF9C',.15);
 carving(false,tail,'#C5DEBC',.38);
 if(size>.3)groove(false,[[.20,2.2],[.44,2.4],[.72,2.6],[.98,2.7]],'#659777',.6);
 // The advancing end is a side-view Chinese dragon: antlers swept back,
 // long muzzle facing the direction of progress, an eye, jaw and flowing mane.
 const head:CarvingPoint[]=[[1,1.0],[.78,1.1],[.61,.5],[.43,.7],[.25,1.5],[.06,1.8],
  [0,2.4],[0,4.4],[.09,5.6],[.27,5.4],[.37,6.6],[.56,7.1],[.72,6.2],[.88,5.2],[1,4.5]];
 const horn:CarvingPoint[]=[[.47,5.7],[.55,8.0],[.81,10.7],[.75,8.4],[.94,9.2],[.83,7.2],[.67,5.6]];
 const mane:CarvingPoint[]=[[.69,5.2],[.81,7.4],[.85,6.2],[.98,7.0],[.94,5.3],[1,4.7]];
 carving(true,horn,'#477D60');carving(true,horn,'#BBD5AC',.21);
 carving(true,mane,'#52876A');carving(true,mane,'#A6CDA7',.24);
 carving(true,head,'#3D7057');carving(true,head,'#92BD97',.10);
 carving(true,head,'#C4DBB4',.30);
 if(size>.3){
  groove(true,[[.07,2.65],[.22,2.6],[.36,2.25],[.48,2.4]],'#487657',.75);
  groove(true,[[.28,5.25],[.40,5.7],[.55,5.9]],'#EDF0D5',.65);
  // Almond-shaped eye and nostril cut into the polished jade.
  carving(true,[[.30,4.65],[.38,5.1],[.47,4.85],[.39,4.3]],'#284D3C');
  carving(true,[[.055,4.0],[.095,4.3],[.14,4.1],[.105,3.8]],'#527D5C');
  groove(true,[[.40,3.9],[.56,3.4],[.63,2.5],[.75,2.1]],'#6A9A77',.65);
 }

}
export function drawHudPortrait(g:Graphics,realm='炼气',theme:HudStyle='battle'){
  const style=PORTRAIT_REALM_STYLES[realm]||PORTRAIT_REALM_STYLES['炼气'];
  g.clear();
  if(theme==='paper'){
   // Quiet double ink outline; the realm is always also written in plain text.
   g.strokeColor=C('#98AD9F');g.lineWidth=.8;g.circle(0,0,41);g.stroke();
   g.strokeColor=C('#BBCBC1');g.lineWidth=.6;g.circle(0,0,43);g.stroke();
   return;
  }
  g.fillColor=C('#183D35');g.strokeColor=C(style.border);g.lineWidth=2;
  g.circle(0,0,39);g.fill();g.stroke();
  // A simple white-haired cultivator marker, entirely inside the circular slot.
  g.fillColor=C('#799DA8');g.moveTo(-24,-26);g.lineTo(-15,-7);g.lineTo(15,-7);
  g.lineTo(24,-26);g.close();g.fill();
  g.fillColor=C('#EAD9C1');g.ellipse(0,5,13,17);g.fill();
  g.fillColor=C('#F2F4EF');g.circle(0,24,7);g.fill();
  g.moveTo(-17,-5);g.lineTo(-17,15);g.quadraticCurveTo(0,33,17,15);
  g.lineTo(17,-5);g.lineTo(9,10);g.lineTo(2,16);g.lineTo(-6,8);g.lineTo(-12,9);g.close();g.fill();
  g.strokeColor=C('#263F39');g.lineWidth=2;g.moveTo(-7,3);g.lineTo(-3,3);
  g.moveTo(3,3);g.lineTo(7,3);g.stroke();
  g.strokeColor=C('#E5E9E4');g.lineWidth=3;g.moveTo(-11,-11);g.lineTo(0,-24);g.lineTo(11,-11);g.stroke();
  if(style.lightning){
   g.strokeColor=C(style.lightning);g.lineWidth=2;
   for(const side of [-1,1]){
    g.moveTo(side*29,18);g.lineTo(side*34,7);g.lineTo(side*28,7);g.lineTo(side*33,-10);g.stroke();
   }
  }
 }

export function createPlayerHud(root:Node,node:(name:string,parent:Node,w:number,h:number)=>Node,label:(text:string,parent:Node,x:number,y:number,w:number,h:number,size:number,color:string)=>Label,style:HudStyle='battle'){
  if(style==='paper'){
   const vitals=node('HUD.PlayerVitals',root,352,124);
   // A readable native fallback is present during loading or resource failure.
   const fallback=node('HUD.PaperFallback',vitals,352,124);
   const paper=fallback.addComponent(Graphics);
   for(let inset=0;inset<12;inset++){
    paper.fillColor=new Color(220,228,222,22);
    paper.roundRect(-176+inset,-62+inset,352-2*inset,124-2*inset,16);paper.fill();
   }
   const placeholder=label('修',fallback,-118,0,80,80,32,'#718578');
   placeholder.fontFamily='serif';
   const art=node('HUD.PaperArtwork',vitals,352,124).addComponent(Sprite);
   art.sizeMode=Sprite.SizeMode.CUSTOM;art.trim=false;
   let disposed=false,image:ImageAsset|null=null,texture:Texture2D|null=null,frame:SpriteFrame|null=null;
   resources.load('player-hud/paper-portrait',ImageAsset,(error,asset)=>{
    if(disposed||!isValid(vitals,true)||error||!asset)return;
    image=asset;image.addRef();texture=new Texture2D();texture.image=image;
    texture.setFilters(Texture2D.Filter.LINEAR,Texture2D.Filter.LINEAR);
    frame=new SpriteFrame();frame.texture=texture;art.spriteFrame=frame;
    fallback.active=false;
   });
   const portrait=node('HUD.Portrait',vitals,86,86);portrait.setPosition(-118,0);
   const portraitGraphics=portrait.addComponent(Graphics);
   // The passive profession mark uses the former gap; keep 17–19 units after
   // the portrait and retain a 32-unit right inset and 152-unit number column.
   const profession=node('HUD.ProfessionIcon',vitals,32,36);profession.setPosition(-46,24);
   // Keep a legible fallback while the reused sword artwork loads.
   const professionFallback=label('剑',profession,0,0,28,32,23,'#365E53');professionFallback.fontFamily='serif';
   const professionArt=node('HUD.ProfessionArtwork',profession,32,36).addComponent(Sprite);
   professionArt.sizeMode=Sprite.SizeMode.CUSTOM;professionArt.trim=false;
   let professionImage:ImageAsset|null=null,professionTexture:Texture2D|null=null,professionFrame:SpriteFrame|null=null;
   resources.load('player-hud/sword-cultivator',ImageAsset,(error,asset)=>{
    if(disposed||!isValid(profession,true)||error||!asset)return;
    professionImage=asset;professionImage.addRef();professionTexture=new Texture2D();professionTexture.image=asset;
    professionTexture.setFilters(Texture2D.Filter.LINEAR,Texture2D.Filter.LINEAR);
    professionFrame=new SpriteFrame();professionFrame.texture=professionTexture;professionArt.spriteFrame=professionFrame;
    professionFallback.node.active=false;
   });
   const stats=label('',vitals,58,26,172,36,22,'#304D43');
   stats.node.name='HUD.RealmLabel';stats.fontFamily='serif';stats.enableWrapText=false;stats.horizontalAlign=Label.HorizontalAlign.LEFT;
   stats.overflow=Label.Overflow.SHRINK;
   // Numeric details remain available in the character panel; the HUD is glanceable.
   const hpLabel=label('',vitals,0,0,0,0,18,'#2E463A');hpLabel.node.name='HUD.HPLabel';hpLabel.node.active=false;
   const manaLabel=label('',vitals,0,0,0,0,18,'#396F88');manaLabel.node.name='HUD.ManaLabel';manaLabel.node.active=false;
   const hpBar=node('HUD.HPBar',vitals,200,8).addComponent(Graphics);hpBar.node.setPosition(44,0);
   const manaBar=node('HUD.ManaBar',vitals,200,6).addComponent(Graphics);manaBar.node.setPosition(44,-14);
   const xpBar=node('HUD.XPBar',vitals,200,4).addComponent(Graphics);xpBar.node.setPosition(44,-27);
   // 凝神诀 low-mana regen cue; shown only while the surge is active.
   const surgeChip=node('HUD.NingshenSurge',vitals,STATUS_ICON_SIZE,STATUS_ICON_SIZE);surgeChip.setPosition(-56+STATUS_ICON_SIZE/2,-43);
   const surgeIcons=new TowerStatusIconArt();surgeIcons.attach(surgeChip,'spirit');
   const surgeLabel=label('',surgeChip,0,0,0,0,9,'#A8F2E1');surgeLabel.node.name='HUD.NingshenSurgeText';
   surgeLabel.node.active=false;surgeChip.active=false;
   const dispose=()=>{
    if(disposed)return;disposed=true;surgeIcons.destroy();
    if(isValid(art,true))art.spriteFrame=null;
    frame?.destroy();texture?.destroy();image?.decRef();frame=null;texture=null;image=null;
    if(isValid(professionArt,true))professionArt.spriteFrame=null;
    professionFrame?.destroy();professionTexture?.destroy();professionImage?.decRef();
    professionFrame=null;professionTexture=null;professionImage=null;
   };
   return {root:vitals,hpBar,manaBar,surgeLabel,portraitGraphics,hpLabel,manaLabel,xpBar,stats,style,dispose};
  }
  const vitals=node('HUD.PlayerVitals',root,360,140);

  // The portrait overlaps the left ends of the trapezoid, joining the two silhouettes.
  const hpBar=node('HUD.HPBar',vitals,264,40).addComponent(Graphics);hpBar.node.setPosition(28,12);
  const portrait=node('HUD.Portrait',vitals,80,80);portrait.setPosition(-116,4);
  const portraitGraphics=portrait.addComponent(Graphics);
  const hpLabel=label('',vitals,28,12,216,38,26,'#FFFFFF');hpLabel.node.name='HUD.HPLabel';
  const manaLabel=label('',vitals,35,-36,218,24,18,'#83C9EF');manaLabel.node.name='HUD.ManaLabel';
  const mana=node('HUD.ManaTrack',vitals,218,4);mana.setPosition(35,-12);
  const mg=mana.addComponent(Graphics);mg.strokeColor=C('#5288B0');mg.lineWidth=.5;
  mg.rect(-108.75,-1.75,217.5,3.5);mg.stroke();
  const xpBar=node('HUD.XPBar',vitals,218,4).addComponent(Graphics);xpBar.node.setPosition(35,-16);
  const level=node('HUD.LevelBadge',vitals,156,32);level.setPosition(-78,-54);
  const lg=level.addComponent(Graphics);lg.fillColor=C('#183D35');lg.strokeColor=C('#9A7744');lg.lineWidth=1;
  lg.roundRect(-78,-16,156,32,6);lg.fill();lg.stroke();
  const stats=label('',level,0,0,144,32,24,'#FFFFFF');stats.node.name='HUD.RealmLabel';

 return {root:vitals,hpBar,manaBar:null,surgeLabel:null as Label|null,portraitGraphics,hpLabel,manaLabel,xpBar,stats,style,dispose:()=>{}};
}

// Shared paper action glyphs keep the hall and combat controls visually identical.
export function drawHudActionIcon(visual:Node,kind:'bag'|'book'|'gear',scale=.75){
  // Keep the generous hit area while reducing the paper disk and symbol by 25%.
  visual.setScale(scale,scale,1);
  const g=visual.addComponent(Graphics);
  g.fillColor=new Color(245,246,232,220);g.circle(0,0,35);g.fill();
  g.strokeColor=new Color('#456B60');g.lineWidth=2;g.circle(0,0,35);g.stroke();
  g.fillColor=new Color('#365E53');g.strokeColor=new Color('#365E53');g.lineWidth=3;
  if(kind==='gear'){
   for(let i=0;i<48;i++){const a=i*Math.PI/24,r=i%6<3?23:18;const px=Math.cos(a)*r,py=Math.sin(a)*r;if(i===0)g.moveTo(px,py);else g.lineTo(px,py);}g.close();g.fill();
   g.fillColor=new Color('#F5F6E8');g.circle(0,0,11);g.fill();g.strokeColor=new Color('#365E53');g.circle(0,0,7);g.stroke();
  }else if(kind==='bag'){
   g.roundRect(-19,-23,38,39,7);g.stroke();g.roundRect(-9,15,18,10,4);g.stroke();
   g.roundRect(-12,-17,24,14,3);g.stroke();g.moveTo(-19,8);g.lineTo(19,8);g.stroke();
   g.moveTo(-5,6);g.lineTo(-5,0);g.moveTo(5,6);g.lineTo(5,0);g.stroke();
  }else{
   g.moveTo(0,19);g.lineTo(-22,24);g.lineTo(-22,-17);g.lineTo(0,-23);g.lineTo(22,-17);g.lineTo(22,24);g.close();g.stroke();
   g.moveTo(0,19);g.lineTo(0,-23);g.stroke();
   for(let j=0;j<3;j++){g.moveTo(-16,12-j*9);g.lineTo(-6,9-j*9);g.moveTo(6,9-j*9);g.lineTo(16,12-j*9);g.stroke();}
  }
}
