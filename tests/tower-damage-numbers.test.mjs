import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {stripTypeScriptTypes} from 'node:module'
import {runInNewContext} from 'node:vm'

function setup(){
 class Node {constructor(){this.active=true;this.layer=1} addComponent(T){return new T()} setPosition(x,y){this.position={x,y}}}
 class Label {static Overflow={NONE:0};static HorizontalAlign={LEFT:0,CENTER:1,RIGHT:2}}
 class UITransform {setContentSize(){}}
 class Color {constructor(...args){this.args=args}}
 const ctx={Node,Label,UITransform,UIOpacity:class{},Color,isValid:()=>true,ELEMENT_NAMES:{fire:'火'},PlayerDamageFeedback:class{reset(){}update(){return []}},presentationPreferences:()=>({reducedMotion:false})}
 const src=readFileSync(new URL('../cocos-pilot/assets/scripts/TowerDamageNumbers.ts',import.meta.url),'utf8').replace(/^import .*$/gm,'').replace(/^export /gm,'')
 const View=runInNewContext(stripTypeScriptTypes(src,{mode:'transform'})+';TowerDamageNumbers',ctx)
 const view=new View(),parent=new Node(),s={time:10,player:{hp:100},effects:[]},camera={x:0,y:0}
 const anchors=new Map([['bear',{x:0,y:160,halfWidth:80}]])
 const viewport={width:960,height:540};const draw=()=>view.draw(parent,s,camera,anchors,viewport)
 const hit=(id,source='normal',at=s.time)=>({id,kind:'hit',targetId:'bear',x:0,y:0,damage:2300,source,startedAt:at,targetRadius:24})
 const visible=()=>view.pool.filter(p=>p.node.active)
 return {view,s,camera,anchors,draw,hit,visible,viewport}
}

test('damage starts beside rendered upper body, not the ground collision radius',()=>{
 const a=setup();a.s.effects=[a.hit('one')];a.draw();const p=a.visible()[0].node.position
 assert.ok(p.y>=160);assert.ok(p.x>80)
})
test('simultaneous direct, bleed, wound and attached damage have separate readable rows',()=>{
 const a=setup();a.s.effects=['normal','weapon_bleed','wound','weapon_on_hit'].map((source,i)=>a.hit(String(i),source));a.draw()
 const rows=a.visible().map(p=>p.node.position.y).sort((x,y)=>x-y)
 assert.equal(rows.length,4);for(let i=1;i<rows.length;i++)assert.ok(rows[i]-rows[i-1]>=32)
})
test('rapid hit bursts are bounded per enemy and receipts are not replayed',()=>{
 const a=setup();a.s.effects=Array.from({length:20},(_,i)=>a.hit(String(i)));a.draw()
 assert.ok(a.visible().length<=4);a.s.time=10.7;a.draw();assert.equal(a.visible().length,0)
})
test('pause is stable; death preserves the last body anchor and camera still projects it',()=>{
 const a=setup();a.draw();a.anchors.clear();a.s.effects=[a.hit('lethal')];a.draw()
 const first={...a.visible()[0].node.position};assert.ok(first.y>=160)
 a.draw();assert.deepEqual(a.visible()[0].node.position,first)
 a.camera.x=30;a.camera.y=20;a.draw();const moved=a.visible()[0].node.position
 assert.equal(moved.x,first.x-30);assert.equal(moved.y,first.y-20)
 a.s.time=10.66;a.s.effects=[];a.draw();assert.equal(a.visible().length,0)
})
test('edge targets keep text inside the landscape viewport',()=>{
 const a=setup();a.anchors.set('bear',{x:450,y:250,halfWidth:80});a.s.effects=[a.hit('edge','weapon_bleed')];a.draw()
 const row=a.visible()[0];assert.ok(row.node.position.x<450);assert.ok(row.node.position.y<=250)
})

test('upper right HUD makes the text choose the unobstructed side',()=>{
 const a=setup();a.viewport.blocked=[{x:170,y:170,width:180,height:180}];a.s.effects=[a.hit('hud')];a.draw()
 assert.ok(a.visible()[0].node.position.x<0)
})
test('nearby targets do not paint text over one another',()=>{
 const a=setup();a.anchors.set('wolf',{x:0,y:160,halfWidth:80})
 a.s.effects=[a.hit('a'),{...a.hit('b'),targetId:'wolf'}];a.draw()
 const [one,two]=a.visible().map(p=>p.node.position)
 assert.ok(Math.abs(one.x-two.x)>70||Math.abs(one.y-two.y)>=44)
})

test('top strip and map together prefer a nearby free side, not a position under the feet',()=>{
 const a=setup();a.viewport.blocked=[{x:0,y:246,width:960,height:48},{x:350,y:170,width:200,height:200}]
 a.anchors.set('bear',{x:200,y:180,halfWidth:80})
 a.s.effects=['normal','weapon_bleed','wound','weapon_on_hit'].map((source,i)=>a.hit(String(i),source));a.draw()
 const rows=a.visible();assert.equal(rows.length,4)
 assert.ok(rows.every(p=>p.node.position.x<200));assert.ok(Math.min(...rows.map(p=>p.node.position.y))>30)
})
