import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { runInNewContext } from 'node:vm'
import { swordQiVisualLift } from '../js/xianxia/TowerSwordQi.js'
function fixture(){
 const pending=[]
 class Node{constructor(){this.isValid=true;this.children=[];this.layer=1}addChild(n){n.parent=this;this.children.push(n)}addComponent(C){return new C()}setPosition(x,y){this.x=x;this.y=y}setScale(x,y){this.scaleX=x;this.scaleY=y}removeFromParent(){this.parent=null}destroy(){this.isValid=false}}
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
test('white-violet crescents stay fixed at full size throughout their local slash',()=>{
 const f=fixture();f.art.preload();f.load()
 for(const r of [180,220,270])for(const seed of [123,999])for(let i=0;i<2;i++){
  const poses=[.26,.32,.42].map(age=>f.art.pose(i,r,age,seed));
  assert.ok(poses.every(p=>p.active));
  for(const p of poses.slice(1))for(const key of ['x','y','angle','size'])assert.equal(p[key],poses[0][key],key+' cannot fly or expand');
  assert.ok(poses[0].size>r*.6);assert.ok(Math.hypot(poses[0].x,poses[0].y)+poses[0].size*.55<r*1.1);
 }
 f.art.syncTower(f.parent,[e],2.32,{x:0,y:0});const a=f.art.actors.get(e.id);
 assert.equal(new Set(a.arcs.map(p=>p.sprite.spriteFrame)).size,2,'front pale echo and rear blue-black tail use distinct paintings');
 assert.equal(a.arcs.length,2);assert.ok(a.arcs.every(p=>p.node.active));
 assert.ok(a.arcs.every(p=>p.node.x>0));assert.equal(a.arcs[0].node.angle,0);assert.equal(a.arcs[1].node.angle,0);assert.equal(a.arcs[0].node.x,a.arcs[1].node.x);
});

test('left-facing slash preserves the reference handedness instead of flipping its long tail upward',()=>{
 const f=fixture();f.art.preload();f.load();
 f.art.syncTower(f.parent,[{...e,dirX:-1,dirY:0}],2.2,{x:0,y:0});
 const a=f.art.actors.get(e.id);assert.equal(a.node.angle,180);assert.equal(a.node.scaleY,-1);
 f.art.syncTower(f.parent,[{...e,dirX:1,dirY:0}],2.2,{x:0,y:0});assert.equal(a.node.scaleY,1);
});
