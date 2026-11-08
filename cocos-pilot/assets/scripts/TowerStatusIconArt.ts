import {Node,Sprite,SpriteFrame,Texture2D,ImageAsset,UITransform,Color,Vec2,isValid} from 'cc';
import {towerResources as resources} from './TowerResources';
export const STATUS_ICON_SIZE=24;
/** Transparent cutouts, with a radial copy that shades only the artwork's alpha. */
export class TowerStatusIconArt {
 private dead=false;
 private entries=new Map<string,{image?:ImageAsset;texture?:Texture2D;frame?:SpriteFrame;waiting:((frame:SpriteFrame)=>void)[]}>();
 attach(parent:Node,id:string){
  const make=(name:string)=>{const n=new Node(name);n.layer=parent.layer;parent.addChild(n);n.addComponent(UITransform).setContentSize(STATUS_ICON_SIZE,STATUS_ICON_SIZE);const s=n.addComponent(Sprite);s.sizeMode=Sprite.SizeMode.CUSTOM;s.trim=false;return s;};
  const sprite=make('状态主体'),shade=make('顺时针倒计时');
  shade.type=Sprite.Type.FILLED;shade.fillType=Sprite.FillType.RADIAL;shade.fillCenter=new Vec2(.5,.5);shade.fillStart=.25;shade.fillRange=0;shade.color=new Color(0,0,0,175);
  const show=(frame:SpriteFrame)=>{if(this.dead||!isValid(sprite,true)||!isValid(shade,true))return;sprite.spriteFrame=frame;shade.spriteFrame=frame;};
  let entry=this.entries.get(id);
  if(entry?.frame)show(entry.frame);
  else if(entry)entry.waiting.push(show);
  else{
   entry={waiting:[show]};this.entries.set(id,entry);const current=entry;
   resources.load(`tower-status-icons/${id}`,ImageAsset,(error,image)=>{
    if(this.dead||error||!image){current.waiting=[];return;}
    image.addRef();current.image=image;const texture=current.texture=new Texture2D();texture.image=image;texture.setFilters(Texture2D.Filter.LINEAR,Texture2D.Filter.LINEAR);
    const frame=current.frame=new SpriteFrame();frame.texture=texture;
    for(const ready of current.waiting)ready(frame);current.waiting=[];
   });
  }
  return {sprite,shade,setProgress:(elapsed:number)=>{shade.fillRange=-Math.max(0,Math.min(1,elapsed));}};
 }
 destroy(){this.dead=true;for(const e of this.entries.values()){e.waiting=[];e.frame?.destroy();e.texture?.destroy();e.image?.decRef();}this.entries.clear();}
}
