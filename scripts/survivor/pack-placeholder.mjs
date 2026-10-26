// T8 · S1 / P1 · S2 几何占位图集生成器（02 §8.2 / §9 / §9.1 / §9.2）。
// 把所有战斗期动态对象（小旅人、全部敌人与 Boss、玩家五种武器表现、浊雾泡、孢子经验、净化光点、
// 冲撞/方向箭头、撤离点、底影、摇杆、纯白块）光栅化进同一张 survivor-battle 图集，
// 保证 03 §6.2 的同图集合批（裁决 D6）。S2 新实体的帧尺寸按 data/ 中的碰撞半径换算。
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
import {ENEMIES} from '../../js/survivor/data/enemies.js'
import {WEAPONS} from '../../js/survivor/data/weapons.js'
import {PICKUPS} from '../../js/survivor/data/pickups.js'

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

// ---------- S2 新实体（P1）：尺寸取自 data/ 碰撞半径 ----------
// 每个帧按“设计半径”画，k = 数据半径 / 设计半径 等比缩放；frameR 记录帧对应的碰撞半径，
// 表现层按 实体半径 / frameR 缩放（数据改半径时重跑本脚本即可同步）。
const frameR = {gnat: 10, beetle: 16}
const scaled = (k, s) => (x, y) => s(x / k, y / k)
// 敌人帧：shadow = 紫雾底影（宽 = 碰撞直径 × 1.3，02 §1.3），parts = 本体图层；-flash 为同轮廓纯白剪影、保留底影
function enemyPair(name, r, designR, W, H, sy, shadow, parts) {
  const k = r / designR
  frameR[name] = r
  const sh = [scaled(k, shadow), ENEMY_MIST]
  const body = parts.map(([s, c]) => [scaled(k, s), c])
  frames.push(
    frame(name, W * k, H * k, 0.5, sy / H, [sh, ...body]),
    frame(name + '-flash', W * k, H * k, 0.5, sy / H, [sh, [union(...body.map(([s]) => s)), WHITE]]),
  )
}
const MOTH_WING = hex('#7E7466'), MOTH_SPOT = hex('#9A9080')
const SNAIL_BODY = hex('#5E6B5A'), SNAIL_SHELL = hex('#6E6458'), SNAIL_SPIRAL = hex('#4E463E'), SNAIL_SHINE = hex('#8A8072')
const SPORE_CAP = hex('#7E6F92'), SPORE_RIM = hex('#5C5070'), SPORE_DOT = hex('#9A8EAD'), SPORE_STEM = hex('#A89F94')
const EYE = hex('#2B2B2B')

// moth 灰蛾：两片灰褐三角翅组成“领结”形 + 深褐细身 + 触角（02 §8.3，40×32u），设计半径 14
{
  const r = ENEMIES.moth.radius, W = 42, H = 40, cx = W / 2, sy = 6, by = sy + 20
  const wings = union(poly([[cx - 1, by + 1], [cx - 20, by + 13], [cx - 18, by - 12]]), poly([[cx + 1, by + 1], [cx + 20, by + 13], [cx + 18, by - 12]]))
  enemyPair('moth', r, 14, W, H, sy, ellipse(cx, sy, 14 * 1.3, 5), [
    [grow(wings, 0.8), BEETLE_DARK],
    [wings, MOTH_WING],
    [union(circle(cx - 12, by + 3, 2.6), circle(cx + 12, by + 3, 2.6)), MOTH_SPOT],
    [ellipse(cx, by, 3, 9), BEETLE_DARK],
    [union(poly([[cx - 1, by + 8], [cx - 0.2, by + 8], [cx - 5, by + 14], [cx - 5.8, by + 13.4]]), poly([[cx + 1, by + 8], [cx + 0.2, by + 8], [cx + 5, by + 14], [cx + 5.8, by + 13.4]])), BEETLE_DARK],
  ])
}
// snail 雨夜蜗牛：灰绿软足 + 灰褐圆壳与深色螺旋 + 两根眼柄，头朝 +x（02 §8.3，60×40u），设计半径 22
function snailParts(cx, sy, s) {
  // s = 相对普通蜗牛的放大倍率（Boss 复用同一套轮廓）
  const foot = ellipse(cx + 2 * s, sy + 6 * s, 27 * s, 6 * s)
  const head = ellipse(cx + 22 * s, sy + 11 * s, 6 * s, 7 * s)
  const stalks = union(
    poly([[cx + 19 * s, sy + 15 * s], [cx + 21 * s, sy + 15 * s], [cx + 22 * s, sy + 25 * s], [cx + 20.6 * s, sy + 25 * s]]),
    poly([[cx + 24 * s, sy + 15 * s], [cx + 26 * s, sy + 15 * s], [cx + 28.4 * s, sy + 24 * s], [cx + 27 * s, sy + 24 * s]]),
  )
  const tips = union(circle(cx + 21.3 * s, sy + 25.5 * s, 1.8 * s), circle(cx + 27.7 * s, sy + 24.5 * s, 1.8 * s))
  const shellC = [cx - 4 * s, sy + 21 * s]
  return {
    body: union(foot, head, stalks, tips),
    shell: circle(...shellC, 15 * s),
    layers: [
      [union(foot, head, stalks), SNAIL_BODY],
      [tips, EYE],
      [circle(...shellC, 15 * s), SNAIL_SHELL],
      [ring(...shellC, 11 * s, 2.4 * s), SNAIL_SPIRAL],
      [ring(...shellC, 6 * s, 2.2 * s), SNAIL_SPIRAL],
      [circle(...shellC, 1.8 * s), SNAIL_SPIRAL],
      [ellipse(shellC[0] - 6 * s, shellC[1] + 8 * s, 3.6 * s, 2.2 * s), SNAIL_SHINE],
    ],
  }
}
{
  const r = ENEMIES.snail.radius, W = 64, H = 48, cx = W / 2 - 2, sy = 7
  enemyPair('snail', r, 22, W, H, sy, ellipse(W / 2, sy, 22 * 1.3, 6), snailParts(cx, sy, 1).layers)
}
// sporeling 迷途菌灵：灰紫半圆菌盖 + 浅灰褐矩形菌柄 + 两点眼（02 §8.3，40×44u），设计半径 16
{
  const r = ENEMIES.sporeling.radius, W = 44, H = 52, cx = W / 2, sy = 7, capY = sy + 21
  const cap = (x, y) => y >= capY && ellipse(cx, capY, 19, 19)(x, y)
  enemyPair('sporeling', r, 16, W, H, sy, ellipse(cx, sy, 16 * 1.3, 5.5), [
    [rect(cx - 6, sy + 1, cx + 6, capY + 1), SPORE_STEM],
    [union(circle(cx - 3, sy + 12, 1.7), circle(cx + 3, sy + 12, 1.7)), EYE],
    [cap, SPORE_CAP],
    [(x, y) => y >= capY - 1 && y <= capY + 2.2 && ellipse(cx, capY, 19, 19)(x, y), SPORE_RIM],
    [union(circle(cx - 8, capY + 9, 2.6), circle(cx + 5, capY + 13, 2.2), circle(cx + 11, capY + 5, 1.8)), SPORE_DOT],
  ])
}
// boss_mist_snail 浊雾巨蜗：蜗牛轮廓 ×2.6 + 深紫半透明雾壳罩住螺壳 + 三团雾絮（02 §8.3，约 170×120u，直径 ≥ 112u），设计半径 56
{
  const r = ENEMIES.boss_mist_snail.radius, W = 176, H = 136, sy = 13, s = 2.6, cx = W / 2 - 6
  const sn = snailParts(cx, sy, s)
  const shellC = [cx - 4 * s, sy + 21 * s]
  enemyPair('boss', r, 56, W, H, sy, ellipse(W / 2, sy, 56 * 1.3, 12), [
    ...sn.layers,
    [ellipse(shellC[0], shellC[1] + 4, 52, 50), hex('#5A3F78', 0.42)],
    [union(circle(shellC[0] - 40, shellC[1] + 30, 12), circle(shellC[0] + 6, shellC[1] + 52, 14), circle(shellC[0] + 42, shellC[1] + 30, 10)), hex('#7A5A9A', 0.35)],
  ])
}
// 精英圆壳甲虫（S3 B5）：beetle 轮廓 + 浅金发光描边 + 更亮的壳，设计半径 16（与 beetle 同尺寸），
// 运行时按 28 / 16 放大；-flash 为同轮廓纯白剪影。脚下另叠 elite-aura 脉冲环。
{
  const W = 52, H = 44, cx = W / 2, sy = 9
  const shell = ellipse(cx - 2, sy + 14, 17, 12)
  const head = ellipse(cx + 15, sy + 12, 6, 6)
  const horn = poly([[cx + 18, sy + 16], [cx + 25, sy + 24], [cx + 16, sy + 19]])
  const legs = union(rect(cx - 12, sy + 1, cx - 10, sy + 5), rect(cx - 2, sy, cx, sy + 5), rect(cx + 8, sy + 1, cx + 10, sy + 5))
  const body = union(shell, head, horn, legs)
  const mist = [ellipse(cx, sy, 21, 6), ENEMY_MIST]
  frameR.elite = 16
  frames.push(frame('elite', W, H, 0.5, sy / H, [
    mist,
    [grow(body, 2.4), hex('#F2C14E', 0.85)],
    [legs, BEETLE_DARK],
    [union(head, horn), BEETLE_DARK],
    [shell, hex('#7A6A52')],
    [rect(cx - 2.6, sy + 3, cx - 1.4, sy + 25.5), BEETLE_DARK],
    [union(ellipse(cx - 9, sy + 19, 4, 2.4), circle(cx + 5, sy + 20, 1.6), circle(cx - 4, sy + 9, 1.4)), hex('#FFE7A8')],
  ]))
  frames.push(frame('elite-flash', W, H, 0.5, sy / H, [mist, [grow(body, 2.4), WHITE]]))
}
// 精英光环：叠在放大的 beetle 帧下（同帧尺寸与锚点），白色椭圆环运行时染 #9B7BC4 ↔ #F2C14E 脉冲（02 §1.3）
{
  const W = 48, H = 40, cx = W / 2, sy = 7
  const outer = ellipse(cx, sy, 24, 8.6), inner = ellipse(cx, sy, 21.6, 6.4)
  frames.push(frame('elite-aura', W, H, 0.5, sy / H, [[(x, y) => outer(x, y) && !inner(x, y), WHITE]]))
}

// 浊雾泡（敌弹）：品红 #E05AD0 空心环 + 暗紫 #3A1F45 核，直径 = 碰撞直径（02 §1.2，24u）
{
  const r = ENEMIES.sporeling.bubble.radius, W = r * 2 + 2, c = W / 2
  frameR['mist-bubble'] = r
  frames.push(frame('mist-bubble', W, W, 0.5, 0.5, [
    [ring(c, c, r, r * 0.3), hex('#E05AD0')],
    [circle(c, c, r * 0.5), hex('#3A1F45')],
  ]))
}
// 菌伞旋刃：琥珀半圆伞面 + 暖白菌褶与短柄 + 深琥珀描边，运行时自转（02 §8.4，直径 32u × area）
{
  const r = WEAPONS.umbrella_blades.bladeRadius, W = r * 2 + 2, c = W / 2
  frameR['umbrella-blade'] = r
  const canopy = (x, y) => y >= c - r * 0.1 && circle(c, c - r * 0.1, r * 0.95)(x, y)
  const stem = rect(c - r * 0.16, c - r * 0.85, c + r * 0.16, c)
  frames.push(frame('umbrella-blade', W, W, 0.5, 0.5, [
    [grow(union(canopy, stem), 1), hex('#B07A2A', 0.95)],
    [stem, SHOT],
    [canopy, AMBER],
    [(x, y) => y >= c - r * 0.1 && y <= c + r * 0.12 && circle(c, c - r * 0.1, r * 0.95)(x, y), SHOT],
    [ellipse(c - r * 0.4, c + r * 0.45, r * 0.22, r * 0.13), hex('#FFF4D6', 0.8)],
  ]))
}
// 露珠环：浅蓝 #BFE8FF 圆环描边，运行时按 ringR 缩放（02 §8.4，常态 α0.25、结算闪 α0.5）；设计半径 68
{
  const R = 68, W = R * 2, c = W / 2
  frameR['dew-ring'] = R - 1
  frames.push(frame('dew-ring', W, W, 0.5, 0.5, [[ring(c, c, R - 1, 3), hex('#BFE8FF')], [ring(c, c, R - 4, 3), hex('#BFE8FF', 0.25)]]))
}
// 雨滴坠击：落点 = 冷蓝 #9CC8E8 虚线圈（16 段，02 §1.3 “不是危险”）；雨滴 = 浅蓝细长水滴；落地水花 = 浅蓝环 + 6 粒溅点
{
  const r = WEAPONS.raindrop.levels[0].radius, W = r * 2 + 2, c = W / 2
  frameR['rain-mark'] = r; frameR['rain-splash'] = r
  const dashed = (x, y) => ring(c, c, r, 2.5)(x, y) && Math.floor(((Math.atan2(y - c, x - c) + Math.PI) / (Math.PI * 2)) * 32) % 2 === 0
  frames.push(frame('rain-mark', W, W, 0.5, 0.5, [[dashed, hex('#9CC8E8')], [circle(c, c, 3), hex('#9CC8E8', 0.8)]]))
  const drops = []
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.3; drops.push(circle(c + Math.cos(a) * r * 0.82, c + Math.sin(a) * r * 0.82, 3)) }
  frames.push(frame('rain-splash', W, W, 0.5, 0.5, [[ring(c, c, r * 0.6, 3), hex('#BFE8FF')], [union(...drops), hex('#E6F6FF')]]))
  const dW = 10, dH = 30, dc = dW / 2
  const drop = union(circle(dc, 4.5, 4.2), poly([[dc - 4, 5.4], [dc + 4, 5.4], [dc, dH - 0.5]]))
  frames.push(frame('raindrop', dW, dH, 0.5, 4.5 / dH, [[grow(drop, 0.6), hex('#6F93B8', 0.9)], [drop, hex('#BFE8FF')], [ellipse(dc - 1.4, 5.5, 1.2, 2), WHITE]]))
}
// 落叶回旋镖：琥珀尖椭圆叶（两圆相交）+ 暖白叶脉 + 深琥珀描边，运行时自转（02 §8.4，36×20u），设计半径 10
{
  const r = WEAPONS.leaf_boomerang.leafRadius, k = r / 10, W = 38 * k, H = 22 * k, cx = W / 2, cy = H / 2
  frameR.leaf = r
  const R = 21.2 * k, d = 11.2 * k
  const leaf = (x, y) => circle(cx, cy - d, R)(x, y) && circle(cx, cy + d, R)(x, y)
  frames.push(frame('leaf', W, H, 0.5, 0.5, [
    [grow(leaf, 1), hex('#B07A2A', 0.95)],
    [leaf, AMBER],
    [(x, y) => leaf(x, y) && Math.abs(y - cy) <= 0.8 * k, SHOT],
    [union(poly([[cx - 6 * k, cy], [cx - 4.6 * k, cy], [cx - 9 * k, cy + 5 * k]]), poly([[cx + 3 * k, cy], [cx + 4.4 * k, cy], [cx, cy - 5 * k]])), SHOT],
  ]))
}
// 冲撞箭头：橙红 #FF6B4A 斜条纹矩形 + 三角箭头，朝 +x、锚点在尾部中心；运行时长度 = 冲撞距离、宽 = 碰撞直径，α0.5（02 §1.2）
{
  const W = 64, H = 56, body = rect(0, 14, 44, 42), head = poly([[42, 0], [64, 28], [42, 56]])
  frames.push(frame('danger-arrow', W, H, 0, 0.5, [
    [union(body, head), hex('#FF6B4A', 0.55)],
    [(x, y) => body(x, y) && ((x + y) % 10 + 10) % 10 < 5, hex('#FF6B4A')],
    [head, hex('#FF6B4A')],
  ]))
}
// 方向指示箭头（屏外精英 / Boss / 撤离点，P2 使用）：白色三角 + 深色描边，运行时染色并旋转，朝 +x（02 §8.5 icon-offscreen 40–56u）
{
  const W = 44, H = 44, tri = poly([[8, 6], [40, 22], [8, 38], [16, 22]])
  frames.push(frame('offscreen-arrow', W, H, 0.5, 0.5, [[grow(tri, 2), hex('#1C2E2B', 0.9)], [tri, WHITE]]))
}
// 阳光撤离点（02 §8.4 fx-evac-beam 100×220u）：光柱 = 竖向渐变 #FFE08A → #FFF7D6 并向上淡出，锚点在底部中心；
// 地面圈 = 浅金描边 + 淡填充；停留进度 = 柔边实心圆。均按半径缩放（光柱宽 = 撤离直径、高 = 2.2 × 宽）
{
  const W = 50, H = 110, cx = W / 2, bands = 55
  const layers = []
  for (let i = 0; i < bands; i++) {
    const f = i / (bands - 1), y0 = (i * H) / bands, y1 = ((i + 1) * H) / bands
    const col = [0xff, Math.round(0xe0 + (0xf7 - 0xe0) * f), Math.round(0x8a + (0xd6 - 0x8a) * f)]
    layers.push([rect(cx - 25, y0, cx + 25, y1), [...col, 0.18 * (1 - f)]])
    layers.push([rect(cx - 16, y0, cx + 16, y1), [...col, 0.22 * (1 - f)]])
    layers.push([rect(cx - 7, y0, cx + 7, y1), [...col, 0.3 * (1 - f)]])
  }
  frames.push(frame('evac-beam', W, H, 0.5, 0, layers))
  const R = 34, rW = R * 2 + 2, c = rW / 2
  frameR['evac-ring'] = R
  frames.push(frame('evac-ring', rW, rW, 0.5, 0.5, [[circle(c, c, R), hex('#FFE08A', 0.25)], [ring(c, c, R, 2.5), hex('#FFE08A')]]))
  frames.push(frame('evac-fill', 24, 24, 0.5, 0.5, [[circle(12, 12, 12), hex('#FFF7D6', 0.35)], [circle(12, 12, 9), hex('#FFF7D6', 0.8)]]))
  frameR['evac-fill'] = 12
}

// ---------- S3 B5：拾取物（01 §11、02 §8.4；回血物用水滴形，不用蘑菇图形，01 §2） ----------
// 露珠 / 大露珠：浅蓝水滴（尖端朝上）+ 白色高光；大露珠外加一圈淡金光晕。林风：三道青白风痕 + 一片小绿叶。
// 帧按 data/pickups.js 的碰撞半径画，frameR 记录半径供运行时缩放。
function dewDrop(name, r, halo) {
  const W = r * 2 + 10, H = r * 2.8 + 8, cx = W / 2, cy = r + 4
  const drop = union(circle(cx, cy, r), poly([[cx - r * 0.82, cy + r * 0.58], [cx + r * 0.82, cy + r * 0.58], [cx, cy + r * 1.9]]))
  frameR[name] = r
  const layers = []
  if (halo) layers.push([ring(cx, cy + r * 0.3, r + 4.5, 2.2), hex('#FFE08A', 0.8)])
  layers.push(
    [grow(drop, 1.2), hex('#6F93B8', 0.95)],
    [drop, hex('#BFE8FF')],
    [ellipse(cx + r * 0.25, cy - r * 0.2, r * 0.5, r * 0.38), hex('#8FC4EA', 0.7)],
    [ellipse(cx - r * 0.35, cy + r * 0.3, r * 0.22, r * 0.34), WHITE],
  )
  frames.push(frame(name, W, H, 0.5, cy / H, layers))
}
dewDrop('dew-drop', PICKUPS.dew.radius, false)
dewDrop('dew-drop-big', PICKUPS.bigDew.radius, true)
{
  const r = PICKUPS.wind.radius, W = r * 2 + 8, c = W / 2
  frameR.wind = r
  const streak = (y, x0, x1, curl) => union(
    rect(c + x0, c + y - 1.3, c + x1, c + y + 1.3),
    arc(c + x1, c + y + curl, Math.abs(curl) + 1.3, 2.6, curl > 0 ? -Math.PI / 2 : 0, curl > 0 ? Math.PI / 2 : Math.PI / 2 + Math.PI / 2),
  )
  const leaf = (x, y) => circle(c + 4, c - 2, 6)(x, y) && circle(c - 2, c + 4, 6)(x, y)
  frames.push(frame('wind', W, W, 0.5, 0.5, [
    [circle(c, c, r + 3), hex('#DDF5E8', 0.22)],
    [grow(union(streak(r * 0.55, -r, r * 0.5, 3), streak(-r * 0.05, -r * 0.7, r * 0.8, -3), streak(-r * 0.65, -r * 0.9, r * 0.3, 2.5)), 0.8), hex('#2F7F6A', 0.6)],
    [union(streak(r * 0.55, -r, r * 0.5, 3), streak(-r * 0.05, -r * 0.7, r * 0.8, -3), streak(-r * 0.65, -r * 0.9, r * 0.3, 2.5)), hex('#E6FFF4')],
    [leaf, hex('#9FD18B')],
  ]))
}

// ---------- S3 B5：进化武器变体（同形状换色 / 放大；进化名见 strings card_evolve_<id>） ----------
const GOLD = hex('#F2C14E'), GOLD_DEEP = hex('#B07A2A', 0.95)
// 孢子风暴：金色弹头 + 3 段拖尾（比孢子弹长）
{
  const W = 46, H = 14, hx = 34
  frames.push(frame('spore-shot-evo', W, H, hx / W, 0.5, [
    [ellipse(hx - 24, 7, 4.5, 2.6), hex('#F2C14E', 0.35)],
    [ellipse(hx - 16, 7, 6, 3.4), hex('#F2C14E', 0.6)],
    [ellipse(hx - 9, 7, 7, 4.2), hex('#F2C14E', 0.9)],
    [ellipse(hx, 7, 11, 6.6), hex('#FFE7A8')],
    [ellipse(hx + 2, 8, 4.4, 2.4), WHITE],
  ]))
}
// 菌伞华盖：金色大伞面 + 白斑 + 深琥珀描边（同形状换色）
{
  const r = WEAPONS.umbrella_blades.bladeRadius, W = r * 2 + 4, c = W / 2
  frameR['umbrella-blade-evo'] = r
  const canopy = (x, y) => y >= c - r * 0.1 && circle(c, c - r * 0.1, r * 0.95)(x, y)
  const stem = rect(c - r * 0.16, c - r * 0.85, c + r * 0.16, c)
  frames.push(frame('umbrella-blade-evo', W, W, 0.5, 0.5, [
    [grow(union(canopy, stem), 1.6), GOLD_DEEP],
    [stem, SHOT],
    [canopy, GOLD],
    [(x, y) => y >= c - r * 0.1 && y <= c + r * 0.12 && circle(c, c - r * 0.1, r * 0.95)(x, y), SHOT],
    [union(circle(c - r * 0.4, c + r * 0.42, r * 0.14), circle(c + r * 0.15, c + r * 0.6, r * 0.12), circle(c + r * 0.5, c + r * 0.3, r * 0.1)), WHITE],
  ]))
}
// 晨露结界：重绘的双层光环（外圈浅金、内圈浅蓝）+ 8 颗露珠点，设计半径 68（与露珠环相同缩放口径）
{
  const R = 68, W = R * 2, c = W / 2
  frameR['dew-ring-evo'] = R - 1
  const dots = []
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; dots.push(circle(c + Math.cos(a) * (R - 3), c + Math.sin(a) * (R - 3), 3.2)) }
  frames.push(frame('dew-ring-evo', W, W, 0.5, 0.5, [
    [ring(c, c, R - 1, 3), hex('#FFE08A')],
    [ring(c, c, R - 6, 3), hex('#BFE8FF', 0.8)],
    [ring(c, c, R - 11, 2), hex('#BFE8FF', 0.3)],
    [union(...dots), hex('#E6F6FF')],
  ]))
}
// 骤雨：更粗的深蓝雨滴 + 金色高光
{
  const dW = 12, dH = 34, dc = dW / 2
  const drop = union(circle(dc, 5.2, 5), poly([[dc - 4.8, 6.2], [dc + 4.8, 6.2], [dc, dH - 0.5]]))
  frames.push(frame('raindrop-evo', dW, dH, 0.5, 5.2 / dH, [[grow(drop, 0.7), hex('#3E5F86', 0.95)], [drop, hex('#8FC4EA')], [ellipse(dc - 1.6, 6, 1.4, 2.2), hex('#FFE7A8')]]))
}
// 秋风叶舞：橙红秋叶（同形状换色）
{
  const r = WEAPONS.leaf_boomerang.leafRadius, k = r / 10, W = 38 * k, H = 22 * k, cx = W / 2, cy = H / 2
  frameR['leaf-evo'] = r
  const R = 21.2 * k, d = 11.2 * k
  const leaf = (x, y) => circle(cx, cy - d, R)(x, y) && circle(cx, cy + d, R)(x, y)
  frames.push(frame('leaf-evo', W, H, 0.5, 0.5, [
    [grow(leaf, 1), hex('#8A3A1E', 0.95)],
    [leaf, hex('#E07A3A')],
    [(x, y) => leaf(x, y) && Math.abs(y - cy) <= 0.8 * k, hex('#FFE7A8')],
    [union(poly([[cx - 6 * k, cy], [cx - 4.6 * k, cy], [cx - 9 * k, cy + 5 * k]]), poly([[cx + 3 * k, cy], [cx + 4.4 * k, cy], [cx, cy - 5 * k]])), hex('#FFE7A8')],
  ]))
}

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

// ---------- 打包（天际线 bottom-left，2px 透明出血；S3 B5 起替换货架式，帧变多后仍放得进 512×1024） ----------
frames.sort((a, b) => b.h - a.h || b.w - a.w || a.name.localeCompare(b.name))
const PAD = 2
function pack(width) {
  // skyline：按 x 升序的线段 {x, w, y}，y = 该段已占用的最低可用高度
  let sky = [{x: 0, w: width, y: 0}]
  const placed = []
  let height = 0
  for (const f of frames) {
    const fw = f.w + PAD * 2, fh = f.h + PAD * 2
    let best = null
    for (let i = 0; i < sky.length; i++) {
      const x = sky[i].x
      if (x + fw > width) break
      let y = 0, span = 0
      for (let j = i; j < sky.length && span < fw; j++) { y = Math.max(y, sky[j].y); span += sky[j].w }
      if (span < fw) continue
      if (!best || y + fh < best.y + fh - 1e-9 || (y + fh === best.y + fh && x < best.x)) best = {x, y}
    }
    if (!best) throw Error('survivor-battle pack failed: ' + f.name)
    placed.push({f, x: best.x + PAD, y: best.y + PAD})
    height = Math.max(height, best.y + fh)
    // 更新天际线：[best.x, best.x + fw) 抬到 best.y + fh
    const next = []
    const x0 = best.x, x1 = best.x + fw
    for (const s of sky) {
      const s1 = s.x + s.w
      if (s1 <= x0 || s.x >= x1) { next.push(s); continue }
      if (s.x < x0) next.push({x: s.x, w: x0 - s.x, y: s.y})
      if (s1 > x1) next.push({x: x1, w: s1 - x1, y: s.y})
    }
    next.push({x: x0, w: fw, y: best.y + fh})
    next.sort((a, b) => a.x - b.x)
    sky = []
    for (const s of next) { const last = sky[sky.length - 1]; if (last && last.y === s.y && last.x + last.w === s.x) last.w += s.w; else sky.push({...s}) }
  }
  return {placed, height}
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
  '// GENERATED by scripts/survivor/pack-placeholder.mjs (T8 S1 / P1 S2 / S3 B5 geometric placeholders); do not edit.\n' +
  'export type SurvivorFrame={width:number,height:number,anchorX:number,anchorY:number,x:number,y:number,w:number,h:number};\n' +
  `export const SURVIVOR_ATLAS={width:${width},height:${height}};\n` +
  '// 帧绘制时对应的碰撞/效果半径（u）：表现层按 实体半径 / SURVIVOR_FRAME_R[帧] 缩放\n' +
  'export const SURVIVOR_FRAME_R:Record<string,number>=' + JSON.stringify(frameR) + ';\n' +
  'export const SURVIVOR_FRAMES:Record<string,SurvivorFrame>=' + JSON.stringify(table, null, 1) + ';\n')
console.log(`survivor-battle ${width}x${height}: ${frames.length} frames; ground 256x256`)
