# 技能节奏复核证据

- `baseline.json`：156组当前源码定点测试，当前全部18项技能与源码哈希。
- `probe.mjs`：基线复现脚本，从仓库根目录运行。
- `enemy-budget.json` / `enemy-budget.mjs`：当前九层怪物血量、一次通关经验里程碑。
- `proposal.json` / `proposal.mjs`：设计提案的各级伤害/CD换算及清杂血线，**不是修改后的运行时测试结果**。
- 设计与结论：`docs/superpowers/specs/2026-10-31-skill-cadence-design.md`。

本轮无游戏代码修改。基线是无心法、单个静止目标；不代表移动Boss、合法配点或通关成绩。方案保留阵法吃满的秒伤，以延长驻留时间作为实际兑现伤害的代价。
