import {Color,Graphics,Label} from 'cc';
import {PilotUI} from './PilotUI';
import {BRAND_SHAPES} from './shared/js/cocos/GameSession';

/** Game-owned loading screen; does not replace the native WeChat splash. */
export function renderBrandScreen(ui:PilotUI,sceneName=''){
 const w=ui.width,h=ui.height;
 ui.box(ui.node('Forest background',ui.root,w,h),new Color('#274939'),0);
 const forest=ui.node('Quiet forest',ui.root,w,h).addComponent(Graphics);
 for(let layer=0;layer<2;layer++){
  forest.fillColor=new Color(layer?'#305440':'#2C4E3C');
  for(let i=0;i<7;i++){
   const x=-w/2+i*w/5+(layer?25:0),base=-h/2,tip=base+h*(.28+(i%3)*.065);
   forest.moveTo(x,tip);forest.lineTo(x-40,base+20);forest.lineTo(x+40,base+20);forest.close();forest.fill();
   forest.rect(x-3,base,6,38);forest.fill();
  }
 }
 const center=(ui.bottom-ui.top)/2+20;
 const mark=ui.node('Rainy mushroom mark',ui.root,132,132);mark.setPosition(0,center+75);
 const g=mark.addComponent(Graphics),scale=132/512;
 // The page provides the background, so retain only the distinctive foreground.
 for(const shape of (BRAND_SHAPES as any[]).slice(2)){
  for(const command of shape.d){
   const [op,...p]=command,xy=(i:number)=>(i%2?256-p[i]:p[i]-256)*scale;
   if(op==='M')g.moveTo(xy(0),xy(1));
   else if(op==='L')g.lineTo(xy(0),xy(1));
   else if(op==='C')g.bezierCurveTo(xy(0),xy(1),xy(2),xy(3),xy(4),xy(5));
   else g.close();
  }
  if(shape.fill){g.fillColor=new Color(shape.fill);g.fill()}
  else{g.strokeColor=new Color(shape.stroke);g.lineWidth=shape.width*scale;g.stroke()}
 }
 const text=(value:string,y:number,size:number,color:string,height=40)=>{
  const n=ui.text(value,ui.root,w-48,height,size,new Color(color));
  n.setPosition(0,y);n.getComponent(Label)!.horizontalAlign=Label.HorizontalAlign.CENTER;
 };
 text('雨后菌语',center-20,32,'#FAF7EE',54);
 text('走进森林，认识菌物',center-68,15,'#C7DBC0');
 text(sceneName||'正在准备林间素材…',center-134,14,'#FAF7EE');
 if(sceneName)text('正在走进这片森林…',center-163,12,'#C7DBC0');
 text('游戏中的鉴别，不作为现实采食依据',-h/2+ui.bottom+24,11,'#C7DBC0');
}
