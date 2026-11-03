import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import { runInNewContext } from 'node:vm'
import { HEX_CENTER, HEX_VERTICES } from '../js/xianxia/TowerArena.js'

// Production renderer, real shared geometry; only the Cocos drawing boundary is mocked.
const source = stripTypeScriptTypes(
  readFileSync(new URL('../cocos-pilot/assets/scripts/TowerArenaView.ts', import.meta.url), 'utf8')
    .replace(/^import .*$/gm, ''),
  { mode: 'transform' },
).replace(/^export /gm, '')
class Color {
  constructor(...args) { this.key = args.join(',') }
}
class Graphics {
  calls = []
  moveTo(...args) { this.calls.push(['moveTo', ...args]) }
  lineTo(...args) { this.calls.push(['lineTo', ...args]) }
  close() { this.calls.push(['close']) }
  rect(...args) { this.calls.push(['rect', ...args]) }
  roundRect(...args) { this.calls.push(['roundRect', ...args]) }
  circle(...args) { this.calls.push(['circle', ...args]) }
  fill() { this.calls.push(['fill', this.fillColor.key]) }
  stroke() { this.calls.push(['stroke', this.strokeColor.key, this.lineWidth]) }
}
const { drawTowerArena, drawTowerArenaMap } = runInNewContext(
  `${source}\n({drawTowerArena,drawTowerArenaMap})`,
  { Color, Graphics, HEX_CENTER, HEX_VERTICES },
)
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`)
const render = (camera = { x: 0, y: 0 }, version = 1, size = [1280, 591.47]) => {
  const g = new Graphics()
  drawTowerArena(g, camera, ...size, version)
  return g.calls
}
function lastWall(calls) {
  const end = calls.findLastIndex(c => c[0] === 'stroke' && c[1] === '#7a8765' && c[2] === 8)
  const start = calls.slice(0, end).findLastIndex(c => c[0] === 'moveTo')
  return calls.slice(start, end)
}
function insideHex(x, y) {
  // Clockwise polygon: points on or to the right of every directed edge.
  return HEX_VERTICES.every((a, i) => {
    const b = HEX_VERTICES[(i + 1) % HEX_VERTICES.length]
    return (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x) <= 1e-7
  })
}

test('hex floor has all six exact shared wall segments, including the closing edge', () => {
  const camera = { x: 173, y: -281 }, calls = render(camera), wall = lastWall(calls)
  assert.equal(wall.filter(c => c[0] === 'lineTo').length, 6)
  for (let i = 0; i <= 6; i++) {
    const p = HEX_VERTICES[i % 6]
    assert.deepEqual(wall[i], [i ? 'lineTo' : 'moveTo', p.x - camera.x, p.y - camera.y])
  }
  assert.deepEqual(wall.at(-1), ['close'])
  assert.deepEqual(calls[0], ['rect', -640, -591.47 / 2, 1280, 591.47])
  assert.equal(calls[1][1], '#101e1d')
})

test('camera movement translates every world primitive equally; resize changes only backing', () => {
  const base = render(), moved = render({ x: 73, y: -115 }), resized = render(undefined, 1, [844, 390])
  assert.equal(base.length, moved.length)
  for (let i = 0; i < base.length; i++) {
    const a = base[i], b = moved[i]
    if (['moveTo', 'lineTo', 'circle'].includes(a[0])) {
      near(b[1], a[1] - 73); near(b[2], a[2] + 115)
      assert.deepEqual(b.slice(3), a.slice(3))
    } else assert.deepEqual(b, a)
    if (i) assert.deepEqual(resized[i], a)
  }
})

test('tile seams and inset stay within the hex floor; decorative footings are retired', () => {
  const calls = render()
  for (const c of calls) {
    if (['moveTo', 'lineTo'].includes(c[0])) assert.ok(insideHex(c[1], c[2]), c.join(','))
    if (c[0] === 'circle') {
      for (let i = 0; i < 32; i++) {
        const angle = i * Math.PI / 16
        assert.ok(insideHex(c[1] + Math.cos(angle) * c[3], c[2] + Math.sin(angle) * c[3]))
      }
    }
  }
  assert.equal(calls.filter(c => c[0] === 'circle' && c[3] === 24).length, 0)
})

test('missing, zero and unknown arena versions keep the old rectangle bounds', () => {
  const camera = { x: 25, y: 50 }
  for (const version of [undefined, 0, 2]) {
    const g = new Graphics()
    drawTowerArena(g, camera, 1280, 720, version)
    const wall = lastWall(g.calls)
    assert.deepEqual(wall, [
      ['moveTo', -937, 970], ['lineTo', 953, 970], ['lineTo', 953, -1190],
      ['lineTo', -937, -1190], ['lineTo', -937, 970], ['close'],
    ])
    assert.equal(g.calls.some(c => c[0] === 'circle'), false)
  }
})

test('overview is passive, bounded to a 132×88 rectangle, centered, with an undistorted player position', () => {
  const state = Object.freeze({ arenaVersion: 1, player: Object.freeze({ x: 978, y: 480 }) })
  const g = new Graphics(), x = 500, y = 140
  drawTowerArenaMap(g, state, x, y)
  assert.deepEqual(g.calls[0], ['roundRect', x-66, y-44, 132, 88, 6])
  const points = g.calls.filter(c => ['moveTo', 'lineTo', 'circle'].includes(c[0]))
  for (const p of points) {
    assert.ok(Math.abs(p[1]-x)+(p[3]||0)<=66)
    assert.ok(Math.abs(p[2]-y)+(p[3]||0)<=44)
  }
  const dot = g.calls.find(c => c[0] === 'circle' && c[3] === 3)
  const scale=Math.min(54/Math.max(...HEX_VERTICES.map(p=>Math.abs(p.x-HEX_CENTER.x))),32/Math.max(...HEX_VERTICES.map(p=>Math.abs(p.y-HEX_CENTER.y))))
  near(dot[1], x + (state.player.x-HEX_CENTER.x)*scale); near(dot[2], y + (state.player.y-HEX_CENTER.y)*scale)
  assert.equal(g.calls.filter(c => c[0] === 'lineTo').length, 6)
  const centered = new Graphics()
  drawTowerArenaMap(centered, { arenaVersion: 1, player: HEX_CENTER }, x, y)
  assert.deepEqual(centered.calls.find(c => c[0] === 'circle' && c[3] === 3), ['circle', x, y, 3])
})

test('overview remains rectangular for legacy, omits invalid/missing player, and never clears prior HUD', () => {
  for (const player of [undefined, { x: NaN, y: 0 }]) {
    const g = new Graphics()
    g.calls.push(['existingHUD'])
    drawTowerArenaMap(g, { player }, 0, 0)
    assert.deepEqual(g.calls[0], ['existingHUD'])
    assert.equal(g.calls.filter(c => c[0] === 'lineTo').length, 4)
    assert.equal(g.calls.filter(c => c[0] === 'roundRect').length, 3)
    assert.equal(g.calls.some(c => c[0] === 'circle' && c[3] === 3), false)
  }
})


test('overview shows living normal enemies in red and excludes dead or invalid enemies', () => {
  const g = new Graphics()
  drawTowerArenaMap(g, { arenaVersion: 1, enemies: [
    { x: 0, y: 0, hp: 10, role: 'normal' },
    { x: 40, y: 0, hp: 0, role: 'normal' },
    { x: NaN, y: 0, hp: 10, role: 'normal' },
  ] }, 0, 0)
  assert.equal(g.calls.filter(c => c[0] === 'fill' && c[1] === '#ef786c').length, 1)
  assert.equal(g.calls.filter(c => c[0] === 'circle' && c[3] === 2).length, 1)
})

test('overview traces all six actual arena vertices at the marker scale', () => {
  const g = new Graphics()
  drawTowerArenaMap(g, { arenaVersion: 1 }, 20, 30)
  const scale = Math.min(54 / Math.max(...HEX_VERTICES.map(p => Math.abs(p.x-HEX_CENTER.x))), 32 / Math.max(...HEX_VERTICES.map(p => Math.abs(p.y-HEX_CENTER.y))))
  const path = g.calls.filter(c => c[0] === 'moveTo' || c[0] === 'lineTo')
  assert.equal(path.length, 7)
  for (let i = 0; i < path.length; i++) {
    const p = HEX_VERTICES[i % 6]
    near(path[i][1], 20 + (p.x-HEX_CENTER.x)*scale)
    near(path[i][2], 30 + (p.y-HEX_CENTER.y)*scale)
  }
})
