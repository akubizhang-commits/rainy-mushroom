import { currentCampaignSchema } from './helpers/tower-schema.mjs'
import {convergencePoses} from '../js/xianxia/TowerConvergence.js'
import * as pillTools from '../js/xianxia/TowerPills.js'
import * as alchemyTools from '../js/xianxia/TowerAlchemy.js'
import * as materialLootTools from '../js/xianxia/TowerMaterialLoot.js'
import * as hitFeedbackTools from '../js/xianxia/TowerHitFeedback.js'
import * as shadowTools from '../js/xianxia/TowerShadow.js'
import * as yujianTools from '../js/xianxia/TowerYujian.js'
import * as tierTools from '../js/xianxia/TowerEquipmentTiers.js'
import {TOWER_PILLARS,PILLAR_ART,PILLAR_FOOTPRINT} from '../js/xianxia/TowerObstacles.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { stripTypeScriptTypes } from 'node:module'
import { runInNewContext } from 'node:vm'
import * as inventoryTools from '../js/xianxia/TowerInventory.js'
import * as weaponTools from '../js/xianxia/TowerWeapons.js'
import * as craftingTools from '../js/xianxia/TowerCrafting.js'
import * as equipmentTools from '../js/xianxia/TowerEquipment.js'
import * as campaign from '../js/xianxia/TowerCampaign.js'
import * as playtest from '../js/xianxia/TowerPlaytest.js'
import * as growth from '../js/xianxia/TowerGrowth.js'
import { skillPresentation } from '../js/xianxia/TowerSkillPresentation.js'
import { skillForm, orbitSwordPose } from '../js/xianxia/TowerSkillForms.js'
import { swordQiSegments, swordQiVisualLift } from '../js/xianxia/TowerSwordQi.js'
import * as content from '../js/xianxia/TowerContent.js'
import * as profile from '../js/xianxia/TowerProfile.js'
import * as loot from '../js/xianxia/TowerLoot.js'
import * as economy from '../js/xianxia/TowerEconomy.js'
import { HEX_CENTER, HEX_VERTICES } from '../js/xianxia/TowerArena.js'
import { TowerRun, coreLootSummary, validateTowerSnapshot, stats as combatStats, characterCombatAttributes } from '../js/xianxia/TowerRun.js'
import { checksum } from '../js/xianxia/Checksum.js'

// Match the existing independent Cocos tests: transform the production TS,
// replace rendering/platform boundaries, and retain real business modules.
// No Creator installation, generated shared copy, browser globals, real disk,
// build, or real player save is needed. Button clicks below are node events,
// not a claim about native touch hit-testing or GPU rendering.
// Optional post-build regression: TOWER_HOST_BUNDLE=/absolute/path/to/index.*.js
// runs the same host behavior against Creator's emitted icon loader and Babel
// helpers. This catches array-only spread lowering that native Node TS cannot.
const sources = Object.fromEntries(['TowerPreferences', 'TowerKeyboardNavigation', 'QingpingAudio', 'SwordBurstArt', 'ConvergenceArt', 'TowerHitArt', 'TowerMenuChrome', 'LiangyiPainter', 'SixiangPainter', 'LiangyiFormationArt', 'SixiangFormationArt', 'TowerMonsterMechanicsView', 'SwordArcArt', 'SwordLineArt', 'SwordShadowArt', 'SwordTiandiArt', 'SwordQiArt', 'OrbitSwordArt', 'TowerSkillEffects', 'TowerDepthOrder', 'TowerEnvironmentArt', 'TowerStoneArt', 'TowerProjectileArt', 'TowerSectScene', 'WeaponQualityArt', 'TowerCharacterArt', 'TowerMonsterArt', 'TowerSkillIcons', 'TowerSkillTreeCatalog', 'TowerSkillTreeLayout', 'TowerPlayerHud', 'TowerInventoryPanel', 'TowerMenu', 'TowerArenaView', 'TowerView'].map(name => [
  name,
  stripTypeScriptTypes(
    readFileSync(new URL(`../cocos-pilot/assets/scripts/${name}.ts`, import.meta.url), 'utf8')
      .replace(/^import .*$/gm, ''),
    { mode: 'transform' },
  ).replace(/^export /gm, ''),
]))
const emittedDefinitions = new Map()
if (process.env.TOWER_HOST_BUNDLE) {
  // Register only; do not execute the game's startup or unrelated modules.
  const registration = {
    System: {
      register(id, dependencies, declare) {
        if (Array.isArray(id)) {
          // Creator wraps support chunks in a dependency-free registration
          // module; its body only registers the named helper modules inside.
          assert.equal(id.length, 0, 'only dependency-free chunk wrappers are supported')
          assert.equal(typeof dependencies, 'function')
          dependencies(() => {}).execute()
          return
        }
        assert.equal(typeof id, 'string')
        assert.ok(Array.isArray(dependencies))
        assert.equal(typeof declare, 'function')
        emittedDefinitions.set(id, { dependencies, declare })
      },
    },
  }
  const bundle = resolve(process.env.TOWER_HOST_BUNDLE)
  const chunks = resolve(dirname(bundle), '../../src/chunks')
  for (const file of [bundle, ...readdirSync(chunks).filter(name => name.endsWith('.js')).map(name => join(chunks, name))]) {
    runInNewContext(readFileSync(file, 'utf8'), registration, { filename: file })
  }
  assert.ok(emittedDefinitions.has('chunks:///_virtual/TowerSkillIcons.ts'), 'bundle must contain the icon loader')
}

function emittedSkillIcons(context) {
  const cache = new Map()
  const load = id => {
    if (cache.has(id)) return cache.get(id)
    const definition = emittedDefinitions.get(id)
    assert.ok(definition, `missing emitted dependency: ${id}`)
    const exports = {}
    cache.set(id, exports)
    const module = definition.declare((name, value) => {
      if (typeof name === 'string') exports[name] = value
      else Object.assign(exports, name)
      return value
    })
    definition.dependencies.forEach((dependency, index) => {
      const imported = dependency === 'cc'
        ? { ...context, cclegacy: { _RF: { push() {}, pop() {} } } }
        : dependency === './TowerGrowth.ts' ? growth
        : load(`${id.slice(0, id.lastIndexOf('/') + 1)}${dependency.replace(/^\.\//, '')}`)
      module.setters[index](imported)
    })
    module.execute()
    return exports
  }
  return load('chunks:///_virtual/TowerSkillIcons.ts').TowerSkillIcons
}

const START = 1_800_000_000_000
const copy = value => JSON.parse(JSON.stringify(value))

class Node {
  static EventType = { TOUCH_START: 'start', TOUCH_MOVE: 'move', TOUCH_END: 'end', TOUCH_CANCEL: 'cancel' }
  constructor(name = '') {
    Object.assign(this, { name, layer: 1, children: [], components: new Map(), events: new Map(), active: true, isValid: true })
  }
  addChild(node) { node.removeFromParent(); node.parent = this; this.children.push(node) }
  addComponent(Type) { const component = new Type(); component.node = this; this.components.set(Type, component); return component }
  getComponent(Type) { return this.components.get(Type) || null }
  setSiblingIndex(index) { const p=this.parent; if(p){p.children=p.children.filter(n=>n!==this);p.children.splice(index,0,this)} }
  setPosition(x, y) { this.position = { x, y } }
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
class UIOpacity { opacity = 255 }
class UITransform {
  setContentSize(width, height) { this.contentSize = { width, height } }
  setAnchorPoint(x, y) { this.anchor = { x, y } }
}
// Keep the new read-only UI as a boundary here; the browser integration suite
// exercises its real controls, scrolling, images and EditBox input.
class TowerLibraryPanelBoundary {
  currentView = 'room'
  constructor(parent, width, height, options) {
    this.options = options
    this.dismissCalls = 0
    this.nextDismissResult = false
    this.destroyCount = 0
    this.root = new Node('LibraryBoundary')
    this.root.addComponent(UITransform).setContentSize(width, height)
    parent.addChild(this.root)
  }
  showRoom() { this.currentView = 'room' }
  dismiss() {
    this.dismissCalls++
    const result = this.nextDismissResult
    this.nextDismissResult = false
    return result
  }
  destroy() { this.destroyCount++; this.root.destroy() }
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
  static Overflow = { NONE: 0, SHRINK: 1 }
  static CacheMode = { NONE: 0 }
}
class LabelOutline {}
class LabelShadow {}
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
class TowerPlatform {
  constructor(host) { this.storage = host.progressStorage }
  onHidden() {} onShown() {} destroy() {}
}

function delayedResources() {
  const requests = []
  return {
    requests,
    resources: {
      load(path, Type, done) {
        assert.equal(typeof path, 'string')
        assert.equal(typeof done, 'function')
        requests.push({ path, Type, done, settled: false })
      },
    },
    complete(request, error = null) {
      assert.ok(requests.includes(request) && !request.settled, 'resolve a pending resource exactly once')
      request.settled = true
      const asset = error ? null : new request.Type()
      if (asset) asset.name = request.path
      request.asset = asset
      request.done(error, asset)
      return asset
    },
  }
}

function disk() {
  const data = new Map(), blockedReads = new Set(), blockedWrites = new Set(), writes = []
  return {
    data, blockedReads, blockedWrites, writes,
    getItem(key) {
      if (blockedReads.has(key)) throw new Error(`read failed: ${key}`)
      return data.get(key) ?? null
    },
    setItem(key, value) {
      if (blockedWrites.has(key)) throw new Error(`quota/write failed: ${key}`)
      writes.push(key)
      data.set(key, value)
    },
  }
}

function seed(storage, { hp = 100, paused = false, patch = {} } = {}) {
  const initial = new campaign.TowerCampaignStore(storage, START)
  assert.ok(initial.act({ type: 'sync' }, START).ok)
  // A valid low-HP fixture, not a runtime health mutation or a bypass of validation.
  const envelope = JSON.parse(storage.getItem(campaign.TOWER_CAMPAIGN_KEY))
  assert.equal(envelope.schema, currentCampaignSchema, 'new fixtures use the current spirit-stone schema')
  const state = JSON.parse(envelope.data)
  assert.equal(state.spiritStones, 500)
  assert.equal(Object.hasOwn(state, 'cores'), false)
  state.hp = hp
  Object.assign(state, patch)
  if (patch.skills && !patch.skillsInitialized) state.skills = { sj_arc: 1, ...patch.skills }
  envelope.data = JSON.stringify(state)
  envelope.checksum = checksum(envelope.data)
  storage.data.set(campaign.TOWER_CAMPAIGN_KEY, JSON.stringify(envelope))
  const normal = new campaign.TowerCampaignStore(storage, START)
  assert.equal(normal.readOnly, false)
  if (paused) {
    assert.ok(normal.act({ type: 'startFloor', floor: 1, seed: 123 }, START).ok)
    const run = TowerRun.restore(normal.state.activeRun.snapshot)
    run.pause()
    assert.ok(normal.act({ type: 'checkpoint', snapshot: run.snapshot() }, START).ok)
  }
  storage.writes.length = 0
  return storage.getItem(campaign.TOWER_CAMPAIGN_KEY)
}

function launch(t, storage, { assisted = true, frame = { width: 1280, height: 720 } } = {}) {
  const clock = { now: START }
  const icons = delayedResources()
  const viewport = { frame: { ...frame }, design: { width: 1280, height: 720 }, policies: [] }
  const ResolutionPolicy = { SHOW_ALL: 1, FIXED_WIDTH: 2 }
  const view = {
    getFrameSize: () => ({ ...viewport.frame }),
    setDesignResolutionSize(width, height, policy) {
      viewport.design = { width, height }
      viewport.policies.push(policy)
    },
    getVisibleSize() {
      // FIXED_WIDTH adapts logical height to the frame; SHOW_ALL keeps the
      // design viewport and letterboxes it. The host chooses the policy.
      return viewport.policies.at(-1) === ResolutionPolicy.FIXED_WIDTH
        ? { width: viewport.design.width, height: viewport.design.width * viewport.frame.height / viewport.frame.width }
        : { ...viewport.design }
    },
  }
  const location = {
    href: `https://tower.test/game${assisted ? '?playtest=1' : ''}`,
    get search() { return new URL(this.href).search },
  }
  const context = { ...tierTools,
    AudioClip: class {}, AudioSource: class { stop(){} play(){} destroy(){} },
    ...alchemyTools, ...materialLootTools, ...shadowTools, ...hitFeedbackTools, convergencePoses, ...yujianTools, ...inventoryTools, ...weaponTools, ...equipmentTools, ...craftingTools, ...campaign, ...playtest, ...growth, ...content, ...profile, ...pillTools, ...loot, ...economy, TowerRun, coreLootSummary, skillPresentation, skillForm, orbitSwordPose, swordQiSegments, swordQiVisualLift, combatStats, characterCombatAttributes,
    Node, UITransform, UIOpacity, Graphics, Label, LabelOutline, LabelShadow, Button, Sprite, SpriteFrame, ImageAsset, Texture2D,
    Color, Vec2, Rect, Size, JsonAsset, ScrollView, Mask, BlockInputEvents, TowerPlatform,
    TowerLibraryPanel: TowerLibraryPanelBoundary,
    isValid: value => value?.isValid === true,
    resources: icons.resources,
    HEX_CENTER, HEX_VERTICES, TOWER_PILLARS, PILLAR_ART, PILLAR_FOOTPRINT,
    view, ResolutionPolicy,
    input: { on() {}, off() {} },
    Input: { EventType: { KEY_DOWN: 'down', KEY_UP: 'up' } },
    KeyCode: { ESCAPE: 27, KEY_A: 65, KEY_D: 68, KEY_S: 83, KEY_W: 87, ARROW_LEFT: 37, ARROW_UP: 38, ARROW_RIGHT: 39, ARROW_DOWN: 40 },
    Date: class extends Date { static now() { return clock.now } },
    URL, URLSearchParams,
    document: { hidden: false, addEventListener() {}, removeEventListener() {} },
    window: {
      location, addEventListener() {}, removeEventListener() {},
      history: { replaceState(_state, _title, url) { location.href = String(url) } },
    },
  }
  Object.assign(context,runInNewContext(`(() => { ${sources.TowerPreferences}\nreturn {presentationPreferences,setPresentationPreference} })()`,context));
  context.TowerKeyboardNavigation=runInNewContext(`(() => { ${sources.TowerKeyboardNavigation}\nreturn TowerKeyboardNavigation })()`,context);
  // Keep the real async loader/cache; only the Cocos resource boundary is delayed.
  context.TowerSkillIcons = process.env.TOWER_HOST_BUNDLE ? emittedSkillIcons(context) : runInNewContext(
    `(() => { ${sources.TowerSkillIcons}\nreturn TowerSkillIcons })()`, context, { filename: 'TowerSkillIcons.ts' },
  )
  Object.assign(context,runInNewContext(`(() => { ${sources.TowerDepthOrder}\nreturn {setTowerDepth,sortTowerDepth,TowerBodyFallbacks} })()`,context))
  for (const name of ['LiangyiPainter','SixiangPainter','LiangyiFormationArt','SixiangFormationArt']) context[name]=runInNewContext(`(() => { ${sources[name]}\nreturn ${name} })()`,context)
  context.TowerMonsterMechanicsView = runInNewContext(`(() => { ${sources.TowerMonsterMechanicsView}\nreturn TowerMonsterMechanicsView })()`, context)
  context.TowerEnvironmentArt = runInNewContext(`(() => { ${sources.TowerEnvironmentArt}\nreturn TowerEnvironmentArt })()`, context)
  context.TowerProjectileArt = runInNewContext(`(() => { ${sources.TowerProjectileArt}\nreturn TowerProjectileArt })()`, context)
  context.SwordArcArt = runInNewContext(`(() => { ${sources.SwordArcArt}\nreturn SwordArcArt })()`, context)
  context.QingpingAudio = runInNewContext(`(() => { ${sources.QingpingAudio}\nreturn QingpingAudio })()`, context)
  context.SwordBurstArt = runInNewContext(`(() => { ${sources.SwordBurstArt}\nreturn SwordBurstArt })()`, context)
  context.ConvergenceArt = runInNewContext(`(() => { ${sources.ConvergenceArt}\nreturn ConvergenceArt })()`, context)
  context.SwordLineArt = runInNewContext(`(() => { ${sources.SwordLineArt}\nreturn SwordLineArt })()`, context)
  context.SwordShadowArt = runInNewContext(`(() => { ${sources.SwordShadowArt}\nreturn SwordShadowArt })()`, context)
  context.TowerHitArt = runInNewContext(`(() => { ${sources.TowerHitArt}\nreturn TowerHitArt })()`, context)
  context.SwordTiandiArt = runInNewContext(`(() => { ${sources.SwordTiandiArt}\nreturn SwordTiandiArt })()`, context)
  context.SwordQiArt = runInNewContext(`(() => { ${sources.SwordQiArt}\nreturn SwordQiArt })()`, context)
  context.OrbitSwordArt = runInNewContext(`(() => { ${sources.OrbitSwordArt}\nreturn OrbitSwordArt })()`, context)
  context.TowerSkillEffects = runInNewContext(`(() => { ${sources.TowerSkillEffects}\nreturn TowerSkillEffects })()`, context)
  context.TowerStoneArt = runInNewContext(`(() => { ${sources.TowerStoneArt}\nreturn TowerStoneArt })()`, context)
  context.TowerSectScene = runInNewContext(`(() => { ${sources.TowerSectScene}\nreturn TowerSectScene })()`, context)
  context.WeaponQualityArt = runInNewContext(`(() => { ${sources.WeaponQualityArt}\nreturn WeaponQualityArt })()`, context)
  context.TowerCharacterArt = runInNewContext(`(() => { ${sources.TowerCharacterArt}\nreturn TowerCharacterArt })()`, context, { filename: 'TowerCharacterArt.ts' })
  context.TowerMonsterArt = runInNewContext(`(() => { ${sources.TowerMonsterArt}\nreturn TowerMonsterArt })()`, context, { filename: 'TowerMonsterArt.ts' })
  // Separate closures preserve the actual modules' private constants (both have C).
  Object.assign(context, runInNewContext(`(() => { ${sources.TowerSkillTreeCatalog}\nreturn { TREE_BRANCHES, COMMON_SKILL_IDS, FUTURE_SKILLS, DISPLAY_STAGES, COLUMN_INDEX, TREE_COLUMNS } })()`, context))
  Object.assign(context, runInNewContext(`(() => { ${sources.TowerSkillTreeLayout}\nreturn { layoutSkillTree } })()`, context))
  Object.assign(context, runInNewContext(`(() => { ${sources.TowerPlayerHud}\nreturn {createPlayerHud,drawPlayerHp,drawPlayerXp,drawHudPortrait,drawHudActionIcon,SETTINGS_ICON_SIZE} })()`, context))
  Object.assign(context, runInNewContext(`(() => { ${sources.TowerMenuChrome}\nreturn {drawMenuVeil,drawMenuClose,MENU_COLORS,ITEM_COLORS,BOOK_COLORS} })()`, context));
  context.TowerInventoryPanel = runInNewContext(`(() => { ${sources.TowerInventoryPanel}\nreturn TowerInventoryPanel })()`, context)
  context.TowerMenu = runInNewContext(`(() => { ${sources.TowerMenu}\nreturn TowerMenu })()`, context, { filename: 'TowerMenu.ts' })
  // Execute the real renderer with real arena geometry; no substitute draw
  // functions may hide a missing dependency or a host/helper API mismatch.
  Object.assign(context, runInNewContext(
    `(() => { ${sources.TowerArenaView}\nreturn {drawTowerArena,drawTowerArenaMap} })()`,
    context, { filename: 'TowerArenaView.ts' },
  ))
  const TowerView = runInNewContext(`(() => { ${sources.TowerView}\nreturn TowerView })()`, context, { filename: 'TowerView.ts' })
  const game = new TowerView({ canvas: new Node('canvas'), progressStorage: storage })
  t.after(() => game.destroy())
  return {
    game, clock, location, viewport, icons,
    resize(width, height) {
      viewport.frame = { width, height }
      // PinePilot's canvas-resize handler calls this public host entry point.
      game.render()
    },
    tick(seconds) {
      clock.now += seconds * 1000
      game.update(seconds)
    },
  }
}

function descendants(node) {
  return node && node.isValid ? [node, ...node.children.flatMap(descendants)] : []
}

test('monster art caches all nine families, bounds ID nodes, faces without hopping, and releases once', t => {
  const storage = disk(); seed(storage)
  const { game, icons } = launch(t, storage, { assisted: false })
  const art = game.monsterArt, parent = new Node('art')
  const families = ['boar', 'wolf', 'bear', 'tiger', 'ape', 'snake', 'crocodile', 'scorpion', 'centipede']
  const paint = (id, family, x = 100, radius = 18) => art.draw(parent, id, family, x - 20, 44, x, 0, radius)
  for (let frame = 0; frame < 10; frame++) {
    art.beginFrame()
    for (let i = 0; i < 90; i++) assert.equal(paint(i, families[i % 9]), 0)
    art.endFrame()
  }
  const requests = icons.requests.filter(r => r.path.startsWith('tower-monsters/'))
  assert.deepEqual(requests.map(r => r.path), families.map(f => `tower-monsters/${f}`))
  assert.equal(parent.children.length, 0, 'no nodes for pending artwork')
  const images = requests.map(r => icons.complete(r))
  art.beginFrame()
  for (let i = 0; i < 90; i++) assert.equal(paint(i, families[i % 9]), 64)
  art.endFrame()
  assert.equal(parent.children.length, 90)
  const first = parent.children[0]
  assert.equal(first.scale.x, 1, 'left-facing source stays unflipped when heading left')
  assert.equal(first.layer, parent.layer)
  assert.equal(first.getComponent(Sprite).trim, false)
  const frames = parent.children.slice(0, 9).map(n => n.getComponent(Sprite).spriteFrame)
  const textures = frames.map(f => f.texture)
  assert.equal(parent.children[9].getComponent(Sprite).spriteFrame, frames[0], 'shared family frame')
  art.beginFrame()
  assert.equal(paint(0, 'boar', 102, 100), 110)
  art.endFrame()
  assert.equal(parent.children.length, 1)
  assert.equal(parent.children[0], first, 'stable enemy ID reuses its node')
  assert.deepEqual(first.position, { x: 82, y: 44 })
  assert.deepEqual(first.scale, { x: -1, y: 1, z: 1 }, 'only horizontal flip; no bob or squash')
  for (let frame = 0; frame < 100; frame++) {
    art.beginFrame()
    paint(`new-${frame}`, 'boar')
    art.endFrame()
    assert.equal(parent.children.length, 1, 'despawn churn never accumulates attached nodes')
  }
  art.clearBindings()
  assert.equal(parent.children.length, 0)
  assert.equal(paint('return', 'boar'), 64, 'clearing actors preserves loaded cache')
  assert.equal(icons.requests.filter(r => r.path.startsWith('tower-monsters/')).length, 9)
  assert.ok(images.every(i => i.refs === 1))
  art.destroy(); art.destroy()
  assert.equal(parent.children.length, 0)
  assert.ok(images.every(i => i.refs === 0))
  assert.ok(frames.every(f => !f.isValid))
  assert.ok(textures.every(f => !f.isValid))
  assert.equal(paint('dead', 'boar'), 0)
})

test('monster missing/malformed resources and unsupported beasts retain fallback with no retry storm', t => {
  const storage = disk(); seed(storage)
  const { game, icons } = launch(t, storage, { assisted: false })
  const art = game.monsterArt, parent = new Node('art')
  const paint = f => art.draw(parent, f, f, 0, 0, 0, 10, 18)
  for (const family of ['boar', 'wolf', 'spider', 'bat', 'falcon', '../boar']) assert.equal(paint(family), 0)
  const requests = icons.requests.filter(r => r.path.startsWith('tower-monsters/'))
  assert.equal(requests.length, 3)
  icons.complete(requests[0], Error('missing'))
  icons.complete(requests[2], Error('missing falcon'))
  const malformed = new ImageAsset(); malformed.width = 512
  requests[1].done(null, malformed)
  for (let i = 0; i < 100; i++) {
    art.beginFrame()
    for (const family of ['boar', 'wolf', 'spider', 'bat', 'falcon']) assert.equal(paint(family), 0)
    art.endFrame()
  }
  assert.equal(icons.requests.filter(r => r.path.startsWith('tower-monsters/')).length, 3)
  assert.equal(malformed.refs, 0)
  assert.equal(parent.children.length, 0)
})

test('monster late completion after clearing or destruction cannot mutate stale actors', t => {
  const storage = disk(); seed(storage)
  const { game, icons } = launch(t, storage, { assisted: false })
  const art = game.monsterArt, old = new Node('old'), next = new Node('next')
  assert.equal(art.draw(old, 'old', 'boar', 0, 0, 0, 10, 18), 0)
  art.clearBindings(); old.destroy()
  const boar = icons.requests.find(r => r.path === 'tower-monsters/boar')
  icons.complete(boar)
  assert.equal(old.children.length, 0)
  assert.equal(next.children.length, 0, 'completion owns no scene binding')
  assert.equal(art.draw(next, 'new', 'boar', 0, 0, 0, 10, 18), 64)
  assert.equal(art.draw(next, 'late', 'wolf', 0, 0, 0, 10, 18), 0)
  const wolf = icons.requests.find(r => r.path === 'tower-monsters/wolf')
  art.destroy()
  const late = icons.complete(wolf)
  assert.equal(next.children.length, 0)
  assert.equal(late.refs, 0, 'destroyed cache never acquires the late image')
  assert.equal(boar.asset.refs, 0)
})

test('monster synchronous resource success and exceptions are cached without unbalanced refs', t => {
  const storage = disk(); seed(storage)
  const { game, icons } = launch(t, storage, { assisted: false })
  const art = game.monsterArt, parent = new Node('art'), image = new ImageAsset()
  let calls = 0
  icons.resources.load = (path, _Type, done) => {
    calls++
    if (path.endsWith('/wolf')) throw Error('resource lookup failure')
    done(null, image)
  }
  assert.equal(art.draw(parent, 'a', 'boar', 0, 0, 0, 10, 18), 64)
  assert.equal(art.draw(parent, 'b', 'boar', 0, 0, 0, 10, 18), 64)
  for (let i = 0; i < 10; i++) assert.equal(art.draw(parent, 'c', 'wolf', 0, 0, 0, 10, 18), 0)
  assert.equal(calls, 2)
  assert.equal(image.refs, 1)
  art.destroy()
  assert.equal(image.refs, 0)
})

test('returning to camp before monster resources arrive cannot resurrect the battle', t => {
  const storage = disk(); seed(storage)
  const { game, icons } = launch(t, storage, { assisted: false })
  game.enterTraining(); game.run.advance(2)
  game.run.state.enemies.forEach((enemy, i) => { enemy.x = game.run.state.player.x + 80 + i * 35 })
  let fallbacks = 0
  const beast = game.beast.bind(game)
  game.beast = (...args) => { fallbacks++; beast(...args) }
  game.draw()
  assert.equal(fallbacks, game.run.state.enemies.length, 'pending images keep every beast visible')
  const layer = game.monsterLayer
  const requests = icons.requests.filter(r => r.path.startsWith('tower-monsters/'))
  assert.ok(requests.length)
  game.withdraw()
  requests.forEach(r => icons.complete(r))
  assert.equal(game.screen, 'camp')
  assert.equal(game.battle, null)
  assert.equal(game.monsterArt.actors.size, 0)
  assert.equal(layer.children.length, 0)
  assert.ok(!descendants(game.root).some(n => n.name.startsWith('妖兽素材-')))
})

test('real battle layers artwork below warnings and foreground, preserves state, and clears it on camp', t => {
  const storage = disk(); seed(storage)
  const { game, icons } = launch(t, storage, { assisted: false })
  game.enterTraining()
  game.run.advance(2)
  // Bring the real spawned wave into the camera to isolate presentation.
  game.run.state.enemies.forEach((enemy, i) => { enemy.x = game.run.state.player.x + 80 + i * 35 })
  game.run.pause()
  game.draw()
  const snapshot = game.run.snapshot()
  const requests = icons.requests.filter(r => r.path.startsWith('tower-monsters/'))
  assert.ok(requests.length > 0, 'training must expose visible supported enemies')
  requests.forEach(r => icons.complete(r))
  let fallbacks = 0
  const beast = game.beast.bind(game)
  game.beast = (...args) => { fallbacks++; beast(...args) }
  game.draw()
  assert.ok(game.monsterLayer.children.length > 0)
  assert.equal(fallbacks, 0, 'ready supported training beasts replace vector artwork')
  assert.deepEqual(game.run.snapshot(), snapshot, 'art cannot mutate radii, health, facing or attacks')
  const children = game.battle.children
  const index = n => children.indexOf(n)
  assert.ok(index(game.world.node) < index(game.monsterLayer))
  assert.ok(index(game.monsterLayer) < index(game.warnings.node))
  assert.ok(index(game.warnings.node) < index(game.foreground.node))
  assert.ok(index(game.foreground.node) < index(children.find(n => n.name === '妖兽名牌')))
  const oldLayer = game.monsterLayer, count = requests.length
  game.render()
  assert.equal(oldLayer.children.length, 0)
  assert.ok(game.monsterLayer.children.length > 0, 'pause redraw reuses cached resources')
  assert.equal(icons.requests.filter(r => r.path.startsWith('tower-monsters/')).length, count)
  const battleLayer = game.monsterLayer
  game.withdraw()
  assert.equal(game.screen, 'camp')
  assert.equal(game.monsterLayer, null)
  assert.equal(battleLayer.children.length, 0)
  assert.equal(game.monsterArt.actors.size, 0)
})
function button(game, caption) {
  // Only the top modal is interactive while an overlay is visible.
  const scope = game.overlay?.isValid ? game.overlay : game.root
  const matches = descendants(scope).filter(node => {
    if (!node.getComponent(Button)) return false
    const text = node.children.find(child => child.getComponent(Label))?.getComponent(Label).string
    return typeof caption === 'string' ? node.name === caption || text === caption || node.name === ({'暂停':'HUD.Pause','技能':'HUD.Skills','背包':'HUD.Inventory'}[caption]) : caption.test(node.name)
  })
  assert.equal(matches.length, 1, `expected one button: ${caption}; found ${matches.map(node => node.name)}`)
  return matches[0]
}
function press(game, caption) {
  if(caption === '开发者工具' && !descendants(game.root).some(n=>n.name===caption && n.getComponent(Button))) press(game,'设置')
  const node = button(game, caption)
  assert.equal(node.getComponent(Button).interactable, true, `button disabled: ${node.name}`)
  node.events.get(Button.EventType.CLICK)()
}
function hasLabel(root, text) {
  return descendants(root).some(node => node.getComponent(Label)?.string.includes(text))
}
function labelText(root) {
  return descendants(root).map(node => node.getComponent(Label)?.string || '').join('\n')
}
function ordinaryUnchanged(storage, original) {
  assert.equal(storage.getItem(campaign.TOWER_CAMPAIGN_KEY), original)
  assert.equal(storage.writes.filter(key => key === campaign.TOWER_CAMPAIGN_KEY).length, 0)
}

test('requested playtest stays read-only and never writes the ordinary save when the initial copy fails', t => {
  const storage = disk(), original = seed(storage)
  storage.blockedWrites.add(playtest.TOWER_PLAYTEST_KEY)
  const { game, tick } = launch(t, storage)
  assert.equal(game.playtest, true)
  assert.equal(game.store.readOnly, true)
  assert.equal(game.store.error, 'unreadable')
  assert.equal(game.menu.state.playtest, true)
  const result = game.action({ type: 'buyPill', id: 'peiyuan', count: 1 })
  assert.equal(result.ok, false)
  tick(6)
  ordinaryUnchanged(storage, original)
  assert.equal(storage.getItem(playtest.TOWER_PLAYTEST_KEY), null)
  press(game, '开发者工具')
  button(game, '重试打开体验档')
  button(game, '切回普通档')
  assert.ok(hasLabel(game.overlay, '体验档未打开'))
})

test('same-mode retry can recover a failed isolated copy without touching ordinary progress', t => {
  const storage = disk(), original = seed(storage)
  storage.blockedWrites.add(playtest.TOWER_PLAYTEST_KEY)
  const { game, location } = launch(t, storage)
  press(game, '开发者工具')
  press(game, '重试打开体验档')
  assert.equal(game.playtest, true)
  assert.equal(game.store.readOnly, true)
  assert.ok(hasLabel(game.overlay, '切换未完成'))
  ordinaryUnchanged(storage, original)
  press(game, '返回')
  storage.blockedWrites.clear()
  press(game, '开发者工具')
  press(game, '重试打开体验档')
  assert.equal(game.playtest, true)
  assert.equal(game.store.readOnly, false)
  assert.equal(new URLSearchParams(location.search).get('playtest'), '1')
  assert.ok(hasLabel(game.overlay, '开发者工具'))
  press(game, '返回宗门')
  press(game, '丹霞峰')
  press(game, '购买一颗 · 5贡献')
  assert.equal(game.store.state.contribution, 295)
  assert.equal(game.store.state.pills.huichun, 4)
  ordinaryUnchanged(storage, original)
})

test('ordinary progress becomes writable only after an explicit switch from the failed playtest', t => {
  const storage = disk(), original = seed(storage)
  storage.blockedWrites.add(playtest.TOWER_PLAYTEST_KEY)
  const { game, location } = launch(t, storage)
  ordinaryUnchanged(storage, original)
  press(game, '开发者工具')
  press(game, '切回普通档')
  assert.equal(game.playtest, false)
  assert.equal(game.store.readOnly, false)
  assert.equal(new URLSearchParams(location.search).has('playtest'), false)
  press(game, '丹霞峰')
  press(game, '购买一颗 · 5贡献')
  assert.equal(new campaign.TowerCampaignStore(storage, START).state.contribution, 295)
  assert.equal(storage.getItem(playtest.TOWER_PLAYTEST_KEY), null)
})

for (const assisted of [false, true]) {
  test(`successful sync re-enables current-page buttons and clamps obsolete scroll (${assisted ? 'playtest' : 'ordinary'})`, t => {
    const storage = disk(), original = seed(storage)
    const { game, tick } = launch(t, storage, { assisted })
    press(game, '丹霞峰')
    game.menu.scroll.scrollToOffset(new Vec2(0, 150), 0)
    const key = assisted ? playtest.TOWER_PLAYTEST_KEY : campaign.TOWER_CAMPAIGN_KEY
    storage.blockedWrites.add(key)
    tick(6)
    assert.equal(game.menu.state.readOnly, true)
    const disabled = button(game, '购买一颗 · 5贡献')
    assert.equal(disabled.getComponent(Button).interactable, false)
    storage.blockedWrites.clear()
    tick(6)
    assert.equal(game.page, 'pills')
    assert.equal(game.menu.state.readOnly, false)
    assert.equal(game.menu.state.playtest, assisted)
    assert.equal(game.menu.scroll.getScrollOffset().y, 0)
    assert.equal(game.menu.scroll.vertical, false)
    assert.ok(hasLabel(game.menu.root, '保存已恢复'))
    assert.equal(button(game, '购买一颗 · 5贡献').getComponent(Button).interactable, true)
    const before = copy(game.store.state)
    disabled.events.get(Button.EventType.CLICK)()
    assert.deepEqual(game.store.state, before, 'the old disabled callback cannot spend after recovery')
    press(game, '购买一颗 · 5贡献')
    assert.equal(game.store.state.contribution, before.contribution - 5)
    assert.equal(game.store.state.pills.huichun, before.pills.huichun + 1)
    if (assisted) ordinaryUnchanged(storage, original)
  })
}

test('playtest identity survives partial healing, full-HP redraw, and local skill-detail navigation', t => {
  const storage = disk(), original = seed(storage, { hp: 99.75 })
  const { game, tick } = launch(t, storage)
  press(game, '技能')
  tick(6)
  assert.ok(game.store.state.hp > 99.75 && game.store.state.hp < 100)
  assert.equal(game.menu.state.playtest, true)
  press(game, '技能节点-magnet')
  assert.equal(game.menu.detailId, 'magnet')
  assert.ok(descendants(game.menu.root).some(node => node.name === '技能详情固定栏'))
  assert.ok(hasLabel(game.menu.root, '技能 · 体验档'))
  tick(12)
  assert.equal(game.store.state.hp, 100)
  assert.equal(game.menu.state.playtest, true)
  assert.equal(game.menu.detailId, 'magnet', 'healing redraw preserves the selected skill')
  assert.ok(hasLabel(game.menu.root, '技能 · 体验档'))
  ordinaryUnchanged(storage, original)
})

test('skill page hides battle vitals and keeps rank hints below icons', t => {
  const storage = disk(), original = seed(storage, { hp: 50 })
  const { game } = launch(t, storage)
  press(game, '技能')
  const root = game.menu.root
  const text = labelText(root)
  assert.doesNotMatch(text, /妖丹解锁功法|贡献用于|上下\/左右|九阶段|角色Lv\./)
  assert.equal(descendants(root).some(node => node.name === 'HUD.PlayerVitals'), false)
  const icon = named(root, '技能图标-sj_arc')
  const badge = named(root, '技能等级-sj_arc')
  assert.ok(rectWithin(badge, icon).top < -48, 'rank must not overlap the circular artwork')
  assert.equal(named(root, '技能前置连线').getComponent(Graphics).segments.length, 0)
  game.enterFloor(1)
  for (const name of ['HUD.Portrait', 'HUD.HPBar', 'HUD.PaperArtwork', 'HUD.RealmLabel']) assert.ok(named(game.root, name))
  ordinaryUnchanged(storage, original)
})

for (const blocked of [false, true]) {
  test(`host resets obsolete schema3 exactly once (${blocked ? 'save failure stays read-only' : 'successful save'})`, t => {
    const storage = disk()
    seed(storage)
    const envelope = JSON.parse(storage.getItem(campaign.TOWER_CAMPAIGN_KEY))
    const legacy = JSON.parse(envelope.data)
    const expectedFresh = copy(legacy)
    delete legacy.spiritStones
    legacy.cores = 37
    legacy.xp = 630
    legacy.contribution = 75
    legacy.skills.sj_yujian = 3
    envelope.schema = 3
    envelope.data = JSON.stringify(legacy)
    envelope.checksum = checksum(envelope.data)
    const original = JSON.stringify(envelope)
    storage.data.set(campaign.TOWER_CAMPAIGN_KEY, original)
    storage.writes.length = 0
    if (blocked) storage.blockedWrites.add(campaign.TOWER_CAMPAIGN_KEY)
    const { game } = launch(t, storage, { assisted: false })
    assert.equal(game.store.readOnly, blocked)
    assert.equal(game.store.state.spiritStones, 500, 'obsolete balances are discarded, not converted or compensated')
    assert.equal(game.store.state.contribution, 300)
    assert.equal(game.store.state.xp, 0)
    assert.equal(Object.hasOwn(game.store.state, 'cores'), false)
    assert.deepEqual(game.store.state, expectedFresh, 'reset restores the complete new-game state')
    if (blocked) {
      assert.equal(game.store.error, 'save-failed')
      assert.equal(game.store.migrationReport, null, 'failed reset is not reported as committed')
      assert.equal(game.action({ type: 'drawWeapon' }).ok, false)
      assert.deepEqual(game.store.state, expectedFresh)
      assert.equal(storage.getItem(campaign.TOWER_CAMPAIGN_KEY), original)
      assert.equal(storage.writes.length, 0)
    } else {
      assert.deepEqual(game.store.migrationReport, { reset: true, fromSchema: 3 })
      const saved = JSON.parse(storage.getItem(campaign.TOWER_CAMPAIGN_KEY))
      assert.equal(saved.schema, currentCampaignSchema)
      assert.equal(saved.checksum, checksum(saved.data))
      assert.deepEqual(JSON.parse(saved.data), expectedFresh)
      const writes = storage.writes.length
      const reloaded = new campaign.TowerCampaignStore(storage, START)
      assert.equal(reloaded.readOnly, false)
      assert.equal(reloaded.migrationReport, null)
      assert.deepEqual(reloaded.state, game.store.state)
      assert.equal(storage.writes.length, writes, 'reopening schema5 must not reset again')
    }
  })
}

test('economy v2 hides the wallet on hall and skills but shows it in relevant pages', t => {
  const storage = disk(), original = seed(storage)
  const { game } = launch(t, storage)
  const headerText = () => game.menu.root.children.map(node => node.getComponent(Label)?.string || '').join('\n')
  assert.doesNotMatch(headerText(), /灵石|贡献/)
  press(game, '技能')
  assert.doesNotMatch(headerText(), /灵石|贡献/)
  game.goto('home')
  const wallet = descendants(game.menu.root).find(n => n.name === '货币信息')
  assert.ok(wallet)
  assert.equal(descendants(wallet).filter(n=>n.getComponent(Label)).map(n=>n.getComponent(Label).string).join('\n'), '×5\n×300')
  const text = labelText(game.menu.root)
  assert.match(text, /妖丹 → 修为/)
  assert.match(text, /不存入钱包/)
  game.goto('gate')
  assert.match(labelText(game.menu.root), /500下品灵石/)
  ordinaryUnchanged(storage, original)
})

for (const patch of [{ spiritStones: 99 }, { contribution: 99 }]) {
  test(`weapon draw rejects insufficient ${Object.keys(patch)[0]} without any state or save change`, t => {
    const storage = disk(), original = seed(storage, { patch })
    const { game } = launch(t, storage)
    press(game, '炼器峰')
    const before = game.store.state, raw = storage.getItem(playtest.TOWER_PLAYTEST_KEY)
    const writes = storage.writes.length
    press(game, '炼器主殿')
    assert.strictEqual(game.store.state, before, 'opening and selecting do not spend or roll')
    const control = button(game, '凡器武器抽取一次')
    assert.match(labelText(game.menu.root), /费用不足/)
    assert.equal(control.getComponent(Button).interactable, false)
    control.events.get(Button.EventType.CLICK)()
    assert.strictEqual(game.store.state, before)
    assert.equal(game.action({ type: 'drawWeapon' }).ok, false, 'business gate also rejects a direct request')
    assert.deepEqual(game.store.state, before)
    assert.equal(storage.getItem(playtest.TOWER_PLAYTEST_KEY), raw)
    assert.equal(storage.writes.length, writes)
    ordinaryUnchanged(storage, original)
  })
}

test('weapon draw atomically pays 100 stones and contribution and preserves the rolled instance', t => {
  const storage = disk(), original = seed(storage)
  const { game } = launch(t, storage)
  press(game, '炼器峰')
  const before = copy(game.store.state), raw = storage.getItem(playtest.TOWER_PLAYTEST_KEY)
  const writes = storage.writes.length
  const previewStorage = disk()
  previewStorage.data.set(campaign.TOWER_CAMPAIGN_KEY, raw)
  const preview = new campaign.TowerCampaignStore(previewStorage, START)
  const expected = preview.act({ type: 'drawWeapon' }, START)
  assert.ok(expected.ok)
  press(game, '炼器主殿')
  assert.deepEqual(game.store.state, before, 'selection must not consume either currency or RNG')
  assert.equal(storage.getItem(playtest.TOWER_PLAYTEST_KEY), raw)
  assert.equal(storage.writes.length, writes)
  storage.blockedWrites.add(playtest.TOWER_PLAYTEST_KEY)
  const staleConfirm = button(game, '凡器武器抽取一次').events.get(Button.EventType.CLICK)
  press(game, '凡器武器抽取一次')
  assert.deepEqual(game.store.state, before, 'failed save cannot publish wallet, weapon, pity or RNG changes')
  assert.equal(storage.getItem(playtest.TOWER_PLAYTEST_KEY), raw)
  assert.equal(storage.writes.length, writes)
  assert.ok(named(game.menu.root, '炼制选择面板'), 'save failure keeps choices available for retry')
  assert.equal(descendants(game.menu.root).some(node => node.name === '炼制结果卡'), false)
  storage.blockedWrites.clear()
  staleConfirm()
  assert.deepEqual(game.store.state, before, 'failed-render callback cannot submit another transaction')
  assert.equal(storage.writes.length, writes)
  press(game, '凡器武器抽取一次')
  assert.equal(game.store.state.spiritStones, before.spiritStones - 100)
  assert.equal(game.store.state.contribution, before.contribution - 100 + expected.draw.refund)
  assert.deepEqual(game.store.state, preview.state, 'retry produces the same draw as one successful transaction')
  assert.equal(storage.writes.length, writes + 1)
  assert.ok(named(game.menu.root, '炼制结果卡'))
  assert.ok(labelText(game.menu.root).includes(expected.draw.name.split('·').at(-1)))
  const committed = game.store.state
  press(game, '返回炼器峰-左')
  staleConfirm()
  assert.strictEqual(game.store.state, committed, 'closing the result or replaying a stale callback cannot draw again')
  assert.equal(storage.writes.length, writes + 1)
  ordinaryUnchanged(storage, original)
})

test('skill pane uses shared weapon damage once after equipping an affix instance', t => {
  const storage = disk();
  const weapon = weaponTools.rollWeapon('fan', 1, () => .5, 'weapon-1');
  const original = seed(storage, { patch: {
    weaponSequence: 1, weaponCounters: { iron: 0, 'weapon-1': 0 },
    weapons: { iron: weaponTools.createIronWeapon(), 'weapon-1': weapon },
    loadouts: ['配装一', '配装二', '配装三'].map(name => ({
      name, weaponId: 'weapon-1', armorId: 'basic-armor', ringId: 'basic-ring', active: ['sj_yujian'], passive: [], evolutions: [],
    })),
  } });
  const { game } = launch(t, storage);
  press(game, '技能');
  game.menu.openDetails('sj_yujian');
  const info = skillPresentation(game.store.state, 'sj_yujian');
  const damage = info.stats.find(row => row.key === 'roundDamage').value;
  const displayed = String(Math.round(damage * 10) / 10);
  assert.ok(labelText(game.menu.root).includes(`每剑伤害：${displayed}`));
  ordinaryUnchanged(storage, original);
});

test('first special skill book costs 200 stones atomically and subsequent ranks do not rebuy it', t => {
  const storage = disk(), original = seed(storage, { patch: {
    ...investedSkillFixture(), spiritStones: 200, skills: { ...growth.giftSkills(3), sj_arc: 2 }, books: [],
  } })
  const { game } = launch(t, storage)
  press(game, '技能')
  press(game, '技能节点-sj_line')
  assert.equal(growth.skillRequirement(game.store.state, 'sj_line').bookCost, 200)
  assert.ok(labelText(game.menu.root).includes('经卷所需：'))
  const before = copy(game.store.state), raw = storage.getItem(playtest.TOWER_PLAYTEST_KEY)
  const writes = storage.writes.length
  storage.blockedWrites.add(playtest.TOWER_PLAYTEST_KEY)
  press(game, 'learnSkill-sj_line')
  assert.deepEqual(game.store.state, before)
  assert.equal(storage.getItem(playtest.TOWER_PLAYTEST_KEY), raw)
  assert.equal(storage.writes.length, writes)
  storage.blockedWrites.clear()
  press(game, 'learnSkill-sj_line')
  assert.equal(game.store.state.spiritStones, 0)
  assert.equal(game.store.state.skills.sj_line, 1)
  assert.ok(game.store.state.books.includes('sj_line'))
  assert.equal(growth.growthSummary(game.store.state).spent, growth.growthSummary(before).spent + 2)
  press(game, 'learnSkill-sj_line')
  assert.equal(game.store.state.spiritStones, 0)
  assert.equal(game.store.state.skills.sj_line, 2)
  assert.equal(game.store.state.contribution, before.contribution)
  ordinaryUnchanged(storage, original)
})

test('three research purchases cost 800/1600/2400 stones and failed saves grant no points', t => {
  const storage = disk(), original = seed(storage, { patch: { clearedFloor: 9, spiritStones: 4800 } })
  const { game } = launch(t, storage)
  press(game, '技能')
  press(game, '获取技能点')
  for (const [index, cost] of [800, 1600, 2400].entries()) {
    const caption = `研习 · ${economy.formatSpiritStones(cost)}灵石换1点`
    const before = copy(game.store.state), raw = storage.getItem(playtest.TOWER_PLAYTEST_KEY)
    const writes = storage.writes.length
    storage.blockedWrites.add(playtest.TOWER_PLAYTEST_KEY)
    press(game, caption)
    assert.deepEqual(game.store.state, before)
    assert.equal(storage.getItem(playtest.TOWER_PLAYTEST_KEY), raw)
    assert.equal(storage.writes.length, writes)
    storage.blockedWrites.clear()
    press(game, caption)
    assert.equal(game.store.state.spiritStones, before.spiritStones - cost)
    assert.equal(game.store.state.researchPurchases, index + 1)
    assert.equal(growth.growthSummary(game.store.state).available, growth.growthSummary(before).available + 1)
    assert.equal(game.store.state.contribution, before.contribution)
    assert.equal(storage.writes.length, writes + 1)
  }
  assert.equal(game.store.state.spiritStones, 0)
  assert.equal(button(game, '三次研习已完成').getComponent(Button).interactable, false)
  ordinaryUnchanged(storage, original)
})

test('manual healing works after sync recovery and a failed pill save consumes neither HP nor inventory', t => {
  const storage = disk(), original = seed(storage, { hp: 17.5 })
  const { game, tick } = launch(t, storage)
  press(game, '背包')
  press(game, '丹药')
  press(game, '背包物品-huichun')
  storage.blockedWrites.add(playtest.TOWER_PLAYTEST_KEY)
  tick(6)
  storage.blockedWrites.clear()
  tick(6)
  const before = copy(game.store.state)
  const healingButton = () => button(game, '服用一颗')
  assert.equal(healingButton().getComponent(Button).interactable, true)
  storage.blockedWrites.add(playtest.TOWER_PLAYTEST_KEY)
  healingButton().events.get(Button.EventType.CLICK)()
  assert.deepEqual(game.store.state, before)
  storage.blockedWrites.clear()
  healingButton().events.get(Button.EventType.CLICK)()
  assert.equal(game.store.state.hp, Math.min(100, before.hp + 50))
  assert.equal(game.store.state.pills.huichun, before.pills.huichun - 1)
  ordinaryUnchanged(storage, original)
})

test('actual tool buttons preserve paused snapshots and HP, and preferences do not publish on save failure', t => {
  const storage = disk()
  seed(storage, { hp: 17.5, paused: true })
  const { game } = launch(t, storage)
  const before = game.run.snapshot()
  press(game, '开发者工具')
  press(game, '游戏速度设置')
  storage.blockedWrites.add(playtest.TOWER_PLAYTEST_TOOLS_KEY)
  press(game, '游戏速度 ×2')
  assert.ok(hasLabel(game.overlay, '设置未保存'))
  assert.deepEqual(copy(game.tools), { speed: 1, invincible: false })
  assert.deepEqual(game.run.snapshot(), before)
  storage.blockedWrites.clear()
  press(game, '返回工具')
  press(game, '游戏速度设置')
  press(game, '游戏速度 ×2')
  press(game, '无敌：关闭')
  assert.deepEqual(copy(game.tools), { speed: 2, invincible: true })
  assert.deepEqual(game.run.snapshot(), before)
  press(game, '游戏速度设置')
  press(game, '游戏速度 ×3')
  press(game, '无敌：开启')
  assert.deepEqual(game.run.snapshot(), before)
  assert.deepEqual(playtest.readPlaytestTools(storage), { speed: 3, invincible: false })
  press(game, '切回普通档')
  assert.equal(game.playtest, false)
  assert.deepEqual(game.run.snapshot(), before)
  press(game, '开发者工具')
  press(game, '进入独立体验档')
  assert.equal(game.playtest, true)
  assert.deepEqual(game.run.snapshot(), before)
  press(game, '返回战斗')
  assert.equal(game.run.state.phase, 'playing')
  assert.equal(game.run.state.player.hp, 17.5)
})

test('a failed pause checkpoint blocks switching until the real retry button commits it', t => {
  const storage = disk(), original = seed(storage, { hp: 17.5, paused: true })
  const { game } = launch(t, storage)
  press(game, '继续挑战')
  storage.blockedWrites.add(playtest.TOWER_PLAYTEST_KEY)
  press(game, '暂停')
  assert.ok(game.pending)
  assert.ok(hasLabel(game.overlay, '保存尚未完成'))
  const store = game.store
  game.switchPlaytest(false)
  assert.equal(game.store, store)
  assert.equal(game.playtest, true)
  ordinaryUnchanged(storage, original)
  storage.blockedWrites.clear()
  press(game, '重试保存')
  assert.equal(game.pending, null)
  assert.equal(game.run.state.phase, 'paused')
  assert.equal(game.store.state.activeRun.snapshot.phase, 'paused')
  assert.equal(game.run.state.player.hp, 17.5)
  press(game, '开发者工具')
  button(game, '切回普通档')
})

// Exercise actual spawns, damage and loot; only positions and the existing
// playtest assist shorten combat. Pause/withdraw/finish still go through the host.
function advanceCombat(game, ready) {
  // Consume the host's entry-frame pause before driving the real Run directly.
  game.update(0)
  const run = game.run
  run.setPlaytestAssist(true)
  for (let frame = 0; frame < 80000 && !ready(run.state) && run.state.phase === 'playing'; frame++) {
    for (const enemy of run.state.enemies) {
      enemy.x = run.state.player.x + 60
      enemy.y = run.state.player.y
    }
    run.advance(1 / 30)
  }
  assert.ok(ready(run.state), `combat stopped at ${run.state.phase}, wave ${run.state.wave}`)
  const snapshot = run.snapshot()
  assert.equal(validateTowerSnapshot(snapshot), true)
  return snapshot
}

for (const headroom of [0, 1, 10]) {
  test(`paused and withdrawn loot displays only the ${headroom} credited spirit stones near the wallet cap`, t => {
    const storage = disk()
    seed(storage, { patch: { spiritStones: economy.STONE_CAP - headroom } })
    const { game } = launch(t, storage, { assisted: false })
    game.enterFloor(1)
    const snapshot = advanceCombat(game, state => economy.legacyRewardToStones(state.earned.cores) > headroom)
    assert.equal(snapshot.phase, 'playing')
    const rawValue = economy.legacyRewardToStones(snapshot.earned.cores)

    press(game, '暂停')
    assert.equal(game.pending, null)
    assert.equal(game.store.state.spiritStones, economy.STONE_CAP)
    assert.equal(game.store.state.activeRun.snapshot.phase, 'paused')
    const pause = labelText(game.overlay)
    assert.doesNotMatch(pause, /本次获得|药材|灵石|入账|自动出售/)
    assert.match(pause, /继续挑战/)
    assert.equal(pause.includes('undefined'), false)

    const pausedReload = new campaign.TowerCampaignStore(storage, START)
    assert.equal(pausedReload.readOnly, false)
    assert.equal(pausedReload.state.spiritStones, economy.STONE_CAP)
    assert.deepEqual(pausedReload.state.activeRun.snapshot, game.store.state.activeRun.snapshot)

    press(game, '返回宗门')
    assert.equal(game.pending, null)
    assert.equal(game.store.state.activeRun, null)
    assert.equal(game.store.state.lastResult.outcome, 'abandoned')
    assert.equal(game.store.state.lastResult.earned.spiritStones, headroom)
    assert.equal(game.store.state.lastResult.stoneLoot, undefined)
    const result = labelText(game.overlay)
    assert.match(result, new RegExp(`实际入账：修为 \\d+ · 灵石 ${economy.formatSpiritStones(headroom)} ·`))
    assert.ok(result.includes(`${economy.formatSpiritStones(rawValue - headroom)}未入账`))
    assert.equal(result.includes('已自动入账'), false)
    assert.deepEqual(new campaign.TowerCampaignStore(storage, START).state.lastResult, game.store.state.lastResult)
  })
}

test('capped floor-three first-clear popup excludes skill points from stone overflow', t => {
  const storage = disk()
  seed(storage, { patch: {
    spiritStones: economy.STONE_CAP - economy.legacyRewardToStones(1), clearedFloor: 2, xp: 10920, tutorialWaves: 3,
    skills: { sj_yujian: 1, sj_arc: 1, sj_wanjian: 1 },
  } })
  const { game } = launch(t, storage, { assisted: false })
  game.enterFloor(3)
  const snapshot = advanceCombat(game, state => state.phase === 'won')
  const killValue = snapshot.killLedger.reduce((sum, kill) => sum + loot.CORE_RANK_VALUES[kill.coreRank], 0)
  assert.equal(snapshot.earned.cores, killValue + 10, 'floor-three boss-clear award')
  game.update(0)

  assert.equal(game.pending, null)
  assert.equal(game.run, null)
  const result = game.store.state.lastResult
  assert.equal(result.firstClear, true)
  assert.equal(result.earned.spiritStones, 10)
  assert.equal(result.earned.contribution, 110, '110 combat contribution; first clear gives a skill point')
  assert.equal(game.store.state.spiritStones, economy.STONE_CAP)
  const popup = labelText(game.overlay)
  assert.ok(popup.includes('实际入账：修为 0 · 灵石 10下品 · 贡献 110'))
  assert.ok(popup.includes(`${economy.formatSpiritStones(economy.legacyRewardToStones(killValue + 9))}未入账`), 'kill loot + 100-stone clear award minus ten credited stones')
  assert.ok(popup.includes('首通奖励已结算，包含在以上收益中'))
  assert.equal(popup.includes('已自动入账'), false)
  assert.equal(popup.includes('首通另获'), false)
  assert.deepEqual(new campaign.TowerCampaignStore(storage, START).state.lastResult, result)
})

test('host refund preview and committed cascade show concrete skill names and ranks without undefined fields', t => {
  const storage = disk()
  seed(storage, { patch: {
    xp: 10920, clearedFloor: 9, tutorialWaves: 3, researchPurchases: 3,
    skills: { sj_yujian: 1, sj_arc: 2, sj_wanjian: 1, sj_line: 6, sj_mark: 4 },
    books: ['sj_line', 'sj_mark', 'evo_tiandi'],
    evolutionRanks: { evo_tiandi: 1 }, evolutions: ['evo_tiandi'],
  } })
  const { game } = launch(t, storage, { assisted: false })
  press(game, '技能')
  press(game, '技能节点-sj_line')
  const preview = labelText(game.menu.root).replace(/\s/g, '')
  assert.ok(!preview.includes('点−退点预览'), 'default skill description contains no refund clutter')
  assert.doesNotMatch(preview, /undefined|NaN|未装备/)

  const before = game.store.state
  const staleClick = button(game, 'decreaseSkill-sj_line').events.get(Button.EventType.CLICK)
  press(game, 'decreaseSkill-sj_line')
  assert.equal(game.store.state.skills.sj_arc, 2)
  assert.equal(game.store.state.skills.sj_line, 5)
  assert.equal(game.store.state.evolutionRanks.evo_tiandi, 1)
  assert.equal(game.store.state.skills.sj_mark, 4)
  assert.equal(game.store.state.spiritStones, before.spiritStones)
  assert.deepEqual(game.store.state.books, before.books)
  const feedback = labelText(game.menu.root).replace(/\s/g, '')
  assert.ok(feedback.includes('已保存：返还2点'))
  assert.ok(feedback.includes('剑破虚空6→5级'))
  assert.ok(!feedback.includes('一剑开天1→0级'))
  assert.doesNotMatch(feedback, /undefined|NaN|未装备/)
  const committed = game.store.state
  staleClick()
  assert.strictEqual(game.store.state, committed, 'a callback from the previous tree cannot act again')
  assert.deepEqual(new campaign.TowerCampaignStore(storage, START).state, committed)
  // This VM checks the host contract, not Creator's Babel iterator transform;
  // the parent still verifies Array.from(changes.values()) in the browser build.
})

// Independent UI expectations from the V2.1 nine-stage design. The production
// tables still supply quotes and transactions; no test-only menu is rendered.
const stageRows = [
  ['lianqi-early', '炼气·初期', ['sj_yujian', 'sj_arc', 'sj_wanjian']],
  ['lianqi-middle', '炼气·中期', ['vajra', 'magnet']],
  ['lianqi-peak', '炼气·巅峰', ['sj_heart', 'sj_cross']],
  ['zhuji-early', '筑基·初期', ['sj_line', 'sj_shadow', 'sj_formation', 'sj_flight']],
  ['zhuji-middle', '筑基·中期', ['sj_mark', 'sj_bone']],
  ['zhuji-peak', '筑基·巅峰', ['sj_gate']],
  ['jindan-early', '金丹·初期', ['evo_wanjian']],
  ['jindan-middle', '金丹·中期', ['evo_tiandi', 'evo_wuwo']],
  ['jindan-peak', '金丹·巅峰', ['evo_sixiang']],
  ['yuanying-early', '元婴·初期', ['future_taixu']],
  ['yuanying-middle', '元婴·中期', ['future_yingling']],
  ['yuanying-peak', '元婴·巅峰', ['future_xinghe']],
  ['huashen-early', '化神·初期', ['future_shenxiao']],
  ['huashen-middle', '化神·中期', ['future_shenshi']],
  ['huashen-peak', '化神·巅峰', ['future_qianying']],
  ['lianxu-early', '炼虚·初期', ['future_liexu']],
  ['lianxu-middle', '炼虚·中期', ['future_xubu']],
  ['lianxu-peak', '炼虚·巅峰', ['future_duankong']],
]
function named(root, name) {
  const matches = descendants(root).filter(node => node.name === name)
  assert.equal(matches.length, 1, `expected one scene node: ${name}`)
  return matches[0]
}
function rectWithin(node, ancestor) {
  const { width, height } = node.getComponent(UITransform).contentSize
  const anchor = node.getComponent(UITransform).anchor || { x: .5, y: .5 }
  const corners = [[-width * anchor.x, -height * anchor.y], [width * (1 - anchor.x), height * (1 - anchor.y)]]
  for (const point of corners) {
    let current = node
    while (current && current !== ancestor) {
      point[0] = point[0] * (current.scale?.x ?? 1) + (current.position?.x || 0)
      point[1] = point[1] * (current.scale?.y ?? 1) + (current.position?.y || 0)
      current = current.parent
    }
    assert.strictEqual(current, ancestor)
  }
  return { left: Math.min(...corners.map(p => p[0])), right: Math.max(...corners.map(p => p[0])),
    bottom: Math.min(...corners.map(p => p[1])), top: Math.max(...corners.map(p => p[1])) }
}
function investedSkillFixture() {
  return {
    xp: 10920, clearedFloor: 9, tutorialWaves: 3, researchPurchases: 3,
    skills: { sj_yujian: 1, sj_arc: 2, sj_wanjian: 1, sj_line: 1 }, books: ['sj_line'],
  }
}

for (const scenario of [
  { name: 'realm cap with spare points', id: 'sj_yujian', patch: { xp: 720, clearedFloor: 9, researchPurchases: 3, skills: { sj_yujian: 9 } }, level: 9, reason: 'realm-locked' },
  { name: 'no points below cap', id: 'sj_yujian', patch: { xp: 45, tutorialWaves: 3,
    skills: { sj_yujian: 1, sj_arc: 1 } }, level: 1, reason: 'insufficient-points' },
  { name: 'stage locked', id: 'vajra', patch: { xp: 45 }, level: 0, reason: 'stage-locked' },
  { name: 'no tutorial gate', id: 'sj_wanjian', patch: { xp: 630 }, level: 0, reason: undefined },
  { name: 'no prerequisite gate', id: 'evo_wanjian', patch: { xp: 10920, spiritStones: 10000, clearedFloor: 9, tutorialWaves: 3, skills: growth.giftSkills(3) }, level: 0, reason: undefined },
  { name: 'unlocked first rank', id: 'vajra', patch: { xp: 630 }, level: 0, reason: undefined },
  { name: 'current rank can grow', id: 'sj_yujian', patch: { xp: 630, skills: { sj_yujian: 2 } }, level: 2, reason: undefined },
  { name: 'absolute maximum', id: 'sj_yujian', patch: { xp: 10920, skills: { sj_yujian: 10 } }, level: 10, reason: 'max-level' },
]) {
  test(`skill arrow follows purchase eligibility: ${scenario.name}`, t => {
    const storage = disk(), original = seed(storage, { patch: scenario.patch })
    const { game } = launch(t, storage)
    press(game, '技能')
    press(game, `技能节点-${scenario.id}`)
    const quote = growth.skillRequirement(game.store.state, scenario.id)
    assert.equal(quote.reason, scenario.reason, 'fixture must exercise the intended gate')
    if (scenario.name === 'realm cap with spare points') {
      assert.ok(growth.growthSummary(game.store.state).available > 0)
      assert.equal(growth.rankCap(scenario.id, game.store.state.xp), 9)
      // Rank ten opens at the next realm phase.
      assert.equal(growth.skillRequirement({ ...game.store.state, xp: 1484 }, scenario.id).reason, 'realm-locked')
      assert.equal(growth.skillRequirement({ ...game.store.state, xp: 1485 }, scenario.id).ok, true)
    }
    if (scenario.name === 'no points below cap') {
      assert.equal(growth.growthSummary(game.store.state).available, 0)
      assert.equal(growth.rankCap(scenario.id, game.store.state.xp), 3)
      assert.ok(scenario.level < growth.rankCap(scenario.id, game.store.state.xp))
    }
    const icon = named(game.menu.root, `技能图标-${scenario.id}`)
    const badge = named(icon, `技能等级-${scenario.id}`)
    const numeral = descendants(badge).find(node => node.getComponent(Label)).getComponent(Label)
    assert.equal(numeral.string, String(scenario.level))
    assert.equal(numeral.horizontalAlign, Label.HorizontalAlign.CENTER)
    assert.equal(numeral.node.position.x, 0)
    const hints = descendants(icon).filter(node => node.name === `技能可升级-${scenario.id}`)
    assert.equal(hints.length, scenario.reason ? 0 : 1)
    assert.equal(button(game, `learnSkill-${scenario.id}`).getComponent(Button).interactable, !scenario.reason)
    if (hints.length) {
      const hint = hints[0], label = descendants(hint).find(node => node.getComponent(Label)).getComponent(Label)
      assert.equal(label.string, '↑')
      assert.equal(label.color.r, '#2878B8')
      assert.equal(hint.position.y, badge.position.y, 'arrow shares the rank baseline')
      assert.equal(rectWithin(hint, icon).right, 40, 'arrow sits after the centered level')
      assert.ok(rectWithin(hint, icon).left > rectWithin(badge, icon).right, 'arrow cannot overlap the numeral')
      assert.equal(hint.getComponent(Button), null)
    }
    ordinaryUnchanged(storage, original)
  })
}

test('skill arrow disappears at the realm cap after purchase and returns after refund', t => {
  const storage = disk(), original = seed(storage, { patch: { xp: 630, skills: { sj_yujian: 3 } } })
  const { game } = launch(t, storage)
  press(game, '技能')
  assert.ok(named(game.menu.root, '技能可升级-sj_yujian'))
  press(game, 'learnSkill-sj_yujian')
  assert.equal(game.store.state.skills.sj_yujian, 4)
  assert.equal(growth.skillRequirement(game.store.state, 'sj_yujian').reason, 'realm-locked')
  assert.ok(growth.growthSummary(game.store.state).available > 0)
  assert.ok(!descendants(game.menu.root).some(node => node.name === '技能可升级-sj_yujian'))
  assert.equal(labelText(named(game.menu.root, '技能等级-sj_yujian')).trim(), '4')
  press(game, 'decreaseSkill-sj_yujian')
  assert.equal(game.store.state.skills.sj_yujian, 3)
  assert.equal(growth.skillRequirement(game.store.state, 'sj_yujian').ok, true)
  assert.ok(named(game.menu.root, '技能可升级-sj_yujian'))
  assert.equal(labelText(named(game.menu.root, '技能等级-sj_yujian')).trim(), '3')
  ordinaryUnchanged(storage, original)
})

test('dependency connections remain stable across learning and refund without mutating saved state', t => {
  const storage = disk(), original = seed(storage, { patch: investedSkillFixture() })
  const { game } = launch(t, storage)
  press(game, '技能')
  const connections = () => copy(named(game.menu.root, '技能前置连线').getComponent(Graphics).segments)
  const before = connections()
  assert.equal(before.length, 0)
  press(game, '技能节点-sj_heart')
  press(game, 'learnSkill-sj_heart')
  assert.equal(game.store.state.skills.sj_heart, 1)
  assert.deepEqual(connections(), before, 'learning does not remove a real dependency edge')
  press(game, 'decreaseSkill-sj_heart')
  assert.equal(game.store.state.skills.sj_heart || 0, 0)
  assert.deepEqual(connections(), before, 'refund does not invent new dependency edges')
  ordinaryUnchanged(storage, original)
})

function assertFooter(game) {
  const pane = named(game.menu.root, '技能详情固定栏');
  const footer = named(pane, '技能详情底部工具栏');
  assert.strictEqual(footer.parent, pane);
  const bounds = rectWithin(footer, pane);
  const viewport = rectWithin(named(pane, '技能详情独立卷轴'), pane);
  assert.equal(bounds.bottom, -pane.getComponent(UITransform).contentSize.height / 2);
  assert.equal(bounds.top - bounds.bottom, 120);
  assert.ok(viewport.bottom >= bounds.top, 'scroll viewport never covers the toolbar');
  assert.ok(viewport.top <= pane.getComponent(UITransform).contentSize.height / 2 - 98);
  const id = game.menu.detailId;
  const plus = button(game, `learnSkill-${id}`);
  assert.strictEqual(plus.parent, footer);
  assert.deepEqual(plus.getComponent(UITransform).contentSize, { width: 224, height: 64 });
  assert.deepEqual(named(plus, `技能增减底-learnSkill-${id}`).getComponent(UITransform).contentSize,
    { width: 212, height: 48 });
  const rank = game.store.state.skills[id] ?? game.store.state.evolutionRanks[id] ?? 0;
  const skill = [...growth.GROWTH_SKILLS, ...growth.GROWTH_EVOLUTIONS].find(row => row.id === id);
  assert.equal(labelText(plus).trim(), rank >= skill.maxLevel ? '已满级' : rank ? `升至 ${rank + 1} 级` : '修习功法');
  assert.ok(labelText(named(footer, '技能修习条件')).trim(), 'cost or unavailability reason stays visible');
  const rects = { footer: rectWithin(footer, game.menu.root), plus: rectWithin(plus, game.menu.root) };
  if (!game.store.state.activeRun) {
    const minus = button(game, `decreaseSkill-${id}`);
    assert.strictEqual(minus.parent, footer);
    assert.deepEqual(minus.getComponent(UITransform).contentSize, { width: 96, height: 64 });
    assert.deepEqual(named(minus, `技能增减底-decreaseSkill-${id}`).getComponent(UITransform).contentSize,
      { width: 84, height: 48 });
    assert.equal(labelText(minus).trim(), '退点');
    rects.minus = rectWithin(minus, game.menu.root);
    assert.ok(rects.minus.right < rects.plus.left);
  }
  for (const control of footer.children) {
    const rect = rectWithin(control, pane);
    assert.ok(rect.left >= bounds.left && rect.right <= bounds.right);
    assert.ok(rect.bottom >= bounds.bottom && rect.top <= bounds.top);
  }
  return rects;
}

function assertSkillPan(game, treeOffset, detailY, selected) {
  assert.equal(game.page, 'library')
  assert.equal(game.menu.currentPage, 'library')
  assert.equal(game.menu.detailId, selected)
  assert.deepEqual(copy(game.menu.scroll.getScrollOffset()), treeOffset)
  const viewport = game.menu.skillPaneScroll.node.getComponent(UITransform).contentSize.height
  const contentHeight = game.menu.skillPaneScroll.content.getComponent(UITransform).contentSize.height
  assert.equal(game.menu.skillPaneScroll.getScrollOffset().y, Math.min(detailY, Math.max(0, contentHeight - viewport)))
  assert.ok(named(game.menu.root, '技能详情固定栏'))
  assert.equal(descendants(game.menu.root).some(node => /遮罩|全洗退款预览/.test(node.name)), false)
  assertFooter(game);

}

async function completeSkillImages(icons, failedId = null) {
  // Deliver outside the menu's initial call stack. The production loader owns
  // image conversion, cache, cancellation and binding; this is only I/O control.
  await Promise.resolve()
  const expected = stageRows.flatMap(row => row[2]).filter(id => !['sj_flight', 'sj_cross'].includes(id) && !id.startsWith('future_')).map(id => `tower-skill-icons/${id}`).sort()
  const skillRequests = icons.requests.filter(request => request.path.startsWith('tower-skill-icons/'))
  assert.deepEqual([...new Set(skillRequests.map(request => request.path))].sort(), expected)
  for (const request of skillRequests.filter(request => !request.settled)) {
    assert.strictEqual(request.Type, ImageAsset, 'load the PNG without requiring a sprite importer subtype')
    icons.complete(request, request.path === `tower-skill-icons/${failedId}` ? new Error('missing skill PNG') : null)
  }
}

function assertSkillImage(game, id, loaded = true) {
  const icon = named(game.menu.root, `技能图标-${id}`)
  const glyph = named(icon, `技能简笔-${id}`)
  const clip = named(icon, `技能素材裁剪-${id}`)
  const artwork = named(clip, `技能素材-${id}`), sprite = artwork.getComponent(Sprite)
  const badge = named(icon, `技能等级-${id}`)
  assert.ok(icon.getComponent(Button)?.interactable, 'the original circle remains clickable')
  assert.deepEqual(icon.getComponent(UITransform).contentSize, { width: 96, height: 96 })
  assert.equal(icon.getComponent(Mask), null, 'the level badge and border are outside the art mask')
  assert.strictEqual(clip.parent, icon)
  assert.equal(clip.getComponent(Mask).type, Mask.Type.GRAPHICS_ELLIPSE)
  assert.deepEqual(clip.getComponent(UITransform).contentSize, { width: 88, height: 88 })
  const size = id.startsWith('evo_') ? 100 : 88
  assert.deepEqual(artwork.getComponent(UITransform).contentSize, { width: size, height: size })
  assert.equal(artwork.position?.y ?? 0, id.startsWith('evo_') ? -8 : 0)
  assert.equal(sprite.sizeMode, Sprite.SizeMode.CUSTOM, 'artwork must retain its explicit display size')
  assert.equal(sprite.trim, false)
  for (const node of [clip, artwork]) {
    assert.equal(node.getComponent(Button), null, 'artwork adds no competing click target')
    assert.equal(node.getComponent(BlockInputEvents), null)
  }
  assert.strictEqual(badge.parent, icon)
  assert.ok(icon.children.indexOf(badge) > icon.children.indexOf(clip), 'the badge is drawn above the artwork')
  assert.deepEqual(badge.getComponent(UITransform).contentSize, { width: 28, height: 28 })
  assert.deepEqual(badge.position, { x: 0, y: -67 })
  const level = game.store.state.skills[id] ?? game.store.state.evolutionRanks[id] ?? 0
  assert.equal(labelText(badge).trim(), String(level))
  assert.equal(badge.active, true)
  assert.equal(clip.active, loaded)
  assert.equal(glyph.active, !loaded, 'fallback hides only after a usable frame arrives')
  if (loaded) {
    assert.ok(sprite.spriteFrame instanceof SpriteFrame)
    assert.ok(sprite.spriteFrame.texture instanceof Texture2D)
    assert.equal(sprite.spriteFrame.texture.image.name, `tower-skill-icons/${id}`)
  } else assert.equal(sprite.spriteFrame, null)
  return sprite
}

for (const frame of [{ width: 844, height: 390 }, { width: 1024, height: 600 }]) {
  test(`async skill artwork preserves all 16 click targets, clipping, badges and camp transactions (${frame.width}x${frame.height})`, async t => {
    const storage = disk(), original = seed(storage, { patch: investedSkillFixture() })
    const { game, icons } = launch(t, storage, { frame })
    press(game, '技能')
    const ids = stageRows.flatMap(row => row[2]).filter(id => !['sj_flight', 'sj_cross'].includes(id) && !id.startsWith('future_'))
    const staleSprites = ids.map(id => assertSkillImage(game, id, false))
    press(game, '技能图标-sj_line')
    game.menu.scroll.scrollToOffset(new Vec2(0, 1500), 0)
    game.menu.skillPaneScroll.scrollToOffset(new Vec2(0, Math.min(20, Math.max(0,
      game.menu.skillPaneScroll.content.getComponent(UITransform).contentSize.height
      - game.menu.skillPaneScroll.node.getComponent(UITransform).contentSize.height))), 0)
    const tree = named(game.menu.root, '境界技能树内容')
    const targets = () => descendants(tree).filter(node => node.getComponent(Button))
      .map(node => ({ name: node.name, rect: rectWithin(node, tree) }))
    const hitRects = targets(), state = game.store.state, data = new Map(storage.data), writes = [...storage.writes]
    await completeSkillImages(icons)
    assert.strictEqual(named(game.menu.root, '境界技能树内容'), tree, 'asset completion must not redraw the tree')
    assertSkillPan(game, { x: 0, y: 1500 }, 20, 'sj_line')
    assert.deepEqual(targets(), hitRects)
    assert.strictEqual(game.store.state, state)
    assert.deepEqual(storage.data, data)
    assert.deepEqual(storage.writes, writes)
    for (const sprite of staleSprites) {
      assert.equal(sprite.node.isValid, false)
      assert.deepEqual(sprite.frameAssignments, [], 'a retired tree receives no late frame assignments')
    }
    for (const id of ids) {
      assertSkillImage(game, id)
      press(game, `技能图标-${id}`)
      assert.equal(game.menu.detailId, id)
      assert.equal(game.menu.currentPage, 'library')
      assert.ok(named(game.menu.root, '技能详情固定栏'))
      assert.equal(game.overlay, null)
      assertSkillImage(game, id)
    }
    press(game, '技能节点-sj_line')
    game.menu.scroll.scrollToOffset(new Vec2(0, 1500), 0)
    game.menu.skillPaneScroll.scrollToOffset(new Vec2(0, Math.min(20, Math.max(0,
      game.menu.skillPaneScroll.content.getComponent(UITransform).contentSize.height
      - game.menu.skillPaneScroll.node.getComponent(UITransform).contentSize.height))), 0)
    const available = growth.growthSummary(game.store.state).available
    press(game, 'learnSkill-sj_line')
    assert.equal(game.store.state.skills.sj_line, 2)
    assert.equal(growth.growthSummary(game.store.state).available, available - 2)
    assertSkillImage(game, 'sj_line')
    assertSkillPan(game, { x: 0, y: 1500 }, 20, 'sj_line')
    press(game, 'decreaseSkill-sj_line')
    assert.equal(game.store.state.skills.sj_line, 1)
    assert.equal(growth.growthSummary(game.store.state).available, available)
    assertSkillImage(game, 'sj_line')
    assertSkillPan(game, { x: 0, y: 1500 }, game.menu.skillPaneOffset, 'sj_line')
    assert.equal(game.store.state.spiritStones, state.spiritStones)
    assert.deepEqual(game.store.state.books, state.books)
    assert.doesNotMatch(labelText(game.menu.root), /undefined|NaN/)
    ordinaryUnchanged(storage, original)
  })
}

test('one failed skill image leaves its glyph and camp controls usable alongside loaded artwork', async t => {
  const storage = disk(), original = seed(storage, { patch: investedSkillFixture() })
  const { game, icons } = launch(t, storage, { frame: { width: 844, height: 390 } })
  press(game, '技能')
  const state = game.store.state, data = new Map(storage.data), writes = [...storage.writes]
  await completeSkillImages(icons, 'sj_line')
  assert.strictEqual(game.store.state, state)
  assert.deepEqual(storage.data, data)
  assert.deepEqual(storage.writes, writes)
  assertSkillImage(game, 'sj_line', false)
  assertSkillImage(game, 'sj_yujian')
  press(game, '技能图标-sj_line')
  assert.equal(game.menu.detailId, 'sj_line')
  press(game, 'learnSkill-sj_line')
  assert.equal(game.store.state.skills.sj_line, 2)
  assertSkillImage(game, 'sj_line', false)
  press(game, 'decreaseSkill-sj_line')
  assert.equal(game.store.state.skills.sj_line, 1)
  assertSkillImage(game, 'sj_line', false)
  assertSkillImage(game, 'sj_yujian')
  assert.equal(game.store.state.spiritStones, state.spiritStones)
  assert.deepEqual(game.store.state.books, state.books)
  ordinaryUnchanged(storage, original)
})

test('destroying the real host releases loaded icon art and safely ignores pending completions', async t => {
  const storage = disk(), original = seed(storage)
  const { game, icons } = launch(t, storage, { frame: { width: 844, height: 390 } })
  press(game, '技能')
  const request = icons.requests.find(row => row.path === 'tower-skill-icons/sj_yujian')
  assert.ok(request)
  await Promise.resolve()
  const image = icons.complete(request)
  const frame = assertSkillImage(game, 'sj_yujian').spriteFrame, texture = frame.texture
  const sprites = descendants(game.menu.root).map(node => node.getComponent(Sprite)).filter(Boolean)
  const beforeDestroy = copy(game.store.state)
  game.destroy()
  // Host teardown normally syncs the camp save. Only subsequent image
  // completions must be inert; do not disable or bypass that lifecycle save.
  assert.deepEqual(game.store.state, beforeDestroy)
  const state = game.store.state, data = new Map(storage.data), writes = [...storage.writes]
  assert.equal(frame.isValid, false)
  assert.equal(texture.isValid, false)
  assert.equal(image.refs, 0, 'host destruction reaches the menu-owned image cache')
  const assignments = sprites.map(sprite => [...sprite.frameAssignments])
  await completeSkillImages(icons)
  assert.deepEqual(sprites.map(sprite => sprite.frameAssignments), assignments)
  assert.ok(sprites.every(sprite => !sprite.node.isValid))
  for (const row of icons.requests.filter(row => !row.settled)) icons.complete(row)
  assert.ok(icons.requests.every(row => row.asset.refs === 0))
  assert.strictEqual(game.store.state, state)
  assert.deepEqual(storage.data, data)
  assert.deepEqual(storage.writes, writes)
  ordinaryUnchanged(storage, original)
})

for (const frame of [{ width: 1280, height: 720 }, { width: 844, height: 390 }, { width: 1024, height: 600 }]) {
  const size = `${frame.width}x${frame.height}`
  test(`compact skill labels show passive mastery over loaded art and right-aligned points (${size})`, async t => {
    const storage = disk(), original = seed(storage, { patch: investedSkillFixture() })
    const { game, icons } = launch(t, storage, { frame })
    press(game, '技能')
    await completeSkillImages(icons)
    const tree = named(game.menu.root, '境界技能树内容')
    const passiveIds = new Set(['vajra', 'magnet', 'sj_heart', 'sj_mark', 'sj_bone', 'sj_gate',
      'future_yingling', 'future_shenshi', 'future_xubu'])
    for (const id of stageRows.flatMap(row => row[2])) {
      const icon = named(tree, `技能图标-${id}`), caption = named(tree, `技能节点-${id}`)
      const rect = rectWithin(icon, tree)
      assert.equal(rect.right - rect.left, 72)
      assert.equal(rect.top - rect.bottom, 72)
      const text = descendants(caption).find(node => node.getComponent(Label)).getComponent(Label)
      assert.equal(text.fontSize, 22, 'caption shrinks from 28 to 22 without shrinking the touch target')
      assert.doesNotMatch(text.string, /[（(]被动[)）]|共用/)
      const mastery = descendants(icon).filter(node => node.name === `技能精通-${id}`)
      assert.equal(mastery.length, passiveIds.has(id) ? 1 : 0, id)
      if (passiveIds.has(id)) {
        const box = rectWithin(mastery[0], icon)
        assert.equal(labelText(mastery[0]).trim(), '精通')
        assert.ok(box.top < 0 && box.bottom >= -48 && box.left >= -48 && box.right <= 48,
          'mastery is inside the lower half of the icon')
        assert.equal(mastery[0].getComponent(Button), null)
        const clip = icon.children.find(node => node.name === `技能素材裁剪-${id}`)
        if (clip) assert.ok(icon.children.indexOf(mastery[0]) > icon.children.indexOf(clip),
          'loaded artwork cannot obscure the mastery label')
        const definition = growth.GROWTH_SKILLS.find(skill => skill.id === id)
        if (definition) assert.equal(text.string, definition.name, 'passive caption contains only its name')
      }
    }
    const points = named(game.menu.root, '技能点'), panel = named(game.menu.root, '技能树面板')
    assert.equal(points.getComponent(Label).string, String(growth.growthSummary(game.store.state).available))
    assert.equal(points.getComponent(Label).horizontalAlign, Label.HorizontalAlign.CENTER)
    const reset = button(game, '初始化'), title = named(panel, '技能点标题');
    assert.strictEqual(reset.parent, panel);
    assert.equal(reset.position.y, title.position.y);
    assert.ok(rectWithin(reset, panel).right < rectWithin(title, panel).left);
    assert.strictEqual(points.parent, named(panel, '技能点数值底'));
    assert.ok(points.parent.getComponent(Graphics));
    assert.ok(!descendants(panel).some(n => n.name.includes('resource_skill_point')));
    assert.equal(rectWithin(points, panel).right, panel.getComponent(UITransform).contentSize.width / 2 - 16)
    assert.doesNotMatch(labelText(tree), /共用/)
    const viewport = named(game.menu.root, '技能树二维卷轴')
    assert.equal(tree.getComponent(UITransform).contentSize.width, viewport.getComponent(UITransform).contentSize.width)
    game.menu.scroll.scrollToOffset(new Vec2(20, 250), 0)
    press(game, '技能节点-sj_heart')
    assert.deepEqual(copy(game.menu.scroll.getScrollOffset()), { x: 0, y: 250 },
      'out-of-bounds horizontal pan clamps to zero while the valid vertical pan survives')
    assert.equal(labelText(named(game.menu.root, '技能精通-sj_heart')).trim(), '精通')
    press(game, 'learnSkill-sj_heart')
    assert.equal(labelText(named(game.menu.root, '技能精通-sj_heart')).trim(), '精通')
    assert.equal(named(game.menu.root, '技能点').getComponent(Label).string,
      String(growth.growthSummary(game.store.state).available))
    ordinaryUnchanged(storage, original)
  })

  test(`physical type, flow and level are separate nonoverlapping tags (${size})`, t => {
    const storage = disk(), original = seed(storage)
    const { game } = launch(t, storage, { frame })
    press(game, '技能')
    for (const [id, category, flow] of [
      ['sj_yujian', '物理攻击', '通用'], ['sj_arc', '物理＋法术攻击', '剑气'],
      ['sj_wanjian', '物理＋法术攻击', '剑阵'], ['sj_gate', '物理＋法术攻击', '通用'], ['vajra', '被动技能', '通用'],
      ['future_yingling', '辅助', '通用'],
    ]) {
      press(game, `技能节点-${id}`)
      const pane = named(game.menu.root, '技能详情固定栏')
      const tags = [0, 1, 2].map(index => named(pane, `技能标签-${id}-${index}`))
      assert.equal(labelText(tags[0]).trim(), category)
      assert.equal(labelText(tags[1]).trim(), flow)
      const definition = growth.GROWTH_SKILLS.find(skill => skill.id === id)
      assert.equal(labelText(tags[2]).trim(), definition
        ? `${game.store.state.skills[id] || 0}/${definition.maxLevel}级` : '未开放')
      for (const [index, tag] of tags.entries()) {
        assert.strictEqual(tag.parent, pane, 'tags stay outside scrolling descriptions')
        assert.ok(tag.getComponent(Graphics), 'tag has its own drawn background')
        assert.equal(tag.getComponent(Button), null)
        const bounds = rectWithin(tag, pane)
        assert.ok(bounds.left >= -190 && bounds.right <= 190)
        assert.ok(bounds.bottom >= rectWithin(named(pane, '技能详情独立卷轴'), pane).top)
        if (index) {
          assert.equal(tag.position.y, tags[0].position.y)
          assert.ok(rectWithin(tags[index - 1], pane).right < bounds.left)
        }
      }
      assert.doesNotMatch(labelText(pane), /共用/)
    }
    ordinaryUnchanged(storage, original)
  })

  test(`independent skills have no dependency arrows (${size})`, t => {
    const storage = disk(), original = seed(storage)
    const { game } = launch(t, storage, { frame })
    press(game, '技能')
    const tree = named(game.menu.root, '境界技能树内容')
    const wire = named(tree, '技能前置连线'), strokes = wire.getComponent(Graphics).segments
    assert.equal(strokes.length, 0, 'no dependency arrows remain')
    for (const row of growth.GROWTH_EVOLUTIONS) {
      assert.ok(named(tree, `技能行-${row.id}`), 'independent advanced skill remains visible')
    }
    const before = copy(game.store.state), writes = [...storage.writes]
    press(game, '技能节点-evo_wanjian')
    assert.deepEqual(game.store.state, before)
    assert.deepEqual(storage.writes, writes)
    ordinaryUnchanged(storage, original)
  })

  test(`realm blocks group all 26 skills with five-slot rows and no label column (${size})`, t => {
    const storage = disk(), original = seed(storage)
    const { game } = launch(t, storage, { frame })
    assert.ok(hasLabel(game.menu.root, '落云主峰'))
    press(game, '技能')
    const tree = named(game.menu.root, '境界技能树内容')
    const realms = ['炼气', '筑基', '金丹', '元婴', '化神', '炼虚']
    const blocks = realms.map(realm => named(tree, `技能境界-${realm}`))
    assert.equal(descendants(tree).filter(node => node.name.startsWith('技能境界-')).length, 6)
    assert.equal(descendants(tree).filter(node => node.name.startsWith('技能阶段-')).length, 0,
      'no standalone stage column')
    const rows = descendants(tree).filter(node => node.name.startsWith('技能行-'))
    assert.deepEqual(rows.map(node => node.name.slice('技能行-'.length)).sort(),
      stageRows.flatMap(row => row[2]).sort(), 'all 18 current and 9 preview skills appear exactly once')
    const extent = tree.getComponent(UITransform).contentSize
    assert.equal(extent.width, named(game.menu.root, '技能树二维卷轴').getComponent(UITransform).contentSize.width)
    for (const [index, realm] of realms.entries()) {
      const block = blocks[index], box = rectWithin(block, tree)
      assert.equal(box.left, 4)
      assert.equal(box.right, extent.width - 4)
      if (index) assert.ok(rectWithin(blocks[index - 1], tree).bottom > box.top)
      const title = descendants(block).find(node => node.getComponent(Label)?.string === realm)
      assert.ok(title)
      const titleBox = rectWithin(title, tree)
      assert.ok(titleBox.left - box.left <= 32 && box.top - titleBox.top <= 8, 'realm label is in block top-left')
      const ids = stageRows.filter(row => row[1].startsWith(realm)).flatMap(row => row[2]).sort()
      const grouped = rows.filter(row => {
        const r = rectWithin(row, tree)
        return r.top <= box.top && r.bottom >= box.bottom
      })
      assert.deepEqual(grouped.map(row => row.name.slice('技能行-'.length)).sort(), ids)
      assert.equal(hasLabel(block, '未开放'), index >= 3)
      assert.ok(Math.min(...grouped.map(row => rectWithin(row, tree).left)) < titleBox.right,
        'skills use the title horizontal space below it; no reserved label column')
      for (const row of grouped) {
        const r = rectWithin(row, tree)
        assert.ok(r.top < titleBox.bottom && r.left >= box.left && r.right <= box.right)
      }
    }
    const rowsByY = new Map()
    for (const row of rows) {
      const y = row.position.y
      rowsByY.set(y, [...(rowsByY.get(y) || []), row])
    }
    assert.ok([...rowsByY.values()].some(row => row.length === 5), 'uses all five available slots')
    assert.ok([...rowsByY.values()].every(row => row.length <= 5), 'at most five skills per row')
    assert.equal(descendants(tree).filter(node => node.name.startsWith('流派-')).length, 0,
      'flow labels do not fix skill columns')
    for (const [, title, ids] of stageRows) {
      for (const id of ids) {
        press(game, `技能节点-${id}`)
        assert.equal(game.menu.detailId, id, 'all staged skills remain inspectable, including locked ones')
        assert.ok(labelText(named(game.menu.root, '技能详情固定栏')).replace(/\s/g, '').includes(`${title}`))
      }
    }
    ordinaryUnchanged(storage, original)
  })

  test(`nine-stage UI keeps compact nodes and fixed footer targets (${size})`, t => {
    const storage = disk(), original = seed(storage, { patch: investedSkillFixture() })
    const { game } = launch(t, storage, { frame })
    press(game, '技能')
    const tree = named(game.menu.root, '境界技能树内容')
    const targets = descendants(tree).filter(node => node.getComponent(Button))
    assert.equal(targets.length, stageRows.flatMap(row=>row[2]).length*2, 'each skill has only icon and name targets')
    assert.doesNotMatch(labelText(tree), /需炼气|尚无投资|退款|常驻/)
    for (const id of stageRows.flatMap(row => row[2])) {
      const row = named(tree, `技能行-${id}`)
      assert.equal(row.getComponent(UITransform).contentSize.height, 180)
      assert.deepEqual(row.children.map(node => node.name), [
        `技能图标-${id}`, `技能节点-${id}`,
      ], 'row contains only its icon and caption targets')
    }
    for (const [i, a] of targets.entries()) for (const b of targets.slice(i + 1)) {
      const ar = rectWithin(a, tree), br = rectWithin(b, tree)
      assert.ok(ar.right <= br.left || br.right <= ar.left || ar.top <= br.bottom || br.top <= ar.bottom,
        `overlapping touch rectangles: ${a.name} / ${b.name}`)
    }
    const fixed = assertFooter(game)
    for (const id of stageRows.flatMap(row => row[2]).filter(id => !id.startsWith('future_'))) {
      press(game, `技能节点-${id}`)
      assert.deepEqual(assertFooter(game), fixed, 'switching text length cannot move the toolbar')
      game.menu.skillPaneScroll.scrollToOffset(new Vec2(0, 500), 0)
      assert.deepEqual(assertFooter(game), fixed, 'scrolling cannot move the toolbar')
    }
    ordinaryUnchanged(storage, original)
  })
}

for (const frame of [{ width: 1280, height: 720 }, { width: 844, height: 390 }, { width: 1024, height: 600 }]) {
  test(`nine-stage UI plus/minus retain selection and vertical scroll in the viewport-wide tree (${frame.width}x${frame.height})`, t => {
    const storage = disk(), original = seed(storage, { patch: investedSkillFixture() })
    const { game } = launch(t, storage, { frame })
    press(game, '技能')
    press(game, '技能节点-sj_line')
    game.menu.scroll.scrollToOffset(new Vec2(0, 1500), 0)
    game.menu.skillPaneScroll.scrollToOffset(new Vec2(0, Math.min(20, Math.max(0,
      game.menu.skillPaneScroll.content.getComponent(UITransform).contentSize.height
      - game.menu.skillPaneScroll.node.getComponent(UITransform).contentSize.height))), 0)
    const offset = { x: 0, y: 1500 }, before = copy(game.store.state)
    const available = growth.growthSummary(before).available
    const stalePlus = button(game, 'learnSkill-sj_line').events.get(Button.EventType.CLICK)
    press(game, 'learnSkill-sj_line')
    assert.equal(game.store.state.skills.sj_line, 2)
    assert.equal(growth.growthSummary(game.store.state).available, available - 2)
    assertSkillPan(game, offset, 20, 'sj_line')
    assert.ok(hasLabel(named(game.menu.root, '技能树面板'), String(available - 2)))
    assert.equal(labelText(named(game.menu.root, '技能等级-sj_line')).trim(), '2')
    const learned = game.store.state
    stalePlus()
    assert.strictEqual(game.store.state, learned, 'retired tree callbacks cannot spend twice')
    press(game, 'decreaseSkill-sj_line')
    assert.equal(game.store.state.skills.sj_line, 1)
    assert.equal(growth.growthSummary(game.store.state).available, available)
    assertSkillPan(game, offset, game.menu.skillPaneOffset, 'sj_line')
    assert.equal(labelText(named(game.menu.root, '技能等级-sj_line')).trim(), '1')
    assert.ok(hasLabel(named(game.menu.root, '技能树面板'), String(available)))
    assert.equal(game.store.state.spiritStones, before.spiritStones)
    assert.deepEqual(game.store.state.books, before.books, 'the permanent book is neither charged nor lost')
    assert.doesNotMatch(labelText(game.menu.root), /undefined|NaN/)
    const reloaded = new campaign.TowerCampaignStore({
      getItem: () => storage.getItem(playtest.TOWER_PLAYTEST_KEY), setItem() { assert.fail('read-only reload') },
    }, START)
    assert.equal(reloaded.readOnly, false)
    assert.deepEqual(reloaded.state, game.store.state)
    ordinaryUnchanged(storage, original)
  })
}

for (const frame of [{ width: 844, height: 390 }, { width: 1024, height: 600 }]) {
  test(`skill footer is stationary through commits, failures, read-only and selection (${frame.width}x${frame.height})`, t => {
    const storage = disk(), original = seed(storage, { patch: investedSkillFixture() })
    const { game, tick } = launch(t, storage, { frame })
    press(game, '技能')
    press(game, '技能节点-sj_line')
    const fixed = assertFooter(game)
    const stable = () => assert.deepEqual(assertFooter(game), fixed)
    game.menu.skillPaneScroll.scrollToOffset(new Vec2(0, 350), 0)
    stable()
    for (const action of ['learnSkill', 'decreaseSkill']) {
      const before = copy(game.store.state)
      storage.blockedWrites.add(playtest.TOWER_PLAYTEST_KEY)
      press(game, `${action}-sj_line`)
      assert.deepEqual(game.store.state, before)
      assert.ok(hasLabel(named(game.menu.root, '技能操作错误'), '保存失败'))
      stable()
      storage.blockedWrites.clear()
      press(game, `${action}-sj_line`)
      assert.equal(game.store.state.skills.sj_line, action === 'learnSkill' ? 2 : 1)
      stable()
    }
    const retired = button(game, 'learnSkill-sj_line').events.get(Button.EventType.CLICK)
    press(game, '技能节点-evo_tiandi')
    stable()
    const before = game.store.state
    retired()
    assert.strictEqual(game.store.state, before, 'selection retires previous skill callbacks')
    assert.equal(descendants(game.menu.root).some(node => node.name === '点−退点预览'), false)
    press(game, '技能节点-sj_line')
    press(game, 'decreaseSkill-sj_line')
    assert.equal(game.store.state.skills.sj_line, undefined)
    stable()
    assert.equal(descendants(game.menu.root).some(node => node.name === '点−退点预览'), false,
      'last refund leaves only its receipt, not an empty refund preview')
    assert.ok(hasLabel(game.menu.root, '已保存：返还2点'))
    press(game, '技能节点-sj_arc')
    storage.blockedWrites.add(playtest.TOWER_PLAYTEST_KEY)
    tick(6)
    assert.equal(game.menu.state.readOnly, true)
    stable()
    const readOnlyState = game.store.state, writes = storage.writes.length
    for (const action of ['learnSkill', 'decreaseSkill']) {
      const disabled = button(game, `${action}-sj_arc`)
      assert.equal(disabled.getComponent(Button).interactable, false)
      disabled.events.get(Button.EventType.CLICK)()
    }
    assert.strictEqual(game.store.state, readOnlyState)
    assert.equal(storage.writes.length, writes)
    storage.blockedWrites.clear()
    tick(6)
    assert.equal(game.menu.state.readOnly, false)
    stable()
    ordinaryUnchanged(storage, original)
  })

  test(`skill footer displays actual unlearned and maximum ranks (${frame.width}x${frame.height})`, t => {
    const storage = disk(), original = seed(storage, { patch: {
      ...investedSkillFixture(), skills: { ...growth.giftSkills(3), sj_yujian: 9 },
    } })
    const { game } = launch(t, storage, { frame })
    press(game, '技能')
    press(game, '技能节点-sj_yujian')
    const fixed = assertFooter(game)
    press(game, 'learnSkill-sj_yujian')
    assert.equal(game.store.state.skills.sj_yujian, 10)
    assert.deepEqual(assertFooter(game), fixed)
    assert.equal(button(game, 'learnSkill-sj_yujian').getComponent(Button).interactable, false)
    press(game, '技能节点-vajra')
    assert.deepEqual(assertFooter(game), fixed)
    assert.equal(labelText(button(game, 'learnSkill-vajra')).trim(), '修习功法')
    assert.ok(hasLabel(game.menu.root, '被动'))
    assert.doesNotMatch(labelText(game.menu.root), /常驻/)
    assert.equal(descendants(game.menu.root).some(node => node.name === '点−退点预览'), false)
    press(game, '技能节点-sj_arc')
    assert.equal(descendants(game.menu.root).some(node => node.name === '点−退点预览'), false,
      'a teaching gift alone is not an investment')
    ordinaryUnchanged(storage, original)
  })
}

for (const frame of [{ width: 1280, height: 720 }, { width: 844, height: 390 }]) {
 test(`skill form, next-rank and future motion details fit the independent scroll (${frame.width}x${frame.height})`, t => {
  const storage=disk(), original=seed(storage,{patch:{...investedSkillFixture(),books:['sj_formation'],
   skills:{...growth.giftSkills(3),sj_arc:2,sj_formation:9}}})
  const {game}=launch(t,storage,{frame})
  press(game,'技能');press(game,'技能节点-sj_arc')
  const saved=JSON.stringify(game.store.state),writes=[...storage.writes],footer=assertFooter(game)
  const details=()=>labelText(named(game.menu.root,'技能详情栏内容')).replace(/\s/g,'')
  assert.match(details(),/形态：近身月牙，1道月牙/)
  assert.match(details(),/本级形态不变/)
  assert.match(details(),/下一级（3级）/)
  assert.match(details(),/方向固定/)
  press(game,'技能节点-sj_formation')
  assert.match(details(),/范围：落点半径150的圆形区域/)
  assert.match(details(),/同敌最多命中：6→7击/)
  const viewport=named(game.menu.root,'技能详情独立卷轴'),content=named(game.menu.root,'技能详情栏内容')
  const contentSize=content.getComponent(UITransform).contentSize
  assert.ok(contentSize.height>viewport.getComponent(UITransform).contentSize.height)
  for(const node of descendants(content).filter(n=>n.getComponent(Label))){
   const label=node.getComponent(Label),size=node.getComponent(UITransform).contentSize
   assert.ok(size.width<=contentSize.width-40)
   assert.ok(size.height>=label.string.split('\n').length*label.lineHeight)
   assert.ok(-node.position.y+size.height/2<=contentSize.height,'every final line is inside the scroll content')
  }
  game.menu.skillPaneScroll.scrollToOffset(new Vec2(0,contentSize.height),0)
  assert.deepEqual(assertFooter(game),footer)
  for(const id of stageRows.flatMap(row=>row[2]).filter(id=>id.startsWith('future_'))){
   press(game,`技能节点-${id}`)
   assert.match(details(),/范围：/)
   assert.match(details(),/初成至大成：/)
   assert.match(details(),/当前版本未开放/)
   assert.doesNotMatch(details(),/预算|账本|递归|灵石|冷却时间/)
   assert.equal(descendants(game.menu.root).some(n=>n.name===`learnSkill-${id}`),false)
  }
  assert.equal(JSON.stringify(game.store.state),saved)
  assert.deepEqual(storage.writes,writes)
  ordinaryUnchanged(storage,original)
 })
}

test('nine-stage UI shows locked learning without writes below the starting phase', t => {
  const storage = disk(), original = seed(storage, {
    patch: { xp: 75, tutorialWaves: 3, skills: { ...growth.giftSkills(3) } },
  })
  const { game } = launch(t, storage, { frame: { width: 844, height: 390 } })
  press(game, '技能')
  press(game, '技能节点-vajra')
  assert.equal(game.store.state.skills.vajra, undefined)
  assert.equal(labelText(named(game.menu.root, '技能等级-vajra')).trim(), '0')
  const details = labelText(named(game.menu.root, '技能详情固定栏')).replace(/\s/g, '')
  assert.ok(details.includes('学习条件角色炼气·中期'), details)
  const plus = button(game, 'learnSkill-vajra'), before = game.store.state
  const raw = storage.getItem(playtest.TOWER_PLAYTEST_KEY), writes = storage.writes.length
  assert.equal(plus.getComponent(Button).interactable, false)
  plus.events.get(Button.EventType.CLICK)()
  assert.strictEqual(game.store.state, before)
  assert.equal(storage.getItem(playtest.TOWER_PLAYTEST_KEY), raw)
  assert.equal(storage.writes.length, writes)
  assert.equal(button(game, 'decreaseSkill-vajra').getComponent(Button).interactable, false)
  press(game, '技能节点-sj_yujian')
  assert.equal(button(game, 'decreaseSkill-sj_yujian').getComponent(Button).interactable, false)
  ordinaryUnchanged(storage, original)
})

test('nine-stage UI failed learning keeps scroll and assets, shows a fixed error, and retries once', t => {
  const storage = disk(), original = seed(storage, { patch: investedSkillFixture() })
  const { game } = launch(t, storage, { frame: { width: 844, height: 390 } })
  press(game, '技能')
  press(game, '技能节点-sj_line')
  game.menu.scroll.scrollToOffset(new Vec2(0, 1500), 0)
  game.menu.skillPaneScroll.scrollToOffset(new Vec2(0, Math.min(20, Math.max(0,
      game.menu.skillPaneScroll.content.getComponent(UITransform).contentSize.height
      - game.menu.skillPaneScroll.node.getComponent(UITransform).contentSize.height))), 0)
  const before = copy(game.store.state), raw = storage.getItem(playtest.TOWER_PLAYTEST_KEY)
  storage.blockedWrites.add(playtest.TOWER_PLAYTEST_KEY)
  press(game, 'learnSkill-sj_line')
  assert.deepEqual(game.store.state, before)
  assert.equal(storage.getItem(playtest.TOWER_PLAYTEST_KEY), raw)
  assertSkillPan(game, { x: 0, y: 1500 }, 20, 'sj_line')
  const error = named(game.menu.root, '技能操作错误')
  assert.strictEqual(error.parent, named(game.menu.root, '技能详情固定栏'), 'error does not scroll away with effects')
  assert.ok(hasLabel(error, '保存失败'))
  storage.blockedWrites.clear()
  press(game, 'learnSkill-sj_line')
  assert.equal(game.store.state.skills.sj_line, 2)
  assert.equal(growth.growthSummary(game.store.state).spent, growth.growthSummary(before).spent + 2)
  assertSkillPan(game, { x: 0, y: 1500 }, 20, 'sj_line')
  assert.equal(descendants(game.menu.root).some(node => node.name === '技能操作错误'), false)
  ordinaryUnchanged(storage, original)
})

for (const [id, stage, level] of [
  ['evo_wanjian', '金丹·初期', 19], ['evo_tiandi', '金丹·中期', 22],
  ['evo_wuwo', '金丹·中期', 22], ['evo_sixiang', '金丹·巅峰', 25],
]) {
  test(`nine-stage UI ${id} first-rank condition matches its stage without changing higher-rank gates`, t => {
    const storage = disk(), original = seed(storage)
    const { game } = launch(t, storage, { frame: { width: 844, height: 390 } })
    press(game, '技能')
    press(game, `技能节点-${id}`)
    const pane = named(game.menu.root, '技能详情固定栏')
    const conditions = labelText(pane).replace(/\s/g, '')
    assert.ok(conditions.includes(`学习条件角色${stage}`))
    assert.ok(!conditions.includes('通关第6层'))
    assert.ok(!conditions.includes('门槛与成本'))
    assert.doesNotMatch(labelText(pane), /undefined|NaN/)
    ordinaryUnchanged(storage, original)
  })
}

function assertTowerLearningOnly(game) {
  assert.equal(game.screen, 'skills')
  assert.equal(game.page, 'library')
  assert.equal(game.run.state.phase, 'paused')
  const tree = named(game.menu.root, '境界技能树内容')
  assert.equal(descendants(tree).filter(node => node.name.startsWith('learnSkill-')).length, 0)
  assert.equal(descendants(tree).filter(node => node.getComponent(Button)).length, stageRows.flatMap(row=>row[2]).length*2)
  assert.equal(descendants(game.menu.root).filter(node => node.name.startsWith('learnSkill-')).length, 1)
  assertFooter(game)
  const forbidden = descendants(game.menu.root).filter(node =>
    /^(decreaseSkill-|respecSkills)/.test(node.name)
    || /全洗|退款|藏经阁重修/.test(node.name) && (node.getComponent(Button) || node.getComponent(Graphics))
    || node.name === '点−退点预览')
  assert.deepEqual(forbidden.map(node => node.name), [], 'refund controls and cards must be absent, not merely disabled')
}

for (const frame of [{ width: 844, height: 390 }, { width: 1024, height: 600 }]) {
  test(`paused tower skills show only plus, keep its hit area, and commit a legal upgrade (${frame.width}x${frame.height})`, async t => {
    const storage = disk(), original = seed(storage, { hp: 37.5, patch: investedSkillFixture() })
    const { game, tick, icons } = launch(t, storage, { frame })
    game.enterFloor(1)
    game.update(0)
    game.update(1 / 30)
    assert.ok(game.run.state.time > 0, 'the fixture really entered and advanced a Campaign attempt')
    press(game, '暂停')
    press(game, /^技能 · 可用\d+点$/)
    await completeSkillImages(icons)
    assertTowerLearningOnly(game)
    for (const id of stageRows.flatMap(row => row[2]).filter(id => !['sj_flight', 'sj_cross'].includes(id) && !id.startsWith('future_'))) {
      assertSkillImage(game, id)
      press(game, `技能节点-${id}`)
      assertTowerLearningOnly(game)
    }
    press(game, '技能节点-sj_line')
    assert.equal(button(game, 'learnSkill-sj_line').getComponent(Button).interactable, true,
      'special skills can be learned while paused')
    press(game, '技能节点-sj_arc')
    const before = game.run.snapshot(), state = game.store.state
    assert.equal(validateTowerSnapshot(before), true)
    assert.equal(state.activeRun.snapshot.phase, 'paused')
    const available = growth.growthSummary(state).available
    const stalePlus = button(game, 'learnSkill-sj_arc').events.get(Button.EventType.CLICK)
    press(game, 'learnSkill-sj_arc')
    assertTowerLearningOnly(game)
    assert.equal(game.menu.detailId, 'sj_arc')
    assert.equal(game.store.state.skills.sj_arc, 3)
    assertSkillImage(game, 'sj_arc')
    assert.equal(labelText(named(game.menu.root, '技能等级-sj_arc')).trim(), '3')
    assert.equal(growth.growthSummary(game.store.state).available, available - 1)
    assert.ok(hasLabel(named(game.menu.root, '技能树面板'), String(available - 1)))
    assert.equal(button(game, 'learnSkill-sj_arc').getComponent(Button).interactable, true,
      'paused upgrades use the same realm cap as camp')
    const after = game.run.snapshot()
    assert.equal(after.loadout.active.sj_arc, 3)
    assert.deepEqual({ ...after, loadout: before.loadout }, before,
      'learning preserves HP, RNG, time, cooldowns, pending attacks and progression')
    assert.deepEqual(game.store.state.activeRun.snapshot, after)
    assert.equal(validateTowerSnapshot(after), true)
    assert.equal(game.store.state.spiritStones, state.spiritStones)
    assert.deepEqual(game.store.state.books, state.books)
    const committed = game.store.state, raw = storage.getItem(playtest.TOWER_PLAYTEST_KEY)
    storage.writes.length = 0
    stalePlus()
    tick(3)
    assert.strictEqual(game.store.state, committed)
    assert.deepEqual(game.run.snapshot(), after, 'time remains frozen on the paused skills page')
    assert.equal(storage.getItem(playtest.TOWER_PLAYTEST_KEY), raw)
    assert.deepEqual(storage.writes, [])
    ordinaryUnchanged(storage, original)
  })
}

for (const action of [{ type: 'decreaseSkill', id: 'sj_line' }, { type: 'respecSkills' }]) {
  for (const destination of ['hall', 'tower', 'battle', 'skills']) {
    test(`host ${action.type} is rejected outside the camp library (${destination})`, t => {
      const storage = disk(), original = seed(storage, { patch: investedSkillFixture() })
      const { game } = launch(t, storage, { frame: { width: 844, height: 390 } })
      if (destination === 'tower') game.goto('tower')
      if (destination === 'battle' || destination === 'skills') {
        game.enterFloor(1)
        if (destination === 'skills') press(game, '技能')
      }
      assert.equal(game.screen, ['hall', 'tower'].includes(destination) ? 'camp' : destination)
      assert.equal(game.page, destination === 'tower' ? 'tower' : destination === 'skills' ? 'library' : 'hall')
      const state = game.store.state, before = copy(state), run = game.run?.snapshot()
      const data = new Map(storage.data), writes = [...storage.writes]
      const result = game.action(action)
      assert.deepEqual(copy(result), { ok: false, reason: 'library-only' })
      assert.strictEqual(game.store.state, state)
      assert.deepEqual(game.store.state, before)
      assert.deepEqual(game.run?.snapshot(), run)
      assert.deepEqual(storage.data, data, 'all stored records remain byte-for-byte identical')
      assert.deepEqual(storage.writes, writes, 'no persistence attempt is made')
      ordinaryUnchanged(storage, original)
    })
  }

  test(`host ${action.type} remains allowed in the camp library and preserves books`, t => {
    const storage = disk(), original = seed(storage, { patch: investedSkillFixture() })
    const { game } = launch(t, storage, { frame: { width: 844, height: 390 } })
    press(game, '技能')
    assert.equal(game.screen, 'camp')
    assert.equal(game.page, 'library')
    press(game, '技能节点-sj_line')
    assert.ok(button(game, 'decreaseSkill-sj_line').getComponent(Button).interactable)
    assert.ok(button(game, '初始化').getComponent(Button).interactable)
    const before = game.store.state, spent = growth.growthSummary(before).spent
    const result = game.action(action)
    assert.equal(result.ok, true)
    assert.equal(result.returned, action.type === 'decreaseSkill' ? 2 : spent + 1)
    assert.equal(growth.growthSummary(game.store.state).spent, action.type === 'decreaseSkill' ? spent - result.returned : 0)
    assert.equal(game.store.state.skills.sj_line, undefined)
    assert.equal(game.store.state.skills.sj_arc, action.type === 'decreaseSkill' ? 2 : undefined)
    for (const [id, rank] of Object.entries(growth.giftSkills(3, action.type === 'respecSkills'))) {
      assert.ok(game.store.state.skills[id] >= rank, `teaching gift ${id} is retained`)
    }
    assert.equal(game.store.state.spiritStones, before.spiritStones)
    assert.deepEqual(game.store.state.books, before.books)
    const reloaded = new campaign.TowerCampaignStore({
      getItem: () => storage.getItem(playtest.TOWER_PLAYTEST_KEY), setItem() { assert.fail('read-only reload') },
    }, START)
    assert.equal(reloaded.readOnly, false)
    assert.deepEqual(reloaded.state, game.store.state)
    ordinaryUnchanged(storage, original)
  })
}

function joystick(game) {
  const matches = descendants(game.root).filter(node => node.name === '移动摇杆')
  assert.equal(matches.length, 1, 'one fixed movement surface')
  return matches[0]
}

function touch(game, surface, event, id, dx = 0, dy = 0) {
  const size = game.root.getComponent(UITransform).contentSize
  const handler = surface.events.get(event)
  assert.equal(typeof handler, 'function', `missing touch handler: ${event}`)
  handler({
    getID: () => id,
    getUILocation: () => ({
      x: size.width / 2 + surface.position.x + dx,
      y: size.height / 2 + surface.position.y + dy,
    }),
  })
}

function assertStopped(game) {
  assert.equal(game.touch, null)
  assert.equal(game.stick.dx, 0)
  assert.equal(game.stick.dy, 0)
}

function assertTargetsInFrame(game, targets) {
  const frame = game.root.getComponent(UITransform).contentSize
  const boxes = targets.map(node => {
    const size = node.getComponent(UITransform).contentSize
    let x = 0, y = 0
    for (let parent = node; parent && parent !== game.root; parent = parent.parent) {
      x += parent.position?.x || 0
      y += parent.position?.y || 0
    }
    const box = { name: node.name, left: x - size.width / 2, right: x + size.width / 2, bottom: y - size.height / 2, top: y + size.height / 2 }
    assert.ok(size.width >= 44 && size.height >= 44, `${node.name}: usable touch target`)
    assert.ok(box.left >= -frame.width / 2 && box.right <= frame.width / 2, `${node.name}: horizontal bounds`)
    assert.ok(box.bottom >= -frame.height / 2 && box.top <= frame.height / 2, `${node.name}: vertical bounds`)
    return box
  })
  for (let i = 0; i < boxes.length; i++) {
    for (const other of boxes.slice(i + 1)) {
      const box = boxes[i]
      assert.ok(box.right <= other.left || other.right <= box.left || box.top <= other.bottom || other.top <= box.bottom,
        `${box.name} overlaps ${other.name}`)
    }
  }
}

test('portrait launch gates camp UI and updates until a landscape frame is available', t => {
  const storage = disk(); seed(storage, { hp: 37.5 })
  const { game, resize, tick, viewport } = launch(t, storage, { assisted: false, frame: { width: 390, height: 844 } })
  const saved = storage.getItem(campaign.TOWER_CAMPAIGN_KEY), state = copy(game.store.state)
  storage.writes.length = 0
  assert.equal(game.orientationBlocked, true)
  assert.equal(game.landscape, true)
  assert.deepEqual(viewport.design, { width: 1280, height: 720 })
  assert.equal(viewport.policies.at(-1), 1)
  assert.equal(game.menu, null)
  assert.equal(game.battle, null)
  const gate = named(game.root, 'HUD.RotateDevice')
  assert.ok(gate.getComponent(BlockInputEvents))
  assert.deepEqual(game.root.children.filter(n => n.active), [gate])
  assert.equal(descendants(gate).filter(n => n.getComponent(Button)).length, 0)
  tick(60)
  game.keyDown({ keyCode: 68 })
  assert.equal(game.keys.size, 0)
  assert.deepEqual(copy(game.store.state), state)
  assert.equal(storage.getItem(campaign.TOWER_CAMPAIGN_KEY), saved)
  assert.deepEqual(storage.writes, [])
  resize(1024, 600)
  assert.equal(game.orientationBlocked, false)
  assert.equal(gate.isValid, false)
  assert.equal(game.screen, 'camp')
  assert.ok(game.menu)
  assert.equal(viewport.policies.at(-1), 2)
  assert.equal(game.root.getComponent(UITransform).contentSize.width, 1280)
  button(game, '技能')
})

for (const paused of [false, true]) {
  test(`portrait gate preserves the ${paused ? 'paused' : 'playing'} run and requires manual continue`, t => {
    const storage = disk(); seed(storage, { hp: 37.5 })
    const { game, resize, tick, viewport } = launch(t, storage, { assisted: false })
    game.enterFloor(1); game.update(0); game.update(0.05)
    if (paused) press(game, '暂停')
    const oldSurface = joystick(game)
    if (!paused) {
      touch(game, oldSurface, Node.EventType.TOUCH_START, 81, 36, 0)
      game.update(1 / 30)
      game.keyDown({ keyCode: 68 })
      assert.ok(game.run.state.input.x > 0)
    }
    const before = game.run.snapshot(), state = game.store.state
    const saved = storage.getItem(campaign.TOWER_CAMPAIGN_KEY)
    storage.writes.length = 0
    resize(390, 844)
    const expected = { ...before, phase: 'paused', input: { x: 0, y: 0 } }
    assert.equal(game.orientationBlocked, true)
    assert.equal(game.landscape, true)
    assert.deepEqual(viewport.design, { width: 1280, height: 720 })
    assert.equal(viewport.policies.at(-1), 1)
    assertStopped(game)
    assert.equal(game.keys.size, 0)
    assert.deepEqual(game.run.snapshot(), expected, 'only phase and input change; HP, RNG, time and loot remain identical')
    const gate = named(game.root, 'HUD.RotateDevice')
    assert.deepEqual(game.root.children.filter(n => n.active), [gate])
    if (paused) {
      assert.strictEqual(game.store.state, state)
      assert.equal(storage.getItem(campaign.TOWER_CAMPAIGN_KEY), saved)
      assert.deepEqual(storage.writes, [])
    } else {
      assert.deepEqual(storage.writes, [campaign.TOWER_CAMPAIGN_KEY])
      assert.notEqual(storage.getItem(campaign.TOWER_CAMPAIGN_KEY), saved)
    }
    assert.deepEqual(game.store.state.activeRun.snapshot, expected)
    const restored = new campaign.TowerCampaignStore(storage, START)
    assert.equal(restored.readOnly, false)
    assert.deepEqual(restored.state.activeRun.snapshot, expected)
    const checkpoint = storage.getItem(campaign.TOWER_CAMPAIGN_KEY)
    storage.writes.length = 0
    tick(60)
    game.keyDown({ keyCode: 27 })
    touch(game, oldSurface, Node.EventType.TOUCH_MOVE, 81, 60, 0)
    assertStopped(game)
    resize(360, 800); tick(60)
    assert.deepEqual(game.run.snapshot(), expected)
    assert.equal(storage.getItem(campaign.TOWER_CAMPAIGN_KEY), checkpoint)
    assert.deepEqual(storage.writes, [], 'blocked updates and repeated portrait renders never rewrite the checkpoint')
    resize(844, 390)
    assert.equal(game.orientationBlocked, false)
    assert.equal(gate.isValid, false)
    assert.equal(viewport.policies.at(-1), 2)
    assert.equal(game.landscape, true)
    assert.deepEqual(game.run.snapshot(), expected)
    tick(1)
    assert.deepEqual(game.run.snapshot(), expected, 'rotation alone cannot resume combat')
    assert.equal(storage.getItem(campaign.TOWER_CAMPAIGN_KEY), checkpoint)
    assert.deepEqual(storage.writes, [])
    press(game, '继续挑战')
    assert.equal(game.run.state.phase, 'playing')
    game.update(0); game.update(1 / 30)
    assert.ok(game.run.state.time > before.time)
    assert.deepEqual(game.run.state.input, { x: 0, y: 0 })
    assert.equal(game.run.state.player.hp, before.player.hp)
    assert.equal(validateTowerSnapshot(game.run.snapshot()), true)
  })
}

test('fixed bottom-left joystick keeps its origin, applies a deadzone, and clamps actual Run movement', t => {
  const storage = disk()
  seed(storage)
  const { game } = launch(t, storage, { assisted: false, frame: { width: 844, height: 390 } })
  game.enterFloor(1)
  game.update(0)
  const surface = joystick(game), origin = { ...surface.position }
  assert.ok(origin.x < 0 && origin.y < 0)
  assertTargetsInFrame(game, [surface, button(game, '暂停'), button(game, '技能')])
  const player = { ...game.run.state.player }

  touch(game, surface, Node.EventType.TOUCH_START, 7, 3, 4)
  game.update(1 / 30)
  assert.deepEqual(game.run.state.input, { x: 0, y: 0 })
  assert.equal(game.run.state.player.x, player.x)
  assert.equal(game.run.state.player.y, player.y)

  touch(game, surface, Node.EventType.TOUCH_MOVE, 7, 36, 0)
  game.update(1 / 30)
  assert.ok(game.run.state.input.x > 0 && game.run.state.input.x < 1, 'partial throw stays analog')
  assert.equal(game.run.state.input.y, 0)
  assert.ok(game.run.state.player.x > player.x)

  touch(game, surface, Node.EventType.TOUCH_MOVE, 7, 3000, 4000)
  game.update(1 / 30)
  assert.ok(Math.abs(Math.hypot(game.run.state.input.x, game.run.state.input.y) - 1) < 1e-10)
  assert.ok(Math.abs(game.run.state.input.x - 0.6) < 1e-10)
  assert.ok(Math.abs(game.run.state.input.y - 0.8) < 1e-10)
  assert.deepEqual(surface.position, origin)
  assert.equal(game.stick.x, origin.x)
  assert.equal(game.stick.y, origin.y)
})

for (const release of [Node.EventType.TOUCH_END, Node.EventType.TOUCH_CANCEL]) {
  test(`joystick ${release} clears movement and a later touch reuses the fixed origin`, t => {
    const storage = disk()
    seed(storage)
    const { game } = launch(t, storage, { assisted: false, frame: { width: 1280, height: 720 } })
    game.enterFloor(1)
    game.update(0)
    const surface = joystick(game), origin = { ...surface.position }
    touch(game, surface, Node.EventType.TOUCH_START, 4, 60, 0)
    game.update(1 / 30)
    assert.ok(game.run.state.input.x > 0)
    touch(game, surface, release, 4)
    assertStopped(game)
    const player = { ...game.run.state.player }
    game.update(1 / 30)
    assert.deepEqual(game.run.state.input, { x: 0, y: 0 })
    assert.equal(game.run.state.player.x, player.x)
    assert.equal(game.run.state.player.y, player.y)
    touch(game, surface, Node.EventType.TOUCH_START, 9, -36, 0)
    game.update(1 / 30)
    assert.ok(game.run.state.input.x < 0)
    assert.deepEqual(surface.position, origin)
  })
}

test('secondary touches cannot steal, redirect or release the active joystick touch', t => {
  const storage = disk()
  seed(storage)
  const { game } = launch(t, storage, { assisted: false, frame: { width: 1280, height: 720 } })
  game.enterFloor(1)
  game.update(0)
  const surface = joystick(game)
  touch(game, surface, Node.EventType.TOUCH_START, 11, 36, 0)
  const input = { ...game.stick }
  for (const event of Object.values(Node.EventType)) {
    touch(game, surface, event, 12, -60, 0)
    assert.equal(game.touch, 11)
    assert.deepEqual(copy(game.stick), input)
  }
  game.update(1 / 30)
  assert.ok(game.run.state.input.x > 0)
  touch(game, surface, Node.EventType.TOUCH_CANCEL, 11)
  assertStopped(game)
})

test('right-side field touches cannot relocate or start the fixed joystick', t => {
  const storage = disk()
  seed(storage)
  const { game } = launch(t, storage, { assisted: false, frame: { width: 844, height: 390 } })
  game.enterFloor(1)
  game.update(0)
  const surface = joystick(game), origin = { ...surface.position }
  const movementSurfaces = descendants(game.battle).filter(node => node.events.has(Node.EventType.TOUCH_START))
  assert.deepEqual(movementSurfaces, [surface], 'the whole field must not own a movement handler')
  // Even if a touch outside the hit area reaches the handler, it cannot claim it.
  touch(game, surface, Node.EventType.TOUCH_START, 13, 900, 100)
  touch(game, surface, Node.EventType.TOUCH_MOVE, 13, 800, 100)
  game.update(1 / 30)
  assertStopped(game)
  assert.deepEqual(game.run.state.input, { x: 0, y: 0 })
  assert.deepEqual(surface.position, origin)
})

for (const panel of ['暂停', '技能']) {
  test(`${panel} resets a held stick, ignores late touch events, and resumes without movement`, t => {
    const storage = disk()
    seed(storage)
    const { game } = launch(t, storage, { assisted: false, frame: { width: 844, height: 390 } })
    game.enterFloor(1)
    game.update(0)
    const oldSurface = joystick(game)
    touch(game, oldSurface, Node.EventType.TOUCH_START, 15, 60, 0)
    game.update(1 / 30)
    assert.ok(game.run.state.input.x > 0)
    press(game, panel)
    assertStopped(game)
    assert.equal(game.run.state.phase, 'paused')
    assert.equal(game.store.state.activeRun.snapshot.phase, 'paused')
    assert.equal(game.screen, panel === '技能' ? 'skills' : 'battle')
    touch(game, oldSurface, Node.EventType.TOUCH_MOVE, 15, 100, 0)
    touch(game, oldSurface, Node.EventType.TOUCH_END, 15)
    assertStopped(game)
    const paused = game.run.snapshot()
    game.update(1)
    assert.deepEqual(game.run.snapshot(), paused)
    press(game, panel === '技能' ? '返回战斗' : '继续挑战')
    game.update(0)
    game.update(1 / 30)
    assert.equal(game.run.state.phase, 'playing')
    assert.deepEqual(game.run.state.input, { x: 0, y: 0 })
    assert.equal(game.run.state.player.x, paused.player.x)
    assert.equal(game.run.state.player.y, paused.player.y)
  })
}

test('landscape resize releases a held stick and places its replacement at the new bottom-left', t => {
  const storage = disk()
  seed(storage)
  const { game, resize } = launch(t, storage, { assisted: false })
  game.enterFloor(1)
  game.update(0)
  const oldSurface = joystick(game)
  const oldSize = { ...game.root.getComponent(UITransform).contentSize }
  const inset = { x: oldSurface.position.x + oldSize.width / 2, y: oldSurface.position.y + oldSize.height / 2 }
  touch(game, oldSurface, Node.EventType.TOUCH_START, 20, 36, 0)
  game.update(1 / 30)
  const before = game.run.snapshot(), saved = storage.getItem(campaign.TOWER_CAMPAIGN_KEY)
  resize(844, 390)
  assertStopped(game)
  assert.deepEqual(game.run.snapshot(), { ...before, input: { x: 0, y: 0 } })
  assert.equal(storage.getItem(campaign.TOWER_CAMPAIGN_KEY), saved)
  assert.equal(oldSurface.isValid, false)
  const surface = joystick(game), size = game.root.getComponent(UITransform).contentSize
  assert.notStrictEqual(surface, oldSurface)
  assert.ok(Math.abs(surface.position.x + size.width / 2 - inset.x) < 1e-10)
  assert.ok(Math.abs(surface.position.y + size.height / 2 - inset.y) < 1e-10)
  touch(game, oldSurface, Node.EventType.TOUCH_MOVE, 20, 60, 0)
  assertStopped(game)
})

for (const frame of [{ width: 1280, height: 720 }, { width: 844, height: 390 }]) {
  test(`landscape ${frame.width}×${frame.height} pause and tool targets fit in two columns and keep real tool actions`, t => {
    const storage = disk(), original = seed(storage, { hp: 17.5, paused: true })
    const { game } = launch(t, storage, { frame })
    const before = game.run.snapshot()
    let targets = descendants(game.overlay).filter(node => node.getComponent(Button))
    assert.equal(targets.length, 5)
    assert.ok(targets.some(node => node.name === '背包'))
    assert.equal(new Set(targets.map(node => node.position.x)).size, 2)
    assertTargetsInFrame(game, targets)
    press(game, '开发者工具')
    targets = descendants(game.overlay).filter(node => node.getComponent(Button))
    assert.equal(targets.length, 6)
    assert.equal(new Set(targets.map(node => node.position.x)).size, 2)
    assert.equal(new Set(targets.map(node => node.position.y)).size, 3)
    assertTargetsInFrame(game, [...targets, ...game.overlay.children.filter(node => node.getComponent(Label))])
    const saved = storage.getItem(playtest.TOWER_PLAYTEST_KEY)
    storage.writes.length = 0
    press(game, '游戏速度设置')
    press(game, '游戏速度 ×3')
    press(game, '无敌：关闭')
    assert.deepEqual(copy(game.tools), { speed: 3, invincible: true })
    assert.deepEqual(playtest.readPlaytestTools(storage), { speed: 3, invincible: true })
    assert.deepEqual(game.run.snapshot(), before)
    assert.equal(storage.getItem(playtest.TOWER_PLAYTEST_KEY), saved)
    ordinaryUnchanged(storage, original)
    press(game, '返回战斗')
    assert.equal(game.run.state.phase, 'playing')
    assert.equal(game.run.state.player.hp, 17.5)
    assertTargetsInFrame(game, [joystick(game), button(game, '暂停'), button(game, '技能')])
  })
}

for (const frame of [{ width: 1920, height: 280 }, { width: 3840, height: 1080 }]) {
  test(`extreme ${frame.width}×${frame.height} letterboxes combat and tools, then restores fixed-width without losing state`, t => {
    const storage = disk(), original = seed(storage)
    const { game, resize, viewport } = launch(t, storage, { frame })
    assert.equal(viewport.policies.at(-1), 1, 'short landscape uses SHOW_ALL')
    assert.deepEqual(viewport.design, { width: 1280, height: 560 })
    assert.ok(game.root.getComponent(UITransform).contentSize.height >= 560)
    game.enterFloor(1)
    game.update(0)
    const startTime = game.run.state.time
    assert.doesNotThrow(() => game.update(0.1))
    assert.ok(game.run.state.time > startTime, 'combat actually advances')
    const edgesFromPlayer = () => {
      const { player: p, view: v } = game.run.state
      assert.ok(v && v.xmin < v.xmax && v.ymin < v.ymax, 'ordered combat viewport')
      assert.ok(p.x - p.radius >= v.xmin && p.x + p.radius <= v.xmax, 'full player width is visible')
      assert.ok(p.y - p.radius >= v.ymin && p.y + p.radius <= v.ymax, 'full player height is visible')
      assert.equal(v.followPlayer, true, 'host opts into substep camera following')
      return [v.xmin - p.x, v.xmax - p.x, v.ymin - p.y, v.ymax - p.y]
    }
    const initialEdges = edgesFromPlayer(), initialY = game.run.state.player.y
    const surface = joystick(game)
    touch(game, surface, Node.EventType.TOUCH_START, 30, 0, -60)
    for (let i = 0; i < 3; i++) {
      assert.doesNotThrow(() => game.update(0.1))
      edgesFromPlayer().forEach((edge, index) => {
        assert.ok(Math.abs(edge - initialEdges[index]) < 1e-8, 'viewport follows movement within each advance batch')
      })
      assert.equal(validateTowerSnapshot(game.run.snapshot()), true)
    }
    assert.ok(game.run.state.player.y < initialY)
    touch(game, surface, Node.EventType.TOUCH_END, 30)
    press(game, '暂停')
    assertStopped(game)
    assert.equal(game.pending, null)
    assert.equal(game.store.state.activeRun.snapshot.phase, 'paused')
    press(game, '开发者工具')
    const targets = descendants(game.overlay).filter(node => node.getComponent(Button))
    const text = game.overlay.children.filter(node => node.getComponent(Label))
    assert.equal(targets.length, 6)
    assert.equal(new Set(targets.map(node => node.position.x)).size, 2)
    assert.equal(new Set(targets.map(node => node.position.y)).size, 3)
    assert.equal(text.length, 2, 'tool title and body both exist')
    for (const node of text) assert.ok(node.getComponent(UITransform).contentSize.height > 0, `${node.name}: positive text height`)
    assertTargetsInFrame(game, [...targets, ...text])
    assert.deepEqual(TowerRun.restore(game.run.snapshot()).snapshot(), game.run.snapshot())

    const before = game.run.snapshot(), state = game.store.state
    const saved = storage.getItem(playtest.TOWER_PLAYTEST_KEY)
    storage.writes.length = 0
    for (const [width, height, policy, logicalWidth] of [
      [844, 390, 2, 1280],
      [1024, 600, 2, 1280],
      [frame.width, frame.height, 1, 1280],
      [844, 390, 2, 1280],
    ]) {
      resize(width, height)
      assert.equal(viewport.policies.at(-1), policy, 'letterboxing must not stick after resizing')
      const size = game.root.getComponent(UITransform).contentSize
      assert.equal(size.width, logicalWidth)
      assert.ok(size.height >= 560)
      if (policy === 2) assert.ok(Math.abs(size.height - logicalWidth * height / width) < 1e-8)
      assert.deepEqual(game.run.snapshot(), before, 'HP, RNG, loot and pending simulation are unchanged')
      assert.strictEqual(game.store.state, state)
      assert.equal(storage.getItem(playtest.TOWER_PLAYTEST_KEY), saved)
      assert.deepEqual(storage.writes, [])
    }
    ordinaryUnchanged(storage, original)
  })
}

function tigerSectorSnapshot(loadout, faceX, faceY) {
  const run = new TowerRun({ attemptId: 1, floor: 7, seed: 123, hp: 100, xp: 0, loadout, arenaVersion: 1 })
  // Real authored enemy membership and attack data. Only isolate the target
  // and position it relative to the player; do not fabricate a warning zone.
  run.state.cooldowns.sj_yujian = 99999
  run.advance(2)
  const tiger = run.state.enemies.find(enemy => enemy.archetype === 'tiger_normal')
  assert.ok(tiger, 'floor seven actually spawns a normal tiger')
  for (const enemy of run.state.enemies) {
    Object.assign(enemy, { x: -500, y: -400 })
    Object.assign(enemy.ai, { entryUntil: 99999, graceUntil: 99999 })
  }
  tiger.x = run.state.player.x - faceX * 100
  tiger.y = run.state.player.y - faceY * 100
  Object.assign(tiger.ai, { entryUntil: 0, graceUntil: 0, readyAt: 0 })
  run.state.nextWindupAt = 0
  for (let i = 0; i < 120 && !tiger.ai.attack?.locked; i++) run.advance(1 / 60)
  assert.equal(tiger.ai.mode, 'windup')
  assert.equal(tiger.ai.attack.locked, true)
  assert.equal(tiger.ai.attack.hit, false)
  assert.equal(tiger.ai.attack.shape, 'sector')
  assert.equal(tiger.ai.attack.angle, 140)
  assert.equal(tiger.ai.attack.dirX, faceX)
  assert.equal(tiger.ai.attack.dirY, faceY)
  // Subsequent forks resolve this attack alone, without new attack requests.
  run.state.nextWindupAt = 99999
  const snapshot = run.snapshot()
  assert.equal(validateTowerSnapshot(snapshot), true)
  return { snapshot, ownerId: tiger.id }
}

for (const [direction, faceX, faceY] of [
  ['up', 0, 1], ['down', 0, -1], ['left', -1, 0], ['right', 1, 0],
]) {
  test(`real host ${direction} sector arc matches the locked 140-degree Run warning and actual hit direction`, t => {
    const storage = disk()
    seed(storage)
    const { game } = launch(t, storage, { assisted: false, frame: { width: 844, height: 390 } })
    const { snapshot, ownerId } = tigerSectorSnapshot(campaign.combatLoadout(game.store.state), faceX, faceY)
    const warning = snapshot.zones.find(zone => zone.ownerId === ownerId && zone.renderOnly)
    assert.equal(warning.kind, 'enemy_windup')
    assert.equal(warning.phase, 'windup')
    assert.equal(warning.faceX, faceX)
    assert.equal(warning.faceY, faceY)
    const attack = snapshot.enemies.find(enemy => enemy.id === ownerId).ai.attack
    game.run = TowerRun.restore(snapshot)
    game.screen = 'battle'
    game.render()
    const saved = storage.getItem(campaign.TOWER_CAMPAIGN_KEY)
    game.warnings.recordArcs = true // Hostile warnings render above monster artwork.
    game.draw()
    const arcs = game.warnings.arcCalls.filter(args => Math.abs(args[2] - attack.range) < 1e-8)
    assert.equal(arcs.length, 1, 'one sector arc at the authored attack reach')
    const [x, y, radius, startAngle, endAngle, counterclockwise] = arcs[0]
    const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`)
    near(x, warning.x - game.camera.x)
    near(y, warning.y - game.camera.y)
    near(radius, attack.range)
    near(endAngle - startAngle, 140 * Math.PI / 180)
    near(Math.cos((startAngle + endAngle) / 2), faceX)
    near(Math.sin((startAngle + endAngle) / 2), faceY)
    assert.equal(counterclockwise, false)
    assert.deepEqual(game.run.snapshot(), snapshot, 'drawing must not change combat or facing')
    assert.equal(storage.getItem(campaign.TOWER_CAMPAIGN_KEY), saved)

    for (const sign of [1, -1]) {
      const run = TowerRun.restore(snapshot)
      run.state.player.x = attack.x + sign * faceX * 100
      run.state.player.y = attack.y + sign * faceY * 100
      assert.equal(validateTowerSnapshot(run.snapshot()), true)
      const hp = run.state.player.hp, tiger = run.state.enemies.find(enemy => enemy.id === ownerId)
      for (let i = 0; i < 120 && tiger.ai.mode === 'windup'; i++) run.advance(1 / 60)
      assert.equal(tiger.ai.mode, 'active')
      assert.equal(tiger.ai.attack.hit, sign === 1, 'locked sector hits in front and misses behind')
      near(hp - run.state.player.hp, sign === 1 ? Math.min(hp, attack.damage) : 0)
      assert.equal(validateTowerSnapshot(run.snapshot()), true)
    }
  })
}

// Record only the drawing boundary under inspection; keep the real host draw
// path and canonical Run/campaign modules. Render fixtures below deliberately
// set display states without treating those mutations as gameplay progression.
function recordRects(graphics) {
  const calls = []
  graphics.rect = (...rect) => calls.push({ rect, color: copy(graphics.fillColor) })
  return calls
}

for (const frame of [{ width: 1280, height: 720 }, { width: 1024, height: 600 }, { width: 844, height: 390 }, { width: 1920, height: 280 }]) {
  test(`lightweight HUD stays fixed and keeps safe targets at ${frame.width}×${frame.height}`, t => {
    const storage = disk(); seed(storage)
    const { game } = launch(t, storage, { assisted: false, frame })
    game.enterFloor(1); game.update(0)
    const names = ['PlayerVitals', 'HPBar', 'Portrait', 'PaperArtwork', 'RealmLabel', 'FloorWave', 'Boss', 'Minimap', 'Notification', 'Skills', 'Pause', 'SkillPointBadge']
    const nodes = names.map(name => named(game.battle, `HUD.${name}`))
    const bounds = nodes.map(node => rectWithin(node, game.root))
    const size = game.root.getComponent(UITransform).contentSize
    for (let i = 0; i < nodes.length; i++) {
      const box = bounds[i]
      assert.ok(box.left >= -size.width / 2 && box.right <= size.width / 2, `${names[i]} horizontal bounds`)
      assert.ok(box.bottom >= -size.height / 2 && box.top <= size.height / 2, `${names[i]} vertical bounds`)
    }
    assertTargetsInFrame(game, ['PlayerVitals', 'FloorWave', 'Boss', 'Minimap', 'Notification', 'Skills', 'Pause']
      .map(name => named(game.battle, `HUD.${name}`)).concat(joystick(game)))
    assert.equal(named(game.battle, 'HUD.Notification').active, false, 'no permanent instruction slab')
    const surface = joystick(game)
    touch(game, surface, Node.EventType.TOUCH_START, 91, 60, 0)
    const x = game.run.state.player.x
    game.update(.1)
    assert.ok(game.run.state.player.x > x)
    assert.deepEqual(nodes.map(node => rectWithin(node, game.root)), bounds, 'world movement cannot move fixed HUD')
    assert.equal(named(game.battle, 'HUD.SkillPointBadge').active, false)
    assert.equal(named(game.battle, 'HUD.SkillPointBadge').children.length, 0)
  })
}

test('paper battle HUD HP ratio stays readable and skill points remain actionable', t => {
  const storage = disk(); seed(storage, { hp: 17.5, patch: { xp: profile.TOWER_XP_CAP } })
  const { game } = launch(t, storage, { assisted: false })
  game.enterFloor(1)
  const hp = []; game.hpBar.roundRect = (...rect) => hp.push(rect)
  const before = game.run.snapshot(), saved = storage.getItem(campaign.TOWER_CAMPAIGN_KEY)
  game.draw()
  assert.equal(game.hpLabel.string, `18/${Math.round(before.player.maxHp)}`)
  assert.equal(hp.length, 2)
  assert.ok(Math.abs(hp[1][2] / 200 - 17.5 / before.player.maxHp) < 1e-10)
  assert.ok(game.xpBar)
  assert.equal(game.stats.string, '金丹 · 大圆满')
  assert.doesNotMatch(labelText(game.battle), /修为\d+%/)
  assert.doesNotMatch(labelText(game.battle), /NaN|undefined|Infinity/)
  const available = growth.growthSummary(game.store.state).available
  assert.ok(available > 0)
  assert.equal(game.skillBadge.active, true)
  assert.equal(game.skillBadge.children.length, 0)
  assert.equal(game.skillBadge.getComponent(Label), null)
  assert.deepEqual(game.run.snapshot(), before)
  assert.equal(storage.getItem(campaign.TOWER_CAMPAIGN_KEY), saved)
  // HP remains red and numeric at 25%; only the filled geometry changes.
  game.run.state.player.hp = before.player.maxHp / 4
  const dangerColor = copy(game.hpBar.fillColor)
  hp.length = 0
  game.draw()
  assert.match(game.hpLabel.string, /^\d+\/\d+$/)
  assert.equal(hp[1][2] / 200, .25)
  assert.deepEqual(copy(game.hpBar.fillColor), dangerColor)
  // Restore the valid checkpoint before exercising a persistent action.
  game.run.state.player.hp = before.player.hp
  press(game, '技能')
  assert.equal(game.screen, 'skills')
  assert.equal(game.run.state.phase, 'paused')
})

test('only the attacked monster appears in the centered health panel', t => {
  const storage = disk(); seed(storage)
  const { game } = launch(t, storage, { assisted: false })
  game.enterTraining(); game.run.advance(2)
  const template = game.run.state.enemies[0], p = game.run.state.player
  const enemies = ['normal', 'elite', 'boss'].map((role, i) => ({ ...copy(template),
    id: 900 + i, role, name: `${role}-fixture`, rank: 3, hp: 100, maxHp: 100,
    x: p.x + 100 + i * 100, y: p.y,
  }))
  game.run.state.enemies = enemies; game.run.state.drops = []
  const rects = recordRects(game.foreground), bars = recordRects(game.bossBar)
  game.draw()
  assert.equal(game.bossPanel.active, false, 'a full-health idle boss is not an attack target')
  enemies[0].hp = 40
  const before = game.run.snapshot(), saved = storage.getItem(campaign.TOWER_CAMPAIGN_KEY)
  rects.length = 0; bars.length = 0; game.draw()
  assert.equal(game.bossPanel.active, true)
  assert.match(game.bossLabel.string, /normal-fixture.*40\/100/)
  assert.equal(bars[1].rect[2] / bars[0].rect[2], .4)
  assert.equal(rects.filter(c => c.rect[3] === 5).length, 0, 'no floating monster health bars')
  assert.deepEqual(game.run.snapshot(), before)
  assert.equal(storage.getItem(campaign.TOWER_CAMPAIGN_KEY), saved)
  enemies[1].hp = 60; game.draw()
  assert.match(game.bossLabel.string, /elite-fixture.*60\/100/)
  enemies[0].hp = 30; enemies[1].hp = 50; game.draw()
  assert.match(game.bossLabel.string, /elite-fixture/, 'area damage keeps a stable current target')
  enemies[1].hp = 0; game.draw()
  assert.equal(game.bossPanel.active, false, 'death clears the panel without selecting an idle monster')
  enemies[2].hp = 80; game.draw()
  assert.match(game.bossLabel.string, /boss-fixture.*80\/100/)
  game.run.state.enemies = []; game.draw()
  assert.equal(game.bossPanel.active, false)
  assert.equal(game.enemyHealth.size, 0)
})

test('queued notices display in order, keep simulation-time durations through pause, then disappear', t => {
  const storage = disk(); seed(storage)
  const { game, tick } = launch(t, storage, { assisted: false })
  game.enterTraining(); game.update(0)
  game.enqueueNotice('突破筑基！', 3)
  game.enqueueNotice('领悟 新功法', 4)
  game.draw()
  assert.equal(game.foot.string, '突破筑基！')
  assert.equal(game.noticePanel.active, true)
  assert.equal(game.notices.length, 1)
  const firstExpiry = game.breakthroughUntil
  press(game, '暂停')
  const paused = game.run.snapshot()
  tick(60)
  assert.deepEqual(game.run.snapshot(), paused)
  assert.equal(game.foot.string, '突破筑基！')
  assert.equal(game.breakthroughUntil, firstExpiry)
  press(game, '继续挑战')
  game.update(0)
  // Advance real simulation through both notice deadlines.
  for (let i = 0; i < 29; i++) game.update(.1)
  assert.equal(game.foot.string, '突破筑基！')
  for (let i = 0; i < 3 && game.foot.string !== '领悟 新功法'; i++) game.update(.1)
  assert.equal(game.foot.string, '领悟 新功法')
  assert.equal(game.notices.length, 0)
  assert.equal(game.breakthroughUntil - game.run.state.time, 4)
  for (let i = 0; i < 39; i++) game.update(.1)
  assert.equal(game.foot.string, '领悟 新功法')
  for (let i = 0; i < 3 && game.noticePanel.active; i++) game.update(.1)
  assert.equal(game.foot.string, '')
  assert.equal(game.noticePanel.active, false)
  game.enqueueNotice('stale battle message', 3)
  game.withdraw()
  assert.equal(game.notices.length, 0)
  assert.equal(game.breakthroughText, '')
})

test('passive skills do not imply damaging aura rings and rendering remains read-only', t => {
  const storage = disk(); seed(storage)
  const { game } = launch(t, storage, { assisted: false })
  game.enterTraining()
  const ids = ['sj_heart', 'vajra', 'magnet', 'sj_mark', 'sj_bone', 'sj_gate']
  game.run.state.enemies = []; game.run.state.effects = []; game.run.state.zones = []
  for (const id of ids) {
    game.run.state.loadout.passive = { [id]: 1 }
    const before = game.run.snapshot(), saved = storage.getItem(campaign.TOWER_CAMPAIGN_KEY)
    const calls = [], graphics = new Graphics()
    for (const method of ['moveTo', 'lineTo', 'circle', 'stroke', 'fill'])
      graphics[method] = (...args) => calls.push([method, ...args])
    game.skillEffects.draw(graphics, game.run.state, game.camera)
    assert.deepEqual(calls, [], `${id} alone must not paint an attack or shield area`)
    assert.deepEqual(game.run.snapshot(), before)
    assert.equal(storage.getItem(campaign.TOWER_CAMPAIGN_KEY), saved)
  }
  game.run.state.loadout.passive = Object.fromEntries(ids.map(id => [id, 1]))
  const draw = game.skillEffects.draw.bind(game.skillEffects)
  let draws = 0
  game.skillEffects.draw = (graphics, state, camera) => {
    assert.strictEqual(graphics, game.world)
    assert.strictEqual(state, game.run.state)
    draws++; draw(graphics, state, camera)
  }
  const before = game.run.snapshot()
  game.draw()
  assert.equal(draws, 1, 'host invokes the geometry renderer once')
  assert.deepEqual(game.run.snapshot(), before)
})

test('playtest point grant is real, repeatable to 999, and reset requires confirmation', t => {
  const storage = disk(), original = seed(storage, { patch: investedSkillFixture() })
  const { game } = launch(t, storage)
  press(game, '开发者工具')
  press(game, '成长与存档')
  press(game, '剩余技能点设为999')
  assert.equal(growth.growthSummary(game.store.state).available, 999)
  assert.ok(hasLabel(game.overlay, '剩余技能点 999'))
  const before = copy(game.store.state)
  press(game, '重新开始')
  press(game, '取消')
  assert.deepEqual(game.store.state, before)
  press(game, '重新开始')
  press(game, '确认重新开始')
  assert.equal(game.screen, 'camp')
  assert.equal(game.run, null)
  assert.equal(game.store.state.xp, 0)
  assert.deepEqual(game.store.state.skills, { sj_arc: 1 })
  assert.equal(growth.growthSummary(game.store.state).available, 0)
  assert.equal(game.store.state.activeRun, null)
  ordinaryUnchanged(storage, original)
})

test('normal mode cannot execute experience reset or skill grant', t => {
  const storage = disk(), original = seed(storage)
  const { game } = launch(t, storage, { assisted: false })
  storage.writes.length = 0 // normal host startup sync is legitimate; the debug actions must not write
  const before = copy(game.store.state)
  game.editPlaytest('playtestSkillPoints'); game.editPlaytest('playtestReset')
  assert.deepEqual(game.store.state, before)
  press(game, '开发者工具')
  assert.ok(!hasLabel(game.overlay, '剩余技能点设为999'))
  assert.ok(!hasLabel(game.overlay, '重新开始'))
  ordinaryUnchanged(storage, original)
})

test('failed playtest reset retains paused run and earned skills', t => {
  const storage = disk(), original = seed(storage, { paused: true })
  const { game } = launch(t, storage)
  const before = copy(game.store.state), run = game.run
  game.showTools(); press(game, '成长与存档'); press(game, '重新开始')
  storage.blockedWrites.add(playtest.TOWER_PLAYTEST_KEY)
  press(game, '确认重新开始')
  assert.deepEqual(game.store.state, before)
  assert.strictEqual(game.run, run)
  assert.ok(hasLabel(game.overlay, '体验操作未完成'))
  ordinaryUnchanged(storage, original)
})

test('one-click top-grade grants are repeatable and preserve ordinary saves', t => {
  const storage = disk(), original = seed(storage)
  const { game } = launch(t, storage)
  press(game, '开发者工具')
  let expected = game.store.state.spiritStones
  const contribution = game.store.state.contribution
  for (let i = 0; i < 2; i++) {
    press(game, '+999 极品灵石')
    expected += 999000000
    assert.equal(game.store.state.spiritStones, expected)
    assert.ok(hasLabel(game.overlay, economy.formatSpiritStones(expected)))
    assert.equal(game.store.state.contribution, contribution)
  }
  assert.ok(!hasLabel(game.overlay, '灵石补给'))
  assert.ok(!hasLabel(game.overlay, '宗门贡献'))
  const reloaded = new campaign.TowerCampaignStore(playtest.playtestStorage(storage), START)
  assert.deepEqual(reloaded.state, game.store.state)
  ordinaryUnchanged(storage, original)
})

test('camp level button reaches 27 with natural SP and no extra healing', t => {
  const storage = disk(), original = seed(storage, { hp: 17.5 })
  const { game } = launch(t, storage)
  press(game, '开发者工具'); press(game, '成长与存档')
  press(game, '升至金丹巅峰（27级，仅场外）')
  assert.equal(game.store.state.xp, profile.TOWER_XP_CAP)
  assert.equal(game.store.state.hp, 17.5)
  assert.equal(growth.growthSummary(game.store.state).available, 30)
  assert.equal(game.store.state.clearedFloor, 0)
  assert.ok(hasLabel(game.overlay, '已提升至金丹巅峰'))
  press(game, '返回工具'); press(game, '返回宗门')
  assert.equal(game.menu.state.xp, profile.TOWER_XP_CAP)
  ordinaryUnchanged(storage, original)
})

test('in-tower level button gives a short exit hint; resource grants keep the run paused and intact', t => {
  const storage = disk(), original = seed(storage, { paused: true, hp: 17.5 })
  const { game } = launch(t, storage)
  press(game, '开发者工具'); press(game, '成长与存档')
  const snapshot = game.run.snapshot(), state = copy(game.store.state), writes = storage.writes.length
  press(game, '升至金丹巅峰（27级，仅场外）')
  assert.ok(hasLabel(game.overlay, '请先退塔'))
  assert.deepEqual(game.store.state, state)
  assert.deepEqual(game.run.snapshot(), snapshot)
  assert.equal(storage.writes.length, writes)
  press(game, '返回工具'); press(game, playtest.PLAYTEST_RESOURCE_ACTIONS[0].label)
  assert.deepEqual(game.run.snapshot(), snapshot)
  assert.equal(game.run.state.phase, 'paused')
  press(game, '返回战斗')
  assert.equal(game.run.state.phase, 'playing')
  assert.equal(game.run.state.player.hp, 17.5)
  ordinaryUnchanged(storage, original)
})

test('resource write failures show errors without publishing grants', t => {
  const storage = disk(), original = seed(storage, { paused: true })
  const { game } = launch(t, storage)
  press(game, '开发者工具')
  const state = copy(game.store.state), snapshot = game.run.snapshot(), run = game.run
  storage.blockedWrites.add(playtest.TOWER_PLAYTEST_KEY)
  press(game, playtest.PLAYTEST_RESOURCE_ACTIONS[0].label)
  assert.ok(hasLabel(game.overlay, '体验操作未完成'))
  assert.ok(hasLabel(game.overlay, '保存失败'))
  assert.deepEqual(game.store.state, state); assert.strictEqual(game.run, run)
  assert.deepEqual(game.run.snapshot(), snapshot)
  storage.blockedWrites.clear()
  press(game, '返回'); press(game, playtest.PLAYTEST_RESOURCE_ACTIONS[0].label)
  assert.equal(game.store.state.spiritStones, state.spiritStones + 999000000)
  ordinaryUnchanged(storage, original)
})

test('full stone balance rejects the grant without changing the save', t => {
  const storage = disk(), original = seed(storage)
  const { game } = launch(t, storage)
  const envelope = JSON.parse(storage.getItem(playtest.TOWER_PLAYTEST_KEY))
  const data = JSON.parse(envelope.data)
  data.spiritStones = campaign.PLAYTEST_STONE_CAP
  envelope.data = JSON.stringify(data); envelope.checksum = checksum(envelope.data)
  storage.setItem(playtest.TOWER_PLAYTEST_KEY, JSON.stringify(envelope))
  game.store = new campaign.TowerCampaignStore(playtest.playtestStorage(storage), START)
  press(game, '开发者工具')
  const state = copy(game.store.state), raw = storage.getItem(playtest.TOWER_PLAYTEST_KEY)
  press(game, '+999 极品灵石')
  assert.ok(hasLabel(game.overlay, '资源已满'))
  assert.deepEqual(game.store.state, state)
  assert.equal(storage.getItem(playtest.TOWER_PLAYTEST_KEY), raw)
  press(game, '返回')
  assert.ok(hasLabel(game.overlay, '+999 极品灵石'))
  ordinaryUnchanged(storage, original)
})

test('tools checkpoint a locally paused restored run before enabling resource actions', t => {
  const storage = disk(); seed(storage)
  const normal = new campaign.TowerCampaignStore(storage, START)
  assert.ok(normal.act({ type: 'startFloor', floor: 1, seed: 123 }, START).ok)
  const original = storage.getItem(campaign.TOWER_CAMPAIGN_KEY)
  storage.writes.length = 0
  const { game } = launch(t, storage)
  assert.equal(game.run.state.phase, 'paused')
  assert.equal(game.store.state.activeRun.snapshot.phase, 'playing')
  press(game, '开发者工具')
  assert.equal(game.store.state.activeRun.snapshot.phase, 'paused')
  const before = game.run.snapshot(), balance = game.store.state.spiritStones
  press(game, playtest.PLAYTEST_RESOURCE_ACTIONS[0].label)
  assert.equal(game.store.state.spiritStones, balance + 999000000)
  assert.deepEqual(game.run.snapshot(), before)
  ordinaryUnchanged(storage, original)
})

test('normal mode cannot invoke resource or level actions through tool methods', t => {
  const storage = disk(), original = seed(storage)
  const { game } = launch(t, storage, { assisted: false })
  storage.writes.length = 0
  const before = copy(game.store.state)
  for (const row of playtest.PLAYTEST_RESOURCE_ACTIONS) game.editPlaytest(row.action.type, row.action)
  game.showPlaytestResources(); game.showTools()
  assert.deepEqual(game.store.state, before)
  assert.ok(!hasLabel(game.overlay, '+999 极品灵石'))
  ordinaryUnchanged(storage, original)
})

for (const frame of [{ width: 1280, height: 720 }, { width: 844, height: 390 }, { width: 1920, height: 280 }]) {
  test(`grouped tool menus fit ${frame.width}x${frame.height} without overlapping labels or buttons`, t => {
    const storage = disk(); seed(storage)
    const { game } = launch(t, storage, { frame })
    const check = expected => {
      const targets = descendants(game.overlay).filter(node => node.getComponent(Button))
      assert.equal(targets.length, expected)
      const labels = game.overlay.children.filter(node => node.getComponent(Label))
      assertTargetsInFrame(game, [...targets, ...labels])
      for (const node of labels) assert.ok(node.getComponent(UITransform).contentSize.height >= 66)
    }
    press(game, '开发者工具'); check(6)
    press(game, '游戏速度设置'); check(4)
    press(game, '返回工具'); press(game, '成长与存档'); check(4)
    press(game, '重新开始'); check(2)
  })
}

test('flight is a one-rank shared passive with real purchase, reload and refund', t => {
  const storage = disk(); seed(storage, { patch: { xp: profile.cultivationLevelXp(11) } })
  const { game, icons } = launch(t, storage, { assisted: false })
  game.menu.go('librarySkills'); press(game, '技能图标-sj_flight')
  assert.match(labelText(named(game.menu.root, '技能详情固定栏')), /25%/)
  assert.match(labelText(named(game.menu.root, '技能详情固定栏')), /50%/)
  assert.match(labelText(named(game.menu.root, '技能详情固定栏')), /0\/1级/)
  assert.ok(icons.requests.some(c => c.path === 'tower-skill-icons/sj_flight'), 'approved flight artwork is requested')
  const before = growth.growthSummary(game.store.state).available
  press(game, 'learnSkill-sj_flight')
  assert.equal(game.store.state.skills.sj_flight, 1)
  assert.equal(growth.growthSummary(game.store.state).available, before - 1)
  assert.equal(new campaign.TowerCampaignStore(storage, START).state.skills.sj_flight, 1)
  game.enterFloor(1)
  assert.equal(game.run.state.loadout.passive.sj_flight, 1)
  assert.equal(game.run.state.player.moveSpeed, 275)
  game.withdraw(); game.menu.go('librarySkills'); press(game, '技能图标-sj_flight'); press(game, 'decreaseSkill-sj_flight')
  assert.equal(game.store.state.skills.sj_flight || 0, 0)
  game.enterFloor(1)
  assert.equal(game.run.state.player.moveSpeed, 220)
})

for (const [xp, major] of [[44, false], [1484, true]]) {
  test(`actual kill starts a ${major ? 'major' : 'minor'} level animation only once`, t => {
    const storage = disk(); seed(storage, { patch: { xp } })
    const { game, tick } = launch(t, storage, { assisted: false })
    game.enterFloor(1); game.update(0)
    for (let i = 0; i < 40 && !game.run.state.enemies.length; i++) game.update(.1)
    const enemy = game.run.state.enemies[0]; assert.ok(enemy)
    enemy.hp = 0
    game.update(.1)
    assert.equal(game.levelEffects.length, 1)
    assert.equal(game.levelEffects[0].major, major)
    assert.equal(game.levelEffects[0].duration, major ? 2 : 1)
    const event = copy(game.levelEffects)
    game.draw(); game.draw(); assert.deepEqual(copy(game.levelEffects), event)
    press(game, '暂停'); tick(15)
    assert.deepEqual(copy(game.levelEffects), event, 'pause freezes simulated animation')
    press(game, '继续挑战')
    assert.deepEqual(copy(game.levelEffects), event, 'resume does not replay the effect')
    const reload = TowerRun.restore(game.run.snapshot())
    game.clearBattleFeedback(); game.run = reload; game.draw()
    assert.equal(game.levelEffects.length, 0, 'restoring an existing level does not create a new effect')
  })
}

test('avatar opens a bounded character overlay with actual attributes and read-only dismissal', t => {
  const storage = disk(); seed(storage, { xp: 2730 })
  const { game } = launch(t, storage, { assisted: false })
  const state = copy(game.store.state), saved = storage.getItem(campaign.TOWER_CAMPAIGN_KEY)
  const expected = combatStats(state.xp, campaign.combatLoadout(state))
  const format = n => `${Math.round(n * 10) / 10}`
  press(game, 'HUD.Portrait'); press(game, 'HUD.Portrait')
  assert.equal(game.menu.currentPage, 'hall')
  assert.equal(descendants(game.menu.root).filter(n => n.name === '角色信息面板').length, 1)
  const box = named(game.menu.root, '角色信息面板').getComponent(UITransform).contentSize
  assert.ok(box.width < game.menu.designWidth && box.height < game.menu.designHeight)
  for (const [name, value] of [['角色气血上限', expected.maxHp], ['角色攻击力', expected.attack], ['角色移动速度', expected.moveSpeed]]) {
    assert.equal(named(game.menu.root, name).getComponent(Label).string, format(value))
  }
  const shade = named(game.menu.root, '角色信息遮罩'), panel = named(shade, '角色信息面板')
  shade.events.get(Node.EventType.TOUCH_END)({target:panel})
  assert.ok(named(game.menu.root, '角色信息面板'), 'panel taps must not dismiss')
  shade.events.get(Node.EventType.TOUCH_END)({target:shade})
  assert.equal(game.menu.characterInfoOpen, false)
  press(game, 'HUD.Portrait'); press(game, '关闭角色信息')
  assert.equal(game.menu.characterInfoOpen, false)
  press(game, 'HUD.Portrait'); game.keyDown({keyCode:27})
  assert.equal(game.menu.characterInfoOpen, false)
  assert.deepEqual(copy(game.store.state), state)
  assert.equal(storage.getItem(campaign.TOWER_CAMPAIGN_KEY), saved)
})

test('character overlay follows camp healing and closes when leaving the hall', t => {
  const storage = disk(); seed(storage, { hp: 99.75 })
  const { game, tick } = launch(t, storage, { assisted: false, frame: {width:844,height:390} })
  press(game, 'HUD.Portrait')
  const panel = named(game.menu.root, '角色信息面板')
  tick(6)
  assert.equal(named(game.menu.root, '角色信息面板'), panel, 'partial healing keeps the overlay stable')
  assert.equal(named(panel, '角色当前气血').getComponent(Label).string, `${Math.ceil(game.store.state.hp)}/100`)
  tick(12)
  assert.equal(game.store.state.hp, 100)
  assert.ok(named(game.menu.root, '角色信息面板'), 'full-HP redraw preserves the open sheet')
  assert.equal(named(game.menu.root, '角色当前气血').getComponent(Label).string, '100/100')
  game.menu.render(game.store.state, 'home')
  assert.equal(game.menu.characterInfoOpen, false)
  game.menu.render(game.store.state, 'hall')
  assert.ok(!descendants(game.menu.root).some(n => n.name === '角色信息面板'))
})

test('paper HUD loads the existing character art, disposes assets and rejects stale callbacks', t => {
  const storage = disk(); seed(storage)
  const { game, icons } = launch(t, storage, { assisted: false })
  const pending = () => icons.requests.filter(r => r.path === 'player-hud/paper-portrait' && !r.settled).at(-1)
  const first = pending()
  assert.ok(first)
  assert.equal(named(game.menu.root, 'HUD.PaperFallback').active, true)
  const image = icons.complete(first)
  const sprite = named(game.menu.root, 'HUD.PaperArtwork').getComponent(Sprite)
  const frame = sprite.spriteFrame, texture = frame.texture
  assert.equal(named(game.menu.root, 'HUD.PaperFallback').active, false)
  assert.equal(image.refs, 1)
  const snapshot = JSON.stringify(game.store.state)
  game.menu.render(game.store.state, 'hall')
  assert.equal(frame.isValid, false)
  assert.equal(texture.isValid, false)
  assert.equal(image.refs, 0)
  assert.equal(JSON.stringify(game.store.state), snapshot)
  const stale = pending()
  game.menu.render(game.store.state, 'home')
  const ignored = icons.complete(stale)
  assert.equal(ignored.refs, 0, 'leaving during load must not retain the returned asset')
  assert.ok(!descendants(game.menu.root).some(n => n.name === 'HUD.PaperArtwork'))
})

test('paper HUD resource failure preserves readable stats in hall and combat', t => {
  const storage = disk(); seed(storage)
  const { game, icons } = launch(t, storage, { assisted: false })
  const request = icons.requests.find(r => r.path === 'player-hud/paper-portrait')
  icons.complete(request, new Error('missing portrait'))
  assert.equal(named(game.menu.root, 'HUD.PaperFallback').active, true)
  assert.equal(named(game.menu.root, 'HUD.RealmLabel').getComponent(Label).string, '炼气 · 初期')
  assert.match(named(game.menu.root, 'HUD.HPLabel').getComponent(Label).string, /^\d+\/\d+$/)
  assert.ok(!descendants(game.menu.root).some(n => n.name === 'HUD.ManaTrack'))
  game.enterFloor(1)
  assert.ok(named(game.battle, 'HUD.PaperArtwork'))
  assert.ok(!descendants(game.battle).some(n => n.name === 'HUD.ManaTrack'))
})

test('paper battle HP and realm label stay outside the avatar and realm text updates live', t => {
  const storage = disk(); seed(storage)
  const { game } = launch(t, storage, { assisted: false })
  game.enterFloor(1)
  const portrait = rectWithin(named(game.battle, 'HUD.Portrait'), game.root)
  for (const id of ['HPBar', 'RealmLabel']) {
    const track = rectWithin(named(game.battle, `HUD.${id}`), game.root)
    assert.ok(track.left >= portrait.right + 1, `${id} must not overlap avatar rectangle`)
  }
  for (const [xp, text, realm] of [[0, '炼气 · 初期', '炼气'], [2730, '筑基 · 中期', '筑基'], [9360, '金丹 · 巅峰', '金丹']]) {
    game.run.state.player.xp = xp; game.draw()
    assert.equal(game.stats.string, text)
    assert.equal(game.portraitRealm, realm)
  }

})


test('skill page keeps reset compact and moves research below the skill viewport', t => {
 const storage = disk(); seed(storage);
 const { game } = launch(t, storage, { frame: { width: 844, height: 390 } });
 press(game, '技能');
 const reset = button(game, '初始化');
 assert.equal(labelText(reset).trim(), '重置加点');
 assert.equal(reset.getComponent(Button).interactable, true);
 assert.ok(named(reset, '刷新图标').getComponent(Graphics));
 assert.doesNotMatch(labelText(game.menu.root), /暂无可退点数|全部洗点/);
 const research = named(game.menu.root, '获取技能点');
 const panel = named(game.menu.root, '技能树面板');
 assert.strictEqual(research.parent, panel);
 assert.ok(rectWithin(research,panel).top <= rectWithin(named(panel,'技能树二维卷轴'),panel).bottom);
 press(game,'获取技能点');
 assert.ok(named(game.menu.root,'研习遮罩'));
 press(game,'关闭');
 assert.ok(named(game.menu.root,'技能详情固定栏'));
});

function characterAtlas() {
  return {
    version: 1, width: 2048, height: 1920, cellWidth: 256, cellHeight: 384, facing: 'right',
    anchor: [133.3333, 285.3333], bodyHeight: 160,
    frames: Array.from({ length: 35 }, (_, i) => ({ x: (i % 8) * 256, y: Math.floor(i / 8) * 384, w: 256, h: 384,
      grip: [150, 220], guard: [164, 232], direction: [1, 1] })),
    clips: {
      idle: { frames: [0], fps: 1, loop: true },
      walk: { frames: [1, 2], fps: 8, loop: true },
      run: { frames: [3, 4], fps: 12, loop: true },
      slash: { frames: [5, 6, 7], fps: 10, loop: false, hitFrame: 1 },
    },
  }
}
function supplyCharacter(icons, json = characterAtlas()) {
  const image = new ImageAsset(); image.width = 2048; image.height = 1920
  const asset = new JsonAsset(); asset.json = json
  const pending = icons.requests.filter(r => r.path === 'tower-character/ground-actions')
  assert.equal(pending.length, 2)
  for (const request of pending) {
    request.settled = true; request.asset = request.Type === ImageAsset ? image : asset
    request.done(null, request.asset)
  }
  return image
}

test('character atlas preserves feet, independent sword, movement modes and paused redraws', t => {
  const storage = disk(); seed(storage)
  const { game, icons } = launch(t, storage, { assisted: false })
  game.enterTraining()
  const before = game.run.snapshot(), image = supplyCharacter(icons)
  game.draw()
  assert.deepEqual(game.run.snapshot(), before, 'artwork does not change the simulation')
  const art = game.characterArt, body = named(game.root, '角色人身')
  assert.deepEqual(copy(body.getComponent(UITransform).anchor), {x:133.3333/256, y:1-285.3333/384})
  assert.equal(art.root.scale.y, 108/160)
  assert.equal(body.getComponent(Sprite).spriteFrame.rect.x, 0)
  const sword = named(game.root, '角色手持剑').getComponent(Graphics), points = []
  sword.moveTo = (x,y) => points.push([x,y])
  const unchanged = game.run.snapshot(); game.draw()
  assert.equal(points.length, 2, 'only the blade and guard are drawn, never a grip over the source hand')
  const half = 2.5 / (108/160), normal = 1 / Math.sqrt(2)
  assert.deepEqual(points[0], [164-133.3333+normal*half, 285.3333-232+normal*half], 'blade starts at the guard with local anchor and inverted Y')
  assert.equal(sword.fillColor.r, '#E4E6E3', 'starter sword remains separately rendered')
  assert.deepEqual(game.run.snapshot(), unchanged)
  game.touch=1; game.stick.dx=.4; game.stick.dy=0; game.update(.1)
  assert.equal(art.mode, 'walk')
  assert.ok([256,512].includes(art.body.spriteFrame.rect.x))
  game.stick.dx=1; game.update(.1); assert.equal(art.mode,'run')
  game.stick.dx=-1; game.update(.1); assert.equal(art.root.scale.x,-108/160)
  game.run.pause(); const time=game.run.state.time, frame=art.body.spriteFrame, pose=copy(art.root.position)
  game.update(.1); game.render(); game.update(.1)
  assert.equal(game.run.state.time,time); assert.strictEqual(art.body.spriteFrame,frame)
  assert.deepEqual(copy(art.root.position),pose)
  assert.equal(image.refs,1)
  game.destroy(); assert.equal(image.refs,0)
  assert.equal(frame.isValid,false)
})

test('character slash follows a real short windup across a 3x frame and cannot cause damage', t => {
  const storage=disk(); seed(storage,{patch:{xp:225,skillsInitialized:true,skills:{sj_yujian:1}}})
  const {game,icons}=launch(t,storage)
  game.enterTraining(); supplyCharacter(icons); game.draw()
  game.run.advance(2)
  const s=game.run.state, enemy=s.enemies[0]; assert.ok(enemy)
  enemy.x=s.player.x+100; enemy.y=s.player.y
  s.cooldowns.sj_yujian=0; s.casts=[]
  const twin=TowerRun.restore(game.run.snapshot())
  const art=game.characterArt, before=art.sample(s)
  // Match a maximum host advance at 3x; both simulations receive identical input.
  const events=[]
  game.run.advance(.3,event=>{events.push(event);art.observeCast(event)})
  twin.advance(.3); art.observe(before,game.run.state); game.draw()
  assert.deepEqual(game.run.snapshot(),twin.snapshot(),'observation/rendering adds neither damage nor state')
  assert.ok(art.attack && art.attack.start>before.time)
  assert.equal(events.filter(event=>event.skill==='sj_yujian').length,1)
  assert.equal(game.run.state.casts.some(c=>c.skill==='sj_yujian'),false,'short windup is already gone')
  const actualCast=events.find(event=>event.skill==='sj_yujian')
  const expectedRelease=Math.ceil(actualCast.releaseAt*60-1e-8)/60
  assert.equal(art.attack.release,expectedRelease)
  assert.ok([1536,1792].includes(art.body.spriteFrame.rect.x),'one slash is still in its release/recovery frames')
  const attack=copy(art.attack), frozen=art.body.spriteFrame
  game.run.pause(); game.draw(); game.render(); game.update(.1)
  assert.deepEqual(copy(art.attack),attack); assert.strictEqual(art.body.spriteFrame,frozen)
  // Synthetic drawing times sample the authored hit marker without advancing combat.
  const presentation={...game.run.state,time:art.attack.release}
  art.draw(game.characterLayer,presentation,0,0,false)
  assert.equal(art.body.spriteFrame.rect.x,1536,'hitFrame 1 is slash sequence frame 6, not atlas frame 1')
  presentation.time=art.attack.release+.25
  art.draw(game.characterLayer,presentation,0,0,false)
  assert.equal(art.body.spriteFrame.rect.x,0,'slash ends once instead of looping')
  art.reset(); game.draw(); assert.equal(art.attack,null,'a restored baseline never invents an old attack')
})

for (const [rank, pulses] of [[1,1],[6,2],[10,3]]) {
  test(`one level ${rank} sword-line volley completes one character action without rewinding on its ${pulses} hits`, t => {
    const storage=disk(); seed(storage)
    const {game,icons}=launch(t,storage,{assisted:false})
    game.enterTraining()
    const atlas=JSON.parse(readFileSync(new URL('../cocos-pilot/assets/resources/tower-character/ground-actions.json',import.meta.url),'utf8'))
    supplyCharacter(icons,atlas); game.draw()
    const s=game.run.state, art=game.characterArt, p=s.player, template=s.pending[0]
    assert.ok(template)
    s.arenaVersion=1; s.loadout.growthVersion=1
    s.loadout.active={sj_line:rank}; s.loadout.passive={}
    s.loadout.evolutions=[]; s.loadout.evolutionLevels={}
    s.cooldowns={sj_line:0}; s.casts=[]; s.zones=[]; s.effects=[]; s.projectiles=[]
    p.x=33; p.y=-60; p.faceX=1; p.faceY=0
    const enemy=game.run._enemy({...template,id:'line-action-target',x:133,y:-60})
    enemy.hp=enemy.maxHp=1e8; enemy.moveSpeed=0
    enemy.ai.readyAt=enemy.ai.graceUntil=enemy.ai.entryUntil=1e8
    s.enemies=[enemy]; s.pending=[]; s.reserved=[]; s.drops=[]; s.wavePlanned=1; s.waveKilled=0
    art.reset()
    const events=[], impacts=new Map(), poses=[]
    const tick=()=>{
      const before=art.sample(s)
      game.run.advance(1/60,event=>{
        events.push(event)
        const stateBefore=JSON.stringify(s)
        art.observeCast(event)
        assert.equal(JSON.stringify(s),stateBefore,'the character observer cannot modify the real release')
      })
      art.observe(before,s)
      const stateBefore=JSON.stringify(s)
      game.draw()
      assert.equal(JSON.stringify(s),stateBefore,'drawing cannot modify combat or release timings')
      for(const e of s.effects)if(e.kind==='line'&&e.source==='sj_line')impacts.set(e.id,{...e})
      const frame=art.frames.indexOf(art.body.spriteFrame)
      poses.push({time:s.time,ordinal:atlas.clips.slash.frames.indexOf(frame)})
    }
    for(let i=0;i<60;i++)tick()
    const action=poses.filter(pose=>pose.ordinal>=0)
    assert.equal(events.length,pulses)
    assert.equal(impacts.size,pulses,'all independently damaging sword lines remain present')
    assert.deepEqual([...impacts.values()].map(e=>e.pulseIndex),Array.from({length:pulses},(_,i)=>i+1))
    assert.ok(action.length>10,'a full body action must still play')
    for(let i=1;i<action.length;i++){
      assert.ok(action[i].ordinal>=action[i-1].ordinal,
        `body rewound at ${action[i].time}: ${action[i-1].ordinal} -> ${action[i].ordinal}`)
    }
    assert.equal(action.at(-1).ordinal,13,'the approved recovery finishes instead of being cut off')
    assert.equal(poses.at(-1).ordinal,-1,'the character returns to idle once the volley is over')
    const firstStart=art.attack.start
    s.cooldowns.sj_line=0
    for(let i=0;i<20;i++)tick()
    assert.ok(art.attack.start>firstStart,'a new volley may start a fresh action')
  })
}

test('character flight keeps its flying sword through idle and real skill attacks', t => {
  const storage=disk(); seed(storage)
  const {game,icons}=launch(t,storage,{assisted:false})
  game.enterTraining(); supplyCharacter(icons); game.draw()
  const s=game.run.state, art=game.characterArt
  s.loadout.passive.sj_flight=1; art.mode='run'; art.attack=null
  const colors=[], g=game.playerBody, oldFill=g.fill
  g.fill=function(){colors.push(this.fillColor?.r); oldFill.call(this)}
  game.draw()
  assert.equal(art.body.spriteFrame.rect.x,0)
  assert.ok(colors.includes('#a5dce6'),'fixed flying sword follows the player in the depth-sorted body layer')
  const original=art.body.spriteFrame
  s.loadout.weapon=weaponTools.rollWeapon('ling',1,()=>.5,'test-weapon'); game.draw()
  assert.strictEqual(art.body.spriteFrame,original)
  assert.equal(art.sword.fillColor.r,'#A376C7','held weapon changes without replacing the body or flying sword')
  colors.length=0
  art.observeCast({skill:'sj_line',startedAt:s.time,releaseAt:s.time,dirX:1,dirY:0})
  game.draw()
  assert.notStrictEqual(art.body.spriteFrame,original,'a real attack uses the slash pose while flying')
  assert.equal(art.body.spriteFrame.rect.x,6*256,'the existing slash impact frame matches the actual release')
  assert.ok(colors.includes('#a5dce6'),'the flying sword stays visible beneath the attack pose')
})

test('invalid character atlas falls back and late resource callbacks cannot resurrect a destroyed host', t => {
  for(const invalid of [true,false]){
    const storage=disk(); seed(storage)
    const {game,icons}=launch(t,storage,{assisted:false})
    game.enterTraining()
    if(invalid){
      const json=characterAtlas(); json.frames[0].direction=[0,0]
      const image=supplyCharacter(icons,json); game.draw()
      assert.equal(game.characterArt.root,null); assert.equal(image.refs,0)
      assert.equal(game.characterArt.failed,true)
    }else{
      game.destroy(); const image=supplyCharacter(icons)
      assert.equal(image.refs,0); assert.equal(game.characterArt.root,null)
    }
  }
})

test('character reads revised JSON geometry and all 35 frames across atlas rows', t => {
  const storage=disk(); seed(storage)
  const {game,icons}=launch(t,storage,{assisted:false})
  game.enterTraining()
  const json=characterAtlas()
  json.anchor=[127.5,281.25]; json.bodyHeight=150
  json.clips.walk.frames=Array.from({length:12},(_,i)=>i+1)
  json.clips.run.frames=Array.from({length:8},(_,i)=>i+13)
  json.clips.slash.frames=Array.from({length:14},(_,i)=>i+21)
  json.clips.slash.hitFrame=8
  supplyCharacter(icons,json); game.draw()
  const art=game.characterArt
  assert.equal(art.frames.length,35)
  assert.deepEqual(copy(art.body.node.getComponent(UITransform).anchor),{x:127.5/256,y:1-281.25/384})
  assert.equal(art.root.scale.y,108/150,'body height comes from JSON rather than a baked conversion')
  assert.deepEqual(copy(art.frames[34].rect),{x:512,y:1536,width:256,height:384})
  const s={...game.run.state,time:0}
  art.mode='run'; art.modeAt=0
  for(let i=0;i<10;i++){
    s.time=(i+.1)/json.clips.run.fps
    art.draw(game.characterLayer,s,0,0,false)
    assert.strictEqual(art.body.spriteFrame,art.frames[13+i%8],'run wraps its eight approved frames')
  }
  art.attack={start:0,release:.15,face:1}
  for(let i=8;i<14;i++){
    s.time=.15+(i-8)/json.clips.slash.fps
    art.draw(game.characterLayer,s,0,0,false)
    assert.strictEqual(art.body.spriteFrame,art.frames[21+i])
  }
  art.clearBindings(); game.draw()
  assert.equal(icons.requests.filter(r=>r.path==='tower-character/ground-actions').length,2,'redraw reuses texture and frame cache')
})

test('separate blade keeps a full-width shaft over the repaired source path', t => {
  const storage=disk(); seed(storage)
  const {game,icons}=launch(t,storage,{assisted:false})
  game.enterTraining(); supplyCharacter(icons); game.draw()
  const art=game.characterArt, g=art.sword, polygons=[]
  let path=[]
  g.moveTo=(x,y)=>{path=[[x,y]]}
  g.lineTo=(x,y)=>{path.push([x,y])}
  g.fill=()=>polygons.push(path.slice())
  game.draw()
  const blade=polygons[0]
  assert.equal(blade.length,5,'only the short tip tapers; the blade shaft stays parallel')
  const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])*art.root.scale.y
  assert.ok(Math.abs(distance(blade[0],blade[4])-5)<1e-8)
  assert.ok(Math.abs(distance(blade[1],blade[3])-5)<1e-8)
  const guard=[164-133.3333,285.3333-232]
  assert.ok(blade[2][0]>guard[0] && blade[2][1]<guard[1],'source down-right becomes Cocos down-right')
  const before=game.run.snapshot()
  game.draw(); assert.deepEqual(game.run.snapshot(),before,'coverage changes are presentation only')
})

test('real character PNG, manifest and import metadata satisfy the running atlas contract', t => {
  const base=new URL('../cocos-pilot/assets/resources/tower-character/',import.meta.url)
  const json=JSON.parse(readFileSync(new URL('ground-actions.json',base),'utf8'))
  const png=readFileSync(new URL('ground-actions.png',base))
  assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10])
  assert.equal(png.readUInt32BE(16),json.width); assert.equal(png.readUInt32BE(20),json.height)
  assert.equal(png[25],6,'RGBA PNG')
  assert.equal(json.frames.length,35)
  assert.deepEqual(Object.fromEntries(Object.entries(json.clips).map(([k,v])=>[k,v.frames.length])),{walk:12,run:8,slash:14,idle:1})
  assert.equal(json.clips.slash.hitFrame,8)
  assert.ok(!json.clips.walk.frames.includes(json.clips.idle.frames[0]),'idle has a dedicated frame')
  for(const f of json.frames) assert.ok(Math.abs(Math.hypot(...f.direction)-1)<1e-5,'unit direction')
  assert.equal(JSON.parse(readFileSync(new URL('ground-actions.png.meta',base),'utf8')).importer,'image')
  assert.equal(JSON.parse(readFileSync(new URL('ground-actions.json.meta',base),'utf8')).importer,'json')
  const storage=disk(); seed(storage)
  const {game,icons}=launch(t,storage,{assisted:false})
  game.enterTraining(); supplyCharacter(icons,json); const before=game.run.snapshot(); game.draw()
  assert.ok(game.characterArt.body?.spriteFrame,'production JSON passes the real loader validation')
  assert.equal(game.characterArt.failed,false)
  assert.deepEqual(game.run.snapshot(),before)
})

test('cast notifications are immutable, unsaved and independent of cooldown arithmetic', t => {
  const storage=disk(); seed(storage,{patch:{xp:225,skillsInitialized:true,skills:{sj_yujian:1}}})
  const {game}=launch(t,storage,{assisted:false})
  game.enterTraining(); game.run.advance(2)
  const s=game.run.state, enemy=s.enemies[0]
  assert.ok(enemy); enemy.x=s.player.x+80; enemy.y=s.player.y
  s.cooldowns.sj_yujian=0; s.casts=[]
  const twin=TowerRun.restore(game.run.snapshot()), throwing=TowerRun.restore(game.run.snapshot())
  const events=[], art=game.characterArt, before=art.sample(s)
  game.run.advance(.3,event=>{assert.ok(Object.isFrozen(event));events.push(event);art.observeCast(event)})
  twin.advance(.3); throwing.advance(.3,event=>{event.releaseAt=999})
  assert.ok(events.some(e=>e.skill==='sj_yujian'))
  assert.deepEqual(game.run.snapshot(),twin.snapshot())
  assert.deepEqual(throwing.snapshot(),twin.snapshot(),'observer failures cannot interrupt fixed-step combat')
  const attack=copy(art.attack)
  s.cooldowns.sj_yujian+=27
  art.observe(before,s)
  assert.deepEqual(copy(art.attack),attack,'cooldown changes cannot shift an observed cast')
  art.reset(); art.observe(before,s)
  assert.equal(art.attack,null,'cooldown alone cannot synthesize an attack')
  game.run.pause(); const count=events.length
  game.run.advance(.3,event=>events.push(event)); assert.equal(events.length,count)
})

test('tower entry focuses next uncleared floor, locks future floors and enters only the selection', t => {
  const storage = disk(); seed(storage, { patch: { clearedFloor: 1 } });
  const { game } = launch(t, storage, { assisted: false });
  game.goto('tower');
  assert.equal(game.menu.selectedTowerFloor, 2);
  const rows = descendants(game.menu.root).filter(n => /^塔层-\d+$/.test(n.name));
  assert.equal(rows.length, 9);
  const row = f => rows.find(n => n.name === `塔层-${f}`);
  assert.ok(row(1).position.y < row(9).position.y);
  assert.ok(labelText(row(1)).includes('已领取'));
  assert.ok(descendants(row(3)).some(n => n.name === '封印锁'));
  assert.equal(row(3).getComponent(Button).interactable, false);
  press(game, '塔层-1');
  assert.equal(game.menu.selectedTowerFloor, 1);
  press(game, '← 宗门');
  assert.equal(game.page, 'hall');
  game.goto('tower');
  assert.equal(game.menu.selectedTowerFloor, 2);
  assert.ok(!labelText(game.menu.root).includes('妖丹'));
  press(game, '入场');
  assert.equal(game.run.snapshot().floor, 2);
});

test('tower entry completed campaign selects ninth floor and readonly disables entry', t => {
  const storage = disk(); seed(storage, { patch: { clearedFloor: 9 } });
  const { game } = launch(t, storage, { assisted: false });
  game.goto('tower');
  assert.equal(game.menu.selectedTowerFloor, 9);
  assert.equal(descendants(game.menu.root).filter(n => n.getComponent(Label)?.string === '已领取').length, 9);
  const before = storage.getItem(campaign.TOWER_CAMPAIGN_KEY);
  game.menu.render({...game.store.state, readOnly: true}, 'tower');
  assert.equal(button(game, '入场').getComponent(Button).interactable, false);
  button(game, '入场').events.get(Button.EventType.CLICK)();
  assert.equal(storage.getItem(campaign.TOWER_CAMPAIGN_KEY), before);
  assert.equal(game.run, null);
});

test('tower entry artwork reuses requests and late loads cannot revive abandoned page', t => {
  const storage = disk(); seed(storage);
  const { game, icons } = launch(t, storage, { assisted: false });
  game.goto('tower');
  const requests = icons.requests.filter(r => r.path.startsWith('tower-entry/') || r.path.startsWith('tower-monsters/'));
  assert.equal(requests.length, 10);
  press(game, '塔层-1');
  assert.equal(icons.requests.filter(r => r.path.startsWith('tower-entry/') || r.path.startsWith('tower-monsters/')).length, 10);
  press(game, '← 宗门');
  for (const request of requests) icons.complete(request);
  assert.equal(game.page, 'hall');
  assert.ok(!descendants(game.menu.root).some(n => n.name === '层主传闻'));
});

for (const frame of [{width:1280,height:720}, {width:844,height:390}]) {
 test(`tower cards scroll with complete boss artwork and separate text (${frame.width}x${frame.height})`, t => {
  const storage = disk(); seed(storage);
  const { game } = launch(t, storage, { assisted:false, frame });
  game.goto('tower');
  const menu=game.menu, row=descendants(menu.root).find(n=>n.name==='塔层-1');
  const portrait=row.children.find(n=>n.name==='层主特写');
  const image=portrait.children.find(n=>n.getComponent(Sprite));
  const size=n=>n.getComponent(UITransform).contentSize;
  const reward=row.children.find(n=>n.name==='首通奖励');
  assert.equal(size(reward).width,size(reward).height,'reward slot is square');
  assert.ok(size(row).height>=120, 'cards stay tall instead of squeezing nine floors into one screen');
  assert.equal(portrait.getComponent(Mask),null, 'the boss is not cropped by a portrait mask');
  assert.ok(size(image).width<=size(portrait).width && size(image).height<=size(portrait).height);
  const title=row.children.find(n=>n.getComponent(Label)?.string==='第1层');
  assert.ok(portrait.position.x+size(portrait).width/2 <= title.position.x-size(title).width/2);
  assert.equal(menu.scroll.vertical,true);
  assert.ok(size(menu.content).height>size(menu.scroll.node).height);
  const offset=menu.scroll.getScrollOffset().y;
  assert.ok(offset>0,'first floor is brought into view at the bottom of the list');
  press(game,'塔层-1');
  assert.equal(game.menu.scroll.getScrollOffset().y,offset,'selecting preserves scroll position');
 });
}

test('falcon and ape floor cards request matching artwork without obsolete boss portraits', t => {
 const storage=disk(); seed(storage,{patch:{clearedFloor:8}});
 const {game,icons}=launch(t,storage,{assisted:false}); game.goto('tower');
 for(const [floor,name] of [[7,'裂风隼王'],[8,'撼岩猿王']]){
  const row=descendants(game.menu.root).find(n=>n.name===`塔层-${floor}`);
  assert.ok(labelText(row).includes(name));
  const portrait=row.children.find(n=>n.name==='层主特写');
  assert.ok(portrait.children.some(n=>n.getComponent(Sprite)));
  assert.ok(icons.requests.some(r=>r.path===`tower-monsters/${floor===7?'falcon':'ape'}`));
  press(game,`塔层-${floor}`); assert.equal(game.menu.selectedTowerFloor,floor);
 }
 assert.ok(!icons.requests.some(r=>/tower-monsters\/(rhino|yak)$/.test(r.path)));
});

test('falcon battle art loads the full sprite and reuses its resource cache', t => {
 const storage=disk();seed(storage);
 const {game,icons}=launch(t,storage,{assisted:false});
 const art=game.monsterArt,parent=new Node('falcon-art');
 const paint=()=>art.draw(parent,'falcon-boss','falcon',0,0,0,-10,42);
 assert.equal(paint(),0);
 const request=icons.requests.find(r=>r.path==='tower-monsters/falcon');assert.ok(request);
 icons.complete(request);
 assert.ok(paint()>0);assert.equal(parent.children.length,1);
 assert.equal(parent.children[0].getComponent(Sprite).trim,false);
 paint();assert.equal(icons.requests.filter(r=>r.path==='tower-monsters/falcon').length,1);
});

test('stone battle art maps converted denominations rather than monster ranks and leaves rewards untouched', t => {
 const storage=disk();seed(storage);
 const {game,icons}=launch(t,storage,{assisted:false});game.enterFloor(1);
 const state=game.run.state,p=state.player;
 state.drops=[1,10,1000,100000].map((amount,i)=>({id:`stone-check-${i}`,kind:'core',rank:7,amount,x:p.x+i*30,y:p.y,expiresAt:state.time+2}));
 const before=JSON.stringify({drops:state.drops,earned:state.earned,wallet:game.store.state.spiritStones});
 game.draw();
 const requests=icons.requests.filter(r=>r.path.startsWith('tower-stones/stone_'));
 assert.deepEqual(requests.map(r=>r.path),['stone_low','stone_mid','stone_high','stone_top'].map(n=>`tower-stones/${n}`));
 const images=requests.map(r=>{const image=new ImageAsset();image.width=image.height=128;r.done(null,image);return image});
 game.draw();const nodes=[...game.stoneLayer.children];
 assert.equal(nodes.length,4);assert.ok(nodes.every(n=>n.active&&n.getComponent(Sprite).spriteFrame));
 for(let i=0;i<20;i++)game.draw();
 assert.deepEqual(game.stoneLayer.children,nodes);assert.equal(icons.requests.filter(r=>r.path.startsWith('tower-stones/stone_')).length,4);
 assert.equal(JSON.stringify({drops:state.drops,earned:state.earned,wallet:game.store.state.spiritStones}),before);
 state.drops=[];game.draw();assert.equal(game.stoneLayer.children.length,0);
 game.destroy();assert.ok(images.every(i=>i.refs===0));
});

test('wallet grade icons pair with quantities and release bindings on redraw', t => {
 for(let grade=0;grade<4;grade++){
  const storage=disk();seed(storage,{patch:{spiritStones:economy.STONE_VALUES[grade]}});
  const {game,icons}=launch(t,storage,{assisted:false});game.goto('inventory');
  const wallet=descendants(game.menu.root).find(n=>n.name==='货币信息');
  assert.equal(descendants(wallet).filter(n=>n.getComponent(Label)).map(n=>n.getComponent(Label).string).join('\n'), '×1\n×300');
  const request=icons.requests.find(r=>r.path===`tower-stones/${['stone_low','stone_mid','stone_high','stone_top'][grade]}`);assert.ok(request);
  const old=descendants(game.menu.root).find(n=>n.name===`灵石货币图标-${grade}`);
  const image=new ImageAsset();image.width=image.height=128;request.done(null,image);
  assert.ok(old.children[0].active);assert.ok(old.children[0].getComponent(Sprite).spriteFrame);
  game.goto('pills');assert.equal(old.isValid,false);
  assert.equal(icons.requests.filter(r=>r.path.startsWith('tower-stones/stone_')).length,1);
  game.destroy();assert.equal(image.refs,0);
 }
});

test('approved resource icons render beside existing counters and XP feedback without altering values',t=>{
 const storage=disk();seed(storage);
 const {game,icons}=launch(t,storage,{assisted:false});
 game.goto('inventory');
 assert.ok(icons.requests.some(r=>r.path==='tower-stones/resource_contribution'));
 game.menu.go('librarySkills');
 assert.ok(icons.requests.some(r=>r.path==='tower-stones/resource_skill_point'));
 game.enterFloor(1);const s=game.run.state,p=s.player;
 s.drops=[{id:'xp-icon-check',kind:'resource',role:'elite',x:p.x,y:p.y}];
 const before=JSON.stringify({earned:s.earned,xp:p.xp,wallet:game.store.state.spiritStones});
 game.draw();const request=icons.requests.find(r=>r.path==='tower-stones/resource_xp_essence');assert.ok(request);
 const image=new ImageAsset();image.width=image.height=128;request.done(null,image);game.draw();
 assert.equal(game.stoneLayer.children.length,1);
 assert.ok(game.stoneLayer.children[0].name.includes('resource_xp_essence'));
 assert.equal(JSON.stringify({earned:s.earned,xp:p.xp,wallet:game.store.state.spiritStones}),before);
 game.destroy();assert.equal(image.refs,0);
});

test('book requirements use stone art without wallet balances and owned books retain book art',t=>{
 const storage=disk();seed(storage);
 const {game,icons}=launch(t,storage,{assisted:false});game.menu.go('librarySkills');
 assert.ok(!icons.requests.some(r=>r.path==='tower-stones/resource_skill_book'),'free starter skill has no book icon');
 const before=JSON.stringify(game.store.state);
 game.menu.openDetails('sj_line');
 assert.ok(labelText(game.menu.root).includes('经卷所需：'));
 assert.ok(!labelText(game.menu.root).includes('持有灵石'));
 assert.ok(labelText(game.menu.root).includes('×2'));
 const request=icons.requests.find(r=>r.path==='tower-stones/stone_mid');assert.ok(request);
 const image=new ImageAsset();image.width=image.height=128;request.done(null,image);
 assert.ok(descendants(game.menu.root).some(n=>n.name.includes('stone_mid')&&n.active));
 const fixture=copy(game.store.state);fixture.books=[...(fixture.books||[]),'sj_line'];
 game.menu.render(fixture,'library');
 assert.ok(labelText(game.menu.root).includes('永久经卷：已拥有'));
 assert.ok(!labelText(game.menu.root).includes('经卷所需：'));
 assert.equal(icons.requests.filter(r=>r.path==='tower-stones/resource_skill_book').length,1);
 game.menu.openDetails('sj_yujian');
 assert.ok(!descendants(game.menu.root).some(n=>n.name.includes('resource_skill_book')));
 assert.equal(JSON.stringify(game.store.state),before);
 game.destroy();assert.equal(image.refs,0);
});

test('each pill shares its own art across apothecary, inventory cell and details without consuming pills',t=>{
 const storage=disk();seed(storage,{patch:{pills:{ zhuji: 0,huichun:3,peiyuan:2}}});
 const {game,icons}=launch(t,storage,{assisted:false});
 const before=JSON.stringify(game.store.state);
 game.goto('pills');const images=[];
 for(const id of ['huichun','peiyuan']){
  const request=icons.requests.find(r=>r.path===`tower-stones/pill_${id}`);assert.ok(request);
  const image=new ImageAsset();image.width=image.height=128;request.done(null,image);images.push(image);
  assert.ok(descendants(game.menu.root).some(n=>n.name===`灵石素材-pill_${id}-apothecary-${id}`&&n.active));
 }
 game.goto('inventory');
 const gridTextures=['huichun','peiyuan'].map(id=>{
  const n=descendants(game.menu.root).find(n=>n.name===`灵石素材-pill_${id}-pill-背包图标-${id}`&&n.active);assert.ok(n);
  return n.getComponent(Sprite).spriteFrame.texture;
 });
 assert.notStrictEqual(gridTextures[0],gridTextures[1]);
 for(const id of ['huichun','peiyuan']){
  game.menu.backpack.select(id);game.menu.render(game.store.state,'inventory');
  assert.ok(descendants(game.menu.root).some(n=>n.name===`灵石素材-pill_${id}-pill-背包详情图标-${id}`&&n.active));
  assert.equal(icons.requests.filter(r=>r.path===`tower-stones/pill_${id}`).length,1);
 }
 assert.ok(!descendants(game.menu.root).some(n=>n.name.includes('pill_huichun')&&n.parent.name.includes('peiyuan')));
 assert.ok(!descendants(game.menu.root).some(n=>n.name.includes('pill_peiyuan')&&n.parent.name.includes('huichun')));
 assert.equal(JSON.stringify(game.store.state),before);
 game.destroy();assert.ok(images.every(image=>image.refs===0));
});

test('heal drop art preserves proximity pickup, one-time recovery and sprite cleanup',t=>{
 const storage=disk();seed(storage);
 const {game,icons}=launch(t,storage,{assisted:false});game.enterFloor(1);
 const s=game.run.state,p=s.player;p.hp=p.maxHp*.5;
 s.drops=[{id:'heal-art-check',kind:'heal',x:p.x+100,y:p.y,radius:9,amount:p.maxHp*.1,expiresAt:s.time+45}];
 const before=JSON.stringify({drops:s.drops,hp:p.hp,earned:s.earned,pills:game.store.state.pills});
 game.draw();
 const request=icons.requests.find(r=>r.path==='tower-stones/drop_heal');assert.ok(request);
 const image=new ImageAsset();image.width=image.height=128;request.done(null,image);game.draw();
 assert.equal(game.stoneLayer.children.length,1);assert.ok(game.stoneLayer.children[0].name.includes('drop_heal'));
 assert.equal(JSON.stringify({drops:s.drops,hp:p.hp,earned:s.earned,pills:game.store.state.pills}),before);
 game.run._drops();assert.equal(p.hp,p.maxHp*.5);assert.equal(s.drops.length,1);
 s.drops[0].x=p.x;game.run._drops();assert.equal(p.hp,p.maxHp*.6);assert.equal(s.drops.length,0);
 game.run._drops();assert.equal(p.hp,p.maxHp*.6);
 game.draw();assert.equal(game.stoneLayer.children.length,0);
 game.destroy();assert.equal(image.refs,0);
});


test('backpack art preserves menu and battle hit targets, fallback and inventory navigation',t=>{
 const storage=disk();seed(storage);const {game,icons}=launch(t,storage,{assisted:false});
 const loadBag=()=>{const req=icons.requests.filter(r=>r.path==='tower-stones/ui_bag').at(-1);assert.ok(req);const image=new ImageAsset();image.width=image.height=128;req.done(null,image);return image;};
 const menuBag=descendants(game.menu.root).find(n=>n.name==='背包');assert.ok(menuBag);
 assert.equal(menuBag.getComponent(UITransform).contentSize.width,80);assert.equal(menuBag.getComponent(UITransform).contentSize.height,80);
 const menuFallback=menuBag.children[0];assert.equal(menuFallback.active,true);
 const menuImage=loadBag();assert.equal(menuFallback.active,false);
 assert.ok(menuBag.children.some(n=>n.getComponent(Sprite)?.spriteFrame));press(game,'背包');assert.equal(game.menu.currentPage,'inventory');
 game.enterFloor(1);const battleBag=descendants(game.root).find(n=>n.name==='HUD.Inventory');assert.ok(battleBag);
 assert.equal(battleBag.getComponent(UITransform).contentSize.width,80);assert.equal(battleBag.getComponent(UITransform).contentSize.height,80);
 const battleImage=loadBag();assert.equal(battleBag.children[0].active,false);
 const sprite=battleBag.children.find(n=>n.getComponent(Sprite)?.spriteFrame);assert.ok(sprite);
 for(let i=0;i<30;i++)game.draw();assert.ok(sprite.isValid&&sprite.active);
 assert.equal(icons.requests.filter(r=>r.path==='tower-stones/ui_bag').length,2);
 press(game,'背包');assert.equal(game.menu.currentPage,'inventory');
 game.destroy();assert.equal(menuImage.refs,0);assert.equal(battleImage.refs,0);
});

test('skill button art preserves menu and battle hit targets, fallback and skill navigation',t=>{
 const storage=disk();seed(storage);const {game,icons}=launch(t,storage,{assisted:false});
 const loadBag=()=>{const req=icons.requests.filter(r=>r.path==='tower-stones/ui_skills').at(-1);assert.ok(req);const image=new ImageAsset();image.width=image.height=128;req.done(null,image);return image;};
 const menuBag=descendants(game.menu.root).find(n=>n.name==='技能');assert.ok(menuBag);
 assert.equal(menuBag.getComponent(UITransform).contentSize.width,80);assert.equal(menuBag.getComponent(UITransform).contentSize.height,80);
 const menuFallback=menuBag.children[0];assert.equal(menuFallback.active,true);
 const menuImage=loadBag();assert.equal(menuFallback.active,false);
 assert.ok(menuBag.children.some(n=>n.getComponent(Sprite)?.spriteFrame));press(game,'技能');assert.equal(game.menu.currentPage,'library');
 game.enterFloor(1);const battleBag=descendants(game.root).find(n=>n.name==='HUD.Skills');assert.ok(battleBag);
 assert.equal(battleBag.getComponent(UITransform).contentSize.width,80);assert.equal(battleBag.getComponent(UITransform).contentSize.height,80);
 const battleImage=loadBag();assert.equal(battleBag.children[0].active,false);
 const sprite=battleBag.children.find(n=>n.getComponent(Sprite)?.spriteFrame);assert.ok(sprite);
 for(let i=0;i<30;i++)game.draw();assert.ok(sprite.isValid&&sprite.active);
 assert.equal(icons.requests.filter(r=>r.path==='tower-stones/ui_skills').length,2);
 press(game,'技能');assert.equal(game.menu.currentPage,'library');
 game.destroy();assert.equal(menuImage.refs,0);assert.equal(battleImage.refs,0);
});


test('settings art preserves menu settings and map-card pause actions',t=>{
 const storage=disk();seed(storage);const {game,icons}=launch(t,storage,{assisted:false});
 const load=()=>{const req=icons.requests.filter(r=>r.path==='tower-stones/ui_settings').at(-1);assert.ok(req);const image=new ImageAsset();image.width=image.height=128;req.done(null,image);return image;};
 const menuButton=descendants(game.menu.root).find(n=>n.name==='设置');assert.ok(menuButton);
 assert.deepEqual(menuButton.getComponent(UITransform).contentSize,{width:80,height:80});
 const menuImage=load();assert.equal(menuButton.children[0].active,false);
 press(game,'设置');
 const shade=named(game.menu.root,'宗门设置遮罩');
 assert.ok(shade);
 assert.equal(descendants(shade).some(n=>n.name==='关闭设置'),true);
 shade.events.get(Node.EventType.TOUCH_END)({target:named(shade,'设置面板')});
 assert.ok(named(game.menu.root,'宗门设置遮罩'));
 shade.events.get(Node.EventType.TOUCH_END)({target:shade});
 assert.equal(descendants(game.menu.root).some(n=>n.name==='宗门设置遮罩'),false);
 game.enterFloor(1);const hud=descendants(game.root).find(n=>n.name==='HUD.Pause');const battleImage=load();
 assert.deepEqual(hud.getComponent(UITransform).contentSize,{width:48,height:44});
 assert.equal(hud.parent.name,'HUD.MapCard');
 const sprite=hud.children.find(n=>n.getComponent(Sprite)?.spriteFrame);assert.ok(sprite);assert.equal(sprite.position.x,0);
 for(let i=0;i<30;i++)game.draw();assert.ok(sprite.isValid&&sprite.active);
 press(game,'暂停');assert.ok(hasLabel(game.overlay,'塔内暂停'));
 game.destroy();assert.equal(menuImage.refs,0);assert.equal(battleImage.refs,0);
});

test('tower environment loads once, stays world anchored and cleans cancelled and completed mist',t=>{
 const storage=disk();seed(storage);const {game,icons}=launch(t,storage,{assisted:false});
 const art=game.environmentArt,ground=new Node('ground'),props=new Node('props');
 const s={arenaVersion:1,time:1,reserved:[{id:'spawn',x:10,y:20,readyAt:1.2,warning:.8}],enemies:[]};
 const paint=()=>art.draw(ground,props,s,{x:33,y:-60},1280,720);
 assert.equal(paint(),false);paint();
 const requests=icons.requests.filter(r=>r.path.startsWith('tower-environment/'));assert.equal(requests.length,3);
 const images=requests.map(r=>icons.complete(r));assert.equal(paint(),true);
 assert.deepEqual(art.nodes.get('floor').position,{x:0,y:0});
 assert.equal(art.nodes.get('north').position.x,0);
 s.reserved=[];paint();assert.equal(art.nodes.has('mist-spawn'),false,'unsafe spawn cancels immediately');
 s.reserved=[{id:'spawn',x:10,y:20,readyAt:1.2,warning:.8}];paint();s.reserved=[];s.enemies=[{id:'spawn'}];paint();
 assert.equal(art.fading.size,1);s.time+=.5;paint();assert.equal(art.fading.size,0);assert.equal(art.nodes.has('mist-spawn'),false);
 art.clearBindings();assert.equal(art.nodes.size,0);assert.ok(images.every(i=>i.refs===1));
 art.destroy();assert.ok(images.every(i=>i.refs===0));assert.equal(paint(),false);
});

test('pillar occludes player and monsters behind it but actors in front cover the pillar',t=>{
 const storage=disk();seed(storage);const {game,icons}=launch(t,storage,{assisted:false});game.enterTraining();game.run.pause();
 const s=game.run.state,o=TOWER_PILLARS[0];s.arenaVersion=1;s.player.x=o.x;s.player.y=o.y+80;
 const anchors=[];game.drawLevelEffects=(_g,_t,_x,y)=>anchors.push(y);
 s.enemies=[{id:'depth-wolf',family:'wolf',radius:24,hp:100,maxHp:100,role:'normal',rank:1,x:o.x+20,y:o.y+100,ai:{mode:'approach'}}];
 game.draw();
 // The fallback must already be in the sorted actor layer, before art arrives.
 const order=()=>game.monsterLayer.children.filter(n=>n.active).map(n=>n.name);
 assert.ok(order().indexOf('妖兽轮廓-depth-wolf')<order().indexOf('镇妖柱占位-north'));
 for(const r of icons.requests.filter(r=>!r.settled&&(r.path.startsWith('tower-environment/')||r.path==='tower-monsters/wolf')))icons.complete(r);
 supplyCharacter(icons);game.draw();
 assert.equal(game.environmentArt.nodes.get('north').parent,game.monsterLayer);
 assert.equal(game.characterLayer.parent,game.monsterLayer);
 assert.ok(order().indexOf('角色动作层')<order().indexOf('north'));
 assert.ok(order().indexOf('妖兽素材-depth-wolf')<order().indexOf('north'));
 assert.equal(game.characterArt.root.position.y,s.player.y-game.camera.y,'player feet use simulation ground Y');
 assert.ok(anchors.every(y=>y===s.player.y-game.camera.y),'level effects use the feet anchor');
 const bars=[];game.foreground.rect=(...args)=>bars.push(args);s.enemies[0].hp=50;game.draw();
 const top=game.monsterArt.top('depth-wolf');
 assert.ok(top>s.enemies[0].y-game.camera.y+60);
 assert.ok(!bars.some(r=>r[3]===5),'health appears only in the centered target panel');
 assert.equal(game.bossPanel.active,true);
 assert.match(game.bossLabel.string,/50\/100/);
 s.player.y=o.y-75;s.enemies[0].y=o.y-80;game.draw();
 assert.ok(order().indexOf('角色动作层')>order().indexOf('north'));
 assert.ok(order().indexOf('妖兽素材-depth-wolf')>order().indexOf('north'));
});


test('stone drops render bounded denomination piles without floating text or reward mutations', t => {
  const storage = disk(); seed(storage)
  const { game } = launch(t, storage, { assisted: false })
  game.enterTraining()
  const p = game.run.state.player
  const draws = []
  game.stoneArt.draw = (parent, key, grade, x, y, size) => { draws.push({ key, grade, x, y, size }); return true }
  for (const [amount, count, grade] of [[1, 5, 0], [10, 1, 1], [1000000, 5, 3]]) {
    game.run.state.drops = [{ id: 999, kind: 'core', amount, x: p.x, y: p.y }]
    const before = JSON.stringify(game.run.state)
    draws.length = 0; game.draw()
    assert.equal(draws.length, count)
    assert.ok(draws.every(d => d.grade === grade))
    assert.equal(new Set(draws.map(d => d.key)).size, count)
    assert.equal(new Set(draws.map(d => `${d.x}:${d.y}`)).size, count)
    assert.ok(game.labels.every(l => !l.node.active || !l.string.startsWith('灵石 ')))
    assert.equal(JSON.stringify(game.run.state), before)
  }
})

test('currency HUD hides only leading zero top grades and closes gaps as balances change', t => {
  const storage = disk(); seed(storage)
  const { game } = launch(t, storage, { assisted: false })
  game.enterTraining()
  for (const [stones, visible] of [[680, [false,false,true,true,true]], [1000000, [true,true,true,true,true]], [10000, [false,true,true,true,true]], [0, [false,false,true,true,true]], [999999999999,[true,true,true,true,true]]]) {
    const originalStore = game.store
    game.store = { state: { ...originalStore.state, spiritStones: stones } }
    game.refreshCurrencyHud()
    game.store = originalStore
    const icons = [3,2,1,0].map(grade => named(game.battle, `HUD.StoneIcon.${grade}`)).concat(named(game.battle, 'HUD.ContributionIcon'))
    const labels = [3,2,1,0].map(grade => named(game.battle, `HUD.StoneCount.${grade}`)).concat(named(game.battle, 'HUD.ContributionCount'))
    const isVisible = node => node.active && (node.parent.name === 'HUD.Currency' || node.parent.active)
    assert.deepEqual(icons.map(isVisible), visible)
    assert.deepEqual(labels.map(isVisible), visible)
    const boxes = icons.filter((_, i) => visible[i]).map(n => rectWithin(n, game.root))
    const shownIcons=icons.filter((_,i)=>visible[i]);
    for (let i = 1; i < boxes.length; i++) assert.equal(boxes[i].left - boxes[i-1].left, shownIcons[i-1].parent.getComponent(UITransform).contentSize.width)
    const map=rectWithin(named(game.battle,'HUD.MapCard'),game.root)
    const countRight=rectWithin(labels.at(-1),game.root).right
    assert.equal(map.left-countRight,20,'16px outer gap plus 4px resource padding')
  }
})

test('map card owns floor title and device status while battle center only shows waves', t => {
 const storage=disk();seed(storage);
 const {game}=launch(t,storage,{assisted:false});game.enterFloor(1);game.update(0);
 assert.equal(named(game.battle,'HUD.FloorWaveLabel').getComponent(Label).string,`波次 ${game.run.state.wave}/20`);
 assert.match(named(game.battle,'HUD.MapName').getComponent(Label).string,/第1层/);
 assert.match(named(game.battle,'HUD.DeviceTime').getComponent(Label).string,/\d{2}:\d{2}/);
 for(const name of ['HUD.Minimap','HUD.MapName','HUD.DeviceTime','HUD.DeviceNetwork','HUD.DeviceBattery','HUD.Pause']){
  const box=rectWithin(named(game.battle,name),named(game.battle,'HUD.MapCard'));
  assert.ok(box.left>=-121&&box.right<=121,name);assert.ok(box.bottom>=-102&&box.top<=102,name);
 }
});

for (const frame of [{width:1280,height:720},{width:844,height:390}]) {
 test(`initialization confirmation stays visible and clears every skill (${frame.width})`, t => {
  const storage=disk();seed(storage,{patch:investedSkillFixture()});
  const {game}=launch(t,storage,{frame});
  game.menu.go('librarySkills');press(game,'初始化');
  const before=game.store.state;
  const after=growth.growthSummary({...before,skillsInitialized:true,skills:{},evolutionRanks:{}});
  const returned=after.available-growth.growthSummary(before).available;
  const confirm=button(game,`确认重置 · 返还${returned}点`);
  const sheet=descendants(game.menu.root).find(n=>n.name==='初始化技能'&&!n.getComponent(Label));
  assert.strictEqual(confirm.parent,sheet);
  const rect=rectWithin(confirm,sheet),view=rectWithin(named(sheet,'全洗明细卷轴'),sheet);
  assert.ok(rect.bottom>=-sheet.getComponent(UITransform).contentSize.height/2);
  assert.ok(rect.top<=view.bottom);
  press(game,`确认重置 · 返还${returned}点`);
  assert.deepEqual(copy(game.store.state.skills),{});
  assert.deepEqual(copy(game.store.state.evolutionRanks),{});
  assert.equal(growth.growthSummary(game.store.state).available,after.available);
  assert.equal(button(game,'初始化').getComponent(Button).interactable,false);
 });
}

test('single-save tools expose only direct actions and cycle speed without a submenu', t => {
 const storage=disk(); seed(storage)
 const {game}=launch(t,storage,{assisted:false})
 press(game,'开发者工具')
 const names=()=>descendants(game.overlay).filter(n=>n.getComponent(Button)).map(n=>n.name)
 assert.deepEqual(names(),['返回设置','关闭开发者工具','游戏速度 ×1','无敌：关闭','+999灵石、贡献','+999功法点','提升一小境界','重置游戏进度'])
 for(const forbidden of ['当前灵石','体验档','成长与存档','返回宗门','切回普通档'])assert.ok(!hasLabel(game.overlay,forbidden))
 for(const speed of [1,2,3]){press(game,`游戏速度 ×${speed}`);assert.equal(game.tools.speed,speed%3+1)}
 press(game,'返回设置')
 assert.ok(named(game.menu.root,'宗门设置遮罩'))
 assert.ok(!hasLabel(named(game.menu.root,'宗门设置遮罩'),'落云宗'))
 press(game,'开发者工具')
 const balance=game.store.state.spiritStones, contribution=game.store.state.contribution
 press(game,'+999灵石、贡献');press(game,'+999灵石、贡献')
 assert.equal(game.store.state.spiritStones,balance+1998000000)
 assert.equal(game.store.state.contribution,contribution+1998)
 press(game,'+999功法点')
 assert.equal(game.store.state.playtestSkillPoints,999)
 press(game,'提升一小境界')
 assert.equal(profile.cultivationAt(game.store.state.xp).level,2)
 assert.equal(storage.getItem(playtest.TOWER_PLAYTEST_KEY),null)
 const restored=new campaign.TowerCampaignStore(playtest.towerStorage(storage),START)
 assert.equal(restored.state.spiritStones,game.store.state.spiritStones)
 press(game,'关闭开发者工具');assert.equal(game.overlay,null)
})

test('single-save tool writes are atomic and close returns to paused battle', t => {
 const storage=disk();seed(storage,{paused:true})
 const {game}=launch(t,storage,{assisted:true})
 press(game,'开发者工具')
 const before=copy(game.store.state)
 storage.blockedWrites.add(campaign.TOWER_CAMPAIGN_KEY)
 press(game,'+999灵石、贡献')
 assert.deepEqual(game.store.state,before)
 assert.ok(hasLabel(game.overlay,'保存失败'))
 storage.blockedWrites.clear();press(game,'返回工具')
 press(game,'+999灵石、贡献')
 assert.equal(game.run.state.phase,'paused')
 press(game,'关闭开发者工具')
 assert.equal(game.run.state.phase,'paused')
 assert.ok(hasLabel(game.overlay,'继续挑战'))
})

test('monster mechanics remain above every friendly effect and reuse world labels during paused redraws', t => {
  const storage=disk();seed(storage);
  const {game}=launch(t,storage,{assisted:false});game.enterTraining();game.run.advance(2);game.run.pause();
  const state=game.run.state, p=state.player;
  state.monsterMechanics.zones=[{id:'view-test',ownerId:'view-owner',skillId:'M19',name:'六门避劫',shape:'safe-gates',x:p.x,y:p.y,radius:2400,phase:'windup',startedAt:state.time,activatesAt:state.time+3,expiresAt:state.time+3.2,safeZones:[{x:p.x+80,y:p.y,radius:55}]}];
  game.draw();
  const renderer=game.monsterMechanics, layer=renderer.graphics.node, children=game.battle.children;
  for(const friendly of [game.arcLayer,game.lineLayer,game.tiandiLayer,game.formationLayer,game.qiLayer,game.foreground.node]) assert.ok(children.indexOf(layer)>children.indexOf(friendly));
  assert.ok(renderer.labels.some(label=>label.node.active&&label.string.includes('安全门区')));
  assert.ok(renderer.labels.some(label=>label.node.active&&label.string.includes('3.0秒')));
  const nodes=[...layer.children], serialized=JSON.stringify(state);
  game.draw();assert.deepEqual(layer.children,nodes);assert.equal(JSON.stringify(state),serialized);
  state.monsterMechanics.zones=[];game.draw();assert.ok(renderer.labels.every(label=>!label.node.active));
});

test('paper experience ring resets on level-up and hides at cap in hall and combat', t => {
  const storage = disk(); seed(storage, { xp: 20 })
  const { game } = launch(t, storage, { assisted: false })
  assert.ok(named(game.menu.root, 'HUD.XPRing'))
  game.enterFloor(1)
  assert.ok(game.xpBar)
  game.run.state.player.xp=9;game.draw()
  const points = []
  const paths = []
  game.xpBar.moveTo=(x,y)=>points.push([x,y])
  game.xpBar.lineTo=(x,y)=>points.push([x,y])
  game.xpBar.stroke=()=>paths.push(points.slice())
  game.run.state.player.xp = 20; game.draw()
  assert.equal(game.xpBar.node.active,true)
  const maxAngle=Math.max(...points.map(([x,y])=>(Math.PI/2-Math.atan2(y,x)+Math.PI*2)%(Math.PI*2)))
  assert.ok(Math.abs(maxAngle-2*Math.PI*20/45)<1e-8)
  points.length = 0; game.run.state.player.xp = 45; game.draw()
  assert.equal(points.length, 0, 'a level-up resets progress to the next level')
  assert.equal(game.xpBar.node.active,false)
  game.run.state.player.xp=60;game.draw()
  assert.equal(game.xpBar.node.active,true,'earned progress reappears after a level-up')
  game.run.state.player.xp=profile.TOWER_XP_CAP;game.draw()
  assert.equal(game.xpBar.node.active,false,'maximum cultivation hides the ring')
})

for (const frame of [{width:1280,height:720},{width:1280,height:600}]) {
 test(`target health stays transparent and immediately below top resources ${frame.height}`,t=>{
  const storage=disk();seed(storage);const {game}=launch(t,storage,{assisted:false,frame});game.enterTraining();
  assert.equal(game.bossPanel.getComponent(Graphics),null,'no opaque panel behind target');
  const root=game.root, size=root.getComponent(UITransform).contentSize;
  const name=rectWithin(game.bossLabel.node,root),bar=rectWithin(game.bossBar.node,root);
  assert.ok(name.top<=size.height/2-58 && name.top>=size.height/2-70);
  assert.ok(bar.bottom>=size.height/2-98,'target bar stays near the top');
  const wave=rectWithin(named(game.battle,'HUD.FloorWaveLabel'),root);
  assert.ok(wave.right<name.left,'wave is beside the target, not above it');
  assert.equal(game.bossLabel.enableOutline,true);
 });
}

test('battle experience surrounds the portrait without a bottom bar',t=>{
 const storage=disk();seed(storage);const {game}=launch(t,storage,{assisted:false});game.enterTraining();
 const bar=game.xpBar.node;
 assert.equal(bar.parent.name,'HUD.Portrait');
 assert.equal(bar.name,'HUD.XPRing');
 assert.equal(bar.getComponent(UITransform).contentSize.width,110);
 assert.equal(descendants(game.battle).some(node=>node.name==='HUD.XPBar'),false);
 assert.equal(descendants(game.battle).some(node=>node.name==='HUD.XPCaption'),false);
});

test('target role uses a silver elite or gold demon-king title and clears on a normal target',t=>{
 const storage=disk();seed(storage);const {game}=launch(t,storage,{assisted:false});
 game.enterTraining();game.run.advance(2);game.run.pause();
 const enemy=game.run.state.enemies[0];game.run.state.enemies=[enemy];
 enemy.name='赤腹毒蛛';enemy.maxHp=5500;enemy.hp=5500;enemy.rank=2;game.draw();
 const badge=named(game.battle,'HUD.TargetRole').getComponent(Label);
 const normalBounds=rectWithin(game.bossLabel.node,game.root);
 for(const [role,title,color] of [['elite','精英','#D7E2EB'],['boss','妖王','#F0C66C'],['normal','','#D7E2EB']]){
  enemy.role=role;enemy.hp-=1;game.draw();
  assert.equal(badge.node.active,!!title);
  assert.equal(badge.string,title);
  if(title){
   assert.deepEqual(copy(badge.color),copy(new Color(color)));
   assert.ok(rectWithin(badge.node,game.root).right<rectWithin(game.bossLabel.node,game.root).left);
   assert.equal(badge.enableOutline,true);
  }else assert.deepEqual(rectWithin(game.bossLabel.node,game.root),normalBounds);
  assert.equal(game.bossPanel.getComponent(Graphics),null);
  assert.match(game.bossLabel.string,/赤腹毒蛛 · 2阶/);
 }
});

for(const frame of [{width:1280,height:720},{width:844,height:390}])test(`developer progress controls persist grants and reset a paused run (${frame.width})`,t=>{
 const storage=disk();seed(storage,{paused:true})
 storage.setItem('other-game','keep')
 const {game}=launch(t,storage,{frame})
 press(game,'开发者工具')
 const before=growth.growthSummary(game.store.state).available
 press(game,'+999技能点');press(game,'+999技能点')
 assert.equal(growth.growthSummary(game.store.state).available,before+1998)
 assert.equal(game.run.state.phase,'paused')
 const panel=named(game.overlay,'开发者工具面板')
 for(const n of descendants(panel).filter(n=>n.getComponent(Button))){
  const rect=rectWithin(n,panel),height=panel.getComponent(UITransform).contentSize.height
  assert.ok(rect.bottom>=-height/2 && rect.top<=height/2,n.name)
 }
 assert.ok(panel.getComponent(UITransform).contentSize.height<=game.height)
 const saved=copy(game.store.state),run=game.run
 storage.blockedWrites.add(campaign.TOWER_CAMPAIGN_KEY)
 press(game,'重置游戏进度')
 assert.deepEqual(game.store.state,saved);assert.equal(game.run,run)
 assert.ok(hasLabel(game.overlay,'保存失败'))
 storage.blockedWrites.clear();press(game,'返回工具');press(game,'重置游戏进度')
 assert.equal(game.run,null);assert.equal(game.screen,'camp');assert.equal(game.page,'hall')
 assert.equal(game.store.state.activeRun,null);assert.equal(game.store.state.xp,0)
 assert.equal(game.store.state.playtestSkillPoints,undefined)
 assert.equal(game.store.state.clearedFloor,0)
 assert.equal(storage.getItem('other-game'),'keep')
 assert.deepEqual(new campaign.TowerCampaignStore(playtest.towerStorage(storage),START).state,game.store.state)
})

for(const frame of [{width:1280,height:720},{width:844,height:390}])test(`ten-layer character panel shows full XP and pending breakthrough (${frame.width})`,t=>{
 const storage=disk();seed(storage,{patch:{xp:6600}})
 const {game}=launch(t,storage,{frame,assisted:false})
 game.menu.showCharacterInfo()
 assert.equal(named(game.menu.root,'角色境界').getComponent(Label).string,'筑基 · 大圆满')
 assert.ok(hasLabel(game.menu.root,'修为已满 · 等待突破'))
 assert.ok(hasLabel(game.menu.root,'突破条件待定'))
 assert.equal(descendants(game.menu.root).some(n=>n.name==='突破金丹'&&n.getComponent(Button)),false)
 assert.equal(game.store.state.xp,6600)
})

test('ten-layer golden core distinguishes tenth layer from full consummation',t=>{
 const storage=disk();seed(storage,{patch:{xp:13485}})
 const {game}=launch(t,storage,{assisted:false})
 game.menu.showCharacterInfo()
 assert.ok(hasLabel(game.menu.root,'金丹 十层'))
 assert.ok(hasLabel(game.menu.root,'修为  0 / 915'))
 game.store.act({type:'playtestMaxLevel'},START);game.render();game.menu.showCharacterInfo()
 assert.equal(named(game.menu.root,'角色境界').getComponent(Label).string,'金丹 · 大圆满')
 assert.ok(hasLabel(game.menu.root,'修为已圆满'))
})
