# 雨后森林图书馆 · 灰盒原型 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 做出 5 关可在浏览器和微信开发者工具里游玩的竖屏灰盒版"雨后森林图书馆"：拖书上架、水位上涨、漏水与晾书架、放大镜、复活、通关点亮全景。

**Architecture:** 玩法逻辑是 `js/library/` 下无引擎依赖的纯 ES 模块，用 `node --test` 覆盖；`scripts/cocos/sync-shared.mjs` 把它们同步成 `cocos-pilot/assets/scripts/shared/js/library/*.ts`；`LibraryView.ts` 用程序化节点（色块 + emoji + 数字）画出一局并处理触摸；`PinePilot.ts` 默认启动图书馆，带 `?forest=1` 等参数时仍启动旧横版。

**Tech Stack:** Node ≥20 内置 `node:test`；Cocos Creator 3.8.8（TypeScript，2D UI 节点、`Graphics`、`Label`）；微信小游戏构建。

**Spec:** `docs/superpowers/specs/2026-09-28-rainy-library-design.md`

## Global Constraints

- 竖屏，设计分辨率 375×812，`ResolutionPolicy.FIXED_WIDTH`（沿用 `PinePilot.ts`）。
- 不得使用 Librarian 的名称、美术、文案、分区名、"3072"、召集/洞察/自动归位三技能组合。
- 生命 3；整层摆满退水 0.08；复活退水 0.3、每关 1 次；晾书架 2 格、晾 5 秒；晾干后 y ≥ 水位 + 0.15；放大镜每关免费 1 次、持续 8 秒；遮挡阈值 30%；吸附半径 36 设计像素。
- 书数：10 / 15 / 18 / 24 / 24；第 5 关 1 个漏水点，6–8 秒一滴。
- 存档 key `rainyLibrary.progress.v1`，不读写任何旧森林存档；读不懂的存档不得覆盖。
- 原型只用假广告（调用即 `{status:'rewarded'}`），状态名与 `js/services/AdService.js` 的 `showRewardedVideo()` 一致。
- `js/library/` 只能相对导入同目录模块（同步脚本拒绝其他依赖）；不要从 `js/core/` 导入。
- **工作区里有 700+ 个用户未提交的横版冒险改动。每次提交只 `git add` 本任务列出的文件，禁止 `git add -A` / `git add .` / `git commit -a`，禁止 stash、reset、checkout 这些文件。**
- 本机 git 没有作者配置，提交统一用：`git -c user.name=dev -c user.email=dev@rainy-mushroom.local commit -m "..."`，消息末尾加 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`。
- 已知基线：`npm test` 378 项中 `tests/forest-cleanup.test.mjs` 的 "retired runtime and resource bundles cannot reenter builds" 已经失败（用户未提交的 `microforest-motion` 资源目录导致）。不要修它；其余测试必须保持通过。

## Review Focus

1. 手指在书柜和晾书架以外的地方松开（顶栏、屏幕边缘），书应回到地面原位，不能丢失——`drop(id,null)` 测试放在 Task 4。
2. 切到后台再回来，Cocos 会给一个很大的 `dt`，水位不能一次性涨满——`update` 单步上限 0.1 秒，测试放在 Task 4。
3. 两根手指同时拿两本书——同一时刻只能拿一本，测试放在 Task 4。
4. 拿着书时进入复活等待或已经结束，这时松手应被拒绝、书回地面，不能上架也不能卡在"拿起"状态——测试放在 Task 4。
5. 微信存储写入抛异常（空间满）或存档损坏——不崩溃、不覆盖原存档，`saved=false`——测试放在 Task 6。

## File Structure

| 文件 | 职责 |
|---|---|
| `js/library/LibraryRandom.js` | 可注入种子的随机数（复制 `js/core/Random.js` 算法，满足同步限制） |
| `js/library/LibraryLevels.js` | 分区定义、5 关配置、`levelBooks()`、`levelById()` |
| `js/library/ShelfBoard.js` | 书柜格子、正确格判定、层完成、格子布局与吸附 |
| `js/library/BookPile.js` | 书堆布局、重叠与遮挡 |
| `js/library/RainState.js` | 水位和漏水点计时 |
| `js/library/LibraryRound.js` | 一局状态机与事件队列 |
| `js/library/LibraryAutoplay.js` | 脚本化玩家，用于调参与回归测试 |
| `js/library/LibraryProgress.js` | 通关存档与全景点亮 |
| `scripts/library/tune-water.mjs` | 用自动玩家二分搜索各关水速 |
| `tests/library-*.test.mjs` | 各模块测试 |
| `scripts/cocos/sync-shared.mjs` | 放开 `js/library/` |
| `tests/forest-cleanup.test.mjs` | 允许 manifest 含 `js/library/` |
| `cocos-pilot/assets/scripts/LibraryView.ts` | 灰盒画面、拖拽、弹窗、全景页 |
| `cocos-pilot/assets/scripts/PinePilot.ts` | 默认进入图书馆，参数进入旧森林 |
| `cocos-pilot/build-configs/wechatgame.json` | `orientation` 改 `portrait` |

---

### Task 1: 随机数、关卡数据与书柜

**Files:**
- Create: `js/library/LibraryRandom.js`, `js/library/LibraryLevels.js`, `js/library/ShelfBoard.js`
- Test: `tests/library-shelf.test.mjs`

**Interfaces:**
- Produces:
  - `class SeededRandom(seed)`：`next():number∈[0,1)`、`int(min,max)`、`shuffle(items):Array`
  - `SECTIONS: Record<string,{icon,name,color}>`；`LIBRARY_LEVELS: Level[]`，`Level={id,name,tip,sections:string[],cols,jitter,rowStep,waterSpeed,seed,leaks:{x,min,max}[]}`
  - `levelBooks(level): {id,section,volume}[]`；`levelById(id): Level|null`
  - `class ShelfBoard(sections,cols)`：`keyOf(book):string|null`（`"row:col"`）、`place(book,key):boolean`、`damage(book)`、`claimCompletedRow(key):number`（首次完成返回行号，否则 -1）、`filled:Map<key,bookId>`、`damaged:Set<key>`
  - `shelfLayout({left,top,width,height,plaque=40},rows,cols): {key,row,col,x,y,width,height}[]`（y 向上，行从上往下）
  - `nearestSlot(slots,x,y,radius=SNAP_RADIUS): string|null`；`SNAP_RADIUS=36`

- [ ] **Step 1: 写失败测试** `tests/library-shelf.test.mjs`

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { SeededRandom } from '../js/library/LibraryRandom.js'
import { LIBRARY_LEVELS, SECTIONS, levelById, levelBooks } from '../js/library/LibraryLevels.js'
import { ShelfBoard, shelfLayout, nearestSlot, SNAP_RADIUS } from '../js/library/ShelfBoard.js'

test('seeded random repeats for the same seed', () => {
  const a = new SeededRandom('x'), b = new SeededRandom('x')
  assert.deepEqual([a.next(), a.next(), a.int(1, 6)], [b.next(), b.next(), b.int(1, 6)])
  assert.deepEqual(new SeededRandom('s').shuffle([1, 2, 3, 4]).sort(), [1, 2, 3, 4])
})

test('five levels match the designed shelf sizes and every section is defined', () => {
  assert.deepEqual(LIBRARY_LEVELS.map(l => levelBooks(l).length), [10, 15, 18, 24, 24])
  assert.deepEqual(LIBRARY_LEVELS.map(l => l.sections.length), [2, 3, 3, 4, 4])
  assert.deepEqual(LIBRARY_LEVELS.map(l => l.leaks.length), [0, 0, 0, 0, 1])
  for (const l of LIBRARY_LEVELS) {
    assert.ok(l.waterSpeed > 0 && l.tip && l.name)
    for (const s of l.sections) assert.ok(SECTIONS[s], s)
  }
  assert.equal(levelById('library-03').name, '苔藓书柜')
  assert.equal(levelById('nope'), null)
})

test('every book has exactly one slot and ids are unique', () => {
  for (const l of LIBRARY_LEVELS) {
    const books = levelBooks(l), board = new ShelfBoard(l.sections, l.cols)
    assert.equal(new Set(books.map(b => board.keyOf(b))).size, books.length)
    assert.equal(new Set(books.map(b => b.id)).size, books.length)
  }
})

test('placing accepts only the matching empty slot', () => {
  const board = new ShelfBoard(['mushroom', 'plant'], 5), book = { id: 'plant-3', section: 'plant', volume: 3 }
  assert.equal(board.keyOf(book), '1:2')
  assert.equal(board.keyOf({ id: 'x', section: 'bird', volume: 1 }), null)
  assert.equal(board.place(book, '1:1'), false)
  assert.equal(board.place(book, null), false)
  assert.equal(board.place(book, '1:2'), true)
  assert.equal(board.place(book, '1:2'), false)
})

test('a row completes once when every undamaged slot is filled', () => {
  const board = new ShelfBoard(['mushroom'], 3), b = v => ({ id: `mushroom-${v}`, section: 'mushroom', volume: v })
  board.place(b(1), '0:0')
  assert.equal(board.claimCompletedRow('0:0'), -1)
  board.damage(b(2))
  board.place(b(3), '0:2')
  assert.equal(board.claimCompletedRow('0:2'), 0)
  assert.equal(board.claimCompletedRow('0:2'), -1)
  assert.equal(board.place(b(2), '0:1'), false, 'damaged slots stay closed')
})

test('shelf layout and snapping pick the nearest slot within the radius', () => {
  const slots = shelfLayout({ left: 0, top: 100, width: 140, height: 100, plaque: 40 }, 2, 2)
  assert.deepEqual(slots.map(s => [s.key, s.x, s.y]), [['0:0', 65, 75], ['0:1', 115, 75], ['1:0', 65, 25], ['1:1', 115, 25]])
  assert.equal(nearestSlot(slots, 66, 74), '0:0')
  assert.equal(nearestSlot(slots, 65, 75 + SNAP_RADIUS), '0:0')
  assert.equal(nearestSlot(slots, 65, 75 + SNAP_RADIUS + 1), null)
})
```

- [ ] **Step 2: 运行，确认失败**

Run: `node --test tests/library-shelf.test.mjs`
Expected: FAIL，`Cannot find module '.../js/library/LibraryRandom.js'`

- [ ] **Step 3: 实现**

`js/library/LibraryRandom.js`：

```js
// Same algorithm as js/core/Random.js; duplicated so js/library stays self-contained for the Cocos sync.
export function hashSeed(value) {
  const text = String(value)
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export class SeededRandom {
  constructor(seed) {
    this.state = hashSeed(seed) || 0x6d2b79f5
  }

  next() {
    let value = this.state += 0x6d2b79f5
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }

  int(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min
  }

  shuffle(items) {
    const result = items.slice()
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = this.int(0, i)
      const current = result[i]
      result[i] = result[j]
      result[j] = current
    }
    return result
  }
}
```

`js/library/LibraryLevels.js`（`waterSpeed` 先用下面的值，Task 5 用调参脚本复核）：

```js
export const SECTIONS = {
  mushroom: { icon: '🍄', name: '菌物', color: '#b8744a' },
  plant: { icon: '🌿', name: '草木', color: '#5f8f5a' },
  bird: { icon: '🐦', name: '林鸟', color: '#4f7fa6' },
  flower: { icon: '🌸', name: '野花', color: '#c0708a' },
}

export const LIBRARY_LEVELS = [
  { id: 'library-01', name: '门口的矮书柜', tip: '按住书，拖到同图标那一层、同卷号的格子', sections: ['mushroom', 'plant'], cols: 5, jitter: 0, rowStep: .3, waterSpeed: .00467, leaks: [] },
  { id: 'library-02', name: '蕨影书柜', tip: '被压住的书要先拿走上面那本', sections: ['mushroom', 'plant', 'bird'], cols: 5, jitter: .05, rowStep: .15, waterSpeed: .00638, leaks: [] },
  { id: 'library-03', name: '苔藓书柜', tip: '摆满一整层，水位会退下一截', sections: ['mushroom', 'plant', 'bird'], cols: 6, jitter: .06, rowStep: .15, waterSpeed: .00682, leaks: [] },
  { id: 'library-04', name: '老橡木书柜', tip: '水涨得更快了，先救低处的书', sections: ['mushroom', 'plant', 'bird', 'flower'], cols: 6, jitter: .07, rowStep: .155, waterSpeed: .00784, leaks: [] },
  { id: 'library-05', name: '漏雨的角落', tip: '湿书看不清，先放到右边的晾书架', sections: ['mushroom', 'plant', 'bird', 'flower'], cols: 6, jitter: .07, rowStep: .155, waterSpeed: .00516, leaks: [{ x: .5, min: 6, max: 8 }] },
].map(level => ({ ...level, seed: level.id }))

export const levelById = id => LIBRARY_LEVELS.find(level => level.id === id) || null

export function levelBooks(level) {
  return level.sections.flatMap(section => Array.from({ length: level.cols }, (_, i) => ({ id: `${section}-${i + 1}`, section, volume: i + 1 })))
}
```

`js/library/ShelfBoard.js`：

```js
export const SNAP_RADIUS = 36

export class ShelfBoard {
  constructor(sections, cols) {
    this.sections = sections.slice()
    this.cols = cols
    this.filled = new Map()
    this.damaged = new Set()
    this.completedRows = new Set()
  }

  keyOf(book) {
    const row = this.sections.indexOf(book.section)
    if (row < 0 || book.volume < 1 || book.volume > this.cols) return null
    return `${row}:${book.volume - 1}`
  }

  place(book, key) {
    if (!key || key !== this.keyOf(book) || this.filled.has(key) || this.damaged.has(key)) return false
    this.filled.set(key, book.id)
    return true
  }

  damage(book) {
    const key = this.keyOf(book)
    if (key && !this.filled.has(key)) this.damaged.add(key)
  }

  // Returns the row index the first time every undamaged slot in it is filled, otherwise -1.
  claimCompletedRow(key) {
    const row = Number(key.split(':')[0])
    if (this.completedRows.has(row)) return -1
    let filled = 0
    for (let col = 0; col < this.cols; col += 1) {
      const slot = `${row}:${col}`
      if (this.filled.has(slot)) filled += 1
      else if (!this.damaged.has(slot)) return -1
    }
    if (!filled) return -1
    this.completedRows.add(row)
    return row
  }
}

export function shelfLayout({ left, top, width, height, plaque = 40 }, rows, cols) {
  const cellW = (width - plaque) / cols, cellH = height / rows, slots = []
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      slots.push({ key: `${row}:${col}`, row, col, x: left + plaque + (col + .5) * cellW, y: top - (row + .5) * cellH, width: cellW, height: cellH })
    }
  }
  return slots
}

export function nearestSlot(slots, x, y, radius = SNAP_RADIUS) {
  let best = null, bestDistance = radius
  for (const slot of slots) {
    const distance = Math.hypot(slot.x - x, slot.y - y)
    if (distance <= bestDistance) { best = slot; bestDistance = distance }
  }
  return best ? best.key : null
}
```

- [ ] **Step 4: 运行，确认通过**

Run: `node --test tests/library-shelf.test.mjs`
Expected: PASS（6 tests）

- [ ] **Step 5: 提交**

```bash
git add js/library/LibraryRandom.js js/library/LibraryLevels.js js/library/ShelfBoard.js tests/library-shelf.test.mjs
git -c user.name=dev -c user.email=dev@rainy-mushroom.local commit -m "feat(library): levels and shelf board

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 书堆布局与遮挡

**Files:**
- Create: `js/library/BookPile.js`
- Test: `tests/library-pile.test.mjs`

**Interfaces:**
- Consumes: `SeededRandom`（Task 1）、`LIBRARY_LEVELS`、`levelBooks`
- Produces:
  - `BOOK_W=.14`、`BOOK_H=.16`（书堆区域归一化单位）；`COVER_LIMIT=.3`
  - `layoutPile(books,{seed,jitter=0,rowStep=.155,perRow=5})`：返回新数组，每本增加 `x,y`（中心点，0–1，y=0 是书堆底部）、`z`（0..n-1 互不相同）、`state:'floor'`、`wet:false`
  - `overlapRatio(a,b):number`（交叠面积 / 单本书面积）
  - `isCovered(book,books):boolean`（有 `state==='floor'` 且 `z` 更高的书盖住它超过 30%）

- [ ] **Step 1: 写失败测试** `tests/library-pile.test.mjs`

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { layoutPile, overlapRatio, isCovered, BOOK_W, BOOK_H } from '../js/library/BookPile.js'
import { LIBRARY_LEVELS, levelBooks } from '../js/library/LibraryLevels.js'

const pileOf = level => layoutPile(levelBooks(level), { seed: `${level.seed}:pile`, jitter: level.jitter, rowStep: level.rowStep })

test('pile layout is deterministic and stays inside the pile area above the start waterline', () => {
  for (const level of LIBRARY_LEVELS) {
    const pile = pileOf(level)
    assert.deepEqual(pile, pileOf(level))
    assert.deepEqual(pile.map(b => b.z).sort((a, b) => a - b), pile.map((_, i) => i))
    for (const book of pile) {
      assert.ok(book.x - BOOK_W / 2 >= 0 && book.x + BOOK_W / 2 <= 1, book.id)
      assert.ok(book.y - BOOK_H / 2 >= .12 && book.y + BOOK_H / 2 <= 1, book.id)
      assert.equal(book.state, 'floor')
      assert.equal(book.wet, false)
    }
  }
})

test('overlap ratio is symmetric and covers the whole book when identical', () => {
  const a = { x: .5, y: .5 }, b = { x: .5 + BOOK_W / 2, y: .5 }
  assert.ok(Math.abs(overlapRatio(a, a) - 1) < 1e-9)
  assert.ok(Math.abs(overlapRatio(a, b) - .5) < 1e-9)
  assert.equal(overlapRatio(a, b), overlapRatio(b, a))
  assert.equal(overlapRatio(a, { x: .9, y: .9 }), 0)
})

test('only a higher floor book covering more than 30% blocks a book', () => {
  const low = { id: 'a', x: .5, y: .5, z: 0, state: 'floor' }
  const top = { id: 'b', x: .5 + BOOK_W * .6, y: .5, z: 1, state: 'floor' }
  assert.equal(isCovered(low, [low, top]), true)
  assert.equal(isCovered(top, [low, top]), false)
  assert.equal(isCovered(low, [low, { ...top, state: 'held' }]), false)
  assert.equal(isCovered(low, [low, { ...top, x: .5 + BOOK_W * .75 }]), false, '25% overlap is not enough')
})

test('level 1 has no overlaps; every later level starts with at least one blocked book', () => {
  const overlaps = pile => pile.some(a => pile.some(b => a !== b && overlapRatio(a, b) > 0))
  assert.equal(overlaps(pileOf(LIBRARY_LEVELS[0])), false)
  for (const level of LIBRARY_LEVELS.slice(1)) {
    const pile = pileOf(level)
    assert.ok(pile.some(b => isCovered(b, pile)), level.id)
  }
})
```

- [ ] **Step 2: 运行，确认失败**

Run: `node --test tests/library-pile.test.mjs`
Expected: FAIL，找不到 `BookPile.js`

- [ ] **Step 3: 实现** `js/library/BookPile.js`

```js
import { SeededRandom } from './LibraryRandom.js'

export const BOOK_W = .14
export const BOOK_H = .16
export const COVER_LIMIT = .3

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

// Rows of up to `perRow` books rising from y=.28; jitter makes neighbours overlap from level 2 on.
export function layoutPile(books, { seed, jitter = 0, rowStep = .155, perRow = 5 }) {
  const random = new SeededRandom(seed)
  const order = random.shuffle(books)
  const layers = random.shuffle(order.map((_, i) => i))
  return order.map((book, i) => {
    const row = Math.floor(i / perRow), col = i % perRow
    const spacing = .8 / Math.min(perRow, order.length - row * perRow)
    const x = clamp(.1 + spacing * (col + .5) + (random.next() * 2 - 1) * jitter, BOOK_W / 2, 1 - BOOK_W / 2)
    const y = clamp(.28 + row * rowStep + (random.next() * 2 - 1) * jitter, BOOK_H / 2, 1 - BOOK_H / 2)
    return { ...book, x, y, z: layers[i], state: 'floor', wet: false }
  })
}

export function overlapRatio(a, b) {
  const w = Math.max(0, Math.min(a.x + BOOK_W / 2, b.x + BOOK_W / 2) - Math.max(a.x - BOOK_W / 2, b.x - BOOK_W / 2))
  const h = Math.max(0, Math.min(a.y + BOOK_H / 2, b.y + BOOK_H / 2) - Math.max(a.y - BOOK_H / 2, b.y - BOOK_H / 2))
  return (w * h) / (BOOK_W * BOOK_H)
}

export function isCovered(book, books) {
  return books.some(other => other !== book && other.state === 'floor' && other.z > book.z && overlapRatio(book, other) > COVER_LIMIT)
}
```

- [ ] **Step 4: 运行，确认通过**

Run: `node --test tests/library-pile.test.mjs`
Expected: PASS（4 tests）。设计阶段用同一算法模拟过：第 2–5 关开局被压住的书分别是 1 / 4 / 6 / 4 本。如果最后一个测试在某关失败，把该关 `jitter` 提高 0.01 后重跑，并在提交信息里说明。

- [ ] **Step 5: 提交**

```bash
git add js/library/BookPile.js tests/library-pile.test.mjs
git -c user.name=dev -c user.email=dev@rainy-mushroom.local commit -m "feat(library): book pile layout and covering

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: 水位与漏水点

**Files:**
- Create: `js/library/RainState.js`
- Test: `tests/library-rain.test.mjs`

**Interfaces:**
- Consumes: `SeededRandom`
- Produces: `class RainState({waterSpeed,leaks=[]}, random)`：`water:number∈[0,1]`、`advance(dt):number[]`（先涨水，再推进漏点计时，返回本步滴水的 x 列表）、`recede(amount)`（下限 0）

- [ ] **Step 1: 写失败测试** `tests/library-rain.test.mjs`

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { RainState } from '../js/library/RainState.js'
import { SeededRandom } from '../js/library/LibraryRandom.js'

test('water rises at the configured speed, caps at 1 and recedes to at least 0', () => {
  const rain = new RainState({ waterSpeed: .1 }, new SeededRandom('r'))
  rain.advance(2)
  assert.ok(Math.abs(rain.water - .2) < 1e-9)
  rain.advance(100)
  assert.equal(rain.water, 1)
  rain.recede(.3)
  assert.ok(Math.abs(rain.water - .7) < 1e-9)
  rain.recede(5)
  assert.equal(rain.water, 0)
})

test('leaks drip once per random interval inside their range', () => {
  const rain = new RainState({ waterSpeed: 0, leaks: [{ x: .5, min: 6, max: 8 }] }, new SeededRandom('leak'))
  const times = []
  for (let t = 0; t < 60; t = Math.round((t + .1) * 10) / 10) if (rain.advance(.1).length) times.push(t + .1)
  assert.ok(times.length >= 7 && times.length <= 10, String(times.length))
  times.forEach((time, i) => { const gap = time - (times[i - 1] ?? 0); assert.ok(gap >= 5.9 && gap <= 8.1, String(gap)) })
})

test('a long step reports every drip it covers', () => {
  const rain = new RainState({ waterSpeed: 0, leaks: [{ x: .3, min: 1, max: 1 }] }, new SeededRandom('long'))
  assert.deepEqual(rain.advance(3.05), [.3, .3, .3])
})
```

- [ ] **Step 2: 运行，确认失败**

Run: `node --test tests/library-rain.test.mjs`
Expected: FAIL，找不到 `RainState.js`

- [ ] **Step 3: 实现** `js/library/RainState.js`

```js
export class RainState {
  constructor({ waterSpeed, leaks = [] }, random) {
    this.water = 0
    this.speed = waterSpeed
    this.random = random
    this.leaks = leaks.map(leak => ({ ...leak, timer: this.interval(leak) }))
  }

  interval(leak) {
    return leak.min + this.random.next() * (leak.max - leak.min)
  }

  advance(dt) {
    this.water = Math.min(1, this.water + this.speed * dt)
    const drips = []
    for (const leak of this.leaks) {
      leak.timer -= dt
      while (leak.timer <= 0) {
        drips.push(leak.x)
        leak.timer += this.interval(leak)
      }
    }
    return drips
  }

  recede(amount) {
    this.water = Math.max(0, this.water - amount)
  }
}
```

- [ ] **Step 4: 运行，确认通过**

Run: `node --test tests/library-rain.test.mjs`
Expected: PASS（3 tests）

- [ ] **Step 5: 提交**

```bash
git add js/library/RainState.js tests/library-rain.test.mjs
git -c user.name=dev -c user.email=dev@rainy-mushroom.local commit -m "feat(library): rising water and leaks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: 一局状态机

**Files:**
- Create: `js/library/LibraryRound.js`
- Test: `tests/library-round.test.mjs`

**Interfaces:**
- Consumes: `ShelfBoard`、`layoutPile`/`isCovered`/`BOOK_W`/`BOOK_H`、`RainState`、`SeededRandom`、`levelBooks`
- Produces: `class LibraryRound(level,{seed=level.seed}={})`，常量 `HEARTS=3, ROW_RECEDE=.08, REVIVE_RECEDE=.3, RACK_SIZE=2, DRY_SECONDS=5, MAGNIFIER_SECONDS=8, DRIED_CLEARANCE=.15, MAX_STEP=.1`
  - 字段：`level`、`books`（`state∈floor|held|drying|shelved|soaked`，`wet:boolean`）、`shelf:ShelfBoard`、`hearts`、`status∈playing|reviving|won|lost`、`time`、`revived`、`rack:{id,left}[]`、`magnifierCharges`、`magnifierLeft`
  - getter：`water`、`remaining`（未上架且未泡坏的书数）
  - 方法：`book(id)`、`canPick(id)`、`pick(id):boolean`、`cancel(id)`、`drop(id,key):'shelved'|'rejected'`、`dropToRack(id):boolean`、`useMagnifier():boolean`、`grantMagnifier()`、`hintSlot(id):string|null`、`revive():boolean`、`giveUp()`、`update(dt)`、`drain():Event[]`
  - 事件：`{type:'shelved',id,key}`、`{type:'row',row}`、`{type:'wet',id}`、`{type:'dried',id}`、`{type:'soaked',id}`、`{type:'won'}`

- [ ] **Step 1: 写失败测试** `tests/library-round.test.mjs`

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { LibraryRound, HEARTS, RACK_SIZE, MAGNIFIER_SECONDS } from '../js/library/LibraryRound.js'
import { BOOK_H } from '../js/library/BookPile.js'

const level = (patch = {}) => ({ id: 't', seed: 't', sections: ['mushroom', 'plant'], cols: 2, jitter: 0, rowStep: .3, waterSpeed: 0, leaks: [], ...patch })
const shelve = (round, book) => { assert.equal(round.pick(book.id), true); return round.drop(book.id, round.shelf.keyOf(book)) }
const free = round => round.books.find(b => round.canPick(b.id))

test('correct drops shelve, wrong or empty drops return the book to the floor', () => {
  const round = new LibraryRound(level()), book = free(round), other = round.books.find(b => b !== book)
  assert.equal(round.pick(book.id), true)
  assert.equal(round.drop(book.id, round.shelf.keyOf(other)), 'rejected')
  assert.equal(book.state, 'floor')
  round.pick(book.id)
  assert.equal(round.drop(book.id, null), 'rejected', 'released outside the shelf')
  assert.equal(book.state, 'floor')
  assert.equal(shelve(round, book), 'shelved')
  assert.equal(book.state, 'shelved')
  assert.equal(round.remaining, 3)
  assert.deepEqual(round.drain()[0], { type: 'shelved', id: book.id, key: round.shelf.keyOf(book) })
  assert.deepEqual(round.drain(), [])
})

test('only one book can be held at a time and covered books cannot be picked', () => {
  const round = new LibraryRound(level()), [a, b] = round.books
  b.x = a.x; b.y = a.y; b.z = a.z + 1
  assert.equal(round.canPick(a.id), false)
  assert.equal(round.pick(b.id), true)
  assert.equal(round.pick(round.books[2].id), false)
  round.cancel(b.id)
  assert.equal(b.state, 'floor')
})

test('water soaks floor books, damages their slot and costs a heart', () => {
  const round = new LibraryRound(level({ waterSpeed: 1 })), low = round.books[0]
  for (const book of round.books.slice(1)) book.y = .8
  round.rain.water = low.y - BOOK_H / 2 - .01
  round.update(.02)
  assert.equal(low.state, 'soaked')
  assert.equal(round.hearts, HEARTS - 1)
  assert.ok(round.shelf.damaged.has(round.shelf.keyOf(low)))
  assert.ok(round.drain().some(e => e.type === 'soaked' && e.id === low.id))
})

test('a held book is safe from water', () => {
  const round = new LibraryRound(level()), book = free(round)
  round.pick(book.id)
  round.rain.water = 1
  round.update(.1)
  assert.equal(book.state, 'held')
})

test('a long frame advances at most MAX_STEP so returning from background cannot flood the pile', () => {
  const round = new LibraryRound(level({ waterSpeed: .1 }))
  round.update(60)
  assert.ok(round.time <= .1 + 1e-9)
  assert.ok(round.water <= .01 + 1e-9)
})

test('completing a row recedes water once', () => {
  const round = new LibraryRound(level())
  round.rain.water = .5
  for (const book of round.books.filter(b => b.section === 'mushroom')) shelve(round, book)
  assert.ok(Math.abs(round.water - .42) < 1e-9)
  assert.ok(round.drain().some(e => e.type === 'row' && e.row === 0))
})

test('shelving the last book wins; soaking the last book also ends the round', () => {
  const round = new LibraryRound(level())
  for (const book of round.books) shelve(round, book)
  assert.equal(round.status, 'won')
  const second = new LibraryRound(level())
  for (const book of second.books.slice(0, 3)) shelve(second, book)
  second.rain.water = 1
  second.update(.1)
  assert.equal(second.status, 'won')
  assert.equal(second.hearts, HEARTS - 1)
})

test('losing all hearts waits for revive; revive works once, then the next loss ends the round', () => {
  const round = new LibraryRound(level({ sections: ['mushroom', 'plant', 'bird', 'flower'], cols: 2 }))
  round.rain.water = .6
  for (const book of round.books) book.y = .3
  round.update(.1)
  assert.equal(round.status, 'reviving')
  assert.equal(round.hearts, 0)
  const held = round.books.find(b => b.state === 'floor')
  assert.equal(round.pick(held.id), false, 'no picking while waiting')
  assert.equal(round.useMagnifier(), false)
  assert.equal(round.revive(), true)
  assert.equal(round.hearts, HEARTS)
  assert.ok(Math.abs(round.water - .3) < 1e-9)
  assert.equal(round.revive(), false)
  round.rain.water = .6
  round.update(.1)
  assert.equal(round.status, 'lost')
})

test('dropping while the round is not playing is rejected', () => {
  const round = new LibraryRound(level()), book = free(round)
  round.pick(book.id)
  round.status = 'reviving'
  assert.equal(round.drop(book.id, round.shelf.keyOf(book)), 'rejected')
  assert.equal(book.state, 'floor')
})

test('give up only ends a round that is waiting for revive', () => {
  const round = new LibraryRound(level())
  round.giveUp()
  assert.equal(round.status, 'playing')
  round.status = 'reviving'
  round.giveUp()
  assert.equal(round.status, 'lost')
})

test('leaks wet the top floor book under them; wet books cannot be shelved and dry on the rack', () => {
  const round = new LibraryRound(level({ leaks: [{ x: .5, min: 1, max: 1 }] }))
  const [a, b] = round.books
  a.x = .5; b.x = .5; b.y = a.y + .3; b.z = a.z + 10
  round.update(.1); for (let i = 0; i < 10; i += 1) round.update(.1)
  assert.equal(b.wet, true)
  assert.equal(a.wet, false)
  round.drain()
  assert.equal(round.pick(b.id), true)
  assert.equal(round.drop(b.id, round.shelf.keyOf(b)), 'rejected')
  round.pick(b.id)
  assert.equal(round.dropToRack(b.id), true)
  assert.equal(b.state, 'drying')
  for (const other of round.books) if (other !== b) other.state = 'shelved'
  round.rain.water = .7
  round.rain.leaks = []
  for (let i = 0; i < 49; i += 1) round.update(.1)
  assert.equal(b.state, 'drying', 'drying books are not soaked')
  round.update(.1); round.update(.1)
  assert.equal(b.state, 'floor')
  assert.equal(b.wet, false)
  assert.ok(b.z > Math.max(...round.books.filter(o => o !== b).map(o => o.z)))
  assert.equal(b.y, 1 - BOOK_H / 2, 'no room above water: highest spot')
  assert.ok(round.drain().some(e => e.type === 'dried' && e.id === b.id))
})

test('dried books sit at least 0.15 above the water', () => {
  const round = new LibraryRound(level())
  const book = free(round)
  book.wet = true
  round.pick(book.id)
  round.dropToRack(book.id)
  round.rain.water = .1
  for (let i = 0; i < 51; i += 1) round.update(.1)
  assert.equal(book.state, 'floor')
  assert.ok(book.y - BOOK_H / 2 >= .1 + .15 - 1e-9)
})

test('the rack holds two books and refuses dry books', () => {
  const round = new LibraryRound(level({ sections: ['mushroom', 'plant'], cols: 3 }))
  const books = round.books.filter(b => round.canPick(b.id)).slice(0, RACK_SIZE + 2)
  books.forEach(b => { b.wet = true })
  for (const b of books.slice(0, RACK_SIZE)) { round.pick(b.id); assert.equal(round.dropToRack(b.id), true) }
  round.pick(books[RACK_SIZE].id)
  assert.equal(round.dropToRack(books[RACK_SIZE].id), false)
  assert.equal(books[RACK_SIZE].state, 'floor')
  const dry = round.books.find(b => round.canPick(b.id) && !b.wet)
  round.pick(dry.id)
  assert.equal(round.dropToRack(dry.id), false)
})

test('magnifier: one free charge, lasts 8 seconds, hints the right slot, extra charges from ads', () => {
  const round = new LibraryRound(level()), book = round.books[0]
  assert.equal(round.hintSlot(book.id), null)
  assert.equal(round.useMagnifier(), true)
  assert.equal(round.useMagnifier(), false, 'already active')
  assert.equal(round.hintSlot(book.id), round.shelf.keyOf(book))
  for (let i = 0; i < MAGNIFIER_SECONDS * 10 + 1; i += 1) round.update(.1)
  assert.equal(round.hintSlot(book.id), null)
  assert.equal(round.useMagnifier(), false, 'no charges left')
  round.grantMagnifier()
  assert.equal(round.useMagnifier(), true)
  book.wet = true
  assert.equal(round.hintSlot(book.id), null, 'wet books give no hint')
})
```

- [ ] **Step 2: 运行，确认失败**

Run: `node --test tests/library-round.test.mjs`
Expected: FAIL，找不到 `LibraryRound.js`

- [ ] **Step 3: 实现** `js/library/LibraryRound.js`

```js
import { ShelfBoard } from './ShelfBoard.js'
import { layoutPile, isCovered, BOOK_W, BOOK_H } from './BookPile.js'
import { RainState } from './RainState.js'
import { SeededRandom } from './LibraryRandom.js'
import { levelBooks } from './LibraryLevels.js'

export const HEARTS = 3
export const ROW_RECEDE = .08
export const REVIVE_RECEDE = .3
export const RACK_SIZE = 2
export const DRY_SECONDS = 5
export const MAGNIFIER_SECONDS = 8
export const DRIED_CLEARANCE = .15
export const MAX_STEP = .1

export class LibraryRound {
  constructor(level, { seed = level.seed } = {}) {
    this.level = level
    this.books = layoutPile(levelBooks(level), { seed: `${seed}:pile`, jitter: level.jitter, rowStep: level.rowStep })
    this.shelf = new ShelfBoard(level.sections, level.cols)
    this.rain = new RainState(level, new SeededRandom(seed))
    this.hearts = HEARTS
    this.status = 'playing'
    this.time = 0
    this.revived = false
    this.rack = []
    this.magnifierCharges = 1
    this.magnifierLeft = 0
    this.events = []
  }

  get water() { return this.rain.water }

  get remaining() { return this.books.filter(b => b.state !== 'shelved' && b.state !== 'soaked').length }

  book(id) { return this.books.find(b => b.id === id) || null }

  canPick(id) {
    const book = this.book(id)
    return !!book && this.status === 'playing' && book.state === 'floor' && !this.books.some(b => b.state === 'held') && !isCovered(book, this.books)
  }

  pick(id) {
    if (!this.canPick(id)) return false
    this.book(id).state = 'held'
    return true
  }

  cancel(id) {
    const book = this.book(id)
    if (book?.state === 'held') book.state = 'floor'
  }

  drop(id, key) {
    const book = this.book(id)
    if (book?.state !== 'held') return 'rejected'
    if (this.status !== 'playing' || book.wet || !this.shelf.place(book, key)) {
      book.state = 'floor'
      return 'rejected'
    }
    book.state = 'shelved'
    this.events.push({ type: 'shelved', id, key })
    const row = this.shelf.claimCompletedRow(key)
    if (row >= 0) {
      this.rain.recede(ROW_RECEDE)
      this.events.push({ type: 'row', row })
    }
    this.checkWin()
    return 'shelved'
  }

  dropToRack(id) {
    const book = this.book(id)
    if (book?.state !== 'held') return false
    if (this.status !== 'playing' || !book.wet || this.rack.length >= RACK_SIZE) {
      book.state = 'floor'
      return false
    }
    book.state = 'drying'
    this.rack.push({ id, left: DRY_SECONDS })
    return true
  }

  useMagnifier() {
    if (this.status !== 'playing' || this.magnifierCharges <= 0 || this.magnifierLeft > 0) return false
    this.magnifierCharges -= 1
    this.magnifierLeft = MAGNIFIER_SECONDS
    return true
  }

  grantMagnifier() { this.magnifierCharges += 1 }

  hintSlot(id) {
    const book = this.book(id)
    return this.magnifierLeft > 0 && book && !book.wet ? this.shelf.keyOf(book) : null
  }

  revive() {
    if (this.status !== 'reviving' || this.revived) return false
    this.revived = true
    this.hearts = HEARTS
    this.rain.recede(REVIVE_RECEDE)
    this.status = 'playing'
    return true
  }

  giveUp() {
    if (this.status === 'reviving') this.status = 'lost'
  }

  drain() {
    const events = this.events
    this.events = []
    return events
  }

  update(dt) {
    if (this.status !== 'playing' || !(dt > 0)) return
    const step = Math.min(dt, MAX_STEP)
    this.time += step
    this.magnifierLeft = Math.max(0, this.magnifierLeft - step)
    for (const x of this.rain.advance(step)) this.drip(x)
    this.dry(step)
    this.soak()
  }

  drip(x) {
    const top = this.books.filter(b => b.state === 'floor' && Math.abs(b.x - x) <= BOOK_W / 2).sort((a, b) => b.z - a.z)[0]
    if (!top || top.wet) return
    top.wet = true
    this.events.push({ type: 'wet', id: top.id })
  }

  dry(dt) {
    for (const slot of this.rack) slot.left -= dt
    for (const slot of this.rack.filter(s => s.left <= 0)) {
      const book = this.book(slot.id)
      book.wet = false
      book.state = 'floor'
      book.z = Math.max(...this.books.map(b => b.z)) + 1
      book.y = Math.min(1 - BOOK_H / 2, Math.max(book.y, this.rain.water + DRIED_CLEARANCE + BOOK_H / 2))
      this.events.push({ type: 'dried', id: book.id })
    }
    this.rack = this.rack.filter(s => s.left > 0)
  }

  soak() {
    for (const book of this.books) {
      if (book.state !== 'floor' || this.rain.water < book.y - BOOK_H / 2) continue
      book.state = 'soaked'
      this.shelf.damage(book)
      this.hearts -= 1
      this.events.push({ type: 'soaked', id: book.id })
      if (this.hearts <= 0) {
        this.status = this.revived ? 'lost' : 'reviving'
        return
      }
    }
    this.checkWin()
  }

  checkWin() {
    if (this.status !== 'playing' || this.remaining) return
    this.status = 'won'
    this.events.push({ type: 'won' })
  }
}
```

- [ ] **Step 4: 运行，确认通过**

Run: `node --test tests/library-round.test.mjs`
Expected: PASS（14 tests）

- [ ] **Step 5: 提交**

```bash
git add js/library/LibraryRound.js tests/library-round.test.mjs
git -c user.name=dev -c user.email=dev@rainy-mushroom.local commit -m "feat(library): round state machine

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: 自动玩家、水速调参与通关回归

**Files:**
- Create: `js/library/LibraryAutoplay.js`, `scripts/library/tune-water.mjs`
- Modify (仅当调参结果与现值不同): `js/library/LibraryLevels.js` 的 `waterSpeed`
- Test: `tests/library-autoplay.test.mjs`

**Interfaces:**
- Consumes: `LibraryRound`、`RACK_SIZE`、`LIBRARY_LEVELS`
- Produces: `autoplay(level,{interval=3,step=.1,seed,maxTime=600}={}): {status:'won'|'lost',soaked:number,time:number}`（每 `interval` 秒执行一个动作：可拿到的湿书且晾书架有空位就先晾，否则上架 y 最低的可拿干书；复活等待按失败计）

- [ ] **Step 1: 写失败测试** `tests/library-autoplay.test.mjs`

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { autoplay } from '../js/library/LibraryAutoplay.js'
import { LIBRARY_LEVELS } from '../js/library/LibraryLevels.js'

test('a player spending 3 seconds per book clears all five levels without losing a book', () => {
  for (const level of LIBRARY_LEVELS) {
    const result = autoplay(level, { interval: 3 })
    assert.equal(result.status, 'won', level.id)
    assert.equal(result.soaked, 0, level.id)
  }
})

test('rounds last between half a minute (tutorial) and two minutes', () => {
  const times = LIBRARY_LEVELS.map(level => autoplay(level, { interval: 3 }).time)
  assert.ok(times[0] >= 25, String(times[0]))
  for (const time of times) assert.ok(time <= 120, String(time))
  for (const time of times.slice(3)) assert.ok(time >= 60, String(time))
})

test('pressure: at 4.5 seconds per book levels 4 and 5 lose books', () => {
  for (const level of LIBRARY_LEVELS.slice(3)) assert.ok(autoplay(level, { interval: 4.5 }).soaked >= 1, level.id)
})

test('the early levels forgive a slow player', () => {
  for (const level of LIBRARY_LEVELS.slice(0, 2)) assert.equal(autoplay(level, { interval: 4.5 }).status, 'won', level.id)
})
```

- [ ] **Step 2: 运行，确认失败**

Run: `node --test tests/library-autoplay.test.mjs`
Expected: FAIL，找不到 `LibraryAutoplay.js`

- [ ] **Step 3: 实现** `js/library/LibraryAutoplay.js`

```js
import { LibraryRound, RACK_SIZE } from './LibraryRound.js'

// Scripted player for tuning and regression: one action every `interval` seconds, lowest reachable book first.
export function autoplay(level, { interval = 3, step = .1, seed, maxTime = 600 } = {}) {
  const round = new LibraryRound(level, seed === undefined ? {} : { seed })
  let wait = interval
  while (round.status === 'playing' && round.time < maxTime) {
    round.update(step)
    wait -= step
    if (wait > 1e-9) continue
    wait += interval
    act(round)
  }
  const soaked = round.books.filter(b => b.state === 'soaked').length
  return { status: round.status === 'won' ? 'won' : 'lost', soaked, time: round.time }
}

function act(round) {
  const reachable = round.books.filter(b => round.canPick(b.id)).sort((a, b) => a.y - b.y)
  const wet = reachable.find(b => b.wet)
  if (wet && round.rack.length < RACK_SIZE) {
    round.pick(wet.id)
    round.dropToRack(wet.id)
    return
  }
  const dry = reachable.find(b => !b.wet)
  if (!dry) return
  round.pick(dry.id)
  round.drop(dry.id, round.shelf.keyOf(dry))
}
```

`scripts/library/tune-water.mjs`：

```js
import { LIBRARY_LEVELS } from '../../js/library/LibraryLevels.js'
import { autoplay } from '../../js/library/LibraryAutoplay.js'

// Fraction of the fastest safe water speed for a 3s-per-book player; lower is gentler.
const FACTORS = { 'library-01': .35, 'library-02': .5, 'library-03': .6, 'library-04': .7, 'library-05': .7 }

for (const level of LIBRARY_LEVELS) {
  let low = 0, high = .05
  for (let i = 0; i < 30; i += 1) {
    const mid = (low + high) / 2, result = autoplay({ ...level, waterSpeed: mid }, { interval: 3 })
    if (result.status === 'won' && result.soaked === 0) low = mid
    else high = mid
  }
  const speed = Number((low * FACTORS[level.id]).toFixed(5))
  console.log(`${level.id} max ${low.toFixed(5)} use ${speed}${speed === level.waterSpeed ? '' : `  (current ${level.waterSpeed})`}`)
}
```

- [ ] **Step 4: 调参**

Run: `node scripts/library/tune-water.mjs`
Expected（设计阶段用同一算法模拟的结果）：

```
library-01 max 0.01333 use 0.00467
library-02 max 0.01276 use 0.00638
library-03 max 0.01137 use 0.00682
library-04 max 0.01120 use 0.00784
library-05 max 0.00737 use 0.00516
```

如果某行出现 `(current …)`，把 `LibraryLevels.js` 中该关的 `waterSpeed` 改成 `use` 后面的值。

- [ ] **Step 5: 运行，确认通过**

Run: `node --test tests/library-autoplay.test.mjs`
Expected: PASS（4 tests）。模拟基准：3 秒/本时各关用时 30 / 45 / 54 / 72 / 96 秒；4.5 秒/本时第 4 关泡坏 1 本、第 5 关失败。如果 "pressure" 测试在第 4 关失败，把 `FACTORS['library-04']` 提到 .75，重跑 Step 4 和本步。

- [ ] **Step 6: 跑全部图书馆测试**

Run: `node --test tests/library-*.test.mjs`
Expected: 全部 PASS

- [ ] **Step 7: 提交**

```bash
git add js/library/LibraryAutoplay.js scripts/library/tune-water.mjs tests/library-autoplay.test.mjs js/library/LibraryLevels.js
git -c user.name=dev -c user.email=dev@rainy-mushroom.local commit -m "feat(library): autoplay tuning and clear-rate regression

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: 通关存档

**Files:**
- Create: `js/library/LibraryProgress.js`
- Test: `tests/library-progress.test.mjs`

**Interfaces:**
- Consumes: `LIBRARY_LEVELS`
- Produces: `LIBRARY_PROGRESS_KEY='rainyLibrary.progress.v1'`；`class LibraryProgress(storage)`：`completed:string[]`（按关卡顺序）、`saved:boolean`、`locked:boolean`（存档读不懂或来自未来版本，此时只在内存里记进度）、`next:string`、`lit:number`、`canOpen(id)`、`complete(id):boolean`

- [ ] **Step 1: 写失败测试** `tests/library-progress.test.mjs`

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { LibraryProgress, LIBRARY_PROGRESS_KEY } from '../js/library/LibraryProgress.js'

const memory = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), m } }

test('levels unlock in order and completion persists', () => {
  const db = memory(), p = new LibraryProgress(db)
  assert.equal(p.next, 'library-01')
  assert.equal(p.canOpen('library-02'), false)
  assert.equal(p.complete('library-02'), false)
  assert.equal(p.complete('library-01'), true)
  assert.equal(p.complete('library-01'), true)
  const again = new LibraryProgress(db)
  assert.deepEqual(again.completed, ['library-01'])
  assert.equal(again.lit, 1)
  assert.equal(again.next, 'library-02')
  assert.equal(again.canOpen('library-02'), true)
  assert.deepEqual(JSON.parse(db.getItem(LIBRARY_PROGRESS_KEY)), { version: 1, completed: ['library-01'] })
})

test('unknown ids in a save are dropped and after the last level next stays on it', () => {
  const db = memory()
  db.setItem(LIBRARY_PROGRESS_KEY, JSON.stringify({ version: 1, completed: ['library-02', 'x', 'library-01', 'library-03', 'library-04', 'library-05'] }))
  const p = new LibraryProgress(db)
  assert.deepEqual(p.completed, ['library-01', 'library-02', 'library-03', 'library-04', 'library-05'])
  assert.equal(p.next, 'library-05')
})

test('corrupt or future saves are never overwritten', () => {
  for (const raw of ['{broken', JSON.stringify({ version: 2, completed: [] }), JSON.stringify({ version: 1 })]) {
    const db = memory()
    db.setItem(LIBRARY_PROGRESS_KEY, raw)
    const p = new LibraryProgress(db)
    assert.equal(p.locked, true)
    assert.equal(p.complete('library-01'), false)
    assert.deepEqual(p.completed, ['library-01'], 'still tracked in memory')
    assert.equal(db.getItem(LIBRARY_PROGRESS_KEY), raw)
  }
})

test('storage failures do not throw', () => {
  const broken = { getItem: () => { throw Error('denied') }, setItem: () => { throw Error('full') } }
  const p = new LibraryProgress(broken)
  assert.equal(p.complete('library-01'), false)
  assert.equal(p.saved, false)
  const full = memory()
  full.setItem = () => { throw Error('full') }
  const q = new LibraryProgress(full)
  assert.equal(q.complete('library-01'), false)
  assert.equal(q.saved, false)
  assert.deepEqual(q.completed, ['library-01'])
})
```

- [ ] **Step 2: 运行，确认失败**

Run: `node --test tests/library-progress.test.mjs`
Expected: FAIL，找不到 `LibraryProgress.js`

- [ ] **Step 3: 实现** `js/library/LibraryProgress.js`

```js
import { LIBRARY_LEVELS } from './LibraryLevels.js'

export const LIBRARY_PROGRESS_KEY = 'rainyLibrary.progress.v1'
const ids = LIBRARY_LEVELS.map(level => level.id)

export class LibraryProgress {
  constructor(storage) {
    this.storage = storage
    this.completed = []
    this.saved = true
    this.locked = false
    let raw = null
    try { raw = storage.getItem(LIBRARY_PROGRESS_KEY) } catch { this.lock(); return }
    if (!raw) return
    try {
      const data = JSON.parse(raw)
      if (data?.version === 1 && Array.isArray(data.completed)) {
        this.completed = ids.filter(id => data.completed.includes(id))
        return
      }
    } catch {}
    // Unreadable or newer saves stay untouched; this session's progress lives in memory only.
    this.lock()
  }

  lock() {
    this.locked = true
    this.saved = false
  }

  get next() { return ids.find(id => !this.completed.includes(id)) || ids[ids.length - 1] }

  get lit() { return this.completed.length }

  canOpen(id) {
    const index = ids.indexOf(id)
    return index >= 0 && ids.slice(0, index).every(prior => this.completed.includes(prior))
  }

  complete(id) {
    if (!this.canOpen(id)) return false
    if (!this.completed.includes(id)) this.completed = ids.filter(level => level === id || this.completed.includes(level))
    if (this.locked) return false
    try {
      this.storage.setItem(LIBRARY_PROGRESS_KEY, JSON.stringify({ version: 1, completed: this.completed }))
      this.saved = true
      return true
    } catch {
      this.saved = false
      return false
    }
  }
}
```

- [ ] **Step 4: 运行，确认通过**

Run: `node --test tests/library-progress.test.mjs`
Expected: PASS（4 tests）

- [ ] **Step 5: 提交**

```bash
git add js/library/LibraryProgress.js tests/library-progress.test.mjs
git -c user.name=dev -c user.email=dev@rainy-mushroom.local commit -m "feat(library): progress save

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: 同步到 Cocos 并切换入口

**Files:**
- Modify: `scripts/cocos/sync-shared.mjs`（第 6–7 行的依赖检查；文件末尾的 `visit(...)` 列表）
- Modify: `tests/forest-cleanup.test.mjs:15`（manifest 前缀断言）
- Modify: `cocos-pilot/assets/scripts/PinePilot.ts`
- Modify: `cocos-pilot/build-configs/wechatgame.json:13`
- Create: `cocos-pilot/assets/scripts/LibraryView.ts`（本任务只放最小可见版本，Task 8 补全）
- Test: `tests/library-sync.test.mjs`

**Interfaces:**
- Consumes: Task 1–6 的全部模块
- Produces: 生成文件 `cocos-pilot/assets/scripts/shared/js/library/{LibraryRound,LibraryProgress,LibraryLevels,ShelfBoard,BookPile,RainState,LibraryRandom}.ts`；`class LibraryView(host)`，含 `update(dt)`、`render()`、`destroy()`。`host` 是 `PinePilot`，提供 `canvas:Node`、`safeTop`、`safeBottom`、`progressStorage`。

- [ ] **Step 1: 写失败测试** `tests/library-sync.test.mjs`

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const root = new URL('../', import.meta.url), read = p => readFileSync(new URL(p, root), 'utf8')

test('sync copies the library modules into the Cocos project', () => {
  const run = spawnSync(process.execPath, [new URL('scripts/cocos/sync-shared.mjs', root).pathname], { encoding: 'utf8' })
  assert.equal(run.status, 0, run.stderr)
  for (const name of ['LibraryRound', 'LibraryProgress', 'LibraryLevels', 'ShelfBoard', 'BookPile', 'RainState', 'LibraryRandom']) {
    assert.ok(existsSync(new URL(`cocos-pilot/assets/scripts/shared/js/library/${name}.ts`, root)), name)
  }
  const sources = JSON.parse(read('cocos-pilot/shared-manifest.json')).map(m => m.source)
  assert.ok(sources.includes('js/library/LibraryRound.js'))
  assert.ok(!sources.includes('js/library/LibraryAutoplay.js'), 'test-only helper stays out of the build')
})

test('the default entry is the library; forest review parameters still reach the old view', () => {
  const host = read('cocos-pilot/assets/scripts/PinePilot.ts')
  assert.match(host, /new LibraryView\(this\)/)
  assert.match(host, /\['forest','audit','review','microSmoke','campaignSmoke'\]/)
  assert.equal(JSON.parse(read('cocos-pilot/build-configs/wechatgame.json')).packages.wechatgame.orientation, 'portrait')
})
```

- [ ] **Step 2: 运行，确认失败**

Run: `node --test tests/library-sync.test.mjs`
Expected: FAIL，同步脚本报 `Unexpected gameplay dependency`（或生成文件不存在）

- [ ] **Step 3: 修改同步脚本** `scripts/cocos/sync-shared.mjs`

把：

```js
 if(!file.startsWith(root+'/js/microforest/'))throw Error('Unexpected gameplay dependency: '+file);
```

改成：

```js
 if(!file.startsWith(root+'/js/microforest/')&&!file.startsWith(root+'/js/library/'))throw Error('Unexpected gameplay dependency: '+file);
```

在 `visit(resolve(root,'js/microforest/LongCampaignReplay.js'));` 下一行加：

```js
visit(resolve(root,'js/library/LibraryRound.js'));
visit(resolve(root,'js/library/LibraryProgress.js'));
```

把最后的 `console.log` 改成：

```js
console.log(`Synced ${seen.size} shared gameplay module(s)`);
```

- [ ] **Step 4: 放宽旧测试的前缀断言** `tests/forest-cleanup.test.mjs` 第 15 行

把 `assert.ok(shared.every(m=>m.source.startsWith('js/microforest/')));` 改成：

```js
assert.ok(shared.every(m=>m.source.startsWith('js/microforest/')||m.source.startsWith('js/library/')));
```

（同一测试下一行的资源目录断言，本来就因为用户未提交的 `microforest-motion` 失败，不要改。）

- [ ] **Step 5: 最小 `LibraryView.ts`** `cocos-pilot/assets/scripts/LibraryView.ts`

```ts
import {Node,view} from 'cc';
import {PilotUI} from './PilotUI';
import {LIBRARY_LEVELS} from './shared/js/library/LibraryLevels';

// Grey-box rainy library. Task 8 fills in the menu, round screen and dialogs.
export class LibraryView{
 u:PilotUI;
 constructor(private host:any){const s=view.getVisibleSize();this.u=new PilotUI(host.canvas,s.width,s.height,host.safeTop,host.safeBottom);this.render()}
 render(){const s=view.getVisibleSize();this.u.destroy();this.u=new PilotUI(this.host.canvas,s.width,s.height,this.host.safeTop,this.host.safeBottom);this.u.box(this.u.root,undefined,0);this.u.text(`雨后森林图书馆 · ${LIBRARY_LEVELS.length} 关`,this.u.root).setPosition(0,0)}
 update(_dt:number){}
 destroy(){this.u.destroy()}
}
```

- [ ] **Step 6: 切换入口** `cocos-pilot/assets/scripts/PinePilot.ts`

6a. 在 `import {runMicroForestSmoke} from './MicroForestSmoke';` 下一行加：

```ts
import {LibraryView} from './LibraryView';
```

6b. 把类字段行

```ts
 canvas!:Node;microforest:MicroForestView|null=null;captureMode=false;
```

改成：

```ts
 canvas!:Node;microforest:MicroForestView|null=null;library:LibraryView|null=null;captureMode=false;
```

6c. 在 `start()` 里，把片段

```ts
profiler.hideStats();this.measureSafeArea();this.microforest=new MicroForestView(this);
```

改成（旧的评审和冒烟参数仍然进入森林）：

```ts
profiler.hideStats();this.measureSafeArea();
  const query=sys.isBrowser?new URLSearchParams(window.location.search):null;
  if(!query||!['forest','audit','review','microSmoke','campaignSmoke'].some(k=>query.has(k))){this.library=new LibraryView(this);view.on('canvas-resize',this.resize,this);if(sys.isBrowser){window.addEventListener('resize',this.browserResize);this.browserResize();}return;}
  this.microforest=new MicroForestView(this);
```

6d. 把下面三个方法

```ts
 update(dt:number){this.microforest?.update(this.captureMode?0:dt)}
```
```ts
 private resize(){this.measureSafeArea();this.microforest?.render()}
```
```ts
 onDestroy(){if(sys.isBrowser)window.removeEventListener('resize',this.browserResize);view.off('canvas-resize',this.resize,this);this.microforest?.destroy();this.microforest=null}
```

分别改成：

```ts
 update(dt:number){this.library?.update(dt);this.microforest?.update(this.captureMode?0:dt)}
```
```ts
 private resize(){this.measureSafeArea();this.library?.render();this.microforest?.render()}
```
```ts
 onDestroy(){if(sys.isBrowser)window.removeEventListener('resize',this.browserResize);view.off('canvas-resize',this.resize,this);this.library?.destroy();this.library=null;this.microforest?.destroy();this.microforest=null}
```

- [ ] **Step 7: 微信竖屏** `cocos-pilot/build-configs/wechatgame.json`

把 `"orientation": "landscape",` 改成 `"orientation": "portrait",`。

- [ ] **Step 8: 运行测试**

Run: `node --test tests/library-*.test.mjs && npm run check`
Expected: 全部 PASS；`npm run check` 输出 `Forest source syntax and dependency checks passed`

Run: `npm test 2>&1 | grep -E "^# (pass|fail)"`
Expected: 只有基线那 1 项失败（`retired runtime and resource bundles cannot reenter builds`，报错在资源目录那一行，不是 manifest 前缀那一行）

- [ ] **Step 9: 构建并看一眼**

Run: `npm run cocos:build`
Expected: 输出 `Built web-mobile: ...`。然后 `npm run preview`，浏览器用手机尺寸（开发者工具设备模拟，比如 iPhone 12 Pro 390×844）打开终端显示的地址，能看到"雨后森林图书馆 · 5 关"。URL 加 `?forest=1` 仍进入旧横版。

- [ ] **Step 10: 提交**（生成的 `shared/js/library/*.ts`、`.meta` 文件和 `shared-manifest.json` 一起提交；不要添加其他被构建改动的文件）

```bash
git add scripts/cocos/sync-shared.mjs tests/forest-cleanup.test.mjs tests/library-sync.test.mjs cocos-pilot/assets/scripts/LibraryView.ts cocos-pilot/assets/scripts/PinePilot.ts cocos-pilot/build-configs/wechatgame.json cocos-pilot/assets/scripts/shared/js/library cocos-pilot/shared-manifest.json
git add cocos-pilot/assets/scripts/LibraryView.ts.meta cocos-pilot/assets/scripts/shared/js/library.meta 2>/dev/null || true
git -c user.name=dev -c user.email=dev@rainy-mushroom.local commit -m "feat(library): sync to cocos and make the library the default entry

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

注意：`PinePilot.ts` 和 `wechatgame.json` 本来就有用户未提交的改动，提交时会把这些改动一并带进来。提交前先跑 `git diff cocos-pilot/assets/scripts/PinePilot.ts cocos-pilot/build-configs/wechatgame.json` 看一下；如果其中有和本任务无关的改动，用 `git add -p` 只暂存本任务的块。

---

### Task 8: 灰盒画面与交互

**Files:**
- Modify: `cocos-pilot/assets/scripts/LibraryView.ts`（整体替换 Task 7 的最小版本）

**Interfaces:**
- Consumes: `LibraryRound`（全部公开方法、事件、常量 `RACK_SIZE`）、`LibraryProgress`、`LIBRARY_LEVELS`、`SECTIONS`、`levelById`、`shelfLayout`、`nearestSlot`、`BOOK_W`、`BOOK_H`、`PilotUI`
- Produces: 与 Task 7 相同的 `LibraryView(host)`、`update(dt)`、`render()`、`destroy()`

画面由三部分组成：
- **图书馆页（menu）**：标题、5 格全景（已通关的亮色，未通关的灰色）、5 个关卡按钮（没解锁的灰掉）。存档被锁时显示一行"存档无法读取，本次进度不会保存"。
- **一局（round）**：顶栏；书柜在上面约 55%；书堆在下面，底部是水位；有漏水点的关卡右侧留 64px 的晾书架。
- **弹窗**：暂停、复活、结算。

- [ ] **Step 1: 替换 `LibraryView.ts`**

```ts
import {Node,Label,Color,Graphics,UITransform,EventTouch,Vec3,view,game,Game,tween} from 'cc';
import {PilotUI,UI} from './PilotUI';
import {LibraryRound,RACK_SIZE} from './shared/js/library/LibraryRound';
import {LibraryProgress} from './shared/js/library/LibraryProgress';
import {LIBRARY_LEVELS,SECTIONS,levelById} from './shared/js/library/LibraryLevels';
import {shelfLayout,nearestSlot} from './shared/js/library/ShelfBoard';
import {BOOK_W,BOOK_H} from './shared/js/library/BookPile';

const C=(v:string)=>new Color(v);
const WATER=C('#5d8fb0'),WOOD=C('#6b4a33'),SLOT=C('#3e2c20'),WET=C('#8fb6cc'),HINT=C('#f2d78e');
type Rect={left:number,top:number,width:number,height:number};
// Placeholder ad: resolves like AdService.showRewardedVideo() when a video finishes.
const ads={showRewardedVideo:()=>Promise.resolve({status:'rewarded'})};

// Grey-box rainy library: programmatic nodes only, no editor wiring.
export class LibraryView{
 u!:PilotUI;progress:LibraryProgress;round:LibraryRound|null=null;screen:'menu'|'round'='menu';paused=false;
 books=new Map<string,Node>();slots:any[]=[];shelf!:Rect;pile!:Rect;rack:Rect|null=null;
 water:Graphics|null=null;hint:Graphics|null=null;hud:{left:Label,hearts:Label,glass:Label}|null=null;dialog:Node|null=null;
 held:string|null=null;tipLeft=0;tip:Node|null=null;
 constructor(private host:any){this.progress=new LibraryProgress(host.progressStorage||(globalThis as any).localStorage||{getItem:()=>null,setItem:()=>{}});game.on(Game.EVENT_HIDE,this.hide,this);this.render()}
 private hide(){if(this.screen==='round'&&this.round?.status==='playing'){this.cancelHeld();this.paused=true;this.render()}}
 render(){const s=view.getVisibleSize();if(this.u)this.u.destroy();this.u=new PilotUI(this.host.canvas,s.width,s.height,this.host.safeTop,this.host.safeBottom);this.books.clear();this.water=null;this.hint=null;this.hud=null;this.dialog=null;this.tip=null;
  if(this.screen==='menu')this.renderMenu();else this.renderRound()}
 private label(t:string,parent:Node,x:number,y:number,w:number,h:number,size=16,color=UI.paper){const n=this.u.text(t,parent,w,h,size,color);n.setPosition(x,y);const l=n.getComponent(Label)!;l.horizontalAlign=Label.HorizontalAlign.CENTER;return l}
 // ---------- menu ----------
 private renderMenu(){const u=this.u,w=u.width,h=u.height,top=h/2-u.top;u.box(u.root,C('#263f3c'),0);
  this.label('雨后森林图书馆',u.root,0,top-40,w-40,44,26);this.label(`已修复 ${this.progress.lit} / ${LIBRARY_LEVELS.length} 个书柜`,u.root,0,top-80,w-40,28,15,C('#cfdccb'));
  const cell=(w-60)/5;LIBRARY_LEVELS.forEach((l,i)=>{const lit=this.progress.completed.includes(l.id),n=u.node('全景'+i,u.root,cell-6,90);n.setPosition(-w/2+30+cell*(i+.5),top-160);u.box(n,lit?C('#e7bc61'):C('#3b524c'),8);this.label(lit?'✓':'…',n,0,0,cell,40,20,lit?UI.ink:C('#8aa39a'))});
  if(this.progress.locked)this.label('存档无法读取，本次进度不会保存',u.root,0,top-225,w-40,24,13,C('#e8a07a'));
  LIBRARY_LEVELS.forEach((l,i)=>{const open=this.progress.canOpen(l.id),b=u.button(`${i+1}. ${l.name}${this.progress.completed.includes(l.id)?'  ✓':''}`,()=>{if(open)this.start(l.id)},u.root,w-64,56,open?'green':'paper');b.setPosition(0,top-270-i*66);if(!open)b.getComponent(Graphics)!.fillColor=C('#8c9a92')})}
 private start(id:string){const level=levelById(id)!;this.round=new LibraryRound(level);this.screen='round';this.paused=false;this.held=null;this.tipLeft=3;this.render()}
 // ---------- round ----------
 private renderRound(){const u=this.u,w=u.width,h=u.height,top=h/2-u.top,bottom=-h/2+u.bottom,r=this.round!,lv=r.level;u.box(u.root,C('#263f3c'),0);
  const pause=u.icon('pause',()=>{this.cancelHeld();this.paused=true;this.render()});pause.setPosition(-w/2+36,top-30);
  this.label(lv.name,u.root,-20,top-20,170,24,16);const left=this.label('',u.root,-20,top-42,170,20,13,C('#cfdccb'));const hearts=this.label('',u.root,w/2-150,top-30,70,28,18,C('#e8877a'));
  const glass=u.button('',()=>this.magnify(),u.root,64,52,'paper');glass.setPosition(w/2-40,top-30);const glassLabel=glass.getComponentInChildren(Label)!;this.hud={left,hearts,glass:glassLabel};
  const areaTop=top-66,areaH=areaTop-bottom;this.shelf={left:-w/2+12,top:areaTop,width:w-24,height:areaH*.55};
  const rackW=lv.leaks.length?64:0;this.pile={left:-w/2+12,top:areaTop-areaH*.55-12,width:w-24-rackW-(rackW?8:0),height:areaH*.45-12};
  this.rack=rackW?{left:w/2-12-rackW,top:this.pile.top,width:rackW,height:this.pile.height}:null;
  this.drawShelf();this.drawPile();for(const b of r.books)if(b.state!=='soaked')this.bookNode(b);
  if(this.tipLeft>0){this.tip=u.node('提示',u.root,w-40,44);this.tip.setPosition(0,this.pile.top-this.pile.height/2);u.box(this.tip,C('#1a332b'),12);this.label(lv.tip,this.tip,0,0,w-60,40,15)}
  this.refreshHud();this.drawWater();if(this.paused)this.pauseDialog();else if(r.status==='reviving')this.reviveDialog();else if(r.status==='won'||r.status==='lost')this.resultDialog()}
 private drawShelf(){const u=this.u,r=this.round!,s=this.shelf,rows=r.level.sections.length,n=u.node('书柜',u.root,s.width,s.height);n.setPosition(s.left+s.width/2,s.top-s.height/2);u.box(n,WOOD,10);
  this.slots=shelfLayout({left:s.left,top:s.top,width:s.width,height:s.height,plaque:40},rows,r.level.cols);
  r.level.sections.forEach((sec:string,row:number)=>{const y=s.top-(row+.5)*s.height/rows;this.label(SECTIONS[sec].icon,u.root,s.left+20,y,36,36,22)});
  const g=u.node('格子',u.root,s.width,s.height).addComponent(Graphics);g.node.setPosition(0,0);
  for(const slot of this.slots){g.fillColor=r.shelf.damaged.has(slot.key)?C('#2a1d15'):SLOT;g.roundRect(slot.x-slot.width/2+3,slot.y-slot.height/2+3,slot.width-6,slot.height-6,4);g.fill();
   const id=r.shelf.filled.get(slot.key);if(id){const b=r.book(id)!;this.paintSpine(g,slot.x,slot.y,slot.width-10,slot.height-10,SECTIONS[b.section].color)}}
  for(const slot of this.slots){const id=r.shelf.filled.get(slot.key);if(id){const b=r.book(id)!;this.label(`${SECTIONS[b.section].icon}${b.volume}`,u.root,slot.x,slot.y,slot.width,24,13)}else if(!r.shelf.damaged.has(slot.key))this.label(String(slot.col+1),u.root,slot.x,slot.y,slot.width,24,14,C('#7d6452'))}
  this.hint=u.node('高亮',u.root,s.width,s.height).addComponent(Graphics)}
 private paintSpine(g:Graphics,x:number,y:number,w:number,h:number,color:Color|string){g.fillColor=typeof color==='string'?C(color):color;g.roundRect(x-w/2,y-h/2,w,h,4);g.fill()}
 private drawPile(){const u=this.u,p=this.pile,n=u.node('地面',u.root,p.width,p.height);n.setPosition(p.left+p.width/2,p.top-p.height/2);u.box(n,C('#3a3226'),10);
  for(const leak of this.round!.level.leaks)this.label('💧',u.root,p.left+leak.x*p.width,p.top-10,30,24,16);
  if(this.rack){const k=this.rack,m=u.node('晾书架',u.root,k.width,k.height);m.setPosition(k.left+k.width/2,k.top-k.height/2);u.box(m,C('#4c6a5c'),10);this.label('晾书架',m,0,k.height/2-16,k.width,24,12);
   this.round!.rack.forEach((slot:any,i:number)=>{const b=this.round!.book(slot.id)!;const bn=this.label(`${SECTIONS[b.section].icon}\n${Math.ceil(slot.left)}s`,m,0,k.height/2-60-i*70,k.width-8,60,13);bn.lineHeight=18})}
  this.water=u.node('水位',u.root,p.width,p.height).addComponent(Graphics)}
 private pileXY(b:any){return {x:this.pile.left+b.x*this.pile.width,y:this.pile.top-this.pile.height+b.y*this.pile.height}}
 private bookNode(b:any){if(b.state==='shelved'||b.state==='drying')return;const u=this.u,bw=BOOK_W*this.pile.width,bh=BOOK_H*this.pile.height,n=u.node(b.id,u.root,bw,bh),{x,y}=this.pileXY(b);n.setPosition(x,y);
  const g=n.addComponent(Graphics);this.paintBook(n,g,b);this.books.set(b.id,n);
  n.on(Node.EventType.TOUCH_START,(e:EventTouch)=>{if(this.paused||this.held||!this.round!.pick(b.id)){this.nudge(n);return}this.held=b.id;n.setSiblingIndex(n.parent!.children.length-1);n.setScale(1.3,1.3,1);this.follow(n,e);this.drawHint()});
  n.on(Node.EventType.TOUCH_MOVE,(e:EventTouch)=>{if(this.held===b.id)this.follow(n,e)});
  n.on(Node.EventType.TOUCH_END,(e:EventTouch)=>{if(this.held===b.id)this.release(b.id,n,e)});
  n.on(Node.EventType.TOUCH_CANCEL,()=>{if(this.held===b.id){this.round!.cancel(b.id);this.held=null;this.back(n,b)}})}
 private paintBook(n:Node,g:Graphics,b:any){const s=n.getComponent(UITransform)!.contentSize;g.clear();this.paintSpine(g,0,0,s.width,s.height,b.wet?WET:SECTIONS[b.section].color);g.strokeColor=C('#1d1a14');g.lineWidth=1.5;g.roundRect(-s.width/2,-s.height/2,s.width,s.height,4);g.stroke();
  n.removeAllChildren();this.label(b.wet?'?':`${SECTIONS[b.section].icon}\n${b.volume}`,n,0,0,s.width,s.height,13).lineHeight=17;
  n.getComponent(UITransform)!.priority=b.z}
 private local(e:EventTouch){const p=e.getUILocation();return this.u.root.getComponent(UITransform)!.convertToNodeSpaceAR(new Vec3(p.x,p.y,0))}
 private follow(n:Node,e:EventTouch){const p=this.local(e);n.setPosition(p.x,p.y+20)}
 private release(id:string,n:Node,e:EventTouch){const r=this.round!,b=r.book(id)!,p=this.local(e);this.held=null;this.hint?.clear();
  const k=this.rack;if(k&&p.x>=k.left&&p.x<=k.left+k.width&&p.y<=k.top&&p.y>=k.top-k.height){if(r.dropToRack(id)){this.render();return}this.back(n,b);return}
  if(r.drop(id,nearestSlot(this.slots,p.x,p.y+20))==='shelved'){this.render();return}this.back(n,b)}
 private back(n:Node,b:any){n.setScale(1,1,1);const {x,y}=this.pileXY(b);tween(n).to(.15,{position:new Vec3(x,y,0)}).call(()=>this.nudge(n)).start()}
 private nudge(n:Node){const p=n.position.clone();tween(n).by(.05,{position:new Vec3(6,0,0)}).by(.1,{position:new Vec3(-12,0,0)}).to(.05,{position:p}).start()}
 private cancelHeld(){if(this.held&&this.round){this.round.cancel(this.held);this.held=null}}
 private drawHint(){const g=this.hint;if(!g||!this.held)return;g.clear();const key=this.round!.hintSlot(this.held);const slot=this.slots.find(s=>s.key===key);if(!slot)return;g.strokeColor=HINT;g.lineWidth=3;g.roundRect(slot.x-slot.width/2+2,slot.y-slot.height/2+2,slot.width-4,slot.height-4,5);g.stroke()}
 private drawWater(){const g=this.water,r=this.round;if(!g||!r)return;const p=this.pile;g.clear();g.fillColor=new Color(WATER.r,WATER.g,WATER.b,150);g.rect(p.left,p.top-p.height,p.width,r.water*p.height);g.fill();g.strokeColor=C('#bfe0f0');g.lineWidth=2;g.moveTo(p.left,p.top-p.height+r.water*p.height);g.lineTo(p.left+p.width,p.top-p.height+r.water*p.height);g.stroke();g.node.setSiblingIndex(g.node.parent!.children.length-1)}
 private refreshHud(){const r=this.round,h=this.hud;if(!r||!h)return;h.left.string=`剩余 ${r.remaining} 本`;h.hearts.string='♥'.repeat(r.hearts)+'♡'.repeat(Math.max(0,3-r.hearts));h.glass.string=r.magnifierLeft>0?`🔍${Math.ceil(r.magnifierLeft)}`:r.magnifierCharges>0?`🔍×${r.magnifierCharges}`:'🔍+'}
 private magnify(){const r=this.round;if(!r||this.paused)return;if(r.magnifierCharges>0){r.useMagnifier();this.refreshHud();return}
  void ads.showRewardedVideo().then(res=>{if(res.status==='rewarded'&&this.round===r){r.grantMagnifier();r.useMagnifier();this.refreshHud()}})}
 // ---------- dialogs ----------
 private modal(title:string,body:string,buttons:Array<[string,()=>void]>){const u=this.u,w=u.width,n=u.node('弹窗',u.root,w,u.height);u.box(n,new Color(10,20,16,190),0);const card=u.node('卡片',n,w-48,150+buttons.length*62);u.box(card,UI.paper,18);
  const ch=card.getComponent(UITransform)!.height;this.label(title,card,0,ch/2-34,w-80,36,22,UI.ink);this.label(body,card,0,ch/2-72,w-80,40,15,UI.muted);
  buttons.forEach(([t,fn],i)=>u.button(t,fn,card,w-96,52,i?'paper':'green').setPosition(0,ch/2-130-i*62));this.dialog=n}
 private pauseDialog(){this.modal('暂停','雨暂时停了',[['继续',()=>{this.paused=false;this.render()}],['重新开始',()=>this.start(this.round!.level.id)],['回图书馆',()=>this.toMenu()]])}
 private reviveDialog(){const r=this.round!;this.modal('书被泡坏太多了','看一段广告，水会退下一截，生命回满',[['看广告复活',()=>{void ads.showRewardedVideo().then(res=>{if(res.status==='rewarded'&&this.round===r&&r.revive())this.render()})}],['放弃',()=>{r.giveUp();this.render()}]])}
 private resultDialog(){const r=this.round!,id=r.level.id,i=LIBRARY_LEVELS.findIndex(l=>l.id===id),next=LIBRARY_LEVELS[i+1];
  if(r.status==='won'){const saved=this.progress.complete(id);const note=`用时 ${Math.round(r.time)} 秒，点亮了图书馆的第 ${i+1} 格${saved||!this.progress.locked?'':'（未保存）'}`;
   this.modal('书柜整理好了',note,next?[['下一关',()=>this.start(next.id)],['回图书馆',()=>this.toMenu()]]:[['回图书馆',()=>this.toMenu()]]);}
  else this.modal('这次没守住','再来一次，先救低处的书',[['重试',()=>this.start(id)],['回图书馆',()=>this.toMenu()]])}
 private toMenu(){this.cancelHeld();this.round=null;this.screen='menu';this.paused=false;this.render()}
 // ---------- frame ----------
 update(dt:number){const r=this.round;if(this.screen!=='round'||!r||this.paused)return;const before=r.status;r.update(dt);
  if(this.tipLeft>0){this.tipLeft-=dt;if(this.tipLeft<=0&&this.tip){this.tip.destroy();this.tip=null}}
  const events=r.drain();let rebuild=r.status!==before;
  for(const e of events){if(e.type==='soaked'){const n=this.books.get(e.id);if(n){tween(n).to(.3,{scale:new Vec3(.2,.2,1)}).call(()=>n.destroy()).start();this.books.delete(e.id)}}
   else if(e.type==='wet'){const n=this.books.get(e.id);if(n&&e.id!==this.held)this.paintBook(n,n.getComponent(Graphics)!,r.book(e.id))}
   else if(e.type==='dried'||e.type==='row')rebuild=true}
  if(r.rack.length&&!this.held)rebuild=rebuild||Math.ceil(r.rack[0].left)!==Math.ceil(r.rack[0].left+dt);
  if(rebuild&&!this.held){this.render();return}
  this.drawWater();this.refreshHud();if(this.held)this.drawHint()}
 destroy(){game.off(Game.EVENT_HIDE,this.hide,this);this.u?.destroy()}
}
```

- [ ] **Step 2: 同步、检查、构建**

Run: `npm run cocos:sync && npm run check && npm run cocos:build`
Expected: `Built web-mobile: ...`，构建日志里没有 `error TS`。如果 TS 报 `getComponentInChildren` 或 `priority` 相关的类型错误，按报错位置改：前者换成 `glass.getChildByName(glass.name)?.getComponent(Label)`（`PilotUI.text` 用前 30 个字符命名节点，按钮文字为空时节点名为空字符串），后者删掉 `priority` 那一句，改在 `render()` 里按 `z` 从小到大调用 `bookNode`（`r.books.slice().sort((a,b)=>a.z-b.z)`）。

- [ ] **Step 3: 浏览器手动验收**

Run: `npm run preview`，浏览器开设备模拟（390×844）打开终端显示的地址。逐项确认，发现问题就改 `LibraryView.ts` 并重新构建：
1. 图书馆页显示 5 格全景和 5 个关卡按钮，只有第 1 关能点。
2. 第 1 关：能按住书拖动，书会放大并跟着手指；拖到对应格子松手，书上架并显示图标加卷号；拖到错误格子或顶栏松手，书滑回原位并抖一下；开局提示 3 秒后消失。
3. 水位线从书堆底部上涨；被淹到的书缩小消失，心少一颗。
4. 第 3 关：摆满一层后，水位明显下降一截。
5. 放大镜：第一次点击后显示 8 秒倒计时，期间拿起书，对应格子出现黄色描边；次数用完后显示 🔍+，点击后直接获得并生效。
6. 故意等 3 本书被泡坏：弹出复活窗口，"看广告复活"后心回满、水位下降；第二次心归零直接显示失败。
7. 第 5 关：漏水点下方的书会变成"?"；拖到晾书架后显示倒计时，5 秒后回到书堆上层；湿书拖到书柜会被弹回。
8. 通关后弹窗显示用时和"点亮了第 N 格"；回到图书馆页，对应全景格变亮，下一关解锁；刷新页面后进度还在。
9. 暂停：继续、重新开始、回图书馆都能用；切到别的浏览器标签页再回来，游戏处于暂停状态。
10. URL 加 `?forest=1` 仍进入旧横版。

- [ ] **Step 4: 微信包**

Run: `npm run cocos:build:wechat`
Expected: 输出 `WeChat main package: X.XX MiB`。在微信开发者工具里导入仓库根目录，确认是竖屏并且能进入第 1 关。如果 emoji 显示成方块，把 `SECTIONS` 的 `icon` 改用 `name` 的第一个字（菌、草、鸟、花），重新执行 Task 7 Step 8 以及本任务 Step 2–4。

- [ ] **Step 5: 全量测试**

Run: `npm test 2>&1 | grep -E "^# (pass|fail)"`
Expected: 只有基线那 1 项失败

- [ ] **Step 6: 提交**

```bash
git add cocos-pilot/assets/scripts/LibraryView.ts
git -c user.name=dev -c user.email=dev@rainy-mushroom.local commit -m "feat(library): grey-box round screen, drag, dialogs and library panorama

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## 完成后

- 在 `docs/superpowers/specs/2026-09-28-rainy-library-design.md` 末尾补一行"实现记录"：分支、最后一个提交、调参得到的实际水速。
- 试玩验收（spec §5 最后一条）由用户组织：5 位没接触过项目的玩家，每人从第 1 关开始玩，记录是否主动开第二局、在哪里卡住、对水位的感受。
