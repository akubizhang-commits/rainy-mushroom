import test from 'node:test'
import assert from 'node:assert/strict'
import {existsSync,readFileSync} from 'node:fs'
import {stripTypeScriptTypes} from 'node:module'
import {runInNewContext} from 'node:vm'

function fixture() {
 const file=new URL('../cocos-pilot/assets/scripts/SwordLineArt.ts',import.meta.url)
 assert.ok(existsSync(file),'the approved straight sword effect has a runtime renderer')
 const pending=[],requested=[],warnings=[]
 class Node {
  constructor(name){this.name=name;this.isValid=true;this.children=[];this.components=[];this.layer=1}
  addChild(n){this.children.push(n);n.parent=this}
  addComponent(C){const c=new C();this.components.push(c);return c}
  setPosition(x,y){this.x=x;this.y=y}
  destroy(){this.isValid=false}
  removeFromParent(){this.parent.children=this.parent.children.filter(n=>n!==this);this.parent=null}
 }
 class UITransform {setContentSize(w,h){this.width=w;this.height=h} setAnchorPoint(x,y){this.anchorX=x;this.anchorY=y}}
 class Sprite {
  static SizeMode={CUSTOM:1};static Type={FILLED:1};static FillType={HORIZONTAL:0}
  set fillStart(v){assert.ok(this.spriteFrame,'Cocos fill setters require a bound frame');this._fillStart=v}
  set fillRange(v){assert.ok(this.spriteFrame,'Cocos fill setters require a bound frame');this._fillRange=v}
  get fillRange(){return this._fillRange}
 }
 class Texture2D {static Filter={LINEAR:1};setFilters(){};destroy(){this.dead=true}}
 class SpriteFrame {destroy(){this.dead=true}}
 class Color {constructor(r,g,b,a){Object.assign(this,{r,g,b,a})}}
 class Rect {constructor(x,y,w,h){Object.assign(this,{x,y,width:w,height:h})}}
 class Size {constructor(w,h){Object.assign(this,{width:w,height:h})}}
 class Graphics {constructor(){this.strokes=[];this.fills=[]} clear(){this.strokes=[];this.fills=[]} moveTo(x,y){this.from=[x,y]} lineTo(x,y){this.to=[x,y]} close(){} fill(){this.fills.push([this.from,this.to,this.fillColor])} stroke(){this.strokes.push([this.from,this.to,this.strokeColor])}}
 const context={Node,UITransform,Sprite,Texture2D,SpriteFrame,Color,Rect,Size,
  Graphics,
  ImageAsset:class{},isValid:n=>!!n?.isValid,resources:{load:(...a)=>{requested.push(a[0]);pending.push(a.at(-1))}},
  console:{warn:message=>warnings.push(message)}}
 const source=readFileSync(file,'utf8').replace(/^import .*$/gm,'').replace(/\bexport /g,'')
 runInNewContext(stripTypeScriptTypes(source,{mode:'transform'})+'\nglobalThis.Art=SwordLineArt',context)
 const art=new context.Art(),parent=new Node('fx')
 const image={width:1376,height:320,refs:0,addRef(){this.refs++},decRef(){this.refs--}}
 const riftImage={width:816,height:344,refs:0,addRef(){this.refs++},decRef(){this.refs--}}
 return {art,parent,pending,requested,image,riftImage,warnings,Node,load(error=null,value=image,riftError=null){pending.shift()(error,value);pending.shift()?.(riftError,riftError?null:riftImage)}}
}
const camera={x:0,y:0}
const effect={id:'line-1',kind:'line',source:'sj_line',shape:'line',x:10,y:20,toX:906,toY:20,width:72,startedAt:0,expiresAt:.25}

test('loads the existing sword and reference-derived rift; retired ground qi is never requested',()=>{
 const f=fixture();f.art.preload();f.load()
 assert.deepEqual(f.requested,['tower-skill-fx/line-sunlight-sword-blue-v3','tower-skill-fx/line-rift-reference-v1'])
 f.art.syncTower(f.parent,[effect],.1,camera)
 const a=f.art.actors.get(effect.id)
 assert.equal(a.sprite,undefined);assert.ok(a.sword.node.active)
})

test('flight exits the viewport with an opaque complete blade in every direction',()=>{
 const f=fixture();f.art.preload();f.load()
 for(const [dx,dy] of [[360,0],[0,360],[-360,0],[0,-360],[30,40]]){
  f.art.reset();const e={...effect,toX:10+dx,toY:20+dy},length=Math.hypot(dx,dy)
  let previous=-Infinity
  for(const age of [0,.05,.1,.16,.22,.38,.55,.62]){
   f.art.syncTower(f.parent,age<.25?[e]:[],age,camera,82)
   const a=f.art.actors.get(e.id),s=a.sword,angle=a.node.angle*Math.PI/180
   assert.ok(Math.abs(s.node.y-82*Math.cos(angle))<1e-6)
   const axial=s.node.x-82*Math.sin(angle),half=s.ui.width*626/1376
   assert.ok(axial-half>=-1e-6)
   if(age===.62){
    const tail=axial-half
    assert.ok(Math.abs(10+dx/length*tail)>640||Math.abs(20+82+dy/length*tail)>360,'entire sword exits screen')
   }
   assert.ok(axial>=previous-1e-6);previous=axial
   if(age===.38)assert.equal(s.sprite.color.a,255)
   assert.equal(s.sprite.color.a,255)
  }
  f.art.syncTower(f.parent,[],.72,camera);assert.equal(f.art.actors.get(e.id).sword.node.active,false)
  f.art.syncTower(f.parent,[],1.82,camera);assert.equal(f.art.actors.size,0)
 }
})

test('fracture follows passage, survives blade fade, and pause rebuild is deterministic',()=>{
 const f=fixture();f.art.preload();f.load()
 const e={...effect,toX:370,pulseIndex:1}
 f.art.syncTower(f.parent,[e],.02,camera,82)
 assert.equal(f.art.actors.get(e.id).rift.node.active,false)
 f.art.syncTower(f.parent,[],.15,camera,82)
 const a=f.art.actors.get(e.id)
 assert.ok(a.rift.node.active);assert.ok(a.rift.ui.width>0&&a.rift.ui.width<f.art.tracks.get(e.id).visualLength-22)
 const trace=JSON.stringify([a.rift.sprite.fillRange,a.rift.sprite.color,a.rift.ui.width,a.rift.ui.height]),x=a.sword.node.x
 f.art.clearBindings();f.art.syncTower(f.parent,[],.15,camera,999)
 const rebuilt=f.art.actors.get(e.id)
 assert.equal(JSON.stringify([rebuilt.rift.sprite.fillRange,rebuilt.rift.sprite.color,rebuilt.rift.ui.width,rebuilt.rift.ui.height]),trace)
 assert.equal(rebuilt.sword.node.x,x);assert.equal(rebuilt.sword.node.y,82)
 f.art.syncTower(f.parent,[],.78,camera)
 assert.ok(rebuilt.rift.node.active);assert.equal(rebuilt.sword.node.active,false)
})

test('three real pulses retain their receipts but make only one sword and one fracture',()=>{
 const f=fixture();f.art.preload();f.load()
 const events=[1,2,3].map((n)=>({...effect,id:'p'+n,pulseIndex:n,startedAt:(n-1)*.16}))
 const before=JSON.stringify(events)
 for(let i=0;i<3;i++)f.art.syncTower(f.parent,[events[i]],i*.16,camera)
 assert.equal(f.art.actors.size,3)
 assert.equal([...f.art.actors.values()].filter(a=>a.sword).length,1)
 assert.equal([...f.art.actors.values()].filter(a=>a.rift.node.active).length,1)
 assert.equal(JSON.stringify(events),before)
})

test('fracture never runs ahead of the blade and stays around the chest plane',()=>{
 const f=fixture();f.art.preload();f.load()
 const e={...effect,x:0,y:0,toX:360,toY:0}
 f.art.syncTower(f.parent,[e],.1,camera,82)
 const a=f.art.actors.get(e.id),tip=a.sword.node.x+a.sword.ui.width*626/1376
 assert.ok(a.rift.node.x+a.rift.ui.width<=tip)
 assert.equal(a.rift.node.y,82)
 assert.notEqual(a.rift.sprite.type,1,'preserve the tapered image end instead of cutting a vertical edge')
})

test('missing or late sword keeps fracture available; lifecycle balances references',()=>{
 const f=fixture();f.art.preload();f.load(new Error('missing'),null)
 f.art.syncTower(f.parent,[effect],.2,camera)
 assert.ok(f.art.actors.get(effect.id).rift.node.active)
 assert.equal(f.art.actors.get(effect.id).sword,undefined)
 f.art.reset();assert.equal(f.art.actors.size,0);assert.equal(f.art.tracks.size,0)
 const good=fixture();good.art.preload();good.load();assert.equal(good.image.refs,1)
 assert.equal(good.riftImage.refs,1)
 good.art.destroy();assert.equal(good.image.refs,0);assert.equal(good.riftImage.refs,0)
 const late=fixture();late.art.preload();late.art.destroy();late.load();assert.equal(late.image.refs,0);assert.equal(late.riftImage.refs,0)
})

test('capacity, invalid input and rewind cannot leave stale fractures',()=>{
 const f=fixture();f.art.preload();f.load()
 const invalid=[{...effect,id:'bad',toX:NaN},{...effect,id:'hostile',hostile:true},{...effect,id:'foreign',source:'other'}]
 const events=Array.from({length:9},(_,i)=>({...effect,id:'p'+i}))
 f.art.syncTower(f.parent,[...invalid,...events],.1,camera);assert.equal(f.art.actors.size,8)
 f.art.syncTower(f.parent,[],0,camera);assert.equal(f.art.actors.size,0)
 f.art.syncTower(f.parent,[effect],.1,camera);f.art.syncTower(f.parent,[],1.82,camera)
 assert.equal(f.art.tracks.size,0)
})


test('rift reaches the offscreen sword endpoint and opens after the sword leaves and remains through closure',()=>{
 const f=fixture();f.art.preload();f.load()
 const e={...effect,x:0,y:0,toX:640,toY:0}
 f.art.syncTower(f.parent,[e],.68,camera,82)
 const a=f.art.actors.get(e.id)
 assert.notEqual(a.rift.sprite.type,1)
 assert.ok(Math.abs(a.rift.node.x+a.rift.ui.width-f.art.tracks.get(e.id).visualLength)<1e-6)
 f.art.syncTower(f.parent,[],.72,camera)
 assert.equal(a.sword.node.active,false);assert.ok(a.rift.node.active)
 f.art.syncTower(f.parent,[],1.819,camera);assert.ok(a.rift.node.active)
 f.art.syncTower(f.parent,[],1.82,camera);assert.equal(f.art.actors.size,0)
})

 test('wide viewport and offset camera determine visual range without mutating combat receipts',()=>{
 const f=fixture();f.art.preload();f.load()
 const e={...effect,toX:60},before=JSON.stringify(e)
 f.art.syncTower(f.parent,[e],.62,{x:-300,y:30},82,{width:2400,height:720})
 const a=f.art.actors.get(e.id),half=a.sword.ui.width*626/1376
 assert.ok(a.node.x+a.sword.node.x-half>1200)
 assert.equal(JSON.stringify(e),before)
 })

test('missing rift image keeps the sword and never restores rejected polygon art',()=>{
 const f=fixture();f.art.preload();f.load(null,f.image,new Error('missing rift'))
 f.art.syncTower(f.parent,[effect],.2,camera)
 const a=f.art.actors.get(effect.id)
 assert.ok(a.sword.node.active);assert.equal(a.rift.node.active,false)
 assert.equal(a.rift.sprite.spriteFrame,undefined)
 f.art.destroy();assert.equal(f.image.refs,0)
})

test('rift arriving during a cast opens at the current flight distance',()=>{
 const f=fixture();f.art.preload()
 f.pending.shift()(null,f.image)
 f.art.syncTower(f.parent,[effect],.1,camera)
 const a=f.art.actors.get(effect.id)
 assert.ok(a.sword.node.active);assert.equal(a.rift.node.active,false)
 f.pending.shift()(null,f.riftImage)
 f.art.syncTower(f.parent,[],.3,camera)
 assert.ok(a.rift.node.active);assert.ok(a.rift.ui.width>300)
 assert.equal(a.rift.sprite.spriteFrame,f.art.riftFrame)
 f.art.destroy();assert.equal(f.riftImage.refs,0)
})

test('sword leaves a thin trace before the rift opens, closes and fades',()=>{
 const f=fixture();f.art.preload();f.load()
 const samples=[]
 for(const age of [.075,.2,.35,.45,.5,.6,.7,.8,1.2,1.3,1.45,1.6,1.72,1.80]){
  f.art.syncTower(f.parent,age<.25?[effect]:[],age,camera,82)
  const r=f.art.actors.get(effect.id).rift
  samples.push({age,height:r.ui.height,width:r.ui.width,y:r.node.y,alpha:r.sprite.color.a})
  assert.equal(r.node.y,82)
 }
 for(const s of samples.slice(0,5))assert.equal(s.height,6,'thin trace before opening near screen exit')
 assert.ok(samples[2].width>samples[0].width,'thin trace follows the flying sword')
 for(let i=5;i<=7;i++)assert.ok(samples[i].height>samples[i-1].height)
 assert.equal(samples[7].height,154);assert.equal(samples[9].height,154)
 for(let i=10;i<=12;i++)assert.ok(samples[i].height<samples[i-1].height)
 assert.equal(samples[12].height,6,'returns to the same thin trace')
 assert.equal(samples[11].alpha,255,'closing remains bright')
 assert.ok(samples[13].alpha<255,'only the closed seam fades')
 assert.equal(samples[7].width,samples[13].width,'opening and closing keep the full flight distance')
 f.art.syncTower(f.parent,[],1.82,camera);assert.equal(f.art.actors.size,0)
})
