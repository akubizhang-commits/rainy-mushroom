import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {stripTypeScriptTypes} from 'node:module'
import {runInNewContext} from 'node:vm'
const source=stripTypeScriptTypes(readFileSync(new URL('../cocos-pilot/assets/scripts/ConvergenceArt.ts',import.meta.url),'utf8').replace(/^import .*$/gm,''),{mode:'transform'}).replace(/^export /gm,'')
function fixture(){
 const pending=[],poses=[]
 class Node{
  constructor(name){this.name=name;this.children=[];this.layer=1;this.active=true}
  addChild(n){this.children.push(n);n.parent=this}
  addComponent(T){const c=new T();c.node=this;return c}
  setPosition(x,y){this.position={x,y}}
  destroy(){this.dead=true}
 }
 class UITransform{setAnchorPoint(x,y){this.anchor={x,y}}setContentSize(w,h){this.width=w;this.height=h}}
 class Sprite{static SizeMode={CUSTOM:1}}
 class Graphics{clear(){} }
 class Color{constructor(r,g,b,a){Object.assign(this,{r,g,b,a})}}
 class Texture2D{destroy(){this.dead=true}}
 class SpriteFrame{destroy(){this.dead=true}}
 const Art=runInNewContext(`${source};ConvergenceArt`,{Node,UITransform,Sprite,Graphics,Color,Texture2D,SpriteFrame,ImageAsset:class{},isValid:()=>true,convergencePoses:()=>poses,resources:{load:(name,type,cb)=>pending.push({name,cb})}})
 const art=new Art(),parent=new Node('root'),state={time:1,player:{hp:100},zones:[],effects:[]}
 const load=entry=>{const image={refs:0,addRef(){this.refs++},decRef(){this.refs--}};entry.cb(null,image);return image}
 return {art,parent,state,poses,pending,load}
}
test('blue aura follows blade, remains stable on redraw, tolerates late loading and cleans up',()=>{
 const f=fixture();f.art.preload();assert.equal(f.pending.length,3)
 const images=f.pending.slice(0,2).map(f.load)
 f.poses.push({id:'one',x:30,y:70,angle:.8,span:144,alpha:220,terminal:false,flight:0})
 f.art.syncTower(f.parent,f.state,{x:1,y:2})
 const actor=f.art.actors.get('one');assert.equal(actor.auraNode.active,false)
 images.push(f.load(f.pending[2]));f.art.syncTower(f.parent,f.state,{x:1,y:2})
 assert.equal(actor.auraNode.active,true);assert.equal(actor.auraNode.angle,actor.node.angle)
 assert.deepEqual(actor.auraNode.position,actor.node.position)
 const before=JSON.stringify(f.state),alpha=actor.auraSprite.color.a,height=actor.auraUi.height
 f.art.syncTower(f.parent,f.state,{x:1,y:2})
 assert.equal(JSON.stringify(f.state),before);assert.equal(actor.auraSprite.color.a,alpha);assert.equal(actor.auraUi.height,height)
 f.poses[0].flight=.8;f.poses[0].tailX=NaN;f.art.syncTower(f.parent,f.state,{x:1,y:2});assert.ok(actor.auraSprite.color.a>alpha)
 f.poses.length=0;f.art.syncTower(f.parent,f.state,{x:1,y:2});assert.equal(f.art.actors.size,0)
 assert.ok(actor.node.dead&&actor.auraNode.dead)
 f.art.destroy();assert.ok(images.every(i=>i.refs===0))
})
