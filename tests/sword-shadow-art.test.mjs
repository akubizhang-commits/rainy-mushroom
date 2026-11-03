import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {stripTypeScriptTypes} from 'node:module'
import {runInNewContext} from 'node:vm'
import * as shadow from '../js/xianxia/TowerShadow.js'

function fixture() {
 const pending=[]
 class Node {
  constructor(name){Object.assign(this,{name,isValid:true,children:[],layer:1,active:true})}
  addChild(n){this.children.push(n);n.parent=this}
  addComponent(C){return new C()}
  setPosition(x,y){this.x=x;this.y=y}
  destroy(){this.isValid=false}
  removeFromParent(){this.parent.children=this.parent.children.filter(n=>n!==this);this.parent=null}
 }
 class UITransform {setContentSize(w,h){this.width=w;this.height=h} setAnchorPoint(){}}
 class Sprite {static SizeMode={CUSTOM:1}}
 class Texture2D {static Filter={LINEAR:1};setFilters(){} destroy(){this.dead=true}}
 class SpriteFrame {destroy(){this.dead=true}}
 class Color {constructor(r,g,b,a){Object.assign(this,{r,g,b,a})}}
 class Rect {constructor(x,y,w,h){Object.assign(this,{x,y,width:w,height:h})}}
 class Size {}
 class Graphics {clear(){} moveTo(){} lineTo(){} stroke(){}}
 const context={...shadow,Node,UITransform,Sprite,Texture2D,SpriteFrame,Color,Rect,Size,Graphics,
  ImageAsset:class{},isValid:n=>!!n?.isValid,resources:{load:(...a)=>pending.push(a.at(-1))},
  console:{warn(){}}}
 const source=readFileSync(new URL('../cocos-pilot/assets/scripts/SwordShadowArt.ts',import.meta.url),'utf8')
  .replace(/^import .*$/gm,'').replace(/\bexport /g,'')
 runInNewContext(stripTypeScriptTypes(source,{mode:'transform'})+'\nglobalThis.Art=SwordShadowArt',context)
 const art=new context.Art(),parent=new Node('fx')
 const image={width:544,height:320,refs:0,addRef(){this.refs++},decRef(){this.refs--}}
 return {art,parent,image,Node,load(error=null,value=image){pending.shift()(error,value)}}
}
const camera={x:0,y:0}
const zone={id:'zone',kind:'shadow',source:'sj_shadow',x:100,y:20,radius:130,width:30,
 dirX:1,dirY:0,pulseCount:4,pulseIndex:0,interval:.16,startedAt:0,nextAt:.65,expiresAt:1.33}
const effect={id:'pulse-1',kind:'shadow',source:'sj_shadow',shape:'shadow',x:-30,y:20,
 toX:230,toY:20,width:30,startedAt:.65,expiresAt:.9}
const state=(time,zones=[],effects=[])=>({time,arenaVersion:0,player:{hp:100},zones,effects})

test('four cold shadows anticipate one fixed point; pulse tails follow real events only',()=>{
 const f=fixture(),{art,parent}=f,s=state(.3,[zone])
 assert.equal(art.syncTower(parent,s,camera).size,0);f.load()
 const before=JSON.stringify(s)
 assert.ok(art.syncTower(parent,s,camera).has(zone.id))
 const a=art.actors.get(zone.id)
 assert.equal(a.blades.filter(b=>b.node.active).length,4)
 const positions=a.blades.map(b=>[b.node.x,b.node.y])
 art.syncTower(parent,s,{x:10,y:7})
 assert.deepEqual(a.blades.map(b=>[b.node.x,b.node.y]),positions,'camera moves the parent, not the frozen sword geometry')
 assert.equal(a.node.x,90);assert.equal(a.node.y,57-7)
 assert.equal(JSON.stringify(s),before)
 art.syncTower(parent,state(.7,[{...zone,pulseIndex:1,nextAt:.81}],[]),camera)
 assert.equal(art.tracks.size,0,'never invent a pulse from the zone timer')
 assert.equal(art.actors.get(zone.id).blades.some(b=>b.node.active),false,'only the ground mark remains after first slash')
 assert.ok(art.syncTower(parent,state(.7,[],[effect]),camera).has(effect.id))
 const pulse=art.actors.get(effect.id)
 assert.ok(pulse.blades[0].node.active)
 art.syncTower(parent,state(.91),camera)
 assert.equal(art.actors.has(effect.id),true,'tail survives the combat effect expiry')
 assert.equal(pulse.blades.some(b=>b.node.active),false,'flying swords finish before the soft tail')
 art.syncTower(parent,state(1.011),camera)
 assert.equal(art.tracks.size,0);assert.equal(art.marks.size,1)
 art.syncTower(parent,state(1.5),camera)
 assert.equal(art.marks.size,1,'ground print survives the original zone expiry')
 art.syncTower(parent,state(1.64),camera)
 assert.equal(art.actors.size,0);assert.equal(art.marks.size,0)
})

test('each pulse freezes clipped endpoints and camera changes do not restart its phase',()=>{
 const f=fixture(),{art,parent}=f;art.preload();f.load()
 const p2={...effect,id:'pulse-2',x:100,y:-110,toX:100,toY:150,startedAt:.81,expiresAt:1.06}
 art.syncTower(parent,state(.84,[],[effect,p2]),camera)
 const before=art.actors.get(p2.id),x=before.blades[0].node.x
 assert.equal(art.tracks.size,2)
 art.clearBindings()
 const next=new f.Node('new')
 art.syncTower(next,state(.84,[],[{...p2,toX:999}]),{x:10,y:20})
 assert.equal(art.actors.get(p2.id).blades[0].node.x,x)
 assert.equal(art.tracks.get(p2.id).toX,100)
 assert.equal(art.actors.get(p2.id).node.y,-110+37-20)
 assert.equal(art.actors.get(p2.id).node.angle,90)
 art.syncTower(next,state(.3),camera)
 assert.equal(art.tracks.size,0,'rewinding cannot retain future pulses')
})

test('sword crosses most of the released segment in the first 25ms and settles within 75ms',()=>{
 const f=fixture();f.art.preload();f.load()
 f.art.syncTower(f.parent,state(.675,[],[effect]),camera)
 let blade=f.art.actors.get(effect.id).blades[0]
 assert.ok(blade.node.x>36+(260-72)*.65,'front-loaded flight reads as a fast cut')
 f.art.syncTower(f.parent,state(.726,[],[effect]),camera)
 assert.equal(blade.node.x,260-36)
 f.art.syncTower(f.parent,state(.82,[],[effect]),camera)
 assert.equal(blade.node.active,false,'no sword hanging at the endpoint')
})

test('failed, pending, malformed, expired and over-cap releases retain their fallback',()=>{
 const f=fixture(),{art,parent}=f
 const s=state(.7,[],[effect])
 assert.equal(art.syncTower(parent,s,camera).size,0)
 f.load(new Error('404'),null)
 assert.equal(art.syncTower(parent,s,camera).size,0);assert.equal(art.failed,true)
 const late=fixture();late.art.syncTower(late.parent,s,camera);late.load()
 assert.equal(late.art.syncTower(late.parent,state(1.1),camera).size,0)
 const good=fixture();good.art.preload();good.load()
 const invalid=[{...effect,hostile:true},{...effect,source:'other'},{...effect,toX:NaN},
  {...effect,width:0},{...effect,toX:effect.x,toY:effect.y},{...effect,startedAt:2},
  {...effect,toX:1e308}]
 assert.equal(good.art.syncTower(good.parent,state(.7,[],invalid),camera).size,0)
 const many=Array.from({length:20},(_,i)=>({...effect,id:`p${i}`}))
 assert.equal(good.art.syncTower(good.parent,state(.7,[],many),camera).size,12)
 assert.equal(good.art.tracks.size,12)
 good.art.syncTower(good.parent,state(1.1,[],[{...effect,id:'next',startedAt:1.1}]),camera)
 assert.equal(good.art.tracks.size,1,'expired tracks release capacity first')
})

test('death, scene replacement and late load destruction leave no actors or retained image refs',()=>{
 const f=fixture(),{art,parent}=f;art.preload();f.load()
 art.syncTower(parent,state(.7,[],[effect]),camera)
 art.syncTower(parent,{...state(.7),player:{hp:0}},camera)
 assert.equal(art.actors.size,0);assert.equal(art.tracks.size,0)
 art.syncTower(parent,state(.7,[],[effect]),camera)
 art.destroy();assert.equal(f.image.refs,0);assert.equal(art.actors.size,0)
 const late=fixture();late.art.preload();late.art.destroy();late.load()
 assert.equal(late.image.refs,0);assert.equal(late.art.ready,false)
})
