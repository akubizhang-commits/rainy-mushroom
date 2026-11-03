import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { SurvivorRun } from '../../../js/survivor/SurvivorRun.js'

const root = new URL('../../../', import.meta.url)
const url = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
const ts = name => stripTypeScriptTypes(readFileSync(new URL(`cocos-pilot/assets/scripts/${name}.ts`, root), 'utf8'), { mode: 'transform' })
// Cocos is the unavailable rendering boundary; run the actual Art + controller
// against a small scene graph and the real SurvivorRun, not mocked art decisions.
const cc = url(`
export class Node {
 constructor(name=''){this.name=name;this.children=[];this.isValid=true;this.active=true;this.layer=0;this.components=new Map()}
 addChild(n){this.children.push(n)}
 addComponent(C){const c=new C();this.components.set(C,c);return c}
 setPosition(x,y){this.position={x,y}}
 setScale(x,y,z){this.scale={x,y,z}}
 destroy(){this.isValid=false}
}
export class UITransform {
 setContentSize(width,height){this.size={width,height}}
 setAnchorPoint(x,y){this.anchor={x,y}}
}
export class Graphics {
 constructor(){this.commands=[];this.clears=0}
 clear(){this.commands=[];this.clears++}
 moveTo(x,y){this.commands.push(['move',x,y])}
 lineTo(x,y){this.commands.push(['line',x,y])}
 close(){this.commands.push(['close'])}
 fill(){this.commands.push(['fill',this.fillColor])}
 stroke(){this.commands.push(['stroke',this.strokeColor])}
}
export class Sprite {static SizeMode={CUSTOM:1}}
export class Texture2D {static Filter={LINEAR:1};setFilters(){};destroy(){this.destroyed=true}}
export class SpriteFrame {destroy(){this.destroyed=true}}
export class ImageAsset {
 constructor(width,height){this.width=width;this.height=height;this.refs=0}
 addRef(){this.refs++} decRef(){this.refs--}
}
export class JsonAsset {}
export class Rect {constructor(x,y,width,height){Object.assign(this,{x,y,width,height})}}
export class Size {constructor(width,height){Object.assign(this,{width,height})}}
export class Color {constructor(r,g,b,a){Object.assign(this,{r,g,b,a})}}
export const AssetManager={};
`)
const { Node, ImageAsset, JsonAsset, Sprite, UITransform } = await import(cc)
const imports = {
  cc,
  './SurvivorBattleFrames': url(ts('SurvivorBattleFrames')),
  './SurvivorCharacterMotion': url(ts('SurvivorCharacterMotion')),
  './SurvivorCharacterAtlas': url(ts('SurvivorCharacterAtlas')),
  './shared/js/survivor/data/enemies': new URL('js/survivor/data/enemies.js', root).href,
  './shared/js/survivor/data/limits': new URL('js/survivor/data/limits.js', root).href,
}
let source = ts('SurvivorBattleArt')
for (const [from, to] of Object.entries(imports)) source = source.replaceAll(`"${from}"`, JSON.stringify(to)).replaceAll(`'${from}'`, JSON.stringify(to))
const { SurvivorBattleArt } = await import(url(source))
const e={x:10,y:20,dirX:1,dirY:0,radius:180,angleDeg:90,castId:1,strikeAtTick:108};
function bundle(){return {load(path,Type,cb){if(Type===JsonAsset)return cb(null,{json:{width:312,height:416,bodyHeight:335.25,anchorX:162.5,anchorY:352.25}});cb(null,new ImageAsset(path==='sword-projectile-s1'?128:312,path==='sword-projectile-s1'?24:416))}}}
test('arc geometry, tick pause, deduplication, strike and lifecycle',async()=>{
 const a=new SurvivorBattleArt(new Node(),720,1280);await a.load(bundle(),true);
 const r={ruleset:'xianxia',state:'playing',simulationTick:100,player:{x:10,y:20}};
 assert.equal(a.swordArcWarn(e),true);assert.equal(a.swordArcWarn(e),false);
 a.syncSwordArc(r,false);const g=a.arcGraphics,commands=JSON.stringify(g.commands),clears=g.clears;
 assert.ok(g.commands.some(c=>c[0]==='fill'));const edge=g.commands.find(c=>c[0]==='line');
 assert.ok(Math.abs(Math.hypot(edge[1]-10,edge[2]-20)-180)<1e-9);
 assert.ok(Math.abs(Math.atan2(edge[2]-20,edge[1]-10)+Math.PI/4)<1e-9);
 r.state='paused';a.syncSwordArc(r,false);assert.equal(g.clears,clears);assert.equal(JSON.stringify(g.commands),commands);
 r.state='playing';r.simulationTick=107;r.player.x=30;a.syncSwordArc(r,false);assert.equal(g.commands[0][1],30);
 const strike={...e,x:30};assert.equal(a.swordArcStrike(strike),true);assert.equal(a.swordArcStrike(strike),false);
 r.simulationTick=108;a.syncSwordArc(r,false);assert.ok(g.commands.length>0);
 r.simulationTick=119;a.syncSwordArc(r,false);assert.ok(g.commands.length>0);
 r.simulationTick=120;a.syncSwordArc(r,false);assert.equal(g.commands.length,0);
 assert.equal(a.swordArcWarn({...e,castId:2,dirX:0}),false);
 a.resetSwordArc();assert.equal(a.swordArcWarn(e),true);
 const world=a.root.children.find(n=>n.name==='World'),names=world.children.map(n=>n.name);
 assert.ok(names.indexOf('Sword arc')<names.indexOf('Zones'));assert.ok(names.indexOf('Sword arc')<names.indexOf('Mist bubbles'));
 r.ruleset='survivor';a.syncSwordArc(r,false);assert.equal(g.commands.length,0);a.destroy();
});
test('actual sword sprite direction, classic branch, isolated loading and cleanup',async()=>{
 const a=new SurvivorBattleArt(new Node(),720,1280),calls=[],b=bundle();await a.load({load(...args){calls.push(args[0]);b.load(...args)}},true);
 const r=new SurvivorRun({seed:'sword-art',ruleset:'xianxia',viewport:{width:720,height:1280}});
 const s=r.shots.acquire();Object.assign(s,{kind:'sword',x:r.player.x,y:r.player.y,vx:0,vy:100,r:5});
 a.sync(r,0,false);assert.ok(a.shownFrames('shots').includes('xianxia:sword'));
 const world=a.root.children.find(n=>n.name==='World');const node=world.children.find(n=>n.name==='Player shots').children[0];assert.equal(node.angle,90);assert.deepEqual(node.components.get(UITransform).size,{width:64,height:12});
 const image=a.swordImage;assert.equal(image.refs,1);a.destroy();assert.equal(image.refs,0);
 const classic=new SurvivorBattleArt(new Node(),720,1280),classicCalls=[];await classic.load({load(...args){classicCalls.push(args[0]);b.load(...args)}});
 assert.deepEqual(classicCalls,['survivor-battle','ground']);const cr=new SurvivorRun({seed:'classic',ruleset:'survivor',viewport:{width:720,height:1280}});const cs=cr.shots.acquire();Object.assign(cs,{kind:'spore',x:cr.player.x,y:cr.player.y,vx:100,vy:0,r:5});classic.sync(cr,0,false);assert.ok(classic.shownFrames('shots').includes('spore-shot'));classic.destroy();
});
