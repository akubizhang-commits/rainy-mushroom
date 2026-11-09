import {towerResources as resources} from './TowerResources';
import {Color,ImageAsset,Node,Sprite,SpriteFrame,Texture2D,UITransform} from 'cc';
import {skillForm} from './shared/js/xianxia/TowerSkillForms';
import {qinglianVortexSpin} from './QinglianFormationArt';

/** Static art for 青莲剑阵: the vortex split into an outer (large petals) and an inner (small petals) layer,
 * plus a central pool glow. The layers are processed in design/xianxia-qinglian-2026-11-09 by
 * scripts/art/qinglian_vortex_boost.py (pool glow) and scripts/art/qinglian_vortex_split.py (vortex layers).
 * Each vortex layer is already a round disc. It rotates clockwise on its own node, and the container
 * squashes both to the reference ellipse, so the ring reads as turning on the ground.
 */
const OUTER_PATH='tower-skill-fx/qinglian-vortex-outer-v3';
const INNER_PATH='tower-skill-fx/qinglian-vortex-inner-v3';
const POOL_PATH='tower-skill-fx/qinglian-pool-v2';
// Processed canvas: 1395×897 (pool). The vortex disc is 1395 square, with the ring 1363 px wide.
const CANVAS_W=1395,CANVAS_H=897,DISC=1395;
// Reference ellipse: height / width of the processed canvas. The container squashes the discs to it.
const SQUASH=CANVAS_H/CANVAS_W;
const CANVAS_TO_WORLD_SCALE=()=>skillForm('sj_qinglian',1).radius/(1363/2);

type Binding={
 root:Node;container:Node;
 outer:Node;outerUi:UITransform;outerSprite:Sprite;
 inner:Node;innerUi:UITransform;innerSprite:Sprite;
 pool:Node;poolUi:UITransform;poolSprite:Sprite;
};

export class QinglianVortexArt {
 private requested=false;private dead=false;
 private images:ImageAsset[]=[];private textures:Texture2D[]=[];
 private outerFrame:SpriteFrame|null=null;private innerFrame:SpriteFrame|null=null;private pool:SpriteFrame|null=null;
 private bindings=new Map<string,Binding>();
 preload(){
  if(this.requested||this.dead)return;this.requested=true;
  for(const path of [OUTER_PATH,INNER_PATH,POOL_PATH]){
   resources.load(path,ImageAsset,(error,image)=>{
    if(this.dead||error||!image)return;
    image.addRef();this.images.push(image);
    const texture=new Texture2D();texture.image=image;this.textures.push(texture);
    const frame=new SpriteFrame();frame.texture=texture;
    if(path===OUTER_PATH)this.outerFrame=frame;else if(path===INNER_PATH)this.innerFrame=frame;else this.pool=frame;
   });
  }
 }
 syncTower(parent:Node,state:any,camera:{x:number;y:number}){
  const seen=new Set<string>();
  if(this.outerFrame&&this.innerFrame&&this.pool&&state?.player?.hp>0){
   const scale=CANVAS_TO_WORLD_SCALE(),disc=DISC*scale,w=CANVAS_W*scale,h=CANVAS_H*scale;
   for(const z of state.zones||[]){
    if(z.kind!=='qinglian'||z.hostile)continue;
    const age=Math.max(0,state.time-z.startedAt),total=Math.max(.001,(z.expiresAt??z.startedAt+3)-z.startedAt);
    const fade=Math.min(1,age/.3,(total-age)/.4);
    if(fade<=0)continue;
    seen.add(z.id);
    const b=this.bindings.get(z.id)??this.create(parent,z.id);
    const x=z.x-camera.x,y=z.y-camera.y;
    const spin=qinglianVortexSpin(age);
    b.pool.setPosition(x,y);b.poolUi.setContentSize(w,h);
    b.poolSprite.spriteFrame=this.pool;b.poolSprite.color=new Color(255,255,255,Math.round(204*fade));
    b.container.setPosition(x,y);b.container.setScale(1,SQUASH,1);
    b.outer.angle=spin.outer;b.outerUi.setContentSize(disc,disc);
    b.outerSprite.spriteFrame=this.outerFrame;b.outerSprite.color=new Color(255,255,255,Math.round(255*fade));
    b.inner.angle=spin.inner;b.innerUi.setContentSize(disc,disc);
    b.innerSprite.spriteFrame=this.innerFrame;b.innerSprite.color=new Color(255,255,255,Math.round(255*fade));
   }
  }
  for(const [id,b] of this.bindings)if(!seen.has(id)){b.root.destroy();this.bindings.delete(id)}
 }
 private layer(name:string,parent:Node){
  const node=new Node(name);node.layer=parent.layer;parent.addChild(node);
  const ui=node.addComponent(UITransform);ui.setAnchorPoint(.5,.5);
  const sprite=node.addComponent(Sprite);sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.trim=false;
  return {node,ui,sprite};
 }
 private create(parent:Node,id:string):Binding{
  // Root holds the pool (flat) and the container (squashed). Inside the container: inner, then outer disc.
  const root=new Node(`青莲阵体-${id}`);root.layer=parent.layer;parent.addChild(root);
  const pool=this.layer(`青莲阵眼淡光-${id}`,root);
  const container=new Node(`青莲地面压扁-${id}`);container.layer=parent.layer;root.addChild(container);
  const inner=this.layer(`青莲内层小瓣-${id}`,container);
  const outer=this.layer(`青莲外层大瓣-${id}`,container);
  const b:Binding={root,container,
   outer:outer.node,outerUi:outer.ui,outerSprite:outer.sprite,
   inner:inner.node,innerUi:inner.ui,innerSprite:inner.sprite,
   pool:pool.node,poolUi:pool.ui,poolSprite:pool.sprite};
  this.bindings.set(id,b);return b;
 }
 clearBindings(){for(const b of this.bindings.values())b.root.destroy();this.bindings.clear()}
 reset(){this.clearBindings()}
 destroy(){
  this.dead=true;this.reset();
  this.outerFrame?.destroy();this.innerFrame?.destroy();this.pool?.destroy();
  for(const t of this.textures)t.destroy();for(const i of this.images)i.decRef();
  this.images=[];this.textures=[];
 }
}
