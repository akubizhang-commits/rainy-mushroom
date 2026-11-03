# 敌弹回收回归：已完成

收到用户明确的修复就绪通知后，已完成四例及A/B各600局。结果见 [report.md](report.md) 和 [trajectory-report.md](trajectory-report.md)。下列为已执行命令；已有原始输出时runner会拒绝覆盖，不要在本目录重复启动。

```sh
python3 reports/bubble-recycle-2026-10-26/run-regression.py --repair-ready
python3 reports/bubble-recycle-2026-10-26/analyze-results.py
python3 reports/bubble-recycle-2026-10-26/trace-comparison.py
```

顺序：旧四例 → A经典600 → B修仙600。矩阵为 balance-0…49、flee/spore、原六选卡策略、1020秒、zero meta、无复活，不重复、不跑留出、不调参。本轮目的为回归与影响验证，不是新的全面验收。

旧四例已提取到 `old-cases.json`，附原始文件SHA256；敌弹丢弃依次为：

- A / balance-8 / flee / prefer:spore_shot：7。
- A / balance-27 / spore / random：9。
- A / balance-32 / spore / random：3。
- B / balance-40 / flee / prefer:dew_ring：1。

`run-regression.py` 在启动时保存新源码快照、依赖清单哈希、相对旧版本的变动文件、driver哈希、Node和命令；每批前后核对源码，结束时核对driver及旧数据未变。拒绝覆盖已有运行。矩阵调用既有冻结balance脚本；四例使用同一playRun及原有详细观察器。

`analyze.py` 保留为准备阶段版本；实际后处理使用 `analyze-results.py`，显式处理独立四例与balance输出的picks编码/config标签差异。输出 `report.md`、`analysis.json`、`case-comparison.json`、`paired-runs.json` 和文件校验清单。包含新旧胜率Wilson区间、时长、Boss时长、超长/超时、全部池丢弃、逐局变化；四例单独运行不计入600局分母。

`preparation-checks.txt` 保留为启动前静态检查记录，不能代替完成状态。完成后的运行溯源见 `provenance.json`，离线分析溯源见 `analysis-provenance.json`。没有修改生产代码、旧报告、bot或balance脚本。
