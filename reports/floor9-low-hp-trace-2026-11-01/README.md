# 第9层低血量原因定位

报告：`../../design/balance/balance-check-floor9-low-hp-cause-2026-11-01.md`。

4场完整原样重放：剑阵211/601、混搭601、剑气601。前三场20次Boss阶段受击均精确分类；20个短窗口保持原策略首方向均无伤，正式策略则反复转向并受击。

`array.json`、`mixed.json`、`qi.json`保存来源、轨迹及蓄力快照。`local-probes.json`保存20个局部重放及24方向试验结果；`summary.json`是核对摘要。

正式机器人和游戏数值没有修改。审计副本只增加`diagnosticIncoming`效果字段；完整重放逐击结果与原30场回归中的相应场次一致。

复现：从仓库根目录运行`python3 reports/floor9-low-hp-trace-2026-11-01/batch.py`，再运行`node reports/floor9-low-hp-trace-2026-11-01/probe.mjs`。这些命令覆盖当前对应证据，先另存再重跑。
