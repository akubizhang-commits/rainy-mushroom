> **2026-11-09 编排会话更正（以本段为准）**：下文第 1、2、7 节把视觉判为“未达成”，依据的是最初的任务说明，没有包含用户后续的确认。用户在真实浏览器（构建自 `dae43555` 与 `95ab19e7`）中实机体验后，明确确认了以下视觉规格：
> - 移除最外圈白色细圆线与所有从中心放射的长直判定剑（只改画面，判定不变）。
> - 冰晶莲瓣只分外层、内层两层，两层同时出现、同时顺时针旋转，**外层快、内层慢**（1.6 / 0.7 rad/s）。这推翻了最初“内层快、外层慢”的视觉要求；判定内部转速 10.05 / 8.17 / 6.6 rad/s 只用于结算，不绘制。
> - 两层同时出现，因此“外→中→内”三轮顺序只体现在伤害结算上，画面上不区分。
> - 透视椭圆只作视觉，判定保持圆形。
> 因此第 2 节所列 B1–B3 不是缺陷。无头截图拍不到涡旋层是截图方法的已知限制，视觉以用户实机验收为准。用户另行接受了存档重置（开发期约定，仅塔模式）。本分支已全部合入主线 `codex/crafting-minigames`（`62de5b02`、`ca6abb52`、`c440e376`）。被拒的“三层、内快外慢”v4 改动未入库，补丁保存在 `.agents/tasks/rainy-mushroom-codex-qinglian-redo-2026-11-09-2026-11-09/rejected-v4-three-layer.patch`。

# 青莲剑阵重做：设计与验收说明

- 分支：`codex/qinglian-redo-2026-11-09`
- 基线：`e5b65c59c075c23aa19cca0019d48e0843425691`（主线 `codex/crafting-minigames`）
- 当前 HEAD：`c0e49e9c`（提交本文件后会更新）

## 结论概要

判定规则已按规格实现并通过测试：3 秒、每秒一轮、外 16 瓣 20% → 中 12 瓣 35% → 内 8 瓣 45%、目标数不限、同一目标 36 次命中、冷却 9 秒。全量测试新增失败为 0，Cocos web-mobile 构建成功，实机脚本在两个视口通过。

视觉实现未达到规格，且 `build-review.json` 与 `live-review.json` 的 CHANGES_REQUESTED 结论在 HEAD 中仍有效：
- 涡旋两层的旋转快慢与规格相反（外层 1.6 rad/s，内层 0.7 rad/s；规格要求内层快、外层慢）。
- 画面上没有判定用的莲瓣，只有两张静态贴图的旋转圆盘，没有中层 12 瓣，也没有每轮逐层展开。
- 画面与判定没有共用几何。

因此本分支还不能视为验收完成。合并建议见第 7 节。

## 1. 设计：规格对应的实现位置

| 规格 | 实现位置 | 状态 |
|---|---|---|
| 1. 冷却 9 秒、法力 8、解锁 7 级（炼气巅峰）、阶段不变 | `js/xianxia/TowerGrowth.js` 第 19 行（阶段）、第 185–189 行（`cooldown: 9`、`damage: damageCurve(8, 1.15)`）；`js/xianxia/TowerSkillTiming.js` 第 48 行（起阵 `[.8, .4]`） | 已达成，未改动 |
| 2. 持续 3 秒，每秒一轮；三层环顺时针旋转，内层快、外层慢 | 时长：`TowerGrowth.js` `duration: 3`、`hit_interval: 1`；`TowerSkillForms.js` 第 89–90 行（`hits: 3`、`interval: 1`、`duration: skill.duration`）。判定旋转：`TowerSkillForms.js` 第 127 行 `QINGLIAN_SPIN = [10.05, 8.17, 6.6]`（内、中、外），第 131–137 行 `qinglianPetalPose`，角度 = 初始角 − ω·t，即顺时针 | 判定部分已达成。**渲染部分未达成**，见第 2 节 |
| 3. 三轮伤害 外 16 瓣 20% → 中 12 瓣 35% → 内 8 瓣 45%，单瓣伤害 = 占比 ÷ 瓣数，整招预算 8×1.15^(阶数−1) | 占比：`TowerGrowth.js` 第 117–122 行 `QINGLIAN_RINGS`（`share` 为 .45/.35/.20，瓣数 8/12/16，索引 0 为内层）。结算：`js/xianxia/TowerRun.js` `_qinglianPulse`（约第 2090–2105 行），`perHit = z.damage × ring.share ÷ ring.visualPetals`；轮次顺序由 `qinglianRingForPulse` 决定（第 1 轮外、第 2 轮中、第 3 轮内） | 已达成（代码与测试）；实机日志中每轮单目标命中数为 16 / 12 / 8 |
| 4. 目标数不设上限 | `TowerGrowth.js` `target_cap: null`；`TowerSkillForms.js` 第 90 行 `targetCap: null`；`TowerRun.js` `_qinglianPulse` 没有 `slice` 截断；`_zones` 第 798 行允许青莲的 `targetCap === null` | 已达成 |
| 5. 同一目标合计 36 次命中，三轮伤害之和即整招伤害 | `js/xianxia/TowerSkillForms.js` `qinglianRoundHits`（约第 155–168 行）：每轮逐瓣判断扫过方位。测试：`tests/xianxia-tower-skill-forms.test.mjs` 第 693–697 行，中心位于 0 与 205（边缘）处均得 36 次 | 已达成。注意：该判定是解析式的角度区间判断，不是逐帧采样 |
| 6. 技能图标已验收，不改动 | `cocos-pilot/assets/resources/tower-skill-icons/sj_qinglian.png` 与 `e5b65c59` 相比无差异（`git diff --quiet` 已确认） | 已达成 |
| 7. 不减速，只结算剑扫过的环；判定与渲染共用同一几何 | 不减速：`_qinglianPulse` 只输出伤害 outgoing，没有状态效果。判定几何：`qinglianPetalPose`。渲染：`cocos-pilot/assets/scripts/QinglianVortexArt.ts` 与 `QinglianFormationArt.ts` 没有使用 `qinglianPetalPose` | 不减速已达成；**几何共用未达成**，见第 2 节 |
| 8. 存档版本、阶段表、共鸣、技能树结构不变；若存档结构变化，说明并只重置本模式存档 | `js/xianxia/TowerCampaign.js` 第 52–53 行 `SCHEMA = 90`（原 89），注释第 52 行说明原因。存档 key 不变 | 结构变化见第 6 节 |

### 视觉与素材处理

- 参考图：`design/xianxia-qinglian-2026-11-09/source/vortex-reference-1536x1024.png`，去灰底后生成透明层。原图保留在 `source/`，未被覆盖。
- 处理脚本：`scripts/art/qinglian_vortex_layer.py`、`qinglian_vortex_boost.py`、`qinglian_vortex_split.py`（PIL 程序化处理，不调用 Scenario，未消耗付费额度）。
- 产物：`design/xianxia-qinglian-2026-11-09/processed/` 下的 `qinglian-vortex-layer-v1/v2.png`、`qinglian-vortex-outer-v3.png`、`qinglian-vortex-inner-v3.png`、`qinglian-pool-v1/v2.png`、`qa-on-dark.png`。运行时副本位于 `cocos-pilot/assets/resources/tower-skill-fx/`。
- 渲染入口：`TowerView.ts` 第 97 行创建 `QinglianVortexArt`，该类读取两张涡旋贴图与阵眼水面贴图，按 `qinglianVortexSpin()` 旋转。
- 去掉的内容：`QinglianFormationArt.ts` 文件头注释写明，早先的弧刃与细环以及放射状判定剑已不再绘制。规格第 2 条与视觉规格中的外层弧刃随时间展开，与此不一致，见第 2 节。

## 2. 实现上的必要偏差与未达成项

### 必要偏差（已在实现中做出，需要用户知晓）

1. **三环半径统一为 200。** 原环半径为 90 / 150 / 200。若保留分层半径，一个目标只会被部分环扫到，无法达到规格第 5 条的 36 次。判定剑从阵眼辐射到 200，三环的区别改为瓣数、转速、宽度与透明度。
2. **判定旋转速度。** 规格只说内层快、外层慢，没有数值。为保证每瓣在一轮内至少扫过一次目标方位，取值为内 10.05、中 8.17、外 6.6 rad/s（每轮转角均超过 2π）。
3. **命中按一轮内的扫过次数计。** 同一瓣在同一轮内扫过同一目标一次计 1 次，转过超过一圈也只计 1 次。
4. **受击反馈强度。** `js/xianxia/TowerHitFeedback.js` 第 14 行，青莲的 `graze` 强度由 .6 改为 .35，时长仍为 .12，因为每秒会频繁命中。
5. **存档 schema 由 89 改为 90。** 见第 6 节。
6. **涡旋渲染用两层贴图代替三层莲瓣环。** 这一项是为了通过验收之前的实现选择，没有对应规格的明确依据，属于未达成项，见下。

### 未达成项（与规格不符）

- **旋转方向与快慢在画面上相反。** `QinglianFormationArt.ts` 第 61 行 `QINGLIAN_SPIN_RAD_PER_SEC = {outer: 1.6, inner: .7}`，外层比内层快。判定中内层最快，画面与判定不一致。规格第 2 条要求内层快、外层慢。`build-review.json` 的 B1 指出了这一点，HEAD 中仍未修复。
- **判定莲瓣未被绘制。** `QinglianFormationArt.ts` 的 `drawQinglianWindup` 只画阵眼；`drawQinglianBurst` 不再画瓣。`build-review.json` 的 B2 指出，规格第 7 条要求渲染与判定共用几何，此项未达成。
- **中层 12 瓣不可见，三轮顺序不可见。** `QinglianVortexArt.ts` 只有外、内两层贴图，两层的透明度同时从 zone 开始时变化，没有在第 1、2 秒各自出现。B3 指出此问题，未修复。
- **去掉弧刃与细环是否经用户确认，目前只有记录。** `live-verification.md` 记载用户在真实浏览器中验收（构建自 `95ab19e7`）。本次任务交接中没有该确认的原文。规格第 2 条与视觉规格却要求外层弧刃展开，因此需要用户再确认。
- **实机验证未针对 HEAD 最终渲染重做。** `live-review.json` 与 `build-review.json` 的 B4 指出：视觉修改在 `95ab19e7` 之后，实机结果 `live-results.json` 来自更早的运行；视觉贴图是否出现在实机帧中，无头截图无法判断。

## 3. 测试

### 相关测试

| 命令 | 结果 | 来源 |
|---|---|---|
| `node --test` 五个相关文件（判定与结构相关） | 161 通过，0 失败 | 提交 `9607eaff` 消息 |
| `node --test` 四个渲染与反馈相关文件 | 292 通过，0 失败 | 提交 `95ab19e7` 消息 |
| `node --test` skill-forms、formation-art、stage-growth、skill-point-budget | 140 通过，0 失败 | 提交 `4e262c61` 消息 |
| `npm run cocos:test` | 6 通过，0 失败 | 提交 `4e262c61`、`95ab19e7` 消息 |

### 全量测试与基线对照

- 基线（`e5b65c59`，`baseline/full-tap.txt`）：2399 项，2398 通过，1 失败。
- 本分支最终运行（`full-test-final.txt`）：2403 项，2402 通过，1 失败。
- 失败名两侧一致，均为 `not ok 721 - encyclopedia shows fixed stats, unique quality and explicit art gaps`（基线已知失败，不计入新增）。
- **新增失败数：0。**

### Cocos web-mobile 构建

- `npm run cocos:build` 成功，日志见 `build-web-mobile-final.txt`，输出 `cocos-pilot/build/web-mobile`。镜像已同步（`npm run cocos:sync`，79 个模块）。

## 4. 平衡对照

完整数据与逐层表格见 [balance-comparison.md](balance-comparison.md)。原始 JSON 在 `balance/before/`、`balance/after/`。

- **8 层 × 3 流派**（剑气 qi、剑阵 formation、御剑 yujian）：改动前后的逐局受伤与秒数完全相同，因为这三个流派的购买列表不含青莲。
- **青莲流派（额外运行，`balance/*/qinglian.json`）**：通关局数（每层 4 局）在第 3 层从 2 增至 3，其余层不变。第 6 层平均受伤从 1033.5 增至 1475.7，第 8 层从 5001.8 降至 3924.8，第 9 层从 5824.7 降至 4822.4。`balance-comparison.md` 没有收录该流派的表格，这一点需要补充或由用户确认是否需要。
- **群怪场景**（`qinglian-group-damage.mjs`，种子 101/211/307，6 层，1 阶）：
  - 单目标：1556.3 → 1556.4（+0.0%）。
  - 10 个目标（在 200 像素内）：**7538.2 → 13260.9，+5722.7，+75.9%**。原因是取消了原 `target_cap: 6`，并且每个目标现在会受到 36 次命中。
- 按规格要求，数值未做调整。这个群怪伤害上升需要用户判断是否接受。

## 5. 实机验证

- 结果：[live-verification.md](live-verification.md)，原始数据 `browser/live-results.json`，日志 `browser/live-run-log.txt`。
- 视口：1280×720 与 844×390，横屏。
- 脚本：`scripts/verify-qinglian-live.cjs`（输出目录已改为本报告目录）。

各项结果（来自 `live-results.json` 的字段）：

| 检查 | 结果 |
|---|---|
| 解锁：Lv6 学习失败，Lv7 学习成功 | 两个视口均通过（`learn-*.png`） |
| 3 秒、每秒一轮的时间点 | 两个视口的 `pulseLog`：0.783 / 1.783 / 2.783 秒（第二次施放 9.783 / 10.783 / 11.783） |
| 每轮命中数：外 16、中 12、内 8 | 两个视口、两次施放的每个目标均符合 |
| 射程内目标每次施放命中 36 次 | 10 个射程内目标各 16+12+8；`hitsWholeWindow` 为 72，是两次施放合计 |
| 射程外目标（距离 262）不受伤 | 命中 0 次，伤害 0 |
| 冷却 9 秒 | `cooldownIntervals` 为 [9] |
| 暂停冻结、恢复 | 暂停探针 phase 为 paused，恢复后为 playing |
| 死亡 → lost；退出 → camp | 两视口 `phase` 为 lost，退出后 `runAlive` 为 false，screen 为 camp |
| 页面错误 | 无 |

需要注意的问题（都已在数据中，报告未能解释）：

- **死亡不是真实致死。** 当前提交的脚本把玩家血量设为 0 后手动推进，不是由战斗伤害致死。`live-review.json` 明确指出此点。`live-verification.md` 中“真实致死”的说法对应的是已撤回的补丁，不在本提交中。
- **轮次时间有两套数据。** `pulseLog`（游戏内部计时）为 0.783 等；`pulses`（脚本 50 毫秒轮询）为 1.35（1280×720）、0.78（844×390）。`live-verification.md` 解释为轮询延迟，但与数据不完全吻合，`live-review.json` 已指出。以 `pulseLog` 为准。
- **暂停时长的数字对不上。** `live-verification.md` 写为四个 0.3 秒分段、0.867 秒；JSON 中只有一个暂停探针，时间为 0.8167（1280×720）与 0.8833（844×390）。
- **同一招内目标伤害不一致。** 1280×720 中，`live-0`（距离 25）受伤 2915.76，其余射程内目标均为 2358.99，两者命中次数相同（72）。原因未查明。

### 录像与截图路径（均在工作树内，未提交，见第 7 节）

- 截图：`browser/sj_qinglian-{cast,paused,after-resume,death,exit}-{1280x720,844x390}.png`，`browser/learn-*.png`；同名的 `sj_wanjian-*` 为对照技能。
- 录像：`browser/video-sj_qinglian-1280x720/`、`browser/video-sj_qinglian-844x390/`，以及 `browser/video-learn-*`、`browser/video-sj_wanjian-*`（均为 `.webm`）。
- 早先一次运行的数据在 `live/`（含部分录像）。`browser-attempt1-before-review/` 为审查前的尝试，仅留存。
- 视觉结论：无头截图拍不到涡旋层。用户在真实浏览器中的验收记录见 `live-verification.md`，但与第 2 节的未达成项相互矛盾，需用户重新确认。

## 6. 存档

- **结构变化：是。** `SCHEMA` 由 89 改为 90（`js/xianxia/TowerCampaign.js` 第 52–53 行）。原因是战斗快照中的青莲 zone 结构（伤害含义、脉冲数、目标上限）已改变，旧快照无法通过 `validFormZone` 校验。
- **重置范围：只有塔模式存档。** 按 AGENTS.md 的开发期约定，不做兼容，旧档直接重置为新档。存档 key 为 `xianxia.sect-tower.campaign.v1`，不删除其他游戏、账户或工作文件。
- **注意：** 这会重置整个塔模式的进度，不只是青莲。用户需要知道此事。

## 7. 合并建议

- **分支：** `codex/qinglian-redo-2026-11-09`
- **基线：** `e5b65c59c075c23aa19cca0019d48e0843425691`（合并前需确认主线 `codex/crafting-minigames` 的 HEAD 是否仍为该提交）
- **提交范围：** `e5b65c59..HEAD`，共 9 个提交（包括本说明的提交）：
  - `9607eaff` 三轮判定、不限目标、36 次命中
  - `4e262c61` 涡旋贴图、实机脚本、平衡复跑
  - `c37a6f5c` 群怪伤害对照（B2）
  - `dae43555` 未完成的 v2 涡旋层（B1 未完成，标注为 wip）
  - `95ab19e7` 去掉弧刃与细环，涡旋拆为外、内两层
  - `48f7cac5` 8×3 流派曲线与群怪对照文档
  - `9f3028e2` 实机验证脚本与记录
  - `c0e49e9c` 实机验证报告
  - 本说明的提交
- **建议的合并方式：由用户决定，本次不执行合并。** 倾向于 squash 合并为一个提交，避免 `dae43555`（wip）与中间修复进入主线历史。若需要保留逐步记录，则使用普通 merge。
- **合并前需用户确认的事项：**
  1. 视觉是否先修复再合并。当前 B1（旋转快慢反了）、B2（判定莲瓣未绘制）、B3（中层与轮次不可见）仍未修复。建议先修复、再在 HEAD 重跑实机并重新录像（即 B4）。这属于新的开发工作，需要用户决定是否在本次完成。
  2. 去掉弧刃与细环（`95ab19e7`）是否符合用户意图。规格的视觉部分要求外层弧刃展开。
  3. 存档重置（第 6 节）：塔模式全部进度会被重置，用户需要接受。
  4. 群怪伤害 +75.9%（第 4 节）是否接受。
  5. 死亡验证不是真实致死，是否补做真实致死的实机验证。
  6. 录像、截图、`.err` 日志与 `browser-attempt1-before-review/` 目前均未纳入 git（`git status` 显示为未跟踪）。若不提交，合并后这些证据路径将失效；若提交，`.webm` 文件体积较大。由用户决定。
  7. 工作树根目录有一个未跟踪的 `reports/equipment-integer-v2-2026-11-03/two-slot-budget.json`，不属于本任务，合并时不要纳入。
- **可合并的部分：** 判定规则、测试与镜像同步、平衡工具、受击反馈、说明文字，以及构建与全量测试（新增失败 0）。
