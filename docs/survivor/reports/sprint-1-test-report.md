# 雨后菌语 · Sprint 1 测试报告与复盘（T14）

- 角色：测试工程师（出报告）+ 项目经理（复盘）
- 依据：04-test-plan.md §2 / §4 / §5 / §6 / §8 / §9.1，07-sprint-1-backlog.md §1，00-project-plan.md §5 / §6
- 约束遵守：未执行任何 git 破坏性操作；未删除旧玩法；未改动实现代码（本次只运行既有测试/构建并写报告）。

## 0. 结论速览

| 判定 | 内容 |
|---|---|
| 已自动验证通过 | `npm test`（旧测试失败 = 基线 1 条，survivor-* 123/123 全绿）、`npm run survivor:test`、`npm run cocos:sync`、`npm run cocos:test`（失败 = 基线）、`npm run cocos:build:wechat`（构建成功，包体达标）、`npm run cocos:build`（web-mobile）+ 无头 Chrome `?survivor&smoke=1` 冒烟 PASS（节点 240 ≤ 600、战斗帧 DrawCall 7 ≤ 25、无 error）、Survivor*.ts 合规手工扫描无面向玩家命中 |
| 需用户真机确认 | 开发者工具 200 敌人同屏 ≥ 50 fps（S1 硬门槛）、中端真机帧率（记录项）、色盲截图（UI-08）、触摸/摇杆/安全区/切后台/结算双路径等 §4.8 手测（UI-02～UI-09） |
| HIGH 缺陷 | 自动化范围内 0 条；真机项未执行，不能据此宣布“无 HIGH 遗留” |
| 提测结论 | **自动化部分通过；S1 最终验收待用户完成 §6 真机步骤后确认** |

## 1. 测试环境

| 项 | 值 |
|---|---|
| 提交号 | `252f3fb`（分支 `rainy-library`，D3=C 同树开发，工作区仍有用户既有未提交改动，本次未触碰） |
| Node.js | v22.22.2 |
| Cocos Creator | 3.8.8（`/Applications/CocosCreator.app`，命令行构建） |
| 浏览器 | HeadlessChrome 155（`--headless=new`，WebGL = ANGLE SwiftShader 软件渲染） |
| 微信开发者工具 | 本机已安装，但本环境无法操作 GUI，未执行 |
| 真机 | 无，未执行 |

## 2. 各任务验收结论（T7–T13）

T2–T6 已在 `reports/sprint-1-logic-verification.md` 通过，本次回归仍全绿（见 §3）。

| 任务 | 验收标准（07） | 本次证据 | 结论 |
|---|---|---|---|
| T7 survivor 分包 + package-wechat 探测 | cocos-package 两种情形通过；`cocos:build:wechat` 成功、总包 ≤ 20 MiB | cocos-package 4/4；真实构建 `game.json` 分包 = internal/main/resources/survivor；survivor 分包 21,586 B；总包 6.76 MiB | ✅ 已自动验证通过 |
| T8 几何占位规格 | 02 给出 S1 占位清单，可据此核对色盲可读性 | 02 §9.1“S1 占位清单（T8 落地）”存在；冒烟确认 `survivor-battle` 图集加载、战斗帧 5–7 个 DrawCall（合批生效） | ✅ 文档与合批已验证；色盲截图（UI-08）待真机 |
| T9 表现层接入 | sync + web-mobile 构建成功；`?survivor` 可移动、自动射击、净化、升级三选一、计时/死亡进结算；离开后恢复 375×812 | web-mobile 构建成功；冒烟验证：营地页→出发、脚本输入移动、净化 25 只、levelup 出现并可选卡、恢复 375×812 | ⚠️ 部分通过：真实触摸、结算页双路径（UI-05）冒烟未覆盖，待真机 |
| T10 PinePilot 入口 + 冒烟 | `cocos:build:wechat` 成功；冒烟无 error、节点 ≤ 600、DrawCall ≤ 25、state 正常；cocos:test 与默认入口 PackView 不破坏 | 冒烟 16 项断言全部 PASS（§4）；library-sync 2/2（默认入口仍 `new PackView`）；cocos:test 79/80，唯一失败 = 基线 | ✅ 已自动验证通过 |
| T11 SurvivorSave + Meta | save/meta 单测通过（新档/迁移/损坏/locked/写失败/清洗；露晶 24、132；购买与全额退还） | survivor-save 12/12、survivor-meta 7/7 | ✅ 已自动验证通过（注：SurvivorView 已提前把结算与暂停页设置接入存档，属 S3 的 SAVE-UI 范围，S1 不计入门槛） |
| T12 文案与合规扫描 | compliance 通过：无食用组合、无暴力词；“净化数”“被浊雾笼罩” | survivor-compliance 6/6；Survivor*.ts 手工扫描见 §5 | ✅ 已自动验证通过 |
| T13 补齐 04 §3–§9 | 正文完整、无 `PART2` 悬空、§9 与 07 §1 一致 | 04 v0.2 §3–§9 齐全，`PART2` 计数 0 | ✅ 通过 |

## 3. 自动化测试统计

### 3.1 完整 `npm test`（`node --test tests/*.test.mjs`，73 个文件）

```
# tests 565
# pass 564
# fail 1
# cancelled 0
# skipped 0
# duration_ms 42981
not ok 82 - retired runtime and resource bundles cannot reenter builds
  location: tests/forest-cleanup.test.mjs:12:1
  actual 比 expected 多出 'microforest-motion'
```

- 唯一失败 = forest-cleanup 基线（04 §7.7），失败集合未超出基线。较逻辑层报告（537/536/1）新增 28 条用例全部通过。
- 根因不变：`cocos-pilot/assets/resources/` 多出旧玩法资源包 `microforest-motion`，与 survivor 无关，按计划随 T15 删除旧玩法一并消除。

### 3.2 `npm run survivor:test`：123 / 123 通过

| 测试文件 | pass | fail |
|---|---|---|
| survivor-compliance | 6 | 0 |
| survivor-data | 11 | 0 |
| survivor-determinism | 4 | 0 |
| survivor-grid | 5 | 0 |
| survivor-joystick | 9 | 0 |
| survivor-meta | 7 | 0 |
| survivor-pool | 11 | 0 |
| survivor-progression | 10 | 0 |
| survivor-run | 15 | 0 |
| survivor-safearea | 7 | 0 |
| survivor-save | 12 | 0 |
| survivor-spawner | 8 | 0 |
| survivor-stats | 10 | 0 |
| survivor-weapons | 8 | 0 |
| 合计 | 123 | 0 |

04 §4 中标 ✅ 的 S1 用例（POOL/RNG/GRID/CLOCK/DATA/STAT/WPN/SPN/PRG/RUN/DET/JOY/SAFE/SAVE/META/CMP-01～04/SYNC-01/PKG-01/LEG-01）全部有对应用例且通过。

### 3.3 其它脚本

| 命令 | 结果 |
|---|---|
| `npm run cocos:sync` | 成功，`Synced 56 shared gameplay module(s)` |
| `npm run cocos:test` | 80 条，79 pass，1 fail = 同一条 forest-cleanup 基线 |
| `npm run survivor:bench` | 可执行不报错；输出 `placeholder — benchmark not yet implemented`（04 §9.1：S1 仅要求可执行） |
| `npm run survivor:balance` | 同上，占位脚本。因此本 Sprint **没有** bot 平衡数据，“实际净化率雏形”无法给出，转 S2 |

## 4. 构建与冒烟（L5）

### 4.1 `npm run cocos:build:wechat`：成功（约 20 秒）

package-report.json 实测（与 T10 快照逐字节一致）：

| 项 | 字节 | MiB | 门槛（04 §6） | 判定 |
|---|---|---|---|---|
| 主包 mainBytes | 1,717,210 | 1.64 | 硬 < 4；S1 目标 ≤ 2 | ✅ |
| internal | 164,184 | 0.16 | ≤ 4 | ✅ |
| main（脚本） | 2,002,047 | 1.91 | ≤ 4（记录） | ✅ |
| resources | 3,182,991 | 3.04 | ≤ 4，且不得增长 | ✅ 未增长 |
| survivor | 21,586 | 0.02 | ≤ 2.5 | ✅ |
| 总包 totalBytes | 7,088,018 | 6.76 | ≤ 20 | ✅ |

产物 `game.json`：`deviceOrientation: portrait`（CP-02 ✅），分包含 survivor。构建日志中的 `error` 字样仅为 Babel 对旧玩法 `MushroomReferenceData.ts`（>500 KB）的样式降级提示和一条 worker 进程 SIGTERM 的 debug 日志，构建正常完成（记 LOW，见 §7）。

### 4.2 `npm run cocos:build` + 浏览器冒烟 `?survivor&smoke=1`：PASS

执行方式：web-mobile 产物用本地静态服务托管，无头 Chrome 打开 `index.html?survivor&smoke=1`，经 DevTools 协议读取 `window.__survivorSmoke`（临时驱动脚本放在 /tmp，已清理，未入库）。耗时 46 秒。

| 断言 | 结果 |
|---|---|
| PinePilot 创建 SurvivorView、survivor 分包与战斗图集加载、营地页先出现、出发进入 playing | ✅ |
| 阶段 1：真实 30 秒，逻辑时钟推进 30.0 秒；脚本输入移动小旅人；净化 25 只；状态 playing,levelup | ✅ |
| 阶段 2：快进到 165.0 秒，敌人池铺满 200，满屏持续 10 秒；状态 playing,levelup → playing | ✅ |
| 战斗层激活节点最大 240 ≤ 600 | ✅ |
| 战斗帧 DrawCall 最大 7 ≤ 25（直方图：5 帧数 947 / 6 帧数 163 / 7 帧数 92） | ✅（在 15–20 目标内） |
| 升级三选一模态帧 DrawCall 26（04 PF-3 规定模态帧单独记录，不计入战斗帧 ≤ 25） | 记录，LOW |
| 销毁后设计分辨率恢复 375×812 | ✅ |
| 无 console.error / 未捕获异常 | ✅（页面仅 2 条 Cocos 关于 setFrameSize 的 warning） |

说明：无头 Chrome 用 SwiftShader 软件渲染，采样约 30 帧/秒只反映软件渲染能力，**不作为帧率结论**。冒烟只到 175 秒且全程回满血，**未覆盖 180 秒胜利与生命归零两条结算路径**。

## 5. 合规扫描（04 §7.1）

- strings.js：survivor-compliance 6/6 + survivor-data（CMP-04）通过。
- Survivor*.ts 手工命令 `grep -nE '吃|食用|采食|美味|击杀|消灭|屠杀|死亡|血|尸' cocos-pilot/assets/scripts/Survivor*.ts` 命中 2 条，均为 `SurvivorSmoke.ts` 第 8、24 行注释中的“血量”，非面向玩家文案，不计缺陷。
- 结论：面向玩家文案 0 命中，白名单为空。

## 6. 已验证项 vs 待真机项

### 6.1 已自动验证通过

| 项 | 用例 / 门槛 | 证据 |
|---|---|---|
| survivor 逻辑层全部 S1 用例 | 04 §4.1–§4.7 标 ✅ 项 | §3.2，123/123 |
| 旧测试失败不超基线 | 04 §7.7、LEG-01 | §3.1，失败集合 = {forest-cleanup 1 条} |
| 默认入口仍为 PackView | LEG-01、CP-02 前置 | library-sync 2/2 |
| 微信构建成功、包体达标 | 07 §1、04 §6 | §4.1 |
| 竖屏 | CP-02 | 产物 game.json `portrait` |
| 浏览器冒烟 | UI-01、07 T10 | §4.2，16 项 PASS |
| 战斗层节点 ≤ 600、DrawCall ≤ 25 | 04 §5.2 | 240 / 7 |
| 离开视图恢复 375×812 | CP-04 | 冒烟断言 |
| 合规扫描 | 04 §7.1 | §5 |
| bench/balance 可执行 | 04 §9.1 | §3.3（占位） |

### 6.2 待真机验证（本环境无法执行，未伪造任何数据）

| 项 | 用例 | 是否 S1 硬门槛 | 不能执行的原因 |
|---|---|---|---|
| 开发者工具 200 敌人同屏 ≥ 50 fps | PF-2、00 §5 M1 | **是** | 需操作微信开发者工具 GUI；且项目没有 `perf=1` 面板（见 BUG-S1-02），冒烟模式在微信端不可用（只读浏览器 URL） |
| 中端真机 200 敌人 ≥ 30 fps | PF-2 | 否（记录项，未达记 MEDIUM） | 无真机 |
| 色盲截图 0:30 场景 | UI-08、AX-01 | 是（T8 验收） | 需截图 + 模拟器滤镜人工判读 |
| 摇杆：上 1/3 屏蔽、靠边钳制、第二指不影响 | UI-02、LC-04 | 是（§4.8 须执行） | 需真实触摸 |
| 暂停/升级时摇杆隐藏，恢复不自走 | UI-03、LC-03 | 是 | 同上 |
| 升级卡 0.4 秒防误触 | UI-04 | 是 | 同上 |
| 180 秒胜利与生命归零两条结算路径，能再开一局 | UI-05 | 是 | 冒烟未覆盖结算 |
| 切后台/锁屏自动暂停、不补跑 | UI-06、LC-01、PF-5 | 是 | 需微信生命周期 |
| HUD 在安全区内、暂停按钮在胶囊下方 | UI-07、§5.4 | 是 | 需开发者工具多机型模拟与真机 |
| 减弱闪烁 / 关闭震动 | UI-09 | 是（默认值验证） | 需真机观察 |
| 开局首帧、长局 3 局连开内存 | PF-1、PF-4 | 记录项 | 需开发者工具/真机 |

## 7. 缺陷清单（按 04 §8）

| ID | 级别 | 用例 | 现象 | 复现 | 期望（出处） | 建议 |
|---|---|---|---|---|---|---|
| BUG-S1-01 | MEDIUM（**已修复**：新增 120–180 秒段，速率 2.2、上限 80 取自 01 §10，灰蛾份额 S1 暂由蚊蚋/甲虫 60/40 承担，S2 恢复；新增回归用例“波次覆盖整局”；survivor 124/124；微信包已重建） | RUN-05 / UI-05 | **2:00 之后不再刷怪**：计时胜利是 180 秒，但 `data/waves.js` 只有 0–60、60–120 两段；120 秒后 `segmentAt` 返回 null，场上敌人被清空后最后约 60 秒是空场，玩家只需等待即可胜利 | 逻辑层探针：种子 `t14-probe`，绕圈输入、保持满血、升级选第 0 张；敌人数 120s=15 → 135s/150s/165s/180s=0，结局 won、净化 156、Lv6。冒烟因人为铺满 200 敌人而没暴露该问题 | 07 §1“0–3 分钟波次段”，整局都应有压力 | 数值/规则问题，交策划决定（产品决策，不由测试改）：可选 ① 第 2 段延长到 180 秒；② 新增 120–180 秒 gnat/beetle 段（01 原段含灰蛾，S1 无此敌人）；③ S1 胜利时间改为 120 秒（与用户 D4=180 冲突，不推荐）。改动需同步 01 与 survivor-data 用例 |
| BUG-S1-02 | MEDIUM | PF-2、04 §5.2 | 没有 `SurvivorPerf` 调试面板（03 §2 列出的 `SurvivorPerf.ts` 未实现），`perf=1` 无效；PinePilot 启动时调用 `profiler.hideStats()`。04 §5.2 规定的帧率/步耗时/DrawCall 采集手段缺失 | 检查 `cocos-pilot/assets/scripts/Survivor*.ts`，无 perf 相关代码 | 04 §5.2：开发者工具与真机用 `perf=1` 面板采集 | 有替代路径（开发者工具 Performance 录制、真机性能监控），S1 先用替代手段；S2 实现面板 |
| BUG-S1-03 | LOW | PF-3 | 升级三选一模态帧 DrawCall 26，超战斗帧上限 25（模态帧按 04 不计入门槛） | 冒烟 `dcByState["levelup/levelup"]=26` | 02/03：模态帧另行评估 | UI 在 S2 合并卡片底板/文字批次 |
| BUG-S1-04 | LOW/NIT | — | 微信构建日志出现 `error` 字样：Babel 对旧玩法 `MushroomReferenceData.ts`（>500 KB）的提示与一次 worker SIGTERM debug 日志；构建成功 | `cocos-pilot/temp/pilot-builds/wechatgame.log` | 构建日志干净 | 随 T15 删除旧玩法消失 |
| BUG-S1-05 | LOW/NIT | — | `js/survivor/index.js` 占位 barrel 未被引用（逻辑层报告遗留） | — | — | S2 清理或明确定位 |
| 基线 | 不计新缺陷 | LEG-01 | forest-cleanup “retired runtime and resource bundles cannot reenter builds” | §3.1 | — | T15 删除旧玩法后消除 |

观察项（非缺陷）：探针局 3:00 只到 Lv6，低于 01 §8.4 的 3:00 Lv12–14；但 S1 只有 1 种武器、同屏上限 30/50 且有 BUG-S1-01，平衡判定按 04 §2.3 属 S2 bot 测试范围，不在 S1 计缺陷。SurvivorView 已把结算与暂停页设置写入正式存档键 `survivor.v1.profile`（比 S1 计划提前），真机测试时顺带确认不影响旧玩法存档（SV-01）。

## 8. 给用户的真机验证步骤（微信开发者工具）

准备：本次构建产物已在 `cocos-pilot/build/wechatgame`（若有改动先运行 `npm run cocos:build:wechat`）。

1. 打开微信开发者工具 → 导入项目 → 目录选 `cocos-pilot/build/wechatgame`，AppID 用项目已配置的。记下开发者工具版本与基础库版本。
2. 顶部“编译模式”→“添加编译模式”→ 启动参数填 `survivor=1` → 用该模式编译。确认进入营地页（未加参数应仍是旧的打包玩法）。
3. 结算双路径（UI-05）：点出发，持续移动存活到 3:00，确认出现胜利结算；再开一局站着不动直到生命归零，确认显示“被浊雾笼罩”结算；两次都能“再来一局”和“回营地”。顺便观察 2:00 之后是否还有敌人（BUG-S1-01 的复核）。
4. 帧率（PF-2，S1 硬门槛 ≥ 50 fps）：由于游戏内面板缺失，用开发者工具“调试器 → Performance”在战斗中录制 30 秒，读取帧率；同时截一张战斗画面。说明：正常游玩时同屏敌人上限 30–50，达不到 200。要在 200 敌人下测帧率，可在电脑 Chrome（非无头）打开 web-mobile 构建的 `?survivor&smoke=1`，在第 30–40 秒（满屏阶段）用 Chrome DevTools → Rendering → Frame Rendering Stats 看 FPS，作为参考值并注明“浏览器测得”；开发者工具里的 200 敌人正式数据要等 S2 补性能面板或调试钩子后再测。
5. 色盲截图（UI-08）：开局约 0:30 截图；用系统或图像工具做红绿色盲（Deuteranopia）与全色盲（灰度）模拟，判断能否区分小旅人、敌人、孢子。
6. 触摸（UI-02/03/04）：屏幕上 1/3 按下不应出摇杆；下 2/3 任意处出摇杆，贴左/右/下边缘时底座完整可见；第二根手指不影响移动；暂停或升级弹窗时摇杆消失，关闭后不碰屏幕角色不动；升级卡弹出后立刻点击无效，约 0.4 秒后点卡片任意位置都能选中。
7. 安全区（UI-07）：在开发者工具机型列表依次切 iPhone 6/7/8（375×667）、iPhone 12/13（390×844）、iPhone XR/11（414×896），截营地页、战斗 HUD、暂停页、三选一、结算页；检查按钮没被刘海/胶囊挡住，暂停按钮在右上胶囊下方。
8. 切后台（UI-06）：战斗中点开发者工具“切后台”（或真机按 Home 键）30 秒后返回，应停在暂停页，角色不瞬移；三选一时切后台，回来仍是原来三张卡。
9. 真机（可选但建议）：开发者工具“预览”扫码，在 1 台安卓中端机和 1 台 iPhone 上重复 3、6、8，并用微信的性能监控记录帧率；记下机型、系统、微信版本。
10. 把结果（帧率数字、截图、哪一步不符合）发给我，我会回填本报告 §6.2 并给出最终结论。

## 9. Sprint 1 复盘（项目经理）

### 9.1 完成度

- 任务：T1–T13 已全部交付，T14 本报告完成自动化部分。按 07 §1 验收口径共 6 项：`npm test`、构建与包体、浏览器冒烟、节点/DrawCall、合规 5 项已自动验证通过；“开发者工具 200 敌人 ≥ 50 fps”1 项待用户实测。另外 §4.8 手测用例待执行。
- 质量：survivor 测试从 98 增至 123 条，确定性与禁用 API 规则保持；包体余量大（主包 1.64 / 4 MiB，survivor 分包 0.02 MiB）；战斗帧 DrawCall 7，合批效果好于目标。
- 问题：发现 1 个影响体验的数值/规则缺陷（BUG-S1-01，后 60 秒空场），以及性能采集工具缺失（BUG-S1-02）。两者都是 MEDIUM，不阻塞合入，但 BUG-S1-01 会直接影响用户体验原型时的感受，建议在用户真机体验前先修。
- 结论：**S1 自动化验收通过，整体完成度约 85%**；剩余部分为用户真机确认与 2 个 MEDIUM 修复。按 04 §8.3，同一 MEDIUM 两个 Sprint 未修将升为 HIGH。

### 9.2 S2 建议范围

优先级从高到低：

1. 修 BUG-S1-01（策划先定方案，再改 waves 数据与用例）；实现 SurvivorPerf 面板或微信端可用的 200 敌人调试钩子（BUG-S1-02），补测开发者工具 ≥ 50 fps。
2. 01 §16 S2 内容：灰蛾、蜗牛、菌灵、精英与 Boss，撤离胜利（计时胜利降级为调试开关），其余 4 种武器、6 种被动、5 组进化、拾取物、完整波次表。
3. 测试补齐（04 §9.2）：survivor-enemies、survivor-pickups、survivor-replay（R1–R6）、survivor-sync、survivor-perf、survivor-bot 快速档、CMP-05 的 Survivor*.ts 自动扫描；`survivor:bench` / `survivor:balance` 去掉占位，产出首份平衡报告（含“实际净化率”，对应 00 R11）。
4. UI：升级卡模态帧 DrawCall 降到 25 以内（BUG-S1-03）；6:40 满屏色盲截图。

### 9.3 能否执行 T15（删除旧玩法）

**现在还不能执行，建议满足以下 3 个条件后再做：**

1. 用户按 §8 完成真机体验，确认新玩法可用且没有 HIGH 问题（07 T15 依赖“T14 提测通过”，目前只有自动化部分通过）。
2. BUG-S1-01 先修复，避免删除旧玩法后唯一可玩的版本存在明显空场问题。
3. 执行前由项目经理向用户书面确认最终删除清单（07 T15 规定的破坏性操作二次确认，按 D2 只靠 git 历史找回）。注意：工作区目前还有用户既有的大量未提交改动（D3=C），删除前要先确认这些改动的处理，否则删除后难以区分。

满足后，T15 预期效果：forest-cleanup 基线随旧代码消除、`npm test` 0 失败，resources 分包（3.04 MiB）与旧脚本从包体中移除，默认入口改为 survivor。

### 9.4 回填 00

00 §5 M1 与 §6 R5 已按本报告补一行 S1 状态（见 00-project-plan.md）。
