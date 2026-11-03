# 第9层固定自然配装回归

报告：`../../design/balance/balance-check-floor9-fixed-regression-2026-11-01.md`。

三条路线各10个新种子，30/30通关；另3场原样重放用于验证恢复及成长流程，独立统计。

`qi.json`、`array.json`、`mixed.json`保留全部33场。`summary.json`排除anchor场次，含P10/P90、时长范围、最低HP、机制开始统计。每个JSON记录源码哈希，`summarize.py`检查冻结源码未变化。

入口快照与`baseline-catalog.json`来自上一轮自然成长的三个中位样本；`run.mjs`只重新初始化战斗随机状态，保留资源、装备、HP、等级、成长策略。真实Campaign负责层内checkpoint、加点、终局结算与重载。

注意：`batch.py`及单路线`run.mjs`会覆盖本目录结果，重跑前先另存。未操作用户游戏存档，未调整游戏数值。
