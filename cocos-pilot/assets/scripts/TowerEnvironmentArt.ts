import {towerResources as resources} from './TowerResources';
import {setTowerDepth} from './TowerDepthOrder';
import {Color,Graphics,ImageAsset,isValid,Node,Sprite,SpriteFrame,Texture2D,UITransform} from 'cc';
import {TOWER_PILLARS,PILLAR_ART,PILLAR_FOOTPRINT} from './shared/js/xianxia/TowerObstacles';
import {spawnMistPortals} from './shared/js/xianxia/TowerSpawnMist';
type Loaded={image:ImageAsset;texture:Texture2D;frame:SpriteFrame};
/** World-anchored ground haze and depth-sorted wisps; warnings stay readable. */
export class TowerEnvironmentArt {
 private dead=false;private loaded=new Map<string,Loaded>();private requested=new Set<string>();
 private nodes=new Map<string,Node>();private fading=new Map<string,{x:number;y:number;at:number}>();
 private previous=new Map<string,any>();private backdrop:Graphics|null=null;private fallbacks=new Map<string,Graphics>();
 private mistEpoch='';private mistTime=-1;
 private frame(name:string){
  if(!this.requested.has(name)){
   this.requested.add(name);resources.load(`tower-environment/${name}`,ImageAsset,(error,image)=>{
    if(this.dead||error||!image)return;
    image.addRef();const texture=new Texture2D();texture.image=image;texture.setFilters(Texture2D.Filter.LINEAR,Texture2D.Filter.LINEAR);
    const frame=new SpriteFrame();frame.texture=texture;this.loaded.set(name,{image,texture,frame});
   });
  }
  return this.loaded.get(name)?.frame;
 }
 private sprite(parent:Node,id:string,name:string,x:number,y:number,w:number,h:number,alpha=255,angle=0){
  const frame=this.frame(name);if(!frame)return false;
  let node=this.nodes.get(id);
  if(!node||!isValid(node,true)||node.parent!==parent){
   node=new Node(id);node.layer=parent.layer;parent.addChild(node);node.addComponent(UITransform);
   const s=node.addComponent(Sprite);s.sizeMode=Sprite.SizeMode.CUSTOM;s.trim=false;s.spriteFrame=frame;this.nodes.set(id,node);
  }
  node.active=true;node.setPosition(x,y);node.angle=angle;node.getComponent(UITransform)!.setContentSize(w,h);
  node.getComponent(Sprite)!.color=new Color(255,255,255,Math.round(alpha));return true;
 }
 draw(ground:Node,props:Node,s:any,camera:{x:number;y:number},width:number,height:number,actors:Node=props){
  if(this.dead)return false;
  for(const node of this.nodes.values())if(isValid(node,true))node.active=false;
  if(!this.backdrop||!isValid(this.backdrop.node,true)){
   const n=new Node('塔外暗色');n.layer=ground.layer;ground.addChild(n);this.backdrop=n.addComponent(Graphics);
  }
  this.backdrop.clear();this.backdrop.fillColor=new Color('#101e1d');this.backdrop.rect(-width/2,-height/2,width,height);this.backdrop.fill();
  for(const g of this.fallbacks.values())if(isValid(g.node,true))g.node.active=false;
  if(s.arenaVersion!==1)return false;
  const floor=this.sprite(ground,'floor','tower_floor_stone',33-camera.x,-60-camera.y,1890,2160);
  for(const p of TOWER_PILLARS){
   if(this.sprite(actors,p.id,'tower_obstacle_pillar',p.x-camera.x,p.y-camera.y+PILLAR_ART.offsetY,PILLAR_ART.width,PILLAR_ART.height)){
    setTowerDepth(this.nodes.get(p.id)!,p.y);
   }else{
    let g=this.fallbacks.get(p.id);
    if(!g||!isValid(g.node,true)){
     const node=new Node(`镇妖柱占位-${p.id}`);node.layer=actors.layer;actors.addChild(node);
     g=node.addComponent(Graphics);this.fallbacks.set(p.id,g);
    }
    g.node.active=true;setTowerDepth(g.node,p.y);g.clear();g.fillColor=new Color('#66746b');
    PILLAR_FOOTPRINT.forEach((v,i)=>{const x=p.x-camera.x+v.x,y=p.y-camera.y+v.y;if(i)g!.lineTo(x,y);else g!.moveTo(x,y)});g.close();g.fill();
   }
  }
  const epoch=`${s.floor}:${s.wave}:${s.waveStartedAt}`;
  if(epoch!==this.mistEpoch||s.time<this.mistTime||!['playing','paused'].includes(s.phase)){
   this.previous.clear();this.fading.clear();
  }
  this.mistEpoch=epoch;this.mistTime=s.time;
  const live=new Map<string,any>(spawnMistPortals(s).map((p:any)=>[p.id,p]));
  for(const [id,r] of this.previous)if(!live.has(id))this.fading.set(id,{x:r.x,y:r.y,at:s.time});
  this.previous=live;
  for(const [id,r] of live){
   this.fading.delete(id);
   this.drawMist(props,actors,id,r,camera,s.time,1);
  }
  for(const [id,r] of this.fading){
   const t=(s.time-r.at)/.7;
   if(t>=1||t<0){this.fading.delete(id);continue;}
   this.drawMist(props,actors,id,r,camera,s.time,1-t);
  }
  for(const [id,n] of this.nodes)if(id.startsWith('mist-')){
   const portal=id.split(':')[1];
   if(!live.has(portal)&&!this.fading.has(portal)){n.destroy();this.nodes.delete(id);}
  }
  return floor;
 }
 private drawMist(ground:Node,actors:Node,id:string,p:any,camera:{x:number;y:number},time:number,alpha:number){
  // Flatten the vortex into overlapping banks, rather than stacking dark rings.
  // Each raised bank has a fixed ground depth: walking through it naturally
  // moves a character behind/in front of the haze without changing gameplay.
  const layers=[
   [-35,4,360,190,0,62,0],
   [42,-16,310,160,1.9,52,0],
   [-44,62,290,180,3.7,165,76],
   [40,42,300,164,5.2,180,-18],
   [-18,12,330,150,2.6,195,-94],
  ];
  layers.forEach(([dx,dy,w,h,phase,opacity,depth],i)=>{
   const drift=Math.sin(time*.38+phase)*7,breathe=1+.025*Math.sin(time*.52+phase);
   const key=`mist-:${id}:${i}`;
   this.sprite(i<2?ground:actors,key,'tower_mist_wisp',p.x-camera.x+dx+drift,p.y-camera.y+dy,
    w*breathe+(1-alpha)*30,h*breathe+(1-alpha)*18,alpha*opacity,Math.sin(time*.24+phase)*4);
   const node=this.nodes.get(key);
   if(node){
    node.getComponent(Sprite)!.color=new Color(197,203,219,Math.round(alpha*opacity));
    if(i>=2)setTowerDepth(node,p.y+depth);
   }
  });
 }
 clearBindings(){for(const n of this.nodes.values())if(isValid(n,true))n.destroy();this.nodes.clear();this.previous.clear();this.fading.clear();if(this.backdrop&&isValid(this.backdrop.node,true))this.backdrop.node.destroy();this.backdrop=null;for(const g of this.fallbacks.values())if(isValid(g.node,true))g.node.destroy();this.fallbacks.clear();}
 destroy(){this.dead=true;this.clearBindings();for(const a of this.loaded.values()){a.frame.destroy();a.texture.destroy();a.image.decRef()}this.loaded.clear();}
}
