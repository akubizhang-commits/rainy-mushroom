# 第8层两仪失败诊断

报告：`../../design/balance/balance-check-floor8-liangyi-failure-2026-10-31.md`。

数据依赖为相邻 `late-boss-builds-2026-10-31/` 中的冻结运行时、机器人和 `sixiang.json` 夹具，不能删除该目录。

- `replay.mjs`、`steering.mjs`：原策略逐帧记录评分、位置、危险区和攻击；`TowerRun.instrumented.mjs` 仅额外输出最终伤害来源，所有计算保持原样。
- `trace-101.json`：精确复现失败，受伤前最多95帧上下文。
- `probes.mjs`、`probes.json`：37个正式可恢复快照，原策略与24方向短分支；避劫进入门后停止。局部分支不作为独立整场胜率样本。
- `circle-gradient.mjs`、`counterfactual.mjs`、`counterfactual.json`：仅第20波圆形预警连续距离评分对照，三种子整层重跑。实验策略不是正式工具修改。
- `verify.py`、`validation.json`：原14次伤害逐项一致、来源插桩差异、三场前19波受击一致、快照可恢复、7次Boss伤害可避免分支以及源码哈希。

从仓库根目录重跑：

```sh
node reports/floor8-liangyi-failure-2026-10-31/replay.mjs 101
node reports/floor8-liangyi-failure-2026-10-31/probes.mjs
node reports/floor8-liangyi-failure-2026-10-31/counterfactual.mjs
python3 reports/floor8-liangyi-failure-2026-10-31/verify.py
```
