# B 修仙留出集：balance-50…99

在主矩阵及其重复完成后，以完全相同运行时与 bot 跑600局留出验证；没有依据主矩阵调参。此组未重复，不混入 A/B 主样本、配对差异或其确定性检验。

| 分组 | 胜率/95%Wilson | 超时 | >720秒 | 胜利时长中位/P90/最大秒 | Boss时长中位秒 |
|---|---|---|---|---|---|
| 全部 | 476/600 = 79.3%（95% Wilson 75.9–82.4%） | 0/600 = 0.0%（95% Wilson 0.0–0.6%） | 4/600 = 0.7%（95% Wilson 0.3–1.7%） | 483.48/612.03/733.40 | 58.94 |
| flee | 195/300 = 65.0%（95% Wilson 59.4–70.2%） | 0/300 = 0.0%（95% Wilson 0.0–1.3%） | 4/300 = 1.3%（95% Wilson 0.5–3.4%） | 506.27/680.88/733.40 | 81.75 |
| spore | 281/300 = 93.7%（95% Wilson 90.3–95.9%） | 0/300 = 0.0%（95% Wilson 0.0–1.3%） | 0/300 = 0.0%（95% Wilson 0.0–1.3%） | 478.03/575.08/677.87 | 53.50 |

胜利构筑数：141。池丢弃：{'enemies': 0, 'shots': 0, 'bubbles': 0, 'zones': 0, 'pickups': 0}；droppedTime最大：0。进化约束违规：0。

留出结果用于检验主样本观察是否稳定，不会自动把未通过的阈值改为通过，也不证明具体系统的因果贡献。逐策略与完整计数见 holdout-analysis.json；原始逐局含完整选卡、随机子流检查点及低频事件见 B-xianxia-holdout.json。

冻结运行时 SHA256：`b33bed9365e3571177634afd427daf9589a66d427a0ab8a9fa034420bafcf862`。前后哈希与命令见 holdout-provenance.json；详细观察器直接复制自主矩阵冻结版 balance，决策仍由同一 playRun 驱动。

## 主要门槛

| 门槛 | 结果 |
|---|---|
| fleeWin30To60Percent | 未通过 |
| sporeWinAtMost80PercentAndNotZero | 未通过 |
| victoryMedian360To540Sec | 通过 |
| bossMedian40To60Sec | 通过 |
| fleeBossMedianAtMost90Sec | 通过 |
| noPast720 | 未通过 |
| noTimeouts | 通过 |
| noEnemyShotBubbleDrops | 通过 |
| noDroppedTime | 通过 |

Node driver 前/后 SHA256：`c237d99acbca60d88800fb59e272f2031246a35704221f3558c90dee028a8623` / `c237d99acbca60d88800fb59e272f2031246a35704221f3558c90dee028a8623`；一致=True。

## 运行口径与溯源

50种子 × 2走位（flee/spore）× 6选卡策略；单局上限1020秒，720×1560，固定1/60秒步长，zero meta，无复活。六策略沿用主矩阵，无新增万剑偏好。

```sh
node reports/full-balance-2026-10-26/run-holdout.mjs
```

Node：v22.22.2；开始 2026-10-26T10:28:12.909328+00:00，结束 2026-10-26T10:30:49.639421+00:00；墙钟耗时 156.73 秒。

Python driver 前/后 SHA256：`a9b17ff733582050196a4abcc19bdaedcd0c009d5692798655c21d67a95be045` / `a9b17ff733582050196a4abcc19bdaedcd0c009d5692798655c21d67a95be045`；一致=True。

运行时及 bot/balance 依赖清单前后相同=True；清单 SHA256 `8f91fc0d9d9ec1c7c5bbd183548b9d588338769587b27240f1eff5b7e018833f`。逐文件前后哈希、原始结果哈希保存在 holdout-provenance.json。

检查通过600局完整笛卡尔积、与主矩阵种子无重叠、固定配置、选卡与丹药计数对齐；见 holdout-integrity-checks.json。超长/超时/池丢弃异常逐局见 holdout-diagnostic-runs.json。

Wilson区间为描述性边际区间，同一种子的不同配置不完全独立。时长仅统计实际胜利局；Boss时长仅统计实际击败Boss的对局。遥测缺口沿用主报告，不据此归因有效伤害、治疗或溢出。丹药按严格整数步 takeTick < tick < endTick 且 tick <= terminalTick 重建，和补充组逐步覆盖率分列。
