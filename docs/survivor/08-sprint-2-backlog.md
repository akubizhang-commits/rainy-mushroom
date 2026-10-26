# 雨后菌语 · Sprint 2 看板（项目经理）

版本 v0.1 · 阶段 M2 前半 / Sprint 2 · 依据：01-gdd §6–§10、§12、§15，03 §3，07 看板，reports/sprint-1-test-report.md，用户试玩反馈
本文是 Sprint 2 的唯一任务依据，数值规则一律以 01/03 为准；本文只裁定范围与顺序。

## 1. Sprint 目标

用户试玩反馈“玩法太单调”，已确认原因是**内容太少**而不是方向错。S2 目标：**让每局构筑不同、节奏有起伏、有 Boss 收尾的完整一局（约 8 分钟）**。

按优先级的四项（用户已同意，全部要做）：

1. 构筑：新武器 菌伞旋刃 umbrella_blades、露珠环 dew_ring；新被动 might、cooldown、area、speed；三选一可抽到新武器 / 武器升级 / 被动。
2. 敌人与节奏：灰蛾 moth、雨夜蜗牛 snail、迷途菌灵 sporeling（浊雾泡）；波次按 01 §10 补到 Boss；**必做** 2:30 蚊蚋包围圈。
3. 打击感与音效：受击闪白、净化光点、轻微震屏；拾取 / 升级 / 受击 / 净化音效。
4. Boss 浊雾巨蜗 boss_mist_snail → cleansing 演出 → extract 撤离胜利，替代 180 秒计时胜利（计时胜利降为调试开关）。

可选（第一批有余量才做，不阻塞检查点）：4:30 灰蛾横穿、6:30 蜗牛围墙、5:00 精英 elite_beetle。

## 2. 明确不做（S2）

- 进化（5 组进化、进化卡、金色边框）——01 §8.2 第 1 条、§8.3 在 S2 关闭。
- ~~武器 raindrop、leaf_boomerang；~~（2026-09-11 用户拍板：两把武器提前到 S2，见 K8 与 L9）被动 regen（露水叶片）、magnet（孢子罗盘）。数据里保留空占位，抽卡池必须排除。
- 拾取物露珠 / 大露珠 / 一阵林风（01 §11）。S2 局内回血只有兜底卡“一捧露水”和撤离阶段每秒 +5。若做精英，精英只掉孢子（偏离 01 §11，S3 补）。
- 局外成长 UI、新手提示完善、广告、埋点、正式美术。
- 自动性能降档（03 §7.4）。

## 3. 关键决策（PM 裁定，开发不再二选一）

| # | 决策 | 理由 |
|---|---|---|
| K1 | 计时胜利改为 SurvivorRun 选项 `debug.timedWinSec`（默认不启用），从 data/waves.js 删除 `winAtSeconds`；浏览器 `?survivor&win=180` 才传入 | 正式胜负只走 Boss/撤离；调试与冒烟仍可快速结束一局 |
| K2 | 波次最后一段 `7:00–Boss 击败` 用 `toSec: null` 表示开放区间，validate 只允许最后一段为 null | 数据须可 JSON 往返，不能写 Infinity |
| K3 | 抽卡池只纳入“`levels` 非空的武器”和 `data/passives.js` 中存在的被动；首升保底改为 01 §8.2 第 5 条“至少 1 张新武器卡” | 排除占位武器与未做被动，规则仍走 01 的权重 10/8/6 与兜底卡（2026-09-11 用户拍板：权重改为 10/8/4，见 K11） |
| K4 | cleansing 时被净化的敌人计入净化数但不掉孢子 | 01 §9.3 只规定不掉孢子；“净化数”是玩家成就感来源 |
| K5 | 音效用 Node 脚本**程序化生成** 8-bit 风格 wav（单声道 22.05 kHz），不引入外部素材 | 无许可风险；生成脚本即“来源记录”，脚本头注释写明“自制、无第三方素材”；总量 ≤ 300 KB（03 §6.4），可后续替换 |
| K6 | 01 §8.4 成长节奏与 §15.3 Boss DPS 校验按 5 武器 + 进化估算，S2 只有 3 武器、无进化。S2 先保留 Boss 生命 10000，由 L7 平衡脚本实测 Boss 战时长；中位数 > 90 秒时由策划先改 01 §9.2 再改数据 | 文档优先；避免凭空改数。**已触发**：实测中位 192 秒，处理见 K7 |

### 3.1 2026-09-11 平衡决策（依据 reports/sprint-2-logic-preview.md）

用户已按报告 §3 建议全部拍板；第 6–8 条由策划裁定。01 已先行改文档（各处标注“2026-09-11”），开发按下表改数据与实现（L9–L12）。

| # | 来源 | 决策 | 01 位置 | 最终数值 |
|---|---|---|---|---|
| K7 | 2026-09-11 用户拍板 | Boss 浊雾巨蜗生命下调（K6 已触发） | §9.2、§15.3 | 10000 → **4500**（按实测 52 DPS 约 87 秒） |
| K8 | 2026-09-11 用户拍板 | 雨滴坠击 raindrop、落叶回旋镖 leaf_boomerang 提前到 S2，Lv1–Lv5 按 01 §6.4/§6.5；进化仍不做 | §5、§6.4、§6.5、§16 | S2 共 **5 武器**，武器栏 **4 格不变**，每局必须放弃一把 |
| K9 | 2026-09-11 用户拍板 | 0:00–1:00 刷怪速率上调；1:00 等级目标按数据修正 | §10、§8.4、§15.2 | 刷怪 1.0 → **1.3/秒**；1:00 目标 5–6 → **Lv5（新手/保守允许 Lv4）**。推算：60 秒 78 只蚊蚋 = 78 经验上限 < Lv6 门槛 88；按实测约 87% 净化、熟练拾取约 90% → 约 61 经验 ≥ Lv5 门槛 57 |
| K10 | 2026-09-11 用户拍板 | 孢子拾取半径上调 | §5、§15.1 | 60 → **100** |
| K11 | 2026-09-11 用户拍板 | 新被动卡权重下调 | §8.2 | 升级 **10** / 新武器 **8** / 新被动 6 → **4**；进化卡、兜底卡不参与加权 |
| K12 | 2026-09-11 策划裁定 | 6:30 蜗牛围墙减量并留缺口 | §10 | 20 → **14 只**，半径 400 不变；16 槽 × 22.5°，槽角 = θf + 22.5° × (k + 0.5)，跳过 k = 0、15（缺口正对角色朝向 θf，张角 67.5°），不用随机数 |
| K13 | 2026-09-11 策划裁定 | Boss 超时兜底：在 10:00 狂暴 I 之后追加狂暴 II 和雾壳剥落；**不做超时判负** | §3、§9.2、§15.1、§15.4 | 10:00 狂暴 I：移速 ×1.3、伤害 ×1.5。11:00 狂暴 II（替换 I）：移速 ×1.6（72）、伤害 ×2.0、技能冷却 ×0.5（召唤 4 / 冲撞 3 / 泡环 5 秒，泡环不再要求 <50%）、Boss 受到伤害 ×1.5。12:00 起每满 60 秒受到伤害 +0.5：×2.0 / 2.5 / 3.0 / 3.5，16:00 起封顶 ×4.0 |
| K14 | 2026-09-11 策划裁定 | 2–4 分钟熟练型偏轻松（报告 §3-8）**本轮不改**，记为待观察 | — | 等 K9/K10/K11 落地、重跑平衡后再看熟练型 1–4 分钟受击数；仍为 0.0–0.3 次/分钟时，再评估 2:00–4:00 spawnRate +15% 或灰蛾横穿提前到 3:30 |

报告 §3-7（Boss 段同屏只有 12–13 只）随 K7 缩短 Boss 战后不做。报告 OBS-3（完整档耗时）不改实现，提测时在空闲机器上跑。

### 3.2 2026-09-11 第二轮平衡决策（依据 reports/sprint-2-tuning-report.md）

L12 复核结论为“再调”：通关率总体 55% 达标，但熟练型 76% 超上沿、新手型 Boss 战中位 95 秒超 K6 阈值、偏好露珠环/落叶回旋镖的新手型只有 14%、12:00 后仍在场 5 局（OBS-4）。用户按报告 §4 建议拍板第 1、2、4、6 条（K15–K18）；第 5、7、8 条由策划裁定（K19、K20）。01 已先行改文档（各处标注“2026-09-11 第二轮”），开发按下表改数据与实现（L13–L15）。

| # | 来源 | 决策 | 01 位置 | 最终数值 |
|---|---|---|---|---|
| K15 | 2026-09-11 第二轮 用户拍板（报告 §4-1 (a)、OBS-4） | 狂暴 II 起 Boss 贴近追击，保证任何武器组合都能打到 Boss；**不做超时判负**（K13 不变） | §3、§9.2 贴近追击、§15.4 | 11:00 起：d（中心距）> **120** 进入追近，d ≤ **90** 退出；追近移速固定 **320**（> 角色理论最高 257.6，满速时每秒仍追近约 62），不乘狂暴倍率、不受露珠环减速；非追近 72 不变；追近期间不起手冲撞（冷却到 0 后保持就绪），已在预警/冲撞中不打断，冲撞速度仍 180；进入追近发 `bossApproach` 事件；不消耗随机数 |
| K16 | 2026-09-11 第二轮 用户拍板（报告 §4-2 (b)） | 熟练型偏轻松：2:00–4:00 刷怪加速；Boss 生命不动 | §10、§15.2、§15.3 | spawnRate 2:00–3:00 2.2 → **2.53**、3:00–4:00 2.8 → **3.22**（各 +15%）；同屏上限 80 / 110 不变；Boss 生命保持 **4500**。K14 观察项就此关闭 |
| K17 | 2026-09-11 第二轮 用户拍板（报告 §4-4 (a)），数值策划推算 | 露珠环半径、落叶回旋镖射程上调，其余字段不变 | §6.3、§6.5 | 露珠环半径 Lv1–5 / 进化：60/75/75/90/90/120 → **80/95/95/115/115/145**；落叶回旋镖最远距离：220/220/220/280/280/300 → **280/280/280/340/340/360**。推算见 01 §6.3、§6.5（按保守型“最近间隙 ≥ 60、斥力 260”的打法覆盖其敌人带；露珠环 Lv1 对 Boss 可达 136 ≥ K15 的 120）。复核目标：新手型偏好露珠环 / 落叶回旋镖通关率由 14% / 14% 升到 **≥ 30%**；熟练型偏好两者不高于本次 90% / 84% + 3 个百分点，熟练型合计不高于 76% |
| K18 | 2026-09-11 第二轮 用户拍板（报告 §4-6 (a)） | 孢子拾取半径再上调 | §5、§15.1 | 100 → **140** |
| K19 | 2026-09-11 第二轮 策划裁定（报告 §4-5） | 6:00–7:00 段同屏上限下调，削保守型峰值堆积 | §10 | 200 → **160**；生成速率 4.8 不变；6:30 蜗牛围墙走全局硬上限 200（160 + 14 = 174，可完整生成），K12 缺口规则不变 |
| K20 | 2026-09-11 第二轮 策划裁定（报告 §4-7、§4-8） | 前期等级曲线（3:00 / 5:00 低于目标）与随机选卡偏弱**本轮不改**，记为待观察 | §8.4 | xpToNext、§8.4 目标、抽卡权重 10/8/4 均不变；L15 复核照常记录 Lv@3:00/5:00 与随机选卡通关率，S3 进化上线后按 01 §8.4 原始设定复核 |

报告 §4-3（新手型 Boss 战 95 秒）随 K15、K17 一起处理，不单独改 Boss 生命。报告 OBS-5（bot `prefer:` 排序口径）不改，保持与前两次可比。

### 3.3 2026-09-11 第三轮平衡决策（依据 reports/sprint-2-tuning-round2.md）

第二轮复核出现两项硬问题：总体通关率 72%（熟练型 89%），12:00 后仍在场 1 局（balance-33）。项目负责人代用户按报告 §4 建议拍板（用户前两轮均为“按建议”）。01 已先行改文档（标注“2026-09-11 第三轮”），开发按下表改数据与实现（L16）。

| # | 来源 | 决策 | 01 位置 | 最终数值 |
|---|---|---|---|---|
| K21 | 2026-09-11 第三轮 用户拍板（报告 §4-1 (b)+(c)），数值策划按 25 种子试跑定值 | 通关率口径改为新手型 30–60%、熟练型 ≤ 80%（总体不再作硬门槛）；4:00–7:00 加压，不动 Boss 生命 | §9 迷途菌灵、§10、04 §2.3 | 迷途菌灵 fireInterval 3 → **2**；4:00–5:00 / 5:00–6:00 / 6:00–7:00 组成 蚊蚋/甲虫/灰蛾/蜗牛/菌灵 = **25/25/20/10/20**、**20/25/20/15/20**、**20/20/20/15/25**（原 35/…/10、30/…/10、30/…/15）；生成速率、同屏上限、Boss 生命 4500 不变。试跑中只加 4:00–6:00 刷怪速率（+15% / +30%）对熟练型几乎无效（91% → 87–88%），未采用 |
| K22 | 2026-09-11 第三轮 用户拍板（报告 §4-2 (b)） | Boss 出现后连续 60 秒未受到任何伤害，立即开始贴近追击（与 K15 同一套规则），触发后本场保持；11:00 规则保留 | §9.2 无伤触发 | `approach.idleSec = 60`；起点 = max(出现时刻, enemy.lastHitTime)；只用时间与命中记录，不消耗随机数 |

新的硬门槛（L16 复核）：`npm test` 与确定性全过；12:00 后仍在场 0 局；新手型通关率 30–60%；熟练型 ≤ 80%；通关局构筑种数 ≥ 27。L15 中“总体通关率 30–60%”一条由此取代。

## 4. 任务表

预估：S ≈ 0.5–1 人日，M ≈ 1–2 人日，L ≈ 3–4 人日。
通用验证：逻辑任务跑对应 `node --test tests/survivor-*.test.mjs` + `npm run survivor:test`；改了 js/survivor 后跑 `npm run cocos:sync`；表现层任务跑 `npm run cocos:sync && npm run cocos:build` 与 `npm run cocos:test`；每项完成后 `npm test` 全绿。

### 第一批 · 逻辑层（全部 node --test 可验证；表现层只做不崩兜底）

#### L1 · 数据：两把武器、四个被动、三种敌人、完整波次

- 角色：策划（核数）+ 前端开发
- 描述：按 01 §6.2/§6.3 填 `data/weapons.js` 的 umbrella_blades、dew_ring 五档（evolved 保持 null）；新建 `data/passives.js`（might/cooldown/area/speed，每级效果与 Lv5 合计按 01 §7）；`data/enemies.js` 加 moth/snail/sporeling（01 §9 表，含摆动、远程参数）与 boss_mist_snail（§9.2 数值与三个技能参数）；`data/waves.js` 按 01 §10 补 3:00–7:00 与 7:00–Boss 段（K2），新增 `events` 数组（2:30 包围圈必填；4:30/5:00/6:30 先写入但带 `optional: true`），删除 `winAtSeconds`（K1）。`validate.js` 去掉对 umbrella/dew 空 levels 的豁免，加 passives、events、null toSec 校验。同步改 01 §16 S2 行，注明以本文为准。
- 依赖：无
- 验收：`node --test tests/survivor-data.test.mjs` 通过——validate() 为空；新武器 / 被动 / 敌人 / Boss 数值与 01 表逐项相等；波次段 0→420 首尾相接、组成和 100、上限 ≤ 200；可 JSON 往返；原“winAtSeconds=180”用例改为断言字段已移除。
- 预估：M
- 文件：js/survivor/data/weapons.js、passives.js（新）、enemies.js、waves.js、validate.js、tests/survivor-data.test.mjs、docs/survivor/01-gdd.md（§16 注释）

#### L2 · 被动与属性合成、多武器状态

- 角色：前端开发
- 描述：`run.weapons` 改为最多 4 把的数组、`run.passives` 为 `{id: level}`；`Stats.computeStats(PLAYER, bonuses, passives)` 读 passives.js 计算 might/cooldown（下限 0.5）/area/moveSpeed（01 §15.1），选卡时重算。`summary().passives` 输出实际被动。
- 依赖：L1
- 验收：`node --test tests/survivor-stats.test.mjs tests/survivor-run.test.mjs` 通过——各被动 Lv1/Lv5 的属性值等于 01 §15.1 计算；cooldown 5 级 + 局外不低于 0.5；speed 被动改变玩家每步位移。
- 预估：S
- 文件：js/survivor/Stats.js、SurvivorRun.js、tests/survivor-stats.test.mjs、tests/survivor-run.test.mjs

#### L3 · 菌伞旋刃与露珠环

- 角色：前端开发
- 描述：在 `Weapons.js` 加 umbrella_blades（`angle = ω·t + 2πi/n` 解析位置，不占池；片半径 16×area；单敌受击间隔按整件武器、受 cooldown 影响；击退）和 dew_ring（半径×area、间隔伤害、圈内减速取最大值不叠加、无击退）。`Enemies.js` 的敌人对象加 `hitAt: Float64Array(5)` 与 `slow`，step 4 清零、由光环重设（03 §3.4/§3.5）。
- 依赖：L2
- 验收：`node --test tests/survivor-weapons.test.mjs` 通过——菌伞片数/半径/角速度按档位；多片同时碰到同一敌人只结算一次；间隔内不重复伤害；露珠环圈内敌人减速、出圈立即恢复、两来源取大；area 被动放大两者范围；确定性测试仍通过。
- 预估：M
- 文件：js/survivor/Weapons.js、Enemies.js、tests/survivor-weapons.test.mjs

#### L4 · 三选一完整抽卡

- 角色：前端开发
- 描述：重写 `Progression.draftOffer(state, rng)`：候选池 = 已有未满级武器/被动升级卡（权重 10）+ 栏位未满时未拥有武器（8）+ 未拥有被动（6），按 K3 过滤；加权不放回抽 3 张；不足用兜底卡补；首升保底至少 1 张新武器卡；不出进化卡。卡片结构 `{kind:'weapon'|'passive'|'heal'|'crystal', id, level, isNew}`。`SurvivorRun._applyCard` 支持新增武器、武器升级、被动新增/升级。
- 依赖：L2
- 验收：`node --test tests/survivor-progression.test.mjs` 通过——3 张不重复；首升必含新武器；raindrop/leaf_boomerang/regen/magnet 永不出现；满级不再出升级卡；全部满级后只出兜底卡；固定种子 10 000 次抽卡的类型频率与权重比误差 < 5%。
- 预估：M
- 文件：js/survivor/Progression.js、SurvivorRun.js、tests/survivor-progression.test.mjs

#### L5 · 三种敌人行为、浊雾泡、2:30 包围圈与可选事件

- 角色：前端开发
- 描述：`Enemies.js`：moth 追踪方向叠加垂直摆动（振幅 40、周期 1.2 秒）；snail 直线追踪；sporeling 距离 >180 追近、≤250 每 3 秒吐浊雾泡。新增 `mistBubbles` 池（容量取 limits），在 step 9 移动并与玩家碰撞，玩家弹体不与其碰撞。`Spawner.js` 读 `waves.events` 按时间各触发一次：2:30 24 只 gnat 在半径 350 圆上等距生成；optional 事件（moth 横穿 `behavior:'cross'` 飞出即静默回收、snail 围墙、elite_beetle 冲撞）有余量再做，没做的保持 optional 不触发。所有事件受 200 硬上限。
- 依赖：L1、L3（敌人新字段）
- 验收：新增 `tests/survivor-enemies.test.mjs`（04 ENM-01）与扩充 `tests/survivor-spawner.test.mjs` 通过——moth 横向偏移振幅≈40；sporeling 停距与吐泡间隔正确，泡 3 秒后回收、命中玩家扣 6 并触发无敌；2:30 那一步恰生成 24 只（或到上限）且等距；3:00/4:00 首次出现 snail/sporeling；波次组成统计在容差内。
- 预估：L
- 文件：js/survivor/Enemies.js、Spawner.js、SurvivorRun.js、Pool 配置（data/limits.js）、tests/survivor-enemies.test.mjs（新）、tests/survivor-spawner.test.mjs

#### L6 · Boss、cleansing、extract 与胜利改造

- 角色：前端开发
- 描述：6:58 发 `bossWarning`，7:00 在玩家正上方屏外用预留槽生成 boss_mist_snail（r56，进 grid 的 large 列表，不受重定位与成长公式）。三个技能独立计时：召唤 12 gnat/8 秒、雾壳冲撞（0.8 秒预警 + ×2.5 冲 1 秒，发 `bossCharge`）、生命 <50% 时浊雾泡环。10:00 狂暴。Boss 生命 0 → `cleansing`（1.5 秒、玩家无敌、全场敌人与浊雾泡净化，K4）→ `extract`（距玩家 250 随机方向生成半径 50 撤离点，停止刷怪、每秒回 5、连续停留 2 秒 → won，离开清零）。`advance` 在 cleansing/extract 也推进；`summary()` 填 bossDefeated。计时胜利只在 `debug.timedWinSec` 存在时生效（K1）。
- 依赖：L5
- 验收：`node --test tests/survivor-run.test.mjs tests/survivor-determinism.test.mjs` 通过——快进到 7:00 出现 Boss 且只出现一次；召唤遵守上限；<50% 才放泡环；10:00 狂暴移速 +30%、伤害 +50%；Boss 归零 → cleansing → extract → 停留 2 秒 won、中途离开进度清零；cleansing 期间不受伤；无 debug 选项时 180 秒不会胜利；同种子两次运行哈希一致。
- 预估：L
- 文件：js/survivor/SurvivorRun.js、Enemies.js、Spawner.js、tests/survivor-run.test.mjs、tests/survivor-determinism.test.mjs

#### L7 · 平衡脚本与多种子文字预览

- 角色：测试（脚本）+ 策划（读数）
- 描述（2026-09 S3 A5 按现行脚本改写，BUG-S2-04 / 09 S3-D4）：`scripts/survivor/preview-run.mjs` 为单种子文字预览，用法 `node scripts/survivor/preview-run.mjs <seed> [--move flee|spore] [--pick random|prefer:<id>] [--every N] [--max-sec N]`（默认 preview-001 / spore / random / 30 / 1020）：random 选卡用 SeededRandom(`${seed}:bot`)，`prefer:<id>` 偏好某武器；输出每 N 秒快照、每次三选一与选择、Boss 战与撤离过程、结局、存活时间、等级、最终构筑、净化率。多种子统计由 `npm run survivor:balance` 承担（不给 preview-run 补 `--seeds/--strategy`）。`scripts/survivor/balance.mjs` 去掉占位：默认 50 种子 × 2 策略，汇总胜率、时长分布、构筑组合种数、各卡出现率、Boss 战中位时长，写 JSON 到 `tmp/survivor-balance.json`、终端打印摘要。脚本不改数据文件。
- 依赖：L4、L6
- 验收：`npm run survivor:balance` 无异常跑完且 `diag.droppedTime` 为 0，并输出多种子构筑表；`node scripts/survivor/preview-run.mjs preview-001 --pick random` 输出可读的单局过程与构筑；同参数两次输出一致。
- 预估：M
- 文件：scripts/survivor/preview-run.mjs、scripts/survivor/balance.mjs

#### L8 · 表现层不崩兜底 + 文案与合规

- 角色：前端开发 + 运营（文案）
- 描述：只保证新逻辑跑在现有画面里不崩：`SurvivorView` 在 cleansing/extract 状态继续 advance 与开启输入；`SurvivorBattleArt` 未知敌人种类回退到 beetle/gnat 帧、Boss 暂用放大 beetle 帧；菌伞片、露珠环、浊雾泡暂用已有 spore/白块帧；`SurvivorHud` 卡片按 `strings` 中 `card_<id>` 取名称与描述，缺失时显示通用文案。运营在 `data/strings.js` 补新武器 / 被动卡名与描述、“浊雾正在聚集”“击败浊雾巨蜗，雨就会停”“走进阳光撤离”；浏览器 URL `win=180` 传入 K1 调试开关。
- 依赖：L4、L6
- 验收：`node --test tests/survivor-compliance.test.mjs` 通过；`npm run cocos:sync && npm run cocos:build` 成功；`npm run cocos:test` 通过；浏览器 `?survivor&smoke=1` 冒烟无 error；`npm test` 全绿。
- 预估：M
- 文件：cocos-pilot/assets/scripts/SurvivorView.ts、SurvivorBattleArt.ts、SurvivorHud.ts、js/survivor/data/strings.js、tests/survivor-compliance.test.mjs

### ★ 用户检查点（第一批结束，第二批开工前）

- 项目经理运行 `npm run survivor:balance`（多种子构筑表与结局摘要），另挑 5 个种子用 `node scripts/survivor/preview-run.mjs <seed> --pick random`（及 `--pick prefer:<id>`）出单局过程，一并发给用户。
- 进入第二批的门槛：5 个种子中至少 3 种不同的“武器组合 + 主被动”；3 把武器与 4 个被动在 5 局里每项至少出现 1 次；至少 1 局见到 Boss。附 Boss 战中位时长（K6）。
- 用户确认“构筑有分化”后才开第二批；用户不满意则回到 L1/L4 调整权重或数值（先改 01）。
- 2026-09-11 检查点结论：形式门槛过线，但武器维度没有分化、通关率 13%、Boss 战中位 192 秒。用户按报告 §3 建议拍板（§3.1 K7–K14），先做下面的“第一批追加”，复核通过后再开第二批。

### 第一批追加 · 平衡调整（2026-09-11 用户拍板/策划裁定，第二批开工前完成）

#### L9 · 雨滴坠击与落叶回旋镖（K8）

- 角色：策划（核数）+ 前端开发
- 描述：按 01 §6.4/§6.5 填 `data/weapons.js` 的 raindrop、leaf_boomerang 五档（evolved 保持 null），validate 去掉两者空 levels 的豁免。`Weapons.js` 加 raindrop（在 400 范围内随机选敌，同次多个落点优先选不同敌人；0.4 秒阴影后结算，落点在阴影出现时锁定；无敌人时落在角色周围 150–300 的随机位置；随机数走 run 的 SeededRandom）和 leaf_boomerang（沿角色朝向掷出，多片 25° 扇形；无限穿透，去程、回程对同一敌人各结算一次；回程追角色当前位置，回到角色身边回收；最远距离受 area 影响）。弹体走 Projectiles 池，计入玩家弹体上限 150。K3 过滤自动纳入两把武器（levels 非空），武器栏 4 格不变。L8 表现层兜底：雨滴阴影和落叶暂用已有帧，`strings.js` 补 `card_raindrop`、`card_leaf_boomerang` 名称与描述（运营，过合规扫描）。
- 依赖：L1–L8
- 验收：`node --test tests/survivor-data.test.mjs tests/survivor-weapons.test.mjs tests/survivor-progression.test.mjs tests/survivor-determinism.test.mjs` 通过：两把武器各档数值与 01 表逐项相等；雨滴阴影 0.4 秒后才结算、落点不追踪、同次落点不重复选敌、无敌人时落点距角色 150–300；回旋镖去程/回程各命中一次、不受穿透限制、回到角色时回收；抽卡池出现 5 把武器，拿满 4 把后不再出新武器卡；同种子哈希一致。
- 预估：L
- 文件：js/survivor/data/weapons.js、validate.js、strings.js、js/survivor/Weapons.js、Projectiles.js、tests/survivor-data.test.mjs、tests/survivor-weapons.test.mjs、tests/survivor-progression.test.mjs

#### L10 · 数值与事件调整（K7、K9–K13）

- 角色：前端开发
- 描述：只按 01 改数据和对应逻辑：
  - `data/enemies.js` boss_mist_snail 生命 10000 → 4500（K7）。
  - `data/waves.js` 0:00–1:00 段 spawnRate 1.0 → 1.3（K9）。
  - `data/player.js` pickupRadius 60 → 100（K10）。
  - `Progression.js` 新被动卡权重 6 → 4，权重写成数据常量便于测试（K11）。
  - 6:30 蜗牛围墙（K12）：现有 `waves.events` 的 `{atSec:390, type:'ring', enemy:'snail'}` 改为 count 14、radius 400 不变，新增 `gap: {slots:16, skip:[0,15], anchor:'facing'}`；按 01 §10 缺口规则以角色朝向排 16 槽、跳过 k = 0/15，k = 1→14 顺序生成，受 200 硬上限，不消耗随机数。2:30 蚊蚋包围圈不带 gap，行为不变。validate 校验 gap 字段（slots 为正整数、skip 在 0…slots−1 内、count = slots − skip 数）。
  - Boss 超时兜底（K13，01 §9.2）：`boss_mist_snail.enrage` 由单个对象改为按时间升序的阶段数组，沿用现有字段名：`[{atSec:600, speedMul:1.3, damageMul:1.5}, {atSec:660, speedMul:1.6, damageMul:2.0, cooldownMul:0.5, ringIgnoresHp:true, takenMul:1.5}]`，另加 `erosion: {fromSec:720, everySec:60, takenStep:0.5, takenMax:4.0}`；后档替换前档、不连乘；受到伤害倍率乘在取整前；每进入一个阶段（含每层剥落）发一次 `bossEnrage` 事件（带阶段号），表现层先只做不崩。不加超时判负。
- 依赖：L9（可与 L9 并行，合并前一起跑全量）
- 验收：`node --test tests/survivor-data.test.mjs tests/survivor-spawner.test.mjs tests/survivor-boss.test.mjs tests/survivor-progression.test.mjs tests/survivor-run.test.mjs tests/survivor-determinism.test.mjs` 通过：上述数值与 01 逐项相等；固定种子 10 000 次抽卡类型频率与 10/8/4 权重比误差 < 5%；围墙恰 14 只、角度等于 θf + 22.5° × (k + 0.5)（k = 1…14），缺口中心与朝向误差 < 1°，同状态两次生成位置逐一相等；快进到 10:00/11:00/12:00/16:00/17:00，Boss 的移速、伤害、冷却和受到伤害倍率依次等于 01 §9.2 表（17:00 仍为 ×4.0）；狂暴 II 下生命 >50% 也会放泡环；12:00 之后不会判负；`npm test` 全绿。
- 预估：M
- 文件：js/survivor/data/enemies.js、waves.js、player.js、validate.js、js/survivor/Progression.js、Spawner.js、Boss.js、SurvivorRun.js，对应 tests

#### L11 · 诊断口径拆分（报告 OBS-1）

- 角色：前端开发
- 描述：`diag.dropped.enemies` 目前把“同屏上限已满跳过的刷怪”（Spawner 段上限与全局硬上限，设计内行为）和“对象池满丢弃”（03 §10 错误处理）混在一起。拆成 `diag.capSkipped.enemies`（上限跳过，含 Boss 召唤与事件刷怪受限）和 `diag.dropped.enemies`（只计池满丢弃）；shots、bubbles 口径不变。同步改 `scripts/survivor/bot.mjs`、`balance.mjs`、`preview-run.mjs` 的汇总与提示文字：只对 `dropped` 和 `droppedTime` 提示“应为 0”，`capSkipped` 只展示数值。
- 依赖：无（可与 L9/L10 并行）
- 验收：`node --test tests/survivor-spawner.test.mjs tests/survivor-boss.test.mjs tests/survivor-run.test.mjs` 通过：段上限满时只加 capSkipped；人为把敌人池容量调小到满时只加 dropped；`node scripts/survivor/preview-run.mjs preview-003 --move flee --pick prefer:dew_ring` 输出两个独立计数，dropped 为 0；确定性测试仍通过。
- 预估：S
- 文件：js/survivor/SurvivorRun.js、Spawner.js、Boss.js、scripts/survivor/bot.mjs、balance.mjs、preview-run.mjs、对应 tests

#### L12 · 平衡复核（K7–K14）

- 角色：测试（脚本）+ 策划（读数）
- 描述：bot 选卡策略补 `prefer:raindrop`、`prefer:leaf_boomerang`；上限从 12:00 延长到 17:00，以覆盖 K13 全部阶段。重跑 `npm run survivor:balance`（50 种子 × 2 走位 × 随机 + 5 种偏好），出 `reports/sprint-2-balance-recheck.md`，对照报告 §1 表格新增一行“调整后”。重点看：Boss 战中位（目标 40–60 秒，> 90 秒或 < 40 秒都回到策划）；通关局时长（目标 6–9 分钟）；Lv@1:00（目标 Lv5，保守型允许 Lv4）；保守型拾取率与净化率；随机选卡的局到达 Boss 比例；武器组合种数（5 选 4，至少 4 种“放弃哪把”都出现在通关局）；6:30–7:30 阵亡占比；12:00 后仍在场的局数（目标 0，验证 K13）；K14 观察项：熟练型 1–4 分钟每分钟受击数。
- 依赖：L9、L10、L11
- 验收：报告齐全且所有数字来自真实运行；同参数两次结果一致；策划在报告末尾给出“过 / 再调（先改 01）”结论，并把结论发给用户确认后开第二批。
- 预估：M
- 文件：scripts/survivor/bot.mjs、balance.mjs、docs/survivor/reports/sprint-2-balance-recheck.md（新）
- 2026-09-11 结论：已完成，报告实际落在 `reports/sprint-2-tuning-report.md`，结论“再调”。用户按报告 §4 拍板第二轮（§3.2 K15–K20），先做下面的“第一批追加 II”，复核通过后再开第二批。

### 第一批追加 II · 第二轮平衡调整（2026-09-11 第二轮 用户拍板/策划裁定，第二批开工前完成）

#### L13 · Boss 贴近追击（K15）

- 角色：前端开发
- 描述：按 01 §9.2“贴近追击”实现，不加超时判负。
  - 数据：`data/enemies.js` 的 boss_mist_snail 新增 `approach: {fromStage: 2, enterDist: 120, exitDist: 90, speed: 320}`（fromStage 2 = 狂暴 II，含其后所有雾壳剥落层）。`validate.js` 校验：四个字段为正数；`enterDist > exitDist`；`exitDist > Boss 碰撞半径 + 角色碰撞半径`（56 + 18 = 74）；`speed` 大于 `PLAYER.moveSpeed × 1.15 × 1.4`（局外轻灵蕨步满级 × 蕨叶轻靴满级，= 257.6），不满足时 validate 报错。
  - 状态：`world.boss` 新增 `approaching: false`。`Boss.js stepBoss` 中，`b.enrageStage >= approach.fromStage` 且 `b.skill === 'chase'` 时：未追近且 d > enterDist → `approaching = true` 并发 `{type:'bossApproach'}`；追近中且 d ≤ exitDist → `approaching = false`。阶段不足 fromStage 时恒为 false。
  - 移动：追近中速度 = `approach.speed`，不乘 `speedMul`、不乘 `(1 − e.slow)`（e.slow 仍照常清零）；否则沿用现有 `e.speed × (1 − e.slow)`。
  - 冲撞：追近中不起手 windup；`chargeCd` 照常倒数但下限钳到 0（`Math.max(0, …)`），退出追近后由现有分支在下一步起手，且只起手一次。已在 windup / charge 中时不判定进入追近，结束后回到 chase 再判定。冲撞速度仍用 `speed × charge.speedMul`（非追近速度，= 180）。
  - 表现层：`bossApproach` 事件 S2 只需不崩（SurvivorView 忽略未知事件即可）。
- 依赖：L10（enrage 阶段数组已就位）
- 验收：`node --test tests/survivor-data.test.mjs tests/survivor-boss.test.mjs tests/survivor-determinism.test.mjs` 通过：approach 数值与 01 相等，validate 对 enterDist ≤ exitDist、exitDist ≤ 74、speed ≤ 257.6 各报错；快进到 10:59 把角色放到 Boss 300 外，Boss 速度仍为狂暴 I 的 58.5 且不追近；11:00 后同样布置，Boss 以 320 逼近、d ≤ 90 时速度回到 72；角色以 160 持续直线远离时，Boss 与角色距离在 2 秒内降到 ≤ 120，之后每个 3 秒冲撞周期内至少一次 ≤ 120；角色以 257.6 持续直线远离时，每 8 秒内至少一次 ≤ 120；追近期间不出现 windup，退出后下一步出现一次 windup；冲撞速度为 180；角色带露珠环时追近速度不变；固定种子 balance-15 `--move flee --pick prefer:spore_shot` 在 12:00 前 Boss 生命下降（不再停在 83%）；同种子两次哈希一致；`npm test` 全绿。
- 预估：M
- 文件：js/survivor/data/enemies.js、validate.js、js/survivor/Boss.js、tests/survivor-data.test.mjs、tests/survivor-boss.test.mjs

#### L14 · 第二轮数值调整（K16–K19）

- 角色：前端开发（策划核数）
- 描述：只按 01 改数据，不改逻辑：
  - `data/waves.js`：2:00–3:00 段 spawnRate 2.2 → 2.53，3:00–4:00 段 2.8 → 3.22，cap 80 / 110 不变（K16）；6:00–7:00 段 cap 200 → 160，spawnRate 4.8 不变（K19）。6:30 蜗牛围墙事件不改，仍只受全局硬上限 200。
  - `data/enemies.js`：boss_mist_snail 生命保持 4500（K16，只确认不改）。
  - `data/weapons.js`：dew_ring 各档 radius 改为 80 / 95 / 95 / 115 / 115，evolved 若有占位则写 145；leaf_boomerang 各档最远距离改为 280 / 280 / 280 / 340 / 340，evolved 占位写 360；其余字段不变（K17）。
  - `data/player.js`：pickupRadius 100 → 140（K18）。
- 依赖：无（可与 L13 并行，合并前一起跑全量）
- 验收：`node --test tests/survivor-data.test.mjs tests/survivor-weapons.test.mjs tests/survivor-spawner.test.mjs tests/survivor-run.test.mjs tests/survivor-determinism.test.mjs` 通过：上述数值与 01 §5、§6.3、§6.5、§10 逐项相等；validate() 为空；露珠环 Lv1 在角色 90 处的蚊蚋（中心距 ≤ 80 + 10）被命中；落叶回旋镖 Lv1 去程最远点距角色 280；6:00–7:00 段普通刷怪在场 160 只时停止生成，6:30 围墙仍生成 14 只；原有 waves 段首尾相接、组成和 100 的断言不变；`npm test` 全绿。
- 预估：S
- 文件：js/survivor/data/waves.js、weapons.js、player.js、对应 tests

#### L15 · 第二轮平衡复核（K15–K20）

- 角色：测试（脚本）+ 策划（读数）
- 描述：不改脚本口径（OBS-5 不改），重跑 `npm run survivor:balance`（50 种子 × 2 走位 × 随机 + 5 种偏好，上限 17:00）和报告 §6 的 4 条 preview，出 `reports/sprint-2-tuning-report-2.md`，对照 `sprint-2-tuning-report.md` 各表新增“第二轮”一列。重点与目标：
  - 12:00 后仍在场局数 = **0**（K15）；balance-15 / 43 / 39 / 4 四个复现种子都在 12:00 前结束。
  - 熟练型通关率回到 **≤ 60%** 或至少明显低于 76%；熟练型 1–4 分钟每分钟受击数（K16）。
  - 新手型偏好露珠环 / 落叶回旋镖通关率 **≥ 30%**；熟练型偏好两者 ≤ 93% / 87%（K17）。
  - 新手型 Boss 战中位 **≤ 90 秒**；全部 Boss 战中位目标 40–60 秒。
  - 新手型拾取率（K18，上次 56%）与净化率。
  - 新手型 6:30–7:30 阵亡占比（K19，上次 81%）与 6–7 分钟平均同屏数。
  - 总体通关率仍在 30–60%，通关局时长中位 6–9 分。
  - K20 待观察项照常记录：Lv@3:00 / 5:00、随机选卡通关率与到达 Boss 比例。
- 依赖：L13、L14
- 验收：报告齐全且所有数字来自真实运行；同参数两次结果一致；`diag.dropped`、droppedTime 为 0；策划在报告末尾给出“过 / 再调（先改 01）”结论，发给用户确认后开第二批。
- 预估：M
- 文件：docs/survivor/reports/sprint-2-tuning-report-2.md（新）

#### L16 · 第三轮调整与复核（K21、K22）

- 角色：前端开发 + 测试 + 策划
- 描述：`data/enemies.js` 迷途菌灵 fireInterval 3 → 2、Boss `approach.idleSec = 60`；`data/waves.js` 4:00–7:00 三段组成按 K21；`Boss.js` 加无伤触发；validate 校验 idleSec。重跑 600 局 balance 与 balance-33，结果追加到 `reports/sprint-2-tuning-round2.md`。
- 验收：§3.3 新的硬门槛全部满足；`tests/survivor-boss.test.mjs` 覆盖“60 秒无伤触发追击”“持续挨打不触发”；`tests/survivor-data.test.mjs` 断言新数值。
- 文件：js/survivor/Boss.js、data/enemies.js、data/waves.js、data/validate.js、对应 tests

### 第二批 · 表现层

#### P1 · 新实体几何占位美术

- 角色：UI（规格）+ 前端开发
- 描述：在 `scripts/survivor/pack-placeholder.mjs` 追加帧并重新生成 survivor-battle 图集与 `SurvivorBattleFrames.ts`：moth、snail、sporeling（各含 -flash 帧）、浊雾泡、菌伞片、Boss（≥112u 直径，含 -flash）、撤离光柱、冲撞箭头、方向指示箭头、雨滴落点阴影与雨滴、落叶（2026-09-11 随 K8 追加）；精英若已做则复用 beetle 帧放大 + 发光色。颜色与形状遵循 02 §1.2–§1.3（敌人灰紫雾描边、sporeling 净化为金色）。图集不够放时扩到 512×512，仍为单图集（裁决 D6）。BattleArt 去掉 L8 的回退映射，改用正式占位帧；露珠环用 Graphics 档位变化时重绘一次（03 §6.2）。
- 依赖：检查点通过
- 验收：`npm run survivor:art` 输出确定（重复运行字节一致）；`npm run cocos:build` 成功；冒烟战斗帧 DrawCall ≤ 25、节点 ≤ 600；survivor 分包 ≤ 2.5 MiB。
- 预估：M
- 文件：scripts/survivor/pack-placeholder.mjs、cocos-pilot/assets/survivor/survivor-battle.png/.json、cocos-pilot/assets/scripts/SurvivorBattleFrames.ts、SurvivorBattleArt.ts

#### P2 · HUD：武器栏、Boss 血条、撤离指示、提示横幅

- 角色：UI + 前端开发
- 描述：`SurvivorHud.ts` 加 4 格武器栏 + 4 格被动栏（图标 + 等级，仅在选卡后刷新）；Boss 出现后顶部血条（九宫格改宽度）；`bossWarning` 时 2 秒“浊雾正在聚集”横幅；extract 阶段屏幕边缘箭头指向撤离点 + 停留进度环；三选一卡片按 kind 区分边框色并显示“新”或“Lv a→b”。结算页显示本局武器与被动图标（01 §12）。顺带把三选一模态帧 DrawCall 压到 ≤ 25（BUG-S1-03）。
- 依赖：P1
- 验收：`npm run cocos:build` 成功；冒烟脚本断言 HUD 栏位数与 `run.weapons/passives` 一致、Boss 存在时血条可见；三选一模态帧 DrawCall ≤ 25；HUD 元素在 02 安全区内（UI-07 手测）。
- 预估：M
- 文件：cocos-pilot/assets/scripts/SurvivorHud.ts、SurvivorView.ts、SurvivorSmoke.ts

#### P3 · 打击感

- 角色：前端开发
- 描述：所有敌人与 Boss 受击闪白 0.1 秒（`run.time - lastHitTime`）；净化光点覆盖全部种类（sporeling 金色）；玩家受击红边 + 轻微震屏（幅度 ≤ 6u、0.15 秒），Boss 冲撞落地与 cleansing 开场各一次震屏；cleansing 1.5 秒全屏提亮演出。`reduceFlash` 开启时关闭闪白频闪与震屏、降低红边强度（02 无障碍）。效果全部在 FX 池内计时，不新增 Graphics 每帧重绘。
- 依赖：P1
- 验收：`npm run cocos:build` 成功；冒烟无 error、DrawCall ≤ 25；手测：受击可见、`reduceFlash` 下无震屏（UI-09）。
- 预估：M
- 文件：cocos-pilot/assets/scripts/SurvivorBattleArt.ts、SurvivorView.ts

#### P4 · 程序化占位音效 + SurvivorAudio

- 角色：前端开发
- 描述：新建 `scripts/survivor/gen-sfx.mjs`（K5）生成 hit、purify、pickup、levelup、hurt、boss_warn、win 七个 wav 到 `cocos-pilot/assets/survivor/audio/`，确定性输出、头注释写明“程序化自制、无第三方素材”。新建 `SurvivorAudio.ts`（03 §6.4）：6 个 AudioSource 轮转，最小间隔 hit 60 ms / purify 40 ms / pickup 50 ms，首次触摸后解锁，加载失败静默降级并 warn 一次，遵循设置 sound 开关。SurvivorView 由 drainEvents 驱动。新增 npm 脚本 `survivor:sfx`。
- 依赖：检查点通过（与 P1–P3 独立，可并行排期）
- 验收：`npm run survivor:sfx` 重复运行字节一致、总量 ≤ 300 KB；`npm run cocos:build:wechat` 成功、包体达标；冒烟无 error；手测：sound 关闭后无声、拾取密集时不爆音。
- 预估：M
- 文件：scripts/survivor/gen-sfx.mjs（新）、cocos-pilot/assets/survivor/audio/（新）、cocos-pilot/assets/scripts/SurvivorAudio.ts（新）、SurvivorView.ts、package.json

#### P5 · 冒烟扩展与性能面板（BUG-S1-02）

- 角色：前端开发 + 测试
- 描述：`SurvivorSmoke.ts` 增加阶段：快进到 7:00 断言 Boss 出现，再把 Boss 生命置 0 断言 cleansing → extract → 把玩家移入撤离点断言 won。新建 `SurvivorPerf.ts`（`perf=1` / 启动参数 `perf=1`）显示 FPS P50/P95、步耗时、各池计数、DrawCall，修复 S1 遗留 MEDIUM（04 §8.3：两个 Sprint 未修将升 HIGH）。
- 依赖：P2、P3、P4
- 验收：`npm run cocos:build` + `?survivor&smoke=1` 新断言全部 PASS、无 error；微信端 `perf=1` 面板可见（用户在开发者工具确认）。
- 预估：M
- 文件：cocos-pilot/assets/scripts/SurvivorSmoke.ts、SurvivorPerf.ts（新）、SurvivorView.ts

#### P6 · Sprint 2 提测与复盘

- 角色：测试 + 项目经理
- 描述：执行 `npm test`、`npm run survivor:balance`、`npm run cocos:build:wechat`、浏览器冒烟、CMP-05 手工扫描 Survivor*.ts；出 `reports/sprint-2-test-report.md`（平衡摘要、包体、DrawCall、缺陷清单、待真机项），把 Boss 战时长与净化率结论交策划，回填 00 §5/§6。
- 依赖：P5
- 验收：报告齐全；无 HIGH 遗留；`npm test` 全绿；用户真机试玩一局能打到 Boss 并撤离。
- 预估：M
- 文件：docs/survivor/reports/sprint-2-test-report.md、docs/survivor/00-project-plan.md

## 5. 依赖速览

L1 →（L2 →｛L3, L4｝）；L5 依赖 L1/L3；L6 依赖 L5；L7、L8 依赖 L4/L6 → **★ 用户检查点** →（2026-09-11 追加）｛L9, L10, L11｝→ L12（结论“再调”）→（2026-09-11 第二轮追加）｛L13, L14｝→ L15 → 用户确认 → P1 →｛P2, P3｝；P4 与 P1–P3 独立；P5 依赖 P2/P3/P4 → P6。可选事件（4:30/5:00/6:30）挂在 L5 内，不影响检查点。
