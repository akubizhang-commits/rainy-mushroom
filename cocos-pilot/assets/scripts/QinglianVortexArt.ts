import {towerResources as resources} from './TowerResources';
import {Color,ImageAsset,Node,Sprite,SpriteFrame,Texture2D,UITransform} from 'cc';
import {skillForm} from './shared/js/xianxia/TowerSkillForms';

/** Static reference layers for 青莲剑阵: the vortex body and the central pool glow.
 * Both are processed from design/xianxia-qinglian-2026-11-09 and never rotate. The rotating
 * judgment blades are drawn on the shared skill graphics by QinglianFormationArt.
 */
// v2 is the v1 layer with alpha × 1.6 (scripts/art/qinglian_vortex_boost.py), for readable contrast in play.
const VORTEX_PATH='tower-skill-fx/qinglian-vortex-layer-v2';
const POOL_PATH='tower-skill-fx/qinglian-pool-v2';
// Processed canvas size of both layers, and the reference ring's width inside it (alpha bbox 16..1379).
const CANVAS_W=1395,CANVAS_H=897,RING_W=1363;

type Binding={node:Node;ui:UITransform;sprite:Sprite;pool:Node;poolUi:UITransform;poolSprite:Sprite};

export class QinglianVortexArt {
 private requested=false;private dead=false;
 private images:ImageAsset[]=[];private textures:Texture2D[]=[];
 private vortex:SpriteFrame|null=null;private pool:SpriteFrame|null=null;
 private bindings=new Map<string,Binding>();
 preload(){
  if(this.requested||this.dead)return;this.requested=true;
  for(const path of [VORTEX_PATH,POOL_PATH]){
   resources.load(path,ImageAsset,(error,image)=>{
    if(this.dead||error||!image)return;
    image.addRef();this.images.push(image);
    const texture=new Texture2D();texture.image=image;this.textures.push(texture);
    const frame=new SpriteFrame();frame.texture=texture;
    if(path===VORTEX_PATH)this.vortex=frame;else this.pool=frame;
   });
  }
 }
 /** The reference ring spans the judgment radius on each side, so the drawn ring matches the 200 px reach. */
 syncTower(parent:Node,state:any,camera:{x:number;y:number}){
  const seen=new Set<string>();
  if(this.vortex&&this.pool&&state?.player?.hp>0){
   const scale=skillForm('sj_qinglian',1).radius/(RING_W/2);
   for(const z of state.zones||[]){
    if(z.kind!=='qinglian'||z.hostile)continue;
    const age=Math.max(0,state.time-z.startedAt),total=Math.max(.001,(z.expiresAt??z.startedAt+3)-z.startedAt);
    const fade=Math.min(1,age/.3,(total-age)/.4);
    if(fade<=0)continue;
    seen.add(z.id);
    const b=this.bindings.get(z.id)??this.create(parent,z.id);
    const x=z.x-camera.x,y=z.y-camera.y,w=CANVAS_W*scale,h=CANVAS_H*scale;
    b.node.setPosition(x,y);b.ui.setContentSize(w,h);
    b.sprite.spriteFrame=this.vortex;b.sprite.color=new Color(255,255,255,Math.round(255*fade));
    b.pool.setPosition(x,y);b.poolUi.setContentSize(w,h);
    b.poolSprite.spriteFrame=this.pool;b.poolSprite.color=new Color(255,255,255,Math.round(204*fade));
   }
  }
  for(const [id,b] of this.bindings)if(!seen.has(id)){b.node.destroy();b.pool.destroy();this.bindings.delete(id)}
 }
 private create(parent:Node,id:string):Binding{
  // The pool glow sits under the vortex body; both live below the skill graphics that draw the blades.
  const pool=new Node(`青莲阵眼淡光-${id}`);pool.layer=parent.layer;parent.addChild(pool);
  const poolUi=pool.addComponent(UITransform);poolUi.setAnchorPoint(.5,.5);
  const poolSprite=pool.addComponent(Sprite);poolSprite.sizeMode=Sprite.SizeMode.CUSTOM;poolSprite.trim=false;
  const node=new Node(`青莲冰晶涡旋层-${id}`);node.layer=parent.layer;parent.addChild(node);
  const ui=node.addComponent(UITransform);ui.setAnchorPoint(.5,.5);
  const sprite=node.addComponent(Sprite);sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.trim=false;
  const b={node,ui,sprite,pool,poolUi,poolSprite};this.bindings.set(id,b);return b;
 }
 clearBindings(){for(const b of this.bindings.values()){b.node.destroy();b.pool.destroy()}this.bindings.clear()}
 reset(){this.clearBindings()}
 destroy(){
  this.dead=true;this.reset();
  this.vortex?.destroy();this.pool?.destroy();
  for(const t of this.textures)t.destroy();for(const i of this.images)i.decRef();
  this.images=[];this.textures=[];
 }
}
