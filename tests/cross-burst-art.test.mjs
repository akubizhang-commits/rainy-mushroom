import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { runInNewContext } from 'node:vm'
import { swordQiVisualLift } from '../js/xianxia/TowerSwordQi.js'
function fixture(){
 const pending=[]
 class Node{constructor(){this.isValid=true;this.children=[];this.layer=1}addChild(n){n.parent=this;this.children.push(n)}addComponent(C){return new C()}setPosition(x,y){this.x=x;this.y=y}removeFromParent(){this.parent=null}destroy(){this.isValid=false}}
 class UITransform{setAnchorPoint(){}setContentSize(w,h){this.width=w;this.height=h}}
 class Sprite{static SizeMode={CUSTOM:1}}
 class Graphics{constructor(){this.calls=[]}clear(){this.calls=[]}moveTo(x,y){this.calls.push(['m',x,y])}lineTo(x,y){this.calls.push(['l',x,y])}close(){}fill(){this.calls.push(['f',this.fillColor])}stroke(){this.calls.push(['s',this.strokeColor])}}
 class Texture2D{static Filter={LINEAR:1};setFilters(){}destroy(){}}
 class SpriteFrame{destroy(){}}
 class Color{constructor(r,g,b,a){Object.assign(this,{r,g,b,a})}}
 const ctx={Node,UITransform,Sprite,Graphics,Texture2D,SpriteFrame,Color,swordQiVisualLift,ImageAsset:class{},isValid:n=>n?.isValid,resources:{load:(...a)=>pending.push(a.at(-1))}}
 const src=readFileSync(new URL('../cocos-pilot/assets/scripts/CrossBurstArt.ts',import.meta.url),'utf8').replace(/^import .*$/gm,'').replace('export class','class')
 runInNewContext(stripTypeScriptTypes(src,{mode:'transform'})+'\nglobalThis.Art=CrossBurstArt',ctx)
 const art=new ctx.Art(),parent=new Node(),image={refs:0,addRef(){this.refs++},decRef(){this.refs--}}
 return {art,parent,image,pending,load(){for(const fn of pending.splice(0))fn(null,image)}}
}
const e={id:'burst',source:'sj_cross',shape:'cross-burst',x:100,y:200,radius:220,startedAt:2,expiresAt:2.9}
test('burst rendering is read-only, deterministic across pause/rebuild, and follows the frozen origin',()=>{
 const f=fixture(),before=JSON.stringify(e);f.art.preload();f.load()
 f.art.syncTower(f.parent,[e],2.2,{x:10,y:20});const a=f.art.actors.get(e.id)
 assert.equal(a.node.x,90);assert.equal(a.node.y,244)
 const frame=JSON.stringify({light:a.light.calls,arcs:a.arcs.map(p=>({x:p.node.x,y:p.node.y,angle:p.node.angle,color:p.sprite.color}))})
 f.art.clearBindings();f.art.syncTower(f.parent,[e],2.2,{x:10,y:20});const b=f.art.actors.get(e.id)
 assert.equal(JSON.stringify({light:b.light.calls,arcs:b.arcs.map(p=>({x:p.node.x,y:p.node.y,angle:p.node.angle,color:p.sprite.color}))}),frame)
 assert.equal(JSON.stringify(e),before)
 f.art.syncTower(f.parent,[e],2.9,{x:0,y:0});assert.equal(f.art.actors.size,0)
})
test('missing arc textures retain the blue-white burst, and late loads cannot resurrect destroyed art',()=>{
 const f=fixture();f.art.syncTower(f.parent,[e],2.2,{x:0,y:0})
 assert.ok(f.art.actors.get(e.id).light.calls.length>0)
 assert.ok(f.art.actors.get(e.id).arcs.every(p=>!p.node.active))
 f.art.destroy();f.load();assert.equal(f.image.refs,0)
 const loaded=fixture();loaded.art.preload();loaded.load();assert.equal(loaded.image.refs,2)
 loaded.art.destroy();assert.equal(loaded.image.refs,0)
})
test('dead, hostile, malformed, future and expired bursts never render',()=>{
 const f=fixture();const invalid=[{...e,hostile:true},{...e,radius:-1},{...e,x:NaN},{...e,startedAt:4},{...e,expiresAt:1}]
 assert.equal(f.art.syncTower(f.parent,invalid,2.2,{x:0,y:0}).size,0)
 f.art.destroy();assert.equal(f.art.syncTower(f.parent,[e],2.2,{x:0,y:0}).size,0)
})
test('slanted crescents overlap in time while blooming outward',()=>{
 const f=fixture();f.art.preload();f.load()
 for(const radius of [180,220,270])for(const seed of [123,999,328478]){
  const occupied=new Set(),previous=new Map()
  for(let age=.01;age<.9;age+=.02)for(let i=0;i<6;i++){
   const p=f.art.pose(i,radius,age,seed);if(!p.active)continue
   const base=radius*(.32+[.02,-.015,.035,0,.01,-.025][i])
   assert.ok(p.size>=base*2.1*.38&&p.size<=base*2.1)
   const distance=Math.hypot(p.x,p.y)
   assert.ok(distance>=18+radius*.12&&distance<=18+radius*.27,'compact outward center path')
   const heading=p.angle*Math.PI/180
   const outward=(p.x*Math.cos(heading)+p.y*Math.sin(heading))/distance
   assert.ok(outward>.7&&outward<.94,'blade points outward at a crossing angle')
   const last=previous.get(i)
   if(last){assert.ok(distance>last.distance,'blades move outward');assert.ok(p.size>last.size,'blades unfold')}
   previous.set(i,{distance,size:p.size})
   assert.ok(Number.isFinite(p.angle))
   occupied.add((Math.floor((Math.atan2(p.y,p.x)+Math.PI*2)/(Math.PI/2)))%4)
  }
  assert.equal(occupied.size,4,'blades cover all four surrounding quadrants')
 }
 assert.equal(Array.from({length:6},(_,i)=>f.art.pose(i,270,.04,123)).filter(p=>p.active).length,1)
 assert.notDeepEqual(f.art.pose(2,270,.35,123),f.art.pose(2,270,.35,999))
 assert.equal(Array.from({length:6},(_,i)=>f.art.pose(i,270,.30,123)).filter(p=>p.active&&p.alpha>.15).length,6,'all six visibly overlap during the bloom')
})
