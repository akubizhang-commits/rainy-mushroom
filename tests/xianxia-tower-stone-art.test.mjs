import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { runInNewContext } from 'node:vm'
const source=stripTypeScriptTypes(readFileSync(new URL('../cocos-pilot/assets/scripts/TowerStoneArt.ts',import.meta.url),'utf8').replace(/^import .*$/gm,''),{mode:'transform'}).replace(/^export /gm,'')
function fixture({sync=false,fail=false,textureFail=false}={}){
 const loads=[],images=[],frames=[],textures=[]
 class Node{
  constructor(name){Object.assign(this,{name,children:[],components:new Map(),valid:true,layer:1})}
  addChild(n){this.children.push(n);n.parent=this}
  addComponent(C){const c=new C();c.node=this;this.components.set(C,c);return c}
  getComponent(C){return this.components.get(C)}
  setPosition(x,y){this.position=[x,y]}
  removeFromParent(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);this.parent=null}
  destroy(){this.valid=false;for(const n of this.children)n.destroy()}
 }
 class UITransform{setContentSize(w,h){this.size=[w,h]}}
 class Sprite{static SizeMode={CUSTOM:0}}
 class ImageAsset{
  constructor(w=128,h=128){this.width=w;this.height=h;this.refs=0;images.push(this)}
  addRef(){this.refs++} decRef(){this.refs--}
 }
 class Texture2D{
  static Filter={LINEAR:1}
  constructor(){this.destroyed=0;textures.push(this)}
  setFilters(){if(textureFail)throw Error('texture')}
  destroy(){this.destroyed++}
 }
 class SpriteFrame{constructor(){this.destroyed=0;frames.push(this)}destroy(){this.destroyed++}}
 const resources={load(path,C,done){loads.push({path,done});if(fail)throw Error('load');if(sync)done(null,new ImageAsset())}}
 const Art=runInNewContext(source+'\nTowerStoneArt',{Node,UITransform,Sprite,ImageAsset,Texture2D,SpriteFrame,resources,isValid:n=>!!n&&(n.node||n).valid!==false})
 return {art:new Art(),parent:new Node('parent'),loads,images,textures,frames,ImageAsset,Sprite}
}
test('four denominations load once, reuse nodes and preserve scale without mutating caller data',()=>{
 const f=fixture();const expected=['low','mid','high','top']
 for(let grade=0;grade<4;grade++){
  assert.equal(f.art.draw(f.parent,'drop'+grade,grade,12,18,32),false)
  assert.equal(f.loads[grade].path,'tower-stones/stone_'+expected[grade])
  f.loads[grade].done(null,new f.ImageAsset())
 }
 const first=[...f.parent.children]
 for(let i=0;i<100;i++){f.art.beginFrame();for(let g=0;g<4;g++)assert.equal(f.art.draw(f.parent,'drop'+g,g,i,0,32),true);f.art.endFrame()}
 assert.equal(f.loads.length,4);assert.deepEqual(f.parent.children,first)
 assert.ok(first.every(n=>n.active));assert.deepEqual(first[0].position,[99,0])
 f.art.beginFrame();f.art.draw(f.parent,'drop0',0,0,0,32);f.art.endFrame()
 assert.equal(f.parent.children.length,1)
 f.art.destroy();f.art.destroy();assert.ok(f.images.every(i=>i.refs===0));assert.ok(f.frames.every(i=>i.destroyed===1));assert.ok(f.textures.every(i=>i.destroyed===1))
})
test('cleared and destroyed bindings ignore late callbacks; completed cache survives redraw',()=>{
 const f=fixture();let calls=0
 f.art.draw(f.parent,'wallet',1,0,0,36,()=>calls++)
 f.art.clearBindings();f.loads[0].done(null,new f.ImageAsset())
 assert.equal(calls,0);assert.equal(f.parent.children.length,0)
 assert.equal(f.art.draw(f.parent,'wallet',1,0,0,36,()=>calls++),true)
 assert.equal(calls,1);assert.equal(f.loads.length,1)
 f.art.draw(f.parent,'late',2,0,0,36,()=>calls++)
 f.art.destroy();const img=new f.ImageAsset();f.loads[1].done(null,img)
 assert.equal(img.refs,0);assert.equal(calls,1)
})
test('synchronous loading clears fallback exactly once; invalid assets and failures keep fallback',()=>{
 const f=fixture({sync:true});let ready=0
 assert.equal(f.art.draw(f.parent,'wallet',3,0,0,36,()=>ready++),true)
 f.art.draw(f.parent,'wallet',3,0,0,36);assert.equal(ready,1)
 for(const options of [{fail:true},{sync:true,textureFail:true},{}]){
  const x=fixture(options);let called=false
  assert.equal(x.art.draw(x.parent,'bad',0,0,0,32,()=>called=true),false)
  if(!options.fail&&!options.sync)x.loads[0].done(null,new x.ImageAsset(256,256))
  for(let i=0;i<5;i++)assert.equal(x.art.draw(x.parent,'bad',0,0,0,32),false)
  assert.equal(called,false);assert.equal(x.loads.length,1);assert.equal(x.parent.children[0].active,false)
  x.art.destroy();assert.ok(x.images.every(i=>i.refs===0))
 }
})
test('grade changes reuse the right texture; invalid grade or coordinates cannot request assets',()=>{
 const f=fixture({sync:true})
 f.art.draw(f.parent,'wallet',0,0,0,32)
 const old=f.parent.children[0]
 f.art.draw(f.parent,'wallet',3,0,0,32)
 assert.equal(old.valid,false);assert.equal(f.parent.children.length,1);assert.equal(f.loads.length,2)
 for(const g of [-1,4,NaN,.5])assert.equal(f.art.draw(f.parent,'bad',g,0,0,32),false)
 assert.equal(f.art.draw(f.parent,'bad',0,NaN,0,32),false);assert.equal(f.loads.length,2)
})

test('approved contribution, cultivation, skill-point and book resources use the same safe cache without allowing arbitrary paths',()=>{
 const f=fixture();const names=['resource_contribution','resource_xp_essence','resource_skill_point','resource_skill_book','pill_huichun','pill_peiyuan','drop_heal','ui_bag','ui_skills','ui_settings'];let ready=0
 for(const name of names){
  assert.equal(f.art.drawResource(f.parent,name,name,0,0,32,()=>ready++),false)
  assert.equal(f.loads.at(-1).path,'tower-stones/'+name)
  f.loads.at(-1).done(null,new f.ImageAsset())
  assert.equal(f.art.drawResource(f.parent,name,name,0,0,32),true)
 }
 assert.equal(ready,10);assert.equal(f.loads.length,10)
 assert.equal(f.art.drawResource(f.parent,'invalid','../bad',0,0,32),false)
 assert.equal(f.art.drawResource(f.parent,'wrong','stone_low',0,0,32),false)
 assert.equal(f.loads.length,10);f.art.destroy();assert.ok(f.images.every(i=>i.refs===0))
})
