# 首层与第三层节奏调整

> 2026-11-01 后续规则：用户批准的[79号品阶/身份方案](79-monster-rank-role-and-equipment.md)已接入。普通精英采用同阶普通2.5倍生命/1.15倍普攻，旧统一20–40秒及早期精英折扣不再执行。下文保留当时设计与验证记录。


后续补充：修为丹从首层通关后开放，见 [74-opening-cultivation-pills.md](74-opening-cultivation-pills.md)。本文件的怪物生命预算不变。

2026-10-31。用户在自然成长审计后选择“优先调整首层和第3层节奏”。本轮只缩减对应怪物的生命预算，不改技能、伤害、速度、怪物机制、波次、经验或奖励。

## 数值

| 项目 | 调整前 | 调整后 |
|---|---:|---:|
| 首层精英基础生命 | 5500 | 3500 |
| 首层Boss基础生命 | 24200 | 16000 |
| 第3层Boss基础生命 | 100580 | 72000 |

家族生命系数继续生效。首层妖猪Boss实际生命从约27830变为18400。

首只精英保持实际生命1391.5：首层前5波精英倍率从0.22调整为`1210 / 3500`，即0.3457142857142857。这只补偿基础生命下调，不加强或削弱已验收的开场精英。此条覆盖66号文档中的旧倍率。

三张权威数据表同步修改：`data/tower-design.json`、`data/floor01-encounters.json`、`data/floor01-boss.json`。运行时`TowerContent.js`由生成脚本导出，再同步至Cocos共享模块。

## 实测

从真实新档开始，正常获得技能点、装备和药物；三条路线分别使用剑气101、剑阵101、混搭211。每条完整跑前三层，60Hz移动机器人，不注入血量、伤害、经验或装备。每次结算检查存档合法性、重载一致性与重复领奖拒绝。前后运行源码均稳定。

| 指标 | 调整前 | 调整后 | 参照 |
|---|---:|---:|---|
| 首只精英 | 约35秒 | 约35秒 | 20–40秒 |
| 首层后四只精英 | 44–59秒 | 28–39秒 | 20–40秒 |
| 首层Boss | 174–195秒 | 121–133秒 | 约120秒，建议100–140秒 |
| 第3层Boss | 156–177秒 | 108–130秒 | 同上 |
| 首层整层 | 844–849秒 | 711–723秒 | 未规定整层目标 |

第2层三条路线前后耗时相同。两组目标层的21项遭遇计时检查，调整前18项不满足，调整后全部满足。

以上是这三种自然构筑与移动策略的证据，不是人类通关率或所有配置保证。没有通过扩大目标容差取得通过，也不把此结果推广成后期全局平衡。

## 回归方式

先为三个配置分别生成新路径的报告：

```sh
node scripts/verify-tower-natural-balance.mjs --route=qi --seed=101 --attempts=3 --output=reports/opening-rerun-qi.json
node scripts/verify-tower-natural-balance.mjs --route=array --seed=101 --attempts=3 --output=reports/opening-rerun-array.json
node scripts/verify-tower-natural-balance.mjs --route=mixed --seed=211 --attempts=3 --output=reports/opening-rerun-mixed.json
node scripts/check-tower-opening-balance.mjs reports/opening-rerun-qi.json reports/opening-rerun-array.json reports/opening-rerun-mixed.json
```

报告不能覆盖历史文件。数据、原始源码快照、测试及构建记录见`reports/opening-pacing-2026-10-31/`。
