import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';
const source=stripTypeScriptTypes(readFileSync(new URL('../cocos-pilot/assets/scripts/TowerPillarArt.ts',import.meta.url),'utf8').replace(/^import .*$/gm,''),{mode:'transform'}).replace(/^export /gm,'');
class Node{constructor(){this.layer=1;this.active=true;}addChild(n){n.parent=this;}addComponent(T){return new T();}setPosition(x,y){this.position={x,y};}removeFromParent(){this.parent=null;}destroy(){this.destroyed=true;}}
class UITransform{setContentSize(w,h){this.width=w;this.height=h;}}
class Sprite{static SizeMode={CUSTOM:1};}
class SpriteFrame{destroy(){}}
class Texture2D{static Filter={LINEAR:1};setFilters(){}destroy(){}}
class ImageAsset{refs=0;addRef(){this.refs++;}decRef(){this.refs--;}}
class Color{constructor(r,g,b,a){Object.assign(this,{r,g,b,a});}}
function setup(){let callback;const context={setTowerDepth:(n,y)=>{n.depth=y;},Node,UITransform,Sprite,SpriteFrame,Texture2D,ImageAsset,Color,isValid:()=>true,resources:{load(p,t,c){callback=c;}}};const Art=runInNewContext(source+';TowerPillarArt',context);const art=new Art(new Node());const image=new ImageAsset();return{art,image,load:(error=null)=>callback(error,image)};}
function state(time=1){return{time,enemies:[{id:'owner',hp:100},{id:'pillar',hp:20,x:50,y:30,radius:24,temporary:{kind:'pillar',ownerId:'owner',expiresAt:8}}]};}
test('pillar keeps its foot anchor and depth, pause is immutable, removed summons are cleaned',()=>{
 const f=setup();f.art.draw(state(),{x:10,y:20});f.load();const s=state(),before=JSON.stringify(s);f.art.draw(s,{x:10,y:20});const e=f.art.pillars.get('pillar');assert.equal(e.node.position.x,40);assert.equal(e.node.position.y-e.transform.height*240/512,10);assert.equal(e.node.depth,30);assert.equal(JSON.stringify(s),before);
 const pose=JSON.stringify(e);f.art.draw(s,{x:10,y:20});assert.equal(JSON.stringify(e),pose);
 s.enemies.pop();f.art.draw(s,{x:0,y:0});assert.equal(f.art.pillars.size,0);f.art.destroy();assert.equal(f.image.refs,0);
});
test('dead pillar, dead owner, expiry and late or failed loads do not leave ghosts',()=>{
 for(const reason of ['pillar','owner','expiry']){const f=setup();f.art.draw(state(),{x:0,y:0});f.load();f.art.draw(state(),{x:0,y:0});const s=state();if(reason==='expiry')s.time=8;else s.enemies[reason==='pillar'?1:0].hp=0;f.art.draw(s,{x:0,y:0});assert.equal(f.art.pillars.size,0);f.art.destroy();}
 const f=setup();f.art.draw(state(),{x:0,y:0});f.art.destroy();f.load();assert.equal(f.image.refs,0);
 const bad=setup();bad.art.draw(state(),{x:0,y:0});bad.load(Error('404'));bad.art.draw(state(),{x:0,y:0});assert.equal(bad.art.pillars.size,0);
});

test('M18 lock reuses pillar art and cleans up independently of an M20 pillar',()=>{
 const f=setup(),s=state();s.enemies.push({...s.enemies[1],id:'lock',x:90,temporary:{...s.enemies[1].temporary,kind:'lock'}});
 f.art.draw(s,{x:10,y:20});f.load();f.art.draw(s,{x:10,y:20});assert.equal(f.art.pillars.size,2);
 const lock=f.art.pillars.get('lock');assert.equal(lock.node.position.x,80);assert.equal(lock.node.position.y-lock.transform.height*240/512,10);
 s.enemies[2].hp=0;f.art.draw(s,{x:10,y:20});assert.equal(f.art.has('lock'),false);assert.equal(f.art.has('pillar'),true);f.art.destroy();assert.equal(f.image.refs,0);
});
