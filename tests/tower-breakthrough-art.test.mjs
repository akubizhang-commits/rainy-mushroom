import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {stripTypeScriptTypes} from 'node:module'
import {runInNewContext} from 'node:vm'
function fixture(kind='zhuji'){
 const loads=[],draws=[],textures=[],paths=[]
 class Node{
  constructor(){this.isValid=true;this.layer=1;this.components=new Map()}
  addChild(n){n.parent=this}
  addComponent(T){const c=new T();this.components.set(T,c);return c}
  getComponent(T){return this.components.get(T)}
  setPosition(){}
  removeFromParent(){}
  destroy(){this.isValid=false}
 }
 class UITransform{setContentSize(){}}
 class Sprite{static SizeMode={CUSTOM:1}}
 class ImageAsset{
  constructor(data){this.data=data;this.refs=0}
  addRef(){this.refs++}decRef(){this.refs--}destroy(){this.dead=true}
 }
 class Texture2D{
  static Filter={LINEAR:1}
  constructor(){textures.push(this);this.uploads=0}
  setFilters(){}uploadData(){this.uploads++}destroy(){this.dead=true}
 }
 class SpriteFrame{destroy(){this.dead=true}}
 const context={Node,UITransform,Sprite,ImageAsset,Texture2D,SpriteFrame,
  isValid:n=>n?.isValid,console:{warn(){}},
  // Exercise the WeChat branch, without a browser document.
  wx:{createOffscreenCanvas:()=>({getContext:()=>({})})},
  resources:{load:(p,T,cb)=>{paths.push(p);loads.push(cb)}},
  createBreakthroughPainter:()=>({draw:(t,options)=>draws.push({t,options})}),
  createJindanPainter:()=>({draw:(t,options)=>draws.push({t,options,kind:'jindan'})})}
 const src=readFileSync(new URL('../cocos-pilot/assets/scripts/TowerBreakthroughArt.ts',import.meta.url),'utf8').replace(/^import .*$/gm,'').replace('export class','class')
 runInNewContext(stripTypeScriptTypes(src,{mode:'transform'})+'\nglobalThis.Art=TowerBreakthroughArt',context)
 const art=new context.Art(kind),parent=new Node()
 const images=[]
 return {art,loads,draws,textures,parent,images,paths,
  load(){art.preload();for(const cb of loads){const image=new ImageAsset({});images.push(image);cb(null,image)}},
  draw:(t=1,success=true)=>art.draw(parent,1280,720,'ceremony',t,success,false)}
}
test('same paused time does not upload; changed outcome forces a redraw; destroy releases every reference',()=>{
 const f=fixture();f.load();assert.equal(f.draw(),true);assert.equal(f.draw(),true)
 assert.equal(f.textures[0].uploads,1)
 f.draw(1.01);assert.equal(f.textures[0].uploads,1)
 f.draw(1.05);assert.equal(f.textures[0].uploads,2)
 f.draw(1.05,false);assert.equal(f.draws.at(-1).options.success,false)
 f.art.destroy();assert.equal(f.textures[0].dead,true);assert.ok(f.images.every(i=>i.refs===0))
})
test('late resources after destruction cannot retain references or create textures',()=>{
 const f=fixture();f.art.preload();f.art.destroy();f.load()
 assert.ok(f.images.every(i=>i.refs===0));assert.equal(f.draw(),false);assert.equal(f.textures.length,0)
})
test('missing optional art preserves fallback and releases prior successful loads',()=>{
 const f=fixture();f.art.preload();f.loads[0](null,{data:{},addRef(){},decRef(){this.released=true}})
 f.loads[1](Error('missing'),null);assert.equal(f.draw(),false);assert.equal(f.textures.length,0)
})
test('rebinding a replaced scene reuses the texture without keeping an old actor',()=>{
 const f=fixture();f.load();f.draw();f.art.clearBindings();f.draw()
 assert.equal(f.textures.length,1);assert.equal(f.textures[0].uploads,2)
})
test('golden core has separate textures and painter, keeps final core on success, and hides effects on failure results',()=>{
 const f=fixture('jindan');f.load();f.draw()
 assert.deepEqual(f.paths,['tower-breakthrough/seated','tower-breakthrough/jindan-dao','tower-breakthrough/jindan-core'])
 assert.equal(f.draws.at(-1).kind,'jindan')
 f.art.draw(f.parent,1280,720,'success',0,true,false)
 assert.equal(f.draws.at(-1).options.effects,true);assert.equal(f.draws.at(-1).t,4)
 f.art.draw(f.parent,1280,720,'failure',0,false,false)
 assert.equal(f.draws.at(-1).options.effects,false);assert.equal(f.draws.at(-1).options.success,false)
 f.art.destroy();assert.ok(f.images.every(i=>i.refs===0))
})
