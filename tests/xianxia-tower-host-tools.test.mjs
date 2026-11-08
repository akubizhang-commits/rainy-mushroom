import {PlayerDamageFeedback} from '../js/xianxia/TowerPlayerDamageFeedback.js'
import {enemyDebuffs} from '../js/xianxia/TowerEnemyStatuses.js'
import {NORMAL_SKILL_NAMES} from '../js/xianxia/TowerEnemyAttacks.js'
import * as resonanceTools from '../js/xianxia/TowerResonance.js'
import {equipmentSkillBonus} from '../js/xianxia/TowerEquipmentSkillLevels.js'
import {FORGE_MATERIALS} from '../js/xianxia/TowerForgeMaterials.js'
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
import { castActionTiming } from '../js/xianxia/TowerSkillTiming.js'
import { swordQiSegments, swordQiVisualLift, swordQiPoseIndex } from '../js/xianxia/TowerSwordQi.js'
import * as content from '../js/xianxia/TowerContent.js'
import * as profile from '../js/xianxia/TowerProfile.js'
import * as loot from '../js/xianxia/TowerLoot.js'
import * as economy from '../js/xianxia/TowerEconomy.js'
import { HEX_CENTER, HEX_VERTICES } from '../js/xianxia/TowerArena.js'
import { TowerRun, coreLootSummary, validateTowerSnapshot, stats as combatStats, characterCombatAttributes } from '../js/xianxia/TowerRun.js'
import { checksum } from '../js/xianxia/Checksum.js'
import * as flight from '../js/xianxia/TowerFlight.js'
import * as breakthroughPresentation from '../js/xianxia/TowerBreakthroughPresentation.js'
import * as breakthrough from '../js/xianxia/TowerBreakthrough.js'
import * as pickups from '../js/xianxia/TowerPickups.js'
import * as pickupPresentation from '../js/xianxia/TowerPickupPresentation.js'
import * as sancai from '../js/xianxia/TowerSancai.js'
import * as sancaiMotion from '../js/xianxia/TowerSancaiMotion.js'
import {NingshenAuraState} from '../js/xianxia/TowerNingshen.js'
import {ningshenSurgeMultiplier} from '../js/xianxia/TowerSpirit.js'
import {JianguAuraState} from '../js/xianxia/TowerJiangu.js'
import {BumieAuraState} from '../js/xianxia/TowerBumie.js'
import {JianxinAuraState} from '../js/xianxia/TowerJianxin.js'
import {ELEMENT_NAMES} from '../js/xianxia/TowerWeaponElements.js'
import {drawLevelBeam} from '../js/xianxia/TowerLevelBeamPainter.js'
import {createBreakthroughPainter} from '../js/xianxia/TowerBreakthroughPainter.js'
import {createJindanPainter} from '../js/xianxia/TowerJindanPainter.js'
import {classProfile} from '../js/xianxia/TowerClassProfiles.js'
import {spawnMistPortals} from '../js/xianxia/TowerSpawnMist.js'
import * as forging from '../js/xianxia/TowerForging.js'

// Match the existing independent Cocos tests: transform the production TS,
// replace rendering/platform boundaries, and retain real business modules.
// No Creator installation, generated shared copy, browser globals, real disk,
// build, or real player save is needed. Button clicks below are node events,
// not a claim about native touch hit-testing or GPU rendering.
// Optional post-build regression: TOWER_HOST_BUNDLE=/absolute/path/to/index.*.js
// runs the same host behavior against Creator's emitted icon loader and Babel
// helpers. This catches array-only spread lowering that native Node TS cannot.
const sources = Object.fromEntries(['TowerStatusIconArt', 'TowerPreferences', 'TowerKeyboardNavigation', 'QingpingAudio', 'SwordBurstArt', 'ConvergenceArt', 'TowerHitArt', 'TowerMenuChrome', 'LiangyiPainter', 'SixiangPainter', 'LiangyiFormationArt', 'SixiangFormationArt', 'TowerMonsterMechanicsView', 'SwordArcArt', 'SwordLineArt', 'SwordShadowArt', 'SwordTiandiArt', 'SwordQiArt', 'OrbitSwordArt', 'TowerSkillEffects', 'TowerDepthOrder', 'TowerEnvironmentArt', 'TowerStoneArt', 'TowerProjectileArt', 'TowerSectScene', 'WeaponQualityArt', 'TowerCharacterArt', 'TowerMonsterArt', 'TowerSkillIcons', 'TowerSkillTreeCatalog', 'TowerSkillTreeLayout', 'TowerPlayerHud', 'TowerInventoryPanel', 'TowerMenu', 'TowerArenaView', 'TowerView'].map(name => [
  name,
  stripTypeScriptTypes(
    readFileSync(new URL(`../cocos-pilot/assets/scripts/${name}.ts`, import.meta.url), 'utf8')
      .replace(/^import .*$/gm, ''),
    { mode: 'transform' },
  ).replace(/^export /gm, ''),
]))
// Load the real newer presentation modules too. Missing VM bindings must not
// prevent every host test from reaching its behavior assertions.
const additionalPresentation = ['TowerBreakthroughAudio','TowerBreakthroughArt','TowerBreakthroughScene',
  'TowerLevelBeamArt','FlightSwordArt','FlightStreamArt','NingshenAuraArt','JianguAuraArt','BumieAuraArt',
  'JianxinAuraArt','TowerDamageNumbers','TowerDebuffIcons','CrossBurstArt','SancaiFormationArt',
  'TowerArmorArt','TowerSlamArt','TowerSpiritFlowArt','TowerChainArt','TowerFallingRockArt','TowerSafeSealArt',
  'TowerCrystalArt','TowerCoreArt','TowerPillarArt','TowerShockwaveArt','TowerWindbladeArt','TowerClawSwipeArt',
  'TowerEarthWaveArt','TowerBreathArt','TowerLightningArt','TowerEggArt','TowerMiasmaArt','TowerSpiderWebArt']
for (const name of [...additionalPresentation,'TowerAttackWarningPath','TowerCaptionLayout']) {
  sources[name]=stripTypeScriptTypes(readFileSync(new URL(`../cocos-pilot/assets/scripts/${name}.ts`,import.meta.url),'utf8')
    .replace(/^import .*$/gm,''),{mode:'transform'}).replace(/^export /gm,'')
}
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
  get activeInHierarchy() { return this.active && (!this.parent || this.parent.activeInHierarchy) }
  emit(event, ...args) { this.events.get(event)?.(...args) }
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
class EditBox {} // Identity only: this harness does not construct text editors.
class UIOpacity { opacity = 255 }
class UITransform {
  get width() { return this.contentSize.width }
  get height() { return this.contentSize.height }
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
  upgradeArrowCommands = []
  pathPoint = null
  clear() { this.arcCalls.length = 0 }
  arc(...args) { if (this.recordArcs) this.arcCalls.push(args) }
  roundRect() {} rect() {}
  recordUpgradeArrow(command, ...args) {
    if (this.node?.name.startsWith('功法可升级-')) this.upgradeArrowCommands.push([command, ...args])
  }
  fill() { this.recordUpgradeArrow('fill') }
  stroke() {}
  moveTo(x, y) {
    this.recordUpgradeArrow('moveTo', x, y)
    if (this.node?.name === '功法前置连线') this.pathPoint = { x, y }
  }
  lineTo(x, y) {
    this.recordUpgradeArrow('lineTo', x, y)
    if (this.node?.name === '功法前置连线' && this.pathPoint) {
      this.segments.push({ from: this.pathPoint, to: { x, y }, color: this.strokeColor.r })
      this.pathPoint = { x, y }
    }
  }
  circle() {} ellipse() {}
  close() { this.recordUpgradeArrow('close') }
  quadraticCurveTo() {}
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

function seed(storage, { hp = 100, paused = false, patch = {}, hostStorage = false } = {}) {
  const adapter = hostStorage ? playtest.towerStorage(storage) : storage
  const initial = new campaign.TowerCampaignStore(adapter, START)
  assert.ok(initial.act({ type: 'sync' }, START).ok)
  // A valid low-HP fixture, not a runtime health mutation or a bypass of validation.
  const envelope = JSON.parse(storage.getItem(campaign.TOWER_CAMPAIGN_KEY))
  assert.equal(envelope.schema, currentCampaignSchema, 'new fixtures use the current spirit-stone schema')
  const state = JSON.parse(envelope.data)
  assert.equal(state.spiritStones, 500)
  assert.equal(Object.hasOwn(state, 'cores'), false)
  state.hp = hp
  Object.assign(state, {...patch,pills:{...state.pills,...patch.pills}})
  if (patch.skills && !patch.skillsInitialized) state.skills = { sj_arc: 1, ...patch.skills }
  envelope.data = JSON.stringify(state)
  envelope.checksum = checksum(envelope.data)
  storage.data.set(campaign.TOWER_CAMPAIGN_KEY, JSON.stringify(envelope))
  const normal = new campaign.TowerCampaignStore(adapter, START)
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

function launch(t, storage, { assisted = true, menuOnly = false, frame = { width: 1280, height: 720 } } = {}) {
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
  const context = { PlayerDamageFeedback, enemyDebuffs, NORMAL_SKILL_NAMES, ...resonanceTools,equipmentSkillBonus,FORGE_MATERIALS,...tierTools,
    ...flight,...breakthroughPresentation,...breakthrough,...pickups,...pickupPresentation,...sancai,...sancaiMotion,
    NingshenAuraState,ningshenSurgeMultiplier,JianguAuraState,BumieAuraState,JianxinAuraState,ELEMENT_NAMES,
    drawLevelBeam,createBreakthroughPainter,createJindanPainter,classProfile,spawnMistPortals,...forging,
    AudioClip: class {}, AudioSource: class { stop(){} play(){} destroy(){} },
    ...alchemyTools, ...materialLootTools, ...shadowTools, ...hitFeedbackTools, convergencePoses, ...yujianTools, ...inventoryTools, ...weaponTools, ...equipmentTools, ...craftingTools, ...campaign, ...playtest, ...growth, ...content, ...profile, ...pillTools, ...loot, ...economy, TowerRun, coreLootSummary, skillPresentation, skillForm, orbitSwordPose, swordQiSegments, swordQiVisualLift, swordQiPoseIndex, castActionTiming, combatStats, characterCombatAttributes,
    Node, UITransform, UIOpacity, EditBox, Graphics, Label, LabelOutline, LabelShadow, Button, Sprite, SpriteFrame, ImageAsset, Texture2D,
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
  Object.assign(context,runInNewContext(`(() => { ${sources.TowerStatusIconArt}\nreturn {TowerStatusIconArt,STATUS_ICON_SIZE} })()`,context));
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
  for(const name of additionalPresentation)context[name]=runInNewContext(
    `(() => { ${sources[name]}\nreturn ${name} })()`,context,{filename:`${name}.ts`})
  context.ordinarySectorPath=runInNewContext(
    `(() => { ${sources.TowerAttackWarningPath}\nreturn ordinarySectorPath })()`,context)
  context.layoutTowerCaptions=runInNewContext(
    `(() => { ${sources.TowerCaptionLayout}\nreturn layoutTowerCaptions })()`,context)
  // Separate closures preserve the actual modules' private constants (both have C).
  Object.assign(context, runInNewContext(`(() => { ${sources.TowerSkillTreeCatalog}\nreturn { TREE_BRANCHES, COMMON_SKILL_IDS, FUTURE_SKILLS, DISPLAY_STAGES, COLUMN_INDEX, TREE_COLUMNS } })()`, context))
  Object.assign(context, runInNewContext(`(() => { ${sources.TowerSkillTreeLayout}\nreturn { layoutSkillTree } })()`, context))
  Object.assign(context, runInNewContext(`(() => { ${sources.TowerPlayerHud}\nreturn {createPlayerHud,drawPlayerHp,drawPlayerMana,drawPlayerXp,drawHudPortrait,drawHudActionIcon,SETTINGS_ICON_SIZE} })()`, context))
  Object.assign(context, runInNewContext(`(() => { ${sources.TowerMenuChrome}\nreturn {drawMenuVeil,drawMenuClose,drawMenuBack,isMenuBack,MENU_COLORS,ITEM_COLORS,BOOK_COLORS} })()`, context));
  context.TowerInventoryPanel = runInNewContext(`(() => { ${sources.TowerInventoryPanel}\nreturn TowerInventoryPanel })()`, context)
  context.TowerMenu = runInNewContext(`(() => { ${sources.TowerMenu}\nreturn TowerMenu })()`, context, { filename: 'TowerMenu.ts' })
  // Execute the real renderer with real arena geometry; no substitute draw
  // functions may hide a missing dependency or a host/helper API mismatch.
  Object.assign(context, runInNewContext(
    `(() => { ${sources.TowerArenaView}\nreturn {drawTowerArena,drawTowerArenaMap} })()`,
    context, { filename: 'TowerArenaView.ts' },
  ))
  // Menu-only checks exercise actual UI nodes without constructing unrelated battle VFX.
  if(menuOnly){
    const store=new campaign.TowerCampaignStore(storage,START);
    const menu=new context.TowerMenu(new Node('canvas'),frame.width,frame.height,{isReadOnly:()=>false,enterFloor:()=>{},action:()=>{throw Error('read-only point UI dispatched a business action')},page:p=>menu.render(store.state,p)});
    menu.render(store.state,'hall');t.after(()=>menu.destroy());
    return {game:{store,menu,root:menu.root},icons};
  }
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

test('balance phase1 menu explains existing mana, voucher and cultivation rules', t => {
  const storage=disk();seed(storage,{patch:{clearedFloor:1}})
  const {game}=launch(t,storage,{menuOnly:true})
  const before=copy(game.store.state),saved=storage.getItem(campaign.TOWER_CAMPAIGN_KEY),writes=storage.writes.length
  game.menu.homeDetailsOpen=true
  game.menu.render(game.store.state,'home')
  const text=()=>descendants(game.menu.root).map(n=>n.getComponent(Label)?.string||'').join('\n')
  assert.match(text(),/开局赠送1000/)
  assert.match(text().replace(/\s/g,""),/合计7000.*70抽/)
  assert.doesNotMatch(text(),/开局、重刷、分解和出售均不产出/)
  assert.match(text(),/灵力值不足时自动服用回灵丹/)
  assert.match(text(),/无丹药则技能等待恢复，普攻继续/)
  assert.match(text().replace(/\s/g,''),/脱战3秒后恢复加快，离开副本立即回满/)
  assert.doesNotMatch(text(),/灵力不足仍可施法|施法与伤害不变/)
  assert.match(text(),/各池独立/)
  const preview=new Node('phase1-pill-preview')
  game.menu.commerceItemPreview(preview,'pills',{key:'peiyuan'},'peiyuan',412,572,()=>{})
  const description=descendants(preview).map(n=>n.getComponent(Label)?.string||'').join('\n')
  assert.match(description,/培元丹50、凝气丹90/)
  assert.match(description,/剩余6颗/)
  assert.match(description,/本次可得50修为/)
  game.menu.render(game.store.state,'hall');game.menu.showCharacterInfo()
  const value=label=>named(game.menu.root,`角色数值-${label}`).getComponent(Label).string
  assert.equal(value('灵力值'),'100 / 100')
  assert.equal(value('战斗恢复／秒'),'3')
  assert.equal(value('脱战3秒后／秒'),'10')
  assert.equal(value('灵力值不足时'),'自动服丹；无丹技能等待，普攻继续')
  assert.doesNotMatch(text(),/施法与伤害不变/)
  const spiritPreview=new Node('spirit-pill-preview')
  game.menu.commerceItemPreview(spiritPreview,'pills',{key:'huiling'},'huiling',412,572,()=>{})
  const spiritText=descendants(spiritPreview).map(n=>n.getComponent(Label)?.string||'').join('\n').replace(/\s/g,'')
  for(const rule of ['自动服用1颗','立即恢复40点','10秒每秒恢复4点','服用间隔12秒','药效不叠加'])assert.ok(spiritText.includes(rule),rule)
  assert.doesNotMatch(spiritText,/undefined|增加.*修为|共享6颗/)
  const shopDescription=game.menu.commerceDescription('pills',{key:'huiling'}).replace(/\s/g,'')
  assert.ok(shopDescription.includes('立即恢复40点'))
  assert.doesNotMatch(shopDescription,/undefined|增加.*修为/)
  assert.deepEqual(game.store.state,before)
  assert.equal(storage.getItem(campaign.TOWER_CAMPAIGN_KEY),saved)
  assert.equal(storage.writes.length,writes)
})

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
  assert.deepEqual(requests.map(r=>r.path).sort(),['bat','boar','falcon','spider','wolf'].map(f=>'tower-monsters/'+f).sort())
  const malformed = new ImageAsset(); malformed.width = 512
  for(const request of requests){
   if(request.path==='tower-monsters/wolf')request.done(null,malformed);
   else icons.complete(request,Error('missing'));
  }
  for (let i = 0; i < 100; i++) {
    art.beginFrame()
    for (const family of ['boar', 'wolf', 'spider', 'bat', 'falcon']) assert.equal(paint(family), 0)
    art.endFrame()
  }
  assert.equal(icons.requests.filter(r => r.path.startsWith('tower-monsters/')).length, 5)
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
  game.withdraw(); press(game, '确认')
  requests.forEach(r => icons.complete(r))
  assert.equal(game.screen, 'camp')
  assert.equal(game.battle, null)
  assert.equal(game.monsterArt.actors.size, 0)
  assert.equal(layer.children.length, 0)
  assert.ok(!descendants(game.root).some(n => n.name.startsWith('妖兽素材-')))
})

test('real battle places ground warnings below actors and foreground, preserves state, and clears it on camp', t => {
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
  for(const node of [game.world.node,game.warnings.node,game.monsterLayer,game.foreground.node])assert.ok(index(node)>=0)
  assert.ok(index(game.world.node) < index(game.warnings.node))
  assert.ok(index(game.warnings.node) < index(game.monsterLayer))
  assert.ok(index(game.monsterLayer) < index(game.foreground.node))
  assert.ok(index(game.foreground.node) < index(children.find(n => n.name === '妖兽名牌')))
  const oldLayer = game.monsterLayer, count = requests.length
  game.render()
  assert.equal(oldLayer.children.length, 0)
  assert.ok(game.monsterLayer.children.length > 0, 'pause redraw reuses cached resources')
  assert.equal(icons.requests.filter(r => r.path.startsWith('tower-monsters/')).length, count)
  const battleLayer = game.monsterLayer
  game.withdraw(); press(game, '确认')
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
    return typeof caption === 'string' ? node.name === caption || text === caption || node.name === ({'暂停':'HUD.Pause','技能':'HUD.Skills','功法':'HUD.Skills','背包':'HUD.Inventory'}[caption]) : caption.test(node.name)
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

test('retired playtest query does not fork the campaign or access the old save', t => {
 const storage=disk();seed(storage);const old='untouched-old-playtest';
 storage.data.set(playtest.TOWER_PLAYTEST_KEY,old);storage.blockedWrites.add(playtest.TOWER_PLAYTEST_KEY);
 const {game}=launch(t,storage);
 assert.equal(game.store.readOnly,false);assert.equal(game.menu.state.playtest,false);
 const before=copy(game.store.state);
 assert.equal(game.action({type:'buyPill',id:'huichun',count:1}).ok,true);
 assert.equal(game.store.state.spiritStones,before.spiritStones-5);
 assert.equal(game.store.state.pills.huichun,before.pills.huichun+1);
 assert.equal(storage.getItem(playtest.TOWER_PLAYTEST_KEY),old);
 assert.equal(storage.writes.includes(playtest.TOWER_PLAYTEST_KEY),false);
 assert.deepEqual(new campaign.TowerCampaignStore(storage,START).state,game.store.state);
});

test('failed single-save purchase retries without a second deduction or an isolated copy', t => {
 const storage=disk();seed(storage);const {game}=launch(t,storage);
 const before=copy(game.store.state),raw=storage.getItem(campaign.TOWER_CAMPAIGN_KEY);
 storage.blockedWrites.add(campaign.TOWER_CAMPAIGN_KEY);
 assert.equal(game.action({type:'buyPill',id:'huichun',count:1}).ok,false);
 assert.deepEqual(game.store.state,before);assert.equal(storage.getItem(campaign.TOWER_CAMPAIGN_KEY),raw);
 storage.blockedWrites.clear();assert.equal(game.action({type:'buyPill',id:'huichun',count:1}).ok,true);
 assert.equal(game.store.state.spiritStones,before.spiritStones-5);
 assert.equal(game.store.state.pills.huichun,before.pills.huichun+1);
 assert.equal(storage.getItem(playtest.TOWER_PLAYTEST_KEY),null);
});

test('single-save host stays read-only on corrupt data even with the retired playtest query', t => {
 const storage=disk();seed(storage);const bad='corrupt current campaign';
 storage.data.set(campaign.TOWER_CAMPAIGN_KEY,bad);storage.writes.length=0;
 const {game,tick}=launch(t,storage);
 assert.equal(game.store.readOnly,true);assert.equal(game.store.error,'corrupt');
 assert.equal(game.action({type:'buyPill',id:'huichun',count:1}).ok,false);tick(6);
 assert.equal(storage.getItem(campaign.TOWER_CAMPAIGN_KEY),bad);assert.equal(storage.writes.length,0);
 assert.equal(storage.getItem(playtest.TOWER_PLAYTEST_KEY),null);
});

for (const assisted of [false, true]) {
 test(`single-save sync recovery re-enables purchase (${assisted?'retired query':'ordinary'})`,t=>{
  const storage=disk();seed(storage);const {game,tick}=launch(t,storage,{assisted});
  press(game,'丹霞峰');press(game,'丹霞主殿');press(game,'商品卡片-huichun');
  storage.blockedWrites.add(campaign.TOWER_CAMPAIGN_KEY);tick(6);
  assert.equal(game.menu.state.readOnly,true);
  const disabled=button(game,'确认购买');assert.equal(disabled.getComponent(Button).interactable,false);
  storage.blockedWrites.clear();tick(6);
  assert.equal(game.page,'pills');assert.equal(game.menu.state.readOnly,false);assert.equal(game.menu.state.playtest,false);
  const before=copy(game.store.state);disabled.events.get(Button.EventType.CLICK)();
  assert.deepEqual(game.store.state,before,'stale disabled callback cannot spend');
  press(game,'确认购买');assert.equal(game.store.state.spiritStones,before.spiritStones-5);
  assert.equal(game.store.state.pills.huichun,before.pills.huichun+1);
  assert.equal(storage.getItem(playtest.TOWER_PLAYTEST_KEY),null);
 });
}

test('single-save healing redraw preserves the selected current skill',t=>{
 const storage=disk();seed(storage,{hp:50});const {game,tick}=launch(t,storage);
 press(game,'功法');press(game,'功法图标-sj_arc');
 tick(6);assert.ok(game.store.state.hp>50&&game.store.state.hp<100);
 assert.equal(game.menu.state.playtest,false);assert.equal(game.menu.detailId,'sj_arc');
 tick(180);assert.equal(game.store.state.hp,100);assert.equal(game.menu.detailId,'sj_arc');
 assert.deepEqual(new campaign.TowerCampaignStore(storage,START+186000).state,game.store.state);
});

test('skill page hides battle vitals and keeps rank hints below icons', t => {
  const storage = disk(), original = seed(storage, { hp: 50 })
  const { game } = launch(t, storage)
  press(game, '功法')
  const root = game.menu.root
  const text = labelText(root)
  assert.doesNotMatch(text, /妖丹解锁功法|贡献用于|上下\/左右|九阶段|角色Lv\./)
  assert.equal(descendants(root).some(node => node.name === 'HUD.PlayerVitals'), false)
  const icon = named(root, '功法图标-sj_arc')
  const badge = named(root, '功法等级-sj_arc')
  assert.ok(rectWithin(badge, icon).top < -48, 'rank must not overlap the circular artwork')
  assert.equal(named(root, '功法前置连线').getComponent(Graphics).segments.length, 0)
  const before=copy(game.store.state)
  game.enterFloor(1)
  for (const name of ['HUD.Portrait', 'HUD.HPBar', 'HUD.PaperArtwork', 'HUD.RealmLabel']) assert.ok(named(game.root, name))
  assert.equal(game.store.state.spiritStones,before.spiritStones)
  assert.equal(game.store.state.contribution,before.contribution)
  assert.equal(game.store.state.hp,before.hp)
  assert.ok(game.store.state.activeRun)
  assert.deepEqual(new campaign.TowerCampaignStore(storage,START).state,game.store.state)
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
    assert.equal(game.store.state.contribution, 1000)
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

test('host navigation renders exact wallet amounts without changing permanent progress',t=>{
 const storage=disk();seed(storage);const {game}=launch(t,storage);
 const before=copy(game.store.state),saved=storage.getItem(campaign.TOWER_CAMPAIGN_KEY),writes=storage.writes.length;
 for(const page of ['hall','home','forge','pills']){
  game.goto(page);const wallet=named(game.menu.root,'货币信息');
  assert.equal(descendants(wallet).filter(n=>n.getComponent(Label)).map(n=>n.getComponent(Label).string).join('\n'),'×5\n×1000');
 }
 assert.deepEqual(game.store.state,before);assert.equal(storage.getItem(campaign.TOWER_CAMPAIGN_KEY),saved);
 assert.equal(storage.writes.length,writes);
});

for (const stones of [0, 23]) {
  test(`gear purchase rejects ${stones} stones even with vouchers without changing state or save`, t => {
    const storage = disk(); seed(storage, { patch: { spiritStones: stones, contribution: 1000 } })
    const { game } = launch(t, storage)
    press(game, '炼器峰')
    const before = copy(game.store.state), raw = storage.getItem(campaign.TOWER_CAMPAIGN_KEY)
    const writes = storage.writes.length
    press(game, '炼器主殿'); press(game, '商品卡片-weapon:fan:q1')
    assert.deepEqual(game.store.state, before, 'opening a purchase cannot spend resources')
    const control = button(game, '确认购买')
    assert.equal(control.getComponent(Button).interactable, false)
    control.events.get(Button.EventType.CLICK)()
    assert.equal(game.action({ type: 'buyGear', id: 'weapon:fan:q1', count: 1,
      sequence: before.forgeSequence + 1, requestId: 'insufficient-gear' }).ok, false)
    assert.deepEqual(game.store.state, before)
    assert.equal(storage.getItem(campaign.TOWER_CAMPAIGN_KEY), raw)
    assert.equal(storage.writes.length, writes)
  })
}

test('gear purchase atomically pays 24 stones with zero vouchers and retries exactly once', t => {
  const storage = disk(); seed(storage, { patch: { spiritStones: 24, contribution: 0 } })
  const { game, clock } = launch(t, storage)
  press(game, '炼器峰')
  const before = copy(game.store.state), raw = storage.getItem(campaign.TOWER_CAMPAIGN_KEY)
  const writes = storage.writes.length
  press(game, '炼器主殿'); press(game, '商品卡片-weapon:fan:q1')
  assert.deepEqual(game.store.state, before)
  assert.equal(storage.writes.length, writes)
  storage.blockedWrites.add(campaign.TOWER_CAMPAIGN_KEY)
  const staleConfirm = button(game, '确认购买').events.get(Button.EventType.CLICK)
  press(game, '确认购买')
  const action = { type: 'buyGear', id: 'weapon:fan:q1', count: 1, ...copy(game.menu.gearRequest) }
  assert.deepEqual(game.store.state, before, 'failed save rolls back currency, inventory, sequence and RNG')
  assert.equal(storage.getItem(campaign.TOWER_CAMPAIGN_KEY), raw)
  assert.equal(storage.writes.length, writes)
  assert.ok(named(game.menu.root, '购买物品弹窗'))
  assert.match(labelText(game.menu.root), /保存失败/)
  const previewStorage = disk(); previewStorage.data.set(campaign.TOWER_CAMPAIGN_KEY, raw)
  const preview = new campaign.TowerCampaignStore(previewStorage, START)
  const expected = preview.act(action, START)
  assert.ok(expected.ok)
  storage.blockedWrites.clear()
  clock.now += 701
  staleConfirm()
  assert.deepEqual(game.store.state, before, 'destroyed purchase callback cannot resubmit')
  assert.equal(storage.writes.length, writes)
  press(game, '确认购买')
  assert.equal(game.store.state.spiritStones, 0)
  assert.equal(game.store.state.contribution, 0)
  assert.deepEqual(game.store.state, preview.state)
  const addedIds = Object.keys(game.store.state.weapons).filter(id => !Object.hasOwn(before.weapons, id))
  assert.deepEqual(addedIds, [`weapon-${before.weaponSequence + 1}`])
  assert.deepEqual(expected.ids, addedIds)
  assert.equal(game.store.state.weapons[addedIds[0]].definitionId, 'eq_sword_suwen')
  assert.equal(game.store.state.weapons[addedIds[0]].quality, 1)
  assert.equal(storage.writes.length, writes + 1)
  assert.ok(named(game.menu.root, '获得物品弹窗'))
  const committed = copy(game.store.state)
  press(game, '确认获得')
  clock.now += 701
  staleConfirm()
  assert.deepEqual(game.store.state, committed)
  assert.equal(storage.writes.length, writes + 1)
  const reloaded = new campaign.TowerCampaignStore(storage, START)
  assert.equal(reloaded.readOnly, false)
  assert.deepEqual(reloaded.state, committed, 'purchased instance survives reload')
  assert.equal(reloaded.act(action, START).duplicate, true)
  assert.deepEqual(reloaded.state, committed, 'replayed receipt cannot charge or grant again')
})

test('skill pane uses shared weapon damage once after equipping an affix instance', t => {
  const storage = disk();
  const weapon = weaponTools.rollWeapon('fan', 1, () => .5, 'weapon-1');
  seed(storage, { patch: {
    weaponSequence: 1, weaponCounters: { iron: 0, 'weapon-1': 0 },
    weapons: { iron: weaponTools.createIronWeapon(), 'weapon-1': weapon },
    loadouts: ['配装一', '配装二', '配装三'].map(name => ({
      name, weaponId: 'weapon-1', armorId: 'basic-armor', ringId: 'basic-ring', active: ['sj_yujian'], passive: [], evolutions: [],
    })),
  } });
  const { game } = launch(t, storage);
  const before = copy(game.store.state), raw = storage.getItem(campaign.TOWER_CAMPAIGN_KEY), writes = storage.writes.length;
  press(game, '功法');
  game.menu.openDetails('sj_yujian');
  const info = skillPresentation(game.store.state, 'sj_yujian');
  const damage = info.stats.find(row => row.key === 'roundDamage').value;
  const displayed = String(Math.round(damage * 10) / 10);
  const row = named(game.menu.root, '功法数值-每剑伤害');
  assert.deepEqual(descendants(row).filter(n => n.getComponent(Label)).map(n => n.getComponent(Label).string), ['每剑伤害', displayed]);
  assert.deepEqual(game.store.state, before);
  assert.equal(storage.getItem(campaign.TOWER_CAMPAIGN_KEY), raw);
  assert.equal(storage.writes.length, writes);
});

test('first special skill book costs 200 stones atomically and subsequent ranks do not rebuy it', t => {
  const storage = disk(); seed(storage, { patch: {
    ...investedSkillFixture(), spiritStones: 200, skills: { ...growth.giftSkills(3), sj_arc: 2 }, books: [],
  } })
  const { game } = launch(t, storage)
  press(game, '功法')
  press(game, '功法节点-sj_line')
  assert.equal(growth.skillRequirement(game.store.state, 'sj_line').bookCost, 200)
  assert.ok(labelText(game.menu.root).includes('经卷所需：'))
  const before = copy(game.store.state), raw = storage.getItem(campaign.TOWER_CAMPAIGN_KEY)
  const writes = storage.writes.length
  storage.blockedWrites.add(campaign.TOWER_CAMPAIGN_KEY)
  press(game, 'learnSkill-sj_line')
  assert.deepEqual(game.store.state, before)
  assert.equal(storage.getItem(campaign.TOWER_CAMPAIGN_KEY), raw)
  assert.equal(storage.writes.length, writes)
  storage.blockedWrites.clear()
  press(game, 'learnSkill-sj_line')
  assert.equal(game.store.state.spiritStones, 0)
  assert.equal(game.store.state.skills.sj_line, 1)
  assert.ok(game.store.state.books.includes('sj_line'))
  assert.equal(growth.growthSummary(game.store.state).spent, growth.growthSummary(before).spent + 1)
  press(game, 'learnSkill-sj_line')
  assert.equal(game.store.state.spiritStones, 0)
  assert.equal(game.store.state.skills.sj_line, 2)
  assert.equal(game.store.state.contribution, before.contribution)
  assert.equal(game.store.state.books.filter(id => id === 'sj_line').length, 1)
  assert.equal(storage.writes.length, writes + 2)
  const reloaded = new campaign.TowerCampaignStore(storage, START)
  assert.equal(reloaded.readOnly, false)
  assert.deepEqual(reloaded.state, game.store.state)
})

test('level-only point information has no purchase action and does not change resources', t => {
 const storage=disk();seed(storage,{patch:{clearedFloor:9,spiritStones:4800}});
 const {game}=launch(t,storage,{assisted:false,menuOnly:true});game.menu.go('librarySkills');
 const before=copy(game.store.state);press(game,'获取悟道点');
 assert.ok(named(game.menu.root,'悟道点说明遮罩'));
 assert.match(labelText(game.menu.root),/每升1级获得1点悟道点/);
 assert.match(labelText(game.menu.root),/30\s*级累计\s*35\s*点/);
 assert.ok(!descendants(game.menu.root).some(n=>n.name.includes('研习')));
 assert.deepEqual(game.store.state,before);
});
test('every floor shows its first-clear reward, floors 1/4/7 grant dianjuan',t=>{
 const storage=disk();seed(storage);const {game}=launch(t,storage,{assisted:false,menuOnly:true});game.menu.go('tower');
 for(let floor=1;floor<=9;floor++){
  const row=named(game.menu.root,`塔层-${floor}`);assert.ok(row);
  // 2026-11-06：第1/4/7层点眷，第2/5/8层灵石＋炼器材料，第3/6/9层器心＋炼器材料。
  assert.equal(descendants(row).some(n=>n.name==='首通奖励'),true,`floor ${floor} box`);
  assert.equal(descendants(row).some(n=>n.name==='首通炼器材料'),[2,3,5,6,8,9].includes(floor),`floor ${floor} materials`);
 }
 assert.ok(!labelText(game.menu.root).includes('×0'));
});

test('manual healing works after sync recovery and a failed pill save consumes neither HP nor inventory', t => {
  const storage = disk(), original = seed(storage, { hp: 17.5 })
  const { game, tick } = launch(t, storage)
  press(game, '背包')
  press(game, '丹药')
  press(game, '背包物品-huichun')
  storage.blockedWrites.add(campaign.TOWER_CAMPAIGN_KEY)
  tick(6)
  storage.blockedWrites.clear()
  tick(6)
  const before = copy(game.store.state)
  const healingButton = () => button(game, '使用')
  assert.equal(healingButton().getComponent(Button).interactable, true)
  storage.blockedWrites.add(campaign.TOWER_CAMPAIGN_KEY)
  healingButton().events.get(Button.EventType.CLICK)()
  assert.deepEqual(game.store.state, before)
  storage.blockedWrites.clear()
  healingButton().events.get(Button.EventType.CLICK)()
  assert.equal(game.store.state.hp, Math.min(100, before.hp + 50))
  assert.equal(game.store.state.pills.huichun, before.pills.huichun - 1)
  assert.equal(storage.getItem(playtest.TOWER_PLAYTEST_KEY),null)
  assert.deepEqual(new campaign.TowerCampaignStore(storage,START+12000).state,game.store.state)
})

test('direct developer tool controls preserve paused snapshots and failed preferences',t=>{
 const storage=disk();seed(storage,{hp:17.5,paused:true});const {game}=launch(t,storage);
 const before=game.run.snapshot();press(game,'开发者工具');
 storage.blockedWrites.add(playtest.TOWER_PLAYTEST_TOOLS_KEY);press(game,'游戏速度 ×1');
 assert.deepEqual(copy(game.tools),{speed:1,invincible:false});assert.deepEqual(game.run.snapshot(),before);
 storage.blockedWrites.clear();press(game,'返回工具');press(game,'游戏速度 ×1');
 assert.deepEqual(copy(game.tools),{speed:2,invincible:false});assert.deepEqual(game.run.snapshot(),before);
 press(game,'无敌：关闭');assert.deepEqual(copy(game.tools),{speed:2,invincible:true});
 assert.deepEqual(game.run.snapshot(),before);
 press(game,'游戏速度 ×2');press(game,'无敌：开启');
 assert.deepEqual(playtest.readPlaytestTools(storage),{speed:3,invincible:false});
 assert.deepEqual(game.run.snapshot(),before);press(game,'关闭开发者工具');
 assert.equal(game.run.state.phase,'paused');press(game,'继续挑战');
 assert.equal(game.run.state.phase,'playing');assert.equal(game.run.state.player.hp,17.5);
});

test('failed pause checkpoint blocks withdrawal until the real retry button commits it',t=>{
 const storage=disk();seed(storage,{hp:17.5,paused:true});const {game}=launch(t,storage);
 press(game,'继续挑战');const before=copy(game.store.state),raw=storage.getItem(campaign.TOWER_CAMPAIGN_KEY);
 storage.blockedWrites.add(campaign.TOWER_CAMPAIGN_KEY);game.pause();
 assert.ok(game.pending);assert.ok(hasLabel(game.overlay,'保存尚未完成'));
 assert.deepEqual(game.store.state,before);assert.equal(storage.getItem(campaign.TOWER_CAMPAIGN_KEY),raw);
 const pending=game.pending;game.withdraw();assert.equal(game.pending,pending);assert.equal(game.screen,'battle');
 storage.blockedWrites.clear();press(game,'重试保存');assert.equal(game.pending,null);
 assert.equal(game.run.state.phase,'paused');assert.equal(game.store.state.activeRun.snapshot.phase,'paused');
 assert.equal(game.run.state.player.hp,17.5);
 game.withdraw();press(game,'取消');assert.equal(game.run.state.phase,'paused');assert.ok(game.store.state.activeRun);
 game.withdraw();press(game,'确认');assert.equal(game.screen,'camp');assert.equal(game.store.state.activeRun,null);
 assert.equal(game.store.state.hp,17.5);
 assert.deepEqual(new campaign.TowerCampaignStore(storage,START).state,game.store.state);
});

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
  test(`paused and withdrawn loot credits only ${headroom} stones at the actual host cap`, t => {
    const storage = disk(), cap = campaign.PLAYTEST_STONE_CAP
    seed(storage, { hostStorage: true, patch: { spiritStones: cap - headroom } })
    const { game } = launch(t, storage, { assisted: false })
    assert.equal(game.store.allowPlaytestTools, true, 'URL mode does not disable the host storage adapter')
    game.enterFloor(1)
    const snapshot = advanceCombat(game, state =>
      economy.legacyRewardToStones(state.earned.cores - pickups.pendingCoreValue(state)) > headroom)
    assert.equal(snapshot.phase, 'playing')
    press(game, '暂停')
    assert.equal(game.pending, null)
    assert.equal(game.store.state.spiritStones, cap)
    assert.equal(game.store.state.activeRun.snapshot.phase, 'paused')
    const pause = labelText(game.overlay)
    assert.doesNotMatch(pause, /本次获得|药材|灵石|入账|自动出售|undefined/)
    assert.match(pause, /继续挑战/)
    const pausedReload = new campaign.TowerCampaignStore(playtest.towerStorage(storage), START)
    assert.equal(pausedReload.readOnly, false)
    assert.equal(pausedReload.state.spiritStones, cap)
    assert.deepEqual(pausedReload.state.activeRun.snapshot, game.store.state.activeRun.snapshot)
    press(game, '离开战斗')
    assert.match(labelText(game.overlay), /确认是否退出？/)
    assert.doesNotMatch(labelText(game.overlay), /收获|灵石|入账/)
    press(game, '取消')
    assert.ok(game.store.state.activeRun)
    press(game, '离开战斗')
    const before = copy(game.store.state), raw = storage.getItem(campaign.TOWER_CAMPAIGN_KEY)
    const writes = storage.writes.length
    storage.blockedWrites.add(campaign.TOWER_CAMPAIGN_KEY)
    press(game, '确认')
    assert.ok(game.pending)
    assert.deepEqual(game.store.state, before)
    assert.equal(storage.getItem(campaign.TOWER_CAMPAIGN_KEY), raw)
    assert.equal(storage.writes.length, writes)
    storage.blockedWrites.clear()
    const staleRetry = button(game, '重试保存').events.get(Button.EventType.CLICK)
    press(game, '重试保存')
    assert.equal(game.pending, null)
    assert.equal(game.store.state.activeRun, null)
    assert.equal(game.store.state.lastResult.outcome, 'abandoned')
    assert.equal(game.store.state.lastResult.earned.spiritStones, headroom)
    assert.equal(game.store.state.lastResult.stoneLoot, undefined)
    assert.equal(game.store.state.spiritStones, cap)
    assert.equal(game.screen, 'camp')
    assert.equal(game.page, 'hall')
    assert.equal(game.overlay, null)
    const committed = copy(game.store.state)
    staleRetry()
    assert.deepEqual(game.store.state, committed)
    assert.equal(storage.writes.length, writes + 1)
    assert.deepEqual(new campaign.TowerCampaignStore(playtest.towerStorage(storage), START).state, committed)
  })
}

test('uncollected loot is excluded at pause and collected exactly once on withdrawal', t => {
  const storage = disk(); seed(storage)
  const { game } = launch(t, storage, { assisted: false })
  const initial = game.store.state.spiritStones
  game.enterFloor(1)
  const snapshot = advanceCombat(game, state => pickups.pendingCoreValue(state) > 0)
  const pending = pickups.pendingCoreValue(snapshot)
  assert.ok(pending > 0)
  press(game, '暂停')
  assert.equal(game.store.state.spiritStones, initial + economy.legacyRewardToStones(snapshot.earned.cores - pending))
  press(game, '离开战斗'); press(game, '确认')
  assert.equal(game.store.state.spiritStones, initial + economy.legacyRewardToStones(snapshot.earned.cores))
  assert.equal(game.store.state.lastResult.earned.spiritStones, economy.legacyRewardToStones(snapshot.earned.cores))
  const committed = copy(game.store.state), writes = storage.writes.length
  game.withdraw()
  assert.deepEqual(game.store.state, committed)
  assert.equal(storage.writes.length, writes)
})

// 2026-11-06：第三层首通改为赤曜器心×1＋炼器材料（凝灵晶×2、玄铁×20），不再给点眷。
test('capped floor-three first clear awards forge materials atomically without skill points', t => {
  const storage = disk(), cap = campaign.PLAYTEST_STONE_CAP
  seed(storage, { hostStorage: true, patch: {
    spiritStones: cap - 10, clearedFloor: 2, xp: 10920, tutorialWaves: 3,
    skills: { sj_yujian: 1, sj_arc: 1, sj_wanjian: 1 },
  } })
  const { game } = launch(t, storage, { assisted: false })
  game.enterFloor(3)
  const before = copy(game.store.state), raw = storage.getItem(campaign.TOWER_CAMPAIGN_KEY)
  const writes = storage.writes.length
  const snapshot = advanceCombat(game, state => state.phase === 'won')
  const killValue = snapshot.killLedger.reduce((sum, kill) => sum + loot.CORE_RANK_VALUES[kill.coreRank], 0)
  assert.equal(snapshot.earned.cores, killValue + 10, 'floor-three boss-clear award')
  assert.equal(pickups.pendingCoreValue(snapshot), 0, 'terminal runs collect remaining drops')
  assert.equal(snapshot.earned.contribution, 0, 'combat no longer awards vouchers')
  storage.blockedWrites.add(campaign.TOWER_CAMPAIGN_KEY)
  game.update(0)
  assert.ok(game.pending)
  assert.deepEqual(game.store.state, before)
  assert.equal(storage.getItem(campaign.TOWER_CAMPAIGN_KEY), raw)
  assert.equal(storage.writes.length, writes)
  storage.blockedWrites.clear()
  const staleRetry = button(game, '重试保存').events.get(Button.EventType.CLICK)
  press(game, '重试保存')
  assert.equal(game.pending, null)
  assert.equal(game.run, null)
  const result = game.store.state.lastResult
  assert.equal(result.firstClear, true)
  assert.equal(result.earned.spiritStones, 10)
  assert.equal(result.earned.contribution, 0)
  assert.equal(game.store.state.contribution, before.contribution)
  assert.equal(game.store.state.pills.forge_ninglingjing, (before.pills.forge_ninglingjing || 0) + 2 + snapshot.killLedger.filter(k => k.archetype.includes('boss')).length)
  assert.equal(game.store.state.spiritStones, cap)
  assert.equal(game.store.state.clearedFloor, 3)
  assert.equal(growth.growthSummary(game.store.state).total, growth.growthSummary(before).total)
  const popup = labelText(game.overlay)
  assert.equal(named(named(game.overlay, '结算物品-stone_low'), '物品数量角标').getComponent(Label).string, '10')
  assert.ok(named(game.overlay, '结算物品-forge_ninglingjing'))
  assert.ok((game.store.state.pills.forge_core_bao || 0) >= (before.pills.forge_core_bao || 0) + 1)
  assert.ok(named(game.overlay, '结算物品-forge_core_bao'))
  assert.ok(popup.includes(`${economy.formatSpiritStones(economy.legacyRewardToStones(killValue + 9))}灵石未入账`))
  assert.ok(popup.includes('首通奖励已包含在收获中'))
  assert.doesNotMatch(popup, /技能点|功法点|悟道点|首通另获/)
  const committed = copy(game.store.state)
  staleRetry()
  assert.equal(game.store.act({ type: 'finishFloor', snapshot }, START).ok, false)
  assert.deepEqual(game.store.state, committed)
  assert.equal(storage.writes.length, writes + 1)
  assert.deepEqual(new campaign.TowerCampaignStore(playtest.towerStorage(storage), START).state, committed)
})

test('host refund preserves the learned evolution and displays the committed rank change', t => {
  const storage = disk()
  seed(storage, { patch: {
    xp: 10920, clearedFloor: 9, tutorialWaves: 3, researchPurchases: 0,
    skills: { sj_yujian: 1, sj_arc: 2, sj_wanjian: 1, sj_line: 5, sj_mark: 1 },
    books: ['sj_line', 'sj_mark', 'evo_tiandi'],
    evolutionRanks: { evo_tiandi: 1 }, evolutions: ['evo_tiandi'],
  } })
  const { game } = launch(t, storage, { assisted: false })
  press(game, '功法')
  press(game, '功法节点-sj_line')
  const preview = labelText(game.menu.root).replace(/\s/g, '')
  assert.ok(!preview.includes('点−退点预览'), 'default skill description contains no refund clutter')
  assert.doesNotMatch(preview, /undefined|NaN|未装备/)

  const before = copy(game.store.state), raw = storage.getItem(campaign.TOWER_CAMPAIGN_KEY), writes = storage.writes.length
  storage.blockedWrites.add(campaign.TOWER_CAMPAIGN_KEY)
  // 85号：这次退点会让剑气共鸣从二重降为一重；第一次点击只要求确认，不写存档。
  press(game, 'decreaseSkill-sj_line')
  assert.deepEqual(game.store.state, before)
  assert.equal(storage.writes.length, writes)
  assert.equal(labelText(named(game.menu.root, '功法修习条件')), '再点退点确认：剑气共鸣降为一重')
  press(game, 'decreaseSkill-sj_line')
  assert.deepEqual(game.store.state, before)
  assert.equal(storage.getItem(campaign.TOWER_CAMPAIGN_KEY), raw)
  assert.equal(storage.writes.length, writes)
  assert.match(labelText(game.menu.root), /保存失败/)
  storage.blockedWrites.clear()
  const staleClick = button(game, 'decreaseSkill-sj_line').events.get(Button.EventType.CLICK)
  press(game, 'decreaseSkill-sj_line')
  assert.equal(game.store.state.skills.sj_arc, 2)
  assert.equal(game.store.state.skills.sj_line, 4)
  assert.equal(game.store.state.evolutionRanks.evo_tiandi, 1)
  assert.equal(game.store.state.skills.sj_mark, 1)
  assert.equal(game.store.state.spiritStones, before.spiritStones)
  assert.deepEqual(game.store.state.books, before.books)
  const feedback = labelText(game.menu.root).replace(/\s/g, '')
  assert.ok(feedback.includes('已保存：返还1点'))
  assert.ok(feedback.includes('剑破虚空5→4级'))
  assert.ok(!feedback.includes('一剑开天1→0级'))
  assert.doesNotMatch(feedback, /undefined|NaN|未装备/)
  const committed = game.store.state
  staleClick()
  assert.strictEqual(game.store.state, committed, 'a callback from the previous tree cannot act again')
  assert.equal(storage.writes.length, writes + 1)
  assert.equal(growth.growthSummary(committed).available, growth.growthSummary(before).available + 1)
  assert.deepEqual(new campaign.TowerCampaignStore(storage, START).state, committed)
})

// Independent UI expectations from the V2.1 nine-stage design. The production
// tables still supply quotes and transactions; no test-only menu is rendered.
const stageRows = [
  ['lianqi-early', '炼气·初期', ['sj_yujian', 'sj_arc']],
  ['lianqi-middle', '炼气·中期', ['vajra', 'magnet', 'sj_wanjian']],
  ['lianqi-peak', '炼气·巅峰', ['sj_heart', 'sj_cross', 'sj_qinglian']],
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
    xp: 10920, clearedFloor: 9, tutorialWaves: 3, researchPurchases: 0,
    skills: { sj_yujian: 1, sj_arc: 2, sj_wanjian: 1, sj_line: 1 }, books: ['sj_line'],
  }
}

for (const scenario of [
  // 85号：7–10级御剑术上限为6级；10级有9点悟道点，留出余点。
  { name: 'realm cap with spare points', id: 'sj_yujian', patch: { xp: 1485, clearedFloor: 9, researchPurchases: 0, skills: { sj_yujian: 6 } }, level: 6, reason: 'realm-locked' },
  { name: 'no points below cap', id: 'sj_yujian', patch: { xp: 45, tutorialWaves: 3,
    skills: { sj_yujian: 1, sj_arc: 1 } }, level: 1, reason: 'insufficient-points' },
  { name: 'stage locked', id: 'vajra', patch: { xp: 45 }, level: 0, reason: 'stage-locked' },
  { name: 'no tutorial gate at the required character level', id: 'sj_wanjian', patch: { xp: 720 }, level: 0, reason: undefined },
  { name: 'evolution requires its parent skill', id: 'evo_wanjian', patch: { xp: 10920, spiritStones: 10000, clearedFloor: 9, tutorialWaves: 3, skills: growth.giftSkills(3) }, level: 0, reason: 'parent-required' },
  { name: 'unlocked first rank', id: 'vajra', patch: { xp: 630 }, level: 0, reason: undefined },
  { name: 'current rank can grow', id: 'sj_yujian', patch: { xp: 630, skills: { sj_yujian: 2 } }, level: 2, reason: undefined },
  { name: 'absolute maximum', id: 'sj_yujian', patch: { xp: 10920, skills: { sj_yujian: 10 } }, level: 10, reason: 'max-level' },
]) {
  test(`skill arrow follows purchase eligibility: ${scenario.name}`, t => {
    const storage = disk(); seed(storage, { patch: scenario.patch })
    const { game } = launch(t, storage)
    const before = copy(game.store.state), raw = storage.getItem(campaign.TOWER_CAMPAIGN_KEY), writes = storage.writes.length
    press(game, '功法')
    press(game, `功法节点-${scenario.id}`)
    const quote = growth.skillRequirement(game.store.state, scenario.id)
    assert.equal(quote.reason, scenario.reason, 'fixture must exercise the intended gate')
    if (scenario.name === 'realm cap with spare points') {
      assert.ok(growth.growthSummary(game.store.state).available > 0)
      assert.equal(growth.rankCap(scenario.id, game.store.state.xp), 6)
      // Rank seven opens at the next realm (Zhuji, level 11).
      assert.equal(growth.skillRequirement({ ...game.store.state, xp: 1800 }, scenario.id).reason, 'realm-locked')
      assert.equal(growth.skillRequirement({ ...game.store.state, xp: 1801 }, scenario.id).ok, true)
    }
    if (scenario.name === 'no points below cap') {
      assert.equal(growth.growthSummary(game.store.state).available, 0)
      assert.equal(growth.rankCap(scenario.id, game.store.state.xp), 3)
      assert.ok(scenario.level < growth.rankCap(scenario.id, game.store.state.xp))
    }
    const icon = named(game.menu.root, `功法图标-${scenario.id}`)
    const badge = named(icon, `功法等级-${scenario.id}`)
    const numeral = descendants(badge).find(node => node.getComponent(Label)).getComponent(Label)
    assert.equal(numeral.string, String(scenario.level))
    assert.equal(numeral.horizontalAlign, Label.HorizontalAlign.CENTER)
    assert.equal(numeral.node.position.x, 0)
    const hints = descendants(icon).filter(node => node.name === `功法可升级-${scenario.id}`)
    assert.equal(hints.length, scenario.reason ? 0 : 1)
    assert.equal(button(game, `learnSkill-${scenario.id}`).getComponent(Button).interactable, !scenario.reason)
    if (hints.length) {
      const hint = hints[0], arrow = hint.getComponent(Graphics)
      assert.ok(arrow, 'upgrade hint is a drawn arrow')
      assert.equal(arrow.fillColor.r, badge.getComponent(Graphics).fillColor.r)
      assert.deepEqual(arrow.upgradeArrowCommands, [
        ['moveTo', 0, 10], ['lineTo', 8, 1], ['lineTo', 3, 3],
        ['lineTo', 2, -10], ['lineTo', -2, -10], ['lineTo', -3, 3],
        ['lineTo', -8, 1], ['close'], ['fill'],
      ], 'the upgrade hint must draw and fill its complete arrow silhouette')
      assert.equal(hint.position.y, badge.position.y, 'arrow shares the rank baseline')
      assert.equal(rectWithin(hint, icon).right, 40, 'arrow sits after the centered level')
      assert.ok(rectWithin(hint, icon).left > rectWithin(badge, icon).right, 'arrow cannot overlap the numeral')
      assert.equal(hint.getComponent(Button), null)
    }
    assert.deepEqual(game.store.state, before)
    assert.equal(storage.getItem(campaign.TOWER_CAMPAIGN_KEY), raw)
    assert.equal(storage.writes.length, writes)
  })
}

test('skill arrow disappears at the realm cap after purchase and returns after refund', t => {
  // 85号：7–10级御剑术上限为6级；10级仍有余点。
  const storage = disk(); seed(storage, { patch: { xp: 1485, skills: { sj_yujian: 5 } } })
  const { game } = launch(t, storage)
  const beforeState = copy(game.store.state), writes = storage.writes.length
  press(game, '功法')
  press(game, '功法节点-sj_yujian')
  assert.ok(named(game.menu.root, '功法可升级-sj_yujian'))
  press(game, 'learnSkill-sj_yujian')
  assert.equal(game.store.state.skills.sj_yujian, 6)
  assert.equal(growth.skillRequirement(game.store.state, 'sj_yujian').reason, 'realm-locked')
  assert.ok(growth.growthSummary(game.store.state).available > 0)
  assert.ok(!descendants(game.menu.root).some(node => node.name === '功法可升级-sj_yujian'))
  assert.equal(labelText(named(game.menu.root, '功法等级-sj_yujian')).trim(), '6')
  press(game, 'decreaseSkill-sj_yujian')
  assert.equal(game.store.state.skills.sj_yujian, 5)
  assert.equal(growth.skillRequirement(game.store.state, 'sj_yujian').ok, true)
  assert.ok(named(game.menu.root, '功法可升级-sj_yujian'))
  assert.equal(labelText(named(game.menu.root, '功法等级-sj_yujian')).trim(), '5')
  assert.deepEqual(game.store.state, beforeState, 'learning then refund restores the permanent state')
  assert.equal(storage.writes.length, writes + 2)
  assert.deepEqual(new campaign.TowerCampaignStore(storage, START).state, beforeState)
})

test('dependency connections remain stable while learning and refund each commit once', t => {
  const storage = disk(); seed(storage, { patch: investedSkillFixture() })
  const { game } = launch(t, storage)
  const beforeState = copy(game.store.state), writes = storage.writes.length
  press(game, '功法')
  const connections = () => copy(named(game.menu.root, '功法前置连线').getComponent(Graphics).segments)
  const before = connections()
  assert.equal(before.length, 0)
  press(game, '功法节点-sj_heart')
  press(game, 'learnSkill-sj_heart')
  assert.equal(game.store.state.skills.sj_heart, 1)
  assert.deepEqual(connections(), before, 'learning does not remove a real dependency edge')
  press(game, 'decreaseSkill-sj_heart')
  assert.equal(game.store.state.skills.sj_heart || 0, 0)
  assert.deepEqual(connections(), before, 'refund does not invent new dependency edges')
  assert.deepEqual(game.store.state, beforeState, 'learning then refund restores the permanent state')
  assert.equal(storage.writes.length, writes + 2)
  assert.deepEqual(new campaign.TowerCampaignStore(storage, START).state, beforeState)
})

function assertFooter(game) {
  const pane = named(game.menu.root, '功法详情固定栏');
  const footer = named(pane, '功法详情底部工具栏');
  assert.strictEqual(footer.parent, pane);
  const bounds = rectWithin(footer, pane);
  const viewport = rectWithin(named(pane, '功法详情独立卷轴'), pane);
  assert.equal(bounds.bottom, -pane.getComponent(UITransform).contentSize.height / 2);
  assert.equal(bounds.top - bounds.bottom, 120);
  assert.ok(viewport.bottom >= bounds.top, 'scroll viewport never covers the toolbar');
  assert.ok(viewport.top <= pane.getComponent(UITransform).contentSize.height / 2 - 98);
  const id = game.menu.detailId;
  const plus = button(game, `learnSkill-${id}`);
  assert.strictEqual(plus.parent, footer);
  assert.deepEqual(plus.getComponent(UITransform).contentSize, { width: 224, height: 64 });
  assert.deepEqual(named(plus, `功法增减底-learnSkill-${id}`).getComponent(UITransform).contentSize,
    { width: 212, height: 48 });
  const rank = game.store.state.skills[id] ?? game.store.state.evolutionRanks[id] ?? 0;
  const skill = [...growth.GROWTH_SKILLS, ...growth.GROWTH_EVOLUTIONS].find(row => row.id === id);
  assert.equal(labelText(plus).trim(), rank >= skill.maxLevel ? '已满级' : rank ? `升至${rank + 1}级 · ${growth.skillRequirement(game.store.state, id).cost}点` : `学习 · ${growth.skillRequirement(game.store.state, id).cost}点`);
  assert.ok(labelText(named(footer, '功法修习条件')).trim(), 'cost or unavailability reason stays visible');
  const rects = { footer: rectWithin(footer, game.menu.root), plus: rectWithin(plus, game.menu.root) };
  if (!game.store.state.activeRun) {
    const minus = button(game, `decreaseSkill-${id}`);
    assert.strictEqual(minus.parent, footer);
    assert.deepEqual(minus.getComponent(UITransform).contentSize, { width: 96, height: 64 });
    assert.deepEqual(named(minus, `功法增减底-decreaseSkill-${id}`).getComponent(UITransform).contentSize,
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
  assert.ok(named(game.menu.root, '功法详情固定栏'))
  assert.equal(descendants(game.menu.root).some(node => /遮罩|全洗退款预览/.test(node.name)), false)
  assertFooter(game);

}

const currentSkillArtIds = [...growth.GROWTH_SKILLS, ...growth.GROWTH_EVOLUTIONS].map(skill => skill.id)

async function completeSkillImages(icons, failedId = null) {
  // Deliver outside the menu's initial call stack. The production loader owns
  // image conversion, cache, cancellation and binding; this is only I/O control.
  await Promise.resolve()
  const expected = currentSkillArtIds.map(id => `tower-skill-icons/${id}`).sort()
  const skillRequests = icons.requests.filter(request => request.path.startsWith('tower-skill-icons/'))
  assert.deepEqual([...new Set(skillRequests.map(request => request.path))].sort(), expected)
  assert.equal(skillRequests.length, expected.length, 'each current skill image loads only once per menu lifetime')
  for (const request of skillRequests.filter(request => !request.settled)) {
    assert.strictEqual(request.Type, ImageAsset, 'load the PNG without requiring a sprite importer subtype')
    icons.complete(request, request.path === `tower-skill-icons/${failedId}` ? new Error('missing skill PNG') : null)
  }
}

function assertSkillImage(game, id, loaded = true) {
  const icon = named(game.menu.root, `功法图标-${id}`)
  const glyph = named(icon, `功法简笔-${id}`)
  const clip = named(icon, `功法素材裁剪-${id}`)
  const artwork = named(clip, `功法素材-${id}`), sprite = artwork.getComponent(Sprite)
  const badge = named(icon, `功法等级-${id}`)
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
  assert.deepEqual(badge.getComponent(UITransform).contentSize, { width: 34, height: 34 })
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
  test(`async skill artwork preserves all current skill click targets, clipping, badges and camp transactions (${frame.width}x${frame.height})`, async t => {
    const storage = disk(); seed(storage, { patch: investedSkillFixture() })
    const { game, icons } = launch(t, storage, { frame })
    press(game, '功法')
    const ids = currentSkillArtIds
    const staleSprites = ids.map(id => assertSkillImage(game, id, false))
    press(game, '功法图标-sj_line')
    const treeY = Math.min(1500, Math.max(0, game.menu.scroll.content.getComponent(UITransform).contentSize.height
      - game.menu.scroll.node.getComponent(UITransform).contentSize.height))
    game.menu.scroll.scrollToOffset(new Vec2(0, treeY), 0)
    game.menu.skillPaneScroll.scrollToOffset(new Vec2(0, Math.min(20, Math.max(0,
      game.menu.skillPaneScroll.content.getComponent(UITransform).contentSize.height
      - game.menu.skillPaneScroll.node.getComponent(UITransform).contentSize.height))), 0)
    const tree = named(game.menu.root, '境界功法树内容')
    const targets = () => descendants(tree).filter(node => node.getComponent(Button))
      .map(node => ({ name: node.name, rect: rectWithin(node, tree) }))
    const hitRects = targets(), state = game.store.state, data = new Map(storage.data), writes = [...storage.writes]
    await completeSkillImages(icons)
    assert.strictEqual(named(game.menu.root, '境界功法树内容'), tree, 'asset completion must not redraw the tree')
    assertSkillPan(game, { x: 0, y: treeY }, 20, 'sj_line')
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
      press(game, `功法图标-${id}`)
      assert.equal(game.menu.detailId, id)
      assert.equal(game.menu.currentPage, 'library')
      assert.ok(named(game.menu.root, '功法详情固定栏'))
      assert.equal(game.overlay, null)
      assertSkillImage(game, id)
    }
    press(game, '功法节点-sj_line')
    game.menu.scroll.scrollToOffset(new Vec2(0, treeY), 0)
    game.menu.skillPaneScroll.scrollToOffset(new Vec2(0, Math.min(20, Math.max(0,
      game.menu.skillPaneScroll.content.getComponent(UITransform).contentSize.height
      - game.menu.skillPaneScroll.node.getComponent(UITransform).contentSize.height))), 0)
    const available = growth.growthSummary(game.store.state).available
    press(game, 'learnSkill-sj_line')
    assert.equal(game.store.state.skills.sj_line, 2)
    assert.deepEqual(new campaign.TowerCampaignStore(storage, START).state, game.store.state,
      'learning is durable before the later refund')
    assert.equal(growth.growthSummary(game.store.state).available, available - 1)
    assertSkillImage(game, 'sj_line')
    assertSkillPan(game, { x: 0, y: treeY }, 20, 'sj_line')
    press(game, 'decreaseSkill-sj_line')
    assert.equal(game.store.state.skills.sj_line, 1)
    assert.equal(growth.growthSummary(game.store.state).available, available)
    assertSkillImage(game, 'sj_line')
    assertSkillPan(game, { x: 0, y: treeY }, game.menu.skillPaneOffset, 'sj_line')
    assert.equal(game.store.state.spiritStones, state.spiritStones)
    assert.deepEqual(game.store.state.books, state.books)
    assert.doesNotMatch(labelText(game.menu.root), /undefined|NaN/)
    assert.deepEqual(game.store.state, state, 'learning then refund restores permanent progress')
    assert.equal(storage.writes.length, writes.length + 2)
    assert.deepEqual(new campaign.TowerCampaignStore(storage, START).state, game.store.state)
    assert.equal(icons.requests.filter(row => row.path.startsWith('tower-skill-icons/')).length, ids.length,
      'selection and transactions reuse the image cache')
  })
}

test('one failed skill image leaves its glyph and camp controls usable alongside loaded artwork', async t => {
  const storage = disk(); seed(storage, { patch: investedSkillFixture() })
  const { game, icons } = launch(t, storage, { frame: { width: 844, height: 390 } })
  press(game, '功法')
  const state = game.store.state, data = new Map(storage.data), writes = [...storage.writes]
  await completeSkillImages(icons, 'sj_line')
  assert.strictEqual(game.store.state, state)
  assert.deepEqual(storage.data, data)
  assert.deepEqual(storage.writes, writes)
  assertSkillImage(game, 'sj_line', false)
  assertSkillImage(game, 'sj_yujian')
  press(game, '功法图标-sj_line')
  assert.equal(game.menu.detailId, 'sj_line')
  press(game, 'learnSkill-sj_line')
  assert.equal(game.store.state.skills.sj_line, 2)
    assert.deepEqual(new campaign.TowerCampaignStore(storage, START).state, game.store.state,
      'learning is durable before the later refund')
  assertSkillImage(game, 'sj_line', false)
  press(game, 'decreaseSkill-sj_line')
  assert.equal(game.store.state.skills.sj_line, 1)
  assertSkillImage(game, 'sj_line', false)
  assertSkillImage(game, 'sj_yujian')
  assert.equal(game.store.state.spiritStones, state.spiritStones)
  assert.deepEqual(game.store.state.books, state.books)
  assert.deepEqual(game.store.state, state, 'learning then refund restores permanent progress')
  assert.equal(storage.writes.length, writes.length + 2)
  assert.deepEqual(new campaign.TowerCampaignStore(storage, START).state, game.store.state)
  assert.equal(icons.requests.filter(row => row.path === 'tower-skill-icons/sj_line').length, 1,
    'redraws do not retry a missing image indefinitely')
})

test('destroying the real host releases loaded icon art and safely ignores pending completions', async t => {
  const storage = disk(); seed(storage)
  const { game, icons } = launch(t, storage, { frame: { width: 844, height: 390 } })
  press(game, '功法')
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
  assert.deepEqual(new campaign.TowerCampaignStore(storage, START).state, game.store.state)
})

const previewSkillIds = stageRows.filter(row => row[2][0].startsWith('future_')).flatMap(row => row[2])
const allDisplayedSkillIds = [...currentSkillArtIds, ...previewSkillIds]
function expandFutureRealms(game) {
  for (const realm of ['元婴', '化神', '炼虚']) press(game, `功法境界展开-${realm}`)
}
function assertNoLayoutWrites(game, storage, before, raw, writes) {
  assert.deepEqual(game.store.state, before)
  assert.equal(storage.getItem(campaign.TOWER_CAMPAIGN_KEY), raw)
  assert.equal(storage.writes.length, writes)
}

for (const frame of [{ width: 1280, height: 720 }, { width: 844, height: 390 }, { width: 1024, height: 600 }]) {
  const size = `${frame.width}x${frame.height}`
  test(`compact skill labels preserve passive tags and available points (${size})`, async t => {
    const storage = disk(); seed(storage, { patch: investedSkillFixture() })
    const { game, icons } = launch(t, storage, { frame })
    const before = copy(game.store.state), raw = storage.getItem(campaign.TOWER_CAMPAIGN_KEY), writes = storage.writes.length
    press(game, '功法'); expandFutureRealms(game); await completeSkillImages(icons)
    const tree = named(game.menu.root, '境界功法树内容')
    const passiveIds = new Set([...growth.GROWTH_SKILLS.filter(s => s.kind === 'passive' && s.id !== 'sj_flight').map(s => s.id),
      'future_yingling', 'future_shenshi', 'future_xubu'])
    for (const id of allDisplayedSkillIds) {
      const icon = named(tree, `功法图标-${id}`), caption = named(tree, `功法节点-${id}`)
      const rect = rectWithin(icon, tree)
      const expectedSize = Math.min(68, named(tree, `功法行-${id}`).getComponent(UITransform).contentSize.width - 8)
      assert.ok(Math.abs(rect.right - rect.left - expectedSize) < 1e-9, id)
      assert.ok(Math.abs(rect.top - rect.bottom - expectedSize) < 1e-9, id)
      assert.deepEqual(icon.getComponent(UITransform).contentSize, { width: 96, height: 96 })
      const text = descendants(caption).find(n => n.getComponent(Label)).getComponent(Label)
      assert.ok(text.fontSize > 0 && text.fontSize <= 16)
      assert.doesNotMatch(text.string, /[（(]被动[)）]|共用/)
      const mastery = descendants(icon).filter(n => n.name === `功法精通-${id}`)
      assert.equal(mastery.length, passiveIds.has(id) ? 1 : 0, id)
      if (mastery.length) {
        const box = rectWithin(mastery[0], icon)
        assert.equal(labelText(mastery[0]).trim(), '心法')
        assert.ok(box.top < 0 && box.bottom >= -48 && box.left >= -48 && box.right <= 48)
        assert.equal(mastery[0].getComponent(Button), null)
        const clip = icon.children.find(n => n.name === `功法素材裁剪-${id}`)
        if (clip) assert.ok(icon.children.indexOf(mastery[0]) > icon.children.indexOf(clip))
        const definition = growth.GROWTH_SKILLS.find(s => s.id === id)
        if (definition) assert.equal(text.string, definition.name)
      }
    }
    const points = named(game.menu.root, '悟道点'), panel = named(game.menu.root, '功法树面板')
    assert.equal(points.getComponent(Label).string, String(growth.growthSummary(before).available))
    assert.equal(points.getComponent(Label).horizontalAlign, Label.HorizontalAlign.CENTER)
    const reset = button(game, '初始化'), title = named(panel, '悟道点标题')
    assert.strictEqual(reset.parent, panel)
    assert.equal(reset.position.y, title.position.y)
    assert.ok(rectWithin(reset, panel).right < rectWithin(title, panel).left)
    assert.strictEqual(points.parent, named(panel, '悟道点数值底'))
    assert.ok(points.parent.getComponent(Graphics))
    assert.equal(rectWithin(points, panel).right, panel.getComponent(UITransform).contentSize.width / 2 - 16)
    assert.equal(tree.getComponent(UITransform).contentSize.width,
      named(game.menu.root, '功法树二维卷轴').getComponent(UITransform).contentSize.width)
    game.menu.scroll.scrollToOffset(new Vec2(20, 250), 0)
    press(game, '功法节点-sj_heart')
    assert.deepEqual(copy(game.menu.scroll.getScrollOffset()), { x: 0, y: 250 })
    assertNoLayoutWrites(game, storage, before, raw, writes)
    press(game, 'learnSkill-sj_heart')
    assert.equal(game.store.state.skills.sj_heart, 1)
    assert.equal(labelText(named(game.menu.root, '功法精通-sj_heart')).trim(), '心法')
    assert.equal(named(game.menu.root, '悟道点').getComponent(Label).string,
      String(growth.growthSummary(game.store.state).available))
    assert.equal(storage.writes.length, writes + 1)
    assert.deepEqual(new campaign.TowerCampaignStore(storage, START).state, game.store.state)
  })

  test(`physical type, flow and level are separate nonoverlapping tags (${size})`, t => {
    const storage = disk(); seed(storage)
    const { game } = launch(t, storage, { frame })
    const before = copy(game.store.state), raw = storage.getItem(campaign.TOWER_CAMPAIGN_KEY), writes = storage.writes.length
    press(game, '功法'); expandFutureRealms(game)
    for (const [id, category, flow] of [
      ['sj_yujian', '物理攻击', '御剑'], ['sj_arc', '物理攻击', '剑气'],
      ['sj_wanjian', '物理＋法术攻击', '剑阵'], ['sj_qinglian', '物理＋法术攻击', '剑阵'], ['sj_gate', '物理＋法术攻击', '通用'],
      ['vajra', '被动功法', '通用'], ['future_yingling', '辅助', '通用'],
    ]) {
      press(game, `功法节点-${id}`)
      const pane = named(game.menu.root, '功法详情固定栏')
      const tags = [0, 1, 2].map(i => named(pane, `功法标签-${id}-${i}`))
      assert.equal(labelText(tags[0]).trim(), category)
      assert.equal(labelText(tags[1]).trim(), flow)
      const definition = growth.GROWTH_SKILLS.find(s => s.id === id)
      assert.equal(labelText(tags[2]).trim(), definition ? `${game.store.state.skills[id] || 0}/${definition.maxLevel}级` : '未开放')
      for (const [index, tag] of tags.entries()) {
        assert.strictEqual(tag.parent, pane)
        assert.ok(tag.getComponent(Graphics))
        assert.equal(tag.getComponent(Button), null)
        const bounds = rectWithin(tag, pane), half = pane.getComponent(UITransform).contentSize.width / 2
        assert.ok(bounds.left >= -half && bounds.right <= half)
        assert.ok(bounds.bottom >= rectWithin(named(pane, '功法详情独立卷轴'), pane).top)
        if (index) {
          assert.equal(tag.position.y, tags[0].position.y)
          assert.ok(rectWithin(tags[index - 1], pane).right < bounds.left)
        }
      }
      assert.doesNotMatch(labelText(pane), /共用/)
    }
    assertNoLayoutWrites(game, storage, before, raw, writes)
  })

  test(`selected evolution shows only its actual parent connection (${size})`, t => {
    const storage = disk(); seed(storage)
    const { game } = launch(t, storage, { frame })
    const before = copy(game.store.state), raw = storage.getItem(campaign.TOWER_CAMPAIGN_KEY), writes = storage.writes.length
    press(game, '功法')
    const strokes = () => named(game.menu.root, '功法前置连线').getComponent(Graphics).segments
    assert.equal(strokes().length, 0)
    for (const evolution of growth.GROWTH_EVOLUTIONS) {
      press(game, `功法节点-${evolution.id}`)
      const tree = named(game.menu.root, '境界功法树内容'), lines = strokes()
      assert.equal(lines.length, 7, 'one five-segment path plus two arrowhead segments')
      const parent = rectWithin(named(tree, `功法行-${evolution.parent}`), tree)
      const child = rectWithin(named(tree, `功法行-${evolution.id}`), tree)
      assert.deepEqual(lines[0].from, { x: (parent.left + parent.right) / 2, y: parent.bottom - 1 })
      assert.deepEqual(lines[4].to, { x: (child.left + child.right) / 2, y: child.top + 1 })
      for (let i = 1; i < 5; i++) assert.deepEqual(lines[i - 1].to, lines[i].from)
    }
    press(game, '功法节点-sj_heart')
    assert.equal(strokes().length, 0, 'unrelated selection removes the relation')
    assertNoLayoutWrites(game, storage, before, raw, writes)
  })

  test(`realm lanes group current skills and toggle future previews (${size})`, t => {
    const storage = disk(); seed(storage)
    const { game } = launch(t, storage, { frame })
    const before = copy(game.store.state), raw = storage.getItem(campaign.TOWER_CAMPAIGN_KEY), writes = storage.writes.length
    press(game, '功法')
    const ids = () => descendants(named(game.menu.root, '境界功法树内容')).filter(n => n.name.startsWith('功法行-')).map(n => n.name.slice('功法行-'.length)).sort()
    assert.deepEqual(ids(), [...currentSkillArtIds].sort())
    for (const realm of ['元婴', '化神', '炼虚']) {
      assert.equal(named(game.menu.root, `功法境界-${realm}`).getComponent(UITransform).contentSize.height, 44)
      assert.ok(hasLabel(named(game.menu.root, `功法境界-${realm}`), '未开放'))
    }
    const revealed = [...currentSkillArtIds]
    for (const realm of ['元婴', '化神', '炼虚']) {
      press(game, `功法境界展开-${realm}`)
      revealed.push(...stageRows.filter(row => row[1].startsWith(realm)).flatMap(row => row[2]))
      assert.deepEqual(ids(), [...revealed].sort(), 'only the selected realm expands')
    }
    assert.deepEqual(ids(), [...allDisplayedSkillIds].sort())
    const tree = named(game.menu.root, '境界功法树内容')
    const stages = [...growth.GROWTH_STAGES.map(s => ({ id: s.id, ids: s.skillIds })),
      ...stageRows.filter(s => s[2][0].startsWith('future_')).map(s => ({ id: s[0], ids: s[2] }))]
    const blocks = ['炼气', '筑基', '金丹', '元婴', '化神', '炼虚'].map(r => named(tree, `功法境界-${r}`))
    for (const [i, block] of blocks.entries()) {
      const box = rectWithin(block, tree)
      assert.equal(box.left, 4)
      assert.equal(box.right, tree.getComponent(UITransform).contentSize.width - 4)
      if (i) assert.ok(rectWithin(blocks[i - 1], tree).bottom > box.top)
    }
    for (const stage of stages) {
      const lane = named(tree, `功法泳道-${stage.id}`), box = rectWithin(lane, tree)
      const grouped = descendants(tree).filter(n => n.name.startsWith('功法行-')).filter(n => {
        const r = rectWithin(n, tree); return r.top <= box.top && r.bottom >= box.bottom
      })
      assert.deepEqual(grouped.map(n => n.name.slice('功法行-'.length)).sort(), [...stage.ids].sort())
      for (const node of grouped) {
        const r = rectWithin(node, tree)
        assert.ok(r.left >= box.left && r.right <= box.right)
        const title = lane.children.find(n => n.getComponent(Label))
        assert.ok(r.top < rectWithin(title, tree).bottom)
      }
    }
    for (const id of previewSkillIds) {
      press(game, `功法节点-${id}`)
      assert.equal(game.menu.detailId, id)
      assert.match(labelText(named(game.menu.root, '功法详情固定栏')), /未开放|后续境界开放/)
      assert.ok(!descendants(game.menu.root).some(n => n.name === `learnSkill-${id}`))
    }
    expandFutureRealms(game)
    assert.deepEqual(ids(), [...currentSkillArtIds].sort())
    assertNoLayoutWrites(game, storage, before, raw, writes)
  })

  test(`phase layout keeps nonoverlapping targets and a fixed detail footer (${size})`, t => {
    const storage = disk(); seed(storage, { patch: investedSkillFixture() })
    const { game } = launch(t, storage, { frame })
    const before = copy(game.store.state), raw = storage.getItem(campaign.TOWER_CAMPAIGN_KEY), writes = storage.writes.length
    press(game, '功法'); expandFutureRealms(game)
    const tree = named(game.menu.root, '境界功法树内容')
    const allTargets = descendants(tree).filter(n => n.getComponent(Button))
    const targets = allTargets.filter(n => /^(功法图标-|功法节点-)/.test(n.name))
    assert.equal(targets.length, allDisplayedSkillIds.length * 2)
    assert.equal(allTargets.length, targets.length + 3, 'only the three preview toggles add tree click targets')
    for (const id of allDisplayedSkillIds) {
      const row = named(tree, `功法行-${id}`)
      assert.deepEqual(row.children.map(n => n.name), [`功法图标容器-${id}`, `功法节点-${id}`])
      const icon = rectWithin(named(row, `功法图标-${id}`), row), caption = rectWithin(named(row, `功法节点-${id}`), row), half = row.getComponent(UITransform).contentSize.height / 2
      assert.ok(icon.top <= half && caption.bottom >= -half)
    }
    for (const [i, a] of allTargets.entries()) for (const b of allTargets.slice(i + 1)) {
      const ar = rectWithin(a, tree), br = rectWithin(b, tree)
      assert.ok(ar.right <= br.left || br.right <= ar.left || ar.top <= br.bottom || br.top <= ar.bottom,
        `overlapping touch rectangles: ${a.name} / ${b.name}`)
    }
    const fixed = assertFooter(game)
    for (const id of currentSkillArtIds) {
      press(game, `功法节点-${id}`)
      assert.deepEqual(assertFooter(game), fixed)
      game.menu.skillPaneScroll.scrollToOffset(new Vec2(0, 500), 0)
      assert.deepEqual(assertFooter(game), fixed)
    }
    assertNoLayoutWrites(game, storage, before, raw, writes)
  })
}

for (const frame of [{ width: 1280, height: 720 }, { width: 844, height: 390 }, { width: 1024, height: 600 }]) {
  test(`nine-stage UI plus/minus retain selection and vertical scroll in the viewport-wide tree (${frame.width}x${frame.height})`, t => {
    const storage = disk(); seed(storage, { patch: investedSkillFixture() })
    const { game } = launch(t, storage, { frame })
    press(game, '功法')
    press(game, '功法节点-sj_line')
    const treeY = Math.min(1500, game.menu.scroll.content.getComponent(UITransform).contentSize.height
      - game.menu.scroll.node.getComponent(UITransform).contentSize.height)
    game.menu.scroll.scrollToOffset(new Vec2(0, treeY), 0)
    game.menu.skillPaneScroll.scrollToOffset(new Vec2(0, Math.min(20, Math.max(0,
      game.menu.skillPaneScroll.content.getComponent(UITransform).contentSize.height
      - game.menu.skillPaneScroll.node.getComponent(UITransform).contentSize.height))), 0)
    const offset = { x: 0, y: treeY }, before = copy(game.store.state), writes = storage.writes.length
    const available = growth.growthSummary(before).available
    const stalePlus = button(game, 'learnSkill-sj_line').events.get(Button.EventType.CLICK)
    press(game, 'learnSkill-sj_line')
    assert.equal(game.store.state.skills.sj_line, 2)
    assert.equal(growth.growthSummary(game.store.state).available, available - 1)
    assertSkillPan(game, offset, 20, 'sj_line')
    assert.ok(hasLabel(named(game.menu.root, '功法树面板'), String(available - 1)))
    assert.equal(labelText(named(game.menu.root, '功法等级-sj_line')).trim(), '2')
    const learned = game.store.state
    stalePlus()
    assert.strictEqual(game.store.state, learned, 'retired tree callbacks cannot spend twice')
    const detailBeforeRefund = game.menu.skillPaneScroll.getScrollOffset().y
    press(game, 'decreaseSkill-sj_line')
    assert.equal(game.store.state.skills.sj_line, 1)
    assert.equal(growth.growthSummary(game.store.state).available, available)
    assertSkillPan(game, offset, detailBeforeRefund, 'sj_line')
    assert.equal(labelText(named(game.menu.root, '功法等级-sj_line')).trim(), '1')
    assert.ok(hasLabel(named(game.menu.root, '功法树面板'), String(available)))
    assert.equal(game.store.state.spiritStones, before.spiritStones)
    assert.deepEqual(game.store.state.books, before.books, 'the permanent book is neither charged nor lost')
    assert.doesNotMatch(labelText(game.menu.root), /undefined|NaN/)
    const reloaded = new campaign.TowerCampaignStore({
      getItem: () => storage.getItem(campaign.TOWER_CAMPAIGN_KEY), setItem() { assert.fail('read-only reload') },
    }, START)
    assert.equal(reloaded.readOnly, false)
    assert.deepEqual(reloaded.state, game.store.state)
    assert.equal(storage.writes.length, writes + 2)
    assert.deepEqual(game.store.state, before)
  })
}

for (const frame of [{ width: 844, height: 390 }, { width: 1024, height: 600 }]) {
  test(`skill footer is stationary through commits, failures, read-only and selection (${frame.width}x${frame.height})`, t => {
    const storage = disk(); seed(storage, { patch: investedSkillFixture() })
    const { game, tick } = launch(t, storage, { frame })
    press(game, '功法')
    press(game, '功法节点-sj_line')
    const fixed = assertFooter(game)
    const stable = () => assert.deepEqual(assertFooter(game), fixed)
    game.menu.skillPaneScroll.scrollToOffset(new Vec2(0, 350), 0)
    stable()
    for (const action of ['learnSkill', 'decreaseSkill']) {
      const before = copy(game.store.state), raw = storage.getItem(campaign.TOWER_CAMPAIGN_KEY), writes = storage.writes.length
      storage.blockedWrites.add(campaign.TOWER_CAMPAIGN_KEY)
      press(game, `${action}-sj_line`)
      assert.deepEqual(game.store.state, before)
      assert.equal(storage.getItem(campaign.TOWER_CAMPAIGN_KEY), raw)
      assert.equal(storage.writes.length, writes)
      assert.ok(hasLabel(named(game.menu.root, '功法操作错误'), '保存失败'))
      stable()
      storage.blockedWrites.clear()
      press(game, `${action}-sj_line`)
      assert.equal(game.store.state.skills.sj_line, action === 'learnSkill' ? 2 : 1)
      assert.equal(storage.writes.length, writes + 1)
      assert.deepEqual(new campaign.TowerCampaignStore(storage, START).state, game.store.state)
      stable()
    }
    const retired = button(game, 'learnSkill-sj_line').events.get(Button.EventType.CLICK)
    press(game, '功法节点-evo_tiandi')
    stable()
    const before = game.store.state
    retired()
    assert.strictEqual(game.store.state, before, 'selection retires previous skill callbacks')
    assert.equal(descendants(game.menu.root).some(node => node.name === '点−退点预览'), false)
    press(game, '功法节点-sj_line')
    press(game, 'decreaseSkill-sj_line')
    assert.equal(game.store.state.skills.sj_line, undefined)
    stable()
    assert.equal(descendants(game.menu.root).some(node => node.name === '点−退点预览'), false,
      'last refund leaves only its receipt, not an empty refund preview')
    assert.ok(hasLabel(game.menu.root, '已保存：返还1点'))
    press(game, '功法节点-sj_arc')
    const beforeSync = copy(game.store.state), rawBeforeSync = storage.getItem(campaign.TOWER_CAMPAIGN_KEY), writesBeforeSync = storage.writes.length
    storage.blockedWrites.add(campaign.TOWER_CAMPAIGN_KEY)
    tick(6)
    assert.equal(game.menu.state.readOnly, true)
    assert.deepEqual(game.store.state, beforeSync)
    assert.equal(storage.getItem(campaign.TOWER_CAMPAIGN_KEY), rawBeforeSync)
    assert.equal(storage.writes.length, writesBeforeSync)
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
    for (const action of ['learnSkill', 'decreaseSkill']) {
      assert.equal(button(game, `${action}-sj_arc`).getComponent(Button).interactable, true)
    }
    const recoveredWrites = storage.writes.length, arcRank = game.store.state.skills.sj_arc
    press(game, 'learnSkill-sj_arc')
    assert.equal(game.store.state.skills.sj_arc, arcRank + 1)
    assert.equal(storage.writes.length, recoveredWrites + 1)
    stable()
    assert.deepEqual(new campaign.TowerCampaignStore(storage, START).state, game.store.state)
  })

  test(`skill footer displays actual unlearned and maximum ranks (${frame.width}x${frame.height})`, t => {
    const storage = disk(); seed(storage, { patch: {
      ...investedSkillFixture(), skills: { ...growth.giftSkills(3), sj_yujian: 9 },
    } })
    const { game } = launch(t, storage, { frame })
    press(game, '功法')
    press(game, '功法节点-sj_yujian')
    const fixed = assertFooter(game), writes = storage.writes.length
    press(game, 'learnSkill-sj_yujian')
    assert.equal(game.store.state.skills.sj_yujian, 10)
    assert.deepEqual(assertFooter(game), fixed)
    const maxedButton = button(game, 'learnSkill-sj_yujian')
    assert.equal(maxedButton.getComponent(Button).interactable, false)
    const maxedState = copy(game.store.state), maxedRaw = storage.getItem(campaign.TOWER_CAMPAIGN_KEY), maxedWrites = storage.writes.length
    maxedButton.events.get(Button.EventType.CLICK)()
    assert.deepEqual(game.store.state, maxedState)
    assert.equal(storage.getItem(campaign.TOWER_CAMPAIGN_KEY), maxedRaw)
    assert.equal(storage.writes.length, maxedWrites)
    press(game, '功法节点-vajra')
    assert.deepEqual(assertFooter(game), fixed)
    assert.equal(labelText(button(game, 'learnSkill-vajra')).trim(), '学习 · 1点')
    assert.ok(hasLabel(game.menu.root, '被动'))
    assert.doesNotMatch(labelText(named(game.menu.root, '功法详情固定栏')), /常驻/)
    assert.equal(descendants(game.menu.root).some(node => node.name === '点−退点预览'), false)
    press(game, '功法节点-sj_arc')
    assert.equal(descendants(game.menu.root).some(node => node.name === '点−退点预览'), false,
      'a teaching gift alone is not an investment')
    assert.equal(storage.writes.length, writes + 1)
    assert.deepEqual(new campaign.TowerCampaignStore(storage, START).state, game.store.state)
  })
}

for (const frame of [{ width: 1280, height: 720 }, { width: 844, height: 390 }]) {
 test(`skill form, next-rank and future motion details fit the independent scroll (${frame.width}x${frame.height})`, t => {
  const storage=disk(); seed(storage,{patch:{...investedSkillFixture(),books:['sj_formation'],
   skills:{...growth.giftSkills(3),sj_arc:2,sj_formation:9}}})
  const {game}=launch(t,storage,{frame})
  press(game,'功法');press(game,'功法节点-sj_arc')
  const saved=JSON.stringify(game.store.state),writes=[...storage.writes],footer=assertFooter(game)
  const details=()=>labelText(named(game.menu.root,'功法详情栏内容')).replace(/\s/g,'')
  assert.match(details(),/形态：近身三斩，3道月牙/)
  assert.match(details(),/本级形态不变/)
  assert.match(details(),/下一级（3级）/)
  assert.match(details(),/方向固定/)
  press(game,'功法节点-sj_formation')
  assert.match(details(),/范围：落点半径180的圆形区域/)
  assert.match(details(),/范围半径：180→192/)
  const viewport=named(game.menu.root,'功法详情独立卷轴'),content=named(game.menu.root,'功法详情栏内容')
  const contentSize=content.getComponent(UITransform).contentSize
  assert.ok(contentSize.height>viewport.getComponent(UITransform).contentSize.height)
  for(const node of descendants(content).filter(n=>n.getComponent(Label))){
   const label=node.getComponent(Label),size=node.getComponent(UITransform).contentSize
   assert.ok(size.width<=contentSize.width-40)
   assert.ok(size.height>=label.string.split('\n').length*label.lineHeight)
   const bounds=rectWithin(node,content)
   assert.ok(bounds.left>=-contentSize.width/2&&bounds.right<=contentSize.width/2)
   assert.ok(bounds.top<=0&&bounds.bottom>=-contentSize.height,'nested text stays inside the scroll content')
  }
  game.menu.skillPaneScroll.scrollToOffset(new Vec2(0,contentSize.height),0)
  assert.deepEqual(assertFooter(game),footer)
  expandFutureRealms(game)
  for(const id of previewSkillIds){
   press(game,`功法节点-${id}`)
   assert.match(details(),/范围：/)
   assert.match(details(),/初成至大成：/)
   assert.match(details(),/当前版本未开放/)
   assert.doesNotMatch(details(),/预算|账本|递归|灵石|冷却时间/)
   assert.equal(descendants(game.menu.root).some(n=>n.name===`learnSkill-${id}`),false)
  }
  assert.equal(JSON.stringify(game.store.state),saved)
  assert.deepEqual(storage.writes,writes)
  assert.deepEqual(new campaign.TowerCampaignStore(storage, START).state, game.store.state)
 })
}

test('nine-stage UI shows locked learning without writes below the starting phase', t => {
  const storage = disk(); seed(storage, {
    patch: { xp: 75, tutorialWaves: 3, skills: { ...growth.giftSkills(3) } },
  })
  const { game } = launch(t, storage, { frame: { width: 844, height: 390 } })
  press(game, '功法')
  press(game, '功法节点-vajra')
  assert.equal(game.store.state.skills.vajra, undefined)
  assert.equal(labelText(named(game.menu.root, '功法等级-vajra')).trim(), '0')
  const details = labelText(named(game.menu.root, '功法详情固定栏')).replace(/\s/g, '')
  assert.ok(details.includes('角色4级'), details)
  const plus = button(game, 'learnSkill-vajra'), before = game.store.state
  const raw = storage.getItem(campaign.TOWER_CAMPAIGN_KEY), writes = storage.writes.length
  assert.equal(plus.getComponent(Button).interactable, false)
  plus.events.get(Button.EventType.CLICK)()
  assert.strictEqual(game.store.state, before)
  assert.equal(storage.getItem(campaign.TOWER_CAMPAIGN_KEY), raw)
  assert.equal(storage.writes.length, writes)
  assert.equal(button(game, 'decreaseSkill-vajra').getComponent(Button).interactable, false)
  press(game, '功法节点-sj_yujian')
  assert.equal(button(game, 'decreaseSkill-sj_yujian').getComponent(Button).interactable, false)
  assert.equal(storage.getItem(campaign.TOWER_CAMPAIGN_KEY), raw)
  assert.equal(storage.writes.length, writes)
})

test('failed learning keeps scroll and loaded assets, shows a fixed error, and retries once', async t => {
  const storage = disk(); seed(storage, { patch: investedSkillFixture() })
  const { game, icons } = launch(t, storage, { frame: { width: 844, height: 390 } })
  press(game, '功法')
  press(game, '功法节点-sj_line')
  await completeSkillImages(icons)
  const imageFrame = assertSkillImage(game, 'sj_line').spriteFrame, requestCount = icons.requests.length
  // 85号：分光连斩移入御剑栏后功法树变矮，滚动目标仍取靠近底部的位置。
  game.menu.scroll.scrollToOffset(new Vec2(0, 1400), 0)
  game.menu.skillPaneScroll.scrollToOffset(new Vec2(0, Math.min(20, Math.max(0,
      game.menu.skillPaneScroll.content.getComponent(UITransform).contentSize.height
      - game.menu.skillPaneScroll.node.getComponent(UITransform).contentSize.height))), 0)
  const before = copy(game.store.state), raw = storage.getItem(campaign.TOWER_CAMPAIGN_KEY), writes = storage.writes.length
  storage.blockedWrites.add(campaign.TOWER_CAMPAIGN_KEY)
  press(game, 'learnSkill-sj_line')
  assert.deepEqual(game.store.state, before)
  assert.equal(storage.getItem(campaign.TOWER_CAMPAIGN_KEY), raw)
  assert.equal(storage.writes.length, writes)
  assert.strictEqual(assertSkillImage(game, 'sj_line').spriteFrame, imageFrame)
  assertSkillPan(game, { x: 0, y: 1400 }, 20, 'sj_line')
  const error = named(game.menu.root, '功法操作错误')
  assert.strictEqual(error.parent, named(game.menu.root, '功法详情固定栏'), 'error does not scroll away with effects')
  assert.ok(hasLabel(error, '保存失败'))
  storage.blockedWrites.clear()
  const staleRetry = button(game, 'learnSkill-sj_line').events.get(Button.EventType.CLICK)
  press(game, 'learnSkill-sj_line')
  assert.equal(game.store.state.skills.sj_line, 2)
  assert.equal(growth.growthSummary(game.store.state).spent, growth.growthSummary(before).spent + 1)
  assertSkillPan(game, { x: 0, y: 1400 }, 20, 'sj_line')
  assert.equal(descendants(game.menu.root).some(node => node.name === '功法操作错误'), false)
  const committed = copy(game.store.state)
  staleRetry()
  assert.deepEqual(game.store.state, committed)
  assert.equal(storage.writes.length, writes + 1)
  assert.strictEqual(assertSkillImage(game, 'sj_line').spriteFrame, imageFrame)
  assert.equal(icons.requests.length, requestCount)
  assert.deepEqual(new campaign.TowerCampaignStore(storage, START).state, committed)
})

for (const [id, stage, level, higherLevel] of [
  ['evo_wanjian', '金丹一层*初期', 21, 27], ['evo_tiandi', '金丹二层*初期', 22, 27],
  ['evo_wuwo', '金丹四层*中期', 24, 27], ['evo_sixiang', '金丹七层*巅峰', 27, 30],
]) {
  test(`nine-stage UI ${id} first-rank condition matches its stage without changing higher-rank gates`, t => {
    const storage = disk(); seed(storage)
    const { game } = launch(t, storage, { frame: { width: 844, height: 390 } })
    const state = copy(game.store.state), raw = storage.getItem(campaign.TOWER_CAMPAIGN_KEY), writes = storage.writes.length
    press(game, '功法')
    press(game, `功法节点-${id}`)
    const pane = named(game.menu.root, '功法详情固定栏')
    const conditions = labelText(pane).replace(/\s/g, '')
    assert.ok(conditions.includes(`学习条件境界:${stage}`), conditions)
    assert.equal(skillPresentation(game.store.state, id).nextRequirement.characterLevel, level)
    const learned = copy(game.store.state)
    learned.evolutionRanks[id] = 1
    assert.equal(skillPresentation(learned, id).nextRequirement.characterLevel, higherLevel)
    assert.ok(!conditions.includes('通关第6层'))
    assert.ok(!conditions.includes('门槛与成本'))
    assert.doesNotMatch(labelText(pane), /undefined|NaN/)
    assertNoLayoutWrites(game, storage, state, raw, writes)
  })
}

function assertTowerLearningOnly(game) {
  assert.equal(game.screen, 'skills')
  assert.equal(game.page, 'library')
  assert.equal(game.run.state.phase, 'paused')
  const tree = named(game.menu.root, '境界功法树内容')
  assert.equal(descendants(tree).filter(node => node.name.startsWith('learnSkill-')).length, 0)
  assert.equal(descendants(tree).filter(node => node.getComponent(Button)).length, currentSkillArtIds.length*2 + 3)
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
    const storage = disk(); seed(storage, { hp: 37.5, patch: investedSkillFixture() })
    const { game, tick, icons } = launch(t, storage, { frame })
    game.enterFloor(1)
    game.update(0)
    game.update(1 / 30)
    assert.ok(game.run.state.time > 0, 'the fixture really entered and advanced a Campaign attempt')
    press(game, '功法')
    await completeSkillImages(icons)
    assertTowerLearningOnly(game)
    for (const id of currentSkillArtIds) {
      assertSkillImage(game, id)
      press(game, `功法节点-${id}`)
      assertTowerLearningOnly(game)
    }
    press(game, '功法节点-sj_line')
    assert.equal(button(game, 'learnSkill-sj_line').getComponent(Button).interactable, true,
      'special skills can be learned while paused')
    press(game, '功法节点-sj_arc')
    const before = game.run.snapshot(), state = game.store.state, writeCount = storage.writes.length
    assert.equal(validateTowerSnapshot(before), true)
    assert.equal(state.activeRun.snapshot.phase, 'paused')
    const available = growth.growthSummary(state).available
    const beforeRaw = storage.getItem(campaign.TOWER_CAMPAIGN_KEY), permanentBefore = copy(state)
    storage.blockedWrites.add(campaign.TOWER_CAMPAIGN_KEY)
    press(game, 'learnSkill-sj_arc')
    assert.deepEqual(game.store.state, permanentBefore, 'failed tower learning cannot spend permanent points')
    assert.deepEqual(game.run.snapshot(), before, 'failed tower learning cannot change the live combat snapshot')
    assert.equal(storage.getItem(campaign.TOWER_CAMPAIGN_KEY), beforeRaw)
    assert.equal(storage.writes.length, writeCount)
    assert.ok(hasLabel(named(game.menu.root, '功法操作错误'), '保存失败'))
    assertTowerLearningOnly(game)
    storage.blockedWrites.clear()
    const stalePlus = button(game, 'learnSkill-sj_arc').events.get(Button.EventType.CLICK)
    press(game, 'learnSkill-sj_arc')
    assertTowerLearningOnly(game)
    assert.equal(game.menu.detailId, 'sj_arc')
    assert.equal(game.store.state.skills.sj_arc, 3)
    assertSkillImage(game, 'sj_arc')
    assert.equal(labelText(named(game.menu.root, '功法等级-sj_arc')).trim(), '3')
    assert.equal(growth.growthSummary(game.store.state).available, available - 1)
    assert.ok(hasLabel(named(game.menu.root, '功法树面板'), String(available - 1)))
    assert.equal(button(game, 'learnSkill-sj_arc').getComponent(Button).interactable, true,
      'paused upgrades use the same realm cap as camp')
    const after = game.run.snapshot()
    assert.equal(after.loadout.active.sj_arc, 3)
    assert.deepEqual(after, { ...before, loadout: {
      ...before.loadout, active: { ...before.loadout.active, sj_arc: 3 },
    } }, 'only the learned rank changes; other skills, gear, HP, RNG, time and pending actions remain intact')
    assert.deepEqual(game.store.state.activeRun.snapshot, after)
    assert.equal(validateTowerSnapshot(after), true)
    assert.equal(game.store.state.spiritStones, state.spiritStones)
    assert.deepEqual(game.store.state.books, state.books)
    assert.equal(storage.writes.length, writeCount + 1)
    assert.deepEqual(new campaign.TowerCampaignStore(playtest.towerStorage(storage), START).state, game.store.state)
    const committed = game.store.state, raw = storage.getItem(campaign.TOWER_CAMPAIGN_KEY)
    storage.writes.length = 0
    stalePlus()
    tick(3)
    assert.strictEqual(game.store.state, committed)
    assert.deepEqual(game.run.snapshot(), after, 'time remains frozen on the paused skills page')
    assert.equal(storage.getItem(campaign.TOWER_CAMPAIGN_KEY), raw)
    assert.deepEqual(storage.writes, [])
    assert.deepEqual(new campaign.TowerCampaignStore(playtest.towerStorage(storage), START).state, game.store.state)
  })
}

for (const action of [{ type: 'decreaseSkill', id: 'sj_line' }, { type: 'respecSkills' }]) {
  for (const destination of ['hall', 'tower', 'battle', 'skills']) {
    test(`host ${action.type} is rejected outside the camp library (${destination})`, t => {
      const storage = disk(); seed(storage, { patch: investedSkillFixture() })
      const { game } = launch(t, storage, { frame: { width: 844, height: 390 } })
      if (destination === 'tower') game.goto('tower')
      if (destination === 'battle' || destination === 'skills') {
        game.enterFloor(1)
        if (destination === 'skills') press(game, '功法')
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
      assert.deepEqual(new campaign.TowerCampaignStore(playtest.towerStorage(storage), START).state, game.store.state)
    })
  }

  test(`host ${action.type} remains allowed in the camp library and preserves books`, t => {
    const storage = disk(); seed(storage, { patch: investedSkillFixture() })
    const { game } = launch(t, storage, { frame: { width: 844, height: 390 } })
    press(game, '功法')
    assert.equal(game.screen, 'camp')
    assert.equal(game.page, 'library')
    press(game, '功法节点-sj_line')
    assert.ok(button(game, 'decreaseSkill-sj_line').getComponent(Button).interactable)
    assert.ok(button(game, '初始化').getComponent(Button).interactable)
    const before = game.store.state, spent = growth.growthSummary(before).spent, writes = storage.writes.length
    const result = game.action(action)
    assert.equal(result.ok, true)
    assert.equal(storage.writes.length, writes + 1)
    assert.equal(result.returned, action.type === 'decreaseSkill' ? 1 : spent + 1)
    assert.equal(growth.growthSummary(game.store.state).spent, action.type === 'decreaseSkill' ? spent - result.returned : 0)
    assert.equal(game.store.state.skills.sj_line, undefined)
    assert.equal(game.store.state.skills.sj_arc, action.type === 'decreaseSkill' ? 2 : undefined)
    for (const [id, rank] of Object.entries(growth.giftSkills(3, action.type === 'respecSkills'))) {
      assert.ok(game.store.state.skills[id] >= rank, `teaching gift ${id} is retained`)
    }
    assert.equal(game.store.state.spiritStones, before.spiritStones)
    assert.deepEqual(game.store.state.books, before.books)
    const reloaded = new campaign.TowerCampaignStore({
      getItem: () => storage.getItem(campaign.TOWER_CAMPAIGN_KEY), setItem() { assert.fail('read-only reload') },
    }, START)
    assert.equal(reloaded.readOnly, false)
    assert.deepEqual(reloaded.state, game.store.state)
    assert.deepEqual(new campaign.TowerCampaignStore(playtest.towerStorage(storage), START).state, game.store.state)
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
  button(game, '功法')
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

function assertDirectToolTargets(game) {
  const targets = descendants(game.overlay).filter(node => node.getComponent(Button))
  assert.deepEqual(targets.map(node => node.name), [
    '返回设置', '关闭开发者工具', '游戏速度 ×1', '无敌：关闭',
    '+999灵石、点眷', '+999悟道点', '提升一小境界', '重置游戏进度',
  ])
  assertTargetsInFrame(game, targets)
  const actions = targets.slice(2)
  assert.equal(new Set(actions.map(node => node.position.x)).size, 1)
  assert.equal(new Set(actions.map(node => node.position.y)).size, 6)
  const panel = named(game.overlay, '开发者工具面板')
  assert.ok(hasLabel(panel, '开发者工具'))
}

for (const frame of [{ width: 1280, height: 720 }, { width: 844, height: 390 }]) {
  test(`landscape ${frame.width}×${frame.height} pause and direct tool targets fit and preserve the paused campaign`, t => {
    const storage = disk(); seed(storage, { hp: 17.5, paused: true })
    const { game } = launch(t, storage, { frame })
    const before = game.run.snapshot()
    let targets = descendants(game.overlay).filter(node => node.getComponent(Button))
    assert.deepEqual(targets.map(node => node.name), ['关闭暂停菜单', '继续挑战', '离开战斗', '开发者工具'])
    assertTargetsInFrame(game, targets)
    press(game, '开发者工具')
    assertDirectToolTargets(game)
    const saved = storage.getItem(campaign.TOWER_CAMPAIGN_KEY)
    const state = copy(game.store.state)
    storage.writes.length = 0
    press(game, '游戏速度 ×1')
    press(game, '游戏速度 ×2')
    press(game, '无敌：关闭')
    assert.deepEqual(copy(game.tools), { speed: 3, invincible: true })
    assert.deepEqual(playtest.readPlaytestTools(storage), { speed: 3, invincible: true })
    assert.deepEqual(game.run.snapshot(), before)
    assert.deepEqual(game.store.state, state)
    assert.equal(storage.getItem(campaign.TOWER_CAMPAIGN_KEY), saved)
    assert.equal(storage.writes.length, 3)
    assert.ok(storage.writes.every(key => key === playtest.TOWER_PLAYTEST_TOOLS_KEY))
    press(game, '关闭开发者工具')
    assert.equal(game.run.state.phase, 'paused')
    assertStopped(game)
    press(game, '继续挑战')
    assert.equal(game.run.state.phase, 'playing')
    assert.equal(game.run.state.player.hp, 17.5)
    assertTargetsInFrame(game, [joystick(game), button(game, '暂停'), button(game, '技能')])
  })
}

for (const frame of [{ width: 1920, height: 280 }, { width: 3840, height: 1080 }]) {
  test(`extreme ${frame.width}×${frame.height} letterboxes combat and tools, then restores fixed-width without losing state`, t => {
    const storage = disk(); seed(storage)
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
    assertDirectToolTargets(game)
    assert.deepEqual(TowerRun.restore(game.run.snapshot()).snapshot(), game.run.snapshot())

    const before = game.run.snapshot(), state = copy(game.store.state)
    const saved = storage.getItem(campaign.TOWER_CAMPAIGN_KEY)
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
      assert.deepEqual(game.store.state, state)
      assert.equal(storage.getItem(campaign.TOWER_CAMPAIGN_KEY), saved)
      assert.deepEqual(storage.writes, [])
    }
  })
}

function tigerSectorSnapshot(loadout, faceX, faceY) {
  const run = new TowerRun({ attemptId: 1, floor: 7, seed: 123, hp: 100, xp: 0, loadout, arenaVersion: 1 })
  // Real authored enemy membership and attack data. Only isolate the target
  // and position it relative to the player; do not fabricate a warning zone.
  run.state.cooldowns.sj_yujian = 99999
  run.advance(2)
  const tiger = run.state.enemies.find(enemy => enemy.family === 'tiger' && enemy.role === 'normal')
  assert.ok(tiger, 'floor seven actually spawns a normal tiger')
  for (const enemy of run.state.enemies) {
    Object.assign(enemy, { x: -500, y: -400 })
    Object.assign(enemy.ai, { entryUntil: 99999, graceUntil: 99999 })
  }
  tiger.x = run.state.player.x - faceX * 100
  tiger.y = run.state.player.y - faceY * 100
  Object.assign(tiger.ai, { entryUntil: 0, graceUntil: 0, readyAt: 0, cooldowns: {} })
  run.state.nextWindupAt = 0
  for (let i = 0; i < 120 && !tiger.ai.attack?.locked; i++) run.advance(1 / 60)
  assert.equal(tiger.ai.mode, 'windup')
  assert.equal(tiger.ai.attack.locked, true)
  assert.equal(tiger.ai.attack.hit, false)
  assert.equal(tiger.ai.attack.shape, 'sector')
  assert.equal(tiger.ai.attack.angle, 130) // 83号：普通怪技能扇形上限130°
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
  test(`real host ${direction} sector path matches the locked 130-degree Run warning and actual hit direction`, t => {
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
    // The host now draws a full faint footprint plus a growing, borderless fill.
    const paths = []; let path = null, strokes = 0, fills = 0
    game.warnings.moveTo = (x, y) => { path = [[x, y]] }
    game.warnings.lineTo = (x, y) => { if (path) path.push([x, y]) }
    game.warnings.close = () => { if (path) paths.push({points:path,alpha:game.warnings.fillColor.a}); path = null }
    game.warnings.stroke = () => { strokes++ }
    game.warnings.fill = () => { fills++ }
    const state = copy(game.store.state), writes = storage.writes.length
    game.draw()
    const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`)
    const x = warning.x - game.camera.x, y = warning.y - game.camera.y
    const progress=(snapshot.time-attack.startedAt)/attack.windup
    assert.ok(progress>0&&progress<1,'locked attack is still winding up')
    assert.equal(paths.length,2,'one full footprint and one growing fill, without duplicate warnings')
    assert.equal(strokes,0,'ground warnings have no outline')
    assert.equal(fills,2,'only the footprint and progress layers are filled')
    const heading = Math.atan2(faceY, faceX), half = 65 * Math.PI / 180
    for(const [index,radius] of [attack.range,attack.range*progress].entries()){
      const {points,alpha}=paths[index]
      near(points[0][0],x);near(points[0][1],y)
      near(points.at(-1)[0],x);near(points.at(-1)[1],y)
      const vertices=points.filter(([px,py])=>Math.hypot(px-x,py-y)>1e-8)
      assert.ok(vertices.length>=13,'sector has a continuous curved edge')
      vertices.forEach(([px,py])=>near(Math.hypot(px-x,py-y),radius))
      const offsets = vertices.map(([px, py]) => {
        const angle = Math.atan2(py - y, px - x) - heading
        return Math.atan2(Math.sin(angle), Math.cos(angle))
      })
      near(offsets[0], -half); near(offsets.at(-1), half)
      for (let i = 1; i < offsets.length; i++) {
        assert.ok(offsets[i] > offsets[i - 1], 'vertices sweep continuously across the forward sector')
        assert.ok(offsets[i] - offsets[i - 1] <= .09, 'no coarse gaps in the warning edge')
      }
      assert.equal(alpha,index===0?16:Math.round(30+12*progress))
    }
    const firstPaint=copy(paths);paths.length=0;game.draw()
    assert.deepEqual(paths,firstPaint,'redraw without simulation time does not advance the fill')
    assert.equal(fills,4,'redraw adds exactly two fills')
    assert.equal(strokes,0)
    assert.deepEqual(game.store.state, state)
    assert.equal(storage.writes.length, writes)
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
      // Incoming hits apply the global 2x enemy multiplier, then character mitigation.
      const attributes = characterCombatAttributes(snapshot.loadout, snapshot.player.xp)
      const expectedDamage = attack.damage * 2 * (1 - attributes.physicalReduction)
      near(hp - run.state.player.hp, sign === 1 ? Math.min(hp, expectedDamage) : 0)
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
    const names = ['PlayerVitals', 'HPBar', 'Portrait', 'PaperArtwork', 'RealmLabel', 'FloorWave', 'Boss', 'Minimap', 'Notification', 'Skills', 'Inventory', 'Pause', 'SkillPointBadge', 'XPBar']
    const nodes = names.map(name => named(game.battle, `HUD.${name}`))
    const bounds = nodes.map(node => rectWithin(node, game.root))
    const size = game.root.getComponent(UITransform).contentSize
    for (let i = 0; i < nodes.length; i++) {
      const box = bounds[i]
      assert.ok(box.left >= -size.width / 2 && box.right <= size.width / 2, `${names[i]} horizontal bounds`)
      assert.ok(box.bottom >= -size.height / 2 && box.top <= size.height / 2, `${names[i]} vertical bounds`)
    }
    const controls = descendants(game.battle).filter(node => node.getComponent(Button))
    assert.deepEqual(controls.map(node => node.name), ['HUD.Pause', 'HUD.Inventory', 'HUD.Skills', 'HUD.BreakthroughReady'])
    assert.equal(named(game.battle, 'HUD.BreakthroughReady').active, false)
    assertTargetsInFrame(game, controls.filter(node => node.active).concat(joystick(game)))
    assert.equal(named(game.battle, 'HUD.FloorWave').getComponent(Button), null, 'wave is display-only')
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
  assert.equal(game.stats.string, '金丹十层·大圆满')
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
  press(game, '功法')
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
  game.withdraw(); press(game, '确认')
  assert.equal(game.notices.length, 0)
  assert.equal(game.breakthroughText, '')
})

test('passive skills do not imply damaging aura rings and rendering remains read-only', t => {
  const storage = disk(); seed(storage)
  const { game } = launch(t, storage, { assisted: false })
  game.enterTraining()
  const ids = growth.GROWTH_SKILLS.filter(skill => skill.kind === 'passive').map(skill => skill.id)
  assert.ok(ids.includes('sj_spirit') && !ids.includes('magnet'), 'use the live growth catalogue')
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

function assertDeveloperPersisted(game, storage) {
  const restored = new campaign.TowerCampaignStore(playtest.towerStorage(storage), START)
  assert.equal(restored.readOnly, false)
  assert.deepEqual(restored.state, game.store.state)
}

function assertOnlyCampaignWrites(storage, count) {
  assert.deepEqual(storage.writes, Array(count).fill(campaign.TOWER_CAMPAIGN_KEY))
}

test('developer point grants add 999 repeatedly and direct reset restores fresh progress', t => {
  const storage = disk(); seed(storage, { patch: investedSkillFixture() })
  storage.data.set('other-game', 'keep')
  storage.data.set(playtest.TOWER_PLAYTEST_TOOLS_KEY, JSON.stringify({ speed: 2, invincible: false }))
  const { game } = launch(t, storage)
  press(game, '开发者工具')
  const before = copy(game.store.state), available = growth.growthSummary(before).available
  storage.writes.length = 0
  for (let i = 1; i <= 2; i++) {
    press(game, '+999悟道点')
    assert.equal(growth.growthSummary(game.store.state).available, available + 999 * i)
    assert.deepEqual(game.store.state.skills, before.skills)
    assertOnlyCampaignWrites(storage, i)
    assertDeveloperPersisted(game, storage)
  }
  press(game, '重置游戏进度')
  assert.equal(game.screen, 'camp'); assert.equal(game.page, 'hall'); assert.equal(game.run, null)
  assert.equal(game.store.state.xp, 0)
  assert.deepEqual(game.store.state.skills, { sj_arc: 1 })
  assert.equal(growth.growthSummary(game.store.state).available, 0)
  assert.equal(game.store.state.playtestSkillPoints, undefined)
  assert.equal(game.store.state.activeRun, null)
  assertOnlyCampaignWrites(storage, 3)
  assert.equal(storage.getItem('other-game'), 'keep')
  assert.equal(storage.getItem(playtest.TOWER_PLAYTEST_TOOLS_KEY), JSON.stringify({ speed: 2, invincible: false }))
  assertDeveloperPersisted(game, storage)
})

test('host rejects retired or unsupported developer action routes without writes', t => {
  const storage = disk(); seed(storage)
  const { game } = launch(t, storage, { assisted: false })
  const before = copy(game.store.state), raw = storage.getItem(campaign.TOWER_CAMPAIGN_KEY)
  storage.writes.length = 0
  for (const action of ['playtestSkillPoints', 'playtestReset', 'playtestMaxLevel', 'not-an-action']) game.editPlaytest(action)
  assertNoLayoutWrites(game, storage, before, raw, 0)
  press(game, '开发者工具')
  assertDirectToolTargets(game)
  assertNoLayoutWrites(game, storage, before, raw, 0)
})

test('failed developer reset retains paused run and learned skills until one successful retry', t => {
  const storage = disk(); seed(storage, { paused: true, patch: investedSkillFixture() })
  storage.data.set('other-game', 'keep')
  const { game } = launch(t, storage)
  press(game, '开发者工具')
  const before = copy(game.store.state), run = game.run, snapshot = game.run.snapshot()
  const raw = storage.getItem(campaign.TOWER_CAMPAIGN_KEY)
  storage.writes.length = 0; storage.blockedWrites.add(campaign.TOWER_CAMPAIGN_KEY)
  press(game, '重置游戏进度')
  assertNoLayoutWrites(game, storage, before, raw, 0)
  assert.strictEqual(game.run, run); assert.deepEqual(game.run.snapshot(), snapshot)
  assert.equal(game.run.state.phase, 'paused')
  assert.ok(hasLabel(game.overlay, '操作未完成')); assert.ok(hasLabel(game.overlay, '保存失败'))
  storage.blockedWrites.clear(); press(game, '返回工具'); press(game, '重置游戏进度')
  assertOnlyCampaignWrites(storage, 1)
  assert.equal(game.run, null); assert.equal(game.store.state.activeRun, null)
  assert.deepEqual(game.store.state.skills, { sj_arc: 1 })
  assert.equal(storage.getItem('other-game'), 'keep')
  assertDeveloperPersisted(game, storage)
})

test('combined developer resource grants add stones and contribution twice to the live save', t => {
  const storage = disk(); seed(storage)
  const { game } = launch(t, storage)
  press(game, '开发者工具')
  const before = copy(game.store.state)
  storage.writes.length = 0
  for (let i = 1; i <= 2; i++) {
    press(game, '+999灵石、点眷')
    assert.deepEqual(game.store.state, { ...before,
      spiritStones: before.spiritStones + i * 999000000,
      contribution: before.contribution + i * 999,
    })
    assertOnlyCampaignWrites(storage, i)
    assertDeveloperPersisted(game, storage)
  }
  assert.equal(storage.getItem(playtest.TOWER_PLAYTEST_KEY), null)
})

test('camp stage button advances one level at a time to 30 with natural points and no extra healing', t => {
  const storage = disk(); seed(storage, { hp: 17.5 })
  const { game } = launch(t, storage)
  press(game, '开发者工具')
  const before = copy(game.store.state)
  storage.writes.length = 0
  for (let level = 2; level <= 30; level++) {
    press(game, '提升一小境界')
    assert.equal(game.store.state.xp, profile.cultivationLevelXp(level))
    assert.equal(profile.cultivationAt(game.store.state.xp).level, level)
    assert.equal(game.store.state.hp, 17.5)
    assert.equal(growth.growthSummary(game.store.state).available, (level - 1) + (level >= 11 ? 3 : 0) + (level >= 21 ? 3 : 0))
    assert.deepEqual(game.store.state, { ...before, xp: profile.cultivationLevelXp(level) })
    assertOnlyCampaignWrites(storage, level - 1)
    assertDeveloperPersisted(game, storage)
  }
  const capped = copy(game.store.state), raw = storage.getItem(campaign.TOWER_CAMPAIGN_KEY)
  press(game, '提升一小境界')
  assertNoLayoutWrites(game, storage, capped, raw, 29)
  assert.ok(hasLabel(game.overlay, '操作未完成'))
})

test('paused tower permits a same-realm level increase and keeps subsequent resource grants out of loot', t => {
  const storage = disk(); seed(storage, { paused: true, hp: 17.5 })
  const { game } = launch(t, storage)
  press(game, '开发者工具')
  storage.writes.length = 0
  const before = game.run.snapshot()
  press(game, '提升一小境界')
  assert.equal(game.store.state.xp, profile.cultivationLevelXp(2))
  assert.equal(game.run.state.player.xp, profile.cultivationLevelXp(2))
  assert.equal(game.run.state.phase, 'paused'); assert.equal(game.run.state.player.hp, 17.5)
  assert.deepEqual(game.run.snapshot().killLedger, before.killLedger)
  assert.equal(validateTowerSnapshot(game.run.snapshot()), true)
  assertDeveloperPersisted(game, storage)
  const snapshot = game.run.snapshot(), state = copy(game.store.state)
  press(game, '+999灵石、点眷')
  const expected = copy(state)
  expected.spiritStones += 999000000; expected.contribution += 999
  expected.activeRun.base.spiritStones += 999000000; expected.activeRun.base.contribution += 999
  assert.deepEqual(game.store.state, expected)
  assert.deepEqual(game.run.snapshot(), snapshot)
  assertOnlyCampaignWrites(storage, 2); assertDeveloperPersisted(game, storage)
  press(game, '关闭开发者工具'); assert.equal(game.run.state.phase, 'paused')
  press(game, '继续挑战'); assert.equal(game.run.state.phase, 'playing')
  assert.equal(game.run.state.player.hp, 17.5)
})

test('resource write failure publishes nothing and retry commits exactly one combined grant', t => {
  const storage = disk(); seed(storage, { paused: true })
  const { game } = launch(t, storage)
  press(game, '开发者工具')
  const state = copy(game.store.state), snapshot = game.run.snapshot(), run = game.run
  const raw = storage.getItem(campaign.TOWER_CAMPAIGN_KEY)
  storage.writes.length = 0; storage.blockedWrites.add(campaign.TOWER_CAMPAIGN_KEY)
  press(game, '+999灵石、点眷')
  assert.ok(hasLabel(game.overlay, '操作未完成')); assert.ok(hasLabel(game.overlay, '保存失败'))
  assertNoLayoutWrites(game, storage, state, raw, 0)
  assert.strictEqual(game.run, run); assert.deepEqual(game.run.snapshot(), snapshot)
  storage.blockedWrites.clear(); press(game, '返回工具'); press(game, '+999灵石、点眷')
  const expected = copy(state)
  expected.spiritStones += 999000000; expected.contribution += 999
  expected.activeRun.base.spiritStones += 999000000; expected.activeRun.base.contribution += 999
  assert.deepEqual(game.store.state, expected)
  assert.deepEqual(game.run.snapshot(), snapshot)
  assertOnlyCampaignWrites(storage, 1); assertDeveloperPersisted(game, storage)
})

test('either full resource rejects the entire combined developer grant without a write', t => {
  for (const patch of [{ spiritStones: campaign.PLAYTEST_STONE_CAP }, { contribution: profile.TOWER_RESOURCE_CAP }]) {
    const storage = disk(); seed(storage, { patch, hostStorage: true })
    const { game } = launch(t, storage)
    press(game, '开发者工具')
    const state = copy(game.store.state), raw = storage.getItem(campaign.TOWER_CAMPAIGN_KEY)
    storage.writes.length = 0
    press(game, '+999灵石、点眷')
    assert.ok(hasLabel(game.overlay, '资源已满'))
    assertNoLayoutWrites(game, storage, state, raw, 0)
    press(game, '返回工具'); assertDirectToolTargets(game)
    assertDeveloperPersisted(game, storage)
  }
})

test('tools checkpoint a locally paused restored run before committing a combined resource grant', t => {
  const storage = disk(); seed(storage)
  const normal = new campaign.TowerCampaignStore(storage, START)
  assert.ok(normal.act({ type: 'startFloor', floor: 1, seed: 123 }, START).ok)
  const { game } = launch(t, storage)
  assert.equal(game.run.state.phase, 'paused')
  assert.equal(game.store.state.activeRun.snapshot.phase, 'playing')
  storage.writes.length = 0
  press(game, '开发者工具')
  assert.equal(game.store.state.activeRun.snapshot.phase, 'paused')
  assertOnlyCampaignWrites(storage, 1); assertDeveloperPersisted(game, storage)
  const before = game.run.snapshot(), state = copy(game.store.state)
  press(game, '+999灵石、点眷')
  const expected = copy(state)
  expected.spiritStones += 999000000; expected.contribution += 999
  expected.activeRun.base.spiritStones += 999000000; expected.activeRun.base.contribution += 999
  assert.deepEqual(game.store.state, expected); assert.deepEqual(game.run.snapshot(), before)
  assertOnlyCampaignWrites(storage, 2); assertDeveloperPersisted(game, storage)
})

test('developer actions use the same live campaign without the retired playtest URL flag', t => {
  const storage = disk(); seed(storage)
  const { game } = launch(t, storage, { assisted: false })
  press(game, '开发者工具'); storage.writes.length = 0
  const state = copy(game.store.state)
  press(game, '+999灵石、点眷'); press(game, '提升一小境界')
  assert.deepEqual(game.store.state, { ...state, spiritStones: state.spiritStones + 999000000,
    contribution: state.contribution + 999, xp: profile.cultivationLevelXp(2) })
  assertOnlyCampaignWrites(storage, 2); assertDeveloperPersisted(game, storage)
  assert.equal(storage.getItem(playtest.TOWER_PLAYTEST_KEY), null)
})

for (const frame of [{ width: 1280, height: 720 }, { width: 844, height: 390 }, { width: 1920, height: 280 }]) {
  test(`direct developer tools fit ${frame.width}x${frame.height} and close without changing campaign state`, t => {
    const storage = disk(); seed(storage)
    const { game } = launch(t, storage, { frame })
    const state = copy(game.store.state), raw = storage.getItem(campaign.TOWER_CAMPAIGN_KEY), writes = storage.writes.length
    press(game, '开发者工具'); assertDirectToolTargets(game)
    press(game, '返回设置'); assert.ok(named(game.menu.root, '宗门设置遮罩'))
    press(game, '开发者工具'); assertDirectToolTargets(game)
    press(game, '关闭开发者工具'); assert.equal(game.overlay, null)
    assertNoLayoutWrites(game, storage, state, raw, writes)
  })
}

for (const level of [10, 20]) {
  test(`paused tower rejects developer crossing of realm boundary at level ${level}`, t => {
    const storage = disk(); seed(storage, { paused: true, patch: { xp: profile.cultivationLevelXp(level) } })
    const { game } = launch(t, storage)
    press(game, '开发者工具')
    const state = copy(game.store.state), snapshot = game.run.snapshot(), raw = storage.getItem(campaign.TOWER_CAMPAIGN_KEY)
    storage.writes.length = 0
    press(game, '提升一小境界')
    assert.ok(hasLabel(game.overlay, '操作未完成'))
    assertNoLayoutWrites(game, storage, state, raw, 0)
    assert.deepEqual(game.run.snapshot(), snapshot)
    assert.equal(game.run.state.phase, 'paused')
    assertDeveloperPersisted(game, storage)
  })
}

for (const caption of ['+999悟道点', '提升一小境界']) {
  test(`paused developer ${caption} write failure is atomic and retry commits once`, t => {
    const storage = disk(); seed(storage, { paused: true, hp: 17.5 })
    const { game } = launch(t, storage)
    press(game, '开发者工具')
    const state = copy(game.store.state), snapshot = game.run.snapshot(), run = game.run
    const raw = storage.getItem(campaign.TOWER_CAMPAIGN_KEY)
    storage.writes.length = 0; storage.blockedWrites.add(campaign.TOWER_CAMPAIGN_KEY)
    press(game, caption)
    assert.ok(hasLabel(game.overlay, '保存失败'))
    assertNoLayoutWrites(game, storage, state, raw, 0)
    assert.strictEqual(game.run, run); assert.deepEqual(game.run.snapshot(), snapshot)
    storage.blockedWrites.clear(); press(game, '返回工具'); press(game, caption)
    assertOnlyCampaignWrites(storage, 1)
    if (caption === '+999悟道点') {
      assert.deepEqual(game.store.state, { ...state, playtestSkillPoints: 999 })
      assert.deepEqual(game.run.snapshot(), snapshot)
    } else {
      assert.equal(game.store.state.xp, profile.cultivationLevelXp(2))
      assert.equal(game.run.state.player.xp, profile.cultivationLevelXp(2))
      assert.equal(growth.growthSummary(game.store.state).available, 1)
    }
    assert.equal(game.run.state.phase, 'paused'); assert.equal(game.run.state.player.hp, 17.5)
    assert.equal(validateTowerSnapshot(game.run.snapshot()), true)
    assertDeveloperPersisted(game, storage)
  })
}

test('flight is a one-rank shared passive with real purchase, reload and refund', t => {
  const storage = disk(); seed(storage, { patch: { xp: profile.cultivationLevelXp(11) } })
  const { game, icons } = launch(t, storage, { assisted: false })
  game.menu.go('librarySkills'); press(game, '功法图标-sj_flight')
  assert.match(labelText(named(game.menu.root, '功法详情固定栏')), /25%/)
  assert.match(labelText(named(game.menu.root, '功法详情固定栏')), /50%/)
  assert.match(labelText(named(game.menu.root, '功法详情固定栏')), /0\/1级/)
  assert.ok(icons.requests.some(c => c.path === 'tower-skill-icons/sj_flight'), 'approved flight artwork is requested')
  const before = growth.growthSummary(game.store.state).available
  press(game, 'learnSkill-sj_flight')
  assert.equal(game.store.state.skills.sj_flight, 1)
  assert.equal(growth.growthSummary(game.store.state).available, before - 1)
  assert.equal(new campaign.TowerCampaignStore(storage, START).state.skills.sj_flight, 1)
  game.enterFloor(1)
  assert.equal(game.run.state.loadout.passive.sj_flight, 1)
  assert.equal(game.run.state.player.moveSpeed, 275)
  game.withdraw(); press(game, '确认'); game.menu.go('librarySkills'); press(game, '功法图标-sj_flight'); press(game, 'decreaseSkill-sj_flight')
  assert.equal(game.store.state.skills.sj_flight || 0, 0)
  game.enterFloor(1)
  assert.equal(game.run.state.player.moveSpeed, 220)
})

test('host node visibility follows ancestors and emitted events reach registered handlers', () => {
  const root = new Node('root'), child = new Node('child'), leaf = new Node('leaf')
  root.addChild(child); child.addChild(leaf)
  assert.equal(leaf.activeInHierarchy, true)
  root.active = false; assert.equal(leaf.activeInHierarchy, false)
  root.active = true; child.active = false; assert.equal(leaf.activeInHierarchy, false)
  child.active = true; leaf.active = false; assert.equal(leaf.activeInHierarchy, false)
  leaf.active = true; assert.equal(leaf.activeInHierarchy, true)
  let received
  leaf.on('probe', (...args) => { received = args }); leaf.emit('probe', 7, 'value')
  assert.deepEqual(received, [7, 'value'])
})

for (const cap of [1800, 6600]) {
  test(`kill at cultivation cap ${cap} requests breakthrough without automatic realm promotion`, t => {
    const storage = disk(); seed(storage, { patch: { xp: cap - 1 } })
    const { game } = launch(t, storage, { assisted: false })
    game.enterFloor(1); press(game, '确认入塔'); game.update(0)
    for (let i = 0; i < 40 && !game.run.state.enemies.length; i++) game.update(.1)
    const enemy = game.run.state.enemies[0]; assert.ok(enemy)
    const before = profile.cultivationAt(game.run.state.player.xp), killed = game.run.state.killLedger.length
    enemy.hp = 0; game.update(.1)
    assert.equal(game.run.state.killLedger.length, killed + 1)
    assert.equal(game.run.state.player.xp, cap)
    const after = profile.cultivationAt(game.run.state.player.xp)
    assert.equal(after.realm, before.realm); assert.equal(after.level, before.level)
    assert.equal(after.breakthroughReady, true)
    assert.equal(game.levelEffects.length, 0)
    assert.ok(game.breakthroughText.includes('修为已满') || game.notices.some(n => n.text.includes('修为已满')))
    const snapshot = game.run.snapshot(), state = copy(game.store.state), raw = storage.getItem(campaign.TOWER_CAMPAIGN_KEY), writes = storage.writes.length
    game.draw(); game.draw()
    assert.deepEqual(game.run.snapshot(), snapshot)
    assertNoLayoutWrites(game, storage, state, raw, writes)
  })
}

for (const [xp, strong] of [[44, false], [224, true]]) {
  test(`actual kill starts a ${strong ? 'stage' : 'minor'} level animation only once`, t => {
    const storage = disk(); seed(storage, { patch: { xp } })
    const { game, tick } = launch(t, storage, { assisted: false })
    game.enterFloor(1); game.update(0)
    for (let i = 0; i < 40 && !game.run.state.enemies.length; i++) game.update(.1)
    const enemy = game.run.state.enemies[0]; assert.ok(enemy)
    enemy.hp = 0
    game.update(.1)
    assert.equal(game.levelEffects.length, 1)
    assert.equal(game.levelEffects[0].major, false)
    assert.equal(game.levelEffects[0].strong, strong)
    assert.equal(game.levelEffects[0].duration, 1.2)
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
  const storage = disk(); seed(storage, { patch: { xp: 2730 } })
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
  const storage = disk(); seed(storage, { hp: 50 })
  const { game, tick } = launch(t, storage, { assisted: false, frame: {width:844,height:390} })
  press(game, 'HUD.Portrait')
  const panel = named(game.menu.root, '角色信息面板')
  tick(6)
  assert.equal(named(game.menu.root, '角色信息面板'), panel, 'partial healing keeps the overlay stable')
  assert.ok(game.store.state.hp > 50 && game.store.state.hp < 100)
  assert.equal(named(game.menu.root, 'HUD.HPLabel').getComponent(Label).string, `${Math.ceil(game.store.state.hp)}/100`)
  tick(300)
  assert.equal(game.store.state.hp, 100)
  assert.ok(named(game.menu.root, '角色信息面板'), 'full-HP redraw preserves the open sheet')
  assert.equal(named(game.menu.root, 'HUD.HPLabel').getComponent(Label).string, '100/100')
  assert.equal(panel.isValid, false, 'reaching full HP redraws and reopens the character sheet')
  assert.equal(named(game.menu.root, '角色气血上限').getComponent(Label).string, '100')
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
  assert.equal(named(game.menu.root, 'HUD.RealmLabel').getComponent(Label).string, '炼气一层·初期')
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
  for (const [xp, text, realm] of [[0, '炼气一层·初期', '炼气'], [2730, '筑基三层·初期', '筑基'], [9360, '金丹五层·中期', '金丹']]) {
    game.run.state.player.xp = xp; game.draw()
    assert.equal(game.stats.string, text)
    assert.equal(game.portraitRealm, realm)
  }

})


test('skill page keeps reset compact and moves point information below the skill viewport', t => {
 const storage = disk(); seed(storage);
 const { game } = launch(t, storage, { menuOnly:true, frame: { width: 844, height: 390 } });
 game.menu.go('librarySkills');
 const reset = button(game, '初始化');
 assert.equal(labelText(reset).trim(), '重置加点');
 assert.equal(reset.getComponent(Button).interactable, true);
 assert.ok(named(reset, '刷新图标').getComponent(Graphics));
 assert.doesNotMatch(labelText(game.menu.root), /暂无可退点数|全部洗点/);
 const research = named(game.menu.root, '获取悟道点');
 const panel = named(game.menu.root, '功法树面板');
 assert.strictEqual(research.parent, panel);
 assert.ok(rectWithin(research,panel).top <= rectWithin(named(panel,'功法树二维卷轴'),panel).bottom);
 press(game,'获取悟道点');
 assert.ok(named(game.menu.root,'悟道点说明遮罩'));
 press(game,'关闭');
 assert.ok(named(game.menu.root,'功法详情固定栏'));
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
  const image = new ImageAsset(); image.width = json.width; image.height = json.height
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
  assert.equal(sword.fillColor.r, '#dce4e6', 'starter sword remains separately rendered')
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

test('character action follows the saved clock across a 3x frame without changing combat', t => {
  const storage=disk(); seed(storage,{patch:{xp:225,skillsInitialized:true,skills:{sj_yujian:1}}})
  const {game,icons}=launch(t,storage)
  game.enterTraining(); supplyCharacter(icons); game.draw()
  game.run.advance(2)
  const s=game.run.state, enemy=s.enemies[0]; assert.ok(enemy)
  enemy.x=s.player.x+100; enemy.y=s.player.y
  s.cooldowns.sj_yujian=0; s.casts=[]
  const twin=TowerRun.restore(game.run.snapshot())
  const art=game.characterArt, before=art.sample(s), events=[]
  game.run.advance(.3,event=>{events.push(event);art.observeCast(event)})
  twin.advance(.3); art.observe(before,game.run.state); game.draw()
  assert.deepEqual(game.run.snapshot(),twin.snapshot(),'observation/rendering adds neither damage nor state')
  assert.equal(events.filter(event=>event.skill==='sj_yujian').length,1)
  assert.equal(s.casts.some(c=>c.skill==='sj_yujian'),false,'short command windup has completed')
  const live=s.actions.current||s.actions.basic
  assert.ok(live,'a subsequent action is active after the short command')
  assert.equal(art.attack.start,live.startedAt)
  assert.equal(art.attack.release,live.releaseAt)
  assert.equal(art.attack.end,live.endsAt)
  const attack=copy(art.attack), frame=art.body.spriteFrame
  game.run.pause(); const paused=game.run.snapshot()
  game.draw(); game.render(); game.update(.1)
  assert.deepEqual(copy(art.attack),attack); assert.strictEqual(art.body.spriteFrame,frame)
  assert.deepEqual(game.run.snapshot(),paused)
  art.reset(); game.run=TowerRun.restore(paused); game.draw()
  assert.deepEqual(copy(art.attack),attack,'restore reconstructs the current saved action without firing another cast')
  assert.strictEqual(art.body.spriteFrame,frame)
  assert.deepEqual(game.run.snapshot(),paused)
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
    const enemy=game.run._enemy({...template,id:'line-action-target',x:233,y:-60})
    enemy.hp=enemy.maxHp=1e8; enemy.moveSpeed=0
    enemy.ai.readyAt=enemy.ai.graceUntil=enemy.ai.entryUntil=1e8
    s.enemies=[enemy]; s.pending=[]; s.reserved=[]; s.drops=[]; s.wavePlanned=1; s.waveKilled=0
    art.reset()
    const events=[], impacts=new Map(), poses=[]
    let savedAction=null
    const tick=()=>{
      const before=art.sample(s)
      game.run.advance(1/60,event=>{
        events.push(event)
        const stateBefore=JSON.stringify(s)
        art.observeCast(event)
        assert.equal(JSON.stringify(s),stateBefore,'the character observer cannot modify the real release')
      })
      if(s.actions.current?.skill==='sj_line')savedAction=copy(s.actions.current)
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
    assert.ok(savedAction)
    const last=action.at(-1), clip=atlas.clips.slash
    const expectedOrdinal=clip.hitFrame+Math.floor((last.time-savedAction.releaseAt+1e-8)*
      (clip.frames.length-clip.hitFrame)/(savedAction.endsAt-savedAction.releaseAt))
    assert.equal(last.ordinal,expectedOrdinal,'recovery follows the authoritative action duration at 60 Hz')
    assert.ok(savedAction.endsAt-last.time<=1/60+1e-8,'last sampled pose reaches the final simulation tick')
    const unchanged=JSON.stringify(s)
    art.draw(game.characterLayer,{...s,time:savedAction.endsAt-1e-6,
      actions:{...s.actions,current:savedAction,basic:null}},0,0,false)
    assert.strictEqual(art.body.spriteFrame,art.frames[clip.frames.at(-1)],'the last recovery frame remains addressable before action end')
    assert.equal(JSON.stringify(s),unchanged)
    game.draw(); assert.equal(art.attack,null,'completed actions are cleared')
    assert.equal(poses.at(-1).ordinal,-1,'the character returns to idle once the volley is over')
    const firstStart=events[0].startedAt
    s.cooldowns.sj_line=0
    for(let i=0;i<20;i++)tick()
    assert.ok(art.attack.start>firstStart,'a new volley may start a fresh action')
  })
}

test('character flight keeps its flying sword through idle and an attack preview', t => {
  const storage=disk(); seed(storage)
  const {game,icons}=launch(t,storage,{assisted:false})
  const atlas=JSON.parse(readFileSync(new URL('../cocos-pilot/assets/resources/tower-character/ground-actions.json',import.meta.url),'utf8'))
  game.enterTraining(); supplyCharacter(icons,atlas); game.draw()
  const s=game.run.state, art=game.characterArt
  const state=copy(game.store.state), raw=storage.getItem(campaign.TOWER_CAMPAIGN_KEY), writes=storage.writes.length
  const drawReadonly=()=>{
    const before=JSON.stringify(s); game.draw(); assert.equal(JSON.stringify(s),before)
    assertNoLayoutWrites(game,storage,state,raw,writes)
  }
  s.loadout.passive.sj_flight=1; art.mode='run'; art.attack=null
  const request=icons.requests.find(r=>r.path==='tower-skill-fx/flight-liuquan-v1')
  assert.ok(request); const image=icons.complete(request)
  drawReadonly()
  assert.strictEqual(art.body.spriteFrame,art.frames[1])
  const flyingSword=named(game.flightLayer,'流泉剑原画')
  assert.ok(flyingSword.getComponent(Sprite).spriteFrame)
  assert.equal(flyingSword.parent.active,true)
  assert.equal(image.refs,1)
  const original=art.body.spriteFrame
  s.loadout.weapon=weaponTools.rollWeapon('ling',1,()=>.5,'test-weapon'); drawReadonly()
  assert.strictEqual(art.body.spriteFrame,original)
  assert.equal(art.sword.fillColor.r,'#dce4e6','blade retains its metal color while quality is drawn separately')
  art.observeCast({skill:'sj_line',startedAt:s.time,releaseAt:s.time,dirX:1,dirY:0})
  drawReadonly()
  assert.notStrictEqual(art.body.spriteFrame,original,'a real attack uses the slash pose while flying')
  assert.strictEqual(art.body.spriteFrame,art.frames[atlas.clips.flightSlash.frames[atlas.clips.flightSlash.hitFrame]],'the flight clip supplies its own impact frame')
  assert.equal(flyingSword.parent.active,true,'the flying sword remains visible through the attack')
  assert.strictEqual(named(game.flightLayer,'流泉剑原画'),flyingSword)
  game.destroy(); assert.equal(image.refs,0)
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
  assert.equal(json.frames.length,49)
  assert.deepEqual(Object.fromEntries(Object.entries(json.clips).map(([k,v])=>[k,v.frames.length])),{walk:12,run:8,slash:14,idle:1,flightSlash:14})
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
  assert.equal(descendants(row(1)).some(n => n.name === '首通奖励'), true);
  assert.equal(labelText(row(1)).includes('已领取'), true);
  assert.ok(descendants(row(3)).some(n => n.name === '封印锁'));
  assert.equal(row(3).getComponent(Button).interactable, false);
  const state=copy(game.store.state), raw=storage.getItem(campaign.TOWER_CAMPAIGN_KEY), writes=storage.writes.length;
  row(3).events.get(Button.EventType.CLICK)();
  assert.equal(game.menu.selectedTowerFloor,2);
  assert.equal(game.run,null);
  assertNoLayoutWrites(game,storage,state,raw,writes);
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
  assert.equal(descendants(game.menu.root).filter(n => n.getComponent(Label)?.string === '已领取').length,
    economy.FIRST_CLEAR_REWARDS.filter(r => r.kind !== 'none').length);
  for (let floor = 1; floor <= 9; floor++) {
    const row = named(game.menu.root, `塔层-${floor}`), prize = economy.FIRST_CLEAR_REWARDS[floor - 1]
    const rewards = descendants(row).filter(n => n.name === '首通奖励')
    assert.equal(rewards.length, prize.kind === 'none' ? 0 : 1)
    if (prize.kind !== 'none') {
      assert.ok(labelText(rewards[0]).replace(/\s/g,'').includes(`×${prize.quantity}`))
      assert.ok(named(rewards[0], '首通奖励已领取对勾'))
      assert.ok(!labelText(row).includes(prize.name))
    }
  }
  const before = storage.getItem(campaign.TOWER_CAMPAIGN_KEY), state=copy(game.store.state), writes=storage.writes.length;
  game.menu.render({...game.store.state, readOnly: true}, 'tower');
  assert.equal(button(game, '入场').getComponent(Button).interactable, false);
  button(game, '入场').events.get(Button.EventType.CLICK)();
  assertNoLayoutWrites(game,storage,state,before,writes);
  assert.equal(game.run, null);
});

test('tower entry artwork reuses requests and late loads cannot revive abandoned page', t => {
  const storage = disk(); seed(storage);
  const { game, icons } = launch(t, storage, { assisted: false });
  const start=icons.requests.length
  game.goto('tower');
  const expected=['sect-scene/tower-courtyard-wide','boar','wolf','spider-lady','crocodile-humanoid','snake-lady','bear-humanoid','rhino','yak','white-tiger']
    .map(path=>path.includes('/')?path:`tower-monsters/${path}`).sort()
  const isTowerRequest=r=>/^(tower-monsters\/|tower-entry\/|sect-scene\/tower-courtyard)/.test(r.path)
  const requests=icons.requests.slice(start).filter(isTowerRequest)
  assert.deepEqual(requests.map(r=>r.path).sort(),expected)
  const old=named(game.menu.root,'层主传闻'), state=copy(game.store.state), raw=storage.getItem(campaign.TOWER_CAMPAIGN_KEY), writes=storage.writes.length
  press(game, '塔层-1');
  assert.equal(icons.requests.filter(isTowerRequest).length,requests.length)
  press(game, '← 宗门');
  const images=requests.map(request=>icons.complete(request))
  assert.equal(game.page, 'hall'); assert.equal(old.isValid,false)
  assert.ok(!descendants(game.menu.root).some(n => n.name === '层主传闻'));
  assertNoLayoutWrites(game,storage,state,raw,writes)
  game.goto('tower')
  assert.equal(icons.requests.filter(isTowerRequest).length,requests.length)
  for(let floor=1;floor<=9;floor++)assert.ok(named(game.menu.root,`塔层-${floor}`).children.find(n=>n.name==='层主特写').children.find(n=>n.getComponent(Sprite))?.getComponent(Sprite).spriteFrame)
  game.destroy(); assert.ok(images.every(image=>image.refs===0))
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
  const reward=named(menu.root,'塔层-2').children.find(n=>n.name==='首通奖励');
  assert.equal(row.children.some(n=>n.name==='首通奖励'),true,'first floor shows its dianjuan prize');
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

test('rhino and yak floor cards request the current authored boss artwork', t => {
 const storage=disk(); seed(storage,{patch:{clearedFloor:8}});
 const {game,icons}=launch(t,storage,{assisted:false}); game.goto('tower');
 for(const [floor,name] of [[7,'震岳犀王'],[8,'苍鬃牛魔王']]){
  const row=descendants(game.menu.root).find(n=>n.name===`塔层-${floor}`);
  assert.ok(labelText(row).includes(name));
  const portrait=row.children.find(n=>n.name==='层主特写');
  assert.ok(portrait.children.some(n=>n.getComponent(Sprite)));
  assert.ok(icons.requests.some(r=>r.path===`tower-monsters/${floor===7?'rhino':'yak'}`));
  press(game,`塔层-${floor}`); assert.equal(game.menu.selectedTowerFloor,floor);
 }
 assert.ok(!icons.requests.some(r=>/tower-monsters\/(falcon|ape)$/.test(r.path)));
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
 const {game,icons}=launch(t,storage,{assisted:false});
 const initialRequests=icons.requests.length;game.enterFloor(1);
 const state=game.run.state,p=state.player;
 state.drops=[1,10,1000,100000].map((amount,i)=>({id:`stone-check-${i}`,kind:'core',rank:7,amount,x:p.x+i*30,y:p.y,expiresAt:state.time+2}));
 // Synthetic renderer fixture: pending drops must be included in gross earnings.
 state.earned.cores=state.drops.reduce((sum,d)=>sum+d.amount,0);
 const before=JSON.stringify({drops:state.drops,earned:state.earned,wallet:game.store.state.spiritStones});
 game.draw();
 const requests=icons.requests.slice(initialRequests).filter(r=>r.path.startsWith('tower-stones/stone_'));
 assert.deepEqual(requests.map(r=>r.path),['stone_low','stone_mid','stone_high','stone_top','stone_top','stone_high','stone_mid','stone_low'].map(n=>`tower-stones/${n}`));
 const images=requests.map(r=>{const image=new ImageAsset();image.width=image.height=128;r.done(null,image);return image});
 game.draw();const nodes=[...game.stoneLayer.children];
 assert.deepEqual(nodes.map(n=>n.name),['low','mid','high','top'].map((grade,i)=>`灵石素材-stone_${grade}-stone-check-${i}:${i}`));
 assert.equal(nodes.length,4);assert.ok(nodes.every(n=>n.active&&n.getComponent(Sprite).spriteFrame));
 for(let i=0;i<20;i++)game.draw();
 assert.deepEqual(game.stoneLayer.children,nodes);assert.equal(icons.requests.slice(initialRequests).filter(r=>r.path.startsWith('tower-stones/stone_')).length,8);
 assert.equal(JSON.stringify({drops:state.drops,earned:state.earned,wallet:game.store.state.spiritStones}),before);
 state.drops=[];game.draw();assert.equal(game.stoneLayer.children.length,0);
 game.destroy();assert.ok(images.every(i=>i.refs===0));
});

test('wallet grade icons pair with quantities and release bindings on redraw', t => {
 for(let grade=0;grade<4;grade++){
  const storage=disk();seed(storage,{patch:{spiritStones:economy.STONE_VALUES[grade]}});
  const {game,icons}=launch(t,storage,{assisted:false});game.goto('inventory');
  const wallet=named(named(game.menu.root,'背包弹窗'),'货币信息');
  assert.equal(descendants(wallet).filter(n=>n.getComponent(Label)).map(n=>n.getComponent(Label).string).join('\n'), `×1\n×${game.store.state.contribution}`);
  const request=icons.requests.find(r=>r.path===`tower-stones/${['stone_low','stone_mid','stone_high','stone_top'][grade]}`);assert.ok(request);
  const old=named(wallet,`灵石货币图标-${grade}`);
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
 press(game,'关闭背包');press(game,'功法');
 assert.equal(named(game.menu.root,'悟道点标题').getComponent(Label).string,'可用悟道点');
 assert.equal(named(game.menu.root,'悟道点').getComponent(Label).string,String(growth.growthSummary(game.store.state).available));
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
 game.goto('pills');press(game,'丹霞主殿');const images=[];
 for(const id of ['huichun','peiyuan']){
  const request=icons.requests.find(r=>r.path===`tower-stones/pill_${id}`);assert.ok(request);
  const image=new ImageAsset();image.width=image.height=128;request.done(null,image);images.push(image);
  assert.ok(descendants(game.menu.root).some(n=>n.name.includes(`灵石素材-pill_${id}-commerce-商品卡片-${id}`)&&n.active));
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
 assert.equal(menuBag.getComponent(UITransform).contentSize.width,80);assert.equal(menuBag.getComponent(UITransform).contentSize.height,104);
 const menuFallback=menuBag.children[0];assert.equal(menuFallback.active,true);
 const menuImage=loadBag();assert.equal(menuFallback.active,false);
 assert.ok(menuBag.children.some(n=>n.getComponent(Sprite)?.spriteFrame));press(game,'背包');assert.ok(named(game.menu.root,'背包弹窗'));
 game.enterFloor(1);const battleBag=descendants(game.root).find(n=>n.name==='HUD.Inventory');assert.ok(battleBag);
 assert.equal(battleBag.getComponent(UITransform).contentSize.width,80);assert.equal(battleBag.getComponent(UITransform).contentSize.height,80);
 const battleImage=loadBag();assert.equal(battleBag.children[0].active,false);
 const sprite=battleBag.children.find(n=>n.getComponent(Sprite)?.spriteFrame);assert.ok(sprite);
 for(let i=0;i<30;i++)game.draw();assert.ok(sprite.isValid&&sprite.active);
 assert.equal(icons.requests.filter(r=>r.path==='tower-stones/ui_bag').length,2);
 press(game,'背包');assert.ok(named(game.menu.root,'背包弹窗'));
 game.destroy();assert.equal(menuImage.refs,0);assert.equal(battleImage.refs,0);
});

test('skill button art preserves menu and battle hit targets, fallback and skill navigation',t=>{
 const storage=disk();seed(storage);const {game,icons}=launch(t,storage,{assisted:false});
 const loadBag=()=>{const req=icons.requests.filter(r=>r.path==='tower-stones/ui_skills').at(-1);assert.ok(req);const image=new ImageAsset();image.width=image.height=128;req.done(null,image);return image;};
 const menuBag=descendants(game.menu.root).find(n=>n.name==='功法');assert.ok(menuBag);
 assert.equal(menuBag.getComponent(UITransform).contentSize.width,80);assert.equal(menuBag.getComponent(UITransform).contentSize.height,104);
 const menuFallback=menuBag.children[0];assert.equal(menuFallback.active,true);
 const menuImage=loadBag();assert.equal(menuFallback.active,false);
 assert.ok(menuBag.children.some(n=>n.getComponent(Sprite)?.spriteFrame));press(game,'功法');assert.equal(game.menu.currentPage,'library');
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
 assert.deepEqual(menuButton.getComponent(UITransform).contentSize,{width:56,height:64});
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
 assert.deepEqual(hud.getComponent(UITransform).contentSize,{width:72,height:72});
 assert.equal(hud.parent.name,'HUD.MapCard');
 const sprite=hud.children.find(n=>n.getComponent(Sprite)?.spriteFrame);assert.ok(sprite);assert.equal(sprite.position.x,0);
 for(let i=0;i<30;i++)game.draw();assert.ok(sprite.isValid&&sprite.active);
 press(game,'暂停');assert.ok(hasLabel(game.overlay,'塔内暂停'));
 game.destroy();assert.equal(menuImage.refs,0);assert.equal(battleImage.refs,0);
});

test('tower environment caches world art and fades queue-owned entrance mist across pause and reset',t=>{
 const storage=disk();seed(storage);const {game,icons}=launch(t,storage,{assisted:false});
 const art=game.environmentArt,ground=new Node('ground'),props=new Node('props');
 const portal=content.FLOOR01.arena.portals[0];
 const s={arenaVersion:1,floor:1,wave:1,waveStartedAt:0,phase:'playing',time:1,
  pending:[{id:'queued',portal:portal.id}],reserved:[],enemies:[]};
 const camera={x:33,y:-60};
 const paint=()=>{const before=copy(s);const result=art.draw(ground,props,s,camera,1280,720);assert.deepEqual(s,before);return result;};
 const mist=()=>[...art.nodes].filter(([id])=>id.startsWith('mist-')).map(([,node])=>node);
 assert.equal(paint(),false);paint();
 const requests=icons.requests.filter(r=>r.path.startsWith('tower-environment/'));
 assert.deepEqual(requests.map(r=>r.path),['tower_floor_stone','tower_obstacle_pillar','tower_mist_wisp'].map(n=>`tower-environment/${n}`));
 const images=requests.map(r=>icons.complete(r));assert.equal(paint(),true);
 assert.deepEqual(art.nodes.get('floor').position,{x:0,y:0});
 const pillar=TOWER_PILLARS.find(p=>p.id==='north');
 assert.equal(art.nodes.get('north').position.x,pillar.x-camera.x);
 assert.equal(mist().length,5,'one entrance owns five mist layers');
 const nodes=[...art.nodes.values()],positions=nodes.map(n=>({...n.position}));
 camera.x+=40;camera.y-=25;paint();
 nodes.forEach((n,i)=>{assert.ok(Math.abs(n.position.x-(positions[i].x-40))<1e-9);assert.ok(Math.abs(n.position.y-(positions[i].y+25))<1e-9);});
 // Reserving a monster from the same queue keeps the entrance and its nodes alive.
 s.pending=[];s.reserved=[{id:'spawn',portal:portal.id,x:portal.x,y:portal.y}];paint();
 assert.deepEqual([...art.nodes.values()],nodes);assert.equal(art.fading.size,0);
 s.reserved=[];s.enemies=[{id:'spawn'}];paint();
 assert.equal(art.fading.size,1);const alpha=mist().map(n=>n.getComponent(Sprite).color.a);
 s.phase='paused';paint();assert.deepEqual(mist().map(n=>n.getComponent(Sprite).color.a),alpha);
 s.phase='playing';s.time+=.35;paint();
 mist().forEach((n,i)=>assert.ok(n.getComponent(Sprite).color.a<alpha[i]));
 s.time+=.36;paint();assert.equal(art.fading.size,0);assert.equal(mist().length,0);
 assert.ok(nodes.filter(n=>n.name.startsWith('mist-')).every(n=>!n.isValid));
 // A new wave or terminal state clears old mist without carrying its fade forward.
 s.pending=[{portal:portal.id}];paint();assert.equal(mist().length,5);
 s.pending=[];s.wave++;paint();assert.equal(mist().length,0);assert.equal(art.fading.size,0);
 s.pending=[{portal:portal.id}];paint();assert.equal(mist().length,5);
 s.phase='won';paint();assert.equal(mist().length,0);assert.equal(art.fading.size,0);
 assert.equal(icons.requests.filter(r=>r.path.startsWith('tower-environment/')).length,3);
 const remaining=[...art.nodes.values()];art.clearBindings();assert.equal(art.nodes.size,0);
 assert.ok(remaining.every(n=>!n.isValid));assert.ok(images.every(i=>i.refs===1));
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


test('stone drops render one icon per denomination without reward mutations', t => {
  const storage = disk(); seed(storage)
  const { game } = launch(t, storage, { assisted: false })
  game.enterTraining()
  const p = game.run.state.player
  const draws = []
  game.stoneArt.draw = (parent, key, grade, x, y, size) => { draws.push({ key, grade, x, y, size }); return true }
  for (const [amount, count, grade] of [[1, 1, 0], [10, 1, 1], [1000000, 1, 3]]) {
    game.run.state.drops = [{ id: 999, kind: 'core', amount, receipts: [{}], x: p.x, y: p.y }]
    const before = JSON.stringify(game.run.state)
    draws.length = 0; game.draw()
    assert.equal(draws.length, count)
    assert.ok(draws.every(d => d.grade === grade))
    assert.equal(new Set(draws.map(d => d.key)).size, count)
    assert.equal(new Set(draws.map(d => `${d.x}:${d.y}`)).size, count)
    assert.ok(game.labels.every(l => !l.node.active || !l.string.startsWith('灵石 ')))
    assert.equal(game.labels.find(l => l.node.active)?.string, `×${economy.legacyRewardToStones(amount)}`)
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

test('map card owns device status and places wave progress below without overlapping pause', t => {
 for(const frame of [{width:1280,height:720},{width:844,height:390},{width:1280,height:600}]){
  const storage=disk();seed(storage);
  const {game}=launch(t,storage,{assisted:false,frame});game.enterFloor(1);game.update(0);
  const before=copy(game.run.state),saved=storage.getItem(campaign.TOWER_CAMPAIGN_KEY),writes=storage.writes.length;
  const map=named(game.battle,'HUD.MapCard'),wave=named(game.battle,'HUD.FloorWave');
  assert.strictEqual(wave.parent,map);
  assert.equal(named(wave,'HUD.FloorWaveLabel').getComponent(Label).string,`波次 ${game.run.state.wave}/20`);
  assert.match(named(map,'HUD.MapName').getComponent(Label).string,/第1层/);
  assert.match(named(map,'HUD.DeviceTime').getComponent(Label).string,/\d{2}:\d{2}/);
  for(const name of ['HUD.Minimap','HUD.MapName','HUD.DeviceTime','HUD.DeviceNetwork','HUD.DeviceBattery','HUD.Pause图形']){
   const box=rectWithin(named(map,name),map);
   assert.ok(box.left>=-121&&box.right<=121,name);assert.ok(box.bottom>=-102&&box.top<=102,name);
  }
  const waveBox=rectWithin(wave,map),pause=named(map,'HUD.Pause'),pauseBox=rectWithin(pause,map);
  assert.equal(waveBox.left,-121);assert.equal(waveBox.top,-110,'wave starts 8px below the map');
  assert.ok(waveBox.right<pauseBox.left,'wave does not overlap the larger pause touch target');
  const screen=game.root.getComponent(UITransform).contentSize;
  for(const node of [map,wave,pause]){
   const box=rectWithin(node,game.root);
   assert.ok(box.left>=-screen.width/2&&box.right<=screen.width/2,node.name);
   assert.ok(box.bottom>=-screen.height/2&&box.top<=screen.height/2,node.name);
  }
  assert.deepEqual(pause.getComponent(UITransform).contentSize,{width:72,height:72});
  assert.equal(pause.getComponent(Button).interactable,true);
  game.draw();assert.deepEqual(game.run.state,before);
  assert.equal(storage.getItem(campaign.TOWER_CAMPAIGN_KEY),saved);assert.equal(storage.writes.length,writes);
 }
});

for (const frame of [{width:1280,height:720},{width:844,height:390}]) {
 test(`initialization confirmation stays visible and clears every skill (${frame.width})`, t => {
  const storage=disk();seed(storage,{patch:investedSkillFixture()});
  const {game}=launch(t,storage,{frame});
  press(game,'功法');
  const before=copy(game.store.state),saved=storage.getItem(campaign.TOWER_CAMPAIGN_KEY),writes=storage.writes.length;
  press(game,'初始化');
  assert.deepEqual(game.store.state,before);assert.equal(storage.getItem(campaign.TOWER_CAMPAIGN_KEY),saved);
  assert.equal(storage.writes.length,writes);
  const after=growth.growthSummary({...before,skillsInitialized:true,skills:{},evolutionRanks:{}});
  const returned=after.available-growth.growthSummary(before).available;
  const confirm=button(game,`确认重置 · 返还${returned}点`);
  const sheet=named(game.menu.root,'初始化功法');
  assert.strictEqual(confirm.parent,sheet);
  const rect=rectWithin(confirm,sheet),view=rectWithin(named(sheet,'全洗明细卷轴'),sheet);
  assert.ok(rect.bottom>=-sheet.getComponent(UITransform).contentSize.height/2);
  assert.ok(rect.top<=view.bottom);
  assertTargetsInFrame(game,[confirm,button(game,'取消 · 返回功法')]);
  const close=button(game,'取消 · 返回功法');close.events.get(Button.EventType.CLICK)();
  assert.deepEqual(game.store.state,before);assert.equal(storage.writes.length,writes);
  press(game,'初始化');
  press(game,`确认重置 · 返还${returned}点`);
  assert.deepEqual(copy(game.store.state.skills),{});
  assert.deepEqual(copy(game.store.state.evolutionRanks),{});
  assert.equal(growth.growthSummary(game.store.state).available,after.available);
  assert.equal(storage.writes.length,writes+1);
  assert.equal(game.store.state.spiritStones,before.spiritStones);
  assert.deepEqual(game.store.state.books,before.books);
  assertDeveloperPersisted(game,storage);
  assert.equal(button(game,'初始化').getComponent(Button).interactable,false);
 });
}

test('single-save tools expose only direct actions and cycle speed without a submenu', t => {
 const storage=disk(); seed(storage)
 const {game}=launch(t,storage,{assisted:false})
 press(game,'开发者工具')
 const names=()=>descendants(game.overlay).filter(n=>n.getComponent(Button)).map(n=>n.name)
 assert.deepEqual(names(),['返回设置','关闭开发者工具','游戏速度 ×1','无敌：关闭','+999灵石、点眷','+999悟道点','提升一小境界','重置游戏进度'])
 for(const forbidden of ['当前灵石','体验档','成长与存档','返回宗门','切回普通档'])assert.ok(!hasLabel(game.overlay,forbidden))
 for(const speed of [1,2,3]){press(game,`游戏速度 ×${speed}`);assert.equal(game.tools.speed,speed%3+1)}
 press(game,'返回设置')
 assert.ok(named(game.menu.root,'宗门设置遮罩'))
 assert.ok(!hasLabel(named(game.menu.root,'宗门设置遮罩'),'霁云宗'))
 press(game,'开发者工具')
 const balance=game.store.state.spiritStones, contribution=game.store.state.contribution
 press(game,'+999灵石、点眷');press(game,'+999灵石、点眷')
 assert.equal(game.store.state.spiritStones,balance+1998000000)
 assert.equal(game.store.state.contribution,contribution+1998)
 press(game,'+999悟道点')
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
 press(game,'+999灵石、点眷')
 assert.deepEqual(game.store.state,before)
 assert.ok(hasLabel(game.overlay,'保存失败'))
 storage.blockedWrites.clear();press(game,'返回工具')
 press(game,'+999灵石、点眷')
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

test('battle experience track resets at level-ups, fills at realm gates and cap, and stays hidden in hall', t => {
 const storage=disk();seed(storage,{patch:{xp:20}});
 const {game}=launch(t,storage,{assisted:false});
 const campaignBefore=copy(game.store.state),saved=storage.getItem(campaign.TOWER_CAMPAIGN_KEY),writes=storage.writes.length;
 for(const xp of [20,45,1800,1801,6600,6601,profile.TOWER_XP_CAP]){
  game.menu.render({...campaignBefore,xp},'hall');
  assert.equal(named(game.menu.root,'HUD.XPBar').active,false);
  assert.equal(descendants(game.menu.root).some(n=>n.name==='HUD.XPRing'),false);
 }
 assert.deepEqual(game.store.state,campaignBefore);
 assert.equal(storage.getItem(campaign.TOWER_CAMPAIGN_KEY),saved);assert.equal(storage.writes.length,writes);
 game.enterFloor(1);
 const g=game.xpBar,rectangles=[];
 g.roundRect=(x,y,width,height,radius)=>rectangles.push({x,y,width,height,radius});
 const width=g.node.getComponent(UITransform).contentSize.width;
 // Explicit fractions exercise the real cultivation boundaries, not a second invocation of the display formula.
 for(const [xp,share] of [[0,0],[20,20/45],[45,0],[60,15/75],[1800,1],[1801,0],[6600,1],[6601,0],[profile.TOWER_XP_CAP,1],[20,20/45]]){
  game.run.state.player.xp=xp;
  const before=copy(game.run.state),campaignState=copy(game.store.state),raw=storage.getItem(campaign.TOWER_CAMPAIGN_KEY),count=storage.writes.length;
  rectangles.length=0;game.draw();
  assert.equal(g.node.active,true,'empty and capped tracks remain visible');
  assert.equal(rectangles.length,share>0?2:1,`XP ${xp}: one background and optional fill`);
  assert.deepEqual(rectangles[0],{x:-width/2,y:-2,width,height:4,radius:2});
  if(share>0){
   assert.equal(rectangles[1].x,-width/2);assert.equal(rectangles[1].height,4);
   assert.ok(Math.abs(rectangles[1].width-width*share)<1e-8,`XP ${xp}`);
  }
  assert.deepEqual(game.run.state,before);assert.deepEqual(game.store.state,campaignState);
  assert.equal(storage.getItem(campaign.TOWER_CAMPAIGN_KEY),raw);assert.equal(storage.writes.length,count);
 }
});

for (const frame of [{width:1280,height:720},{width:1280,height:600}]) {
 test(`target health stays transparent and immediately below top resources ${frame.height}`,t=>{
  const storage=disk();seed(storage);const {game}=launch(t,storage,{assisted:false,frame});game.enterTraining();
  assert.equal(game.bossPanel.getComponent(Graphics),null,'no opaque panel behind target');
  const root=game.root, size=root.getComponent(UITransform).contentSize;
  const name=rectWithin(game.bossLabel.node,root),bar=rectWithin(game.bossBar.node,root);
  assert.ok(name.top<=size.height/2-58 && name.top>=size.height/2-70);
  assert.ok(bar.bottom>=size.height/2-98,'target bar stays near the top');
  const wave=rectWithin(named(game.battle,'HUD.FloorWaveLabel'),root);
  assert.ok(wave.left>name.right,'wave is grouped below the right-hand map');
  assert.ok(wave.top<bar.bottom,'wave and target do not overlap vertically');
  assert.ok(name.bottom>bar.top,'target name and health track do not overlap');
  assert.equal(game.bossLabel.enableOutline,true);
 });
}

test('battle experience uses one thin bottom track outside the portrait',t=>{
 for(const frame of [{width:1280,height:720},{width:844,height:390},{width:1280,height:600}]){
  const storage=disk();seed(storage);const {game}=launch(t,storage,{assisted:false,frame});game.enterTraining();
  const bar=game.xpBar.node,screen=game.root.getComponent(UITransform).contentSize;
  assert.strictEqual(bar.parent,game.battle);assert.equal(bar.name,'HUD.XPBar');
  assert.deepEqual(bar.getComponent(UITransform).contentSize,{width:screen.width-32,height:4});
  const box=rectWithin(bar,game.root);
  assert.equal(box.left,-screen.width/2+16);assert.equal(box.right,screen.width/2-16);
  assert.equal(box.bottom,-screen.height/2+22);assert.equal(box.top,-screen.height/2+26);
  assert.equal(descendants(game.battle).filter(node=>node.name==='HUD.XPBar').length,1);
  assert.equal(descendants(named(game.battle,'HUD.Portrait')).some(node=>node.name==='HUD.XPBar'||node.name==='HUD.XPRing'),false);
  assert.equal(descendants(game.battle).some(node=>node.name==='HUD.XPCaption'),false);
 }
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
 press(game,'+999悟道点');press(game,'+999悟道点')
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

for(const frame of [{width:1280,height:720},{width:844,height:390}])test(`ten-layer character panel shows full XP and opens breakthrough inventory (${frame.width})`,t=>{
 const storage=disk();seed(storage,{patch:{xp:6600}})
 const {game}=launch(t,storage,{frame,assisted:false})
 const state=copy(game.store.state), raw=storage.getItem(campaign.TOWER_CAMPAIGN_KEY), writes=storage.writes.length
 game.menu.showCharacterInfo()
 assert.equal(named(game.menu.root,'角色境界').getComponent(Label).string,'剑修 · 筑基十层·大圆满')
 assert.equal(named(game.menu.root,'角色修为').getComponent(Label).string,'经验  615 / 615')
 const choice=button(game,'选择突破物品')
 assert.equal(choice.getComponent(Button).interactable,true)
 assertTargetsInFrame(game,[choice,button(game,'关闭角色信息')])
 press(game,'选择突破物品')
 assert.ok(named(game.menu.root,'背包遮罩'))
 assertNoLayoutWrites(game,storage,state,raw,writes)
})

test('ten-layer golden core distinguishes tenth layer from full consummation',t=>{
 const storage=disk();seed(storage,{patch:{xp:13485}})
 const {game}=launch(t,storage,{assisted:false})
 const before=copy(game.store.state), raw=storage.getItem(campaign.TOWER_CAMPAIGN_KEY), writes=storage.writes.length
 game.menu.showCharacterInfo()
 assert.equal(named(game.menu.root,'角色境界').getComponent(Label).string,'剑修 · 金丹十层·巅峰')
 assert.equal(named(game.menu.root,'角色修为').getComponent(Label).string,'经验  0 / 915')
 assertNoLayoutWrites(game,storage,before,raw,writes)
 assert.equal(game.store.act({type:'playtestMaxLevel'},START).ok,true)
 game.render();game.menu.showCharacterInfo()
 const capped=copy(game.store.state), cappedRaw=storage.getItem(campaign.TOWER_CAMPAIGN_KEY), cappedWrites=storage.writes.length
 assert.equal(named(game.menu.root,'角色境界').getComponent(Label).string,'剑修 · 金丹十层·大圆满')
 assert.equal(named(game.menu.root,'角色修为').getComponent(Label).string,'经验已圆满')
 assert.equal(descendants(game.menu.root).some(n=>n.name==='选择突破物品'),false)
 assertNoLayoutWrites(game,storage,capped,cappedRaw,cappedWrites)
})

test('withdrawal confirmation cancels safely and a failed settlement retries exactly once',t=>{
 const storage=disk();seed(storage,{paused:true,hp:42});const {game}=launch(t,storage,{assisted:false});
 const before=copy(game.store.state),raw=storage.getItem(campaign.TOWER_CAMPAIGN_KEY);
 game.withdraw();press(game,'取消');
 assert.equal(game.screen,'battle');assert.equal(game.run.state.phase,'paused');
 assert.deepEqual(game.store.state,before);assert.equal(storage.getItem(campaign.TOWER_CAMPAIGN_KEY),raw);
 game.withdraw();const confirm=button(game,'确认').events.get(Button.EventType.CLICK);
 storage.blockedWrites.add(campaign.TOWER_CAMPAIGN_KEY);confirm();
 assert.equal(game.pending.type,'finishFloor');assert.deepEqual(game.store.state,before);
 assert.equal(storage.getItem(campaign.TOWER_CAMPAIGN_KEY),raw);confirm();
 assert.deepEqual(game.store.state,before);
 storage.blockedWrites.clear();press(game,'重试保存');
 assert.equal(game.screen,'camp');assert.equal(game.pending,null);assert.equal(game.run,null);
 assert.equal(game.store.state.activeRun,null);assert.equal(game.store.state.hp,42);
 const settled=copy(game.store.state),saved=storage.getItem(campaign.TOWER_CAMPAIGN_KEY),writes=storage.writes.length;
 confirm();assert.deepEqual(game.store.state,settled);assert.equal(storage.getItem(campaign.TOWER_CAMPAIGN_KEY),saved);
 assert.equal(storage.writes.length,writes);
 assert.deepEqual(new campaign.TowerCampaignStore(storage,START).state,settled);
});

test('relocated entrance mist follows actual portal and retires the old portal across pause and wave changes',t=>{
 const storage=disk();seed(storage);const {game,icons}=launch(t,storage,{assisted:false});
 const art=game.environmentArt,ground=new Node('relocation-ground'),props=new Node('relocation-props');
 const east=content.FLOOR01.arena.portals.find(p=>p.id==='E');
 const s={arenaVersion:1,floor:1,wave:10,waveStartedAt:0,phase:'playing',time:1,
  pending:[{id:'queued',portal:'N'}],reserved:[],enemies:[]};
 const camera={x:33,y:-60};
 const paint=()=>{const before=copy(s);art.draw(ground,props,s,camera,1280,720);assert.deepEqual(s,before);};
 const nodes=id=>[...art.nodes].filter(([key])=>key.startsWith(`mist-:${id}:`)).map(([,node])=>node);
 paint();icons.requests.filter(r=>r.path.startsWith('tower-environment/')).forEach(r=>icons.complete(r));paint();
 assert.equal(nodes('N').length,5);assert.equal(nodes('E').length,0);
 s.pending=[];s.reserved=[{id:'queued',portal:'N',...east.candidates[1],readyAt:2.2}];paint();
 assert.equal(nodes('E').length,5);assert.equal(art.fading.has('N'),true);
 const eastNode=art.nodes.get('mist-:E:0');
 assert.ok(Math.abs(eastNode.position.x-(east.x-camera.x-35+Math.sin(s.time*.38)*7))<1e-7);
 const positions=nodes('E').map(n=>copy(n.position)),alpha=nodes('N').map(n=>n.getComponent(Sprite).color.a);
 s.phase='paused';paint();
 assert.deepEqual(nodes('E').map(n=>n.position),positions);
 assert.deepEqual(nodes('N').map(n=>n.getComponent(Sprite).color.a),alpha);
 s.phase='playing';s.time+=.71;paint();
 assert.equal(nodes('N').length,0);assert.equal(nodes('E').length,5);
 // The remaining planned queue legitimately keeps its original entrance visible.
 s.pending=[{id:'next',portal:'N'}];paint();assert.equal(nodes('N').length,5);
 s.pending=[];s.reserved=[];s.wave++;paint();
 assert.equal(nodes('N').length,0);assert.equal(nodes('E').length,0);assert.equal(art.fading.size,0);
 game.destroy();
});
