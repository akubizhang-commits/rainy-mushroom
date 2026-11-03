# 剑修成型与死因诊断

2026-10-27，alpha数值诊断。完成伤害归因、成长条件观测与策略对照；**平衡仍未通过，D[5]候选不合入**。游戏新增诊断字段，但战斗数值、随机流、选卡规则和存档不变。

## 本次实现

`js/xianxia/SwordCombat.js`在既有swordDamage事件内增加扣血前HP、effectiveAmount、overkillAmount、targetKind、targetBoss、evolved。有效伤害截断至目标剩余HP，过量单列；事件保存标量，不保留可被回池复用的目标引用。原amount与扣血逻辑不变。

`js/survivor/SurvivorRun.js`在修仙playerHurt事件增加sourceKind、attackerKind、HP前后、实际amount、effectiveAmount和tick。普通接触同时记录来源UID；敌弹发射者取自stepMistBubbles返回的source字符串，正确区分普通远程怪与Boss。经典模式事件保持原形状。

新增`scripts/survivor/sword-diagnostics.mjs`，保留旧版sword-balance及bot不变。四个策略包：original、move-only、pick-only、both。走位改动检查当前短路线与弹体后拾取近处经验，并不是已经验证安全的路径规划；生存选卡改变急救、防御/拾取心法优先级，不等同单项防御实验。

成长快照记录未学主功法/未满级/心法不足/等级不足/时间不足/进化上限等非互斥条件、经验、周围经验、队列和最近进化展示。eligibilitySampleCount是每秒采样计数，不是精确秒数；exposureTicks是功法在playing步骤的精确战斗tick。DOT和击杀爆发仍归各自心法，不能追溯父攻击；御剑普通飞剑与剑雨仍共用技能ID。

## 实验与结果

- 初始80局：4策略包×4功法偏好×5共同种子。
- 隔离候选80局：仅D[5]由1.45改为1.30，其余代码/策略相同。
- 补齐发射者和精确暴露tick后的最终80局复跑。
- 总计240次执行，复用5种子，**不是240个独立样本**，没有新种子留出集。

| 策略 | 胜/总局数 | 活到360秒 | 到达Boss | 至少一次进化 | 平均结束等级 |
|---|---:|---:|---:|---:|---:|
| original | 0/20 | 10/20 | 3/20 | 8/20 | 19.80 |
| move-only | 0/20 | 10/20 | 0/20 | 6/20 | 18.90 |
| pick-only | 0/20 | 9/20 | 5/20 | 4/20 | 17.85 |
| both | 0/20 | 9/20 | 5/20 | 5/20 | 18.15 |

原策略最后一击来源：蜗牛接触8局、远程弹体8局、精英冲撞3局、飞蛾1局。普通远程泡弹在该组累计有效承伤占比约38.7%；比例分母为所有有效承伤，不能当作死亡比例。各组名义伤害约11.9%–12.4%为过量伤害，旧版名义总量不能直接表示有效输出。

原策略平均结束362.53秒；候选363.28秒。其他策略平均增量也低于1秒；所有组到达360秒/Boss/进化局数均未改变，仍0胜。因此停止继续围绕D[5]做同类小幅减伤；该实验只说明这一具体单参数改动不足以改善当前样本，不证明所有敌方伤害调整都无效。

## 保真验证与复查

原策略20局逐项精确匹配上一轮baseline同种子spore记录：时长、等级、结局、完整选择/候选、进化、诊断池计数、模拟步数。最终80局与初版80局的上述玩法字段一致。伤害名义值=有效+过量（浮点容差），致死记录HP≤0，已选卡在候选内，等级/进化上限一致。

独立审计报告在`reports/sword-diagnostics-2026-10-27/independent-review.md`；审计提出的发射者丢失、暴露采样命名问题已修正并复跑。它同时指出：全程改变走位不能验证仅Boss阶段拾取，生存选卡包含多项调整，资格满足也不代表已获得下一次升级。这些局限保留，不把策略失败泛化为系统无效。

全量832项测试、源码check、34模块web-mobile构建通过。构建浏览器验证：3HP目标受到100点名义伤害，记录effective=3/overkill=97；玩家100→88，记录接触来源beetle/实际12点。0脚本错误，随后重载恢复正常营地。纯逻辑测试另覆盖敌弹回收后发射者保留。没有真机性能结论。

## 复现与证据

```sh
node scripts/survivor/sword-diagnostics.mjs --seeds 5 --start 0 --out /绝对路径/新目录
node --test tests/xianxia-diagnostics.test.mjs
python3 scripts/survivor/sword-diagnostics-report.py
```

旧数据不覆盖。最终主数据在`final/`，初版在报告目录根，候选在`d5-candidate/`。每批source.json给出源文件SHA256。候选可复制js、scripts/survivor、package.json到隔离目录，仅替换Realms.js的D数组中第5索引，再执行同参数。生成器比较初版与候选，仅Realms.js指纹不同，验证最终复跑保真，并输出summary.json及sword-diagnostics-review.html。

## 下一最小任务

将“进化成型的选择成本”单独作为实验：固定走位和其他数据，比较贯穿/阵地的主功法升级、配套三级心法与生存牌如何竞争选择次数，报告首次齐备、下一次升级及进化后的战斗暴露。若要验证Boss拾取，必须保持Boss前输入完全相同，只在Boss阶段切换，不再使用全程走位包作为替代。继续按证据选择单项候选，不直接加四进化伤害。
