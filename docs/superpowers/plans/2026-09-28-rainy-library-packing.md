# 雨后森林图书馆 · 塞书整理原型 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 做出 3 关"塞得刚刚好 + 看线索归类"的灰盒原型，并设为默认入口，让用户马上能试玩。

**Architecture:** 纯 JS 的逻辑层放在 `js/library/Pack*.js`，包括生成器、书柜、一局状态机，以及只用于测试的机器人。逻辑层用 `node --test` 做 TDD，再由 `sync-shared.mjs` 同步成 Cocos 的 TS。画面层是一个新文件 `PackView.ts`：整屏只在切换画面或尺寸变化时重建一次，之后按事件增量更新。`PinePilot` 默认进入 PackView，`?library=1` 进入上一版的 LibraryView。

**Tech Stack:** Cocos Creator 3.8.8（竖屏 375×812，FIXED_WIDTH）、原生 ES modules、`node:test`、Playwright MCP 做浏览器验证。

**Spec:** `docs/superpowers/specs/2026-09-28-rainy-library-packing-design.md`

## Global Constraints

- 范围只有 3 关。不做：漏水点、晾书架、书堆叠压、放大镜、知识型线索、金币、真实广告、正式美术、音效、旧代码清理。
- 书柜：左右两个柜，每柜 2–3 层；每层有 `height` ∈ {`short`,`tall`} 和 `length` ∈ 4–7。所有层都正好塞满才算过关。
- 书：`thickness` ∈ {1,2,3}，`height` ∈ {`short`,`tall`}。高书只能进高层；书放入后自动左对齐靠紧，抽出一本后其余的书向左靠紧。
- 线索：每个柜有一个颜色和一个花纹；书的两个属性都与某柜相同才属于该柜。书脊的 `shown` 至少露出一个属性；翻开封面 1 步，每本书只能翻一次。
- 步数消耗：放入正确的柜 1 步；抽回地面 1 步；翻开 1 步；放错柜 2 步，书弹回并自动翻开；柜子对但尺寸不合 0 步，书直接弹回。
- 水位 = 已用步数 / `steps`。某层第一次正好塞满时退还 `refund` 步，每层只退一次。步数用尽时进入复活，复活退还 30% 的步数，每关只能复活一次；复活后再次用尽即失败。
- 新存档 key 是 `rainyLibrary.pack.v1`。存档损坏或写入失败时绝不覆盖原存档；`saved=false` 时，结算界面显示"未保存"。
- 差异化：不使用 Librarian 的名称、美术、文案、分区名、"3072"、三技能组合。
- 逻辑层不能依赖引擎。同步脚本只允许 `js/microforest/` 和 `js/library/` 下的文件，import 必须是相对路径。`PackBots.js` 不能进构建。
- 仓库规矩：
  - 只 `git add` 具体文件，禁止 `git add -A`、`git add .`、`git commit -a`；不 stash、不 reset、不 checkout 用户未提交的文件。
  - 提交命令用 `git -c user.name=dev -c user.email=dev@rainy-mushroom.local commit`，提交信息结尾加 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`。
- `cocos-pilot/assets/scripts/PinePilot.ts`、`scripts/cocos/sync-shared.mjs`、`cocos-pilot/shared-manifest.json`、`tests/forest-cleanup.test.mjs` 里有用户未提交的森林工作：只修改，**不提交**。
- 旧的 `LibraryView.ts`、`js/library/` 下的旧模块、旧森林代码全部保留不动。
- `npm test` 有 1 条已知的基线失败："retired runtime and resource bundles cannot reenter builds"，不修它。

## Review Focus

1. **丢失 touch-end，或第二根手指按下**：拿着书时，其他 touch id 的移动和松开一律忽略；任何一次新的按下都会先把手上的书放回原处。游戏永远不会卡在"拿起"状态。（Task 6 Step 7 第 3 项）
2. **拿着书时改变尺寸、切到后台，或者有弹窗时改变尺寸**：书回到原位，不扣步数；切后台只弹一次暂停框；重建后弹窗内容不变，通关记录也不会再写一次。（Task 6 Step 7 第 1、2 项；过关后的重建见 Step 8）
3. **弹窗按钮连点**，比如"看广告退水"点两下、"放弃"后又点复活：复活只生效一次，不会改到已经换掉的那一局。（Task 3 复活测试；Task 6 代码中的 `this.round===r && r.revive()`）
4. **存档写不进去**，比如存储满了，或旧存档损坏被锁定：结算显示"（未保存）"，菜单提示本次进度不会保存；新玩法的存档永远不会碰旧 key。（Task 1 存档测试；Task 6 Step 8）
5. **小屏（375×667）并且书最多（第 3 关约 21 本）**：地面上的书互不重叠，不越出地面，也不压到书柜；点中哪本书和画面上看到的一致。（Task 6 Step 7 第 4 项）

## File Structure

| 文件 | 职责 |
|---|---|
| `js/library/PackLevels.js`（新） | 颜色和花纹表、3 关配置、存档 key、生成器，以及 `candidates` / `isAmbiguous` / `sharedAttr` |
| `js/library/PackBoard.js`（新） | 各层的书列表；`size` / `fit` / `place` / `remove` / `where` / `full` / `complete` |
| `js/library/PackRound.js`（新） | 一局状态机：步数、退步、复活、胜负、预览、事件队列 |
| `js/library/PackBots.js`（新，只用于测试） | 规划型机器人 `planner`、`pack` 求解器、乱塞型机器人 `greedy` |
| `js/library/LibraryProgress.js`（改） | 构造参数新增关卡 id 列表和存档 key，默认值保持旧行为 |
| `tests/pack-levels.test.mjs`、`pack-board.test.mjs`、`pack-round.test.mjs`、`pack-bots.test.mjs`（新） | 逻辑层测试 |
| `tests/library-progress.test.mjs`（改） | 新增：新玩法使用独立的 key |
| `tests/library-sync.test.mjs`（改） | 断言 Pack 模块已同步、Bots 不进构建、默认入口是 PackView |
| `cocos-pilot/assets/scripts/PackView.ts`（新） | 画面层 |
| `cocos-pilot/assets/scripts/shared/js/library/Pack*.ts`（生成） | 同步脚本的产物，连同 Cocos 生成的 `.meta` 一起提交 |
| `scripts/cocos/sync-shared.mjs`、`PinePilot.ts`（改，不提交） | 同步入口、路由 |

## 已验证的调参结果（草稿原型实测，50 个种子/关）

| 关 | 书数范围 | 模棱两可 | 规划型 | 规划型最少余步 | 乱塞型失败 |
|---|---|---|---|---|---|
| 1（`slack` 2） | 8–12 | 0 | 50/50 过 | 12 | 21/50 |
| 2（`slack` 1.3） | 12–17 | 4 | 50/50 过 | 6 | 48/50 |
| 3（`slack` 1.25） | 14–21 | 7 | 50/50 过 | 3 | 49/50 |

`steps = ⌈书数 × slack⌉`，`slack` 按关配置。这是 spec §2.5 "由机器人测试调参"的结果：spec 给的初值是 1.5，第 1 关调宽到 2，第 2、3 关收紧到 1.3 和 1.25。

---

### Task 1: 关卡配置、生成器，存档参数化

**Files:**
- Create: `js/library/PackLevels.js`
- Modify: `js/library/LibraryProgress.js`
- Create: `tests/pack-levels.test.mjs`
- Modify: `tests/library-progress.test.mjs`

**Interfaces:**
- Consumes: `SeededRandom` from `js/library/LibraryRandom.js`（`next()`、`int(min,max)` 两端都包含、`shuffle(items)` 返回副本）
- Produces:
  - `PACK_LEVELS`：每项为 `{id, name, seed, slack, refund, ambiguous, tip, cabinets:[{color, pattern, rows:[{height, length}]}]}`。
  - `PACK_IDS`、`PACK_PROGRESS_KEY = 'rainyLibrary.pack.v1'`。
  - `packLevelById(id) → level|null`。
  - `COLORS[key] = {name, hex}`、`PATTERNS[key] = {name, icon}`、`ATTRS = ['color','pattern']`。
  - `sharedAttr(cabinets) → 'color'|'pattern'|null`。
  - `candidates(book, cabinets) → number[]`：已翻开的书按全部属性判断，否则按 `shown` 判断。
  - `isAmbiguous(book, cabinets) → boolean`。
  - `generate(level, seed = level.seed) → {books, steps}`：每本书为 `{id:'b<slot>', slot, cabinet, color, pattern, thickness, height, shown:string[], flipped:false, state:'floor'}`。
  - `new LibraryProgress(storage, ids = LIBRARY_IDS, key = LIBRARY_PROGRESS_KEY)`；另外导出 `LIBRARY_IDS`。

- [ ] **Step 1: 写失败的测试**

`tests/pack-levels.test.mjs`：

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { PACK_LEVELS, PACK_IDS, packLevelById, generate, candidates, isAmbiguous, sharedAttr } from '../js/library/PackLevels.js'

const seeds = level => [level.seed, ...Array.from({ length: 49 }, (_, i) => `${level.seed}:${i}`)]

test('three levels in order, looked up by id', () => {
  assert.deepEqual(PACK_IDS, ['pack-01', 'pack-02', 'pack-03'])
  assert.equal(packLevelById('pack-02').name, PACK_LEVELS[1].name)
  assert.equal(packLevelById('nope'), null)
})

test('every deal fills each cabinet exactly and tall books fit the tall rows', () => {
  for (const level of PACK_LEVELS) for (const seed of seeds(level)) {
    const { books, steps } = generate(level, seed)
    assert.equal(steps, Math.ceil(books.length * level.slack))
    assert.deepEqual(books.map(b => b.slot), books.map((b, i) => i))
    assert.equal(new Set(books.map(b => b.id)).size, books.length)
    level.cabinets.forEach((cabinet, c) => {
      const mine = books.filter(b => b.cabinet === c)
      const sum = list => list.reduce((s, x) => s + x, 0)
      assert.equal(sum(mine.map(b => b.thickness)), sum(cabinet.rows.map(r => r.length)), `${level.id} ${seed} cabinet ${c}`)
      assert.ok(sum(mine.filter(b => b.height === 'tall').map(b => b.thickness)) <= sum(cabinet.rows.filter(r => r.height === 'tall').map(r => r.length)))
      for (const b of mine) {
        assert.equal(b.color, cabinet.color)
        assert.equal(b.pattern, cabinet.pattern)
        assert.ok(b.thickness >= 1 && b.thickness <= 3)
        assert.ok(b.shown.length >= 1)
        assert.equal(b.state, 'floor')
        assert.equal(b.flipped, false)
      }
    })
  }
})

test('ambiguity: none on level 1, exactly the target count on levels 2 and 3', () => {
  assert.equal(sharedAttr(PACK_LEVELS[0].cabinets), null)
  for (const level of PACK_LEVELS) for (const seed of seeds(level)) {
    const { books } = generate(level, seed)
    assert.equal(books.filter(b => isAmbiguous(b, level.cabinets)).length, level.ambiguous, `${level.id} ${seed}`)
    for (const b of books) assert.ok(candidates(b, level.cabinets).includes(b.cabinet))
  }
  assert.equal(PACK_LEVELS[0].ambiguous, 0)
  assert.ok(PACK_LEVELS[2].ambiguous > PACK_LEVELS[1].ambiguous)
})

test('the same seed deals the same books', () => {
  const level = PACK_LEVELS[2]
  assert.deepEqual(generate(level, 'x'), generate(level, 'x'))
  assert.notDeepEqual(generate(level, 'x'), generate(level, 'y'))
})

test('book counts stay near the level targets', () => {
  const targets = [8, 12, 15]
  PACK_LEVELS.forEach((level, i) => {
    const counts = seeds(level).map(seed => generate(level, seed).books.length)
    const mean = counts.reduce((s, n) => s + n, 0) / counts.length
    assert.ok(Math.abs(mean - targets[i]) <= 3, `${level.id} mean ${mean}`)
  })
})
```

在 `tests/library-progress.test.mjs` 的第 3 行（`import { LibraryProgress, LIBRARY_PROGRESS_KEY } ...`）之后加入：

```js
import { PACK_IDS, PACK_PROGRESS_KEY } from '../js/library/PackLevels.js'
```

在文件末尾追加：

```js
test('the packing mode keeps its own level list and save key', () => {
  const db = memory()
  db.setItem(LIBRARY_PROGRESS_KEY, JSON.stringify({ version: 1, completed: ['library-01'] }))
  const p = new LibraryProgress(db, PACK_IDS, PACK_PROGRESS_KEY)
  assert.equal(p.next, 'pack-01')
  assert.equal(p.canOpen('library-02'), false)
  assert.equal(p.complete('pack-01'), true)
  assert.deepEqual(JSON.parse(db.getItem(PACK_PROGRESS_KEY)), { version: 1, completed: ['pack-01'] })
  assert.deepEqual(JSON.parse(db.getItem(LIBRARY_PROGRESS_KEY)), { version: 1, completed: ['library-01'] })
  assert.deepEqual(new LibraryProgress(db).completed, ['library-01'])
  db.setItem(PACK_PROGRESS_KEY, '{bad')
  const broken = new LibraryProgress(db, PACK_IDS, PACK_PROGRESS_KEY)
  assert.equal(broken.locked, true)
  assert.equal(broken.complete('pack-01'), false)
  assert.equal(db.getItem(PACK_PROGRESS_KEY), '{bad')
})
```

- [ ] **Step 2: 运行，确认失败**

Run: `node --test tests/pack-levels.test.mjs tests/library-progress.test.mjs`
Expected: FAIL，报 `Cannot find module .../js/library/PackLevels.js`。

- [ ] **Step 3: 实现**

新建 `js/library/PackLevels.js`：

```js
import { SeededRandom } from './LibraryRandom.js'

export const COLORS = {
  red: { name: '红', hex: '#c0584a' },
  blue: { name: '蓝', hex: '#4f7fb0' },
  green: { name: '绿', hex: '#5c9a5a' },
}

export const PATTERNS = {
  cap: { name: '菌伞', icon: '🍄' },
  leaf: { name: '叶脉', icon: '🍃' },
  drop: { name: '雨滴', icon: '💧' },
}

// cabinets[0] is the left cabinet. Row lengths are in thickness units; a cabinet's books exactly fill its rows.
export const PACK_LEVELS = [
  {
    id: 'pack-01', name: '第一场雨', seed: 'pack-01', slack: 2, refund: 1, ambiguous: 0,
    tip: '把书塞进标志相同的柜子，每一层都要正好塞满',
    cabinets: [
      { color: 'red', pattern: 'cap', rows: [{ height: 'short', length: 5 }, { height: 'short', length: 4 }] },
      { color: 'blue', pattern: 'leaf', rows: [{ height: 'short', length: 4 }, { height: 'short', length: 5 }] },
    ],
  },
  {
    id: 'pack-02', name: '同色的柜子', seed: 'pack-02', slack: 1.3, refund: 1, ambiguous: 4,
    tip: '两个柜子都是红色；只露出颜色的书，点一下翻开看花纹',
    cabinets: [
      { color: 'red', pattern: 'cap', rows: [{ height: 'tall', length: 4 }, { height: 'short', length: 5 }, { height: 'short', length: 4 }] },
      { color: 'red', pattern: 'leaf', rows: [{ height: 'short', length: 4 }, { height: 'tall', length: 5 }, { height: 'short', length: 4 }] },
    ],
  },
  {
    id: 'pack-03', name: '涨水的夜', seed: 'pack-03', slack: 1.25, refund: 1, ambiguous: 7,
    tip: '花纹一样的书更多了，先想好每一层怎么塞',
    cabinets: [
      { color: 'green', pattern: 'drop', rows: [{ height: 'tall', length: 5 }, { height: 'short', length: 6 }, { height: 'short', length: 5 }] },
      { color: 'blue', pattern: 'drop', rows: [{ height: 'short', length: 5 }, { height: 'short', length: 6 }, { height: 'tall', length: 5 }] },
    ],
  },
]

export const PACK_PROGRESS_KEY = 'rainyLibrary.pack.v1'
export const PACK_IDS = PACK_LEVELS.map(level => level.id)

export function packLevelById(id) { return PACK_LEVELS.find(level => level.id === id) || null }

export const ATTRS = ['color', 'pattern']

// The attribute both cabinets share, or null when their signs differ completely.
export function sharedAttr(cabinets) {
  return ATTRS.find(attr => cabinets.every(c => c[attr] === cabinets[0][attr])) || null
}

// Indices of cabinets whose sign agrees with everything shown on the book.
export function candidates(book, cabinets) {
  const shown = book.flipped ? ATTRS : book.shown
  return cabinets.map((c, i) => i).filter(i => shown.every(attr => cabinets[i][attr] === book[attr]))
}

export function isAmbiguous(book, cabinets) { return candidates(book, cabinets).length > 1 }

// Thicker books are likelier, so rows hold two or three books and the counts stay near the level targets.
const THICKNESS_WEIGHTS = [[1, 1], [2, 2], [3, 2]]
function pickThickness(rng, left) {
  const options = THICKNESS_WEIGHTS.filter(([t]) => t <= left), total = options.reduce((sum, [, w]) => sum + w, 0)
  let roll = rng.next() * total
  for (const [t, w] of options) if ((roll -= w) < 0) return t
  return options[options.length - 1][0]
}

export function generate(level, seed = level.seed) {
  const rng = new SeededRandom(seed)
  const raw = []
  level.cabinets.forEach((cabinet, c) => cabinet.rows.forEach(row => {
    let left = row.length, first = true
    while (left > 0) {
      const thickness = pickThickness(rng, left)
      const tall = row.height === 'tall' && (first || rng.next() < .5)
      raw.push({ cabinet: c, color: cabinet.color, pattern: cabinet.pattern, thickness, height: tall ? 'tall' : 'short' })
      left -= thickness
      first = false
    }
  }))
  const shared = sharedAttr(level.cabinets)
  const other = ATTRS.find(attr => attr !== shared)
  const vague = new Set(shared ? rng.shuffle(raw.map((b, i) => i)).slice(0, level.ambiguous) : [])
  raw.forEach((book, i) => {
    if (vague.has(i)) book.shown = [shared]
    else if (shared) book.shown = rng.next() < .5 ? [other] : ATTRS.slice()
    else book.shown = [[ 'color' ], [ 'pattern' ], ATTRS.slice()][rng.int(0, 2)]
  })
  const books = rng.shuffle(raw).map((book, slot) => ({ ...book, id: `b${slot}`, slot, flipped: false, state: 'floor' }))
  return { books, steps: Math.ceil(books.length * level.slack) }
}
```

把 `js/library/LibraryProgress.js` 整个替换为：

```js
import { LIBRARY_LEVELS } from './LibraryLevels.js'

export const LIBRARY_PROGRESS_KEY = 'rainyLibrary.progress.v1'
export const LIBRARY_IDS = LIBRARY_LEVELS.map(level => level.id)

export class LibraryProgress {
  // Ids and key are parameters so each game mode keeps its own save.
  constructor(storage, ids = LIBRARY_IDS, key = LIBRARY_PROGRESS_KEY) {
    this.storage = storage
    this.ids = ids
    this.key = key
    this.completed = []
    this.saved = true
    this.locked = false
    let raw = null
    try { raw = storage.getItem(key) } catch { this.lock(); return }
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

  get next() { return this.ids.find(id => !this.completed.includes(id)) || this.ids[this.ids.length - 1] }

  get lit() { return this.completed.length }

  canOpen(id) {
    const index = this.ids.indexOf(id)
    return index >= 0 && this.ids.slice(0, index).every(prior => this.completed.includes(prior))
  }

  complete(id) {
    if (!this.canOpen(id)) return false
    if (!this.completed.includes(id)) this.completed = this.ids.filter(level => level === id || this.completed.includes(level))
    if (this.locked) return false
    try {
      this.storage.setItem(this.key, JSON.stringify({ version: 1, completed: this.completed }))
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

Run: `node --test tests/pack-levels.test.mjs tests/library-progress.test.mjs`
Expected: PASS，10 个测试（levels 5 个，progress 5 个）。

- [ ] **Step 5: 提交**

```bash
git add js/library/PackLevels.js js/library/LibraryProgress.js tests/pack-levels.test.mjs tests/library-progress.test.mjs
git -c user.name=dev -c user.email=dev@rainy-mushroom.local commit -m "feat(pack): levels, seeded generator and per-mode progress key

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 书柜 PackBoard

**Files:**
- Create: `js/library/PackBoard.js`
- Create: `tests/pack-board.test.mjs`

**Interfaces:**
- Consumes: 无（书对象只需要 `cabinet`、`thickness`、`height` 三个字段）。
- Produces: `new PackBoard(cabinets)`，其中 `rows[c][r] = {height, length, books: Book[]}`。方法如下：
  - `row(c,r)`、`used(c,r)`
  - `size(book,c,r)`：返回 `'too-tall'|'too-thick'|'ok'`
  - `fit(book,c,r)`：返回 `'wrong-cabinet'|'too-tall'|'too-thick'|'ok'`；层不存在时返回 `'too-thick'`
  - `place(book,c,r) → boolean`
  - `where(book) → {cabinet,row,index}|null`
  - `remove(book) → {cabinet,row,index}|null`
  - `full(c,r)`
  - getter `complete`

- [ ] **Step 1: 写失败的测试** `tests/pack-board.test.mjs`：

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { PackBoard } from '../js/library/PackBoard.js'

const cabinets = [
  { rows: [{ height: 'tall', length: 4 }, { height: 'short', length: 3 }] },
  { rows: [{ height: 'short', length: 5 }] },
]
const book = (cabinet, thickness, height = 'short') => ({ cabinet, thickness, height })

test('fit judges the cabinet first, then height, then remaining room', () => {
  const board = new PackBoard(cabinets)
  assert.equal(board.fit(book(1, 3, 'tall'), 0, 1), 'wrong-cabinet')
  assert.equal(board.fit(book(0, 1, 'tall'), 0, 1), 'too-tall')
  assert.equal(board.fit(book(0, 3, 'tall'), 0, 0), 'ok')
  assert.equal(board.fit(book(0, 1), 0, 0), 'ok', 'short books fit tall rows')
  assert.equal(board.fit(book(0, 1), 5, 0), 'too-thick', 'missing rows never accept')
  board.place(book(0, 3, 'tall'), 0, 0)
  assert.equal(board.fit(book(0, 2), 0, 0), 'too-thick')
  assert.equal(board.size(book(1, 2), 0, 0), 'too-thick', 'size ignores the cabinet')
})

test('rows fill exactly, report completion, and close up after a removal', () => {
  const board = new PackBoard(cabinets)
  const a = book(0, 1), b = book(0, 2), c = book(0, 1, 'tall')
  assert.ok(board.place(a, 0, 0) && board.place(b, 0, 0) && board.place(c, 0, 0))
  assert.equal(board.used(0, 0), 4)
  assert.equal(board.full(0, 0), true)
  assert.equal(board.place(book(0, 1), 0, 0), false)
  assert.equal(board.complete, false)
  assert.deepEqual(board.remove(b), { cabinet: 0, row: 0, index: 1 })
  assert.deepEqual(board.row(0, 0).books, [a, c])
  assert.equal(board.full(0, 0), false)
  assert.equal(board.remove(b), null)
  assert.deepEqual(board.where(c), { cabinet: 0, row: 0, index: 1 })
})

test('the board is complete only when every row is exactly full', () => {
  const board = new PackBoard(cabinets)
  board.place(book(0, 3, 'tall'), 0, 0); board.place(book(0, 1), 0, 0)
  board.place(book(0, 3), 0, 1)
  board.place(book(1, 3), 1, 0)
  assert.equal(board.complete, false)
  board.place(book(1, 2), 1, 0)
  assert.equal(board.complete, true)
})
```

- [ ] **Step 2: 运行，确认失败**

Run: `node --test tests/pack-board.test.mjs`
Expected: FAIL，报 `Cannot find module .../js/library/PackBoard.js`。

- [ ] **Step 3: 实现** `js/library/PackBoard.js`：

```js
// Cabinet rows as ordered lists of books. Books pack to the left, so a row is just its order of arrival.
export class PackBoard {
  constructor(cabinets) {
    this.rows = cabinets.map(cabinet => cabinet.rows.map(row => ({ height: row.height, length: row.length, books: [] })))
  }

  row(cabinet, row) { return this.rows[cabinet]?.[row] || null }

  used(cabinet, row) { return this.row(cabinet, row).books.reduce((sum, book) => sum + book.thickness, 0) }

  // Size check alone: what the player can see before dropping.
  size(book, cabinet, row) {
    const target = this.row(cabinet, row)
    if (!target) return 'too-thick'
    if (book.height === 'tall' && target.height !== 'tall') return 'too-tall'
    if (this.used(cabinet, row) + book.thickness > target.length) return 'too-thick'
    return 'ok'
  }

  // The cabinet is judged first, so a wrong cabinet always costs the wrong-cabinet penalty.
  fit(book, cabinet, row) {
    if (!this.row(cabinet, row)) return 'too-thick'
    if (book.cabinet !== cabinet) return 'wrong-cabinet'
    return this.size(book, cabinet, row)
  }

  place(book, cabinet, row) {
    if (this.fit(book, cabinet, row) !== 'ok') return false
    this.row(cabinet, row).books.push(book)
    return true
  }

  where(book) {
    for (let c = 0; c < this.rows.length; c += 1) {
      for (let r = 0; r < this.rows[c].length; r += 1) {
        const index = this.rows[c][r].books.indexOf(book)
        if (index >= 0) return { cabinet: c, row: r, index }
      }
    }
    return null
  }

  remove(book) {
    const at = this.where(book)
    if (at) this.rows[at.cabinet][at.row].books.splice(at.index, 1)
    return at
  }

  full(cabinet, row) { return this.used(cabinet, row) === this.row(cabinet, row).length }

  get complete() { return this.rows.every((rows, c) => rows.every((row, r) => this.full(c, r))) }
}
```

- [ ] **Step 4: 运行，确认通过**

Run: `node --test tests/pack-board.test.mjs`
Expected: PASS，3 个测试。

- [ ] **Step 5: 提交**

```bash
git add js/library/PackBoard.js tests/pack-board.test.mjs
git -c user.name=dev -c user.email=dev@rainy-mushroom.local commit -m "feat(pack): cabinet rows with fit, pack-left and exact-fill checks

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: 一局状态机 PackRound

**Files:**
- Create: `js/library/PackRound.js`
- Create: `tests/pack-round.test.mjs`

**Interfaces:**
- Consumes: `PackBoard`（Task 2）；`generate`、`candidates`、`ATTRS`（Task 1）。
- Produces:
  - 构造：`new PackRound(level, {seed = level.seed, deal = generate(level, seed)} = {})`。
  - 常量：`REVIVE_SHARE = .3`、`WRONG_COST = 2`。
  - 字段：`level`、`books`、`steps`、`used`、`board`、`refunded:Set<'c:r'>`、`status ∈ 'playing'|'reviving'|'won'|'lost'`、`revived`。
  - getter：`left`、`water`（0..1）。
  - 查询：
    - `book(id)`
    - `visible(id) → string[]`
    - `canPick(id)`：局面进行中，且书在地面或书柜里
    - `canFlip(id)`
    - `preview(id,c,r) → 'mismatch'|'too-tall'|'too-thick'|'ok'`：只根据玩家看得到的信息判断
  - 操作：
    - `flip(id) → boolean`
    - `place(id,c,r) → 'ok'|'wrong-cabinet'|'too-tall'|'too-thick'|'rejected'`
    - `remove(id) → boolean`
    - `revive() → boolean`
    - `giveUp()`
    - `drain() → Event[]`
  - 事件：
    - `{type:'flipped',id}`
    - `{type:'wrong',id,cabinet}`
    - `{type:'placed',id,cabinet,row}`
    - `{type:'full',cabinet,row}`
    - `{type:'removed',id,cabinet,row}`
    - `{type:'revived'}`
    - `{type:'won'}`、`{type:'reviving'}`、`{type:'lost'}`

- [ ] **Step 1: 写失败的测试** `tests/pack-round.test.mjs`：

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { PackRound, REVIVE_SHARE } from '../js/library/PackRound.js'

// Both cabinets are red; only the pattern tells them apart.
const level = {
  id: 'tiny', seed: 'tiny', refund: 1, cabinets: [
    { color: 'red', pattern: 'cap', rows: [{ height: 'tall', length: 3 }, { height: 'short', length: 2 }] },
    { color: 'red', pattern: 'leaf', rows: [{ height: 'short', length: 3 }] },
  ],
}
const make = (cabinet, thickness, height, shown, slot) => ({
  id: `b${slot}`, slot, cabinet, thickness, height, shown, flipped: false, state: 'floor',
  color: 'red', pattern: cabinet ? 'leaf' : 'cap',
})
// b0 tall 3 → L0; b1 2 → L1; b2 3 → R0 (ambiguous); b3 2 (spare for the wrong-size checks)
const deal = (steps = 20) => ({ steps, books: [make(0, 3, 'tall', ['pattern'], 0), make(0, 2, 'short', ['color', 'pattern'], 1), make(1, 3, 'short', ['color'], 2), make(0, 2, 'short', ['pattern'], 3)] })
const round = (steps) => new PackRound(level, { deal: deal(steps) })

test('flipping costs one step, reveals everything, and only works once', () => {
  const r = round()
  assert.deepEqual(r.visible('b2'), ['color'])
  assert.equal(r.canFlip('b1'), false, 'fully shown books have nothing to flip')
  assert.equal(r.flip('b2'), true)
  assert.deepEqual(r.visible('b2'), ['color', 'pattern'])
  assert.equal(r.used, 1)
  assert.equal(r.flip('b2'), false)
  assert.equal(r.used, 1)
  assert.deepEqual(r.drain(), [{ type: 'flipped', id: 'b2' }])
})

test('a wrong cabinet costs two steps, bounces the book and flips it', () => {
  const r = round()
  assert.equal(r.place('b2', 0, 1), 'wrong-cabinet')
  assert.equal(r.used, 2)
  assert.equal(r.book('b2').state, 'floor')
  assert.equal(r.book('b2').flipped, true)
  assert.deepEqual(r.drain(), [{ type: 'wrong', id: 'b2', cabinet: 0 }])
})

test('the right cabinet with the wrong size costs nothing', () => {
  const r = round()
  assert.equal(r.place('b0', 0, 1), 'too-tall')
  assert.equal(r.place('b1', 0, 0), 'ok')
  assert.equal(r.place('b3', 0, 0), 'too-thick')
  assert.equal(r.used, 1)
  assert.equal(r.book('b3').state, 'floor')
})

test('a row filled for the first time refunds once; pulling a book out costs a step', () => {
  const r = round()
  assert.equal(r.place('b1', 0, 1), 'ok')
  assert.equal(r.used, 0, '1 step spent, 1 refunded')
  assert.deepEqual(r.drain(), [{ type: 'placed', id: 'b1', cabinet: 0, row: 1 }, { type: 'full', cabinet: 0, row: 1 }])
  assert.equal(r.remove('b1'), true)
  assert.equal(r.used, 1)
  assert.equal(r.book('b1').state, 'floor')
  assert.deepEqual(r.drain(), [{ type: 'removed', id: 'b1', cabinet: 0, row: 1 }])
  assert.equal(r.place('b1', 0, 1), 'ok')
  assert.equal(r.used, 2, 'no second refund')
  assert.equal(r.remove('b0'), false, 'floor books cannot be removed')
})

test('hover previews only use what the player can already see', () => {
  const r = round()
  assert.equal(r.preview('b2', 0, 1), 'too-thick', 'ambiguous book: the size is the only visible problem')
  assert.equal(r.preview('b2', 1, 0), 'ok')
  assert.equal(r.preview('b0', 1, 0), 'mismatch', 'shown pattern rules the right cabinet out')
  assert.equal(r.preview('b0', 0, 1), 'too-tall')
  r.flip('b2')
  assert.equal(r.preview('b2', 0, 0), 'mismatch')
})

test('running out of steps offers one revive, then the round is lost', () => {
  const r = round(4)
  r.place('b2', 0, 0)
  r.place('b3', 1, 0)
  assert.equal(r.status, 'reviving')
  assert.equal(r.water, 1)
  assert.equal(r.flip('b0'), false, 'no actions while waiting for a revive')
  assert.equal(r.revive(), true)
  assert.equal(r.used, 4 - Math.ceil(4 * REVIVE_SHARE))
  assert.equal(r.status, 'playing')
  assert.equal(r.revive(), false)
  r.place('b3', 1, 0)
  assert.equal(r.status, 'lost')
  assert.equal(r.revive(), false)
})

test('giving up while reviving loses', () => {
  const r = round(2)
  r.place('b2', 0, 0)
  assert.equal(r.status, 'reviving')
  r.giveUp()
  assert.equal(r.status, 'lost')
})

test('the board completes and the round is won even when the last placement uses the final step', () => {
  const r = new PackRound(level, { deal: { steps: 3, books: deal().books.slice(0, 3) } })
  r.flip('b2')
  r.place('b0', 0, 0)
  r.place('b1', 0, 1)
  assert.equal(r.used, 1)
  assert.equal(r.place('b2', 1, 0), 'ok')
  assert.equal(r.status, 'won')
  assert.equal(r.place('b2', 1, 0), 'rejected')
  assert.ok(r.drain().some(e => e.type === 'won'))
})
```

- [ ] **Step 2: 运行，确认失败**

Run: `node --test tests/pack-round.test.mjs`
Expected: FAIL，报 `Cannot find module .../js/library/PackRound.js`。

- [ ] **Step 3: 实现** `js/library/PackRound.js`：

```js
import { PackBoard } from './PackBoard.js'
import { generate, candidates, ATTRS } from './PackLevels.js'

export const REVIVE_SHARE = .3
export const WRONG_COST = 2

export class PackRound {
  // `deal` lets tests hand in exact books; normal play deals from the seeded generator.
  constructor(level, { seed = level.seed, deal = generate(level, seed) } = {}) {
    const { books, steps } = deal
    this.level = level
    this.books = books
    this.steps = steps
    this.used = 0
    this.board = new PackBoard(level.cabinets)
    this.refunded = new Set()
    this.status = 'playing'
    this.revived = false
    this.events = []
  }

  get left() { return Math.max(0, this.steps - this.used) }

  get water() { return Math.min(1, this.used / this.steps) }

  book(id) { return this.books.find(b => b.id === id) || null }

  // Attributes the player can currently read on the spine.
  visible(id) {
    const book = this.book(id)
    return book ? (book.flipped ? ATTRS : book.shown) : []
  }

  canPick(id) {
    const book = this.book(id)
    return this.status === 'playing' && (book?.state === 'floor' || book?.state === 'shelved')
  }

  canFlip(id) {
    const book = this.book(id)
    return this.status === 'playing' && book?.state === 'floor' && !book.flipped && book.shown.length < ATTRS.length
  }

  flip(id) {
    if (!this.canFlip(id)) return false
    this.book(id).flipped = true
    this.events.push({ type: 'flipped', id })
    this.spend(1)
    return true
  }

  // What a drag hover may show: only facts already visible (sign conflicts and sizes), never the hidden cabinet.
  preview(id, cabinet, row) {
    const book = this.book(id)
    if (!book || !this.board.row(cabinet, row)) return 'too-thick'
    if (!candidates(book, this.level.cabinets).includes(cabinet)) return 'mismatch'
    return this.board.size(book, cabinet, row)
  }

  place(id, cabinet, row) {
    const book = this.book(id)
    if (this.status !== 'playing' || book?.state !== 'floor') return 'rejected'
    const fit = this.board.fit(book, cabinet, row)
    if (fit === 'wrong-cabinet') {
      book.flipped = true
      this.events.push({ type: 'wrong', id, cabinet })
      this.spend(WRONG_COST)
      return fit
    }
    if (fit !== 'ok') return fit
    this.board.place(book, cabinet, row)
    book.state = 'shelved'
    this.events.push({ type: 'placed', id, cabinet, row })
    this.used += 1
    const key = `${cabinet}:${row}`
    if (this.board.full(cabinet, row) && !this.refunded.has(key)) {
      this.refunded.add(key)
      this.used = Math.max(0, this.used - this.level.refund)
      this.events.push({ type: 'full', cabinet, row })
    }
    this.settle()
    return 'ok'
  }

  remove(id) {
    const book = this.book(id)
    if (this.status !== 'playing' || book?.state !== 'shelved') return false
    const at = this.board.remove(book)
    book.state = 'floor'
    this.events.push({ type: 'removed', id, cabinet: at.cabinet, row: at.row })
    this.spend(1)
    return true
  }

  revive() {
    if (this.status !== 'reviving' || this.revived) return false
    this.revived = true
    this.used = Math.max(0, this.used - Math.ceil(this.steps * REVIVE_SHARE))
    this.status = 'playing'
    this.events.push({ type: 'revived' })
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

  spend(cost) {
    this.used += cost
    this.settle()
  }

  settle() {
    if (this.status !== 'playing') return
    if (this.board.complete) {
      this.status = 'won'
      this.events.push({ type: 'won' })
    } else if (this.used >= this.steps) {
      this.status = this.revived ? 'lost' : 'reviving'
      this.events.push({ type: this.status })
    }
  }
}
```

- [ ] **Step 4: 运行，确认通过**

Run: `node --test tests/pack-round.test.mjs`
Expected: PASS，8 个测试。

- [ ] **Step 5: 提交**

```bash
git add js/library/PackRound.js tests/pack-round.test.mjs
git -c user.name=dev -c user.email=dev@rainy-mushroom.local commit -m "feat(pack): step-based round with refunds, revive and hidden-safe previews

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: 机器人与调参回归

**Files:**
- Create: `js/library/PackBots.js`
- Create: `tests/pack-bots.test.mjs`

**Interfaces:**
- Consumes: `PackRound`（Task 3）；`candidates`（Task 1）；`SeededRandom`。
- Produces（只给测试用）：
  - `planner(level, seed) → {status, used, steps, revived}`
  - `pack(books, rows) → Book[][]`：找不到正好塞满的方案时抛出异常
  - `greedy(level, seed) → {status, used, steps}`

- [ ] **Step 1: 写失败的测试** `tests/pack-bots.test.mjs`：

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { PACK_LEVELS } from '../js/library/PackLevels.js'
import { planner, greedy } from '../js/library/PackBots.js'

const seeds = level => [level.seed, ...Array.from({ length: 49 }, (_, i) => `${level.seed}:${i}`)]

test('a careful player clears every level on every seed without reviving', () => {
  for (const level of PACK_LEVELS) for (const seed of seeds(level)) {
    const result = planner(level, seed)
    assert.equal(result.status, 'won', `${level.id} ${seed}`)
    assert.equal(result.revived, false)
  }
})

test('stuffing books in without thinking runs out of steps on most seeds of levels 2 and 3', () => {
  for (const level of PACK_LEVELS.slice(1)) {
    const failed = seeds(level).filter(seed => greedy(level, seed).status !== 'won').length
    assert.ok(failed > 25, `${level.id}: greedy failed ${failed}/50`)
  }
})
```

- [ ] **Step 2: 运行，确认失败**

Run: `node --test tests/pack-bots.test.mjs`
Expected: FAIL，报 `Cannot find module .../js/library/PackBots.js`。

- [ ] **Step 3: 实现** `js/library/PackBots.js`：

```js
import { PackRound } from './PackRound.js'
import { candidates } from './PackLevels.js'
import { SeededRandom } from './LibraryRandom.js'

// Test-only players for tuning. Neither reads a book's hidden attributes directly.

// Flips every ambiguous book, then solves each cabinet's rows exactly before placing anything.
export function planner(level, seed = level.seed) {
  const round = new PackRound(level, { seed })
  for (const book of round.books) if (candidates(book, level.cabinets).length > 1) round.flip(book.id)
  level.cabinets.forEach((cabinet, c) => {
    const books = round.books.filter(b => candidates(b, level.cabinets)[0] === c)
    const plan = pack(books, cabinet.rows)
    plan.forEach((row, r) => row.forEach(book => round.place(book.id, c, r)))
  })
  return { status: round.status, used: round.used, steps: round.steps, revived: round.revived }
}

// Exact fill: tallest and thickest first, each book into some row with room. Rows are small, so plain backtracking is instant.
export function pack(books, rows) {
  const order = books.slice().sort((a, b) => (b.height === 'tall') - (a.height === 'tall') || b.thickness - a.thickness)
  const room = rows.map(row => row.length), plan = rows.map(() => [])
  const go = i => {
    if (i === order.length) return room.every(r => r === 0)
    const book = order[i]
    for (let r = 0; r < rows.length; r += 1) {
      if (book.thickness > room[r] || (book.height === 'tall' && rows[r].height !== 'tall')) continue
      room[r] -= book.thickness; plan[r].push(book)
      if (go(i + 1)) return true
      room[r] += book.thickness; plan[r].pop()
    }
    return false
  }
  if (!go(0)) throw Error('no exact packing')
  return plan
}

// Never flips; guesses between matching cabinets and drops each book into the first row it fits, pulling a book back out when stuck.
export function greedy(level, seed = level.seed) {
  const round = new PackRound(level, { seed }), rng = new SeededRandom(`${seed}:greedy`)
  for (let guard = 0; guard < 500 && round.status === 'playing'; guard += 1) {
    let moved = false
    for (const book of round.books.filter(b => b.state === 'floor')) {
      const options = candidates(book, level.cabinets), c = options[rng.int(0, options.length - 1)]
      const r = level.cabinets[c].rows.findIndex((row, i) => round.preview(book.id, c, i) === 'ok')
      if (r < 0) continue
      round.place(book.id, c, r)
      moved = true
      break
    }
    if (moved) continue
    const stuck = round.books.filter(b => b.state === 'shelved' && (at => !round.board.full(at.cabinet, at.row))(round.board.where(b)))
    const pool = stuck.length ? stuck : round.books.filter(b => b.state === 'shelved')
    round.remove(pool[rng.int(0, pool.length - 1)].id)
  }
  return { status: round.status, used: round.used, steps: round.steps }
}
```

- [ ] **Step 4: 运行，确认通过，然后跑全部 pack 测试**

Run: `node --test tests/pack-bots.test.mjs && node --test tests/pack-*.test.mjs tests/library-progress.test.mjs`
Expected: 先是 PASS 2 个测试；然后全部 PASS，共 23 个测试。如果乱塞型的失败数 ≤ 25，就只调 `PACK_LEVELS` 里的 `slack`，每次 −0.05，同时规划型必须仍然全过。调了的话，在 ledger 里记一条 Ruling。

- [ ] **Step 5: 提交**

```bash
git add js/library/PackBots.js tests/pack-bots.test.mjs
git -c user.name=dev -c user.email=dev@rainy-mushroom.local commit -m "test(pack): planner and greedy bots pin the step budgets

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: 同步到 Cocos

**Files:**
- Modify（不提交）: `scripts/cocos/sync-shared.mjs`：在 `visit(resolve(root,'js/library/LibraryProgress.js'));` 这一行后面加一行
- Modify: `tests/library-sync.test.mjs`：第一个测试
- Generated（提交）: `cocos-pilot/assets/scripts/shared/js/library/PackLevels.ts`、`PackBoard.ts`、`PackRound.ts`
- Generated（不提交）: `cocos-pilot/shared-manifest.json`

**Interfaces:**
- Consumes: Task 1–3 的模块。
- Produces: 可以从 `./shared/js/library/PackRound`、`./shared/js/library/PackLevels`、`./shared/js/library/LibraryProgress` 导入的 TS 模块。

- [ ] **Step 1: 改测试，让它先失败**

在 `tests/library-sync.test.mjs` 第一个测试里：把名单数组 `['LibraryRound', 'LibraryProgress', 'LibraryLevels', 'ShelfBoard', 'BookPile', 'RainState', 'LibraryRandom']` 换成下面这行：

```js
  for (const name of ['LibraryRound', 'LibraryProgress', 'LibraryLevels', 'ShelfBoard', 'BookPile', 'RainState', 'LibraryRandom', 'PackRound', 'PackBoard', 'PackLevels']) {
```

然后在 `assert.ok(!sources.includes('js/library/LibraryAutoplay.js'), ...)` 这一行后面加入：

```js
  assert.ok(sources.includes('js/library/PackRound.js'))
  assert.ok(!sources.includes('js/library/PackBots.js'), 'bots stay out of the build')
```

- [ ] **Step 2: 运行，确认失败**

Run: `node --test tests/library-sync.test.mjs`
Expected: FAIL，第一个测试报 `PackRound`（文件不存在）。

- [ ] **Step 3: 加同步入口**

在 `scripts/cocos/sync-shared.mjs` 的 `visit(resolve(root,'js/library/LibraryProgress.js'));` 后面加一行：

```js
visit(resolve(root,'js/library/PackRound.js'));
```

- [ ] **Step 4: 运行，确认通过**

Run: `node --test tests/library-sync.test.mjs tests/forest-cleanup.test.mjs`
Expected:
- `library-sync` 两个测试 PASS。第二个测试仍然匹配旧的 `new LibraryView(this)`，Task 6 才改它。
- `forest-cleanup` 的结果和改动前一致：只有那条已知的基线失败，manifest 前缀检查通过。

- [ ] **Step 5: 提交（只提交测试和生成的 TS）**

```bash
git add tests/library-sync.test.mjs cocos-pilot/assets/scripts/shared/js/library/PackLevels.ts cocos-pilot/assets/scripts/shared/js/library/PackBoard.ts cocos-pilot/assets/scripts/shared/js/library/PackRound.ts
git -c user.name=dev -c user.email=dev@rainy-mushroom.local commit -m "feat(pack): sync packing modules to cocos

The sync entry in sync-shared.mjs is left in the working tree alongside
the uncommitted forest work it depends on.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: 画面 PackView、默认入口、浏览器验证

**Files:**
- Create: `cocos-pilot/assets/scripts/PackView.ts`（`.meta` 由 Cocos 构建生成，一起提交）
- Modify（不提交）: `cocos-pilot/assets/scripts/PinePilot.ts`：第 7、12、24、42、44、45 行
- Modify: `tests/library-sync.test.mjs`：第二个测试

**Interfaces:**
- Consumes: `PackRound`、`PACK_LEVELS`、`PACK_IDS`、`PACK_PROGRESS_KEY`、`packLevelById`、`COLORS`、`PATTERNS`、`LibraryProgress(storage, ids, key)`，以及 `PilotUI` 和 `UI`。
- Produces:
  - `new PackView(host)`：`host` 提供 `canvas`、`safeTop`、`safeBottom`，可选 `progressStorage`。
  - 方法：`render()`、`update(dt)`、`destroy()`。
  - 为浏览器脚本暴露的字段：`round`、`screen`、`modal`、`held`、`ghost`、`rects:Map<id,Rect>`、`rowRects[c][r]`、`floor`、`dialog`。坐标都是根节点坐标，`Rect` 以中心点表示。

- [ ] **Step 1: 改路由测试，让它先失败**

把 `tests/library-sync.test.mjs` 的第二个测试整个替换为：

```js
test('the default entry is the packing game; ?library=1 and the forest parameters keep the older views', () => {
  const host = read('cocos-pilot/assets/scripts/PinePilot.ts')
  assert.match(host, /new PackView\(this\)/)
  assert.match(host, /query\?\.has\('library'\)\?this\.library=new LibraryView\(this\)/)
  assert.match(host, /\['forest','audit','review','microSmoke','campaignSmoke'\]/)
  assert.match(host, /this\.pack\?\.destroy\(\)/)
  assert.equal(JSON.parse(read('cocos-pilot/build-configs/wechatgame.json')).packages.wechatgame.orientation, 'portrait')
})
```

Run: `node --test tests/library-sync.test.mjs`
Expected: FAIL，报 `new PackView\(this\)` 不匹配。

- [ ] **Step 2: 写 PackView**

新建 `cocos-pilot/assets/scripts/PackView.ts`：

```ts
import {Node,Label,Color,Graphics,UITransform,EventTouch,Vec3,view,game,Game,tween,Tween,BlockInputEvents,UIOpacity,sys} from 'cc';
import {PilotUI,UI} from './PilotUI';
import {PackRound} from './shared/js/library/PackRound';
import {LibraryProgress} from './shared/js/library/LibraryProgress';
import {PACK_LEVELS,PACK_IDS,PACK_PROGRESS_KEY,packLevelById,COLORS,PATTERNS} from './shared/js/library/PackLevels';

const C=(v:string)=>new Color(v);
const BG=C('#263f3c'),WOOD=C('#6b4a33'),WALL=C('#3a281d'),CELL=C('#54402f'),FLOOR=C('#3a3226'),WATER=C('#5d8fb0'),UNKNOWN=C('#8d8a7e'),EDGE=C('#1d1a14'),OK=C('#9fd89a'),BAD=C('#e8877a'),FLASH=C('#f2d78e');
type Rect={x:number,y:number,w:number,h:number};
type RowRect=Rect&{left:number,unit:number,short:number,tall:number};
type Held={id:string,from:'floor'|'shelf',touch:number,x:number,y:number,moved:boolean};
type Modal='pause'|'revive'|'won'|'lost'|null;
// Placeholder ad: resolves like AdService.showRewardedVideo() when a video finishes.
const ads={showRewardedVideo:()=>Promise.resolve({status:'rewarded'})};
const REASON:Record<string,string>={'too-tall':'太高了，放不进矮层','too-thick':'太厚了，这层放不下','mismatch':'和这个柜的标志不符'};
const DRAG=8,LIFT=28,MAX_UNITS=7;

// Packing grey box: two cabinets, a floor of books, water that rises with every step. Built once per screen, then updated per event.
export class PackView{
 u!:PilotUI;progress:LibraryProgress;round:PackRound|null=null;screen:'menu'|'round'='menu';modal:Modal=null;saved=true;
 nodes=new Map<string,Node>();rects=new Map<string,Rect>();floorRects=new Map<string,Rect>();rowRects:RowRect[][]=[];floor!:Rect;
 board:Node|null=null;floorLayer:Node|null=null;drag:Node|null=null;fx:Node|null=null;water:Graphics|null=null;hover:Graphics|null=null;
 reason:Label|null=null;steps:Label|null=null;toastNode:Node|null=null;dialog:Node|null=null;ghost:Node|null=null;held:Held|null=null;waterShown=0;
 constructor(private host:any){this.progress=new LibraryProgress(host.progressStorage||sys.localStorage,PACK_IDS,PACK_PROGRESS_KEY);game.on(Game.EVENT_HIDE,this.hide,this);this.render()}
 private hide(){this.cancelHeld();if(this.screen==='round'&&this.round?.status==='playing'&&!this.modal)this.openModal('pause')}
 // Full rebuild: only on screen changes and resizes. Everything is re-derived from the round, including an open dialog.
 render(){this.cancelHeld();const s=view.getVisibleSize();this.u?.destroy();this.u=new PilotUI(this.host.canvas,s.width,s.height,this.host.safeTop,this.host.safeBottom);
  this.nodes.clear();this.rects.clear();this.floorRects.clear();this.rowRects=[];this.board=this.floorLayer=this.drag=this.fx=null;this.water=this.hover=null;this.reason=this.steps=null;this.toastNode=this.dialog=null;
  if(this.screen==='menu')this.buildMenu();else this.buildRound()}
 private label(t:string,parent:Node,x:number,y:number,w:number,h:number,size=16,color=UI.paper){const n=this.u.text(t,parent,w,h,size,color);n.setPosition(x,y);const l=n.getComponent(Label)!;l.horizontalAlign=Label.HorizontalAlign.CENTER;return l}
 // ---------- menu ----------
 private buildMenu(){const u=this.u,w=u.width,top=u.height/2-u.top;u.box(u.root,BG,0);
  this.label('雨后森林图书馆',u.root,0,top-50,w-40,44,26);this.label(`把书塞进对的柜子 · 已整理 ${this.progress.lit} / ${PACK_LEVELS.length}`,u.root,0,top-92,w-40,28,15,C('#cfdccb'));
  if(this.progress.locked)this.label('存档无法读取，本次进度不会保存',u.root,0,top-124,w-40,24,13,C('#e8a07a'));
  PACK_LEVELS.forEach((l:any,i:number)=>{const open=this.progress.canOpen(l.id),done=this.progress.completed.includes(l.id);u.button(`${i+1}. ${l.name}${done?'  ✓':open?'':'（未解锁）'}`,()=>{if(open)this.start(l.id)},u.root,w-64,56,open?'green':'paper').setPosition(0,top-180-i*68)})}
 private start(id:string){this.round=new PackRound(packLevelById(id));this.screen='round';this.modal=null;this.saved=true;this.waterShown=0;this.render();this.toast(this.round.level.tip,3.5)}
 private toMenu(){this.round=null;this.screen='menu';this.modal=null;this.render()}
 // ---------- round layout ----------
 private buildRound(){const u=this.u,w=u.width,h=u.height,top=h/2-u.top,bottom=-h/2+u.bottom,r=this.round!,lv=r.level;u.box(u.root,BG,0);
  const layer=(name:string)=>u.node(name,u.root,w,h);this.board=layer('书柜');this.floorLayer=layer('地面');const waterNode=layer('水');this.drag=layer('手上');this.fx=layer('效果');
  this.water=waterNode.addComponent(Graphics);this.hover=this.fx.addComponent(Graphics);this.reason=this.label('',this.fx,0,0,200,24,13,BAD);
  u.icon('pause',()=>{this.cancelHeld();if(!this.modal)this.openModal('pause')}).setPosition(-w/2+36,top-28);
  this.label(lv.name,u.root,0,top-28,160,28,17);this.steps=this.label('',u.root,w/2-62,top-28,110,28,15);
  const floorTop=this.layoutCabinets(top-60,top-60-bottom);this.floor={x:0,y:(floorTop+bottom)/2,w:w-24,h:floorTop-bottom};
  const f=u.node('地板',this.floorLayer,this.floor.w,this.floor.h);f.setPosition(0,this.floor.y);u.box(f,FLOOR,10);this.layoutFloor();
  for(const b of r.books){this.bookNode(b);if(b.state==='floor')this.toFloor(b)}
  this.rowRects.forEach((rows,c)=>rows.forEach((_,row)=>this.layoutRow(c,row)));
  const root=u.root;root.on(Node.EventType.TOUCH_START,this.onStart,this);root.on(Node.EventType.TOUCH_MOVE,this.onMove,this);root.on(Node.EventType.TOUCH_END,this.onEnd,this);root.on(Node.EventType.TOUCH_CANCEL,this.onCancel,this);
  this.refreshHud();this.drawWater();if(this.modal)this.openModal(this.modal)}
 // Two cabinets side by side, rows scaled so the cabinets take about half of the play area. Returns the floor's top edge.
 private layoutCabinets(top:number,playH:number){const u=this.u,w=u.width,lv=this.round!.level,gap=12,cw=(w-gap*3)/2,plaque=34,pad=8;
  const natural=Math.max(...lv.cabinets.map((c:any)=>c.rows.reduce((s:number,row:any)=>s+(row.height==='tall'?62:46)+pad,pad)));
  const k=Math.min(1.35,Math.max(.8,(playH*.5-plaque)/natural)),short=46*k,tall=62*k,bodyH=natural*k;
  lv.cabinets.forEach((cab:any,c:number)=>{const cx=-w/2+gap+cw/2+c*(cw+gap),left=cx-cw/2+8,unit=(cw-16)/MAX_UNITS;
   const sign=u.node('标志',this.board!,cw,plaque-4);sign.setPosition(cx,top-plaque/2);u.box(sign,C(COLORS[cab.color].hex),8);this.label(`${COLORS[cab.color].name} · ${PATTERNS[cab.pattern].icon} ${PATTERNS[cab.pattern].name}`,sign,0,0,cw,plaque-4,15);
   const body=u.node('柜体',this.board!,cw,bodyH);body.setPosition(cx,top-plaque-bodyH/2);u.box(body,WOOD,8);
   const g=u.node('层',this.board!,w,u.height).addComponent(Graphics);let y=top-plaque-pad*k;
   this.rowRects[c]=cab.rows.map((row:any)=>{const rh=row.height==='tall'?tall:short,R:RowRect={x:cx,y:y-rh/2,w:cw-16,h:rh,left,unit,short,tall};
    g.fillColor=WALL;g.rect(left,y-rh,cw-16,rh);g.fill();g.fillColor=CELL;for(let i=0;i<row.length;i++){g.rect(left+i*unit+1,y-rh+1,unit-2,rh-2);g.fill()}
    y-=rh+pad*k;return R})});
  return top-plaque-bodyH-14}
 // Floor books sit in fixed, non-overlapping slots in deal order; the unit shrinks until every book fits.
 private layoutFloor(){const r=this.round!,F=this.floor,books=r.books.slice().sort((a:any,b:any)=>a.slot-b.slot);
  for(let fu=30;;fu-=2){const lineH=fu*3.2,width=F.w-20,out:Array<[string,Rect,number]>=[];let x=0,line=0;
   for(const b of books){const bw=b.thickness*fu,bh=b.height==='tall'?fu*3:fu*2.2;if(x&&x+bw>width){x=0;line++}out.push([b.id,{x:-F.w/2+10+x+bw/2,y:0,w:bw,h:bh},line]);x+=bw+8}
   if((line+1)*lineH+16>F.h&&fu>14)continue;
   for(const [id,R,l] of out){R.y=F.y+F.h/2-10-(l+1)*lineH+6+R.h/2;this.floorRects.set(id,R)}return}}
 // ---------- books ----------
 private bookNode(b:any){const n=this.u.node(b.id,this.floorLayer!,10,10);n.addComponent(Graphics);n.addComponent(UIOpacity);const t=this.u.text('',n,10,10,14,UI.paper);t.name='字';t.getComponent(Label)!.horizontalAlign=Label.HorizontalAlign.CENTER;this.nodes.set(b.id,n);return n}
 private paint(n:Node,b:any,R:Rect,shelved:boolean){n.getComponent(UITransform)!.setContentSize(R.w,R.h);const g=n.getComponent(Graphics)!,vis=shelved?['color','pattern']:this.round!.visible(b.id);g.clear();
  g.fillColor=vis.includes('color')?C(COLORS[b.color].hex):UNKNOWN;g.roundRect(-R.w/2,-R.h/2,R.w,R.h,4);g.fill();g.strokeColor=EDGE;g.lineWidth=1.5;g.roundRect(-R.w/2,-R.h/2,R.w,R.h,4);g.stroke();
  if(!shelved&&this.round!.canFlip(b.id)){g.fillColor=C('#f4ecd0');g.moveTo(R.w/2-10,R.h/2);g.lineTo(R.w/2,R.h/2);g.lineTo(R.w/2,R.h/2-10);g.close();g.fill()}
  const t=n.getChildByName('字')!,l=t.getComponent(Label)!;t.getComponent(UITransform)!.setContentSize(R.w,R.h);l.string=vis.includes('pattern')?PATTERNS[b.pattern].icon:'?';l.fontSize=Math.max(10,Math.min(18,R.w*.6));l.lineHeight=l.fontSize*1.3}
 private put(n:Node,parent:Node,R:Rect){if(n.parent!==parent)n.setParent(parent);n.setPosition(R.x,R.y);n.setScale(1,1,1);n.getComponent(UIOpacity)!.opacity=255}
 private toFloor(b:any){const n=this.nodes.get(b.id)!,R=this.floorRects.get(b.id)!;this.put(n,this.floorLayer!,R);this.paint(n,b,R,false);this.rects.set(b.id,R)}
 // Books in a row pack to the left in arrival order; short books stand on the floor of a tall row.
 private layoutRow(c:number,row:number){const r=this.round!,R=this.rowRects[c][row];let x=R.left;
  for(const b of r.board.row(c,row).books){const bw=b.thickness*R.unit,bh=(b.height==='tall'?R.tall:R.short)-6,S={x:x+bw/2,y:R.y-R.h/2+3+bh/2,w:bw-2,h:bh};const n=this.nodes.get(b.id)!;this.put(n,this.board!,S);this.paint(n,b,S,true);this.rects.set(b.id,S);x+=bw}}
 // ---------- input: one root listener, one finger ----------
 // UI location is bottom-left based; the canvas (and root) sit at the world origin, centred under the camera.
 private local(e:EventTouch){const p=e.getUILocation(),s=view.getVisibleSize();return {x:p.x-s.width/2,y:p.y-s.height/2}}
 private inside(R:Rect,x:number,y:number,pad=0){return Math.abs(x-R.x)<=R.w/2+pad&&Math.abs(y-R.y)<=R.h/2+pad}
 private bookAt(x:number,y:number){const r=this.round!;const hit=(state:string)=>r.books.find((b:any)=>b.state===state&&this.inside(this.rects.get(b.id)!,x,y,4));return hit('shelved')||hit('floor')||null}
 private rowAt(x:number,y:number){for(let c=0;c<this.rowRects.length;c++)for(let row=0;row<this.rowRects[c].length;row++)if(this.inside(this.rowRects[c][row],x,y,6))return {c,row};return null}
 private onStart(e:EventTouch){const r=this.round;if(this.screen!=='round'||!r||this.modal)return;if(this.held)this.cancelHeld();// a lost touch-end must not leave a book in hand
  const p=this.local(e),b=this.bookAt(p.x,p.y);if(!b||!r.canPick(b.id))return;this.held={id:b.id,from:b.state==='shelved'?'shelf':'floor',touch:e.getID(),x:p.x,y:p.y,moved:false}}
 private onMove(e:EventTouch){const h=this.held;if(!h||e.getID()!==h.touch)return;const p=this.local(e);if(!h.moved&&Math.hypot(p.x-h.x,p.y-h.y)<DRAG)return;if(!h.moved){h.moved=true;this.lift()}this.follow(p.x,p.y)}
 private onEnd(e:EventTouch){const h=this.held;if(!h||e.getID()!==h.touch)return;const p=this.local(e);if(!h.moved){this.cancelHeld();this.tap(h.id);return}this.drop(h,p.x,p.y+LIFT)}
 private onCancel(e:EventTouch){if(this.held&&e.getID()===this.held.touch)this.cancelHeld()}
 private lift(){const h=this.held!,b=this.round!.book(h.id),R=this.rects.get(h.id)!,n=this.nodes.get(h.id)!;n.getComponent(UIOpacity)!.opacity=90;
  const F=this.floorRects.get(h.id)!,g=this.u.node('拿着',this.drag!,F.w,F.h);g.addComponent(Graphics);g.addComponent(UIOpacity);const t=this.u.text('',g,F.w,F.h,14,UI.paper);t.name='字';t.getComponent(Label)!.horizontalAlign=Label.HorizontalAlign.CENTER;
  this.paint(g,b,{x:0,y:0,w:F.w,h:F.h},h.from==='shelf');g.setScale(1.12,1.12,1);g.setPosition(R.x,R.y);this.ghost=g}
 private follow(x:number,y:number){const h=this.held!;this.ghost?.setPosition(x,y+LIFT);this.preview(h,x,y+LIFT)}
 private preview(h:Held,x:number,y:number){const g=this.hover!,r=this.round!;g.clear();this.reason!.string='';const t=this.rowAt(x,y);if(!t)return;
  const b=r.book(h.id),at=h.from==='shelf'?r.board.where(b):null;if(at&&at.cabinet===t.c&&at.row===t.row)return;
  const R=this.rowRects[t.c][t.row],fit=r.preview(h.id,t.c,t.row);
  if(fit==='ok'){const used=r.board.used(t.c,t.row),bh=(b.height==='tall'?R.tall:R.short)-6;g.fillColor=new Color(OK.r,OK.g,OK.b,120);g.rect(R.left+used*R.unit,R.y-R.h/2+3,b.thickness*R.unit-2,bh);g.fill();return}
  g.strokeColor=BAD;g.lineWidth=3;g.rect(R.x-R.w/2,R.y-R.h/2,R.w,R.h);g.stroke();this.reason!.string=REASON[fit]||'';this.reason!.node.setPosition(R.x,R.y-R.h/2-12)}
 // Drops anywhere but the book's own row pull a shelved book out first (1 step); a row under the book then gets a normal placement.
 private drop(h:Held,x:number,y:number){const r=this.round!,t=this.rowAt(x,y),b=r.book(h.id);this.cancelHeld();
  if(h.from==='shelf'){const at=r.board.where(b);if(t&&at&&at.cabinet===t.c&&at.row===t.row)return;r.remove(h.id)}
  const fit=t&&r.status==='playing'?r.place(h.id,t.c,t.row):null;this.apply(r.drain());
  if(fit==='too-tall'||fit==='too-thick'){this.toast(REASON[fit]);this.shake(this.nodes.get(h.id)!)}}
 private tap(id:string){const r=this.round!;if(r.flip(id)){this.apply(r.drain());return}if(r.book(id).state==='floor')this.toast('拖到柜子里；角上有白角的书可以点开看全')}
 private cancelHeld(){if(this.ghost?.isValid)this.ghost.destroy();this.ghost=null;const h=this.held;this.held=null;if(!h)return;
  const n=this.nodes.get(h.id);if(n?.isValid)n.getComponent(UIOpacity)!.opacity=255;if(this.hover?.isValid)this.hover.clear();if(this.reason?.isValid)this.reason.string=''}
 // ---------- events → incremental updates ----------
 private apply(events:any[]){const r=this.round!;
  for(const e of events){const b=e.id?r.book(e.id):null,n=e.id?this.nodes.get(e.id):null;
   if(e.type==='flipped'){this.toFloor(b);this.pop(n!)}
   else if(e.type==='wrong'){this.toFloor(b);this.shake(n!);this.toast(`不是这个柜 · 多用了 2 步`)}
   else if(e.type==='placed'){this.layoutRow(e.cabinet,e.row);this.pop(n!);this.floatText('咔',this.rects.get(e.id)!)}
   else if(e.type==='removed'){this.toFloor(b);this.layoutRow(e.cabinet,e.row)}
   else if(e.type==='full'){this.flashRow(e.cabinet,e.row);this.toast(`这一层塞满了 · 退回 ${r.level.refund} 步`)}
   else if(e.type==='revived')this.toast('水退下去了一截')
   else if(e.type==='won'){this.saved=this.progress.complete(r.level.id);this.openModal('won')}// the only save write per clear
   else if(e.type==='reviving')this.openModal('revive')
   else if(e.type==='lost')this.openModal('lost')}
  this.refreshHud()}
 private refreshHud(){const r=this.round,l=this.steps;if(!r||!l?.isValid)return;l.string=`剩余 ${r.left} 步`;l.color=r.left<=3?BAD:UI.paper}
 private pop(n:Node){Tween.stopAllByTarget(n);n.setScale(1.18,1.18,1);tween(n).to(.12,{scale:new Vec3(1,1,1)}).start()}
 private shake(n:Node){const p=n.position.clone();tween(n).by(.05,{position:new Vec3(6,0,0)}).by(.1,{position:new Vec3(-12,0,0)}).to(.05,{position:p}).start()}
 private floatText(t:string,R:Rect){const l=this.label(t,this.fx!,R.x,R.y+R.h/2+6,60,24,16,FLASH),n=l.node,o=n.addComponent(UIOpacity);tween(n).by(.5,{position:new Vec3(0,18,0)}).call(()=>n.destroy()).start();tween(o).delay(.2).to(.3,{opacity:0}).start()}
 private flashRow(c:number,row:number){const R=this.rowRects[c][row],n=this.u.node('塞满',this.fx!,R.w,R.h);n.setPosition(R.x,R.y);const g=n.addComponent(Graphics),o=n.addComponent(UIOpacity);g.fillColor=new Color(FLASH.r,FLASH.g,FLASH.b,150);g.rect(-R.w/2,-R.h/2,R.w,R.h);g.fill();tween(o).to(.6,{opacity:0}).call(()=>n.destroy()).start()}
 private toast(text:string,seconds=1.6){if(!this.fx?.isValid)return;if(!this.toastNode?.isValid){const n=this.u.node('提示',this.fx,this.u.width-40,34);n.setPosition(0,this.floor.y+this.floor.h/2+2);this.u.box(n,new Color(20,34,28,220),12);this.label('',n,0,0,this.u.width-56,34,14);n.addComponent(UIOpacity);this.toastNode=n}
  const n=this.toastNode!,o=n.getComponent(UIOpacity)!;n.getComponentInChildren(Label)!.string=text;Tween.stopAllByTarget(o);o.opacity=255;tween(o).delay(seconds).to(.3,{opacity:0}).start()}
 private drawWater(){const g=this.water,F=this.floor;if(!g?.isValid)return;g.clear();if(this.waterShown<=.001)return;const top=F.y-F.h/2+this.waterShown*F.h;
  g.fillColor=new Color(WATER.r,WATER.g,WATER.b,140);g.rect(-this.u.width/2,-this.u.height/2,this.u.width,top+this.u.height/2);g.fill();g.strokeColor=C('#bfe0f0');g.lineWidth=2;g.moveTo(-this.u.width/2,top);g.lineTo(this.u.width/2,top);g.stroke()}
 // ---------- dialogs: built once, unchanged until closed ----------
 private openModal(kind:Modal){this.closeModal();this.modal=kind;const r=this.round!,id=r.level.id,i=PACK_IDS.indexOf(id),next=PACK_LEVELS[i+1];
  if(kind==='pause')this.card('暂停','水先停一停',[['继续',()=>this.closeModal()],['重新开始',()=>this.start(id)],['回菜单',()=>this.toMenu()]]);
  else if(kind==='revive')this.card('水漫上来了','看一段广告，水退下去三成',[['看广告退水',()=>{void ads.showRewardedVideo().then((res:any)=>{if(res.status==='rewarded'&&this.round===r&&r.revive()){this.closeModal();this.apply(r.drain())}})}],['放弃',()=>{r.giveUp();this.openModal('lost')}]]);
  else if(kind==='won')this.card('这一柜整理好了',`还剩 ${r.left} 步${this.saved?'':'（未保存）'}`,next?[['下一关',()=>this.start(next.id)],['回菜单',()=>this.toMenu()]]:[['回菜单',()=>this.toMenu()]]);
  else if(kind==='lost')this.card('书被水泡了','先想好每层怎么塞，再动手',[['重试',()=>this.start(id)],['回菜单',()=>this.toMenu()]])}
 private closeModal(){if(this.dialog?.isValid)this.dialog.destroy();this.dialog=null;this.modal=null}
 private card(title:string,body:string,buttons:Array<[string,()=>void]>){const u=this.u,w=u.width,n=u.node('弹窗',u.root,w,u.height);n.addComponent(BlockInputEvents);u.box(n,new Color(10,20,16,190),0);const card=u.node('卡片',n,w-48,150+buttons.length*62);u.box(card,UI.paper,18);
  const ch=card.getComponent(UITransform)!.height;this.label(title,card,0,ch/2-34,w-80,36,22,UI.ink);this.label(body,card,0,ch/2-72,w-80,40,15,UI.muted);
  buttons.forEach(([t,fn],i)=>u.button(t,fn,card,w-96,52,i?'paper':'green').setPosition(0,ch/2-130-i*62));this.dialog=n}
 // ---------- frame: only the water line eases toward the round's level ----------
 update(dt:number){const r=this.round;if(this.screen!=='round'||!r)return;const target=r.water,d=target-this.waterShown;if(Math.abs(d)<.001)return;this.waterShown=Math.abs(d)<.002?target:this.waterShown+d*Math.min(1,Math.min(dt,.1)*6);this.drawWater()}
 destroy(){game.off(Game.EVENT_HIDE,this.hide,this);this.cancelHeld();this.u?.destroy()}
}
```

- [ ] **Step 3: 改 PinePilot 路由（不提交）**

对 `cocos-pilot/assets/scripts/PinePilot.ts` 做下面 6 处精确替换：
1. 第 7 行 `import {LibraryView} from './LibraryView';` 之后追加 `import {PackView} from './PackView';`
2. 第 12 行 `library:LibraryView|null=null;` → `library:LibraryView|null=null;pack:PackView|null=null;`
3. 第 24 行 `{this.library=new LibraryView(this);view.on(` → `{query?.has('library')?this.library=new LibraryView(this):this.pack=new PackView(this);view.on(`
4. 第 42 行 `update(dt:number){this.library?.update(dt);` → `update(dt:number){this.library?.update(dt);this.pack?.update(dt);`
5. 第 44 行 `this.library?.render();` → `this.library?.render();this.pack?.render();`
6. 第 45 行 `this.library?.destroy();this.library=null;` → `this.library?.destroy();this.library=null;this.pack?.destroy();this.pack=null;`

Run: `node --test tests/library-sync.test.mjs`
Expected: PASS，2 个测试。

- [ ] **Step 4: 构建 web-mobile**

Run: `npm run cocos:build > .superpowers/sdd/2026-09-28-rainy-library-packing/build.log 2>&1; tail -5 .superpowers/sdd/2026-09-28-rainy-library-packing/build.log`
Expected: 构建成功，没有 `error TS` 或 `Error:`。如果 Cocos 报类型错误，按报错修 `PackView.ts`，并在 ledger 里记 Ruling。

- [ ] **Step 5: 打开游戏，确认默认入口**

预览服务器已在 `http://127.0.0.1:8767` 运行（`npm run preview`）；没有运行就在后台启动它。用 Playwright MCP 操作：
- `browser_resize` 设为 390×844。
- `browser_navigate` 打开 `http://127.0.0.1:8767/cocos-pilot/build/web-mobile/index.html`。
- 等 3 秒后 `browser_take_screenshot`。

Expected: 菜单上有"雨后森林图书馆"和 3 个关卡按钮，只有第 1 个可以点；`browser_console_messages` 里没有报错。

- [ ] **Step 6: 自动通 3 关**

用 `browser_run_code_unsafe` 运行下面的脚本（同时把它保存为 `.superpowers/sdd/2026-09-28-rainy-library-packing/play-pack.js`）：

```js
async (page) => {
  // Viewport 390 wide over a 375-wide FIXED_WIDTH design: design → screen is ((x + w/2) * S, (h/2 - y) * S).
  const S = 390 / 375, LIFT = 28, LEVELS = 3 // Task 6 Step 8 runs this with LEVELS = 1
  const info = () => page.evaluate(() => {
    const cc = window.cc; let v = null
    const walk = n => { for (const c of n.components) if (c.pack) v = c.pack; n.children.forEach(walk) }
    walk(cc.director.getScene()); window.__pack = v
    const s = cc.view.getVisibleSize(), r = v.round
    if (!r) return { screen: v.screen, w: s.width, h: s.height }
    const cabs = r.level.cabinets
    return {
      screen: v.screen, modal: v.modal, status: r.status, left: r.left, w: s.width, h: s.height, held: !!v.held, ghost: !!v.ghost,
      books: r.books.map(b => {
        const vis = r.visible(b.id)
        return { id: b.id, cabinet: b.cabinet, thickness: b.thickness, height: b.height, state: b.state, rect: v.rects.get(b.id),
          ambiguous: vis.length === 1 && cabs.every(c => c[vis[0]] === cabs[0][vis[0]]) }
      }),
      rows: v.rowRects.map((rows, c) => rows.map((R, i) => ({ x: R.x, y: R.y, height: cabs[c].rows[i].height, length: cabs[c].rows[i].length }))),
    }
  })
  const sc = (x, y, i) => [(x + i.w / 2) * S, (i.h / 2 - y) * S]
  const tap = async (x, y, i) => { const [a, b] = sc(x, y, i); await page.mouse.click(a, b); await page.waitForTimeout(120) }
  const drag = async (from, to, i) => {
    const [x1, y1] = sc(from.x, from.y, i), [x2, y2] = sc(to.x, to.y - LIFT, i)
    await page.mouse.move(x1, y1); await page.mouse.down()
    for (let k = 1; k <= 6; k++) { await page.mouse.move(x1 + (x2 - x1) * k / 6, y1 + (y2 - y1) * k / 6); await page.waitForTimeout(16) }
    await page.mouse.up(); await page.waitForTimeout(150)
  }
  const pack = (books, rows) => {
    const order = books.slice().sort((a, b) => (b.height === 'tall') - (a.height === 'tall') || b.thickness - a.thickness)
    const room = rows.map(r => r.length), plan = rows.map(() => [])
    const go = k => { if (k === order.length) return room.every(x => x === 0); const b = order[k]
      for (let r = 0; r < rows.length; r++) { if (b.thickness > room[r] || (b.height === 'tall' && rows[r].height !== 'tall')) continue
        room[r] -= b.thickness; plan[r].push(b); if (go(k + 1)) return true; room[r] += b.thickness; plan[r].pop() } return false }
    go(0); return plan
  }
  const log = []
  let i = await info()
  if (i.screen === 'menu') { await tap(0, i.h / 2 - 28 - 180, i); i = await info() }
  for (let lv = 0; lv < LEVELS; lv++) {
    for (const b of i.books.filter(b => b.ambiguous)) await tap(b.rect.x, b.rect.y, i)
    i = await info()
    for (let c = 0; c < i.rows.length; c++) {
      const plan = pack(i.books.filter(b => b.cabinet === c), i.rows[c])
      for (let r = 0; r < plan.length; r++) for (const b of plan[r]) {
        const now = (await info()).books.find(x => x.id === b.id)
        await drag(now.rect, i.rows[c][r], i)
      }
    }
    i = await info()
    log.push(`L${lv + 1}: ${i.status} modal=${i.modal} left=${i.left}`)
    await page.screenshot({ path: `.superpowers/sdd/2026-09-28-rainy-library-packing/pack-L${lv + 1}.png` })
    if (i.status !== 'won' || lv === LEVELS - 1) break
    await tap(0, 7, i) // first button of a two-button card
    i = await info()
  }
  return log
}
```

Expected: 返回 `["L1: won modal=won left=…", "L2: won modal=won left=…", "L3: won modal=won left=…"]`，三关的 `left` 都 ≥ 0。然后逐张看截图 `pack-L1.png`、`pack-L2.png`、`pack-L3.png`，确认以下几点：
- 两柜的标志可读。
- 每层都塞满了。
- 地面上已放走的书留出空位。
- 结算卡片显示"这一柜整理好了"。

- [ ] **Step 7: 可靠性检查（Review Focus 1、2、5）**

先用 `browser_evaluate` 执行 `localStorage.removeItem('rainyLibrary.pack.v1')`，然后 `browser_navigate` 重新打开 `http://127.0.0.1:8767/cocos-pilot/build/web-mobile/index.html`，再用 `browser_run_code_unsafe` 运行下面的脚本（保存为 `.superpowers/sdd/2026-09-28-rainy-library-packing/check-pack.js`）：

```js
async (page) => {
  // Run on a fresh level 1 (menu → first button). Each check restores a playable state for the next.
  const S = 390 / 375
  const v = () => page.evaluate(() => {
    const cc = window.cc; let p = null
    const walk = n => { for (const c of n.components) if (c.pack) p = c.pack; n.children.forEach(walk) }
    walk(cc.director.getScene()); window.__pack = p
    const s = cc.view.getVisibleSize(), r = p.round
    const floor = r && r.books.filter(b => b.state === 'floor').map(b => ({ id: b.id, ...p.rects.get(b.id) }))
    return { w: s.width, h: s.height, modal: p.modal, held: !!p.held, ghost: !!p.ghost, left: r?.left, status: r?.status, floor,
      floorRect: p.floor, rowsBottom: p.rowRects.length ? Math.min(...p.rowRects.flat().map(R => R.y - R.h / 2)) : null,
      states: r && Object.fromEntries(r.books.map(b => [b.id, b.state])),
      dialog: p.dialog ? p.dialog.getComponentsInChildren(cc.Label).map(l => l.string).join('|') : '' }
  })
  const sc = (x, y, i) => [(x + i.w / 2) * S, (i.h / 2 - y) * S]
  const out = {}
  let i = await v()
  if (!i.floor) { const [a, b] = sc(0, i.h / 2 - 28 - 180, i); await page.mouse.click(a, b); await page.waitForTimeout(300); i = await v() }
  const hold = async (book) => { const [x, y] = sc(book.x, book.y, i); await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x + 10, y - 30, { steps: 3 }); await page.waitForTimeout(50) }

  // 1. Resize while holding: the book goes back, nothing is spent, no ghost survives.
  await hold(i.floor[0]); await page.evaluate(() => window.__pack.render()); await page.mouse.up(); await page.waitForTimeout(100)
  let j = await v(); out.resize = { held: j.held, ghost: j.ghost, left: j.left === i.left, state: j.states[i.floor[0].id] }

  // 2. Hide while holding: the book goes back and the pause dialog opens once.
  await hold(i.floor[0]); await page.evaluate(() => window.cc.game.emit(window.cc.Game.EVENT_HIDE)); await page.mouse.up(); await page.waitForTimeout(100)
  j = await v(); out.hide = { held: j.held, ghost: j.ghost, modal: j.modal }
  { const [a, b] = sc(0, 168 - 130, j); await page.mouse.click(a, b); await page.waitForTimeout(150) } // 继续 on the three-button card
  j = await v(); out.resume = j.modal

  // 3. Lost touch-end: pretend the end belongs to another finger, then touch another book; the first must be released.
  await hold(i.floor[0]); await page.evaluate(() => { window.__pack.held.touch = 999 }); await page.mouse.up(); await page.waitForTimeout(50)
  j = await v(); const stuck = j.held
  await hold(i.floor[1]); await page.mouse.up(); await page.waitForTimeout(150)
  j = await v(); out.lostEnd = { stuckBefore: stuck, heldAfter: j.held, ghost: j.ghost, first: j.states[i.floor[0].id] }

  // 4. Small screen: floor books never overlap each other or the cabinets.
  await page.setViewportSize({ width: 375, height: 667 }); await page.waitForTimeout(400)
  j = await v(); const f = j.floor, overlap = f.some((a, x) => f.some((b, y) => x < y && Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2))
  const floorTop = j.floorRect.y + j.floorRect.h / 2
  out.small = { overlap, inside: f.every(b => b.y + b.h / 2 <= floorTop && b.y - b.h / 2 >= j.floorRect.y - j.floorRect.h / 2), cabinetsAboveFloor: j.rowsBottom > floorTop }
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(400)

  return out
}
```

Expected:
- `resize = {held:false, ghost:false, left:true, state:'floor'}`
- `hide = {held:false, ghost:false, modal:'pause'}`，并且 `resume = null`
- `lostEnd = {stuckBefore:true, heldAfter:false, ghost:false, first:'floor'}`
- `small = {overlap:false, inside:true, cabinetsAboveFloor:true}`

如果 `small.inside` 为 false，说明 667 高的屏幕放不下地面上的书：把 `layoutFloor` 循环里的下限 `fu>14` 改成 `fu>12`，在 ledger 里记 Ruling，然后重新构建。

- [ ] **Step 8: 存档失败显示"未保存"（Review Focus 4），以及重建后不重写存档（Review Focus 2）**

接着 Step 7 的页面继续（仍停在第 1 关，一步都没花）：
1. 用 `browser_evaluate` 执行 `Storage.prototype.setItem=()=>{throw Error('quota')}`。
2. 把 `play-pack.js` 里的 `LEVELS = 3` 改成 `LEVELS = 1`，用 `browser_run_code_unsafe` 运行。
   Expected: `["L1: won modal=won left=…"]`。
3. 用 `browser_evaluate` 执行 `window.__pack.dialog.getComponentsInChildren(cc.Label).map(l=>l.string).join('|')`。
   Expected: 包含 `还剩` 和 `（未保存）`。
4. 用 `browser_evaluate` 执行 `(()=>{let n=0;Storage.prototype.setItem=function(){n++};window.__pack.render();return [window.__pack.modal,n]})()`。
   Expected: `['won',0]`，即重建后弹窗仍在，并且没有再写存档。
5. 把 `play-pack.js` 改回 `LEVELS = 3`，然后 `browser_navigate` 重新加载页面，恢复原生的 `setItem`。

- [ ] **Step 9: 手动手感检查**

在 390×844 下手动拖一次，截图确认以下三点：
- 拖到放得下的层上方时显示绿色虚影。
- 把高书拖到矮层上方时显示红框，并提示"太高了，放不进矮层"。
- 拖到另一个柜时显示"和这个柜的标志不符"（前提是书脊已经露出了不同的属性）。

具体做法：用 `browser_run_code_unsafe` 执行 `page.mouse.down` 并移动到目标层，**先不松开**就截图，最后再 `mouse.up`。

- [ ] **Step 10: 微信构建和全量测试**

Run: `npm run cocos:build:wechat > .superpowers/sdd/2026-09-28-rainy-library-packing/wechat.log 2>&1; grep -E "WeChat main package|Error" .superpowers/sdd/2026-09-28-rainy-library-packing/wechat.log`
Expected: 出现 `WeChat main package: X MiB`，没有 Error。

Run: `npm test > .superpowers/sdd/2026-09-28-rainy-library-packing/test.log 2>&1; grep -E "^# (pass|fail)|^not ok" .superpowers/sdd/2026-09-28-rainy-library-packing/test.log`
Expected: 只有 1 条 `not ok`，就是 "retired runtime and resource bundles cannot reenter builds"。

- [ ] **Step 11: 提交（不提交 PinePilot.ts）**

```bash
git add cocos-pilot/assets/scripts/PackView.ts cocos-pilot/assets/scripts/PackView.ts.meta tests/library-sync.test.mjs
git add cocos-pilot/assets/scripts/shared/js/library/PackLevels.ts.meta cocos-pilot/assets/scripts/shared/js/library/PackBoard.ts.meta cocos-pilot/assets/scripts/shared/js/library/PackRound.ts.meta
git -c user.name=dev -c user.email=dev@rainy-mushroom.local commit -m "feat(pack): playable packing view as the default entry

Routing in PinePilot.ts stays in the working tree with the uncommitted
forest work; ?library=1 opens the previous library prototype.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

构建后如果某个 `.meta` 不存在，就从 `git add` 里去掉那一项，并在 ledger 里记录。
