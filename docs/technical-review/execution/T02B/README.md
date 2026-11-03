# T02B 当前成长规则与合法夹具报告

工作区：`/Users/zhangnu/.codex/worktrees/technical-governance/rainy-mushroom`。开始 HEAD `9b291f6`；父任务随后已提交 T02A（`726a7e8`），本代理不提交。

## 结果

- 基线：分配的13文件共223项，132通过、91失败。
- 修复前：223项，220通过、3失败；新增授权最小修复后，原13文件223/223通过，额外Campaign存读档39/39通过，总计262/262，0 skipped、0 todo、0 cancelled。
- 3个失败是同一已证实的生产校验缺陷：当前 schema 允许在首次学习境界之前预置 `evo_tiandi`、`evo_wuwo`、`evo_sixiang`。红灯日志先落盘；主代理随后明确追加授权，本代理已最小修复并保留回归测试。
- 中间曾达到223/223；信任边界复核补齐当前档非法进阶保护后恢复3个真实红灯。最终全绿来自修复生产校验，没有删除、跳过或放宽这3个测试。
- 本代理修改分配的13个测试文件，新增 `tests/helpers/tower-current-state.mjs`，并按补充授权最小修改 `js/xianxia/TowerCampaign.js` 的当前进阶校验。没有修改玩法数值、素材、其他helper、UI测试或旧schema重置范围；没有commit/push，没有启动子代理，没有运行全仓测试。

|文件（均在 tests/）|总项|原失败|最终失败|
|---|---:|---:|---:|
|tower-qi-progression.test.mjs|8|8|0|
|xianxia-natural-growth-strategy.test.mjs|9|7|0|
|xianxia-stone-skill-costs.test.mjs|6|1|0|
|xianxia-tower-campaign-growth.test.mjs|69|21|0|
|xianxia-tower-flight.test.mjs|18|1|0|
|xianxia-tower-growth-feedback.test.mjs|5|2|0|
|xianxia-tower-growth.test.mjs|22|12|0|
|xianxia-tower-manual-learning.test.mjs|3|2|0|
|xianxia-tower-rank-bands.test.mjs|17|2|0|
|xianxia-tower-realm-only-skills.test.mjs|5|3|0|
|xianxia-tower-skill-decrease.test.mjs|22|7|0|
|xianxia-tower-stage-growth.test.mjs|37|24|0|
|xianxia-yujian-growth.test.mjs|2|1|0|

## 依据和裁决

### 1. 成长阶段、费用、继承

依据：

- `docs/xianxia/sect-tower-v1/71-ten-layer-realms.md`：每境10层，1/4/7、11/14/17、21/24/27九阶段；第十层不再多发SP；满级30层、14400修为，自然48点。
- `72-breakthrough-items.md`：1800和6600是瓶颈，必须通过对应物品成功后进入1801/6601；普通修为不能跨境。
- `75-skill-inheritance.md`：进阶需要真实父技能至少1级，伤害继承其实际等级；降低父技能与退点保护仍保留。单级费用固定。
- `91-skill-gates-and-caption-2026-11-03.md`顶部最新覆盖：御剑术角色2级开放、技能1–3/4–6/7–9/10级对应角色2/4/7/11；取消凝神诀前置；剑骨1点且免经卷；剑罡爆裂1点；飞行1点；周天剑阵17层开放；四象二阶30层。

具体处理：

- 边界测试独立写出45、1800/1801、6600/6601、13484/13485、14400与九阶段常量；rank-bands文件新增独立的全部30级XP表、每项技能的等级门槛表，预期不从被测 `rankRequirements` 或 `cultivationLevelXp` 导出。
- 非边界交易夹具使用 `cultivationLevelXp(30)` 或合法当前满级。`campaign-growth` 的“XP capped”仍独立使用14400并用14399篡改入场基准，没有误把30级起点13485当满修为。
- 剑啸八方门槛改为7/11/14/17级；每级1点。购买/降级精确扣返1点，保留save-failed、stale-save、max-level、重载和非法rank拒绝。
- 全节点费用独立算式：4个普通主动×10＋3个进阶基础主动×20＋被动28＋进阶24－初始弦月1＝151；80点自然预算下超支为−71，不钳平为0。
- 御剑路线当前实际花费33点（经卷2600）；补入真实父技能后的剑气路线42点（2600）；80点混合剑阵夹具明确投入弦月10、两仪10、剑破10、分光6、护体4、剑骨3、飞行1、凝神3、四象2，经卷3000。实际逐级购买，保留精确spent、book debit、余点、重复全洗不增点。
- 纯成长初始化测试改为 `skillsInitialized:true`、清空所有技能：实际16点已投＋1点初始弦月返17，自然总预算80仍不变，初始化后可用上限81。
- 自然规划器删除强制追加凝神前置；split策略的独立费用为60，68点来源剩8，真实经卷2700。基础父技能不拆、无钱/无点不拆、已进阶仍继续升级父技能等保护保留。
- 自然规划器原 `activeRun:{}` 替换为真实 `startFloor`→pause→checkpoint 状态；锁境夹具也从非法满级技能降到合法父技能1级，先证明Store接受。

### 2. 当前存档与故障注入

新增helper的职责仅是验证，不修复输入、不发资源：

- `assertCurrentCampaign` 检查readOnly=false、error空、migrationReport=null、完整state与期望严格相等，避免重置成新档后误通过。
- `assertActionSucceeds` 用独立内存存储编码同一当前state，执行相同交易，要求成功、仅写一次、重载完全一致。保存失败负向前先执行此控制，不让realm-locked遮住save-failed。
- 当前档仍用既有 `currentCampaignSchema`；迁移输入继续明确指定1–13、18、60等旧schema，没有把旧输入改成current。
- `sj_bone`已无经卷，因此从合法夹具books移除；保留技能本身及退款断言。缺全量pills键的老夹具改用 `freshPills()` 后覆盖目标库存。
- schema60测试保留other-game sentinel，并新增失败0次写、成功重试1次写、再重载不写；原始raw在失败时不变。
- 所有原有保存失败、过期写、重复结算、重复全洗、假书、超支、孤立进阶、非法等级和Run入场基准校验均保留。
- 旧loot快照必须同时不带依赖该契约的pickup receipt字段；补齐一致的历史形状后，仍证明每个快照单独有效，再要求Campaign拒绝引入/移除/重播不同loot种子。没有放宽validator或删除这三个负向方向。

### 3. 首通、货币、丹药、回复

依据：`docs/xianxia/economy/2026-11-03-resource-roles.md`、74号首层修为丹规则、`docs/superpowers/specs/2026-10-31-alchemy-and-material-drops-design.md`（培元50、合气100）、`design/balance/attribute-rules-2026-11-02.md`。

- 首通SP来自1/4/7层的4/7/9点，累计仍20；不再断言1–2层各1点。真实通关1、重刷1、通关2保持原子结算、exact wrong-attempt、重载，精确检查首层4SP和二层100灵石。
- 新档点眷1000。旧schema重置测试改为500灵石/1000点眷；普通丹药从灵石扣款，迁移后的持续消费改为真实购买回春丹5灵石，495余额重载不被再次重置。旧的drawWeapon消费不是当前入口。
- 剑罡等技能不花点眷；低余额经卷仍精确返回insufficient，另有200灵石正向对照。研习800/1600/2400与3/6/9层门槛不变。
- 服丹三例采用合法首通/完整库存。第三例原本让筑基角色服炼气培元丹，现改为5984→6084合气丹，仍检测小等级增长不触发战斗回血。
- 原“宗门每分钟1%”被明确废止；使用独立基础HP公式及20次三秒脉冲，预期60秒恢复maxHP/3。额外保留2.999秒不提前、重复同时间不再回血，不扩大误差。
- 第三层typed settlement仍逐个核对实际kill ledger掉落；非掉落灵石由旧200改为Boss100，首通另断言1000点眷。资源上限和重复结算保护保留。

### 4. 表现与固定装备夹具

依据：`sword-damage-types-2026-11-01.md`顶部11-02覆盖、`design/balance/skill-design-fixes-2026-11-03.md`、91号页面规则、`docs/superpowers/specs/2026-11-03-equipment-integer-budgets-design.md`第二版实施结果。

- 剑啸八方为纯物理；现行为自身爆发，预览半径180→220→270，没有飞行十字/远程落点/射程。仍保留一次命中、弦月各阶段形态、纯展示不改state的断言。
- 普通技能没有技能等级前置时隐藏rankRuleLines；进阶仍显示父技能1级，四象二阶明确金丹十层。所有skill下一rank的实际角色门槛仍由独立表验证。
- 自拼照胆“随机技能伤害词条”不是合法固定身份。等价替换为真实松风剑，验证剑气三技能等额享有flow、御剑没有这份增益、flow只计一次、文案可读；新增伪造额外技能词条必须拒绝。此例检查路由和身份，未宣称新装备预算全部通过。
- 非法fan极品roll改为真实凡器素问固定工厂。旧6%装备增益上限已被整数第二版覆盖；改为明确16攻击＋3力量只加一次的119面板，保留裸装100、初始铁剑105。不据此宣称三槽6倍预算通过。

## 废弃/改名用例映射

其他未改名用例只修合法fixture或依据上述规则改精确边界/费用。以下逐项记录更换语义的旧用例：

|旧名或参数化旧名|当前替代与仍保护的目标|
|---|---|
|cross receives its own qi weapon affix and the qi flow bonus with readable names|cross shares the current qi weapon flow and fixed identities reject forged skill affixes；保留流派正确路由、只算一次、拒绝伪造身份|
|crescent and cross text follows actual form changes rather than the former shared stages|名字保留；只把cross旧飞行描述改为获批自体爆发半径，弦月全部形态断言保留|
|all fully invested nodes cost 343 after teaching, and an overspend remains visible|151成本与−71超支可见，不删除超支保护|
|spending charges every attained rank once and refunds no teaching rank on respec|spending charges attained ranks and full initialization releases the arc gift exactly once；初始化一次返初始1点|
|tower upgrades allow basic attacks and already learned passives through rank 3 only|tower quotes allow all otherwise eligible skills and ranks；合法暂停后可升级的现行范围|
|special first study needs its floor and book but no base-skill prerequisite|special first study requires its book but no floor or base-skill prerequisite；保留书费、免重复书费，取消不存在的楼层门槛|
|all four evolutions have independent realm gates and approved costs|all four evolutions have independent realm gates and fixed rank costs；独立前后XP、父技能、精确2/4/2/4费用|
|御剑追击/剑气贯穿/剑阵控场 can be acquired one rank at a time within 80 points with all prerequisites|名字保留；按真实父技能投入的33/42/80点、2600/2600/3000经卷逐级获取|
|48-point realm-only pursuit build keeps its evolution without any research purchase|27-point pursuit build fits in realm points without first-clear or research awards；取消额外首通收入，真正只靠48自然点|
|pursuit split baseline buys real ranks and books, retains parents and leaves one earned point|同名结尾改leaves eight earned points；取消已废弃凝神强制投入，真实购书和基础留存|
|camp pill crossing a level from 44/1484/5399 XP keeps existing HP and natural regeneration|44/1484/5984 XP三秒回复版本；第三例使用合法筑基合气丹，仍不送战斗回血|
|bound tutorial roots cannot be purchased early or reclaimed as free SP|initialization releases only the initial arc gift and still respects learning gates；明确只增加初始1点，低境界仍受限|
|schema1…13 resets all old progression once and preserves subsequent schema11 spending|13例名字改current schema；保留旧schema输入、一次写、后续真实买药不重置|
|schema1…13 reset CAS cannot replace another host's schema11 save|13例名字改current schema；CAS失败原因和不覆盖winner不变|
|first two floor rewards are points, atomic and not granted again on replay|first floor grants four points; the second grants stones, atomically and without replay rewards|
|initialization converts only the initial arc and never grants another point|名字保留；初始1点改用于当前1级可学的剑骨，未用尚未开放的周天剑阵|
|yujian unlocks at exactly 225 XP and persists only after a successful write|45 XP版本；仍有44拒绝、写失败、重试、重载|
|detail page lists complete early and delayed rank bands, including maxed skills|detail hides redundant rank bands for ordinary skills and retains evolution parent requirements；普通门槛另由14个全rank测试覆盖|
|learning and rank caps are constant within each realm phase|rank caps stay constant inside phases except the authored level-two and level-thirty gates；全30层含精确特殊边界|
|fan equipment adds bounded damage without promising a kill-count breakpoint|current fan equipment adds its fixed attack and strength exactly once；119/105/100独立精确面板|
|nine immutable stages cover all 27 character levels and exactly the 7/7/4 skill allocation|30级、6/8/4现行分配；大圆满特例与数据冻结保留|
|actual authored nine-floor XP reaches each scheduled stage without moving the XP or SP caps|nominal nine-floor XP reaches level 27 while the full cultivation cap is level 30；不是宣称无瓶颈自然一次通关满级|
|retained-evolution compatibility keeps the pre-existing realm, book, parent and SP validation|current evolution saves enforce major realm, book, parent, rank and SP validation；增加独立孤立父技能与合法rank上超支拒绝|
|class rank caps follow new growth and evolution rank two retains its original gates|rank caps include the level-two entry and level-thirty second evolution gates|
|evo_tiandi held at old Lv19 stays valid through reload, downgrade and battle despite its later new-learning stage|evo_tiandi: obsolete Lv19 resets; legal ranks survive; premature current-schema evolution is rejected（修复前红灯，修复后通过）|
|evo_wuwo held at old Lv19 stays valid through reload, downgrade and battle despite its later new-learning stage|evo_wuwo: obsolete Lv19 resets; legal ranks survive; premature current-schema evolution is rejected（修复前红灯，修复后通过）|
|evo_sixiang held at old Lv19 stays valid through reload, downgrade and battle despite its later new-learning stage|evo_sixiang: obsolete Lv19 resets; legal ranks survive; premature current-schema evolution is rejected（修复前红灯，修复后通过）|

每项首次学习参数化旧名 `${id} first learning and further investment obey its LvN stage boundary` 的N变更如下（其余拒绝旧投资绕过、owned book免再付费、quoting pure的保护保留）：

|ID|旧N|现行N|
|---|---:|---:|
|sj_arc|1|1|
|sj_yujian|4|2|
|sj_bone|13|1|
|vajra|4|4|
|sj_heart|7|7|
|sj_cross|7|7|
|sj_line|10|11|
|sj_shadow|10|11|
|sj_formation|10|11|
|sj_flight|10|11|
|sj_spirit|1|11|
|sj_mark|13|14|
|sj_gate|16|17|
|sj_wanjian|1|17|
|evo_wanjian|19|21|
|evo_tiandi|22|24|
|evo_wuwo|22|24|
|evo_sixiang|25|27|

## 已修复生产缺陷：当前进阶存档跳过首次境界

测试：`tests/xianxia-tower-stage-growth.test.mjs:209`参数化3项，失败断言约256行。每项先完成旧schema18原子重置、合法当前进阶重载/被动退点/真实战斗，随后构造边界：

|进阶|合法首次XP|拒绝控制XP|父技能|
|---|---:|---:|---|
|evo_tiandi|8625（24级）|8624|sj_line 1级|
|evo_wuwo|8625（24级）|8624|sj_wanjian 1级|
|evo_sixiang|10920（27级）|10919|sj_formation 1级|

先证明不带进阶的同一低境界state被当前Store完整接受，并且 `skillRequirement` 返回精确stage-locked；再证明达到门槛时真实learnSkill交易可以成功并只写一次。最后把进阶1级及已付经卷直接编码进当前schema，期待只读corrupt、原始raw不改、零写；修复前实际readOnly=false、error为空、伪造进阶保留，三个断言均失败。修复后三项均准确只读corrupt、保持原始raw、零写，合法对照继续成功。

修复前的最小复现甚至在6601即可通过这三项进阶：新Store state＋xp6601＋初始弦月1和对应父技能1＋需要的父技能经卷与进阶经卷＋evolutionRanks[id]=1＋evolutions=[id]，用current schema和正确checksum保存，再new Store。

根因路径：`TowerCampaign.js:225`的valid → evolutionRanks循环 → 原 `skillRequirement(before,id,{ignoreStage:true})`。`TowerGrowth.skillRequirement`跳过learnLevel，只剩通用金丹21级rank gate，因此把旧投资兼容行为错误应用在当前schema。旧schema现在统一重置，用户明确不要求旧投资兼容。

红灯证据落盘后，主代理追加授权最小修复。本代理仅把这一调用改为 `skillRequirement(before,id).ok`，并将旧兼容注释改为当前存档必须遵守同一学习门槛。保留原有父技能、经卷、等级、SP、资源、CAS与写失败保护；未改TowerGrowth或任何数值。构造函数在valid之前处理旧schema重置，因此本次改动不改变重置范围。

修复后重新执行原13文件及 `xianxia-tower-campaign.test.mjs`，262/262通过。覆盖3组前后门槛、合法进阶重载/退点/战斗检查点、原子购书和升级，以及39项Campaign存读档、伪造校验、CAS、写失败、旧schema仅本模式重置等回归。该授权范围剩余真实或未裁决失败为0；全仓结果由主代理统一验证。

## 验证命令和日志

修复后最终命令（13个分配文件，加补充授权要求的Campaign存读档验证）：

```sh
node --test tests/tower-qi-progression.test.mjs tests/xianxia-natural-growth-strategy.test.mjs tests/xianxia-stone-skill-costs.test.mjs tests/xianxia-tower-campaign-growth.test.mjs tests/xianxia-tower-flight.test.mjs tests/xianxia-tower-growth-feedback.test.mjs tests/xianxia-tower-growth.test.mjs tests/xianxia-tower-manual-learning.test.mjs tests/xianxia-tower-rank-bands.test.mjs tests/xianxia-tower-realm-only-skills.test.mjs tests/xianxia-tower-skill-decrease.test.mjs tests/xianxia-tower-stage-growth.test.mjs tests/xianxia-yujian-growth.test.mjs tests/xianxia-tower-campaign.test.mjs
```

原始日志均保留在本报告同目录：

- `task-2b-before.log`：exit1，132/223，91失败。
- `task-2b-intermediate.log`：exit0，223/223；尚未加入最终信任边界三例，不是最终结果。
- `task-2b-final.log`：修复前边界红灯，exit1，220/223，3失败，耗时约2.16秒；按要求保留原文件。
- `task-2b-fixed.log`：修复后最终定向验证，exit0，262/262，0失败。

修复后最终原始摘要：

```text
1..262
# tests 262
# suites 0
# pass 262
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 5274.800041
```

另外运行了分组定向验证：9文件91/91、stage+campaign105/105、decrease+feedback27/27（均为三红灯加入前阶段）。最终以task-2b-fixed.log的262/262为准，修复前220/223红灯日志永久保留。`git diff --check -- <13 files> js/xianxia/TowerCampaign.js`通过。未运行全仓npm test、构建、数值平衡扫描；由主代理统一。


## 独立审查与证据归档

独立审查 t02b_review：规格与质量均通过，无 Critical/Important/Minor。验证了合法存档夹具、原子失败的正向对照、三个进阶精确边界与红灯证据。最终262/262。

本目录 `.gz` 为同名原始证据的无损压缩；evidence.json 中 SHA-256 对应解压后的内容。报告中的“未提交”描述实施代理交接时状态。
