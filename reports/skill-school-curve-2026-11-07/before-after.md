# 流派曲线改动前后对照（2026-11-07）

## 结论

- 第 4 层纯剑阵（formation）改动前 2/4 胜，改动后 1/4 胜。仍然失败，本次未调任何数值。
  - 改动前：move 101 胜 935s，move 211 胜 946s，half 101 负 100s，half 211 负 219s。
  - 改动后：move 101 胜 999s，move 211 负 779s，half 101 负 93s，half 211 负 212s。
- 改动后 move 211 由胜转负，这是第 4 层纯剑阵上唯一的结果变化。其余第 4 层格（qi、yujian）与改动前一致。
- 本轮结果与 2026-11-06 报告不可直接比较，原因见“口径与限制”。

## 运行方式

- 工具：`scripts/verify-skill-school-curve.mjs`（仓库内唯一的流派曲线脚本，默认输出目录即 `reports/skill-school-curve-2026-11-06/`）。
- 参数：`--school=qi|formation|yujian --floors=2,3,4,5,6,7,8,9 --seeds=101,211 --modes=move,half`，与 2026-11-06 的楼层、种子、模式一致。
- 层数：8 层（楼层 2–9），3 个流派，每格 4 场（move/half × 种子 101/211）。
- 改动前：提交 `3b64a74e`（周天剑阵迁移与青莲剑阵的第一个功能提交 `5a6c20d4` 之前的基线），导出到临时目录运行。输出在 `before/`。
- 改动后：当前分支 HEAD `c09a164a`。输出在本目录根部。
- 日志：`logs/`。
- 未修改任何数值，未修改脚本。

## 周天剑阵与青莲剑阵在本次改动中的取值

| 技能 | 改动前 | 改动后 |
|---|---|---|
| 周天剑阵 sj_wanjian | 炼气巅峰解锁，7 级（`lianqi-peak`） | 炼气中期解锁，4 级（`lianqi-middle`） |
| 周天剑阵 冷却 / 持续 / 命中间隔 | 未改动 | 6 秒 / 4 秒 / 0.6 秒 |
| 周天剑阵 剑数 / 目标上限 | 未改动 | 剑数 [4,4,5,5,5,6,6,6,6,8]，目标上限 6 |
| 青莲剑阵 sj_qinglian | 不存在 | 炼气巅峰解锁，7 级 |
| 青莲剑阵 冷却 / 起阵 / 持续 | 不存在 | 9 秒 / 0.8 秒 / 1 秒 |
| 青莲剑阵 判定 | 不存在 | 每 0.5 秒一次，共 2 次脉冲；目标上限 6 |
| 青莲剑阵 三层环 | 不存在 | 内 4 剑 / 中 6 剑 / 外 8 剑；半径 90 / 150 / 200 像素；伤害份额 20% / 35% / 45% |

注意：三个流派的购买列表（脚本 `SCHOOLS`）都不包含 sj_qinglian。因此青莲剑阵的数值不进入本次任何一格的结果。本次只有周天剑阵的解锁层级变化会影响结果。

解锁层级依据：`js/xianxia/TowerGrowth.js` 中 `GROWTH_STAGES` 按阶段计算，炼气中期最低 4 级，炼气巅峰最低 7 级。

## 层 × 流派 逐格对照

每格 4 场，顺序为 move 101、move 211、half 101、half 211。“won”为通关，“lost”为死亡。本次所有场次都没有超时。数字为秒。

| 层 | 流派 | 改动前 won/4 | 改动前 明细 | 改动后 won/4 | 改动后 明细 |
|---|---|---|---|---|---|
| 2 | qi | 2/4 | won 553s; won 542s; lost 288s; lost 284s | 2/4 | won 553s; won 542s; lost 288s; lost 284s |
| 2 | formation | 2/4 | won 744s; won 744s; lost 176s; lost 171s | 2/4 | won 707s; won 697s; lost 303s; lost 324s |
| 2 | yujian | 2/4 | won 742s; won 742s; lost 275s; lost 275s | 2/4 | won 742s; won 742s; lost 275s; lost 275s |
| 3 | qi | 3/4 | won 473s; won 488s; lost 338s; won 514s | 3/4 | won 473s; won 488s; lost 338s; won 514s |
| 3 | formation | 2/4 | won 580s; won 577s; lost 609s; lost 210s | 2/4 | won 560s; won 560s; lost 588s; lost 501s |
| 3 | yujian | 3/4 | won 463s; won 478s; won 475s; lost 417s | 3/4 | won 463s; won 478s; won 475s; lost 417s |
| 4 | qi | 2/4 | won 755s; won 738s; lost 359s; lost 345s | 2/4 | won 755s; won 738s; lost 359s; lost 345s |
| **4** | **formation** | **2/4** | **won 935s; won 946s; lost 100s; lost 219s** | **1/4** | **won 999s; lost 779s; lost 93s; lost 212s** |
| 4 | yujian | 2/4 | won 839s; won 836s; lost 324s; lost 327s | 2/4 | won 839s; won 836s; lost 324s; lost 327s |
| 5 | qi | 2/4 | won 645s; won 642s; lost 243s; lost 244s | 2/4 | won 645s; won 642s; lost 243s; lost 244s |
| 5 | formation | 2/4 | won 610s; won 599s; lost 213s; lost 209s | 2/4 | won 570s; won 570s; lost 192s; lost 220s |
| 5 | yujian | 2/4 | won 529s; won 533s; lost 509s; lost 199s | 2/4 | won 529s; won 533s; lost 509s; lost 199s |
| 6 | qi | 2/4 | won 621s; won 616s; lost 443s; lost 564s | 2/4 | won 621s; won 616s; lost 443s; lost 564s |
| 6 | formation | 2/4 | won 579s; won 577s; lost 471s; lost 464s | 2/4 | won 579s; won 577s; lost 471s; lost 464s |
| 6 | yujian | 2/4 | won 541s; won 542s; lost 473s; lost 379s | 2/4 | won 541s; won 542s; lost 473s; lost 379s |
| 7 | qi | 2/4 | won 541s; won 540s; lost 468s; lost 482s | 2/4 | won 541s; won 540s; lost 468s; lost 482s |
| 7 | formation | 2/4 | won 529s; won 534s; lost 423s; lost 447s | 2/4 | won 529s; won 534s; lost 423s; lost 447s |
| 7 | yujian | 2/4 | won 541s; won 552s; lost 444s; lost 338s | 2/4 | won 541s; won 552s; lost 444s; lost 338s |
| 8 | qi | 2/4 | won 581s; won 567s; lost 539s; lost 557s | 2/4 | won 581s; won 567s; lost 539s; lost 557s |
| 8 | formation | 3/4 | won 454s; won 458s; lost 452s; won 445s | 3/4 | won 454s; won 458s; lost 452s; won 445s |
| 8 | yujian | 2/4 | won 581s; won 581s; lost 488s; lost 491s | 2/4 | won 581s; won 581s; lost 488s; lost 491s |
| 9 | qi | 2/4 | won 540s; won 547s; lost 456s; lost 552s | 2/4 | won 540s; won 547s; lost 456s; lost 552s |
| 9 | formation | 2/4 | won 463s; won 471s; lost 401s; lost 374s | 2/4 | won 463s; won 471s; lost 401s; lost 374s |
| 9 | yujian | 2/4 | won 626s; won 622s; lost 438s; lost 387s | 2/4 | won 626s; won 622s; lost 438s; lost 387s |

改动前后有差异的格只有 2、3、4、5 层的 formation 行。其余格的数值完全一致。

## 口径与限制

1. 本轮工具与 2026-11-06 的数值不一致。把改动前代码（`3b64a74e`）用同一脚本、同一参数运行，32 场中没有一场与 `reports/skill-school-curve-2026-11-06/` 的记录相同（例如 qi 第 2 层 move 101：旧记录通关 718s，本次通关 553s）。
   - 原因未查明。README 已注明 2026-11-06 的生成脚本不在仓库中，因此无法确认旧数据是否由本脚本产生。
   - 因此本表的“改动前”是同一脚本在 `3b64a74e` 上的结果，不是 2026-11-06 的记录。
   - 2026-11-06 中第 4 层纯剑阵的记录为：move 1074s / 1089s 通关，half 215s / 99s 失败。与本次改动前的 move 935s / 946s 通关、half 100s / 219s 失败在走势上一致（move 通关、half 失败），时间不同。
2. 本轮不能与 `balance/comparison-vs-2026-11-06-2026-11-07.md` 做同口径结论，该文件已经注明了这一点。
3. 样本只有 2 个种子。第 4 层纯剑阵的 move 211 从通关变为失败，只有一个种子的结果，不能视为统计上确定的变化。
4. “失败”的判定：本表按 4 场中通关数计数，不做任何加权。

## 第 4 层纯剑阵的状态

仍然失败。改动后 4 场中 1 场通关（move 101，999s），3 场失败（move 211 在 779s 失败，half 101 在 93s 失败，half 211 在 212s 失败）。本次未调任何数值，等待用户决定。
