import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';
const source=stripTypeScriptTypes(readFileSync(new URL('../cocos-pilot/assets/scripts/TowerClawSwipeArt.ts',import.meta.url),'utf8').replace(/^import .*$/gm,''),{mode:'transform'}).replace(/^export /gm,'');
class Node{constructor(){this.layer=1;this.active=true;}addChild(n){n.parent=this;}addComponent(T){return new T();}setPosition(x,y){this.position={x,y};}removeFromParent(){this.parent=null;}destroy(){this.destroyed=true;}}
class UITransform{setAnchorPoint(x,y){this.anchor={x,y};}setContentSize(w,h){this.width=w;this.height=h;}}
class Sprite{static SizeMode={CUSTOM:1};}
class SpriteFrame{destroy(){}}
class Texture2D{static Filter={LINEAR:1};setFilters(){}destroy(){}}
class ImageAsset{refs=0;addRef(){this.refs++;}decRef(){this.refs--;}}
class Color{constructor(r,g,b,a){Object.assign(this,{r,g,b,a});}}
function setup(...options){let callback;const context={Node,UITransform,Sprite,SpriteFrame,Texture2D,ImageAsset,Color,isValid:()=>true,resources:{load(p,t,c){callback=c;}}};const Art=runInNewContext(source+';TowerClawSwipeArt',context);const art=new Art(new Node(),...options);const image=new ImageAsset();return{art,image,load:(error=null)=>callback(error,image)};}
function state(time=1,mode='active'){return{time,enemies:[{id:'t',family:'tiger',hp:100,ai:{mode,until:1.18,attack:{id:'a',kind:'sweep',x:20,y:30,range:140,dirX:1,dirY:0}}}]};}
test('tiger swipe respects timing, heading, sector, pause and state ownership',()=>{
 const f=setup(),s=state(0,'windup');f.art.draw(s,{x:0,y:0});f.load();f.art.draw(s,{x:0,y:0});assert.equal(f.art.plumes.size,0);
 for(const [dx,dy] of [[1,0],[-1,0],[0,1],[.6,-.8]]){
 const s=state();Object.assign(s.enemies[0].ai.attack,{dirX:dx,dirY:dy});const before=JSON.stringify(s);f.art.draw(s,{x:10,y:15});const p=f.art.plumes.get('a');assert.equal(JSON.stringify(s),before);assert.equal(p.transform.width,105);assert.equal(p.transform.height,70);assert.equal(p.node.angle,Math.atan2(dy,dx)*180/Math.PI);assert.ok(Math.abs(p.node.position.x-(10+dx*77))<1e-8);assert.ok(Math.abs(p.node.position.y-(15+dy*77))<1e-8);
 for(const x of [.55-.375,.55+.375])for(const y of [-.25,.25]){assert.ok(Math.hypot(x,y)<1);assert.ok(Math.abs(Math.atan2(y,x)*180/Math.PI)<70);}
 const snap=JSON.stringify(p);f.art.draw(s,{x:10,y:15});assert.equal(JSON.stringify(p),snap);
 }
 f.art.draw(state(1.14),{x:0,y:0});assert.ok(f.art.plumes.get('a').sprite.color.a<140);f.art.draw(state(1.18),{x:0,y:0});assert.equal(f.art.plumes.size,0);f.art.destroy();assert.equal(f.image.refs,0);
});
test('other families, attacks, recovery, death, cancellation and late load never retain claws',()=>{
 const f=setup();f.art.draw(state(),{x:0,y:0});f.load();
 for(const change of [s=>s.enemies[0].family='rhino',s=>s.enemies[0].hp=0,s=>s.enemies[0].ai.mode='recovery',s=>s.enemies[0].ai.attack=null,s=>s.enemies[0].ai.attack.kind='charge',s=>s.enemies=[]]){f.art.draw(state(),{x:0,y:0});assert.equal(f.art.plumes.size,1);const s=state();change(s);f.art.draw(s,{x:0,y:0});assert.equal(f.art.plumes.size,0);}
 f.art.destroy();const late=setup();late.art.draw(state(),{x:0,y:0});late.art.destroy();late.load();assert.equal(late.image.refs,0);
});

test('rhino uses its own texture and contained wide impact, excluding tiger and charge',()=>{
 const f=setup('rhino','heavy-sweep',.8,.3),s=state();s.enemies[0].family='rhino';f.art.draw(s,{x:0,y:0});f.load();f.art.draw(s,{x:0,y:0});const p=f.art.plumes.get('a');assert.equal(p.transform.width,112);assert.equal(p.transform.height,42);
 for(const x of [.15,.95])for(const y of [-.15,.15])assert.ok(Math.hypot(x,y)<1);
 f.art.draw(state(),{x:0,y:0});assert.equal(f.art.plumes.size,0);
 s.enemies[0].ai.attack.kind='charge';f.art.draw(s,{x:0,y:0});assert.equal(f.art.plumes.size,0);f.art.destroy();assert.equal(f.image.refs,0);
});

test('crocodile and centipede ordinary sweep reuse physical arcs with tint, activation fade and family isolation',()=>{
 for(const [family,width,height,tint] of [
  ['crocodile',.8,.3,[185,214,179,225]],
  ['centipede',.7,.26,[223,194,142,225]]
 ]){
  const f=setup(family,'heavy-sweep',width,height,tint),s=state(0,'windup');s.enemies[0].family=family;
  f.art.draw(s,{x:0,y:0});f.load();f.art.draw(s,{x:0,y:0});assert.equal(f.art.plumes.size,0);
  s.time=1;s.enemies[0].ai.mode='active';const before=JSON.stringify(s);
  f.art.draw(s,{x:10,y:15});const p=f.art.plumes.get('a');
  assert.equal(JSON.stringify(s),before);
  assert.deepEqual([p.sprite.color.r,p.sprite.color.g,p.sprite.color.b,p.sprite.color.a],tint);
  const corners=[[-p.transform.width/2,-p.transform.height/2],[p.transform.width/2,p.transform.height/2]];
  for(const [x,y] of corners){
   const forward=p.node.position.x+10-20+x,lateral=p.node.position.y+15-30+y;
   assert.ok(Math.hypot(forward,lateral)<140);
   assert.ok(Math.abs(Math.atan2(lateral,forward))<65*Math.PI/180,'inside even the narrowest centipede sector');
  }
  s.time=1.14;f.art.draw(s,{x:10,y:15});assert.ok(p.sprite.color.a>=112&&p.sprite.color.a<=113);
  const pose=JSON.stringify(p);f.art.draw(s,{x:10,y:15});assert.equal(JSON.stringify(p),pose);
  s.enemies[0].ai.mode='recovery';f.art.draw(s,{x:0,y:0});assert.equal(f.art.plumes.size,0);
  s.enemies[0].ai.mode='active';s.enemies[0].family='tiger';f.art.draw(s,{x:0,y:0});assert.equal(f.art.plumes.size,0);
  s.enemies[0].family=family;s.enemies[0].ai.attack=null;s.enemies[0].mechanic={skillId:'M08',phase:'active'};
  f.art.draw(s,{x:0,y:0});assert.equal(f.art.plumes.size,0,'M08 has no ordinary sweep attack');
  f.art.destroy();assert.equal(f.image.refs,0);
 }
});
