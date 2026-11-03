import {towerResources as resources} from './TowerResources';
import {Color,Graphics,ImageAsset,isValid,Node,Sprite,SpriteFrame,Texture2D,UITransform} from 'cc';
import {convergencePoses} from './shared/js/xianxia/TowerConvergence';

/** Two ranks of ceremonial swords, consumed by the existing combat beats. */
export class ConvergenceArt {
 private requested=false;private dead=false;
 private images:ImageAsset[]=[];private textures:Texture2D[]=[];
 private frame:SpriteFrame|null=null;private gold:SpriteFrame|null=null;private aura:SpriteFrame|null=null;
 private actors=new Map<string,{node:Node;ui:UITransform;sprite:Sprite;auraNode:Node;auraUi:UITransform;auraSprite:Sprite}>();
 private trails:Graphics|null=null;
 readonly covered=new Set<string>();
 preload(){
  if(this.requested||this.dead)return;this.requested=true;
  for(const name of ['tiandi-solid-sword-v2','convergence-gold-sword-v2','convergence-ice-aura-sharp-v2']){
   resources.load(`tower-skill-fx/${name}`,ImageAsset,(error,image)=>{
    if(this.dead||error||!image)return;
    image.addRef();this.images.push(image);const texture=new Texture2D();texture.image=image;this.textures.push(texture);
    const frame=new SpriteFrame();frame.texture=texture;
    if(name==='tiandi-solid-sword-v2')this.frame=frame;
    else if(name==='convergence-gold-sword-v2')this.gold=frame;
    else this.aura=frame;
   });
  }
 }
 cameraKick(state:any){
  if(state?.player?.hp<=0)return {x:0,y:0};
  let age=1;
  for(const e of state?.effects||[]){
   if(e.kind!=='hit'||e.hostile||!(e.damage>0)||e.impact?.skill!=='evo_wanjian'||e.impact.pulseIndex!==e.impact.pulseCount)continue;
   const a=state.time-(e.startedAt??e.expiresAt-.25);if(a>=0&&a<age)age=a;
  }
  const fade=Math.max(0,1-age/.14);
  return {x:Math.sin(age*170)*2.5*fade,y:Math.sin(age*125)*3.5*fade};
 }
 syncTower(parent:Node,state:any,camera:{x:number;y:number}){
  this.preload();this.covered.clear();const seen=new Set<string>();this.trails?.clear();
  if(this.frame&&isValid(parent,true)&&state.player?.hp>0){
   if(!this.trails){const node=new Node('万剑阵纹与剑迹');node.layer=parent.layer;parent.addChild(node);this.trails=node.addComponent(Graphics)}
   const g=this.trails;
   for(const z of state.zones||[]){
    if(z.kind!=='sword_rain'||z.formId!=='evo_wanjian'||z.hostile||z.ticks<=0)continue;
    this.covered.add(z.id);
    const age=Math.max(0,state.time-z.startedAt),open=Math.min(1,age/.16);
    const x=z.x-camera.x,y=z.y-camera.y+52;
    const fade=Math.min(1,(z.ticks||1)/3)*open;
    for(let ring=0;ring<2;ring++){
     const radius=(184+ring*48)*(.85+.15*open);
     g.strokeColor=new Color(141,224,247,Math.round((ring?65:110)*fade));g.lineWidth=ring?1:1.6;
     g.circle(x,y,radius);g.stroke();
     for(let i=0;i<16;i++){
      const a=i*Math.PI/8+age*(ring?-.12:.12),dx=Math.cos(a),dy=Math.sin(a);
      g.moveTo(x+dx*(radius-5),y+dy*(radius-5));g.lineTo(x+dx*(radius+5),y+dy*(radius+5));g.stroke();
     }
    }
   }
   for(const p of convergencePoses(state)){
    let a=this.actors.get(p.id);
    if(!a){
     const auraNode=new Node(`归宗冰蓝剑芒-${p.id}`);auraNode.layer=parent.layer;parent.addChild(auraNode);
     const auraUi=auraNode.addComponent(UITransform);auraUi.setAnchorPoint(.25,.5);
     const auraSprite=auraNode.addComponent(Sprite);auraSprite.sizeMode=Sprite.SizeMode.CUSTOM;auraSprite.trim=false;
     const node=new Node(`万剑归宗-${p.id}`);node.layer=parent.layer;parent.addChild(node);
     const ui=node.addComponent(UITransform);ui.setAnchorPoint(12/1280,.5);
     const sprite=node.addComponent(Sprite);sprite.sizeMode=Sprite.SizeMode.CUSTOM;sprite.trim=false;
     a={node,ui,sprite,auraNode,auraUi,auraSprite};this.actors.set(p.id,a)}
    a.sprite.spriteFrame=p.terminal?(this.gold||this.frame):this.frame;
    a.node.setPosition(p.x-camera.x,p.y-camera.y);a.node.angle=p.angle*180/Math.PI;
    a.ui.setContentSize(p.span*1280/1256,p.span*224/1256);
    a.sprite.color=new Color(255,255,255,Math.round(p.alpha));seen.add(p.id);
    // The source crescent is flattened along the blade, leaving its metal core readable.
    // Both surfaces share the same pose and simulation clock, including pause/fade.
    a.auraNode.active=!!this.aura;a.auraSprite.spriteFrame=this.aura;
    a.auraNode.setPosition(p.x-camera.x,p.y-camera.y);a.auraNode.angle=a.node.angle;
    const breath=1+.045*Math.sin(state.time*9+p.x*.013+p.y*.017);
    a.auraUi.setContentSize(p.span*1.45,p.span*(p.terminal?.57:.49)*breath);
    a.auraSprite.color=new Color(255,255,255,Math.round(p.alpha*(p.terminal?.78:.44+.25*p.flight)));
    if(p.flight>0&&Number.isFinite(p.tailX)){
     g.strokeColor=new Color(170,238,255,Math.round(p.alpha*.6));g.lineWidth=2;
     const cx=(p.x+p.tailX)/2-camera.x+8,cy=(p.y+p.tailY)/2-camera.y;
     g.moveTo(p.tailX-camera.x,p.tailY-camera.y);g.quadraticCurveTo(cx,cy,p.x-camera.x,p.y-camera.y);g.stroke();
    }
   }
   for(const e of state.effects||[])if(e.kind==='convergence'&&seen.has(e.id)){
    this.covered.add(e.id);
    const age=state.time-(e.startedAt??e.expiresAt-.25),fade=Math.max(0,1-age/.25);
    g.strokeColor=e.terminal?new Color(255,221,141,Math.round(180*fade)):new Color(162,237,255,Math.round(155*fade));
    g.lineWidth=(e.terminal?16:3)*fade;
    g.moveTo(e.x-camera.x,e.y-camera.y+52);g.lineTo(e.toX-camera.x,e.toY-camera.y+52);g.stroke();
    g.strokeColor=new Color(255,252,232,Math.round(230*fade));g.lineWidth=e.terminal?3:1;
    g.moveTo(e.x-camera.x,e.y-camera.y+52);g.lineTo(e.toX-camera.x,e.toY-camera.y+52);g.stroke();
   }
   // Impact halos require real positive damage; an empty cast never shakes or bursts.
   const marks=new Set<string>();
   for(const h of state.effects||[]){
    if(h.kind!=='hit'||h.hostile||!(h.damage>0)||h.impact?.skill!=='evo_wanjian')continue;
    const age=state.time-(h.startedAt??h.expiresAt-.25);if(age<0||age>=.23)continue;
    const key=`${h.impact.castId}:${h.impact.pulseIndex}`;if(marks.has(key))continue;marks.add(key);
    const terminal=h.impact.pulseIndex===h.impact.pulseCount,fade=1-age/.23;
    const x=h.x-camera.x,y=h.y-camera.y+52,radius=8+age*(terminal?280:125);
    g.strokeColor=terminal?new Color(255,225,160,Math.round(240*fade)):new Color(191,246,255,Math.round(180*fade));
    g.lineWidth=terminal?3:1.5;g.circle(x,y,radius);g.stroke();
    if(terminal)for(let i=0;i<12;i++){
     const a=i*Math.PI/6,dx=Math.cos(a),dy=Math.sin(a);
     g.moveTo(x+dx*radius,y+dy*radius);g.lineTo(x+dx*(radius+24*fade),y+dy*(radius+24*fade));g.stroke();
    }
   }
  }
  for(const [id,a] of this.actors)if(!seen.has(id)){a.node.destroy();a.auraNode.destroy();this.actors.delete(id)}
  return this.covered;
 }
 clearBindings(){for(const a of this.actors.values()){a.node.destroy();a.auraNode.destroy()}this.actors.clear();this.trails?.node.destroy();this.trails=null}
 reset(){this.clearBindings();this.covered.clear()}
 destroy(){this.dead=true;this.reset();this.frame?.destroy();this.gold?.destroy();this.aura?.destroy();for(const t of this.textures)t.destroy();for(const i of this.images)i.decRef();this.images=[];this.textures=[]}
}
