import {equipmentSkillBonus} from '../js/xianxia/TowerEquipmentSkillLevels.js'
import * as resonanceTools from '../js/xianxia/TowerResonance.js'
import {classProfile} from '../js/xianxia/TowerClassProfiles.js'
import * as forgingTools from '../js/xianxia/TowerForging.js'
import * as forgingMaterials from '../js/xianxia/TowerForgeMaterials.js'
import * as equipmentSources from '../js/xianxia/TowerEquipmentSources.js'
import * as alchemyTools from '../js/xianxia/TowerAlchemy.js'
import * as pillTools from '../js/xianxia/TowerPills.js'
import * as mixedTools from '../js/xianxia/TowerMixedDraw.js'
import * as tierTools from '../js/xianxia/TowerEquipmentTiers.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { runInNewContext } from 'node:vm'
import * as inventoryTools from '../js/xianxia/TowerInventory.js'
import * as weaponTools from '../js/xianxia/TowerWeapons.js'
import * as craftingTools from '../js/xianxia/TowerCrafting.js'
import * as equipmentTools from '../js/xianxia/TowerEquipment.js'
import * as campaign from '../js/xianxia/TowerCampaign.js'
import * as growth from '../js/xianxia/TowerGrowth.js'
import { skillPresentation } from '../js/xianxia/TowerSkillPresentation.js'
import * as content from '../js/xianxia/TowerContent.js'
import * as profile from '../js/xianxia/TowerProfile.js'
import * as loot from '../js/xianxia/TowerLoot.js'
import * as economy from '../js/xianxia/TowerEconomy.js'
import { stats as combatStats, characterCombatAttributes } from '../js/xianxia/TowerRun.js'
import { checksum } from '../js/xianxia/Checksum.js'

// Independent inventory UI harness: real menu/business code, simulated Cocos scene graph.
// Intentionally does not import or execute the shared host-tools test suite.
const sources = Object.fromEntries(['TowerStatusIconArt','TowerPreferences', 'TowerMenuChrome', 'TowerMonsterArt', 'TowerStoneArt', 'TowerSkillIcons', 'TowerSkillTreeCatalog', 'TowerSkillTreeLayout', 'TowerPlayerHud', 'TowerInventoryPanel', 'TowerMenu'].map(name => [name,
 stripTypeScriptTypes(readFileSync(new URL(`../cocos-pilot/assets/scripts/${name}.ts`, import.meta.url), 'utf8').replace(/^import .*$/gm, ''), {mode:'transform'}).replace(/^export /gm, '')]));
class Node {
  static EventType = { TOUCH_START: 'start', TOUCH_MOVE: 'move', TOUCH_END: 'end', TOUCH_CANCEL: 'cancel' }
  constructor(name = '') {
    Object.assign(this, { name, layer: 1, children: [], components: new Map(), events: new Map(), active: true, isValid: true })
  }
  addChild(node) { node.removeFromParent(); node.parent = this; this.children.push(node) }
  addComponent(Type) { const component = new Type(); component.node = this; this.components.set(Type, component); return component }
  getComponent(Type) { return this.components.get(Type) || null }
  setPosition(x, y) { this.position = { x, y } }
  setScale(x, y, z) { this.scale = { x, y, z } }
  setSiblingIndex(index) {
    if (!this.parent) return;
    const siblings = this.parent.children;
    siblings.splice(siblings.indexOf(this), 1);
    siblings.splice(Math.max(0, Math.min(index, siblings.length)), 0, this);
  }
  on(event, fn) { this.events.set(event, fn) }
  removeFromParent() {
    if (this.parent) this.parent.children = this.parent.children.filter(node => node !== this)
    this.parent = null
  }
  destroy() {
    this.isValid = false
    for (const child of [...this.children]) child.destroy()
    this.removeFromParent()
  }
}
class UITransform {
  setContentSize(width, height) { this.contentSize = { width, height } }
  setAnchorPoint(x, y) { this.anchor = { x, y } }
}
class Graphics {
  recordArcs = false
  arcCalls = []
  segments = []
  pathPoint = null
  clear() { this.arcCalls.length = 0 }
  arc(...args) { if (this.recordArcs) this.arcCalls.push(args) }
  roundRect() {} rect() {} fill() {} stroke() {}
  moveTo(x, y) { if (this.node?.name === '技能前置连线') this.pathPoint = { x, y } }
  lineTo(x, y) {
    if (this.node?.name === '技能前置连线' && this.pathPoint) {
      this.segments.push({ from: this.pathPoint, to: { x, y }, color: this.strokeColor.r })
      this.pathPoint = { x, y }
    }
  }
  circle() {} ellipse() {} close() {} quadraticCurveTo() {}
}
class Label {
  static HorizontalAlign = { LEFT: 0, CENTER: 1, RIGHT: 2 }
  static VerticalAlign = { CENTER: 1 }
  static Overflow = { NONE: 0, SHRINK: 1, CLAMP: 2 }
  static CacheMode = { NONE: 0 }
}
class Button {
  static Transition = { SCALE: 1 }
  static EventType = { CLICK: 'click' }
  interactable = true
}
class Sprite {
  static SizeMode = { CUSTOM: 0 }
  static Type = { FILLED: 3 }
  static FillType = { RADIAL: 2 }
  frameAssignments = []
  get isValid() { return this.node?.isValid === true }
  get spriteFrame() { return this.frameAssignments.at(-1) || null }
  set spriteFrame(frame) { this.frameAssignments.push(frame) }
}
class ImageAsset {
  width = 256
  height = 256
  refs = 0
  addRef() { this.refs++; return this }
  decRef() { this.refs--; return this }
}
class Texture2D {
  static Filter = { LINEAR: 0 }
  isValid = true
  setFilters(min, mag) { this.filters = { min, mag } }
  setMipFilter(value) { this.mipFilter=value }
  destroy() { this.isValid = false }
}
class SpriteFrame {
  // Synthetic engine assets exercise host wiring, not PNG decoding or art quality.
  width = 256
  height = 256
  isValid = true
  destroy() { this.isValid = false }
}
class Color { constructor(r, g, b, a) { Object.assign(this, { r, g, b, a }) } }
class Vec2 { constructor(x, y) { Object.assign(this, { x, y }) } }
class ScrollView {
  offset = new Vec2(0, 0)
  // Cocos takes positive scroll distances, but reports leftward displacement
  // as negative X. Returning the argument unchanged hides redraw regressions.
  getScrollOffset() { return new Vec2(this.offset.x ? -this.offset.x : 0, this.offset.y) }
  scrollToOffset(point) { this.offset = new Vec2(point.x, point.y) }
  stopAutoScroll() {}
}
class Mask {
  static Type = { GRAPHICS_RECT: 0, GRAPHICS_ELLIPSE: 1 }
}
class BlockInputEvents {}
class LabelOutline {}
class LabelShadow {}
// Reader rendering is covered in the real-browser suite. This suite keeps only
// its lifecycle/navigation boundary so inventory tests do not emulate EditBox.
class TowerLibraryPanelBoundary {
 currentView='room';
 constructor(parent,width,height,options) {
  this.options=options;this.root=new Node('LibraryBoundary');
  this.root.addComponent(UITransform).setContentSize(width,height);parent.addChild(this.root);
 }
 showRoom() { this.currentView='room'; }
 dismiss() { return false; }
 destroy() { this.root.destroy(); }
}

const context = { ...resonanceTools, equipmentSkillBonus, classProfile, characterCombatAttributes, ...mixedTools, ...forgingTools, ...forgingMaterials, ...equipmentSources, ...alchemyTools, ...tierTools, ...inventoryTools, ...weaponTools, ...equipmentTools, ...craftingTools, ...campaign, ...growth, ...content, ...profile, ...pillTools, ...loot, ...economy,
 sys:{localStorage:{getItem:()=>null,setItem(){}}}, skillPresentation, combatStats, Node, UITransform, Graphics, Label, LabelOutline, LabelShadow, Button, Sprite, SpriteFrame, ImageAsset, Texture2D, Color, Vec2, ScrollView, Mask, BlockInputEvents,
 TowerLibraryPanel: TowerLibraryPanelBoundary,
 // Character artwork is outside this inventory scene-graph harness.
 TowerCharacterArt: class { draw() {} destroy() {} },
 isValid: value => value?.isValid === true, resources: {load() {}} };
for (const [key, result] of [
 ['TowerStatusIconArt','{TowerStatusIconArt,STATUS_ICON_SIZE}'],
 ['TowerPreferences','{presentationPreferences,setPresentationPreference}'],
 ['TowerMenuChrome','{drawMenuVeil,drawMenuClose,drawMenuBack,isMenuBack,MENU_COLORS,ITEM_COLORS,BOOK_COLORS}'],
 ['TowerMonsterArt','{TowerMonsterArt}'],
 ['TowerStoneArt','{TowerStoneArt}'],
 ['TowerSkillIcons','TowerSkillIcons'],
 ['TowerSkillTreeCatalog','{TREE_BRANCHES, COMMON_SKILL_IDS, FUTURE_SKILLS, DISPLAY_STAGES, COLUMN_INDEX, TREE_COLUMNS}'],
 ['TowerSkillTreeLayout','{layoutSkillTree}'],
 ['TowerPlayerHud','{createPlayerHud,drawPlayerHp,drawPlayerMana,drawPlayerXp,drawHudPortrait,drawHudActionIcon,SETTINGS_ICON_SIZE}'],
 ['TowerInventoryPanel','{TowerInventoryPanel}']]) {
 const value = runInNewContext('(() => {'+sources[key]+';return '+result+'})()',context);
 if (key==='TowerSkillIcons') context.TowerSkillIcons=value; else Object.assign(context,value);
}
context.TowerSectScene = class { attach() {} destroy() {} clearBindings() {} };
const Menu = runInNewContext('(() => {'+sources.TowerMenu+';return TowerMenu})()',context);
const copy = value => JSON.parse(JSON.stringify(value));
const all = node => [node, ...node.children.flatMap(all)];
const text = node => all(node).map(n => n.getComponent(Label)?.string || '').join('\n');
function find(menu, name) { const nodes = all(menu.root).filter(n => n.name === name && !n.getComponent(Label)); assert.equal(nodes.length, 1, name); return nodes[0]; }
function click(menu, name) { const n=find(menu,name); assert.equal(n.getComponent(Button).interactable,true,name); n.events.get(Button.EventType.CLICK)(); }
function setup(width=1280,height=720,patch={}) {
 const data=new Map();
 const storage={ fail:false, getItem:key=>data.get(key)??null, setItem(key,value){if(this.fail)throw Error('quota');data.set(key,value);} };
 const initial = new campaign.TowerCampaignStore(storage, 1800000000000);
 assert.ok(initial.act({type:'sync'},1800000000000).ok);
 const record=JSON.parse(data.get(campaign.TOWER_CAMPAIGN_KEY));
 const state=JSON.parse(record.data); Object.assign(state,{...patch,pills:{...state.pills,...patch.pills}});
 record.data=JSON.stringify(state); record.checksum=checksum(record.data);data.set(campaign.TOWER_CAMPAIGN_KEY,JSON.stringify(record));
 const store = new campaign.TowerCampaignStore(storage,1800000000000);
 assert.equal(store.readOnly,false);
 const calls=[]; let menu;
 menu=new Menu(new Node('canvas'),width,height,{
 action(action){calls.push(copy(action)); const result=store.act(action,1800000000000);
  menu.render({...store.state,readOnly:store.readOnly},menu.currentPage || 'inventory',result.ok?'':'保存失败，请重试');return result;},
 page(page){menu.render({...store.state,readOnly:store.readOnly},page);},enterFloor(){},resume(){calls.push({type:'resume'});},training(){} });
 menu.render(store.state,'inventory');
 return {menu,store,storage,calls,data};
}

function purchaseAction(state, category='weapon') {
 return {type:'buyGear',id:`${category}:fan:q1`,count:1,sequence:state.forgeSequence+1,requestId:`inventory-${state.forgeSequence+1}`};
}
function draw(fixture, category='weapon') {
 const result=fixture.store.act(purchaseAction(fixture.store.state,category),1800000000000);
 assert.ok(result.ok,JSON.stringify(result));
 fixture.menu.render(fixture.store.state,'inventory');
 return result.ids[0];
}
function dismissDetails(f){const overlay=find(f.menu,'物品详情遮罩');overlay.events.get(Node.EventType.TOUCH_END)({target:overlay});}
function select(f,id){click(f.menu,'背包物品-'+id);}
function stateJSON(f){return JSON.stringify(f.store.state);}
function coords(node,ancestor){
 const transform=node.getComponent(UITransform),size=transform.contentSize;
 let x=(.5-(transform.anchor?.x??.5))*size.width,y=(.5-(transform.anchor?.y??.5))*size.height;
 let width=size.width,height=size.height,n=node;
 while(n!==ancestor){
  assert.ok(n,'ancestor must contain node');
  const sx=n.scale?.x??1,sy=n.scale?.y??1;
  x=x*sx+(n.position?.x??0);y=y*sy+(n.position?.y??0);
  width*=Math.abs(sx);height*=Math.abs(sy);n=n.parent;
 }
 return{x,y,width,height};
}
function bounded(node,ancestor){const b=coords(node,ancestor),a=ancestor.getComponent(UITransform).contentSize;assert.ok(b.x-b.width/2>=-a.width/2-.01&&b.x+b.width/2<=a.width/2+.01,node.name+' x');assert.ok(b.y-b.height/2>=-a.height/2-.01&&b.y+b.height/2<=a.height/2+.01,node.name+' y');return b;}

for(const [w,h] of [[1280,720],[844,390]])test(`mixed draw ${w}x${h}: reveal, skip, inspect and dismiss never award twice`,()=>{
 const f=setup(w,h);
 f.menu.dismissInventory();f.menu.render(f.store.state,'hall');click(f.menu,'机缘抽奖');
 click(f.menu,'十连 · 1000点眷');
 const saved=stateJSON(f);
 assert.match(text(find(f.menu,'机缘抽取结果')),/1\s*\/\s*10/);
 click(f.menu,'下一件');
 assert.match(text(find(f.menu,'机缘抽取结果')),/2\s*\/\s*10/);
 click(f.menu,'跳过展示');
 assert.equal(all(f.menu.root).filter(n=>/^机缘结果-\d+$/.test(n.name)).length,10);
 for(let i=0;i<10;i++)bounded(find(f.menu,`机缘结果-${i}`),find(f.menu,'机缘抽取结果'));
 click(f.menu,'机缘结果-0');
 find(f.menu,'机缘物品详情');
 click(f.menu,'返回总览');click(f.menu,'确认获得');
 assert.equal(all(f.menu.root).some(n=>n.name==='机缘抽取结果'),false);
 click(f.menu,'查看本次结果');click(f.menu,'确认获得');
 assert.equal(stateJSON(f),saved);
 assert.equal(f.calls.filter(a=>a.type==='drawMixed').length,1);
});
test('mixed draw: failed save has no success overlay; single draw can be confirmed',()=>{
 const f=setup();f.menu.dismissInventory();f.menu.render(f.store.state,'hall');click(f.menu,'机缘抽奖');
 const saved=stateJSON(f);f.storage.fail=true;
 click(f.menu,'单抽 · 100点眷');
 assert.equal(all(f.menu.root).some(n=>n.name==='机缘抽取结果'),false);
 assert.equal(stateJSON(f),saved);
 f.storage.fail=false;f.menu.mixedLastSubmit=-1000;
 click(f.menu,'单抽 · 100点眷');find(f.menu,'机缘抽取结果');
 click(f.menu,'确认获得');assert.equal(f.store.state.contribution,900);assert.equal(f.store.state.mixedDraw.tickets,0);
});
for(const [w,h] of [[1280,720],[844,390]])test(`mixed draw cells match backpack rendering ${w}x${h}`,()=>{
 const f=setup(w,h);f.menu.dismissInventory();f.menu.render(f.store.state,'hall');
 click(f.menu,'机缘抽奖');click(f.menu,'十连 · 1000点眷');click(f.menu,'跳过展示');
 const rewards=f.store.state.mixedDraw.receipts.at(-1).rewards;
 const cells=rewards.map((_,i)=>find(f.menu,`机缘结果-${i}`));
 const visual=n=>({
  size:n.getComponent(UITransform)?.contentSize,
  fill:n.getComponent(Graphics)?.fillColor,stroke:n.getComponent(Graphics)?.strokeColor,
  line:n.getComponent(Graphics)?.lineWidth,
  text:n.getComponent(Label)?.string,
  children:n.children.map(visual),
 });
 const resultVisuals=cells.map(visual);
 assert.equal(cells[0].position.y,cells[7].position.y);
 assert.equal(cells[0].position.x,cells[8].position.x);
 assert.notEqual(cells[0].position.y,cells[8].position.y);
 const grid=find(f.menu,'机缘结果列表');
 assert.deepEqual(all(grid).map(n=>n.getComponent(Label)?.string).filter(Boolean),rewards.filter(r=>r.kind!=='gear').map(r=>String(r.count)));
 click(f.menu,'确认获得');f.menu.showInventory(f.store.state);
 rewards.forEach((r,i)=>{
  const bag=find(f.menu,'背包物品-'+(r.instanceId||r.id));
  // Equipment has no quantity badge. Material badges use this draw's amount,
  // while the backpack intentionally shows accumulated stock.
  if(r.kind==='gear')assert.deepEqual(resultVisuals[i],visual(bag));
  else{
   assert.deepEqual(resultVisuals[i].size,visual(bag).size);
   assert.equal(resultVisuals[i].line,visual(bag).line);
   assert.equal(resultVisuals[i].children.filter(n=>n.text).length,1);
  }
 });
});

for(const [w,h] of [[1280,720],[844,390]])test(`inventory ${w}x${h}: bounded independent grid/detail scroll and fixed actions`,()=>{
 const f=setup(w,h,{spiritStones:10000,contribution:10000});
 let last;for(let i=0;i<47;i++)last=draw(f,i%3===0?'weapon':i%3===1?'armor':'ring');
 select(f,last);
 const panel=find(f.menu,'背包面板'),left=find(f.menu,'背包物品区'),right=find(f.menu,'背包详情区');
 bounded(left,panel);bounded(right,find(f.menu,'物品详情遮罩'));bounded(find(f.menu,'背包网格视口'),left);
 const panelSize=panel.getComponent(UITransform).contentSize,rightSize=right.getComponent(UITransform).contentSize;
 assert.ok(rightSize.width<=panelSize.width*.8);
 assert.ok(rightSize.height<=panelSize.height);
 assert.equal(find(f.menu,'物品详情遮罩').getComponent(Graphics),null);
 bounded(find(f.menu,'背包详情视口'),right);
 const details=coords(find(f.menu,'背包详情视口'),find(f.menu,'物品详情遮罩'));
 const actions=['穿戴','分解'].map(name=>bounded(find(f.menu,name),find(f.menu,'物品详情遮罩')));
 for(const b of actions)assert.ok(details.x+details.width/2<b.x-b.width/2);
 const grid=find(f.menu,'背包网格视口').getComponent(ScrollView),scroll=find(f.menu,'背包详情视口').getComponent(ScrollView);
 assert.equal(grid.horizontal,false);assert.equal(scroll.horizontal,false);
 assert.ok(grid.content.getComponent(UITransform).contentSize.height>find(f.menu,'背包网格视口').getComponent(UITransform).contentSize.height);
 const cells=grid.content.children.filter(n=>n.name.startsWith('背包物品-'));
 for(const cell of cells){const size=cell.getComponent(UITransform).contentSize;assert.equal(size.width,size.height);assert.ok(size.width<100);const row=inventoryTools.inventoryEntries(f.store.state).find(row=>cell.name==='背包物品-'+row.id);assert.ok(!text(cell).includes(row.shortName));}
 assert.equal(find(f.menu,'最近获得').position.y,find(f.menu,'全部').position.y);
 for(const name of ['全部','装备','丹药','最近获得']){
  const button=find(f.menu,name);
  assert.equal(all(button).some(n=>n.getComponent(Label)),true);
  assert.ok(button.children.some(n=>n.getComponent(Graphics)));
 }
 for(const label of ['全部阶位','全部品质','全部状态'])assert.equal(all(f.menu.root).some(n=>n.name===label),false);
 assert.equal(new Set(cells.slice(0,8).map(n=>n.position.y)).size,1);
 assert.notEqual(cells[0].position.y,cells[8].position.y);
 grid.scrollToOffset(new Vec2(0,50));scroll.scrollToOffset(new Vec2(0,30));
 f.menu.render(f.store.state,'inventory');
 assert.equal(find(f.menu,'背包网格视口').getComponent(ScrollView).offset.y,50);
 assert.deepEqual(['穿戴','分解'].map(name=>bounded(find(f.menu,name),find(f.menu,'物品详情遮罩'))),actions);
 assert.match(text(f.menu.root),/装备 50\/240/);
});

test('cross-category acquisition order and viewed dots persist across restart without merging duplicates',()=>{
 const f=setup(1280,720,{spiritStones:5000,contribution:5000});
 const a=draw(f,'weapon'),b=draw(f,'ring'),c=draw(f,'weapon');
 assert.deepEqual(inventoryTools.inventoryEntries(f.store.state).slice(0,3).map(r=>r.id),[c,b,a]);
 assert.ok(inventoryTools.inventoryEntries(f.store.state).find(r=>r.id===b).isNew);
 select(f,b);
 assert.equal(f.store.state.inventoryMeta[b].seen,true);
 const restored=new campaign.TowerCampaignStore(f.storage,1800000000000);
 assert.equal(restored.state.inventoryMeta[b].seen,true);
 assert.deepEqual(inventoryTools.inventoryEntries(restored.state).slice(0,3).map(r=>r.id),[c,b,a]);
 assert.ok(restored.state.weapons[a]&&restored.state.weapons[c]);
});

test('equipment uses current preset only; any of three presets blocks selling',()=>{
 const f=setup(1280,720,{spiritStones:5000,contribution:5000});
 for(const category of ['weapon','armor','ring']){
  const id=draw(f,category),before=copy(f.store.state.loadouts);
  select(f,id);click(f.menu,'穿戴');
  assert.equal(f.store.state.loadouts[0][category+'Id'],id);
  assert.deepEqual(copy(f.store.state.loadouts.slice(1)),before.slice(1));
  click(f.menu,'装备槽-'+category);
  assert.equal(all(f.menu.root).some(n=>n.name==='出售'),false);
  assert.ok(find(f.menu,'解除').getComponent(Button).interactable);
  const third=copy(f.store.state.loadouts[2]);third[category+'Id']=id;
  assert.ok(f.store.act({type:'setLoadout',index:2,loadout:third},1800000000000).ok);
  assert.ok(f.store.act({type:'setLoadout',index:0,loadout:before[0]},1800000000000).ok);
  f.menu.render(f.store.state,'inventory');select(f,id);
  assert.match(inventoryTools.inventoryQuote(f.store.state,id,'sell').reason,/配装三/);
  assert.equal(inventoryTools.inventoryQuote(f.store.state,id,'sell').ok,false);
  assert.equal(f.store.act({type:'sellGear',ids:[id]},1800000000000).ok,false);
 }
});

test('equipped items leave the backpack grid and return after replacement or unequip',()=>{
 const f=setup(1280,720,{spiritStones:5000,contribution:5000});
 const visible=id=>all(f.menu.root).some(n=>n.name==='背包物品-'+id);
 for(const category of ['weapon','armor','ring']){
  const previous=f.store.state.loadouts[0][category+'Id'];
  assert.equal(visible(previous),false);
  const id=draw(f,category);
  assert.equal(visible(id),true);
  select(f,id);click(f.menu,'穿戴');
  assert.equal(visible(id),false);
  assert.equal(visible(previous),true);
  assert.equal(all(f.menu.root).some(n=>n.name==='背包详情区'),false);
  click(f.menu,'装备槽-'+category);
  assert.ok(find(f.menu,'解除').getComponent(Button).interactable);
  click(f.menu,'解除');
  assert.equal(visible(id),true);
  assert.equal(f.store.state.loadouts[0][category+'Id'],'');
 }
});

test('single fan-gear sale requires confirmation, returns real spirit stones once and persists removal',()=>{
 const f=setup(1280,720,{spiritStones:5000,contribution:5000});const id=draw(f,'ring');select(f,id);
 const expected=inventoryTools.inventoryQuote(f.store.state,id,'sell').refund;
 const before=stateJSON(f);click(f.menu,'出售');assert.equal(stateJSON(f),before);
 assert.match(text(find(f.menu,'背包分解确认遮罩')),new RegExp(`×${expected}`));
 click(f.menu,'取消出售');assert.equal(stateJSON(f),before);
 click(f.menu,'出售');const callback=find(f.menu,'确认出售').events.get(Button.EventType.CLICK);
 const stones=f.store.state.spiritStones;callback();callback();
 assert.equal(f.store.state.equipment[id],undefined);assert.equal(f.store.state.spiritStones,stones+expected);
 assert.equal(f.store.state.inventoryMeta[id],undefined);
 assert.equal(f.calls.filter(a=>a.type==='sellGear').length,1);
 assert.equal(new campaign.TowerCampaignStore(f.storage,1800000000000).state.equipment[id],undefined);
});

test('starter protection; save failure keeps item and refund atomic, then permits retry',()=>{
 const f=setup(1280,720,{spiritStones:5000,contribution:5000});const id=draw(f,'armor');select(f,id);
 click(f.menu,'出售');
 const before=stateJSON(f),disk=f.data.get(campaign.TOWER_CAMPAIGN_KEY);f.storage.fail=true;
 click(f.menu,'确认出售');assert.equal(stateJSON(f),before);assert.equal(f.data.get(campaign.TOWER_CAMPAIGN_KEY),disk);
 assert.ok(f.store.state.equipment[id]);f.storage.fail=false;
 click(f.menu,'出售');click(f.menu,'确认出售');assert.equal(f.store.state.equipment[id],undefined);
 for(const id of ['iron','basic-armor','basic-ring'])assert.equal(inventoryTools.inventoryQuote(f.store.state,id,'sell').ok,false);
});

test('stale confirmation rechecks changed preset references',()=>{
 const f=setup(1280,720,{spiritStones:5000,contribution:5000});const id=draw(f);select(f,id);click(f.menu,'出售');
 assert.ok(f.store.act({type:'setLoadout',index:2,loadout:{...f.store.state.loadouts[2],weaponId:id}},1800000000000).ok);
 const before=stateJSON(f);click(f.menu,'确认出售');assert.equal(stateJSON(f),before);assert.ok(f.store.state.weapons[id]);
});

test('pills stack outside gear capacity, consume one in camp and never mutate in a battle/read-only menu',()=>{
 const f=setup(1280,720,{hp:50,clearedFloor:1,pills:{ zhuji: 0,huichun:3,peiyuan:2}});
 assert.deepEqual(inventoryTools.inventoryCapacity(f.store.state),{used:3,max:240});
 click(f.menu,'丹药');select(f,'huichun');assert.ok(all(find(f.menu,'背包物品-huichun')).some(n=>n.getComponent(Label)?.string==='3'));click(f.menu,'使用');
 assert.equal(f.store.state.pills.huichun,2);assert.equal(f.store.state.hp,100);
 assert.equal(find(f.menu,'使用').getComponent(Button).interactable,false);
 select(f,'peiyuan');click(f.menu,'使用');assert.equal(f.store.state.pills.peiyuan,1);assert.equal(f.store.state.xp,50);
 const before=stateJSON(f),calls=f.calls.length;
 f.menu.render({...f.store.state,activeRun:{snapshot:{player:null}}},'inventory');
 assert.match(text(f.menu.root),/战斗已暂停 · 可穿戴或卸下装备/);assert.equal(find(f.menu,'使用').getComponent(Button).interactable,false);
 find(f.menu,'使用').events.get(Button.EventType.CLICK)();assert.equal(f.calls.length,calls);assert.equal(stateJSON(f),before);
 f.menu.render({...f.store.state,readOnly:true},'inventory');assert.equal(find(f.menu,'使用').getComponent(Button).interactable,false);
});

test('capacity prevents charging, pills do not count and selling frees exactly one slot',()=>{
 const f=setup(1280,720,{spiritStones:100000,contribution:100000});
 for(let i=0;i<237;i++)assert.ok(f.store.act(purchaseAction(f.store.state,'ring'),1800000000000).ok);
 assert.deepEqual(inventoryTools.inventoryCapacity(f.store.state),{used:240,max:240});
 const before=stateJSON(f),result=f.store.act(purchaseAction(f.store.state),1800000000000);
 assert.equal(result.reason,'capacity');assert.equal(stateJSON(f),before);
 f.menu.render(f.store.state,'inventory');select(f,'gear-1');click(f.menu,'出售');click(f.menu,'确认出售');
 assert.equal(inventoryTools.inventoryCapacity(f.store.state).used,239);
 assert.ok(f.store.act(purchaseAction(f.store.state),1800000000000).ok);
 assert.equal(inventoryTools.inventoryCapacity(f.store.state).used,240);
});

test('filters can clear empty results, sorting is stable and all navigation retains named peaks/presets',()=>{
 const f=setup(844,390,{spiritStones:5000,contribution:5000});const id=draw(f,'armor');
 f.menu.render({...f.store.state,pills:{}},'inventory');click(f.menu,'丹药');assert.match(text(f.menu.root),/还没有这类物品/);
 click(f.menu,'清除筛选');assert.ok(all(f.menu.root).some(n=>n.name==='背包物品-'+id));
 click(f.menu,'最近获得');assert.ok(all(f.menu.root).some(n=>n.name==='按品阶'));
 assert.equal(all(f.menu.root).some(n=>n.name==='三套配装'),false);
 click(f.menu,'关闭背包');assert.equal(f.menu.currentPage,'hall');
 f.menu.dismissInventory();f.menu.render(f.store.state,'home');click(f.menu,'背包');assert.equal(f.menu.inventoryOpen,true);
 f.menu.dismissInventory();f.menu.render(f.store.state,'hall');click(f.menu,'背包');assert.equal(f.menu.inventoryOpen,true);
 f.menu.dismissInventory();f.menu.render(f.store.state,'forge');click(f.menu,'炼器主殿');assert.equal(all(f.menu.root).some(n=>n.name==='抽奖'),false);f.menu.render(f.store.state,'forge');click(f.menu,'背包');
 assert.equal(f.menu.inventoryOpen,true);
 select(f,id);assert.match(text(find(f.menu,'背包详情区')),/凡器/);
});

test('viewing, equipping and selling never alter forge RNG, prices or pity counters',()=>{
 const f=setup(1280,720,{spiritStones:5000,contribution:5000});const id=draw(f,'weapon');
 const forge=state=>copy({forgeRng:state.forgeRng,forgeBossPity:state.forgeBossPity,forgeSequence:state.forgeSequence,forgeReceipts:state.forgeReceipts,rng:state.rng,equipmentRng:state.equipmentRng,weaponPity:state.weaponPity,
  equipmentPity:state.equipmentPity,equipmentDraws:state.equipmentDraws,weaponSequence:state.weaponSequence,
  equipmentSequence:state.equipmentSequence});
 const before=forge(f.store.state),price=copy(forgingTools.FORGING_RECIPES);
 const stones=f.store.state.spiritStones,refund=forgingTools.equipmentSellPrice(f.store.state.weapons[id]);
 select(f,id);click(f.menu,'出售');click(f.menu,'确认出售');
 assert.deepEqual(forge(f.store.state),before);assert.deepEqual(forgingTools.FORGING_RECIPES,price);
 assert.equal(f.store.state.spiritStones,stones+refund);
});

test('invalid inventory metadata is rejected on reload instead of trusting display state',()=>{
 const f=setup(1280,720,{spiritStones:5000,contribution:5000});const id=draw(f);
 const validRecord=JSON.parse(f.data.get(campaign.TOWER_CAMPAIGN_KEY));
 for(const mutate of [
  s=>{s.inventoryMeta[id].seen='yes';},s=>{s.inventoryMeta[id].order=-1;},
  s=>{s.inventoryMeta[id].order=Number.MAX_SAFE_INTEGER;},
  s=>{s.inventoryMeta.absent={order:1,seen:false};},
 ]){
  const state=copy(f.store.state);mutate(state);const record=copy(validRecord);
  record.data=JSON.stringify(state);record.checksum=checksum(record.data);
  f.data.set(campaign.TOWER_CAMPAIGN_KEY,JSON.stringify(record));
  assert.equal(new campaign.TowerCampaignStore(f.storage,1800000000000).readOnly,true);
 }
});

test('equipped items can be removed atomically and remain usable after reload',()=>{
 const f=setup(1280,720,{spiritStones:10000});
 for(const category of ['weapon','armor','ring']) {
  const id=draw(f,category);
  assert.ok(f.store.act(inventoryTools.inventoryQuote(f.store.state,id,'equip').action,1800000000000).ok);
  const quote=inventoryTools.inventoryQuote(f.store.state,id,'unequip');
  assert.ok(quote.ok);
  f.storage.fail=true; const before=stateJSON(f);
  assert.equal(f.store.act(quote.action,1800000000000).ok,false); assert.equal(stateJSON(f),before);
  f.storage.fail=false; assert.ok(f.store.act(quote.action,1800000000000).ok);
  assert.equal(f.store.state.loadouts[0][category+'Id'],'');
  assert.ok(inventoryTools.inventoryQuote(f.store.state,id,'sell').ok);
 }
 const loaded=new campaign.TowerCampaignStore(f.storage,1800000000000);
 assert.equal(loaded.state.loadouts[0].weaponId,'');
 assert.ok(loaded.act({type:'startFloor',floor:1},1800000000000).ok);
 const inBattle=new campaign.TowerCampaignStore(f.storage,1800000000000);
 assert.equal(inBattle.readOnly,false);
 assert.ok(inBattle.state.activeRun);
 assert.equal(inBattle.state.loadouts[0].weaponId,'');
});

for(const [w,h] of [[1280,720],[844,390]])test(`inventory ${w}x${h}: character slots, wallet and contextual back`,()=>{
 const f=setup(w,h);
 assert.equal(all(f.menu.root).some(n=>n.name.startsWith('HUD.')),false);
 assert.equal(all(f.menu.root).some(n=>n.name==='三套配装'),false);
 const character=find(f.menu,'人物装备区'),bag=find(f.menu,'背包物品区');
 assert.ok(character.position.x<bag.position.x);
 for(const category of ['weapon','armor','ring']) {
  const slot=find(f.menu,'装备槽-'+category); bounded(slot,find(f.menu,'人物装备区'));
  const size=slot.getComponent(UITransform).contentSize;assert.equal(size.width,size.height);assert.ok(size.width<100);assert.equal(text(slot).trim(),'');
  click(f.menu,'装备槽-'+category);
  assert.ok(find(f.menu,'解除').getComponent(Button).interactable);
  assert.equal(all(f.menu.root).some(n=>n.name==='分解'),false);
  dismissDetails(f);
 }
 const box=find(f.menu,'背包弹窗');bounded(box,f.menu.root);
 assert.ok(box.getComponent(UITransform).contentSize.width<f.menu.designWidth);
 bounded(find(f.menu,'货币信息'),box);
 assert.equal(all(find(f.menu,'人物装备区')).filter(n=>n.name==='角色全身形象').length,1);
 click(f.menu,'关闭背包'); assert.equal(f.menu.currentPage,'');
 assert.ok(f.store.act({type:'startFloor',floor:1},1800000000000).ok);
 f.menu.showInventory(f.store.state,()=>f.calls.push({type:'resume'}));
 click(f.menu,'关闭背包');assert.equal(f.calls.at(-1).type,'resume');
});

for(const page of ['forge','pills','loadouts','training','home','tutorial','tower'])test(`secondary ${page}: shared background-free sect return`,()=>{
 const f=setup(); f.menu.dismissInventory(); f.menu.render(f.store.state,page);
 const back=find(f.menu,'← 宗门');
 assert.equal(back.getComponent(Graphics),null);
 assert.equal(back.position.x,-f.menu.designWidth/2+92);
 assert.equal(back.position.y,f.menu.designHeight/2-52);
 for(const sibling of f.menu.root.children.filter(n=>n!==back&&n.getComponent(Button))) {
  const a=back.getComponent(UITransform).contentSize,b=sibling.getComponent(UITransform).contentSize;
  assert.ok(Math.abs(sibling.position.x-back.position.x)>=(a.width+b.width)/2 || Math.abs(sibling.position.y-back.position.y)>=(a.height+b.height)/2,sibling.name+' overlaps back');
 }
 assert.ok(text(back).includes('宗门'));
 assert.ok(back.children.find(n=>n.name==='返回箭头')?.getComponent(Graphics));
 assert.ok(!text(back).includes('←'));
 assert.ok(back.getComponent(UITransform).contentSize.height>=72);
 click(f.menu,'← 宗门');assert.equal(f.menu.currentPage,'hall');
});

for (const [page,label] of [['hall','宗门'],['swordPeak','凌霄剑峰']]) {
 for (const dismiss of ['button','escape']) test(`${page} skill shortcut returns to its entry via ${dismiss} after refresh`,()=>{
  const f=setup();f.menu.dismissInventory();f.menu.go(page);
  const before=stateJSON(f);
  click(f.menu,'功法');
  assert.equal(f.menu.currentPage,'library');
  assert.equal(f.menu.libraryPanel,null);
  f.menu.render({...f.store.state},'library','刷新');
  if(dismiss==='button') click(f.menu,`← ${label}`);
  else assert.equal(f.menu.dismissLibrary(),true);
  assert.equal(f.menu.currentPage,page);
  assert.equal(f.menu.libraryPanel,null);
  assert.equal(stateJSON(f),before);
 });
}

test('main peak opens the library reader and skills return there before returning home',()=>{
 const f=setup();f.menu.dismissInventory();f.menu.go('home');
 const before=stateJSON(f);
 click(f.menu,'主峰建筑-藏经阁');
 const reader=f.menu.libraryPanel;
 assert.equal(f.menu.currentPage,'library');
 assert.ok(reader instanceof TowerLibraryPanelBoundary);
 assert.equal(reader.currentView,'room');
 reader.options.onSkills();
 assert.equal(f.menu.currentPage,'library');
 assert.equal(f.menu.libraryPanel,null);
 assert.equal(reader.root.isValid,false);
 const back=find(f.menu,'← 藏经阁');
 assert.equal(back.getComponent(Graphics),null);
 assert.equal(back.getComponent(UITransform).contentSize.height,72);
 assert.match(text(back),/藏经阁/);
 click(f.menu,'← 藏经阁');
 assert.equal(f.menu.currentPage,'library');
 assert.ok(f.menu.libraryPanel instanceof TowerLibraryPanelBoundary);
 f.menu.libraryPanel.options.onHome();
 assert.equal(f.menu.currentPage,'home');
 assert.equal(stateJSON(f),before);
 assert.deepEqual(f.calls,[]);
});

test('library refresh preserves the reader boundary and its current view',()=>{
 const f=setup();f.menu.dismissInventory();f.menu.go('library');
 const reader=f.menu.libraryPanel,before=stateJSON(f);
 // Simulate an open book at the panel boundary; its actual UI is browser-tested.
 reader.currentView='reader';
 f.menu.render({...f.store.state},'library','刷新');
 assert.strictEqual(f.menu.libraryPanel,reader);
 assert.equal(reader.root.isValid,true);
 assert.equal(reader.currentView,'reader');
 assert.equal(f.menu.currentPage,'library');
 assert.equal(stateJSON(f),before);
 assert.deepEqual(f.calls,[]);
});

for (const [width,height] of [[844,390],[1280,720]]) test(`pill shop ${width}x${height}: buy without healing, then consume from inventory`,()=>{
 const f=setup(width,height,{hp:35,contribution:300,pills:{ zhuji: 0,huichun:0,peiyuan:0}});
 f.menu.dismissInventory();f.menu.render(f.store.state,'pills');
 assert.equal(all(f.menu.root).some(n=>n.name==='使用'||n.name==='刷新休养进度'),false);
 assert.doesNotMatch(text(f.menu.root),/生命\s*35|本次可恢复|每分钟恢复/);
 const stage=find(f.menu,'丹霞峰主景');
 for(const n of all(stage).filter(n=>n.getComponent(Button))) bounded(n,stage);
 assert.equal(f.menu.scroll.vertical,false);
 click(f.menu,'丹霞主殿');click(f.menu,'商品卡片-huichun');click(f.menu,'确认购买');click(f.menu,'确认获得');
 assert.equal(f.store.state.spiritStones,495);assert.equal(f.store.state.contribution,300);assert.equal(f.store.state.pills.huichun,1);assert.equal(f.store.state.hp,35);
 click(f.menu,'关闭丹药菜单');
 click(f.menu,'背包');click(f.menu,'丹药');select(f,'huichun');click(f.menu,'使用');
 assert.equal(f.store.state.hp,85);assert.equal(f.store.state.pills.huichun,0);
});

for (const [stones,contribution,expected] of [
 [410,202,['×4','×10','×202']],
 [0,0,['×0','×0']],
 [19999999999,2000000000,['×19999','×99','×99','×99','×2000000000']],
]) test(`wallet ${stones}: exact denomination quantities share one bounded row`,()=>{
 const f=setup(844,390,{spiritStones:stones,contribution});
 for(const page of ['pills','forge']){
  f.menu.dismissInventory();f.menu.render(f.store.state,page);
  const wallet=find(f.menu,'货币信息');bounded(wallet,f.menu.root);
  const labels=all(wallet).filter(n=>n.getComponent(Label));
  assert.deepEqual(labels.map(n=>n.getComponent(Label).string),expected);
  assert.equal(new Set(labels.map(n=>coords(n,wallet).y)).size,1);
  for(const label of labels){bounded(label,wallet);assert.equal(label.getComponent(Label).enableWrapText,false);}
  const rect=coords(wallet,f.menu.root);
  const title=all(f.menu.root).find(n=>n.getComponent(Label)?.string===({pills:'丹霞峰',forge:'炼器峰',inventory:'背包',home:'霁云主峰'})[page]);
  const titleRect=coords(title,f.menu.root);
  assert.ok(rect.x-rect.width/2>=titleRect.x+titleRect.width/2||rect.y+rect.height/2<=titleRect.y-titleRect.height/2);
 }
});

test('equipment artwork uses definition identity and survives delayed loads and redraws',()=>{
 const requested=[];
 const original=context.resources.load;
 context.resources.load=(path,type,callback)=>requested.push({path,callback});
 try {
  const f=setup();
  const path='tower-equipment/eq_sword_iron';
  assert.equal(requested.filter(r=>r.path===path).length,1);
  const slot=find(f.menu,'装备图标-weapon');
  const imageNode=slot.children.find(n=>n.name===path);
  assert.ok(imageNode);
  assert.equal(imageNode.getComponent(Sprite).spriteFrame,null);
  f.menu.showInventory(f.store.state);
  assert.equal(requested.filter(r=>r.path===path).length,1);
  const image=new ImageAsset();requested.find(r=>r.path===path).callback(null,image);
  assert.equal(image.refs,1);
  const live=find(f.menu,'装备图标-weapon').children.find(n=>n.name===path);
  assert.ok(live.getComponent(Sprite).spriteFrame);
  assert.equal(imageNode.isValid,false);
  const before=stateJSON(f);
  click(f.menu,'装备槽-weapon');
  assert.ok(find(f.menu,'背包详情图标-iron').children.some(n=>n.name===path&&n.getComponent(Sprite).spriteFrame));
  assert.equal(stateJSON(f),before);
  f.menu.destroy(); assert.equal(image.refs,0);
 } finally { context.resources.load=original; }
});

test('equipment artwork keeps fallback after load failure and does not request unapproved items',()=>{
 const requested=[];const original=context.resources.load;
 context.resources.load=(path,type,callback)=>requested.push({path,callback});
 try {
  const f=setup();
  const slot=find(f.menu,'装备图标-weapon');
  const g=slot.getComponent(Graphics);let cleared=0;g.clear=()=>cleared++;
  requested.find(r=>r.path==='tower-equipment/eq_sword_iron').callback(Error('missing'),null);
  assert.equal(cleared,0);
  assert.equal(slot.children.find(n=>n.name==='tower-equipment/eq_sword_iron').getComponent(Sprite).spriteFrame,null);
  assert.ok(requested.some(r=>r.path==='tower-equipment/eq_ring_basic'));
  assert.ok(requested.some(r=>r.path==='tower-equipment/eq_armor_basic'));
  assert.ok(!requested.some(r=>r.path==='tower-equipment/eq_armor_chentie'));
  f.menu.destroy();
 } finally { context.resources.load=original; }
});

for (const [w,h] of [[1280,720],[844,390]]) test(`equipment icons fill their cells without text badges ${w}x${h}`,()=>{
 const f=setup(w,h);
 click(f.menu,'装备槽-weapon');
 assert.equal(all(f.menu.root).some(n=>n.name==='分解'),false);
 click(f.menu,'解除');
 const cell=find(f.menu,'背包物品-iron');
 const icon=find(f.menu,'背包图标-iron');
 const art=icon.children.find(n=>n.name==='tower-equipment/eq_sword_iron');
 const cellSize=cell.getComponent(UITransform).contentSize;
 const artSize=art.getComponent(UITransform).contentSize;
 assert.ok(artSize.width>=cellSize.width*.85);
 assert.ok(artSize.width<cellSize.width);
 assert.equal(artSize.width,artSize.height);
 assert.equal(text(cell).trim(),'');
 assert.equal(find(f.menu,'分解').getComponent(Button).interactable,false);
 const before=stateJSON(f);
 find(f.menu,'分解').events.get(Button.EventType.CLICK)?.();
 assert.equal(stateJSON(f),before);
 assert.equal(all(f.menu.root).some(n=>n.name==='背包分解确认遮罩'),false);
});

for (const [w,h] of [[1280,720],[844,390]]) test(`equipment detail hierarchy and lore ${w}x${h}`,()=>{
 const f=setup(w,h);
 click(f.menu,'装备槽-weapon');
 const detail=find(f.menu,'背包详情区');
 assert.equal(detail.getComponent(Graphics).strokeColor.r,'#E4E6E3','detail border follows the item tier');
 const labels=all(detail).map(n=>n.getComponent(Label)).filter(Boolean);
 assert.ok(labels.some(l=>l.string==='穿戴要求：炼气'));
 assert.ok(labels.some(l=>l.string==='基础属性'));
 assert.ok(labels.some(l=>l.string.includes('基础物理攻击 +4～6')));
 assert.ok(labels.some(l=>l.string.includes('基础法术攻击 +4～6')));
 assert.ok(labels.every(l=>!l.string.includes('（平均')));
 assert.doesNotMatch(text(detail),/装备条件|物品属性|锁定状态|配装引用|普攻：|近身单目标/);
 const lore=labels.find(l=>l.node.name==='装备描述');
 assert.ok(lore?.string.length>12);
 const attack=labels.find(l=>l.string.includes('基础物理攻击 +4～6'));
 assert.notEqual(lore.color.r,attack.color.r);
 const icon=bounded(find(f.menu,'背包详情图标-iron'),detail);
 assert.ok(icon.width>=88);
});

test('detail data unifies attributes, preserves actual realm gates and covers every equipment lore',()=>{
 assert.equal(typeof inventoryTools.inventoryDetail,'function');
 const f=setup();
 for(const d of [...weaponTools.WEAPONS,...equipmentTools.EQUIPMENT]){
  assert.ok(d.description.length>=16,d.id);
  const weapon=d.category==='weapon',id=d.quality?'preview':weapon?'iron':`basic-${d.category}`;
  const item=weapon?weaponTools.createFixedWeapon(d.id,id):equipmentTools.createFixedEquipment(d.id,id);
  const detail=inventoryTools.inventoryDetail(f.store.state,{item,category:d.category,tier:d.tier});
  assert.deepEqual(detail.effects,[...detail.ordinaryEffects,...detail.specialEffects],d.id);
  for(const line of detail.basic){
   assert.ok(/^体力 \+[\d.]+（气血 \+[\d.]+）$/.test(line)||/^.+ [+-]\d+(?:\.\d+)?(?:～\d+(?:\.\d+)?)?(?:%(?:\/3秒)?)?$/.test(line),`${d.id}: ${line}`);
   assert.doesNotMatch(line,/[：；＋]|不缩短|独立判定|冷却缩短/);
  }
 }
 assert.equal(new Set([...weaponTools.WEAPONS,...equipmentTools.EQUIPMENT].map(d=>d.description)).size,weaponTools.WEAPONS.length+equipmentTools.EQUIPMENT.length);
 const item=equipmentTools.rollEquipment('ring','ling',4,()=>0,'detail-ring');
 const state={...f.store.state,equipment:{...f.store.state.equipment,[item.id]:item}};
 const row=inventoryTools.inventoryEntries(state).find(r=>r.id===item.id);
 const info=inventoryTools.inventoryDetail(state,row);
 assert.equal(info.requirement,'金丹');assert.equal(info.requirementMet,false);
 assert.ok(info.effects.every(line=>!line.includes('会心')));
 assert.ok(info.basic.every(line=>!line.includes('会心')));
 assert.ok(info.ordinaryEffects.some(line=>line.includes('功法伤害')));
 assert.ok(info.ordinaryEffects.some(line=>line.includes('暴击伤害 +')));
 assert.equal(inventoryTools.inventoryDetail({...state,xp:profile.TOWER_XP_CAP},row).requirementMet,true);
 assert.equal(inventoryTools.inventoryDetail({...state,xp:profile.TOWER_XP_CAP,activeRun:{}},row).requirementMet,true);
});

for (const xp of [0, profile.TOWER_XP_CAP]) test(`realm label reflects cultivation, not other action blockers: ${xp}`,()=>{
 const f=setup();
 const item=equipmentTools.rollEquipment('ring','ling',4,()=>0,'realm-ring');
 const state={...f.store.state,xp,readOnly:true,equipment:{...f.store.state.equipment,[item.id]:item}};
 f.menu.render(state,'inventory');select(f,item.id);
 const label=all(find(f.menu,'背包详情区')).map(n=>n.getComponent(Label)).find(l=>l?.string==='穿戴要求：金丹');
 assert.ok(label);
 assert.equal(label.color.r,xp===0?'#97422F':'#263F39');
 assert.equal(find(f.menu,'穿戴').getComponent(Button).interactable,false);
});

for(const category of ['weapon','armor','ring'])test(`equip closes details only on success; no item locking: ${category}`,()=>{
 const f=setup(1280,720,{spiritStones:5000,contribution:5000});const id=draw(f,category);select(f,id);
 assert.equal(all(f.menu.root).some(n=>['锁定','解锁'].includes(n.name)),false);
 assert.equal(inventoryTools.inventoryQuote(f.store.state,id,'lock').ok,false);
 const before=stateJSON(f);
 assert.equal(f.store.act({type:category==='weapon'?'lockWeapon':'lockEquipment',id,locked:true},1800000000000).ok,false);
 assert.equal(stateJSON(f),before);
 f.storage.fail=true;click(f.menu,'穿戴');
 assert.ok(find(f.menu,'背包详情区'));
 assert.equal(f.store.state.loadouts[0][category+'Id']===id,false);
 f.storage.fail=false;click(f.menu,'穿戴');
 assert.equal(f.store.state.loadouts[0][category+'Id'],id);
 assert.equal(all(f.menu.root).some(n=>n.name==='背包详情区'),false);
 assert.ok(find(f.menu,'背包物品区'));
});

for(const category of ['weapon','armor','ring'])test(`retired lock flag cannot block selling: ${category}`,()=>{
 const f=setup(1280,720,{spiritStones:5000,contribution:5000});const id=draw(f,category);
 const record=JSON.parse(f.data.get(campaign.TOWER_CAMPAIGN_KEY));const saved=JSON.parse(record.data);
 (category==='weapon'?saved.weapons:saved.equipment)[id].locked=true;
 record.data=JSON.stringify(saved);record.checksum=checksum(record.data);f.data.set(campaign.TOWER_CAMPAIGN_KEY,JSON.stringify(record));
 const store=new campaign.TowerCampaignStore(f.storage,1800000000000);
 assert.equal(store.readOnly,false);
 const quote=inventoryTools.inventoryQuote(store.state,id,'sell');assert.equal(quote.ok,true);
 assert.equal(store.act(quote.action,1800000000000).ok,true);
 assert.equal((category==='weapon'?store.state.weapons:store.state.equipment)[id],undefined);
});

for(const [w,h] of [[1280,720],[844,390]])test(`compact comparison cards and external actions ${w}x${h}`,()=>{
 const f=setup(w,h,{spiritStones:5000,contribution:5000});const id=draw(f);select(f,id);
 const overlay=find(f.menu,'物品详情遮罩'),current=find(f.menu,'已装备对比卡'),selected=find(f.menu,'背包详情区');
 const a=bounded(current,overlay),b=bounded(selected,overlay),equip=bounded(find(f.menu,'穿戴'),overlay),dismantle=bounded(find(f.menu,'分解'),overlay);
 assert.ok(a.width<=400&&b.width<=400);
 assert.ok(a.x+a.width/2<b.x-b.width/2);
 assert.ok(b.x+b.width/2<equip.x-equip.width/2);
 assert.equal(b.y+b.height/2,equip.y+equip.height/2);
 assert.ok(equip.y-equip.height/2>dismantle.y+dismantle.height/2);
 assert.match(text(current),/普通铁剑/);
 assert.equal(all(current).some(n=>n.name==='穿戴'||n.name==='分解'),false);
 assert.equal(all(overlay).some(n=>n.name==='关闭详情'),false);
 assert.equal(all(overlay).some(n=>n.name.startsWith('分享物品-')),false);
 assert.equal(selected.getComponent(Graphics).fillColor.r,'#DEE3D3');
 const basic=all(selected).find(n=>n.name==='装备基础属性').getComponent(Label);
 const info=inventoryTools.inventoryDetail(f.store.state,inventoryTools.inventoryEntries(f.store.state).find(row=>row.id===id));
 for(const [name,lines] of [['装备普通效果',info.ordinaryEffects],['装备特殊效果',info.specialEffects]]){
  const effect=all(selected).find(n=>n.name===name);
  assert.equal(!!effect,lines.length>0);
  if(effect)assert.equal(effect.getComponent(Label).string,lines.join('\n'));
 }
 assert.notEqual(find(f.menu,'背包详情视口').getComponent(ScrollView),find(f.menu,'对比详情视口').getComponent(ScrollView));
 const before=stateJSON(f),close=overlay.events.get(Node.EventType.TOUCH_END);
 close({target:selected});
 assert.ok(find(f.menu,'背包详情区'));
 click(f.menu,'返回背包');
 assert.equal(all(f.menu.root).some(n=>n.name==='背包详情区'),false);
 assert.ok(find(f.menu,'背包物品区'));assert.equal(stateJSON(f),before);
});

test('equipped items, empty slots and pills show only one compact information card',()=>{
 const f=setup(844,390,{spiritStones:5000,contribution:5000});
 click(f.menu,'装备槽-weapon');
 assert.equal(all(f.menu.root).some(n=>n.name==='已装备对比卡'),false);
 click(f.menu,'解除');
 const id=draw(f);select(f,id);
 assert.equal(all(f.menu.root).some(n=>n.name==='已装备对比卡'),false);
 select(f,'huichun');
 assert.equal(all(f.menu.root).some(n=>n.name==='已装备对比卡'),false);
});

 test('equipment quick filter groups weapons armor and rings while excluding pills',()=>{
 const f=setup(844,390,{spiritStones:10000});
 const ids=['weapon','armor','ring'].map(category=>draw(f,category));
 const before=stateJSON(f);
 click(f.menu,'装备');
 const cells=all(f.menu.root).filter(n=>n.name.startsWith('背包物品-')).map(n=>n.name);
 for(const id of ids) assert.ok(cells.includes('背包物品-'+id));
 assert.ok(!cells.includes('背包物品-huichun'));
 assert.ok(inventoryTools.inventoryEntries(f.store.state,{category:'equipment'}).every(row=>['weapon','armor','ring'].includes(row.category)));
 assert.equal(stateJSON(f),before);
 click(f.menu,'丹药');
 assert.ok(!all(f.menu.root).some(n=>ids.some(id=>n.name==='背包物品-'+id)));
 click(f.menu,'全部');
 for(const id of ids) assert.ok(all(f.menu.root).some(n=>n.name==='背包物品-'+id));
 });

for (const [width,height] of [[844,390],[1280,720]]) test(`paper menu header and fixed tutorial navigation ${width}x${height}`,()=>{
 const f=setup(width,height,{spiritStones:99999999,contribution:999999});
 f.menu.dismissInventory();f.menu.go('tutorial');
 bounded(find(f.menu,'HUD.PlayerVitals'),f.menu.root);
 assert.equal(all(f.menu.root).some(n=>n.name==='货币信息'),false,'tutorial has no transaction wallet');
 const footer=find(f.menu,'指引固定导航'),view=find(f.menu,'事务卷轴');
 const nav=bounded(footer,f.menu.root),body=bounded(view,f.menu.root);
 assert.ok(nav.y+nav.height/2<body.y-body.height/2,'navigation must clear scrolling content');
 const before=stateJSON(f);
 for(let i=0;i<5;i++){ click(f.menu,'下一步'); bounded(find(f.menu,'指引固定导航'),f.menu.root); }
 assert.equal(f.menu.tutorialStep,5);assert.equal(stateJSON(f),before);
 click(f.menu,'完成指引');assert.equal(f.menu.currentPage,'hall');
 f.menu.showSettings();click(f.menu,'关闭设置');
 assert.equal(all(f.menu.root).some(n=>n.name==='宗门设置遮罩'),false);
});

test('sale confirmation close preserves selection, item and currency without executing action',()=>{
 const f=setup(844,390,{spiritStones:5000,contribution:5000});const id=draw(f);select(f,id);
 const before=stateJSON(f);click(f.menu,'出售');
 const panel=find(f.menu,'分解确认面板');bounded(panel,f.menu.root);
 click(f.menu,'关闭分解确认');
 assert.equal(all(f.menu.root).some(n=>n.name==='分解确认面板'),false);
 assert.ok(find(f.menu,'背包详情区'));assert.equal(stateJSON(f),before);
});

for (const [width,height] of [[844,390],[1280,720]]) test(`opening cultivation pill gate is visible in buy, craft and inventory ${width}x${height}`,()=>{
 const f=setup(width,height,{clearedFloor:0,pills:{ningqi:1}});
 f.menu.dismissInventory();f.menu.render(f.store.state,'pills');
 click(f.menu,'丹霞主殿');click(f.menu,'分类-cultivation');click(f.menu,'商品卡片-peiyuan');
 assert.match(text(f.menu.root),/通关镇妖塔第1层后开放修为丹/);
 assert.equal(find(f.menu,'确认购买').getComponent(Button).interactable,false);
 click(f.menu,'取消购买');click(f.menu,'关闭丹药菜单');click(f.menu,'炼丹炉');click(f.menu,'配方卡片-ningqi');
 assert.equal(find(f.menu,'开始炼制').getComponent(Button).interactable,false);
 assert.match(text(f.menu.root),/通关镇妖塔第1层后开放修为丹/);
});

for (const [width,height] of [[844,390],[1280,720]]) test(`cultivation pill shop ${width}x${height} shares realm allowance and confirms excess inventory`,()=>{
 const f=setup(width,height,{clearedFloor:1,pills:{peiyuan:0,ningqi:6}});
 f.menu.dismissInventory();f.menu.render(f.store.state,'pills');
 click(f.menu,'丹霞主殿');click(f.menu,'分类-cultivation');click(f.menu,'商品卡片-peiyuan');
 assert.match(text(f.menu.root),/已服\s*0\/6\s*颗/);
 assert.doesNotMatch(text(f.menu.root),/首次通关解锁额度/);
 assert.equal(f.store.state.pills.peiyuan,0);assert.equal(f.store.state.contribution,1000);
 assert.match(text(f.menu.root).replace(/\s/g,''),/还可服6颗.*持有7颗/);
 click(f.menu,'确认购买');
 assert.equal(f.store.state.pills.peiyuan,1);assert.equal(f.store.state.spiritStones,480);assert.equal(f.store.state.contribution,1000);
 assert.equal(f.store.state.cultivationPillUses.炼气,0);
 find(f.menu,'获得物品弹窗');
});

for (const [width,height] of [[844,390],[1280,720]]) test(`alchemy ${width}x${height} consumes exact recipe and ignores rapid second submission`,()=>{
 const f=setup(width,height,{pills:{huichuncao:4,bailuhua:2,linglu:2,huichun:0}});
 f.menu.dismissInventory();f.menu.render(f.store.state,'pills');click(f.menu,'炼丹炉');
 click(f.menu,'配方卡片-huichun');click(f.menu,'开始炼制');
 const submit=find(f.menu,'确认炼制').events.get(Button.EventType.CLICK);submit();submit();
 assert.equal(f.store.state.pills.huichun,1);assert.equal(f.store.state.pills.huichuncao,2);
 assert.equal(f.store.state.pills.bailuhua,1);assert.equal(f.store.state.pills.linglu,1);
 assert.equal(f.store.state.spiritStones,499);assert.equal(f.store.state.contribution,1000);assert.equal(f.calls.filter(a=>a.type==='craftPill').length,1);
 click(f.menu,'确认获得');click(f.menu,'关闭丹药菜单');click(f.menu,'背包');click(f.menu,'材料');
 assert.ok(all(f.menu.root).some(n=>n.name==='背包物品-huichuncao'));
 assert.equal(all(f.menu.root).some(n=>n.name==='背包物品-huichun'),false);
 select(f,'huichuncao');assert.equal(all(f.menu.root).some(n=>n.name==='不可服用'),false);
 assert.equal(find(f.menu,'物品操作区').getComponent(UITransform).contentSize.height,64);
 click(f.menu,'返回背包');click(f.menu,'批量出售');click(f.menu,'出售材料');click(f.menu,'勾选出售-huichuncao');click(f.menu,'确认出售');assert.equal(f.store.state.pills.huichuncao,1);
});

test('paper experience ring draws only earned progress clockwise and hides zero or capped progress',()=>{
 for(const [ratio,capped,expected] of [[0,false,0],[-1,false,0],[NaN,false,0],[.001,false,.001],[.25,false,.25],[.5,false,.5],[.99,false,.99],[1,false,1],[2,false,1],[.5,true,0],[1,true,0]]){
  const points=[],rects=[],paths=[];let strokes=0,clears=0,fills=0,start=0;
  const g={node:{active:true},clear(){clears++;points.length=0;},
   roundRect(...v){rects.push(v)},close(){},fill(){fills++;},
   stroke(){strokes++;paths.push({points:points.slice(start),width:this.lineWidth});start=points.length;},
   moveTo(x,y){points.push([x,y])},lineTo(x,y){points.push([x,y])}};
  context.drawPlayerXp(g,ratio,capped);
  assert.equal(clears,1);assert.equal(rects.length,0,'no unearned background track');
  assert.equal(g.node.active,expected>0);
  assert.equal(strokes>0,expected>0);
  if(expected){
   assert.ok(strokes>=4,'jade has shaded edges and a soft highlight');
   assert.ok(fills>=2,'both ends have carved silhouettes');
   const radius=Math.hypot(...points[0]);
   assert.ok(Math.abs(radius-paths[0].width/2-43)<1e-8,'ring touches the portrait border without a gap');
   assert.ok(points.some(([x,y])=>Math.abs(x)<1e-8&&y>0),'tail starts at twelve o’clock');
   const phaseAt=(x,y)=>(Math.PI/2-Math.atan2(y,x)+Math.PI*2)%(Math.PI*2);
   if(expected<1)assert.ok(Math.abs(Math.max(...points.map(([x,y])=>phaseAt(x,y)))-Math.PI*2*expected)<1e-8,'muzzle reaches the earned endpoint');
   for(const [x,y] of points){
    const r=Math.hypot(x,y),phase=(Math.PI/2-Math.atan2(y,x)+Math.PI*2)%(Math.PI*2);
    assert.ok(r>=43-1e-8&&r<=54,'carving stays outside the portrait and inside the HUD');
    assert.ok(phase<=Math.PI*2*expected+1e-8||phase>Math.PI*2-1e-8,'tips stay within earned progress');
   }
   if(expected===.5){
    const at=points.map(([x,y])=>({r:Math.hypot(x,y),a:(Math.PI/2-Math.atan2(y,x)+Math.PI*2)%(Math.PI*2)}));
    const tail=Math.max(...at.filter(p=>p.a<.3).map(p=>p.r));
    const head=Math.max(...at.filter(p=>p.a>Math.PI-.42).map(p=>p.r));
    assert.ok(head>tail+2,'dragon head and horns are distinct from the narrow tail');
    assert.ok(strokes>20,'body has repeated scale engravings');
   }
  }else assert.equal(points.length,0);
  context.drawPlayerXp(g,ratio,capped);
  assert.equal(clears,1,'unchanged progress reuses the jade geometry');
 }
});

test('profession image releases completed loads and ignores callbacks after menu destruction',()=>{
 const original=context.resources.load,requests=[];
 context.resources.load=(path,type,done)=>requests.push({path,done});
 try{
  const f=setup();f.menu.dismissInventory();f.menu.go('hall');
  const req=requests.filter(r=>r.path==='player-hud/sword-cultivator').at(-1);assert.ok(req);
  const image=new ImageAsset();req.done(null,image);
  const art=find(f.menu,'HUD.ProfessionArtwork').getComponent(Sprite),frame=art.spriteFrame,texture=frame.texture;
  assert.equal(image.refs,1);
  f.menu.destroy();assert.equal(image.refs,0);assert.equal(frame.isValid,false);assert.equal(texture.isValid,false);
  const late=new ImageAsset();req.done(null,late);assert.equal(late.refs,0);
 }finally{context.resources.load=original;}
});

test('paper HUD loads current portrait resources and releases them on menu destruction',()=>{
 const original=context.resources.load,requests=[];
 context.resources.load=(path,type,done)=>requests.push({path,done});
 try{
  const f=setup();f.menu.dismissInventory();f.menu.go('hall');
  const pending=['paper-portrait','sword-cultivator'].map(part=>requests.filter(r=>r.path===`player-hud/${part}`).at(-1));
  assert.ok(pending.every(Boolean),'both current HUD resources are requested');
  const fallback=find(f.menu,'HUD.PaperFallback');assert.equal(fallback.active,true);
  const assets=pending.map(()=>new ImageAsset());pending[0].done(null,assets[0]);
  assert.equal(fallback.active,false);pending[1].done(null,assets[1]);
  const sprites=['PaperArtwork','ProfessionArtwork'].map(n=>find(f.menu,`HUD.${n}`).getComponent(Sprite));
  assert.ok(sprites.every(s=>s.spriteFrame&&Object.values(s.spriteFrame.texture.filters).every(v=>v===Texture2D.Filter.LINEAR)));
  assert.equal(find(f.menu,'HUD.XPBar').active,false,'sect HUD does not show combat experience');
  const frames=sprites.map(s=>s.spriteFrame),textures=frames.map(f=>f.texture);
  f.menu.destroy();
  assert.ok(assets.every(a=>a.refs===0));assert.ok(frames.every(f=>!f.isValid));assert.ok(textures.every(t=>!t.isValid));
  for(const request of pending){const late=new ImageAsset();request.done(null,late);assert.equal(late.refs,0);}
 }finally{context.resources.load=original;}
});

test('paper HUD portrait failure preserves fallback and releases the independent profession resource',()=>{
 const original=context.resources.load,requests=[];
 context.resources.load=(path,type,done)=>requests.push({path,done});
 try{
  const f=setup();f.menu.dismissInventory();f.menu.go('hall');
  const portrait=requests.filter(r=>r.path==='player-hud/paper-portrait').at(-1);
  const profession=requests.filter(r=>r.path==='player-hud/sword-cultivator').at(-1);
  assert.ok(portrait&&profession);
  const asset=new ImageAsset();profession.done(null,asset);portrait.done(new Error('offline'));
  assert.equal(find(f.menu,'HUD.PaperFallback').active,true);
  assert.equal(find(f.menu,'HUD.PaperArtwork').getComponent(Sprite).spriteFrame,null);
  const frame=find(f.menu,'HUD.ProfessionArtwork').getComponent(Sprite).spriteFrame,texture=frame.texture;
  f.menu.destroy();assert.equal(asset.refs,0);assert.equal(frame.isValid,false);assert.equal(texture.isValid,false);
 }finally{context.resources.load=original;}
});

for(const [w,h] of [[1280,720],[844,390]])test(`last Zhuji pill keeps visible result after detail disappears (${w}x${h})`,()=>{
 const f=setup(w,h,{xp:1800,breakthroughRng:10000,pills:{huichun:3,peiyuan:0,zhuji:1}});
 select(f,'zhuji');
 const result=f.store.act({type:'usePill',id:'zhuji'},1800000000000);
 assert.equal(result.ok,true);assert.equal(result.success,false);
 const notice='筑基失败：消耗1颗筑基丹，满修为保留，可再次尝试（成功率30%）。';
 f.menu.render(f.store.state,'inventory',notice);
 assert.equal(all(f.menu.root).some(n=>n.name==='物品详情遮罩'),false);
 assert.match(text(f.menu.root),/筑基失败/);
 const label=all(f.menu.root).find(n=>n.getComponent(Label)?.string?.includes('筑基失败'));
 assert.ok(label);bounded(label,find(f.menu,'背包物品区'));
 bounded(find(f.menu,'背包网格视口'),find(f.menu,'背包物品区'));
});

for(const [w,h] of [[1280,720],[844,390]])test(`breakthrough materials can sell chosen quantity without consuming breakthrough (${w}x${h})`,()=>{
 const f=setup(w,h,{xp:1800,pills:{xiaoyue:3,chilin:2}}),before=f.store.state.spiritStones;
 select(f,'xiaoyue');assert.match(text(f.menu.root),/75%/);assert.match(text(f.menu.root),/80下品灵石/);
 assert.equal(all(find(f.menu,'物品操作区')).some(n=>n.name==='出售'),false);
 click(f.menu,'返回背包');click(f.menu,'批量出售');click(f.menu,'出售材料');click(f.menu,'勾选出售-xiaoyue');
 click(f.menu,'出售＋-xiaoyue');assert.match(text(f.menu.root),/获得 160 下品灵石/);
 click(f.menu,'确认出售');assert.equal(f.store.state.pills.xiaoyue,1);
 assert.equal(f.store.state.xp,1800);assert.equal(f.store.state.spiritStones,before+160);
 click(f.menu,'批量出售');click(f.menu,'出售材料');click(f.menu,'勾选出售-xiaoyue');click(f.menu,'确认出售');
 assert.equal(f.store.state.pills.xiaoyue,0);assert.match(text(f.menu.root),/出售/);
});

test('alchemy save failure preserves ingredients and retries with the same receipt',async()=>{
 const f=setup(844,390,{pills:{huichuncao:4,bailuhua:2,linglu:2,huichun:0}});
 f.menu.dismissInventory();f.menu.render(f.store.state,'pills');click(f.menu,'炼丹炉');click(f.menu,'配方卡片-huichun');
 const before=JSON.stringify(f.store.state);f.storage.fail=true;click(f.menu,'开始炼制');click(f.menu,'确认炼制');
 assert.equal(JSON.stringify(f.store.state),before);
 f.storage.fail=false;await new Promise(resolve=>setTimeout(resolve,710));click(f.menu,'确认炼制');
 const commands=f.calls.filter(a=>a.type==='craftPill');assert.equal(commands.length,2);
 assert.equal(commands[0].requestId,commands[1].requestId);
 assert.equal(f.store.state.pills.huichun,1);assert.equal(f.store.state.spiritStones,499);assert.equal(f.store.state.contribution,1000);
});

test('cultivation overflow requires a separate confirmation and preserves HP',()=>{
 const f=setup(844,390,{clearedFloor:1,xp:1780,hp:35,pills:{ningqi:1}});
 click(f.menu,'丹药');select(f,'ningqi');click(f.menu,'使用');
 assert.equal(f.store.state.xp,1780);assert.equal(f.store.state.pills.ningqi,1);
 assert.match(text(f.menu.root),/实际获得20修为，浪费70修为/);
 click(f.menu,'取消服用');assert.equal(f.store.state.pills.ningqi,1);
 click(f.menu,'使用');click(f.menu,'确认服用');
 assert.equal(f.store.state.xp,1800);assert.equal(f.store.state.pills.ningqi,0);
 assert.equal(f.store.state.cultivationPillUses.炼气,1);assert.equal(f.store.state.hp,35);
});

test('healing remains available above bare HP cap when equipped armor raises effective cap',()=>{
 const base=setup(),armor=equipmentTools.rollEquipment('armor','fan',1,()=>.99,'gear-1');
 const loadouts=copy(base.store.state.loadouts);loadouts[0].armorId=armor.id;
 const f=setup(844,390,{equipment:{...base.store.state.equipment,[armor.id]:armor},loadouts,equipmentSequence:1,hp:100.3});
 const maxHp=campaign.campaignMaxHp(f.store.state);assert.ok(maxHp>100.3);
 click(f.menu,'丹药');select(f,'huichun');click(f.menu,'使用');
 assert.equal(f.store.state.hp,maxHp);assert.equal(f.store.state.pills.huichun,2);
});

test('purchase hall remains available when furnace craftable-only filter has no materials',()=>{
 const f=setup();f.menu.dismissInventory();f.menu.render(f.store.state,'pills');
 click(f.menu,'炼丹炉');click(f.menu,'切换可炼配方');assert.match(text(f.menu.root),/暂无符合条件/);
 click(f.menu,'关闭丹药菜单');click(f.menu,'丹霞主殿');assert.equal(all(f.menu.root).some(n=>n.name==='✓ 仅可炼制'),false);
 click(f.menu,'商品卡片-huichun');click(f.menu,'确认购买');assert.equal(f.store.state.spiritStones,495);assert.equal(f.store.state.contribution,1000);
});

test('rapid excess-stock confirmation preserves the visible confirmation until retry',async()=>{
 const f=setup(844,390,{clearedFloor:1,pills:{peiyuan:0,ningqi:6}});
 f.menu.dismissInventory();f.menu.render(f.store.state,'pills');click(f.menu,'丹霞主殿');
 click(f.menu,'商品卡片-huichun');click(f.menu,'确认购买');click(f.menu,'确认获得');
 click(f.menu,'分类-cultivation');click(f.menu,'商品卡片-peiyuan');click(f.menu,'确认购买');click(f.menu,'确认购买');
 assert.equal(f.menu.commerceDialog,'purchase');assert.equal(f.store.state.pills.peiyuan,0);
 await new Promise(resolve=>setTimeout(resolve,710));click(f.menu,'确认购买');
 assert.equal(f.store.state.pills.peiyuan,1);
});

for (const [width,height] of [[844,390],[1280,720]]) test(`reference commerce ${width}: purchase is a card then a modal`,()=>{
 const f=setup(width,height);f.menu.dismissInventory();f.menu.render(f.store.state,'pills');click(f.menu,'丹霞主殿');
 const before=JSON.stringify(f.store.state);
 find(f.menu,'商品卡片-huichun');
 assert.equal(all(f.menu.root).some(n=>n.name==='购买1颗'&&!n.getComponent(Label)),false);
 click(f.menu,'商品卡片-huichun');find(f.menu,'购买物品弹窗');click(f.menu,'取消购买');
 assert.equal(JSON.stringify(f.store.state),before);
 click(f.menu,'商品卡片-huichun');click(f.menu,'确认购买');find(f.menu,'获得物品弹窗');
 assert.equal(f.store.state.spiritStones,495);assert.equal(f.store.state.contribution,1000);assert.equal(f.calls.filter(a=>a.type==='buyPill').length,1);
 click(f.menu,'确认获得');assert.equal(all(f.menu.root).some(n=>n.name==='购买物品弹窗'),false);
});

test('reference commerce crafting confirms before spending and shows actual reward',()=>{
 const f=setup(844,390,{pills:{huichuncao:4,bailuhua:2,linglu:2}});f.menu.dismissInventory();f.menu.render(f.store.state,'pills');click(f.menu,'炼丹炉');
 click(f.menu,'配方卡片-huichun');const before=JSON.stringify(f.store.state);
 click(f.menu,'开始炼制');find(f.menu,'炼制确认弹窗');assert.equal(JSON.stringify(f.store.state),before);
 click(f.menu,'取消炼制');assert.equal(JSON.stringify(f.store.state),before);
 click(f.menu,'开始炼制');click(f.menu,'确认炼制');find(f.menu,'获得物品弹窗');
 assert.equal(f.store.state.pills.huichuncao,2);assert.equal(f.store.state.spiritStones,499);assert.equal(f.store.state.contribution,1000);
 assert.equal(f.calls.filter(a=>a.type==='craftPill').length,1);
});

test('reference commerce gear shop separates browsing, purchase and actual equipment results',()=>{
 const f=setup(844,390,{spiritStones:100,contribution:300});f.menu.dismissInventory();f.menu.render(f.store.state,'forge');click(f.menu,'炼器主殿');
 click(f.menu,'商品卡片-weapon:fan:q1');find(f.menu,'购买物品弹窗');
 assert.equal(all(f.menu.root).some(n=>n.name==='炼制详情'),false);
 click(f.menu,'增加数量');click(f.menu,'确认购买');find(f.menu,'获得物品弹窗');
 assert.equal(f.calls.filter(a=>a.type==='buyGear').length,1);assert.equal(f.calls.at(-1).count,2);
 assert.equal(f.store.state.spiritStones,52);assert.equal(f.store.state.contribution,300);
 assert.equal(f.menu.commerceRewards.reduce((n,r)=>n+r.count,0),2);
});

test('reference commerce save failure keeps confirmation and retries the same receipt',async()=>{
 const f=setup(844,390,{pills:{huichuncao:4,bailuhua:2,linglu:2}});f.menu.dismissInventory();f.menu.render(f.store.state,'pills');click(f.menu,'炼丹炉');click(f.menu,'配方卡片-huichun');click(f.menu,'开始炼制');
 const before=JSON.stringify(f.store.state);f.storage.fail=true;click(f.menu,'确认炼制');
 assert.equal(JSON.stringify(f.store.state),before);find(f.menu,'炼制确认弹窗');assert.match(text(f.menu.root),/保存失败/);
 const request=f.calls.at(-1).requestId;f.storage.fail=false;await new Promise(r=>setTimeout(r,710));click(f.menu,'确认炼制');
 assert.equal(f.calls.at(-1).requestId,request);find(f.menu,'获得物品弹窗');assert.equal(f.store.state.spiritStones,499);assert.equal(f.store.state.contribution,1000);
});

test('reference commerce final craftable recipe still shows success after consuming all materials',()=>{
 const f=setup(844,390,{pills:{huichuncao:1,linglu:1}});f.menu.dismissInventory();f.menu.render(f.store.state,'pills');click(f.menu,'炼丹炉');click(f.menu,'切换可炼配方');click(f.menu,'配方卡片-zhixue');click(f.menu,'开始炼制');
 const stale=find(f.menu,'确认炼制').events.get(Button.EventType.CLICK);stale();stale();find(f.menu,'获得物品弹窗');
 assert.equal(f.calls.filter(a=>a.type==='craftPill').length,1);assert.equal(f.store.state.pills.huichuncao,0);
});

test('reference commerce pill details retain numeric healing and breakthrough effects',()=>{
 const f=setup();f.menu.dismissInventory();f.menu.render(f.store.state,'pills');click(f.menu,'丹霞主殿');
 click(f.menu,'商品卡片-huichun');assert.match(text(f.menu.root),/50%/);click(f.menu,'取消购买');
 click(f.menu,'商品卡片-zhuji');assert.match(text(f.menu.root),/55%/);assert.match(text(f.menu.root),/失败/);
});

for (const [width,height] of [[844,390],[1280,720],[960,360]]) test(`purchase uses backpack detail card ${width}`,()=>{
 const f=setup(width,height);f.menu.dismissInventory();f.menu.render(f.store.state,'forge');click(f.menu,'炼器主殿');
 click(f.menu,'商品卡片-weapon:fan:q1');
 const card=find(f.menu,'背包详情区');assert.equal(card.getComponent(UITransform).contentSize.width,380);
 const scroll=find(f.menu,'购买属性说明').getComponent(ScrollView);
 assert.ok(scroll.content.getComponent(UITransform).contentSize.height>=100);
 const item=forgingTools.createForgedGear('weapon:fan:q1','preview');
 const row=inventoryTools.inventoryEntries({...f.store.state,weapons:{preview:item},equipment:{}}).find(r=>r.id==='preview');
 const expected=inventoryTools.inventoryDetail(f.store.state,row);
 assert.match(text(card),new RegExp(expected.name));
 for(const block of ['装备基础属性','装备描述']){
  const label=all(card).find(n=>n.name===block).getComponent(Label);
  assert.equal(label.string.replace(/\n/g,''),(block==='装备描述'?expected.description:expected.basic.join('')).replace(/\n/g,''));
 }
 for(const name of ['减少数量','增加数量','最大数量','确认购买','取消购买'])assert.ok(find(f.menu,name));
});

for(const [width,height] of [[1280,720],[844,390]])test(`forge quality lanes and first product icons ${width}`,()=>{
 const f=setup(width,height,{xp:0});f.menu.dismissInventory();f.menu.render(f.store.state,'forge');click(f.menu,'炼器炉');
 const before=JSON.stringify(f.store.state);
 for(const tier of ['fa','bao','ling']){
  click(f.menu,'分类-'+tier);
  const entries=f.menu.commerceEntries('gear');assert.equal(entries.length,12);
  assert.ok(entries.every(e=>e.recipe.tier===tier));
  for(const category of ['weapon','armor','ring']){
   const heading=all(f.menu.root).find(n=>n.name==='配方列名-'+category);assert.ok(heading);
   assert.equal(heading.parent.name,'炼器页');
  }
  for(const q of [1,2,3,4]){
   const lane=find(f.menu,'品质泳道-'+q);assert.match(text(lane),new RegExp(['','下品','中品','上品','极品'][q]));
   const cards=['weapon','armor','ring'].map(category=>find(f.menu,`配方卡片-${category}:${tier}:q${q}`));
   assert.ok(cards[0].position.x<cards[1].position.x&&cards[1].position.x<cards[2].position.x);
   for(const [i,card] of cards.entries()){
    assert.doesNotMatch(text(card),/武器|防具|戒指/);
    assert.doesNotMatch(text(card),/查看配方|可炼制/);
    const entry=entries.find(e=>e.recipe.quality===q&&e.recipe.category===['weapon','armor','ring'][i]);
    assert.ok(all(card).some(n=>n.name==='物品图-'+entry.recipe.definitionIds[0]));
   }
  }
 }
 click(f.menu,'分类-fa');const scroll=find(f.menu,'配方列表').getComponent(ScrollView);const offset=Math.min(40,Math.max(0,528-(f.menu.designHeight-164)));scroll.scrollToOffset(new Vec2(0,offset));click(f.menu,'配方卡片-weapon:fa:q4');
 assert.equal(find(f.menu,'配方列表').getComponent(ScrollView).getScrollOffset().y,offset);
 assert.equal(find(f.menu,'开始炼制').getComponent(Button).interactable,false);
 assert.match(text(find(f.menu,'开始炼制')),/境界不足/);
 const detail=find(f.menu,'炼制详情');assert.doesNotMatch(text(detail),/33⅓%|50%|100%/);assert.match(text(detail),/照胆剑/);assert.match(text(detail),/定岳剑/);
 assert.doesNotMatch(text(f.menu.root),/心愿|查看配方/);
 assert.equal(JSON.stringify(f.store.state),before);
});

test('settlement harvest wraps after eight cells and keeps full counts available',()=>{
 const f=setup(),items=Array.from({length:19},(_,i)=>({id:i===0?'huichun':`material-${i}`,count:i===0?123:7}));
 const parent=new Node('settlement');parent.addComponent(UITransform).setContentSize(1010,330);
 f.menu.renderSettlementRewards(parent,'实际入账：修为 180',items,1010,330);
 const cells=all(parent).filter(n=>n.name.startsWith('结算物品-'));
 assert.equal(cells.length,19);assert.equal(cells[7].position.y,cells[0].position.y);
 assert.equal(cells[8].position.x,cells[0].position.x);assert.ok(cells[8].position.y<cells[0].position.y);
 assert.ok(all(cells[0]).some(n=>n.getComponent(Label)?.string==='99'));
 cells[0].events.get(Button.EventType.CLICK)();assert.match(text(parent),/本次获得 123/);
 assert.equal(items[0].count,123);assert.equal(all(parent).find(n=>n.name==='结算收获列表').getComponent(ScrollView).vertical,true);
});

test('UI A01 keeps numeric values, ranges and units intact at wrapping boundaries',()=>{
 const {menu}=setup();
 for(const value of ['30%','0.98秒/次','4.8～7.2','123 灵石','6.3%','12/99']){
  const original=`普通攻击力${value} · 近身单目标`;
  const wrapped=menu.wrap(original,180,23);
  assert.ok(wrapped.includes(value),`${value}: ${wrapped}`);
  assert.equal(wrapped.replaceAll('\n',''),original);
 }
});

test('UI A05 long modal text scrolls without reducing font or losing the final line',()=>{
 const {menu}=setup();const parent=new Node('modal');
 const body=Array.from({length:80},(_,i)=>`第${i+1}条：保存失败，请检查存储空间。`).join('\n');
 Menu.renderModalBody(parent,body,10,700,112);
 const viewport=all(parent).find(n=>n.name==='弹窗正文卷轴');
 assert.equal(viewport.getComponent(ScrollView).vertical,true);
 assert.equal(viewport.getComponent(UITransform).contentSize.height,112);
 const label=all(viewport).map(n=>n.getComponent(Label)).find(Boolean);
 assert.equal(label.fontSize,26);assert.match(label.string,/第80条/);
});

test('settlement currencies join the grid, cultivation is hidden and notes remain accessible',()=>{
 const {menu}=setup();const parent=new Node('settlement');
 menu.renderSettlementRewards(parent,'实际入账：修为 180 · 灵石 650 · 贡献 100\n溢出：库存已满',Array.from({length:40},(_,i)=>({id:`item${i}`,count:123})),814,242,{spiritStones:680,contribution:100});
 assert.equal(all(parent).some(n=>n.name==='结算固定入账'),false);
 assert.doesNotMatch(text(parent),/修为|实际入账/);
 const cells=all(parent).filter(n=>n.name.startsWith('结算物品-'));
 assert.deepEqual(cells.slice(0,3).map(n=>n.name),['结算物品-stone_mid','结算物品-stone_low','结算物品-resource_contribution']);
 assert.ok(all(cells[0]).some(n=>n.getComponent(Label)?.string==='6'));
 assert.ok(all(cells[1]).some(n=>n.getComponent(Label)?.string==='80'));
 assert.ok(all(cells[2]).some(n=>n.getComponent(Label)?.string==='100'));
 cells[2].events.get(Button.EventType.CLICK)();assert.match(text(parent),/点眷 · 本次获得 100/);
 const grid=all(parent).find(n=>n.name==='结算收获列表');
 assert.ok(text(grid).includes('溢出'));assert.ok(!text(grid).includes('实际入账'));
 assert.equal(grid.getComponent(ScrollView).vertical,true);
 assert.ok(grid.getComponent(UITransform).contentSize.height>=88);
});

test('UI A02 quantity controls have separated 72-unit touch targets',()=>{
 const {menu}=setup();menu.commerceQuote=()=>({reason:''});const parent=new Node('quantity');menu.commerceQuantity(parent,'gear',0,0,{},()=>{});
 const controls=parent.children.filter(n=>n.getComponent(Button));
 for(const node of controls)assert.ok(node.getComponent(UITransform).contentSize.height>=72);
 for(let i=1;i<controls.length;i++){
  const a=controls[i-1],b=controls[i];
  assert.ok(b.position.x-b.getComponent(UITransform).contentSize.width/2>a.position.x+a.getComponent(UITransform).contentSize.width/2);
 }
});

test('UI B08 quantity changes preserve long purchase reading position; new item resets it',()=>{
 const f=setup();f.menu.dismissInventory();f.menu.render(f.store.state,'forge');click(f.menu,'炼器主殿');
 f.menu.commerceDescription=()=>Array.from({length:80},(_,i)=>`属性${i}：伤害30%`).join('\n');
 click(f.menu,'商品卡片-weapon:fan:q1');
 const s=find(f.menu,'购买属性说明').getComponent(ScrollView);s.scrollToOffset(new Vec2(0,100),0);
 click(f.menu,'增加数量');assert.equal(find(f.menu,'购买属性说明').getComponent(ScrollView).getScrollOffset().y,100);
 click(f.menu,'取消购买');click(f.menu,'商品卡片-weapon:fan:q1');assert.equal(find(f.menu,'购买属性说明').getComponent(ScrollView).getScrollOffset().y,0);
});

test('UI B12 detailed cultivation labels preserve layer and phase independently from equipment requirements',()=>{
 assert.equal(Menu.realmLabel({realm:'炼气',layer:4,consummated:false},{phase:'中期'}),'炼气四层·中期');
 assert.equal(Menu.realmLabel({realm:'金丹',layer:10,consummated:true},{phase:'后期'}),'金丹十层·大圆满');
 assert.equal(tierTools.equipmentTierRequirement('fa'),'炼气·中期');
});

test('UI B02 rewards use eight columns and expose uncapped quantities on selection',()=>{
 const {menu}=setup(),parent=new Node('reward');
 menu.rewardGrid(parent,'奖励列表',Array.from({length:10},(_,i)=>({art:'huichun',name:`药${i}`,count:123})),772,230);
 const cells=all(parent).filter(n=>n.name==='物品图-huichun');
 assert.equal(cells.length,10);assert.equal(cells[7].position.y,cells[0].position.y);assert.ok(cells[8].position.y<cells[0].position.y);
 assert.match(text(cells[0]),/99/);cells[0].events.get(Button.EventType.CLICK)();assert.match(text(parent),/药0 · 123/);
});

test('presentation settings persist separately and a failed write leaves the previous values intact',()=>{
 let raw='{"soundVolume":8,"reducedMotion":true}',fail=false;
 const api=runInNewContext('(() => {'+sources.TowerPreferences+';return {presentationPreferences,setPresentationPreference}})()',{
  sys:{localStorage:{getItem:()=>raw,setItem:(_,v)=>{if(fail)throw Error('quota');raw=v;}}}
 });
 assert.deepEqual(copy(api.presentationPreferences()),{soundVolume:1,reducedMotion:true,playerDamageNumbers:true});
 assert.equal(api.setPresentationPreference({soundVolume:.25}),true);
 assert.deepEqual(JSON.parse(raw),{soundVolume:.25,reducedMotion:true,playerDamageNumbers:true});
 fail=true;assert.equal(api.setPresentationPreference({soundVolume:0,reducedMotion:false}),false);
 assert.deepEqual(copy(api.presentationPreferences()),{soundVolume:.25,reducedMotion:true,playerDamageNumbers:true});
});

test('settings change sound and reduced motion without dispatching campaign actions',()=>{
 const f=setup();f.menu.dismissInventory();f.menu.showSettings();const before=stateJSON(f);
 click(f.menu,'音效音量：100%');assert.ok(text(f.menu.root).includes('音效音量：0%'));
 click(f.menu,'减少动态效果：关闭');assert.ok(text(f.menu.root).includes('减少动态效果：开启'));
 assert.equal(stateJSON(f),before);assert.deepEqual(f.calls,[]);
 context.setPresentationPreference({soundVolume:1,reducedMotion:false});
 f.menu.destroy();
});

test('destroyed library menu cannot consume battle Escape',()=>{
 const f=setup();f.menu.dismissInventory();f.menu.render(f.store.state,'library');f.menu.destroy();
 assert.equal(f.menu.dismissLibrary(),false);
});

for(const category of ['weapon','armor','ring'])test(`craft preview uses inventory card and exact information: ${category}`,()=>{
 const f=setup(1280,720,{xp:6601});f.menu.dismissInventory();
 const item=forgingTools.createForgedGear(`${category}:fa:q1`,'preview');
 const state={...f.store.state,weapons:{...f.store.state.weapons,...(category==='weapon'?{preview:item}:{})},equipment:{...f.store.state.equipment,...(category==='weapon'?{}:{preview:item})}};
 f.menu.render(state,'forge');f.menu.gearMode='craft';f.menu.commerceDialog='detail';
 const entry=f.menu.commerceEntries('gear').find(e=>e.key===`${category}:fa:q1`);
 f.menu.commerceDetailId=item.definitionId;f.menu.commerceModal('gear',entry,()=>{});
 const preview=text(find(f.menu,'背包详情区'));
 assert.doesNotMatch(preview,/同品质炼制|物品说明/);
 f.menu.commerceDialog='';f.menu.showInventory(state);f.menu.backpack.selected='preview';f.menu.showInventory(state);
 const cards=all(f.menu.inventoryShade).filter(n=>n.name==='背包详情区');
 assert.equal(cards.length,1);assert.equal(text(cards[0]),preview);
});

test('forge materials keep concise type text and preserve bottom description',()=>{
 const f=setup(1280,720,{pills:{forge_xuantie:10}});
 const row=inventoryTools.inventoryEntries(f.store.state).find(r=>r.id==='forge_xuantie');
 assert.ok(row.item.description.length>0);
 assert.deepEqual(inventoryTools.inventoryDescription(f.store.state,row),['炼器材料',row.item.description]);
 select(f,row.id);
 const detail=find(f.menu,'背包详情区');
 assert.equal(all(detail).find(n=>n.name==='丹药说明').getComponent(Label).string,'炼器材料');
 assert.equal(all(detail).find(n=>n.name==='丹药描述').getComponent(Label).string.replace(/\n/g,''),row.item.description);
});

test('batch material sale is atomic, retryable, and rejects stale or invalid selections',()=>{
 const f=setup(844,390,{pills:{forge_xuantie:5,forge_lingmu:4}});
 const items=[{id:'forge_xuantie',count:2,expectedCount:5},{id:'forge_lingmu',count:3,expectedCount:4}];
 const before=copy(f.store.state);
 for(const bad of [[...items,{...items[0]}],[items[0],{...items[1],count:8}],[items[0],{id:'huichun',count:1,expectedCount:0}]]){
  assert.equal(f.store.act({type:'sellMaterials',items:bad},1800000000000).ok,false);assert.deepEqual(copy(f.store.state),before);
 }
 f.storage.fail=true;assert.equal(f.store.act({type:'sellMaterials',items},1800000000000).reason,'save-failed');assert.deepEqual(copy(f.store.state),before);
 f.storage.fail=false;const result=f.store.act({type:'sellMaterials',items},1800000000000);assert.equal(result.ok,true);
 assert.equal(f.store.state.pills.forge_xuantie,3);assert.equal(f.store.state.pills.forge_lingmu,1);
 const after=copy(f.store.state);assert.equal(f.store.act({type:'sellMaterials',items},1800000000000).ok,false);assert.deepEqual(copy(f.store.state),after);
});
test('batch sale selection supports multiple materials and duplicate clicks charge once',()=>{
 const f=setup(844,390,{pills:{forge_xuantie:5,forge_lingmu:4}});
 click(f.menu,'批量出售');click(f.menu,'出售材料');click(f.menu,'勾选出售-forge_xuantie');click(f.menu,'勾选出售-forge_lingmu');
 const submit=find(f.menu,'确认出售').events.get(Button.EventType.CLICK);submit();submit();
 assert.equal(f.calls.filter(a=>a.type==='sellMaterials').length,1);
 assert.equal(f.store.state.pills.forge_xuantie,4);assert.equal(f.store.state.pills.forge_lingmu,3);
});
test('craft material inspection uses backpack detail card, including unowned materials',()=>{
 const f=setup();f.menu.dismissInventory();f.menu.render(f.store.state,'forge');f.menu.commerceDialog='material';f.menu.commerceMaterial='forge_xuantie';
 f.menu.commerceModal('gear',f.menu.commerceEntries('gear')[0],()=>{});
 const card=find(f.menu,'背包详情区');assert.match(text(card),/玄铁/);assert.match(text(card),/炼器材料/);
 assert.equal(all(f.menu.root).some(n=>n.name==='前往材料来源'),false);
 assert.equal(f.store.state.pills.forge_xuantie,0);
});

for (const [w,h] of [[1280,720],[844,390]]) test(`major realm wear label and button ${w}x${h}`,()=>{
 const f=setup(w,h);
 const item=weaponTools.createFixedWeapon('eq_sword_caiyun','wear-caiyun');
 const state={...f.store.state,xp:0,weapons:{...f.store.state.weapons,[item.id]:item},weaponCounters:{...f.store.state.weaponCounters,[item.id]:0}};
 f.menu.render(state,'inventory');select(f,item.id);
 const labels=all(find(f.menu,'背包详情区')).map(n=>n.getComponent(Label)).filter(Boolean);
 const label=labels.find(l=>l.string==='穿戴要求：炼气');
 assert.ok(label);assert.equal(label.color.r,'#263F39');
 assert.equal(find(f.menu,'穿戴').getComponent(Button).interactable,true);
 assert.ok(!labels.some(l=>/境界要求|炼气·中期/.test(l.string)));
});

function forgeAnimationFixture(){
 const f=setup(844,390,{xp:6601,spiritStones:100000,pills:{forge_xuantie:100,forge_lingmu:100,forge_lingyu:100,forge_hanjingsha:100}});
 f.menu.dismissInventory();f.menu.render(f.store.state,'forge');click(f.menu,'炼器炉');click(f.menu,'分类-fa');click(f.menu,'配方卡片-weapon:fa:q1');click(f.menu,'开始炼制');return f;
}
test('forge ritual commits once then reveals saved rewards after animation',()=>{
 const f=forgeAnimationFixture(),submit=find(f.menu,'确认炼制').events.get(Button.EventType.CLICK);
 submit();submit();assert.equal(f.calls.filter(a=>a.type==='craftGear').length,1);
 find(f.menu,'炼器仪式');assert.equal(f.menu.commerceDialog,'forging');
 const saved=JSON.stringify(f.store.state);for(let i=0;i<40;i++)f.menu.updateEffects(.1);
 find(f.menu,'获得物品弹窗');assert.equal(JSON.stringify(f.store.state),saved);
});
test('forge ritual never plays on failed save and preserves costs',()=>{
 const f=forgeAnimationFixture(),before=JSON.stringify(f.store.state);f.storage.fail=true;click(f.menu,'确认炼制');
 assert.equal(JSON.stringify(f.store.state),before);find(f.menu,'炼制确认弹窗');assert.equal(all(f.menu.root).some(n=>n.name==='炼器仪式'),false);
});
test('forge ritual leaving page cancels presentation without losing saved gear',()=>{
 const f=forgeAnimationFixture();click(f.menu,'确认炼制');const saved=JSON.stringify(f.store.state);
 f.menu.render(f.store.state,'hall');for(let i=0;i<40;i++)f.menu.updateEffects(.1);
 assert.equal(f.menu.currentPage,'hall');assert.equal(all(f.menu.root).some(n=>n.name==='获得物品弹窗'),false);assert.equal(JSON.stringify(f.store.state),saved);
});
test('forge ritual staggers real recipe materials and survives a same-page refresh',()=>{
 const f=forgeAnimationFixture();click(f.menu,'确认炼制');
 const items=all(f.menu.root).filter(n=>n.name.startsWith('入炉材料-'));
 assert.deepEqual(items.map(n=>n.name).sort(),['forge_xuantie','forge_lingmu','forge_lingyu','forge_hanjingsha'].map(id=>'入炉材料-'+id).sort());
 f.menu.updateEffects(.1);f.menu.updateEffects(.1);assert.equal(items.filter(n=>n.active).length,1);
 f.menu.render(f.store.state,'forge');for(let i=0;i<40;i++)f.menu.updateEffects(.1);
 find(f.menu,'获得物品弹窗');assert.equal(f.calls.filter(a=>a.type==='craftGear').length,1);
});
test('forge ritual reduced motion goes directly to saved rewards',()=>{
 context.setPresentationPreference({reducedMotion:true});
 try{const f=forgeAnimationFixture();click(f.menu,'确认炼制');find(f.menu,'获得物品弹窗');assert.equal(f.calls.filter(a=>a.type==='craftGear').length,1);}
 finally{context.setPresentationPreference({reducedMotion:false});}
});

test('unknown retired gate route falls back to the hall without changing state',()=>{
 const f=setup();f.menu.dismissInventory();const before=stateJSON(f);
 f.menu.render(f.store.state,'gate');assert.equal(f.menu.currentPage,'hall');
 assert.equal(stateJSON(f),before);
});

test('bounds helper composes nested scale, position and target anchor without hiding overflow',()=>{
 const root=new Node('root');root.addComponent(UITransform).setContentSize(200,200);
 const parent=new Node('parent');root.addChild(parent);parent.setScale(.5,.5,1);parent.setPosition(20,10);
 const child=new Node('child');parent.addChild(child);child.addComponent(UITransform).setContentSize(80,40);
 child.getComponent(UITransform).setAnchorPoint(0,0);child.setScale(2,1,1);child.setPosition(10,20);
 assert.deepEqual(coords(child,root),{x:65,y:30,width:80,height:20});
 assert.throws(()=>bounded(child,root),/child x/);
 child.setPosition(0,20);assert.deepEqual(bounded(child,root),{x:60,y:30,width:80,height:20});
});
