import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {stripTypeScriptTypes} from 'node:module'
import {runInNewContext} from 'node:vm'
import {swordQiReleaseOffset,swordQiSegments,swordQiVisualLift} from '../js/xianxia/TowerSwordQi.js'
import {skillForm} from '../js/xianxia/TowerSkillForms.js'

function fixture() {
 const pending=[],requested=[],warnings=[]
 class Node {
  constructor(name){this.name=name;this.isValid=true;this.children=[];this.components=[];this.layer=1;this.active=true}
  addChild(n){this.children.push(n);n.parent=this}
  addComponent(C){const c=new C();this.components.push(c);return c}
  setPosition(x,y){this.x=x;this.y=y}
  destroy(){this.isValid=false}
  removeFromParent(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);this.parent=null}
 }
 class UITransform {setContentSize(w,h){this.width=w;this.height=h}setAnchorPoint(x,y){this.anchorX=x;this.anchorY=y}}
 class Sprite {static SizeMode={CUSTOM:1}}
 class Texture2D {static Filter={LINEAR:1};setFilters(){}destroy(){this.dead=true}}
 class SpriteFrame {destroy(){this.dead=true}}
 class Color {constructor(r,g,b,a){Object.assign(this,{r,g,b,a})}}
 const context={Node,UITransform,Sprite,Texture2D,SpriteFrame,Color,swordQiVisualLift,
  ImageAsset:class{},isValid:n=>!!n?.isValid,
  resources:{load:(path,type,callback)=>{requested.push(path);pending.push({path,callback})}},
  console:{warn:s=>warnings.push(s)}}
 const source=readFileSync(new URL('../cocos-pilot/assets/scripts/SwordQiArt.ts',import.meta.url),'utf8')
  .replace(/^import .*$/gm,'').replace(/\bexport /g,'')
 runInNewContext(stripTypeScriptTypes(source,{mode:'transform'})+'\nglobalThis.Art=SwordQiArt',context)
 const art=new context.Art(),parent=new Node('qi'),images=[]
 return {art,parent,Node,pending,requested,warnings,images,load(kind,error=null,size){
  const i=pending.findIndex(item=>item.path.includes(kind)),{callback,path}=pending.splice(i,1)[0]
  const image={path,width:size?.[0]??(kind==='crescent'&&!path.includes('ice')?384:512),height:size?.[1]??512,refs:0,addRef(){this.refs++},decRef(){this.refs--}}
  images.push(image);callback(error,error?null:image);return image
 }}
}
const camera={x:0,y:0}
const crescent={id:'moon',source:'sj_arc',shape:'crescent-projectile',bladeKind:'crescent',
 x:100,y:200,dirX:1,dirY:0,vx:960,vy:0,width:180,bladeWidth:12,startedAt:0,dissolveAt:null,expiresAt:10}
const cross={...crescent,id:'cross',source:'sj_cross',shape:'cross-projectile',bladeKind:'cross'}
const melee={...cross,id:'near',kind:'cross',shape:'cross',expiresAt:.25}
function ready(){const f=fixture();f.art.preload();while(f.pending.length)f.load(f.pending[0].path.includes('ice')?f.pending[0].path:f.pending[0].path.includes('crescent')?'crescent':'cross');return f}

test('three releases use distinct approved paintings and disable duplicate crescent trails',()=>{
 const {art,parent}=ready()
 const shots=[1,2,3].map(pulseIndex=>({...crescent,id:`cut-${pulseIndex}`,pulseIndex}))
 art.syncTower(parent,shots,[],.2,camera)
 const frames=shots.map(s=>art.actors.get(s.id).parts[0].sprite.spriteFrame)
 assert.equal(new Set(frames).size,3,'each cut needs its own approved silhouette')
 for(const shot of shots){
  const actor=art.actors.get(shot.id)
  assert.ok(actor.parts.slice(1).every(p=>!p.node.active||p.sprite.color.a===0))
 }
})

test('qi body anchor, world span and rotation track live projectile geometry without mutating combat',()=>{
 const {art,parent}=ready()
 for(const [dx,dy,angle] of [[1,0,0],[0,1,90],[-1,0,180],[0,-1,-90],[Math.SQRT1_2,Math.SQRT1_2,45]]){
  const shot={...crescent,dirX:dx,dirY:dy,vx:dx*960,vy:dy*960},before=JSON.stringify(shot)
  assert.ok(art.syncTower(parent,[shot],[],.2,{x:3,y:7}).has(shot.id))
  const actor=art.actors.get(shot.id)
  assert.equal(actor.node.x,97);assert.equal(actor.node.y,257);assert.equal(actor.node.angle,angle)
  assert.equal(actor.parts[0].ui.anchorX,.9319826338639653);assert.equal(actor.parts[0].ui.anchorY,.5014471780028944)
  assert.equal(actor.parts[0].ui.height,180*512/(512*.7091172214182344));assert.equal(actor.parts[0].ui.width,actor.parts[0].ui.height)
  assert.equal(JSON.stringify(shot),before)
 }
 const a=art.actors.get('moon')
 art.syncTower(parent,[{...crescent,x:300}],[],.3,camera)
 assert.equal(a.node.x,300,'flight is not frozen at first observation')
})

test('small and enlarged crosses share the curved frame and scale both crescents together',()=>{
 const {art,parent,requested}=ready()
 assert.ok(requested.includes('tower-skill-fx/sword-qi-cross-v3'))
 art.syncTower(parent,[cross,{...cross,id:'large',width:270,bladeWidth:18}],[],.2,camera)
 const a=art.actors.get('cross'),b=art.actors.get('large')
 assert.equal(a.parts[0].ui.anchorX,.7555981975459283)
 assert.equal(a.parts[0].sprite.spriteFrame,b.parts[0].sprite.spriteFrame)
 assert.equal(b.parts[0].ui.width/a.parts[0].ui.width,1.5)
 assert.equal(b.parts[0].ui.height/a.parts[0].ui.height,1.5)
})

test('approved cross image and collision share the chest-level intersection across ranks and directions',()=>{
 const {art,parent}=ready()
 const approved=JSON.parse(readFileSync(new URL(
  '../design/xianxia-cross-forward-2026-10-30/art/selected-candidate.json',import.meta.url))).selectedCompatibilityPreview
 const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`)
 for(const rank of [1,3,4,6,7,10])for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[Math.SQRT1_2,Math.SQRT1_2]]){
  const form=skillForm('sj_cross',rank),offset=swordQiReleaseOffset(form)
  const shot={...cross,width:form.width,x:100+offset*dx,y:200+offset*dy,dirX:dx,dirY:dy}
  art.syncTower(parent,[shot],[],.2,camera)
  const actor=art.actors.get('cross'),ui=actor.parts[0].ui
  const middle=(approved.whiteMiddlePx[0]/512-ui.anchorX)*ui.width
  const collisionMiddle=swordQiSegments('cross',form.width)[5].b
  close(middle,collisionMiddle.x)
  close(actor.node.x+middle*dx,100+90*dx)
  close(actor.node.y+middle*dy,200+64+90*dy)
 }
})

test('hovering caster height is captured at release and does not bob after the blade leaves',()=>{
 const {art,parent}=ready()
 const shot={...crescent,startedAt:.5,castContext:{loadout:{passive:{sj_flight:1}}}}
 const before=JSON.stringify(shot),height=200+64+18+2*Math.sin(1.5)
 for(const time of [.6,1,1.2]){
  art.syncTower(parent,[shot],[],time,camera)
  assert.equal(art.actors.get('moon').node.y,height)
 }
 assert.equal(JSON.stringify(shot),before)
})

test('projectile tail follows absolute simulation time and does not replay on pause or rebuild',()=>{
 const {art,parent,Node}=ready(),shot={...crescent,dissolveAt:1,expiresAt:1.36}
 art.syncTower(parent,[shot],[],1.18,camera)
 const a=art.actors.get('moon'),alpha=a.parts[0].sprite.color.a
 assert.ok(alpha>0&&alpha<255)
 art.syncTower(parent,[shot],[],1.18,{x:20,y:30})
 assert.equal(a.parts[0].sprite.color.a,alpha);assert.equal(a.node.x,80)
 art.clearBindings()
 const replacement=new Node('rebuilt')
 assert.ok(art.syncTower(replacement,[shot],[],1.18,camera).has('moon'))
 assert.equal(art.actors.get('moon').parts[0].sprite.color.a,alpha)
 assert.equal(art.syncTower(replacement,[shot],[],1.36,camera).size,0)
})

test('near cross has one short release and expired bindings are pooled for the next cast',()=>{
 const {art,parent}=ready()
 art.syncTower(parent,[],[melee],.02,camera)
 const first=art.actors.get('near').node
 assert.ok(first.active)
 art.syncTower(parent,[],[],.25,camera)
 assert.equal(art.actors.size,0);assert.equal(first.active,false)
 art.syncTower(parent,[],[{...melee,id:'near-2',startedAt:.3,expiresAt:.55}],.31,camera)
 assert.equal(art.actors.get('near-2').node,first)
})

test('404 or wrong dimensions suppress no fallback, while a loaded other kind still draws',()=>{
 for(const fail of ['404','dimensions']){
  const f=fixture();f.art.preload()
  if(fail==='404')f.load('crescent',new Error('404'))
  else f.load('crescent',null,[256,256])
  f.load('cross')
  const drawn=f.art.syncTower(f.parent,[crescent,cross],[],.2,camera)
  assert.equal(drawn.has('moon'),false);assert.equal(drawn.has('cross'),true)
  assert.equal(f.images[0].refs,0)
 }
 const f=fixture()
 assert.equal(f.art.syncTower(f.parent,[crescent],[],.5,camera).size,0)
 f.load('crescent')
 assert.ok(f.art.syncTower(f.parent,[{...crescent,x:600}],[],.6,camera).has('moon'))
 assert.equal(f.art.actors.get('moon').node.x,600)
})

test('invalid, hostile, foreign and expired objects cannot claim the sword-qi renderer',()=>{
 const {art,parent}=ready()
 const rejects=[null,{...crescent,id:'hostile',hostile:true},{...crescent,id:'other',source:'sj_yujian'},
  {...crescent,id:'bad-kind',bladeKind:'other'},{...crescent,id:'zero',width:0},
  {...crescent,id:'infinite',x:Infinity},{...crescent,id:'future',startedAt:1},
  {...crescent,id:'expired',expiresAt:.1},{...crescent,id:'bad-shape',shape:'circle'},
  {...crescent,id:'zero-direction',dirX:0,dirY:0,vx:0,vy:0}]
 assert.deepEqual([...art.syncTower(parent,[...rejects,crescent],[],.2,camera)],['moon'])
})

test('reset, rewind, parent loss and destruction clean pools and balance both image refs',()=>{
 const f=ready();f.art.syncTower(f.parent,[crescent,cross],[],.5,camera)
 f.art.syncTower(f.parent,[],[],.2,camera)
 assert.equal(f.art.actors.size,0);assert.equal(f.art.pool.length,0)
 f.art.syncTower(f.parent,[crescent],[],.2,camera);f.parent.isValid=false
 assert.equal(f.art.syncTower(f.parent,[crescent],[],.3,camera).size,0)
 assert.equal(f.art.actors.size,0)
 f.art.destroy();assert.ok(f.images.every(image=>image.refs===0))
 const late=fixture();late.art.preload();late.art.destroy();late.load('crescent');late.load('cross')
 assert.ok(late.images.every(image=>image.refs===0))
})
