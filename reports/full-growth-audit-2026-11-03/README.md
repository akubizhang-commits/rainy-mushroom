# 全成长检查：2026-11-03

本目录保存本轮实际运行结果，历史报告未覆盖。生产数值未修改。

- `qi/array/mixed/lance/formation/pursuit-{101,211}.json`：真实 Campaign 新档成长，最多 24 场，通关后继续到 30 级成熟复战；记录交易、负担、突破、配装、技能伤害贡献、Boss 时间、存读档及重复结算验证。
- `ordinary-{good,intermittent}.json`：仅装备/锻造非极品的同种子剑气成长对照。间歇操作每 3 秒移动 1 秒，另外 2 秒停走。
- `controls.json`：六条同等级固定流派 × 下/中/上/极品 × 正常/间歇移动，种子 101。装备明确注入用于控制变量，不能视作自然获取。
- `stationary.json`：六流派下品/极品，全程不移动的极端压力样本。
- `quality-confirm.json`：剑气下品/上品的种子 211 复核，避免将单种子倒挂直接认定为固定规律。
- `audit.json`：87 件装备、三槽静态包络及防具跨阶检查。包络不包含技能等级词条；太衡按用户要求保留。
- `static.json`：等级/属性、技能、怪物、炼器配方和抽取概率输入。
- `cost-model.json`：每阶每槽 2000 次零库存材料/贡献模型，不消耗真实存档；不是自然成长或真人获取时长。与实测清关时间相乘时必须注明估算。
- `safe-recovery-checkpoint.json`：澄霄法袍增强回复后的合法快照被 Campaign 拒绝，6.1 秒真实战斗推进复现；原始失败已保留；`safe-recovery-checkpoint-after.json` 为修复后的成功结果。
- `tests.log`：本轮专项测试 69 通过、3 失败。两个旧持续伤害字段断言，一个源配置文本一致性断言。`tests-after.log` 为修复及同步后 101/101 通过的最终结果。
- `source-drift.json`：11 处源表/生成内容差异，均为文本，无数值差异。

新确认目标：随机一件当前境界极品的通常刷取时间为 1–2 小时。指定身份不混入此目标。真人通关率、允许的流派时差与正式人民币价格没有输入，不作合格结论。

运行器会持续写入 JSON。自然成长仅 `completed: true` 的文件算完成；控制对照也需 `completed: true`。独立进程重复排到同一路线时，脚本的禁止覆盖保护会拒绝重复启动；应以对应 JSON 的完成字段与源稳定性为准。

最终报告：`design/balance/balance-check-full-growth-2026-11-03.md`。Cocos 构建成功；`numeric-stability.json` 验证战斗数值保持不变。
