# 第8层剑阵seed211诊断

报告：`../../design/balance/balance-check-floor8-array-low-hp-2026-10-31.md`。

依赖相邻的 `late-boss-builds-2026-10-31` 与 `bot-circle-regression-2026-10-31` 冻结资料。

- `replay.mjs`、`replay-old.mjs`：新旧策略精确重放。命令末尾传入211。
- `TowerRun.instrumented.mjs`：仅增加最终伤害来源编号。
- `steering.mjs`：原策略加评分记录。
- `probes.mjs`：正式快照恢复后，只改变移动方向；`probes.json`包含所有分支。
- `gate-stop-prediction.mjs`：仅诊断的安全门停止预测，不是正式修复。
- `counterfactual.mjs`：三个种子整层对照。
- `verify.py`：核验新旧重放、实际进门分支、对照前19波不变、插桩差异与工作区漂移。

运行示例：`node reports/floor8-array-low-hp-2026-10-31/replay.mjs 211`。其余脚本分别运行，最后执行`python3 reports/floor8-array-low-hp-2026-10-31/verify.py`。这些诊断脚本会覆盖各自同名输出，保留历史时应另建目录。
