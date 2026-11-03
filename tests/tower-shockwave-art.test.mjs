import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';
const source=stripTypeScriptTypes(readFileSync(new URL('../cocos-pilot/assets/scripts/TowerShockwaveArt.ts',import.meta.url),'utf8').replace(/^import .*$/gm,''),{mode:'transform'}).replace(/^export /gm,'');
class Graphics{points=[];clear(){this.points=[];}moveTo(x,y){this.points.push([x,y]);}lineTo(x,y){this.points.push([x,y]);}close(){}fill(){}}
class Mask{static Type={GRAPHICS_STENCIL:2};}
class Node{layer=1;components=new Map();addChild(n){n.parent=this;}addComponent(T){const c=new T();this.components.set(T,c);if(T===Mask)this.addComponent(Graphics);return c;}getComponent(T){return this.components.get(T);}setPosition(x,y){this.position={x,y};}setScale(){}removeFromParent(){this.parent=null;}destroy(){this.destroyed=true;}}
class UITransform{setContentSize(w,h){this.width=w;this.height=h;}}
class Sprite{static SizeMode={CUSTOM:1};}
class SpriteFrame{destroy(){}}
class Rect{constructor(x,y,width,height){Object.assign(this,{x,y,width,height});}}
class Texture2D{static Filter={LINEAR:1};setFilters(){}destroy(){}}
class ImageAsset{refs=0;addRef(){this.refs++;}decRef(){this.refs--;}}
class Color{constructor(r,g,b,a){Object.assign(this,{r,g,b,a});}}
function setup(){let callback;const context={Node,UITransform,Sprite,SpriteFrame,Texture2D,ImageAsset,Color,Rect,Mask,Graphics,isValid:()=>true,resources:{load(p,t,c){callback=c;}}};const Art=runInNewContext(source+';TowerShockwaveArt',context);const art=new Art(new Node()),image=new ImageAsset();return{art,image,load:(error=null)=>callback(error,image)};}
const state=(time,radius=100)=>({time,enemies:[{id:'boss',hp:20}],monsterMechanics:{zones:[{id:'z',ownerId:'boss',skillId:'M15',x:50,y:0,radius,innerRadius:Math.max(0,radius-45),angle:Math.PI*1.5,faceX:0,faceY:1,activatesAt:1,expiresAt:2}]}});
function inside(points,x,y){let hit=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;}
test('M15 tracks expanding annulus, fixed width, safe opening, orientation and paused simulation',()=>{
 const f=setup();f.art.draw(state(0),{x:0,y:0});f.load();f.art.draw(state(.9),{x:0,y:0});assert.equal(f.art.waves.size,0);
 for(const r of [35,100,200]){const s=state(1.4,r),before=JSON.stringify(s);f.art.draw(s,{x:10,y:20});const w=f.art.waves.get('z');assert.equal(JSON.stringify(s),before);assert.equal(w.node.angle,90);assert.equal(w.node.position.x,40);assert.equal(w.strips.length,72);assert.equal(w.strips[0].sprite.trim,true);assert.equal(w.strips[0].transform.height,Math.min(45,r));assert.ok(inside(w.mask.points,r-10,0));assert.ok(!inside(w.mask.points,-r+10,0));assert.ok(!inside(w.mask.points,r+1,0));if(r>45)assert.ok(!inside(w.mask.points,0,0));const snapshot=JSON.stringify(w.mask.points);f.art.draw(s,{x:10,y:20});assert.equal(JSON.stringify(w.mask.points),snapshot);}
 f.art.draw(state(1.95),{x:0,y:0});assert.ok(f.art.waves.get('z').strips[0].sprite.color.a<100);f.art.draw(state(2),{x:0,y:0});assert.equal(f.art.waves.size,0);f.art.destroy();assert.equal(f.image.refs,0);
});
test('owner death, cancellation, load failure and late callback leave no active art',()=>{
 const f=setup();f.art.draw(state(0),{x:0,y:0});f.load();f.art.draw(state(1.2),{x:0,y:0});const s=state(1.3);s.enemies[0].hp=0;f.art.draw(s,{x:0,y:0});assert.equal(f.art.waves.size,0);f.art.draw(state(1.4),{x:0,y:0});f.art.draw({time:1.5,enemies:[],monsterMechanics:{zones:[]}},{x:0,y:0});assert.equal(f.art.waves.size,0);f.art.destroy();
 const late=setup();late.art.draw(state(0),{x:0,y:0});late.art.destroy();late.load();assert.equal(late.image.refs,0);
 const failed=setup();failed.art.draw(state(0),{x:0,y:0});failed.load(Error('missing'));failed.art.draw(state(1.3),{x:0,y:0});assert.equal(failed.art.waves.size,0);
});

test('M07 cosmetic dust is a full ring contained in unchanged full-disk damage zone',()=>{
 const f=setup();const s=state(1.05,145);Object.assign(s.monsterMechanics.zones[0],{skillId:'M07',shape:'circle',innerRadius:0,expiresAt:1.2});
 f.art.draw(s,{x:0,y:0});f.load();const before=JSON.stringify(s);f.art.draw(s,{x:0,y:0});const w=f.art.waves.get('z');assert.equal(JSON.stringify(s),before);
 for(const [x,y]of w.mask.points)assert.ok(Math.hypot(x,y)<=145);assert.equal(w.strips[0].transform.height,35);assert.ok(inside(w.mask.points,70,0));assert.ok(inside(w.mask.points,-70,1));
 s.time=1.2;f.art.draw(s,{x:0,y:0});assert.equal(f.art.waves.size,0);f.art.destroy();
});
