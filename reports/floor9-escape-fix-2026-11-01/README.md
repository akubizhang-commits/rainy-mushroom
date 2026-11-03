# 横扫和冲锋稳定走位回归

报告：`../../design/balance/balance-check-escape-stability-fix-2026-11-01.md`。

正式修改在`../../scripts/verify-monster-mechanics-balance.mjs`；游戏数值未改。

20/20原始局部窗口无伤、机器人测试14/14通过、固定第9层30/30通关且Boss受击0次。第8层另5场全通，11次震波预警无实际命中、7次实际安全门爆发全部进门。

`summary.json`为30场统计，`additional-verification.json`为额外机制核对，`window-results.json`为原受击窗口结果。

从仓库根目录运行`python3 reports/floor9-escape-fix-2026-11-01/batch.py`可重跑30场；`node reports/floor9-escape-fix-2026-11-01/mechanics.mjs`重跑5场补测。这些命令会覆盖本轮对应JSON，请先另存旧证据。
