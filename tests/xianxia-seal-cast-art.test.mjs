import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {stripTypeScriptTypes} from 'node:module'
import {runInNewContext} from 'node:vm'

class Node {
  isValid=true;active=true;layer=1;components=new Map();children=[]
  constructor(name){this.name=name}
  addChild(n){n.parent=this;this.children.push(n)}
  addComponent(C){const c=new C();c.node=this;this.components.set(C,c);return c}
  getComponent(C){return this.components.get(C)}
  setPosition(x,y){this.position={x,y}}
  setScale(x,y,z){this.scale={x,y,z}}
  removeFromParent(){this.parent=null}
  destroy(){this.isValid=false}
}
class UITransform {setContentSize(w,h){this.size=[w,h]}setAnchorPoint(x,y){this.anchor=[x,y]}}
class Sprite {static SizeMode={CUSTOM:1}}
class SpriteFrame {isValid=true;destroy(){this.isValid=false}}
class Texture2D {
  static Filter={LINEAR:1}
  set image(value){this.uploadedImage=value;this.mipFilterAtUpload=this.mipFilter}
  get image(){return this.uploadedImage}
  setMipFilter(value){this.mipFilter=value}
  setFilters(){}
  destroy(){}
}
class Graphics {clear(){}moveTo(){}lineTo(){}close(){}fill(){}stroke(){}circle(){}}
class Color {constructor(value){this.value=value}}
class ImageAsset {refs=0;addRef(){this.refs++}decRef(){this.refs--}}
class JsonAsset {}
class Rect {constructor(x,y,width,height){Object.assign(this,{x,y,width,height})}}
class Size {constructor(width,height){Object.assign(this,{width,height})}}
function fixture(options){
  const requests=[]
  const qualityCode=stripTypeScriptTypes(readFileSync(new URL('../cocos-pilot/assets/scripts/WeaponQualityArt.ts',import.meta.url),'utf8')
    .replace(/^import .*$/gm,''),{mode:'transform'}).replace(/^export /gm,'')
  const WeaponQualityArt=runInNewContext(`(()=>{${qualityCode};return WeaponQualityArt})()`,{Color,Graphics})
  const code=stripTypeScriptTypes(readFileSync(new URL('../cocos-pilot/assets/scripts/TowerCharacterArt.ts',import.meta.url),'utf8')
    .replace(/^import .*$/gm,''),{mode:'transform'}).replace(/^export /gm,'')
  const Art=runInNewContext(`(()=>{${code};return TowerCharacterArt})()`,{
    Node,UITransform,Sprite,SpriteFrame,Texture2D,Graphics,Color,ImageAsset,JsonAsset,Rect,Size,WeaponQualityArt,
    isValid:n=>n?.isValid===true,equipmentTier:()=>({color:'#fff'}),isStarterEquipment:()=>false,
    resources:{load:(path,Type,done)=>requests.push({path,Type,done})},
  })
  const art=new Art(options),parent=new Node('world')
  const atlas={version:1,width:2048,height:384,cellWidth:256,cellHeight:384,facing:'right',
    anchor:[133,285],bodyHeight:160,
    frames:Array.from({length:8},(_,i)=>({x:i*256,y:0,w:256,h:384,grip:[150,210],guard:[164,220],direction:[1,1]})),
    clips:{idle:{frames:[0],fps:1,loop:true},walk:{frames:[1,2],fps:12,loop:true},
      run:{frames:[3,4],fps:12,loop:true},slash:{frames:[5,6,7],hitFrame:1,fps:10,loop:false}}}
  const s={time:10,phase:'fighting',player:{hp:100,faceX:1,x:0,y:0,moveSpeed:100},loadout:{}}
  art.draw(parent,s,0,0,false)
  for(const req of requests.filter(r=>r.path==='tower-character/ground-actions')){
    const a=new req.Type();if(req.Type===ImageAsset){a.width=2048;a.height=384}else a.json=atlas
    req.done(null,a)
  }
  art.draw(parent,s,0,0,false)
  const seal={...atlas,width:2048,height:1024,cellWidth:512,cellHeight:512,bodyHeight:370,anchor:[258,441],
    frames:Array.from({length:8},(_,i)=>({x:(i%4)*512,y:Math.floor(i/4)*512,w:512,h:512,
      grip:[200,260],guard:[220,250],direction:[i<4?1:-1,-.3]})),
    clips:{}}
  for(const [side,offset] of [['right',0],['left',4]]){
    seal.clips[side+'Windup']={frames:[offset,offset+1],fps:12,loop:false}
    seal.clips[side+'Hold']={frames:[offset+2],fps:12,loop:true}
    seal.clips[side+'Recovery']={frames:[offset+3],fps:12,loop:false}
  }
  return {art,parent,s,seal,requests}
}
test('menu portrait skips unused seal resources while retaining the shared character renderer',()=>{
 const {art,requests}=fixture({sealActions:false})
 assert.equal(requests.some(r=>r.path==='tower-character/seal-actions'),false)
 assert.ok(art.body.spriteFrame)
 art.destroy()
})
test('seal uses directional frames and simulation timing while sword qi retains slash',()=>{
  const {art,parent,s,seal}=fixture()
  art.sealAtlas=seal;art.sealFrames=seal.frames.map(f=>Object.assign(new SpriteFrame(),{rect:f}))
  s.actions={current:{skill:'sj_yujian',startedAt:10,releaseAt:10.3,endsAt:10.5,dirX:1}}
  s.time=10.16;art.draw(parent,s,17,20,false)
  assert.equal(art.body.spriteFrame,art.sealFrames[1],'windup must use authored seal')
  s.time=10.3;art.draw(parent,s,17,20,false)
  assert.equal(art.body.spriteFrame,art.sealFrames[2],'release holds upright fingers')
  const frozen=art.body.spriteFrame,unchanged=JSON.stringify(s)
  art.draw(parent,s,17,20,false);assert.equal(art.body.spriteFrame,frozen)
  assert.equal(JSON.stringify(s),unchanged,'renderer must not mutate combat or saves')
  s.actions.current.dirX=-1;s.player.faceX=-1;art.draw(parent,s,17,20,true)
  assert.equal(art.body.spriteFrame,art.sealFrames[6],'flight uses authored left-facing seal')
  assert.ok(art.root.scale.x>0,'never mirror seal hands')
  s.time=10.49;art.draw(parent,s,17,20,true)
  assert.equal(art.body.spriteFrame,art.sealFrames[7],'recover before action ends')
  s.actions.current.skill='sj_arc';s.actions.current.dirX=1;s.time=10.3
  art.draw(parent,s,17,20,false)
  assert.equal(art.body.spriteFrame,art.frames[6],'sword qi keeps slash')
  s.player.hp=0;art.draw(parent,s,17,20,false);assert.equal(art.root.active,false)
  art.destroy();assert.equal(frozen.isValid,false)
})
test('equipped weapon art switches safely, keeps original color, and releases late loads',()=>{
  const {art,parent,s,requests}=fixture()
  s.loadout.weapon={definitionId:'eq_sword_suwen',tier:'fa'}
  art.draw(parent,s,0,0,false)
  const req=requests.find(r=>r.path==='tower-held-weapons-v2/eq_sword_suwen')
  assert.ok(req,'equipped sword must request its own artwork')
  s.loadout.weapon={definitionId:'eq_sword_zhenyue',tier:'bao'}
  art.draw(parent,s,0,0,false)
  const old=new ImageAsset();old.width=700;old.height=80;req.done(null,old)
  art.draw(parent,s,0,0,false)
  assert.equal(art.heldBlade.node.active,false,'old sword must not flash during new load')
  const current=requests.find(r=>r.path==='tower-held-weapons-v2/eq_sword_zhenyue')
  const image=new ImageAsset();image.width=700;image.height=80;current.done(null,image)
  const before=JSON.stringify(s)
  art.draw(parent,s,0,0,false)
  assert.equal(art.heldBlade.node.active,true)
  assert.equal(art.heldBlade.color.value,'#ffffff','tier must not tint source art')
  assert.equal(JSON.stringify(s),before,'presentation cannot change run/save state')
  s.loadout.weapon={definitionId:'unknown',tier:'fa'}
  art.draw(parent,s,0,0,false)
  assert.equal(art.heldBlade.node.active,false,'unmapped weapons use neutral fallback')
  assert.equal(art.sword.fillColor.value,'#dce4e6')
  art.destroy();assert.equal(image.refs,0);assert.equal(old.refs,0)
})
test('held sword enables minification filtering before uploading the full-resolution image',()=>{
  const {art,parent,s,requests}=fixture()
  s.loadout.weapon={definitionId:'eq_sword_suwen',tier:'fa'}
  art.draw(parent,s,0,0,false)
  const req=requests.find(r=>r.path.endsWith('/eq_sword_suwen'))
  const image=new ImageAsset();image.width=1024;image.height=128
  req.done(null,image);art.draw(parent,s,0,0,false)
  const texture=art.heldBlade.spriteFrame.texture
  assert.equal(texture.mipFilterAtUpload,Texture2D.Filter.LINEAR,
    'setting the filter after image upload cannot allocate generated mip levels')
  assert.equal(texture.image,image,'keep the high-resolution source available for close views')
  art.destroy();assert.equal(image.refs,0)
})
test('missing weapon art keeps the neutral fallback and callbacks after destruction retain nothing',()=>{
  const {art,parent,s,requests}=fixture()
  s.loadout.weapon={definitionId:'eq_sword_suwen',tier:'fa'}
  art.draw(parent,s,0,0,false)
  requests.find(r=>r.path==='tower-held-weapons-v2/eq_sword_suwen').done(new Error('404'),null)
  art.draw(parent,s,0,0,false)
  assert.equal(art.heldBlade.node.active,false)
  assert.equal(art.sword.fillColor.value,'#dce4e6')
  s.loadout.weapon={definitionId:'eq_sword_zhenyue',tier:'bao'}
  art.draw(parent,s,0,0,false)
  const late=requests.find(r=>r.path==='tower-held-weapons-v2/eq_sword_zhenyue')
  art.destroy()
  const image=new ImageAsset();image.width=699;image.height=89
  late.done(null,image)
  assert.equal(image.refs,0)
  assert.equal(art.heldArt.size,0)
})
test('seal asset loader validates and releases its own image without breaking base art',()=>{
  const {art,parent,s,seal,requests}=fixture()
  const pending=requests.filter(r=>r.path==='tower-character/seal-actions')
  assert.equal(pending.length,2)
  const image=new ImageAsset();image.width=seal.width;image.height=seal.height
  for(const req of pending){const a=req.Type===ImageAsset?image:Object.assign(new JsonAsset(),{json:seal});req.done(null,a)}
  s.actions={current:{skill:'sj_formation',startedAt:10,releaseAt:10.3,endsAt:10.5,dirX:1}}
  s.time=10.3;art.draw(parent,s,0,0,false)
  assert.equal(art.body.spriteFrame,art.sealFrames[2])
  assert.equal(image.refs,1);art.destroy();assert.equal(image.refs,0)
})
test('flight sword qi advances riding slash frames, follows riding direction and freezes on pause',()=>{
 const {art,parent,s}=fixture()
 art.atlas.clips.flightSlash={...art.atlas.clips.slash,frames:[2,3,4]}
 for(const skill of ['sj_arc','sj_cross','sj_line','evo_tiandi','basic_attack']){
  s.player.faceX=-1;s.actions={current:{skill,startedAt:10,releaseAt:10.3,endsAt:10.5,dirX:1}}
  s.time=10.1;art.draw(parent,s,0,0,true)
  assert.equal(art.body.spriteFrame,art.frames[2],skill+' flight windup')
  s.time=10.3;art.draw(parent,s,0,0,true)
  assert.equal(art.body.spriteFrame,art.frames[3],skill+' flight release')
  assert.equal(art.visibleFacing,-1,'feet must face with riding sword')
  const frame=art.body.spriteFrame,pos={...art.root.position}
  art.draw(parent,s,0,0,true);assert.equal(art.body.spriteFrame,frame);assert.deepEqual(art.root.position,pos)
  s.time=10.51;art.draw(parent,s,0,0,true);assert.equal(art.body.spriteFrame,art.frames[1])
 }
})
