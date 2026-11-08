import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { runInNewContext } from 'node:vm'
import { skillForm } from '../js/xianxia/TowerSkillForms.js'
import { TowerRun } from '../js/xianxia/TowerRun.js'

const camera = { x: 3, y: 7 }
const plain = value => JSON.parse(JSON.stringify(value))
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`)
function state(rank = 1, time = .6) {
  const form = skillForm('sj_formation', rank), startedAt = .5
  return { time, phase: 'playing', player: { x: -90, y: 20, hp: 100 }, enemies: [], effects: [],
    zones: [{ id: 'zone-1', kind: 'formation', formId: 'sj_formation', source: 'sj_formation',
      shape: 'circle', hostile: false, x: 100, y: 200, radius: form.radius, startedAt,
      pulseIndex: 0, pulseCount: form.hits, ticks: form.hits, interval: form.interval,
      nextAt: startedAt + .5 }] }
}
function pulse(s, index, time = s.time, targets = []) {
  const z = s.zones[0]
  z.pulseIndex = index; z.ticks = z.pulseCount - index
  z.nextAt = z.startedAt + .5 + index * z.interval
  const effect = { ...z, id: `pulse-${index}`, startedAt: time, targetIds: targets }
  s.effects = [effect]
  return effect
}
function fixture(options = {}) {
  const requests = [], warnings = [], textures = [], frames = [], images = []
  class Node {
    constructor(name) { Object.assign(this, { name, children: [], isValid: true, active: true, layer: 1 }) }
    addChild(node) { this.children.push(node); node.parent = this }
    addComponent(Type) { return new Type() }
    setPosition(x, y) { this.x = x; this.y = y }
    removeFromParent() {
      if (this.parent) this.parent.children = this.parent.children.filter(node => node !== this)
      this.parent = null
    }
    destroy() { this.isValid = false }
  }
  class UITransform {
    setContentSize(width, height) { Object.assign(this, { width, height }) }
    setAnchorPoint(anchorX, anchorY) { Object.assign(this, { anchorX, anchorY }) }
  }
  class Sprite { static SizeMode = { CUSTOM: 1 } }
  class ImageAsset {
    constructor(data = {}) { this.data = data; this.width = data.width; this.height = data.height; this.refs = 0; images.push(this) }
    addRef() { this.refs++ }
    decRef() { this.refs-- }
    destroy() { this.dead = true; this.destroyCalls = (this.destroyCalls || 0) + 1 }
  }
  class Texture2D {
    static Filter = { LINEAR: 1 }
    constructor() { this.uploads = 0; textures.push(this) }
    setFilters() {}
    uploadData(canvas) { if (options.uploadFailure) throw Error('GPU upload failed'); this.uploads++; this.lastCanvas = canvas }
    destroy() { this.dead = true; this.destroyCalls = (this.destroyCalls || 0) + 1 }
  }
  class SpriteFrame {
    constructor() { frames.push(this) }
    destroy() { this.dead = true; this.destroyCalls = (this.destroyCalls || 0) + 1 }
  }
  function canvas() {
    const strokes = []
    const context = { strokes, createRadialGradient: () => ({ addColorStop() {} }) }
    for (const method of ['setTransform', 'clearRect', 'translate', 'scale', 'beginPath', 'arc',
      'stroke', 'fillRect', 'save', 'rotate', 'drawImage', 'restore', 'moveTo', 'lineTo',
      'bezierCurveTo', 'fill', 'clip']) context[method] = () => {}
    context.stroke = () => strokes.push(context.strokeStyle)
    return { getContext: () => options.missingContext ? null : context }
  }
  const context = {
    Node, UITransform, Sprite, ImageAsset, Texture2D, SpriteFrame,
    isValid: node => !!node?.isValid,
    console: { warn: (...args) => warnings.push(args) },
    document: { createElement: canvas },
    resources: { load: (path, type, callback) => requests.push({ path, callback }) },
  }
  const source = ['LiangyiPainter', 'LiangyiFormationArt'].map(name =>
    readFileSync(new URL(`../cocos-pilot/assets/scripts/${name}.ts`, import.meta.url), 'utf8')
      .replace(/^import .*$/gm, '').replace(/\bexport /g, '')).join('\n')
  runInNewContext(stripTypeScriptTypes(source, { mode: 'transform' }) +
    '\nglobalThis.Art=LiangyiFormationArt', context)
  const art = new context.Art(), ground = new Node('ground'), air = new Node('air')
  return { art, ground, air, Node, requests, warnings, textures, frames, images,
    sync: (s, view = camera) => art.syncTower(ground, air, s, view),
    load(index, error = null, size = index === 0 ? [512, 512] : [544, 128]) {
      const image = new ImageAsset({ width: size[0], height: size[1] })
      requests[index].callback(error, error ? null : image)
      return image
    } }
}
function ready(options) {
  const f = fixture(options)
  f.art.preload()
  f.resources = f.requests.map((_, i) => f.load(i))
  return f
}

test('slow base rotation carries both eyes while rain and damage radius stay fixed', () => {
  const f = ready(), s = state(10)
  const positions = []
  for (const age of [0, 2.5, 5]) {
    s.time = s.zones[0].startedAt + age
    f.sync(s)
    const view = f.art.slots[0].painter.last
    close(view.baseRotation, age * Math.PI * 2 / 20)
    view.eyes.forEach((eye, i) => {
      const y = i ? .354 : -.48
      close(eye.x, -Math.sin(view.baseRotation) * y * view.radius)
      close(eye.y, -Math.cos(view.baseRotation) * y * view.radius)
      close(Math.hypot(eye.x, eye.y), Math.abs(y) * view.radius)
    })
    positions.push(plain(view.eyes))
    close(view.logicalCircleRadiusPx, 512 / 2.24)
  }
  assert.notDeepEqual(positions[0], positions[1])
})

test('random monochrome rain keeps each sword tone through approach, impact and redraw', () => {
  const f = ready(), s = state(10), z = s.zones[0]
  s.time = z.startedAt + .45
  f.sync(s)
  const before = plain(f.art.slots[0].painter.last.swordRain.tones)
  assert.equal(before.length, 5)
  assert.ok(before.every(tone => tone === 'black' || tone === 'white'))
  s.time = z.startedAt + .5
  pulse(s, 1, s.time)
  f.sync(s)
  assert.deepEqual(plain(f.art.slots[0].painter.last.swordRain.tones), before)
  s.time += .03
  f.sync(s)
  assert.deepEqual(plain(f.art.slots[0].painter.last.swordRain.tones), before)
  const painter = f.art.slots[0].painter
  const sequence = []
  for (let n = 1; n <= 7; n++)
    for (let i = 0; i < 5; i++) sequence.push(painter.rainTone(z.id, n, i))
  assert.equal(new Set(sequence).size, 2)
  assert.notDeepEqual(sequence.slice(0, 5), sequence.slice(5, 10))
})

test('ordinary rain staggers without changing tones or landings and final swords hold then fall together', () => {
  const f=ready(),s=state(10),z=s.zones[0]
  s.time=z.startedAt+.45;f.sync(s)
  const before=plain(f.art.slots[0].painter.last.swordRain)
  s.time=z.startedAt+.5;pulse(s,1,s.time);f.sync(s)
  let rain=f.art.slots[0].painter.last.swordRain
  assert.equal(rain.points.length,5)
  assert.equal(new Set(rain.landingOffsets).size,5)
  close(Math.min(...rain.landingOffsets),-.08)
  close(Math.max(...rain.landingOffsets),.08)
  assert.ok(rain.swords.some(x=>x.phase==='falling'))
  assert.ok(rain.swords.some(x=>x.phase==='impact'))
  assert.deepEqual(plain(rain.points),before.points)
  assert.deepEqual(plain(rain.tones),before.tones)
  s.time=z.startedAt+7.74;z.pulseIndex=z.pulseCount-1;z.nextAt=z.startedAt+8;s.effects=[];f.sync(s)
  rain=f.art.slots[0].painter.last.swordRain
  assert.equal(rain.swords.length,7)
  assert.ok(rain.swords.every(x=>x.phase==='hover'&&x.progress===0))
  s.time=z.startedAt+7.92;f.sync(s)
  rain=f.art.slots[0].painter.last.swordRain
  assert.ok(rain.swords.every(x=>x.phase==='falling'))
  assert.equal(new Set(rain.swords.map(x=>x.progress)).size,1)
  s.time=z.startedAt+8;pulse(s,z.pulseCount,s.time);f.sync(s)
  rain=f.art.slots[0].painter.last.swordRain
  assert.ok(rain.swords.every(x=>x.phase==='impact'&&x.landingOffset===0))
})

test('black-white formation uses neutral ground lines throughout actual pulse phases', () => {
  const f = ready(), s = state(10)
  for (const age of [.31, .5, .55, 1.25, 3, 5]) {
    s.time = s.zones[0].startedAt + age
    if (age >= .5) pulse(s, age >= 5 ? 7 : 2, s.time)
    f.sync(s)
    const slot = f.art.slots[0]
    const strokes = slot.painter.g.strokes
    assert.ok(strokes.length > 0)
    for (const stroke of strokes) {
      const match = /^rgba\((\d+),(\d+),(\d+),/.exec(stroke)
      assert.ok(match && match[1] === match[2] && match[2] === match[3], stroke)
    }
  }
})

test('unloaded, failed and invalid resources keep the procedural fallback and release retained references', () => {
  for (const failure of ['404', 'dimensions']) {
    const f = fixture(), s = state()
    assert.equal(f.sync(s).size, 0)
    assert.equal(f.requests.length, 3)
    const first = f.load(0)
    assert.equal(first.refs, 1)
    const second = failure === '404' ? f.load(1, Error('404')) : f.load(1, null, [128, 24])
    const late = f.load(2)
    assert.equal(f.art.ready, false)
    assert.equal(f.sync(s).size, 0)
    assert.equal(f.requests.length, 3, 'failure does not retry on every frame')
    assert.equal(f.art.slots.length, 0)
    assert.deepEqual([first.refs, second.refs, late.refs], [0, 0, 0])
    assert.equal(f.warnings.length, 1)
  }
  const f = fixture()
  f.art.preload(); const first = f.load(0)
  f.art.destroy()
  const late = [f.load(1), f.load(2)]
  assert.equal(first.refs, 0)
  assert.ok(late.every(image => image.refs === 0))
  assert.equal(f.art.ready, false)
  assert.equal(f.sync(state()).size, 0)
})

test('canvas and GPU failures release both dynamic surfaces and preserve fallback', () => {
  for (const options of [{ missingContext: true }, { uploadFailure: true }]) {
    const f = ready(options)
    assert.equal(f.sync(state()).size, 0)
    assert.equal(f.art.ready, false)
    assert.ok(f.resources.every(image => image.refs === 0))
    assert.ok(f.textures.every(texture => texture.dead))
    assert.ok(f.frames.every(frame => frame.dead))
    assert.equal(f.warnings.length, 1)
  }
})

test('foreign skills, hostile fields and four-eye evolutions never suppress their original drawing', () => {
  for (const change of [{ source: 'evo_sixiang', formId: 'evo_sixiang', shape: 'diamond' },
    { hostile: true }, { kind: 'shadow' }, { formId: 'sj_shadow' }, { source: 'sj_shadow' }]) {
    const f = ready(), s = state()
    Object.assign(s.zones[0], change)
    assert.equal(f.sync(s).size, 0)
    assert.equal(f.art.slots.length, 0)
  }
})

test('shared radius scales both anchored layers while movement preserves the fixed world center', () => {
  for (const [rank, radius] of [[1, 132], [3, 144], [6, 168], [10, 192]]) {
    const f = ready(), s = state(rank), before = JSON.stringify(s)
    assert.deepEqual(Array.from(f.sync(s)), ['zone-1'])
    assert.equal(JSON.stringify(s), before, 'drawing cannot change combat state')
    const slot = f.art.slots[0]
    close(slot.ground.ui.width, 2.24 * radius); close(slot.ground.ui.height, 2.24 * radius)
    close(slot.air.ui.width, 3 * radius); close(slot.air.ui.height, 4 * radius)
    assert.equal(slot.ground.ui.anchorY, .5); assert.equal(slot.air.ui.anchorY, .3125)
    assert.equal(slot.ground.ui.anchorX, .5); assert.equal(slot.air.ui.anchorX, .5)
    assert.equal(slot.painter.last.radius, radius)
    assert.ok(f.frames.every(frame => frame.packable === false))
    s.player.x += 200; s.player.y -= 100
    f.sync(s, { x: 20, y: 30 })
    for (const actor of [slot.ground, slot.air]) {
      close(actor.node.x, 80); close(actor.node.y, 170)
    }
    close(slot.track.x, 100); close(slot.track.y, 200)
  }
})

test('30Hz updates skip duplicate and camera-only frames but refresh a new pulse immediately', () => {
  const f = ready(), s = state(10, .9)
  s.zones[0].startedAt = 0
  pulse(s, 1, .5)
  f.sync(s)
  const uploads = () => f.textures.reduce((n, texture) => n + texture.uploads, 0)
  assert.equal(uploads(), 2)
  f.sync(s); s.time = .91; f.sync(s, { x: 50, y: 60 })
  assert.equal(uploads(), 2, 'same 30Hz bucket reuses pixels')
  s.time = 55 / 60
  pulse(s, 2)
  f.sync(s)
  assert.equal(uploads(), 4, 'pulse two is visible inside the same 30Hz bucket')
  assert.equal(f.art.slots[0].painter.last.pulseIndex, 2)
  close(f.art.slots[0].painter.last.pulseAge, 0)
  s.time = 56 / 60; f.sync(s)
  assert.equal(uploads(), 6)
})

test('pause scene reconstruction keeps textures, track and pixels at the same simulation instant', () => {
  const f = ready(), s = state(10, 1)
  pulse(s, 1)
  f.sync(s)
  const slot = f.art.slots[0], track = slot.track, surfaces = slot.surfaces
  const old = [slot.ground.node, slot.air.node], pixels = plain(slot.painter.last), uploads = f.art.uploads
  f.art.clearBindings()
  assert.ok(old.every(node => !node.isValid && !node.parent))
  const ground = new f.Node('rebuilt ground'), air = new f.Node('rebuilt air')
  f.art.syncTower(ground, air, s, camera)
  assert.equal(slot.track, track); assert.equal(slot.surfaces, surfaces)
  assert.equal(slot.ground.node.parent, ground); assert.equal(slot.air.node.parent, air)
  assert.deepEqual(plain(slot.painter.last), pixels)
  assert.equal(f.art.uploads, uploads)
})

test('actual positive hit metadata survives target movement and death without highlighting unrelated damage', () => {
  const f = ready(), s = state(1, 1), z = s.zones[0]
  pulse(s, 1, 1, ['moved', 'dead'])
  s.enemies = [{ id: 'moved', x: 900, y: 800, radius: 99 }]
  const hit = { kind: 'hit', source: 'formation', damage: 10, startedAt: 1, radius: 12 }
  s.effects.push(
    { ...hit, id: 'hit-moved', targetId: 'moved', targetRadius: 24, x: z.x + 5, y: z.y + 7 },
    { ...hit, id: 'hit-dead', targetId: 'dead', targetRadius: 16, x: z.x + z.radius + 15, y: z.y },
    { ...hit, id: 'unrelated', targetId: 'other', targetRadius: 20, x: z.x, y: z.y },
    { ...hit, id: 'zero', targetId: 'moved', targetRadius: 24, damage: 0, x: z.x, y: z.y },
    { ...hit, id: 'negative', targetId: 'moved', targetRadius: 24, damage: -1, x: z.x, y: z.y },
    { ...hit, id: 'foreign', targetId: 'moved', targetRadius: 24, source: 'projectile', x: z.x, y: z.y },
    { ...hit, id: 'old', targetId: 'moved', targetRadius: 24, startedAt: .5, x: z.x, y: z.y },
  )
  const before = JSON.stringify(s)
  f.sync(s)
  const points = plain(f.art.slots[0].painter.last.actualHitPoints)
  assert.deepEqual(points.map(({ x, y, radius }) => ({ x, y, radius })), [
    { x: 5, y: 7, radius: 24 }, { x: 147, y: 0, radius: 16 },
  ])
  assert.equal(JSON.stringify(s), before)
})

test('a real first-pulse wave clear cancels the old track and reuses its textures; floor changes also clear it', () => {
  const f = ready(), run = new TowerRun({ attemptId: 1, floor: 1, seed: 123, xp: 0, hp: 100,
    loadout: { growthVersion: 1, active: { sj_formation: 1 }, passive: {},
      evolutions: [], evolutionLevels: {}, tutorialWaves: 0,
      weaponId: 'eq_sword_suwen', weaponQuality: 1, weaponRefine: 0 } })
  const s = run.state, step = () => run.advance(1 / 60)
  // Resolve nine authored deaths through the real ledger, leaving the final
  // enemy for the formation. No fabricated wave counters or zone removals.
  s.cooldowns.sj_formation = 99999
  for (let i = 0; i < 1200 && s.waveKilled < s.wavePlanned - 1; i++) {
    const remove = s.wavePlanned - 1 - s.waveKilled
    for (const enemy of s.enemies) enemy.ai.graceUntil = 99999
    for (const enemy of s.enemies.slice(0, remove)) {
      run._damageEnemy({ target: enemy.id, damage: enemy.hp, direct: false, scaled: true, source: 'fixture' })
    }
    step()
  }
  for (let i = 0; i < 600 && (s.pending.length || s.reserved.length || !s.enemies.length); i++) step()
  assert.equal(s.wave, 1); assert.equal(s.waveKilled, s.wavePlanned - 1)
  assert.equal(s.enemies.length, 1)
  const finalEnemy = s.enemies[0]
  finalEnemy.hp = 1; finalEnemy.ai.graceUntil = 99999
  finalEnemy.x = s.player.x + 100; finalEnemy.y = s.player.y
  s.cooldowns.sj_formation = 0
  for (let i = 0; i < 60 && !s.zones.length; i++) step()
  assert.equal(s.zones.length, 1)
  f.sync(s)
  const slot = f.art.slots[0], surfaces = slot.surfaces, startedAt = slot.track.startedAt
  assert.equal(slot.track.pulseIndex, 0)
  for (let i = 0; i < 90 && s.wave === 1; i++) { step(); f.sync(s) }
  assert.equal(run.state, s, 'TowerRun keeps the same state object when advancing waves')
  assert.equal(s.wave, 2)
  assert.deepEqual(s.clearedWaves, [1])
  assert.equal(s.zones.length, 0, 'the actual wave transition removes the live zone')
  assert.ok(s.effects.some(e => e.kind === 'hit' && e.source === 'formation'
    && e.targetId === finalEnemy.id && e.damage > 0))
  assert.ok(s.time - startedAt < 1, 'cancellation happens before natural visual expiry')
  assert.equal(slot.track, null)
  assert.equal(slot.ground.node.active, false); assert.equal(slot.air.node.active, false)
  assert.equal(f.art.drawn.size, 0)
  for (let i = 0; i < 600 && !s.enemies.length; i++) step()
  assert.ok(s.enemies.length)
  s.enemies[0].x = s.player.x + 100; s.enemies[0].y = s.player.y
  for (const enemy of s.enemies) enemy.ai.graceUntil = 99999
  s.cooldowns.sj_formation = 0
  for (let i = 0; i < 60 && !s.zones.length; i++) step()
  assert.ok(s.zones.length)
  f.sync(s)
  assert.equal(f.art.slots.length, 1)
  assert.equal(slot.surfaces, surfaces); assert.equal(f.textures.length, 2)
  assert.ok(slot.track)
  // Floor transitions are a separate reset key, even if the caller reuses the
  // same state object and wave index.
  s.floor++; s.zones = []
  assert.equal(f.sync(s).size, 0)
  assert.equal(slot.track, null)
  assert.equal(slot.ground.node.active, false); assert.equal(slot.air.node.active, false)
  assert.equal(slot.surfaces, surfaces); assert.equal(f.textures.length, 2)
})

test('the 0.68s visual tail expires and its surfaces are reused for the next cast', () => {
  const f = ready(), s = state(10, 8.5)
  pulse(s, s.zones[0].pulseCount)
  f.sync(s)
  const slot = f.art.slots[0], surfaces = slot.surfaces
  s.zones = []; s.effects = []; s.time = 9.179
  assert.equal(f.sync(s).has('zone-1'), true)
  assert.equal(slot.painter.last.visible, true)
  s.time = 9.18
  assert.equal(f.sync(s).size, 0)
  assert.equal(slot.track, null)
  assert.equal(slot.ground.node.active, false); assert.equal(slot.air.node.active, false)
  const next = state(1, 9.2).zones[0]
  Object.assign(next, { id: 'zone-2', startedAt: 9.2, nextAt: 9.7 })
  s.zones = [next]; s.time = 9.2
  assert.equal(f.sync(s).has('zone-2'), true)
  assert.equal(f.art.slots.length, 1); assert.equal(slot.surfaces, surfaces)
  assert.equal(f.textures.length, 2)
})

test('new runs and death clear active tracks; destruction releases owned assets exactly once', () => {
  const f = ready(), s = state()
  f.sync(s)
  const first = f.art.slots[0]
  const other = state()
  other.zones = []
  assert.equal(f.sync(other).size, 0)
  assert.equal(first.track, null)
  f.sync(s); s.player.hp = 0
  assert.equal(f.sync(s).size, 0)
  assert.equal(first.track, null)
  s.player.hp = 100; f.sync(s)
  const nodes = [first.ground.node, first.air.node]
  f.art.destroy(); f.art.destroy()
  assert.equal(f.art.slots.length, 0); assert.equal(f.art.ready, false)
  assert.ok(nodes.every(node => !node.isValid && !node.parent))
  assert.ok(f.resources.every(image => image.refs === 0))
  assert.ok(f.textures.every(texture => texture.dead))
  assert.ok(f.frames.every(frame => frame.dead))
  assert.ok(f.images.filter(image => !f.resources.includes(image)).every(image => image.dead))
  for (const asset of [...f.textures, ...f.frames, ...f.images.filter(image => !f.resources.includes(image))]) {
    assert.equal(asset.destroyCalls, 1)
  }
})

 test('eight-second formation keeps art through its final real attack', () => {
 const f=ready(),s=state(10);s.time=8.3;f.sync(s);
 assert.ok(f.art.slots[0]?.painter.last?.fade>0);
 s.time=8.5;pulse(s,s.zones[0].pulseCount,8.5);f.sync(s);
 assert.ok(f.art.slots[0]?.painter.last?.fade>0);
 });
