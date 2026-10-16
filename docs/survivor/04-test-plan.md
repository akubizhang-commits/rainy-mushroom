# 雨后菌语 · 测试计划（测试工程师）

版本 v0.2 · 阶段 M1 / Sprint 1（T13 补齐 §3–§9，裁决 D8）· 依据：00-project-plan.md、01-gdd.md、02-ui-ux.md、03-architecture.md、05-operations.md、07-sprint-1-backlog.md
本文定义新玩法的测试分层、用例清单、性能与包体方案、兼容与合规检查、缺陷分级和每个 Sprint 的验收门槛。阈值一律引用上游文档，上游改数值时本文同步改。

## 0. 概述

测试以“逻辑层可自动化、表现层少量人工”为原则。03 把全部规则放进引擎无关、可确定性复现的 `js/survivor/`，因此绝大部分功能用例落在 `node --test`：纯函数单测覆盖公式与规则，固定种子的整局回放覆盖系统协作，自动对局机器人覆盖数值平衡与长局稳定性。Cocos 表现层只用构建冒烟脚本（`?survivor&smoke=1`）和真机手测验证渲染、触摸、音效、安全区与帧率。所有自动化测试沿用仓库现有风格：`node:test` + `node:assert/strict`，文件名 `tests/survivor-*.test.mjs`，不引入新测试框架，不依赖网络。

## 1. 上游文档对齐问题（M0 已裁定，用例按裁决口径写）

原调研发现的不一致已由项目经理在 00 §8 逐条裁定，各上游文档已同步。用例一律按“裁决口径”列写，不再有“暂定”。

| # | 涉及 | 裁决口径（最终） | 裁决 |
|---|---|---|---|
| Q1 | 02 §4.5/§6 vs 03 §5.2 | 设置三项（sound/vibration/reduceFlash）都要持久化；schema 1 已含 `vibration`(默认开)、`reduceFlash`(默认关)，无需迁移 | D3（已关闭） |
| Q2 | 02 §4.5 vs 03 §5.4 | 写存档失败提示“存档写不进去，本次进度不会保存”，设置页同样适用；02 已同步 | D4（已关闭） |
| Q3 | 02 §8.2 vs 03 §6.2/§7.3 | 分包按 03 的 survivor；战斗层动态 Sprite 必须来自单张 `survivor-battle`（actors+fx 合并），scenery/ui 独立；DrawCall ≤ 25，超标记缺陷 | D6（已关闭） |
| Q4 | 02 §10 vs 03 §2 | 采纳 02：安全区抽 `js/survivor/SafeArea.js` 纯函数，加 `survivor-safearea.test.mjs` 覆盖默认值与刘海机型 | D18（已关闭） |
| Q5 | 00 §5 vs 03 §7.1 | M1 用 00 口径（开发者工具 ≥ 50 fps、中端真机 ≥ 30 fps）；P50 ≥ 55 fps 为 M2 口径 | D5（已关闭） |
| Q6 | 01 §13.3 vs 03 §5 | 自研 SurvivorSave（不复用 StorageService）；注入接口只用 `{getItem,setItem}` | D13（已关闭） |
| Q7 | 02 §7 vs 03 §12 | 扫描对象 = data/strings.js + 表现层中文 UI 字面量；词表取并集，“死亡/血/尸”仅限面向玩家文案，资源帧名/字段名/日志不扫（详见 §7.1） | D16（已关闭） |

## 2. 测试分层

| 层 | 工具与命令 | 覆盖 | 运行时机 | 时长目标 |
|---|---|---|---|---|
| L1 纯逻辑单元测试 | `npm run survivor:test`（`node --test tests/survivor-*.test.mjs`） | 每个逻辑模块、数据校验、存档、文案合规、源码禁用 API 扫描 | 每次提交前；`npm test` 自动包含 | ≤ 20 秒 |
| L2 确定性回放测试 | `tests/survivor-determinism.test.mjs`、`tests/survivor-replay.test.mjs` | 固定种子 + 固定输入脚本跑完整一局，断言 summary 与逐秒状态哈希 | 同 L1 | ≤ 15 秒 |
| L3 自动对局平衡测试 | 快速：`tests/survivor-bot.test.mjs`；完整：`npm run survivor:balance` | 机器人多种子统计：时长、通关率、等级曲线、Boss 战时长、长局无异常 | 快速档每次提交；完整档每 Sprint 至少一次、每次改数值后 | 快速 ≤ 30 秒；完整 ≤ 10 分钟 |
| L4 性能基线 | `npm run survivor:bench`、`tests/survivor-perf.test.mjs` | 满载单步耗时、热路径分配、8 分钟局堆增长 | 每 Sprint；改动热路径时 | ≤ 60 秒 |
| L5 Cocos 构建冒烟 | `npm run cocos:sync` → `npm run cocos:build` → 浏览器 `?survivor&smoke=1`；`npm run cocos:build:wechat` + package-report.json | 构建通过、无运行时异常、节点数与 DrawCall、分包体积 | 每 Sprint 提测；改表现层或资源时 | ≤ 10 分钟 |
| L6 真机手测 | 微信开发者工具 + 真机（§5.3 档位），`perf=1` 启动参数 | 触摸手感、安全区、帧率、内存、音效、切后台、合规截图 | 每 Sprint 提测；M3 全量 | 每档机型约 1 小时 |

### 2.1 L1 单元测试约定

- 一个模块一个测试文件，清单与 03 §13 一致（data、pool、grid、stats、weapons、enemies、spawner、progression、pickups、run、meta、save、determinism、compliance、sync、perf、bot），另加 `survivor-joystick.test.mjs`、`survivor-replay.test.mjs`、`survivor-safearea.test.mjs`（裁决 D18 已采纳）。
- 只构造被测系统需要的 `world` 片段，不跑整局。时间相关断言用 `run.step()` 逐步推进，不用真实计时。
- 存档测试用内存 Map 实现 `{getItem,setItem}`（裁决 D13：SurvivorSave 不依赖 removeItem），可注入“抛异常”的版本。
- 数值断言引用 `data/*.js` 与 GDD 表格两份来源做对照（`survivor-data.test.mjs`），其它测试只引用数据模块，避免改一次数值要改十处测试。
- 统计型断言（刷怪组成、掉落概率）固定种子 + 宽容差（如组成百分比 ±5 个百分点、样本 ≥ 2000），不做“随机种子下偶尔失败”的测试。
- 现有基线：`tests/forest-cleanup.test.mjs` 已失败（03 §1-5），测试报告单列为基线，新改动不得增加失败用例数。

### 2.2 L2 确定性回放测试

目的：整局层面的回归保护，任何未声明的规则或数值变化都会被发现。

1. 输入脚本：`tests/fixtures/survivor/inputs-*.mjs`，描述为“步号区间 → 摇杆向量”与“第 n 次升级 → 选卡下标”的分段表，由 `SurvivorBot` 的确定性策略生成后固化，不依赖机器人的后续改动。
2. 用例组：

| 用例 | 种子 | 输入 | 断言 |
|---|---|---|---|
| R1 站桩 | `replay-idle` | 全程 (0,0)，总选第 0 张 | 结果 lost；summary 与金标准完全相等 |
| R2 绕圈 | `replay-kite` | 半径约 200 的圆周移动 | summary 相等；第 60/180/300 秒的状态哈希相等 |
| R3 完整通关 | `replay-win` | 机器人通关局的固化输入（S2 起） | outcome won、bossDefeated true、survivalSec ∈ [420, 600] 且与金标准相等 |
| R4 暂停穿插 | `replay-kite` | 同 R2，在第 30、120 秒 pause/resume，levelup 中 pause/resume | 与 R2 结果完全相同（暂停不影响模拟） |
| R5 帧率无关 | `replay-kite` | 同一输入，分别用 advance(1/60)、advance(1/30)、advance 随机 0–0.083 喂入 | 三者 summary 与状态哈希相同（输入按步而非按帧施加） |
| R6 双次运行 | 任意 3 个种子 | 同输入运行两次 | 逐步完全一致 |

3. 状态哈希：对 `time`、玩家位置与生命、每个活跃敌人 `kind/x/y/hp`（按池稠密表顺序）、孢子总经验、等级、武器档位做 FNV-1a，坐标先乘 1000 取整再入哈希。
4. 金标准文件 `tests/fixtures/survivor/golden.json`。数值或规则有意变更时，开发运行 `node scripts/survivor/update-golden.mjs` 重新生成，提交说明必须写明原因并附 01 的对应改动；测试工程师审查时把金标准 diff 当作需求变更核对。无对应文档改动的金标准变更一律退回。
5. 源码扫描：js/survivor/（不含 SurvivorBot.js 以外的测试工具）中不得出现 `Math.random`、`Date.now`、`performance.now`、`new Date`、`from 'cc'`、`wx.`（03 §3.3、§12）。

### 2.3 L3 自动化 bot 平衡测试

机器人策略（SurvivorBot，不进构建，03 §2.1）：

| 策略 | 移动 | 选卡 | 代表玩家 |
|---|---|---|---|
| idle | 不动 | 第 0 张 | 挂机/新手下限 |
| kite | 远离最近敌群质心，绕圈 | 优先已有武器升级 | 普通玩家 |
| greedy | kite + 主动靠近孢子 | 进化 > 武器升级 > 新武器 > 被动 | 熟练玩家 |
| random | 每 0.5 秒随机方向 | 随机 | 混乱输入，查异常 |

完整档 `survivor:balance` 每种策略 200 个种子（`balance-0`…`balance-199`），无永久强化与满永久强化各跑一遍，输出 `tmp/survivor-balance-*.json`。判定线：

| 指标 | 阈值 | 来源 |
|---|---|---|
| kite 无强化通关率 | 30%–60% | 00 M2 验收（首局通关率） |
| kite 平均单局时长 | 6–9 分钟 | 00 M2 验收 |
| greedy 满强化通关率 | ≥ 90% | 01 §13.2“失败玩家也能逐步变强通关” |
| idle 无强化存活 | ≥ 60 秒（不得开局即死），且不通关 | 01 §15.4 |
| greedy 等级节点 | 1:00 达 Lv5–6、3:00 达 12–14、5:00 达 18–20、7:00 达 24–26，中位数落在区间 | 01 §8.4 |
| Boss 战时长（greedy，Boss 出现到击败） | 中位数 40–60 秒 | 01 §15.3 |
| 首次升级时间 | 中位数 15–30 秒 | 01 §3 |
| random 策略 | 200 局无异常、无 NaN、实体数从不超过池容量 | 03 §12 |
| 所有局 | `diag.dropped.shots` 等计数写入报告；`droppedTime` 必须为 0（Node 下不应丢步） | 03 §3.2 |

阈值未达标不是代码缺陷，而是数值问题：报告给策划，按 01 规则先改文档再改数据。快速档（`survivor-bot.test.mjs`）只跑 3 个种子 × kite/random，断言跑完不抛错、状态最终为终态、实体数不超容量、`summary` 字段齐全且为有限数。

### 2.4 L5 Cocos 构建冒烟

1. `npm run cocos:sync`：断言 `shared/js/survivor/` 文件齐全、manifest sha256 一致、SurvivorBot.js 不在 manifest（`survivor-sync.test.mjs`）。
2. `npm run cocos:build`（web-mobile），浏览器打开 `?survivor&smoke=1`：SurvivorSmoke 脚本输入跑 30 秒，并用调试钩子把时间快进到 6:40 满屏场景再跑 10 秒。断言：控制台无 error、无未捕获异常；战斗层激活节点数 ≤ 600；DrawCall ≤ 25；`run.state` 推进正常；离开视图后设计分辨率恢复 375×812。
3. `npm run cocos:build:wechat`：构建成功，package-report.json 满足 §6。
4. 旧玩法回归：`npm test` 全量（旧测试失败数不增加）、`npm run cocos:test`、默认入口仍为 PackView（M3 切换前）。

### 2.5 L6 真机手测

每次提测在微信开发者工具和至少 1 台安卓 + 1 台 iOS 真机执行 §4 中标为“手测”的用例与 §5 性能场景。开发者工具“自定义编译条件”设启动参数 `survivor=1&perf=1`。记录机型、微信版本、基础库版本、系统版本，截图与录屏存入当 Sprint 测试报告。

## 3. 测试环境与数据夹具

### 3.1 环境

| 环境 | 版本 / 配置 | 用途 |
|---|---|---|
| Node.js | ≥ 18（`node:test` 内置）；当前开发机 v22 | L1–L4 |
| Cocos Creator | 3.8.8（与 `cocos-pilot` 工程一致） | L5 构建 |
| 浏览器 | Chrome 稳定版，web-mobile 构建，`?survivor&smoke=1` | L5 冒烟 |
| 微信开发者工具 | 稳定版，Mac；启动参数 `survivor=1&perf=1`；基础库版本记入报告 | L5 构建产物检查、L6 |
| 真机 | §5.3 档位，每档至少 1 台 | L6 |

- 所有自动化测试离线可跑，不读写仓库外路径；临时输出只写 `tmp/`（已在 .gitignore 范围内的目录），测试结束不留文件。
- 测试报告记录：提交号、Node 版本、Cocos 版本、微信版本与基础库版本、机型与系统版本。

### 3.2 数据夹具

| 夹具 | 形态 | 使用方 | S1 状态 |
|---|---|---|---|
| 内存存储桩 | `Map` 实现的 `{getItem,setItem}`，只有这两个方法（D13）；可选“getItem 抛异常”“setItem 抛异常”“setItem 前 n 次失败”三种变体 | survivor-save、survivor-meta | 已在测试文件内联实现 |
| 迁移 / 损坏存档样本 | schema 0 记录、坏 JSON、校验和不符、schema 版本高于当前的记录 | survivor-save | 内联 |
| 种子命名 | 字符串种子，按用途前缀：`unit-*`（单测）、`replay-*`（L2）、`balance-0…199`（L3）、`smoke-*`（L5） | 全部 | 单测与确定性测试已用 |
| world 片段构造 | 测试内小工厂：只造被测系统需要的玩家/敌人/弹体字段（§2.1） | weapons、spawner、grid、run | 内联 |
| 视口样本 | 720×1280（基准）、720×1560（长屏）、720×960（短屏）、越界值（0、负数、NaN） | run、spawner | run 已覆盖越界钳制 |
| 安全区样本 | 缺 windowInfo/capsule（开发者工具/浏览器）、普通机型 375×667、刘海机型 390×844 + 手势条、左右缺口机型、非有限字段 | survivor-safearea | 内联 |
| 输入脚本 | `tests/fixtures/survivor/inputs-*.mjs`（§2.2） | L2 replay | S2 建立 |
| 金标准 | `tests/fixtures/survivor/golden.json`（§2.2） | L2 replay | S2 建立；S1 由 determinism 的“两次运行一致”兜底 |

夹具原则：数值一律从 `js/survivor/data/*.js` 读取，测试内不硬编码第二份（`survivor-data.test.mjs` 除外，它负责与 01 表格对照）；夹具文件不得放进 `js/survivor/`，避免被 sync-shared 带进构建。

## 4. 用例清单（S1 范围，按模块）

状态列：✅ = 已有自动化用例且通过（以 reports/sprint-1-logic-verification.md 与当前 `npm run survivor:test` 为准）；手测 = L6 人工执行；S2/S3 = 不在 S1 范围，到对应 Sprint 补。用例 ID 供测试报告与缺陷单引用。

### 4.1 基础设施

| ID | 文件 | 用例 | 依据 | 状态 |
|---|---|---|---|---|
| POOL-01 | survivor-pool | 预分配 capacity 个对象，槽位稳定 | 03 §3.5 | ✅ |
| POOL-02 | survivor-pool | acquire 进稠密表并以 uid 调 reset；池满返回 null | 03 §3.5 | ✅ |
| POOL-03 | survivor-pool | release 交换删除（末尾对象移入空位）；空槽可复用、满容量可用 | 03 §3.5 | ✅ |
| POOL-04 | survivor-pool | uid 在 acquire/release 往复中永不重复；releaseAll 恢复满容量 | 03 §3.5 | ✅ |
| RNG-01 | survivor-pool | SurvivorRandom 同种子同序列、异种子发散、range ∈ [min,max)、chance 确定、derive 子流独立可复现 | 03 §3.3 | ✅ |
| GRID-01 | survivor-grid | 500 组随机场景 queryCircle 与暴力全量结果完全一致 | 03 §13 | ✅ |
| GRID-02 | survivor-grid | 大半径实体进 large 列表；窗口外实体钳到边缘格仍可查到；空网格无候选；每步重建反映移动 | 03 §3.6 | ✅ |
| CLOCK-01 | survivor-run / determinism | SimClock 固定步长、单帧最多 5 步、非有限或负 frameDt 按 0（经 run.advance 间接覆盖） | 03 §3.2 | ✅（间接） |

### 4.2 数据

| ID | 文件 | 用例 | 依据 | 状态 |
|---|---|---|---|---|
| DATA-01 | survivor-data | validate() 对发布数据返回空数组；数据模块已冻结；JSON 往返无损 | 03 §4 | ✅ |
| DATA-02 | survivor-data | spore_shot 五档与 01 §6.1 逐项一致 | 01 §6.1 | ✅ |
| DATA-03 | survivor-data | gnat/beetle 生命/移速/伤害/经验/半径与 01 §9 一致，含 §9.1 成长系数 | 01 §9 | ✅ |
| DATA-04 | survivor-data | 波次段从 0 开始首尾相接；组成和为 100 且引用已知敌人；同屏上限 ≤ limits 硬上限 | 01 §10 | ✅ |
| DATA-05 | survivor-data | `waves.winAtSeconds` = 180（D4） | 00 §8 D4、07 §1 | ✅ |

### 4.3 战斗系统

| ID | 文件 | 用例 | 依据 | 状态 |
|---|---|---|---|---|
| STAT-01 | survivor-stats | 无加成时基础属性等于 player 数据 | 01 §15.1 | ✅ |
| STAT-02 | survivor-stats | might、移速、拾取半径、范围、回复的乘法/加法公式 | 01 §15.1 | ✅ |
| STAT-03 | survivor-stats | 冷却倍率下限 0.5；actualDamage 四舍五入且最小 1 | 01 §15.1 | ✅ |
| STAT-04 | survivor-stats | 敌人生命/伤害按分钟成长；非有限加成按 0（不漏 NaN） | 01 §9.1 | ✅ |
| WPN-01 | survivor-weapons | nearestEnemy 取最近存活敌人，距离相同按活跃顺序 | 01 §6.1 | ✅ |
| WPN-02 | survivor-weapons | 无目标不进冷却；Lv1 一发瞄准最近敌人并进入冷却；冷却未到不再开火 | 01 §6.1 | ✅ |
| WPN-03 | survivor-weapons | 扇形以基准角居中，发数与扇角随等级增长 | 01 §6.1 | ✅ |
| WPN-04 | survivor-weapons | 单发穿透数精确；同一弹体不重复命中同一敌人 | 01 §6.1、03 §3.4 | ✅ |
| SPN-01 | survivor-spawner | 刷怪半径 = hypot(viewW/2, viewH/2) + 60；重定位距离 = max(900, 半径 + 120) | 03 §1-2 | ✅ |
| SPN-02 | survivor-spawner | segmentAt 返回覆盖段、越界返回 null；组成按权重（固定种子、±5 个百分点） | 01 §10 | ✅ |
| SPN-03 | survivor-spawner | 第一段生成数 ≈ 速率 × 秒数；常规生成全部落在视口外；同屏上限从不超出；漂远敌人被移回刷怪圈 | 01 §10、03 §1-2 | ✅ |
| ENM-01 | survivor-enemies | 直线追踪 + 分离：不叠成一点、不穿过角色 | 01 §18 第 3 条 | S2（S1 由 run/determinism 间接覆盖） |
| PCK-01 | survivor-pickups | 孢子掉落、吸附、合并与外观档 | 01 §8 | S2（S1 由 run 升级路径间接覆盖） |

### 4.4 成长与整局

| ID | 文件 | 用例 | 依据 | 状态 |
|---|---|---|---|---|
| PRG-01 | survivor-progression | xpToNext 与 01 §15.2 样表一致，L1–30 符合 floor(5 + 6(L−1) + 0.15(L−1)²)；Lv25 累计经验与表一致 | 01 §15.2 | ✅ |
| PRG-02 | survivor-progression | 跨一个阈值升一级；大额经验连跨多级入队 | 01 §8 | ✅ |
| PRG-03 | survivor-progression | draftOffer 恒 3 张；首升保底武器升级；武器可升级时必出升级卡；满级后用兜底卡补足 3 张；同种子同参数结果确定 | 01 §8.2 | ✅ |
| RUN-01 | survivor-run | 构造参数校验 seed/viewport，视口钳到合法区间；开局 playing、带 1 把 spore_shot Lv1 | 03 §3.1、§11 | ✅ |
| RUN-02 | survivor-run | setInput 归一化超长向量、忽略非有限值；玩家按输入与移速移动；advance 只在 playing 推进并返回步数 | 03 §3.1 | ✅ |
| RUN-03 | survivor-run | playing ↔ paused 往返冻结模拟；abandon 仅 paused 可用并转 lost | 03 §3.1 | ✅ |
| RUN-04 | survivor-run | levelup 冻结模拟，choose() 推进队列，多次升级依次弹出；选升级卡后武器等级 +1 | 01 §8.2 | ✅ |
| RUN-05 | survivor-run | hp 归零转 lost 并记录 killer；存活到 winAtSeconds 转 won 且无 killer | 07 §1、03 §3.1 | ✅ |
| RUN-06 | survivor-run | summary 含净化数与露晶卡；drainEvents 返回并清空事件队列 | 03 §3.1、§3.7 | ✅ |
| DET-01 | survivor-determinism | 同种子同输入 → summary 与逐秒状态哈希一致；长局（到计时胜利）同样可复现 | 03 §3.3 | ✅ |
| DET-02 | survivor-determinism | 不同种子轨迹不同 | 03 §3.3 | ✅ |
| DET-03 | survivor-determinism | 源码禁用 API 扫描（§2.2 第 5 条） | 03 §3.3、§12 | ✅ |
| RPL-01 | survivor-replay | §2.2 的 R1–R6 | 03 §13 | S2（R1/R2/R4/R5/R6 可在 S2 第一批落；R3 依赖 Boss） |

### 4.5 输入与安全区

| ID | 文件 | 用例 | 依据 | 状态 |
|---|---|---|---|---|
| JOY-01 | survivor-joystick | 常量 = 死区 8 / 半径 60 | 01 §4 | ✅ |
| JOY-02 | survivor-joystick | 死区内归零；8–60 线性增强且方向为单位向量（含斜向）；超半径强度恒 1 | 01 §4、02 §5.1 | ✅ |
| JOY-03 | survivor-joystick | 底座靠边钳制；无安全区信息时只受屏幕与半径约束；resolve 先钳制再算偏移 | 02 §5.1 | ✅ |
| JOY-04 | survivor-joystick | 非有限坐标按 0，不产生 NaN | 03 §11 | ✅ |
| SAFE-01 | survivor-safearea | 默认值 safeTop 88 / safeBottom 34 / 左右 24；缺接口或字段非有限、windowWidth ≤ 0 时回退默认值不报错 | 02 §2.1、D18 | ✅ |
| SAFE-02 | survivor-safearea | 普通机型按 02 §2.1 公式算四边距；刘海机型 capsule.bottom 下移抬高 safeTop、手势条抬高 safeBottom，单调性成立；左右缺口增大左右边距 | 02 §2.1 | ✅ |

### 4.6 存档与局外

| ID | 文件 | 用例 | 依据 | 状态 |
|---|---|---|---|---|
| SAVE-01 | survivor-save | 存储桩只暴露 getItem/setItem；缺档 → schema 1 新档，settings 三项默认 sound 开 / vibration 开 / reduceFlash 关 | D3、D13 | ✅ |
| SAVE-02 | survivor-save | save → load 往返；信封 schema 1 校验和正确；写入顺序先备份后主档；内容未变跳过写入 | 03 §5 | ✅ |
| SAVE-03 | survivor-save | schema 0 迁移：原档写备份再写主档 | 03 §5.3 | ✅ |
| SAVE-04 | survivor-save | 主档坏（坏 JSON / 校验和）→ 从备份恢复，下次保存修复主档；主备都坏 → 原始主档存 `.corrupt`，主档覆盖为新档 | 03 §5.3 | ✅ |
| SAVE-05 | survivor-save | 版本更高 → locked，主档永不覆盖；getItem 抛异常 → locked | 03 §5.3 | ✅ |
| SAVE-06 | survivor-save | setItem 抛异常 → save() 返回 false、saved=false、只警告一次，之后成功可恢复 | 03 §5.4、D4 | ✅ |
| SAVE-07 | survivor-save | sanitize 钳制、取整、丢弃未知 id、坏布尔值回默认；读取结果已清洗 | 03 §5.2 | ✅ |
| META-01 | survivor-meta | 露晶公式对 01 §13.1 两个示例分别得 24、132；闪光卡 ×5、精英固定 5、小数向下取整、坏输入 → 0 | 01 §13.1 | ✅ |
| META-02 | survivor-meta | settle 累加露晶、局数/胜场、保留最佳生存时长，不改输入 | 01 §13 | ✅ |
| META-03 | survivor-meta | bonuses 映射到 Stats 加成字段；购买扣价、拒绝余额不足/满级/未知 id 且不改状态；全买 1570、重置全额退还 | 01 §13.2 | ✅ |
| SAVE-UI | 手测 | 存档接 UI：设置三项重启后保持；写失败提示“存档写不进去，本次进度不会保存” | 02 §10-8、D4 | S3（S1 不接 UI） |

### 4.7 合规、同步、构建

| ID | 文件 | 用例 | 依据 | 状态 |
|---|---|---|---|---|
| CMP-01 | survivor-compliance | strings.js 有可扫描文案；无食用组合；无暴力类词 | §7.1 | ✅ |
| CMP-02 | survivor-compliance | 结算与 HUD 计数统一“净化数”；失败统一“被浊雾笼罩” | §7.1 | ✅ |
| CMP-03 | survivor-compliance | S1 界面文案键齐全（HUD、三选一卡、结算、新手首条提示） | 07 T12 | ✅ |
| CMP-04 | survivor-data | 数据层文案也通过词表扫描 | §7.1 | ✅ |
| CMP-05 | 待建 | `Survivor*.ts` 中文 UI 字面量自动扫描 | §7.1 | S2 落自动化；S1 用 §7.1 的手工命令兜底 |
| SYNC-01 | forest-cleanup / cocos:sync | manifest 只允许 microforest/library/survivor 前缀；survivor 入口全部进 manifest | 03 §2.1 | ✅（forest-cleanup 另有 1 条基线失败，见 §2.1） |
| SYNC-02 | survivor-sync | 文件齐全、sha256 一致、SurvivorBot.js 不在 manifest | 03 §13 | S2（随 SurvivorBot 一起落） |
| PKG-01 | cocos-package | 有 survivor 分包 4 个、无则 3 个且不报错；每分包 ≤ 4 MiB | 03 §7.5、D14 | ✅ |
| LEG-01 | library-sync / cocos:test | 默认入口仍为 PackView（M3/T15 前）；旧测试失败数不增加 | 03 §2.2 | ✅ |
| PERF-01 | survivor-perf / survivor:bench | 满载单步 ≤ 2 ms（报告记实测，目标 ≤ 0.6 ms）、热路径 0 分配、8 分钟堆增长 ≤ 5 MB | 03 §7.2、§7.3 | S2（S1 的 bench/balance 脚本为占位，见 §9.1） |
| BOT-01 | survivor-bot / survivor:balance | §2.3 快速档与完整档 | §2.3 | S2 |

### 4.8 表现层与手测（S1）

| ID | 方式 | 用例 | 依据 |
|---|---|---|---|
| UI-01 | 冒烟 | `?survivor&smoke=1`：无 console.error / 未捕获异常；战斗层激活节点 ≤ 600；战斗帧 DrawCall ≤ 25；run.state 正常推进；离开后设计分辨率恢复 375×812 | §2.4、07 T10 |
| UI-02 | 手测 | 屏幕上 1/3 按下不出摇杆；下 2/3 任意处出摇杆，靠边时底座完整可见；第二根手指不改变移动 | 02 §10-3 |
| UI-03 | 手测 | 暂停、升级弹出时摇杆隐藏；恢复后不按屏幕角色不动 | 02 §10-4 |
| UI-04 | 手测 | 升级卡弹出 0.4 秒内点击无效，之后点整卡任意位置都能选中 | 02 §10-5 |
| UI-05 | 手测 | 计时 180 秒到 → 胜利结算；生命归零 → “被浊雾笼罩”结算；两路径都能回营地再开一局 | 07 §1 |
| UI-06 | 手测 | 切后台/来电/锁屏自动暂停，回前台停在暂停页（三选一中切后台则仍停在原三张卡，不重抽），不补跑后台时间、角色不瞬移 | 01 §4、§12；02 §3；03 §3.1 状态表、§6.1 |
| UI-07 | 手测 | HUD 与按钮在安全区内、不与胶囊重叠（按 §5.4 流程） | 02 §10-1 |
| UI-08 | 截图评审 | 0:30 场景截图在红绿色盲、全色盲模拟下能区分自己 / 敌人 / 孢子（S1 范围内的对象） | 02 §10-6、07 T8 |
| UI-09 | 手测 | 开启减弱闪烁时受击不闪白、净化光点减半；关闭震动后不调用 `wx.vibrateShort` | 02 §10-7（S1 若无设置页 UI，则用默认值验证并在 S3 复测） |

## 5. 性能测试

### 5.1 场景

| ID | 场景 | 构造方式 | 关注指标 | 首次要求 |
|---|---|---|---|---|
| PF-1 | 开局 0:00–0:30 | 正常开局，摇杆绕圈 | 首帧耗时、分包加载期间营地页可交互 | S1 |
| PF-2 | 满载同屏 | 调试钩子快进到 6:40，或 smoke 的 FILL=200 填满敌人，持续 60 秒 | FPS P50/P95、帧耗时 P95、DrawCall、战斗层节点数、`diag.dropped` | S1（200 敌人） |
| PF-3 | 升级弹窗与暂停 | 满载时触发三选一、暂停/继续各 5 次 | 模态帧 DrawCall（单独记录，不计入战斗帧 ≤ 25）、恢复后首帧不补跑 | S1 |
| PF-4 | 长局稳定 | 完整一局约 8 分钟（S1 为 180 秒计时局连开 3 局） | JS 堆、纹理内存、堆增长 | S1 记录；S2 起卡线 |
| PF-5 | 切后台恢复 | 满载时切后台 30 秒再回来 | 无卡死、无补跑、帧率恢复 | S1 |
| PF-6 | 自动降档 | 中低端机满载 | P50 > 20 ms 时切 30 fps 档，一局只降不升（03 §7.4） | S2（S1 不做自动降档） |

### 5.2 采集与阈值

- 采集：开发者工具与真机都用 `perf=1`，读取 SurvivorPerf 面板的 FPS P50/P95、步耗时、各池计数、`diag.dropped`、DrawCall；每个场景至少采 30 秒稳定段，录屏留档。Node 侧用 `npm run survivor:bench`（S2 实现后）。
- 阈值（D5 分阶段口径，来自 00 §5 与 03 §7）：

| 指标 | M1 / S1 | M2 / S2–S3 | 来源 |
|---|---|---|---|
| 开发者工具 200 敌人同屏 | ≥ 50 fps | ≥ 50 fps | 00 §5 M1 |
| 中端真机 200 敌人同屏 | ≥ 30 fps（M1 目标值，未达记 MEDIUM，不作 S1 门槛） | P50 ≥ 55 fps、P95 帧耗时 ≤ 25 ms（验收线） | 00 §5、03 §7.1 |
| 中低端真机 | 记录，不卡线 | 降到 30 fps 档后 P95 ≤ 40 ms | 03 §7.1 |
| iOS（iPhone XR 及以上） | ≥ 30 fps | 同中端 | 03 §7.1 |
| 战斗层 DrawCall | ≤ 25 | ≤ 25（目标 15–20） | 03 §7.3、D6 |
| 战斗层激活节点 | ≤ 600 | ≤ 600 | 03 §7.3 |
| JS 堆 | 记录 | 战斗中 ≤ 50 MB；8 分钟堆增长 ≤ 5 MB | 03 §7.3 |
| 纹理内存 | 记录（M1 暂用 microforest-motion 约 16 MB） | ≤ 32 MB | 03 §7.3 |
| Node 满载单步 | — | 断言 ≤ 2 ms，报告记实测（目标 ≤ 0.6 ms） | 03 §7.2 |

未达当期验收线按 §8 记 HIGH；只差“目标值”（如 DrawCall 在 21–25 之间）记 LOW 并进复盘。真机不达标时按 01 §18 第 4 条先降同屏上限，不删敌人种类。

### 5.3 机型档位

| 档位 | 参考机型 | 每 Sprint 要求 | M3 要求 |
|---|---|---|---|
| T0 开发者工具 | 微信开发者工具（Mac） | 必测 | 必测 |
| T1 中端安卓 | 骁龙 778G / 天玑 8100 级，6 GB | 至少 1 台 | 至少 2 台（不同厂商） |
| T2 中低端安卓 | 骁龙 680 / 天玑 700 级，4 GB | S1 可选，S2 起必测 | 至少 1 台 |
| T3 iOS | iPhone XR 及以上（含刘海机型） | 至少 1 台 | 至少 2 台（含 1 台 Home 键机型若可得） |

手头没有对应档位机型时，在报告里写明实际机型与差异，不得把高档机结果当作低档机结论。

### 5.4 安全区手测流程

1. 开发者工具依次模拟 375×667、390×844、414×896 与 iPhone X 系列（刘海 + 手势条），真机至少 1 台刘海机型（02 §10-1）。
2. 进入 `?survivor`（开发者工具用启动参数 `survivor=1`），打开 debug 热区框绘制，截取营地页、战斗 HUD、暂停页、三选一、结算页五张图。
3. 逐图检查：所有 HUD 元素在 safeTop 以下、safeBottom 以上；右上胶囊区无可点元素，暂停按钮在胶囊下方（01 §4、D12）；可点热区 ≥ 88×88u、相邻间距 ≥ 16u（02 §10-2）；世界画面仍铺满刘海和手势条后方。
4. 靠左、右、下边缘各按下一次，确认摇杆底座完整可见（JOY-03 的真机复核）。
5. 旋转或调整窗口触发 `canvas-resize`，确认安全区重算、布局不错位；`game.json` 的 `deviceOrientation` 为 `portrait`。
6. 记录：机型、windowInfo、capsule 原始值与 SafeArea.js 输出四边距；与 SAFE-02 公式结果不一致记 MEDIUM，元素被遮挡或不可点记 HIGH。

## 6. 包体方案与阈值

以 `npm run cocos:build:wechat` 生成的 `cocos-pilot/package-report.json` 为唯一数据源（字节，1 MiB = 1048576）。

| 项 | 硬上限（构建脚本已检查） | M1 / S1 目标 | M2 目标 | M3 目标 | 当前快照 |
|---|---|---|---|---|---|
| 主包 mainBytes | < 4 MiB | ≤ 2 MiB | ≤ 2 MiB | ≤ 2 MiB | 1.64 MiB |
| 单个分包 | ≤ 4 MiB | 每个 ≤ 4 MiB | 同左 | 同左 | resources 3.04 MiB 最大 |
| survivor 分包 | ≤ 4 MiB | ≤ 2.5 MiB | ≤ 2.5 MiB（正式图集与音效后） | ≤ 2.5 MiB | 0.02 MiB |
| resources 分包 | ≤ 4 MiB | 不得增长（新素材不得放入） | 同左 | 随旧玩法移除 | 3.04 MiB |
| main 脚本分包 | ≤ 4 MiB | 记录 | 记录 | < 0.6 MiB | 1.91 MiB |
| 总包 totalBytes | ≤ 20 MiB | ≤ 20 MiB（预计约 9 MiB） | ≤ 20 MiB | ≤ 5 MiB（硬线仍为 20 MiB） | 6.76 MiB |

来源：00 §5 M3（主包 < 4 MB、总 < 20 MB）、03 §7.5。“当前快照”取 T10 提交时的 package-report.json，每次提测由 T14 等测试报告更新实测值。判定：超硬上限 = 构建失败 = HIGH；超当期目标但在硬上限内 = MEDIUM；resources 分包增长 = MEDIUM（违反 03 §7.5）。M3 裁剪 engine.json 模块时每裁一项跑一次 §2.4 冒烟。

## 7. 兼容与合规

### 7.1 合规扫描规则（锚点 B，裁决 D16；01 §2、02 §7、03 §12 均指向本节）

- 扫描对象：`js/survivor/data/strings.js` 全部中文文案 + `cocos-pilot/assets/scripts/Survivor*.ts` 中的中文 UI 字面量（面向玩家可见文案）。资源帧名、字段名、英文 id、`console` 日志不在扫描范围。
- 词表（面向玩家文案一旦命中即 HIGH 缺陷）：
  - 野生菌食用类：{吃, 食用, 采食, 美味} × {蘑菇, 菌}（组合命中）。
  - 暴力类并集：{击杀, 消灭, 屠杀, 死亡, 血, 尸}。
- 失败文案统一用“被浊雾笼罩”，结算统一“净化数”；回血文案只用露珠/露水/阳光，不与蘑菇/菌关联。
- 匹配口径：
  - 组合命中 = 同一条文案（strings.js 的一个字符串值，或 .ts 的一个字符串字面量）内同时含食用类动词与菌类名词，不要求相邻。
  - 暴力类为子串命中，任何面向玩家文案出现即命中（如“血量”也算，HUD 生命统一用“生命”）。
  - strings.js 只扫字符串取值，不扫键名与注释；.ts 只扫含中日韩字符的字符串字面量与模板字符串，跳过 `//`、`/* */` 注释与 `console.*(...)` 参数。
- 实现：
  - strings.js：`tests/survivor-compliance.test.mjs`（CMP-01–03，已落地）+ `survivor-data.test.mjs`（CMP-04）。
  - Survivor*.ts：S2 新增自动化用例（CMP-05）。在此之前，每次提测由测试在仓库根目录手工执行 `grep -nE '吃|食用|采食|美味|击杀|消灭|屠杀|死亡|血|尸' cocos-pilot/assets/scripts/Survivor*.ts`，逐条判定是否为面向玩家文案并写入测试报告；食用类命中再人工核对同一字面量是否含“蘑菇/菌”。
- 误报白名单：
  - 只允许豁免“非面向玩家文本却被扫描器误认”的条目，例如资源帧名或调试面板中的中文标签。面向玩家文案不得进白名单，只能改文案。
  - 白名单写在合规测试文件内的常量数组，每条形如 `{ file, text, word, reason }`，必须精确到原文，不得用通配；新增条目需测试与运营在提交说明中共同确认。
  - S1 白名单为空。
- 与提审清单对应：本节覆盖 05 §4.4 的 C2、C3；C1（无血腥）由 §4.8 截图评审与 M3 合规截图覆盖。

### 7.2 设备与平台兼容

| ID | 项 | 检查 | 首次要求 |
|---|---|---|---|
| CP-01 | 屏幕比例 | 720 宽 FIXED_WIDTH 下 16:9、19.5:9、20:9 均无黑边错位，HUD 按安全区布局（§5.4） | S1 |
| CP-02 | 方向 | `game.json` `deviceOrientation` = portrait；旧横屏 MicroForestView 不在默认入口 | S1 检查，M3 复核 |
| CP-03 | 平台 | 安卓 / iOS / 开发者工具三端可进 `survivor` 入口；基础库版本记入报告 | S1 |
| CP-04 | 分辨率恢复 | 离开 SurvivorView 后设计分辨率恢复 375×812，旧视图布局不受影响（M3 前） | S1 |
| CP-05 | 分包加载 | 弱网（开发者工具 Slow 3G）下 survivor 分包加载期间营地页可交互；加载失败有可重试提示、不白屏 | S2 |

### 7.3 生命周期与中断

| ID | 项 | 检查 | 首次要求 |
|---|---|---|---|
| LC-01 | 切后台 / 来电 / 锁屏 | 即 UI-06 | S1 |
| LC-02 | 进程被杀 | 本局作废、不发露晶，重进后存档完好（01 §12） | S3（存档接 UI 后） |
| LC-03 | 触点丢失 | TOUCH_CANCEL、切后台时摇杆向量归零，回来不自走（03 §6） | S1 |
| LC-04 | 多点触控 | 只跟踪第一个触点，第二指不影响移动（即 UI-02） | S1 |

### 7.4 存档兼容

| ID | 项 | 检查 | 首次要求 |
|---|---|---|---|
| SV-01 | 键隔离 | survivor 只读写 `survivor.v1.profile` 及其 `.backup` / `.corrupt`，不读写、不清除旧玩法存档键 | S1（单测 + 代码审查） |
| SV-02 | 存储写满 / 写失败 | 即 SAVE-06；接 UI 后显示 D4 提示文案 | S1 逻辑、S3 UI |
| SV-03 | 版本升级 | 新版本读取旧 schema 正常迁移；高版本存档被低版本读取时 locked 不覆盖 | S1 逻辑 |

### 7.5 无障碍与设置

| ID | 项 | 检查 | 首次要求 |
|---|---|---|---|
| AX-01 | 色盲可读性 | 即 UI-08；M2 起用 6:40 满屏截图，5 类对象 5/5 正确（02 §10-6） | S1（0:30）/ S2（6:40） |
| AX-02 | 减弱闪烁 / 震动 | 即 UI-09（02 §10-7） | S1 默认值 / S3 设置页 |
| AX-03 | 设置持久化 | 三项设置重启后保持（02 §10-8） | S3 |

### 7.6 提审合规（对应 05 §4）

| 05 条目 | 测试方式 | 首次要求 |
|---|---|---|
| C1 无血腥 | 全流程截图审查：敌人消散为光点/水汽，受伤为屏幕边缘晕影，无红色液体、碎块、尸体（02 §7） | S1 抽查，M3 全量 |
| C2 / C3 用词与图标 | 文案走 §7.1 扫描；回血图标只用水滴或阳光、蘑菇图形不出现在回血物上（01 §2 自查清单第 2 条）走截图审查 | S1 |
| C4 旧玩法不可达 | 提审包默认入口为 survivor；去掉 URL / 启动参数后无法进入旧玩法（T15 后） | M3 |
| C5 广告 | 激励视频只在点击后播放、文案含“观看视频”、无强制插屏 | M3（若接入） |
| C6 分享 | 分享文案无诱导、利诱 | M3 |
| C7 素材版权 | `npm run release:check` 通过 | M3 |
| A1–A4、S1–S4 | 启动页健康游戏忠告与适龄提示入口、首次启动隐私授权（02 §10-10）可测部分写手测用例；“待核实”项由运营给出核实结论后测试再复核 | M3 |
| P1–P6 | 平台与资质项不属于测试范围，由运营打勾；测试只核对包内显示名称为“雨后菌语” | M3 |

### 7.7 旧玩法回归（M3 / T15 前）

每次提测跑 `npm test` 全量与 `npm run cocos:test`：旧测试失败集合必须是基线的子集（当前基线只有 forest-cleanup 的 “retired runtime and resource bundles cannot reenter builds” 1 条）。T15 删除旧玩法后，基线随旧测试一并移除，之后 `npm test` 必须 0 失败。

## 8. 缺陷分级（锚点 A）

### 8.1 级别定义

| 级别 | 定义 | 处理 |
|---|---|---|
| HIGH | 崩溃、卡死、存档损坏/丢失、合规一票否决项（血腥/野生菌食用暗示/违规文案）、核心循环无法完成、性能跌破当前 Sprint 验收线 | 阻塞合入，必须修复后方可提测通过 |
| MEDIUM | 功能偏离文档但有可用路径、非核心数值越界、单机型表现问题、无障碍验收项未达成 | 本 Sprint 内修复；可先合入但记入复盘待办 |
| LOW/NIT | 文案笔误、占位素材瑕疵、不影响判定的视觉偏差 | 择机修复，不阻塞 |

### 8.2 判定示例

| 现象 | 级别 | 依据 |
|---|---|---|
| 未捕获异常、白屏、进不了战斗、三选一后无法继续 | HIGH | 崩溃 / 核心循环 |
| 同种子同输入结果不一致；逻辑层出现禁用 API | HIGH | 确定性是回放与平衡测试的前提（03 §3.3） |
| 存档读写导致进度丢失、主备档同时被覆盖、locked 状态仍被写入 | HIGH | 存档 |
| §7.1 词表命中面向玩家文案；出现红色液体或尸体表现 | HIGH | 合规一票否决 |
| 低于 §5.2 当期验收线（如 S1 开发者工具 < 50 fps）；DrawCall > 25；节点 > 600；包体超 §6 硬上限 | HIGH | 性能 / 包体 |
| survivor 测试新增失败，或旧测试失败数超过基线 | HIGH | §7.7 |
| HUD 被刘海/胶囊遮挡导致按钮不可点 | HIGH | 核心操作不可达 |
| 数值与 01 表格不一致但游戏可玩（如某档伤害写错） | MEDIUM | 功能偏离文档 |
| bot 平衡指标越出 §2.3 区间 | MEDIUM（转策划按数值问题处理，不记为代码缺陷） | §2.3 |
| 单一机型帧率或布局异常，其余档位正常 | MEDIUM | 单机型 |
| 包体超当期目标但在硬上限内；resources 分包增长 | MEDIUM | §6 |
| 安全区边距与公式不符但元素可见可点；色盲截图 5 类对象有误判 | MEDIUM | §5.4、02 §10 |
| DrawCall 在 21–25（超目标 15–20 但在上限内）；占位图形边缘串色；文案标点错误 | LOW/NIT | 不影响判定 |

### 8.3 规则

- 拿不准时就高不就低，由项目经理在复盘中裁定是否降级；降级理由写进缺陷单。
- 同一缺陷在两个 Sprint 都未修复，MEDIUM 自动升为 HIGH。
- 基线失败（§7.7）不计新缺陷，但测试报告必须单列。
- 缺陷单字段：ID、级别、用例 ID（§4）、复现步骤、种子与输入（逻辑层缺陷必填）、机型与版本（表现层缺陷必填）、截图/录屏、期望（附文档出处）、实际。
- 设计评审（06）的 HIGH/MEDIUM 计数用同一口径。

## 9. 各 Sprint 验收门槛

所有 Sprint 的通用门槛：无 HIGH 缺陷遗留；测试报告齐全（§3.1 的环境信息、§4 用例执行结果、§5 性能数据、§6 包体、§8 缺陷清单）；`npm test` 中 survivor 测试 0 失败、旧测试失败集合不超过基线；§7.1 合规扫描无命中。

### 9.1 S1 / M1：可玩竖切原型（锚点 C）

S1“可玩竖切原型”的验收门槛以 07-sprint-1-backlog.md 各任务的“验收标准”为准，并至少满足：
- `npm test`（含 `node --test tests/survivor-*.test.mjs`）全绿，旧测试失败数不超过基线（forest-cleanup 已失败，见 §2.1）。
- `npm run cocos:build:wechat` 构建成功，package-report.json 每分包 ≤ 4 MiB、总 ≤ 20 MiB。
- 浏览器 `?survivor&smoke=1` 冒烟无 error、无未捕获异常；战斗层节点 ≤ 600、DrawCall ≤ 25。
- 开发者工具 200 敌人同屏 ≥ 50 fps（D5 的 M1 口径）。
- 合规扫描（§7.1）对 S1 已有文案无 HIGH 命中。

补充说明（不新增门槛，只明确执行口径）：
- 功能范围按 07 §1：1 名角色、spore_shot Lv1–Lv5、gnat + beetle、升级三选一、180 秒计时胜利与生命归零失败双路径都进结算页（UI-05）。
- §4 中标 ✅ 的用例全部通过；§4.8 的手测用例执行并记录结果。标 S2/S3 的用例不计入 S1。
- 中端真机 ≥ 30 fps 是 00 §5 M1 的真机目标值，不在 07 §1 的门槛内：S1 报告必须记录实测值，未达标记 MEDIUM（§5.2），复盘时按 01 §18 第 4 条决定预案。
- `npm run survivor:bench` / `survivor:balance` 在 S1 是占位脚本，只验证“可执行不报错”；性能结论以 §5 的开发者工具与真机实测为准。
- Survivor*.ts 字面量扫描用 §7.1 的手工命令执行，结果写入报告。
- 测试报告按 07 T14 写入 `docs/survivor/reports/`。

### 9.2 S2 / M2 前半：内容齐全、完整通关

- 01 §16 S2 范围全部落地：5 种普通敌人 + 精英 + Boss、撤离胜利、全部武器与 6 被动、5 组进化、拾取物、完整波次表；计时胜利降级为调试开关或移除（07 §1）。
- 补齐 §4 标 S2 的自动化用例：survivor-enemies、survivor-pickups、survivor-replay（R1–R6，含 R3 通关回放）、survivor-sync、survivor-perf、survivor-bot 快速档，以及 CMP-05 的 Survivor*.ts 自动扫描。
- `survivor:balance` 完整档跑通并出报告：random 策略 200 局无异常、`droppedTime` 为 0；kite/greedy 指标出初值（S2 不卡区间，越界转策划）。
- 性能：中端真机 200 敌人 P50 ≥ 55 fps、P95 帧耗时 ≤ 25 ms；中低端真机降档后 P95 ≤ 40 ms；JS 堆与纹理内存符合 §5.2；Node 满载单步 ≤ 2 ms。
- 包体：survivor 分包 ≤ 2.5 MiB；其余同 §6。
- 色盲：6:40 满屏截图 5 类对象 5/5 正确（AX-01）。

### 9.3 S3 / M2 后半：局外成长、调参、正式素材

- 01 §16 S3 范围：局外成长与存档接 UI、新手提示、结算露晶、正式美术与音效。
- 存档 UI：SAVE-UI、LC-02、AX-02、AX-03 通过（三项设置重启后保持、写失败提示 D4 文案）。
- 平衡：§2.3 判定线全部落在区间内（kite 无强化通关率 30%–60%、平均时长 6–9 分钟、greedy 满强化通关率 ≥ 90% 等）。
- 00 §5 M2 验收：内部试玩 ≥ 5 人，平均一局 6–9 分钟，首局通关率 30–60%；真机性能达标（同 §9.2）。
- 正式素材替换后，同位置截图对象尺寸与 M1 占位相差 ≤ 10%（02 §10-11）。

### 9.4 M3：提审准备

- 新玩法为默认入口，旧玩法按 T15 删除后 `npm test` 0 失败；C4 旧玩法不可达。
- 包体：主包 < 4 MiB（目标 ≤ 2 MiB），总包 ≤ 20 MiB（目标 ≤ 5 MiB）。
- §5.3 M3 机型全部达标；§7 全部检查项通过；§7.6 中 05 §4 的可测项全部有用例且通过，待核实项均有运营核实结论。
- `npm run release:check` 通过；合规截图与内容介绍截图只含新玩法。
- 出 M3 测试报告，用户确认后才能提交审核（00：提审属于需用户确认的操作）。
