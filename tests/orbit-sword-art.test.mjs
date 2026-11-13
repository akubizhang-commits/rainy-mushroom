import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { runInNewContext } from 'node:vm'
import { skillForm, orbitSwordPose, orbitMotionTime } from '../js/xianxia/TowerSkillForms.js'

const camera = { x: 3, y: 7 }
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`)
function state(level = 1, time = 1) {
  return { time, player: { x: 100, y: 200, hp: 100 },
    loadout: { active: { sj_wanjian: level }, evolutions: [], evolutionLevels: {} } }
}
function fixture() {
  const requests = [], warnings = []
  class Node {
    constructor(name) { this.name = name; this.children = []; this.isValid = true; this.active = true; this.layer = 1 }
    addChild(n) { this.children.push(n); n.parent = this }
    addComponent(C) { return new C() }
    setPosition(x, y) { this.x = x; this.y = y }
    removeFromParent() { if (this.parent) this.parent.children = this.parent.children.filter(n => n !== this); this.parent = null }
    destroy() { this.isValid = false }
  }
  class UITransform {
    setContentSize(width, height) { Object.assign(this, { width, height }) }
    setAnchorPoint(anchorX, anchorY) { Object.assign(this, { anchorX, anchorY }) }
  }
  class Sprite { static SizeMode = { CUSTOM: 1 } }
  class Texture2D { static Filter = { LINEAR: 1 }; setFilters() {} destroy() { this.dead = true } }
  class SpriteFrame { destroy() { this.dead = true } }
  class Color { constructor(r, g, b, a) { Object.assign(this, { r, g, b, a }) } }
  class Rect {constructor(x,y,width,height){Object.assign(this,{x,y,width,height})}}
  class Graphics {
    calls = []; clears = 0
    clear() { this.calls = []; this.clears++ }
    moveTo(x, y) { this.calls.push(['move', x, y]) }
    lineTo(x, y) { this.calls.push(['line', x, y]) }
    stroke() { this.calls.push(['stroke', this.strokeColor.a, this.lineWidth]) }
  }
  const context = { Node, UITransform, Sprite, Texture2D, SpriteFrame, Color, Rect, Graphics,
    ImageAsset: class {}, skillForm, orbitSwordPose, orbitMotionTime, setTowerDepth: (n, y) => { n.towerGroundY = y },
    isValid: n => !!n?.isValid, console: { warn: message => warnings.push(message) },
    resources: { load: (path, type, callback) => requests.push({ path, callback }) } }
  const source = readFileSync(new URL('../cocos-pilot/assets/scripts/OrbitSwordArt.ts', import.meta.url), 'utf8')
    .replace(/^import .*$/gm, '').replace(/\bexport /g, '')
  runInNewContext(stripTypeScriptTypes(source, { mode: 'transform' }) + '\nglobalThis.Art=OrbitSwordArt', context)
  const art = new context.Art(), parent = new Node('actors')
  return { art, parent, Node, requests, warnings, load(error = null, size = [640, 112]) {
    const image = { width: size[0], height: size[1], refs: 0,
      addRef() { this.refs++ }, decRef() { this.refs-- } }
    requests.at(-1).callback(error, error ? null : image)
    return image
  } }
}
function ready() { const f = fixture(); f.art.preload(); f.image = f.load(); return f }
const active = art => art.actors.filter(a => a.node.active)

test('orbit sprites hide in cooldown and reappear for the next active window', () => {
  const { art, parent } = ready(), s = state()
  s.loadout.growthVersion = 1
  s.orbitUntil = 4
  art.syncTower(parent, s, camera)
  // 2026-11-13 用户决定：各级固定 4 把飞剑。
  assert.equal(active(art).length, 4)
  s.time = 4
  art.syncTower(parent, s, camera)
  assert.equal(active(art).length, 0)
  s.time = 6; s.orbitUntil = 10
  art.syncTower(parent, s, camera)
  assert.equal(active(art).length, 4)
})

test('approved sword span tracks combat at every count tier, reusing one base pool', () => {
  const { art, parent, requests } = ready(), s = state()
  // 2026-11-09：周天剑阵改用修长冷色剑体 v2；画面剑长为判定剑长的 1.25 倍并保持贴图比例。
  assert.equal(requests[0].path, 'tower-skill-fx/orbit-sword-v2')
  let pool
  for (const [level, count] of [[1, 4], [3, 4], [6, 4], [10, 4], [1, 4]]) {
    s.loadout.active.sj_wanjian = level
    const before = JSON.stringify(s), f = skillForm('sj_wanjian', level)
    assert.equal(art.syncTower(parent, s, camera), true)
    assert.equal(JSON.stringify(s), before, 'presentation cannot mutate combat')
    assert.equal(active(art).length, count)
    assert.equal(art.actors.length, 12)
    if (pool) assert.deepEqual(art.actors.map(a => a.node), pool)
    pool = art.actors.map(a => a.node)
    for (const [i, a] of active(art).entries()) {
      const p = orbitSwordPose(f, s.time, i)
      close(a.node.x, s.player.x + p.x - camera.x)
      close(a.node.y, s.player.y + 57 + p.y - camera.y)
      close(a.node.towerGroundY, s.player.y + p.depthY)
      close(a.node.angle, p.angle * 180 / Math.PI)
      close(a.ui.width * 628 / 640, p.length * .9)
      close(a.ui.height, a.ui.width * 112 / 640)
      assert.equal(a.ui.anchorX, .5); assert.equal(a.ui.anchorY, .5)
    }
  }
})

test('evolution grows to twelve pooled swords and downgrading hides surplus actors', () => {
  const { art, parent } = ready(), s = state(10)
  art.syncTower(parent, s, camera)
  const first = art.actors[0]
  s.loadout.evolutions = ['evo_wuwo']; s.loadout.evolutionLevels.evo_wuwo = 2
  art.syncTower(parent, s, camera)
  // 2026-11-13：退役的周天剑域仍是 12 把；卸下进化后回到基础剑阵固定的 4 把，复用池仍为 12。
  assert.equal(active(art).length, 12); assert.equal(art.actors.length, 12)
  assert.equal(art.actors[0], first)
  s.loadout.evolutions = []; s.loadout.evolutionLevels = {}
  art.syncTower(parent, s, camera)
  assert.equal(active(art).length, 4); assert.equal(art.actors.length, 12)
})

test('wuwo uses the supplied waist anchor, shared tangent span and unlifted depth',()=>{
 const {art,parent}=ready(),s=state(10,2)
 s.loadout.evolutions=['evo_wuwo'];s.loadout.evolutionLevels={evo_wuwo:2}
 const waist={x:104-camera.x,y:255-camera.y}
 art.syncTower(parent,s,camera,waist)
 const form=skillForm('evo_wuwo',2,10)
 for(const [i,a] of active(art).entries()){
  const p=orbitSwordPose(form,s.time,i)
  close(a.node.x,waist.x+p.x);close(a.node.y,waist.y+p.y)
  close(a.node.towerGroundY,s.player.y+p.depthY)
  close(a.ui.width*628/640,p.length*.9)
 }
 const ids=active(art).map(a=>a.node)
 s.time+=1/60
 art.syncTower(parent,s,camera,waist)
 assert.deepEqual(active(art).map(a=>a.node),ids)
 const calls=JSON.stringify(active(art).map(a=>a.tail.calls))
 art.syncTower(parent,s,camera,waist)
 assert.equal(JSON.stringify(active(art).map(a=>a.tail.calls)),calls)
})

test('wuwo ground ring stays optional, follows feet rather than waist, and releases its texture',()=>{
 const f=ready(),s=state(10,2)
 s.loadout.evolutions=['evo_wuwo'];s.loadout.evolutionLevels={evo_wuwo:2}
 f.art.syncTower(f.parent,s,camera)
 assert.equal(f.requests.at(-1).path,'tower-skill-fx/jianxin-aura-v1')
 const image=f.load(null,[2048,1152]);f.art.syncTower(f.parent,s,camera,{x:100,y:400})
 assert.equal(image.refs,1);assert.equal(f.art.flowNode.active,true)
 assert.equal(f.art.flowSprite.trim,true,'atlas uses its cell rectangle, not the full-sheet size')
 close(f.art.flowNode.y,s.player.y-camera.y)
 assert.equal(f.art.flowFrames.length,16)
 const frame=f.art.flowFrame,texture=f.art.flowTexture
 // 2026-11-13 用户决定：基础周天剑阵移除脚下光环；卸下进阶后地环隐藏。
 s.loadout.evolutions=[];f.art.syncTower(f.parent,s,camera)
 assert.equal(f.art.flowNode.active,false)
 f.art.destroy();assert.equal(image.refs,0);assert.ok(frame.dead&&texture.dead)
})

test('wuwo keeps variable curved trails without loading or creating blade light',()=>{
 const f=ready(),s=state(10,2)
 s.loadout.evolutions=['evo_wuwo'];s.loadout.evolutionLevels={evo_wuwo:2}
 f.art.syncTower(f.parent,s,camera)
 assert.ok(!f.requests.some(r=>r.path==='tower-skill-fx/wuwo-ice-blade-v1'))
 assert.ok(active(f.art).every(a=>!a.auraNode))
 const widths=new Set(active(f.art).map(a=>a.lastTrail[0].maxWidth.toFixed(3)))
 assert.ok(widths.size>4,'different swords respond to their own speeds')
 const before=JSON.stringify(active(f.art).map(a=>a.lastTrail))
 f.art.syncTower(f.parent,s,camera)
 assert.equal(JSON.stringify(active(f.art).map(a=>a.lastTrail)),before)
 s.loadout.evolutions=[];f.art.syncTower(f.parent,s,camera)
 assert.ok(active(f.art).every(a=>!a.auraNode))
 f.art.destroy()
})

test('wuwo wake begins at the rear of the sword and remains visible along a longer route',()=>{
 const f=ready(),s=state(10,0)
 s.loadout.evolutions=['evo_wuwo'];s.loadout.evolutionLevels={evo_wuwo:2}
 for(let i=0;i<=120;i++){s.time=i/60;f.art.syncTower(f.parent,s,camera)}
 const form=skillForm('evo_wuwo',2,10)
 for(const [i,a] of active(f.art).entries()){
  const pose=orbitSwordPose(form,s.time,i)
  for(const trail of a.lastTrail){
   const end=trail.points.at(-1)
   close(end.worldX,s.player.x+pose.baseX)
   close(end.worldY,s.player.y+57+pose.baseY)
   assert.ok(s.time-trail.points[0].time>=.64)
  }
  assert.ok(a.lastTrail[1].maxAlpha>=195,'bright core survives rear depth dimming')
 }
})

test('movement uses historical world positions while pause reuses geometry and buffers', () => {
  const { art, parent } = ready(), s = state(10, 0)
  art.syncTower(parent, s, camera)
  const a = art.actors[0], points = a.lastTrail[0].points, buffer = art.historyTime
  for (let i = 1; i <= 120; i++) {
    s.time = i / 60; s.player.x += 2
    art.syncTower(parent, s, camera)
  }
  assert.equal(art.historyTime, buffer); assert.equal(art.historyCount, 64)
  assert.equal(a.lastTrail[0].points, points)
  // 2026-11-09：周天剑阵改用剑域形态，尾迹从剑柄沿变速游剑的实际路径发出（同剑域）。
  const first = points[0], pose = orbitSwordPose(art.form, first.time, 0), offset = -pose.length / 2
  assert.ok(s.time - first.time >= .64)
  close(first.worldX, 100 + 120 * first.time + pose.x + Math.cos(pose.angle) * offset)
  close(first.worldY, s.player.y + 57 + pose.y + Math.sin(pose.angle) * offset)
  const calls = JSON.stringify(a.tail.calls), clears = a.tail.clears, history = art.historyCount
  art.syncTower(parent, s, { x: 20, y: 30 })
  assert.equal(JSON.stringify(a.tail.calls), calls, 'camera-only redraw does not replay the trail')
  assert.equal(a.tail.clears, clears); assert.equal(art.historyCount, history)
  close(a.node.x, s.player.x + orbitSwordPose(art.form, s.time, 0).x - 20)
})

test('pausing through a scene rebuild preserves the moving trail at the same simulation instant', () => {
  const f = ready(), s = state(10, 0)
  for (let i = 0; i <= 60; i++) {
    s.time = i / 60; s.player.x = 100 + i * 2
    f.art.syncTower(f.parent, s, camera)
  }
  const before = JSON.stringify(f.art.actors[0].lastTrail)
  const count = f.art.historyCount, old = f.art.actors[0].node
  f.art.clearBindings()
  assert.equal(old.isValid, false)
  f.art.syncTower(new f.Node('paused battle rebuilt'), s, camera)
  assert.equal(JSON.stringify(f.art.actors[0].lastTrail), before,
    'rebuilding the pause UI cannot replace past movement with the current player position')
  assert.equal(f.art.historyCount, count, 'the same instant is not added twice')
  f.art.reset()
  assert.equal(f.art.historyCount, 0)
})

test('unloaded, failed, invalid-sized and late resources keep the procedural fallback available', () => {
  for (const failure of ['404', 'dimensions']) {
    const f = fixture(), s = state()
    assert.equal(f.art.syncTower(f.parent, s, camera), false)
    const image = failure === '404' ? f.load(new Error('404')) : f.load(null, [128, 24])
    assert.equal(f.art.syncTower(f.parent, s, camera), false)
    assert.equal(f.art.ready, false); assert.equal(f.art.failed, true)
    assert.equal(image.refs, 0); assert.equal(f.art.actors.length, 0)
    assert.equal(f.requests.length, 1, 'no repeated failed request every frame')
  }
  const f = fixture()
  f.art.preload(); f.art.destroy()
  const image = f.load()
  assert.equal(image.refs, 0); assert.equal(f.art.ready, false)
  assert.equal(f.art.syncTower(f.parent, state(), camera), false)
})

test('skill removal, death, re-entry and destruction release bindings without stale trails', () => {
  const f = ready(), s = state()
  f.art.syncTower(f.parent, s, camera)
  s.loadout.active = {}
  assert.equal(f.art.syncTower(f.parent, s, camera), false)
  assert.equal(active(f.art).length, 0)
  s.loadout.active.sj_wanjian = 1; s.player.hp = 0
  assert.equal(f.art.syncTower(f.parent, s, camera), false)
  s.player.hp = 100
  f.art.syncTower(f.parent, s, camera)
  const nodes = f.art.actors.map(a => a.node)
  f.art.clearBindings()
  assert.ok(nodes.every(n => !n.isValid && !n.parent))
  const next = new f.Node('new battle')
  f.art.syncTower(next, state(3, 0), camera)
  assert.equal(active(f.art).length, 4); assert.equal(f.art.historyCount, 1)
  assert.ok(f.art.actors.every(a => a.node.parent === next))
  const frame = f.art.frame, texture = f.art.texture
  f.art.destroy(); f.art.destroy()
  assert.equal(f.image.refs, 0); assert.equal(f.art.actors.length, 0)
  assert.equal(frame.dead, true); assert.equal(texture.dead, true)
})
