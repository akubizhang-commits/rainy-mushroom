// T8 · S1 几何占位图集生成器（02 §8.2 / §9 / §9.1）。
// 把所有战斗期动态对象（小旅人、gnat、beetle、孢子弹、孢子经验、净化光点、底影、摇杆、
// 纯白块）光栅化进同一张 survivor-battle 图集，保证 03 §6.2 的同图集合批（裁决 D6）。
// 同时生成 256×256 可平铺地面 ground.png（02 §8.6）。
//
// 无第三方依赖：4×4 超采样覆盖率 + node:zlib 自写 PNG。输出确定（固定种子），可重复运行。
// 产物：
//   cocos-pilot/assets/survivor/survivor-battle.png / .json
//   cocos-pilot/assets/survivor/ground.png
//   cocos-pilot/assets/scripts/SurvivorBattleFrames.ts（表现层直接 import 的帧表）
// 帧表约定同 microforest：width/height = 显示尺寸（u），w/h = 像素尺寸，x/y = 图集像素坐标，
// anchorX/anchorY = Cocos 锚点（左下为 0,0）。源图 = 显示 × 1.5（02 §8.1）。
import {writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {deflateSync} from 'node:zlib'

const root = resolve(import.meta.dirname, '../..')
const S = 1.5 // 像素 / u
const SS = 4 // 超采样

const hex = (h, a = 1) => {
  const n = parseInt(h.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a]
}

// ---------- 形状（坐标单位 u，原点在帧左下，y 向上，与 Cocos 一致） ----------
const ellipse = (cx, cy, rx, ry) => (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1
const circle = (cx, cy, r) => ellipse(cx, cy, r, r)
const ring = (cx, cy, r, w) => (x, y) => {
  const d = Math.hypot(x - cx, y - cy)
  return d <= r && d >= r - w
}
const poly = (pts) => (x, y) => {
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}
const rect = (x0, y0, x1, y1) => (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1
const union = (...fs) => (x, y) => fs.some((f) => f(x, y))
// 形状外扩 d（u）：近似描边，用 8 方向采样
const grow = (f, d) => (x, y) => {
  if (f(x, y)) return true
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2
    if (f(x + Math.cos(a) * d, y + Math.sin(a) * d)) return true
  }
  return false
}
const arc = (cx, cy, r, w, a0, a1) => (x, y) => {
  const d = Math.hypot(x - cx, y - cy)
  if (d > r || d < r - w) return false
  const a = Math.atan2(y - cy, x - cx)
  return a >= a0 && a <= a1
}

// 一帧：宽高（u）、锚点、图层列表 [shape, rgba]
function frame(name, wU, hU, anchorX, anchorY, layers) {
  const w = Math.ceil(wU * S), h = Math.ceil(hU * S)
  const px = new Float64Array(w * h * 4)
  for (const [shape, [r, g, b, a]] of layers) {
    for (let py = 0; py < h; py++) {
      for (let pxl = 0; pxl < w; pxl++) {
        let cover = 0
        for (let sy = 0; sy < SS; sy++) {
          for (let sx = 0; sx < SS; sx++) {
            const ux = (pxl + (sx + 0.5) / SS) / S
            // 图像行 0 在顶部；形状 y 向上
            const uy = (h - py - 1 + (sy + 0.5) / SS) / S
            if (shape(ux, uy)) cover++
          }
        }
        if (!cover) continue
        const sa = (a * cover) / (SS * SS)
        const i = (py * w + pxl) * 4
        const da = px[i + 3], oa = sa + da * (1 - sa)
        for (const [c, v] of [[0, r], [1, g], [2, b]]) px[i + c] = oa ? (v * sa + px[i + c] * da * (1 - sa)) / oa : 0
        px[i + 3] = oa
      }
    }
  }
  // 透明像素向外扩色，防止线性采样在边缘混入黑色（02 §8.1 出血）
  for (let pass = 0; pass < 2; pass++) {
    const src = px.slice()
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      if (src[i + 3] > 0) continue
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
        const j = (ny * w + nx) * 4
        if (src[j + 3] > 0 || (pass > 0 && (src[j] || src[j + 1] || src[j + 2]))) {
          px[i] = src[j]; px[i + 1] = src[j + 1]; px[i + 2] = src[j + 2]
          break
        }
      }
    }
  }
  return {name, wU, hU, anchorX, anchorY, w, h, px}
}

// ---------- 色板（02 §1.2） ----------
const OUTLINE = hex('#F4F1E8', 0.9)
const MIST_BLUE = hex('#6F93B8'), TERRACOTTA = hex('#C9704F'), SCARF = hex('#E8B85A')
const FACE = hex('#EAD7B7'), BOOT = hex('#3E4A52')
const ENEMY_MIST = hex('#9B7BC4', 0.6)
const GNAT = hex('#55555D'), GNAT_RIM = hex('#7A7A82')
const BEETLE = hex('#6E6458'), BEETLE_DARK = hex('#4E463E'), BEETLE_SHINE = hex('#8A8072')
const WHITE = hex('#FFFFFF')
const SHOT = hex('#FFF4D6'), AMBER = hex('#F2B544')
const PAPER = hex('#F4F1E8')

const frames = []

// 小旅人：高 64u（02 §8.3），+2u 白描边。锚点 = 脚底中心。
{
  const W = 48, H = 70, cx = W / 2, foot = 3
  const body = union(
    poly([[cx - 15, foot + 6], [cx + 15, foot + 6], [cx + 10, foot + 40], [cx - 10, foot + 40]]), // 雾蓝斗篷
    rect(cx - 9, foot, cx - 3, foot + 8), rect(cx + 3, foot, cx + 9, foot + 8), // 靴
    circle(cx, foot + 47, 9), // 脸
    ellipse(cx, foot + 56, 17, 8), // 赤陶菌帽
  )
  frames.push(frame('player', W, H, 0.5, foot / H, [
    [grow(body, 2), OUTLINE],
    [union(rect(cx - 9, foot, cx - 3, foot + 8), rect(cx + 3, foot, cx + 9, foot + 8)), BOOT],
    [poly([[cx - 15, foot + 6], [cx + 15, foot + 6], [cx + 10, foot + 40], [cx - 10, foot + 40]]), MIST_BLUE],
    [rect(cx - 11, foot + 34, cx + 11, foot + 40), SCARF], // 暖金领巾
    [poly([[cx + 4, foot + 34], [cx + 11, foot + 34], [cx + 13, foot + 24]]), SCARF],
    [circle(cx, foot + 47, 9), FACE],
    [union(circle(cx - 3, foot + 46, 1.4), circle(cx + 4, foot + 46, 1.4)), hex('#2B2B2B')],
    [ellipse(cx, foot + 56, 17, 8), TERRACOTTA],
    [union(circle(cx - 7, foot + 58, 2), circle(cx + 6, foot + 59, 2.4)), hex('#F4E3CF', 0.9)],
  ]))
}
// 小旅人底影 44×16u（02 §8.4 fx-player-shadow）
frames.push(frame('player-shadow', 46, 18, 0.5, 0.5, [[ellipse(23, 9, 22, 8), hex('#DDE8DC', 0.32)]]))
// 方向弧 8u（02 §5.1），开口朝 +x，运行时按朝向旋转
frames.push(frame('player-arc', 10, 20, 0.5, 0.5, [[arc(-3, 10, 11, 3, -0.75, 0.75), hex('#F4F1E8', 0.85)]]))

// gnat：3 个半径 4u 深灰圆点呈三角（02 §8.3 占位），脚下紫雾底影宽 = 碰撞直径 10×2×1.3 = 26u
function gnat(name, dot, rim) {
  const W = 30, H = 34, cx = W / 2, sy = 6
  const dots = [[cx - 6, sy + 12], [cx + 6, sy + 12], [cx, sy + 22]]
  const layers = [[ellipse(cx, sy, 13, 5), ENEMY_MIST]]
  for (const [x, y] of dots) layers.push([circle(x, y, 4.6), rim], [circle(x, y, 4), dot])
  return frame(name, W, H, 0.5, sy / H, layers)
}
frames.push(gnat('gnat', GNAT, GNAT_RIM), gnat('gnat-flash', WHITE, WHITE))

// beetle：灰褐椭圆 44×32u（02 §8.3），紫雾底影宽 = 16×2×1.3 ≈ 42u。头朝 +x，运行时左右翻转
function beetle(name, flash) {
  const W = 48, H = 40, cx = W / 2, sy = 7
  const shell = ellipse(cx - 2, sy + 14, 17, 12)
  const head = ellipse(cx + 15, sy + 12, 6, 6)
  const legs = union(rect(cx - 12, sy + 1, cx - 10, sy + 5), rect(cx - 2, sy, cx, sy + 5), rect(cx + 8, sy + 1, cx + 10, sy + 5))
  if (flash) return frame(name, W, H, 0.5, sy / H, [[ellipse(cx, sy, 21, 6), ENEMY_MIST], [union(shell, head, legs), WHITE]])
  return frame(name, W, H, 0.5, sy / H, [
    [ellipse(cx, sy, 21, 6), ENEMY_MIST],
    [legs, BEETLE_DARK],
    [head, BEETLE_DARK],
    [shell, BEETLE],
    [rect(cx - 2.6, sy + 3, cx - 1.4, sy + 25.5), BEETLE_DARK], // 壳缝
    [ellipse(cx - 9, sy + 19, 4, 2.4), BEETLE_SHINE],
  ])
}
frames.push(beetle('beetle', false), beetle('beetle-flash', true))

// 孢子弹：暖白椭圆 20×12u + 2 段琥珀拖尾（02 §8.4），朝 +x，运行时按速度旋转。锚点在弹头中心
{
  const W = 38, H = 12, hx = 28
  frames.push(frame('spore-shot', W, H, hx / W, 0.5, [
    [ellipse(hx - 17, 6, 4.5, 2.6), hex('#F2B544', 0.45)],
    [ellipse(hx - 10, 6, 6, 3.6), hex('#F2B544', 0.8)],
    [ellipse(hx, 6, 10, 6), SHOT],
    [ellipse(hx + 2, 7, 4, 2.2), WHITE],
  ]))
}

// 孢子经验：青绿菱形 14 / 20 / 28u（02 §8.4）
for (const [name, size, color] of [['spore-s', 14, '#6FE3C1'], ['spore-m', 20, '#7FF0D0'], ['spore-l', 28, '#B6FFE9']]) {
  const W = size + 2, c = W / 2, r = size / 2
  frames.push(frame(name, W, W, 0.5, 0.5, [
    [poly([[c, c + r + 0.8], [c + r * 0.72 + 0.8, c], [c, c - r - 0.8], [c - r * 0.72 - 0.8, c]]), hex('#2F7F6A', 0.9)],
    [poly([[c, c + r], [c + r * 0.72, c], [c, c - r], [c - r * 0.72, c]]), hex(color)],
    [poly([[c, c + r * 0.6], [c + r * 0.25, c + r * 0.1], [c, c - r * 0.1], [c - r * 0.25, c + r * 0.1]]), hex('#FFFFFF', 0.75)],
  ]))
}

// 净化光点 6u 暖白（02 §8.4 fx-purify-dot），柔边
frames.push(frame('purify-dot', 10, 10, 0.5, 0.5, [[circle(5, 5, 5), hex('#FFF4D6', 0.35)], [circle(5, 5, 3), hex('#FFF4D6')]]))

// 摇杆底座 半径 60u：填充 α0.12，描边 3u α0.35；摇杆头 半径 28u α0.55（02 §5.1，裁决 L1）
frames.push(frame('joy-base', 122, 122, 0.5, 0.5, [[circle(61, 61, 60), hex('#F4F1E8', 0.12)], [ring(61, 61, 60, 3), hex('#F4F1E8', 0.35)]]))
frames.push(frame('joy-knob', 58, 58, 0.5, 0.5, [[circle(29, 29, 28), hex('#F4F1E8', 0.55)]]))

// 纯白块：角色生命条（64×8u，染色）等
frames.push(frame('white', 6, 6, 0.5, 0.5, [[rect(0, 0, 6, 6), PAPER.map((v, i) => (i < 3 ? 255 : 1))]]))

// ---------- 打包（货架式，2px 透明出血） ----------
frames.sort((a, b) => b.h - a.h || a.name.localeCompare(b.name))
const PAD = 2
function pack(width) {
  let x = PAD, y = PAD, row = 0
  const placed = []
  for (const f of frames) {
    if (x + f.w + PAD > width) { x = PAD; y += row + PAD * 2; row = 0 }
    placed.push({f, x, y})
    x += f.w + PAD * 2
    row = Math.max(row, f.h)
  }
  return {placed, height: y + row + PAD}
}
const width = 512
const {placed, height: used} = pack(width)
let height = 64
while (height < used) height *= 2
if (height > 1024) throw Error('survivor-battle exceeds 512x1024')

const atlas = new Uint8Array(width * height * 4)
const table = {}
for (const {f, x, y} of placed) {
  for (let r = 0; r < f.h; r++) for (let c = 0; c < f.w; c++) {
    const s = (r * f.w + c) * 4, d = ((y + r) * width + x + c) * 4
    atlas[d] = Math.round(f.px[s]); atlas[d + 1] = Math.round(f.px[s + 1]); atlas[d + 2] = Math.round(f.px[s + 2])
    atlas[d + 3] = Math.round(f.px[s + 3] * 255)
  }
  table[f.name] = {width: f.wU, height: f.hU, anchorX: +f.anchorX.toFixed(4), anchorY: +f.anchorY.toFixed(4), x, y, w: f.w, h: f.h}
}

// ---------- 地面平铺 256×256（02 §8.6 占位：纯色 + 3 种随机色斑圆，可无缝平铺） ----------
function ground() {
  const N = 256, out = new Uint8Array(N * N * 4)
  const base = hex('#2F4A3F')
  let seed = 0x5eed
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
  const spots = []
  const tones = [hex('#3A5546'), hex('#29403A'), hex('#33503F')]
  for (let i = 0; i < 26; i++) spots.push({x: rnd() * N, y: rnd() * N, r: 6 + rnd() * 22, c: tones[i % 3], a: 0.35 + rnd() * 0.35})
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let [r, g, b] = base
    for (const s of spots) {
      // 环绕距离保证四边无缝
      const dx = Math.min(Math.abs(x - s.x), N - Math.abs(x - s.x)), dy = Math.min(Math.abs(y - s.y), N - Math.abs(y - s.y))
      const d = Math.hypot(dx, dy)
      if (d >= s.r) continue
      const k = s.a * Math.min(1, (s.r - d) / 4)
      r += (s.c[0] - r) * k; g += (s.c[1] - g) * k; b += (s.c[2] - b) * k
    }
    const i = (y * N + x) * 4
    out[i] = Math.round(r); out[i + 1] = Math.round(g); out[i + 2] = Math.round(b); out[i + 3] = 255
  }
  return {w: N, h: N, data: out}
}

// ---------- PNG 编码 ----------
const CRC = new Uint32Array(256).map((_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}
function png(w, h, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  const raw = Buffer.alloc((w * 4 + 1) * h)
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0
    Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1)
  }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, {level: 9})), chunk('IEND', Buffer.alloc(0))])
}

const dir = resolve(root, 'cocos-pilot/assets/survivor')
writeFileSync(resolve(dir, 'survivor-battle.png'), png(width, height, atlas))
writeFileSync(resolve(dir, 'survivor-battle.json'), JSON.stringify({version: 2, width, height, placeholder: true, scale: S, frames: table}, null, 2) + '\n')
const g = ground()
writeFileSync(resolve(dir, 'ground.png'), png(g.w, g.h, g.data))
writeFileSync(resolve(root, 'cocos-pilot/assets/scripts/SurvivorBattleFrames.ts'),
  '// GENERATED by scripts/survivor/pack-placeholder.mjs (T8 S1 geometric placeholders); do not edit.\n' +
  'export type SurvivorFrame={width:number,height:number,anchorX:number,anchorY:number,x:number,y:number,w:number,h:number};\n' +
  `export const SURVIVOR_ATLAS={width:${width},height:${height}};\n` +
  'export const SURVIVOR_FRAMES:Record<string,SurvivorFrame>=' + JSON.stringify(table, null, 1) + ';\n')
console.log(`survivor-battle ${width}x${height}: ${frames.length} frames; ground 256x256`)
