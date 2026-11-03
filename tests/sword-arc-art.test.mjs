import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {stripTypeScriptTypes} from 'node:module'
import {runInNewContext} from 'node:vm'

function fixture(profile) {
 const source=readFileSync(new URL('../cocos-pilot/assets/scripts/SwordArcArt.ts',import.meta.url),'utf8')
 const pending=[],requested=[]
 class Node {
  constructor(name){this.name=name;this.isValid=true;this.children=[];this.components=[];this.active=true}
  addChild(n){this.children.push(n);n.parent=this}
  addComponent(C){const c=new C();this.components.push(c);return c}
  setPosition(x,y){this.x=x;this.y=y}
  destroy(){this.isValid=false}
  removeFromParent(){this.parent=null}
 }
 class UITransform { setContentSize(w,h){this.width=w;this.height=h} setAnchorPoint(x,y){this.anchorX=x;this.anchorY=y} }
 class Sprite {static SizeMode={CUSTOM:1}}
 class Texture2D {static Filter={LINEAR:1};setFilters(){};destroy(){this.dead=true}}
 class SpriteFrame {destroy(){this.dead=true}}
 class Color {constructor(r,g,b,a){Object.assign(this,{r,g,b,a})}}
 class Rect {constructor(x,y,w,h){Object.assign(this,{x,y,width:w,height:h})}}
 class Size {constructor(w,h){Object.assign(this,{width:w,height:h})}}
 const context={Node,UITransform,Sprite,Texture2D,SpriteFrame,Color,Rect,Size,
  ImageAsset:class{},isValid:n=>!!n?.isValid,resources:{load:(...a)=>{requested.push(a[0]);pending.push(a.at(-1))}},console}
 runInNewContext(stripTypeScriptTypes(source.replace(/^import .*$/gm,'').replace(/\bexport /g,''),{mode:'transform'})+
  '\nglobalThis.Art=SwordArcArt',context)
 const art=new context.Art(profile),parent=new Node('fx')
 const image={width:profile==='tower-ice'?512:1024,height:profile==='tower-ice'?512:1024,refs:0,addRef(){this.refs++},decRef(){this.refs--}}
 return {art,parent,pending,image,requested,load(){pending.shift()(null,image)}}
}
const effect={id:'fx1',kind:'arc',x:10,y:20,radius:140,faceX:0,faceY:1,expiresAt:10.25}

test('approved ice near slash keeps its painting fixed while simulation time controls fade and expiry',()=>{
 const f=fixture('tower-ice'),{art,parent}=f;art.preload();f.load()
 assert.equal(art.draw(parent,'ice',10,20,1,0,140,.25),true)
 const a=art.actors.get('ice'),frame=a.sprite.spriteFrame
 assert.equal(a.node.x,129);assert.equal(a.node.y,84)
 assert.equal(a.ui.width,238)
 assert.equal(a.ui.anchorX,.9319826338639653)
 art.draw(parent,'ice',10,20,1,0,140,.9)
 assert.equal(a.sprite.spriteFrame,frame)
 assert.ok(a.sprite.color.a>0&&a.sprite.color.a<255)
 assert.equal(art.draw(parent,'ice',10,20,1,0,140,1),false)
})

test('tower retains one approved animation through the source effect expiry, follows camera not player, and freezes',()=>{
 const f=fixture(),{art,parent}=f
 art.preload();f.load()
 art.syncTower(parent,[effect],10,{x:0,y:0})
 assert.equal(art.actors.size,1)
 const a=art.actors.get('fx1')
 assert.equal(a.node.x,10);assert.equal(a.node.y,90)
 assert.equal(a.node.angle,90)
 const frame=a.sprite.spriteFrame
 art.syncTower(parent,[effect],10,{x:5,y:9})
 assert.equal(art.actors.size,1);assert.equal(a.sprite.spriteFrame,frame)
 assert.equal(a.node.x,5);assert.equal(a.node.y,81)
 art.syncTower(parent,[],10.3,{x:5,y:9})
 assert.equal(art.actors.size,1)
 assert.notEqual(a.sprite.spriteFrame,frame)
 art.syncTower(parent,[],10.5,{x:5,y:9})
 assert.equal(art.actors.size,0);assert.equal(art.tracks.size,0)
})

test('late loading resumes absolute phase instead of replaying and ignores hostile/non-arc effects',()=>{
 const f=fixture(),{art,parent}=f
 art.preload()
 art.syncTower(parent,[effect,{...effect,id:'enemy',hostile:true},{...effect,id:'line',kind:'line'}],10,{x:0,y:0})
 assert.equal(art.actors.size,0)
 f.load()
 art.syncTower(parent,[],10.3,{x:0,y:0})
 assert.equal(art.actors.size,1)
 assert.equal(art.actors.get('fx1').sprite.spriteFrame,art.frames[9])
 art.syncTower(parent,[],11,{x:0,y:0})
 assert.equal(art.actors.size,0)
})

test('draw uses direction, age, reduced opacity and bounds without mutating input',()=>{
 const f=fixture(),{art,parent}=f;art.preload();f.load()
 const input=JSON.stringify(effect)
 art.beginFrame()
 assert.equal(art.draw(parent,'one',10,20,2,0,140,.25,true),true)
 art.endFrame()
 const a=art.actors.get('one')
 assert.equal(a.node.angle,0);assert.equal(a.node.x,80);assert.equal(a.node.y,20)
 assert.equal(a.sprite.color.a,140)
 assert.equal(a.sprite.spriteFrame,art.frames[4])
 assert.equal(JSON.stringify(effect),input)
 art.beginFrame()
 assert.equal(art.draw(parent,'bad',0,0,0,0,140,.2),false)
 assert.equal(art.draw(parent,'expired',0,0,1,0,140,1),false)
 art.endFrame()
 assert.equal(art.actors.size,0)
})

test('reset, rewind, destruction and late callback cannot leave actors or resource references',()=>{
 const f=fixture(),{art,parent}=f;art.preload();f.load()
 art.syncTower(parent,[effect],10,{x:0,y:0})
 art.syncTower(parent,[],1,{x:0,y:0})
 assert.equal(art.tracks.size,0);assert.equal(art.actors.size,0)
 art.syncTower(parent,[{...effect,expiresAt:1.25}],1,{x:0,y:0})
 art.reset();assert.equal(art.actors.size,0)
 art.destroy();assert.equal(f.image.refs,0)
 const late=fixture();late.art.preload();late.art.destroy();late.load()
 assert.equal(late.image.refs,0);assert.equal(late.art.frames.length,0)
})

test('approved tower blade anchors its source pivot at the exact cast point in all four directions',()=>{
 const f=fixture('tower-v2'),{art,parent}=f;art.preload();f.load()
 assert.deepEqual(f.requested,['tower-skill-fx/sword-arc-v2'])
 for(const [dx,dy,angle] of [[1,0,0],[0,1,90],[-1,0,180],[0,-1,-90]]){
  art.beginFrame()
  assert.equal(art.draw(parent,'arc',10,20,dx,dy,197,.25),true)
  art.endFrame()
  const a=art.actors.get('arc')
  assert.equal(a.node.x,10);assert.equal(a.node.y,20);assert.equal(a.node.angle,angle)
  // Source crop is 816 wide around a 394 radius: a 197 gameplay radius
  // therefore displays on a 408 square. No forward-center offset is allowed.
  assert.equal(a.ui.width,408);assert.equal(a.ui.height,408)
  assert.equal(a.ui.anchorX,.5);assert.equal(a.ui.anchorY,.5)
 }
})

test('tower releases own independent simulation phases and omit sprites exactly at their .25 second expiry',()=>{
 const f=fixture('tower-v2'),{art,parent}=f;art.preload();f.load()
 const first={...effect,id:'first',startedAt:10}
 const second={...effect,id:'second',x:70,y:80,startedAt:10.16,expiresAt:10.41}
 const before=JSON.stringify([first,second])
 let drawn=art.syncTower(parent,[first],10,{x:0,y:0})
 assert.ok(drawn?.has('first'),'actual sprite IDs are returned for fallback suppression')
 drawn=art.syncTower(parent,[first,second],10.16,{x:5,y:9})
 assert.equal(art.actors.size,2);assert.equal(drawn.size,2)
 assert.equal(art.actors.get('first').sprite.spriteFrame,art.frames[10])
 assert.equal(art.actors.get('second').sprite.spriteFrame,art.frames[0])
 assert.equal(art.actors.get('second').node.x,65)
 assert.equal(art.actors.get('second').node.y,71)
 drawn=art.syncTower(parent,[second],10.25,{x:5,y:9})
 assert.equal(drawn.has('first'),false);assert.equal(art.actors.has('first'),false)
 assert.equal(drawn.has('second'),true)
 art.syncTower(parent,[],10.41,{x:5,y:9})
 assert.equal(art.actors.size,0);assert.equal(art.tracks.size,0)
 assert.equal(JSON.stringify([first,second]),before)
})

test('tower fallback retains unloaded, rejected and capacity-limited releases without replaying later',()=>{
 const f=fixture('tower-v2'),{art,parent}=f
 const effects=Array.from({length:9},(_,i)=>({...effect,id:`arc-${i}`,startedAt:10}))
 let drawn=art.syncTower(parent,effects,10,{x:0,y:0})
 assert.equal(drawn?.size,0,'unloaded effects must remain eligible for vector fallback')
 f.load()
 drawn=art.syncTower(parent,effects,10.125,{x:0,y:0})
 assert.equal(drawn.size,8);assert.equal(art.actors.size,8)
 assert.equal(drawn.has('arc-8'),false,'a release beyond the sprite cap keeps the vector fallback')
 for(const actor of art.actors.values())assert.equal(actor.sprite.spriteFrame,art.frames[8])
 art.clearBindings()
 drawn=art.syncTower(parent,[],10.125,{x:4,y:5})
 assert.equal(drawn.size,8,'resize rebinds at the frozen phase')
 art.reset()
 drawn=art.syncTower(parent,[{...effect,startedAt:10,angle:180}],10,{x:0,y:0})
 assert.equal(drawn.size,0,'the approved 90 degree art cannot conceal another sector shape')
 const failed=fixture('tower-v2')
 failed.art.preload();failed.pending.shift()(new Error('missing atlas'),null)
 assert.equal(failed.art.syncTower(failed.parent,effects,10,{x:0,y:0}).size,0)
 assert.equal(failed.art.ready,false)
})

test('expired sprite bindings release capacity before a new cast on the same tick',()=>{
 const f=fixture('tower-v2'),{art,parent}=f;art.preload();f.load()
 art.syncTower(parent,Array.from({length:8},(_,i)=>({...effect,id:`old-${i}`,startedAt:10})),10,{x:0,y:0})
 const next={...effect,id:'new',startedAt:10.25,expiresAt:10.5}
 const drawn=art.syncTower(parent,[next],10.25,{x:0,y:0})
 assert.equal(drawn.has('new'),true)
 assert.equal(art.actors.size,1);assert.equal(art.tracks.size,1)
})
