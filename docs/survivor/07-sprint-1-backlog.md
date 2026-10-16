# 雨后菌语 · Sprint 1 看板（项目经理）

版本 v0.1 · 阶段 M1 / Sprint 1 · 依据：00–06 全部文档（含 00 §8 评审裁决）
本文是 Sprint 1 的唯一任务依据。任务按依赖顺序排列，每项含编号、负责角色、描述、依赖、验收标准、预估（S/M/L）、涉及文件路径。

## 1. Sprint 目标

**可玩竖切原型（vertical slice）**：几何占位美术下，玩家能从开局玩到一局结束。范围锁定：

- 1 名角色（小旅人），虚拟摇杆移动，自动攻击。
- **1 种武器**：孢子弹 spore_shot（Lv1–Lv5，暂不做进化）。
- **2 种敌人**：蚊蚋群 gnat、圆壳甲虫 beetle（0–3 分钟波次段）。
- 升级三选一：拾取孢子 → 经验满 → 暂停弹 3 张卡 → 选择继续（S1 候选池只含 spore_shot 升级 + 兜底卡，武器/被动种类不全，走通机制即可）。
- **计时胜利 / 死亡结算**：本 Sprint 以“存活到计时目标即胜利”作为可玩闭环（例如 180 秒），生命归零即失败；双路径都进结算页。
  - 说明（与 01-gdd 的偏差，已裁决）：01-gdd 的正式胜利条件是“击败 Boss 并撤离”，Boss / 撤离属 S2 范围。S1 用“计时胜利”作为临时胜利判定，让原型有完整的开始—过程—结束闭环，便于验收与冒烟；S2 接入 Boss / cleansing / extract 后，计时胜利降级为调试开关或移除。此偏差仅影响 S1，不改变 01-gdd 的最终设计。
- 逻辑层 `js/survivor/` 纯 JS，`node --test` 覆盖本 Sprint 涉及的模块与规则。
- 能通过 `npm run cocos:build:wechat` 冒烟（构建成功、分包体积达标、浏览器 `?survivor&smoke=1` 无异常）。

不在 S1：灰蛾/蜗牛/菌灵/精英/Boss、其余 4 种武器、6 种被动、进化、撤离、局外成长与存档落地到 UI（存档模块可提前写单测但不接 UI）、正式美术与音效、性能自动降档（只做基础预算验证）。

验收口径对齐 00 §5 M1、04 锚点 C（04 §9 占位）：`npm test` 全绿（旧测试失败数不超过 forest-cleanup 基线）、`npm run cocos:build:wechat` 成功且每分包 ≤ 4 MiB / 总 ≤ 20 MiB、冒烟无 error、战斗层节点 ≤ 600 且 DrawCall ≤ 25、开发者工具 200 敌人同屏 ≥ 50fps（D5 的 M1 口径）、合规扫描无 HIGH 命中。

## 2. 任务表（按依赖顺序）

预估口径：S ≈ 0.5–1 人日，M ≈ 1–2 人日，L ≈ 3–4 人日。

### T1 · 确认未提交改动与旧 packing 玩法代码的处理方式（需用户决定，隔离不删除）

- 角色：项目经理（需用户拍板）
- 描述：当前工作区在分支 `rainy-library`、基线提交 `8dcc080` 上有 719 条未提交改动（166 未跟踪、498 删除、55 修改，与 00 §2、06 已核实数字一致），且旧玩法代码（js/microforest、js/library、Pack/Library/MicroForest*View 及旧 resources 图集）仍在树内。开工前必须由用户决定：(a) 这批未提交改动如何处置——建议新建分支（如 `survivor-dev`）承接新玩法、把现有未提交改动先提交或 stash 为“旧玩法存档”快照，之后在干净基线上开发；(b) 旧玩法代码在 M1–M2 的处置——按 00 R1/R2、03 §9 的裁决**隔离不删除**（保留在树内、仅隐藏在 URL/启动参数后，不再维护），M3 再经确认移除。本任务只做记录与隔离，**不执行任何 git 破坏性操作、不删除任何文件**。
- 依赖：无（必须第一个完成，是其余任务的前置）。
- 验收标准：用户在本文第 3 节决策清单的 D1–D3 上给出明确结论；项目经理把结论回填到 00 §6 风险 R1/R2 与本文；确认新玩法开发分支已就绪、基线干净可编译（`npm test` 跑出的失败集合与 forest-cleanup 基线一致，无新增失败）。
- 预估：S
- 涉及文件：docs/survivor/07-sprint-1-backlog.md、docs/survivor/00-project-plan.md（仅文档；git 分支操作由用户/开发按确认结论执行）

### T2 · sync-shared 白名单与入口、forest-cleanup 断言、npm 脚本接入

- 角色：前端开发
- 描述：按 03 §2.1 对 `scripts/cocos/sync-shared.mjs` 做追加式最小改动：白名单加 `js/survivor/`（含 data/ 子目录）；追加入口 `SurvivorRun.js`、`SurvivorSave.js`、`Meta.js`、`Joystick.js`、`SafeArea.js`、`data/strings.js`；`tests/forest-cleanup.test.mjs` 中“manifest 只允许 microforest/library 前缀”的断言加入 `js/survivor/`（只改该断言，不动其它）。新增 npm 脚本 `survivor:test`、`survivor:bench`、`survivor:balance`。此时 js/survivor/ 可只放一个占位空模块，确保脚本链路通。
- 依赖：T1
- 验收标准：`npm run cocos:sync` 成功且 shared-manifest 覆盖 js/survivor/；`npm test` 中旧测试失败数不超过基线（forest-cleanup 断言改后仍按旧玩法遗留失败，不新增失败）；`npm run survivor:test` 可执行（哪怕暂无用例）。
- 预估：M
- 涉及文件：scripts/cocos/sync-shared.mjs、tests/forest-cleanup.test.mjs、package.json、js/survivor/（占位模块）

### T3 · 基础设施模块：SurvivorRandom、Pool、SpatialGrid、SimClock + 单测

- 角色：前端开发
- 描述：按 03 §2/§3.2/§3.5/§3.6 实现四个无依赖基础模块：`SurvivorRandom.js`（复制自 Random.js 的 SeededRandom + range/chance，支持子种子）、`Pool.js`（定长预分配、acquire/release 交换删除、uid 递增、池满返回 null）、`SpatialGrid.js`（跟随玩家的均匀网格、每步重建、queryCircle、large 列表）、`SimClock.js`（固定步长累加、单帧最多 5 步、非有限/负数 frameDt 按 0）。逻辑层禁止 import 'cc'、wx、Date.now、Math.random。
- 依赖：T2
- 验收标准：`node --test tests/survivor-pool.test.mjs tests/survivor-grid.test.mjs` 通过——Pool 覆盖容量/交换删除/uid/池满；SpatialGrid 用“随机 500 组场景网格查询 vs 暴力全量”对照一致（03 §13）。SurvivorRandom 同种子同序列可复现。
- 预估：M
- 涉及文件：js/survivor/SurvivorRandom.js、Pool.js、SpatialGrid.js、SimClock.js、tests/survivor-pool.test.mjs、tests/survivor-grid.test.mjs

### T4 · S1 范围数据模块与校验 + 数据单测

- 角色：策划（出数值）+ 前端开发（落模块与校验）
- 描述：按 03 §4、01 §5/§6.1/§9/§10 落 S1 所需的数据模块（只含 Object.freeze 的 JSON 字面量）：`data/player.js`（基础属性）、`data/weapons.js`（至少 spore_shot 五档，结构预留其余武器）、`data/enemies.js`（gnat、beetle，含 §9.1 成长系数字段）、`data/waves.js`（0–3 分钟段生成速率与组成 + 计时胜利目标秒数字段）、`data/limits.js`（池容量与硬上限）、`data/strings.js`（S1 用到的面向玩家文案，遵守合规词表）、`data/validate.js`。id 使用 01 §15.5 的英文 id。
- 依赖：T3
- 验收标准：`node --test tests/survivor-data.test.mjs` 通过——validate() 返回空数组；spore_shot 五档、gnat/beetle 的生命/移速/伤害/经验/碰撞半径与 01 表格逐项一致；波次段首尾相接、组成和为 100%、同屏上限 ≤ limits；数据可 JSON 往返。
- 预估：M
- 涉及文件：js/survivor/data/player.js、weapons.js、enemies.js、waves.js、limits.js、strings.js、validate.js、tests/survivor-data.test.mjs

### T5 · 核心逻辑系统 + SurvivorRun 状态机 + 确定性测试

- 角色：前端开发
- 描述：按 03 §3 实现 S1 战斗闭环所需系统：`Stats.js`（属性合成，公式见 01 §15.1）、`Spawner.js`（0–3 分钟段刷怪、生成位置 = hypot 视口半对角线 + 60、同屏上限、超 max(900,半径+120) 重定位）、`Enemies.js`（直线追踪 + 分离，S1 只需 gnat/beetle 行为）、`Weapons.js`（spore_shot 的 tick：锁定最近敌人、扇形散射、穿透、无目标不进冷却）、`Projectiles.js`（玩家弹体移动/碰撞/寿命，玩家弹体不与 mistBubbles 碰撞）、`Pickups.js`（孢子掉落/吸附/合并与外观档）、`Progression.js`（xpToNext 公式、升级队列、draftOffer 三选一抽卡 + 兜底卡 + 首升保底）、`SurvivorRun.js`（状态机 playing/levelup/paused/won/lost，每步系统顺序见 §3.4，计时胜利判定在 phase 段，summary() 含 killer）。
- 依赖：T4
- 验收标准：`node --test tests/survivor-stats.test.mjs tests/survivor-weapons.test.mjs tests/survivor-spawner.test.mjs tests/survivor-progression.test.mjs tests/survivor-run.test.mjs tests/survivor-determinism.test.mjs` 全部通过——覆盖 §15.1 公式、spore_shot 发数/扇形/穿透/无目标行为、波次组成（统计容差）、xpToNext 与 §15.2 表一致、三选一规则、状态机全路径（playing↔paused、levelup、计时 won、hp 0 lost）、同种子同输入两次运行 summary 与逐秒状态哈希一致、源码禁用 API 扫描通过。
- 预估：L
- 涉及文件：js/survivor/Stats.js、Spawner.js、Enemies.js、Weapons.js、Projectiles.js、Pickups.js、Progression.js、SurvivorRun.js、tests/survivor-stats.test.mjs、survivor-weapons.test.mjs、survivor-spawner.test.mjs、survivor-progression.test.mjs、survivor-run.test.mjs、survivor-determinism.test.mjs

### T6 · 摇杆与安全区纯函数 + 单测

- 角色：前端开发
- 描述：按 01 §4、02 §5.1 实现 `Joystick.js`（偏移向量 → 死区 8 / 半径 60 的单位向量，底座钳制），按 02 §2.1、03 §6.1、裁决 D18 实现 `SafeArea.js`（windowInfo + capsule → 四边距，接口失败回退默认值 safeTop 88 / safeBottom 34 / 左右 24）。两者都是纯函数，不碰 wx/cc。
- 依赖：T3
- 验收标准：`node --test tests/survivor-joystick.test.mjs tests/survivor-safearea.test.mjs` 通过——Joystick 覆盖死区内归零、线性区、超半径截断、钳制；SafeArea 覆盖默认值回退与刘海机型（capsule.bottom 下移）四边距计算。
- 预估：S
- 涉及文件：js/survivor/Joystick.js、SafeArea.js、tests/survivor-joystick.test.mjs、tests/survivor-safearea.test.mjs

### T7 · survivor 分包目录与 package-wechat 名单探测式改造 + 测试

- 角色：前端开发
- 描述：按 03 §7.5、裁决 D14 新建 Asset Bundle 目录 `cocos-pilot/assets/survivor/`（meta `isBundle:true, bundleName:"survivor"`），放占位图集与地面贴图的占位资源。把 `scripts/cocos/package-wechat.mjs` 的分包名单从硬编码 `['internal','main','resources']` 改为：固定三个 + 当 `assets/survivor/config.json` 存在时才追加 'survivor'（缺失不报错）。
- 依赖：T2
- 验收标准：`node --test tests/cocos-package.test.mjs` 通过两种情形——有 survivor 分包时 4 个分包、无 survivor 分包时 3 个分包不报错；每分包 ≤ 4 MiB 检查保持。`npm run cocos:build:wechat` 成功，package-report.json 总包 ≤ 20 MiB。
- 预估：M
- 涉及文件：cocos-pilot/assets/survivor/（bundle 目录与 meta）、scripts/cocos/package-wechat.mjs、tests/cocos-package.test.mjs

### T8 · 几何占位美术规格落地（M1 占位绘制约定）

- 角色：UI/测试协同确认（UI 出规格，前端在 T9 实现绘制）
- 描述：按 02 §1.2–§1.3、§9 固定 S1 几何占位的颜色家族、形状语言、显示尺寸、层级：小旅人（复用 traveler 帧 + 白描边）、gnat（三点深灰圆点三角）、beetle（复用 microforest beetle 帧或灰褐椭圆占位）、孢子弹（暖白椭圆 + 拖尾）、孢子经验（青绿菱形）、摇杆（底座半径 60 / 头 28）、HUD（经验条、计时、净化数、暂停按钮在胶囊下方）。所有占位同类对象共用一张纹理以便合批（survivor-battle 预渲染或占位 PNG，具体方式按 03 §6.2 由 T9 决定）。
- 依赖：T4（尺寸/半径取自数据）
- 验收标准：UI 在本文或 02 附注里给出 S1 占位清单（含色值、形状、尺寸、层级），测试可据此在 T10 冒烟截图核对色盲可读性（0:30 场景能区分自己/敌人/孢子）。
- 预估：S
- 涉及文件：docs/survivor/02-ui-ux.md（§8/§9 的 S1 占位附注，若需补充）

### T9 · 表现层接入：SurvivorView / BattleArt / Input / Hud / Platform

- 角色：前端开发
- 描述：按 03 §6 实现 Cocos 表现层：`SurvivorView.ts`（设 720×1280 FIXED_WIDTH、读占位营地页、loadBundle('survivor')、每帧 setInput→advance→drainEvents→同步→按 state 开关模态框、销毁恢复 375×812）、`SurvivorBattleArt.ts`（分层节点池、视口剔除、几何占位绘制、受击闪白、净化光点）、`SurvivorInput.ts`（第一触点、上 1/3 屏蔽、调 Joystick）、`SurvivorHud.ts`（经验条/计时/净化数/暂停按钮/升级三选一卡）、`SurvivorPlatform.ts`（wx 生命周期、取 windowInfo+capsule 调 SafeArea、EVENT_HIDE 暂停）。战斗层所有动态 Sprite 来自单图集。
- 依赖：T5、T6、T7、T8
- 验收标准：`npm run cocos:sync` + `npm run cocos:build`（web-mobile）成功；浏览器打开 `?survivor` 能用摇杆移动、自动打 spore_shot、净化 gnat/beetle、拾取孢子升级弹三选一、计时到或死亡进结算页；离开视图后设计分辨率恢复 375×812。
- 预估：L
- 涉及文件：cocos-pilot/assets/scripts/SurvivorView.ts、SurvivorBattleArt.ts、SurvivorInput.ts、SurvivorHud.ts、SurvivorPlatform.ts

### T10 · PinePilot 入口接入 survivor 分支 + 冒烟脚本

- 角色：前端开发
- 描述：按 03 §2.2 在 `PinePilot.ts` 新增 `survivor:SurvivorView|null` 字段，在 update/resize/onDestroy 并列调用；进入条件为浏览器 URL 含 `survivor` 或微信端启动参数 `survivor`，判断写在现有 `['forest','audit',...]` 分支之前；默认入口仍为 PackView（M3 前不改）。实现 `SurvivorSmoke.ts`（`?survivor&smoke=1` 脚本输入跑 30 秒 + 快进到满屏再跑 10 秒）。
- 依赖：T9
- 验收标准：`npm run cocos:build:wechat` 成功、package-report.json 分包/总包达标；浏览器 `?survivor&smoke=1` 控制台无 error、无未捕获异常、战斗层激活节点 ≤ 600、DrawCall ≤ 25、run.state 正常推进；`npm run cocos:test` 与默认入口仍为 PackView 的断言（library-sync）不被破坏。
- 预估：M
- 涉及文件：cocos-pilot/assets/scripts/PinePilot.ts、SurvivorSmoke.ts、tests/library-sync.test.mjs（仅在必要时按 03 §2.2 保持断言成立）

### T11 · SurvivorSave + Meta 存档/结算逻辑 + 单测（仅逻辑，不接 UI）

- 角色：后端开发（存档/封装）
- 描述：按 03 §5、裁决 D3/D13 实现 `SurvivorSave.js`（注入接口只用 `{getItem,setItem}`；信封 schema 1，data 含 settings 三项 sound/vibration/reduceFlash；读取流程含缺失/损坏→备份/双损坏→.corrupt 覆盖写/更新版本→locked；sanitize 清洗）与 `Meta.js`（露晶结算公式 01 §13.1、bonuses 换算、购买/重置纯函数）。S1 只做逻辑与单测，结算页只显示本局结果，不落地局外成长 UI。
- 依赖：T4（Meta 读 permanent/limits；S1 若未落 permanent.js，可先用默认 bonuses）
- 验收标准：`node --test tests/survivor-save.test.mjs tests/survivor-meta.test.mjs` 通过——新档/迁移夹具/损坏→备份/双损坏→.corrupt+新档/更新版本→locked/setItem 失败/清洗；露晶公式对 01 §13.1 两个示例（24、132）相等、购买与全额退还。内存 Map 注入只实现 getItem/setItem（不依赖 removeItem）。
- 预估：M
- 涉及文件：js/survivor/SurvivorSave.js、Meta.js、tests/survivor-save.test.mjs、tests/survivor-meta.test.mjs

### T12 · S1 面向玩家文案与合规扫描用例

- 角色：运营（出文案）+ 测试（写扫描用例）
- 描述：运营按 05 §3、01 §2 为 S1 用到的界面（HUD、三选一卡、结算页“净化数/被浊雾笼罩”、新手首条提示）产出中文文案并写入 `data/strings.js`，统一“净化/驱散/撤离”口径。测试按 04 锚点 B（§7.1 占位）实现 `tests/survivor-compliance.test.mjs` 扫描 strings.js。
- 依赖：T4、T5
- 验收标准：`node --test tests/survivor-compliance.test.mjs` 通过——strings.js 无 {吃,食用,采食,美味}×{蘑菇,菌} 组合、无 {击杀,消灭,屠杀,死亡,血,尸}；结算用“净化数”、失败用“被浊雾笼罩”。
- 预估：S
- 涉及文件：js/survivor/data/strings.js、tests/survivor-compliance.test.mjs

### T13 · 补齐 04 测试计划 §3–§9（裁决 D8）

- 角色：测试
- 描述：在 04 现有锚点 A/B/C 基础上补齐 §3（测试环境与数据夹具）、§4（S1 范围的按模块用例清单，覆盖 §2.1 清单 + joystick/safearea/replay）、§5.3/§5.4（机型档位与安全区手测流程）、§6（package-report 阈值 M1/M3 目标值）、§7 其余兼容项、§8 完整缺陷分级、§9 各 Sprint 验收门槛。不得与锚点冲突。
- 依赖：T5（用例清单对齐实际模块）
- 验收标准：04 §3–§9 正文完整、无 `<!-- PART2 -->` 悬空引用；§7.1 合规规则与 01/02/03 的指向一致；§9 S1 门槛与本文第 1 节验收口径一致。项目经理与评审角色确认 04 可作为验收依据（闭合 06 H1）。
- 预估：M
- 涉及文件：docs/survivor/04-test-plan.md

### T14 · Sprint 1 提测、测试报告与复盘

- 角色：测试（出报告）+ 项目经理（复盘）
- 描述：按 04 §2 的 L1–L6 全量执行：`npm test`、`npm run survivor:test/bench/balance`（快速档）、`npm run cocos:build:wechat`、浏览器冒烟、开发者工具 200 敌人帧率与色盲截图。出 Sprint 1 测试报告（机型、帧率 P50/P95、DrawCall、节点数、包体、缺陷分级清单、实际净化率雏形），项目经理据此复盘并确定 S2 范围。
- 依赖：T10、T11、T12、T13
- 验收标准：报告齐全且满足本文第 1 节验收口径；无 HIGH 缺陷遗留（按 04 锚点 A）；旧测试失败数不超过 forest-cleanup 基线；复盘结论回填 00 §5/§6。
- 预估：M
- 涉及文件：docs/survivor/（Sprint 1 测试报告，命名如 reports/sprint-1-test-report.md）、00-project-plan.md

### T15 · 删除旧玩法代码与资源（用户裁决 D2，收尾执行）

> **状态：已完成（2026-09-11）。** 用户确认后执行。删除前发现森林冒险玩法（185 个文件）从未提交进 git，已向用户说明删除后无法找回，用户仍选择直接删除（方案 B）。图书馆/装箱玩法可从 git 历史找回。默认入口改为 survivor；`resources` 分包改为可选；forest-cleanup / library-sync 由 `tests/survivor-host.test.mjs` 取代。结果：`npm test` 157/157，微信总包 6.76 → 2.73 MiB，无头浏览器冒烟 16/16 通过。

- 角色：前端开发（执行）+ 项目经理（确认范围）
- 描述：按用户裁决 D2（直接删除、方案2：不打 tag、不另存分支，仅靠 git 历史找回），在 T10 新入口接通并确认可运行后，删除旧玩法代码与资源：`js/microforest/`、`js/library/`、`library-game/`、`Pack*/Library*/MicroForest*View` 等旧表现层脚本、`cocos-pilot/assets/resources/` 下仅旧玩法用的图集，以及 PinePilot 中 forest/audit/review/microSmoke/campaignSmoke 调试分支、build.mjs 的 ADVENTURE_LEVELS/assertPortalSpacing 等旧分支（剔除清单以执行时实际 grep 为准，参见 03 §9 / 裁决 D15）。相应移除/改写只针对旧玩法的测试（forest-cleanup、library-sync、microforest*、cocos-package 中旧断言），不得破坏新 survivor 测试。删除后默认入口切换为 SurvivorView。
- 依赖：T10（新入口必须已接通可运行）、T14（提测通过后再删，确保新玩法独立可用）
- 验收标准：删除后 `npm test` 不再含旧玩法遗留失败（forest-cleanup 基线失败应随旧代码一并清除，而非继续计入）；`npm run cocos:build:wechat` 成功、主包与分包体积较删除前下降且达标；默认入口为 survivor、不再需要 URL 参数即可进入新玩法；旧玩法仅可从 git 历史找回。此为破坏性操作，执行前项目经理再次向用户书面确认一次最终删除清单。
- 预估：M
- 涉及文件：js/microforest/、js/library/、library-game/、cocos-pilot/assets/scripts/（旧 View）、cocos-pilot/assets/resources/（旧图集）、cocos-pilot/assets/scripts/PinePilot.ts、scripts/cocos/build.mjs、tests/（旧玩法相关用例）

依赖关系速览：T1 → T2 →（T3 → {T4 → T5, T6}）；T7 依赖 T2；T8 依赖 T4；T9 依赖 T5/T6/T7/T8；T10 依赖 T9；T11 依赖 T4；T12 依赖 T4/T5；T13 依赖 T5；T14 依赖 T10/T11/T12/T13；**T15 依赖 T10/T14（Sprint 收尾最后执行，破坏性删除前需用户再次确认）**。每项完成后代码应处于可构建状态（逻辑任务跑 node --test，表现层任务跑 cocos:build）。

## 3. 给用户的决策清单（需拍板后 T1 才能收尾、T2 起开工）

> **决策状态（2026-09-11）：D1–D4 已由用户全部拍板，见 00 §8「用户决策回填」。T1 前置已满足，T2 起可开工。** 结论摘要：D1=《雨后菌语》；D2=直接删除（方案2，不打 tag，Sprint 1 收尾经再次确认后执行，见新增任务 T15）；D3=(c) 当前 `rainy-library` 分支继续；D4=180 秒。

以下问题需要用户决定。标 ★ 的是 T1 的硬前置，不决定则 Sprint 1 无法干净开工。

- **★ D1 账号登记名是否为《雨后菌语》**：00/01–06 全部文档与 05 的内容介绍文案都假定账号登记名、提审名称为“雨后菌语”。请确认平台当前显示名就是“雨后菌语”；若不是，请给出准确名称——这会影响 05 的内容介绍、启动页/主菜单标题文案与合规核对。（涉及 05 §3、02 §4.1/§4.2）
- **★ D2 旧玩法代码（packing / library / microforest）去留**：裁决建议 **M1–M2 隔离不删除**（保留在树内、仅隐藏在 URL/启动参数后，不再维护，旧测试继续跑、已失败的 forest-cleanup 作为基线），M3 经确认后再按 03 §9 打 `legacy-final` tag 并移除。请确认采用此“隔离不删除”策略；若希望更早处理旧代码，请说明。（涉及 00 R2、03 §9）
- **★ D3 当前 719 条未提交改动如何处置**：建议 **先把现有未提交改动提交或 stash 为一个“旧玩法存档”快照，再新建分支（如 `survivor-dev`）在干净基线上开发新玩法**。请在三者中选一或另行指示：(a) 提交为一个存档 commit 后开新分支；(b) stash 保存后开新分支；(c) 直接在现分支 `rainy-library` 上继续。本任务不会在你确认前执行任何 git 破坏性操作。（涉及 00 R1、03 §7-T7）
- D4 Sprint 1 的“计时胜利”目标时长：原型用“存活到 N 秒即胜利”作为临时闭环，建议 N=180 秒。请确认或给出偏好值。（涉及本文 §1、01 的正式胜利条件在 S2 用 Boss 替换）
- D5 激励视频与埋点均已裁决为 M3（D7/D9），S1 不涉及；此处仅告知，无需本 Sprint 决策。若对“首发是否带广告/埋点”有不同意向，可提前反馈以便调整 05 的 M3 计划。

决策回填：用户给出结论后，项目经理把 D1–D3 的结论写回 00 §6 风险 R1/R2 与本文 T1 验收，并通知开发按 D3 的选择准备分支，随后 T2 起依序开工。
