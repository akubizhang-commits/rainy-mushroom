# 雨后菌语 · Sprint 3 看板（项目经理）

版本 v0.1 · 阶段 M2 后半 / Sprint 3 · 依据：reports/sprint-2-test-report.md §8、§10.2–§10.4，reports/sprint-2-tuning-round2.md §7，01-gdd §8.2–§8.3、§11、§9、§14，04 §2.2–§2.3、§9.2，08 看板
本文是 Sprint 3 的唯一任务依据，数值规则一律以 01/03 为准；本文只裁定范围与顺序。

## 1. Sprint 目标

用户已决定继续优化现有游戏（之前调研的换方向已放弃）。S3 分两批：

- **第一批（本次执行）**：A 收尾 S2 欠账 → B 补齐进化与内容（原 MVP 与 S2 的差额）→ C 重跑平衡。结束后设 ★ 用户检查点，给用户看平衡对比与可试玩版本。
- **第二批（检查点之后）**：局外成长与营地 UI、新手引导、正式美术与音效方案、提审准备、内部试玩。本文只列标题和依赖（§6）。

## 2. 拍板记录（对 sprint-2-test-report §10.4）

用户前几轮均为“按建议”，本轮由项目经理按报告建议执行，用户可在 ★ 检查点推翻。

| # | 事项 | 结论 | 落地 |
|---|---|---|---|
| S3-D1 | BUG-S2-01 浊雾泡池满丢弃 | 选 **(a)**：敌方弹体硬上限、mistBubbles 池容量、渲染节点 40 → **60** | A1；同步 01 §10、03 §7.3/§6.2、04、`data/limits.js` |
| S3-D2 | 新手依赖雨滴坠击（§10.2 第 5 条） | 选 **(a)**：只在新手引导 / 卡面提示，**不改数值** | A6；进化上线后由 C1 复核是否还需要 (b) |
| S3-D3 | S3 范围与顺序 | 按 §10.3 的 1→7 推进；第一批 = §10.3 的 1、2 + 平衡复核，第二批 = 3–7 | 本文 |
| S3-D4 | BUG-S2-04 preview-run 不一致 | **改文档对齐脚本**，不给 preview-run 补 `--seeds/--strategy`：多种子已由 balance.mjs 承担，补参数是重复功能 | A5 |
| S3-D5 | 进化后金标准变化 | A2 先按 A1 后的规则生成 replay 金标准；B 系列每次有意改规则都用 `update-golden.mjs` 重生成，提交说明写明原因并引用 01 改动（04 §2.2-4） | A2、B1–B4 |
| S3-D6 | 正式美术与音效来源（§10.4 第 3 条后半） | **留到第二批 S3-11 决定**，第一批只做占位帧与卡面 | §6 |

真机试玩（§10.4 第 4 条、sprint-2-test-report §9）仍待用户执行，不阻塞第一批；PF-2 结果到达后若不达标，按 01 §18 第 4 条插入“降同屏上限”任务，优先于 B 系列。

## 3. 明确不做（第一批）

- 局外成长 UI、营地成长面板、存档接 UI（第二批）。
- 新手引导的完整流程（第一批只加雨滴坠击的卡面 / 首局提示文案，A6）。
- 正式美术与音效；进化、拾取物、精英只做几何占位帧。
- 改任何平衡数值（S3-D2）；C1 复核不达标时只出建议，到检查点由用户拍板，先改 01 再改数据。
- 广告、埋点、自动性能降档（03 §7.4）。

## 4. 任务表

预估：S ≈ 0.5–1 人日，M ≈ 1–2 人日，L ≈ 3–4 人日。
通用验证：逻辑任务跑对应 `node --test tests/survivor-*.test.mjs` + `npm run survivor:test`；改了 js/survivor 后跑 `npm run cocos:sync`；表现层任务跑 `npm run cocos:sync && npm run cocos:build` 与 `npm run cocos:test`，并跑浏览器 `?smoke=1` 冒烟；每项完成后 `npm test` 全绿、`npm run check` 通过。每项一个小提交，风格 `feat(survivor): ...` / `fix(survivor): ...` / `test(survivor): ...` / `docs(survivor): ...`。

### 第一批 · A 收尾 S2 欠账

#### A1 · BUG-S2-01 浊雾泡上限 40 → 60（S3-D1）

- 角色：架构师（预算）+ 前端开发
- 描述：`js/survivor/data/limits.js` 中 `hardCaps.enemyProjectiles`、`pools.mistBubbles`、`nodes.mistBubbles` 三处 40 → 60；表现层浊雾泡节点池若有硬编码 40 改为读 `LIMITS.nodes.mistBubbles`。文档同步：01 §10 全局上限“敌方弹体 40”→ 60；03 §7.3 池容量表、§6.2 渲染节点池、内存估算表的浊雾泡 40 → 60，并记一笔 DrawCall / 节点预算复核口径；04 涉及上限的用例同步。
- 依赖：无
- 验收：`node --test tests/survivor-data.test.mjs tests/survivor-pool.test.mjs tests/survivor-enemies.test.mjs` 通过（数值断言改为 60）；`npm run survivor:balance` 的 `diag.dropped.bubbles` = 0、敌人 / 弹体 dropped 0、droppedTime 0，其余硬门槛（08 §3.3）不退化；浏览器冒烟战斗帧 DrawCall ≤ 25、战斗节点 ≤ 600。若 60 仍有丢弃，记录数值交项目经理，不擅自再提。
- 预估：S
- 文件：js/survivor/data/limits.js、cocos-pilot/assets/scripts/SurvivorBattleArt.ts（如有硬编码）、tests/survivor-data.test.mjs、docs/survivor/01-gdd.md、03-architecture.md、04-test-plan.md

#### A2 · BUG-S2-02（上）确定性回放 R1–R6

- 角色：测试工程师 + 前端开发
- 描述：按 04 §2.2 落地回放：新建 `tests/fixtures/survivor/inputs-*.mjs`（站桩 / 绕圈 / 通关三份分段输入，通关输入用 bot.mjs 某个通关种子固化）、`tests/fixtures/survivor/golden.json`、`scripts/survivor/update-golden.mjs`（重生成金标准）、`tests/survivor-replay.test.mjs` 覆盖 R1–R6；状态哈希按 04 §2.2-3（FNV-1a，坐标 ×1000 取整）。新增 npm 脚本 `survivor:golden`。
- 依赖：A1（上限变化会影响回放结果，先改再固化）
- 验收：`node --test tests/survivor-replay.test.mjs` 通过：R1 lost 且 summary 等于金标准；R2 第 60/180/300 秒哈希相等；R3 won、bossDefeated、survivalSec ∈ [420, 600]；R4 暂停穿插与 R2 相同；R5 三种 advance 步长结果相同；R6 三个种子两次逐步一致。`npm run survivor:golden` 重复运行输出字节一致。
- 预估：M
- 文件：tests/survivor-replay.test.mjs（新）、tests/fixtures/survivor/（新）、scripts/survivor/update-golden.mjs（新）、package.json

#### A3 · BUG-S2-02（下）sync、perf + 真实 bench、bot 快速档

- 角色：测试工程师 + 前端开发
- 描述：
  - `tests/survivor-sync.test.mjs`：js/survivor 与 cocos-pilot/assets/scripts/shared 副本按 sync-shared.mjs 的 sha256 清单一致，清单覆盖全部 js/survivor 模块。
  - `scripts/survivor/bench.mjs` 去掉 T2 占位：200 敌人满载、全武器 Lv5 场景下跑固定步数，输出平均 / 最大单步耗时、热路径分配、8 分钟模拟堆增长，写 `tmp/survivor-bench.json`；`tests/survivor-perf.test.mjs`（PERF-01）以宽松阈值断言（单步 ≤ 2 ms、堆增长 ≤ 5 MB），实测值写进报告。
  - `tests/survivor-bot.test.mjs` 快速档：3 个种子 × 两种走位（flee / spore）+ random 选卡，断言跑完不抛错、终态、实体数不超池容量、summary 字段为有限数（04 §2.3 末段）。
- 依赖：A1
- 验收：`node --test tests/survivor-sync.test.mjs tests/survivor-perf.test.mjs tests/survivor-bot.test.mjs` 通过；`npm run survivor:bench` 输出真实数字（不再打印 placeholder），本机基线记入 C2 报告；`npm test` 总耗时增加 ≤ 30 秒。
- 预估：M
- 文件：tests/survivor-sync.test.mjs、survivor-perf.test.mjs、survivor-bot.test.mjs（均新）、scripts/survivor/bench.mjs

#### A4 · BUG-S2-03 结算页模态帧 DrawCall ≤ 25

- 角色：UI + 前端开发
- 描述：`SurvivorHud.ts` 结算页（胜利 / 失败）的武器与被动图标、面板、按钮改用同一图集 / 同材质，减少 Label 与 Sprite 交错打断合批（参考 P2 三选一从 26 降到 11 的做法）；`SurvivorSmoke.ts` 增加断言 `dcByState["won/result"]`、`["lost/result"]` ≤ 25。
- 依赖：无
- 验收：`npm run cocos:build` 成功；浏览器冒烟新断言 PASS、原 39 条不退化、无 console.error。
- 预估：S
- 文件：cocos-pilot/assets/scripts/SurvivorHud.ts、SurvivorSmoke.ts

#### A5 · BUG-S2-04 preview-run 文档与参数一致（S3-D4）

- 角色：项目经理 + 测试
- 描述：08 L7 描述与 ★ 检查点里的 `preview-run.mjs --seeds 5 --strategy random` 改为现行用法 `node scripts/survivor/preview-run.mjs <seed> [--move flee|spore] [--pick random|prefer:<id>] [--every N] [--max-sec N]`，多种子统计指向 `npm run survivor:balance`；检查 04、reports 中的同类引用一并改；preview-run.mjs 头注释与实际参数逐项核对。
- 依赖：无
- 验收：文档里出现的每条 preview-run 命令实际运行都不报 `unknown argument`；`npm test` 全绿。
- 预估：S
- 文件：docs/survivor/08-sprint-2-backlog.md、04-test-plan.md、scripts/survivor/preview-run.mjs（仅注释）

#### A6 · 雨滴坠击卡面与首局提示（S3-D2）

- 角色：策划 + 运营（文案）+ 前端开发
- 描述：01 §14 新增一条：首局第一次三选一出现雨滴坠击卡时，卡片下方追加提示。`strings.js` 新增 `levelUpHintRaindrop`（建议“雨滴会自己找浊雾生灵，边躲边打也稳”，以运营定稿为准），`card_raindrop_desc` 补一句“不用瞄准”的意思；`SurvivorHud.ts` 在 `first`（首次升级提示条件，复用 `profile.tutorial.levelUp`）且卡组含 raindrop 时显示。不改任何数值。
- 依赖：无
- 验收：`node --test tests/survivor-compliance.test.mjs tests/survivor-data.test.mjs` 通过（新文案 0 命中）；`npm run cocos:build` 成功；冒烟无 error。
- 预估：S
- 文件：docs/survivor/01-gdd.md、js/survivor/data/strings.js、cocos-pilot/assets/scripts/SurvivorHud.ts

#### A7 · DOC-S2-01 同步 04 + BUG-S2-05 记录

- 角色：测试工程师
- 描述：04 改 DATA-05（断言 `winAtSeconds` 已移除、计时胜利走 `debug.timedWinSec`）、LEG-01（默认入口为 survivor，旧玩法已删）、PERF-01 首次要求改为 S3；§9.2 中进化 / 拾取物 / survivor-pickups 移到 §9.3（S3 口径），§9.3 补本看板第一批验收（进化、拾取物、精英、replay/sync/perf/bot）；§2.3 写明 S3 继续用 bot.mjs 两种走位口径。02 §8.2、03 §6 记一笔“survivor-battle 占位图集 512×1024，正式美术时再定尺寸”（BUG-S2-05）。
- 依赖：A1–A3（用例 ID 与文件名以落地为准）
- 验收：04 中无与 08 / 09 冲突的条目；04 列出的每个测试文件都存在于 tests/；`npm test` 全绿。
- 预估：S
- 文件：docs/survivor/04-test-plan.md、02-ui-ux.md、03-architecture.md

### 第一批 · B 进化与内容补全（逻辑层 node --test 验证；表现层只做占位帧与卡面）

#### B1 · 被动 regen 露水叶片、magnet 孢子罗盘

- 角色：策划（核数）+ 前端开发
- 描述：`data/passives.js` 加 regen（每级 +0.4 生命/秒）与 magnet（每级拾取半径 +20%），按 01 §7；`Stats.computeStats` 合成 regen（与局外 perm_regen 相加）和 pickup 倍率；`SurvivorRun` 每步按 regen 回血、不超过最大生命；K3 过滤自动把两者纳入抽卡池（被动栏仍 4 格）。`strings.js` 补 `card_regen`、`card_magnet` 名称与描述。
- 依赖：A2（金标准随之重生成，S3-D5）
- 验收：`node --test tests/survivor-data.test.mjs tests/survivor-stats.test.mjs tests/survivor-run.test.mjs tests/survivor-progression.test.mjs tests/survivor-compliance.test.mjs` 通过：Lv1/Lv5 回复与拾取半径等于 01 §7/§15.1；回血不溢出；抽卡池出现 6 被动，被动栏满后不再出新被动卡；固定种子 10 000 次抽卡频率与 10/8/4 误差 < 5%；replay 金标准已重生成且提交说明写明原因。
- 预估：S
- 文件：js/survivor/data/passives.js、strings.js、js/survivor/Stats.js、SurvivorRun.js、对应 tests、tests/fixtures/survivor/golden.json

#### B2 · 5 组进化（逻辑）

- 角色：策划（核数）+ 前端开发
- 描述：按 01 §6 各进化行填 `data/weapons.js` 中 umbrella_blades / dew_ring / raindrop / leaf_boomerang 的 `evolved`（spore_shot 已有），`validate.js` 把五把武器的 `evolvedRequired` 都设为 true。`Progression.draftOffer` 实现 01 §8.2 第 1 条与 §8.3：武器 Lv5 且拥有对应被动（evolvesWith，任意等级）时，第 1 张固定为进化卡 `{kind:'evolve', id}`，多把同时可进化只出获得最早的一把，其余 2 张照常加权；进化后不再出该武器升级卡。`SurvivorRun._applyCard` 处理 evolve：武器换进化档、占原栏位、被动保留；`Weapons.js` 各武器读进化档参数（机制与 Lv5 相同，01 未写的特殊行为不加）。`summary()` 武器项带 `evolved: true`。孢子罗盘无进化。
- 依赖：B1（regen 是露珠环的进化条件）
- 验收：`node --test tests/survivor-data.test.mjs tests/survivor-progression.test.mjs tests/survivor-weapons.test.mjs tests/survivor-run.test.mjs tests/survivor-determinism.test.mjs` 通过：五档进化数值与 01 逐项相等；条件不满足时不出进化卡；满足后下一次升级第 1 张必为进化卡；两把同时满足只出最早获得的；选后武器栏数不变、该武器不再出升级卡；进化档伤害 / 冷却 / 范围仍乘 might / cooldown / area；同种子哈希一致；金标准已重生成。
- 预估：L
- 文件：js/survivor/data/weapons.js、validate.js、js/survivor/Progression.js、SurvivorRun.js、Weapons.js、对应 tests、golden.json

#### B3 · 拾取物：露珠、大露珠、一阵林风

- 角色：前端开发
- 描述：按 01 §11 扩展 `Pickups.js`：普通敌人净化时 0.8% 掉露珠（+20 生命，场上 ≤ 3）、0.15% 掉林风（全场孢子飞向角色，场上 ≤ 1）；精英净化必掉大露珠（+50，不计上限）与林风；露珠 / 林风 30 秒后消失，孢子不消失；回复不超过最大生命。掉落随机数走 run 的 SeededRandom；拾取物池用 `LIMITS.pools.pickups`（5），大露珠超出时按池满处理计入 `diag.dropped.pickups`。cleansing 净化不掉拾取物（同 K4）。新建 `tests/survivor-pickups.test.mjs`。
- 依赖：B1（回血统一走同一个生命上限钳制）
- 验收：`node --test tests/survivor-pickups.test.mjs tests/survivor-run.test.mjs tests/survivor-determinism.test.mjs` 通过：固定种子 100 000 次净化的掉率误差 < 10%（相对）；上限 3 / 1 生效；30 秒消失；林风让全场孢子在数秒内全部入账；回血不溢出；同种子哈希一致；金标准已重生成。
- 预估：M
- 文件：js/survivor/Pickups.js、SurvivorRun.js、data/limits.js（如需）、tests/survivor-pickups.test.mjs（新）、golden.json

#### B4 · 5:00 精英圆壳甲虫

- 角色：前端开发
- 描述：`data/waves.js` 5:00 elite 事件去掉 `optional`；`Spawner` 在角色周围屏外生成 1 只 elite_beetle（受硬上限 200，满时顺延到有空位）；`Enemies.js` 实现 01 §9 冲撞（每 5 秒蓄力 0.8 秒后 ×2.5 冲 1 秒，复用 Boss 冲撞的预警 / 锁向写法，发 `eliteCharge` 事件）；精英不重定位、按 §9.1 成长；击败时掉 50 经验孢子 + B3 的大露珠与林风，`summary().eliteDefeated` 供 01 §13.1 露晶计算。
- 依赖：B3（掉落）
- 验收：`node --test tests/survivor-spawner.test.mjs tests/survivor-enemies.test.mjs tests/survivor-run.test.mjs tests/survivor-determinism.test.mjs` 通过：5:00 恰生成 1 只且全局只 1 次；生命 = 1500 × (1 + 0.15 × 5)；蓄力 0.8 秒内不移动、冲撞方向在蓄力开始锁定；距离再远也不重定位；击败必掉大露珠 + 林风、eliteDefeated = true；同种子哈希一致；金标准已重生成。
- 预估：M
- 文件：js/survivor/data/waves.js、js/survivor/Spawner.js、Enemies.js、SurvivorRun.js、对应 tests、golden.json

#### B5 · 表现层：占位帧、进化金边卡、拾取物与精英

- 角色：UI（规格）+ 前端开发
- 描述：`scripts/survivor/pack-placeholder.mjs` 追加几何占位帧：露珠 / 大露珠（水滴形，01 §2：回血物不用蘑菇图形）、林风、精英（beetle 放大 + 发光描边，含 -flash）、精英冲撞箭头、四把进化武器的变体（同形状换色 / 放大，露珠环进化用 Graphics 重绘一次）；仍为单张 survivor-battle 图集（D6）。`SurvivorHud.ts` 三选一卡支持 `kind:'evolve'`：金色边框 + “进化”字样 + 进化名，模态帧 DrawCall ≤ 25；武器栏与结算页显示进化标识（01 §12）。`strings.js` 补进化卡名与描述（`card_evolve_<id>`）、`eliteWarning` 等横幅文案。`SurvivorSmoke.ts` 增加阶段：快进 5:00 断言精英出现并渲染；注入露珠 / 林风断言拾取生效；构造进化条件断言出现金边进化卡并选中。
- 依赖：B2、B3、B4
- 验收：`npm run survivor:art` 重复运行字节一致；`npm run cocos:sync && npm run cocos:build` 成功；冒烟新断言全部 PASS、战斗帧 DrawCall ≤ 25、节点 ≤ 600、三选一与结算模态帧 ≤ 25、无 console.error；`npm run cocos:build:wechat` 成功，survivor 分包 ≤ 2.5 MiB；`node --test tests/survivor-compliance.test.mjs` 通过（含 CMP-05）。
- 预估：L
- 文件：scripts/survivor/pack-placeholder.mjs、cocos-pilot/assets/survivor/survivor-battle.png/.json、cocos-pilot/assets/scripts/SurvivorBattleFrames.ts、SurvivorBattleArt.ts、SurvivorHud.ts、SurvivorSmoke.ts、js/survivor/data/strings.js

### 第一批 · C 平衡复核

#### C1 · 重跑平衡，复核 §10.2 第 2、3、6、7 项

- 角色：测试（脚本）+ 策划（读数）
- 描述：`scripts/survivor/bot.mjs` 选卡规则补进化卡（任何 `prefer:` 策略都优先选进化卡，random 照常随机），不新增 `prefer:regen` / `prefer:magnet` 策略（保持 600 局口径与 S2 可比，OBS-5）；重跑 `npm run survivor:balance`（50 种子 × 2 走位 × 6 选卡，上限 17:00）两次，出 `reports/sprint-3-balance.md`，对照 round2 §7.3 表新增“S3 第一批”一列。重点：
  - 第 2 项 Boss 战中位：全部目标 40–60 秒、新手型 ≤ 90 秒。
  - 第 3 项新手型拾取率（目标接近 01 §15.2 的 90%，孢子罗盘 + 林风后）与净化率。
  - 第 6 项随机选卡通关率（保守 / 贴孢子，S2 为 10% / 22%）与到达 Boss 比例。
  - 第 7 项熟练型 Lv@3:00 / 5:00 / 7:00（目标 12–14 / 18–20 / 24–26，7:00 起考核“1–2 个进化”）。
  - 顺带记录：第 4 项新手型 6:30–7:30 阵亡占比、第 5 项不带雨滴坠击的新手型通关率（S3-D2 是否还需 (b)）、进化出现时刻与选取率、拾取物 / 精英击败率、`diag.dropped` 全部计数。
  - 硬门槛沿用 08 §3.3：12:00 后在场 0、新手型 30–60%、熟练型 ≤ 80%、通关局构筑种数 ≥ 27、droppedTime 0。
- 依赖：A1、B1–B4（B5 不影响逻辑，可并行）
- 验收：报告所有数字来自真实运行；两次结果除耗时外一致；策划在报告末尾逐项给出“过 / 建议再调（先改 01）”，越界项列出 2–3 个备选方案留给检查点拍板，本任务不改数值。
- 预估：M
- 文件：scripts/survivor/bot.mjs、balance.mjs（如需）、docs/survivor/reports/sprint-3-balance.md（新）

#### C2 · 第一批提测与检查点材料

- 角色：测试工程师 + 项目经理
- 描述：执行 `npm test`、`npm run check`、`npm run survivor:bench`、`npm run cocos:build:wechat`（记 package-report 包体）、浏览器冒烟；出 `reports/sprint-3-batch1-report.md`：A/B 各项验收结论、测试条数（S2 结束 279）、包体对比、DrawCall / 节点、bench 基线、缺陷清单、仍待真机项；附检查点要给用户看的三样东西：① 平衡对比表（S2 第三轮 vs S3 第一批）；② 可试玩版本的导入与体验步骤（沿用 sprint-2-test-report §9，增加“5:00 精英、拾取露珠 / 林风、拿到一次进化”）；③ 需用户拍板的事项。回填 00 §5/§6。
- 依赖：A1–A7、B5、C1
- 验收：报告齐全、无伪造真机数据；`npm test` 全绿；自动化范围内 HIGH 0 条；`cocos-pilot/build/wechatgame` 可直接导入开发者工具。
- 预估：M
- 文件：docs/survivor/reports/sprint-3-batch1-report.md（新）、docs/survivor/00-project-plan.md

### ★ 用户检查点（第一批结束，第二批开工前）

- 给用户看：C2 报告的平衡对比表与可试玩版本（开发者工具普通编译即可进游戏）。
- 请用户确认：① S3-D1/D2 是否维持；② C1 越界项选哪个方案；③ 试玩感受（进化是否让后半局有变化）；④ 正式美术与音效来源（自制 / 外包 / 素材库，影响 S3-11 排期与许可）；⑤ 若已完成真机测试，回传 PF-2 结果。
- 用户确认后才开第二批；不满意则回到 B / C 调整（先改 01）。

## 5. 依赖速览（第一批）

A1 →｛A2, A3｝→ A7；A4、A5、A6 无依赖，可随时插入。A2 → B1 → B2；B1 → B3 → B4；｛B2, B3, B4｝→ B5。｛A1, B1–B4｝→ C1；｛A1–A7, B5, C1｝→ C2 → ★ 用户检查点。

## 6. 第二批（检查点之后，只列标题与依赖）

| 编号 | 标题 | 依赖 |
|---|---|---|
| S3-08 | 局外成长与营地 UI：露晶结算、5 项永久强化面板、存档接 UI（SAVE-UI、LC-02、AX-02、AX-03） | ★ 检查点 |
| S3-09 | 局外成长后的平衡复核（启用 04 §2.3 kite / greedy / 满强化口径） | S3-08 |
| S3-10 | 新手引导完善（移动、自动攻击、三选一、Boss、撤离、进化，01 §14） | ★ 检查点；与 S3-08 共用存档 tutorial 字段 |
| S3-11 | 正式美术与音效方案（来源、许可、图集尺寸、包体预算）及替换 | ★ 检查点（来源由用户拍板） |
| S3-12 | 提审准备起步（内容介绍与截图、健康忠告与适龄提示、隐私授权、`release:check`、激励视频按 D9 评估） | S3-10；截图依赖 S3-11 |
| S3-13 | 内部试玩 ≥ 5 人（00 §5 M2 验收） | S3-08、S3-10、S3-11 |
