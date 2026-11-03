# 雨后菌语 · 技术架构（架构师）

版本 v0.1 · 阶段 M0 · 依据：00-project-plan.md、01-gdd.md
本文定义新玩法的模块边界、运行时机制、数据与存档格式、性能预算和旧代码处理方式。技术栈在评审通过后锁定，变更需先改本文。

## 0. 概述

沿用仓库已验证的分层：引擎无关的纯逻辑写在根目录 `js/survivor/`，由 `npm run cocos:sync` 复制到 `cocos-pilot/assets/scripts/shared/js/survivor/`；Cocos 表现层 `cocos-pilot/assets/scripts/Survivor*.ts` 只负责输入采集、渲染同步、音效和界面。逻辑层是一个可确定性复现的固定步长模拟（60 步/秒），用对象池管理所有战斗实体，用每步重建的均匀空间网格做圆形碰撞，数值全部来自 JSON 形态的数据模块。这样核心战斗、刷怪、升级、局外成长和存档迁移都能用 `node --test` 覆盖，并能被自动对局机器人跑数值。MVP 纯前端，不引入服务端；排行榜和云存档留到 MVP 之后，用微信云开发实现，本文给出接口草案。

锁定技术栈：

| 层 | 选型 | 说明 |
|---|---|---|
| 引擎 | Cocos Creator 3.8.8，2D 模块（现有 engine.json 已关闭 3d/primitive/light-probe） | 不升级引擎，不引入物理模块 |
| 逻辑层 | 原生 ES Module JavaScript（无依赖），Node 22 运行测试 | 与 js/library、js/microforest 一致 |
| 表现层 | TypeScript（Creator 编译），`cc` 的 Node/Sprite/Label/Graphics/tween/AudioSource | 不用 Cocos 物理、Animation 组件、Prefab 编辑器资源 |
| 测试 | `node:test` + `node:assert/strict` | 不引入 Jest/Vitest |
| 存储 | `sys.localStorage`（微信端由适配层落到 wx 本地存储） | 与 PackView/LibraryView 注入方式一致 |
| 后端（MVP 后） | 微信云开发：云函数（Node）+ 云数据库 | MVP 不接 |

## 1. 与上游文档的对齐与需确认项

调研发现以下几处需要策划/UI 知悉，本文已给出处理方式：

1. 设计分辨率（已确认 720×1280 FIXED_WIDTH，裁决 D10，01 §18.1、02 §0 已同步）。宿主 PinePilot 当前设 375×812 FIXED_WIDTH，01-gdd 以 720×1280 为逻辑单位。决定：SurvivorView 构造时把设计分辨率改为 720×1280 FIXED_WIDTH（MicroForestView 已有自行修改设计分辨率的先例），销毁时恢复 375×812。这样 1 个世界单位 = 1 个设计像素 = GDD 单位，HUD 也用同一坐标系。可见高度随机型变化（19.5:9 机型约 1560）。
2. 刷怪半径（已同步到 01 §10/§9，裁决 D11）。GDD 原写死“半屏对角线 + 60 ≈ 794”，在 1560 高的屏幕上会在屏幕内刷出敌人。决定：逻辑层在开局时接收实际视口，`spawnRadius = hypot(viewW/2, viewH/2) + 60`；“超过 900 重新逼近”改为 `relocateDistance = max(900, spawnRadius + 120)`。720×1280 下与 GDD 完全一致，01 已同步这条公式。
3. “JSON 数值表”的落地形式。见第 4 节：数据以“只含 JSON 字面量的 .js 模块”存放，而不是 .json 文件，由测试保证其可 JSON 往返。
4. 存档实现不复用 js/core/StorageService.js。原因：sync-shared.mjs 只允许 js/microforest、js/library（将加 js/survivor）进入构建，且 StorageService 依赖旧 constants.js。新模块 SurvivorSave.js 借鉴其“校验 + 备份”思路重写，约 100 行。注入接口只用 `{getItem, setItem}`（裁决 D13，与 LibraryProgress 及 audit 注入的实际先例一致，不依赖 removeItem；损坏档用覆盖写而非删除主键）。随机数同理：沿用 js/library/LibraryRandom.js 的先例，复制一份 SeededRandom 到 js/survivor/SurvivorRandom.js。
5. 现有测试基线：`tests/forest-cleanup.test.mjs` 当前已失败（resources 目录多了 microforest-motion），属于旧玩法遗留，本项目不修，只在测试报告中记为基线。

## 2. 分层与目录

```
js/survivor/                         纯逻辑，禁止 import 'cc'、wx、Date.now、Math.random
  SurvivorRun.js        单局入口：状态机、固定步长、系统调度、事件队列、结算摘要
  SimClock.js           固定步长累加器
  SurvivorRandom.js     SeededRandom（复制自 js/core/Random.js）+ range/chance 辅助
  Pool.js               定长对象池（稳定槽位 + 稠密活跃表）
  SpatialGrid.js        跟随玩家的均匀网格，每步重建
  Stats.js              角色属性合成（局外 × 局内倍率公式）
  Spawner.js            波次段、事件刷怪、生成位置、上限、远离重定位
  Enemies.js            敌人行为：追踪、摆动、远程、冲撞、Boss 技能、分离
  Weapons.js            5 种武器的释放与命中逻辑（每种一个小对象，统一接口）
  Projectiles.js        玩家弹体、敌方浊雾泡、雨滴落点区域
  Pickups.js            孢子（合并规则）、露珠、林风、吸附
  Progression.js        经验曲线、升级队列、三选一抽卡、进化
  Meta.js               露晶结算公式、永久强化购买/重置、局外加成换算
  SurvivorSave.js       存档读写、校验、备份、版本迁移
  Joystick.js           浮动摇杆数学（死区/半径→单位向量），供表现层调用
  SafeArea.js           安全区数学纯函数（windowInfo + capsule → 四边距），供表现层调用（裁决 D18）
  SurvivorBot.js        仅测试/调参用自动对局，不进构建
  data/
    player.js weapons.js passives.js enemies.js waves.js pickups.js
    permanent.js limits.js strings.js
    validate.js         数据结构与取值校验
cocos-pilot/assets/scripts/
  SurvivorView.ts       宿主接入、屏幕切换（营地/战斗/结算）、加载分包、模态框
  SurvivorBattleArt.ts  战斗层节点池、每帧按逻辑状态同步 Sprite、FX
  SurvivorHud.ts        血条、经验条、计时、等级、武器栏、Boss 血条、提示
  SurvivorInput.ts      触摸→摇杆向量，单指规则、上 1/3 屏蔽
  SurvivorAudio.ts      音效加载、并发与频率限制、静音
  SurvivorPlatform.ts   wx 生命周期、启动参数、存储适配、安全区、性能档位
  SurvivorPerf.ts       调试性能面板（仅 ?perf=1 或启动参数 perf=1）
  SurvivorSmoke.ts      浏览器冒烟脚本（?survivor&smoke=1），参考 MicroForestSmoke
js/services/
  AnalyticsService.js   埋点上报封装（与 AdService 同风格，接口预留；M3 评估接入，裁决 D7）
cocos-pilot/assets/survivor/         新 Asset Bundle「survivor」：图集、地面贴图、音效
tests/survivor-*.test.mjs            逻辑单测、确定性、数据、存档、合规文案、性能基线
scripts/survivor/bench.mjs           Node 性能基线（npm run survivor:bench）
scripts/survivor/balance.mjs         多种子自动对局统计（npm run survivor:balance）
```

依赖方向只允许：Survivor*.ts → shared/js/survivor/*（同步副本）→ 相对 import。逻辑层内 data/ 不依赖任何系统模块；系统模块之间通过 SurvivorRun 持有的 `world` 对象协作，不互相持有引用，便于单测时只构造需要的部分。

### 2.1 与 sync-shared.mjs 的衔接

对 `scripts/cocos/sync-shared.mjs` 做三处最小改动（M1 第一个任务）：

1. 白名单增加 `root+'/js/survivor/'`（含 data/ 子目录）。
2. 追加入口：`visit(js/survivor/SurvivorRun.js)`、`visit(js/survivor/SurvivorSave.js)`、`visit(js/survivor/Meta.js)`、`visit(js/survivor/Joystick.js)`、`visit(js/survivor/SafeArea.js)`、`visit(js/survivor/data/strings.js)`。依赖由脚本按 import 自动带入。
3. SurvivorBot.js 不作为入口，测试断言它不在 shared-manifest.json 中（同 PackBots 的先例）。

同步副本带 `// @ts-nocheck`，TS 侧以 `any` 使用；不为逻辑层写 .d.ts（维护成本高于收益）。随之需要调整的现有测试：`tests/forest-cleanup.test.mjs` 中“manifest 只允许 microforest/library 前缀”的断言加入 `js/survivor/`。这是对接契约的必要修改，不改该测试的其它断言。

新增 npm 脚本：`survivor:test`（`node --test tests/survivor-*.test.mjs`）、`survivor:bench`、`survivor:balance`。`npm test` 的 glob 已自动包含新测试。

### 2.2 入口接入 PinePilot.ts

- 新增字段 `survivor:SurvivorView|null`，在 `update / resize / onDestroy` 中与其它视图并列调用。
- 进入条件（M1–M2）：浏览器 URL 含 `survivor`，或微信端 `wx.getLaunchOptionsSync().query.survivor` 存在（开发者工具“自定义编译条件”可设置启动参数，无需改构建）。判断写在现有 `['forest','audit',...]` 分支之前，保持 `tests/library-sync.test.mjs` 的正则断言成立。
- 默认入口仍为 PackView，直到 M3 经用户确认后切换（届时同步修改 library-sync 测试中“默认是 PackView”的断言）。

## 3. 逻辑层运行时

### 3.1 SurvivorRun 接口

```js
const run = new SurvivorRun({
  seed,                 // string，正式局用 `${Date.now()}`（由表现层生成后传入），测试用固定值
  viewport: { width: 720, height: 1560 },  // 世界单位，决定刷怪半径与镜头
  bonuses: Meta.bonuses(profile),          // 局外加成，纯数据
  firstRun: !profile.tutorial.done,        // 新手保底与提示
  data: SURVIVOR_DATA                      // 默认取 data/ 下全部模块，测试可替换
})
run.setInput(x, y)        // 摇杆向量，|v| ≤ 1
run.advance(frameDt)      // 表现层每帧调用，内部按固定步长推进，返回本帧执行步数
run.step()                // 单步，测试直接调用
run.state                 // 'playing'|'levelup'|'paused'|'cleansing'|'extract'|'won'|'lost'
run.offer                 // state==='levelup' 时的 3 张卡 [{kind,id,level,evolution}]
run.choose(i)             // 0..2；非 levelup 状态或越界返回 false，不改变状态
run.pause() / run.resume() / run.abandon()
run.drainEvents()         // 返回本帧一次性事件（复用数组，调用方当帧消费）
run.summary()             // {outcome, survivalSec, purified, level, weapons, passives, eliteDefeated, bossDefeated, shinyCards, killer}（killer=造成致命伤的敌人/弹体 id，胜利时为空；裁决 D7 供埋点）
// 只读状态供渲染：run.time, run.player, run.enemies, run.shots, run.mistBubbles, run.zones, run.pickups, run.boss, run.extraction, run.diag
```

状态机：

| 状态 | 进入 | 模拟是否推进 | 离开 |
|---|---|---|---|
| playing | 开局 / 选卡后 / resume | 是 | 升级 → levelup；生命 0 → lost；Boss 生命 0 → cleansing；pause/abandon |
| levelup | 拾取后经验达标（队列中还有待升级则连续弹出） | 否 | choose → playing 或下一张 levelup |
| paused | pause()（暂停按钮、wx.onHide） | 否 | resume → 进入前的状态（playing 或 levelup） |
| cleansing | Boss 被击败 | 是（1.5 秒演出，玩家无敌，全场净化） | → extract |
| extract | 演出结束，生成撤离点 | 是（无刷怪、每秒回 5） | 撤离点内连续 2 秒 → won |
| won / lost | 终态 | 否 | 表现层读取 summary 结算 |

`abandon()` 只在 paused 下有效，直接转 lost 并标记 `abandoned:true`。升级弹出后 0.4 秒内忽略点击属于交互规则，由 SurvivorView 负责，逻辑层不感知现实时间。

### 3.2 固定步长

- 步长 `DT = 1/60` 秒，与仓库旧引擎 SimulationClock 的先例一致。选 60 而不是 30：最快弹体 480/秒在 30 步时每步移动 16，接近蚊蚋碰撞半径 10 + 弹体半径 6，会漏判；60 步时每步 8，安全且无需连续碰撞检测。
- SimClock 累加 `frameDt`；单帧最多执行 5 步（83 ms），超出部分丢弃并计入 `run.diag.droppedTime`。旧引擎允许 250 ms 追赶，这里收紧，因为低端机卡顿时继续追赶会形成“越卡越追”的循环。
- 表现层不做插值：60fps 下每帧 1 步，30fps 下每帧 2 步，直接显示最新状态，视觉误差可忽略，省掉保存上一帧位置的开销。
- `frameDt` 非有限数或负数按 0 处理。
- 暂停、levelup、切后台时 `advance` 不累积时间；恢复后第一帧的 `frameDt` 同样受 5 步上限约束，不会补跑后台时间。

### 3.3 确定性

同一 seed + 同一逐步输入序列 + 同一数据 → 完全相同的结果。用途：回归测试、机器人调参、未来云端复核（第 8 节）。规则：

- 逻辑层禁止 `Math.random`、`Date.now`、`performance.now`；测试 `survivor-determinism.test.mjs` 用正则扫描 js/survivor/ 源码并断言不存在。
- 随机流按用途拆分子种子：`${seed}:spawn`、`${seed}:draft`、`${seed}:drop`、`${seed}:weapon`、`${seed}:enemy`。调整抽卡规则不会让刷怪序列整体漂移，机器人前后对比更可信。
- 遍历顺序只依赖池内稠密表顺序，不依赖 Map/Set 的哈希行为以外的东西（JS 的 Map/Set 按插入序迭代，可接受）。
- 性能档位（第 7.4 节）只影响表现层，不改变逻辑步骤，避免不同机型结果不同。

### 3.4 每步系统顺序

```
step():
  1. input      → 计算玩家速度（moveSpeed × |v|），更新朝向（最后一次非零方向）
  2. player     → 位移、无敌计时、回复（每 1 秒结算一次）
     expiry     → 记录本步旧浊雾泡的UID上界；随后仅在发射遇满池时回收本步会到期的旧弹（life − DT ≤ 0），保持存活泡弹顺序
  3. spawner    → 按时间段刷怪、触发定时事件、远离重定位、Boss 预警/出现
  4. enemies    → 行为（追踪/摆动/远程/冲撞/Boss 技能）、击退衰减、减速清零后由光环重设
  5. grid       → 以当前玩家位置重建敌人空间网格
  6. separation → 敌人之间推开（网格邻居，最多处理 6 个邻居）
  7. weapons    → 冷却推进、释放（生成弹体/区域）、光环与菌伞即时判定
  8. projectiles→ 移动、与敌人碰撞（查网格）、寿命/穿透结束回收（玩家弹体只查敌人网格，不与 mistBubbles 碰撞，裁决 L4）
  9. hostile    → 浊雾泡移动与玩家碰撞；敌人接触伤害（查网格）
  10. deaths    → 生命 ≤ 0 的敌人：净化事件、掉落、计数；精英/Boss 特殊处理
  11. pickups   → 吸附、拾取、经验入账 → 可能进入 levelup
  12. phase     → 胜负/cleansing/extract 判定，time += DT
```

命中与死亡分两段（7–9 标记伤害，10 统一结算），保证同一步内多把武器打同一敌人时掉落只发生一次。

敌弹提前回收只处理进入本步前已存在的对象，不提前移动、扣减存活弹寿命或结算碰撞；本步新发射泡弹仍在第9阶段移动、扣时和判定一次。未遇满池时保持原有回收路径。第9阶段开始即关闭提前回收窗口，暂停和选卡不执行该回收。池满且没有本步到期的旧弹时仍少发并计入 `diag.dropped.bubbles`，不扩大容量、不提前回收将碰到玩家的有效弹丸。

### 3.5 实体与对象池

所有战斗实体是普通 JS 对象，在开局时按上限一次性分配，运行中不再 `new`。`Pool` 结构：

```js
class Pool {
  constructor(capacity, factory)  // 预分配 capacity 个对象，obj.slot 固定为下标
  acquire()   // 返回空闲对象并加入 active 稠密表；池满返回 null（调用方放弃生成并计数）
  release(o)  // 交换删除：把 active 末尾元素移到 o 的位置，O(1)
  active      // 稠密数组，按此遍历
  count
}
```

每个对象在 acquire 时由所属系统的 `reset(o, ...)` 重置全部字段，并分配递增的 `uid`（池内对象复用后 uid 变化，弹体记录的“已命中 uid”不会误伤新敌人）。遍历中需要删除时倒序遍历 active。

池容量（与 GDD 第 10 节、性能预算一致）：

| 池 | 容量 | 内容 | 池满行为 |
|---|---|---|---|
| enemies | 202 | 普通 + 事件 + Boss 召唤共 200，额外 2 槽预留给精英与 Boss | 普通生成跳过；精英/Boss 用预留槽，永不失败 |
| shots | 150 | 孢子弹、落叶回旋镖 | 本次少发，`diag.dropped.shots++` |
| mistBubbles | 60（S3-D1：原 40） | 菌灵与 Boss 的浊雾泡 | 本次少发，`diag.dropped.bubbles++` |
| zones | 16 | 雨滴落点（阴影 → 伤害）、撤离点 | 少落 |
| spores | 250 | 孢子经验 | 按 GDD 8.1 合并到最近孢子 |
| drops | 5 | 露珠（上限 3）、林风（上限 1）、大露珠（不计上限，用预留 1 槽） | 不生成 |

菌伞旋刃和露珠环不占池：位置由时间解析计算（`angle = ω·t + 2πi/n`），每步直接查询网格。

敌人对象主要字段：`kind, x, y, vx, vy, r, hp, maxHp, speed, damage, xp, kbRes, slow, kbX, kbY, kbT, hitAt[5], lastHitTime, phase, timer, uid`。`hitAt` 是长度 5 的 Float64Array，按武器序号记录“该武器下次可再伤害此敌人的时间”，实现 GDD 的单敌受击间隔，避免 Map 分配。

### 3.6 空间网格与碰撞

- 所有碰撞体都是圆。
- 网格跟随玩家：以玩家所在格为中心的 40×40 窗口、格边长 64（覆盖 ±1280；视口上限 1000×1800 时 relocateDistance 最大约 1210，仍在窗口内），超出窗口的敌人夹到边缘格（极少发生，因为远离会被重定位）。
- 每步重建（计数排序）：`cellCount: Int32Array(1600)` → 前缀和 `cellStart` → `items: Int32Array(202)` 存敌人 slot。无对象分配，200 个敌人重建约几微秒。
- 半径大于 32 的实体（目前只有 Boss，r56）不入网格，放在 `large` 列表里逐个检测，避免跨多格插入。
- 查询 `queryCircle(x, y, r, out)` 按 `r + 32`（网格内敌人最大半径）覆盖格子，把候选 slot 写入复用的 Int32Array 并返回数量，调用方再做精确圆-圆判定（与旧引擎“索引筛候选 + 原判定”一致），最后追加 `large` 列表。
- 用途：弹体 vs 敌人、菌伞片 vs 敌人、露珠环/雨滴范围伤害、敌人接触玩家、敌人分离。
- 目标选择（最近敌人、最近 5 个、400 内随机）直接线性扫描 enemies.active（≤202），每秒只发生几次，比网格环形扩展更简单。

敌人分离：对每个敌人查询邻居，重叠时各推开重叠量的一半 × 0.5，最多处理 6 个邻居；推开后若与玩家重叠则沿连线贴到 `player.r + enemy.r`，满足“不叠成一点、不穿过角色”。

### 3.7 事件队列

表现层每帧通过两种方式读取逻辑：持续状态直接读池（位置、种类、生命比例、最近受击时间），一次性表现通过 `drainEvents()` 读取。事件类型：`purified{kind,x,y}`、`hit{kind,x,y}`（只用于音效节流，不逐个做特效）、`playerHurt`、`heal{amount}`、`levelUp{level}`、`levelUpOffer{cards}`（本次三选一的 3 张卡 id，供表现层转译为 levelup_offer 埋点，裁决 D7）、`levelUpPick{picked}`（选中的卡 id，供 levelup_pick 埋点）、`evolved{id}`、`weaponFired{id}`、`raindropWarn{x,y,r}`、`bossWarning`、`bossSpawn`、`bossCharge{dx,dy}`、`eliteSpawn`、`cleansing`、`extractionOpen{x,y}`、`pickup{kind}`、`won`、`lost`。事件对象来自一个 512 容量的事件池；单帧超过 512 时丢弃 `hit` 类事件并计数，其它事件不会丢（数量级远低于上限）。

### 3.8 系统要点

- Stats：只在选卡、开局时重算派生属性（公式见 GDD 15.1），每步只读缓存值。cooldown 下限 0.5 在这里统一施加。
- Weapons：每种武器实现同一接口 `{ id, index, tick(world, weaponState, dt) }`，档位参数从 `data/weapons.js` 读取，不在代码里写数值。孢子弹“无目标不进入冷却”、雨滴“无目标随机落在 150–300”、回旋镖“回程追玩家”、孢子风暴“锁定 5 个不同目标”都在各自 tick 内实现。
- Spawner：按 `data/waves.js` 的时间段累加 `rate × DT`，取整生成；组成按权重用 `spawn` 随机流抽取；分钟成长系数在生成瞬间计算并写入实体（Boss 例外）。事件（2:30 包围圈、4:30 灰蛾横穿、5:00 精英、6:30 蜗牛围墙、6:58 Boss 预警、7:00 Boss）按时间各触发一次，受 200 硬上限约束。灰蛾横穿用 `behavior:'cross'`，飞出屏幕后静默回收，不掉孢子、不计净化。
- Progression：`xpToNext(L)` 严格按 GDD 公式；待升级次数入队，逐次生成 offer。抽卡规则（进化卡优先、权重 10/8/6、兜底卡、首升保底新武器）全部在 `draftOffer(state, rng)` 纯函数中，测试可直接枚举。
- Pickups：孢子先找“空闲槽”，池满时线性找最近已有孢子累加经验并升外观档（≥5 中、≥20 大）。吸附判定每步对 ≤250 个孢子做一次距离平方比较，开销可忽略。

## 4. 数据驱动配置

所有 GDD 表格落为 `js/survivor/data/*.js`，每个文件只导出一个用 `Object.freeze` 包裹的 JSON 字面量（无函数、无计算表达式、无 import）：

```js
// js/survivor/data/weapons.js
export const WEAPONS = Object.freeze({
  spore_shot: { name: '孢子弹', index: 0, evolvesWith: 'cooldown', evolution: 'spore_storm',
    levels: [ { damage: 10, cooldown: 1.0, count: 1, pierce: 1, speed: 420, knockback: 10, life: 1.2 }, /* Lv2–Lv5 */ ],
    evolved: { name: '孢子风暴', damage: 22, cooldown: 0.6, count: 5, pierce: 3, speed: 480, knockback: 15, life: 1.2 } },
  // umbrella_blades, dew_ring, raindrop, leaf_boomerang
})
```

文件与内容：`player.js`（基础属性）、`weapons.js`、`passives.js`、`enemies.js`（含 elite_beetle、boss_mist_snail 及其技能参数）、`waves.js`（时间段数组 + 事件数组）、`pickups.js`（概率、回复量、存在时间）、`permanent.js`（永久强化价格与效果）、`limits.js`（池容量、硬上限、刷怪半径余量）、`strings.js`（所有界面文案，供合规扫描）。id 一律使用 GDD 15.5 列出的英文 id。

为什么不用 .json 文件：sync-shared.mjs 只处理 .js 并改写 import；Node 导入 JSON 需要 `with { type: 'json' }`，Cocos 3.8 的 TS 编译链对 import attributes 支持不确定；改用 Cocos JsonAsset 异步加载又会让逻辑层依赖资源加载。JSON 字面量的 .js 模块在两端都零成本可用，策划改数值的体验与改 JSON 相同。

校验（`data/validate.js`，返回错误数组，空数组为通过）：

| 规则 | 示例 |
|---|---|
| 必填字段与类型 | 每级武器参数为有限正数；`count`、`pierce` 为正整数 |
| 档位数量 | 武器正好 5 级 + 1 进化；被动、永久强化级数与 GDD 一致 |
| 引用完整 | `evolvesWith` 指向存在的被动；波次组成的 id 都在 enemies 中 |
| 区间 | 波次时间段首尾相接、单调递增；组成百分比和为 100；概率 ∈ [0,1] |
| 上限一致 | waves 中同屏上限 ≤ limits.enemies（200） |
| 可 JSON 往返 | `deepEqual(JSON.parse(JSON.stringify(x)), x)`，防止混入函数或 Infinity |

`validate()` 在测试中必须为空，同时在 SurvivorRun 构造时运行一次（毫秒级）。非空时抛出 `SurvivorDataError`（消息包含字段路径），属于致命错误：表现层显示“游戏数据异常，请更新到最新版本”页面并 `console.error` 完整错误；不尝试带病运行。

M2 调参时由 `scripts/survivor/balance.mjs` 读取同一批模块跑机器人，输出 JSON 统计到 `tmp/`（已在 .gitignore 中），不改写数据文件；调参结论由策划先改 01-gdd.md，再改数据模块。

## 5. 存档

### 5.1 存储介质与注入

SurvivorSave 接收 `{getItem(key), setItem(key, value)}` 接口（裁决 D13：不依赖 removeItem，与 LibraryProgress 及 PinePilot audit 注入的实际先例一致——已核实二者均只实现 getItem/setItem）。表现层传入 `host.progressStorage || sys.localStorage`；Cocos 微信适配层把 `sys.localStorage` 映射到 wx 本地存储（同步 API），浏览器为 window.localStorage，测试与 `?audit` 场景为内存 Map。逻辑层不直接调用 wx。损坏档的处理用覆盖写（写 `.corrupt` 键、以新档覆盖主键），不调用删除接口（见 §5.3）。

### 5.2 键与格式

| 键 | 内容 |
|---|---|
| `survivor.v1.profile` | 主记录 |
| `survivor.v1.profile.backup` | 上一份成功写入的记录 |
| `survivor.v1.profile.corrupt` | 主、备都损坏时，原始字符串留存一次，便于排查；不再读取 |

键名中的 `v1` 是存储命名空间，满足 GDD“前缀 survivor.v1.”；只有信封格式不兼容变化时才换。玩家数据结构演进靠信封内的 `schema` 号迁移，不换键。

```json
{ "format": "survivor-save", "schema": 1, "checksum": "a1b2c3d4", "data": "{...JSON 字符串...}" }
```

schema 1 的 data：

```json
{
  "crystals": 0,
  "permanent": { "perm_hp": 0, "perm_might": 0, "perm_speed": 0, "perm_magnet": 0, "perm_regen": 0 },
  "bestSurvivalSec": 0, "wins": 0, "runs": 0,
  "settings": { "sound": true, "vibration": true, "reduceFlash": false },
  "tutorial": { "move": false, "levelUp": false, "boss": false }
}
```

`settings` 的 `vibration`（默认开）、`reduceFlash`（默认关）两项为裁决 D3 并入：schema 1 尚未上线、无存量存档，直接并入 schema 1，不需要迁移函数；§5.3 的 sanitize 对三项布尔字段按默认值清洗。

checksum 用与 StorageService 相同的 FNV-1a 32 位，仅用于发现损坏，不是加密或防作弊（本地存档可被用户修改，单机无经济系统，接受）。

### 5.3 读取流程

1. 读主记录 → 解析信封 → 校验 checksum → `schema` 比较。
2. `schema < CURRENT`：依次执行 `MIGRATIONS[n](data) → data`（纯函数，n→n+1），迁移后立即写回（先把原记录写入 backup）。迁移函数永不删除未知字段之外的玩家数据。
3. `schema > CURRENT`（用户装了新版又回退到旧版）：进入 `locked`，本次会话数据只在内存，营地页显示“存档来自更新的版本，本次进度不会保存”，不覆盖主记录。与 LibraryProgress 的处理一致。
4. 主记录缺失：读 backup；都缺失 → 新档（首次游玩，正常情况）。
5. 主记录损坏（JSON 失败或 checksum 不符）：读 backup，成功则 `recovered=true` 并在下次写入时修复主记录；backup 也损坏 → 把主记录原文写入 `.corrupt`，以新档继续，营地页提示“存档损坏，已重新开始”，`console.warn`。不进入永久 locked，避免玩家再也无法存档。
6. `getItem` 抛异常（存储不可用）：`locked`，同第 3 条提示文案改为“存档无法读取”。
7. 字段清洗（sanitize）：`crystals` 取整并夹到 [0, 10 000 000]；永久强化等级取整并夹到 [0, 该项最大级]；未知强化 id 丢弃；计数类夹到非负整数；布尔字段非布尔时取默认值。清洗不报错，只在测试中覆盖。

### 5.4 写入时机与失败

只在以下时刻写：结算发放露晶、购买/重置永久强化、切换音效、完成新手提示。战斗中不写。写入顺序：先把上一份成功内容写 backup，再写主记录（同 StorageService：不会用坏的主记录覆盖好的备份）。内容未变化时跳过。

`setItem` 抛异常（如超出 wx 10MB 配额，实际存档 < 2KB 基本不会发生）：`save()` 返回 false，`saved=false`，营地页显示“存档写不进去，本次进度不会保存”，`console.warn` 一次；下一次写入时机或 `wx.onShow` 时重试。结算页的露晶数仍正常显示，进程存活期间内存中的数据有效。

MVP 不做局中存档（GDD 12 节）：进程被杀则本局作废。

## 6. 表现层

### 6.1 SurvivorView 生命周期

1. 构造：设设计分辨率 720×1280 FIXED_WIDTH，计算安全区——安全区数学（由 windowInfo + capsule 计算四边距）抽到纯函数 `js/survivor/SafeArea.js`（裁决 D18），SurvivorPlatform.ts 只负责调 wx API 取原始值后调用该纯函数，使默认值与刘海机型可用 node --test 覆盖（见 02 §2.1 公式、04 survivor-safearea.test.mjs）。读存档，显示“森林营地”轻量页（仅 Label/Graphics，不依赖分包）。
2. 并行 `assetManager.loadBundle('survivor')`，营地页“出发”按钮在分包和图集就绪前显示进度并禁用。
3. 出发：`new SurvivorRun(...)`，切到战斗层；`game.on(Game.EVENT_HIDE)` → `run.pause()`（PackView 先例）；回到前台停留在暂停菜单。
4. 每帧 `update(dt)`：`run.setInput(...)` → `run.advance(dt)` → `drainEvents()` 驱动音效与 FX → BattleArt 同步 → HUD 按需刷新 → 根据 `run.state` 打开/关闭模态框（升级三选一、暂停、结算）。
5. 结算：`Meta.settle(profile, run.summary())` → `save.save(profile)` → 结算页。
6. 销毁：解绑事件，释放节点、图集引用（`decRef`）、音频，恢复 375×812 设计分辨率。

### 6.2 战斗渲染

层级（每层一个父节点，从下到上）：地面 → 雨滴阴影/撤离点 → 孢子与拾取物 → 敌人 → 浊雾泡 → 玩家弹体与菌伞 → 玩家 → FX → HUD → 模态框。

- 地面：一张 256×256 可平铺贴图铺满视口 + 1 圈余量的 Sprite 网格（约 4×8 块），随镜头取模偏移，不随世界无限创建。装饰物（倒木、蘑菇丛）由种子决定的格子哈希放置，节点池循环复用。
- 实体同步采用“每帧按序分配”：每层维护一个 Sprite 节点池；每帧遍历对应逻辑池的 active，只为落在视口（含 64 余量）内的实体按顺序取节点，设置位置、SpriteFrame、缩放（朝向翻转）、颜色；本帧未用到的节点 `active=false`。屏幕外实体不占节点，所以节点池可以小于逻辑池：敌人 160、玩家弹体 120、浊雾泡 60（S3-D1：原 40）、孢子 150、拾取物 6、FX 80，数值统一读 `LIMITS.nodes`，表现层不再硬编码。节点不跨帧保存实体状态，复用不会串状态。
- 动画：不用 Animation 组件，帧号由 `floor((run.time + uid × 0.37) × fps) % frames` 计算，错开相位。受击闪白由 `run.time - lastHitTime < 0.1` 决定 Sprite 颜色；净化 0.3 秒光点、受伤红边、阴影收缩等用 FX 池在表现层计时。
- 禁止在战斗中每帧重绘 Graphics。Graphics 只用于内容变化时才重绘的元素：摇杆底座、Boss 冲撞箭头、露珠环圈（档位变化时重绘一次，之后仅移动节点）。经验条、血条用九宫格 Sprite 改宽度。
- HUD Label 只在数值变化时赋值（计时每秒一次、等级、净化数），`cacheMode = CHAR`。
- 合批：战斗中所有动态 Sprite 来自同一张 `survivor-battle` 图集（裁决 D6，02 §8.2）、同一材质、同一混合模式，每层一个批次。scenery（地面/装饰）与 ui（HUD/模态框）各自独立批次，不与战斗层混图集。survivor-battle 现为 512×1024 占位图集（S2 P1，BUG-S2-05；单图集，合批不变），正式美术时再定尺寸，纹理内存仍按 §7.3 的 2048×1024 上限预算。Sprite 改颜色不打断合批（顶点色），改混合模式会打断，因此光效用预乘亮色贴图而不是加色混合。

### 6.3 输入

SurvivorInput 监听战斗根节点 TOUCH_START/MOVE/END/CANCEL，只跟踪第一个触点 id；按下点 y 在屏幕上方 1/3 时不启动摇杆。偏移量（设计像素）交给 `Joystick.vector(dx, dy, {deadZone: 8, radius: 60})` 得到向量，再 `run.setInput`。触点丢失（TOUCH_CANCEL、切后台）时向量归零。浏览器调试支持 WASD（`input.on(KEY_DOWN)`，同 MicroForestView）。

### 6.4 音效

SurvivorAudio 维护 6 个 AudioSource 轮转；每种音效有最小间隔（hit 60 ms、purify 40 ms、pickup 50 ms），超频率直接丢弃，防止数百次命中挤爆音频。M1 复用 `resources/forest-audio` 的 wav（已随旧玩法删除）；S2（08 P4）为 survivor 分包 `audio/` 内程序生成的占位 wav（16-bit 单声道 22.05 kHz，约 175KB），正式音效可换 mp3（单声道、22 kHz），总量 ≤ 300KB。同类音效另有并发上限（拾取 2、净化 3、命中 2，其余 1）；切后台停止全部音效，回前台恢复可播。加载失败静默降级，`console.warn` 一次。首次触摸后才播放（同 ForestAudio.unlock）。

## 7. 性能预算

### 7.1 目标机型与帧率

| 档位 | 参考机型 | 目标 | 验收线 |
|---|---|---|---|
| 中端安卓 | 骁龙 778G / 天玑 8100 级，6GB | 60 fps | 200 敌人同屏时 P50 ≥ 55 fps（**M2 口径**，裁决 D5；M1 沿用 00 的中端真机 ≥ 30 fps 下限）、P95 帧耗时 ≤ 25 ms |
| 中低端安卓 | 骁龙 680 / 天玑 700 级，4GB | 30 fps 稳定 | 自动降为 30 fps 档后 P95 帧耗时 ≤ 40 ms |
| 微信开发者工具（Mac） | — | 60 fps | 00 计划 M1 验收：200 敌人 ≥ 50 fps |
| iOS | iPhone XR 及以上 | 60 fps | 同中端 |

### 7.2 单帧时间预算（60 fps = 16.7 ms，30 fps = 33.3 ms）

| 项 | 60 fps 档 | 30 fps 档（2 步/帧） |
|---|---|---|
| 逻辑模拟 | ≤ 3 ms/步 | ≤ 8 ms（2 步） |
| 表现同步（节点分配、HUD） | ≤ 3 ms | ≤ 5 ms |
| 引擎渲染提交 + GPU | 剩余 ≤ 10 ms | 剩余 ≤ 20 ms |

Node 基线（`npm run survivor:bench`，开发机）：200 敌人 + 150 弹体 + 250 孢子满载时，单步平均 ≤ 0.6 ms，作为“真机 5 倍慢”时仍满足 3 ms 的代理指标；测试中只断言宽松上限（≤ 2 ms，防 CI 抖动），精确数字写入每 Sprint 测试报告。

### 7.3 同屏与资源上限

| 指标 | 上限 |
|---|---|
| 逻辑实体 | 敌人 202、玩家弹体 150、浊雾泡 60（S3-D1：原 40）、雨滴区 16、孢子 250、拾取物 5 |
| 渲染节点（战斗层合计） | ≤ 600（见 6.2 节点池）。S3-D1 复核口径：浊雾泡节点 +20 后各池上限之和约 631，但 600 卡的是“同一帧激活节点数”，各池不会同时打满（S2 冒烟实测峰值 321）；浊雾泡与其它战斗 Sprite 同图集同材质、同层连续，节点增加不增加 DrawCall。复核以冒烟 `maxNodes` 与战斗帧 DrawCall 为准 |
| DrawCall（战斗中） | ≤ 25；目标 15–20（每层 1 批 ≈ 9，HUD Label 与图标 ≈ 6–10） |
| 纹理内存 | ≤ 32 MB（survivor-battle 图集 2048×1024 RGBA ≈ 8 MB，裁决 D6；M1 暂用 microforest-motion 2048² ≈ 16 MB） |
| JS 堆 | 战斗中 ≤ 50 MB，8 分钟一局堆增长 ≤ 5 MB |
| 每步分配 | 热路径 0 分配（不用 map/filter/展开/闭包），bench 用 `--expose-gc` 检查堆增长 |

### 7.4 自动性能档位

SurvivorPlatform 在 playing 状态下统计最近 5 秒帧耗时；P50 > 20 ms 时切到 low 档：`game.frameRate = 30`，FX 池上限 80 → 30，孢子渲染只画最近 100 个，地面装饰减半。一局内只降不升，下一局重新从 normal 开始。档位只影响表现，逻辑不变（保证确定性）。`?perf=1` 时 SurvivorPerf 显示 FPS P50/P95、步耗时、各池计数、`diag.dropped`、DrawCall（profiler 模块已启用）。

### 7.5 包体与分包

当前（package-report.json）：主包 1.64 MiB / 4 MiB；分包 internal 0.16、main（脚本）1.83、resources（旧图集与音效）3.04 MiB；总计 6.66 MiB / 20 MiB。resources 已接近单分包 4 MiB 上限，新素材不能再放进去。

方案：

1. 新建 Asset Bundle 目录 `cocos-pilot/assets/survivor/`（meta 中 `isBundle: true, bundleName: "survivor"`），存放 survivor 图集、地面贴图、音效。预算 ≤ 2.5 MiB。
2. `scripts/cocos/package-wechat.mjs` 的分包名单生成方式修改（裁决 D14）：现有函数对硬编码数组 `['internal','main','resources']` 中**每个** bundle 做“缺 config.json 即 throw”，直接把 'survivor' 追加进数组会在 survivor 分包尚未建立的 M1 早期构建报错。改为：固定名单 `['internal','main','resources']` + 当 `assets/survivor/config.json` 存在时才追加 `'survivor'`（缺失不报错）。`tests/cocos-package.test.mjs` 覆盖两种情形：有 survivor 分包时 4 个分包、无 survivor 分包时 3 个分包不报错。每个分包 ≤ 4 MiB 的现有检查保持不变。
3. 主包只含引擎与启动代码，目标 ≤ 2 MiB；营地页不依赖任何分包资源，分包加载期间可交互。
4. M1–M2 构建总量预计约 9 MiB（旧 + 新并存），在 20 MiB 内。
5. M3（经用户确认后）从构建中剔除旧玩法（第 9 节），预计 main 脚本分包降到 < 0.6 MiB、resources 分包移除，总包 ≤ 5 MiB。届时评估裁剪 engine.json 中未用模块（rich-text、mask、ui-skew、affine-transform、intersection-2d），每项裁剪后跑冒烟测试再保留。

## 8. 后端方案评估

### 8.1 结论

MVP 纯前端。GDD 的局外成长是单机闭环，没有需要服务端裁决的经济或社交功能；接入后端会新增隐私声明、云开发计费、网络失败路径和审核材料，收益不足以覆盖。“后端”工作在 MVP 内只包括存档、广告（AdService，M3 评估）、隐私（PrivacyService）的封装。

MVP 之后若做排行榜/云存档，选微信云开发：

| 方案 | 优点 | 缺点 | 结论 |
|---|---|---|---|
| 微信云开发（云函数 + 云数据库） | 免鉴权（云函数上下文直接拿 OPENID），无需域名与 ICP，Node 运行时可直接复用 js/survivor 逻辑做复核 | 绑定微信生态，按调用量计费 | 选用 |
| 开放数据域好友排行（wx.setUserCloudStorage） | 只看好友，零服务端 | 数据由客户端写入，无法防作弊；需单独的开放数据域工程，占包体 | 仅作好友榜补充，晚于全服榜 |
| 自建服务器 | 完全可控 | 需要域名备案、HTTPS、鉴权、运维 | 不选 |

### 8.2 接口草案（云函数）

所有接口的用户身份只取 `cloud.getWXContext().OPENID`，客户端传来的任何 id 一律忽略。

| 云函数 | 请求 | 响应 | 说明 |
|---|---|---|---|
| `survivorStartRun` | `{clientVersion, dataVersion}` | `{runId, seed, issuedAt}` | 服务端发种子并记录开局时间；同一用户 10 分钟内未结束的 run 最多 3 个 |
| `survivorSubmitRun` | `{runId, summary, inputLog?}` | `{accepted, rank?, reason?}` | summary 同 `run.summary()`；inputLog 见 8.3 |
| `survivorLeaderboard` | `{board: 'best_time'|'weekly_purified', limit ≤ 50}` | `{entries:[{nick, value, build}], self:{rank, value}}` | 只读，结果缓存 60 秒 |
| `survivorSaveProfile` | `{schema, data, revision}` | `{ok, revision}` 或 `{ok:false, conflict, server:{schema, data, revision}}` | 乐观并发：revision 不一致时返回服务端版本由客户端选择 |
| `survivorLoadProfile` | `{}` | `{schema, data, revision}` 或 `{empty:true}` | 新设备首次启动时拉取 |

集合：`runs`（runId、openid、seed、issuedAt、summary、status、checks）、`leaderboard`（每用户每榜一条最佳）、`profiles`（openid、schema、data、revision、updatedAt）。数据库权限设为“仅云函数可写”。

昵称：不调用已废弃的 getUserInfo；默认显示“旅人 #后四位”，若要显示真实昵称头像，需走头像昵称填写组件并经内容安全接口审核，同时更新隐私指引。

### 8.3 防作弊注意事项

- 永远不信任客户端数值：露晶由服务端用同一份 `Meta.js` 公式从 summary 重算；排行值只取 survivalSec、purified。
- 合理性校验（廉价，所有提交都做）：`survivalSec ≤ (服务器收到时间 − issuedAt) + 5`；survivalSec ≤ 1800；purified ≤ 按波次表从 0 到 survivalSec 的最大可生成数（由 data/waves.js 计算）；level ≤ 由最大可得经验反推的等级；bossDefeated 时 survivalSec ≥ 420；武器/被动组合满足进化前置条件。任一失败 → `accepted:false, reason`，不上榜，记录到 runs.checks 便于人工复查。
- 频率限制：每用户每分钟最多 2 次提交；runId 只能提交一次。
- 回放复核（只对进入前 50 的成绩做）：客户端上传逐步输入（每步 1 字节方向 + 1 字节力度、选卡下标，RLE 压缩后通常 < 20KB），云函数用相同 seed 与 js/survivor 重跑并比对 summary。风险：iOS（JavaScriptCore）与云函数（V8）的 `Math.sin/cos/atan2` 末位可能不同，导致长局分叉；因此回放比对用容差（存活时间 ±2 秒、净化数 ±3%），并在 M4 前做跨引擎一致性测试；若不一致率过高，逻辑层改用查表三角函数。
- 云存档冲突：单机无交易，云存档被改只影响自己，按 revision 乐观并发处理即可，不做额外防篡改。
- 合规：接入云开发后需在隐私指引中声明“游戏数据上传至云端”，并在设置中提供删除云端数据的入口（调用云函数清除 profiles 与 runs）。

## 9. 旧玩法代码的处理

原则：隔离而非删除。任何删除、移动旧代码/素材，改默认入口，都需要用户确认后执行；本阶段不改 git。

| 阶段 | 处理 |
|---|---|
| M0（当前） | 只写文档。工作区约 718 条未提交改动保持原样，等用户按 00 计划 R1 决定如何存档。 |
| M1–M2 | 旧代码（js/microforest、js/library、Library/Pack/MicroForest*View 及其测试、resources 旧分包）不再维护，也不修改；唯一例外是第 2.1 节列出的对接改动（sync-shared 白名单、package-wechat 分包名单、两条测试断言）。PinePilot 只新增 survivor 分支。旧测试继续在 `npm test` 中运行，已失败的 forest-cleanup 作为基线记录，不因新玩法变坏即可。 |
| M3（需用户确认） | 推荐方案：先给当时的提交打 tag `legacy-final`，再在新提交中从工作树移除旧视图 TS、js/microforest、js/library、旧测试、resources 中的旧图集，同步修改 PinePilot（只留 SurvivorView，并移除其中所有 forest/audit/review/microSmoke/campaignSmoke 调试分支与相关 import，裁决 D15）、sync-shared（只留 survivor 入口）、build.mjs（去掉对 ADVENTURE_LEVELS 的 import 与 assertPortalSpacing）、forest-cleanup/library-sync 等契约测试。**M3 剔除清单以届时实际 grep 结果为准**（build.mjs 的旧玩法依赖点与 PinePilot 调试分支在实现 M3 前先逐行核实，防遗漏导致编译错误，见 00 风险 R2）。代码可随时从 tag 找回。 |

为什么 M3 推荐移除而不是“保留文件但不打包”：Creator 会编译 assets/ 下全部脚本，PinePilot 又静态 import 旧视图，旧代码留在 assets/ 就一定进脚本分包（当前 main 分包 1.83 MiB 主要来自 MicroForestFrames.ts / MicroForestMotionFrames.ts）；把旧脚本挪进单独 bundle 并改为动态加载，需要改动大量旧代码，违背“不再维护旧代码”。若用户不同意移除，备选是 M3 只切默认入口、旧代码继续随包，代价是包体多约 4.5 MiB；正式版中旧玩法不可达（微信端没有 URL 参数，旧玩法只能经浏览器 URL 进入）。

另外 README.md、CODEX_HANDOFF.md 等过时文档在 M3 更新，旧 docs/ 文件不删。

## 10. 错误处理

| 操作 | 失败条件 | 性质 | 调用方得到 | 日志 |
|---|---|---|---|---|
| 数据校验（Run 构造） | validate() 非空 | 致命 | 抛 `SurvivorDataError`；View 显示“游戏数据异常”页，只提供返回 | console.error（含字段路径） |
| 加载 survivor 分包 | 网络失败、分包下载失败 | 可恢复 | 营地页显示“资源加载失败”+ 重试按钮；2 秒后自动重试 1 次 | console.warn 每次失败 |
| 读取图集帧 | 帧名缺失 | 可恢复 | 用图集内 `missing` 占位帧（中性灰点） | console.warn，每个帧名一次 |
| 音效加载 | 加载失败 | 可恢复 | 该音效静默 | console.warn 一次 |
| 存档读取 | 见 5.3：缺失/损坏/更新版本/存储异常 | 可恢复 | `save.status ∈ {ok, recovered, reset, locked}`，营地页按状态提示 | reset、locked 时 console.warn |
| 存档写入 | setItem 抛异常 | 可恢复 | `save()` 返回 false，`saved=false`，营地提示 | console.warn 一次 |
| 选卡 | 非 levelup 状态、下标越界、非整数 | 忽略 | `choose()` 返回 false，状态不变 | 无 |
| 对象池满 | 生成时无空槽 | 预期行为 | acquire 返回 null，调用方放弃本次生成 | 无；计入 `run.diag.dropped`，性能面板可见 |
| 帧卡顿 | frameDt > 5 步 | 预期行为 | 多余时间丢弃 | 计入 `run.diag.droppedTime` |
| 云函数（MVP 后） | 网络失败 / 超时 / 拒绝 | 可恢复 | 提交失败的成绩存本地队列（最多 5 条），下次启动重试；拒绝不重试，结算页不显示名次 | console.warn |

逻辑层的运行时不加“NaN 自愈”之类的防御分支；这类问题由单测和确定性测试兜住，出现即是缺陷。

## 11. 外部输入校验

| 输入 | 必填 | 类型与限制 | 不合法时 |
|---|---|---|---|
| `setInput(x, y)` | 是 | 有限数；模长 > 1 时归一化 | 非有限数按 0 |
| `advance(frameDt)` | 是 | 秒，有限非负；单帧最多 5 步 | 非有限或负数按 0 |
| `choose(i)` | 是 | 整数 0..offer.length−1，仅 levelup 状态 | 返回 false |
| `seed` | 是 | 非空字符串 | 构造时抛 TypeError（编程错误） |
| `viewport` | 是 | width ∈ [320, 1000]、height ∈ [480, 1800] 的有限数（世界单位；竖屏 720 宽时覆盖 4:3 到 22.5:9） | 超出时夹到区间端点（更长的屏幕多出的区域只显示地面，不影响刷怪在屏外）；非有限数抛 RangeError |
| `bonuses` | 是 | 由 `Meta.bonuses(profile)` 生成，profile 已清洗 | 不再校验 |
| 存档内容 | — | 见 5.3 清洗规则 | 夹取/默认值，不报错 |
| 数据模块 | — | 见第 4 节校验表 | SurvivorDataError |
| 触摸 | — | 只认第一个触点；按下 y 在上 1/3 时忽略 | 忽略 |
| 云函数请求（MVP 后） | — | 服务端按 8.3 校验，客户端字段只作参考 | `accepted:false` |

## 12. 不变量与归属

| 不变量 | 归属层 | 理由 |
|---|---|---|
| 实体数量不超上限 | 逻辑层 Pool | 上限即预分配容量，物理上无法超出；表现层不必再判断 |
| 只有 levelup 状态能选卡；升级期间模拟不推进 | SurvivorRun 状态机 | 规则属于玩法，需被单测与机器人覆盖 |
| 结果可复现（无非确定性来源） | 逻辑层 + 确定性测试 | 回归、调参、云端复核都依赖它 |
| 露晶非负、购买需余额足够、等级不超上限 | Meta.js（纯函数）+ SurvivorSave 清洗 | UI 只负责禁用按钮，真实约束在纯函数中可测 |
| 不覆盖更新版本的存档、不用坏主记录覆盖好备份 | SurvivorSave | 数据安全只能在存储层集中保证 |
| 逻辑层与平台无关 | sync-shared.mjs（非相对 import 直接报错）+ 测试扫描 `from 'cc'` / `wx.` | 构建时就失败，比审查更可靠 |
| shared/ 副本不手改 | shared-manifest.json 的 sha256 + 同步测试 | 沿用现有机制 |
| 文案合规（词表与扫描对象以 04 §7.1 为准，裁决 D16：不出现“吃/食用/采食/美味”与菌/蘑菇组合、用“净化”不用“击杀/消灭”，“死亡/血/尸”仅限面向玩家文案） | data/strings.js 集中存放 + 合规测试扫描 strings.js 与 Survivor*.ts 中的中文 UI 字面量（资源帧名/字段名/日志不在范围） | 合规一票否决，必须自动化 |

## 13. 可测试性

单元测试（node --test，无引擎，每个文件对应一个模块）：

| 测试文件 | 覆盖 |
|---|---|
| survivor-data.test.mjs | validate() 为空；关键数值与 GDD 表格逐项比对（武器各档、敌人、波次、永久强化价格） |
| survivor-pool.test.mjs | 容量、交换删除、uid 递增、池满返回 null |
| survivor-grid.test.mjs | 随机 500 组场景下网格查询结果与暴力全量查询完全一致（沿用旧引擎“索引 vs 全量对照”做法）；窗口边缘夹取 |
| survivor-stats.test.mjs | GDD 15.1 公式；cooldown 下限 0.5；maxHp 加成同步当前生命 |
| survivor-weapons.test.mjs | 每种武器的发数、扇形角度、穿透、单敌受击间隔、无目标行为、进化形态 |
| survivor-enemies.test.mjs | 追踪、灰蛾摆动、菌灵射程与冷却、精英冲撞节奏、Boss 三技能与狂暴、分离不穿过玩家 |
| survivor-spawner.test.mjs | 各时间段生成速率与组成（统计容差）、同屏上限、事件触发一次、重定位、刷怪点在视口外 |
| survivor-progression.test.mjs | xpToNext 与 GDD 15.2 表一致；多级连续弹出；抽卡规则（进化优先、权重、兜底、首升保底） |
| survivor-pickups.test.mjs | 孢子合并与外观档、露珠/林风上限与 30 秒消失、吸附 |
| survivor-run.test.mjs | 状态机全路径：playing↔paused、levelup、lost、Boss → cleansing → extract → won、abandon |
| survivor-meta.test.mjs | 露晶公式（GDD 13.1 两个示例 24、132）、购买、重置全额退还 |
| survivor-save.test.mjs | 新档、迁移（构造 schema 0 夹具）、损坏 → 备份、双损坏 → .corrupt + 新档、更新版本 → locked、setItem 失败、清洗 |
| survivor-determinism.test.mjs | 同种子同输入两次运行 summary 与逐秒状态哈希相同；源码禁用 API 扫描 |
| survivor-compliance.test.mjs | 文案禁用词扫描 |
| survivor-sync.test.mjs | 同步后 shared/js/survivor 文件齐全，SurvivorBot 不在 manifest |
| survivor-joystick.test.mjs | Joystick.vector 死区/半径→单位向量，边界与钳制 |
| survivor-safearea.test.mjs | SafeArea 纯函数：默认值（接口失败回退）与刘海机型四边距（裁决 D18） |
| survivor-perf.test.mjs | 满载单步耗时宽松上限、8 分钟机器人局堆增长上限 |
| survivor-bot.test.mjs | 3 个固定种子机器人局能跑完且不抛错（完整统计在 balance 脚本） |

集成与人工：
- `npm run cocos:build` 后浏览器打开 `?survivor&smoke=1`：SurvivorSmoke 用脚本输入跑 30 秒，断言无异常、节点数与 DrawCall 在预算内。
- `npm run cocos:build:wechat`：检查 package-report.json 分包体积。
- 微信开发者工具与真机：`?perf=1` 面板记录 200 敌人场景帧率，写入测试报告。表现层的合批、触摸手感、音效只能人工验证。

## 14. 关键技术风险

| # | 风险 | 影响 | 应对 |
|---|---|---|---|
| T1 | Cocos 2D 在低端机上数百个 Sprite 节点的 JS 侧变换与组装开销超预算 | 低端机 < 30 fps | 视口剔除 + 节点池小于逻辑池；M1 第二周先做“200 敌人空跑”性能样板上真机，不达标则依次：降节点池上限、孢子合批成少量大孢子、GDD 下调同屏上限（策划假设 4） |
| T2 | 合批被打断（Label 夹在 Sprite 层之间、混合模式、多图集） | DrawCall 超 25 | 单图集、固定层级、HUD 独立在最上层；性能面板常驻 DrawCall 数，超标作为缺陷 |
| T3 | resources 分包接近 4 MiB、新素材放错位置 | 构建失败 | 新素材只进 survivor 分包；package-wechat 已有单分包上限检查 |
| T4 | 小旅人只有侧视帧（R6），M1 借用 2048² 旧图集 | 纹理内存 16 MB、俯视不自然 | M1 接受；M2 用 scripts/microforest/pack-art.mjs 的方式把所需帧重打进 survivor 图集，旧图集不再加载 |
| T5 | GC 卡顿（热路径分配） | 周期性掉帧 | 预分配池、复用查询缓冲与事件对象；perf 测试检查堆增长；代码审查清单列出禁用写法 |
| T6 | 跨 JS 引擎浮点差异 | 云端回放复核分叉 | MVP 不依赖；MVP 后用容差比对，必要时改查表三角函数 |
| T7 | 工作区 718 条未提交改动与新开发混杂（R1） | 无法审查与回滚 | M1 开工前由用户决定处理方式；新玩法在新分支开发，每任务一个提交 |
| T8 | 改动对接文件（sync-shared、package-wechat、两条测试）误伤旧玩法构建 | 旧入口不可用 | 只做追加式修改；改后跑 `npm test` 与 `npm run cocos:build:wechat` 全量对比 |
| T9 | 设计分辨率切换（720 ↔ 375）在视图切换时残留 | 其它视图布局错乱 | SurvivorView.destroy 恢复；仅在浏览器调试切换入口时会发生，正式版只有一个入口 |

## 15. M1 实施顺序建议（供项目经理拆任务）

1. sync-shared 白名单与入口、forest-cleanup 断言、npm 脚本（一个提交）。
2. SurvivorRandom、Pool、SpatialGrid、SimClock + 测试。
3. data/ 模块（S1 范围：gnat、beetle、spore_shot、umbrella_blades、dew_ring、0–3 分钟波次）+ validate + 数据测试。
4. Stats、Spawner、Enemies、Weapons、Projectiles、Pickups、Progression、SurvivorRun + 测试与确定性测试。
5. survivor 分包目录与 package-wechat 名单、占位图集。
6. SurvivorView/BattleArt/Input/Hud/Platform，PinePilot 增加 survivor 分支。
7. 性能样板（200 敌人空跑）上真机，结果决定 T1 是否触发预案。
8. SurvivorSave、Meta、结算页（S3 才需要局外成长，M1 只做失败结算，存档模块可提前完成单测）。

## 16. 评审回应

针对 06-design-review.md，架构侧已按项目经理裁决（00 §8）修订：H4/D3（存档补 vibration/reduceFlash 字段，§5.2）、H5/D4（写失败提示，§5.4 本就一致，02 已对齐）、H6/D6（战斗层单图集 survivor-battle，§6.2/§7.3）、H7/D7（§3.1 summary 加 killer、§3.7 加 levelUpOffer/levelUpPick 事件、§2 预留 AnalyticsService.js）、M3/D11（刷怪半径公式，§1-2 本就一致，01 已同步）、M6/D13（存档接口去掉 removeItem，§5.1）、M7/D14（package-wechat 名单探测式生成，§7.5）、M8/D15（M3 剔除清单以 grep 为准 + PinePilot 调试分支，§9）、M11/D18（SafeArea.js 纯函数，§2/§6.1）、M9/D16（合规扫描对象与词表指向 04 §7.1，§12）、L4（玩家弹体不与 mistBubbles 碰撞，§3.4）。
