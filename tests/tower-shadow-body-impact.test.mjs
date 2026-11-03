import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {stripTypeScriptTypes} from 'node:module'
import {runInNewContext} from 'node:vm'
import {shadowBodyReactions} from '../js/xianxia/TowerShadow.js'

// Execute the actual body renderer and mechanic styling with a minimal GPU seam.
test('shadow recoil composes with facing, clone tint and rage; redraw removes it without drift',()=>{
 class Node {
  constructor(name){Object.assign(this,{name,isValid:true,layer:1,children:[],components:new Map()})}
  addChild(node){this.children.push(node);node.parent=this}
  addComponent(Type){const value=new Type();value.node=this;this.components.set(Type,value);return value}
  getComponent(Type){return this.components.get(Type)}
  setPosition(x,y){this.position={x,y}}
  setScale(x,y,z){this.scale={x,y,z}}
 }
 class UITransform {setContentSize(){} setAnchorPoint(){}}
 class Sprite {static SizeMode={CUSTOM:1}}
 class Texture2D {static Filter={LINEAR:1};setFilters(){}}
 class Color {constructor(...args){this.args=args}}
 const pending=[]
 const context={Node,UITransform,Sprite,Texture2D,Color,SpriteFrame:class{},Rect:class{},Size:class{},
  ImageAsset:class{},JsonAsset:class{},Graphics:class{},Label:class{},
  isValid:n=>!!n?.isValid,setTowerDepth:(n,y)=>n.depth=y,
  resources:{load:(...args)=>pending.push(args.at(-1))}}
 for(const [file,name] of [['TowerMonsterArt','Art'],['TowerMonsterMechanicsView','Mechanics']]){
  const source=readFileSync(new URL(`../cocos-pilot/assets/scripts/${file}.ts`,import.meta.url),'utf8')
   .replace(/^import .*$/gm,'').replace(/\bexport /g,'')
  runInNewContext(stripTypeScriptTypes(source,{mode:'transform'})+`\nglobalThis.${name}=${file}`,context)
 }
 const art=new context.Art(),root=new Node('root'),style=context.Mechanics.prototype.styleActor
 const enemy={temporary:{kind:'clone'},mechanic:{enraged:true}},motion={time:10,worldY:34,ai:{mode:'idle'}}
 const wolfActor=()=>art.speciesRenderers.get('wolf')?.actors.get('a')
 const draw=()=>{art.draw(root,'a','wolf',12,34,100,200,30,motion);const actor=wolfActor();if(actor)style(enemy,actor.node)}
 draw();pending.shift()(null,{addRef(){},width:256,height:256});draw()
 const actor=wolfActor(),base=structuredClone({position:actor.node.position,scale:actor.node.scale})
 const hit={targetId:'a',kind:'hit',source:'shadow',x:100,y:34,damage:5,startedAt:10,
  shadowImpact:{dirX:1,dirY:0,pulseIndex:4,pulseCount:4}}
 const pose=shadowBodyReactions([hit],10.025).get('a')
 const before=JSON.stringify({enemy,motion})
 art.applyImpact('a',pose)
 assert.ok(actor.node.position.x>base.position.x)
 assert.equal(actor.node.scale.x,base.scale.x*pose.scaleX)
 assert.equal(actor.node.scale.y,base.scale.y*pose.scaleY)
 assert.equal(actor.sprite.color.args[3],150);assert.equal(actor.node.depth,34)
 const frame=structuredClone({position:actor.node.position,scale:actor.node.scale})
 draw();art.applyImpact('a',pose)
 assert.deepEqual({position:actor.node.position,scale:actor.node.scale},frame,'pause redraw cannot accumulate offsets')
 draw();art.applyImpact('a',shadowBodyReactions([hit],10.181).get('a'))
 assert.deepEqual({position:actor.node.position,scale:actor.node.scale},base)
 assert.equal(JSON.stringify({enemy,motion}),before)
})
