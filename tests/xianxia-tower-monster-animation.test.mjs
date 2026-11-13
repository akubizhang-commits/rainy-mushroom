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
const closeSize=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`)
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
class Color { constructor(r,g,b,a){Object.assign(this,{r,g,b,a})} }
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
  const context={Color,ARCHETYPES,setTowerDepth:()=>{},Node,UITransform,Sprite,SpriteFrame,Texture2D,ImageAsset,JsonAsset,Rect,Size,
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
  closeSize(size,148.93980582524273);
  const actor=(f.art.speciesRenderers.get(family)??f.art).actors.get(family);
  assert.equal(actor.node.position.y,size*.4);
  assert.equal(actor.sprite.spriteFrame.texture.image.width,256);
 }
 assert.ok(f.requests.filter(r=>r.path.startsWith('tower-monsters-motion/')).every(r=>r.path==='tower-monsters-motion/spider-lady-v1'),'spider lady loads only its own walk atlas; the reserved queen stays static');
 f.art.beginFrame();f.art.endFrame(1,new Set(['spider-lady','spider-queen']));
 assert.equal(f.art.actors.size,0,'killed static portraits leave no ghost actor');assert.equal(f.art.speciesRenderers.get('spider-lady').actors.size,0);
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
  f.art.draw(f.parent,1,'ape',0,0,0,1,25,{time:1,ai:{mode:'active',until:2}})
  f.staticImage('ape')
  assert.equal(f.art.draw(f.parent,1,'ape',0,0,0,1,25),80)
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

test('boar boss clears the high-rank elite size and death preserves boss size while ending rage',()=>{
 const f=setup();f.draw(10);f.staticImage();f.motionImages();
 const draw=(role)=>f.art.draw(f.parent,'boar1','boar',12,34,100,200,30,{time:10,worldY:50,role,ai:{mode:'approach',until:0},mechanic:{enraged:role==='boss'}});
 assert.equal(draw('normal'),26*3.2);closeSize(draw('boss'),237.952);
 const a=f.art.actors.get('boar1');closeSize(a.transform.contentSize.width,237.952);assert.equal(a.node.position.y,34);
 f.art.beginFrame();f.art.endFrame(11,new Set(['boar1']));
 closeSize(a.transform.contentSize.width,237.952);assert.equal(a.node.scale.y,1);assert.equal(a.sprite.spriteFrame.texture,f.art.motionTexture);
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
 for(const family of ['rhino','yak']){
  const f=setup();const render=(role,playerX)=>f.art.draw(f.parent,'portrait',family,0,0,100,playerX,40,{time:10,hp:100,role,worldY:0,ai:{mode:'approach',until:0}});
  assert.equal(render('normal',0),0);
  f.finish('tower-monsters/'+family,ImageAsset,new ImageAsset(512,512));
  const normal=render('normal',0),boss=render('boss',200);
  assert.ok(boss>normal);assert.equal(boss,['bat','falcon'].includes(family)?275:220);
  assert.equal(f.requests.length,3,'each upright Boss loads its own motion pack');
  if(family==='spider'){
   assert.equal(f.art.actors.get('portrait').node.scale.x,1);
   render('boss',0);assert.equal(f.art.actors.get('portrait').node.scale.x,1);
  }
  f.art.beginFrame();f.art.endFrame(11,new Set(['portrait']));assert.equal(f.art.actors.size,0);assert.equal(f.art.speciesRenderers.get('rhino')?.actors.size??0,0);f.art.destroy();
 }
});

test('side-facing crocodiles spawn toward the player and turn while approaching',()=>{
 for(const role of ['normal','elite','boss']){
  const f=setup();
  const render=(id,worldX,playerX)=>f.art.draw(f.parent,id,'crocodile',0,0,worldX,playerX,30,
   {time:10,role,worldY:0,ai:{mode:'approach',until:0}});
  render('left',100,0);f.staticImage('crocodile');
  render('left',100,0);
  assert.equal(f.art.speciesRenderers.get('crocodile').actors.get('left').node.scale.x,1,'left-facing source points toward player on left');
  render('right',-100,0);
  assert.equal(f.art.speciesRenderers.get('crocodile').actors.get('right').node.scale.x,-1,'source must mirror toward player on right');
  render('left',90,0);
  assert.equal(f.art.speciesRenderers.get('crocodile').actors.get('left').node.scale.x,1);
  render('left',100,200);
  assert.equal(f.art.speciesRenderers.get('crocodile').actors.get('left').node.scale.x,-1);
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
  assert.equal((f.art.speciesRenderers.get(family)||f.art).actors.get('attacker').node.scale.x,1,`${family}: left attack overrides right displacement and flanking`);
  render(0,-100,'recovery',1);
  assert.equal((f.art.speciesRenderers.get(family)||f.art).actors.get('attacker').node.scale.x,-1,`${family}: right attack overrides left displacement`);
  render(-10,-100,'approach',1);
  assert.equal((f.art.speciesRenderers.get(family)||f.art).actors.get('attacker').node.scale.x,1,'approach ignores the stale attack');
 }
});


test('rank-seven white tiger owns its portrait and scales around its feet',()=>{
 const f=setup(),Art=f.art.constructor;
 assert.equal(Art.artFamily('tiger','tiger_boss_zhenyan'),'white-tiger');
 assert.equal(Art.artFamily('tiger','tiger_elite'),'tiger-humanoid');
 const args=[f.parent,'human-white-tiger','white-tiger',0,0,100,-100,42,{time:0,hp:100,worldY:0,role:'boss',ai:{mode:'approach'}}];
 f.art.draw(...args);f.staticImage('white-tiger');
 closeSize(f.art.draw(...args),286.1110679611651);
 const actor=f.art.speciesRenderers.get('white-tiger').actors.get('human-white-tiger');
 assert.equal(actor.node.position.y,0);
 assert.ok(Math.abs(actor.transform.anchor.y-.1)<1e-10);
 assert.ok(f.requests.filter(r=>r.path.startsWith('tower-monsters-motion/')).every(r=>r.path==='tower-monsters-motion/white-tiger-v1'),'white tiger loads only its own walk atlas');
});


test('rank-five snake boss portrait leaves lower-rank snakes unchanged',()=>{
 const f=setup(),Art=f.art.constructor;
 assert.equal(Art.artFamily('snake','snake_boss'),'snake-lady');
 for(const id of ['snake_normal','snake_elite'])assert.equal(Art.artFamily('snake',id),'snake');
 const args=[f.parent,'snake-boss','snake-lady',0,0,100,-100,42,{time:0,hp:100,worldY:0,role:'boss',ai:{mode:'approach'}}];
 f.art.draw(...args);f.staticImage('snake-lady');
 closeSize(f.art.draw(...args),245.2380582524272);
 const actor=f.art.speciesRenderers.get('snake-lady').actors.get('snake-boss');
 assert.equal(actor.node.position.y,0);
 assert.ok(Math.abs(actor.transform.anchor.y-.1)<1e-10);
 assert.ok(f.requests.filter(r=>r.path.startsWith('tower-monsters-motion/')).every(r=>r.path==='tower-monsters-motion/snake-lady-v1'),'serpent queen loads only its own walk atlas');
});

test('bear portraits follow form stage and preserve role sizes and ground anchor',()=>{
 const f=setup(),Art=f.art.constructor;
 for(const a of ARCHETYPES.filter(a=>a.species==='bear'))assert.equal(Art.artFamily('bear',a.id),a.rank>=4&&a.rank<=6?'bear-humanoid':'bear');
 for(const role of ['normal','elite','boss']){
  const args=[f.parent,role,'bear-humanoid',0,0,100,-100,32,{time:0,hp:100,worldY:0,role,ai:{mode:'approach'}}];
  f.art.draw(...args);if(role==='normal')f.staticImage('bear-humanoid');
  const size=f.art.draw(...args);closeSize(size,{normal:114.82718446601942,elite:195.206213592233, boss:328.4057475728156}[role]);
  assert.equal(f.art.speciesRenderers.get('bear-humanoid').actors.get(role).node.position.y,0);
 }
 // The upright form owns only its walking atlas; the low-rank bear slam atlas is never shared.
 assert.deepEqual([...new Set(f.requests.filter(r=>r.path.startsWith('tower-monsters-motion/')).map(r=>r.path))],['tower-monsters-motion/bear-humanoid-v1']);
});

test('low-rank spider owns its atlas, phases and frontal pose; death holds frontal pose until cleanup',()=>{
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
 // Spider atlas has no death clip: the existing hit-000 pose on screen at death is held until cleanup.
 f.art.beginFrame();f.art.endFrame(10,new Set(['spider1']));assert.equal(spider.actors.size,1);assert.equal(name(),'hit-000');assert.equal(actor.node.scale.x,1);
 f.art.beginFrame();f.art.endFrame(10,new Set(['spider1']));assert.equal(name(),'hit-000');
 f.art.beginFrame();f.art.endFrame(11,new Set(['spider1']));assert.equal(name(),'hit-000');
 f.art.beginFrame();f.art.endFrame(13,new Set(['spider1']));assert.equal(spider.actors.size,0);
 assert.equal(f.art.constructor.artFamily('spider','spider_boss'),'spider-lady');
 const png=readFileSync(resource('spider-v1.png'));assert.equal(png.readUInt32BE(16),data.width);assert.equal(png.readUInt32BE(20),data.height);assert.equal(png[25],6);assert.equal(createHash('sha256').update(png).digest('hex'),data.sourceSha256);
 assert.deepEqual(data.damageEvents,[]);f.art.destroy();assert.equal(texture.refs,0);assert.equal(image.refs,0);
});

test('bat flight keeps native480 detail, pauses and falls back for undelivered combat',()=>{
 const f=setup(),data=JSON.parse(readFileSync(resource('bat-v1.json'),'utf8'));
 const render=(time,extra={})=>{f.art.beginFrame();return f.art.draw(f.parent,'bat1','bat',20,30,50,0,18,{time,hp:100,worldY:70,role:'boss',ai:{mode:'approach',until:0},...extra})};
 render(1);f.staticImage('bat');const image=f.finish('tower-monsters-motion/bat-v1',ImageAsset,new ImageAsset(data.width,data.height));f.finish('tower-monsters-motion/bat-v1',JsonAsset,new JsonAsset(data));
 assert.equal(render(1),275);const bat=f.art.speciesRenderers.get('bat'),a=bat.actors.get('bat1');assert.equal(a.sprite.spriteFrame.rect.width,480);const frame=a.sprite.spriteFrame;render(1);assert.equal(a.sprite.spriteFrame,frame);render(1.2);assert.notEqual(a.sprite.spriteFrame,frame);assert.equal(a.node.position.y,30);
 render(2,{ai:{mode:'windup',until:3,attack:{startedAt:2,active:.2,dirX:1}}});assert.equal(a.sprite.spriteFrame,bat.entries.get('bat').frame);
 // Ordinary bite: procedural lunge frames on the real phases; sonic shot keeps the portrait.
 const pose=()=>[...bat.motionFrames].find(([,fr])=>fr===a.sprite.spriteFrame)?.[0];
 render(1.2);const top0=a.top,bite={id:'bite1',kind:'bite',startedAt:2,active:.12,recovery:.7,dirX:-1};
 const phase=(time,mode,until)=>render(time,{ai:{mode,until,attack:bite}});
 phase(2,'windup',2.85);assert.equal(pose(),'bite-000');assert.equal(a.transform.contentSize.width,275*1.2333);assert.ok(Math.abs(a.top-top0)<.1,'label height stays put');
 phase(2.5,'windup',2.85);assert.equal(pose(),'bite-005');
 const frozen=a.sprite.spriteFrame;phase(2.5,'windup',2.85);assert.equal(a.sprite.spriteFrame,frozen);
 phase(2.85,'active',2.97);assert.equal(pose(),'bite-009');phase(2.94,'active',2.97);assert.equal(pose(),'bite-011');
 phase(2.97,'recovery',3.67);assert.equal(pose(),'bite-012');phase(3.66,'recovery',3.67);assert.equal(pose(),'bite-019');
 assert.equal(a.node.scale.x,1);assert.equal(a.node.position.y,30);
 render(3.7,{ai:{mode:'windup',until:4.55,attack:{...bite,kind:'shot'}}});assert.equal(a.sprite.spriteFrame,bat.entries.get('bat').frame);
 render(3.7,{ai:{mode:'windup',until:4.55,attack:bite},mechanic:{skillId:'M07',phase:'windup'}});assert.equal(a.sprite.spriteFrame,bat.entries.get('bat').frame);
 const bad=copy(data);bad.clips.bite.phases.recovery=[12,9];assert.equal(bat.validMotion(bad),false);
 render(3);f.art.beginFrame();f.art.endFrame(4,new Set(['bat1']));assert.equal(bat.actors.size,0);assert.equal(f.art.constructor.artFamily('bat','bat_elite_rank4'),'bat-humanoid');
 const png=readFileSync(resource('bat-v1.png'));assert.equal(png.readUInt32BE(16),2880);assert.equal(png.readUInt32BE(20),2880);assert.equal(createHash('sha256').update(png).digest('hex'),data.sourceSha256);f.art.destroy();assert.equal(image.refs,0);
});

test('falcon flight keeps native384 detail, pauses and falls back for undelivered comfalcon',()=>{
 const f=setup(),data=JSON.parse(readFileSync(resource('falcon-v1.json'),'utf8'));
 const render=(time,extra={})=>{f.art.beginFrame();return f.art.draw(f.parent,'falcon1','falcon',20,30,50,0,18,{time,hp:100,worldY:70,role:'boss',ai:{mode:'approach',until:0},...extra})};
 render(1);f.staticImage('falcon');const image=f.finish('tower-monsters-motion/falcon-v1',ImageAsset,new ImageAsset(data.width,data.height));f.finish('tower-monsters-motion/falcon-v1',JsonAsset,new JsonAsset(data));
 assert.equal(render(1),275);const falcon=f.art.speciesRenderers.get('falcon'),a=falcon.actors.get('falcon1');assert.equal(a.sprite.spriteFrame.rect.width,384);const frame=a.sprite.spriteFrame;render(1);assert.equal(a.sprite.spriteFrame,frame);render(1.2);assert.notEqual(a.sprite.spriteFrame,frame);assert.equal(a.node.position.y,30);
 render(2,{ai:{mode:'windup',until:3,attack:{startedAt:2,active:.2,dirX:1}}});assert.equal(a.sprite.spriteFrame,falcon.entries.get('falcon').frame);
 // Ordinary bite: procedural lunge frames on the real phases; feather shot keeps the portrait.
 const pose=()=>[...falcon.motionFrames].find(([,fr])=>fr===a.sprite.spriteFrame)?.[0];
 render(1.2);const top0=a.top,bite={id:'bite1',kind:'bite',startedAt:2,active:.12,recovery:.7,dirX:-1};
 const phase=(time,mode,until)=>render(time,{ai:{mode,until,attack:bite}});
 phase(2,'windup',2.85);assert.equal(pose(),'bite-000');assert.equal(a.transform.contentSize.width,275*1.5628) /* 2026-11-13: flight and bite frames match the hover portrait wingspan (×1.4566) */;assert.ok(Math.abs(a.top-top0)<.1,'label height stays put');
 phase(2.5,'windup',2.85);assert.equal(pose(),'bite-005');
 const frozen=a.sprite.spriteFrame;phase(2.5,'windup',2.85);assert.equal(a.sprite.spriteFrame,frozen);
 phase(2.85,'active',2.97);assert.equal(pose(),'bite-009');phase(2.94,'active',2.97);assert.equal(pose(),'bite-011');
 phase(2.97,'recovery',3.67);assert.equal(pose(),'bite-012');phase(3.66,'recovery',3.67);assert.equal(pose(),'bite-019');
 assert.equal(a.node.scale.x,1);assert.equal(a.node.position.y,30);
 render(3.7,{ai:{mode:'windup',until:4.55,attack:{...bite,kind:'shot'}}});assert.equal(a.sprite.spriteFrame,falcon.entries.get('falcon').frame);
 render(3.7,{ai:{mode:'windup',until:4.55,attack:bite},mechanic:{skillId:'M07',phase:'windup'}});assert.equal(a.sprite.spriteFrame,falcon.entries.get('falcon').frame);
 const bad=copy(data);bad.clips.bite.phases.recovery=[12,9];assert.equal(falcon.validMotion(bad),false);
 render(3);f.art.beginFrame();f.art.endFrame(4,new Set(['falcon1']));assert.equal(falcon.actors.size,0);assert.equal(f.art.constructor.artFamily('falcon','falcon_elite'),'falcon-humanoid');
 const png=readFileSync(resource('falcon-v1.png'));assert.equal(png.readUInt32BE(16),2304);assert.equal(png.readUInt32BE(20),2304);assert.equal(createHash('sha256').update(png).digest('hex'),data.sourceSha256);f.art.destroy();assert.equal(image.refs,0);
});

test('crocodile movement and sweep preserve detail, timing, pause and mechanic fallback',()=>{
 const f=setup(),data=JSON.parse(readFileSync(resource('crocodile-v1.json'),'utf8'));
 const render=(time,extra={})=>{f.art.beginFrame();return f.art.draw(f.parent,'crocodile1','crocodile',20,30,50,0,18,{time,hp:100,worldY:70,role:'boss',ai:{mode:'approach',until:0},...extra})};
 render(1);f.staticImage('crocodile');const image=f.finish('tower-monsters-motion/crocodile-v1',ImageAsset,new ImageAsset(2880,3840));f.finish('tower-monsters-motion/crocodile-v1',JsonAsset,new JsonAsset(data));
 closeSize(render(1),274.56);const crocodile=f.art.speciesRenderers.get('crocodile'),a=crocodile.actors.get('crocodile1');assert.equal(a.sprite.spriteFrame.rect.width,480);const frame=a.sprite.spriteFrame;render(1);assert.equal(a.sprite.spriteFrame,frame);render(1.2);assert.notEqual(a.sprite.spriteFrame,frame);assert.equal(a.node.position.y,30);
 const attack={id:'sweep1',startedAt:2,active:.18,recovery:.9,dirX:1};
 const pose=()=>[...crocodile.motionFrames].find(([,f])=>f===a.sprite.spriteFrame)?.[0];
 const phase=(time,mode,until,extra={})=>render(time,{ai:{mode,until,attack},...extra});
 phase(2,'windup',3);assert.equal(pose(),'sweep-000');
 phase(2.5,'windup',3);assert.equal(pose(),'sweep-004');
 const frozen=a.sprite.spriteFrame;phase(2.5,'windup',3);assert.equal(a.sprite.spriteFrame,frozen);
 phase(3,'active',3.18);assert.equal(pose(),'sweep-009');
 phase(3.1,'active',3.18);assert.equal(pose(),'sweep-010');
 phase(3.18,'recovery',4.08);assert.equal(pose(),'sweep-012');
 phase(4.07,'recovery',4.08);assert.equal(pose(),'sweep-023');
 assert.equal(a.node.scale.x,-1);assert.equal(a.node.position.y,30);
 phase(3.1,'active',3.18,{mechanic:{skillId:'M08',phase:'active'}});assert.equal(a.sprite.spriteFrame,crocodile.entries.get('crocodile').frame);
 phase(2.5,'windup',3);assert.equal(pose(),'sweep-004','loading mid-phase restores exact progress');
 const bad=copy(data);bad.clips.sweep.phases.active=[23,2];assert.equal(crocodile.validMotion(bad),false);
 assert.deepEqual(data.damageEvents,[]);
 render(3);f.art.beginFrame();f.art.endFrame(4,new Set(['crocodile1']));assert.equal(crocodile.actors.size,0);assert.equal(f.art.constructor.artFamily('crocodile','crocodile_boss'),'crocodile-humanoid');
 const png=readFileSync(resource('crocodile-v1.png'));assert.equal(png.readUInt32BE(16),2880);assert.equal(png.readUInt32BE(20),3840);assert.equal(createHash('sha256').update(png).digest('hex'),data.sourceSha256);f.art.destroy();assert.equal(image.refs,0);
});

 test('bear walk keeps fixed frame, simulation clock and static combat fallback',()=>{
 const f=setup(),data=JSON.parse(readFileSync(resource('bear-v1.json'),'utf8'));
 const render=(time,extra={})=>{f.art.beginFrame();return f.art.draw(f.parent,'bear1','bear',20,30,50,0,32,{time,hp:100,worldY:70,role:'normal',ai:{mode:'approach',until:0},...extra})};
 render(1);f.staticImage('bear');const image=f.finish('tower-monsters-motion/bear-v1',ImageAsset,new ImageAsset(data.width,data.height));f.finish('tower-monsters-motion/bear-v1',JsonAsset,new JsonAsset(data));
 assert.equal(render(1),102.4);const bear=f.art.speciesRenderers.get('bear'),a=bear.actors.get('bear1');assert.equal(a.sprite.spriteFrame.rect.width,480);const frame=a.sprite.spriteFrame;render(1);assert.equal(a.sprite.spriteFrame,frame);render(1.2);assert.notEqual(a.sprite.spriteFrame,frame);assert.equal(a.node.position.y,30);
 render(2,{ai:{mode:'windup',until:3}});assert.equal(a.sprite.spriteFrame,bear.entries.get('bear').frame);
 render(2,{mechanic:{skillId:'M02',phase:'windup'}});assert.equal(a.sprite.spriteFrame,bear.entries.get('bear').frame);
 assert.equal(f.art.constructor.artFamily('bear','bear_boss'),'bear-humanoid');assert.equal(f.art.constructor.artFamily('bear','bear_elite'),'bear-humanoid');
 render(3);f.art.beginFrame();f.art.endFrame(4,new Set(['bear1']));assert.equal(bear.actors.size,0);
 const png=readFileSync(resource('bear-v1.png'));assert.equal(png.readUInt32BE(16),3840);assert.equal(createHash('sha256').update(png).digest('hex'),data.sourceSha256);f.art.destroy();assert.equal(image.refs,0);
 });

test('bear slam selects phased frames, freezes when paused and keeps mechanics isolated',()=>{
 const f=setup(),data=JSON.parse(readFileSync(resource('bear-v1.json'),'utf8'));
 const render=(time,mode='approach',until=0,extra={})=>{f.art.beginFrame();f.art.draw(f.parent,'bear-slam','bear',20,30,50,0,32,{time,hp:100,worldY:70,role:'normal',ai:{mode,until,attack:mode==='approach'?null:{kind:'slam',id:'slam-1',startedAt:2,active:.18,recovery:.9,dirX:-1}},...extra});};
 render(1);f.staticImage('bear');f.finish('tower-monsters-motion/bear-v1',ImageAsset,new ImageAsset(data.width,data.height));f.finish('tower-monsters-motion/bear-v1',JsonAsset,new JsonAsset(data));
 const art=f.art.speciesRenderers.get('bear');assert.ok(data.clips.slam,'delivered slam required');
 const pose=()=>[...art.motionFrames].find(([,v])=>v===art.actors.get('bear-slam').sprite.spriteFrame)?.[0];
 render(2,'windup',3);assert.equal(pose(),'slam-000');render(2.999,'windup',3);assert.equal(pose(),'slam-010');
 render(3,'active',3.18);assert.equal(pose(),'slam-011');const before=pose();render(3,'active',3.18);assert.equal(pose(),before);
 render(3.179,'active',3.18);assert.equal(pose(),'slam-013');render(3.18,'recovery',4.08);assert.equal(pose(),'slam-014');render(4.079,'recovery',4.08);assert.equal(pose(),'slam-023');
 render(3,'active',3.18,{mechanic:{phase:'active',skillId:'M07'}});assert.equal(pose(),undefined);
 const bad=copy(data);bad.clips.slam.phases.active=[24,1];assert.equal(art.validMotion(bad),false);
 render(5);assert.ok(pose().startsWith('move-'));f.art.beginFrame();f.art.endFrame(6,new Set(['bear-slam']));assert.equal(art.actors.size,0);
});

test('tiger walking uses its own atlas only while moving, with static combat and higher forms isolated',()=>{
 const f=setup(),data=JSON.parse(readFileSync(resource('tiger-v1.json'),'utf8'));
 const render=(time,extra={})=>{f.art.beginFrame();return f.art.draw(f.parent,'tiger1','tiger',20,30,50,0,28,{time,hp:100,worldY:70,moving:true,role:'normal',ai:{mode:'approach',until:0},...extra})};
 render(1);f.staticImage('tiger');
 assert.ok(f.requests.some(r=>r.path==='tower-monsters-motion/tiger-v1'),'tiger must request its own movement atlas');
 const image=f.finish('tower-monsters-motion/tiger-v1',ImageAsset,new ImageAsset(data.width,data.height));f.finish('tower-monsters-motion/tiger-v1',JsonAsset,new JsonAsset(data));
 const png=readFileSync(resource('tiger-v1.png'));assert.equal(createHash('sha256').update(png).digest('hex'),data.sourceSha256);assert.equal(png.readUInt32BE(16),2880);assert.equal(png.readUInt32BE(20),2880);assert.equal(png[25],6);assert.equal(Object.keys(data.frames).length,36);
 assert.equal(render(1),89.60000000000001);const tiger=f.art.speciesRenderers.get('tiger'),actor=tiger.actors.get('tiger1');const first=actor.sprite.spriteFrame;
 assert.equal(first.rect.width,480);render(1);assert.equal(actor.sprite.spriteFrame,first);render(1.3);assert.notEqual(actor.sprite.spriteFrame,first);
 render(2,{moving:false});assert.equal(actor.sprite.spriteFrame,tiger.entries.get('tiger').frame,'stationary approach must not walk in place');
 for(const mode of ['windup','active','recovery']){render(2,{ai:{mode,until:3}});assert.equal(actor.sprite.spriteFrame,tiger.entries.get('tiger').frame);render(2,{mechanic:{skillId:'M06',phase:mode}});assert.equal(actor.sprite.spriteFrame,tiger.entries.get('tiger').frame);}
 assert.equal(f.art.constructor.artFamily('tiger','tiger_boss'),'tiger-humanoid');assert.equal(f.art.constructor.artFamily('tiger','tiger_elite'),'tiger-humanoid');assert.equal(f.art.constructor.artFamily('tiger','tiger_boss_zhenyan'),'white-tiger');
 render(3);f.art.beginFrame();f.art.endFrame(4,new Set(['tiger1']));assert.equal(tiger.actors.size,0);f.art.destroy();assert.equal(image.refs,0);
});

test('tiger production motion inference follows displacement and keeps higher-form resources isolated',()=>{
 const f=setup(),data=JSON.parse(readFileSync(resource('tiger-v1.json'),'utf8'));
 const render=(time,x)=>{f.art.beginFrame();f.art.draw(f.parent,'tiger1','tiger',x,30,x,200,28,{time,hp:100,worldY:70,role:'normal',ai:{mode:'approach',until:0}})};
 render(1,50);f.staticImage('tiger');f.finish('tower-monsters-motion/tiger-v1',ImageAsset,new ImageAsset(data.width,data.height));f.finish('tower-monsters-motion/tiger-v1',JsonAsset,new JsonAsset(data));render(1,50);
 const r=f.art.speciesRenderers.get('tiger'),a=r.actors.get('tiger1');assert.equal(a.sprite.spriteFrame,r.entries.get('tiger').frame);
 render(1.1,55);assert.notEqual(a.sprite.spriteFrame,r.entries.get('tiger').frame);const moved=a.sprite.spriteFrame;render(1.1,55);assert.equal(a.sprite.spriteFrame,moved);render(1.2,55);assert.equal(a.sprite.spriteFrame,r.entries.get('tiger').frame);
 f.art.destroy();const high=setup();for(const family of ['tiger-humanoid','white-tiger']){high.art.draw(high.parent,family,family,0,0,1,2,28,{time:1,moving:true,role:'boss',ai:{mode:'approach',until:0}});high.staticImage(family);}
 assert.equal(high.requests.filter(r=>r.path==='tower-monsters-motion/tiger-v1').length,0);
 assert.equal(high.requests.filter(r=>r.path==='tower-monsters-motion/tiger-humanoid-v1').length,2);
 assert.equal(high.requests.filter(r=>r.path==='tower-monsters-motion/white-tiger-v1').length,2);high.art.destroy();
});

const phasedSkill=(r,a,clip,mode,render,skillId,instant)=>{render(2.15,80,{mechanic:{skillId,phase:mode,startedAt:2,until:3.2}});const ph=clip.phases;const [o,c]=instant&&mode==='recovery'?[ph.active[0],ph.active[1]+ph.recovery[1]]:ph[mode];assert.ok(clip.frames.slice(o,o+c).map(k=>r.motionFrames.get(k)).includes(a.sprite.spriteFrame),skillId+' '+mode+' plays its skill phase');};
test('upright rhino walks only on displacement and preserves static attacks, mechanics and yak isolation',()=>{
 const f=setup(),data=JSON.parse(readFileSync(resource('rhino-v1.json'),'utf8'));
 const render=(time,x,extra={})=>{f.art.beginFrame();return f.art.draw(f.parent,'rhino1','rhino',x,30,x,0,42,{time,hp:100,worldY:70,role:'boss',ai:{mode:'approach',until:0},...extra})};
 render(1,100);f.staticImage('rhino');assert.ok(f.requests.some(r=>r.path==='tower-monsters-motion/rhino-v1'),'rhino must load the upright walking atlas');
 const image=f.finish('tower-monsters-motion/rhino-v1',ImageAsset,new ImageAsset(data.width,data.height));f.finish('tower-monsters-motion/rhino-v1',JsonAsset,new JsonAsset(data));
 render(1,100);const r=f.art.speciesRenderers.get('rhino'),a=r.actors.get('rhino1');assert.equal(a.sprite.spriteFrame,r.entries.get('rhino').frame);
 assert.equal(render(1.1,98),220);const frame=a.sprite.spriteFrame;assert.equal(frame.rect.width,480);assert.equal(a.node.position.y,30);render(1.1,98);assert.equal(a.sprite.spriteFrame,frame);render(1.3,96);assert.notEqual(a.sprite.spriteFrame,frame);render(1.4,96);assert.equal(a.sprite.spriteFrame,r.entries.get('rhino').frame);
 const sweep=data.clips.sweep;assert.deepEqual(sweep.phases,{windup:[0,9],active:[9,3],recovery:[12,8]});
 for(const mode of ['windup','active','recovery']){render(2,90,{ai:{mode,until:3,attack:{id:'rhino-sweep',kind:'sweep',startedAt:1,active:2,recovery:2,dirX:-1}}});const [o,c]=sweep.phases[mode];assert.ok(sweep.frames.slice(o,o+c).map(k=>r.motionFrames.get(k)).includes(a.sprite.spriteFrame),'sweep '+mode);{const charge=data.clips.charge;assert.deepEqual(charge.phases,{windup:[0,9],active:[9,3],recovery:[12,8]});render(2,90,{ai:{mode,until:3,attack:{id:'rhino-charge',kind:'charge',startedAt:1,active:2,recovery:2,dirX:-1}}});const [o2,c2]=charge.phases[mode];assert.ok(charge.frames.slice(o2,o2+c2).map(k=>r.motionFrames.get(k)).includes(a.sprite.spriteFrame),'charge '+mode);}{const brace=data.clips.brace;assert.deepEqual(brace.phases,{windup:[0,3],active:[3,2],recovery:[5,4]});render(2.15,80,{mechanic:{skillId:'M20',phase:mode,chargeStarted:false,startedAt:2,until:3.2}});const [ob,cb]=mode==='active'?[0,5]:brace.phases[mode];if(mode==='active'){render(2.01,80,{mechanic:{skillId:'M20',phase:'active',chargeStarted:false,startedAt:2,until:4}});assert.equal(a.sprite.spriteFrame,r.motionFrames.get(brace.frames[0]),'M20 setup opens on the first brace frame');render(2.15,80,{mechanic:{skillId:'M20',phase:mode,chargeStarted:false,startedAt:2,until:3.2}});}assert.ok(brace.frames.slice(ob,ob+cb).map(k=>r.motionFrames.get(k)).includes(a.sprite.spriteFrame),'M20 '+mode+' plays brace before the charge');}{const stomp=data.clips.stomp;assert.deepEqual(stomp.phases,{windup:[0,6],active:[6,2],recovery:[8,8]});render(2.15,80,{mechanic:{skillId:'M07',phase:mode,startedAt:2,until:3.2}});const [o4,c4]=mode==='recovery'?[6,10]:stomp.phases[mode];if(mode==='recovery')assert.equal(a.sprite.spriteFrame,r.motionFrames.get(stomp.frames[6]),'M07 recovery opens on the impact frame');assert.ok(stomp.frames.slice(o4,o4+c4).map(k=>r.motionFrames.get(k)).includes(a.sprite.spriteFrame),'M07 '+mode+' plays the stomp phase');}{const charge=data.clips.charge,[o3,c3]=charge.phases[mode];for(const mech of [{skillId:'M06'},{skillId:'M20',chargeStarted:true}]){render(2.2,80,{mechanic:{...mech,phase:mode,startedAt:2,until:3.2}});assert.ok(charge.frames.slice(o3,o3+c3).map(k=>r.motionFrames.get(k)).includes(a.sprite.spriteFrame),mech.skillId+' '+mode+' plays the charge phase');}}}
 render(3,70);f.art.beginFrame();f.art.endFrame(4,new Set(['rhino1']));assert.equal(r.actors.size,0);f.art.destroy();assert.equal(image.refs,0);
 const png=readFileSync(resource('rhino-v1.png'));assert.equal(createHash('sha256').update(png).digest('hex'),data.sourceSha256);assert.equal(png.readUInt32BE(16),3840);assert.equal(png.readUInt32BE(20),4000);assert.equal(png[25],6);assert.equal(Object.keys(data.frames).length,80);
 const other=setup();other.art.draw(other.parent,'yak1','yak',0,0,1,2,42,{time:1,moving:true,role:'boss',ai:{mode:'approach',until:0}});assert.equal(other.requests.filter(r=>r.path==='tower-monsters-motion/rhino-v1').length,0);other.art.destroy();
});

test('upright yak walks only on displacement and preserves static attacks, mechanics and rhino isolation',()=>{
 const f=setup(),data=JSON.parse(readFileSync(resource('yak-v1.json'),'utf8'));
 const render=(time,x,extra={})=>{f.art.beginFrame();return f.art.draw(f.parent,'yak1','yak',x,30,x,0,42,{time,hp:100,worldY:70,role:'boss',ai:{mode:'approach',until:0},...extra})};
 render(1,100);f.staticImage('yak');assert.ok(f.requests.some(r=>r.path==='tower-monsters-motion/yak-v1'),'yak must load the upright walking atlas');
 const image=f.finish('tower-monsters-motion/yak-v1',ImageAsset,new ImageAsset(data.width,data.height));f.finish('tower-monsters-motion/yak-v1',JsonAsset,new JsonAsset(data));
 render(1,100);const r=f.art.speciesRenderers.get('yak'),a=r.actors.get('yak1');assert.equal(a.sprite.spriteFrame,r.entries.get('yak').frame);
 assert.equal(render(1.1,98),220);const frame=a.sprite.spriteFrame;assert.equal(frame.rect.width,480);assert.equal(a.node.position.y,30);render(1.1,98);assert.equal(a.sprite.spriteFrame,frame);render(1.3,96);assert.notEqual(a.sprite.spriteFrame,frame);render(1.4,96);assert.equal(a.sprite.spriteFrame,r.entries.get('yak').frame);
 const slam=data.clips.slam;assert.deepEqual(slam.phases,{windup:[0,9],active:[9,3],recovery:[12,8]});
 for(const mode of ['windup','active','recovery']){render(2,90,{ai:{mode,until:3,attack:{id:'yak-slam',kind:'slam',startedAt:1,active:2,recovery:2,dirX:-1}}});const [o,c]=slam.phases[mode];assert.ok(slam.frames.slice(o,o+c).map(k=>r.motionFrames.get(k)).includes(a.sprite.spriteFrame),'slam '+mode);phasedSkill(r,a,data.clips.summon,mode,render,'M05',true);phasedSkill(r,a,data.clips.channel,mode,render,'M19',true);{const roar=data.clips.roar;assert.deepEqual(roar.phases,{windup:[0,6],active:[6,2],recovery:[8,8]});render(2.15,80,{mechanic:{skillId:'M15',phase:mode,startedAt:2,until:3.2}});const [o2,c2]=mode==='recovery'?[6,10]:roar.phases[mode];if(mode==='recovery')assert.equal(a.sprite.spriteFrame,r.motionFrames.get(roar.frames[6]),'M15 recovery opens on the roar frame');assert.ok(roar.frames.slice(o2,o2+c2).map(k=>r.motionFrames.get(k)).includes(a.sprite.spriteFrame),'M15 '+mode+' plays the roar phase');}}
 render(3,70);f.art.beginFrame();f.art.endFrame(4,new Set(['yak1']));assert.equal(r.actors.size,0);f.art.destroy();assert.equal(image.refs,0);
 const png=readFileSync(resource('yak-v1.png'));assert.equal(createHash('sha256').update(png).digest('hex'),data.sourceSha256);assert.equal(png.readUInt32BE(16),3840);assert.equal(png.readUInt32BE(20),3936);assert.equal(png[25],6);assert.equal(Object.keys(data.frames).length,80);
});

test('low tiger sweep follows combat phases with constant body scale and feet, leaving mechanics static',()=>{
 const f=setup(),data=JSON.parse(readFileSync(resource('tiger-v1.json'),'utf8'));
 const render=(time,mode,extra={})=>{f.art.beginFrame();return f.art.draw(f.parent,'claw','tiger',20,30,50,0,28,{time,hp:100,worldY:70,role:'normal',ai:{mode,until:mode==='windup'?11:mode==='active'?11.18:12.08,attack:{kind:'sweep',id:'sweep1',startedAt:10,active:.18,recovery:.9,dirX:-1}},...extra})};
 render(10,'windup');f.staticImage('tiger');const image=f.finish('tower-monsters-motion/tiger-v1',ImageAsset,new ImageAsset(data.width,data.height));f.finish('tower-monsters-motion/tiger-v1',JsonAsset,new JsonAsset(data));
 render(10,'windup');const r=f.art.speciesRenderers.get('tiger'),a=r.actors.get('claw');const name=()=>[...r.motionFrames].find(([,frame])=>frame===a.sprite.spriteFrame)?.[0]||'static';
 for(const [time,mode,expected]of [[10,'windup','sweep-000'],[10.99,'windup','sweep-009'],[11,'active','sweep-010'],[11.179,'active','sweep-012'],[11.18,'recovery','sweep-013'],[12.079,'recovery','sweep-020']]){
  assert.equal(render(time,mode),89.60000000000001);assert.equal(name(),expected);assert.equal(a.sprite.spriteFrame.rect.width,480);assert.equal(a.node.position.y,30);assert.equal(a.transform.contentSize.width,89.60000000000001*data.frames[expected].displayScale);assert.equal(a.transform.anchor.y,1-data.frames[expected].anchor[1]);const prior=a.sprite.spriteFrame;render(time,mode);assert.equal(a.sprite.spriteFrame,prior);
 }
 for(const phase of ['windup','active','recovery']){render(11,'active',{mechanic:{skillId:'M06',phase}});assert.equal(name(),'static');}
 render(12.1,'approach',{moving:true});assert.match(name(),/^move-/);assert.equal(a.transform.contentSize.width,89.60000000000001);assert.equal(a.transform.anchor.y,1-data.anchor[1]);
 render(12.2,'approach',{moving:false});assert.equal(name(),'static');f.art.beginFrame();f.art.endFrame(13,new Set(['claw']));assert.equal(r.actors.size,0);f.art.destroy();assert.equal(image.refs,0);
});

test('upright wolf walks only on displacement with independent movement and static combat',()=>{
 const f=setup(),data=JSON.parse(readFileSync(resource('wolf-humanoid-v1.json'),'utf8'));
 const render=(time,x,extra={})=>{f.art.beginFrame();return f.art.draw(f.parent,'wolf-humanoid1','wolf-humanoid',x,30,x,0,42,{time,hp:100,worldY:70,role:'normal',ai:{mode:'approach',until:0},...extra})};
 render(1,100);f.staticImage('wolf-humanoid');assert.ok(f.requests.some(r=>r.path==='tower-monsters-motion/wolf-humanoid-v1'),'wolf-humanoid must load the upright walking atlas');
 const image=f.finish('tower-monsters-motion/wolf-humanoid-v1',ImageAsset,new ImageAsset(data.width,data.height));f.finish('tower-monsters-motion/wolf-humanoid-v1',JsonAsset,new JsonAsset(data));
 render(1,100);const r=f.art.speciesRenderers.get('wolf-humanoid'),a=r.actors.get('wolf-humanoid1');assert.equal(a.sprite.spriteFrame,r.entries.get('wolf-humanoid').frame);
 closeSize(render(1.1,98),78.60194174757282);const frame=a.sprite.spriteFrame;assert.equal(frame.rect.width,480);assert.equal(a.node.position.y,30);render(1.1,98);assert.equal(a.sprite.spriteFrame,frame);render(1.3,96);assert.notEqual(a.sprite.spriteFrame,frame);render(1.4,96);assert.equal(a.sprite.spriteFrame,r.entries.get('wolf-humanoid').frame);
 const clip=data.clips.sweep;assert.deepEqual(clip.phases,{windup:[0,9],active:[9,3],recovery:[12,8]});for(const kind of ['sweep','bite'])for(const mode of ['windup','active','recovery']){render(2,90,{ai:{mode,until:3,attack:{id:'wolf-humanoid-'+kind,kind,startedAt:1,active:2,recovery:2,dirX:-1}}});const [o,c]=clip.phases[mode];const names=clip.frames.slice(o,o+c).map(k=>r.motionFrames.get(k));assert.ok(names.includes(a.sprite.spriteFrame),kind+' '+mode+' plays its attack phase');}for(const mode of ['windup','active','recovery'])phasedSkill(r,a,data.clips.howl,mode,render,'M05',true);
 render(3,70);f.art.beginFrame();f.art.endFrame(4,new Set(['wolf-humanoid1']));assert.equal(r.actors.size,0);f.art.destroy();assert.equal(image.refs,0);
 const png=readFileSync(resource('wolf-humanoid-v1.png'));assert.equal(createHash('sha256').update(png).digest('hex'),data.sourceSha256);assert.equal(png.readUInt32BE(16),3840);assert.equal(png.readUInt32BE(20),3168);assert.equal(png[25],6);assert.equal(Object.keys(data.frames).length,52);
});


test('upright tiger walks only on displacement with independent movement and static combat',()=>{
 const f=setup(),data=JSON.parse(readFileSync(resource('tiger-humanoid-v1.json'),'utf8'));
 const render=(time,x,extra={})=>{f.art.beginFrame();return f.art.draw(f.parent,'tiger-humanoid1','tiger-humanoid',x,30,x,0,42,{time,hp:100,worldY:70,role:'normal',ai:{mode:'approach',until:0},...extra})};
 render(1,100);f.staticImage('tiger-humanoid');assert.ok(f.requests.some(r=>r.path==='tower-monsters-motion/tiger-humanoid-v1'),'tiger-humanoid must load the upright walking atlas');
 const image=f.finish('tower-monsters-motion/tiger-humanoid-v1',ImageAsset,new ImageAsset(data.width,data.height));f.finish('tower-monsters-motion/tiger-humanoid-v1',JsonAsset,new JsonAsset(data));
 render(1,100);const r=f.art.speciesRenderers.get('tiger-humanoid'),a=r.actors.get('tiger-humanoid1');assert.equal(a.sprite.spriteFrame,r.entries.get('tiger-humanoid').frame);
 closeSize(render(1.1,98),100.03883495145631);const frame=a.sprite.spriteFrame;assert.equal(frame.rect.width,480);assert.equal(a.node.position.y,30);render(1.1,98);assert.equal(a.sprite.spriteFrame,frame);render(1.3,96);assert.notEqual(a.sprite.spriteFrame,frame);render(1.4,96);assert.equal(a.sprite.spriteFrame,r.entries.get('tiger-humanoid').frame);
 const clip=data.clips.sweep;assert.deepEqual(clip.phases,{windup:[0,9],active:[9,3],recovery:[12,8]});for(const kind of ['sweep','bite'])for(const mode of ['windup','active','recovery']){render(2,90,{ai:{mode,until:3,attack:{id:'tiger-humanoid-'+kind,kind,startedAt:1,active:2,recovery:2,dirX:-1}}});const [o,c]=clip.phases[mode];const names=clip.frames.slice(o,o+c).map(k=>r.motionFrames.get(k));assert.ok(names.includes(a.sprite.spriteFrame),kind+' '+mode+' plays its attack phase');}for(const mode of ['windup','active','recovery']){for(const skillId of ['M06','M03']){render(2.1,80,{mechanic:{skillId,phase:mode}});assert.equal(a.sprite.spriteFrame,r.entries.get('tiger-humanoid').frame);}phasedSkill(r,a,data.clips.stomp,mode,render,'M07',true);}
 render(3,70);f.art.beginFrame();f.art.endFrame(4,new Set(['tiger-humanoid1']));assert.equal(r.actors.size,0);f.art.destroy();assert.equal(image.refs,0);
 const png=readFileSync(resource('tiger-humanoid-v1.png'));assert.equal(createHash('sha256').update(png).digest('hex'),data.sourceSha256);assert.equal(png.readUInt32BE(16),3840);assert.equal(png.readUInt32BE(20),3168);assert.equal(png[25],6);assert.equal(Object.keys(data.frames).length,52);
});

test('upright falcon walks only on displacement with independent movement and static combat',()=>{
 const f=setup(),data=JSON.parse(readFileSync(resource('falcon-humanoid-v1.json'),'utf8'));
 const render=(time,x,extra={})=>{f.art.beginFrame();return f.art.draw(f.parent,'falcon-humanoid1','falcon-humanoid',x,30,x,0,42,{time,hp:100,worldY:70,role:'normal',ai:{mode:'approach',until:0},...extra})};
 render(1,100);f.staticImage('falcon-humanoid');assert.ok(f.requests.some(r=>r.path==='tower-monsters-motion/falcon-humanoid-v1'),'falcon-humanoid must load the upright walking atlas');
 const image=f.finish('tower-monsters-motion/falcon-humanoid-v1',ImageAsset,new ImageAsset(data.width,data.height));f.finish('tower-monsters-motion/falcon-humanoid-v1',JsonAsset,new JsonAsset(data));
 render(1,100);const r=f.art.speciesRenderers.get('falcon-humanoid'),a=r.actors.get('falcon-humanoid1');assert.equal(a.sprite.spriteFrame,r.entries.get('falcon-humanoid').frame);
 closeSize(render(1.1,98),91.70731707317073);const frame=a.sprite.spriteFrame;assert.equal(frame.rect.width,480);assert.equal(a.node.position.y,30);render(1.1,98);assert.equal(a.sprite.spriteFrame,frame);render(1.3,96);assert.notEqual(a.sprite.spriteFrame,frame);render(1.4,96);assert.equal(a.sprite.spriteFrame,r.entries.get('falcon-humanoid').frame);
 const clip=data.clips.sweep;assert.deepEqual(clip.phases,{windup:[0,9],active:[9,3],recovery:[12,8]});for(const kind of ['bite'])for(const mode of ['windup','active','recovery']){render(2,90,{ai:{mode,until:3,attack:{id:'falcon-humanoid-'+kind,kind,startedAt:1,active:2,recovery:2,dirX:-1}}});const [o,c]=clip.phases[mode];const names=clip.frames.slice(o,o+c).map(k=>r.motionFrames.get(k));assert.ok(names.includes(a.sprite.spriteFrame),kind+' '+mode+' plays its attack phase');}render(2,90,{ai:{mode:'active',until:3,attack:{id:'falcon-humanoid-shot',kind:'shot',startedAt:1,active:.1,dirX:-1}}});assert.equal(a.sprite.spriteFrame,r.entries.get('falcon-humanoid').frame,'feather shot keeps the portrait emission pose');for(const mode of ['windup','active','recovery']){for(const skillId of ['M11','M07']){render(2.1,80,{mechanic:{skillId,phase:mode}});assert.equal(a.sprite.spriteFrame,r.entries.get('falcon-humanoid').frame);} /* 2026-11-13: falcon M07 stomp disabled (oversized, cut wing) */}
 render(3,70);f.art.beginFrame();f.art.endFrame(4,new Set(['falcon-humanoid1']));assert.equal(r.actors.size,0);f.art.destroy();assert.equal(image.refs,0);
 const png=readFileSync(resource('falcon-humanoid-v1.png'));assert.equal(createHash('sha256').update(png).digest('hex'),data.sourceSha256);assert.equal(png.readUInt32BE(16),3840);assert.equal(png.readUInt32BE(20),3168);assert.equal(png[25],6);assert.equal(Object.keys(data.frames).length,52);
});

test('low-rank snake slithers only on displacement; shots and mechanics keep the portrait',()=>{
 const f=setup(),data=JSON.parse(readFileSync(resource('snake-v1.json'),'utf8'));
 const render=(time,x,extra={})=>{f.art.beginFrame();return f.art.draw(f.parent,'snake1','snake',x,30,x,0,24,{time,hp:100,worldY:70,role:'normal',ai:{mode:'approach',until:0},...extra})};
 render(1,100);f.staticImage('snake');assert.ok(f.requests.some(r=>r.path==='tower-monsters-motion/snake-v1'));
 const image=f.finish('tower-monsters-motion/snake-v1',ImageAsset,new ImageAsset(data.width,data.height));f.finish('tower-monsters-motion/snake-v1',JsonAsset,new JsonAsset(data));
 const r=f.art.speciesRenderers.get('snake');render(1,100);const a=r.actors.get('snake1');assert.equal(a.sprite.spriteFrame,r.entries.get('snake').frame);
 const staticSize=a.transform.contentSize.width;render(1.1,98);const frame=a.sprite.spriteFrame;assert.notEqual(frame,r.entries.get('snake').frame);assert.equal(frame.rect.width,384);
 closeSize(a.transform.contentSize.width,staticSize*data.frames['move-000'].displayScale);assert.equal(a.node.position.y,30);
 render(1.5,96);assert.notEqual(a.sprite.spriteFrame,frame);render(1.6,96);assert.equal(a.sprite.spriteFrame,r.entries.get('snake').frame);
 for(const mode of ['windup','active','recovery']){render(2,90,{ai:{mode,until:3,attack:{id:'snake-shot',kind:'shot',startedAt:1,active:.1,dirX:-1}}});assert.equal(a.sprite.spriteFrame,r.entries.get('snake').frame);}const bite=data.clips.bite;assert.deepEqual(bite.phases,{windup:[0,9],active:[9,3],recovery:[12,8]});for(const mode of ['windup','active','recovery']){render(2,90,{ai:{mode,until:3,attack:{id:'snake-bite',kind:'bite',startedAt:1,active:2,recovery:2,dirX:-1}}});const [o,c]=bite.phases[mode];assert.ok(bite.frames.slice(o,o+c).map(k=>r.motionFrames.get(k)).includes(a.sprite.spriteFrame),'snake bite '+mode);assert.equal(a.sprite.spriteFrame.rect.width,480);}
 render(3,70);f.art.beginFrame();f.art.endFrame(4,new Set(['snake1']));assert.equal(r.actors.size,0);f.art.destroy();assert.equal(image.refs,0);
 const png=readFileSync(resource('snake-v1.png'));assert.equal(createHash('sha256').update(png).digest('hex'),data.sourceSha256);assert.equal(png.readUInt32BE(16),2880);assert.equal(png[25],6);assert.equal(Object.keys(data.frames).length,36);
});

test('upright bear walks only on displacement with independent movement and static combat',()=>{
 const f=setup(),data=JSON.parse(readFileSync(resource('bear-humanoid-v1.json'),'utf8'));
 const render=(time,x,extra={})=>{f.art.beginFrame();return f.art.draw(f.parent,'bear-humanoid1','bear-humanoid',x,30,x,0,42,{time,hp:100,worldY:70,role:'normal',ai:{mode:'approach',until:0},...extra})};
 render(1,100);f.staticImage('bear-humanoid');assert.ok(f.requests.some(r=>r.path==='tower-monsters-motion/bear-humanoid-v1'),'bear-humanoid must load the upright walking atlas');
 assert.equal(f.requests.filter(r=>r.path==='tower-monsters-motion/bear-v1').length,0,'low-rank bear slam must not be reused for the upright form');
 const image=f.finish('tower-monsters-motion/bear-humanoid-v1',ImageAsset,new ImageAsset(data.width,data.height));f.finish('tower-monsters-motion/bear-humanoid-v1',JsonAsset,new JsonAsset(data));
 render(1,100);const r=f.art.speciesRenderers.get('bear-humanoid'),a=r.actors.get('bear-humanoid1');assert.equal(a.sprite.spriteFrame,r.entries.get('bear-humanoid').frame);
 closeSize(render(1.1,98),102.4*231/206);const frame=a.sprite.spriteFrame;assert.equal(frame.rect.width,480);assert.equal(a.node.position.y,30);render(1.1,98);assert.equal(a.sprite.spriteFrame,frame);render(1.3,96);assert.notEqual(a.sprite.spriteFrame,frame);render(1.4,96);assert.equal(a.sprite.spriteFrame,r.entries.get('bear-humanoid').frame);
 const slam=data.clips.slam;assert.deepEqual(slam.phases,{windup:[0,9],active:[9,3],recovery:[12,8]});for(const mode of ['windup','active','recovery']){for(const kind of ['bite','slam']){render(2,90,{ai:{mode,until:3,attack:{id:'bear-humanoid-'+kind,kind,startedAt:1,active:2,recovery:2,dirX:-1}}});const [o,c]=slam.phases[mode];assert.ok(slam.frames.slice(o,o+c).map(k=>r.motionFrames.get(k)).includes(a.sprite.spriteFrame),kind+' '+mode+' plays the slam phase');}for(const skillId of ['M02']){render(2.1,80,{mechanic:{skillId,phase:mode}});assert.equal(a.sprite.spriteFrame,r.entries.get('bear-humanoid').frame);}for(const [skillId,name] of [['M07','stomp'],['M04','guard'],['M09','heave']]){const clip=data.clips[name];assert.deepEqual(clip.phases,name==='heave'?{windup:[0,4],active:[4,2],recovery:[6,6]}:{windup:[0,6],active:[6,2],recovery:[8,8]});render(2.15,80,{mechanic:{skillId,phase:mode,startedAt:2,until:3.2}});const [o2,c2]=['M07','M09'].includes(skillId)&&mode==='recovery'?[clip.phases.active[0],clip.phases.active[1]+clip.phases.recovery[1]]:clip.phases[mode];assert.ok(clip.frames.slice(o2,o2+c2).map(k=>r.motionFrames.get(k)).includes(a.sprite.spriteFrame),skillId+' '+mode+' plays the '+name+' phase');}}
 render(3,70);f.art.beginFrame();f.art.endFrame(4,new Set(['bear-humanoid1']));assert.equal(r.actors.size,0);f.art.destroy();assert.equal(image.refs,0);
 const png=readFileSync(resource('bear-humanoid-v1.png'));assert.equal(createHash('sha256').update(png).digest('hex'),data.sourceSha256);assert.equal(png.readUInt32BE(16),3840);assert.equal(png.readUInt32BE(20),3936);assert.equal(png[25],6);assert.equal(Object.keys(data.frames).length,80);
});

test('upright boar walks only on displacement with independent movement and static combat',()=>{
 const f=setup(),data=JSON.parse(readFileSync(resource('boar-humanoid-v1.json'),'utf8'));
 const render=(time,x,extra={})=>{f.art.beginFrame();return f.art.draw(f.parent,'boar-humanoid1','boar-humanoid',x,30,x,0,42,{time,hp:100,worldY:70,role:'normal',ai:{mode:'approach',until:0},...extra})};
 render(1,100);f.staticImage('boar-humanoid');assert.ok(f.requests.some(r=>r.path==='tower-monsters-motion/boar-humanoid-v1'),'boar-humanoid must load the upright walking atlas');
 const image=f.finish('tower-monsters-motion/boar-humanoid-v1',ImageAsset,new ImageAsset(data.width,data.height));f.finish('tower-monsters-motion/boar-humanoid-v1',JsonAsset,new JsonAsset(data));
 render(1,100);const r=f.art.speciesRenderers.get('boar-humanoid'),a=r.actors.get('boar-humanoid1');assert.equal(a.sprite.spriteFrame,r.entries.get('boar-humanoid').frame);
 render(1.1,98);const frame=a.sprite.spriteFrame;assert.equal(frame.rect.width,480);assert.equal(a.node.position.y,30);render(1.1,98);assert.equal(a.sprite.spriteFrame,frame);render(1.3,96);assert.notEqual(a.sprite.spriteFrame,frame);render(1.4,96);assert.equal(a.sprite.spriteFrame,r.entries.get('boar-humanoid').frame);
 const bite=data.clips.bite;assert.deepEqual(bite.phases,{windup:[0,9],active:[9,3],recovery:[12,8]});
 for(const mode of ['windup','active','recovery']){render(2,90,{ai:{mode,until:3,attack:{id:'boar-humanoid-bite',kind:'bite',startedAt:1,active:2,recovery:2,dirX:-1}}});const [o,c]=bite.phases[mode];assert.ok(bite.frames.slice(o,o+c).map(k=>r.motionFrames.get(k)).includes(a.sprite.spriteFrame),'bite '+mode+' plays the tusk bite phase');{const charge=data.clips.charge;assert.deepEqual(charge.phases,{windup:[0,9],active:[9,3],recovery:[12,8]});render(2,90,{ai:{mode,until:3,attack:{id:'boar-humanoid-charge',kind:'charge',startedAt:1,active:2,recovery:2,dirX:-1}}});const [o2,c2]=charge.phases[mode];assert.ok(charge.frames.slice(o2,o2+c2).map(k=>r.motionFrames.get(k)).includes(a.sprite.spriteFrame),'charge '+mode+' plays the charge phase');}for(const skillId of ['M06']){render(2.1,80,{mechanic:{skillId,phase:mode}});assert.equal(a.sprite.spriteFrame,r.entries.get('boar-humanoid').frame);}}
 render(3,70);f.art.beginFrame();f.art.endFrame(4,new Set(['boar-humanoid1']));assert.equal(r.actors.size,0);f.art.destroy();assert.equal(image.refs,0);
 const png=readFileSync(resource('boar-humanoid-v1.png'));assert.equal(createHash('sha256').update(png).digest('hex'),data.sourceSha256);assert.equal(png.readUInt32BE(16),3840);assert.equal(png.readUInt32BE(20),3360);assert.equal(png[25],6);assert.equal(Object.keys(data.frames).length,56);
});

test('upright crocodile walks only on displacement with independent movement and static combat',()=>{
 const f=setup(),data=JSON.parse(readFileSync(resource('crocodile-humanoid-v1.json'),'utf8'));
 const render=(time,x,extra={})=>{f.art.beginFrame();return f.art.draw(f.parent,'crocodile-humanoid1','crocodile-humanoid',x,30,x,0,42,{time,hp:100,worldY:70,role:'normal',ai:{mode:'approach',until:0},...extra})};
 render(1,100);f.staticImage('crocodile-humanoid');assert.ok(f.requests.some(r=>r.path==='tower-monsters-motion/crocodile-humanoid-v1'),'crocodile-humanoid must load the upright walking atlas');
 const image=f.finish('tower-monsters-motion/crocodile-humanoid-v1',ImageAsset,new ImageAsset(data.width,data.height));f.finish('tower-monsters-motion/crocodile-humanoid-v1',JsonAsset,new JsonAsset(data));
 render(1,100);const r=f.art.speciesRenderers.get('crocodile-humanoid'),a=r.actors.get('crocodile-humanoid1');assert.equal(a.sprite.spriteFrame,r.entries.get('crocodile-humanoid').frame);
 render(1.1,98);const frame=a.sprite.spriteFrame;assert.equal(frame.rect.width,480);render(1.1,98);assert.equal(a.sprite.spriteFrame,frame);render(1.3,96);assert.notEqual(a.sprite.spriteFrame,frame);render(1.4,96);assert.equal(a.sprite.spriteFrame,r.entries.get('crocodile-humanoid').frame);
 for(const mode of ['windup','active','recovery']){for(const kind of ['sweep']){render(2,90,{ai:{mode,until:3,attack:{id:'crocodile-humanoid-'+kind,kind,startedAt:1,active:.2,dirX:-1}}});assert.equal(a.sprite.spriteFrame,r.entries.get('crocodile-humanoid').frame);}for(const skillId of ['M08','M02']){render(2.1,80,{mechanic:{skillId,phase:mode}});assert.equal(a.sprite.spriteFrame,r.entries.get('crocodile-humanoid').frame);}phasedSkill(r,a,data.clips.cast,mode,render,'M12',false);}
 render(3,70);f.art.beginFrame();f.art.endFrame(4,new Set(['crocodile-humanoid1']));assert.equal(r.actors.size,0);f.art.destroy();assert.equal(image.refs,0);
 const png=readFileSync(resource('crocodile-humanoid-v1.png'));assert.equal(createHash('sha256').update(png).digest('hex'),data.sourceSha256);assert.equal(png.readUInt32BE(16),3840);assert.equal(png.readUInt32BE(20),1728);assert.equal(png[25],6);assert.equal(Object.keys(data.frames).length,32);
});

test('rank-five serpent queen walks only on displacement with independent movement and static combat',()=>{
 const f=setup(),data=JSON.parse(readFileSync(resource('snake-lady-v1.json'),'utf8'));
 const render=(time,x,extra={})=>{f.art.beginFrame();return f.art.draw(f.parent,'snake-lady1','snake-lady',x,30,x,0,42,{time,hp:100,worldY:70,role:'boss',ai:{mode:'approach',until:0},...extra})};
 render(1,100);f.staticImage('snake-lady');assert.ok(f.requests.some(r=>r.path==='tower-monsters-motion/snake-lady-v1'),'snake-lady must load the upright walking atlas');
 const image=f.finish('tower-monsters-motion/snake-lady-v1',ImageAsset,new ImageAsset(data.width,data.height));f.finish('tower-monsters-motion/snake-lady-v1',JsonAsset,new JsonAsset(data));
 render(1,100);const r=f.art.speciesRenderers.get('snake-lady'),a=r.actors.get('snake-lady1');assert.equal(a.sprite.spriteFrame,r.entries.get('snake-lady').frame);
 render(1.1,98);const frame=a.sprite.spriteFrame;assert.equal(frame.rect.width,480);render(1.1,98);assert.equal(a.sprite.spriteFrame,frame);render(1.3,96);assert.notEqual(a.sprite.spriteFrame,frame);render(1.4,96);assert.equal(a.sprite.spriteFrame,r.entries.get('snake-lady').frame);
 for(const mode of ['windup','active','recovery']){for(const kind of ['shot']){render(2,90,{ai:{mode,until:3,attack:{id:'snake-lady-'+kind,kind,startedAt:1,active:.2,dirX:-1}}});assert.equal(a.sprite.spriteFrame,r.entries.get('snake-lady').frame);}phasedSkill(r,a,data.clips.heal,mode,render,'M03',false);phasedSkill(r,a,data.clips.cast,mode,render,'M11',true);}
 render(3,70);f.art.beginFrame();f.art.endFrame(4,new Set(['snake-lady1']));assert.equal(r.actors.size,0);f.art.destroy();assert.equal(image.refs,0);
 const png=readFileSync(resource('snake-lady-v1.png'));assert.equal(createHash('sha256').update(png).digest('hex'),data.sourceSha256);assert.equal(png.readUInt32BE(16),3840);assert.equal(png.readUInt32BE(20),2496);assert.equal(png[25],6);assert.equal(Object.keys(data.frames).length,48);
});

test('rank-six spider lady walks only on displacement with independent movement and static combat',()=>{
 const f=setup(),data=JSON.parse(readFileSync(resource('spider-lady-v1.json'),'utf8'));
 const render=(time,x,extra={})=>{f.art.beginFrame();return f.art.draw(f.parent,'spider-lady1','spider-lady',x,30,x,0,42,{time,hp:100,worldY:70,role:'normal',ai:{mode:'approach',until:0},...extra})};
 render(1,100);f.staticImage('spider-lady');assert.ok(f.requests.some(r=>r.path==='tower-monsters-motion/spider-lady-v1'),'spider-lady must load the upright walking atlas');
 const image=f.finish('tower-monsters-motion/spider-lady-v1',ImageAsset,new ImageAsset(data.width,data.height));f.finish('tower-monsters-motion/spider-lady-v1',JsonAsset,new JsonAsset(data));
 render(1,100);const r=f.art.speciesRenderers.get('spider-lady'),a=r.actors.get('spider-lady1');assert.equal(a.sprite.spriteFrame,r.entries.get('spider-lady').frame);
 render(1.1,98);const frame=a.sprite.spriteFrame;assert.equal(frame.rect.width,480);render(1.1,98);assert.equal(a.sprite.spriteFrame,frame);render(1.3,96);assert.notEqual(a.sprite.spriteFrame,frame);render(1.4,96);assert.equal(a.sprite.spriteFrame,r.entries.get('spider-lady').frame);
 for(const mode of ['windup','active','recovery']){for(const kind of ['bite']){render(2,90,{ai:{mode,until:3,attack:{id:'spider-lady-'+kind,kind,startedAt:1,active:.2,dirX:-1}}});assert.equal(a.sprite.spriteFrame,r.entries.get('spider-lady').frame);}for(const skillId of ['M10']){render(2.1,80,{mechanic:{skillId,phase:mode}});assert.equal(a.sprite.spriteFrame,r.entries.get('spider-lady').frame);}phasedSkill(r,a,data.clips.summon,mode,render,'M22',true);phasedSkill(r,a,data.clips.cast,mode,render,'M11',true);}
 render(3,70);f.art.beginFrame();f.art.endFrame(4,new Set(['spider-lady1']));assert.equal(r.actors.size,0);f.art.destroy();assert.equal(image.refs,0);
 const png=readFileSync(resource('spider-lady-v1.png'));assert.equal(createHash('sha256').update(png).digest('hex'),data.sourceSha256);assert.equal(png.readUInt32BE(16),3840);assert.equal(png.readUInt32BE(20),2496);assert.equal(png[25],6);assert.equal(Object.keys(data.frames).length,48);
});

test('rank-four bat warrior walks only on displacement with independent movement and static combat',()=>{
 const f=setup(),data=JSON.parse(readFileSync(resource('bat-humanoid-v1.json'),'utf8'));
 const render=(time,x,extra={})=>{f.art.beginFrame();return f.art.draw(f.parent,'bat-humanoid1','bat-humanoid',x,30,x,0,42,{time,hp:100,worldY:70,role:'normal',ai:{mode:'approach',until:0},...extra})};
 render(1,100);f.staticImage('bat-humanoid');assert.ok(f.requests.some(r=>r.path==='tower-monsters-motion/bat-humanoid-v1'),'bat-humanoid must load the upright walking atlas');
 const image=f.finish('tower-monsters-motion/bat-humanoid-v1',ImageAsset,new ImageAsset(data.width,data.height));f.finish('tower-monsters-motion/bat-humanoid-v1',JsonAsset,new JsonAsset(data));
 render(1,100);const r=f.art.speciesRenderers.get('bat-humanoid'),a=r.actors.get('bat-humanoid1');assert.equal(a.sprite.spriteFrame,r.entries.get('bat-humanoid').frame);
 render(1.1,98);const frame=a.sprite.spriteFrame;assert.equal(frame.rect.width,480);render(1.1,98);assert.equal(a.sprite.spriteFrame,frame);render(1.3,96);assert.notEqual(a.sprite.spriteFrame,frame);render(1.4,96);assert.equal(a.sprite.spriteFrame,r.entries.get('bat-humanoid').frame);
 for(const mode of ['windup','active','recovery']){for(const kind of ['bite']){render(2,90,{ai:{mode,until:3,attack:{id:'bat-humanoid-'+kind,kind,startedAt:1,active:.2,dirX:-1}}});assert.equal(a.sprite.spriteFrame,r.entries.get('bat-humanoid').frame);}phasedSkill(r,a,data.clips.stomp,mode,render,'M07',true);}
 render(3,70);f.art.beginFrame();f.art.endFrame(4,new Set(['bat-humanoid1']));assert.equal(r.actors.size,0);f.art.destroy();assert.equal(image.refs,0);
 const png=readFileSync(resource('bat-humanoid-v1.png'));assert.equal(createHash('sha256').update(png).digest('hex'),data.sourceSha256);assert.equal(png.readUInt32BE(16),3840);assert.equal(png.readUInt32BE(20),1728);assert.equal(png[25],6);assert.equal(Object.keys(data.frames).length,32);
});

test('rank-seven white tiger walks only on displacement with independent movement and static combat',()=>{
 const f=setup(),data=JSON.parse(readFileSync(resource('white-tiger-v1.json'),'utf8'));
 const render=(time,x,extra={})=>{f.art.beginFrame();return f.art.draw(f.parent,'white-tiger1','white-tiger',x,30,x,0,42,{time,hp:100,worldY:70,role:'boss',ai:{mode:'approach',until:0},...extra})};
 render(1,100);f.staticImage('white-tiger');assert.ok(f.requests.some(r=>r.path==='tower-monsters-motion/white-tiger-v1'),'white-tiger must load the upright walking atlas');
 const image=f.finish('tower-monsters-motion/white-tiger-v1',ImageAsset,new ImageAsset(data.width,data.height));f.finish('tower-monsters-motion/white-tiger-v1',JsonAsset,new JsonAsset(data));
 render(1,100);const r=f.art.speciesRenderers.get('white-tiger'),a=r.actors.get('white-tiger1');assert.equal(a.sprite.spriteFrame,r.entries.get('white-tiger').frame);
 render(1.1,98);const frame=a.sprite.spriteFrame;assert.equal(frame.rect.width,480);render(1.1,98);assert.equal(a.sprite.spriteFrame,frame);render(1.3,96);assert.notEqual(a.sprite.spriteFrame,frame);render(1.4,96);assert.equal(a.sprite.spriteFrame,r.entries.get('white-tiger').frame);
 for(const mode of ['windup','active','recovery']){for(const kind of ['sweep']){render(2,90,{ai:{mode,until:3,attack:{id:'white-tiger-'+kind,kind,startedAt:1,active:.2,dirX:-1}}});assert.equal(a.sprite.spriteFrame,r.entries.get('white-tiger').frame);}for(const skillId of ['M02']){render(2.1,80,{mechanic:{skillId,phase:mode}});assert.equal(a.sprite.spriteFrame,r.entries.get('white-tiger').frame);}phasedSkill(r,a,data.clips.charge,mode,render,'M06',false);phasedSkill(r,a,data.clips.channel,mode,render,'M19',true);phasedSkill(r,a,data.clips.cast,mode,render,'M01',true);}
 render(3,70);f.art.beginFrame();f.art.endFrame(4,new Set(['white-tiger1']));assert.equal(r.actors.size,0);f.art.destroy();assert.equal(image.refs,0);
 const png=readFileSync(resource('white-tiger-v1.png'));assert.equal(createHash('sha256').update(png).digest('hex'),data.sourceSha256);assert.equal(png.readUInt32BE(16),3840);assert.equal(png.readUInt32BE(20),2880);assert.equal(png[25],6);assert.equal(Object.keys(data.frames).length,64);
});

test('boar charge phases use per-frame hoof anchors at the unchanged world origin',()=>{
 const f=setup();f.draw(10);f.staticImage();f.motionImages();
 const data=JSON.parse(readFileSync(resource('boar-v3.json'),'utf8'));
 for(const role of ['normal','boss'])for(const enraged of [false,true])for(const [phase,clip]of [['windup','charge-start'],['active','charge-loop'],['recovery','charge-end']]){
  const id=`${role}-${enraged}-${phase}`;
  for(const time of [10,10.25,10.5,10.9]){
   f.art.draw(f.parent,id,'boar',12,34,100,200,30,{time,worldY:50,role,hp:100,ai:{mode:'approach'},mechanic:{skillId:'M06',phase,startedAt:10,until:11,chargeX:300,enraged}});
   const actor=f.art.actors.get(id),name=[...f.art.motionFrames,...f.art.rageFrames].find(([,frame])=>frame===actor.sprite.spriteFrame)[0];
   assert.ok(name.startsWith(clip));assert.ok(data.frames[name].anchor,'native frame must have a measured hoof anchor');
   assert.equal(actor.transform.anchor.y,1-data.frames[name].anchor[1]);
   assert.equal(actor.node.position.x,12);assert.equal(actor.node.position.y,34);
  }
 }
});

test('discarded floor preload ignores late motion callbacks while replacement cache loads once',()=>{
 const f=setup(),Art=f.art.constructor,old=f.art;
 old.preloadFloor({boss_id:'wolf_normal_r4',waves:[]});old.destroy();
 const data=JSON.parse(readFileSync(resource('wolf-humanoid-v1.json'),'utf8')),image=new ImageAsset(data.width,data.height);
 f.finish('tower-monsters-motion/wolf-humanoid-v1',JsonAsset,new JsonAsset(data));
 f.finish('tower-monsters-motion/wolf-humanoid-v1',ImageAsset,image);
 f.staticImage('wolf-humanoid');assert.equal(image.refs,0);assert.equal(old.speciesRenderers.size,0);assert.equal(f.parent.children.length,0);
 const next=new Art(),floor={boss_id:'wolf_normal_r4',waves:[{enemy_groups:[{archetype:'wolf_normal_r4'},{archetype:'wolf_normal_r5'}]}]};
 const start=f.requests.length;next.preloadFloor(floor);next.preloadFloor(floor);
 assert.equal(f.requests.length-start,3,'one static image, one motion image and one manifest per family');
 const current=f.finish('tower-monsters-motion/wolf-humanoid-v1',ImageAsset,new ImageAsset(data.width,data.height));
 f.finish('tower-monsters-motion/wolf-humanoid-v1',JsonAsset,new JsonAsset(data));f.staticImage('wolf-humanoid');
 const renderer=next.speciesRenderers.get('wolf-humanoid'),texture=renderer.motionTexture;
 assert.ok(texture);next.clearBindings();next.preloadFloor(floor);assert.equal(renderer.motionTexture,texture);assert.equal(f.requests.length-start,3);
 next.destroy();assert.equal(current.refs,0);assert.equal(texture.isValid,false);
});

test('floor renderer releases queued motion originals but retains shared portraits and skill effects',()=>{
 const queueSource=stripTypeScriptTypes(readFileSync(new URL('../cocos-pilot/assets/scripts/TowerAssetQueue.ts',import.meta.url),'utf8'),{mode:'transform'}).replace(/^export /gm,'');
 const Queue=runInNewContext('(()=>{'+queueSource+';return TowerAssetQueue})()',{setTimeout,clearTimeout,console});
 const jobs=[],queue=new Queue((path,Type,done)=>jobs.push({path,Type,done}));
 const context={Color,ARCHETYPES,setTowerDepth:()=>{},Node,UITransform,Sprite,SpriteFrame,Texture2D,ImageAsset,JsonAsset,Rect,Size,
  isValid:n=>!!n?.isValid,resources:{load:queue.load.bind(queue),release:queue.release.bind(queue)}};
 const Art=runInNewContext('(()=>{'+source+';return TowerMonsterArt})()',context),art=new Art();
 const complete=(path,Type,value)=>{const job=jobs.find(j=>j.path===path&&j.Type===Type&&!j.finished);assert.ok(job,path);job.finished=true;job.done(null,value);return value};
 const motion='tower-monsters-motion/wolf-humanoid-v1';
 art.preload('wolf-humanoid');
 const portrait=complete('tower-monsters/wolf-humanoid',ImageAsset,new ImageAsset());
 const wolfMeta=JSON.parse(readFileSync(resource('wolf-humanoid-v1.json'),'utf8'));const body=complete(motion,ImageAsset,new ImageAsset(wolfMeta.width,wolfMeta.height));
 const meta=new JsonAsset(wolfMeta);
 meta.refs=0;meta.addRef=function(){this.refs++};meta.decRef=function(){this.refs--};
 complete(motion,JsonAsset,meta);
 queue.load('tower-monsters-motion/crystal',ImageAsset,()=>{});
 const effect=complete('tower-monsters-motion/crystal',ImageAsset,new ImageAsset());
 assert.equal(body.refs,2);assert.equal(meta.refs,1);
 art.clearBindings();assert.equal(body.refs,2);
 art.destroy();assert.equal(body.refs,0);assert.equal(meta.refs,0);assert.equal(portrait.refs,1);assert.equal(effect.refs,1);
 const next=new Art();next.preload('wolf-humanoid');
 assert.equal(jobs.filter(j=>j.path===motion).length,4,'both image and JSON reload on reentry');
 const late=jobs.filter(j=>j.path===motion&&!j.finished);next.destroy();
 const stale=new ImageAsset();late.find(j=>j.Type===ImageAsset).done(null,stale);assert.equal(stale.refs,0);
 assert.equal(queue.state.pending,0);queue.dispose();assert.equal(portrait.refs,0);assert.equal(effect.refs,0);
});

test('rank and role reach static and animated draws without moving grounded feet or changing state',()=>{
 const f=setup();f.draw(10);f.staticImage();
 const draw=(rank,role)=>{const motion={time:10,rank,role,worldY:50,hp:100,ai:{mode:'approach',until:0}};const before=copy(motion);
  const size=f.art.draw(f.parent,'boar1','boar',12,34,100,200,30,motion);assert.deepEqual(motion,before);return size;};
 for(const animated of [false,true]){
  if(animated)f.motionImages();
  for(const [rank,normal,elite] of [[1,83.2,141.44],[3,83.2,141.44],[4,99.84,162.24],[6,99.84,162.24],[7,116.48,183.04],[9,116.48,183.04]]){
   for(const [role,want] of [['normal',normal],['elite',elite]]){
    assert.ok(Math.abs(draw(rank,role)-want)<1e-8);
    const a=f.art.actors.get('boar1');assert.ok(Math.abs(a.transform.contentSize.width-want)<1e-8);
    assert.ok(Math.abs(a.node.position.y-(animated?34:34+want*(.9492-.5)))<1e-8);
   }
  }
  assert.ok(Math.abs(draw(3,'boss')-237.952)<1e-8);
 }
 f.art.beginFrame();f.art.endFrame(11,new Set(['boar1']));
 assert.ok(Math.abs(f.art.actors.get('boar1').transform.contentSize.width-237.952)<1e-8);
});

test('all same-species forms preserve visible rank progression and bosses exceed highest elite by 30 percent',()=>{
 const Art=setup().art.constructor;
 const forms=[['boar','boar-humanoid',232/256,206/256],['wolf','wolf-humanoid',230/256,206/256],['spider','spider-lady',470/512,206/256],['tiger','white-tiger',230/256,206/256]];
 for(const [low,high,lowExtent,highExtent] of forms){
  const baseline=Art.bodySize(low,'normal',24,1)*lowExtent;
  assert.ok(Math.abs(Art.bodySize(high,'normal',24,7)*highExtent/baseline-1.4)<1e-8,high);
  const elite=Art.bodySize(high,'elite',24,9)*highExtent;
  for(const family of [low,high]){
   const extent=family===low?lowExtent:highExtent;
   assert.ok(Art.bodySize(family,'boss',24,3)*extent>=elite*1.3-1e-8,family);
  }
 }
});

test('death after a charge restores the death foot anchor while retaining enlarged elite size',()=>{
 const f=setup();f.draw(10);f.staticImage();f.motionImages();
 f.art.draw(f.parent,'boar1','boar',12,34,100,200,30,{time:10,rank:7,role:'elite',hp:100,worldY:50,ai:{mode:'approach'},mechanic:{skillId:'M06',phase:'active',until:11,chargeX:300}});
 const a=f.art.actors.get('boar1');assert.notEqual(a.transform.anchor.y,1-f.art.motionAtlas.anchor[1]);
 f.art.beginFrame();f.art.endFrame(11,new Set(['boar1']));
 closeSize(a.transform.contentSize.width,183.04);assert.equal(a.transform.anchor.y,1-f.art.motionAtlas.anchor[1]);
});
