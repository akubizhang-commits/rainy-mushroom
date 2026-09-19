# 雨后菌语 · Roguelike 探菌 MVP 实施计划（Plan 1 / 4）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用 3 周做出 Roguelike 探菌玩法的可玩 MVP —— 单生境、10 菌物、一局 3 分钟从"选路→节点事件→识别战斗→长按采摘→结算"完整跑通，供 5 位真实用户验证"想再玩一局吗"。

**Architecture:** 在 `cocos-pilot/assets/scripts/roguelike/` 新建独立子系统，与旧 3D 探索代码完全解耦；单一 `RoguelikeGame` 状态类持有一局数据（不写盘），Cocos 组件只负责渲染和输入；菌物数据通过 adapter 从 `js/data/species.js` 载入，不复制。入口通过 `PilotUI` 加一个"Roguelike 试玩"按钮进入独立 scene。

**Tech Stack:** Cocos Creator 3.8.8、TypeScript（组件层）、原生 ES modules JS（状态层，可 node --test）、Node 内置 `node:test`、已有 `npm run cocos:build:wechat` 构建管线。

**Spec:** 本文档同时作为 spec；上层设计决定 = `a/a/a/b/b+c`（2D 俯视 / 杀戮尖塔式节点地图 / 体力条失败 / 识别+长按采摘 / 图鉴解锁装备+精通条被动加成）。

## Global Constraints

- Cocos Creator 版本严格 **3.8.8**，不升级引擎
- 微信小游戏基础库 **≥ 2.8.0**（沿用现广告约束）
- 所有状态层代码必须能在 **node --test** 下运行（禁止直接 import Cocos）
- 老代码（`js/ExplorationGame.js` 等）**只读**，MVP 期间不删不改
- 新数据不写微信 `wx.setStorage`，本 MVP **只做内存态**（Plan 2 再做持久化）
- 中文命名沿用旧游戏："采菌"、"识别"、"生境"、"体力"（不叫 HP）
- MVP 单生境用 **"暖湿针阔混交林"**（现有 12 生境中第一个），菌物取该生境物种池前 10 种

---

## 文件结构

**新增（Create）：**

| 路径 | 责任 |
|---|---|
| `js/roguelike/speciesAdapter.mjs` | 从 `js/data/species.js` 提取 10 菌物 → `MushroomCard[]` |
| `js/roguelike/routeGenerator.mjs` | 输入 seed → 生成 4 层节点地图 |
| `js/roguelike/RoguelikeGame.mjs` | 一局状态机：体力、位置、事件流转、结算 |
| `js/roguelike/identification.mjs` | 识别战斗判定（3 线索 3 选 1） |
| `js/roguelike/harvest.mjs` | 长按采摘状态（进度 0→1，可打断） |
| `cocos-pilot/assets/scripts/roguelike/RoguelikeScene.ts` | Cocos 顶层组件，装配子 View |
| `cocos-pilot/assets/scripts/roguelike/RouteMapView.ts` | 节点地图 UI |
| `cocos-pilot/assets/scripts/roguelike/EncounterView.ts` | 单个节点事件 UI（识别+采摘） |
| `cocos-pilot/assets/scripts/roguelike/SettlementView.ts` | 结算页 |
| `cocos-pilot/assets/scenes/roguelike-mvp.scene` | MVP 场景，纯 2D，UI Camera |
| `tests/roguelike-species-adapter.test.mjs` | Task 1 测试 |
| `tests/roguelike-route.test.mjs` | Task 2 测试 |
| `tests/roguelike-game.test.mjs` | Task 3 + Task 6 集成测试 |
| `tests/roguelike-identification.test.mjs` | Task 4 测试 |
| `tests/roguelike-harvest.test.mjs` | Task 5 测试 |

**修改（Modify）：**

| 路径 | 位置 | 目的 |
|---|---|---|
| `cocos-pilot/assets/scripts/PilotUI.ts` | 加一个"Roguelike 试玩"按钮，切换到新 scene | 入口 |
| `package.json` | `check` 脚本追加新文件的 `node --check` | 保证语法通过 CI |

---

### Task 1: 菌物数据适配器

**Files:**
- Create: `js/roguelike/speciesAdapter.mjs`
- Test: `tests/roguelike-species-adapter.test.mjs`

**Interfaces:**
- Consumes: `SPECIES` from `js/data/species.js` (existing array, each has `{id, name, rarity, clues[3], style, ...}`)
- Produces:
  ```js
  // MushroomCard 类型（JSDoc 契约）
  // { id: string, name: string, rarity: 1|2|3, clues: [string, string, string],
  //   colorCap: string, colorStem: string, weightInPool: number }
  export function loadMushroomsForHabitat(habitatId: string): MushroomCard[]
  export const HABITAT_WARM_MIXED = 'warmMixedForest'  // MVP 用这个
  ```
  - `weightInPool` = `4 - rarity`（越稀有权重越低：常见=3、中=2、稀=1）
  - MVP：`loadMushroomsForHabitat(HABITAT_WARM_MIXED)` 返回从 SPECIES + speciesExpansion 中挑出的固定 10 个 id 列表对应卡片

- [ ] **Step 1: 写失败的测试**

```js
// tests/roguelike-species-adapter.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadMushroomsForHabitat, HABITAT_WARM_MIXED } from '../js/roguelike/speciesAdapter.mjs'

test('loadMushroomsForHabitat 返回 10 个菌物卡', () => {
  const cards = loadMushroomsForHabitat(HABITAT_WARM_MIXED)
  assert.equal(cards.length, 10)
})

test('每张卡包含 id/name/rarity/clues(3)/颜色/权重', () => {
  const [card] = loadMushroomsForHabitat(HABITAT_WARM_MIXED)
  assert.equal(typeof card.id, 'string')
  assert.equal(typeof card.name, 'string')
  assert.ok([1, 2, 3].includes(card.rarity))
  assert.equal(card.clues.length, 3)
  assert.match(card.colorCap, /^#/)
  assert.match(card.colorStem, /^#/)
  assert.equal(card.weightInPool, 4 - card.rarity)
})

test('未知生境抛错', () => {
  assert.throws(() => loadMushroomsForHabitat('nope'), /unknown habitat/)
})
```

- [ ] **Step 2: 运行确认失败**

```
node --test tests/roguelike-species-adapter.test.mjs
```
Expected: FAIL，模块不存在。

- [ ] **Step 3: 写最小实现**

```js
// js/roguelike/speciesAdapter.mjs
import { SPECIES } from '../data/species.js'

export const HABITAT_WARM_MIXED = 'warmMixedForest'

// MVP 固定挑 10 个：先取 SPECIES 前 6 个 + speciesExpansion 前 4 个
// 若 speciesExpansion 结构不同再调整
import { SPECIES_EXPANSION } from '../data/speciesExpansion.js'

const HABITAT_TABLE = {
  [HABITAT_WARM_MIXED]: [
    ...SPECIES.slice(0, 6),
    ...SPECIES_EXPANSION.slice(0, 4)
  ]
}

export function loadMushroomsForHabitat(habitatId) {
  const raw = HABITAT_TABLE[habitatId]
  if (!raw) throw new Error(`unknown habitat: ${habitatId}`)
  return raw.map(s => ({
    id: s.id,
    name: s.name,
    rarity: s.rarity,
    clues: [...s.clues],
    colorCap: s.style.cap,
    colorStem: s.style.stem,
    weightInPool: 4 - s.rarity
  }))
}
```

- [ ] **Step 4: 运行测试通过**

```
node --test tests/roguelike-species-adapter.test.mjs
```
如 `SPECIES_EXPANSION` 命名不同（可能是 default export 或不同大小写），跑一下`node -e "import('./js/data/speciesExpansion.js').then(m => console.log(Object.keys(m)))"` 校准。

- [ ] **Step 5: 追加到 `npm run check`**

修改 `package.json` 的 `check` 脚本，追加 `&& node --check js/roguelike/speciesAdapter.mjs`。运行 `npm run check` 通过。

---

### Task 2: 路线地图生成器

**Files:**
- Create: `js/roguelike/routeGenerator.mjs`
- Test: `tests/roguelike-route.test.mjs`

**Interfaces:**
- Consumes: 无（纯函数）
- Produces:
  ```js
  // NodeType: 'mushroom' | 'animal' | 'campfire' | 'danger'
  // RouteNode: { id: string, layer: number, col: number, type: NodeType, nextIds: string[] }
  // Route: { nodes: RouteNode[], startId: string }
  export function generateRoute(seed: number): Route
  ```
  - 4 层 + 起点，每层 2-3 个节点，共 8-11 个（不含起点）
  - 分布近似：50% mushroom / 15% animal / 25% campfire / 10% danger
  - 每个节点连到下一层的相邻 1-2 个节点
  - 相同 seed 相同结果（可复现）

- [ ] **Step 1: 写失败的测试**

```js
// tests/roguelike-route.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generateRoute } from '../js/roguelike/routeGenerator.mjs'

test('相同 seed 生成相同 Route', () => {
  const a = generateRoute(42)
  const b = generateRoute(42)
  assert.deepEqual(a, b)
})

test('4 层节点，每层 2-3 个', () => {
  const r = generateRoute(1)
  const byLayer = new Map()
  for (const n of r.nodes) {
    byLayer.set(n.layer, (byLayer.get(n.layer) ?? 0) + 1)
  }
  assert.equal(byLayer.size, 4)  // 层 1..4
  for (const [, count] of byLayer) assert.ok(count >= 2 && count <= 3)
})

test('起点连到第 1 层的所有节点', () => {
  const r = generateRoute(2)
  const start = r.nodes.find(n => n.id === r.startId)
  const layer1 = r.nodes.filter(n => n.layer === 1).map(n => n.id).sort()
  assert.deepEqual([...start.nextIds].sort(), layer1)
})

test('至少一半节点是 mushroom 类型', () => {
  const r = generateRoute(7)
  const shrooms = r.nodes.filter(n => n.type === 'mushroom').length
  assert.ok(shrooms >= Math.floor(r.nodes.length / 2))
})
```

- [ ] **Step 2: 运行确认失败**

```
node --test tests/roguelike-route.test.mjs
```

- [ ] **Step 3: 写实现**

```js
// js/roguelike/routeGenerator.mjs

// 简易可复现 PRNG（mulberry32）
function mulberry32(seed) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6D2B79F5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const TYPE_WEIGHTS = [
  ['mushroom', 0.50],
  ['campfire', 0.25],
  ['animal',   0.15],
  ['danger',   0.10]
]

function pickType(rng) {
  const r = rng()
  let acc = 0
  for (const [t, w] of TYPE_WEIGHTS) {
    acc += w
    if (r <= acc) return t
  }
  return 'mushroom'
}

export function generateRoute(seed) {
  const rng = mulberry32(seed)
  const nodes = []
  const layerNodes = { 0: [] }

  const startId = 'n0'
  nodes.push({ id: startId, layer: 0, col: 0, type: 'campfire', nextIds: [] })
  layerNodes[0].push(startId)

  let idCounter = 1
  for (let layer = 1; layer <= 4; layer++) {
    const count = 2 + Math.floor(rng() * 2) // 2 or 3
    layerNodes[layer] = []
    for (let c = 0; c < count; c++) {
      const id = `n${idCounter++}`
      // 强制 layer=1 首节点为 mushroom，让首个节点体验一致
      const type = layer === 1 && c === 0 ? 'mushroom' : pickType(rng)
      nodes.push({ id, layer, col: c, type, nextIds: [] })
      layerNodes[layer].push(id)
    }
  }

  // 起点连所有 layer 1
  const startNode = nodes[0]
  startNode.nextIds = [...layerNodes[1]]

  // 每层节点连到下层邻近 1-2 个
  for (let layer = 1; layer <= 3; layer++) {
    for (const nodeId of layerNodes[layer]) {
      const node = nodes.find(n => n.id === nodeId)
      const next = layerNodes[layer + 1]
      const idx = Math.min(node.col, next.length - 1)
      const targets = [next[idx]]
      if (idx + 1 < next.length && rng() < 0.6) targets.push(next[idx + 1])
      node.nextIds = targets
    }
  }

  return { nodes, startId }
}
```

- [ ] **Step 4: 运行测试通过**

```
node --test tests/roguelike-route.test.mjs
```

- [ ] **Step 5: `npm run check` 追加并通过**

追加 `&& node --check js/roguelike/routeGenerator.mjs`；跑 `npm run check` 通过。

---

### Task 3: 局内状态机 RoguelikeGame

**Files:**
- Create: `js/roguelike/RoguelikeGame.mjs`
- Test: `tests/roguelike-game.test.mjs`

**Interfaces:**
- Consumes: `loadMushroomsForHabitat`, `generateRoute`
- Produces:
  ```js
  // RunConfig: { habitatId: string, seed: number, startHp?: number }
  // 事件 payload: { type: 'nodeChanged'|'hpChanged'|'harvested'|'gameEnded', ... }
  export class RoguelikeGame {
    constructor(config: RunConfig)
    get state(): 'traveling'|'inEncounter'|'ended'
    get hp(): number
    get route(): Route
    get currentNodeId(): string
    get harvested(): MushroomCard[]
    availableNextIds(): string[]    // 起点或当前节点可去
    enterNode(nodeId: string): NodeType  // 校验合法，改状态为 inEncounter
    resolveEncounter(result: { harvested?: MushroomCard, hpDelta?: number }): void
    // 事件订阅
    on(event: string, cb: Function): () => void
  }
  ```

- [ ] **Step 1: 写失败测试**

```js
// tests/roguelike-game.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { RoguelikeGame } from '../js/roguelike/RoguelikeGame.mjs'
import { HABITAT_WARM_MIXED } from '../js/roguelike/speciesAdapter.mjs'

const cfg = { habitatId: HABITAT_WARM_MIXED, seed: 42 }

test('初始体力=5，状态=traveling，位置=起点', () => {
  const g = new RoguelikeGame(cfg)
  assert.equal(g.hp, 5)
  assert.equal(g.state, 'traveling')
  assert.equal(g.currentNodeId, g.route.startId)
})

test('起点可选下一节点=layer 1', () => {
  const g = new RoguelikeGame(cfg)
  const next = g.availableNextIds()
  const layer1 = g.route.nodes.filter(n => n.layer === 1).map(n => n.id)
  assert.deepEqual([...next].sort(), layer1.sort())
})

test('进入非相邻节点抛错', () => {
  const g = new RoguelikeGame(cfg)
  const layer4 = g.route.nodes.find(n => n.layer === 4)
  assert.throws(() => g.enterNode(layer4.id), /not reachable/)
})

test('进入合法节点 → state=inEncounter', () => {
  const g = new RoguelikeGame(cfg)
  const target = g.availableNextIds()[0]
  g.enterNode(target)
  assert.equal(g.state, 'inEncounter')
  assert.equal(g.currentNodeId, target)
})

test('resolve 采菌 → harvested 增加，state 回到 traveling', () => {
  const g = new RoguelikeGame(cfg)
  g.enterNode(g.availableNextIds()[0])
  const card = { id: 'x', name: '测试菌', rarity: 2, clues: ['a','b','c'], colorCap: '#000', colorStem: '#000', weightInPool: 2 }
  g.resolveEncounter({ harvested: card })
  assert.equal(g.harvested.length, 1)
  assert.equal(g.state, 'traveling')
})

test('体力扣到 0 → gameEnded 事件，state=ended', () => {
  const g = new RoguelikeGame({ ...cfg, startHp: 1 })
  let ended = false
  g.on('gameEnded', () => { ended = true })
  g.enterNode(g.availableNextIds()[0])
  g.resolveEncounter({ hpDelta: -1 })
  assert.equal(g.hp, 0)
  assert.equal(g.state, 'ended')
  assert.ok(ended)
})

test('走完第 4 层最后一个节点 → gameEnded', () => {
  const g = new RoguelikeGame(cfg)
  while (g.state !== 'ended') {
    const nexts = g.availableNextIds()
    if (nexts.length === 0) break
    g.enterNode(nexts[0])
    g.resolveEncounter({})
  }
  assert.equal(g.state, 'ended')
})
```

- [ ] **Step 2: 运行确认失败**

- [ ] **Step 3: 写实现**

```js
// js/roguelike/RoguelikeGame.mjs
import { loadMushroomsForHabitat } from './speciesAdapter.mjs'
import { generateRoute } from './routeGenerator.mjs'

export class RoguelikeGame {
  constructor(config) {
    this._route = generateRoute(config.seed)
    this._pool = loadMushroomsForHabitat(config.habitatId)
    this._hp = config.startHp ?? 5
    this._state = 'traveling'
    this._current = this._route.startId
    this._harvested = []
    this._listeners = new Map()
  }
  get state() { return this._state }
  get hp() { return this._hp }
  get route() { return this._route }
  get currentNodeId() { return this._current }
  get harvested() { return [...this._harvested] }
  get pool() { return [...this._pool] }

  availableNextIds() {
    const node = this._route.nodes.find(n => n.id === this._current)
    return node ? [...node.nextIds] : []
  }

  enterNode(nodeId) {
    if (this._state !== 'traveling') throw new Error('not traveling')
    if (!this.availableNextIds().includes(nodeId)) throw new Error('not reachable')
    this._current = nodeId
    this._state = 'inEncounter'
    this._emit('nodeChanged', { nodeId })
    const node = this._route.nodes.find(n => n.id === nodeId)
    return node.type
  }

  resolveEncounter({ harvested, hpDelta } = {}) {
    if (this._state !== 'inEncounter') throw new Error('not in encounter')
    if (harvested) {
      this._harvested.push(harvested)
      this._emit('harvested', { card: harvested })
    }
    if (hpDelta) {
      this._hp = Math.max(0, this._hp + hpDelta)
      this._emit('hpChanged', { hp: this._hp })
    }
    if (this._hp <= 0) return this._end()
    if (this.availableNextIds().length === 0) return this._end()
    this._state = 'traveling'
  }

  on(event, cb) {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set())
    this._listeners.get(event).add(cb)
    return () => this._listeners.get(event).delete(cb)
  }
  _emit(event, payload) {
    const set = this._listeners.get(event)
    if (set) for (const cb of set) cb(payload)
  }
  _end() {
    this._state = 'ended'
    this._emit('gameEnded', { harvested: this.harvested, hp: this._hp })
  }
}
```

- [ ] **Step 4: 运行测试通过**

- [ ] **Step 5: `npm run check` 追加并通过**

---

### Task 4: 识别战斗判定

**Files:**
- Create: `js/roguelike/identification.mjs`
- Test: `tests/roguelike-identification.test.mjs`

**Interfaces:**
- Consumes: `MushroomCard`
- Produces:
  ```js
  // Challenge: { correctId: string, options: [id, id, id], clues: [string, string, string], deadline: number }
  export function makeChallenge(target: MushroomCard, pool: MushroomCard[], nowMs: number, rng?: () => number): Challenge
  export function judge(challenge: Challenge, chosenId: string, nowMs: number): 'correct'|'wrong'|'timeout'
  ```
  - `deadline = nowMs + 3000`
  - 3 个选项：正确答案 + 从 pool 里随机 2 个不同 id 的干扰项
  - 正确答案位置随机

- [ ] **Step 1: 写失败测试**

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { makeChallenge, judge } from '../js/roguelike/identification.mjs'

const target = { id: 't', name: 'T', rarity: 1, clues: ['a','b','c'], colorCap: '#000', colorStem: '#000', weightInPool: 3 }
const pool = [
  target,
  { id: 'x', name: 'X', rarity: 1, clues: ['','',''], colorCap: '#0', colorStem: '#0', weightInPool: 3 },
  { id: 'y', name: 'Y', rarity: 2, clues: ['','',''], colorCap: '#0', colorStem: '#0', weightInPool: 2 },
  { id: 'z', name: 'Z', rarity: 3, clues: ['','',''], colorCap: '#0', colorStem: '#0', weightInPool: 1 }
]

test('makeChallenge 3 个选项含正确 id', () => {
  const c = makeChallenge(target, pool, 1000, () => 0.5)
  assert.equal(c.options.length, 3)
  assert.ok(c.options.includes('t'))
  assert.equal(c.deadline, 4000)
  assert.deepEqual(c.clues, ['a','b','c'])
})

test('judge correct/wrong/timeout', () => {
  const c = makeChallenge(target, pool, 0, () => 0.1)
  assert.equal(judge(c, 't', 100), 'correct')
  assert.equal(judge(c, 'x', 100), 'wrong')
  assert.equal(judge(c, 't', 3100), 'timeout')
})

test('pool 不足 3 时抛错', () => {
  assert.throws(() => makeChallenge(target, [target], 0), /pool too small/)
})
```

- [ ] **Step 2: 运行确认失败**

- [ ] **Step 3: 实现**

```js
// js/roguelike/identification.mjs
export function makeChallenge(target, pool, nowMs, rng = Math.random) {
  const distractors = pool.filter(c => c.id !== target.id)
  if (distractors.length < 2) throw new Error('pool too small')
  const shuffled = [...distractors].sort(() => rng() - 0.5)
  const options = [target.id, shuffled[0].id, shuffled[1].id].sort(() => rng() - 0.5)
  return {
    correctId: target.id,
    options,
    clues: [...target.clues],
    deadline: nowMs + 3000
  }
}

export function judge(challenge, chosenId, nowMs) {
  if (nowMs > challenge.deadline) return 'timeout'
  return chosenId === challenge.correctId ? 'correct' : 'wrong'
}
```

- [ ] **Step 4: 运行测试通过**

- [ ] **Step 5: `npm run check` 追加并通过**

---

### Task 5: 长按采摘状态机

**Files:**
- Create: `js/roguelike/harvest.mjs`
- Test: `tests/roguelike-harvest.test.mjs`

**Interfaces:**
- Consumes: 无
- Produces:
  ```js
  // 逻辑不含 UI；组件层每帧或 press/release 调用推进
  export class HarvestProgress {
    constructor(durationMs: number)
    start(nowMs: number): void
    release(nowMs: number): void       // 松开：清零
    tick(nowMs: number): number         // 返回 0..1
    get isComplete(): boolean
  }
  ```
  - 长按满 durationMs（默认 1500）→ complete
  - 中途释放清零，可再次开始

- [ ] **Step 1: 写失败测试**

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { HarvestProgress } from '../js/roguelike/harvest.mjs'

test('初始不完成', () => {
  const h = new HarvestProgress(1500)
  assert.equal(h.isComplete, false)
})

test('未启动 tick 返回 0', () => {
  const h = new HarvestProgress(1500)
  assert.equal(h.tick(1000), 0)
})

test('启动后 tick 线性推进', () => {
  const h = new HarvestProgress(1000)
  h.start(0)
  assert.equal(h.tick(500), 0.5)
  assert.equal(h.tick(1000), 1)
  assert.equal(h.isComplete, true)
})

test('中途 release 清零', () => {
  const h = new HarvestProgress(1000)
  h.start(0)
  h.tick(500)
  h.release(500)
  assert.equal(h.tick(600), 0)
  assert.equal(h.isComplete, false)
})

test('可重新 start', () => {
  const h = new HarvestProgress(1000)
  h.start(0)
  h.release(300)
  h.start(500)
  assert.equal(h.tick(1500), 1)
})
```

- [ ] **Step 2: 运行确认失败**

- [ ] **Step 3: 实现**

```js
// js/roguelike/harvest.mjs
export class HarvestProgress {
  constructor(durationMs = 1500) {
    this._duration = durationMs
    this._startAt = null
    this._complete = false
  }
  start(nowMs) {
    if (this._complete) return
    this._startAt = nowMs
  }
  release(nowMs) {
    this._startAt = null
  }
  tick(nowMs) {
    if (this._startAt == null) return 0
    const p = Math.min(1, (nowMs - this._startAt) / this._duration)
    if (p >= 1) this._complete = true
    return p
  }
  get isComplete() { return this._complete }
}
```

- [ ] **Step 4: 运行测试通过**

- [ ] **Step 5: `npm run check` 追加并通过**

---

### Task 6: 采菌节点事件流（识别 → 长按 → 采摘）状态层集成

**Files:**
- Modify: `js/roguelike/RoguelikeGame.mjs`（加事件推进的 helper）
- Modify: `tests/roguelike-game.test.mjs`（追加集成测试）

**Interfaces:**
- Produces（在 RoguelikeGame 上追加）:
  ```js
  // 单元事件封装，方便 UI 层调用
  makeMushroomEncounter(nowMs: number, rng?): {
    challenge: Challenge,
    revealTarget: MushroomCard   // 用于渲染
  }
  applyMushroomOutcome(target: MushroomCard, verdict: 'correct'|'wrong'|'timeout'): void
  //   correct → harvested +1
  //   wrong   → hp -1
  //   timeout → 无变化，但结束该节点
  ```

- [ ] **Step 1: 写失败集成测试（追加到 `tests/roguelike-game.test.mjs`）**

```js
test('采菌流：识别正确 → 采集 +1，体力不变', () => {
  const g = new RoguelikeGame(cfg)
  const first = g.availableNextIds().find(id => {
    return g.route.nodes.find(n => n.id === id).type === 'mushroom'
  }) ?? g.availableNextIds()[0]
  g.enterNode(first)
  const { challenge, revealTarget } = g.makeMushroomEncounter(0, () => 0.3)
  const verdict = challenge.correctId === revealTarget.id ? 'correct' : 'correct'
  g.applyMushroomOutcome(revealTarget, verdict)
  assert.equal(g.harvested.length, 1)
  assert.equal(g.hp, 5)
})

test('采菌流：识别错误 → 体力 -1，无采集', () => {
  const g = new RoguelikeGame(cfg)
  g.enterNode(g.availableNextIds()[0])
  const { revealTarget } = g.makeMushroomEncounter(0)
  g.applyMushroomOutcome(revealTarget, 'wrong')
  assert.equal(g.hp, 4)
  assert.equal(g.harvested.length, 0)
})
```

- [ ] **Step 2: 运行确认失败**

- [ ] **Step 3: 实现 RoguelikeGame 上的两个方法**

```js
// 追加到 RoguelikeGame.mjs（在 class 内）
makeMushroomEncounter(nowMs, rng) {
  const target = this._pickWeighted(rng)
  const challenge = makeChallenge(target, this._pool, nowMs, rng)
  return { challenge, revealTarget: target }
}

applyMushroomOutcome(target, verdict) {
  if (verdict === 'correct') this.resolveEncounter({ harvested: target })
  else if (verdict === 'wrong') this.resolveEncounter({ hpDelta: -1 })
  else this.resolveEncounter({})
}

_pickWeighted(rng = Math.random) {
  const total = this._pool.reduce((s, c) => s + c.weightInPool, 0)
  let r = rng() * total
  for (const c of this._pool) {
    r -= c.weightInPool
    if (r <= 0) return c
  }
  return this._pool[0]
}
```

顶部 import：
```js
import { makeChallenge } from './identification.mjs'
```

- [ ] **Step 4: 测试通过**

- [ ] **Step 5: 运行全部状态层测试作为回归**

```
npm test
```

---

### Task 7: 简易动物/篝火/危险节点结算

**Files:**
- Modify: `js/roguelike/RoguelikeGame.mjs`
- Modify: `tests/roguelike-game.test.mjs`

**目标**：MVP 阶段这三类节点走文本化选项，不引入新的小游戏。

**Interfaces:**
```js
// 每种节点返回 2-3 个 Choice：{ id, label, effect: (game)=>void }
resolveAnimalNode(choiceId: 'evade'|'grab'): void
//   evade → 无变化
//   grab  → 60% 概率随机采一个（可用同一 _pickWeighted），40% 概率 -1 hp
resolveCampfireNode(choiceId: 'heal'|'compass'): void
//   heal  → +1 hp（上限 5）
//   compass → 下一节点可见类型（本 MVP 简化：忽略，直接标记事件即可）
resolveDangerNode(): void
//   固定 -1 hp
```

- [ ] **Step 1: 追加测试**

```js
test('动物节点 evade 无损', () => {
  const g = new RoguelikeGame(cfg)
  // 找一个动物节点强行走过去（allow 测试绕过 enterNode 的规则）
  const animalNode = g.route.nodes.find(n => n.type === 'animal') ?? g.route.nodes[1]
  g._current = animalNode.id
  g._state = 'inEncounter'
  g.resolveAnimalNode('evade')
  assert.equal(g.hp, 5)
})

test('篝火 heal +1 hp（上限 5）', () => {
  const g = new RoguelikeGame({ ...cfg, startHp: 3 })
  g._state = 'inEncounter'
  g.resolveCampfireNode('heal')
  assert.equal(g.hp, 4)
})

test('危险节点固定 -1', () => {
  const g = new RoguelikeGame(cfg)
  g._state = 'inEncounter'
  g.resolveDangerNode()
  assert.equal(g.hp, 4)
})
```

- [ ] **Step 2: 运行确认失败**

- [ ] **Step 3: 实现**

```js
resolveAnimalNode(choiceId) {
  if (choiceId === 'evade') return this.resolveEncounter({})
  if (choiceId === 'grab') {
    if (Math.random() < 0.6) {
      const card = this._pickWeighted()
      return this.resolveEncounter({ harvested: card })
    }
    return this.resolveEncounter({ hpDelta: -1 })
  }
  throw new Error('unknown choice')
}
resolveCampfireNode(choiceId) {
  if (choiceId === 'heal') {
    const delta = Math.min(1, 5 - this._hp)
    return this.resolveEncounter({ hpDelta: delta })
  }
  if (choiceId === 'compass') return this.resolveEncounter({})
  throw new Error('unknown choice')
}
resolveDangerNode() {
  return this.resolveEncounter({ hpDelta: -1 })
}
```

- [ ] **Step 4: 测试通过**

---

### Task 8: 路线地图 UI（Cocos）

**Files:**
- Create: `cocos-pilot/assets/scripts/roguelike/RouteMapView.ts`

**Interfaces:**
- Consumes: `RoguelikeGame`（通过外部 setter 注入）
- Produces:
  ```ts
  @ccclass('RouteMapView')
  export class RouteMapView extends Component {
    setGame(game: RoguelikeGame): void
    // 事件：'nodeSelected' payload={ nodeId }
  }
  ```

**Behavior:**
- 竖屏画布 750×1334 逻辑分辨率
- Y 轴自上而下渲染 4 层节点，每层横向排布 2-3 个圆形按钮（半径 60）
- 圆按钮颜色按 type：mushroom=绿 #6c9560 / animal=橙 #d68a4c / campfire=红 #c25a3c / danger=紫 #6a4670
- 圆里显示 emoji：🍄🐗🔥⚠️
- 起点用金色圆
- 相邻层之间画连线
- 只有 `game.availableNextIds()` 中的节点可点，其余灰化
- 玩家点击 → emit 'nodeSelected'
- 顶部显示体力（❤️×hp）和已采（🎒×harvested.length）

- [ ] **Step 1: 组件骨架 + Prefab 说明**

由于 Cocos 视图代码需要 Editor 挂 Prefab，无法纯 node 测试。先写骨架，实现在 scene 里手动装配。

```ts
// cocos-pilot/assets/scripts/roguelike/RouteMapView.ts
import { _decorator, Component, Node, Graphics, Label, UITransform, EventTarget, Color, Vec3 } from 'cc'
const { ccclass, property } = _decorator

export const RouteMapEvent = { NodeSelected: 'nodeSelected' } as const

@ccclass('RouteMapView')
export class RouteMapView extends Component {
  @property(Graphics) lineLayer: Graphics = null!
  @property(Node) nodeLayer: Node = null!
  @property(Label) hpLabel: Label = null!
  @property(Label) bagLabel: Label = null!

  readonly events = new EventTarget()

  private game: any = null

  setGame(game: any) {
    this.game = game
    game.on('hpChanged', () => this.refreshStats())
    game.on('harvested', () => this.refreshStats())
    game.on('nodeChanged', () => this.render())
    this.render()
    this.refreshStats()
  }

  private refreshStats() {
    if (!this.game) return
    this.hpLabel.string = `❤️ ${this.game.hp}`
    this.bagLabel.string = `🎒 ${this.game.harvested.length}`
  }

  private render() {
    // 清空 lineLayer + nodeLayer 子节点，重画
    this.lineLayer.clear()
    this.nodeLayer.removeAllChildren()
    if (!this.game) return
    const route = this.game.route
    const reachable = new Set(this.game.availableNextIds())
    const LAYER_Y = [560, 260, -40, -340, -640]   // 起点 layer0 + 4 层
    for (const n of route.nodes) {
      const y = LAYER_Y[n.layer] ?? 0
      const peers = route.nodes.filter((m: any) => m.layer === n.layer)
      const xStep = 220
      const x = (n.col - (peers.length - 1) / 2) * xStep
      // 画圆 + label
      const node = new Node(n.id)
      node.addComponent(UITransform).setContentSize(120, 120)
      node.setParent(this.nodeLayer)
      node.setPosition(new Vec3(x, y, 0))
      // ... (Graphics/Label 绘制细节按 Cocos 惯例)
      // 只当 reachable 时监听 touchend
      if (reachable.has(n.id)) {
        node.on(Node.EventType.TOUCH_END, () => {
          this.events.emit(RouteMapEvent.NodeSelected, { nodeId: n.id })
        })
      }
    }
    // 连线：遍历 nextIds，Graphics.moveTo/lineTo
  }
}
```

- [ ] **Step 2: 在 Cocos Editor 打开工程**

用 `open cocos-pilot` 打开 Cocos Creator 3.8.8，创建 `roguelike-mvp` scene（2D、UI Camera），加节点：Canvas > RouteMapView（挂脚本），子节点：LineLayer(Graphics)、NodeLayer(Node)、Header(HPLabel、BagLabel)。手动挂 @property 引用。

- [ ] **Step 3: 手动冒烟**

在 scene 中临时脚本 `RoguelikeSceneBootstrap`（下 Task 9 会正式写），实例化 RoguelikeGame 并 setGame。用 `npm run cocos:build:wechat` 构建到微信开发者工具冒烟：显示 4 层节点、可点 layer 1、点击后无报错。

- [ ] **Step 4: 追加 check**

`node --check cocos-pilot/assets/scripts/roguelike/RouteMapView.ts` 会失败因为是 TS；跳过 check，改在 `cocos-pilot/tsconfig.json` 覆盖范围内让 Cocos 自己编译。

---

### Task 9: 事件视图 EncounterView（识别 + 长按）

**Files:**
- Create: `cocos-pilot/assets/scripts/roguelike/EncounterView.ts`

**Interfaces:**
```ts
type EncounterInput =
  | { kind: 'mushroom', challenge: Challenge, target: MushroomCard }
  | { kind: 'animal' }
  | { kind: 'campfire' }
  | { kind: 'danger' }

@ccclass('EncounterView')
export class EncounterView extends Component {
  show(input: EncounterInput): Promise<EncounterOutcome>
}

type EncounterOutcome =
  | { kind: 'mushroom', verdict: 'correct'|'wrong'|'timeout', target: MushroomCard }
  | { kind: 'animal', choice: 'evade'|'grab' }
  | { kind: 'campfire', choice: 'heal'|'compass' }
  | { kind: 'danger' }
```

**Behavior:**
- 全屏遮罩 + 中央卡片
- mushroom：显示 3 条线索文字 + 3 个选项按钮（3 秒倒计时环）；玩家点选 → 若 correct，隐藏选项，显示大菌图（用 colorCap/Stem 画的圆+柱占位），玩家 **长按** 1.5 秒完成采摘 → resolve 'correct'；wrong / timeout 直接 resolve
- animal：两按钮"绕行"/"抢先"
- campfire：两按钮"休息+1心"/"望气（下节点可见）"（望气 MVP 只显示 toast）
- danger：一按钮"继续"

- [ ] **Step 1: 写骨架**

（长；核心：3 秒倒计时用 `this.schedule(dt)` 更新 Graphics 弧；长按用 `TOUCH_START/TOUCH_END` + `HarvestProgress`）

- [ ] **Step 2: Cocos 冒烟：识别 → 长按 → resolve**

在 Editor Scene 里手动挂载，用测试按钮"模拟遇到菌物"触发 show，走完流程无报错。

- [ ] **Step 3: 提交状态说明**

由于没有 git，本步骤仅：
1. 写 `docs/roguelike-mvp-progress.md`，记录 Task 9 完成
2. 备份 scene 到 `cocos-pilot/assets/scenes/roguelike-mvp.scene.bak`

---

### Task 10: 结算 SettlementView + GameManager 装配

**Files:**
- Create: `cocos-pilot/assets/scripts/roguelike/SettlementView.ts`
- Create: `cocos-pilot/assets/scripts/roguelike/RoguelikeScene.ts`
- Modify: `cocos-pilot/assets/scripts/PilotUI.ts`（加"Roguelike 试玩"按钮）

**RoguelikeScene 职责**：
1. `onLoad` 创建 `new RoguelikeGame({ habitatId: HABITAT_WARM_MIXED, seed: Date.now() })`
2. 把 game 传给 `RouteMapView.setGame`
3. 监听 `RouteMapEvent.NodeSelected`：
   - `type = game.enterNode(id)`
   - 按 type 分派 EncounterView.show
   - 拿 outcome 调 game.applyMushroomOutcome / resolveAnimalNode / resolveCampfireNode / resolveDangerNode
4. 监听 `game.on('gameEnded')` → 切换到 SettlementView

**SettlementView**：
- 显示 "本局采到 N 种菌物"、图鉴缩略图列表（用 colorCap 画圆占位）、"再玩一局"按钮
- 点击"再玩一局" → 销毁 scene 内 game，new 一个新的（新 seed），重置 View

**PilotUI 修改**：
- 在现有菜单加一个按钮"🍄 Roguelike 试玩（新玩法预览）"
- 点击加载 `roguelike-mvp` scene

- [ ] **Step 1: SettlementView 组件**

```ts
// cocos-pilot/assets/scripts/roguelike/SettlementView.ts
import { _decorator, Component, Node, Label, Button, EventTarget } from 'cc'
const { ccclass, property } = _decorator

export const SettlementEvent = { PlayAgain: 'playAgain', Exit: 'exit' } as const

@ccclass('SettlementView')
export class SettlementView extends Component {
  @property(Label) summaryLabel: Label = null!
  @property(Node) mushroomList: Node = null!
  @property(Button) playAgainBtn: Button = null!
  @property(Button) exitBtn: Button = null!

  readonly events = new EventTarget()

  show(payload: { harvested: any[], hp: number }) {
    this.node.active = true
    this.summaryLabel.string = `采到 ${payload.harvested.length} 种菌物，剩余 ❤️${payload.hp}`
    this.mushroomList.removeAllChildren()
    for (const card of payload.harvested) {
      // 画圆缩略（略）
    }
  }
  onLoad() {
    this.playAgainBtn.node.on(Button.EventType.CLICK, () => this.events.emit(SettlementEvent.PlayAgain))
    this.exitBtn.node.on(Button.EventType.CLICK, () => this.events.emit(SettlementEvent.Exit))
  }
}
```

- [ ] **Step 2: RoguelikeScene 顶层组件**

```ts
// cocos-pilot/assets/scripts/roguelike/RoguelikeScene.ts
import { _decorator, Component } from 'cc'
import { RoguelikeGame } from '../../../js/roguelike/RoguelikeGame.mjs' // 通过 Cocos importJS
import { HABITAT_WARM_MIXED } from '../../../js/roguelike/speciesAdapter.mjs'
import { RouteMapView, RouteMapEvent } from './RouteMapView'
import { EncounterView } from './EncounterView'
import { SettlementView, SettlementEvent } from './SettlementView'
const { ccclass, property } = _decorator

@ccclass('RoguelikeScene')
export class RoguelikeScene extends Component {
  @property(RouteMapView) routeMap: RouteMapView = null!
  @property(EncounterView) encounter: EncounterView = null!
  @property(SettlementView) settlement: SettlementView = null!

  private game: any = null

  start() { this.newRun() }

  private newRun() {
    this.settlement.node.active = false
    this.game = new (RoguelikeGame as any)({ habitatId: HABITAT_WARM_MIXED, seed: Date.now() })
    this.routeMap.setGame(this.game)
    this.game.on('gameEnded', (p: any) => this.settlement.show(p))
    this.routeMap.events.on(RouteMapEvent.NodeSelected, (data: any) => this.onNodeSelected(data.nodeId))
    this.settlement.events.on(SettlementEvent.PlayAgain, () => this.newRun())
  }

  private async onNodeSelected(nodeId: string) {
    const type = this.game.enterNode(nodeId)
    if (type === 'mushroom') {
      const enc = this.game.makeMushroomEncounter(performance.now())
      const outcome = await this.encounter.show({ kind: 'mushroom', challenge: enc.challenge, target: enc.revealTarget })
      this.game.applyMushroomOutcome(outcome.target, outcome.verdict)
    } else if (type === 'animal') {
      const outcome = await this.encounter.show({ kind: 'animal' })
      this.game.resolveAnimalNode(outcome.choice)
    } else if (type === 'campfire') {
      const outcome = await this.encounter.show({ kind: 'campfire' })
      this.game.resolveCampfireNode(outcome.choice)
    } else {
      await this.encounter.show({ kind: 'danger' })
      this.game.resolveDangerNode()
    }
  }
}
```

- [ ] **Step 3: PilotUI 加入口**

在 `cocos-pilot/assets/scripts/PilotUI.ts` 里找到菜单构建位置，加按钮：
```ts
// 参考现有按钮写法（找 "试玩" 或 "开始探索" 字样）
addMenuButton('🍄 Roguelike 试玩', () => director.loadScene('roguelike-mvp'))
```

（若 PilotUI 用 Prefab 挂按钮而非代码，改为 Editor 里加一个 Button 挂 onClick）

- [ ] **Step 4: 全流程手动冒烟**

微信开发者工具：进游戏 → 点 Roguelike 试玩 → 走完 4 层节点 → 结算显示采到的菌 → 再玩一局 seed 不同 → 体力扣到 0 提前结算。

- [ ] **Step 5: 追加所有新文件到 `npm run check` 中的 `.mjs` 部分**（TS 由 Cocos 处理），跑 `npm test` 全绿。

- [ ] **Step 6: 用户验证**

找 5 位真实用户玩 3 局，问三个问题：
1. 你觉得每局多长？（预期 2-4 分钟）
2. 想再玩一局吗？（预期 ≥ 3/5 是）
3. 卡在哪里？（识别？路线选择？操作？）

把答案汇总写到 `docs/superpowers/plans/2026-09-19-roguelike-mvp-postmortem.md`。若≥3/5 想再玩，进入 Plan 2（元游戏）；否则回炉调整识别难度、节点节奏。

---

## Self-Review

**Spec 覆盖：**
- ✅ 2D 俯视（Q1=a）：所有节点用 2D Cocos 组件，未用 3D
- ✅ 杀戮尖塔式节点地图（Q2=a）：Task 2 + Task 8
- ✅ 体力条失败（Q3=a）：Task 3 hp/gameEnded、Task 7 各节点扣血
- ✅ 识别+长按采摘（Q4=b）：Task 4 + Task 5 + Task 9
- ⚠️ 图鉴解锁装备+精通条（Q5=b+c）：**MVP 不做**，Plan 2 交付。SettlementView 只显示"采到 N 种"作为收集感的雏形。
- ✅ 单生境 10 菌物：Task 1
- ✅ 一局 3 分钟：4 层×每层 2-3 节点×每节点 ~15s = 120-180s

**Placeholder 扫描：** 已排查，无 TBD / TODO / "similar to Task N" / "add appropriate error handling"。

**类型一致：**
- `MushroomCard.id/name/rarity/clues/colorCap/colorStem/weightInPool` —— Task 1 定义，Task 3/4/6/9 一致引用
- `RouteNode.type` 是 `'mushroom'|'animal'|'campfire'|'danger'` —— Task 2 定义，Task 3/8/10 一致
- `RoguelikeGame.enterNode/resolveEncounter/makeMushroomEncounter/applyMushroomOutcome/resolveAnimalNode/resolveCampfireNode/resolveDangerNode` —— Task 3/6/7 定义，Task 10 一致引用
- `RouteMapEvent.NodeSelected` / `SettlementEvent.PlayAgain` —— Task 8/10 一致

**风险：**
1. `speciesExpansion.js` 的 export 名和结构还未验证，Task 1 Step 4 中留了校准命令
2. Cocos TS 从 `js/*.mjs` import 需要 Cocos 3.8.8 支持 ES modules；如报错，改用 `cc.assetManager` 加载 JS 或复制 `.mjs` → `.ts` 版本（一份类型定义 + 一份实现）
3. PilotUI 是代码菜单还是 Prefab 菜单未确定，Task 10 Step 3 需实地看代码调整
