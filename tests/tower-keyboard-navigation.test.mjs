import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';
class Node{
 constructor(name){Object.assign(this,{name,children:[],components:new Map(),activeInHierarchy:true,isValid:true,layer:1,worldPosition:{x:0,y:0},worldScale:{x:1,y:1}});}
 addChild(n){n.parent=this;this.children.push(n);}
 addComponent(Type){const c=new Type();c.node=this;this.components.set(Type,c);return c;}
 getComponent(Type){return this.components.get(Type);}
 destroy(){this.isValid=false;if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);}
 removeFromParent(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);this.parent=null;}
 emit(){this.clicks=(this.clicks||0)+1;}
}
class Button{static EventType={CLICK:'click'};interactable=true;}
class UITransform{contentSize={width:80,height:72};}
class BlockInputEvents{}class EditBox{}class ScrollView{}
class Graphics{roundRect(){}stroke(){}}
const KeyCode=Object.fromEntries(['ESCAPE','ENTER','SPACE','TAB','ARROW_LEFT','ARROW_RIGHT','ARROW_UP','ARROW_DOWN'].map((s,i)=>[s,i]));
const source=stripTypeScriptTypes(readFileSync(new URL('../cocos-pilot/assets/scripts/TowerKeyboardNavigation.ts',import.meta.url),'utf8').replace(/^import .*$/gm,''),{mode:'transform'}).replace(/^export /gm,'');
const Type=runInNewContext(source+';TowerKeyboardNavigation',{Node,Button,UITransform,BlockInputEvents,EditBox,ScrollView,Graphics,KeyCode,Color:class{},Vec2:class{},isValid:n=>n.isValid});
const button=(parent,name,x=0,y=0)=>{const n=new Node(name);parent.addChild(n);n.addComponent(Button);n.addComponent(UITransform);n.worldPosition={x,y};return n;};
test('modal focus excludes background and does not mistake its close button for a modal',()=>{
 const root=new Node('root'),background=button(root,'底层购买'),shade=new Node('购买遮罩');root.addChild(shade);shade.addComponent(BlockInputEvents);
 const close=button(shade,'关闭交易弹窗',100,100),disabled=button(shade,'减少数量');disabled.getComponent(Button).interactable=false;
 const plus=button(shade,'增加数量',100,0),nav=new Type();
 nav.handle(root,KeyCode.TAB);assert.equal(nav.focused,close);
 nav.handle(root,KeyCode.ARROW_DOWN);assert.equal(nav.focused,plus);
 nav.handle(root,KeyCode.ENTER);assert.equal(plus.clicks,1);assert.equal(background.clicks,undefined);
 nav.handle(root,KeyCode.ESCAPE);assert.equal(close.clicks,1);assert.equal(background.clicks,undefined);
});
test('mandatory dialog consumes Escape instead of triggering a background return',()=>{
 const root=new Node('root'),back=button(root,'返回宗门'),shade=new Node('对话面板');root.addChild(shade);shade.addComponent(BlockInputEvents);button(shade,'重试保存');
 const nav=new Type();assert.equal(nav.handle(root,KeyCode.ESCAPE),true);assert.equal(back.clicks,undefined);
});
test('breakthrough owns focus even during its buttonless animation',()=>{
 const root=new Node('root'),background=button(root,'暂停'),nav=new Type();
 nav.handle(root,KeyCode.TAB);
 const ritual=new Node('突破仪式');root.addChild(ritual);ritual.addComponent(BlockInputEvents);
 for(const key of [KeyCode.TAB,KeyCode.ENTER,KeyCode.SPACE,KeyCode.ESCAPE])assert.equal(nav.handle(root,key),true);
 assert.equal(background.clicks,undefined);assert.equal(nav.focused,null);
 const attempt=button(ritual,'突破确认');nav.handle(root,KeyCode.TAB);assert.equal(nav.focused,attempt);
 nav.handle(root,KeyCode.ENTER);assert.equal(attempt.clicks,1);assert.equal(background.clicks,undefined);
});
