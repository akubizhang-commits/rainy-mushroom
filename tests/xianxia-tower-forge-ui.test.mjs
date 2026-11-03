import { mixedTopItems, mixedTierUnlocked } from '../js/xianxia/TowerMixedDraw.js'
import { equipmentSkillBonus } from '../js/xianxia/TowerEquipmentSkillLevels.js'
import * as forgingTools from '../js/xianxia/TowerForging.js'
import * as forgingMaterials from '../js/xianxia/TowerForgeMaterials.js'
import * as equipmentSources from '../js/xianxia/TowerEquipmentSources.js'
import * as alchemyTools from '../js/xianxia/TowerAlchemy.js'
import * as pillTools from '../js/xianxia/TowerPills.js'
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
import { assertCurrentCampaign, assertActionSucceeds } from './helpers/tower-current-state.mjs'

// Independent forge UI harness: real menu/business code, simulated Cocos scene graph.
// Intentionally does not import or execute the shared host-tools test suite.
const sources = Object.fromEntries(['TowerPreferences', 'TowerMenuChrome', 'TowerMonsterArt', 'TowerStoneArt', 'WeaponQualityArt', 'TowerCharacterArt', 'TowerSectScene', 'TowerSkillIcons', 'TowerSkillTreeCatalog', 'TowerSkillTreeLayout', 'TowerPlayerHud', 'TowerInventoryPanel', 'TowerMenu'].map(name => [name,
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
  setSiblingIndex() {}
  setScale(x, y, z) { this.scale = { x, y, z } }
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
  moveTo(x, y) { if (this.node?.name === '功法前置连线') this.pathPoint = { x, y } }
  lineTo(x, y) {
    if (this.node?.name === '功法前置连线' && this.pathPoint) {
      this.segments.push({ from: this.pathPoint, to: { x, y }, color: this.strokeColor.r })
      this.pathPoint = { x, y }
    }
  }
  circle() {} ellipse() {} close() {} quadraticCurveTo() {}
}
class Label {
  static HorizontalAlign = { LEFT: 0, CENTER: 1, RIGHT: 2 }
  static VerticalAlign = { CENTER: 1 }
  static Overflow = { NONE: 0, SHRINK: 1 }
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
  destroy() { this.isValid = false }
}
class SpriteFrame {
  // Synthetic engine assets exercise host wiring, not PNG decoding or art quality.
  width = 256
  height = 256
  isValid = true
  destroy() { this.isValid = false }
}
class JsonAsset { json = {} }
class Rect { constructor(x,y,width,height) { Object.assign(this,{x,y,width,height}) } }
class Size { constructor(width,height) { Object.assign(this,{width,height}) } }
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

// Keep reader rendering outside this forge suite; real controls are browser-tested.
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

const context = { mixedTopItems, mixedTierUnlocked, ...forgingTools, ...forgingMaterials, ...equipmentSources, ...alchemyTools, ...tierTools, ...inventoryTools, ...weaponTools, ...equipmentTools, ...craftingTools, ...campaign, ...growth, ...content, ...profile, ...pillTools, ...loot, ...economy,
 sys:{localStorage:{getItem:()=>null,setItem(){}}}, skillPresentation, combatStats, characterCombatAttributes, equipmentSkillBonus, JsonAsset, Rect, Size, Node, UITransform, Graphics, Label, LabelOutline: class {}, LabelShadow: class {}, Button, Sprite, SpriteFrame, ImageAsset, Texture2D, Color, Vec2, ScrollView, Mask, BlockInputEvents,
 TowerLibraryPanel: TowerLibraryPanelBoundary,
 isValid: value => value?.isValid === true, resources: {load() {}} };
for (const [key, result] of [
 ['TowerPreferences','{presentationPreferences,setPresentationPreference}'],
 ['TowerMenuChrome','{drawMenuVeil,drawMenuClose,MENU_COLORS,ITEM_COLORS,BOOK_COLORS}'],
 ['TowerMonsterArt','{TowerMonsterArt}'],
 ['TowerStoneArt','{TowerStoneArt}'],
 ['WeaponQualityArt','{WeaponQualityArt}'],
 ['TowerCharacterArt','{TowerCharacterArt}'],
 ['TowerSectScene','{TowerSectScene}'],
 ['TowerSkillIcons','TowerSkillIcons'],
 ['TowerSkillTreeCatalog','{TREE_BRANCHES, COMMON_SKILL_IDS, FUTURE_SKILLS, DISPLAY_STAGES, COLUMN_INDEX, TREE_COLUMNS}'],
 ['TowerSkillTreeLayout','{layoutSkillTree}'],
 ['TowerPlayerHud','{createPlayerHud,drawPlayerHp,drawPlayerMana,drawPlayerXp,drawHudPortrait,drawHudActionIcon,SETTINGS_ICON_SIZE}'],
 ['TowerInventoryPanel','{TowerInventoryPanel}']]) {
 const value = runInNewContext('(() => {'+sources[key]+';return '+result+'})()',context);
 if (key==='TowerSkillIcons') context.TowerSkillIcons=value; else Object.assign(context,value);
}
const Menu = runInNewContext('(() => {'+sources.TowerMenu+';return TowerMenu})()',context);
const copy = value => JSON.parse(JSON.stringify(value));
const all = node => [node, ...node.children.flatMap(all)];
const text = node => all(node).map(n => n.getComponent(Label)?.string || '').join('\n');
function find(menu, name) { const nodes = all(menu.root).filter(n => n.name === name && !n.getComponent(Label)); assert.equal(nodes.length, 1, name); return nodes[0]; }
function click(menu,name) {const n=find(menu,name);assert.equal(n.getComponent(Button).interactable,true,name);n.events.get(Button.EventType.CLICK)();}
function setup(width=1280,height=720,patch={}) {
 const data=new Map();
 const storage={ fail:false, getItem:key=>data.get(key)??null, setItem(key,value){if(this.fail)throw Error('quota');data.set(key,value);} };
 const initial = new campaign.TowerCampaignStore(storage, 1800000000000);
 assert.ok(initial.act({type:'sync'},1800000000000).ok);
 const record=JSON.parse(data.get(campaign.TOWER_CAMPAIGN_KEY));
 const state=JSON.parse(record.data); Object.assign(state,{...patch,pills:{...state.pills,...patch.pills}});
 record.data=JSON.stringify(state); record.checksum=checksum(record.data);data.set(campaign.TOWER_CAMPAIGN_KEY,JSON.stringify(record));
 const store = new campaign.TowerCampaignStore(storage,1800000000000);
 assertCurrentCampaign(store,state);
 const calls=[]; let menu;
 menu=new Menu(new Node('canvas'),width,height,{
 action(action){calls.push(copy(action)); const result=store.act(action,1800000000000);
  menu.render({...store.state,readOnly:store.readOnly},menu.currentPage,result.ok?'操作成功':'保存失败，请重试');return result;},
 page(page){menu.render({...store.state,readOnly:store.readOnly},page);},enterFloor(){},resume(){},training(){} });
 menu.render(store.state,'forge');
 return {menu,store,storage,calls,data};
}

// Fixed quality pools replace random-quality draw dialogs and reveal animations.
// Presentation must never mint awards: the persisted receipt is the authority.
function inside(node, ancestor) {
 let x=0,y=0,n=node;
 while(n!==ancestor){assert.ok(n);x+=n.position?.x||0;y+=n.position?.y||0;n=n.parent;}
 const a=ancestor.getComponent(UITransform).contentSize,b=node.getComponent(UITransform).contentSize;
 assert.ok(x-b.width/2>=-a.width/2-.01&&x+b.width/2<=a.width/2+.01,node.name+' horizontal bounds');
 assert.ok(y-b.height/2>=-a.height/2-.01&&y+b.height/2<=a.height/2+.01,node.name+' vertical bounds');
 return{x,y,...b};
}
const rich={xp:profile.cultivationLevelXp(21),spiritStones:100000,contribution:100000,
 pills:Object.fromEntries(Object.keys(forgingMaterials.FORGE_MATERIALS).map(id=>[id,10000]))};
function selectRecipe(menu,category,tier,quality=1){
 const recipe=forgingTools.forgingRecipe(`${category}:${tier}:q${quality}`);
 if(menu.gearMode==='buy'){
  click(menu,'分类-'+category);
  click(menu,'商品卡片-'+recipe.id);
 }else{
  click(menu,'分类-'+tier);
  click(menu,'配方卡片-'+recipe.id);
 }
 return recipe;
}
function action(store,category='weapon',count=1,tier='fan'){
 const sequence=store.state.forgeSequence+1;
 return{type:tier==='fan'?'buyGear':'craftGear',id:`${category}:${tier}:q1`,count,sequence,requestId:`test-${sequence}`};
}
function detailNamesFor(recipe){return recipe.definitionIds.map(id=>[...weaponTools.WEAPONS,...equipmentTools.EQUIPMENT].find(d=>d.id===id).name);}
function namesFor(recipe){return recipe.definitionIds.map(id=>{const item=forgingTools.createForgedGear(recipe.id,'preview',id);return recipe.category==='weapon'?weaponTools.weaponName(item):equipmentTools.equipmentName(item);});}
function batch(menu,count=10){for(let i=1;i<count;i++)click(menu,'增加数量');}
function dismissDetail(menu){const shade=find(menu,'交易弹窗遮罩');shade.events.get(Node.EventType.TOUCH_END)({target:shade});}
for(const [width,height] of [[1280,720],[844,390]]){
 test(`forge hall sells deterministic equipment with no random draw ${width}x${height}`,()=>{
  const {menu,store,calls}=setup(width,height,rich),before=copy(store.state);click(menu,'炼器主殿');
  assert.equal(menu.gearMode,'buy');assert.match(text(menu.root),/武器装备购买/);
  for(const category of ['weapon','armor','ring']){
   const r=selectRecipe(menu,category,'fan');
   assert.equal(menu.gearSelection,r.id);assert.equal(r.definitionIds.length,1);
   find(menu,'购买物品弹窗');
   assert.ok(text(menu.root).includes(namesFor(r)[0]));
   click(menu,'取消购买');
  }
  click(menu,'分类-all');
  assert.equal(all(find(menu,'武器装备购买页')).filter(n=>n.name.startsWith('商品卡片-')).length,4);
  assert.equal(all(menu.root).some(n=>/^(中品|上品|极品)$/.test(n.name)&&n.getComponent(Button)),false);
  assert.equal(all(menu.root).some(n=>/抽取(一次|十次)$/.test(n.name)),false);
  assert.deepEqual(copy(store.state),before);assert.equal(calls.length,0);
 });
 test(`crafting preview covers every formal quality pool without spending ${width}x${height}`,()=>{
  const {menu,store,calls}=setup(width,height,rich),before=copy(store.state);click(menu,'炼器炉');
  for(const category of ['weapon','armor','ring'])for(const quality of [1,2,3,4])for(const tier of ['fa','bao','ling']){
   const r=selectRecipe(menu,category,tier,quality),contents=text(find(menu,'炼制详情'));
   assert.ok(contents.includes('随机获得其中1件'));
   assert.ok(contents.includes('点击图标查看属性'));
   for(const [i,id] of r.definitionIds.entries()){
    click({root:find(menu,'炼制详情')},'物品图-'+id);
    assert.ok(text(find(menu,'制作物品详情')).includes(detailNamesFor(r)[i]),id);
    dismissDetail(menu);
   }
   assert.doesNotMatch(contents,/心愿/);
   const scroll=find(menu,'炼制详情').getComponent(ScrollView);
   assert.equal(scroll.vertical,scroll.content.getComponent(UITransform).contentSize.height>scroll.node.getComponent(UITransform).contentSize.height);
  }
  assert.deepEqual(copy(store.state),before);assert.equal(calls.length,0);
 });
 test(`forge overlay controls and independent scroll panes stay in bounds ${width}x${height}`,()=>{
  const {menu}=setup(width,height,rich);click(menu,'炼器炉');selectRecipe(menu,'weapon','ling',4);
  const panel=find(menu,'炼器页');inside(panel,menu.root);
  for(const name of ['关闭炼器工坊','分类-fa','分类-bao','分类-ling','开始炼制','配方列表','炼制详情'])inside(find(menu,name),panel);
  assert.equal(find(menu,'开始炼制').getComponent(UITransform).contentSize.height,58);
  assert.equal(find(menu,'关闭炼器工坊').getComponent(UITransform).contentSize.height,68);
  assert.equal(all(panel).some(n=>['增加数量','减少数量'].includes(n.name)),false);
  assert.notEqual(find(menu,'配方列表').getComponent(ScrollView),find(menu,'炼制详情').getComponent(ScrollView));
 });
 test(`batch purchase debounces callback and reports only persisted awards ${width}x${height}`,()=>{
  const {menu,store,calls,data}=setup(width,height,rich);click(menu,'炼器主殿');selectRecipe(menu,'armor','fan');batch(menu);
  const before=copy(store.state),callback=find(menu,'确认购买').events.get(Button.EventType.CLICK);callback();callback();
  assert.equal(calls.length,1);assert.equal(calls[0].count,10);assert.equal(calls[0].type,'buyGear');
  assert.equal(store.state.spiritStones,before.spiritStones-240);assert.equal(store.state.contribution,before.contribution);
  const ids=store.state.forgeReceipts.at(-1).ids;assert.equal(new Set(ids).size,10);
  assert.ok(ids.every(id=>store.state.equipment[id].category==='armor'&&store.state.equipment[id].quality===1));
  find(menu,'获得物品弹窗');
  assert.equal(menu.commerceRewards.length,1);assert.equal(menu.commerceRewards[0].count,10);
  assert.equal(menu.commerceRewards[0].name,equipmentTools.equipmentName(store.state.equipment[ids[0]]));
  const saved=data.get(campaign.TOWER_CAMPAIGN_KEY),after=copy(store.state);
  for(let i=0;i<60;i++)menu.updateEffects(1/60);
  click(menu,'关闭炼器工坊');click(menu,'炼器主殿');
  assert.deepEqual(copy(store.state),after);assert.equal(data.get(campaign.TOWER_CAMPAIGN_KEY),saved);assert.equal(calls.length,1);
 });
 test(`single purchase creates one award and inventory retains the same identity ${width}x${height}`,()=>{
  const {menu,store,calls}=setup(width,height);click(menu,'炼器主殿');selectRecipe(menu,'weapon','fan');click(menu,'确认购买');
  const receipt=store.state.forgeReceipts.at(-1),id=receipt.ids[0];assert.equal(receipt.ids.length,1);
  const item=store.state.weapons[id];assert.ok(text(menu.root).includes(weaponTools.weaponName(item)));
  const before=copy(store.state);click(menu,'确认获得');click(menu,'关闭炼器工坊');click(menu,'背包');find(menu,`背包物品-${id}`);
  assert.deepEqual(copy(store.state),before);assert.equal(calls.length,1);
 });
 test(`forge details have no wish controls ${width}x${height}`,()=>{
  const {menu,store}=setup(width,height,rich);
  click(menu,'炼器炉');const recipe=selectRecipe(menu,'weapon','fa',4);
  for(const [i,id] of recipe.definitionIds.entries()){
   click({root:find(menu,'炼制详情')},'物品图-'+id);
   assert.doesNotMatch(text(menu.root),/心愿|第三次必得/);
   assert.ok(text(find(menu,'制作物品详情')).includes(detailNamesFor(recipe)[i]));
   dismissDetail(menu);
  }
  assert.equal('forgeWishes' in store.state,false);
 });
}

test('crafting allows previewing locked tiers but gates submission by the current realm',()=>{
 for(const level of [1,3,4,10,11,20,21,27]){
  const {menu,store,calls}=setup(844,390,{...rich,xp:profile.cultivationLevelXp(level)});click(menu,'炼器炉');
  const before=copy(store.state);
  for(const tier of ['fa','bao','ling']){
   selectRecipe(menu,'weapon',tier);
   assert.equal(all(find(menu,'配方列表')).filter(n=>n.name.startsWith('配方卡片-')).length,12);
   assert.equal(find(menu,'开始炼制').getComponent(Button).interactable,tierTools.canUseEquipmentTier(tier,level));
  }
  assert.deepEqual(copy(store.state),before);assert.equal(calls.length,0);
 }
});
test('failed craft save retries with the same receipt and exactly one resource deduction',async()=>{
 const {menu,store,storage,data,calls}=setup(844,390,rich);click(menu,'炼器炉');const recipe=selectRecipe(menu,'weapon','fa');
 const before=copy(store.state),saved=data.get(campaign.TOWER_CAMPAIGN_KEY);
 assertActionSucceeds(before,action(store,'weapon',1,'fa'),1800000000000);
 click(menu,'开始炼制');find(menu,'炼制确认弹窗');
 assert.deepEqual(copy(store.state),before);assert.equal(calls.length,0);
 storage.fail=true;click(menu,'确认炼制');
 assert.deepEqual(copy(store.state),before);assert.equal(data.get(campaign.TOWER_CAMPAIGN_KEY),saved);assert.match(text(menu.root),/保存失败/);
 assert.equal(all(menu.root).some(n=>n.name==='获得物品弹窗'),false);
 storage.fail=false;await new Promise(resolve=>setTimeout(resolve,710));click(menu,'确认炼制');
 assert.equal(calls.length,2);assert.equal(calls[0].requestId,calls[1].requestId);assert.equal(calls[0].sequence,calls[1].sequence);
 assert.equal(store.state.spiritStones,before.spiritStones-recipe.spiritStones);
 assert.equal(store.state.contribution,before.contribution);
 assert.equal(store.state.pills.forge_xuantie,before.pills.forge_xuantie-2);
 assert.equal(store.state.forgeReceipts.at(-1).ids.length,1);
 const restored=new campaign.TowerCampaignStore(storage,1800000000000);assertCurrentCampaign(restored,store.state);
});
test('batch quote rejects total cost, realm, count and capacity before mutating',()=>{
 for(const patch of [{spiritStones:239,contribution:10000},{spiritStones:0,contribution:10000}]){
  const {store}=setup(1280,720,patch),before=copy(store.state);
  assert.equal(store.act(action(store,'weapon',10),1800000000000).reason,'insufficient');assert.deepEqual(copy(store.state),before);
 }
 const control=setup(1280,720,{spiritStones:240,contribution:0});
 assert.equal(control.store.act(action(control.store,'weapon',10),1800000000000).ok,true);
 assert.equal(control.store.state.spiritStones,0);assert.equal(control.store.state.contribution,0);
 const {store,data,storage}=setup(1280,720,{spiritStones:100000,contribution:100000});
 for(const [a,reason] of [[action(store,'weapon',1,'ling'),'realm-locked'],[action(store,'weapon',0),'invalid-count'],[action(store,'weapon',11),'invalid-count']]){
  const before=copy(store.state);assert.equal(store.act(a,1800000000000).reason,reason);assert.deepEqual(copy(store.state),before);
 }
 for(let i=0;i<23;i++)assert.equal(store.act(action(store,'weapon',10),1800000000000).ok,true);
 const before=copy(store.state),saved=data.get(campaign.TOWER_CAMPAIGN_KEY);
 assert.equal(store.act(action(store,'armor',10),1800000000000).reason,'capacity');
 assert.deepEqual(copy(store.state),before);assert.equal(data.get(campaign.TOWER_CAMPAIGN_KEY),saved);
 assert.deepEqual(copy(new campaign.TowerCampaignStore(storage,1800000000000).state),before);
});
test('armor and ring pools never cross category or quality during batch crafting',()=>{
 for(const category of ['armor','ring'])for(const quality of [1,2,3,4]){
  const {store}=setup(1280,720,rich),r=forgingTools.forgingRecipe(`${category}:fa:q${quality}`);
  const result=store.act({...action(store,category,10,'fa'),id:r.id},1800000000000);assert.equal(result.ok,true);
  assert.equal(result.ids.length,10);assert.ok(result.ids.every(id=>store.state.equipment[id].category===category&&store.state.equipment[id].quality===quality));
 }
});
test('disabled, closed, destroyed and stale-generation callbacks cannot purchase',()=>{
 const {menu,store,calls}=setup(844,390,{spiritStones:0,contribution:0});click(menu,'炼器主殿');selectRecipe(menu,'weapon','fan');
 const before=copy(store.state);find(menu,'确认购买').events.get(Button.EventType.CLICK)();assert.equal(calls.length,0);assert.deepEqual(copy(store.state),before);
 const f=setup();click(f.menu,'炼器主殿');selectRecipe(f.menu,'weapon','fan');const stale=find(f.menu,'确认购买').events.get(Button.EventType.CLICK);
 click(f.menu,'取消购买');click(f.menu,'关闭炼器工坊');stale();assert.equal(f.calls.length,0);
 click(f.menu,'炼器主殿');selectRecipe(f.menu,'weapon','fan');const dead=find(f.menu,'确认购买').events.get(Button.EventType.CLICK);f.menu.destroy();dead();assert.equal(f.calls.length,0);
});
test('quality-four preview includes both graduates and never charges on view or presentation ticks',()=>{
 const {menu,store,calls}=setup(844,390,rich);click(menu,'炼器炉');const r=selectRecipe(menu,'weapon','ling',4),before=copy(store.state);
 assert.equal(r.definitionIds.length,2);for(const [i,id] of r.definitionIds.entries()){click({root:find(menu,'炼制详情')},'物品图-'+id);assert.ok(text(find(menu,'制作物品详情')).includes(detailNamesFor(r)[i]));dismissDetail(menu);}
 for(let i=0;i<60;i++)menu.updateEffects(1/60);
 assert.deepEqual(copy(store.state),before);assert.equal(calls.length,0);
});
test('close and revisit preserve state without retaining a pending submission',()=>{
 const {menu,store,calls}=setup();click(menu,'炼器主殿');const before=copy(store.state);
 const panel=find(menu,'武器装备购买页'),close=find(menu,'关闭炼器工坊');inside(close,panel);assert.equal(text(close).trim(),'‹ 返回庭院');
 click(menu,'关闭炼器工坊');assert.equal(all(menu.root).some(n=>n.name==='武器装备购买页'),false);
 click(menu,'炼器主殿');assert.equal(menu.gearCount,1);assert.equal(menu.gearRequest,null);
 assert.deepEqual(copy(store.state),before);assert.equal(calls.length,0);
});

test('sect entries share cultivation state and keep tower separate from inheritance peaks', () => {
 const {menu,store,calls}=setup();
 const initial=JSON.stringify(store.state);
 menu.render(store.state,'hall');
 for (const name of ['锁妖塔','落云主峰','凌霄剑峰','炼器峰','丹霞峰','御兽峰','云篆符峰','万法峰']) {
  assert.ok(all(menu.root).some(n=>n.name==='宗门入口-'+name && n.getComponent(Button)),name);
 }
 for (const removed of ['镇妖峰','传功峰','试剑峰','栖霞峰','灵兽峰','灵符峰','丹鼎峰']) {
  assert.ok(!all(menu.root).some(n=>n.name===removed), removed);
 }
 for (const name of ['御兽峰','云篆符峰','万法峰']) {
  assert.ok(find(menu,'宗门入口-'+name).getComponent(Button));
 }
 click(menu,'宗门入口-凌霄剑峰');
 assert.equal(menu.currentPage,'swordPeak');
 click(menu,'功法');
 const inherited=text(menu.root);
 menu.render(store.state,'home');
 click(menu,'功法');
 assert.equal(text(menu.root).replace('藏经阁','凌霄剑峰'),inherited);
 menu.render(store.state,'home');
 click(menu,'主峰建筑-洞府整备');
 menu.render(store.state,'home');
 click(menu,'主峰建筑-演武场');
 assert.equal(JSON.stringify(store.state),initial);
 assert.deepEqual(calls,[]);
});

for (const [width,height] of [[1280,720],[844,390]]) {
 test(`danxia ${width}x${height}: main hall opens shop, purchase persists, close and revisit reset`,async()=>{
  const {menu,store,calls,storage,data}=setup(width,height);
  menu.render(store.state,'pills');
  const initial=copy(store.state);
  find(menu,'sect-scene/danxia-courtyard');
  assert.equal(menu.scroll.node.active,false);
  assert.equal(all(menu.root).some(n=>n.name==='丹药购买页'),false);
  click(menu,'丹霞主殿');
  const panel=find(menu,'丹药购买页');
  inside(find(menu,'关闭丹药菜单'),panel);
  assert.deepEqual(copy(store.state),initial);
  const card=find(menu,'商品卡片-huichun'),cardText=text(card).trim();
  click(menu,'商品卡片-huichun');
  find(menu,'背包详情区');
  assert.equal(all(menu.root).some(n=>n.name==='物品操作区'),false);
  const purchaseWasOpen=all(menu.root).some(n=>n.name==='购买物品弹窗');
  click(menu,'取消购买');
  click(menu,'商品卡片-huichun');
  const buy=()=>find(menu,'确认购买');
  const first=buy(),stale=first.events.get(Button.EventType.CLICK);
  inside(first,find(menu,'购买物品弹窗'));
  stale();stale();
  assert.equal(calls.length,1);
  assert.equal(store.state.pills.huichun,initial.pills.huichun+1);
  assert.equal(calls[0].type,'buyPill');
  assert.equal(new campaign.TowerCampaignStore(storage,1800000000000).state.pills.huichun,store.state.pills.huichun);
  const purchaseContribution=store.state.contribution,purchaseStones=store.state.spiritStones;
  const before=copy(store.state),saved=data.get(campaign.TOWER_CAMPAIGN_KEY);
  click(menu,'确认获得');click(menu,'商品卡片-huichun');
  await new Promise(resolve=>setTimeout(resolve,710));
  storage.fail=true;buy().events.get(Button.EventType.CLICK)();
  assert.deepEqual(copy(store.state),before);
  assert.equal(data.get(campaign.TOWER_CAMPAIGN_KEY),saved);
  assert.match(text(menu.root),/保存失败/);
  storage.fail=false;
  click(menu,'取消购买');
  click(menu,'关闭丹药菜单');
  assert.equal(all(menu.root).some(n=>n.name==='丹药购买页'),false);
  click(menu,'丹霞主殿');
  menu.render(store.state,'hall');menu.render(store.state,'pills');
  assert.equal(all(menu.root).some(n=>n.name==='丹药购买页'),false);
  // Preserve the former presentation/economy assertions after exercising the transaction.
  assert.match(cardText,/回春丹/);assert.match(cardText,/5下品灵石/);assert.doesNotMatch(cardText,/贡献|点眷/);
  assert.equal(purchaseWasOpen,true);
  assert.equal(purchaseContribution,initial.contribution);
  assert.equal(purchaseStones,initial.spiritStones-5);
 });
}

test('equipment quality retains tier hue and gives top quality a stronger frame',()=>{
 const panel=context.TowerInventoryPanel;
 for(const tier of ['fan','fa','bao','ling','fabao','lingbao','xian','shen']){
  const styles=[1,2,3,4].map(q=>panel.qualityFrame(tier,q));
  assert.equal(new Set(styles.map(s=>s.color)).size,4);
  assert.ok(styles[0].width<styles[1].width && styles[1].width<styles[2].width);
  assert.ok(styles[3].width-styles[2].width>styles[2].width-styles[1].width);
  assert.deepEqual(styles.map(s=>s.ornate),[false,false,false,true]);
 }
 for(const q of [1,2,3,4]){
  const hex=panel.qualityFrame('fa',q).color;
  const [r,g,b]=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
  assert.ok(g>r && g>b,'法器 stays green at every quality');
 }
});

for(const [width,height] of [[1280,720],[844,390]])test(`pill quantity and zero balance ${width}`,()=>{
 const {menu,store}=setup(width,height,{spiritStones:27,contribution:0,pills:{ zhuji: 0,huichun:0,peiyuan:0}});
 menu.render(store.state,'pills');click(menu,'丹霞主殿');click(menu,'商品卡片-peiyuan');
 find(menu,'背包详情区');click(menu,'取消购买');click(menu,'商品卡片-huichun');
 assert.equal(find(menu,'减少数量').getComponent(Button).interactable,false);
 assert.equal(all(find(menu,'减少数量')).find(n=>n.getComponent(Label)).getComponent(Label).string,'−');
 click(menu,'增加数量');assert.equal(menu.apothecaryQuantity,2);
 click(menu,'减少数量');assert.equal(menu.apothecaryQuantity,1);
 click(menu,'最大数量');const selectedQuantity=menu.apothecaryQuantity;
 const panel=find(menu,'购买物品弹窗');
 for(const name of ['减少数量','增加数量','最大数量','确认购买','关闭交易弹窗'])inside(find(menu,name),panel);
 const quotedText=text(panel);
 click(menu,'确认购买');assert.equal(selectedQuantity,5);assert.match(quotedText,/25下品灵石/);assert.equal(store.state.spiritStones,2);assert.equal(store.state.contribution,0);assert.equal(store.state.pills.huichun,5);
 click(menu,'确认获得');click(menu,'商品卡片-huichun');
 assert.equal(find(menu,'确认购买').getComponent(Button).interactable,false);
});

test('pill detail outside dismissal and courtyard return preserve state without closing on content taps',()=>{
 const {menu,store,calls}=setup(844,390);
 menu.render(store.state,'pills');click(menu,'丹霞主殿');
 const before=copy(store.state),page=find(menu,'丹药购买页'),close=find(menu,'关闭丹药菜单');
 assert.equal(text(close).trim(),'‹ 返回庭院');inside(close,page);
 assert.deepEqual(close.getComponent(UITransform).contentSize,{width:166,height:68});
 // Item details use a modal backdrop; the full-page shop closes through its return button.
 menu.commerceDialog='detail';menu.commerceModal('pills',menu.commerceEntries('pills').find(e=>e.key==='huichun'),()=>{});
 const shade=find(menu,'交易弹窗遮罩'),panel=find(menu,'制作物品详情');
 shade.events.get(Node.EventType.TOUCH_END)({target:panel});assert.equal(menu.commerceDialog,'detail');
 shade.events.get(Node.EventType.TOUCH_END)({target:shade});assert.equal(menu.commerceDialog,'');
 assert.deepEqual(copy(store.state),before);assert.equal(calls.length,0);
 click(menu,'关闭丹药菜单');assert.equal(all(menu.root).some(n=>n.name==='丹药购买页'),false);
});
