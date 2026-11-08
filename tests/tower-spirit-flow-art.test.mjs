import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';
const source=stripTypeScriptTypes(readFileSync(new URL('../cocos-pilot/assets/scripts/TowerSpiritFlowArt.ts',import.meta.url),'utf8').replace(/^import .*$/gm,''),{mode:'transform'}).replace(/^export /gm,'');
class Node{constructor(){this.layer=1;this.active=true;}addChild(n){n.parent=this;}addComponent(T){return new T();}setPosition(x,y){this.position={x,y};}removeFromParent(){this.parent=null;}destroy(){this.destroyed=true;}}
class UITransform{setAnchorPoint(x,y){this.anchor={x,y};}setContentSize(w,h){this.width=w;this.height=h;}}
class Sprite{static SizeMode={CUSTOM:1};}
class SpriteFrame{destroy(){}}
class Texture2D{static Filter={LINEAR:1};setFilters(){}destroy(){}}
class ImageAsset{refs=0;addRef(){this.refs++;}decRef(){this.refs--;}}
class Color{constructor(r,g,b,a){Object.assign(this,{r,g,b,a});}}
function setup(){let callback;const context={Node,UITransform,Sprite,SpriteFrame,Texture2D,ImageAsset,Color,isValid:()=>true,resources:{load(p,t,c){callback=c;}}};const Art=runInNewContext(source+';TowerSpiritFlowArt',context);const art=new Art(new Node());const image=new ImageAsset();return{art,image,load:(error=null)=>callback(error,image)};}
function state(){return{time:2,enemies:[{id:'o',hp:50,maxHp:100,x:200,y:0,radius:40,mechanic:{skillId:'M03',phase:'active',startedAt:0,until:6,healRemaining:10}},{id:'c',hp:10,x:0,y:0,radius:24,temporary:{kind:'core',ownerId:'o',expiresAt:6}}]};}
test('flow connects live core to caster with simulation-time pulse and no mutations',()=>{const f=setup(),s=state();f.art.draw(s,{x:0,y:0});f.load();const before=JSON.stringify(s);f.art.draw(s,{x:10,y:20});const p=f.art.plumes.get('c');assert.equal(p.node.position.x,-10);assert.equal(p.node.position.y,8);assert.equal(p.transform.width,Math.hypot(200,20));assert.equal(JSON.stringify(s),before);const pose=JSON.stringify(p);f.art.draw(s,{x:10,y:20});assert.equal(JSON.stringify(p),pose);f.art.destroy();assert.equal(f.image.refs,0);});
test('death, break, end, recovery and exhausted/full healing stop flow',()=>{const f=setup();f.art.draw(state(),{x:0,y:0});f.load();for(const change of [s=>s.enemies[0].hp=0,s=>s.enemies[1].hp=0,s=>s.time=6,s=>s.enemies[0].mechanic.phase='recovery',s=>s.enemies[0].mechanic.healRemaining=0,s=>s.enemies[0].hp=100]){f.art.draw(state(),{x:0,y:0});assert.equal(f.art.plumes.size,1);const s=state();change(s);f.art.draw(s,{x:0,y:0});assert.equal(f.art.plumes.size,0);}f.art.destroy();const late=setup();late.art.draw(state(),{x:0,y:0});late.art.destroy();late.load();assert.equal(late.image.refs,0);});
test('healing stream ends at the rendered torso rather than collision-radius height',()=>{
 const f=setup(),s=state();f.art.draw(s,{x:10,y:20});f.load();
 const before=JSON.stringify(s);f.art.draw(s,{x:10,y:20},()=>({x:190,y:150}));
 const p=f.art.plumes.get('c'),angle=p.node.angle*Math.PI/180;
 assert.ok(Math.abs(p.node.position.x+Math.cos(angle)*p.transform.width-190)<1e-8);
 assert.ok(Math.abs(p.node.position.y+Math.sin(angle)*p.transform.width-150)<1e-8);
 assert.equal(JSON.stringify(s),before);
});
