# 第9层复查证据

分析报告：`../../design/balance/balance-check-floor9-recheck-2026-11-01.md`。

- `run.mjs`：36场冻结源码对照模拟；重跑会覆盖 results.json。
- `snapshot/`：本次游戏源码与机器人。
- `results.json`：完成标记、源码哈希、12配置、36逐场样本和观察数据。
- `summarize.py` / `summary.json`：完整性、扣血守恒、用时、机制与源码漂移汇总。
- `parent-budget-audit.json`：去掉进化后实际有效配点，保守74点预算。
- `run.log`：逐场完成记录。

原配装来自 `../late-boss-builds-2026-10-31/`。这是完整第9层战斗实验，不是自然成长获取配装实验；下品组改变装备包及词条，母技能组不重新分配退回的进化点数。
