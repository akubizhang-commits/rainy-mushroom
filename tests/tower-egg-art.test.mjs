import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';
const source=stripTypeScriptTypes(readFileSync(new URL('../cocos-pilot/assets/scripts/TowerEggArt.ts',import.meta.url),'utf8').replace(/^import .*$/gm,''),{mode:'transform'}).replace(/^export /gm,'');
class Node{constructor(){this.layer=1;this.active=true;}addChild(n){n.parent=this;}addComponent(T){return new T();}setPosition(x,y){this.position={x,y};}removeFromParent(){this.parent=null;}destroy(){this.destroyed=true;}}
class UITransform{setContentSize(w,h){this.width=w;this.height=h;}}
class Sprite{static SizeMode={CUSTOM:1};}
class SpriteFrame{destroy(){}}
class Texture2D{static Filter={LINEAR:1};setFilters(){}destroy(){}}
class ImageAsset{refs=0;addRef(){this.refs++;}decRef(){this.refs--;}}
class Color{constructor(r,g,b,a){Object.assign(this,{r,g,b,a});}}
function setup(hatched=false){let callback;const context={setTowerDepth:(n,y)=>{n.depth=y;},Node,UITransform,Sprite,SpriteFrame,Texture2D,ImageAsset,Color,isValid:()=>true,resources:{load(p,t,c){callback=c;}}};const Art=runInNewContext(source+';TowerEggArt',context);const art=new Art(new Node(),hatched);const image=new ImageAsset();return{art,image,load:(error=null)=>callback(error,image)};}
function state(time=1){return{time,enemies:[{id:'owner',hp:100},{id:'egg',hp:20,x:50,y:30,radius:24,temporary:{kind:'egg',ownerId:'owner',expiresAt:8}}]};}
test('egg keeps its foot anchor and depth, pause is immutable, removed summons are cleaned',()=>{
 const f=setup();f.art.draw(state(),{x:10,y:20});f.load();const s=state(),before=JSON.stringify(s);f.art.draw(s,{x:10,y:20});const e=f.art.eggs.get('egg');assert.equal(e.node.position.x,40);assert.equal(e.node.position.y-e.transform.height*240/512,10);assert.equal(e.node.depth,30);assert.equal(JSON.stringify(s),before);
 const pose=JSON.stringify(e);f.art.draw(s,{x:10,y:20});assert.equal(JSON.stringify(e),pose);
 s.enemies.pop();f.art.draw(s,{x:0,y:0});assert.equal(f.art.eggs.size,0);f.art.destroy();assert.equal(f.image.refs,0);
});
test('dead egg, dead owner, expiry and late or failed loads do not leave ghosts',()=>{
 for(const reason of ['egg','owner','expiry']){const f=setup();f.art.draw(state(),{x:0,y:0});f.load();f.art.draw(state(),{x:0,y:0});const s=state();if(reason==='expiry')s.time=8;else s.enemies[reason==='egg'?1:0].hp=0;f.art.draw(s,{x:0,y:0});assert.equal(f.art.eggs.size,0);f.art.destroy();}
 const f=setup();f.art.draw(state(),{x:0,y:0});f.art.destroy();f.load();assert.equal(f.image.refs,0);
 const bad=setup();bad.art.draw(state(),{x:0,y:0});bad.load(Error('404'));bad.art.draw(state(),{x:0,y:0});assert.equal(bad.art.eggs.size,0);
});

test('hatched shell needs explicit successful hatch event, keeps feet, fades and clears',()=>{
 const f=setup(true),s=state();f.art.draw(s,{x:0,y:0});f.load();f.art.draw(s,{x:0,y:0});assert.equal(f.art.eggs.size,0);
 s.enemies.pop();s.effects=[{id:'h',kind:'monster_egg_hatched',ownerId:'owner',x:50,y:30,radius:24,startedAt:1,expiresAt:2.2}];
 f.art.draw(s,{x:10,y:20});const p=f.art.eggs.get('h');assert.equal(p.node.position.y-p.transform.height*240/512,10);const snapshot=JSON.stringify(p);f.art.draw(s,{x:10,y:20});assert.equal(JSON.stringify(p),snapshot);
 s.time=2;f.art.draw(s,{x:0,y:0});assert.ok(p.sprite.color.a<110);s.enemies[0].hp=0;f.art.draw(s,{x:0,y:0});assert.equal(f.art.eggs.size,0);
 s.enemies[0].hp=100;s.time=2.2;f.art.draw(s,{x:0,y:0});assert.equal(f.art.eggs.size,0);f.art.destroy();assert.equal(f.image.refs,0);
});
