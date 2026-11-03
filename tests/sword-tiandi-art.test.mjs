import test from 'node:test'
import assert from 'node:assert/strict'
import {existsSync,readFileSync} from 'node:fs'
import {stripTypeScriptTypes} from 'node:module'
import {runInNewContext} from 'node:vm'

// Exercise the real renderer; only Cocos' GPU/resource boundary is substituted.
function fixture() {
 const file=new URL('../cocos-pilot/assets/scripts/SwordTiandiArt.ts',import.meta.url)
 assert.ok(existsSync(file),'approved heavy sword has a production renderer')
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
 class Sprite {static SizeMode={CUSTOM:1}}
 class Texture2D {static Filter={LINEAR:1};setFilters(){};destroy(){this.dead=true}}
 class SpriteFrame {destroy(){this.dead=true}}
 class Color {constructor(r,g,b,a){Object.assign(this,{r,g,b,a})}}
 class Rect {constructor(x,y,w,h){Object.assign(this,{x,y,width:w,height:h})}}
 class Size {constructor(w,h){Object.assign(this,{width:w,height:h})}}
 class Graphics {
  fills=[];points=[];
  clear(){this.fills=[];this.points=[]}
  moveTo(x,y){this.points=[[x,y]]}
  lineTo(x,y){this.points.push([x,y])}
  close(){}
  fill(){this.fills.push({points:this.points.slice(),color:this.fillColor})}
  stroke(){}
 }
 const context={Node,UITransform,Sprite,Texture2D,SpriteFrame,Color,Rect,Size,
  Graphics,
  ImageAsset:class{},isValid:n=>!!n?.isValid,resources:{load:(...a)=>{requested.push(a[0]);pending.push(a.at(-1))}},
  console:{warn:message=>warnings.push(message)}}
 const source=readFileSync(file,'utf8').replace(/^import .*$/gm,'').replace(/\bexport /g,'')
 runInNewContext(stripTypeScriptTypes(source,{mode:'transform'})+'\nglobalThis.Art=SwordTiandiArt',context)
 const art=new context.Art(),parent=new Node('fx')
 const image={width:4096,height:768,refs:0,addRef(){this.refs++},decRef(){this.refs--}}
 return {art,parent,pending,requested,image,warnings,Node,load(error=null,value=image){pending.shift()(error,value)}}
}
const camera={x:0,y:0}
const effect={id:'tiandi-1',kind:'tiandi',source:'evo_tiandi',shape:'line',x:10,y:20,toX:906,toY:20,width:128,startedAt:0,expiresAt:.25}

test('ice cleave follows the swing, freezes on pause, fades and releases its own resources',()=>{
 const f=fixture(),a=f.art;a.preload();f.load();f.load(null,{...f.image,width:1280,height:224})
 assert.ok(f.requested.includes('tower-skill-fx/convergence-ice-aura-v1'))
 const image={...f.image,width:1024,height:384,refs:0};f.load(null,image)
 const wind={...effect,id:'wind',kind:'tiandi_windup',startedAt:0,expiresAt:.45,locked:true}
 a.syncTower(f.parent,[wind],.40,camera,72)
 const b=[...a.blades.values()][0]
 assert.ok(b.auras.length>=2)
 assert.ok(b.auras.some(v=>v.node.active&&v.sprite.color.a>0))
 assert.notEqual(b.auras[0].node.angle,b.auras[1].node.angle,'trail follows an earlier swing pose')
 const snapshot=()=>JSON.stringify(b.auras.map(v=>[v.node.x,v.node.y,v.node.angle,v.ui.width,v.sprite.color.a]))
 const paused=snapshot();a.syncTower(f.parent,[wind],.40,camera,72);assert.equal(snapshot(),paused)
 const hit={...effect,startedAt:.45,expiresAt:.7}
 a.syncTower(f.parent,[hit],.45,camera,72);assert.equal(a.blades.size,1)
 a.syncTower(f.parent,[],.81,camera,72)
 assert.ok(b.auras.every(v=>!v.node.active||v.sprite.color.a===0),'no lingering light after the blade fades')
 const nodes=b.auras.map(v=>v.node)
 a.clearBindings();assert.ok(nodes.every(v=>!v.isValid))
 a.syncTower(f.parent,[],.82,camera,72)
 a.destroy();assert.equal(image.refs,0);assert.equal(a.blades.size,0)
})

test('downward trail stays in the swept angles after landing instead of collapsing onto the sword',()=>{
 const f=fixture(),a=f.art;a.preload();f.load();f.load(null,{...f.image,width:1280,height:224});f.load(null,{...f.image,width:1024,height:384})
 const wind={...effect,id:'wind',kind:'tiandi_windup',startedAt:0,expiresAt:.45,locked:true}
 a.syncTower(f.parent,[wind],.29,camera,72)
 const b=[...a.blades.values()][0]
 assert.ok(b.auras.slice(1).every(v=>!v.node.active),'no motion trail before the swing')
 a.syncTower(f.parent,[wind],.40,camera,72)
 assert.ok(b.sweep.fills.length>0,'blade travel has a connected translucent trail')
 a.syncTower(f.parent,[{...effect,startedAt:.45,expiresAt:.7}],.53,camera,72)
 const echoes=b.auras.slice(1).filter(v=>v.node.active)
 assert.ok(echoes.length>=4,'visible motion history survives impact')
 assert.ok(new Set(echoes.map(v=>v.node.angle.toFixed(3))).size>=4,'echoes retain their original angles')
 const angles=echoes.map(v=>v.node.angle),alphas=echoes.map(v=>v.sprite.color.a)
 a.syncTower(f.parent,[],.55,camera,72)
 assert.deepEqual(echoes.map(v=>v.node.angle),angles,'old light does not slide down onto the sword')
 assert.ok(echoes.every((v,i)=>v.sprite.color.a<alphas[i]),'old light fades in place')
 a.syncTower(f.parent,[],.81,camera,72)
 assert.equal(b.sweep.fills.length,0)
 const sweepNode=b.sweepNode;a.reset();assert.equal(sweepNode.isValid,false)
})

test('heavy strike keeps the first two frames fast and finishes its tail after damage has expired',()=>{
 const f=fixture(),{art,parent}=f;art.preload();f.load()
 assert.ok(f.requested.includes('tower-skill-fx/sword-tiandi-v1'))
 for(const [time,frame] of [[0,0],[.03125,1],[.0625,2],[.25,5],[.5,10],[.7,14],[.749,15]]){
  assert.ok(art.syncTower(parent,time<.25?[effect]:[],time,camera).has(effect.id),`visible at ${time}`)
  assert.equal(art.actors.get(effect.id).sprite.spriteFrame,art.frames[frame])
 }
 const last=art.actors.get(effect.id).node
 assert.equal(art.syncTower(parent,[],.75,camera).size,0)
 assert.equal(last.isValid,false);assert.equal(art.tracks.size,0)
})

test('giant cleaver gathers above a chest-forward pivot and lands once at the real damage endpoint',()=>{
 const f=fixture(),a=f.art;a.preload();f.load()
 assert.ok(f.requested.includes('tower-skill-fx/tiandi-solid-sword-v2'))
 f.load(null,{...f.image,width:1280,height:224})
 const wind={...effect,id:'wind',kind:'tiandi_windup',startedAt:0,expiresAt:.45,locked:true}
 a.syncTower(f.parent,[wind],.2,camera,72)
 const b=[...a.blades.values()][0];assert.ok(b)
 assert.equal(b.pivotX,106);assert.equal(b.pivotY,92)
 assert.ok(Math.abs(b.ui.width/b.ui.height-1280/224)<1e-6,'raised blade has the same proportions');
 assert.ok(b.tipY>b.pivotY+100,'gathered tip is above the hand')
 a.syncTower(f.parent,[wind],.40,camera,72)
 const descending=b.tipY
 assert.ok(descending>20&&descending<300)
 const hit={...effect,startedAt:.45,expiresAt:.7}
 a.syncTower(f.parent,[hit,{kind:'hit',source:'evo_tiandi',damage:10,x:400,y:20,expiresAt:.7}],.45,camera,72)
 assert.equal(a.blades.size,1,'windup and release are the same sword')
 assert.ok(Math.abs(b.tipX-906)<1e-6);assert.ok(Math.abs(b.tipY-20)<1e-6)
 assert.ok(Math.abs(b.ui.width/b.ui.height-1280/224)<1e-6,'sword keeps its long, narrow proportions')
 const before=JSON.stringify([b.pivotX,b.pivotY,b.tipX,b.tipY])
 a.syncTower(f.parent,[],.45,camera,120)
 assert.equal(JSON.stringify([b.pivotX,b.pivotY,b.tipX,b.tipY]),before,'paused redraw cannot restart or move the grip')
 const kick=a.cameraKick(.48);assert.ok(Math.hypot(kick.x,kick.y)>0)
 assert.deepEqual({...a.cameraKick(.7)},{x:0,y:0},'impact camera kick settles')
 a.syncTower(f.parent,[],1.21,camera)
 assert.equal(a.blades.size,0)
})

test('cleaver impact camera remains still for a missed cast and clears on reset',()=>{
 const f=fixture(),a=f.art;a.preload();f.load();f.load(null,{...f.image,width:1280,height:224})
 a.syncTower(f.parent,[effect],0,camera)
 assert.deepEqual({...a.cameraKick(.03)},{x:0,y:0})
 a.reset();assert.equal(a.blades.size,0)
})

test('missing startedAt derives the release from the combat duration, not the longer source animation',()=>{
 const f=fixture(),{art,parent}=f;art.preload();f.load()
 const restored={...effect,startedAt:undefined,expiresAt:10.25}
 assert.ok(art.syncTower(parent,[restored],10,camera).has(effect.id))
 assert.equal(art.actors.get(effect.id).sprite.spriteFrame,art.frames[0])
 art.syncTower(parent,[],10.5,camera)
 assert.equal(art.actors.get(effect.id).sprite.spriteFrame,art.frames[10])
 assert.equal(art.syncTower(parent,[],10.75,camera).size,0)
})

test('heavy sword pivot and dimensions follow the true hit corridor in every direction',()=>{
 const f=fixture(),{art,parent}=f;art.preload();f.load()
 for(const [dx,dy,angle] of [[896,0,0],[0,896,90],[-896,0,180],[0,-896,-90]]){
  art.reset();art.syncTower(parent,[{...effect,toX:10+dx,toY:20+dy}],0,{x:3,y:7})
  const actor=art.actors.get(effect.id)
  assert.equal(actor.node.x,7+dx/896*64);assert.equal(actor.node.y,13+dy/896*64);assert.equal(actor.node.angle,angle)
  assert.ok(Math.abs(actor.ui.width-832*928/896)<1e-9);assert.equal(actor.ui.height,160)
  assert.equal(actor.ui.anchorX,16/928);assert.equal(actor.ui.anchorY,.5)
  assert.equal(actor.sprite.trim,false)
 }
 art.reset();art.syncTower(parent,[{...effect,toX:278.8,toY:378.4,width:80}],0,camera)
 const diagonal=art.actors.get(effect.id)
 assert.ok(Math.abs(diagonal.ui.width-384*928/896)<1e-9);assert.equal(diagonal.ui.height,100)
 assert.ok(Math.abs(diagonal.node.angle-53.130102354156)<1e-9)
})

test('casts keep frozen geometry and individual phases while pause and camera movement remain read-only',()=>{
 const f=fixture(),{art,parent}=f;art.preload();f.load()
 const first={...effect},second={...effect,id:'second',x:50,y:60,toX:50,toY:956,width:112,startedAt:.25,expiresAt:.5}
 const before=JSON.stringify([first,second])
 art.syncTower(parent,[first],0,camera)
 assert.equal(art.syncTower(parent,[{...first,x:600,toX:800},second],.25,{x:5,y:9}).size,2)
 const a=art.actors.get(first.id),b=art.actors.get(second.id),frame=a.sprite.spriteFrame
 assert.equal(a.node.x,69);assert.equal(a.node.y,11);assert.ok(Math.abs(a.ui.width-832*928/896)<1e-9)
 assert.equal(frame,art.frames[5]);assert.equal(b.sprite.spriteFrame,art.frames[0])
 assert.equal(b.node.x,45);assert.equal(b.node.y,115);assert.equal(b.node.angle,90);assert.equal(b.ui.height,140)
 art.syncTower(parent,[],.25,{x:15,y:19})
 assert.equal(a.sprite.spriteFrame,frame);assert.equal(a.node.x,59);assert.equal(a.node.y,1)
 assert.deepEqual([...art.syncTower(parent,[],.75,camera)],['second'])
 assert.equal(art.syncTower(parent,[],1,camera).size,0)
 assert.equal(JSON.stringify([first,second]),before)
})

test('pending and failed art keep the procedural release; late success resumes without replaying impact',()=>{
 const f=fixture(),{art,parent}=f
 assert.equal(art.syncTower(parent,[effect],0,camera).size,0)
 f.load()
 assert.ok(art.syncTower(parent,[],.5,camera).has(effect.id))
 assert.equal(art.actors.get(effect.id).sprite.spriteFrame,art.frames[10])
 assert.deepEqual({...art.frames[10].rect},{x:2048,y:384,width:1024,height:192})
 for(const failure of ['missing','wrong-size']){
  const bad=fixture();bad.art.preload()
  if(failure==='missing')bad.load(new Error('missing'),null)
  else{bad.image.height=512;bad.load()}
  assert.equal(bad.art.syncTower(bad.parent,[effect],0,camera).size,0)
  assert.equal(bad.image.refs,0);assert.equal(bad.art.ready,false)
 }
 const expired=fixture();expired.art.syncTower(expired.parent,[effect],0,camera);expired.load()
 assert.equal(expired.art.syncTower(expired.parent,[],.8,camera).size,0)
})

test('only a friendly released heavy sword with valid geometry can claim a sprite',()=>{
 const f=fixture(),{art,parent}=f;art.preload();f.load()
 const rejected=[
  {...effect,id:'hostile',hostile:true},{...effect,id:'line',kind:'line',source:'sj_line'},
  {...effect,id:'windup',kind:'tiandi_windup'},{...effect,id:'foreign',source:'other'},
  {...effect,id:'shape',shape:'circle'},{...effect,id:'zero',toX:10,toY:20},
  {...effect,id:'infinite',toX:Infinity},{...effect,id:'nan',width:NaN},
  {...effect,id:'negative',width:-10},{...effect,id:'no-width',width:0},
  {...effect,id:'future',startedAt:1},{...effect,id:'expired',startedAt:-1},null,
 ]
 assert.deepEqual([...art.syncTower(parent,[...rejected,effect],0,camera)],[effect.id])
 assert.equal(art.tracks.size,1);assert.equal(art.actors.size,1)
})

test('capacity fallback is per release and an expiring tail immediately frees a binding',()=>{
 const f=fixture(),{art,parent}=f;art.preload();f.load()
 const releases=Array.from({length:9},(_,i)=>({...effect,id:`heavy-${i}`}))
 const drawn=art.syncTower(parent,releases,0,camera)
 assert.equal(drawn.size,8);assert.equal(drawn.has('heavy-8'),false)
 assert.deepEqual([...art.syncTower(parent,[{...effect,id:'next',startedAt:.75,expiresAt:1}],.75,camera)],['next'])
 assert.equal(art.actors.size,1);assert.equal(art.tracks.size,1)
})

test('scene rebuild preserves tail phase; resets, rewind and destruction release all owned bindings',()=>{
 const f=fixture(),{art,parent}=f;art.preload();f.load()
 art.syncTower(parent,[effect],.5,camera)
 const old=art.actors.get(effect.id).node
 art.clearBindings();assert.equal(old.isValid,false)
 const replacement=new f.Node('rebuilt')
 assert.ok(art.syncTower(replacement,[],.5,{x:1,y:2}).has(effect.id))
 const actor=art.actors.get(effect.id)
 assert.equal(actor.node.parent,replacement);assert.equal(actor.sprite.spriteFrame,art.frames[10])
 assert.equal(actor.node.x,73);assert.equal(actor.node.y,18)
 replacement.isValid=false
 assert.equal(art.syncTower(replacement,[],.6,camera).size,0);assert.equal(art.actors.size,0)
 art.syncTower(parent,[],.1,camera);assert.equal(art.tracks.size,0)
 art.syncTower(parent,[effect],.1,camera);art.reset()
 assert.equal(art.actors.size,0);assert.equal(art.tracks.size,0)
 art.syncTower(parent,[effect],.1,camera)
 const frames=[...art.frames],texture=art.texture
 assert.equal(f.image.refs,1);art.destroy()
 assert.equal(f.image.refs,0);assert.ok(texture.dead);assert.ok(frames.every(frame=>frame.dead))
 assert.equal(art.syncTower(parent,[effect],.1,camera).size,0)
 const late=fixture();late.art.preload();late.art.destroy();late.load()
 assert.equal(late.image.refs,0);assert.equal(late.art.frames.length,0)
})
