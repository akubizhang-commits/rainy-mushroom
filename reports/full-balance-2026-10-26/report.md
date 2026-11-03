# 2026-10-26 完整平衡主矩阵：经典 A / 修仙 B

已完成 A600 + B600，并各完整重复一次，共执行 2400 局。重复不是新增独立样本。未调整任何运行时数值；本报告为主矩阵结果，不等同于通过完整验收。

另外完成 B 修仙 balance-50…99 的600局一次留出验证，总执行量3000局。留出结果单列于 [holdout-report.md](holdout-report.md)，未调参、未重复，不混入本报告主样本或配对分析。

修仙B本轮未通过的量化门槛：fleeWin30To60Percent、sporeWinAtMost80PercentAndNotZero、noPast720、noEnemyShotBubbleDrops。完整数字与定义如下，不能用总胜率改善替代逐项验收。

## 口径与可复现性

种子 balance-0…49；flee/spore；random 与五种旧功法偏好；每版 600 局。每局 1020 秒上限、720×1560 视口、1/60 固定步、firstRun=true、零局外、无复活、正常 Boss→凝婴/净化→撤离胜利流程。采用现有优先御剑的偏好策略；万剑可被抽到，但未增加万剑偏好。

Node：`v22.22.2`；工作区基准提交：`4494fbd2e64afefa45323ef1592be5a194856ec9`（有未提交改动，以 SHA256 与源码快照为准）。

运行时清单 SHA256：`b33bed9365e3571177634afd427daf9589a66d427a0ab8a9fa034420bafcf862`

全部运行依赖清单 SHA256：`8f91fc0d9d9ec1c7c5bbd183548b9d588338769587b27240f1eff5b7e018833f`

前后逐文件哈希、每轮命令和起止时间见 `provenance.json`；冻结源码见 `source-snapshot.tar.gz`；原始 JSON/TXT 与进度文件均保留。所有四轮运行前后源码完全一致。

A 重复比较：一致，600 局；归一化 SHA256 `7ecf3eaadf1cc4bdb794dd5318c729651173cd1640c4180fcc3634e956b88bc2`。仅忽略 JSON 输出路径；文本耗时不参与比较。完整选卡、每次选卡后 RNG 状态、每秒 RNG 摘要、终态和低频事件均参与比较，不声称逐帧世界状态验证。

B 重复比较：一致，600 局；归一化 SHA256 `5a975839bc0ee03a8cf5a846490ddd79617d28de119233b75952957a07689441`。仅忽略 JSON 输出路径；文本耗时不参与比较。完整选卡、每次选卡后 RNG 状态、每秒 RNG 摘要、终态和低频事件均参与比较，不声称逐帧世界状态验证。

可选 `--detailed` 只做观测，经典/修仙各用完整单局验证开关前后游戏记录相同；选项回归见 `option-tests.txt`。

## 胜率与胜负翻转

| 版本/走位 | 胜率（超时记非胜利） | 阵亡 | 超时 |
|---|---|---|---|
| A 全部 | 393/600 = 65.5%（95% Wilson 61.6–69.2%） | 207/600 = 34.5%（95% Wilson 30.8–38.4%） | 0/600 = 0.0%（95% Wilson 0.0–0.6%） |
| A flee | 133/300 = 44.3%（95% Wilson 38.8–50.0%） | 167/300 = 55.7%（95% Wilson 50.0–61.2%） | 0/300 = 0.0%（95% Wilson 0.0–1.3%） |
| A spore | 260/300 = 86.7%（95% Wilson 82.4–90.1%） | 40/300 = 13.3%（95% Wilson 9.9–17.6%） | 0/300 = 0.0%（95% Wilson 0.0–1.3%） |
| B 全部 | 484/600 = 80.7%（95% Wilson 77.3–83.6%） | 116/600 = 19.3%（95% Wilson 16.4–22.7%） | 0/600 = 0.0%（95% Wilson 0.0–0.6%） |
| B flee | 202/300 = 67.3%（95% Wilson 61.8–72.4%） | 98/300 = 32.7%（95% Wilson 27.6–38.2%） | 0/300 = 0.0%（95% Wilson 0.0–1.3%） |
| B spore | 282/300 = 94.0%（95% Wilson 90.7–96.2%） | 18/300 = 6.0%（95% Wilson 3.8–9.3%） | 0/300 = 0.0%（95% Wilson 0.0–1.3%） |

全部 配对胜率差 B−A：+15.17 个百分点；按 50 种子整组重采样 10000 次的95%区间 [+11.17, +19.17]。
bothWon 369/600 = 61.5%（95% Wilson 57.5–65.3%）；AOnlyWon 24/600 = 4.0%（95% Wilson 2.7–5.9%）；BOnlyWon 115/600 = 19.2%（95% Wilson 16.2–22.5%）；neitherWon 92/600 = 15.3%（95% Wilson 12.7–18.4%）。

flee 配对胜率差 B−A：+23.00 个百分点；按 50 种子整组重采样 10000 次的95%区间 [+16.33, +29.67]。
bothWon 112/300 = 37.3%（95% Wilson 32.1–42.9%）；AOnlyWon 21/300 = 7.0%（95% Wilson 4.6–10.5%）；BOnlyWon 90/300 = 30.0%（95% Wilson 25.1–35.4%）；neitherWon 77/300 = 25.7%（95% Wilson 21.1–30.9%）。

spore 配对胜率差 B−A：+7.33 个百分点；按 50 种子整组重采样 10000 次的95%区间 [+3.67, +11.00]。
bothWon 257/300 = 85.7%（95% Wilson 81.2–89.2%）；AOnlyWon 3/300 = 1.0%（95% Wilson 0.3–2.9%）；BOnlyWon 25/300 = 8.3%（95% Wilson 5.7–12.0%）；neitherWon 15/300 = 5.0%（95% Wilson 3.1–8.1%）。

Wilson 区间为描述性边际区间，同一种子下配置存在相关性；差值区间采用种子聚类 bootstrap，固定随机种子 20261026。条件于双方都胜利的时长差有幸存者筛选，不代表所有局的因果效果。

## 时长、Boss 与拖局

| 版本/走位 | 胜利时长 n；中位/P90/最大秒 | ≤9分钟 / 胜利 | Boss战 n；中位/P90/最大秒 | 到达Boss | 未击败Boss | >720秒 |
|---|---|---|---|---|---|---|
| A 全部 | 393；498.68/573.46/666.88 | 320/393 = 81.4%（95% Wilson 77.3–85.0%） | 393；73.92/148.77/242.20 | 550/600 = 91.7%（95% Wilson 89.2–93.6%） | 207/600 = 34.5%（95% Wilson 30.8–38.4%） | 0/600 = 0.0%（95% Wilson 0.0–0.6%） |
| A flee | 133；518.60/579.88/666.88 | 97/133 = 72.9%（95% Wilson 64.8–79.8%） | 133；94.00/155.18/242.20 | 275/300 = 91.7%（95% Wilson 88.0–94.3%） | 167/300 = 55.7%（95% Wilson 50.0–61.2%） | 0/300 = 0.0%（95% Wilson 0.0–1.3%） |
| A spore | 260；492.36/559.95/664.97 | 223/260 = 85.8%（95% Wilson 81.0–89.5%） | 260；67.63/135.34/240.20 | 275/300 = 91.7%（95% Wilson 88.0–94.3%） | 40/300 = 13.3%（95% Wilson 9.9–17.6%） | 0/300 = 0.0%（95% Wilson 0.0–1.3%） |
| B 全部 | 484；479.10/583.01/750.75 | 396/484 = 81.8%（95% Wilson 78.1–85.0%） | 484；54.63/158.46/326.30 | 563/600 = 93.8%（95% Wilson 91.6–95.5%） | 116/600 = 19.3%（95% Wilson 16.4–22.7%） | 3/600 = 0.5%（95% Wilson 0.2–1.5%） |
| B flee | 202；489.09/621.44/750.75 | 150/202 = 74.3%（95% Wilson 67.8–79.8%） | 202；64.57/196.90/326.30 | 269/300 = 89.7%（95% Wilson 85.7–92.6%） | 98/300 = 32.7%（95% Wilson 27.6–38.2%） | 3/300 = 1.0%（95% Wilson 0.3–2.9%） |
| B spore | 282；474.69/554.04/661.43 | 246/282 = 87.2%（95% Wilson 82.8–90.6%） | 282；50.16/129.52/236.83 | 294/300 = 98.0%（95% Wilson 95.7–99.1%） | 18/300 = 6.0%（95% Wilson 3.8–9.3%） | 0/300 = 0.0%（95% Wilson 0.0–1.3%） |

双方均胜利时，B−A 胜利时长差：n=369，中位 -21.10 秒；双方均击败Boss时，Boss战差中位 -20.93 秒。

## 构筑、进化、容量

| 版本 | 胜利构筑数 | 旧四策略400局胜利构筑数 | 进化卡提供/选取 | 进化约束违规 | 敌人/玩家弹/敌弹/雷区/拾取物池丢弃 | 拾取物上限跳过 | droppedTime最大 |
|---|---|---|---|---|---|---|---|
| A | 40 | 31 | 170/146 | 0 | 0/0/19/0/0 | 59 | 0 |
| B | 143 | 119 | 365/340 | 0 | 0/0/1/0/0 | 48 | 0 |

A 首次进化秒数：{"n": 145, "mean": 456.0895402297989, "median": 448.3166666665876, "p90": 512.2466666665294, "min": 362.23333333333255, "max": 597.3999999997853}；7分钟时存活者进化数0/1/2/3+：{1: 29, 0: 521}，存活样本 550，此前结束 50。

B 首次进化秒数：{"n": 333, "mean": 414.2608108107627, "median": 386.9333333333101, "p90": 495.88999999987766, "min": 360.0500000000012, "max": 670.1833333330525}；7分钟时存活者进化数0/1/2/3+：{0: 338, 1: 222, 2: 3}，存活样本 563，此前结束 37。

原始 balance 展示缺陷：A 的 abandoned/wonAbandoned 将不在经典合法池的万剑列为放弃。原始文件保留，不据此下结论。analysis.json 的 abandonedByLegalPool/wonAbandonedByLegalPool 已按经典五武器、修仙六武器重新计算。

池丢弃是事件计数，不是胜率；设计内 capSkipped 与池满 dropped 分开。构筑以武器+心法ID集合计数，不把职业被动/丹药/等级/进化拆成新构筑。旧400局子集为 random、孢子弹、菌伞、露珠环偏好。

## 各策略结果

| 走位 / 策略 | A胜率 | B胜率 | B−A百分点（种子聚类95%区间） |
|---|---|---|---|
| flee / random | 9/50 = 18.0%（95% Wilson 9.8–30.8%） | 21/50 = 42.0%（95% Wilson 29.4–55.8%） | +24.00 [+8.00,+40.00] |
| flee / prefer:spore_shot | 33/50 = 66.0%（95% Wilson 52.2–77.6%） | 48/50 = 96.0%（95% Wilson 86.5–98.9%） | +30.00 [+18.00,+44.00] |
| flee / prefer:umbrella_blades | 22/50 = 44.0%（95% Wilson 31.2–57.7%） | 30/50 = 60.0%（95% Wilson 46.2–72.4%） | +16.00 [-2.00,+32.00] |
| flee / prefer:dew_ring | 22/50 = 44.0%（95% Wilson 31.2–57.7%） | 33/50 = 66.0%（95% Wilson 52.2–77.6%） | +22.00 [+6.00,+40.00] |
| flee / prefer:raindrop | 37/50 = 74.0%（95% Wilson 60.4–84.1%） | 43/50 = 86.0%（95% Wilson 73.8–93.0%） | +12.00 [-2.00,+26.00] |
| flee / prefer:leaf_boomerang | 10/50 = 20.0%（95% Wilson 11.2–33.0%） | 27/50 = 54.0%（95% Wilson 40.4–67.0%） | +34.00 [+18.00,+50.00] |
| spore / random | 20/50 = 40.0%（95% Wilson 27.6–53.8%） | 32/50 = 64.0%（95% Wilson 50.1–75.9%） | +24.00 [+10.00,+40.00] |
| spore / prefer:spore_shot | 49/50 = 98.0%（95% Wilson 89.5–99.6%） | 50/50 = 100.0%（95% Wilson 92.9–100.0%） | +2.00 [+0.00,+6.00] |
| spore / prefer:umbrella_blades | 48/50 = 96.0%（95% Wilson 86.5–98.9%） | 50/50 = 100.0%（95% Wilson 92.9–100.0%） | +4.00 [+0.00,+10.00] |
| spore / prefer:dew_ring | 47/50 = 94.0%（95% Wilson 83.8–97.9%） | 50/50 = 100.0%（95% Wilson 92.9–100.0%） | +6.00 [+0.00,+14.00] |
| spore / prefer:raindrop | 50/50 = 100.0%（95% Wilson 92.9–100.0%） | 50/50 = 100.0%（95% Wilson 92.9–100.0%） | +0.00 [+0.00,+0.00] |
| spore / prefer:leaf_boomerang | 46/50 = 92.0%（95% Wilson 81.2–96.8%） | 50/50 = 100.0%（95% Wilson 92.9–100.0%） | +8.00 [+2.00,+16.00] |

## 成长与新增系统观察

### A

| 时刻秒 | 已结算等级 n / 均值 / 中位 | 账面等级 n / 均值 / 中位 |
|---|---|---|
| 60 | 600 / 4.93 / 5.00 | 600 / 4.93 / 5.00 |
| 180 | 600 / 10.30 / 11.00 | 600 / 10.30 / 11.00 |
| 300 | 598 / 15.84 / 17.00 | 598 / 15.84 / 17.00 |
| 420 | 550 / 21.83 / 25.00 | 550 / 21.83 / 25.00 |

首升中位 11.71 秒；新手6:30–7:30死亡 / 全部新手：133/300 = 44.3%（95% Wilson 38.8–50.0%）；/ 新手死亡：133/167 = 79.6%（95% Wilson 72.9–85.0%）。

条件分组 noEvolution：250/455 = 54.9%（95% Wilson 50.4–59.5%），存活中位 488.42 秒。仅描述终局构筑关联，不作因果解释。

条件分组 noRaindrop：54/135 = 40.0%（95% Wilson 32.1–48.4%），存活中位 471.25 秒。仅描述终局构筑关联，不作因果解释。

### B

| 时刻秒 | 已结算等级 n / 均值 / 中位 | 账面等级 n / 均值 / 中位 |
|---|---|---|
| 60 | 600 / 4.92 / 5.00 | 600 / 4.92 / 5.00 |
| 180 | 600 / 10.60 / 11.00 | 600 / 10.61 / 11.00 |
| 300 | 600 / 16.56 / 18.00 | 600 / 16.56 / 18.00 |
| 420 | 563 / 23.33 / 25.00 | 563 / 23.33 / 25.00 |

首升中位 11.68 秒；新手6:30–7:30死亡 / 全部新手：85/300 = 28.3%（95% Wilson 23.5–33.7%）；/ 新手死亡：85/98 = 86.7%（95% Wilson 78.6–92.1%）。

条件分组 noEvolution：151/267 = 56.6%（95% Wilson 50.6–62.4%），存活中位 488.87 秒。仅描述终局构筑关联，不作因果解释。

条件分组 noRaindrop：159/223 = 71.3%（95% Wilson 65.0–76.8%），存活中位 473.72 秒。仅描述终局构筑关联，不作因果解释。

| 新内容 | 被提供次数 | 被选择次数 | 提供局数 | 选择局数 |
|---|---|---|---|---|
| wanjian | 2548 | 1136 | 443/600 = 73.8%（95% Wilson 70.2–77.2%） | 287/600 = 47.8%（95% Wilson 43.9–51.8%） |
| yujian | 3245 | 1971 | 598/600 = 99.7%（95% Wilson 98.8–99.9%） | 577/600 = 96.2%（95% Wilson 94.3–97.4%） |
| vajra | 1992 | 203 | 555/600 = 92.5%（95% Wilson 90.1–94.3%） | 115/600 = 19.2%（95% Wilson 16.2–22.5%） |
| pill_power | 1186 | 70 | 526/600 = 87.7%（95% Wilson 84.8–90.1%） | 48/600 = 8.0%（95% Wilson 6.1–10.4%） |
| pill_wind | 1348 | 74 | 512/600 = 85.3%（95% Wilson 82.3–87.9%） | 51/600 = 8.5%（95% Wilson 6.5–11.0%） |
| pill_body | 1286 | 73 | 542/600 = 90.3%（95% Wilson 87.7–92.4%） | 54/600 = 9.0%（95% Wilson 7.0–11.6%） |

御剑满级时刻：{"n": 386, "mean": 310.58678756478986, "median": 312.44166666671117, "p90": 415.2583333332843, "min": 135.5666666666667, "max": 641.3166666664121}；万剑观测施放 10092 次、目标命中 219352 次，不能转换为伤害贡献。

pill_power：服用 70 次，其中刷新 4 次；覆盖局数 48/600 = 8.0%（95% Wilson 6.1–10.4%）；按严格整数区间重建的生效步数 119191/17525309（暴露占比 0.68%，不是二项胜率）。

pill_wind：服用 74 次，其中刷新 2 次；覆盖局数 51/600 = 8.5%（95% Wilson 6.5–11.0%）；按严格整数区间重建的生效步数 128781/17525309（暴露占比 0.73%，不是二项胜率）。

pill_body：服用 73 次，其中刷新 3 次；覆盖局数 54/600 = 9.0%（95% Wilson 7.0–11.6%）；按严格整数区间重建的生效步数 87190/17525309（暴露占比 0.50%，不是二项胜率）。

## 验收逐项对照

| 项目 | A | B |
|---|---|---|
| fleeWin30To60Percent | 通过 | 未通过 |
| sporeWinAtMost80PercentAndNotZero | 未通过 | 未通过 |
| victoryMedian360To540Sec | 通过 | 通过 |
| bossMedian40To60Sec | 未通过 | 通过 |
| fleeBossMedianAtMost90Sec | 未通过 | 通过 |
| noPast720 | 通过 | 未通过 |
| noTimeouts | 通过 | 通过 |
| winningBuildsAtLeast27 | 通过 | 通过 |
| evolutionConstraints | 通过 | 通过 |
| noEnemyShotBubbleDrops | 未通过 | 未通过 |
| noDroppedTime | 通过 | 通过 |
| repeatDeterministic | 通过 | 通过 |
| breakthroughPillBoundaryScenarios | not certified by matrix; use dedicated integration tests | not certified by matrix; use dedicated integration tests |
| heldOutSeeds50To99 | not applicable: requested holdout is B only | completed separately; see holdout-report.md; not repeated |

即使B优于A，也不能替代阈值验收。未通过项保持原始数据，不自动调参。独立重复用于确定性，不扩大样本量；留出集、消融及专项测试不在本轮主矩阵样本中；Kant 的300局补充已另行完成，不混合统计。

## 实际执行命令

```sh
node scripts/survivor/balance.mjs --ruleset survivor --seeds 50 --moves flee,spore --picks random,prefer:spore_shot,prefer:umbrella_blades,prefer:dew_ring,prefer:raindrop,prefer:leaf_boomerang --max-sec 1020 --detailed --json reports/full-balance-2026-10-26/A-classic-1.json
node scripts/survivor/balance.mjs --ruleset xianxia --seeds 50 --moves flee,spore --picks random,prefer:spore_shot,prefer:umbrella_blades,prefer:dew_ring,prefer:raindrop,prefer:leaf_boomerang --max-sec 1020 --detailed --json reports/full-balance-2026-10-26/B-xianxia-1.json
node scripts/survivor/balance.mjs --ruleset survivor --seeds 50 --moves flee,spore --picks random,prefer:spore_shot,prefer:umbrella_blades,prefer:dew_ring,prefer:raindrop,prefer:leaf_boomerang --max-sec 1020 --detailed --json reports/full-balance-2026-10-26/A-classic-2.json
node scripts/survivor/balance.mjs --ruleset xianxia --seeds 50 --moves flee,spore --picks random,prefer:spore_shot,prefer:umbrella_blades,prefer:dew_ring,prefer:raindrop,prefer:leaf_boomerang --max-sec 1020 --detailed --json reports/full-balance-2026-10-26/B-xianxia-2.json
```

运行顺序为 A1→B1→A2→B2；source-before.sha256/source-after.sha256 是可直接检查的源文件清单。

## 遥测缺口与后续诊断边界

- Raw balance total.abandoned/wonAbandoned and the matching text table use all six WEAPONS even for classic, incorrectly listing WanJian as abandoned in A. Raw files are preserved. These fields are not used for conclusions; analysis abandonedByLegalPool/wonAbandonedByLegalPool recompute with five classic vs six xianxia weapons.
- Event times/ticks are hook-consumption checkpoints. This matrix calls advance(1/60); these records do not certify event ordering inside arbitrary multi-step host frames.
- RNG seeds/states at each choice and at run end plus SHA256 of per-second RNG checkpoints are saved; individual random draws and complete per-frame world state are not saved. The private bot stream is reconstructed from its seed and one draw per random choice.
- WanJian casts/hits are observed event counts, not effective damage, overkill, per-target attribution or damage share. Low-frequency events suppressed in terminal phases may not describe all terminal-frame presentation.
- Pill exposure is reconstructed from integer simulated steps: takeTick < tick < endTick and tick <= terminalTick. Overlapping refresh ranges are unioned; a fresh 1800-tick duration contributes 1799 effect-bearing steps if allowed to expire. It includes ending phases, is not combat-only exposure, and is not mixed with supplemental step-by-step coverage. No avoided damage, effective healing, or per-pill causal benefit is available.
- Pool-drop totals lack timestamps and entity-level reasons, so exact saturation onset cannot be diagnosed from these records alone.
- No authoritative per-source effective/nominal healing, breakthrough healing totals, overheal or spirit/XP overflow telemetry. Legacy regen/drop/XP ratios are descriptive and must not be treated as verified causal/effective measures.
- Evolution eligibility is audited from all recorded chosen offers, pre-choice passive snapshots and reconstructed prior weapon levels. There is no dedicated invalid-input/boundary scenario certification in this batch.
- This main matrix does not include ablation matrices or WanJian-preference/active-pill/full-meta supplemental groups. Kant independently completed those 300 supplemental runs under docs/xianxia/reports/full-balance-2026-10-26/supplemental/report.md. No runtime values were tuned in this task; supplemental results are not pooled here.
- Build diversity uses only weapon/passive ID sets, ignoring levels, evolution, order, pills and the separate class passive. The legacy-400 subset is random plus spore_shot/umbrella_blades/dew_ring preferences.

独立边界测试由 Tesla 负责，另见仓库 docs/xianxia/reports/full-balance-2026-10-26/independent-qa.md；Kant 已完成300局补充，见 docs/xianxia/reports/full-balance-2026-10-26/supplemental/report.md，其结果不混入本主矩阵，也不混用覆盖率口径。主报告不把他们的测试表述为本脚本执行。

完整机器可读统计、各分组计数与Wilson区间、配对bootstrap、逐局差值见 `analysis.json`、`paired-runs.json`。原始四轮输出保持未改写；附属标准输出的“未完成对照”固定文案以本报告的实际执行记录为准。
