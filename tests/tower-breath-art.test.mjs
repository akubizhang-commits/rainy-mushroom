import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';
const source=stripTypeScriptTypes(readFileSync(new URL('../cocos-pilot/assets/scripts/TowerBreathArt.ts',import.meta.url),'utf8').replace(/^import .*$/gm,''),{mode:'transform'}).replace(/^export /gm,'');
class Node{constructor(){this.layer=1;this.active=true;}addChild(n){n.parent=this;}addComponent(T){return new T();}setPosition(x,y){this.position={x,y};}removeFromParent(){this.parent=null;}destroy(){this.destroyed=true;}}
class UITransform{setAnchorPoint(x,y){this.anchor={x,y};}setContentSize(w,h){this.width=w;this.height=h;}}
class Sprite{static SizeMode={CUSTOM:1};}
class SpriteFrame{destroy(){}}
class Texture2D{static Filter={LINEAR:1};setFilters(){}destroy(){}}
class ImageAsset{refs=0;addRef(){this.refs++;}decRef(){this.refs--;}}
class Color{constructor(r,g,b,a){Object.assign(this,{r,g,b,a});}}
function setup(){let callback;const context={Node,UITransform,Sprite,SpriteFrame,Texture2D,ImageAsset,Color,isValid:()=>true,resources:{load(p,t,c){callback=c;}}};const Art=runInNewContext(source+';TowerBreathArt',context);const art=new Art(new Node());const image=new ImageAsset();return{art,image,load:(error=null)=>callback(error,image)};}
function state(time){return{time,enemies:[{id:'spider',hp:20,x:-150,y:0}],monsterMechanics:{zones:[{id:'z',ownerId:'spider',skillId:'M16',x:50,y:0,radius:55,faceX:0,faceY:1,startedAt:0,activatesAt:1.3,expiresAt:4.3}]}};}
test('lightning follows authored activation, impact anchor, fade, pause and expiry',()=>{
 const f=setup();f.art.draw(state(0),{x:0,y:0});f.load();f.art.draw(state(1.2),{x:0,y:0});assert.equal(f.art.plumes.size,0);
 const s=state(1.3),before=JSON.stringify(s);f.art.draw(s,{x:10,y:20});const w=f.art.plumes.get('z');assert.equal(JSON.stringify(s),before);assert.equal(w.node.position.x,40);assert.equal(w.node.position.y,-20);assert.equal(w.transform.height,55*768/480);assert.equal(w.transform.anchor.x,16/512);assert.equal(w.node.angle,90);assert.equal(w.sprite.color.a,215);
 const paused=JSON.stringify([w.node.position,w.transform,w.sprite.color]);f.art.draw(s,{x:10,y:20});assert.equal(JSON.stringify([w.node.position,w.transform,w.sprite.color]),paused);
 f.art.draw(state(4.15),{x:0,y:0});assert.ok(w.sprite.color.a>120&&w.sprite.color.a<135);
 f.art.draw(state(4.3),{x:0,y:0});assert.equal(f.art.plumes.size,0);f.art.destroy();assert.equal(f.image.refs,0);
});
test('owner death, cancelled zones and destroyed view cannot leave plumes or late resources',()=>{
 const f=setup();f.art.draw(state(0),{x:0,y:0});f.load();f.art.draw(state(1.4),{x:0,y:0});const s=state(1.5);s.enemies[0].hp=0;f.art.draw(s,{x:0,y:0});assert.equal(f.art.plumes.size,0);f.art.destroy();
 const late=setup();late.art.draw(state(0),{x:0,y:0});late.art.destroy();late.load();assert.equal(late.image.refs,0);
 const failed=setup();failed.art.draw(state(0),{x:0,y:0});failed.load(Error('missing'));failed.art.draw(state(1.3),{x:0,y:0});assert.equal(failed.art.plumes.size,0);
});
