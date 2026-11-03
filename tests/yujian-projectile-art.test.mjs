import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {stripTypeScriptTypes} from 'node:module'
import {runInNewContext} from 'node:vm'
import {yujianHoverPose,yujianHeading,yujianVisualPose,YUJIAN_LENGTH,newYujianState} from '../js/xianxia/TowerYujian.js'
function fixture(){
 const requests=[]
 class Node{
  constructor(name){Object.assign(this,{name,children:[],components:[],isValid:true,layer:1})}
  addChild(n){this.children.push(n);n.parent=this}
  addComponent(T){const c=new T;c.node=this;this.components.push(c);return c}
  setPosition(x,y){this.x=x;this.y=y}
  removeFromParent(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);this.parent=null}
  destroy(){this.isValid=false}
 }
 class UITransform{setContentSize(width,height){Object.assign(this,{width,height})}}
 class Sprite{static SizeMode={CUSTOM:1}}
 class Graphics{constructor(){this.strokes=0}clear(){}moveTo(){}lineTo(){}close(){}fill(){}stroke(){this.strokes++}}
 class UIOpacity{}
 class Color{constructor(...rgba){this.rgba=rgba}}
 class ImageAsset{addRef(){}decRef(){}}
 class Texture2D{static Filter={LINEAR:1};setFilters(){}destroy(){}}
 class SpriteFrame{destroy(){}}
 const context={Node,UITransform,Sprite,Graphics,UIOpacity,Color,ImageAsset,Texture2D,SpriteFrame,isValid:n=>!!n?.isValid,
  resources:{load:(path,type,callback)=>requests.push({path,callback})},yujianHoverPose,yujianHeading,yujianVisualPose,YUJIAN_LENGTH}
 const source=readFileSync(new URL('../cocos-pilot/assets/scripts/TowerProjectileArt.ts',import.meta.url),'utf8').replace(/^import .*$/gm,'').replace('export class','class')
 runInNewContext(stripTypeScriptTypes(source)+'\nglobalThis.Art=TowerProjectileArt',context)
 const art=new context.Art,parent=new Node('root'),g=new Graphics,camera={x:30,y:10}
 const state={time:1,phase:'playing',player:{x:10,y:20,hp:100,faceX:1},loadout:{growthVersion:1,active:{sj_yujian:10}},projectiles:[]}
 state.yujian=newYujianState(state.player,0);state.yujian.ready=10
 function draw(face=state.player.faceX){art.beginFrame();art.syncHover(parent,state,camera,face);for(const p of state.projectiles)art.draw(parent,p,p.x-camera.x,p.y-camera.y,state.time,camera,g);art.endFrame()}
 return {art,parent,g,state,draw,requests,ImageAsset,Sprite,Graphics,UIOpacity,UITransform,camera}
}
const shot=()=>({id:'a',source:'sj_yujian',x:100,y:50,vx:680,vy:0,yujianSlot:0,launchFace:1,gatherAt:0,flightAt:.4,hoverX:0,hoverY:100,hoverAngle:0,dissolveAt:null,trail:Array.from({length:16},(_,i)=>({x:i*10,y:50,angle:0,at:.75+i/60}))})
test('stored count controls hover independently of outgoing and dissolving swords',()=>{
 const f=fixture();f.draw();assert.equal(f.parent.children.length,10)
 f.state.projectiles=[shot()];f.draw();assert.equal(f.parent.children.filter(n=>n.name.includes('hover-')).length,10)
 assert.equal(f.parent.children.filter(n=>n.name.includes('ghost-')).length,4)
 assert.equal(f.parent.children.filter(n=>n.name.includes('shot-')).length,1)
 f.state.projectiles[0].dissolveAt=1;f.state.time=1.1;f.draw()
 assert.equal(f.parent.children.filter(n=>n.name.includes('hover-')).length,10)
 assert.equal(f.parent.children.filter(n=>n.name.includes('shot-')).length,0)
 assert.equal(f.parent.children.filter(n=>n.name.includes('ghost-')).length,4)
 assert.ok(f.g.strokes>0)
})
test('pause is immutable and facing uses smooth visible-character turning',()=>{
 const f=fixture();f.draw();const before=JSON.stringify(f.state),positions=()=>f.parent.children.map(n=>[n.x,n.y,n.angle])
 const initial=positions();f.draw();assert.deepEqual(positions(),initial);assert.equal(JSON.stringify(f.state),before)
 f.draw(-1);assert.equal(f.parent.children[0].angle,0)
 f.state.time+=.16;f.draw(-1);assert.ok(Math.abs(f.parent.children[0].angle-90)<1e-6)
 f.state.time+=.16;f.draw(-1);assert.ok(Math.abs(f.parent.children[0].angle-180)<1e-6)
})
test('404 retains shaped swords, successful load uses approved proportional sprite',()=>{
 const f=fixture();f.draw();assert.equal(f.requests[0].path,'tower-skill-fx/orbit-sword-v1')
 f.requests[0].callback(Error('404'));f.draw();assert.equal(f.parent.children.length,10)
 const fallback=f.parent.children[0].children[0].components.find(c=>c instanceof f.Graphics)
 assert.equal(fallback.enabled,true);assert.ok(fallback.strokes>0)
 const ok=fixture();ok.draw();ok.requests[0].callback(null,new ok.ImageAsset);ok.draw()
 const n=ok.parent.children[0],sprite=n.components.find(c=>c instanceof ok.Sprite),size=n.components.find(c=>c instanceof ok.UITransform)
 assert.equal(sprite.enabled,true);assert.ok(Math.abs(size.width*496/544-YUJIAN_LENGTH)<1e-8)
 assert.ok(Math.abs(size.height/size.width-128/544)<1e-8)
})
test('inactive, dead, lost, abandoned clear swords; pooled nodes stay bounded and reusable',()=>{
 const f=fixture();f.draw();const nodes=[...f.parent.children]
 for(const phase of ['lost','abandoned','won']){f.state.phase=phase;f.draw();assert.equal(f.parent.children.length,0)}
 f.state.phase='playing';f.state.player.hp=0;f.draw();assert.equal(f.parent.children.length,0)
 f.state.player.hp=100;f.state.loadout.active.sj_yujian=0;f.draw();assert.equal(f.parent.children.length,0)
 f.state.loadout.active.sj_yujian=10;f.draw();assert.ok(f.parent.children.every(n=>nodes.includes(n)))
 for(let i=0;i<100;i++){f.state.projectiles=[{...shot(),id:String(i)}];f.draw()}
 assert.ok(f.art.pool.length<=64);f.art.clearBindings();assert.equal(f.parent.children.length,0);assert.equal(f.art.pool.length,0)
})
test('dissolve freezes history geometry and fades existing afterimages',()=>{
 const f=fixture();f.state.projectiles=[{...shot(),dissolveAt:1}];f.draw()
 const a=f.parent.children.filter(n=>n.name.includes('ghost-')),positions=a.map(n=>[n.x,n.y,n.angle]),opacity=a[0].components.find(c=>c instanceof f.UIOpacity).opacity
 f.state.time=1.12;f.draw();const b=f.parent.children.filter(n=>n.name.includes('ghost-'))
 assert.deepEqual(b.map(n=>[n.x,n.y,n.angle]),positions)
 assert.ok(b[0].components.find(c=>c instanceof f.UIOpacity).opacity<opacity)
 f.state.time=1.26;f.draw();assert.equal(f.parent.children.filter(n=>n.name.includes('ghost-')).length,0)
})

test('legacy loadout has no new hover swords and retains its old projectile route',()=>{
 const f=fixture();delete f.state.loadout.growthVersion;f.draw();assert.equal(f.parent.children.length,0)
 const p=shot();delete p.yujianSlot;f.state.projectiles=[p];f.draw()
 assert.equal(f.parent.children.length,1);assert.equal(f.requests[0].path,'tower-skill-fx/yujian')
})

test('hostile feather uses approved art, velocity heading and existing removal without mutating shots',()=>{
 const f=fixture();f.state.loadout.active.sj_yujian=0;
 const p={id:'enemy-feather',hostile:true,element:'feather',x:100,y:50,vx:-270,vy:0,radius:12};f.state.projectiles=[p];const before=JSON.stringify(p);
 f.draw();assert.equal(f.requests[0].path,'tower-monsters-motion/feather');assert.equal(f.parent.children.length,0);
 f.requests[0].callback(null,new f.ImageAsset());f.draw();assert.equal(f.parent.children.length,1);
 const n=f.parent.children[0];assert.equal(n.angle,180);assert.equal(n.x,70);assert.equal(n.y,40);assert.equal(n.components.find(c=>c instanceof f.UITransform).width,48);
 f.draw();assert.equal(JSON.stringify(p),before);assert.equal(f.parent.children[0],n);
 p.vx=0;p.vy=270;f.draw();assert.equal(n.angle,90);
 f.state.projectiles=[];f.draw();assert.equal(f.parent.children.length,0);f.art.destroy();
});

test('hostile sonic uses approved art, velocity heading and existing removal without mutating shots',()=>{
 const f=fixture();f.state.loadout.active.sj_yujian=0;
 const p={id:'enemy-sonic',hostile:true,element:'sonic',x:100,y:50,vx:-270,vy:0,radius:12};f.state.projectiles=[p];const before=JSON.stringify(p);
 f.draw();assert.equal(f.requests[0].path,'tower-monsters-motion/sonic');assert.equal(f.parent.children.length,0);
 f.requests[0].callback(null,new f.ImageAsset());f.draw();assert.equal(f.parent.children.length,1);
 const n=f.parent.children[0];assert.equal(n.angle,180);assert.equal(n.x,70);assert.equal(n.y,40);assert.equal(n.components.find(c=>c instanceof f.UITransform).width,52);
 f.draw();assert.equal(JSON.stringify(p),before);assert.equal(f.parent.children[0],n);
 p.vx=0;p.vy=270;f.draw();assert.equal(n.angle,90);
 f.state.projectiles=[];f.draw();assert.equal(f.parent.children.length,0);f.art.destroy();
});

test('hostile poison uses approved art, velocity heading and existing removal without mutating shots',()=>{
 const f=fixture();f.state.loadout.active.sj_yujian=0;
 const p={id:'enemy-poison',hostile:true,element:'poison',x:100,y:50,vx:-270,vy:0,radius:12};f.state.projectiles=[p];const before=JSON.stringify(p);
 f.draw();assert.equal(f.requests[0].path,'tower-monsters-motion/poison');assert.equal(f.parent.children.length,0);
 f.requests[0].callback(null,new f.ImageAsset());f.draw();assert.equal(f.parent.children.length,1);
 const n=f.parent.children[0];assert.equal(n.angle,180);assert.equal(n.x,70);assert.equal(n.y,40);assert.equal(n.components.find(c=>c instanceof f.UITransform).width,48);
 f.draw();assert.equal(JSON.stringify(p),before);assert.equal(f.parent.children[0],n);
 p.vx=0;p.vy=270;f.draw();assert.equal(n.angle,90);
 f.state.projectiles=[];f.draw();assert.equal(f.parent.children.length,0);f.art.destroy();
});
