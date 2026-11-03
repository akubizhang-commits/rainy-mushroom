# 剑阵定位复核与四象调整 — 2026-11-01

本轮只修改四象的两阶伤害预算 `[1.25,1.4375] → [2.0,2.3]`。其他运行时文件、普通技能、进化、形态、CD、解锁和成本不变。详细结论见 `../../design/balance/balance-check-array-role-2026-11-01.md`。

## 方法

- `run.mjs`：当前源码全层模拟。实际 TowerRun、60Hz、横屏视野、现有走位机器人；无玩家无敌、无敌人削弱。观察器只读取真实伤害与阵法命中；不替换伤害结算。
- 27级入层、Boss时29级；74/74点；24级对照71/71点、Boss时26级。完整构筑经过 Campaign 存档校验。技能在入层后固定，不中途补点。
- 适配武器同灵器中品、基础攻击、平攻8、技能词缀2.6%/3.4%；剑气用照渊，阵法用太衡。防具与戒指相同。戒指暴击仍是系统固有差异，非人为给阵法增加收益。
- `normalWavesMedian` 为1–19波中非5倍数普通怪波次的总时间（含走位与生成间隙）；精英波和Boss波不混入。Boss计时从视野内、460距离可接敌开始到死亡。
- `arrayBossHitFraction`：Boss活着时阵法实际跳数中命中Boss的比例。不是“每次施法吃满概率”，不补记Boss死后的剩余跳。临近死亡的过量伤害按实际掉血截断。
- 模拟器按同一策略为有环绕技能的构筑优先近身；因此结果代表各自适配走位，不是完全相同的坐标轨迹，更不是人类操作结论。
- 合法配点不等于证明为全局最优；合成装备与资源不等于重新跑过一次自然成长。

## 文件

- `before-js/`：本轮修改前源码；`after-js/`：最终源码；`bot.mjs`：当前走位策略快照。
- `controlled-before.json`：六套构筑×3种子，包括旧配点与集中配点。
- `parents-before.json`：无进化、核心成本一致的剑气/剑阵对照，各3种子。
- `entry-before.json`：24级剑气与心法阵法各5种子。
- `entry-direct-before.json`：24级阵法改配御剑补刀，3种子。
- `candidate-60pct.json`：独立候选源码下两套四象构筑各3种子。`candidate/`保留对应源码，`candidate-run.mjs`可复跑。
- `after-qi.json`、`after-array.json`、`after-sixiang.json`：正式当前源码三套构筑各10种子。
- `before-sixiang-extra.json`：旧源码四象集中配点额外7种子，与原3种子构成最终10对10。
- `baseline-run.mjs`使用`baseline/js`指向旧源码，`baseline/scripts`保存机器人，便于继续复核旧值。
- `summary.json`与`summarize.mjs`：汇总及不涉及四象的逐样本一致性检查。
- `tuning-red.log`：调整期望后、改源码前，四项真实碰撞伤害测试按预期失败。
- `targeted-tests.log`：103项定向测试通过。
- `tests.log`/`tests-before.log`/`test-comparison.json`：扩展检查仍有20项旧失败，修改前后失败名称完全一致；不是全套绿灯。
- `scope-verification.json`/`verify-scope.mjs`：普通技能完全相同，只有四象预算变更，27级前无法解锁；本轮没有重跑完整自然成长。
- `before.json`是早期探索数据，仅六场且未完成；不用于最终等预算结论。构造额外配点时被断言拦下，未生成超预算模拟结果。

复跑示例：

```sh
node reports/array-role-balance-2026-11-01/run.mjs new-label 101,211,307 sixiang-focus
node reports/array-role-balance-2026-11-01/baseline-run.mjs old-label 101,211,307 sixiang-focus
node reports/array-role-balance-2026-11-01/summarize.mjs
node reports/array-role-balance-2026-11-01/verify-scope.mjs
```

各结果保存源码哈希并验证运行前后未变化。已有相同标签的样本会跳过；复跑请换标签，避免误把旧结果当成新结果。
