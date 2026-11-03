# 修仙割草 · QA 设计与验收矩阵

版本 v0.1 · 2026-10-26 · 状态：测试设计，尚未执行。

契约来源：`02-data-architecture.md` v0.2；玩法来源 `00-gdd-summary.md`，采用当前源码核对的 Boss5500、regen每级0.2、进化360秒且被动3级基线。本文不记录任何虚构通过数、性能结果或工期承诺。

## 1. 基线与测试分层

只读核对确认根逻辑与 shared-manifest 有7个源文件哈希不一致：SurvivorRun、Progression、data/enemies、data/passives、data/pickups、data/validate、data/weapons。初查归类 BASE-01；后续集成方已同步并恢复全绿，见08实测报告。本表仍是目标用例，不能把基础测试通过当作修仙运行时通过。

| 层 | 测试对象 | 能证明什么 | 不能替代什么 |
|---|---|---|---|
| L0 | 数据与纯函数 | 数值、引用、边界、坏输入 | 完整战斗调度与宿主行为 |
| L1 | 根源码 Run 固定步 | 队列、战斗时序、RNG、伤害、存档契约 | Cocos已接入 |
| L2 | 回放与bot | 固定输入可重现、策略统计与差异 | 人类体验、真机性能 |
| L3 | 同步检查与Cocos宿主 | import版本一致、HUD/事件/生命周期 | 真机帧率 |
| L4 | 真机与微信生命周期 | 可读性、输入、安全区、资源与性能 | 未覆盖策略的平衡 |

每条矩阵用例初始状态均为“未执行”。标为基线观察的项目只说明源码/哈希证据，不等于用例通过。优先级 P0=阻断数据/结算/核心玩法发布，P1=阻断功能验收，P2=体验改进。已知基线项与新回归分开建缺陷，不把未同步当成新功能通过的豁免。

## 2. 数据、ID、存档矩阵

| ID / 优先级 | 场景与输入 | 必须断言 | 层 / 后续测试落点 |
|---|---|---|---|
| BASE-01 / P0 | root与manifest/shared按同步算法比较 | 初查7项仅作历史；当前生产依赖要求源码、manifest与副本零差异。生产依赖中新模块须进manifest；尚未接入的js/xianxia基础模块单独验证，不手写生成物 | L3 / survivor-sync.test.mjs |
| BASE-02 / P0 | 新基线真实表 | Boss.hp=5500；regen累计0.2/0.4/0.6/0.8/1；EVOLUTION=360秒/3级 | L0 / data、stats、boss |
| ID-01 / P0 | P1前后相同seed、输入与选择 | 旧ID/index/键序不变；未改战斗时原始hash、summary、RNG行为一致，不用别名转换 | L1–2 / replay、determinism |
| ID-02 / P1 | 每个旧武器、进化、敌人、兜底卡显示 | 显示修仙名、资源仍以旧ID可解析；无内部ID意外显示；spore特殊键与进化键均覆盖 | L3 / host、人工 |
| DATA-01 / P0 | 坏职业引用、重复池项、未知startWeapon、非法倍率 | validate返回带路径错误，Run构造失败；未实现职业不能出现在入口 | L0 / data、新classes |
| DATA-02 / P1 | 非有限值、函数、undefined、重复index、缺进化条件、null进化 | 新表递归校验拒绝非法值；合法无进化wanjian通过；第六index与hitAt长度匹配 | L0 / data |
| SAVE-01 / P0 | 原版encode生成schema1档，所有perm_*非零、设置/教程混合真假 | 新版load逐字段等价；未修改直接保存不损失数据；crystals不因改名转换 | L1 / save、meta |
| SAVE-02 / P0 | 首次无档；主损坏备正常；主备皆损坏；checksum错 | 分别默认、备份恢复、保留corrupt并默认；主/备键与信封格式不变 | L1 / save |
| SAVE-03 / P0 | schema大于当前；getItem/setItem异常 | 更新版本锁写，不覆盖原文；写失败可见提示，不重复发奖 | L1/3 / save、host |
| SAVE-04 / P1 | 未知强化/顶层字段、越界等级与货币、非整数 | 保持sanitize原契约；不假定未知职业字段能保存；没有局内续玩承诺 | L1 / save |
| SAVE-05 / P0 | won/lost/abandon重复render/重复事件 | Meta结算仅一次，返回营地再开局独立；经济数值不因文案迁移变化 | L1/3 / meta、host |
| BASE-03 / P1 | 单张shiny_spore卡后结算 | 确认单张+5、两张+10；本轮已复现旧+25并修复，自动回归见survivor-meta.test.mjs | L1 / progression、meta |

## 3. 属性、职业与进化矩阵

| ID / 优先级 | 场景与输入 | 必须断言 | 层 / 落点 |
|---|---|---|---|
| CLASS-01 / P1 | 缺省/合法/未知classId | 缺省sword；未知抛RangeError；开局武器/倍率/职业被动取表，不写职业分支 | L0–1 / 新classes |
| CLASS-02 / P1 | 四功法四心法满；御剑Lv1→5 | 御剑独立一栏，不占四被动格；只修正spore_shot含进化；重复refresh不累加 | L1 / weapons、progression |
| CLASS-03 / P1 | 调整职业池数组顺序，保持成员相同 | 候选/RNG结果不变；移出成员后不再新抽到；保留原数据键顺序 | L0 / progression |
| REALM-01 / P0 | L=1..27逐行与GDD表比较；28/30/大正整数 | HP、未取整ATK公式与显示ATK、攻速、移速、拾取匹配；27后属性封顶且不再破境 | L0 / 新realms、stats |
| REALM-02 / P0 | 裸剑修Lv1/10/19/27 | HP=100/150/210/250；显示ATK=100/130/170/197；Lv10移速176.4、拾取154；Lv19移速184.8、拾取168 | L0 / stats |
| DMG-01 / P0 | P2刻度换算，base4、might1.1；整数乘积样例 | 4→44而非40；整数样例恰为原结果×10；玩家HP/受伤/XP/回复未×10 | L0–1 / damage、weapons |
| DMG-02 / P0 | Boss takenMul、raw在.5两侧、微小正伤害 | 最终raw乘takenMul后取整一次，最小1；不对已取整伤害再次乘倍率 | L0 / 新damage |
| DMG-03 / P0 | rawIncoming=100、vajra5、body丹；接触及泡 | 两种入口均为35；无丹vajra5为70；无减伤100；不重复D/狂暴 | L1 / run、weapons、boss |
| DMG-04 / P1 | 金丹攻速1.2、cooldown5；regen1/5加局外 | cooldownMul=0.5；regen每秒增加0.2/1.0再加局外，不溢出HP上限 | L0–1 / stats、run |
| SCALE-01 / P0 | 生成时间59.999/60/419.999/420秒；存活跨分钟 | 取生成时整分钟K/D；已生怪不回溯增幅；7以后末项；Boss不乘普通怪HP成长 | L1 / spawner、boss |
| SCALE-02 / P0 | 新刻度+K(7)；Boss正常接触/泡 | HP118250，接触35，泡raw17.5最终18；裸刻度阶段HP55000 | L0–1 / stats、boss |
| EVO-01 / P0 | 武器Lv4/5 × 被动Lv2/3 × t=359.999/360/360.001 | 仅Lv5且被动≥3且t≥360出现进化；缺省/NaN时间不得绕过门槛 | L0 / progression |
| EVO-02 / P0 | 飞剑改yujian条件，其他配对保留；多把可进化 | 飞剑仍须6分钟/御剑3；最早获得者第1张；进化占原格，不重复进化 | L0–1 / progression、run |
| EVO-03 / P1 | offer后状态/条件非法、陈旧offer token | 应用时复核，不扣pending不半提交；旧回调不能选下一张 | L1/3 / run、host |
| RANGE-01 / P1 | 距离588边界±ε、676.2边界、多目标不足 | 边界内发射、外不发/不耗冷却；进化多目标也过滤，目标不足重复最近合法者 | L1 / weapons |

## 4. 破境、队列与时间矩阵

| ID / 优先级 | 场景与输入 | 必须断言 | 层 / 落点 |
|---|---|---|---|
| QUEUE-01 / P0 | applied9，XP一次到12 | pending=3；offer目标10/11/12；只10触发破境；每次选择后pending=level−applied | L1 / progression、run |
| QUEUE-02 / P0 | 一次跨10和19，之后跨27 | 10/19各一次；27后继续选卡，无第三次破境/属性增长 | L1 / run |
| QUEUE-03 / P0 | 普通升层半血；破境选永久卡/回春丹/金身丹 | 普通仅补HP上限增量；破境在全部属性提交后按新上限回满；效果仅一次 | L1 / run、stats |
| QUEUE-04 / P0 | 现有无敌0.5/2.0；敌距220±ε、重叠、抗性0/0.5/1 | 无敌取max(旧值,1.5)；灵波80/40/0；相同中心固定+X；HP/XP无变化 | L1 / run |
| QUEUE-05 / P0 | 演出0.6秒时pause/hide，停10秒再resume | 战斗时间/丹药/万剑/无敌不走；表现剩0.6秒；同offer无重抽、无重复事件 | L1/3 / run、host |
| QUEUE-06 / P1 | 1.2秒演出边界，卡显示后0.399/0.4秒点击 | 演出时无可选卡；显示后重新锁0.4秒；快速双击只提交一次；旧token回调失效 | L3 / host、人工 |
| QUEUE-07 / P0 | 玩家致死与XP/Boss死亡同一步 | 死亡优先lost，不能靠新弹卡回血；存活Boss死→cleansing，不弹卡阻断撤离 | L1 / run、boss |
| QUEUE-08 / P0 | 功法全满、全部已进化且破境；有合法进化 | 无合法功法时保底退化并补满三张；有进化即满足功法保底；不造卡、不死循环 | L0 / progression |
| TIME-01 / P0 | 1/60、1/30、随机帧；一帧中途进入levelup | simulationTick只数实际执行步；相同每步输入/选择结果一致，不数预分配未执行步 | L1–2 / determinism、replay |
| TIME-02 / P0 | frameDt过大、0、负数、NaN；后台长停 | 沿用最多5步与droppedTime；非合法dt不推进；恢复不补墙钟时间 | L1/3 / run、host |
| END-01 / P0 | Boss净化→撤离中离开/返回；中途放弃 | 保留cleansing与连续驻留规则；不凭凝婴动画置won；终局停止新卡/万剑 | L1/3 / boss、host |

## 5. 丹药与万剑矩阵

| ID / 优先级 | 场景与输入 | 必须断言 | 层 / 落点 |
|---|---|---|---|
| PILL-01 / P1 | 经验已Lv8但当前offer目标4/5 | 4无丹、5可有丹；权重3；每次最多一丹，满栏仍可抽丹 | L0 / progression |
| PILL-02 / P0 | T服用，检查T+N−1和T+N；N=1800/1200 | 前一边界有效、截止步先过期再移动/攻击；与HUD显示同源，不晚一帧 | L1 / 新pills、run |
| PILL-03 / P0 | T服用、T+600重服；三丹同时 | 同种截止改T+600+N，倍率不叠；三种独立到期；失效只重算一次 | L1 / pills、stats |
| PILL-04 / P0 | levelup/paused各等待；cleansing/extract执行步 | 前两态冻结，后两态随模拟步计时；时间来自tick不是Date.now/tween | L1 / pills、run |
| PILL-05 / P1 | 风丹时远近spores，随后新掉落；再次服用 | 现存全标wind且飞入后加XP；新掉落不自动吸引；再次服用再标；无递归选卡 | L1 / pickups、pills |
| SWORD-01 / P0 | ready有敌，t触发，t+35/t+36 | 仅一次预警；35步未伤、36步落剑且每敌一次；不是动画回调伤害 | L1 / weapons、run |
| SWORD-02 / P0 | warning中玩家移动、敌人进出、目标死亡与池slot复用 | 以落剑时玩家中心与活实体判定；不误伤离开者、不漏新入者、不沿用旧引用 | L1 / weapons |
| SWORD-03 / P0 | 四边/四角相切和±ε；large Boss；202活敌 | 圆矩形精确相交；Boss不漏不重复；角外不命中；全部命中次数正确 | L0–1 / weapons |
| SWORD-04 / P1 | 320×480、720×1280、1000×1800视口，area=1/2 | 世界矩形始终720×1280；相同落点敌人判定相同；无击退/无area放大 | L1/3 / weapons、host |
| SWORD-05 / P0 | 预警中选卡/暂停/重服丹，截止步同时丹过期 | 警告逻辑步冻结；落剑用最新tier与有效buff；到期先失效再伤害 | L1 / weapons、pills |
| SWORD-06 / P1 | 无目标ready；有敌触发后全部离开 | 无目标不预警；已触发则空击并进冷却；Lv5最低330步冷却+36步预警 | L1 / weapons |
| SWORD-07 / P0 | warning中进入cleansing/lost/abandon/销毁再开局 | 取消未命中cast；无跨局回调、无残留伤害/预警；新局cast独立 | L1/3 / run、host |
| SWORD-08 / P1 | index5及敌池反复释放/复用 | hitAt长度6且重置全槽；原五武器间隔不受影响 | L1 / enemies、weapons |

## 6. 宿主、回放、性能矩阵

| ID / 优先级 | 场景与输入 | 必须断言 / 记录 | 层 / 落点 |
|---|---|---|---|
| HUD-01 / P1 | 有多个待选等级 | 境界为applied，卡为target，XP为banked；不提前显示已突破 | L3 / host |
| HUD-02 / P1 | 各卡种、进化、四+四+一职业栏、三丹同开 | classPassive/pill不落入货币分支；文案/角标/倒计时正确；小屏安全区不挡操作 | L3–4 / host、人工 |
| HUD-03 / P1 | 同等级总和的不同构筑、进化切换、HUD重建 | 缓存含ID/evolved/职业；不显示旧图标；预警从状态可恢复 | L3 / host |
| HUD-04 / P1 | reduceFlash、音效/震动关、资源缺帧、反复暂停 | 设置仍有效；特效缺失不阻断选卡/命中；有占位；无重复震动/回调 | L3–4 / host、人工 |
| REPLAY-01 / P0 | 固定seed与每步输入，不同帧率/暂停模式 | 原hash与扩展战斗状态均比较；扩展含applied/offer/职业/丹药期限/万剑phase与cast/期限 | L2 / replay |
| REPLAY-02 / P0 | P1 vs P0，P2及以后新规则 | P1不重建golden；行为变化先报差异与规则，获审后独立建立新golden；保留原基线可复核 | L2 / replay |
| PERF-01 / P1 | 200普通敌+统领/Boss上限场景、6武器强制压力、三丹、万剑同落 | 记录平均/P95/最大步耗时、堆增长、分配、各池峰值、dropped/capSkipped；压力配置明确超正常4格 | L2 / bench |
| PERF-02 / P1 | DamageFeed容量1/256，故意宿主不消费 | 伤害和战斗结果相同；只丢显示；同时数字≤24、每帧接纳≤6，无无限节点增长 | L1/3 / damage、host |
| PERF-03 / P1 | 实机完整局+万剑满屏命中 | 记录设备/系统/构建、帧率分布、长帧、内存、节点、DrawCall与录像；不能把Node时间当真机时间 | L4 / 人工 |
| HOST-01 / P0 | 集成负责人同步后重新构建 | root/shared校验无差异，新模块可达，浏览器与微信构建各留日志与版本；禁止使用旧预览包验收 | L3–4 |
| BAL-01 / P1 | 固定600局候选采样、按move×pick分组 | 锁定seed清单/样本数/策略映射/版本/视口；报告胜率分母、时长中位、死亡时间、各分钟等级、破境/进化时刻、万剑选取率 | L2 / balance |

性能候选预算沿用项目设计口径：Node满载平均目标≤0.6ms、既有断言门槛≤2ms、8分钟堆增长≤5MB；战斗激活节点≤600、DrawCall≤25。先核对脚本实际统计口径，再与对应指标比较；这些均不是本次实测值。capSkipped为规则上限跳过，不能混作池溢出；正常玩法场景要求dropped为0，故意填满池的负例则要求有诊断且无崩溃。

平衡候选目标：熟练策略胜率≤80%，新手30–60%，通关时长中位6–9分钟。先明确具体bot策略到“新手/熟练”的映射；中位仅取通关局、无通关记N/A，不把这些目标当作已达成结果。K/D原依据来自旧数值，必须与新基线对照；不通过自动重写golden或修改目标让报表变绿。

## 7. 执行入口与证据

以下仅为后续执行指引，本次未运行。新增测试文件在功能实现后创建，不能声称它们现在已存在。

| 阶段 | 现有命令 / 未来动作 | 注意 |
|---|---|---|
| 基线逻辑 | `npm run survivor:test` | 包含sync测试，预期可能因已知7项差异失败，按实际输出归类，不能称全绿 |
| 精确回归 | `node --test tests/survivor-stats.test.mjs tests/survivor-progression.test.mjs tests/survivor-run.test.mjs tests/survivor-weapons.test.mjs tests/survivor-save.test.mjs` | 根源码覆盖，与宿主分开 |
| 新功能 | 新增realms/classes/pills/damage用例，扩展现有文件 | 按矩阵ID命名/关联，保留精确数值断言，不全改成读取被测数据 |
| 双端与宿主 | `npm run cocos:test`；`node --test tests/survivor-sync.test.mjs` | 在基线问题处理后验收；静态host测试不替代运行截图/操作 |
| 性能/统计 | `npm run survivor:bench`；`npm run survivor:balance` | 先读脚本参数与默认样本数，确认策略与输出路径，不能只凭命令名声称跑了600局 |
| 生成物 | `npm run cocos:sync`、构建、`npm run survivor:golden` | 都可能写文件，只由后续授权的实现/集成人执行；本次禁止 |

每次执行记录：矩阵ID、源码提交及未提交差异、shared-manifest哈希、命令/配置、seed/输入、设备/运行时、预期、实际、状态（通过/失败/阻塞/未执行）、日志或截图位置、缺陷编号。一次失败后不能只删除失败记录；修复后保留关联复测记录。

文档审查可检查：两份文档接口一致、所有代码任务有矩阵覆盖、无把“待做”写为“已有”、新基线四项统一。文档审查不等于执行上表的游戏测试。

## 8. 验收与退出条件

- 基线：7项同步差异由集成负责人明确解决并复核；保留新基线原始版本/配置证据，不能使用旧包代替。
- 功能：所有适用P0/P1有执行结果，阻断缺陷关闭或明确未通过；schema1无破坏、重复结算和陈旧选卡回调均被覆盖。
- 确定性：同版本不同帧分组及暂停模式一致；行为变更有可解释差异与经审核的新golden，而非机械重生成。
- 集成：根逻辑、shared、Cocos UI及微信真机分别留证；至少覆盖小屏与长屏、切后台、减少闪光、完整终局。
- 体验与平衡：万剑预警可读、破境不误触、帧率及资源在核定预算内；新基线采样完成后再决定K/D是否需要调整。

当前结论：已形成开发与QA设计，所有游戏验收用例仍未执行。没有测试通过、平衡达标或可发布结论。


## 本轮交叉评审追加验收

- TIME-01：卡片可见后切后台，回前台重新锁0.4秒；破境演出恢复剩余1.2秒，不重新播放整段，不重复授奖。
- TIME-02：cleansing禁止移动/攻击但推进1.5秒状态时钟；extract继续时钟并允许移动。
- SCALE-03：远程怪在2:59生成，3:01吐泡，泡使用发射时D(3)；接触仍使用生成时D(2)。
- RANGE-01：飞剑冷却剩0.2秒时失去射程内目标，冷却冻结；目标回到射程继续0.2秒。进化御剑Lv5以772.8验证边界。
- SAVE-06：旧settings缺music/damageNumbers/largeText时分别补true/true/false；原sound/vibration/reduceFlash保持；修改后保存重载相同，余额不变。
- FEED-01：DamageFeed字段完整，目标uid正确；过滤显示不影响maxHit，关闭数字不影响伤害或摘要。

基础模块与奖励回归的实际结果见08，不将本矩阵未执行用例批量标为通过。
