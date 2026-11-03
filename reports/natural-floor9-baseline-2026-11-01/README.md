# 第9层自然成长测试基线

分析及标准配装清单：`../../design/balance/balance-check-natural-floor9-baseline-2026-11-01.md`。

- `baseline-catalog.json`：三条路线各取三次自然成长中第9层Boss耗时中位样本；本轮恰好都是307。包含入层完整loadout、真实技能账本、预算与Boss出现时loadout。
- `*-{101,211,307}.json`：从新档开始的完整报告和成功交易，包括随机突破失败结果。
- `*.floor9-entry-*.json`：实际第9层入口Campaign及TowerRun快照，可追溯装备、资源和技能。勿人为补等级或补血后仍称为原始基线。
- `*.campaign.json`：对应自然成长最终存档。
- `summary.json`：九档等级、时间、失败、装备来源和三路线统计。
- `snapshot/`：本轮冻结游戏源码和审计脚本。脚本采取完成楼层再突破策略，不吃修为丹。
- `batch.py` / `batch-status.json`：9个新档、3进程并行及退出状态；直接再次运行会因报告已存在而拒绝覆盖。
- `summarize.mjs`：完整性、预算、快照、禁用修为丹及源码漂移核对。
- `runtime-manifest.json` / `inputs.json`：源码哈希及输入存在性。

已运行自然成长及机器人测试14/14通过。9档全部到第9层；91次尝试含9次死亡、一次资金重刷，没有主动退场。此数据不能解释为真人通关率或所有构筑的平衡验收。
