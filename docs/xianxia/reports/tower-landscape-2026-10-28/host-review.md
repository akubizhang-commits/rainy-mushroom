# TowerView 横屏独立只读审查

日期：2026-10-28。原始只读审查检查 `measureViewport / buildBattle / showModal / update / draw` 及其 Run、resize 调用链；下方保留当时的发现、行号和复现证据。

**当前状态：第三项跟随视口修复及新增六边形 Run 集成均已通过回归。** Run 侧修改限于 `js/xianxia/TowerRun.js`、自有 viewport/arena 测试和本报告。第一、二项及 Campaign/View 的修改由父任务负责。没有 sync/build、全量测试或开展平衡测试；独立 host 回归由其负责人在文末补充。

审查时源码：

- `cocos-pilot/assets/scripts/TowerView.ts` SHA-256：`c3191037798b9e4d90fd5fb9e5c739f83f1fce6dc142edf72695215a9ef23f83`
- `js/xianxia/TowerRun.js` SHA-256：`893ec5a691dbd606992144edbd9cbe5385f3d0d77866860b1034eea93aa016fe`

## 发现

### P2：短横屏没有可用战斗高度下限，会关闭攻击或直接抛异常

位置：`TowerView.ts:78`、`:331–336`。

横屏固定逻辑宽 1280，实际逻辑高 `H = 1280 * frame.height / frame.width`。战斗 viewport 的垂直长度为 `H - 196`。当 `H <= 196` 时，上下界相等或倒置，`run.setViewport()` 抛出 `RangeError: Invalid viewport`。这个调用在 `advance()`、绘制和自动 checkpoint 之前，且没有捕获。

即使 `196 < H < 244`，viewport 也不包含玩家完整的半径 18 碰撞体。`TowerRun._visible()` 同时要求玩家和敌人完整可见，因此所有新的攻击请求被拒绝，已有蓄力/攻击被取消。

已用真实 Run 验证：

| Frame | 逻辑尺寸 | 玩家初始 y | viewport ymin / ymax | 结果 |
|---|---|---:|---|---|
| 1920×320 | 1280×213.333333 | -60 | -74.666667 / -57.333333 | 玩家顶部 -42 超出 ymax，攻击可见性门槛恒不满足 |
| 1920×280 | 1280×186.666667 | -60 | -61.333333 / -70.666667 | `Invalid viewport` |

复现：战斗中将浏览器窗口压矮至以上 frame，或用底部停靠开发者工具缩小可用区域，随后执行一次战斗更新。无需开启体验工具。

建议：明确可用逻辑高度下限，短窗口采用适配投影、缩减 HUD 或暂停并提示的策略；不要只钳制 Run 的上下界，否则战斗可见性仍与实际 HUD 不一致。

### P2：超宽屏的六按钮工具弹窗产生负正文高度，并与标题重叠

位置：`TowerView.ts:254–264`。

`h` 被限制为 `this.height - 24`，但正文高度继续减去固定的标题、按钮占用 `230 + 90 * (buttonRows - 1)`，没有为高度不足的屏幕重排。

复现：3840×1080 frame，进入独立体验工具，显示六个真实工具选项。此时逻辑尺寸为 1280×360，两列三排按钮：

- 面板高 `h = 336`。
- 正文 `bodyHeight = 336 - 230 - 180 = -74`。
- 标题中心 y=114，高 68，覆盖 y=80..148。
- 首排按钮中心 y=76，触控高度 88，覆盖 y=32..120，与标题重叠。

验证方式：读取并去除类型声明后直接调用 production `measureViewport()` 与 `showModal()`，仅记录 `label/button` 的布局参数；没有复制整个 host 输入测试环境。这是参数和布局错误的复现，不声称已经验证 Cocos GPU 对负高度的具体渲染结果。

建议：根据可用高度重排列数、按钮尺寸或使用可滚动正文/按钮区；正文和触控区需要保证非负、互不覆盖。

### P2（已修复）：一个更新批次内使用旧玩家位置的 viewport，攻击可见性与最终画面不一致

位置：`TowerView.ts:330–336`、`:359`。

`update()` 在 `advance()` 前按旧玩家位置生成 viewport，而 `draw()` 在推进后按新位置移动摄像机。一次 `advance()` 会运行多个固定子步，最大为正常模式 6 个子步，×3 模式 18 个子步。移动使敌人落到实际 HUD 后方时，该批次仍使用旧 rectangle 判断攻击可见性。这是沿用的更新顺序问题，在新横屏较窄的垂直战斗区更容易触发，并非声称切屏本身重置了战斗。

真实 Run 最小复现参数：

1. 第 5 层，attemptId=1、seed=123、HP=100、XP=0、素问剑、`sj_yujian:1`；关闭玩家后续自动施法冷却，仅为隔离敌人行为。没有无敌/秒杀或修改怪物 HP/伤害。
2. 推进 2 秒，选择实际生成的 `snake_normal`。其他敌人移远并设置攻击宽限期。
3. frame=844×390，对应逻辑高 591.469194。玩家保持 `(33,-60)`；蛇设为 x=33、y=106.734597、半径仍为 authored 24，其上边距旧 viewport ymax 仅 1。
4. 蛇的 entry/grace/ready 设为 0，保持真实 AI：推进一个子步使其开始 `shot` 蓄力，再推进 0.8 秒。快照合法，当前时间 2.816667，蓄力终点 2.866667。
5. 从同一合法快照恢复两个 Run，均输入 `(0,-1)`。A 按 host 当前方式设置一次 viewport 后 `advance(.3)`；B 每个子步重新按当前玩家位置设 viewport，共推进 18 个子步。

结果：

| 指标 | A：当前 host 批次 | B：逐子步 viewport |
|---|---:|---:|
| 最终时间 | 3.116667 | 3.116667 |
| 玩家 y / HP | -126 / 100 | -126 / 100 |
| 蛇 y | 106.734597 | 106.734597 |
| 最终正确 viewport ymax | 65.734597 | 65.734597 |
| hostile projectile 数 | **1** | **0** |
| 最终快照验证 | true | true |

蛇中心已超过实际顶部 HUD 的下边界 `ymax + 8 = 73.734597`。A 仍完成了发射，B 则及时取消蓄力。此例证明屏外发射，不声称该时刻造成了玩家伤害，更不构成平衡结论。

建议：使固定子步中的可见性 rectangle 与该子步的相机/玩家位移保持一致；同时保留敌人失去可见性时取消攻击的既有规则。

## 已确认的安全行为与剩余限制

- `draw()` 对玩家、敌人、预警、投射物采用统一的世界坐标减相机偏移，没有按横竖屏缩放或覆盖 Run 坐标。
- resize 的 `render()` 只重建显示节点，没有重新构造 Run；`measureViewport()` 清除输入属于控制释放，不改变 HP、RNG、掉落 seed、击杀账本或待出生集合。
- `measuring` 在 `setDesignResolutionSize()` 之前置位，且 `render()` 首行检查它；同步 resize → render 重入在代码层面被挡住。未运行真实 Cocos resize 事件循环，不能将此表述为设备验证。
- 出生安全 `_spawnSafe()` 使用世界坐标和 280 距离门槛，不依赖屏幕比例；reserved 到期再次复查距离。切屏不会让尚未到期的预警立即实体化。
- 新 viewport 把已有蓄力敌人裁出后，下一个固定子步会清除其 telegraph 并转 recovery，没有瞬间突进/伤害。
- 暂停/保存失败的安全状态可在 resize 后重建；但是 `render():196` 无条件销毁 overlay，只重建普通暂停窗或 pending-save 窗。工具面板会退回暂停窗、营地的结算窗会关闭。这是界面上下文丢失，未发现会撤销已经提交的奖励；如果产品要求保留当前弹窗，应单独记录 modal 状态。

## 原始审查验证（修复前）

文件：`tests/xianxia-tower-viewport.test.mjs`。

执行：

```sh
node --test tests/xianxia-tower-viewport.test.mjs
```

**3/3 通过，0 skipped**：

1. 横竖屏 viewport 替换只改变 view，世界状态及暂停 JSON 恢复一致。
2. 切屏时出生预警保留身份与时钟，玩家进入危险距离后实体化被拒绝且不重复注册。
3. 从竖屏切横屏使真实鳄鱼蓄力不可见后，恢复/取消和 JSON replay 一致。

这三个初始测试均使用真实 TowerRun，未开启 assist；当时未修改 production。

## 第三项修复与回归

`TowerRun.js:201–204` 接受可选 `view.followPlayer`，字段存在时必须为 boolean。`setViewport()` 和 snapshot validation 共用该校验；非布尔值（包括显式 `undefined`）在赋值前被拒绝，不改变原有 Run。

`TowerRun.js:592–597` 在每个 `_tick()` 的玩家移动及 `boundActor()` 之后、敌人行为和技能之前，按实际 `dx/dy` 同时平移 viewport 四边。因此减速和撞墙只移动其实际走过的距离，不按输入速度猜测相机位移。以下兼容行为保留：

- `followPlayer: true`：rectangle 和开关一起存入现有 snapshot；暂停不移动，JSON restore 后继续跟随。
- 字段缺省或 `false`：仍是旧固定 rectangle，不隐式升级。
- `view: null`：仍是 geometry-only 可见性。
- 不修改掉落、生命值、伤害、敌人数据或存档 schema。

宿主需传入 `setViewport({ ...bounds, followPlayer: true })`。只读检查已看到父任务在 `TowerView.update()` 接入该参数；本任务没有修改宿主。

测试先行结果：修改 Run 前，新增断言中有 **5 个测试按预期失败**，包括蛇实际发射 `1` 枚而非 `0`、矩形不随移动更新，以及 setter 未拒绝非布尔标志。修复后：

```sh
node --test tests/xianxia-tower-viewport.test.mjs
```

**9/9 通过，0 skipped**，覆盖原始三个用例及：

1. 原 844×390、×3、`.3` 秒复现：跟随模式下 hostile projectile 为 **0**；旧静态 rectangle 对照仍为 1，确认缺省行为未被改写。
2. `.3` 一次推进与 18 次 `1/60` 推进的完整 snapshot 深度相等；`.117` 秒后暂停、JSON restore，再推进 `.183` 秒也得到同一完整 snapshot。
3. 正负地图边界按裁剪后的位移跟随，到边界停止后 viewport 不漂移。
4. web 的 0.75 倍减速下，玩家和 viewport 均移动 49.5，未误按基础速度移动 66。
5. 缺省、false、null 的兼容性及恢复行为。
6. 非布尔标志在 setter、snapshot validation、restore 三处拒绝，并保留原状态。

相关战斗、成长、掉落、campaign、breakthrough 与 viewport 八个文件联合验证：**121/121 通过，0 skipped**。命令及日志：

```sh
node --test tests/xianxia-tower-viewport.test.mjs \
  tests/xianxia-tower-run-loot.test.mjs tests/xianxia-tower-run.test.mjs \
  tests/xianxia-tower-run-growth.test.mjs tests/xianxia-tower-run-playtest.test.mjs \
  tests/xianxia-tower-campaign.test.mjs tests/xianxia-tower-campaign-growth.test.mjs \
  tests/xianxia-breakthrough.test.mjs
# /tmp/tower-viewport-follow-regression.log
```

修复后 `TowerRun.js` SHA-256：`2d425380f198d37341ca3970f16b94c690d662e0e428934ac85099a88c9561bb`。

新增 viewport 回归没有开启无敌或秒杀。此结果验证时序、几何、状态和兼容性，不是平衡或实机渲染结论。

## 修复后 host 回归补充（2026-10-28）

前两项 P2 已在源码及 host VM 回归中关闭。`TowerView.ts:81–83` 对逻辑高度不足 560 的横屏使用 `SHOW_ALL`、1280×560；普通 844×390 仍使用 `FIXED_WIDTH`。原始发现与复现数据保留在上文。

`tests/xianxia-tower-host-tools.test.mjs:796` 新增 1920×280、3840×1080 两个真实 host 场景，确认：

- 可见逻辑高度至少 560，玩家完整碰撞体位于有效 viewport 内；实际推进多个更新批次无异常，快照验证通过。
- 六个工具按钮为两列三排；标题、正文高度为正，所有文字区和按钮位于画布内且互不重叠。
- 从极端比例切到 844×390、390×844，再切回极端比例及普通横屏，投影策略正确往返；Run 快照、HP、RNG、掉落状态及持久化内容不变，也不产生额外写入。
- `TowerView.ts:337` 的 `followPlayer:true` 与 `TowerRun.js:592–597` 联动：实际摇杆移动后，viewport 各边相对玩家的位置不随批次漂移，暂停快照可恢复。第三项 P2 的跟随契约已有覆盖，但本次没有重跑上文蛇发射的专用复现，因此不单凭此用例宣称其完整攻击边界回归已关闭。

执行 `node --test --test-reporter=spec tests/xianxia-tower-host-tools.test.mjs`：**27/27 通过，0 skipped**。本轮只修改测试及本报告；未构建、未跑全量测试。投影、节点矩形和 Run 行为由 VM 验证，真实 Cocos 的 letterbox、触控坐标映射及文字渲染仍需父任务浏览器验证。

## 六边形 Run 集成（2026-10-28）

接口已与 Dalton 的 `TowerArena.js` 对齐。本轮消费 `insideHex(point, radius)`、原地修改 x/y 的 `boundHexActor(actor)`，以及返回可行射线参数长度的 `clipHexRay(origin, dx, dy, range, radius)`，没有修改该几何模块。

六个顶点按顺序为 `(33,1020)、(978,480)、(978,-600)、(33,-1140)、(-912,-600)、(-912,480)`，中心 `(33,-60)`。

### 版本与兼容

- 构造参数 `arenaVersion` 仅接受 0/1，缺省为 **0**。缺省和显式 0 的完整快照一致，均不写该字段。
- 显式 1 才写入 `state.arenaVersion: 1`。snapshot 中字段可缺省，但若存在仅允许数值 1。
- 旧无字段快照始终使用矩形，包括位于六边形之外但旧矩形合法的角落；restore 不迁移、不裁剪玩家或敌人位置。
- 父任务负责新 Campaign 入塔显式传 1，并锁定 checkpoint 的 arenaVersion。本轮只读已看到这两个接入点，没有修改 Campaign 或 View。
- arena 与掉落 seed、combat RNG、技能、HP/伤害、收益规则相互独立；不修改存档 schema。

### 集成行为

- 玩家移动、敌人接近移动、Boss 冲刺的三处边界裁剪按版本路由；新版本使用完整碰撞圆的六面约束。
- `followPlayer` 的平移仍在边界裁剪后按实际位移执行，因此斜边裁剪不会造成 viewport 漂移。
- Boss 蓄力射线按半径缩进后的六面裁剪，telegraph 终点与实际冲刺终点保持一致。
- 新版本 `_spawnSafe()` 对原有候选点调用 `insideHex(point, radius)`，只筛选、不投影/搬迁出生候选。原有 280 距离、预警时长、重试、并发容量、波次与 ID 生成未改。
- 新版本 snapshot 验证要求 player、enemies、reserved 完整圆在场内。reserved 还要求 radius 等于 authored 半径，防止“预警半径缩小、实体化后真实半径越界”。
- 旧矩形分支保留原有校验和裁剪；合法旧角落快照可原样恢复并继续移动至 `(960,1002)`。

### 回归证据

新增文件：`tests/xianxia-tower-run-arena.test.mjs`。测试使用上述六个字面量顶点独立计算有符号边距，没有使用 production `insideHex()` 作为期望值。

接入前 **7 个用例按预期失败**，包括玩家到 `(33,1002)` 时越出顶部斜面、东北候选 `(695,660)` 的预警圆越界、以及斜边方向 Boss 射线长 432 而应为 238。接入后：

```sh
node --test tests/xianxia-tower-run-arena.test.mjs
# /tmp/tower-arena-green.log
```

**8/8 通过，0 skipped**：

1. arena 构造与快照版本约束，默认/显式 0 与旧行为一致。
2. 无 arena 字段的旧角落存档原样恢复；擅自添加 1 会拒绝非法位置，不默默修复。
3. 朝六条边及六个顶点移动，玩家、在场敌人和预警的完整圆均包含在场地内。
4. 斜边裁剪后的实际位移与跟随 viewport 一致；`.3` 与 18 子步、暂停及 JSON restore 相等。
5. player/enemies/reserved 的外逃、中心在内但圆体跨斜边、预警半径篡改均被拒绝。
6. 预警到期仍执行 280 距离复查，保留 authored 候选和 ID，不重复注册。
7. 真实第一层 Boss 分别朝六面冲刺，距离边 280 时按真实半径 42 截至 238；标记终点、实际终点、边界停止和 replay 一致。冲刺验证阶段未开启 assist。
8. 九层共 **180 波、4,770 死亡**全部可达；每步检查守恒及并发上限、全部碰撞圆合法、八个原有方向都有实际出生，kill IDs 唯一且前缀不变。

移动边界隔离及全部波次可达性用例明确开启实例 assist；后者通过真实有限出怪与技能击杀完成，没有伪造 kill ledger 或奖励。这证明运行可达性，不证明生存难度或平衡。

与 viewport、旧 Run、成长、graded loot、playtest、Campaign、breakthrough 九个文件联合执行：**129/129 通过，0 skipped**。

```sh
node --test tests/xianxia-tower-run-arena.test.mjs tests/xianxia-tower-viewport.test.mjs \
  tests/xianxia-tower-run-loot.test.mjs tests/xianxia-tower-run.test.mjs \
  tests/xianxia-tower-run-growth.test.mjs tests/xianxia-tower-run-playtest.test.mjs \
  tests/xianxia-tower-campaign.test.mjs tests/xianxia-tower-campaign-growth.test.mjs \
  tests/xianxia-breakthrough.test.mjs
# /tmp/tower-arena-regression.log
```

验证时 SHA-256：

- `TowerRun.js`：`15a42830e85ed2150f0c06149b21c064e8244bc88b8356decf05496cea78df13`
- `TowerArena.js`：`f79cc3c9f5eb833abcf3b2b511046dafa579cf78b7f2e758bc3b6cf7259c43b6`

## 十二兽族 Run 接入（2026-10-28）

已在 `js/xianxia/TowerRun.js` 接入 Rawls 的 `enemyAttackSpec`、`enemyCombatStyle`。本轮未修改纯攻击模块、Arena、Campaign、View、掉落、HP 或原型伤害。

- 通用攻击直接使用模块最终范围，去掉旧 `radius + 54 + 18` 的提前过滤。第一层 Boss 继续读取 authored charge/gore，第一层普通/精英蜘蛛继续近战 bite。
- 收招结束只更新当前 `ai.cooldowns[kind]`，`readyAt` 回到当前时间。猪冲刺冷却期间可以近身咬击，130 以下不会反复发起冲刺；出生 grace、入场等待、全局攻击名额和 `nextWindupAt` 保持。
- 远程在 approach 阶段独立于 CD 维持 180–300 距离带，移动步长截止于距离带边缘。墙边退路受阻时按已保存的 `orbitSign` 稳定尝试两侧移动，只采用合法且增加玩家距离的位置。屏外单位继续靠近，攻击前与执行中仍检查 viewport。
- shot 使用存下来的 `attack.speed`；`poison / feather / sonic` 传至 projectile。AI attack 和 projectile 的 element 字段可缺省；若存在，只接受上述三个值。旧无 element 的攻击可恢复并继续发射无标签弹体。毒液弹仍为直接命中，没有新增 DoT。

新增 `tests/xianxia-tower-run-attacks.test.mjs`，**26/26 通过**。先在旧实现运行时 24 项按预期失败，首层教学与全局攻击限制两个控制组通过。集成后覆盖：

1. 十二族真实出怪及普通、精英、Boss 代表的最终范围、范围外接近、前摇、真实近战伤害、投射物/蛛网生成、收招 CD 和禁止提前重用。
2. 猪冲刺冷却时近身 bite，CD 中继续接近且不重复 charge。
3. 蛇、隼、蝠、精英蜘蛛在 CD 中后退至 180、接近至 300、带内保持；六边形墙边蛇可以侧移并近距离发射。
4. 指定已存 spec.speed=333 后真实弹速为 333；毒液仅造成一次原型伤害，无新持续伤害区域。
5. 元素前摇暂停、JSON 恢复、不同 advance 批次、在飞弹体和收招 CD 一致；非法元素拒绝，旧无标签弹体兼容。
6. 第一层蜘蛛 .65 秒 bite、Boss authored charge/gore、出生 grace、.25 秒前摇间隔和第一层攻击预算 2 保留。

测试准备通过真实波次到达原型，准备阶段使用 assist；从 snapshot restore 后测量攻击时 assist 关闭。连续随身剑通过合法 `orbitNextAt` 隔离，未篡改敌人 HP、伤害、移速、原型身份或奖励账本。这是功能回归，不是生存难度或平衡证明。

既有拥有文件的适配仅两处：`tests/xianxia-tower-run.test.mjs` 更新十二族旧招式断言；`tests/xianxia-tower-viewport.test.mjs` 将鳄冲刺改为真实野猪冲刺，并为蛇初始退后一步留出 8 像素。原来的三子步屏外取消、静态 rectangle 控制组和十八子步 replay 断言仍通过。

定向联合执行 **193/193 通过，0 skipped**（新增 Run 26、Rawls 模块 38、既有相关 129）：

```sh
node --test tests/xianxia-tower-run-attacks.test.mjs \
  tests/xianxia-tower-enemy-attacks.test.mjs \
  tests/xianxia-tower-viewport.test.mjs tests/xianxia-tower-run-arena.test.mjs \
  tests/xianxia-tower-run.test.mjs tests/xianxia-tower-run-growth.test.mjs \
  tests/xianxia-tower-run-playtest.test.mjs tests/xianxia-tower-run-loot.test.mjs \
  tests/xianxia-tower-campaign.test.mjs tests/xianxia-tower-campaign-growth.test.mjs \
  tests/xianxia-breakthrough.test.mjs
# /tmp/tower-attacks-regression.log
```

未执行 build、sync、host 输入模拟或大规模 balance。Run 本轮修改完成，已释放给父任务统一构建；元素绘制和文档索引仍由父任务负责。
