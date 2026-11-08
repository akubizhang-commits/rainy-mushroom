import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';
class Node {
 children=[];layer=1;isValid=true;active=true;components=new Map();
 constructor(name){this.name=name;}
 addChild(n){n.parent=this;this.children.push(n);}
 addComponent(T){const c=new T();this.components.set(T,c);return c;}
 getComponent(T){return this.components.get(T);}
 setPosition(x,y){this.position={x,y};}
 removeFromParent(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);this.parent=null;}
 destroy(){this.isValid=false;for(const n of this.children)n.destroy();}
}
class UITransform {width=220;height=220;anchorX=.5;anchorY=.1;setContentSize(width,height){Object.assign(this,{width,height});}}
class Sprite {static SizeMode={CUSTOM:1};}
class SpriteFrame {destroy(){}}
class Texture2D {static Filter={LINEAR:1};setFilters(){}destroy(){}}
class ImageAsset {refs=0;addRef(){this.refs++;}decRef(){this.refs--;}}
class Color {constructor(r,g,b,a){Object.assign(this,{r,g,b,a});}}
function setup(){
 const path=new URL('../cocos-pilot/assets/scripts/TowerArmorArt.ts',import.meta.url);
 assert.ok(existsSync(path),'M04 needs an actor-bound armor renderer');
 const src=stripTypeScriptTypes(readFileSync(path,'utf8').replace(/^import .*$/gm,''),{mode:'transform'}).replace(/^export /gm,'');
 let callback;
 const Art=runInNewContext(src+';TowerArmorArt',{Node,UITransform,Sprite,SpriteFrame,Texture2D,ImageAsset,Color,isValid:n=>n?.isValid,resources:{load(p,t,c){callback=c;}}});
 const parent=new Node('actors'),body=new Node('妖兽素材-bear');body.addComponent(UITransform);parent.addChild(body);
 const image=new ImageAsset(),art=new Art(parent);
 const state={time:3,enemies:[{id:'bear',archetype:'bear_boss',hp:100,mechanic:{skillId:'M04',batch:1,armor:.8,armorUntil:10}},
  ...['a','b'].map(id=>({id,hp:10,temporary:{kind:'crystal',ownerId:'bear',batch:1,expiresAt:10}}))],
  monsterMechanics:{summons:['a','b'].map((id,i)=>({id,ownerId:'bear',kind:'crystal',batch:1,sequence:i+1}))}};
 return {art,body,parent,state,image,load:error=>callback(error,image)};
}
test('each living crystal owns a stable body armor group; first break preserves the other and never mutates combat',()=>{
 const f=setup();f.art.draw(f.state);f.load();const before=JSON.stringify(f.state);f.art.draw(f.state);
 assert.equal(f.body.children.length,2);assert.equal(JSON.stringify(f.state),before);
 const [a,b]=f.body.children;assert.ok(a.children.length>0);assert.ok(b.children.length>0);
 const pose=JSON.stringify(b.children.map(n=>n.position));
 f.state.enemies[1].hp=0;f.art.draw(f.state);
 assert.equal(f.body.children.length,1);assert.equal(f.body.children[0],b);assert.equal(JSON.stringify(b.children.map(n=>n.position)),pose);
 assert.equal(f.state.enemies[0].mechanic.armor,.8);
 f.art.draw(f.state);assert.equal(f.body.children[0],b,'pause reuses unchanged armor');
 f.state.enemies[2].hp=0;f.state.enemies[0].mechanic.armor=0;f.art.draw(f.state);assert.equal(f.body.children.length,0);
 f.art.destroy();assert.equal(f.image.refs,0);
});
test('receipt mapping survives reloading after first break and does not attach a previous batch',()=>{
 const f=setup();f.state.enemies[1].hp=0;f.art.draw(f.state);f.load();f.art.draw(f.state);
 const one=f.body.children[0],right=one.children[0].position.x;assert.ok(right>0);
 f.state.enemies[2].temporary.batch=0;f.art.draw(f.state);assert.equal(f.body.children.length,0);
 f.art.destroy();
});
test('windup, ended armor, owner death, expiry and invisible body cannot retain armor',()=>{
 for(const mutate of [
  f=>{f.state.enemies[0].mechanic.armor=0;},
  f=>{f.state.time=10;},
  f=>{f.state.enemies[0].hp=0;},
  f=>{f.body.active=false;},
  f=>{f.state.enemies[0].archetype='rhino_boss';},
  f=>{f.state.enemies.slice(1).forEach(c=>c.temporary.expiresAt=3);}
 ]){
  const f=setup();f.art.draw(f.state);f.load();f.art.draw(f.state);assert.equal(f.body.children.length,2);
  mutate(f);f.art.draw(f.state);assert.equal(f.body.children.length,0);f.art.destroy();
 }
 const f=setup();f.state.enemies[0].mechanic.armor=0;f.art.draw(f.state);assert.equal(f.body.children.length,0);f.art.destroy();
});
test('failed and late texture loads do not leak resources or retain armor on replaced actors',()=>{
 const f=setup();f.art.draw(f.state);f.art.destroy();f.load();assert.equal(f.image.refs,0);
 const g=setup();g.art.draw(g.state);g.load(Error('missing'));g.art.draw(g.state);assert.equal(g.body.children.length,0);g.art.destroy();
 const h=setup();h.art.draw(h.state);h.load();h.art.draw(h.state);h.body.destroy();h.body.removeFromParent();
 const replacement=new Node('妖兽素材-bear');replacement.addComponent(UITransform);h.parent.addChild(replacement);
 h.art.draw(h.state);assert.equal(replacement.children.length,2);h.art.destroy();assert.equal(replacement.children.length,0);
});
