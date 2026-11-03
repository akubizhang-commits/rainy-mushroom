# Balance Check: 十层境界与大圆满

## Data Sources Analyzed

| 输入 | 状态 | 用途 |
|---|---|---|
| js/xianxia/TowerProfile.js、TowerGrowth.js、TowerCampaign.js、TowerRun.js、TowerInventory.js、TowerEquipmentTiers.js | FOUND | 境界、经验、属性、技能点、保存和门槛 |
| docs/xianxia/sect-tower-v1/data/economy-v2.json、tower-design.json | FOUND | 经验供给与公开数据 |
| docs/xianxia/sect-tower-v1/52-growth-combat-rebalance-v2.md、54-growth-feedback-implementation.md、70-zhuji-pill.md、71-ten-layer-realms.md | FOUND | 历史目标及最新用户覆盖 |
| tests/xianxia-ten-layer-realms.test.mjs、xianxia-zhuji-pill.test.mjs、xianxia-tower-host-tools.test.mjs | FOUND | 边界、事务、UI证据 |
| design/registry/entities.yaml、design/gdd、assets/data | ABSENT | 本项目使用上述docs与纯JS数据，不伪造注册表 |
| .claude/docs/automation-modes.md、/Users/zhangnu/.codex/hooks/yaml-helper.sh | ABSENT | 无可运行自动化配置；按用户明确授权实施 |
| 改动后完整九层真人通关数据 | ABSENT | 实战难度 NOT ASSESSED — NO DATA |

## Health Summary: CONCERNS

边界和事务由测试验证；数值曲线已计算。完整通关难度、筑基后突破成本/概率、耗时没有数据，不作HEALTHY结论。用户明确将筑基后突破方式设为待定，当前普通进度停在筑基大圆满是预期范围，不把它隐瞒为已开放金丹流程。

## Outliers Detected

| Item/Value | Expected Range | Actual | Issue |
|---|---|---|---|
| 每境层数 | 用户要求10 | 10 | 已满足 |
| 满修为名称 | 只有十层满经验为大圆满 | 1800/6600/14400切换 | 已满足 |
| 技能点总预算 | 保留80 | 80 | 三个十层不额外发点，已满足 |
| 旧版首通九层满级目标 | 历史目标九层通关到上限 | 首通10920，新上限14400 | 历史节奏不再成立，未擅调掉落 |
| 满级攻击/生命 | 新版无明确目标范围 | 1455.824；比28级版+16.64% | no stated range — not judged |

## Degenerate Strategies Found

已检查击杀、培元丹、存读档和开发工具的经验入口：普通入口不会越过瓶颈，满修为不继续吃培元丹，失败存档不消耗；重放战斗结算不重复领奖。开发工具为有意的测试权限，不计作普通玩家策略。没有穷举配装/实战策略，因此不声称不存在支配策略。

## Progression Analysis

| 节点 | 十层起点 | 满修为 | 后续 |
|---|---:|---:|---|
| 炼气 | 1485 | 1800 | 筑基丹成功到1801 |
| 筑基 | 5985 | 6600 | 突破条件待定 |
| 金丹 | 13485 | 14400 | 当前版本封顶 |

30级经验阈值严格递增。普通属性升级×1.08，跨境界×1.35，无中间舍入；满修为只改称号，不再增加一次属性/点数。各阶段技能解锁跟随1/4/7、11/14/17、21/24/27级。

九层首通10920；65颗培元丹3250。忽略瓶颈丢失，仍至少缺230；这只是未来开放全部突破后的算术下界，不是可达性/耗时预测。筑基后突破规则待定，当前无法评估正常流程的最终到达时间。

数据：`ten-layer-realms-2026-10-31.json`；图：`ten-layer-realms-2026-10-31.svg`。复算：`node design/balance/ten-layer-realms-2026-10-31.mjs`。

## Recommendations

| Priority | Issue | Suggested Fix | Impact |
|---|---|---|---|
| P1 | 筑基后的突破条件待定 | 后续确定对应道具、成本和失败规则，再开放普通金丹进度 | 决定后半段节奏 |
| P2 | 原九层首通到顶目标失效 | 突破规则确定后联合调经验供给，记录瓶颈损失 | 避免用无依据的掉落补偿 |
| P2 | 上限属性增加16.64% | 后续九层实玩验证击杀/生存时间 | 决定是否需要改怪物 |

## Values That Need Attention

满级1455.824基础攻击/生命、新突破成功率/成本和通关耗时没有新版范围，未判断为合理。原筑基丹30%独立概率、60贡献售价保持不变。本轮不增加新的付费素材，不改变其他游戏存档。

## Verification

专项逻辑43/43、界面4/4通过；Cocos浏览器版构建及生成数据检查通过。完整测试1519项，1230通过、289失败，未宣称全绿；明细见 reports/ten-layer-realms-2026-10-31/failures.md。
