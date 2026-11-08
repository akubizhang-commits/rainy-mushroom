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
test('breath follows authored activation, impact anchor, fade, pause and expiry',()=>{
 const f=setup();f.art.draw(state(0),{x:0,y:0});f.load();f.art.draw(state(1.2),{x:0,y:0});assert.equal(f.art.plumes.size,0);
 const s=state(1.3),before=JSON.stringify(s);f.art.draw(s,{x:10,y:20});const w=f.art.plumes.get('z');assert.equal(JSON.stringify(s),before);assert.equal(w.node.position.x,40);assert.equal(w.node.position.y,-20);assert.equal(w.transform.height,55*768/480);assert.equal(w.transform.anchor.x,16/512);assert.equal(w.node.angle,90);assert.equal(w.sprite.color.a,215);
 const paused=JSON.stringify([w.node.position,w.transform,w.sprite.color]);f.art.draw(s,{x:10,y:20});assert.equal(JSON.stringify([w.node.position,w.transform,w.sprite.color]),paused);
 f.art.draw(state(4.15),{x:0,y:0});assert.ok(w.sprite.color.a>120&&w.sprite.color.a<135);
 f.art.draw(state(4.3),{x:0,y:0});assert.equal(f.art.plumes.size,0);f.art.destroy();assert.equal(f.image.refs,0);
});

test('mouth landmarks follow both snake forms, mirror, scale and actor visibility',()=>{
 const actorSource=stripTypeScriptTypes(readFileSync(new URL('../cocos-pilot/assets/scripts/TowerMonsterArt.ts',import.meta.url),'utf8').replace(/^import .*$/gm,''),{mode:'transform'}).replace(/^export /gm,'');
 const Art=runInNewContext(actorSource+';TowerMonsterArt',{});
 const art=new Art();
 for(const [family,u,v,anchorY] of [['snake-lady',.426,.258,.1],['snake',.19,.32,.5]]){
  for(const scaleX of [-1,1]) {
   const actor={family,seen:true,node:{position:{x:35,y:-20},scale:{x:scaleX,y:1.2}},transform:{anchorX:.5,anchorY,width:220,height:220}};
   art.actors.set('snake',actor);
   const mouth=art.mouthPosition('snake');
   assert.ok(Math.abs(mouth.x-(35+(u-.5)*220*scaleX))<1e-8);
   assert.ok(Math.abs(mouth.y-(-20+(1-v-anchorY)*220*1.2))<1e-8);
   actor.seen=false;assert.equal(art.mouthPosition('snake'),null);
   actor.seen=true;actor.diedAt=0;assert.equal(art.mouthPosition('snake'),null);
  }
 }
 assert.equal(art.mouthPosition('missing'),null);
});
test('owner death, cancelled zones and destroyed view cannot leave plumes or late resources',()=>{
 const f=setup();f.art.draw(state(0),{x:0,y:0});f.load();f.art.draw(state(1.4),{x:0,y:0});const s=state(1.5);s.enemies[0].hp=0;f.art.draw(s,{x:0,y:0});assert.equal(f.art.plumes.size,0);f.art.destroy();
 const late=setup();late.art.draw(state(0),{x:0,y:0});late.art.destroy();late.load();assert.equal(late.image.refs,0);
 const failed=setup();failed.art.draw(state(0),{x:0,y:0});failed.load(Error('missing'));failed.art.draw(state(1.3),{x:0,y:0});assert.equal(failed.art.plumes.size,0);
});

test('mouth jet follows rendered landmark and current sweep while ground cloud stays in original hazard',()=>{
 const f=setup(),s=state(1.5),camera={x:10,y:20},mouth={x:100,y:130};f.art.draw(s,camera,()=>mouth);f.load();const before=JSON.stringify(s);f.art.draw(s,camera,()=>mouth);
 const p=f.art.plumes.get('z'),z=s.monsterMechanics.zones[0];assert.ok(p.jet);assert.equal(p.jet.node.position.x,100);assert.equal(p.jet.node.position.y,130);assert.equal(JSON.stringify(s),before);
 const end={x:z.x+z.faceX*z.radius*.55-camera.x,y:z.y+z.faceY*z.radius*.55-camera.y};assert.ok(Math.abs(p.jet.transform.width*480/512-Math.hypot(end.x-mouth.x,end.y-mouth.y))<1e-8);
 assert.equal(p.transform.height,z.radius*.7*768/480);const pose=JSON.stringify(p.jet);f.art.draw(s,camera,()=>mouth);assert.equal(JSON.stringify(p.jet),pose);
 f.art.draw(s,camera,()=>({x:120,y:140}));assert.equal(p.jet.node.position.x,120);
 f.art.draw(s,camera,()=>null);assert.equal(p.jet.node.active,false);const node=p.jet.node;s.enemies[0].hp=0;f.art.draw(s,camera,()=>mouth);assert.ok(node.destroyed);assert.equal(f.art.plumes.size,0);f.art.destroy();
});
