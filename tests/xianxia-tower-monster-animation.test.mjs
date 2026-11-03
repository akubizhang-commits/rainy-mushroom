import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { stripTypeScriptTypes } from 'node:module'
import { runInNewContext } from 'node:vm'
import { ARCHETYPES } from '../js/xianxia/TowerContent.js'

// Real renderer and delivered atlas; only Cocos GPU/resource boundaries are fake.
const source = stripTypeScriptTypes(readFileSync(new URL('../cocos-pilot/assets/scripts/TowerMonsterArt.ts', import.meta.url),'utf8')
  .replace(/^import .*$/gm,''), {mode:'transform'}).replace(/^export /gm,'')
const resource = name => new URL('../cocos-pilot/assets/resources/tower-monsters-motion/'+name,import.meta.url)
const manifest = JSON.parse(readFileSync(resource('boar.json'),'utf8'))
const copy = value => JSON.parse(JSON.stringify(value))
class Node {
  constructor(name='') { Object.assign(this,{name,layer:1,children:[],components:new Map(),isValid:true,active:true}) }
  addChild(n) { n.removeFromParent(); n.parent=this; this.children.push(n) }
  addComponent(Type) { const c=new Type(); c.node=this; this.components.set(Type,c); return c }
  getComponent(Type) { return this.components.get(Type) }
  setPosition(x,y) { this.position={x,y} }
  setScale(x,y,z) { this.scale={x,y,z} }
  removeFromParent() { if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this); this.parent=null }
  destroy() { this.isValid=false; this.removeFromParent(); for(const n of [...this.children])n.destroy() }
}
class UITransform {
  setContentSize(width,height) { this.contentSize={width,height} }
  setAnchorPoint(x,y) { this.anchor={x,y} }
}
class Sprite { static SizeMode={CUSTOM:0}; spriteFrame=null }
class SpriteFrame { isValid=true; destroy(){this.isValid=false} }
class Texture2D { static Filter={LINEAR:0}; isValid=true; setFilters(){} destroy(){this.isValid=false} }
class ImageAsset {
  constructor(width=256,height=256){Object.assign(this,{width,height,refs:0})}
  addRef(){this.refs++;return this} decRef(){this.refs--;return this}
}
class JsonAsset { constructor(json){this.json=json} }
class Rect { constructor(x,y,width,height){Object.assign(this,{x,y,width,height})} }
class Size { constructor(width,height){Object.assign(this,{width,height})} }
function setup() {
  const requests=[]
  const context={ARCHETYPES,setTowerDepth:()=>{},Node,UITransform,Sprite,SpriteFrame,Texture2D,ImageAsset,JsonAsset,Rect,Size,
    isValid:n=>!!n?.isValid,resources:{load(path,Type,done){requests.push({path,Type,done})}}}
  const Art=runInNewContext('(() => {'+source+';return TowerMonsterArt})()',context)
  const art=new Art(),parent=new Node('monsters')
  const finish=(path,Type,asset,error=null)=>{
    const r=requests.find(r=>r.path===path&&r.Type===Type&&!r.finished)
    assert.ok(r,`pending ${path} / ${Type.name}`);r.finished=true;r.done(error,asset);return asset
  }
  const staticImage=(family='boar')=>finish('tower-monsters/'+family,ImageAsset,new ImageAsset())
  const motionImages=(data=JSON.parse(readFileSync(resource('boar-v3.json'),'utf8')))=>{
    const image=finish('tower-monsters-motion/boar-v3',ImageAsset,new ImageAsset(4096,3072))
    finish('tower-monsters-motion/boar-v3-enraged',ImageAsset,new ImageAsset(4096,3072))
    finish('tower-monsters-motion/boar-v3',JsonAsset,new JsonAsset(copy(data)))
    return image
  }
  const draw=(time,mode='windup',until=11,extra={})=>art.draw(parent,'boar1','boar',12,34,100,200,30,
    {time,worldY:50,ai:{mode,until,attack:{id:'a1',startedAt:10,active:.4,dirX:-1,...extra}}})
  return {art,parent,requests,finish,staticImage,motionImages,draw}
}
function frameName(art) {
  const frame=art.actors.get('boar1')?.sprite.spriteFrame
  return [...art.motionFrames,...art.rageFrames].find(([,value])=>value===frame)?.[0] || 'static'
}

test('spiders share stage resources while elite size remains independent from Boss size',()=>{
 const f=setup(),Art=f.art.constructor;
 assert.equal(Art.artFamily('spider','spider_normal'),'spider');
 assert.equal(Art.artFamily('spider','spider_boss'),'spider-lady');
 assert.equal(Art.artFamily('spider','spider_elite_chixiao'),'spider-lady');
 assert.equal(Art.artFamily('spider-queen'),'spider-queen'); // Reserved art is not a deployed archetype.
 for(const family of ['spider-lady','spider-queen']){
  const args=[f.parent,family,family,0,0,20,-20,34,{time:0,hp:100,worldY:0,role:'elite',ai:{mode:'approach'}}];
  f.art.draw(...args);
  f.staticImage(family);
  const size=f.art.draw(...args);
  assert.equal(size,24*3.2*1.12);
  const actor=f.art.actors.get(family);
  assert.equal(actor.node.position.y,size*.4);
  assert.equal(actor.sprite.spriteFrame.texture.image.width,256);
 }
 assert.ok(f.requests.every(r=>!r.path.startsWith('tower-monsters-motion/')),'static portraits must not claim another animal’s animation');
 f.art.beginFrame();f.art.endFrame(1,new Set(['spider-lady','spider-queen']));
 assert.equal(f.art.actors.size,0,'killed static portraits leave no ghost actor');
});

test('runtime atlas exactly preserves the delivered pixels and rectangles; unapproved walking loop is absent',()=>{
  const png=readFileSync(resource('boar.png'))
  assert.equal(png.readUInt32BE(16),manifest.width);assert.equal(png.readUInt32BE(20),manifest.height)
  assert.equal(png[25],6)
  assert.equal(createHash('sha256').update(png).digest('hex'),manifest.sourceSha256)
  const handed=JSON.parse(readFileSync(new URL('../design/sect-scene-2026-10-29/boar-handoff/boar-review-atlas.json',import.meta.url),'utf8'))
  assert.equal(Object.keys(manifest.frames).length,62)
  for(const [key,f] of Object.entries(manifest.frames)){
    const r=handed.frames[key].frame
    assert.deepEqual({x:f.x,y:f.y,w:f.w,h:f.h},r)
    assert.equal(f.w,252);assert.equal(f.x%256,2);assert.equal(f.y%256,2)
  }
  assert.equal(manifest.clips.locomotion,undefined)
  assert.deepEqual(manifest.damageEvents,[])
  for(const clip of Object.values(manifest.clips))assert.equal(clip.loop,false)
})

test('approved boar pack selects movement, charge, enrage, hit and confirmed death without mutating combat',()=>{
 const f=setup();f.draw(10);f.staticImage();f.motionImages();
 const render=(time,extra={})=>{f.art.beginFrame();f.art.draw(f.parent,'boar1','boar',12,34,100,200,30,{time,hp:100,worldY:50,ai:{mode:'approach',until:0},...extra})};
 render(10);render(10.1,{moving:true});assert.match(frameName(f.art),/^move-/);
 render(11,{mechanic:{skillId:'M06',phase:'windup',startedAt:10,until:12,chargeX:0}});assert.match(frameName(f.art),/^charge-start-/);
 render(12,{mechanic:{skillId:'M06',phase:'active',startedAt:10,until:14}});assert.match(frameName(f.art),/^charge-loop-/);
 render(14,{mechanic:{skillId:'M06',phase:'recovery',startedAt:10,until:16}});assert.match(frameName(f.art),/^charge-end-/);
 render(17,{mechanic:{skillId:'M02',phase:'windup',startedAt:17,until:18.5}});assert.match(frameName(f.art),/^enrage-/);
 render(19,{hp:90,mechanic:{enraged:true,phase:'idle'}});assert.match(frameName(f.art),/^hit-/);
 const a=f.art.actors.get('boar1');assert.equal(a.sprite.spriteFrame.texture,f.art.rageTexture);
 const frame=a.sprite.spriteFrame;render(19,{hp:90,mechanic:{enraged:true}});assert.equal(a.sprite.spriteFrame,frame,'pause freezes damage reaction');
 f.art.beginFrame();f.art.endFrame(20,new Set(['boar1']),()=>({x:22,y:44}));assert.equal(f.parent.children.length,1);assert.match(frameName(f.art),/^death-/);assert.equal(a.node.scale.y,1);assert.equal(a.sprite.spriteFrame.texture,f.art.motionTexture,'death ends the red state immediately');
 f.art.beginFrame();f.art.endFrame(20,new Set(['boar1']));assert.equal(f.parent.children.length,1,'pause retains corpse');
 f.art.beginFrame();f.art.endFrame(22,new Set(['boar1']));assert.equal(f.parent.children.length,0);f.art.destroy();
})

test('undelivered species and legacy callers retain static rendering',()=>{
  const f=setup()
  f.art.draw(f.parent,1,'bear',0,0,0,1,25,{time:1,ai:{mode:'active',until:2}})
  f.staticImage('bear')
  assert.equal(f.art.draw(f.parent,1,'bear',0,0,0,1,25),80)
  f.art.draw(f.parent,2,'boar',0,0,0,1,25);f.staticImage()
  assert.equal(f.requests.filter(r=>r.path.startsWith('tower-monsters-motion/')).length,0)
  f.art.destroy()
})

test('missing or invalid motion falls back to static without leaking images or retry storms',()=>{
  for(const invalid of [false,true]){
    const f=setup();f.draw(10);f.staticImage()
    if(invalid){const bad=JSON.parse(readFileSync(resource('boar-v3.json'),'utf8'));bad.frames['move-000'].x=9000;const image=f.motionImages(bad);assert.equal(image.refs,0)}
    else f.finish('tower-monsters-motion/boar-v3',ImageAsset,null,Error('missing'))
    for(let i=0;i<3;i++){assert.equal(f.draw(10.5),96);assert.equal(frameName(f.art),'static')}
    assert.equal(f.requests.filter(r=>r.path.startsWith('tower-monsters-motion/')).length,3)
    f.art.destroy()
  }
})

test('async completion after clear does not create nodes; completion after destroy retains no resources',()=>{
  for(const destroy of [false,true]){
    const f=setup();f.draw(10);const staticImage=f.staticImage()
    f.art.clearBindings();if(destroy)f.art.destroy()
    const image=f.motionImages();assert.equal(f.parent.children.length,0)
    assert.equal(image.refs,destroy?0:1)
    if(!destroy){f.draw(10.5);assert.equal(f.parent.children.length,1);f.art.destroy()}
    assert.equal(image.refs,0);assert.equal(staticImage.refs,0)
  }
})

test('actor removal and recycled IDs do not retain phase clocks or sprite bindings',()=>{
  const f=setup();f.draw(11.4,'recovery',12);f.staticImage();f.motionImages();f.draw(11.4,'recovery',12)
  f.art.beginFrame();f.art.endFrame()
  assert.equal(f.parent.children.length,0);assert.equal(f.art.phaseTracks.size,0)
  f.draw(1,'windup',2,{startedAt:1,id:'new-run'})
  assert.equal(frameName(f.art),'gore-000')
  f.art.destroy()
})

test('runtime pack has 187 matching normal and red cells with a fixed ground anchor',()=>{
 const data=JSON.parse(readFileSync(resource('boar-v3.json'),'utf8'));
 assert.equal(Object.keys(data.frames).length,187);
 assert.ok(Object.values(data.frames).every(f=>f.w===256&&f.h===256),'runtime must preserve native 256px frames');
 assert.deepEqual(Object.keys(data.clips),['move','gore','charge-start','charge-loop','charge-end','enrage','hit','death']);
 for(const name of ['boar-v3.png','boar-v3-enraged.png']){const p=readFileSync(resource(name));assert.equal(p.readUInt32BE(16),data.width);assert.equal(p.readUInt32BE(20),data.height);assert.equal(p[25],6)}
 assert.ok(data.anchor[1]>.8&&data.anchor[1]<.9);
 assert.deepEqual(data.damageEvents,[]);
});
test('gore phases follow the attack clock, while repeated paused draws preserve moving pose',()=>{
 const f=setup();f.draw(10);f.staticImage();f.motionImages();f.draw(10.5);
 assert.equal(frameName(f.art),'gore-008');f.draw(11,'active',11.4);assert.equal(frameName(f.art),'gore-016');
 f.draw(11.39,'active',11.4);assert.equal(frameName(f.art),'gore-021');
 f.draw(11.4,'recovery',12);assert.equal(frameName(f.art),'gore-022');f.draw(12,'recovery',12);assert.equal(frameName(f.art),'gore-031');
 const motion={time:13,worldY:50,hp:100,ai:{mode:'approach',until:0}};
 const before=copy(motion);f.art.draw(f.parent,'boar1','boar',12,34,110,200,30,motion);
 assert.match(frameName(f.art),/^move-/);const pose=f.art.actors.get('boar1').sprite.spriteFrame;
 f.art.draw(f.parent,'boar1','boar',12,34,110,200,30,motion);assert.strictEqual(f.art.actors.get('boar1').sprite.spriteFrame,pose);assert.deepEqual(motion,before);
 f.art.beginFrame();f.art.endFrame(13,new Set());assert.equal(f.parent.children.length,0,'offscreen removal must not create an unconfirmed death');f.art.destroy();
});

test('boar boss is twice the prior base size and death preserves boss size while ending rage',()=>{
 const f=setup();f.draw(10);f.staticImage();f.motionImages();
 const draw=(role)=>f.art.draw(f.parent,'boar1','boar',12,34,100,200,30,{time:10,worldY:50,role,ai:{mode:'approach',until:0},mechanic:{enraged:role==='boss'}});
 assert.equal(draw('normal'),26*3.2);assert.equal(draw('boss'),220);
 const a=f.art.actors.get('boar1');assert.equal(a.transform.contentSize.width,220);assert.equal(a.node.position.y,34);
 f.art.beginFrame();f.art.endFrame(11,new Set(['boar1']));
 assert.equal(a.transform.contentSize.width,220);assert.equal(a.node.scale.y,1);assert.equal(a.sprite.spriteFrame.texture,f.art.motionTexture);
 f.art.destroy();
});


test('wolf loads only its native atlas; bite phases, summon, pause and boss death retain their contract',()=>{
 const f=setup(), data=JSON.parse(readFileSync(resource('wolf-v1.json'),'utf8'));
 const render=(time,extra={})=>{f.art.beginFrame();return f.art.draw(f.parent,'wolf1','wolf',20,30,50,0,40,{time,hp:100,worldY:70,role:'boss',ai:{mode:'approach',until:0},...extra})};
 render(1);const image=f.staticImage('wolf');
 const texture=f.finish('tower-monsters-motion/wolf-v1',ImageAsset,new ImageAsset(data.width,data.height));
 f.finish('tower-monsters-motion/wolf-v1',JsonAsset,new JsonAsset(data));
 assert.equal(f.requests.filter(r=>r.path.includes('enraged')).length,0);
 assert.equal(render(1),220);const wolf=f.art.speciesRenderers.get('wolf'),actor=wolf.actors.get('wolf1');
 const name=()=>[...wolf.motionFrames].find(([,v])=>v===actor.sprite.spriteFrame)?.[0];
 render(2,{moving:true});render(2.4,{moving:true});assert.match(name(),/^move-/);const frozen=actor.sprite.spriteFrame;render(2.4,{moving:true});assert.equal(actor.sprite.spriteFrame,frozen);
 for(const [mode,time,until,min,max] of [['windup',3,3.9,0,10],['active',3.9,4.06,11,16],['recovery',4.06,4.91,17,27]]){
  render(time,{ai:{mode,until,attack:{id:'bite1',startedAt:3,active:.16,dirX:-1}}});const n=Number(name().split('-')[1]);assert.ok(n>=min&&n<=max,mode);
 }
 render(5,{mechanic:{skillId:'M05',phase:'windup',startedAt:5,until:7.2}});assert.match(name(),/^howl-/);
 render(7.2,{mechanic:{skillId:'M05',phase:'recovery',startedAt:5,until:9.2}});assert.ok(Number(name().split('-')[1])>=14);
 render(10,{hp:90});assert.match(name(),/^hit-/);
 f.art.beginFrame();f.art.endFrame(11,new Set(['wolf1']));assert.match(name(),/^death-/);assert.equal(actor.transform.contentSize.width,220);assert.equal(actor.node.scale.y,1);
 f.art.beginFrame();f.art.endFrame(11,new Set(['wolf1']));assert.match(name(),/^death-000$/);
 f.art.beginFrame();f.art.endFrame(13,new Set(['wolf1']));assert.equal(wolf.actors.size,0);
 f.art.destroy();assert.equal(texture.refs,0);assert.equal(image.refs,0);
});

test('approved 512px portraits load, keep front-facing anatomy and separate boss scale',()=>{
 for(const family of ['crocodile','rhino','yak','bat','falcon']){
  const f=setup();const render=(role,playerX)=>f.art.draw(f.parent,'portrait',family,0,0,100,playerX,40,{time:10,hp:100,role,worldY:0,ai:{mode:'approach',until:0}});
  assert.equal(render('normal',0),0);
  f.finish('tower-monsters/'+family,ImageAsset,new ImageAsset(512,512));
  const normal=render('normal',0),boss=render('boss',200);
  assert.ok(boss>normal);assert.equal(boss,['bat','falcon'].includes(family)?275:220);
  assert.equal(f.requests.length,1,'static portraits must not request a motion atlas');
  if(family==='spider'){
   assert.equal(f.art.actors.get('portrait').node.scale.x,1);
   render('boss',0);assert.equal(f.art.actors.get('portrait').node.scale.x,1);
  }
  f.art.beginFrame();f.art.endFrame(11,new Set(['portrait']));assert.equal(f.art.actors.size,0);
 }
});

test('side-facing crocodiles spawn toward the player and turn while approaching',()=>{
 for(const role of ['normal','elite','boss']){
  const f=setup();
  const render=(id,worldX,playerX)=>f.art.draw(f.parent,id,'crocodile',0,0,worldX,playerX,30,
   {time:10,role,worldY:0,ai:{mode:'approach',until:0}});
  render('left',100,0);f.staticImage('crocodile');
  render('left',100,0);
  assert.equal(f.art.actors.get('left').node.scale.x,1,'left-facing source points toward player on left');
  render('right',-100,0);
  assert.equal(f.art.actors.get('right').node.scale.x,-1,'source must mirror toward player on right');
  render('left',90,0);
  assert.equal(f.art.actors.get('left').node.scale.x,1);
  render('left',100,200);
  assert.equal(f.art.actors.get('left').node.scale.x,-1);
 }
});

test('static side-facing monsters keep the attack direction when displaced or flanked',()=>{
 for(const family of ['crocodile','bear','tiger','snake','scorpion','centipede','falcon']){
  const f=setup();
  const render=(x,playerX,mode,dirX)=>f.art.draw(f.parent,'attacker',family,0,0,x,playerX,30,
   {time:10,role:'boss',worldY:0,ai:{mode,until:11,attack:{id:'a',startedAt:10,active:.2,dirX}}});
  render(0,-100,'approach',-1);f.staticImage(family);
  render(0,-100,'windup',-1);
  render(10,100,'active',-1);
  assert.equal(f.art.actors.get('attacker').node.scale.x,1,`${family}: left attack overrides right displacement and flanking`);
  render(0,-100,'recovery',1);
  assert.equal(f.art.actors.get('attacker').node.scale.x,-1,`${family}: right attack overrides left displacement`);
  render(-10,-100,'approach',1);
  assert.equal(f.art.actors.get('attacker').node.scale.x,1,'approach ignores the stale attack');
 }
});


test('rank-seven white tiger owns its portrait and scales around its feet',()=>{
 const f=setup(),Art=f.art.constructor;
 assert.equal(Art.artFamily('tiger','tiger_boss_zhenyan'),'white-tiger');
 assert.equal(Art.artFamily('tiger','tiger_elite'),'tiger-humanoid');
 const args=[f.parent,'human-white-tiger','white-tiger',0,0,100,-100,42,{time:0,hp:100,worldY:0,role:'boss',ai:{mode:'approach'}}];
 f.art.draw(...args);f.staticImage('white-tiger');
 assert.equal(f.art.draw(...args),220);
 const actor=f.art.actors.get('human-white-tiger');
 assert.equal(actor.node.position.y,0);
 assert.ok(Math.abs(actor.transform.anchor.y-.1)<1e-10);
 assert.ok(f.requests.every(r=>!r.path.startsWith('tower-monsters-motion/')));
});


test('rank-five snake boss portrait leaves lower-rank snakes unchanged',()=>{
 const f=setup(),Art=f.art.constructor;
 assert.equal(Art.artFamily('snake','snake_boss'),'snake-lady');
 for(const id of ['snake_normal','snake_elite'])assert.equal(Art.artFamily('snake',id),'snake');
 const args=[f.parent,'snake-boss','snake-lady',0,0,100,-100,42,{time:0,hp:100,worldY:0,role:'boss',ai:{mode:'approach'}}];
 f.art.draw(...args);f.staticImage('snake-lady');
 assert.equal(f.art.draw(...args),220);
 const actor=f.art.actors.get('snake-boss');
 assert.equal(actor.node.position.y,0);
 assert.ok(Math.abs(actor.transform.anchor.y-.1)<1e-10);
 assert.ok(f.requests.every(r=>!r.path.startsWith('tower-monsters-motion/')));
});

test('bear portraits follow form stage and preserve role sizes and ground anchor',()=>{
 const f=setup(),Art=f.art.constructor;
 for(const a of ARCHETYPES.filter(a=>a.species==='bear'))assert.equal(Art.artFamily('bear',a.id),a.rank>=4&&a.rank<=6?'bear-humanoid':'bear');
 for(const role of ['normal','elite','boss']){
  const args=[f.parent,role,'bear-humanoid',0,0,100,-100,32,{time:0,hp:100,worldY:0,role,ai:{mode:'approach'}}];
  f.art.draw(...args);if(role==='normal')f.staticImage('bear-humanoid');
  const size=f.art.draw(...args);assert.equal(size,Art.bodySize('bear',role,32));
  assert.equal(f.art.actors.get(role).node.position.y,0);
 }
 assert.ok(f.requests.every(r=>!r.path.startsWith('tower-monsters-motion/')));
});

test('low-rank spider owns its atlas, phases and frontal pose; death uses existing removal',()=>{
 const f=setup(),data=JSON.parse(readFileSync(resource('spider-v1.json'),'utf8'));
 const render=(time,extra={})=>{f.art.beginFrame();return f.art.draw(f.parent,'spider1','spider',20,30,50,0,24,{time,hp:100,worldY:70,role:'normal',ai:{mode:'approach',until:0},...extra})};
 render(1);const image=f.staticImage('spider');
 const texture=f.finish('tower-monsters-motion/spider-v1',ImageAsset,new ImageAsset(data.width,data.height));
 f.finish('tower-monsters-motion/spider-v1',JsonAsset,new JsonAsset(data));
 assert.equal(f.requests.length,3);assert.equal(render(1),24*3.2);
 const spider=f.art.speciesRenderers.get('spider'),actor=spider.actors.get('spider1');
 const name=()=>[...spider.motionFrames].find(([,v])=>v===actor.sprite.spriteFrame)?.[0];
 render(2,{moving:true});render(2.4,{moving:true});assert.match(name(),/^move-/);const frozen=actor.sprite.spriteFrame;render(2.4,{moving:true});assert.equal(actor.sprite.spriteFrame,frozen);
 for(const [mode,time,until,range]of[['windup',3,4,[0,11]],['active',4,4.2,[12,17]],['recovery',4.2,5,[18,24]]]){
  render(time,{ai:{mode,until,attack:{id:'spider-bite',startedAt:3,active:.2,dirX:1}}});const n=Number(name().split('-')[1]);assert.ok(n>=range[0]&&n<=range[1]);assert.equal(actor.node.scale.x,1);
 }
 for(const [phase,time,until,first]of[['windup',6,7.2,0],['recovery',7.2,8.2,10]]){
  const motion={mechanic:{skillId:'M10',phase,startedAt:6,until}};const before=copy(motion);render(time,motion);assert.equal(name(),`cast-${String(first).padStart(3,'0')}`);assert.deepEqual(motion,before);
 }
 render(9,{hp:90});assert.match(name(),/^hit-/);render(9.2,{hp:80});assert.equal(name(),'hit-000');
 assert.equal(actor.sprite.spriteFrame.rect.width,256);assert.equal(actor.transform.anchor.y,1-data.anchor[1]);assert.equal(actor.node.position.y,30);
 f.art.beginFrame();f.art.endFrame(10,new Set(['spider1']));assert.equal(spider.actors.size,0);assert.equal(data.clips.death,undefined);
 assert.equal(f.art.constructor.artFamily('spider','spider_boss'),'spider-lady');
 const png=readFileSync(resource('spider-v1.png'));assert.equal(png.readUInt32BE(16),data.width);assert.equal(png.readUInt32BE(20),data.height);assert.equal(png[25],6);assert.equal(createHash('sha256').update(png).digest('hex'),data.sourceSha256);
 assert.deepEqual(data.damageEvents,[]);f.art.destroy();assert.equal(texture.refs,0);assert.equal(image.refs,0);
});
