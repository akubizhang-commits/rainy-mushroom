# 御剑与长虹：隔离调整方案试验

正式运行时代码未改动。`baseline` 是启动时的当前源码；`y13` / `y15` 仅修改御剑第4–10级复利成长；`line` 仅修改普通长虹伤害分段；`combined` 合并 y13 和 line。

复现（仓库根目录）：

```sh
python3 reports/skill-tuning-proposal-2026-11-03/setup.py
python3 reports/skill-tuning-proposal-2026-11-03/run.py
python3 reports/skill-tuning-proposal-2026-11-03/run-combined.py
python3 reports/skill-tuning-proposal-2026-11-03/run-linefast.py
node reports/skill-tuning-proposal-2026-11-03/verify.mjs
python3 reports/skill-tuning-proposal-2026-11-03/summarize.py
```

`setup.py` 会把当前 js 和固定关卡脚本复制到 `/tmp/skill-tuning-proposal-20261103/{variant}`，只在该隔离目录应用候选。复现前必须核对当前源码与 `verification.json` 的 baseline 哈希；源码变化后属于新试验，不能与本次数据混称。候选补丁同时保存在四个 `.patch` 中。

`experiment.mjs` 由前轮 review 测试扩展。等级30、无装备技能靶场测试与固定装备第九层战斗分开记录。`yujian-only-39` 为历史简写，实际含御剑10＋神识3＋剑气7，不是只有御剑；`yujian-evolved-39` 为御剑10＋神识3＋剑气3＋万剑归宗2；均加相同19点辅助被动。

真实关卡测试使用当前正式怪物、移动机器人、1120×630横屏视域、60Hz、1200秒上限。测试不代表自然养成、真人操作或全局最优加点。三固定种子101/419/733用于配对比较，不是置信区间。

规则测试：把 `tests/xianxia-skill-inheritance.test.mjs` 与 `tests/xianxia-stone-skill-costs.test.mjs` 复制至隔离版本的 tests 目录，分别运行 `node --test`。现版与 combined 各23项通过，日志已保存。本次未运行全量测试或Cocos构建，因为尚未接入正式代码。

`verification.json` 检查正式源码未变、候选修改文件白名单、御剑前三级与生成CD／单剑占比不变、长虹1–11级各段占比总和为1且调整后首段不倒退。它只检查系数与分配，不代替靶场和关卡实测。

补测 `linefast`：普通长虹追加段间隔从0.16秒改为0.08秒，同时修改 `TowerSkillTiming.js`（实际结算）与 `TowerSkillForms.js`（形态描述）；天地一剑时序不变。`form-only-control/` 保留了只改形态描述、实际结算未变的无效对照，不计入有效候选结果。
