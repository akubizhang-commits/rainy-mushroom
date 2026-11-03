import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { runInNewContext } from 'node:vm'
import { GROWTH_SKILLS, GROWTH_EVOLUTIONS } from '../js/xianxia/TowerGrowth.js'

// Exercise the production loader at the Cocos resource/node boundary.
// These checks do not assert PNG artwork quality or GPU stencil rendering.
const source = stripTypeScriptTypes(
  readFileSync(new URL('../cocos-pilot/assets/scripts/TowerSkillIcons.ts', import.meta.url), 'utf8')
    .replace(/^import .*$/gm, ''),
  { mode: 'transform' },
).replace(/^export /gm, '')
const ids = [...GROWTH_SKILLS, ...GROWTH_EVOLUTIONS].map(skill => skill.id)

function fixture({ synchronous = false, throwLoad = false, throwTexture = false } = {}) {
  const calls = [], images = [], textures = [], frames = []
  class Node {
    constructor(name) {
      Object.assign(this, { name, layer: 7, children: [], components: new Map(), isValid: true, queued: false, _active: true })
    }
    get active() { return this._active }
    set active(value) {
      assert.equal(this.queued, false, `mutating node after destroy(): ${this.name}`)
      this._active = value
    }
    setPosition(x, y, z=0) { this.position={x,y,z} }
    addChild(node) { this.children.push(node); node.parent = this }
    addComponent(Type) { const value = new Type(); value.node = this; this.components.set(Type, value); return value }
    getComponent(Type) { return this.components.get(Type) }
    destroy() {
      // Cocos defers actual destruction; isValid remains true in this frame.
      this.queued = true
      for (const child of this.children) child.destroy()
    }
  }
  class UITransform { setContentSize(width, height) { this.size = { width, height } } }
  class Mask { static Type = { GRAPHICS_ELLIPSE: 1 } }
  class Sprite {
    static SizeMode = { CUSTOM: 0 }
    set spriteFrame(value) {
      assert.equal(this.node.queued, false, 'assigning a sprite after destroy()')
      this.frame = value
    }
  }
  class Color { constructor(r, g, b, a) { Object.assign(this, { r, g, b, a }) } }
  class ImageAsset {
    constructor(width = 256, height = 256) {
      Object.assign(this, { width, height, refs: 0, adds: 0, releases: 0 }); images.push(this)
    }
    addRef() { this.refs++; this.adds++; return this }
    decRef() { this.refs--; this.releases++; return this }
  }
  class Texture2D {
    static Filter = { LINEAR: 1 }
    constructor() { this.destroyed = 0; textures.push(this) }
    setFilters(min, mag) {
      if (throwTexture) throw Error('injected texture setup failure')
      this.filters = [min, mag]
    }
    destroy() { this.destroyed++ }
  }
  class SpriteFrame {
    constructor() { this.destroyed = 0; frames.push(this) }
    destroy() { this.destroyed++ }
  }
  const isValid = (value, strict) => !!value && value.isValid !== false
    && (!strict || !(value.queued || value.node?.queued))
  const resources = {
    load(path, Type, done) {
      calls.push({ path, Type, done })
      if (throwLoad) throw Error('injected resource lookup failure')
      if (synchronous) done(null, new ImageAsset())
    },
  }
  const TowerSkillIcons = runInNewContext(`${source}\nTowerSkillIcons`, {
    Node, UITransform, Mask, Sprite, Color, ImageAsset, Texture2D, SpriteFrame, isValid, resources,
    GROWTH_SKILLS, GROWTH_EVOLUTIONS,
  })
  const loader = new TowerSkillIcons()
  function attach(id = ids[0], learned = true) {
    const icon = new Node(`技能图标-${id}`), glyph = new Node(`技能简笔-${id}`)
    icon.addComponent(UITransform).setContentSize(96, 96)
    icon.addChild(glyph)
    loader.attach(icon, glyph, id, learned)
    const badge = new Node(`技能等级-${id}`); icon.addChild(badge)
    const clip = icon.children.find(node => node.name === `技能素材裁剪-${id}`)
    return { icon, glyph, badge, clip, sprite: clip?.children[0].getComponent(Sprite) }
  }
  async function complete(index, error = null, image = new ImageAsset()) {
    await Promise.resolve()
    calls[index].done(error, image)
    return image
  }
  return { loader, attach, complete, calls, images, textures, frames, ImageAsset, UITransform, Mask, Sprite }
}

test('all 18 icons deduplicate pending loads across redraws and reuse completed assets', async () => {
  const f = fixture()
  let current = []
  for (let redraw = 0; redraw < 24; redraw++) {
    f.loader.clearBindings()
    current.forEach(view => view.icon.destroy())
    current = ids.map(id => f.attach(id))
  }
  assert.equal(f.calls.length, 18)
  assert.deepEqual(f.calls.map(call => call.path), ids.map(id => `tower-skill-icons/${id}`))
  assert.ok(f.calls.every(call => call.Type === f.ImageAsset))
  assert.ok(current.every(view => view.glyph.active && !view.clip.active))
  await Promise.all(f.calls.map((_, index) => f.complete(index)))
  assert.ok(current.every(view => !view.glyph.active && view.clip.active))
  assert.equal(f.textures.length, 18)
  assert.equal(f.frames.length, 18)
  assert.ok(f.images.every(image => image.refs === 1 && image.adds === 1))
  f.loader.clearBindings()
  const cached = ids.map(id => f.attach(id))
  assert.equal(f.calls.length, 18)
  cached.forEach((view, i) => assert.equal(view.sprite.frame, current[i].sprite.frame))
  f.loader.destroy()
  assert.ok(f.images.every(image => image.refs === 0 && image.releases === 1))
  assert.ok(f.textures.every(texture => texture.destroyed === 1))
  assert.ok(f.frames.every(frame => frame.destroyed === 1))
})

test('the artwork alone is circularly clipped; learned tint keeps opacity and badge outside', async () => {
  const f = fixture(), learned = f.attach(ids[0]), unlearned = f.attach(ids[0], false)
  await f.complete(0)
  assert.equal(f.calls.length, 1)
  for (const view of [learned, unlearned]) {
    assert.deepEqual(view.icon.getComponent(f.UITransform).size, { width: 96, height: 96 })
    assert.deepEqual(view.clip.getComponent(f.UITransform).size, { width: 88, height: 88 })
    assert.deepEqual(view.sprite.node.getComponent(f.UITransform).size, { width: 88, height: 88 })
    assert.equal(view.clip.getComponent(f.Mask).type, f.Mask.Type.GRAPHICS_ELLIPSE)
    assert.equal(view.clip.getComponent(f.Mask).segments, 64)
    assert.equal(view.sprite.sizeMode, f.Sprite.SizeMode.CUSTOM)
    assert.equal(view.sprite.trim, false)
    assert.equal(view.sprite.node.layer, view.icon.layer)
    assert.equal(view.badge.parent, view.icon)
    assert.equal(view.icon.children.at(-1), view.badge)
    assert.equal(view.badge.active, true)
    assert.equal(view.sprite.color.a, 255)
  }
  assert.equal(learned.sprite.color.r, 255)
  assert.ok(unlearned.sprite.color.r >= 190 && unlearned.sprite.color.r < 255)
  assert.equal(learned.sprite.frame, unlearned.sprite.frame)
  f.loader.destroy()
})

test('clearBindings removes stale observers even before Cocos completes node destruction', async () => {
  const f = fixture(), old = f.attach()
  f.loader.clearBindings()
  old.icon.destroy()
  const replacement = f.attach()
  assert.equal(old.icon.isValid, true, 'model the same-frame Cocos destruction race')
  await f.complete(0)
  assert.equal(old.glyph.active, true)
  assert.equal(old.clip.active, false)
  assert.equal(replacement.glyph.active, false)
  assert.equal(replacement.clip.active, true)
  assert.equal(f.calls.length, 1)
  f.loader.destroy()
})

test('strict node validity protects externally destroyed icons without a menu redraw', async () => {
  const f = fixture(), removed = f.attach()
  removed.icon.destroy()
  await f.complete(0)
  assert.equal(removed.glyph.active, true)
  assert.equal(removed.clip.active, false)
  const live = f.attach()
  assert.equal(live.clip.active, true, 'a valid replacement reuses the completed resource')
  assert.equal(f.calls.length, 1)
  f.loader.destroy()
})

test('destroy during outstanding loads ignores late completions and never takes asset ownership', async () => {
  const f = fixture(), old = f.attach()
  old.icon.destroy()
  f.loader.destroy()
  f.loader.destroy()
  const late = await f.complete(0)
  assert.equal(late.refs, 0)
  assert.equal(late.adds, 0)
  assert.equal(late.releases, 0)
  assert.equal(f.textures.length, 0)
  assert.equal(f.frames.length, 0)
  assert.equal(old.clip.active, false)
  f.attach(ids[1])
  assert.equal(f.calls.length, 1, 'disposed loaders cannot start another load')
})

test('missing and malformed images retain the glyph and are negatively cached for this menu', async () => {
  const f = fixture(), missing = f.attach(ids[0]), malformed = f.attach(ids[1])
  const a = await f.complete(0, Error('missing resource'))
  const b = await f.complete(1, null, new f.ImageAsset(512, 256))
  for (let i = 0; i < 8; i++) {
    f.loader.clearBindings()
    for (const id of ids.slice(0, 2)) {
      const view = f.attach(id)
      assert.equal(view.glyph.active, true)
      assert.equal(view.clip.active, false)
    }
  }
  assert.equal(missing.glyph.active, true)
  assert.equal(malformed.glyph.active, true)
  assert.equal(f.calls.length, 2)
  assert.equal(a.adds + b.adds, 0)
  assert.equal(f.textures.length, 0)
  assert.equal(f.frames.length, 0)
  f.loader.destroy()
})

test('synchronous resource callbacks and setup failures balance ownership without retry loops', () => {
  const success = fixture({ synchronous: true })
  assert.equal(success.attach().clip.active, true)
  assert.equal(success.attach().clip.active, true)
  assert.equal(success.calls.length, 1)
  success.loader.destroy()
  success.loader.destroy()
  assert.equal(success.images[0].releases, 1)
  for (const options of [{ throwLoad: true }, { synchronous: true, throwTexture: true }]) {
    const f = fixture(options), first = f.attach()
    assert.equal(first.glyph.active, true)
    assert.equal(f.attach().clip.active, false)
    assert.equal(f.calls.length, 1)
    f.loader.destroy()
    assert.ok(f.images.every(image => image.refs === 0 && image.adds === image.releases))
    assert.ok(f.textures.every(texture => texture.destroyed === 1))
  }
})

test('unknown IDs never request paths or create artwork nodes', () => {
  const f = fixture()
  for (const id of ['unknown', '../sj_yujian', '__proto__']) assert.equal(f.attach(id).clip, undefined)
  assert.equal(f.calls.length, 0)
  f.loader.destroy()
})

test('new icons load their artwork and retain glyph on failure', async () => {
  for (const id of ['sj_cross', 'sj_spirit', 'sj_flight']) {
    const f = fixture()
    const view = f.attach(id)
    assert.equal(f.calls.length, 1)
    assert.equal(f.calls[0].path, `tower-skill-icons/${id}`)
    await f.complete(0, Error('missing image'), null)
    assert.equal(view.glyph.active, true)
    assert.equal(view.clip.active, false)
    f.loader.destroy()
  }
})
