# 成长数值与纯规则模块实施说明

> 2026-11-02 暴击口径覆盖：当前持续功法的每次伤害可以独立暴击；已结算的碧落／剑痕与武器附伤不再独立判暴击。暴击资格与直接伤害的派生触发资格分别判断。以[当前暴击规则](90-current-critical-hit-rules.md)及当前源码为准。本文下方相反描述、旧暴伤公式和旧实测解释保留为历史记录，不作为当前实施依据；历史测试数字不重写。

2026-10-28｜已实施`js/xianxia/TowerGrowth.js`及其定向测试。以[24号冻结合同](24-growth-runtime-contract.md)为接口、[23号点数曲线](23-skill-point-budget-proposal.md)为预算、[21号技能树](21-skill-tree-proposal.md)为父子关系。本稿描述已落入模块的规则；战斗调用、schema3迁移、原子保存及UI由各自模块负责，不能把本文件的单测当作完整接入或真人平衡结论。

只修改`TowerGrowth.js`、`tests/xianxia-tower-growth.test.mjs`和本稿。旧`TowerContent.js`的5级效果、旧经卷投资表与旧快照规则保留，不重生成副本、不修改HANDOFF。

## 1. 可直接import的API

| 导出 | 输入／返回 | 调用边界 |
|---|---|---|
| `GROWTH_SKILLS` | 12个技能定义数组 | 原id、name、kind；功法10级、心法8级 |
| `GROWTH_EVOLUTIONS` | 4个进化定义数组 | 原id、name、parent、passive；各3档数据，本期最多可修2级 |
| `giftSkills(tutorialWaves=0)` | 新建`{技能id:1}`字典 | 御剑始终1；累计清1波加剑气，清3波加万剑；3以上不再送 |
| `realmPoints(xp=0)` | 0–30整数 | 调用现有`cultivationAt`，不改变修为或HP公式 |
| `totalPoints(state)` | 境界＋首通＋研习 | 本期≤36；不读取击杀数、重复通关次数或系统时间 |
| `spentPoints(state)` | skills＋evolutionRanks逐级成本之和，扣已授教学1级 | 不按`books`或旧`evolutions`索引重复收点 |
| `growthSummary(state)` | `{total,spent,available,realm,firstClear,research,cap:36}` | 超支保留负available，交给Campaign拒绝／迁移，不能夹成0掩盖问题 |
| `skillRequirement(state,id,{inTower=false}={})` | `{ok,reason?,nextLevel,cost,bookCost}` | 只报价／判断；不扣丹、不改技能、不写盘 |
| `rankCap(id,xp,clearedFloor)` | 当前可达等级上限；未知id为0 | 普通技能按境界，进化另看通层；父技能/心法前置由requirement检查 |
| `GROWTH_POINT_CAP` | 36 | UI显示／合法性上限 |
| `GROWTH_RESEARCH` | 三行`{purchase,cost,learnClear,points}` | cost为妖丹；分别80/160/240，通3/6/9，各得1点 |

数据中的效果字段继续采用旧表约定：随等级变化的`damage/reach/radius/swords/target_cap`等是数组，固定的`cooldown/angle/width/hit_interval/ticks`等是标量，统一用`Array.isArray(value) ? value[level-1] : value`读取。不会把固定6目标突然改成10项数组使旧读法失效。

每个技能新增`pointCosts/maxLevel/special/bookCost/learnClear/prerequisites`。`max_level`只是等值兼容别名；**没有继承旧逐级prices或旧4/5级通层表**。`levels[level-1]`提供同名效果字段的单级行，供详情UI读取；它与顶层效果是同一数据的两种访问方式，不能再乘一遍“等级预算”。所有共享表、数组与嵌套前置均递归冻结。

`state`的相关字段为`xp/clearedFloor/researchPurchases/tutorialWaves/skills/evolutionRanks/books`。纯函数允许省略字段作为新档默认值；Campaign仍须验证完整schema、来源凭据、经卷归属和战斗快照。负数、分数、非数、越界XP/等级、未知投资节点不会被静默当0；数值错误抛`RangeError`，错误容器抛`TypeError`。`researchPurchases`大于`floor(clearedFloor/3)`也会拒绝，不能伪造尚未解锁的点数来源。

`skillRequirement`对未知id返回`unknown-skill`和0报价；合法节点满级返回`max-level`，`nextLevel`保持上限且两项费用为0。其余失败保留目标等级与费用，方便UI说明缺什么。失败优先级为：满级→教学→塔内场所→境界→通层→前置→技能点不足。钱包不足由Campaign在同一购书/升1事务里判断，纯规则不增加未约定的货币错误码。

## 2. 36点总账与绑定教学

Lv1不发自由点；每个普通升级1点，Lv10和Lv19各发3点**总计**。公式为：

`realmPoints = level−1 + (level≥10 ? 2 : 0) + (level≥19 ? 2 : 0)`

| 境界节点 | 对应XP | 累计境界点 |
|---|---:|---:|
| 炼气一重Lv1 | 0 | 0 |
| 炼气九重Lv9 | 1200 | 8 |
| 筑基一重Lv10 | 1485 | 11 |
| 筑基九重Lv18 | 4845 | 19 |
| 金丹一重Lv19 | 5400 | 22 |
| 金丹圆满Lv27 | 10920 | 30 |

第3/6/9层完整首通各加1点，以永久最高已通层计算，共3；三次道悟研习再加3，最多36。研习总支出480妖丹，无第四次、每日重置或随机点数。本模块以永久来源状态派生总点数，反复调用不再次“领奖”；相应唯一来源提交与扣款由Campaign保存。

御剑1、累计完整清第1波剑气1、第3波万剑1是绑定教学等级，不占36点，也不能洗成自由点。`spentPoints`只对实际存在且已授予的教学等级扣除其1级成本，不会对未学节点扣成负数。`giftSkills(10000)`仍只返回三个1级。低等级加点之外没有旧方案的“所有技能免费练至3级”。

教学事件与技能合并的同一事务中，`skillRequirement`可读取“tutorialWaves已更新、skills尚未合并”的短暂纯数据视图，按已授1级报价升2级；Campaign应将赠礼合并后保存，不能长期保存缺失教学技能的状态。

全洗退回`spentPoints`的实际点数，重置技能为`giftSkills(tutorialWaves)`并移除全部进化等级；books保留，不返经卷妖丹，不重置来源。各节点成本如下：

| 节点类型 | 所含id | 每级SP成本 | 满级成本 |
|---|---|---|---:|
| 基础功法10级 | sj_yujian、sj_arc、sj_wanjian | 1/1/1/1/1/1/2/2/2/2 | 14；获教学后13 |
| 特殊功法10级 | sj_line、sj_shadow、sj_formation | 2/2/2/2/2/2/3/3/3/3 | 24 |
| 基础心法8级 | sj_heart、vajra、magnet | 1/1/1/1/1/2/2/2 | 11 |
| 特殊心法8级 | sj_mark、sj_bone、sj_gate | 1/1/2/2/2/2/3/3 | 16 |
| 四进化各3级 | evo_wanjian、evo_wuwo、evo_tiandi、evo_sixiang | 3/4/5 | 12 |

完整16节点的理论满级成本扣教学后为240。该数只说明总量取舍；本期进化3级不可学习，也不能要求玩家全满才能通塔。

## 3. 修习门槛与经卷

普通功法在炼气／筑基／金丹的等级上限为3/6/10；心法为3/5/8。这里的“普通技能”包括基础和特殊技能，特殊仍需先满足首次学习条件。普通技能的`rankCap`只表达境界上限，不代表经卷／通层／首次前置已满足。

按23号原句“普通功法和已学心法的前3级”落实塔内操作：基础功法可升至3；已学基础或特殊心法可升至3；首次学习心法、任何特殊功法修习、进化及4级以上必须回藏经阁。已有特殊功法的2/3级也在宗门修习，避免把此前21号“所有已学技能塔内研修”混入新合同。无4＋4或2进化的携带额度；学会后是否自动加入战斗由Campaign/Run的growthVersion1路径处理。

| 首次修习 | 经卷妖丹 | 已通层门槛 | 技能前置 |
|---|---:|---:|---|
| 御剑／剑气／万剑1级 | 0 | 教学事件 | 教学前不能花SP提前替代 |
| 剑心／金刚／聚灵 | 0 | 0 | 无 |
| 剑影分光 | 20 | 1 | 御剑2 |
| 一线天 | 20 | 1 | 剑气2 |
| 两仪剑阵 | 20 | 2 | 万剑2 |
| 青萍剑意／剑骨 | 10 | 1 | 无额外母节点 |
| 剑开天门 | 10 | 2 | 无额外母节点 |
| 四进化 | 各240 | 见下表 | 对应母功法和心法 |

首次特殊／进化且`books`未拥有才报价经卷费用；拥有经卷但修习0级时只花SP。已有等级后不再次收费，4级以上也没有旧80/120等妖丹费用。特殊功法的母节点2级限制只在首次修习时检查；经卷既有所有权不因新增前置被撤销。

| 进化 | 母功法 | 配套心法 |
|---|---|---|
| 万剑归宗 evo_wanjian | 御剑术 sj_yujian | 剑心通明 sj_heart |
| 无我剑境 evo_wuwo | 万剑诀 sj_wanjian | 剑骨 sj_bone |
| 天地一剑 evo_tiandi | 一线天 sj_line | 青萍剑意 sj_mark |
| 四象剑阵 evo_sixiang | 两仪剑阵 sj_formation | 剑开天门 sj_gate |

| 进化目标级 | 角色条件 | 通层 | 母功法／心法 | SP |
|---|---|---:|---|---:|
| 1 | 金丹Lv19 | 6 | 6／4 | 3 |
| 2 | 金丹圆满Lv27 | 9 | 8／5 | 4 |
| 3 | 后续元婴，当前不可达 | 已通9仍不够解锁 | 10／6 | 5 |

第3档的`characterLevel:28`仅作为“严格高于本期27”的不可达门槛，**不是新增元婴XP曲线或第10层**。`cultivationAt`仍拒绝10920以上XP，本期`rankCap(evolution,10920,9)=2`，从2升3返回`realm-locked`。保留第三档成本与效果供未来版本显式启用，不能把数据存在等同开放学习。

## 4. 六功法完整效果与节拍

`A`是Run算出的攻击基值，已经包含现有境界与武器加成；本模块不再次乘装备，不改变30%装备上限、HP或角色修为曲线。下表`damage`均为A的系数。除御剑的整轮总额外，其他伤害按单个命中目标／单跳解释。

| 功法 | Lv1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 御剑整轮 | 1 | 1.05 | 1.10 | 1.16 | 1.22 | 1.29 | 1.36 | 1.43 | 1.51 | 1.60 |
| 剑气单次 | .9 | .945 | .99 | 1.044 | 1.098 | 1.161 | 1.224 | 1.287 | 1.359 | 1.44 |
| 万剑共享命中窗 | .2 | .21 | .22 | .232 | .244 | .258 | .272 | .286 | .302 | .32 |
| 一线天单次 | 1.25 | 1.325 | 1.4 | 1.4875 | 1.575 | 1.675 | 1.775 | 1.875 | 1.9875 | 2.1 |
| 剑影单次 | 1.1 | 1.166 | 1.232 | 1.309 | 1.386 | 1.474 | 1.562 | 1.65 | 1.749 | 1.848 |
| 两仪每跳 | .14 | .1484 | .1568 | .1666 | .1764 | .1876 | .1988 | .21 | .2226 | .2352 |

基础功法各自Lv1×23号基础曲线，特殊功法各自Lv1×特殊曲线；计算后最多保留6位小数消除浮点尾数。没有把旧Lv5作为新Lv1，也没有简单把旧五级增幅翻倍。

| 功法 | 节拍（全等级固定） | 伤害时点 | 每轮目标上限 | 理想单目标DPS/A：Lv1→10 |
|---|---|---|---|---|
| 御剑 | 起手间隔1s，前摇.12s | 各飞剑真实接触 | 1/1/2/2/2/3/3/3/3/4 | 1→1.6 |
| 剑气 | 起手间隔2.5s，前摇.18s | 释放时一次 | 6 | .36→.576 |
| 万剑 | 同目标共享.6s命中间隔 | 符合范围时每窗一次 | 6 | .333333→.533333 |
| 一线天 | 起手间隔4s，前摇.12s | 释放时一次 | 3/3/4/4/4/5/5/5/5/6 | .3125→.525 |
| 剑影 | 起手间隔4s，前摇.12s | 放印后延迟.65s，一次爆发 | 6 | .275→.462 |
| 两仪 | 起手间隔8s，前摇.12s | 放阵后.5s首跳，3s内6跳 | 8 | .105→.1764 |

表中起手间隔包含前摇；不能先等待cooldown再额外加windup形成另一套攻击频率。飞行时间、无目标、离开区域、施法锁定和实际命中会降低实战速率，上表没有模拟这些损失。

逐级空间参数：

| 字段 | Lv1→10 |
|---|---|
| 御剑reach | 360/360/380/380/400/420/420/440/440/460 |
| 御剑swords | 1/1/2/2/2/3/3/3/3/4 |
| 剑气radius | 140/140/150/150/160/170/170/180/180/190；angle始终90° |
| 万剑radius | 90/90/95/95/100/105/105/110/110/120 |
| 万剑swords | 4/4/5/5/5/6/6/6/6/8，仅覆盖／表现 |
| 一线天reach | 360/360/390/390/420/450/450/480/480/510；width始终28 |
| 剑影radius | 80/80/90/90/100/110/110/120/120/130；施法reach固定360 |
| 两仪radius | 110/110/120/120/130/140/140/150/150/160；施法reach固定360 |

**多飞剑不增发预算。** 御剑Lv10整轮1.6A、4剑时每剑.4A，少目标可集中，总额仍1.6A，不是4×1.6A。万剑Lv10虽显示8剑，同目标每.6s只结算.32A一次；内外圈或多个剑体不能各有独立伤害冷却。两仪所有阵眼共享六跳账本，不按阵眼重复派发。

范围和目标上限增加是明确的群体覆盖收益，不声称多目标总伤害也只增长1.6倍。例如一线天理想满目标一轮从3×1.25A变为6×2.1A；单目标倍率1.68与群体上限收益应分开评估。此处没有再随等级提高攻速来隐蔽叠乘。

## 5. 六心法完整效果

百分比为小数值的人类读法，模块仍用0.02等小数。光环只由UI/Run表现既有能力，不派生额外伤害。

| 心法／字段 | Lv1→8 |
|---|---|
| 剑心crit_chance | 2/2.5/3/3.5/4/4.5/5/6% |
| 金刚reduction | 2/2.5/3/3.5/4/4.5/5/6% |
| 聚灵pickup_bonus | 8/10/12/14/16/18/21/24% |
| 青萍wound_share | 2/2.25/2.5/2.75/3/3.25/3.5/4% |
| 剑骨damage_bonus | 1/1.25/1.5/1.75/2/2.25/2.5/3% |
| 剑骨speed_bonus | 1/1.5/2/2.5/3/3.5/4/5% |
| 天门share | 1/1.1/1.25/1.4/1.55/1.7/1.85/2% |
| 天门proc_damage，单位A | .08/.09/.10/.11/.12/.13/.145/.16 |
| 天门radius，单位u | 60/65/70/75/80/85/90/100 |

剑心固定`crit_bonus=.5`，满级对可暴击基础直伤的期望增量为3%，不暴击持续和触发伤害。剑骨直伤与其他心法增益相加，移速另算，没有冷却缩减。金刚仍受原合计10%常驻减伤上限；聚灵不改变掉落数量／价值。

青萍按有效直伤增加预算，2秒内结清；重复命中只并入新增预算，不复制剩余剑痕。天门按有效直伤积累预算，初始为0、每笔保留10秒，ICD3秒、最多4目标；击杀时最多花`min(已有预算, proc_damage×A)`，多目标平分，不递归。`proc_damage`只是一次释放上限，不能把它当成每次击杀凭空赠送的额外伤害。例如1000有效直伤，满级剑痕最多新生40预算，天门最多积累20预算。

## 6. 四进化的同母级预算

`budgetMultipliers=[1.10,1.15,1.20]`是相同母功法等级下的理想平均预算倍率，不是额外+110/115/120%。既有进化替换母通道，不能母版与进化同时各打一次。字段通过`GROWTH_EVOLUTIONS`提供，Run不应继续读取旧Lv5固定1.188、.352或2.7225等系数。

| 进化 | 已实施参数／预算表达式 |
|---|---|
| 万剑归宗 | 普通御剑整轮为母版90%；剑雨每8s，6跳、间隔.2s、半径160、最多6目标；每目标每跳=`母版单体DPS×(倍率−.9)×8/6` |
| 无我剑境 | 外圈每命中窗为母版damage×倍率，内圈为母版50%；共享.6s窗口只取高值，不相加；半径与目标上限沿母版 |
| 天地一剑 | .9s蓄势，释放后5.1s至下次起手，总间隔6s；单击=`母版damage×6/母版cooldown×倍率`；射程与贯穿数沿母版 |
| 四象剑阵 | 4个阵眼，间隔.5s共6跳、持续3s、起手间隔8s；每跳=`母版damage×倍率`，共用单一账本；半径和目标数沿母版 |

算例：御剑Lv10＋万剑归宗1，普通轮1.44A/s，剑雨每目标每跳约.426667A，6跳每8s补.32A/s，合计1.76A/s=母版1.6A/s×1.10。Lv10一线天＋天地一剑1单击为3.465A，6s均值.5775A/s=母版.525A/s×1.10。

上述进化预算按同一目标持续可命中计算；剑雨多目标扩散、内圈较低伤害、蓄势落空等仍会改变实战结果。第三档数值也有算术测试，但没有因此越过元婴门槛。

## 7. 三条36点路线与成本

前提为教学已完成、金丹圆满、已通9层、三次研习已完成；每条均由测试逐级调用`skillRequirement`，按真实前置顺序加点，不只是把成本相加。所有未列出的节点为0，三个绑定基础1级始终保留。

| 路线 | 节点目标等级＝实际SP | 合计 | 首次经卷妖丹 |
|---|---|---:|---:|
| 御剑追击 | 御剑10=13；剑心4=4；剑影3=6；剑气3=2；万剑3=2；金刚3=3；聚灵3=3；万剑归宗1=3 | 36 | 20＋240＝260 |
| 剑气贯穿 | 一线天8=18；青萍4=6；天地一剑1=3；剑气4=3；御剑2=1；金刚3=3；聚灵2=2；万剑1=0 | 36 | 20＋10＋240＝270 |
| 剑阵控场 | 两仪6=12；天门4=6；四象1=3；万剑6=5；剑骨3=4；金刚3=3；聚灵2=2；御剑2=1；剑气1=0 | 36 | 20＋10＋10＋240＝280 |

若经卷从零收集且三次研习也从零购买，相应累计妖丹为740/750/760；未把已有经卷再收一遍。移除御剑路线的剑影3即可省6点，成为30点方案，保留进化与三基础功法；这验证“不必依赖三次兑换点才有完整组合”，不是通塔保证。

以所有主动技能持续命中同一目标、不加心法／装备、不计起手和弹道损失的理想情形作账面比较：

| 路线 | 主动通道合计伤害速率/A |
|---|---:|
| 御剑追击 | 2.830667 |
| 剑气贯穿 | 2.316558 |
| 剑阵控场 | 1.994770 |

三条点数相同不意味着单体或群体输出相同。御剑偏追击集中，贯穿可打更多直线目标，阵法需要近身／留在区域。没有为了凑三条算术DPS相等，擅自提高23号曲线或提高射速。现有`hit_assumption`只是旧静态规划假设，没有作为本轮实测覆盖率；这里只检查数值预算与可支付性，九层生存、清波耗时和真实三路线差异交给Run/主线程验证。

## 8. 首轮实施验证记录（历史结果）

在仓库根目录执行：

```sh
node --check js/xianxia/TowerGrowth.js
node --test tests/xianxia-tower-growth.test.mjs
npm test
```

定向测试覆盖所有API、旧表隔离、27级逐节点发点、首通/研习唯一来源边界、教学封顶与不退款、所有技能/进化门槛、塔内可操作范围、经卷只收一次、240点全投资、三条逐级36点路线、多剑分账、进化平均预算、输入非法值与数据冻结。

首轮定向21项通过。并行集成期间执行全量`npm test`得到980项、976通过、4失败，具体为：

- `tests/survivor-sync.test.mjs`的“SYNC-02 清单覆盖全部 survivor/xianxia 模块（除已登记的占位）”：新TowerGrowth尚未生成到副本清单。
- 同文件“SYNC-02 清单 sha256 = 当前源码；shared 副本 = 头注释 + 去 .js 后缀的源码”：并行改动的TowerRun与旧清单哈希不同。
- `tests/xianxia-breakthrough.test.mjs`的“schema-1 camp migration preserves investments, clamps only surplus health, and writes atomically”。
- 同文件“legacy paused battle migrates derived stats without resetting enemies, input, cooldowns or rewards”。

后两项旧夹具从当前fresh构造状态后标记为schema1，在Campaign已转schema3的并行版本中被拒绝；夹具还保留写回schema2的旧断言。应由集成方使用真实旧schema夹具更新回归，不能为通过测试而放宽校验接受错标存档。本次没有修改其文件，也没有运行生成副本命令；不能把该次全量结果称为全绿。

本模块未做任何存储事务、浏览器、构建、微信真机或真人平衡验收。经卷扣款与SP加点原子性、教学清波防重、旧投资退款、暂停更新在途攻击、光环事件和九层可推进性，需要Campaign/Run/UI及主线程各自的集成证据。

## 9. Goodall模拟的数值复核

本节只读复核[Goodall原始报告](../reports/tower-growth-2026-10-28/balance.json)和[压力反馈](../reports/tower-growth-2026-10-28/balance-feedback.md)，不覆盖其文件。**本轮没有修改TowerGrowth数值。** 报告版本门禁为`source-changed-rerun-required`，不能认定当前完整集成版本通过。初次复核时Growth、Run、Profile、Content与报告哈希一致，随后Run又有并行更新。以下程序显式输出是否跨版本，逐波时间／HP／成长必须仍与旧报告一致，运行期间源码也须保持不变，否则拒绝给出比较结果；即使重放一致，也不代替Campaign最新全流程验收。全量测试及共享副本同步由主线程负责，本轮不运行`npm test`。

### 优先给主线程：第三层末波诊断

第三层Boss是**盘丝蛛后：4阶、5200HP、伤害24、移速143、碰撞半径42**，支援共8只（4蛛2狼2蝠），开场4、半血或死亡再4。首次进入末波时，三种子XP均为1625，已超过筑基门槛1485；HP依次为103.4／80.8／109，主动三招均3级，金刚已升3级。并非“必须到金丹才能进入”或前19波耗至残血。

按原报告逐次暂停学习记录重放，首次三层失败的波次时间与HP完全复现。三个种子的末波受击依次为7／4／5次，均为蛛网首次结算，对应`24×(1−3%)=23.28`；死亡时Boss分别剩168.3965／2612.3182／1318.4773HP。bot受击时距Boss约246–254u，与其“>250u追近”的转向边界重合。种子1还有途中拾取回血，不能用受击次数倒推出净HP变化。

当前蛛网参数是：施法距离100–480u、预警0.85s、0.15s锁定落点、落网后0.35s首跳、半径90u、每1s结算一次共4跳、范围内移速×0.75。命中玩家的实际中心距离为90＋18＝108u。锁定后至首跳共有1.05s；无减速时220u/s可走231u，已在网内按165u/s仍可走173.25u。从网中心直线离开所需0.491s／0.655s，**几何上存在逃离时间，但尚不等于真人易读、易操作**。

**已完成同一真实末波快照的走位对照，当前建议不削Boss、不放宽修为、不补自由SP。** 固定同一帧HP、XP、技能、怪物台账、位置、冷却、随机数状态，仅给原bot增加一条规则：处于蛛网预警或落网中心148u内（90＋18＋40安全余量）时，优先径直向外离开，退出后继续原策略。无瞬移、无改速、无无敌，不把该策略接入玩家控制或正式运行时。

| 种子 | 初始HP／XP | 原策略末波 | 只改离网走位 | 离网策略终局HP／受击 |
|---|---|---|---|---|
| 1 | 103.4／1625 | 47.950s，死亡，Boss剩168.3965 | 44.283s，全20波完成 | 109／0 |
| 7 | 80.8／1625 | 25.817s，死亡，Boss剩2612.3182 | 42.633s，全20波完成 | 80.8／0 |
| 43 | 109／1625 | 39.083s，死亡，Boss剩1318.4773 | 45.350s，全20波完成 | 109／0 |

胜利均包含半血后支援清完。种子1HP增加来自原掉落拾取，既未写HP也未新发恢复。**此对照否定了“现有三层Boss必须升金丹／反复刷修为才能打过”的推断，并证明旧bot策略是本批失败的主要原因；它不证明真人必定一次过。** bot仍有读取预警、零反应延迟的优势。玩家能否及时看懂落网、是否有拖动操作延迟，需主线程的独立体验工具与真人验证。

建议Goodall保留原策略作为压力基线，另命名离网策略，不覆盖原失败记录；后续自然九层重测同时记录策略名、三层末波受击类型和死亡时Boss余血。若真人同样反复吃首次落网，应先检查预警显示／读图，再单独评估将三层Boss落网后首跳延迟由0.35s增至0.50s的候选（多33u常速／24.75u减速后的逃离距离）；该候选尚未实施，不降低24伤害、不降低5200HP、不修改普通或其他层蜘蛛。

同种子、满境界、同HP和同武器的九层fixture比较的是整层效能。DPS分母包含刷怪、行走和等待；末波还包含支援，均不能写成“单体Boss DPS”。自然流程只有御剑36／30两种购买策略，不存在三条路线各自从零通九层的证据。36点自然路线首次进九层实际花34点，最后2点要通九层及回宗后才能取得。

### 三路线差异与微调取舍

同条件重放的三种子平均值如下。“前19波”仍包含精英与刷怪等待，不能直接当作纯群攻测试；“末波”仍包含支援和走位。

| 36点路线 | 理想单体主动DPS/A | 理想六目标合计DPS/A | 前19波秒数 | 末波秒数 | 整层秒数 |
|---|---:|---:|---:|---:|---:|
| 御剑 | 2.830667 | 9.784000 | 343.578 | 47.444 | 391.022 |
| 贯穿 | 2.316558 | 8.133725 | 484.767 | 59.755 | 544.522 |
| 剑阵 | 1.994770 | 6.718620 | 432.389 | 75.239 | 507.628 |

御剑并非单纯“牺牲群攻换单体”：本路线同时投入剑影和剑雨，多目标理论上界也高于另外两条，因此不能用流派定位解释成三套已经等强。贯穿比御剑多出的153.50s中，141.189s发生于前19波；剑阵多出的116.606s中，27.794s发生于末波。当前样本同时反映预算分配、空间覆盖、锁定落空和策略选择，不能从整层秒数倒推应给单体增伤39%或30%。

只读观测与候选：

| 项目 | 本次证据 | 具体小幅候选及边界 | 本轮决定 |
|---|---|---|---|
| 贯穿冻结方向后的落空 | 262次施法的释放前末帧，99次走廊内无活目标；每次平均1.225个潜在目标，远低于5目标上限。这是几何诊断，不是精确命中率。 | `sj_line.width` 28→36，其他字段不变。同一批帧复评为空94次、平均1.286目标，潜在目标总数321→337，仅约+4.98%。单体命中后的伤害、6s周期及36点不变。 | 暂不落地。覆盖改善较小，不能据此承诺解决39%耗时差，更不加倍率。 |
| 剑阵近身覆盖 | 有敌人的帧中，万剑可触及至少一只敌人的比例20.249%；同一批帧半径增加10u时为23.308%，仅+3.059个百分点。 | 只对万剑Lv4–10半径加10u：`90/90/95/105/110/115/115/120/120/130`，Lv1–3不动。保持0.6s共享命中窗、每窗伤害和剑数预算。 | 暂不落地。先用固定近身／守区策略对照，确认改善的是可操作覆盖；不把机会帧当成伤害增幅。 |
| 第三层成长与Boss | 同一末波状态只换离网方向，三种子全部由败转胜且零受击。 | 先改QA策略并保留原压力基线；真人仍吃首跳时再评估上述0.35→0.50s首跳延迟候选。 | 不改24伤害、5200HP、修为门槛、技能点或掉落。 |

后续一次只测一个候选，保留相同种子／起始状态，并同时检查固定单目标、直线多目标、分散敌人、原追击策略和守区策略。调整范围后单目标持续命中的预算必须不变；真实移动目标的命中机会可以改善，但要如实记录。不能通过改变敌人数、移除支援、缩减波次、补HP、降低点数成本或超36点来制造三套同清层时间。

**本轮交付结果：两个下列文档内命令均退出0。** 九层重放的逐波时间、HP、技能与有效伤害仍与Goodall记录一致；三层原策略复现失败，离网策略完成20波。执行期间源码未变，使用的Growth SHA256为`39195430045ce4e7470adc1eeed0496ccdfd1beea34c23c262aa6689287a72b0`，Run为`65f8d3525188f7a0a6e3eefa9f9b39a0cca0e8759d689039fd0a67ad43d0baf8`。Run与原报告不同已在输出`baselineSourceMatches.TowerRun=false`中披露；这些只读重放不能清除原报告的Campaign集成门禁，也不是最新全量测试、浏览器或真人验收。

以下只读复核程序直接复用Goodall的`play`和已记录loadout重放九层，不改变敌人、HP、RNG、冷却或伤害函数，也不写Campaign存档。版本变化必须在输出中披露，不能把旧报告哈希贴到当前源码上。程序分别输出：

- 同目标持续命中的主动通道理论预算，以及**六个目标始终同时符合所有技能几何**的理想上界；两者都不加入心法、暴击、弹道和目标移出损失，不冒充木桩实测。
- 1–19波、20波、Boss在场时间；后两项包含支援、走位与施法等待。
- 有活敌人的帧中，万剑半径内至少有一只活敌人的比例；它是施法机会，不能当作实际伤害占比。
- 天地一剑释放前最后一帧的走廊潜在目标数。下一帧敌人还会移动，其他攻击也可能先击杀，所以该值只诊断冻结朝向的几何风险，不能当成精确命中率。

在仓库根目录运行下列命令，可直接执行本稿内的程序，不产生额外脚本或报告：

```sh
python3 - <<'PY' | node --input-type=module
from pathlib import Path
text = Path('docs/xianxia/sect-tower-v1/25-growth-numerics.md').read_text()
print(text.split('<!-- growth-balance-audit:start -->\n```js\n', 1)[1].split('\n```\n<!-- growth-balance-audit:end -->', 1)[0])
PY
```

<!-- growth-balance-audit:start -->
```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { TowerRun } from './js/xianxia/TowerRun.js'
import { GROWTH_SKILLS, GROWTH_EVOLUTIONS, growthSummary } from './js/xianxia/TowerGrowth.js'
import { play } from './scripts/verify-tower-growth-balance.mjs'
const root = 'docs/xianxia/reports/tower-growth-2026-10-28/'
const report = JSON.parse(readFileSync(root + 'balance.json', 'utf8'))
const digest = path => createHash('sha256').update(readFileSync(path)).digest('hex')
const files = ['TowerGrowth', 'TowerRun', 'TowerProfile', 'TowerContent']
const before = Object.fromEntries(files.map(id => [id, digest(`js/xianxia/${id}.js`)]))
const baselineSourceMatches = Object.fromEntries(files.map(id => [id, before[id] === report.sourceHashes[id]]))
const scriptHash = digest('scripts/verify-tower-growth-balance.mjs')
assert.equal(scriptHash, report.scriptHash, 'Goodall helper changed: rerun its baseline first')
const S = Object.fromEntries(GROWTH_SKILLS.map(s => [s.id, s]))
const E = Object.fromEntries(GROWTH_EVOLUTIONS.map(s => [s.id, s]))
const value = (s, key, level) => Array.isArray(s[key]) ? s[key][level - 1] : s[key]
const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length
const round = n => Number(n.toFixed(6))
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
function ideal(loadout, targets) {
  let total = 0
  for (const [id, level] of Object.entries(loadout.active)) {
    const skill = S[id], damage = value(skill, 'damage', level)
    let channel = damage * skill.single_dps_factor
    const evolution = loadout.evolutions.map(id => E[id]).find(e => e.parent === id)
    if (id === 'sj_yujian') {
      if (evolution) {
        const multiplier = evolution.budgetMultipliers[loadout.evolutionLevels[evolution.id] - 1]
        channel *= evolution.regularMultiplier
          + (multiplier - evolution.regularMultiplier) * Math.min(targets, evolution.rainTargetCap)
      }
    } else {
      if (evolution) channel *= evolution.budgetMultipliers[loadout.evolutionLevels[evolution.id] - 1]
      channel *= Math.min(targets, value(skill, 'target_cap', level))
    }
    total += channel
  }
  return round(total)
}
const rows = []
for (const fixture of report.fixtures) {
  const recorded = fixture.combat, loadout = recorded.loadout
  // Report summaries omit tutorialWaves; recover it from the unchanged fixture loadout.
  assert.equal(growthSummary({...recorded.start, tutorialWaves: loadout.tutorialWaves}).spent,
    fixture.route.endsWith('30') ? 30 : 36)
  const run = new TowerRun({attemptId: 1, floor: 9, seed: fixture.seed,
    hp: recorded.start.hp, xp: recorded.start.xp, loadout})
  const observed = {enemyFrames: 0, orbitFrames: 0, orbitFramesPlus10: 0,
    lineCasts: 0, lineEmpty: 0, lineTargets: 0, lineEmpty36: 0, lineTargets36: 0}
  let bossStart = null, bossEnd = null, bossId = null, lastLine = -1
  const result = play(run, {maxSeconds: report.options.maxSeconds, onStep: run => {
    const s = run.state, enemies = s.enemies.filter(e => e.hp > 0)
    const radius = value(S.sj_wanjian, 'radius', loadout.active.sj_wanjian)
    if (enemies.length) {
      observed.enemyFrames++
      if (enemies.some(e => distance(e, s.player) <= radius + e.radius)) observed.orbitFrames++
      if (enemies.some(e => distance(e, s.player) <= radius + 10 + e.radius)) observed.orbitFramesPlus10++
    }
    const boss = enemies.find(e => e.role === 'boss')
    if (boss && bossStart === null) { bossStart = s.time; bossId = boss.id }
    if (bossStart !== null && bossEnd === null && s.killLedger.some(k => k.id === bossId)) bossEnd = s.time
    for (const c of s.casts.filter(c => c.skill === 'sj_line')) {
      if (c.releaseAt - s.time > 1 / 60 + 1e-9 || c.releaseAt === lastLine) continue
      lastLine = c.releaseAt
      const reach = value(S.sj_line, 'reach', c.level), width = S.sj_line.width
      const candidates = candidateWidth => enemies.filter(e => {
        if (distance(e, c) > reach + e.radius) return false
        const projection = Math.max(0, Math.min(reach, (e.x - c.x) * c.dirX + (e.y - c.y) * c.dirY))
        return Math.hypot(e.x - c.x - projection * c.dirX, e.y - c.y - projection * c.dirY) <= candidateWidth / 2 + e.radius
      })
      observed.lineCasts++
      for (const [candidateWidth, targetsKey, emptyKey] of [
        [width, 'lineTargets', 'lineEmpty'], [36, 'lineTargets36', 'lineEmpty36'],
      ]) {
        const count = candidates(candidateWidth).length
        observed[targetsKey] += Math.min(count, value(S.sj_line, 'target_cap', c.level))
        if (!count) observed[emptyKey]++
      }
    }
  }})
  assert.equal(result.run.state.phase, recorded.outcome)
  assert.equal(Number(result.run.state.time.toFixed(3)), recorded.seconds)
  assert.equal(result.metrics.effectiveDamage, recorded.metrics.effectiveDamage)
  assert.deepEqual(result.metrics.waves, recorded.metrics.waves, 'same wave timing, HP and growth')
  assert.equal(result.metrics.damageAudit.exactWithinTolerance, true)
  assert.ok(bossStart !== null && bossEnd !== null && bossEnd >= bossStart, 'observed boss life interval')
  const wave19 = result.metrics.waves.find(w => w.wave === 19).seconds
  rows.push({route: fixture.route, seed: fixture.seed, idealSingle: ideal(loadout, 1),
    idealSix: ideal(loadout, 6), seconds: recorded.seconds, first19: wave19,
    wave20: round(recorded.seconds - wave19), bossAlive: round(bossEnd - bossStart),
    ...observed})
}
for (const id of files) assert.equal(digest(`js/xianxia/${id}.js`), before[id], `${id} changed during audit`)
assert.equal(digest('scripts/verify-tower-growth-balance.mjs'), scriptHash)
console.log(JSON.stringify({scope: 'read-only replay plus theoretical budget; not single-target combat test',
  baselineStatus: report.status, baselineSourceMatches, sourceHashes: before, rows,
  means: [...new Set(rows.map(r => r.route))].map(route => {
    const group = rows.filter(r => r.route === route), sum = key => group.reduce((s, r) => s + r[key], 0)
    return {route, idealSingle: group[0].idealSingle, idealSix: group[0].idealSix,
      seconds: round(mean(group.map(r => r.seconds))), first19: round(mean(group.map(r => r.first19))),
      wave20: round(mean(group.map(r => r.wave20))), bossAlive: round(mean(group.map(r => r.bossAlive))),
      orbitOpportunityPct: round(100 * sum('orbitFrames') / sum('enemyFrames')),
      orbitPlus10OpportunityPct: round(100 * sum('orbitFramesPlus10') / sum('enemyFrames')),
      lineCasts: sum('lineCasts'), lineEmpty: sum('lineEmpty'),
      lineEmpty36: sum('lineEmpty36'),
      lineTargetsPerCast: sum('lineCasts') ? round(sum('lineTargets') / sum('lineCasts')) : null,
      lineTargets36PerCast: sum('lineCasts') ? round(sum('lineTargets36') / sum('lineCasts')) : null}
  })}, null, 2))
```
<!-- growth-balance-audit:end -->

第三层的因果对照复跑命令：

```sh
python3 - <<'PY' | node --input-type=module
from pathlib import Path
text = Path('docs/xianxia/sect-tower-v1/25-growth-numerics.md').read_text()
print(text.split('<!-- growth-floor3-audit:start -->\n```js\n', 1)[1].split('\n```\n<!-- growth-floor3-audit:end -->', 1)[0])
PY
```

<!-- growth-floor3-audit:start -->
```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { TowerRun } from './js/xianxia/TowerRun.js'
import { GROWTH_SKILLS } from './js/xianxia/TowerGrowth.js'
import { play, steer } from './scripts/verify-tower-growth-balance.mjs'
const report = JSON.parse(readFileSync('docs/xianxia/reports/tower-growth-2026-10-28/balance.json'))
const digest = p => createHash('sha256').update(readFileSync(p)).digest('hex')
const files = ['TowerGrowth', 'TowerRun', 'TowerProfile', 'TowerContent']
const before = Object.fromEntries(files.map(id => [id, digest(`js/xianxia/${id}.js`)]))
const baselineSourceMatches = Object.fromEntries(files.map(id => [id, before[id] === report.sourceHashes[id]]))
assert.equal(digest('scripts/verify-tower-growth-balance.mjs'), report.scriptHash)
const kinds = Object.fromEntries(GROWTH_SKILLS.map(s => [s.id, s.kind]))
const round = n => Number(n.toFixed(3)), rows = []
for (const j of report.natural.filter(j => j.route === 'pursuit36')) {
  const attempt = j.attempts.find(a => a.floor === 3)
  const index = j.transactions.findIndex(t => t.action.type === 'startFloor' && t.action.seed === attempt.seed)
  const start = j.transactions[index], tail = j.transactions.slice(index + 1)
  const learns = tail.slice(0, tail.findIndex(t => t.action.type === 'finishFloor'))
    .filter(t => t.action.type === 'learnSkill')
  const loadout = state => ({...attempt.loadout,
    active: Object.fromEntries(Object.entries(state.skills).filter(([id]) => kinds[id] === 'active')),
    passive: Object.fromEntries(Object.entries(state.skills).filter(([id]) => kinds[id] === 'passive'))})
  let snapshot
  const original = play(new TowerRun({attemptId: 1, floor: 3, seed: attempt.seed,
    hp: attempt.start.hp, xp: attempt.start.xp, loadout: loadout(attempt.start)}), {
    onWave: (w, r) => { if (w.wave === 19) snapshot = r.snapshot() },
    onCheckpoint: r => {
      for (const t of learns.filter(t => t.atMs - start.atMs === Math.round(r.state.time * 1000)))
        r.setGrowthLoadout(loadout(t.after))
      return r
    },
  })
  assert.deepEqual(original.metrics.waves, attempt.metrics.waves)
  assert.equal(round(original.run.state.time), attempt.seconds)
  assert.equal(original.run.state.phase, attempt.outcome)
  for (const policy of ['original', 'exit-web']) {
    const r = TowerRun.restore(snapshot), seen = new Set(), hits = []
    let minHP = r.state.player.hp
    while (r.state.phase === 'playing' && r.state.time < snapshot.time + 300) {
      const s = r.state, p = s.player
      r.setViewport({xmin: p.x - 352, xmax: p.x + 352, ymin: p.y - 506, ymax: p.y + 511})
      steer(r, true)
      if (policy === 'exit-web') {
        const zone = s.zones.filter(z => z.hostile && (z.kind === 'web'
          || z.renderOnly && s.enemies.some(e => e.id === z.ownerId && e.ai.attack?.kind === 'web')))
          .filter(z => Math.hypot(p.x - z.x, p.y - z.y) < z.radius + 18 + 40)
          .sort((a, b) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(p.x - b.x, p.y - b.y))[0]
        if (zone) {
          const dx = p.x - zone.x, dy = p.y - zone.y
          if (Math.hypot(dx, dy) > 1e-9) r.setInput(dx, dy)
        }
      }
      r.advance(1 / 60)
      minHP = Math.min(minHP, s.player.hp)
      for (const fx of s.effects) {
        if (fx.kind !== 'player_hit' || seen.has(fx.id)) continue
        seen.add(fx.id)
        hits.push({time: round(s.time), damage: fx.damage,
          web: s.zones.some(z => z.kind === 'web' && Math.hypot(p.x - z.x, p.y - z.y) <= z.radius + 18)})
      }
    }
    if (policy === 'original') {
      assert.equal(round(r.state.time), attempt.seconds)
      assert.equal(r.state.phase, attempt.outcome)
    }
    rows.push({seed: j.seed, policy, startHP: round(snapshot.player.hp), xp: snapshot.player.xp,
      outcome: r.state.phase, seconds: round(r.state.time - snapshot.time),
      endHP: round(r.state.player.hp), minHP: round(minHP),
      bossRemaining: round(r.state.enemies.find(e => e.role === 'boss')?.hp ?? 0),
      cleared: r.state.clearedWaves.length, hits})
  }
}
for (const id of files) assert.equal(digest(`js/xianxia/${id}.js`), before[id])
assert.equal(digest('scripts/verify-tower-growth-balance.mjs'), report.scriptHash)
console.log(JSON.stringify({scope: 'same live wave-20 snapshot, movement-only diagnostic, no storage writes',
  baselineSourceMatches, sourceHashes: before, rows}, null, 2))
```
<!-- growth-floor3-audit:end -->
