# 圆形预警走位修正回归

- `snapshot/`：本轮冻结的正式测试工具及游戏运行时。正式变更只在机器人；游戏运行时与上轮相比只有TowerLibrary百科差异。
- `run.mjs`：复用上一轮五流派的合法固定配装，第7–9层、三个相同种子，共45场完整楼层；随后首层一套去重配装、第3层三流派各跑新旧机器人对照，共8场。
- `results.json`：完整逐场结果，包含所有失败，不把失败的存活时间计为击杀时间。必须检查 `completed` 和 `sourceStable`。
- `run.log`：逐场进度。
- `tests.log` / `natural-harness-tests.log`：11项机器人检查与1项自然成长工具兼容检查。后者仅测试工具，不是完整自然成长通关。
- `red-green.json`：同一重砸模型下，旧策略未退出实际伤害区，新策略成功；第1波与第20波均检查。正式回归测试位于 `tests/xianxia-monster-balance-harness.test.mjs`。
- `inputs.json`：必需输入存在性与前轮运行时差异。
- `summarize.py` / `summary.json`：样本数、完成标志、源码稳定性、新旧胜负和成功击杀中位数。

运行：从仓库根目录执行 `node reports/bot-circle-regression-2026-10-31/run.mjs`，完成后执行 `python3 reports/bot-circle-regression-2026-10-31/summarize.py`。运行脚本会覆盖本目录结果文件，需保留历史时复制目录或修改输出路径。

限制：这是固定配装机器人测试，不是真人胜率，也不是完整自然成长复跑；装备获取合法性与费用限制沿用上一轮说明。安全门和环形预警策略不在本次改动范围。
